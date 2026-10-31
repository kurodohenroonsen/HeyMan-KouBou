/* Panneau Pages : ajouter, ouvrir, renommer (par langue), adresse, description pour Google, ordre, suppression. */
import { h, toast } from './dom.js';
import { confirmDialog, openDialog } from './dialog.js';
import { state, commit, setView } from './store.js';
import { addPage, removePage, setPageSlug, setPageTitle, setPageSeo, movePage, slugify, LANG_LABELS, setPageFooterLink } from '../core/site.js';
import { addAccessibilityPage } from '../core/a11ypage.js';
import { addLegalPages, LEGAL_FORMS } from '../core/legalpages.js';
import { suggestSlug } from '../core/i18n.js';
import { auditSite } from '../core/audit.js';
import { translate } from '../core/render.js';
import { customizeMenu, addMenuLink, addMenuPage, removeMenuItem, moveMenuItem, indentMenuItem, outdentMenuItem, setMenuItemLabel, setMenuItemUrl, menuLabel } from '../core/menu.js';
import { log } from './log.js';
import { openAsk } from './assistant-ui.js';
import { __, __n, __c, uiLang } from '../core/ui-i18n.js';

const open = new Set();

/* `what` : nom court de l'action, pour le journal en cas de refus */
function apply(fn, opts = {}, what = 'page') {
  try { return commit(fn(state.site), { source: 'panel', ...opts }) !== false; } catch (e) {
    log.warn('page.refused', __('Modification refusée : {error}', { error: e.message }), { action: what, page: opts.pageId, error: e });
    toast(e.message, 'error');
    return false;
  }
}
const pageName = p => translate(state.site, p?.title, state.site.defaultLanguage) || (p?.slug ? `/${p.slug}/` : __('Accueil'));

