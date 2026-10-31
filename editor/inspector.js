/* Inspecteur : onglets Contenu, Style, Avancé pour l'élément sélectionné. */
import { h, $, toast, icon } from './dom.js';
import { rovingTabs } from './dialog.js';
import { state, subscribe, nodeById, root, commitRoot, select, emit } from './store.js';
import { REGISTRY, fieldsOf } from '../core/widgets.js';
import { pathTo, setAdvanced, findNode } from '../core/tree.js';
import { ROW_LAYOUTS, setRowLayout, nodeLabel } from '../core/editing.js';
import { fieldControl, listControl, propWriter } from './fields.js';
import { selectParent, duplicateSelected, deleteSelected, copyStyle, pasteStyle, detachSelected, editSelectedComponent, createComponentFromSelected } from './actions.js';
import { componentUsage } from '../core/components.js';
import { LANG_LABELS as LANG_LABELS_X } from '../core/site.js';
import { styleTab, modeSwitch } from './styletab.js';
import { isExpert } from './mode.js';
import { bindableFields, setBind, fieldLabel } from '../core/collections.js';
import { openCollection, openNewCollection } from './collections-ui.js';
import { setEditTarget } from './store.js';
import { presenceLabel } from './collab-ui.js';
import { describeImage, markAi } from './ai-ui.js';
import { setProp } from '../core/tree.js';
import { siteWithRoot, textKey, commit } from './store.js';
import { pageText } from '../core/seo.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';
import { richToText, sanitizeRich, decodeEntities } from '../core/sanitize.js';

const panel = () => $('#inspector');

function multiHeader(node) {
  const n = state.multi.size;
  const act = (name, ico, title, fn) => h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'data-act': name, title, 'aria-label': title, onclick: fn }, icon(ico, 15));
  return h('div', { class: 'insp-head' },
    h('div', { class: 'insp-titlebar' },
      h('h2', { class: 'insp-title' }, __n(n, '{n} élément sélectionné', '{n} éléments sélectionnés')),
      act('pasteStyle', 'paste', __('Coller le style sur tous'), pasteStyle),
      act('duplicate', 'duplicate', __('Dupliquer tous (Ctrl+D)'), duplicateSelected),
      act('delete', 'delete', __('Supprimer tous (Suppr)'), deleteSelected)),
    h('p', { class: 'hint' }, __('Les réglages de style s’appliquent aux {n} éléments. Maj+clic pour en ajouter ou en retirer ; Échap pour revenir à un seul.', { n })));
}

function header(node) {
  const ids = pathTo(root(), node.id).slice(1);
  const crumbs = ids.map(id => {
    const n = findNode(root(), id);
    return h('button', { type: 'button', class: 'crumb' + (id === node.id ? ' is-current' : ''), onclick: () => select(id) }, nodeLabel(n));
  });
  const act = (name, ico, title, fn) => h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'data-act': name, title, 'aria-label': title, onclick: fn }, icon(ico, 15));
  return h('div', { class: 'insp-head' },
    h('nav', { class: 'crumbs', 'aria-label': __('Chemin') }, crumbs),
    h('div', { class: 'insp-titlebar' },
      h('h2', { class: 'insp-title' }, nodeLabel(node)),
      act('parent', 'parent', __('Sélectionner le parent (Échap)'), selectParent),
      act('copyStyle', 'brush', __('Copier le style'), copyStyle),
      act('pasteStyle', 'paste', __('Coller le style'), pasteStyle),
      act('duplicate', 'duplicate', __('Dupliquer (Ctrl+D)'), duplicateSelected),
      act('delete', 'delete', __('Supprimer (Suppr)'), deleteSelected)));
}

function tabs() {
  const t = (id, label) => h('button', { type: 'button', role: 'tab', 'data-insp': id, 'aria-selected': String(state.insp === id), onclick: () => { log.debug('inspector.tab', __('Onglet de l’inspecteur : {label}', { label }), { tab: id, from: state.insp, type: nodeById(state.selected)?.type }); state.insp = id; render(); } }, label);
  return rovingTabs(h('div', { class: 'tabs tabs--insp', role: 'tablist', 'aria-label': __('Onglets de l’inspecteur') }, t('content', __('Contenu')), t('style', __('Style')), t('advanced', __('Avancé'))));
}

