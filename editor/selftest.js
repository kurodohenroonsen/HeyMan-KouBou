/*
 * Auto-test en console (cycle 20) : copy(await atelierDebug.selftest())
 * Met le projet de côté (selftest-safe.js), charge l'exemple du MAB, rejoue les cas d'usage du guide sur la vraie
 * interface (clics, saisies, raccourcis), vérifie l'état et le journal attendu, remet le projet comme avant,
 * puis renvoie le rapport (Markdown). Options : { only, skip, ai: 'fake'|'real'|false, publish, full, download }.
 */
import { state, page, select, load } from './store.js';
import { demoSite } from './demo.js';
import { canvasDoc } from './canvas.js';
import { inSession } from './collab-ui.js';
import { isEditing, stopEditing } from './inline.js';
import { log, settings, setLevels, environment, APP_VERSION } from './log.js';
import { LEVELS } from '../core/log.js';
import { SELFTEST_CASES, pickCases, caseResult, selftestSummary, selftestReport, rollbackText } from '../core/selftest.js';
import { __, __n, __c } from '../core/ui-i18n.js';
import { beginSafe, endSafe, selftestActive } from './selftest-safe.js';

let running = false;
let current = null;
let lastReport = '';
/* Dernier résultat structuré (rapport, résumé, retour arrière) : la fenêtre le lit au lieu de relire le texte du rapport */
let lastResult = null;
export const lastSelftestReport = () => lastReport;
export const lastSelftestResult = () => lastResult;
/* atelierDebug.rollback() pendant un test : on arrête après le cas en cours, puis le lanceur remet le projet */
export function stopSelftest() {
  if (!current) return null;
  current.stop = true;
  log.info('selftest.stop', __('Arrêt demandé : le projet sera remis après le cas en cours'));
  return current.done;
}

/* ---------- Pilotage de l'interface ---------- */
/* Chaque cas a sa « génération » : un cas arrêté (délai dépassé, arrêt) échoue à sa prochaine attente au lieu de continuer */
let gen = 0;
const stale = g => { if (g !== gen) throw new Error(__('cas interrompu')); };
const sleep = ms => { const g = gen; return new Promise((r, j) => setTimeout(() => (g === gen ? r() : j(new Error(__('cas interrompu')))), ms)); };
const seq = () => log.stats().seq;
const cdoc = () => canvasDoc();
async function waitFor(fn, { timeout = 5000, what = __('condition') } = {}) {
  const t0 = performance.now();
  const g = gen;
  for (;;) {
    stale(g);
    let v;
    try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error(__('attente trop longue ({s} s) : {what}', { s: Math.round(timeout / 1000), what }));
    await sleep(40);
  }
}
const el = (sel, { root = document, timeout = 4000 } = {}) => waitFor(() => (typeof root === 'function' ? root() : root)?.querySelector(sel), { timeout, what: __('élément {selector}', { selector: sel }) });
const cel = (sel, o = {}) => el(sel, { ...o, root: cdoc });
const sinceCodes = s => log.entries({ since: s, level: 'trace' }).map(e => e.code);
const waitCode = (code, s, timeout = 8000) => waitFor(() => code.split('|').find(c => sinceCodes(s).includes(c)), { timeout, what: __('journal {code}', { code }) });
async function click(sel, o) { const e = typeof sel === 'string' ? await el(sel, o) : sel; e.click(); await sleep(60); return e; }
async function cclick(sel) { const e = typeof sel === 'string' ? await cel(sel) : sel; e.scrollIntoView?.({ block: 'center' }); e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: e.ownerDocument.defaultView })); await sleep(80); return e; }
async function fill(sel, value, { change = true, ...o } = {}) {
  const e = typeof sel === 'string' ? await el(sel, o) : sel;
  e.focus?.();
  e.value = value;
  e.dispatchEvent(new Event('input', { bubbles: true }));
  if (change) e.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(80);
  return e;
}
async function key(target, k, { ctrl = false, shift = false, alt = false } = {}) {
  const t = typeof target === 'function' ? target() : target;
  t.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: ctrl, shiftKey: shift, altKey: alt, bubbles: true, cancelable: true }));
  await sleep(100);
}
async function setFile(sel, file, o) {
  const input = await el(sel, o);
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
async function drawLogo(name = 'logo-auto-test.png', w = 600, h = 300) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#c8181d'); gr.addColorStop(1, '#f6d200');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1b2a6b'; g.fillRect(w * 0.1, h * 0.3, w * 0.35, h * 0.4);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  return new File([blob], name, { type: 'image/png' });
}
const opened = id => document.querySelector(`#${id}[open]`);
function closeAll() {
  try { if (isEditing()) stopEditing(); } catch { /* rien en cours */ }
  document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch { /* déjà fermée */ } });
  const fm = document.querySelector('#fileMenu');
  if (fm) fm.open = false;
  if (state.selected) select(null);
}
const countType = (type, root = page().root) => JSON.stringify(root).split(`"type":"${type}"`).length - 1;
const findNode = (n, id) => (n.id === id ? n : (n.children || []).reduce((a, k) => a || findNode(k, id), null));
const typeOf = id => findNode(page().root, id)?.type;

