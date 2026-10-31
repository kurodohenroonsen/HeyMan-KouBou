/*
 * IA locale de Chrome (Gemini Nano) : état des API, téléchargement accompagné, fournisseur pour core/ai-tasks.js.
 * Rien n'est envoyé à un serveur. Pour les tests, window.__atelierAI peut remplacer le fournisseur.
 *
 * Journal (domaine ai.*) : chaque appel aux API de Chrome (availability, create, prompt, summarize, rewrite,
 * proofread, translate) est mesuré ; chaque tâche (reformuler, corriger, description, titre, mots-clés,
 * texte alternatif, texte de lien) est un parcours : API choisie ou repli, appels, réponses, sorties coupées ou rejetées.
 */
import { createAI, parseJson, cleanOut, cleanAlt, clampAtWord, NANO_LANGS } from '../core/ai-tasks.js';
import { getTranslator, translatorStates } from './translator.js';
import { log, registerContext } from './log.js';
import { __, __n } from '../core/ui-i18n.js';
import { assets } from './assets.js';

export const AI_APIS = {
  prompt: { label: 'Prompt API (Gemini Nano)', global: 'LanguageModel', stable: true, use: __('Reformuler, corriger, titres et descriptions, mots-clés') },
  multimodal: { label: __('Prompt API – images'), global: 'LanguageModel', stable: true, use: __('Textes alternatifs des images') },
  summarizer: { label: 'Summarizer', global: 'Summarizer', stable: true, use: __('Descriptions pour Google (résumés)') },
  rewriter: { label: 'Rewriter', global: 'Rewriter', flag: 'chrome://flags/#rewriter-api', use: __('Reformuler (plus court, plus formel…)') },
  writer: { label: 'Writer', global: 'Writer', flag: 'chrome://flags/#writer-api', use: __('Rédaction (cycles suivants)') },
  proofreader: { label: 'Proofreader', global: 'Proofreader', flag: 'chrome://flags/#proofreader-api', use: __('Corriger les fautes') },
  translator: { label: 'Translator', global: 'Translator', stable: true, use: __('Néerlandais (rédigé en français puis traduit)') },
  detector: { label: 'Language Detector', global: 'LanguageDetector', stable: true, use: __('Reconnaître la langue d’un texte') }
};

const fake = () => (typeof window !== 'undefined' && window.__atelierAI) || null;
const TIMEOUT = Symbol('timeout');
const withTimeout = (p, ms = 4000) => Promise.race([p, new Promise(r => setTimeout(() => r(TIMEOUT), ms))]);
const io = (lang, image = false) => ({ expectedInputs: [...(image ? [{ type: 'image' }] : []), { type: 'text', languages: [lang] }], expectedOutputs: [{ type: 'text', languages: [lang] }] });
const msSince = t0 => Math.round(performance.now() - t0);
const excerpt = (s, n = 60) => { const v = String(s ?? '').replace(/\s+/g, ' ').trim(); return v.length > n ? `${v.slice(0, n - 1)}…` : v; };
const labelOf = api => AI_APIS[api]?.label || api;

/* Explication courte d'une erreur des API de Chrome (nom DOMException) */
export function aiHint(e) {
  const n = e?.name || '';
  const m = String(e?.message || '');
  if (/eligible|insufficient|hardware|disk space|not enough|VRAM|GPU/i.test(m)) return 'Matériel insuffisant ou espace disque trop faible pour Gemini Nano (22 Go libres, plus de 4 Go de mémoire graphique ou 16 Go de mémoire vive) : regarde chrome://on-device-internals.';
  if (n === 'NotAllowedError') return /gesture|activation/i.test(m) ? 'Chrome exige un clic de la personne pour télécharger le modèle (geste requis) : utilise le bouton « Télécharger » de ✨ IA locale.' : 'API bloquée : geste requis, cadre sans autorisation (Permissions-Policy) ou désactivée par une règle d’entreprise.';
  if (n === 'NotSupportedError') return 'Langue ou option non prise en charge par ce modèle (Gemini Nano : fr, de, en, es, ja).';
  if (n === 'QuotaExceededError') return 'Texte trop long pour le modèle (quota d’entrée dépassé) : raccourcis la sélection.';
  if (n === 'InvalidStateError') return 'Session fermée ou modèle déchargé : réessaie.';
  if (n === 'AbortError') return 'Opération interrompue (onglet caché, modèle déchargé ou arrêt).';
  if (n === 'NetworkError') return 'Téléchargement du modèle interrompu : vérifie la connexion (illimitée conseillée) et l’espace disque (22 Go).';
  if (n === 'OperationError' || n === 'UnknownError') return 'Le modèle a échoué (mémoire, carte graphique) : regarde chrome://on-device-internals.';
  return undefined;
}

