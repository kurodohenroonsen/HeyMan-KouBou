import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BENCH_GROUPS, BENCH_CASES, benchFixtures, runBench, benchSummary, benchReport } from '../core/bench.js';
import { createAI } from '../core/ai-tasks.js';
import { goodNano, badNano } from '../tools/fake-nano.mjs';

const IMAGES = { poster: { type: 'image/png', size: 40000, fake: 'poster' }, shapes: { type: 'image/png', size: 9000, fake: 'shapes' } };
const fx = () => benchFixtures({ today: '2026-10-29', images: IMAGES });

test('catalogue : groupes, identifiants uniques, chaque cas a des vérifications', () => {
  const ids = BENCH_CASES.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(BENCH_CASES.length >= 16);
  for (const c of BENCH_CASES) {
    assert.ok(BENCH_GROUPS[c.group], `${c.id} : groupe ${c.group}`);
    assert.ok(c.checks.length >= 1, `${c.id} : vérifications`);
    assert.ok(typeof c.label === 'string' && c.label.length > 5);
    assert.ok(Array.isArray(c.needs));
  }
  for (const g of ['writing', 'seo', 'content', 'assistant', 'languages']) assert.ok(BENCH_CASES.some(c => c.group === g), g);
});

test('fixtures : site d’exemple avec page, collections, article et commentaires ; images fournies', () => {
  const f = fx();
  assert.ok(f.site.pages.length >= 1 && f.site.pages[0].root.children.length >= 2);
  for (const k of ['events', 'members', 'news']) assert.ok(f.cols[k], k);
  assert.ok(Object.keys(f.site.review.comments).length === 3);
  assert.equal(f.images.poster, IMAGES.poster);
});

test('banc complet avec un bon modèle : tout est réussi', async () => {
  const ai = createAI(goodNano());
  const prog = [];
  const res = await runBench(ai, { fx: fx(), has: goodNano().has, onProgress: r => prog.push(r.id) });
  const bad = res.filter(r => r.status !== 'ok');
  assert.deepEqual(bad.map(r => `${r.id}: ${r.status} ${r.checks?.filter(c => !c.ok).map(c => c.label + ' — ' + c.detail).join(' | ') || r.error || ''}`), []);
  assert.equal(prog.length, BENCH_CASES.length);
  for (const r of res) { assert.equal(typeof r.ms, 'number'); assert.ok(r.output !== undefined); }
  const s = benchSummary(res);
  assert.equal(s.score, 100);
  assert.equal(s.counts.ok, BENCH_CASES.length);
});

test('banc avec un mauvais modèle : échecs, erreurs et cas ignorés détectés, avec le détail', async () => {
  const p = badNano();
  const res = await runBench(createAI(p), { fx: fx(), has: p.has });
  const by = id => res.find(r => r.id === id);
  assert.equal(by('rewrite-shorter').status, 'fail');
  assert.match(by('rewrite-shorter').checks.find(c => !c.ok).detail, /car\./);
  assert.equal(by('proofread').status, 'fail');
  assert.equal(by('seo-description').status !== 'ok', true);
  assert.equal(by('keywords').status, 'error');
  assert.match(by('keywords').error, /illisible/i);
  assert.equal(by('alt-text').status, 'skipped', 'images non prises en charge : ignoré');
  assert.equal(by('poster').status, 'skipped');
  assert.equal(by('nl-description').status, 'skipped', 'pas de traducteur : ignoré');
  assert.ok(['error', 'fail'].includes(by('members-text').status));
  assert.equal(by('plan-refuse').status, 'ok', 'une demande hors liste refusée reste un succès');
  assert.equal(by('plan-faq').status, 'fail');
  const s = benchSummary(res);
  assert.ok(s.score < 40, `note ${s.score}`);
  assert.ok(s.counts.skipped >= 3 && s.counts.error >= 1 && s.counts.fail >= 3);
});

test('sélection de groupes et arrêt en cours', async () => {
  const p = goodNano();
  const only = await runBench(createAI(p), { fx: fx(), has: p.has, groups: ['assistant'] });
  assert.ok(only.length >= 4 && only.every(r => r.group === 'assistant'));
  const ctrl = { stopped: false };
  let n = 0;
  const res = await runBench(createAI(goodNano()), { fx: fx(), has: p.has, signal: ctrl, onProgress: () => { if (++n === 3) ctrl.stopped = true; } });
  assert.equal(res.filter(r => r.status !== 'stopped').length, 3);
  assert.ok(res.some(r => r.status === 'stopped'));
});

test('rapport : environnement, note, tableau des cas, détail des échecs', async () => {
  const p = badNano();
  const res = await runBench(createAI(p), { fx: fx(), has: p.has, groups: ['writing', 'seo'] });
  const md = benchReport(res, { navigateur: 'Chrome 148', état: 'prompt=available multimodal=unavailable', params: { defaultTemperature: 1, defaultTopK: 3 } });
  assert.match(md, /^# Banc d’essai de l’IA locale/);
  assert.match(md, /navigateur : Chrome 148/);
  assert.match(md, /Note : \d+ \/ 100/);
  assert.match(md, /\| Cas \| Statut \| Durée \|/);
  assert.match(md, /Reformuler : plus court/);
  assert.match(md, /## Détail des échecs/);
  assert.match(md, /✗ /);
  assert.ok(md.length < 20000);
});
