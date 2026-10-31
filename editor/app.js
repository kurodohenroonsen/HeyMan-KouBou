/* Atelier – démarrage, barre du haut, panneau de gauche, clavier, export. */
import { recoverAtBoot } from './selftest-safe.js';
import { autoStartFromUrl } from './selftest-ui.js';
import { initTooltips } from './tooltip.js';
import { initUiLang } from './ui-lang.js';
import { initPanelResize } from './panel-resize.js';
import { initHelp, openGuide } from './help.js';
import { saveProject } from './storage.js';
import { log, registerContext, APP_VERSION } from './log.js';
import { initLogButton, openLog, setLogSiteInfo } from './log-ui.js';
import { $, $$, h, toast, download } from './dom.js';
import { state, subscribe, load, setView, undo, redo, select, page, commit, root, emit, setEditTarget } from './store.js';
import { componentUsage } from '../core/components.js';
import { loadProject } from './storage.js';
import { demoSite } from './demo.js';
import { createSite, validateSite, missingTranslations, setSiteMeta, slugify, LANG_LABELS, findPage, normalizeSite } from '../core/site.js';
import { sanitizeSiteTexts } from '../core/sanitize-site.js';
import { publishOrigin, githubTarget, hostLabel } from '../core/publish.js';
import { translate, renderSite, renderPage } from '../core/render.js';
import { createZip } from '../core/zip.js';
import { initCanvas, setCanvasKeyHandler, onCanvasReady } from './canvas.js';
import { initInspector } from './inspector.js';
import { initNavigator, mountNavigator, unmountNavigator } from './navigator.js';
import { libraryPanel } from './library.js';
import { selectParent, duplicateSelected, deleteSelected, copySelected, pasteClipboard, moveSelected, cutSelected } from './actions.js';
import { openCommands, openShortcuts, setCommandHooks } from './cmdk.js';
import { neighbor } from '../core/editing.js';
import { initInline, editSelected, isEditing } from './inline.js';
import { initContextMenu } from './ctxmenu.js';
import { openAudit, setExportHandler } from './audit-ui.js';
import { openTranslations } from './i18n-ui.js';
import { openPublish, setZipHandler } from './publish-ui.js';
import { openVersions, initVersions, beforeRisky } from './versions-ui.js';
import { openNewSite } from './new-site-ui.js';
import { initDnd } from './dnd.js';
import { leftPanels } from './panels.js';
import { initCollab, openCollab } from './collab-ui.js';
import { initReview } from './review-ui.js';
import { openAI } from './ai-ui.js';
import { openSeo } from './seo-ui.js';
import { openCollection } from './collections-ui.js';
import { setSmartHooks, openLogoPalette, openReviewSummary } from './smart-ui.js';
import { setAssistantTools } from './assistant-ui.js';
import { toggle as toggleReview } from './review-ui.js';
import { goToComment } from './review-ui.js';
import { itemTitle } from '../core/collections.js';
import './widgets-extra-loader.js';
import { __, __n } from '../core/ui-i18n.js';

