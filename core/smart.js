/*
 * Contenus intelligents (cycle 17), partie sans IA et vérifications :
 *  - schéma JSON d'un élément de collection pour l'IA locale, normalisation et vérification des valeurs lues
 *    (dates d'affiche, heures, liens, choix par libellé), doublons ;
 *  - résumé de la relecture (comptes) ;
 *  - palette depuis un logo : couleurs dominantes, rôles, corrections de contraste (WCAG AA).
 */
import { cleanValue, cleanText, validDate, itemTitle } from './collections.js';
import { listComments } from './review.js';
import { findPage } from './site.js';
import { translate } from './render.js';
import { contrastRatio, palettePairs } from './contrast.js';
import { __, __n } from './ui-i18n.js';

const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/* ---------- Schéma d'un élément ---------- */
const MAXLEN = { text: 1000, richtext: 3000, date: 40, time: 20, url: 300, email: 200, number: 30 };

export function itemSchema(col, { max = 1 } = {}) {
  const props = {};
  for (const f of col.fields) {
    if (f.type === 'image') continue;
    if (f.type === 'toggle') props[f.key] = { type: 'boolean' };
    else if (f.type === 'select') props[f.key] = { type: 'string', enum: ['', ...(f.options || []).map(o => o.value)] };
    else props[f.key] = { type: 'string', maxLength: f.key === col.titleField ? 200 : MAXLEN[f.type] || 500 };
    if (f.type === 'date') props[`${f.key}_year_shown`] = { type: 'boolean' };
  }
  const item = { type: 'object', properties: props, required: Object.keys(props), additionalProperties: false };
  if (max <= 1) return item;
  return { type: 'object', properties: { items: { type: 'array', maxItems: max, items: item } }, required: ['items'], additionalProperties: false };
}

/* Description des champs pour la consigne (libellés, choix possibles) */
export function fieldsBrief(col, lang = 'fr') {
  return col.fields.filter(f => f.type !== 'image').map(f => {
    const opts = f.type === 'select' ? ` (une valeur parmi : ${(f.options || []).map(o => `${o.value} = ${o.label?.[lang] || o.label?.fr || o.value}`).join(', ')} ; vide si inconnu)` : '';
    const how = { date: ' (telle qu’écrite ; indique dans ' + `${f.key}_year_shown` + ' si l’année est écrite)', time: ' (telle qu’écrite)', toggle: ' (vrai ou faux)', richtext: ' (texte simple, paragraphes séparés par une ligne vide)' }[f.type] || '';
    return `- ${f.key} : ${f.label}${how}${opts}`;
  }).join('\n');
}

/* ---------- Normalisation ---------- */
const MONTHS = [
  ['janvier', 'janv', 'jan', 'januari', 'januar', 'january', 'jänner'], ['fevrier', 'fevr', 'fev', 'februari', 'februar', 'february', 'feb'],
  ['mars', 'maart', 'marz', 'march', 'mar', 'maa'], ['avril', 'avr', 'april', 'apr'], ['mai', 'mei', 'may'], ['juin', 'juni', 'june', 'jun'],
  ['juillet', 'juil', 'juli', 'july', 'jul'], ['aout', 'augustus', 'august', 'aug'], ['septembre', 'sept', 'sep', 'september'],
  ['octobre', 'oct', 'oktober', 'october', 'okt'], ['novembre', 'nov', 'november'], ['decembre', 'dec', 'december', 'dezember', 'dez']
];
const monthOf = w => { const x = fold(w).replace(/\.$/, ''); const i = MONTHS.findIndex(list => list.includes(x)); return i < 0 ? 0 : i + 1; };
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function nextOccurrence(m, d, today) {
  const y0 = Number(today.slice(0, 4));
  for (const y of [y0, y0 + 1, y0 + 2, y0 + 3, y0 + 4]) {
    const v = iso(y, m, d);
    if (validDate(v) && v >= today) return v;
  }
  throw new Error(__('Date impossible (jour et mois).'));
}

