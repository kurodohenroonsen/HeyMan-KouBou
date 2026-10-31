/* IA locale : fenêtre d'état et de téléchargement, ✨ dans la barre de mise en forme, ✨ décrire une image. */
import { h, $, toast } from './dom.js';
import { openDialog } from './dialog.js';
import { state, commit, textKey } from './store.js';
import { AI_APIS, aiStatus, downloadModel, onDownloadProgress, ai, imageBlob, wasLogged, aiHint } from './ai.js';
import { REWRITE_MODES } from '../core/ai-tasks.js';
import { setAIHooks } from './inline.js';
import { LANG_LABELS } from '../core/site.js';
import { log } from './log.js';
import { openBench } from './bench-ui.js';
import { __ } from '../core/ui-i18n.js';

const STATE_LABEL = { available: __('✓ prêt'), downloadable: __('⇩ à télécharger'), downloading: __('… téléchargement'), unavailable: __('✗ indisponible ici'), absent: __('— absent de ce navigateur') };

/* Marque un texte écrit par l'IA « à relire » (même suivi que les traductions automatiques) */
export function markAi(site, key, lang) {
  return { ...site, mt: { ...(site.mt || {}), [`${key}|${lang}`]: 'ai' } };
}

let busy = 0;
export async function withAI(label, fn) {
  busy++;
  document.body.classList.add('is-ai-busy');
  const note = h('div', { class: 'toast toast--ai', role: 'status', 'data-ai-busy': '' }, `✨ ${label}…`);
  $('#toasts')?.append(note);
  try { return await fn(await ai(state.lang)); }
  catch (e) {
    /* Les tâches journalisent déjà leur échec (ai.<tâche>.fail) ; ici seulement les erreurs imprévues */
    if (!wasLogged(e)) log.error('ai.unexpected', __('{label} : erreur inattendue — {message}', { label, message: e?.message || e }), { label, lang: state.lang, error: e, hint: aiHint(e) });
    toast(e.message || String(e), 'error');
    return null;
  }
  finally { note.remove(); if (!--busy) document.body.classList.remove('is-ai-busy'); }
}

