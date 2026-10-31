/* Cycle 31 : données en sécurité.
   S6 : stockage persistant demandé au premier enregistrement qui suit un clic (pas au chargement), quota affiché dans
   l'onglet Site, `beforeunload` quand « Modifié », base pleine → message, import > 200 Mo refusé, nettoyage des images
   orphelines (bouton dans Versions, et après l'élagage des versions).
   S7 : copie dans un dossier local (faux showDirectoryPicker → dossier OPFS en mémoire), autorisation revérifiée au
   démarrage ; repli sans dossier (export, rappel hebdomadaire) ; copie chiffrée sur l'hébergement (php -S), rotation,
   restauration dans un contexte neuf (jeton + code), mauvais code refusé proprement.
   Chromium sans interface refuse toujours navigator.storage.persist() (profil éphémère) : on le remplace par une
   version qui accorde le stockage seulement pendant un geste de la personne, comme le fait Chrome pour un site utilisé. */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture, codes } from './logs.mjs';

const CODE = 'radio-libre-2026';

function fakeBrowserApis(withFolder = true) {
  let granted = sessionStorage.getItem('fake-persist') === '1';
  navigator.storage.persisted = async () => granted;
  navigator.storage.persist = async () => {
    window.__persistCalls = (window.__persistCalls || 0) + 1;
    if (navigator.userActivation?.isActive) { granted = true; sessionStorage.setItem('fake-persist', '1'); }
    return granted;
  };
  if (withFolder) window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('copie-atelier', { create: true });
  else delete window.showDirectoryPicker;
}

/* Fichiers écrits dans le dossier simulé (OPFS) : { chemin: texte } */
const folderFiles = pg => pg.evaluate(async () => {
  const out = {};
  const walk = async (dir, prefix) => { for await (const [name, hd] of dir.entries()) { if (hd.kind === 'directory') await walk(hd, `${prefix}${name}/`); else out[prefix + name] = await (await hd.getFile()).text(); } };
  await walk(await (await navigator.storage.getDirectory()).getDirectoryHandle('copie-atelier', { create: true }), '');
  return out;
});

/* Accès direct au magasin d'images de la base locale */
/* Accès direct à la base locale (aide injectée avant le chargement : la CSP de l'éditeur interdit eval) */
function idbHelper() {
  const tx = (db, store, mode, fn) => new Promise((resolve, reject) => { const t = db.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => resolve(out?.result); t.onerror = () => reject(t.error); });
  window.__idbRun = fn => new Promise((resolve, reject) => {
    const r = indexedDB.open('atelier-v2');
    r.onsuccess = () => { const db = r.result; Promise.resolve(fn(db, tx)).then(v => { db.close(); resolve(v); }, reject); };
    r.onerror = () => reject(r.error);
  });
}

async function ready(pg, url) {
  await pg.goto(url, { waitUntil: 'networkidle' });
  await pg.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
}

