/*
 * Cycle 28 : modèles de sites (X2), contenus par défaut dans la langue principale (A8), fuseau horaire du site (W5).
 * Association de commerçants en français, Tourisme en japonais (textes, Asia/Tokyo, .ics), widget et modèle de section
 * dans un site japonais, site vide inchangé, réglage du fuseau dans l'onglet Site.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, waitCode, expectCodes, capture } from './logs.mjs';

const JA = /[぀-ヿ一-鿿]/;

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  page.setDefaultTimeout(10000);
  const site = () => page.evaluate(() => window.__atelier.site);

  async function newSite({ name, main, others = [], template }) {
    await page.click('#fileMenu > summary');
    await page.click('#newSiteBtn');
    await page.waitForSelector('#newSiteDialog[open]');
    if (name !== undefined) await page.fill('#newSiteName', name);
    if (main) await page.selectOption('#newSiteMain', main);
    for (const l of others) await page.check(`[data-new-lang="${l}"]`);
    if (template) await page.check(`[data-site-template="${template}"]`);
    const s = await mark(page);
    await page.click('#newSiteCreate');
    await waitCode(page, 'project.new', s, 10000);
    await page.waitForFunction(() => window.__atelier.ready === true);
    await t.wait(400);
    return s;
  }
  const showPage = async id => { await page.selectOption('#pageSelect', id); await t.wait(500); };

  /* ===== 1. La fenêtre « Nouveau site » : six choix avec vignette, « Site vide » coché par défaut ===== */
  await page.click('#fileMenu > summary');
  t.ok((await page.locator('#newSiteBtn').textContent()).trim() === 'Nouveau site…', 'Fichier → « Nouveau site… »');
  await page.click('#newSiteBtn');
  await page.waitForSelector('#newSiteDialog[open]');
  t.ok((await page.locator('#newSiteTitle').textContent()) === 'Nouveau site', 'titre de la fenêtre : Nouveau site');
  const ids = await page.locator('[data-site-template]').evaluateAll(els => els.map(e => e.value));
  t.ok(ids.join() === 'association,tourism,shop,merchants,event,blank', `six choix : ${ids.join(', ')}`);
  t.ok(await page.isChecked('[data-site-template="blank"]'), '« Site vide » choisi par défaut (comme avant)');
  const thumbs = await page.locator('.site-tpl__thumb').evaluateAll(els => els.map(e => e.complete && e.naturalWidth > 0 && e.src.startsWith('data:image/svg+xml')));
  t.ok(thumbs.length === 6 && thumbs.every(Boolean), 'six vignettes SVG dessinées, affichées');
  t.ok((await page.locator('.site-tpl', { hasText: 'Association de commerçants' }).textContent()).includes('les commerces'), 'description du modèle');
  await page.check('[data-site-template="merchants"]');
  await page.screenshot({ path: `${t.shots}/c28-nouveau-site-modeles.png` });
  await page.click('#newSiteCancel');
  await t.wait(200);

  /* ===== 2. Association de commerçants, en français ===== */
  let s0 = await newSite({ name: 'Commerces de Couvin', template: 'merchants' });
  let es = await since(page, s0);
  capture('c28-modele-commercants', es);
  expectCodes(t, es, ['version.save.ok', 'project.new'], 'nouveau site depuis un modèle (version de sécurité d’abord)');
  const ev1 = es.find(e => e.code === 'project.new');
  t.ok(ev1?.data?.template === 'merchants' && ev1.data.pages >= 7, `journal : modèle et nombre de pages (${ev1?.data?.pages})`);
  let s = await site();
  const slugs = s.pages.map(p => p.slug);
  t.ok(['', 'commerces', 'agenda', 'actualites', 'devenir-membre', 'contact', 'mentions-legales', 'vie-privee'].every(x => slugs.includes(x)), `pages : ${slugs.join(', ')}`);
  t.ok(s.name === 'Commerces de Couvin' && s.languages.join() === 'fr,nl,de,en', 'nom et langues gardés');
  t.ok(!JSON.stringify(s).includes('MAB'), 'aucune mention du MAB');
  const navLinks = await c.locator('[data-zone="header"] nav a').allTextContents();
  t.ok(['Accueil', 'Les commerces', 'Agenda', 'Actualités', 'Devenir membre', 'Contact'].every(x => navLinks.some(n => n.trim() === x)), `menu complet dans l’en-tête : ${navLinks.map(x => x.trim()).join(' · ')}`);
  t.ok(await c.locator('[data-zone="footer"]').count() === 1 && (await c.locator('[data-zone="footer"]').textContent()).includes('Mentions légales'), 'pied de page en blocs avec les pages légales');
  t.ok(/Achetez local/.test(await c.locator('h1').first().textContent()), 'accueil : titre du modèle');
  const shopsPage = s.pages.find(p => p.slug === 'commerces');
  await showPage(shopsPage.id);
  const cards = c.locator('.w-collection-list .cl > *');
  t.ok(await cards.count() === 4, `liste des commerces : 4 exemples (${await cards.count()})`);
  const first = await cards.first().textContent();
  t.ok(/Atelier du Cuir|Boulangerie du Centre/.test(first) && /Artisanat|Alimentation/.test(first), 'carte : nom et catégorie');
  t.ok(/Rue de l’Exemple/.test(first) && /h/.test(first), 'carte : adresse et horaires');
  await page.screenshot({ path: `${t.shots}/c28-commercants-commerces.png` });
  await page.click('#exportZipBtn');
  await page.waitForSelector('#auditDialog[open], dialog.audit[open]');
  const auditTxt = await page.locator('dialog.audit[open]').textContent();
  t.ok(/à compléter/.test(auditTxt), 'contrôle avant export : rappelle les mentions légales à compléter');
  await page.keyboard.press('Escape');
  await t.wait(200);

  /* ===== 3. Tourisme, en japonais : textes japonais, fuseau Asia/Tokyo, .ics avec TZID ===== */
  s0 = await newSite({ name: '久万高原町 観光ガイド', main: 'ja', others: ['fr'], template: 'tourism' });
  es = await since(page, s0);
  capture('c28-modele-tourisme-ja', es);
  s = await site();
  t.ok(s.defaultLanguage === 'ja' && [...s.languages].sort().join() === 'en,fr,ja' && s.languages[0] === 'ja', `langues : ${s.languages.join(', ')}`);
  t.ok(s.timezone === 'Asia/Tokyo', 'fuseau horaire proposé : Asia/Tokyo');
  t.ok(await c.locator('html').getAttribute('lang') === 'ja', 'la page s’affiche en japonais');
  t.ok(JA.test(await c.locator('h1').first().textContent()), `titre d’accueil en japonais : ${await c.locator('h1').first().textContent()}`);
  const navJa = await c.locator('[data-zone="header"] nav a').allTextContents();
  t.ok(navJa.length >= 4 && navJa.every(x => JA.test(x)), `menu en japonais : ${navJa.join(' · ')}`);
  const ev = Object.values(s.collections).find(x => x.kind === 'events');
  t.ok(ev.items.length === 4 && ev.items.every(i => JA.test(i.values.title.ja) && i.values.title.en && i.values.title.fr), 'agenda : 4 exemples en japonais (et traduits)');
  await showPage(ev.settings.listPage);
  t.ok(await c.locator('.w-collection-list .cl > *').count() >= 3 && JA.test(await c.locator('.w-collection-list').first().textContent()), 'page agenda : cartes en japonais');
  await page.screenshot({ path: `${t.shots}/c28-tourisme-ja.png` });
  await page.click('[data-left="site"]');
  t.ok(await page.inputValue('#leftBody [data-site="timezone"]') === 'Asia/Tokyo', 'onglet Site : fuseau Asia/Tokyo');
  await page.click('#exportZipBtn');
  await t.wait(300);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export28');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const files = readdirSync(join(dir, 'site'), { recursive: true }).map(String);
  const cal = files.find(f => /^[a-z-]+\/calendar\.ics$/.test(f));
  const ics = cal ? readFileSync(join(dir, 'site', cal), 'utf8') : '';
  t.ok(ics.includes('TZID:Asia/Tokyo') && /DTSTART;TZID=Asia\/Tokyo:\d{8}T063000/.test(ics) && !ics.includes('Brussels'), `export : ${cal} avec TZID:Asia/Tokyo`);
  const details = files.filter(f => /^[a-z-]+\/[a-z0-9-]+\/index\.html$/.test(f) && f.startsWith(`${cal.split('/')[0]}/`));
  const starts = details.map(f => [...readFileSync(join(dir, 'site', f), 'utf8').matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
    .map(m => JSON.parse(m[1])).find(x => x['@type'] === 'Event')?.startDate).filter(Boolean);
  t.ok(starts.length >= 3 && starts.filter(x => x.includes('T')).every(x => /T\d\d:\d\d:00\+09:00$/.test(x)), `JSON-LD : startDate avec +09:00 (${starts.join(' · ')})`);

  /* ===== 4. Dans ce site japonais : un widget et un modèle de section arrivent en japonais ===== */
  await showPage(s.pages[0].id);
  await page.click('[data-left="widgets"]').catch(() => {});
  await page.evaluate(() => window.__atelier.select?.(null));
  let s1 = await mark(page);
  await page.click('.lib-item[data-type="heading"]');
  await waitCode(page, 'action.add', s1);
  const added = (await since(page, s1)).find(e => e.code === 'action.add')?.data?.id;
  s = await site();
  const find = (n, id) => n.id === id ? n : (n.children || []).map(x => find(x, id)).find(Boolean);
  const hNode = find(s.pages[0].root, added);
  t.ok(hNode && Object.keys(hNode.props.text).join() === 'ja' && JA.test(hNode.props.text.ja), `widget Titre : texte d’exemple en japonais (${hNode && hNode.props.text.ja})`);
  await page.click('[data-left="templates"]');
  s1 = await mark(page);
  await page.click('[data-template="faq"]');
  await waitCode(page, 'template.insert', s1);
  const tplId = (await since(page, s1)).find(e => e.code === 'template.insert')?.data?.id;
  s = await site();
  const faq = JSON.stringify(find(s.pages[0].root, tplId));
  t.ok(faq && /よくある質問/.test(faq) && !faq.includes('"fr":'), 'modèle de section « Questions fréquentes » en japonais, sans texte français');
  t.ok(await c.locator('h2', { hasText: 'よくある質問' }).count() >= 1, 'affiché en japonais dans la page');

  /* ===== 5. Fuseau horaire réglable dans l'onglet Site ===== */
  await page.click('[data-left="site"]');
  const sTz = await mark(page);
  s1 = sTz;
  await page.fill('#leftBody [data-site="timezone"]', 'Europe/Paris');
  await page.locator('#leftBody [data-site="timezone"]').evaluate(e => e.dispatchEvent(new Event('change')));
  await waitCode(page, 'settings.timezone', s1);
  t.ok((await site()).timezone === 'Europe/Paris', 'fuseau modifié : Europe/Paris');
  s1 = await mark(page);
  await page.fill('#leftBody [data-site="timezone"]', 'Mars/Olympus');
  await page.locator('#leftBody [data-site="timezone"]').evaluate(e => e.dispatchEvent(new Event('change')));
  await waitCode(page, 'settings.refused', s1);
  t.ok((await site()).timezone === 'Europe/Paris' && await page.inputValue('#leftBody [data-site="timezone"]') === 'Europe/Paris', 'fuseau inconnu refusé, valeur précédente remise');
  capture('c28-fuseau', await since(page, sTz));

  /* ===== 6. « Site vide » : inchangé ===== */
  s0 = await newSite({ name: 'Site vide du test' });
  s = await site();
  t.ok(s.pages.length === 1 && !Object.keys(s.collections || {}).length && s.layout.header === null, 'site vide : une page, aucune collection, en-tête par défaut');
  t.ok(s.timezone === 'Europe/Brussels' && await c.locator('.ph--page').count() === 1, 'site vide : fuseau Europe/Brussels, invitation à glisser une section');
}
