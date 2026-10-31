import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRich, sanitizeInline, richToText } from '../core/sanitize.js';

test('garde la liste blanche et normalise b/i vers strong/em', () => {
  assert.equal(sanitizeRich('<p>Un <b>gras</b> et <i>italique</i> <u>souligné</u></p>'), '<p>Un <strong>gras</strong> et <em>italique</em> <u>souligné</u></p>');
  assert.equal(sanitizeRich('<ul><li>a</li><li>b</li></ul>'), '<ul><li>a</li><li>b</li></ul>');
});

test('retire scripts, styles, iframes et leur contenu', () => {
  assert.equal(sanitizeRich('<p>a<script>alert(1)</script>b</p>'), '<p>ab</p>');
  assert.equal(sanitizeRich('<style>p{}</style><p>x</p><iframe src="//e"></iframe>'), '<p>x</p>');
  assert.equal(sanitizeRich('<p>x</p><svg><script>1</script></svg><!-- c -->'), '<p>x</p>');
});

test('supprime tous les attributs sauf href filtré', () => {
  assert.equal(sanitizeRich('<p onclick="x" style="color:red" class="a">t</p>'), '<p>t</p>');
  assert.equal(sanitizeRich('<a href="https://mab.be" target="_blank" onmouseover="x">l</a>'), '<a href="https://mab.be">l</a>');
  assert.equal(sanitizeRich('<a href="javascript:alert(1)">l</a>'), '<a href="#">l</a>');
  assert.equal(sanitizeRich('<a href="jav&#x61;script:alert(1)">l</a>'), '<a href="#">l</a>');
  assert.equal(sanitizeRich("<a href='mailto:a@b.be'>m</a>"), '<a href="mailto:a@b.be">m</a>');
});

test('div devient p, span disparaît, balises inconnues gardent leur texte', () => {
  assert.equal(sanitizeRich('<div>un</div><div>deux</div>'), '<p>un</p><p>deux</p>');
  assert.equal(sanitizeRich('<p><span style="x">t</span><font>f</font></p>'), '<p>tf</p>');
});

test('ferme les balises ouvertes et ignore les fermetures orphelines', () => {
  assert.equal(sanitizeRich('<p><strong>a'), '<p><strong>a</strong></p>');
  assert.equal(sanitizeRich('a</em>b'), 'ab');
  assert.equal(sanitizeRich('<p><strong>a</p>b'), '<p><strong>a</strong></p>b');
});

test('entités : décodées puis ré-échappées proprement', () => {
  assert.equal(sanitizeRich('<p>a &amp; b &lt;c&gt; &eacute; &#233; &#xE9;</p>'), '<p>a &amp; b &lt;c&gt; é é é</p>');
  assert.equal(sanitizeRich('<p>&lt;script&gt;</p>'), '<p>&lt;script&gt;</p>');
});

test('br et texte brut', () => {
  assert.equal(sanitizeRich('a<br>b<br/>c'), 'a<br>b<br>c');
  assert.equal(sanitizeRich('5 < 6 et 7 > 3'), '5 &lt; 6 et 7 &gt; 3');
});

test('sanitizeInline n’autorise pas de blocs : paragraphes deviennent des sauts de ligne', () => {
  assert.equal(sanitizeInline('<p>Un</p><p><b>Deux</b></p>'), 'Un<br><strong>Deux</strong>');
  assert.equal(sanitizeInline('<ul><li>x</li></ul>'), 'x');
});

test('richToText extrait le texte lisible', () => {
  assert.equal(richToText('<p>Un <strong>mot</strong></p><p>Deux &amp; trois</p>'), 'Un mot Deux & trois');
  assert.equal(richToText('<h2>Titre</h2><blockquote>Mot</blockquote><p>fin</p>'), 'Titre Mot fin');
});

