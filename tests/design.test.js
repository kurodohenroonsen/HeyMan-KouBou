import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fluid, typeScale, spaceScale, tokensCss, defaultTokens, TYPE_STEPS, SPACE_STEPS, setTypeTokens, setSpaceTokens } from '../core/tokens.js';
import { validateStyleValue, compileNodeCss, PALETTE_KEYS } from '../core/style.js';
import { createNode, insertNode, createSectionWithColumns, setStyle, findNode, setAdvanced, sanitizeCustomCss } from '../core/tree.js';
import { createSite, updatePageRoot, addPaletteColor, removePaletteColor, setPaletteName, normalizeSite, validateSite } from '../core/site.js';
import { presetFromNode, setNodePreset, setPresetStyle, renamePreset, deletePreset, duplicatePreset, setDefaultPreset, effectivePreset, presetUsage, createPreset } from '../core/presets.js';
import { colorUsages, replaceColor } from '../core/colors.js';
import { buildCss, renderPage } from '../core/render.js';
import { buildBaseCss } from '../core/theme.js';

function siteWith(...widgets) {
  let s = createSite();
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  for (const w of widgets) root = insertNode(root, col, w);
  return { site: updatePageRoot(s, s.pages[0].id, root), pageId: s.pages[0].id };
}
const rootOf = s => s.pages[0].root;

/* ---------- Échelles fluides ---------- */
test('fluid : formule Utopia, bornes en rem, pente en vw', () => {
  assert.equal(fluid(16, 20, 390, 1280), 'clamp(1rem, 0.8904rem + 0.4494vw, 1.25rem)');
  assert.equal(fluid(20, 20, 390, 1280), '1.25rem');
});

test('fluid : min > max reste un clamp valide (bornes remises dans l’ordre)', () => {
  const v = fluid(24, 18, 390, 1280);
  const [a, , c] = v.slice(6, -1).split(', ');
  assert.ok(parseFloat(a) <= parseFloat(c), v);
});

test('typeScale : 7 tailles, croissantes, base = taille de base', () => {
  const t = defaultTokens().type;
  const sc = typeScale(t);
  assert.deepEqual(Object.keys(sc), TYPE_STEPS);
  assert.equal(sc.base, fluid(t.minSize, t.maxSize, t.minVw, t.maxVw));
  const maxRem = s => parseFloat(s.match(/([\d.]+)rem\)$/)[1]);
  const vals = TYPE_STEPS.map(k => maxRem(sc[k]));
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] > vals[i - 1], TYPE_STEPS[i]);
});

