/* Menu contextuel (clic droit) dans le canevas et le navigateur. */
import { h } from './dom.js';
import { state, nodeById, select } from './store.js';
import { nodeLabel } from '../core/editing.js';
import { findParent } from '../core/tree.js';
import { root } from './store.js';
import { selectParent, duplicateSelected, deleteSelected, copySelected, pasteClipboard, copyStyle, pasteStyle, moveSelected, moveSelectedTo, createComponentFromSelected, detachSelected, editSelectedComponent } from './actions.js';
import { onCanvasReady, canvasScale } from './canvas.js';
import { editSelected } from './inline.js';
import { log } from './log.js';
import { __, N_ } from '../core/ui-i18n.js';

let menu = null;

/* by : raison de la fermeture (Échap, clic ailleurs…) ; un évènement du navigateur donne son type */
export function closeMenu(by) {
  if (!menu) return;
  const why = typeof by === 'string' ? by : by?.type === 'blur' ? N_('fenêtre quittée') : by?.type === 'resize' ? N_('fenêtre redimensionnée') : by?.type === 'scroll' ? N_('défilement') : N_('fermé');
  if (why !== 'action') log.debug('ctxmenu.close', __('Menu contextuel fermé ({why})', { why: __(why) }), { by: why });
  menu.remove();
  menu = null;
}

function items(node, canvasEl) {
  const { parent, index } = findParent(root(), node.id);
  const last = parent ? index === parent.children.length - 1 : true;
  const editable = !!canvasEl?.closest('[data-node]')?.querySelector('[data-edit]') || false;
  return [
    editable && !node.ref && ['edit', __('Modifier le texte'), __('Double-clic'), editSelected],
    node.ref && ['component-edit', __('Modifier le composant'), __('Double-clic'), editSelectedComponent],
    node.ref && ['component-detach', __('Détacher (copie indépendante)'), '', detachSelected, !!state.editTarget],
    !node.ref && ['component', __('Créer un composant…'), '', createComponentFromSelected, !!state.editTarget],
    ['duplicate', __('Dupliquer'), 'Ctrl+D', duplicateSelected],
    ['copy', __('Copier'), 'Ctrl+C', copySelected],
    ['paste', __('Coller'), 'Ctrl+V', pasteClipboard, !state.clipboard],
    '-',
    ['copyStyle', __('Copier le style'), '', copyStyle],
    ['pasteStyle', __('Coller le style'), '', pasteStyle, !state.styleClipboard],
    '-',
    ['up', __('Monter'), 'Alt+↑', () => moveSelected(-1), !parent || index === 0],
    ['down', __('Descendre'), 'Alt+↓', () => moveSelected(1), last],
    ['moveTo', __('Déplacer vers…'), '', moveSelectedTo, node.type === 'section'],
    ['parent', __('Sélectionner le parent'), __('Échap'), selectParent, !parent || parent.type === 'page'],
    '-',
    ['delete', __('Supprimer'), __('Suppr'), deleteSelected, false, true]
  ].filter(Boolean);
}

export function openMenu(id, x, y, canvasEl) {
  closeMenu(N_('autre menu'));
  const node = nodeById(id);
  if (!node || node.type === 'page') { log.debug('ctxmenu.none', __('Pas de menu contextuel ici (page ou élément introuvable)'), { id, type: node?.type }); return; }
  if (state.selected !== id) select(id);
  menu = h('div', { class: 'ctx-menu', id: 'ctxMenu', role: 'menu', 'aria-label': __('Actions : {label}', { label: nodeLabel(node) }) },
    h('div', { class: 'ctx-title' }, nodeLabel(node)),
    items(node, canvasEl).map(it => it === '-' ? h('hr', {}) : h('button', {
      type: 'button', role: 'menuitem', 'data-ctx': it[0], disabled: !!it[4], class: it[5] ? 'is-danger' : '',
      onclick: () => { log.debug('ctxmenu.action', __('Menu contextuel : {action}', { action: it[1] }), { action: it[0], id: state.selected, type: nodeById(state.selected)?.type }); closeMenu('action'); it[3](); }
    }, h('span', {}, it[1]), it[2] ? h('kbd', {}, it[2]) : null)));
  document.body.append(menu);
  const list = items(node, canvasEl).filter(it => it !== '-');
  log.debug('ctxmenu.open', canvasEl ? __('Menu contextuel : {label} (page)', { label: nodeLabel(node) }) : __('Menu contextuel : {label} (structure)', { label: nodeLabel(node) }), { id, type: node.type, from: canvasEl ? 'canevas' : 'structure', items: list.length, disabled: list.filter(it => it[4]).map(it => it[0]) });
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, innerWidth - r.width - 8)}px`;
  menu.style.top = `${Math.min(y, innerHeight - r.height - 8)}px`;
  menu.querySelector('button:not([disabled])')?.focus();
}

export function initContextMenu() {
  document.addEventListener('pointerdown', e => { if (menu && !e.target.closest('#ctxMenu')) closeMenu(N_('clic ailleurs')); }, true);
  document.addEventListener('keydown', e => {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(N_('Échap')); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const btns = [...menu.querySelectorAll('button:not([disabled])')];
      const i = btns.indexOf(document.activeElement);
      btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length]?.focus();
    }
  }, true);
  window.addEventListener('blur', closeMenu);
  window.addEventListener('resize', closeMenu);
  document.addEventListener('contextmenu', e => {
    const row = e.target.closest('#navTree .nav-row');
    if (!row) return;
    e.preventDefault();
    openMenu(row.dataset.nodeId, e.clientX, e.clientY, null);
  });
  onCanvasReady(doc => {
    doc.addEventListener('contextmenu', e => {
      if (e.target.closest('[contenteditable="true"]')) return;
      const el = e.target.closest('[data-node]');
      if (!el) return;
      e.preventDefault();
      const f = document.getElementById('canvas').getBoundingClientRect();
      const s = canvasScale();
      openMenu(el.getAttribute('data-node'), f.left + e.clientX * s, f.top + e.clientY * s, el);
    });
    doc.addEventListener('pointerdown', () => closeMenu(N_('clic dans la page')));
    doc.defaultView.addEventListener('scroll', closeMenu, { passive: true });
  });
}
