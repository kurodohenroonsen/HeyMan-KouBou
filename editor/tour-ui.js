/*
 * Visite guidée « Découvrir l'écran » (cycle 26) : masque avec découpe autour de l'élément visé, bulle
 * role="dialog" positionnée et repositionnée au défilement et au redimensionnement, clavier (Échap quitte,
 * Tab enfermé dans la bulle, flèches et Entrée avancent), focus rendu à l'élément d'origine à la fin.
 * Proposée à la première visite (localStorage['atelier-tour']), rejouable depuis ❓, Fichier et Ctrl+K.
 * La logique (étapes, déroulement, géométrie) est dans core/tour.js.
 */
import { h, $ } from './dom.js';
import { TOUR_STEPS, TOUR_KEY, shouldOfferTour, createTour, placeBubble, unionRect, cutoutRect } from '../core/tour.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

const lsRead = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsWrite = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

let tour = null;
let mask = null;
let bubble = null;
let returnFocus = null;
let observer = null;
let from = '';
let lastLogged = -1;

export const tourActive = () => !!tour && ['welcome', 'running'].includes(tour.state().status);

/* ---------- Géométrie de la cible ---------- */
function targetRect(step) {
  const sels = Array.isArray(step.target) ? step.target : [step.target];
  const rects = sels.map(s => document.querySelector(s)).filter(el => el && !el.hidden).map(el => el.getBoundingClientRect())
    .filter(r => r.width || r.height).map(r => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
  return unionRect(rects);
}

function maskPath(cut) {
  const W = innerWidth;
  const H = innerHeight;
  const outer = `M0 0H${W}V${H}H0Z`;
  if (!cut) return outer;
  const r = 8;
  const { x, y, w, h: hh } = cut;
  const inner = `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + hh - r}Q${x + w} ${y + hh} ${x + w - r} ${y + hh}H${x + r}Q${x} ${y + hh} ${x} ${y + hh - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  return outer + inner;
}

function place() {
  if (!tour || !bubble) return;
  const st = tour.state();
  const rect = st.status === 'running' ? targetRect(st.step) : null;
  const cut = rect ? cutoutRect(rect, 6) : null;
  mask.querySelector('path').setAttribute('d', maskPath(cut));
  const size = bubble.getBoundingClientRect();
  const pos = placeBubble(cut, { w: size.width, h: size.height }, { w: innerWidth, h: innerHeight }, { prefer: st.step?.side || 'right' });
  bubble.style.left = `${pos.left}px`;
  bubble.style.top = `${pos.top}px`;
  bubble.dataset.side = pos.side;
  if (pos.arrow !== null) bubble.style.setProperty('--arrow', `${pos.arrow}px`);
}

/* ---------- Bulle ---------- */
function render() {
  const st = tour.state();
  if (st.status === 'done' || st.status === 'idle') { close(); return; }
  const welcome = st.status === 'welcome';
  const title = welcome ? __('Bienvenue dans Atelier') : __(st.step.title);
  const text = welcome ? __('Une visite en cinq étapes pour découvrir l’écran : une minute, pas plus. Vous pourrez la revoir à tout moment depuis la flèche à côté de ❓ ou le menu Fichier.') : __(st.step.text);
  const count = welcome ? '' : __('Étape {n} sur {total}', { n: st.index + 1, total: st.total });
  const btn = (cls, label, fn, extra = {}) => h('button', { type: 'button', class: `btn btn--small ${cls}`, onclick: fn, ...extra }, label);
  const next = welcome ? btn('btn--primary', __('Commencer la visite'), () => tour.next(), { 'data-tour': 'next' })
    : btn('btn--primary', st.last ? __('Terminer') : __('Suivant'), () => tour.next(), { 'data-tour': 'next' });
  const dots = welcome ? null : h('div', { class: 'tour__dots', 'aria-hidden': 'true' }, TOUR_STEPS.map((s, i) => h('i', { class: i === st.index ? 'is-on' : i < st.index ? 'is-done' : '' })));
  bubble.replaceChildren(
    h('div', { class: 'tour__head' }, h('span', { class: 'tour__count', id: 'tourCount' }, count), h('h2', { id: 'tourTitle' }, title)),
    h('p', { id: 'tourText' }, text),
    dots,
    h('div', { class: 'tour__foot' },
      btn('tour__skip', __('Passer'), () => tour.skip(), { 'data-tour': 'skip', title: __('Quitter la visite (Échap)') }),
      welcome || st.first ? null : btn('', __('Précédent'), () => tour.prev(), { 'data-tour': 'prev' }),
      next));
  bubble.setAttribute('aria-describedby', 'tourText');
  if (!welcome && lastLogged !== st.index) { lastLogged = st.index; log.debug('tour.step', __('Visite : étape {n} sur {total} ({id})', { n: st.index + 1, total: st.total, id: st.step.id }), { index: st.index, id: st.step.id }); }
  place();
  observer?.disconnect();
  observer = new ResizeObserver(place);
  for (const sel of Array.isArray(st.step?.target) ? st.step.target : [st.step?.target]) { const el = sel && document.querySelector(sel); if (el) observer.observe(el); }
  observer.observe(document.body);
  bubble.querySelector('[data-tour="next"]')?.focus();
}

function onKey(e) {
  if (!tourActive()) return;
  const focusables = [...bubble.querySelectorAll('button:not([disabled])')];
  if (e.key === 'Tab') {
    e.preventDefault();
    e.stopImmediatePropagation();
    const i = focusables.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : (i < 0 || i === focusables.length - 1 ? 0 : i + 1);
    focusables[next]?.focus();
    return;
  }
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); tour.skip(); return; }
  if (e.key === 'ArrowRight' || (e.key === 'Enter' && !document.activeElement?.closest?.('#tourBubble button'))) { e.preventDefault(); e.stopImmediatePropagation(); tour.next(); return; }
  if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); tour.prev(); return; }
  /* Toute autre touche reste dans la bulle : rien ne passe à l'éditeur pendant la visite */
  if (!document.activeElement?.closest?.('#tourBubble')) e.stopImmediatePropagation();
}

function open() {
  if (mask) return;
  returnFocus = document.activeElement;
  mask = h('div', { class: 'tour-mask', id: 'tourMask', 'aria-hidden': 'true' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill-rule', 'evenodd');
  svg.append(path);
  mask.append(svg);
  bubble = h('div', { class: 'tour-bubble', id: 'tourBubble', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tourTitle' });
  document.body.append(mask, bubble);
  document.body.classList.add('is-touring');
  window.addEventListener('resize', place);
  document.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
}

function close() {
  observer?.disconnect();
  observer = null;
  window.removeEventListener('resize', place);
  document.removeEventListener('scroll', place, true);
  document.removeEventListener('keydown', onKey, true);
  mask?.remove();
  bubble?.remove();
  mask = null;
  bubble = null;
  document.body.classList.remove('is-touring');
  const back = returnFocus;
  returnFocus = null;
  if (back?.isConnected && back !== document.body) { try { back.focus({ preventScroll: true }); } catch { /* élément non focalisable */ } }
}

function onChange(st) {
  if (st.status === 'done') {
    const stored = tour.stored();
    if (stored?.how === 'skip') log.info('tour.skip', __('Visite passée à l’étape {n} : elle ne sera plus proposée (flèche à côté de ❓ ou Fichier → Visite guidée pour la revoir)', { n: (stored.step ?? 0) + 1 }), { step: stored.step, from });
    else log.info('tour.done', __('Visite guidée terminée'), { from, steps: st.total });
    close();
    return;
  }
  render();
}

function ensureTour() {
  if (!tour) tour = createTour({ steps: TOUR_STEPS, read: lsRead, write: lsWrite, onChange });
  return tour;
}

/* ---------- API ---------- */
export function startTour({ auto = false, from: origin = 'menu' } = {}) {
  ensureTour();
  if (tourActive()) return false;
  document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch { /* déjà fermée */ } });
  const fm = $('#fileMenu'); if (fm) fm.open = false;
  const hm = $('#helpMenu'); if (hm) hm.open = false;
  from = origin;
  lastLogged = -1;
  log.info('tour.start', auto ? __('Visite guidée proposée (première visite)') : __('Visite guidée lancée depuis {from}', { from: origin }), { auto, from: origin, steps: TOUR_STEPS.length });
  open();
  tour.start({ auto });
  return true;
}

export function closeTour() { if (tourActive()) tour.skip(); }

/* Première visite : proposée une fois l'éditeur prêt, sauf en test (?fresh), en auto-test ou sur une invitation */
export function offerTour() {
  if (!shouldOfferTour({ stored: lsRead(TOUR_KEY), search: location.search, hash: location.hash })) return false;
  setTimeout(() => { if (!document.querySelector('dialog[open]')) startTour({ auto: true, from: 'première visite' }); }, 400);
  return true;
}

export function initTour() {
  for (const id of ['#tourBtn', '#helpTourBtn']) $(id)?.addEventListener('click', () => startTour({ from: id === '#tourBtn' ? 'Fichier' : '❓' }));
}
