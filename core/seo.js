/*
 * Référencement : réglages par page (titre, description, mot-clé, image de partage, non-indexation)
 * et analyse par page et par langue, avec note et points à corriger. Sans IA, toujours disponible.
 */
import { walk } from './tree.js';
import { REGISTRY, fieldsOf } from './widgets.js';
import { translate, docTitleOf } from './render.js';
import { richToText } from './sanitize.js';
import { effectiveMenu } from './menu.js';
import { headingIssues } from './contrast.js';
import { slugify } from './site.js';
import { __, __n, N_ } from './ui-i18n.js';

const clone = v => structuredClone(v);
const clean = (v, max) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’\x27]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

export const SEO_LIMITS = { titleMin: 15, titleMax: 60, descMin: 70, descMax: 160, words: 150, slugMax: 50 };
/*
 * Japonais : un caractère japonais occupe à peu près deux fois la largeur d'une lettre latine dans les
 * résultats de Google, et le japonais s'écrit sans espaces. Seuils en caractères : titre 10 à 32,
 * description 80 à 120, page « fournie » à partir de 300 caractères (≈ 150 mots), comptés sans espaces
 * ni ponctuation.
 */
export const SEO_LIMITS_JA = { titleMin: 10, titleMax: 32, descMin: 80, descMax: 120, chars: 300, slugMax: 50 };
export const seoLimits = lang => (lang === 'ja' ? SEO_LIMITS_JA : SEO_LIMITS);
const len = s => [...String(s ?? '')].length;

export function setSeoField(site, pageId, field, value, lang) {
  const s = clone(site);
  const p = s.pages.find(x => x.id === pageId);
  if (!p) throw new Error(__('Page introuvable.'));
  p.seo = { description: {}, ...(p.seo || {}) };
  const L = lang || s.defaultLanguage;
  const perLang = (k, v) => { p.seo[k] = { ...(p.seo[k] || {}), [L]: v }; if (!v) delete p.seo[k][L]; };
  switch (field) {
    case 'title': perLang('title', clean(value, 90)); break;
    case 'description': perLang('description', clean(value, 300)); break;
    case 'keyword': perLang('keyword', clean(value, 60).toLowerCase()); break;
    case 'image': {
      const v = String(value || '').trim();
      if (v && !/^asset:[a-z0-9_]+$/i.test(v) && !/^https:\/\/[^\s\x22\x27<>()]+$/i.test(v)) throw new Error(__('Image de partage : choisissez une image importée ou une adresse https://'));
      p.seo.image = v;
      break;
    }
    case 'noindex': p.seo.noindex = !!value; break;
    default: throw new Error(__('Réglage de référencement inconnu : {field}', { field }));
  }
  return s;
}

/* Titre affiché par Google (et l'onglet du navigateur) */
export const seoTitle = (site, page, lang) => docTitleOf(site, page, lang);

/* Texte visible d'une page (titres, textes, boutons…), sans les éléments masqués dans cette langue */
export function pageText(site, page, lang, root = page.root) {
  const out = [];
  walk(root, n => {
    if (n.ref || n.advanced?.hideLangs?.[lang]) return false;
    for (const f of fieldsOf(n.type)) {
      if (f.type === 'list') { for (const it of n.props?.[f.key] || []) for (const sf of f.fields) if (sf.i18n && ['text', 'inline', 'richtext'].includes(sf.type) && sf.key !== 'alt') out.push(richToText(translate(site, it[sf.key], lang))); continue; }
      if (f.i18n && ['text', 'inline', 'richtext'].includes(f.type) && f.key !== 'alt' && f.key !== 'caption') out.push(richToText(translate(site, n.props?.[f.key], lang)));
    }
    return true;
  });
  return out.filter(Boolean).join('\n');
}

export function seoDescription(site, page, lang) {
  const set = translate(site, page.seo?.description, lang);
  if (set) return { text: set, auto: false };
  let found = '';
  walk(page.root, n => {
    if (n.advanced?.hideLangs?.[lang]) return false;
    if (n.type === 'text') { found = richToText(translate(site, n.props.content, lang)); return !found; }
    return true;
  });
  return { text: [...found].slice(0, seoLimits(lang).descMax).join(''), auto: true };
}

const VAGUE = new Set(['cliquez ici', 'ici', 'cliquer ici', 'lire la suite', 'en savoir plus', 'plus', 'voir', 'lien', 'click here', 'here', 'read more', 'more', 'learn more', 'link', 'klik hier', 'hier', 'lees meer', 'meer', 'meer info', 'hier klicken', 'mehr', 'weiterlesen', 'mehr erfahren',
  'こちら', 'ここ', 'ここをクリック', 'こちらをクリック', 'クリック', 'クリックしてください', '詳しくはこちら', '詳細はこちら', '詳細', 'もっと見る', '続きを読む', 'もっと読む', 'リンク']);
