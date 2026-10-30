import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PANEL_DEFAULTS, PANEL_MIN, clampWidths, keyStep, parseSaved, defaultsFor } from '../core/panel-size.js';

test('largeurs d’origine selon la largeur de la fenêtre', () => {
  assert.deepEqual(defaultsFor(1440), PANEL_DEFAULTS);
  assert.deepEqual(defaultsFor(1050), { left: 250, right: 300 });
});

test('bornes : minimum, maximum, place gardée pour le canevas', () => {
  assert.deepEqual(clampWidths({ left: 100, right: 100 }, 1440), { left: PANEL_MIN.left, right: PANEL_MIN.right });
  assert.deepEqual(clampWidths({ left: 400, right: 450 }, 1440), { left: 400, right: 450 });
  const big = clampWidths({ left: 900, right: 900 }, 1440);
  assert.ok(big.left <= 640 && big.right <= 640, 'au plus 640 px chacun');
  assert.ok(1440 - big.left - big.right >= 420, `canevas ≥ 420 px (${1440 - big.left - big.right})`);
  const narrow = clampWidths({ left: 500, right: 500 }, 1100);
  assert.ok(1100 - narrow.left - narrow.right >= 420 && narrow.left >= PANEL_MIN.left && narrow.right >= PANEL_MIN.right);
  assert.deepEqual(clampWidths({ left: 'x', right: undefined }, 1440), PANEL_DEFAULTS, 'valeurs illisibles : largeurs d’origine');
});

test('clavier : flèches (Maj : grand pas), Début, Fin ; le sens dépend du côté', () => {
  assert.equal(keyStep('left', 'ArrowRight', false, 300), 316);
  assert.equal(keyStep('left', 'ArrowLeft', true, 300), 236);
  assert.equal(keyStep('right', 'ArrowLeft', false, 330), 346, 'panneau de droite : vers la gauche = plus large');
  assert.equal(keyStep('right', 'ArrowRight', false, 330), 314);
  assert.equal(keyStep('left', 'Home', false, 400), PANEL_MIN.left);
  assert.equal(keyStep('left', 'End', false, 400), 640, 'Fin : le plus large possible (borné ensuite selon la fenêtre)');
  assert.equal(keyStep('left', 'a', false, 400), null);
});

test('largeurs retenues : lecture sûre', () => {
  assert.deepEqual(parseSaved('{"left":350,"right":400}'), { left: 350, right: 400 });
  assert.equal(parseSaved('pas du json'), null);
  assert.equal(parseSaved(null), null);
  assert.deepEqual(parseSaved('{"left":350}'), { left: 350 });
});
