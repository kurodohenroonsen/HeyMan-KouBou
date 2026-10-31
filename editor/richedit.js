/*
 * Édition de texte riche avec contenteditable, sans execCommand.
 * Mise en forme par l'API Selection/Range : gras, italique, souligné, exposant, indice, lien, listes (boutons,
 * « - » et « 1. » en début de ligne, Entrée, Tab), intertitres et citation. Collage : la mise en forme utile de
 * Word, Google Docs ou LibreOffice est gardée (core/richtext-commands.js + assainisseur) ; tout est assaini à chaque saisie.
 */
import { sanitizeRich, sanitizeInline } from '../core/sanitize.js';
import { listTrigger, pasteToHtml, choosePaste } from '../core/richtext-commands.js';
import { safeUrl } from '../core/escape.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

const TAGS = { bold: 'STRONG', italic: 'EM', underline: 'U', sup: 'SUP', sub: 'SUB' };
const BLOCKS = /^(P|H2|H3|BLOCKQUOTE|LI|DIV)$/;

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
  if (cmd === 'ul' || cmd === 'ol') return { done: true, action: toggleList(root, cmd, sel, range), chars };
  if (['p', 'h2', 'h3', 'blockquote'].includes(cmd)) {
    const r = setBlock(root, cmd, sel, range);
    return r ? { done: true, action: r === 'p' ? 'remove' : 'add', chars } : { done: false, reason: 'in-list' };
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

/* ---------- Blocs et listes (cycle 30) ---------- */
const isList = n => /^(UL|OL)$/.test(n?.nodeName || '');
const caretTo = (sel, node, offset = 0) => {
  const r = node.ownerDocument.createRange();
  r.setStart(node, offset);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
};
const caretEnd = (sel, el) => {
  const r = el.ownerDocument.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
};
function moveKids(from, to) {
  while (from.firstChild) to.append(from.firstChild);
  if (!to.firstChild) to.append(to.ownerDocument.createElement('br'));
}

/* Bloc qui contient le curseur ; du texte nu à la racine (sans <p>) est d'abord rangé dans un <p> */
function blockAt(root, node) {
  let n = node?.nodeType === 3 ? node.parentNode : node;
  while (n && n !== root) { if (BLOCKS.test(n.nodeName)) return n; n = n.parentNode; }
  const doc = root.ownerDocument;
  const p = doc.createElement('p');
  let top = node && node !== root ? node : null;
  if (!top) { p.append(doc.createElement('br')); root.append(p); return p; }
  while (top.parentNode !== root) top = top.parentNode;
  const loose = x => x && !BLOCKS.test(x.nodeName) && !isList(x);
  let a = top;
  while (loose(a.previousSibling)) a = a.previousSibling;
  const items = [];
  for (let x = a; loose(x); x = x.nextSibling) items.push(x);
  root.insertBefore(p, a);
  items.forEach(x => p.append(x));
  return p;
}

/* Bloc du curseur → liste (ul/ol) ; dans une liste : change son type, ou sort de la liste */
function toggleList(root, type, sel, range) {
  const doc = root.ownerDocument;
  const block = blockAt(root, range.startContainer);
  if (block.nodeName === 'LI') {
    const list = block.parentNode;
    if (list.nodeName.toLowerCase() === type) { outOfList(block, sel); return 'remove'; }
    const other = doc.createElement(type);
    while (list.firstChild) other.append(list.firstChild);
    list.replaceWith(other);
    caretEnd(sel, block);
    return 'retype';
  }
  const list = doc.createElement(type);
  const item = doc.createElement('li');
  moveKids(block, item);
  list.append(item);
  block.replaceWith(list);
  if (list.previousSibling?.nodeName === list.nodeName) { list.previousSibling.append(item); list.remove(); }
  caretEnd(sel, item);
  return 'add';
}

/* Un item sort de sa liste : un item imbriqué remonte d'un niveau, sinon il devient un paragraphe */
function outOfList(li, sel) {
  const doc = li.ownerDocument;
  const list = li.parentNode;
  const after = [];
  for (let x = li.nextSibling; x; x = x.nextSibling) after.push(x);
  const rest = () => { const r = doc.createElement(list.nodeName); after.forEach(x => r.append(x)); return r; };
  if (list.parentNode.nodeName === 'LI') {
    list.parentNode.after(li);
    if (after.length) li.append(rest());
    if (!list.firstChild) list.remove();
    caretEnd(sel, li);
    return;
  }
  const p = doc.createElement('p');
  [...li.childNodes].filter(x => !isList(x)).forEach(x => p.append(x));
  if (!p.firstChild) p.append(doc.createElement('br'));
  const nested = [...li.childNodes];
  if (after.length || nested.length) { const r = rest(); r.prepend(...nested.flatMap(x => [...x.childNodes])); list.after(r); }
  list.after(p);
  li.remove();
  if (!list.firstChild) list.remove();
  caretTo(sel, p, 0);
}

/* Entrée dans un item : coupe l'item au curseur ; Entrée sur un item vide : sortie de la liste */
function enterInItem(li, sel, range) {
  const doc = li.ownerDocument;
  const nested = [...li.children].find(isList);
  if (!li.textContent.replace(/ /g, ' ').trim() && !nested) { outOfList(li, sel); return 'exit'; }
  range.deleteContents();
  const tail = doc.createRange();
  tail.setStart(range.startContainer, range.startOffset);
  if (nested) tail.setEndBefore(nested); else tail.setEnd(li, li.childNodes.length);
  const next = doc.createElement('li');
  next.append(tail.extractContents());
  if (nested) next.append(nested);
  if (!next.textContent && !next.querySelector('br')) next.prepend(doc.createElement('br'));
  if (!li.textContent && !li.querySelector('br')) li.prepend(doc.createElement('br'));
  li.after(next);
  caretTo(sel, next, 0);
  return 'next';
}

/* Tab : l'item passe sous l'item précédent (un niveau d'imbrication) ; Maj+Tab : remonte */
function indentItem(li, sel, out) {
  const list = li.parentNode;
  if (out) { if (list.parentNode.nodeName !== 'LI') return false; outOfList(li, sel); return true; }
  const prev = li.previousElementSibling;
  if (!prev || list.parentNode.nodeName === 'LI') return false;
  let sub = [...prev.children].find(isList);
  if (!sub) { sub = li.ownerDocument.createElement(list.nodeName); prev.append(sub); }
  sub.append(li);
  caretEnd(sel, li);
  return true;
}

/* Format du bloc du curseur : p, h2, h3 ou blockquote (le même format une deuxième fois revient au paragraphe) */
function setBlock(root, tag, sel, range) {
  const block = blockAt(root, range.startContainer);
  if (block.nodeName === 'LI') return null;
  const next = block.nodeName.toLowerCase() === tag ? 'p' : tag;
  const el = root.ownerDocument.createElement(next);
  moveKids(block, el);
  block.replaceWith(el);
  caretEnd(sel, el);
  return next;
}

/* Format du bloc où se trouve le curseur, pour l'état des boutons : p, h2, h3, blockquote, ul, ol */
export function blockOf(root) {
  const s = selectionInside(root);
  if (!s) return null;
  let n = s.range.startContainer.nodeType === 3 ? s.range.startContainer.parentNode : s.range.startContainer;
  while (n && n !== root) {
    if (isList(n) || /^(H2|H3|BLOCKQUOTE)$/.test(n.nodeName)) return n.nodeName.toLowerCase();
    n = n.parentNode;
  }
  return 'p';
}

export function isActive(root, cmd) {
  const s = selectionInside(root);
  if (!s) return false;
  const tag = cmd === 'link' ? 'A' : TAGS[cmd];
  return !!closestTag(s.range.commonAncestorContainer, tag, root);
}

/* Collage avec mise en forme : nettoyé (Word, Docs, LibreOffice) puis assaini avant d'entrer dans la page */
const htmlTextLen = html => html.replace(/<[^>]*>/g, '').length;
function insertHtml(root, html, inline) {
  const s = selectionInside(root);
  if (!s) return false;
  const clean = inline ? sanitizeInline(pasteToHtml(html)) : sanitizeRich(pasteToHtml(html));
  if (!clean.trim()) return false;
  const doc = root.ownerDocument;
  const t = doc.createElement('template');
  t.innerHTML = clean;
  const frag = t.content;
  const tags = [...frag.querySelectorAll('*')].map(n => n.nodeName.toLowerCase());
  const n = htmlTextLen(clean);
  log.debug('edit.paste-rich', __n(n, 'Collage avec mise en forme : {n} caractère (assaini)', 'Collage avec mise en forme : {n} caractères (assaini)'),
    { chars: n, tags: [...new Set(tags)].slice(0, 12), items: tags.filter(k => k === 'li').length || undefined, inline, where: where(root) });
  const { sel, range } = s;
  range.deleteContents();
  const last = frag.lastChild;
  const blocks = [...frag.childNodes].some(x => /^(P|H2|H3|UL|OL|BLOCKQUOTE)$/.test(x.nodeName));
  let top = range.startContainer;
  while (top && top !== root && top.parentNode !== root) top = top.parentNode;
  if (blocks && top && top !== root && top.nodeType === 1) {
    top.after(frag);
    if (!top.textContent.trim()) top.remove();
  } else range.insertNode(frag);
  if (last) caretEnd(sel, last.nodeType === 1 ? last : last.parentNode);
  return true;
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

/* Touches des listes : « - » ou « 1. » puis espace en début de ligne, Entrée et Tab / Maj+Tab dans un item */
function closestBlock(root, node) {
  let n = node?.nodeType === 3 ? node.parentNode : node;
  while (n && n !== root) { if (BLOCKS.test(n.nodeName)) return n; n = n.parentNode; }
  return null;
}
function textBefore(block, range) {
  const r = block.ownerDocument.createRange();
  r.setStart(block, 0);
  r.setEnd(range.startContainer, range.startOffset);
  return r.toString();
}
function listKey(el, e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const s = selectionInside(el);
  if (!s) return false;
  const { sel, range } = s;
  if (e.key === ' ' && range.collapsed) {
    const block = closestBlock(el, range.startContainer);
    if (block?.nodeName === 'LI') return false;
    const before = textBefore(block || el, range);
    const type = listTrigger(before);
    if (!type) return false;
    e.preventDefault();
    const r = el.ownerDocument.createRange();
    r.setStart(block || el, 0);
    r.setEnd(range.startContainer, range.startOffset);
    r.deleteContents();
    const action = toggleList(el, type, sel, sel.getRangeAt(0));
    const mark = before.trim();
    log.debug('edit.list', type === 'ul' ? __('Liste à puces créée (« {mark} » en début de ligne)', { mark }) : __('Liste numérotée créée (« {mark} » en début de ligne)', { mark }), { type, how: 'auto', action, where: where(el) });
    return true;
  }
  const li = closestTag(range.startContainer, 'LI', el);
  if (!li) return false;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const action = enterInItem(li, sel, sel.getRangeAt(0));
    if (action === 'exit') log.debug('edit.list-exit', __('Entrée sur un item vide : sortie de la liste'), { where: where(el) });
    else log.trace('edit.list-enter', __('Entrée : nouvel item de la liste'), {});
    return true;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const done = indentItem(li, sel, e.shiftKey);
    log.debug('edit.list-indent', e.shiftKey ? __('Item remonté d’un niveau (Maj+Tab)') : __('Item imbriqué sous le précédent (Tab)'), { out: e.shiftKey, done });
    return done;
  }
  return false;
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
      const pick = choosePaste({ html: e.clipboardData?.getData('text/html') || '', text });
      if (pick.kind === 'html' && insertHtml(el, pick.value, inline)) { onInput?.(clean()); return; }
      log.debug('edit.paste', types.some(t => t !== 'text/plain') ? __n(text.length, 'Collage en texte brut : {n} caractère, mise en forme et balises retirées', 'Collage en texte brut : {n} caractères, mise en forme et balises retirées') : __n(text.length, 'Collage en texte brut : {n} caractère', 'Collage en texte brut : {n} caractères'), { chars: text.length, lines: text ? text.split(/\r\n?|\n/).length : 0, rich: types.includes('text/html') || undefined, files: types.includes('Files') || undefined, inline, where: where(el) });
      if (!text && types.includes('Files')) log.warn('edit.paste-file', __('Collage d’un fichier ignoré : pour une image, utilise un widget Image'), { where: where(el) });
      insertPlainText(el, text, inline);
      onInput?.(clean());
    },
    drop: e => { e.preventDefault(); log.debug('edit.drop-blocked', __('Dépôt dans un texte en cours d’édition ignoré (utilise copier-coller)'), { where: where(el) }); },
    keydown: e => {
      if (onKey?.(e) === false) return;
      if (inline && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); el.blur(); return; }
      if (!inline && listKey(el, e)) { onInput?.(clean()); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); el.blur(); }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && !inline && (e.code === 'Digit7' || e.code === 'Digit8')) {
        e.preventDefault();
        format(el, e.code === 'Digit7' ? 'ol' : 'ul');
        onInput?.(clean());
        return;
      }
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
