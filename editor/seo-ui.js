/* Référencement : notes par page, aperçus Google et partage, réglages, points à corriger, ✨ propositions de l'IA locale. */
import { h, $, toast } from './dom.js';
import { state, commit, setView, select, subscribe } from './store.js';
import { analyzeSite, analyzePage, setSeoField, seoTitle, seoDescription, pageText, seoLimits, hostToUnicode } from '../core/seo.js';
import { pageDir, translate } from '../core/render.js';
import { LANG_LABELS } from '../core/site.js';
import { setProp, findNode } from '../core/tree.js';
import { updatePageRoot } from '../core/site.js';
import { imageControl } from './fields.js';
import { withAI, markAi, describeImage } from './ai-ui.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

let cur = null;
/* Langue principale : description absente ou automatique ; autres langues : pas encore écrite dans cette langue */
const needsDesc = (site, p, lang) => (lang === site.defaultLanguage ? (seoDescription(site, p, lang).auto || !seoDescription(site, p, lang).text) : !p.seo?.description?.[lang]);
const ICON = { good: '✓', warn: '⚠', bad: '✗', tip: '•', info: 'ℹ' };
const scoreClass = n => (n >= 85 ? 'is-good' : n >= 60 ? 'is-mid' : 'is-bad');

/* Nombre de points par niveau (✗ bad, ⚠ warn, • tip, ℹ info, ✓ good) */
const countLevels = checks => checks.reduce((o, c) => { o[c.level] = (o[c.level] || 0) + 1; return o; }, {});

function apply(fn, opts = {}) {
  try { commit(fn(state.site), { source: 'seo', ...opts }); return true; } catch (e) { log.warn('seo.apply-fail', __('Réglage de référencement refusé : {error}', { error: e.message }), { pageId: cur?.pageId, lang: cur?.lang, error: e }); toast(e.message, 'error'); return false; }
}

