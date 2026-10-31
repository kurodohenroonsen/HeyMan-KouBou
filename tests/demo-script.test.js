/* Cycle 26 : script de la démonstration Kumakōgen — couverture des 23 widgets, trois langues, données réelles. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_STEPS, DEMO_DATA, DEMO_FACTS, demoWidgetTypes } from '../core/demo-kumakogen.js';
import { REGISTRY, isWidget } from '../core/widgets.js';
import '../core/widgets-extra.js';
import '../core/collection-widgets.js';

const donnees = readFileSync(new URL('../docs/exemple-kumakogen/donnees.md', import.meta.url), 'utf8');

test('le script montre chacun des 23 types de widgets', () => {
  const all = Object.keys(REGISTRY).filter(isWidget);
  assert.equal(all.length, 23);
  const shown = demoWidgetTypes();
  assert.deepEqual(all.filter(t => !shown.includes(t)), []);
});

test('chaque étape a un identifiant unique, une explication en ja, en et fr et une fonction run', () => {
  assert.ok(DEMO_STEPS.length >= 20);
  assert.equal(new Set(DEMO_STEPS.map(s => s.id)).size, DEMO_STEPS.length);
  for (const s of DEMO_STEPS) {
    for (const l of ['ja', 'en', 'fr']) assert.ok(s.say[l]?.length > 10, `${s.id} : ${l}`);
    assert.equal(typeof s.run, 'function');
  }
});

test('les faits cités existent dans donnees.md', () => {
  for (const f of DEMO_FACTS) assert.ok(donnees.includes(f), `fait absent : ${f}`);
});

test('nombres clés du site : superficie, altitude, températures, Ishizuchi, téléphones', () => {
  const site = JSON.stringify(DEMO_DATA);
  for (const n of ['584 km²', '800 m', '12.8 °C', '16.8 °C', '24.5 °C', '28.1 °C', '1982 m', '0892-21-1111', '0892-21-1116', '0892-21-1192', '0892-41-0711']) assert.ok(site.includes(n), n);
  assert.equal(DEMO_DATA.events.length, 4);
  assert.ok(DEMO_DATA.events.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)));
  assert.ok(!/@kumakogen|@kuma-kanko/.test(site), 'aucune adresse e-mail officielle inventée');
});
