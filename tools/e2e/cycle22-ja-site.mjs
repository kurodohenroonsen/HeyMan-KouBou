/* Cycle 22 : le japonais comme langue de contenu — activer 日本語, page « チーム » (adresse en rōmaji), traduction fr → ja,
 * note SEO aux seuils japonais, export .zip : lang="ja", hreflang, textes du site en japonais, polices japonaises. */
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mark, since } from './logs.mjs';

const FR_CHAR = /[àâçéèêëîïôûùüÿœ]/i;

export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(10000);
  const site = () => page.evaluate(() => window.__atelier.site);

  /* --- 1. Panneau Site : cocher 日本語 --- */
  let s = await mark(page);
  await page.click('[data-left="site"]');
  await page.waitForSelector('#leftBody [data-lang-toggle="ja"]');
  t.ok(/日本語/.test(await page.locator('#leftBody label:has([data-lang-toggle="ja"])').textContent()), 'panneau Site : case « 日本語 »');
  await page.check('#leftBody [data-lang-toggle="ja"]');
  await t.wait(300);
  let es = await since(page, s);
  t.ok((await site()).languages.includes('ja'), 'japonais ajouté aux langues du site');
  t.ok(es.some(e => e.code === 'settings.lang-add' && e.data?.lang === 'ja'), 'journal : settings.lang-add {"lang":"ja"}');
  t.ok(await page.locator('#langSelect option[value="ja"]').count() === 1, 'menu des langues affichées : JA');

  /* --- 2. Page « チーム » : adresse lisible --- */
  await page.click('[data-left="pages"]');
  await page.fill('#newPageTitle', 'チーム');
  s = await mark(page);
  await page.click('#addPageBtn');
  await t.wait(300);
  es = await since(page, s);
  let sv = await site();
  const team = sv.pages.find(p => p.title?.[sv.defaultLanguage] === 'チーム');
  t.ok(team?.slug === 'chiimu', `page « チーム » : adresse /${team?.slug}/ (attendu /chiimu/)`);
  t.ok(es.find(e => e.code === 'page.add')?.data?.slug === 'chiimu', 'journal : page.add avec slug=chiimu');
  t.ok((await page.locator('#toasts').textContent()).includes('/chiimu/'), 'message : /chiimu/');

  /* --- 3. Traduire fr → ja (traducteur de test) --- */
  await page.evaluate(() => { window.__atelierTranslator = async (text, from, to) => (to !== 'ja' ? text : text === 'チーム' ? 'チーム' : '日本語のテキスト'); });
  await page.click('#i18nBtn');
  await page.waitForSelector('#i18nDialog [data-mt-lang]');
  await page.selectOption('#i18nDialog [data-mt-lang]', 'ja');
  await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
  s = await mark(page);
  await page.click('#i18nDialog [data-mt-run]');
  await page.waitForSelector('#i18nDialog [data-mt-status][data-mt-done]', { timeout: 20000 });
  es = await since(page, s);
  const ok = es.find(e => e.code === 'translate.batch.ok');
  t.ok(ok && ok.data?.count > 0, `traduction fr → ja : ${ok?.data?.count} texte(s)`);
  t.ok(es.some(e => e.code === 'translate.batch.start' && e.data?.from === 'fr' && e.data?.to === 'ja'), 'journal : translate.batch fr → ja');
  sv = await site();
  t.ok(sv.pages.find(p => p.id === team.id)?.title?.ja === 'チーム' && sv.pages[0].title?.ja === '日本語のテキスト', 'titres traduits en japonais');
  await page.keyboard.press('Escape');
  await t.wait(200);

  /* --- 4. Note SEO de la page japonaise --- */
  s = await mark(page);
  await page.click('#seoBtn');
  await page.waitForSelector('#seoDialog [data-seo-page]');
  await page.selectOption('#seoDialog [data-seo-lang]', 'ja');
  await t.wait(200);
  await page.click(`#seoDialog [data-seo-pick="${team.id}"]`);
  await t.wait(300);
  const checks = await page.$$eval('#seoDialog [data-seo-checks] [data-check]', els => els.map(e => ({ id: e.dataset.check, text: e.textContent })));
  const title = checks.find(c => c.id.startsWith('title-'));
  t.ok(title?.id === 'title-long' && /32/.test(title.text), `SEO ja : titre jugé avec le seuil japonais (32) — ${title?.id} « ${title?.text?.slice(0, 80)} »`);
  const thin = checks.find(c => c.id === 'thin' || c.id === 'words-ok');
  t.ok(thin && /caractères/.test(thin.text) && !/mots/.test(thin.text), `SEO ja : texte compté en caractères (« ${thin?.text?.slice(0, 80)} »)`);
  es = await since(page, s);
  t.ok(es.some(e => e.code === 'seo.lang' && e.data?.to === 'ja'), 'journal : seo.lang → ja');
  await page.selectOption('#seoDialog [data-seo-lang]', 'fr');
  await t.wait(200);
  const frTitle = await page.$$eval('#seoDialog [data-seo-checks] [data-check^="title-"]', els => els.map(e => e.dataset.check));
  t.ok(frTitle.includes('title-ok'), `SEO fr : même titre de bonne longueur en français (${frTitle.join(', ')})`);
  await page.keyboard.press('Escape');
  await t.wait(200);

  /* --- 5. Export .zip --- */
  await page.click('#exportZipBtn');
  await t.wait(200);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export22-ja');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const read = f => { try { return readFileSync(join(dir, 'site', f), 'utf8'); } catch { return ''; } };
  const home = read('ja/index.html');
  const teamHtml = read('ja/chiimu/index.html');
  t.ok(home && teamHtml, 'export : ja/index.html et ja/chiimu/index.html');
  t.ok(/<html lang="ja">/.test(home) && /<html lang="ja">/.test(teamHtml), 'export : <html lang="ja">');
  t.ok(/<link rel="alternate" hreflang="ja" href="[^"]+\/ja\/chiimu\/">/.test(teamHtml) && /hreflang="fr"/.test(teamHtml), 'export : liens hreflang ja et fr');
  t.ok(/hreflang="ja" href="[^"]+\/ja\/chiimu\/"/.test(read('sitemap.xml')), 'export : sitemap avec la version japonaise');
  t.ok(home.includes('本文へ移動') && !home.includes('Aller au contenu'), 'export : lien d’évitement en japonais');
  t.ok(home.includes('メニュー'), 'export : menu en japonais');
  t.ok(/<title>チーム – /.test(teamHtml), 'export : titre de la page japonaise');
  const css = read('styles.css');
  t.ok(css.includes(':root:lang(ja)') && /Hiragino Sans.*Noto Sans JP.*Yu Gothic.*Meiryo/.test(css), 'export : polices japonaises de repli');

  /* page japonaise ouverte : police et textes visibles */
  const ctx = await t.browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + join(dir, 'site', 'ja', 'index.html'));
  const look = await p.evaluate(name => {
    const txt = document.body.innerText.split(name).join(' ').replace(/Français|Nederlands|Deutsch|English|日本語/g, '');
    const attrs = [...document.querySelectorAll('[aria-label],[title],[alt]')].map(e => [e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('alt')].filter(Boolean).join(' ')).join(' ').split(name).join(' ').replace(/Français|Nederlands|Deutsch|English|日本語/g, '');
    return { font: getComputedStyle(document.body).fontFamily, txt, attrs };
  }, sv.name);
  t.ok(/Noto Sans JP/.test(look.font), `page publiée : police japonaise de repli (${look.font.slice(0, 90)})`);
  const fr = `${look.txt} ${look.attrs}`.match(new RegExp(`.{0,30}${FR_CHAR.source}.{0,30}`, 'i'));
  t.ok(!fr, `page publiée en japonais : aucun texte français visible${fr ? ` (« ${fr[0]} »)` : ''}`);
  await p.screenshot({ path: `${t.shots}/c22-ja-site.png` });
  await ctx.close();
}
