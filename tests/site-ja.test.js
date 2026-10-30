/* Cycle 22 : le japonais comme langue de contenu des sites (adresses, textes publiés, référencement, polices, traduction). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, walk } from '../core/tree.js';
import { createSite, updatePageRoot, addPage, setPageSlug, setSiteMeta, normalizeSite, validateSite, slugify, kanaToRomaji, LANG_LABELS, setPublishSettings } from '../core/site.js';
import { renderSite, renderPage, buildCss, jaFontStack, pagePath } from '../core/render.js';
import { autoTranslate, exportCsv, importCsv, suggestSlug, translatableItems, reviewItems } from '../core/i18n.js';
import { analyzePage, seoLimits, SEO_LIMITS, SEO_LIMITS_JA, setSeoField } from '../core/seo.js';
import { createCollection, addItem, formatDate, whenText } from '../core/collections.js';
import { createComponent } from '../core/components.js';
import { siteText, SITE_TEXT } from '../core/widgets-extra.js';
import { setUiLanguage } from '../core/ui-i18n.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/* ---------- Langue disponible ---------- */
test('le japonais est une langue de contenu : libellé 日本語, activable, projet valide', () => {
  assert.equal(LANG_LABELS.ja, '日本語');
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr'] }));
  s = setSiteMeta(s, { languages: ['fr', 'ja'] });
  assert.deepEqual(s.languages, ['fr', 'ja']);
  assert.ok(validateSite(s).ok, validateSite(s).errors.join(' | '));
  const j = normalizeSite(createSite({ name: '熊高原', languages: ['ja', 'fr'] }));
  assert.equal(j.defaultLanguage, 'ja');
  assert.ok(validateSite(j).ok);
});

/* ---------- Adresses ---------- */
test('slugify : les kana deviennent du rōmaji (Hepburn, ー double la voyelle)', () => {
  const cases = {
    チーム: 'chiimu', ニュース: 'nyuusu', アクセス: 'akusesu', イベント: 'ibento', おしらせ: 'oshirase', コーヒー: 'koohii',
    きっぷ: 'kippu', マッチ: 'matchi', ちゃんと: 'chanto', ジャンプ: 'janpu', ファイル: 'fairu', ティー: 'tii', ウェブ: 'webu',
    ヴァイオリン: 'vaiorin', デュエット: 'dyuetto', シェア: 'shea', 'ｶﾞｲﾄﾞ': 'gaido', ＡＢＣ: 'abc', 'カフェ・バー': 'kafe-baa',
    '2026年イベント': '2026-ibento', チーム紹介: 'chiimu', 会社のチーム: 'chiimu'
  };
  for (const [ja, want] of Object.entries(cases)) assert.equal(slugify(ja), want, ja);
  assert.equal(kanaToRomaji('ありがとう'), 'arigatou');
});

test('slugify : titre en kanji seuls → adresse de repli « page-… » valide et stable ; le latin ne change pas', () => {
  const a = slugify('会社案内');
  assert.match(a, /^page-[a-z0-9]+$/);
  assert.equal(slugify('会社案内'), a, 'même titre → même adresse');
  assert.notEqual(slugify('お問い合わせ'), a, 'titres différents → adresses différentes');
  assert.match(slugify('お問い合わせ'), /^page-[a-z0-9]+$/, 'hiragana entre des kanji : repli plutôt que « o-i-wase »');
  for (const t of ['チーム', '会社案内', '東京・大阪', 'Notre équipe', 'Ça va ?']) {
    const s1 = slugify(t);
    assert.match(s1, SLUG_RE, t);
    assert.equal(slugify(s1), s1, `${t} : slugify est idempotent`);
  }
  assert.equal(slugify('Notre équipe'), 'notre-equipe');
  assert.equal(slugify('Œuvres & Ça'), 'uvres-ca', 'comportement latin inchangé');
  assert.equal(slugify(''), '');
  assert.equal(slugify('!!! ?'), '', 'pas de lettre : vide (le titre reste obligatoire)');
  assert.equal(slugify('写真', { fallback: 'image' }).startsWith('image-'), true);
  assert.equal(slugify('会社案内', { fallback: '' }), '');
  assert.ok(!slugify('a'.repeat(59) + ' bc').endsWith('-'), 'pas de tiret final après la coupe à 60');
});

