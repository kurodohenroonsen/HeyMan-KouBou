/*
 * Texte riche, logique pure (cycle 30) : déclencheurs de liste (« - », « 1. »), formats de bloc proposés,
 * et nettoyage d'un collage venu de Word, Google Docs ou LibreOffice avant l'assainisseur (core/sanitize.js).
 * Rien ici ne touche au DOM : editor/richedit.js applique ces résultats avec Range/Selection.
 */
import { __ } from './ui-i18n.js';
import { richToText } from './sanitize.js';

/* Texte tapé en début de ligne, avant l'espace : « - », « * », « • » → puces ; « 1. », « 1) » → numéros */
export function listTrigger(before) {
  const s = String(before ?? '').replace(/ /g, ' ').trim();
  if (s === '-' || s === '*' || s === '•') return 'ul';
  if (/^1[.)]$/.test(s)) return 'ol';
  return null;
}

/* Formats de bloc du menu « Format » (paragraphe, intertitres, citation) */
export const blockFormats = () => [
  { tag: 'p', label: __('Paragraphe') },
  { tag: 'h2', label: __('Titre 2') },
  { tag: 'h3', label: __('Titre 3') },
  { tag: 'blockquote', label: __('Citation') }
];

/* ---------- Collage ---------- */
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;
const USEFUL = /<(p|br|h[1-6]|ul|ol|li|blockquote|b|strong|i|em|u|a|sup|sub|table|tr)\b/i;

/* Lettres seules (sans chiffres, puces ni espaces), pour comparer le HTML et le texte du presse-papiers */
const letters = s => (String(s).match(/\p{L}/gu) || []).join('').toLowerCase();

/* HTML du presse-papiers quand il apporte une mise en forme utile (gras, lien, liste…) et dit la même chose que
   le texte brut (sinon le presse-papiers est incohérent : on colle le texte brut) */
export function choosePaste({ html = '', text = '' } = {}) {
  if (!html || !USEFUL.test(html)) return { kind: 'text', value: text };
  if (text && letters(richToText(pasteToHtml(html))) !== letters(text)) return { kind: 'text', value: text };
  return { kind: 'html', value: html };
}

const textOf = s => String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;| /g, ' ').trim();

/* Coupe l'élément ouvert à `from` (balise ouvrante incluse) jusqu'à sa fermeture équilibrée : { inner, end } */
function cutElement(html, from, name) {
  TAG.lastIndex = from;
  const open = TAG.exec(html);
  if (!open || open.index !== from) return null;
  let depth = 1;
  let m;
  while ((m = TAG.exec(html))) {
    if (m[1].toLowerCase() !== name) continue;
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return { inner: html.slice(open.index + open[0].length, m.index), end: m.index + m[0].length };
  }
  return { inner: html.slice(open.index + open[0].length), end: html.length };
}

/* Puce ou numéro d'un paragraphe de liste Word : retiré du contenu, et son type (ul/ol) */
function wordMarker(content) {
  const cond = /<!(?:--)?\[if !supportLists\](?:--)?>([\s\S]*?)<!(?:--)?\[endif\](?:--)?>/i.exec(content);
  if (cond) return { marker: textOf(cond[1]), rest: content.slice(0, cond.index) + content.slice(cond.index + cond[0].length) };
  const span = /<span\b[^>]*mso-list:\s*Ignore[^>]*>/i.exec(content);
  if (span) {
    const cut = cutElement(content, span.index, 'span');
    if (cut) return { marker: textOf(cut.inner), rest: content.slice(0, span.index) + content.slice(cut.end) };
  }
  return { marker: '', rest: content };
}

const isNumbered = marker => /^(\d+|[a-zA-Z]|[ivxlcIVXLC]+)[.)]$/.test(marker);

function buildList(items) {
  let out = '';
  const stack = [];
  for (const it of items) {
    if (!stack.length) { out += `<${it.type}>`; stack.push(it.type); }
    else if (it.level > stack.length) { while (stack.length < it.level) { out += `<${it.type}>`; stack.push(it.type); } }
    else {
      while (stack.length > it.level) out += `</li></${stack.pop()}>`;
      out += '</li>';
      if (stack[stack.length - 1] !== it.type) { out += `</${stack.pop()}><${it.type}>`; stack.push(it.type); }
    }
    out += `<li>${it.html}`;
  }
  while (stack.length) out += `</li></${stack.pop()}>`;
  return out;
}

