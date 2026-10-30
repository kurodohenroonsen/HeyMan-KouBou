/*
 * Largeur des panneaux de gauche et de droite (cycle 23) : logique pure, sans DOM.
 * Bornes : un minimum par côté, au plus 640 px, et toujours au moins 420 px pour le canevas.
 */
export const PANEL_DEFAULTS = { left: 290, right: 330 };
export const PANEL_MIN = { left: 220, right: 260 };
export const PANEL_MAX = 640;
export const CANVAS_MIN = 420;
const STEP = 16;
const BIG_STEP = 64;

export const defaultsFor = viewport => (viewport <= 1100 ? { left: 250, right: 300 } : { ...PANEL_DEFAULTS });

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function clampWidths({ left, right } = {}, viewport = 1440) {
  const d = defaultsFor(viewport);
  let l = Math.round(num(left) ?? d.left);
  let r = Math.round(num(right) ?? d.right);
  l = Math.max(PANEL_MIN.left, Math.min(PANEL_MAX, l));
  r = Math.max(PANEL_MIN.right, Math.min(PANEL_MAX, r));
  /* trop large pour la fenêtre : on rend la place au canevas, d'abord en réduisant le plus large */
  let over = l + r + CANVAS_MIN - viewport;
  while (over > 0) {
    const side = l - PANEL_MIN.left >= r - PANEL_MIN.right ? 'l' : 'r';
    const room = side === 'l' ? l - PANEL_MIN.left : r - PANEL_MIN.right;
    if (room <= 0) break;
    const take = Math.min(room, over);
    if (side === 'l') l -= take; else r -= take;
    over -= take;
  }
  return { left: l, right: r };
}

/* Touche sur une poignée : nouvelle largeur (avant bornes), ou null si la touche ne sert pas */
export function keyStep(side, key, shift, width) {
  const step = shift ? BIG_STEP : STEP;
  const wider = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
  const narrower = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
  if (key === wider) return width + step;
  if (key === narrower) return width - step;
  if (key === 'Home') return PANEL_MIN[side];
  if (key === 'End') return PANEL_MAX;
  return null;
}

export function parseSaved(raw) {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    const out = {};
    if (num(o.left) !== null) out.left = o.left;
    if (num(o.right) !== null) out.right = o.right;
    return out;
  } catch { return null; }
}
