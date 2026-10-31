/*
 * Copies de secours hors du navigateur (cycle 31, S7).
 *  a. Dossier local (File System Access, Chrome/Edge) : Fichier → « Enregistrer aussi dans un dossier de mon ordinateur… » ;
 *     le dossier est gardé sur l'appareil, l'autorisation revérifiée au démarrage ; à chaque enregistrement (5 s au plus
 *     souvent) : <nom-du-site>.atelier.json + versions/<date>.json une fois par jour ; état dans la barre du haut.
 *     Ailleurs (Firefox, Safari) : export classique et rappel hebdomadaire, non bloquant, avec la date du dernier export.
 *  b. Copie chiffrée sur l'hébergement (publish.php v6) : envoyée à chaque publication et sur demande, restaurable
 *     depuis un autre ordinateur avec le jeton et le code de secours (chiffrement : core/backup.js).
 */
import { h, $, toast } from './dom.js';
import { openDialog, confirmDialog } from './dialog.js';
import { state, subscribe, load } from './store.js';
import { getFolderHandle, setFolderHandle, getSecret, setSecret } from './storage.js';
import { beforeRisky } from './versions-ui.js';
import { folderFiles, folderWriteDue, exportReminderDue, ago, encryptBackup, decryptBackup, checkCode } from '../core/backup.js';
import { publishOrigin, hostLabel, errorMessage, BACKUP_SERVER_VERSION } from '../core/publish.js';
import { formatBytes } from '../core/storage-gc.js';
import { normalizeSite, validateSite } from '../core/site.js';
import { sanitizeSiteTexts } from '../core/sanitize-site.js';
import { log } from './log.js';
import { __, fmtDate } from '../core/ui-i18n.js';

const LS = { lastExport: 'atelier-last-export', lastRemind: 'atelier-last-remind', daily: 'atelier-folder-daily', lastWrite: 'atelier-folder-last' };
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* stockage indisponible : simple confort */ } };

const folder = { handle: null, active: false, needsPermission: false, timer: 0, lastAt: Number(lsGet(LS.lastWrite)) || 0, failed: false, writes: 0 };
let hooks = { exportJson: () => {} };
export const folderSupported = () => typeof globalThis.showDirectoryPicker === 'function';

/* ---------- État dans la barre du haut ---------- */
function renderBar() {
  const el = $('#backupState');
  if (!el) return;
  const lastExport = Number(lsGet(LS.lastExport)) || 0;
  let text = '';
  let title = '';
  if (folder.needsPermission) { text = __('Copie : autoriser le dossier'); title = __('Cliquez pour autoriser à nouveau l’écriture dans le dossier « {name} »', { name: folder.handle?.name || '' }); }
  else if (folder.active && folder.failed) { text = __('Copie : échec'); title = __('La dernière copie dans le dossier a échoué (voir le journal)'); }
  else if (folder.active) { text = folder.lastAt ? __('Copie : {when}', { when: ago(Date.now() - folder.lastAt) }) : __('Copie : en attente'); title = __('Copie automatique dans le dossier « {name} »', { name: folder.handle?.name || '' }); }
  else if (lastExport) { text = __('Export : {when}', { when: ago(Date.now() - lastExport) }); title = __('Dernier projet enregistré en .json depuis ce navigateur : {date}', { date: fmtDate(new Date(lastExport).toISOString(), { dateStyle: 'medium', timeStyle: 'short' }) }); }
  el.textContent = text;
  el.title = title;
  el.hidden = !text;
  el.classList.toggle('is-warn', folder.needsPermission || folder.failed);
}

/* ---------- Dossier local ---------- */
async function writeFile(dir, name, text) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}