/* ---------- État des API ---------- */
let lastStatus = null;
let lastStatusAt = 0;
let lastSource = 'chrome';
let lastLang = null;
let paramsShown = false;
/* Dernier résultat par API et langue : un état inchangé passe en trace (chaque tâche revérifie l'état) */
const seen = new Map();
const lv = (kind, lang, v, level = 'debug') => { const k = `${kind}|${lang}`; const same = seen.get(k) === v; seen.set(k, v); return same ? 'trace' : level; };

async function avail(kind, lang = 'fr') {
  const f = fake();
  if (f) {
    const st = f.status?.[kind] || (f.has?.[kind] ? 'available' : 'absent');
    log.add(lv(kind, lang, `test:${st}`), 'ai.availability', __('{api} : {state} (fournisseur de test)', { api: labelOf(kind), state: st }), { api: kind, lang, state: st, source: 'test' });
    return st;
  }
  const api = AI_APIS[kind];
  const G = self[api.global];
  if (!G?.availability) {
    log.add(lv(kind, lang, 'absent'), 'ai.availability', __('{api} : absent de ce navigateur (pas de {global})', { api: labelOf(kind), global: api.global }), { api: kind, lang, state: 'absent', global: api.global, flag: api.flag });
    return 'absent';
  }
  let opts;
  switch (kind) {
    case 'prompt': opts = io(lang); break;
    case 'multimodal': opts = io(lang, true); break;
    case 'summarizer': opts = { type: 'tldr', format: 'plain-text', expectedInputLanguages: [lang], outputLanguage: lang }; break;
    case 'rewriter': case 'writer': opts = { expectedInputLanguages: [lang], outputLanguage: lang }; break;
    case 'proofreader': opts = { expectedInputLanguages: [lang] }; break;
    case 'translator': opts = { sourceLanguage: 'fr', targetLanguage: 'nl' }; break;
    default: opts = undefined;
  }
  const t0 = performance.now();
  try {
    const r = await withTimeout(kind === 'detector' ? G.availability() : G.availability(opts));
    if (r === TIMEOUT) {
      log.add(lv(kind, lang, 'timeout', 'warn'), 'ai.availability-timeout', __('{api} : Chrome ne répond pas après 4 s (modèle bloqué ou en cours d’installation) — considéré indisponible', { api: labelOf(kind) }), { api: kind, lang, ms: msSince(t0), options: opts });
      return 'unavailable';
    }
    log.add(lv(kind, lang, r), 'ai.availability', `${labelOf(kind)} : ${r} (${msSince(t0)} ms)`, { api: kind, lang, state: r, ms: msSince(t0), options: opts });
    return r;
  } catch (e) {
    log.add(lv(kind, lang, `fail:${e?.name}`, 'warn'), 'ai.availability-fail', __('{api} : availability() a échoué ({name}) — considéré indisponible', { api: labelOf(kind), name: e?.name || 'Error' }), { api: kind, lang, ms: msSince(t0), options: opts, error: e, hint: aiHint(e) });
    return 'unavailable';
  }
}

/* quiet : vérification faite avant chaque tâche (ligne ai.status en debug au lieu de info) */
export async function aiStatus(lang = 'fr', { quiet = false } = {}) {
  const out = {};
  const t0 = performance.now();
  await Promise.all(Object.keys(AI_APIS).map(async k => { out[k] = await avail(k, lang); }));
  lastStatus = out;
  lastStatusAt = Date.now();
  lastSource = fake() ? 'test' : 'chrome';
  lastLang = lang;
  const ready = Object.keys(out).filter(k => out[k] === 'available');
  log.add(quiet ? 'debug' : 'info', 'ai.status', ready.length ? __('IA locale : prêt → {apis} ({ms} ms)', { apis: ready.join(', '), ms: msSince(t0) }) : __('IA locale : aucune API prête ({ms} ms)', { ms: msSince(t0) }), { lang, ms: msSince(t0), source: fake() ? 'test' : 'chrome', ...out });
  if (!fake() && !paramsShown && typeof self.LanguageModel?.params === 'function') {
    paramsShown = true;
    try {
      const p = await withTimeout(self.LanguageModel.params(), 2000);
      if (p !== TIMEOUT) log.debug('ai.params', __('Réglages par défaut de la Prompt API'), { topK: p?.defaultTopK, maxTopK: p?.maxTopK, temperature: p?.defaultTemperature, maxTemperature: p?.maxTemperature });
    } catch (e) { log.debug('ai.params', __('Réglages de la Prompt API illisibles'), { error: e }); }
  }
  return out;
}

