/*
 * Canevas : iframe de même origine qui affiche la page rendue (mode canvas).
 * Mise à jour sans rechargement (CSS + en-tête + contenu), survol, sélection, barre d'outils.
 */
import { state, subscribe, select, hover, page, nodeById, toggleMulti, root, setEditTarget } from './store.js';
import { toast } from './dom.js';
import { renderPage } from '../core/render.js';
import { fontSignature } from '../core/fonts.js';
import { fontBase } from './fontfiles.js';
import { nodeLabel } from '../core/editing.js';
import { selectParent, duplicateSelected, deleteSelected } from './actions.js';
import { $ } from './dom.js';
import { log } from './log.js';
import { __, N_ } from '../core/ui-i18n.js';

const EDITOR_CSS = `
[data-node]{cursor:default}
.ph{display:grid;place-items:center;min-height:72px;border:2px dashed #b9b6ae;border-radius:10px;color:#6b6a72;font:500 13px/1.4 system-ui,sans-serif;text-align:center;padding:12px;background:rgba(255,255,255,.4)}
.ph--section{min-height:120px}
.ph--page{margin:40px auto;max-width:640px;min-height:180px}
a,button,input,textarea,select,summary{pointer-events:auto}
[contenteditable="true"]{outline:2px solid #2563eb!important;outline-offset:3px;cursor:text;min-width:1ch}
#atelier-ui{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:600 11px/1 system-ui,sans-serif}
.ab{position:fixed;display:none;box-sizing:border-box;border-radius:2px}
.ab--hover{outline:1px dashed #c2410c;outline-offset:-1px;background:rgba(194,65,12,.04)}
.ab--select{outline:2px solid #c2410c;outline-offset:-2px}
.ab--multi{outline:2px dashed #2563eb;outline-offset:-2px;background:rgba(37,99,235,.05)}
.ab--multi .ab__label{background:#2563eb!important;left:auto;right:-2px}
.ab--section.ab--select{outline-color:#2563eb}.ab--row.ab--select{outline-color:#0d9488}.ab--column.ab--select{outline-color:#7c3aed}
.ab__label{position:absolute;left:-2px;top:-20px;height:20px;padding:0 6px;display:flex;align-items:center;background:#c2410c;color:#fff;border-radius:3px 3px 0 0;white-space:nowrap}
.ab--hover .ab__label{background:#9a3412;opacity:.85}
.ab--section .ab__label{background:#2563eb}.ab--row .ab__label{background:#0d9488}.ab--column .ab__label{background:#7c3aed}
.ab--below .ab__label{top:auto;bottom:-20px;border-radius:0 0 3px 3px}
#selToolbar{position:absolute;right:-2px;top:-26px;display:flex;gap:2px;pointer-events:auto;background:#18181c;border-radius:6px;padding:2px}
.ab--below #selToolbar{top:auto;bottom:-26px}
#selToolbar button{all:unset;cursor:pointer;width:24px;height:22px;display:grid;place-items:center;color:#fff;border-radius:4px;font-size:13px}
#selToolbar button:hover{background:#3a3a42}
#selToolbar [data-act="move"]{cursor:grab}
#atelier-drop{position:fixed;display:none;height:4px;background:#2563eb;border-radius:2px;box-shadow:0 0 0 2px rgba(37,99,235,.25)}
html.atelier-dragging,html.atelier-dragging *{cursor:grabbing!important;user-select:none!important}
main.is-locked{opacity:.45;filter:saturate(.6)}
.is-lang-hidden{opacity:.3!important;outline:2px dashed #8a8a96;outline-offset:-2px}
[data-zone]:not(:has([data-node])){cursor:pointer}
.is-instance{outline:1px dashed rgba(124,58,237,.45);outline-offset:-1px}
.is-bind-empty{opacity:.4;outline:1px dashed #8a8a96;outline-offset:-1px}
[data-bound]{box-shadow:inset 3px 0 0 rgba(13,148,136,.55)}
.cl__item.is-preview{opacity:.5;pointer-events:none}
#atelier-ui [data-ui-action]{pointer-events:auto;cursor:pointer}
.ab--peer{outline:2px solid var(--peer,#e11d48);outline-offset:1px}
.ab--peer .ab__label{background:var(--peer,#e11d48)!important}
.cm-pin{position:fixed;display:none;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:12px 12px 12px 2px;background:#f59e0b;color:#18181c;font:700 12px/24px system-ui,sans-serif;text-align:center;box-shadow:0 2px 8px rgb(0 0 0/.35);border:2px solid #fff}
.cm-pin.is-active{background:#18181c;color:#fff;transform:scale(1.15)}
.w-collection-list .cl{pointer-events:none}
[popover]{display:none}
#atelier-drop.is-into{height:auto;background:rgba(37,99,235,.1);outline:2px dashed #2563eb;box-shadow:none}
`;

