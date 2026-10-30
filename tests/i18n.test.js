import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, setAdvanced, walk, findNode } from '../core/tree.js';
import { createSite, updatePageRoot, addPage, setPageSlug, normalizeSite, validateSite, missingTranslations } from '../core/site.js';
import { customizeMenu, setMenuItemLabel } from '../core/menu.js';
import { createComponent } from '../core/components.js';
import { customizeHeader } from '../core/layout.js';
import { renderPage, renderSite, pageDir } from '../core/render.js';
import { translatableItems, setTranslation, translateHtml, autoTranslate, exportCsv, importCsv, parseCsv, suggestSlug, reviewItems, markReviewed } from '../core/i18n.js';

function base() {
  let s = normalizeSite(createSite({ languages: ['fr', 'nl', 'de', 'en'] }));
  s = addPage(s, { slug: 'equipe', title: { fr: 'Notre équipe', nl: 'Ons team' } });
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  const h = createNode('heading'); h.props.text = { fr: 'Bonjour <strong>à tous</strong>' };
  const t = createNode('text'); t.props.content = { fr: '<p>Un <em>texte</em> &amp; des liens.</p>' };
  const acc = createNode('accordion');
  root = insertNode(root, col, h);
  root = insertNode(root, col, t);
  root = insertNode(root, col, acc);
  s = updatePageRoot(s, s.pages[0].id, root);
  return { site: s, h, t, acc, sec };
}

/* ---------- Adresses traduites ---------- */
test('adresses par langue : pageDir, liens du menu, hreflang, sitemap', () => {
  let { site } = base();
  site = { ...site, baseUrl: 'https://www.exemple.be' };
  const eq = site.pages[1];
  site = setPageSlug(site, eq.id, 'team', 'nl');
  site = setPageSlug(site, eq.id, 'mannschaft', 'de');
  assert.deepEqual(pageDir(site, site.pages[1], 'nl'), ['nl', 'team']);
  assert.deepEqual(pageDir(site, site.pages[1], 'en'), ['en', 'equipe']);
  const { files } = renderSite(site);
  assert.ok(files.has('nl/team/index.html') && files.has('de/mannschaft/index.html') && files.has('equipe/index.html'));
  const nl = files.get('nl/index.html');
  assert.ok(nl.includes('href="team/"'));
  const de = files.get('de/mannschaft/index.html');
  assert.ok(de.includes('hreflang="nl" href="https://www.exemple.be/nl/team/"'));
  assert.ok(files.get('sitemap.xml').includes('https://www.exemple.be/de/mannschaft/'));
});

test('adresses par langue : unicité par langue, accueil fixe, adresse nettoyée', () => {
  let { site } = base();
  site = addPage(site, { slug: 'contact', title: { fr: 'Contact' } });
  const [, eq, ct] = site.pages;
  site = setPageSlug(site, eq.id, 'Über uns!', 'de');
  assert.equal(site.pages[1].slugs.de, 'uber-uns');
  assert.throws(() => setPageSlug(site, ct.id, 'uber-uns', 'de'), /existe déjà/);
  assert.throws(() => setPageSlug(site, site.pages[0].id, 'x', 'nl'), /accueil/);
  const bad = structuredClone(site);
  bad.pages[2].slugs = { de: 'uber-uns' };
  assert.ok(validateSite(bad).errors.some(e => /double/i.test(e) && /DE/.test(e)));
  site = setPageSlug(site, eq.id, '', 'de');
  assert.equal(site.pages[1].slugs.de, undefined);
});

test('suggestSlug : depuis le titre traduit', () => {
  const { site } = base();
  assert.equal(suggestSlug(site, site.pages[1], 'nl'), 'ons-team');
  assert.equal(suggestSlug(site, site.pages[1], 'de'), 'notre-equipe');
});