const host = () => hostToUnicode(String(state.site.baseUrl || 'https://www.votre-site.be').replace(/^https?:\/\//, '').replace(/\/.*$/, ''));

function googlePreview(page, lang) {
  const t = seoTitle(state.site, page, lang);
  const d = seoDescription(state.site, page, lang);
  const segs = pageDir(state.site, page, lang);
  const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);
  return h('div', { class: 'serp', 'data-seo-preview': '' },
    h('div', { class: 'serp__site' }, h('span', { class: 'serp__fav', 'aria-hidden': 'true' }, (state.site.name || '?')[0]), h('span', {}, h('strong', {}, state.site.name), h('small', { 'data-site-content': '' }, [host(), ...segs].join(' › ')))),
    h('div', { class: 'serp__title' }, cut(t, seoLimits(lang).titleMax)),
    h('div', { class: 'serp__desc' }, d.text ? cut(d.text, seoLimits(lang).descMax) : h('em', {}, __('Pas de description'))));
}

function sharePreview(page, lang) {
  const img = page.seo?.image || (() => { let s = ''; const w = n => { if (s) return; if (n.type === 'image' && n.props?.src) s = n.props.src; (n.children || []).forEach(w); }; w(page.root); return s; })();
  const a = String(img).startsWith('asset:') ? state.site.assets?.[img.slice(6)] : null;
  const src = a ? a.dataUrl : /^https:/.test(img) ? img : '';
  return h('div', { class: 'share' },
    src ? h('img', { src, alt: '' }) : h('div', { class: 'share__noimg' }, __('Pas d’image de partage')),
    h('div', { class: 'share__body' }, h('small', { 'data-site-content': '' }, host().toUpperCase()), h('strong', {}, seoTitle(state.site, page, lang)), h('span', {}, seoDescription(state.site, page, lang).text.slice(0, 110))));
}

function counter(input, max) {
  const c = h('span', { class: 'seo-count' });
  const upd = () => { const auto = !input.value; const n = auto ? input.placeholder.length : input.value.length; c.textContent = auto ? __('{n} / {max} (automatique)', { n, max }) : `${n} / ${max}`; c.classList.toggle('is-over', n > max); };
  input.addEventListener('input', upd);
  upd();
  return c;
}

async function suggest(kind, page, lang) {
  const site = state.site;
  const def = site.defaultLanguage;
  const srcLang = ['fr', 'de', 'en'].includes(lang) ? lang : def;
  const input = { title: translate(site, page.title, srcLang), text: pageText(site, page, srcLang), keyword: translate(site, page.seo?.keyword, srcLang), lang, sourceLang: srcLang, siteName: site.name };
  /* Les appels à l'IA sont journalisés par ai.description / ai.title / ai.keywords ; ici, ce qui arrive dans le site */
  log.debug('seo.ai-ask', __('Proposition demandée : {kind}', { kind }), { kind, pageId: page.id, lang, sourceLang: srcLang, inLen: input.text.length });
  if (kind === 'description') {
    const r = await withAI(__('Description pour Google'), a => a.seoDescription(input));
    if (r && apply(s => markAi(setSeoField(s, page.id, 'description', r.value, lang), `p:${page.id}:seo`, lang))) { log.info('seo.ai-applied', __('Description de l’IA appliquée (marquée « à relire »)'), { kind, pageId: page.id, lang, len: r.value.length, via: r.via, translated: !!r.translated, warning: r.warning }); toast(r.warning || __('Description proposée (marquée « à relire »).')); render(); }
  }
  if (kind === 'title') {
    const r = await withAI(__('Titre pour Google'), a => a.seoTitle(input));
    if (r && apply(s => markAi(setSeoField(s, page.id, 'title', r.value, lang), `p:${page.id}:seotitle`, lang))) { log.info('seo.ai-applied', __('Titre de l’IA appliqué (marqué « à relire »)'), { kind, pageId: page.id, lang, len: r.value.length, translated: !!r.translated }); render(); }
  }
  if (kind === 'keywords') {
    const r = await withAI(__('Mots-clés'), a => a.keywords(input));
    if (r) { cur.keywords = r.value; log.info('seo.ai-applied', __('{n} idée(s) de mots-clés affichée(s)', { n: r.value.length }), { kind, pageId: page.id, lang, count: r.value.length, translated: !!r.translated }); render(); }
  }
}

async function describeMissing(page, lang) {
  const a = analyzePage(state.site, page, lang);
  const ids = [...new Set(a.checks.filter(c => c.id === 'img-alt' && c.nodeId).map(c => c.nodeId))];
  const f = log.flow('seo.alts', __('Textes alternatifs manquants : {n} image(s)', { n: ids.length }), { pageId: page.id, lang, images: ids.length });
  let done = 0;
  let skipped = 0;
  for (const id of ids) {
    const n = findNode(state.site.pages.find(p => p.id === page.id).root, id);
    if (n?.type !== 'image' || !n.props.src) { skipped++; continue; }
    const r = await describeImage(n.props.src, `${translate(state.site, page.title, lang)} — ${pageText(state.site, page, lang).slice(0, 300)}`, lang);
    if (!r) { f.warn('stopped', __('Arrêt : l’IA n’a pas pu décrire une image (voir ai.alt ci-dessus)'), { nodeId: id, done }); break; }
    const pg = state.site.pages.find(p => p.id === page.id);
    if (apply(s => markAi(updatePageRoot(s, page.id, setProp(pg.root, id, 'alt', r.value, lang)), `n:${page.id}:${id}:alt`, lang))) { done++; f.step('image', __('Texte alternatif appliqué'), { nodeId: id, len: r.value.length, decorative: r.decorative || undefined }); }
  }
  f.ok(__('{done} texte(s) alternatif(s) proposé(s) sur {n}', { done, n: ids.length }), { done, images: ids.length, skipped });
  toast(done ? __n(done, '{n} texte alternatif proposé (à relire).', '{n} textes alternatifs proposés (à relire).') : __('Aucune image à décrire.'));
  render();
}

async function completeAll(lang) {
  const site = state.site;
  const todo = site.pages.filter(p => needsDesc(site, p, lang));
  const f = log.flow('seo.complete-all', __('Compléter les descriptions en {lang} : {n} page(s)', { lang, n: todo.length }), { lang, pages: todo.length, ids: todo.map(p => p.id) });
  let n = 0;
  for (const p of todo) {
    const srcLang = ['fr', 'de', 'en'].includes(lang) ? lang : site.defaultLanguage;
    const r = await withAI(__('Description de « {page} »', { page: translate(site, p.title, srcLang) }), a => a.seoDescription({ title: translate(site, p.title, srcLang), text: pageText(state.site, p, srcLang), keyword: translate(site, p.seo?.keyword, srcLang), lang, sourceLang: srcLang, siteName: site.name }));
    if (!r) { f.warn('stopped', __('Arrêt après {n} page(s) : l’IA a échoué (voir ai.description ci-dessus)', { n }), { pageId: p.id, done: n }); break; }
    if (apply(s => markAi(setSeoField(s, p.id, 'description', r.value, lang), `p:${p.id}:seo`, lang))) { n++; f.step('page', __('Description appliquée : {page}', { page: p.slug ? `/${p.slug}/` : __('accueil') }), { pageId: p.id, len: r.value.length, translated: !!r.translated }); }
  }
  f.ok(__('{done} description(s) proposée(s) sur {n}', { done: n, n: todo.length }), { done: n, pages: todo.length, lang });
  toast(__n(n, '{n} description proposée en {lang} (à relire dans le tableau des traductions, filtre « à relire »).', '{n} descriptions proposées en {lang} (à relire dans le tableau des traductions, filtre « à relire »).', { lang: lang.toUpperCase() }));
  render();
}

function pageDetail(page, lang, analysis) {
  const seo = page.seo || {};
  const title = h('input', { class: 'input', type: 'text', value: seo.title?.[lang] || '', placeholder: seoTitle({ ...state.site, pages: [] }, { ...page, seo: {} }, lang), 'data-seo': 'title', 'aria-label': __('Titre pour Google'), maxlength: 90 });
  const desc = h('textarea', { class: 'input', rows: 3, 'data-seo': 'description', placeholder: seoDescription(state.site, { ...page, seo: {} }, lang).text || __('Une ou deux phrases qui donnent envie de cliquer'), 'aria-label': __('Description pour Google') });
  desc.value = seo.description?.[lang] || '';
  const kw = h('input', { class: 'input', type: 'text', value: seo.keyword?.[lang] || '', placeholder: __('ex. médias alternatifs belges'), 'data-seo': 'keyword', 'aria-label': __('Mot-clé principal') });
  const live = (el, field) => {
    el.addEventListener('input', () => {
      apply(s => setSeoField(s, page.id, field, el.value, lang), { key: `seo-${page.id}-${field}-${lang}` });
      const prev = $('#seoDialog [data-seo-preview]');
      if (prev) prev.replaceWith(googlePreview(state.site.pages.find(p => p.id === page.id), lang));
    });
    el.addEventListener('change', () => { log.debug('seo.field', __('Champ « {field} » modifié ({lang})', { field, lang }), { pageId: page.id, field, lang, len: el.value.length, empty: !el.value || undefined }); render(); });
  };
  live(title, 'title');
  live(desc, 'description');
  live(kw, 'keyword');
  const noindex = h('input', { type: 'checkbox', 'data-seo': 'noindex', checked: !!seo.noindex });
  noindex.addEventListener('change', () => { log.debug('seo.field', noindex.checked ? __('noindex activé') : __('noindex retiré'), { pageId: page.id, field: 'noindex', value: noindex.checked }); if (apply(s => setSeoField(s, page.id, 'noindex', noindex.checked))) render(); });
  const img = imageControl(seo.image || '', v => { log.debug('seo.field', __('Image de partage modifiée'), { pageId: page.id, field: 'image', value: String(v || '').slice(0, 40) }); if (apply(s => setSeoField(s, page.id, 'image', v))) render(); }, 'seo-image', (siteWithAsset, ref) => { state.site = siteWithAsset; if (apply(s => setSeoField(s, page.id, 'image', ref))) render(); });
  const ai = (kind, label) => h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-ai-seo': kind, onclick: () => suggest(kind, page, lang) }, `✨ ${label}`);
  const chips = cur.keywords?.length ? h('div', { class: 'kw-chips' }, cur.keywords.map(k => h('button', { type: 'button', class: 'kw-chip', 'data-kw': k, onclick: () => { log.debug('seo.keyword-pick', __('Mot-clé choisi parmi les idées'), { pageId: page.id, lang, keyword: k }); if (apply(s => setSeoField(s, page.id, 'keyword', k, lang))) { cur.keywords = null; render(); } } }, k))) : null;
  const missingAlt = analysis.checks.filter(c => c.id === 'img-alt').length;
  const levels = ['bad', 'warn', 'tip', 'info', 'good'];
  const checks = [...analysis.checks].sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level));
  return h('section', { class: 'seo-detail', 'data-seo-page': page.id },
    h('div', { class: 'seo-head' }, h('h3', {}, translate(state.site, page.title, lang) || __('(sans titre)')), h('span', { class: `seo-score ${scoreClass(analysis.score)}`, 'data-seo-score': '' }, `${analysis.score}/100`)),
    h('div', { class: 'seo-previews' }, h('div', {}, h('span', { class: 'field__label' }, __('Aperçu dans Google')), googlePreview(page, lang)), h('div', {}, h('span', { class: 'field__label' }, __('Aperçu de partage')), sharePreview(page, lang))),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Titre pour Google ({lang})', { lang: lang.toUpperCase() })), h('div', { class: 'add-page' }, title, ai('title', __('Proposer'))), counter(title, seoLimits(lang).titleMax)),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Description ({lang})', { lang: lang.toUpperCase() })), desc, h('div', { class: 'row-btns' }, counter(desc, seoLimits(lang).descMax), ai('description', __('Proposer')))),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Mot-clé principal')), h('div', { class: 'add-page' }, kw, ai('keywords', __('Idées'))), chips),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Image de partage (réseaux sociaux, 1200 × 630 idéalement)')), img),
    h('label', { class: 'check' }, noindex, __('Ne pas montrer cette page dans Google (noindex)')),
    missingAlt ? h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-ai-alts': '', onclick: () => describeMissing(page, lang) }, __n(missingAlt, '✨ Décrire l’image sans texte alternatif', '✨ Décrire les {n} images sans texte alternatif'))) : null,
    h('ul', { class: 'seo-checks', 'data-seo-checks': '' }, checks.map(c => h('li', { class: `seo-check is-${c.level}`, 'data-check': c.id },
      h('span', { class: 'seo-check__icon', 'aria-hidden': 'true' }, ICON[c.level]),
      h('span', {}, c.message),
      c.nodeId ? h('button', { type: 'button', class: 'btn btn--small', 'data-seo-go': c.nodeId, onclick: () => { log.debug('seo.goto', __('Aller à l’élément signalé ({check})', { check: c.id }), { check: c.id, pageId: page.id, nodeId: c.nodeId }); $('#seoDialog')?.close(); if (state.pageId !== page.id) setView({ pageId: page.id }); setTimeout(() => select(c.nodeId, { scroll: true }), 250); } }, __('Aller à')) : null))));
}