const attr = v => String(v).replace(/&/g, '&amp;').replace(/\x22/g, '&quot;').replace(/</g, '&lt;');
const iframe = () => $('#canvas');
const overlays = new Set();
const uiActions = new Set();
/* Calques supplémentaires (présence des autres participants, pastilles de commentaires) */
export function addOverlay(fn) { overlays.add(fn); }
export function onUiAction(fn) { uiActions.add(fn); }
let pendingRemote = false;
let doc = null;
let loaded = false;
let fontsHref = null;
let loadedKey = '';
const scrollMemory = {};
let ui = null;
let raf = 0;
let loadFlow = null;
let lastScale = '';
const failedOverlays = new WeakSet();
const countNodes = d => d?.querySelectorAll('[data-node]').length || 0;

export const canvasDoc = () => doc;
export const canvasWin = () => iframe().contentWindow;

function html() {
  const t = state.editTarget;
  const edit = t ? { kind: t.kind, root: root(), id: t.id, item: t.item } : null;
  try { return renderPage(state.site, page(), state.lang, { canvas: true, edit, fontBase: fontBase() }); }
  catch (e) {
    log.error('canvas.render-fail', __('Rendu de la page impossible : {error} (projet incohérent ou bogue de rendu)', { error: e.message }), { page: state.pageId, lang: state.lang, edit: t?.kind, error: e });
    throw e;
  }
}

/* Pourquoi le canevas est rechargé en entier (pour le journal) */
function reloadReason(opts = {}) {
  /* Raisons en français dans les données du journal ; traduites dans le message */
  if (!loaded && !doc) return N_('premier chargement');
  if (opts.reload) return N_('rechargement demandé');
  if (fontSignature(state.site) !== fontsHref) return N_('polices du site');
  const [p, l, e] = loadedKey.split('|');
  if (p !== state.pageId) return N_('autre page');
  if (l !== state.lang) return N_('autre langue');
  if (e !== JSON.stringify(state.editTarget)) return state.editTarget ? EDIT_REASON[state.editTarget.kind] || `modification ${state.editTarget.kind}` : N_('retour à la page');
  if (!loaded) return N_('chargement précédent non terminé');
  return N_('autre');
}

const EDIT_REASON = { component: N_('modification du composant'), header: N_('modification de l’en-tête'), footer: N_('modification du pied de page'), card: N_('modification de la carte'), detail: N_('modification de la page de détail') };
const DEVICE_LABEL = { desktop: N_('ordinateur'), tablet: N_('tablette'), mobile: N_('mobile') };

function fullLoad(reason = 'premier chargement') {
  if (loadFlow && !loadFlow.done) loadFlow.cancel(__('Chargement remplacé par un nouveau'), { reason });
  const f = log.flow('canvas.load', __('Chargement complet du canevas : {reason}', { reason: __(reason) }), { reason, page: state.pageId, lang: state.lang, device: state.device, edit: state.editTarget?.kind });
  loadFlow = f;
  loaded = false;
  fontsHref = fontSignature(state.site);
  loadedKey = `${state.pageId}|${state.lang}|${JSON.stringify(state.editTarget)}`;
  const t0 = performance.now();
  let markup;
  try { markup = html(); } catch (e) { f.fail(e, { page: state.pageId }, __('Rendu de la page impossible : canevas non mis à jour')); throw e; }
  f.step('render', __('Page rendue'), { ms: Math.round(performance.now() - t0), kb: Math.round(markup.length / 1024) });
  const id = ++loadSeq;
  loadStart = performance.now();
  iframe().srcdoc = markup.replace(/<head[^>]*>/i, m => `${m}<meta name="atelier-load" content="${id}">`);
  watchDom(id);
}

/* Le canevas est prêt dès que sa page est lue (DOM), sans attendre les ressources externes
   (polices, images en ligne) : l'événement « load » de l'iframe les attend toutes. */
