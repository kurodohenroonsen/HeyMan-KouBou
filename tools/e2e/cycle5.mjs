/* Cycle 5 : tous les widgets, modèles, pages, liens internes, contrôle et export, site exporté. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const cur = () => page.evaluate(() => { const s = window.__atelier; return s.site.pages.find(p => p.id === s.pageId); });
  const countIn = (type) => c.locator(`[data-type="${type}"]`).count();

  /* --- 1. chaque widget de la bibliothèque s'insère et se rend --- */
  await page.click('[data-left="widgets"]');
  const types = await page.locator('.lib-item:not(.lib-item--struct)').evaluateAll(es => es.map(e => e.dataset.type));
  t.ok(types.length >= 18, `bibliothèque : ${types.length} widgets proposés`);
  const failed = [];
  for (const type of types) {
    const before = await countIn(type);
    await page.click(`.lib-item[data-type="${type}"]`);
    await t.wait(120);
    if ((await countIn(type)) !== before + 1) failed.push(type);
  }
  t.ok(failed.length === 0, `chaque widget s’ajoute au canevas${failed.length ? ' (échec : ' + failed.join(', ') + ')' : ''}`);
  const filter = page.locator('#libFilter');
  await filter.fill('faq');
  t.ok(await page.locator('.lib-item[data-type="accordion"]:visible').count() === 1 && await page.locator('.lib-item[data-type="heading"]:visible').count() === 0, 'recherche dans la bibliothèque (« faq » → accordéon)');
  await filter.fill('');

  /* --- 2. édition directe d'un élément de liste --- */
  const il = c.locator('[data-type="icon-list"]').last();
  const ilId = await il.getAttribute('data-node');
  await il.locator('[data-edit="items.1.text"]').dblclick();
  await t.wait(120);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Élément modifié');
  await page.keyboard.press('Enter');
  await t.wait(250);
  t.ok(await page.evaluate(id => JSON.stringify(window.__atelier.site).includes('"fr":"Élément modifié"'), ilId), 'liste à icônes : élément modifié directement dans la page');

  /* --- 3. accordéon : inspecteur de liste (ajouter un élément) --- */
  await c.locator('[data-type="accordion"]').last().click({ position: { x: 5, y: 5 } });
  await t.wait(150);
  const accId = await page.evaluate(() => window.__atelier.selected);
  const accBefore = await c.locator(`[data-node="${accId}"] details`).count();
  await page.click('#inspector [data-list-add="items"]');
  await t.wait(250);
  t.ok(await c.locator(`[data-node="${accId}"] details`).count() === accBefore + 1, 'accordéon : question ajoutée depuis l’inspecteur');

  /* --- 4. vidéo : adresse reconnue → façade --- */
  await c.locator('[data-type="video"]').last().click({ position: { x: 5, y: 5 } });
  await t.wait(150);
  await page.fill('#inspector [data-field="url"]', 'https://youtu.be/dQw4w9WgXcQ');
  await t.wait(300);
  t.ok(await c.locator('[data-type="video"] [data-video*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]').count() >= 1, 'vidéo : façade prête (aucune requête tant qu’on ne clique pas)');
  t.ok(await c.locator('iframe').count() === 0, 'vidéo : pas d’iframe tierce dans l’éditeur');

  /* --- 5. modèles de sections --- */
  await page.click('[data-left="templates"]');
  await t.wait(150);
  const tplCount = await page.locator('[data-template]').count();
  t.ok(tplCount >= 10, `modèles : ${tplCount} proposés`);
  const secBefore = (await cur()).root.children.length;
  await page.click('[data-template="faq"]');
  await t.wait(300);
  t.ok((await cur()).root.children.length === secBefore + 1 && await c.locator('[data-type="accordion"]').count() >= 2, 'modèle FAQ inséré');
  await page.locator('[data-template="cta"]').scrollIntoViewIfNeeded();
  const src = await page.locator('[data-template="cta"]').boundingBox();
  const box = await page.locator('#canvas').boundingBox();
  await page.mouse.move(src.x + 20, src.y + 15);
  await page.mouse.down();
  await page.mouse.move(src.x + 40, src.y + 30, { steps: 3 });
  await page.mouse.move(box.x + box.width / 2, box.y + 60, { steps: 10 });
  await t.wait(100);
  await page.mouse.up();
  await t.wait(300);
  t.ok((await cur()).root.children.length === secBefore + 2, 'modèle « Appel à l’action » glissé dans la page');

  /* --- 6. pages --- */
  await page.click('[data-left="pages"]');
  await t.wait(150);
  await page.fill('#newPageTitle', 'Notre équipe');
  await page.click('#addPageBtn');
  await t.wait(400);
  let s = await site();
  const team = s.pages.find(p => p.title.fr === 'Notre équipe');
  t.ok(team && team.slug === 'notre-equipe', 'page ajoutée avec une adresse propre (notre-equipe)');
  t.ok((await page.evaluate(() => window.__atelier.pageId)) === team.id && await c.locator('.ph--page').count() === 1, 'la nouvelle page s’ouvre (vide)');
  await page.fill(`[data-page-slug="${team.id}"]`, 'equipe');
  await page.press(`[data-page-slug="${team.id}"]`, 'Enter');
  await page.fill(`[data-page-title="${team.id}"][lang="nl"]`, 'Ons team');
  await page.fill(`[data-page-seo="${team.id}"][lang="fr"]`, 'Les personnes qui font vivre la coopérative.');
  await t.wait(400);
  s = await site();
  const team2 = s.pages.find(p => p.id === team.id);
  t.ok(team2.slug === 'equipe' && team2.title.nl === 'Ons team' && team2.seo.description.fr.startsWith('Les personnes'), 'adresse, titre NL et description SEO enregistrés');
  t.ok(await page.locator('#pageSelect option', { hasText: 'Notre équipe' }).count() === 1, 'la page apparaît dans le sélecteur de pages');
  await page.click(`[data-page-move="${team.id}"][data-dir="-1"]`);
  await t.wait(250);
  s = await site();
  t.ok(s.pages[1].id === team.id, 'page déplacée dans le menu');
  t.ok(await page.locator(`[data-page-delete="${s.pages[0].id}"]`).count() === 0, 'la page d’accueil ne peut pas être supprimée');

  /* --- 7. lien interne vers une page --- */
  await page.selectOption('#pageSelect', s.pages[0].id);
  await t.wait(400);
  await c.locator('[data-type="button"]').first().click();
  await t.wait(150);
  await page.click('[data-insp="content"]');
  await page.selectOption('#inspector [data-link-pick="link"]', `page:${team.id}`);
  await t.wait(250);
  t.ok(await page.evaluate(id => JSON.stringify(window.__atelier.site).includes(`"link":"page:${id}"`), team.id), 'lien interne enregistré comme page:ID (suit les changements d’adresse)');

  /* --- 8. traductions manquantes --- */
  await page.click('#missingBtn');
  await t.wait(200);
  t.ok(await page.locator('#auditDialog[open]').count() === 1 && await page.locator('#auditDialog [data-audit-kind="translation"]').count() > 0, 'le badge « à traduire » ouvre la liste des textes à traduire');
  await page.locator('#auditDialog [data-audit-kind="translation"] [data-audit-go]').first().click();
  await t.wait(300);
  t.ok(await page.locator('#auditDialog[open]').count() === 0 && (await page.evaluate(() => window.__atelier.lang)) !== 'fr', '« Aller à » ouvre l’élément dans la bonne langue');
  await page.selectOption('#langSelect', 'fr');
  await t.wait(300);

  /* --- 9. contrôle puis export --- */
  await page.click('#exportZipBtn');
  await t.wait(200);
  t.ok(await page.locator('#auditDialog[open]').count() === 1, 'export : la fenêtre de contrôle s’affiche');
  t.ok(await page.locator('#auditDialog [data-audit-kind="warning"]').count() > 0, 'des avertissements sont listés (formulaire, images…)');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const zipPath = join(dir, 'site.zip');
  await download.saveAs(zipPath);
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zipPath, join(dir, 'site')]);
  const files = readdirSync(join(dir, 'site'), { recursive: true }).map(String);
  for (const f of ['index.html', 'nl/index.html', 'de/index.html', 'en/index.html', 'equipe/index.html', 'nl/equipe/index.html', 'styles.css', 'site.js', 'sitemap.xml', 'robots.txt']) t.ok(files.includes(f), `export : ${f}`);

  /* --- 10. le site exporté --- */
  const ctx2 = await t.browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const p2 = await ctx2.newPage();
  const errs = [];
  p2.on('pageerror', e => errs.push(e.message));
  await p2.route(/^https?:/, r => r.abort());
  await p2.goto('file://' + join(dir, 'site', 'index.html'));
  t.ok(await p2.evaluate(() => document.documentElement.scrollWidth <= 390), 'site exporté : aucun débordement horizontal à 390 px');
  t.ok(await p2.locator('a[href="equipe/"]').count() >= 1, 'site exporté : le bouton pointe vers equipe/');
  await p2.locator('[data-video]').first().scrollIntoViewIfNeeded();
  await p2.locator('[data-video]').first().click();
  t.ok(await p2.locator('.vid iframe[src*="youtube-nocookie.com"]').count() === 1, 'site exporté : la vidéo se charge au clic');
  await p2.locator('.acc summary').first().click();
  t.ok(await p2.locator('.acc details[open]').count() >= 1, 'site exporté : l’accordéon s’ouvre');
  await p2.goto('file://' + join(dir, 'site', 'nl', 'equipe', 'index.html'));
  t.ok((await p2.title()).includes('Ons team') && await p2.locator('html[lang="nl"]').count() === 1, 'site exporté : page équipe en néerlandais');
  await p2.screenshot({ path: `${t.shots}/cycle5-export-mobile.png`, fullPage: false });
  t.ok(errs.length === 0, 'site exporté : aucune erreur JavaScript' + (errs.length ? ' : ' + errs[0] : ''));
  await ctx2.close();

  await page.screenshot({ path: `${t.shots}/cycle5-editor.png` });
}