test('page japonaise : adresse lisible, unique, valide ; adresse traduite et proposée depuis le titre', () => {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr', 'ja'], baseUrl: 'https://www.exemple.be' }));
  s = addPage(s, { slug: slugify('チーム'), title: { fr: 'チーム' } });
  const p = s.pages[1];
  assert.equal(p.slug, 'chiimu');
  assert.throws(() => addPage(s, { slug: 'チーム', title: {} }), /existe déjà/);
  s = addPage(s, { slug: '会社案内', title: { fr: '会社案内' } });
  assert.match(s.pages[2].slug, /^page-/);
  assert.ok(validateSite(s).ok, validateSite(s).errors.join(' | '));
  /* traduction de l'adresse pour la version japonaise d'une page française */
  s = addPage(s, { slug: 'equipe', title: { fr: 'Équipe', ja: 'メンバー' } });
  const eq = s.pages[3];
  assert.equal(suggestSlug(s, eq, 'ja'), 'menbaa');
  s = setPageSlug(s, eq.id, 'メンバー', 'ja');
  assert.equal(s.pages[3].slugs.ja, 'menbaa');
  assert.equal(pagePath(s, s.pages[3], 'ja'), 'ja/menbaa/index.html');
  assert.ok(validateSite(s).ok);
});

/* ---------- Site publié en japonais ---------- */
function jaSite() {
  let s = normalizeSite(createSite({ name: 'Okami', languages: ['fr', 'ja'], baseUrl: 'https://www.exemple.be' }));
  s = setPublishSettings(s, { mode: 'php' });
  s = addPage(s, { slug: slugify('チーム'), title: { fr: 'Équipe', ja: 'チーム' } });
  s.pages[1].footerLink = true;
  s.pages[0].title = { fr: 'Accueil', ja: 'ホーム' };
  s.assets = { img_a: { file: 'photo.png', mime: 'image/png', dataUrl: PNG, width: 10, height: 10 } };
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const col = sec.children[0].children[0].id;
  const nodes = ['heading', 'text', 'video', 'map', 'gallery', 'social', 'form', 'card', 'icon-list', 'quote', 'stats', 'accordion', 'pricing', 'icon-box', 'site-logo', 'nav-menu', 'lang-switch', 'collection-list'].map(t => createNode(t));
  const by = t => nodes.find(n => n.type === t);
  by('heading').props.level = 'h1';
  by('video').props.url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  by('video').props.title = { fr: '' };
  by('gallery').props.items = [{ src: 'asset:img_a', alt: { fr: '' }, caption: { fr: '' } }];
  by('social').props.items = [{ network: 'email', url: 'info@exemple.be' }, { network: 'website', url: 'https://exemple.be' }];
  by('form').props.email = 'info@exemple.be';
  by('form').props.fields.push({ label: { fr: '' }, type: 'text', required: false });
  by('site-logo').props.showName = false;
  by('quote').props.author = '山田花子';
  by('map').props.address = '愛媛県久万高原町';
  s.header.logo = 'asset:img_a';
  const c = createCollection(s, { kind: 'events', name: 'Agenda' });
  s = addItem(c.site, c.id, { title: { fr: 'AG', ja: '総会' }, date: '2026-11-03', time: '19:00' }).site;
  by('collection-list').props.collection = c.id;
  for (const n of nodes) root = insertNode(root, col, n);
  /* tout le contenu traduit en japonais (le contenu n'est pas notre sujet : seuls les textes ajoutés par Atelier comptent) */
  walk(root, n => {
    for (const [k, v] of Object.entries(n.props || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && 'fr' in v) n.props[k] = { ...v, ja: v.fr ? '日本語の内容' : '' };
      if (Array.isArray(v)) for (const it of v) for (const [kk, vv] of Object.entries(it)) if (vv && typeof vv === 'object' && 'fr' in vv) it[kk] = { ...vv, ja: vv.fr ? '日本語の内容' : '' };
    }
    return true;
  });
  s = updatePageRoot(s, s.pages[0].id, root);
  s.footer.text = { fr: '© Okami', ja: '© Okami' };
  return s;
}

