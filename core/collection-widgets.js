/*
 * Widgets des collections : « Liste de contenus » (une carte par élément) et « Champ » (une valeur
 * de l'élément avec icône et libellé, pour les cartes et les pages de détail).
 */
import { register } from './widgets.js';
import { iconSvg, ICONS } from './icons.js';
import { queryItems, displayValue, optionOf, itemEnd, fieldLabel, localToday } from './collections.js';
import { __, __c } from './ui-i18n.js';

const opt = (value, label) => ({ value, label });
const pick = (v, allowed, dflt) => (allowed.includes(String(v)) ? String(v) : dflt);
const L = (fr, nl, de, en, ja) => ({ fr, nl, de, en, ja });

const collectionOptions = site => [opt('', __('— Choisir une collection —')), ...Object.values(site?.collections || {}).map(c => opt(c.id, `${c.name} (${c.items.length})`))];
const colOf = (site, p) => site?.collections?.[p?.collection] || null;

const LIST_SCRIPT = `(function(){var t=new Date(),d=t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);document.querySelectorAll('.cl[data-when]').forEach(function(l){var w=l.getAttribute('data-when'),lim=+l.getAttribute('data-limit')||0,n=0;l.classList.add('is-live');Array.prototype.forEach.call(l.children,function(li){var e=li.getAttribute('data-end')||'';var ok=e&&(w==='upcoming'?e>=d:e<d);if(ok&&(!lim||n<lim)){li.hidden=false;n++;}else li.hidden=true;});var em=l.parentNode.querySelector('.cl__empty');if(em)em.hidden=n>0;if(window.__aLog)window.__aLog('site.list','Liste filtrée par date',{when:w,today:d,shown:n,total:l.children.length,limit:lim});});})();`;

