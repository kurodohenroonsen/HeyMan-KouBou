/* Cycle 33 (W4) : ressources « document » (PDF, DOCX, MP3…) et SVG dans le modèle — core/site.js, core/documents.js. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSite, addAsset, addDocument } from '../core/site.js';
import { docTypeOf, docMeta, MAX_DOC_BYTES } from '../core/documents.js';

const dataUrl = (bytes, mime = 'application/pdf') => `data:${mime};base64,${Buffer.alloc(bytes, 7).toString('base64')}`;

test('addDocument : PDF accepté, nom de fichier propre, taille et type retenus', () => {
  const site = createSite({ name: 'MAB' });
  const r = addDocument(site, { name: 'Statuts ASBL 2026.PDF', dataUrl: dataUrl(1500) });
  const a = r.site.assets[r.id];
  assert.match(r.id, /^doc_/);
  assert.equal(a.kind, 'document');
  assert.equal(a.file, 'statuts-asbl-2026.pdf');
  assert.equal(a.mime, 'application/pdf');
  assert.equal(a.size, 1500);
  assert.equal(a.name, 'Statuts ASBL 2026.PDF');
  assert.ok(!site.assets[r.id], 'le site d’origine n’est pas modifié');
  const r2 = addDocument(r.site, { name: 'statuts asbl 2026.pdf', dataUrl: dataUrl(10) });
  assert.equal(r2.site.assets[r2.id].file, 'statuts-asbl-2026-2.pdf');
});

test('addDocument : types acceptés (DOCX, ODT, XLSX, PPTX, ZIP, MP3, M4A, OGG, ICS), les autres refusés', () => {
  const site = createSite({ name: 'MAB' });
  for (const ext of ['docx', 'odt', 'xlsx', 'pptx', 'zip', 'mp3', 'm4a', 'ogg', 'ics']) {
    const r = addDocument(site, { name: `f.${ext}`, dataUrl: dataUrl(4, 'application/octet-stream') });
    assert.equal(r.site.assets[r.id].mime, docTypeOf(`f.${ext}`).mime, ext);
  }
  for (const bad of ['x.exe', 'x.php', 'x.html', 'x.svg', 'x', 'x.js']) assert.throws(() => addDocument(site, { name: bad, dataUrl: dataUrl(4) }), /non pris en charge/, bad);
  assert.throws(() => addDocument(site, { name: 'x.pdf', dataUrl: 'javascript:alert(1)' }), /illisible/);
});

test('addDocument : 25 Mo au plus', () => {
  const site = createSite({ name: 'MAB' });
  assert.equal(MAX_DOC_BYTES, 25 * 1024 * 1024);
  assert.throws(() => addDocument(site, { name: 'gros.zip', dataUrl: dataUrl(MAX_DOC_BYTES + 3, 'application/zip') }), /25 Mo/);
});

test('docMeta : type et taille lisibles dans les cinq langues', () => {
  const a = { file: 'statuts.pdf', size: 1234567 };
  assert.equal(docMeta(a, 'fr'), 'PDF, 1,2 Mo');
  assert.equal(docMeta(a, 'nl'), 'PDF, 1,2 MB');
  assert.equal(docMeta(a, 'en'), 'PDF, 1.2 MB');
  assert.equal(docMeta(a, 'ja'), 'PDF、1.2 MB');
  assert.equal(docMeta({ file: 'a.mp3', size: 900 }, 'fr'), 'MP3, 1 Ko');
  assert.equal(docMeta({ file: 'a.docx', size: 52000 }, 'de'), 'DOCX, 51 KB');
});

test('SVG : accepté par addAsset après assainissement, jamais converti', () => {
  const site = createSite({ name: 'MAB' });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" onload="alert(1)"><script>alert(1)</script><rect width="4" height="4"/></svg>';
  const r = addAsset(site, { name: 'logo.svg', mime: 'image/svg+xml', dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` });
  const a = r.site.assets[r.id];
  assert.equal(a.file, 'logo.svg');
  assert.equal(a.mime, 'image/svg+xml');
  const text = Buffer.from(a.dataUrl.split(',')[1], 'base64').toString();
  assert.equal(text, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4"/></svg>');
  assert.ok(!a.variants);
});
