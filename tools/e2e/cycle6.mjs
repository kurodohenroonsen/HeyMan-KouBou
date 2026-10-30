/* Cycle 6 : recette — parcours complet depuis un site vide, persistance, appareils, export. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);

  /* 1. nouveau site vide */
  await page.click('#fileMenu summary');
  await page.click('#newSiteBtn');
  await page.click('#newSiteCreate');
  await t.wait(600);
  t.ok(await c.locator('.ph--page').count() === 1, 'site vide : invitation à glisser une section');

  /* 2. modèle héros + titre écrit dans la page */
  await page.click('[data-left="templates"]');
  await page.click('[data-template="hero"]');
  await t.wait(300);
  await c.locator('h1').dblclick();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Atelier coopératif de quartier');
  await page.keyboard.press('Enter');
  await t.wait(200);
  t.ok((await c.locator('h1').textContent()).includes('Atelier coopératif'), 'titre principal écrit directement');

  /* 3. section contact + identité */
  await page.click('[data-template="contact"]');
  await t.wait(300);
  await page.click('[data-left="site"]');
  await page.fill('[data-site="name"]', 'Atelier du Quartier');
  await page.locator('[data-palette="c1"]').evaluate(e => { e.value = '#7c3aed'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.fill('[data-site="baseUrl"]', 'https://www.atelier-quartier.be');
  await page.press('[data-site="baseUrl"]', 'Tab');
  await t.wait(300);
  t.ok(await c.locator('.btn--primary').first().evaluate(e => getComputedStyle(e).backgroundColor) === 'rgb(124, 58, 237)', 'palette appliquée au modèle');

  /* 4. formulaire : destinataire */
  await c.locator('[data-type="form"]').click({ position: { x: 4, y: 4 } });
  await page.click('[data-insp="content"]');
  await page.fill('#inspector [data-field="email"]', 'bonjour@atelier-quartier.be');
  await t.wait(250);

  /* 5. une deuxième page et un lien vers elle */
  await page.click('[data-left="pages"]');
  await page.fill('#newPageTitle', 'Horaires');
  await page.click('#addPageBtn');
  await t.wait(400);
  await page.click('[data-left="templates"]');
  await page.click('[data-template="text-image"]');
  await t.wait(300);
  const s1 = await site();
  await page.selectOption('#pageSelect', s1.pages[0].id);
  await t.wait(400);
  await c.locator('[data-type="button"]').first().click();
  await page.click('[data-insp="content"]');
  await page.selectOption('#inspector [data-link-pick="link"]', `page:${s1.pages[1].id}`);
  await t.wait(250);

  /* 6. réglage mobile du titre */
  await c.locator('[data-type="heading"]:has(h1)').click();
  await page.click('[data-device="mobile"]');
  await t.wait(400);
  await page.click('[data-insp="style"]');
  await page.fill('#inspector [data-style="fontSize"]', '34');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');
  await t.wait(300);
  t.ok(await c.locator('h1').evaluate(e => getComputedStyle(e).fontSize) === '34px', 'mobile : titre réglé à 34 px');
  t.ok(await c.locator('html').evaluate(() => innerWidth) === 390, 'mobile : canevas rendu à 390 px');
  await page.screenshot({ path: `${t.shots}/cycle6-mobile.png` });
  await page.click('[data-device="tablet"]');
  await t.wait(400);
  t.ok(await c.locator('html').evaluate(() => innerWidth) === 820, 'tablette : canevas rendu à 820 px');
  await page.screenshot({ path: `${t.shots}/cycle6-tablet.png` });
  await page.click('[data-device="desktop"]');
  await t.wait(400);
  await page.screenshot({ path: `${t.shots}/cycle6-desktop.png` });

  /* 7. annuler / rétablir en série */
  const before = JSON.stringify((await site()).pages);
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Control+z'); await t.wait(60); }
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Control+Shift+z'); await t.wait(60); }
  await t.wait(200);
  t.ok(JSON.stringify((await site()).pages) === before, '5 annulations puis 5 rétablissements : retour exact');

  /* 8. enregistrement automatique : le projet survit au rechargement */
  await t.wait(1200);
  t.ok((await page.locator('#saveState').textContent()).includes('Enregistré'), 'enregistrement automatique signalé');
  await page.goto(t.base);
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
  const s2 = await site();
  t.ok(s2.name === 'Atelier du Quartier' && s2.pages.length === 2, 'après rechargement : le projet est retrouvé');

  /* 9. export final et contrôle du contenu */
  await page.click('#exportZipBtn');
  await t.wait(200);
  const warnings = await page.locator('#auditDialog [data-audit-kind="warning"]').allTextContents();
  t.ok(!warnings.some(w => /formulaire/.test(w)), 'contrôle : le formulaire a bien un destinataire');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export6');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const home = readFileSync(join(dir, 'site', 'index.html'), 'utf8');
  t.ok(home.includes('<link rel="canonical" href="https://www.atelier-quartier.be/">'), 'export : adresse canonique');
  t.ok(home.includes('hreflang="nl"') && home.includes('hreflang="x-default"'), 'export : liens de langue pour Google');
  t.ok(home.includes('href="horaires/"'), 'export : lien interne vers la page Horaires');
  t.ok(!home.includes('bonjour@atelier-quartier.be'), 'export : adresse e-mail non lisible en clair');
  t.ok(!/data-node=|contenteditable|atelier-ui/.test(home), 'export : aucune trace de l’éditeur');
  t.ok(readFileSync(join(dir, 'site', 'sitemap.xml'), 'utf8').includes('https://www.atelier-quartier.be/horaires/'), 'export : sitemap');

  for (const w of [320, 390, 820, 1280]) {
    const ctx = await t.browser.newContext({ viewport: { width: w, height: 800 }, locale: 'fr-FR' });
    const p = await ctx.newPage();
    await p.route(/^https?:/, r => r.abort());
    await p.goto('file://' + join(dir, 'site', 'index.html'));
    t.ok(await p.evaluate(vw => document.documentElement.scrollWidth <= vw, w), `site exporté à ${w} px : aucun débordement`);
    if (w === 390) await p.screenshot({ path: `${t.shots}/cycle6-export-390.png`, fullPage: true });
    await ctx.close();
  }
}
