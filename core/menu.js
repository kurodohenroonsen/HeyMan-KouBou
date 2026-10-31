/* Menu du site : automatique (toutes les pages) ou personnalisé, un niveau de sous-menu. */
import { escapeHtml, escapeAttr, safeUrl } from './escape.js';
import { pageDir, relative, translate } from './render.js';
import { __ } from './ui-i18n.js';
import { cloneSite } from './asset-store.js';

const newItemId = () => 'm_' + Math.random().toString(36).slice(2, 9);

export function effectiveMenu(site) {
  if (Array.isArray(site.menu)) return site.menu;
  return site.pages.filter(p => !p.footerLink).map(p => ({ id: `auto-${p.id}`, kind: 'page', pageId: p.id, label: {}, children: [] }));
}

export function customizeMenu(site) {
  const s = cloneSite(site);
  s.menu = site.pages.map(p => ({ id: newItemId(), kind: 'page', pageId: p.id, label: {}, newTab: false, children: [] }));
  return s;
}

function locate(menu, id) {
  for (let i = 0; i < menu.length; i++) {
    if (menu[i].id === id) return { list: menu, index: i, parent: null };
    const kids = menu[i].children || [];
    for (let j = 0; j < kids.length; j++) if (kids[j].id === id) return { list: kids, index: j, parent: menu[i] };
  }
  return null;
}

function withMenu(site, fn) {
  if (!Array.isArray(site.menu)) site = customizeMenu(site);
  const s = cloneSite(site);
  fn(s.menu, s);
  return s;
}

export function addMenuLink(site, { label, url, lang, newTab = false }) {
  return withMenu(site, (menu, s) => menu.push({ id: newItemId(), kind: 'link', url: String(url || '').trim(), label: { [lang || s.defaultLanguage]: String(label || 'Lien').slice(0, 60) }, newTab: !!newTab, children: [] }));
}

export function addMenuPage(site, pageId) {
  if (!site.pages.some(p => p.id === pageId)) throw new Error(__('Page introuvable.'));
  return withMenu(site, menu => menu.push({ id: newItemId(), kind: 'page', pageId, label: {}, newTab: false, children: [] }));
}

export function removeMenuItem(site, id) {
  return withMenu(site, menu => {
    const at = locate(menu, id);
    if (!at) throw new Error(__('Entrée de menu introuvable.'));
    const [item] = at.list.splice(at.index, 1);
    if (!at.parent && item.children?.length) at.list.splice(at.index, 0, ...item.children);
  });
}

export function moveMenuItem(site, id, delta) {
  return withMenu(site, menu => {
    const at = locate(menu, id);
    if (!at) throw new Error(__('Entrée de menu introuvable.'));
    const j = Math.max(0, Math.min(at.list.length - 1, at.index + delta));
    if (j === at.index) return;
    const [it] = at.list.splice(at.index, 1);
    at.list.splice(j, 0, it);
  });
}

export function indentMenuItem(site, id) {
  return withMenu(site, menu => {
    const at = locate(menu, id);
    if (!at) throw new Error(__('Entrée de menu introuvable.'));
    if (at.parent) throw new Error(__('Un seul niveau de sous-menu est possible.'));
    if (at.index === 0) throw new Error(__('La première entrée ne peut pas devenir un sous-menu : il lui faut une entrée au-dessus.'));
    const item = at.list[at.index];
    if (item.children?.length) throw new Error(__('Un seul niveau de sous-menu est possible : cette entrée a déjà un sous-menu.'));
    at.list.splice(at.index, 1);
    (menu[at.index - 1].children ||= []).push(item);
  });
}

export function outdentMenuItem(site, id) {
  return withMenu(site, menu => {
    const at = locate(menu, id);
    if (!at?.parent) return;
    const [item] = at.list.splice(at.index, 1);
    const pi = menu.indexOf(at.parent);
    menu.splice(pi + 1, 0, item);
  });
}

export function setMenuItemLabel(site, id, value, lang) {
  return withMenu(site, menu => {
    const at = locate(menu, id);
    if (!at) throw new Error(__('Entrée de menu introuvable.'));
    const it = at.list[at.index];
    it.label = { ...(it.label || {}), [lang]: String(value ?? '').slice(0, 60) };
  });
}

export function setMenuItemUrl(site, id, url) {
  return withMenu(site, menu => {
    const at = locate(menu, id);
    if (!at) throw new Error(__('Entrée de menu introuvable.'));
    at.list[at.index].url = String(url || '').trim();
  });
}

/* Retire les entrées qui pointent vers une page supprimée */
export function pruneMenu(site) {
  if (!Array.isArray(site.menu)) return site;
  const ids = new Set(site.pages.map(p => p.id));
  const keep = it => it.kind !== 'page' || ids.has(it.pageId);
  const s = cloneSite(site);
  s.menu = s.menu.filter(keep).map(it => ({ ...it, children: (it.children || []).filter(keep) }));
  return s;
}

export function menuLabel(site, item, lang) {
  const own = translate(site, item.label, lang);
  if (own) return own;
  if (item.kind === 'page') {
    const p = site.pages.find(x => x.id === item.pageId);
    return p ? translate(site, p.title, lang) || 'Sans titre' : '';
  }
  return 'Lien';
}

function itemHtml(site, item, page, lang, from) {
  let href;
  let current = false;
  if (item.kind === 'page') {
    const p = site.pages.find(x => x.id === item.pageId);
    if (!p) return '';
    href = relative(from, pageDir(site, p, lang));
    current = p.id === page.id;
  } else {
    href = safeUrl(item.url);
  }
  const ext = item.newTab ? ' target="_blank" rel="noopener"' : '';
  const a = `<a href="${escapeAttr(href)}"${current ? ' aria-current="page"' : ''}${ext}>${escapeHtml(menuLabel(site, item, lang))}</a>`;
  const kids = (item.children || []).map(k => itemHtml(site, k, page, lang, from)).join('');
  return kids ? `<li class="has-sub">${a}<ul class="submenu">${kids}</ul></li>` : `<li>${a}</li>`;
}

export function renderMenu(site, page, lang, from = [], { id = 'menu' } = {}) {
  return `<ul class="menu" id="${escapeAttr(id)}">${effectiveMenu(site).map(it => itemHtml(site, it, page, lang, from)).join('')}</ul>`;
}
