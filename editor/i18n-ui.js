/* Tableau des traductions : tous les textes, une colonne par langue, filtres, relecture, traduction automatique, CSV. */
import { h, $, toast, download } from './dom.js';
import { state, commit, setView, select, setEditTarget } from './store.js';
import { translatableItems, setTranslation, autoTranslate, exportCsv, importCsv, parseCsv, reviewItems, markReviewed } from '../core/i18n.js';
import { LANG_LABELS, findPage, slugify } from '../core/site.js';
import { translate } from '../core/render.js';
import { REGISTRY } from '../core/widgets.js';
import { richToText, sanitizeRich, sanitizeInline } from '../core/sanitize.js';
import { makeEditable } from './richedit.js';
import { translatorStatus, getTranslator } from './translator.js';
import { goToCollection } from './collections-ui.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

const LIMIT = 300;
let filter = 'all';
let query = '';
let shown = LIMIT;
let mtLang = null;
let running = null;

const filled = v => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim() !== '';

function where(it) {
  const s = state.site;
  if (it.collectionId) { const c = s.collections?.[it.collectionId]; const name = c?.name || ''; return it.template ? (it.template === 'card' ? __('Carte « {name} »', { name }) : __('Page de détail « {name} »', { name })) : __('Contenus « {name} »', { name }); }
  if (it.componentId) return __('Composant « {name} »', { name: s.components?.[it.componentId]?.name || '' });
  if (it.zone) return it.zone === 'header' ? __('En-tête') : __('Pied de page');
  if (it.menuItemId) return __('Menu');
  if (it.pageId) return __('Page « {name} »', { name: translate(s, findPage(s, it.pageId)?.title, s.defaultLanguage) || __('Sans titre') });
  return __('Site');
}

function goTo(it, lang) {
  log.debug('i18n.go', __('Aller au texte depuis le tableau'), { key: it.key, lang, kind: it.kind });
  $('#i18nDialog')?.close();
  if (lang && lang !== state.lang) setView({ lang });
  if (it.collectionId) { goToCollection(it); return; }
  if (it.componentId) { setEditTarget({ kind: 'component', id: it.componentId }); if (it.nodeId) select(it.nodeId, { scroll: true }); return; }
  if (it.zone) { setEditTarget({ kind: it.zone }); if (it.nodeId) select(it.nodeId, { scroll: true }); return; }
  if (it.pageId && it.pageId !== state.pageId) setView({ pageId: it.pageId });
  if (it.nodeId) { state.insp = 'content'; select(it.nodeId, { scroll: true }); }
  else document.querySelector(`[data-left="${it.menuItemId || it.field === 'title' || it.field === 'seo' ? 'pages' : 'site'}"]`)?.click();
}

function write(key, lang, value) {
  try { commit(setTranslation(state.site, key, lang, value), { key: `i18n-${key}-${lang}`, source: 'i18n' }); log.debug('i18n.edit', __('Traduction saisie ({lang})', { lang }), { key, lang, len: String(value ?? '').replace(/<[^>]*>/g, '').length, empty: !filled(value) || undefined }); return true; }
  catch (e) { log.warn('i18n.edit-fail', __('Traduction refusée : {error}', { error: e.message }), { key, lang, error: e }); toast(e.message, 'error'); return false; }
}

function cellEditor(it, lang, rowEl) {
  const v = it.values[lang] || '';
  const def = state.site.defaultLanguage;
  const src = richToText(it.values[def] || '');
  const placeholder = lang === def ? '' : src.length > 80 ? `${src.slice(0, 78).replace(/\s+\S*$/, '')}…` : src;
  if (it.kind === 'text') {
    const multi = (it.values[def] || '').length > 70;
    const el = h(multi ? 'textarea' : 'input', { class: 'input i18n-cell', 'data-i18n-cell': '', lang, placeholder, rows: multi ? 3 : null, 'aria-label': `${__(it.label)} (${LANG_LABELS[lang]})` });
    el.value = v;
    el.addEventListener('change', () => { if (write(it.key, lang, el.value)) refreshRow(rowEl, it.key); });
    return el;
  }
  const el = h('div', { class: 'input i18n-cell i18n-cell--rich' + (it.kind === 'inline' ? ' is-inline' : ''), 'data-i18n-cell': '', lang, role: 'textbox', 'aria-multiline': String(it.kind === 'richtext'), 'aria-label': `${__(it.label)} (${LANG_LABELS[lang]})`, 'data-placeholder': placeholder });
  /* Jamais le texte brut du projet dans innerHTML (cycle 25) : assaini selon son type */
  const clean = it.kind === 'inline' ? sanitizeInline(v) : sanitizeRich(v);
  el.innerHTML = clean;
  let start = clean;
  makeEditable(el, {
    inline: it.kind === 'inline',
    onDone: html => { if (html !== start) { start = html; if (write(it.key, lang, html)) refreshRow(rowEl, it.key); } }
  });
  return el;
}

