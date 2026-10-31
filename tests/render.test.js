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