/* ---------- Barre du haut ---------- */
function renderBanner() {
  const b = $('#editBanner');
  const t = state.editTarget;
  $('#stage').classList.toggle('is-editing', !!t);
  if (!t) { b.hidden = true; b.replaceChildren(); return; }
  let text;
  if (t.kind === 'component') {
    const c = state.site.components?.[t.id];
    const n = componentUsage(state.site)[t.id] || 0;
    text = [__('Vous modifiez le composant « {name} »', { name: c?.name || '' }), h('small', {}, ' — ' + __n(n, '{n} utilisation suivra', '{n} utilisations suivront'))];
  } else if (t.kind === 'card' || t.kind === 'detail') {
    const c = state.site.collections?.[t.id];
    const pub = c ? c.items.filter(i => i.status === 'published').length : 0;
    text = t.kind === 'card'
      ? [__('Vous modifiez la carte de « {name} »', { name: c?.name || '' }), h('small', {}, ' — ' + __('toutes les listes de cette collection suivront'))]
      : [__('Vous modifiez la page de détail de « {name} »', { name: c?.name || '' }), h('small', {}, ' — ' + __n(pub, '{n} page suivra', '{n} pages suivront'))];
    if (c?.items.length) {
      const sel = h('select', { class: 'control control--sm', 'data-preview-item': '', 'aria-label': __('Élément affiché en aperçu') },
        c.items.map(i => h('option', { value: i.id, selected: (t.item || c.items.find(x => x.status === 'published')?.id || c.items[0].id) === i.id }, i.status === 'draft' ? __('Aperçu : {title} (brouillon)', { title: itemTitle(state.site, c, i, state.site.defaultLanguage) || i.slug }) : __('Aperçu : {title}', { title: itemTitle(state.site, c, i, state.site.defaultLanguage) || i.slug }))));
      sel.addEventListener('change', () => setEditTarget({ ...t, item: sel.value }));
      text.push(sel);
    }
    text.push(h('button', { type: 'button', class: 'btn btn--small', 'data-edit-items': '', onclick: () => openCollection(t.id, { itemId: t.item }) }, __('Éléments')));
  } else text = [t.kind === 'header' ? __('Vous modifiez l’en-tête du site') : __('Vous modifiez le pied de page du site'), h('small', {}, ' — ' + __('toutes les pages'))];
  b.replaceChildren(h('span', { class: 'edit-banner__text' }, ...text), h('button', { type: 'button', class: 'btn btn--small', 'data-edit-done': '', onclick: () => setEditTarget(null) }, __('Terminer')));
  b.hidden = false;
}

function renderTopbar() {
  const s = state.site;
  const name = $('#siteName');
  if (document.activeElement !== name) name.value = s.name;
  $('#pageSelect').replaceChildren(...s.pages.map(p => h('option', { value: p.id, selected: p.id === state.pageId }, translate(s, p.title, s.defaultLanguage) || __('(sans titre)'))));
  $('#langSelect').replaceChildren(...s.languages.map(l => h('option', { value: l, selected: l === state.lang }, `${l.toUpperCase()} · ${LANG_LABELS[l]}`)));
  $('#undoBtn').disabled = !state.past.length;
  $('#redoBtn').disabled = !state.future.length;
  $$('[data-device]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.device === state.device)));
  $('#i18nBtn').hidden = s.languages.length < 2;
  const n = missingTranslations(s).length;
  const badge = $('#missingBtn');
  badge.hidden = n === 0;
  badge.textContent = __('{n} à traduire', { n });
}

/* ---------- Panneau de gauche ---------- */
let renderingLeft = false;
function renderLeft() {
  if (renderingLeft) { queueMicrotask(renderLeft); return; }
  renderingLeft = true;
  try { renderLeftNow(); } finally { renderingLeft = false; }
}
function renderLeftNow() {
  $$('[data-left]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.left === state.left)));
  const body = $('#leftBody');
  unmountNavigator();
  if (state.left === 'widgets') body.replaceChildren(...libraryPanel());
  else if (state.left === 'navigator') { body.replaceChildren(); mountNavigator(body); }
  else body.replaceChildren(...leftPanels(state.left));
}

/* ---------- Clavier ---------- */
function isTyping(e) {
  const t = e.target;
  return t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName || '');
}

export function handleKey(e, fromCanvas = false) {
  if (e.key === 'F1' && fromCanvas) { e.preventDefault(); openGuide(); return; }
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'z' && !e.shiftKey) { if (isTyping(e) && !e.target.isContentEditable) return; e.preventDefault(); undo(); return; }
  if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { if (isTyping(e) && !e.target.isContentEditable) return; e.preventDefault(); redo(); return; }
  if (mod && k === 's') { e.preventDefault(); exportJson(); return; }
  if (mod && k === 'k') { if (e.target?.isContentEditable) return; e.preventDefault(); openCommands(); return; }
  if (mod && e.altKey && k === 'j') { e.preventDefault(); openLog(); return; }
  const inInspectorField = e.target?.closest?.('#inspector') && e.target.tagName === 'INPUT';
  if (mod && k === 'd' && inInspectorField) { e.preventDefault(); e.target.blur(); duplicateSelected(); return; }
  if (isTyping(e)) return;
  if (document.querySelector('dialog[open]')) return;
  if (e.key === '?' && !mod) { e.preventDefault(); openShortcuts(); return; }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (state.multi.size > 1) { log.debug('store.multi', __('Sélection multiple vidée (Échap)'), { ids: [] }); state.multi.clear(); emit('selection', {}); return; }
    selectParent();
    return;
  }
  if (mod && k === 'x') { if (state.selected) { e.preventDefault(); cutSelected(); } return; }
  if (!mod && !e.altKey && !e.shiftKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && (fromCanvas || state.selected)) {
    const dir = { ArrowUp: 'prev', ArrowDown: 'next', ArrowLeft: 'parent', ArrowRight: 'child' }[e.key];
    const next = neighbor(root(), state.selected, dir);
    e.preventDefault();
    if (next) select(next, { scroll: true });
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') { if (state.selected) { e.preventDefault(); deleteSelected(); } return; }
  if (mod && k === 'd') { e.preventDefault(); duplicateSelected(); return; }
  if (mod && k === 'c') { if (state.selected) { e.preventDefault(); copySelected(); } return; }
  if (mod && k === 'v') { if (state.clipboard) { e.preventDefault(); pasteClipboard(); } else log.debug('action.paste-empty', __('Coller : rien n’a été copié dans l’éditeur')); return; }
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveSelected(e.key === 'ArrowUp' ? -1 : 1); return; }
  if (e.key === 'Enter' && !e.defaultPrevented && fromCanvas && state.selected && !isEditing()) { if (editSelected()) e.preventDefault(); }
}

