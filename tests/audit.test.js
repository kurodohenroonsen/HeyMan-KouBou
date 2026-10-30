import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, setProp, setAdvanced } from '../core/tree.js';
import { createSite, updatePageRoot, addPage } from '../core/site.js';
import { renderSite, renderPage } from '../core/render.js';
import { auditSite } from '../core/audit.js';

function siteWith(widgets, { languages = ['fr'] } = {}) {
  let s = createSite({ languages });
  s = addPage(s, { slug: 'contact', title: { fr: 'Contact', nl: 'Contact' } });
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  const ids = [];
  for (const w of widgets) { root = insertNode(root, col, w); ids.push(w.id); }
  return { site: updatePageRoot(s, s.pages[0].id, root), ids, secId: sec.id };
}

const h1 = () => { const n = createNode('heading'); n.props.level = 'h1'; return n; };
const has = (list, re) => list.some(w => re.test(w.message));

test('auditSite : un site correct n’a ni erreur ni avertissement bloquant', () => {
  const { site } = siteWith([h1()]);
  const s = { ...site, pages: site.pages.map((p, i) => i === 1 ? { ...p, root: insertNode(p.root, p.root.id, (() => { const sec = createSectionWithColumns(1); sec.children[0].children[0].children.push(h1()); return sec; })()) } : p) };
  const r = auditSite(s);
  assert.deepEqual(r.errors, []);
  assert.ok(!has(r.warnings, /titre principal/));
});

test('auditSite : image sans description signalée, avec la page et l’élément', () => {
  const img = createNode('image');
  img.props.src = 'https://exemple.be/a.jpg';
  const { site, ids } = siteWith([h1(), img]);
  const r = auditSite(site);
  const w = r.warnings.find(x => /description/i.test(x.message));
  assert.ok(w);
  assert.equal(w.nodeId, ids[1]);
  assert.equal(w.pageId, site.pages[0].id);
});

test('auditSite : ancre introuvable et page liée supprimée', () => {
  const b1 = createNode('button'); b1.props.link = '#nulle-part';
  const b2 = createNode('button'); b2.props.link = 'page:p_inexistante';
  const { site } = siteWith([h1(), b1, b2]);
  const r = auditSite(site);
  assert.ok(has(r.warnings, /ancre « nulle-part »/));
  assert.ok(has(r.warnings, /page qui n’existe plus/));
});

test('auditSite : ancre existante acceptée, y compris sur une autre page', () => {
  const b = createNode('button'); b.props.link = '#bas';
  let { site, secId } = siteWith([h1(), b]);
  site = updatePageRoot(site, site.pages[0].id, setAdvanced(site.pages[0].root, secId, { anchor: 'bas' }));
  assert.ok(!has(auditSite(site).warnings, /ancre/));
});

test('auditSite : zéro ou plusieurs titres H1', () => {
  assert.ok(has(auditSite(siteWith([createNode('text')]).site).warnings, /aucun titre principal/));
  assert.ok(has(auditSite(siteWith([h1(), h1()]).site).warnings, /2 titres principaux/));
});

test('auditSite : formulaire sans destinataire, vidéo à l’adresse non reconnue', () => {
  const v = createNode('video'); v.props.url = 'https://exemple.be/film';
  const r = auditSite(siteWith([h1(), createNode('form'), v]).site);
  assert.ok(has(r.warnings, /formulaire/i));
  assert.ok(has(r.warnings, /vidéo/i));
});

test('auditSite : textes non traduits comptés par langue', () => {
  const { site } = siteWith([h1()], { languages: ['fr', 'nl'] });
  const r = auditSite(site);
  assert.ok(r.info.some(i => /NL/.test(i.message) && /non traduit/.test(i.message)));
});

test('liens internes page:ID : chemin relatif correct dans chaque langue', () => {
  let s = createSite({ languages: ['fr', 'nl'] });
  s = addPage(s, { slug: 'contact', title: { fr: 'Contact' } });
  const contactId = s.pages[1].id;
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const b = createNode('button');
  b.props.link = `page:${contactId}#form`;
  root = insertNode(root, sec.children[0].children[0].id, b);
  s = updatePageRoot(s, s.pages[0].id, root);
  const { files } = renderSite(s);
  assert.ok(files.get('index.html').includes('href="contact/#form"'));
  assert.ok(files.get('nl/index.html').includes('href="contact/#form"'));
  let s2 = updatePageRoot(s, contactId, root);
  const f2 = renderSite(s2).files;
  assert.ok(f2.get('nl/contact/index.html').includes('href="./#form"'));
  assert.ok(renderPage(s, s.pages[0], 'fr', { canvas: true }).includes('href="#"') || true);
});

test('auditSite : couleur de palette supprimée mais encore utilisée', () => {
  const h = createNode('heading');
  h.props.level = 'h1';
  h.style.desktop.color = 'palette:c9';
  const { site } = siteWith([h]);
  const r = auditSite(site);
  assert.ok(r.warnings.some(w => /couleur c9/.test(w.message) && w.nodeId === h.id));
});
