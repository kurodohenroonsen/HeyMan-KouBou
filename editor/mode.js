/*
 * Mode simple / mode expert (cycle 30). En mode simple (par défaut), l'onglet Style montre typographie, fond,
 * espacement et bordure, et l'onglet Avancé cache classes CSS, libellé accessible et CSS personnalisée.
 * Choix retenu sur l'appareil (localStorage['atelier-expert']) ; changement annoncé par emit('mode').
 */
import { emit } from './store.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

const KEY = 'atelier-expert';
let expert = false;
try { expert = localStorage.getItem(KEY) === '1'; } catch { expert = false; }

export const isExpert = () => expert;

/* by : d'où vient le changement (bouton de l'inspecteur, menu Fichier, réglage demandé, commande) */
export function setExpert(on, by = 'bouton') {
  const next = !!on;
  if (next === expert) return false;
  expert = next;
  try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* stockage indisponible : choix pour cette visite */ }
  log.info('ui.mode', next ? __('Mode expert : tous les réglages (dimensions, disposition, effets, classes, CSS)') : __('Mode simple : réglages essentiels seulement'), { expert: next, by });
  emit('mode', { expert: next });
  return true;
}