export async function writeFolderCopy(reason = 'save') {
  clearTimeout(folder.timer);
  folder.timer = 0;
  if (!folder.active || !folder.handle) return false;
  const files = folderFiles({ name: state.site.name, lastDaily: lsGet(LS.daily) });
  const json = JSON.stringify(state.site, null, 2);
  try {
    await writeFile(folder.handle, files.main, json);
    if (files.daily) {
      const dir = await folder.handle.getDirectoryHandle('versions', { create: true });
      await writeFile(dir, `${files.day}.json`, json);
      lsSet(LS.daily, files.day);
    }
    folder.lastAt = Date.now();
    folder.failed = false;
    folder.writes++;
    lsSet(LS.lastWrite, folder.lastAt);
    const level = files.daily || folder.writes === 1 || reason !== 'save' ? 'info' : 'debug';
    log[level]('backup.folder.write', files.daily ? __('Copie écrite dans le dossier, avec la version du jour ({file})', { file: files.daily }) : __('Copie écrite dans le dossier ({file})', { file: files.main }), { file: files.main, daily: files.daily || undefined, kb: Math.round(json.length / 1024), reason });
    renderBar();
    return true;
  } catch (e) {
    folder.failed = true;
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') { folder.active = false; folder.needsPermission = true; }
    log.error('backup.folder.fail', __('Copie dans le dossier impossible : {error}', { error: e?.message || e }), { name: e?.name, error: e, permission: folder.needsPermission || undefined });
    renderBar();
    return false;
  }
}

/* À chaque enregistrement réussi : copie différée, une toutes les 5 s au plus */
function scheduleFolderCopy() {
  if (!folder.active || folder.timer) return;
  folder.timer = setTimeout(() => writeFolderCopy('save'), Math.max(300, folderWriteDue(folder.lastAt, Date.now())));
}

async function activate(handle, how) {
  folder.handle = handle;
  folder.active = true;
  folder.needsPermission = false;
  log.info('backup.folder.permission', __('Écriture autorisée dans le dossier « {name} »', { name: handle.name }), { state: 'granted', how });
  return writeFolderCopy(how);
}

/* Autorisation redonnée par un clic (le navigateur l'exige) */
async function regrant() {
  if (!folder.handle) return;
  const st = await folder.handle.requestPermission?.({ mode: 'readwrite' }).catch(() => 'denied');
  if (st === 'granted') { await activate(folder.handle, 'regrant'); toast(__('Copie dans le dossier « {name} » reprise.', { name: folder.handle.name })); }
  else { log.warn('backup.folder.permission', __('Autorisation d’écrire dans le dossier refusée'), { state: st }); renderBar(); }
}

async function chooseFolder(d) {
  let handle;
  try { handle = await globalThis.showDirectoryPicker({ id: 'atelier-copie', mode: 'readwrite' }); } catch (e) {
    if (e?.name === 'AbortError') { log.info('backup.folder.cancel', __('Choix du dossier annulé')); return; }
    log.error('backup.folder.fail', __('Choix du dossier impossible : {error}', { error: e?.message || e }), { name: e?.name, error: e });
    toast(__('Choix du dossier impossible : {error}', { error: e?.message || e }), 'error');
    return;
  }
  try { await setFolderHandle(handle); } catch (e) { log.warn('backup.folder.fail', __('Dossier non retenu sur cet appareil (il faudra le rechoisir) : {error}', { error: e?.message || e }), { error: e }); }
  log.info('backup.folder.choose', __('Dossier de copie choisi : « {name} »', { name: handle.name }), { name: handle.name });
  if (await activate(handle, 'choose')) toast(__('Copie enregistrée dans le dossier « {name} ». Elle sera mise à jour à chaque modification.', { name: handle.name }));
  d?.close();
}

async function stopFolder(d) {
  clearTimeout(folder.timer);
  Object.assign(folder, { handle: null, active: false, needsPermission: false, timer: 0, failed: false });
  try { await setFolderHandle(null); } catch { /* rien à oublier */ }
  log.info('backup.folder.stop', __('Copie dans un dossier arrêtée'));
  renderBar();
  d?.close();
}

