import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, walk, findNode } from '../core/tree.js';
import { createSite, updatePageRoot, addPage, normalizeSite, validateSite, missingTranslations } from '../core/site.js';
import { customizeMenu } from '../core/menu.js';
import { renderPage, renderSite, resolveLink } from '../core/render.js';
import { editRoot, applyEditRoot } from '../core/components.js';
import { translatableItems, setTranslation, exportCsv, importCsv } from '../core/i18n.js';
import { diffSites, describeDiff } from '../core/versions.js';
import { auditSite } from '../core/audit.js';
import { PUBLISH_VERSION, buildPublishPhp, filesForServer } from '../core/publish.js';
import {
  createCollection, createCollectionWithPage, setCollectionMeta, deleteCollection,
  addField, updateField, removeField, setFieldOptions,
  addItem, setItemValue, setItemSlug, setItemStatus, moveItem, duplicateItem, removeItem,
  queryItems, itemDir, formatDate, whenText, bindProps, bindableFields, setBind,
  buildIcs, buildRss, exportItemsCsv, importItemsCsv, itemTitle
} from '../core/collections.js';

const TODAY = '2026-10-29';

function base(langs = ['fr', 'nl']) {
  let s = normalizeSite(createSite({ name: 'MAB', languages: langs }));
  const r = createCollection(s, { kind: 'events', name: 'Agenda' });
  s = r.site;
  const col = () => s.collections[r.id];
  const add = (values) => { const x = addItem(s, r.id, values); s = x.site; return x.itemId; };
  return { get site() { return s; }, set site(v) { s = v; }, id: r.id, col, add };
}

function listPage(s, colId, props = {}) {
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const list = createNode('collection-list');
  Object.assign(list.props, { collection: colId }, props);
  root = insertNode(root, sec.children[0].children[0].id, list);
  return { site: updatePageRoot(s, s.pages[0].id, root), list };
}

/* ---------- Modèle ---------- */
test('createCollection agenda : champs, adresse, carte et page de détail reliées', () => {
  const b = base();
  const c = b.col();
  assert.equal(c.slug, 'agenda');
  assert.equal(c.kind, 'events');
  assert.deepEqual(c.fields.map(f => f.key), ['title', 'date', 'time', 'endDate', 'endTime', 'place', 'address', 'image', 'description', 'status', 'link']);
  assert.equal(c.fields.find(f => f.key === 'title').i18n, true);
  assert.equal(c.fields.find(f => f.key === 'place').i18n, false);
  assert.equal(c.titleField, 'title');
  assert.equal(c.card.type, 'column');
  assert.equal(c.detail.type, 'page');
  const bound = [];
  walk(c.card, n => { if (n.bind) bound.push(...Object.values(n.bind)); return true; });
  assert.ok(bound.includes('title') && bound.includes('@url'), `champs reliés dans la carte : ${bound}`);
  assert.deepEqual(c.settings.sort, { field: 'date', dir: 'asc' });
});

test('les autres types : médias membres, actualités, personnalisée', () => {
  let s = normalizeSite(createSite({ languages: ['fr'] }));
  let r = createCollection(s, { kind: 'members', name: 'Médias membres' }); s = r.site;
  const m = s.collections[r.id];
  assert.equal(m.slug, 'medias-membres');
  assert.deepEqual(m.fields.map(f => f.key), ['name', 'logo', 'intro', 'type', 'city', 'website']);
  assert.equal(m.fields.find(f => f.key === 'name').i18n, false);
  assert.ok(m.fields.find(f => f.key === 'type').options.some(o => o.value === 'radio' && o.label.fr === 'Radio'));
  r = createCollection(s, { kind: 'news', name: 'Actualités' }); s = r.site;
  assert.deepEqual(s.collections[r.id].fields.map(f => f.key), ['title', 'date', 'image', 'excerpt', 'body', 'author']);
  assert.deepEqual(s.collections[r.id].settings.sort, { field: 'date', dir: 'desc' });
  r = createCollection(s, { kind: 'custom', name: 'Projets' }); s = r.site;
  assert.equal(s.collections[r.id].fields[0].key, 'title');
  assert.throws(() => createCollection(s, { kind: 'nope', name: 'X' }), /Type de collection/);
});

test('adresses de collection : uniques, sûres, réservées, traduites', () => {
  const b = base();
  const r2 = createCollection(b.site, { kind: 'events', name: 'Agenda' });
  assert.equal(r2.site.collections[r2.id].slug, 'agenda-2');
  assert.throws(() => setCollectionMeta(r2.site, r2.id, { slug: 'agenda' }), /existe déjà/);
  assert.throws(() => setCollectionMeta(b.site, b.id, { slug: 'assets' }), /réservée/);
  assert.throws(() => setCollectionMeta(b.site, b.id, { slug: 'nl' }), /réservée/);
  assert.throws(() => setCollectionMeta(b.site, b.id, { slug: '' }), /vide/);
  let s = setCollectionMeta(b.site, b.id, { slug: 'Événements à venir !' });
  assert.equal(s.collections[b.id].slug, 'evenements-a-venir');
  s = setCollectionMeta(s, b.id, { slug: 'Kalender', lang: 'nl' });
  assert.equal(s.collections[b.id].slugs.nl, 'kalender');
  s = setCollectionMeta(s, b.id, { name: '  Notre agenda  ', detail: false });
  assert.equal(s.collections[b.id].name, 'Notre agenda');
  assert.equal(s.collections[b.id].settings.detail, false);
});

