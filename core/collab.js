/*
 * Synchronisation entre participants, sans serveur (inspiré de Figma et des CRDT) :
 * chaque modification devient une liste d'opérations sur des chemins du document JSON ;
 * chaque chemin est un registre « le dernier qui écrit gagne » horodaté par une horloge logique hybride.
 * Les éléments de listes sont repérés par leur identifiant (id, key ou value) ; l'ordre d'une liste
 * est un registre à part ; une suppression plus récente gagne sur l'intérieur de l'élément.
 * Tous les participants qui ont reçu les mêmes opérations obtiennent le même document.
 */

import { N_ } from './ui-i18n.js';

const IGNORED_TOP = new Set(['collab']);
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const DATA_IMG = /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i;

/* ---------- Horloge logique hybride : « 0001730000000000.0003.replica » ---------- */
export function createClock(replica, now = () => Date.now()) {
  let last = 0;
  let count = 0;
  const fmt = (ms, c) => `${String(ms).padStart(16, '0')}.${String(c).padStart(4, '0')}.${replica}`;
  return {
    tick() {
      const t = Math.floor(now());
      if (t > last) { last = t; count = 0; } else count++;
      return fmt(last, count);
    },
    observe(ts) {
      const [ms, c] = String(ts).split('.');
      const m = Number(ms);
      if (!Number.isFinite(m)) return;
      if (m > last) { last = m; count = Number(c) || 0; } else if (m === last) count = Math.max(count, Number(c) || 0);
    }
  };
}

/* ---------- Chemins ---------- */
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const escKey = k => (k.startsWith('#') || k.startsWith('~') ? `~${k}` : k);
const unescKey = k => (k.startsWith('~') ? k.slice(1) : k);
export const pathKey = p => JSON.stringify(p);
const orderKey = p => `${pathKey(p)}|o`;

function idKind(arr) {
  if (!Array.isArray(arr) || !arr.length || !arr.every(isObj)) return null;
  for (const [prop, ch] of [['id', 'i'], ['key', 'k'], ['value', 'v']]) {
    const ids = arr.map(e => e[prop]);
    if (ids.every(x => typeof x === 'string' || typeof x === 'number') && new Set(ids.map(String)).size === ids.length) return { prop, ch };
  }
  return null;
}
const KIND_PROP = { i: 'id', k: 'key', v: 'value' };
const elemSeg = (kind, el) => `#${kind.ch}:${String(el[kind.prop])}`;
function parseElem(seg) {
  const m = /^#([ikv]):(.*)$/s.exec(seg);
  return m ? { prop: KIND_PROP[m[1]], id: m[2] } : null;
}

function same(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!same(a[i], b[i])) return false; return true; }
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!(k in b) || !same(a[k], b[k])) return false;
  return true;
}

/* ---------- Différences entre deux états ---------- */
export function diffDocs(a, b) {
  const ops = [];
  const walk = (x, y, p) => {
    if (x === y || same(x, y)) return;
    if (isObj(x) && isObj(y)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
        if (!p.length && IGNORED_TOP.has(k)) continue;
        const seg = escKey(k);
        if (!(k in y) || y[k] === undefined) { if (k in x && x[k] !== undefined) ops.push({ p: [...p, seg], del: true }); }
        else if (!(k in x) || x[k] === undefined) ops.push({ p: [...p, seg], v: y[k] });
        else walk(x[k], y[k], [...p, seg]);
      }
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      const kx = idKind(x);
      const ky = idKind(y);
      const kind = kx && ky ? (kx.prop === ky.prop ? kx : null) : (kx || ky);
      if (kind && (!x.length || kx) && (!y.length || ky)) {
        const mx = new Map(x.map(e => [String(e[kind.prop]), e]));
        const my = new Map(y.map(e => [String(e[kind.prop]), e]));
        for (const [id] of mx) if (!my.has(id)) ops.push({ p: [...p, `#${kind.ch}:${id}`], del: true });
        for (const [id, e] of my) {
          if (!mx.has(id)) ops.push({ p: [...p, `#${kind.ch}:${id}`], v: e });
          else walk(mx.get(id), e, [...p, `#${kind.ch}:${id}`]);
        }
        const ox = x.map(e => String(e[kind.prop]));
        const oy = y.map(e => String(e[kind.prop]));
        if (ox.length !== oy.length || ox.some((id, i) => id !== oy[i])) ops.push({ p, order: oy });
        return;
      }
    }
    ops.push({ p, v: y });
  };
  walk(a, b, []);
  return ops;
}