const FR_CHAR = /[àâçéèêëîïôûùüÿœ]/i;
const FR_WORDS = /\b(Aller au contenu|Lire la vidéo|se charge depuis|Afficher la carte|Agrandir|Site web|Merci|courriel|envoi a échoué|Informations|Fermer|Envoyer|Champ \d|Accueil|Menu)\b/;

/* Texte visible et attributs lus (aria-label, title, alt, data-sent, data-failed) d'une page publiée */
function visible(html) {
  const body = html.slice(html.indexOf('<body>')).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const attrs = [...body.matchAll(/\s(aria-label|title|alt|data-sent|data-failed|placeholder)="([^"]*)"/g)].map(m => m[2]);
  const text = body.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
  return [text, ...attrs].join(' | ').replace(/Français|Nederlands|Deutsch|English|日本語/g, '');
}

test('page publiée en japonais : <html lang="ja">, hreflang, sitemap, menu des langues ; aucun texte ajouté par Atelier en français', () => {
  const s = jaSite();
  const { files } = renderSite(s, { today: '2026-10-29' });
  const html = files.get('ja/index.html');
  assert.ok(html, [...files.keys()].join(', '));
  assert.ok(files.has('ja/chiimu/index.html'), 'page « チーム » publiée sous /ja/chiimu/');
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<link rel="alternate" hreflang="ja" href="https:\/\/www\.exemple\.be\/ja\/">/);
  assert.match(html, /<link rel="alternate" hreflang="fr" href="https:\/\/www\.exemple\.be\/">/);
  assert.match(html, /<a lang="ja" hreflang="ja" aria-current="true" title="日本語" href="\.\/">JA<\/a>/);
  assert.match(files.get('sitemap.xml'), /hreflang="ja" href="https:\/\/www\.exemple\.be\/ja\/chiimu\/"/);
  const v = visible(html);
  assert.ok(!FR_CHAR.test(v), `caractère français visible : ${v.match(new RegExp(`.{0,40}${FR_CHAR.source}.{0,40}`, 'i'))?.[0]}`);
  assert.ok(!FR_WORDS.test(v), `texte français visible : ${v.match(FR_WORDS)?.[0]}`);
  for (const ja of ['本文へ移動', '動画を再生：動画', 'クリックすると YouTube から動画を読み込みます。', '地図を表示（Google マップ）', '拡大', 'メール', 'ウェブサイト', 'ありがとうございます。メッセージを送信しました。', '送信できませんでした。', '項目 4', 'メニュー', 'サイト情報', 'ホーム']) assert.ok(html.includes(ja), `texte japonais attendu : ${ja}`);
  assert.match(html, /2026年11月3日/, 'date de l’agenda en japonais');
  /* la version française n'a pas bougé */
  const fr = files.get('index.html');
  assert.match(fr, /<html lang="fr">/);
  for (const t of ['Aller au contenu', 'Lire la vidéo : Vidéo', 'Afficher la carte (Google Maps)', 'Merci, votre message a été envoyé.', 'aria-label="Informations"']) assert.ok(fr.includes(t), t);
});

test('fenêtre en japonais dans une page publiée : bouton Fermer en japonais', () => {
  let s = jaSite();
  let r1 = s.pages[1].root;
  const sec = createSectionWithColumns(1);
  r1 = insertNode(r1, r1.id, sec);
  s = updatePageRoot(s, s.pages[1].id, r1);
  const { site: s2, id } = createComponent(s, s.pages[1].id, sec.id, 'Popup');
  const btn = createNode('button');
  btn.props.link = `popup:${id}`;
  btn.props.label = { fr: 'Ouvrir', ja: '開く' };
  let root = s2.pages[0].root;
  root = insertNode(root, root.children[0].children[0].children[0].id, btn);
  s = updatePageRoot(s2, s2.pages[0].id, root);
  const html = renderPage(s, s.pages[0], 'ja');
  assert.match(html, /class="popup__close"[^>]*aria-label="閉じる"/);
});

