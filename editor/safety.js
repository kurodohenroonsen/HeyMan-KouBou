/*
 * Stockage fiable (cycle 31, S6) : stockage persistant demandé au premier enregistrement qui suit un geste de la personne,
 * état et quota (onglet Site, journal), avertissement avant de fermer la page avec une modification non enregistrée,
 * message clair quand la base est pleine, nettoyage des images inutilisées (après l'élagage des versions et sur demande).
 */
import { h, toast } from './dom.js';
import { state, subscribe } from './store.js';
import { storageState, requestPersist, collectOrphanAssets } from './storage.js';
import { storageSummary, storedAssetIds, formatBytes, isQuotaError, quotaAdvice } from '../core/storage-gc.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

let saveCode = '';
let persistAsked = false;
let quotaShown = false;

/* Un geste de la personne est en cours (clic, touche) : le navigateur accorde plus facilement le stockage persistant */
const inGesture = () => (navigator.userActivation ? navigator.userActivation.isActive : true);

async function refreshStorageInfo() {
  const st = await storageState();
  const text = storageSummary(st);
  document.querySelectorAll('[data-storage-info]').forEach(el => { el.textContent = text; el.dataset.persisted = String(st.persisted); });
  return st;
}

/* Demandé une seule fois par séance, au premier enregistrement déclenché par un geste */
export async function askPersist(source = 'save') {
  persistAsked = true;
  const r = await requestPersist();
  log.info('storage.persist', r.granted ? (r.already ? __('Stockage déjà persistant : le navigateur ne l’effacera pas de lui-même') : __('Stockage persistant accordé : le navigateur ne l’effacera pas de lui-même')) : r.granted === null ? __('Stockage persistant non pris en charge par ce navigateur') : __('Stockage persistant refusé par le navigateur : gardez une copie hors du navigateur (dossier, export, hébergement)'), { granted: r.granted, already: r.already || undefined, source });
  const st = await refreshStorageInfo();
  log.info('storage.estimate', storageSummary(st), { persisted: st.persisted, usage: st.usage, quota: st.quota });
  return r;
}

function onSave(opts) {
  saveCode = opts.code || saveCode;
  if (opts.code === 'modified' && !persistAsked && inGesture()) askPersist();
  if (opts.code === 'saved') quotaShown = false;
  if (opts.code === 'failed' && isQuotaError(opts.error) && !quotaShown) {
    quotaShown = true;
    log.error('storage.quota', __('Base locale pleine : la dernière modification n’est pas enregistrée'), { name: opts.error?.name });
    toast(quotaAdvice(), 'error');
  }
}

function onBeforeUnload(e) {
  if (saveCode !== 'modified' && saveCode !== 'failed') return;
  log.warn('storage.unload-warn', saveCode === 'failed' ? __('Fermeture de la page avec un projet non enregistré : confirmation demandée') : __('Fermeture de la page pendant l’enregistrement : confirmation demandée'), { status: saveCode });
  e.preventDefault();
  e.returnValue = '';
}

/* Nettoyage des images que plus rien n’utilise (projet, versions gardées) ; source : 'prune' ou 'button' */
export async function collectGarbage(source) {
  try {
    const r = await collectOrphanAssets(storedAssetIds(state.site));
    log.info('storage.gc', r.count ? __n(r.count, '{n} image inutilisée retirée de la base locale ({size})', '{n} images inutilisées retirées de la base locale ({size})', { size: formatBytes(r.bytes) }) : __('Aucune image inutilisée dans la base locale'), { count: r.count, bytes: r.bytes, stored: r.stored, source });
    refreshStorageInfo();
    return r;
  } catch (e) {
    log.error('storage.gc-fail', __('Nettoyage des images impossible : {error}', { error: e?.message || e }), { error: e, source });
    return null;
  }
}

/* Bloc de l'onglet Site : état du stockage et quota */
export function storageSection() {
  const info = h('p', { class: 'hint', 'data-storage-info': '', role: 'status' }, __('Stockage : …'));
  queueMicrotask(() => refreshStorageInfo().catch(() => {}));
  return [
    h('h3', {}, __('Stockage sur cet appareil')),
    info,
    h('p', { class: 'hint' }, __('« Persistant » : le navigateur ne vide pas la base de lui-même quand le disque se remplit. Ce n’est pas une sauvegarde : gardez aussi une copie dans un dossier, en .json ou sur l’hébergement.'))
  ];
}

export function initSafety() {
  subscribe((reason, opts) => { if (reason === 'save') onSave(opts); });
  addEventListener('beforeunload', onBeforeUnload);
}
