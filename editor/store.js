/*
 * État de l'éditeur et historique. Toute modification du site passe par commit().
 * Les vues s'abonnent avec subscribe(fn(reason, opts)).
 *   reason : 'doc' (contenu), 'selection', 'view' (appareil, langue, page), 'hover'
 */
import { findPage, updatePageRoot, normalizeSite } from '../core/site.js';
import { editRoot, applyEditRoot } from '../core/components.js';
import { findNode, findParent } from '../core/tree.js';
import { saveProject } from './storage.js';
import { applyOps } from '../core/collab.js';
import { log } from './log.js';
import { __, __c } from '../core/ui-i18n.js';
import { assets, absorb, prune } from './assets.js';

/*
 * Historique (cycle 27) : les états partagent les images (site.assets, octets dans editor/assets.js) ; il est borné en
 * pas et en octets (taille JSON des états, images exclues).
 */
export const HISTORY_MAX_STEPS = 150;
export const HISTORY_MAX_BYTES = 40e6;
const stateBytes = site => JSON.stringify({ ...site, assets: undefined, fonts: undefined, icon: undefined }).length;
export const historyBytes = () => [...state.past, ...state.future].reduce((n, p) => n + (p.bytes || 0), 0);
function trimHistory() {
  let total = historyBytes();
  let dropped = 0;
  while (state.past.length > HISTORY_MAX_STEPS || (state.past.length > 1 && total > HISTORY_MAX_BYTES)) {
    total -= state.past.shift().bytes || 0;
    dropped++;
  }
  if (dropped && !pinned) prune([state.site, ...state.past.map(p => p.site), ...state.future.map(p => p.site)]);
}
/* Un instantané de l'éditeur (auto-test) est gardé : ses images ne quittent pas la mémoire tant qu'il n'est pas rendu */
let pinned = null;

export const state = {
  ready: false,
  site: null,
  pageId: null,
  selected: null,
  multi: new Set(),
  editTarget: null,
  readOnly: false,
  hovered: null,
  device: 'desktop',
  lang: 'fr',
  styleState: 'normal',
  left: 'widgets',
  insp: 'content',
  collapsed: new Set(),
  clipboard: null,
  styleClipboard: null,
  past: [],
  future: [],
  lastKey: null,
  lastTime: 0,
  saving: false
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(reason, opts = {}) { for (const fn of listeners) fn(reason, opts); }

export const page = () => findPage(state.site, state.pageId) || state.site.pages[0];
/* Racine éditée : la page, ou le composant / l'en-tête / le pied de page en cours de modification */
let memo = { site: null, key: '', root: null };
export const root = () => {
  if (!state.editTarget) return page().root;
  const key = JSON.stringify(state.editTarget);
  if (memo.site !== state.site || memo.key !== key) memo = { site: state.site, key, root: editRoot(state.site, state.editTarget) };
  return memo.root || page().root;
};

export function setEditTarget(target) {
  state.editTarget = target && editRoot(state.site, target) ? target : null;
  log.info('store.edit-target', state.editTarget ? (target.id ? __('Édition : {kind} « {id} »', { kind: target.kind, id: target.id }) : __('Édition : {kind}', { kind: target.kind })) : __('Retour à la page'), { kind: state.editTarget?.kind, id: state.editTarget?.id, refused: target && !state.editTarget ? target.kind : undefined });
  state.selected = state.editTarget ? root().children?.[0]?.id || null : null;
  state.multi.clear();
  state.presetEdit = null;
  emit('view', { edit: true });
  emit('selection', {});
}
export const nodeById = id => (id ? findNode(root(), id) : null);
export const parentOf = id => findParent(root(), id).parent;

let saveTimer = null;
let saveFailed = false;
function scheduleSave() {
  emit('save', { status: __('Modifié') });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const t0 = performance.now();
    try {
      const r = await saveProject(state.site);
      log.debug('storage.save', __('Projet enregistré sur cet appareil'), { ms: Math.round(performance.now() - t0), ...(r || {}) });
      if (saveFailed) { log.info('storage.save-recovered', __('Enregistrement rétabli')); saveFailed = false; }
      emit('save', { status: __('Enregistré') });
    } catch (e) {
      saveFailed = true;
      log.error('storage.save-fail', __('Projet NON enregistré sur cet appareil : {error} (espace plein, navigation privée ou IndexedDB bloqué)', { error: e?.message || e }), { error: e, name: e?.name });
      emit('save', { status: __('Non enregistré') });
    }
  }, 600);
}

/**
 * opts.key   : regroupe les modifications rapides d'un même champ en une seule étape d'annulation
 * opts.source: 'inspector' | 'canvas' | autre – la vue qui a produit la modification peut éviter de se reconstruire
 */