test('les textes publiés suivent la langue de la page, jamais celle de l’éditeur', () => {
  const s = jaSite();
  setUiLanguage('en', { 'Vidéo': 'Video', 'Agrandir': 'Enlarge' });
  try {
    const fr = renderPage(s, s.pages[0], 'fr');
    assert.ok(fr.includes('Lire la vidéo : Vidéo') && fr.includes('Aller au contenu'), 'page française en français');
    const ja = renderPage(s, s.pages[0], 'ja');
    assert.ok(ja.includes('動画を再生') && !ja.includes('Play video'), 'page japonaise en japonais');
  } finally { setUiLanguage(null); }
  for (const [k, d] of Object.entries(SITE_TEXT)) for (const l of ['fr', 'nl', 'de', 'en', 'ja']) assert.ok(d[l], `${k} : ${l}`);
  assert.equal(siteText('playVideo', 'ja', { title: 'PV' }), '動画を再生：PV');
  assert.equal(siteText('skip', 'xx'), 'Aller au contenu', 'langue inconnue : français');
});

test('agenda : dates en japonais', () => {
  assert.equal(formatDate('2026-11-03', 'ja', 'long'), '2026年11月3日');
  assert.match(whenText({ date: '2026-11-03', time: '19:00' }, 'ja'), /^2026年11月3日.*曜日 · 19:00$/);
});

/* ---------- Polices ---------- */
test('polices : pile japonaise de repli pour :lang(ja), après la police du thème et avant la famille générique', () => {
  let s = normalizeSite(createSite({ languages: ['fr', 'ja'] }));
  s.theme.fonts = { heading: 'archivo', body: 'georgia' };
  const css = buildCss(s, s.pages);
  const m = /:root:lang\(ja\)\{--font-h:([^;]+);--font-b:([^}]+)\}/.exec(css);
  assert.ok(m, 'règle :lang(ja)');
  const [, h, b] = m;
  assert.ok(h.startsWith('"Archivo"') && h.endsWith('sans-serif'), h);
  for (const f of ['Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', 'Meiryo']) assert.ok(h.includes(f), f);
  assert.ok(h.indexOf('"Archivo"') < h.indexOf('Hiragino') && h.indexOf('Meiryo') < h.lastIndexOf('sans-serif'));
  assert.ok(b.startsWith('Georgia') && b.includes('Hiragino Mincho ProN') && b.endsWith('serif'), b);
  assert.match(css, /:lang\(ja\) h1,:lang\(ja\) h2/);
  const fr = buildCss(normalizeSite(createSite({ languages: ['fr', 'nl'] })), []);
  assert.ok(!fr.includes(':lang(ja)'), 'rien d’ajouté quand le japonais n’est pas utilisé');
  const inter = jaFontStack('Inter');
  assert.ok(inter.startsWith('Inter, "Hiragino Sans"') && inter.endsWith(', sans-serif'), inter);
});

/* ---------- Référencement ---------- */
function seoPage(title, desc, body = '') {
  let s = normalizeSite(createSite({ name: 'Okami', languages: ['ja'], baseUrl: 'https://www.exemple.be' }));
  s = addPage(s, { slug: slugify('チーム'), title: { ja: title } });
  const p = s.pages[1];
  let root = p.root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const h1 = createNode('heading'); h1.props.level = 'h1'; h1.props.text = { ja: title };
  const t = createNode('text'); t.props.content = { ja: `<p>${body}</p>` };
  root = insertNode(root, sec.children[0].children[0].id, h1);
  root = insertNode(root, sec.children[0].children[0].id, t);
  s = updatePageRoot(s, p.id, root);
  s = setSeoField(s, p.id, 'title', title, 'ja');
  if (desc) s = setSeoField(s, p.id, 'description', desc, 'ja');
  return { site: s, page: s.pages[1] };
}
const ids = a => a.checks.map(c => c.id);