function refreshRow(rowEl, key) {
  const it = translatableItems(state.site).find(x => x.key === key);
  if (!it || !rowEl.isConnected) return;
  rowEl.replaceWith(row(it));
}

function row(it) {
  const s = state.site;
  const def = s.defaultLanguage;
  const review = new Set(reviewItems(s).filter(r => r.key === it.key).map(r => r.lang));
  const tr = h('tr', { 'data-i18n-row': it.key });
  const typeLabel = it.type && REGISTRY[it.type]?.label ? __(REGISTRY[it.type].label) : '';
  tr.append(h('th', { scope: 'row', class: 'i18n-where' },
    h('span', { class: 'i18n-where__place' }, where(it)),
    h('span', {}, [typeLabel, __(it.label)].filter(Boolean).join(' · ')),
    h('button', { type: 'button', class: 'btn btn--small', 'data-i18n-go': '', onclick: () => goTo(it, filled(it.values[state.lang]) ? state.lang : s.languages.find(l => l !== def && !filled(it.values[l]))) }, __('Aller à'))));
  for (const lang of s.languages) {
    const td = h('td', { 'data-lang': lang, class: lang !== def && filled(it.values[def]) && !filled(it.values[lang]) ? 'is-missing' : '' });
    td.append(cellEditor(it, lang, tr));
    if (review.has(lang)) td.append(h('span', { class: 'review', 'data-review': lang }, __('Traduction automatique à relire'),
      h('button', { type: 'button', class: 'btn btn--small', 'data-review-ok': '', onclick: () => { log.debug('i18n.review-ok', __('Traduction automatique validée'), { key: it.key, lang }); commit(markReviewed(state.site, it.key, lang), { source: 'i18n' }); refreshRow(tr, it.key); } }, __('✓ Valider'))));
    tr.append(td);
  }
  return tr;
}