const READONLY_OK = new Set(['review', 'remote']);
export function commit(site, opts = {}) {
  if (state.readOnly && !READONLY_OK.has(opts.source)) { log.warn('store.readonly', __('Modification refusée : mode relecture'), { source: opts.source, key: opts.key }); emit('readonly', {}); emit('doc', { source: 'history' }); return false; }
  if (!site || !Array.isArray(site.pages)) { log.error('store.invalid', __('Modification ignorée : site invalide (bogue)'), { source: opts.source, key: opts.key, type: typeof site }); return false; }
  const t0 = performance.now();
  const now = Date.now();
  const merge = opts.key && opts.key === state.lastKey && (opts.sticky || now - state.lastTime < 1500);
  log.debug('store.commit', merge ? __('Modification (même étape d’annulation)') : __('Modification'), { key: opts.key, source: opts.source, merged: !!merge || undefined, past: state.past.length + (merge ? 0 : 1), page: state.pageId, edit: state.editTarget?.kind });
  if (!merge) {
    state.past.push({ site: state.site, selected: state.selected, bytes: stateBytes(state.site) });
    trimHistory();
  }
  state.lastKey = opts.key || null;
  state.lastTime = now;
  state.future = [];
  state.site = site.assets !== state.site?.assets ? absorb(site) : site;
  fixSelection();
  scheduleSave();
  emit('doc', opts);
  /* Cycle 27 : durée d'une modification, de commit() à l'affichage (canevas, inspecteur, panneaux), en trace */
  log.trace('perf.commit', __('Modification appliquée et affichée'), { ms: Math.round((performance.now() - t0) * 10) / 10, source: opts.source, node: opts.node, past: state.past.length });
  return true;
}

/* Modifications reçues d'un autre participant : l'historique d'annulation les reçoit aussi,
   pour que « annuler » ne retire que ses propres modifications */
export function applyRemote(site, ops) {
  if (ops?.length) {
    state.past = state.past.map(p => ({ ...p, site: applyOps(p.site, ops) }));
    state.future = state.future.map(p => ({ ...p, site: applyOps(p.site, ops) }));
  }
  state.site = absorb(site);
  state.lastKey = null;
  log.debug('store.remote', __('Modifications d’un autre participant appliquées'), { ops: ops?.length || 0, history: state.past.length });
  fixSelection();
  scheduleSave();
  emit('doc', { source: 'remote' });
}

/* Le site avec la racine éditée remplacée (page, composant, en-tête ou pied de page) */
export function siteWithRoot(site, newRoot) {
  return state.editTarget ? applyEditRoot(site, state.editTarget, newRoot) : updatePageRoot(site, page().id, newRoot);
}

export function commitRoot(newRoot, opts) {
  commit(siteWithRoot(state.site, newRoot), opts);
}

/* Clé d'un texte d'élément dans l'inventaire des traductions (même format que core/i18n.js) */
export function textKey(nodeId, field) {
  const t = state.editTarget;
  const ref = !t ? page().id : t.kind === 'component' ? `c:${t.id}` : t.kind === 'card' ? `k:${t.id}` : t.kind === 'detail' ? `d:${t.id}` : t.kind === 'header' ? 'h' : 'f';
  return `n:${ref}:${nodeId}:${field}`;
}

/* Une personne a modifié ce texte : ce n'est plus une traduction automatique à relire */
export function clearReview(site, nodeId, field, lang) {
  const k = `${textKey(nodeId, field)}|${lang}`;
  if (!site.mt?.[k]) return site;
  const mt = { ...site.mt };
  delete mt[k];
  return { ...site, mt };
}

export function undo() {
  if (!state.past.length || state.readOnly) { log.debug('store.undo-none', state.readOnly ? __('Annuler : impossible en mode relecture') : __('Annuler : rien à annuler')); return false; }
  log.info('store.undo', __c('undo', 'Annuler'), { left: state.past.length - 1, redo: state.future.length + 1 });
  state.future.push({ site: state.site, selected: state.selected, bytes: stateBytes(state.site) });
  const prev = state.past.pop();
  state.site = prev.site;
  state.selected = prev.selected;
  state.lastKey = null;
  fixSelection();
  scheduleSave();
  emit('doc', { source: 'history' });
  emit('selection', {});
  return true;
}

export function redo() {
  if (!state.future.length || state.readOnly) { log.debug('store.redo-none', __('Rétablir : rien à rétablir')); return false; }
  log.info('store.redo', __('Rétablir'), { left: state.future.length - 1 });
  state.past.push({ site: state.site, selected: state.selected, bytes: stateBytes(state.site) });
  const next = state.future.pop();
  state.site = next.site;
  state.selected = next.selected;
  state.lastKey = null;
  fixSelection();
  scheduleSave();
  emit('doc', { source: 'history' });
  emit('selection', {});
  return true;
}

