/* Fenêtres d'Atelier (cycle 33, X8) : openDialog, confirmDialog et askText, bâtis sur <dialog class="audit">.
 * Mêmes comportements partout : titre relié par aria-labelledby, Échap, focus initial choisi (core/dialog.js),
 * focus rendu à l'élément déclencheur à la fermeture, pas de rôle « banner » dans la fenêtre (div, pas header).
 * Remplace les fenêtres natives du navigateur (prompt, confirm, alert). Barres d'onglets : flèches, Début, Fin (motif APG). */
import { h } from './dom.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';
import { initialFocusIndex, answerError } from '../core/dialog.js';

/* Réponse automatique (auto-test) : fn(kind, opts) → réponse ; null pour la désactiver */
let auto = null;
export function setDialogAutoAnswer(fn) { auto = fn || null; }

const FIELDS = 'input:not([type=hidden]),select,textarea,[contenteditable="true"]';

/* Rend le focus à l'élément déclencheur s'il existe encore et si rien d'autre ne l'a pris (autre fenêtre ouverte…) */
function restoreFocus(opener) {
  const free = !document.activeElement || document.activeElement === document.body;
  if (free && opener?.isConnected && typeof opener.focus === 'function' && !document.querySelector('dialog[open]')) opener.focus();
}

function focusInitial(d, wanted) {
  if (wanted) { wanted.focus(); return; }
  const els = [...d.querySelectorAll(`[data-dialog-close],${FIELDS},.audit__foot button,[autofocus]`)]
    .filter(el => !el.closest('[hidden]') && !el.closest('details:not([open]) > :not(summary)'));
  const items = els.map(el => ({
    kind: el.matches('[data-dialog-close]') ? 'close' : el.matches(FIELDS) ? 'input' : 'button',
    autofocus: el.hasAttribute('autofocus'), primary: el.classList.contains('btn--primary'),
    danger: el.classList.contains('btn--danger') || el.hasAttribute('data-danger'), disabled: el.disabled
  }));
  els[initialFocusIndex(items)]?.focus();
}

/* body : nœud(s) du contenu ; actions : boutons du pied ; head : nœuds ajoutés à l'en-tête avant ✕ ;
 * size : 'sm' | 'lg' (classe audit--sm…) ; className : classes propres à la fenêtre ; focus : élément à focaliser.
 * Retourne l'élément <dialog> ouvert (close() le ferme et le retire du document). */
export function openDialog({ id, title, titleId, body = [], actions = [], head = [], onClose, size, className = '', focus, attrs = {} }) {
  document.getElementById(id)?.remove();
  const opener = document.activeElement;
  const tid = titleId || `${id}Title`;
  const cls = ['audit', className, size ? `audit--${size}` : ''].filter(Boolean).join(' ');
  const d = h('dialog', { ...attrs, class: cls, id, 'aria-labelledby': tid, 'aria-modal': 'true' });
  const close = h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), title: __('Fermer'), 'data-dialog-close': '', onclick: () => d.close() }, '✕');
  d.append(h('div', { class: 'audit__head' }, h('h2', { id: tid }, title), ...[head].flat(), close), ...[body].flat().filter(Boolean));
  const acts = [actions].flat().filter(Boolean);
  if (acts.length) d.append(h('div', { class: 'audit__foot' }, ...acts));
  d.addEventListener('close', () => { d.remove(); onClose?.(d.returnValue); restoreFocus(opener); });
  document.body.append(d);
  d.showModal();
  focusInitial(d, focus);
  return d;
}

/* Confirmation : vrai si la personne confirme (bouton [data-confirm]) ; Échap, ✕ et Annuler donnent faux */
export function confirmDialog({ id = 'confirmDialog', title, message, ok = __('Confirmer'), cancel = __('Annuler'), danger = false }) {
  if (auto) return Promise.resolve(auto('confirm', { title, message }));
  return new Promise(resolve => {
    let answer = false;
    const done = v => { answer = v; d.close(); };
    const d = openDialog({
      id, title, size: 'sm',
      body: h('div', { class: 'a11y-form' }, [message].flat().map(m => (m instanceof Node ? m : h('p', {}, m)))),
      actions: [
        h('button', { type: 'button', class: 'btn', 'data-confirm-cancel': '', onclick: () => done(false) }, cancel),
        h('button', { type: 'button', class: 'btn btn--primary' + (danger ? ' btn--danger' : ''), 'data-confirm': '', onclick: () => done(true) }, ok)],
      onClose: () => { log.debug('ui.confirm', answer ? __('Confirmation acceptée : {title}', { title }) : __('Confirmation refusée : {title}', { title }), { id, ok: answer }); resolve(answer); }
    });
  });
}

/* Question à réponse courte : le texte saisi, ou null si la personne annule */
export function askText({ id = 'askTextDialog', title, label, value = '', placeholder = '', validate, required = true, ok = __('Valider'), type = 'text' }) {
  if (auto) return Promise.resolve(auto('text', { title, label, value }));
  return new Promise(resolve => {
    let answer = null;
    const input = h('input', { class: 'input', type, value, placeholder, 'data-ask-input': '', 'aria-describedby': `${id}Error`, autocomplete: 'off' });
    const err = h('p', { class: 'hint is-error', id: `${id}Error`, role: 'alert' });
    const submit = () => {
      const msg = answerError(input.value, { required, validate });
      err.textContent = msg;
      input.setAttribute('aria-invalid', String(!!msg));
      if (msg) { input.focus(); return; }
      answer = input.value.trim();
      d.close();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    const d = openDialog({
      id, title, size: 'sm', focus: input,
      body: h('div', { class: 'a11y-form' }, h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), input), err),
      actions: [
        h('button', { type: 'button', class: 'btn', 'data-confirm-cancel': '', onclick: () => d.close() }, __('Annuler')),
        h('button', { type: 'button', class: 'btn btn--primary', 'data-confirm': '', onclick: submit }, ok)],
      onClose: () => resolve(answer)
    });
    input.select();
  });
}

/* Barres d'onglets (role="tablist") : ←/→ passent à l'onglet voisin et l'activent, Début/Fin au premier/dernier.
 * Les barres sont souvent reconstruites au clic : le focus est rendu à l'onglet sélectionné reconstruit. */
const TAB_KEYS = { ArrowLeft: -1, ArrowRight: 1, Home: 'first', End: 'last' };
export function initTabKeys(root = document) {
  root.addEventListener('keydown', e => {
    const tab = e.target.closest?.('[role="tab"]');
    const list = tab?.closest('[role="tablist"]');
    if (!list || !(e.key in TAB_KEYS) || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const tabs = [...list.querySelectorAll('[role="tab"]')].filter(t => !t.disabled && !t.hidden);
    const k = TAB_KEYS[e.key];
    const i = tabs.indexOf(tab);
    const next = k === 'first' ? tabs[0] : k === 'last' ? tabs.at(-1) : tabs[(i + k + tabs.length) % tabs.length];
    if (!next || next === tab) return;
    const attr = [...next.attributes].find(a => a.name.startsWith('data-'));
    const sel = attr ? `[role="tab"][${attr.name}="${CSS.escape(attr.value)}"]` : null;
    next.click();
    const target = (sel && document.querySelector(sel)) || next;
    target.focus();
    log.debug('ui.tab-key', __('Onglet changé au clavier ({key})', { key: e.key }), { key: e.key, tab: attr?.value });
  });
}

/* Tabindex « roving » : seul l'onglet sélectionné est atteint par Tab */
export function rovingTabs(list) {
  for (const t of list.querySelectorAll('[role="tab"]')) t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
  return list;
}
