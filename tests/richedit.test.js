/* Cycle 30 : logique pure du texte riche (déclencheurs de liste, collage depuis Word, Google Docs, LibreOffice). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listTrigger, pasteToHtml, docsStylesToTags, wordListsToHtml, choosePaste, blockFormats } from '../core/richtext-commands.js';
import { sanitizeRich } from '../core/sanitize.js';

test('listTrigger : « - », « * », « • » ouvrent une liste à puces, « 1. » ou « 1) » une liste numérotée', () => {
  for (const s of ['-', '*', '•']) assert.equal(listTrigger(s), 'ul', s);
  for (const s of ['1.', '1)']) assert.equal(listTrigger(s), 'ol', s);
  for (const s of ['2.', 'a.', '-a', 'texte -', '', ' ', '--']) assert.equal(listTrigger(s), null, JSON.stringify(s));
  assert.equal(listTrigger(' -'), 'ul', 'espace insécable devant toléré');
});

test('blockFormats : paragraphe, titres 2 et 3, citation (libellés traduisibles)', () => {
  assert.deepEqual(blockFormats().map(f => f.tag), ['p', 'h2', 'h3', 'blockquote']);
  assert.ok(blockFormats().every(f => typeof f.label === 'string' && f.label.length > 2));
});

/* Google Docs : tout dans un <b style="font-weight:normal">, gras/italique/souligné en styles de span, listes vraies */
const DOCS = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:700;font-style:normal;text-decoration:none;vertical-align:baseline;white-space:pre-wrap;">Gras</span><span style="font-size:11pt;font-weight:400;font-style:italic;text-decoration:none;">italique</span><span style="font-weight:400;text-decoration:underline;">souligné</span><span style="font-weight:400;vertical-align:super;font-size:0.6em;">2</span></p><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-weight:400;">Point</span></p></li><li dir="ltr" aria-level="1"><p dir="ltr" role="presentation"><span style="font-weight:400;"><a href="https://exemple.be/" style="text-decoration:none;">Lien</a></span></p></li></ul></b><br class="Apple-interchange-newline">`;

test('collage depuis Google Docs : gras, italique, souligné, exposant, liste et lien gardés', () => {
  const out = sanitizeRich(pasteToHtml(DOCS));
  assert.equal(out, '<p><strong>Gras</strong><em>italique</em><u>souligné</u><sup>2</sup></p><ul><li>Point</li><li><a href="https://exemple.be/">Lien</a></li></ul>');
});

test('docsStylesToTags : un <b> « font-weight:normal » n’est pas du gras ; spans imbriqués refermés dans l’ordre', () => {
  assert.equal(docsStylesToTags('<b style="font-weight:normal"><span style="font-weight:700">a<span style="font-style:italic">b</span>c</span></b>'), '<strong>a<em>b</em>c</strong>');
  assert.equal(docsStylesToTags('<span style="font-weight:bold;text-decoration:underline">x</span>'), '<strong><u>x</u></strong>');
  assert.equal(docsStylesToTags('<span style="color:red">plain</span>'), 'plain');
  assert.equal(docsStylesToTags('<b>vrai gras</b>'), '<b>vrai gras</b>');
});

/* LibreOffice Writer : paragraphes stylés, listes vraies avec <p> dans les items, titres */
const LIBRE = `<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=utf-8"><style type="text/css">p { margin-bottom: 0.25cm }</style></head><body lang="fr-BE" link="#000080"><h2 class="western">Horaires</h2><p style="margin-bottom: 0cm; line-height: 100%">Ouvert <b>tous les jours</b> sauf le <u>lundi</u>.</p><ol><li><p style="margin-bottom: 0cm">Matin</p></li><li><p style="margin-bottom: 0cm">Après-midi</p></li></ol><blockquote><p>Citation.</p></blockquote></body></html>`;

test('collage depuis LibreOffice : titre, mise en forme, liste numérotée (sans <p> dans les items), citation', () => {
  assert.equal(sanitizeRich(pasteToHtml(LIBRE)), '<h2>Horaires</h2><p>Ouvert <strong>tous les jours</strong> sauf le <u>lundi</u>.</p><ol><li>Matin</li><li>Après-midi</li></ol><blockquote>Citation.</blockquote>');
});

test('wordListsToHtml : niveaux, puces et numéros, paragraphes ordinaires inchangés', () => {
  const p = (lvl, marker, text, list = 'l0') => `<p class=MsoListParagraph style='mso-list:${list} level${lvl} lfo1'><![if !supportLists]><span style='mso-list:Ignore'>${marker}<span style='font:7.0pt'>&nbsp; </span></span><![endif]>${text}<o:p></o:p></p>`;
  const html = `<p class=MsoNormal>Avant</p>${p(1, '·', 'a')}${p(2, 'o', 'b')}${p(3, '§', 'c')}${p(1, '·', 'd')}<p class=MsoNormal>Entre</p>${p(1, '1.', 'x', 'l1')}${p(1, '2.', 'y', 'l1')}`;
  assert.equal(sanitizeRich(wordListsToHtml(html).replace(/<o:p><\/o:p>/g, '')),
    '<p>Avant</p><ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li><li>d</li></ul><p>Entre</p><ol><li>x</li><li>y</li></ol>');
});

test('choosePaste : HTML quand il apporte une mise en forme utile, texte brut sinon', () => {
  assert.deepEqual(choosePaste({ html: '<p>Un <b>gras</b></p>', text: 'Un gras' }), { kind: 'html', value: '<p>Un <b>gras</b></p>' });
  assert.deepEqual(choosePaste({ html: '<meta charset="utf-8"><span style="color:red">brut</span>', text: 'brut' }), { kind: 'text', value: 'brut' }, 'un span coloré ne vaut pas la peine');
  assert.deepEqual(choosePaste({ html: '', text: 'a\nb' }), { kind: 'text', value: 'a\nb' });
  assert.deepEqual(choosePaste({ html: '<ul><li>a</li></ul>', text: 'a' }), { kind: 'html', value: '<ul><li>a</li></ul>' });
  assert.deepEqual(choosePaste({ html: '<a href="https://x.be">x</a>', text: 'x' }), { kind: 'html', value: '<a href="https://x.be">x</a>' });
});

test('pasteToHtml retire le fragment de Word, les commentaires conditionnels et les balises office', () => {
  const out = pasteToHtml('<!--StartFragment--><p class=MsoNormal>a<o:p></o:p></p><!--[if gte mso 9]><xml>z</xml><![endif]--><!--EndFragment-->');
  assert.equal(sanitizeRich(out), '<p>a</p>');
  assert.ok(!/<o:p>|StartFragment|<xml>/.test(out));
});