const usable = s => s === 'available' || s === 'downloadable' || s === 'downloading';
let progressHandler = null;
export function onDownloadProgress(fn) { progressHandler = fn; }
const monitor = label => m => {
  let shown = -1;
  m.addEventListener('downloadprogress', e => {
    const pct = Math.round((e.loaded || 0) * 100);
    if (pct >= 100 || pct - shown >= 10) { shown = pct; log.debug('ai.progress', __('Téléchargement {api} : {pct} %', { api: labelOf(label), pct }), { api: label, pct }); }
    progressHandler?.(label, e.loaded);
  });
};

/* Réglages d'une création de session, sans les textes */
function describeOpts(o = {}) {
  const langs = l => (Array.isArray(l) ? l.map(x => (typeof x === 'string' ? x : `${x.type}:${(x.languages || []).join('+')}`)).join(', ') : undefined);
  return {
    inputs: langs(o.expectedInputs) || langs(o.expectedInputLanguages),
    outputs: langs(o.expectedOutputs) || o.outputLanguage,
    from: o.sourceLanguage, to: o.targetLanguage,
    type: o.type, length: o.length, tone: o.tone, format: o.format,
    system: o.initialPrompts ? `${o.initialPrompts.length} message(s), ${o.initialPrompts.reduce((n, p) => n + String(p.content || '').length, 0)} car.` : undefined,
    sharedContext: o.sharedContext ? `${o.sharedContext.length} car.` : undefined
  };
}

/* LanguageModel.create, Summarizer.create… : mesuré, avec la cause probable en cas d'échec */
async function createSession(api, G, opts) {
  const t0 = performance.now();
  try {
    const s = await G.create(opts);
    log.debug('ai.session.create', __('Session {api} créée ({ms} ms)', { api: labelOf(api), ms: msSince(t0) }), { api, ms: msSince(t0), ...describeOpts(opts), inputQuota: s?.inputQuota });
    return s;
  } catch (e) {
    log.warn('ai.session.fail', __('Session {api} impossible : {name} — {message}', { api: labelOf(api), name: e?.name || 'Error', message: e?.message || e }), { api, ms: msSince(t0), ...describeOpts(opts), error: e, hint: aiHint(e) });
    throw e;
  }
}

/* Téléchargement d'un modèle (après un clic de la personne) */
export async function downloadModel(kind, lang = 'fr') {
  const f = log.flow('ai.download', __('Téléchargement du modèle {api}', { api: labelOf(kind) }), { api: kind, lang, source: fake() ? 'test' : 'chrome' });
  try {
    const fk = fake();
    if (fk) { if (typeof fk.download === 'function') await fk.download(kind, p => progressHandler?.(kind, p)); if (fk.status) fk.status[kind] = 'available'; progressHandler?.(kind, 1); f.ok(__('{api} prêt (fournisseur de test)', { api: labelOf(kind) })); return true; }
    const opts = { monitor: monitor(kind) };
    let s;
    switch (kind) {
      case 'prompt': s = await createSession(kind, LanguageModel, { ...io(lang), ...opts }); break;
      case 'multimodal': s = await createSession(kind, LanguageModel, { ...io(lang, true), ...opts }); break;
      case 'summarizer': s = await createSession(kind, Summarizer, { type: 'tldr', format: 'plain-text', expectedInputLanguages: [lang], outputLanguage: lang, ...opts }); break;
      case 'rewriter': s = await createSession(kind, Rewriter, { expectedInputLanguages: [lang], outputLanguage: lang, ...opts }); break;
      case 'writer': s = await createSession(kind, Writer, { expectedInputLanguages: [lang], outputLanguage: lang, ...opts }); break;
      case 'proofreader': s = await createSession(kind, Proofreader, { expectedInputLanguages: [lang], ...opts }); break;
      case 'translator': await getTranslator('fr', 'nl', p => progressHandler?.(kind, p)); break;
      case 'detector': s = await createSession(kind, LanguageDetector, opts); break;
      default:
    }
    s?.destroy?.();
    f.ok(__('{api} prêt', { api: labelOf(kind) }));
    return true;
  } catch (e) {
    logged.add(e);
    f.fail(e, { api: kind, hint: aiHint(e) }, __('Téléchargement {api} impossible : {name} — {message}', { api: labelOf(kind), name: e?.name || 'Error', message: e?.message || e }));
    throw e;
  }
}

