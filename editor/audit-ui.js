/* Fenêtre de contrôle : avant l'export, et liste des textes à traduire. « Aller à » ouvre l'endroit concerné. */
import { h, $ } from './dom.js';
import { state, setView, select, setEditTarget } from './store.js';
import { openTranslations } from './i18n-ui.js';
import { auditSite } from '../core/audit.js';
import { missingTranslations, findPage, LANG_LABELS } from '../core/site.js';
import { findNode } from '../core/tree.js';
import { fieldsOf } from '../core/widgets.js';
import { translate } from '../core/render.js';
import { nodeLabel } from '../core/editing.js';
import { goToCollection } from './collections-ui.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

let onExport = null;
export function setExportHandler(fn) { onExport = fn; }

function dialog() {
  let d = $('#auditDialog');
  if (!d) {
    d = h('dialog', { id: 'auditDialog', class: 'audit', 'aria-labelledby': 'auditTitle' });
    document.body.append(d);
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  }
  return d;
}

function goTo({ pageId, nodeId, lang, panel, componentId, zone, collectionId, itemId, template, field }) {
  log.info('audit.go', __('Aller à l’endroit signalé'), { pageId, nodeId, lang, panel, componentId, zone, collectionId, itemId, template, field });
  dialog().close();
  if (lang && lang !== state.lang) setView({ lang });
  if (collectionId) { goToCollection({ collectionId, itemId, template, nodeId, field }); return; }
  if (componentId || zone) { setEditTarget(componentId ? { kind: 'component', id: componentId } : { kind: zone }); if (nodeId) select(nodeId, { scroll: true }); return; }
  if (pageId && pageId !== state.pageId) setView({ pageId });
  if (nodeId) { state.insp = 'content'; select(nodeId, { scroll: true }); }
  else if (panel) { state.left = panel; document.querySelector(`[data-left="${panel}"]`)?.click(); }
}

function fieldLabel(node, path) {
  const [key, idx, sub] = path.split('.');
  const f = fieldsOf(node.type).find(x => x.key === key);
  if (!f) return key;
  if (sub !== undefined) return __('{item} {n} · {field}', { item: __(f.itemLabel || f.label), n: Number(idx) + 1, field: __(f.fields.find(x => x.key === sub)?.label) || sub });
  return __(f.label);
}

function item(kind, text, target) {
  return h('li', { class: `audit__item audit__item--${kind}`, 'data-audit-kind': kind },
    h('span', {}, text),
    target ? h('button', { type: 'button', class: 'btn btn--small', 'data-audit-go': '', onclick: () => goTo(target) }, __('Aller à')) : null);
}

function group(title, items, open = true) {
  if (!items.length) return null;
  return h('details', { class: 'audit__group', open }, h('summary', {}, __('{title} ({n})', { title, n: items.length })), h('ul', { class: 'audit__list' }, items));
}

