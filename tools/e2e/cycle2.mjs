/* Cycle 2 : canevas, sélection, inspecteur, navigateur, bibliothèque, annuler. */
export default async function (t) {
  const { page } = t;
  const c = t.canvas();

  t.ok(await c.locator('[data-node][data-type="section"]').count() >= 2, 'le canevas affiche les sections de l’exemple');
  await page.click('[data-left="navigator"]');
  await t.wait(150);
  t.ok(await page.locator('#navTree [data-node-id]').count() > 5, 'le navigateur liste les éléments de la page');

  const heading = c.locator('[data-type="heading"]').first();
  await heading.hover();
  await t.wait(150);
  t.ok(await c.locator('#atelier-hover').isVisible(), 'survol : contour affiché');

  await heading.click();
  await t.wait(200);
  const headingId = await heading.getAttribute('data-node');
  t.ok(await page.evaluate(id => window.__atelier.selected === id, headingId), 'clic : le titre est sélectionné');
  t.ok(await page.locator('#inspector .insp-title').textContent().then(s => s.includes('Titre')), 'l’inspecteur affiche le titre');
  t.ok(await c.locator('#atelier-select').isVisible(), 'cadre de sélection affiché');
  t.ok(await page.locator(`#navTree [data-node-id="${headingId}"][aria-selected="true"]`).count() === 1, 'le navigateur surligne l’élément sélectionné');

  const target = await c.locator('main').evaluate(() => { const y = Math.min(300, document.documentElement.scrollHeight - innerHeight); window.scrollTo(0, y); return y; });
  await t.wait(100);
  const level = page.locator('#inspector [data-field="level"]');
  await level.selectOption('h3');
  await t.wait(300);
  t.ok(await c.locator(`[data-node="${headingId}"] h3`).count() === 1, 'changer le niveau met à jour le canevas');
  const after = await c.locator('html').evaluate(() => [window.scrollY, document.documentElement.scrollHeight - innerHeight]);
  t.ok(target > 20 && Math.abs(after[0] - Math.min(target, after[1])) < 5, `le défilement du canevas est conservé (${target} px)`);

  const input = page.locator('#inspector [data-field="text"][lang="fr"]');
  await input.fill('Titre modifié <test>');
  await t.wait(350);
  t.ok((await c.locator(`[data-node="${headingId}"]`).textContent()).includes('Titre modifié <test>'), 'saisie dans l’inspecteur reflétée et échappée');
  t.ok(await c.locator(`[data-node="${headingId}"] test`).count() === 0, 'aucune balise injectée');

  await page.keyboard.press('Escape');
  await page.locator('#inspector [data-field="text"][lang="fr"]').blur().catch(() => {});
  await c.locator(`[data-node="${headingId}"]`).click();
  await page.keyboard.press('Escape');
  await t.wait(150);
  const parentType = await page.evaluate(() => {
    const s = window.__atelier;
    return s.typeOf(s.selected);
  });
  t.ok(parentType === 'column', 'Échap sélectionne le parent (colonne)');

  await page.click('[data-left="widgets"]');
  const before = await c.locator('[data-type="button"]').count();
  await page.click('.lib-item[data-type="button"]');
  await t.wait(300);
  t.ok(await c.locator('[data-type="button"]').count() === before + 1, 'clic dans la bibliothèque : bouton ajouté');
  t.ok(await page.evaluate(() => window.__atelier.typeOf(window.__atelier.selected) === 'button'), 'le nouveau bouton est sélectionné');

  await page.keyboard.press('Control+z');
  await t.wait(300);
  t.ok(await c.locator('[data-type="button"]').count() === before, 'Ctrl+Z annule l’ajout');
  await page.keyboard.press('Control+Shift+z');
  await t.wait(300);
  t.ok(await c.locator('[data-type="button"]').count() === before + 1, 'Ctrl+Maj+Z rétablit');

  const sel = await page.evaluate(() => window.__atelier.selected);
  await page.click('#selToolbar [data-act="duplicate"], #inspector [data-act="duplicate"]');
  await t.wait(300);
  t.ok(await c.locator('[data-type="button"]').count() === before + 2, 'dupliquer');
  await page.keyboard.press('Delete');
  await t.wait(300);
  t.ok(await c.locator('[data-type="button"]').count() === before + 1, 'Suppr supprime la sélection');

  await page.click('[data-left="navigator"]');
  const row = page.locator('#navTree [data-type="row"]').first();
  await row.click();
  await t.wait(200);
  await page.click('#inspector [data-layout="4-4-4"]');
  await t.wait(300);
  const rowId = await page.evaluate(() => window.__atelier.selected);
  t.ok(await c.locator(`[data-node="${rowId}"] > [data-type="column"]`).count() === 3, 'disposition 3 colonnes appliquée à la rangée');

  await page.click('[data-insp="advanced"]');
  await page.locator('#inspector [data-adv="hide-desktop"]').check();
  await t.wait(300);
  t.ok(await c.locator(`[data-node="${rowId}"]`).evaluate(e => getComputedStyle(e).display === 'none' || parseFloat(getComputedStyle(e).opacity) < 0.5), 'masquer sur ordinateur appliqué');
  await page.locator('#inspector [data-adv="hide-desktop"]').uncheck();
  await t.wait(200);

  await page.screenshot({ path: `${t.shots}/cycle2-editeur.png` });
}
