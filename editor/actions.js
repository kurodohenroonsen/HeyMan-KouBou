/* Actions de l'éditeur, partagées par la barre d'outils, le clavier, l'inspecteur et la bibliothèque. */
import { state, root, nodeById, parentOf, commitRoot, commit, select, selectedIds, emit, setEditTarget } from './store.js';
import { createComponent, makeInstance, detachInstance } from '../core/components.js';
import { createNode, createSectionWithColumns, duplicateNode, removeNode, insertNode, reId, findParent, canContain, setStyleBundle } from '../core/tree.js';
import { insertAuto, placeForType, moveSibling, nodeLabel, nodeSummary, removeMany, duplicateMany, topLevel, moveTargets, moveTo } from '../core/editing.js';
import { h, toast } from './dom.js';
import { askText, openDialog } from './dialog.js';
import { log } from './log.js';
import { __, __n, N_ } from '../core/ui-i18n.js';

/* Une action refusée (règle de structure, mode relecture, élément introuvable…) : avertissement + message */
function safe(fn, action) {
  try { return fn(); } catch (e) { log.warn('action.refused', __('Action « {action} » refusée : {error}', { action: __(action), error: e.message }), { action, selected: state.selected || undefined, type: nodeById(state.selected)?.type, multi: state.multi.size || undefined, error: e }); toast(e.message, 'error'); return null; }
}
const typeOf = id => nodeById(id)?.type;
/* En mode relecture, commit() refuse la modification (store.readonly) : pas de ligne « réussi » */
const applied = () => !state.readOnly;
const parentType = id => parentOf(id)?.type;
/* Rien n'est sélectionné : l'action ne fait rien (raccourci ou bouton pressé sans sélection) */
const none = action => { log.debug('action.none', __('« {action} » : rien n’est sélectionné', { action: __(action) }), { action }); };

export function insertWidget(type) {
  return safe(() => {
    const node = createNode(type, { lang: state.site.defaultLanguage });
    const r = insertAuto(root(), state.selected, node);
    commitRoot(r.root, { source: 'library' });
    select(r.id, { scroll: true });
    if (applied()) log.info('action.add', __('Widget ajouté : {label}', { label: nodeLabel(node) }), { type, id: r.id, after: state.selected === r.id ? undefined : state.selected, parentType: parentType(r.id) });
    return r.id;
  }, N_('ajouter'));
}

export function insertSection(spans = [12], prebuilt) {
  return safe(() => {
    const sec = prebuilt ? reId(prebuilt) : createSectionWithColumns(spans.length, spans);
    const place = placeForType(root(), state.selected, 'section');
    commitRoot(insertNode(root(), place.parentId, sec, place.index), { source: 'library' });
    select(sec.id, { scroll: true });
    if (applied()) log.info('action.add-section', prebuilt ? __n(sec.children?.length || 0, 'Section ajoutée depuis un modèle ({n} rangée)', 'Section ajoutée depuis un modèle ({n} rangées)') : __n(spans.length, 'Section ajoutée : {n} colonne {spans}', 'Section ajoutée : {n} colonnes {spans}', { spans: spans.join('-') }), { id: sec.id, spans: prebuilt ? undefined : spans, template: !!prebuilt || undefined, index: place.index });
    return sec.id;
  }, N_('ajouter une section'));
}

export function selectParent() {
  const id = state.selected;
  if (!id) { none(N_('parent')); return; }
  const p = parentOf(id);
  if (p && p.type !== 'page') { log.debug('action.parent', __('Parent sélectionné : {type}', { type: p.type }), { from: typeOf(id), to: p.type, id: p.id }); select(p.id, { scroll: false }); }
  else log.debug('action.parent-none', __('Déjà au niveau le plus haut (une section n’a pas de parent sélectionnable)'), { id, type: typeOf(id) });
}

export function duplicateSelected() {
  if (state.multi.size > 1) {
    safe(() => {
      const r = duplicateMany(root(), [...state.multi]);
      commitRoot(r.root, { source: 'action' });
      state.multi = new Set(r.ids.length > 1 ? r.ids : []);
      state.selected = r.ids[r.ids.length - 1] || null;
      emit('selection', {});
      if (applied()) log.info('action.duplicate', __n(r.ids.length, '{n} élément dupliqué', '{n} éléments dupliqués'), { count: r.ids.length, ids: r.ids });
      toast(__n(r.ids.length, '{n} élément dupliqué.', '{n} éléments dupliqués.'));
    }, N_('dupliquer'));
    return;
  }
  const id = state.selected;
  if (!id) { none(N_('dupliquer')); return; }
  safe(() => {
    const r = duplicateNode(root(), id);
    commitRoot(r.root, { source: 'action' });
    select(r.newId);
    if (applied()) log.info('action.duplicate', __('Dupliqué : {type}', { type: typeOf(r.newId) }), { id, newId: r.newId, type: typeOf(r.newId) });
  }, N_('dupliquer'));
}