register('collection-list', {
  label: __('Liste de contenus'), icon: '▤', category: __c('family', 'Contenus'),
  description: __('Affiche les éléments d’une collection (membres, actualités, agenda) avec sa carte.'),
  styleTarget: '.cl',
  fields: [
    { key: 'collection', type: 'select', label: __('Collection'), options: collectionOptions },
    { key: 'layout', type: 'select', label: __('Disposition'), options: [opt('grid', __('Grille de cartes')), opt('list', __('Liste (image à gauche)'))] },
    { key: 'columns', type: 'select', label: __('Colonnes (ordinateur)'), options: [opt('1', '1'), opt('2', '2'), opt('3', '3'), opt('4', '4')], when: p => p.layout !== 'list' },
    { key: 'when', type: 'select', label: __('Événements'), options: [opt('all', __('Tous')), opt('upcoming', __('À venir')), opt('past', __('Passés'))], when: (p, site) => !!colOf(site, p)?.dateField && colOf(site, p)?.kind === 'events' },
    { key: 'sortField', type: 'select', label: __('Ordre'), options: (site, node) => {
      const c = colOf(site, node?.props);
      return [opt('', __('Ordre de la collection')), opt('_manual', __('Ordre manuel (glisser dans Contenus)')), ...(c ? c.fields.filter(f => ['text', 'date', 'number', 'select', 'time'].includes(f.type)).map(f => opt(f.key, __('Par {field}', { field: f.label.toLowerCase() }))) : [])];
    } },
    { key: 'sortDir', type: 'select', label: __('Sens'), options: [opt('', __('Automatique')), opt('asc', __('Croissant (A→Z, plus ancien d’abord)')), opt('desc', __('Décroissant (Z→A, plus récent d’abord)'))] },
    { key: 'limit', type: 'number', label: __('Nombre maximum (0 = tous)'), min: 0, max: 60 },
    { key: 'filter', type: 'select', label: __('Filtrer'), options: (site, node) => {
      const c = colOf(site, node?.props);
      const out = [opt('', __('Tous les éléments'))];
      if (c) for (const f of c.fields.filter(x => x.type === 'select')) for (const o of f.options || []) out.push(opt(`${f.key}=${o.value}`, `${f.label} : ${o.label?.[site.defaultLanguage] || o.value}`));
      return out;
    } },
    { key: 'empty', type: 'text', i18n: true, label: __('Texte si la liste est vide') },
    { key: 'moreLabel', type: 'text', i18n: true, label: __('Lien sous la liste (ex. Voir tout l’agenda)') },
    { key: 'moreLink', type: 'url', label: __('Adresse du lien sous la liste') }
  ],
  defaults: () => ({ collection: '', layout: 'grid', columns: '3', when: 'all', sortField: '', sortDir: '', limit: 0, filter: '', empty: L('Rien à afficher pour l’instant.', 'Nog niets te tonen.', 'Noch nichts zu zeigen.', 'Nothing to show yet.', 'まだ表示する項目はありません。'), moreLabel: { fr: '' }, moreLink: '' }),
  css: `.cl{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-m,24px);grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}
.cl__item{display:flex;min-width:0}
.cl__item > *{flex:1;min-width:0}
.cl__item[hidden]{display:none}
@media (max-width:1024px){.cl--grid{grid-template-columns:repeat(var(--cols-t,2),minmax(0,1fr))}}
@media (max-width:640px){.cl--grid{grid-template-columns:minmax(0,1fr)}}
.cl--list{grid-template-columns:minmax(0,1fr)}
@media (min-width:641px){.cl--list > .cl__item > .col{display:grid;grid-template-columns:minmax(120px,1fr) minmax(0,2fr);column-gap:var(--space-m,24px);align-content:start}
.cl--list > .cl__item > .col > *{grid-column:2}
.cl--list > .cl__item > .col > .w-image:first-child{grid-column:1;grid-row:1 / span 8}}
.cl__empty{color:var(--c5)}
.cl__more{margin-top:var(--space-m,24px)}
.cl__ph{padding:18px;border:1px dashed var(--line);border-radius:var(--radius);color:var(--c5);text-align:center}`,
  script: LIST_SCRIPT,
  render(p, c, node) {
    const col = colOf(c.site, p);
    const choose = __('Choisissez une collection dans l’inspecteur (onglet Contenu).');
    if (!col) return c.canvas ? `<div class="cl__ph">${c.esc(choose)}</div>` : '';
    const chain = c.chain || [];
    if (chain.includes(`col:${col.id}`)) return '';
    const when = col.dateField && col.kind === 'events' ? pick(p.when, ['all', 'upcoming', 'past'], 'all') : 'all';
    const limit = Math.max(0, Math.min(60, Number(p.limit) || 0));
    const today = c.today || localToday();
    const opts = { sortField: p.sortField, sortDir: p.sortDir, filter: p.filter, lang: c.lang, today };
    let items;
    let visible;
    if (when === 'all') { items = queryItems(c.site, col, { ...opts, limit }); visible = () => true; }
    else {
      const dated = queryItems(c.site, col, { ...opts, when: 'all', sortField: p.sortField || col.dateField, sortDir: p.sortDir || (when === 'past' ? 'desc' : 'asc') }).filter(i => i.values[col.dateField]);
      const ok = new Set(queryItems(c.site, col, { ...opts, when }).map(i => i.id));
      let n = 0;
      const show = new Set();
      for (const i of dated) if (ok.has(i.id) && (!limit || n < limit)) { show.add(i.id); n++; }
      items = dated;
      visible = it => show.has(it.id);
    }
    const layout = pick(p.layout, ['grid', 'list'], 'grid');
    const cols = Number(pick(p.columns, ['1', '2', '3', '4'], '3'));
    const shown = items.filter(visible).length;
    const lis = items.map(it => {
      const end = when === 'all' ? '' : ` data-end="${c.attr(itemEnd(col, it))}"`;
      const html = c.renderTree ? c.renderTree(col.card, { item: { col, item: it }, locked: true, instance: null, chain: [...chain, `col:${col.id}`] }) : '';
      return `<li class="cl__item"${end}${visible(it) ? '' : ' hidden'}>${html}</li>`;
    }).join('');
    const empty = c.t(p.empty);
    const more = c.t(p.moreLabel);
    const moreHref = c.url(p.moreLink);
    const label = c.attr(col.name);
    return `${items.length ? `<ul class="cl cl--${layout}" style="--cols:${layout === 'list' ? 1 : cols};--cols-t:${Math.min(cols, 2)}"${when === 'all' ? '' : ` data-when="${when}" data-limit="${limit}"`} aria-label="${label}">${lis}</ul>` : ''}${empty && (!items.length || when !== 'all') ? `<p class="cl__empty"${shown ? ' hidden' : ''}>${c.esc(empty)}</p>` : ''}${more && moreHref ? `<p class="cl__more"><a class="btn btn--outline btn--md" href="${c.attr(moreHref)}">${c.esc(more)}</a></p>` : ''}`;
  }
});

