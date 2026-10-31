/* Cycle 27 (P1) : images hors du modèle — magasin d'octets, copie sans octets, rendu avec résolveur, historique partagé */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../core/widgets-extra.js';
import { createAssetStore, cloneSite, absorbAssets, inlineAssets, pruneStore } from '../core/asset-store.js';
import { createSite, addAsset, removeAsset, updatePageRoot, setPageTitle, normalizeSite } from '../core/site.js';
import { createNode, createSectionWithColumns } from '../core/tree.js';
import { renderPage, renderSite } from '../core/render.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const big = kb => 'data:image/jpeg;base64,' + 'A'.repeat(Math.round(kb * 1024 * 4 / 3 / 4) * 4);

function siteWithImage(store) {
  const r = addAsset(createSite({ languages: ['fr', 'ja'] }), { name: 'Photo.png', mime: 'image/png', dataUrl: PNG, width: 1600, height: 900, variants: [{ w: 480, dataUrl: PNG2 }] }, store);
  const sec = createSectionWithColumns(1);
  const img = createNode('image');
  img.props.src = `asset:${r.id}`;
  sec.children[0].children[0].children = [img];
  const root = createNode('page');
  root.children = [sec];
  return { site: updatePageRoot(r.site, r.site.pages[0].id, root), id: r.id, img: img.id };
}

test('magasin : put, get (variante), has, list, delete, bytes', async () => {
  const st = createAssetStore({ objectUrls: false });
  st.put('img_a', { dataUrl: PNG, variants: [{ w: 480, dataUrl: PNG2 }] });
  assert.ok(st.has('img_a'));
  assert.deepEqual(st.list(), ['img_a']);
  assert.equal(st.get('img_a').dataUrl, PNG);
  assert.equal(st.get('img_a', 480).dataUrl, PNG2);
  assert.equal(st.get('img_a', 960).dataUrl, PNG, 'variante absente → image principale');
  assert.equal(st.get('img_a').mime, 'image/png');
  assert.ok(st.bytes() > 100 && st.bytes() < 200);
  assert.equal(st.url('img_a'), PNG, 'sans objectURL : data URL');
  assert.throws(() => st.put('img_b', { dataUrl: 'javascript:alert(1)' }));
  await st.put('img_c', { blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) });
  assert.equal(st.get('img_c').dataUrl, 'data:image/png;base64,AQID', 'Blob converti');
  assert.ok(st.delete('img_a'));
  assert.ok(!st.has('img_a'));
  assert.equal(st.get('img_a'), null);
  assert.equal(st.url('img_a'), '');
});

test('magasin : adresses blob: mises en cache, révoquées à la suppression', () => {
  const st = createAssetStore({ objectUrls: true });
  st.put('img_a', { dataUrl: PNG, variants: [{ w: 480, dataUrl: PNG2 }] });
  const u = st.url('img_a');
  assert.match(u, /^blob:/);
  assert.equal(st.url('img_a'), u, 'même adresse à chaque rendu');
  assert.notEqual(st.url('img_a', 480), u, 'variante : autre adresse');
  const revoked = [];
  const orig = URL.revokeObjectURL;
  URL.revokeObjectURL = x => { revoked.push(x); orig(x); };
  try { st.delete('img_a'); } finally { URL.revokeObjectURL = orig; }
  assert.ok(revoked.includes(u) && revoked.length === 2);
});

test('addAsset avec magasin : le site ne garde que des métadonnées', () => {
  const st = createAssetStore({ objectUrls: false });
  const { site, id } = siteWithImage(st);
  const a = site.assets[id];
  assert.deepEqual(Object.keys(a).sort(), ['file', 'height', 'kind', 'mime', 'variants', 'width']);
  assert.equal(a.kind, 'image');
  assert.deepEqual(a.variants, [{ w: 480, file: 'photo-480.png' }]);
  assert.ok(!JSON.stringify(site).includes('base64'));
  assert.equal(st.get(id).dataUrl, PNG);
  assert.equal(st.get(id, 480).dataUrl, PNG2);
});

