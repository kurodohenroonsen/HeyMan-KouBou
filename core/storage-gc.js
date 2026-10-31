/*
 * Stockage fiable (cycle 31, S6) : calcul des images orphelines du magasin local, textes de l'état du stockage
 * (persistant, quota utilisé), plafond d'import d'un projet .json et reconnaissance d'une base pleine. Sans DOM.
 */
import { __ } from './ui-i18n.js';

export const MAX_IMPORT_BYTES = 200 * 1024 * 1024;

/* Images du magasin qui ne sont ni dans un projet ni dans une version gardée (ordre du magasin) */
export function orphanAssets(siteIds, versionIds, storedIds) {
  const used = new Set([...(siteIds || []), ...(versionIds || [])].map(String));
  const seen = new Set();
  const out = [];
  for (const raw of storedIds || []) {
    const id = String(raw);
    if (used.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/* Identifiants des images d'un projet (en mémoire ou allégé tel qu'il est rangé dans la base) */
export const storedAssetIds = site => Object.keys(site?.assets || {});

const decimal = (n, digits) => n.toFixed(digits).replace(/\.0+$/, '').replace('.', ',');

/* 42 Mo, 2 Go, 1,5 Go (unités françaises, base 1024) */
export function formatBytes(bytes) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n >= 1024 ** 3) return __('{n} Go', { n: decimal(n / 1024 ** 3, n >= 10 * 1024 ** 3 ? 0 : 1) });
  if (n >= 1024 ** 2) return __('{n} Mo', { n: decimal(n / 1024 ** 2, n >= 10 * 1024 ** 2 ? 0 : 1) });
  return __('{n} Ko', { n: Math.round(n / 1024) });
}

/* « Stockage : persistant · 42 Mo utilisés sur 2 Go » ; persisted = null quand le navigateur ne dit rien */
export function storageSummary({ persisted = null, usage, quota } = {}) {
  const state = persisted === true ? __('persistant') : persisted === false ? __('non persistant (le navigateur peut l’effacer)') : __('état inconnu');
  const used = Number.isFinite(usage) && Number.isFinite(quota) ? ' · ' + __('{used} utilisés sur {quota}', { used: formatBytes(usage), quota: formatBytes(quota) }) : '';
  return __('Stockage : {state}', { state }) + used;
}

export const importTooLarge = bytes => Number(bytes) > MAX_IMPORT_BYTES;

/* Base pleine : QuotaExceededError (Chrome, Firefox, Safari) ou message équivalent */
export function isQuotaError(e) {
  if (!e) return false;
  return e.name === 'QuotaExceededError' || /quota/i.test(String(e.message || ''));
}

export const quotaAdvice = () => __('L’espace de stockage du navigateur est plein : votre dernière modification n’est pas enregistrée. Exportez une copie (Fichier → Enregistrer le projet .json), puis supprimez d’anciennes versions (Fichier → Versions…) et nettoyez les images inutilisées.');