const cache = new Map();
async function cached(key, make) {
  if (cache.has(key)) { log.trace('ai.session.reuse', __('Session réutilisée'), { key: key.split('|')[0] }); return cache.get(key); }
  cache.set(key, make().catch(e => { cache.delete(key); throw e; }));
  return cache.get(key);
}

/* Fournisseur pour core/ai-tasks.js */
export async function chromeProvider(lang = 'fr') {
  const f = fake();
  if (f) {
    log.debug('ai.provider', __('Fournisseur d’IA de test (window.__atelierAI)'), { source: 'test', lang, has: f.has || {}, methods: ['prompt', 'summarize', 'rewrite', 'proofread', 'translate'].filter(m => typeof f[m] === 'function') });
    return f;
  }
  const st = await aiStatus(lang, { quiet: true });
  const has = { prompt: usable(st.prompt), multimodal: usable(st.multimodal), summarizer: usable(st.summarizer), rewriter: usable(st.rewriter), writer: usable(st.writer), proofreader: usable(st.proofreader), translator: usable(st.translator) };
  log.debug('ai.provider', __('Fournisseur d’IA : API de Chrome'), { source: 'chrome', lang, has });
  return {
    has,
    async prompt({ system, user, schema, lang: l, images }) {
      const s = await createSession('prompt', LanguageModel, { ...io(l, !!images?.length), initialPrompts: [{ role: 'system', content: system }], monitor: monitor('prompt') });
      try {
        const input = images?.length ? [{ role: 'user', content: [{ type: 'text', value: user }, ...images.map(value => ({ type: 'image', value }))] }] : user;
        const out = await s.prompt(input, schema ? { responseConstraint: schema } : {});
        if (s.inputQuota !== undefined) log.debug('ai.session.usage', __('Prompt API : {used} / {quota} jetons d’entrée utilisés', { used: s.inputUsage ?? '?', quota: s.inputQuota }), { inputUsage: s.inputUsage, inputQuota: s.inputQuota });
        return out;
      } finally { s.destroy?.(); }
    },
    async summarize({ text, type, length, context, lang: l }) {
      const s = await cached(`sum|${type}|${length}|${l}|${context}`, () => createSession('summarizer', Summarizer, { type, length, format: 'plain-text', sharedContext: context, expectedInputLanguages: [l], outputLanguage: l, monitor: monitor('summarizer') }));
      return s.summarize(text);
    },
    async rewrite({ text, tone, length, context, lang: l }) {
      const r = await cached(`rw|${tone}|${length}|${l}`, () => createSession('rewriter', Rewriter, { tone, length, format: 'plain-text', expectedInputLanguages: [l], outputLanguage: l, monitor: monitor('rewriter') }));
      return r.rewrite(text, context ? { context } : {});
    },
    async proofread({ text, lang: l }) {
      const p = await cached(`pr|${l}`, () => createSession('proofreader', Proofreader, { expectedInputLanguages: [l], monitor: monitor('proofreader') }));
      return p.proofread(text);
    },
    async translate({ text, from, to }) {
      const t = await getTranslator(from, to, p => progressHandler?.('translator', p));
      return t(text);
    }
  };
}

/* ---------- Journal des tâches : fournisseur enveloppé ---------- */
const logged = new WeakSet();
/* Erreur déjà journalisée par un parcours (withAI n'en remet pas une couche) */
export const wasLogged = e => !!e && typeof e === 'object' && logged.has(e);

const TASK_LABEL = { rewrite: __('Reformuler'), proofread: __('Corriger'), seoDescription: __('Description pour Google'), seoTitle: __('Titre pour Google'), keywords: __('Mots-clés'), altText: __('Texte alternatif'), linkText: __('Texte de lien'), extractItems: __('Lecture d’une affiche ou d’un texte'), excerpt: __('Chapô'), headlines: __('Titres'), reviewSummary: __('Résumé de la relecture'), plan: __('Demande à Atelier') };
const TASK_MAX = { seoDescription: 160, seoTitle: 60, altText: 125, linkText: 60, excerpt: 220 };
const DEDICATED = { rewrite: 'rewriter', proofread: 'proofreader', seoDescription: 'summarizer', excerpt: 'summarizer', reviewSummary: 'summarizer' };
const NOFLOW = { step() {}, warn() {}, info() {}, ok() {}, fail() {}, cancel() {} };

