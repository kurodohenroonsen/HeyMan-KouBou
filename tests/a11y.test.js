import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, luminance, contrastRatio, resolveColor, checkNodeContrast, contrastIssues, palettePairs, headingIssues } from '../core/contrast.js';
import { createNode, insertNode, createSectionWithColumns, setStyle, walk } from '../core/tree.js';
import { createSite, updatePageRoot, addAsset, normalizeSite, findPage } from '../core/site.js';
import { buildAccessibilityPage, addAccessibilityPage } from '../core/a11ypage.js';
import { renderPage, renderSite, buildCss } from '../core/render.js';
import { auditSite } from '../core/audit.js';
import { buildBaseCss } from '../core/theme.js';
import { compileNodeCss, validateStyleValue } from '../core/style.js';

function siteWith(widgets, { bg } = {}) {
  let s = normalizeSite(createSite({ languages: ['fr', 'nl', 'de', 'en'] }));
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  if (bg) sec.style.desktop.background = bg;
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  for (const w of widgets) root = insertNode(root, col, w);
  return { site: updatePageRoot(s, s.pages[0].id, root), sec };
}
const h1 = () => { const n = createNode('heading'); n.props.level = 'h1'; return n; };

/* ---------- Calculs WCAG ---------- */
test('parseColor : hex court/long/alpha, rgb, transparent', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#0f766e'), { r: 15, g: 118, b: 110, a: 1 });
  assert.equal(parseColor('#00000080').a.toFixed(2), '0.50');
  assert.deepEqual(parseColor('rgb(1, 2, 3)'), { r: 1, g: 2, b: 3, a: 1 });
  assert.equal(parseColor('transparent').a, 0);
  assert.equal(parseColor('nimporte'), null);
});

test('contrastRatio : valeurs de référence WCAG', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(contrastRatio('#ffffff', '#ffffff').toFixed(1), '1.0');
  assert.equal(contrastRatio('#777777', '#ffffff').toFixed(2), '4.48');
  assert.ok(Math.abs(luminance(parseColor('#808080')) - 0.2159) < 0.001);
});

test('resolveColor : jetons de palette et transparence fusionnée sur le fond', () => {
  const pal = { c1: '#0f766e', c4: '#ffffff' };
  assert.equal(resolveColor('palette:c1', pal), '#0f766e');
  assert.equal(resolveColor('#00000080', pal, '#ffffff'), '#7f7f7f');
});

/* ---------- Contraste des éléments ---------- */
test('texte gris clair sur blanc : insuffisant (4,5:1 requis)', () => {
  const t = createNode('text');
  t.style.desktop.color = '#aaaaaa';
  const { site } = siteWith([h1(), t], { bg: '#ffffff' });
  const issues = contrastIssues(site, site.pages[0]);
  const i = issues.find(x => x.nodeId === t.id);
  assert.ok(i && i.ratio < 4.5 && i.required === 4.5, JSON.stringify(issues));
});

test('grand titre : seuil 3:1 ; fond hérité du parent', () => {
  const h = h1();
  h.style.desktop.color = '#949494';
  const { site } = siteWith([h], { bg: '#ffffff' });
  const r = checkNodeContrast(site, site.pages[0], h.id);
  assert.equal(r.required, 3);
  assert.ok(r.ratio > 3 && r.ok, JSON.stringify(r));
});

test('bouton plein : texte c6 sur c1 ; couleur de palette trop claire détectée', () => {
  const b = createNode('button');
  const { site } = siteWith([h1(), b]);
  site.theme.palette.c1 = '#ffd54f';
  const r = checkNodeContrast(site, site.pages[0], b.id);
  assert.ok(!r.ok && r.fg === '#ffffff' && r.bg === '#ffd54f', JSON.stringify(r));
});

