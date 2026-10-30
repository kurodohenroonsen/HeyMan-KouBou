import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns } from '../core/tree.js';
import { createSite, updatePageRoot, addPage, normalizeSite, setPageSeo, setHeader } from '../core/site.js';
import { renderSite, renderPage } from '../core/render.js';
import { translatableItems, setTranslation } from '../core/i18n.js';
import { setSeoField, seoTitle, seoDescription, analyzePage, analyzeSite, pageText } from '../core/seo.js';
import { createCollection, addItem } from '../core/collections.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function site0({ baseUrl = 'https://www.exemple.be' } = {}) {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr', 'nl'], baseUrl }));
  s = addPage(s, { slug: 'contact', title: { fr: 'Contact', nl: 'Contact' } });
  s = { ...s, assets: { img_a: { file: 'equipe-tournage.png', mime: 'image/png', dataUrl: PNG, width: 1200, height: 630 }, img_b: { file: 'IMG_2041.png', mime: 'image/png', dataUrl: PNG } } };
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  const h1 = createNode('heading'); h1.props.level = 'h1'; h1.props.text = { fr: 'Les médias alternatifs belges', nl: 'Belgische alternatieve media' };
  const t = createNode('text'); t.props.content = { fr: '<p>Le MAB fédère les médias indépendants. <a href="https://exemple.org">Cliquez ici</a> pour en savoir plus.</p>' };
  const img = createNode('image'); img.props.src = 'asset:img_b'; img.props.alt = { fr: '' };
  const social = createNode('social'); social.props.items = [{ network: 'facebook', url: 'https://www.facebook.com/mab' }, { network: 'mastodon', url: 'https://mastodon.social/@mab' }];
  for (const n of [h1, t, img, social]) root = insertNode(root, col, n);
  s = updatePageRoot(s, s.pages[0].id, root);
  return { site: s, h1, t, img };
}

test('setSeoField : titre, description, mot-clé par langue ; image et « ne pas indexer » ; valeurs vérifiées', () => {
  let { site } = site0();
  const id = site.pages[1].id;
  site = setSeoField(site, id, 'title', 'Contactez le <b>MAB</b>', 'fr');
  site = setSeoField(site, id, 'description', 'Écrivez-nous.', 'fr');
  site = setSeoField(site, id, 'keyword', '  Médias Libres ', 'fr');
  site = setSeoField(site, id, 'image', 'asset:img_a');
  site = setSeoField(site, id, 'noindex', true);
  const p = site.pages[1];
  assert.equal(p.seo.title.fr, 'Contactez le MAB');
  assert.equal(p.seo.description.fr, 'Écrivez-nous.');
  assert.equal(p.seo.keyword.fr, 'médias libres');
  assert.equal(p.seo.image, 'asset:img_a');
  assert.equal(p.seo.noindex, true);
  assert.throws(() => setSeoField(site, id, 'image', 'javascript:alert(1)'), /Image/);
  assert.throws(() => setSeoField(site, id, 'robots', 'x'), /inconnu/);
  const kept = setPageSeo(site, id, 'Nouvelle description', 'fr');
  assert.equal(kept.pages[1].seo.title.fr, 'Contactez le MAB', 'l’ancienne fonction garde les autres réglages');
  const tr = setTranslation(site, `p:${id}:seo`, 'nl', 'Schrijf ons.');
  assert.equal(tr.pages[1].seo.keyword.fr, 'médias libres', 'la traduction garde les autres réglages');
  assert.ok(translatableItems(site).some(i => i.key === `p:${id}:seotitle`), 'le titre pour Google se traduit');
  const tr2 = setTranslation(site, `p:${id}:seotitle`, 'nl', 'Contacteer de MAB');
  assert.equal(tr2.pages[1].seo.title.nl, 'Contacteer de MAB');
});

test('titre et description effectifs : réglés, sinon automatiques (signalés)', () => {
  let { site } = site0();
  const home = site.pages[0];
  assert.equal(seoTitle(site, home, 'fr'), 'MAB');
  assert.equal(seoTitle(site, site.pages[1], 'fr'), 'Contact – MAB');
  const d = seoDescription(site, home, 'fr');
  assert.equal(d.auto, true);
  assert.match(d.text, /^Le MAB fédère/);
  site = setSeoField(site, home.id, 'title', 'MAB – fédération des médias libres', 'fr');
  site = setSeoField(site, home.id, 'description', 'Description choisie.', 'fr');
  assert.equal(seoTitle(site, site.pages[0], 'fr'), 'MAB – fédération des médias libres');
  assert.deepEqual(seoDescription(site, site.pages[0], 'fr'), { text: 'Description choisie.', auto: false });
  assert.ok(pageText(site, site.pages[0], 'fr').includes('Les médias alternatifs belges'));
});

