/* Contenus : collections (médias membres, actualités, agenda…), leurs éléments, champs et réglages. */
import { h, $, toast, download } from './dom.js';
import { state, commit, setView, setEditTarget, subscribe, select } from './store.js';
import {
  COLLECTION_KINDS, FIELD_TYPES, createCollectionWithPage, setCollectionMeta, deleteCollection,
  addField, updateField, removeField, moveField, setFieldOptions,
  addItem, setItemValue, setItemSlug, setItemStatus, moveItem, duplicateItem, removeItem,
  itemTitle, exportItemsCsv, importItemsCsv, formatDate, collectionSlug, listPageId
} from '../core/collections.js';
import { LANG_LABELS } from '../core/site.js';
import { translate } from '../core/render.js';
import { fieldControl } from './fields.js';
import { log } from './log.js';
import { openSmartImport, decorateItemControls } from './smart-ui.js';
import { __, __n, __c, fmtDate } from '../core/ui-i18n.js';

const col = id => state.site.collections?.[id] || null;
/* « élément » d'une collection = item (≠ élément de la page) : contexte « item » */
const itemsCount = n => (Math.abs(n) <= 1 ? __c('item', '{n} élément', { n }) : __c('item', '{n} éléments', { n }));
const def = () => state.site.defaultLanguage;

/* `info` : action et identifiants, pour le journal en cas de refus */
function apply(fn, opts = {}, info = {}) {
  try { commit(fn(state.site), { source: 'collections', ...opts }); return true; } catch (e) {
    log.warn('collection.refused', __('Modification refusée : {error}', { error: e.message }), { ...info, error: e });
    toast(e.message, 'error');
    return false;
  }
}

/* Ouvre la carte ou la page de détail de la collection dans le canevas */
function editTemplate(kind, c, item) {
  if (kind === 'card') log.info('collection.edit-card', __('Modification de la carte de « {name} » (dessinée une fois pour tous les éléments)', { name: c.name }), { collection: c.id, item: item || undefined });
  else log.info('collection.edit-detail', __('Modification de la page de détail de « {name} »', { name: c.name }), { collection: c.id, item: item || undefined });
  setEditTarget({ kind, id: c.id, ...(item ? { item } : {}) });
}


/* ---------- Panneau de gauche ---------- */
export function collectionsPanel() {
  const cols = Object.values(state.site.collections || {});
  return [
    h('p', { class: 'hint' }, __('Contenus répétés : médias membres, actualités, agenda… Chaque élément a sa page ; la carte (dans les listes) et la page de détail se dessinent une seule fois.')),
    cols.length ? h('ul', { class: 'col-list', id: 'collectionList' }, cols.map(c => {
      const drafts = c.items.filter(i => i.status === 'draft').length;
      const itemsText = itemsCount(c.items.length);
      const countText = drafts ? __('{items} dont {drafts}', { items: itemsText, drafts: __n(drafts, '{n} brouillon', '{n} brouillons') }) : itemsText;
      return h('li', { class: 'col-row', 'data-collection': c.id },
        h('button', { type: 'button', class: 'col-row__main', 'data-col-open': c.id, onclick: () => openCollection(c.id) },
          h('span', { class: 'col-row__icon', 'aria-hidden': 'true' }, COLLECTION_KINDS[c.kind]?.icon || '▦'),
          h('span', { class: 'col-row__text' }, h('strong', {}, c.name), h('small', {}, `${countText} · /${c.slug}/`))),
        h('div', { class: 'row-btns' },
          h('button', { type: 'button', class: 'btn btn--small', 'data-col-card': c.id, onclick: () => editTemplate('card', c) }, __('✎ Carte')),
          h('button', { type: 'button', class: 'btn btn--small', 'data-col-detail': c.id, onclick: () => editTemplate('detail', c) }, __('✎ Page de détail'))));
    })) : h('p', { class: 'hint col-empty' }, __('Aucune collection pour l’instant.')),
    h('button', { type: 'button', class: 'btn btn--primary btn--small', id: 'newCollectionBtn', onclick: () => openNewCollection() }, __('+ Nouvelle collection'))
  ];
}

