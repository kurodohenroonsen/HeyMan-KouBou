/*
 * Contraste des couleurs (WCAG 2.1, critère 1.4.3) et structure des titres (critère 1.3.1).
 * Calcul statique d'après les styles : couleur du texte et fond réellement visible (élément, parents, site).
 */
import { pathTo, findNode, walk } from './tree.js';
import { effectivePreset } from './presets.js';
import { __, N_, fmtNumber } from './ui-i18n.js';

export function parseColor(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  let m = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map(c => c + c).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : Math.max(0, Math.min(1, +m[4])) };
  return null;
}

const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');

export function luminance(c) {
  const ch = x => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

export function contrastRatio(a, b) {
  const ca = typeof a === 'string' ? parseColor(a) : a;
  const cb = typeof b === 'string' ? parseColor(b) : b;
  const [l1, l2] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* Valeur de style (hex, rgb, palette:cN) → hex opaque, transparence fusionnée sur `under` */
export function resolveColor(value, palette = {}, under = '#ffffff') {
  const v = String(value ?? '');
  const raw = v.startsWith('palette:') ? palette[v.slice(8)] : v;
  const c = parseColor(raw);
  if (!c) return null;
  if (c.a >= 1) return hex(c);
  const u = parseColor(under) || { r: 255, g: 255, b: 255 };
  return hex({ r: c.r * c.a + u.r * (1 - c.a), g: c.g * c.a + u.g * (1 - c.a), b: c.b * c.a + u.b * (1 - c.a) });
}

const DEFAULT_PALETTE = { c1: '#0f766e', c2: '#f59e0b', c3: '#16161a', c4: '#f7f7f4', c5: '#5f5f69', c6: '#ffffff' };

/* Widgets dont on vérifie le texte, et leurs couleurs propres */
const TEXT_TYPES = {
  heading: {}, text: {}, 'icon-list': {}, quote: {}, 'icon-box': {}, form: {}, social: {},
  stats: { fg: 'palette:c1' },
  card: { bg: 'palette:c6' }, pricing: { bg: 'palette:c6' }, accordion: { bg: 'palette:c6' }
};
const BUTTON = { primary: { fg: 'palette:c6', bg: 'palette:c1' }, secondary: { fg: 'palette:c3', bg: 'palette:c2' }, outline: { fg: 'palette:c1' }, link: { fg: 'palette:c1' } };
const LARGE_TOKENS = new Set(['xl', '2xl', '3xl', '4xl']);

function val(site, node, key) {
  const own = node.style?.desktop?.[key];
  if (own !== undefined) return own;
  const pid = effectivePreset(site, node);
  return pid ? site.presets[pid].style?.desktop?.[key] : undefined;
}

function isLarge(site, node) {
  if (node.type === 'heading' && ['h1', 'h2', 'h3'].includes(node.props?.level)) return true;
  const fs = String(val(site, node, 'fontSize') ?? '');
  if (fs.startsWith('size:')) return LARGE_TOKENS.has(fs.slice(5));
  const px = fs.endsWith('px') ? parseFloat(fs) : fs.endsWith('rem') || fs.endsWith('em') ? parseFloat(fs) * 16 : NaN;
  return px >= 24;
}

export function checkNodeContrast(site, page, nodeId, rootOverride) {
  const root = rootOverride || page.root;
  const node = findNode(root, nodeId);
  if (!node) return null;
  const pal = { ...DEFAULT_PALETTE, ...(site.theme?.palette || {}) };
  const chain = pathTo(root, nodeId).map(id => findNode(root, id)).reverse();
  const typeDef = node.type === 'button' ? BUTTON[node.props?.variant] || BUTTON.primary : TEXT_TYPES[node.type] || {};

  let bgValue = val(site, node, 'background') ?? typeDef.bg;
  let unknown = !!val(site, node, 'backgroundImage') && !bgValue;
  if (!bgValue && !unknown) {
    for (const n of chain.slice(1)) {
      const b = val(site, n, 'background');
      if (b && b !== 'transparent') { bgValue = b; break; }
      if (val(site, n, 'backgroundImage')) { unknown = true; break; }
    }
  }
  const bg = resolveColor(bgValue && bgValue !== 'transparent' ? bgValue : 'palette:c4', pal, pal.c4);
  let fgValue = val(site, node, 'color') ?? typeDef.fg;
  if (!fgValue) for (const n of chain.slice(1)) { const c = val(site, n, 'color'); if (c) { fgValue = c; break; } }
  const fg = resolveColor(fgValue || 'palette:c3', pal, bg);
  const large = isLarge(site, node);
  const required = large ? 3 : 4.5;
  if (unknown) return { nodeId, unknown: true, fg, bg: null, required, large, ok: true };
  if (!fg || !bg) return { nodeId, skipped: true, required, large, ok: true };
  const ratio = contrastRatio(fg, bg);
  return { nodeId, ratio, required, fg, bg, large, ok: ratio >= required - 0.005 };
}

export function contrastIssues(site, page, rootOverride) {
  const root = rootOverride || page.root;
  const out = [];
  walk(root, n => {
    if (n.ref) return false;
    if (n.type === 'button' || TEXT_TYPES[n.type]) {
      const r = checkNodeContrast(site, page, n.id, root);
      if (r && (r.unknown || !r.ok)) out.push(r);
    }
    return true;
  });
  return out;
}

export function palettePairs(palette) {
  const p = { ...DEFAULT_PALETTE, ...(palette || {}) };
  const pair = (id, label, fg, bg, required = 4.5) => {
    const ratio = contrastRatio(resolveColor(fg, p), resolveColor(bg, p));
    return { id, label, fg, bg, ratio, required, ok: ratio >= required - 0.005 };
  };
  return [
    pair('text', N_('Texte sur le fond'), 'palette:c3', 'palette:c4'),
    pair('muted', N_('Texte discret sur le fond'), 'palette:c5', 'palette:c4'),
    pair('link', N_('Liens sur le fond'), 'palette:c1', 'palette:c4'),
    pair('button', N_('Bouton principal'), 'palette:c6', 'palette:c1'),
    pair('secondary', N_('Bouton secondaire'), 'palette:c3', 'palette:c2'),
    pair('inverse', N_('Texte clair sur fond sombre'), 'palette:c6', 'palette:c3'),
    pair('surface', N_('Texte sur les cartes'), 'palette:c3', 'palette:c6')
  ];
}

/* Rapport de contraste affiché (« 4,5:1 » en français, « 4.5:1 » en anglais) */
export const formatRatio = r => `${fmtNumber(r, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:1`;

/* ---------- Structure des titres ---------- */
const INNER_H3 = new Set(['icon-box', 'card', 'pricing']);

export function headingIssues(page, root = page.root) {
  const list = [];
  walk(root, n => {
    if (n.ref) return false;
    if (n.type === 'heading' && /^h[1-4]$/.test(n.props?.level || 'h2')) list.push({ id: n.id, level: Number((n.props?.level || 'h2').slice(1)) });
    else if (INNER_H3.has(n.type)) list.push({ id: n.id, level: 3 });
    return true;
  });
  const out = [];
  const h1 = list.filter(h => h.level === 1).length;
  if (h1 === 0) out.push({ nodeId: null, code: 'h1-none', message: __('aucun titre principal (H1) : Google et les lecteurs d’écran en attendent un par page.') });
  if (h1 > 1) out.push({ nodeId: null, code: 'h1-many', message: __('{n} titres principaux (H1) : gardez-en un seul par page.', { n: h1 }) });
  let prev = 0;
  for (const h of list) {
    if (prev && h.level > prev + 1) out.push({ nodeId: h.id, code: 'heading-skip', message: __('niveau de titre sauté (H{from} → H{to}) : les lecteurs d’écran s’en servent comme table des matières.', { from: prev, to: h.level }) });
    prev = h.level;
  }
  return out;
}