test('fond avec image : à vérifier à l’œil, pas d’échec automatique', () => {
  const t = createNode('text');
  const { site, sec } = siteWith([h1(), t]);
  const root = setStyle(site.pages[0].root, sec.id, 'desktop', 'backgroundImage', 'https://exemple.be/a.jpg');
  const s = updatePageRoot(site, site.pages[0].id, root);
  const r = checkNodeContrast(s, s.pages[0], t.id);
  assert.equal(r.unknown, true);
});

test('palettePairs : paires usuelles avec verdict', () => {
  const pairs = palettePairs({ c1: '#0f766e', c2: '#f59e0b', c3: '#16161a', c4: '#f7f7f4', c5: '#5f5f69', c6: '#ffffff' });
  const main = pairs.find(p => p.id === 'text');
  assert.ok(main.ok && main.ratio > 15);
  assert.ok(pairs.some(p => p.id === 'button'));
  assert.ok(pairs.every(p => typeof p.ratio === 'number' && p.label));
});

test('auditSite : contraste insuffisant signalé avec l’élément', () => {
  const t = createNode('text');
  t.style.desktop.color = '#bbbbbb';
  const { site } = siteWith([h1(), t], { bg: '#ffffff' });
  const w = auditSite(site).warnings.find(x => /contraste/i.test(x.message));
  assert.ok(w && w.nodeId === t.id);
});

/* ---------- Titres ---------- */
test('headingIssues : niveau sauté et absence de H1', () => {
  const a = createNode('heading'); a.props.level = 'h2';
  const b = createNode('heading'); b.props.level = 'h4';
  const { site } = siteWith([a, b]);
  const issues = headingIssues(site.pages[0]);
  assert.ok(issues.some(i => /H1/.test(i.message)));
  assert.ok(issues.some(i => /H2 → H4/.test(i.message) && i.nodeId === b.id));
  const ok = siteWith([h1(), createNode('heading')]).site;
  assert.deepEqual(headingIssues(ok.pages[0]), []);
});

/* ---------- Déclaration d'accessibilité ---------- */
test('buildAccessibilityPage : 4 langues, date, contact, état de conformité, limites connues', () => {
  const { site } = siteWith([h1()]);
  const page = buildAccessibilityPage(site, { entity: 'ASBL MAB', email: 'a11y@mab.be', date: '2026-10-29', status: 'partial', limits: ['Vidéos sans sous-titres'] });
  assert.equal(page.slug, 'accessibilite');
  assert.equal(page.footerLink, true);
  for (const l of ['fr', 'nl', 'de', 'en']) assert.ok(page.title[l], l);
  const html = JSON.stringify(page.root);
  for (const needle of ['ASBL MAB', 'a11y@mab.be', 'WCAG 2.1', 'EN 301 549', 'Vidéos sans sous-titres', 'partiellement conforme', 'gedeeltelijk', 'teilweise', 'partially']) assert.ok(html.includes(needle), needle);
});

test('addAccessibilityPage : page ajoutée, lien dans le pied de page, adresse unique', () => {
  const { site } = siteWith([h1()]);
  const r = addAccessibilityPage(site, { entity: 'X', email: 'x@y.be', date: '2026-10-29', status: 'full' });
  const p = findPage(r.site, r.pageId);
  assert.equal(p.slug, 'accessibilite');
  const html = renderPage(r.site, r.site.pages[0], 'nl');
  assert.match(html, /<footer[\s\S]*href="(?:\.\.\/)?(?:\.\/)?accessibilite\/"[\s\S]*Toegankelijkheid/);
  const r2 = addAccessibilityPage(r.site, { entity: 'X', email: 'x@y.be', date: '2026-10-29', status: 'full' });
  assert.equal(findPage(r2.site, r2.pageId).slug, 'accessibilite-2');
});