/* Un parcours par tâche (codes littéraux pour le catalogue du guide) */
function taskFlow(name, d) {
  switch (name) {
    case 'rewrite': { const tf = log.flow('ai.rewrite', __('IA locale : reformuler'), d); return tf; }
    case 'proofread': { const tf = log.flow('ai.proofread', __('IA locale : corriger les fautes'), d); return tf; }
    case 'seoDescription': { const tf = log.flow('ai.description', __('IA locale : description pour Google'), d); return tf; }
    case 'seoTitle': { const tf = log.flow('ai.title', __('IA locale : titre pour Google'), d); return tf; }
    case 'keywords': { const tf = log.flow('ai.keywords', __('IA locale : idées de mots-clés'), d); return tf; }
    case 'altText': { const tf = log.flow('ai.alt', __('IA locale : texte alternatif d’une image'), d); return tf; }
    case 'linkText': { const tf = log.flow('ai.link', __('IA locale : texte de lien'), d); return tf; }
    case 'extractItems': { const tf = log.flow('ai.extract', d.image ? __('IA locale : lecture d’une affiche') : __('IA locale : lecture d’un texte collé'), d); return tf; }
    case 'excerpt': { const tf = log.flow('ai.excerpt', __('IA locale : chapô'), d); return tf; }
    case 'headlines': { const tf = log.flow('ai.headlines', __('IA locale : titres'), d); return tf; }
    case 'reviewSummary': { const tf = log.flow('ai.review-summary', __('IA locale : résumé de la relecture'), d); return tf; }
    case 'plan': { const tf = log.flow('ai.plan', __('IA locale : préparer une demande (actions de la liste fermée)'), d); return tf; }
    default: return NOFLOW;
  }
}

function wrapProvider(raw, ctx) {
  const p = { has: { ...(raw.has || {}) } };
  const call = async (api, fn, req, settings, inLen) => {
    const tf = ctx.flow || NOFLOW;
    ctx.calls++;
    const t0 = performance.now();
    tf.step('call', settings.lang ? __('Appel {api} ({lang})', { api: labelOf(api), lang: settings.lang }) : __('Appel {api}', { api: labelOf(api) }), { api, ...settings, inLen });
    let out;
    try { out = await fn(req); }
    catch (e) {
      tf.warn('call-fail', __('{api} a échoué après {ms} ms : {name} — {message}', { api: labelOf(api), ms: msSince(t0), name: e?.name || 'Error', message: e?.message || e }), { api, ms: msSince(t0), error: e, hint: aiHint(e) });
      ctx.apiError = e;
      throw e;
    }
    const text = typeof out === 'string' ? out : (() => { try { return JSON.stringify(out); } catch { return String(out); } })();
    tf.step('reply', __('Réponse {api} : {n} car. en {ms} ms', { api: labelOf(api), n: text.length, ms: msSince(t0) }), { api, ms: msSince(t0), outLen: text.length, excerpt: excerpt(text) });
    return out;
  };
  if (typeof raw.prompt === 'function') {
    p.prompt = async req => {
      const tf = ctx.flow || NOFLOW;
      const keys = Object.keys(req.schema?.properties || {});
      const out = await call('prompt', r => raw.prompt(r), req, { lang: req.lang, schema: keys.join(',') || undefined, images: req.images?.length || undefined, system: `${String(req.system || '').length} car.` }, String(req.user || '').length);
      let parsed;
      try { parsed = parseJson(out); }
      catch (e) {
        tf.warn('unreadable', __('Réponse illisible : ce n’est pas le JSON demandé (schéma)'), { outLen: String(out ?? '').length, excerpt: excerpt(out, 80), schema: keys.join(','), error: e });
        ctx.reason = 'unreadable';
        throw e;
      }
      const missing = (req.schema?.required || []).filter(k => parsed?.[k] === undefined);
      if (missing.length) tf.warn('schema-mismatch', __('Réponse sans le champ attendu : {fields}', { fields: missing.join(', ') }), { missing, got: Object.keys(parsed || {}).slice(0, 8) });
      ctx.gen = parsed?.[keys[0]];
      return out;
    };
  }
  if (typeof raw.summarize === 'function') p.summarize = async req => { const out = await call('summarizer', r => raw.summarize(r), req, { lang: req.lang, type: req.type, length: req.length, context: `${String(req.context || '').length} car.` }, String(req.text || '').length); ctx.gen = out; return out; };
  if (typeof raw.rewrite === 'function') p.rewrite = async req => { const out = await call('rewriter', r => raw.rewrite(r), req, { lang: req.lang, tone: req.tone, length: req.length, context: req.context ? `${req.context.length} car.` : undefined }, String(req.text || '').length); ctx.gen = out; return out; };
  if (typeof raw.proofread === 'function') p.proofread = async req => call('proofreader', r => raw.proofread(r), req, { lang: req.lang }, String(req.text || '').length);
  if (typeof raw.translate === 'function') {
    p.translate = async req => {
      try { const out = await call('translator', r => raw.translate(r), req, { from: req.from, to: req.to }, String(req.text || '').length); ctx.trans = out; return out; }
      catch (e) { ctx.reason = 'translator'; throw e; }
    };
  }
  return p;
}

