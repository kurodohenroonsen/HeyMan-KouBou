import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, findNode, findParent, createSectionWithColumns, pathTo } from '../core/tree.js';
import { dropContainer, dropIndex, applyDrop, moveSibling, isNoopDrop } from '../core/editing.js';

function base() {
  let root = createNode('page');
  const sec = createSectionWithColumns(2);
  root = insertNode(root, root.id, sec);
  const sec2 = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec2);
  const row = sec.children[0];
  const [c1, c2] = row.children;
  const h = createNode('heading');
  const t = createNode('text');
  const b = createNode('button');
  root = insertNode(root, c1.id, h);
  root = insertNode(root, c1.id, t);
  root = insertNode(root, c1.id, b);
  return { root, sec, sec2, row, c1, c2, h, t, b };
}

const chain = (root, id) => pathTo(root, id).slice().reverse();

test('dropContainer : un widget survolant un autre widget va dans sa colonne', () => {
  const { root, c1, t } = base();
  assert.equal(dropContainer(root, chain(root, t.id), 'button'), c1.id);
});

test('dropContainer : une section survolant un widget remonte jusqu’à la page', () => {
  const { root, t } = base();
  assert.equal(dropContainer(root, chain(root, t.id), 'section'), root.id);
});

test('dropContainer : une colonne ne se dépose que dans une rangée', () => {
  const { root, row, h } = base();
  assert.equal(dropContainer(root, chain(root, h.id), 'column'), row.id);
});

test('dropContainer : un élément ne peut pas être déposé en lui-même ni dans ses descendants', () => {
  const { root, sec, sec2, h } = base();
  assert.equal(dropContainer(root, chain(root, h.id), 'section', sec.id), root.id);
  assert.equal(dropContainer(root, chain(root, h.id), 'row', sec.children[0].id), sec.id);
  assert.equal(dropContainer(root, chain(root, sec2.id), 'section', sec2.id), root.id);
});

test('dropContainer : rien d’acceptable → null', () => {
  const { root } = base();
  assert.equal(dropContainer(root, [], 'button'), null);
});

test('dropIndex : position selon les milieux des enfants', () => {
  assert.equal(dropIndex([100, 200, 300], 50), 0);
  assert.equal(dropIndex([100, 200, 300], 150), 1);
  assert.equal(dropIndex([100, 200, 300], 250), 2);
  assert.equal(dropIndex([100, 200, 300], 999), 3);
  assert.equal(dropIndex([], 10), 0);
});

test('applyDrop : nouveau widget inséré à l’index voulu et id renvoyé', () => {
  const { root, c2 } = base();
  const node = createNode('image');
  const r = applyDrop(root, { kind: 'new', node }, c2.id, 0);
  assert.equal(r.id, node.id);
  assert.equal(findNode(r.root, c2.id).children[0].type, 'image');
});

test('applyDrop : déplacement vers une autre colonne', () => {
  const { root, c2, b } = base();
  const r = applyDrop(root, { kind: 'move', id: b.id }, c2.id, 0);
  assert.equal(findParent(r.root, b.id).parent.id, c2.id);
  assert.equal(r.id, b.id);
});

test('applyDrop : réordonner dans la même colonne (vers le haut et vers le bas)', () => {
  const { root, c1, h, t, b } = base();
  let r = applyDrop(root, { kind: 'move', id: b.id }, c1.id, 0);
  assert.deepEqual(findNode(r.root, c1.id).children.map(n => n.id), [b.id, h.id, t.id]);
  r = applyDrop(root, { kind: 'move', id: h.id }, c1.id, 3);
  assert.deepEqual(findNode(r.root, c1.id).children.map(n => n.id), [t.id, b.id, h.id]);
});

test('isNoopDrop : déposer un élément juste avant ou juste après lui-même ne change rien', () => {
  const { root, c1, t } = base();
  assert.equal(isNoopDrop(root, { kind: 'move', id: t.id }, c1.id, 1), true);
  assert.equal(isNoopDrop(root, { kind: 'move', id: t.id }, c1.id, 2), true);
  assert.equal(isNoopDrop(root, { kind: 'move', id: t.id }, c1.id, 0), false);
  assert.equal(applyDrop(root, { kind: 'move', id: t.id }, c1.id, 2), null);
});

test('applyDrop : dépôt interdit → exception explicite', () => {
  const { root, c1 } = base();
  assert.throws(() => applyDrop(root, { kind: 'new', node: createNode('section') }, c1.id, 0), /autorisé/);
});

test('moveSibling : monte et descend, bloque aux extrémités', () => {
  const { root, c1, h, t, b } = base();
  const up = moveSibling(root, b.id, -1);
  assert.deepEqual(findNode(up, c1.id).children.map(n => n.id), [h.id, b.id, t.id]);
  const down = moveSibling(root, h.id, 1);
  assert.deepEqual(findNode(down, c1.id).children.map(n => n.id), [t.id, h.id, b.id]);
  assert.equal(moveSibling(root, h.id, -1), null);
  assert.equal(moveSibling(root, b.id, 1), null);
});
