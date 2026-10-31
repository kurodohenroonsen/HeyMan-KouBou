/*
 * Pilote de la démonstration (cycle 26) : exécute un script déclaratif (core/demo-kumakogen.js) dans l'éditeur
 * lui-même, en passant par les vrais boutons — curseur animé qui se déplace vers la cible, surbrillance, clic
 * réel, saisie dans les champs de l'inspecteur, import d'illustrations dessinées (demo-draw.js), explication
 * à chaque étape (say). Vitesse lente / normale / rapide, pause, étape suivante (avance rapide), arrêt.
 * Les primitives d'attente et de clic sont celles de l'auto-test (editor/ui-drive.js).
 */
import { $ } from './dom.js';
import { state, root as editRoot } from './store.js';
import { walk } from '../core/tree.js';
import { sanitizeRich } from '../core/sanitize.js';
import { canvasScale } from './canvas.js';
import { createUi } from './ui-drive.js';
import { drawIllustration } from './demo-draw.js';
import { uiLang } from '../core/ui-i18n.js';

export class DemoStopped extends Error { constructor() { super('démonstration arrêtée'); this.name = 'DemoStopped'; } }

export const SPEEDS = { slow: 1.7, normal: 1, fast: 0 };
/* Durées à la vitesse normale (ms) */
const T = { move: 380, click: 220, fill: 160, char: 28, sayBase: 1300, sayChar: 24, image: 300 };

const pause = ms => new Promise(r => setTimeout(r, ms));