const iconOptions = [opt('none', __('Aucune')), ...Object.entries(ICONS).map(([k, v]) => opt(k, v.label))];

register('item-field', {
  label: __('Champ'), icon: '⟐', category: __c('family', 'Contenus'),
  description: __('Une information de l’élément (date, lieu, ville…) dans une carte ou une page de détail.'),
  styleTarget: '.fld',
  fields: [
    { key: 'field', type: 'select', label: __('Champ affiché'), options: (site, node, ctx) => {
      const col = ctx?.collection;
      if (!col) return [opt('', __('(dans une carte ou une page de détail)')), ...(node?.props?.field ? [opt(node.props.field, node.props.field)] : [])];
      return [opt('', __('— Choisir —')), ...(col.kind === 'events' ? [opt('@when', __('Date et heure'))] : []), ...col.fields.filter(f => !['image', 'richtext', 'toggle'].includes(f.type)).map(f => opt(f.key, f.label))];
    } },
    { key: 'label', type: 'text', i18n: true, label: __('Libellé avant la valeur (facultatif)') },
    { key: 'icon', type: 'select', label: __('Icône'), options: iconOptions },
    { key: 'format', type: 'select', label: __('Format des dates'), options: [opt('long', __('3 novembre 2026')), opt('short', __('3 nov. 2026')), opt('full', __('mardi 3 novembre 2026'))] }
  ],
  defaults: () => ({ field: '', label: { fr: '' }, icon: 'none', format: 'long' }),
  css: `.fld{display:flex;align-items:center;gap:8px;margin:0;color:var(--c5);font-size:.95em}
.fld__icon{display:inline-flex;color:var(--c1)}
.fld__icon .icon{width:18px;height:18px}
.fld__label{font-weight:600;color:var(--c3)}
.fld--ph,.fld--empty{opacity:.55;font-style:italic}
.fld a{color:inherit}`,
  render(p, c) {
    const it = c.item;
    const where = p.field ? __('Champ « {field} » : s’affiche dans une carte ou une page de détail de collection', { field: p.field }) : __('Champ : s’affiche dans une carte ou une page de détail de collection');
    if (!it) return c.canvas && !c.locked ? `<p class="fld fld--ph">${c.esc(where)}</p>` : '';
    const { col, item } = it;
    const key = String(p.field || '');
    const chooseField = __('Choisissez le champ à afficher');
    if (!key) return c.canvas && !c.locked ? `<p class="fld fld--ph">${c.esc(chooseField)}</p>` : '';
    const f = col.fields.find(x => x.key === key);
    if (f?.type === 'select' && optionOf(col, key, item.values[key])?.quiet) return '';
    const value = displayValue(c.site, col, item, key, c.lang, { format: pick(p.format, ['long', 'short', 'full'], 'long') });
    const emptyHere = !value && c.canvas && !c.locked ? __('{field} : vide pour cet élément', { field: fieldLabel(col, key) }) : '';
    if (!value) return emptyHere ? `<p class="fld fld--empty">${c.esc(emptyHere)}</p>` : '';
    const icon = p.icon && p.icon !== 'none' && ICONS[p.icon] ? `<span class="fld__icon" aria-hidden="true">${iconSvg(p.icon, 18)}</span>` : '';
    const label = c.t(p.label);
    let val = `<span class="fld__value">${c.esc(value)}</span>`;
    if (f?.type === 'url') { const u = c.url(value); if (u && u !== '#') val = `<a class="fld__value" href="${c.attr(u)}" rel="noopener">${c.esc(value.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''))}</a>`; }
    if (f?.type === 'email') val = `<a class="fld__value" href="mailto:${c.attr(value)}">${c.esc(value)}</a>`;
    return `<p class="fld">${icon}${label ? `<span class="fld__label">${c.esc(label)}</span> ` : ''}${val}</p>`;
  }
});