test('éléments : adresse depuis le titre, unique ; valeurs assainies selon le type', () => {
  const b = base();
  const a = b.add({ title: { fr: 'Fête de la radio' } });
  const a2 = b.add({ title: { fr: 'Fête de la radio' } });
  const items = b.col().items;
  assert.equal(items.find(i => i.id === a).slug, 'fete-de-la-radio');
  assert.equal(items.find(i => i.id === a2).slug, 'fete-de-la-radio-2');
  assert.equal(items[0].status, 'published');
  let s = b.site;
  s = setItemValue(s, b.id, a, 'title', 'Concert <script>alert(1)</script>', 'fr');
  assert.equal(s.collections[b.id].items[0].values.title.fr, 'Concert alert(1)');
  s = setItemValue(s, b.id, a, 'description', '<p onclick="x()">Bonjour <strong>à tous</strong><script>y()</script></p>', 'fr');
  const d = s.collections[b.id].items[0].values.description.fr;
  assert.ok(d.includes('<strong>à tous</strong>') && !d.includes('onclick') && !d.includes('script'), d);
  s = setItemValue(s, b.id, a, 'date', '2026-11-03');
  s = setItemValue(s, b.id, a, 'time', '19:00');
  assert.throws(() => setItemValue(s, b.id, a, 'date', '03/11/2026'), /Date/);
  assert.throws(() => setItemValue(s, b.id, a, 'date', '2026-02-30'), /Date/);
  assert.throws(() => setItemValue(s, b.id, a, 'time', '25:00'), /Heure/);
  assert.throws(() => setItemValue(s, b.id, a, 'link', 'javascript:alert(1)'), /Lien/);
  assert.throws(() => setItemValue(s, b.id, a, 'image', 'http://exemple.be/a.jpg'), /Image/);
  assert.throws(() => setItemValue(s, b.id, a, 'status', 'boum'), /Choix/);
  s = setItemValue(s, b.id, a, 'status', 'cancelled');
  s = setItemValue(s, b.id, a, 'link', 'https://billets.exemple.be/fete');
  s = setItemValue(s, b.id, a, 'image', 'https://images.exemple.be/a.jpg');
  s = setItemValue(s, b.id, a, 'date', '');
  const it = s.collections[b.id].items[0].values;
  assert.equal(it.status, 'cancelled');
  assert.equal(it.time, '19:00');
  assert.equal(it.date, '');
  assert.throws(() => setItemValue(s, b.id, a, 'inconnu', 'x'), /Champ/);
});

test('éléments : adresse, statut, ordre, copie, suppression', () => {
  const b = base();
  const a = b.add({ title: { fr: 'Alpha' } });
  const z = b.add({ title: { fr: 'Zêta' } });
  let s = setItemSlug(b.site, b.id, z, 'Zêta 2026');
  assert.equal(s.collections[b.id].items[1].slug, 'zeta-2026');
  assert.throws(() => setItemSlug(s, b.id, z, 'alpha'), /existe déjà/);
  assert.throws(() => setItemSlug(s, b.id, z, '—'), /vide/);
  s = setItemStatus(s, b.id, a, 'draft');
  assert.equal(s.collections[b.id].items[0].status, 'draft');
  assert.throws(() => setItemStatus(s, b.id, a, 'secret'), /Statut/);
  s = moveItem(s, b.id, z, -1);
  assert.deepEqual(s.collections[b.id].items.map(i => i.id), [z, a]);
  const d = duplicateItem(s, b.id, z);
  const copy = d.site.collections[b.id].items[1];
  assert.notEqual(copy.id, z);
  assert.equal(copy.status, 'draft');
  assert.equal(copy.slug, 'zeta-2026-2');
  assert.equal(itemTitle(d.site, d.site.collections[b.id], copy, 'fr'), 'Zêta (copie)');
  s = removeItem(d.site, b.id, z);
  assert.equal(s.collections[b.id].items.length, 2);
});

test('champs : ajouter, renommer, options, supprimer (valeurs et liaisons nettoyées)', () => {
  const b = base();
  const a = b.add({ title: { fr: 'A' }, place: 'Namur' });
  let r = addField(b.site, b.id, { label: 'Prix d’entrée', type: 'text' });
  assert.equal(r.key, 'prix-d-entree');
  let s = r.site;
  r = addField(s, b.id, { label: 'Prix d’entrée', type: 'number' });
  assert.equal(r.key, 'prix-d-entree-2');
  s = r.site;
  assert.throws(() => addField(s, b.id, { label: 'X', type: 'html' }), /Type de champ/);
  s = updateField(s, b.id, 'prix-d-entree', { label: 'Tarif', i18n: true });
  assert.equal(s.collections[b.id].fields.find(f => f.key === 'prix-d-entree').label, 'Tarif');
  r = addField(s, b.id, { label: 'Public', type: 'select' });
  s = setFieldOptions(r.site, b.id, r.key, [{ value: 'Tout public', label: { fr: 'Tout public' } }, { value: 'enfants', label: { fr: 'Enfants', nl: 'Kinderen' } }]);
  assert.deepEqual(s.collections[b.id].fields.find(f => f.key === r.key).options.map(o => o.value), ['tout-public', 'enfants']);
  assert.throws(() => removeField(s, b.id, 'title'), /titre/);
  s = removeField(s, b.id, 'place');
  assert.ok(!('place' in s.collections[b.id].items.find(i => i.id === a).values));
  let stillBound = false;
  walk(s.collections[b.id].detail, n => { if (Object.values(n.bind || {}).includes('place')) stillBound = true; return true; });
  walk(s.collections[b.id].card, n => { if (Object.values(n.bind || {}).includes('place')) stillBound = true; if (n.props?.field === 'place') stillBound = true; return true; });
  assert.equal(stillBound, false);
});

