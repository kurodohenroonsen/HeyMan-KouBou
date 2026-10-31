/*
 * Icône du site (cycle 29) : favicon.ico (PNG 32 px dans un conteneur ICO), favicon.svg (SVG assaini),
 * apple-touch-icon.png (180), icon-192.png, icon-512.png et site.webmanifest. Les redimensionnements sont faits
 * dans le navigateur (editor/images.js) ; ici seulement l'assemblage, pur et sans DOM.
 */
import { escapeAttr } from './escape.js';

export const ICON_SIZES = [32, 180, 192, 512];
const PNG_DATA = /^data:image\/png;base64,[a-z0-9+/=]+$/i;

/* Un fichier .ico contenant une seule image PNG (reconnu par tous les navigateurs depuis Windows Vista) */
export function pngToIco(png, size) {
  const out = new Uint8Array(22 + png.length);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true);
  v.setUint16(2, 1, true);
  v.setUint16(4, 1, true);
  out[6] = size >= 256 ? 0 : size;
  out[7] = size >= 256 ? 0 : size;
  out[8] = 0;
  out[9] = 0;
  v.setUint16(10, 1, true);
  v.setUint16(12, 32, true);
  v.setUint32(14, png.length, true);
  v.setUint32(18, 22, true);
  out.set(png, 22);
  return out;
}

/* SVG assaini : ni script, ni gestionnaire d'événement, ni lien externe ou javascript:, ni foreignObject */
export function sanitizeSvg(text) {
  let s = String(text || '').replace(/^﻿/, '').replace(/<\?xml[^>]*\?>/i, '').replace(/<!DOCTYPE[^>]*>/i, '').trim();
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return '';
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['script', 'foreignObject', 'style', 'iframe', 'object', 'embed', 'animate', 'set']) {
    s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '').replace(new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi'), '');
  }
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s+(xlink:href|href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (m, attr, val) => {
    const v = val.replace(/^["']|["']$/g, '').trim();
    return /^#/.test(v) ? m : '';
  });
  s = s.replace(/\s+style\s*=\s*("[^"]*"|'[^']*')/gi, (m, val) => (/url\(|expression|javascript/i.test(val) ? '' : m));
  return s.length > 200_000 ? '' : s;
}

export function validIcon(icon) {
  if (!icon || typeof icon !== 'object' || !icon.png || typeof icon.png !== 'object') return false;
  if (!ICON_SIZES.every(n => PNG_DATA.test(String(icon.png[n] || '')))) return false;
  if (icon.svg !== undefined && icon.svg !== '' && sanitizeSvg(icon.svg) !== icon.svg) return false;
  return true;
}

const decode = dataUrl => {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
};

export function webmanifest(site) {
  const p = site.theme?.palette || {};
  return {
    name: site.name, short_name: String(site.name || '').slice(0, 12), lang: site.defaultLanguage, start_url: './', display: 'browser',
    theme_color: p.c1 || '#0f766e', background_color: p.c4 || '#ffffff',
    icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }]
  };
}

/* Fichiers de l'icône à la racine du site (Map nom → contenu), vide sans icône */
export function iconFiles(site) {
  const files = new Map();
  const ic = site.icon;
  if (!validIcon(ic)) return files;
  files.set('favicon.ico', pngToIco(decode(ic.png[32]), 32));
  if (ic.svg) files.set('favicon.svg', ic.svg);
  files.set('apple-touch-icon.png', decode(ic.png[180]));
  files.set('icon-192.png', decode(ic.png[192]));
  files.set('icon-512.png', decode(ic.png[512]));
  files.set(`site.webmanifest`, JSON.stringify(webmanifest(site), null, 1));
  return files;
}

/* Balises <link> de l'icône (chemins relatifs à la page) */
export function iconHead(site, toRoot = '') {
  if (!validIcon(site.icon)) return [];
  const r = escapeAttr(toRoot);
  return [
    `<link rel="icon" href="${r}favicon.ico" sizes="32x32">`,
    site.icon.svg ? `<link rel="icon" href="${r}favicon.svg" type="image/svg+xml">` : '',
    `<link rel="apple-touch-icon" href="${r}apple-touch-icon.png">`,
    `<link rel="manifest" href="${r}site.webmanifest">`
  ].filter(Boolean);
}
