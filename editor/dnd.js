/*
 * Glisser-déposer : bibliothèque → canevas, déplacement dans le canevas (poignée ✥ ou élément sélectionné),
 * réorganisation dans le navigateur. La logique (où peut-on déposer, à quel index) est dans core/editing.js.
 * La géométrie tient compte de la mise à l'échelle du canevas.
 */
import { $, toast } from './dom.js';
import { state, root, nodeById, commitRoot, select, emit } from './store.js';
import { createNode, createSectionWithColumns, findNode, findParent, pathTo, canContain } from '../core/tree.js';
import { buildTemplate } from '../core/templates.js';
import { makeInstance } from '../core/components.js';
import { dropContainer, dropIndex, applyDrop, isNoopDrop, nodeLabel, dropHint } from '../core/editing.js';
import { canvasDoc, canvasWin, canvasScale, nodeElement, onCanvasReady, schedulePosition } from './canvas.js';
import { log } from './log.js';
import { __, N_ } from '../core/ui-i18n.js';

const THRESHOLD = 5;
let pending = null;   /* { payload, x, y, sourceEl } avant le seuil */
let drag = null;      /* { payload, type, target, flow, reason, sig } pendant le glisser */
let suppressClick = false;
let scrollTimer = 0;

const frameRect = () => $('#canvas').getBoundingClientRect();

/* Coordonnées « éditeur » à partir d'un évènement venant de l'éditeur ou du canevas */
function toEditor(e, fromCanvas) {
  if (!fromCanvas) return { x: e.clientX, y: e.clientY };
  const r = frameRect();
  const s = canvasScale();
  return { x: r.left + e.clientX * s, y: r.top + e.clientY * s };
}

function payloadType(p) {
  if (p.kind === 'widget') return p.type;
  if (p.kind === 'section' || p.kind === 'template') return 'section';
  if (p.kind === 'component') return state.site.components?.[p.id]?.node.type;
  return nodeById(p.id)?.type;
}

/* ---------- Démarrage ---------- */
export function startLibraryDrag(e, payload) {
  if (e.button !== 0) return;
  arm(e, payload, false, e.currentTarget);
}

function arm(e, payload, fromCanvas, sourceEl) {
  const p = toEditor(e, fromCanvas);
  pending = { payload, x: p.x, y: p.y, sourceEl };
}

const FROM = { widget: 'bibliothèque', section: 'bibliothèque (structure)', template: 'modèles', component: 'composants', move: 'page ou structure' };

function begin(point) {
  const { payload } = pending;
  pending = null;
  const type = payloadType(payload);
  if (!type) { log.warn('dnd.unknown', __('Glisser impossible : élément ou composant introuvable (supprimé entre-temps ?)'), { kind: payload.kind, id: payload.id }); return; }
  const f = log.flow('dnd', __('Glisser : {label}', { label: payload.label || nodeLabel(nodeById(payload.id) || { type }) }), { kind: payload.kind, type, id: payload.id, from: FROM[payload.kind] || payload.kind });
  drag = { payload, type, target: null, flow: f, reason: 'outside', sig: '' };
  state.dragging = true;
  document.body.classList.add('is-dragging');
  canvasDoc()?.documentElement.classList.add('atelier-dragging');
  try { canvasWin()?.getSelection()?.removeAllRanges(); getSelection()?.removeAllRanges(); } catch { /* rien */ }
  const ghost = $('#dragGhost');
  ghost.textContent = payload.label || nodeLabel(nodeById(payload.id) || { type });
  ghost.hidden = false;
  emit('hover');
  move(point);
}

/* ---------- Pendant le glisser ---------- */
function onMove(e, fromCanvas) {
  if (!pending && !drag) return;
  const p = toEditor(e, fromCanvas);
  if (pending) {
    if (Math.hypot(p.x - pending.x, p.y - pending.y) < THRESHOLD) return;
    begin(p);
    return;
  }
  e.preventDefault?.();
  move(p);
}

