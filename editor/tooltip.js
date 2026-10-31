/*
 * Infobulles de l'éditeur (cycle 21) : survol (0,35 s), clavier (Tab), barre du canevas.
 * Texte : data-tip, sinon title (déplacé dans data-tip pour éviter la bulle native), sinon aria-label d'un bouton à icône.
 * Explication : data-tip-desc, ou DESC ci-dessous pour les boutons les plus obscurs. Raccourci : « Texte (Ctrl+Z) ».
 */
import { pickTip, macKeys, isIconOnly, placeTip } from '../core/tooltip.js';
import { onCanvasReady, canvasScale } from './canvas.js';
import { __ } from '../core/ui-i18n.js';

const SHOW_MS = 350;
const QUICK_MS = 300;
const IS_MAC = /Mac|iPhone|iPad/i.test(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '');

const DESC = [
  ['#undoBtn', __('Revient sur la dernière modification (jusqu’à 150 étapes).')],
  ['#redoBtn', __('Refait ce que tu viens d’annuler.')],
  ['[data-device="desktop"]', __('Voir et régler la page comme sur un ordinateur : elle prend toute la largeur disponible (1040 px au moins).')],
  ['[data-device="tablet"]', __('Voir et régler la page comme sur une tablette ; les réglages faits ici ne valent que pour la tablette.')],
  ['[data-device="mobile"]', __('Voir et régler la page comme sur un téléphone ; les réglages faits ici ne valent que pour le mobile.')],
  ['#aiBtn', __('Reformuler, corriger, décrire les images, traduire… avec Gemini Nano, sur ton ordinateur : rien n’est envoyé.')],
  ['#collabBtn', __('Inviter quelqu’un à modifier le site avec toi, en direct, d’ordinateur à ordinateur.')],
  ['#commentsBtn', __('Laisser ou lire des remarques sur la page (relecture), signées par leur auteur.')],
  ['#helpBtn', __('Le guide d’utilisation complet, dans la langue de l’interface ; depuis une fenêtre ouverte, F1 ouvre directement son chapitre.')],
  ['#helpMenu > summary', __('Visite guidée de l’écran, démonstration (Atelier construit un site sous vos yeux) et raccourcis clavier.')],
  ['#logBtn', __('Tout ce que fait l’éditeur, à copier pour signaler un problème. Raccourci : Ctrl+Alt+J.')],
  ['#i18nBtn', __('Tous les textes du site dans toutes les langues, avec ce qui reste à traduire.')],
  ['#seoBtn', __('Comment Google verra chaque page : note, aperçu et conseils.')],
  ['#publishBtn', __('Mettre le site en ligne (OVH avec publish.php, ou GitHub Pages).')],
  ['#exportZipBtn', __('Vérifie le site puis télécharge toutes ses pages dans un .zip.')],
  ['[data-act="parent"]', __('Sélectionne le bloc qui contient cet élément (colonne, rangée, section).')],
  ['[data-act="move"]', __('Maintiens le clic et glisse pour déplacer l’élément ailleurs dans la page.')],
  ['[data-act="duplicate"]', __('Crée une copie juste en dessous.')],
  ['[data-act="delete"]', __('Retire l’élément (Ctrl+Z pour le récupérer).')],
  ['[data-act="copy-style"]', __('Retient la mise en forme de cet élément pour l’appliquer à un autre.')],
  ['[data-act="paste-style"]', __('Applique la mise en forme retenue à cet élément.')],
  ['[data-style-all-devices]', __('Affiche les trois colonnes ordinateur, tablette et mobile pour régler chaque appareil.')],
  ['[data-reset]', __('Efface ce réglage : l’élément reprend la valeur du site ou de son parent.')],
  ['[data-page-delete]', __('Supprime la page et la retire du menu (Ctrl+Z pour la récupérer).')],
  ['#zoomSelect', __('Ajuster : la page remplit la place disponible ; 100 % : taille réelle (défilement si elle dépasse) ; 75 % et 50 % : une page plus large, comme sur un grand écran.')],
  ['#zoomInBtn', __('Palier de zoom suivant (50, 75, 100 %).')],
  ['#zoomOutBtn', __('Palier de zoom précédent (100, 75, 50 %).')],
  ['#panelsBtn', __('Cache ou montre les panneaux de gauche et de droite : la page prend toute la largeur, lisible sur un portable.')],
  ['[data-box-lock]', __('Lié : une seule valeur pour les quatre côtés. Séparé : chaque côté se règle seul.')],
  ['[data-free]', __('Tape une valeur libre : clamp(1rem, 3vw, 2rem), var(--space-m), auto… Le champ ordinaire prend un nombre et une unité.')],
  ['[data-expert-on]', __('Montre tous les réglages : dimensions, disposition, effets, classes CSS, CSS personnalisée. Choix retenu sur cet appareil.')],
  ['[data-fmt="ul"], [data-rt="ul"]', __('Liste à puces. Raccourci : « - » puis espace en début de ligne.')],
  ['[data-fmt="ol"], [data-rt="ol"]', __('Liste numérotée. Raccourci : « 1. » puis espace en début de ligne.')],
  ['[data-fmt="format"]', __('Paragraphe, intertitre (titre 2 ou 3), citation, exposant, indice.')]
];

const TARGET = '[data-tip], [title], button[aria-label], summary[aria-label], [role="button"][aria-label], a[aria-label]';
let bubble = null;
let timer = 0;
let current = null;
let lastHide = 0;
let source = 'pointer';
let currentInCanvas = false;

