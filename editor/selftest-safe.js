/*
 * Auto-test (cycle 20) : mise de côté du projet et retour arrière.
 * Trois copies avant le test : en mémoire (avec l'historique), emplacement « selftest-backup » de la base locale,
 * version de sécurité « Avant l'auto-test ». Le repère localStorage['atelier-selftest'] signale un test en cours :
 * après un rechargement en plein test, le démarrage reprend la copie de secours (recoverAtBoot).
 */
import { state, captureState, restoreState, load } from './store.js';
import { saveProject, loadProject, deleteProject, saveVersion, listVersions, deleteVersions, listAssetIds, deleteAssets, splitAssets } from './storage.js';
import { makeVersion } from '../core/versions.js';
import { stableJson } from '../core/selftest.js';
import { log, settings, setLevels } from './log.js';
import { __, fmtDate } from '../core/ui-i18n.js';

export const MARK = 'atelier-selftest';
const SLOT = 'selftest-backup';
let active = null;

const lsRead = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsWrite = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };
function lsSnapshot() {
  const out = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('atelier') && k !== MARK) out[k] = localStorage.getItem(k); } } catch { /* idem */ }
  return out;
}
function lsRestore(before) {
  const now = lsSnapshot();
  for (const k of Object.keys(now)) if (!(k in before)) lsWrite(k, null);
  for (const [k, v] of Object.entries(before)) if (now[k] !== v) lsWrite(k, v);
}
const assetIdsOf = site => Object.keys(site?.assets || {});
const sameStored = (a, b) => stableJson(splitAssets(a).light) === stableJson(splitAssets(b).light);

export const selftestActive = () => !!active;
export const pendingMark = () => { try { return JSON.parse(lsRead(MARK) || 'null'); } catch { return null; } };

/* Avant le test : les trois copies, puis le repère (seulement si la copie de secours est écrite) */
export async function beginSafe() {
  const f = log.flow('selftest.backup', __('Mise de côté du projet avant l’auto-test'), { name: state.site?.name, pages: state.site?.pages?.length, past: state.past.length });
  const snap = captureState();
  snap.json = stableJson(snap.site);
  snap.levels = { console: settings.console, keep: settings.keep, server: settings.server };
  snap.ls = lsSnapshot();
  snap.ai = Object.prototype.hasOwnProperty.call(window, '__atelierAI') ? { value: window.__atelierAI } : null;
  snap.versionsBefore = (await listVersions()).map(v => v.id);
  snap.assetsBefore = await listAssetIds().catch(() => []);
  await saveProject(snap.site, SLOT);
  f.step('slot', __('Copie de secours écrite dans la base locale'), { slot: SLOT });
  const v = makeVersion(snap.site, { name: __('Avant l’auto-test ({date})', { date: fmtDate(new Date()) }), kind: 'safety' });
  await saveVersion(v);
  snap.safetyId = v.id;
  lsWrite(MARK, JSON.stringify({ at: new Date().toISOString(), name: snap.site?.name, safetyId: v.id, versionsBefore: snap.versionsBefore, assetsBefore: snap.assetsBefore }));
  active = snap;
  f.ok(__('Projet mis de côté (mémoire, copie de secours, version de sécurité)'), { safety: v.id, versions: snap.versionsBefore.length, images: snap.assetsBefore.length });
  return snap;
}

/* Nettoyage commun : versions et images apparues pendant le test, copie de secours, repère */
async function cleanup({ versionsBefore, assetsBefore, keepSafety, safetyId, site }, f) {
  const before = new Set(versionsBefore);
  const extra = (await listVersions()).map(v => v.id).filter(id => !before.has(id) && (keepSafety ? id !== safetyId : true));
  await deleteVersions(extra);
  const keepAssets = new Set([...assetsBefore, ...assetIdsOf(site)]);
  const orphans = (await listAssetIds().catch(() => [])).filter(id => !keepAssets.has(id));
  await deleteAssets(orphans).catch(e => f.warn('assets', __('Images temporaires non retirées : {message}', { message: e.message })));
  if (!keepSafety) { await deleteProject(SLOT).catch(() => {}); lsWrite(MARK, null); }
  return { versions: extra.length - (keepSafety ? 0 : 1), assets: orphans.length };
}