export function normalizeDate(raw, { today, yearShown = true } = {}) {
  const s = fold(raw).replace(/(\d)(er|e|st|nd|rd|th)\b/g, '$1');
  if (!s) return '';
  let y = 0;
  let m = 0;
  let d = 0;
  let r;
  if ((r = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/))) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = s.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/))) { [d, m] = [+r[1], +r[2]]; y = r[3] ? (r[3].length === 2 ? 2000 + +r[3] : +r[3]) : 0; }
  else if ((r = s.match(/\b(\d{1,2})\.?\s+([a-z]{3,10})\.?(?:\s+(\d{4}))?\b/)) && monthOf(r[2])) { [d, m, y] = [+r[1], monthOf(r[2]), r[3] ? +r[3] : 0]; }
  else if ((r = s.match(/\b([a-z]{3,10})\.?\s+(\d{1,2}),?(?:\s+(\d{4}))?\b/)) && monthOf(r[1])) { [m, d, y] = [monthOf(r[1]), +r[2], r[3] ? +r[3] : 0]; }
  else throw new Error(__('Date non reconnue : « {value} ».', { value: String(raw).slice(0, 40) }));
  if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error(__('Date impossible : « {value} ».', { value: String(raw).slice(0, 40) }));
  if (!y || !yearShown) {
    if (!today) throw new Error(__('Date sans année.'));
    return nextOccurrence(m, d, today);
  }
  const v = iso(y, m, d);
  if (!validDate(v)) throw new Error(__('Date impossible : « {value} ».', { value: String(raw).slice(0, 40) }));
  return v;
}

export function normalizeTime(raw) {
  const s = fold(raw);
  if (!s) return '';
  const r = s.match(/^(\d{1,2})\s*(?:h|:|\.|u|uhr)?\s*(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?(?:\s*uhr)?$/);
  if (!r) throw new Error(__('Heure non reconnue : « {value} ».', { value: String(raw).slice(0, 20) }));
  let h = +r[1];
  const min = r[2] ? +r[2] : 0;
  if (r[3]) { const pm = r[3].startsWith('p'); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
  if (h > 23 || min > 59) throw new Error(__('Heure impossible : « {value} ».', { value: String(raw).slice(0, 20) }));
  return `${pad(h)}:${pad(min)}`;
}

export function normalizeUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s || /^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(s)) return `https://${s}`;
  return s;
}

export function normalizeNumber(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw ?? '').replace(/[\s  ]/g, '').replace(',', '.');
  return s === '' ? '' : Number(s);
}