const FILENAME = /\.(png|jpe?g|webp|gif|avif)$|^(img|dsc|dscn|image|photo|pxl|screenshot)[-_ ]?\d+/i;

/* Liens d'un élément : [{ text, href }] */
function linksOf(site, n, lang) {
  const out = [];
  const p = n.props || {};
  if (n.type === 'button' && p.link) out.push({ text: translate(site, p.label, lang), href: p.link });
  if (n.type === 'heading' && p.link) out.push({ text: richToText(translate(site, p.text, lang)), href: p.link });
  if (n.type === 'card' && p.link) out.push({ text: translate(site, p.button, lang), href: p.link });
  for (const f of fieldsOf(n.type)) {
    if (f.type !== 'richtext' && f.type !== 'inline') continue;
    const html = translate(site, p[f.key], lang);
    for (const m of String(html).matchAll(/<a\s[^>]*href=\x22([^\x22]*)\x22[^>]*>([\s\S]*?)<[/]a>/gi)) out.push({ text: richToText(m[2]), href: m[1] });
  }
  return out;
}

/* Images d'un élément : [{ src, alt }] */
function imagesOf(site, n, lang) {
  const p = n.props || {};
  const out = [];
  if (n.type === 'image' && p.src) out.push({ src: p.src, alt: translate(site, p.alt, lang) });
  if (n.type === 'card' && p.image) out.push({ src: p.image, alt: translate(site, p.alt, lang) });
  if (n.type === 'gallery') for (const it of p.items || []) if (it.src) out.push({ src: it.src, alt: translate(site, it.alt, lang) });
  return out;
}

function linkedPages(site) {
  const ids = new Set();
  for (const p of site.pages) walk(p.root, n => {
    for (const l of linksOf(site, n, site.defaultLanguage)) { const m = /^page:([A-Za-z0-9_-]+)/.exec(l.href || ''); if (m && m[1] !== p.id) ids.add(m[1]); }
    return true;
  });
  for (const it of effectiveMenu(site)) { if (it.pageId) ids.add(it.pageId); for (const c of it.children || []) if (c.pageId) ids.add(c.pageId); }
  for (const p of site.pages) if (p.footerLink) ids.add(p.id);
  return ids;
}

const W = { bad: 15, warn: 6, tip: 3, info: 0, good: 0 };

export function scoreOf(checks) {
  return Math.max(0, Math.min(100, 100 - checks.reduce((a, c) => a + (c.weight ?? W[c.level] ?? 0), 0)));
}

/* Mot-clé : comparaison sans accents pour l'alphabet latin ; NFKC sans espaces ni ponctuation pour le japonais (et toute autre écriture) */
const latinOnly = s => /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]*$/u.test(String(s ?? ''));
const normU = s => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

