/*
 * Cycle 25 (S1) : aucun innerHTML / insertAdjacentHTML de editor/ ou core/ ne reçoit un texte du projet sans assainisseur.
 * Règle : la ligne (ou la ligne juste avant) contient sanitizeRich(, sanitizeInline( ou escapeHtml(, ou bien la valeur écrite
 * est une chaîne littérale sans interpolation. Les autres cas sont dans une liste blanche explicite et justifiée, qui doit
 * correspondre exactement à une ligne du source (une entrée périmée fait échouer le test).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const files = ['editor', 'core'].flatMap(d => readdirSync(join(root, d)).filter(f => f.endsWith('.js')).map(f => `${d}/${f}`));

const SINK = /\.(innerHTML|outerHTML)\s*=(?!=)|\.insertAdjacentHTML\(/;
const SANITIZER = /\b(sanitizeRich|sanitizeInline|escapeHtml)\(/;
/* Valeur écrite = une chaîne littérale sans interpolation (« <span class=…></span> » du cadre de sélection, par exemple) */
const LITERAL = /\.(innerHTML|outerHTML)\s*=\s*(?:'[^'\n]*'|"[^"\n]*"|`[^`$]*`)\s*;/;

const ALLOWED = [
  { file: 'editor/canvas.js', line: 'ui.innerHTML = `<div id="atelier-hover" class="ab ab--hover">', why: 'gabarit fixe de l’interface du canevas (cadres, barre d’outils) : seules des infobulles de l’éditeur passées par attr() y sont insérées, jamais un texte du projet' },
  { file: 'editor/inline.js', line: "ui.insertAdjacentHTML('beforeend', TOOLBAR);", why: 'TOOLBAR : gabarit constant de la barre de mise en forme, dont les libellés de l’interface sont échappés par escapeHtml à la construction' },
  { file: 'editor/inline.js', line: "box.querySelector('.fmt-ai-text').innerHTML = html;", why: 'aiOut : le HTML est construit par ses deux appelants avec escapeHtml sur chaque morceau de texte (propositions de l’IA), le texte du projet n’y entre jamais tel quel' }
];

function sinks(src) {
  const lines = src.split('\n');
  const out = [];
  lines.forEach((l, i) => { if (SINK.test(l) && !/^\s*(\/\*|\*|\/\/)/.test(l)) out.push({ n: i + 1, line: l, prev: lines[i - 1] || '' }); });
  return out;
}

test('core/ : aucun innerHTML ni insertAdjacentHTML (logique sans DOM)', () => {
  const found = files.filter(f => f.startsWith('core/')).flatMap(f => sinks(readFileSync(join(root, f), 'utf8')).map(s => `${f}:${s.n}`));
  assert.deepEqual(found, []);
});

test('editor/ : chaque innerHTML est précédé d’un assainisseur, ou écrit une constante, ou est dans la liste blanche', () => {
  const bad = [];
  const used = new Set();
  for (const f of files.filter(x => x.startsWith('editor/'))) {
    for (const s of sinks(readFileSync(join(root, f), 'utf8'))) {
      const allowed = ALLOWED.find(a => a.file === f && s.line.includes(a.line));
      if (allowed) { used.add(allowed); continue; }
      if (SANITIZER.test(s.line) || SANITIZER.test(s.prev) || LITERAL.test(s.line)) continue;
      bad.push(`${f}:${s.n} ${s.line.trim()}`);
    }
  }
  assert.deepEqual(bad, [], 'innerHTML sans assainisseur');
  assert.deepEqual(ALLOWED.filter(a => !used.has(a)).map(a => `${a.file} : ${a.line}`), [], 'entrée de la liste blanche périmée');
});

test('la liste blanche est justifiée et ne cite pas un texte du projet', () => {
  for (const a of ALLOWED) assert.ok(a.why.length > 40, `${a.file} : justification trop courte`);
  const seen = new Set();
  for (const a of ALLOWED) { const k = `${a.file}|${a.line}`; assert.ok(!seen.has(k), 'doublon'); seen.add(k); }
});

test('le tableau des traductions passe par sanitizeInline / sanitizeRich selon le type du texte', () => {
  const src = readFileSync(join(root, 'editor/i18n-ui.js'), 'utf8');
  assert.match(src, /it\.kind === 'inline' \? sanitizeInline\(v\) : sanitizeRich\(v\)/);
  assert.ok(!/el\.innerHTML = v;/.test(src), 'plus de innerHTML = v brut');
});
