/*
 * Contrôle avant export : erreurs bloquantes (structure invalide), avertissements (accessibilité,
 * liens cassés, formulaires sans destinataire…) et informations (traductions manquantes).
 * Chaque remarque indique la page et l'élément concernés pour pouvoir y aller d'un clic.
 */
import { REGISTRY, fieldsOf } from './widgets.js';
import './widgets-extra.js';
import { walk } from './tree.js';
import { validateSite, missingTranslations } from './site.js';
import { translate } from './render.js';
import { parseVideo } from './widgets-extra.js';
import { contrastIssues, headingIssues, formatRatio } from './contrast.js';
import { REGISTRY as REG } from './widgets.js';
import { TO_COMPLETE } from './legalpages.js';
import { __, __n, fmtNumber } from './ui-i18n.js';

const text = v => String(v || '').replace(/<[^>]*>/g, '').trim();
function findNodeIn(root, id) { let f = null; walk(root, n => { if (n.id === id) f = n; return !f; }); return f; }

export function auditSite(site) {
  const { errors } = validateSite(site);
  const warnings = [];
  const info = [];
  const def = site.defaultLanguage;
  const pageIds = new Set(site.pages.map(p => p.id));
  const anchors = new Map(site.pages.map(p => {
    const set = new Set();
    walk(p.root, n => { if (n.advanced?.anchor) set.add(n.advanced.anchor); return true; });
    return [p.id, set];
  }));
  const pageName = p => translate(site, p.title, def) || (p.slug ? `/${p.slug}/` : __('Accueil'));

  for (const page of site.pages) {
    const warn = (nodeId, message) => warnings.push({ pageId: page.id, nodeId, message: __('{page} : {message}', { page: pageName(page), message }) });
    if (!text(translate(site, page.title, def))) warn(null, __('la page n’a pas de titre (menu et onglet du navigateur).'));
    const todo = Object.values(TO_COMPLETE).find(m => JSON.stringify(page.root).includes(m));
    if (todo) warn(null, __('informations à compléter (« {mark} ») : remplacez-les avant de publier.', { mark: todo }));

    walk(page.root, n => {
      const label = REGISTRY[n.type]?.label ? __(REGISTRY[n.type].label) : n.type;
      const checkLink = (value, what) => {
        const v = String(value || '').trim();
        if (!v) return;
        const itm = v.match(/^item:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)(\/event\.ics)?$/);
        if (itm) {
          const col = site.collections?.[itm[1]];
          const it = col?.items.find(i => i.id === itm[2]);
          if (!it) warn(n.id, __('{what} pointe vers un contenu qui n’existe plus.', { what }));
          else if (it.status !== 'published') warn(n.id, __('{what} pointe vers un contenu en brouillon (lien inactif tant qu’il n’est pas publié).', { what }));
          return;
        }
        const pop = v.match(/^popup:([A-Za-z0-9_-]+)$/);
        if (pop) { if (!site.components?.[pop[1]]) warn(n.id, __('{what} ouvre une fenêtre (popup) dont le composant n’existe plus.', { what })); return; }
        const m = v.match(/^page:([A-Za-z0-9_-]+)(?:#([A-Za-z0-9_-]+))?$/);
        if (m) {
          if (!pageIds.has(m[1])) warn(n.id, __('{what} pointe vers une page qui n’existe plus.', { what }));
          else if (m[2] && !anchors.get(m[1]).has(m[2])) warn(n.id, __('{what} pointe vers l’ancre « {anchor} » introuvable sur la page liée.', { what, anchor: m[2] }));
          return;
        }
        if (v.startsWith('#') && v.length > 1 && !anchors.get(page.id).has(v.slice(1))) warn(n.id, __('{what} pointe vers l’ancre « {anchor} » introuvable sur cette page.', { what, anchor: v.slice(1) }));
      };
      const checkProps = (props, fields, where = '') => {
        for (const f of fields) {
          if (f.type === 'list') { (props[f.key] || []).forEach((item, i) => checkProps(item, f.fields, __('{item} {n} : ', { item: f.itemLabel ? __(f.itemLabel) : __('élément'), n: i + 1 }))); continue; }
          if (f.type === 'url') checkLink(props[f.key], __('{widget} ({where}{field})', { widget: label, where, field: __(f.label).toLowerCase() }));
          if (f.type === 'image' && props[f.key] && f.key !== 'poster' && f.key !== 'photo') {
            const altField = fields.find(x => x.key === 'alt');
            if (altField && !text(translate(site, props.alt, def))) warn(n.id, __('{widget} : {where}image sans description (lecteurs d’écran, Google).', { widget: label, where }));
          }
        }
      };
      checkProps(n.props || {}, fieldsOf(n.type));
      const missingColors = new Set();
      for (const st of Object.values(n.style || {})) for (const v of Object.values(st || {})) {
        if (typeof v === 'string' && v.startsWith('palette:') && !site.theme?.palette?.[v.slice(8)]) missingColors.add(v.slice(8));
      }
      for (const k of missingColors) warn(n.id, __('{widget} : utilise la couleur {colour}, qui n’existe plus dans la palette.', { widget: label, colour: k }));
      if (n.type === 'button' && (!n.props.link || n.props.link === '#')) warn(n.id, __('bouton « {label} » sans lien.', { label: text(translate(site, n.props.label, def)) }));
      if (n.type === 'form' && !/^https:\/{2}/.test(n.props.action || '') && !/@/.test(n.props.email || '')) warn(n.id, __('formulaire sans adresse de réception : les messages ne seront envoyés nulle part.'));
      if (n.type === 'video' && !parseVideo(n.props.url)) warn(n.id, __('vidéo : adresse YouTube ou Vimeo manquante ou non reconnue.'));
      if (n.type === 'map' && !text(n.props.address)) warn(n.id, __('carte sans adresse.'));
      if (n.type === 'collection-list' && !site.collections?.[n.props.collection]) warn(n.id, __('liste de contenus : choisissez une collection (aucune n’est reliée).'));
      if (n.type === 'image' && !n.props.src && !n.bind?.src) warn(n.id, __('image non choisie : rien ne s’affichera à cet endroit.'));
      return true;
    });
    for (const hi of headingIssues(page)) warn(hi.nodeId, hi.message);
    for (const ci of contrastIssues(site, page)) {
      const n = findNodeIn(page.root, ci.nodeId);
      const lbl = REG[n?.type]?.label ? __(REG[n.type].label) : __('Élément');
      if (ci.unknown) info.push({ pageId: page.id, nodeId: ci.nodeId, message: __('{page} : {widget} sur une image de fond — vérifiez le contraste à l’œil.', { page: pageName(page), widget: lbl }) });
      else warn(ci.nodeId, __('{widget} : contraste insuffisant {ratio} ({required}:1 requis, WCAG AA) — texte {fg} sur {bg}.', { widget: lbl, ratio: formatRatio(ci.ratio), required: fmtNumber(ci.required), fg: ci.fg, bg: ci.bg }));
    }
  }

  for (const c of Object.values(site.collections || {})) {
    const published = c.items.filter(i => i.status === 'published');
    const cw = (it, message) => warnings.push({ collectionId: c.id, itemId: it?.id || null, message: __('{collection} : {message}', { collection: c.name, message }) });
    if (!published.length) info.push({ collectionId: c.id, message: __('{collection} : aucun élément publié pour l’instant.', { collection: c.name }) });
    for (const it of published) {
      const t = text(translate(site, it.values[c.titleField], def)) || it.slug;
      if (!text(translate(site, it.values[c.titleField], def))) cw(it, __('un élément n’a pas de titre ({slug}).', { slug: it.slug }));
      if (c.kind === 'events') {
        if (!it.values.date) cw(it, __('« {title} » n’a pas de date : il n’apparaît pas dans les listes « à venir ».', { title: t }));
        else if (!it.values.place && !it.values.address) cw(it, __('« {title} » n’a pas de lieu (Google l’exige pour afficher l’événement).', { title: t }));
      }
      if (c.kind === 'news' && !it.values.date) cw(it, __('« {title} » n’a pas de date.', { title: t }));
    }
  }

  const missing = missingTranslations(site);
  const byLang = {};
  for (const m of missing) byLang[m.lang] = (byLang[m.lang] || 0) + 1;
  for (const [lang, count] of Object.entries(byLang)) info.push({ lang, message: __n(count, '{lang} : {n} texte non traduit (affiché dans la langue principale).', '{lang} : {n} textes non traduits (affichés dans la langue principale).', { lang: lang.toUpperCase() }) });
  const review = Object.values(site.mt || {}).filter(Boolean).length;
  if (review) info.push({ message: __n(review, '{n} traduction automatique à relire (tableau des traductions → filtre « à relire »).', '{n} traductions automatiques à relire (tableau des traductions → filtre « à relire »).') });
  if (!site.baseUrl) info.push({ message: __('Adresse du site non renseignée : pas de sitemap ni de liens de langue pour Google.') });

  return { ok: errors.length === 0, errors, warnings, info };
}