/* Les paragraphes « mso-list » de Word (puces et numéros simulés) deviennent de vraies listes, imbriquées par niveau */
export function wordListsToHtml(html) {
  const src = String(html ?? '');
  if (!/mso-list:/i.test(src)) return src;
  let out = '';
  let pos = 0;
  let run = [];
  const flush = () => { if (run.length) { out += buildList(run); run = []; } };
  for (const m of src.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)) {
    const gap = src.slice(pos, m.index);
    if (!run.length) out += gap;
    else if (!/^\s*$/.test(gap)) { flush(); out += gap; }
    pos = m.index + m[0].length;
    const lvl = /mso-list:[^;'"]*\blevel(\d+)/i.exec(m[1]);
    if (!lvl) { flush(); out += m[0]; continue; }
    const { marker, rest } = wordMarker(m[2]);
    run.push({ level: Math.max(1, Number(lvl[1])), type: isNumbered(marker) ? 'ol' : 'ul', html: rest.trim() });
  }
  flush();
  return out + src.slice(pos);
}

/* Google Docs écrit le gras, l'italique et le souligné en styles de <span>, le tout dans un <b> « font-weight:normal » */
function spanWrappers(attrs) {
  const style = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  const s = (style?.[1] ?? style?.[2] ?? '').toLowerCase();
  const tags = [];
  if (/font-weight\s*:\s*(bold|[6-9]00)/.test(s)) tags.push('strong');
  if (/font-style\s*:\s*italic/.test(s)) tags.push('em');
  if (/text-decoration[^;]*underline/.test(s)) tags.push('u');
  if (/vertical-align\s*:\s*super/.test(s)) tags.push('sup');
  else if (/vertical-align\s*:\s*sub\b/.test(s)) tags.push('sub');
  return tags;
}

export function docsStylesToTags(html) {
  const src = String(html ?? '');
  let out = '';
  let pos = 0;
  const stack = [];
  for (const m of src.matchAll(TAG)) {
    out += src.slice(pos, m.index);
    pos = m.index + m[0].length;
    const name = m[1].toLowerCase();
    const closing = m[0][1] === '/';
    if (name === 'span') {
      if (closing) { const e = stack.pop(); if (e?.tags) out += [...e.tags].reverse().map(t => `</${t}>`).join(''); continue; }
      if (m[0].endsWith('/>')) continue;
      const tags = spanWrappers(m[2]);
      stack.push({ name, tags });
      out += tags.map(t => `<${t}>`).join('');
      continue;
    }
    if (name === 'b') {
      if (closing) { const e = stack.pop(); if (!e?.ignore) out += m[0]; continue; }
      const ignore = /font-weight\s*:\s*(normal|400)/i.test(m[2]);
      stack.push({ name, ignore });
      if (!ignore) out += m[0];
      continue;
    }
    out += m[0];
  }
  return out + src.slice(pos);
}

const JUNK = [
  /<!DOCTYPE[^>]*>/gi, /<\?xml[\s\S]*?\?>/gi, /<head\b[\s\S]*?<\/head>/gi, /<style\b[\s\S]*?<\/style>/gi, /<xml\b[\s\S]*?<\/xml>/gi,
  /<!--\[if[\s\S]*?<!\[endif\]-->/gi, /<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, /<!\[[^>]*\]>/g, /<!--[\s\S]*?-->/g,
  /<\/?o:[^>]*>/gi, /<br\b[^>]*Apple-interchange-newline[^>]*>/gi, /<\/?(?:html|body|meta|link)\b[^>]*>/gi
];

/* Collage brut → HTML propre (encore à passer dans sanitizeRich / sanitizeInline) */
export function pasteToHtml(html) {
  let h = wordListsToHtml(String(html ?? ''));
  for (const re of JUNK) h = h.replace(re, '');
  h = h.replace(/<p\b[^>]*class=["']?Mso(?:Intense)?Quote\b[^>]*>([\s\S]*?)<\/p>/gi, '<blockquote>$1</blockquote>');
  h = docsStylesToTags(h);
  /* <li><p>…</p></li> (Google Docs, LibreOffice) et <blockquote><p>…</p></blockquote> : un seul niveau */
  h = h.replace(/<(li|blockquote)\b([^>]*)>\s*<p\b[^>]*>/gi, '<$1$2>').replace(/<\/p>\s*<\/(li|blockquote)>/gi, '</$1>');
  /* retours à la ligne du code source autour des blocs : sans valeur */
  h = h.replace(/\s*(<\/?(?:p|h[1-6]|ul|ol|li|blockquote|div|table|tr|td|br)\b[^>]*>)\s*/gi, '$1');
  return h.trim();
}
