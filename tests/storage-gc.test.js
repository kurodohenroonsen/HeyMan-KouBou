/* Cycle 31 (S6) : stockage fiable — images orphelines, tailles affichées, plafond d'import, base pleine. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orphanAssets, storedAssetIds, formatBytes, storageSummary, importTooLarge, MAX_IMPORT_BYTES, isQuotaError, quotaAdvice } from '../core/storage-gc.js';

test('orphanAssets : ni dans un projet ni dans une version gardée', () => {
  assert.deepEqual(orphanAssets(['a', 'b'], ['c'], ['a', 'b', 'c', 'd', 'e']), ['d', 'e']);
  assert.deepEqual(orphanAssets(new Set(['a']), new Set(['a']), ['a']), []);
  assert.deepEqual(orphanAssets([], [], []), []);
});

test('orphanAssets : rien n’est retiré quand le magasin ne contient que des images utilisées', () => {
  assert.deepEqual(orphanAssets(['x', 'y'], ['y', 'z'], ['z', 'x', 'y']), []);
});

test('orphanAssets : identifiants numériques ou en double traités comme des textes, ordre du magasin gardé', () => {
  assert.deepEqual(orphanAssets(['1'], [], [1, 2, 2, 3]), ['2', '3']);
});

test('orphanAssets : entrées absentes ou invalides → aucune suppression hasardeuse', () => {
  assert.deepEqual(orphanAssets(null, undefined, ['a']), ['a']);
  assert.deepEqual(orphanAssets(['a'], [], null), []);
});

test('storedAssetIds : images d’un projet (en mémoire ou allégé)', () => {
  assert.deepEqual(storedAssetIds({ assets: { a: { dataUrl: 'data:x' }, b: { stored: true } } }).sort(), ['a', 'b']);
  assert.deepEqual(storedAssetIds({}), []);
  assert.deepEqual(storedAssetIds(null), []);
});

test('formatBytes : Ko, Mo, Go à la française', () => {
  assert.equal(formatBytes(0), '0 Ko');
  assert.equal(formatBytes(1536), '2 Ko');
  assert.equal(formatBytes(42 * 1024 * 1024), '42 Mo');
  assert.equal(formatBytes(2 * 1024 ** 3), '2 Go');
  assert.equal(formatBytes(1.5 * 1024 ** 3), '1,5 Go');
});

test('storageSummary : persistant, quota utilisé', () => {
  assert.equal(storageSummary({ persisted: true, usage: 42 * 1024 * 1024, quota: 2 * 1024 ** 3 }), 'Stockage : persistant · 42 Mo utilisés sur 2 Go');
  assert.equal(storageSummary({ persisted: false, usage: 1024 * 1024, quota: 2 * 1024 ** 3 }), 'Stockage : non persistant (le navigateur peut l’effacer) · 1 Mo utilisés sur 2 Go');
  assert.match(storageSummary({ persisted: null }), /inconnu/);
});

test('import : plafond de 200 Mo', () => {
  assert.equal(MAX_IMPORT_BYTES, 200 * 1024 * 1024);
  assert.equal(importTooLarge(MAX_IMPORT_BYTES), false);
  assert.equal(importTooLarge(MAX_IMPORT_BYTES + 1), true);
  assert.equal(importTooLarge(10), false);
});

test('base pleine : reconnue d’après le nom ou le message, conseil clair', () => {
  assert.equal(isQuotaError({ name: 'QuotaExceededError' }), true);
  assert.equal(isQuotaError(new Error('The quota has been exceeded.')), true);
  assert.equal(isQuotaError(new Error('autre')), false);
  assert.equal(isQuotaError(null), false);
  assert.match(quotaAdvice(), /export/i);
  assert.match(quotaAdvice(), /versions/i);
});
