/*
 * Magasin d'images (cycle 27) : les octets des images vivent ici, hors du modèle du site. `site.assets[id]` ne garde
 * que des métadonnées { file, mime, width, height, variants: [{ w, file }], kind } ; le rendu demande une adresse au
 * magasin (`url(id, w)` : `blob:` mis en cache dans le canevas) et l'export lui demande les octets (`get(id, w)`).
 * Implémentation en mémoire, sans DOM (Node, tests, éditeur) ; l'éditeur la persiste dans IndexedDB (editor/storage.js).
 * Aussi : copie d'un site sans recopier ses octets (`cloneSite`), séparation à l'import (`absorbAssets`) et
 * réinjection à l'export .json (`inlineAssets`), ménage des octets plus référencés (`pruneStore`).
 */

import { DOC_TYPES } from './documents.js';
import { sanitizeSvg, svgFromDataUrl, svgDataUrl } from './svg.js';

export const DATA_IMG = /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i;
/* Octets acceptés par le magasin : images (dont SVG assaini, cycle 33) et documents à télécharger (cycle 33) */
const MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml',
  ...Object.values(DOC_TYPES)]);
export const isStorableData = d => {
  const m = /^data:([\w.+/-]+);base64,[a-z0-9+/=]*$/i.exec(String(d || ''));
  return !!m && MIMES.has(m[1].toLowerCase());
};

/* Parties du site qui portent des octets (images, polices importées, icône) : partagées entre copies, jamais clonées */
const SHARED = new Set(['assets', 'fonts', 'icon']);

/* Copie profonde d'un site, sauf ses octets : les objets partagés ne sont jamais modifiés en place (on les recrée) */
export function cloneSite(site) {
  if (!site || typeof site !== 'object' || Array.isArray(site)) return structuredClone(site);
  const out = {};
  for (const k of Object.keys(site)) out[k] = SHARED.has(k) ? site[k] : structuredClone(site[k]);
  return out;
}

const mimeOf = dataUrl => String(dataUrl).slice(5, String(dataUrl).indexOf(';'));
const sizeOf = dataUrl => Math.floor((String(dataUrl).length - String(dataUrl).indexOf(',') - 1) * 3 / 4);