/* Fenêtre « Enregistrer aussi dans un dossier de mon ordinateur » (ou repli : export classique) */
export function openFolderBackup() {
  $('#folderBackupDialog')?.remove();
  const lastExport = Number(lsGet(LS.lastExport)) || 0;
  const exportLine = h('p', { class: 'hint', 'data-last-export': '' }, lastExport ? __('Dernier export (.json) depuis ce navigateur : {date}.', { date: fmtDate(new Date(lastExport).toISOString(), { dateStyle: 'medium', timeStyle: 'short' }) }) : __('Aucun export (.json) depuis ce navigateur pour l’instant.'));
  const exportBtn = h('button', { type: 'button', class: 'btn btn--small', 'data-folder-export': '', onclick: () => { hooks.exportJson(); d.close(); } }, __('Enregistrer le projet (.json)'));
  let body;
  if (folderSupported()) {
    const st = folder.active ? __('Copie active dans le dossier « {name} » ({when}).', { name: folder.handle?.name || '', when: folder.lastAt ? ago(Date.now() - folder.lastAt) : __('en attente') }) : folder.needsPermission ? __('Le dossier « {name} » attend votre autorisation.', { name: folder.handle?.name || '' }) : __('Aucun dossier choisi.');
    log.info('backup.folder.open', __('Fenêtre de la copie dans un dossier'), { supported: true, active: folder.active, needsPermission: folder.needsPermission || undefined });
    body = [
      h('p', {}, __('Atelier écrit une copie complète du projet (images comprises) dans un dossier de votre ordinateur à chaque modification : « nom-du-site.atelier.json », plus une copie par jour dans « versions ». Choisissez par exemple un dossier synchronisé (OneDrive, Google Drive, Nextcloud).')),
      h('p', { class: 'hint', 'data-folder-state': '' }, st),
      h('div', { class: 'row-btns' },
        folder.needsPermission ? h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-folder-regrant': '', onclick: async () => { await regrant(); d.close(); } }, __('Autoriser à nouveau')) : null,
        h('button', { type: 'button', class: `btn btn--small${folder.active || folder.needsPermission ? '' : ' btn--primary'}`, 'data-folder-choose': '', onclick: () => chooseFolder(d) }, folder.active ? __('Choisir un autre dossier…') : __('Choisir un dossier…')),
        folder.active ? h('button', { type: 'button', class: 'btn btn--small', 'data-folder-now': '', onclick: async () => { if (await writeFolderCopy('button')) toast(__('Copie écrite dans le dossier.')); d.close(); } }, __('Copier maintenant')) : null,
        folder.active || folder.needsPermission ? h('button', { type: 'button', class: 'btn btn--small', 'data-folder-stop': '', onclick: () => stopFolder(d) }, __('Arrêter la copie')) : null),
      exportLine];
  } else {
    log.info('backup.folder.unsupported', __('Ce navigateur ne permet pas d’écrire dans un dossier : export classique proposé'), { lastExport: lastExport ? new Date(lastExport).toISOString() : undefined });
    body = [
      h('p', {}, __('Ce navigateur (Firefox, Safari…) ne permet pas à une page d’écrire elle-même dans un dossier. Enregistrez une copie du projet en .json de temps en temps : Atelier vous le rappelle une fois par semaine. Dans Chrome ou Edge, la copie peut se faire toute seule.')),
      exportLine,
      h('div', { class: 'row-btns' }, exportBtn)];
  }
  /* Cycle 33 : fenêtre d'Atelier (titre, Échap, focus initial et rendu) */
  const d = openDialog({ id: 'folderBackupDialog', titleId: 'folderBackupTitle', title: __('Copie dans un dossier de mon ordinateur'),
    body: h('div', { class: 'a11y-form' }, ...body),
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))] });
}

/* Export classique (.json) fait : date retenue pour le rappel et la barre */
export function noteExport() {
  lsSet(LS.lastExport, Date.now());
  renderBar();
}

