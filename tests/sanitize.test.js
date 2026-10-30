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
});
