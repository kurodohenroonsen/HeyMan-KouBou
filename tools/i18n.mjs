/*
 * Traductions de l'interface (cycle 22).
 *   node tools/i18n.mjs extract   → i18n/sources.json (toutes les chaînes françaises de l'interface et du journal)
 *   node tools/i18n.mjs build     → i18n/en.js, i18n/ja.js à partir de i18n/parts/*.<langue>.json
 *   node tools/i18n.mjs check     → traductions manquantes, en trop, placeholders différents
 * Chaînes reconnues : __('…'), __("…"), __(`…`), __`… ${x} …` (clé « … {0} … »), __n(n, '…', '…'), N_('…'),
 * et dans index.html : les textes et les attributs title, aria-label, placeholder.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LANGS = ['en', 'ja'];
const SCAN_DIRS = ['editor', 'core'];

/* Lit une chaîne JS à partir de i (guillemet ouvrant) ; renvoie { value, end, tpl: [morceaux], exprs } */
/* Une barre « / » ouvre-t-elle une expression régulière ? (d'après ce qui la précède) */
function regexAllowed(src, i) {
  let k = i - 1;
  while (k >= 0 && /\s/.test(src[k])) k--;
  if (k < 0) return true;
  const c = src[k];
  if ('(,=:[!&|?{};+-*%<>~^'.includes(c)) return true;
  const word = /([A-Za-z_$]+)$/.exec(src.slice(Math.max(0, k - 10), k + 1));
  return !!word && ['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'do', 'else', 'yield', 'await'].includes(word[1]);
}
function skipRegex(src, i) {
  let j = i + 1;
  let cls = false;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '\n') return i + 1;
    if (cls) { if (c === ']') cls = false; }
    else if (c === '[') cls = true;
    else if (c === '/') { j++; while (/[a-z]/i.test(src[j])) j++; return j; }
    j++;
  }
  return j;
}

let nested = null;
function readString(src, i) {
  const q = src[i];
  let j = i + 1;
  let value = '';
  const parts = [];
  let exprs = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') {
      const n = src[j + 1];
      if (n === 'n') value += '\n';
      else if (n === 't') value += '\t';
      else if (n === 'u') {
        if (src[j + 2] === '{') { const e = src.indexOf('}', j); value += String.fromCodePoint(parseInt(src.slice(j + 3, e), 16)); j = e + 1; continue; }
        value += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16)); j += 6; continue;
      } else if (n === '\n') { /* continuation */ } else value += n;
      j += 2;
      continue;
    }
    if (c === q) return { value, end: j + 1, parts: [...parts, value], exprs };
    if (q === '`' && c === '$' && src[j + 1] === '{') {
      /* expression : on saute jusqu'à l'accolade fermante correspondante (chaînes imbriquées comprises) */
      let depth = 1;
      let k = j + 2;
      while (k < src.length && depth) {
        const d = src[k];
        if (d === '\'' || d === '"' || d === '`') { k = readString(src, k).end; continue; }
        if (d === '/' && src[k + 1] !== '/' && src[k + 1] !== '*' && regexAllowed(src, k)) { k = skipRegex(src, k); continue; }
        if (d === '{') depth++;
        else if (d === '}') depth--;
        k++;
      }
      /* les __() écrits à l'intérieur de l'expression comptent aussi */
      if (nested) nested.push(...extractJs(src.slice(j + 2, k - 1)));
      parts.push(value);
      value = '';
      exprs++;
      j = k;
      continue;
    }
    value += c;
    j++;
  }
  return { value, end: j, parts: [...parts, value], exprs };
}

const before = (src, i) => (i > 0 ? src[i - 1] : '');
const isIdent = c => /[\w$.]/.test(c);

/* Toutes les chaînes à traduire d'un fichier JS */
export function extractJs(src) {
  const out = [];
  const outer = nested;
  nested = out;
  try {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    /* commentaires */
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; if (i < 2) break; continue; }
    /* expression régulière littérale */
    if (c === '/' && regexAllowed(src, i)) { i = skipRegex(src, i); continue; }
    if (c === '\'' || c === '"' || c === '`') { i = readString(src, i).end; continue; }
    /* __`…` */
    if (c === '_' && src[i + 1] === '_' && src[i + 2] === '`' && !isIdent(before(src, i))) {
      const s = readString(src, i + 2);
      out.push(s.parts.reduce((a, p, k) => a + (k ? `{${k - 1}}` : '') + p, ''));
      i = s.end;
      continue;
    }
    /* __c('contexte', '…') */
    if (src.startsWith('__c(', i) && !isIdent(before(src, i))) {
      let j = i + 4;
      while (/\s/.test(src[j])) j++;
      if ('\'"`'.includes(src[j])) {
        const ctx = readString(src, j);
        j = ctx.end;
        while (/[\s,]/.test(src[j])) j++;
        if ('\'"`'.includes(src[j])) { const s = readString(src, j); if (!s.exprs && !ctx.exprs) out.push(`${ctx.value}|${s.value}`); i = s.end; continue; }
      }
    }
    /* __( / __n( / N_( */
    const m = /^(__n|__|N_)\(/.exec(src.slice(i, i + 4));
    if (m && !isIdent(before(src, i))) {
      let j = i + m[0].length;
      const skipWs = () => { while (/\s/.test(src[j])) j++; };
      if (m[1] === '__n') {
        /* premier argument : jusqu'à la première virgule de premier niveau */
        let depth = 0;
        while (j < src.length) {
          const d = src[j];
          if (d === '\'' || d === '"' || d === '`') { j = readString(src, j).end; continue; }
          if ('([{'.includes(d)) depth++;
          else if (')]}'.includes(d)) depth--;
          else if (d === ',' && depth === 0) break;
          j++;
        }
        j++;
        for (let n = 0; n < 2; n++) {
          skipWs();
          if (!'\'"`'.includes(src[j])) break;
          const s = readString(src, j);
          if (!s.exprs) out.push(s.value);
          j = s.end;
          skipWs();
          if (src[j] === ',') j++;
        }
        i = j;
        continue;
      }
      skipWs();
      if ('\'"`'.includes(src[j])) {
        const s = readString(src, j);
        if (!s.exprs) out.push(s.value);
        i = s.end;
        continue;
      }
    }
    i++;
  }
  } finally { nested = outer; }
  return out;
}