test('SEO japonais : seuils en caractères (titre ≤ 32, description 80 à 120, 300 caractères de texte)', () => {
  assert.deepEqual(seoLimits('fr'), SEO_LIMITS);
  assert.deepEqual(seoLimits('ja'), SEO_LIMITS_JA);
  assert.equal(SEO_LIMITS_JA.titleMax, 32);
  const J = n => 'あ'.repeat(n);
  let { site, page } = seoPage(`熊高原の${J(10)}`, J(100), J(320));
  let a = analyzePage(site, page, 'ja');
  assert.ok(ids(a).includes('title-ok') && ids(a).includes('desc-ok') && ids(a).includes('words-ok'), ids(a).join(', '));
  assert.equal(a.stats.chars >= 320, true);
  ({ site, page } = seoPage(J(40), J(50), J(100)));
  a = analyzePage(site, page, 'ja');
  assert.ok(ids(a).includes('title-long') && ids(a).includes('desc-short') && ids(a).includes('thin'), ids(a).join(', '));
  assert.match(a.checks.find(c => c.id === 'desc-short').message, /visez 80 à 120/);
  assert.match(a.checks.find(c => c.id === 'thin').message, /\(140 caractères\).*300 caractères/);
  ({ site, page } = seoPage(J(20), J(130), J(400)));
  assert.ok(ids(analyzePage(site, page, 'ja')).includes('desc-long'));
  /* le même titre de 40 caractères est correct en français */
  let f = normalizeSite(createSite({ name: 'Okami', languages: ['fr'] }));
  f = addPage(f, { slug: 'x', title: { fr: 'a'.repeat(40) } });
  f = setSeoField(f, f.pages[1].id, 'title', 'a'.repeat(40), 'fr');
  assert.ok(ids(analyzePage(f, f.pages[1], 'fr')).includes('title-ok'));
});

test('SEO japonais : mot-clé en japonais cherché sans espaces ; comparé à l’adresse en rōmaji ; liens vagues japonais', () => {
  const { site, page } = seoPage('チームの紹介ページです', 'あ'.repeat(90), 'わたしたちのチームを紹介します。' + 'い'.repeat(300));
  let s = setSeoField(site, page.id, 'keyword', 'チーム', 'ja');
  let a = analyzePage(s, s.pages[1], 'ja');
  const lvl = id => a.checks.find(c => c.id === id)?.level;
  assert.equal(lvl('keyword-title'), 'good');
  assert.equal(lvl('keyword-h1'), 'good');
  assert.equal(lvl('keyword-intro'), 'good');
  assert.equal(lvl('keyword-desc'), 'tip', 'absent de la description');
  assert.equal(lvl('keyword-slug'), 'good', 'チーム ↔ /chiimu/');
  s = setSeoField(s, page.id, 'keyword', '会社', 'ja');
  a = analyzePage(s, s.pages[1], 'ja');
  assert.ok(!a.checks.some(c => c.id === 'keyword-slug'), 'mot-clé en kanji : pas de vérification de l’adresse');
  assert.equal(a.checks.find(c => c.id === 'keyword-title').level, 'tip');
  /* lien « こちら » */
  let root = s.pages[1].root;
  const b = createNode('button'); b.props.label = { ja: 'こちら' }; b.props.link = 'https://exemple.be';
  root = insertNode(root, root.children[0].children[0].children[0].id, b);
  s = updatePageRoot(s, s.pages[1].id, root);
  assert.ok(ids(analyzePage(s, s.pages[1], 'ja')).includes('link-vague'));
});

