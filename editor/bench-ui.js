/*
 * 🧪 Banc d'essai de l'IA locale : lance chaque tâche sur des exemples fixes dans ce Chrome (vrai Gemini Nano),
 * vérifie les réponses, mesure les durées, produit un rapport à copier. Rien n'est enregistré dans le projet.
 */
import { h, $, toast, download } from './dom.js';
import { log } from './log.js';
import { AI_APIS, aiStatus, chromeProvider, loggedAI } from './ai.js';
import { BENCH_GROUPS, BENCH_CASES, STATUS_LABEL, benchFixtures, runBench, benchSummary, benchReport, benchScoreText } from '../core/bench.js';
import { localToday } from '../core/collections.js';
import { __, __n } from '../core/ui-i18n.js';

/* Images dessinées par Atelier (aucune image extérieure) */
function canvasBlob(w, hgt, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = hgt;
  draw(c.getContext('2d'), w, hgt);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
}
export function drawPoster() {
  return canvasBlob(600, 800, (g, w) => {
    g.fillStyle = '#fff8e1'; g.fillRect(0, 0, w, 800);
    g.fillStyle = '#c8181d'; g.fillRect(0, 0, w, 220);
    g.fillStyle = '#ffffff'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center';
    g.fillText('NUIT DES', w / 2, 110); g.fillText('RADIOS LIBRES', w / 2, 185);
    g.fillStyle = '#16161a'; g.font = 'bold 44px sans-serif';
    g.fillText('Samedi 14 décembre', w / 2, 330); g.fillText('20h30', w / 2, 395);
    g.font = '36px sans-serif'; g.fillText('Maison du Peuple', w / 2, 500); g.fillText('Bruxelles', w / 2, 548);
    g.font = '30px sans-serif'; g.fillText('Entrée libre · mediaslibres.be', w / 2, 690);
  });
}
export function drawShapes() {
  return canvasBlob(400, 300, (g, w, hgt) => {
    g.fillStyle = '#1d4ed8'; g.fillRect(0, 0, w, hgt);
    g.fillStyle = '#dc2626'; g.beginPath(); g.arc(w / 2, hgt / 2, 100, 0, Math.PI * 2); g.fill();
  });
}

const LEVEL = { ok: 'info', partial: 'warn', fail: 'warn', error: 'error', skipped: 'info', stopped: 'info' };

