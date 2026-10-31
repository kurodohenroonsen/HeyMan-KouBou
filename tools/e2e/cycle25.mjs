/* Cycle 25 : colmatage de sécurité. (a) .json piégé (<img onerror>, <script>) ouvert, 🌐 Traductions et inspecteur : 0 exécution,
   textes nettoyés journalisés ; (b) jeton gardé pour une origine A, projet importé avec l'adresse B → champ vide, message,
   migration de l'ancienne clé ; (c) première publication vers une origine jamais utilisée → confirmation (annulée, puis acceptée) ;
   (d) collaboration : opération d'un éditeur sur publish refusée, opération piégée assainie, snapshot invalide refusé,
   snapshot piégé assaini ; publish jamais partagé. */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture, codes } from './logs.mjs';

const XSS = '<img src=x onerror="top.__xss=(top.__xss||0)+1">';
const nodePath = (root, id) => {
  const f = (n, p) => (n.id === id ? p : (n.children || []).map(c => f(c, [...p, 'children', `#i:${c.id}`])).find(Boolean));
  return f(root, []);
};

export default async function (t) {
  const { page, browser, base } = t;
  const has = (es, c) => codes(es).includes(c);
  const errors = [];
  const contexts = [];
  const ts = () => `${String(Date.now() + 5000).padStart(16, '0')}.0000.force`;
  const xssCount = pg => pg.evaluate(() => window.__xss || 0);
  const siteOf = pg => pg.evaluate(() => window.__atelier.site);
  const noXss = s => !/onerror|<img|<script/i.test(JSON.stringify(s));
  const dir = join(t.shots, 'c25');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await page.addInitScript(() => { window.__xss = 0; });
  await page.goto(`${base}?fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
  const exportJson = async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
    return JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
  };
  const importJson = async (obj, name) => {
    const file = join(dir, name);
    writeFileSync(file, JSON.stringify(obj));
    const s = await mark(page);
    await page.setInputFiles('#importJson', file);
    await waitCode(page, 'project.import.ok', s).catch(() => {});
    return since(page, s);
  };
  const firstNode = (site, type) => { const f = n => (n.type === type ? n : (n.children || []).map(f).find(Boolean)); return f(site.pages[0].root); };

  /* ===== (a) Projet .json piégé ===== */
  const trapped = await exportJson();
  const text0 = firstNode(trapped, 'text');
  const head0 = firstNode(trapped, 'heading');
  text0.props.content.fr = `<p>Texte piégé ${XSS}<script>top.__xss=(top.__xss||0)+1</script></p>`;
  head0.props.text.fr = `Titre piégé ${XSS}`;
  trapped.pages[0].title.fr = `Accueil ${XSS}`;
  trapped.footer.text.fr = `© piégé ${XSS}`;
  let es = await importJson(trapped, 'piege.atelier.json');
  expectCodes(t, es, ['project.import.start', 'project.import.sanitized', 'store.load', 'project.import.ok'], 'ouvrir un .json piégé');
  const san = es.find(e => e.code === 'project.import.sanitized');
  t.ok(san?.level === 'warn' && san.data?.changed === 4, `project.import.sanitized : WARN, 4 textes (${san?.data?.changed})`);
  t.ok(await page.locator('#toasts .toast', { hasText: 'nettoyé' }).count() >= 1, 'message « … textes ont été nettoyés »');
  let site = await siteOf(page);
  t.ok(noXss(site), 'projet chargé : plus aucun onerror / img / script');
  t.ok(firstNode(site, 'heading').props.text.fr === 'Titre piégé ' && firstNode(site, 'text').props.content.fr === '<p>Texte piégé </p>', 'textes nettoyés, contenu gardé');
  capture('projet-ouvrir-json-nettoye', es);
  await page.click('#i18nBtn');
  await page.waitForSelector('#i18nDialog[open]');
  await t.wait(400);
  t.ok(await page.locator('#i18nDialog [data-i18n-cell] img').count() === 0, '🌐 Traductions : aucune image injectée dans les cellules');
  await page.keyboard.press('Escape');
  const hid = firstNode(site, 'text').id;
  await t.canvas().locator(`[data-node="${hid}"]`).click();
  await page.click('[data-insp="content"]');
  await page.waitForSelector('#inspector .rich-input');
  await t.wait(300);
  t.ok((await xssCount(page)) === 0, 'canevas, 🌐 Traductions, inspecteur : 0 exécution de script');

  /* ===== (b) Jeton lié à l'adresse ===== */
  const portA = 8700 + Math.floor(Math.random() * 40);
  const portB = portA + 40;
  const originA = `http://127.0.0.1:${portA}`;
  const originB = `http://127.0.0.1:${portB}`;
  let s = await mark(page);
  await page.click('#publishBtn');
  await page.waitForSelector('#publishDialog[open]');
  await page.fill('#publishDialog [data-pub="url"]', `${originA}/publish.php`);
  await page.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
  await page.click('#publishDialog [data-pub="remember"]');
  const [dlA] = await Promise.all([page.waitForEvent('download'), page.click('#publishDialog [data-pub-generate]')]);
  await dlA.path();
  const tokenA = await page.locator('#publishDialog [data-pub="token"]').inputValue();
  await waitCode(page, 'storage.secret-write', s, 4000).catch(() => {});
  es = await since(page, s);
  t.ok(es.some(e => e.code === 'storage.secret-write' && e.data?.name === `php-token:${originA}`), `jeton gardé sous php-token:${originA}`);
  t.ok(!JSON.stringify(es).includes(tokenA), 'le jeton n’apparaît pas dans le journal');
  await page.keyboard.press('Escape');
  s = await mark(page);
  await page.click('#publishBtn');
  await page.waitForFunction(() => document.querySelector('#publishDialog [data-pub="token"]')?.value.length > 10, null, { timeout: 4000 }).catch(() => {});
  t.ok((await page.locator('#publishDialog [data-pub="token"]').inputValue()) === tokenA, 'même adresse : jeton pré-rempli');
  await page.keyboard.press('Escape');
  const other = await exportJson();
  other.publish = { ...(other.publish || {}), mode: 'php', url: `${originB}/publish.php` };
  es = await importJson(other, 'autre-adresse.atelier.json');
  expectCodes(t, es, ['project.import.publish-url', 'project.import.ok'], 'ouvrir un .json avec une autre adresse de publication');
  t.ok(!has(es, 'project.import.sanitized'), 'projet propre : pas de texte nettoyé');
  capture('projet-ouvrir-json-autre-adresse', es);
  s = await mark(page);
  await page.click('#publishBtn');
  await page.waitForSelector('#publishDialog [data-pub-status].is-info', { timeout: 4000 }).catch(() => {});
  es = await since(page, s);
  t.ok((await page.locator('#publishDialog [data-pub="token"]').inputValue()) === '', 'adresse B : champ jeton vide');
  t.ok(/jamais utilisée/.test(await page.textContent('#publishDialog [data-pub-status]')), 'adresse B : message « Adresse jamais utilisée sur cet appareil »');
  expectCodes(t, es, ['publish.open', 'publish.token-for'], 'fenêtre Publier, adresse B');
  capture('publier-jeton-autre-adresse', es);
  await page.keyboard.press('Escape');
  /* Migration de l'ancienne clé « php-token » (avant le cycle 25) vers l'origine du projet */
  await page.evaluate(async () => { const st = await import('/editor/storage.js'); await st.setSecret('php-token', 'ancien-jeton-0123456789abcdef'); });
  s = await mark(page);
  await page.click('#publishBtn');
  await waitCode(page, 'storage.secret-migrated', s, 4000).catch(() => {});
  await page.waitForFunction(() => document.querySelector('#publishDialog [data-pub="token"]')?.value.length > 10, null, { timeout: 4000 }).catch(() => {});
  es = await since(page, s);
  expectCodes(t, es, ['storage.secret-migrated'], 'migration de l’ancienne clé');
  t.ok((await page.locator('#publishDialog [data-pub="token"]').inputValue()) === 'ancien-jeton-0123456789abcdef', 'ancien jeton rattaché à l’adresse du projet et pré-rempli');
  t.ok(!JSON.stringify(es).includes('ancien-jeton-0123456789abcdef'), 'le jeton migré n’apparaît pas dans le journal');
  capture('publier-jeton-migration', es);

  /* ===== (c) Première publication vers une origine jamais utilisée ===== */
  const www = join(dir, 'wwwB');
  mkdirSync(www, { recursive: true });
  const [dlB] = await Promise.all([page.waitForEvent('download'), page.click('#publishDialog [data-pub-generate]')]);
  await dlB.saveAs(join(www, 'publish.php'));
  const php = spawn('php', ['-S', `127.0.0.1:${portB}`, '-t', www], { stdio: 'ignore' });
  try {
    await t.wait(400);
    s = await mark(page);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishConfirmDialog[open]', { timeout: 5000 });
    const txt = await page.textContent('#publishConfirmDialog');
    t.ok(txt.includes(`127.0.0.1:${portB}`) && /première fois/.test(txt), `confirmation « … pour la première fois » avec l’hôte (${txt.trim().slice(0, 60)}…)`);
    await page.click('#publishConfirmDialog [data-confirm-cancel]');
    await waitCode(page, 'publish.php.cancel', s, 4000).catch(() => {});
    es = await since(page, s);
    expectCodes(t, es, ['publish.php.start', 'publish.first-origin', 'publish.php.cancel'], 'première publication annulée');
    t.ok(!has(es, 'net.request'), 'annulée : rien n’a été envoyé au serveur');
    t.ok(/annulée/.test(await page.textContent('#publishDialog [data-pub-status]')), 'message « Publication annulée »');
    capture('publier-premiere-fois-annulee', es);
    s = await mark(page);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishConfirmDialog[open]', { timeout: 5000 });
    await page.click('#publishConfirmDialog [data-confirm-ok]');
    await page.waitForSelector('#publishDialog [data-pub-status][data-pub-ok]', { timeout: 15000 });
    es = await since(page, s);
    expectCodes(t, es, ['publish.php.start', 'publish.first-origin', 'publish.php.package', 'publish.php.ok'], 'première publication confirmée');
    expectNoErrors(t, es, 'première publication confirmée');
    capture('publier-premiere-fois', es);
    s = await mark(page);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishDialog [data-pub-status]:not([data-pub-ok])', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('#publishDialog [data-pub-status][data-pub-ok]', { timeout: 15000 });
    es = await since(page, s);
    t.ok(!has(es, 'publish.first-origin') && (await page.locator('#publishConfirmDialog').count()) === 0, 'deuxième publication vers la même adresse : pas de confirmation');
    await page.keyboard.press('Escape');

    /* ===== (d) Collaboration : parties privées, textes assainis, snapshot vérifié ===== */
    await page.evaluate(() => { localStorage.setItem('atelier-stun', ''); });
    const newPage = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
      contexts.push(ctx);
      await ctx.addInitScript(() => { window.__xss = 0; try { if (!localStorage.getItem('atelier-stun-set')) { localStorage.setItem('atelier-stun', ''); localStorage.setItem('atelier-stun-set', '1'); } } catch { /* ignoré */ } });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(`page invitée : ${e.message}`));
      p.on('dialog', d => d.accept());
      return p;
    };
    const waitFor = async (pg, fn, arg, ms = 15000) => pg.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
    const sendTo = (pg, msg) => pg.evaluate(m => { const st = [...window.__collab.session.node.links.values()].find(x => x.authed); st.link.send(m); }, msg);
    await page.click('#collabBtn');
    await page.waitForSelector('#collabDialog [data-collab-name]');
    await page.fill('#collabDialog [data-collab-name]', 'Kudoro');
    await page.locator('#collabDialog [data-collab-name]').dispatchEvent('change');
    await page.waitForSelector('#collabDialog [data-collab-start]:not([disabled])');
    await page.click('#collabDialog [data-collab-start]');
    await page.waitForSelector('#collabDialog [data-invite="editor"]');
    const link = await page.locator('#collabDialog [data-invite="editor"]').inputValue();
    await page.keyboard.press('Escape');
    const B = await newPage();
    await B.goto(link);
    await B.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    await B.fill('#joinDialog [data-join-name]', 'Ana');
    await B.click('#joinDialog [data-join-go]');
    const okB = await waitFor(B, () => window.__collab?.session?.node?.peers().some(p => p.authed) && !!window.__collab.session.node.replica.docId && !document.querySelector('#joinDialog'));
    t.ok(okB, 'invitée éditrice connectée, projet reçu');
    await t.wait(500);
    t.ok((await B.evaluate(() => window.__atelier.site.publish)) === undefined, 'le projet reçu ne contient pas la partie privée publish');
    site = await siteOf(page);
    /* d1. opération sur publish */
    s = await mark(page);
    let sB = await mark(B);
    await sendTo(B, { t: 'ops', ops: [{ p: ['publish', 'url'], v: 'https://attaquant.example/publish.php', ts: ts() }] });
    await waitCode(page, 'collab.ops.rejected', s, 6000).catch(() => {});
    await waitCode(B, 'collab.remote-error', sB, 6000).catch(() => {});
    es = await since(page, s);
    const rej = es.find(e => e.code === 'collab.ops.rejected');
    t.ok(rej && rej.data?.reason === 'partie privée', `hôte : opération sur publish refusée (${rej?.data?.reason})`);
    t.ok((await siteOf(page)).publish.url === `${originB}/publish.php`, 'hôte : adresse de publication intacte');
    capture('collab-partie-privee-hote', es.filter(e => e.code !== 'collab.presence'));
    let esB = await since(B, sB);
    expectCodes(t, esB, ['collab.remote-error'], 'invitée : refus reçu');
    capture('collab-partie-privee-invite', esB.filter(e => e.code !== 'collab.presence'));
    /* d2. opération piégée */
    const h0 = firstNode(site, 'heading');
    const p0 = ['pages', `#i:${site.pages[0].id}`, 'root', ...nodePath(site.pages[0].root, h0.id), 'props', 'text', 'fr'];
    s = await mark(page);
    await sendTo(B, { t: 'ops', ops: [{ p: p0, v: `Piège ${XSS}`, ts: ts() }] });
    await waitCode(page, 'collab.ops.sanitized', s, 6000).catch(() => {});
    await t.wait(400);
    es = await since(page, s);
    expectCodes(t, es, ['collab.ops.sanitized', 'collab.ops.in', 'store.remote'], 'opération piégée (hôte)');
    t.ok(firstNode(await siteOf(page), 'heading').props.text.fr === 'Piège ' && (await xssCount(page)) === 0, 'hôte : texte reçu nettoyé, 0 exécution');
    capture('collab-operation-nettoyee', es.filter(e => e.code !== 'collab.presence'));
    /* d3. snapshot invalide de l'hôte */
    const nameB = await B.evaluate(() => window.__atelier.site.name);
    sB = await mark(B);
    await sendTo(page, { t: 'snapshot', snapshot: { docId: 'doc_casse', doc: { version: 2, pages: 'rien' }, table: {} } });
    await waitCode(B, 'collab.snapshot.invalid', sB, 6000).catch(() => {});
    esB = await since(B, sB);
    expectCodes(t, esB, ['collab.snapshot.invalid'], 'snapshot invalide (invitée)');
    t.ok(!has(esB, 'collab.snapshot') && !has(esB, 'store.load'), 'snapshot invalide : rien n’est chargé');
    t.ok((await B.evaluate(() => window.__atelier.site.name)) === nameB, 'invitée : projet intact');
    t.ok(await B.locator('#toasts .toast', { hasText: 'refusé' }).count() >= 1, 'invitée : message « Projet reçu … refusé »');
    capture('collab-snapshot-invalide', esB.filter(e => e.code !== 'collab.presence'));
    /* d4. snapshot piégé de l'hôte */
    const doc = await siteOf(page);
    delete doc.publish;
    firstNode(doc, 'heading').props.text.fr = `Snapshot ${XSS}`;
    sB = await mark(B);
    await sendTo(page, { t: 'snapshot', snapshot: { docId: 'doc_piege', doc, table: {} } });
    await waitCode(B, 'collab.snapshot.sanitized', sB, 6000).catch(() => {});
    await t.wait(500);
    esB = await since(B, sB);
    expectCodes(t, esB, ['collab.snapshot.sanitized', 'collab.snapshot', 'store.load'], 'snapshot piégé (invitée)');
    t.ok(firstNode(await siteOf(B), 'heading').props.text.fr === 'Snapshot ' && (await xssCount(B)) === 0, 'invitée : snapshot nettoyé, 0 exécution');
    capture('collab-snapshot-nettoye', esB.filter(e => e.code !== 'collab.presence'));
    await page.click('#collabBtn');
    await page.click('#collabDialog [data-collab-stop]');
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${t.shots}/cycle25.png` });
  } finally {
    for (const c of contexts) await c.close().catch(() => {});
    php.kill();
  }
  t.ok(errors.length === 0, `aucune erreur JavaScript dans le navigateur invité${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
}
