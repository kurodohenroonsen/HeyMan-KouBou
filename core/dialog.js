/* Logique pure des fenêtres d'Atelier (cycle 33, X8) : choix du focus initial, validation d'une réponse
 * saisie (askText) et contrôle de l'adresse d'un lien. Sans DOM : testée dans Node (tests/dialog.test.js). */
import { __ } from './ui-i18n.js';

/* items : [{ kind: 'close' | 'input' | 'button', autofocus, primary, danger, disabled }] dans l'ordre du document.
 * Ordre de préférence : autofocus, premier champ, bouton principal sûr, premier bouton sûr, bouton Fermer. */
export function initialFocusIndex(items) {
  const ok = items.map((it, i) => ({ ...it, i })).filter(it => !it.disabled);
  const pick = fn => ok.find(fn)?.i ?? -1;
  for (const fn of [it => it.autofocus, it => it.kind === 'input', it => it.kind === 'button' && it.primary && !it.danger,
    it => it.kind === 'button' && !it.danger, it => it.kind === 'close']) {
    const i = pick(fn);
    if (i >= 0) return i;
  }
  return -1;
}

/* Message d'erreur d'une réponse saisie ('' si elle est acceptée) */
export function answerError(value, { required, validate } = {}) {
  const v = String(value ?? '');
  if (required && !v.trim()) return __('Ce champ est obligatoire.');
  return validate ? String(validate(v) || '') : '';
}

/* Adresse d'un lien saisie à la main : https, http, mailto, tel, ancre ou chemin du site ; jamais javascript: ni data: */
export function linkError(url) {
  const v = String(url ?? '').trim();
  if (!v) return __('L’adresse est obligatoire.');
  if (/\s/.test(v)) return __('Une adresse ne contient pas d’espace.');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v)?.[1]?.toLowerCase();
  if (scheme && !['http', 'https', 'mailto', 'tel'].includes(scheme)) return __('Adresse non autorisée ({scheme}:). Utilisez https://, mailto:, tel: ou #ancre.', { scheme });
  if (/^https?:\/\/?$/i.test(v) || v === 'mailto:' || v === 'tel:') return __('Adresse incomplète.');
  return '';
}
