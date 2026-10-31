import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStyleValue, compileNodeCss, STYLE_PROPS, HOVER_PROPS, LENGTH_UNITS, parseLength, formatLength, lengthFromInput, stepLength, isFreeLength, linkedBox, boxLinkedDefault, paletteName, colorLabel, parseColorInput, SIMPLE_GROUPS, isExpertKey } from '../core/style.js';

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

/* ---------- Cycle 30 : champs nombre + unité, côtés liés, noms de palette, mode simple ---------- */
test('parseLength : nombre + unité, zéro, négatif ; valeurs libres → null', () => {
  assert.deepEqual(parseLength('0.85rem'), { n: 0.85, unit: 'rem' });
  assert.deepEqual(parseLength('24px'), { n: 24, unit: 'px' });
  assert.deepEqual(parseLength('-8px'), { n: -8, unit: 'px' });
  assert.deepEqual(parseLength('50%'), { n: 50, unit: '%' });
  assert.deepEqual(parseLength('0'), { n: 0, unit: 'px' });
  for (const free of ['clamp(1rem, 3vw, 2rem)', 'auto', 'size:xl', 'space:m', 'var(--x)', '', undefined, '12pt']) assert.equal(parseLength(free), null, String(free));
  assert.deepEqual(LENGTH_UNITS, ['px', 'rem', 'em', '%', 'vh', 'vw']);
});

test('formatLength : arrondi, unité par défaut px', () => {
  assert.equal(formatLength(24), '24px');
  assert.equal(formatLength(0.85, 'rem'), '0.85rem');
  assert.equal(formatLength(1 / 3, 'em'), '0.333em');
  assert.equal(formatLength(-0, 'px'), '0px');
});

test('lengthFromInput : un nombre tapé prend l’unité choisie ; « 24px » est compris ; le reste passe tel quel', () => {
  assert.equal(lengthFromInput('24', 'px'), '24px');
  assert.equal(lengthFromInput('1,5', 'rem'), '1.5rem');
  assert.equal(lengthFromInput(' 24px ', 'rem'), '24px');
  assert.equal(lengthFromInput('0.85 rem', 'px'), '0.85rem');
  assert.equal(lengthFromInput('0', 'px'), '0');
  assert.equal(lengthFromInput('-20', 'px'), '-20px');
  assert.equal(lengthFromInput('auto', 'px'), 'auto');
  assert.equal(lengthFromInput('clamp(1rem, 3vw, 2rem)', 'px'), 'clamp(1rem, 3vw, 2rem)');
  assert.equal(lengthFromInput('12pt', 'px'), '12pt', 'refusé ensuite par validateStyleValue');
  assert.equal(lengthFromInput('', 'px'), '');
});

test('stepLength : ↑↓ = ±1 (Maj ±10) en px, ±0,1 (Maj ±1) en rem/em ; borne basse ; valeur libre → null', () => {
  assert.equal(stepLength('24px', 1), '25px');
  assert.equal(stepLength('24px', -1), '23px');
  assert.equal(stepLength('24px', 1, { big: true }), '34px');
  assert.equal(stepLength('0.85rem', 1), '0.95rem');
  assert.equal(stepLength('0.85rem', -1, { big: true }), '0rem', 'borne 0 par défaut');
  assert.equal(stepLength('-8px', -1, { min: -Infinity }), '-9px');
  assert.equal(stepLength('', 1, { unit: 'px' }), '1px', 'vide : part de 0 dans l’unité choisie');
  assert.equal(stepLength('0', 1), '1px');
  assert.equal(stepLength('clamp(1rem, 3vw, 2rem)', 1), null);
  assert.equal(stepLength('auto', 1), null);
});

test('isFreeLength : clamp(), auto, jetons sont des valeurs libres ; nombres et vide non', () => {
  for (const v of ['clamp(1rem, 3vw, 2rem)', 'auto', 'size:xl', 'min(100%, 20ch)']) assert.ok(isFreeLength(v), v);
  for (const v of ['24px', '0', '', undefined, '1.5rem']) assert.ok(!isFreeLength(v), String(v));
});

test('côtés liés : les quatre côtés reçoivent la même valeur ; liaison par défaut selon les valeurs', () => {
  assert.deepEqual(linkedBox('margin', '24px'), { marginTop: '24px', marginRight: '24px', marginBottom: '24px', marginLeft: '24px' });
  assert.deepEqual(Object.keys(linkedBox('padding', '')), ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']);
  assert.equal(boxLinkedDefault('padding', {}), true, 'espacement intérieur vide : lié');
  assert.equal(boxLinkedDefault('padding', { paddingTop: '8px', paddingRight: '8px', paddingBottom: '8px', paddingLeft: '8px' }), true);
  assert.equal(boxLinkedDefault('padding', { paddingTop: '8px', paddingBottom: '16px' }), false);
  assert.equal(boxLinkedDefault('margin', {}), false, 'marges vides : libres (haut et bas se règlent souvent seuls)');
  assert.equal(boxLinkedDefault('margin', { marginTop: '0', marginRight: '0', marginBottom: '0', marginLeft: '0' }), true);
});

test('noms de palette : « Couleur principale » à l’écran, palette:c1 dans le modèle', () => {
  const names = { c1: 'Principale', c2: 'Secondaire', c3: 'Texte', c4: 'Fond', c5: 'Discrète', c6: 'Surface', c7: 'Rouge MAB', c8: 'Couleur 8' };
  assert.equal(paletteName(names, 'c1'), 'Principale');
  assert.equal(paletteName(names, 'c7'), 'Rouge MAB');
  assert.equal(paletteName({}, 'c9'), 'c9');
  assert.equal(colorLabel('palette:c1', names), 'Couleur principale');
  assert.equal(colorLabel('palette:c3', names), 'Couleur du texte');
  assert.equal(colorLabel('palette:c7', names), 'Rouge MAB');
  assert.equal(colorLabel('palette:c8', names), 'Couleur 8');
  assert.equal(colorLabel('#bbbbbb', names), '#bbbbbb');
  assert.equal(colorLabel('transparent', names), 'Transparent');
  assert.equal(colorLabel('', names), '');
  assert.equal(parseColorInput('Couleur principale', names), 'palette:c1');
  assert.equal(parseColorInput('couleur du TEXTE', names), 'palette:c3');
  assert.equal(parseColorInput('rouge mab', names), 'palette:c7');
  assert.equal(parseColorInput('Principale', names), 'palette:c1', 'le nom court suffit');
  assert.equal(parseColorInput('palette:c2', names), 'palette:c2');
  assert.equal(parseColorInput(' #ABCDEF ', names), '#ABCDEF');
  assert.equal(parseColorInput('transparent', names), 'transparent');
});

test('mode simple : typographie, fond, espacement, bordure ; le reste est expert', () => {
  assert.deepEqual(SIMPLE_GROUPS, ['Typographie', 'Fond', 'Espacement', 'Bordure']);
  for (const k of ['fontSize', 'color', 'background', 'marginTop', 'paddingLeft', 'borderRadius', 'boxShadow']) assert.ok(!isExpertKey(k), k);
  for (const k of ['maxWidth', 'span', 'gap', 'opacity', 'reveal', 'transitionDuration']) assert.ok(isExpertKey(k), k);
});
