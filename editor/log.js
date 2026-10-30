/*
 * Journal de l'éditeur : un seul journal pour toute l'appli (core/log.js), affiché dans la console
 * et gardé en mémoire pour la fenêtre 🐞 Journal. Capture aussi, sans toucher aux modules :
 * erreurs non attrapées, fichiers qui ne se chargent pas, requêtes réseau, fenêtres, clics, champs, raccourcis.
 *
 * Réglages : ?debug (console en debug), ?trace (tout), ?quiet (console en warn) ; gardés dans localStorage['atelier-log'].
 * Console : window.atelierDebug.dump() / .copy() / .download() / .level('trace') / .entries() / .clear()
 *           auto-test : autotest() (fenêtre du rapport) ou copy(await atelierDebug.selftest()) / .rollback() / .report() / .cases()
 */
import { createLogger, formatEntry, errInfo, redact, LEVELS } from '../core/log.js';
import { PUBLISH_VERSION } from '../core/publish.js';
import { __, __n } from '../core/ui-i18n.js';

export const APP_VERSION = '21';
const SETTINGS_KEY = 'atelier-log';
const DEFAULTS = { console: 'debug', keep: 'debug', server: true };

function readSettings() {
  let s = { ...DEFAULTS };
  try { Object.assign(s, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* stockage indisponible */ }
  const q = new URLSearchParams(globalThis.location?.search || '');
  if (q.has('debug')) s = { ...s, console: 'debug', keep: s.keep === 'trace' ? 'trace' : 'debug' };
  if (q.has('trace')) s = { ...s, console: 'trace', keep: 'trace' };
  if (q.has('quiet')) s = { ...s, console: 'warn' };
  if (!(s.console in LEVELS)) s.console = DEFAULTS.console;
  if (!(s.keep in LEVELS) || s.keep === 'off') s.keep = DEFAULTS.keep;
  return s;
}
export const settings = readSettings();
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* idem */ } }

/* ---------- Sortie console ---------- */
const CSS = { trace: 'color:#9ca3af', debug: 'color:#6b7280', info: 'color:#2563eb', warn: 'color:#b45309;font-weight:bold', error: 'color:#dc2626;font-weight:bold' };
const METHOD = { trace: 'debug', debug: 'log', info: 'info', warn: 'warn', error: 'error' };
let inConsole = false;
const consoleSink = {
  name: 'console',
  level: typeof window === 'undefined' ? 'off' : settings.console,
  write(e) {
    inConsole = true;
    try {
      const extra = e.raw instanceof Error ? [e.raw] : [];
      (console[METHOD[e.level]] || console.log)(`%c[Atelier]%c ${formatEntry(e)}`, CSS[e.level] || '', '', ...extra);
    } finally { inConsole = false; }
  }
};

export const log = createLogger({ keep: settings.keep, sinks: [consoleSink] });

export function setLevels({ console: c, keep, server } = {}) {
  if (c && c in LEVELS) { settings.console = c; log.setLevels({ sink: { name: 'console', level: c } }); }
  if (keep && keep in LEVELS && keep !== 'off') { settings.keep = keep; log.setLevels({ keep }); }
  if (typeof server === 'boolean') settings.server = server;
  saveSettings();
  log.info('log.settings', __('Réglages du journal modifiés'), { console: settings.console, keep: settings.keep, server: settings.server });
}
/* Le serveur renvoie sa trace (publish.php v4) quand le journal est assez détaillé */
export const serverTrace = () => settings.server && LEVELS[settings.keep] <= LEVELS.debug;

/* ---------- Contexte pour l'en-tête du journal ---------- */
const contexts = new Map();
export function registerContext(name, fn) { contexts.set(name, fn); }

