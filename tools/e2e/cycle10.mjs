/* Cycle 10 : contraste, titres, déclaration d'accessibilité, images responsives, enregistrement léger, mouvement, axe-core. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AXE = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'axe-core', 'axe.min.js');

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);

  /* --- 1. contraste en direct dans l'onglet Style --- */
  const txt = c.locator('[data-type="text"]').first();
  await txt.click();
  await page.click('[data-insp="style"]');
  await page.fill('#inspector [data-style="color"]', '#bbbbbb');
  await page.press('#inspector [data-style="color"]', 'Enter');
  await t.wait(300);
  const badge = page.locator('#inspector [data-style-wrap="color"] [data-contrast]');
  t.ok(await badge.evaluate(e => e.classList.contains('is-bad')) && (await badge.textContent()).includes('4,5:1'), `couleur trop claire : pastille rouge (${(await badge.textContent()).trim()})`);
  await page.click('#inspector [data-style-wrap="color"] [data-swatch="c3"]');
  await t.wait(300);
  t.ok(await page.locator('#inspector [data-style-wrap="color"] [data-contrast]').evaluate(e => e.classList.contains('is-ok')), 'couleur de texte de la palette : pastille verte');

  /* --- 2. paires de la palette --- */
  await page.click('[data-left="site"]');
  await t.wait(150);
  t.ok(await page.locator('[data-pair="text"].is-ok').count() === 1, 'palette : texte sur fond conforme');
  await page.locator('[data-palette="c1"]').evaluate(e => { e.value = '#ffe066'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await t.wait(250);
  t.ok(await page.locator('[data-pair="button"].is-bad').count() === 1, 'palette : jaune clair pour la couleur principale → bouton illisible signalé en direct');
  await page.click('#exportZipBtn');
  await t.wait(250);
  t.ok((await page.locator('#auditDialog [data-audit-kind="warning"]').allTextContents()).some(x => /contraste insuffisant/.test(x)), 'vérification avant export : contraste insuffisant listé');
  await page.click('#auditDialog .audit__foot .btn');
  await page.keyboard.press('Control+z');
  await t.wait(300);
  t.ok((await site()).theme.palette.c1 === '#c8181d', 'Ctrl+Z rétablit la couleur');

  /* --- 3. image : variantes à l'import --- */
  const pngPath = join(t.shots, 'photo-test.png');
  execFileSync('python3', ['-c', "from PIL import Image\ng = Image.linear_gradient('L').resize((2400, 1350))\nh = Image.linear_gradient('L').rotate(90).resize((2400, 1350))\nImage.merge('RGB', (g, h, Image.new('L', (2400, 1350), 140))).save('" + pngPath + "')"]);
  const img = c.locator('[data-type="image"]').first();
  await img.click();
  await page.click('[data-insp="content"]');
  await page.setInputFiles('#inspector input[type="file"][data-field="src"]', pngPath);
  await page.waitForFunction(() => Object.values(window.__atelier.site.assets).some(a => a.variants?.length), null, { timeout: 15000 });
  let s = await site();
  const asset = Object.values(s.assets).find(a => a.variants?.length);
  t.ok(asset.width === 1600 && asset.height === 900 && asset.variants.map(v => v.w).join(',') === '480,960', `image importée : 1600 px + variantes ${asset.variants.map(v => v.w).join(', ')} px`);

  /* --- 4. enregistrement léger, image retrouvée après rechargement --- */
  await t.wait(1500);
  const stored = await page.evaluate(() => new Promise(res => {
    const r = indexedDB.open('atelier-v2');
    r.onsuccess = () => {
      const db = r.result;
      const g = db.transaction('projects').objectStore('projects').get('current');
      g.onsuccess = () => res({ size: JSON.stringify(g.result).length, hasData: JSON.stringify(g.result).includes('base64') });
    };
  }));
  t.ok(!stored.hasData && stored.size < 200000, `le projet enregistré ne contient plus les images (${Math.round(stored.size / 1024)} Ko)`);
  await page.goto(t.base);
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
  t.ok(await c.locator('[data-type="image"] img').first().evaluate(i => i.complete && i.naturalWidth === 1600), 'après rechargement, l’image est retrouvée');

  /* --- 5. déclaration d'accessibilité --- */
  await page.click('[data-left="pages"]');
  await page.click('[data-a11y-page]');
  await t.wait(150);
  t.ok(await page.locator('#a11yDialog[open]').count() === 1, 'assistant de déclaration d’accessibilité');
  await page.fill('#a11yDialog [data-a11y="email"]', 'accessibilite@media-alternatif.be');
  await page.fill('#a11yDialog [data-a11y="limits"]', 'Certaines vidéos des médias membres ne sont pas encore sous-titrées.');
  await page.click('#a11yCreate');
  await t.wait(500);
  s = await site();
  const a11y = s.pages.find(p => p.slug === 'accessibilite');
  t.ok(a11y && (await page.evaluate(() => window.__atelier.pageId)) === a11y.id, 'page « Accessibilité » créée et ouverte');
  t.ok((await c.locator('main').textContent()).includes('WCAG 2.1') && (await c.locator('footer').textContent()).includes('Accessibilité'), 'contenu de la déclaration et lien dans le pied de page');
  t.ok(!(await c.locator('header .menu').textContent()).includes('Accessibilité'), 'la déclaration n’encombre pas le menu principal');

  /* --- 6. effet d'apparition --- */
  await page.selectOption('#pageSelect', { index: 0 });
  await t.wait(400);
  await c.locator('[data-type="heading"]:has(h2)').first().click();
  await page.click('[data-insp="style"]');
  await page.locator('#inspector .style-group:has([data-style="reveal"])').evaluate(d => { d.open = true; });
  await page.selectOption('#inspector [data-style="reveal"]', 'up');
  await t.wait(250);

  /* --- 7. export, performance et axe-core --- */
  await page.click('#exportZipBtn');
  await t.wait(250);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export10');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const files = readdirSync(join(dir, 'site'), { recursive: true }).map(String);
  t.ok(files.filter(f => /^assets\/photo-test-(480|960)\.webp$/.test(f)).length === 2, 'export : variantes 480 et 960 px présentes');
  const home = readFileSync(join(dir, 'site', 'index.html'), 'utf8');
  const tag = home.match(/<img [^>]*photo-test[^>]*>/)?.[0] || '';
  t.ok(/srcset="[^"]*480w[^"]*960w[^"]*1600w"/.test(tag) && /sizes="\(max-width: 640px\) 100vw/.test(tag) && /width="1600" height="900"/.test(tag) && /fetchpriority="high"/.test(tag), 'image principale : srcset, sizes, dimensions, priorité haute');
  const css = readFileSync(join(dir, 'site', 'styles.css'), 'utf8');
  t.ok(css.includes('@view-transition{navigation:auto}') && css.includes('animation-timeline:view()'), 'CSS : transitions entre pages et apparition au défilement');

  const ctx = await t.browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  await p.route(/^https?:/, r => r.abort());
  const targets = [['index.html', 1280], ['index.html', 390], [join('nl', 'contact', 'index.html'), 1280], [join('accessibilite', 'index.html'), 390], [join('de', 'accessibilite', 'index.html'), 1280]];
  for (const [f, w] of targets) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto('file://' + join(dir, 'site', f));
    await p.addScriptTag({ path: AXE });
    const res = await p.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return r.violations.map(v => `${v.id} (${v.nodes.length}) : ${v.nodes[0]?.target?.join(' ')}`);
    });
    t.ok(res.length === 0, `axe-core ${f} à ${w} px : 0 violation WCAG 2.1 AA` + (res.length ? ' — ' + res.join(' | ') : ''));
  }
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.goto('file://' + join(dir, 'site', 'index.html'));
  const lcpImg = await p.locator('img[fetchpriority="high"]').count();
  t.ok(lcpImg === 1, 'une seule image prioritaire sur la page');
  await ctx.close();

  await page.screenshot({ path: `${t.shots}/cycle10.png` });
}