/* Rappel hebdomadaire, non bloquant, quand aucune copie automatique dans un dossier n'est active */
function remindExport() {
  if (folder.active || folder.needsPermission) return;
  if (navigator.webdriver && !new URLSearchParams(location.search).has('remind')) return;
  const lastExport = Number(lsGet(LS.lastExport)) || 0;
  if (!exportReminderDue({ lastExport, lastRemind: Number(lsGet(LS.lastRemind)) || 0, now: Date.now() })) return;
  lsSet(LS.lastRemind, Date.now());
  log.info('backup.remind', __('Rappel : exporter une copie du projet'), { lastExport: lastExport ? new Date(lastExport).toISOString() : null });
  toast(lastExport ? __('Pensez à exporter une copie du projet (dernier export : {date}) : Fichier → Enregistrer le projet (.json).', { date: fmtDate(new Date(lastExport).toISOString(), { dateStyle: 'medium' }) }) : __('Pensez à exporter une copie du projet (aucun export depuis ce navigateur) : Fichier → Enregistrer le projet (.json).'), 'warn');
}

async function restoreFolder() {
  if (!folderSupported()) return;
  const handle = await getFolderHandle();
  if (!handle) return;
  folder.handle = handle;
  const st = await handle.queryPermission?.({ mode: 'readwrite' }).catch(() => 'denied');
  if (st === 'granted') { folder.active = true; log.info('backup.folder.permission', __('Dossier de copie retrouvé : « {name} »', { name: handle.name }), { state: st, how: 'boot' }); }
  else { folder.needsPermission = true; log.warn('backup.folder.permission', __('Le dossier de copie « {name} » attend votre autorisation (clic sur « Copie » en haut)', { name: handle.name }), { state: st, how: 'boot' }); }
  renderBar();
}

function mountMenu() {
  const panel = $('#fileMenu .menu__panel');
  const after = $('#exportJsonBtn');
  if (panel && after && !$('#folderBackupBtn')) after.after(h('button', { type: 'button', id: 'folderBackupBtn', onclick: () => { $('#fileMenu').open = false; openFolderBackup(); } }, __('Enregistrer aussi dans un dossier de mon ordinateur…')));
  const save = $('#saveState');
  if (save && !$('#backupState')) save.after(h('button', { type: 'button', class: 'save-state backup-state', id: 'backupState', hidden: true, onclick: () => (folder.needsPermission ? regrant() : openFolderBackup()) }));
}

export function initBackup(opts = {}) {
  hooks = { ...hooks, ...opts };
  mountMenu();
  subscribe((reason, o) => { if (reason === 'save' && o.code === 'saved') scheduleFolderCopy(); });
  restoreFolder().catch(e => log.warn('backup.folder.fail', __('Dossier de copie illisible : {error}', { error: e?.message || e }), { error: e })).finally(() => { renderBar(); setTimeout(remindExport, 4000); });
  setInterval(renderBar, 30000);
}

/* ---------- Copie chiffrée sur l'hébergement (publish.php v6) ---------- */
const sessionCodes = new Map();
const codeKey = origin => (origin ? `backup-code:${origin}` : '');
const backupUrl = (url, q) => `${url}${url.includes('?') ? '&' : '?'}${q}`;

async function codeFor(origin) {
  if (sessionCodes.has(origin)) return sessionCodes.get(origin);
  const key = codeKey(origin);
  return key ? getSecret(key) : '';
}

async function serverVersion(url) {
  const r = await fetch(url, { method: 'GET', cache: 'no-store' });
  const b = await r.json();
  return { version: Number(b.version) || 1, backup: !!b.backup };
}

