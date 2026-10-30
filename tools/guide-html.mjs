/*
 * Guide en HTML (cycle 24) : node tools/guide-html.mjs → guide/<fr|en|ja>/*.html, guide/assets/, guide/journaux/.
 * Sources : docs/guide/*.md (français), docs/guide/en/*.md, docs/guide/ja/*.md.
 * Chaque page : navigation par parties, sommaire de la page, recherche dans la langue, autres langues,
 * « Détails techniques » repliés par défaut (journal, codes), précédent / suivant, captures de l'éditeur.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mdToHtml } from './md.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = { fr: join(ROOT, 'docs/guide'), en: join(ROOT, 'docs/guide/en'), ja: join(ROOT, 'docs/guide/ja') };
const OUT = join(ROOT, 'guide');
export const LANGS = ['fr', 'en', 'ja'];

export const GROUPS = [
  { id: 'start', label: { fr: 'Pour commencer', en: 'Getting started', ja: 'はじめに' }, files: ['README', 'bienvenue', 'prise-en-main', 'widgets'] },
  { id: 'use', label: { fr: 'Créer et gérer ton site', en: 'Building and managing your site', ja: 'サイトを作る・管理する' }, files: ['01-demarrage-projet', '02-edition', '03-style-design', '04-pages-images-contenus', '05-langues-traductions', '06-seo', '08-verifier-exporter-publier', '09-site-publie'] },
  { id: 'ai', label: { fr: 'IA locale', en: 'On-device AI', ja: 'オンデバイスAI' }, files: ['07-ia-locale', '12-contenus-intelligents', '13-demander-a-atelier', '14-banc-essai'] },
  { id: 'team', label: { fr: 'À plusieurs', en: 'Working together', ja: '共同作業' }, files: ['10-collaboration', '11-relecture-commentaires'] },
  { id: 'help', label: { fr: 'Vérifier et dépanner', en: 'Checks and troubleshooting', ja: '確認とトラブル対処' }, files: ['15-auto-test', '00-journal', 'index-codes'] }
];

export const T = {
  fr: { guide: 'Guide d’Atelier', search: 'Rechercher dans le guide…', tech: 'Afficher les détails techniques', techLog: 'Détails techniques : journal attendu', toc: 'Sur cette page', prev: 'Précédent', next: 'Suivant', editor: 'Ouvrir l’éditeur', langs: 'Langue du guide', noResult: 'Aucun résultat.', missing: 'Cette page n’existe pas encore dans cette langue : version française.', inPictures: 'En image', menu: 'Sommaire', top: 'Haut de page', skip: 'Aller au contenu', home: 'Accueil du guide' },
  en: { guide: 'Atelier guide', search: 'Search the guide…', tech: 'Show technical details', techLog: 'Technical details: expected log', toc: 'On this page', prev: 'Previous', next: 'Next', editor: 'Open the editor', langs: 'Guide language', noResult: 'No results.', missing: 'This page is not available in this language yet: French version.', inPictures: 'In pictures', menu: 'Contents', top: 'Back to top', skip: 'Skip to content', home: 'Guide home' },
  ja: { guide: 'Atelier ガイド', search: 'ガイドを検索…', tech: '技術的な詳細を表示', techLog: '技術的な詳細：想定されるログ', toc: 'このページの内容', prev: '前へ', next: '次へ', editor: 'エディターを開く', langs: 'ガイドの言語', noResult: '見つかりませんでした。', missing: 'このページはまだこの言語にありません。フランス語版を表示しています。', inPictures: '画面で見る', menu: '目次', top: 'ページの先頭へ', skip: '本文へ移動', home: 'ガイドのトップ' }
};

/* Captures de l'éditeur (tools/e2e/guide-captures.mjs) placées en tête de chapitre */
export const PICTURES = {
  bienvenue: [['editeur', { fr: 'L’éditeur : bibliothèque des widgets à gauche, la page au centre, l’inspecteur à droite', en: 'The editor: widget library on the left, the page in the middle, the inspector on the right', ja: 'エディター：左にウィジェット、中央にページ、右にインスペクター' }]],
  '02-edition': [['editeur', { fr: 'Le panneau Widgets, la page et l’inspecteur', en: 'The Widgets panel, the page and the inspector', ja: 'ウィジェットパネル、ページ、インスペクター' }]],
  '03-style-design': [['style', { fr: 'L’onglet Style de l’inspecteur', en: 'The Style tab of the inspector', ja: 'インスペクターのスタイルタブ' }]],
  '04-pages-images-contenus': [['pages', { fr: 'Le panneau Pages', en: 'The Pages panel', ja: 'ページパネル' }]],
  '05-langues-traductions': [['traductions', { fr: 'Le tableau des traductions', en: 'The translations table', ja: '翻訳表' }]],
  '06-seo': [['seo', { fr: 'La fenêtre Référencement', en: 'The SEO window', ja: 'SEO ウィンドウ' }]],
  '07-ia-locale': [['ia', { fr: 'La fenêtre ✨ IA locale', en: 'The ✨ on-device AI window', ja: '✨ オンデバイスAI ウィンドウ' }]],
  '08-verifier-exporter-publier': [['publier', { fr: 'La fenêtre Publier', en: 'The Publish window', ja: '公開ウィンドウ' }]],
  '10-collaboration': [['collab', { fr: 'La fenêtre Travailler à plusieurs', en: 'The Collaborate window', ja: '共同編集ウィンドウ' }]],
  '15-auto-test': [['autotest', { fr: 'Le rapport de l’auto-test', en: 'The self-test report', ja: 'セルフテストのレポート' }]],
  '01-demarrage-projet': [['nouveau-site', { fr: 'La fenêtre Nouveau site vide : nom, langue principale, autres langues', en: 'The New empty site window: name, main language, other languages', ja: '「新しい空のサイト」ウィンドウ：名前、メイン言語、ほかの言語' }]],
  'prise-en-main': [['nouveau-site', { fr: 'Étape 1 : un site dont le japonais est la langue principale', en: 'Step 1: a site with Japanese as its main language', ja: '手順 1：日本語をメイン言語にしたサイト' }]],
  widgets: [['editeur', { fr: 'Les widgets, rangés par famille dans le panneau de gauche', en: 'The widgets, grouped by family in the left panel', ja: '左パネルに種類ごとに並んだウィジェット' }]],
  '00-journal': [['journal', { fr: 'La fenêtre 🐞 Journal', en: 'The 🐞 Log window', ja: '🐞 ログウィンドウ' }]]
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = html => html.replace(/<details class="tech">[\s\S]*?<\/details>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const pageName = f => (f === 'README' ? 'index' : f);

export function readChapters(lang) {
  const out = [];
  for (const g of GROUPS) for (const f of g.files) {
    const own = join(SRC[lang], `${f}.md`);
    const fallback = join(SRC.fr, `${f}.md`);
    const file = existsSync(own) ? own : existsSync(fallback) ? fallback : null;
    if (!file) continue;
    const md = readFileSync(file, 'utf8');
    const title = f === 'README' ? T[lang].home : (md.match(/^#\s+(.+)$/m)?.[1] || f).replace(/[`*]/g, '').trim();
    out.push({ file: f, group: g.id, md, title, fallback: file !== own });
  }
  return out;
}

function nav(lang, chapters, current) {
  return GROUPS.map(g => {
    const items = chapters.filter(c => c.group === g.id);
    if (!items.length) return '';
    return `<div class="nav-group"><p class="nav-title">${esc(g.label[lang])}</p><ul>${items.map(c => `<li><a href="${pageName(c.file)}.html"${c.file === current ? ' aria-current="page"' : ''}>${esc(c.title)}</a></li>`).join('')}</ul></div>`;
  }).join('');
}

const NESTED_TOC = new Set(['prise-en-main']);

function page(lang, chapters, c, k) {
  const t = T[lang];
  /* journaux partagés ; liens entre langues (en/…, ja/…, ../README.md) → pages sœurs */
  const md = c.md.replace(/\]\((\.\.\/)?journaux\//g, '](../journaux/')
    .replace(/\]\((en|ja)\//g, '](../$1/')
    .replace(/\]\(\.\.\/([\w-]+\.md)/g, '](../fr/$1');
  const { html, headings } = mdToHtml(md, { techLabel: t.techLog });
  const pics = (PICTURES[c.file] || []).map(([img, cap]) => `<figure class="shot"><img src="../assets/captures/${lang}/${img}.jpg" alt="${esc(cap[lang])}" loading="lazy" width="1440" height="900"><figcaption>${esc(t.inPictures)}${{ fr: ' : ', en: ': ', ja: '：' }[lang]}${esc(cap[lang])}</figcaption></figure>`).join('');
  const body0 = html;
  /* Sommaire : les titres de niveau 2 ; pour un tutoriel (parties puis étapes), les étapes sous chaque partie */
  const nested = NESTED_TOC.has(c.file);
  const link = h => `<a href="#${esc(h.id)}">${esc(h.text)}</a>`;
  const toc = nested
    ? headings.filter(h => h.level === 2).map(h => {
      const subs = headings.slice(headings.indexOf(h) + 1);
      const end = subs.findIndex(x => x.level <= 2);
      const kids = (end < 0 ? subs : subs.slice(0, end)).filter(x => x.level === 3);
      return `<li>${link(h)}${kids.length ? `<ol>${kids.map(k => `<li>${link(k)}</li>`).join('')}</ol>` : ''}</li>`;
    }).join('')
    : headings.filter(h => h.level === 2).map(h => `<li>${link(h)}</li>`).join('');
  const prev = chapters[k - 1];
  const next = chapters[k + 1];
  const other = LANGS.filter(l => l !== lang).map(l => `<a href="../${l}/${pageName(c.file)}.html" hreflang="${l}" lang="${l}">${{ fr: 'Français', en: 'English', ja: '日本語' }[l]}</a>`).join(' · ');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)} — ${esc(t.guide)}</title>
<link rel="stylesheet" href="../assets/guide.css">
<script>try{if(localStorage.getItem('atelier-guide-tech')==='1')document.documentElement.classList.add('show-tech')}catch(e){}</script>
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="g-top">
  <a class="g-brand" href="index.html"><span class="g-logo" aria-hidden="true">◧</span> ${esc(t.guide)}</a>
  <div class="g-search" role="search"><input type="search" id="gSearch" placeholder="${esc(t.search)}" aria-label="${esc(t.search)}" autocomplete="off"><ol id="gResults" class="g-results" hidden></ol></div>
  <label class="g-tech"><input type="checkbox" id="gTech"> ${esc(t.tech)}</label>
  <nav class="g-langs" aria-label="${esc(t.langs)}">${other}</nav>
  <a class="g-editor" href="../../index.html?lang=${lang}">${esc(t.editor)}</a>
  <button type="button" class="g-menu" id="gMenu" aria-expanded="false" aria-controls="gNav">☰ ${esc(t.menu)}</button>
</header>
<div class="g-layout">
<nav class="g-nav" id="gNav" aria-label="${esc(t.menu)}">${nav(lang, chapters, c.file)}</nav>
<main id="main" class="g-main">
${c.fallback ? `<p class="g-missing">${esc(t.missing)}</p>` : ''}
<article class="g-article">${body0.replace(/(<\/h1>)/, `$1${pics}${toc ? `<details class="g-toc${nested ? ' g-toc--nested' : ''}" open><summary>${esc(t.toc)}</summary><ol>${toc}</ol></details>` : ''}`)}</article>
<nav class="g-pager">${prev ? `<a rel="prev" href="${pageName(prev.file)}.html">← ${esc(t.prev)} : ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a rel="next" href="${pageName(next.file)}.html">${esc(t.next)} : ${esc(next.title)} →</a>` : ''}</nav>
</main>
</div>
<script>window.GUIDE={lang:${JSON.stringify(lang)},noResult:${JSON.stringify(t.noResult)}};</script>
<script src="search-index.js"></script>
<script src="../assets/guide.js"></script>
</body>
</html>
`;
}

export function build() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'assets'), { recursive: true });
  for (const f of ['guide.css', 'guide.js']) copyFileSync(join(ROOT, 'tools/guide-assets', f), join(OUT, 'assets', f));
  const capSrc = join(ROOT, 'docs/captures/guide');
  for (const lang of LANGS) {
    const dir = join(capSrc, lang);
    if (!existsSync(dir)) continue;
    mkdirSync(join(OUT, 'assets/captures', lang), { recursive: true });
    for (const f of readdirSync(dir)) copyFileSync(join(dir, f), join(OUT, 'assets/captures', lang, f));
  }
  mkdirSync(join(OUT, 'journaux'), { recursive: true });
  for (const f of readdirSync(join(ROOT, 'docs/guide/journaux'))) copyFileSync(join(ROOT, 'docs/guide/journaux', f), join(OUT, 'journaux', f));
  const report = {};
  for (const lang of LANGS) {
    const chapters = readChapters(lang);
    mkdirSync(join(OUT, lang), { recursive: true });
    const index = [];
    chapters.forEach((c, k) => {
      const html = page(lang, chapters, c, k);
      writeFileSync(join(OUT, lang, `${pageName(c.file)}.html`), html);
      /* index de recherche : une entrée par section (titre de niveau 2 ou 3) */
      const art = html.split('<article class="g-article">')[1].split('</article>')[0];
      const parts = art.split(/(?=<h[23] id=")/);
      for (const p of parts) {
        const m = p.match(/^<h[23] id="([^"]+)">([\s\S]*?)<\/h[23]>/);
        const text = plain(p).slice(0, 600);
        index.push({ p: `${pageName(c.file)}.html${m ? `#${m[1]}` : ''}`, c: c.title, h: m ? plain(m[2]) : c.title, x: text });
      }
    });
    writeFileSync(join(OUT, lang, 'search-index.js'), `window.GUIDE_INDEX=${JSON.stringify(index)};\n`);
    report[lang] = { pages: chapters.length, fallback: chapters.filter(c => c.fallback).map(c => c.file), sections: index.length };
  }
  writeFileSync(join(OUT, 'index.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Atelier — guide</title>
<script>(function(){var l='fr';try{l=localStorage.getItem('atelier-ui-lang')||'';}catch(e){}if(!/^(fr|en|ja)$/.test(l)){var n=navigator.languages||[navigator.language||'fr'];l='en';for(var i=0;i<n.length;i++){var b=String(n[i]).slice(0,2).toLowerCase();if(/^(fr|en|ja)$/.test(b)){l=b;break;}}}location.replace(l+'/index.html');})();</script></head>
<body><p><a href="fr/index.html">Français</a> · <a href="en/index.html">English</a> · <a href="ja/index.html">日本語</a></p></body></html>\n`);
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = build();
  for (const [l, v] of Object.entries(r)) console.log(`${l} : ${v.pages} pages, ${v.sections} sections${v.fallback.length ? ` · en français faute de traduction : ${v.fallback.join(', ')}` : ''}`);
}
