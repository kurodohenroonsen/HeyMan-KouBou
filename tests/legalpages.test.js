/* Cycle 29 : mentions légales et vie privée générées, consentement obligatoire du formulaire. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSite, validateSite, updatePageRoot } from '../core/site.js';
import { createNode, insertNode, createSectionWithColumns } from '../core/tree.js';
import { buildLegalPage, buildPrivacyPage, addLegalPages, LEGAL_FORMS, privacyPage } from '../core/legalpages.js';
import { renderPage, renderSite } from '../core/render.js';
import '../core/widgets-extra.js';

const site0 = () => createSite({ name: 'MAB', languages: ['fr', 'nl', 'de', 'en', 'ja'], baseUrl: 'https://www.media-alternatif.be' });
const OPTS = { name: 'Médias Alternatifs Belges', form: 'asbl', seat: 'Rue de la Loi 1, 5000 Namur', number: '0123.456.789', rpm: 'Liège, division Namur', email: 'contact@media-alternatif.be', phone: '+32 81 00 00 00', vat: '', host: 'OVH SAS, 2 rue Kellermann, 59100 Roubaix, France' };
const text = n => JSON.stringify(n);

test('mentions légales : champs obligatoires vérifiés', () => {
  const s = site0();
  for (const k of ['name', 'seat', 'number', 'email', 'host']) assert.throws(() => buildLegalPage(s, { ...OPTS, [k]: '' }), Error, k);
  assert.throws(() => buildLegalPage(s, { ...OPTS, number: 'abc' }), /entreprise/i);
  assert.throws(() => buildLegalPage(s, { ...OPTS, email: 'pas-une-adresse' }), /e-mail/i);
  assert.ok(LEGAL_FORMS.asbl && LEGAL_FORMS.srl && LEGAL_FORMS.independant);
});

test('mentions légales : contenu dans chaque langue du site, échappé, TVA facultative', () => {
  const s = site0();
  const p = buildLegalPage(s, { ...OPTS, name: 'MAB <script>' });
  assert.equal(p.legal, 'legal');
  assert.equal(p.footerLink, true);
  for (const l of s.languages) assert.ok(p.title[l], l);
  assert.equal(p.title.fr, 'Mentions légales');
  assert.equal(p.title.nl, 'Wettelijke vermeldingen');
  assert.equal(p.title.ja, '法的表示');
  const t = text(p.root);
  assert.ok(t.includes('0123.456.789') && t.includes('Rue de la Loi 1') && t.includes('OVH SAS'));
  assert.ok(t.includes('ASBL') && t.includes('VZW') && t.includes('非営利社団'));
  assert.ok(!t.includes('<script>') && t.includes('&lt;script&gt;'));
  assert.ok(!/TVA|BTW/.test(t), 'pas de TVA si vide');
  assert.ok(text(buildLegalPage(s, { ...OPTS, vat: 'BE0123456789' }).root).includes('BE0123456789'));
  assert.equal(validateSite({ ...s, pages: [...s.pages, p] }).errors.length, 0);
});

test('vie privée : formulaire relayé sans stockage, façades, polices locales, aucun cookie, droits RGPD, contact', () => {
  const s = site0();
  assert.throws(() => buildPrivacyPage(s, { ...OPTS, email: '' }), /e-mail/i);
  const p = buildPrivacyPage(s, OPTS);
  assert.equal(p.legal, 'privacy');
  assert.equal(p.title.fr, 'Vie privée');
  const fr = p.root.children[0].children[0].children[0].children.map(n => n.props.text?.fr || n.props.content?.fr || '').join(' ');
  for (const w of ['formulaire', 'aucun cookie', 'YouTube', 'polices', 'OVH SAS', 'RGPD', 'Autorité de protection des données', 'contact@media-alternatif.be']) assert.ok(fr.includes(w), w);
  for (const l of s.languages) assert.ok(p.root.children[0].children[0].children[0].children.every(n => n.props.text?.[l] || n.props.content?.[l]), `tout est écrit en ${l}`);
});

test('addLegalPages : deux pages créées en un clic, liées dans le pied de page de chaque langue', () => {
  const s = site0();
  const r = addLegalPages(s, OPTS);
  assert.equal(r.site.pages.length, 3);
  const legal = r.site.pages.find(p => p.id === r.legalId);
  const priv = r.site.pages.find(p => p.id === r.privacyId);
  assert.equal(legal.slug, 'mentions-legales');
  assert.equal(priv.slug, 'vie-privee');
  assert.equal(privacyPage(r.site).id, priv.id);
  const files = renderSite(r.site).files;
  assert.match(files.get('index.html'), /class="footer-links"[\s\S]*href="mentions-legales\/"[^>]*>Mentions légales<\/a>[\s\S]*href="vie-privee\/"[^>]*>Vie privée<\/a>/);
  assert.match(files.get('nl/index.html'), /href="mentions-legales\/"[^>]*>Wettelijke vermeldingen<\/a>/);
  assert.ok(files.has('ja/vie-privee/index.html'));
  const again = addLegalPages(r.site, OPTS);
  assert.ok(again.site.pages.some(p => p.slug === 'mentions-legales-2'), 'pas de doublon d’adresse');
});

test('formulaire : case de consentement obligatoire (required), liée à la page vie privée, dans la langue de la page', () => {
  let s = site0();
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const f = createNode('form');
  f.props.email = 'contact@media-alternatif.be';
  root = insertNode(root, sec.children[0].children[0].id, f);
  s = updatePageRoot(s, s.pages[0].id, root);
  const noPage = renderPage(s, s.pages[0], 'fr');
  assert.match(noPage, /<input type="checkbox" name="_consent" value="oui" required>/);
  assert.match(noPage, /J’accepte que ces données soient utilisées/);
  s = addLegalPages(s, OPTS).site;
  const fr = renderPage(s, s.pages[0], 'fr');
  assert.match(fr, /<label class="form__consent"><input type="checkbox" name="_consent" value="oui" required> <span>J’accepte[^<]*<a href="vie-privee\/">la page Vie privée<\/a>/);
  assert.match(renderPage(s, s.pages[0], 'nl'), /<a href="vie-privee\/">de privacypagina<\/a>/);
  assert.match(renderPage(s, s.pages[0], 'ja'), /プライバシーポリシー/);
});