function move(p) {
  const ghost = $('#dragGhost');
  ghost.style.left = `${p.x}px`;
  ghost.style.top = `${p.y}px`;
  drag.point = p;
  const r = frameRect();
  const inCanvas = p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  const navEl = !inCanvas ? document.elementsFromPoint(p.x, p.y).find(el => el.closest?.('#navTree')) : null;
  drag.target = inCanvas ? canvasTarget(p, r) : navEl ? navTarget(p, navEl.closest('.nav-row')) : null;
  if (!drag.target) drag.reason = inCanvas || navEl ? 'forbidden' : 'outside';
  /* Fantôme barré : aucun emplacement possible ici (cycle 26) */
  ghost.classList.toggle('is-forbidden', !drag.target && drag.reason === 'forbidden');
  const t = drag.target;
  const sig = t ? `${t.where}|${t.parentId}|${t.index}|${!!t.noop}` : drag.reason;
  if (sig !== drag.sig) {
    /* Change à chaque passage sur un nouvel emplacement : trace */
    drag.sig = sig;
    log.trace('dnd.target', t ? (t.noop ? __('Cible : {label}, position {index} (même place)', { label: nodeLabel(findNode(root(), t.parentId) || { type: '?' }), index: t.index }) : __('Cible : {label}, position {index}', { label: nodeLabel(findNode(root(), t.parentId) || { type: '?' }), index: t.index })) : drag.reason === 'forbidden' ? __('Aucun emplacement possible ici pour « {type} »', { type: drag.type }) : __('Hors du canevas et de la structure'), { where: t?.where, parentId: t?.parentId, index: t?.index, noop: t?.noop || undefined, reason: t ? undefined : drag.reason });
  }
  autoScroll(inCanvas ? (p.y - r.top) / r.height : null);
  showIndicators();
}

function canvasTarget(p, r) {
  const doc = canvasDoc();
  if (!doc) return null;
  const s = canvasScale();
  const cx = (p.x - r.left) / s;
  const cy = (p.y - r.top) / s;
  const hit = doc.elementsFromPoint(cx, cy).find(el => !el.closest('#atelier-ui'));
  if (!hit) return null;
  const rt = root();
  let chain = [];
  const nodeEl = hit.closest('[data-node]');
  if (nodeEl) chain = pathTo(rt, nodeEl.getAttribute('data-node')).slice().reverse();
  else if (hit.closest('main')) chain = [rt.id];
  if (!chain.length) return null;
  const dragId = drag.payload.kind === 'move' ? drag.payload.id : null;
  const parentId = dropContainer(rt, chain, drag.type, dragId);
  if (!parentId) return null;
  const parent = findNode(rt, parentId);
  const kids = (parent.children || []).map(k => nodeElement(k.id)).filter(Boolean);
  const rects = kids.map(k => k.getBoundingClientRect());
  const horizontal = parent.type === 'row' && rects.length > 1 && Math.abs(rects[0].top - rects[1].top) < 4;
  const mids = rects.map(b => (horizontal ? b.left + b.width / 2 : b.top + b.height / 2));
  const index = dropIndex(mids, horizontal ? cx : cy);
  const containerEl = parent.type === 'page' ? doc.querySelector('main') : nodeElement(parentId);
  if (isNoopDrop(rt, drag.payload, parentId, index)) return { where: 'canvas', parentId, index, noop: true, rects, horizontal, containerEl };
  return { where: 'canvas', parentId, index, rects, horizontal, containerEl };
}

function navTarget(p, row) {
  if (!row) return null;
  const rt = root();
  const id = row.dataset.nodeId;
  const over = findNode(rt, id);
  const b = row.getBoundingClientRect();
  const f = (p.y - b.top) / b.height;
  const dragId = drag.payload.kind === 'move' ? drag.payload.id : null;
  const ok = (parentId) => parentId && canContain(rt, parentId, drag.type) && !(dragId && pathTo(rt, parentId).includes(dragId));
  const { parent, index } = findParent(rt, id);
  let t = null;
  if (f > 0.3 && f < 0.7 && ok(id)) t = { parentId: id, index: (over.children || []).length, into: true };
  else if (parent && ok(parent.id)) t = { parentId: parent.id, index: f <= 0.5 ? index : index + 1 };
  else if (ok(id)) t = { parentId: id, index: f <= 0.5 ? 0 : (over.children || []).length, into: true };
  if (!t) return null;
  return { where: 'nav', ...t, row, rowRect: b, before: f <= 0.5, noop: isNoopDrop(rt, drag.payload, t.parentId, t.index) };
}

