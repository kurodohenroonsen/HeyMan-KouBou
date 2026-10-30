import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeAttr, safeUrl } from '../core/escape.js';

test('escapeHtml neutralise les balises et les entités', () => {
  assert.equal(escapeHtml('<script>alert("x")</script> & co'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(42), '42');
});

test('escapeAttr échappe aussi les apostrophes', () => {
  assert.equal(escapeAttr("l'eau \"pure\""), 'l&#39;eau &quot;pure&quot;');
});

test('safeUrl accepte http(s), mailto, tel, ancres et chemins relatifs', () => {
  for (const ok of ['https://a.be/x', 'http://a.be', 'mailto:a@b.be', 'tel:+3271', '#contact', 'page/', '../x.html', '/abs']) {
    assert.equal(safeUrl(ok), ok, ok);
  }
});

test('safeUrl refuse javascript:, data: et vbscript:, même déguisés', () => {
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<b>', 'vbscript:x']) {
    assert.equal(safeUrl(bad), '#', bad);
  }
});