function inputInfo(name, args) {
  const [a0, a1] = args;
  if (name === 'rewrite' || name === 'proofread') return { inLen: String(a0 ?? '').length, excerpt: excerpt(a0), mode: a1?.mode, lang: a1?.lang };
  if (name === 'altText') return { image: a0?.image ? `${a0.image.type || 'image'} (${Math.round((a0.image.size || 0) / 1024)} Ko)` : 'aucune', context: String(a0?.context || '').length, lang: a0?.lang, sourceLang: a0?.sourceLang };
  if (name === 'linkText') return { excerpt: excerpt(a0?.text), target: excerpt(a0?.target), lang: a0?.lang };
  if (name === 'extractItems') return { collection: a0?.col?.id, kind: a0?.col?.kind, fields: a0?.col?.fields?.length, image: a0?.image ? `${a0.image.type || 'image'} (${Math.round((a0.image.size || 0) / 1024)} Ko)` : undefined, inLen: a0?.image ? undefined : String(a0?.text ?? '').length, max: a0?.max, today: a0?.today, lang: a0?.site?.defaultLanguage, sourceLang: NANO_LANGS.has(a0?.lang) ? a0?.lang : 'fr' };
  if (name === 'plan') return { request: excerpt(a0?.request), inLen: String(a0?.request ?? '').length, page: a0?.ctx?.pageId, selected: a0?.ctx?.selectedId || undefined, edit: a0?.ctx?.editTarget?.kind, lang: a0?.ctx?.lang || a0?.lang, sourceLang: 'fr' };
  if (name === 'reviewSummary') { const all = Object.values(a0?.site?.review?.comments || {}); return { comments: all.length, open: all.filter(c => !c.resolved).length, lang: a0?.lang, sourceLang: a0?.site?.defaultLanguage }; }
  return { title: excerpt(a0?.title), inLen: String(a0?.text ?? '').length, keyword: a0?.keyword ? excerpt(a0.keyword) : undefined, lang: a0?.lang, sourceLang: a0?.sourceLang };
}