/* ---------- Fichier et export ---------- */
function exportJson() {
  const json = JSON.stringify(state.site, null, 2);
  log.info('project.export-json', __('Projet enregistré en fichier .json'), { kb: Math.round(json.length / 1024), pages: state.site.pages.length });
  download(`${slugify(state.site.name) || 'site'}.atelier.json`, JSON.stringify(state.site, null, 2), 'application/json');
  toast(__('Projet enregistré en fichier .json.'));
}

function exportZip() {
  const f = log.flow('export.zip', __('Export du site en .zip'));
  const check = validateSite(state.site);
  if (!check.ok) { f.fail(new Error(check.errors[0]), { errors: check.errors.slice(0, 5) }, __('Export impossible : le site n’est pas valide')); toast(__('Export impossible : {error}', { error: check.errors[0] }), 'error'); return; }
  let files, zip;
  try {
    const t0 = performance.now();
    ({ files } = renderSite(state.site));
    f.step('render', __('Pages générées'), { files: files.size, ms: Math.round(performance.now() - t0) });
    zip = createZip([...files].map(([name, data]) => ({ name, data })));
  } catch (e) { f.fail(e); toast(__('Export impossible : {error}', { error: e.message }), 'error'); return; }
  download(`${slugify(state.site.name) || 'site'}.zip`, zip, 'application/zip');
  const miss = missingTranslations(state.site).length;
  f.ok(__n(files.size, 'Site exporté : {n} fichier', 'Site exporté : {n} fichiers'), { files: files.size, kb: Math.round(zip.length / 1024), untranslated: miss });
  toast(__n(files.size, 'Site exporté : {n} fichier.', 'Site exporté : {n} fichiers.') + (miss ? ' ' + __n(miss, '{n} texte non traduit s’affiche dans la langue principale.', '{n} textes non traduits s’affichent dans la langue principale.') : ''));
}

