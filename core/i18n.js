/*
 * Traductions : inventaire de tous les textes traduisibles du site (clés stables), écriture assainie,
 * traduction automatique par morceaux de texte (balises préservées), export / import CSV, suivi « à relire ».
 */
import { walk, findNode } from './tree.js';
import { fieldsOf, fieldDef } from './widgets.js';
import { sanitizeRich, sanitizeInline, decodeEntities } from './sanitize.js';
import { escapeHtml } from './escape.js';
import { slugify } from './site.js';
import { collectionTranslatables, setCollectionTranslation } from './collections.js';
import { __ } from './ui-i18n.js';

const clone = v => structuredClone(v);
const filled = v => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim() !== '';
const kindOf = f => (f?.type === 'richtext' ? 'richtext' : f?.type === 'inline' ? 'inline' : 'text');

/* Racines contenant des éléments : pages, composants, en-tête et pied en blocs */
function roots(site) {
  const out = site.pages.map(p => ({ ref: p.id, root: p.root, pageId: p.id }));
  for (const c of Object.values(site.components || {})) out.push({ ref: `c:${c.id}`, root: c.node, componentId: c.id });
  if (site.layout?.header) out.push({ ref: 'h', root: site.layout.header, zone: 'header' });
  if (site.layout?.footer) out.push({ ref: 'f', root: site.layout.footer, zone: 'footer' });
  for (const c of Object.values(site.collections || {})) {
    if (c.card) out.push({ ref: `k:${c.id}`, root: c.card, collectionId: c.id, template: 'card' });
    if (c.detail) out.push({ ref: `d:${c.id}`, root: c.detail, collectionId: c.id, template: 'detail' });
  }
  return out;
}

export function translatableItems(site) {
  const items = [];
  for (const p of site.pages) {
    items.push({ key: `p:${p.id}:title`, kind: 'text', label: __('Titre de la page'), pageId: p.id, field: 'title', values: p.title || {} });
    items.push({ key: `p:${p.id}:seo`, kind: 'text', label: __('Description pour Google'), pageId: p.id, field: 'seo', values: p.seo?.description || {} });
    if (p.seo?.title && Object.values(p.seo.title).some(Boolean)) items.push({ key: `p:${p.id}:seotitle`, kind: 'text', label: __('Titre pour Google'), pageId: p.id, field: 'seotitle', values: p.seo.title });
  }
  for (const r of roots(site)) {
    const where = { pageId: r.pageId || null, componentId: r.componentId || null, zone: r.zone || null, ...(r.collectionId ? { collectionId: r.collectionId, template: r.template } : {}) };
    walk(r.root, n => {
      if (n.ref) return false;
      for (const f of fieldsOf(n.type)) {
        if (f.type === 'list') {
          (n.props?.[f.key] || []).forEach((item, i) => {
            for (const sf of f.fields) if (sf.i18n) items.push({ key: `n:${r.ref}:${n.id}:${f.key}.${i}.${sf.key}`, kind: kindOf(sf), label: `${__(f.itemLabel || f.label)} ${i + 1} · ${__(sf.label)}`, nodeId: n.id, type: n.type, field: `${f.key}.${i}.${sf.key}`, values: item[sf.key] || {}, ...where });
          });
        } else if (f.i18n && !n.bind?.[f.key]) items.push({ key: `n:${r.ref}:${n.id}:${f.key}`, kind: kindOf(f), label: __(f.label), nodeId: n.id, type: n.type, field: f.key, values: n.props?.[f.key] || {}, ...where });
      }
      if (n.advanced?.ariaLabel && Object.values(n.advanced.ariaLabel).some(Boolean)) items.push({ key: `aria:${r.ref}:${n.id}`, kind: 'text', label: __('Libellé accessible'), nodeId: n.id, type: n.type, field: 'aria', values: n.advanced.ariaLabel, ...where });
      return true;
    });
  }
  const menu = Array.isArray(site.menu) ? site.menu.flatMap(it => [it, ...(it.children || [])]) : [];
  for (const it of menu) if (it.kind === 'link' || filled(it.label?.[site.defaultLanguage])) items.push({ key: `m:${it.id}`, kind: 'text', label: __('Entrée du menu'), menuItemId: it.id, field: 'menu', values: it.label || {} });
  items.push({ key: 'footer', kind: 'inline', label: __('Texte du pied de page'), field: 'footer', values: site.footer?.text || {} });
  items.push(...collectionTranslatables(site));
  return items;
}