function pageCard(p, i, total) {
  const s = state.site;
  const def = s.defaultLanguage;
  const name = translate(s, p.title, def) || __('Sans titre');
  const isHome = p.slug === '';
  const current = p.id === state.pageId;
  const det = h('details', { class: 'page-card' + (current ? ' is-current' : ''), open: open.has(p.id) || current, 'data-page': p.id });
  det.addEventListener('toggle', () => { if (det.open) open.add(p.id); else open.delete(p.id); });

  const slug = h('input', { class: 'input input--mono', type: 'text', value: isHome ? '' : p.slug, placeholder: isHome ? __('(accueil : adresse fixe)') : __('adresse-de-la-page'), disabled: isHome, 'data-page-slug': p.id, spellcheck: 'false', 'aria-label': __('Adresse de la page') });
  /* La page à jour (p est l'état au moment du dessin du panneau : Entrée puis « change » l'enregistraient deux fois) */
  const fresh = () => state.site.pages.find(x => x.id === p.id) || p;
  const saveSlug = () => {
    if (slug.isConnected && !isHome && slugify(slug.value) !== fresh().slug) {
      if (apply(x => setPageSlug(x, p.id, slug.value), { source: 'pages' }, 'slug')) {
        log.info('page.slug', __('Adresse de la page modifiée : /{from}/ → /{to}/', { from: p.slug, to: slugify(slug.value) }), { id: p.id, from: p.slug, to: slugify(slug.value), lang: def });
        toast(__('Adresse : /{slug}/', { slug: slugify(slug.value) }));
      } else slug.value = p.slug;
    }
  };
  slug.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveSlug(); } });
  slug.addEventListener('change', saveSlug);
  slug.setAttribute('data-lang', def);

  const langSlugs = isHome ? [] : s.languages.filter(l => l !== def).map(lang => {
    const input = h('input', { class: 'input input--mono', type: 'text', value: p.slugs?.[lang] || '', placeholder: p.slug, 'data-page-slug': p.id, 'data-lang': lang, spellcheck: 'false', 'aria-label': __('Adresse en {lang}', { lang: LANG_LABELS[lang] }) });
    const save = v => {
      if (!input.isConnected) return;
      if (slugify(v) === (fresh().slugs?.[lang] || '')) return;
      if (!apply(x => setPageSlug(x, p.id, v, lang), { source: 'pages' }, 'slug-lang')) { input.value = p.slugs?.[lang] || ''; return; }
      log.info('page.slug', slugify(v) ? __('Adresse en {lang} : {url}', { lang: lang.toUpperCase(), url: `/${lang}/${slugify(v)}/` }) : __('Adresse en {lang} : même adresse que la langue principale', { lang: lang.toUpperCase() }), { id: p.id, from: p.slugs?.[lang] || '', to: slugify(v), lang });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(input.value); } });
    input.addEventListener('change', () => save(input.value));
    return h('div', { class: 'slug-row' }, h('span', { class: 'slug-prefix' }, `/${lang}/`), input, h('span', { class: 'slug-prefix' }, '/'),
      h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-slug-suggest': p.id, 'data-lang': lang, title: __('Proposer depuis le titre traduit'), 'aria-label': __('Adresse {lang} depuis le titre', { lang: lang.toUpperCase() }), onclick: () => { const v = suggestSlug(state.site, fresh(), lang); log.debug('page.slug-suggest', __('Adresse {lang} proposée depuis le titre traduit', { lang: lang.toUpperCase() }), { id: p.id, lang, slug: v }); save(v); } }, '⟲'));
  });

  const titles = h('div', { class: 'i18n' }, s.languages.map(lang => {
    const input = h('input', { class: 'input', type: 'text', lang, value: p.title?.[lang] || '', 'data-page-title': p.id, placeholder: lang === def ? __('Titre (menu et onglet)') : __('À traduire : {text}', { text: p.title?.[def] || '' }), 'aria-label': __('Titre en {lang}', { lang: LANG_LABELS[lang] }) });
    input.addEventListener('input', () => { if (apply(x => setPageTitle(x, p.id, input.value, lang), { key: `ptitle-${p.id}-${lang}` }, 'title')) log.trace('page.title', __('Titre de page en cours de frappe'), { id: p.id, lang, length: input.value.length }); });
    input.addEventListener('change', () => log.info('page.title', __('Titre de la page ({lang}) : « {title} »', { lang: lang.toUpperCase(), title: input.value.slice(0, 60) }), { id: p.id, lang, length: input.value.length, empty: !input.value.trim() || undefined }));
    return h('div', { class: 'i18n__row' + (lang !== def && p.title?.[def] && !p.title?.[lang] ? ' is-missing' : '') }, h('span', { class: 'i18n__lang' }, lang.toUpperCase()), input);
  }));

  const seo = h('div', { class: 'i18n' }, s.languages.map(lang => {
    const v = p.seo?.description?.[lang] || '';
    const count = h('span', { class: 'count' + (v.length > 160 ? ' is-over' : '') }, `${v.length}/160`);
    const area = h('textarea', { class: 'input', rows: 2, lang, 'data-page-seo': p.id, placeholder: lang === def ? __('Une phrase qui résume la page dans les résultats de recherche') : __('À traduire'), 'aria-label': __('Description en {lang}', { lang: LANG_LABELS[lang] }) });
    area.value = v;
    area.addEventListener('input', () => {
      count.textContent = `${area.value.length}/160`;
      count.classList.toggle('is-over', area.value.length > 160);
      apply(x => setPageSeo(x, p.id, area.value, lang), { key: `pseo-${p.id}-${lang}` }, 'seo');
    });
    area.addEventListener('change', () => {
      const n = area.value.length;
      if (n > 160) log.warn('page.seo', __('Description pour Google trop longue ({n}/160) : Google la coupera', { n }), { id: p.id, lang, length: n });
      else log.info('page.seo', __n(n, 'Description pour Google ({lang}) : {n} caractère', 'Description pour Google ({lang}) : {n} caractères', { lang: lang.toUpperCase() }), { id: p.id, lang, length: n });
    });
    return h('div', { class: 'i18n__row i18n__row--area' }, h('span', { class: 'i18n__lang' }, lang.toUpperCase()), area, count);
  }));

  det.append(
    h('summary', { class: 'page-card__head' },
      h('span', { class: 'page-card__name' }, isHome ? '⌂ ' : '', name),
      h('span', { class: 'page-item__slug' }, isHome ? '/' : `/${p.slug}/`)),
    h('div', { class: 'page-card__body' },
      h('div', { class: 'row-btns' },
        h('button', { type: 'button', class: 'btn btn--small' + (current ? ' is-on' : ''), 'data-page-open': p.id, disabled: current, onclick: () => { log.info('page.open', __('Page ouverte : {name}', { name }), { id: p.id, slug: p.slug }); setView({ pageId: p.id }); } }, current ? __('Page ouverte') : __('Ouvrir')),
        isHome ? null : h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-page-move': p.id, 'data-dir': '-1', title: __('Monter dans le menu'), 'aria-label': __('Monter dans le menu'), disabled: i <= 1, onclick: () => { if (apply(x => movePage(x, p.id, -1), { source: 'pages' }, 'move')) log.info('page.move', __('Page « {name} » montée dans le menu (position {n})', { name, n: i }), { id: p.id, dir: -1, from: i, to: i - 1 }); } }, '↑'),
        isHome ? null : h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-page-move': p.id, 'data-dir': '1', title: __('Descendre dans le menu'), 'aria-label': __('Descendre dans le menu'), disabled: i >= total - 1, onclick: () => { if (apply(x => movePage(x, p.id, 1), { source: 'pages' }, 'move')) log.info('page.move', __('Page « {name} » descendue dans le menu (position {n})', { name, n: i + 2 }), { id: p.id, dir: 1, from: i, to: i + 1 }); } }, '↓'),
        isHome ? null : h('button', { type: 'button', class: 'icon-btn icon-btn--sm is-danger', 'data-page-delete': p.id, title: __('Supprimer la page'), 'aria-label': __('Supprimer la page'), onclick: async () => {
          if (!(await confirmDialog({ id: 'pageDeleteDialog', title: __('Supprimer la page « {name} »', { name }), ok: __('Supprimer'), danger: true, message: __('Supprimer la page « {name} » ? (Ctrl+Z pour annuler.)', { name }) }))) { log.debug('page.delete-cancel', __('Suppression de « {name} » annulée', { name }), { id: p.id }); return; }
          if (state.pageId === p.id) setView({ pageId: s.pages[0].id });
          if (apply(x => removePage(x, p.id), { source: 'pages' }, 'delete')) log.info('page.delete', __('Page « {name} » supprimée (Ctrl+Z pour la retrouver)', { name }), { id: p.id, slug: p.slug, pages: state.site.pages.length, wasOpen: current || undefined });
        } }, '✕')),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Titre')), titles),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, langSlugs.length ? __('Adresse (par langue ; vide = même adresse)') : __c('url', 'Adresse')), h('div', { class: 'slug-row' }, h('span', { class: 'slug-prefix' }, '/'), slug, h('span', { class: 'slug-prefix' }, '/')), ...langSlugs,
        h('p', { class: 'hint' }, __('Les liens créés avec « Lier à une page » suivent automatiquement les changements d’adresse.'))),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Description pour Google')), seo),
      isHome ? null : h('label', { class: 'check' }, (() => {
        const cb = h('input', { type: 'checkbox', checked: !!p.footerLink, 'data-page-footer': p.id });
        cb.addEventListener('change', () => { if (apply(x => setPageFooterLink(x, p.id, cb.checked), { source: 'pages' }, 'footer-link')) log.info('page.footer-link', cb.checked ? __('« {name} » : lien dans le pied de page (retirée du menu)', { name }) : __('« {name} » : de retour dans le menu', { name }), { id: p.id, footer: cb.checked }); });
        return cb;
      })(), __('Lien dans le pied de page (et pas dans le menu)'))));
  return det;
}