/* Envoie une copie chiffrée ; renvoie { name, kept } ou lève une erreur traduite */
export async function sendHostBackup({ url, token, code, reason = 'button' }) {
  const f = log.flow('backup.host.send', reason === 'publish' ? __('Copie de secours chiffrée après la publication') : __('Copie de secours chiffrée sur l’hébergement'), { host: hostLabel(publishOrigin(url)), reason });
  try {
    if (!token) throw new Error(__('Indiquez le jeton de publication.'));
    const bad = checkCode(code);
    if (bad) throw new Error(bad);
    const sv = await serverVersion(url);
    if (!sv.backup) throw new Error(__('publish.php version {version} installé : la version {needed} est nécessaire pour les copies de secours. Retéléchargez-le et redéposez-le par FTP.', { version: sv.version, needed: BACKUP_SERVER_VERSION }));
    const t0 = performance.now();
    const bytes = await encryptBackup(state.site, code);
    f.step('encrypted', __('Projet chiffré sur cet appareil ({size})', { size: formatBytes(bytes.length) }), { bytes: bytes.length, ms: Math.round(performance.now() - t0) });
    const r = await fetch(backupUrl(url, 'backup'), { method: 'POST', body: new Blob([bytes], { type: 'application/octet-stream' }), headers: { 'X-Atelier-Token': token, 'Content-Type': 'application/octet-stream' } });
    const b = await r.json().catch(() => ({}));
    if (!r.ok || !b.ok) throw Object.assign(new Error(errorMessage(b, r.status)), { code: b.code, status: r.status });
    f.ok(__('Copie de secours enregistrée sur l’hébergement : {name} ({kept} gardées)', { name: b.name, kept: b.kept }), { name: b.name, kept: b.kept, removed: b.removed || undefined, bytes: bytes.length });
    return b;
  } catch (e) {
    f.fail(e, { code: e.code, status: e.status });
    throw e;
  }
}

/* Après une publication réussie : copie si elle est activée et si le code est connu */
export async function backupAfterPublish({ url, token }) {
  if (!state.site.publish?.backup) return null;
  const code = await codeFor(publishOrigin(url));
  if (!code) { log.warn('backup.host.no-code', __('Copie de secours activée mais code de secours inconnu sur cet appareil : copie non envoyée')); return { skipped: true }; }
  try { return await sendHostBackup({ url, token, code, reason: 'publish' }); } catch (e) { return { error: e }; }
}