export async function openBench() {
  $('#benchDialog')?.remove();
  const status = h('p', { class: 'pub-status', role: 'status', 'data-bench-status': '' }, __('Vérification des API…'));
  const envBox = h('ul', { class: 'hint', 'data-bench-env': '' });
  const results = h('ol', { class: 'bench-list', 'data-bench-results': '' });
  const summary = h('p', { class: 'bench-summary', 'data-bench-summary': '' });
  const groups = h('div', { class: 'row-btns' }, Object.entries(BENCH_GROUPS).map(([k, l]) => h('label', { class: 'check check--sm' }, h('input', { type: 'checkbox', checked: true, 'data-bench-group': k }), `${l} (${BENCH_CASES.filter(c => c.group === k).length})`)));
  const runBtn = h('button', { type: 'button', class: 'btn btn--primary btn--ai', 'data-bench-run': '', onclick: () => start() }, __('▶ Lancer le banc d’essai'));
  const stopBtn = h('button', { type: 'button', class: 'btn', 'data-bench-stop': '', hidden: true, onclick: () => { signal.stopped = true; stopBtn.disabled = true; status.textContent = __('Arrêt après le cas en cours…'); } }, __('■ Arrêter'));
  const copyBtn = h('button', { type: 'button', class: 'btn btn--small', 'data-bench-copy': '', disabled: true, onclick: () => copy() }, __('📋 Copier le rapport'));
  const dlBtn = h('button', { type: 'button', class: 'btn btn--small', 'data-bench-download': '', disabled: true, onclick: () => save() }, '⇩ .json');
  const d = h('dialog', { class: 'audit bench-dialog', id: 'benchDialog', 'aria-labelledby': 'benchTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'benchTitle' }, __('🧪 Banc d’essai de l’IA locale')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      h('p', { class: 'hint' }, __('Chaque tâche d’IA d’Atelier est lancée sur des exemples fixes, dans ce Chrome, avec le vrai Gemini Nano. Les réponses sont vérifiées automatiquement et les durées mesurées. Rien n’est enregistré dans le projet, rien ne quitte l’ordinateur. Copiez le rapport et envoyez-le pour améliorer les consignes.')),
      envBox, groups,
      h('div', { class: 'row-btns' }, runBtn, stopBtn, copyBtn, dlBtn),
      status, summary, results),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))));
  let res = null;
  let envInfo = {};
  let running = false;
  const signal = { stopped: false };
  d.addEventListener('close', () => { if (running) signal.stopped = true; d.remove(); });
  document.body.append(d);
  d.showModal();

  const st = await aiStatus('fr');
  let params = null;
  try { params = await self.LanguageModel?.params?.(); } catch (e) { log.debug('bench.params-fail', __('Paramètres du modèle illisibles'), { error: e }); }
  const ua = navigator.userAgentData?.brands?.filter(b => !/Not.?A.?Brand/i.test(b.brand)).map(b => `${b.brand} ${b.version}`).join(', ') || navigator.userAgent;
  envInfo = {
    navigateur: ua, plateforme: navigator.userAgentData?.platform || navigator.platform,
    état: Object.entries(st).map(([k, v]) => `${k}=${v}`).join(' '),
    ...(params ? { paramètres: { defaultTemperature: params.defaultTemperature, maxTemperature: params.maxTemperature, defaultTopK: params.defaultTopK, maxTopK: params.maxTopK } } : {}),
    fournisseur: window.__atelierAI ? 'test (window.__atelierAI)' : 'Chrome'
  };
  log.info('bench.open', __('Banc d’essai ouvert'), { states: st, params: envInfo.paramètres, provider: envInfo.fournisseur });
  envBox.replaceChildren(...Object.entries(AI_APIS).map(([k, a]) => h('li', { 'data-bench-api': k }, `${a.label} : ${st[k]}`)));
  const down = Object.entries(st).filter(([, v]) => v === 'downloadable' || v === 'downloading').map(([k]) => AI_APIS[k]?.label || k);
  if (st.prompt !== 'available' && st.prompt !== 'downloadable' && st.prompt !== 'downloading') {
    status.textContent = __('Prompt API indisponible dans ce navigateur : le banc d’essai ne peut tester que les API présentes (voir ✨ IA locale).');
    log.warn('bench.no-prompt', __('Prompt API indisponible : la plupart des cas seront ignorés'), { prompt: st.prompt });
  } else if (down.length) {
    status.textContent = __('À télécharger d’abord (✨ IA locale → Télécharger) : {apis}. Sinon ces cas peuvent échouer (téléchargement sans clic refusé).', { apis: down.join(', ') });
    log.warn('bench.downloadable', __('Modèles à télécharger avant le banc d’essai : {apis}', { apis: down.join(', ') }), { apis: down });
  } else status.textContent = __('Prêt.');

  async function start() {
    const chosen = [...d.querySelectorAll('[data-bench-group]:checked')].map(x => x.dataset.benchGroup);
    if (!chosen.length) { status.textContent = __('Cochez au moins un groupe.'); return; }
    running = true;
    signal.stopped = false;
    runBtn.disabled = true; stopBtn.hidden = false; stopBtn.disabled = false; copyBtn.disabled = true; dlBtn.disabled = true;
    results.replaceChildren();
    summary.textContent = '';
    const f = log.flow('bench.run', __('Banc d’essai : {groups}', { groups: chosen.map(g => BENCH_GROUPS[g]).join(', ') }), { groups: chosen, cases: BENCH_CASES.filter(c => chosen.includes(c.group)).length, provider: envInfo.fournisseur });
    try {
      status.textContent = __('Préparation des exemples…');
      const [poster, shapes] = await Promise.all([drawPoster(), drawShapes()]);
      const fx = benchFixtures({ today: localToday(), images: { poster, shapes } });
      const provider = await chromeProvider('fr');
      const a = loggedAI(provider);
      log.info('bench.env', __('Environnement du banc d’essai'), { ...envInfo, has: provider.has });
      let n = 0;
      const total = BENCH_CASES.filter(c => chosen.includes(c.group)).length;
      res = await runBench(a, {
        fx, has: provider.has, groups: chosen, signal,
        onStart: c => { status.textContent = `${n + 1}/${total} · ${c.label}…`; },
        onProgress: r => {
          n++;
          log.add(LEVEL[r.status] || 'info', 'bench.case', r.ms ? __('{case} : {status} en {s} s', { case: r.label, status: STATUS_LABEL[r.status], s: (r.ms / 1000).toFixed(1) }) : `${r.label} : ${STATUS_LABEL[r.status]}`, { id: r.id, status: r.status, ms: r.ms, via: r.via, error: r.error, reason: r.reason, failed: r.checks.filter(c => !c.ok).map(c => c.label) });
          for (const c of r.checks.filter(x => !x.ok)) log.warn('bench.check-fail', `${r.label} — ✗ ${c.label}${c.detail ? ` : ${c.detail}` : ''}`, { id: r.id, check: c.label, critical: c.critical || undefined });
          results.append(h('li', { class: `bench-row is-${r.status}`, 'data-bench-case': r.id, 'data-bench-status': r.status },
            h('span', { class: 'bench-row__head' }, h('strong', {}, STATUS_LABEL[r.status]), ` ${BENCH_GROUPS[r.group]} · ${r.label}`, r.ms ? h('small', { class: 'hint' }, ` — ${(r.ms / 1000).toFixed(1)} s${r.via ? ` · ${r.via}` : ''}`) : null),
            r.error || r.reason ? h('small', { class: 'hint' }, ` ${r.error || r.reason}`) : null,
            r.checks.length ? h('ul', { class: 'bench-checks' }, r.checks.map(c => h('li', { class: c.ok ? 'is-ok' : 'is-bad' }, `${c.ok ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`))) : null));
        }
      });
      const s = benchSummary(res);
      summary.textContent = `${benchScoreText(s)} · ${(s.ms / 1000).toFixed(1)} s.`;
      status.textContent = signal.stopped ? __('Arrêté.') : __('Terminé : copiez le rapport pour l’envoyer.');
      if (signal.stopped) f.cancel(__n(s.run, 'Arrêté après {n} cas', 'Arrêté après {n} cas'), { score: s.score, counts: s.counts });
      else f.ok(__('Note {score} / 100', { score: s.score }), { score: s.score, counts: s.counts, seconds: Math.round(s.ms / 100) / 10 });
      copyBtn.disabled = false; dlBtn.disabled = false;
    } catch (e) {
      f.fail(e, {}, __('Banc d’essai interrompu : {message}', { message: e.message }));
      status.textContent = __('Banc d’essai interrompu : {message}', { message: e.message });
    } finally {
      running = false;
      runBtn.disabled = false; stopBtn.hidden = true;
    }
  }

  const report = () => benchReport(res || [], envInfo);
  async function copy() {
    const text = report();
    try { await navigator.clipboard.writeText(text); log.info('bench.copy', __('Rapport du banc d’essai copié'), { chars: text.length }); toast(__('Rapport copié : collez-le dans votre message.')); }
    catch (e) { log.warn('bench.copy-fail', __('Copie refusée par le navigateur : utilisez « .json »'), { error: e }); toast(__('Copie refusée par le navigateur : utilisez « ⇩ .json ».'), 'error'); }
  }
  function save() {
    const data = JSON.stringify({ environment: envInfo, summary: benchSummary(res || []), results: res, report: report(), log: log.entries({ scope: 'ai' }).slice(-400) }, null, 1);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    download(`atelier-banc-essai-${stamp}.json`, data, 'application/json');
    log.info('bench.download', __('Rapport du banc d’essai téléchargé (.json, avec le journal de l’IA)'), { kb: Math.round(data.length / 1024) });
  }
}