test('publication : titre, Open Graph, Twitter, robots noindex, sitemap', () => {
  let { site } = site0();
  const id = site.pages[1].id;
  site = setSeoField(site, id, 'title', 'Écrire au MAB', 'fr');
  site = setSeoField(site, id, 'image', 'asset:img_a');
  let { files } = renderSite(site);
  const c = files.get('contact/index.html');
  assert.ok(c.includes('<title>Écrire au MAB</title>'));
  assert.ok(c.includes('<meta property="og:title" content="Écrire au MAB">'));
  assert.ok(c.includes('<meta property="og:url" content="https://www.exemple.be/contact/">'));
  assert.ok(c.includes('<meta property="og:site_name" content="MAB">'));
  assert.ok(c.includes('<meta property="og:type" content="website">'));
  assert.ok(c.includes('<meta property="og:image" content="https://www.exemple.be/assets/equipe-tournage.png">'));
  assert.ok(c.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(files.has('assets/equipe-tournage.png'), 'image de partage publiée même si elle n’est pas dans la page');
  const home = files.get('index.html');
  assert.ok(home.includes('<meta property="og:image" content="https://www.exemple.be/assets/IMG_2041.png">'), 'sinon la première image de la page');
  assert.ok(!c.includes('name="robots"'));
  site = setSeoField(site, id, 'noindex', true);
  files = renderSite(site).files;
  assert.ok(files.get('contact/index.html').includes('<meta name="robots" content="noindex">'));
  assert.ok(!files.get('sitemap.xml').includes('/contact/'), 'page non indexée retirée du sitemap');
  const noImg = renderPage({ ...site, assets: {} }, site.pages[1], 'fr');
  assert.ok(noImg.includes('<meta name="twitter:card" content="summary">'));
});

test('données structurées : Organization et WebSite sur l’accueil, fil d’Ariane ailleurs (pages d’éléments comprises)', () => {
  let { site } = site0();
  site = setHeader(site, { logo: 'asset:img_a' });
  const r = createCollection(site, { kind: 'events', name: 'Agenda' });
  site = addPage(r.site, { slug: 'agenda', title: { fr: 'Agenda', nl: 'Agenda' } });
  site = addItem(site, r.id, { title: { fr: 'Fête de la radio' }, date: '2026-11-03', place: 'Namur' }).site;
  const { files } = renderSite(site, { today: '2026-10-29' });
  const ld = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const home = ld(files.get('index.html'));
  const org = home.find(x => x['@type'] === 'Organization');
  assert.equal(org.name, 'MAB');
  assert.equal(org.url, 'https://www.exemple.be/');
  assert.equal(org.logo, 'https://www.exemple.be/assets/equipe-tournage.png');
  assert.deepEqual(org.sameAs, ['https://www.facebook.com/mab', 'https://mastodon.social/@mab']);
  assert.ok(home.some(x => x['@type'] === 'WebSite' && x.inLanguage === 'fr'));
  const bc = ld(files.get('contact/index.html')).find(x => x['@type'] === 'BreadcrumbList');
  assert.deepEqual(bc.itemListElement.map(i => i.name), ['MAB', 'Contact']);
  assert.equal(bc.itemListElement[1].item, 'https://www.exemple.be/contact/');
  const bcItem = ld(files.get('agenda/fete-de-la-radio/index.html')).find(x => x['@type'] === 'BreadcrumbList');
  assert.deepEqual(bcItem.itemListElement.map(i => i.name), ['MAB', 'Agenda', 'Fête de la radio']);
  const nl = ld(files.get('nl/contact/index.html')).find(x => x['@type'] === 'BreadcrumbList');
  assert.equal(nl.itemListElement[0].item, 'https://www.exemple.be/nl/');
});

test('analyse d’une page : problèmes repérés avec l’élément concerné, note qui monte quand on corrige', () => {
  const { site, img, t } = site0();
  const a = analyzePage(site, site.pages[0], 'fr');
  const ids = a.checks.filter(c => c.level !== 'good').map(c => c.id);
  for (const id of ['desc-auto', 'img-alt', 'link-vague', 'thin', 'keyword-none']) assert.ok(ids.includes(id), `${id} attendu (${ids.join(', ')})`);
  assert.equal(a.checks.find(c => c.id === 'img-alt').nodeId, img.id);
  assert.equal(a.checks.find(c => c.id === 'link-vague').nodeId, t.id);
  assert.ok(a.score < 80, `note ${a.score}`);
  assert.ok(a.stats.words > 5 && a.stats.images === 1 && a.stats.imagesNoAlt === 1);
  let s = setSeoField(site, site.pages[0].id, 'description', 'Le MAB fédère les médias alternatifs belges : matériel, techniciens et diffusion partagés, indépendance éditoriale garantie.', 'fr');
  s = setSeoField(s, s.pages[0].id, 'keyword', 'médias alternatifs', 'fr');
  const b = analyzePage(s, s.pages[0], 'fr');
  assert.ok(b.score > a.score, `${b.score} > ${a.score}`);
  assert.ok(b.checks.some(c => c.id === 'keyword-h1' && c.level === 'good'), 'mot-clé présent dans le H1');
  assert.ok(b.checks.some(c => c.id === 'keyword-desc' && c.level === 'good'));
  assert.ok(b.checks.some(c => c.id === 'keyword-title' && c.level !== 'good'), 'absent du titre');
  const nl = analyzePage(s, s.pages[0], 'nl');
  assert.ok(nl.checks.some(c => c.id === 'translation-desc'), 'description à traduire en NL');
});

test('analyse : titre trop long, H1 absent ou multiple, adresse trop longue, image au nom de fichier', () => {
  let { site, h1, img } = site0();
  let root = structuredClone(site.pages[0].root);
  const walk = n => { if (n.id === h1.id) n.props.level = 'h2'; if (n.id === img.id) n.props.alt = { fr: 'IMG_2041.png' }; (n.children || []).forEach(walk); };
  walk(root);
  site = updatePageRoot(site, site.pages[0].id, root);
  site = setSeoField(site, site.pages[1].id, 'title', 'Un titre beaucoup trop long pour Google qui sera coupé dans les résultats de recherche', 'fr');
  site = addPage(site, { slug: 'une-adresse-vraiment-tres-longue-avec-beaucoup-trop-de-mots-dedans', title: { fr: 'Longue' } });
  const home = analyzePage(site, site.pages[0], 'fr').checks.map(c => c.id);
  assert.ok(home.includes('h1-none'));
  assert.ok(home.includes('img-filename'));
  assert.ok(analyzePage(site, site.pages[1], 'fr').checks.some(c => c.id === 'title-long'));
  assert.ok(analyzePage(site, site.pages[2], 'fr').checks.some(c => c.id === 'slug-long'));
});

test('analyse du site : adresse du site, titres en double, page orpheline, logo', () => {
  let { site } = site0({ baseUrl: '' });
  site = addPage(site, { slug: 'cachee', title: { fr: 'Contact' } });
  site = { ...site, menu: [{ id: 'm1', kind: 'page', pageId: site.pages[0].id, label: {}, children: [] }, { id: 'm2', kind: 'page', pageId: site.pages[1].id, label: {}, children: [] }] };
  const r = analyzeSite(site, 'fr');
  const ids = r.checks.map(c => c.id);
  assert.ok(ids.includes('baseurl'));
  assert.ok(ids.includes('logo'));
  const hidden = r.pages.find(p => p.pageId === site.pages[2].id);
  assert.ok(hidden.checks.some(c => c.id === 'orphan'), 'aucun lien vers cette page');
  assert.ok(hidden.checks.some(c => c.id === 'title-duplicate'), 'même titre que Contact');
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('adresses accentuées affichées lisiblement (punycode)', async () => {
  const { hostToUnicode } = await import('../core/seo.js');
  assert.equal(hostToUnicode('www.xn--mdia-alternatif-bnb.be'), 'www.média-alternatif.be');
  assert.equal(hostToUnicode('www.exemple.be'), 'www.exemple.be');
  assert.equal(hostToUnicode('xn--bcher-kva.example'), 'bücher.example');
});

test('logo : adresse https acceptée, autres schémas refusés', async () => {
  const { createSite, setHeader } = await import('../core/site.js');
  let site = createSite({ name: 'X', languages: ['fr'] });
  site = setHeader(site, { logo: 'https://www.exemple.be/logo.png' });
  assert.equal(site.header.logo, 'https://www.exemple.be/logo.png');
  site = setHeader(site, { logo: 'javascript:alert(1)' });
  assert.equal(site.header.logo, 'https://www.exemple.be/logo.png');
  site = setHeader(site, { logo: 'http://www.exemple.be/logo.png' });
  assert.equal(site.header.logo, 'https://www.exemple.be/logo.png');
});