export function analyzePage(site, page, lang, { linked = null, titles = null, descriptions = null } = {}) {
  const checks = [];
  const add = (id, level, message, extra = {}) => checks.push({ id, level, message, ...extra });
  const def = site.defaultLanguage;
  const LIM = seoLimits(lang);
  const title = seoTitle(site, page, lang);
  const tl = len(title);
  if (page.seo?.noindex) add('noindex', 'info', __('Page marquée « ne pas indexer » : Google ne la montrera pas (et elle est retirée du sitemap).'));
  if (!title.trim()) add('title-missing', 'bad', __('Pas de titre.'));
  else if (tl > LIM.titleMax) add('title-long', 'warn', __('Titre de {n} caractères : Google coupe vers {max}.', { n: tl, max: LIM.titleMax }));
  else if (tl < LIM.titleMin) add('title-short', 'warn', __('Titre très court ({n} caractères) : ajoutez ce que fait le site ou la page.', { n: tl }));
  else add('title-ok', 'good', __('Titre de bonne longueur ({n} caractères).', { n: tl }));
  if (titles && titles.get(title)?.length > 1) add('title-duplicate', 'warn', __('Même titre qu’une autre page : chaque page devrait avoir le sien.'));

  const desc = seoDescription(site, page, lang);
  const dl = len(desc.text);
  if (!desc.text) add('desc-missing', 'bad', __('Pas de description pour Google.'));
  else if (desc.auto) add('desc-auto', 'warn', __('Description automatique (début du premier texte) : écrivez-en une qui donne envie de cliquer.'));
  else if (dl > LIM.descMax) add('desc-long', 'warn', __('Description de {n} caractères : coupée vers {max}.', { n: dl, max: LIM.descMax }));
  else if (dl < LIM.descMin) add('desc-short', 'tip', __('Description courte ({n} caractères) : visez {min} à {max}.', { n: dl, min: LIM.descMin, max: LIM.descMax }));
  else add('desc-ok', 'good', __('Description de bonne longueur.'));
  if (descriptions && !desc.auto && descriptions.get(desc.text)?.length > 1) add('desc-duplicate', 'warn', __('Même description qu’une autre page.'));

  if (lang !== def) {
    if (translate(site, page.seo?.description, def) && !page.seo?.description?.[lang]) add('translation-desc', 'warn', __('Description pas encore traduite en {lang}.', { lang: lang.toUpperCase() }));
    if (page.title?.[def] && !page.title?.[lang]) add('translation-title', 'warn', __('Titre pas encore traduit en {lang}.', { lang: lang.toUpperCase() }));
  }

  /* Titres : identifiant donné par contrast.js (h.code), jamais déduit du message (traduit) */
  const hi = headingIssues(page);
  for (const h of hi) {
    const id = h.code || (h.nodeId ? 'heading-skip' : 'h1-many');
    add(id, id === 'h1-none' ? 'bad' : 'warn', h.message.charAt(0).toUpperCase() + h.message.slice(1), h.nodeId ? { nodeId: h.nodeId } : {});
  }
  if (!hi.some(h => h.code === 'h1-none' || h.code === 'h1-many' || (!h.code && !h.nodeId))) add('h1-ok', 'good', __('Un seul titre principal (H1).'));

  const text = pageText(site, page, lang);
  const words = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
  const chars = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  if (lang === 'ja') {
    if (chars < LIM.chars) add('thin', 'warn', __n(chars, 'Peu de texte ({n} caractère) : Google comprend mieux une page d’au moins {min} caractères.', 'Peu de texte ({n} caractères) : Google comprend mieux une page d’au moins {min} caractères.', { min: LIM.chars }));
    else add('words-ok', 'good', __('{n} caractères de texte.', { n: chars }));
  } else if (words < LIM.words) add('thin', 'warn', __n(words, 'Peu de texte ({n} mot) : Google comprend mieux une page d’au moins {min} mots.', 'Peu de texte ({n} mots) : Google comprend mieux une page d’au moins {min} mots.', { min: LIM.words }));
  else add('words-ok', 'good', __('{n} mots de texte.', { n: words }));

  let images = 0;
  let noAlt = 0;
  const vague = [];
  walk(page.root, n => {
    if (n.ref || n.advanced?.hideLangs?.[lang]) return false;
    for (const im of imagesOf(site, n, lang)) {
      images++;
      if (!im.alt?.trim()) { noAlt++; add('img-alt', 'bad', __('{label} sans texte alternatif (lecteurs d’écran et recherche d’images).', { label: REGISTRY[n.type]?.label || __('Image') }), { nodeId: n.id }); }
      else if (FILENAME.test(im.alt.trim())) add('img-filename', 'warn', __('Texte alternatif qui ressemble à un nom de fichier : « {alt} ».', { alt: im.alt.trim() }), { nodeId: n.id });
    }
    for (const l of linksOf(site, n, lang)) if (VAGUE.has(norm(l.text).replace(/\s+/g, ' ')) || VAGUE.has(String(l.text).toLowerCase().replace(/[^\p{L} ]/gu, '').trim())) vague.push({ nodeId: n.id, text: l.text });
    return true;
  });
  for (const v of vague.slice(0, 8)) add('link-vague', 'warn', __('Lien « {text} » : dites où il mène (Google et les lecteurs d’écran lisent ce texte).', { text: v.text.trim() }), { nodeId: v.nodeId });

  if (page.slug && (page.slug.length > LIM.slugMax || page.slug.split('-').length > 6)) add('slug-long', 'warn', __('Adresse longue (/{slug}/) : gardez 2 à 5 mots.', { slug: page.slug }));
  if (linked && page.slug !== '' && !linked.has(page.id)) add('orphan', 'warn', __('Aucun lien ne mène à cette page (ni menu, ni bouton, ni texte) : Google risque de ne pas la trouver.'));

  const kw = translate(site, page.seo?.keyword, lang);
  if (!kw) add('keyword-none', 'info', __('Pas de mot-clé principal : choisissez l’expression que les gens taperaient pour trouver cette page.'));
  else {
    const latin = latinOnly(kw);
    const k = latin ? norm(kw) : normU(kw);
    const has = s => (latin ? norm(s) : normU(s)).includes(k);
    let h1 = '';
    walk(page.root, n => { if (n.type === 'heading' && n.props?.level === 'h1') { h1 = richToText(translate(site, n.props.text, lang)); return false; } return true; });
    const intro = lang === 'ja' ? [...text].slice(0, 200).join('') : text.split(/\s+/).slice(0, 100).join(' ');
    const KW = {
      'keyword-title': [N_('Mot-clé présent dans le titre.'), N_('Mot-clé absent dans le titre.')],
      'keyword-desc': [N_('Mot-clé présent dans la description.'), N_('Mot-clé absent dans la description.')],
      'keyword-h1': [N_('Mot-clé présent dans le titre principal (H1).'), N_('Mot-clé absent dans le titre principal (H1).')],
      'keyword-slug': [N_('Mot-clé présent dans l’adresse de la page.'), N_('Mot-clé absent dans l’adresse de la page.')],
      'keyword-intro': [N_('Mot-clé présent dans le début du texte.'), N_('Mot-clé absent dans le début du texte.')]
    };
    const kwCheck = (id, ok) => add(id, ok ? 'good' : 'tip', __(KW[id][ok ? 0 : 1]));
    kwCheck('keyword-title', has(title));
    kwCheck('keyword-desc', has(desc.text));
    kwCheck('keyword-h1', has(h1));
    /* Adresse : en ASCII ; un mot-clé en kana est comparé à sa transcription (チーム → chiimu), un mot-clé en kanji n'est pas vérifié */
    const kslug = latin ? k : slugify(kw, { fallback: '' }).replace(/-/g, ' ');
    if (page.slug && kslug) kwCheck('keyword-slug', norm(page.slug.replace(/-/g, ' ')).includes(latin ? k : norm(kslug)));
    kwCheck('keyword-intro', has(intro));
  }
  for (const c of checks) if (c.level === 'tip') c.weight = W.tip;
  return { score: scoreOf(checks), checks, stats: { words, chars, images, imagesNoAlt: noAlt, title, description: desc } };
}