/* ---------- Nouvelle collection ---------- */
export function openNewCollection() {
  $('#collectionNewDialog')?.remove();
  let kind = 'events';
  let nameEdited = false;
  const name = h('input', { class: 'input', type: 'text', 'data-col-new-name': '', value: COLLECTION_KINDS[kind].label, 'aria-label': __('Nom de la collection') });
  name.addEventListener('input', () => { nameEdited = true; });
  const withPage = h('input', { type: 'checkbox', 'data-col-new-page': '', checked: true });
  const examples = h('input', { type: 'checkbox', 'data-col-new-examples': '', checked: true });
  const kinds = h('div', { class: 'kind-grid', role: 'radiogroup', 'aria-label': __('Type de collection') }, Object.entries(COLLECTION_KINDS).map(([k, v]) => h('button', {
    type: 'button', class: 'kind-card', role: 'radio', 'aria-checked': String(k === kind), 'data-kind': k,
    onclick: e => {
      kind = k;
      kinds.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.kind === k)));
      if (!nameEdited) name.value = v.label;
      log.debug('collection.new.kind', __('Type choisi : {kind}', { kind: v.label }), { kind: k, name: name.value.slice(0, 60) });
      void e;
    }
  }, h('span', { class: 'kind-card__icon', 'aria-hidden': 'true' }, v.icon), h('strong', {}, v.label), h('small', {}, v.hint))));
  const create = () => {
    try {
      const r = createCollectionWithPage(state.site, { kind, name: name.value, withPage: withPage.checked, examples: examples.checked });
      commit(r.site, { source: 'collections' });
      d.close();
      const c = r.site.collections[r.id];
      const kindLabel = COLLECTION_KINDS[kind]?.label || kind;
      const examplesText = __n(c.items.length, '{n} exemple', '{n} exemples');
      const pageSlug = r.pageId ? r.site.pages.find(p => p.id === r.pageId).slug : '';
      log.info('collection.create', r.pageId ? __('Collection « {name} » créée ({kind}) : {examples}, page /{slug}/', { name: c.name, kind: kindLabel, examples: examplesText, slug: pageSlug }) : __('Collection « {name} » créée ({kind}) : {examples}, sans page de liste', { name: c.name, kind: kindLabel, examples: examplesText }), { id: r.id, kind, slug: c.slug, fields: c.fields.length, items: c.items.length, page: r.pageId || null, examples: examples.checked, withPage: withPage.checked });
      if (r.pageId) setView({ pageId: r.pageId });
      state.left = 'content';
      document.querySelector('[data-left="content"]')?.click();
      toast(c.items.length
        ? (r.pageId ? __n(c.items.length, 'Collection « {name} » créée avec {n} exemple à remplacer et la page /{slug}/.', 'Collection « {name} » créée avec {n} exemples à remplacer et la page /{slug}/.', { name: c.name, slug: pageSlug }) : __n(c.items.length, 'Collection « {name} » créée avec {n} exemple à remplacer.', 'Collection « {name} » créée avec {n} exemples à remplacer.', { name: c.name }))
        : (r.pageId ? __('Collection « {name} » créée et la page /{slug}/.', { name: c.name, slug: pageSlug }) : __('Collection « {name} » créée.', { name: c.name })));
    } catch (e) { log.warn('collection.create-refused', __('Collection non créée : {error}', { error: e.message }), { kind, name: name.value.slice(0, 60), error: e }); toast(e.message, 'error'); }
  };
  const d = h('dialog', { class: 'audit col-new', id: 'collectionNewDialog', 'aria-labelledby': 'colNewTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'colNewTitle' }, __('Nouvelle collection')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      kinds,
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Nom')), name),
      h('label', { class: 'check' }, withPage, __('Créer aussi la page de liste (ajoutée au menu)')),
      h('label', { class: 'check' }, examples, __('Ajouter quelques exemples à remplacer'))),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Annuler')), h('button', { type: 'button', class: 'btn btn--primary', 'data-col-create': '', onclick: create }, __('Créer la collection'))));
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  name.focus();
  name.select();
}

/* ---------- Fenêtre d'une collection ---------- */
let current = null;
let unsub = null;

export function openCollection(id, { tab = 'items', itemId = null } = {}) {
  const c = col(id);
  if (!c) { log.warn('collection.missing', __('Collection introuvable (supprimée, ou lien venant d’une autre version du projet)'), { id }); toast(__('Collection introuvable.'), 'error'); return; }
  $('#collectionDialog')?.remove();
  current = { id, tab, itemId: itemId || c.items[0]?.id || null, query: '' };
  log.info('collection.open', __('Collection « {name} » ouverte : {items}, {fields}', { name: c.name, items: itemsCount(c.items.length), fields: __n(c.fields.length, '{n} champ', '{n} champs') }), { id, kind: c.kind, items: c.items.length, drafts: c.items.filter(i => i.status === 'draft').length, fields: c.fields.length, tab, item: current.itemId });
  const d = h('dialog', { class: 'audit col-dialog', id: 'collectionDialog', 'data-col': id, 'aria-labelledby': 'colTitle' });
  d.addEventListener('close', () => { d.remove(); current = null; unsub?.(); unsub = null; });
  document.body.append(d);
  render();
  d.showModal();
  unsub?.();
  unsub = subscribe((reason, opts) => {
    if (reason !== 'doc' || !current || opts.source === 'collections') return;
    if (!col(current.id)) { $('#collectionDialog')?.close(); return; }
    render();
  });
}

const dialogEl = () => $('#collectionDialog');

let rendering = false;
function render() {
  if (rendering) { queueMicrotask(render); return; }
  rendering = true;
  try { renderNow(); } finally { rendering = false; }
}

function renderNow() {
  const d = dialogEl();
  const c = current && col(current.id);
  if (!d || !c) return;
  if (current.itemId && !c.items.some(i => i.id === current.itemId)) current.itemId = c.items[0]?.id || null;
  const scroll = d.querySelector('.col-body')?.scrollTop || 0;
  const tab = (k, name, n) => h('button', { type: 'button', role: 'tab', 'data-col-tab': k, 'aria-selected': String(current.tab === k), onclick: () => { current.tab = k; log.debug('collection.tab', __('Onglet « {tab} »', { tab: name }), { collection: current.id, tab: k }); render(); } }, n === undefined ? name : `${name} (${n})`);
  const body = h('div', { class: `col-body col-body--${current.tab}` },
    current.tab === 'items' ? itemsTab(c) : current.tab === 'fields' ? fieldsTab(c) : settingsTab(c));
  d.replaceChildren(
    h('header', { class: 'audit__head' },
      h('h2', { id: 'colTitle' }, `${COLLECTION_KINDS[c.kind]?.icon || '▦'} ${c.name}`, h('small', { class: 'hint' }, ` /${c.slug}/`)),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'tabs', role: 'tablist' }, tab('items', __c('items', 'Éléments'), c.items.length), tab('fields', __('Champs'), c.fields.length), tab('settings', __('Réglages'))),
    body,
    h('footer', { class: 'audit__foot' },
      h('button', { type: 'button', class: 'btn', 'data-col-edit-card': '', onclick: () => { const it = current?.itemId; d.close(); editTemplate('card', c, it); } }, __('✎ Modifier la carte')),
      h('button', { type: 'button', class: 'btn', 'data-col-edit-detail': '', onclick: () => { const it = current?.itemId; d.close(); editTemplate('detail', c, it); } }, __('✎ Modifier la page de détail')),
      h('button', { type: 'button', class: 'btn btn--primary', onclick: () => d.close() }, __('Fermer'))));
  body.scrollTop = scroll;
}

