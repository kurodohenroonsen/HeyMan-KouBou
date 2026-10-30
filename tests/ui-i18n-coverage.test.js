/* Cycle 22 : toutes les chaînes de l'interface et du journal ont leur traduction anglaise et japonaise. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../tools/i18n.mjs';

const { sources, report } = check();

test('il y a bien des chaînes à traduire (l’extraction fonctionne)', () => {
  assert.ok(sources.size > 1500, `${sources.size} chaînes`);
});

for (const lang of ['en', 'ja']) {
  test(`${lang} : aucune chaîne manquante`, () => {
    const r = report[lang];
    assert.deepEqual(r.missing.slice(0, 15), [], `${r.missing.length} manquantes sur ${r.total} — ex. ${r.missing.slice(0, 3).join(' | ')}`);
  });
  test(`${lang} : mêmes paramètres {…} que le français`, () => {
    assert.deepEqual(report[lang].badPh.slice(0, 10), []);
  });
  test(`${lang} : pas de traductions contradictoires entre les fichiers de traduction`, () => {
    assert.deepEqual(report[lang].conflicts.slice(0, 10), []);
  });
}