/* Textes de index.html (hors scripts et styles) */
export function extractHtml(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'');
  for (const m of body.matchAll(/\s(?:title|aria-label|placeholder|data-tip|data-tip-desc)="([^"]*)"/g)) { const v = decode(m[1]).trim(); if (/\p{L}/u.test(v)) out.push(v); }
  for (const m of body.matchAll(/>([^<>]+)</g)) { const v = decode(m[1]).replace(/\s+/g, ' ').trim(); if (/\p{L}{2,}/u.test(v)) out.push(v); }
  const title = /<title>([^<]*)<\/title>/.exec(html);
  if (title) out.push(decode(title[1]).trim());
  return [...new Set(out)];
}

function walk(dir) {
  const out = [];
  for (const f of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (f.isDirectory()) continue;
    if (/\.m?js$/.test(f.name)) out.push(join(dir, f.name));
  }
  return out;
}

export function extractAll() {
  const map = new Map();
  const add = (s, file) => { if (!s || !/\p{L}/u.test(s)) return; if (!map.has(s)) map.set(s, new Set()); map.get(s).add(file); };
  for (const dir of SCAN_DIRS) for (const f of walk(dir)) for (const s of extractJs(readFileSync(join(ROOT, f), 'utf8'))) add(s, f);
  for (const s of extractHtml(readFileSync(join(ROOT, 'index.html'), 'utf8'))) add(s, 'index.html');
  return map;
}

export function readParts(lang) {
  const dir = join(ROOT, 'i18n', 'parts');
  const cat = {};
  const conflicts = [];
  if (!existsSync(dir)) return { cat, conflicts };
  for (const f of readdirSync(dir).filter(f => f.endsWith(`.${lang}.json`)).sort()) {
    const part = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const [k, v] of Object.entries(part)) {
      if (k in cat && cat[k] !== v) conflicts.push({ key: k, a: cat[k], b: v, file: f });
      else cat[k] = v;
    }
  }
  return { cat, conflicts };
}

const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

export function check() {
  const sources = extractAll();
  const report = {};
  for (const lang of LANGS) {
    const { cat, conflicts } = readParts(lang);
    const missing = [...sources.keys()].filter(k => !(typeof cat[k] === 'string' && cat[k].length));
    const extra = Object.keys(cat).filter(k => !sources.has(k));
    const badPh = [...sources.keys()].filter(k => typeof cat[k] === 'string' && ph(k) !== ph(cat[k]));
    report[lang] = { total: sources.size, missing, extra, badPh, conflicts };
  }
  return { sources, report };
}

function build() {
  const { sources, report } = check();
  for (const lang of LANGS) {
    const { cat } = readParts(lang);
    const used = {};
    for (const k of [...sources.keys()].sort()) if (cat[k]) used[k] = cat[k];
    writeFileSync(join(ROOT, 'i18n', `${lang}.js`), `/* Généré par node tools/i18n.mjs build — ne pas modifier : éditer i18n/parts/*.${lang}.json */\n(globalThis.__atelierCatalog ||= {}).${lang} = ${JSON.stringify(used, null, 0)};\n`);
    const r = report[lang];
    console.log(`${lang} : ${Object.keys(used).length} / ${r.total} traduites · manquantes ${r.missing.length} · en trop ${r.extra.length} · placeholders différents ${r.badPh.length} · conflits ${r.conflicts.length}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'check';
  mkdirSync(join(ROOT, 'i18n', 'parts'), { recursive: true });
  if (cmd === 'extract') {
    const s = extractAll();
    const list = [...s].sort((a, b) => a[0].localeCompare(b[0])).map(([k, files]) => ({ fr: k, files: [...files].sort() }));
    writeFileSync(join(ROOT, 'i18n', 'sources.json'), JSON.stringify(list, null, 1));
    console.log(`${list.length} chaînes → i18n/sources.json`);
  } else if (cmd === 'build') build();
  else {
    const { report } = check();
    for (const l of LANGS) { const r = report[l]; console.log(`${l} : manquantes ${r.missing.length} / ${r.total} · en trop ${r.extra.length} · placeholders ${r.badPh.length} · conflits ${r.conflicts.length}`); }
    const file = process.argv[3];
    if (file) {
      const { sources } = check();
      const mine = [...sources].filter(([, f]) => f.has(file)).map(([k]) => k);
      for (const l of LANGS) console.log(`${l} manquantes dans ${file} :`, mine.filter(k => report[l].missing.includes(k)).length);
    }
  }
}