let loadSeq = 0;
let readyId = 0;
let loadStart = 0;
const loadIdOf = d => Number(d?.querySelector('meta[name="atelier-load"]')?.content || 0);
function watchDom(id) {
  const t0 = performance.now();
  const tick = () => {
    if (id !== loadSeq || readyId === id) return;
    const d = iframe().contentDocument;
    if (d && loadIdOf(d) === id && d.readyState !== 'loading' && d.body) { onLoad('dom'); return; }
    if (performance.now() - t0 < 30000) setTimeout(tick, 25);
  };
  setTimeout(tick, 0);
}
function externalHosts(d) {
  const hosts = new Set();
  for (const el of d.querySelectorAll('link[rel="stylesheet"][href], img[src], source[srcset]')) {
    const u = el.getAttribute('href') || el.getAttribute('src') || '';
    if (/^https?:/i.test(u)) { try { hosts.add(new URL(u).host); } catch { /* adresse illisible */ } }
  }
  return [...hosts];
}
/* « load » de l'iframe : toutes les ressources sont là (ou en échec) — on le note, et on replace les cadres */
function onFrameLoad() {
  const d = iframe().contentDocument;
  const id = loadIdOf(d);
  if (id && id === readyId) {
    const ms = Math.round(performance.now() - loadStart);
    const hosts = externalHosts(d);
    if (ms > 3000) log.warn('canvas.resources-slow', __('Polices ou images en ligne lentes à charger ({s} s) : l’éditeur était déjà utilisable, l’affichage s’ajuste à leur arrivée', { s: (ms / 1000).toFixed(1) }), { ms, hosts });
    else log.debug('canvas.resources', __('Ressources externes du canevas chargées'), { ms, hosts });
    schedulePosition();
    return;
  }
  onLoad('load');
}

/**
 * opts.source === 'canvas' : la modification vient d'une édition directe dans la page :
 * on ne remplace pas le contenu (le curseur serait perdu), seulement la CSS.
 */
export function refresh(opts = {}) {
  if (!loaded || opts.reload || fontSignature(state.site) !== fontsHref || loadedKey !== `${state.pageId}|${state.lang}|${JSON.stringify(state.editTarget)}`) {
    fullLoad(reloadReason(opts));
    return;
  }
  const t0 = performance.now();
  const next = new DOMParser().parseFromString(html(), 'text/html');
  doc.getElementById('atelier-css').textContent = next.getElementById('atelier-css').textContent;
  const typing = doc.activeElement?.isContentEditable;
  const mode = opts.source === 'remote' && typing ? 'styles (modification distante en attente)' : opts.source === 'canvas' ? 'styles' : 'contenu';
  const modeMsg = { contenu: __('Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles)'), styles: __('Canevas mis à jour : styles seulement') }[mode] || __('Canevas mis à jour : styles seulement (modification distante en attente)');
  /* À chaque frappe ou réglage continu (texte en place, champ de l'inspecteur, sélecteur de couleur : modifications
     regroupées par une clé d'historique) : trace seulement */
  log.add(opts.source === 'canvas' || opts.source === 'inspector' || opts.key ? 'trace' : 'debug', 'canvas.render', modeMsg, { source: opts.source, mode, ms: Math.round(performance.now() - t0) });
  if (opts.source === 'remote' && typing) {
    if (!pendingRemote) log.debug('canvas.remote-deferred', __('Modification d’un autre participant mise en attente : tu écris dans la page'), {});
    pendingRemote = true;
  } else if (opts.source !== 'canvas') {
    pendingRemote = false;
    for (const sel of ['header.site-header', 'main', 'footer.site-footer']) {
      const a = doc.querySelector(sel);
      const b = next.querySelector(sel);
      if (a && b) a.replaceWith(doc.importNode(b, true));
    }
  }
  doc.title = next.title;
  schedulePosition();
}

