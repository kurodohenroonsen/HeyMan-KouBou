/* Cycle 3 : styles responsives, survol, styles globaux, copier/coller le style. */
export default async function (t) {
  /* Cycle 30 : réglages experts (dimensions, disposition, effets, classes, CSS) cachés en mode simple, le mode par défaut */
  await t.page.evaluate(() => window.__atelier.setExpert(true));
  const { page } = t;
  const c = t.canvas();
  const cs = (sel, prop) => c.locator(sel).first().evaluate((e, p) => getComputedStyle(e)[p], prop);

  const h1 = c.locator('[data-type="heading"]:has(h1)').first();
  await h1.click();
  const h1Id = await h1.getAttribute('data-node');
  await page.click('[data-insp="style"]');
  await t.wait(150);
  t.ok(await page.locator('#inspector [data-style="fontSize"]').count() === 1, 'onglet Style : champ Taille présent');
  t.ok((await page.locator('#inspector .style-head').textContent()).includes('Ordinateur'), 'l’onglet indique l’appareil réglé');

  await page.fill('#inspector [data-style="fontSize"]', '80px');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');
  await t.wait(300);
  t.ok(await cs(`[data-node="${h1Id}"] h1`, 'fontSize') === '80px', 'ordinateur : taille 80 px appliquée');

  await page.click('[data-device="mobile"]');
  await t.wait(400);
  t.ok(await page.locator('#inspector [data-style="fontSize"]').getAttribute('placeholder').then(p => (p || '').includes('2.2rem') || (p || '').includes('80px')), 'mobile : la valeur héritée est indiquée');
  await page.fill('#inspector [data-style="fontSize"]', '30');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');
  await t.wait(300);
  t.ok(await cs(`[data-node="${h1Id}"] h1`, 'fontSize') === '30px', 'mobile : « 30 » devient 30 px et s’applique');
  t.ok(await page.evaluate(id => window.__atelier.site.pages[0].root && JSON.stringify(window.__atelier.site).includes('"fontSize":"30px"'), h1Id), 'la valeur mobile est enregistrée');

  await page.click('[data-device="tablet"]');
  await t.wait(400);
  t.ok(await cs(`[data-node="${h1Id}"] h1`, 'fontSize') === '80px', 'tablette : hérite de l’ordinateur (80 px)');

  await page.click('[data-device="mobile"]');
  await t.wait(400);
  await page.click('#inspector [data-reset="fontSize"]');
  await t.wait(300);
  t.ok(!(await page.evaluate(() => JSON.stringify(window.__atelier.site).includes('"fontSize":"30px"'))), 'réinitialiser supprime la valeur mobile');

  await page.fill('#inspector [data-style="fontSize"]', '12pt');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');
  await t.wait(300);
  t.ok(await page.locator('#inspector [data-style="fontSize"][aria-invalid="true"]').count() === 1, 'valeur invalide signalée et refusée');
  await page.fill('#inspector [data-style="fontSize"]', '');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');

  await page.click('[data-device="desktop"]');
  await t.wait(400);
  await page.click('#inspector [data-style-copy]');
  const other = c.locator('[data-type="heading"]:has(h2)').first();
  await other.click();
  const otherId = await other.getAttribute('data-node');
  await t.wait(150);
  await page.click('#inspector [data-act="pasteStyle"]');
  await t.wait(300);
  t.ok(await cs(`[data-node="${otherId}"] h2`, 'fontSize') === '80px', 'coller le style sur un autre titre');

  const btn = c.locator('[data-type="button"]').first();
  await btn.click();
  const btnId = await btn.getAttribute('data-node');
  await t.wait(150);
  await page.click('[data-insp="style"]');
  await page.click('#inspector [data-style-state="hover"]');
  await t.wait(150);
  t.ok(await page.locator('#inspector [data-style="fontSize"]').count() === 0, 'survol : seules les propriétés de survol sont proposées');
  await page.click('#inspector [data-style-wrap="background"] [data-swatch="c3"]');
  await t.wait(300);
  const css = await c.locator('#atelier-css').textContent();
  t.ok(new RegExp(`\\.n-${btnId} \\.btn:hover\\{[^}]*background-color:var\\(--c3\\)`).test(css), 'survol : fond du bouton réglé sur la couleur de palette 3');
  await page.click('#inspector [data-style-state="normal"]');

  await page.click('[data-left="site"]');
  await t.wait(150);
  await page.locator('[data-palette="c1"]').evaluate(e => { e.value = '#0055aa'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await t.wait(400);
  t.ok(await cs(`[data-node="${btnId}"] .btn`, 'backgroundColor') === 'rgb(0, 85, 170)', 'palette globale : la couleur 1 recolore le bouton');
  await page.selectOption('[data-font="heading"]', 'georgia');
  await t.wait(500);
  t.ok((await cs(`[data-node="${h1Id}"] h1`, 'fontFamily')).includes('Georgia'), 'police des titres changée globalement');

  await page.click('[data-left="navigator"]');
  await page.locator('#navTree [data-type="column"]').first().click();
  await page.click('[data-insp="style"]');
  await t.wait(150);
  await page.fill('#inspector [data-style="span"]', '6');
  await page.press('#inspector [data-style="span"]', 'Enter');
  await t.wait(300);
  const colId = await page.evaluate(() => window.__atelier.selected);
  t.ok((await cs(`[data-node="${colId}"]`, 'gridColumnStart')) === 'span 6', 'largeur de colonne réglée à 6/12');

  await page.locator('#inspector .style-group:has([data-style="paddingTop"])').evaluate(d => { d.open = true; });
  await page.fill('#inspector [data-style="paddingTop"]', '40px');
  await page.press('#inspector [data-style="paddingTop"]', 'Enter');
  await t.wait(300);
  t.ok(await cs(`[data-node="${colId}"]`, 'paddingTop') === '40px', 'marge intérieure haute appliquée');

  await page.screenshot({ path: `${t.shots}/cycle3-styles.png` });
}