let renderingSeo = false;
function render() {
  if (renderingSeo) { queueMicrotask(render); return; }
  renderingSeo = true;
  try { renderNow(); } finally { renderingSeo = false; }
}

function renderNow() {
  const d = $('#seoDialog');
  if (!d || !cur) return;
  const s = state.site;
  const lang = cur.lang;
  const r = analyzeSite(s, lang);
  if (!s.pages.some(p => p.id === cur.pageId)) cur.pageId = s.pages[0].id;
  const page = s.pages.find(p => p.id === cur.pageId);
  const analysis = r.pages.find(p => p.pageId === page.id);
  cur.last = { site: r.score, page: analysis.score, siteChecks: countLevels(r.checks), pageChecks: countLevels(analysis.checks) };
  log.debug('seo.analysis', __('Analyse : page {page}/100, site {site}/100', { page: analysis.score, site: r.score }), { pageId: page.id, lang, page: analysis.score, site: r.score, points: cur.last.pageChecks, sitePoints: cur.last.siteChecks, words: analysis.stats?.words, imagesNoAlt: analysis.stats?.imagesNoAlt });
  const langSel = h('select', { class: 'control control--sm', 'data-seo-lang': '', 'aria-label': __('Langue analysée') }, s.languages.map(l => h('option', { value: l, selected: l === lang }, `${l.toUpperCase()} · ${LANG_LABELS[l]}`)));
  langSel.addEventListener('change', () => { log.debug('seo.lang', __('Langue analysée : {lang}', { lang: langSel.value }), { from: cur.lang, to: langSel.value }); cur.lang = langSel.value; cur.keywords = null; render(); });
  const missingDesc = s.pages.filter(p => needsDesc(s, p, lang)).length;
  const scroll = d.querySelector('.seo-detail')?.scrollTop || 0;
  d.querySelector('[data-seo-body]').replaceChildren(
    h('aside', { class: 'seo-aside' },
      h('div', { class: 'seo-site' }, h('span', { class: `seo-score seo-score--big ${scoreClass(r.score)}`, 'data-seo-site-score': '' }, `${r.score}`), h('div', {}, h('strong', {}, __('Note du site')), h('small', { class: 'hint' }, __('moyenne des pages en {lang}', { lang: lang.toUpperCase() }))), langSel),
      r.checks.length ? h('ul', { class: 'seo-checks seo-checks--site' }, r.checks.map(c => h('li', { class: `seo-check is-${c.level}`, 'data-check': c.id }, h('span', { class: 'seo-check__icon' }, ICON[c.level]), h('span', {}, c.message)))) : null,
      missingDesc ? h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-ai-seo-all': '', onclick: () => completeAll(lang) }, __n(missingDesc, '✨ Compléter la description manquante', '✨ Compléter les {n} descriptions manquantes')) : null,
      h('ul', { class: 'seo-pages' }, r.pages.map(pr => {
        const p = s.pages.find(x => x.id === pr.pageId);
        return h('li', {}, h('button', { type: 'button', class: `item-row${p.id === page.id ? ' is-current' : ''}`, 'data-seo-pick': p.id, onclick: () => { log.debug('seo.page', __('Page choisie : {page} ({score}/100)', { page: p.slug ? `/${p.slug}/` : __('accueil'), score: pr.score }), { pageId: p.id, score: pr.score, lang }); cur.pageId = p.id; cur.keywords = null; render(); } },
          h('span', { class: 'item-row__title' }, translate(s, p.title, lang) || __('(sans titre)')),
          h('span', { class: 'item-row__meta' }, p.slug ? `/${p.slug}/` : __('accueil')),
          h('span', { class: `seo-score ${scoreClass(pr.score)}` }, String(pr.score))));
      }))),
    pageDetail(page, lang, analysis));
  const det = d.querySelector('.seo-detail');
  if (det) det.scrollTop = scroll;
}

