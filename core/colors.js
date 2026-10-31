/* Couleurs « figées » (hex, rgb) utilisées hors palette, et remplacement en lot. */
import { walk } from './tree.js';
import { STYLE_PROPS, STATES, validateStyleValue } from './style.js';
import { __ } from './ui-i18n.js';
import { cloneSite } from './asset-store.js';

const COLOR_KEYS = Object.keys(STYLE_PROPS).filter(k => STYLE_PROPS[k].kind === 'color');
const isLiteral = v => typeof v === 'string' && v !== 'transparent' && !v.startsWith('palette:');
const norm = v => String(v).trim().toLowerCase();

function styles(site, fn) {
  for (const p of site.pages) walk(p.root, n => { if (n.style) fn(n.style, { pageId: p.id, nodeId: n.id }); return true; });
  for (const pr of Object.values(site.presets || {})) fn(pr.style, { presetId: pr.id });
}

export function colorUsages(site) {
  const map = new Map();
  styles(site, (style, where) => {
    for (const st of STATES) for (const k of COLOR_KEYS) {
      const v = style?.[st]?.[k];
      if (!isLiteral(v)) continue;
      const key = norm(v);
      const e = map.get(key) || { value: v, count: 0, places: [] };
      e.count++;
      if (e.places.length < 20) e.places.push({ ...where, state: st, prop: k });
      map.set(key, e);
    }
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function replaceColor(site, from, to) {
  if (validateStyleValue('color', to) === null) throw new Error(__('Couleur de remplacement invalide : {color}', { color: to }));
  const s = cloneSite(site);
  const target = norm(from);
  styles(s, style => {
    for (const st of STATES) for (const k of COLOR_KEYS) {
      if (isLiteral(style?.[st]?.[k]) && norm(style[st][k]) === target) style[st][k] = to;
    }
  });
  return s;
}
