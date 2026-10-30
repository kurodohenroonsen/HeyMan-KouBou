import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNode, findNode, findParent, pathTo, insertNode, moveNode, removeNode, duplicateNode,
  canContain, setProp, setStyle, setAdvanced, walk, createSectionWithColumns
} from '../core/tree.js';

function page() {
  const root = createNode('page');
  return root;
}

function scaffold() {
  let root = page();
  const sec = createSectionWithColumns(2);
  root = insertNode(root, root.id, sec);
  const row = sec.children[0];
  const [c1, c2] = row.children;
  const h = createNode('heading');
  root = insertNode(root, c1.id, h);
  const t = createNode('text');
  root = insertNode(root, c1.id, t);
  return { root, sec, row, c1, c2, h, t };
}

test('createSectionWithColumns crée section > rangée > N colonnes réparties sur 12', () => {
  const s = createSectionWithColumns(3);
  assert.equal(s.type, 'section');
  assert.equal(s.children[0].type, 'row');
  assert.deepEqual(s.children[0].children.map(c => c.type), ['column', 'column', 'column']);
  assert.deepEqual(s.children[0].children.map(c => c.style.desktop.span), [4, 4, 4]);
});

test('les identifiants sont uniques dans tout l’arbre', () => {
  const { root } = scaffold();
  const ids = [];
  walk(root, n => ids.push(n.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('findNode, findParent et pathTo', () => {
  const { root, sec, row, c1, h } = scaffold();
  assert.equal(findNode(root, h.id).type, 'heading');
  const { parent, index } = findParent(root, h.id);
  assert.equal(parent.id, c1.id);
  assert.equal(index, 0);
  assert.deepEqual(pathTo(root, h.id), [root.id, sec.id, row.id, c1.id, h.id]);
  assert.equal(findNode(root, 'nope'), null);
});

test('règles d’imbrication', () => {
  const { root, sec, row, c1, h } = scaffold();
  assert.equal(canContain(root, root.id, 'section'), true);
  assert.equal(canContain(root, root.id, 'heading'), false);
  assert.equal(canContain(root, sec.id, 'row'), true);
  assert.equal(canContain(root, sec.id, 'heading'), false);
  assert.equal(canContain(root, row.id, 'column'), true);
  assert.equal(canContain(root, c1.id, 'heading'), true);
  assert.equal(canContain(root, c1.id, 'row'), true);
  assert.equal(canContain(root, h.id, 'text'), false);
});

test('une seule rangée imbriquée : pas de rangée dans une colonne déjà imbriquée', () => {
  let { root, c1 } = scaffold();
  const inner = createNode('row');
  inner.children = [createNode('column')];
  root = insertNode(root, c1.id, inner);
  const innerCol = inner.children[0];
  assert.equal(canContain(root, innerCol.id, 'heading'), true);
  assert.equal(canContain(root, innerCol.id, 'row'), false);
  assert.throws(() => insertNode(root, innerCol.id, createNode('row')), /pas autorisé/i);
});

test('insertNode est pur et respecte l’index', () => {
  const { root, c1, h, t } = scaffold();
  const b = createNode('button');
  const next = insertNode(root, c1.id, b, 1);
  assert.deepEqual(findNode(next, c1.id).children.map(n => n.id), [h.id, b.id, t.id]);
  assert.deepEqual(findNode(root, c1.id).children.map(n => n.id), [h.id, t.id]);
});

test('insertNode refuse un emplacement interdit', () => {
  const { root, sec } = scaffold();
  assert.throws(() => insertNode(root, sec.id, createNode('heading')), /pas autorisé/i);
  assert.throws(() => insertNode(root, 'inconnu', createNode('heading')), /introuvable/i);
});

test('moveNode dans le même parent, vers un autre parent, et refus vers un descendant', () => {
  let { root, sec, row, c1, c2, h, t } = scaffold();
  let r = moveNode(root, t.id, c1.id, 0);
  assert.deepEqual(findNode(r, c1.id).children.map(n => n.id), [t.id, h.id]);
  r = moveNode(root, h.id, c1.id, 2);
  assert.deepEqual(findNode(r, c1.id).children.map(n => n.id), [t.id, h.id]);
  r = moveNode(root, h.id, c2.id, 0);
  assert.deepEqual(findNode(r, c2.id).children.map(n => n.id), [h.id]);
  assert.deepEqual(findNode(r, c1.id).children.map(n => n.id), [t.id]);
  assert.throws(() => moveNode(root, sec.id, c1.id, 0), /pas autorisé|descendant/i);
  assert.throws(() => moveNode(root, row.id, c1.id, 0), /descendant/i);
});

test('duplicateNode copie en profondeur avec de nouveaux identifiants, juste après', () => {
  const { root, sec } = scaffold();
  const { root: r, newId } = duplicateNode(root, sec.id);
  const top = r.children;
  assert.equal(top.length, 2);
  assert.equal(top[1].id, newId);
  const a = [], b = [];
  walk(top[0], n => a.push(n.id));
  walk(top[1], n => b.push(n.id));
  assert.equal(a.length, b.length);
  assert.equal(a.filter(x => b.includes(x)).length, 0);
});

test('removeNode supprime et refuse la racine', () => {
  const { root, h } = scaffold();
  const r = removeNode(root, h.id);
  assert.equal(findNode(r, h.id), null);
  assert.throws(() => removeNode(root, root.id), /racine/i);
});

test('setProp écrit par langue pour un champ traduisible, en direct sinon', () => {
  const { root, h } = scaffold();
  let r = setProp(root, h.id, 'text', 'Bonjour', 'fr');
  r = setProp(r, h.id, 'text', 'Hallo', 'nl');
  r = setProp(r, h.id, 'level', 'h3');
  const n = findNode(r, h.id);
  assert.equal(n.props.text.fr, 'Bonjour');
  assert.equal(n.props.text.nl, 'Hallo');
  assert.equal(n.props.level, 'h3');
  assert.throws(() => setProp(r, h.id, 'level', 'script'), /valeur/i);
});

test('setProp assainit le texte riche', () => {
  const { root, t } = scaffold();
  const r = setProp(root, t.id, 'content', '<p>Ok <script>alert(1)</script><b>gras</b></p>', 'fr');
  assert.equal(findNode(r, t.id).props.content.fr, '<p>Ok <strong>gras</strong></p>');
});

test('setStyle valide, écrit par état et supprime avec une valeur vide', () => {
  const { root, h } = scaffold();
  let r = setStyle(root, h.id, 'mobile', 'fontSize', '28px');
  assert.equal(findNode(r, h.id).style.mobile.fontSize, '28px');
  r = setStyle(r, h.id, 'mobile', 'fontSize', '');
  assert.equal('fontSize' in findNode(r, h.id).style.mobile, false);
  assert.throws(() => setStyle(r, h.id, 'desktop', 'fontSize', '12px;background:red'), /invalide/i);
  assert.throws(() => setStyle(r, h.id, 'hover', 'fontSize', '20px'), /survol/i);
  assert.throws(() => setStyle(r, h.id, 'desktop', 'inconnu', '1px'), /inconnue/i);
});

test('setAdvanced valide l’ancre et les classes', () => {
  const { root, h } = scaffold();
  let r = setAdvanced(root, h.id, { anchor: 'Mon Ancre !', cssClass: 'a b-c', hideOn: { mobile: true } });
  const adv = findNode(r, h.id).advanced;
  assert.equal(adv.anchor, 'mon-ancre');
  assert.equal(adv.cssClass, 'a b-c');
  assert.equal(adv.hideOn.mobile, true);
  r = setAdvanced(r, h.id, { cssClass: 'ok "><script>' });
  assert.equal(findNode(r, h.id).advanced.cssClass, 'ok');
});
