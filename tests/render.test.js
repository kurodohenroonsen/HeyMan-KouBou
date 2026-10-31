import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSite, addPage, addAsset, missingTranslations, validateSite, updatePageRoot } from '../core/site.js';
import { createNode, insertNode, setProp, setStyle, createSectionWithColumns } from '../core/tree.js';
import { renderPage, renderSite, pagePath, buildCss } from '../core/render.js';

function demo() {
  let site = createSite({ name: 'Démo', languages: ['fr', 'nl'], defaultLanguage: 'fr', baseUrl: 'https://www.exemple.be' });
  const page = site.pages[0];
  let root = page.root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0];
  const h = createNode('heading');
  root = insertNode(root, col.id, h);
  root = setProp(root, h.id, 'text', 'Bonjour &lt;monde&gt; <b>gras</b><script>x</script>', 'fr');
  root = setProp(root, h.id, 'text', 'Hallo wereld', 'nl');
  root = setStyle(root, h.id, 'mobile', 'fontSize', '30px');
  const btn = createNode('button');
  root = insertNode(root, col.id, btn);
  root = setProp(root, btn.id, 'link', 'javascript:alert(1)');
  site = updatePageRoot(site, page.id, root);
  site = addPage(site, { slug: 'contact', title: { fr: 'Contact', nl: 'Contact' } });
  return { site, h, btn, sec, col };
}

test('pagePath : langue principale à la racine, autres langues en dossier', () => {
  const { site } = demo();
  assert.equal(pagePath(site, site.pages[0], 'fr'), 'index.html');
  assert.equal(pagePath(site, site.pages[1], 'nl'), 'nl/contact/index.html');
});

test('renderPage : document complet, échappé, dans la bonne langue, classes n-*', () => {
  const { site, h } = demo();
  const fr = renderPage(site, site.pages[0], 'fr');
  assert.match(fr, /^<!DOCTYPE html>/);
  assert.match(fr, /<html lang="fr">/);
  assert.match(fr, /Bonjour &lt;monde&gt; <strong>gras<\/strong><\/h2>/);
  assert.doesNotMatch(fr, /<script>x/);
  assert.match(fr, new RegExp(`class="w w-heading n-${h.id}"`));
  assert.doesNotMatch(fr, /javascript:/);
  assert.match(renderPage(site, site.pages[0], 'nl'), /Hallo wereld/);
});

test('repli sur la langue principale et liste des traductions manquantes', () => {
  const { site, btn } = demo();
  const nl = renderPage(site, site.pages[0], 'nl');
  assert.match(nl, /En savoir plus/);
  const miss = missingTranslations(site).filter(m => m.nodeId === btn.id).map(m => `${m.field}:${m.lang}`);
  assert.deepEqual(miss, ['label:nl']);
});

test('hreflang, canonical et chemins relatifs', () => {
  const { site } = demo();
  const html = renderPage(site, site.pages[1], 'nl');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.exemple\.be\/nl\/contact\/">/);
  assert.match(html, /hreflang="x-default" href="https:\/\/www\.exemple\.be\/contact\/"/);
  assert.match(html, /href="\.\.\/\.\.\/styles\.css"/);
});

test('mode canevas : data-node, CSS en ligne, pas de lien vers styles.css', () => {
  const { site, h } = demo();
  const html = renderPage(site, site.pages[0], 'fr', { canvas: true });
  assert.match(html, new RegExp(`data-node="${h.id}"`));
  assert.match(html, /<style id="atelier-css">/);
  assert.doesNotMatch(html, /styles\.css/);
  assert.doesNotMatch(renderPage(site, site.pages[0], 'fr'), /data-node=/);
});

