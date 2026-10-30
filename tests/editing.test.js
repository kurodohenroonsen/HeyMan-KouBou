import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, findNode, findParent, createSectionWithColumns } from '../core/tree.js';
import { placeForType, insertAuto, setRowLayout, ROW_LAYOUTS, nodeLabel, nodeSummary } from '../core/editing.js';

function base() {
  let root = createNode('page');
  const sec = createSectionWithColumns(2);
  root = insertNode(root, root.id, sec);
  const row = sec.children[0];
  const [c1, c2] = row.children;
  const h = createNode('heading');
  root = insertNode(root, c1.id, h);
  return { root, sec, row, c1, c2, h };
}

test('placeForType : widget sélectionné → juste après lui', () => {
  const { root, c1, h } = base();
  assert.deepEqual(placeForType(root, h.id, 'text'), { parentId: c1.id, index: 1 });
});

test('placeForType : colonne → à la fin ; rangée/section → première colonne', () => {
  const { root, sec, row, c1, c2 } = base();
  assert.deepEqual(placeForType(root, c2.id, 'text'), { parentId: c2.id, index: 0 });
  assert.deepEqual(placeForType(root, row.id, 'text'), { parentId: c1.id, index: 1 });
  assert.deepEqual(placeForType(root, sec.id, 'text'), { parentId: c1.id, index: 1 });
});

test('placeForType : rien de sélectionné → nouvelle section en fin de page', () => {
  const { root } = base();
  assert.deepEqual(placeForType(root, null, 'text'), { parentId: root.id, index: 1, wrap: true });
});

test('placeForType : une section s’insère après la section courante', () => {
  const { root, h } = base();
  assert.deepEqual(placeForType(root, h.id, 'section'), { parentId: root.id, index: 1 });
  assert.deepEqual(placeForType(root, null, 'section'), { parentId: root.id, index: 1 });
});

test('insertAuto enveloppe un widget dans une nouvelle section si nécessaire et renvoie son id', () => {
  const { root } = base();
  const { root: r, id } = insertAuto(root, null, createNode('button'));
  const { parent } = findParent(r, id);
  assert.equal(parent.type, 'column');
  assert.equal(r.children.length, 2);
});

test('setRowLayout : ajoute des colonnes avec les bonnes largeurs', () => {
  const { root, row } = base();
  const r = setRowLayout(root, row.id, [4, 4, 4]);
  const cols = findNode(r, row.id).children;
  assert.equal(cols.length, 3);
  assert.deepEqual(cols.map(c => c.style.desktop.span), [4, 4, 4]);
});

test('setRowLayout : en réduisant, le contenu des colonnes retirées passe dans la dernière gardée', () => {
  let { root, row, c2 } = base();
  const t = createNode('text');
  root = insertNode(root, c2.id, t);
  const r = setRowLayout(root, row.id, [12]);
  const cols = findNode(r, row.id).children;
  assert.equal(cols.length, 1);
  assert.deepEqual(cols[0].children.map(n => n.type), ['heading', 'text']);
  assert.equal(cols[0].style.desktop.span, 12);
});

test('setRowLayout refuse une disposition qui ne fait pas 12', () => {
  const { root, row } = base();
  assert.throws(() => setRowLayout(root, row.id, [6, 5]), /12/);
  assert.ok(ROW_LAYOUTS.every(l => l.spans.reduce((a, b) => a + b, 0) === 12));
});

test('nodeLabel et nodeSummary décrivent un nœud pour le navigateur', () => {
  const { h } = base();
  assert.equal(nodeLabel(h), 'Titre');
  const site = { defaultLanguage: 'fr', languages: ['fr'] };
  assert.equal(nodeSummary(h, site, 'fr'), 'Votre titre ici');
});