test('spaceScale : 9 espacements proportionnels', () => {
  const sc = spaceScale(defaultTokens().space);
  assert.deepEqual(Object.keys(sc), SPACE_STEPS);
  assert.match(sc.m, /^clamp\(/);
});

test('tokensCss et CSS de base : variables présentes et titres branchés sur l’échelle', () => {
  const css = tokensCss(defaultTokens());
  assert.match(css, /--step-4xl:clamp\(/);
  assert.match(css, /--space-3xl:clamp\(/);
  const base = buildBaseCss(createSite().theme, defaultTokens());
  assert.match(base, /h1\{font-size:var\(--step-4xl\)/);
  assert.match(base, /body\{[^}]*font:400 var\(--step-base\)/);
});

test('setTypeTokens / setSpaceTokens : bornes et validation', () => {
  let s = createSite();
  s = setTypeTokens(s, { minSize: 15, maxSize: 99, maxRatio: 1.5 });
  assert.equal(s.tokens.type.minSize, 15);
  assert.equal(s.tokens.type.maxSize, 28);
  assert.equal(s.tokens.type.maxRatio, 1.5);
  assert.throws(() => setTypeTokens(s, { minRatio: 'abc' }), /ratio/i);
  s = setSpaceTokens(s, { minSize: 12, maxSize: 24 });
  assert.deepEqual(s.tokens.space, { minSize: 12, maxSize: 24 });
});

test('normalizeSite : un ancien projet reçoit tokens, presets et noms de palette', () => {
  const old = createSite();
  delete old.tokens; delete old.presets; delete old.defaultPresets; delete old.theme.paletteNames;
  const s = normalizeSite(old);
  assert.ok(s.tokens.type && s.tokens.space);
  assert.deepEqual(s.presets, {});
  assert.equal(s.theme.paletteNames.c1, 'Principale');
  assert.deepEqual(validateSite(s).errors, []);
});

/* ---------- Valeurs de style ---------- */
test('validateStyleValue : jetons size: et space:', () => {
  assert.equal(validateStyleValue('fontSize', 'size:xl'), 'size:xl');
  assert.equal(validateStyleValue('fontSize', 'size:huge'), null);
  assert.equal(validateStyleValue('paddingTop', 'space:m'), 'space:m');
  assert.equal(validateStyleValue('gap', 'space:2xl'), 'space:2xl');
  assert.equal(validateStyleValue('fontSize', 'space:m'), null);
  assert.equal(validateStyleValue('paddingTop', 'size:xl'), null);
});

test('validateStyleValue : clamp/min/max/calc sûrs acceptés', () => {
  for (const v of ['clamp(1rem, 2vw + 1rem, 3rem)', 'min(100%, 60ch)', 'max(24px, 3vw)', 'calc(100% - 2rem)', 'clamp(var(--space-s), 4vw, var(--space-xl))', 'calc(var(--step-xl) * 1.2)']) {
    assert.equal(validateStyleValue('maxWidth', v), v, v);
  }
});

test('validateStyleValue : expressions dangereuses ou mal formées refusées', () => {
  for (const v of ['clamp(1rem;color:red, 2vw, 3rem)', 'calc(1px) }body{display:none', 'min(1px, url(x))', 'clamp(1rem, 2vw', 'var(--evil)', 'calc(expression(alert(1)))', 'max(1px,2px))', 'calc(' + '1px + '.repeat(40) + '1px)']) {
    assert.equal(validateStyleValue('maxWidth', v), null, v);
  }
});

test('compileNodeCss : jetons traduits en variables CSS', () => {
  let h = createNode('heading');
  h = setStyle(h, h.id, 'desktop', 'fontSize', 'size:3xl');
  h = setStyle(h, h.id, 'mobile', 'marginBottom', 'space:s');
  const css = compileNodeCss(h, { target: () => '.heading' });
  assert.ok(css.includes('font-size:var(--step-3xl)'), css);
  assert.ok(css.includes('margin-bottom:var(--space-s)'), css);
});

/* ---------- Palette ---------- */
test('palette : jusqu’à 12 couleurs, noms modifiables, c1–c6 non supprimables', () => {
  assert.equal(PALETTE_KEYS.length, 12);
  let s = normalizeSite(createSite());
  let r = addPaletteColor(s, '#123abc');
  assert.equal(r.key, 'c7');
  s = setPaletteName(r.site, 'c7', 'Accent été');
  assert.equal(s.theme.paletteNames.c7, 'Accent été');
  assert.match(buildBaseCss(s.theme, s.tokens), /--c7:#123abc/);
  assert.throws(() => removePaletteColor(s, 'c2'), /ne peuvent pas/);
  s = removePaletteColor(s, 'c7');
  assert.ok(!('c7' in s.theme.palette));
  for (let i = 0; i < 6; i++) s = addPaletteColor(s, '#000000').site;
  assert.throws(() => addPaletteColor(s, '#000000'), /12/);
});

/* ---------- Presets ---------- */
test('presetFromNode : le style de l’élément devient le preset, l’élément y est lié', () => {
  let b = createNode('button');
  b = setStyle(b, b.id, 'desktop', 'background', 'palette:c3');
  b = setStyle(b, b.id, 'hover', 'transform', 'lift');
  const { site, pageId } = siteWith(b);
  const r = presetFromNode(site, pageId, b.id, 'Bouton sombre');
  const p = r.site.presets[r.id];
  assert.equal(p.name, 'Bouton sombre');
  assert.equal(p.type, 'button');
  assert.equal(p.style.desktop.background, 'palette:c3');
  const node = findNode(rootOf(r.site), b.id);
  assert.equal(node.preset, r.id);
  assert.deepEqual(node.style.desktop, {});
  assert.deepEqual(node.style.hover, {});
});

test('presetFromNode sur une colonne : la largeur reste sur la colonne', () => {
  const s0 = createSite();
  const sec = createSectionWithColumns(2, [8, 4]);
  const col = sec.children[0].children[0];
  let root = insertNode(rootOf(s0), rootOf(s0).id, sec);
  root = setStyle(root, col.id, 'desktop', 'paddingTop', '40px');
  const s = updatePageRoot(s0, s0.pages[0].id, root);
  const r = presetFromNode(s, s.pages[0].id, col.id, 'Colonne aérée');
  assert.equal(r.site.presets[r.id].style.desktop.span, undefined);
  assert.equal(findNode(rootOf(r.site), col.id).style.desktop.span, 8);
});

test('CSS : preset émis avant l’élément, l’élément l’emporte', () => {
  const b1 = createNode('button');
  let b2 = createNode('button');
  b2 = setStyle(b2, b2.id, 'desktop', 'background', '#ff0000');
  const { site, pageId } = siteWith(b1, b2);
  let r = createPreset(site, { name: 'Principal', type: 'button', style: { desktop: { background: 'palette:c2' } } });
  let s = setNodePreset(r.site, pageId, b1.id, r.id);
  s = setNodePreset(s, pageId, b2.id, r.id);
  const css = buildCss(s, s.pages);
  const pi = css.indexOf(`.p-${r.id} .btn{background-color:var(--c2)}`);
  const ni = css.indexOf(`.n-${b2.id} .btn{background-color:#ff0000}`);
  assert.ok(pi > 0 && ni > pi, 'ordre preset puis élément');
  const html = renderPage(s, s.pages[0], 'fr');
  assert.ok(html.includes(`n-${b1.id} p-${r.id}`));
});

test('setNodePreset : type incompatible refusé', () => {
  const h = createNode('heading');
  const { site, pageId } = siteWith(h);
  const r = createPreset(site, { name: 'B', type: 'button', style: {} });
  assert.throws(() => setNodePreset(r.site, pageId, h.id, r.id), /type/);
});

test('preset par défaut : appliqué aux éléments sans choix, pas à ceux marqués « aucun »', () => {
  const b1 = createNode('button');
  const b2 = createNode('button');
  const { site, pageId } = siteWith(b1, b2);
  let r = createPreset(site, { name: 'Défaut', type: 'button', style: { desktop: { borderRadius: '999px' } } });
  let s = setDefaultPreset(r.site, 'button', r.id);
  s = setNodePreset(s, pageId, b2.id, '-');
  assert.equal(effectivePreset(s, findNode(rootOf(s), b1.id)), r.id);
  assert.equal(effectivePreset(s, findNode(rootOf(s), b2.id)), null);
  assert.equal(presetUsage(s)[r.id], 1);
});

test('setPresetStyle : validation identique aux éléments', () => {
  const { site } = siteWith();
  const r = createPreset(site, { name: 'P', type: 'button', style: {} });
  let s = setPresetStyle(r.site, r.id, 'tablet', 'fontSize', 'size:lg');
  assert.equal(s.presets[r.id].style.tablet.fontSize, 'size:lg');
  assert.throws(() => setPresetStyle(s, r.id, 'desktop', 'fontSize', '12pt'), /invalide/);
  assert.throws(() => setPresetStyle(s, r.id, 'hover', 'fontSize', '12px'), /survol/);
  s = setPresetStyle(s, r.id, 'tablet', 'fontSize', '');
  assert.equal(s.presets[r.id].style.tablet.fontSize, undefined);
});

test('renommer, dupliquer, supprimer un preset (les éléments sont détachés et gardent l’apparence)', () => {
  const b = createNode('button');
  const { site, pageId } = siteWith(b);
  let r = createPreset(site, { name: 'A', type: 'button', style: { desktop: { color: 'palette:c6' } } });
  let s = setNodePreset(r.site, pageId, b.id, r.id);
  s = setDefaultPreset(s, 'button', r.id);
  s = renamePreset(s, r.id, '  Bouton A  ');
  assert.equal(s.presets[r.id].name, 'Bouton A');
  assert.throws(() => renamePreset(s, r.id, '   '), /nom/);
  const d = duplicatePreset(s, r.id);
  assert.equal(d.site.presets[d.id].name, 'Bouton A (copie)');
  s = deletePreset(d.site, r.id, { keepLook: true });
  assert.ok(!s.presets[r.id]);
  assert.equal(s.defaultPresets.button, undefined);
  const node = findNode(rootOf(s), b.id);
  assert.equal(node.preset, undefined);
  assert.equal(node.style.desktop.color, 'palette:c6');
});

test('validateSite : preset inconnu ou de mauvais type signalé', () => {
  const b = createNode('button');
  b.preset = 'p_absent';
  const { site } = siteWith(b);
  assert.ok(validateSite(normalizeSite(site)).errors.some(e => /preset/i.test(e)));
});

/* ---------- Couleurs hors palette ---------- */
test('colorUsages / replaceColor : éléments et presets, toutes pages et tous états', () => {
  let h = createNode('heading');
  h = setStyle(h, h.id, 'desktop', 'color', '#123456');
  h = setStyle(h, h.id, 'mobile', 'color', '#123456');
  let b = createNode('button');
  b = setStyle(b, b.id, 'hover', 'background', '#123456');
  const { site } = siteWith(h, b);
  const r = createPreset(site, { name: 'P', type: 'button', style: { desktop: { borderColor: 'rgb(1, 2, 3)' } } });
  const uses = colorUsages(r.site);
  assert.deepEqual(uses.find(u => u.value === '#123456').count, 3);
  assert.ok(uses.some(u => u.value === 'rgb(1, 2, 3)'));
  assert.ok(!uses.some(u => u.value.startsWith('palette:')));
  const s = replaceColor(r.site, '#123456', 'palette:c3');
  assert.ok(!colorUsages(s).some(u => u.value === '#123456'));
  assert.equal(findNode(rootOf(s), h.id).style.mobile.color, 'palette:c3');
  assert.throws(() => replaceColor(s, 'rgb(1, 2, 3)', 'url(x)'), /couleur/i);
});

/* ---------- CSS personnalisée ---------- */
test('sanitizeCustomCss : déclarations simples gardées, tout le reste refusé', () => {
  assert.equal(sanitizeCustomCss('outline: 3px solid red; filter: grayscale(1)'), 'outline:3px solid red;filter:grayscale(1)');
  for (const bad of ['color:red}body{display:none', 'background:url(https://x)', '@import x', 'a:b</style><script>', 'width: expression(1)', 'color: red /* x */', 'x:javascript:alert(1)']) {
    assert.throws(() => sanitizeCustomCss(bad), /CSS/, bad);
  }
  assert.throws(() => sanitizeCustomCss('a:b;'.repeat(200)), /600/);
});

test('CSS personnalisée émise sur l’élément', () => {
  let t = createNode('text');
  t = setAdvanced(t, t.id, { css: 'outline: 3px solid red' });
  assert.ok(compileNodeCss(t, {}).includes(`.n-${t.id}{outline:3px solid red}`));
});