/* ---------- Traduction automatique fr → ja, CSV ---------- */
test('traduction automatique fr → ja (balises gardées, marquée « à relire ») et CSV avec une colonne ja', async () => {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr', 'ja'] }));
  s = addPage(s, { slug: 'equipe', title: { fr: 'Équipe' } });
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const t = createNode('text'); t.props.content = { fr: '<p>Bonjour <strong>à tous</strong></p>' };
  root = insertNode(root, sec.children[0].children[0].id, t);
  s = updatePageRoot(s, s.pages[0].id, root);
  const dict = { 'Équipe': 'チーム', Bonjour: 'こんにちは', 'à tous': '皆さん', Accueil: 'ホーム' };
  const calls = [];
  const r = await autoTranslate(s, 'ja', (txt, from, to) => { calls.push(`${from}>${to}`); return dict[txt] ?? `[ja] ${txt}`; });
  assert.ok(r.count > 0 && !r.errors, JSON.stringify(r));
  assert.ok(calls.every(c => c === 'fr>ja'));
  s = r.site;
  assert.equal(s.pages[1].title.ja, 'チーム');
  const node = s.pages[0].root.children[0].children[0].children[0].children[0];
  assert.equal(node.props.content.ja, '<p>こんにちは <strong>皆さん</strong></p>');
  assert.ok(reviewItems(s).some(x => x.lang === 'ja'));
  assert.equal(suggestSlug(s, s.pages[1], 'ja'), 'chiimu');
  const csv = exportCsv(s);
  assert.match(csv.split('\r\n')[0], /^﻿?key,type,fr,ja$/);
  const edited = csv.replace('チーム', 'メンバー');
  const back = importCsv(s, edited);
  assert.equal(back.site.pages[1].title.ja, 'メンバー');
  assert.ok(translatableItems(back.site).some(it => it.values.ja === 'メンバー'));
});

/* ---------- Messages de l'éditeur traduits ---------- */
test('messages de validation dans la langue de l’interface', () => {
  setUiLanguage('ja', { 'Donnez un nom à la page.': 'ページに名前を付けてください。', 'Une page « {slug} » existe déjà.': 'ページ「{slug}」はすでにあります。' });
  try {
    const s = normalizeSite(createSite({ languages: ['fr'] }));
    assert.throws(() => addPage(s, { slug: '', title: {} }), /ページに名前を付けてください/);
    const s2 = addPage(s, { slug: 'a', title: {} });
    assert.throws(() => addPage(s2, { slug: 'a', title: {} }), /ページ「a」はすでにあります/);
  } finally { setUiLanguage(null); }
  assert.throws(() => addPage(normalizeSite(createSite({ languages: ['fr'] })), { slug: '', title: {} }), /Donnez un nom/);
});

test('SEO : points sur les titres classés par code, même avec les messages traduits', () => {
  setUiLanguage('en', { 'aucun titre principal (H1) : Google et les lecteurs d’écran en attendent un par page.': 'no main heading (H1): one per page is expected.', '{n} titres principaux (H1) : gardez-en un seul par page.': '{n} main headings (H1): keep only one.' });
  try {
    let s = normalizeSite(createSite({ name: 'Okami', languages: ['fr'] }));
    let root = s.pages[0].root;
    const sec = createSectionWithColumns(1);
    root = insertNode(root, root.id, sec);
    s = updatePageRoot(s, s.pages[0].id, root);
    let a = analyzePage(s, s.pages[0], 'fr');
    assert.ok(ids(a).includes('h1-none') && !ids(a).includes('h1-ok'), ids(a).join(', '));
    assert.match(a.checks.find(c => c.id === 'h1-none').message, /^No main heading/);
    for (let i = 0; i < 2; i++) { const h = createNode('heading'); h.props.level = 'h1'; root = insertNode(root, sec.children[0].children[0].id, h); }
    s = updatePageRoot(s, s.pages[0].id, root);
    a = analyzePage(s, s.pages[0], 'fr');
    assert.ok(ids(a).includes('h1-many') && !ids(a).includes('h1-ok'), ids(a).join(', '));
  } finally { setUiLanguage(null); }
});
