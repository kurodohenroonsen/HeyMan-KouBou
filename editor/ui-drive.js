/*
 * Pilotage de l'interface par l'éditeur lui-même (cycle 26) : attendre un élément ou un code du journal, cliquer
 * (éditeur ou canevas), remplir un champ, envoyer une touche, déposer un fichier, tout refermer. Partagé par
 * l'auto-test (editor/selftest.js) et le pilote de la démonstration (editor/demo-driver.js), qui fournissent
 * chacun leur `sleep` (interruption d'un cas, pause ou arrêt de la démonstration).
 */
import { state, select } from './store.js';
import { canvasDoc } from './canvas.js';
import { isEditing, stopEditing } from './inline.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

export function createUi({ sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const seq = () => log.stats().seq;
  const cdoc = () => canvasDoc();
  async function waitFor(fn, { timeout = 5000, what = __('condition') } = {}) {
    const t0 = performance.now();
    for (;;) {
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
  async function cclick(sel) {
    const e = typeof sel === 'string' ? await cel(sel) : sel;
    e.scrollIntoView?.({ block: 'center' });
    e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: e.ownerDocument.defaultView }));
    await sleep(80);
    return e;
  }
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
    const input = typeof sel === 'string' ? await el(sel, o) : sel;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const opened = id => document.querySelector(`#${id}[open]`);
  function closeAll() {
    try { if (isEditing()) stopEditing(); } catch { /* rien en cours */ }
    document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch { /* déjà fermée */ } });
    for (const id of ['#fileMenu', '#helpMenu']) { const m = document.querySelector(id); if (m) m.open = false; }
    if (state.selected) select(null);
  }
  return { seq, cdoc, waitFor, el, cel, sinceCodes, waitCode, click, cclick, fill, key, setFile, opened, closeAll, sleep };
}

/* Image dessinée (logo de l'auto-test) : dégradé et rectangle, en PNG */
export async function drawLogo(name = 'logo-auto-test.png', w = 600, h = 300) {
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