/* opts.quiet : pas de message (couper affiche le sien) ; un évènement DOM passé par un bouton est ignoré */
export function deleteSelected(opts) {
  const quiet = !!(opts && !(opts instanceof Event) && opts.quiet);
  if (state.multi.size > 1) {
    safe(() => {
      const n = topLevel(root(), [...state.multi]).length;
      commitRoot(removeMany(root(), [...state.multi]), { source: 'action' });
      select(null);
      if (applied()) log.info('action.delete', __n(n, '{n} élément supprimé', '{n} éléments supprimés'), { count: n });
      toast(__n(n, '{n} élément supprimé (Ctrl+Z pour annuler).', '{n} éléments supprimés (Ctrl+Z pour annuler).'));
    }, N_('supprimer'));
    return;
  }
  const id = state.selected;
  if (!id) { none(N_('supprimer')); return; }
  safe(() => {
    const type = typeOf(id);
    const label = nodeLabel(nodeById(id));
    const { parent, index } = findParent(root(), id);
    const r = removeNode(root(), id);
    commitRoot(r, { source: 'action' });
    const sibling = parent?.children?.[index + 1] || parent?.children?.[index - 1];
    const next = sibling && sibling.id !== id ? sibling.id : (parent && parent.type !== 'page' ? parent.id : null);
    select(next && nodeById(next) ? next : null);
    if (applied()) {
      log.info('action.delete', __('Supprimé : {type}', { type }), { id, type, next: state.selected || null });
      if (!quiet) toast(__('Supprimé : {label} — Ctrl+Z pour annuler', { label }));
    }
  }, N_('supprimer'));
}

export function copySelected() {
  const n = nodeById(state.selected);
  if (!n) { none(N_('copier')); return; }
  state.clipboard = structuredClone(n);
  let count = 0;
  const walk = x => { count++; (x.children || []).forEach(walk); };
  walk(n);
  log.info('action.copy', __('Copié : {label}', { label: nodeLabel(n) }), { id: n.id, type: n.type, nodes: count });
  toast(__('« {label} » copié. Sélectionnez un emplacement puis Ctrl+V.', { label: nodeLabel(n) }));
}

export function pasteClipboard() {
  const clip = state.clipboard;
  if (!clip) { log.debug('action.paste-empty', __('Coller : le presse-papiers d’Atelier est vide (copie d’abord un élément)')); return; }
  safe(() => {
    const node = reId(clip);
    const sel = state.selected ? nodeById(state.selected) : null;
    let r;
    if (node.type === 'section') {
      const place = placeForType(root(), state.selected, 'section');
      r = { root: insertNode(root(), place.parentId, node, place.index), id: node.id };
    } else if (sel && canContain(root(), sel.id, node.type)) {
      r = { root: insertNode(root(), sel.id, node), id: node.id };
    } else if (sel) {
      const { parent, index } = findParent(root(), sel.id);
      if (parent && canContain(root(), parent.id, node.type)) r = { root: insertNode(root(), parent.id, node, index + 1), id: node.id };
    }
    if (!r && node.type !== 'row' && node.type !== 'column') r = insertAuto(root(), state.selected, node);
    if (!r) throw new Error(__('Impossible de coller cet élément ici : sélectionnez une colonne ou une section.'));
    commitRoot(r.root, { source: 'action' });
    select(r.id);
    if (applied()) log.info('action.paste', __('Collé : {type}', { type: clip.type }), { id: r.id, type: clip.type, parentType: parentType(r.id), after: sel?.id });
  }, N_('coller'));
}

export function copyStyle() {
  const n = nodeById(state.selected);
  if (!n) { none(N_('copier le style')); return; }
  state.styleClipboard = { type: n.type, style: structuredClone(n.style) };
  log.info('style.copy', __('Style copié : {label}', { label: nodeLabel(n) }), { id: n.id, type: n.type, props: Object.fromEntries(Object.entries(n.style || {}).map(([k, v]) => [k, Object.keys(v || {}).length])) });
  toast(__('Style copié.'));
}

