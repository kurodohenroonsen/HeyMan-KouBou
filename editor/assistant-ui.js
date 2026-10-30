/*
 * « ✨ Demander à Atelier » : une demande en langage courant → actions de la liste fermée (core/assistant.js),
 * préparées par l'IA locale, vérifiées, montrées en aperçu, appliquées en une seule étape d'annulation.
 */
import { h, $, toast } from './dom.js';
import { state, commit, setView } from './store.js';
import { log } from './log.js';
import { withAI, markAi, openAI } from './ai-ui.js';
import { applyPlan } from '../core/assistant.js';
import { __, __n } from '../core/ui-i18n.js';

let tools = {};
export function setAssistantTools(t) { tools = { ...tools, ...t }; }

/* Exemples de demandes : traduits dans la langue de l'interface (la personne écrit dans sa langue) */
const EXAMPLES = () => [
  __('Ajoute une FAQ de 3 questions sur l’adhésion au MAB'),
  __('Mets tous les titres de cette page en couleur principale et centrés'),
  __('Crée une page « Notre radio » avec un héros, un texte et image et un formulaire de contact'),
  __('Ajoute un appel à l’action pour rejoindre le réseau après cette section')
];

export function openAsk(request = '') {
  $('#askDialog')?.remove();
  const ctx = { pageId: state.pageId, selectedId: state.selected, lang: state.lang, editTarget: state.editTarget };
  log.info('assist.open', __('Demander à Atelier'), { chars: request.length, page: ctx.pageId, selected: ctx.selectedId || undefined, lang: ctx.lang, edit: ctx.editTarget?.kind });
  let plan = null;
  let applied = false;
  const input = h('textarea', { class: 'input smart-text', rows: 3, 'data-ask-request': '', placeholder: __('Que voulez-vous faire ? Par exemple : ajoute une FAQ de 3 questions sur l’adhésion.'), 'aria-label': __('Votre demande') });
  input.value = request;
  const status = h('p', { class: 'pub-status', role: 'status', 'data-ask-status': '' });
  const out = h('div', { class: 'smart-out', 'data-ask-out': '' });
  const prepare = h('button', { type: 'button', class: 'btn btn--small btn--primary btn--ai', 'data-ask-plan': '', onclick: () => run() }, __('✨ Préparer'));
  const apply = h('button', { type: 'button', class: 'btn btn--primary', 'data-ask-apply': '', hidden: true, onclick: () => doApply() }, __('Appliquer'));
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
  const d = h('dialog', { class: 'audit smart-dialog', id: 'askDialog', 'aria-labelledby': 'askTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'askTitle' }, __('✨ Demander à Atelier')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      h('p', { class: 'hint' }, __('Décrivez ce que vous voulez : l’IA locale le traduit en actions que l’éditeur sait faire (ajouter une section, une FAQ, un élément, mettre en forme, créer une page…). Vous voyez tout avant d’appliquer ; Ctrl+Z annule en une fois.')),
      input,
      h('div', { class: 'row-btns' }, prepare, h('span', { class: 'hint' }, __('Ctrl+Entrée'))),
      h('details', { class: 'collab-adv' }, h('summary', {}, __('Exemples')), h('ul', {}, EXAMPLES().map(x => h('li', {}, h('button', { type: 'button', class: 'btn btn--small', 'data-ask-example': '', onclick: () => { input.value = x; input.focus(); } }, x))))),
      status, out),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer')), apply));
  d.addEventListener('close', () => { if (plan && !applied) log.info('assist.cancel', __('Demande fermée sans appliquer'), { steps: plan.steps.length }); d.remove(); });
  document.body.append(d);
  d.showModal();
  input.focus();

  async function run() {
    const text = input.value.trim();
    if (!text) { status.textContent = __('Écrivez d’abord votre demande.'); return; }
    status.textContent = __('Préparation…');
    apply.hidden = true;
    out.replaceChildren();
    prepare.disabled = true;
    const r = await withAI(__('Préparation de la demande'), a => a.plan({ site: state.site, request: text, ctx, lang: state.lang }));
    prepare.disabled = false;
    if (!r) {
      status.replaceChildren(__('Préparation impossible.'), ' ', h('button', { type: 'button', class: 'btn btn--small', onclick: () => openAI() }, __('✨ IA locale')));
      log.warn('assist.plan-fail', __('Demande non préparée (voir ai.plan)'), { chars: text.length });
      return;
    }
    plan = r.value;
    log.info('assist.plan', __('{n} action(s) prête(s), {rejected} refusée(s)', { n: plan.steps.length, rejected: plan.rejected.length }), { request: text.slice(0, 120), summary: plan.summary, steps: plan.steps.map(s => s.action), rejected: plan.rejected.length, warnings: plan.warnings.length });
    for (const x of plan.rejected) log.warn('assist.rejected', __('Action refusée ({action}) : {reason}', { action: x.action, reason: x.reason }), { action: x.action });
    for (const w of plan.warnings) log.warn('assist.warning', w, {});
    out.replaceChildren(...[
      plan.summary ? h('p', { 'data-ask-summary': '' }, `✨ ${plan.summary}`) : null,
      plan.steps.length ? h('ol', { class: 'smart-tasks', 'data-ask-steps': '' }, plan.steps.map(s => h('li', { 'data-ask-step': s.action }, s.label))) : h('p', { class: 'pub-status is-info', 'data-ask-nothing': '' }, __('Rien à faire avec les actions disponibles : reformulez, ou utilisez la recherche de Ctrl+K.')),
      plan.rejected.length ? h('div', {}, h('h3', {}, __('Refusé')), h('ul', { 'data-ask-rejected': '' }, plan.rejected.map(x => h('li', { class: 'is-dropped' }, `⚠ ${x.reason}`)))) : null,
      plan.warnings.length ? h('ul', { class: 'hint', 'data-ask-warnings': '' }, plan.warnings.map(w => h('li', {}, `⚠ ${w}`))) : null
    ].filter(Boolean));
    apply.hidden = !plan.steps.length;
    apply.textContent = __n(plan.steps.length, 'Appliquer ({n} action)', 'Appliquer ({n} actions)');
    status.textContent = plan.steps.length ? __('Vérifiez, puis appliquez.') : '';
    if (!plan.steps.length) log.info('assist.nothing', __('Aucune action applicable pour cette demande'), { summary: plan.summary });
  }

  function doApply() {
    if (!plan?.steps.length) return;
    const f = log.flow('assist.apply', __('Application de {n} action(s)', { n: plan.steps.length }), { steps: plan.steps.map(s => s.action) });
    const r = applyPlan(state.site, plan.steps, ctx);
    for (const label of r.done) f.step('step', label, {}, 'info');
    for (const e of r.errors) f.warn('step-fail', __('{label} : {error}', { label: e.label, error: e.error }), {});
    if (!r.done.length) { f.fail(new Error(r.errors[0]?.error || __('aucune action appliquée')), { errors: r.errors.length }); toast(__('Rien n’a pu être appliqué : {error}', { error: r.errors[0]?.error || '' }), 'error'); return; }
    let s = r.site;
    for (const t of r.aiTexts) {
      if (t.pageTitle) s = markAi(s, `p:${t.pageId}:title`, t.lang);
      else if (t.nodeId) s = markAi(s, `n:${t.pageId}:${t.nodeId}:${t.field}`, t.lang);
    }
    const changed = s !== state.site;
    if (changed) commit(s, { source: 'assistant' });
    if (Object.keys(r.view).length) setView(r.view);
    for (const tool of r.ui) { try { tools[tool]?.(); } catch (e) { f.warn('tool-fail', __('Outil « {tool} » non ouvert : {error}', { tool, error: e.message }), { tool }); } }
    applied = true;
    f.ok([__('{n} action(s) appliquée(s)', { n: r.done.length }), r.errors.length ? __(', {n} en échec', { n: r.errors.length }) : '', changed ? __(' (Ctrl+Z pour tout annuler)') : ''].join(''), { done: r.done.length, errors: r.errors.length, aiTexts: r.aiTexts.length, view: r.view, ui: r.ui, changed });
    toast(changed ? __n(r.done.length, '{n} action appliquée : Ctrl+Z pour tout annuler.', '{n} actions appliquées : Ctrl+Z pour tout annuler.') : __n(r.done.length, '{n} action appliquée.', '{n} actions appliquées.'), r.errors.length ? 'error' : undefined);
    d.close();
  }
}