/* ---------- Éléments ---------- */
function itemMeta(c, it) {
  const v = it.values;
  /* Date dans la langue de l'interface (liste de l'éditeur) ; formatDate reste pour le site publié */
  if (c.dateField && v[c.dateField] && formatDate(v[c.dateField], def(), 'short')) return fmtDate(`${v[c.dateField]}T00:00:00Z`, { dateStyle: 'medium', timeZone: 'UTC' });
  if (v.city) return v.city;
  return `/${it.slug}/`;
}

function itemsTab(c) {
  const search = h('input', { class: 'input input--sm', type: 'search', value: current.query, placeholder: __('Chercher…'), 'data-item-search': '', 'aria-label': __('Chercher un élément') });
  const list = h('ul', { class: 'item-list', 'data-item-list': '' });
  const fill = () => {
    const q = current.query.trim().toLowerCase();
    list.replaceChildren(...c.items.filter(it => !q || itemTitle(state.site, c, it, def()).toLowerCase().includes(q) || it.slug.includes(q)).map(it => h('li', {},
      h('button', { type: 'button', class: 'item-row' + (it.id === current.itemId ? ' is-current' : ''), 'data-item': it.id, 'aria-current': it.id === current.itemId ? 'true' : null, onclick: () => { current.itemId = it.id; log.debug('collection.item.select', __('Élément « {title} » affiché', { title: (itemTitle(state.site, c, it, def()) || it.slug).slice(0, 60) }), { collection: c.id, item: it.id, status: it.status }); render(); } },
        h('span', { class: 'item-row__title' }, itemTitle(state.site, c, it, def()) || __('(sans titre)')),
        h('span', { class: 'item-row__meta' }, itemMeta(c, it)),
        it.status === 'draft' ? h('span', { class: 'badge badge--draft' }, __('Brouillon')) : null))));
    if (!list.children.length) list.append(h('li', { class: 'hint' }, c.items.length ? __('Aucun résultat.') : __('Aucun élément : ajoutez le premier.')));
  };
  search.addEventListener('input', () => { current.query = search.value; fill(); log.trace('collection.item.search', __('Recherche dans les éléments'), { collection: c.id, length: search.value.length, shown: list.querySelectorAll('[data-item]').length }); });
  fill();
  const add = () => {
    const tf = c.fields.find(f => f.key === c.titleField);
    const title = { fr: 'Nouvel élément', nl: 'Nieuw item', de: 'Neuer Eintrag', en: 'New item' }[def()] || 'Nouvel élément';
    let r;
    try { r = addItem(state.site, c.id, { [c.titleField]: tf?.i18n ? { [def()]: title } : title }, { status: 'draft' }); } catch (e) { log.warn('collection.refused', __('Élément non ajouté : {error}', { error: e.message }), { action: 'item-add', collection: c.id, error: e }); toast(e.message, 'error'); return; }
    commit(r.site, { source: 'collections' });
    log.info('collection.item.add', __('Élément ajouté en brouillon dans « {name} »', { name: c.name }), { collection: c.id, item: r.itemId, slug: col(c.id)?.items.find(i => i.id === r.itemId)?.slug, items: col(c.id)?.items.length, status: 'draft' });
    current.itemId = r.itemId;
    current.query = '';
    render();
    dialogEl()?.querySelector('[data-item-form] input')?.select();
  };
  const csvFile = h('input', { type: 'file', accept: '.csv,text/csv', 'data-col-csv-import': '', 'aria-label': __('Importer des éléments (CSV)') });
  csvFile.addEventListener('change', async () => {
    const f = csvFile.files?.[0];
    if (!f) return;
    const fl = log.flow('collection.csv-import', __('Import CSV dans « {name} »', { name: c.name }), { collection: c.id, file: f.name.slice(0, 80), kb: Math.max(1, Math.round(f.size / 1024)), type: f.type || undefined });
    try {
      const text = await f.text();
      const first = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
      fl.step('read', __('Fichier lu : {n} ligne(s) de données', { n: text.split(/\r?\n/).filter(l => l.trim()).length - 1 }), { rows: Math.max(0, text.split(/\r?\n/).filter(l => l.trim()).length - 1), separator: (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',', columns: first.split(/[;,]/).map(x => x.trim().replace(/^"|"$/g, '')).slice(0, 20), bom: text.startsWith('\uFEFF') || undefined });
      const r = importItemsCsv(state.site, c.id, text);
      commit(r.site, { source: 'collections' });
      for (const err of r.errors.slice(0, 20)) fl.warn('row-refused', err, { line: Number(err.match(/\d+/)?.[0]) || undefined });
      fl.ok(__('Import terminé : {added} ajouté(s), {updated} mis à jour, {refused} ligne(s) refusée(s)', { added: r.added, updated: r.updated, refused: r.errors.length }), { added: r.added, updated: r.updated, refused: r.errors.length, items: col(c.id)?.items.length });
      const addedText = __n(r.added, '{n} élément ajouté', '{n} éléments ajoutés');
      const updatedText = __n(r.updated, '{n} mis à jour', '{n} mis à jour');
      toast(r.errors.length ? __('Import : {added}, {updated}, {n} ligne(s) ignorée(s) — {error}.', { added: addedText, updated: updatedText, n: r.errors.length, error: r.errors[0] }) : __('Import : {added}, {updated}.', { added: addedText, updated: updatedText }), r.errors.length ? 'error' : undefined);
      render();
    } catch (e) { fl.fail(e, { collection: c.id, file: f.name.slice(0, 80) }, __('Import CSV impossible : {error}', { error: e.message })); toast(e.message, 'error'); }
    csvFile.value = '';
  });
  const it = c.items.find(i => i.id === current.itemId);
  return [
    h('aside', { class: 'item-aside' },
      h('div', { class: 'add-page' }, search, h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-item-add': '', onclick: add }, __('+ Ajouter'))),
      h('div', { class: 'row-btns smart-row' },
        h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-smart-poster': '', title: __('Créer un élément à partir de la photo d’une affiche ou d’un flyer (IA locale)'), onclick: () => openSmartImport(c.id, 'poster') }, __('✨ Depuis une affiche')),
        h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-smart-paste': '', title: __('Créer des éléments à partir d’un texte collé (IA locale)'), onclick: () => openSmartImport(c.id, 'text') }, __('✨ Depuis un texte'))),
      list,
      h('div', { class: 'row-btns item-csv' },
        h('button', { type: 'button', class: 'btn btn--small', 'data-col-csv-export': '', onclick: () => {
          const csv = exportItemsCsv(state.site, c.id);
          download(`${c.slug}.csv`, csv, 'text/csv;charset=utf-8');
          log.info('collection.csv-export', __n(c.items.length, '{n} élément exporté en CSV : {file}', '{n} éléments exportés en CSV : {file}', { file: `${c.slug}.csv` }), { collection: c.id, file: `${c.slug}.csv`, items: c.items.length, columns: csv.replace(/^\uFEFF/, '').split('\r\n', 1)[0].split(',').length, kb: Math.max(1, Math.round(csv.length / 1024)) });
          toast(__('Éléments exportés en CSV (ouvrable dans un tableur).'));
        } }, '⇩ CSV'),
        h('label', { class: 'btn btn--small upload' }, __('⇧ Importer un CSV'), csvFile))),
    it ? itemForm(c, it) : h('section', { class: 'item-form item-form--empty' }, h('p', { class: 'hint' }, __('Ajoutez un élément, ou importez une liste depuis un tableur (CSV : une colonne par champ, ex. title.fr, date, place).')))
  ];
}

function refreshRow(c, it) {
  const row = dialogEl()?.querySelector(`[data-item="${CSS.escape(it.id)}"]`);
  const fresh = col(c.id)?.items.find(i => i.id === it.id);
  if (row && fresh) {
    row.querySelector('.item-row__title').textContent = itemTitle(state.site, col(c.id), fresh, def()) || __('(sans titre)');
    row.querySelector('.item-row__meta').textContent = itemMeta(col(c.id), fresh);
  }
}

function itemForm(c, it) {
  const write = key => (value, lang, histKey) => {
    const fd = c.fields.find(x => x.key === key);
    let ok = true;
    try { commit(setItemValue(state.site, c.id, it.id, key, value, lang), { source: 'collections', ...(histKey ? { key: histKey } : {}) }); } catch (e) {
      ok = false;
      log.warn('collection.item.value-refused', __('Valeur refusée pour « {field} » : {error}', { field: fd?.label || key, error: e.message }), { collection: c.id, item: it.id, field: key, type: fd?.type, lang: lang || undefined, value: typeof value === 'string' ? value.slice(0, 60) : typeof value, error: e });
      toast(e.message, 'error');
    }
    if (ok) {
      const d = () => ({ collection: c.id, item: it.id, field: key, type: fd?.type, lang: lang || undefined, empty: value === '' || value == null || undefined });
      if (histKey) log.trace('collection.item.value', __('Champ « {field} » en cours de frappe', { field: fd?.label || key }), d);
      else log.debug('collection.item.value', __('Champ « {field} » modifié', { field: fd?.label || key }), d);
      refreshRow(c, it);
    }
    return ok;
  };
  const controls = decorateItemControls(c, it, c.fields.map(f => itemFieldControl(c, it, f, write(f.key))), () => render());
  const slugIn = h('input', { class: 'input input--sm', type: 'text', value: it.slug, 'data-item-slug': '', spellcheck: 'false', 'aria-label': __('Adresse de l’élément') });
  slugIn.addEventListener('change', () => {
    if (apply(s => setItemSlug(s, c.id, it.id, slugIn.value), {}, { action: 'item-slug', collection: c.id, item: it.id, value: slugIn.value.slice(0, 60) })) {
      log.info('collection.item.slug', __('Adresse de l’élément : {path}', { path: `/${collectionSlug(state.site, c, def())}/${col(c.id)?.items.find(i => i.id === it.id)?.slug}/` }), { collection: c.id, item: it.id, from: it.slug, to: col(c.id)?.items.find(i => i.id === it.id)?.slug });
      render();
    } else slugIn.value = col(c.id).items.find(i => i.id === it.id)?.slug || '';
  });
  const status = h('select', { class: 'control control--sm', 'data-item-status': '', 'aria-label': __('Statut') },
    h('option', { value: 'published', selected: it.status === 'published' }, __('● Publié')),
    h('option', { value: 'draft', selected: it.status === 'draft' }, __('○ Brouillon (jamais publié)')));
  status.addEventListener('change', () => {
    if (!apply(s => setItemStatus(s, c.id, it.id, status.value), {}, { action: 'item-status', collection: c.id, item: it.id })) return;
    if (status.value === 'draft') log.info('collection.item.draft', __('Élément passé en brouillon : retiré des listes et du site publié'), { collection: c.id, item: it.id, slug: it.slug });
    else log.info('collection.item.publish', __('Élément publié : visible dans les listes et sur le site au prochain export'), { collection: c.id, item: it.id, slug: it.slug });
    render();
  });
  const idx = c.items.indexOf(it);
  const btn = (attr, label, title, fn, disabled = false) => h('button', { type: 'button', class: 'icon-btn icon-btn--sm', [attr]: '', title, 'aria-label': title, disabled, onclick: fn }, label);
  const dir = [collectionSlug(state.site, c, def()), it.slug].join('/');
  return h('section', { class: 'item-form', 'data-item-form': it.id },
    h('div', { class: 'item-form__bar' },
      h('div', { class: 'item-form__addr' }, h('span', { class: 'hint' }, '/'), h('span', { class: 'hint' }, `${collectionSlug(state.site, c, def())}/`), slugIn, h('span', { class: 'hint' }, '/')),
      status,
      btn('data-item-up', '↑', __('Monter'), () => { if (apply(s => moveItem(s, c.id, it.id, -1), {}, { action: 'item-move', collection: c.id, item: it.id })) { log.info('collection.item.move', __('Élément monté (position {n})', { n: idx }), { collection: c.id, item: it.id, from: idx, to: idx - 1 }); render(); } }, idx === 0),
      btn('data-item-down', '↓', __('Descendre'), () => { if (apply(s => moveItem(s, c.id, it.id, 1), {}, { action: 'item-move', collection: c.id, item: it.id })) { log.info('collection.item.move', __('Élément descendu (position {n})', { n: idx + 2 }), { collection: c.id, item: it.id, from: idx, to: idx + 1 }); render(); } }, idx === c.items.length - 1),
      btn('data-item-duplicate', '⧉', __('Dupliquer'), () => {
        try {
          const r = duplicateItem(state.site, c.id, it.id);
          commit(r.site, { source: 'collections' });
          log.info('collection.item.duplicate', __('Élément dupliqué (copie en brouillon) : /{slug}/', { slug: col(c.id)?.items.find(i => i.id === r.itemId)?.slug }), { collection: c.id, from: it.id, item: r.itemId, slug: col(c.id)?.items.find(i => i.id === r.itemId)?.slug, status: col(c.id)?.items.find(i => i.id === r.itemId)?.status });
          current.itemId = r.itemId;
          render();
        } catch (e) { log.warn('collection.refused', __('Élément non dupliqué : {error}', { error: e.message }), { action: 'item-duplicate', collection: c.id, item: it.id, error: e }); toast(e.message, 'error'); }
      }),
      btn('data-item-preview', '👁', __('Voir sa page (page de détail)'), () => { log.info('collection.item.preview', __('Page de détail ouverte avec l’élément « {title} »', { title: (itemTitle(state.site, c, it, def()) || it.slug).slice(0, 60) }), { collection: c.id, item: it.id, detail: c.settings.detail !== false }); dialogEl()?.close(); setEditTarget({ kind: 'detail', id: c.id, item: it.id }); }),
      btn('data-item-delete', '✕', __('Supprimer cet élément'), () => {
        if (!confirm(__('Supprimer « {title} » ? (Ctrl+Z pour annuler)', { title: itemTitle(state.site, c, it, def()) || it.slug }))) { log.debug('collection.item.delete-cancel', __('Suppression de l’élément annulée'), { collection: c.id, item: it.id }); return; }
        if (apply(s => removeItem(s, c.id, it.id), {}, { action: 'item-delete', collection: c.id, item: it.id })) { log.info('collection.item.delete', __('Élément « {title} » supprimé (Ctrl+Z pour annuler)', { title: (itemTitle(state.site, c, it, def()) || it.slug).slice(0, 60) }), { collection: c.id, item: it.id, slug: it.slug, items: col(c.id)?.items.length }); current.itemId = null; render(); }
      })),
    it.status === 'draft' ? h('p', { class: 'hint item-form__draft' }, __('Brouillon : n’apparaît ni dans les listes ni sur le site publié.')) : null,
    h('p', { class: 'hint' }, c.settings.detail !== false ? __('Sa page : /{path}/', { path: dir }) : __('Pas de page de détail pour cette collection (voir Réglages).')),
    controls);
}

function simpleInput(f, type, value, write, extra = {}) {
  const input = h('input', { class: 'input', type, 'data-item-field': f.key, value: value ?? '', ...extra, 'aria-label': f.label });
  input.addEventListener('change', () => {
    const ok = write(input.value.trim(), null);
    if (ok) input.removeAttribute('aria-invalid'); else input.setAttribute('aria-invalid', 'true');
  });
  return h('div', { class: 'field', 'data-field-wrap': f.key }, h('span', { class: 'field__label' }, f.label), input);
}

function itemFieldControl(c, it, f, write) {
  const v = it.values[f.key];
  const key = `item:${it.id}`;
  let ctl;
  switch (f.type) {
    case 'text': ctl = fieldControl({ key: f.key, type: 'text', i18n: !!f.i18n, label: f.label }, v, write, key); break;
    case 'richtext': ctl = fieldControl({ key: f.key, type: 'richtext', i18n: true, label: f.label }, typeof v === 'object' ? v : { [def()]: v || '' }, write, key); break;
    case 'image': ctl = fieldControl({ key: f.key, type: 'image', label: f.label }, v, (val, lang) => { if (write(val, lang)) render(); }, key); break;
    case 'select': ctl = fieldControl({ key: f.key, type: 'select', label: f.label, options: [{ value: '', label: '—' }, ...(f.options || []).map(o => ({ value: o.value, label: o.label?.[def()] || o.value }))] }, v || '', write, key); break;
    case 'toggle': ctl = fieldControl({ key: f.key, type: 'toggle', label: f.label }, v, write, key); break;
    case 'number': ctl = simpleInput(f, 'number', v, write); break;
    case 'date': ctl = simpleInput(f, 'date', v, write); break;
    case 'time': ctl = simpleInput(f, 'time', v, write); break;
    case 'email': ctl = simpleInput(f, 'email', v, write, { placeholder: __('nom@exemple.be') }); break;
    case 'url': ctl = simpleInput(f, 'url', v, write, { placeholder: 'https://…', spellcheck: 'false' }); break;
    default: ctl = h('div');
  }
  ctl.setAttribute('data-item-field-wrap', f.key);
  ctl.querySelectorAll('[data-field]').forEach(el => el.setAttribute('data-item-field', f.key));
  return ctl;
}

/* ---------- Champs ---------- */
function fieldsTab(c) {
  const rows = c.fields.map((f, i) => {
    const label = h('input', { class: 'input input--sm', type: 'text', value: f.label, 'data-field-label': f.key, 'aria-label': __('Nom du champ {field}', { field: f.label }) });
    label.addEventListener('change', () => { if (apply(s => updateField(s, c.id, f.key, { label: label.value }), {}, { action: 'field-rename', collection: c.id, field: f.key })) { log.info('collection.field.rename', __('Champ renommé : « {from} » → « {to} »', { from: f.label, to: label.value.trim().slice(0, 40) }), { collection: c.id, field: f.key, type: f.type }); render(); } });
    const i18n = FIELD_TYPES[f.type]?.i18n && f.type !== 'richtext' ? h('label', { class: 'check check--sm' }, (() => {
      const cb = h('input', { type: 'checkbox', 'data-field-i18n': f.key, checked: !!f.i18n });
      cb.addEventListener('change', () => { if (apply(s => updateField(s, c.id, f.key, { i18n: cb.checked }), {}, { action: 'field-i18n', collection: c.id, field: f.key })) { log.info('collection.field.i18n', cb.checked ? __('Champ « {field} » à traduire (une valeur par langue)', { field: f.label }) : __('Champ « {field} » commun à toutes les langues', { field: f.label }), { collection: c.id, field: f.key, i18n: cb.checked }); render(); } });
      return cb;
    })(), __c('field', 'À traduire')) : null;
    let options = null;
    if (f.type === 'select') {
      const ta = h('textarea', { class: 'input', rows: Math.max(2, (f.options || []).length + 1), 'data-field-options': f.key, 'aria-label': __('Choix du champ {field}, un par ligne', { field: f.label }), placeholder: __('Un choix par ligne') });
      ta.value = (f.options || []).map(o => o.label?.[def()] || o.value).join('\n');
      ta.addEventListener('change', () => {
        const lines = ta.value.split('\n').map(x => x.trim()).filter(Boolean);
        const prev = f.options || [];
        const next = lines.map((line, k) => {
          const same = prev.find(o => (o.label?.[def()] || o.value) === line) || null;
          return same ? { ...same, label: { ...same.label, [def()]: line } } : { value: line, label: { [def()]: line }, ...(prev[k] && !lines.includes(prev[k].label?.[def()]) ? {} : {}) };
        });
        if (apply(s => setFieldOptions(s, c.id, f.key, next), {}, { action: 'field-options', collection: c.id, field: f.key })) { log.info('collection.field.options', __('Choix du champ « {field} » : {n}', { field: f.label, n: next.length }), { collection: c.id, field: f.key, before: prev.length, after: next.length, values: next.map(o => o.value).slice(0, 20) }); render(); }
      });
      options = h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Choix (un par ligne ; traductions dans le tableau des traductions)')), ta);
    }
    const isTitle = f.key === c.titleField;
    return h('li', { class: 'field-row', 'data-field-row': f.key },
      h('div', { class: 'field-row__head' },
        label,
        h('span', { class: 'badge' }, FIELD_TYPES[f.type]?.label || f.type),
        isTitle ? h('span', { class: 'badge badge--title', title: __('Sert de titre et d’adresse') }, __('Titre')) : null,
        i18n,
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': __('Monter'), disabled: i === 0, onclick: () => { if (apply(s => moveField(s, c.id, f.key, -1), {}, { action: 'field-move', collection: c.id, field: f.key })) { log.info('collection.field.move', __('Champ « {field} » monté', { field: f.label }), { collection: c.id, field: f.key, from: i, to: i - 1 }); render(); } } }, '↑'),
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': __('Descendre'), disabled: i === c.fields.length - 1, onclick: () => { if (apply(s => moveField(s, c.id, f.key, 1), {}, { action: 'field-move', collection: c.id, field: f.key })) { log.info('collection.field.move', __('Champ « {field} » descendu', { field: f.label }), { collection: c.id, field: f.key, from: i, to: i + 1 }); render(); } } }, '↓'),
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm is-danger', 'data-field-delete': f.key, 'aria-label': __('Supprimer le champ {field}', { field: f.label }), disabled: isTitle, onclick: () => {
          if (!confirm(__('Supprimer le champ « {field} » et ses valeurs dans tous les éléments ? (Ctrl+Z pour annuler)', { field: f.label }))) { log.debug('collection.field.delete-cancel', __('Suppression du champ annulée'), { collection: c.id, field: f.key }); return; }
          if (apply(s => removeField(s, c.id, f.key), {}, { action: 'field-delete', collection: c.id, field: f.key })) { log.info('collection.field.delete', __n(c.items.filter(x => x.values[f.key] !== undefined && x.values[f.key] !== '').length, 'Champ « {field} » supprimé avec ses valeurs ({n} élément concerné)', 'Champ « {field} » supprimé avec ses valeurs ({n} éléments concernés)', { field: f.label }), { collection: c.id, field: f.key, type: f.type, items: c.items.filter(x => x.values[f.key] !== undefined && x.values[f.key] !== '').length }); render(); }
        } }, '✕')),
      options);
  });
  const newLabel = h('input', { class: 'input input--sm', type: 'text', placeholder: __('Nom du nouveau champ (ex. Tarif)'), 'data-field-new-label': '', 'aria-label': __('Nom du nouveau champ') });
  const newType = h('select', { class: 'control control--sm', 'data-field-new-type': '', 'aria-label': __('Type du nouveau champ') }, Object.entries(FIELD_TYPES).map(([k, v]) => h('option', { value: k }, v.label)));
  const add = () => {
    try {
      const r = addField(state.site, c.id, { label: newLabel.value, type: newType.value });
      commit(r.site, { source: 'collections' });
      const nf = col(c.id)?.fields.at(-1);
      log.info('collection.field.add', __('Champ « {field} » ajouté ({type})', { field: newLabel.value.trim().slice(0, 40), type: FIELD_TYPES[newType.value]?.label || newType.value }), { collection: c.id, field: nf?.key, type: newType.value, i18n: !!nf?.i18n, fields: col(c.id)?.fields.length });
      toast(__('Champ « {field} » ajouté. Pour l’afficher : ✎ Carte ou ✎ Page de détail, puis widget « Champ » ou « Relier à un champ ».', { field: newLabel.value.trim() }));
      render();
    } catch (e) { log.warn('collection.refused', __('Champ non ajouté : {error}', { error: e.message }), { action: 'field-add', collection: c.id, type: newType.value, error: e }); toast(e.message, 'error'); }
  };
  newLabel.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  return [
    h('p', { class: 'hint' }, __('Les champs décrivent chaque élément. Ils s’affichent sur le site là où la carte et la page de détail les utilisent.')),
    h('ul', { class: 'field-list' }, rows),
    h('div', { class: 'add-page' }, newLabel, newType, h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-field-add': '', onclick: add }, __('+ Champ')))
  ];
}

/* ---------- Réglages ---------- */
function settingsTab(c) {
  const s = state.site;
  const name = h('input', { class: 'input', type: 'text', value: c.name, 'data-col-name': '', 'aria-label': __('Nom de la collection') });
  name.addEventListener('change', () => { if (apply(x => setCollectionMeta(x, c.id, { name: name.value }), {}, { action: 'rename', collection: c.id })) { log.info('collection.rename', __('Collection renommée : « {from} » → « {to} »', { from: c.name, to: name.value.trim().slice(0, 60) }), { collection: c.id }); render(); } });
  const slugs = s.languages.map(lang => {
    const input = h('input', { class: 'input input--sm', type: 'text', value: lang === s.defaultLanguage ? c.slug : (c.slugs?.[lang] || ''), placeholder: c.slug, 'data-col-slug': lang, spellcheck: 'false', 'aria-label': __('Adresse en {lang}', { lang: LANG_LABELS[lang] }) });
    input.addEventListener('change', () => {
      if (apply(x => setCollectionMeta(x, c.id, { slug: input.value, lang }), {}, { action: 'slug', collection: c.id, lang, value: input.value.slice(0, 60) })) {
        const nc = col(c.id);
        log.info('collection.slug', __('Adresse de la collection ({lang}) : /{slug}/', { lang: lang.toUpperCase(), slug: lang === s.defaultLanguage ? nc?.slug : nc?.slugs?.[lang] || nc?.slug }), { collection: c.id, lang, from: lang === s.defaultLanguage ? c.slug : c.slugs?.[lang] || '', to: lang === s.defaultLanguage ? nc?.slug : nc?.slugs?.[lang] || '' });
      }
      render();
    });
    return h('div', { class: 'i18n__row' }, h('span', { class: 'i18n__lang' }, lang.toUpperCase()), h('span', { class: 'hint' }, lang === s.defaultLanguage ? '/' : `/${lang}/`), input, h('span', { class: 'hint' }, '/…'));
  });
  const toggle = (attr, checked, label, patch, name = label) => {
    const cb = h('input', { type: 'checkbox', [attr]: '', checked });
    cb.addEventListener('change', () => {
      if (!apply(x => setCollectionMeta(x, c.id, patch(cb.checked)), {}, { action: `setting-${attr}`, collection: c.id })) return;
      log.info('collection.setting', cb.checked ? __('{setting} : oui', { setting: name }) : __('{setting} : non', { setting: name }), { collection: c.id, ...patch(cb.checked) });
      if (attr === 'data-col-rss' && cb.checked && !state.site.baseUrl) log.warn('collection.rss-no-url', __('Flux RSS activé sans adresse du site : il ne sera pas créé à l’export (Site → Adresse du site)'), { collection: c.id });
      render();
    });
    return h('label', { class: 'check' }, cb, label);
  };
  const auto = listPageId(s, c);
  const listPage = h('select', { class: 'control', 'data-col-listpage': '', 'aria-label': __('Page de liste') },
    h('option', { value: '' }, auto && !c.settings.listPage ? __('Automatique ({page})', { page: translate(s, s.pages.find(p => p.id === auto)?.title, s.defaultLanguage) }) : __('Automatique (page de même adresse)')),
    s.pages.map(p => h('option', { value: p.id, selected: c.settings.listPage === p.id }, translate(s, p.title, s.defaultLanguage) || __('(sans titre)'))));
  listPage.addEventListener('change', () => { if (apply(x => setCollectionMeta(x, c.id, { listPage: listPage.value }), {}, { action: 'list-page', collection: c.id })) log.info('collection.setting', listPage.value ? __('Page de liste : {page}', { page: translate(s, s.pages.find(p => p.id === listPage.value)?.title, s.defaultLanguage) }) : __('Page de liste : automatique'), { collection: c.id, listPage: listPage.value || null }); });
  const sortable = c.fields.filter(f => ['text', 'date', 'number', 'select', 'time'].includes(f.type));
  const sort = h('select', { class: 'control', 'data-col-sort': '', 'aria-label': __('Ordre par défaut') },
    h('option', { value: '_manual', selected: !c.settings.sort?.field }, __('Ordre manuel (celui de la liste des éléments)')),
    sortable.map(f => h('option', { value: f.key, selected: c.settings.sort?.field === f.key }, __('Par {field}', { field: f.label.toLowerCase() }))));
  sort.addEventListener('change', () => { if (apply(x => setCollectionMeta(x, c.id, { sortField: sort.value }), {}, { action: 'sort', collection: c.id })) log.info('collection.setting', sort.value === '_manual' ? __('Ordre des listes : manuel') : __('Ordre des listes : par {field}', { field: sort.value }), { collection: c.id, sortField: sort.value }); });
  const dir = h('select', { class: 'control', 'data-col-sortdir': '', 'aria-label': __('Sens') },
    h('option', { value: 'asc', selected: c.settings.sort?.dir !== 'desc' }, __('Croissant')), h('option', { value: 'desc', selected: c.settings.sort?.dir === 'desc' }, __('Décroissant')));
  dir.addEventListener('change', () => { if (apply(x => setCollectionMeta(x, c.id, { sortDir: dir.value }), {}, { action: 'sort-dir', collection: c.id })) log.info('collection.setting', dir.value === 'desc' ? __('Sens de l’ordre : décroissant') : __('Sens de l’ordre : croissant'), { collection: c.id, sortDir: dir.value }); });
  return [
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Nom (dans l’éditeur, le flux RSS et l’agenda)')), name),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Adresse des pages d’éléments, par langue')), h('div', { class: 'i18n' }, slugs),
      h('p', { class: 'hint' }, __('Une page du même nom (ex. « agenda ») sert de page de liste : /agenda/ liste, /agenda/fete/ un élément.'))),
    toggle('data-col-detail', c.settings.detail !== false, __('Une page par élément (page de détail)'), on => ({ detail: on }), __('Une page par élément')),
    c.dateField ? toggle('data-col-rss', !!c.settings.rss, __('Flux RSS (actualités pour les agrégateurs et les autres médias ; nécessite l’adresse du site)'), on => ({ rss: on }), __('Flux RSS')) : null,
    c.kind === 'events' ? h('p', { class: 'hint' }, __('Agenda : un fichier .ics par événement (« Ajouter à mon agenda ») et /{slug}/calendar.ics pour s’abonner à tout l’agenda.', { slug: c.slug })) : null,
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Page de liste (lien « retour »)')), listPage),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Ordre par défaut des listes')), h('div', { class: 'add-page' }, sort, dir)),
    h('div', { class: 'field danger-zone' }, h('span', { class: 'field__label' }, __('Supprimer')),
      h('button', { type: 'button', class: 'btn btn--small is-danger', 'data-col-delete': '', onclick: () => {
        if (!confirm(c.items.length === 1 ? __('Supprimer la collection « {name} » et son élément ? Les listes qui l’affichent seront vides. (Ctrl+Z pour annuler)', { name: c.name }) : __('Supprimer la collection « {name} » et ses {n} éléments ? Les listes qui l’affichent seront vides. (Ctrl+Z pour annuler)', { name: c.name, n: c.items.length }))) { log.debug('collection.delete-cancel', __('Suppression de la collection annulée'), { collection: c.id }); return; }
        if (apply(x => deleteCollection(x, c.id), {}, { action: 'delete', collection: c.id })) { log.info('collection.delete', c.items.length === 1 ? __('Collection « {name} » supprimée avec son élément (Ctrl+Z pour annuler)', { name: c.name }) : __('Collection « {name} » supprimée avec ses {n} éléments (Ctrl+Z pour annuler)', { name: c.name, n: c.items.length }), { collection: c.id, kind: c.kind, items: c.items.length }); dialogEl()?.close(); toast(__('Collection « {name} » supprimée.', { name: c.name })); }
      } }, __('Supprimer la collection')))
  ];
}

/* « Aller à » depuis le contrôle avant export ou le tableau des traductions */
export function goToCollection(it) {
  log.debug('collection.goto', __('Aller à un contenu de collection'), { collection: it.collectionId, item: it.itemId, field: it.field, template: it.template });
  if (it.template) { setEditTarget({ kind: it.template, id: it.collectionId }); if (it.nodeId) select(it.nodeId, { scroll: true }); return; }
  openCollection(it.collectionId, { itemId: it.itemId || null, tab: it.itemId ? 'items' : it.field ? 'fields' : 'items' });
}