/* ---------- Les cas d'usage (un par entrée de SELFTEST_CASES) ---------- */
async function prepare() {
  const s = seq();
  load(demoSite());
  state.past = [];
  state.future = [];
  await waitCode('canvas.load.ok', s, 10000);
  await waitCode('storage.save', s, 5000);
  await cel('[data-type="heading"]');
}

const RUNS = {
  async demarrage(x) {
    await prepare();
    x.check(state.site.pages.length >= 2, __('exemple du MAB chargé'), __n(state.site.pages.length, '{n} page', '{n} pages'));
    x.check(!!cdoc()?.querySelector('[data-type="heading"]'), __('page affichée dans le canevas'));
  },

  async journal(x) {
    await click('#logBtn');
    const d = await waitFor(() => opened('logDialog'), { what: __('fenêtre du journal') });
    await sleep(200);
    x.check(d.querySelectorAll('[data-log-list] li').length > 3, __('lignes du journal affichées'), __n(d.querySelectorAll('[data-log-list] li').length, '{n} ligne', '{n} lignes'));
    d.querySelectorAll('details').forEach(s => { s.open = true; });
    const cons = settings.console;
    await fill('#logDialog [data-log-console]', cons === 'info' ? 'debug' : 'info');
    await fill('#logDialog [data-log-console]', cons);
    x.check(settings.console === cons, __('réglage de la console remis'), settings.console);
    d.close();
    await sleep(100);
  },

  async selection(x) {
    const h = await cel('[data-type="heading"]');
    const id = h.getAttribute('data-node');
    await cclick(h);
    x.check(state.selected === id, __('clic : titre sélectionné'));
    await key(() => cdoc().body, 'ArrowDown');
    x.check(state.selected && state.selected !== id, __('flèche ↓ : élément suivant sélectionné'));
    await key(() => cdoc().body, 'Escape');
    x.check(typeOf(state.selected) === 'column', __('Échap : la colonne parente est sélectionnée'), typeOf(state.selected));
  },

  async ajout(x) {
    await click('[data-left="widgets"]');
    await cclick('[data-type="text"]');
    const before = countType('button');
    await click('.lib-item[data-type="button"]');
    await sleep(250);
    x.check(countType('button') === before + 1, __('un bouton de plus sur la page'), __('attendu {expected}, lu {got}', { expected: before + 1, got: countType('button') }));
    x.check(typeOf(state.selected) === 'button', __('le nouveau bouton est sélectionné'));
  },

  async annuler(x) {
    await click('[data-left="widgets"]');
    await cclick('[data-type="text"]');
    await click('.lib-item[data-type="button"]');
    await sleep(250);
    const n = countType('button');
    await click('#undoBtn');
    await sleep(200);
    x.check(countType('button') === n - 1, __('annuler : le bouton ajouté disparaît'), __('attendu {expected}, lu {got}', { expected: n - 1, got: countType('button') }));
    await click('#redoBtn');
    await sleep(200);
    x.check(countType('button') === n, __('rétablir : il revient'), __('attendu {expected}, lu {got}', { expected: n, got: countType('button') }));
  },

  async raccourcis(x) {
    await cclick('[data-type="heading"]');
    const n = countType('heading');
    const body = () => cdoc().body;
    await key(body, 'd', { ctrl: true });
    await sleep(150);
    x.check(countType('heading') === n + 1, __('Ctrl+D : titre dupliqué'), __('attendu {expected}, lu {got}', { expected: n + 1, got: countType('heading') }));
    await key(body, 'c', { ctrl: true });
    await key(body, 'v', { ctrl: true });
    await sleep(150);
    x.check(countType('heading') === n + 2, __('Ctrl+C puis Ctrl+V : titre collé'), __('attendu {expected}, lu {got}', { expected: n + 2, got: countType('heading') }));
    await key(body, 'Delete');
    await sleep(150);
    await key(body, 'Delete');
    await sleep(150);
    x.check(countType('heading') === n, __('Suppr : copies supprimées'), __('attendu {expected}, lu {got}', { expected: n, got: countType('heading') }));
  },

  async texte(x) {
    const t = await cel('[data-type="heading"] [data-edit]');
    const s = seq();
    t.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: t.ownerDocument.defaultView }));
    await waitCode('edit.start', s, 3000);
    t.textContent = 'Titre de l’auto-test';
    t.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
    await sleep(100);
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    try { await waitCode('edit.ok', s, 1500); } catch {
      /* Fenêtre sans le focus (console, Terminal ou autre application au premier plan) : blur() ne produit pas
         d'événement « blur ». On envoie celui que le navigateur aurait envoyé. */
      log.debug('selftest.focus-fallback', __('La fenêtre n’a pas le focus : fin d’édition simulée (événement blur)'), { hasFocus: document.hasFocus() });
      t.dispatchEvent(new FocusEvent('blur'));
    }
    await waitCode('edit.ok', s, 3000);
    x.check(JSON.stringify(page().root).includes('Titre de l’auto-test'), __('le titre modifié est dans la page'));
  },

  async panneaux(x) {
    const { panelWidths, setPanelWidths } = await import('./panel-resize.js');
    const before = panelWidths();
    try {
      const h = await el('.resizer--left');
      h.focus();
      await key(h, 'ArrowRight', { shift: true });
      x.check(panelWidths().left === Math.min(before.left + 64, 640) || panelWidths().left > before.left, __('Maj+→ : panneau de gauche plus large'), `${before.left} → ${panelWidths().left} px`);
      x.check(Number(h.getAttribute('aria-valuenow')) === panelWidths().left, __('la poignée annonce la nouvelle largeur'));
      const r = await el('.resizer--right');
      r.focus();
      await key(r, 'ArrowLeft');
      x.check(panelWidths().right > before.right || before.right >= 640, __('← : panneau de droite plus large'), `${before.right} → ${panelWidths().right} px`);
      h.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await sleep(100);
      x.check(Math.abs(document.querySelector('.panel--left').getBoundingClientRect().width - panelWidths().left) <= 2, __('double-clic : largeur d’origine appliquée'));
    } finally { setPanelWidths(before, { persist: true }); }
  },

  async infobulles(x) {
    const over = (el, type = 'pointerover') => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse' }));
    const tipText = () => { const b = document.querySelector('#atelierTip'); return b && !b.hidden ? b.querySelector('[data-tip-text]')?.textContent : null; };
    const u = await el('#undoBtn');
    over(u);
    const txt = await waitFor(tipText, { timeout: 2000, what: __('infobulle de ↶') });
    /* Texte attendu dans la langue de l'interface (« Annuler » en français) */
    const undoLabel = __c('undo', 'Annuler');
    x.check(txt === undoLabel, __('survol de ↶ : « {label} »', { label: undoLabel }), txt);
    x.check(document.querySelectorAll('#atelierTip kbd').length === 2, __('raccourci affiché en touches'));
    over(await el('#aiBtn'));
    await sleep(60);
    const aiTip = tipText() || '';
    /* L'infobulle de ✨ vient de son propre texte (data-tip ou title), quelle que soit la langue */
    const aiSrc = document.querySelector('#aiBtn')?.dataset.tip || document.querySelector('#aiBtn')?.getAttribute('title') || '';
    x.check(!!aiTip && aiTip !== txt && (aiSrc.includes(aiTip) || aiTip.includes(aiSrc)), __('passage rapide sur ✨ : nouvelle infobulle immédiate'), aiTip);
    x.check(!!document.querySelector('#atelierTip [data-tip-desc]'), __('explication affichée pour ✨'));
    over(await el('#aiBtn'), 'pointerdown');
    await sleep(60);
    x.check(!tipText(), __('clic : infobulle cachée'));
  },

  async commande(x) {
    await key(document.body, 'k', { ctrl: true });
    await el('#cmdkInput');
    /* Nom de la commande dans la langue de l'interface */
    await fill('#cmdkInput', __('Journal de débogage'), { change: false });
    await sleep(150);
    await key(document.querySelector('#cmdkInput'), 'Enter');
    const d = await waitFor(() => opened('logDialog'), { what: __('fenêtre du journal ouverte par Ctrl+K') });
    x.check(!!d, __('Ctrl+K « journal de débogage » ouvre le journal'));
    d.close();
  },

  async style(x) {
    const h = await cel('[data-type="heading"]');
    const id = h.getAttribute('data-node');
    await cclick(h);
    await click('[data-insp="style"]');
    await fill('#inspector [data-style="fontSize"]', '31px');
    await sleep(150);
    x.check(JSON.stringify(findNode(page().root, id)).includes('31px'), __('taille 31px enregistrée sur le titre'));
    await click('#inspector [data-reset="fontSize"]');
    await sleep(150);
    x.check(!JSON.stringify(findNode(page().root, id)).includes('31px'), __('↺ : taille réinitialisée'));
    await click('[data-insp="content"]');
  },

  async appareils(x) {
    await click('[data-device="mobile"]');
    await sleep(250);
    x.check(state.device === 'mobile', __('vue mobile'));
    x.check(document.querySelector('#canvas')?.offsetWidth <= 400, __('canevas à la largeur d’un téléphone'), `${document.querySelector('#canvas')?.offsetWidth} px`);
    await click('[data-device="desktop"]');
    await sleep(250);
    x.check(state.device === 'desktop', __('retour à la vue ordinateur'));
  },

  async pages(x) {
    await click('[data-left="pages"]');
    const n = state.site.pages.length;
    await fill('#newPageTitle', 'Page de l’auto-test', { change: false });
    await click('#addPageBtn');
    const p = await waitFor(() => state.site.pages.find(q => q.title?.fr === 'Page de l’auto-test'), { what: __('page créée') });
    x.check(state.site.pages.length === n + 1 && state.pageId === p.id, __('page créée et ouverte'), p.slug);
    await click(`[data-page-delete="${p.id}"]`);
    await waitFor(() => !state.site.pages.some(q => q.id === p.id), { what: __('page supprimée') });
    x.check(state.site.pages.length === n, __('page supprimée'));
  },

  async image(x) {
    await click('[data-left="site"]');
    const s = seq();
    await setFile('#leftBody [data-field="logo"]', await drawLogo());
    await waitCode('settings.logo', s, 15000);
    const ref = String(state.site.header?.logo || '');
    const a = state.site.assets?.[ref.slice(6)];
    x.check(ref.startsWith('asset:') && !!a, __('logo importé dans le projet'), ref);
    x.check(a?.width === 600 && /webp|jpeg|png/.test(a?.mime || ''), __('image convertie (600 px)'), `${a?.width} px, ${a?.mime}`);
  },

  async collection(x) {
    await click('[data-left="content"]');
    await click('#newCollectionBtn');
    await waitFor(() => opened('collectionNewDialog'), { what: __('fenêtre « nouvelle collection »') });
    await click('#collectionNewDialog [data-kind="events"]');
    await click('#collectionNewDialog [data-col-create]');
    const col = await waitFor(() => Object.values(state.site.collections || {}).find(c => c.kind === 'events'), { what: __('agenda créé') });
    x.check(col.items.length >= 1, __('agenda créé avec des exemples'), __n(col.items.length, '{n} élément', '{n} éléments'));
    closeAll();
    await click('[data-left="content"]');
    await click(`#leftBody [data-col-open="${col.id}"]`);
    await waitFor(() => opened('collectionDialog'), { what: __('fenêtre de la collection') });
    const n = col.items.length;
    await click('#collectionDialog [data-item-add]');
    await waitFor(() => state.site.collections[col.id].items.length === n + 1, { what: __('élément ajouté') });
    await fill('#collectionDialog [data-item-field-wrap="title"] input[lang="fr"]', 'Fête de l’auto-test');
    await fill('#collectionDialog [data-item-field="date"]', '2099-06-21');
    await sleep(200);
    const it = state.site.collections[col.id].items.find(i => i.values?.date === '2099-06-21');
    x.check(!!it, __('événement ajouté avec sa date'), it?.values?.date);
    x.check(JSON.stringify(it?.values?.title || '').includes('Fête de l’auto-test'), __('titre de l’événement enregistré'));
    await click('#collectionDialog [data-col-csv-export]');
    x.check(x.downloads.some(d => /\.csv$/.test(d.name)), __('export CSV proposé au téléchargement'), x.downloads.map(d => d.name).join(', '));
  },

  async versions(x) {
    await click('#versionsBtn');
    const d = await waitFor(() => opened('versionsDialog'), { what: __('fenêtre des versions') });
    await sleep(300);
    await fill('#versionsDialog [data-version-name]', 'Version d’essai de l’auto-test', { change: false });
    await click('#versionSave');
    const row = await waitFor(() => [...d.querySelectorAll('[data-version]')].find(r => r.textContent.includes('Version d’essai de l’auto-test')), { what: __('version listée'), timeout: 6000 });
    x.check(!!row, __('version enregistrée et listée'));
    await click(row.querySelector('[data-version-delete]'));
    await waitFor(() => ![...d.querySelectorAll('[data-version]')].some(r => r.textContent.includes('Version d’essai de l’auto-test')), { what: __('version supprimée'), timeout: 6000 });
    x.check(true, __('version supprimée'));
  },

  async traductions(x) {
    await click('#i18nBtn');
    const d = await waitFor(() => opened('i18nDialog'), { what: __('tableau des traductions') });
    await sleep(200);
    const sel = d.querySelector('[data-i18n-filter]');
    const other = [...sel.options].map(o => o.value).find(v => v !== sel.value);
    await fill(sel, other);
    x.check(d.querySelectorAll('tr, [data-i18n-row]').length >= 1, __('tableau affiché et filtré'), other);
  },

  async seo(x) {
    await click('#seoBtn');
    const d = await waitFor(() => opened('seoDialog'), { what: __('fenêtre du référencement') });
    await sleep(200);
    const sel = d.querySelector('[data-seo-lang]');
    const other = [...sel.options].map(o => o.value).find(v => v !== sel.value);
    await fill(sel, other);
    await sleep(150);
    x.check(!!other && opened('seoDialog'), __('analyse dans une autre langue'), other);
  },

  async 'ia-etat'(x) {
    await click('#aiBtn');
    const d = await waitFor(() => opened('aiDialog'), { what: __('fenêtre ✨ IA locale') });
    await sleep(400);
    x.check(d.textContent.length > 50, __('état des modèles affiché'));
  },

  async 'verifier-exporter'(x) {
    await click('#exportZipBtn');
    const b = await el('#auditExport');
    x.check(!b.disabled, __('la vérification autorise l’export'));
    const s = seq();
    await click(b);
    await waitCode('export.zip.ok|export.zip.fail', s, 15000);
    x.check(x.downloads.some(d => /\.zip$/.test(d.name)), __('fichier .zip produit'), x.downloads.map(d => d.name).join(', '));
  },

  async 'enregistrer-json'(x) {
    await key(document.body, 's', { ctrl: true });
    await sleep(200);
    const d = x.downloads.find(f => /\.atelier\.json$/.test(f.name));
    x.check(!!d, __('fichier .json proposé au téléchargement'));
    const text = d ? await d.text : '';
    let ok = false;
    try { ok = JSON.parse(text).pages.length === state.site.pages.length; } catch { /* illisible */ }
    x.check(ok, __('le .json contient le projet'));
  },

  async publication(x) {
    await click('#publishBtn');
    const d = await waitFor(() => opened('publishDialog'), { what: __('fenêtre de publication') });
    await click('#publishDialog [data-pub-tab="php"]');
    await fill('#publishDialog [data-pub="url"]', x.publishUrl);
    const s = seq();
    await click(d.querySelector('[data-pub-test]'));
    const code = await waitCode('publish.test.ok|publish.test.fail', s, 15000);
    const fail = log.entries({ since: s }).find(e => e.code === 'publish.test.fail');
    x.check(code === 'publish.test.ok', __('publish.php répond'), fail ? `${fail.msg}${fail.data?.hint ? ` — ${fail.data.hint}` : ''}` : '');
    const old = log.entries({ since: s }).find(e => e.code === 'publish.test.old-version');
    x.check(!old, __('publish.php à jour'), old?.msg);
  },

  async palette(x) {
    await click('[data-left="site"]');
    const before = JSON.stringify(state.site.theme?.palette);
    await click('#leftBody [data-palette-logo]');
    const d = await waitFor(() => opened('paletteDialog'), { what: __('fenêtre de la palette') });
    let apply = await waitFor(() => d.querySelector('[data-palette-apply]:not([hidden])'), { timeout: 2500, what: __('proposition') }).catch(() => null);
    if (!apply) { await setFile('#paletteDialog [data-palette-file]', await drawLogo('logo-palette.png')); apply = await waitFor(() => d.querySelector('[data-palette-apply]:not([hidden])'), { timeout: 8000, what: __('proposition de palette') }); }
    x.check(d.querySelectorAll('[data-palette-proposal]').length >= 4, __('couleurs proposées'), `${d.querySelectorAll('[data-palette-proposal]').length}`);
    x.check(d.querySelectorAll('.pair.is-bad').length === 0, __('contrastes AA respectés'));
    const s = seq();
    await click(apply);
    await waitCode('smart.palette.ok', s);
    x.check(JSON.stringify(state.site.theme?.palette) !== before, __('palette appliquée'));
    closeAll();
    await click('#undoBtn');
    await sleep(200);
    x.check(JSON.stringify(state.site.theme?.palette) === before, __('annuler : ancienne palette revenue'));
  },

  async 'contenus-texte'(x) {
    await click('[data-left="content"]');
    await click('#newCollectionBtn');
    await waitFor(() => opened('collectionNewDialog'), { what: __('fenêtre « nouvelle collection »') });
    await click('#collectionNewDialog [data-kind="members"]');
    await click('#collectionNewDialog [data-col-create]');
    const col = await waitFor(() => Object.values(state.site.collections || {}).find(c => c.kind === 'members'), { what: __('collection de membres créée') });
    closeAll();
    await click('[data-left="content"]');
    await click(`#leftBody [data-col-open="${col.id}"]`);
    await waitFor(() => opened('collectionDialog'), { what: __('fenêtre de la collection') });
    const n = state.site.collections[col.id].items.length;
    await click('#collectionDialog [data-smart-paste]');
    const d = await waitFor(() => opened('smartDialog'), { what: __('fenêtre « depuis un texte »') });
    await fill('#smartDialog [data-smart-text]', 'Bonjour, voici les nouveaux membres du MAB : Radio Panik (radio associative, Bruxelles, radiopanik.org), Zin TV (télévision participative, Bruxelles, zintv.org) et Médor (magazine d’enquête, Namur, medor.coop).');
    await click('#smartDialog [data-smart-read]');
    await waitFor(() => d.querySelector('[data-smart-item]'), { timeout: 50000, what: __('fiches proposées par l’IA') });
    const k = d.querySelectorAll('[data-smart-item]').length;
    x.check(k >= 2 && k <= 4, __('fiches proposées'), __('{n} (3 attendues)', { n: k }));
    const s = seq();
    await click('#smartDialog [data-smart-create]');
    await waitCode('smart.paste.ok', s);
    x.check(state.site.collections[col.id].items.length === n + k, __('fiches créées (brouillons)'), `${state.site.collections[col.id].items.length - n}`);
  },

  async demander(x) {
    const p0 = page().id;
    const n = countType('accordion');
    await key(document.body, 'k', { ctrl: true });
    await fill('#cmdkInput', __('Demander à Atelier'), { change: false });
    await sleep(150);
    await key(document.querySelector('#cmdkInput'), 'Enter');
    await waitFor(() => opened('askDialog'), { what: __('fenêtre « Demander à Atelier »') });
    await fill('#askDialog [data-ask-request]', 'ajoute une FAQ de 3 questions sur l’adhésion au MAB');
    await click('#askDialog [data-ask-plan]');
    await waitFor(() => document.querySelector('#askDialog [data-ask-step]'), { timeout: 50000, what: __('plan proposé par l’IA') });
    const s = seq();
    await click('#askDialog [data-ask-apply]');
    await waitCode('assist.apply.ok|assist.apply.fail', s, 10000);
    x.check(page().id === p0 && countType('accordion') === n + 1, __('FAQ ajoutée à la page'), __('{n} ajoutée(s)', { n: countType('accordion') - n }));
    closeAll();
    await click('#undoBtn');
    await sleep(200);
    x.check(countType('accordion') === n, __('Ctrl+Z : la demande est annulée en une fois'));
  }
};

