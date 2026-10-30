/* Cycle 11 : adresses traduites, tableau des traductions, traduction automatique (traducteur de test), CSV, masquer par langue. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);

  /* --- 1. adresse traduite --- */
  let s = await site();
  const contact = s.pages.find(p => p.slug === 'contact');
  await page.click('[data-left="pages"]');
  await t.wait(150);
  await page.locator(`[data-page="${contact.id}"] > summary`).click();
  await page.fill(`[data-page-slug="${contact.id}"][data-lang="nl"]`, 'Neem contact op');
  await page.press(`[data-page-slug="${contact.id}"][data-lang="nl"]`, 'Enter');
  await t.wait(300);
  s = await site();
  t.ok(s.pages.find(p => p.id === contact.id).slugs?.nl === 'neem-contact-op', 'adresse NL nettoyée et enregistrée (neem-contact-op)');
  await page.selectOption('#langSelect', 'nl');
  await t.wait(400);
  t.ok(await c.locator('header .menu a[href="neem-contact-op/"]').count() === 1, 'menu en néerlandais : lien vers /nl/neem-contact-op/');
  await page.selectOption('#langSelect', 'fr');
  await t.wait(300);

  /* --- 2. tableau des traductions --- */
  await page.click('#i18nBtn');
  await t.wait(300);
  const rows = () => page.locator('#i18nDialog [data-i18n-row]');
  t.ok(await page.locator('#i18nDialog[open]').count() === 1 && await rows().count() > 15, `tableau des traductions (${await rows().count()} textes)`);
  t.ok(await page.locator('#i18nDialog thead th').count() === 5, 'une colonne par langue (FR, NL, DE, EN)');
  await page.selectOption('#i18nDialog [data-i18n-filter]', 'missing');
  await t.wait(200);
  const missingRows = await rows().count();
  t.ok(missingRows > 0 && await page.locator('#i18nDialog tbody tr:not(:has(td.is-missing))').count() === 0, `filtre « à traduire » : ${missingRows} lignes, toutes avec une case manquante`);
  await page.selectOption('#i18nDialog [data-i18n-filter]', 'all');
  await page.fill('#i18nDialog [data-i18n-search]', 'coopérative');
  await t.wait(200);
  const rowText = await rows().first().evaluate(r => r.innerText + ' ' + [...r.querySelectorAll('input, textarea')].map(i => i.value).join(' '));
  t.ok(await rows().count() >= 1 && rowText.includes('coopérative'), `recherche dans les textes (${await rows().count()} résultat)`);
  await page.fill('#i18nDialog [data-i18n-search]', '');
  await t.wait(200);

  const h1 = await c.locator('[data-type="heading"]:has(h1)').first().getAttribute('data-node');
  const key = `n:${s.pages[0].id}:${h1}:text`;
  const cell = page.locator(`#i18nDialog [data-i18n-row="${key}"] td[data-lang="de"] [data-i18n-cell]`);
  await cell.click();
  await page.keyboard.type('Freie Bürgerinformation');
  await page.locator('#i18nDialog [data-i18n-search]').click();
  await t.wait(300);
  s = await site();
  const h1Node = (n => { const f = x => x.id === h1 ? x : (x.children || []).reduce((a, k) => a || f(k), null); return f(n); })(s.pages[0].root);
  t.ok(h1Node.props.text.de === 'Freie Bürgerinformation', 'traduction allemande saisie dans le tableau');

  /* --- 3. traduction automatique (traducteur de test, comme l'API Chrome) --- */
  await page.evaluate(() => { window.__atelierTranslator = async (text, from, to) => `⟨${to}⟩ ${text}`; });
  await page.keyboard.press('Escape');
  await page.click('#i18nBtn');
  await t.wait(300);
  await page.selectOption('#i18nDialog [data-mt-lang]', 'en');
  await t.wait(200);
  t.ok(!(await page.locator('#i18nDialog [data-mt-run]').isDisabled()), 'traducteur disponible : bouton actif');
  await page.click('#i18nDialog [data-mt-run]');
  await page.waitForSelector('#i18nDialog [data-mt-status][data-mt-done]', { timeout: 15000 });
  const status = await page.locator('#i18nDialog [data-mt-status]').textContent();
  s = await site();
  const reviewCount = Object.keys(s.mt || {}).length;
  t.ok(reviewCount > 10 && /Terminé/.test(status), `traduction automatique vers l’anglais : ${reviewCount} textes (${status.trim()})`);
  t.ok(JSON.stringify(s.pages).includes('⟨en⟩ ') && JSON.stringify(s.pages).includes('<strong>⟨en⟩ sans compromis</strong>'), 'mise en forme conservée (gras traduit à l’intérieur de la balise)');
  t.ok(h1Node.props.text.de === 'Freie Bürgerinformation' && !JSON.stringify(s.pages).includes('⟨de⟩'), 'les autres langues ne sont pas touchées');
  t.ok(await page.locator('#i18nDialog [data-i18n-filter]').inputValue() === 'review' && await page.locator('#i18nDialog [data-review]').count() === reviewCount, 'les traductions automatiques sont listées « à relire »');
  await page.locator('#i18nDialog [data-review-ok]').first().click();
  await t.wait(200);
  t.ok(Object.keys((await site()).mt || {}).length === reviewCount - 1, '« Valider » retire une traduction de la liste à relire');
  await page.keyboard.press('Escape');
  await page.selectOption('#langSelect', 'en');
  await t.wait(400);
  await c.locator('[data-type="heading"]:has(h1) h1').dblclick();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await page.keyboard.press('Enter');
  await t.wait(300);
  t.ok(!Object.keys((await site()).mt || {}).includes(`${key}|en`), 'corriger un texte dans la page le retire aussi de la liste « à relire »');
  await page.selectOption('#langSelect', 'fr');
  await t.wait(300);
  await page.click('#exportZipBtn');
  await t.wait(200);
  t.ok((await page.locator('#auditDialog').textContent()).includes('à relire'), 'la vérification avant export rappelle les traductions à relire');
  await page.keyboard.press('Escape');

  /* --- 4. CSV : export puis import --- */
  await page.click('#i18nBtn');
  await t.wait(300);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#i18nDialog [data-i18n-export]')]);
  const dir = join(t.shots, 'csv11');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const csvPath = join(dir, 'traductions.csv');
  await dl.saveAs(csvPath);
  const csv = readFileSync(csvPath, 'utf8');
  t.ok(csv.startsWith('﻿key,type,fr,nl,de,en'), 'export CSV : en-tête et encodage UTF-8 pour les tableurs');
  const fixed = csv.replace('Freie Bürgerinformation', 'Unabhängige Bürgerinformation');
  writeFileSync(csvPath, fixed);
  await page.setInputFiles('#i18nDialog [data-i18n-import]', csvPath);
  await t.wait(500);
  s = await site();
  t.ok(JSON.stringify(s.pages).includes('Unabhängige Bürgerinformation'), 'import CSV : la correction du traducteur est appliquée');
  await page.keyboard.press('Escape');

  /* --- 5. masquer dans une langue --- */
  const txt = c.locator('[data-type="text"]').first();
  const txtId = await txt.getAttribute('data-node');
  await txt.click();
  await page.click('[data-insp="advanced"]');
  await page.check('#inspector [data-adv="hide-lang-nl"]');
  await t.wait(250);
  await page.selectOption('#langSelect', 'nl');
  await t.wait(400);
  t.ok(await c.locator(`[data-node="${txtId}"].is-lang-hidden`).count() === 1, 'masqué en néerlandais : visible en transparence dans l’éditeur');
  await page.selectOption('#langSelect', 'fr');
  await t.wait(300);

  /* --- 6. export : adresses traduites, hreflang --- */
  await page.click('#exportZipBtn');
  await t.wait(200);
  const [zip] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const ex = join(t.shots, 'export11');
  rmSync(ex, { recursive: true, force: true });
  mkdirSync(ex, { recursive: true });
  await zip.saveAs(join(ex, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(ex, 'site.zip'), join(ex, 'site')]);
  const files = readdirSync(join(ex, 'site'), { recursive: true }).map(String);
  t.ok(files.includes('nl/neem-contact-op/index.html') && files.includes('contact/index.html') && !files.includes('nl/contact/index.html'), 'export : /nl/neem-contact-op/ à la place de /nl/contact/');
  const deContact = readFileSync(join(ex, 'site', 'de', 'contact', 'index.html'), 'utf8');
  t.ok(deContact.includes('hreflang="nl" href="https://www.xn--mdia-alternatif-bnb.be/nl/neem-contact-op/"'), 'hreflang : chaque langue pointe vers son adresse traduite');
  const nlHome = readFileSync(join(ex, 'site', 'nl', 'index.html'), 'utf8');
  t.ok(!nlHome.match(/<main[\s\S]*<\/main>/)[0].includes('Le MAB réunit') && readFileSync(join(ex, 'site', 'index.html'), 'utf8').includes('Le MAB réunit'), 'texte masqué en néerlandais absent de la page NL, présent en FR');

  /* --- 7. sans traducteur intégré : explication --- */
  await page.evaluate(() => { delete window.__atelierTranslator; });
  await page.click('#i18nBtn');
  await page.waitForFunction(() => !/Vérification/.test(document.querySelector('#i18nDialog [data-mt-status]')?.textContent || 'Vérification'), null, { timeout: 8000 });
  const hasApi = await page.evaluate(() => 'Translator' in self);
  if (!hasApi) t.ok(await page.locator('#i18nDialog [data-mt-run]').isDisabled() && (await page.locator('#i18nDialog [data-mt-status]').textContent()).includes('Chrome 138'), 'sans API Translator : bouton désactivé, explication et alternative CSV');
  else t.ok((await page.locator('#i18nDialog [data-mt-status]').textContent()).length > 10, `API Translator présente dans ce navigateur, état affiché : « ${(await page.locator('#i18nDialog [data-mt-status]').textContent()).trim()} »`);
  await page.keyboard.press('Escape');

  await page.screenshot({ path: `${t.shots}/cycle11.png` });
}
