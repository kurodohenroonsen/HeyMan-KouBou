/* Cycle 24 : nouveau site vide avec choix de la langue principale (le japonais compris) et des autres langues. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankSite, createSite, normalizeSite, LANG_LABELS } from '../core/site.js';

test('par défaut : français, puis néerlandais, allemand, anglais (comme avant)', () => {
  const s = blankSite();
  assert.equal(s.defaultLanguage, 'fr');
  assert.deepEqual(s.languages, ['fr', 'nl', 'de', 'en']);
  assert.equal(s.name, 'Nouveau site');
  assert.equal(s.pages[0].title.fr, 'Accueil');
});

test('japonais en langue principale : page « ホーム », nom et pied de page en japonais', () => {
  const s = normalizeSite(blankSite({ main: 'ja', others: ['en', 'fr'] }));
  assert.equal(s.defaultLanguage, 'ja');
  assert.deepEqual(s.languages, ['ja', 'en', 'fr']);
  assert.equal(s.pages[0].title.ja, 'ホーム');
  assert.equal(s.name, '新しいサイト');
  assert.match(s.footer.text.ja, /新しいサイト/);
  assert.equal(s.pages[0].slug, '');
});

test('nom donné : gardé (espaces retirés), et utilisé dans le pied de page', () => {
  const s = blankSite({ name: '  久万高原町 観光ガイド ', main: 'ja' });
  assert.equal(s.name, '久万高原町 観光ガイド');
  assert.equal(s.footer.text.ja, '© 久万高原町 観光ガイド');
});

test('chaque langue a un titre d’accueil dans sa langue', () => {
  const titles = Object.keys(LANG_LABELS).map(l => blankSite({ main: l, others: [] }).pages[0].title[l]);
  assert.deepEqual(titles, ['Accueil', 'Home', 'Startseite', 'Home', 'ホーム']);
});

test('langues inconnues, doublons et langue principale répétée : écartés', () => {
  const s = blankSite({ main: 'ja', others: ['ja', 'en', 'en', 'xx', '<b>', 'fr'] });
  assert.deepEqual(s.languages, ['ja', 'en', 'fr']);
  assert.equal(blankSite({ main: 'klingon' }).defaultLanguage, 'fr');
  assert.deepEqual(blankSite({ main: 'en', others: [] }).languages, ['en']);
});

test('createSite garde « Accueil » pour un site français et suit la langue principale sinon', () => {
  assert.equal(createSite({ languages: ['fr'] }).pages[0].title.fr, 'Accueil');
  assert.equal(createSite({ languages: ['nl', 'fr'] }).pages[0].title.nl, 'Home');
});