function rowLayouts(node) {
  const current = node.children.map(c => c.style?.desktop?.span || 12).join('-');
  return h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Disposition des colonnes')),
    h('div', { class: 'layouts' }, ROW_LAYOUTS.map(l => h('button', {
      type: 'button', class: 'layout' + (l.id === current ? ' is-current' : ''), 'data-layout': l.id, title: __(l.label), 'aria-label': __(l.label),
      onclick: () => {
        try { commitRoot(setRowLayout(root(), node.id, l.spans)); log.info('inspector.layout', __('Disposition des colonnes : {label}', { label: __(l.label) }), { id: node.id, spans: l.spans, before: current }); }
        catch (e) { log.warn('inspector.refused', __('Disposition refusée : {error}', { error: e.message }), { what: 'layout', id: node.id, spans: l.spans, error: e }); toast(e.message, 'error'); }
      }
    }, l.spans.map(s => h('i', { style: { flexGrow: String(s) } }))))));
}

function instanceCard(node) {
  const comp = state.site.components?.[node.ref];
  const uses = componentUsage(state.site)[node.ref] || 0;
  return h('div', { class: 'instance-card' },
    h('strong', {}, comp?.name ? __('Instance du composant « {name} »', { name: comp.name }) : __('Instance d’un composant introuvable')),
    h('p', { class: 'hint' }, __n(uses, 'Son contenu se modifie une fois pour toutes ses {n} utilisation. Les onglets Style et Avancé règlent seulement cette instance (marges, ancre…).', 'Son contenu se modifie une fois pour toutes ses {n} utilisations. Les onglets Style et Avancé règlent seulement cette instance (marges, ancre…).')),
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-component-edit': '', onclick: editSelectedComponent }, __('Modifier le composant')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-component-detach': '', disabled: !!state.editTarget, onclick: detachSelected }, __('Détacher'))));
}

/* Collection dont on modifie la carte ou la page de détail (liaisons possibles) */
function bindCollection() {
  const t = state.editTarget;
  return t && (t.kind === 'card' || t.kind === 'detail') ? state.site.collections?.[t.id] || null : null;
}