/* ---------- Requête ---------- */
test('queryItems : brouillons exclus, tri, filtre, à venir / passés, nombre', () => {
  const b = base();
  const ids = {};
  ids.past = b.add({ title: { fr: 'Passé' }, date: '2026-09-01' });
  ids.today = b.add({ title: { fr: 'Aujourd’hui' }, date: TODAY });
  ids.long = b.add({ title: { fr: 'Festival' }, date: '2026-10-20', endDate: '2026-11-02' });
  ids.next = b.add({ title: { fr: 'Prochain' }, date: '2026-12-01', status: 'cancelled' });
  ids.draft = b.add({ title: { fr: 'Brouillon' }, date: '2026-11-15' });
  b.site = setItemStatus(b.site, b.id, ids.draft, 'draft');
  const c = b.col();
  const t = (opts) => queryItems(b.site, c, { today: TODAY, ...opts }).map(i => itemTitle(b.site, c, i, 'fr'));
  assert.deepEqual(t({}), ['Passé', 'Festival', 'Aujourd’hui', 'Prochain']);
  assert.deepEqual(t({ sortDir: 'desc' }), ['Prochain', 'Aujourd’hui', 'Festival', 'Passé']);
  assert.deepEqual(t({ when: 'upcoming' }), ['Festival', 'Aujourd’hui', 'Prochain']);
  assert.deepEqual(t({ when: 'past' }), ['Passé']);
  assert.deepEqual(t({ when: 'upcoming', limit: 2 }), ['Festival', 'Aujourd’hui']);
  assert.deepEqual(t({ filter: 'status=cancelled' }), ['Prochain']);
  assert.deepEqual(t({ sortField: 'title' }), ['Aujourd’hui', 'Festival', 'Passé', 'Prochain']);
  assert.deepEqual(t({ sortField: '_manual' }), ['Passé', 'Aujourd’hui', 'Festival', 'Prochain']);
  assert.equal(queryItems(b.site, c, { drafts: true }).length, 5);
});

test('dates lisibles par langue, période et heure', () => {
  assert.equal(formatDate('2026-11-03', 'fr'), '3 novembre 2026');
  assert.match(formatDate('2026-11-03', 'nl'), /3 november 2026/);
  assert.match(formatDate('2026-11-03', 'de'), /3\. November 2026/);
  assert.match(formatDate('2026-11-03', 'en'), /3 November 2026/);
  assert.match(formatDate('2026-11-03', 'fr', 'short'), /3 nov\.? 2026/);
  assert.equal(formatDate('', 'fr'), '');
  assert.equal(formatDate('n’importe quoi', 'fr'), '');
  assert.equal(whenText({ date: '2026-11-03', time: '19:00' }, 'fr'), 'mardi 3 novembre 2026 · 19:00');
  assert.equal(whenText({ date: '2026-11-03', time: '19:00', endTime: '22:30' }, 'fr'), 'mardi 3 novembre 2026 · 19:00 – 22:30');
  assert.match(whenText({ date: '2026-11-03', endDate: '2026-11-05' }, 'fr'), /^3\s?–\s?5 novembre 2026$/);
  assert.equal(whenText({}, 'fr'), '');
});

/* ---------- Liaisons ---------- */
test('bindProps : conversions sûres selon le type du contenu', () => {
  const b = base();
  const a = b.add({ title: { fr: 'Rock & <b>Roll</b>', nl: 'Rock NL' }, date: '2026-11-03', place: 'Namur', link: 'https://billets.exemple.be', description: { fr: '<p>Une <em>belle</em> soirée</p>' } });
  b.site = addPage(b.site, { slug: 'agenda', title: { fr: 'Agenda' } });
  const c = b.col();
  const item = c.items[0];
  const node = (type, bind) => ({ ...createNode(type), bind });
  assert.equal(bindProps(b.site, node('heading', { text: 'title' }), item, c, 'fr').text, 'Rock &amp; Roll');
  assert.equal(bindProps(b.site, node('heading', { text: 'title' }), item, c, 'nl').text, 'Rock NL');
  assert.equal(bindProps(b.site, node('heading', { text: 'date' }), item, c, 'fr').text, '3 novembre 2026');
  assert.equal(bindProps(b.site, node('text', { content: 'place' }), item, c, 'fr').content, '<p>Namur</p>');
  assert.equal(bindProps(b.site, node('text', { content: 'description' }), item, c, 'fr').content, '<p>Une <em>belle</em> soirée</p>');
  assert.equal(bindProps(b.site, node('heading', { text: 'description' }), item, c, 'fr').text, 'Une belle soirée');
  assert.equal(bindProps(b.site, node('button', { link: '@url' }), item, c, 'fr').link, `item:${c.id}:${item.id}`);
  assert.equal(bindProps(b.site, node('button', { link: 'link' }), item, c, 'fr').link, 'https://billets.exemple.be');
  assert.equal(bindProps(b.site, node('button', { link: '@list' }), item, c, 'fr').link, `page:${b.site.pages[1].id}`);
  assert.equal(bindProps(b.site, node('button', { label: '@when' }), item, c, 'fr').label, 'mardi 3 novembre 2026');
  const img = bindableFields(c, { type: 'image' }).map(f => f.key);
  assert.deepEqual(img, ['image']);
  const urls = bindableFields(c, { type: 'url' }).map(f => f.key);
  assert.ok(urls.includes('@url') && urls.includes('@list') && urls.includes('@ics') && urls.includes('link') && !urls.includes('title'));
  const texts = bindableFields(c, { type: 'inline' }).map(f => f.key);
  assert.ok(texts.includes('title') && texts.includes('date') && texts.includes('@when') && !texts.includes('image'));
  const root = c.card;
  const h = findNode(root, root.children.find(n => n.type === 'heading').id);
  assert.throws(() => setBind(root, h.id, 'text', 'image', c), /compatible/);
  const r2 = setBind(root, h.id, 'text', null, c);
  assert.ok(!findNode(r2, h.id).bind?.text);
});