/* Libellé d'une entrée pour l'éditeur (menuLabel garde les textes de repli du site publié, dans la langue du site) */
function menuPlaceholder(s, it, lang, withOwn = false) {
  const own = withOwn ? translate(s, it.label, lang) : '';
  if (own) return own;
  if (it.kind === 'page') {
    const p = s.pages.find(x => x.id === it.pageId);
    return p ? translate(s, p.title, lang) || __('Sans titre') : '';
  }
  return __('Lien');
}

function menuSection() {
  const s = state.site;
  const def = s.defaultLanguage;
  const lang = state.lang;
  const act = (fn, what = 'menu') => apply(fn, { source: 'pages' }, what);
  if (!Array.isArray(s.menu)) {
    return [h('h3', {}, __('Menu')),
      h('p', { class: 'hint' }, __('Menu automatique : toutes les pages, dans l’ordre ci-dessus.')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-menu-customize': '', onclick: () => { if (act(x => customizeMenu(x), 'menu-customize')) log.info('page.menu.customize', __n(state.site.menu?.length ?? 0, 'Menu personnalisé : {n} entrée reprise des pages', 'Menu personnalisé : {n} entrées reprises des pages'), { items: state.site.menu?.length ?? 0 }); } }, __('Personnaliser le menu (liens, sous-menus, libellés)'))];
  }
  const row = (it, sub, i, len) => {
    const target = it.kind === 'page' ? s.pages.find(p => p.id === it.pageId) : null;
    const label = h('input', { class: 'input input--sm', type: 'text', lang, value: it.label?.[lang] || '', placeholder: menuPlaceholder(s, it, lang), 'data-menu-label': it.id, 'aria-label': __('Libellé dans le menu ({lang})', { lang: lang.toUpperCase() }) });
    /* Entrée à jour (Entrée puis « change » l'enregistraient deux fois) */
    const freshIt = () => (state.site.menu || []).flatMap(x => [x, ...(x.children || [])]).find(x => x.id === it.id) || it;
    const save = () => { if (label.isConnected && label.value !== (freshIt().label?.[lang] || '') && act(x => setMenuItemLabel(x, it.id, label.value, lang), 'menu-label')) log.info('page.menu.label', label.value ? __('Libellé du menu ({lang}) : « {label} »', { lang: lang.toUpperCase(), label: label.value.slice(0, 60) }) : __('Libellé du menu ({lang}) : celui de la page', { lang: lang.toUpperCase() }), { item: it.id, kind: it.kind, lang, custom: !!label.value }); };
    label.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    label.addEventListener('change', save);
    const btn = (a, text, title, fn, disabled) => h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-menu-act': a, title, 'aria-label': title, disabled, onclick: () => {
      if (!act(fn, `menu-${a}`)) return;
      const d = { item: it.id, kind: it.kind, sub: sub || undefined, index: i };
      const pageWhat = target ? pageName(target) : __('page supprimée');
      const what = it.kind === 'page' ? __('« {name} »', { name: pageWhat }) : __('lien « {label} »', { label: menuPlaceholder(s, it, lang, true) });
      if (a === 'up' || a === 'down') log.info('page.menu.move', a === 'up' ? __('Menu : {what} monté', { what }) : __('Menu : {what} descendu', { what }), { ...d, dir: a === 'up' ? -1 : 1 });
      else if (a === 'indent') log.info('page.menu.indent', __('Menu : {what} mis en sous-menu de l’entrée au-dessus', { what }), d);
      else if (a === 'outdent') log.info('page.menu.outdent', __('Menu : {what} sorti du sous-menu', { what }), d);
      else log.info('page.menu.remove', __('Menu : {what} retiré (la page existe toujours)', { what }), d);
    } }, text);
    let url = null;
    if (it.kind === 'link') {
      url = h('input', { class: 'input input--sm input--mono', type: 'text', value: it.url || '', 'aria-label': __('Adresse du lien'), 'data-menu-url': it.id });
      url.addEventListener('change', () => { if (act(x => setMenuItemUrl(x, it.id, url.value), 'menu-url')) log.info('page.menu.url', __('Adresse d’un lien du menu modifiée'), { item: it.id, url: url.value.slice(0, 120) }); });
    }
    return h('div', { class: 'menu-item' + (sub ? ' is-sub' : ''), 'data-menu-item': it.id }, label,
      h('span', { class: 'row-btns' },
        btn('up', '↑', __('Monter'), x => moveMenuItem(x, it.id, -1), i === 0),
        btn('down', '↓', __('Descendre'), x => moveMenuItem(x, it.id, 1), i === len - 1),
        sub ? btn('outdent', '⇤', __('Sortir du sous-menu'), x => outdentMenuItem(x, it.id)) : btn('indent', '⇥', __('Mettre en sous-menu de l’entrée au-dessus'), x => indentMenuItem(x, it.id), i === 0 || !!it.children?.length),
        btn('remove', '✕', __('Retirer du menu'), x => removeMenuItem(x, it.id))),
      url,
      h('span', { class: 'menu-item__meta' }, it.kind === 'page' ? (target ? __('Page : {title}', { title: translate(s, target.title, def) || __('Sans titre') }) : __('Page : supprimée')) : __('Lien')));
  };
  const rows = [];
  s.menu.forEach((it, i) => {
    rows.push(row(it, false, i, s.menu.length));
    (it.children || []).forEach((k, j) => rows.push(row(k, true, j, it.children.length)));
  });
  const linkLabel = h('input', { class: 'input input--sm', type: 'text', placeholder: __('Libellé'), 'data-menu-link-label': '' });
  const linkUrl = h('input', { class: 'input input--sm input--mono', type: 'text', placeholder: __('https://… ou #ancre'), 'data-menu-link-url': '' });
  const inMenu = new Set(JSON.stringify(s.menu).match(/\x22pageId\x22:\x22[^\x22]+\x22/g)?.map(x => x.slice(10, -1)) || []);
  const missing = s.pages.filter(p => !inMenu.has(p.id));
  const addPage = missing.length ? h('select', { class: 'control control--sm', 'data-menu-add-page': '', 'aria-label': __('Ajouter une page au menu') },
    h('option', { value: '' }, __('+ Page absente du menu…')), missing.map(p => h('option', { value: p.id }, translate(s, p.title, def) || p.slug))) : null;
  addPage?.addEventListener('change', () => { if (addPage.value && act(x => addMenuPage(x, addPage.value), 'menu-page-add')) log.info('page.menu.page-add', __('Page « {name} » ajoutée au menu', { name: pageName(s.pages.find(p => p.id === addPage.value)) }), { page: addPage.value }); });
  return [h('h3', {}, __('Menu')),
    h('p', { class: 'hint' }, __('Libellés en {lang} (changez la langue en haut pour traduire). ⇥ met une entrée en sous-menu.', { lang: lang.toUpperCase() })),
    h('div', { class: 'menu-editor' }, rows),
    h('div', { class: 'add-page' }, linkLabel, linkUrl, h('button', { type: 'button', class: 'btn btn--small', 'data-menu-add-link': '', onclick: () => {
      if (!linkLabel.value.trim() || !linkUrl.value.trim()) {
        log.warn('page.menu.link-refused', __('Lien du menu non ajouté : libellé ou adresse vide'), { label: !!linkLabel.value.trim(), url: !!linkUrl.value.trim() });
        toast(__('Indiquez un libellé et une adresse.'), 'error');
        return;
      }
      const u = linkUrl.value.trim();
      if (act(x => addMenuLink(x, { label: linkLabel.value.trim(), url: u, lang, newTab: /^https?:/i.test(u) }), 'menu-link-add')) log.info('page.menu.link-add', __('Lien « {label} » ajouté au menu', { label: linkLabel.value.trim().slice(0, 60) }), { url: u.slice(0, 120), newTab: /^https?:/i.test(u), lang, items: state.site.menu?.length });
    } }, __('+ Lien'))),
    addPage,
    h('button', { type: 'button', class: 'btn btn--small', 'data-menu-auto': '', onclick: async () => {
      if (!(await confirmDialog({ id: 'menuAutoDialog', title: __('Revenir au menu automatique'), ok: __('Revenir au menu automatique'), danger: true, message: __('Revenir au menu automatique (toutes les pages) ? Les liens et libellés personnalisés seront perdus (Ctrl+Z pour annuler).') }))) { log.debug('page.menu.auto-cancel', __('Retour au menu automatique annulé')); return; }
      if (act(x => ({ ...structuredClone(x), menu: null }), 'menu-auto')) log.info('page.menu.auto', __('Menu automatique rétabli (toutes les pages, dans l’ordre)'), { dropped: s.menu.length });
    } }, __('Revenir au menu automatique'))];
}

