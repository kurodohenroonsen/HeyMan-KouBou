import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, fuzzyScore, rankCommands, filterStyleKeys } from '../core/commands.js';
import { createNode, insertNode, createSectionWithColumns, findNode, findParent } from '../core/tree.js';
import { topLevel, removeMany, duplicateMany, setStyleMany, neighbor } from '../core/editing.js';

test('normalizeText : minuscules, sans accents, espaces réduits', () => {
  assert.equal(normalizeText('  Élément   Équipe '), 'element equipe');
});

test('fuzzyScore : sous-chaîne, début de mot favorisé, lettres dans l’ordre, absence = 0', () => {
  assert.ok(fuzzyScore('tit', 'Titre') > 0);
  assert.ok(fuzzyScore('tit', 'Titre') > fuzzyScore('tit', 'Petit titre'));
  assert.ok(fuzzyScore('pet', 'Petit titre') > fuzzyScore('pet', 'Trompette'));
  assert.ok(fuzzyScore('tmo', 'Titre mobile') > 0);
  assert.equal(fuzzyScore('xyz', 'Titre'), 0);
  assert.ok(fuzzyScore('equipe', 'Page : Équipe') > 0);
  assert.ok(fuzzyScore('ajout bout', 'Ajouter : Bouton') > 0);
  assert.equal(fuzzyScore('ajout zzz', 'Ajouter : Bouton'), 0);
  assert.equal(fuzzyScore('', 'Tout'), 1);
});

test('rankCommands : tri par pertinence, mots-clés, récents en tête, limite', () => {
  const cmds = [
    { id: 'a', label: 'Ajouter : Bouton', keywords: 'cta lien' },
    { id: 'b', label: 'Ajouter : Titre' },
    { id: 'c', label: 'Exporter le site' },
    { id: 'd', label: 'Bouton : Rejoindre' }
  ];
  assert.deepEqual(rankCommands(cmds, 'bouton').map(c => c.id), ['d', 'a']);
  assert.deepEqual(rankCommands(cmds, 'cta').map(c => c.id), ['a']);
  assert.deepEqual(rankCommands(cmds, '', { recent: ['c'] }).map(c => c.id)[0], 'c');
  assert.equal(rankCommands(cmds, '', { limit: 2 }).length, 2);
});

test('filterStyleKeys : recherche dans les réglages par libellé et groupe', () => {
  const keys = filterStyleKeys('marge');
  assert.ok(keys.includes('marginTop') && keys.includes('paddingLeft'));
  assert.ok(!keys.includes('fontSize'));
  assert.ok(filterStyleKeys('typo').includes('fontSize'));
  assert.ok(filterStyleKeys('couleur').includes('background'));
});

function tree() {
  let root = createNode('page');
  const sec = createSectionWithColumns(2);
  root = insertNode(root, root.id, sec);
  const [c1, c2] = sec.children[0].children;
  const a = createNode('heading'); const b = createNode('text'); const c = createNode('button');
  root = insertNode(root, c1.id, a);
  root = insertNode(root, c1.id, b);
  root = insertNode(root, c2.id, c);
  return { root, sec, row: sec.children[0], c1, c2, a, b, c };
}

test('topLevel : ignore les éléments dont un ancêtre est déjà sélectionné', () => {
  const { root, sec, c1, a, c } = tree();
  assert.deepEqual(topLevel(root, [a.id, c1.id, c.id]).sort(), [c1.id, c.id].sort());
  assert.deepEqual(topLevel(root, [sec.id, a.id]), [sec.id]);
});

test('removeMany : supprime une fois chaque élément de premier niveau', () => {
  const { root, c1, a, b, c } = tree();
  const r = removeMany(root, [a.id, c.id, b.id]);
  assert.equal(findNode(r, c1.id).children.length, 0);
  assert.equal(findNode(r, c.id), null);
});

test('duplicateMany : chaque copie juste après son original, ids renvoyés', () => {
  const { root, c1, a, b } = tree();
  const r = duplicateMany(root, [a.id, b.id]);
  const kids = findNode(r.root, c1.id).children;
  assert.equal(kids.length, 4);
  assert.equal(kids[0].id, a.id);
  assert.equal(kids[1].id, r.ids[0]);
  assert.equal(kids[2].id, b.id);
  assert.equal(kids[3].id, r.ids[1]);
});

test('setStyleMany : même réglage sur plusieurs éléments, validation stricte', () => {
  const { root, a, c } = tree();
  const r = setStyleMany(root, [a.id, c.id], 'desktop', 'marginTop', '12px');
  assert.equal(findNode(r, a.id).style.desktop.marginTop, '12px');
  assert.equal(findNode(r, c.id).style.desktop.marginTop, '12px');
  assert.throws(() => setStyleMany(root, [a.id], 'desktop', 'marginTop', '12pt'), /invalide/);
});

test('neighbor : précédent, suivant, parent, premier enfant', () => {
  const { root, sec, row, c1, a, b } = tree();
  assert.equal(neighbor(root, b.id, 'prev'), a.id);
  assert.equal(neighbor(root, a.id, 'next'), b.id);
  assert.equal(neighbor(root, a.id, 'prev'), null);
  assert.equal(neighbor(root, a.id, 'parent'), c1.id);
  assert.equal(neighbor(root, sec.id, 'parent'), null);
  assert.equal(neighbor(root, sec.id, 'child'), row.id);
  assert.equal(neighbor(root, a.id, 'child'), null);
  assert.equal(neighbor(root, null, 'next'), sec.id);
});

test('rankCommands : un poids plus faible fait passer les actions avant les nombreux éléments', () => {
  const cmds = [
    { id: 'n1', label: 'Titre : Le matériel', weight: 0.85 },
    { id: 'n2', label: 'Titre : Les abonnements', weight: 0.85 },
    { id: 'add', label: 'Ajouter : Titre' }
  ];
  assert.equal(rankCommands(cmds, 'tit')[0].id, 'add');
});