test('buildCss contient les jetons du thème, la grille et les styles responsives des nœuds', () => {
  const { site, h } = demo();
  const css = buildCss(site, site.pages);
  assert.match(css, /--c1:#/);
  assert.match(css, /grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(css, new RegExp(`@media \\(max-width:640px\\)\\{\\.n-${h.id} \\.heading\\{font-size:30px\\}\\}`));
});

test('renderSite : pages × langues, CSS, sitemap, robots, ressources utilisées', () => {
  let { site } = demo();
  const png = 'data:image/png;base64,' + Buffer.from([1, 2, 3]).toString('base64');
  const r = addAsset(site, { name: 'Logo MAB.png', mime: 'image/png', dataUrl: png });
  site = r.site;
  const { files } = renderSite(site);
  assert.deepEqual([...files.keys()].sort(), ['.htaccess', '404.html', 'contact/index.html', 'index.html', 'nl/404.html', 'nl/contact/index.html', 'nl/index.html', 'robots.txt', 'site.js', 'sitemap.xml', 'styles.css']);
  site.header.logo = 'asset:' + r.id;
  const again = renderSite(site).files;
  const logo = [...again.keys()].find(k => /^assets\/logo-mab-[0-9a-f]{8}\.png$/.test(k));
  assert.ok(logo, 'nom suffixé de l’empreinte du contenu (cycle 29)');
  assert.ok(again.get('nl/contact/index.html').includes(`src="../../${logo}"`));
});

test('validateSite', () => {
  const { site } = demo();
  assert.deepEqual(validateSite(site).errors, []);
  const bad = structuredClone(site);
  bad.pages[1].slug = '../x';
  assert.match(validateSite(bad).errors.join(), /slug/i);
});

/* ---------- Cycle 33 (W4) : images responsives dans chaque widget image, documents ---------- */
import { addDocument, setHeader } from '../core/site.js';
import { buildAccessibilityPage } from '../core/a11ypage.js';
import { REGISTRY } from '../core/widgets.js';

function withAsset() {
  const png = 'data:image/webp;base64,' + Buffer.from([1, 2, 3]).toString('base64');
  let site = createSite({ name: 'Démo', languages: ['fr', 'ja'], defaultLanguage: 'fr' });
  const r = addAsset(site, { name: 'photo.webp', mime: 'image/webp', dataUrl: png, width: 1600, height: 900, variants: [{ w: 480, dataUrl: png }, { w: 960, dataUrl: png }] });
  return { site: r.site, ref: `asset:${r.id}` };
}
function pageWith(site, nodes, cols = 1) {
  let root = site.pages[0].root;
  const sec = createSectionWithColumns(cols);
  root = insertNode(root, root.id, sec);
  for (const n of nodes) root = insertNode(root, sec.children[0].children[0].id, n);
  return updatePageRoot(site, site.pages[0].id, root);
}
const node = (type, props) => Object.assign(createNode(type), { props: { ...REGISTRY[type].defaults(), ...props } });
const imgsOf = html => (html.match(/<img [^>]*>/g) || []).filter(t => t.includes('photo'));

test('W4 : galerie, carte, citation et logo passent par imgTag (srcset, sizes, width, height, loading)', () => {
  const { site: s0, ref } = withAsset();
  let site = pageWith(s0, [
    node('gallery', { columns: '3', items: [{ src: ref, alt: { fr: 'Vue' }, caption: { fr: '' } }] }),
    node('card', { image: ref, alt: { fr: 'Carte' } }),
    node('quote', { photo: ref }),
    node('site-logo', { size: '40' })
  ]);
  site = setHeader(site, { logo: ref });
  const html = renderPage(site, site.pages[0], 'fr');
  const imgs = imgsOf(html);
  assert.equal(imgs.length, 5, imgs.join('\n'));
  for (const t of imgs) {
    assert.match(t, /srcset="assets\/photo-480-[0-9a-f]{8}\.webp 480w, assets\/photo-960-[0-9a-f]{8}\.webp 960w, assets\/photo-[0-9a-f]{8}\.webp 1600w"/, t);
    assert.match(t, /width="1600" height="900"/, t);
    assert.match(t, /sizes="/, t);
  }
  const [header, gal, card, quote, logo] = imgs;
  assert.match(header, /sizes="\d+px"/);
  assert.ok(!/loading="lazy"/.test(header) && !/fetchpriority/.test(header), 'logo de l’en-tête : ni paresseux ni prioritaire');
  assert.match(gal, /sizes="\(max-width: 640px\) 50vw, \(max-width: 1024px\) 33vw, 387px"/);
  assert.match(gal, /fetchpriority="high"/, 'la première image de contenu reste prioritaire');
  assert.match(card, /loading="lazy"/);
  assert.match(quote, /sizes="44px"/);
  assert.match(logo, /sizes="\d+px"/);
  assert.match(html, /<a href="assets\/photo-[0-9a-f]{8}\.webp" aria-label="Vue">/, 'la galerie agrandit l’image d’origine');
});

test('W4 : lien de téléchargement (Bouton, Liste à icônes, Carte) avec type, taille, rel="noopener", download facultatif', () => {
  let site = createSite({ name: 'Démo', languages: ['fr', 'ja'], defaultLanguage: 'fr' });
  const d = addDocument(site, { name: 'Statuts.pdf', dataUrl: `data:application/pdf;base64,${Buffer.alloc(1234567, 1).toString('base64')}` });
  site = d.site;
  const ref = `asset:${d.id}`;
  site = pageWith(site, [
    node('button', { label: { fr: 'Nos statuts', ja: '定款' }, file: ref, download: true }),
    node('icon-list', { items: [{ icon: 'check', text: { fr: 'Programme' }, file: ref }] }),
    node('card', { title: { fr: 'Dossier' }, button: { fr: 'Télécharger' }, link: '', file: ref })
  ]);
  const html = renderPage(site, site.pages[0], 'fr');
  const links = html.match(/<a [^>]*href="assets\/docs\/statuts-[0-9a-f]{8}\.pdf"[^>]*>[\s\S]*?<\/a>/g) || [];
  assert.equal(links.length, 3, html);
  for (const l of links) {
    assert.match(l, /type="application\/pdf"/);
    assert.match(l, /rel="noopener"/);
    assert.match(l, /PDF, 1,2 Mo/);
  }
  assert.match(links[0], / download="Statuts\.pdf"/);
  assert.ok(!/ download=/.test(links[1]), 'download seulement si demandé');
  assert.match(renderPage(site, site.pages[0], 'ja'), /PDF、1\.2 MB/);
  const files = renderSite(site).files;
  assert.ok([...files.keys()].some(k => /^assets\/docs\/statuts-[0-9a-f]{8}\.pdf$/.test(k)), [...files.keys()].join());
});

test('W4 : un SVG exporté est assaini une seconde fois (projet .json modifié à la main)', () => {
  let site = createSite({ name: 'Démo' });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
  const r = addAsset(site, { name: 'logo.svg', mime: 'image/svg+xml', dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` });
  site = r.site;
  site.assets[r.id].dataUrl = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>').toString('base64')}`;
  site = setHeader(site, { logo: `asset:${r.id}` });
  const files = renderSite(site).files;
  const key = [...files.keys()].find(k => /^assets\/logo-[0-9a-f]{8}\.svg$/.test(k));
  assert.ok(key);
  assert.doesNotMatch(Buffer.from(files.get(key)).toString(), /script|onload/);
});

test('A2 : déclaration d’accessibilité WCAG 2.2 / EN 301 549 v3.2.1 en cinq langues, japonais avec JIS X 8341-3', () => {
  const site = createSite({ name: 'MAB', languages: ['fr', 'nl', 'de', 'en', 'ja'], defaultLanguage: 'fr' });
  const p = buildAccessibilityPage(site, { entity: 'ASBL MAB', email: 'a11y@mab.be', date: '2026-10-31', status: 'partial' });
  assert.deepEqual(Object.keys(p.title), ['fr', 'nl', 'de', 'en', 'ja']);
  const s = { ...site, pages: [...site.pages, p] };
  for (const l of ['fr', 'nl', 'de', 'en', 'ja']) {
    const html = renderPage(s, p, l);
    assert.match(html, /WCAG 2\.2/, l);
    assert.match(html, /EN 301 549 v3\.2\.1/, l);
    assert.doesNotMatch(html, /WCAG 2\.1/, l);
  }
  const ja = renderPage(s, p, 'ja');
  assert.match(ja, /JIS X 8341-3/);
  assert.match(ja, /一部準拠/);
  assert.match(ja, /アクセシビリティ/);
});

test('A2 : lightbox de la galerie — dialogue modal, bouton Fermer libellé, focus enfermé et rendu', () => {
  const g = REGISTRY.gallery;
  for (const needle of ['showModal', "'aria-modal','true'", 'data-close', 'Tab', 'focus()']) assert.ok(g.script.includes(needle), needle);
  const { site: s0, ref } = withAsset();
  const site = pageWith(s0, [node('gallery', { zoom: true, items: [{ src: ref, alt: { fr: 'Vue' }, caption: { fr: '' } }] })]);
  assert.match(renderPage(site, site.pages[0], 'fr'), /class="gal"[^>]*data-zoom data-close="Fermer"/);
  assert.match(renderPage(site, site.pages[0], 'ja'), /data-close="閉じる"/);
});
