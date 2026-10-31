/* Cycle 16 : journal de débogage (navigateur, publish.php, site publié) — cas d'usage des chapitres 0, 1, 8 et 9 du guide, avec extraits réels. */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture, codes } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  const ev = () => page.evaluate(() => window.atelierDebug.entries());

  /* ===== 1. Démarrage ===== */
  {
    const es = await ev();
    expectCodes(t, es, ['boot.log', 'boot.start', 'boot.project', 'boot.ok'], 'démarrage');
    t.ok(es.find(e => e.code === 'boot.project')?.data?.source === 'fresh', 'démarrage : source « fresh » (?fresh=1)');
    expectNoErrors(t, es, 'démarrage');
    capture('demarrage-fresh', es);
  }

  /* ===== 2. Démarrage normal : projet rechargé depuis l'appareil ===== */
  {
    await page.fill('#siteName', 'MAB – test du journal');
    await t.wait(900);
    let es = await ev();
    expectCodes(t, es, ['store.commit', 'storage.save'], 'modification enregistrée');
    await page.goto(t.base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true);
    es = await ev();
    expectCodes(t, es, ['boot.start', 'storage.open', 'storage.load', 'boot.project', 'boot.ok'], 'rechargement');
    t.ok(es.find(e => e.code === 'boot.project')?.data?.source === 'saved', 'rechargement : projet enregistré retrouvé');
    capture('demarrage-enregistre', es);
  }

  /* ===== 3. Enregistrement impossible (espace plein simulé) ===== */
  {
    const s = await mark(page);
    await page.evaluate(() => {
      const orig = IDBObjectStore.prototype.put;
      window.__restorePut = () => { IDBObjectStore.prototype.put = orig; };
      IDBObjectStore.prototype.put = function () { throw new DOMException('Quota dépassé (simulé)', 'QuotaExceededError'); };
    });
    await page.fill('#siteName', 'MAB – plein');
    await t.wait(900);
    let es = await since(page, s);
    expectCodes(t, es, ['store.commit', 'storage.save-fail'], 'enregistrement impossible');
    t.ok(await page.textContent('#saveState') === 'Non enregistré', 'état « Non enregistré » affiché');
    await page.evaluate(() => window.__restorePut());
    await page.fill('#siteName', 'MAB – Médias Alternatifs Belges');
    await t.wait(900);
    es = await since(page, s);
    expectCodes(t, es, ['storage.save-recovered'], 'enregistrement rétabli');
    capture('enregistrement-impossible', es);
  }

  /* ===== 4. Fenêtre 🐞 Journal ===== */
  {
    const s = await mark(page);
    await page.click('#logBtn');
    await page.waitForSelector('#logDialog[open]');
    t.ok(await page.locator('#logDialog [data-log-list] li').count() > 5, 'journal : lignes affichées');
    await page.fill('#logDialog [data-log-search]', 'boot.ok');
    await t.wait(150);
    t.ok(await page.locator('#logDialog [data-log-list] li').count() >= 1 && await page.locator('#logDialog [data-log-list] li').count() < 5, 'journal : recherche');
    await page.fill('#logDialog [data-log-search]', '');
    await page.selectOption('#logDialog [data-log-level]', 'warn');
    await t.wait(150);
    t.ok(await page.locator('#logDialog [data-log-list] li.is-debug, #logDialog [data-log-list] li.is-info').count() === 0, 'journal : filtre par niveau');
    await page.selectOption('#logDialog [data-log-level]', 'debug');
    await page.click('#logDialog [data-log-copy]');
    await t.wait(400);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#logDialog [data-log-download]')]);
    const p = await dl.path();
    const txt = readFileSync(p, 'utf8');
    t.ok(txt.startsWith('=== Journal Atelier ==='), 'journal téléchargé : en-tête');
    t.ok(/navigateur : /.test(txt) && /projet : /.test(txt) && /éditeur : /.test(txt), 'journal téléchargé : environnement, projet, éditeur');
    t.ok(/boot\.ok/.test(txt), 'journal téléchargé : événements');
    t.ok(!/[0-9a-f]{64}/.test(txt), 'journal téléchargé : aucun jeton en clair');
    const before = await since(page, s);
    t.ok(codes(before).includes('log.download'), 'journal : log.download');
    t.ok(codes(before).includes('log.copy') || codes(before).includes('log.copy-fail'), 'journal : log.copy ou log.copy-fail');
    await page.click('#logDialog details:first-of-type summary');
    await page.selectOption('#logDialog [data-log-console]', 'info');
    await page.click('#logDialog [data-log-clear]');
    await t.wait(150);
    t.ok(await page.locator('#logDialog [data-log-list] li').count() <= 3, 'journal vidé');
    await page.selectOption('#logDialog [data-log-console]', 'debug');
    await page.keyboard.press('Escape');
    const es = await page.evaluate(() => window.atelierDebug.entries());
    expectCodes(t, es, ['log.clear', 'log.settings'], 'fenêtre du journal');
    capture('journal-fenetre', before.concat(es), { ui: true });
    await page.keyboard.press('Control+Alt+j');
    t.ok(await page.locator('#logDialog[open]').count() === 1, 'Ctrl+Alt+J ouvre le journal');
    await page.keyboard.press('Escape');
    const dump = await page.evaluate(() => window.atelierDebug.dump());
    t.ok(dump.includes('=== Journal Atelier ==='), 'atelierDebug.dump() dans la console');
  }

  /* ===== 5. Erreurs globales ===== */
  {
    const s = await mark(page);
    await page.evaluate(() => { setTimeout(() => { throw new Error('erreur-de-test-volontaire'); }); Promise.reject(new Error('erreur-de-test-volontaire (promesse)')); const i = document.createElement('img'); i.src = '/introuvable-erreur-de-test.png'; document.body.append(i); });
    await t.wait(500);
    await page.context().setOffline(true);
    await t.wait(200);
    await page.context().setOffline(false);
    await t.wait(200);
    const es = await since(page, s);
    expectCodes(t, es, ['app.uncaught', 'app.rejection', 'app.resource', 'app.offline', 'app.online'], 'erreurs globales');
    t.ok(await page.locator('[data-log-badge]:not([hidden])').count() === 1, 'pastille d’erreurs sur 🐞');
    capture('erreurs-globales', es);
  }

  /* ===== 6. Fichiers .json : enregistrer, ouvrir, refuser ===== */
  {
    let s = await mark(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
    const json = readFileSync(await dl.path(), 'utf8');
    let es = await since(page, s);
    expectCodes(t, es, ['project.export-json'], 'enregistrer .json');
    capture('projet-enregistrer-json', es);
    const dir = mkdtempSync(join(tmpdir(), 'atelier-c16-'));
    const good = join(dir, 'mab.atelier.json');
    writeFileSync(good, json);
    s = await mark(page);
    await page.setInputFiles('#importJson', good);
    await waitCode(page, 'project.import.ok', s);
    es = await since(page, s);
    expectCodes(t, es, ['project.import.start', 'store.load', 'project.import.ok'], 'ouvrir .json');
    capture('projet-ouvrir-json', es);
    const bad = join(dir, 'casse.json');
    writeFileSync(bad, '{ "name": "cassé", ');
    s = await mark(page);
    await page.setInputFiles('#importJson', bad);
    await waitCode(page, 'project.import.fail', s);
    const invalid = join(dir, 'invalide.json');
    writeFileSync(invalid, JSON.stringify({ name: 'Sans pages', pages: [] }));
    await page.setInputFiles('#importJson', invalid);
    await waitCode(page, 'project.import.invalid', s);
    es = await since(page, s);
    expectCodes(t, es, ['project.import.fail', 'project.import.invalid', 'ui.toast'], 'fichiers refusés');
    capture('projet-ouvrir-json-erreurs', es);
    rmSync(dir, { recursive: true, force: true });
  }

  /* ===== 7. Exemple, nouveau site, annulation, aperçu ===== */
  {
    const s = await mark(page);
    await page.evaluate(() => { window.__confirm = window.confirm; window.confirm = () => false; });
    await page.click('#fileMenu summary');
    await page.click('#loadDemoBtn');
    await page.evaluate(() => { window.confirm = window.__confirm; });
    await page.click('#fileMenu summary');
    await page.click('#newSiteBtn');
    await page.click('#newSiteCreate');
    await t.wait(400);
    await page.click('#fileMenu summary');
    await page.click('#loadDemoBtn');
    await t.wait(400);
    const [popup] = await Promise.all([page.waitForEvent('popup'), (async () => { await page.click('#fileMenu summary'); await page.click('#previewBtn'); })()]);
    await popup.close();
    const es = await since(page, s);
    expectCodes(t, es, ['project.cancel', 'project.new', 'project.demo', 'project.preview', 'store.load'], 'exemple, nouveau, aperçu');
    capture('projet-exemple-nouveau-apercu', es);
  }

  /* ===== 8. Commande Ctrl+K ===== */
  {
    const s = await mark(page);
    await page.keyboard.press('Control+k');
    await page.fill('#cmdkInput', 'journal de débogage');
    await t.wait(150);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#logDialog[open]');
    await page.keyboard.press('Escape');
    const es = await since(page, s);
    expectCodes(t, es, ['cmdk.run'], 'Ctrl+K');
    capture('commande-ctrl-k', es, { ui: true });
  }

  /* ===== 9. Export .zip ===== */
  {
    const s = await mark(page);
    await page.click('#exportZipBtn');
    await page.waitForSelector('#auditDialog[open]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
    await dl.path();
    const es = await since(page, s);
    expectCodes(t, es, ['audit.open', 'export.zip.start', 'export.zip.render', 'export.zip.ok'], 'export .zip');
    capture('export-zip', es);
  }

  /* ===== 10. Publication OVH avec un vrai publish.php (php -S) ===== */
  const port = 9400 + Math.floor(Math.random() * 200);
  const www = mkdtempSync(join(tmpdir(), 'atelier-c16-www-'));
  const mailLog = join(www, '..', `mail-c16-${port}.log`);
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', www], { stdio: 'ignore', env: { ...process.env, ATELIER_MAIL_LOG: mailLog } });
  const URL_ = `http://127.0.0.1:${port}/publish.php`;
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
    mkdirSync(join(www, 'vieux'));
    mkdirSync(join(www, 'avertissement'));
    writeFileSync(join(www, 'vieux', 'publish.php'), '<?php header("Access-Control-Allow-Origin: *"); header("Access-Control-Allow-Headers: X-Atelier-Token, Content-Type, Accept"); if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(204); exit; } header("Content-Type: application/json"); echo json_encode(["atelier" => true, "version" => "3", "php" => PHP_VERSION, "zip" => true]);');
    writeFileSync(join(www, 'avertissement', 'publish.php'), '<?php header("Access-Control-Allow-Origin: *"); header("Access-Control-Allow-Headers: X-Atelier-Token, Content-Type, Accept"); if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(204); exit; } echo "<br />\n<b>Warning</b>:  session_start(): Session cannot be started after headers have already been sent in <b>/home/www/publish.php</b> on line <b>12</b><br />\n"; echo json_encode(["atelier" => true, "version" => "4"]);');
    writeFileSync(join(www, 'page.html'), '<!doctype html><title>Pas PHP</title><p>Bonjour</p>');
    writeFileSync(join(www, 'publish.html'), '<!doctype html><p>introuvable</p>');

    /* formulaire de contact relié à publish.php sur la page Contact (pour le chapitre 9) */
    const contactPage = (await page.evaluate(() => window.__atelier.site.pages)).find(p => p.slug === 'contact');
    await page.selectOption('#pageSelect', contactPage.id);
    await t.wait(400);
    await page.click('[data-left="widgets"]');
    await page.click('.lib-item[data-type="form"]');
    await t.wait(300);
    await page.click('[data-insp="content"]');
    await page.fill('#inspector [data-field="email"]', 'redaction@media-alternatif.be');
    await t.wait(300);

    /* 10a. télécharger publish.php puis le déposer */
    let s = await mark(page);
    await page.click('#publishBtn');
    await page.waitForSelector('#publishDialog[open]');
    await page.click('#publishDialog [data-pub-tab="php"]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#publishDialog [data-pub-generate]')]);
    writeFileSync(join(www, 'publish.php'), readFileSync(await dl.path()));
    await page.fill('#publishDialog [data-pub="url"]', URL_);
    await page.dispatchEvent('#publishDialog [data-pub="url"]', 'change');
    let es = await since(page, s);
    expectCodes(t, es, ['publish.open', 'publish.php.generate'], 'télécharger publish.php');
    capture('publier-telecharger-php', es);

    /* 10b. tester la connexion (avec le jeton : diagnostic) */
    s = await mark(page);
    await page.click('#publishDialog [data-pub-test]');
    await page.click('#publishConfirmDialog [data-confirm-ok]'); /* cycle 25 : premier envoi du jeton vers cette adresse */
    await page.waitForSelector('#publishDialog [data-pub-ok]');
    await waitCode(page, 'php.diag', s);
    es = await since(page, s);
    expectCodes(t, es, ['publish.test.start', 'net.request', 'net.response', 'php.req.start', 'php.diag', 'php.status', 'publish.test.diag', 'publish.test.ok'], 'tester la connexion');
    t.ok(/Envoi max\./.test(await page.textContent('#publishDialog [data-pub-status]')), 'diagnostic affiché (limites d’envoi)');
    capture('publier-tester-connexion', es);

    /* 10c. publier */
    s = await mark(page);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForFunction(() => /Site publié/.test(document.querySelector('#publishDialog [data-pub-status]')?.textContent || ''), null, { timeout: 15000 });
    await waitCode(page, 'php.publish.ok', s);
    es = await since(page, s);
    expectCodes(t, es, ['publish.php.start', 'publish.php.version', 'publish.php.package', 'php.publish.start', 'php.publish.checked', 'php.publish.staged', 'php.publish.ok', 'php.req.end', 'publish.php.ok'], 'publier');
    expectNoErrors(t, es, 'publier');
    t.ok(existsSync(join(www, 'index.html')), 'site écrit sur le serveur');
    capture('publier-ovh', es);

    /* 10d. mauvais jeton */
    s = await mark(page);
    const goodToken = await page.inputValue('#publishDialog [data-pub="token"]');
    await page.fill('#publishDialog [data-pub="token"]', 'mauvais-jeton');
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForFunction(() => /Échec de la publication/.test(document.querySelector('#publishDialog [data-pub-status]')?.textContent || ''), null, { timeout: 15000 });
    await waitCode(page, 'php.publish.denied', s);
    es = await since(page, s);
    expectCodes(t, es, ['publish.php.start', 'php.publish.denied', 'publish.php.fail'], 'mauvais jeton');
    t.ok(/référence [0-9a-f]{8}/.test(await page.textContent('#publishDialog [data-pub-status]')), 'référence de la requête affichée');
    capture('publier-ovh-mauvais-jeton', es);

    /* 10e. jeton absent ; test avec un jeton faux (diagnostic refusé) */
    s = await mark(page);
    await page.fill('#publishDialog [data-pub="token"]', '');
    await page.click('#publishDialog [data-pub-run]');
    await t.wait(200);
    await page.fill('#publishDialog [data-pub="token"]', 'mauvais-jeton');
    await page.click('#publishDialog [data-pub-test]');
    await waitCode(page, 'publish.test.ok', s);
    es = await since(page, s);
    expectCodes(t, es, ['publish.php.fail', 'publish.test.token-refused', 'php.diag.denied'], 'jeton absent / faux');
    capture('publier-ovh-jeton-absent-faux', es);
    await page.fill('#publishDialog [data-pub="token"]', goodToken);

    /* 10f. adresse sans serveur, page qui n'est pas publish.php, ancienne version */
    s = await mark(page);
    for (const u of [`http://127.0.0.1:${port + 1}/publish.php`, `http://127.0.0.1:${port}/absent/publish.php`, `http://127.0.0.1:${port}/avertissement/publish.php`, `http://127.0.0.1:${port}/vieux/publish.php`]) {
      await page.fill('#publishDialog [data-pub="url"]', u);
      await page.click('#publishDialog [data-pub-test]');
      await page.waitForFunction(() => !/Test en cours/.test(document.querySelector('#publishDialog [data-pub-status]')?.textContent || ''), null, { timeout: 10000 });
    }
    es = await since(page, s);
    expectCodes(t, es, ['net.fail', 'publish.test.fail', 'publish.test.not-json', 'publish.test.old-version'], 'connexion en échec');
    capture('publier-tester-erreurs', es);
    await page.fill('#publishDialog [data-pub="url"]', URL_);
    await page.dispatchEvent('#publishDialog [data-pub="url"]', 'change');

    /* 10g. journal du serveur */
    await page.click('#publishDialog [data-pub="remember"]');
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForFunction(() => /Site publié/.test(document.querySelector('#publishDialog [data-pub-status]')?.textContent || ''), null, { timeout: 15000 });
    await page.keyboard.press('Escape');
    s = await mark(page);
    await page.click('#logBtn');
    await page.click('#logDialog details:last-of-type summary');
    await t.wait(300);
    t.ok(await page.inputValue('#logDialog [data-log-server-url]') === URL_, 'journal du serveur : adresse reprise de la publication');
    await page.click('#logDialog [data-log-server-read]');
    await waitCode(page, 'log.server.ok', s);
    t.ok(/php\.publish\.ok/.test(await page.textContent('#logDialog [data-log-server]')), 'journal du serveur affiché');
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#logDialog [data-log-download]')]);
    t.ok(readFileSync(await dl2.path(), 'utf8').includes('=== Journal du serveur (publish.php) ==='), 'journal téléchargé : lignes du serveur ajoutées');
    await page.fill('#logDialog [data-log-server-token]', 'faux');
    await page.click('#logDialog [data-log-server-read]');
    await waitCode(page, 'log.server.fail', s);
    es = await since(page, s);
    expectCodes(t, es, ['log.server.start', 'log.server.ok', 'php.logs.read', 'log.server.fail'], 'journal du serveur');
    capture('journal-serveur', es);
    writeFileSync(join(t.shots, '..', 'c16-journal-serveur.txt'), await page.textContent('#logDialog [data-log-server]').catch(() => ''));
    await page.screenshot({ path: join(t.shots, 'c16-journal.png') });
    await page.keyboard.press('Escape');

    /* ===== 11. Site publié : journal du site, formulaire de contact ===== */
    const site = await t.browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR' });
    const sp = await site.newPage();
    const lines = [];
    sp.on('console', m => lines.push(m.text()));
    await sp.goto(`http://127.0.0.1:${port}/?atelier-debug`, { waitUntil: 'networkidle' });
    await sp.click('.nav-burger').catch(() => {});
    const contactHref = await sp.evaluate(() => [...document.querySelectorAll('a')].find(a => /contact/i.test(a.getAttribute('href') || ''))?.getAttribute('href'));
    if (contactHref) await sp.goto(new URL(contactHref, sp.url()).href, { waitUntil: 'networkidle' });
    const hasForm = await sp.locator('form[data-endpoint]').count();
    if (hasForm) {
      for (const inp of await sp.locator('form[data-endpoint] input:not([type=hidden]):not([name=website]), form[data-endpoint] textarea').all()) {
        const type = await inp.getAttribute('type');
        if (type === 'checkbox') await inp.check(); else await inp.fill(type === 'email' ? 'ana@exemple.org' : 'Bonjour, test du journal du site.');
      }
      await sp.click('form[data-endpoint] [type=submit]');
      await sp.waitForFunction(() => document.querySelector('.form__status')?.textContent, null, { timeout: 8000 }).catch(() => {});
    }
    await sp.goto(`http://127.0.0.1:${port}/?atelier-debug=0`, { waitUntil: 'networkidle' });
    const siteLines = () => lines.filter(l => l.startsWith('[Atelier site]')).length;
    const quiet = siteLines();
    await sp.reload({ waitUntil: 'networkidle' });
    t.ok(siteLines() === quiet, 'site publié : muet après ?atelier-debug=0');
    const siteLog = lines.filter(l => l.startsWith('[Atelier site]'));
    t.ok(siteLog.some(l => l.includes('site.boot')), 'site publié : site.boot');
    t.ok(siteLog.some(l => l.includes('site.nav')), 'site publié : site.nav (menu mobile)');
    t.ok(!hasForm || (siteLog.some(l => l.includes('site.form.submit')) && siteLog.some(l => l.includes('site.form.ok'))), 'site publié : site.form.submit puis site.form.ok');
    mkdirSync(new URL('../../docs/guide/journaux/', import.meta.url).pathname, { recursive: true });
    writeFileSync(new URL('../../docs/guide/journaux/site-publie-console.log', import.meta.url).pathname, siteLog.join('\n') + '\n');
    await site.close();

    /* le même envoi, vu dans le journal du serveur */
    const fmt = e => `${e.t} ${e.lvl.toUpperCase().padEnd(5)} ${e.ev} [req ${e.req} · ${e.ms} ms] ${e.msg}${e.data ? ` ${JSON.stringify(e.data)}` : ''}`;
    const srv = await (await fetch(`${URL_}?logs=40`, { headers: { 'X-Atelier-Token': goodToken } })).json();
    const contactLines = srv.lines.filter(l => l.route === 'contact' || /^php\.contact\./.test(l.ev) || (l.ev === 'php.req.end' && l.data?.route === 'contact'));
    t.ok(contactLines.some(l => l.ev === 'php.contact.sent'), 'serveur : php.contact.sent dans le journal');
    writeFileSync(new URL('../../docs/guide/journaux/php-journal-contact.log', import.meta.url).pathname, contactLines.map(fmt).join('\n') + '\n');

    /* formulaire refusé (formulaire inconnu) : vu côté serveur */
    const r = await fetch(`${URL_}?atelier_debug=1`, { method: 'POST', body: new URLSearchParams({ _form: 'inconnu', Message: 'x' }), headers: { Accept: 'application/json' } });
    const b = await r.json();
    t.ok(r.status === 404 && b._trace.some(e => e.ev === 'php.contact.unknown'), 'serveur : php.contact.unknown');
    writeFileSync(new URL('../../docs/guide/journaux/php-contact-inconnu.log', import.meta.url).pathname, b._trace.map(e => `${e.t} ${e.lvl.toUpperCase().padEnd(5)} ${e.ev} [req ${e.req} · ${e.ms} ms] ${e.msg}${e.data ? ` ${JSON.stringify(e.data)}` : ''}`).join('\n') + '\n');
  } finally {
    php.kill();
    rmSync(www, { recursive: true, force: true });
    rmSync(mailLog, { force: true });
  }

  /* ===== 12. GitHub (API simulée) ===== */
  {
    const calls = [];
    await page.route('https://api.github.com/**', async route => {
      const u = new URL(route.request().url());
      const m = route.request().method();
      calls.push(`${m} ${u.pathname}`);
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
      if (route.request().headers().authorization === 'Bearer refuse') return json(401, { message: 'Bad credentials' });
      if (m === 'GET' && /\/git\/ref\/heads\//.test(u.pathname)) return json(200, { object: { sha: 'p'.repeat(40) } });
      if (m === 'GET' && /\/git\/commits\//.test(u.pathname)) return json(200, { tree: { sha: 't'.repeat(40) } });
      if (m === 'GET' && /\/git\/trees\//.test(u.pathname)) return json(200, { tree: [], truncated: false });
      if (m === 'POST' && /\/git\/blobs$/.test(u.pathname)) return json(201, {});
      if (m === 'POST' && /\/git\/trees$/.test(u.pathname)) return json(201, { sha: 'n'.repeat(40) });
      if (m === 'POST' && /\/git\/commits$/.test(u.pathname)) return json(201, { sha: 'c0ffee1'.padEnd(40, '0') });
      if (m === 'PATCH') return json(200, {});
      return json(404, { message: 'Not Found' });
    });
    let s = await mark(page);
    await page.click('#publishBtn');
    await page.click('#publishDialog [data-pub-tab="github"]');
    await page.fill('#publishDialog [data-gh="owner"]', 'aktina');
    await page.fill('#publishDialog [data-gh="repo"]', 'site-mab');
    await page.dispatchEvent('#publishDialog [data-gh="repo"]', 'change');
    await page.fill('#publishDialog [data-gh="token"]', 'github_pat_test');
    await page.click('#publishDialog [data-gh-run]');
    await page.click('#publishConfirmDialog [data-confirm-ok]'); /* cycle 25 : première publication vers ce dépôt */
    await waitCode(page, 'publish.github.ok', s, 15000);
    let es = await since(page, s);
    expectCodes(t, es, ['publish.github.start', 'publish.github.package', 'publish.github.upload', 'publish.github.ok'], 'GitHub');
    capture('publier-github', es);
    s = await mark(page);
    await page.fill('#publishDialog [data-gh="token"]', 'refuse');
    await page.click('#publishDialog [data-gh-run]');
    await waitCode(page, 'publish.github.fail', s, 15000);
    es = await since(page, s);
    expectCodes(t, es, ['publish.github.start', 'net.response', 'publish.github.fail'], 'GitHub refusé');
    capture('publier-github-refuse', es);
    await page.unroute('https://api.github.com/**');
    await page.keyboard.press('Escape');
  }
}
