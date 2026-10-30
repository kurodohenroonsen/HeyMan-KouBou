/*
 * Journal d'Atelier : événements structurés (code stable + message + données), niveaux, tampon circulaire,
 * parcours mesurés, masquage des secrets avant écriture. Sans dépendance au navigateur (testé sous Node).
 *
 *   log.info('publish.php.ok', 'Site publié', { written: 42 })
 *   const f = log.flow('publish.php', 'Publication OVH', { files: 42 }); f.step('upload', 'Envoi'); f.ok('Site publié');
 */
import { __, __c } from './ui-i18n.js';

export const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, off: 99 };
const LABEL = { trace: 'TRACE', debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR' };
const CODE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
export const validCode = c => CODE.test(String(c || ''));

/* ---------- Masquage ---------- */
const SECRET_KEYS = new Set(['token', 'secret', 'password', 'passphrase', 'authorization', 'jwk', 'd', 'x-atelier-token', 'apikey', 'api_key', 'privatekey', 'cookie', 'otp', 'pin']);
const SECRET_PART = /token|secret|password|private|passphrase/i;
const isSecretKey = k => SECRET_KEYS.has(String(k).toLowerCase()) || SECRET_PART.test(String(k));
const HEX64 = /^[0-9a-f]{64}$/i;
const EMAIL = /([A-Za-z0-9._%+-]{1,2})[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
const URL_SECRET = /([?&](?:token|secret|key|code|access_token|password)=)[^&#\s"]*/gi;
const JOIN = /#join=[^\s"]*/g;
const ROOM = /([?&]signal=)([0-9a-f]{8})[0-9a-f]{56}/gi;
const DATA_URL = /^data:([a-z0-9.+/-]+)?(;[^,]*)?,(.*)$/is;
const MAX_STR = 300;
const MAX_ARR = 20;
const MAX_DEPTH = 5;
const kb = n => `${Math.max(1, Math.round(n / 1024))} Ko`;

export function redactString(s) {
  let v = String(s);
  const d = DATA_URL.exec(v.slice(0, 200));
  if (d && v.length > 100) {
    const payload = v.length - v.indexOf(',') - 1;
    return `data:${d[1] || 'application/octet-stream'} (${kb(/;base64/i.test(d[2] || '') ? payload * 0.75 : payload)})`;
  }
  if (HEX64.test(v)) return '[masqué]';
  v = v.replace(ROOM, '$1$2…').replace(URL_SECRET, '$1[masqué]').replace(JOIN, '#join=[masqué]').replace(EMAIL, '$1…@$2');
  if (v.length > MAX_STR) v = `${v.slice(0, MAX_STR)}… (${s.length} car.)`;
  return v;
}

export function errInfo(e) {
  if (e === null || e === undefined) return { name: 'Error', message: String(e) };
  if (typeof e !== 'object') return { name: 'Error', message: redactString(String(e)) };
  const out = { name: e.name || e.constructor?.name || 'Error', message: redactString(e.message ?? String(e)) };
  if (e.code !== undefined) out.code = e.code;
  if (e.status !== undefined) out.status = e.status;
  if (typeof e.stack === 'string') out.stack = e.stack.split('\n').slice(0, 5).map(l => redactString(l.trim())).join('\n');
  if (e.cause) out.cause = redactString(e.cause?.message || String(e.cause));
  return out;
}

export function redact(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'string') return redactString(value);
  if (t === 'number' || t === 'boolean') return value;
  if (t === 'bigint') return String(value);
  if (t === 'function') return '[fonction]';
  if (t === 'symbol') return String(value);
  if (value instanceof Error || (value && typeof value.message === 'string' && typeof value.stack === 'string')) return errInfo(value);
  if (value instanceof Date) return Number.isNaN(+value) ? 'Invalid Date' : value.toISOString();
  if (ArrayBuffer.isView(value)) return `${value.constructor.name} (${kb(value.byteLength)})`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer (${kb(value.byteLength)})`;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return `Blob ${value.type || ''} (${kb(value.size)})`.replace('  ', ' ');
  if (typeof Node !== 'undefined' && value instanceof Node) return `<${value.nodeName?.toLowerCase()}>`;
  if (seen.has(value)) return '[cycle]';
  if (depth >= MAX_DEPTH) return '[…]';
  seen.add(value);
  try {
    if (value instanceof Map) return redact(Object.fromEntries([...value].slice(0, MAX_ARR)), depth, seen);
    if (value instanceof Set) value = [...value];
    if (Array.isArray(value)) {
      const out = value.slice(0, MAX_ARR).map(v => redact(v, depth + 1, seen));
      if (value.length > MAX_ARR) out.push(`… +${value.length - MAX_ARR}`);
      return out;
    }
    const out = {};
    let n = 0;
    for (const [k, v] of Object.entries(value)) {
      if (++n > 40) { out['…'] = `+${Object.keys(value).length - 40} clés`; break; }
      out[k] = isSecretKey(k) && v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' ? '[masqué]' : redact(v, depth + 1, seen);
    }
    return out;
  } finally { seen.delete(value); }
}

/* ---------- En-tête : libellés des clés d'environnement (les clés restent stables, seul l'affichage change) ---------- */
const headerLabels = () => ({
  date: __c('env', 'date'), fuseau: __c('env', 'fuseau'), adresse: __c('env', 'adresse'), navigateur: __c('env', 'navigateur'), agent: __c('env', 'agent'),
  plateforme: __c('env', 'plateforme'), langues: __c('env', 'langues'), écran: __c('env', 'écran'), machine: __c('env', 'machine'), réseau: __c('env', 'réseau'),
  stockage: __c('env', 'stockage'), journal: __c('env', 'journal'), mémoireJs: __c('env', 'mémoireJs'), ia: __c('env', 'ia'), projet: __c('env', 'projet'),
  éditeur: __c('env', 'éditeur'), collaboration: __c('env', 'collaboration'), interface: __c('env', 'interface'), état: __c('env', 'état'),
  paramètres: __c('env', 'paramètres'), fournisseur: __c('env', 'fournisseur'), version: __c('env', 'version')
});
export const headerLabel = k => headerLabels()[k] || k;

/* ---------- Format ---------- */
const pad = (n, l = 2) => String(n).padStart(l, '0');
function clockText(t, tz) {
  const d = new Date(t);
  if (tz === 'UTC') return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
export function dataText(data, max = 600) {
  if (data === undefined || data === null) return '';
  let s;
  try { s = JSON.stringify(data); } catch { s = '"[données illisibles]"'; }
  if (!s || s === '{}') return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
export function formatEntry(e, { tz } = {}) {
  const flow = e.flow ? ` [${e.flow}${e.ms !== null && e.ms !== undefined ? ` · ${e.ms} ms` : ''}]` : '';
  const data = dataText(e.data);
  return `${clockText(e.t, tz)} +${(e.rel / 1000).toFixed(2)}s ${LABEL[e.level] || e.level} ${e.code}${flow} ${e.msg}${data ? ` ${data}` : ''}`;
}

/* ---------- Journal ---------- */
export function createLogger({ capacity = 5000, now = () => Date.now(), keep = 'debug', sinks = [] } = {}) {
  const start = now();
  let buf = [];
  let seq = 0;
  let dropped = 0;
  let keepLevel = keep;
  const counts = { error: 0, warn: 0 };
  const listeners = new Set();
  const flowSeq = new Map();
  const outs = [...sinks];

  const lowest = () => Math.min(LEVELS[keepLevel] ?? 20, ...outs.map(s => LEVELS[s.level] ?? 30));
  function add(level, code, msg, data, extra = {}) {
    const lv = LEVELS[level] ?? 30;
    if (lv < lowest()) return null;
    let d = data;
    if (typeof d === 'function') { try { d = d(); } catch (err) { d = { dataError: String(err?.message || err) }; } }
    const t = now();
    const e = { seq: ++seq, t, rel: t - start, level, code: String(code), scope: String(code).split('.')[0], msg: String(msg ?? ''), data: d === undefined ? undefined : redact(d), flow: extra.flow || null, ms: extra.ms ?? null };
    if (extra.raw !== undefined) Object.defineProperty(e, 'raw', { value: extra.raw, enumerable: false });
    if (lv >= (LEVELS[keepLevel] ?? 20)) {
      buf.push(e);
      if (buf.length > capacity) { buf.splice(0, buf.length - capacity); dropped = seq - capacity; }
      if (level === 'error') counts.error++;
      if (level === 'warn') counts.warn++;
    }
    for (const s of outs) if (lv >= (LEVELS[s.level] ?? 30)) { try { s.write(e); } catch { /* une sortie ne doit jamais casser l'appli */ } }
    for (const fn of listeners) { try { fn(e); } catch { /* idem */ } }
    return e;
  }

  function flow(code, msg, data) {
    const n = (flowSeq.get(code) || 0) + 1;
    flowSeq.set(code, n);
    const id = `${code}#${n}`;
    const t0 = now();
    let done = false;
    const ms = () => Math.round(now() - t0);
    add('info', `${code}.start`, msg, data, { flow: id });
    return {
      id,
      get done() { return done; },
      elapsed: ms,
      step(sub, m, d, level = 'debug') { return add(level, `${code}.${sub}`, m, d, { flow: id, ms: ms() }); },
      info(sub, m, d) { return add('info', `${code}.${sub}`, m, d, { flow: id, ms: ms() }); },
      warn(sub, m, d) { return add('warn', `${code}.${sub}`, m, d, { flow: id, ms: ms() }); },
      ok(m, d) { if (done) return null; done = true; return add('info', `${code}.ok`, m, d, { flow: id, ms: ms() }); },
      fail(err, d, m) {
        if (done) return null;
        done = true;
        const info = errInfo(err);
        return add('error', `${code}.fail`, m || info.message, { ...(d && typeof d === 'object' ? d : {}), error: info }, { flow: id, ms: ms(), raw: err });
      },
      cancel(m, d) { if (done) return null; done = true; return add('info', `${code}.cancel`, m, d, { flow: id, ms: ms() }); }
    };
  }

  function entries({ level, scope, flow: fl, text, since } = {}) {
    const min = LEVELS[level] ?? 0;
    const q = text ? String(text).toLowerCase() : '';
    return buf.filter(e => (LEVELS[e.level] ?? 0) >= min && (!scope || e.scope === scope || e.code.startsWith(`${scope}.`)) && (!fl || e.flow === fl) && (!since || e.seq > since)
      && (!q || `${e.code} ${e.msg} ${dataText(e.data, 5000)}`.toLowerCase().includes(q)));
  }

  function dump({ format = 'text', header = {}, filter = {}, tz, extra = [] } = {}) {
    const list = entries(filter);
    if (format === 'json') return JSON.stringify({ header: redact(header), entries: list, extra: redact(extra) }, null, 1);
    const head = [__('=== Journal Atelier ==='), ...Object.entries(redact(header)).map(([k, v]) => `${headerLabel(k)} : ${typeof v === 'string' ? v : JSON.stringify(v)}`),
      dropped
        ? __('événements : {n} (les {dropped} plus anciens ont été écartés) · erreurs : {errors} · avertissements : {warns}', { n: list.length, dropped, errors: counts.error, warns: counts.warn })
        : __('événements : {n} · erreurs : {errors} · avertissements : {warns}', { n: list.length, errors: counts.error, warns: counts.warn }), ''];
    const tail = extra.length ? ['', ...extra] : [];
    return [...head, ...list.map(e => formatEntry(e, { tz })), ...tail].join('\n');
  }

  const api = { add, flow, entries, dump };
  for (const l of ['trace', 'debug', 'info', 'warn', 'error']) api[l] = (code, msg, data) => add(l, code, msg, data);
  Object.assign(api, {
    counts: () => ({ ...counts }),
    stats: () => ({ kept: buf.length, seq, dropped, start }),
    clear() { buf = []; counts.error = 0; counts.warn = 0; dropped = 0; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    addSink(s) { outs.push(s); return () => { const i = outs.indexOf(s); if (i >= 0) outs.splice(i, 1); }; },
    setLevels({ keep: k, sink } = {}) { if (k && k in LEVELS) keepLevel = k; if (sink) for (const s of outs) if (sink.name ? s.name === sink.name : true) s.level = sink.level; },
    levels: () => ({ keep: keepLevel, sinks: outs.map(s => ({ name: s.name, level: s.level })) }),
    enabled: level => (LEVELS[level] ?? 30) >= lowest()
  });
  return api;
}
