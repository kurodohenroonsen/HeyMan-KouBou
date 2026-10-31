/* Cycle 9 : composants, édition ciblée, en-tête en blocs, menu, menu mobile, popups, sémantique. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export default async function (t) {
  /* Cycle 30 : réglages experts (dimensions, disposition, effets, classes, CSS) cachés en mode simple, le mode par défaut */
  await t.page.evaluate(() => window.__atelier.setExpert(true));
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const st = () => page.evaluate(() => ({ selected: window.__atelier.selected, pageId: window.__atelier.pageId, edit: window.__atelier.editTarget }));

  /* --- 1. créer un composant depuis la section CTA (dernière section de l'accueil) --- */
  const cta = c.locator('main > [data-type="section"]').last();
  const ctaId = await cta.getAttribute('data-node');
  await page.click('[data-left="navigator"]');
  await page.click(`#navTree [data-node-id="${ctaId}"]`, { button: 'right' });
  await t.wait(150);
  await page.click('#ctxMenu [data-ctx="component"]');
  await t.wait(300);
  let s = await site();
  const cid = Object.keys(s.components)[0];
  t.ok(cid && s.components[cid].name === 'Équipe', 'clic droit → « Créer un composant » (nom demandé)');
  t.ok(await c.locator(`[data-ref="${cid}"]`).count() === 1, 'la section est devenue une instance');
  t.ok(await page.locator('#inspector [data-component-edit]').count() === 1, 'l’inspecteur propose de modifier le composant');

  /* --- 2. l'insérer sur une autre page --- */
  const contact = s.pages.find(p => p.slug === 'contact');
  await page.selectOption('#pageSelect', contact.id);
  await t.wait(400);
  await page.click('[data-left="templates"]');
  await t.wait(150);
  t.ok(await page.locator(`[data-component="${cid}"]`).count() === 1, 'panneau Modèles : le composant est proposé');
  await page.click(`[data-component="${cid}"]`);
  await t.wait(300);
  t.ok(await c.locator(`[data-ref="${cid}"]`).count() === 1, 'instance ajoutée sur la page Contact');
  const instContact = await c.locator(`[data-ref="${cid}"]`).getAttribute('data-node');

  /* --- 3. modifier le composant : partout --- */
  await c.locator(`[data-ref="${cid}"]`).dblclick();
  await t.wait(400);
  t.ok(await page.locator('#editBanner').isVisible() && (await page.locator('#editBanner').textContent()).includes('Équipe'), 'double-clic : mode « modifier le composant », bandeau explicite');
  t.ok((await st()).edit?.kind === 'component', 'cible d’édition : le composant');
  const h2 = c.locator('[data-type="heading"]').first();
  await h2.locator('.heading').dblclick();
  await t.wait(150);
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Ensemble, plus forts');
  await page.keyboard.press('Enter');
  await t.wait(250);
  await page.click('#editBanner [data-edit-done]');
  await t.wait(400);
  t.ok((await st()).edit === null && !(await page.locator('#editBanner').isVisible()), '« Terminer » revient à la page');
  t.ok((await c.locator(`[data-ref="${cid}"]`).textContent()).includes('Ensemble, plus forts'), 'le texte modifié apparaît sur la page Contact');
  await page.selectOption('#pageSelect', { index: 0 });
  await t.wait(400);
  t.ok((await c.locator(`[data-ref="${cid}"]`).textContent()).includes('Ensemble, plus forts'), '… et sur l’accueil (même composant)');
  await page.keyboard.press('Control+z');
  await t.wait(300);
  t.ok(!(await c.locator(`[data-ref="${cid}"]`).textContent()).includes('Ensemble, plus forts'), 'Ctrl+Z annule la modification du composant');
  await page.keyboard.press('Control+Shift+z');
  await t.wait(300);

  /* --- 4. détacher l'instance de la page Contact --- */
  await page.selectOption('#pageSelect', contact.id);
  await t.wait(400);
  await c.locator(`[data-node="${instContact}"]`).click({ position: { x: 5, y: 5 } });
  await t.wait(150);
  await page.click('#inspector [data-component-detach]');
  await t.wait(300);
  t.ok(await c.locator(`[data-ref="${cid}"]`).count() === 0 && (await c.locator('main').textContent()).includes('Ensemble, plus forts'), 'détacher : copie indépendante, contenu conservé');
  await page.selectOption('#pageSelect', { index: 0 });
  await t.wait(400);

  /* --- 5. en-tête en blocs --- */
  await page.click('[data-left="site"]');
  await t.wait(150);
  await page.click('[data-layout-edit="header"]');
  await t.wait(400);
  t.ok((await st()).edit?.kind === 'header' && (await page.locator('#editBanner').textContent()).includes('en-tête'), 'personnaliser l’en-tête : mode d’édition de l’en-tête');
  t.ok(await c.locator('header [data-type="nav-menu"]').count() === 1 && await c.locator('header [data-type="site-logo"]').count() === 1, 'en-tête en blocs : logo, menu, langues');
  t.ok(await c.locator('main [data-node]').count() === 0, 'le contenu de la page est verrouillé pendant ce temps');
  await c.locator('header [data-type="nav-menu"]').click();
  await page.click('[data-insp="content"]');
  await page.selectOption('#inspector [data-field="align"]', 'start');
  await t.wait(250);
  await page.click('#editBanner [data-edit-done]');
  await t.wait(400);
  s = await site();
  t.ok(s.layout.header && JSON.stringify(s.layout.header).includes('"align":"start"'), 'réglage de l’en-tête enregistré');
  t.ok(await c.locator('header.site-header--custom').count() === 1, 'l’en-tête personnalisé s’affiche sur la page');

  /* --- 6. menu personnalisé --- */
  await page.click('[data-left="pages"]');
  await t.wait(150);
  await page.click('[data-menu-customize]');
  await t.wait(200);
  await page.fill('[data-menu-link-label]', 'Blog');
  await page.fill('[data-menu-link-url]', 'https://blog.exemple.org');
  await page.click('[data-menu-add-link]');
  await t.wait(300);
  t.ok((await c.locator('header .menu').textContent()).includes('Blog'), 'lien « Blog » ajouté au menu');
  s = await site();
  const blog = s.menu.find(i => i.kind === 'link');
  await page.click(`[data-menu-item="${blog.id}"] [data-menu-act="indent"]`);
  await t.wait(300);
  t.ok(await c.locator('header .submenu a', { hasText: 'Blog' }).count() === 1, 'Blog passe en sous-menu');
  const lastPage = s.menu.find(i => i.kind === 'page' && i.pageId === contact.id);
  await page.fill(`[data-menu-label="${lastPage.id}"]`, 'Nous écrire');
  await page.press(`[data-menu-label="${lastPage.id}"]`, 'Enter');
  await t.wait(300);
  t.ok((await c.locator('header .menu').textContent()).includes('Nous écrire'), 'libellé de menu modifié sans changer le titre de la page');

  /* --- 7. popup --- */
  await c.locator('[data-type="button"]').first().click();
  await page.click('[data-insp="content"]');
  await page.selectOption('#inspector [data-link-pick="link"]', `popup:${cid}`);
  await t.wait(300);
  t.ok(await c.locator(`[data-type="button"] button[popovertarget="pop-${cid}"]`).count() === 1, 'le bouton ouvre le composant en fenêtre (popup)');

  /* --- 8. sémantique --- */
  const sec = await c.locator('main > [data-type="section"]').nth(1).getAttribute('data-node');
  await page.click('[data-left="navigator"]');
  await page.click(`#navTree [data-node-id="${sec}"]`);
  await page.click('[data-insp="content"]');
  await page.selectOption('#inspector [data-field="tag"]', 'article');
  await page.click('[data-insp="advanced"]');
  await page.fill('#inspector [data-adv="aria"]', 'Nos services');
  await page.locator('#inspector [data-adv="aria"]').blur();
  await t.wait(300);
  t.ok(await c.locator(`article[data-node="${sec}"][aria-label="Nos services"]`).count() === 1, 'section en <article> avec libellé accessible');

  /* --- 9. site exporté : popup natif et menu mobile --- */
  await page.click('#exportZipBtn');
  await t.wait(200);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export9');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const ctx = await t.browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + join(dir, 'site', 'index.html'));
  await p.locator(`button[popovertarget="pop-${cid}"]`).first().click();
  await t.wait(200);
  t.ok(await p.locator(`#pop-${cid}:popover-open`).count() === 1, 'site exporté : la fenêtre s’ouvre au clic (sans JavaScript)');
  await p.keyboard.press('Escape');
  await t.wait(150);
  t.ok(await p.locator(`#pop-${cid}:popover-open`).count() === 0, 'site exporté : Échap ferme la fenêtre');
  await p.setViewportSize({ width: 390, height: 800 });
  await t.wait(200);
  const burger = p.locator('.nav-burger').first();
  t.ok(await burger.isVisible() && !(await p.locator('header .menu').first().isVisible()), 'mobile : bouton Menu visible, menu replié');
  await burger.click();
  await t.wait(150);
  const mb = await p.locator('header .menu').first().boundingBox();
  t.ok((await burger.getAttribute('aria-expanded')) === 'true' && mb && mb.x >= 0 && mb.x + mb.width <= 390 && mb.height > 40, `mobile : le bouton ouvre le menu, entièrement à l’écran (x=${Math.round(mb?.x)}, largeur ${Math.round(mb?.width)})`);
  t.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'mobile : aucun débordement horizontal');
  await p.screenshot({ path: `${t.shots}/cycle9-export-mobile.png` });
  t.ok(errs.length === 0, 'site exporté : aucune erreur JavaScript' + (errs.length ? ' : ' + errs[0] : ''));
  await ctx.close();

  /* --- 10. revenir à l'en-tête par défaut --- */
  await page.click('[data-left="site"]');
  await page.click('[data-layout-reset="header"]');
  await t.wait(300);
  t.ok(!(await site()).layout.header && await c.locator('header.site-header--custom').count() === 0, 'revenir à l’en-tête par défaut');

  await page.screenshot({ path: `${t.shots}/cycle9.png` });
}