test('cloneSite : un site de 20 Mo se copie en moins de 5 ms, images partagées', () => {
  let s = createSite();
  for (let i = 0; i < 12; i++) s = addAsset(s, { name: `p${i}.jpg`, mime: 'image/jpeg', dataUrl: big(1700) }).site;
  assert.ok(JSON.stringify(s).length > 20e6);
  cloneSite(s);
  const t0 = performance.now();
  const c = cloneSite(s);
  const ms = performance.now() - t0;
  assert.ok(ms < 5, `copie en ${ms.toFixed(2)} ms`);
  assert.equal(c.assets, s.assets);
  assert.notEqual(c.pages, s.pages);
  const t1 = performance.now();
  const s2 = setPageTitle(s, s.pages[0].id, 'Bonjour', 'fr');
  assert.ok(performance.now() - t1 < 5, 'opération du cœur sans copie des octets');
  assert.equal(s2.assets, s.assets);
});

test('renderPage du canevas avec résolveur : adresses blob:, aucune data: d’image', () => {
  const st = createAssetStore({ objectUrls: true });
  const { site } = siteWithImage(st);
  const html = renderPage(site, site.pages[0], 'fr', { canvas: true, assets: st });
  assert.match(html, /<img src="blob:/);
  assert.ok(!/data:image/.test(html));
});

test('renderSite avec résolveur : fichiers assets/ tirés du magasin, mêmes noms qu’avant le cycle 27', () => {
  const old = siteWithImage(null);
  const before = renderSite(old.site, { today: '2026-10-30' }).files;
  const st = createAssetStore({ objectUrls: false });
  const site = absorbAssets(old.site, st);
  assert.ok(!JSON.stringify(site.assets).includes('base64'));
  const after = renderSite(site, { today: '2026-10-30', assets: st }).files;
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort());
  const names = [...after.keys()].filter(k => k.startsWith('assets/'));
  assert.equal(names.length, 2);
  for (const n of names) assert.deepEqual(after.get(n), before.get(n));
  assert.equal(after.get('index.html'), before.get('index.html'));
});

test('export .json autonome (dataUrl) puis import qui sépare : aller-retour sans perte', () => {
  const st = createAssetStore({ objectUrls: false });
  const { site, id } = siteWithImage(st);
  const json = JSON.parse(JSON.stringify(inlineAssets(site, st)));
  assert.equal(json.assets[id].dataUrl, PNG);
  assert.equal(json.assets[id].variants[0].dataUrl, PNG2);
  const st2 = createAssetStore({ objectUrls: false });
  const back = normalizeSite(json, { assets: st2 });
  assert.deepEqual(back.assets, site.assets);
  assert.equal(st2.get(id).dataUrl, PNG);
  assert.equal(st2.get(id, 480).dataUrl, PNG2);
});

test('suppression d’une image : octets retirés du magasin quand plus rien ne la référence', () => {
  const st = createAssetStore({ objectUrls: false });
  const { site, id } = siteWithImage(st);
  const without = removeAsset(site, id);
  assert.ok(!without.assets[id]);
  assert.ok(site.assets[id], 'le site d’origine n’est pas modifié');
  assert.deepEqual(pruneStore(st, [without, site]), [], 'encore dans l’historique : gardée');
  assert.deepEqual(pruneStore(st, [without]), [id]);
  assert.ok(!st.has(id));
});

test('historique de l’éditeur : les états partagent les images, borné en pas et en octets', async () => {
  const store = await import('../editor/store.js');
  const { assets } = await import('../editor/assets.js');
  const { state, commit, undo, redo, load } = store;
  const { site } = siteWithImage(null);
  load(site);
  assert.ok(!JSON.stringify(state.site.assets).includes('base64'), 'chargé : octets séparés');
  assert.ok(assets.has(Object.keys(state.site.assets)[0]));
  for (let i = 0; i < 5; i++) commit(setPageTitle(state.site, state.site.pages[0].id, `T${i}`, 'fr'));
  for (const p of state.past) assert.equal(p.site.assets, state.site.assets);
  const now = state.site;
  undo(); redo();
  assert.equal(state.site, now);
  for (let i = 0; i < 200; i++) commit(setPageTitle(state.site, state.site.pages[0].id, `U${i}`, 'fr'));
  assert.ok(state.past.length <= 150, `${state.past.length} pas`);
  assert.ok(store.historyBytes() <= store.HISTORY_MAX_BYTES);
  store.stopSaving();
});