/* ---------- Fenêtre « ✨ IA locale » ---------- */
export async function openAI() {
  $('#aiDialog')?.remove();
  const lang = ['fr', 'de', 'en'].includes(state.lang) ? state.lang : 'fr';
  const rows = h('tbody', {});
  const d = openDialog({ id: 'aiDialog',
    className: 'ai-dialog',
    titleId: 'aiTitle',
    title: __('✨ IA locale (Gemini Nano dans Chrome)'),
    body: [h('div', { class: 'a11y-form' },
      h('p', {}, __('L’IA travaille dans votre navigateur : vos textes et vos images ne quittent pas l’ordinateur, sans compte ni abonnement. Le modèle se télécharge une fois (connexion illimitée conseillée), ensuite tout fonctionne hors ligne.')),
      h('table', { class: 'ai-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'API'), h('th', {}, __('Sert à')), h('th', {}, __('État')), h('th', {}, ''))), rows),
      h('details', { class: 'collab-adv' }, h('summary', {}, __('Activer les API en essai (Rewriter, Writer, Proofreader)')),
        h('p', { class: 'hint' }, __('Dans Chrome, ouvrez chaque adresse, choisissez « Enabled » (« Enabled Multilingual » pour le français si proposé), puis relancez Chrome. Sans elles, Atelier fait la même chose avec la Prompt API.')),
        h('ul', { class: 'ai-flags' }, ['chrome://flags/#rewriter-api', 'chrome://flags/#writer-api', 'chrome://flags/#proofreader-api', 'chrome://on-device-internals'].map(f => h('li', {}, h('code', {}, f), ' ', h('button', { type: 'button', class: 'btn btn--small', onclick: async () => { try { await navigator.clipboard.writeText(f); log.debug('ai.flag-copied', __('Adresse copiée : {flag}', { flag: f }), { flag: f }); toast(__('Copié : collez-le dans la barre d’adresse.')); } catch (e) { log.warn('ai.flag-copy-fail', __('Presse-papiers refusé : adresse affichée à la place'), { flag: f, error: e }); toast(f); } } }, __('Copier')))))),
      h('p', { class: 'hint' }, ...(() => { const [before, after = ''] = __('Configuration demandée par Chrome : Windows 10/11, macOS 13+, Linux ou Chromebook Plus ; 22 Go libres ; carte graphique de plus de 4 Go ou 16 Go de mémoire vive. Langues de Gemini Nano : français, allemand, anglais, espagnol, japonais ; le néerlandais passe par la traduction. Langue testée : {lang}.').split('{lang}'); return [before, h('span', { class: 'lang-name' }, LANG_LABELS[lang]), after]; })()),
      h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-ai-bench': '', title: __('Tester chaque tâche d’IA sur des exemples fixes et obtenir un rapport'), onclick: () => { d.close(); openBench(); } }, __('🧪 Banc d’essai'))),
      h('p', { class: 'pub-status', 'data-ai-status': '', role: 'status' }))],
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))] });
  log.info('ai.dialog', __('Fenêtre ✨ IA locale'), { lang, siteLang: state.lang, source: window.__atelierAI ? 'test' : 'chrome' });
  /* Téléchargements suivis par cette fenêtre (bouton cliqué) : la mise à jour automatique ne reconstruit pas leurs lignes */
  const following = new Set();
  /* Chrome peut rester bloqué à 0 % (modèle en file d'attente, connexion jugée limitée…) : on le dit au lieu de rester muet */
  const stallMs = () => window.__atelierStallMs || 20000;
  const lastProgress = new Map();
  const watchStall = (k, label) => {
    lastProgress.set(k, { at: performance.now(), pct: 0 });
    const t = setInterval(() => {
      if (!d.isConnected || !following.has(k)) { clearInterval(t); return; }
      const lp = lastProgress.get(k);
      if (performance.now() - lp.at < stallMs() || lp.warned) return;
      lp.warned = true;
      const cell = d.querySelector(`[data-ai-state="${k}"]`);
      if (cell) cell.textContent = __('… {pct} % (Chrome n’avance pas)', { pct: lp.pct });
      const status = d.querySelector('[data-ai-status]');
      if (status) status.textContent = __('{api} : Chrome ne transmet aucun avancement depuis {s} s. Le téléchargement se fait du côté de Chrome : ouvre chrome://on-device-internals (Model Status, Assets) ; garde une connexion Wi-Fi illimitée (pas un partage de connexion du téléphone) et Chrome ouvert, ou relance Chrome. La fenêtre continuera d’afficher l’avancement s’il reprend.', { api: label, s: Math.round(stallMs() / 1000) });
      log.warn('ai.download-stalled', __('{api} : aucun avancement de Chrome depuis {s} s (téléchargement en attente ou bloqué côté Chrome)', { api: label, s: Math.round(stallMs() / 1000) }), { api: k, pct: lp.pct, seconds: Math.round(stallMs() / 1000), hint: 'chrome://on-device-internals : état du modèle ; connexion illimitée nécessaire ; relancer Chrome' });
    }, 500);
  };
  onDownloadProgress((what, p) => {
    const pct = Math.round(p * 100);
    /* Chrome renvoie parfois « 0 % » en boucle sans rien télécharger : seule une vraie avancée compte */
    const prev = lastProgress.get(what);
    if (!prev || pct > prev.pct) lastProgress.set(what, { at: performance.now(), pct, warned: false });
    else if (prev.warned) return;
    const cell = d.querySelector(`[data-ai-state="${what}"]`);
    if (cell) cell.textContent = pct >= 100 ? __('… installation') : `… ${pct} %`;
    const status = d.querySelector('[data-ai-status]');
    if (status) status.textContent = __('Téléchargement {api} : {pct} %', { api: AI_APIS[what]?.label || what, pct });
  });
  const fill = async (quiet = false) => {
    const st = await aiStatus(lang, { quiet });
    if (!d.isConnected) return st;
    rows.replaceChildren(...Object.entries(AI_APIS).map(([k, a]) => h('tr', { 'data-ai-api': k, class: `is-${st[k]}` },
      h('td', {}, h('strong', {}, a.label), a.flag ? h('small', { class: 'hint' }, ' ' + __('(essai)')) : null),
      h('td', { class: 'hint' }, a.use),
      h('td', { 'data-ai-state': k }, STATE_LABEL[st[k]] || st[k]),
      h('td', {}, st[k] === 'downloadable' || st[k] === 'downloading' ? h('button', {
        type: 'button', class: 'btn btn--small btn--primary', 'data-ai-download': k,
        title: st[k] === 'downloading' ? __('Chrome télécharge déjà ce modèle : affiche l’avancement ici') : __('Télécharger ce modèle sur l’ordinateur (une seule fois)'),
        onclick: async e => {
          e.currentTarget.disabled = true;
          following.add(k);
          watchStall(k, a.label);
          const status = d.querySelector('[data-ai-status]');
          if (st[k] === 'downloading') log.info('ai.download-follow', __('{api} : téléchargement déjà en cours, suivi de l’avancement', { api: a.label }), { api: k });
          /* L'échec est journalisé par le parcours ai.download (ai.download.fail) */
          try { await downloadModel(k, lang); status.textContent = __('{api} : prêt.', { api: a.label }); } catch (err) { if (!wasLogged(err)) log.warn('ai.download-ui', __('Téléchargement {api} : {message}', { api: a.label, message: err?.message || err }), { api: k, error: err }); status.textContent = __('Échec : {message}', { message: err.message }); }
          following.delete(k);
          fill();
        }
      }, st[k] === 'downloading' ? __('Voir la progression') : __('Télécharger')) : null))));
    return st;
  };
  /* Chrome télécharge parfois en arrière-plan : la fenêtre se met à jour toute seule tant qu'elle est ouverte */
  let polls = 0;
  const poll = setInterval(async () => {
    if (!d.isConnected) { clearInterval(poll); return; }
    if (following.size) return;
    const st = lastShown;
    if (!st || !Object.values(st).some(v => v === 'downloading')) return;
    polls++;
    lastShown = await fill(true);
    if (!Object.values(lastShown).some(v => v === 'downloading')) log.info('ai.download-done', __('Téléchargements de Chrome terminés pendant que la fenêtre était ouverte'), { checks: polls, ...lastShown });
  }, 3000);
  d.addEventListener('close', () => clearInterval(poll));
  let lastShown = null;
  lastShown = await fill();
}

