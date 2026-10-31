/*
 * Barre du haut et barre du canevas (cycle 30) : icônes SVG montées dans les [data-icon] de index.html,
 * zoom de la page (ajuster / 100 / 75 / 50 %, Ctrl+0 / Ctrl+= / Ctrl+-), repli des deux panneaux (bouton, Ctrl+Maj+F)
 * et case « Mode expert » du menu Fichier.
 */
import { $, h, icon } from './dom.js';
import { uiIcon } from '../core/icons.js';
import { subscribe } from './store.js';
import { zoomLevel, setZoom, zoomStep, canvasScale, fitFrame } from './canvas.js';
import { zoomText, ZOOM_LEVELS } from '../core/canvas-fit.js';
import { isExpert, setExpert } from './mode.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

let collapsed = false;
export const panelsCollapsed = () => collapsed;

/* Remplit chaque <span data-icon="nom"> par son icône SVG (contenu statique de core/icons.js) */
export function mountIcons(root = document) {
  let n = 0;
  for (const el of root.querySelectorAll('[data-icon]')) {
    if (el.querySelector('svg')) continue;
    el.innerHTML = uiIcon(el.dataset.icon, Number(el.dataset.size) || 18);
    n++;
  }
  return n;
}

export function togglePanels(by = 'bouton', force) {
  collapsed = typeof force === 'boolean' ? force : !collapsed;
  document.body.classList.toggle('panels-collapsed', collapsed);
  const b = $('#panelsBtn');
  if (b) {
    b.setAttribute('aria-pressed', String(collapsed));
    b.dataset.tip = collapsed ? __('Afficher les panneaux (Ctrl+Maj+F)') : __('Replier les panneaux (Ctrl+Maj+F)');
    b.setAttribute('aria-label', b.dataset.tip);
  }
  log.info('ui.panels', collapsed ? __('Panneaux repliés : la page prend toute la largeur') : __('Panneaux affichés'), { collapsed, by });
  fitFrame();
  return collapsed;
}

/* Raccourcis de la barre, valables aussi dans le canevas (appelé par handleKey) */
export function topbarKey(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || e.altKey) return false;
  if (e.key === '0' && !e.shiftKey) { e.preventDefault(); setZoom('fit', 'clavier'); return true; }
  if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomStep(1, 'clavier'); return true; }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomStep(-1, 'clavier'); return true; }
  if (e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); togglePanels('clavier'); return true; }
  return false;
}

function stageBar() {
  const fitOpt = h('option', { value: 'fit' }, __('Ajuster'));
  const sel = h('select', { class: 'control', id: 'zoomSelect', 'aria-label': __('Zoom de la page'), title: __('Zoom de la page : ajuster à la fenêtre (Ctrl+0), 100 %, 75 %, 50 %') },
    fitOpt, [...ZOOM_LEVELS].reverse().map(z => h('option', { value: String(z) }, `${z} %`)));
  sel.addEventListener('change', () => setZoom(sel.value === 'fit' ? 'fit' : Number(sel.value), 'liste'));
  const btn = (id, ico, title, fn, extra = {}) => h('button', { type: 'button', class: 'icon-btn', id, title, 'aria-label': title, onclick: fn, ...extra }, icon(ico, 16));
  const bar = h('div', { class: 'stage-bar', id: 'stageBar', role: 'toolbar', 'aria-label': __('Zoom et panneaux') },
    btn('zoomOutBtn', 'zoom-out', __('Zoom arrière (Ctrl+-)'), () => zoomStep(-1, 'bouton')),
    sel,
    btn('zoomInBtn', 'zoom-in', __('Zoom avant (Ctrl+=)'), () => zoomStep(1, 'bouton')),
    btn('panelsBtn', 'panels', __('Replier les panneaux (Ctrl+Maj+F)'), () => togglePanels('bouton'), { 'aria-pressed': 'false' }));
  $('#stage').append(bar);
  const sync = () => {
    const z = zoomLevel();
    sel.value = String(z);
    fitOpt.textContent = z === 'fit' ? zoomText('fit', canvasScale()) : __('Ajuster');
    $('#zoomOutBtn').disabled = Math.round(canvasScale() * 100) <= ZOOM_LEVELS[0];
    $('#zoomInBtn').disabled = Math.round(canvasScale() * 100) >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  };
  subscribe(reason => { if (reason === 'zoom' || reason === 'view') sync(); });
  sync();
}

function menuExpert() {
  const panel = $('#fileMenu .menu__panel');
  if (!panel) return;
  const cb = h('input', { type: 'checkbox', id: 'expertToggle', checked: isExpert() });
  cb.addEventListener('change', () => setExpert(cb.checked, 'menu'));
  const label = h('label', { class: 'menu__check', for: 'expertToggle' }, cb, __('Mode expert (tous les réglages)'));
  const lang = panel.querySelector('.menu__lang');
  if (lang) panel.insertBefore(label, lang); else panel.append(label);
  subscribe(reason => { if (reason === 'mode') cb.checked = isExpert(); });
}

export function initTopbar() {
  const n = mountIcons(document);
  log.debug('ui.icons', __('Icônes de l’interface montées : {n}', { n }), { n });
  stageBar();
  menuExpert();
}
