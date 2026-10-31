/*
 * Démonstration Kumakōgen (cycle 26) : panneau de contrôle (pause, vitesse, étape suivante, liste des étapes,
 * arrêt), exécution du script core/demo-kumakogen.js par le pilote editor/demo-driver.js, dans un projet séparé :
 * le projet de la personne est mis de côté (beginSafe/endSafe de l'auto-test) et rendu intact à la fin, sauf si
 * elle choisit « Garder ce site comme point de départ » (après confirmation, avec version de sécurité).
 */
import { h, $, toast } from './dom.js';
import { openDialog } from './dialog.js';
import { state, load } from './store.js';
import { DEMO_STEPS } from '../core/demo-kumakogen.js';
import { createDemoDriver, DemoStopped } from './demo-driver.js';
import { beginSafe, endSafe, selftestActive } from './selftest-safe.js';
import { beforeRisky } from './versions-ui.js';
import { closeTour } from './tour-ui.js';
import { inSession } from './collab-ui.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

let running = null;
export const demoRunning = () => !!running;
export const lastDemo = { result: null };

function panel(d, ctl) {
  const list = h('ol', { class: 'demo__steps', id: 'demoSteps', hidden: true }, DEMO_STEPS.map((s, i) => h('li', { 'data-demo-step': s.id }, `${i + 1}. ${s.id}`)));
  const say = h('p', { class: 'demo__say', id: 'demoSay', 'aria-live': 'polite' });
  const pos = h('span', { class: 'demo__pos', id: 'demoPos' });
  const pauseBtn = h('button', { type: 'button', class: 'btn btn--small', id: 'demoPause', onclick: () => ctl.togglePause() }, __('⏸ Pause'));
  const speed = h('select', { class: 'control control--sm', id: 'demoSpeed', 'aria-label': __('Vitesse') },
    h('option', { value: 'slow' }, __('Lente')), h('option', { value: 'normal', selected: true }, __('Normale')), h('option', { value: 'fast' }, __('Rapide')));
  speed.addEventListener('change', () => { d.setSpeed(speed.value); log.debug('demo.speed', __('Vitesse de la démonstration : {speed}', { speed: speed.value }), { speed: speed.value }); });
  const box = h('aside', { class: 'demo-panel', id: 'demoPanel', role: 'region', 'aria-labelledby': 'demoTitle' },
    h('div', { class: 'demo__head' }, h('strong', { id: 'demoTitle' }, __('▶ Démonstration : Kumakōgen')), pos),
    say,
    h('div', { class: 'demo__bar' },
      pauseBtn,
      h('button', { type: 'button', class: 'btn btn--small', id: 'demoNext', title: __('Finir tout de suite l’étape en cours'), onclick: () => ctl.next() }, __('⏭ Étape suivante')),
      speed,
      h('button', { type: 'button', class: 'btn btn--small', id: 'demoListBtn', 'aria-expanded': 'false', onclick: e => { list.hidden = !list.hidden; e.currentTarget.setAttribute('aria-expanded', String(!list.hidden)); } }, __('Étapes')),
      h('button', { type: 'button', class: 'btn btn--small btn--danger', id: 'demoStop', onclick: () => ctl.stop() }, __('⏹ Arrêter'))),
    list);
  return { box, say, pos, pauseBtn, list };
}

function finishDialog() {
  return new Promise(resolve => {
    const d = openDialog({ id: 'demoEndDialog',
    titleId: 'demoEndTitle',
    title: __('Démonstration terminée'),
    body: [h('div', { class: 'a11y-form' }, h('p', {}, __('Le site de Kumakōgen est construit : deux pages, trois langues, les 23 widgets. Que voulez-vous faire ?')))],
    actions: [h('button', { type: 'button', class: 'btn', id: 'demoBack', onclick: () => { d.close('back'); } }, __('Revenir à mon site')),
    h('button', { type: 'button', class: 'btn btn--primary', id: 'demoKeep', onclick: () => { d.close('keep'); } }, __('Garder ce site comme point de départ'))] });
    d.addEventListener('close', () => { const v = d.returnValue === 'keep' ? 'keep' : 'back'; d.remove(); resolve(v); });
  });
}

