/* Opérations d'édition de plus haut niveau, utilisées par l'interface (et testées dans Node). */
import { REGISTRY, isWidget } from './widgets.js';
import { createNode, createSectionWithColumns, findNode, findParent, insertNode, moveNode, canContain, pathTo, removeNode, duplicateNode, setStyle } from './tree.js';
import { richToText } from './sanitize.js';
import { __, __n, N_ } from './ui-i18n.js';

/* Libellés en français (N_) : traduits à l'affichage par l'inspecteur */
export const ROW_LAYOUTS = [
  { id: '12', label: N_('1 colonne'), spans: [12] },
  { id: '6-6', label: N_('2 colonnes égales'), spans: [6, 6] },
  { id: '4-4-4', label: N_('3 colonnes'), spans: [4, 4, 4] },
  { id: '3-3-3-3', label: N_('4 colonnes'), spans: [3, 3, 3, 3] },
  { id: '8-4', label: '2/3 + 1/3', spans: [8, 4] },
  { id: '4-8', label: '1/3 + 2/3', spans: [4, 8] },
  { id: '3-9', label: '1/4 + 3/4', spans: [3, 9] },
  { id: '9-3', label: '3/4 + 1/4', spans: [9, 3] },
  { id: '3-6-3', label: '1/4 + 1/2 + 1/4', spans: [3, 6, 3] }
];

function ancestorOfType(root, id, type) {
  const path = pathTo(root, id);
  for (let i = path.length - 1; i >= 0; i--) {
    const n = findNode(root, path[i]);
    if (n?.type === type) return n;
  }
  return null;
}

function firstColumn(node) {
  if (node.type === 'column') return node;
  for (const c of node.children || []) {
    const f = firstColumn(c);
    if (f) return f;
  }
  return null;
}

/**
 * Où placer un nouvel élément de ce type, selon la sélection courante.
 * Renvoie { parentId, index, wrap? } ; wrap = il faut l'envelopper dans une nouvelle section.
 */
export function placeForType(root, selectedId, type) {
  const sel = selectedId ? findNode(root, selectedId) : null;
  const topIndexAfter = () => {
    const sec = sel ? ancestorOfType(root, sel.id, 'section') : null;
    if (!sec) return root.children.length;
    return root.children.findIndex(c => c.id === sec.id) + 1;
  };
  if (type === 'section') return { parentId: root.id, index: topIndexAfter() };
  if (!isWidget(type)) return null;
  if (!sel || sel.type === 'page') return { parentId: root.id, index: root.children.length, wrap: true };
  if (isWidget(sel.type)) {
    const { parent, index } = findParent(root, sel.id);
    return { parentId: parent.id, index: index + 1 };
  }
  if (sel.type === 'column') return { parentId: sel.id, index: sel.children.length };
  const col = firstColumn(sel);
  if (col) return { parentId: col.id, index: col.children.length };
  return { parentId: root.id, index: topIndexAfter(), wrap: true };
}

/** Insère un nœud au meilleur endroit. Renvoie { root, id } (id du nœud inséré). */
export function insertAuto(root, selectedId, node) {
  const place = placeForType(root, selectedId, node.type);
  if (!place) throw new Error(__('Impossible d’insérer cet élément ici.'));
  if (place.wrap) {
    const sec = createSectionWithColumns(1);
    sec.children[0].children[0].children.push(node);
    return { root: insertNode(root, place.parentId, sec, place.index), id: node.id };
  }
  return { root: insertNode(root, place.parentId, node, place.index), id: node.id };
}

/** Change la disposition d'une rangée sans perdre de contenu. */
export function setRowLayout(root, rowId, spans) {
  if (!Array.isArray(spans) || !spans.length || spans.reduce((a, b) => a + b, 0) !== 12 || spans.some(s => !Number.isInteger(s) || s < 1)) {
    throw new Error(__('Les largeurs de colonnes doivent faire 12 au total.'));
  }
  const r = structuredClone(root);
  const row = findNode(r, rowId);
  if (row?.type !== 'row') throw new Error(__('Rangée introuvable.'));
  const cols = row.children;
  while (cols.length < spans.length) cols.push(createNode('column'));
  if (cols.length > spans.length) {
    const removed = cols.splice(spans.length);
    const last = cols[cols.length - 1];
    for (const c of removed) last.children.push(...c.children);
  }
  cols.forEach((c, i) => { c.style.desktop.span = spans[i]; });
  return r;
}

export function nodeLabel(node) {
  const l = REGISTRY[node.type]?.label;
  return l ? __(l) : node.type;
}

