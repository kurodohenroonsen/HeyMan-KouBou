import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SELFTEST_CASES, pickCases, checkCodes, unexpectedErrors, caseResult, selftestSummary, selftestReport, stableJson } from '../core/selftest.js';

const E = (code, level = 'debug', extra = {}) => ({ seq: 1, t: Date.UTC(2026, 9, 29, 10), rel: 0, level, code, scope: code.split('.')[0], msg: `message ${code}`, data: extra.data, flow: null, ms: null });

test('catalogue : identifiants uniques, chapitre, titre, codes attendus', () => {
  const ids = SELFTEST_CASES.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(SELFTEST_CASES.length >= 20);
  for (const c of SELFTEST_CASES) {
    assert.ok(Number.isInteger(c.chapter) && c.chapter >= 0 && c.chapter <= 14, `${c.id} : chapitre`);
    assert.ok(c.title.length > 8, `${c.id} : titre`);
    assert.ok(Array.isArray(c.expect) && c.expect.every(x => /^[a-z0-9]+(\.[a-z0-9-]+)+(\|[a-z0-9]+(\.[a-z0-9-]+)+)*$/.test(x)), `${c.id} : codes`);
    assert.ok(Array.isArray(c.needs));
  }
  for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13]) assert.ok(SELFTEST_CASES.some(c => c.chapter === n), `chapitre ${n} couvert`);
  assert.ok(SELFTEST_CASES.some(c => c.needs.includes('ai')) && SELFTEST_CASES.some(c => c.needs.includes('publish')));
});

test('choix des cas : identifiants, chapitres, exclusions', () => {
  assert.equal(pickCases(SELFTEST_CASES).length, SELFTEST_CASES.length);
  assert.deepEqual(pickCases(SELFTEST_CASES, { only: ['pages'] }).map(c => c.id), ['pages']);
  const ch4 = pickCases(SELFTEST_CASES, { only: [4] });
  assert.ok(ch4.length >= 3 && ch4.every(c => c.chapter === 4));
  assert.deepEqual(pickCases(SELFTEST_CASES, { only: ['04'] }).map(c => c.id), ch4.map(c => c.id));
  const noAi = pickCases(SELFTEST_CASES, { skip: ['demander', 13] });
  assert.ok(!noAi.some(c => c.id === 'demander' || c.chapter === 13));
  assert.equal(pickCases(SELFTEST_CASES, { only: 'pages' }).length, 1, 'une chaîne seule est acceptée');
  assert.equal(pickCases(SELFTEST_CASES, { only: ['inconnu'] }).length, 0);
});

test('codes attendus : présents, manquants, alternatives a|b', () => {
  const es = [E('page.add'), E('store.commit'), E('log.copy-fail', 'warn')];
  assert.deepEqual(checkCodes(es, ['page.add', 'page.delete', 'log.copy|log.copy-fail']), { missing: ['page.delete'], seen: ['page.add', 'log.copy|log.copy-fail'] });
  assert.deepEqual(checkCodes([], []).missing, []);
});

test('erreurs inattendues : niveau error seulement, motifs autorisés', () => {
  const es = [E('a.b', 'warn'), E('publish.test.fail', 'error'), E('image.import.fail', 'error'), E('app.uncaught', 'error')];
  assert.deepEqual(unexpectedErrors(es).map(e => e.code), ['publish.test.fail', 'image.import.fail', 'app.uncaught']);
  assert.deepEqual(unexpectedErrors(es, ['publish.test.*', 'image.import.fail']).map(e => e.code), ['app.uncaught']);
});