/* Textes à traduire : présents dans la langue principale, absents dans une autre */
export function missingFrom(site) {
  const def = site.defaultLanguage;
  const others = site.languages.filter(l => l !== def);
  const out = [];
  for (const it of translatableItems(site)) {
    if (!filled(it.values[def])) continue;
    for (const lang of others) if (!filled(it.values[lang])) out.push({ key: it.key, lang, pageId: it.pageId || null, nodeId: it.nodeId || null, field: it.field, componentId: it.componentId || null, zone: it.zone || null, menuItemId: it.menuItemId || null, collectionId: it.collectionId || null, itemId: it.itemId || null, template: it.template || null });
  }
  return out;
}

function parseKey(key) {
  const parts = String(key).split(':');
  if (parts[0] === 'p') return { kind: 'page', pageId: parts[1], what: parts[2] };
  if (parts[0] === 'm') return { kind: 'menu', id: parts[1] };
  if (key === 'footer') return { kind: 'footer' };
  if (parts[0] === 'ci' || parts[0] === 'co') return { kind: 'collection' };
  if (parts[0] === 'n' || parts[0] === 'aria') {
    const comp = ['c', 'k', 'd'].includes(parts[1]);
    const ref = comp ? `${parts[1]}:${parts[2]}` : parts[1];
    const rest = parts.slice(comp ? 3 : 2);
    return { kind: parts[0] === 'n' ? 'node' : 'aria', ref, nodeId: rest[0], field: rest.slice(1).join(':') };
  }
  return { kind: 'unknown' };
}

function rootFor(site, ref) {
  if (ref === 'h') return site.layout?.header;
  if (ref === 'f') return site.layout?.footer;
  if (ref.startsWith('c:')) return site.components?.[ref.slice(2)]?.node;
  if (ref.startsWith('k:')) return site.collections?.[ref.slice(2)]?.card;
  if (ref.startsWith('d:')) return site.collections?.[ref.slice(2)]?.detail;
  return site.pages.find(p => p.id === ref)?.root;
}

const clean = (kind, v) => (kind === 'richtext' ? sanitizeRich(v) : kind === 'inline' ? sanitizeInline(v) : String(v ?? '').replace(/[<>]/g, '').slice(0, 2000));

export function setTranslation(site, key, lang, value) {
  if (!site.languages.includes(lang)) throw new Error(__('Langue non utilisée par le site : {lang}', { lang }));
  const k = parseKey(key);
  if (k.kind === 'collection') {
    const s0 = setCollectionTranslation(site, key, lang, value);
    if (s0.mt?.[`${key}|${lang}`]) { const mt = { ...s0.mt }; delete mt[`${key}|${lang}`]; return { ...s0, mt }; }
    return s0;
  }
  const s = clone(site);
  const missing = () => new Error(__('Texte introuvable : {key}', { key }));
  if (k.kind === 'page') {
    const p = s.pages.find(x => x.id === k.pageId);
    if (!p || !['title', 'seo', 'seotitle'].includes(k.what)) throw missing();
    if (k.what === 'title') p.title = { ...p.title, [lang]: clean('text', value).slice(0, 120) };
    else if (k.what === 'seotitle') p.seo = { ...(p.seo || {}), title: { ...(p.seo?.title || {}), [lang]: clean('text', value).slice(0, 90) } };
    else p.seo = { ...(p.seo || {}), description: { ...(p.seo?.description || {}), [lang]: clean('text', value).slice(0, 300) } };
  } else if (k.kind === 'menu') {
    const it = (s.menu || []).flatMap(x => [x, ...(x.children || [])]).find(x => x.id === k.id);
    if (!it) throw missing();
    it.label = { ...(it.label || {}), [lang]: clean('text', value).slice(0, 60) };
  } else if (k.kind === 'footer') {
    s.footer = { ...s.footer, text: { ...(s.footer?.text || {}), [lang]: clean('inline', value) } };
  } else if (k.kind === 'node' || k.kind === 'aria') {
    const root = rootFor(s, k.ref);
    const n = root && findNode(root, k.nodeId);
    if (!n) throw missing();
    if (k.kind === 'aria') n.advanced = { ...n.advanced, ariaLabel: { ...(n.advanced?.ariaLabel || {}), [lang]: clean('text', value).slice(0, 120) } };
    else {
      const path = k.field.split('.');
      if (path.length === 3) {
        const list = fieldDef(n.type, path[0]);
        const sub = list?.fields?.find(f => f.key === path[2]);
        const item = n.props?.[path[0]]?.[Number(path[1])];
        if (!sub?.i18n || !item) throw missing();
        item[path[2]] = { ...(item[path[2]] || {}), [lang]: clean(kindOf(sub), value) };
      } else {
        const f = fieldDef(n.type, k.field);
        if (!f?.i18n) throw missing();
        n.props[k.field] = { ...(n.props[k.field] || {}), [lang]: clean(kindOf(f), value) };
      }
    }
  } else throw missing();
  if (s.mt) { delete s.mt[`${key}|${lang}`]; }
  return s;
}