function listCard(node) {
  const c = state.site.collections?.[node.props.collection];
  if (!c) return h('div', { class: 'instance-card' }, h('strong', {}, __('Liste de contenus')),
    h('p', { class: 'hint' }, __('Choisissez une collection ci-dessous, ou créez-en une (médias membres, actualités, agenda…).')),
    h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-list-new': '', onclick: () => openNewCollection() }, __('+ Nouvelle collection')));
  const pub = c.items.filter(i => i.status === 'published').length;
  return h('div', { class: 'instance-card' },
    h('strong', {}, __('Collection « {name} »', { name: c.name })),
    h('p', { class: 'hint' }, __n(pub, '{n} élément publié. Chaque carte suit le modèle de la collection : modifiez-le une fois, toutes les listes suivent (double-clic sur la liste).', '{n} éléments publiés. Chaque carte suit le modèle de la collection : modifiez-le une fois, toutes les listes suivent (double-clic sur la liste).')),
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-list-manage': '', onclick: () => openCollection(c.id) }, __('Gérer les éléments')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-list-card': '', onclick: () => setEditTarget({ kind: 'card', id: c.id }) }, __('✎ Carte')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-list-detail': '', onclick: () => setEditTarget({ kind: 'detail', id: c.id }) }, __('✎ Page de détail'))));
}

function bindSelect(node, f, choices, col) {
  const label = __(f.label);
  const sel = h('select', { class: 'control control--sm bind-select', 'data-bind': f.key, 'aria-label': __('Relier « {label} » à un champ de la collection', { label }), title: __('Relier à un champ de la collection') },
    h('option', { value: '' }, node.bind?.[f.key] ? __('✕ Délier (valeur fixe)') : __('🔗 Relier à un champ…')),
    choices.map(c => h('option', { value: c.key, selected: node.bind?.[f.key] === c.key }, `← ${c.label}`)));
  sel.addEventListener('change', () => {
    try { commitRoot(setBind(root(), node.id, f.key, sel.value || null, col)); log.info('inspector.bind', sel.value ? __('« {label} » relié au champ « {field} » de la collection', { label, field: sel.value }) : __('« {label} » délié : valeur fixe', { label }), { id: node.id, field: f.key, to: sel.value || null, collection: col?.id }); }
    catch (e) { log.warn('inspector.refused', __('Liaison refusée : {error}', { error: e.message }), { what: 'bind', id: node.id, field: f.key, to: sel.value, error: e }); toast(e.message, 'error'); }
  });
  return sel;
}

function contentTab(node) {
  if (node.ref) return [instanceCard(node)];
  const out = [];
  const write = propWriter(node);
  const col = bindCollection();
  if (node.type === 'row') out.push(rowLayouts(node));
  if (node.type === 'collection-list') out.push(listCard(node));
  if (col && !['page', 'section', 'row', 'column'].includes(node.type)) out.push(h('p', { class: 'hint bind-hint' }, __('Contenus reliés : ils changent pour chaque élément de « {name} ». Les autres restent identiques partout.', { name: col.name })));
  for (const f0 of fieldsOf(node.type)) {
    if (f0.when && !f0.when(node.props || {}, state.site)) continue;
    const f = typeof f0.options === 'function' ? { ...f0, options: f0.options(state.site, node, { collection: col }) } : f0;
    if (f.type === 'list') { out.push(listControl(node, f)); continue; }
    const choices = col ? bindableFields(col, f) : [];
    const bound = node.bind?.[f.key];
    if (bound && col) {
      out.push(h('div', { class: 'field is-bound', 'data-field-wrap': f.key },
        h('span', { class: 'field__label' }, __(f.label)),
        h('p', { class: 'bound' }, h('span', { 'aria-hidden': 'true' }, '🔗 '), __('Relié au champ '), h('strong', {}, `« ${fieldLabel(col, bound)} »`)),
        bindSelect(node, f, choices, col)));
      continue;
    }
    if (bound && !col) {
      out.push(h('div', { class: 'field is-bound', 'data-field-wrap': f.key }, h('span', { class: 'field__label' }, __(f.label)), h('p', { class: 'bound' }, __('🔗 Relié au champ « {field} »', { field: bound }))));
      continue;
    }
    const ctl = fieldControl(f, node.props[f.key], write(f.key), node.id);
    if (f.key === 'alt' && node.type === 'image' && node.props.src && !node.bind?.alt) ctl.append(h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-ai-alt': '', onclick: async () => {
      const page = state.site.pages.find(p => p.id === state.pageId);
      log.debug('inspector.alt-ai', __('Texte alternatif demandé à l’IA locale (voir ai.*)'), { id: node.id, lang: state.lang });
      const r = await describeImage(node.props.src, page ? pageText(state.site, page, state.lang).slice(0, 400) : '');
      if (!r) { log.debug('inspector.alt-ai-none', __('Pas de texte alternatif proposé (IA indisponible ou erreur : voir ai.*)'), { id: node.id }); return; }
      try {
        commit(markAi(siteWithRoot(state.site, setProp(root(), node.id, 'alt', r.value, state.lang)), textKey(node.id, 'alt'), state.lang));
        log.info('inspector.alt-ai-ok', r.decorative ? __('Image jugée décorative : texte alternatif laissé vide') : __('Texte alternatif proposé par l’IA (marqué « à relire »)'), { id: node.id, chars: String(r.value || '').length, decorative: !!r.decorative });
        toast(r.decorative ? __('Image jugée décorative : texte alternatif laissé vide.') : __('Texte alternatif proposé (à relire).'));
      } catch (e) { log.warn('inspector.refused', __('Texte alternatif non enregistré : {error}', { error: e.message }), { what: 'alt', id: node.id, error: e }); toast(e.message, 'error'); }
    } }, __('✨ Décrire l’image')));
    if (choices.length) {
      const lbl = ctl.querySelector('.field__label');
      if (lbl) lbl.after(bindSelect(node, f, choices, col)); else ctl.prepend(bindSelect(node, f, choices, col));
    }
    out.push(ctl);
  }
  if (node.type === 'column') out.push(h('p', { class: 'hint' }, __('La largeur de la colonne se règle dans l’onglet Style (Disposition), par appareil.')));
  if (!out.length) out.push(h('p', { class: 'hint' }, __('Cet élément n’a pas de contenu à régler. Voir les onglets Style et Avancé.')));
  return out;
}