export function nodeSummary(node, site, lang) {
  const p = node.props || {};
  const pick = v => {
    if (!v) return '';
    if (typeof v === 'object') return v[lang] || v[site.defaultLanguage] || '';
    return String(v);
  };
  const raw = pick(p.text) || pick(p.label) || pick(p.title) || pick(p.content) || pick(p.quote) || pick(p.caption) || pick(p.alt);
  const text = richToText(raw);
  if (text) return text.length > 48 ? text.slice(0, 47) + '…' : text;
  if (node.type === 'row') return __n(node.children.length, '{n} colonne', '{n} colonnes');
  if (node.type === 'column') return `${node.style?.desktop?.span || 12}/12`;
  if (node.type === 'section') return node.advanced?.anchor ? `#${node.advanced.anchor}` : '';
  return '';
}

/* ---------- Glisser-déposer (logique pure, la géométrie reste dans l'éditeur) ---------- */

/**
 * chain : identifiants du plus profond (sous le pointeur) jusqu'à la page.
 * Renvoie le premier conteneur qui accepte dragType, en ignorant l'élément déplacé et ses descendants.
 */
export function dropContainer(root, chain, dragType, dragId = null) {
  for (const id of chain) {
    if (dragId && pathTo(root, id).includes(dragId)) continue;
    if (canContain(root, id, dragType)) {
      if (dragType === 'row' && dragId && rowNestingTooDeep(root, id, dragId)) continue;
      return id;
    }
  }
  return null;
}

function rowNestingTooDeep(root, parentId, rowId) {
  const rowsAbove = pathTo(root, parentId).filter(id => findNode(root, id)?.type === 'row').length;
  let inner = false;
  const visit = n => { for (const c of n.children || []) { if (c.type === 'row') inner = true; visit(c); } };
  visit(findNode(root, rowId));
  return rowsAbove >= 1 && inner;
}

/** mids : milieux des enfants sur l'axe utile ; coord : position du pointeur. */
export function dropIndex(mids, coord) {
  let i = 0;
  while (i < mids.length && coord > mids[i]) i++;
  return i;
}

export function isNoopDrop(root, drag, parentId, index) {
  if (drag.kind !== 'move') return false;
  const { parent, index: from } = findParent(root, drag.id);
  return !!parent && parent.id === parentId && (index === from || index === from + 1);
}

/** drag : { kind: 'new', node } ou { kind: 'move', id }. Renvoie { root, id } ou null si rien ne change. */
export function applyDrop(root, drag, parentId, index) {
  if (isNoopDrop(root, drag, parentId, index)) return null;
  if (drag.kind === 'new') return { root: insertNode(root, parentId, drag.node, index), id: drag.node.id };
  return { root: moveNode(root, drag.id, parentId, index), id: drag.id };
}

/** Monte (-1) ou descend (+1) un élément parmi ses frères ; null aux extrémités. */
export function moveSibling(root, id, delta) {
  const { parent, index } = findParent(root, id);
  if (!parent) return null;
  const to = index + delta;
  if (to < 0 || to >= parent.children.length) return null;
  return moveNode(root, id, parent.id, delta > 0 ? to + 1 : to);
}

/* ---------- Sélection multiple ---------- */

/* Garde les éléments dont aucun ancêtre n'est aussi sélectionné, dans l'ordre du document */
export function topLevel(root, ids) {
  const set = new Set(ids);
  const out = [];
  const visit = (n, covered) => {
    const mine = set.has(n.id) && !covered;
    if (mine) out.push(n.id);
    for (const c of n.children || []) visit(c, covered || mine);
  };
  visit(root, false);
  return out;
}

export function removeMany(root, ids) {
  let r = root;
  for (const id of topLevel(root, ids)) if (id !== root.id) r = removeNode(r, id);
  return r;
}

export function duplicateMany(root, ids) {
  let r = root;
  const out = [];
  for (const id of topLevel(root, ids)) {
    const d = duplicateNode(r, id);
    r = d.root;
    out.push(d.newId);
  }
  return { root: r, ids: out };
}

export function setStyleMany(root, ids, state, key, value) {
  let r = root;
  for (const id of ids) r = setStyle(r, id, state, key, value);
  return r;
}

/* ---------- Navigation au clavier ---------- */
export function neighbor(root, id, dir) {
  if (!id) return root.children?.[0]?.id || null;
  const { parent, index } = findParent(root, id);
  if (dir === 'parent') return parent && parent.id !== root.id ? parent.id : null;
  if (dir === 'child') return findNode(root, id)?.children?.[0]?.id || null;
  if (!parent) return null;
  const j = index + (dir === 'prev' ? -1 : 1);
  return parent.children[j]?.id || null;
}
