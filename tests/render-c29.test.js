/* Cycle 29 : site publié conforme — polices locales, icône et manifeste, métadonnées, page 404, .htaccess, empreintes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSite, addPage, addAsset, addFont, updatePageRoot, setTheme, setSiteIcon, setPublishSettings, setSiteMeta } from '../core/site.js';
import { createNode, insertNode, setProp, createSectionWithColumns } from '../core/tree.js';
import { renderPage, renderSite } from '../core/render.js';
import { fontFilesFor, preloadFont } from '../core/fonts.js';
import { pngToIco, sanitizeSvg, webmanifest, ICON_SIZES } from '../core/siteicon.js';
import { buildHtaccess, htaccessOptions } from '../core/htaccess.js';

function demo() {
  let site = createSite({ name: 'Démo', languages: ['fr', 'nl'], defaultLanguage: 'fr', baseUrl: 'https://www.exemple.be' });
  const page = site.pages[0];
  let root = page.root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0];
  const h = createNode('heading');
  root = insertNode(root, col.id, h);
  root = setProp(root, h.id, 'text', 'Bonjour', 'fr');
  const txt = createNode('text');
  root = insertNode(root, col.id, txt);
  root = setProp(root, txt.id, 'content', '<p>Bonjour tout le monde.</p>', 'fr');
  site = updatePageRoot(site, page.id, root);
  site = addPage(site, { slug: 'contact', title: { fr: 'Contact', nl: 'Contact' } });
  return { site };
}

const PNG1 = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');
const ROOT = new URL('..', import.meta.url).pathname;
const fontData = site => new Map(fontFilesFor(site).map(f => [f.src, new Uint8Array(readFileSync(ROOT + f.src))]));
const icon = () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle r="5" cx="5" cy="5"/></svg>', png: { 32: PNG1, 180: PNG1, 192: PNG1, 512: PNG1 } });

test('plus aucune requête vers Google ; @font-face locales dans styles.css et le canevas ; préchargement des titres', () => {
  let { site } = demo();
  site = setTheme(site, { fonts: { heading: 'fraunces', body: 'archivo' } });
  const { files } = renderSite(site, { fontData: fontData(site) });
  const html = files.get('index.html');
  const css = files.get('styles.css');
  for (const s of [html, css, files.get('nl/contact/index.html')]) assert.doesNotMatch(s, /googleapis|gstatic|fonts\.google/);
  assert.match(css, /@font-face\{font-family:"Fraunces";font-style:normal;font-weight:100 900;font-display:swap;src:url\("assets\/fonts\/fraunces-latin-wght-normal-[0-9a-f]{8}\.woff2"\) format\("woff2"\)/);
  assert.match(css, /@font-face\{font-family:"Archivo";font-style:italic;font-weight:700/);
  assert.match(css, /--font-h:"Fraunces",Georgia,serif/);
  const pre = preloadFont(site);
  assert.match(html, new RegExp(`<link rel="preload" href="${pre.name}" as="font" type="font/woff2" crossorigin>`));
  assert.match(files.get('nl/contact/index.html'), new RegExp(`<link rel="preload" href="\\.\\./\\.\\./${pre.name}" as="font"`));
  for (const f of fontFilesFor(site)) assert.ok(files.get(f.name) instanceof Uint8Array && files.get(f.name).length === f.bytes, f.name);
  assert.equal([...files.keys()].filter(k => k.startsWith('assets/fonts/')).length, 12);
  const canvas = renderPage(site, site.pages[0], 'fr', { canvas: true, fontBase: 'http://localhost:8813/fonts/' });
  assert.match(canvas, /src:url\("http:\/\/localhost:8813\/fonts\/fraunces\/fraunces-latin-wght-normal\.woff2"\)/);
  assert.doesNotMatch(canvas, /preload|googleapis/);
  const sys = renderSite(demo().site).files;
  assert.doesNotMatch(sys.get('styles.css'), /@font-face/);
  assert.doesNotMatch(sys.get('index.html'), /rel="preload"/);
  assert.ok(![...sys.keys()].some(k => k.startsWith('assets/fonts/')));
  const without = renderSite(site);
  assert.ok(without.missingFonts.length === 12 && ![...without.files.keys()].some(k => k.startsWith('assets/fonts/')), 'sans les octets : fichiers manquants signalés');
});

test('police personnalisée (.woff2) exportée dans assets/fonts/ et déclarée', () => {
  const woff2 = 'data:font/woff2;base64,' + Buffer.from('wOF2-mab').toString('base64');
  let { site } = demo();
  const r = addFont(site, { family: 'MAB Titling', weight: '700', dataUrl: woff2, name: 'MAB.woff2' });
  site = setTheme(r.site, { fonts: { heading: `custom:${r.id}` } });
  const { files } = renderSite(site);
  const file = [...files.keys()].find(k => /^assets\/fonts\/mab-[0-9a-f]{8}\.woff2$/.test(k));
  assert.ok(file, 'fichier exporté');
  assert.equal(Buffer.from(files.get(file)).toString(), 'wOF2-mab');
  assert.match(files.get('styles.css'), new RegExp(`@font-face\\{font-family:"MAB Titling";font-style:normal;font-weight:700;font-display:swap;src:url\\("${file}"\\)`));
  assert.match(files.get('styles.css'), /--font-h:"MAB Titling",system-ui,sans-serif/);
  assert.match(renderPage(site, site.pages[0], 'fr', { canvas: true }), /font-family:"MAB Titling";[^}]*src:url\("data:font\/woff2;base64,/);
});

test('icône du site → favicon.svg, favicon.ico, apple-touch-icon, icônes 192/512, manifeste, balises ; theme-color toujours', () => {
  let { site } = demo();
  const plain = renderSite(site).files;
  assert.match(plain.get('index.html'), /<meta name="theme-color" content="#0f766e">/);
  assert.doesNotMatch(plain.get('index.html'), /rel="icon"|rel="manifest"/);
  assert.ok(!plain.has('favicon.ico') && !plain.has('site.webmanifest'));
  site = setSiteIcon(site, icon());
  const { files } = renderSite(site);
  for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) assert.ok(files.has(f), f);
  const ico = files.get('favicon.ico');
  assert.deepEqual([...ico.slice(0, 6)], [0, 0, 1, 0, 1, 0], 'en-tête ICO : une image');
  assert.equal(ico[6], 32); assert.equal(ico[7], 32);
  assert.equal(new DataView(ico.buffer, ico.byteOffset).getUint32(18, true), 22, 'données PNG après les 22 octets d’en-tête');
  assert.deepEqual([...ico.slice(22, 26)], [0x89, 0x50, 0x4e, 0x47], 'PNG dans l’ICO');
  assert.match(files.get('favicon.svg'), /^<svg /);
  const man = JSON.parse(files.get('site.webmanifest'));
  assert.equal(man.name, 'Démo');
  assert.equal(man.theme_color, '#0f766e');
  assert.equal(man.background_color, '#f7f7f4');
  assert.equal(man.lang, 'fr');
  assert.deepEqual(man.icons.map(i => i.sizes), ['192x192', '512x512']);
  const html = files.get('index.html');
  assert.match(html, /<link rel="icon" href="favicon\.ico" sizes="32x32">/);
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html, /<link rel="apple-touch-icon" href="apple-touch-icon\.png">/);
  assert.match(html, /<link rel="manifest" href="site\.webmanifest">/);
  assert.match(files.get('nl/contact/index.html'), /<link rel="icon" href="\.\.\/\.\.\/favicon\.ico" sizes="32x32">/);
  assert.deepEqual(ICON_SIZES, [32, 180, 192, 512]);
  const noSvg = setSiteIcon(site, { png: icon().png });
  assert.ok(!renderSite(noSvg).files.has('favicon.svg'));
  assert.doesNotMatch(renderSite(noSvg).files.get('index.html'), /favicon\.svg/);
  assert.throws(() => setSiteIcon(site, { png: { 32: 'data:image/webp;base64,AAAA' } }), /icône/i);
  assert.equal(renderSite(setSiteIcon(site, null)).files.has('favicon.ico'), false, 'icône retirée');
});

test('sanitizeSvg retire scripts, gestionnaires, liens externes et foreignObject', () => {
  const dirty = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>x</div></foreignObject><a href="javascript:alert(1)"><rect width="1" height="1" onclick="x()"/></a><image href="https://evil/x.png"/><use xlink:href="data:image/svg+xml,x"/><circle r="2"/></svg>';
  const clean = sanitizeSvg(dirty);
  assert.doesNotMatch(clean, /script|onload|onclick|foreignObject|javascript:|https:\/\/evil|xlink:href="data/);
  assert.match(clean, /<circle r="2"\/?>/);
  assert.equal(sanitizeSvg('<div>pas du svg</div>'), '');
  assert.equal(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>').startsWith('<svg'), true);
  assert.equal(webmanifest({ name: 'X', theme: { palette: { c1: '#112233', c4: '#ffffff' } }, defaultLanguage: 'ja', pages: [{ slug: '' }] }).lang, 'ja');
  assert.equal(pngToIco(new Uint8Array([1, 2, 3]), 180)[6], 180);
});

test('og:locale avec région, twitter:title et description, lastmod dans le sitemap', () => {
  const { site } = demo();
  const files = renderSite(site, { today: '2026-10-31' }).files;
  const fr = files.get('index.html');
  assert.match(fr, /<meta property="og:locale" content="fr_BE">/);
  assert.match(files.get('nl/index.html'), /<meta property="og:locale" content="nl_BE">/);
  assert.match(fr, /<meta name="twitter:title" content="Démo">/);
  assert.match(files.get('contact/index.html'), /<meta name="twitter:title" content="Contact – Démo">/);
  assert.match(fr, /<meta name="twitter:description" content="Bonjour tout le monde\.">/);
  const map = files.get('sitemap.xml');
  assert.equal((map.match(/<lastmod>2026-10-31<\/lastmod>/g) || []).length, 4);
  assert.equal((renderSite(site, { today: '2026-10-31', lastmod: '2026-10-02' }).files.get('sitemap.xml').match(/<lastmod>2026-10-02<\/lastmod>/g) || []).length, 4);
  const ja = createSite({ name: 'J', languages: ['ja', 'en'], defaultLanguage: 'ja', baseUrl: 'https://x.jp' });
  const jf = renderSite(ja).files;
  assert.match(jf.get('index.html'), /og:locale" content="ja_JP"/);
  assert.match(jf.get('en/index.html'), /og:locale" content="en_GB"/);
});

test('page 404 par langue avec <base>, même en-tête et pied, liens vers les accueils, noindex', () => {
  const { site } = demo();
  const files = renderSite(site).files;
  const p = files.get('404.html');
  assert.ok(p && files.has('nl/404.html'));
  assert.match(p, /<base href="https:\/\/www\.exemple\.be\/">/);
  assert.match(files.get('nl/404.html'), /<base href="https:\/\/www\.exemple\.be\/nl\/">/);
  assert.match(p, /<meta name="robots" content="noindex">/);
  assert.match(p, /<h1[^>]*>Page introuvable<\/h1>/);
  assert.match(files.get('nl/404.html'), /Pagina niet gevonden/);
  assert.match(p, /<header class="site-header/);
  assert.match(p, /<footer class="site-footer/);
  assert.match(p, /nf__homes[\s\S]*href="\.\/"[^>]*>Accueil · Français<\/a>[\s\S]*href="nl\/"[^>]*>Home · Nederlands<\/a>/);
  assert.doesNotMatch(p, /"@type":"Organization"/);
  assert.doesNotMatch(files.get('sitemap.xml'), /404/);
  const noBase = renderSite(setSiteMeta(site, { baseUrl: '' })).files;
  assert.match(noBase.get('404.html'), /<base href="\/">/);
  assert.match(noBase.get('nl/404.html'), /<base href="\/nl\/">/);
});

test('.htaccess d’après baseUrl (https, www, 404 par langue, en-têtes, cache long, compression) ; GitHub Pages sans', () => {
  const { site } = demo();
  const o = htaccessOptions(site);
  assert.deepEqual(o, { host: 'www.exemple.be', https: true, www: 'add', path: '/', langs: ['fr', 'nl'] });
  const files = renderSite(site).files;
  const h = files.get('.htaccess');
  assert.ok(h, '.htaccess présent');
  assert.match(h, /ErrorDocument 404 \/404\.html/);
  assert.match(h, /<If "%\{REQUEST_URI\} =~ m#\^\/nl\/#">\s*ErrorDocument 404 \/nl\/404\.html\s*<\/If>/);
  assert.match(h, /RewriteCond %\{HTTPS\} !=on\nRewriteCond %\{HTTP:X-Forwarded-Proto\} !=https\nRewriteRule \^ https:\/\/%\{HTTP_HOST\}%\{REQUEST_URI\} \[L,R=301\]/);
  assert.match(h, /RewriteCond %\{HTTP_HOST\} \^exemple\\\.be\$ \[NC\]\nRewriteRule \^ https:\/\/www\.exemple\.be%\{REQUEST_URI\} \[L,R=301\]/);
  assert.match(h, /Header always set Strict-Transport-Security "max-age=31536000"/);
  assert.match(h, /Header always set X-Content-Type-Options "nosniff"/);
  assert.match(h, /Header always set Referrer-Policy "strict-origin-when-cross-origin"/);
  assert.match(h, /Header always set Permissions-Policy "camera=\(\), microphone=\(\), geolocation=\(\)/);
  assert.match(h, /Content-Security-Policy "default-src 'self'; [^"]*font-src 'self'; frame-src https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com https:\/\/maps\.google\.com https:\/\/www\.openstreetmap\.org;/);
  assert.match(h, /<FilesMatch "-\[0-9a-f\]\{8\}\\\.\(woff2\|webp\|jpe\?g\|png\|gif\|avif\|svg\|ico\|css\|js\|pdf\|mp3\|m4a\|ogg\)\$">\s*Header set Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(h, /AddDefaultCharset UTF-8/);
  assert.match(h, /<IfModule mod_deflate\.c>[\s\S]*AddOutputFilterByType DEFLATE text\/html text\/css application\/javascript/);
  assert.match(h, /AddType font\/woff2 \.woff2/);
  assert.match(h, /Options -Indexes/);
  const bare = buildHtaccess(htaccessOptions(setSiteMeta(site, { baseUrl: 'https://exemple.be' })));
  assert.match(bare, /RewriteCond %\{HTTP_HOST\} \^www\\\.exemple\\\.be\$ \[NC\]\nRewriteRule \^ https:\/\/exemple\.be%\{REQUEST_URI\} \[L,R=301\]/);
  const none = buildHtaccess(htaccessOptions(setSiteMeta(site, { baseUrl: '' })));
  assert.doesNotMatch(none, /RewriteRule|Strict-Transport/);
  assert.match(none, /ErrorDocument 404 \/404\.html/);
  const sub = htaccessOptions(setSiteMeta(site, { baseUrl: 'https://www.exemple.be/site' }));
  assert.equal(sub.path, '/site/');
  assert.match(buildHtaccess(sub), /ErrorDocument 404 \/site\/404\.html/);
  const pages = setPublishSettings(site, { server: 'pages' });
  assert.ok(!renderSite(pages).files.has('.htaccess'), 'GitHub Pages : pas de .htaccess');
  assert.ok(renderSite(pages).files.has('404.html'));
  assert.ok(renderSite(setPublishSettings(site, { mode: 'php' })).files.has('.htaccess'), 'publish.php : le .htaccess est dans les fichiers (le paquet envoyé l’écarte)');
  assert.throws(() => buildHtaccess({ host: 'www.exemple.be;rm -rf', https: true, www: 'add', path: '/', langs: [] }), /hôte/i);
});

test('noms des images suffixés d’une empreinte de contenu (variantes comprises), références cohérentes', () => {
  let { site } = demo();
  const png = 'data:image/png;base64,' + Buffer.from([1, 2, 3]).toString('base64');
  const r = addAsset(site, { name: 'photo.png', mime: 'image/png', dataUrl: png, width: 1200, height: 800, variants: [{ w: 480, dataUrl: 'data:image/png;base64,' + Buffer.from([4, 5]).toString('base64') }] });
  site = r.site;
  site.header.logo = `asset:${r.id}`;
  const files = renderSite(site).files;
  const names = [...files.keys()].filter(k => k.startsWith('assets/'));
  assert.equal(names.length, 2);
  const main = names.find(n => /^assets\/photo-[0-9a-f]{8}\.png$/.test(n));
  const variant = names.find(n => /^assets\/photo-480-[0-9a-f]{8}\.png$/.test(n));
  assert.ok(main && variant, names.join());
  assert.notEqual(main.slice(13, 21), variant.slice(17, 25), 'empreintes différentes (contenus différents)');
  assert.match(files.get('index.html'), new RegExp(`src="${main.replace('.', '\\.')}"`));
  assert.match(files.get('nl/contact/index.html'), new RegExp(`src="\\.\\./\\.\\./${main.replace('.', '\\.')}"`));
  site.pages[0].seo = { ...(site.pages[0].seo || {}), image: `asset:${r.id}` };
  assert.match(renderSite(site).files.get('index.html'), new RegExp(`og:image" content="https://www\\.exemple\\.be/${main.replace('.', '\\.')}"`));
  const canvas = renderPage(site, site.pages[0], 'fr', { canvas: true });
  assert.match(canvas, /src="data:image\/png;base64,/);
});