/* ---------- Inventaire ---------- */
test('translatableItems : pages, éléments, listes, composants, en-tête, menu, pied, libellés accessibles', () => {
  let { site, sec, h } = base();
  site = customizeMenu(site);
  site = setMenuItemLabel(site, site.menu[1].id, 'Équipe', 'fr');
  let root = setAdvanced(site.pages[0].root, sec.id, { ariaLabel: 'Accueil', lang: 'fr' });
  site = updatePageRoot(site, site.pages[0].id, root);
  const extra = createSectionWithColumns(1);
  const q = createNode('quote');
  extra.children[0].children[0].children.push(q);
  site = updatePageRoot(site, site.pages[0].id, insertNode(site.pages[0].root, site.pages[0].root.id, extra));
  site = createComponent(site, site.pages[0].id, extra.id, 'Citation').site;
  site = customizeHeader(site);
  const items = translatableItems(site);
  const keys = items.map(i => i.key);
  const pid = site.pages[0].id;
  assert.ok(keys.includes(`p:${pid}:title`));
  assert.ok(keys.includes(`n:${pid}:${h.id}:text`));
  assert.ok(keys.some(k => /:items\.0\.title$/.test(k)));
  assert.ok(keys.some(k => k.startsWith('n:c:') && k.endsWith(':text')), 'composant');
  assert.ok(keys.includes(`m:${site.menu[1].id}`));
  assert.ok(keys.includes(`aria:${pid}:${sec.id}`));
  assert.ok(keys.includes('footer'));
  const hi = items.find(i => i.key === `n:${pid}:${h.id}:text`);
  assert.equal(hi.kind, 'inline');
  assert.equal(hi.values.fr, 'Bonjour <strong>à tous</strong>');
  assert.equal(items.find(i => i.key.endsWith(':content')).kind, 'richtext');
});

test('missingTranslations : composants et menu comptés', () => {
  let { site } = base();
  site = customizeMenu(site);
  site = setMenuItemLabel(site, site.menu[1].id, 'Équipe', 'fr');
  const extra = createSectionWithColumns(1);
  const hh = createNode('heading'); hh.props.text = { fr: 'Dans un composant' };
  extra.children[0].children[0].children.push(hh);
  site = updatePageRoot(site, site.pages[0].id, insertNode(site.pages[0].root, site.pages[0].root.id, extra));
  site = createComponent(site, site.pages[0].id, extra.id, 'C').site;
  const miss = missingTranslations(site);
  assert.ok(miss.some(m => m.componentId && m.lang === 'nl'));
  assert.ok(miss.some(m => m.menuItemId && m.lang === 'de'));
});

test('setTranslation : écrit au bon endroit, assainit selon le type', () => {
  const { site, h, t } = base();
  const pid = site.pages[0].id;
  let s = setTranslation(site, `n:${pid}:${h.id}:text`, 'nl', 'Hallo <strong>allemaal</strong><script>x</script>');
  assert.equal(findNode(s.pages[0].root, h.id).props.text.nl, 'Hallo <strong>allemaal</strong>');
  s = setTranslation(s, `n:${pid}:${t.id}:content`, 'nl', '<p>Een <em>tekst</em></p><img src=x onerror=alert(1)>');
  assert.ok(!JSON.stringify(s).includes('onerror'));
  s = setTranslation(s, `p:${s.pages[1].id}:title`, 'de', 'Unser Team');
  assert.equal(s.pages[1].title.de, 'Unser Team');
  s = setTranslation(s, 'footer', 'en', '© Everyone');
  assert.equal(s.footer.text.en, '© Everyone');
  assert.throws(() => setTranslation(s, 'n:nope:x:text', 'nl', 'x'), /introuvable/);
  assert.throws(() => setTranslation(s, 'footer', 'xx', 'x'), /langue/i);
});

/* ---------- Traduction automatique ---------- */
const fake = async (text, from, to) => `[${to}] ${text}`;

test('translateHtml : seules les parties texte sont traduites, balises et entités préservées, résultat échappé', async () => {
  const out = await translateHtml('<p>Un <em>texte</em> &amp; des liens.</p>', t => fake(t, 'fr', 'nl'));
  assert.equal(out, '<p>[nl] Un <em>[nl] texte</em> [nl] &amp; des liens.</p>');
  const esc = await translateHtml('Bonjour', async () => '<b>pirate</b>');
  assert.equal(esc, '&lt;b&gt;pirate&lt;/b&gt;');
  const spaces = await translateHtml('<p> </p>', async () => 'X');
  assert.equal(spaces, '<p> </p>');
});

