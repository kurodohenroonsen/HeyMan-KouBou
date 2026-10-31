/*
 * Registre des types de nœuds : structure (page, section, rangée, colonne) et widgets.
 * Un widget déclare ses champs (inspecteur « Contenu »), ses valeurs par défaut et son rendu HTML.
 * Types de champ : text, inline (texte court avec gras/italique/lien), richtext, select, url, image,
 *                  toggle, number, list (sous-champs), icon.
 * Les champs « i18n: true » sont stockés par langue : { fr: '…', nl: '…' }.
 */

import { __, __c, N_ } from './ui-i18n.js';

/* Libellés (widgets, réglages, catégories, choix) en français marqués N_ : traduits à l'affichage par __().
   Deux exceptions déjà traduites ici (__c), car le même mot français a un autre sens ailleurs : le widget « Titre »
   (Heading, pas Title) et le trait « Plein » du séparateur. Les valeurs par défaut du contenu (fr(…)) restent en français. */
export const STRUCTURE = new Set(['page', 'section', 'row', 'column']);
export const REGISTRY = {};

export function register(type, def) {
  REGISTRY[type] = { category: N_('Base'), icon: '▢', fields: [], defaults: () => ({}), ...def };
}

export const isWidget = type => !!REGISTRY[type] && !STRUCTURE.has(type);
export const fieldsOf = type => REGISTRY[type]?.fields || [];
export const fieldDef = (type, key) => fieldsOf(type).find(f => f.key === key) || null;

const fr = v => ({ fr: v });
const opt = (value, label) => ({ value, label });

/* ---------- Structure ---------- */
register('page', { label: N_('Page'), category: N_('Structure') });
register('section', {
  label: N_('Section'), category: N_('Structure'), icon: '▭',
  fields: [
    { key: 'width', type: 'select', label: N_('Largeur du contenu'), options: [opt('boxed', N_('Centrée')), opt('wide', N_('Large')), opt('full', N_('Pleine largeur'))] },
    { key: 'tag', type: 'select', label: N_('Balise (sens pour Google et les lecteurs d’écran)'), options: [opt('section', N_('section – partie de page')), opt('div', N_('div – sans signification')), opt('article', N_('article – contenu autonome')), opt('aside', N_('aside – contenu annexe')), opt('nav', N_('nav – navigation')), opt('header', N_('header – en-tête')), opt('footer', N_('footer – pied'))] }
  ],
  defaults: () => ({ width: 'boxed', tag: 'section' })
});
register('row', {
  label: N_('Rangée'), category: N_('Structure'), icon: '☰',
  fields: [{ key: 'stack', type: 'select', label: N_('Empiler les colonnes'), options: [opt('mobile', N_('Sur mobile')), opt('tablet', N_('Sur tablette et mobile')), opt('never', N_('Jamais'))] }],
  defaults: () => ({ stack: 'mobile' })
});
register('column', { label: N_('Colonne'), category: N_('Structure'), icon: '▯' });

/* ---------- Widgets de base ---------- */
register('heading', {
  label: __c('widget', 'Titre'), icon: 'H', category: N_('Texte'),
  styleTarget: '.heading',
  fields: [
    { key: 'text', type: 'inline', i18n: true, label: N_('Texte') },
    { key: 'level', type: 'select', label: N_('Niveau'), options: [opt('h1', N_('H1 – titre de page')), opt('h2', 'H2'), opt('h3', 'H3'), opt('h4', 'H4'), opt('p', N_('Paragraphe'))] },
    { key: 'link', type: 'url', label: N_('Lien (facultatif)') }
  ],
  defaults: () => ({ text: fr('Votre titre ici'), level: 'h2', link: '' }),
  render(p, c) {
    const tag = ['h1', 'h2', 'h3', 'h4', 'p'].includes(p.level) ? p.level : 'h2';
    const inner = c.inline(c.t(p.text));
    const link = c.url(p.link);
    return `<${tag} class="heading" data-edit="text">${link ? `<a href="${c.attr(link)}">${inner}</a>` : inner}</${tag}>`;
  }
});

register('text', {
  label: N_('Texte'), icon: '¶', category: N_('Texte'),
  fields: [{ key: 'content', type: 'richtext', i18n: true, label: N_('Texte') }],
  defaults: () => ({ content: fr('<p>Écrivez votre texte ici. Sélectionnez des mots pour les mettre en <strong>gras</strong>, en <em>italique</em> ou ajouter un lien.</p>') }),
  render(p, c) { return `<div class="rich" data-edit="content">${c.rich(c.t(p.content))}</div>`; }
});

