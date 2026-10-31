/* Cycle 25 (S1) : tout texte d'un projet est assaini à l'entrée (import, snapshot, normalizeSite), selon le type de champ. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, findNode } from '../core/tree.js';
import { createSite, normalizeSite, updatePageRoot, addPage, setFooterText } from '../core/site.js';
import { createComponent } from '../core/components.js';
import { customizeHeader, customizeFooter } from '../core/layout.js';
import { createCollectionWithPage, addField, setFieldOptions, findCollection } from '../core/collections.js';
import { sanitizeSiteTexts } from '../core/sanitize-site.js';
import { demoSite } from '../editor/demo.js';
import '../core/render.js';

const XSS = '<img src=x onerror="window.__xss=1">';
const SCRIPT = '<script>window.__xss=1</script>';
const clone = v => structuredClone(v);
const str = v => JSON.stringify(v);
const noXss = v => { const s = str(v); return !/onerror|<script|javascript:/i.test(s) && !/<img/i.test(s); };

/* Un site avec une section d'une colonne, où l'on insère des widgets */
function base() {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr', 'nl'] }));
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  s = updatePageRoot(s, s.pages[0].id, root);
  return { site: s, col: sec.children[0].children[0] };
}
function withWidgets(site, colId, nodes) {
  let root = site.pages[0].root;
  for (const n of nodes) root = insertNode(root, colId, n);
  return updatePageRoot(site, site.pages[0].id, root);
}
const node = (type, props) => { const n = createNode(type); Object.assign(n.props, props); return n; };
const first = (site, type) => { const f = n => (n.type === type ? n : (n.children || []).map(f).find(Boolean)); return f(site.pages[0].root); };

test('richtext : <img onerror>, <script> et javascript: retirés ; texte gardé dans un <p>', () => {
  const { site, col } = base();
  const s = withWidgets(site, col.id, [node('text', { content: { fr: `<p>Bonjour ${XSS} à tous${SCRIPT}</p><p><a href="javascript:alert(1)">lien</a></p>`, nl: '<p>Hallo</p>' } })]);
  const { site: out, changed } = sanitizeSiteTexts(s);
  const t = first(out, 'text').props.content;
  assert.equal(t.fr, '<p>Bonjour  à tous</p><p><a href="#">lien</a></p>');
  assert.equal(t.nl, '<p>Hallo</p>', 'texte sain inchangé');
  assert.equal(changed, 1, 'une seule valeur modifiée');
  assert.ok(noXss(out));
});

test('inline (titre) et texte simple (bouton) : balises retirées, chevrons retirés du texte simple', () => {
  const { site, col } = base();
  const s = withWidgets(site, col.id, [
    node('heading', { text: { fr: `Titre ${XSS}<b>gras</b>` } }),
    node('button', { label: { fr: 'Lire <b>plus</b> > ici' }, link: '#' })
  ]);
  const { site: out, changed } = sanitizeSiteTexts(s);
  assert.equal(first(out, 'heading').props.text.fr, 'Titre <strong>gras</strong>');
  assert.equal(first(out, 'button').props.label.fr, 'Lire plus  ici', 'texte simple : balises puis chevrons retirés');
  assert.equal(changed, 2);
});

test('listes : sous-champs inline, texte (traduit ou non) et richtext des éléments', () => {
  const { site, col } = base();
  const s = withWidgets(site, col.id, [
    node('icon-list', { items: [{ icon: 'check', text: { fr: `Un ${XSS}` } }, { icon: 'check', text: { fr: 'Deux' } }] }),
    node('stats', { items: [{ value: '12<script>x</script>', label: { fr: `membres ${XSS}` } }] }),
    node('accordion', { items: [{ title: { fr: `Q ${XSS}` }, content: { fr: `<p>R ${SCRIPT}</p>` } }] })
  ]);
  const { site: out, changed } = sanitizeSiteTexts(s);
  assert.equal(first(out, 'icon-list').props.items[0].text.fr, 'Un ');
  assert.equal(first(out, 'icon-list').props.items[1].text.fr, 'Deux');
  assert.equal(first(out, 'stats').props.items[0].value, '12x');
  assert.equal(first(out, 'stats').props.items[0].label.fr, 'membres ');
  assert.equal(first(out, 'accordion').props.items[0].title.fr, 'Q ');
  assert.equal(first(out, 'accordion').props.items[0].content.fr, '<p>R </p>');
  assert.equal(changed, 5);
  assert.ok(noXss(out));
});