export function openAudit(mode = 'export') {
  const s = state.site;
  const t0 = performance.now();
  const r = auditSite(s);
  const missing = missingTranslations(s).length;
  log.add(r.errors.length ? 'warn' : 'info', 'audit.open', mode === 'export' ? (r.errors.length ? __('Vérification avant export : {n} erreur(s) bloquent l’export', { n: r.errors.length }) : __('Vérification avant export : prêt ({n} point(s) à vérifier)', { n: r.warnings.length })) : __('Textes à traduire : {n}', { n: missing }), () => ({ mode, ok: r.ok, errors: r.errors.length, warnings: r.warnings.length, info: r.info.length, missing, ms: Math.round(performance.now() - t0), firstErrors: r.errors.slice(0, 3), firstWarnings: r.warnings.slice(0, 5).map(w => w.message) }));
  const d = dialog();
  const def = s.defaultLanguage;
  const tr = missingTranslations(s).slice(0, 80).map(m => {
    const page = m.pageId ? findPage(s, m.pageId) : null;
    const col = m.collectionId ? s.collections?.[m.collectionId] : null;
    const rootNode = page ? page.root : m.componentId ? s.components?.[m.componentId]?.node : m.zone ? s.layout?.[m.zone] : col && m.template ? (m.template === 'card' ? col.card : col.detail) : null;
    const pageName = page ? (translate(s, page.title, def) || __('Sans titre')) : col ? (m.template ? (m.template === 'card' ? __('Carte « {name} »', { name: col.name }) : __('Page de détail « {name} »', { name: col.name })) : __('Contenus « {name} »', { name: col.name })) : m.componentId ? __('Composant « {name} »', { name: s.components?.[m.componentId]?.name || '' }) : m.zone === 'header' ? __('En-tête') : m.zone === 'footer' ? __('Pied de page (blocs)') : m.menuItemId ? __('Menu') : __('Pied de page');
    const node = rootNode && m.nodeId ? findNode(rootNode, m.nodeId) : null;
    const colWhat = col && !m.template ? (() => { const it = col.items.find(i => i.id === m.itemId); const f = col.fields.find(x => x.key === m.field); const name = it ? (translate(s, it.values[col.titleField], def) || it.slug) : __('choix'); return `${name} · ${f?.label || m.field}`; })() : null;
    const fieldName = node ? (m.field === 'aria' ? __('Libellé accessible') : fieldLabel(node, m.field)) : '';
    const what = colWhat || (node ? `${nodeLabel(node)} · ${fieldName}` : null) || (m.field === 'title' ? __('Titre de la page') : m.field === 'seo' ? __('Description pour Google') : m.field === 'menu' ? __('Entrée du menu') : __('Texte'));
    return item('translation', `${m.lang.toUpperCase()} · ${pageName} · ${what}`, { pageId: m.pageId, nodeId: m.nodeId, lang: m.lang, componentId: m.componentId, zone: m.zone, collectionId: m.collectionId, itemId: m.itemId, template: m.template, field: m.field, panel: node ? null : (m.pageId || m.menuItemId ? 'pages' : 'site') });
  });
  const total = missingTranslations(s).length;
  const body = [
    h('header', { class: 'audit__head' },
      h('h2', { id: 'auditTitle' }, mode === 'export' ? __('Vérification avant export') : __('Textes à traduire')),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    mode === 'export' ? h('p', { class: 'audit__summary' + (r.errors.length ? ' is-error' : r.warnings.length ? ' is-warn' : ' is-ok') },
      r.errors.length ? __n(r.errors.length, '{n} erreur empêche l’export.', '{n} erreurs empêchent l’export.')
        : r.warnings.length ? __n(r.warnings.length, 'Le site peut être exporté. {n} point à vérifier.', 'Le site peut être exporté. {n} points à vérifier.') : __('Tout est en ordre. Le site est prêt à être exporté.')) : null,
    mode === 'export' ? group(__('Erreurs'), r.errors.map(e => item('error', e))) : null,
    mode === 'export' ? group(__('À vérifier'), r.warnings.map(w => item('warning', w.message, w.collectionId ? { collectionId: w.collectionId, itemId: w.itemId } : (w.pageId || w.nodeId) ? { pageId: w.pageId, nodeId: w.nodeId } : null))) : null,
    mode === 'export' ? group(__('Informations'), r.info.map(i => item('info', i.message)), false) : null,
    group(total > tr.length ? __('Textes à traduire ({n} premiers sur {total})', { n: tr.length, total }) : __('Textes à traduire'), tr, mode !== 'export'),
    s.languages.length > 1 ? h('p', { class: 'audit__summary' }, h('button', { type: 'button', class: 'btn btn--small', 'data-open-i18n': '', onclick: () => { d.close(); openTranslations(mode === 'export' ? 'all' : 'missing'); } }, __('🌐 Ouvrir le tableau des traductions')), __(' — tout traduire au même endroit, export CSV, traduction automatique.')) : null,
    h('footer', { class: 'audit__foot' },
      h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer')),
      mode === 'export' ? h('button', { type: 'button', class: 'btn btn--primary', id: 'auditExport', disabled: !r.ok, onclick: () => { log.info('audit.export', r.warnings.length ? __('Export malgré des points à vérifier') : __('Export demandé'), { warnings: r.warnings.length }); d.close(); onExport?.(); } }, r.warnings.length ? __('Exporter quand même') : __('Exporter le site')) : null)
  ].filter(Boolean);
  d.replaceChildren(...body);
  if (!d.open) d.showModal();
  d.querySelector('#auditExport, [data-audit-go]')?.focus();
}
