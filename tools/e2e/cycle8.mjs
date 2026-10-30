/* Cycle 8 : barre de commandes, recherche de réglages, sélection multiple, vue tous appareils, clavier. */
export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const S = () => page.evaluate(() => ({ selected: window.__atelier.selected, multi: [...(window.__atelier.multi || [])], pageId: window.__atelier.pageId, device: window.__atelier.device, insp: window.__atelier.insp }));
  const count = type => page.evaluate(type => { const s = window.__atelier; const p = s.site.pages.find(p => p.id === s.pageId); return JSON.stringify(p.root).split(`"type":"${type}"`).length - 1; }, type);
  const cmdk = async q => {
    await page.keyboard.press('Control+k');
    await t.wait(120);
    await page.fill('#cmdkInput', q);
    await t.wait(120);
  };
  const parentOf = id => page.evaluate(id => { const s = window.__atelier; const p = s.site.pages.find(p => p.id === s.pageId); let r = null; const w = n => (n.children || []).forEach(k => { if (k.id === id) r = n.id; w(k); }); w(p.root); return r; }, id);

  /* --- 1. barre de commandes --- */
  await c.locator('[data-type="heading"]').first().click();
  await cmdk('ajout bout');
  t.ok(await page.locator('#cmdk[open]').count() === 1, 'Ctrl+K ouvre la barre de commandes');
  t.ok(await page.locator('#cmdk [data-cmd][aria-selected="true"]').getAttribute('data-cmd') === 'add:button', '« ajout bout » propose d’abord « Ajouter : Bouton »');
  const btnBefore = await count('button');
  await page.keyboard.press('Enter');
  await t.wait(250);
  t.ok(await count('button') === btnBefore + 1 && await page.locator('#cmdk[open]').count() === 0, 'Entrée lance la commande et ferme la barre');

  await cmdk('mobile');
  await page.keyboard.press('Enter');
  await t.wait(300);
  t.ok((await S()).device === 'mobile', 'commande : passer en mobile');
  await cmdk('ordinateur');
  await page.keyboard.press('Enter');
  await t.wait(300);

  await cmdk('rejoindre');
  t.ok(await page.locator('#cmdk [data-cmd^="node:"]').count() >= 1, 'les éléments de la page sont trouvés par leur texte');
  const target = (await page.locator('#cmdk [data-cmd^="node:"]').first().getAttribute('data-cmd')).slice(5);
  await page.locator('#cmdk [data-cmd^="node:"]').first().click();
  await t.wait(250);
  t.ok((await S()).selected === target, 'clic sur un résultat : l’élément est sélectionné');

  await cmdk('reglage taille');
  t.ok(await page.locator('#cmdk [data-cmd="style:fontSize"]').count() === 1, 'les réglages de style sont dans la barre');
  await page.locator('#cmdk [data-cmd="style:fontSize"]').click();
  await t.wait(300);
  t.ok(await page.evaluate(() => document.activeElement?.getAttribute('data-style')) === 'fontSize', '« Réglage : Taille » ouvre l’onglet Style sur le bon champ');

  await cmdk('');
  const first = await page.locator('#cmdk [data-cmd][aria-selected="true"]').getAttribute('data-cmd');
  await page.keyboard.press('ArrowDown');
  t.ok(await page.locator('#cmdk [data-cmd][aria-selected="true"]').getAttribute('data-cmd') !== first, 'flèche bas : commande suivante');
  t.ok(first === 'style:fontSize', 'la dernière commande utilisée revient en tête');
  await page.keyboard.press('Escape');
  await t.wait(100);
  t.ok(await page.locator('#cmdk[open]').count() === 0, 'Échap ferme la barre');

  await cmdk('contact');
  const pageCmd = page.locator('#cmdk [data-cmd^="page:"]').first();
  const pid = (await pageCmd.getAttribute('data-cmd')).slice(5);
  await pageCmd.click();
  await t.wait(400);
  t.ok((await S()).pageId === pid, 'commande : aller à la page Contact');
  await page.selectOption('#pageSelect', { index: 0 });
  await t.wait(400);

  /* --- 2. recherche dans les réglages --- */
  await c.locator('[data-type="heading"]').first().click();
  await page.click('[data-insp="style"]');
  await page.fill('#inspector [data-style-search]', 'marge');
  await t.wait(200);
  t.ok(await page.locator('#inspector [data-style="paddingTop"]').isVisible() && await page.locator('#inspector [data-style="fontSize"]:visible').count() === 0, 'recherche « marge » : seules les marges restent, groupe ouvert');
  await page.fill('#inspector [data-style-search]', '');
  await t.wait(150);

  /* --- 3. sélection multiple --- */
  const heads = c.locator('[data-type="heading"]');
  const hA = await heads.nth(2).getAttribute('data-node');
  const hB = await heads.nth(3).getAttribute('data-node');
  await heads.nth(2).click();
  await heads.nth(3).click({ modifiers: ['Shift'] });
  await t.wait(200);
  let st = await S();
  t.ok(st.multi.length === 2 && st.multi.includes(hA) && st.multi.includes(hB), 'Maj+clic : deux éléments sélectionnés');
  t.ok((await page.locator('#inspector .insp-title').textContent()).includes('2 éléments'), 'l’inspecteur indique « 2 éléments »');
  t.ok(await c.locator('.ab--multi:visible').count() === 2, 'chaque élément sélectionné est encadré');
  await page.click('[data-insp="style"]');
  await page.fill('#inspector [data-style="fontSize"]', '50px');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');
  await t.wait(300);
  const fs = id => c.locator(`[data-node="${id}"] .heading`).evaluate(e => getComputedStyle(e).fontSize);
  t.ok(await fs(hA) === '50px' && await fs(hB) === '50px', 'un réglage s’applique aux deux');
  const nHeads = await count('heading');
  await page.keyboard.press('Control+d');
  await t.wait(250);
  t.ok(await count('heading') === nHeads + 2, 'Ctrl+D duplique les deux');
  await page.keyboard.press('Control+z');
  await t.wait(250);
  await heads.nth(2).click();
  await heads.nth(3).click({ modifiers: ['Shift'] });
  await page.keyboard.press('Delete');
  await t.wait(250);
  t.ok(await count('heading') === nHeads - 2, 'Suppr supprime les deux');
  await page.keyboard.press('Control+z');
  await t.wait(250);
  t.ok(await count('heading') === nHeads, 'une seule annulation les rétablit');

  await page.click('[data-left="navigator"]');
  await t.wait(150);
  await page.click(`#navTree [data-node-id="${hA}"]`);
  await page.click(`#navTree [data-node-id="${hB}"]`, { modifiers: ['Shift'] });
  await t.wait(150);
  t.ok((await S()).multi.length === 2 && await page.locator('#navTree [aria-selected="true"]').count() === 2, 'Maj+clic fonctionne aussi dans la Structure');
  await page.click(`#navTree [data-node-id="${hB}"]`, { modifiers: ['Shift'] });
  await t.wait(150);
  t.ok((await S()).multi.length === 0 && (await S()).selected === hA, 'Maj+clic à nouveau : retiré de la sélection');

  /* --- 4. vue tous les appareils --- */
  await page.click('[data-insp="style"]');
  await page.click('#inspector [data-style-all-devices]');
  await t.wait(150);
  t.ok(await page.locator('#inspector [data-style="fontSize"][data-device-col]').count() === 3, 'trois champs côte à côte pour la taille');
  await page.fill('#inspector [data-style="fontSize"][data-device-col="mobile"]', '21px');
  await page.press('#inspector [data-style="fontSize"][data-device-col="mobile"]', 'Enter');
  await t.wait(250);
  const hAnode = await page.evaluate(id => { const f = n => n.id === id ? n : (n.children || []).reduce((a, k) => a || f(k), null); return f(window.__atelier.site.pages[0].root); }, hA);
  t.ok(hAnode.style.mobile.fontSize === '21px' && (await S()).device === 'desktop', 'valeur mobile réglée sans quitter l’ordinateur');
  await page.click('#inspector [data-style-all-devices]');

  /* --- 5. clavier --- */
  const hK = await heads.nth(0).getAttribute('data-node');
  const col = await parentOf(hK);
  await c.locator(`[data-node="${hK}"]`).click();
  await page.locator('#canvas').focus();
  const sibs = await page.evaluate(id => { const f = n => n.id === id ? n : (n.children || []).reduce((a, k) => a || f(k), null); return f(window.__atelier.site.pages[0].root).children.map(k => k.id); }, col);
  await page.keyboard.press('ArrowDown');
  await t.wait(120);
  t.ok((await S()).selected === sibs[sibs.indexOf(hK) + 1], '↓ : élément suivant');
  await page.keyboard.press('ArrowUp');
  await t.wait(120);
  t.ok((await S()).selected === hK, '↑ : élément précédent');
  await page.keyboard.press('ArrowLeft');
  await t.wait(120);
  t.ok((await S()).selected === col, '← : parent');
  await page.keyboard.press('ArrowRight');
  await t.wait(120);
  t.ok((await S()).selected === sibs[0], '→ : premier enfant');

  const btn = await c.locator('[data-type="button"]').first().getAttribute('data-node');
  const otherCol = await c.locator('[data-type="image"]').first().evaluate(e => e.closest('[data-type="column"]').getAttribute('data-node'));
  await c.locator(`[data-node="${btn}"]`).click();
  const nBtn = await count('button');
  await page.keyboard.press('Control+x');
  await t.wait(200);
  t.ok(await count('button') === nBtn - 1, 'Ctrl+X coupe l’élément');
  await page.evaluate(id => window.__atelier.selectId(id), otherCol);
  await t.wait(100);
  await page.keyboard.press('Control+v');
  await t.wait(250);
  const moved = await page.evaluate(() => window.__atelier.selected);
  t.ok(await count('button') === nBtn && await parentOf(moved) === otherCol, 'Ctrl+V le colle dans l’autre colonne : déplacé sans souris');

  await page.click('[data-left="navigator"]');
  await page.locator('#navTree [aria-selected="true"]').focus();
  const focused0 = await page.evaluate(() => document.activeElement.dataset.nodeId);
  await page.keyboard.press('ArrowDown');
  const focused1 = await page.evaluate(() => document.activeElement.dataset.nodeId);
  t.ok(focused1 && focused1 !== focused0, 'Structure : flèche bas déplace le focus');
  await page.keyboard.press('Enter');
  await t.wait(150);
  t.ok((await S()).selected === focused1, 'Structure : Entrée sélectionne');

  await page.locator('body').click({ position: { x: 700, y: 5 } }).catch(() => {});
  await page.keyboard.press('Escape');
  await page.keyboard.press('?');
  await t.wait(150);
  t.ok(await page.locator('#shortcutsDialog[open]').count() === 1, '« ? » affiche l’aide des raccourcis');
  await page.keyboard.press('Escape');

  await page.screenshot({ path: `${t.shots}/cycle8.png` });
}
