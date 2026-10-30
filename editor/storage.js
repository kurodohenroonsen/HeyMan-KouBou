/*
 * Sauvegarde locale dans IndexedDB. Les images sont rangées à part et écrites une seule fois :
 * le projet (léger) est réenregistré à chaque modification sans recopier les images.
 */
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

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

/* Sépare les données lourdes (data URL) des métadonnées */
export function splitAssets(site) {
  const light = {};
  const heavy = {};
  for (const [id, a] of Object.entries(site.assets || {})) {
    light[id] = { ...a, dataUrl: undefined, variants: a.variants?.map(v => ({ ...v, dataUrl: undefined })), stored: true };
    heavy[id] = { dataUrl: a.dataUrl, variants: (a.variants || []).map(v => v.dataUrl) };
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
