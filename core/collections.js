/*
 * Collections : contenus répétés (médias membres, actualités, agenda…).
 * Une collection = des champs typés et des éléments. Une carte (pour les listes) et une page de détail
 * se dessinent une fois avec les widgets habituels, dont les contenus peuvent être « reliés » à un champ.
 * Fonctions pures : chaque opération renvoie un nouveau site.
 */
import { createNode, createSectionWithColumns, walk, findNode } from './tree.js';
import { fieldDef } from './widgets.js';
import { sanitizeRich, richToText, decodeEntities } from './sanitize.js';
import { escapeHtml, safeUrl } from './escape.js';
import './collection-widgets.js';
import { __, __c } from './ui-i18n.js';
import { slugify } from './site.js';
import { siteTimezone, isoWithOffset, icsUtc, vtimezone } from './timezone.js';
import { examplesFor, SHOP_CATEGORIES } from './collection-examples.js';
import { cloneSite } from './asset-store.js';

const clone = v => structuredClone(v);
const rand = () => Math.random().toString(36).slice(2, 10);
const LANGS = ['fr', 'nl', 'de', 'en', 'ja'];
const RESERVED = new Set(['assets', 'atelier-data', 'publish', 'index', 'sitemap', 'robots', 'feed', ...LANGS]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const filled = v => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim() !== '';

/* Adresse lisible : comme slugify (kana → rōmaji) ; `fallback` donne un repli stable (« element-1a2b3c ») quand rien ne reste (kanji seuls) */
export function slug(text, fallback = '') {
  return slugify(text, { fallback });
}

const L = (fr, nl, de, en, ja) => ({ fr, nl, de, en, ...(ja ? { ja } : {}) });

/* ---------- Types de champ et types de collection ---------- */
export const FIELD_TYPES = {
  text: { label: __('Texte'), i18n: true },
  richtext: { label: __('Texte mis en forme'), i18n: true },
  image: { label: __('Image') },
  date: { label: __('Date') },
  time: { label: __('Heure') },
  url: { label: __('Lien') },
  email: { label: __('E-mail') },
  number: { label: __('Nombre') },
  select: { label: __('Choix dans une liste') },
  toggle: { label: __('Oui / non') }
};

const opt = (value, label, extra = {}) => ({ value, label, ...extra });

export const COLLECTION_KINDS = {
  members: {
    label: __('Médias membres'), icon: '📻', hint: __('Annuaire : nom, logo, présentation, type de média, ville, site web.'),
    titleField: 'name', imageField: 'logo', excerptField: 'intro', sort: { field: 'name', dir: 'asc' },
    fields: [
      { key: 'name', type: 'text', label: __('Nom'), i18n: false },
      { key: 'logo', type: 'image', label: __('Logo') },
      { key: 'intro', type: 'richtext', label: __('Présentation'), i18n: true },
      { key: 'type', type: 'select', label: __('Type de média'), options: [
        opt('radio', L('Radio', 'Radio', 'Radio', 'Radio', 'ラジオ')), opt('tv', L('Télévision', 'Televisie', 'Fernsehen', 'Television', 'テレビ')),
        opt('press', L('Presse écrite', 'Geschreven pers', 'Presse', 'Print', '新聞・雑誌')), opt('web', L('Média en ligne', 'Onlinemedium', 'Onlinemedium', 'Online media', 'オンラインメディア')),
        opt('podcast', L('Podcast', 'Podcast', 'Podcast', 'Podcast', 'ポッドキャスト'))] },
      { key: 'city', type: 'text', label: __('Ville'), i18n: false },
      { key: 'website', type: 'url', label: __('Site web') }
    ]
  },
  news: {
    label: __('Actualités'), icon: '📰', hint: __('Articles datés avec image, chapô et texte ; flux RSS.'),
    titleField: 'title', dateField: 'date', imageField: 'image', excerptField: 'excerpt', sort: { field: 'date', dir: 'desc' }, rss: true,
    fields: [
      { key: 'title', type: 'text', label: __('Titre'), i18n: true },
      { key: 'date', type: 'date', label: __('Date') },
      { key: 'image', type: 'image', label: __('Image') },
      { key: 'excerpt', type: 'text', label: __('Chapô (résumé)'), i18n: true },
      { key: 'body', type: 'richtext', label: __('Texte'), i18n: true },
      { key: 'author', type: 'text', label: __('Auteur'), i18n: false }
    ]
  },
  events: {
    label: __('Agenda'), icon: '📅', hint: __('Événements : date, heure, lieu, statut ; « Ajouter à mon agenda ».'),
    titleField: 'title', dateField: 'date', endField: 'endDate', imageField: 'image', excerptField: 'description', sort: { field: 'date', dir: 'asc' },
    fields: [
      { key: 'title', type: 'text', label: __('Titre'), i18n: true },
      { key: 'date', type: 'date', label: __('Date') },
      { key: 'time', type: 'time', label: __('Heure de début') },
      { key: 'endDate', type: 'date', label: __('Date de fin (plusieurs jours)') },
      { key: 'endTime', type: 'time', label: __('Heure de fin') },
      { key: 'place', type: 'text', label: __('Lieu'), i18n: false },
      { key: 'address', type: 'text', label: __('Adresse'), i18n: false },
      { key: 'image', type: 'image', label: __('Image') },
      { key: 'description', type: 'richtext', label: __('Description'), i18n: true },
      { key: 'status', type: 'select', label: __('Statut'), options: [
        opt('scheduled', L('Prévu', 'Gepland', 'Geplant', 'Scheduled', '予定どおり'), { quiet: true }),
        opt('cancelled', L('Annulé', 'Geannuleerd', 'Abgesagt', 'Cancelled', '中止')),
        opt('postponed', L('Reporté', 'Uitgesteld', 'Verschoben', 'Postponed', '延期')),
        opt('rescheduled', L('Nouvelle date', 'Nieuwe datum', 'Neuer Termin', 'Rescheduled', '日程変更'))] },
      { key: 'link', type: 'url', label: __('Inscription ou billetterie') }
    ]
  },
  shops: {
    label: __('Commerces'), icon: '🏪', hint: __('Annuaire des commerces membres : catégorie, adresse, horaires, téléphone, site web.'),
    titleField: 'name', imageField: 'logo', excerptField: 'intro', sort: { field: 'name', dir: 'asc' },
    fields: [
      { key: 'name', type: 'text', label: __('Nom'), i18n: false },
      { key: 'logo', type: 'image', label: __('Logo ou photo') },
      { key: 'category', type: 'select', label: __('Catégorie'), options: SHOP_CATEGORIES.map(([v, l]) => opt(v, l)) },
      { key: 'intro', type: 'richtext', label: __('Présentation'), i18n: true },
      { key: 'address', type: 'text', label: __('Adresse'), i18n: false },
      { key: 'hours', type: 'text', label: __('Horaires'), i18n: true },
      { key: 'phone', type: 'text', label: __('Téléphone'), i18n: false },
      { key: 'website', type: 'url', label: __('Site web') }
    ]
  },
  custom: {
    label: __('Personnalisée'), icon: '▦', hint: __('Un titre, une image, un texte : ajoutez vos propres champs.'),
    titleField: 'title', imageField: 'image', excerptField: 'text', sort: { field: '', dir: 'asc' },
    fields: [
      { key: 'title', type: 'text', label: __('Titre'), i18n: true },
      { key: 'image', type: 'image', label: __('Image') },
      { key: 'text', type: 'richtext', label: __('Texte'), i18n: true }
    ]
  }
};

/* ---------- Modèles par défaut (carte et page de détail) ---------- */
function w(type, props = {}, bind = null) {
  const n = createNode(type);
  Object.assign(n.props, props);
  if (bind) n.bind = bind;
  return n;
}
const field = (key, icon = 'none', format = 'long', label = {}) => w('item-field', { field: key, icon, format, label });

function cardColumn(children) {
  const c = createNode('column');
  c.style.desktop = { background: 'palette:c6', paddingTop: 'space:m', paddingRight: 'space:m', paddingBottom: 'space:m', paddingLeft: 'space:m', borderRadius: '12px', boxShadow: 'md', gap: 'space:xs' };
  c.children = children;
  return c;
}

const MORE = L('En savoir plus', 'Meer weten', 'Mehr erfahren', 'Read more', '詳しく見る');

export function cardTemplate(kind) {
  const h3 = (key) => w('heading', { level: 'h3' }, { text: key, link: '@url' });
  const more = (label = MORE) => w('button', { label, variant: 'link', size: 'sm' }, { link: '@url' });
  switch (kind) {
    case 'members': return cardColumn([
      w('image', { ratio: 'auto' }, { src: 'logo', alt: 'name' }), field('type', 'tag'), h3('name'), field('city', 'pin'),
      more(L('Découvrir', 'Ontdekken', 'Entdecken', 'Discover', '見てみる'))]);
    case 'news': return cardColumn([
      w('image', { ratio: '16/9' }, { src: 'image', alt: 'title' }), field('date', 'calendar', 'short'), h3('title'),
      w('text', {}, { content: 'excerpt' }), more(L('Lire la suite', 'Lees meer', 'Weiterlesen', 'Read more', '続きを読む'))]);
    case 'events': return cardColumn([
      w('image', { ratio: '16/9' }, { src: 'image', alt: 'title' }), field('@when', 'calendar'), field('status', 'none'), h3('title'),
      field('place', 'pin'), more()]);
    case 'shops': return cardColumn([
      w('image', { ratio: '4/3' }, { src: 'logo', alt: 'name' }), field('category', 'tag'), h3('name'), field('address', 'pin'), field('hours', 'clock'),
      more(L('Voir la fiche', 'Bekijk de fiche', 'Zum Eintrag', 'View details', '詳しく見る'))]);
    default: return cardColumn([w('image', { ratio: '16/9' }, { src: 'image', alt: 'title' }), h3('title'), w('text', {}, { content: 'text' }), more()]);
  }
}

const BACK = {
  members: L('← Tous les membres', '← Alle leden', '← Alle Mitglieder', '← All members', '← メンバー一覧'),
  shops: L('← Tous les commerces', '← Alle handelszaken', '← Alle Geschäfte', '← All shops', '← お店一覧'),
  news: L('← Toutes les actualités', '← Alle nieuws', '← Alle Nachrichten', '← All news', '← ニュース一覧'),
  events: L('← Tout l’agenda', '← Volledige agenda', '← Alle Termine', '← Full calendar', '← イベント一覧'),
  custom: L('← Retour à la liste', '← Terug naar de lijst', '← Zurück zur Liste', '← Back to the list', '← 一覧に戻る')
};

export function detailTemplate(kind) {
  const page = createNode('page');
  const back = w('button', { label: BACK[kind] || BACK.custom, variant: 'link', size: 'sm' }, { link: '@list' });
  const h1 = key => w('heading', { level: 'h1' }, { text: key });
  if (kind === 'shops') {
    const sec = createSectionWithColumns(2, [5, 7]);
    const [left, right] = sec.children[0].children;
    left.children = [w('image', { ratio: '4/3' }, { src: 'logo', alt: 'name' })];
    right.children = [back, h1('name'), field('category', 'tag'), field('address', 'pin'), field('hours', 'clock'), field('phone', 'phone'),
      w('text', {}, { content: 'intro' }),
      w('button', { label: L('Visiter le site', 'Website bezoeken', 'Website besuchen', 'Visit the website', 'ウェブサイトを見る'), variant: 'primary', newTab: true }, { link: 'website' })];
    page.children = [sec];
    return page;
  }
  if (kind === 'members') {
    const sec = createSectionWithColumns(2, [4, 8]);
    const [left, right] = sec.children[0].children;
    left.children = [w('image', { ratio: 'auto' }, { src: 'logo', alt: 'name' })];
    right.children = [back, h1('name'), field('type', 'tag'), field('city', 'pin'), w('text', {}, { content: 'intro' }),
      w('button', { label: L('Visiter le site', 'Website bezoeken', 'Website besuchen', 'Visit the website', 'ウェブサイトを見る'), variant: 'primary', newTab: true }, { link: 'website' })];
    page.children = [sec];
    return page;
  }
  const sec = createSectionWithColumns(1);
  const col = sec.children[0].children[0];
  if (kind === 'news') {
    col.children = [back, field('date', 'calendar'), h1('title'), w('text', {}, { content: 'excerpt' }), w('image', { ratio: '16/9' }, { src: 'image', alt: 'title' }),
      w('text', {}, { content: 'body' }), field('author', 'users', 'long', L('Par', 'Door', 'Von', 'By', '文：'))];
  } else if (kind === 'events') {
    col.children = [back, h1('title'), field('@when', 'calendar'), field('status', 'none'), field('place', 'pin'), field('address', 'none'),
      w('image', { ratio: '16/9' }, { src: 'image', alt: 'title' }), w('text', {}, { content: 'description' }),
      w('button', { label: L('Inscription et billets', 'Inschrijven en tickets', 'Anmeldung und Tickets', 'Tickets and registration', '申し込み・チケット'), variant: 'primary', newTab: true }, { link: 'link' }),
      w('button', { label: L('Ajouter à mon agenda', 'Toevoegen aan mijn agenda', 'Zu meinem Kalender hinzufügen', 'Add to my calendar', 'カレンダーに追加'), variant: 'outline' }, { link: '@ics' })];
  } else {
    col.children = [back, h1('title'), w('image', { ratio: '16/9' }, { src: 'image', alt: 'title' }), w('text', {}, { content: 'text' })];
  }
  page.children = [sec];
  return page;
}

/* ---------- Collections ---------- */
export const findCollection = (site, id) => site.collections?.[id] || null;
function need(site, id) {
  const c = findCollection(site, id);
  if (!c) throw new Error(__('Collection introuvable.'));
  return c;
}
function withCollection(site, id, fn) {
  need(site, id);
  const s = cloneSite(site);
  const r = fn(s.collections[id], s);
  return r === undefined ? s : r;
}

export const collectionSlug = (site, col, lang) => (!lang || lang === site.defaultLanguage ? col.slug : (col.slugs?.[lang] || col.slug));

function slugTaken(site, slugValue, lang, exceptId) {
  return Object.values(site.collections || {}).some(c => c.id !== exceptId && collectionSlug(site, c, lang) === slugValue);
}

function uniqueCollectionSlug(site, base) {
  let s0 = slug(base, 'contenus') || 'contenus';
  if (RESERVED.has(s0)) s0 = `${s0}-1`;
  let v = s0;
  for (let n = 2; slugTaken(site, v, site.defaultLanguage); n++) v = `${s0}-${n}`;
  return v;
}

export function createCollection(site, { kind = 'custom', name } = {}) {
  const k = COLLECTION_KINDS[kind];
  if (!k) throw new Error(__('Type de collection inconnu : {kind}', { kind }));
  const s = cloneSite(site);
  s.collections ||= {};
  const id = 'col_' + rand();
  const nm = String(name ?? k.label).trim().replace(/\s+/g, ' ').slice(0, 60) || k.label;
  s.collections[id] = {
    id, name: nm, kind, slug: uniqueCollectionSlug(s, nm), slugs: {},
    titleField: k.titleField, dateField: k.dateField || '', endField: k.endField || '', imageField: k.imageField || '', excerptField: k.excerptField || '',
    fields: clone(k.fields),
    items: [],
    card: cardTemplate(kind),
    detail: detailTemplate(kind),
    settings: { detail: true, sort: { ...k.sort }, listPage: '', rss: !!k.rss }
  };
  return { site: s, id };
}

export function setCollectionMeta(site, id, patch) {
  return withCollection(site, id, (c, s) => {
    if ('name' in patch) {
      const n = String(patch.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!n) throw new Error(__('Donnez un nom à la collection.'));
      c.name = n;
    }
    if ('slug' in patch) {
      const lang = patch.lang || s.defaultLanguage;
      const def = lang === s.defaultLanguage;
      const v = slug(patch.slug);
      if (!v && def) throw new Error(__('L’adresse ne peut pas être vide.'));
      if (v && RESERVED.has(v)) throw new Error(__('L’adresse « {slug} » est réservée.', { slug: v }));
      if (v && slugTaken(s, v, lang, id)) throw new Error(def ? __('Une collection « {slug} » existe déjà.', { slug: v }) : __('Une collection « {slug} » existe déjà en {lang}.', { slug: v, lang: lang.toUpperCase() }));
      if (def) c.slug = v;
      else { c.slugs = { ...(c.slugs || {}) }; if (v && v !== c.slug) c.slugs[lang] = v; else delete c.slugs[lang]; }
    }
    if ('detail' in patch) c.settings.detail = !!patch.detail;
    if ('rss' in patch) c.settings.rss = !!patch.rss;
    if ('listPage' in patch) {
      if (patch.listPage && !s.pages.some(p => p.id === patch.listPage)) throw new Error(__('Page introuvable.'));
      c.settings.listPage = patch.listPage || '';
    }
    if ('sortField' in patch) {
      const f = String(patch.sortField || '');
      if (f && f !== '_manual' && !c.fields.some(x => x.key === f)) throw new Error(__('Champ inconnu.'));
      c.settings.sort = { ...c.settings.sort, field: f === '_manual' ? '' : f };
    }
    if ('sortDir' in patch) c.settings.sort = { ...c.settings.sort, dir: patch.sortDir === 'desc' ? 'desc' : 'asc' };
  });
}

export function renameCollection(site, id, name) { return setCollectionMeta(site, id, { name }); }

export function deleteCollection(site, id) {
  return withCollection(site, id, (c, s) => { delete s.collections[id]; });
}

/* ---------- Champs ---------- */
export function addField(site, id, { label, type = 'text', i18n } = {}) {
  if (!FIELD_TYPES[type]) throw new Error(__('Type de champ inconnu : {type}', { type }));
  const lbl = String(label ?? '').trim().slice(0, 50);
  if (!lbl) throw new Error(__('Donnez un nom au champ.'));
  let key;
  const s = withCollection(site, id, c => {
    const base = slug(lbl, 'champ').slice(0, 30).replace(/-+$/, '') || 'champ';
    key = base;
    for (let n = 2; c.fields.some(f => f.key === key) || ['slug', 'status', 'id'].includes(key); n++) key = `${base}-${n}`;
    const f = { key, type, label: lbl, i18n: !!FIELD_TYPES[type].i18n && i18n !== false };
    if (type === 'select') f.options = [];
    c.fields.push(f);
  });
  return { site: s, key };
}

export function updateField(site, id, key, patch) {
  return withCollection(site, id, c => {
    const f = c.fields.find(x => x.key === key);
    if (!f) throw new Error(__('Champ introuvable.'));
    if ('label' in patch) {
      const l = String(patch.label ?? '').trim().slice(0, 50);
      if (!l) throw new Error(__('Donnez un nom au champ.'));
      f.label = l;
    }
    if ('i18n' in patch && FIELD_TYPES[f.type].i18n) {
      const on = !!patch.i18n;
      if (on !== !!f.i18n) {
        for (const it of c.items) {
          const v = it.values[key];
          if (v === undefined) continue;
          it.values[key] = on ? (typeof v === 'object' ? v : { [site.defaultLanguage]: v }) : (typeof v === 'object' ? (v[site.defaultLanguage] || '') : v);
        }
        f.i18n = on;
      }
    }
  });
}

export function setFieldOptions(site, id, key, options) {
  return withCollection(site, id, c => {
    const f = c.fields.find(x => x.key === key);
    if (!f || f.type !== 'select') throw new Error(__('Champ de choix introuvable.'));
    const seen = new Set();
    f.options = (options || []).map(o => {
      const label = typeof o.label === 'object' ? Object.fromEntries(Object.entries(o.label).map(([l, v]) => [l, cleanText(v, 60)])) : { [site.defaultLanguage]: cleanText(o.label, 60) };
      let v = slug(o.value || label[site.defaultLanguage] || '', 'choix') || 'choix';
      const base = v;
      for (let n = 2; seen.has(v); n++) v = `${base}-${n}`;
      seen.add(v);
      return { value: v, label, ...(o.quiet ? { quiet: true } : {}) };
    });
    const allowed = new Set(f.options.map(o => o.value));
    for (const it of c.items) if (it.values[key] && !allowed.has(it.values[key])) it.values[key] = '';
  });
}

export function removeField(site, id, key) {
  return withCollection(site, id, c => {
    if (key === c.titleField) throw new Error(__('Le champ titre ne peut pas être supprimé (il sert d’adresse et de titre de page).'));
    if (!c.fields.some(f => f.key === key)) throw new Error(__('Champ introuvable.'));
    c.fields = c.fields.filter(f => f.key !== key);
    for (const it of c.items) delete it.values[key];
    for (const k of ['dateField', 'endField', 'imageField', 'excerptField']) if (c[k] === key) c[k] = '';
    if (c.settings.sort?.field === key) c.settings.sort = { field: '', dir: 'asc' };
    const unbind = root => walk(root, n => {
      if (n.bind) for (const [p, v] of Object.entries(n.bind)) if (v === key) delete n.bind[p];
      if (n.type === 'item-field' && n.props?.field === key) n.props.field = '';
      return true;
    });
    unbind(c.card);
    unbind(c.detail);
  });
}

export function moveField(site, id, key, delta) {
  return withCollection(site, id, c => {
    const i = c.fields.findIndex(f => f.key === key);
    const j = Math.max(0, Math.min(c.fields.length - 1, i + delta));
    if (i < 0 || i === j) return;
    const [f] = c.fields.splice(i, 1);
    c.fields.splice(j, 0, f);
  });
}

/* ---------- Valeurs (assainies selon le type) ---------- */
export function cleanText(v, max = 1000) {
  return decodeEntities(String(v ?? '').replace(/<[^>]*>/g, '')).replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000B-\u001F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function validDate(v) {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function cleanValue(f, value) {
  const v = typeof value === 'string' ? value.trim() : value;
  switch (f.type) {
    case 'text': return cleanText(v, f.key === 'title' || f.key === 'name' ? 200 : 1000);
    case 'richtext': return sanitizeRich(String(v ?? '')).slice(0, 50000);
    case 'image':
      if (!v) return '';
      if (/^asset:[a-z0-9_]+$/i.test(v) || /^https:\/\/[^\s\x22\x27<>()]+$/i.test(v)) return v;
      throw new Error(__('Image : choisissez une image importée ou une adresse https://'));
    case 'date':
      if (!v) return '';
      if (!validDate(v)) throw new Error(__('Date invalide : utilisez le format AAAA-MM-JJ.'));
      return v;
    case 'time':
      if (!v) return '';
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error(__('Heure invalide : utilisez le format HH:MM.'));
      return v;
    case 'url': {
      if (!v) return '';
      const u = String(v);
      if (!/^(https?:\/\/[^\s\x22\x27<>]+|mailto:[^\s\x22\x27<>]+|tel:[+0-9 ().-]+)$/i.test(u) || safeUrl(u) === '#') throw new Error(__('Lien non autorisé : https://, mailto: ou tel: uniquement.'));
      return u.slice(0, 500);
    }
    case 'email':
      if (!v) return '';
      if (!/^[^\s@<>\x22\x27]+@[^\s@<>\x22\x27]+\.[a-z]{2,}$/i.test(v)) throw new Error(__('Adresse e-mail invalide.'));
      return String(v).slice(0, 200);
    case 'number': {
      if (v === '' || v === null || v === undefined) return '';
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(__('Nombre invalide.'));
      return n;
    }
    case 'select':
      if (!v) return '';
      if (!(f.options || []).some(o => o.value === v)) throw new Error(__('Choix inconnu pour « {field} » : {value}', { field: f.label, value: v }));
      return v;
    case 'toggle': return !!v;
    default: return '';
  }
}

function writeValue(item, f, value, lang, def) {
  if (f.i18n) {
    if (value && typeof value === 'object') {
      const out = { ...(typeof item.values[f.key] === 'object' ? item.values[f.key] : {}) };
      for (const [l, x] of Object.entries(value)) if (LANGS.includes(l)) out[l] = cleanValue(f, x);
      item.values[f.key] = out;
    } else item.values[f.key] = { ...(typeof item.values[f.key] === 'object' ? item.values[f.key] : {}), [lang || def]: cleanValue(f, value) };
  } else item.values[f.key] = cleanValue(f, value && typeof value === 'object' && !Array.isArray(value) ? (value[def] ?? '') : value);
}

function uniqueItemSlug(col, base, exceptId) {
  const b = slug(base, 'element') || 'element';
  let v = b;
  for (let n = 2; col.items.some(i => i.id !== exceptId && i.slug === v); n++) v = `${b}-${n}`;
  return v;
}

export const findItem = (col, itemId) => col?.items.find(i => i.id === itemId) || null;

export function pick(site, v, lang) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return String(v);
  if (filled(v[lang])) return v[lang];
  return typeof v[site.defaultLanguage] === 'string' ? v[site.defaultLanguage] : '';
}

export function itemTitle(site, col, item, lang) {
  return pick(site, item.values[col.titleField], lang || site.defaultLanguage);
}

export function addItem(site, id, values = {}, { status = 'published' } = {}) {
  let itemId;
  const s = withCollection(site, id, (c, s2) => {
    const item = { id: 'it_' + rand(), slug: '', status: status === 'draft' ? 'draft' : 'published', values: {} };
    for (const [k, v] of Object.entries(values || {})) {
      const f = c.fields.find(x => x.key === k);
      if (!f) throw new Error(__('Champ inconnu : {key}', { key: k }));
      writeValue(item, f, v, s2.defaultLanguage, s2.defaultLanguage);
    }
    item.slug = uniqueItemSlug(c, itemTitle(s2, c, item, s2.defaultLanguage));
    c.items.push(item);
    itemId = item.id;
  });
  return { site: s, itemId };
}

function withItem(site, id, itemId, fn) {
  return withCollection(site, id, (c, s) => {
    const it = findItem(c, itemId);
    if (!it) throw new Error(__c('item', 'Élément introuvable.'));
    return fn(it, c, s);
  });
}

export function setItemValue(site, id, itemId, key, value, lang) {
  return withItem(site, id, itemId, (it, c, s) => {
    const f = c.fields.find(x => x.key === key);
    if (!f) throw new Error(__('Champ inconnu : {key}', { key }));
    writeValue(it, f, value, lang, s.defaultLanguage);
  });
}

export function setItemSlug(site, id, itemId, value) {
  return withItem(site, id, itemId, (it, c) => {
    const v = slug(value);
    if (!v) throw new Error(__('L’adresse ne peut pas être vide.'));
    if (c.items.some(i => i.id !== itemId && i.slug === v)) throw new Error(__('Un élément « {slug} » existe déjà dans cette collection.', { slug: v }));
    it.slug = v;
  });
}

export function setItemStatus(site, id, itemId, status) {
  if (!['published', 'draft'].includes(status)) throw new Error(__('Statut inconnu.'));
  return withItem(site, id, itemId, it => { it.status = status; });
}

export function moveItem(site, id, itemId, delta) {
  return withCollection(site, id, c => {
    const i = c.items.findIndex(x => x.id === itemId);
    if (i < 0) throw new Error(__c('item', 'Élément introuvable.'));
    const j = Math.max(0, Math.min(c.items.length - 1, i + delta));
    if (i === j) return;
    const [it] = c.items.splice(i, 1);
    c.items.splice(j, 0, it);
  });
}

const COPY = L('copie', 'kopie', 'Kopie', 'copy', 'コピー');
export function duplicateItem(site, id, itemId) {
  let newId;
  const s = withItem(site, id, itemId, (it, c, s2) => {
    const copy = clone(it);
    copy.id = 'it_' + rand();
    copy.status = 'draft';
    const tf = c.fields.find(f => f.key === c.titleField);
    const t = copy.values[c.titleField];
    if (tf?.i18n && t && typeof t === 'object') for (const l of Object.keys(t)) { if (filled(t[l])) t[l] = `${t[l]} (${COPY[l] || 'copie'})`; }
    else if (typeof t === 'string' && t) copy.values[c.titleField] = `${t} (${COPY[s2.defaultLanguage] || 'copie'})`;
    copy.slug = uniqueItemSlug(c, it.slug);
    c.items.splice(c.items.indexOf(it) + 1, 0, copy);
    newId = copy.id;
  });
  return { site: s, itemId: newId };
}

export function removeItem(site, id, itemId) {
  return withCollection(site, id, c => {
    if (!findItem(c, itemId)) throw new Error(__c('item', 'Élément introuvable.'));
    c.items = c.items.filter(i => i.id !== itemId);
  });
}

/* ---------- Requête ---------- */
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const itemEnd = (col, item) => (col.endField && item.values[col.endField]) || (col.dateField ? item.values[col.dateField] : '') || '';

export function queryItems(site, col, { sortField, sortDir, limit = 0, filter = '', when = 'all', today = localToday(), drafts = false, lang } = {}) {
  if (!col) return [];
  const lg = lang || site.defaultLanguage;
  let items = col.items.filter(i => drafts || i.status === 'published');
  if (filter) {
    const at = filter.indexOf('=');
    const k = filter.slice(0, at);
    const v = filter.slice(at + 1);
    if (at > 0) items = items.filter(i => String(i.values[k] ?? '') === v);
  }
  if (when !== 'all' && col.dateField) {
    items = items.filter(i => {
      if (!i.values[col.dateField]) return false;
      const end = itemEnd(col, i);
      return when === 'upcoming' ? end >= today : end < today;
    });
  }
  const fieldKey = sortField === '_manual' ? '' : (sortField || col.settings?.sort?.field || '');
  const dir = sortDir === 'asc' || sortDir === 'desc' ? sortDir : when === 'past' ? 'desc' : when === 'upcoming' ? 'asc' : (col.settings?.sort?.dir || 'asc');
  const f = col.fields.find(x => x.key === fieldKey);
  if (f) {
    const keyOf = it => {
      const v = it.values[f.key];
      if (f.type === 'date') return v ? `${v}T${(f.key === col.dateField && it.values.time) || '00:00'}` : null;
      if (f.type === 'number') return v === '' || v === undefined ? null : Number(v);
      if (f.type === 'select') { const o = f.options?.find(x => x.value === v); return o ? pick(site, o.label, lg) : null; }
      const t = f.type === 'richtext' ? richToText(pick(site, v, lg)) : pick(site, v, lg);
      return t || null;
    };
    const keyed = items.map((it, i) => ({ it, i, k: keyOf(it) }));
    keyed.sort((a, b) => {
      if (a.k === null && b.k === null) return a.i - b.i;
      if (a.k === null) return 1;
      if (b.k === null) return -1;
      const c = typeof a.k === 'number' ? a.k - b.k : String(a.k).localeCompare(String(b.k), lg, { sensitivity: 'base', numeric: true });
      return (dir === 'desc' ? -c : c) || a.i - b.i;
    });
    items = keyed.map(x => x.it);
  } else if (dir === 'desc' && sortField !== '_manual' && sortDir === 'desc') items = [...items].reverse();
  return limit > 0 ? items.slice(0, limit) : items;
}

/* ---------- Adresses ---------- */
export function collectionDir(site, col, lang) {
  return [lang && lang !== site.defaultLanguage ? lang : null, collectionSlug(site, col, lang)].filter(Boolean);
}
export function itemDir(site, col, item, lang) {
  return [...collectionDir(site, col, lang), item.slug];
}
export const hasDetail = col => col?.settings?.detail !== false;
export function listPageId(site, col) {
  if (col.settings?.listPage && site.pages.some(p => p.id === col.settings.listPage)) return col.settings.listPage;
  return site.pages.find(p => p.slug && p.slug === col.slug)?.id || '';
}

/* ---------- Dates ---------- */
const LOCALES = { fr: 'fr-BE', nl: 'nl-BE', de: 'de-BE', en: 'en-GB', ja: 'ja-JP' };
const toDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const STYLES = {
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  short: { day: 'numeric', month: 'short', year: 'numeric' },
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
};

export function formatDate(iso, lang, style = 'long') {
  if (!validDate(iso)) return '';
  return new Intl.DateTimeFormat(LOCALES[lang] || 'fr-BE', { ...(STYLES[style] || STYLES.long), timeZone: 'UTC' }).format(toDate(iso));
}

/* « mardi 3 novembre 2026 · 19:00 », « 3–5 novembre 2026 » */
export function whenText(values, lang, { date = 'date', time = 'time', endDate = 'endDate', endTime = 'endTime' } = {}) {
  const d = values?.[date];
  if (!validDate(d)) return '';
  const e = values?.[endDate];
  let out;
  if (validDate(e) && e > d) out = new Intl.DateTimeFormat(LOCALES[lang] || 'fr-BE', { ...STYLES.long, timeZone: 'UTC' }).formatRange(toDate(d), toDate(e));
  else out = formatDate(d, lang, 'full');
  const t = values?.[time];
  if (t) out += ` · ${t}${values?.[endTime] && !(validDate(e) && e > d) ? ` – ${values[endTime]}` : ''}`;
  return out;
}

/* ---------- Valeurs affichées et liaisons ---------- */
const VIRTUAL = {
  '@url': { label: __('Page de l’élément'), target: 'url' },
  '@list': { label: __('Page de la liste'), target: 'url' },
  '@ics': { label: __('Fichier agenda (.ics)'), target: 'url', events: true },
  '@when': { label: __('Date et heure (agenda)'), target: 'text', events: true }
};
const isEvents = col => col.kind === 'events' && col.fields.some(f => f.key === 'date');

/* Texte affichable d'un champ (sans HTML, sauf `html` pour le texte riche) */
export function displayValue(site, col, item, key, lang, { format = 'long', html = false } = {}) {
  if (key === '@when') return whenText(item.values, lang);
  const f = col.fields.find(x => x.key === key);
  if (!f) return '';
  const raw = item.values[key];
  switch (f.type) {
    case 'text': return pick(site, raw, lang);
    case 'richtext': return html ? pick(site, raw, lang) : richToText(pick(site, raw, lang));
    case 'date': return formatDate(raw, lang, format);
    case 'time': case 'url': case 'email': return String(raw || '');
    case 'number': return raw === '' || raw === undefined ? '' : String(raw);
    case 'select': { const o = (f.options || []).find(x => x.value === raw); return o ? pick(site, o.label, lang) : ''; }
    default: return '';
  }
}

export function optionOf(col, key, value) {
  return col.fields.find(f => f.key === key)?.options?.find(o => o.value === value) || null;
}

function boundValue(site, col, item, key, target, lang) {
  if (key === '@url') return hasDetail(col) && item.status === 'published' ? `item:${col.id}:${item.id}` : '';
  if (key === '@list') { const p = listPageId(site, col); return p ? `page:${p}` : ''; }
  if (key === '@ics') return hasDetail(col) && isEvents(col) && item.values.date ? `item:${col.id}:${item.id}/event.ics` : '';
  const f = key === '@when' ? { type: 'text' } : col.fields.find(x => x.key === key);
  if (!f) return '';
  const raw = item.values[key];
  if (target === 'image') return f.type === 'image' ? String(raw || '') : '';
  if (target === 'url') return f.type === 'url' ? String(raw || '') : f.type === 'email' && raw ? `mailto:${raw}` : '';
  const text = displayValue(site, col, item, key, lang);
  if (target === 'richtext') return f.type === 'richtext' ? sanitizeRich(pick(site, raw, lang)) : text ? `<p>${escapeHtml(text)}</p>` : '';
  if (target === 'inline') return escapeHtml(text);
  return text;
}

const TEXT_SOURCES = new Set(['text', 'richtext', 'date', 'time', 'number', 'select', 'email', 'url']);

export function bindableFields(col, propField) {
  const t = propField?.type;
  const virt = Object.entries(VIRTUAL).filter(([, v]) => (!v.events || isEvents(col))).map(([key, v]) => ({ key, label: v.label, virtual: true, target: v.target }));
  if (t === 'image') return col.fields.filter(f => f.type === 'image').map(f => ({ key: f.key, label: f.label }));
  if (t === 'url') return [...virt.filter(v => v.target === 'url'), ...col.fields.filter(f => f.type === 'url' || f.type === 'email').map(f => ({ key: f.key, label: f.label }))];
  if (t === 'inline' || t === 'text' || t === 'richtext') return [...col.fields.filter(f => TEXT_SOURCES.has(f.type) && !(t !== 'richtext' && false)).map(f => ({ key: f.key, label: f.label })), ...virt.filter(v => v.target === 'text')];
  return [];
}

export function fieldLabel(col, key) {
  return VIRTUAL[key]?.label || col.fields.find(f => f.key === key)?.label || key;
}

/* Contenus dont l'absence masque le widget (une image sans image, un bouton sans lien…) */
const PRIMARY = { image: ['src'], button: ['link', 'label'], heading: ['text'], text: ['content'], card: ['title'], 'icon-box': ['title'], quote: ['text'] };

export function bindProps(site, node, item, col, lang) {
  const out = { ...(node.props || {}) };
  let empty = false;
  for (const [prop, key] of Object.entries(node.bind || {})) {
    const pdef = fieldDef(node.type, prop);
    if (!pdef) continue;
    const v = boundValue(site, col, item, key, pdef.type, lang);
    out[prop] = v;
    if (!v && PRIMARY[node.type]?.includes(prop)) empty = true;
  }
  Object.defineProperty(out, '__empty', { value: empty, enumerable: false });
  return out;
}

export function setBind(root, nodeId, prop, key, col) {
  const r = clone(root);
  const n = findNode(r, nodeId);
  if (!n) throw new Error(__('Élément introuvable.'));
  const pdef = fieldDef(n.type, prop);
  if (!pdef) throw new Error(__('Contenu inconnu.'));
  if (!key) {
    if (n.bind) { delete n.bind[prop]; if (!Object.keys(n.bind).length) delete n.bind; }
    return r;
  }
  if (!bindableFields(col, pdef).some(f => f.key === key)) throw new Error(__('Ce champ n’est pas compatible avec ce contenu.'));
  n.bind = { ...(n.bind || {}), [prop]: key };
  return r;
}

/* ---------- Données structurées ---------- */
export function itemJsonLd(site, col, item, lang, { url, image } = {}) {
  const title = cleanText(itemTitle(site, col, item, lang), 300);
  const desc = col.excerptField ? displayValue(site, col, item, col.excerptField, lang).slice(0, 300) : '';
  const v = item.values;
  const base = { '@context': 'https://schema.org', ...(url ? { url } : {}), ...(image ? { image } : {}), ...(desc ? { description: desc } : {}) };
  if (col.kind === 'events') {
    if (!validDate(v.date)) return null;
    const tz = siteTimezone(site);
    const start = v.time ? isoWithOffset(tz, v.date, v.time) : v.date;
    const endD = validDate(v.endDate) ? v.endDate : '';
    const end = endD ? (v.endTime ? isoWithOffset(tz, endD, v.endTime) : endD) : (v.endTime && v.time ? isoWithOffset(tz, v.date, v.endTime) : '');
    const status = { cancelled: 'EventCancelled', postponed: 'EventPostponed', rescheduled: 'EventRescheduled' }[v.status] || 'EventScheduled';
    const ev = { ...base, '@type': 'Event', name: title, startDate: start, ...(end ? { endDate: end } : {}), eventStatus: `https://schema.org/${status}`, eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode' };
    if (v.place || v.address) ev.location = { '@type': 'Place', name: cleanText(v.place || v.address, 200), ...(v.address ? { address: cleanText(v.address, 300) } : {}) };
    ev.organizer = { '@type': 'Organization', name: site.name, ...(site.baseUrl ? { url: `${site.baseUrl}/` } : {}) };
    const link = safeUrl(v.link || '');
    if (/^https:\/\//i.test(link)) ev.offers = { '@type': 'Offer', url: link };
    return ev;
  }
  if (col.kind === 'news') {
    return { ...base, '@type': 'NewsArticle', headline: title.slice(0, 110), ...(validDate(v.date) ? { datePublished: v.date } : {}), ...(v.author ? { author: { '@type': 'Person', name: cleanText(v.author, 100) } } : {}), publisher: { '@type': 'Organization', name: site.name }, inLanguage: lang };
  }
  if (col.kind === 'shops') {
    const web = safeUrl(v.website || '');
    return { ...base, '@type': 'LocalBusiness', name: title, ...(/^https?:\/\//i.test(web) ? { sameAs: [web] } : {}), ...(v.address ? { address: cleanText(v.address, 300) } : {}), ...(v.phone ? { telephone: cleanText(v.phone, 40) } : {}) };
  }
  if (col.kind === 'members') {
    const web = safeUrl(v.website || '');
    return { ...base, '@type': 'Organization', name: title, ...(/^https?:\/\//i.test(web) ? { url: web, sameAs: [web] } : {}), ...(url && /^https?:\/\//i.test(web) ? { url: web } : {}), ...(v.city ? { address: { '@type': 'PostalAddress', addressLocality: cleanText(v.city, 100) } } : {}), memberOf: { '@type': 'Organization', name: site.name } };
  }
  return { ...base, '@type': 'CreativeWork', name: title, inLanguage: lang };
}

/* ---------- iCalendar (RFC 5545) ---------- */
const icsText = v => String(v ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const enc = new TextEncoder();
function fold(line) {
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const compactDate = d => d.replace(/-/g, '');
const nextDay = iso => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const stamp = now => now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const richLines = html => decodeEntities(String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h[1-6])>/gi, '\n').replace(/<[^>]*>/g, '')).replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();


export function buildIcs(site, col, items, lang, { now = new Date(), host = '', urlOf = null } = {}) {
  const evs = items.filter(i => validDate(i.values.date));
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier//Site ' + icsText(site.name) + '//' + String(lang).toUpperCase(), 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsText(`${site.name} – ${col.name}`)}`];
  /* Fuseau du site (cycle 28) : TZID + VTIMEZONE pour les fuseaux courants, sinon heures converties en UTC */
  const tz = siteTimezone(site);
  const vtz = vtimezone(tz);
  const at = (d, t) => (vtz ? `;TZID=${tz}:${compactDate(d)}T${t.replace(':', '')}00` : `:${icsUtc(tz, d, t)}`);
  if (vtz && evs.some(i => i.values.time)) lines.push(...vtz);
  const uidHost = host || (String(site.baseUrl || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')) || 'atelier.local';
  for (const it of evs) {
    const v = it.values;
    lines.push('BEGIN:VEVENT', `UID:${it.id}@${uidHost}`, `DTSTAMP:${stamp(now)}`);
    if (v.time) {
      lines.push(`DTSTART${at(v.date, v.time)}`);
      const endD = validDate(v.endDate) && v.endDate >= v.date ? v.endDate : v.date;
      if (v.endTime) lines.push(`DTEND${at(endD, v.endTime)}`);
      else if (endD !== v.date) lines.push(`DTEND${at(endD, '23:59')}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(v.date)}`);
      const endD = validDate(v.endDate) && v.endDate >= v.date ? v.endDate : v.date;
      lines.push(`DTEND;VALUE=DATE:${compactDate(nextDay(endD))}`);
    }
    lines.push(`SUMMARY:${icsText(cleanText(itemTitle(site, col, it, lang), 300))}`);
    const desc = col.excerptField ? (col.fields.find(f => f.key === col.excerptField)?.type === 'richtext' ? richLines(pick(site, v[col.excerptField], lang)) : cleanText(pick(site, v[col.excerptField], lang))) : '';
    if (desc) lines.push(`DESCRIPTION:${icsText(desc.slice(0, 2000))}`);
    const loc = [v.place, v.address].filter(Boolean).map(x => cleanText(x, 300)).join(', ');
    if (loc) lines.push(`LOCATION:${icsText(loc)}`);
    if (v.status === 'cancelled') lines.push('STATUS:CANCELLED');
    else lines.push('STATUS:CONFIRMED');
    const u = urlOf ? urlOf(it) : '';
    if (u) lines.push(`URL:${u}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/* ---------- RSS 2.0 ---------- */
const xml = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\x22/g, '&quot;');
export function buildRss(site, col, lang, { now = new Date(), absolute = null, today } = {}) {
  const abs = absolute || (segs => `${String(site.baseUrl || '').replace(/\/+$/, '')}/${segs.length ? segs.join('/') + '/' : ''}`);
  const items = queryItems(site, col, { sortField: col.dateField || '', sortDir: 'desc', lang, today }).slice(0, 50);
  const listId = listPageId(site, col);
  const channelLink = abs(collectionDir(site, col, lang));
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0">', '<channel>',
    `<title>${xml(`${site.name} – ${col.name}`)}</title>`, `<link>${xml(listId ? channelLink : abs(lang === site.defaultLanguage ? [] : [lang]))}</link>`,
    `<description>${xml(`${col.name} – ${site.name}`)}</description>`, `<language>${lang}</language>`, `<lastBuildDate>${now.toUTCString()}</lastBuildDate>`];
  for (const it of items) {
    const link = hasDetail(col) ? abs(itemDir(site, col, it, lang)) : channelLink;
    const desc = col.excerptField ? displayValue(site, col, it, col.excerptField, lang) : '';
    const d = col.dateField ? it.values[col.dateField] : '';
    out.push('<item>', `<title>${xml(cleanText(itemTitle(site, col, it, lang), 300))}</title>`, `<link>${xml(link)}</link>`, `<guid isPermaLink="${hasDetail(col)}">${xml(hasDetail(col) ? link : `${it.id}@${site.baseUrl}`)}</guid>`,
      ...(validDate(d) ? [`<pubDate>${new Date(`${d}T12:00:00Z`).toUTCString()}</pubDate>`] : []), ...(desc ? [`<description>${xml(desc.slice(0, 1000))}</description>`] : []), '</item>');
  }
  out.push('</channel>', '</rss>', '');
  return out.join('\n');
}

/* ---------- CSV des éléments ---------- */
const cell = v => { const s = String(v ?? ''); return /[\x22,\n\r;]/.test(s) ? `"${s.replace(/\x22/g, '""')}"` : s; };
const colName = (f, lang) => `${['slug', 'status'].includes(f.key) ? `${f.key}_field` : f.key}${lang ? `.${lang}` : ''}`;

export function exportItemsCsv(site, id) {
  const c = need(site, id);
  const cols = [];
  for (const f of c.fields) {
    if (f.i18n) for (const l of site.languages) cols.push({ f, lang: l });
    else cols.push({ f });
  }
  const lines = [['slug', 'status', ...cols.map(x => colName(x.f, x.lang))].join(',')];
  for (const it of c.items) {
    lines.push([it.slug, it.status, ...cols.map(({ f, lang }) => {
      const v = it.values[f.key];
      if (f.i18n) return typeof v === 'object' ? (v[lang] || '') : '';
      if (f.type === 'toggle') return v ? '1' : '';
      return v ?? '';
    })].map(cell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function importItemsCsv(site, id, text, parse) {
  const c = need(site, id);
  const rows = (parse || parseCsvRows)(text);
  const head = (rows.shift() || []).map(h => h.trim());
  const map = head.map(h => {
    if (h === 'slug' || h === 'status') return { special: h };
    const [name, lang] = h.split('.');
    const key = name.endsWith('_field') && ['slug_field', 'status_field'].includes(name) ? name.slice(0, -6) : name;
    const f = c.fields.find(x => x.key === key);
    if (!f) return null;
    if (f.i18n) return { f, lang: site.languages.includes(lang) ? lang : site.defaultLanguage };
    return { f };
  });
  const hasTitle = map.some(m => m?.f?.key === c.titleField);
  if (!head.includes('slug') && !hasTitle) throw new Error(__('Fichier CSV non reconnu : il faut une colonne slug ou {column}.', { column: c.titleField }));
  let s = site;
  let added = 0;
  let updated = 0;
  const errors = [];
  rows.forEach((r, ri) => {
    const line = ri + 2;
    try {
      const values = {};
      let rowSlug = '';
      let status = '';
      map.forEach((m, i) => {
        if (!m) return;
        const v = (r[i] ?? '').trim();
        if (m.special === 'slug') { rowSlug = slug(v); return; }
        if (m.special === 'status') { status = /^(draft|brouillon)$/i.test(v) ? 'draft' : v ? 'published' : ''; return; }
        if (v === '') return;
        let val = v;
        if (m.f.type === 'select') {
          const o = (m.f.options || []).find(o2 => o2.value === v || Object.values(o2.label || {}).some(l => String(l).toLowerCase() === v.toLowerCase()));
          if (!o) throw new Error(__('Choix inconnu pour « {field} » : {value}', { field: m.f.label, value: v }));
          val = o.value;
        }
        if (m.f.type === 'toggle') val = /^(1|oui|yes|ja|true|x)$/i.test(v);
        cleanValue(m.f, val);
        if (m.f.i18n) values[m.f.key] = { ...(values[m.f.key] || {}), [m.lang]: val };
        else values[m.f.key] = val;
      });
      const col = s.collections[id];
      const existing = rowSlug ? col.items.find(i => i.slug === rowSlug) : null;
      if (existing) {
        let s2 = s;
        for (const [k, v] of Object.entries(values)) s2 = setItemValue(s2, id, existing.id, k, v);
        if (status) s2 = setItemStatus(s2, id, existing.id, status);
        s = s2;
        updated++;
      } else {
        if (!Object.keys(values).length) return;
        const r2 = addItem(s, id, values, { status: status || 'published' });
        s = r2.site;
        if (rowSlug) { try { s = setItemSlug(s, id, r2.itemId, rowSlug); } catch { /* adresse déjà prise : celle du titre est gardée */ } }
        added++;
      }
    } catch (e) { errors.push(__('Ligne {line} : {error}', { line, error: e.message })); }
  });
  return { site: s, added, updated, errors };
}

function parseCsvRows(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
    } else if (ch === '"' && cur === '') quoted = true;
    else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x !== ''));
}

/* ---------- Traductions ---------- */
export function collectionTranslatables(site) {
  const out = [];
  const itemWord = __c('item', 'Élément');
  const choiceWord = __('choix');
  for (const c of Object.values(site.collections || {})) {
    for (const it of c.items) {
      for (const f of c.fields) {
        if (!f.i18n) continue;
        out.push({ key: `ci:${c.id}:${it.id}:${f.key}`, kind: f.type === 'richtext' ? 'richtext' : 'text', label: `${c.name} · ${cleanText(itemTitle(site, c, it, site.defaultLanguage), 40) || itemWord} · ${f.label}`, collectionId: c.id, itemId: it.id, field: f.key, values: typeof it.values[f.key] === 'object' ? it.values[f.key] : {} });
      }
    }
    for (const f of c.fields) for (const o of f.options || []) out.push({ key: `co:${c.id}:${f.key}:${o.value}`, kind: 'text', label: `${c.name} · ${f.label} · ${choiceWord}`, collectionId: c.id, field: f.key, values: o.label || {} });
  }
  return out;
}

export function setCollectionTranslation(site, key, lang, value) {
  const [kind, colId, a, b] = String(key).split(':');
  const c = site.collections?.[colId];
  const missing = () => new Error(__('Texte introuvable : {key}', { key }));
  if (!c) throw missing();
  if (kind === 'ci') {
    const f = c.fields.find(x => x.key === b);
    if (!f?.i18n || !findItem(c, a)) throw missing();
    return setItemValue(site, colId, a, b, value, lang);
  }
  if (kind === 'co') {
    const f = c.fields.find(x => x.key === a);
    const o = f?.options?.find(x => x.value === b);
    if (!o) throw missing();
    const s = cloneSite(site);
    const o2 = s.collections[colId].fields.find(x => x.key === a).options.find(x => x.value === b);
    o2.label = { ...(o2.label || {}), [lang]: cleanText(value, 60) };
    return s;
  }
  throw missing();
}

/* ---------- Création assistée (collection + page de liste + exemples) ---------- */
const addDays = (iso, n) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/*
 * Exemples d'un type de collection (cycle 28) : par domaine (association, tourism, shop, merchants, event ; voir
 * core/collection-examples.js), textes dans les cinq langues, dates calculées depuis aujourd'hui.
 */
export function exampleValues(kind, today = localToday(), { domain } = {}) {
  return examplesFor(kind, domain).map(({ days, endDays, ...v }) => ({
    ...v, ...(days !== undefined ? { date: addDays(today, days) } : {}), ...(endDays !== undefined ? { endDate: addDays(today, endDays) } : {})
  }));
}

/* Valeurs d'exemple posées sous les langues voulues (textes traduisibles) ou la langue principale (champs simples) */
function exampleFor(c, v, langs) {
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    const f = c.fields.find(ff => ff.key === k);
    if (!f) continue;
    if (!x || typeof x !== 'object') out[k] = x;
    else out[k] = f.i18n ? Object.fromEntries(langs.map(l => [l, x[l] ?? x.fr])) : (x[langs[0]] ?? x.fr);
  }
  return out;
}

/* { domain } : exemples du domaine ; { langs } : langues où poser les exemples (défaut : la langue principale) */
export function createCollectionWithPage(site, { kind = 'custom', name, withPage = true, examples = true, today, domain, langs } = {}) {
  let { site: s, id } = createCollection(site, { kind, name });
  const c = s.collections[id];
  const lang = s.defaultLanguage;
  const want = [lang, ...(langs || []).filter(l => l !== lang && s.languages.includes(l))];
  if (examples) for (const v of exampleValues(kind, today, { domain })) s = addItem(s, id, exampleFor(c, v, want)).site;
  let pageId = '';
  if (withPage) {
    const col = s.collections[id];
    let pslug = col.slug;
    for (let n = 2; s.pages.some(p => p.slug === pslug); n++) pslug = `${col.slug}-${n}`;
    const page = createNode('page');
    const sec = createSectionWithColumns(1);
    const cell0 = sec.children[0].children[0];
    const h1 = createNode('heading');
    h1.props.text = { [lang]: escapeHtml(col.name) };
    h1.props.level = 'h1';
    const list = createNode('collection-list');
    list.props.collection = id;
    if (kind === 'events') list.props.when = 'upcoming';
    list.style.desktop.marginTop = 'space:s';
    cell0.children = [h1, list];
    page.children = [sec];
    pageId = 'p_' + rand();
    s = cloneSite(s);
    s.pages.push({ id: pageId, slug: pslug, title: { [lang]: col.name }, seo: { description: {} }, root: page });
    if (pslug !== col.slug) s = setCollectionMeta(s, id, { slug: pslug });
    s.collections[id].settings.listPage = pageId;
    if (Array.isArray(s.menu)) s.menu.push({ id: 'm_' + rand().slice(0, 7), kind: 'page', pageId, label: {}, newTab: false, children: [] });
  }
  return { site: s, id, pageId };
}

/* ---------- Validation ---------- */
export function validateCollections(site, { canContain, registry } = {}) {
  const errors = [];
  const seen = new Map();
  for (const c of Object.values(site.collections || {})) {
    if (!SLUG_RE.test(c.slug || '') || RESERVED.has(c.slug)) errors.push(__('Adresse de collection invalide : « {slug} » ({collection})', { slug: c.slug, collection: c.name }));
    for (const lang of site.languages || []) {
      const sl = collectionSlug(site, c, lang);
      const k = `${lang}|${sl}`;
      if (seen.has(k)) errors.push(lang === site.defaultLanguage ? __('Adresse de collection en double : « {slug} »', { slug: sl }) : __('Adresse de collection en double en {lang} : « {slug} »', { slug: sl, lang: lang.toUpperCase() }));
      seen.set(k, c.id);
    }
    const slugs = new Set();
    for (const it of c.items || []) {
      if (!SLUG_RE.test(it.slug || '')) errors.push(__('{collection} : adresse d’élément invalide « {slug} »', { collection: c.name, slug: it.slug }));
      if (slugs.has(it.slug)) errors.push(__('{collection} : adresse d’élément en double « {slug} »', { collection: c.name, slug: it.slug }));
      slugs.add(it.slug);
    }
    if (!c.fields?.some(f => f.key === c.titleField)) errors.push(__('{collection} : champ titre manquant.', { collection: c.name }));
    if (c.card?.type !== 'column') errors.push(__('{collection} : la carte doit être une colonne.', { collection: c.name }));
    if (c.detail?.type !== 'page') errors.push(__('{collection} : la page de détail n’a pas de racine.', { collection: c.name }));
    for (const [what, root] of [[__('carte'), c.card], [__('page de détail'), c.detail]]) {
      if (!root) continue;
      walk(root, (n, parent) => {
        if (registry && !registry[n.type]) errors.push(__('{collection} ({what}) : type inconnu {type}', { collection: c.name, what, type: n.type }));
        else if (parent && canContain && !canContain(root, parent.id, n.type)) errors.push(__('{collection} ({what}) : « {type} » mal placé dans « {parent} »', { collection: c.name, what, type: n.type, parent: parent.type }));
        return true;
      });
    }
  }
  return errors;
}