function visibleItems() {
  const s = state.site;
  const def = s.defaultLanguage;
  const review = new Set(reviewItems(s).map(r => r.key));
  const q = query.trim().toLowerCase();
  return translatableItems(s).filter(it => {
    if (!filled(it.values[def]) && !Object.values(it.values).some(filled)) return false;
    if (filter === 'missing' && !s.languages.some(l => l !== def && filled(it.values[def]) && !filled(it.values[l]))) return false;
    if (filter === 'review' && !review.has(it.key)) return false;
    if (q && !Object.values(it.values).some(v => richToText(v || '').toLowerCase().includes(q)) && !where(it).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderTable(d) {
  const s = state.site;
  const items = visibleItems();
  const body = d.querySelector('tbody');
  body.replaceChildren(...items.slice(0, shown).map(row));
  const more = d.querySelector('[data-i18n-more]');
  more.hidden = items.length <= shown;
  more.textContent = __('Afficher plus ({n} restants)', { n: items.length - shown });
  const miss = translatableItems(s).filter(it => filled(it.values[s.defaultLanguage])).reduce((n, it) => n + s.languages.filter(l => l !== s.defaultLanguage && !filled(it.values[l])).length, 0);
  d.querySelector('[data-i18n-count]').textContent = [__n(items.length, '{n} texte', '{n} textes'), __n(miss, '{n} traduction manquante', '{n} traductions manquantes'), __('{n} à relire', { n: reviewItems(s).length })].join(' · ');
  return { visible: items.length, shown: Math.min(items.length, shown), missing: miss, review: reviewItems(s).length };
}

async function updateMt(d) {
  const st = d.querySelector('[data-mt-status]');
  const btn = d.querySelector('[data-mt-run]');
  if (!mtLang) { btn.disabled = true; st.textContent = __('Ce site n’a qu’une langue.'); log.debug('translate.single-lang', __('Une seule langue : pas de traduction automatique'), { lang: state.site.defaultLanguage }); return; }
  btn.disabled = true;
  st.textContent = __('Vérification du traducteur intégré au navigateur…');
  const r = await translatorStatus(state.site.defaultLanguage, mtLang);
  btn.disabled = !r.available || !!running;
  st.textContent = r.label;
}

async function runMt(d) {
  const s = state.site;
  const st = d.querySelector('[data-mt-status]');
  const btn = d.querySelector('[data-mt-run]');
  const cancel = d.querySelector('[data-mt-cancel]');
  running = new AbortController();
  btn.disabled = true;
  cancel.hidden = false;
  const from = s.defaultLanguage;
  const to = mtLang;
  const f = log.flow('translate.batch', __('Traduction automatique {from} → {to}', { from, to }), { from, to });
  try {
    st.textContent = __('Préparation du traducteur…');
    const aborted = new Promise((_, rej) => running.signal.addEventListener('abort', () => rej(new Error(__('arrêté avant le début'))), { once: true }));
    const tr = await Promise.race([getTranslator(from, to, p => { st.textContent = __('Téléchargement du modèle de traduction… {pct} %', { pct: Math.round((p || 0) * 100) }); }), aborted]);
    f.step('ready', __('Traducteur prêt : traduction des textes manquants'));
    let next = 0.25;
    const r = await autoTranslate(state.site, to, t => tr(t), { signal: running.signal, onProgress: p => {
      st.textContent = __('Traduction en {lang} : {done} / {total}…', { lang: LANG_LABELS[to], done: p.done, total: p.total });
      if (p.done === 1 || p.done / p.total >= next) { if (p.done > 1) next += 0.25; f.step('progress', __('{done} / {total} textes', { done: p.done, total: p.total }), { done: p.done, total: p.total, count: p.count, errors: p.errors }); }
    } });
    if (r.count) commit(r.site, { source: 'i18n' });
    if (r.errors) f.warn('errors', __('{n} texte(s) non traduit(s) (voir translate.text-fail)', { n: r.errors }), { errors: r.errors, total: r.total });
    if (r.aborted) f.cancel(__('Arrêté par la personne : {count} / {total} textes traduits', { count: r.count, total: r.total }), { count: r.count, errors: r.errors, total: r.total });
    else f.ok(__('{n} texte(s) traduit(s) {from} → {to}, marqués « à relire »', { n: r.count, from, to }), { count: r.count, errors: r.errors, total: r.total });
    const translated = __n(r.count, '{n} texte traduit', '{n} textes traduits');
    const failed = r.errors ? __n(r.errors, '{n} échec', '{n} échecs') : '';
    st.textContent = r.aborted
      ? (failed ? __('Interrompu : {translated}, {failed}. Relisez-les : ils sont marqués « à relire ».', { translated, failed }) : __('Interrompu : {translated}. Relisez-les : ils sont marqués « à relire ».', { translated }))
      : (failed ? __('Terminé : {translated}, {failed}. Relisez-les : ils sont marqués « à relire ».', { translated, failed }) : __('Terminé : {translated}. Relisez-les : ils sont marqués « à relire ».', { translated }));
    st.setAttribute('data-mt-done', '');
    filter = r.count ? 'review' : filter;
    d.querySelector('[data-i18n-filter]').value = filter;
    renderTable(d);
  } catch (e) {
    if (running?.signal.aborted) f.cancel(__('Arrêté avant le début (préparation du traducteur)'), { error: e.message });
    else f.fail(e, { from, to }, __('Traduction automatique impossible : {error}', { error: e?.message || e }));
    st.textContent = __('Traduction automatique impossible : {error}', { error: e.message });
  } finally {
    running = null;
    cancel.hidden = true;
    btn.disabled = false;
  }
}

export function openTranslations(initialFilter) {
  $('#i18nDialog')?.remove();
  const s = state.site;
  if (initialFilter) filter = initialFilter;
  shown = LIMIT;
  const others = s.languages.filter(l => l !== s.defaultLanguage);
  mtLang = others.includes(mtLang) ? mtLang : others[0] || null;
  const search = h('input', { class: 'input input--sm', type: 'search', value: query, placeholder: __('Chercher un texte…'), 'data-i18n-search': '', 'aria-label': __('Chercher un texte') });
  const filt = h('select', { class: 'control control--sm', 'data-i18n-filter': '', 'aria-label': __('Filtrer') },
    h('option', { value: 'all', selected: filter === 'all' }, __('Tous les textes')),
    h('option', { value: 'missing', selected: filter === 'missing' }, __('À traduire seulement')),
    h('option', { value: 'review', selected: filter === 'review' }, __('Traductions automatiques à relire')));
  const mtSel = h('select', { class: 'control control--sm', 'data-mt-lang': '', 'aria-label': __('Langue cible') }, others.map(l => h('option', { value: l, selected: l === mtLang }, `${s.defaultLanguage.toUpperCase()} → ${l.toUpperCase()}`)));
  const file = h('input', { type: 'file', accept: '.csv,text/csv', 'data-i18n-import': '', 'aria-label': __('Importer un fichier CSV') });
  const d = h('dialog', { class: 'audit i18n', id: 'i18nDialog', 'aria-labelledby': 'i18nTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'i18nTitle' }, __('Traductions')), h('span', { class: 'hint', 'data-i18n-count': '' }), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'i18n-tools' },
      search, filt,
      h('span', { class: 'i18n-mt' }, __('✨ Traduction automatique :'), mtSel,
        h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-mt-run': '', disabled: true, onclick: () => runMt(d) }, __('Traduire les textes manquants')),
        h('button', { type: 'button', class: 'btn btn--small', 'data-mt-cancel': '', hidden: true, onclick: () => running?.abort() }, __('Arrêter'))),
      h('span', { class: 'row-btns' },
        h('button', { type: 'button', class: 'btn btn--small', 'data-i18n-export': '', onclick: () => { const csv = exportCsv(state.site); log.info('i18n.csv-export', __('Tableau exporté en CSV : {n} ligne(s)', { n: csv.split('\r\n').length - 2 }), { rows: csv.split('\r\n').length - 2, languages: state.site.languages, size: csv.length }); download(`${slugify(s.name) || 'site'}-traductions.csv`, csv, 'text/csv;charset=utf-8'); toast(__('Tableau exporté en CSV (s’ouvre dans un tableur). Réimportez-le une fois traduit.')); } }, __('⇩ Export CSV')),
        h('label', { class: 'btn btn--small upload' }, __('⇧ Import CSV'), file))),
    h('p', { class: 'hint i18n-mt-status', 'data-mt-status': '', role: 'status' }),
    h('div', { class: 'i18n-scroll' }, h('table', { class: 'i18n-table' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, __('Texte')), s.languages.map(l => h('th', { scope: 'col' }, l === s.defaultLanguage ? __('{lang} (principale)', { lang: l.toUpperCase() }) : l.toUpperCase())))),
      h('tbody', {})),
      h('button', { type: 'button', class: 'btn btn--small', 'data-i18n-more': '', hidden: true, onclick: () => { shown += LIMIT; const n = renderTable(d); log.debug('i18n.more', __('Afficher plus : {shown} / {visible}', { shown: n.shown, visible: n.visible }), n); } })),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))));
  search.addEventListener('input', () => { query = search.value; shown = LIMIT; const n = renderTable(d); log.trace('i18n.search', __('Recherche dans le tableau'), { len: query.length, visible: n.visible }); });
  filt.addEventListener('change', () => { filter = filt.value; shown = LIMIT; const n = renderTable(d); log.debug('i18n.filter', __('Filtre : {filter} ({n} textes)', { filter, n: n.visible }), { filter, ...n }); });
  mtSel.addEventListener('change', () => { mtLang = mtSel.value; updateMt(d); });
  file.addEventListener('change', async () => {
    const fl = file.files?.[0];
    if (!fl) return;
    const f = log.flow('i18n.csv-import', __('Import CSV : {name}', { name: fl.name }), { name: fl.name, size: fl.size, type: fl.type || undefined });
    try {
      const text = await fl.text();
      const rows = parseCsv(text);
      const head = (rows[0] || []).map(c => c.trim().toLowerCase());
      f.step('parsed', __('{n} ligne(s) lues', { n: Math.max(0, rows.length - 1) }), { rows: Math.max(0, rows.length - 1), columns: head.slice(0, 12) });
      const r = importCsv(state.site, text);
      if (r.unknown) {
        const ki = head.indexOf('key');
        const known = new Set(translatableItems(state.site).map(it => it.key));
        f.warn('unknown-rows', __('{n} ligne(s) ignorée(s) : clé inconnue (texte supprimé depuis l’export ?)', { n: r.unknown }), { unknown: r.unknown, keys: rows.slice(1).map(x => x[ki]).filter(k => !known.has(k)).slice(0, 5) });
      }
      const ignoredCols = head.filter(c => c !== 'key' && c !== 'type' && !state.site.languages.includes(c));
      if (ignoredCols.length) f.warn('unknown-columns', __('Colonne(s) ignorée(s) : {columns} (langue absente du site)', { columns: ignoredCols.join(', ') }), { columns: ignoredCols });
      if (r.changed) commit(r.site, { source: 'i18n' });
      f.ok(__('Import terminé : {changed} texte(s) mis à jour, {unknown} ligne(s) ignorée(s)', { changed: r.changed, unknown: r.unknown }), { changed: r.changed, unknown: r.unknown });
      const changedText = __n(r.changed, '{n} texte mis à jour', '{n} textes mis à jour');
      toast(r.unknown ? __('Import terminé : {changed}, {unknown} (texte supprimé ou inconnu).', { changed: changedText, unknown: __n(r.unknown, '{n} ligne ignorée', '{n} lignes ignorées') }) : __('Import terminé : {changed}.', { changed: changedText }));
      renderTable(d);
    } catch (e) { f.fail(e, { name: fl.name }, __('Import CSV refusé : {error}', { error: e?.message || e })); toast(e.message, 'error'); }
    file.value = '';
  });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  const n = renderTable(d);
  d.showModal();
  log.info('i18n.open', __('Tableau des traductions : {visible} textes, {missing} traduction(s) manquante(s), {review} à relire', { visible: n.visible, missing: n.missing, review: n.review }), { languages: s.languages, main: s.defaultLanguage, filter, query: query ? query.length : undefined, ...n, mtLang });
  updateMt(d);
}
