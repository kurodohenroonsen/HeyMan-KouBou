/*
 * Visite guidée « Découvrir l'écran » (cycle 26) : logique pure, sans DOM.
 * Étapes, décision de la proposer à la première visite, déroulement (accueil, suivant, précédent, passer,
 * terminer) avec le choix retenu par l'éditeur (localStorage['atelier-tour']), et géométrie de la bulle
 * (côté libre, flèche, maintien dans la fenêtre) et de la découpe du masque autour de l'élément visé.
 */
import { N_ } from './ui-i18n.js';

export const TOUR_KEY = 'atelier-tour';

/* target : sélecteur CSS, ou liste de sélecteurs dont les rectangles sont réunis ; side : côté préféré de la bulle */
export const TOUR_STEPS = [
  { id: 'library', target: '.panel--left', side: 'right',
    title: N_('La bibliothèque, à gauche'),
    text: N_('Les briques du site : widgets (titre, texte, image, bouton…), modèles de sections, structure de la page, pages, contenus et réglages du site. Cliquez sur un widget pour l’ajouter, ou glissez-le dans la page.') },
  { id: 'page', target: '#stage', side: 'top',
    title: N_('La page, au centre'),
    text: N_('La page telle que les visiteurs la verront. Cliquez sur un élément pour le sélectionner, double-cliquez sur un texte pour l’écrire directement. Les boutons Ordinateur, Tablette et Mobile la montrent à la taille de chaque appareil.') },
  { id: 'inspector', target: '#inspector', side: 'left',
    title: N_('L’inspecteur, à droite'),
    text: N_('Les réglages de l’élément sélectionné : son contenu (textes dans chaque langue, image, lien), son style (couleurs, marges, tailles) et les options avancées. Rien à sélectionner ? Il vous donne des conseils.') },
  { id: 'topbar', target: '.topbar', side: 'bottom',
    title: N_('La barre du haut'),
    text: N_('Le nom du site, la page affichée, annuler et rétablir, l’appareil, la langue écrite dans la page, les traductions, le référencement, puis « Exporter le site » et « 🚀 Publier ». « Enregistré » : chaque modification est gardée sur cet ordinateur.') },
  { id: 'help', target: ['#fileMenu', '#helpBtn'], side: 'bottom',
    title: N_('Fichier et ❓'),
    text: N_('Le menu Fichier : nouveau site, versions, aperçu, enregistrer en fichier, cette visite et la démonstration. Le bouton ❓ ouvre le guide complet ; la flèche à côté propose la visite, une démonstration et les raccourcis. Bonne construction !') }
];

/* Proposer la visite ? Jamais si elle a déjà été vue ou passée, pendant un test (?fresh, ou navigateur piloté par un
   outil de test sans ?tour), un auto-test (?autotest) ni à l'ouverture d'une invitation (#join=) */