/* ---------- Relecture des traductions automatiques ---------- */
export function reviewItems(site) {
  return Object.keys(site.mt || {}).filter(k => site.mt[k]).map(k => { const i = k.lastIndexOf('|'); return { key: k.slice(0, i), lang: k.slice(i + 1) }; });
}

export function markReviewed(site, key, lang) {
  const s = clone(site);
  if (s.mt) delete s.mt[`${key}|${lang}`];
  return s;
}

/* ---------- Traduction automatique ---------- */
/* Traduit les morceaux de texte d'un HTML déjà assaini ; les balises et espaces sont conservés */
export async function translateHtml(html, translateText) {
  const parts = String(html ?? '').split(/(<[^>]*>)/);
  const out = [];
  for (const part of parts) {
    if (!part || part.startsWith('<')) { out.push(part); continue; }
    const text = decodeEntities(part);
    const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!m[2]) { out.push(part); continue; }
    const tr = await translateText(m[2]);
    out.push(escapeHtml(`${m[1]}${String(tr ?? '')}${m[3]}`));
  }
  return out.join('');
}

export async function autoTranslate(site, lang, translateText, { signal, onProgress, onlyMissing = true } = {}) {
  const def = site.defaultLanguage;
  if (lang === def || !site.languages.includes(lang)) throw new Error(__('Choisissez une autre langue que la langue principale.'));
  const todo = translatableItems(site).filter(it => filled(it.values[def]) && (!onlyMissing || !filled(it.values[lang])));
  let s = site;
  let count = 0;
  let errors = 0;
  for (let i = 0; i < todo.length; i++) {
    if (signal?.aborted) return { site: s, count, errors, aborted: true, total: todo.length };
    const it = todo[i];
    try {
      const src = it.values[def];
      const tr = t => translateText(t, def, lang);
      const value = it.kind === 'text' ? String(await tr(src)) : await translateHtml(src, tr);
      s = setTranslation(s, it.key, lang, value);
      s = { ...s, mt: { ...(s.mt || {}), [`${it.key}|${lang}`]: true } };
      count++;
    } catch { errors++; }
    onProgress?.({ done: i + 1, total: todo.length, count, errors });
  }
  return { site: s, count, errors, aborted: !!signal?.aborted, total: todo.length };
}

/* ---------- CSV ---------- */
const cell = v => { const s = String(v ?? ''); return /[\x22,\n\r;]/.test(s) ? `"${s.replace(/\x22/g, '""')}"` : s; };

export function exportCsv(site) {
  const langs = site.languages;
  const lines = [['key', 'type', ...langs].join(',')];
  for (const it of translatableItems(site)) {
    if (!filled(it.values[site.defaultLanguage])) continue;
    lines.push([it.key, it.kind, ...langs.map(l => it.values[l] || '')].map(cell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur === '') quoted = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c !== ''));
}

export function importCsv(site, text) {
  const rows = parseCsv(text);
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  const ki = head.indexOf('key');
  if (ki === -1) throw new Error(__('Fichier CSV non reconnu : la colonne key est absente (exportez d’abord depuis Atelier).'));
  const cols = head.map((h, i) => (site.languages.includes(h) ? { lang: h, i } : null)).filter(Boolean);
  const known = new Map(translatableItems(site).map(it => [it.key, it]));
  let s = site;
  let changed = 0;
  let unknown = 0;
  for (const r of rows) {
    const it = known.get(r[ki]);
    if (!it) { unknown++; continue; }
    let rowChanged = false;
    for (const { lang, i } of cols) {
      const v = r[i];
      if (v === undefined || v === '') continue;
      if (clean(it.kind, v) === (it.values[lang] || '')) continue;
      s = setTranslation(s, it.key, lang, v);
      rowChanged = true;
    }
    if (rowChanged) changed++;
  }
  return { site: s, changed, unknown };
}

export function suggestSlug(site, page, lang) {
  const t = page.title?.[lang] || page.title?.[site.defaultLanguage] || '';
  return slugify(t);
}