function ensureBubble() {
  if (bubble?.isConnected) return bubble;
  bubble = document.createElement('div');
  bubble.id = 'atelierTip';
  bubble.className = 'tip';
  bubble.setAttribute('role', 'tooltip');
  bubble.hidden = true;
  document.body.append(bubble);
  return bubble;
}

/* Trouve l'élément qui porte l'aide ; dans le canevas, seulement les outils de l'éditeur (pas le contenu du site) */
function targetOf(node, inCanvas) {
  const el = node?.closest?.(TARGET);
  if (!el || el.closest('#atelierTip') || el.isContentEditable) return null;
  if (inCanvas && !el.closest('#atelier-ui')) return null;
  if (el.disabled && !el.title && !el.dataset.tip) return null;
  return el;
}

function tipOf(el) {
  const title = el.getAttribute('title');
  if (title) {
    el.dataset.tip = title;
    el.removeAttribute('title');
    if (!el.getAttribute('aria-label') && isIconOnly(el.textContent)) el.setAttribute('aria-label', title);
  }
  const desc = el.dataset.tipDesc || DESC.find(([sel]) => el.matches(sel))?.[1] || '';
  return pickTip({ tip: el.dataset.tip, aria: el.getAttribute('aria-label'), desc, text: el.textContent });
}

function rectOf(el, inCanvas) {
  const r = el.getBoundingClientRect();
  if (!inCanvas) return { x: r.left, y: r.top, w: r.width, h: r.height };
  const f = document.querySelector('#canvas').getBoundingClientRect();
  const s = canvasScale() || 1;
  return { x: f.left + r.left * s, y: f.top + r.top * s, w: r.width * s, h: r.height * s };
}

function show(el, inCanvas) {
  const t = tipOf(el);
  if (!t) return;
  const b = ensureBubble();
  /* Une fenêtre modale est au premier plan : la bulle doit être dedans pour passer devant */
  const host = el.ownerDocument === document ? el.closest('dialog[open]') || document.body : document.body;
  if (b.parentNode !== host) host.append(b);
  b.replaceChildren();
  const head = document.createElement('div');
  head.className = 'tip__head';
  const strong = document.createElement('strong');
  strong.dataset.tipText = '';
  strong.textContent = t.text;
  head.append(strong);
  if (t.keys.length) {
    const keys = document.createElement('span');
    keys.className = 'tip__keys';
    for (const k of IS_MAC ? macKeys(t.keys) : t.keys) { const kbd = document.createElement('kbd'); kbd.textContent = k; keys.append(kbd); }
    head.append(keys);
  }
  b.append(head);
  if (t.desc) { const p = document.createElement('div'); p.className = 'tip__desc'; p.dataset.tipDesc = ''; p.textContent = t.desc; b.append(p); }
  b.hidden = false;
  b.style.left = '0px';
  b.style.top = '0px';
  const size = b.getBoundingClientRect();
  const pos = placeTip(rectOf(el, inCanvas), { w: size.width, h: size.height }, { w: innerWidth, h: innerHeight });
  b.style.left = `${pos.left}px`;
  b.style.top = `${pos.top}px`;
  b.dataset.side = pos.side;
  current = el;
  currentInCanvas = inCanvas;
  el.setAttribute('aria-describedby', 'atelierTip');
}

export function hideTip() {
  clearTimeout(timer);
  if (current) { current.removeAttribute('aria-describedby'); current = null; }
  if (bubble && !bubble.hidden) { bubble.hidden = true; lastHide = performance.now(); }
}

function schedule(el, inCanvas, from = 'pointer') {
  if (el === current) return;
  source = from;
  clearTimeout(timer);
  const quick = (bubble && !bubble.hidden) || performance.now() - lastHide < QUICK_MS;
  if (bubble && !bubble.hidden) { bubble.hidden = true; lastHide = performance.now(); current?.removeAttribute('aria-describedby'); current = null; }
  if (quick) show(el, inCanvas);
  else timer = setTimeout(() => { if (el.isConnected) show(el, inCanvas); }, SHOW_MS);
}

function bind(doc, inCanvas) {
  doc.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = targetOf(e.target, inCanvas);
    if (el) schedule(el, inCanvas);
    else if ((current || timer) && source === 'pointer') hideTip();
  }, true);
  doc.addEventListener('pointerout', e => {
    if (e.pointerType === 'touch') return;
    const to = targetOf(e.relatedTarget, inCanvas);
    if (!to && source === 'pointer') { if (!e.relatedTarget || !current?.contains(e.relatedTarget)) hideTip(); }
  }, true);
  doc.addEventListener('pointerdown', () => hideTip(), true);
  doc.addEventListener('focusin', e => {
    const el = targetOf(e.target, inCanvas);
    let visible = false;
    try { visible = e.target.matches(':focus-visible'); } catch { visible = true; }
    if (el && visible) schedule(el, inCanvas, 'focus');
  }, true);
  doc.addEventListener('focusout', () => hideTip(), true);
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && bubble && !bubble.hidden) hideTip(); }, true);
  /* Défilement : la bulle d'un survol disparaît ; celle du clavier suit son bouton (Tab fait défiler la barre) */
  doc.addEventListener('scroll', () => { if (current && source === 'focus') show(current, currentInCanvas); else hideTip(); }, { capture: true, passive: true });
  doc.defaultView?.addEventListener('blur', () => hideTip());
}

export function initTooltips() {
  ensureBubble();
  bind(document, false);
  onCanvasReady(doc => { hideTip(); bind(doc, true); });
}