function previewTab() {
  log.info('project.preview', __('Aperçu dans un nouvel onglet'), { page: state.pageId, lang: state.lang });
  const html = renderPage(state.site, page(), state.lang, { canvas: true })
    .replace(/ data-node=\x22[^\x22]*\x22 data-type=\x22[^\x22]*\x22/g, '')
    .replace(/<div class=\x22ph[^\x22]*\x22[^>]*>[^<]*<\/div>/g, '');
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function bind() {
  $('#siteName').addEventListener('input', e => commit(setSiteMeta(state.site, { name: e.target.value }), { key: 'site-name', source: 'topbar' }));
  $('#pageSelect').addEventListener('change', e => setView({ pageId: e.target.value }));
  $('#langSelect').addEventListener('change', e => setView({ lang: e.target.value }));
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  $$('[data-device]').forEach(b => b.addEventListener('click', () => setView({ device: b.dataset.device })));
  $$('[data-left]').forEach(b => b.addEventListener('click', () => { state.left = b.dataset.left; renderLeft(); }));
  $('#missingBtn').addEventListener('click', () => openAudit('translations'));
  $('#i18nBtn').addEventListener('click', () => openTranslations());
  $('#exportZipBtn').addEventListener('click', () => openAudit('export'));
  $('#publishBtn').addEventListener('click', () => openPublish());
  $('#collabBtn').addEventListener('click', () => openCollab());
  $('#seoBtn').addEventListener('click', () => openSeo());
  $('#aiBtn').addEventListener('click', () => openAI());
  $('#versionsBtn').addEventListener('click', () => { $('#fileMenu').open = false; openVersions(); });
  setZipHandler(() => openAudit('export'));
  setExportHandler(exportZip);
  $('#exportJsonBtn').addEventListener('click', () => { $('#fileMenu').open = false; exportJson(); });
  $('#previewBtn').addEventListener('click', () => { $('#fileMenu').open = false; previewTab(); });
  $('#importJson').addEventListener('change', async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fl = log.flow('project.import', __('Ouverture d’un projet .json'), { name: f.name, kb: Math.round(f.size / 1024) });
    try {
      let raw;
      try { raw = JSON.parse(await f.text()); } catch (err) { throw new Error(__('ce n’est pas du JSON valide ({error})', { error: err.message })); }
      /* Cycle 25 : tout texte du fichier est assaini avant d'entrer dans le modèle */
      const { site: data, changed } = sanitizeSiteTexts(raw);
      const check = validateSite(normalizeSite(data));
      if (!check.ok) { fl.step('invalid', __('Projet refusé par la validation'), { errors: check.errors.slice(0, 5) }, 'warn'); throw new Error(check.errors[0]); }
      if (changed) fl.step('sanitized', __n(changed, '{n} texte nettoyé à l’ouverture (balise ou attribut hors liste blanche retiré)', '{n} textes nettoyés à l’ouverture (balises ou attributs hors liste blanche retirés)'), { changed }, 'warn');
      const target = publishOrigin(data.publish?.url) || githubTarget(data.publish?.gh);
      const current = publishOrigin(state.site.publish?.url) || githubTarget(state.site.publish?.gh);
      if (target && target !== current) fl.step('publish-url', __('Le projet ouvert publie vers {target} : le jeton n’est repris que si cette adresse a déjà été utilisée sur cet appareil', { target: hostLabel(target) }), { target, current: current || undefined }, 'info');
      await beforeRisky(__('Avant l’ouverture d’un autre projet'));
      load(data, { keepHistory: true });
      fl.ok(__('Projet ouvert'), { pages: data.pages?.length, name: data.name, sanitized: changed || undefined });
      toast(changed ? __('Projet ouvert. {n}', { n: __n(changed, '{n} texte a été nettoyé (voir le journal).', '{n} textes ont été nettoyés (voir le journal).') }) : __('Projet ouvert.'), changed ? 'warn' : undefined);
    } catch (err) { fl.fail(err); toast(__('Fichier illisible : {error}', { error: err.message }), 'error'); }
    e.target.value = '';
    $('#fileMenu').open = false;
  });
  $('#loadDemoBtn').addEventListener('click', async () => { $('#fileMenu').open = false; if (confirm(__('Remplacer le projet actuel par l’exemple ? (une version de sécurité est enregistrée)'))) { await beforeRisky(__('Avant de recharger l’exemple')); load(demoSite(), { keepHistory: true }); log.info('project.demo', __('Exemple rechargé')); } else log.info('project.cancel', __('Remplacement annulé'), { action: 'demo' }); });
  $('#newSiteBtn').addEventListener('click', () => { $('#fileMenu').open = false; openNewSite(); });
  document.addEventListener('keydown', handleKey);
  setCanvasKeyHandler(handleKey);
}