export async function startDemo({ speed = 'normal', auto = null } = {}) {
  if (running || selftestActive()) { toast(__('Une démonstration ou un auto-test est déjà en cours.'), 'warn'); return null; }
  if (inSession() || state.readOnly) { toast(__('Démonstration impossible pendant une session à plusieurs ou en relecture.'), 'error'); return null; }
  closeTour();
  document.querySelectorAll('dialog[open]').forEach(x => { try { x.close(); } catch { /* déjà fermée */ } });
  const f = log.flow('demo', __('Démonstration Kumakōgen'), { steps: DEMO_STEPS.length, speed });
  const t0 = performance.now();
  let ui = null;
  const d = createDemoDriver({ speed, onSay: t => { if (ui) ui.say.textContent = t; } });
  const ctl = {
    togglePause() {
      if (d.isPaused()) { d.resume(); ui.pauseBtn.textContent = __('⏸ Pause'); log.info('demo.resume', __('Démonstration reprise')); }
      else { d.pause(); ui.pauseBtn.textContent = __('▶ Reprendre'); log.info('demo.pause', __('Démonstration en pause')); }
    },
    next() { d.nextStep(); },
    stop() { log.info('demo.stop', __('Démonstration arrêtée par la personne')); d.stop(); }
  };
  running = { d, ctl };
  let snap = null;
  let status = 'done';
  let error = null;
  try {
    snap = await beginSafe({ kind: 'demo' });
    ui = panel(d, ctl);
    document.body.append(ui.box);
    document.body.classList.add('is-demo');
    for (let i = 0; i < DEMO_STEPS.length; i++) {
      const s = DEMO_STEPS[i];
      ui.pos.textContent = __('Étape {n} sur {total}', { n: i + 1, total: DEMO_STEPS.length });
      ui.list.querySelectorAll('li').forEach((li, k) => li.classList.toggle('is-on', k === i));
      log.info('demo.step', __('Démonstration : étape {n} sur {total} ({id})', { n: i + 1, total: DEMO_STEPS.length, id: s.id }), { index: i, id: s.id, widgets: s.widgets });
      await d.say(s.say);
      await s.run(d);
      d.stepDone();
    }
  } catch (e) {
    if (e instanceof DemoStopped) status = 'stopped';
    else { status = 'error'; error = e; log.error('demo.error', __('Démonstration interrompue : {error}', { error: e.message }), { error: e }); }
  }
  d.dispose();
  ui?.box.remove();
  document.body.classList.remove('is-demo');
  const built = state.site;
  let choice = 'back';
  if (status === 'done') choice = auto || await finishDialog();
  const restore = snap ? await endSafe(snap) : { ok: false, problems: [] };
  if (choice === 'keep' && status === 'done') {
    await beforeRisky(__('Avant de garder le site de la démonstration'));
    load(built, { keepHistory: true });
    log.info('demo.keep', __('Site de la démonstration gardé comme point de départ (version de sécurité enregistrée)'), { name: built.name, pages: built.pages.length });
  }
  const ms = Math.round(performance.now() - t0);
  lastDemo.result = { status, choice, restored: restore.ok, ms, site: built };
  running = null;
  if (status === 'done') f.ok(__('Démonstration terminée en {s} s', { s: Math.round(ms / 1000) }), { ms, choice, restored: restore.ok });
  else if (status === 'stopped') f.cancel(__('Démonstration arrêtée : ton site est remis comme avant'), { restored: restore.ok });
  else f.fail(error, { restored: restore.ok });
  if (status === 'done') log.info('demo.done', __('Démonstration : {choice}', { choice: choice === 'keep' ? __('site gardé') : __('retour au site d’origine') }), { choice });
  toast(choice === 'keep' && status === 'done' ? __('Le site de Kumakōgen est maintenant votre projet (Ctrl+Z ou Versions pour revenir).') : __('Votre site est revenu exactement comme avant.'));
  return lastDemo.result;
}

export function initDemo() {
  for (const id of ['#demoBtn', '#helpDemoBtn']) $(id)?.addEventListener('click', () => { for (const m of ['#fileMenu', '#helpMenu']) { const x = $(m); if (x) x.open = false; } startDemo(); });
  window.atelierDemo = startDemo;
}
