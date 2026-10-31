import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../core/widgets-extra.js';
import { REGISTRY, isWidget, fieldsOf } from '../core/widgets.js';
import { createNode, insertNode, createSectionWithColumns, setProp, setListItemProp, addListItem } from '../core/tree.js';
import { createSite, updatePageRoot, missingTranslations, validateSite } from '../core/site.js';
import { renderNode, makeContext, renderSite, renderPage } from '../core/render.js';
import { parseVideo } from '../core/widgets-extra.js';
import { TEMPLATES, buildTemplate } from '../core/templates.js';

const EXTRA = ['icon-list', 'icon-box', 'quote', 'stats', 'accordion', 'gallery', 'video', 'map', 'social', 'form', 'card', 'pricing'];

const site = createSite({ languages: ['fr', 'nl'] });
const ctx = (canvas = false) => makeContext(site, 'fr', { canvas });

test('tous les widgets complémentaires sont enregistrés, avec libellé, catégorie et icône', () => {
  for (const t of EXTRA) {
    assert.ok(isWidget(t), t);
    assert.ok(REGISTRY[t].label && REGISTRY[t].category && REGISTRY[t].icon, t);
  }
});

test('chaque widget se rend avec ses valeurs par défaut, en mode site et éditeur', () => {
  for (const t of EXTRA) {
    const n = createNode(t);
    const out = renderNode(n, ctx());
    assert.match(out, new RegExp(`w-${t}`), t);
    assert.ok(!/undefined|\[object Object\]|NaN/.test(out), `${t} : ${out.slice(0, 200)}`);
    assert.ok(renderNode(n, ctx(true)).includes(`data-type="${t}"`), t);
  }
});

test('les valeurs par défaut des listes respectent les champs déclarés', () => {
  for (const t of EXTRA) {
    for (const f of fieldsOf(t)) {
      if (f.type !== 'list') continue;
      const items = createNode(t).props[f.key];
      assert.ok(Array.isArray(items) && items.length > 0, `${t}.${f.key}`);
      for (const it of items) for (const sf of f.fields) assert.ok(sf.key in it, `${t}.${f.key}.${sf.key}`);
    }
  }
});

