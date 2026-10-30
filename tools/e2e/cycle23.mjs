/* Cycle 23 : panneaux de gauche et de droite redimensionnables (souris, clavier, double-clic, largeur retenue). */
import { mark, since, expectCodes, capture } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(8000);
  const w = sel => page.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().width), sel);
  const box = sel => page.locator(sel).boundingBox();
  const drag = async (sel, dx) => {
    const b = await box(sel);
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y);
    await page.mouse.up();
    await t.wait(250);
  };

  t.ok(await page.locator('.resizer--left[role="separator"]').count() === 1 && await page.locator('.resizer--right[role="separator"]').count() === 1, 'deux poignées (role="separator")');
  const left0 = await w('.panel--left');
  const right0 = await w('#inspector');
  const stage0 = await w('#stage');

  /* ===== 1. Glisser la poignée de gauche (en passant au-dessus du canevas) ===== */
  let s = await mark(page);
  await drag('.resizer--left', 120);
  const left1 = await w('.panel--left');
  t.ok(Math.abs(left1 - (left0 + 120)) <= 3, `gauche : ${left0} → ${left1} px (+120)`);
  t.ok(Math.abs(await w('#stage') - (stage0 - 120)) <= 3, 'le canevas laisse la place');
  t.ok(await page.evaluate(() => !document.body.classList.contains('is-resizing')), 'fin du glisser : plus de mode redimensionnement');
  let es = await since(page, s);
  expectCodes(t, es, ['ui.panel-resize'], 'redimensionner');
  t.ok(es.find(e => e.code === 'ui.panel-resize')?.data?.side === 'left', 'journal : côté gauche, largeurs');
  await page.waitForFunction(() => /canvas\.scale/.test(JSON.stringify(window.atelierDebug.entries().slice(-20).map(e => e.code))), null, { timeout: 3000 }).then(() => t.ok(true, 'canevas remis à l’échelle'), () => t.ok(false, 'canevas remis à l’échelle'));

  /* ===== 2. Glisser la poignée de droite vers la gauche = plus large ===== */
  await drag('.resizer--right', -90);
  const right1 = await w('#inspector');
  t.ok(Math.abs(right1 - (right0 + 90)) <= 3, `droite : ${right0} → ${right1} px (+90)`);
  await page.screenshot({ path: `${t.shots}/c23-panneaux.png` });

  /* ===== 3. Bornes : on ne peut pas écraser le canevas ni réduire à rien ===== */
  await drag('.resizer--left', 900);
  const stageMin = await w('#stage');
  t.ok(stageMin >= 418, `canevas gardé (≥ 420 px) : ${stageMin}`);
  await drag('.resizer--left', -900);
  t.ok(await w('.panel--left') >= 218, `minimum à gauche : ${await w('.panel--left')}`);

  /* ===== 4. Clavier : flèches, Maj, Début ; aria-valuenow suit ===== */
  await page.focus('.resizer--left');
  const k0 = await w('.panel--left');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  t.ok(Math.abs(await w('.panel--left') - (k0 + 80)) <= 2, `clavier : → puis Maj+→ = +80 (${k0} → ${await w('.panel--left')})`);
  t.ok(Number(await page.getAttribute('.resizer--left', 'aria-valuenow')) === await w('.panel--left'), 'aria-valuenow = largeur');

  /* ===== 5. Largeur retenue après rechargement ===== */
  const kept = { left: await w('.panel--left'), right: await w('#inspector') };
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
  t.ok(Math.abs(await w('.panel--left') - kept.left) <= 2 && Math.abs(await w('#inspector') - kept.right) <= 2, `retenue après rechargement (${kept.left} / ${kept.right})`);
  await page.click('#commentsBtn');
  await t.wait(250);
  t.ok(Math.abs(await w('#reviewPanel') - kept.right) <= 2, `panneau des commentaires : même largeur (${await w('#reviewPanel')})`);
  await page.click('#commentsBtn');
  await t.wait(200);

  /* ===== 6. Double-clic : largeur d'origine ===== */
  s = await mark(page);
  await page.dblclick('.resizer--left');
  await page.dblclick('.resizer--right');
  await t.wait(250);
  t.ok(Math.abs(await w('.panel--left') - left0) <= 2 && Math.abs(await w('#inspector') - right0) <= 2, `double-clic : largeurs d’origine (${await w('.panel--left')} / ${await w('#inspector')})`);
  es = await since(page, s);
  expectCodes(t, es, ['ui.panel-reset'], 'largeur d’origine');
  capture('panneaux-largeur', es.filter(e => /^ui\.panel/.test(e.code)));

  /* ===== 7. Infobulle et nom dans la langue de l'interface ===== */
  const lb = await box('.resizer--left');
  await page.mouse.move(lb.x + lb.width / 2, lb.y + 200);
  await t.wait(500);
  t.ok(/Largeur|largeur/.test(await page.evaluate(() => document.querySelector('#atelierTip:not([hidden])')?.textContent || '')), 'infobulle de la poignée');
  await page.goto(`${t.base}?lang=ja&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
  t.ok(/[぀-ヿ一-龯]/.test(await page.getAttribute('.resizer--left', 'aria-label')), `japonais : ${await page.getAttribute('.resizer--left', 'aria-label')}`);
  await page.goto(`${t.base}?lang=fr&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
}
