import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTip, macKeys, isIconOnly, pickTip, placeTip } from '../core/tooltip.js';

test('raccourci lu à la fin du texte d’aide', () => {
  assert.deepEqual(parseTip('Annuler (Ctrl+Z)'), { text: 'Annuler', keys: ['Ctrl', 'Z'] });
  assert.deepEqual(parseTip('Rétablir (Ctrl+Maj+Z)'), { text: 'Rétablir', keys: ['Ctrl', 'Maj', 'Z'] });
  assert.deepEqual(parseTip('Sélectionner le parent (Échap)'), { text: 'Sélectionner le parent', keys: ['Échap'] });
  assert.deepEqual(parseTip('Supprimer (Suppr)'), { text: 'Supprimer', keys: ['Suppr'] });
  assert.deepEqual(parseTip('Tablette (820 px)'), { text: 'Tablette (820 px)', keys: [] }, 'une parenthèse qui n’est pas un raccourci reste dans le texte');
  assert.deepEqual(parseTip('Journal de débogage'), { text: 'Journal de débogage', keys: [] });
  assert.deepEqual(parseTip('  '), { text: '', keys: [] });
  assert.deepEqual(parseTip('Commandes (Ctrl+K)'), { text: 'Commandes', keys: ['Ctrl', 'K'] });
  assert.deepEqual(parseTip('Redo (Ctrl+Shift+Z)'), { text: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] }, 'noms anglais des touches');
  assert.deepEqual(parseTip('やり直す (Ctrl+Shift+Z)'), { text: 'やり直す', keys: ['Ctrl', 'Shift', 'Z'] });
  assert.deepEqual(parseTip('親を選択 (Esc)'), { text: '親を選択', keys: ['Esc'] });
  assert.deepEqual(parseTip('太字（Ctrl+B）'), { text: '太字', keys: ['Ctrl', 'B'] }, 'parenthèses pleine chasse');
});

test('touches Mac : ⌘ ⇧ ⌥ ⌫', () => {
  assert.deepEqual(macKeys(['Ctrl', 'Maj', 'Z']), ['⌘', '⇧', 'Z']);
  assert.deepEqual(macKeys(['Ctrl', 'Alt', 'J']), ['⌘', '⌥', 'J']);
  assert.deepEqual(macKeys(['Suppr']), ['⌫']);
  assert.deepEqual(macKeys(['Ctrl', 'Shift', 'Delete']), ['⌘', '⇧', '⌫']);
  assert.deepEqual(macKeys(['Échap']), ['Échap']);
});

test('bouton à icône : moins de trois lettres visibles', () => {
  for (const t of ['✨', '↶', '🖥▭▯', '⧉', '', '1/3 + 2/3', 'FR']) assert.equal(isIconOnly(t), true, t);
  for (const t of ['🌐 Traductions', 'Publier', 'SEO']) assert.equal(isIconOnly(t), false, t);
});

test('choix du texte : data-tip, puis title, puis aria-label d’un bouton à icône', () => {
  assert.deepEqual(pickTip({ tip: 'A (Ctrl+Z)', title: 'B', aria: 'C', text: '↶' }), { text: 'A', keys: ['Ctrl', 'Z'], desc: '' });
  assert.equal(pickTip({ title: 'B', aria: 'C', text: '↶' }).text, 'B');
  assert.equal(pickTip({ aria: 'Replier', text: '▾' }).text, 'Replier');
  assert.equal(pickTip({ aria: 'Fermer', text: 'Fermer la fenêtre' }), null, 'bouton avec un vrai texte et seulement aria-label : rien à ajouter');
  assert.equal(pickTip({ text: '✕' }), null);
  assert.equal(pickTip({ title: 'IA locale', desc: 'Reformuler, corriger…', text: '✨' }).desc, 'Reformuler, corriger…');
  assert.equal(pickTip({ title: 'Publier', text: 'Publier' }), null, 'le texte d’aide qui répète le bouton n’apporte rien');
});

test('placement : sous l’élément, au-dessus s’il manque de place, dans la fenêtre', () => {
  const view = { w: 1000, h: 600 };
  const below = placeTip({ x: 100, y: 10, w: 40, h: 30 }, { w: 120, h: 40 }, view);
  assert.deepEqual(below, { left: 60, top: 46, side: 'below' });
  const above = placeTip({ x: 100, y: 560, w: 40, h: 30 }, { w: 120, h: 40 }, view);
  assert.equal(above.side, 'above');
  assert.equal(above.top, 560 - 6 - 40);
  const edge = placeTip({ x: 990, y: 10, w: 10, h: 30 }, { w: 200, h: 40 }, view);
  assert.equal(edge.left, 1000 - 8 - 200);
  const left = placeTip({ x: 0, y: 10, w: 10, h: 30 }, { w: 200, h: 40 }, view);
  assert.equal(left.left, 8);
});
