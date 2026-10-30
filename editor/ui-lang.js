/*
 * Langue de l'interface (cycle 22) : traduction des textes fixes de index.html, sélecteur du menu Fichier,
 * changement de langue (le projet est enregistré, puis la page est rechargée dans la nouvelle langue).
 */
import { __, uiLang, UI_LANGS } from '../core/ui-i18n.js';
import { log, registerContext } from './log.js';

const ATTRS = ['title', 'aria-label', 'placeholder', 'data-tip', 'data-tip-desc'];
const SKIP = 'script, style, iframe, #toasts, textarea, [contenteditable="true"]';

/* Remplace les textes français de la page (index.html) par leur traduction ; les espaces autour sont gardés */
export function translateStatic(root = document) {
  if (uiLang() === 'fr') return 0;
  let n = 0;
  const body = root.body || root;
  const walker = root.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: node => (node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : /\p{L}{2,}/u.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue;
    const key = raw.replace(/\s+/g, ' ').trim();
    const tr = __(key);
    if (tr !== key) { node.nodeValue = raw.replace(/^(\s*)[\s\S]*?(\s*)$/, (m, a, b) => `${a}${tr}${b}`); n++; }
  }
  for (const el of body.querySelectorAll(ATTRS.map(a => `[${a}]`).join(','))) {
    if (el.closest('iframe')) continue;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || !/\p{L}/u.test(v)) continue;
      const tr = __(v.trim());
      if (tr !== v.trim()) { el.setAttribute(a, tr); n++; }
    }
  }
  if (root.title) root.title = __(root.title);
  return n;
}

export async function setUiLang(lang, { save } = {}) {
  if (!UI_LANGS[lang] || lang === uiLang()) return false;
  log.info('ui.lang', __`Langue de l’interface : ${UI_LANGS[lang]} (rechargement)`, { from: uiLang(), to: lang });
  try { await save?.(); } catch (e) { log.warn('ui.lang-save-fail', __('Projet non enregistré avant le changement de langue : {error}', { error: e?.message || e }), { error: e }); }
  try { localStorage.setItem('atelier-ui-lang', lang); } catch { /* stockage indisponible : ?lang= dans l'adresse */ }
  const u = new URL(location.href);
  for (const k of ['lang', 'fresh', 'autotest']) u.searchParams.delete(k);
  if (!localStorage.getItem?.('atelier-ui-lang')) u.searchParams.set('lang', lang);
  location.replace(u.toString());
  return true;
}

export function initUiLang({ save } = {}) {
  const n = translateStatic(document);
  const sel = document.querySelector('#uiLangSelect');
  if (sel) { sel.value = uiLang(); sel.addEventListener('change', () => setUiLang(sel.value, { save })); }
  registerContext('interface', () => ({ langue: uiLang(), navigateur: (navigator.languages || []).join(', ') }));
  log.debug('ui.lang-ready', __`Interface en ${UI_LANGS[uiLang()]}`, { lang: uiLang(), static: n, catalog: !!globalThis.__atelierCatalog?.[uiLang()] });
  if (uiLang() !== 'fr' && !globalThis.__atelierCatalog?.[uiLang()]) log.warn('ui.lang-missing', __`Traductions ${UI_LANGS[uiLang()]} introuvables (i18n/${uiLang()}.js) : l’interface reste en français`, { lang: uiLang() });
}