register('button', {
  label: N_('Bouton'), icon: '⬭', category: N_('Base'),
  styleTarget: '.btn',
  fields: [
    { key: 'label', type: 'text', i18n: true, label: N_('Texte du bouton') },
    { key: 'link', type: 'url', label: N_('Lien'), popups: true },
    { key: 'variant', type: 'select', label: N_('Apparence'), options: [opt('primary', N_('Plein')), opt('secondary', N_('Secondaire')), opt('outline', N_('Contour')), opt('link', N_('Lien simple'))] },
    { key: 'size', type: 'select', label: N_('Taille'), options: [opt('sm', N_('Petit')), opt('md', N_('Moyen')), opt('lg', N_('Grand'))] },
    { key: 'newTab', type: 'toggle', label: N_('Ouvrir dans un nouvel onglet') },
    { key: 'file', type: 'document', label: N_('Fichier (remplace le lien)') },
    { key: 'download', type: 'toggle', label: N_('Télécharger directement (sans ouvrir)') }
  ],
  defaults: () => ({ label: fr('En savoir plus'), link: '#', variant: 'primary', size: 'md', newTab: false }),
  render(p, c) {
    const variant = ['primary', 'secondary', 'outline', 'link'].includes(p.variant) ? p.variant : 'primary';
    const size = ['sm', 'md', 'lg'].includes(p.size) ? p.size : 'md';
    const doc = c.doc?.(p.file);
    if (doc) return `<a class="btn btn--${variant} btn--${size}" href="${c.attr(doc.href)}" type="${c.attr(doc.mime)}" rel="noopener"${p.download ? ` download="${c.attr(doc.name)}"` : ''} data-edit="label">${c.esc(c.t(p.label))} <span class="doc-meta">(${c.esc(doc.meta)})</span></a>`;
    const pop = c.popup ? c.popup(p.link) : null;
    if (pop) return `<button type="button" class="btn btn--${variant} btn--${size}" popovertarget="pop-${c.attr(pop)}" data-edit="label">${c.esc(c.t(p.label))}</button>`;
    const target = p.newTab ? ' target="_blank" rel="noopener"' : '';
    return `<a class="btn btn--${variant} btn--${size}" href="${c.attr(c.url(p.link) || '#')}"${target} data-edit="label">${c.esc(c.t(p.label))}</a>`;
  }
});

register('image', {
  label: N_('Image'), icon: '🖼', category: N_('Média'),
  styleTarget: 'img',
  fields: [
    { key: 'src', type: 'image', label: N_('Image') },
    { key: 'alt', type: 'text', i18n: true, label: N_('Description (pour les lecteurs d’écran et Google)') },
    { key: 'caption', type: 'text', i18n: true, label: N_('Légende') },
    { key: 'ratio', type: 'select', label: N_('Format'), options: [opt('auto', N_('Original')), opt('16/9', '16:9'), opt('4/3', '4:3'), opt('1/1', N_('Carré')), opt('3/4', N_('Portrait'))] },
    { key: 'link', type: 'url', label: N_('Lien (facultatif)') }
  ],
  defaults: () => ({ src: '', alt: fr(''), caption: fr(''), ratio: 'auto', link: '' }),
  render(p, c) {
    const src = c.img(p.src);
    const ratio = ['16/9', '4/3', '1/1', '3/4'].includes(p.ratio) ? ` style="aspect-ratio:${p.ratio}"` : '';
    if (!src && !c.canvas) return '';
    const empty = c.esc(__('Choisissez une image dans l’inspecteur'));
    let img = src
      ? (c.imgTag ? c.imgTag(p.src, { alt: c.t(p.alt), style: ratio }) : `<img src="${c.attr(src)}" alt="${c.attr(c.t(p.alt))}" loading="lazy"${ratio}>`)
      : `<div class="img-empty"${ratio}>${empty}</div>`;
    const link = c.url(p.link);
    if (link && src) img = `<a href="${c.attr(link)}">${img}</a>`;
    const cap = c.t(p.caption);
    return `<figure class="figure">${img}${cap ? `<figcaption>${c.esc(cap)}</figcaption>` : ''}</figure>`;
  }
});

register('spacer', {
  label: N_('Espace'), icon: '↕', category: N_('Base'),
  fields: [{ key: 'size', type: 'select', label: N_('Hauteur'), options: [opt('16', '16 px'), opt('32', '32 px'), opt('64', '64 px'), opt('96', '96 px'), opt('128', '128 px')] }],
  defaults: () => ({ size: '32' }),
  render(p) {
    const s = ['16', '32', '64', '96', '128'].includes(p.size) ? p.size : '32';
    return `<div class="spacer" style="height:${s}px" aria-hidden="true"></div>`;
  }
});

register('divider', {
  label: N_('Séparateur'), icon: '—', category: N_('Base'),
  fields: [
    { key: 'line', type: 'select', label: N_('Trait'), options: [opt('solid', __c('ligne', 'Plein')), opt('dashed', N_('Tirets')), opt('dotted', N_('Pointillés'))] },
    { key: 'thickness', type: 'select', label: N_('Épaisseur'), options: [opt('1', '1 px'), opt('2', '2 px'), opt('4', '4 px')] },
    { key: 'length', type: 'select', label: N_('Longueur'), options: [opt('25', '25 %'), opt('50', '50 %'), opt('100', '100 %')] }
  ],
  defaults: () => ({ line: 'solid', thickness: '1', length: '100' }),
  render(p) {
    const line = ['solid', 'dashed', 'dotted'].includes(p.line) ? p.line : 'solid';
    const th = ['1', '2', '4'].includes(p.thickness) ? p.thickness : '1';
    const len = ['25', '50', '100'].includes(p.length) ? p.length : '100';
    return `<hr class="divider" style="border-top:${th}px ${line} currentColor;width:${len}%">`;
  }
});