/* Après le test (ou atelierDebug.rollback() pendant la même visite) */
export async function endSafe(snap = active) {
  if (!snap) return { ok: false, same: false, problems: [__('aucun projet mis de côté')] };
  const f = log.flow('selftest.rollback', __('Retour arrière : le projet d’avant l’auto-test est remis'), { name: snap.site?.name });
  const problems = [];
  try {
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch { /* déjà fermée */ } });
    restoreState(snap);
    const same = stableJson(state.site) === snap.json;
    if (!same) problems.push(__('le projet en mémoire diffère de l’original'));
    f.step('memory', same ? __('Projet et historique remis en mémoire') : __('Projet remis, mais différent de l’original'), { same, past: state.past.length, future: state.future.length }, same ? 'debug' : 'warn');
    await saveProject(state.site);
    const back = await loadProject();
    const stored = !!back && sameStored(back, snap.site);
    if (!stored) problems.push(__('la copie enregistrée sur l’appareil diffère'));
    f.step('saved', stored ? __('Projet réenregistré et relu à l’identique') : __('Projet réenregistré, relecture différente'), { stored }, stored ? 'debug' : 'warn');
    if (snap.levels) setLevels(snap.levels);
    lsRestore(snap.ls || {});
    if (snap.ai) window.__atelierAI = snap.ai.value; else delete window.__atelierAI;
    const ok = !problems.length;
    const c = await cleanup({ ...snap, keepSafety: !ok, site: state.site }, f);
    active = null;
    const r = { ok, same: ok, name: state.site.name, pages: state.site.pages.length, versions: Math.max(0, c.versions), assets: c.assets, problems };
    if (ok) f.ok(__('Retour arrière terminé : projet identique à l’original'), r);
    else f.fail(new Error(problems.join(' ; ')), r, __('Retour arrière incomplet : la copie de secours et la version de sécurité sont gardées'));
    return r;
  } catch (e) {
    f.fail(e, {}, __('Retour arrière interrompu : {message} — la copie de secours est gardée', { message: e?.message || e }));
    return { ok: false, same: false, problems: [...problems, String(e?.message || e)] };
  }
}

/* Retour arrière manuel : en mémoire si le test tourne encore, sinon depuis la copie de secours */
export async function rollback() {
  if (active) return endSafe(active);
  const m = pendingMark();
  if (!m) { log.info('selftest.rollback.none', __('Rien à restaurer : aucun auto-test en cours ou interrompu')); return { ok: true, same: true, nothing: true, problems: [] }; }
  const f = log.flow('selftest.rollback', __('Retour arrière depuis la copie de secours'), { at: m.at, name: m.name });
  const site = await loadProject(SLOT);
  if (!site) { lsWrite(MARK, null); f.fail(new Error(__('copie de secours introuvable')), {}, __('Copie de secours introuvable : restaure la version « Avant l’auto-test » (Fichier → Versions)')); return { ok: false, same: false, problems: [__('copie de secours introuvable')] }; }
  load(site);
  await saveProject(state.site);
  const c = await cleanup({ versionsBefore: m.versionsBefore || [], assetsBefore: m.assetsBefore || [], keepSafety: false, site: state.site }, f);
  const r = { ok: true, same: true, name: state.site.name, pages: state.site.pages.length, versions: Math.max(0, c.versions), assets: c.assets, problems: [], history: false };
  f.ok(__('Projet d’avant l’auto-test remis (l’historique d’annulation repart de zéro)'), r);
  return r;
}

/* Démarrage : un auto-test a été interrompu (rechargement, onglet fermé) → on reprend la copie de secours */
export async function recoverAtBoot() {
  const m = pendingMark();
  if (!m) return null;
  const site = await loadProject(SLOT);
  if (!site) { lsWrite(MARK, null); log.warn('selftest.recover-missing', __('Auto-test interrompu, mais copie de secours introuvable : voir la version « Avant l’auto-test »'), { at: m.at }); return null; }
  log.warn('selftest.recovered', __('Auto-test interrompu : le projet d’avant le test est repris'), { at: m.at, name: site.name, pages: site.pages?.length });
  return {
    site,
    async finish() {
      const f = log.flow('selftest.rollback', __('Nettoyage après un auto-test interrompu'), { at: m.at });
      await saveProject(site);
      const c = await cleanup({ versionsBefore: m.versionsBefore || [], assetsBefore: m.assetsBefore || [], keepSafety: false, site }, f);
      f.ok(__('Projet d’avant l’auto-test remis'), { versions: Math.max(0, c.versions), assets: c.assets });
    }
  };
}