/* ---------- ✨ dans la barre de mise en forme ---------- */
setAIHooks({
  modes: Object.entries(REWRITE_MODES).map(([k, m]) => ({ id: k, label: m.label })),
  async rewrite(text, mode) {
    return withAI(REWRITE_MODES[mode]?.label || __('Reformulation'), a => a.rewrite(text, { mode, lang: state.lang }));
  },
  async proofread(text) {
    return withAI(__('Correction'), a => a.proofread(text, { lang: state.lang }));
  },
  mark(nodeId, field, histKey) {
    log.debug('ai.mark', __('Texte de l’IA appliqué et marqué « à relire »'), { nodeId, field, lang: state.lang });
    commit(markAi(state.site, textKey(nodeId, field), state.lang), { key: histKey || `ai-mark-${nodeId}`, sticky: true, source: 'canvas' });
  }
});

/* ---------- ✨ Décrire une image ---------- */
export async function describeImage(src, context, lang = state.lang) {
  /* imageBlob journalise la cause (ai.image-missing, ai.image-fail) */
  const blob = await imageBlob(state.site, src).catch(e => { toast(e.message, 'error'); return null; });
  if (!blob) return null;
  return withAI(__('Description de l’image'), a => a.altText({ image: blob, context, lang, sourceLang: state.site.defaultLanguage }));
}
