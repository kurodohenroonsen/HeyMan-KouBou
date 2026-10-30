/* Cycle 4 : glisser-déposer (bibliothèque, canevas, navigateur), édition directe, mise en forme, menu contextuel, raccourcis. */
export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const S = () => page.evaluate(() => window.__atelier);
  const kids = id => page.evaluate(id => {
    const find = (n, i) => n.id === i ? n : (n.children || []).reduce((a, k) => a || find(k, i), null);
    const s = window.__atelier; const p = s.site.pages.find(p => p.id === s.pageId) || s.site.pages[0];
    return (find(p.root, id)?.children || []).map(k => ({ id: k.id, type: k.type }));
  }, id);
  const parentOf = id => page.evaluate(id => {
    const s = window.__atelier; const p = s.site.pages.find(p => p.id === s.pageId) || s.site.pages[0];
    let res = null;
    const walk = (n) => { for (const k of n.children || []) { if (k.id === id) res = n.id; walk(k); } };
    walk(p.root); return res;
  }, id);
  const count = type => page.evaluate(type => JSON.stringify(window.__atelier.site.pages[0].root).split(`"type":"${type}"`).length - 1, type);

  /* point de la page (éditeur) correspondant à un élément du canevas ; fy = fraction verticale */
  async function canvasPoint(selector, fy = 0.5, fx = 0.5) {
    const box = await page.locator('#canvas').boundingBox();
    if (!selector.startsWith('#selToolbar')) await c.locator(selector).first().evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await t.wait(120);
    const r = await c.locator(selector).first().evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    const scale = await page.evaluate(() => { const f = document.querySelector('#canvas'); return f.getBoundingClientRect().width / f.offsetWidth; });
    return { x: box.x + (r.x + r.w * fx) * scale, y: box.y + (r.y + r.h * fy) * scale };
  }
  async function drag(from, to) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await t.wait(80);
    await page.mouse.move(to.x, to.y + 1);
    await t.wait(80);
  }
  const center = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

  /* --- 1. bibliothèque → colonne précise --- */
  await page.click('[data-left="widgets"]');
  await t.wait(100);
  const imgCol = await c.locator('[data-type="image"]').first().evaluate(e => e.closest('[data-type="column"]').getAttribute('data-node'));
  const before = await kids(imgCol);
  await drag(await center(page.locator('.lib-item[data-type="button"]')), await canvasPoint(`[data-node="${imgCol}"] [data-type="image"]`, 0.15));
  t.ok(await page.locator('#dragGhost').isVisible(), 'pendant le glisser : vignette affichée');
  t.ok(await c.locator('#atelier-drop').isVisible(), 'pendant le glisser : indicateur de dépôt affiché');
  await page.mouse.up();
  await t.wait(300);
  const after = await kids(imgCol);
  t.ok(after.length === before.length + 1 && after[0].type === 'button', 'bouton déposé au-dessus de l’image, dans la bonne colonne');
  t.ok((await S()).selected === after[0].id, 'le widget déposé est sélectionné');
  t.ok(!(await page.locator('#dragGhost').isVisible()) && !(await c.locator('#atelier-drop').isVisible()), 'après le dépôt : vignette et indicateur masqués');
  await page.keyboard.press('Control+z');
  await t.wait(200);
  t.ok((await kids(imgCol)).length === before.length, 'Ctrl+Z annule le dépôt en une étape');

  /* --- 2. structure → fin de page --- */
  const sections = await count('section');
  const lastSec = await c.locator('main > [data-type="section"]').last().getAttribute('data-node');
  await drag(await center(page.locator('.lib-item--struct[data-spans="6-6"]')), await canvasPoint(`[data-node="${lastSec}"]`, 0.92));
  await page.mouse.up();
  await t.wait(300);
  const rootKids = await page.evaluate(() => window.__atelier.site.pages[0].root.children.map(s => s.id));
  t.ok((await count('section')) === sections + 1 && rootKids.at(-2) === lastSec, 'section 2 colonnes déposée en fin de page');

  /* --- 3. dépôt hors zone : rien ne change --- */
  const widgetsBefore = await count('heading');
  await drag(await center(page.locator('.lib-item[data-type="heading"]')), await center(page.locator('#inspector')));
  t.ok(!(await c.locator('#atelier-drop').isVisible()), 'hors du canevas : aucun indicateur');
  await page.mouse.up();
  await t.wait(200);
  t.ok((await count('heading')) === widgetsBefore, 'lâcher hors du canevas n’ajoute rien');
  await page.keyboard.press('Escape');

  /* --- 4. réordonner dans le canevas via la poignée --- */
  const heroCol = await c.locator('[data-type="heading"]:has(h1)').first().evaluate(e => e.closest('[data-type="column"]').getAttribute('data-node'));
  const heroKids = await kids(heroCol);
  const btnId = heroKids.find(k => k.type === 'button').id;
  await c.locator(`[data-node="${btnId}"]`).click();
  await t.wait(150);
  const dest4 = await canvasPoint(`[data-node="${heroKids[0].id}"]`, 0.2);
  await drag(await canvasPoint('#selToolbar [data-act="move"]'), dest4);
  await page.mouse.up();
  await t.wait(300);
  t.ok((await kids(heroCol))[0].id === btnId, 'poignée ✥ : bouton remonté en tête de colonne');

  /* --- 5. une section ne peut pas être déposée en elle-même --- */
  const heroSec = await c.locator('main > [data-type="section"]').first().getAttribute('data-node');
  await page.click('[data-left="navigator"]');
  await page.click(`#navTree [data-node-id="${heroSec}"]`);
  await t.wait(200);
  const order = JSON.stringify(await page.evaluate(() => window.__atelier.site.pages[0].root.children.map(s => s.id)));
  t.ok((await S()).selected === heroSec, 'section du héros sélectionnée');
  const dest5 = await canvasPoint(`[data-node="${btnId}"]`, 0.5);
  await drag(await canvasPoint('#selToolbar [data-act="move"]'), dest5);
  await page.mouse.up();
  await t.wait(300);
  t.ok(JSON.stringify(await page.evaluate(() => window.__atelier.site.pages[0].root.children.map(s => s.id))) === order, 'déposer une section dans son propre contenu ne fait rien');

  /* --- 6. réordonner dans le navigateur --- */
  await page.click('[data-left="navigator"]');
  await t.wait(150);
  const k2 = await kids(heroCol);
  const a = page.locator(`#navTree [data-node-id="${k2[2].id}"]`);
  const b = page.locator(`#navTree [data-node-id="${k2[0].id}"]`);
  const bb = await b.boundingBox();
  await drag(await center(a), { x: bb.x + bb.width / 2, y: bb.y + 3 });
  t.ok(await page.locator('#navDrop').isVisible(), 'navigateur : ligne de dépôt affichée');
  await page.mouse.up();
  await t.wait(300);
  t.ok((await kids(heroCol))[0].id === k2[2].id, 'navigateur : élément déplacé en tête');

  /* --- 7. édition directe d'un titre --- */
  const h1 = c.locator('[data-type="heading"]:has(h1)').first();
  const h1Id = await h1.getAttribute('data-node');
  const original = await page.evaluate(id => JSON.stringify(window.__atelier.site).match(new RegExp(`"id":"${id}"[^}]*?"text":\\{[^}]*\\}`))?.[0], h1Id);
  await h1.locator('h1').dblclick();
  await t.wait(150);
  t.ok(await c.locator(`[data-node="${h1Id}"] [contenteditable="true"]`).count() === 1, 'double-clic : le titre devient modifiable');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Bonjour MAB');
  await t.wait(100);
  await page.keyboard.press('Enter');
  await t.wait(250);
  t.ok(await c.locator('[contenteditable="true"]').count() === 0, 'Entrée termine l’édition d’un titre');
  t.ok(await page.evaluate(id => JSON.stringify(window.__atelier.site).includes('"fr":"Bonjour MAB"'), h1Id), 'texte du titre enregistré');
  await page.keyboard.press('Control+z');
  await t.wait(250);
  t.ok(!(await page.evaluate(() => JSON.stringify(window.__atelier.site).includes('"fr":"Bonjour MAB"'))) && !!original, 'Ctrl+Z annule toute la saisie en une étape');

  /* --- 8. mise en forme : gras via la barre --- */
  const txt = c.locator('[data-type="text"]').first();
  const txtId = await txt.getAttribute('data-node');
  await txt.locator('.rich').dblclick();
  await t.wait(150);
  t.ok(await c.locator('#atelier-format').isVisible(), 'barre de mise en forme affichée');
  await c.locator(`[data-node="${txtId}"] .rich`).evaluate(el => {
    const p = el.querySelector('p') || el;
    const tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 6);
    const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, 6);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await c.locator('#atelier-format [data-fmt="bold"]').click();
  await t.wait(150);
  t.ok(await c.locator(`[data-node="${txtId}"] .rich strong`).count() >= 1, 'gras appliqué dans la page');

  /* --- 9. collage forcé en texte brut + injection neutralisée --- */
  await c.locator(`[data-node="${txtId}"] .rich`).evaluate(el => {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const dt = new DataTransfer();
    dt.setData('text/html', '<img src=x onerror="alert(1)"><b>riche</b>');
    dt.setData('text/plain', '<img src=x onerror=alert(1)> collé');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await t.wait(100);
  await c.locator(`[data-node="${txtId}"] .rich`).evaluate(el => {
    el.insertAdjacentHTML('beforeend', '<script>window.__pwned=1<\/script><p onclick="x()">ok</p>');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.keyboard.press('Escape');
  await t.wait(300);
  const stored = await page.evaluate(id => JSON.stringify(window.__atelier.site), txtId);
  t.ok(stored.includes('&lt;img src=x onerror=alert(1)&gt; collé') && !/<img/.test(stored), 'collage : uniquement du texte brut');
  t.ok(!stored.includes('<script') && !stored.includes('onclick'), 'balises et attributs dangereux supprimés');
  t.ok(await c.locator('[contenteditable="true"]').count() === 0, 'Échap termine l’édition');
  t.ok(!(await c.locator('html').evaluate(() => window.__pwned)), 'aucun script injecté exécuté');

  /* --- 10. menu contextuel --- */
  const headings = await count('heading');
  const anyH = c.locator('[data-type="heading"]').nth(1);
  await anyH.click({ button: 'right' });
  await t.wait(150);
  t.ok(await page.locator('#ctxMenu').isVisible(), 'clic droit : menu contextuel affiché');
  await page.click('#ctxMenu [data-ctx="duplicate"]');
  await t.wait(250);
  t.ok((await count('heading')) === headings + 1 && !(await page.locator('#ctxMenu').isVisible()), 'menu : dupliquer puis fermeture');

  /* --- 11. raccourcis : Alt+↑, Ctrl+C / Ctrl+V --- */
  const k3 = await kids(heroCol);
  await c.locator(`[data-node="${k3[1].id}"]`).click();
  await t.wait(100);
  await page.keyboard.press('Alt+ArrowUp');
  await t.wait(200);
  t.ok((await kids(heroCol))[0].id === k3[1].id, 'Alt+↑ remonte l’élément sélectionné');
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await t.wait(200);
  t.ok((await kids(heroCol)).length === k3.length + 1, 'Ctrl+C puis Ctrl+V colle une copie');

  /* --- 12. édition directe dans une autre langue --- */
  await page.selectOption('#langSelect', 'nl');
  await t.wait(500);
  const h1nl = c.locator(`[data-node="${h1Id}"] h1`);
  await h1nl.dblclick();
  await t.wait(150);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Hallo MAB');
  await page.keyboard.press('Enter');
  await t.wait(250);
  const site = JSON.stringify((await S()).site);
  t.ok(site.includes('"nl":"Hallo MAB"') && !site.includes('"fr":"Hallo MAB"'), 'édition en néerlandais : la version française est intacte');
  await page.selectOption('#langSelect', 'fr');
  await t.wait(300);

  await page.screenshot({ path: `${t.shots}/cycle4-dnd.png` });
}