export function openSeo(pageId = state.pageId) {
  $('#seoDialog')?.remove();
  cur = { pageId, lang: state.lang, keywords: null };
  const d = h('dialog', { class: 'audit col-dialog seo-dialog', id: 'seoDialog', 'aria-labelledby': 'seoTitle' },
    h('header', { class: 'audit__head' }, h('h2', { id: 'seoTitle' }, __('🔎 Référencement')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
    h('div', { class: 'col-body seo-body', 'data-seo-body': '' }),
    h('footer', { class: 'audit__foot' }, h('span', { class: 'hint' }, __('Les propositions ✨ sont faites par l’IA locale de Chrome et marquées « à relire ».')), h('button', { type: 'button', class: 'btn btn--primary', onclick: () => d.close() }, __('Fermer'))));
  const unsub = subscribe((reason, opts) => {
    if (reason !== 'doc' || opts.source === 'seo') return;
    const typing = d.contains(document.activeElement) && document.activeElement.matches('input,textarea');
    if (!typing) render();
  });
  d.addEventListener('close', () => { unsub(); d.remove(); cur = null; });
  document.body.append(d);
  render();
  d.showModal();
  log.info('seo.open', __('Fenêtre Référencement : note du site {score}/100', { score: cur.last?.site ?? '?' }), { lang: cur.lang, pageId: cur.pageId, pages: state.site.pages.length, site: cur.last?.site, page: cur.last?.page, sitePoints: cur.last?.siteChecks, pagePoints: cur.last?.pageChecks, missingDesc: state.site.pages.filter(p => needsDesc(state.site, p, cur.lang)).length, baseUrl: !!state.site.baseUrl });
}
