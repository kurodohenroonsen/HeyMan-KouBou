/* Cycle 27 (Q7) : schéma versionné, migrations numérotées, projets de référence qui s'ouvrent, se rendent et s'exportent */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import '../core/widgets-extra.js';
import '../core/collection-widgets.js';
import { normalizeSite, validateSite, migrate, SCHEMA, MIGRATIONS, createSite } from '../core/site.js';
import { renderSite } from '../core/render.js';
import { createZip } from '../core/zip.js';
import { createAssetStore, inlineAssets } from '../core/asset-store.js';

const DIR = new URL('./fixtures/projets/', import.meta.url);
const fixtures = readdirSync(DIR).filter(f => f.endsWith('.atelier.json'));
const read = f => JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
const DAY = { today: '2026-10-30', now: new Date('2026-10-30T12:00:00Z') };

test('schéma courant 3, migrations numérotées et contiguës', () => {
  assert.equal(SCHEMA, 3);
  assert.deepEqual(MIGRATIONS.map(m => m.to), [3]);
  assert.equal(createSite().schema, SCHEMA, 'nouveau site au schéma courant');
  const m = migrate({ ...createSite(), schema: undefined });
  assert.equal(m.schema, 3, 'projet sans schéma (avant le cycle 27) migré');
});

test('au moins trois projets de référence (MAB, japonais avec collections et images, 30 pages)', () => {
  assert.ok(fixtures.length >= 3, fixtures.join(', '));
});

for (const f of fixtures) {
  test(`projet de référence ${f} : s'ouvre, se rend et s'exporte`, () => {
    const raw = read(f);
    const store = createAssetStore({ objectUrls: false });
    const site = normalizeSite(raw, { assets: store });
    assert.equal(site.schema, SCHEMA);
    const check = validateSite(site);
    assert.ok(check.ok, check.errors.join(' / '));
    for (const a of Object.values(site.assets)) assert.ok(!a.dataUrl && a.kind === 'image', 'métadonnées seules');
    assert.equal(store.list().length, Object.keys(raw.assets || {}).length);
    const { files } = renderSite(site, { ...DAY, assets: store });
    const expected = JSON.parse(readFileSync(new URL(f.replace('.atelier.json', '.fichiers.json'), DIR), 'utf8'));
    assert.deepEqual([...files.keys()].sort(), expected, 'mêmes fichiers exportés qu’avant le cycle 27');
    const zip = createZip([...files].map(([name, data]) => ({ name, data })));
    assert.ok(zip.length > 1000);
    const back = inlineAssets(site, store);
    for (const [id, a] of Object.entries(raw.assets || {})) {
      assert.equal(back.assets[id].dataUrl, a.dataUrl, 'retour au format .json autonome');
      assert.deepEqual((back.assets[id].variants || []).map(v => v.dataUrl), (a.variants || []).map(v => v.dataUrl));
    }
  });
}

test('projet de référence ouvert sans magasin (Node, anciens outils) : rendu et export identiques', () => {
  const raw = read('japonais-collections-images.atelier.json');
  const site = normalizeSite(raw);
  assert.equal(site.schema, SCHEMA);
  const { files } = renderSite(site, DAY);
  const expected = JSON.parse(readFileSync(new URL('japonais-collections-images.fichiers.json', DIR), 'utf8'));
  assert.deepEqual([...files.keys()].sort(), expected);
});

test('un projet d’un schéma futur est refusé avec un message clair', () => {
  const future = { ...createSite(), schema: SCHEMA + 1 };
  const check = validateSite(normalizeSite(future));
  assert.ok(!check.ok);
  assert.match(check.errors[0], /version plus récente d’Atelier/);
  assert.match(check.errors[0], new RegExp(`schéma ${SCHEMA + 1}`));
});
