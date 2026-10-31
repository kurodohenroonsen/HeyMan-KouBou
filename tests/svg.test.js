/* Cycle 33 (W4) : assainissement des SVG importés (logo, pictogrammes) — core/svg.js. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg } from '../core/svg.js';

const clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"><stop offset="0" stop-color="#c00"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/><use href="#g"/></svg>';

test('un SVG propre est conservé tel quel', () => {
  const r = sanitizeSvg(clean);
  assert.equal(r.svg, clean);
  assert.deepEqual(r.removed, []);
});

test('script, gestionnaires on*, foreignObject retirés', () => {
  const r = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><script href="x.js"/><foreignObject><iframe src="https://evil"></iframe></foreignObject><circle r="4" ONclick=\'x()\' onmouseover=y() fill="red"/></svg>');
  assert.doesNotMatch(r.svg, /script|onload|onclick|onmouseover|foreignObject|iframe|alert/i);
  assert.match(r.svg, /<circle r="4" fill="red"\/>/);
  assert.deepEqual([...new Set(r.removed)].sort(), ['foreignObject', 'on*', 'script']);
});

test('liens externes et javascript: retirés, ancres internes et images data gardées', () => {
  const r = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a href="javascript:alert(1)"><text>x</text></a><use xlink:href="https://evil.example/s.svg#a"/><use href="#ok"/><image href="data:image/png;base64,AAAA"/><image xlink:href="http://x/y.png"/></svg>');
  assert.doesNotMatch(r.svg, /javascript|evil|http:\/\/x/);
  assert.match(r.svg, /<use href="#ok"\/>/);
  assert.match(r.svg, /href="data:image\/png;base64,AAAA"/);
  assert.ok(r.removed.includes('href'));
});

test('entités externes (DOCTYPE) retirées ; un fichier qui n’est pas un SVG est refusé', () => {
  const r = sanitizeSvg('<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&x;</text></svg>');
  assert.doesNotMatch(r.svg, /DOCTYPE|ENTITY|passwd|&x;/);
  assert.ok(r.removed.includes('doctype'));
  assert.throws(() => sanitizeSvg('<html><body>x</body></html>'), /SVG/);
  assert.throws(() => sanitizeSvg(''), /SVG/);
});

test('styles : @import et url() externes retirés', () => {
  const r = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil/x.css); rect{fill:url(https://evil/p.svg#a)} circle{fill:url(#g)}</style><rect style="fill:url(http://evil/z)"/></svg>');
  assert.doesNotMatch(r.svg, /evil|@import/);
  assert.match(r.svg, /url\(#g\)/);
});
