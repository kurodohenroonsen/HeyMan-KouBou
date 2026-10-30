/* Bibliothèque : widgets (clic ou glisser) et structures de sections. */
import { h } from './dom.js';
import { REGISTRY, isWidget } from '../core/widgets.js';
import { insertWidget, insertSection } from './actions.js';
import { startLibraryDrag } from './dnd.js';
import { log } from './log.js';
import { __ } from '../core/ui-i18n.js';

const STRUCTURES = [
  { id: '12', label: __('1 colonne'), spans: [12] },
  { id: '6-6', label: __('2 colonnes'), spans: [6, 6] },
  { id: '4-4-4', label: __('3 colonnes'), spans: [4, 4, 4] },
  { id: '3-3-3-3', label: __('4 colonnes'), spans: [3, 3, 3, 3] },
  { id: '8-4', label: '2/3 + 1/3', spans: [8, 4] },
  { id: '4-8', label: '1/3 + 2/3', spans: [4, 8] }
];

/* Catégories des widgets (en français dans core/widgets.js, traduites à l'affichage) */
const ORDER = ['Texte', 'Base', 'Média', 'Contenu', 'Contenus', 'Interaction', 'Contact', 'Site'];

export function libraryPanel() {
  const filter = h('input', { class: 'input', type: 'search', placeholder: __('Chercher un widget…'), 'aria-label': __('Chercher un widget'), id: 'libFilter' });
  const groups = {};
  for (const [type, def] of Object.entries(REGISTRY)) {
    if (!isWidget(type)) continue;
    (groups[def.category] ||= []).push([type, def]);
  }
  const cats = Object.keys(groups).sort((a, b) => (ORDER.indexOf(a) + 99 * (ORDER.indexOf(a) < 0)) - (ORDER.indexOf(b) + 99 * (ORDER.indexOf(b) < 0)));
  const item = (type, def) => h('button', {
    type: 'button', class: 'lib-item', 'data-type': type, title: __(def.description || def.label),
    onclick: e => { if (!e.currentTarget.dataset.dragged) { log.debug('library.insert', __('Bibliothèque : clic sur « {label} »', { label: __(def.label) }), { type, how: 'clic' }); insertWidget(type); } delete e.currentTarget.dataset.dragged; },
    onpointerdown: e => startLibraryDrag(e, { kind: 'widget', type, label: __(def.label) })
  }, h('span', { class: 'lib-icon', 'aria-hidden': 'true' }, def.icon), h('span', { class: 'lib-label' }, __(def.label)));

  const sections = h('div', { class: 'lib-group' }, h('h3', {}, __('Structure')),
    h('div', { class: 'lib-grid lib-grid--struct' }, STRUCTURES.map(s => h('button', {
      type: 'button', class: 'lib-item lib-item--struct', 'data-type': 'section', 'data-spans': s.id, title: __('Section {label}', { label: s.label }),
      onclick: e => { if (!e.currentTarget.dataset.dragged) { log.debug('library.insert', __('Bibliothèque : clic sur la structure « {label} »', { label: s.label }), { type: 'section', spans: s.id, how: 'clic' }); insertSection(s.spans); } delete e.currentTarget.dataset.dragged; },
      onpointerdown: e => startLibraryDrag(e, { kind: 'section', spans: s.spans, label: __('Section {label}', { label: s.label }) })
    }, h('span', { class: 'struct-ico', 'aria-hidden': 'true' }, s.spans.map(sp => h('i', { style: { flexGrow: String(sp) } }))), h('span', { class: 'lib-label' }, s.label)))));

  const list = h('div', {}, sections, cats.map(cat => h('div', { class: 'lib-group', 'data-cat': cat }, h('h3', {}, __(cat)),
    h('div', { class: 'lib-grid' }, groups[cat].map(([t, d]) => item(t, d))))));

  let wasEmpty = false;
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    list.querySelectorAll('.lib-item:not(.lib-item--struct)').forEach(b => { b.hidden = q && !b.textContent.toLowerCase().includes(q); });
    list.querySelectorAll('.lib-group[data-cat]').forEach(g => { g.hidden = [...g.querySelectorAll('.lib-item')].every(b => b.hidden); });
    const shown = list.querySelectorAll('.lib-item:not(.lib-item--struct):not([hidden])').length;
    log.trace('library.search', __('Recherche de widget'), { q: q.slice(0, 30), shown });
    /* Signalé une fois quand plus rien ne correspond */
    if (q && !shown && !wasEmpty) log.debug('library.search-empty', __('Aucun widget ne correspond à « {q} »', { q: q.slice(0, 30) }), { q: q.slice(0, 30) });
    wasEmpty = !!q && !shown;
  });
  filter.addEventListener('change', () => { if (filter.value.trim()) log.debug('library.search', __('Recherche de widget : « {q} »', { q: filter.value.trim().slice(0, 30) }), { q: filter.value.trim().slice(0, 30), shown: list.querySelectorAll('.lib-item:not(.lib-item--struct):not([hidden])').length }); });
  return [filter, h('p', { class: 'hint' }, __('Cliquez pour ajouter après la sélection, ou glissez dans la page.')), list];
}
