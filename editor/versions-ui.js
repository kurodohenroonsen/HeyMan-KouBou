/* Versions : enregistrer, comparer, restaurer. Versions automatiques (début de journée) et de sécurité (avant restauration, ouverture…). */
import { h, $, toast } from './dom.js';
import { state, subscribe, load } from './store.js';
import { makeVersion, diffSites, describeDiff, pruneVersions, isNewDay } from '../core/versions.js';
import { saveVersion, listVersions, loadVersion, deleteVersions } from './storage.js';
import { log } from './log.js';
import { collectGarbage } from './safety.js';
import { formatBytes } from '../core/storage-gc.js';
import { __, __n, __c, fmtDate } from '../core/ui-i18n.js';

let lastAuto = null;
let ready = false;

const KIND = { manual: __c('kind', 'Version enregistrée'), auto: __('Automatique — début de journée'), safety: __('Sécurité') };

async function prune(f) {
  const list = await listVersions();
  const keep = new Set(pruneVersions(list, { maxAuto: 30 }).map(v => v.id));
  const old = list.filter(v => !keep.has(v.id));
  if (old.length) f?.step('prune', __('{n} ancienne(s) version(s) automatique(s) ou de sécurité supprimée(s) (30 gardées au plus)', { n: old.length }), { total: list.length, removed: old.length, oldest: old.at(-1)?.at }, 'info');
  else f?.step('prune', __('Aucune ancienne version à supprimer'), { total: list.length });
  await deleteVersions(old.map(v => v.id));
  /* Cycle 31 : les images que seules les versions supprimées utilisaient sont retirées */
  if (old.length) await collectGarbage('prune');
}

const KIND_LOG = { manual: __('manuelle'), auto: __('automatique'), safety: __('de sécurité') };

export async function snapshot(site, name, kind) {
  const f = log.flow('version.save', name ? __('Enregistrement d’une version {kind} : « {name} »', { kind: KIND_LOG[kind] || kind, name: String(name).slice(0, 60) }) : __('Enregistrement d’une version {kind}', { kind: KIND_LOG[kind] || kind }), { kind, name: String(name || '').slice(0, 60) || undefined });
  try {
    const v = makeVersion(site, { name, kind });
    await saveVersion(v);
    if (kind !== 'manual') await prune(f);
    if (kind === 'auto') lastAuto = v.at;
    f.ok(__n(v.summary.pages, 'Version {kind} enregistrée ({n} page)', 'Version {kind} enregistrée ({n} pages)', { kind: KIND_LOG[kind] || kind }), { id: v.id, kind, at: v.at, pages: v.summary.pages, kb: Math.round(JSON.stringify(v.site).length / 1024) });
    return v;
  } catch (e) {
    f.fail(e, { kind, hint: /quota/i.test(`${e?.name} ${e?.message}`) ? 'Espace de stockage du navigateur plein : supprimez d’anciennes versions ou enregistrez le projet en .json' : 'Base locale du navigateur indisponible (navigation privée, autre onglet qui la bloque, ou espace plein)' }, __('Version non enregistrée : {error}', { error: e?.message || e }));
    toast(__('Version non enregistrée : {error}', { error: e.message }), 'error');
    return null;
  }
}

/* À appeler avant une opération qui remplace le projet */
export function beforeRisky(label) {
  return snapshot(state.site, label, 'safety');
}

export async function initVersions() {
  const list = await listVersions();
  lastAuto = list.find(v => v.kind === 'auto')?.at || null;
  ready = true;
  log.debug('version.init', __('{n} version(s) dans ce navigateur', { n: list.length }), { count: list.length, manual: list.filter(v => v.kind === 'manual').length, lastAuto, autoToday: !isNewDay(lastAuto) });
  subscribe((reason, opts) => {
    if (reason !== 'doc' || !ready || opts.source === 'history') return;
    if (!isNewDay(lastAuto)) return;
    log.info('version.auto', __('Première modification du jour : version automatique de l’état d’avant'), { previous: lastAuto, source: opts.source });
    lastAuto = new Date().toISOString();
    const before = state.past[state.past.length - 1]?.site || state.site;
    snapshot(before, '', 'auto');
  });
}

const fmt = iso => fmtDate(iso, { dateStyle: 'medium', timeStyle: 'short' });

