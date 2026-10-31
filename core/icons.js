/* Petit jeu d'icônes SVG intégrées (statiques, sans contenu saisi). Tracés 24×24, trait courant. */
import { N_ } from './ui-i18n.js';

export const ICONS = {
  check: { label: N_('Coche'), path: '<path d="M5 12.5l4.2 4.2L19 7"/>' },
  arrow: { label: N_('Flèche'), path: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  star: { label: N_('Étoile'), path: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>' },
  dot: { label: N_('Point'), path: '<circle cx="12" cy="12" r="4"/>' },
  heart: { label: N_('Cœur'), path: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>' },
  phone: { label: N_('Téléphone'), path: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>' },
  mail: { label: N_('E-mail'), path: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>' },
  pin: { label: N_('Lieu'), path: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>' },
  clock: { label: N_('Horloge'), path: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' },
  users: { label: N_('Personnes'), path: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>' },
  shield: { label: N_('Bouclier'), path: '<path d="M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21z"/>' },
  bolt: { label: N_('Éclair'), path: '<path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z"/>' },
  camera: { label: N_('Caméra'), path: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>' },
  calendar: { label: N_('Calendrier'), path: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
  tag: { label: N_('Étiquette'), path: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.6"/>' },
  globe: { label: N_('Monde'), path: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>' }
};

export function iconSvg(name, size = 22) {
  const ic = ICONS[name] || ICONS.dot;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic.path}</svg>`;
}

/* Icônes de l'interface de l'éditeur (cycle 30) : barre du haut, inspecteur, barres d'outils. Même rendu partout. */
export const UI_ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  tablet: '<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M11 18h2"/>',
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  translate: '<path d="M4 5h9M8.5 3v2M11 5c-.8 4-3.5 7-7 9M6.5 8.5c1 2.5 3 4.5 6 5.5"/><path d="m13 20 4-9 4 9M14.3 17h5.4"/>',
  seo: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20.5 20.5-5.3-5.3"/>',
  sparkle: '<path d="M12 3l2 5.5 5.5 2-5.5 2L12 18l-2-5.5-5.5-2 5.5-2z"/><path d="M19 3v3M17.5 4.5h3"/>',
  users: ICONS.users.path,
  comment: '<path d="M20 15a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  bug: '<path d="M8 9a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0z"/><path d="M8 11H5M19 11h-3M8 15H5.5M18.5 15H16M12 18v3M9 5.5 7.5 4M15 5.5 16.5 4"/>',
  rocket: '<path d="M12 2.5c3.5 2 5 6 5 10l-2 2.5H9L7 12.5c0-4 1.5-8 5-10z"/><circle cx="12" cy="9.5" r="1.5"/><path d="M9 15.5 6.5 18 7 20.5l3-2M15 15.5l2.5 2.5-.5 2.5-3-2"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 18v2h16v-2"/>',
  panels: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/>',
  'zoom-in': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20.5 20.5-5.3-5.3M10.5 7.5v6M7.5 10.5h6"/>',
  'zoom-out': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20.5 20.5-5.3-5.3M7.5 10.5h6"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  parent: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  move: '<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9 2 12l3 3M19 9l3 3-3 3"/>',
  duplicate: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  delete: '<path d="M6 6l12 12M18 6 6 18"/>',
  brush: '<path d="M18.5 3.5 20.5 5.5 11 15l-2-2z"/><path d="M9 13c-2.5 0-4 1.5-4 4 0 1.5-.5 2.5-2 3 3.5.5 7-.5 7-4"/>',
  paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h4"/>',
  link: '<path d="M10 14a4 4 0 0 1 0-5.5l2.5-2.5a4 4 0 0 1 5.5 5.5L17 12.5"/><path d="M14 10a4 4 0 0 1 0 5.5l-2.5 2.5a4 4 0 0 1-5.5-5.5L7 11.5"/>',
  'list-ul': '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  'list-ol': '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 4.5h1.5V8M3.5 8h3"/><path d="M3.8 11c.8-.8 2.6-.4 2.6.6s-2.6 1.6-2.6 2.9h2.8"/><path d="M3.6 16.4h2.2a.9.9 0 0 1 0 1.8H5a.9.9 0 0 1 0 1.8H3.6"/>',
  clear: '<path d="M20 6H9l-5 6 5 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><path d="m12 9.5 5 5M17 9.5l-5 5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  free: '<path d="M8 4c-2 0-3 1-3 3v2c0 1.5-.8 2.5-2 3 1.2.5 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5.8 2.5 2 3-1.2.5-2 1.5-2 3v2c0 2-1 3-3 3"/>',
  format: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  expert: '<path d="M4 6h8M18 6h2M4 12h3M12 12h8M4 18h11M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17.5" cy="18" r="2"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>'
};

export function uiIcon(name, size = 18) {
  const path = UI_ICONS[name] || ICONS.dot.path;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}