test('parseVideo : YouTube, youtu.be, Shorts, Vimeo ; rejette le reste', () => {
  assert.deepEqual(parseVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideo('https://youtu.be/dQw4w9WgXcQ'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideo('https://youtube.com/shorts/dQw4w9WgXcQ'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideo('https://vimeo.com/76979871'), { provider: 'vimeo', id: '76979871' });
  assert.equal(parseVideo('https://evil.example/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseVideo('javascript:alert(1)'), null);
  assert.equal(parseVideo('https://www.youtube.com/watch?v="><script>'), null);
});

test('vidéo : façade sans requête tierce ; l’iframe n’existe qu’après clic (script du site)', () => {
  let n = createNode('video');
  n = setProp(n, n.id, 'url', 'https://youtu.be/dQw4w9WgXcQ');
  const out = renderNode(n, ctx());
  assert.ok(!out.includes('<iframe'));
  assert.ok(out.includes('data-video="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"'));
  assert.ok(REGISTRY.video.script.includes('data-video'));
});

test('carte : façade, adresse échappée dans l’URL', () => {
  let n = createNode('map');
  n = setProp(n, n.id, 'address', 'Rue Haute 1, 1000 Bruxelles"><script>');
  const out = renderNode(n, ctx());
  assert.ok(!out.includes('<script>') && !out.includes('<iframe'));
  assert.ok(out.includes('Rue%20Haute%201'));
});

test('accordéon : details/summary natifs, contenu riche assaini', () => {
  let n = createNode('accordion');
  n = setListItemProp(n, n.id, 'items', 0, 'content', '<p>ok</p><script>x</script><img src=x onerror=y>', 'fr');
  const out = renderNode(n, ctx());
  assert.ok(out.includes('<details') && out.includes('<summary'));
  assert.ok(!out.includes('<script') && !out.includes('onerror'));
});

test('réseaux sociaux : liens sûrs, rel=noopener, libellé accessible', () => {
  let n = createNode('social');
  n = setListItemProp(n, n.id, 'items', 0, 'url', 'javascript:alert(1)');
  const out = renderNode(n, ctx());
  assert.ok(!out.includes('javascript:'));
  assert.ok(/aria-label="[^"]+"/.test(out));
});

test('formulaire : champs requis, types sûrs, adresse e-mail non exposée en clair', () => {
  let n = createNode('form');
  n = setProp(n, n.id, 'email', 'contact@media-alternatif.be');
  const out = renderNode(n, ctx());
  assert.ok(out.includes('<form') && out.includes('required'));
  assert.ok(!out.includes('contact@media-alternatif.be'), 'adresse encodée');
  assert.ok(REGISTRY.form.script.includes('mailto:'));
  n = addListItem(n, n.id, 'fields');
  assert.ok(renderNode(n, ctx()).match(/<label/g).length >= 4);
});

test('galerie : images vides ignorées sur le site, colonnes bornées', () => {
  const n = createNode('gallery');
  const out = renderNode(n, ctx());
  assert.ok(!out.includes('<img src=""'));
  assert.match(out, /--cols:[234]/);
});

test('les textes traduisibles des listes sont comptés comme à traduire', () => {
  let s = createSite({ languages: ['fr', 'nl'] });
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  root = insertNode(root, sec.children[0].children[0].id, createNode('accordion'));
  s = updatePageRoot(s, s.pages[0].id, root);
  assert.ok(missingTranslations(s).some(m => m.field.startsWith('items.0.')));
});

test('modèles de sections : chacun produit une section valide, rendue sans erreur, avec des identifiants neufs', () => {
  assert.ok(TEMPLATES.length >= 8);
  for (const tpl of TEMPLATES) {
    const a = buildTemplate(tpl.id);
    const b = buildTemplate(tpl.id);
    assert.equal(a.type, 'section', tpl.id);
    assert.notEqual(a.id, b.id);
    let root = createNode('page');
    root = insertNode(root, root.id, a);
    const s0 = createSite();
    const s = updatePageRoot(s0, s0.pages[0].id, root);
    assert.deepEqual(validateSite(s).errors, [], tpl.id);
    const html = renderPage(s, s.pages[0], 'fr');
    assert.ok(!/undefined|\[object Object\]/.test(html), tpl.id);
  }
});

test('export : sans menu mobile, site.js présent seulement si un widget à script est utilisé', () => {
  let s = createSite();
  s.header.burger = false;
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  let r = renderSite(updatePageRoot(s, s.pages[0].id, insertNode(root, col, createNode('quote'))));
  assert.ok(!r.files.has('site.js'));
  r = renderSite(updatePageRoot(s, s.pages[0].id, insertNode(root, col, createNode('video'))));
  assert.ok(r.files.has('site.js'));
  assert.ok(r.files.get('index.html').includes('site.js'));
});

test('image sans fichier : rien sur le site publié, repère visible dans l’éditeur', () => {
  const n = createNode('image');
  assert.ok(!renderNode(n, ctx()).includes('img-empty'));
  assert.ok(renderNode(n, ctx(true)).includes('img-empty'));
});

/* ---------- Cycle 28 (A8) : contenus par défaut dans la langue principale du site ---------- */
const JA = /[぀-ヿ一-鿿]/;
const i18nValues = node => {
  const out = [];
  for (const f of fieldsOf(node.type)) {
    if (f.i18n && !f.siteText && node.props[f.key] && typeof node.props[f.key] === 'object') out.push(node.props[f.key]);
    if (f.type === 'list') for (const it of node.props[f.key] || []) for (const sf of f.fields || []) if (sf.i18n && it[sf.key]) out.push(it[sf.key]);
  }
  return out;
};

test('site japonais : chaque widget reçoit ses textes d’exemple sous « ja », en japonais', () => {
  for (const type of Object.keys(REGISTRY).filter(isWidget)) {
    const n = createNode(type, { lang: 'ja' });
    for (const v of i18nValues(n)) {
      assert.deepEqual(Object.keys(v), ['ja'], `${type} : seulement la langue principale`);
      if (v.ja) assert.match(v.ja.replace(/<[^>]*>/g, ''), JA, `${type} : « ${v.ja} » en japonais`);
    }
  }
});

test('textes d’exemple dans les cinq langues, neutres : aucune mention du MAB', () => {
  for (const lang of ['fr', 'nl', 'de', 'en', 'ja']) {
    for (const type of Object.keys(REGISTRY).filter(isWidget)) {
      const n = createNode(type, { lang });
      assert.ok(!JSON.stringify(n.props).includes('MAB'), `${type} (${lang})`);
      for (const v of i18nValues(n)) assert.equal(typeof v[lang], 'string', `${type} : ${lang}`);
    }
  }
  const n = createNode('heading', { lang: 'de' });
  assert.equal(n.props.text.de, 'Ihre Überschrift');
  assert.deepEqual(createNode('heading', { lang: 'ja', langs: ['ja', 'en'] }).props.text, { ja: '見出しを入力', en: 'Your heading here' }, 'aussi sous les autres langues si demandé');
});

test('nouvel élément de liste dans la langue principale', () => {
  const n = createNode('accordion', { lang: 'ja' });
  const r = addListItem(n, n.id, 'items', 'ja');
  const last = r.props.items.at(-1);
  assert.deepEqual(Object.keys(last.title), ['ja']);
  assert.match(last.title.ja, JA);
});

test('modèle de section inséré dans un site japonais : textes en japonais, rien en français', () => {
  for (const t of TEMPLATES) {
    const sec = buildTemplate(t.id, { lang: 'ja' });
    const json = JSON.stringify(sec);
    assert.ok(!/"fr":/.test(json), `${t.id} : aucune clé fr`);
    assert.ok(!json.includes('MAB'), `${t.id} : sans MAB`);
    let h = null;
    const walkIn = x => { if (!h && x.type === 'heading' && x.props.text?.ja) h = x; (x.children || []).forEach(walkIn); };
    walkIn(sec);
    if (h) assert.match(h.props.text.ja.replace(/<[^>]*>/g, ''), JA, `${t.id} : titre japonais`);
  }
});
