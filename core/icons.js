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