export function normalizeSelect(f, raw) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  const opts = f.options || [];
  if (opts.some(o => o.value === v)) return v;
  const x = fold(v);
  const labels = o => [o.value, ...Object.values(o.label || {})].map(fold);
  const exact = opts.find(o => labels(o).includes(x));
  if (exact) return exact.value;
  if (x.length >= 4) {
    const part = opts.filter(o => labels(o).some(l => l.split(/[\s-]+/).includes(x) || l.startsWith(x)));
    if (part.length === 1) return part[0].value;
  }
  return v;
}

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function textToRich(text) {
  const plain = String(text ?? '').replace(/<[^>]*>/g, '').replace(/\r/g, '');
  return plain.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${p.split('\n').map(l => escapeHtml(l.trim())).join('<br>')}</p>`).join('');
}

/* Valeurs lues par l'IA → valeurs d'élément vérifiées ; ce qui ne passe pas est écarté avec sa raison */
export function cleanExtracted(site, col, raw, { today, lang } = {}) {
  const def = lang || site.defaultLanguage;
  const values = {};
  const dropped = [];
  const found = [];
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const f of col.fields) {
    if (f.type === 'image' || !(f.key in src)) continue;
    let v = src[f.key];
    if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) continue;
    if (f.type === 'toggle' && v === false) continue;
    try {
      if (f.type === 'date') v = normalizeDate(v, { today, yearShown: src[`${f.key}_year_shown`] !== false });
      else if (f.type === 'time') v = normalizeTime(v);
      else if (f.type === 'url') v = normalizeUrl(v);
      else if (f.type === 'email') v = String(v).trim().replace(/^mailto:/i, '');
      else if (f.type === 'number') v = normalizeNumber(v);
      else if (f.type === 'select') v = normalizeSelect(f, v);
      else if (f.type === 'richtext') v = textToRich(v);
      else if (f.type === 'text') v = cleanText(v, 1000);
      const clean = cleanValue(f, v);
      if (clean === '' || clean === null) continue;
      values[f.key] = f.i18n ? { [def]: clean } : clean;
      found.push(f.key);
    } catch (e) {
      dropped.push({ key: f.key, label: f.label, raw: typeof src[f.key] === 'string' ? src[f.key].slice(0, 120) : src[f.key], reason: e.message });
    }
  }
  const tf = col.fields.find(f => f.key === col.titleField);
  const title = values[col.titleField];
  const missingTitle = !tf || !(typeof title === 'object' ? title[def] : title);
  return { values, found, dropped, missingTitle };
}

export function findDuplicates(site, col, list, lang = site.defaultLanguage) {
  const seen = new Set(col.items.map(it => fold(itemTitle(site, col, it, lang))).filter(Boolean));
  const out = [];
  list.forEach((x, i) => {
    const v = x.values?.[col.titleField];
    const t = fold(typeof v === 'object' && v ? (v[lang] ?? Object.values(v)[0]) : v);
    if (!t) return;
    if (seen.has(t)) out.push(i); else seen.add(t);
  });
  return out;
}

/* ---------- Relecture ---------- */
export function reviewDigest(site) {
  const all = listComments(site, {});
  const open = all.filter(c => !c.resolved);
  const def = site.defaultLanguage;
  const pageTitle = id => { const p = findPage(site, id); return p ? (translate(site, p.title, def) || __('Sans titre')) : __('page supprimée'); };
  const group = (list, key) => {
    const m = new Map();
    for (const c of list) { const k = key(c); m.set(k, (m.get(k) || 0) + 1); }
    return m;
  };
  const byPageOpen = group(open, c => c.anchor?.pageId || '');
  const byPage = [...byPageOpen].map(([pageId, n]) => ({ pageId, title: pageTitle(pageId), open: n })).sort((a, b) => b.open - a.open || a.title.localeCompare(b.title));
  const totalBy = group(all, c => c.author?.name || '?');
  const openBy = group(open, c => c.author?.name || '?');
  const byAuthor = [...totalBy].map(([name, total]) => ({ name, total, open: openBy.get(name) || 0 })).sort((a, b) => b.open - a.open || b.total - a.total || a.name.localeCompare(b.name));
  const o = open[0];
  return {
    total: all.length, open: open.length, resolved: all.length - open.length, byPage, byAuthor,
    oldestOpen: o ? { id: o.id, at: o.at, author: o.author?.name, page: pageTitle(o.anchor?.pageId), text: o.text.slice(0, 120) } : null,
    openComments: open.map(c => ({ id: c.id, text: c.text, author: c.author?.name || '?', page: pageTitle(c.anchor?.pageId), label: c.anchor?.label || '', pageId: c.anchor?.pageId, nodeId: c.anchor?.nodeId }))
  };
}

export function digestText(d) {
  if (!d.total) return __('Aucun commentaire.');
  const parts = [__('{open} ({resolved})', { open: __n(d.open, '{n} commentaire ouvert', '{n} commentaires ouverts'), resolved: __n(d.resolved, '{n} résolu', '{n} résolus') })];
  if (d.byPage.length) parts.push(__('par page : {list}', { list: d.byPage.map(p => __('{n} sur « {page} »', { n: p.open, page: p.title })).join(', ') }));
  if (d.byAuthor.some(a => a.open)) parts.push(__('par auteur : {list}', { list: d.byAuthor.filter(a => a.open).map(a => __('{name} : {n}', { name: a.name, n: a.open })).join(', ') }));
  if (d.oldestOpen) parts.push(__('le plus ancien en attente : {author}, {date}, « {text} »', { author: d.oldestOpen.author, date: String(d.oldestOpen.at).slice(0, 10), text: d.oldestOpen.text.slice(0, 60) }));
  return __('{parts}.', { parts: parts.reduce((x, y) => __('{a} ; {b}', { a: x, b: y })) });
}

/* ---------- Couleurs ---------- */
const hex2 = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
const rgbHex = (r, g, b) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const hexRgb = h => { const m = String(h).replace('#', ''); return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)); };

export function hexToHsl(h) {
  const [r, g, b] = hexRgb(h).map(x => x / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: hh * 60, s, l };
}

export function hslToHex({ h, s, l }) {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/* Couleurs dominantes d'une image (RGBA) : seaux de 16 niveaux par canal, puis regroupement des nuances proches */
export function dominantColors(data, { max = 8, minWeight = 0.02, merge = 48 } = {}) {
  const buckets = new Map();
  let total = 0;
  const step = data.length > 4 * 400000 ? 4 * Math.ceil(data.length / (4 * 400000)) : 4;
  for (let i = 0; i + 3 < data.length; i += step) {
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const b = buckets.get(key) || buckets.set(key, { n: 0, r: 0, g: 0, b: 0 }).get(key);
    b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
    total++;
  }
  if (!total) return [];
  const groups = [];
  for (const b of [...buckets.values()].sort((x, y) => y.n - x.n)) {
    const c = [b.r / b.n, b.g / b.n, b.b / b.n];
    const g = groups.find(x => Math.hypot(x.r / x.n - c[0], x.g / x.n - c[1], x.b / x.n - c[2]) < merge);
    if (g) { g.n += b.n; g.r += b.r; g.g += b.g; g.b += b.b; } else groups.push({ ...b });
  }
  return groups.map(g => ({ hex: rgbHex(g.r / g.n, g.g / g.n, g.b / g.n), weight: g.n / total }))
    .filter(g => g.weight >= minWeight).sort((a, b) => b.weight - a.weight).slice(0, max);
}

const WHITE = '#ffffff';
/* Couleurs du logo → palette c1…c6 dont toutes les paires passent WCAG AA (4,5:1) ; corrections listées */
export function paletteFromColors(colors, { fallback = '#0f766e' } = {}) {
  const chroma = colors.map(c => ({ ...c, hsl: hexToHsl(c.hex) })).filter(c => c.hsl.s >= 0.3 && c.hsl.l >= 0.12 && c.hsl.l <= 0.9);
  const score = c => c.weight * c.hsl.s * Math.min(1, contrastRatio(c.hex, WHITE) / 4.5);
  const ranked = [...chroma].sort((a, b) => score(b) - score(a));
  const prim = ranked[0];
  const warning = prim ? '' : __('Le logo n’a pas de couleur vive : la couleur principale du site est gardée, le reste en découle.');
  const p1 = prim ? prim.hsl : hexToHsl(fallback);
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const sec = chroma.filter(c => c !== prim && hueDist(c.hsl.h, p1.h) >= 30).sort((a, b) => b.weight * b.hsl.s - a.weight * a.hsl.s)[0];
  const roles = { c1: prim ? __('du logo') : __('gardée'), c2: sec ? __('du logo') : __('dérivée de la principale'), c3: __('dérivée'), c4: __('dérivée'), c5: __('dérivée'), c6: __('blanc') };
  const pal = {
    c1: prim ? prim.hex : hslToHex(p1),
    c2: sec ? sec.hex : hslToHex({ h: (p1.h + 35) % 360, s: Math.max(0.6, p1.s), l: 0.72 }),
    c3: hslToHex({ h: p1.h, s: Math.min(p1.s, 0.25), l: 0.11 }),
    c4: hslToHex({ h: p1.h, s: Math.min(p1.s, 0.3), l: 0.975 }),
    c5: hslToHex({ h: p1.h, s: Math.min(p1.s, 0.12), l: 0.4 }),
    c6: WHITE
  };
  const start = { ...pal };
  const ok = (fg, bg) => contrastRatio(pal[fg], pal[bg]) >= 4.5;
  const shift = (key, dir, test) => {
    const hsl = hexToHsl(pal[key]);
    for (let i = 0; i < 100 && !test(); i++) {
      hsl.l = Math.max(0, Math.min(1, hsl.l + dir * 0.01));
      pal[key] = hslToHex(hsl);
    }
  };
  shift('c1', -1, () => ok('c6', 'c1') && ok('c1', 'c4'));
  shift('c5', -1, () => ok('c5', 'c4'));
  shift('c2', +1, () => ok('c3', 'c2'));
  shift('c3', -1, () => ok('c3', 'c2') && ok('c3', 'c4') && ok('c3', 'c6') && ok('c6', 'c3'));
  const WHY = {
    c1: __('assombrie pour le texte blanc des boutons et les liens sur le fond'),
    c2: __('éclaircie pour que le texte reste lisible sur les boutons secondaires'),
    c3: __('assombrie pour le texte'),
    c5: __('assombrie pour le texte discret sur le fond')
  };
  const changes = Object.keys(WHY).filter(k => start[k] !== pal[k]).map(k => ({ key: k, from: start[k], to: pal[k], why: WHY[k] }));
  const pairs = palettePairs(pal);
  return { palette: pal, roles, changes, pairs, ok: pairs.every(x => x.ok), warning, source: { primary: prim?.hex || null, secondary: sec?.hex || null } };
}