/* ---------- Intégration du cycle 33 sur le cycle 27 : documents et SVG dans le magasin ---------- */
test('addDocument avec magasin : octets hors du modèle, export assets/docs/, .json autonome, aller-retour', async () => {
  const { addDocument } = await import('../core/site.js');
  const store = createAssetStore({ objectUrls: false });
  const pdf = `data:application/pdf;base64,${Buffer.from('%PDF-1.4 statuts').toString('base64')}`;
  const d = addDocument(createSite({ languages: ['fr'] }), { name: 'Statuts.pdf', dataUrl: pdf }, store);
  const meta = d.site.assets[d.id];
  assert.equal(meta.dataUrl, undefined, 'pas d’octets dans le site');
  assert.deepEqual({ kind: meta.kind, name: meta.name, mime: meta.mime, file: meta.file }, { kind: 'document', name: 'Statuts.pdf', mime: 'application/pdf', file: 'statuts.pdf' });
  assert.ok(meta.size > 0);
  assert.equal(store.get(d.id).dataUrl, pdf);
  const btn = createNode('button');
  btn.props.file = `asset:${d.id}`;
  const sec = createSectionWithColumns(1);
  sec.children[0].children[0].children = [btn];
  const root = createNode('page');
  root.children = [sec];
  const site = updatePageRoot(d.site, d.site.pages[0].id, root);
  const files = renderSite(site, { assets: store }).files;
  const key = [...files.keys()].find(k => /^assets\/docs\/statuts-[0-9a-f]{8}\.pdf$/.test(k));
  assert.ok(key, [...files.keys()].join());
  assert.equal(Buffer.from(files.get(key)).toString(), '%PDF-1.4 statuts');
  assert.ok(renderPage(site, site.pages[0], 'fr', { assets: store }).includes(`href="${key}"`), 'lien vers le document');
  const json = inlineAssets(site, store);
  assert.equal(json.assets[d.id].dataUrl, pdf, '.json autonome');
  const store2 = createAssetStore({ objectUrls: false });
  const back = normalizeSite(JSON.parse(JSON.stringify(json)), { assets: store2 });
  assert.equal(back.assets[d.id].dataUrl, undefined);
  assert.equal(back.assets[d.id].name, 'Statuts.pdf');
  assert.equal(store2.get(d.id).dataUrl, pdf);
});

test('magasin : un SVG est assaini à l’entrée (projet .json, pair) ; type inconnu refusé', () => {
  const store = createAssetStore({ objectUrls: false });
  const evil = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect/></svg>').toString('base64')}`;
  store.put('img_svg', { dataUrl: evil });
  const text = Buffer.from(store.get('img_svg').dataUrl.split(',')[1], 'base64').toString();
  assert.doesNotMatch(text, /script|onload/);
  assert.match(text, /<rect\/>/);
  assert.throws(() => store.put('x', { dataUrl: 'data:text/html;base64,PGI+' }));
  const site = absorbAssets({ assets: { img_svg: { file: 'logo.svg', mime: 'image/svg+xml', dataUrl: evil } } }, store);
  assert.equal(site.assets.img_svg.dataUrl, undefined);
  const bad = `data:image/svg+xml;base64,${Buffer.from('pas un svg').toString('base64')}`;
  const broken = absorbAssets({ assets: { img_bad: { file: 'b.svg', mime: 'image/svg+xml', dataUrl: bad } } }, store);
  assert.equal(store.has('img_bad'), false, 'SVG illisible : métadonnées seules');
  assert.equal(broken.assets.img_bad.file, 'b.svg');
});

test('collaboration : octets d’un document ou d’un SVG acceptés d’un pair, HTML refusé', async () => {
  const { validAssetBytes } = await import('../core/collab.js');
  assert.ok(validAssetBytes('doc_abc', { dataUrl: `data:application/pdf;base64,${Buffer.from('x').toString('base64')}` }));
  assert.ok(validAssetBytes('img_svg', { dataUrl: `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}` }));
  assert.ok(!validAssetBytes('doc_bad', { dataUrl: 'data:text/html;base64,PGI+' }));
});
