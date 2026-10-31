/*
 * Assainisseur de texte riche, sans DOM (testable dans Node, utilisé aussi dans le navigateur).
 * Liste blanche : p h2 h3 blockquote br strong em u sup sub a ul ol li. Seul href passe, après filtrage
 * (option noopener : rel="noopener" sur les liens http(s), pour le rendu).
 * Le contenu de script/style/iframe/object/svg/math/template est supprimé entièrement.
 */
import { escapeHtml, escapeAttr, safeUrl } from './escape.js';

const BLOCK = new Set(['p', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote']);
const INLINE = new Set(['strong', 'em', 'u', 'a', 'sup', 'sub']);
const ALIAS = { b: 'strong', i: 'em', div: 'p', h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3' };
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'textarea', 'select', 'head', 'title']);

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', icirc: 'î', iuml: 'ï', euml: 'ë', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—', euro: '€', copy: '©' };

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

function readHref(attrs) {
  const m = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
  if (!m) return '';
  return decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
}

const TOKEN = /<!--[\s\S]*?(?:-->|$)|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>|<|[^<]+/g;

/* Blocs qui, en mode « une ligne », deviennent un saut de ligne à leur fermeture */
const LINE_BLOCKS = new Set(['p', 'li', 'h2', 'h3', 'blockquote']);

function sanitize(html, { inline, noopener = false }) {
  const out = [];
  const stack = [];
  let skip = null;
  let skipDepth = 0;
  const src = String(html ?? '');
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue;
    const isTag = m[1] !== undefined;
    if (skip) {
      if (isTag && m[1].toLowerCase() === skip) skipDepth += tok[1] === '/' ? -1 : 1;
      if (skipDepth <= 0) skip = null;
      continue;
    }
    if (!isTag) {
      out.push(escapeHtml(decodeEntities(tok)));
      continue;
    }
    const closing = tok[1] === '/';
    let name = m[1].toLowerCase();
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !/\/>$/.test(tok)) { skip = name; skipDepth = 1; }
      continue;
    }
    name = ALIAS[name] || name;
    if (name === 'br') { if (!closing) out.push('<br>'); continue; }
    if (inline && BLOCK.has(name)) {
      if (closing && LINE_BLOCKS.has(name)) out.push('\u0000BR');
      continue;
    }
    if (!BLOCK.has(name) && !INLINE.has(name)) continue;
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at < 0) continue;
      while (stack.length > at) out.push(`</${stack.pop()}>`);
      continue;
    }
    if (BLOCK.has(name) && name !== 'li') {
      while (stack.length && INLINE.has(stack[stack.length - 1])) out.push(`</${stack.pop()}>`);
      const pAt = Math.max(stack.lastIndexOf('p'), stack.lastIndexOf('h2'), stack.lastIndexOf('h3'));
      if (pAt >= 0) while (stack.length > pAt) out.push(`</${stack.pop()}>`);
    }
    if (name === 'a') {
      const href = safeUrl(readHref(m[2] || '')) || '#';
      out.push(`<a href="${escapeAttr(href)}"${noopener && /^https?:/i.test(href) ? ' rel="noopener"' : ''}>`);
    }
    else out.push(`<${name}>`);
    stack.push(name);
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  let res = out.join('');
  if (inline) res = res.replace(/(\u0000BR)+$/g, '').replace(/^(\u0000BR)+/g, '').replace(/(\u0000BR)+/g, '<br>');
  return res.replace(/<(strong|em|u|sup|sub)><\/\1>/g, '');
}

export function sanitizeRich(html, opts = {}) { return sanitize(html, { inline: false, noopener: !!opts.noopener }); }
export function sanitizeInline(html, opts = {}) { return sanitize(html, { inline: true, noopener: !!opts.noopener }); }

export function richToText(html) {
  return decodeEntities(String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<\/(p|li|h2|h3|blockquote)>/gi, ' ').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ').trim();
}