test('composants : le nœud du composant et son nom sont assainis ; les instances (ref) sont ignorées', () => {
  const { site, col } = base();
  let s = withWidgets(site, col.id, [node('heading', { text: { fr: `Titre ${XSS}` } })]);
  const h = first(s, 'heading');
  s = createComponent(s, s.pages[0].id, h.id, `Bloc ${XSS}`).site;
  const id = Object.keys(s.components)[0];
  const { site: out, changed } = sanitizeSiteTexts(s);
  assert.equal(out.components[id].node.props.text.fr, 'Titre ');
  assert.equal(out.components[id].name, 'Bloc ');
  assert.ok(changed >= 2);
  assert.ok(noXss(out));
});

test('en-tête et pied de page en blocs, texte du pied de page, titres de pages, SEO, menu, nom du site, libellé accessible', () => {
  let { site } = base();
  site = customizeHeader(site);
  site = customizeFooter(site);
  const hd = node('heading', { text: { fr: `Logo ${XSS}` } });
  site = clone(site);
  site.layout.header.children[0].children[0].children.push(hd);
  const ft = node('text', { content: { fr: `<p>Pied ${SCRIPT}</p>` } });
  site.layout.footer.children[0].children[0].children.push(ft);
  site = setFooterText(site, `© MAB ${XSS} <b>2026</b>`, 'fr');
  site = addPage(site, { slug: 'contact', title: { fr: `Contact ${XSS}` } });
  site.pages[1].seo = { description: { fr: `Desc ${XSS}` }, title: { fr: `Titre Google ${XSS}` } };
  site.menu = [{ id: 'm1', kind: 'page', pageId: site.pages[1].id, label: { fr: `Menu ${XSS}` }, children: [{ id: 'm2', kind: 'link', url: 'https://x.be', label: { fr: `Sous ${XSS}` } }] }];
  site.name = `MAB ${XSS}`;
  site.pages[0].root.children[0].advanced = { ariaLabel: { fr: `Aria ${XSS}` } };
  const { site: out, changed } = sanitizeSiteTexts(site);
  const f = (n, type) => (n.type === type ? n : (n.children || []).map(c => f(c, type)).find(Boolean));
  assert.equal(f(out.layout.header, 'heading').props.text.fr, 'Logo ');
  assert.equal(findNode(out.layout.footer, ft.id).props.content.fr, '<p>Pied </p>');
  assert.equal(out.footer.text.fr, '© MAB  <strong>2026</strong>', 'pied de page : inline');
  assert.equal(out.pages[1].title.fr, 'Contact ');
  assert.equal(out.pages[1].seo.description.fr, 'Desc ');
  assert.equal(out.pages[1].seo.title.fr, 'Titre Google ');
  assert.equal(out.menu[0].label.fr, 'Menu ');
  assert.equal(out.menu[0].children[0].label.fr, 'Sous ');
  assert.equal(out.name, 'MAB ');
  assert.equal(out.pages[0].root.children[0].advanced.ariaLabel.fr, 'Aria ');
  assert.equal(changed, 10);
  assert.ok(noXss(out));
});

test('collections : carte, page de détail, valeurs des éléments selon le type, noms, libellés et choix', () => {
  let { site } = base();
  const r = createCollectionWithPage(site, { kind: 'members', name: 'Membres', today: '2026-10-30' });
  site = r.site;
  const col = findCollection(site, r.id);
  site = addField(site, r.id, { label: 'Tarif', type: 'select' }).site;
  site = setFieldOptions(site, r.id, 'tarif', [{ value: 'a', label: { fr: 'A' } }]);
  site = clone(site);
  const c = site.collections[r.id];
  c.name = `Membres ${XSS}`;
  c.fields[0].label = `Nom ${XSS}`;
  c.fields.find(f => f.key === 'tarif').options[0].label.fr = `A ${XSS}`;
  c.items[0].values.name = `Radio ${XSS}`;
  c.items[0].values.intro = { fr: `<p>Intro ${XSS}</p>`, nl: '<p>Ok</p>' };
  c.items[0].values.website = 'https://radio.be';
  c.items[0].values.type = 'radio';
  c.card.children.push(node('heading', { text: { fr: `Carte ${XSS}` } }));
  c.detail.children[0].children[0].children[0].children.push(node('text', { content: { fr: `<p>Détail ${SCRIPT}</p>` } }));
  const { site: out, changed } = sanitizeSiteTexts(site);
  const o = out.collections[r.id];
  assert.equal(o.name, 'Membres ');
  assert.equal(o.fields[0].label, 'Nom ');
  assert.equal(o.fields.find(f => f.key === 'tarif').options[0].label.fr, 'A ');
  assert.equal(o.items[0].values.name, 'Radio ');
  assert.equal(o.items[0].values.intro.fr, '<p>Intro </p>');
  assert.equal(o.items[0].values.intro.nl, '<p>Ok</p>');
  assert.equal(o.items[0].values.website, 'https://radio.be', 'lien : type vérifié ailleurs, laissé tel quel');
  assert.equal(o.items[0].values.type, 'radio', 'choix : laissé tel quel');
  assert.equal(o.card.children.at(-1).props.text.fr, 'Carte ');
  assert.equal(o.detail.children[0].children[0].children[0].children.at(-1).props.content.fr, '<p>Détail </p>');
  assert.equal(changed, 7);
  assert.ok(noXss(out));
  void col;
});