function advancedTab(node) {
  const adv = node.advanced || {};
  const apply = (patch, key) => {
    try { commitRoot(setAdvanced(root(), node.id, patch), { key, source: 'inspector' }); log.debug('inspector.advanced', __('Réglage avancé : {props}', { props: Object.keys(patch).filter(k => k !== 'lang').join(', ') }), { id: node.id, props: Object.keys(patch), lang: patch.lang }); }
    catch (e) { log.warn('inspector.refused', __('Réglage avancé refusé : {error}', { error: e.message }), { what: 'advanced', id: node.id, props: Object.keys(patch), error: e }); toast(e.message, 'error'); }
  };
  const anchor = h('input', { class: 'input', type: 'text', 'data-adv': 'anchor', placeholder: __('ex. contact'), spellcheck: 'false' });
  anchor.value = adv.anchor || '';
  anchor.addEventListener('change', () => { apply({ anchor: anchor.value }); render(); });
  const cls = h('input', { class: 'input', type: 'text', 'data-adv': 'class', placeholder: __('ex. carte-mise-en-avant'), spellcheck: 'false' });
  cls.value = adv.cssClass || '';
  cls.addEventListener('change', () => { apply({ cssClass: cls.value }); render(); });
  const css = h('textarea', { class: 'input adv-css', 'data-adv': 'css', rows: 3, spellcheck: 'false', placeholder: __('ex. filter: grayscale(1); outline: 2px solid currentColor'), 'aria-label': __('CSS personnalisée') });
  css.value = adv.css || '';
  css.addEventListener('change', () => {
    try {
      commitRoot(setAdvanced(root(), node.id, { css: css.value }), { source: 'inspector' });
      css.removeAttribute('aria-invalid');
      log.debug('inspector.advanced', __('CSS personnalisée enregistrée'), { id: node.id, props: ['css'], chars: css.value.length });
    } catch (e) { css.setAttribute('aria-invalid', 'true'); log.warn('inspector.css-refused', /^CSS/.test(e.message) ? e.message : __('CSS personnalisée refusée : {error}', { error: e.message }), { id: node.id, chars: css.value.length, start: css.value.slice(0, 60), error: e }); toast(e.message, 'error'); }
  });
  const aria = h('input', { class: 'input', type: 'text', 'data-adv': 'aria', lang: state.lang, placeholder: __('ex. Nos services (lu par les lecteurs d’écran)') });
  aria.value = adv.ariaLabel?.[state.lang] || '';
  aria.addEventListener('change', () => apply({ ariaLabel: aria.value, lang: state.lang }));
  const others = state.site.languages.filter(l => l !== state.site.defaultLanguage);
  const hideLang = l => {
    const cb = h('input', { type: 'checkbox', 'data-adv': `hide-lang-${l}`, checked: !!adv.hideLangs?.[l] });
    cb.addEventListener('change', () => apply({ hideLangs: { [l]: cb.checked } }));
    return h('label', { class: 'check' }, cb, `${l.toUpperCase()} · ${LANG_LABELS_X[l] || l}`);
  };
  const hide = dev => {
    const cb = h('input', { type: 'checkbox', 'data-adv': `hide-${dev}`, checked: !!adv.hideOn?.[dev] });
    cb.addEventListener('change', () => apply({ hideOn: { [dev]: cb.checked } }));
    return cb;
  };
  const expert = isExpert();
  return [
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Ancre (pour un lien #ancre)')), anchor,
      adv.anchor ? h('p', { class: 'hint' }, __('Lien vers cet élément : #{anchor}', { anchor: adv.anchor })) : null),
    expert ? h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Classes CSS')), cls) : null,
    expert ? h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Libellé accessible ({lang})', { lang: state.lang.toUpperCase() })), aria,
      h('p', { class: 'hint' }, __('Nomme cette zone pour les lecteurs d’écran, dans la langue affichée.'))) : null,
    node.ref || state.editTarget ? null : h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Réutiliser')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-component-create': '', onclick: createComponentFromSelected }, __('Créer un composant à partir de ce bloc'))),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Masquer sur')),
      h('label', { class: 'check' }, hide('desktop'), __('Ordinateur')),
      h('label', { class: 'check' }, hide('tablet'), __('Tablette')),
      h('label', { class: 'check' }, hide('mobile'), __('Mobile')),
      h('p', { class: 'hint' }, __('Dans l’éditeur, un élément masqué reste visible en transparence pour pouvoir le sélectionner.'))),
    others.length ? h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Masquer dans la langue')), ...others.map(hideLang),
      h('p', { class: 'hint' }, __('Pour un contenu qui ne concerne qu’une partie du public (ex. une annonce locale).'))) : null,
    expert ? h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('CSS personnalisée (experts)')), css,
      h('p', { class: 'hint' }, __('Déclarations « propriété: valeur; » appliquées à cet élément. Pas d’accolades, de @ ni d’url().'))) : null,
    modeSwitch()
  ];
}

function empty() {
  return [
    h('div', { class: 'insp-empty' },
      h('h2', {}, __('Inspecteur')),
      h('p', {}, __('Cliquez sur un élément de la page pour le modifier.')),
      h('ul', { class: 'tips' },
        h('li', {}, __('Double-clic sur un texte pour l’écrire directement.')),
        h('li', {}, __('Glissez un widget depuis le panneau de gauche.')),
        h('li', {}, __('Échap remonte au parent, Suppr supprime, Ctrl+D duplique.'))))
  ];
}

