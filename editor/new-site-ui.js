/*
 * Nouveau site vide (cycle 24) : on choisit le nom, la langue principale (français, néerlandais, allemand, anglais
 * ou japonais) et les autres langues. Une version de sécurité du site actuel est enregistrée avant ; Ctrl+Z revient.
 */
import { h, $ } from './dom.js';
import { load } from './store.js';
import { beforeRisky } from './versions-ui.js';
import { blankSite, LANG_LABELS } from '../core/site.js';
import { log } from './log.js';
import { __, uiLang } from '../core/ui-i18n.js';

const DEFAULT_OTHERS = { fr: ['nl', 'de', 'en'], nl: ['fr', 'de', 'en'], de: ['fr', 'nl', 'en'], en: [], ja: ['en'] };

export function openNewSite() {
  $('#newSiteDialog')?.remove();
  let created = false;
  const start = LANG_LABELS[uiLang()] ? uiLang() : 'fr';
  const name = h('input', { class: 'input', type: 'text', id: 'newSiteName', maxlength: '80', placeholder: __('ex. Kumakōgen, le guide du plateau'), 'aria-describedby': 'newSiteNameHint' });
  const main = h('select', { class: 'control', id: 'newSiteMain' }, Object.entries(LANG_LABELS).map(([k, l]) => h('option', { value: k }, l)));
  main.value = start;
  const boxes = Object.entries(LANG_LABELS).map(([k, l]) => {
    const cb = h('input', { type: 'checkbox', value: k, 'data-new-lang': k });
    return { k, cb, label: h('label', { class: 'check' }, cb, l) };
  });
  const sync = (fromUser = false) => {
    for (const b of boxes) {
      const isMain = b.k === main.value;
      if (!fromUser) b.cb.checked = DEFAULT_OTHERS[main.value]?.includes(b.k) || false;
      if (isMain) b.cb.checked = false;
      b.cb.disabled = isMain;
      b.label.hidden = isMain;
    }
  };
  sync();
  main.addEventListener('change', () => { sync(); log.debug('project.new-lang', __('Langue principale choisie : {lang}', { lang: LANG_LABELS[main.value] }), { lang: main.value }); });
  const create = async () => {
    const others = boxes.filter(b => b.cb.checked && !b.cb.disabled).map(b => b.k);
    created = true;
    d.close();
    await beforeRisky(__('Avant un nouveau site vide'));
    const site = blankSite({ name: name.value, main: main.value, others });
    load(site, { keepHistory: true });
    log.info('project.new', __('Nouveau site vide : « {name} », langue principale {lang}', { name: site.name, lang: LANG_LABELS[site.defaultLanguage] }), { lang: site.defaultLanguage, languages: site.languages });
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); create(); } });
  const d = h('dialog', { class: 'audit new-site', id: 'newSiteDialog', 'aria-labelledby': 'newSiteTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'newSiteTitle' }, __('Nouveau site vide')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'a11y-form' },
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'newSiteName' }, __('Nom du site')), name,
        h('span', { class: 'hint', id: 'newSiteNameHint' }, __('Vous pourrez le changer plus tard dans l’onglet Site, à gauche.'))),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'newSiteMain' }, __('Langue principale')), main,
        h('span', { class: 'hint' }, __('La langue dans laquelle vous écrivez d’abord ; les visiteurs la voient par défaut.'))),
      h('fieldset', { class: 'field new-site__langs' }, h('legend', { class: 'field__label' }, __('Autres langues du site')), boxes.map(b => b.label),
        h('span', { class: 'hint' }, __('Vous pourrez en ajouter ou en retirer à tout moment dans l’onglet Site.'))),
      h('p', { class: 'hint' }, __('Le site actuel est gardé dans une version de sécurité (Fichier → Versions) ; Ctrl+Z revient aussi en arrière.'))),
    h('footer', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', id: 'newSiteCancel', onclick: () => d.close() }, __('Annuler')), h('button', { type: 'button', class: 'btn btn--primary', id: 'newSiteCreate', onclick: create }, __('Créer le site'))));
  d.addEventListener('close', () => { if (!created) log.info('project.cancel', __('Remplacement annulé'), { action: 'new' }); d.remove(); });
  boxes.forEach(b => b.cb.addEventListener('change', () => sync(true)));
  document.body.append(d);
  d.showModal();
  name.focus();
}