export function pasteStyle() {
  if (!state.styleClipboard) { log.debug('style.paste-empty', __('Coller le style : aucun style copié')); return; }
  const ids = selectedIds();
  if (!ids.length) { none(N_('coller le style')); return; }
  safe(() => {
    let r = root();
    for (const id of ids) {
      const n = nodeById(id);
      const style = structuredClone(state.styleClipboard.style);
      if (n.type === 'column') { for (const st of ['desktop', 'tablet', 'mobile']) if (n.style[st]?.span) style[st].span = n.style[st].span; else delete style[st]?.span; }
      r = setStyleBundle(r, id, style);
    }
    commitRoot(r, { source: 'action' });
    if (applied()) log.info('style.paste', ids.length > 1 ? __('Style collé sur {n} éléments', { n: ids.length }) : __('Style collé'), { count: ids.length, from: state.styleClipboard.type, types: [...new Set(ids.map(typeOf))] });
    toast(ids.length > 1 ? __('Style collé sur {n} éléments.', { n: ids.length }) : __('Style collé.'));
  }, N_('coller le style'));
}

export function cutSelected() {
  const n = nodeById(state.selected);
  if (!n || state.multi.size > 1) {
    if (state.multi.size > 1) { log.warn('action.refused', __('Action « couper » refusée : un seul élément à la fois'), { action: 'couper', multi: state.multi.size }); toast(__('Couper fonctionne sur un seul élément à la fois.'), 'error'); }
    else none(N_('couper'));
    return;
  }
  state.clipboard = structuredClone(n);
  log.info('action.cut', __('Coupé : {label} (dans le presse-papiers d’Atelier)', { label: nodeLabel(n) }), { id: n.id, type: n.type });
  deleteSelected({ quiet: true });
  toast(__('« {label} » coupé. Sélectionnez la destination puis Ctrl+V.', { label: nodeLabel(n) }));
}

export function moveSelected(delta) {
  const id = state.selected;
  if (!id) { none(N_('déplacer')); return; }
  safe(() => {
    const r = moveSibling(root(), id, delta);
    if (!r) { log.debug('action.move-edge', delta < 0 ? __('Déjà en premier : impossible de monter') : __('Déjà en dernier : impossible de descendre'), { id, delta }); return; }
    commitRoot(r, { source: 'action' });
    select(id, { scroll: true });
    if (applied()) log.info('action.move', delta < 0 ? __('Monté : {type}', { type: typeOf(id) }) : __('Descendu : {type}', { type: typeOf(id) }), { id, type: typeOf(id), delta, index: findParent(root(), id).index });
  }, N_('déplacer'));
}

/* « Déplacer vers… » (cycle 33, WCAG 2.5.7) : choisir la colonne ou la section de destination sans glisser */
const PLACE = { section: N_('Section {n}'), row: N_('Rangée {n}'), column: N_('Colonne {n}') };
function targetLabel(t) {
  const first = nodeById(t.id)?.children?.[0];
  const hint = t.current ? __('position actuelle') : first ? nodeSummary(first, state.site, state.lang) || nodeLabel(first) : __('vide');
  return `${t.path.map(p => __(PLACE[p.type], { n: p.n })).join(' › ')} — ${hint}`;
}
export function moveSelectedTo() {
  const id = state.selected;
  if (!id) { none(N_('déplacer vers')); return; }
  const node = nodeById(id);
  const targets = moveTargets(root(), id);
  if (!targets.length) { log.debug('action.move-to-none', __('« Déplacer vers… » : aucune destination (une section se déplace avec Monter / Descendre)'), { id, type: node.type }); toast(__('Une section se déplace avec Monter / Descendre (Alt+↑ / Alt+↓).')); return; }
  const sel = h('select', { class: 'control', 'data-move-target': '', size: Math.min(10, Math.max(2, targets.length)) },
    targets.map(t => h('option', { value: t.id, selected: t.current }, targetLabel(t))));
  const go = () => {
    const to = targets.find(t => t.id === sel.value);
    d.close();
    if (!to || to.current) { log.debug('action.move-to-same', __('« Déplacer vers… » : même endroit, rien à faire'), { id }); return; }
    safe(() => {
      commitRoot(moveTo(root(), id, to.id), { source: 'action' });
      select(id, { scroll: true });
      if (applied()) log.info('action.move-to', __('Déplacé vers {target} : {type}', { target: to.path.map(p => __(PLACE[p.type], { n: p.n })).join(' › '), type: node.type }), { id, type: node.type, to: to.id, toType: to.type, path: to.path.map(p => p.n).join('.') });
    }, N_('déplacer vers'));
  };
  sel.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  sel.addEventListener('dblclick', go);
  const d = openDialog({
    id: 'moveToDialog', size: 'sm', focus: sel, title: __('Déplacer « {label} » vers…', { label: nodeLabel(node) }),
    body: h('div', { class: 'a11y-form' }, h('label', { class: 'field' }, h('span', { class: 'field__label' }, __('Destination (l’élément est placé à la fin)')), sel)),
    actions: [h('button', { type: 'button', class: 'btn', 'data-confirm-cancel': '', onclick: () => d.close() }, __('Annuler')),
      h('button', { type: 'button', class: 'btn btn--primary', 'data-confirm': '', onclick: go }, __('Déplacer'))]
  });
  log.debug('action.move-to-open', __n(targets.length, '« Déplacer vers… » : {n} destination possible', '« Déplacer vers… » : {n} destinations possibles'), { id, type: node.type, targets: targets.length });
}

