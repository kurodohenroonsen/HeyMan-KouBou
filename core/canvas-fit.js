/*
 * Largeur de rendu et échelle du canevas (cycle 30), logique pure.
 * Ordinateur : la page est fluide, rendue à la largeur disponible dès qu'elle dépasse DESKTOP_MIN (juste au-dessus
 * du point de rupture tablette, pour que les réglages « ordinateur » s'appliquent), réduite seulement en dessous.
 * Tablette et mobile : largeur fixe. Zoom : « fit » (ajuster) ou 50, 75, 100 (%).
 */
import { __ } from './ui-i18n.js';

export const DESKTOP_MIN = 1040;
export const DEVICE_WIDTH = { desktop: DESKTOP_MIN, tablet: 820, mobile: 390 };
export const ZOOM_LEVELS = [50, 75, 100];

const r2 = n => Math.round(n * 1000) / 1000;

/* → { width (px de rendu), scale (0–1), overflow (la page déborde : défilement horizontal) } */
export function fitCanvas({ device = 'desktop', zoom = 'fit', availW = 1280, widths = DEVICE_WIDTH } = {}) {
  const avail = Math.max(1, availW);
  const z = zoom === 'fit' ? null : Math.min(1, Math.max(0.1, Number(zoom) / 100));
  let width;
  let scale;
  if (device === 'desktop') {
    width = z === null ? Math.max(widths.desktop, avail) : Math.max(widths.desktop, Math.round(avail / z));
    scale = z === null ? Math.min(1, avail / width) : z;
  } else {
    width = widths[device] || widths.mobile;
    scale = z === null ? Math.min(1, avail / width) : z;
  }
  return { width, scale: r2(scale), overflow: width * scale > avail + 1 };
}

/* Palier de zoom suivant (dir 1) ou précédent (dir -1) par rapport à l'échelle affichée */
export function nextZoom(scale, dir) {
  const pct = Math.round(scale * 100);
  if (dir > 0) return ZOOM_LEVELS.find(l => l > pct + 0.5) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  return [...ZOOM_LEVELS].reverse().find(l => l < pct - 0.5) ?? ZOOM_LEVELS[0];
}

export function zoomText(zoom, scale) {
  return zoom === 'fit' ? __('Ajuster ({pct} %)', { pct: Math.round(scale * 100) }) : `${zoom} %`;
}
