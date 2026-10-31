/*
 * Liste « Pour commencer » (cycle 26) : bloc en tête de l'onglet Widgets, sept étapes cochées automatiquement
 * d'après le journal (abonnement à editor/log.js), pourcentage, lien « → » vers l'action, repliable, masquable ;
 * le choix et les étapes faites sont retenus dans localStorage['atelier-onboarding'].
 * La logique (étapes, codes, pourcentage) est dans core/onboarding.js.
 */
import { h, $, toast } from './dom.js';
import { ONBOARDING_STEPS, ONBOARDING_KEY, matchEntry, progress, parseStored, serializeStored } from '../core/onboarding.js';
import { state, setView, select, page } from './store.js';
import { walk } from '../core/tree.js';
import { editSelected } from './inline.js';
import { insertWidget } from './actions.js';
import { selftestActive } from './selftest-safe.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

const lsRead = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsWrite = (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

let st = parseStored(lsRead(ONBOARDING_KEY));
const save = () => lsWrite(ONBOARDING_KEY, serializeStored(st));
export const onboardingState = () => ({ ...st, ...progress(st.done) });
export function reloadOnboarding() { st = parseStored(lsRead(ONBOARDING_KEY)); refresh(); }

/* ---------- Actions des liens « → » ---------- */
const firstNode = type => { let found = null; walk(page().root, n => { if (n.type === type) { found = n; return false; } return true; }); return found; };
function leftTab(name) { $(`[data-left="${name}"]`)?.click(); }
const ACTIONS = {
  'site-name': () => { leftTab('site'); setTimeout(() => $('#leftBody [data-site="name"]')?.focus(), 0); },
  languages: () => { leftTab('site'); setTimeout(() => $('#leftBody [data-lang-toggle]')?.focus(), 0); },
  templates: () => leftTab('templates'),
  heading: () => {
    const n = firstNode('heading');
    if (!n) { toast(__('Ajoutez d’abord une section (onglet Modèles) : elle contient un titre.')); leftTab('templates'); return; }
    select(n.id, { scroll: true });
    setTimeout(() => editSelected(), 120);
  },
  image: () => {
    const n = firstNode('image');
    if (n) { select(n.id, { scroll: true }); state.insp = 'content'; return; }
    insertWidget('image');
  },
  mobile: () => setView({ device: 'mobile' }),
  publish: () => $('#previewBtn')?.click()
};

/* ---------- Bloc ---------- */
function render() {
  const p = progress(st.done);
  const all = p.percent === 100;
  const toggle = h('button', { type: 'button', class: 'onboard__toggle', 'aria-expanded': String(!st.collapsed), 'aria-controls': 'onboardList', title: st.collapsed ? __('Déplier la liste') : __('Replier la liste'), onclick: () => { st.collapsed = !st.collapsed; save(); log.debug('onboarding.toggle', st.collapsed ? __('Liste « Pour commencer » repliée') : __('Liste « Pour commencer » dépliée'), { collapsed: st.collapsed }); refresh(); } }, st.collapsed ? '▸' : '▾');
  const hide = h('button', { type: 'button', class: 'icon-btn icon-btn--sm onboard__hide', title: __('Masquer la liste (Ctrl+K « Pour commencer » pour la revoir)'), 'aria-label': __('Masquer la liste'), onclick: () => { st.hidden = true; save(); log.info('onboarding.hide', __('Liste « Pour commencer » masquée (Ctrl+K « Pour commencer » pour la revoir)'), { percent: p.percent }); refresh(); toast(__('Liste masquée. Pour la revoir : Ctrl+K, « Pour commencer ».')); } }, '✕');
  const items = ONBOARDING_STEPS.map(s => {
    const done = st.done.includes(s.id);
    return h('li', { class: 'onboard__item' + (done ? ' is-done' : ''), 'data-onboard': s.id },
      h('span', { class: 'onboard__check', 'aria-hidden': 'true' }, done ? '✓' : ''),
      h('span', { class: 'onboard__label' }, __(s.label), done ? h('span', { class: 'vh' }, ' ' + __('(fait)')) : null),
      h('button', { type: 'button', class: 'onboard__go', 'data-onboard-go': s.id, title: __(s.hint), 'aria-label': __('{step} : y aller', { step: __(s.label) }), onclick: () => { log.debug('onboarding.go', __('Lien « Pour commencer » : {step}', { step: __(s.label) }), { step: s.id }); ACTIONS[s.action]?.(); } }, '→'));
  });
  return h('section', { class: 'onboard' + (st.collapsed ? ' is-collapsed' : '') + (all ? ' is-complete' : ''), id: 'onboarding', 'aria-labelledby': 'onboardTitle' },
    h('div', { class: 'onboard__head' }, toggle, h('h3', { id: 'onboardTitle' }, __('Pour commencer')), h('span', { class: 'onboard__pct', 'data-onboard-pct': '', 'aria-live': 'polite' }, `${p.done} / ${p.total} · ${p.percent} %`), hide),
    h('div', { class: 'onboard__bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${p.percent}%` } })),
    h('ol', { class: 'onboard__list', id: 'onboardList', hidden: st.collapsed }, items),
    all && !st.collapsed ? h('p', { class: 'hint onboard__bravo' }, __('Bravo, les sept premiers pas sont faits ! La suite est dans le guide (❓) et dans la démonstration.')) : null);
}

/* Éléments à placer en tête de l'onglet Widgets (rien si la liste est masquée) */
export function onboardingBlock() { return st.hidden ? [] : [render()]; }

function refresh() {
  const cur = $('#onboarding');
  if (cur) { if (st.hidden) cur.remove(); else cur.replaceWith(render()); return; }
  if (!st.hidden && state.left === 'widgets') $('#leftBody')?.prepend(render());
}

export function showOnboarding() {
  st.hidden = false;
  st.collapsed = false;
  save();
  log.info('onboarding.show', __('Liste « Pour commencer » affichée'), { percent: progress(st.done).percent });
  if (state.left !== 'widgets') { state.left = 'widgets'; $('[data-left="widgets"]')?.click(); }
  refresh();
}

/* ---------- Journal → étapes cochées ---------- */
export function initOnboarding() {
  log.subscribe(e => {
    if (e.code === 'selftest.rollback.ok') { reloadOnboarding(); return; }
    if (selftestActive() || progress(st.done).percent === 100) return;
    for (const s of ONBOARDING_STEPS) {
      if (st.done.includes(s.id) || !matchEntry(s, e)) continue;
      st.done.push(s.id);
      save();
      const p = progress(st.done);
      log.info('onboarding.step-done', __('Pour commencer : « {step} » fait ({percent} %)', { step: __(s.label), percent: p.percent }), { step: s.id, done: p.done, total: p.total, percent: p.percent, by: e.code });
      if (p.percent === 100) log.info('onboarding.done', __('Pour commencer : les sept étapes sont faites'), { by: e.code });
      refresh();
    }
  });
}