test('lien interne item: → page de l’élément, dans la langue, depuis n’importe où', () => {
  const b = base();
  const a = b.add({ title: { fr: 'Fête' } });
  b.site = setCollectionMeta(b.site, b.id, { slug: 'kalender', lang: 'nl' });
  const link = `item:${b.id}:${a}`;
  assert.equal(resolveLink(b.site, link, 'fr', []), 'agenda/fete/');
  assert.equal(resolveLink(b.site, link, 'nl', ['nl']), 'kalender/fete/');
  assert.equal(resolveLink(b.site, link, 'fr', ['agenda', 'autre']), '../fete/');
  assert.equal(resolveLink(b.site, `item:${b.id}:inconnu`, 'fr', []), '#');
  assert.deepEqual(itemDir(b.site, b.col(), b.col().items[0], 'nl'), ['nl', 'kalender', 'fete']);
  b.site = setCollectionMeta(b.site, b.id, { detail: false });
  assert.equal(resolveLink(b.site, link, 'fr', []), '#');
});

/* ---------- Rendu ---------- */
test('widget Liste : cartes avec les données, liens, brouillons absents, texte si vide', () => {
  const b = base();
  b.add({ title: { fr: 'Fête de la radio' }, date: '2026-11-03', time: '19:00', place: 'Namur' });
  const d = b.add({ title: { fr: 'Secret' }, date: '2026-11-04' });
  b.site = setItemStatus(b.site, b.id, d, 'draft');
  const { site } = listPage(b.site, b.id, { when: 'upcoming', limit: 3 });
  const html = renderPage(site, site.pages[0], 'fr', { today: TODAY });
  assert.ok(html.includes('Fête de la radio'), 'titre');
  assert.ok(html.includes('href="agenda/fete-de-la-radio/"'), 'lien vers la page de l’élément');
  assert.ok(html.includes('Namur'));
  assert.ok(!html.includes('Secret'), 'brouillon absent');
  assert.match(html, /class="cl cl--grid"[^>]*data-when="upcoming"[^>]*data-limit="3"/);
  assert.match(html, /<li class="cl__item" data-end="2026-11-03">/);
  const empty = listPage(normalizeSite(base().site), base().id);
  const { site: s2 } = listPage(createCollection(normalizeSite(createSite({ languages: ['fr'] })), { kind: 'events', name: 'Agenda' }).site, 'x');
  assert.ok(!renderPage(s2, s2.pages[0], 'fr').includes('cl__item'));
  const b3 = base();
  const { site: s3 } = listPage(b3.site, b3.id, { empty: { fr: 'Rien de prévu pour l’instant.' } });
  assert.ok(renderPage(s3, s3.pages[0], 'fr').includes('Rien de prévu pour l’instant.'));
  void empty;
});

test('liste « à venir » : les événements en trop sont masqués, le script recalcule chez le visiteur', () => {
  const b = base();
  for (let i = 1; i <= 5; i++) b.add({ title: { fr: `Événement ${i}` }, date: `2026-11-0${i}` });
  b.add({ title: { fr: 'Ancien' }, date: '2026-01-01' });
  const { site } = listPage(b.site, b.id, { when: 'upcoming', limit: 3 });
  const html = renderPage(site, site.pages[0], 'fr', { today: TODAY });
  const lis = html.match(/<li class="cl__item"[^>]*>/g);
  assert.equal(lis.length, 6, 'tous les événements datés sont dans la page');
  assert.equal(lis.filter(l => l.includes(' hidden')).length, 3, 'un passé + deux en trop masqués');
  assert.ok(html.indexOf('Événement 1') < html.indexOf('Événement 2'));
  const { files } = renderSite(site, { today: TODAY });
  assert.ok(files.has('site.js') && files.get('site.js').includes('data-when'), 'script publié');
  assert.ok(files.get('index.html').includes('site.js'));
});

test('carte : éléments vides masqués (bouton sans lien, image absente)', () => {
  const b = base();
  b.add({ title: { fr: 'Sans image' }, date: '2026-11-03' });
  const { site } = listPage(b.site, b.id);
  const html = renderPage(site, site.pages[0], 'fr', { today: TODAY });
  const card = html.slice(html.indexOf('<li class="cl__item"'), html.indexOf('</li>'));
  assert.ok(!card.includes('<img'), 'pas d’image vide');
  assert.ok(!card.includes('img-empty'));
});

