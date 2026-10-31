/*
 * Cycle 29 : site publié conforme — CSP de l'éditeur sans violation, polices locales, police personnalisée, icône,
 * pages légales en un clic, consentement du formulaire, export servi sans aucun hôte tiers, page 404, .htaccess,
 * publish.php version 4 → message de mise à jour.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, expectCodes, capture } from './logs.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f766e"/><circle cx="32" cy="32" r="16" fill="#f59e0b" onclick="alert(1)"/></svg>';

async function serve(dir, port) {
  const p = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: dir, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return p; } catch { /* démarrage */ }
    await new Promise(r => setTimeout(r, 100));
  }
  return p;
}

export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(10000);
  /* ===== 0. Écouteur securitypolicyviolation dans l'éditeur et dans le canevas (srcdoc) ===== */
  await page.addInitScript(() => {
    const top = (() => { try { return window.top; } catch { return window; } })();
    top.__csp = top.__csp || [];
    document.addEventListener('securitypolicyviolation', e => top.__csp.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
  await page.goto(t.base + '?fresh=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
  t.ok(await page.locator('meta[http-equiv="Content-Security-Policy"]').count() === 1, 'index.html porte une CSP');
  t.ok(await page.locator('script:not([src])').count() === 0, 'aucun script en ligne dans index.html');
  const violations = () => page.evaluate(() => window.__csp.slice());

  /* ===== 1. Ouvrir toutes les fenêtres ===== */
  for (const [btn, dlg] of [['#publishBtn', '#publishDialog'], ['#seoBtn', '#seoDialog'], ['#i18nBtn', '#i18nDialog'], ['#aiBtn', '#aiDialog'], ['#collabBtn', '#collabDialog'], ['#logBtn', '#logDialog'], ['#exportZipBtn', '#auditDialog']]) {
    await page.click(btn);
    await page.waitForSelector(`${dlg}[open]`);
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  }
  await page.click('#fileMenu > summary');
  await page.click('#versionsBtn');
  await page.waitForSelector('#versionsDialog[open]');
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  t.ok((await violations()).length === 0, `fenêtres ouvertes : aucune violation CSP ${(await violations()).join(' | ')}`);

  /* ===== 2. Éditer : écrire dans un titre ===== */
  const h = t.canvas().locator('[data-type="heading"]').first();
  await h.dblclick();
  await page.keyboard.press('End');
  await page.keyboard.type(' 29');
  await page.keyboard.press('Escape');
  t.ok(/29/.test(await h.textContent()), 'texte modifié dans le canevas');

  /* ===== 3. Polices locales dans le canevas, police personnalisée, icône du site ===== */
  await page.click('[data-left="site"]');
  let s = await mark(page);
  await page.selectOption('[data-font="heading"]', 'fraunces');
  await page.waitForFunction(() => document.querySelector('#canvas').contentDocument?.fonts?.check('700 20px Fraunces'), null, { timeout: 8000 }).catch(() => {});
  const fontOk = await page.evaluate(async () => { const d = document.querySelector('#canvas').contentDocument; await d.fonts.load('700 20px Fraunces'); return d.fonts.check('700 20px Fraunces') && [...d.fonts].some(f => f.family.replace(/"/g, '') === 'Fraunces' && f.status === 'loaded'); });
  t.ok(fontOk, 'canevas : police Fraunces chargée depuis fonts/ (même origine)');
  const woff = readFileSync(join(ROOT, 'fonts/lora/lora-latin-wght-normal.woff2'));
  await page.fill('[data-font-family]', 'MAB Titling');
  await page.setInputFiles('[data-font-file]', { name: 'MAB-Titling.woff2', mimeType: 'font/woff2', buffer: woff });
  await page.waitForFunction(() => Object.keys(window.__atelier.site.fonts || {}).length === 1);
  const th = await page.evaluate(() => window.__atelier.site.theme.fonts.heading);
  t.ok(/^custom:font_/.test(th), `police personnalisée importée et appliquée aux titres (${th})`);
  await page.selectOption('[data-font="body"]', 'archivo');
  await page.setInputFiles('[data-site-icon]', { name: 'icone.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) });
  await page.waitForFunction(() => !!window.__atelier.site.icon);
  const icon = await page.evaluate(() => window.__atelier.site.icon);
  t.ok(icon.svg && !/onclick/.test(icon.svg) && [32, 180, 192, 512].every(n => /^data:image\/png;base64,/.test(icon.png[n])), 'icône : SVG assaini + PNG 32/180/192/512');
  let es = await since(page, s);
  expectCodes(t, es, ['settings.font', 'settings.font-import', 'settings.icon.start', 'settings.icon.ok'], 'polices et icône');
  capture('site-polices-icone', es.filter(e => /^settings\./.test(e.code)));

  /* ===== 4. Pages légales en un clic ===== */
  await page.click('[data-left="pages"]');
  s = await mark(page);
  await page.click('[data-legal-pages]');
  await page.waitForSelector('#legalDialog[open]');
  t.ok(/faire relire/.test(await page.textContent('[data-legal-warning]')), 'mention « modèle à adapter, à faire relire »');
  await page.click('#legalCreate');
  t.ok(await page.locator('#legalDialog[open]').count() === 1, 'champs obligatoires vides : fenêtre gardée');
  await page.fill('[data-legal="seat"]', 'Rue de Fer 1, 5000 Namur');
  await page.fill('[data-legal="number"]', '0123.456.789');
  await page.fill('[data-legal="email"]', 'contact@media-alternatif.be');
  await page.fill('[data-legal="host"]', 'OVH SAS, 2 rue Kellermann, 59100 Roubaix, France');
  await page.click('#legalCreate');
  await page.waitForSelector('#legalDialog', { state: 'detached' });
  const legal = await page.evaluate(() => window.__atelier.site.pages.filter(p => p.legal).map(p => `${p.legal}:${p.slug}:${p.footerLink}`));
  t.ok(legal.join() === 'legal:mentions-legales:true,privacy:vie-privee:true', `deux pages créées et liées au pied (${legal.join()})`);
  es = await since(page, s);
  expectCodes(t, es, ['page.legal.open', 'page.legal.refused', 'page.legal.create'], 'pages légales');
  capture('pages-legales', es.filter(e => /^page\.legal|^ui\.toast/.test(e.code)));

  /* ===== 5. Formulaire sur la page Contact ===== */
  const contactId = await page.evaluate(() => window.__atelier.site.pages.find(p => p.slug === 'contact').id);
  await page.selectOption('#pageSelect', contactId);
  await page.click('[data-left="widgets"]');
  await page.click('.lib-item[data-type="form"]');
  await page.click('[data-insp="content"]');
  await page.fill('#inspector [data-field="email"]', 'redaction@media-alternatif.be');
  await page.locator('#inspector [data-field="email"]').dispatchEvent('change');
  t.ok(await t.canvas().locator('input[name="_consent"][required]').count() === 1, 'canevas : case de consentement obligatoire');

  /* ===== 6. Export .zip, servi : aucun hôte tiers, icône, polices, 404, .htaccess ===== */
  s = await mark(page);
  await page.click('#exportZipBtn');
  await page.waitForSelector('#auditDialog[open]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const out = join(t.shots, 'site29');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const zipPath = join(t.shots, 'site29.zip');
  await dl.saveAs(zipPath);
  await new Promise((res, rej) => { const p = spawn('python3', ['-m', 'zipfile', '-e', zipPath, out], { stdio: 'ignore' }); p.on('exit', c => (c ? rej(new Error(`unzip ${c}`)) : res())); });
  for (const f of ['.htaccess', '404.html', 'nl/404.html', 'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'mentions-legales/index.html', 'vie-privee/index.html']) t.ok(existsSync(join(out, f)), `zip : ${f}`);
  const css = readFileSync(join(out, 'styles.css'), 'utf8');
  t.ok(/@font-face\{font-family:"Archivo"[^}]*assets\/fonts\/archivo-latin-400-normal-[0-9a-f]{8}\.woff2/.test(css) && /font-family:"MAB Titling"/.test(css), 'styles.css : @font-face locales (Archivo, MAB Titling)');
  t.ok(existsSync(join(out, 'assets/fonts')) && readFileSync(join(out, 'index.html'), 'utf8').includes('rel="preload"'), 'zip : assets/fonts/ et préchargement');
  t.ok(!/googleapis|gstatic/.test(css + readFileSync(join(out, 'index.html'), 'utf8')), 'aucune URL Google');
  es = await since(page, s);
  expectCodes(t, es, ['export.zip.start', 'fonts.load', 'export.zip.ok'], 'export');
  const port = 8870 + Math.floor(Math.random() * 25);
  const srv = await serve(out, port);
  try {
    const ctx = await t.browser.newContext({ locale: 'fr-FR' });
    const p = await ctx.newPage();
    const hosts = new Set();
    p.on('request', r => hosts.add(new URL(r.url()).hostname));
    await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await p.goto(`http://127.0.0.1:${port}/contact/`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    t.ok([...hosts].every(x => x === '127.0.0.1' || x === 'localhost'), `site servi : hôtes contactés = ${[...hosts].join(', ')}`);
    const fav = await p.evaluate(async () => { const l = document.querySelector('link[rel="icon"]'); return l ? (await fetch(l.href)).status : 0; });
    t.ok(fav === 200, 'onglet : icône du site (favicon.ico servi)');
    t.ok(await p.evaluate(() => document.fonts.check('700 20px "MAB Titling"')), 'site : police personnalisée chargée localement');
    const before = hosts.size;
    await p.click('form [type="submit"]');
    const blocked = await p.evaluate(() => { const f = document.querySelector('form'); return !f.checkValidity() && f.querySelector('input[name="_consent"]').matches(':invalid'); });
    t.ok(blocked && await p.evaluate(() => !document.querySelector('.form__status').textContent), 'formulaire sans consentement : non envoyé');
    t.ok(hosts.size === before, 'aucune requête d’envoi');
    const nf = await p.goto(`http://127.0.0.1:${port}/404.html`);
    t.ok(nf.ok() && /Page introuvable/.test(await p.textContent('h1')) && await p.locator('.nf__homes a').count() === 4, 'page 404 : titre et liens vers les 4 accueils');
    const nlHref = await p.locator('.nf__homes a >> nth=1').evaluate(a => a.href);
    t.ok(/\/nl\/$/.test(nlHref), `404 → accueil néerlandais (${nlHref})`);
    await p.screenshot({ path: `${t.shots}/c29-site-404.png` });
    await ctx.close();
  } finally { srv.kill(); }

  /* ===== 7. publish.php version 4 installé → message de mise à jour ===== */
  const www = join(t.shots, 'www29');
  rmSync(www, { recursive: true, force: true });
  mkdirSync(www, { recursive: true });
  writeFileSync(join(www, 'publish.php'), '<?php header("Content-Type: application/json"); header("Access-Control-Allow-Origin: *"); echo json_encode(["atelier" => true, "version" => "4", "php" => PHP_VERSION, "zip" => true, "signal" => true]);');
  const pport = 8900 + Math.floor(Math.random() * 40);
  const php = spawn('php', ['-S', `127.0.0.1:${pport}`, '-t', www], { stdio: 'ignore' });
  try {
    await new Promise(r => setTimeout(r, 400));
    s = await mark(page);
    await page.click('#publishBtn');
    await page.waitForSelector('#publishDialog[open]');
    await page.fill('#publishDialog [data-pub="url"]', `http://127.0.0.1:${pport}/publish.php`);
    await page.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
    await page.click('#publishDialog [data-pub-test]');
    await page.waitForSelector('#publishDialog [data-pub-status]:is(.is-ok, .is-error)');
    const st = await page.textContent('#publishDialog [data-pub-status]');
    t.ok(/Mise à jour conseillée : publish\.php version 5/.test(st), `version 4 : ${st.trim().slice(0, 140)}`);
    es = await since(page, s);
    expectCodes(t, es, ['publish.test.old-version'], 'publish.php v4');
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  } finally { php.kill(); }

  /* ===== 8. Aperçu, bilan CSP ===== */
  const v = await violations();
  t.ok(v.length === 0, `parcours complet : 0 violation CSP${v.length ? ` — ${v.slice(0, 3).join(' | ')}` : ''}`);
}
