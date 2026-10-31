/*
 * Nouveau site (cycles 24 et 28) : on choisit le nom, la langue principale (français, néerlandais, allemand, anglais
 * ou japonais), les autres langues, puis un modèle de site (vignette dessinée et description) ou le site vide.
 * Une version de sécurité du site actuel est enregistrée avant ; Ctrl+Z revient.
 */
import { h, $ } from './dom.js';
import { openDialog } from './dialog.js';
import { load } from './store.js';
import { beforeRisky } from './versions-ui.js';
import { LANG_LABELS } from '../core/site.js';
import { SITE_TEMPLATES, buildSiteTemplate } from '../core/site-templates.js';
import { log } from './log.js';
import { __, uiLang } from '../core/ui-i18n.js';

const DEFAULT_OTHERS = { fr: ['nl', 'de', 'en'], nl: ['fr', 'de', 'en'], de: ['fr', 'nl', 'en'], en: [], ja: ['en'] };

/* Choix du modèle : une case radio par modèle, avec sa vignette SVG (image, jamais du HTML injecté) */
function templatePicker() {
  const cards = SITE_TEMPLATES.map(t => {
    const radio = h('input', { type: 'radio', name: 'newSiteTemplate', value: t.id, 'data-site-template': t.id, checked: t.id === 'blank' });
    radio.addEventListener('change', () => log.debug('project.new-template', __('Modèle choisi : {template}', { template: __(t.label) }), { template: t.id }));
    return h('label', { class: 'site-tpl' }, radio,
      h('img', { class: 'site-tpl__thumb', src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t.thumb)}`, alt: '', width: '160', height: '100' }),
      h('span', { class: 'site-tpl__text' }, h('strong', {}, __(t.label)), h('span', { class: 'hint' }, __(t.description))));
  });
  const box = h('fieldset', { class: 'field site-tpls', id: 'newSiteTemplates' }, h('legend', { class: 'field__label' }, __('Modèle de site')), cards,
    h('span', { class: 'hint' }, __('Un modèle crée les pages, le menu, l’en-tête, le pied, des contenus d’exemple et les pages légales à compléter, dans toutes les langues choisies.')));
  return { box, value: () => box.querySelector('input[name="newSiteTemplate"]:checked')?.value || 'blank' };
}

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
  const picker = templatePicker();
  const create = async () => {
    const others = boxes.filter(b => b.cb.checked && !b.cb.disabled).map(b => b.k);
    const template = picker.value();
    created = true;
    d.close();
    await beforeRisky(__('Avant un nouveau site'));
    const site = buildSiteTemplate(template, { name: name.value, main: main.value, others });
    load(site, { keepHistory: true });
    const data = { lang: site.defaultLanguage, languages: site.languages, template, pages: site.pages.length, timezone: site.timezone };
    if (template === 'blank') log.info('project.new', __('Nouveau site vide : « {name} », langue principale {lang}', { name: site.name, lang: LANG_LABELS[site.defaultLanguage] }), data);
    else log.info('project.new', __('Nouveau site « {name} » depuis le modèle {template} : {n} pages, langue principale {lang}', { name: site.name, template: __(SITE_TEMPLATES.find(t => t.id === template).label), n: site.pages.length, lang: LANG_LABELS[site.defaultLanguage] }), data);
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); create(); } });
  const d = openDialog({ id: 'newSiteDialog',
    className: 'new-site',
    titleId: 'newSiteTitle',
    title: __('Nouveau site'),
    body: [h('div', { class: 'a11y-form' },
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'newSiteName' }, __('Nom du site')), name,
        h('span', { class: 'hint', id: 'newSiteNameHint' }, __('Vous pourrez le changer plus tard dans l’onglet Site, à gauche.'))),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'newSiteMain' }, __('Langue principale')), main,
        h('span', { class: 'hint' }, __('La langue dans laquelle vous écrivez d’abord ; les visiteurs la voient par défaut.'))),
      h('fieldset', { class: 'field new-site__langs' }, h('legend', { class: 'field__label' }, __('Autres langues du site')), boxes.map(b => b.label),
        h('span', { class: 'hint' }, __('Vous pourrez en ajouter ou en retirer à tout moment dans l’onglet Site.'))),
      picker.box,
      h('p', { class: 'hint' }, __('Le site actuel est gardé dans une version de sécurité (Fichier → Versions) ; Ctrl+Z revient aussi en arrière.')))],
    actions: [h('button', { type: 'button', class: 'btn', id: 'newSiteCancel', onclick: () => d.close() }, __('Annuler')),
    h('button', { type: 'button', class: 'btn btn--primary', id: 'newSiteCreate', onclick: create }, __('Créer le site'))] });
  d.addEventListener('close', () => { if (!created) log.info('project.cancel', __('Remplacement annulé'), { action: 'new' }); });
  boxes.forEach(b => b.cb.addEventListener('change', () => sync(true)));
  name.focus();
}