export function analyzeSite(site, lang = site.defaultLanguage) {
  const linked = linkedPages(site);
  const titles = new Map();
  const descriptions = new Map();
  for (const p of site.pages) {
    const t = seoTitle(site, p, lang);
    titles.set(t, [...(titles.get(t) || []), p.id]);
    const d = seoDescription(site, p, lang);
    if (!d.auto && d.text) descriptions.set(d.text, [...(descriptions.get(d.text) || []), p.id]);
  }
  const pages = site.pages.map(p => ({ pageId: p.id, ...analyzePage(site, p, lang, { linked, titles, descriptions }) }));
  const checks = [];
  if (!site.baseUrl) checks.push({ id: 'baseurl', level: 'bad', message: __('Adresse du site non renseignée (panneau Site) : pas d’adresse canonique ni de sitemap pour Google.') });
  if (!site.header?.logo) checks.push({ id: 'logo', level: 'warn', message: __('Pas de logo (panneau Site) : Google l’affiche à côté du nom du site.') });
  let social = false;
  const roots = [...site.pages.map(p => p.root), site.layout?.footer, site.layout?.header].filter(Boolean);
  for (const r of roots) walk(r, n => { if (n.type === 'social' && (n.props?.items || []).some(i => /^https:/.test(i.url || ''))) social = true; return !social; });
  if (!social) checks.push({ id: 'social', level: 'info', message: __('Aucun réseau social relié (widget Réseaux sociaux) : Google les associe au site s’ils sont présents.') });
  const avg = pages.length ? pages.reduce((a, p) => a + p.score, 0) / pages.length : 100;
  return { score: Math.max(0, Math.round(avg - checks.reduce((a, c) => a + (W[c.level] || 0) / 2, 0))), checks, pages };
}

/* ---------- Adresses accentuées (punycode, RFC 3492) : xn--mdia-alternatif-bnb → média-alternatif ---------- */
function adapt(delta, points, first) {
  delta = first ? Math.floor(delta / 700) : delta >> 1;
  delta += Math.floor(delta / points);
  let k = 0;
  while (delta > 455) { delta = Math.floor(delta / 35); k += 36; }
  return k + Math.floor((36 * delta) / (delta + 38));
}
export function punyDecode(input) {
  const out = [];
  let n = 128;
  let i = 0;
  let bias = 72;
  const b = Math.max(0, input.lastIndexOf('-'));
  for (let j = 0; j < b; j++) out.push(input.charCodeAt(j));
  for (let idx = b > 0 ? b + 1 : 0; idx < input.length;) {
    const old = i;
    for (let w = 1, k = 36; ; k += 36) {
      if (idx >= input.length) return input;
      const c = input.charCodeAt(idx++);
      const digit = c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : 36;
      if (digit >= 36) return input;
      i += digit * w;
      const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
      if (digit < t) break;
      w *= 36 - t;
    }
    bias = adapt(i - old, out.length + 1, old === 0);
    n += Math.floor(i / (out.length + 1));
    i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}
export const hostToUnicode = host => String(host).split('.').map(l => (/^xn--/i.test(l) ? punyDecode(l.slice(4).toLowerCase()) : l)).join('.');