/* ---------- Environnement de test : confirmations, téléchargements, IA ---------- */
function patchEnv(downloads) {
  const orig = { confirm: window.confirm, prompt: window.prompt, open: window.open, click: HTMLAnchorElement.prototype.click };
  window.confirm = () => true;
  window.prompt = (m, d) => d ?? 'Auto-test';
  window.open = () => null;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) {
      const href = this.href;
      downloads.push({ name: this.download, text: fetch(href).then(r => r.text()).catch(() => '') });
      log.debug('selftest.download', __('Téléchargement intercepté : {name}', { name: this.download }), { name: this.download });
      return;
    }
    return orig.click.call(this);
  };
  return () => { window.confirm = orig.confirm; window.prompt = orig.prompt; window.open = orig.open; HTMLAnchorElement.prototype.click = orig.click; };
}

async function setupAI(mode) {
  if (mode === false || mode === 'off') return { ok: false, reason: __('IA désactivée (option ai: false)') };
  if (mode === 'real') {
    delete window.__atelierAI;
    if (!('LanguageModel' in globalThis)) return { ok: false, reason: __('Gemini Nano absent de ce navigateur (API Prompt indisponible)') };
    try { const a = await globalThis.LanguageModel.availability(); if (a !== 'available') return { ok: false, reason: a === 'downloading' ? __('Gemini Nano en cours de téléchargement : attends la fin (chrome://on-device-internals), puis relance') : a === 'downloadable' ? __('Gemini Nano à télécharger : ✨ IA locale → Télécharger, puis relance') : __('Gemini Nano « {state} » sur ce navigateur (voir ✨ IA locale)', { state: a }) }; } catch (e) { return { ok: false, reason: `Gemini Nano : ${e.message}` }; }
    return { ok: true };
  }
  const { goodNano } = await import('../core/fake-nano.js');
  window.__atelierAI = goodNano();
  return { ok: true };
}

