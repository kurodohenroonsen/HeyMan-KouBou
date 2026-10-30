/*
 * Tâches d'IA locale, indépendantes du navigateur : chaque tâche utilise l'API dédiée de Chrome si elle existe
 * (Rewriter, Summarizer, Proofreader), sinon la Prompt API avec un schéma JSON strict.
 * Toutes les réponses sont vérifiées et nettoyées ici, avant d'arriver dans le site.
 *
 * Fournisseur attendu : { has: { prompt, multimodal, summarizer, rewriter, proofreader, translator },
 *   prompt({ system, user, schema, lang, images }) → texte JSON,
 *   summarize?({ text, type, length, context, lang }), rewrite?({ text, tone, length, context, lang }),
 *   proofread?({ text, lang }) → { correctedInput, corrections: [{ startIndex, endIndex, correction }] },
 *   translate?({ text, from, to }) }
 */

import { itemSchema, fieldsBrief, cleanExtracted, findDuplicates, reviewDigest } from './smart.js';
import { planSchema, catalogText, pageContext, validatePlan } from './assistant.js';
import { __, N_ } from './ui-i18n.js';

export const NANO_LANGS = new Set(['en', 'ja', 'es', 'de', 'fr']);
const LANG_NAME = { fr: 'français', de: 'allemand', en: 'anglais', es: 'espagnol', ja: 'japonais', nl: 'néerlandais' };
/* Noms de langue dans les messages affichés (LANG_NAME reste en français : il va dans les consignes du modèle) */
const LANG_UI = { fr: N_('français'), de: N_('allemand'), en: N_('anglais'), es: N_('espagnol'), ja: N_('japonais'), nl: N_('néerlandais') };
const langUi = l => (LANG_UI[l] ? __(LANG_UI[l]) : l);
/* Erreur affichée + cause stable (aiReason) que editor/ai.js lit sans dépendre de la langue de l'interface */
const aiError = (aiReason, message) => Object.assign(new Error(message), { aiReason });

export const REWRITE_MODES = {
  shorter: { label: __('Plus court'), native: { length: 'shorter' }, instruction: 'Raccourcis le texte d’au moins un tiers en gardant toutes les informations importantes.' },
  simpler: { label: __('Plus simple'), native: { length: 'as-is' }, context: 'Langage clair : phrases courtes, mots courants, voix active, une idée par phrase.', instruction: 'Réécris le texte en langage clair : phrases courtes, mots courants, voix active, une idée par phrase, sans perdre d’information.' },
  formal: { label: __('Plus formel'), native: { tone: 'more-formal' }, instruction: 'Réécris le texte sur un ton plus formel et professionnel.' },
  friendly: { label: __('Plus chaleureux'), native: { tone: 'more-casual' }, instruction: 'Réécris le texte sur un ton plus chaleureux et accueillant, sans familiarité excessive.' },
  longer: { label: __('Plus long'), native: { length: 'longer' }, instruction: 'Développe un peu le texte (une ou deux phrases de plus) sans inventer de faits : précise seulement ce qui est déjà dit.' }
};