export function createDemoDriver({ speed = 'normal', onSay = () => {} } = {}) {
  let factor = SPEEDS[speed] ?? 1;
  let stopped = false;
  let paused = false;
  let resume = null;
  let ff = false;
  const origPrompt = window.prompt;
  let promptAnswer = null;

  /* ---------- Temps : pause, arrêt, avance rapide ---------- */
  async function gate() {
    if (stopped) throw new DemoStopped();
    while (paused) { await new Promise(r => { resume = r; }); if (stopped) throw new DemoStopped(); }
  }
  /* real : attente nécessaire (élément, journal), jamais raccourcie ; sinon attente cosmétique, à la vitesse choisie */
  async function sleep(ms, { real = false } = {}) {
    let left = real ? ms : ms * factor;
    await gate();
    while (left > 0) {
      if (!real && ff) return;
      const slice = Math.min(50, left);
      await pause(slice);
      left -= slice;
      await gate();
    }
  }
  const wait = ms => sleep(ms);
  const ui = createUi({ sleep: ms => sleep(ms, { real: true }) });

  /* ---------- Curseur et surbrillance ---------- */
  function cursor() {
    let c = $('#demoCursor');
    if (!c) {
      c = document.createElement('div');
      c.id = 'demoCursor';
      c.className = 'demo-cursor';
      c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 3l14 8.5-6.3 1.6L9.6 19z" fill="#18181c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      c.style.left = `${innerWidth / 2}px`;
      c.style.top = `${innerHeight / 2}px`;
      document.body.append(c);
    }
    return c;
  }
  const inCanvas = el => el.ownerDocument !== document;
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    if (!inCanvas(el)) return { x: r.left, y: r.top, w: r.width, h: r.height };
    const f = $('#canvas').getBoundingClientRect();
    const s = canvasScale() || 1;
    return { x: f.left + r.left * s, y: f.top + r.top * s, w: r.width * s, h: r.height * s };
  }
  async function moveCursor(x, y) {
    const c = cursor();
    c.style.transitionDuration = factor && !ff ? `${Math.round(T.move * factor)}ms` : '0ms';
    c.style.left = `${Math.round(x)}px`;
    c.style.top = `${Math.round(y)}px`;
    await wait(T.move);
  }
  async function moveTo(el) {
    el.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    await wait(60);
    const r = rectOf(el);
    await moveCursor(r.x + Math.min(r.w / 2, 60), r.y + r.h / 2);
    highlight(el);
  }
  function highlight(el) {
    let ring = $('#demoRing');
    if (!ring) { ring = document.createElement('div'); ring.id = 'demoRing'; ring.className = 'demo-ring'; ring.setAttribute('aria-hidden', 'true'); document.body.append(ring); }
    const r = rectOf(el);
    Object.assign(ring.style, { left: `${r.x - 4}px`, top: `${r.y - 4}px`, width: `${r.w + 8}px`, height: `${r.h + 8}px`, display: 'block' });
    ring.classList.remove('is-on');
    void ring.offsetWidth;
    ring.classList.add('is-on');
  }
  const press = el => { const c = cursor(); c.classList.remove('is-press'); void c.offsetWidth; c.classList.add('is-press'); };

  /* ---------- Trouver ---------- */
  async function find(sel, { canvas = false, timeout = 6000 } = {}) {
    if (typeof sel !== 'string') return sel;
    const el = canvas ? await ui.cel(sel, { timeout }) : await ui.el(sel, { timeout });
    if (!canvas) for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) if (!d.open && !d.classList.contains('menu')) d.open = true;
    return el;
  }

  /* ---------- Actions élémentaires ---------- */
  async function click(sel, opts = {}) {
    const el = await find(sel, opts);
    await moveTo(el);
    press(el);
    if (inCanvas(el)) await ui.cclick(el); else await ui.click(el);
    await wait(T.click);
    return el;
  }
  async function fill(sel, value, opts = {}) {
    const el = await find(sel, opts);
    await moveTo(el);
    await ui.fill(el, value, { change: opts.change !== false });
    await wait(T.fill);
    return el;
  }
  async function type(sel, text, opts = {}) {
    const el = await find(sel, opts);
    await moveTo(el);
    if (!factor || ff) return ui.fill(el, text);
    el.focus?.();
    el.value = '';
    for (const ch of String(text)) {
      el.value += ch;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(T.char);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(T.fill);
    return el;
  }
  async function select(sel, value, opts = {}) {
    const el = await find(sel, opts);
    await moveTo(el);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(T.fill);
    return el;
  }
  async function check(sel, on = true, opts = {}) {
    const el = await find(sel, opts);
    await moveTo(el);
    if (!!el.checked !== !!on) { press(el); el.click(); }
    await wait(T.fill);
    return el;
  }
  async function setRich(area, html) {
    await moveTo(area);
    area.innerHTML = sanitizeRich(html);
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.dispatchEvent(new FocusEvent('blur'));
    await wait(T.fill);
  }
  /* Écrit dans le contrôle d'un bloc de champ de l'inspecteur (texte par langue, texte riche, liste, case, nombre, url) */
  async function setIn(wrap, value, { lang = null, typed = false } = {}) {
    if (lang) {
      const area = wrap.querySelector(`.rich-input[lang="${lang}"]`);
      if (area) return setRich(area, value);
      const input = wrap.querySelector(`input[lang="${lang}"], textarea[lang="${lang}"]`);
      if (!input) throw new Error(`champ ${wrap.dataset.fieldWrap} sans ligne ${lang}`);
      return typed ? type(input, value) : fill(input, value);
    }
    const sel = wrap.querySelector('select');
    if (sel) return select(sel, value);
    const cb = wrap.querySelector('input[type="checkbox"]');
    if (cb) return check(cb, value);
    const area = wrap.querySelector('.rich-input');
    if (area) return setRich(area, value);
    const input = wrap.querySelector('input:not([type="file"]), textarea');
    if (!input) throw new Error(`champ ${wrap.dataset.fieldWrap} sans contrôle`);
    return typed ? type(input, value) : fill(input, value);
  }
  async function setField(key, value, opts = {}) {
    const wrap = await find(`#inspector [data-field-wrap="${key}"]`);
    return setIn(wrap, value, opts);
  }
  async function listItem(listKey, index) {
    const wrap = await find(`#inspector [data-field-wrap="${listKey}"]`);
    const item = wrap.querySelectorAll('.list-item')[index];
    if (!item) throw new Error(`élément ${index + 1} de ${listKey} introuvable`);
    if (!item.open) item.open = true;
    return item;
  }
  async function setListField(listKey, index, subKey, value, opts = {}) {
    const item = await listItem(listKey, index);
    const wrap = item.querySelector(`[data-field-wrap="${subKey}"]`);
    if (!wrap) throw new Error(`${listKey}[${index}].${subKey} introuvable`);
    return setIn(wrap, value, opts);
  }
  async function addListItem(listKey) {
    const s = ui.seq();
    await click(`#inspector [data-list-add="${listKey}"]`);
    await ui.waitCode('inspector.list', s, 4000);
  }
  async function removeListItem(listKey, index) {
    const item = await listItem(listKey, index);
    const s = ui.seq();
    await click(item.querySelector('.list-item__tools button:last-child'));
    await ui.waitCode('inspector.list', s, 4000);
  }

  /* ---------- Actions de l'éditeur ---------- */
  async function openTab(name) {
    const b = await find(`[data-left="${name}"]`);
    if (b.getAttribute('aria-selected') === 'true') return;
    await click(b);
    await wait(120);
  }
  async function inspectorTab(name) {
    const b = await find(`#inspector [data-insp="${name}"]`);
    if (b.getAttribute('aria-selected') === 'true') return;
    await click(b);
  }
  async function menu(itemId) {
    await click('#fileMenu > summary');
    await click(`#${itemId}`);
  }
  async function addWidget(type) {
    await openTab('widgets');
    const s = ui.seq();
    await click(`.lib-item[data-type="${type}"]:not(.lib-item--struct)`);
    await ui.waitCode('action.add', s, 6000);
    return state.selected;
  }
  async function addStructure(spans = '12') {
    await openTab('widgets');
    const s = ui.seq();
    await click(`.lib-item--struct[data-spans="${spans}"]`);
    await ui.waitCode('action.add-section', s, 6000);
    return state.selected;
  }
  async function addTemplate(id) {
    await openTab('templates');
    const s = ui.seq();
    await click(`.tpl[data-template="${id}"]`);
    await ui.waitCode('template.insert', s, 6000);
    return state.selected;
  }
  async function selectNode(id) {
    if (state.selected !== id) {
      const el = await find(`[data-node="${id}"]`, { canvas: true });
      await moveTo(el);
      press(el);
      await ui.cclick(el);
      await ui.waitFor(() => state.selected === id, { timeout: 4000, what: `sélection ${id}` });
    }
    await wait(T.click);
    return id;
  }
  /* n-ième nœud de ce type dans la racine éditée (ou dans le sous-arbre `within`) */
  function find$(type, nth = 0, within = null) {
    const out = [];
    const start = within ? findIn(editRoot(), within) : editRoot();
    if (start) walk(start, n => { if (n.type === type) out.push(n); return true; });
    return out[nth] || null;
  }
  function findIn(node, id) { let f = null; walk(node, n => { if (n.id === id) { f = n; return false; } return true; }); return f; }
  function sectionOf(id) {
    let sec = null;
    walk(editRoot(), n => { if (n.type === 'section' && findIn(n, id)) { sec = n; return false; } return true; });
    return sec?.id || null;
  }
  async function openPage(pageId) {
    if (state.pageId === pageId) return;
    const s = ui.seq();
    await select('#pageSelect', pageId);
    await ui.waitCode('canvas.load.ok', s, 10000);
    await wait(200);
  }
  async function importImage(inputSel, kind, title, name) {
    const input = await find(inputSel);
    await moveTo(input.closest('label') || input);
    const file = await drawIllustration(kind, { title, name });
    const s = ui.seq();
    await ui.setFile(input, file);
    await ui.waitCode('inspector.image.ok|settings.logo|image.import.fail', s, 20000);
    await wait(T.image);
  }
  const pickLink = (key, value) => select(`#inspector [data-link-pick="${key}"]`, value);
  function closeDialogs() {
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch { /* déjà fermée */ } });
    for (const id of ['#fileMenu', '#helpMenu']) { const m = $(id); if (m) m.open = false; }
  }
  async function say(text) {
    const t = (text && typeof text === 'object' ? text[uiLang()] || text.fr : text) || '';
    onSay(t);
    await wait(T.sayBase + t.length * T.sayChar);
  }
  function answerPrompt(answer) {
    promptAnswer = answer;
    window.prompt = () => { const a = promptAnswer; window.prompt = origPrompt; promptAnswer = null; return a; };
  }

  return {
    get state() { return state; },
    mem: {},
    root: editRoot,
    ui, sleep, wait, seq: ui.seq, waitCode: (c, s, t) => ui.waitCode(c, s, t), waitFor: (f, o) => ui.waitFor(f, o),
    click, fill, type, select, check, setField, setListField, addListItem, removeListItem,
    openTab, inspectorTab, menu, addWidget, addStructure, addTemplate, selectNode, find: find$, sectionOf, openPage, importImage, pickLink, closeDialogs, say, answerPrompt, moveCursor,
    /* commandes */
    setSpeed(v) { factor = SPEEDS[v] ?? 1; },
    pause() { paused = true; },
    resume() { paused = false; resume?.(); resume = null; },
    isPaused: () => paused,
    nextStep() { ff = true; },
    stepDone() { ff = false; },
    stop() { stopped = true; paused = false; resume?.(); resume = null; },
    isStopped: () => stopped,
    dispose() { window.prompt = origPrompt; $('#demoCursor')?.remove(); $('#demoRing')?.remove(); }
  };
}