/* ---------- Lancement ---------- */
export async function selftest(opts = {}) {
  const options = { ai: 'fake', publish: true, full: false, download: false, ...opts };
  if (running || selftestActive()) { log.warn('selftest.refused', __('Un auto-test est déjà en cours')); return __('Un auto-test est déjà en cours.'); }
  if (inSession()) { log.warn('selftest.refused', __('Auto-test refusé pendant une session de collaboration (les modifications partiraient chez les autres)'), { reason: 'collab' }); return __('Auto-test refusé : quitte d’abord la session de collaboration (👥).'); }
  if (state.readOnly) { log.warn('selftest.refused', __('Auto-test refusé en mode relecture'), { reason: 'readonly' }); return __('Auto-test refusé en mode relecture.'); }
  const cases = pickCases(SELFTEST_CASES, options);
  if (!cases.length) { log.warn('selftest.refused', __('Aucun cas ne correspond à la sélection'), { only: options.only, skip: options.skip }); return __('Aucun cas ne correspond. Identifiants : {ids}.', { ids: SELFTEST_CASES.map(c => c.id).join(', ') }); }
  running = true;
  let finish;
  current = { stop: false, done: new Promise(r => { finish = r; }) };
  const started = new Date().toISOString();
  const t0 = performance.now();
  const s0 = seq();
  const f = log.flow('selftest.run', __n(cases.length, 'Auto-test : {n} cas d’usage', 'Auto-test : {n} cas d’usage'), { cases: cases.map(c => c.id), ai: options.ai, publish: options.publish });
  const originalPublish = state.site?.publish || {};
  let snap = null;
  let unpatch = () => {};
  const results = [];
  let rollback = null;
  try {
    closeAll();
    snap = await beginSafe();
    if (LEVELS[settings.keep] > LEVELS.debug) setLevels({ keep: 'debug' });
    const downloads = [];
    unpatch = patchEnv(downloads);
    const ai = await setupAI(options.ai);
    const publishUrl = options.publish && originalPublish.mode !== 'github' ? originalPublish.url || '' : '';
    if (!cases.some(c => c.id === 'demarrage')) await prepare();
    for (const c of cases) {
      const run = RUNS[c.id];
      let skipped = null;
      if (current.stop) skipped = __('arrêté : retour arrière demandé');
      else if (c.needs.includes('collab')) skipped = __('demande deux appareils : voir le chapitre 10 du guide');
      else if (c.needs.includes('ai') && !ai.ok) skipped = ai.reason;
      else if (c.needs.includes('publish') && !publishUrl) skipped = options.publish ? __('aucune adresse de publish.php dans ton projet') : __('option publish: false');
      else if (!run) skipped = __('cas pas encore automatisé');
      if (skipped) { const r = caseResult(c, { skipped }); results.push(r); log.info('selftest.case', __('– {title} : ignoré ({reason})', { title: c.title, reason: skipped }), { id: c.id, status: 'skipped', reason: skipped }); continue; }
      const s = seq();
      const checks = [];
      const x = { check: (ok, label, detail) => checks.push({ ok: !!ok, label, detail: ok ? undefined : detail }), downloads, publishUrl };
      const c0 = performance.now();
      let error = null;
      log.debug('selftest.case-start', __('Cas : {title}', { title: c.title }), { id: c.id, chapter: c.chapter });
      try {
        await Promise.race([run(x), sleep(c.timeout).then(() => { throw new Error(__('délai dépassé ({s} s)', { s: c.timeout / 1000 })); })]);
        await sleep(150);
      } catch (e) { error = e; }
      gen++;
      const ms = performance.now() - c0;
      const r = caseResult(c, { checks, entries: log.entries({ since: s, level: 'debug' }), error, ms });
      results.push(r);
      for (const k of r.failed) log.warn('selftest.check-fail', `${c.title} : ✗ ${k.label}${k.detail ? ` — ${k.detail}` : ''}`, { id: c.id });
      if (r.missing.length) log.warn('selftest.missing', __('{title} : journal attendu manquant {codes}', { title: c.title, codes: r.missing.join(', ') }), { id: c.id, missing: r.missing });
      if (r.errors.length) log.warn('selftest.unexpected', __('{title} : erreur inattendue {codes}', { title: c.title, codes: r.errors.map(e => e.code).join(', ') }), { id: c.id, errors: r.errors.map(e => e.code) });
      log[r.status === 'ok' ? 'info' : 'warn']('selftest.case', `${r.status === 'ok' ? '✓' : r.status === 'error' ? '⚠' : '✗'} ${c.title}${r.cause ? ` — ${r.cause}` : ''}`, { id: c.id, status: r.status, ms: r.ms });
      closeAll();
      await sleep(80);
    }
  } catch (e) {
    f.step('aborted', __('Auto-test interrompu : {message}', { message: e?.message || e }), { error: e }, 'error');
  } finally {
    gen++;
    unpatch();
    closeAll();
    rollback = snap ? await endSafe(snap) : { ok: false, same: false, problems: [__('projet non mis de côté : rien n’a été modifié')] };
    running = false;
    finish(rollback);
    current = null;
  }
  const summary = selftestSummary(results);
  const ms = performance.now() - t0;
  const all = log.entries({ since: s0, level: 'debug' });
  const issues = all.filter(e => (e.level === 'warn' || e.level === 'error') && !/^selftest\.(case|check-fail|missing|unexpected)$/.test(e.code));
  /* Le faux modèle a rempli l'état de l'IA : on revérifie le vrai navigateur pour l'environnement du rapport */
  if (options.ai !== 'real' && options.ai !== false) { try { const { aiStatus } = await import('./ai.js'); await aiStatus(state.lang || 'fr', { quiet: true }); } catch (e) { log.debug('selftest.ai-recheck-fail', __('État réel de l’IA non revérifié : {message}', { message: e?.message || e }), { error: e }); } }
  const env = await environment();
  lastReport = selftestReport({ results, summary, rollback, env, options, started, ms, issues, full: options.full ? all : [] });
  lastResult = { report: lastReport, summary, rollback };
  const line = __('Auto-test terminé : {ok} / {played} réussis, note {score} / 100 — {rollback}', { ok: summary.ok, played: summary.total - summary.skipped, score: summary.score, rollback: rollbackText(rollback) });
  if (rollback?.ok) f.ok(line, { ...summary, ms: Math.round(ms) });
  else f.fail(new Error(__('retour arrière incomplet')), { ...summary, problems: rollback?.problems }, line);
  try { await navigator.clipboard.writeText(lastReport); log.debug('selftest.copy', __('Rapport copié dans le presse-papiers'), { chars: lastReport.length }); } catch (e) { log.debug('selftest.copy-fail', __('Presse-papiers refusé : utilise copy(await atelierDebug.selftest()) ou atelierDebug.report()'), { error: e?.name }); }
  if (options.download) {
    const blob = new Blob([JSON.stringify({ app: APP_VERSION, started, summary, rollback, results, report: lastReport, log: all }, null, 1)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `atelier-auto-test-${started.slice(0, 16).replace(/[:T]/g, '-')}.json` });
    document.body.append(a); a.click(); a.remove();
  }
  return lastReport;
}