export default async function (t) {
  const { page, browser, base } = t;
  const dialogs = [];
  page.on('dialog', d => dialogs.push(d.type()));
  await page.addInitScript(fakeBrowserApis, true);
  await page.addInitScript(idbHelper);
  await ready(page, `${base}?fresh=1`);
  await page.evaluate(() => window.__atelier.setExpert(true));

  /* --- S6.1 : rien n'est demandé au chargement ; stockage persistant après un enregistrement déclenché par un clic --- */
  t.ok(!(await page.evaluate(() => window.__persistCalls)) && !(await page.evaluate(() => navigator.storage.persisted())), 'au chargement : stockage persistant ni demandé ni accordé');
  let s = await mark(page);
  await page.focus('#siteName');
  await page.keyboard.type(' 31');
  await waitCode(page, 'storage.estimate', s);
  t.ok(await page.evaluate(() => navigator.storage.persisted()), 'navigator.storage.persisted() vrai après un enregistrement déclenché par un geste');
  let es = await since(page, s);
  expectCodes(t, es, ['storage.persist', 'storage.estimate'], 'stockage persistant');
  const est = es.find(e => e.code === 'storage.estimate');
  t.ok(est?.data?.persisted === true && est.data.quota > 0, `journal storage.estimate : ${est?.msg}`);
  capture('stockage-persistant', es);
  await page.click('[data-left="site"]');
  await page.waitForFunction(() => /utilisés sur/.test(document.querySelector('[data-storage-info]')?.textContent || ''));
  const info = await page.textContent('[data-storage-info]');
  t.ok(/^Stockage : persistant · .+ utilisés sur .+(Go|Mo)$/.test(info.trim()), `onglet Site : « ${info.trim()} »`);

  /* --- S6.2 : beforeunload quand « Modifié », pas quand « Enregistré » --- */
  await page.waitForFunction(() => document.querySelector('#saveState')?.textContent === 'Enregistré');
  await page.focus('#siteName');
  await page.keyboard.type('!');
  t.ok((await page.textContent('#saveState')) === 'Modifié', 'état « Modifié » juste après la frappe');
  dialogs.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  t.ok(dialogs.includes('beforeunload'), `fermeture avec « Modifié » → confirmation (${dialogs.join(', ') || 'aucune'})`);
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
  await page.focus('#siteName');
  await page.keyboard.type('?');
  await page.waitForFunction(() => document.querySelector('#saveState')?.textContent === 'Enregistré');
  dialogs.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
  t.ok(!dialogs.includes('beforeunload'), 'fermeture avec « Enregistré » → aucune confirmation');

  /* --- S6.3 : base pleine → message clair avec conseil --- */
  s = await mark(page);
  await page.evaluate(() => {
    window.__put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () { throw new DOMException('Quota dépassé (test)', 'QuotaExceededError'); };
  });
  await page.focus('#siteName');
  await page.keyboard.type('Q');
  await waitCode(page, 'storage.quota', s);
  const quotaToast = await page.locator('#toasts .toast--error', { hasText: 'plein' }).first().textContent();
  t.ok(/Exportez une copie/.test(quotaToast) && /versions/.test(quotaToast), `base pleine : « ${quotaToast.slice(0, 90)}… »`);
  t.ok((await page.textContent('#saveState')) === 'Non enregistré', 'état « Non enregistré »');
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.__put; });
  await page.keyboard.press('Backspace');
  await page.waitForFunction(() => document.querySelector('#saveState')?.textContent === 'Enregistré');
  es = await since(page, s);
  expectCodes(t, es, ['storage.save-fail', 'storage.quota', 'storage.save-recovered'], 'base pleine');

  /* --- S6.4 : import .json de plus de 200 Mo refusé avant lecture ; JSON invalide → message --- */
  s = await mark(page);
  await page.evaluate(() => {
    const input = document.querySelector('#importJson');
    const dt = new DataTransfer();
    dt.items.add(new File([new ArrayBuffer(200 * 1024 * 1024 + 1)], 'enorme.atelier.json', { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
  await waitCode(page, 'project.import-too-big', s);
  t.ok(await page.locator('#toasts .toast--error', { hasText: '200 Mo' }).count() >= 1, 'import de plus de 200 Mo refusé avec un message');
  t.ok(!codes(await since(page, s)).includes('project.import.start'), 'fichier trop gros jamais lu');
  await page.evaluate(() => {
    const input = document.querySelector('#importJson');
    const dt = new DataTransfer();
    dt.items.add(new File(['{ pas du json'], 'casse.json', { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
  await waitCode(page, 'project.import.fail', s);
  t.ok(await page.locator('#toasts .toast--error', { hasText: 'JSON' }).count() >= 1, 'JSON invalide : message clair, éditeur intact');

  /* --- S6.5 : images orphelines retirées (bouton dans Versions) ; images du projet et des versions gardées --- */
  await page.evaluate(a => window.__idbRun((db, tx) => tx(db, 'assets', 'readwrite', st => { st.put({ dataUrl: 'data:image/png;base64,' + 'A'.repeat(40000), variants: [] }, a); })), 'orpheline-test');
  const assetsBefore = await page.evaluate(() => Object.keys(window.__atelier.site.assets || {}));
  s = await mark(page);
  await page.click('#fileMenu summary');
  await page.click('#versionsBtn');
  await page.click('#versionsDialog [data-gc-run]');
  await page.waitForFunction(() => /retirée|Aucune/.test(document.querySelector('[data-gc-result]')?.textContent || ''));
  const gcText = await page.textContent('[data-gc-result]');
  t.ok(/1 image inutilisée retirée \(\d+ Ko libérés\)/.test(gcText), `nettoyage sur demande : « ${gcText} »`);
  es = await since(page, s);
  const gc = es.find(e => e.code === 'storage.gc');
  t.ok(gc?.data?.count === 1 && gc.data.bytes > 20000 && gc.data.source === 'button', `journal storage.gc : ${JSON.stringify(gc?.data)}`);
  const stored = await page.evaluate(() => window.__idbRun((db, tx) => tx(db, 'assets', 'readonly', st => st.getAllKeys())));
  t.ok(!stored.includes('orpheline-test') && assetsBefore.every(id => stored.includes(id)), `images du projet gardées (${assetsBefore.length}), orpheline retirée`);
  capture('nettoyage-images', es);
  await page.keyboard.press('Escape');

  /* --- S6.6 : après l'élagage des versions, les images que seules les versions retirées utilisaient partent aussi --- */
  await page.evaluate(() => window.__idbRun(async (db, tx) => {
    const light = await tx(db, 'projects', 'readonly', st => st.get('current'));
    await tx(db, 'assets', 'readwrite', st => { st.put({ dataUrl: 'data:image/png;base64,' + 'B'.repeat(20000) }, 'vieille-image'); });
    await tx(db, 'versions', 'readwrite', st => {
      for (let i = 0; i < 31; i++) {
        const site = i === 0 ? { ...light, assets: { ...light.assets, 'vieille-image': { file: 'vieille.png', stored: true } } } : light;
        st.put({ id: `v_test${i}`, at: new Date(Date.UTC(2020, 0, 1 + i)).toISOString(), name: '', kind: 'auto', summary: { pages: light.pages.length }, site }, `v_test${i}`);
      }
    });
    return 1;
  }));
  s = await mark(page);
  await page.click('#fileMenu summary');
  await page.click('#loadDemoBtn');
  await waitCode(page, 'storage.gc', s);
  es = await since(page, s);
  const gc2 = es.find(e => e.code === 'storage.gc');
  const stored2 = await page.evaluate(() => window.__idbRun((db, tx) => tx(db, 'assets', 'readonly', st => st.getAllKeys())));
  t.ok(gc2?.data?.source === 'prune' && gc2.data.count >= 1 && !stored2.includes('vieille-image'), `élagage des versions → nettoyage : ${gc2?.msg}`);
  expectCodes(t, es, ['version.save.prune', 'storage.gc'], 'élagage');

  /* --- S7a : copie dans un dossier local (Chrome/Edge) --- */
  await page.focus('#siteName'); await page.keyboard.press('Control+a');
  await page.keyboard.type('Radio Copie 31');
  s = await mark(page);
  await page.click('#fileMenu summary');
  await page.click('#folderBackupBtn');
  await page.waitForSelector('#folderBackupDialog[open]');
  await page.click('#folderBackupDialog [data-folder-choose]');
  await waitCode(page, 'backup.folder.write', s);
  let files = await folderFiles(page);
  const day = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const main = files['radio-copie-31.atelier.json'];
  t.ok(main && files[`versions/${day}.json`], `dossier : ${Object.keys(files).join(', ')}`);
  const copy = JSON.parse(main || '{}');
  const withImages = Object.values(copy.assets || {}).filter(a => a.dataUrl?.startsWith('data:'));
  t.ok(copy.name === 'Radio Copie 31' && copy.pages?.length > 0 && withImages.length === Object.keys(copy.assets || {}).length, `export autonome, images comprises (${withImages.length})`);
  await page.waitForFunction(() => /^Copie : /.test(document.querySelector('#backupState')?.textContent || ''));
  t.ok(/^Copie : (à l’instant|il y a)/.test(await page.textContent('#backupState')), `barre : « ${await page.textContent('#backupState')} »`);
  es = await since(page, s);
  expectCodes(t, es, ['backup.folder.open', 'backup.folder.choose', 'backup.folder.permission', 'backup.folder.write'], 'dossier');
  capture('copie-dossier', es);
  s = await mark(page);
  await page.focus('#siteName');
  await page.keyboard.type(' bis');
  await page.waitForFunction(() => window.atelierDebug.entries({}).filter(e => e.code === 'backup.folder.write').length >= 2, null, { timeout: 12000 });
  const writes = (await page.evaluate(() => window.atelierDebug.entries({}))).filter(e => e.code === 'backup.folder.write');
  const gap = writes.at(-1).t - writes.at(-2).t;
  files = await folderFiles(page);
  t.ok(JSON.parse(files['radio-copie-31-bis.atelier.json'] || '{}').name === 'Radio Copie 31 bis', 'copie mise à jour après une modification');
  t.ok(codes(await since(page, s)).filter(c => c === 'backup.folder.write').length === 1 && gap >= 4900, `une seule écriture, différée (pas plus d’une toutes les 5 s) : ${gap} ms entre deux copies`);
  dialogs.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
  await page.waitForFunction(() => window.atelierDebug.entries({}).some(e => e.code === 'backup.folder.permission'));
  const perm = (await page.evaluate(() => window.atelierDebug.entries({}))).find(e => e.code === 'backup.folder.permission');
  t.ok(perm?.data?.state === 'granted' && perm.data.how === 'boot', `au démarrage : dossier retrouvé, autorisation vérifiée (${perm?.data?.state})`);

  /* --- S7b : copie chiffrée sur l'hébergement (php -S) --- */
  const port = 8900 + Math.floor(Math.random() * 90);
  const www = join(t.shots, 'www31');
  rmSync(www, { recursive: true, force: true });
  mkdirSync(www, { recursive: true });
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', www], { stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}/publish.php`;
  const encFiles = () => (existsSync(join(www, 'atelier-data')) ? readdirSync(join(www, 'atelier-data')).filter(f => f.endsWith('.json.enc')) : []);
  const ctxs = [];
  try {
    await page.focus('#siteName');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Radio Hébergement 31');
    await page.click('#publishBtn');
    await page.waitForSelector('#publishDialog[open]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#publishDialog [data-pub-generate]')]);
    await dl.saveAs(join(www, 'publish.php'));
    t.ok(readFileSync(join(www, 'publish.php'), 'utf8').includes("const ATELIER_VERSION = '6'"), 'publish.php version 6 téléchargé');
    const token = await page.locator('#publishDialog [data-pub="token"]').inputValue();
    await page.fill('#publishDialog [data-pub="url"]', url);
    await page.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
    await page.click('#publishDialog [data-pub-test]');
    await page.click('#publishConfirmDialog [data-confirm-ok]');
    await page.waitForSelector('#publishDialog [data-pub-status]:is(.is-ok, .is-error)');
    s = await mark(page);
    await page.fill('#publishDialog [data-backup-code]', 'court');
    await page.click('#publishDialog [data-backup-now]');
    t.ok(/au moins 8/.test(await page.textContent('#publishDialog [data-backup-status]')), 'code trop court refusé');
    await page.check('#publishDialog [data-backup-enable]');
    await page.fill('#publishDialog [data-backup-code]', CODE);
    await page.locator('#publishDialog [data-backup-code]').dispatchEvent('change');
    await page.click('#publishDialog [data-backup-now]');
    await page.waitForFunction(() => /enregistrée :|non envoyée/.test(document.querySelector('#publishDialog [data-backup-status]')?.textContent || ''), null, { timeout: 20000 });
    const bst = await page.textContent('#publishDialog [data-backup-status]');
    t.ok(/Copie de secours chiffrée enregistrée : backup-\d{8}-\d{4}/.test(bst), `copie sur demande : « ${bst} »`);
    t.ok(await page.evaluate(() => window.__atelier.site.publish.backup === true) && !JSON.stringify(await page.evaluate(() => window.__atelier.site)).includes(CODE), 'option gardée dans le projet, le code jamais');
    const enc = encFiles();
    const raw = enc.length ? readFileSync(join(www, 'atelier-data', enc[0])) : Buffer.from('');
    t.ok(enc.length === 1 && raw.subarray(0, 15).toString() === 'ATELIER-BACKUP\n' && !raw.includes('Radio') && !raw.includes(CODE), 'sur l’hébergement : fichier chiffré, ni nom du site ni code lisibles');
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishDialog [data-pub-status][data-pub-ok]:has-text("Copie de secours")', { timeout: 25000 });
    t.ok(encFiles().length === 2, `publication → nouvelle copie (${encFiles().length} sur l’hébergement)`);
    es = await since(page, s);
    expectCodes(t, es, ['backup.host.enable', 'backup.host.send.start', 'backup.host.send.encrypted', 'backup.host.send.ok'], 'hébergement');
    expectNoErrors(t, es, 'hébergement');
    capture('copie-hebergement', es);
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));

    /* --- restauration dans un contexte neuf (autre ordinateur) --- */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
    ctxs.push(ctx);
    const p2 = await ctx.newPage();
    p2.on('dialog', d => d.accept());
    await ready(p2, `${base}?fresh=1`);
    t.ok((await p2.evaluate(() => window.__atelier.site.name)) !== 'Radio Hébergement 31', 'contexte neuf : projet d’exemple');
    await p2.click('#publishBtn');
    await p2.click('#publishDialog [data-pub-tab="php"]');
    await p2.click('#publishDialog [data-backup-restore]');
    await p2.waitForSelector('#hostRestoreDialog[open]');
    await p2.fill('#hostRestoreDialog [data-restore="url"]', url);
    await p2.fill('#hostRestoreDialog [data-restore="token"]', token);
    const s2 = await mark(p2);
    await p2.click('#hostRestoreDialog [data-restore-show]');
    await p2.click('#publishConfirmDialog [data-confirm-ok]');
    await p2.waitForSelector('#hostRestoreDialog [data-restore-name]');
    t.ok(await p2.locator('#hostRestoreDialog [data-restore-name]').count() === 2, 'deux copies listées avec le jeton');
    await p2.fill('#hostRestoreDialog [data-restore="code"]', 'mauvais-code-123');
    await p2.click('#hostRestoreDialog [data-restore-name] >> nth=0');
    await p2.waitForSelector('#hostRestoreDialog [data-restore-status].is-error:has-text("incorrect")', { timeout: 20000 });
    t.ok((await p2.evaluate(() => window.__atelier.site.name)) !== 'Radio Hébergement 31', 'mauvais code : échec propre, projet inchangé');
    await p2.fill('#hostRestoreDialog [data-restore="code"]', CODE);
    await p2.click('#hostRestoreDialog [data-restore-name] >> nth=0');
    await p2.waitForFunction(() => window.__atelier.site.name === 'Radio Hébergement 31' || /impossible/.test(document.querySelector('[data-restore-status]')?.textContent || ''), null, { timeout: 20000 });
    t.ok((await p2.evaluate(() => window.__atelier.site.name)) === 'Radio Hébergement 31', `bon code : projet restauré ${await p2.evaluate(() => document.querySelector('[data-restore-status]')?.textContent || '')}`);
    const restored = await p2.evaluate(() => window.__atelier.site);
    t.ok(restored.pages.length > 0 && Object.values(restored.assets || {}).every(a => a.dataUrl), `restauré depuis l’hébergement : ${restored.pages.length} pages, ${Object.keys(restored.assets || {}).length} images`);
    const es2 = await since(p2, s2);
    expectCodes(t, es2, ['backup.host.list', 'backup.host.restore.start', 'backup.host.restore.downloaded', 'backup.host.restore.decrypted', 'backup.host.restore.fail', 'backup.host.restore.ok', 'version.save.ok'], 'restauration');
    capture('restauration-hebergement', es2);
    await p2.click('#fileMenu summary');
    await p2.click('#versionsBtn');
    await p2.waitForSelector('#versionsDialog .version--safety:has-text("hébergement")', { timeout: 5000 }).catch(() => {});
    t.ok(await p2.locator('#versionsDialog .version--safety', { hasText: 'hébergement' }).count() === 1, 'version de sécurité avant la restauration');
  } finally { php.kill(); for (const c of ctxs) await c.close(); }

  /* --- S7a repli : navigateur sans dossier (Firefox, Safari) → export classique, date retenue, rappel hebdomadaire --- */
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', acceptDownloads: true });
  try {
    const p3 = await ctx3.newPage();
    await p3.addInitScript(fakeBrowserApis, false);
    await p3.addInitScript(() => { if (!localStorage.getItem('atelier-last-export')) localStorage.setItem('atelier-last-export', String(Date.now() - 9 * 86400000)); });
    await ready(p3, `${base}?fresh=1&remind`);
    await p3.waitForSelector('#toasts .toast--warn:has-text("Pensez à exporter")', { timeout: 8000 });
    t.ok(true, `rappel hebdomadaire non bloquant : « ${(await p3.locator('#toasts .toast--warn').first().textContent()).slice(0, 80)}… »`);
    t.ok(/^Export : il y a 9 j$/.test(await p3.textContent('#backupState')), `barre : « ${await p3.textContent('#backupState')} »`);
    const s3 = await mark(p3);
    await p3.click('#fileMenu summary');
    await p3.click('#folderBackupBtn');
    await p3.waitForSelector('#folderBackupDialog[open]');
    t.ok(/ne permet pas/.test(await p3.textContent('#folderBackupDialog')) && /Dernier export/.test(await p3.textContent('#folderBackupDialog [data-last-export]')), 'repli : explication et date du dernier export');
    await Promise.all([p3.waitForEvent('download'), p3.click('#folderBackupDialog [data-folder-export]')]);
    await p3.waitForFunction(() => /à l’instant/.test(document.querySelector('#backupState')?.textContent || ''));
    t.ok(true, 'export fait : date retenue dans la barre');
    expectCodes(t, await since(p3, s3), ['backup.folder.unsupported', 'project.export-json'], 'repli');
    t.ok(codes(await p3.evaluate(() => window.atelierDebug.entries({}))).includes('backup.remind'), 'journal : backup.remind');
  } finally { await ctx3.close(); }
}