test('autoTranslate : manquants seulement, marqués « à relire », erreurs comptées sans tout arrêter', async () => {
  const { site, h } = base();
  const pid = site.pages[0].id;
  let s = setTranslation(site, `n:${pid}:${h.id}:text`, 'nl', 'Al vertaald');
  let calls = 0;
  const tr = async (text, from, to) => { calls++; if (text.includes('liens')) throw new Error('échec'); return `[${to}] ${text}`; };
  const r = await autoTranslate(s, 'nl', tr);
  assert.ok(r.count > 3 && r.errors === 1, JSON.stringify({ count: r.count, errors: r.errors }));
  assert.equal(findNode(r.site.pages[0].root, h.id).props.text.nl, 'Al vertaald');
  assert.ok(r.site.pages[1].title.nl === 'Ons team');
  const review = reviewItems(r.site);
  assert.equal(review.length, r.count);
  assert.ok(review.every(i => i.lang === 'nl'));
  const k = review[0].key;
  const s2 = markReviewed(r.site, k, 'nl');
  assert.equal(reviewItems(s2).length, r.count - 1);
  const s3 = setTranslation(r.site, review[1].key, 'nl', 'Corrigé à la main');
  assert.equal(reviewItems(s3).length, r.count - 1);
});

test('autoTranslate : annulation propre', async () => {
  const { site } = base();
  const ctl = new AbortController();
  let n = 0;
  const r = await autoTranslate(site, 'de', async t => { if (++n === 2) ctl.abort(); return `[de] ${t}`; }, { signal: ctl.signal });
  assert.ok(r.aborted && r.count >= 1 && r.count < 6);
});

/* ---------- CSV ---------- */
test('parseCsv : guillemets, virgules, retours à la ligne, BOM, point-virgule', () => {
  assert.deepEqual(parseCsv('﻿a,b\n"x, y","l1\nl2"\n"q""q",z\n'), [['a', 'b'], ['x, y', 'l1\nl2'], ['q"q', 'z']]);
  assert.deepEqual(parseCsv('a;b\n1;2'), [['a', 'b'], ['1', '2']]);
});

test('exportCsv / importCsv : aller-retour, clés inconnues ignorées, contenu assaini', () => {
  const { site, h } = base();
  const csv = exportCsv(site);
  assert.ok(csv.startsWith('﻿key,type,fr,nl,de,en'));
  const rows = parseCsv(csv);
  const pid = site.pages[0].id;
  const row = rows.find(r => r[0] === `n:${pid}:${h.id}:text`);
  assert.equal(row[2], 'Bonjour <strong>à tous</strong>');
  row[3] = 'Hallo <strong>iedereen</strong><script>x</script>';
  rows.push(['n:inconnue:x:text', 'inline', 'a', 'b', '', '']);
  const back = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const r = importCsv(site, back);
  assert.equal(r.changed, 1);
  assert.equal(r.unknown, 1);
  assert.equal(findNode(r.site.pages[0].root, h.id).props.text.nl, 'Hallo <strong>iedereen</strong>');
  assert.throws(() => importCsv(site, 'pas,un,fichier\n1,2,3'), /colonne key/i);
});

/* ---------- Masquer dans une langue ---------- */
test('masquer dans une langue : absent du site dans cette langue, visible en transparence dans l’éditeur', () => {
  const { site, t } = base();
  const root = setAdvanced(site.pages[0].root, t.id, { hideLangs: { nl: true } });
  const s = updatePageRoot(site, site.pages[0].id, root);
  assert.ok(!renderPage(s, s.pages[0], 'nl').includes('des liens'));
  assert.ok(renderPage(s, s.pages[0], 'fr').includes('des liens'));
  assert.match(renderPage(s, s.pages[0], 'nl', { canvas: true }), /is-lang-hidden/);
});