/* ---------- Application (copie du seul chemin modifié) ---------- */
function getAt(doc, p) {
  let cur = doc;
  for (const seg of p) {
    if (cur === undefined || cur === null) return undefined;
    const el = parseElem(seg);
    if (el) { if (!Array.isArray(cur)) return undefined; cur = cur.find(e => isObj(e) && String(e[el.prop]) === el.id); }
    else { if (!isObj(cur)) return undefined; cur = cur[unescKey(seg)]; }
  }
  return cur;
}

function reorder(arr, ids) {
  if (!ids) return arr;
  const kind = idKind(arr);
  if (!kind) return arr;
  const by = new Map(arr.map(e => [String(e[kind.prop]), e]));
  const out = [];
  const used = new Set();
  for (const id of ids) if (by.has(id) && !used.has(id)) { out.push(by.get(id)); used.add(id); }
  const rest = arr.filter(e => !used.has(String(e[kind.prop]))).sort((a, b) => String(a[kind.prop]).localeCompare(String(b[kind.prop])));
  const res = [...out, ...rest];
  return res.every((e, i) => e === arr[i]) ? arr : res;
}

/* Remplace la valeur au chemin p par fn(ancienne) ; renvoie le nouveau document, ou null si le parent n'existe pas */
function updateAt(doc, p, fn) {
  if (!p.length) return fn(doc);
  const [seg, ...rest] = p;
  const el = parseElem(seg);
  if (el) {
    if (!Array.isArray(doc)) return null;
    const i = doc.findIndex(e => isObj(e) && String(e[el.prop]) === el.id);
    if (!rest.length) {
      const nv = fn(i >= 0 ? doc[i] : undefined);
      if (nv === undefined) return i >= 0 ? doc.filter((_, j) => j !== i) : doc;
      const out = [...doc];
      if (i >= 0) out[i] = nv; else out.push(nv);
      return out;
    }
    if (i < 0) return null;
    const child = updateAt(doc[i], rest, fn);
    if (child === null) return null;
    if (child === doc[i]) return doc;
    const out = [...doc];
    out[i] = child;
    return out;
  }
  if (!isObj(doc)) return null;
  const k = unescKey(seg);
  if (!rest.length) {
    const nv = fn(doc[k]);
    if (nv === undefined) { if (!(k in doc)) return doc; const { [k]: _, ...o } = doc; void _; return o; }
    return { ...doc, [k]: nv };
  }
  if (!(k in doc)) return null;
  const child = updateAt(doc[k], rest, fn);
  if (child === null) return null;
  return child === doc[k] ? doc : { ...doc, [k]: child };
}

function applyOne(doc, op, orders) {
  if (op.order) {
    const r = updateAt(doc, op.p, arr => (Array.isArray(arr) ? reorder(arr, op.order) : arr));
    return r === null ? doc : r;
  }
  const last = op.p[op.p.length - 1];
  const parentPath = op.p.slice(0, -1);
  let r = updateAt(doc, op.p, () => (op.del ? undefined : structuredClone(op.v)));
  if (r === null) return doc;
  if (parseElem(last)) {
    const ids = orders?.get(orderKey(parentPath));
    if (ids || !op.del) {
      const r2 = updateAt(r, parentPath, arr => (Array.isArray(arr) ? reorder(arr, ids || arr.map(e => String(e[parseElem(last).prop]))) : arr));
      if (r2 !== null) r = r2;
    }
  }
  return r;
}

/* Application simple (sans horodatage) : pour mettre à jour l'historique d'annulation */
export function applyOps(doc, ops) {
  let d = doc;
  const orders = new Map();
  for (const op of ops) {
    if (op.order) orders.set(orderKey(op.p), op.order);
    d = applyOne(d, op, orders);
  }
  return d;
}