/* Assistant : déclaration d'accessibilité en 4 langues, pré-remplie avec la vérification du site */
function openA11yDialog() {
  let d = document.getElementById('a11yDialog');
  d?.remove();
  const s = state.site;
  /* Avertissements utiles à la déclaration (dans la langue de l'interface : mots-clés français, anglais et japonais) */
  const limits = auditSite(s).warnings.filter(w => /contraste|contrast|コントラスト|description|説明|代替テキスト|titre|title|heading|見出し|タイトル|H1/i.test(w.message)).map(w => w.message).slice(0, 12).join('\n');
  log.info('page.a11y.open', __n(limits ? limits.split('\n').length : 0, 'Assistant de déclaration d’accessibilité ouvert ({n} limite pré-remplie)', 'Assistant de déclaration d’accessibilité ouvert ({n} limites pré-remplies)'), { limits: limits ? limits.split('\n').length : 0, exists: s.pages.some(p => p.slug === 'accessibilite') || undefined });
  const today = new Date().toISOString().slice(0, 10);
  const field = (label, ctl) => h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), ctl);
  const entity = h('input', { class: 'input', type: 'text', value: s.name, 'data-a11y': 'entity' });
  const email = h('input', { class: 'input', type: 'email', placeholder: __('accessibilite@exemple.be'), 'data-a11y': 'email' });
  const status = h('select', { class: 'control', 'data-a11y': 'status' },
    h('option', { value: 'partial' }, __('Partiellement conforme (cas le plus courant)')),
    h('option', { value: 'full' }, __('Totalement conforme')),
    h('option', { value: 'none' }, __('Non conforme')));
  const date = h('input', { class: 'input', type: 'date', value: today, 'data-a11y': 'date' });
  const lim = h('textarea', { class: 'input', 'data-a11y': 'limits', placeholder: __('Un point par ligne') });
  lim.value = limits;
  d = openDialog({ id: 'a11yDialog',
    titleId: 'a11yTitle',
    title: __('Déclaration d’accessibilité'),
    body: [h('div', { class: 'a11y-form' },
      h('p', { class: 'hint' }, __('Crée une page « Accessibilité » en français, néerlandais, allemand et anglais (référence WCAG 2.1 AA / EN 301 549), avec un lien dans le pied de page. Relisez-la avant publication : ce modèle n’est pas un avis juridique.')),
      field(__('Organisation responsable'), entity), field(__('Adresse de contact pour signaler un problème'), email), field(__('État de conformité'), status), field(__('Date de la vérification'), date),
      field(__('Contenus non accessibles connus (pré-rempli avec la vérification du site)'), lim))],
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Annuler')),
    h('button', { type: 'button', class: 'btn btn--primary', id: 'a11yCreate', onclick: () => {
        try {
          const r = addAccessibilityPage(state.site, { entity: entity.value, email: email.value.trim(), date: date.value || today, status: status.value, limits: lim.value.split('\n') });
          commit(r.site, { source: 'pages' });
          const np = r.site.pages.find(p => p.id === r.pageId);
          log.info('page.a11y.create', __('Page « Accessibilité » créée en {n} langues : /{slug}/', { n: Object.keys(np?.title || {}).length, slug: np?.slug }), { id: r.pageId, slug: np?.slug, status: status.value, limits: lim.value.split('\n').filter(x => x.trim()).length, langs: Object.keys(np?.title || {}), footerLink: !!np?.footerLink });
          d.close();
          setView({ pageId: r.pageId });
          toast(__('Page « Accessibilité » créée en 4 langues, avec un lien dans le pied de page.'));
        } catch (e) { log.warn('page.a11y.refused', __('Déclaration non créée : {error}', { error: e.message }), { email: !!email.value.trim(), status: status.value, error: e }); toast(e.message, 'error'); email.focus(); }
      } }, __('Créer la page'))] });
  email.focus();
}

