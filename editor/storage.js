/*
 * Sauvegarde locale dans IndexedDB. Les images sont rangées à part et écrites une seule fois :
 * le projet (léger) est réenregistré à chaque modification sans recopier les images.
 */
import { log } from './log.js';
import { publishOrigin, githubTarget, tokenKey } from '../core/publish.js';
import { __, __n } from '../core/ui-i18n.js';
import { orphanAssets, storedAssetIds } from '../core/storage-gc.js';
import { assets } from './assets.js';

const DB = 'atelier-v2';
const STORE = 'projects';
const ASSETS = 'assets';
const VERSIONS = 'versions';
const SECRETS = 'secrets';
let dbPromise = null;
const savedAssets = new Set();

function open() {
  if (!('indexedDB' in globalThis)) { log.error('storage.unavailable', __('IndexedDB indisponible : rien ne sera gardé sur cet appareil (navigation privée ?)')); return Promise.reject(new Error(__('IndexedDB indisponible'))); }
  dbPromise ||= new Promise((resolve, reject) => {
    const t0 = performance.now();
    const req = indexedDB.open(DB, 3);
    req.onupgradeneeded = e => {
      const db = req.result;
      log.info('storage.upgrade', __('Base locale créée ou mise à jour'), { from: e.oldVersion, to: e.newVersion });
      for (const name of [STORE, ASSETS, VERSIONS, SECRETS]) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    req.onblocked = () => log.warn('storage.blocked', __('Base locale bloquée par un autre onglet d’Atelier : fermez les autres onglets'));
    req.onsuccess = () => {
      log.debug('storage.open', __('Base locale ouverte'), { ms: Math.round(performance.now() - t0) });
      req.result.onversionchange = () => log.warn('storage.version-change', __('Un autre onglet met la base à jour : rechargez cette page'));
      resolve(req.result);
    };
    req.onerror = () => { log.error('storage.open-fail', __('Base locale inaccessible : {error}', { error: req.error?.message }), { error: req.error }); dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

/*
 * Sépare les données lourdes des métadonnées. Depuis le cycle 27 le site n'a plus d'octets : ils sont lus dans le
 * magasin d'images (`store`) ; un site d'avant (data URL dans site.assets) est encore accepté.
 */
export function splitAssets(site, store = assets) {
  const light = {};
  const heavy = {};
  for (const [id, a] of Object.entries(site.assets || {})) {
    light[id] = { ...a, dataUrl: undefined, variants: a.variants?.map(v => ({ ...v, dataUrl: undefined })), stored: true };
    const hv = a.dataUrl ? { dataUrl: a.dataUrl, variants: (a.variants || []).map(v => v.dataUrl) } : store?.heavy(id, a);
    if (hv) heavy[id] = hv;
  }
  return { light: { ...site, assets: light }, heavy };
}

export function mergeAssets(site, heavy) {
  const assets = {};
  for (const [id, a] of Object.entries(site.assets || {})) {
    if (!a.stored) { assets[id] = a; continue; }
    const hv = heavy[id];
    if (!hv) continue;
    const { stored, ...rest } = a;
    assets[id] = { ...rest, dataUrl: hv.dataUrl, variants: rest.variants?.map((v, i) => ({ ...v, dataUrl: hv.variants?.[i] })).filter(v => v.dataUrl) };
    if (!assets[id].variants?.length) delete assets[id].variants;
  }
  return { ...site, assets };
}

export async function loadProject(key = 'current') {
  const t0 = performance.now();
  try {
    const db = await open();
    const site = await req(db.transaction(STORE).objectStore(STORE).get(key));
    if (!site) { log.info('storage.load-empty', __('Aucun projet enregistré sur cet appareil'), { slot: key }); return null; }
    const ids = Object.entries(site.assets || {}).filter(([, a]) => a.stored).map(([id]) => id);
    const store = ids.length ? db.transaction(ASSETS).objectStore(ASSETS) : null;
    const heavy = {};
    for (const id of ids) { const v = await req(store.get(id)); if (v) { heavy[id] = v; savedAssets.add(id); } }
    const missing = ids.filter(id => !heavy[id]);
    if (missing.length) log.warn('storage.assets-missing', __n(missing.length, '{n} image introuvable dans la base locale : elle sera retirée du projet', '{n} images introuvables dans la base locale : elles seront retirées du projet'), { missing: missing.slice(0, 10) });
    log.info('storage.load', __('Projet rechargé depuis cet appareil'), { slot: key, name: site.name, pages: site.pages?.length, images: ids.length, ms: Math.round(performance.now() - t0) });
    return ids.length ? mergeAssets(site, heavy) : site;
  } catch (e) { log.error('storage.load-fail', __('Lecture du projet enregistré impossible : {error}', { error: e?.message || e }), { slot: key, error: e }); return null; }
}

export async function saveProject(site, key = 'current') {
  const db = await open();
  const { light, heavy } = splitAssets(site);
  const fresh = Object.keys(heavy).filter(id => !savedAssets.has(id));
  const lost = Object.keys(light.assets).filter(id => !heavy[id] && !savedAssets.has(id));
  if (lost.length) log.warn('asset.missing', __n(lost.length, '{n} image du projet n’a pas d’octets en mémoire ni dans la base locale : elle ne pourra pas être affichée', '{n} images du projet n’ont pas d’octets en mémoire ni dans la base locale : elles ne pourront pas être affichées'), { ids: lost.slice(0, 10) });
  await new Promise((resolve, reject) => {
    const tx = db.transaction([STORE, ASSETS], 'readwrite');
    tx.objectStore(STORE).put(light, key);
    for (const id of fresh) tx.objectStore(ASSETS).put(heavy[id], id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  for (const id of fresh) savedAssets.add(id);
  return { kb: Math.round(JSON.stringify(light).length / 1024), newImages: fresh.length || undefined };
}

export const assetWrites = () => savedAssets.size;

/* ---------- Auto-test (cycle 20) : emplacement de secours, images temporaires ---------- */
export async function deleteProject(key) {
  const db = await open();
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  log.debug('storage.project-delete', __('Emplacement de projet effacé'), { slot: key });
}

export async function listAssetIds() {
  const db = await open();
  return (await req(db.transaction(ASSETS).objectStore(ASSETS).getAllKeys())).map(String);
}

export async function deleteAssets(ids) {
  if (!ids.length) return;
  const db = await open();
  await new Promise((resolve, reject) => { const tx = db.transaction(ASSETS, 'readwrite'); for (const id of ids) tx.objectStore(ASSETS).delete(id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  for (const id of ids) savedAssets.delete(id);
  log.debug('storage.asset-delete', __n(ids.length, '{n} image retirée de la base locale', '{n} images retirées de la base locale'), { ids: ids.slice(0, 10) });
}

/* ---------- Versions (les images restent dans le magasin d'images, jamais dupliquées) ---------- */
async function storeAssets(db, heavy) {
  const fresh = Object.keys(heavy).filter(id => !savedAssets.has(id));
  if (!fresh.length) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ASSETS, 'readwrite');
    for (const id of fresh) tx.objectStore(ASSETS).put(heavy[id], id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  for (const id of fresh) savedAssets.add(id);
}

export async function saveVersion(v) {
  log.debug('storage.version-save', __('Version enregistrée'), { id: v.id, name: v.name || undefined, kind: v.kind });
  const db = await open();
  const { light, heavy } = splitAssets(v.site);
  await storeAssets(db, heavy);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(VERSIONS, 'readwrite');
    tx.objectStore(VERSIONS).put({ ...v, site: light }, v.id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function listVersions() {
  try {
    const db = await open();
    const all = await req(db.transaction(VERSIONS).objectStore(VERSIONS).getAll());
    return all.map(({ site, ...meta }) => meta).sort((a, b) => b.at.localeCompare(a.at));
  } catch (e) { log.error('storage.versions-fail', __('Liste des versions illisible : {error}', { error: e?.message || e }), { error: e }); return []; }
}

export async function loadVersion(id) {
  const db = await open();
  const v = await req(db.transaction(VERSIONS).objectStore(VERSIONS).get(id));
  if (!v) { log.warn('storage.version-missing', __('Version introuvable'), { id }); return null; }
  const ids = Object.entries(v.site.assets || {}).filter(([, a]) => a.stored).map(([k]) => k);
  const store = db.transaction(ASSETS).objectStore(ASSETS);
  const heavy = {};
  for (const k of ids) { const x = await req(store.get(k)); if (x) heavy[k] = x; }
  return { ...v, site: mergeAssets(v.site, heavy) };
}

export async function deleteVersions(ids) {
  if (!ids.length) return;
  log.debug('storage.version-delete', __n(ids.length, '{n} version supprimée', '{n} versions supprimées'), { ids: ids.slice(0, 10) });
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(VERSIONS, 'readwrite');
    for (const id of ids) tx.objectStore(VERSIONS).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- Secrets (jetons) : sur cet appareil seulement, hors du projet ---------- */
export async function getSecret(key) {
  try { const db = await open(); const v = (await req(db.transaction(SECRETS).objectStore(SECRETS).get(key))) || ''; log.debug('storage.secret-read', v ? __('Secret retrouvé sur cet appareil') : __('Aucun secret gardé'), { name: key }); return v; } catch (e) { log.warn('storage.secret-fail', __('Secret illisible'), { name: key, error: e }); return ''; }
}

export async function setSecret(key, value) {
  log.info('storage.secret-write', value ? __('Secret gardé sur cet appareil (jamais dans le projet)') : __('Secret oublié sur cet appareil'), { name: key });
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SECRETS, 'readwrite');
    if (value) tx.objectStore(SECRETS).put(value, key); else tx.objectStore(SECRETS).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/*
 * Cycle 25 (S2) : les jetons de publication sont gardés par origine (php-token:<origine>) ou par dépôt
 * (github-token:<owner/repo>). Les clés historiques « php-token » / « github-token » (avant le cycle 25) sont rattachées
 * à l'adresse du projet courant quand elle existe, puis effacées : elles ne sont plus jamais pré-remplies telles quelles.
 * `store` ({ get, set }) remplace IndexedDB dans les tests. Renvoie les déplacements faits ({ from, to }, to = null si écartée).
 */
export async function migrateLegacyTokens(site, store = { get: getSecret, set: setSecret }) {
  const moves = [];
  const targets = [['php-token', tokenKey('php', publishOrigin(site?.publish?.url))], ['github-token', tokenKey('github', githubTarget(site?.publish?.gh))]];
  for (const [from, to] of targets) {
    if (!to) continue;
    const old = await store.get(from);
    if (!old) continue;
    const current = await store.get(to);
    if (!current) await store.set(to, old);
    await store.set(from, '');
    moves.push({ from, to: current ? null : to });
    log.info('storage.secret-migrated', current ? __('Ancien jeton écarté : un jeton est déjà gardé pour cette adresse') : __('Ancien jeton rattaché à l’adresse de publication du projet'), { from, to: current ? null : to });
  }
  return moves;
}

/* Destinations déjà confirmées pour une publication (php:<origine>, github:<owner/repo>), sur cet appareil */
export const KNOWN_DESTINATIONS_KEY = 'atelier-publish-known';
function knownDestinations() {
  try {
    const v = JSON.parse(localStorage.getItem(KNOWN_DESTINATIONS_KEY) || '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch { return []; }
}
export const isKnownDestination = key => !!key && knownDestinations().includes(key);
export function addKnownDestination(key) {
  if (!key || isKnownDestination(key)) return;
  try { localStorage.setItem(KNOWN_DESTINATIONS_KEY, JSON.stringify([...knownDestinations(), key])); } catch { /* stockage indisponible : confirmation redemandée la prochaine fois */ }
}

/* ---------- Cycle 31 (S6) : stockage persistant, quota, ramasse-miettes des images orphelines ---------- */
export async function storageState() {
  const s = navigator.storage;
  const persisted = s?.persisted ? await s.persisted().catch(() => null) : null;
  const est = s?.estimate ? await s.estimate().catch(() => null) : null;
  return { persisted, usage: est?.usage, quota: est?.quota };
}

/* Demande au navigateur de ne pas effacer la base (à appeler pendant un geste de la personne) */
export async function requestPersist() {
  const s = navigator.storage;
  if (!s?.persist) return { granted: null, already: false };
  if (await s.persisted?.().catch(() => false)) return { granted: true, already: true };
  return { granted: await s.persist().catch(() => false), already: false };
}

/* Taille approximative d'une image rangée (data URL en base64, variantes, ou Blob) */
const sizeOf = v => {
  if (!v) return 0;
  if (typeof Blob !== 'undefined' && v instanceof Blob) return v.size;
  if (typeof v === 'string') return Math.round(v.length * 0.75);
  if (typeof v === 'object') return Object.values(v).reduce((t, x) => t + (Array.isArray(x) ? x.reduce((u, y) => u + sizeOf(y), 0) : sizeOf(x)), 0);
  return 0;
};

/* Images référencées : tous les projets rangés (dont les emplacements de l'auto-test) et toutes les versions */
async function referencedAssets(db) {
  const projects = await req(db.transaction(STORE).objectStore(STORE).getAll());
  const versions = await req(db.transaction(VERSIONS).objectStore(VERSIONS).getAll());
  return { siteIds: projects.flatMap(storedAssetIds), versionIds: versions.flatMap(v => storedAssetIds(v.site)) };
}

/* Retire du magasin les images ni dans un projet (ni dans `extraIds`, l'état en mémoire) ni dans une version gardée */
export async function collectOrphanAssets(extraIds = []) {
  const db = await open();
  const { siteIds, versionIds } = await referencedAssets(db);
  const stored = await listAssetIds();
  const ids = orphanAssets([...siteIds, ...extraIds], versionIds, stored);
  let bytes = 0;
  if (ids.length) {
    const store = db.transaction(ASSETS).objectStore(ASSETS);
    for (const id of ids) bytes += sizeOf(await req(store.get(id)));
    await deleteAssets(ids);
  }
  return { count: ids.length, bytes, stored: stored.length };
}

/* ---------- Cycle 31 (S7) : dossier de copie choisi (handle File System Access), gardé avec les secrets de l'appareil ---------- */
const FOLDER_KEY = 'backup-folder-handle';
export async function getFolderHandle() {
  try { const db = await open(); return (await req(db.transaction(SECRETS).objectStore(SECRETS).get(FOLDER_KEY))) || null; } catch { return null; }
}
export async function setFolderHandle(handle) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SECRETS, 'readwrite');
    if (handle) tx.objectStore(SECRETS).put(handle, FOLDER_KEY); else tx.objectStore(SECRETS).delete(FOLDER_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
