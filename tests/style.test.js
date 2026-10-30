import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStyleValue, compileNodeCss, STYLE_PROPS, HOVER_PROPS } from '../core/style.js';

const ctx = { asset: v => (v === 'asset:img1' ? 'assets/photo.webp' : null) };

test('longueurs : unités permises, auto, zéro, négatifs pour les marges', () => {
  for (const v of ['12px', '1.5rem', '2em', '50%', '100vh', '80vw', '0', 'auto']) assert.equal(validateStyleValue('marginTop', v), v, v);
  assert.equal(validateStyleValue('marginTop', '-20px'), '-20px');
  assert.equal(validateStyleValue('paddingTop', '-20px'), null);
  for (const bad of ['12', '12pt', 'calc(1px;color:red)', '12px;color:red', '1px}', 'expression(x)']) assert.equal(validateStyleValue('marginTop', bad), null, bad);
});

test('couleurs : hex, rgb(a), transparent, jetons de palette', () => {
  for (const v of ['#fff', '#A1B2C3', '#a1b2c380', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'transparent', 'palette:c3']) assert.ok(validateStyleValue('color', v), v);
  for (const bad of ['red;}', 'url(x)', 'rgb(1,2)', 'palette:c13', '#ggg', 'var(--x)']) assert.equal(validateStyleValue('color', bad), null, bad);
});

test('énumérations et nombres bornés', () => {
  assert.equal(validateStyleValue('textAlign', 'center'), 'center');
  assert.equal(validateStyleValue('textAlign', 'middle'), null);
  assert.equal(validateStyleValue('fontWeight', '700'), '700');
  assert.equal(validateStyleValue('opacity', '0.5'), '0.5');
  assert.equal(validateStyleValue('opacity', '2'), null);
  assert.equal(validateStyleValue('span', '6'), 6);
  assert.equal(validateStyleValue('span', '13'), null);
  assert.equal(validateStyleValue('transitionDuration', '300'), 300);
});

test('les propriétés de survol sont un sous-ensemble connu', () => {
  for (const k of HOVER_PROPS) assert.ok(STYLE_PROPS[k], k);
  assert.ok(HOVER_PROPS.includes('background'));
  assert.ok(!HOVER_PROPS.includes('fontSize'));
});

test('compilation ordinateur, tablette, mobile et survol', () => {
  const node = { id: 'n_x', type: 'heading', style: {
    desktop: { fontSize: '48px', color: 'palette:c1', marginBottom: '24px' },
    tablet: { fontSize: '40px' },
    mobile: { fontSize: '32px', textAlign: 'center' },
    hover: { color: '#ff0000' }
  } };
  const css = compileNodeCss(node, ctx);
  assert.match(css, /\.n-n_x\{font-size:48px;color:var\(--c1\);margin-bottom:24px\}/);
  assert.match(css, /@media \(max-width:1024px\)\{\.n-n_x\{font-size:40px\}\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.n-n_x\{font-size:32px;text-align:center\}\}/);
  assert.match(css, /\.n-n_x:hover\{color:#ff0000\}/);
});

test('héritage : un appareil sans réglage n’émet rien', () => {
  const css = compileNodeCss({ id: 'n_y', type: 'text', style: { desktop: { color: '#111' }, tablet: {}, mobile: {}, hover: {} } }, ctx);
  assert.doesNotMatch(css, /@media/);
});

test('une valeur invalide stockée est ignorée à la compilation', () => {
  const css = compileNodeCss({ id: 'n_z', type: 'text', style: { desktop: { color: 'red;}body{display:none', fontSize: '20px' } } }, ctx);
  assert.equal(css, '.n-n_z{font-size:20px}');
});

test('colonnes : span vers grid-column, image de fond via ressource connue uniquement', () => {
  const css = compileNodeCss({ id: 'c', type: 'column', style: { desktop: { span: 4, backgroundImage: 'asset:img1' }, mobile: { span: 12 } } }, ctx);
  assert.match(css, /\.n-c\{grid-column:span 4;background-image:url\("assets\/photo\.webp"\)\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.n-c\{grid-column:span 12\}\}/);
  const bad = compileNodeCss({ id: 'd', type: 'section', style: { desktop: { backgroundImage: 'javascript:x' } } }, ctx);
  assert.equal(bad, '');
});

test('préréglages d’ombre, de transformation et transition', () => {
  const css = compileNodeCss({ id: 'b', type: 'button', style: { desktop: { boxShadow: 'md', transitionDuration: 250 }, hover: { transform: 'lift' } } }, ctx);
  assert.match(css, /box-shadow:0 6px 18px -6px rgb\(0 0 0 \/ \.25\)/);
  assert.match(css, /transition:all 250ms ease/);
  assert.match(css, /:hover\{transform:translateY\(-4px\)\}/);
});

test('masquer par appareil', () => {
  const css = compileNodeCss({ id: 'h', type: 'text', style: {}, advanced: { hideOn: { desktop: true, mobile: true } } }, ctx);
  assert.match(css, /@media \(min-width:1025px\)\{\.n-h\{display:none!important\}\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.n-h\{display:none!important\}\}/);
});

test('dans le canevas, un élément masqué reste visible mais estompé', () => {
  const css = compileNodeCss({ id: 'h', type: 'text', style: {}, advanced: { hideOn: { desktop: true } } }, { canvas: true });
  assert.match(css, /@media \(min-width:1025px\)\{\.n-h\{opacity:\.3!important/);
  assert.doesNotMatch(css, /display:none/);
});

test('cible de style d’un widget : le bouton reçoit les couleurs, le conteneur les marges', () => {
  const css = compileNodeCss({ id: 'k', type: 'button', style: { desktop: { background: '#000', marginTop: '10px', textAlign: 'center' } } }, ctx);
  assert.match(css, /\.n-k\{margin-top:10px;text-align:center\}/);
  assert.match(css, /\.n-k \.btn\{background-color:#000\}/);
});

test('titre et image : la typographie vise la balise intérieure, les marges restent sur le conteneur', async () => {
  const { REGISTRY } = await import('../core/widgets.js');
  const target = type => REGISTRY[type]?.styleTarget || '';
  const css = compileNodeCss({ id: 't', type: 'heading', style: { desktop: { fontSize: '80px', marginBottom: '8px' } } }, { target });
  assert.match(css, /\.n-t\{margin-bottom:8px\}/);
  assert.match(css, /\.n-t \.heading\{font-size:80px\}/);
  const img = compileNodeCss({ id: 'i', type: 'image', style: { desktop: { borderRadius: '20px', maxWidth: '50%' } } }, { target });
  assert.match(img, /\.n-i\{max-width:50%\}/);
  assert.match(img, /\.n-i img\{border-radius:20px\}/);
});
