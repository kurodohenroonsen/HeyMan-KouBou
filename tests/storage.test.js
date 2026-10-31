import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAssets, mergeAssets, migrateLegacyTokens, isKnownDestination, addKnownDestination, KNOWN_DESTINATIONS_KEY } from '../editor/storage.js';
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

/* ---------- Cycle 25 (S2) : jetons par origine ---------- */
function fakeStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { m, get: async k => m.get(k) || '', set: async (k, v) => { if (v) m.set(k, v); else m.delete(k); } };
}
const pub = (url, gh) => ({ ...createSite(), publish: { mode: 'php', url, gh: { owner: '', repo: '', branch: 'main', dir: '', ...(gh || {}) } } });

test('migrateLegacyTokens : l’ancienne clé php-token est rattachée à l’origine de publish.url, et effacée', async () => {
  const store = fakeStore({ 'php-token': 'secret-a' });
  const moved = await migrateLegacyTokens(pub('https://www.mab.be/publish.php'), store);
  assert.deepEqual(moved, [{ from: 'php-token', to: 'php-token:https://www.mab.be' }]);
  assert.equal(store.m.get('php-token:https://www.mab.be'), 'secret-a');
  assert.ok(!store.m.has('php-token'), 'clé historique effacée');
  assert.deepEqual(await migrateLegacyTokens(pub('https://www.mab.be/publish.php'), store), [], 'rien à faire la deuxième fois');
});

test('migrateLegacyTokens : sans adresse dans le projet, la clé historique reste en place (jamais pré-remplie) ; une clé par origine déjà présente n’est pas écrasée', async () => {
  const store = fakeStore({ 'php-token': 'secret-a' });
  assert.deepEqual(await migrateLegacyTokens(pub(''), store), []);
  assert.equal(store.m.get('php-token'), 'secret-a');
  const store2 = fakeStore({ 'php-token': 'vieux', 'php-token:https://www.mab.be': 'recent' });
  const moved = await migrateLegacyTokens(pub('https://www.mab.be/publish.php'), store2);
  assert.deepEqual(moved, [{ from: 'php-token', to: null }], 'ancienne clé écartée, la clé par origine est gardée');
  assert.equal(store2.m.get('php-token:https://www.mab.be'), 'recent');
  assert.ok(!store2.m.has('php-token'));
});

test('migrateLegacyTokens : jeton GitHub rattaché au dépôt owner/repo', async () => {
  const store = fakeStore({ 'github-token': 'ghp_x' });
  const moved = await migrateLegacyTokens(pub('', { owner: 'Aktina', repo: 'site-mab' }), store);
  assert.deepEqual(moved, [{ from: 'github-token', to: 'github-token:aktina/site-mab' }]);
  assert.equal(store.m.get('github-token:aktina/site-mab'), 'ghp_x');
  assert.ok(!store.m.has('github-token'));
});

test('destinations connues (première publication) : gardées sur l’appareil, lecture sûre sans stockage', () => {
  const saved = globalThis.localStorage;
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  try {
    assert.equal(isKnownDestination('php:https://www.mab.be'), false);
    addKnownDestination('php:https://www.mab.be');
    assert.equal(isKnownDestination('php:https://www.mab.be'), true);
    assert.equal(isKnownDestination('php:https://attaquant.example'), false);
    addKnownDestination('github:aktina/site-mab');
    addKnownDestination('php:https://www.mab.be');
    assert.deepEqual(JSON.parse(mem.get(KNOWN_DESTINATIONS_KEY)), ['php:https://www.mab.be', 'github:aktina/site-mab'], 'sans doublon');
    assert.equal(isKnownDestination(''), false);
    mem.set(KNOWN_DESTINATIONS_KEY, '{pas du json');
    assert.equal(isKnownDestination('php:https://www.mab.be'), false, 'valeur abîmée : rien n’est connu, pas d’erreur');
    globalThis.localStorage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };
    assert.equal(isKnownDestination('php:https://www.mab.be'), false);
    assert.doesNotThrow(() => addKnownDestination('php:https://www.mab.be'));
  } finally {
    if (saved === undefined) delete globalThis.localStorage; else globalThis.localStorage = saved;
  }
});