async function runTask(name, fn, args, raw, ctx) {
  const info = inputInfo(name, args);
  const lang = info.lang;
  const fixedLang = ['rewrite', 'proofread', 'linkText'].includes(name);
  const gen = fixedLang ? lang : NANO_LANGS.has(lang) ? lang : NANO_LANGS.has(info.sourceLang) ? info.sourceLang : 'en';
  const has = raw.has || {};
  const dedicated = DEDICATED[name];
  const planned = dedicated && has[dedicated] && typeof raw[{ rewriter: 'rewrite', proofreader: 'proofread', summarizer: 'summarize' }[dedicated]] === 'function' ? dedicated : 'prompt';
  const tf = taskFlow(name, { task: name, ...info, gen, api: planned, translateTo: gen !== lang ? lang : undefined, source: fake() ? 'test' : 'chrome' });
  ctx.flow = tf; ctx.calls = 0; ctx.gen = undefined; ctx.trans = undefined; ctx.reason = undefined; ctx.apiError = undefined;
  const refused = fixedLang && !NANO_LANGS.has(lang);
  if (dedicated && planned === 'prompt' && has.prompt && !refused) tf.warn('fallback', __('{api} non disponible : repli sur la Prompt API (schéma JSON)', { api: labelOf(dedicated) }), { wanted: dedicated, has: false, state: fake() ? undefined : lastStatus?.[dedicated], flag: AI_APIS[dedicated]?.flag });
  if (gen !== lang) tf.step('via-translation', __('Gemini Nano ne parle pas {lang} : rédaction en {gen}, puis traduction sur l’appareil', { lang, gen }), { gen, to: lang, translator: !!has.translator }, 'info');
  try {
    const r = await fn(...args);
    const v = r?.value;
    if (typeof v === 'string' && ctx.gen !== undefined && typeof ctx.gen === 'string') {
      const max = TASK_MAX[name];
      const base = cleanOut(ctx.gen, 8000);
      const fitted = name === 'altText' ? cleanAlt(ctx.gen) : max ? clampAtWord(cleanOut(ctx.gen, 600), max) : base;
      if (max && fitted.endsWith('…') && !base.endsWith('…')) tf.warn('clamped', __('Proposition coupée à {max} caractères (le modèle en a écrit {n})', { max, n: base.length }), { max, from: base.length, to: fitted.length });
      else if (!r.translated && v !== String(ctx.gen).trim()) tf.step('cleaned', __('Proposition nettoyée (guillemets, balises, préfixe « Image de »…)'), { before: excerpt(ctx.gen), after: excerpt(v) });
    }
    if (name === 'keywords' && Array.isArray(ctx.gen) && Array.isArray(v) && v.length < ctx.gen.length) tf.step('cleaned', __('Mots-clés : {got} proposés, {kept} gardés (doublons, 5 au plus)', { got: ctx.gen.length, kept: v.length }), { got: ctx.gen.length, kept: v.length });
    if (r?.warning) tf.warn('warning', r.warning, { outLen: typeof v === 'string' ? v.length : undefined });
    if (name === 'extractItems' && Array.isArray(v)) {
      for (const [i, x] of v.entries()) for (const d of x.dropped || []) tf.warn('dropped', __('Élément {n} : « {field} » écarté — {reason}', { n: i + 1, field: d.label, reason: d.reason }), { item: i + 1, field: d.key, raw: excerpt(String(d.raw ?? '')), reason: d.reason });
      if (r.duplicates?.length) tf.step('duplicates', __n(r.duplicates.length, '{n} doublon d’un élément existant ou d’une autre proposition', '{n} doublons d’un élément existant ou d’une autre proposition'), { items: r.duplicates.map(i => i + 1) }, 'info');
      if (r.truncated) tf.warn('truncated', __n(r.truncated, '{n} élément au-delà du maximum, non repris', '{n} éléments au-delà du maximum, non repris'), { truncated: r.truncated });
    }
    if (name === 'headlines' && Array.isArray(ctx.gen) && Array.isArray(v) && v.length < ctx.gen.length) tf.step('cleaned', __('Titres : {got} proposés, {kept} gardés (doublons, titre actuel, 3 au plus)', { got: ctx.gen.length, kept: v.length }), { got: ctx.gen.length, kept: v.length });
    if (name === 'plan' && v) {
      for (const x of v.rejected || []) tf.warn('rejected', __('Action refusée ({action}) : {reason}', { action: x.action, reason: x.reason }), { action: x.action });
      tf.step('actions', __n(v.steps?.length || 0, '{n} action valide : {list}', '{n} actions valides : {list}', { list: (v.steps || []).map(st => st.action).join(', ') || __('aucune') }), { steps: (v.steps || []).map(st => st.action), summary: excerpt(v.summary, 120) }, 'info');
    }
    const out = name === 'plan' ? { steps: v?.steps?.length ?? 0, rejected: v?.rejected?.length ?? 0, warnings: v?.warnings?.length ?? 0 }
      : name === 'extractItems' ? { items: v?.length ?? 0, found: (v || []).map(x => x.found.length), dropped: (v || []).reduce((t, x) => t + (x.dropped?.length || 0), 0), duplicates: r.duplicates?.length || 0, missingTitle: (v || []).filter(x => x.missingTitle).length || undefined }
      : name === 'headlines' ? { titles: v?.length ?? 0, sample: (v || []).slice(0, 3) }
      : name === 'reviewSummary' ? { points: v?.points?.length ?? 0, tasks: v?.tasks?.length ?? 0, aiTasks: (v?.tasks || []).filter(t => t.ai).length, open: v?.digest?.open }
      : name === 'proofread' ? { corrections: v?.corrections?.length ?? 0, outLen: v?.corrected?.length } : name === 'keywords' ? { keywords: v?.length ?? 0, sample: (v || []).slice(0, 3) } : { outLen: typeof v === 'string' ? v.length : undefined, excerpt: excerpt(v) };
    tf.ok(r?.translated ? __('{task} : proposition prête ({via}, traduite en {lang})', { task: TASK_LABEL[name], via: r?.via === 'prompt' ? 'Prompt API' : labelOf(r?.via), lang }) : __('{task} : proposition prête ({via})', { task: TASK_LABEL[name], via: r?.via === 'prompt' ? 'Prompt API' : labelOf(r?.via) }), { via: r?.via, fallback: !!dedicated && r?.via === 'prompt', translated: !!r?.translated, decorative: r?.decorative || undefined, calls: ctx.calls, ...out });
    return r;
  } catch (e) {
    logged.add(e);
    const msg = String(e?.message || e);
    if (!ctx.calls) {
      /* Cause lue dans e.aiReason (posée par core/ai-tasks.js), pas dans le texte : il dépend de la langue de l'interface */
      const why = e?.aiReason;
      if (why === 'absent' || why === 'no-vision') tf.warn('absent', __('IA absente : {message}', { message: msg }), { has, need: why === 'no-vision' ? 'multimodal' : 'prompt' });
      else if (why === 'refused-lang') tf.warn('refused-lang', __('Refusé en {lang} : {message}', { lang, message: msg }), { lang, langs: [...NANO_LANGS] });
      else tf.warn('refused', __('Tâche refusée : {message}', { message: msg }), { reason: msg });
      tf.cancel(__('Tâche non lancée (aucun appel au modèle)'), { task: name });
      throw e;
    }
    const reason = ctx.reason || (ctx.apiError ? 'api' : e?.aiReason === 'no-translator' ? 'no-translator' : e?.aiReason === 'empty' ? 'empty' : 'other');
    if (reason === 'empty') tf.warn('rejected', __('Proposition rejetée : vide après nettoyage'), { got: excerpt(ctx.gen) });
    if (reason === 'no-translator') tf.warn('no-translator', __('Pas de traducteur {from} → {to} sur cet appareil', { from: gen, to: lang }), { from: gen, to: lang });
    tf.fail(e, { task: name, reason, calls: ctx.calls, hint: aiHint(e) });
    throw e;
  }
}