let lastRendered = null;
let rendering = false;
export function render() {
  if (rendering) { queueMicrotask(render); return; }
  rendering = true;
  try { renderNow(); } finally { rendering = false; }
}
function renderNow() {
  const t0 = performance.now();
  const node = nodeById(state.selected);
  const p = panel();
  const scroll = p.querySelector('.insp-body')?.scrollTop || 0;
  const focusKey = document.activeElement?.closest?.('#inspector') ? document.activeElement.getAttribute('data-style') : null;
  const focusCol = focusKey ? document.activeElement.getAttribute('data-device-col') : null;
  if (!node) { p.replaceChildren(...empty()); lastRendered = null; return; }
  const body = h('div', { class: 'insp-body' });
  if (state.multi.size > 1) {
    body.append(...styleTab(node, [...state.multi]).filter(Boolean));
    p.replaceChildren(multiHeader(node), h('div', { class: 'tabs tabs--insp', role: 'tablist', 'aria-label': __('Onglets de l’inspecteur') }, h('button', { type: 'button', role: 'tab', 'data-insp': 'style', 'aria-selected': 'true' }, __('Style'))), body);
  } else {
    if (state.insp === 'content') body.append(...contentTab(node).filter(Boolean));
    if (state.insp === 'style') body.append(...styleTab(node).filter(Boolean));
    if (state.insp === 'advanced') body.append(...advancedTab(node).filter(Boolean));
    const who = presenceLabel(node.id);
    p.replaceChildren(...[header(node), who ? h('p', { class: 'presence-note', 'data-presence-note': '' }, `✎ ${who}`) : null, tabs(), body].filter(Boolean));
  }
  if (lastRendered === node.id) body.scrollTop = scroll;
  if (focusKey && lastRendered === node.id) p.querySelector(`[data-style="${focusKey}"]${focusCol ? `[data-device-col="${focusCol}"]` : ''}`)?.focus({ preventScroll: true });
  log.trace('inspector.render', __('Inspecteur redessiné'), { id: node.id, type: node.type, tab: state.multi.size > 1 ? 'style' : state.insp, multi: state.multi.size || undefined, ms: Math.round(performance.now() - t0) });
  lastRendered = node.id;
}

/*
 * Frappe dans la page (cycle 27) : l'inspecteur n'est pas redessiné ; seule la valeur du champ correspondant est mise à
 * jour s'il est affiché (même élément, même langue) et que la personne n'est pas en train d'y écrire.
 */
function syncField({ node: id, field, lang }) {
  if (!id || id !== state.selected || !field || field.includes('.')) return;
  const sel = `[data-field="${CSS.escape(field)}"]`;
  const el = panel().querySelector(`${sel}[lang="${CSS.escape(lang || '')}"]`) || panel().querySelector(`input${sel}:not([lang])`);
  if (!el || el === document.activeElement) return;
  const raw = nodeById(id)?.props?.[field];
  const value = String((raw && typeof raw === 'object' ? raw[lang] : raw) ?? '');
  if (el.matches('input,textarea')) el.value = /<[a-z]/i.test(value) ? richToText(value) : decodeEntities(value);
  else el.innerHTML = sanitizeRich(value);
  log.trace('inspector.sync', __('Champ de l’inspecteur mis à jour (frappe dans la page)'), { id, field, lang });
}

let pendingRemote = false;
export function initInspector() {
  panel().addEventListener('focusout', () => setTimeout(() => { if (pendingRemote && !panel().contains(document.activeElement)) { pendingRemote = false; render(); } }, 0));
  subscribe((reason, opts) => {
    if (reason === 'selection' || reason === 'view') render();
    else if (reason === 'doc' && opts.source === 'remote' && panel().contains(document.activeElement) && document.activeElement.matches('input,textarea,[contenteditable="true"]')) {
      if (!pendingRemote) log.debug('inspector.remote-deferred', __('Modification d’un autre participant : inspecteur redessiné à la sortie du champ'), { field: document.activeElement.getAttribute('data-field') || document.activeElement.getAttribute('data-style') || undefined });
      pendingRemote = true;
    }
    else if (reason === 'doc' && opts.source === 'canvas') syncField(opts);
    else if (reason === 'doc' && opts.source !== 'inspector') render();
    else if (reason === 'styleState' || reason === 'mode') render();
    else if (reason === 'presence' && !panel().contains(document.activeElement)) render();
  });
  render();
}

export { emit };
