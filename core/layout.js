/* En-tête et pied de page construits en blocs (sinon : versions par défaut). */
import './widgets-extra.js';
import { createNode, createSectionWithColumns } from './tree.js';

const clone = v => structuredClone(v);

function w(type, props = {}, style = {}) {
  const n = createNode(type);
  Object.assign(n.props, props);
  for (const [st, v] of Object.entries(style)) Object.assign(n.style[st], v);
  return n;
}

export function defaultHeaderNode() {
  const sec = createSectionWithColumns(3, [3, 6, 3]);
  sec.props.tag = 'div';
  Object.assign(sec.style.desktop, { paddingTop: '12px', paddingBottom: '12px' });
  const row = sec.children[0];
  row.props.stack = 'never';
  row.style.desktop.alignItems = 'center';
  const [c1, c2, c3] = row.children;
  c1.children = [w('site-logo')];
  c2.children = [w('nav-menu', { align: 'center' })];
  c3.children = [w('lang-switch', {}, { desktop: { alignSelf: 'end' } })];
  c1.style.mobile.span = 7;
  c2.style.mobile.span = 5;
  c3.style.mobile.span = 12;
  c3.advanced.cssClass = 'hdr-langs';
  return sec;
}

export function defaultFooterNode(site) {
  const sec = createSectionWithColumns(3, [5, 4, 3]);
  sec.props.tag = 'div';
  Object.assign(sec.style.desktop, { paddingTop: '40px', paddingBottom: '40px' });
  const [c1, c2, c3] = sec.children[0].children;
  c1.children = [w('site-logo', { showName: true }), w('text', { content: Object.fromEntries(Object.entries(site.footer?.text || { fr: '' }).map(([l, v]) => [l, `<p>${v}</p>`])) }, { desktop: { color: 'palette:c5' } })];
  c2.children = [w('nav-menu', { layout: 'vertical' })];
  c3.children = [w('social')];
  return sec;
}

export function customizeHeader(site) {
  const s = clone(site);
  s.layout = { header: null, footer: null, ...(s.layout || {}) };
  if (!s.layout.header) s.layout.header = defaultHeaderNode();
  return s;
}

export function customizeFooter(site) {
  const s = clone(site);
  s.layout = { header: null, footer: null, ...(s.layout || {}) };
  if (!s.layout.footer) s.layout.footer = defaultFooterNode(s);
  return s;
}

export function resetLayout(site, zone) {
  const s = clone(site);
  s.layout = { header: null, footer: null, ...(s.layout || {}) };
  s.layout[zone] = null;
  return s;
}
