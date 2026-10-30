/*
 * Infobulles (cycle 21) : logique pure, sans DOM.
 *   parseTip('Annuler (Ctrl+Z)') → { text: 'Annuler', keys: ['Ctrl', 'Z'] }
 *   pickTip({ tip, title, aria, desc, text }) → { text, keys, desc } ou null
 *   placeTip(cible, taille de la bulle, fenêtre) → { left, top, side }
 */
const KEY = /^(Ctrl|Cmd|Maj|Shift|Alt|Option|Échap|Esc|Suppr|Delete|Del|Entrée|Enter|Tab|F\d{1,2}|[A-Z0-9?]|[↑↓←→]|Flèches|Arrows)$/;

export function parseTip(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(.*?)\s*[(（]([^()（）]+)[)）]$/);
  if (m) {
    const keys = m[2].split('+').map(k => k.trim());
    if (keys.length && keys.every(k => KEY.test(k))) return { text: m[1].trim(), keys };
  }
  return { text: s, keys: [] };
}

const MAC = { Ctrl: '⌘', Cmd: '⌘', Maj: '⇧', Shift: '⇧', Alt: '⌥', Option: '⌥', Suppr: '⌫', Delete: '⌫', Del: '⌫' };
export const macKeys = keys => keys.map(k => MAC[k] || k);

export const isIconOnly = text => (String(text || '').match(/\p{L}/gu) || []).length < 3;

const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

export function pickTip({ tip, title, aria, desc = '', text = '' } = {}) {
  const icon = isIconOnly(text);
  const raw = tip || title || (icon ? aria : '');
  if (!raw) return null;
  const p = parseTip(raw);
  if (!p.text) return null;
  /* Un texte d'aide qui répète simplement le bouton n'apporte rien (sauf s'il ajoute une explication ou un raccourci) */
  if (!icon && !desc && !p.keys.length && norm(text).replace(/^[^\p{L}]+/u, '') === norm(p.text)) return null;
  return { text: p.text, keys: p.keys, desc: String(desc || '') };
}

export function placeTip(target, size, view, { gap = 6, margin = 8 } = {}) {
  let left = Math.round(target.x + target.w / 2 - size.w / 2);
  left = Math.max(margin, Math.min(left, view.w - margin - size.w));
  const belowTop = target.y + target.h + gap;
  if (belowTop + size.h <= view.h - margin) return { left, top: belowTop, side: 'below' };
  return { left, top: Math.max(margin, target.y - gap - size.h), side: 'above' };
}
