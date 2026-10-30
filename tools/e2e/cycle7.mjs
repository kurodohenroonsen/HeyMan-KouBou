/* Cycle 7 : système de design — échelles fluides, jetons, expressions, presets, couleurs, CSS personnalisée. */
export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const cs = (sel, prop) => c.locator(sel).first().evaluate((e, p) => getComputedStyle(e)[p], prop);
  const px = v => parseFloat(v);

  /* --- 1. échelle de texte fluide --- */
  const h1 = c.locator('[data-type="heading"]:has(h1)').first();
  const h1Id = await h1.getAttribute('data-node');
  const h2Sel = '[data-type="heading"]:has(h2) h2';
  const h2Before = px(await cs(h2Sel, 'fontSize'));
  await page.click('[data-left="site"]');
  await t.wait(150);
  t.ok(await page.locator('[data-type-preview] li').count() === 7, 'panneau Site : aperçu des 7 tailles de texte');
  await page.fill('[data-type-token="maxRatio"]', '1.4');
  await page.press('[data-type-token="maxRatio"]', 'Enter');
  await t.wait(400);
  t.ok(px(await cs(h2Sel, 'fontSize')) > h2Before + 4, `ratio 1,4 : les titres grandissent (${h2Before} → ${px(await cs(h2Sel, 'fontSize'))} px)`);
  await page.click('[data-device="mobile"]');
  await t.wait(400);
  const h2Mobile = px(await cs(h2Sel, 'fontSize'));
  t.ok(h2Mobile < h2Before, `sur mobile, le même titre est plus petit sans aucun réglage (${h2Mobile} px)`);
  await page.click('[data-device="desktop"]');
  await t.wait(400);
  await page.fill('[data-space-token="maxSize"]', '24');
  await page.press('[data-space-token="maxSize"]', 'Enter');
  await t.wait(300);
  t.ok((await site()).tokens.space.maxSize === 24, 'échelle d’espacements modifiée');

  /* --- 2. jetons dans l'onglet Style --- */
  await h1.click();
  await page.click('[data-insp="style"]');
  await t.wait(150);
  await page.selectOption('#inspector [data-token-pick="fontSize"]', 'size:2xl');
  await t.wait(300);
  const sizeVar = await c.locator('html').evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--step-2xl'));
  t.ok(sizeVar.includes('clamp') && (await page.locator('#inspector [data-style="fontSize"]').inputValue()) === 'size:2xl', 'taille du titre choisie dans l’échelle (size:2xl)');
  const probe = await c.locator('body').evaluate(() => { const d = document.createElement('div'); d.style.fontSize = 'var(--step-2xl)'; document.body.append(d); const v = getComputedStyle(d).fontSize; d.remove(); return v; });
  t.ok(await cs(`[data-node="${h1Id}"] h1`, 'fontSize') === probe, 'la taille appliquée correspond au jeton');
  await page.locator('#inspector .style-group:has([data-style="paddingTop"])').evaluate(d => { d.open = true; });
  await page.selectOption('#inspector [data-token-pick="marginBottom"]', 'space:l');
  await t.wait(300);
  t.ok(px(await cs(`[data-node="${h1Id}"]`, 'marginBottom')) > 30, 'marge basse sur l’espacement « Grand »');

  /* --- 3. expressions --- */
  await page.locator('#inspector .style-group:has([data-style="maxWidth"])').evaluate(d => { d.open = true; });
  await page.fill('#inspector [data-style="maxWidth"]', 'min(100%, 20ch)');
  await page.press('#inspector [data-style="maxWidth"]', 'Enter');
  await t.wait(300);
  const w = await c.locator(`[data-node="${h1Id}"]`).evaluate(e => e.getBoundingClientRect().width);
  t.ok(w > 100 && w < 700 && (await cs(`[data-node="${h1Id}"]`, 'maxWidth')).startsWith('min('), `expression min(100%, 20ch) acceptée et appliquée (${Math.round(w)} px)`);
  await page.fill('#inspector [data-style="maxWidth"]', 'calc(1px) }body{display:none');
  await page.press('#inspector [data-style="maxWidth"]', 'Enter');
  await t.wait(300);
  t.ok(await page.locator('#inspector [data-style="maxWidth"][aria-invalid="true"]').count() === 1 && await c.locator('body').evaluate(b => getComputedStyle(b).display) !== 'none', 'expression malveillante refusée');

  /* --- 4. presets --- */
  const btns = c.locator('[data-type="button"]');
  const b1 = await btns.nth(0).getAttribute('data-node');
  const b2 = await btns.nth(1).getAttribute('data-node');
  const openFond = () => page.locator('#inspector .style-group:has([data-style-wrap="background"])').evaluate(d => { d.open = true; });
  await btns.nth(0).click();
  await page.click('[data-insp="style"]');
  await t.wait(150);
  await openFond();
  await page.click('#inspector [data-style-wrap="background"] [data-swatch="c3"]');
  await t.wait(200);
  await page.click('#inspector [data-preset-new]');
  await page.fill('#inspector [data-preset-name]', 'Bouton sombre');
  await page.click('#inspector [data-preset-create]');
  await t.wait(300);
  let s = await site();
  const pid = Object.keys(s.presets).find(k => s.presets[k].name === 'Bouton sombre');
  t.ok(!!pid && s.presets[pid].style.desktop.background === 'palette:c3', 'preset créé depuis le bouton (son style y passe)');
  t.ok(await c.locator(`[data-node="${b1}"].p-${pid}`).count() === 1, 'le bouton porte la classe du preset');

  await btns.nth(1).click();
  await t.wait(150);
  await page.selectOption('#inspector [data-preset-select]', pid);
  await t.wait(300);
  const dark = await cs(`[data-node="${b1}"] .btn`, 'backgroundColor');
  t.ok(await cs(`[data-node="${b2}"] .btn`, 'backgroundColor') === dark, 'preset appliqué au 2e bouton : même apparence');

  await page.click('#inspector [data-preset-edit]');
  await t.wait(150);
  t.ok((await page.locator('#inspector .style-head').textContent()).includes('Bouton sombre'), 'mode « modifier le preset » clairement indiqué');
  await openFond();
  await page.click('#inspector [data-style-wrap="background"] [data-swatch="c2"]');
  await t.wait(300);
  const c2 = await cs(`[data-node="${b1}"] .btn`, 'backgroundColor');
  t.ok(c2 !== dark && await cs(`[data-node="${b2}"] .btn`, 'backgroundColor') === c2, 'modifier le preset recolore les deux boutons');
  await page.click('#inspector [data-preset-edit]');
  await t.wait(150);

  await openFond();
  await page.click('#inspector [data-style-wrap="background"] [data-swatch="c5"]');
  await t.wait(300);
  t.ok(await cs(`[data-node="${b2}"] .btn`, 'backgroundColor') !== c2 && await cs(`[data-node="${b1}"] .btn`, 'backgroundColor') === c2, 'un réglage sur l’élément l’emporte sur le preset (seulement lui)');

  await page.click('#inspector [data-preset-default]');
  await t.wait(200);
  await page.click('[data-left="widgets"]');
  await page.click('.lib-item[data-type="button"]');
  await t.wait(300);
  const b3 = await page.evaluate(() => window.__atelier.selected);
  t.ok(await cs(`[data-node="${b3}"] .btn`, 'backgroundColor') === c2, 'preset par défaut : un nouveau bouton le reçoit');

  await btns.nth(0).click();
  await t.wait(150);
  await page.click('#inspector [data-preset-detach]');
  await t.wait(300);
  s = await site();
  const n1 = JSON.stringify(s).includes(`"id":"${b1}"`);
  t.ok(n1 && await cs(`[data-node="${b1}"] .btn`, 'backgroundColor') === c2 && await c.locator(`[data-node="${b1}"].p-${pid}`).count() === 0, 'détacher : l’apparence reste, le lien disparaît');

  /* --- 5. gestion des presets dans le panneau Site --- */
  await page.click('[data-left="site"]');
  await t.wait(150);
  t.ok(await page.locator(`[data-preset-row="${pid}"]`).count() === 1, 'panneau Site : liste des presets avec leur usage');
  await page.fill(`[data-preset-rename="${pid}"]`, 'Bouton principal');
  await page.press(`[data-preset-rename="${pid}"]`, 'Enter');
  await t.wait(200);
  t.ok((await site()).presets[pid].name === 'Bouton principal', 'preset renommé');
  await page.click(`[data-preset-delete="${pid}"]`);
  await t.wait(300);
  t.ok(!(await site()).presets[pid] && await cs(`[data-node="${b3}"] .btn`, 'backgroundColor') === c2, 'preset supprimé : les éléments gardent leur apparence');

  /* --- 6. couleurs --- */
  await page.click('#addColorBtn');
  await t.wait(200);
  t.ok(await page.locator('[data-palette="c7"]').count() === 1, 'couleur supplémentaire ajoutée (c7)');
  await page.fill('[data-palette-name="c7"]', 'Accent');
  await page.press('[data-palette-name="c7"]', 'Enter');
  await t.wait(150);
  await h1.click();
  await page.click('[data-insp="style"]');
  await t.wait(150);
  t.ok(await page.locator('#inspector [data-style-wrap="color"] [data-swatch="c7"]').count() === 1, 'la nouvelle couleur est proposée dans l’onglet Style');
  await page.fill('#inspector [data-style="color"]', '#123456');
  await page.press('#inspector [data-style="color"]', 'Enter');
  await t.wait(200);
  await page.click('[data-left="site"]');
  await t.wait(150);
  t.ok(await page.locator('[data-color-usage="#123456"]').count() === 1, 'couleur hors palette détectée');
  await page.selectOption('[data-color-usage="#123456"] [data-color-replace]', 'palette:c7');
  await t.wait(300);
  t.ok(!JSON.stringify((await site()).pages).includes('#123456') && JSON.stringify((await site()).pages).includes('palette:c7'), 'remplacée par la couleur de palette en un clic');

  /* --- 7. CSS personnalisée --- */
  await h1.click();
  await page.click('[data-insp="advanced"]');
  await page.fill('#inspector [data-adv="css"]', 'outline: 3px solid rgb(255, 0, 0)');
  await page.locator('#inspector [data-adv="css"]').blur();
  await t.wait(300);
  t.ok((await cs(`[data-node="${h1Id}"]`, 'outlineColor')) === 'rgb(255, 0, 0)', 'CSS personnalisée appliquée');
  await page.fill('#inspector [data-adv="css"]', 'color:red}body{display:none');
  await page.locator('#inspector [data-adv="css"]').blur();
  await t.wait(300);
  t.ok(await page.locator('#inspector [data-adv="css"][aria-invalid="true"]').count() === 1, 'CSS personnalisée dangereuse refusée');

  await page.screenshot({ path: `${t.shots}/cycle7-design.png` });
}