/* ---------- Nettoyage des sorties ---------- */
export function cleanOut(s, max = 5000) {
  return String(s ?? '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/^[\s"«“”'`]+|[\s"»“”'`]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function clampAtWord(s, max) {
  const t = String(s ?? '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

const ALT_PREFIX = /^(?:(?:une?|la|le|l['’])\s+)?(?:image|photo(?:graphie)?|illustration|capture d['’]écran|picture|photo|screenshot|image|foto|afbeelding|bild|aufnahme)\s+(?:de\s+|d['’]|du\s+|des\s+|représentant\s+|montrant\s+|of\s+|showing\s+|van\s+|von\s+|mit\s+)?/i;
export function cleanAlt(s) {
  let t = cleanOut(s, 400).replace(ALT_PREFIX, '').replace(/[.。]+$/, '').trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return clampAtWord(t, 125);
}

export function parseJson(raw) {
  if (raw && typeof raw === 'object') return raw;
  const s = String(raw ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(s); } catch { /* on tente d'extraire un objet */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* illisible */ } }
  throw aiError('unreadable', __('Réponse illisible de l’IA locale : réessayez.'));
}

export function applyCorrections(text, corrections) {
  let out = String(text);
  for (const c of [...corrections].sort((a, b) => b.start - a.start)) out = out.slice(0, c.start) + c.replacement + out.slice(c.end);
  return out;
}

/* Retrouve des corrections « original → remplacement » dans le texte, dans l'ordre, sans chevauchement */
function locate(text, list) {
  const out = [];
  const taken = [];
  for (const c of list || []) {
    const original = String(c?.original ?? '');
    const replacement = String(c?.replacement ?? '').replace(/[<>]/g, '');
    if (!original || original === replacement) continue;
    let from = 0;
    let idx = -1;
    while ((idx = text.indexOf(original, from)) !== -1) {
      if (!taken.some(([a, b]) => idx < b && idx + original.length > a)) break;
      from = idx + 1;
    }
    if (idx === -1) continue;
    taken.push([idx, idx + original.length]);
    out.push({ start: idx, end: idx + original.length, original, replacement });
  }
  return out.sort((a, b) => a.start - b.start);
}

const obj = (props, required = Object.keys(props)) => ({ type: 'object', properties: props, required, additionalProperties: false });
const str = (maxLength, extra = {}) => ({ type: 'string', maxLength, ...extra });

/* ---------- Tâches ---------- */
export function createAI(provider) {
  const p = provider || { has: {} };
  const need = (what = 'prompt') => { if (!p.has?.[what]) throw (what === 'multimodal' ? aiError('no-vision', __('L’IA locale de ce navigateur ne lit pas encore les images (Prompt API multimodale).')) : aiError('absent', __('IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur).'))); };
  const genLang = (lang, sourceLang) => (NANO_LANGS.has(lang) ? lang : NANO_LANGS.has(sourceLang) ? sourceLang : 'en');
  const finish = async (value, lang, gen, extra = {}) => {
    if (lang === gen || !value) return { value, ...extra };
    if (!p.translate || !p.has?.translator) throw aiError('no-translator', __('Traduction en {lang} indisponible sur cet appareil (l’IA rédige en {gen}, puis traduit).', { lang: langUi(lang), gen: langUi(gen) }));
    return { value: cleanOut(await p.translate({ text: value, from: gen, to: lang })), translated: true, ...extra };
  };
  const ask = async (req) => parseJson(await p.prompt(req));
  const nlRefuse = (lang, what) => { if (!NANO_LANGS.has(lang)) throw aiError('refused-lang', __('{what} n’est pas encore disponible en {lang} : Gemini Nano ne parle que français, allemand, anglais, espagnol et japonais.', { what, lang: langUi(lang) })); };

  return {
    async rewrite(text, { mode, lang, context = '' } = {}) {
      const m = REWRITE_MODES[mode];
      if (!m) throw aiError('refused', __('Mode de reformulation inconnu : {mode}', { mode }));
      nlRefuse(lang, __('La reformulation'));
      const src = cleanOut(text, 4000);
      if (!src) throw aiError('refused', __('Rien à reformuler.'));
      let value;
      let via;
      if (p.has?.rewriter && p.rewrite) {
        value = cleanOut(await p.rewrite({ text: src, tone: m.native.tone || 'as-is', length: m.native.length || 'as-is', context: [m.context, context].filter(Boolean).join(' '), lang }), 8000);
        via = 'rewriter';
      } else {
        need();
        const r = await ask({ system: `Tu aides à rédiger un site web associatif. ${m.instruction} Garde la langue (${LANG_NAME[lang]}), le sens et les noms propres. Pas de guillemets ni de commentaire : seulement le texte réécrit.`, user: `${context ? `Contexte : ${context}\n` : ''}Texte :\n${src}`, schema: obj({ text: str(Math.max(400, src.length * 3)) }), lang });
        value = cleanOut(r.text, 8000);
        via = 'prompt';
      }
      if (!value) throw aiError('empty', __('L’IA n’a rien proposé : réessayez.'));
      const warning = mode === 'shorter' && value.length >= src.length ? __('La proposition n’est pas plus courte que l’original.') : '';
      return { value, via, ...(warning ? { warning } : {}) };
    },

    async proofread(text, { lang } = {}) {
      nlRefuse(lang, __('La correction'));
      const src = String(text ?? '').slice(0, 6000);
      let corrections;
      let via;
      if (p.has?.proofreader && p.proofread) {
        const r = await p.proofread({ text: src, lang });
        corrections = (r?.corrections || []).map(c => ({ start: c.startIndex, end: c.endIndex, original: src.slice(c.startIndex, c.endIndex), replacement: String(c.correction ?? c.replacement ?? '').replace(/[<>]/g, '') }))
          .filter(c => Number.isInteger(c.start) && Number.isInteger(c.end) && c.start >= 0 && c.end <= src.length && c.start <= c.end && c.original !== c.replacement);
        via = 'proofreader';
      } else {
        need();
        const r = await ask({ system: `Tu es correcteur en ${LANG_NAME[lang]}. Relève uniquement les fautes d’orthographe, de grammaire, d’accord et de ponctuation. Pour chaque faute, recopie exactement le passage fautif (original) et donne sa correction (replacement). Ne change ni le style ni le sens. S’il n’y a aucune faute, renvoie une liste vide.`, user: src, schema: obj({ corrections: { type: 'array', maxItems: 40, items: obj({ original: str(200), replacement: str(200) }) } }), lang });
        corrections = locate(src, r.corrections);
        via = 'prompt';
      }
      return { value: { corrections, corrected: applyCorrections(src, corrections) }, via };
    },

    async seoDescription({ title, text, keyword = '', lang, sourceLang = 'fr', siteName = '' }) {
      const gen = genLang(lang, sourceLang);
      const content = cleanOut(text, 6000);
      let raw;
      let via;
      if (p.has?.summarizer && p.summarize) {
        raw = await p.summarize({ text: content, type: 'tldr', length: 'short', context: `Description pour Google (balise meta description, 150 caractères au plus) de la page « ${title} »${siteName ? ` du site ${siteName}` : ''}.${keyword ? ` Expression importante : ${keyword}.` : ''}`, lang: gen });
        via = 'summarizer';
      } else {
        need();
        const r = await ask({ system: `Tu écris des descriptions pour Google (meta description) en ${LANG_NAME[gen]} : une ou deux phrases, 120 à 155 caractères, concrètes, qui donnent envie de cliquer, sans guillemets ni emojis ni « Découvrez » en début de phrase.`, user: `Site : ${siteName}\nPage : ${title}\n${keyword ? `Mot-clé à placer naturellement : ${keyword}\n` : ''}Contenu :\n${content}`, schema: obj({ description: str(165) }), lang: gen });
        raw = r.description;
        via = 'prompt';
      }
      const value = clampAtWord(cleanOut(raw, 600), 160);
      if (!value) throw aiError('empty', __('L’IA n’a rien proposé : la page contient-elle du texte ?'));
      return finish(value, lang, gen, { via, ...(value.length < 70 ? { warning: __('Description courte : 70 à 160 caractères conviennent mieux.') } : {}) });
    },

    async seoTitle({ title, text, keyword = '', lang, sourceLang = 'fr', siteName = '' }) {
      need();
      const gen = genLang(lang, sourceLang);
      const r = await ask({ system: `Tu proposes des titres de page pour Google en ${LANG_NAME[gen]} : 40 à 60 caractères, précis, l’information la plus importante au début, le nom du site à la fin après un tiret si la place le permet.`, user: `Site : ${siteName}\nTitre actuel : ${title}\n${keyword ? `Mot-clé : ${keyword}\n` : ''}Contenu :\n${cleanOut(text, 3000)}`, schema: obj({ title: str(70) }), lang: gen });
      const value = clampAtWord(cleanOut(r.title, 200), 60);
      if (!value) throw aiError('empty', __('L’IA n’a rien proposé.'));
      return finish(value, lang, gen, { via: 'prompt' });
    },

    async keywords({ title, text, lang, sourceLang = 'fr' }) {
      need();
      const gen = genLang(lang, sourceLang);
      const r = await ask({ system: `Propose les expressions de recherche (2 à 4 mots) que des internautes taperaient sur Google pour trouver cette page, en ${LANG_NAME[gen]}, de la plus importante à la moins importante.`, user: `Page : ${title}\n${cleanOut(text, 3000)}`, schema: obj({ keywords: { type: 'array', maxItems: 8, items: str(60) } }), lang: gen });
      const seen = new Set();
      const value = (r.keywords || []).map(k => cleanOut(k, 60).toLowerCase()).filter(k => k && !seen.has(k) && seen.add(k)).slice(0, 5);
      if (lang === gen || !value.length) return { value, via: 'prompt' };
      if (!p.translate || !p.has?.translator) throw aiError('no-translator', __('Traduction indisponible sur cet appareil.'));
      return { value: await Promise.all(value.map(async k => cleanOut(await p.translate({ text: k, from: gen, to: lang }), 60).toLowerCase())), via: 'prompt', translated: true };
    },

    async altText({ image, context = '', lang, sourceLang = 'fr' }) {
      need();
      need('multimodal');
      const gen = genLang(lang, sourceLang);
      const r = await ask({ system: `Tu écris des textes alternatifs d’images pour les personnes aveugles, en ${LANG_NAME[gen]} : une phrase de 125 caractères au plus qui dit ce que l’image montre d’utile dans son contexte, sans commencer par « Image de » ni « Photo de ». Si l’image est purement décorative, renvoie un texte vide et decorative = true.`, user: `${context ? `Contexte de la page : ${cleanOut(context, 400)}\n` : ''}Décris cette image.`, images: [image], schema: obj({ alt: str(160), decorative: { type: 'boolean' } }), lang: gen });
      const decorative = !!r.decorative && !cleanOut(r.alt);
      const value = decorative ? '' : cleanAlt(r.alt);
      if (!value && !decorative) throw aiError('empty', __('L’IA n’a pas su décrire cette image.'));
      const out = await finish(value, lang, gen, { via: 'prompt', decorative });
      if (out.translated) out.value = cleanAlt(out.value);
      return out;
    },

    /* Affiche (image) ou texte collé → éléments de collection, vérifiés champ par champ */
    async extractItems({ site, col, image = null, text = '', lang, today, max = 30 }) {
      need();
      if (image) need('multimodal');
      const src = image ? '' : String(text ?? '').trim().slice(0, 12000);
      if (!image && !src) throw aiError('refused', __('Rien à lire : collez un texte (e-mail, liste, programme).'));
      const def = site.defaultLanguage;
      const gen = genLang(def, NANO_LANGS.has(lang) ? lang : 'fr');
      const many = !image;
      const schema = itemSchema(col, { max: many ? Math.max(2, max + 2) : 1 });
      const system = `Tu remplis la fiche « ${col.name} » d’un site associatif à partir ${image ? 'de la photo d’une affiche ou d’un flyer' : 'd’un texte collé (e-mail, liste, programme)'}. `
        + `Recopie seulement ce qui est écrit, sans rien inventer ; laisse vide ce qui manque. Écris les textes en ${LANG_NAME[gen]}. Nous sommes aujourd’hui le ${today}.\n`
        + `${many ? 'Une fiche par élément distinct (membre, événement, article…), dans l’ordre du texte.\n' : ''}Champs :
${fieldsBrief(col, def)}`;
      const r = await ask({ system, user: image ? 'Lis cette affiche et remplis la fiche.' : `Texte :
${src}`, schema, lang: gen, ...(image ? { images: [image] } : {}) });
      const rawList = many ? (Array.isArray(r.items) ? r.items : Array.isArray(r) ? r : [r]) : [r.items?.[0] || r];
      const list = rawList.filter(x => x && typeof x === 'object');
      const truncated = Math.max(0, list.length - max);
      let translated = false;
      const value = [];
      for (const raw of list.slice(0, max)) {
        const x = cleanExtracted(site, col, raw, { today, lang: gen });
        if (gen !== def) {
          for (const f of col.fields.filter(f => f.i18n && x.values[f.key]?.[gen] !== undefined)) {
            if (!p.translate || !p.has?.translator) throw aiError('no-translator', __('Traduction en {lang} indisponible sur cet appareil (l’IA lit en {gen}, puis traduit).', { lang: langUi(def), gen: langUi(gen) }));
            const v = x.values[f.key][gen];
            const plain = f.type === 'richtext' ? v.replace(/<br>/g, '\n').replace(/<\/p><p>/g, '\n\n').replace(/<[^>]*>/g, '') : v;
            const t = cleanOut(await p.translate({ text: plain, from: gen, to: def }), 3000);
            x.values[f.key] = { [def]: f.type === 'richtext' ? `<p>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : t };
            translated = true;
          }
        }
        value.push(x);
      }
      if (!value.length || value.every(x => !x.found.length)) throw aiError('nothing-found', image ? __('L’IA n’a rien su lire sur cette image : essayez une photo plus nette, prise de face.') : __('L’IA n’a trouvé aucun élément dans ce texte.'));
      return { value, via: 'prompt', duplicates: findDuplicates(site, col, value, def), truncated, translated };
    },

    /* Chapô d'un article (Summarizer « teaser », sinon Prompt API) */
    async excerpt({ title = '', text, lang, sourceLang = 'fr', max = 220 }) {
      const gen = genLang(lang, sourceLang);
      const content = cleanOut(text, 6000);
      if (!content) throw aiError('refused', __('Écrivez d’abord le texte de l’article : le chapô le résume.'));
      let raw;
      let via;
      if (p.has?.summarizer && p.summarize) {
        raw = await p.summarize({ text: content, type: 'teaser', length: 'short', context: `Chapô (une ou deux phrases, ${max} caractères au plus) de l’article « ${title} » d’un média associatif.`, lang: gen });
        via = 'summarizer';
      } else {
        need();
        const r = await ask({ system: `Tu écris le chapô d’un article en ${LANG_NAME[gen]} : une ou deux phrases, ${max} caractères au plus, qui donnent l’essentiel et l’envie de lire, sans guillemets ni emojis.`, user: `Titre : ${title}
Article :
${content}`, schema: obj({ excerpt: str(max + 40) }), lang: gen });
        raw = r.excerpt;
        via = 'prompt';
      }
      const value = clampAtWord(cleanOut(raw, 1200), max);
      if (!value) throw aiError('empty', __('L’IA n’a rien proposé : réessayez.'));
      return finish(value, lang, gen, { via });
    },

    /* Trois titres possibles pour un article */
    async headlines({ title = '', text, lang, sourceLang = 'fr', max = 90 }) {
      need();
      const gen = genLang(lang, sourceLang);
      const content = cleanOut(text, 4000);
      if (!content && !title) throw aiError('refused', __('Rien à résumer : écrivez d’abord le texte de l’article.'));
      const r = await ask({ system: `Propose trois titres d’article différents en ${LANG_NAME[gen]}, précis et sobres, ${max} caractères au plus, sans point final ni guillemets.`, user: `Titre actuel : ${title}
Article :
${content}`, schema: obj({ titles: { type: 'array', maxItems: 5, items: str(max + 30) } }), lang: gen });
      const seen = new Set([cleanOut(title).toLowerCase()]);
      const out = [];
      for (const t of r.titles || []) {
        const v = clampAtWord(cleanOut(t, 300).replace(/[.。]+$/, ''), max);
        if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); }
        if (out.length === 3) break;
      }
      if (!out.length) throw aiError('empty', __('L’IA n’a rien proposé : réessayez.'));
      if (lang === gen) return { value: out, via: 'prompt' };
      if (!p.translate || !p.has?.translator) throw aiError('no-translator', __('Traduction indisponible sur cet appareil.'));
      return { value: await Promise.all(out.map(async t => clampAtWord(cleanOut(await p.translate({ text: t, from: gen, to: lang }), 300), max))), via: 'prompt', translated: true };
    },

    /* Résumé de la relecture : points clés et tâches (une par commentaire ouvert) */
    async reviewSummary({ site, lang }) {
      const digest = reviewDigest(site);
      const open = digest.openComments;
      if (!open.length) throw aiError('refused', __('Aucun commentaire ouvert à résumer.'));
      const gen = genLang(lang, site.defaultLanguage);
      const text = open.map(c => `[${c.page} · ${c.label}] ${c.author} : ${c.text}`).join('\n');
      let points;
      let via;
      if (p.has?.summarizer && p.summarize) {
        const raw = await p.summarize({ text, type: 'key-points', length: open.length > 8 ? 'long' : open.length > 4 ? 'medium' : 'short', context: 'Commentaires de relecture d’un site web : ce qu’il reste à corriger.', lang: gen });
        points = String(raw ?? '').split(/\n+/).map(l => cleanOut(l.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, ''), 300)).filter(Boolean);
        via = 'summarizer';
      } else {
        need();
        const r = await ask({ system: `Résume en ${LANG_NAME[gen]} ces commentaires de relecture d’un site web en 3 à 7 points clés : ce qu’il reste à corriger.`, user: text, schema: obj({ points: { type: 'array', maxItems: 7, items: str(300) } }), lang: gen });
        points = (r.points || []).map(x => cleanOut(x, 300)).filter(Boolean);
        via = 'prompt';
      }
      const byId = new Map();
      if (p.has?.prompt) {
        const r = await ask({ system: `Pour chaque commentaire de relecture, écris la tâche à faire, à l’impératif, en ${LANG_NAME[gen]}, en 12 mots au plus. Garde l’identifiant.`, user: open.map(c => `${c.id} : ${c.text}`).join('\n'), schema: obj({ tasks: { type: 'array', maxItems: open.length + 2, items: obj({ id: str(30), task: str(160) }) } }), lang: gen });
        for (const t of r.tasks || []) if (open.some(c => c.id === t.id) && cleanOut(t.task) && !byId.has(t.id)) byId.set(t.id, cleanOut(t.task, 160));
      }
      const tasks = open.map(c => ({ id: c.id, task: byId.get(c.id) || c.text, author: c.author, page: c.page, pageId: c.pageId, nodeId: c.nodeId, ai: byId.has(c.id) }));
      return { value: { digest, points, tasks }, via };
    },

    /* « Demander à Atelier » : demande en langage courant → actions de la liste fermée, vérifiées */
    async plan({ site, request, ctx = {}, lang }) {
      need();
      const req = cleanOut(request, 1000);
      if (!req) throw aiError('refused', __('Écrivez votre demande (par exemple : « ajoute une FAQ de 3 questions sur l’adhésion »).'));
      const gen = genLang(lang || site.defaultLanguage, 'fr');
      const r = await ask({
        system: `Tu es l’assistant de l’éditeur de sites Atelier. Tu traduis la demande en actions choisies UNIQUEMENT dans la liste fermée ci-dessous, avec leurs paramètres ; rien d’autre n’est possible. `
          + `Si la demande ne correspond à aucune action, renvoie une liste vide et explique-le dans summary. Textes à écrire (titres, questions, réponses) en ${LANG_NAME[ctx.lang || site.defaultLanguage] || LANG_NAME[gen]}, courts et concrets ; n’invente pas de faits (horaires, adresses, prix) : laisse des textes génériques à compléter. `
          + `summary : une phrase qui dit ce que tu vas faire.\n${catalogText(site)}`,
        user: `${pageContext(site, ctx)}\nDemande : ${req}`,
        schema: planSchema(site),
        lang: gen
      });
      const v = validatePlan(site, r, ctx);
      return { value: { ...v, summary: cleanOut(r.summary, 240), request: req }, via: 'prompt' };
    },

    async linkText({ text, target = '', context = '', lang }) {
      need();
      nlRefuse(lang, __('La proposition de texte de lien'));
      const r = await ask({ system: `Propose un texte de lien explicite en ${LANG_NAME[lang]} (2 à 6 mots) qui dit où mène le lien, sans « cliquez ici ».`, user: `Texte actuel : ${cleanOut(text, 100)}\nPage visée : ${cleanOut(target, 120)}\nContexte : ${cleanOut(context, 400)}`, schema: obj({ anchor: str(60) }), lang });
      const value = clampAtWord(cleanOut(r.anchor, 120), 60);
      if (!value) throw aiError('empty', __('L’IA n’a rien proposé.'));
      return { value, via: 'prompt' };
    }
  };
}