/* ---------- Composants ---------- */

export async function createComponentFromSelected() {
  const n = nodeById(state.selected);
  if (!n || n.type === 'page') { log.warn('action.refused', __('Action « créer un composant » refusée : rien de sélectionné'), { action: 'créer un composant', reason: 'no-selection' }); toast(__('Sélectionnez d’abord une section, une rangée, une colonne ou un widget.'), 'error'); return; }
  if (state.editTarget) { log.warn('action.refused', __('Action « créer un composant » refusée : une autre modification (composant, en-tête…) est en cours'), { action: 'créer un composant', reason: 'edit-target', edit: state.editTarget.kind }); toast(__('Terminez d’abord la modification en cours.'), 'error'); return; }
  const name = await askText({ id: 'componentNameDialog', title: __('Créer un composant'), label: __('Nom du composant (réutilisable sur toutes les pages) :'), value: nodeLabel(n), ok: __('Créer') });
  if (name === null) { log.info('action.component-cancel', __('Création du composant annulée (nom non donné)'), { id: n.id }); return; }
  safe(() => {
    const r = createComponent(state.site, state.pageId, n.id, name);
    commit(r.site, { source: 'pages' });
    select(r.instanceId);
    if (applied()) log.info('action.component-create', __('Composant « {name} » créé : l’élément devient une instance', { name: r.site.components[r.id].name }), { component: r.id, type: n.type, instance: r.instanceId });
    toast(__('Composant « {name} » créé. Retrouvez-le dans le panneau Modèles.', { name: r.site.components[r.id].name }));
  }, N_('créer un composant'));
}

export function insertComponent(id) {
  safe(() => {
    const node = makeInstance(state.site, id);
    let r;
    if (node.type === 'section') {
      const place = placeForType(root(), state.selected, 'section');
      r = { root: insertNode(root(), place.parentId, node, place.index), id: node.id };
    } else if (node.type === 'row' || node.type === 'column') {
      const sel = state.selected ? nodeById(state.selected) : null;
      const target = sel && canContain(root(), sel.id, node.type) ? { parentId: sel.id } : sel && findParent(root(), sel.id).parent && canContain(root(), findParent(root(), sel.id).parent.id, node.type) ? { parentId: findParent(root(), sel.id).parent.id, index: findParent(root(), sel.id).index + 1 } : null;
      if (!target) throw new Error(node.type === 'row' ? __('Sélectionnez une section ou une colonne pour y placer cette rangée.') : __('Sélectionnez une rangée pour y placer cette colonne.'));
      r = { root: insertNode(root(), target.parentId, node, target.index), id: node.id };
    } else r = insertAuto(root(), state.selected, node);
    commitRoot(r.root, { source: 'library' });
    select(r.id, { scroll: true });
    if (applied()) log.info('action.component-insert', __('Composant « {name} » inséré', { name: state.site.components?.[id]?.name }), { component: id, type: node.type, id: r.id, parentType: parentType(r.id) });
  }, N_('insérer un composant'));
}

export function detachSelected() {
  const n = nodeById(state.selected);
  if (!n?.ref) { log.debug('action.none', __('« détacher » : l’élément sélectionné n’est pas une instance de composant'), { action: 'détacher', id: n?.id }); return; }
  safe(() => {
    if (state.editTarget) throw new Error(__('Détachez depuis la page, pas pendant la modification d’un composant.'));
    const r = detachInstance(state.site, state.pageId, n.id);
    commit(r.site, { source: 'action' });
    select(r.id);
    if (applied()) log.info('action.component-detach', __('Instance détachée : copie indépendante'), { component: n.ref, id: r.id });
    toast(__('Instance détachée : c’est maintenant une copie indépendante.'));
  }, N_('détacher'));
}

export function editSelectedComponent() {
  const n = nodeById(state.selected);
  if (n?.ref) { log.debug('action.component-edit', __('Modification du composant demandée'), { component: n.ref }); setEditTarget({ kind: 'component', id: n.ref }); }
  else log.debug('action.none', __('« modifier le composant » : l’élément sélectionné n’est pas une instance'), { action: 'modifier le composant' });
}