/* ---------- Réplica : document + table des versions ---------- */
export function createReplica({ replica, doc, docId = null, table = {}, now } = {}) {
  const clock = createClock(replica || 'r' + Math.random().toString(36).slice(2, 8), now);
  const tbl = new Map(Object.entries(table));
  for (const e of tbl.values()) clock.observe(e.ts);
  const orders = () => new Map([...tbl].filter(([k, e]) => k.endsWith('|o') && e.order).map(([k, e]) => [k, e.order]));
  const r = {
    replica, doc, docId,
    local(next) {
      if (r.doc === null || r.doc === undefined) { r.doc = next; return []; }
      const ops = diffDocs(r.doc, next);
      if (!ops.length) { r.doc = next; return []; }
      const ts = clock.tick();
      const stamped = ops.map(op => ({ ...op, ts }));
      for (const op of stamped) tbl.set(op.order ? orderKey(op.p) : pathKey(op.p), op.order ? { ts, order: op.order } : op.del ? { ts, del: true } : { ts });
      r.doc = next;
      return stamped;
    },
    receive(ops) {
      const applied = [];
      const sorted = [...ops].filter(o => o && Array.isArray(o.p) && typeof o.ts === 'string').sort((a, b) => (a.p.length - b.p.length) || ((a.order ? 1 : 0) - (b.order ? 1 : 0)));
      let d = r.doc;
      let ord = null;
      for (const op of sorted) {
        const key = op.order ? orderKey(op.p) : pathKey(op.p);
        const cur = tbl.get(key);
        clock.observe(op.ts);
        if (cur && cur.ts >= op.ts) continue;
        let buried = false;
        for (let i = 1; i < op.p.length; i++) { const t = tbl.get(pathKey(op.p.slice(0, i))); if (t?.del && t.ts > op.ts) { buried = true; break; } }
        tbl.set(key, op.order ? { ts: op.ts, order: op.order } : op.del ? { ts: op.ts, del: true } : { ts: op.ts });
        if (buried) continue;
        ord ||= orders();
        if (op.order) ord.set(key, op.order);
        const nd = applyOne(d, op, ord);
        if (nd !== d) { d = nd; applied.push(op); }
      }
      r.doc = d;
      return { doc: d, applied };
    },
    summary() { return Object.fromEntries([...tbl].map(([k, e]) => [k, e.ts])); },
    delta(peer = {}) {
      const out = [];
      for (const [k, e] of tbl) {
        if (peer[k] && peer[k] >= e.ts) continue;
        if (k.endsWith('|o')) { out.push({ p: JSON.parse(k.slice(0, -2)), order: e.order, ts: e.ts }); continue; }
        const p = JSON.parse(k);
        if (e.del) { out.push({ p, del: true, ts: e.ts }); continue; }
        const v = getAt(r.doc, p);
        if (v !== undefined) out.push({ p, v: structuredClone(v), ts: e.ts });
      }
      return out.sort((a, b) => a.p.length - b.p.length);
    },
    table() { return Object.fromEntries(tbl); },
    snapshot() { return { docId: r.docId, doc: r.doc, table: Object.fromEntries(tbl) }; }
  };
  return r;
}

/* ---------- Vérification des opérations reçues ---------- */
function validAsset(a) {
  return isObj(a) && typeof a.file === 'string' && /^[a-z0-9._-]+$/i.test(a.file) && DATA_IMG.test(String(a.dataUrl || '')) && (a.variants === undefined || (Array.isArray(a.variants) && a.variants.every(v => isObj(v) && DATA_IMG.test(String(v.dataUrl || '')) && /^[a-z0-9._-]+$/i.test(String(v.file || '')))));
}

export function validateOps(ops, { role = 'editor' } = {}) {
  const ok = [];
  const rejected = [];
  for (const op of Array.isArray(ops) ? ops : []) {
    const reason = (() => {
      if (!op || !Array.isArray(op.p) || typeof op.ts !== 'string' || op.ts.length > 80) return N_('opération mal formée');
      if (op.p.length > 40 || op.p.some(s => typeof s !== 'string' || s.length > 200)) return N_('chemin invalide');
      if (op.p.some(s => FORBIDDEN.has(unescKey(s)))) return N_('chemin interdit');
      if (!op.p.length) return N_('remplacement complet interdit');
      if (IGNORED_TOP.has(op.p[0])) return N_('partie privée');
      if (op.order && (!Array.isArray(op.order) || op.order.some(x => typeof x !== 'string'))) return N_('ordre invalide');
      if (role === 'reviewer' && op.p[0] !== 'review') return N_('relecteur : seuls les commentaires sont autorisés');
      if (op.p[0] === 'assets' && !op.del && !op.order) {
        if (op.p.length === 1) return isObj(op.v) && Object.values(op.v).every(validAsset) ? null : N_('image non valide');
        if (op.p.length === 2) return validAsset(op.v) ? null : N_('image non valide');
        if (op.p[2] === 'dataUrl' && !DATA_IMG.test(String(op.v))) return N_('image non valide');
      }
      if ('v' in op && JSON.stringify(op.v ?? null).length > 30_000_000) return N_('valeur trop grande');
      return null;
    })();
    if (reason) rejected.push({ op, reason }); else ok.push(op);
  }
  return { ok, rejected };
}

export { getAt };
