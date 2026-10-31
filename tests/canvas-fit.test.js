/* Cycle 30 : largeur de rendu et échelle du canevas selon l'appareil, le zoom et la place disponible (logique pure). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitCanvas, nextZoom, ZOOM_LEVELS, DESKTOP_MIN, DEVICE_WIDTH, zoomText } from '../core/canvas-fit.js';

test('ordinateur, « ajuster » : la page prend la largeur disponible au-dessus du minimum, réduite seulement en dessous', () => {
  assert.equal(DESKTOP_MIN, 1040, 'juste au-dessus du point de rupture tablette (1024 px) : les réglages ordinateur s’appliquent');
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 'fit', availW: 1338 }), { width: 1338, scale: 1, overflow: false }, 'portable 1366 px, panneaux repliés');
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 'fit', availW: 1892 }), { width: 1892, scale: 1, overflow: false }, 'grand écran : fluide');
  const laptop = fitCanvas({ device: 'desktop', zoom: 'fit', availW: 718 });
  assert.equal(laptop.width, 1040);
  assert.equal(Math.round(laptop.scale * 100), 69);
  assert.equal(laptop.overflow, false);
});

test('ordinateur, zoom fixe : 100 % déborde (défilement) quand la place manque ; 75 % et 50 % montrent une page plus large', () => {
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 100, availW: 718 }), { width: 1040, scale: 1, overflow: true });
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 100, availW: 1338 }), { width: 1338, scale: 1, overflow: false });
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 75, availW: 1338 }), { width: 1784, scale: 0.75, overflow: false });
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 50, availW: 718 }), { width: 1436, scale: 0.5, overflow: false });
  assert.deepEqual(fitCanvas({ device: 'desktop', zoom: 75, availW: 718 }), { width: 1040, scale: 0.75, overflow: true }, 'jamais sous le minimum');
});

test('tablette et mobile : largeur fixe, réduite si la place manque, zoom appliqué tel quel', () => {
  assert.deepEqual(DEVICE_WIDTH, { desktop: 1040, tablet: 820, mobile: 390 });
  assert.deepEqual(fitCanvas({ device: 'tablet', zoom: 'fit', availW: 1338 }), { width: 820, scale: 1, overflow: false });
  assert.equal(Math.round(fitCanvas({ device: 'tablet', zoom: 'fit', availW: 718 }).scale * 1000), 876);
  assert.deepEqual(fitCanvas({ device: 'mobile', zoom: 'fit', availW: 718 }), { width: 390, scale: 1, overflow: false });
  assert.deepEqual(fitCanvas({ device: 'mobile', zoom: 50, availW: 718 }), { width: 390, scale: 0.5, overflow: false });
  assert.deepEqual(fitCanvas({ device: 'tablet', zoom: 100, availW: 718 }), { width: 820, scale: 1, overflow: true });
});

test('nextZoom : le palier suivant au-dessus ou en dessous de l’échelle actuelle', () => {
  assert.deepEqual(ZOOM_LEVELS, [50, 75, 100]);
  assert.equal(nextZoom(0.69, 1), 75);
  assert.equal(nextZoom(0.69, -1), 50);
  assert.equal(nextZoom(1, 1), 100, 'déjà au maximum');
  assert.equal(nextZoom(0.5, -1), 50, 'déjà au minimum');
  assert.equal(nextZoom(0.75, 1), 100);
  assert.equal(nextZoom(0.75, -1), 50);
});

test('zoomText : « 100 % » et « ajuster (69 %) »', () => {
  assert.equal(zoomText('fit', 1), 'Ajuster (100 %)');
  assert.equal(zoomText('fit', 0.69), 'Ajuster (69 %)');
  assert.equal(zoomText(75, 0.75), '75 %');
});
