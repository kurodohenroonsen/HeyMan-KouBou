import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdToHtml, slugger } from '../tools/md.mjs';

test('titres : niveaux, ancres à la GitHub (accents, japonais, doublons)', () => {
  const slug = slugger();
  assert.equal(slug('2.5 Écrire un texte dans la page'), '25-écrire-un-texte-dans-la-page');
  assert.equal(slug('Codes de ce chapitre'), 'codes-de-ce-chapitre');
  assert.equal(slug('Codes de ce chapitre'), 'codes-de-ce-chapitre-1');
  assert.equal(slug('2.17 左右のパネルを広げる'), '217-左右のパネルを広げる');
  assert.equal(slug('`ui.lang` et **gras**'), 'uilang-et-gras');
  const { html, headings } = mdToHtml('# Titre\n\n## 1.1 Démarrer\n\n### Détail');
  assert.match(html, /<h1 id="titre">Titre<\/h1>/);
  assert.match(html, /<h2 id="11-démarrer">1\.1 Démarrer<\/h2>/);
  assert.deepEqual(headings.map(h => [h.level, h.text]), [[1, 'Titre'], [2, '1.1 Démarrer'], [3, 'Détail']]);
});

test('paragraphes, gras, italique, code, liens, échappement du HTML', () => {
  const { html } = mdToHtml('Un **gras**, une *italique*, du `code <b>`, un [lien](02-edition.md#22-sélectionner) et <script>alert(1)</script>.');
  assert.match(html, /<p>Un <strong>gras<\/strong>, une <em>italique<\/em>, du <code>code &lt;b&gt;<\/code>, un <a href="02-edition\.html#22-sélectionner">lien<\/a> et &lt;script&gt;alert\(1\)&lt;\/script&gt;\.<\/p>/);
  assert.match(mdToHtml('[x](https://example.org/a.md)').html, /href="https:\/\/example\.org\/a\.md"/, 'lien externe inchangé');
  assert.match(mdToHtml('[j](../journaux/a.log)').html, /href="\.\.\/journaux\/a\.log"/);
  assert.doesNotMatch(mdToHtml('[x](javascript:alert(1))').html, /javascript:/, 'liens javascript: refusés');
});

test('listes (numérotées, imbriquées), citations, séparateurs', () => {
  const { html } = mdToHtml('1. un\n2. deux\n   - sous\n\n- a\n- b\n\n> note **importante**\n\n---');
  assert.match(html, /<ol><li>un<\/li><li>deux<ul><li>sous<\/li><\/ul><\/li><\/ol>/);
  assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(html, /<blockquote><p>note <strong>importante<\/strong><\/p><\/blockquote>/);
  assert.match(html, /<hr>/);
});

test('tableaux : en-têtes, cellules, colonne « Journal » marquée technique', () => {
  const { html } = mdToHtml('| Situation | Message | Journal |\n|---|---|---|\n| Clic | « ok » | `page.add` (INFO) |');
  assert.match(html, /<table><thead><tr><th>Situation<\/th><th>Message<\/th><th class="tech-col">Journal<\/th><\/tr><\/thead><tbody><tr><td>Clic<\/td><td>« ok »<\/td><td class="tech-col"><code>page\.add<\/code> \(INFO\)<\/td><\/tr><\/tbody><\/table>/);
  assert.match(mdToHtml('| Situation | Log |\n|---|---|\n| a | b |').html, /class="tech-col">Log/);
  assert.match(mdToHtml('| 状況 | ログ |\n|---|---|\n| a | b |').html, /class="tech-col">ログ/);
});

test('blocs de code : journal replié (technique), autres blocs gardés', () => {
  const { html } = mdToHtml('```log\n12:00 INFO page.add <x>\n```\n\n```js\nautotest()\n```', { techLabel: 'Détails techniques : journal attendu' });
  assert.match(html, /<details class="tech"><summary>Détails techniques : journal attendu<\/summary><pre class="log"><code>12:00 INFO page\.add &lt;x&gt;<\/code><\/pre><\/details>/);
  assert.match(html, /<pre class="lang-js"><code>autotest\(\)<\/code><\/pre>/);
});

test('sections « Codes de ce chapitre » marquées techniques', () => {
  const { html } = mdToHtml('## 1.1 A\n\ntexte\n\n## Codes de ce chapitre\n\n| Code | Niveau |\n|---|---|\n| `a.b` | INFO |\n\n## Autre');
  assert.match(html, /<section class="tech-section"><h2 id="codes-de-ce-chapitre">Codes de ce chapitre<\/h2>[\s\S]*<\/section><h2 id="autre">/);
  assert.match(mdToHtml('## Codes in this chapter\n\nx').html, /tech-section/);
  assert.match(mdToHtml('## この章のコード\n\nx').html, /tech-section/);
});

test('images : ![texte](chemin) avec texte alternatif', () => {
  assert.match(mdToHtml('![L’éditeur en anglais](captures/en/editeur.png)').html, /<p><img src="captures\/en\/editeur\.png" alt="L’éditeur en anglais" loading="lazy"><\/p>/);
});

test('paragraphes « Journal attendu », « À vérifier » : techniques', () => {
  assert.match(mdToHtml('**Journal attendu** ([journaux/a.log](journaux/a.log))').html, /<p class="tech-p">/);
  assert.match(mdToHtml('**À vérifier** : `x`').html, /<p class="tech-p">/);
  assert.match(mdToHtml('**想定されるログ**（a）').html, /<p class="tech-p">/);
  assert.match(mdToHtml('**Étapes** : clique').html, /<p><strong>/, 'les étapes restent visibles');
});