/* Tâches d'IA journalisées : même interface que createAI() */
export function loggedAI(provider) {
  const ctx = { flow: null, calls: 0 };
  const tasks = createAI(wrapProvider(provider || { has: {} }, ctx));
  const out = {};
  for (const name of Object.keys(tasks)) out[name] = (...args) => runTask(name, tasks[name], args, provider || { has: {} }, ctx);
  return out;
}

export async function ai(lang) { return loggedAI(await chromeProvider(lang)); }

/* Image d'un projet (asset: ou https://) → Blob, pour la donner au modèle */
export async function imageBlob(site, src) {
  const v = String(src || '');
  const a = v.startsWith('asset:') ? site.assets?.[v.slice(6)] : null;
  const url = a ? assets.get(v.slice(6))?.dataUrl || a.dataUrl || '' : v;
  if (!url) { log.warn('ai.image-missing', __('Pas d’image à décrire'), { src: excerpt(v) }); throw new Error(__('Pas d’image.')); }
  try { return await (await fetch(url)).blob(); }
  catch (e) {
    log.warn('ai.image-fail', __('Image en ligne illisible (CORS ou hors ligne) : à importer dans le projet'), { src: excerpt(v), error: e });
    throw new Error(__('Image en ligne inaccessible : importez-la dans le projet pour la faire décrire.'));
  }
}

/* ---------- Contexte « ia » de l'en-tête du journal ---------- */
registerContext('ia', () => {
  const g = typeof self === 'undefined' ? {} : self;
  const states = lastStatus ? Object.entries(lastStatus).map(([k, v]) => `${k}=${v}`).join(' ') : '';
  return {
    fournisseur: fake() ? 'test (window.__atelierAI)' : 'Chrome',
    globales: Object.values(AI_APIS).map(a => a.global).filter((x, i, l) => l.indexOf(x) === i).map(x => (x in g ? x : __('{api} (absent)', { api: x }))).join(', '),
    état: lastStatus ? (lastSource === 'test' && !fake() ? __('{states} (état du faux modèle de test, pas de ce navigateur : rouvre ✨ IA locale)', { states }) : states) : __('pas encore vérifié (ouvre ✨ IA locale)'),
    vérifié: lastStatus ? (lastSource === 'test' ? __('il y a {n} s, langue {lang}, fournisseur de test', { n: Math.round((Date.now() - lastStatusAt) / 1000), lang: lastLang }) : __('il y a {n} s, langue {lang}', { n: Math.round((Date.now() - lastStatusAt) / 1000), lang: lastLang })) : undefined,
    traducteur: translatorStates()
  };
});
