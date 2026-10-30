/* Chaque code de journal écrit dans le source (navigateur, PHP, site publié) est valide et documenté dans docs/guide/. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validCode } from '../core/log.js';
import { siteScript } from '../core/render.js';
import { codesIn, sourceFiles } from '../tools/log-codes.mjs';

const root = new URL('..', import.meta.url).pathname;
const files = sourceFiles(root);

const guideDir = join(root, 'docs', 'guide');
const guide = existsSync(guideDir) ? readdirSync(guideDir).filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'index-codes.md').map(f => readFileSync(join(guideDir, f), 'utf8')).join('\n') : '';
const documented = c => guide.includes(c);

test('codes de journal valides (domaine.action)', () => {
  const bad = [];
  for (const f of files) for (const c of codesIn(readFileSync(join(root, f), 'utf8')).codes) if (!validCode(c)) bad.push(`${f} : ${c}`);
  assert.deepEqual(bad, []);
});

test('chaque code de journal est documenté dans docs/guide/', () => {
  const missing = [];
  for (const f of files) {
    const { codes, alternatives } = codesIn(readFileSync(join(root, f), 'utf8'));
    for (const c of codes) if (!documented(c)) missing.push(`${f} : ${c}`);
    for (const alts of alternatives) if (!alts.some(documented)) missing.push(`${f} : ${alts.join(' | ')}`);
  }
  assert.deepEqual([...new Set(missing)], [], `${missing.length} code(s) à documenter`);
});

test('site publié : le journal est le premier script et reste muet sans ?atelier-debug', () => {
  const js = siteScript();
  assert.ok(js.startsWith('(function(){var D=false'), 'journal en premier');
  assert.match(js, /atelier-debug/);
  assert.match(js, /if\(!D\|\|!window\.console\)return;/);
});

test('le repérage des codes fonctionne (parcours et étapes)', () => {
  const { codes, alternatives } = codesIn(`const f = log.flow('a.b', 'x'); f.step('c', 'y'); f.warn('d', 'z'); log.info('e.f', 'g'); alog('warn', 'php.x', 'm');`);
  assert.deepEqual(codes.sort(), ['a.b.fail', 'a.b.ok', 'a.b.start', 'e.f', 'php.x'].sort());
  assert.deepEqual(alternatives, [['a.b.c'], ['a.b.d']]);
  const t2 = codesIn(`const g = poster ? log.flow('x.poster', 'a') : log.flow('x.paste', 'b'); g.step('read', 'r');`);
  assert.ok(t2.codes.includes('x.paste.ok') && t2.codes.includes('x.poster.start'));
  assert.deepEqual(t2.alternatives, [['x.poster.read', 'x.paste.read']]);
});