test('statut d’un cas : réussi, échoué, erreur, ignoré', () => {
  const c = SELFTEST_CASES.find(x => x.id === 'pages');
  const okEs = c.expect.map(x => E(x.split('|')[0]));
  const ok = caseResult(c, { checks: [{ ok: true, label: 'page créée' }], entries: okEs, ms: 120 });
  assert.equal(ok.status, 'ok');
  assert.equal(ok.ms, 120);
  const bad = caseResult(c, { checks: [{ ok: false, label: 'page créée', detail: 'attendu 3, lu 2' }], entries: okEs.slice(1), ms: 80 });
  assert.equal(bad.status, 'fail');
  assert.deepEqual(bad.missing, [c.expect[0]]);
  assert.equal(bad.failed.length, 1);
  const err = caseResult(c, { checks: [], entries: [...okEs, E('app.uncaught', 'error')], ms: 5 });
  assert.equal(err.status, 'fail', 'une erreur inattendue fait échouer');
  assert.equal(err.errors[0].code, 'app.uncaught');
  const ex = caseResult(c, { checks: [], entries: okEs, error: new Error('élément introuvable : #addPageBtn'), ms: 5 });
  assert.equal(ex.status, 'error');
  assert.match(ex.cause, /#addPageBtn/);
  const sk = caseResult(c, { skipped: 'pas d’adresse de publication' });
  assert.equal(sk.status, 'skipped');
  assert.equal(sk.reason, 'pas d’adresse de publication');
});

test('résumé : comptes et note (sans les ignorés)', () => {
  const r = [{ status: 'ok' }, { status: 'ok' }, { status: 'ok' }, { status: 'fail' }, { status: 'skipped' }, { status: 'error' }];
  const s = selftestSummary(r);
  assert.deepEqual({ ...s }, { total: 6, ok: 3, fail: 1, error: 1, skipped: 1, score: 60 });
  assert.equal(selftestSummary([]).score, 0);
  assert.equal(selftestSummary([{ status: 'skipped' }]).score, 0);
});

test('rapport Markdown : résultat, retour arrière, tableau, détails, journal', () => {
  const pages = SELFTEST_CASES.find(x => x.id === 'pages');
  const ajout = SELFTEST_CASES.find(x => x.id === 'ajout');
  const results = [
    caseResult(pages, { checks: [{ ok: true, label: 'page créée' }], entries: pages.expect.map(x => E(x.split('|')[0])), ms: 300 }),
    caseResult(ajout, { checks: [{ ok: false, label: 'un bouton de plus', detail: 'attendu 3, lu 2' }], entries: [E('store.commit'), E('library.insert-fail', 'error')], ms: 200 }),
    caseResult(SELFTEST_CASES.find(x => x.id === 'publication'), { skipped: 'pas d’adresse de publication' })
  ];
  const md = selftestReport({
    results,
    summary: selftestSummary(results),
    rollback: { ok: true, same: true, name: 'MAB', pages: 6, versions: 3, assets: 1 },
    env: { navigateur: 'Chrome 141', version: '20' },
    options: { ai: 'fake' },
    started: '2026-10-29T10:00:00.000Z',
    ms: 4200,
    issues: [E('net.fail', 'warn')]
  });
  assert.match(md, /^# Auto-test d’Atelier/);
  assert.match(md, /1 \/ 2 réussis/);
  assert.match(md, /Note : 50 \/ 100/);
  assert.match(md, /Retour arrière : ✓/);
  assert.match(md, /\| Créer puis supprimer une page \| 4 \| ✓ réussi \|/);
  assert.match(md, /ignoré — pas d’adresse de publication/);
  assert.match(md, /### ✗ /);
  assert.match(md, /un bouton de plus — attendu 3, lu 2/);
  assert.match(md, /journal attendu manquant : `library\.insert`/);
  assert.match(md, /erreur inattendue : `library\.insert-fail`/);
  assert.match(md, /```\n.*library\.insert-fail/s);
  assert.match(md, /net\.fail/);
  assert.match(md, /navigateur : Chrome 141/);
  assert.match(md, /faux modèle/);
  const bad = selftestReport({ results, summary: selftestSummary(results), rollback: { ok: false, same: false, problems: ['projet différent'] }, env: {}, options: {}, started: '', ms: 1 });
  assert.match(bad, /Retour arrière : ✗/);
  assert.match(bad, /atelierDebug\.rollback\(\)/);
});

test('JSON stable : l’ordre des clés ne compte pas, les valeurs si', () => {
  assert.equal(stableJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } }), stableJson({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }));
  assert.notEqual(stableJson({ a: [1, 2] }), stableJson({ a: [2, 1] }));
  assert.equal(stableJson({ a: undefined, b: 1 }), stableJson({ b: 1 }));
});
