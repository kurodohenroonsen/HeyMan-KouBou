/* Navigateur : arbre de la page, synchronisé avec la sélection et le survol du canevas. */
import { h } from './dom.js';
import { state, subscribe, root, select, hover, toggleMulti } from './store.js';
import { REGISTRY } from '../core/widgets.js';
import { nodeLabel, nodeSummary } from '../core/editing.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

let container = null;

function rowFor(node, depth) {
  const hasKids = (node.children || []).length > 0;
  const collapsed = state.collapsed.has(node.id);
  const hidden = Object.values(node.advanced?.hideOn || {}).some(Boolean);
  const row = h('div', {
    class: `nav-row nav-row--${node.type}` + (node.id === state.hovered ? ' is-hover' : ''),
    role: 'treeitem', tabindex: node.id === state.selected ? '0' : '-1',
    'data-node-id': node.id, 'data-type': node.type,
    'aria-selected': String(state.multi.size > 1 ? state.multi.has(node.id) : node.id === state.selected),
    'aria-expanded': hasKids ? String(!collapsed) : null,
    'aria-level': String(depth + 1),
    style: { '--depth': String(depth) },
    onclick: e => { if (e.shiftKey) toggleMulti(node.id); else select(node.id, { scroll: true }); },
    onmouseenter: () => hover(node.id),
    onmouseleave: () => hover(null)
  },
  hasKids ? h('button', { type: 'button', class: 'nav-toggle', 'aria-label': collapsed ? __('Déplier') : __('Replier'), onclick: e => {
    e.stopPropagation();
    if (collapsed) state.collapsed.delete(node.id); else state.collapsed.add(node.id);
    log.debug('structure.collapse', collapsed ? __('Déplié : {label}', { label: nodeLabel(node) }) : __('Replié : {label}', { label: nodeLabel(node) }), { id: node.id, type: node.type, collapsed: !collapsed, children: node.children.length, by: 'clic' });
    render();
  } }, collapsed ? '▸' : '▾') : h('span', { class: 'nav-toggle nav-toggle--none' }),
  h('span', { class: 'nav-icon', 'aria-hidden': 'true' }, REGISTRY[node.type]?.icon || '▢'),
  h('span', { class: 'nav-label' }, nodeLabel(node)),
  h('span', { class: 'nav-sum', 'data-site-content': '' }, nodeSummary(node, state.site, state.lang)),
  hidden ? h('span', { class: 'nav-flag', title: __('Masqué sur au moins un appareil') }, '◌') : null);
  return row;
}

function build(node, depth, out) {
  for (const c of node.children || []) {
    out.push(rowFor(c, depth));
    if (!state.collapsed.has(c.id)) build(c, depth + 1, out);
  }
  return out;
}

export function render() {
  if (!container) return;
  const t0 = performance.now();
  const rows = build(root(), 0, []);
  log.trace('structure.render', __('Panneau Structure redessiné'), { rows: rows.length, ms: Math.round(performance.now() - t0) });
  container.replaceChildren(rows.length ? h('div', { class: 'nav-tree', id: 'navTree', role: 'tree', 'aria-label': __('Structure de la page') }, rows)
    : h('p', { class: 'hint' }, __('La page est vide.')));
}

/* Clavier : ↑/↓ parcourent les lignes, ←/→ replient/déplient (ou parent/enfant), Entrée sélectionne */
function onKey(e) {
  const row = e.target.closest?.('.nav-row');
  if (!row || e.altKey || e.ctrlKey || e.metaKey) return;
  const rows = [...container.querySelectorAll('.nav-row')];
  const i = rows.indexOf(row);
  const id = row.dataset.nodeId;
  const focusRow = r => { if (!r) return; rows.forEach(x => x.setAttribute('tabindex', '-1')); r.setAttribute('tabindex', '0'); r.focus(); };
  if (e.key === 'ArrowDown') focusRow(rows[i + 1]);
  else if (e.key === 'ArrowUp') focusRow(rows[i - 1]);
  else if (e.key === 'Home') focusRow(rows[0]);
  else if (e.key === 'End') focusRow(rows[rows.length - 1]);
  else if (e.key === 'ArrowRight') {
    if (row.getAttribute('aria-expanded') === 'false') { state.collapsed.delete(id); log.debug('structure.collapse', __('Déplié (→)'), { id, collapsed: false, by: 'clavier' }); render(); container.querySelector(`[data-node-id="${CSS.escape(id)}"]`)?.focus(); }
    else focusRow(rows[i + 1]?.getAttribute('aria-level') > row.getAttribute('aria-level') ? rows[i + 1] : null);
  } else if (e.key === 'ArrowLeft') {
    if (row.getAttribute('aria-expanded') === 'true') { state.collapsed.add(id); log.debug('structure.collapse', __('Replié (←)'), { id, collapsed: true, by: 'clavier' }); render(); container.querySelector(`[data-node-id="${CSS.escape(id)}"]`)?.focus(); }
    else { const lvl = Number(row.getAttribute('aria-level')); focusRow(rows.slice(0, i).reverse().find(r => Number(r.getAttribute('aria-level')) < lvl)); }
  } else if (e.key === 'Enter' || e.key === ' ') {
    log.debug('structure.key', e.shiftKey ? __('Structure : ajout à la sélection au clavier') : __('Structure : sélection au clavier'), { id, key: e.key === ' ' ? 'Espace' : 'Entrée', shift: e.shiftKey || undefined });
    if (e.shiftKey) toggleMulti(id); else select(id, { scroll: true });
    container.querySelector(`[data-node-id="${CSS.escape(id)}"]`)?.focus();
  } else return;
  if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') log.trace('structure.key', __('Structure : {key}', { key: e.key }), { key: e.key });
  e.preventDefault();
  e.stopPropagation();
}

export function mountNavigator(el) {
  container = el;
  el.removeEventListener('keydown', onKey);
  el.addEventListener('keydown', onKey);
  render();
  log.debug('structure.open', __('Panneau Structure ouvert'), { rows: el.querySelectorAll('.nav-row').length, collapsed: state.collapsed.size || undefined, edit: state.editTarget?.kind });
  const selected = el.querySelector('[aria-selected="true"]');
  selected?.scrollIntoView({ block: 'nearest' });
}

export function unmountNavigator() { container = null; }

export function initNavigator() {
  subscribe(reason => {
    if (!container) return;
    if (reason === 'doc' || reason === 'view') render();
    if (reason === 'selection') {
      render();
      container.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }
    if (reason === 'hover') {
      container.querySelectorAll('.nav-row.is-hover').forEach(r => r.classList.remove('is-hover'));
      if (state.hovered) container.querySelector(`[data-node-id="${CSS.escape(state.hovered)}"]`)?.classList.add('is-hover');
    }
  });
}
