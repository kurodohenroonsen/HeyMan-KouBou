/*
 * Langue de l'interface de l'éditeur (cycle 22) : français (source), anglais, japonais.
 * Le texte français est la clé (à la gettext) : une traduction manquante retombe sur le français.
 *   __('Annuler')                          → 'Undo'
 *   __('Page « {name} » créée', { name })   → paramètres nommés
 *   __`Page « ${name} » créée`             → gabarit : clé « Page « {0} » créée »
 *   __n(n, '{n} élément', '{n} éléments')   → pluriel (règle française : 0 et 1 au singulier)
 *   N_('Texte')                            → marque une chaîne pour l'extraction ; __(variable) la traduit plus tard
 * (Nom « __ » : « t » et « tr » sont déjà des noms de variables courants dans le code.)
 * Les catalogues sont posés par i18n/<langue>.js (script classique chargé avant les modules) dans
 * globalThis.__atelierCatalog[langue] ; la langue choisie est globalThis.__atelierUiLang.
 */
export const UI_LANGS = { fr: 'Français', en: 'English', ja: '日本語' };
export const UI_LOCALES = { fr: 'fr-BE', en: 'en-GB', ja: 'ja-JP' };

let forced = null;
export const uiLang = () => forced || (UI_LANGS[globalThis.__atelierUiLang] ? globalThis.__atelierUiLang : 'fr');
export const uiLocale = () => UI_LOCALES[uiLang()];
const catalog = () => (uiLang() === 'fr' ? null : globalThis.__atelierCatalog?.[uiLang()] || null);

/* Pour les tests : impose une langue et un catalogue */
export function setUiLanguage(lang, cat) {
  forced = lang && UI_LANGS[lang] ? lang : null;
  if (cat) (globalThis.__atelierCatalog ||= {})[lang] = cat;
}

const missed = new Set();
export const missingKeys = () => [...missed];

function lookup(src) {
  const c = catalog();
  if (!c) return src;
  const v = c[src];
  if (typeof v === 'string' && v) return v;
  missed.add(src);
  return src;
}

const fill = (s, p) => (p == null ? s : s.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined && p[k] !== null ? String(p[k]) : m)));

export const keyOf = strings => strings.reduce((a, s, i) => a + (i ? `{${i - 1}}` : '') + s, '');

/* __('texte', { param }) ou __`gabarit ${x}` */
export function __(src, ...rest) {
  if (Array.isArray(src) && src.raw) {
    const p = {};
    rest.forEach((v, i) => { p[i] = v; });
    return fill(lookup(keyOf(src)), p);
  }
  if (src === undefined || src === null) return '';
  return fill(lookup(String(src)), rest[0]);
}

export function __n(n, one, other, params = {}) {
  return __(Math.abs(n) <= 1 ? one : other, { n, ...params });
}

export const N_ = s => s;

/* Même texte français, deux sens (« Annuler » = undo / cancel) : __c('undo', 'Annuler') → clé « undo|Annuler » ; en français, le texte seul */
export function __c(context, src, params) {
  const key = `${context}|${src}`;
  const v = lookup(key);
  return fill(v === key ? src : v, params);
}

/* Nombres et dates dans la langue de l'interface */
export const fmtNumber = (n, o) => new Intl.NumberFormat(uiLocale(), o).format(n);
export const fmtDate = (d, o = { dateStyle: 'medium', timeStyle: 'short' }) => new Intl.DateTimeFormat(uiLocale(), o).format(d instanceof Date ? d : new Date(d));

/* Langue de départ : choix retenu, sinon ?lang=, sinon la première langue du navigateur que l'éditeur connaît, sinon l'anglais */
export function pickUiLang({ saved, query, languages = [] } = {}) {
  if (query && UI_LANGS[query]) return query;
  if (saved && UI_LANGS[saved]) return saved;
  for (const l of languages) { const b = String(l || '').toLowerCase().slice(0, 2); if (UI_LANGS[b]) return b; }
  return languages.length ? 'en' : 'fr';
}

/* Placeholders d'une chaîne (pour vérifier qu'une traduction garde les mêmes) */
export const placeholders = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
