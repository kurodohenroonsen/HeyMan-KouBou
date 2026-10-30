/* Cycle 24 : guide d'utilisation en HTML (trois langues), ouvert depuis l'éditeur (❓, Fichier, F1, Ctrl+K). */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mark, since, expectCodes } from './logs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export default async function (t) {
  const { page } = t;
  const ctx = page.context();
  page.setDefaultTimeout(8000);
  const popup = async action => {
    const [p] = await Promise.all([ctx.waitForEvent('page'), action()]);
    await p.waitForLoadState('domcontentloaded');
    const url = p.url();
    await p.close();
    return url;
  };

  /* ===== 1. Bouton ❓ : le sommaire du guide, dans la langue de l'interface ===== */
  t.ok(await page.locator('#helpBtn').isVisible(), 'bouton ❓ visible dans la barre');
  let s = await mark(page);
  let url = await popup(() => page.click('#helpBtn'));
  t.ok(/\/guide\/fr\/index\.html$/.test(url), `❓ ouvre le sommaire français (${url.replace(t.base, '')})`);
  let es = await since(page, s);
  expectCodes(t, es, ['ui.help'], 'ouvrir le guide');
  t.ok(es.find(e => e.code === 'ui.help')?.data?.lang === 'fr', 'journal : page et langue');

  /* ===== 2. F1 dans une fenêtre = le bon chapitre ===== */
  await page.click('#seoBtn');
  await page.waitForSelector('#seoDialog[open]');
  s = await mark(page);
  url = await popup(() => page.keyboard.press('F1'));
  t.ok(/\/guide\/fr\/06-seo\.html$/.test(url), 'F1 dans la fenêtre SEO → chapitre SEO');
  es = await since(page, s);
  t.ok(es.find(e => e.code === 'ui.help')?.data?.from === 'seoDialog', 'journal : fenêtre d’origine');
  t.ok(await page.locator('#seoDialog[open]').count() === 1, 'la fenêtre reste ouverte');
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));

  /* ===== 3. F1 sur le canevas, menu Fichier, Ctrl+K ===== */
  await t.canvas().locator('[data-type="heading"]').first().click();
  url = await popup(() => page.keyboard.press('F1'));
  t.ok(/\/guide\/fr\/index\.html$/.test(url), 'F1 depuis le canevas → sommaire');
  await page.click('#fileMenu > summary');
  url = await popup(() => page.click('#guideBtn'));
  t.ok(/\/guide\/fr\/index\.html$/.test(url), 'Fichier → Guide d’utilisation');
  t.ok(await page.evaluate(() => !document.querySelector('#fileMenu').open), 'le menu se referme');
  await page.keyboard.press('Control+k');
  await page.keyboard.type('guide');
  await t.wait(200);
  url = await popup(() => page.keyboard.press('Enter'));
  t.ok(/\/guide\/fr\//.test(url), 'Ctrl+K « guide » ouvre le guide');

  /* ===== 4. Chaque page existe dans les trois langues, et aucun lien interne n'est cassé ===== */
  const broken = [];
  let count = 0;
  for (const lang of ['fr', 'en', 'ja']) {
    const dir = join(ROOT, 'guide', lang);
    for (const f of readdirSync(dir).filter(f => f.endsWith('.html'))) {
      count++;
      const html = readFileSync(join(dir, f), 'utf8');
      for (const m of html.matchAll(/(?:href|src)="([^"#:?]+?)(?:[?#][^"]*)?"/g)) {
        if (!existsSync(join(dir, m[1]))) broken.push(`${lang}/${f} → ${m[1]}`);
      }
    }
  }
  t.ok(count >= 54, `${count} pages générées (au moins 18 × 3 langues)`);
  t.ok(broken.length === 0, 'aucun lien interne cassé' + (broken.length ? ' : ' + broken.slice(0, 4).join(', ') : ''));

  /* ===== 5. Une page du guide : lisible, détails techniques cachés par défaut ===== */
  const g = await ctx.newPage();
  const gErrors = [];
  g.on('pageerror', e => gErrors.push(e.message));
  g.on('console', m => { if (m.type() === 'error') gErrors.push(m.text()); });
  await g.goto(t.base + 'guide/fr/08-verifier-exporter-publier.html', { waitUntil: 'networkidle' });
  t.ok(await g.locator('h1').first().isVisible(), 'titre du chapitre');
  t.ok(await g.locator('.g-nav a[aria-current="page"]').count() === 1, 'chapitre courant marqué dans le menu');
  t.ok(await g.locator('.shot img').count() >= 1 && await g.locator('.shot img').first().evaluate(i => i.complete && i.naturalWidth > 0), 'capture d’écran affichée');
  const techCount = await g.locator('.tech, .tech-col, .tech-p').count();
  t.ok(techCount > 0, `éléments techniques présents (${techCount})`);
  t.ok(!(await g.locator('.tech-col').first().isVisible()), 'détails techniques cachés par défaut');
  await g.screenshot({ path: `${t.shots}/c24-guide-simple.png` });
  await g.check('#gTech');
  t.ok(await g.locator('.tech-col').first().isVisible(), 'case cochée : colonne « Journal » visible');
  await g.screenshot({ path: `${t.shots}/c24-guide-technique.png` });
  await g.reload({ waitUntil: 'networkidle' });
  t.ok(await g.isChecked('#gTech') && await g.locator('.tech-col').first().isVisible(), 'choix retenu au rechargement');
  await g.uncheck('#gTech');

  /* ===== 6. Recherche ===== */
  await g.keyboard.press('/');
  t.ok(await g.evaluate(() => document.activeElement.id === 'gSearch'), '« / » met le curseur dans la recherche');
  await g.keyboard.type('mot de passe');
  await g.waitForSelector('#gResults:not([hidden]) li a');
  const nRes = await g.locator('#gResults li a').count();
  t.ok(nRes >= 1, `recherche « mot de passe » : ${nRes} résultat(s)`);
  t.ok(await g.locator('#gResults mark').count() >= 1, 'mot trouvé surligné');
  await g.screenshot({ path: `${t.shots}/c24-guide-recherche.png` });
  const before = g.url();
  await g.keyboard.press('Enter');
  await g.waitForURL(u => u.toString() !== before);
  t.ok(/\.html#/.test(g.url()), `Entrée ouvre la section trouvée (${g.url().split('/guide/')[1]})`);
  await g.fill('#gSearch', 'publier');
  await t.wait(150);
  await g.fill('#gSearch', 'zzqxw');
  await t.wait(150);
  t.ok(await g.locator('#gResults a').count() === 0 && await g.locator('#gResults li').count() === 1, 'aucun résultat : message clair');

  /* ===== 7. Langues : même page en anglais et en japonais ===== */
  await g.goto(t.base + 'guide/fr/06-seo.html', { waitUntil: 'networkidle' });
  await g.click('.g-langs a[hreflang="en"]');
  await g.waitForLoadState('networkidle');
  t.ok(/\/guide\/en\/06-seo\.html$/.test(g.url()) && await g.getAttribute('html', 'lang') === 'en', 'English : même chapitre, lang="en"');
  await g.fill('#gSearch', 'password');
  await g.waitForSelector('#gResults:not([hidden]) li a');
  t.ok(await g.locator('#gResults li a').count() >= 1, 'recherche en anglais');
  await g.click('.g-langs a[hreflang="ja"]');
  await g.waitForLoadState('networkidle');
  t.ok(/\/guide\/ja\/06-seo\.html$/.test(g.url()) && await g.getAttribute('html', 'lang') === 'ja', '日本語 : même chapitre, lang="ja"');
  await g.fill('#gSearch', 'パスワード');
  await g.waitForSelector('#gResults:not([hidden]) li a');
  t.ok(await g.locator('#gResults li a').count() >= 1, 'recherche en japonais (sans espaces)');
  await g.screenshot({ path: `${t.shots}/c24-guide-ja.png` });
  t.ok(/index\.html\?lang=ja$/.test(await g.getAttribute('.g-editor', 'href')), 'bouton « ouvrir l’éditeur » garde la langue');

  /* ===== 8. Redirection d'accueil selon la langue ===== */
  await g.goto(t.base + 'guide/', { waitUntil: 'networkidle' });
  t.ok(/\/guide\/fr\/index\.html$/.test(g.url()), `guide/ → sommaire dans la langue du navigateur (${g.url().split('/guide/')[1]})`);

  /* ===== 9. Petit écran : menu repliable ===== */
  await g.setViewportSize({ width: 390, height: 800 });
  await g.goto(t.base + 'guide/fr/02-edition.html', { waitUntil: 'networkidle' });
  t.ok(!(await g.locator('#gNav').isVisible()), 'téléphone : menu des chapitres replié');
  await g.click('#gMenu');
  t.ok(await g.locator('#gNav').isVisible() && await g.getAttribute('#gMenu', 'aria-expanded') === 'true', 'bouton ☰ ouvre le menu');
  t.ok(await g.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'pas de défilement horizontal');
  await g.screenshot({ path: `${t.shots}/c24-guide-mobile.png` });
  t.ok(gErrors.length === 0, 'aucune erreur dans les pages du guide' + (gErrors.length ? ' : ' + gErrors.slice(0, 2).join(' | ') : ''));
  await g.close();

  /* ===== 9 bis. Nouveau site vide en japonais (pour l'exemple Kumakōgen) ===== */
  s = await mark(page);
  await page.click('#fileMenu > summary');
  await page.click('#newSiteBtn');
  await page.waitForSelector('#newSiteDialog[open]');
  t.ok(await page.inputValue('#newSiteMain') === 'fr' && await page.isChecked('[data-new-lang="nl"]') && await page.isChecked('[data-new-lang="en"]'), 'par défaut : français, puis néerlandais, allemand, anglais');
  await page.click('#newSiteCancel');
  await t.wait(200);
  es = await since(page, s);
  const nameAfterCancel = await page.evaluate(() => window.__atelier.site.name);
  t.ok(es.some(e => e.code === 'project.cancel' && e.data?.action === 'new') && /MAB/.test(nameAfterCancel), `Annuler : rien ne change (journal project.cancel) [${es.map(e => e.code).join(' ')} · ${nameAfterCancel}]`);
  await page.click('#fileMenu > summary');
  await page.click('#newSiteBtn');
  await page.selectOption('#newSiteMain', 'ja');
  t.ok(await page.locator('[data-new-lang="ja"]').isHidden() && await page.isChecked('[data-new-lang="en"]') && !(await page.isChecked('[data-new-lang="nl"]')), 'japonais choisi : case du japonais cachée, anglais proposé');
  await page.check('[data-new-lang="fr"]');
  await page.fill('#newSiteName', '久万高原町 観光ガイド');
  await page.screenshot({ path: `${t.shots}/c24-nouveau-site-ja.png` });
  s = await mark(page);
  await page.click('#newSiteCreate');
  await t.wait(700);
  const ns = await page.evaluate(() => { const x = window.__atelier.site; return { def: x.defaultLanguage, langs: x.languages, name: x.name, title: x.pages[0].title }; });
  t.ok(ns.def === 'ja' && ns.langs.join() === 'ja,fr,en', `site créé : ${ns.langs.join(', ')}`);
  t.ok(ns.name === '久万高原町 観光ガイド' && ns.title.ja === 'ホーム', 'nom et page « ホーム »');
  t.ok(await t.canvas().locator('html').getAttribute('lang') === 'ja', 'la page s’affiche en japonais');
  es = await since(page, s);
  expectCodes(t, es, ['version.save.ok', 'project.new'], 'nouveau site (version de sécurité d’abord)');
  t.ok(es.find(e => e.code === 'project.new')?.data?.lang === 'ja', 'journal : langue principale');
  await page.keyboard.press('Control+z');
  await t.wait(500);
  t.ok((await page.evaluate(() => window.__atelier.site.name)) === nameAfterCancel, 'Ctrl+Z : le site d’avant revient');

  /* ===== 10. Interface en anglais : le guide anglais ===== */
  await page.goto(t.base + '?lang=en', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
  url = await popup(() => page.click('#helpBtn'));
  t.ok(/\/guide\/en\/index\.html$/.test(url), 'interface en anglais → guide en anglais');
  t.ok(/guide/i.test(await page.getAttribute('#helpBtn', 'aria-label')), `bouton traduit (${await page.getAttribute('#helpBtn', 'aria-label')})`);
  await page.evaluate(() => localStorage.removeItem('atelier-ui-lang'));
}