export async function environment() {
  const nav = globalThis.navigator || {};
  const brands = nav.userAgentData?.brands?.map(b => `${b.brand} ${b.version}`).filter(b => !/Not.?A.?Brand/i.test(b)).join(', ');
  let storage = null;
  try { const e = await nav.storage?.estimate?.(); if (e) storage = __('{used} Mo utilisés sur {quota} Mo', { used: Math.round((e.usage || 0) / 1048576), quota: Math.round((e.quota || 0) / 1048576) }); } catch { /* indisponible */ }
  let persisted = null;
  try { persisted = await nav.storage?.persisted?.(); } catch { /* indisponible */ }
  /* Clés stables (affichées traduites par headerLabel de core/log.js) ; les valeurs suivent la langue de l'interface */
  const env = {
    atelier: __('cycle {cycle} · publish.php attendu v{version}', { cycle: APP_VERSION, version: PUBLISH_VERSION }),
    date: new Date().toISOString(),
    fuseau: Intl.DateTimeFormat().resolvedOptions().timeZone,
    adresse: location.origin + location.pathname,
    navigateur: brands || nav.userAgent,
    agent: nav.userAgent,
    plateforme: nav.userAgentData?.platform || nav.platform,
    langues: (nav.languages || []).join(', '),
    écran: __('{screen} · fenêtre {window} · ×{ratio}', { screen: `${screen.width}×${screen.height}`, window: `${innerWidth}×${innerHeight}`, ratio: devicePixelRatio }),
    machine: __('{cores} cœurs · {memory}', { cores: nav.hardwareConcurrency || '?', memory: nav.deviceMemory ? __('{n} Go', { n: nav.deviceMemory }) : __('mémoire ?') }),
    réseau: (nav.onLine ? __('en ligne') : __('HORS LIGNE')) + (nav.connection?.effectiveType ? ` · ${nav.connection.effectiveType}` : ''),
    stockage: storage ? (persisted ? __('{storage} (persistant)', { storage }) : storage) : __('inconnu'),
    journal: serverTrace() ? __('console {console} · tampon {keep} · trace serveur oui', { console: settings.console, keep: settings.keep }) : __('console {console} · tampon {keep} · trace serveur non', { console: settings.console, keep: settings.keep }),
    mémoireJs: performance.memory ? __('{n} Mo', { n: Math.round(performance.memory.usedJSHeapSize / 1048576) }) : undefined
  };
  for (const [name, fn] of contexts) { try { env[name] = await fn(); } catch (e) { env[name] = __('indisponible ({message})', { message: e.message }); } }
  return env;
}

export async function logDump(opts = {}) {
  return log.dump({ header: await environment(), ...opts });
}

/* ---------- Description courte d'un élément de l'interface ---------- */
export function describeEl(el) {
  if (!el || el.nodeType !== 1) return null;
  const out = { el: el.tagName.toLowerCase() };
  if (el.id) out.id = el.id;
  const label = el.getAttribute('aria-label') || el.getAttribute('title');
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text && el.tagName !== 'SELECT') out.text = text.slice(0, 50);
  else if (label) out.text = label.slice(0, 50);
  const data = Object.entries(el.dataset || {}).slice(0, 4);
  if (data.length) out.data = Object.fromEntries(data.map(([k, v]) => [k, String(v).slice(0, 60)]));
  const dlg = el.closest?.('dialog');
  if (dlg && dlg !== el) out.dialog = dlg.id || dlg.className;
  return out;
}