let scrollDir = 0;
function autoScroll(fy) {
  clearInterval(scrollTimer);
  if (fy === null || (fy > 0.08 && fy < 0.92)) { scrollDir = 0; return; }
  const dir = fy <= 0.08 ? -1 : 1;
  if (dir !== scrollDir) { scrollDir = dir; log.trace('dnd.autoscroll', dir < 0 ? __('Défilement automatique vers le haut') : __('Défilement automatique vers le bas'), { dir }); }
  scrollTimer = setInterval(() => { canvasWin()?.scrollBy(0, dir * 18); if (drag?.point) move(drag.point); }, 40);
}

function showIndicators() {
  const doc = canvasDoc();
  const line = doc?.getElementById('atelier-drop');
  const nav = navDrop();
  const t = drag?.target;
  if (line) line.style.display = 'none';
  nav.hidden = true;
  if (!t || t.noop) return;
  if (t.where === 'canvas' && line) {
    line.className = '';
    const { rects, index, horizontal, containerEl } = t;
    if (!rects.length) {
      const b = containerEl.getBoundingClientRect();
      line.classList.add('is-into');
      Object.assign(line.style, { display: 'block', left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${Math.max(b.height, 24)}px` });
    } else if (horizontal) {
      const x = index < rects.length ? rects[index].left - 6 : rects.at(-1).right + 2;
      const ref = rects[Math.min(index, rects.length - 1)];
      Object.assign(line.style, { display: 'block', left: `${x}px`, top: `${ref.top}px`, width: '4px', height: `${ref.height}px` });
    } else {
      const ref = rects[Math.min(index, rects.length - 1)];
      const y = index < rects.length ? rects[index].top - 3 : rects.at(-1).bottom - 1;
      Object.assign(line.style, { display: 'block', left: `${ref.left}px`, top: `${y}px`, width: `${ref.width}px`, height: '4px' });
    }
  }
  if (t.where === 'nav') {
    const b = t.rowRect;
    nav.hidden = false;
    nav.classList.toggle('is-into', !!t.into);
    Object.assign(nav.style, t.into
      ? { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` }
      : { left: `${b.left + 16}px`, top: `${(t.before ? b.top : b.bottom) - 2}px`, width: `${b.width - 16}px`, height: '3px' });
  }
}

function navDrop() {
  let el = document.getElementById('navDrop');
  if (!el) {
    el = document.createElement('div');
    el.id = 'navDrop';
    el.className = 'nav-drop';
    el.hidden = true;
    document.body.append(el);
  }
  return el;
}

/* ---------- Fin ---------- */
function onUp() {
  if (pending) { pending = null; return; }
  if (!drag) return;
  const { payload, target, flow: f, reason, type } = drag;
  cleanup();
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  if (!target) {
    if (reason === 'forbidden') {
      f.warn('refused', __('Dépôt refusé : « {type} » ne peut pas aller à cet endroit (une section va dans la page, un widget dans une colonne, et rien dans son propre contenu)', { type }), { type, reason });
      f.cancel(__('Rien n’a changé'), { reason });
      toast(__('Impossible de déposer ici. {hint}', { hint: dropHint(type) }), 'warn');
    } else f.cancel(__('Lâché hors du canevas et de la structure : rien n’a changé'), { reason });
    return;
  }
  if (target.noop) { f.cancel(__('Lâché à la même place : rien n’a changé'), { reason: 'noop', where: target.where }); return; }
  try {
    const lang = state.site.defaultLanguage;
    const node = payload.kind === 'widget' ? createNode(payload.type, { lang }) : payload.kind === 'section' ? createSectionWithColumns(payload.spans.length, payload.spans) : payload.kind === 'template' ? buildTemplate(payload.id, { lang }) : payload.kind === 'component' ? makeInstance(state.site, payload.id) : null;
    const r = applyDrop(root(), node ? { kind: 'new', node } : { kind: 'move', id: payload.id }, target.parentId, target.index);
    if (!r) {
      f.warn('refused', __('Dépôt refusé par la structure de la page (emplacement interdit pour ce type)'), { type, parentId: target.parentId, index: target.index, reason: 'invalid' });
      f.cancel(__('Rien n’a changé'), { reason: 'invalid' });
      toast(__('Impossible de déposer ici. {hint}', { hint: dropHint(type) }), 'warn');
      return;
    }
    commitRoot(r.root, { source: 'dnd' });
    select(r.id);
    const parent = findNode(root(), target.parentId);
    if (state.readOnly) { f.cancel(__('Dépôt refusé : mode relecture (voir store.readonly)'), { reason: 'readonly' }); return; }
    const pp = { label: parent ? nodeLabel(parent) : '', index: target.index + 1 };
    const data = { id: r.id, type, kind: node ? 'new' : 'move', parentId: target.parentId, parentType: parent?.type, index: target.index, where: target.where === 'nav' ? 'structure' : 'canevas', wrapped: r.wrapped || undefined };
    if (r.wrapped) f.ok(node ? __('Ajouté dans une nouvelle section, position {index}', pp) : __('Déplacé dans une nouvelle section, position {index}', pp), data);
    else f.ok(parent ? (node ? __('Ajouté dans {label}, position {index}', pp) : __('Déplacé dans {label}, position {index}', pp)) : (node ? __('Ajouté dans la page, position {index}', pp) : __('Déplacé dans la page, position {index}', pp)), data);
  } catch (err) { f.fail(err, { type, parentId: target.parentId, index: target.index }, __('Dépôt impossible : {error}', { error: err.message })); toast(err.message, 'error'); }
}

export function cancelDrag(by = N_('Échap')) {
  if (!drag && !pending) return false;
  pending = null;
  if (drag) { const f = drag.flow; cleanup(); f.cancel(__('Glisser annulé ({by})', { by: __(by) }), { by }); }
  return true;
}

function cleanup() {
  clearInterval(scrollTimer);
  drag = null;
  state.dragging = false;
  document.body.classList.remove('is-dragging');
  canvasDoc()?.documentElement.classList.remove('atelier-dragging');
  $('#dragGhost').hidden = true;
  $('#dragGhost').classList.remove('is-forbidden');
  const line = canvasDoc()?.getElementById('atelier-drop');
  if (line) line.style.display = 'none';
  navDrop().hidden = true;
  schedulePosition();
}

/* ---------- Branchements ---------- */
function bindCanvas(doc) {
  doc.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    const handle = e.target.closest('#selToolbar [data-act="move"]');
    if (handle && state.selected) { e.preventDefault(); arm(e, { kind: 'move', id: state.selected }, true); return; }
    if (e.target.closest('#atelier-ui')) return;
    const el = e.target.closest('[data-node]');
    if (el && el.getAttribute('data-node') === state.selected && nodeById(state.selected)?.type !== 'page') arm(e, { kind: 'move', id: state.selected }, true);
  });
  doc.addEventListener('pointermove', e => onMove(e, true));
  doc.addEventListener('pointerup', onUp);
  /* Sur la fenêtre du canevas (capture) : passe avant le clic de sélection du canevas, posé sur le document */
  doc.defaultView.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  doc.addEventListener('dragstart', e => e.preventDefault());
}

export function initDnd() {
  window.addEventListener('pointermove', e => onMove(e, false));
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', () => cancelDrag(N_('interrompu par le navigateur')));
  window.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && cancelDrag()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const row = e.target.closest('#navTree .nav-row');
    if (!row || e.target.closest('.nav-toggle')) return;
    arm(e, { kind: 'move', id: row.dataset.nodeId }, false, row);
  });
  onCanvasReady(bindCanvas);
}
