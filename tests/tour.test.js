/* Cycle 26 : moteur de la visite guidée (étapes, proposition à la première visite, persistance, saut, bulle). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS, TOUR_KEY, shouldOfferTour, createTour, placeBubble, unionRect, cutoutRect } from '../core/tour.js';
import { setUiLanguage, __ } from '../core/ui-i18n.js';

const mem = () => { const m = new Map(); return { read: k => (m.has(k) ? m.get(k) : null), write: (k, v) => { if (v === null) m.delete(k); else m.set(k, v); }, m }; };

test('cinq étapes : bibliothèque, page, inspecteur, barre du haut, Fichier et ❓ ; chacune a une cible, un titre et un texte', () => {
  assert.equal(TOUR_STEPS.length, 5);
  assert.deepEqual(TOUR_STEPS.map(s => s.id), ['library', 'page', 'inspector', 'topbar', 'help']);
  for (const s of TOUR_STEPS) {
    assert.ok(s.target && (typeof s.target === 'string' || Array.isArray(s.target)), `${s.id} : cible`);
    assert.ok(s.title.length > 3 && s.text.length > 20, `${s.id} : textes`);
  }
  assert.ok(new Set(TOUR_STEPS.map(s => s.id)).size === 5);
});

test('les textes existent en anglais et en japonais (catalogues de l’interface)', async () => {
  const { readParts } = await import('../tools/i18n.mjs');
  for (const lang of ['en', 'ja']) {
    const { cat } = readParts(lang);
    setUiLanguage(lang, cat);
    for (const s of TOUR_STEPS) {
      assert.notEqual(__(s.title), s.title, `${lang} : titre « ${s.title} »`);
      assert.notEqual(__(s.text), s.text, `${lang} : texte de ${s.id}`);
    }
  }
  setUiLanguage(null);
});

test('proposée à la première visite seulement, jamais pendant un test, un auto-test ou une invitation', () => {
  assert.equal(shouldOfferTour({ stored: null, search: '', hash: '' }), true);
  assert.equal(shouldOfferTour({ stored: null, search: '?lang=en', hash: '' }), true, '?lang= est un vrai usage');
  assert.equal(shouldOfferTour({ stored: '{"done":true}', search: '', hash: '' }), false, 'déjà faite ou passée');
  assert.equal(shouldOfferTour({ stored: null, search: '?fresh=1', hash: '' }), false);
  assert.equal(shouldOfferTour({ stored: null, search: '?autotest', hash: '' }), false);
  assert.equal(shouldOfferTour({ stored: null, search: '', hash: '#join=abc' }), false);
  assert.equal(shouldOfferTour({ stored: 'illisible', search: '', hash: '' }), false, 'une valeur quelconque vaut « déjà vue »');
  assert.equal(shouldOfferTour({ stored: null, search: '', hash: '', automated: true }), false, 'navigateur piloté par un test');
  assert.equal(shouldOfferTour({ stored: null, search: '?tour', hash: '', automated: true }), true, '?tour la force');
});

test('déroulement automatique : accueil, puis les étapes, puis terminé et retenu', () => {
  const s = mem();
  const seen = [];
  const t = createTour({ steps: TOUR_STEPS, read: s.read, write: s.write, now: () => 1000, onChange: st => seen.push(st.status + ':' + st.index) });
  assert.equal(t.state().status, 'idle');
  t.start({ auto: true });
  assert.equal(t.state().status, 'welcome');
  assert.equal(t.state().index, -1);
  t.next();
  assert.equal(t.state().status, 'running');
  assert.equal(t.state().index, 0);
  assert.equal(t.state().step.id, 'library');
  assert.equal(t.prev(), false, 'pas de précédent à la première étape');
  for (let i = 0; i < 4; i++) t.next();
  assert.equal(t.state().index, 4);
  assert.equal(t.state().last, true);
  t.next();
  assert.equal(t.state().status, 'done');
  const stored = JSON.parse(s.read(TOUR_KEY));
  assert.equal(stored.done, true);
  assert.equal(stored.how, 'done');
  assert.equal(stored.at, 1000);
  assert.ok(seen.includes('welcome:-1') && seen.includes('running:0') && seen.includes('done:5'));
  assert.equal(shouldOfferTour({ stored: s.read(TOUR_KEY), search: '', hash: '' }), false);
});

test('« Passer » : la visite se ferme, l’étape atteinte est retenue, et elle n’est plus proposée', () => {
  const s = mem();
  const t = createTour({ steps: TOUR_STEPS, read: s.read, write: s.write, now: () => 5 });
  t.start({ auto: true });
  t.next();
  t.next();
  t.skip();
  assert.equal(t.state().status, 'done');
  assert.deepEqual(JSON.parse(s.read(TOUR_KEY)), { done: true, how: 'skip', step: 1, at: 5 });
  assert.equal(shouldOfferTour({ stored: s.read(TOUR_KEY), search: '', hash: '' }), false);
});

test('rejouer à la demande : pas d’accueil, première étape directement ; précédent revient en arrière', () => {
  const s = mem();
  s.write(TOUR_KEY, JSON.stringify({ done: true, how: 'skip', step: 0, at: 1 }));
  const t = createTour({ steps: TOUR_STEPS, read: s.read, write: s.write, now: () => 9 });
  t.start({ auto: false });
  assert.equal(t.state().status, 'running');
  assert.equal(t.state().index, 0);
  t.next();
  t.next();
  assert.equal(t.prev(), true);
  assert.equal(t.state().index, 1);
  assert.equal(t.state().total, 5);
  t.finish();
  assert.equal(JSON.parse(s.read(TOUR_KEY)).how, 'done');
  assert.equal(t.state().status, 'done');
  assert.equal(t.next(), false, 'rien après la fin');
});

test('démarrer deux fois ne repart pas de zéro ; une visite finie peut être relancée', () => {
  const s = mem();
  const t = createTour({ steps: TOUR_STEPS, read: s.read, write: s.write });
  t.start({ auto: false });
  t.next();
  assert.equal(t.start({ auto: false }), false, 'déjà en cours');
  assert.equal(t.state().index, 1);
  t.skip();
  assert.equal(t.start({ auto: false }), true);
  assert.equal(t.state().index, 0);
});

test('bulle : à droite de la cible quand il y a de la place, sinon à gauche, en dessous, au-dessus ; toujours dans la fenêtre', () => {
  const view = { w: 1440, h: 900 };
  const size = { w: 320, h: 180 };
  let p = placeBubble({ x: 0, y: 100, w: 290, h: 700 }, size, view, { prefer: 'right' });
  assert.equal(p.side, 'right');
  assert.equal(p.left, 290 + 12);
  assert.ok(p.top >= 12 && p.top + size.h <= view.h - 12);
  p = placeBubble({ x: 1110, y: 100, w: 330, h: 700 }, size, view, { prefer: 'right' });
  assert.equal(p.side, 'left', 'pas de place à droite : à gauche');
  assert.equal(p.left, 1110 - 12 - size.w);
  p = placeBubble({ x: 0, y: 0, w: 1440, h: 48 }, size, view, { prefer: 'right' });
  assert.equal(p.side, 'bottom', 'barre pleine largeur : en dessous');
  assert.equal(p.top, 48 + 12);
  p = placeBubble({ x: 0, y: 852, w: 1440, h: 48 }, size, view, { prefer: 'bottom' });
  assert.equal(p.side, 'top');
  assert.equal(p.top, 852 - 12 - size.h);
  p = placeBubble({ x: 1400, y: 0, w: 40, h: 40 }, size, view, { prefer: 'bottom' });
  assert.ok(p.left + size.w <= view.w - 12 && p.left >= 12, 'cible dans le coin : bulle ramenée dans la fenêtre');
  p = placeBubble(null, size, view);
  assert.equal(p.side, 'center');
  assert.equal(p.left, Math.round((view.w - size.w) / 2));
  assert.equal(p.top, Math.round((view.h - size.h) / 2));
});

test('bulle : la cible est centrée sur l’axe libre et la flèche pointe vers elle', () => {
  const p = placeBubble({ x: 100, y: 100, w: 200, h: 100 }, { w: 300, h: 120 }, { w: 1440, h: 900 }, { prefer: 'bottom' });
  assert.equal(p.side, 'bottom');
  assert.equal(p.left, 100 + 100 - 150);
  assert.equal(p.arrow, 150, 'flèche au milieu de la bulle, face au centre de la cible');
  const q = placeBubble({ x: 0, y: 100, w: 200, h: 100 }, { w: 300, h: 120 }, { w: 1440, h: 900 }, { prefer: 'bottom' });
  assert.equal(q.left, 12, 'ramenée au bord');
  assert.equal(q.arrow, 100 - 12, 'la flèche suit la cible');
});

test('union de rectangles (Fichier + ❓) et découpe avec marge, jamais négative', () => {
  assert.deepEqual(unionRect([{ x: 10, y: 10, w: 20, h: 20 }, { x: 50, y: 5, w: 10, h: 10 }]), { x: 10, y: 5, w: 50, h: 25 });
  assert.equal(unionRect([]), null);
  assert.deepEqual(cutoutRect({ x: 4, y: 2, w: 100, h: 50 }, 8), { x: 0, y: 0, w: 112, h: 60 });
});