/* ---------- Erreurs globales ---------- */
let installed = false;
function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  for (const x of window.__atelierEarly || []) log.add(x.k === 'boot.timeout' ? 'error' : 'error', x.k, x.d?.message || x.k, x.d);
  window.addEventListener('error', e => {
    const t = e.target;
    if (t && t !== window && t.nodeType === 1) {
      log.error('app.resource', __('Fichier non chargé : {file}', { file: t.src || t.href || t.tagName }), { tag: t.tagName.toLowerCase(), url: t.src || t.href });
      return;
    }
    log.add('error', 'app.uncaught', e.message || __('Erreur JavaScript'), { file: e.filename, line: e.lineno, col: e.colno, error: e.error ? errInfo(e.error) : undefined });
  }, true);
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    log.error('app.rejection', __('Promesse rejetée sans traitement : {message}', { message: r?.message || r }), { error: errInfo(r) });
  });
  document.addEventListener('securitypolicyviolation', e => log.error('app.csp', __('Bloqué par la politique de sécurité : {directive}', { directive: e.violatedDirective }), { blocked: e.blockedURI, directive: e.violatedDirective, source: e.sourceFile, line: e.lineNumber }));
  window.addEventListener('online', () => log.info('app.online', __('Connexion rétablie')));
  window.addEventListener('offline', () => log.warn('app.offline', __('Connexion perdue : l’éditeur continue hors ligne')));
  document.addEventListener('visibilitychange', () => log.debug('app.visibility', document.hidden ? __('Onglet caché') : __('Onglet visible')));
  window.addEventListener('pagehide', () => log.info('app.leave', __('Fermeture ou rechargement de la page'), { errors: log.counts().error }));
  window.addEventListener('storage', e => { if (e.key && !e.key.startsWith('atelier-log')) log.debug('app.storage-event', __('Un autre onglet a modifié un réglage'), { key: e.key }); });
  try {
    new PerformanceObserver(list => {
      for (const t of list.getEntries()) if (t.duration > 200) log.debug('perf.longtask', __('Interface bloquée {ms} ms', { ms: Math.round(t.duration) }), { ms: Math.round(t.duration) });
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* non pris en charge */ }

  /* console.error / console.warn d'autres scripts (bibliothèques, navigateur) */
  for (const m of ['error', 'warn']) {
    const orig = console[m].bind(console);
    console[m] = (...args) => {
      if (!inConsole && !(typeof args[0] === 'string' && args[0].includes('[Atelier]'))) {
        inConsole = true;
        try { log.add(m === 'error' ? 'error' : 'warn', 'app.console', args.map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : (() => { try { return JSON.stringify(redact(a)); } catch { return String(a); } })())).join(' ').slice(0, 400)); }
        finally { inConsole = false; }
        return;
      }
      orig(...args);
    };
    /* Les messages captés sont réaffichés une fois par la sortie console du journal */
  }

  /* ---------- Réseau ---------- */
  const origFetch = window.fetch.bind(window);
  let seq = 0;
  let pollFails = 0;
  const describeBody = b => {
    if (!b) return undefined;
    if (typeof b === 'string') { let keys; try { keys = Object.keys(JSON.parse(b)); } catch { /* pas du JSON */ } return keys ? { json: keys, size: b.length } : { size: b.length }; }
    if (typeof FormData !== 'undefined' && b instanceof FormData) return Object.fromEntries([...b.entries()].map(([k, v]) => [k, typeof v === 'string' ? (k === 'token' ? '[masqué]' : `${v.length} car.`) : v]));
    return b;
  };
  window.fetch = async function atelierFetch(input, init = {}) {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url || String(input);
    const method = String(init.method || input?.method || 'GET').toUpperCase();
    if (/^(data|blob):/.test(url)) {
      try { return await origFetch(input, init); } catch (err) { log.warn('net.fail', __('Lecture locale impossible ({scheme})', { scheme: url.slice(0, 5) }), { error: errInfo(err) }); throw err; }
    }
    const php = /publish\.php(\?|#|$)/i.test(url);
    const poll = php && method === 'GET' && /[?&]signal=/.test(url);
    if (php && serverTrace() && (typeof input === 'string' || input instanceof URL)) {
      url += (url.includes('?') ? '&' : '?') + 'atelier_debug=1';
      input = url;
    }
    const id = ++seq;
    const t0 = performance.now();
    const short = url.replace(/^https?:\/\//, '').replace(/[?#].*$/, '').slice(0, 80);
    const quiet = poll ? 'trace' : 'debug';
    log.add(quiet, 'net.request', `${method} ${short}`, { id, method, url, body: describeBody(init.body) });
    let r;
    try { r = await origFetch(input, init); }
    catch (err) {
      /* Relève de la boîte aux lettres en échec : WARN la première fois, puis TRACE (elle réessaie chaque seconde) */
      const lv = poll ? (pollFails++ ? 'trace' : 'warn') : 'error';
      log.add(lv, 'net.fail', poll && pollFails > 1 ? __('{request} : {message} (réseau, CORS ou adresse injoignable) — échec n° {n}', { request: `${method} ${short}`, message: err.message, n: pollFails }) : __('{request} : {message} (réseau, CORS ou adresse injoignable)', { request: `${method} ${short}`, message: err.message }), { id, url, ms: Math.round(performance.now() - t0), online: navigator.onLine, error: errInfo(err) });
      throw err;
    }
    if (poll && pollFails) { log.info('net.recovered', __n(pollFails, 'Boîte aux lettres de nouveau joignable après {n} échec', 'Boîte aux lettres de nouveau joignable après {n} échecs'), { url }); pollFails = 0; }
    const ms = Math.round(performance.now() - t0);
    const level = r.status >= 500 ? 'error' : r.status >= 400 ? 'warn' : poll ? 'trace' : method === 'GET' ? 'debug' : 'info';
    const req = r.headers.get('x-atelier-request') || undefined;
    log.add(level, 'net.response', `${r.status} ${method} ${short} (${ms} ms)`, { id, status: r.status, ms, type: r.headers.get('content-type')?.split(';')[0], size: r.headers.get('content-length') ? Number(r.headers.get('content-length')) : undefined, req, redirected: r.redirected || undefined });
    /* Trace du serveur (publish.php v4 avec ?atelier_debug=1) : recopiée avant de rendre la réponse, pour garder l'ordre */
    if (php && /json/.test(r.headers.get('content-type') || '')) {
      try {
        const b = await r.clone().json();
        for (const ev of Array.isArray(b?._trace) ? b._trace : []) {
          const lv = ['trace', 'debug', 'info', 'warn', 'error'].includes(ev.lvl) ? ev.lvl : 'info';
          log.add(poll && lv === 'debug' ? 'trace' : lv, String(ev.ev || 'php.event'), `${ev.msg || ''}`, { ...(ev.data || {}), req: ev.req, srvMs: ev.ms });
        }
      } catch { /* réponse non JSON : l'appelant la traitera */ }
    }
    return r;
  };

  /* ---------- Fenêtres ---------- */
  const proto = globalThis.HTMLDialogElement?.prototype;
  if (proto) {
    for (const m of ['showModal', 'show']) {
      const orig = proto[m];
      proto[m] = function (...a) {
        log.debug('ui.dialog.open', __('Fenêtre ouverte : {title}', { title: this.querySelector('h2,h3')?.textContent?.trim() || this.id || this.className }), { id: this.id || undefined, class: this.className || undefined, modal: m === 'showModal' });
        return orig.apply(this, a);
      };
    }
  }
  document.addEventListener('close', e => { if (e.target?.tagName === 'DIALOG') log.debug('ui.dialog.close', __('Fenêtre fermée : {title}', { title: e.target.querySelector('h2,h3')?.textContent?.trim() || e.target.id || e.target.className }), { id: e.target.id || undefined, value: e.target.returnValue || undefined }); }, true);
  document.addEventListener('toggle', e => { if (e.target?.tagName === 'DETAILS' && e.target.id) log.debug('ui.menu', e.target.open ? __('Menu ouvert : {id}', { id: e.target.id }) : __('Menu fermé : {id}', { id: e.target.id }), { id: e.target.id, open: e.target.open }); }, true);

  /* ---------- Clics, champs, raccourcis ---------- */
  document.addEventListener('click', e => {
    const el = e.target?.closest?.('button,a[href],summary,[role=tab],[role=menuitem],[role=option],label,input[type=checkbox],input[type=radio],[data-node]');
    if (!el || el.closest('#logDialog [data-log-list]')) return;
    log.debug('ui.click', __('Clic : {target}', { target: describeEl(el).text || el.id || el.tagName.toLowerCase() }), describeEl(el));
  }, true);
  document.addEventListener('change', e => {
    const el = e.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.closest('#logDialog')) return;
    const d = describeEl(el);
    delete d.text;
    d.name = el.name || el.getAttribute('aria-label') || el.closest('label')?.textContent?.trim().slice(0, 40) || undefined;
    if (el.type === 'password') d.value = el.value ? '[masqué]' : '';
    else if (el.type === 'checkbox' || el.type === 'radio') d.checked = el.checked;
    else if (el.type === 'file') d.files = [...(el.files || [])].map(f => `${f.name} (${f.type || '?'}, ${Math.round(f.size / 1024)} Ko)`);
    else d.value = String(el.value).slice(0, 80);
    log.debug('ui.change', __('Champ modifié : {field}', { field: d.name || d.id || d.el }), d);
  }, true);
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey || e.altKey;
    if (!mod && !['Escape', 'Delete', 'F1', 'F2', 'F5', 'F12'].includes(e.key)) return;
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;
    const combo = [e.ctrlKey && 'Ctrl', e.metaKey && 'Cmd', e.altKey && 'Alt', e.shiftKey && 'Maj', e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean).join('+');
    /* Données : combinaison stable (« Maj ») ; message : nom de touche de l'interface */
    const shown = [e.ctrlKey && 'Ctrl', e.metaKey && 'Cmd', e.altKey && 'Alt', e.shiftKey && __('Maj'), e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean).join('+');
    log.debug('ui.key', __('Raccourci : {combo}', { combo: shown }), { key: combo, in: e.target?.isContentEditable ? 'texte' : e.target?.tagName?.toLowerCase() });
  }, true);

  /* ---------- Console ---------- */
  window.atelierDebug = {
    log,
    entries: f => log.entries(f),
    dump: async f => { const t = await logDump({ filter: f }); console.log(t); return t; },
    async copy() { const t = await logDump(); await navigator.clipboard.writeText(t); return __n(t.length, '{n} caractère copié', '{n} caractères copiés'); },
    async download() { const { downloadLog } = await import('./log-ui.js'); return downloadLog(); },
    level(c, keep) { setLevels({ console: c, keep: keep || (LEVELS[c] < LEVELS[settings.keep] ? c : undefined) }); return log.levels(); },
    clear: () => log.clear(),
    settings,
    /* Auto-test (cycle 20) : copy(await atelierDebug.selftest()) ; atelierDebug.rollback() remet le projet d'avant */
    async selftest(opts) { const { selftest } = await import('./selftest.js'); return selftest(opts); },
    async rollback() { const { stopSelftest } = await import('./selftest.js'); const { rollback } = await import('./selftest-safe.js'); const { rollbackText } = await import('../core/selftest.js'); const r = (await stopSelftest()) || (await rollback()); return r.nothing ? __('Rien à restaurer : aucun auto-test en cours ou interrompu.') : rollbackText(r); },
    async report() { const { lastSelftestReport } = await import('./selftest.js'); return lastSelftestReport() || __('Aucun auto-test lancé depuis l’ouverture de la page.'); },
    async cases() { const { SELFTEST_CASES } = await import('../core/selftest.js'); return SELFTEST_CASES.map(c => __('{id} (chapitre {chapter}) : {title}', { id: c.id, chapter: c.chapter, title: c.title })).join('\n'); }
  };
}

install();
log.info('boot.log', __('Journal prêt'), { console: settings.console, keep: settings.keep, aide: 'atelierDebug.copy() ou le bouton 🐞' });
