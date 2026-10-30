/* Fenêtre « 🐞 Journal » : filtrer, copier, télécharger le journal du navigateur et lire celui du serveur (publish.php v4). */
import { h, $, download } from './dom.js';
import { log, logDump, settings, setLevels, serverTrace } from './log.js';
import { formatEntry, LEVELS, dataText } from '../core/log.js';
import { getSecret } from './storage.js';
import { __, __n, __c } from '../core/ui-i18n.js';

let serverLines = [];
let siteInfo = () => ({ url: '', name: 'site' });
export function setLogSiteInfo(fn) { siteInfo = fn; }

const extra = () => (serverLines.length ? [__('=== Journal du serveur (publish.php) ==='), ...serverLines] : []);

export async function copyLog() {
  const text = await logDump({ extra: extra() });
  try { await navigator.clipboard.writeText(text); log.info('log.copy', __('Journal copié'), { chars: text.length, server: serverLines.length }); return true; }
  catch (e) { log.warn('log.copy-fail', __('Copie refusée par le navigateur : utilisez « Télécharger »'), { error: e.message }); return false; }
}

export async function downloadLog() {
  const text = await logDump({ extra: extra() });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  download(`atelier-journal-${stamp}.log`, text, 'text/plain;charset=utf-8');
  log.info('log.download', __('Journal téléchargé'), { chars: text.length });
  return text.length;
}

