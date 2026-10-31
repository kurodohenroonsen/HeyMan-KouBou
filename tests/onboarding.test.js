/* Cycle 26 : liste « Pour commencer » — sept étapes cochées d'après les codes du journal. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ONBOARDING_STEPS, ONBOARDING_KEY, stepsDone, progress, matchEntry, parseStored, serializeStored } from '../core/onboarding.js';

const e = (code, data = {}) => ({ code, data, level: 'info' });

test('sept étapes, dans l’ordre du guide, chacune avec un libellé, une action et des codes du journal', () => {
  assert.equal(ONBOARDING_STEPS.length, 7);
  assert.deepEqual(ONBOARDING_STEPS.map(s => s.id), ['name', 'languages', 'section', 'heading', 'image', 'mobile', 'publish']);
  for (const s of ONBOARDING_STEPS) {
    assert.ok(s.label.length > 5, `${s.id} : libellé`);
    assert.ok(s.hint.length > 10, `${s.id} : explication`);
    assert.ok(s.action, `${s.id} : action`);
    assert.ok(s.codes.length >= 1, `${s.id} : codes du journal`);
  }
});

test('chaque étape se coche d’après le journal (codes et données)', () => {
  const by = id => ONBOARDING_STEPS.find(s => s.id === id);
  assert.equal(matchEntry(by('name'), e('settings.name', { length: 8 })), true);
  assert.equal(matchEntry(by('name'), e('store.commit', { key: 'site-name', source: 'topbar' })), true, 'nom tapé dans la barre du haut');
  assert.equal(matchEntry(by('name'), e('store.commit', { key: 'footer-fr' })), false);
  assert.equal(matchEntry(by('name'), e('project.new', { lang: 'ja', languages: ['ja', 'en'] })), true, 'nouveau site nommé dans la fenêtre');
  assert.equal(matchEntry(by('languages'), e('project.new', { lang: 'ja', languages: ['ja', 'en'] })), true);
  assert.equal(matchEntry(by('languages'), e('project.new', { lang: 'en', languages: ['en'] })), false, 'une seule langue : pas encore choisi');
  assert.equal(matchEntry(by('languages'), e('settings.lang-add', { lang: 'de' })), true);
  assert.equal(matchEntry(by('section'), e('action.add-section')), true);
  assert.equal(matchEntry(by('section'), e('template.insert', { template: 'hero' })), true);
  assert.equal(matchEntry(by('section'), e('dnd.ok', { type: 'section', kind: 'new' })), true);
  assert.equal(matchEntry(by('section'), e('dnd.ok', { type: 'heading', wrapped: true })), true, 'widget déposé sur la page : une section est créée');
  assert.equal(matchEntry(by('section'), e('dnd.ok', { type: 'heading', kind: 'move' })), false);
  assert.equal(matchEntry(by('heading'), e('edit.ok', { key: 'text', changed: true })), true, 'titre écrit dans la page');
  assert.equal(matchEntry(by('heading'), e('edit.ok', { key: 'text', changed: false })), false, 'édition sans changement');
  assert.equal(matchEntry(by('heading'), e('edit.ok', { key: 'content', changed: true })), false, 'un paragraphe n’est pas un titre');
  assert.equal(matchEntry(by('heading'), e('inspector.field', { key: 'text', type: 'inline' })), true);
  assert.equal(matchEntry(by('heading'), e('inspector.field', { key: 'label', type: 'text' })), false);
  assert.equal(matchEntry(by('image'), e('inspector.image.ok', { asset: 'img_1' })), true);
  assert.equal(matchEntry(by('image'), e('settings.logo', { kind: 'asset' })), true);
  assert.equal(matchEntry(by('mobile'), e('store.view', { device: 'mobile' })), true);
  assert.equal(matchEntry(by('mobile'), e('store.view', { device: 'tablet' })), false);
  assert.equal(matchEntry(by('publish'), e('project.preview')), true);
  assert.equal(matchEntry(by('publish'), e('export.zip.ok')), true);
  assert.equal(matchEntry(by('publish'), e('publish.php.ok')), true);
  assert.equal(matchEntry(by('publish'), e('publish.php.fail')), false);
});

test('stepsDone : d’après un journal simulé, dans l’ordre d’apparition, sans doublon', () => {
  const log = [e('boot.ok'), e('store.view', { device: 'mobile' }), e('action.add-section'), e('store.view', { device: 'mobile' }), e('edit.ok', { key: 'content', changed: true })];
  assert.deepEqual(stepsDone(log), ['mobile', 'section']);
  assert.deepEqual(stepsDone([]), []);
});

test('progress : pourcentage arrondi, étapes faites et restantes', () => {
  const p = progress(['name', 'section', 'mobile']);
  assert.equal(p.done, 3);
  assert.equal(p.total, 7);
  assert.equal(p.percent, 43);
  assert.deepEqual(p.remaining.map(s => s.id), ['languages', 'heading', 'image', 'publish']);
  assert.equal(progress([]).percent, 0);
  assert.equal(progress(ONBOARDING_STEPS.map(s => s.id)).percent, 100);
  assert.equal(progress(['inconnu', 'name', 'name']).done, 1, 'identifiants inconnus et doublons ignorés');
});

test('choix retenus : liste faite, repliée ou masquée, lus avec tolérance', () => {
  assert.deepEqual(parseStored(null), { done: [], collapsed: false, hidden: false });
  assert.deepEqual(parseStored('{pas du json'), { done: [], collapsed: false, hidden: false });
  assert.deepEqual(parseStored('{"done":["name","x"],"hidden":true}'), { done: ['name'], collapsed: false, hidden: true });
  const s = serializeStored({ done: ['name', 'name', 'image'], collapsed: true, hidden: false });
  assert.deepEqual(JSON.parse(s), { done: ['name', 'image'], collapsed: true, hidden: false });
  assert.equal(ONBOARDING_KEY, 'atelier-onboarding');
});
