import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAssets, mergeAssets } from '../editor/storage.js';
import { createSite, addAsset } from '../core/site.js';

const png = 'data:image/webp;base64,' + Buffer.from([1, 2, 3]).toString('base64');

test('splitAssets / mergeAssets : aller-retour sans perte, projet léger sans data URL', () => {
  let s = createSite();
  s = addAsset(s, { name: 'a.webp', mime: 'image/webp', dataUrl: png, width: 1600, height: 900, variants: [{ w: 480, dataUrl: png }] }).site;
  s = addAsset(s, { name: 'b.webp', mime: 'image/webp', dataUrl: png }).site;
  const { light, heavy } = splitAssets(s);
  assert.ok(!JSON.stringify(light).includes('base64'));
  const back = mergeAssets(JSON.parse(JSON.stringify(light)), heavy);
  assert.deepEqual(JSON.parse(JSON.stringify(back.assets)), JSON.parse(JSON.stringify(s.assets)));
});

test('mergeAssets : ancien format (images dans le projet) relu tel quel', () => {
  const s = addAsset(createSite(), { name: 'a.webp', mime: 'image/webp', dataUrl: png }).site;
  assert.deepEqual(mergeAssets(s, {}).assets, s.assets);
});