async function boot() {
  const fb = log.flow('boot', __`Démarrage d’Atelier (cycle ${APP_VERSION})`, { url: location.href.split('#')[0], hash: location.hash ? location.hash.slice(0, 6) + '…' : undefined });
  initUiLang({ save: () => saveProject(state.site) });
  initPanelResize();
  initHelp();
  bind();
  initLogButton($('#logBtn'));
  const fresh = new URLSearchParams(location.search).has('fresh');
  const rec = fresh ? null : await recoverAtBoot();
  const saved = fresh ? null : rec ? rec.site : await loadProject();
  const valid = saved ? validateSite(normalizeSite(saved)) : null;
  if (saved && !valid.ok) fb.warn('invalid-save', __('Projet enregistré illisible : l’exemple est chargé à la place (une version de sécurité reste dans « Versions »)'), { errors: valid.errors.slice(0, 5) });
  const site = saved && valid.ok ? saved : demoSite();
  fb.step('project', fresh ? __('Démarrage à neuf (?fresh) : exemple chargé') : saved && valid.ok ? __('Projet enregistré sur cet appareil rechargé') : __('Aucun projet enregistré : exemple chargé'), { source: fresh ? 'fresh' : saved && valid.ok ? 'saved' : 'demo', name: site.name, pages: site.pages.length, languages: site.languages }, 'info');
  state.site = normalizeSite(site);
  state.pageId = site.pages[0].id;
  state.lang = site.defaultLanguage;
  if (rec) rec.finish().then(() => toast(__('L’auto-test avait été interrompu : ton projet a été remis comme avant.'))).catch(e => log.error('selftest.recover-fail', __('Nettoyage après l’auto-test impossible : {error}', { error: e?.message || e }), { error: e }));
  subscribe((reason, opts) => {
    if (reason === 'save') { $('#saveState').textContent = opts.status; return; }
    if (reason === 'doc' || reason === 'view') { renderTopbar(); renderBanner(); }
    if (reason === 'view' || (reason === 'doc' && ['pages', 'site', 'history', 'collections'].includes(opts.source))) if (!['navigator', 'widgets'].includes(state.left)) renderLeft();
    if (reason === 'doc' && opts.source === 'history' && state.left === 'widgets') { /* rien */ }
  });
  onCanvasReady(() => { if (!state.ready) { fb.ok(__('Éditeur prêt'), { page: state.pageId, lang: state.lang }); state.ready = true; autoStartFromUrl(); } state.ready = true; });
  registerContext('projet', () => {
    const s = state.site;
    if (!s) return 'non chargé';
    let nodes = 0;
    const count = n => { nodes++; (n.children || []).forEach(count); };
    s.pages.forEach(p => count(p.root));
    const assets = Object.values(s.assets || {});
    const kb = Math.round(assets.reduce((t, a) => t + (a.dataUrl?.length || 0) * 0.75, 0) / 1024);
    return { nom: s.name, langues: s.languages, pages: s.pages.length, éléments: nodes, collections: Object.keys(s.collections || {}).length, composants: Object.keys(s.components || {}).length, images: `${assets.length} (${kb} Ko)`, publication: s.publish?.mode || 'aucune', adresse: s.baseUrl || '' };
  });
  setLogSiteInfo(() => ({ url: state.site?.publish?.url || (state.site?.baseUrl ? `${state.site.baseUrl}/publish.php` : '') }));
  registerContext('éditeur', () => ({ page: state.pageId, langue: state.lang, appareil: state.device, sélection: state.selected, édition: state.editTarget ? `${state.editTarget.kind}:${state.editTarget.id || ''}` : 'page', relecture: state.readOnly, annuler: state.past.length, rétablir: state.future.length }));
  initCanvas();
  initTooltips();
  initInspector();
  initNavigator();
  initDnd();
  initInline();
  initContextMenu();
  initVersions();
  initCollab();
  initReview();
  setSmartHooks({ openCollection, goToComment });
  setAssistantTools({ seo: () => openSeo(), ai: () => openAI(), publish: () => openPublish(), translations: () => openTranslations(), versions: () => openVersions(), log: () => openLog(), audit: () => openAudit('export'), comments: () => toggleReview(true), palette_logo: () => openLogoPalette(), review_summary: () => openReviewSummary() });
  let roToast = 0;
  subscribe(reason => { if (reason === 'readonly' && Date.now() - roToast > 3000) { roToast = Date.now(); toast(__('Mode relecture : vous pouvez parcourir et commenter (💬), pas modifier.')); } });
  renderTopbar();
  renderLeft();
  $('#saveState').textContent = saved ? __('Enregistré') : '';
  setCommandHooks({ exportJson, preview: previewTab });
  window.__atelier = Object.assign(state, {
    selectId: id => select(id),
    typeOf: id => findPage(state.site, state.pageId) && (function find(n) { if (n.id === id) return n.type; for (const c of n.children || []) { const t = find(c); if (t) return t; } return null; })(page().root)
  });
}
boot();