/* Assistant : mentions légales et vie privée dans les langues du site (modèle à adapter et à faire relire) */
export function openLegalDialog() {
  document.getElementById('legalDialog')?.remove();
  const s = state.site;
  const saved = s.legal || {};
  const field = (label, ctl) => h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), ctl);
  const input = (k, ph, type = 'text') => h('input', { class: 'input', type, value: saved[k] ?? (k === 'name' ? s.name : ''), placeholder: ph, 'data-legal': k });
  const form = h('select', { class: 'control', 'data-legal': 'form' }, Object.keys(LEGAL_FORMS).map(k => h('option', { value: k, selected: (saved.form || 'asbl') === k }, LEGAL_FORMS[k][uiLang()] || LEGAL_FORMS[k].fr)));
  const ins = { name: input('name', __('Dénomination')), seat: input('seat', __('Rue, numéro, code postal, commune')), number: input('number', '0123.456.789'), rpm: input('rpm', __('ex. Liège, division Namur')), email: input('email', 'contact@exemple.be', 'email'), phone: input('phone', __('facultatif'), 'tel'), vat: input('vat', __('facultatif (ex. BE0123456789)')), host: input('host', __('ex. OVH SAS, 2 rue Kellermann, 59100 Roubaix, France')) };
  log.info('page.legal.open', __('Assistant des pages légales ouvert'), { exists: s.pages.filter(p => p.legal).map(p => p.legal) });
  const d = openDialog({ id: 'legalDialog',
    titleId: 'legalTitle',
    title: __('Mentions légales et vie privée'),
    body: [h('div', { class: 'a11y-form' },
      h('p', { class: 'hint is-warn', 'data-legal-warning': '' }, __('Modèle à adapter, à faire relire par un juriste : ce texte n’est pas un avis juridique.')),
      h('p', { class: 'hint' }, __('Crée deux pages, « Mentions légales » et « Vie privée », dans toutes les langues du site, avec un lien dans le pied de page. La case de consentement des formulaires renvoie à la page « Vie privée ».')),
      field(__('Dénomination'), ins.name), field(__('Forme juridique'), form), field(__('Siège'), ins.seat), field(__('Numéro d’entreprise (BCE)'), ins.number),
      field(__('RPM (tribunal de l’entreprise)'), ins.rpm), field(__('E-mail de contact'), ins.email), field(__('Téléphone'), ins.phone), field(__('Numéro de TVA'), ins.vat), field(__('Hébergeur du site'), ins.host))],
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Annuler')),
    h('button', { type: 'button', class: 'btn btn--primary', id: 'legalCreate', onclick: () => {
        const opts = Object.fromEntries(Object.entries(ins).map(([k, el]) => [k, el.value.trim()]));
        opts.form = form.value;
        try {
          const r = addLegalPages(state.site, opts);
          r.site.legal = opts;
          commit(r.site, { source: 'pages' });
          log.info('page.legal.create', __('Pages « Mentions légales » et « Vie privée » créées en {n} langues', { n: state.site.languages.length }), { legal: r.legalId, privacy: r.privacyId, form: opts.form, langs: state.site.languages, vat: !!opts.vat, footerLink: true });
          d.close();
          setView({ pageId: r.legalId });
          toast(__('Pages légales créées et liées dans le pied de page. Faites-les relire.'));
        } catch (e) {
          log.warn('page.legal.refused', __('Pages légales non créées : {error}', { error: e.message }), { error: e, filled: Object.keys(opts).filter(k => opts[k]) });
          toast(e.message, 'error');
        }
      } }, __('Créer les deux pages'))] });
  ins.name.focus();
}