async function render(d) {
  const list = await listVersions();
  const ul = d.querySelector('.version-list');
  const by = k => list.filter(v => v.kind === k).length;
  log.debug('version.list', __('Liste des versions : {n}', { n: list.length }), { count: list.length, manual: by('manual'), auto: by('auto'), safety: by('safety'), newest: list[0]?.at });
  if (!list.length) { ul.replaceChildren(h('li', { class: 'hint' }, __('Aucune version pour l’instant.'))); return; }
  ul.replaceChildren(...list.map(v => {
    const diff = h('span', { class: 'version__diff' }, '…');
    loadVersion(v.id).then(full => { if (full) diff.textContent = describeDiff(diffSites(state.site, full.site)); }).catch(e => { log.warn('version.diff-fail', __('Comparaison avec la version du {date} impossible : {error}', { date: fmt(v.at), error: e?.message || e }), { id: v.id, error: e }); diff.textContent = ''; });
    const pagesText = __n(v.summary.pages, '{n} page', '{n} pages');
    return h('li', { class: `version version--${v.kind}`, 'data-version': v.id },
      h('div', {}, h('strong', {}, v.name || KIND[v.kind] || __('Version')), h('span', { class: 'version__meta' }, ` · ${fmt(v.at)} · ${pagesText}${v.name ? ` · ${KIND[v.kind]}` : ''}`)),
      diff,
      h('div', { class: 'row-btns' },
        h('button', { type: 'button', class: 'btn btn--small', 'data-version-restore': v.id, onclick: async () => {
          const f = log.flow('version.restore', __('Restauration de « {name} » du {date}', { name: v.name || KIND[v.kind], date: fmt(v.at) }), { id: v.id, kind: v.kind, at: v.at, pages: v.summary.pages });
          if (!confirm(__('Revenir à « {name} » du {date} ? L’état actuel est d’abord enregistré comme version de sécurité.', { name: v.name || KIND[v.kind], date: fmt(v.at) }))) { f.cancel(__('Restauration annulée')); return; }
          let full;
          try { full = await loadVersion(v.id); } catch (e) {
            f.fail(e, { id: v.id }, __('Version illisible dans la base locale : {error}', { error: e?.message || e }));
            toast(__('Version illisible : {error}', { error: e.message }), 'error');
            return;
          }
          if (!full) { f.fail(new Error(__('Version introuvable')), { id: v.id }, __('Version introuvable : supprimée entre-temps (autre onglet, nettoyage) ou base locale effacée')); toast(__('Version introuvable.'), 'error'); return; }
          f.step('loaded', __('Version lue : {pages} page(s), {images} image(s)', { pages: full.site.pages.length, images: Object.keys(full.site.assets || {}).length }), { pages: full.site.pages.length, images: Object.keys(full.site.assets || {}).length });
          const safe = await snapshot(state.site, __('Avant de revenir au {date}', { date: fmt(v.at) }), 'safety');
          if (safe) f.step('safety', __('État actuel gardé comme version de sécurité'), { id: safe.id });
          else f.warn('safety-missing', __('Version de sécurité non enregistrée : la restauration continue (Ctrl+Z reste possible)'));
          load(full.site, { keepHistory: true });
          d.close();
          f.ok(__('Version du {date} restaurée (Ctrl+Z pour annuler)', { date: fmt(v.at) }), { id: v.id, pages: full.site.pages.length });
          toast(__('Version du {date} restaurée (Ctrl+Z pour annuler).', { date: fmt(v.at) }));
        } }, __('Restaurer')),
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm is-danger', 'data-version-delete': v.id, 'aria-label': __('Supprimer cette version'), title: __('Supprimer cette version'), onclick: async () => {
          try { await deleteVersions([v.id]); } catch (e) {
            log.error('version.delete-fail', __('Version non supprimée : {error}', { error: e?.message || e }), { id: v.id, error: e });
            toast(__('Version non supprimée : {error}', { error: e.message }), 'error');
            return;
          }
          log.info('version.delete', __('Version « {name} » du {date} supprimée', { name: v.name || KIND[v.kind], date: fmt(v.at) }), { id: v.id, kind: v.kind });
          render(d);
        } }, '✕')));
  }));
}

/* Cycle 31 : nettoyage des images inutilisées, sur demande */
function gcRow() {
  const out = h('span', { class: 'hint', 'data-gc-result': '', role: 'status' });
  const run = async () => {
    out.textContent = __('Nettoyage…');
    const r = await collectGarbage('button');
    out.textContent = !r ? __('Nettoyage impossible (voir le journal).') : r.count ? __n(r.count, '{n} image inutilisée retirée ({size} libérés).', '{n} images inutilisées retirées ({size} libérés).', { size: formatBytes(r.bytes) }) : __('Aucune image inutilisée.');
  };
  return h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-gc-run': '', title: __('Retire de ce navigateur les images qui ne sont plus ni dans le projet ni dans une version gardée'), onclick: run }, __('Nettoyer les images inutilisées')), out);
}

export function openVersions() {
  $('#versionsDialog')?.remove();
  const name = h('input', { class: 'input', type: 'text', 'data-version-name': '', placeholder: __('ex. Avant la refonte du menu'), 'aria-label': __('Nom de la version') });
  const save = async () => {
    if (!name.value.trim()) log.debug('version.unnamed', __('Version enregistrée sans nom : « {name} »', { name: __('Version sans nom') }));
    const v = await snapshot(state.site, name.value || __('Version sans nom'), 'manual');
    if (v) { name.value = ''; toast(__('Version enregistrée.')); render(d); }
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  const d = h('dialog', { class: 'audit', id: 'versionsDialog', 'aria-labelledby': 'versionsTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'versionsTitle' }, __('Versions du projet')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      h('div', { class: 'add-page' }, name, h('button', { type: 'button', class: 'btn btn--small btn--primary', id: 'versionSave', onclick: save }, __('Enregistrer une version'))),
      h('p', { class: 'hint' }, __('Une version est aussi enregistrée automatiquement au début de chaque journée de travail, et avant chaque restauration ou ouverture d’un autre projet. Les versions restent dans ce navigateur (pensez à « Enregistrer le projet (.json) » pour une copie de sécurité ailleurs).')),
      gcRow()),
    h('ul', { class: 'version-list' }),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))));
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  log.info('version.open', __('Fenêtre des versions ouverte'));
  render(d).catch(e => log.error('version.list-fail', __('Liste des versions non affichée : {error}', { error: e?.message || e }), { error: e }));
}
