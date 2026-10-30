/*
 * Banc d'essai de l'IA locale : chaque tâche d'Atelier lancée sur des exemples fixes, réponses vérifiées
 * automatiquement, durées mesurées, rapport à copier. Sans DOM (les images sont fournies par l'éditeur).
 */
import { createSite, updatePageRoot, findPage } from './site.js';
import { buildTemplate } from './templates.js';
import { insertNode, walk } from './tree.js';
import { createCollectionWithPage } from './collections.js';
import { addComment } from './review.js';
import { translate } from './render.js';
import { __ } from './ui-i18n.js';
import { headerLabel } from './log.js';

export const BENCH_GROUPS = { writing: __('Rédaction'), seo: __('Référencement'), content: __('Contenus'), assistant: __('Assistant'), languages: __('Langues') };
export const STATUS_LABEL = { ok: __('✓ réussi'), partial: __('◐ partiel'), fail: __('✗ échoué'), error: __('⚠ erreur'), skipped: __('– ignoré'), stopped: __('■ arrêté') };

const TEXT_LONG = 'Le MAB, la fédération des médias alternatifs belges, réunit des radios associatives, des télévisions participatives et des sites d’information indépendants. Ensemble, ils partagent du matériel, des techniciens et des moyens de diffusion, tandis que chaque rédaction garde une totale indépendance éditoriale.';
const TEXT_FAULTS = 'Les médias alternatif se réunisse chaque mois a Bruxelles pour partager leurs moyens.';
const ARTICLE = 'Cet automne, le MAB part en tournée dans les maisons de quartier de Bruxelles, de Liège et de Namur. À chaque étape, les radios et télévisions membres proposent des ateliers gratuits : enregistrer un podcast, filmer avec un smartphone, vérifier une information. L’objectif est de rencontrer les habitants et de leur donner envie de participer aux médias libres.';
const EMAIL = 'Bonjour à toutes et tous,\n\nTrois nouveaux médias rejoignent le réseau : Radio Panik, la radio associative bruxelloise (radiopanik.org) ; Zin TV, télévision participative à Bruxelles (zintv.org) ; et Médor, le magazine d’enquête basé à Namur (medor.coop).\n\nBienvenue à eux !\nLaurent';

const words = s => String(s ?? '').trim().split(/\s+/).filter(Boolean);
const avgSentence = s => { const ss = String(s ?? '').split(/[.!?…]+/).map(x => words(x).length).filter(Boolean); return ss.length ? ss.reduce((a, b) => a + b, 0) / ss.length : 0; };
const chk = (label, ok, detail = '', critical = false) => ({ label, ok: !!ok, detail: String(detail ?? ''), critical });
const len = s => String(s ?? '').length;
/* Détails des vérifications, dans la langue de l'interface */
const car = n => __('{n} car.', { n });
const read = v => __('lu : {v}', { v: v || __('(rien)') });
const none = () => __('aucune');
const quote = v => __('« {v} »', { v });
const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Données d'exemple ---------- */
export function benchFixtures({ today = new Date().toISOString().slice(0, 10), images = {} } = {}) {
  let site = createSite({ name: 'MAB – Médias Alternatifs Belges', languages: ['fr', 'nl', 'de', 'en'] });
  const home = site.pages[0];
  let root = home.root;
  root = insertNode(root, root.id, buildTemplate('hero'), 0);
  root = insertNode(root, root.id, buildTemplate('features'), 1);
  site = updatePageRoot(site, home.id, root);
  const cols = {};
  for (const kind of ['events', 'members', 'news']) {
    const r = createCollectionWithPage(site, { kind, examples: false, today });
    site = r.site;
    cols[kind] = r.id;
  }
  const mk = (id, name, text, at) => ({ id, parentId: null, anchor: { pageId: home.id, nodeId: home.id, label: 'Page' }, text, author: { name, fp: fold(name) }, at, resolved: false, replies: [] });
  site = addComment(site, mk('cm_bench001', 'Laurent', 'Le titre de l’accueil est trop long, il faut le raccourcir.', '2026-10-20T10:00:00Z'));
  site = addComment(site, mk('cm_bench002', 'Laurent', 'Il manque le logo de Zin TV dans les membres.', '2026-10-21T10:00:00Z'));
  site = addComment(site, mk('cm_bench003', 'Kudoro', 'Vérifier la date du festival dans l’agenda.', '2026-10-22T10:00:00Z'));
  const pageText = (() => { const out = []; walk(findPage(site, home.id).root, n => { for (const k of ['text', 'content', 'title', 'label']) { const v = n.props?.[k]; if (v && typeof v === 'object') out.push(translate(site, v, 'fr').replace(/<[^>]*>/g, ' ')); } return true; }); return out.join(' ').replace(/\s+/g, ' ').trim(); })();
  return { site, cols, today, images, pageText: `${pageText} ${TEXT_LONG}`, ctx: { pageId: home.id, selectedId: null, lang: 'fr' } };
}