export function shouldOfferTour({ stored, search = '', hash = '', automated = false } = {}) {
  if (stored !== null && stored !== undefined) return false;
  const q = String(search || '');
  if (automated && !/[?&]tour(=|&|$)/.test(q)) return false;
  if (/[?&](fresh|autotest)(=|&|$)/.test(q)) return false;
  if (/^#join=/.test(String(hash || ''))) return false;
  return true;
}

/*
 * Déroulement. read(key) / write(key, json) : persistance fournie par l'éditeur ; onChange(state) à chaque changement.
 * État : { status: idle | welcome | running | done, index, step, total, first, last }.
 */
export function createTour({ steps = TOUR_STEPS, read = () => null, write = () => {}, now = () => Date.now(), onChange = () => {} } = {}) {
  let status = 'idle';
  let index = -1;
  const state = () => ({ status, index, step: status === 'running' ? steps[index] : null, total: steps.length, first: index <= 0, last: index === steps.length - 1 });
  const change = () => { onChange(state()); };
  const remember = how => { write(TOUR_KEY, JSON.stringify({ done: true, how, step: Math.max(0, index), at: now() })); };
  const end = how => { remember(how); status = 'done'; index = steps.length; change(); };
  return {
    state,
    stored: () => { try { return JSON.parse(read(TOUR_KEY) || 'null'); } catch { return null; } },
    start({ auto = false } = {}) {
      if (status === 'welcome' || status === 'running') return false;
      if (auto) { status = 'welcome'; index = -1; } else { status = 'running'; index = 0; }
      change();
      return true;
    },
    next() {
      if (status === 'welcome') { status = 'running'; index = 0; change(); return true; }
      if (status !== 'running') return false;
      if (index >= steps.length - 1) { end('done'); return true; }
      index++;
      change();
      return true;
    },
    prev() {
      if (status !== 'running' || index <= 0) return false;
      index--;
      change();
      return true;
    },
    skip() { if (status === 'idle' || status === 'done') return false; end('skip'); return true; },
    finish() { if (status === 'idle' || status === 'done') return false; end('done'); return true; }
  };
}

/* ---------- Géométrie ---------- */

export function unionRect(rects) {
  const list = rects.filter(Boolean);
  if (!list.length) return null;
  const x = Math.min(...list.map(r => r.x));
  const y = Math.min(...list.map(r => r.y));
  const right = Math.max(...list.map(r => r.x + r.w));
  const bottom = Math.max(...list.map(r => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/* Découpe du masque : la cible élargie de pad, sans déborder en haut ni à gauche */
export function cutoutRect(target, pad = 8) {
  const x = Math.max(0, target.x - pad);
  const y = Math.max(0, target.y - pad);
  return { x, y, w: target.x + target.w + pad - x, h: target.y + target.h + pad - y };
}

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

/*
 * Position de la bulle : côté préféré s'il reste de la place, sinon le premier côté libre (droite, gauche,
 * dessous, dessus), sinon le plus spacieux ; sans cible, au centre. arrow : position de la flèche le long du
 * bord qui touche la cible, mesurée depuis le coin haut-gauche de la bulle.
 */
export function placeBubble(target, size, view, { gap = 12, margin = 12, prefer = 'right' } = {}) {
  if (!target) return { left: Math.round((view.w - size.w) / 2), top: Math.round((view.h - size.h) / 2), side: 'center', arrow: null };
  const room = {
    right: view.w - (target.x + target.w) - gap - margin,
    left: target.x - gap - margin,
    bottom: view.h - (target.y + target.h) - gap - margin,
    top: target.y - gap - margin
  };
  const fits = s => (s === 'left' || s === 'right' ? room[s] >= size.w : room[s] >= size.h);
  const order = [prefer, 'right', 'left', 'bottom', 'top'].filter((s, i, a) => room[s] !== undefined && a.indexOf(s) === i);
  let side = order.find(fits);
  if (!side) side = order.reduce((a, b) => (room[b] - (b === 'left' || b === 'right' ? size.w : size.h) > room[a] - (a === 'left' || a === 'right' ? size.w : size.h) ? b : a));
  const cx = target.x + target.w / 2;
  const cy = target.y + target.h / 2;
  let left;
  let top;
  if (side === 'right') { left = target.x + target.w + gap; top = cy - size.h / 2; }
  else if (side === 'left') { left = target.x - gap - size.w; top = cy - size.h / 2; }
  else if (side === 'bottom') { top = target.y + target.h + gap; left = cx - size.w / 2; }
  else { top = target.y - gap - size.h; left = cx - size.w / 2; }
  left = Math.round(clamp(left, margin, Math.max(margin, view.w - margin - size.w)));
  top = Math.round(clamp(top, margin, Math.max(margin, view.h - margin - size.h)));
  const arrow = side === 'left' || side === 'right' ? Math.round(clamp(cy - top, 16, size.h - 16)) : Math.round(clamp(cx - left, 16, size.w - 16));
  return { left, top, side, arrow };
}