function onLoad(via = 'load') {
  const d0 = iframe().contentDocument;
  const id = loadIdOf(d0);
  if (id && id === readyId) return;
  if (id && id !== loadSeq) return;
  readyId = id;
  doc = d0;
  const f = loadFlow;
  if (!doc?.body) { f?.fail(new Error(__('document du canevas vide')), {}, __('Canevas chargé sans contenu (iframe bloquée ou page vide)')); return; }
  const style = doc.createElement('style');
  style.id = 'atelier-editor-css';
  style.textContent = EDITOR_CSS;
  doc.head.append(style);
  ui = doc.createElement('div');
  ui.id = 'atelier-ui';
  const tt = { bar: attr(__('Élément sélectionné')), parent: attr(__('Sélectionner le parent (Échap)')), move: attr(__('Glisser pour déplacer')), duplicate: attr(__('Dupliquer (Ctrl+D)')), del: attr(__('Supprimer (Suppr)')) };
  ui.innerHTML = `<div id="atelier-hover" class="ab ab--hover"><span class="ab__label"></span></div>
<div id="atelier-select" class="ab ab--select"><span class="ab__label"></span>
<div id="selToolbar" role="toolbar" aria-label="${tt.bar}">
<button type="button" data-act="parent" title="${tt.parent}">↰</button>
<button type="button" data-act="move" title="${tt.move}">✥</button>
<button type="button" data-act="duplicate" title="${tt.duplicate}">⧉</button>
<button type="button" data-act="delete" title="${tt.del}">✕</button>
</div></div>
<div id="atelier-drop"></div>`;
  doc.body.append(ui);
  bindCanvasEvents();
  loaded = true;
  const y = scrollMemory[`${state.pageId}|${state.lang}`] || 0;
  canvasWin().scrollTo(0, y);
  schedulePosition();
  canvasReadyHandlers.forEach(fn => fn(doc));
  f?.ok(__('Canevas prêt'), { nodes: countNodes(doc), scrollY: y || undefined, scale: Math.round(scale * 100), via });
}

const canvasReadyHandlers = new Set();
export function onCanvasReady(fn) { canvasReadyHandlers.add(fn); }

let keyHandler = null;
export function setCanvasKeyHandler(fn) { keyHandler = fn; }

export function nodeElement(id) {
  if (!doc || !id) return null;
  return doc.querySelector(`[data-node="${CSS.escape(id)}"]`);
}