test('pages de détail : une par élément publié et par langue, SEO, données structurées Event', () => {
  const b = base();
  b.site = { ...b.site, baseUrl: 'https://www.exemple.be' };
  const a = b.add({ title: { fr: 'Fête de la radio', nl: 'Radiofeest' }, date: '2026-11-03', time: '19:00', place: 'Salle des fêtes', address: 'Rue Haute 1, 5000 Namur', image: 'https://images.exemple.be/f.jpg', status: 'cancelled', description: { fr: '<p>Concerts et ateliers.</p>' } });
  const d = b.add({ title: { fr: 'Secret' }, date: '2026-11-04' });
  b.site = setItemStatus(b.site, b.id, d, 'draft');
  b.site = setCollectionMeta(b.site, b.id, { slug: 'kalender', lang: 'nl' });
  const { files } = renderSite(b.site, { today: TODAY });
  assert.ok(files.has('agenda/fete-de-la-radio/index.html'));
  assert.ok(files.has('nl/kalender/fete-de-la-radio/index.html'));
  assert.ok(![...files.keys()].some(k => k.includes('secret')), 'brouillon jamais publié');
  const fr = files.get('agenda/fete-de-la-radio/index.html');
  assert.ok(fr.includes('<title>Fête de la radio – MAB</title>'));
  assert.ok(fr.includes('<link rel="canonical" href="https://www.exemple.be/agenda/fete-de-la-radio/">'));
  assert.ok(fr.includes('hreflang="nl" href="https://www.exemple.be/nl/kalender/fete-de-la-radio/"'));
  assert.ok(fr.includes('<meta name="description" content="Concerts et ateliers.">'));
  assert.ok(fr.includes('<meta property="og:image" content="https://images.exemple.be/f.jpg">'));
  assert.ok(fr.includes('<h1'), 'titre principal');
  const ld = [...fr.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const ev = ld.find(x => x['@type'] === 'Event');
  assert.ok(ev, 'Event présent');
  assert.equal(ev.name, 'Fête de la radio');
  assert.equal(ev.startDate, '2026-11-03T19:00');
  assert.equal(ev.eventStatus, 'https://schema.org/EventCancelled');
  assert.equal(ev.location['@type'], 'Place');
  assert.equal(ev.location.name, 'Salle des fêtes');
  assert.equal(ev.location.address, 'Rue Haute 1, 5000 Namur');
  assert.equal(ev.url, 'https://www.exemple.be/agenda/fete-de-la-radio/');
  const nl = files.get('nl/kalender/fete-de-la-radio/index.html');
  assert.ok(nl.includes('<title>Radiofeest – MAB</title>') && nl.includes('lang="nl"'));
  const sm = files.get('sitemap.xml');
  assert.ok(sm.includes('https://www.exemple.be/agenda/fete-de-la-radio/') && sm.includes('https://www.exemple.be/nl/kalender/fete-de-la-radio/'));
  void a;
  b.site = setCollectionMeta(b.site, b.id, { detail: false });
  const keys = [...renderSite(b.site, { today: TODAY }).files.keys()];
  assert.ok(!keys.some(k => k.startsWith('agenda/') && k.endsWith('.html')), 'sans pages de détail');
  assert.ok(keys.includes('agenda/calendar.ics') && !keys.some(k => k.endsWith('event.ics')), 'l’agenda complet reste disponible');
});

test('données structurées : actualité (NewsArticle) et média membre (Organization)', () => {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr'], baseUrl: 'https://www.exemple.be' }));
  let r = createCollection(s, { kind: 'news', name: 'Actualités' }); s = r.site;
  s = addItem(s, r.id, { title: { fr: 'Le MAB est né' }, date: '2026-10-01', excerpt: { fr: 'Une fédération.' }, author: 'Laurent' }).site;
  const m = createCollection(s, { kind: 'members', name: 'Membres' }); s = m.site;
  s = addItem(s, m.id, { name: 'Radio Vallée', city: 'Couvin', website: 'https://radio-vallee.example', type: 'radio' }).site;
  const { files } = renderSite(s, { today: TODAY });
  const ld = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(x => JSON.parse(x[1]));
  const art = ld(files.get('actualites/le-mab-est-ne/index.html')).find(x => x['@type'] === 'NewsArticle');
  assert.equal(art.headline, 'Le MAB est né');
  assert.equal(art.datePublished, '2026-10-01');
  assert.equal(art.author.name, 'Laurent');
  const org = ld(files.get('membres/radio-vallee/index.html')).find(x => x['@type'] === 'Organization');
  assert.equal(org.name, 'Radio Vallée');
  assert.equal(org.url, 'https://radio-vallee.example');
  assert.equal(org.address.addressLocality, 'Couvin');
});

test('liste sur une page de détail : la carte ne s’inclut pas elle-même à l’infini', () => {
  const b = base();
  b.add({ title: { fr: 'A' }, date: '2026-11-03' });
  const c = b.col();
  const list = createNode('collection-list');
  list.props.collection = b.id;
  const card = structuredClone(c.card);
  card.children.push(list);
  b.site = { ...b.site, collections: { ...b.site.collections, [b.id]: { ...c, card } } };
  const { site } = listPage(b.site, b.id);
  const html = renderPage(site, site.pages[0], 'fr', { today: TODAY });
  assert.ok(html.length < 200000);
});

/* ---------- iCal ---------- */
test('buildIcs : RFC 5545 (CRLF, échappement, repli à 75 octets, fuseau, journée entière)', () => {
  const b = base();
  b.add({ title: { fr: 'Concert, rock; et \\ jazz' }, date: '2026-11-03', time: '19:00', endTime: '22:30', place: 'Salle', address: 'Rue Haute 1, Namur', description: { fr: '<p>Ligne 1</p><p>Ligne 2</p>' } });
  b.add({ title: { fr: 'Festival des médias libres et indépendants de Wallonie et de Bruxelles, édition 2026' }, date: '2026-11-07', endDate: '2026-11-08' });
  const c = b.col();
  const ics = buildIcs(b.site, c, c.items, 'fr', { now: new Date('2026-10-29T08:00:00Z'), host: 'www.exemple.be' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'uniquement CRLF');
  assert.ok(ics.includes('BEGIN:VTIMEZONE\r\nTZID:Europe/Brussels'));
  assert.ok(ics.includes('DTSTART;TZID=Europe/Brussels:20261103T190000'));
  assert.ok(ics.includes('DTEND;TZID=Europe/Brussels:20261103T223000'));
  assert.ok(ics.includes('SUMMARY:Concert\\, rock\\; et \\\\ jazz'));
  assert.ok(ics.includes('DESCRIPTION:Ligne 1\\nLigne 2'));
  assert.ok(ics.includes('LOCATION:Salle\\, Rue Haute 1\\, Namur'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261107'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20261109'), 'fin exclusive le lendemain');
  assert.ok(ics.includes(`UID:${c.items[0].id}@www.exemple.be`));
  assert.ok(ics.includes('DTSTAMP:20261029T080000Z'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `ligne trop longue : ${line}`);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('SUMMARY:Festival des médias libres et indépendants de Wallonie et de Bruxelles\\, édition 2026'));
  const { files } = renderSite(b.site, { today: TODAY });
  assert.ok(files.has('agenda/calendar.ics'), 'agenda complet');
  assert.ok(files.has('agenda/concert-rock-et-jazz/event.ics'), 'un fichier par événement');
  assert.ok(files.has('nl/agenda/concert-rock-et-jazz/event.ics'));
});

/* ---------- RSS ---------- */
test('buildRss : flux par langue pour les actualités, annoncé dans les pages', () => {
  let s = normalizeSite(createSite({ name: 'MAB & Co', languages: ['fr', 'nl'], baseUrl: 'https://www.exemple.be' }));
  const r = createCollection(s, { kind: 'news', name: 'Actualités' }); s = r.site;
  s = addItem(s, r.id, { title: { fr: 'Premier & <b>dernier</b>', nl: 'Eerste' }, date: '2026-09-01', excerpt: { fr: 'Résumé & suite' } }).site;
  s = addItem(s, r.id, { title: { fr: 'Second' }, date: '2026-10-01' }).site;
  const rss = buildRss(s, s.collections[r.id], 'fr', { now: new Date('2026-10-29T08:00:00Z') });
  assert.ok(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"'));
  assert.ok(rss.includes('<title>MAB &amp; Co – Actualités</title>'));
  assert.ok(rss.includes('<language>fr</language>'));
  assert.ok(rss.indexOf('Second') < rss.indexOf('Premier'), 'plus récent d’abord');
  assert.ok(rss.includes('<title>Premier &amp; dernier</title>'), 'balises retirées, & échappé');
  assert.ok(rss.includes('<link>https://www.exemple.be/actualites/premier-dernier/</link>'));
  assert.ok(rss.includes('<pubDate>Tue, 01 Sep 2026 12:00:00 GMT</pubDate>'));
  assert.ok(rss.includes('<description>Résumé &amp; suite</description>'));
  const { files } = renderSite(s, { today: TODAY });
  assert.ok(files.has('actualites/feed.xml') && files.has('nl/actualites/feed.xml'));
  assert.ok(files.get('nl/actualites/feed.xml').includes('<title>Eerste</title>'));
  assert.ok(files.get('index.html').includes('<link rel="alternate" type="application/rss+xml" title="MAB &amp; Co – Actualités" href="actualites/feed.xml">'));
  const noBase = renderSite({ ...s, baseUrl: '' }, { today: TODAY }).files;
  assert.ok(!noBase.has('actualites/feed.xml'), 'pas de flux sans adresse du site');
});

/* ---------- Widget Champ ---------- */
test('widget Champ : icône, libellé, valeur ; rien si vide ou valeur discrète', () => {
  const b = base();
  b.add({ title: { fr: 'A' }, date: '2026-11-03', place: 'Namur', status: 'scheduled' });
  const c = b.col();
  const f = createNode('item-field');
  Object.assign(f.props, { field: 'place', label: { fr: 'Lieu :' }, icon: 'pin' });
  const card = { ...structuredClone(c.card), children: [f] };
  const f2 = createNode('item-field'); f2.props.field = 'status';
  const f3 = createNode('item-field'); f3.props.field = 'endDate';
  card.children.push(f2, f3);
  b.site = { ...b.site, collections: { ...b.site.collections, [b.id]: { ...c, card } } };
  const { site } = listPage(b.site, b.id);
  const html = renderPage(site, site.pages[0], 'fr', { today: TODAY });
  assert.match(html, /<p class="fld"><span class="fld__icon" aria-hidden="true"><svg[^]*?<\/span><span class="fld__label">Lieu :<\/span> <span class="fld__value">Namur<\/span><\/p>/);
  assert.equal((html.match(/class="fld"/g) || []).length, 1, 'statut « prévu » et date de fin vide : rien');
});

/* ---------- Traductions ---------- */
test('traductions : textes des éléments, choix et modèles dans l’inventaire, à traduire, CSV', () => {
  const b = base(['fr', 'nl']);
  const a = b.add({ title: { fr: 'Fête' }, place: 'Namur', description: { fr: '<p>Texte</p>' } });
  const c = b.col();
  const items = translatableItems(b.site);
  const keys = items.map(i => i.key);
  assert.ok(keys.includes(`ci:${b.id}:${a}:title`));
  assert.ok(keys.includes(`ci:${b.id}:${a}:description`));
  assert.ok(!keys.includes(`ci:${b.id}:${a}:place`), 'champ non traduisible');
  assert.ok(keys.includes(`co:${b.id}:status:cancelled`));
  const btn = [];
  walk(c.detail, n => { if (n.type === 'button' && !n.bind?.label) btn.push(n); return true; });
  assert.ok(btn.length, 'un bouton à texte fixe dans la page de détail');
  assert.ok(keys.includes(`n:d:${b.id}:${btn[0].id}:label`));
  const head = []; walk(c.card, n => { if (n.type === 'heading') head.push(n); return true; });
  assert.ok(!keys.includes(`n:k:${b.id}:${head[0].id}:text`), 'texte relié : pas à traduire');
  const missing = missingTranslations(b.site).filter(m => m.lang === 'nl').map(m => m.key);
  assert.ok(missing.includes(`ci:${b.id}:${a}:title`));
  let s = setTranslation(b.site, `ci:${b.id}:${a}:title`, 'nl', 'Feest <b>x</b>');
  assert.equal(s.collections[b.id].items[0].values.title.nl, 'Feest x');
  s = setTranslation(s, `ci:${b.id}:${a}:description`, 'nl', '<p onclick="x">Tekst</p>');
  assert.equal(s.collections[b.id].items[0].values.description.nl, '<p>Tekst</p>');
  s = setTranslation(s, `co:${b.id}:status:cancelled`, 'nl', 'Geannuleerd');
  assert.equal(s.collections[b.id].fields.find(f => f.key === 'status').options.find(o => o.value === 'cancelled').label.nl, 'Geannuleerd');
  s = setTranslation(s, `n:d:${b.id}:${btn[0].id}:label`, 'nl', 'Inschrijven');
  let found = null; walk(s.collections[b.id].detail, n => { if (n.id === btn[0].id) found = n; return true; });
  assert.equal(found.props.label.nl, 'Inschrijven');
  const csv = exportCsv(s);
  assert.ok(csv.includes(`ci:${b.id}:${a}:title`));
  const back = importCsv(b.site, csv);
  assert.equal(back.site.collections[b.id].items[0].values.title.nl, 'Feest x');
  assert.throws(() => setTranslation(s, `ci:${b.id}:${a}:place`, 'nl', 'x'), /introuvable/);
});

/* ---------- Édition des modèles ---------- */
test('édition ciblée de la carte et de la page de détail', () => {
  const b = base();
  const r = editRoot(b.site, { kind: 'card', id: b.id });
  assert.equal(r.type, 'page');
  assert.equal(r.children[0].type, 'column');
  const extra = createNode('divider');
  const r2 = { ...r, children: [{ ...r.children[0], children: [...r.children[0].children, extra] }] };
  let s = applyEditRoot(b.site, { kind: 'card', id: b.id }, r2);
  assert.ok(s.collections[b.id].card.children.some(n => n.id === extra.id));
  const d = editRoot(s, { kind: 'detail', id: b.id });
  assert.equal(d.type, 'page');
  const sec = createSectionWithColumns(1);
  s = applyEditRoot(s, { kind: 'detail', id: b.id }, { ...d, children: [...d.children, sec] });
  assert.equal(s.collections[b.id].detail.children.length, d.children.length + 1);
  assert.throws(() => applyEditRoot(s, { kind: 'card', id: b.id }, { ...r, children: [] }), /vide/);
  assert.equal(editRoot(s, { kind: 'card', id: 'inconnu' }), null);
});

/* ---------- Création avec page ---------- */
test('createCollectionWithPage : page de liste, menu, exemples', () => {
  let s = normalizeSite(createSite({ languages: ['fr', 'nl'] }));
  const r = createCollectionWithPage(s, { kind: 'members', name: 'Médias membres', withPage: true, examples: true });
  s = r.site;
  const p = s.pages.find(x => x.id === r.pageId);
  assert.equal(p.slug, 'medias-membres');
  let list = null; walk(p.root, n => { if (n.type === 'collection-list') list = n; return !list; });
  assert.equal(list.props.collection, r.id);
  assert.equal(s.collections[r.id].items.length, 3);
  assert.equal(s.collections[r.id].settings.listPage, r.pageId);
  assert.ok(validateSite(s).ok, validateSite(s).errors.join(' / '));
  let s2 = customizeMenu(normalizeSite(createSite({ languages: ['fr'] })));
  const r2 = createCollectionWithPage(s2, { kind: 'events', name: 'Agenda', withPage: true, examples: false });
  assert.ok(r2.site.menu.some(m => m.pageId === r2.pageId), 'ajoutée au menu personnalisé');
  assert.equal(r2.site.collections[r2.id].items.length, 0);
  const r3 = createCollectionWithPage(r2.site, { kind: 'events', name: 'Agenda', withPage: true });
  assert.equal(r3.site.pages.find(x => x.id === r3.pageId).slug, r3.site.collections[r3.id].slug, 'page et collection gardent la même adresse');
});

/* ---------- Validation, audit, versions ---------- */
test('validateSite : adresses d’éléments en double, adresse de collection invalide, modèle invalide', () => {
  const b = base();
  b.add({ title: { fr: 'A' } });
  b.add({ title: { fr: 'B' } });
  const c = structuredClone(b.col());
  c.items[1].slug = c.items[0].slug;
  let s = { ...b.site, collections: { ...b.site.collections, [b.id]: c } };
  assert.ok(validateSite(s).errors.some(e => /en double/.test(e) && /Agenda/.test(e)));
  const c2 = structuredClone(b.col()); c2.slug = '../x';
  s = { ...b.site, collections: { [b.id]: c2 } };
  assert.ok(validateSite(s).errors.some(e => /Adresse de collection invalide/.test(e)));
  const c3 = structuredClone(b.col()); c3.card.children.push(createNode('section'));
  s = { ...b.site, collections: { [b.id]: c3 } };
  assert.ok(validateSite(s).errors.some(e => /mal placé/.test(e)));
  assert.ok(validateSite(b.site).ok);
});

test('auditSite : liste sans collection, collection vide, événement sans date ni lieu', () => {
  const b = base();
  b.add({ title: { fr: 'Sans date' } });
  const { site, list } = listPage(b.site, 'disparue');
  const a = auditSite(site);
  assert.ok(a.warnings.some(w => w.nodeId === list.id && /collection/.test(w.message)));
  assert.ok(a.warnings.some(w => /Sans date/.test(w.message) && /date/.test(w.message)));
  const r = createCollection(site, { kind: 'news', name: 'Actus' });
  assert.ok(auditSite(r.site).info.some(i => /Actus/.test(i.message) && /aucun élément publié/.test(i.message)));
});

test('versions : les collections modifiées apparaissent dans la comparaison', () => {
  const b = base();
  const before = b.site;
  b.add({ title: { fr: 'Nouveau' } });
  const d = diffSites(before, b.site);
  assert.equal(d.identical, false);
  assert.deepEqual(d.collectionsChanged, ['Agenda']);
  assert.match(describeDiff(d), /contenus différents : Agenda/);
  const del = deleteCollection(b.site, b.id);
  assert.deepEqual(diffSites(b.site, del).collectionsRemoved, ['Agenda']);
});

/* ---------- CSV des éléments ---------- */
test('CSV des éléments : export, import (mise à jour par adresse, ajout, choix par libellé, erreurs)', () => {
  const b = base(['fr', 'nl']);
  b.add({ title: { fr: 'Fête', nl: 'Feest' }, date: '2026-11-03', place: 'Namur', status: 'scheduled' });
  const csv = exportItemsCsv(b.site, b.id);
  const head = csv.replace(/^﻿/, '').split('\r\n')[0];
  assert.equal(head, 'slug,status,title.fr,title.nl,date,time,endDate,endTime,place,address,image,description.fr,description.nl,status_field,link');
  const input = '﻿slug;title.fr;date;place;status_field\r\nfete;Grande fête;2026-11-04;Liège;Annulé\r\n;Atelier vidéo;2026-12-01;Couvin;\r\n;Mauvaise date;01/12/2026;;\r\n';
  const r = importItemsCsv(b.site, b.id, input);
  assert.equal(r.updated, 1);
  assert.equal(r.added, 1);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /ligne 4.*Date/i);
  const items = r.site.collections[b.id].items;
  assert.equal(items[0].values.title.fr, 'Grande fête');
  assert.equal(items[0].values.title.nl, 'Feest', 'les autres langues sont gardées');
  assert.equal(items[0].values.status, 'cancelled');
  assert.equal(items[1].slug, 'atelier-video');
  assert.equal(items[1].values.place, 'Couvin');
  assert.throws(() => importItemsCsv(b.site, b.id, 'a,b\r\n1,2\r\n'), /colonne/);
});

/* ---------- Sécurité du rendu ---------- */
test('rendu : valeurs hostiles neutralisées partout (carte, détail, JSON-LD, iCal)', () => {
  const b = base();
  b.site = { ...b.site, baseUrl: 'https://www.exemple.be' };
  const a = b.add({ title: { fr: '"><img src=x onerror=alert(1)></script>' }, date: '2026-11-03', place: '<svg onload=alert(2)>' });
  const c = b.col();
  const raw = structuredClone(c);
  raw.items[0].values.link = 'javascript:alert(3)';
  b.site = { ...b.site, collections: { [b.id]: raw } };
  const { site } = listPage(b.site, b.id);
  const { files } = renderSite(site, { today: TODAY });
  for (const [path, content] of files) {
    if (typeof content !== 'string') continue;
    assert.ok(!/<img src=x/i.test(content), `${path} : balise injectée`);
    assert.ok(!/<svg onload/i.test(content), `${path} : svg injecté`);
    assert.ok(!/javascript:/i.test(content), `${path} : lien javascript`);
    assert.ok(!/<\/script><img/i.test(content), `${path} : sortie du JSON-LD`);
  }
  void a;
});

test('images des éléments publiées ; assets inutilisés absents', () => {
  const b = base();
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  b.site = { ...b.site, assets: { img_a: { file: 'affiche.png', mime: 'image/png', dataUrl: png }, img_b: { file: 'autre.png', mime: 'image/png', dataUrl: png } } };
  b.add({ title: { fr: 'A' }, image: 'asset:img_a' });
  const { files } = renderSite(b.site, { today: TODAY });
  assert.ok(files.has('assets/affiche.png'));
  assert.ok(!files.has('assets/autre.png'));
  assert.ok(files.get('agenda/a/index.html').includes('src="../../assets/affiche.png"'));
});

/* ---------- Publication ---------- */
test('publish.php version 2 accepte .ics ; un serveur en version 1 reçoit le site sans .ics', () => {
  assert.ok(Number(PUBLISH_VERSION) >= 2);
  const php = buildPublishPhp({ tokenHash: 'a'.repeat(64) });
  assert.match(php, /'ics'/);
  const files = new Map([['index.html', 'x'], ['agenda/calendar.ics', 'y'], ['agenda/a/event.ics', 'z']]);
  const r1 = filesForServer(files, '1');
  assert.deepEqual([...r1.files.keys()], ['index.html']);
  assert.equal(r1.skipped.length, 2);
  const r2 = filesForServer(files, '2');
  assert.equal(r2.files.size, 3);
  assert.equal(r2.skipped.length, 0);
});

test('normalizeSite : collections vides pour un ancien projet ; suppression d’une collection', () => {
  const old = createSite({ languages: ['fr'] });
  delete old.collections;
  assert.deepEqual(normalizeSite(old).collections, {});
  const b = base();
  const { site } = listPage(b.site, b.id);
  const s = deleteCollection(site, b.id);
  assert.ok(!s.collections[b.id]);
  assert.ok(!renderPage(s, s.pages[0], 'fr').includes('cl__item'));
  assert.ok(renderPage(s, s.pages[0], 'fr', { canvas: true }).includes('Choisissez une collection'));
  assert.throws(() => deleteCollection(s, b.id), /introuvable/);
});