export function dataUrlToBytes(dataUrl) {
  const s = String(dataUrl);
  const bin = atob(s.slice(s.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

/*
 * objectUrls : true → `url()` renvoie des adresses `blob:` (canevas) ; false → la data URL (sans Blob ni URL.createObjectURL).
 * put(id, { dataUrl | blob, variants: [{ w, dataUrl | blob }] }) : synchrone avec des data URL, promesse avec des Blob.
 */
export function createAssetStore({ objectUrls } = {}) {
  const entries = new Map();
  const urls = new Map();
  const useBlob = objectUrls ?? (typeof Blob === 'function' && typeof URL?.createObjectURL === 'function');
  const revoke = id => {
    for (const [k, u] of urls) if (k.startsWith(`${id}@`)) { if (u.startsWith('blob:')) URL.revokeObjectURL(u); urls.delete(k); }
  };
  const putSync = (id, { dataUrl, variants = [] }) => {
    if (!isStorableData(dataUrl)) throw new Error(`image ${id} : data URL d'image ou de document attendue`);
    /* Cycle 33 : tout SVG est assaini à l'entrée du magasin (projet .json, pair, import) ; illisible → refusé */
    if (/^data:image\/svg\+xml/i.test(dataUrl)) dataUrl = svgDataUrl(sanitizeSvg(svgFromDataUrl(dataUrl)).svg);
    const vs = new Map();
    for (const v of variants || []) if (v && v.w > 0 && DATA_IMG.test(String(v.dataUrl || ''))) vs.set(Math.round(v.w), v.dataUrl);
    revoke(id);
    entries.set(id, { dataUrl, mime: mimeOf(dataUrl), variants: vs });
    return store;
  };
  const store = {
    put(id, data) {
      const blobs = data?.blob || (data?.variants || []).some(v => v?.blob);
      if (!blobs) return putSync(id, data);
      return (async () => {
        const dataUrl = data.dataUrl || await blobToDataUrl(data.blob);
        const variants = [];
        for (const v of data.variants || []) variants.push({ w: v.w, dataUrl: v.dataUrl || await blobToDataUrl(v.blob) });
        return putSync(id, { dataUrl, variants });
      })();
    },
    /* { dataUrl, mime, w } de la variante de largeur w si elle existe, sinon de l'image principale ; null si absente */
    get(id, w) {
      const e = entries.get(id);
      if (!e) return null;
      if (w && e.variants.has(Math.round(w))) { const d = e.variants.get(Math.round(w)); return { dataUrl: d, mime: mimeOf(d), w: Math.round(w) }; }
      return { dataUrl: e.dataUrl, mime: e.mime, w: 0 };
    },
    url(id, w) {
      const got = store.get(id, w);
      if (!got) return '';
      if (!useBlob) return got.dataUrl;
      const k = `${id}@${got.w}`;
      if (!urls.has(k)) urls.set(k, URL.createObjectURL(new Blob([dataUrlToBytes(got.dataUrl)], { type: got.mime })));
      return urls.get(k);
    },
    /* Octets complets d'une image : { dataUrl, variants: [{ w, dataUrl }] } (envoi à un pair) */
    entry(id) {
      const e = entries.get(id);
      return e ? { dataUrl: e.dataUrl, variants: [...e.variants].map(([w, dataUrl]) => ({ w, dataUrl })) } : null;
    },
    has: id => entries.has(id),
    delete(id) { revoke(id); return entries.delete(id); },
    list: () => [...entries.keys()],
    /* Octets gardés en mémoire (images et variantes, décodés) */
    bytes() {
      let n = 0;
      for (const e of entries.values()) { n += sizeOf(e.dataUrl); for (const d of e.variants.values()) n += sizeOf(d); }
      return n;
    },
    /* Format rangé dans IndexedDB depuis le cycle 19 : { dataUrl, variants: [dataUrl…] } dans l'ordre des métadonnées */
    heavy(id, meta) {
      const e = entries.get(id);
      if (!e) return null;
      return { dataUrl: e.dataUrl, variants: (meta?.variants || []).map(v => e.variants.get(v.w)).filter(Boolean) };
    },
    clear() { for (const id of [...entries.keys()]) store.delete(id); }
  };
  return store;
}

/* Métadonnées seules d'une image (sans octets ni marque d'enregistrement) */
export function assetMeta(a) {
  const m = { file: a.file, mime: a.mime };
  if (a.width > 0 && a.height > 0) { m.width = a.width; m.height = a.height; }
  if (Array.isArray(a.variants) && a.variants.length) m.variants = a.variants.map(v => ({ w: v.w, file: v.file }));
  m.kind = a.kind || 'image';
  /* Cycle 33 : un document garde son nom d'origine et sa taille (lien « PDF, 1,2 Mo » sur le site) */
  if (m.kind === 'document') { if (a.name) m.name = String(a.name); if (a.size > 0) m.size = a.size; }
  return m;
}

const hasBytes = a => !!(a && (a.dataUrl || a.variants?.some(v => v?.dataUrl)));

/* Sépare les octets d'un site (data URL dans site.assets) : ils vont dans le magasin, le site garde les métadonnées */
export function absorbAssets(site, store) {
  const src = site?.assets;
  if (!src || !Object.values(src).some(a => hasBytes(a) || a?.stored)) return site;
  const assets = {};
  for (const [id, a] of Object.entries(src)) {
    if (a?.dataUrl && isStorableData(a.dataUrl)) {
      const variants = (a.variants || []).filter(v => v?.dataUrl).map(v => ({ w: v.w, dataUrl: v.dataUrl }));
      /* SVG illisible (cycle 33) : métadonnées seules, l'image sera signalée manquante à l'export */
      try { store.put(id, { dataUrl: a.dataUrl, variants }); } catch { assets[id] = assetMeta(a); continue; }
      assets[id] = assetMeta({ ...a, variants: (a.variants || []).filter(v => v?.dataUrl) });
    } else assets[id] = assetMeta(a);
  }
  return { ...site, assets };
}

/* Site autonome (fichier .json, compatibilité) : les octets du magasin réinjectés sous forme de data URL */
export function inlineAssets(site, store) {
  const assets = {};
  for (const [id, a] of Object.entries(site?.assets || {})) {
    const main = store?.get(id) || (a.dataUrl ? { dataUrl: a.dataUrl } : null);
    const { stored, ...rest } = a;
    assets[id] = { ...rest, ...(main ? { dataUrl: main.dataUrl } : {}) };
    const bytesOf = v => { const g = store?.get(id, v.w); return g && g.w === v.w ? g.dataUrl : v.dataUrl; };
    if (a.variants?.length) assets[id].variants = a.variants.map(v => ({ ...v, dataUrl: bytesOf(v) })).filter(v => v.dataUrl);
  }
  return { ...site, assets };
}

/* Retire du magasin les octets qu'aucun des sites donnés (état, historique, versions ouvertes) ne référence plus */
export function pruneStore(store, sites) {
  const keep = new Set();
  const seen = new Set();
  for (const s of sites) {
    if (!s?.assets || seen.has(s.assets)) continue;
    seen.add(s.assets);
    for (const id of Object.keys(s.assets)) keep.add(id);
  }
  const gone = store.list().filter(id => !keep.has(id));
  for (const id of gone) store.delete(id);
  return gone;
}