async function listBackups(url, token) {
  const r = await fetch(backupUrl(url, 'backups'), { cache: 'no-store', headers: { 'X-Atelier-Token': token } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok || !b.ok) throw Object.assign(new Error(errorMessage(b, r.status)), { code: b.code, status: r.status });
  log.info('backup.host.list', __('{n} copie(s) de secours sur l’hébergement', { n: b.backups.length }), { count: b.backups.length });
  return b.backups;
}

async function restoreBackup({ url, token, code, name }) {
  const f = log.flow('backup.host.restore', __('Restauration de la copie {name} depuis l’hébergement', { name }), { name, host: hostLabel(publishOrigin(url)) });
  try {
    const bad = checkCode(code);
    if (bad) throw new Error(bad);
    const r = await fetch(backupUrl(url, `backup=${encodeURIComponent(name)}`), { cache: 'no-store', headers: { 'X-Atelier-Token': token } });
    if (!r.ok) { const b = await r.json().catch(() => ({})); throw Object.assign(new Error(errorMessage(b, r.status)), { code: b.code, status: r.status }); }
    const bytes = new Uint8Array(await r.arrayBuffer());
    f.step('downloaded', __('Copie téléchargée ({size})', { size: formatBytes(bytes.length) }), { bytes: bytes.length });
    const { site: raw, at } = await decryptBackup(bytes, code);
    f.step('decrypted', __('Copie déchiffrée (enregistrée le {date})', { date: fmtDate(at, { dateStyle: 'medium', timeStyle: 'short' }) }), { at });
    const { site, changed } = sanitizeSiteTexts(raw);
    const check = validateSite(normalizeSite(site));
    if (!check.ok) throw Object.assign(new Error(check.errors[0]), { code: 'invalid' });
    if (changed) f.step('sanitized', __('{n} texte(s) nettoyé(s) à l’ouverture', { n: changed }), { changed }, 'warn');
    await beforeRisky(__('Avant la restauration depuis l’hébergement'));
    load(site, { keepHistory: true });
    f.ok(__('Projet restauré depuis l’hébergement (Ctrl+Z pour annuler)'), { name, pages: site.pages.length, at });
    return { at, pages: site.pages.length };
  } catch (e) {
    f.fail(e, { code: e.code, status: e.status });
    throw e;
  }
}

/* Fenêtre « Restaurer depuis l'hébergement » : jeton + code → liste des copies → restauration */
export function openHostRestore({ url = '', token = '', confirmDest = async () => false } = {}) {
  $('#hostRestoreDialog')?.remove();
  const urlIn = h('input', { class: 'input input--mono', type: 'url', value: url, placeholder: __('https://www.votre-site.be/publish.php'), 'data-restore': 'url' });
  const tokenIn = h('input', { class: 'input input--mono', type: 'password', autocomplete: 'off', value: token, placeholder: __('Jeton de publication'), 'data-restore': 'token' });
  const codeIn = h('input', { class: 'input input--mono', type: 'password', autocomplete: 'off', placeholder: __('Code de secours'), 'data-restore': 'code' });
  const status = h('p', { class: 'pub-status', 'data-restore-status': '', role: 'status' });
  const list = h('ul', { class: 'version-list', 'data-restore-list': '' });
  const say = (text, kind) => { status.textContent = text; status.className = `pub-status${kind ? ` is-${kind}` : ''}`; };
  const show = async () => {
    const origin = publishOrigin(urlIn.value);
    if (!origin || !/\/publish\.php$/i.test(urlIn.value)) { say(__('Adresse attendue : https://www.votre-site.be/publish.php'), 'error'); return; }
    if (!tokenIn.value) { say(__('Indiquez le jeton de publication.'), 'error'); return; }
    if (!(await confirmDest('php', origin, 'test'))) { say(__('Annulé : vérifiez l’adresse avant d’y envoyer votre jeton.'), 'error'); return; }
    say(__('Recherche des copies…'));
    try {
      const items = await listBackups(urlIn.value, tokenIn.value);
      say(items.length ? __('{n} copie(s) trouvée(s). Choisissez celle à restaurer.', { n: items.length }) : __('Aucune copie de secours sur cet hébergement.'), items.length ? 'ok' : 'info');
      list.replaceChildren(...items.map(b => h('li', { class: 'version', 'data-backup-name': b.name },
        h('div', {}, h('strong', {}, fmtDate(b.at, { dateStyle: 'medium', timeStyle: 'short' })), h('span', { class: 'version__meta' }, ` · ${formatBytes(b.size)} · ${b.name}`)),
        h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-restore-name': b.name, onclick: () => restore(b.name) }, __('Restaurer'))))));
    } catch (e) { say(__('Liste impossible : {message}', { message: e.message }), 'error'); }
  };
  const restore = async name => {
    if (!codeIn.value) { say(__('Indiquez le code de secours choisi lors de la copie.'), 'error'); codeIn.focus(); return; }
    const ok = await confirmDialog({ id: 'hostRestoreConfirmDialog', title: __('Restaurer depuis l’hébergement'),
      message: __('Remplacer le projet actuel par la copie {name} ? L’état actuel est d’abord enregistré comme version de sécurité.', { name }),
      ok: __('Restaurer'), danger: true });
    if (!ok) { log.info('backup.host.cancel', __('Restauration annulée'), { name }); return; }
    say(__('Téléchargement et déchiffrement…'));
    try {
      const r = await restoreBackup({ url: urlIn.value, token: tokenIn.value, code: codeIn.value, name });
      d.close();
      $('#publishDialog')?.close();
      toast(__('Projet restauré depuis l’hébergement ({n} pages). Ctrl+Z pour annuler.', { n: r.pages }));
    } catch (e) { say(e.code === 'bad_code' ? __('Code de secours incorrect : rien n’a été chargé.') : __('Restauration impossible : {message}', { message: e.message }), 'error'); }
  };
  log.info('backup.host.open', __('Fenêtre de restauration depuis l’hébergement'), { url: !!url, token: !!token });
  const d = openDialog({ id: 'hostRestoreDialog', titleId: 'hostRestoreTitle', title: __('Restaurer depuis l’hébergement'),
    body: h('div', { class: 'a11y-form' },
      h('p', {}, __('Retrouvez votre projet sur n’importe quel ordinateur : il faut l’adresse de publish.php, le jeton de publication et le code de secours choisi lors de la copie.')),
      h('label', { class: 'mini' }, h('span', {}, __('Adresse de publish.php')), urlIn),
      h('label', { class: 'mini' }, h('span', {}, __('Jeton de publication')), tokenIn),
      h('label', { class: 'mini' }, h('span', {}, __('Code de secours')), codeIn),
      h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-restore-show': '', onclick: show }, __('Voir les copies'))),
      status, list),
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))] });
}

/* Bloc de l'onglet OVH (publish.php) de la fenêtre Publier */
export function hostBackupSection({ url, token, confirmDest, apply }) {
  const enabled = h('input', { type: 'checkbox', checked: !!state.site.publish?.backup, 'data-backup-enable': '' });
  const code = h('input', { class: 'input input--mono', type: 'password', autocomplete: 'new-password', placeholder: __('Code de secours (8 caractères au moins)'), 'data-backup-code': '' });
  const keep = h('input', { type: 'checkbox', 'data-backup-remember': '' });
  const status = h('p', { class: 'pub-status', 'data-backup-status': '', role: 'status' });
  const say = (text, kind) => { status.textContent = text; status.className = `pub-status${kind ? ` is-${kind}` : ''}`; };
  const origin = () => publishOrigin(url());
  /* Code gardé sur l'appareil pour cette adresse : écrit seulement si la case est cochée, effacé une fois si elle est décochée */
  let kept = '';
  codeFor(origin()).then(c => { if (c && !code.value) { code.value = c; keep.checked = !sessionCodes.has(origin()); kept = keep.checked ? c : ''; } }).catch(() => {});
  const remember = async () => {
    const o = origin();
    if (!o) return;
    sessionCodes.set(o, code.value);
    const next = keep.checked ? code.value : '';
    if (next === kept) return;
    kept = next;
    try { await setSecret(codeKey(o), next); } catch { /* stockage indisponible */ }
  };
  enabled.addEventListener('change', () => { if (apply({ backup: enabled.checked })) log.info('backup.host.enable', enabled.checked ? __('Copie de secours sur l’hébergement activée (à chaque publication)') : __('Copie de secours sur l’hébergement désactivée'), { on: enabled.checked }); });
  code.addEventListener('change', remember);
  keep.addEventListener('change', remember);
  const now = async () => {
    if (!apply({ url: url() })) return;
    const bad = checkCode(code.value);
    if (bad) { say(bad, 'error'); return; }
    if (!token()) { say(__('Indiquez le jeton de publication.'), 'error'); return; }
    if (!(await confirmDest('php', origin(), 'publish'))) { say(__('Annulé : vérifiez l’adresse avant d’y envoyer votre jeton.'), 'error'); return; }
    await remember();
    say(__('Chiffrement et envoi de la copie…'));
    try { const b = await sendHostBackup({ url: url(), token: token(), code: code.value }); say(__('Copie de secours chiffrée enregistrée : {name} ({kept} gardées sur l’hébergement).', { name: b.name, kept: b.kept }), 'ok'); } catch (e) { say(__('Copie de secours non envoyée : {message}', { message: e.message }), 'error'); }
  };
  return h('div', { class: 'pub-backup', 'data-backup-section': '' },
    h('h3', {}, __('Copie de secours sur l’hébergement')),
    h('label', { class: 'check check--sm' }, enabled, __('Envoyer une copie chiffrée du projet à chaque publication (5 dernières gardées)')),
    h('label', { class: 'mini' }, h('span', {}, __('Code de secours')), code),
    h('label', { class: 'check check--sm' }, keep, __('Se souvenir du code sur cet appareil (jamais dans le projet)')),
    h('p', { class: 'hint' }, __('Le projet est chiffré dans votre navigateur avant l’envoi : l’hébergement ne voit ni le code ni le contenu. Si vous perdez ce code, personne ne peut lire la copie, pas même vous.')),
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn btn--small', 'data-backup-now': '', onclick: now }, __('Envoyer une copie maintenant')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-backup-restore': '', onclick: () => openHostRestore({ url: url(), token: token(), confirmDest }) }, __('Restaurer depuis l’hébergement…'))),
    status);
}