/* ---------- Images responsives ---------- */
function withImage(variants = true, count = 2) {
  const png = 'data:image/webp;base64,' + Buffer.from([1, 2, 3]).toString('base64');
  let { site } = siteWith([h1()]);
  const r = addAsset(site, { name: 'photo.webp', mime: 'image/webp', dataUrl: png, width: 1600, height: 900, variants: variants ? [{ w: 480, dataUrl: png }, { w: 960, dataUrl: png }] : undefined });
  site = r.site;
  let root = site.pages[0].root;
  const sec = createSectionWithColumns(2, [8, 4]);
  root = insertNode(root, root.id, sec);
  const imgs = [];
  for (let i = 0; i < count; i++) {
    const img = createNode('image');
    img.props.src = `asset:${r.id}`;
    img.props.alt = { fr: 'Photo' };
    root = insertNode(root, sec.children[0].children[i % 2].id, img);
    imgs.push(img);
  }
  return { site: updatePageRoot(site, site.pages[0].id, root), assetId: r.id, imgs };
}

test('addAsset : variantes nommées et enregistrées', () => {
  const { site, assetId } = withImage();
  const a = site.assets[assetId];
  assert.deepEqual(a.variants.map(v => v.file), ['photo-480.webp', 'photo-960.webp']);
  assert.equal(a.width, 1600);
});

test('rendu : srcset, sizes selon la colonne, width/height, priorité à la première image seulement', () => {
  const { site } = withImage();
  const html = renderPage(site, site.pages[0], 'fr');
  const imgs = html.match(/<img [^>]*>/g).filter(t => t.includes('photo'));
  assert.equal(imgs.length, 2);
  assert.match(imgs[0], /srcset="assets\/photo-480\.webp 480w, assets\/photo-960\.webp 960w, assets\/photo\.webp 1600w"/);
  assert.match(imgs[0], /sizes="\(max-width: 640px\) 100vw, \(max-width: 1024px\) 67vw, 773px"/);
  assert.match(imgs[0], /width="1600" height="900"/);
  assert.match(imgs[0], /fetchpriority="high"/);
  assert.match(imgs[0], /loading="eager"/);
  assert.match(imgs[1], /loading="lazy"/);
  assert.ok(!imgs[1].includes('fetchpriority'));
  assert.match(imgs[1], /sizes="\(max-width: 640px\) 100vw, \(max-width: 1024px\) 33vw, 387px"/);
});

test('export : variantes copiées ; ancien format sans variantes toujours rendu', () => {
  const { site } = withImage();
  const files = renderSite(site).files;
  assert.ok(files.has('assets/photo-480.webp') && files.has('assets/photo-960.webp') && files.has('assets/photo.webp'));
  const old = withImage(false).site;
  const html = renderPage(old, old.pages[0], 'fr');
  assert.ok(html.includes('src="assets/photo.webp"') && !/photo[^"]*srcset/.test(html));
});

/* ---------- Mouvement ---------- */
test('transitions entre pages : activées par défaut, respect de prefers-reduced-motion, désactivables', () => {
  const s = normalizeSite(createSite());
  assert.match(buildBaseCss(s.theme, s.tokens), /@media \(prefers-reduced-motion: no-preference\)\{@view-transition\{navigation:auto\}\}/);
  assert.ok(!buildBaseCss({ ...s.theme, pageTransitions: false }, s.tokens).includes('@view-transition'));
});

test('apparition au défilement : CSS pur, protégé par @supports et prefers-reduced-motion', () => {
  assert.equal(validateStyleValue('reveal', 'up'), 'up');
  assert.equal(validateStyleValue('reveal', 'boom'), null);
  let t = createNode('text');
  t = setStyle(t, t.id, 'desktop', 'reveal', 'up');
  const css = compileNodeCss(t, {});
  assert.match(css, /@supports \(animation-timeline: view\(\)\)\{@media \(prefers-reduced-motion: no-preference\)\{\.n-[^{]+\{animation:atelier-up both linear;animation-timeline:view\(\);animation-range:entry 0% cover 30%\}\}\}/);
  const base = buildBaseCss(normalizeSite(createSite()).theme);
  assert.match(base, /@keyframes atelier-up/);
});
