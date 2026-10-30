/*
 * Édition de texte riche avec contenteditable, sans execCommand.
 * Mise en forme par l'API Selection/Range ; collage forcé en texte brut ; tout est assaini à chaque saisie.
 */
import { sanitizeRich, sanitizeInline } from '../core/sanitize.js';
import { safeUrl } from '../core/escape.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

const TAGS = { bold: 'STRONG', italic: 'EM', underline: 'U' };

function within(root, node) {
  return node && (node === root || root.contains(node));
}

function closestTag(node, tag, root) {
  let n = node?.nodeType === 3 ? node.parentNode : node;
  while (n && n !== root) {
    if (n.nodeName === tag || (tag === 'STRONG' && n.nodeName === 'B') || (tag === 'EM' && n.nodeName === 'I')) return n;
    n = n.parentNode;
  }
  return null;
}

function unwrap(el) {
  const parent = el.parentNode;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

export function selectionInside(root) {
  const sel = root.ownerDocument.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  return within(root, range.commonAncestorContainer) ? { sel, range } : null;
}

/* Où se trouve le texte mis en forme : dans la page (iframe du canevas) ou dans l'inspecteur */
const where = root => (root.ownerDocument === document ? 'inspecteur' : 'page');

export function format(root, cmd, arg) {
  const r0 = formatNow(root, cmd, arg);
  if (r0.done) log.debug('edit.format', r0.action === 'remove' ? __('Mise en forme : {cmd} (retirée)', { cmd }) : __('Mise en forme : {cmd} (appliquée)', { cmd }), { cmd, action: r0.action, chars: r0.chars, where: where(root), url: cmd === 'link' && r0.action === 'add' ? r0.url : undefined });
  else if (r0.reason === 'bad-url') log.warn('edit.link-invalid', __('Lien refusé : adresse non autorisée ({url}). Utilise https://, mailto:, tel: ou #ancre', { url: String(arg || '').slice(0, 60) || __('vide') }), { url: String(arg || '').slice(0, 60), where: where(root) });
  else log.debug('edit.format-none', r0.reason === 'no-selection' ? __('Mise en forme {cmd} sans effet : le curseur n’est pas dans le texte', { cmd }) : __('Mise en forme {cmd} sans effet : aucun texte sélectionné', { cmd }), { cmd, reason: r0.reason, where: where(root) });
  return r0.done;
}

function formatNow(root, cmd, arg) {
  const doc = root.ownerDocument;
  const s = selectionInside(root);
  if (!s) return { done: false, reason: 'no-selection' };
  const { sel, range } = s;
  const chars = range.toString().length;
  if (cmd === 'clear') {
    const text = range.toString();
    if (!text) return { done: false, reason: 'empty' };
    range.deleteContents();
    range.insertNode(doc.createTextNode(text));
    return { done: true, action: 'remove', chars };
  }
  if (cmd === 'link') {
    const existing = closestTag(range.commonAncestorContainer, 'A', root);
    if (existing) { unwrap(existing); return { done: true, action: 'remove', chars }; }
    if (range.collapsed) return { done: false, reason: 'empty' };
    const url = safeUrl(arg || '');
    if (!url || url === '#') return { done: false, reason: 'bad-url' };
    const a = doc.createElement('a');
    a.setAttribute('href', url);
    a.append(range.extractContents());
    range.insertNode(a);
    sel.removeAllRanges();
    const r = doc.createRange();
    r.selectNodeContents(a);
    sel.addRange(r);
    return { done: true, action: 'add', chars, url: url.slice(0, 60) };
  }
  const tag = TAGS[cmd];
  if (!tag) return { done: false, reason: 'unknown' };
  const existing = closestTag(range.commonAncestorContainer, tag, root);
  if (existing) { unwrap(existing); return { done: true, action: 'remove', chars }; }
  if (range.collapsed) return { done: false, reason: 'empty' };
  const w = doc.createElement(tag.toLowerCase());
  w.append(range.extractContents());
  range.insertNode(w);
  sel.removeAllRanges();
  const r = doc.createRange();
  r.selectNodeContents(w);
  sel.addRange(r);
  return { done: true, action: 'add', chars };
}

export function isActive(root, cmd) {
  const s = selectionInside(root);
  if (!s) return false;
  const tag = cmd === 'link' ? 'A' : TAGS[cmd];
  return !!closestTag(s.range.commonAncestorContainer, tag, root);
}

function insertPlainText(root, text, inline) {
  const doc = root.ownerDocument;
  const s = selectionInside(root);
  if (!s) return;
  const { sel, range } = s;
  range.deleteContents();
  const frag = doc.createDocumentFragment();
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  lines.forEach((line, i) => {
    if (i > 0) frag.append(inline ? doc.createTextNode(' ') : doc.createElement('br'));
    frag.append(doc.createTextNode(line));
  });
  const last = frag.lastChild;
  range.insertNode(frag);
  if (last) {
    const r = doc.createRange();
    r.setStartAfter(last);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

/**
 * Rend un élément éditable. onInput(html assaini) à chaque saisie, onDone(html) à la sortie.
 * inline : pas de paragraphes (Entrée valide la saisie).
 */
export function makeEditable(el, { inline = false, onInput, onDone, onKey } = {}) {
  el.setAttribute('contenteditable', 'true');
  el.setAttribute('spellcheck', 'true');
  const clean = () => (inline ? sanitizeInline(el.innerHTML) : sanitizeRich(el.innerHTML));
  const handlers = {
    input: () => onInput?.(clean()),
    paste: e => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      const types = [...(e.clipboardData?.types || [])];
      log.debug('edit.paste', types.some(t => t !== 'text/plain') ? __n(text.length, 'Collage en texte brut : {n} caractère, mise en forme et balises retirées', 'Collage en texte brut : {n} caractères, mise en forme et balises retirées') : __n(text.length, 'Collage en texte brut : {n} caractère', 'Collage en texte brut : {n} caractères'), { chars: text.length, lines: text ? text.split(/\r\n?|\n/).length : 0, rich: types.includes('text/html') || undefined, files: types.includes('Files') || undefined, inline, where: where(el) });
      if (!text && types.includes('Files')) log.warn('edit.paste-file', __('Collage d’un fichier ignoré : pour une image, utilise un widget Image'), { where: where(el) });
      insertPlainText(el, text, inline);
      onInput?.(clean());
    },
    drop: e => { e.preventDefault(); log.debug('edit.drop-blocked', __('Dépôt dans un texte en cours d’édition ignoré (utilise copier-coller)'), { where: where(el) }); },
    keydown: e => {
      if (onKey?.(e) === false) return;
      if (inline && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); el.blur(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); el.blur(); }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        format(el, { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]);
        onInput?.(clean());
      }
    },
    blur: e => { if (e.relatedTarget?.closest?.('#atelier-format')) return; onDone?.(clean()); }
  };
  for (const [ev, fn] of Object.entries(handlers)) el.addEventListener(ev, fn);
  return {
    stop() {
      for (const [ev, fn] of Object.entries(handlers)) el.removeEventListener(ev, fn);
      el.removeAttribute('contenteditable');
    },
    clean
  };
}