/* Journal du serveur : GET publish.php?logs=N avec le jeton */
export async function fetchServerLog({ url, token, lines = 300 } = {}) {
  const f = log.flow('log.server', __('Lecture du journal du serveur'), { url, lines });
  try {
    if (!url) throw new Error(__('Adresse de publish.php inconnue : réglez-la dans 🚀 Publier.'));
    if (!token) throw new Error(__('Jeton de publication absent : saisissez-le dans 🚀 Publier (case « Se souvenir ») ou ici.'));
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}logs=${lines}`, { headers: { 'X-Atelier-Token': token }, cache: 'no-store' });
    const b = await r.json().catch(() => ({}));
    if (r.status === 401) throw new Error(__('Jeton refusé par publish.php.'));
    if (!r.ok || !b.ok) throw new Error(b.error || (b.atelier ? __('publish.php version {version} : le journal du serveur demande la version 4 (téléchargez le nouveau publish.php dans 🚀 Publier).', { version: b.version }) : __('erreur {status}', { status: r.status })));
    serverLines = (b.lines || []).map(x => `${x.t} ${String(x.lvl || '').toUpperCase().padEnd(5)} ${x.ev} [req ${x.req}${x.ms !== undefined ? ` · ${x.ms} ms` : ''}] ${x.msg || ''}${x.data ? ` ${JSON.stringify(x.data)}` : ''}`);
    f.ok(__n(serverLines.length, '{n} ligne du serveur', '{n} lignes du serveur'), { lines: serverLines.length, files: b.files });
    return serverLines;
  } catch (e) { f.fail(e); throw e; }
}

export async function openLog() {
  $('#logDialog')?.remove();
  const state = { level: 'debug', scope: '', text: '', paused: false };
  const list = h('ol', { class: 'log-list', 'data-log-list': '', 'aria-live': 'off' });
  const count = h('span', { class: 'hint', 'data-log-count': '' });
  const status = h('p', { class: 'pub-status', role: 'status', 'data-log-status': '' });
  const scopes = h('select', { class: 'control control--sm', 'data-log-scope': '', 'aria-label': __('Domaine') });
  const fillScopes = () => {
    const all = [...new Set(log.entries().map(e => e.scope))].sort();
    scopes.replaceChildren(h('option', { value: '' }, __('Tous les domaines')), ...all.map(s => h('option', { value: s, selected: s === state.scope }, s)));
  };
  const lvlSel = (value, attr, label, onchange) => h('label', { class: 'mini mini--inline' }, h('span', {}, label),
    h('select', { class: 'control control--sm', [attr]: '', onchange }, Object.keys(LEVELS).filter(l => attr !== 'data-log-keep' || l !== 'off').map(l => h('option', { value: l, selected: l === value }, l))));
  const row = e => h('li', { class: `log-row is-${e.level}`, 'data-code': e.code },
    h('span', { class: 'log-row__head' }, formatEntry({ ...e, data: undefined })),
    e.data !== undefined && dataText(e.data) ? h('code', { class: 'log-row__data' }, dataText(e.data, 2000)) : null);
  const render = () => {
    const es = log.entries({ level: state.level, scope: state.scope || undefined, text: state.text || undefined });
    list.replaceChildren(...es.slice(-500).map(row));
    const c = log.counts();
    count.textContent = [es.length > 500 ? __('{n} événements affichés (les 500 derniers)', { n: es.length }) : __n(es.length, '{n} événement affiché', '{n} événements affichés'), __n(c.error, '{n} erreur', '{n} erreurs'), __n(c.warn, '{n} avertissement', '{n} avertissements')].join(' · ');
    list.scrollTop = list.scrollHeight;
  };
  let pending = false;
  const off = log.subscribe(() => { if (state.paused || pending) return; pending = true; requestAnimationFrame(() => { pending = false; if (list.isConnected) render(); }); });

  const p = siteInfo();
  const urlIn = h('input', { class: 'input input--mono', type: 'url', value: p.url || '', placeholder: __('https://www.votre-site.be/publish.php'), 'data-log-server-url': '' });
  const tokIn = h('input', { class: 'input input--mono', type: 'password', autocomplete: 'off', placeholder: __('Jeton de publication'), 'data-log-server-token': '' });
  getSecret('php-token').then(v => { if (v && !tokIn.value) tokIn.value = v; });
  const serverBox = h('pre', { class: 'log-server', 'data-log-server': '', hidden: !serverLines.length }, serverLines.join('\n'));

  const d = h('dialog', { class: 'audit log-dialog', id: 'logDialog', 'aria-labelledby': 'logTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'logTitle' }, __('🐞 Journal de débogage')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      h('p', { class: 'hint' }, __('Tout ce que fait l’éditeur est noté ici (et dans la console, F12). Pour signaler un problème : refaites-le, puis « Copier le journal » et collez-le dans votre message. Les jetons, secrets et images sont masqués.')),
      h('div', { class: 'row-btns log-tools' },
        h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-log-copy': '', onclick: async () => { status.textContent = (await copyLog()) ? __('Journal copié : collez-le dans votre message.') : __('La copie est refusée par le navigateur : utilisez « Télécharger ».'); } }, __('📋 Copier le journal')),
        h('button', { type: 'button', class: 'btn btn--small', 'data-log-download': '', onclick: () => downloadLog() }, __('⇩ Télécharger (.log)')),
        h('button', { type: 'button', class: 'btn btn--small', 'data-log-clear': '', onclick: () => { log.clear(); serverLines = []; serverBox.hidden = true; log.info('log.clear', __('Journal vidé')); render(); } }, __('Vider')),
        h('label', { class: 'check check--sm' }, h('input', { type: 'checkbox', 'data-log-pause': '', onchange: e => { state.paused = e.target.checked; if (!state.paused) render(); } }), __('Figer'))),
      h('div', { class: 'row-btns log-filters' },
        lvlSel(state.level, 'data-log-level', __('Afficher dès'), e => { state.level = e.target.value; render(); }),
        scopes,
        h('input', { class: 'input input--sm', type: 'search', placeholder: __('Rechercher (code, message, données)'), 'data-log-search': '', oninput: e => { state.text = e.target.value; render(); } }),
        count),
      list,
      h('details', { class: 'collab-adv' }, h('summary', {}, __('Réglages du journal')),
        h('div', { class: 'row-btns' },
          lvlSel(settings.console, 'data-log-console', __('Console (F12) dès'), e => setLevels({ console: e.target.value })),
          lvlSel(settings.keep, 'data-log-keep', __('Garder en mémoire dès'), e => { setLevels({ keep: e.target.value }); render(); }),
          h('label', { class: 'check check--sm' }, h('input', { type: 'checkbox', checked: settings.server, 'data-log-trace': '', onchange: e => setLevels({ server: e.target.checked }) }), __('Demander sa trace à publish.php'))),
        h('p', { class: 'hint' }, __('Raccourcis d’adresse : ?debug, ?trace (tout, très bavard), ?quiet. Dans la console : atelierDebug.copy().'))),
      h('details', { class: 'collab-adv', open: !!serverLines.length }, h('summary', {}, __('Journal du serveur (publish.php)')),
        h('p', { class: 'hint' }, __('Lit les dernières lignes notées par publish.php (version 4) sur l’hébergement. Le jeton est celui de la publication ; il n’est jamais écrit dans le journal.')),
        h('div', { class: 'mini-grid' }, h('label', { class: 'mini' }, h('span', {}, __c('url', 'Adresse')), urlIn), h('label', { class: 'mini' }, h('span', {}, __('Jeton')), tokIn)),
        h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-log-server-read': '', onclick: async () => {
          status.textContent = __('Lecture du journal du serveur…');
          try { const l = await fetchServerLog({ url: urlIn.value.trim(), token: tokIn.value.trim() }); serverBox.textContent = l.join('\n') || __('(vide)'); serverBox.hidden = false; status.textContent = __n(l.length, '{n} ligne du serveur : elle est ajoutée à la copie du journal.', '{n} lignes du serveur : elles sont ajoutées à la copie du journal.'); }
          catch (e) { status.textContent = __('Journal du serveur illisible : {message}', { message: e.message }); }
        } }, __('Lire le journal du serveur'))),
        serverBox),
      status),
    h('footer', { class: 'audit__foot' }, h('span', { class: 'hint' }, serverTrace() ? __('Trace du serveur : demandée.') : __('Trace du serveur : non demandée.')), h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))));
  scopes.addEventListener('change', () => { state.scope = scopes.value; render(); });
  d.addEventListener('close', () => { off(); d.remove(); });
  document.body.append(d);
  fillScopes();
  render();
  d.showModal();
}

/* Pastille du bouton 🐞 : nombre d'erreurs */
export function initLogButton(btn) {
  if (!btn) return;
  const badge = h('span', { class: 'log-badge', 'data-log-badge': '', hidden: true });
  btn.append(badge);
  const upd = () => { const n = log.counts().error; badge.hidden = !n; badge.textContent = !n ? '' : n > 99 ? '99+' : String(n); btn.title = n ? __n(n, 'Journal de débogage — {n} erreur', 'Journal de débogage — {n} erreurs') : __('Journal de débogage'); };
  let queued = false;
  log.subscribe(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; upd(); }); });
  btn.addEventListener('click', () => openLog());
  upd();
}
