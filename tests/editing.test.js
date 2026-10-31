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

/* Cycle 26 (X4) : dépôt d'un widget sur la page elle-même → enveloppe section + rangée + colonne, comme le clic */
import { dropContainer, applyDrop, dropHint } from '../core/editing.js';

test('dropContainer : un widget lâché sur la page (aucune colonne sous le pointeur) → la page elle-même', () => {
  const root = createNode('page');
  assert.equal(dropContainer(root, [root.id], 'heading'), root.id);
  assert.equal(dropContainer(root, [root.id], 'section'), root.id);
  assert.equal(dropContainer(root, [root.id], 'row'), null, 'une rangée ne va pas directement dans la page');
  assert.equal(dropContainer(root, [root.id], 'column'), null);
});

test('dropContainer : sous le pointeur, une colonne garde la priorité sur la page', () => {
  const { root, c1 } = base();
  assert.equal(dropContainer(root, [c1.id, root.id], 'heading'), c1.id);
});

test('applyDrop : nouveau widget sur la page vide → section > rangée > colonne > widget, à l’index demandé', () => {
  const root = createNode('page');
  const node = createNode('heading');
  const r = applyDrop(root, { kind: 'new', node }, root.id, 0);
  assert.equal(r.id, node.id);
  assert.equal(r.root.children.length, 1);
  const sec = r.root.children[0];
  assert.equal(sec.type, 'section');
  assert.equal(sec.children[0].type, 'row');
  assert.equal(sec.children[0].children[0].type, 'column');
  assert.equal(sec.children[0].children[0].children[0].id, node.id);
  assert.equal(r.wrapped, true);
});

test('applyDrop : widget déposé entre deux sections → nouvelle section à cette position', () => {
  const { root } = base();
  const sec2 = createSectionWithColumns(1);
  const r0 = insertNode(root, root.id, sec2);
  const node = createNode('text');
  const r = applyDrop(r0, { kind: 'new', node }, r0.id, 1);
  assert.equal(r.root.children.length, 3);
  assert.equal(r.root.children[1].children[0].children[0].children[0].id, node.id);
  assert.deepEqual(findParent(r.root, node.id).parent.type, 'column');
});

test('applyDrop : déplacer un widget vers la page l’enveloppe aussi ; une section reste insérée telle quelle', () => {
  const { root, h } = base();
  const r = applyDrop(root, { kind: 'move', id: h.id }, root.id, 1);
  assert.equal(r.root.children.length, 2);
  assert.equal(findParent(r.root, h.id).parent.type, 'column');
  assert.equal(r.wrapped, true);
  const sec = createSectionWithColumns(1);
  const r2 = applyDrop(root, { kind: 'new', node: sec }, root.id, 0);
  assert.equal(r2.root.children[0].id, sec.id);
  assert.equal(r2.wrapped, undefined);
});

test('dropHint : dit où déposer chaque type', () => {
  assert.match(dropHint('section'), /page/);
  assert.match(dropHint('row'), /section|colonne/);
  assert.match(dropHint('column'), /rangée/);
  assert.match(dropHint('heading'), /colonne/);
  assert.match(dropHint('heading'), /page/);
});

/* Cycle 33 (A1, WCAG 2.5.7) : « Déplacer vers… », alternative au glisser-déposer */
test('moveTargets : colonnes possibles pour un widget, avec un chemin lisible ; moveTo le place à la fin', async () => {
  const { moveTargets, moveTo } = await import('../core/editing.js');
  let root = createNode('page');
  const s1 = createSectionWithColumns(2);
  const s2 = createSectionWithColumns(1);
  root = insertNode(root, root.id, s1);
  root = insertNode(root, root.id, s2);
  const [c1, c2] = s1.children[0].children;
  const c3 = s2.children[0].children[0];
  const h = createNode('heading');
  const t = createNode('text');
  root = insertNode(root, c1.id, h);
  root = insertNode(root, c3.id, t);
  const list = moveTargets(root, h.id);
  assert.deepEqual(list.map(x => x.id), [c1.id, c2.id, c3.id]);
  assert.equal(list[0].current, true);
  assert.deepEqual(list[1].path, [{ type: 'section', n: 1 }, { type: 'row', n: 1 }, { type: 'column', n: 2 }]);
  assert.equal(list[2].path[0].n, 2);
  const r = moveTo(root, h.id, c3.id);
  assert.deepEqual(findNode(r, c3.id).children.map(x => x.id), [t.id, h.id]);
  /* une rangée peut aller dans une autre section, jamais dans elle-même ; une section n'a pas de cible */
  const rows = moveTargets(root, s1.children[0].id);
  assert.ok(rows.some(x => x.id === s2.id) && !rows.some(x => x.id === c1.id));
  assert.deepEqual(moveTargets(root, s1.id), []);
});