test('entités : un texte déjà échappé (&lt;img …&gt;) reste du texte, sans être compté comme modifié', () => {
  const { site, col } = base();
  const safe = '<p>Code : &lt;img src=x onerror=alert(1)&gt; &amp; fin</p>';
  const s = withWidgets(site, col.id, [node('text', { content: { fr: safe } }), node('heading', { text: { fr: 'A &amp; B' } })]);
  const { site: out, changed } = sanitizeSiteTexts(s);
  assert.equal(first(out, 'text').props.content.fr, safe);
  assert.equal(first(out, 'heading').props.text.fr, 'A &amp; B');
  assert.equal(changed, 0);
  assert.equal(out, s, 'rien à changer : même objet');
});

test('copie sur écriture : seules les branches modifiées sont recopiées, les commentaires signés et les images ne sont jamais touchés', () => {
  const { site, col } = base();
  let s = withWidgets(site, col.id, [node('text', { content: { fr: `<p>${XSS}</p>` } })]);
  s = addPage(s, { slug: 'propre', title: { fr: 'Propre' } });
  s.assets = { img_a: { file: 'a.webp', mime: 'image/webp', dataUrl: 'data:image/webp;base64,AAAA' } };
  s.review = { comments: { c1: { id: 'c1', text: `Commentaire ${XSS}`, sig: 'xyz' } } };
  const { site: out, changed } = sanitizeSiteTexts(s);
  assert.equal(changed, 1);
  assert.notEqual(out, s);
  assert.equal(out.pages[1], s.pages[1], 'page saine partagée');
  assert.equal(out.assets, s.assets, 'images partagées');
  assert.equal(out.review, s.review, 'commentaires intacts (signés)');
  assert.equal(out.theme, s.theme);
  assert.equal(first(s, 'text').props.content.fr, `<p>${XSS}</p>`, 'original non modifié');
});

test('valeurs non textuelles (nombres, booléens, null) et types inconnus : laissés tels quels', () => {
  const { site, col } = base();
  const s = withWidgets(site, col.id, [node('stats', { items: [{ value: 12, label: null }] }), node('map', { address: null, zoom: 15 })]);
  s.pages[0].root.children.push({ id: 'n_zzz', type: 'widget-inconnu', props: { text: { fr: XSS } }, children: [] });
  const { site: out, changed } = sanitizeSiteTexts(s);
  assert.equal(changed, 0);
  assert.equal(out, s);
});

test('normalizeSite applique l’assainissement (import, chargement, snapshot)', () => {
  const { site, col } = base();
  const s = withWidgets(site, col.id, [node('text', { content: { fr: `<p>${XSS}</p>` } }), node('heading', { text: { fr: XSS } })]);
  const out = normalizeSite(s);
  assert.ok(noXss(out));
  assert.equal(first(out, 'text').props.content.fr, '<p></p>');
  assert.equal(first(out, 'heading').props.text.fr, '');
});

test('l’exemple du MAB et un site neuf sont déjà propres : 0 texte modifié', () => {
  assert.equal(sanitizeSiteTexts(demoSite()).changed, 0);
  assert.equal(sanitizeSiteTexts(createSite({ languages: ['fr', 'ja'] })).changed, 0);
  const r = createCollectionWithPage(normalizeSite(createSite()), { kind: 'events', name: 'Agenda', today: '2026-10-30' });
  assert.equal(sanitizeSiteTexts(r.site).changed, 0);
});
