/* Cycle 19 : banc d'essai de l'IA locale — bon faux Nano (100/100), mauvais faux Nano (échecs détectés), arrêt, rapport. */
import { readFileSync } from 'node:fs';
import { goodNano, badNano } from '../fake-nano.mjs';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture } from './logs.mjs';
import { BENCH_CASES } from '../../core/bench.js';

export default async function (t) {
  const { page } = t;
  const install = (fn, slow = 0) => page.evaluate(([src, ms]) => {
    // eslint-disable-next-line no-new-func
    const p = (new Function(`return (${src})()`))();
    if (ms) { const orig = p.prompt.bind(p); p.prompt = async r => { await new Promise(x => setTimeout(x, ms)); return orig(r); }; }
    window.__atelierAI = p;
  }, [fn.toString(), slow]);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  /* ===== 1. Bon modèle : 100 / 100 ===== */
  await install(goodNano);
  let s = await mark(page);
  await page.click('#aiBtn');
  await page.waitForSelector('#aiDialog[open]');
  await page.click('#aiDialog [data-ai-bench]');
  await page.waitForSelector('#benchDialog[open]');
  await page.waitForFunction(() => /Prêt/.test(document.querySelector('#benchDialog [data-bench-status]')?.textContent || ''));
  t.ok(await page.locator('#benchDialog [data-bench-api]').count() >= 6, 'banc : état de chaque API affiché');
  await page.click('#benchDialog [data-bench-run]');
  await page.waitForFunction(() => /Note/.test(document.querySelector('#benchDialog [data-bench-summary]')?.textContent || ''), null, { timeout: 30000 });
  t.ok(await page.locator('#benchDialog [data-bench-case]').count() === BENCH_CASES.length, `banc : ${BENCH_CASES.length} cas lancés`);
  t.ok(/Note : 100 \/ 100/.test(await page.textContent('#benchDialog [data-bench-summary]')), `banc : ${await page.textContent('#benchDialog [data-bench-summary]')}`);
  await page.screenshot({ path: `${t.shots}/c19-banc.png` });
  await page.click('#benchDialog [data-bench-copy]');
  await t.wait(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  t.ok(!clip || /^# Banc d’essai de l’IA locale/.test(clip), 'rapport copié (Markdown)');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#benchDialog [data-bench-download]')]);
  const json = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  t.ok(json.results.length === BENCH_CASES.length && json.summary.score === 100 && /Résultats/.test(json.report) && Array.isArray(json.log), 'rapport .json : résultats, note, rapport, journal de l’IA');
  let es = await since(page, s);
  expectCodes(t, es, ['bench.open', 'bench.run.start', 'bench.env', 'bench.case', 'ai.extract.start', 'ai.plan.start', 'bench.run.ok', 'bench.download'], 'banc : bon modèle');
  t.ok(es.some(e => e.code === 'bench.copy' || e.code === 'bench.copy-fail'), 'banc : copie notée');
  expectNoErrors(t, es, 'banc : bon modèle');
  capture('banc-bon', es.filter(e => /^bench\./.test(e.code)));
  await page.keyboard.press('Escape');

  /* ===== 2. Mauvais modèle : échecs, erreurs, cas ignorés ===== */
  await install(badNano);
  s = await mark(page);
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'banc d’essai');
  await t.wait(150);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#benchDialog[open]');
  await page.waitForFunction(() => !/Vérification/.test(document.querySelector('#benchDialog [data-bench-status]')?.textContent || ''));
  await page.click('#benchDialog [data-bench-run]');
  await page.waitForFunction(() => /Note/.test(document.querySelector('#benchDialog [data-bench-summary]')?.textContent || ''), null, { timeout: 30000 });
  const score = Number((await page.textContent('#benchDialog [data-bench-summary]')).match(/Note : (\d+)/)?.[1]);
  t.ok(score < 40, `banc : mauvais modèle noté ${score} / 100`);
  t.ok(await page.locator('#benchDialog [data-bench-status="skipped"]').count() >= 3, 'banc : cas sans API ignorés');
  t.ok(await page.locator('#benchDialog [data-bench-status="error"]').count() >= 1 && await page.locator('#benchDialog [data-bench-status="fail"]').count() >= 3, 'banc : erreurs et échecs');
  t.ok(/au moins 10 % plus court/.test(await page.textContent('#benchDialog [data-bench-case="rewrite-shorter"]')), 'banc : la vérification ratée est expliquée');
  es = await since(page, s);
  expectCodes(t, es, ['cmdk.run', 'bench.open', 'bench.run.start', 'bench.case', 'bench.check-fail', 'bench.run.ok'], 'banc : mauvais modèle');
  capture('banc-mauvais', es.filter(e => /^bench\./.test(e.code)));
  await page.keyboard.press('Escape');

  /* ===== 3. Arrêt en cours ; modèle à télécharger signalé ===== */
  await install(goodNano, 120);
  await page.evaluate(() => { window.__atelierAI.status.summarizer = 'downloadable'; });
  s = await mark(page);
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'banc d’essai');
  await t.wait(150);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#benchDialog[open]');
  await page.waitForFunction(() => /télécharger/i.test(document.querySelector('#benchDialog [data-bench-status]')?.textContent || ''));
  await page.click('#benchDialog [data-bench-run]');
  await page.waitForSelector('#benchDialog [data-bench-case]');
  await page.click('#benchDialog [data-bench-stop]');
  await page.waitForFunction(() => /Arrêté/.test(document.querySelector('#benchDialog [data-bench-status]')?.textContent || ''), null, { timeout: 15000 });
  t.ok(await page.locator('#benchDialog [data-bench-case]').count() < BENCH_CASES.length, 'banc : arrêté avant la fin');
  es = await since(page, s);
  expectCodes(t, es, ['bench.downloadable', 'bench.run.start', 'bench.run.cancel'], 'banc : arrêt');
  capture('banc-arret', es.filter(e => /^bench\./.test(e.code)));
  await page.keyboard.press('Escape');
}
