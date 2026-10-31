/*
 * Liste « Pour commencer » (cycle 26) : sept premiers pas, cochés automatiquement d'après les codes du journal.
 * Logique pure, sans DOM ; l'éditeur (editor/onboarding-ui.js) s'abonne au journal et retient le choix dans
 * localStorage['atelier-onboarding'] ({ done, collapsed, hidden }).
 */
import { N_ } from './ui-i18n.js';

export const ONBOARDING_KEY = 'atelier-onboarding';

/* codes : code du journal → condition sur ses données (true = toujours) ; action : ce que fait le lien « → » */
const any = () => true;
export const ONBOARDING_STEPS = [
  { id: 'name', label: N_('Nommer le site'), hint: N_('Onglet Site → Identité, ou le nom en haut à gauche.'), action: 'site-name',
    codes: [['settings.name', any], ['store.commit', d => d?.key === 'site-name'], ['project.new', any]] },
  { id: 'languages', label: N_('Choisir les langues'), hint: N_('Onglet Site → Langues : la langue principale et les traductions.'), action: 'languages',
    codes: [['project.new', d => (d?.languages?.length || 0) >= 2], ['settings.lang-add', any], ['settings.lang-remove', any]] },
  { id: 'section', label: N_('Ajouter une section'), hint: N_('Onglet Modèles : un héros, des avantages, un contact… ou glissez un widget dans la page.'), action: 'templates',
    codes: [['action.add-section', any], ['template.insert', any], ['dnd.ok', d => d?.type === 'section' || d?.wrapped === true]] },
  { id: 'heading', label: N_('Écrire un titre'), hint: N_('Double-cliquez sur un titre dans la page et tapez.'), action: 'heading',
    codes: [['edit.ok', d => d?.key === 'text' && d?.changed !== false], ['inspector.field', d => d?.key === 'text' && d?.type === 'inline']] },
  { id: 'image', label: N_('Mettre une image'), hint: N_('Sélectionnez un widget Image → « Importer une image », ou le logo dans l’onglet Site.'), action: 'image',
    codes: [['inspector.image.ok', any], ['settings.logo', d => d?.kind !== 'none'], ['image.import.ok', any]] },
  { id: 'mobile', label: N_('Regarder sur mobile'), hint: N_('Bouton Mobile en haut : les colonnes passent l’une sous l’autre.'), action: 'mobile',
    codes: [['store.view', d => d?.device === 'mobile']] },
  { id: 'publish', label: N_('Prévisualiser puis publier'), hint: N_('Fichier → Aperçu dans un nouvel onglet, puis « Exporter le site » ou « 🚀 Publier ».'), action: 'publish',
    codes: [['project.preview', any], ['export.zip.ok', any], ['publish.php.ok', any], ['publish.github.ok', any]] }
];

export function matchEntry(step, entry) {
  return step.codes.some(([code, when]) => entry?.code === code && !!when(entry.data || {}));
}

/* Étapes faites selon une suite d'entrées du journal, dans l'ordre où elles apparaissent */
export function stepsDone(entries) {
  const out = [];
  for (const e of entries) for (const s of ONBOARDING_STEPS) if (!out.includes(s.id) && matchEntry(s, e)) out.push(s.id);
  return out;
}

export function progress(doneIds) {
  const done = ONBOARDING_STEPS.filter(s => doneIds.includes(s.id));
  const remaining = ONBOARDING_STEPS.filter(s => !doneIds.includes(s.id));
  return { done: done.length, total: ONBOARDING_STEPS.length, percent: Math.round((done.length / ONBOARDING_STEPS.length) * 100), remaining };
}

const ids = new Set(ONBOARDING_STEPS.map(s => s.id));
export function parseStored(raw) {
  let v = null;
  try { v = JSON.parse(raw || 'null'); } catch { v = null; }
  const done = Array.isArray(v?.done) ? [...new Set(v.done.filter(x => ids.has(x)))] : [];
  return { done, collapsed: !!v?.collapsed, hidden: !!v?.hidden };
}

export function serializeStored({ done = [], collapsed = false, hidden = false } = {}) {
  return JSON.stringify({ done: [...new Set(done.filter(x => ids.has(x)))], collapsed: !!collapsed, hidden: !!hidden });
}
