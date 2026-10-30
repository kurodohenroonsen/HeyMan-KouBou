/*
 * Auto-test sans coller de code (cycle 20) : fenêtre du rapport, commande courte et adresse.
 *   console : autotest()            (ou autotest({ ai: 'real' }), autotest({ only: [4] }))
 *   adresse : …/atelier/?autotest   (ou ?autotest=real) : lancé tout seul au démarrage
 *   Ctrl+K  : « Auto-test »
 * La fenêtre montre le résultat, le retour arrière et le rapport ; « Copier » est un vrai clic dans la page,
 * donc le navigateur autorise le presse-papiers (ce qu'il refuse depuis la console).
 */
import { h, toast } from './dom.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';
import { resultShort, resultDetail, rollbackText } from '../core/selftest.js';

/* Ligne courte et en-tête de la fenêtre : construits depuis le résumé structuré (lastSelftestResult), pas relus dans le
   texte du rapport, qui suit la langue de l'interface */
export const summaryLine = ({ summary, rollback }) => __('Auto-test : {result} {detail} — {rollback}', { result: resultShort(summary), detail: resultDetail(summary), rollback: rollbackText(rollback) });

export function openSelftestReport(report, result = null) {
  document.querySelector('#selftestDialog')?.remove();
  const status = h('p', { class: 'pub-status', role: 'status', 'data-selftest-status': '' }, __('Clique « 📋 Copier le rapport », puis colle-le dans ton message.'));
  const text = h('textarea', { class: 'input selftest-report', rows: 16, readonly: true, spellcheck: 'false', 'data-selftest-report': '', 'aria-label': __('Rapport de l’auto-test') });
  text.value = report;
  const res = result?.summary ? resultShort(result.summary) : '';
  const rb = result ? rollbackText(result.rollback) : '';
  const copy = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(report); ok = true; } catch { /* repli ci-dessous */ }
    if (!ok) { try { text.focus(); text.select(); ok = document.execCommand('copy'); } catch { ok = false; } }
    if (ok) log.info('selftest.copy', __('Rapport de l’auto-test copié'), { chars: report.length });
    else log.warn('selftest.copy-fail', __('Copie du rapport refusée par le navigateur : sélectionne le texte (Ctrl+A) et copie-le, ou « ⇩ .md »'), {});
    status.textContent = ok ? __('Rapport copié : colle-le dans ton message.') : __('Copie refusée : clique dans le rapport, Ctrl+A puis Ctrl+C (ou « ⇩ .md »).');
  };
  const save = () => {
    const name = `atelier-auto-test-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`;
    const a = h('a', { href: URL.createObjectURL(new Blob([report], { type: 'text/markdown' })), download: name });
    document.body.append(a); a.click(); a.remove();
    log.info('selftest.report-download', __('Rapport de l’auto-test téléchargé : {name}', { name }), { name });
  };
  const d = h('dialog', { class: 'audit selftest-dialog', id: 'selftestDialog', 'aria-labelledby': 'selftestTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'selftestTitle' }, __('🧪 Auto-test')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      h('p', { class: 'bench-summary', 'data-selftest-summary': '' }, h('strong', {}, res || __('Pas de résultat')), h('br'), rb),
      h('div', { class: 'row-btns' },
        h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-selftest-copy': '', onclick: copy }, __('📋 Copier le rapport')),
        h('button', { type: 'button', class: 'btn btn--small', 'data-selftest-download': '', onclick: save }, '⇩ .md')),
      text, status),
    h('footer', { class: 'audit__foot' },
      h('button', { type: 'button', class: 'btn', 'data-selftest-rerun': '', onclick: () => { d.close(); runAutotest(); } }, __('↻ Relancer')),
      h('button', { type: 'button', class: 'btn', 'data-selftest-close': '', onclick: () => d.close() }, __('Fermer'))));
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  text.scrollTop = 0;
  log.info('selftest.dialog', __('Fenêtre du rapport de l’auto-test'), { result: res.replace(/\s+/g, ' ').trim() });
}

/* Lance l'auto-test puis ouvre la fenêtre du rapport ; renvoie une ligne courte (pour la console) */
export async function runAutotest(opts = {}) {
  toast(__('Auto-test en cours… ne touche à rien et reste sur cet onglet (environ une minute).'));
  const { selftest, lastSelftestResult } = await import('./selftest.js');
  const report = await selftest(opts);
  /* Refus (test déjà en cours, relecture…) : selftest() renvoie un message, pas de nouveau résultat */
  const result = lastSelftestResult();
  if (!result || result.report !== report) { toast(report, 'error'); return report; }
  openSelftestReport(report, result);
  return summaryLine(result);
}

/* ?autotest ou ?autotest=real : lancé au démarrage, puis l'adresse est nettoyée (un rechargement ne relance pas) */
export function autoStartFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.has('autotest')) return;
  const mode = q.get('autotest');
  q.delete('autotest');
  history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
  const opts = mode === 'real' ? { ai: 'real' } : mode === 'off' ? { ai: false } : {};
  log.info('selftest.auto', __('Auto-test demandé par l’adresse (?autotest)'), { ai: opts.ai ?? 'fake' });
  setTimeout(() => runAutotest(opts), 300);
}

window.autotest = opts => runAutotest(opts);