function bindCanvasEvents() {
  const win = canvasWin();
  doc.addEventListener('mousemove', e => {
    if (state.dragging) return;
    if (e.target.closest?.('#atelier-ui')) return;
    const n = e.target.closest?.('[data-node]');
    hover(n ? n.getAttribute('data-node') : null);
  });
  doc.addEventListener('mouseleave', () => hover(null));
  doc.addEventListener('mousedown', e => { if (e.shiftKey && !e.target.closest?.('[contenteditable="true"]')) e.preventDefault(); });
  doc.addEventListener('focusout', () => { if (pendingRemote) setTimeout(() => { if (pendingRemote && !doc.activeElement?.isContentEditable) { log.debug('canvas.remote-applied', __('Modifications distantes en attente appliquées (fin de la saisie)')); refresh({}); } }, 0); });
  doc.addEventListener('click', e => {
    const uiAct = e.target.closest?.('[data-ui-action]');
    if (uiAct) { e.preventDefault(); e.stopPropagation(); log.debug('canvas.ui-action', __('Bouton du canevas : {action}', { action: uiAct.dataset.uiAction }), { action: uiAct.dataset.uiAction, arg: uiAct.dataset.uiArg }); for (const fn of uiActions) fn(uiAct.dataset.uiAction, uiAct.dataset.uiArg); return; }
    const actBtn = e.target.closest?.('#selToolbar [data-act]');
    if (actBtn) {
      e.preventDefault();
      const act = actBtn.dataset.act;
      log.debug('canvas.toolbar', __('Barre de l’élément sélectionné : {act}', { act }), { act, id: state.selected });
      if (act === 'parent') selectParent();
      if (act === 'duplicate') duplicateSelected();
      if (act === 'delete') deleteSelected();
      return;
    }
    const editing = e.target.closest?.('[contenteditable="true"]');
    if (editing) return;
    /* Barre de mise en forme (et autres calques de l'éditeur) : ne pas vider la sélection */
    if (e.target.closest?.('#atelier-ui')) return;
    e.preventDefault();
    const n = e.target.closest?.('[data-node]');
    if (e.shiftKey && n) { toggleMulti(n.getAttribute('data-node')); return; }
    select(n ? n.getAttribute('data-node') : null);
  }, true);
  doc.addEventListener('submit', e => e.preventDefault(), true);
  doc.addEventListener('dblclick', e => {
    if (e.target.closest?.('[contenteditable="true"], #atelier-ui')) return;
    const listEl = e.target.closest?.('[data-type="collection-list"][data-node]');
    if (listEl && !state.editTarget) {
      const cid = nodeById(listEl.getAttribute('data-node'))?.props?.collection;
      if (cid && state.site.collections?.[cid]) { e.preventDefault(); log.debug('canvas.dblclick', __('Double-clic sur une liste : modification de la carte'), { target: 'card', id: cid }); setEditTarget({ kind: 'card', id: cid }); return; }
    }
    const inst = e.target.closest?.('[data-ref]');
    if (inst && !state.editTarget) { e.preventDefault(); log.debug('canvas.dblclick', __('Double-clic sur une instance : modification du composant'), { target: 'component', id: inst.getAttribute('data-ref') }); setEditTarget({ kind: 'component', id: inst.getAttribute('data-ref') }); return; }
    const zone = e.target.closest?.('[data-zone]');
    if (zone && !zone.querySelector('[data-node]') && !state.editTarget) {
      const z = zone.getAttribute('data-zone');
      if (state.site.layout?.[z]) { log.debug('canvas.dblclick', z === 'header' ? __('Double-clic sur l’en-tête : modification en blocs') : __('Double-clic sur le pied de page : modification en blocs'), { target: z }); setEditTarget({ kind: z }); }
      else {
        log.info('canvas.zone-locked', z === 'header' ? __('En-tête non personnalisé : à activer dans le panneau Site') : __('Pied de page non personnalisé : à activer dans le panneau Site'), { zone: z });
        toast(z === 'header' ? __('Pour modifier l’en-tête bloc par bloc : panneau Site → « Personnaliser ».') : __('Pour modifier le pied de page bloc par bloc : panneau Site → « Personnaliser ».'));
      }
    }
  });
  doc.addEventListener('keydown', e => {
    /* Le journal global ne voit pas les touches tapées dans l'iframe : même filtre que ui.key */
    const mod = e.ctrlKey || e.metaKey || e.altKey;
    if ((mod || ['Escape', 'Delete', 'Backspace', 'Enter', 'F2'].includes(e.key)) && !['Control', 'Meta', 'Alt', 'Shift'].includes(e.key) && !(e.target?.isContentEditable && !mod && e.key !== 'Escape')) {
      const combo = [e.ctrlKey && 'Ctrl', e.metaKey && 'Cmd', e.altKey && 'Alt', e.shiftKey && 'Maj', e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean).join('+');
      log.debug('canvas.key', __('Raccourci dans la page : {key}', { key: combo }), { key: combo, in: e.target?.isContentEditable ? 'texte' : /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') ? 'champ' : 'page', selected: state.selected || undefined });
    } else if (!e.target?.isContentEditable && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) log.trace('canvas.key', __('Flèche dans la page : {key}', { key: e.key }), { key: e.key });
    keyHandler?.(e, true);
  });
  win.addEventListener('scroll', () => {
    scrollMemory[`${state.pageId}|${state.lang}`] = win.scrollY;
    schedulePosition();
  }, { passive: true });
  win.addEventListener('resize', schedulePosition);
  doc.addEventListener('load', schedulePosition, true);
  try { new win.ResizeObserver(schedulePosition).observe(doc.documentElement); } catch (e) { log.warn('canvas.no-resize-observer', __('ResizeObserver indisponible dans le canevas : les cadres se replacent seulement au défilement (ancien navigateur)'), { error: e }); }
}

export function schedulePosition() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(positionBoxes);
}

function place(box, el, node) {
  if (!el || !node) { box.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.style.left = `${r.left}px`;
  box.style.top = `${r.top}px`;
  box.style.width = `${r.width}px`;
  box.style.height = `${r.height}px`;
  box.className = box.className.replace(/\bab--(section|row|column|below)\b/g, '').trim();
  if (['section', 'row', 'column'].includes(node.type)) box.classList.add(`ab--${node.type}`);
  if (r.top < 26) box.classList.add('ab--below');
  box.querySelector('.ab__label').textContent = nodeLabel(node);
}

function positionBoxes() {
  if (!doc || !ui) return;
  const hb = doc.getElementById('atelier-hover');
  const sb = doc.getElementById('atelier-select');
  const selNode = nodeById(state.selected);
  const hovNode = state.hovered !== state.selected ? nodeById(state.hovered) : null;
  place(sb, nodeElement(state.selected), selNode);
  place(hb, state.dragging ? null : nodeElement(state.hovered), hovNode);
  const ids = [...state.multi];
  const boxes = [...ui.querySelectorAll('.ab--multi')];
  while (boxes.length < ids.length) {
    const b = doc.createElement('div');
    b.className = 'ab ab--multi';
    b.innerHTML = '<span class="ab__label"></span>';
    ui.append(b);
    boxes.push(b);
  }
  boxes.forEach((b, i) => {
    if (i >= ids.length) { b.style.display = 'none'; return; }
    place(b, nodeElement(ids[i]), nodeById(ids[i]));
    b.classList.add('ab--multi');
    b.querySelector('.ab__label').textContent = `${i + 1}`;
  });
  for (const fn of overlays) {
    try { fn({ doc, ui, nodeElement }); } catch (e) {
      /* Calque en erreur : ignoré ; signalé une fois (puis en trace, ce calque est redessiné à chaque image) */
      if (failedOverlays.has(fn)) log.trace('canvas.overlay-fail', __('Calque du canevas toujours en erreur'), { error: e });
      else { failedOverlays.add(fn); log.warn('canvas.overlay-fail', __('Calque du canevas en erreur (présence ou commentaires) : {error}', { error: e.message }), { overlay: fn.name || undefined, error: e }); }
    }
  }
}

export function scrollToSelected() {
  const el = nodeElement(state.selected);
  if (!el) { if (state.selected) log.debug('canvas.scroll-missing', __('Élément sélectionné absent du canevas : pas de défilement (masqué ou pas encore rendu)'), { id: state.selected }); return; }
  const r = el.getBoundingClientRect();
  const win = canvasWin();
  if (r.top < 40 || r.bottom > win.innerHeight - 20) {
    const y = win.scrollY + r.top - Math.max(40, (win.innerHeight - r.height) / 2);
    log.debug('canvas.scroll', __('Défilement vers l’élément sélectionné'), { id: state.selected, from: Math.round(win.scrollY), to: Math.round(Math.max(0, y)) });
    win.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
}

/* Largeurs réelles de rendu par appareil ; le canevas est réduit à l'échelle s'il manque de place */
export const DEVICE_WIDTH = { desktop: 1280, tablet: 820, mobile: 390 };
let scale = 1;
export const canvasScale = () => scale;

export function fitFrame() {
  const stage = $('#stage');
  const frame = $('#frame');
  const ifr = iframe();
  const cs = getComputedStyle(stage);
  const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const target = state.device === 'desktop' ? Math.max(DEVICE_WIDTH.desktop, availW) : DEVICE_WIDTH[state.device];
  scale = Math.min(1, availW / target);
  frame.style.width = `${Math.round(target * scale)}px`;
  frame.style.height = `${Math.round(availH)}px`;
  ifr.style.width = `${target}px`;
  ifr.style.height = `${Math.round(availH / scale)}px`;
  ifr.style.transform = scale < 1 ? `scale(${scale})` : '';
  frame.dataset.scale = scale < 1 ? `${Math.round(scale * 100)} %` : '';
  const key = `${state.device}|${Math.round(scale * 100)}`;
  if (key !== lastScale) {
    /* Changement d'appareil : debug ; simple redimensionnement de la fenêtre : trace (très fréquent) */
    const level = lastScale.split('|')[0] !== state.device ? 'debug' : 'trace';
    lastScale = key;
    log.add(level, 'canvas.scale', scale < 1 ? __('Canevas {device} : {width} px, réduit à {scale} %', { device: __(DEVICE_LABEL[state.device] || state.device), width: target, scale: Math.round(scale * 100) }) : __('Canevas {device} : {width} px', { device: __(DEVICE_LABEL[state.device] || state.device), width: target }), { device: state.device, width: target, scale: Math.round(scale * 100), available: Math.round(availW) });
  }
  schedulePosition();
}

export function initCanvas() {
  iframe().addEventListener('load', onFrameLoad);
  new ResizeObserver(fitFrame).observe($('#stage'));
  subscribe((reason, opts) => {
    if (reason === 'doc') refresh(opts);
    else if (reason === 'view') {
      $('#frame').dataset.device = state.device;
      fitFrame();
      refresh({ reload: !!opts.reload });
      schedulePosition();
    } else if (reason === 'selection') {
      schedulePosition();
      if (opts.scroll) setTimeout(scrollToSelected, 30);
    } else if (reason === 'hover') schedulePosition();
  });
  fitFrame();
  fullLoad('premier chargement');
}
