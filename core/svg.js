/* Assainissement des SVG importés (cycle 33, W4), sans DOM : retire <script>, <foreignObject> (et iframe, object,
 * embed), les attributs on*, les href / xlink:href externes ou javascript:, le DOCTYPE et ses entités, les
 * instructions de traitement, @import et url() externes des styles. Un SVG propre ressort octet pour octet.
 * Appelé à l'import (editor/images.js via addAsset) et de nouveau à l'export (core/render.js). */
import { __ } from './ui-i18n.js';

const DROP = 'script|foreignObject|iframe|object|embed|handler|listener';
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const ATTR = /(\s+)([^\s=>/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
const SAFE_HREF = /^\s*(#|data:image\/(png|jpe?g|webp|gif|avif);base64,)/i;
/* url(...) qui ne vise pas une ancre interne (#id) */
const EXT_URL = /url\(\s*(?!['"]?#)[^)]*\)/gi;

function cleanStyle(css, removed) {
  let out = css.replace(/@import[^;]*;?/gi, () => { removed.push('style'); return ''; });
  out = out.replace(EXT_URL, () => { removed.push('style'); return 'none'; });
  return out;
}

function cleanAttrs(attrs, removed) {
  return attrs.replace(ATTR, (all, sp, name, eq, raw) => {
    const n = name.toLowerCase();
    const v = raw ? raw.replace(/^["']|["']$/g, '') : '';
    if (n.startsWith('on')) { removed.push('on*'); return ''; }
    if ((n === 'href' || n === 'xlink:href') && !SAFE_HREF.test(v)) { removed.push('href'); return ''; }
    /* <set to="javascript:…"> ou <animate values="…"> qui réécriraient un lien */
    if (/^\s*(javascript|vbscript|data:text)/i.test(v) || (n === 'attributename' && /href$/i.test(v))) { removed.push('href'); return ''; }
    if (n === 'style' && EXT_URL.test(v)) { EXT_URL.lastIndex = 0; const q = raw[0] === "'" ? "'" : '"'; return `${sp}${name}${eq}${q}${cleanStyle(v, removed)}${q}`; }
    EXT_URL.lastIndex = 0;
    return all;
  });
}

/* Retourne { svg, removed } ; removed liste ce qui a été retiré (« script », « on* », « href »…) */
export function sanitizeSvg(text) {
  const removed = [];
  let s = String(text ?? '').replace(/^﻿/, '');
  s = s.replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi, () => { removed.push('doctype'); return ''; });
  s = s.replace(/<!ENTITY[\s\S]*?>/gi, () => { removed.push('doctype'); return ''; });
  s = s.replace(/<\?(?!xml\s)[\s\S]*?\?>/gi, () => { removed.push('pi'); return ''; });
  if (!/^\s*(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>/]/i.test(s) || !/(<\/svg>|<svg\b[^>]*\/>)\s*$/i.test(s)) throw new Error(__('Ce fichier n’est pas un SVG lisible.'));
  const block = new RegExp(`<(${DROP})\\b[^>]*?(\\/>|>[\\s\\S]*?<\\/\\1\\s*>)`, 'gi');
  s = s.replace(block, (m, name) => { removed.push(name.toLowerCase() === 'foreignobject' ? 'foreignObject' : name.toLowerCase() === 'script' ? 'script' : name.toLowerCase()); return ''; });
  s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, a, css, b) => a + cleanStyle(css, removed) + b);
  s = s.replace(TAG, (all, close, name, attrs, self) => {
    if (new RegExp(`^(${DROP})$`, 'i').test(name)) { removed.push(name.toLowerCase() === 'script' ? 'script' : name); return ''; }
    if (close || !attrs) return all;
    const kept = cleanAttrs(attrs, removed);
    return kept === attrs ? all : `<${name}${kept}${self ? '/' : ''}>`;
  });
  s = s.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)[\w.-]+;/gi, () => { removed.push('doctype'); return ''; });
  return { svg: s, removed };
}

/* Texte d'un data:image/svg+xml (base64 ou encodé en URL) ; null si ce n'est pas un SVG */
export function svgFromDataUrl(dataUrl) {
  const m = /^data:image\/svg\+xml(;charset=[\w-]+)?(;base64)?,(.*)$/is.exec(String(dataUrl || ''));
  if (!m) return null;
  try { return m[2] ? new TextDecoder().decode(Uint8Array.from(atob(m[3]), c => c.charCodeAt(0))) : decodeURIComponent(m[3]); } catch { return null; }
}

/* data:image/svg+xml;base64 d'un texte SVG (UTF-8) */
export function svgDataUrl(svg) {
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}