/* ---------- Cycle 30 : intertitres, citation, exposant, listes imbriquées, collage Word ---------- */
test('h2, h3, blockquote, sup et sub sont gardés ; h1 et h4-h6 ramenés à h2/h3', () => {
  assert.equal(sanitizeRich('<h2>Titre</h2><h3>Sous-titre</h3><blockquote>Une <em>citation</em></blockquote><p>E = mc<sup>2</sup>, H<sub>2</sub>O</p>'),
    '<h2>Titre</h2><h3>Sous-titre</h3><blockquote>Une <em>citation</em></blockquote><p>E = mc<sup>2</sup>, H<sub>2</sub>O</p>');
  assert.equal(sanitizeRich('<h1>Grand</h1><h4>Petit</h4><h6>Minuscule</h6>'), '<h2>Grand</h2><h3>Petit</h3><h3>Minuscule</h3>');
  assert.equal(sanitizeRich('<h2 class="x" style="color:red" onclick="a()">t</h2>'), '<h2>t</h2>');
  assert.equal(sanitizeInline('<h2>Un</h2><blockquote>Deux</blockquote><p>x<sup>2</sup></p>'), 'Un<br>Deux<br>x<sup>2</sup>');
});

test('listes imbriquées gardées, paragraphes dans les items tolérés', () => {
  assert.equal(sanitizeRich('<ul><li>a<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>'), '<ul><li>a<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>');
  assert.equal(sanitizeRich('<ol><li><p>un</p></li><li><p>deux</p></li></ol>'), '<ol><li><p>un</p></li><li><p>deux</p></li></ol>');
});

test('rel="noopener" sur les liens externes au rendu seulement', () => {
  const html = '<p><a href="https://exemple.be">ext</a> <a href="mailto:a@b.be">mail</a> <a href="#haut">ancre</a> <a href="tel:+3260123456">tél</a></p>';
  assert.equal(sanitizeRich(html), html, 'le modèle ne garde que href');
  assert.equal(sanitizeRich(html, { noopener: true }), '<p><a href="https://exemple.be" rel="noopener">ext</a> <a href="mailto:a@b.be">mail</a> <a href="#haut">ancre</a> <a href="tel:+3260123456">tél</a></p>');
  assert.equal(sanitizeRich('<a href="https://x.be" rel="x" target="_blank">l</a>', { noopener: true }), '<a href="https://x.be" rel="noopener">l</a>', 'rel et target d’origine ignorés');
});

/* Extrait typique d'un collage depuis Word (classes Mso, mso-list, <o:p>, commentaires conditionnels) */
const WORD = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta name=Generator content="Microsoft Word 15"><style><!-- p.MsoNormal{margin:0cm} --></style><!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]--></head>
<body lang=FR-BE style='tab-interval:35.4pt'><!--StartFragment-->
<h1 style='mso-margin-top-alt:auto'><span style='font-size:16.0pt'>Programme<o:p></o:p></span></h1>
<p class=MsoNormal>Le <b>samedi</b>, nous <i>accueillons</i> le public&nbsp;: <a href="https://www.mab.be/agenda">voir l’agenda</a>.<o:p></o:p></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Premier point<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='margin-left:72.0pt;text-indent:-18.0pt;mso-list:l0 level2 lfo1'><![if !supportLists]><span style='font-family:"Courier New"'><span style='mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span></span><![endif]>Sous-point <b>important</b><o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><!--[if !supportLists]--><span style='font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><!--[endif]-->Second point<o:p></o:p></p>
<p class=MsoListParagraph style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span><![endif]>Étape une<o:p></o:p></p>
<p class=MsoListParagraph style='text-indent:-18.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span><![endif]>Étape deux<o:p></o:p></p>
<p class=MsoQuote style='margin-left:36.0pt'><i>Une citation en retrait.</i><o:p></o:p></p>
<!--EndFragment--></body></html>`;

test('collage depuis Word : titre, gras, italique, lien, listes imbriquées et numérotées, sans déchets', async () => {
  const { pasteToHtml } = await import('../core/richtext-commands.js');
  const out = sanitizeRich(pasteToHtml(WORD));
  assert.equal(out,
    '<h2>Programme</h2>'
    + '<p>Le <strong>samedi</strong>, nous <em>accueillons</em> le public\u00a0: <a href="https://www.mab.be/agenda">voir l’agenda</a>.</p>'
    + '<ul><li>Premier point<ul><li>Sous-point <strong>important</strong></li></ul></li><li>Second point</li></ul>'
    + '<ol><li>Étape une</li><li>Étape deux</li></ol>'
    + '<blockquote><em>Une citation en retrait.</em></blockquote>');
  assert.ok(!/mso-|MsoNormal|<o:p>|supportLists|StartFragment|·/.test(out));
});
