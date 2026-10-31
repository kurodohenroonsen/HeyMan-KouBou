/* Cycle 30 : icônes SVG monochromes de l'interface (barre du haut, inspecteur, barres d'outils). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UI_ICONS, uiIcon, ICONS, iconSvg } from '../core/icons.js';

const NEEDED = ['undo', 'redo', 'desktop', 'tablet', 'mobile', 'translate', 'seo', 'sparkle', 'users', 'comment', 'help', 'bug', 'rocket', 'download',
  'panels', 'zoom-in', 'zoom-out', 'fit', 'parent', 'move', 'duplicate', 'delete', 'brush', 'paste', 'link', 'list-ul', 'list-ol', 'clear', 'lock', 'unlock', 'free', 'format', 'expert'];

test('toutes les icônes de l’interface existent, en trait monochrome 24×24', () => {
  for (const n of NEEDED) {
    assert.ok(UI_ICONS[n], `icône ${n}`);
    const svg = uiIcon(n);
    assert.match(svg, /^<svg class="ico"[^>]*viewBox="0 0 24 24"[^>]*aria-hidden="true"[^>]*>/, n);
    assert.match(svg, /stroke="currentColor"/, `${n} : couleur du texte`);
    assert.doesNotMatch(svg, /fill="(?!none)[^"]+"/, `${n} : pas de couleur fixe`);
    assert.doesNotMatch(svg, /<text|\p{L}{3,}(?![^<]*>)/u, `${n} : aucun texte dans l’icône`);
  }
});

test('uiIcon : taille réglable, nom inconnu → point', () => {
  assert.match(uiIcon('undo', 14), /width="14" height="14"/);
  assert.match(uiIcon('nimporte'), /<circle/);
  assert.ok(ICONS.users && iconSvg('users').includes('aria-hidden="true"'), 'les icônes des widgets restent');
});
