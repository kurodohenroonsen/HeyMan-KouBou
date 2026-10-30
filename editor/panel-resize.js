/*
 * Poignées des panneaux de gauche et de droite (cycle 23) : glisser, clavier (flèches, Maj, Début, Fin),
 * double-clic pour la largeur d'origine ; largeurs retenues sur l'appareil (localStorage['atelier-panels']).
 * Les largeurs sont des variables CSS (--left-w, --right-w) de .workspace ; le canevas se remet à l'échelle tout seul.
 */
import { clampWidths, defaultsFor, keyStep, parseSaved } from '../core/panel-size.js';
import { __ } from '../core/ui-i18n.js';
import { log } from './log.js';

const KEY = 'atelier-panels';
let ws = null;
let widths = null;

const viewport = () => ws?.getBoundingClientRect().width || innerWidth;
const read = () => { try { return parseSaved(localStorage.getItem(KEY)); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(widths)); } catch { /* stockage indisponible : largeur pour cette visite seulement */ } };

function apply(next, { persist = false } = {}) {
  widths = clampWidths(next, viewport());
  ws.style.setProperty('--left-w', `${widths.left}px`);
  ws.style.setProperty('--right-w', `${widths.right}px`);
  for (const side of ['left', 'right']) {
    const h = ws.querySelector(`.resizer--${side}`);
    if (!h) continue;
    h.setAttribute('aria-valuenow', String(widths[side]));
    h.setAttribute('aria-valuetext', __('{n} px', { n: widths[side] }));
  }
  if (persist) save();
  return widths;
}

const resized = (side, from, to) => (side === 'left' ? __('Panneau de gauche : {from} → {to} px', { from, to }) : __('Panneau de droite : {from} → {to} px', { from, to }));

function handle(side) {
  const label = side === 'left' ? __('Largeur du panneau de gauche') : __('Largeur du panneau de droite');
  const h = document.createElement('div');
  h.className = `resizer resizer--${side}`;
  h.setAttribute('role', 'separator');
  h.setAttribute('aria-orientation', 'vertical');
  h.setAttribute('aria-label', label);
  h.setAttribute('aria-valuemin', side === 'left' ? '220' : '260');
  h.setAttribute('aria-valuemax', '640');
  h.tabIndex = 0;
  h.dataset.tip = label;
  h.dataset.tipDesc = __('Glisse pour élargir ou réduire ; double-clic : largeur d’origine ; au clavier : flèches (Maj : plus vite), Début, Fin.');

  let start = null;
  h.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    h.setPointerCapture(e.pointerId);
    start = { x: e.clientX, w: widths[side], from: { ...widths } };
    document.body.classList.add('is-resizing');
  });
  h.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x;
    apply({ ...widths, [side]: start.w + (side === 'left' ? dx : -dx) });
  });
  const end = e => {
    if (!start) return;
    try { h.releasePointerCapture(e.pointerId); } catch { /* déjà relâché */ }
    document.body.classList.remove('is-resizing');
    const from = start.from;
    start = null;
    save();
    if (from[side] !== widths[side]) log.debug('ui.panel-resize', resized(side, from[side], widths[side]), { side, from: from[side], to: widths[side], by: 'souris' });
  };
  h.addEventListener('pointerup', end);
  h.addEventListener('pointercancel', end);
  h.addEventListener('lostpointercapture', end);
  h.addEventListener('dblclick', () => {
    const from = widths[side];
    apply({ ...widths, [side]: defaultsFor(innerWidth)[side] }, { persist: true });
    log.info('ui.panel-reset', side === 'left' ? __('Panneau de gauche : largeur d’origine ({to} px)', { to: widths[side] }) : __('Panneau de droite : largeur d’origine ({to} px)', { to: widths[side] }), { side, from, to: widths[side] });
  });
  h.addEventListener('keydown', e => {
    const next = keyStep(side, e.key, e.shiftKey, widths[side]);
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    const from = widths[side];
    apply({ ...widths, [side]: next }, { persist: true });
    if (from !== widths[side]) log.debug('ui.panel-resize', resized(side, from, widths[side]), { side, from, to: widths[side], by: 'clavier', key: e.key });
  });
  return h;
}

export function initPanelResize() {
  ws = document.querySelector('.workspace');
  if (!ws) return;
  ws.append(handle('left'), handle('right'));
  const saved = read();
  apply({ ...defaultsFor(innerWidth), ...(saved || {}) });
  if (saved) log.debug('ui.panel-restore', __('Largeurs des panneaux retenues : {left} / {right} px', widths), { ...widths });
  /* fenêtre redimensionnée : les largeurs restent dans les bornes (sans écraser le choix enregistré) */
  addEventListener('resize', () => apply({ ...defaultsFor(innerWidth), ...(read() || {}) }));
}

export const panelWidths = () => ({ ...widths });
export const setPanelWidths = (w, opts) => apply({ ...widths, ...w }, opts);