/* ---------- Cas ---------- */
const col = (fx, kind) => fx.site.collections[fx.cols[kind]];
export const BENCH_CASES = [
  { id: 'rewrite-shorter', group: 'writing', label: __('Reformuler : plus court'), needs: ['prompt|rewriter'],
    run: ai => ai.rewrite(TEXT_LONG, { mode: 'shorter', lang: 'fr' }),
    checks: [r => chk(__('proposition non vide'), len(r.value), car(len(r.value)), true), r => chk(__('au moins 10 % plus court'), len(r.value) < len(TEXT_LONG) * 0.9, `${car(len(TEXT_LONG))} → ${car(len(r.value))}`, true), r => chk(__('garde « MAB »'), /MAB/.test(r.value), r.value.slice(0, 80))] },
  { id: 'rewrite-simpler', group: 'writing', label: __('Reformuler : plus simple (langage clair)'), needs: ['prompt|rewriter'],
    run: ai => ai.rewrite(TEXT_LONG, { mode: 'simpler', lang: 'fr' }),
    checks: [r => chk(__('proposition non vide'), len(r.value), car(len(r.value)), true), r => chk(__('phrases plus courtes en moyenne'), avgSentence(r.value) < avgSentence(TEXT_LONG), __('{a} → {b} mots par phrase', { a: avgSentence(TEXT_LONG).toFixed(1), b: avgSentence(r.value).toFixed(1) }), true)] },
  { id: 'rewrite-formal', group: 'writing', label: __('Reformuler : plus formel'), needs: ['prompt|rewriter'],
    run: ai => ai.rewrite(TEXT_LONG, { mode: 'formal', lang: 'fr' }),
    checks: [r => chk(__('proposition non vide'), len(r.value), car(len(r.value)), true), r => chk(__('différente de l’original'), r.value.trim() !== TEXT_LONG, '', true), r => chk(__('longueur raisonnable (moins de 1,6 fois)'), len(r.value) < len(TEXT_LONG) * 1.6, car(len(r.value)))] },
  { id: 'proofread', group: 'writing', label: __('Corriger trois fautes connues'), needs: ['prompt|proofreader'],
    run: ai => ai.proofread(TEXT_FAULTS, { lang: 'fr' }),
    checks: [r => { const c = r.value.corrected; const found = ['alternatifs', 'réunissent', 'à Bruxelles'].filter(x => c.includes(x)); return chk(__('au moins 2 fautes sur 3 corrigées'), found.length >= 2, `${found.length}/3 : ${found.join(', ') || none()} — ${quote(c.slice(0, 90))}`, true); },
      r => chk(__('aucune modification hors des fautes'), r.value.corrections.length <= 4, __('{n} correction(s)', { n: r.value.corrections.length }))] },
  { id: 'seo-description', group: 'seo', label: __('Description pour Google'), needs: ['prompt|summarizer'],
    run: (ai, fx) => ai.seoDescription({ title: 'Accueil', text: fx.pageText, lang: 'fr', siteName: 'MAB' }),
    checks: [r => chk(__('70 à 160 caractères'), len(r.value) >= 70 && len(r.value) <= 160, `${car(len(r.value))} — ${quote(r.value.slice(0, 80))}`, true), r => chk(__('parle des médias ou du MAB'), /m[ée]dia|MAB/i.test(r.value), '')] },
  { id: 'seo-title', group: 'seo', label: __('Titre pour Google'), needs: ['prompt'],
    run: (ai, fx) => ai.seoTitle({ title: 'Accueil', text: fx.pageText, lang: 'fr', siteName: 'MAB' }),
    checks: [r => chk(__('1 à 60 caractères'), len(r.value) > 0 && len(r.value) <= 60, `${car(len(r.value))} — ${quote(r.value)}`, true), r => chk(__('au moins 15 caractères'), len(r.value) >= 15, car(len(r.value)))] },
  { id: 'keywords', group: 'seo', label: __('Idées de mots-clés'), needs: ['prompt'],
    run: (ai, fx) => ai.keywords({ title: 'Accueil', text: fx.pageText, lang: 'fr' }),
    checks: [r => chk(__('au moins 3 mots-clés'), r.value.length >= 3, `${r.value.length} : ${r.value.join(', ')}`, true), r => chk(__('pas de doublon'), new Set(r.value).size === r.value.length, '')] },
  { id: 'alt-text', group: 'seo', label: __('Texte alternatif d’une image (cercle rouge sur fond bleu)'), needs: ['prompt', 'multimodal'],
    run: (ai, fx) => ai.altText({ image: fx.images.shapes, context: 'Illustration de test', lang: 'fr' }),
    checks: [r => chk(__('description non vide'), len(r.value) > 0, `${quote(r.value)}`, true), r => chk(__('ne commence pas par « Image de »'), !/^(image|photo)\b/i.test(r.value), ''), r => chk(__('voit le cercle ou ses couleurs'), /cercle|rond|disque|rouge|bleu/i.test(r.value), `${quote(r.value)}`)] },
  { id: 'poster', group: 'content', label: __('Affiche dessinée → événement (date sans année)'), needs: ['prompt', 'multimodal'],
    run: (ai, fx) => ai.extractItems({ site: fx.site, col: col(fx, 'events'), image: fx.images.poster, lang: 'fr', today: fx.today }),
    checks: [r => chk(__('un élément lu'), r.value.length === 1, `${r.value.length}`, true),
      (r, fx) => { const d = r.value[0]?.values.date || ''; return chk(__('date : le 14 décembre à venir'), /-12-14$/.test(d) && d >= fx.today, read(d), true); },
      r => chk(__('heure 20:30'), r.value[0]?.values.time === '20:30', read(r.value[0]?.values.time)),
      r => chk(__('titre avec « radios »'), /radio/i.test(r.value[0]?.values.title?.fr || ''), read(r.value[0]?.values.title?.fr)),
      r => chk(__('lieu « Maison du Peuple »'), /maison du peuple/i.test(r.value[0]?.values.place || ''), read(r.value[0]?.values.place)),
      r => chk(__('site https://mediaslibres.be'), /^https:\/\/(www\.)?mediaslibres\.be\/?$/.test(r.value[0]?.values.link || ''), read(r.value[0]?.values.link))] },
  { id: 'members-text', group: 'content', label: __('E-mail de trois membres → trois fiches'), needs: ['prompt'],
    run: (ai, fx) => ai.extractItems({ site: fx.site, col: col(fx, 'members'), text: EMAIL, lang: 'fr', today: fx.today }),
    checks: [r => chk(__('trois fiches'), r.value.length === 3, `${r.value.length}`, true),
      r => chk(__('Zin TV trouvé'), r.value.some(x => /zin tv/i.test(x.values.name || '')), r.value.map(x => x.values.name).join(', ')),
      r => chk(__('sites complétés en https://'), r.value.filter(x => x.values.website).every(x => /^https:\/\//.test(x.values.website)) && r.value.some(x => x.values.website), r.value.map(x => x.values.website || '—').join(', ')),
      r => chk(__('Zin TV classé télévision'), r.value.find(x => /zin/i.test(x.values.name || ''))?.values.type === 'tv', read(r.value.find(x => /zin/i.test(x.values.name || ''))?.values.type))] },
  { id: 'excerpt', group: 'content', label: __('Chapô d’un article'), needs: ['prompt|summarizer'],
    run: ai => ai.excerpt({ title: 'Le MAB en tournée', text: ARTICLE, lang: 'fr' }),
    checks: [r => chk(__('1 à 220 caractères'), len(r.value) > 0 && len(r.value) <= 220, `${car(len(r.value))} — ${quote(r.value.slice(0, 80))}`, true), r => chk(__('plus court que l’article'), len(r.value) < len(ARTICLE) * 0.7, `${len(r.value)} / ${len(ARTICLE)}`)] },
  { id: 'headlines', group: 'content', label: __('Titres d’un article'), needs: ['prompt'],
    run: ai => ai.headlines({ title: 'Le MAB en tournée', text: ARTICLE, lang: 'fr' }),
    checks: [r => chk(__('au moins 2 titres'), r.value.length >= 2, r.value.join(' | '), true), r => chk(__('90 caractères au plus'), r.value.every(t => len(t) <= 90), ''), r => chk(__('tous différents'), new Set(r.value.map(fold)).size === r.value.length, '')] },
  { id: 'review-summary', group: 'content', label: __('Résumé d’une relecture (3 commentaires)'), needs: ['prompt|summarizer'],
    run: (ai, fx) => ai.reviewSummary({ site: fx.site, lang: 'fr' }),
    checks: [r => chk(__('au moins un point clé'), r.value.points.length >= 1, r.value.points.join(' | ').slice(0, 160), true), r => chk(__('une tâche par commentaire'), r.value.tasks.length === 3, `${r.value.tasks.length}`, true), r => chk(__('tâches reformulées par l’IA'), r.value.tasks.some(t => t.ai), `${r.value.tasks.filter(t => t.ai).length}/3`)] },
  { id: 'plan-faq', group: 'assistant', label: __('Demander : « ajoute une FAQ de 3 questions sur l’adhésion »'), needs: ['prompt'],
    run: (ai, fx) => ai.plan({ site: fx.site, request: 'ajoute une FAQ de 3 questions sur l’adhésion au MAB', ctx: fx.ctx, lang: 'fr' }),
    checks: [r => chk(__('action « questions fréquentes »'), r.value.steps.some(s => s.action === 'add_faq'), r.value.steps.map(s => s.action).join(', ') || none(), true), r => chk(__('3 questions'), r.value.steps.find(s => s.action === 'add_faq')?.params.questions.length === 3, `${r.value.steps.find(s => s.action === 'add_faq')?.params.questions.length ?? 0}`)] },
  { id: 'plan-style', group: 'assistant', label: __('Demander : « mets tous les titres en rouge »'), needs: ['prompt'],
    run: (ai, fx) => ai.plan({ site: fx.site, request: 'mets tous les titres de cette page en rouge', ctx: fx.ctx, lang: 'fr' }),
    checks: [r => chk(__('style des titres en rouge'), r.value.steps.some(s => s.action === 'style' && s.params.property === 'color' && /^#(dc2626|f00|ff0000|e11d48|c00|cc0000)$|^#[c-f][0-9a-f]{1,2}[0-4]/i.test(s.params.value) && s.params.target === 'headings'), r.value.steps.map(s => `${s.action}:${s.params.target || ''}:${s.params.property || ''}=${s.params.value || ''}`).join(', ') || none(), true)] },
  { id: 'plan-page', group: 'assistant', label: __('Demander : « crée une page avec un héros et un formulaire de contact »'), needs: ['prompt'],
    run: (ai, fx) => ai.plan({ site: fx.site, request: 'crée une page « Notre radio » avec un héros et un formulaire de contact', ctx: fx.ctx, lang: 'fr' }),
    checks: [r => chk(__('action « créer une page »'), r.value.steps.some(s => s.action === 'add_page'), r.value.steps.map(s => s.action).join(', ') || none(), true), r => { const sec = r.value.steps.find(s => s.action === 'add_page')?.params.sections.map(x => x.template) || []; return chk(__('sections héros et contact'), sec.some(x => /^hero/.test(x)) && sec.includes('contact'), sec.join(', ') || none()); }] },
  { id: 'plan-refuse', group: 'assistant', label: __('Demander : « supprime toutes les pages » (doit être refusé)'), needs: ['prompt'],
    run: (ai, fx) => ai.plan({ site: fx.site, request: 'supprime toutes les pages du site', ctx: fx.ctx, lang: 'fr' }),
    checks: [r => chk(__('aucune action appliquée'), r.value.steps.length === 0, r.value.steps.map(s => s.action).join(', ') || none(), true)] },
  { id: 'nl-description', group: 'languages', label: __('Description pour Google en néerlandais (traduction)'), needs: ['prompt|summarizer', 'translator'],
    run: (ai, fx) => ai.seoDescription({ title: 'Accueil', text: fx.pageText, lang: 'nl', sourceLang: 'fr', siteName: 'MAB' }),
    checks: [r => chk(__('description non vide'), len(r.value) > 0, `${quote(r.value.slice(0, 80))}`, true), r => chk(__('passée par la traduction'), !!r.translated, String(!!r.translated), true)] }
];

/* ---------- Exécution ---------- */
const hasAll = (needs, has) => needs.every(n => n.split('|').some(x => has?.[x]));
const outputOf = v => { try { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 200 ? `${s.slice(0, 199)}…` : s; } catch { return String(v); } };

export async function runBench(ai, { fx, has = {}, groups = null, ids = null, onStart, onProgress, signal, now = () => (globalThis.performance?.now ? performance.now() : Date.now()) } = {}) {
  const list = BENCH_CASES.filter(c => (!groups || groups.includes(c.group)) && (!ids || ids.includes(c.id)));
  const out = [];
  for (const c of list) {
    const base = { id: c.id, group: c.group, label: c.label };
    if (signal?.stopped) { out.push({ ...base, status: 'stopped', ms: 0, checks: [], output: '' }); continue; }
    if (!hasAll(c.needs, has)) {
      const r = { ...base, status: 'skipped', ms: 0, checks: [], output: '', reason: __('API absente : {apis}', { apis: c.needs.filter(n => !n.split('|').some(x => has?.[x])).join(', ') }) };
      out.push(r); onProgress?.(r); continue;
    }
    onStart?.(c);
    const t0 = now();
    let r;
    try {
      const value = await c.run(ai, fx);
      const checks = c.checks.map(fn => { try { return fn(value, fx); } catch (e) { return chk(__('vérification'), false, __('exception : {message}', { message: e.message }), true); } });
      const okAll = checks.every(x => x.ok);
      const critFail = checks.some(x => x.critical && !x.ok);
      const status = okAll ? 'ok' : critFail ? 'fail' : 'partial';
      r = { ...base, status, ms: Math.round(now() - t0), checks, output: outputOf(value?.value), via: value?.via, translated: !!value?.translated || undefined };
    } catch (e) {
      r = { ...base, status: 'error', ms: Math.round(now() - t0), checks: [], output: '', error: String(e?.message || e), errorName: e?.name };
    }
    out.push(r);
    onProgress?.(r);
  }
  return out;
}

export function benchSummary(res) {
  const counts = { ok: 0, partial: 0, fail: 0, error: 0, skipped: 0, stopped: 0 };
  for (const r of res) counts[r.status] = (counts[r.status] || 0) + 1;
  const run = res.length - counts.skipped - counts.stopped;
  const score = run ? Math.round(((counts.ok + counts.partial * 0.5) / run) * 100) : 0;
  const ms = res.reduce((t, r) => t + (r.ms || 0), 0);
  return { counts, score, run, total: res.length, ms };
}

/* « Note : 80 / 100 — 3 réussi(s)… » (fenêtre et rapport) */
export function benchScoreText(s) {
  const p = { score: s.score, ok: s.counts.ok, partial: s.counts.partial, fail: s.counts.fail, error: s.counts.error, skipped: s.counts.skipped, stopped: s.counts.stopped };
  return s.counts.stopped
    ? __('Note : {score} / 100 — {ok} réussi(s), {partial} partiel(s), {fail} échoué(s), {error} erreur(s), {skipped} ignoré(s), {stopped} arrêté(s)', p)
    : __('Note : {score} / 100 — {ok} réussi(s), {partial} partiel(s), {fail} échoué(s), {error} erreur(s), {skipped} ignoré(s)', p);
}

export function benchReport(res, env = {}, { date = new Date().toISOString() } = {}) {
  const s = benchSummary(res);
  const lines = [__('# Banc d’essai de l’IA locale — {date}', { date: date.slice(0, 16).replace('T', ' ') }), '',
    __('{score} · {s} s au total', { score: benchScoreText(s), s: Math.round(s.ms / 100) / 10 }), '',
    __('## Environnement'), ...Object.entries(env).map(([k, v]) => `- ${headerLabel(k)} : ${typeof v === 'string' ? v : JSON.stringify(v)}`), '',
    __('## Résultats'), __('| Cas | Statut | Durée | Sortie |'), '|---|---|---|---|',
    ...res.map(r => `| ${BENCH_GROUPS[r.group]} · ${r.label} | ${STATUS_LABEL[r.status]}${r.via ? ` (${r.via})` : ''} | ${r.ms ? `${(r.ms / 1000).toFixed(1)} s` : '—'} | ${(r.error || r.reason || r.output || '').replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 120)} |`), ''];
  const bad = res.filter(r => ['partial', 'fail', 'error'].includes(r.status));
  if (bad.length) {
    lines.push(__('## Détail des échecs'));
    for (const r of bad) {
      lines.push('', `### ${r.label} — ${STATUS_LABEL[r.status]}`);
      if (r.error) lines.push(__('- erreur : {error}', { error: `${r.errorName ? `${r.errorName} — ` : ''}${r.error}` }));
      for (const c of r.checks) lines.push(`- ${c.ok ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
      if (r.output) lines.push(__('- sortie : {output}', { output: r.output }));
    }
  }
  return lines.join('\n');
}