export function pagesPanel() {
  const s = state.site;
  const title = h('input', { class: 'input', type: 'text', id: 'newPageTitle', placeholder: __('Titre de la nouvelle page'), 'aria-label': __('Titre de la nouvelle page') });
  const add = () => {
    const t = title.value.trim();
    if (!t) { log.warn('page.add-refused', __('Page non créée : titre vide')); title.focus(); toast(__('Donnez un titre à la page.'), 'error'); return; }
    let slug = slugify(t);
    let n = 2;
    while (s.pages.some(p => p.slug === slug)) slug = `${slugify(t)}-${n++}`;
    if (!apply(x => addPage(x, { slug, title: { [s.defaultLanguage]: t } }), { source: 'pages' }, 'add')) return;
    const created = state.site.pages.at(-1);
    log.info('page.add', __('Page « {title} » créée : /{slug}/', { title: t.slice(0, 60), slug }), { id: created.id, slug, deduplicated: slug !== slugify(t) || undefined, lang: s.defaultLanguage, pages: state.site.pages.length, menu: Array.isArray(state.site.menu) ? 'personnalisé' : 'automatique' });
    open.add(created.id);
    setView({ pageId: created.id });
    toast(__('Page « {title} » créée : /{slug}/', { title: t, slug }));
  };
  title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  return [
    h('div', { class: 'add-page' }, title, h('button', { type: 'button', class: 'btn btn--small btn--primary', id: 'addPageBtn', onclick: add }, __('+ Page'))),
    h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-page-describe': '', title: __('Décrire la page à créer : l’IA locale propose ses sections (aperçu avant de créer)'), onclick: () => openAsk(__('Crée une page « » avec ')) }, __('✨ Page décrite'))),
    h('p', { class: 'hint' }, __('Les pages apparaissent dans le menu dans cet ordre. L’accueil reste toujours en premier.')),
    h('button', { type: 'button', class: 'btn btn--small', 'data-a11y-page': '', onclick: openA11yDialog }, __('♿ Créer la déclaration d’accessibilité')),
    h('button', { type: 'button', class: 'btn btn--small', 'data-legal-pages': '', title: __('Mentions légales et vie privée, dans les langues du site'), onclick: openLegalDialog }, __('⚖ Créer les pages légales')),
    h('div', { class: 'page-list' }, s.pages.map((p, i) => pageCard(p, i, s.pages.length))),
    ...menuSection()
  ].filter(Boolean);
}