function fixSelection() {
  if (!findPage(state.site, state.pageId)) state.pageId = state.site.pages[0].id;
  if (state.editTarget && !editRoot(state.site, state.editTarget)) state.editTarget = null;
  if (state.selected && !nodeById(state.selected)) state.selected = null;
  for (const id of [...state.multi]) if (!nodeById(id)) state.multi.delete(id);
  if (state.multi.size < 2) state.multi.clear();
  if (state.multi.size && !state.multi.has(state.selected)) state.selected = [...state.multi][0];
  if (!state.site.languages.includes(state.lang)) state.lang = state.site.defaultLanguage;
}

export function select(id, opts = {}) {
  const prev = state.selected;
  state.selected = id && nodeById(id) ? id : null;
  if (prev !== state.selected) log.debug('store.select', state.selected ? __('Sélection : {type}', { type: nodeById(state.selected)?.type }) : __('Sélection vidée'), { id: state.selected, type: nodeById(state.selected)?.type, asked: id && !state.selected ? id : undefined });
  state.multi.clear();
  emit('selection', opts);
}

/* Maj+clic : ajoute ou retire un élément de la sélection multiple */
export function toggleMulti(id) {
  if (!id || !nodeById(id) || nodeById(id).type === 'page') return;
  if (!state.selected) { select(id); return; }
  if (!state.multi.size) state.multi.add(state.selected);
  if (state.multi.has(id)) {
    state.multi.delete(id);
    const rest = [...state.multi];
    state.selected = rest.includes(state.selected) ? state.selected : rest[rest.length - 1] || null;
    if (state.multi.size < 2) state.multi.clear();
  } else {
    state.multi.add(id);
    state.selected = id;
  }
  log.debug('store.multi', __('Sélection multiple : {n}', { n: state.multi.size }), { ids: [...state.multi] });
  emit('selection', {});
}

/* Identifiants concernés par une action : la sélection multiple, sinon l'élément sélectionné */
export const selectedIds = () => (state.multi.size > 1 ? [...state.multi] : state.selected ? [state.selected] : []);

export function hover(id) {
  if (state.hovered === id) return;
  state.hovered = id;
  log.trace('store.hover', __('Survol'), { id });
  emit('hover');
}

export function setView(patch) {
  log.debug('store.view', __('Vue : {view}', { view: Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ') }), patch);
  Object.assign(state, patch);
  if ('pageId' in patch) { state.selected = null; state.multi.clear(); }
  emit('view', patch);
}

/* Auto-test (cycle 20) : photographie de l'éditeur et retour exact (projet, historique, vue) */
const VIEW_KEYS = ['pageId', 'selected', 'editTarget', 'device', 'lang', 'styleState', 'left', 'insp', 'clipboard', 'styleClipboard', 'lastKey', 'lastTime'];
export function captureState() {
  const snap = { site: state.site, past: [...state.past], future: [...state.future], multi: [...state.multi], collapsed: [...state.collapsed] };
  for (const k of VIEW_KEYS) snap[k] = state[k];
  pinned = snap;
  return snap;
}
export function restoreState(snap) {
  log.info('store.restore', __('Éditeur remis dans l’état photographié'), { name: snap.site?.name, pages: snap.site?.pages?.length, past: snap.past.length, future: snap.future.length });
  pinned = null;
  state.site = snap.site;
  state.past = [...snap.past];
  state.future = [...snap.future];
  for (const k of VIEW_KEYS) state[k] = snap[k];
  state.multi.clear(); snap.multi.forEach(x => state.multi.add(x));
  state.collapsed.clear(); snap.collapsed.forEach(x => state.collapsed.add(x));
  if (!findPage(state.site, state.pageId)) state.pageId = state.site.pages[0].id;
  fixSelection();
  scheduleSave();
  emit('view', { reload: true });
}

export function load(site, { keepHistory = false } = {}) {
  log.info('store.load', __('Projet chargé dans l’éditeur'), { name: site?.name, pages: site?.pages?.length, keepHistory });
  if (keepHistory && state.site) { state.past.push({ site: state.site, selected: state.selected, bytes: stateBytes(state.site) }); state.future = []; }
  state.site = normalizeSite(site, { assets });
  state.pageId = site.pages[0].id;
  state.selected = null;
  state.multi.clear();
  state.editTarget = null;
  state.lang = site.defaultLanguage;
  scheduleSave();
  emit('view', { reload: true });
}

/* Tests unitaires : arrête l'enregistrement différé (IndexedDB absent dans Node) */
export function stopSaving() { clearTimeout(saveTimer); }
