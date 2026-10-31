/* Panneau Modèles : sections prêtes à l'emploi, à cliquer ou glisser dans la page. */
import { h } from './dom.js';
import { confirmDialog } from './dialog.js';
import { TEMPLATES, buildTemplate } from '../core/templates.js';
import { insertSection, insertComponent } from './actions.js';
import { state, commit } from './store.js';
import { renameComponent, deleteComponent, componentUsage } from '../core/components.js';
import { REGISTRY } from '../core/widgets.js';
import { toast } from './dom.js';
import { startLibraryDrag } from './dnd.js';
import { log } from './log.js';
import { __, __n, N_ } from '../core/ui-i18n.js';

/* Schéma miniature : une ligne par rangée, une case par colonne */
function sketch(tpl) {
  const sec = buildTemplate(tpl.id);
  const dark = /palette:c(1|3)/.test(sec.style?.desktop?.background || '');
  return h('span', { class: 'tpl__sketch' + (dark ? ' is-dark' : ''), 'aria-hidden': 'true' },
    sec.children.map(row => h('span', { class: 'tpl__row' }, row.children.map(col => h('i', {
      style: { flexGrow: String(col.style?.desktop?.span || 12) },
      class: col.children.length ? '' : 'is-empty'
    }, col.children.slice(0, 4).map(w => h('b', { class: `k-${w.type}` })))))));
}

function componentsSection() {
  const comps = Object.values(state.site.components || {}).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const usage = componentUsage(state.site);
  const apply = (fn, action) => {
    try { commit(fn(state.site), { source: 'site' }); return true; }
    catch (e) { log.warn('action.refused', __('Action « {action} » refusée : {error}', { action: __(action), error: e.message }), { action, error: e }); toast(e.message, 'error'); return false; }
  };
  return [
    h('h3', {}, comps.length ? __('Mes composants ({n})', { n: comps.length }) : __('Mes composants')),
    comps.length ? h('div', { class: 'comp-list' }, comps.map(cp => {
      const name = h('input', { class: 'input input--sm', type: 'text', value: cp.name, 'data-component-rename': cp.id, 'aria-label': __('Nom du composant') });
      /* Entrée enregistre ; le panneau redessiné retire le champ, ce qui déclenche « change » pendant l'enregistrement :
         le nom est retenu avant, pour n'enregistrer (et n'annuler) qu'une fois */
      let savedName = cp.name;
      const save = () => {
        const v = name.value.trim();
        if (!name.isConnected || !v || v === savedName) return;
        const before = savedName;
        savedName = v;
        if (apply(x => renameComponent(x, cp.id, name.value), N_('renommer un composant'))) log.info('action.component-rename', __('Composant renommé'), { component: cp.id, chars: v.length });
        else savedName = before;
      };
      name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      name.addEventListener('change', save);
      return h('div', { class: 'comp' },
        h('button', { type: 'button', class: 'comp__insert', 'data-component': cp.id, title: __('Cliquer pour ajouter, ou glisser dans la page'),
          onclick: () => { log.debug('template.component', __('Panneau Modèles : clic sur le composant « {name} »', { name: cp.name }), { component: cp.id, uses: usage[cp.id] }); insertComponent(cp.id); },
          onpointerdown: e => startLibraryDrag(e, { kind: 'component', id: cp.id, label: cp.name }) }, `▣ ${cp.name}`),
        name,
        h('span', { class: 'comp__meta' }, (REGISTRY[cp.node.type] ? __(REGISTRY[cp.node.type].label) : cp.node.type) + ' · ' + __n(usage[cp.id] || 0, '{n} utilisation', '{n} utilisations')),
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm is-danger', 'data-component-delete': cp.id, title: __('Supprimer (les instances deviennent des copies)'), 'aria-label': __('Supprimer {name}', { name: cp.name }), onclick: async () => {
          if (usage[cp.id] && !(await confirmDialog({ id: 'componentDeleteDialog', title: __('Supprimer le composant'), ok: __('Supprimer'), danger: true, message: __n(usage[cp.id], 'Supprimer le composant « {name} » ? Son utilisation devient une copie indépendante.', 'Supprimer le composant « {name} » ? Ses {n} utilisations deviennent des copies indépendantes.', { name: cp.name }) }))) { log.info('action.component-delete-cancel', __('Suppression du composant annulée'), { component: cp.id, uses: usage[cp.id] }); return; }
          if (apply(x => deleteComponent(x, cp.id), N_('supprimer un composant'))) log.info('action.component-delete', __n(usage[cp.id] || 0, 'Composant « {name} » supprimé : {n} instance devient une copie', 'Composant « {name} » supprimé : {n} instances deviennent des copies', { name: cp.name }), { component: cp.id, uses: usage[cp.id] || 0 });
        } }, '✕'));
    })) : h('p', { class: 'hint' }, __('Aucun composant. Clic droit sur une section ou un bloc → « Créer un composant » : il sera réutilisable sur toutes les pages et modifiable en une fois.'))
  ];
}

export function templatesPanel() {
  return [
    ...componentsSection(),
    h('h3', {}, __('Modèles de sections')),
    h('p', { class: 'hint' }, __('Cliquez pour ajouter après la section sélectionnée, ou glissez à l’endroit voulu. Les couleurs suivent la palette du site.')),
    h('div', { class: 'tpl-list' }, TEMPLATES.map(tpl => h('button', {
      type: 'button', class: 'tpl', 'data-template': tpl.id, title: __(tpl.description),
      onclick: () => {
        let sec;
        try { sec = buildTemplate(tpl.id); } catch (e) { log.error('template.fail', __('Modèle « {label} » impossible à construire : {error} (bogue)', { label: __(tpl.label), error: e.message }), { template: tpl.id, error: e }); throw e; }
        const id = insertSection(null, sec);
        if (id) log.info('template.insert', __('Modèle de section inséré : {label}', { label: __(tpl.label) }), { template: tpl.id, id, rows: sec.children?.length });
      },
      onpointerdown: e => startLibraryDrag(e, { kind: 'template', id: tpl.id, label: __(tpl.label) })
    }, sketch(tpl), h('span', { class: 'tpl__text' }, h('strong', {}, __(tpl.label)), h('span', {}, __(tpl.description))))))
  ];
}
