/*
 * Rendu : arbre → HTML, styles → CSS, site → fichiers. Fonctions pures, sans DOM.
 * Mode « canvas » : CSS en ligne, attributs data-node pour l'éditeur, images en data URL.
 */
import { REGISTRY, STRUCTURE } from './widgets.js';
import { siteText } from './widgets-extra.js';
import { escapeHtml, escapeAttr, safeUrl } from './escape.js';
import { sanitizeRich, sanitizeInline, richToText } from './sanitize.js';
import { compileNodeCss } from './style.js';
import { walk } from './tree.js';
import { buildBaseCss, googleFontsHref, FONTS } from './theme.js';
import { effectivePreset } from './presets.js';
import { renderMenu } from './menu.js';
import { LANG_LABELS } from './site.js';
import { __ } from './ui-i18n.js';
import { itemDir, collectionDir, hasDetail, bindProps, itemTitle, itemJsonLd, buildIcs, buildRss, displayValue, localToday, findItem, pick, listPageId } from './collections.js';

export function pageDir(site, page, lang) {
  if (page.collection) return itemDir(site, page.collection, page.item, lang);
  const segs = [];
  if (lang !== site.defaultLanguage) segs.push(lang);
  const slug = lang === site.defaultLanguage ? page.slug : (page.slugs?.[lang] || page.slug);
  if (slug) segs.push(slug);
  return segs;
}

export function pagePath(site, page, lang) {
  const segs = pageDir(site, page, lang);
  return segs.length ? `${segs.join('/')}/index.html` : 'index.html';
}

export function relative(from, to) {
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  const r = '../'.repeat(from.length - i) + (to.slice(i).length ? to.slice(i).join('/') + '/' : '');
  return r || './';
}

function absolute(site, segs) {
  const base = String(site.baseUrl || '').replace(/\/+$/, '');
  return base ? `${base}/${segs.length ? segs.join('/') + '/' : ''}` : null;
}

export function translate(site, value, lang) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  const filled = v => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim() !== '';
  if (filled(value[lang])) return value[lang];
  return typeof value[site.defaultLanguage] === 'string' ? value[site.defaultLanguage] : '';
}

function assetUrl(site, value, { canvas, toRoot }) {
  const v = String(value || '');
  if (v.startsWith('asset:')) {
    const a = site.assets?.[v.slice(6)];
    if (!a) return '';
    return canvas ? a.dataUrl : `${toRoot}assets/${a.file}`;
  }
  const u = safeUrl(v);
  return /^https:\/\//i.test(u) ? u : '';
}

/* Lien interne « page:ID » ou « page:ID#ancre » → chemin relatif dans la langue courante */
export function resolveLink(site, value, lang, from, canvas = false) {
  const v = String(value ?? '').trim();
  if (/^popup:/i.test(v)) return '#';
  const it = v.match(/^item:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)(\/event\.ics)?$/);
  if (it) {
    const col = site.collections?.[it[1]];
    const item = col && findItem(col, it[2]);
    if (!item || item.status !== 'published' || !hasDetail(col) || canvas) return '#';
    const rel = relative(from || [], itemDir(site, col, item, lang));
    return it[3] ? `${rel === './' ? '' : rel}event.ics` : rel;
  }
  const m = v.match(/^page:([A-Za-z0-9_-]+)(#[A-Za-z0-9_-]*)?$/);
  if (!m) return safeUrl(v);
  const target = site.pages.find(p => p.id === m[1]);
  if (!target || canvas) return '#';
  return relative(from || [], pageDir(site, target, lang)) + (m[2] || '');
}

function langLinks(site, page, lang, from, style) {
  if (site.languages.length < 2 || !page) return '';
  return `<ul class="langs">${site.languages.map(l => `<li><a lang="${l}" hreflang="${l}"${l === lang ? ' aria-current="true"' : ''} title="${escapeAttr(LANG_LABELS[l])}" href="${relative(from, pageDir(site, page, l))}">${style === 'names' ? escapeHtml(LANG_LABELS[l]) : l.toUpperCase()}</a></li>`).join('')}</ul>`;
}

/* sizes d'une image d'après la largeur occupée (fractions de largeur par appareil) */
export function sizesFor(box) {
  const pct = f => `${Math.round(f * 100)}vw`;
  const desk = box.w ? `${Math.round(box.w * box.d)}px` : pct(box.d);
  return `(max-width: 640px) ${pct(box.m)}, (max-width: 1024px) ${pct(box.t)}, ${desk}`;
}

function imgTag(site, ctx, value, { alt = '', style = '', cls = '' } = {}) {
  const src = assetUrl(site, value, { canvas: ctx.canvas, toRoot: ctx.toRoot });
  if (!src) return '';
  const v = String(value || '');
  const a = v.startsWith('asset:') ? site.assets?.[v.slice(6)] : null;
  let extra = '';
  if (a && !ctx.canvas && a.variants?.length && a.width) {
    const set = [...a.variants.map(x => `${ctx.toRoot}assets/${x.file} ${x.w}w`), `${src} ${a.width}w`].join(', ');
    extra += ` srcset="${escapeAttr(set)}" sizes="${escapeAttr(sizesFor(ctx.box || { w: site.theme?.contentWidth || 1160, d: 1, t: 1, m: 1 }))}"`;
  }
  if (a?.width && a?.height) extra += ` width="${a.width}" height="${a.height}"`;
  if (!ctx.canvas && ctx.lcp && !ctx.lcp.done && !ctx.locked) { ctx.lcp.done = true; extra += ' loading="eager" fetchpriority="high"'; }
  else extra += ' loading="lazy" decoding="async"';
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${cls ? ` class="${cls}"` : ''}${extra}${style}>`;
}

export function makeContext(site, lang, { canvas = false, toRoot = '', from = [], page = null, popups = null, lcp = null, item = null, today = null } = {}) {
  const home = site.pages?.find(p => p.slug === '') || site.pages?.[0];
  return {
    canvas, lang, site, page, from, toRoot, item, today: today || localToday(),
    renderTree(node, extra = {}) { return renderNode(node, { ...this, ...extra }); },
    lcp: lcp || { done: false },
    imgTag(value, opts) { return imgTag(site, this, value, opts); },
    popups: popups || new Set(),
    homeHref: home ? relative(from, pageDir(site, home, lang)) : './',
    menu: id => (page ? renderMenu(site, page, lang, from, { id }) : ''),
    langLinks: style => langLinks(site, page, lang, from, style),
    popup(v) {
      const m = String(v ?? '').trim().match(/^popup:([A-Za-z0-9_-]+)$/);
      if (!m || !site.components?.[m[1]]) return null;
      this.popups.add(m[1]);
      return m[1];
    },
    t: v => translate(site, v, lang),
    esc: escapeHtml,
    attr: escapeAttr,
    url: v => resolveLink(site, v, lang, from, canvas),
    rich: v => sanitizeRich(v),
    inline: v => sanitizeInline(v),
    text: v => richToText(v),
    img: v => assetUrl(site, v, { canvas, toRoot })
  };
}

function classes(node, base, ctx) {
  const inst = ctx?.instance;
  const extra = [node.advanced?.cssClass, inst?.advanced?.cssClass].filter(Boolean).map(c => ` ${escapeAttr(c)}`).join('');
  const pid = ctx?.site ? effectivePreset(ctx.site, node) : null;
  const ipid = inst && ctx?.site ? effectivePreset(ctx.site, inst) : null;
  const langHidden = ctx?.canvas && (node.advanced?.hideLangs?.[ctx.lang] || inst?.advanced?.hideLangs?.[ctx.lang]) ? ' is-lang-hidden' : '';
  return `${base} n-${node.id}${pid ? ` p-${pid}` : ''}${inst ? ` n-${inst.id} is-instance${ipid ? ` p-${ipid}` : ''}` : ''}${extra}${langHidden}`;
}

function attrs(node, ctx) {
  let a = '';
  const inst = ctx.instance;
  const anchor = inst?.advanced?.anchor || node.advanced?.anchor;
  if (anchor) a += ` id="${escapeAttr(anchor)}"`;
  const label = translate(ctx.site, (inst?.advanced?.ariaLabel && Object.keys(inst.advanced.ariaLabel).length ? inst : node).advanced?.ariaLabel, ctx.lang);
  if (label) a += ` aria-label="${escapeAttr(label)}"`;
  if (ctx.canvas && inst) a += ` data-node="${escapeAttr(inst.id)}" data-type="${escapeAttr(inst.type)}" data-ref="${escapeAttr(inst.ref)}"`;
  else if (ctx.canvas && !ctx.locked) a += ` data-node="${escapeAttr(node.id)}" data-type="${escapeAttr(node.type)}"`;
  return a;
}

const MAX_DEPTH = 6;

export function renderNode(node, ctx) {
  if (node.ref) {
    if (node.advanced?.hideLangs?.[ctx.lang] && !ctx.canvas) return '';
    const comp = ctx.site?.components?.[node.ref];
    const chain = ctx.chain || [];
    if (!comp || chain.includes(node.ref) || chain.length >= MAX_DEPTH) {
      const missing = __('Composant introuvable');
      return ctx.canvas && !ctx.locked ? `<div class="ph" data-node="${escapeAttr(node.id)}" data-type="${escapeAttr(node.type)}" data-ph="component">${escapeHtml(missing)}</div>` : '';
    }
    return renderNode(comp.node, { ...ctx, instance: ctx.locked ? null : node, locked: true, chain: [...chain, node.ref] });
  }
  const def = REGISTRY[node.type];
  if (!def) return '';
  if (node.advanced?.hideLangs?.[ctx.lang] && !ctx.canvas) return '';
  const childCtx = ctx.instance ? { ...ctx, instance: null } : ctx;
  const kids = () => (node.children || []).map(c => renderNode(c, childCtx)).join('');
  switch (node.type) {
    case 'page': return kids();
    case 'section': {
      const cw = Number(ctx.site?.theme?.contentWidth) || 1160;
      const secCtx = { ...childCtx, box: { w: node.props?.width === 'full' ? null : node.props?.width === 'wide' ? 1440 : cw, d: 1, t: 1, m: 1 } };
      const kidsS = () => (node.children || []).map(c => renderNode(c, secCtx)).join('');
      const tag = ['section', 'div', 'aside', 'article', 'nav', 'header', 'footer'].includes(node.props?.tag) ? node.props.tag : 'section';
      const width = node.props?.width === 'full' ? ' sec__inner--full' : node.props?.width === 'wide' ? ' sec__inner--wide' : '';
      const emptySec = __('Section vide : ajoutez une rangée');
      const inner = kidsS() || (ctx.canvas && !ctx.locked ? `<div class="ph ph--section" data-ph="section">${escapeHtml(emptySec)}</div>` : '');
      return `<${tag} class="${classes(node, 'sec', ctx)}"${attrs(node, ctx)}><div class="sec__inner${width}">${inner}</div></${tag}>`;
    }
    case 'row': {
      const stack = ['mobile', 'tablet', 'never'].includes(node.props?.stack) ? node.props.stack : 'mobile';
      const rowCtx = { ...childCtx, stack };
      return `<div class="${classes(node, `row row--stack-${stack}`, ctx)}"${attrs(node, ctx)}>${(node.children || []).map(c => renderNode(c, rowCtx)).join('')}</div>`;
    }
    case 'column': {
      const flags = (node.style?.tablet?.span ? ' col--ts' : '') + (node.style?.mobile?.span ? ' col--ms' : '');
      const box = ctx.box || { w: Number(ctx.site?.theme?.contentWidth) || 1160, d: 1, t: 1, m: 1 };
      const sd = Number(node.style?.desktop?.span) || 12;
      let st = Number(node.style?.tablet?.span) || sd;
      let sm = Number(node.style?.mobile?.span) || st;
      if (ctx.stack === 'tablet' && !node.style?.tablet?.span) st = 12;
      if ((ctx.stack === 'tablet' || ctx.stack === 'mobile') && !node.style?.mobile?.span) sm = 12;
      const colCtx = { ...childCtx, box: { w: box.w, d: box.d * sd / 12, t: box.t * st / 12, m: box.m * sm / 12 } };
      const dropHere = __('Déposez un widget ici');
      const inner = (node.children || []).map(c => renderNode(c, colCtx)).join('') || (ctx.canvas && !ctx.locked ? `<div class="ph" data-ph="column">${escapeHtml(dropHere)}</div>` : '');
      return `<div class="${classes(node, 'col' + flags, ctx)}"${attrs(node, ctx)}>${inner}</div>`;
    }
    default: {
      let props = node.props || {};
      let emptyBind = false;
      if (node.bind && ctx.item) {
        props = bindProps(ctx.site, node, ctx.item.item, ctx.item.col, ctx.lang);
        emptyBind = props.__empty;
        if (emptyBind && (!ctx.canvas || ctx.locked)) return '';
      }
      const inner = def.render(props, childCtx, node);
      if (!inner && !ctx.canvas) return '';
      const bound = ctx.canvas && !ctx.locked && node.bind && Object.keys(node.bind).length ? ` data-bound="${escapeAttr(Object.keys(node.bind).join(' '))}"` : '';
      return `<div class="${classes(node, `w w-${node.type}`, ctx)}${emptyBind ? ' is-bind-empty' : ''}"${attrs(node, ctx)}${bound}>${inner}</div>`;
    }
  }
}

/*
 * Pages en japonais : polices japonaises de repli insérées avant la famille générique de chaque pile du
 * thème (la police choisie reste la première ; ses caractères latins sont gardés), interlignage un peu
 * plus grand, pas d'approche serrée des titres, coupures de ligne strictes (kinsoku).
 */
const JA_SANS = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", YuGothic, Meiryo';
const JA_SERIF = '"Hiragino Mincho ProN", "Noto Serif JP", "Yu Mincho", YuMincho, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", Meiryo';
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|math|emoji|fangsong)$/i;
export function jaFontStack(stack) {
  const parts = String(stack || 'system-ui, sans-serif').split(',').map(x => x.trim()).filter(Boolean);
  let tail = [];
  while (parts.length && GENERIC.test(parts[parts.length - 1]) && !/^system-ui$/i.test(parts[parts.length - 1])) tail.unshift(parts.pop());
  if (!tail.length) tail = ['sans-serif'];
  const serif = tail.some(t => /serif$/i.test(t) && !/sans/i.test(t));
  return [...parts, serif ? JA_SERIF : JA_SANS, ...tail].join(', ');
}
export function jaCss(theme) {
  const fh = (FONTS[theme?.fonts?.heading] || FONTS.system).stack;
  const fb = (FONTS[theme?.fonts?.body] || FONTS.system).stack;
  return `:root:lang(ja){--font-h:${jaFontStack(fh)};--font-b:${jaFontStack(fb)}}
:lang(ja) body{line-height:1.8;line-break:strict;overflow-wrap:anywhere}
:lang(ja) h1,:lang(ja) h2,:lang(ja) h3,:lang(ja) h4{letter-spacing:0;line-height:1.35}`;
}

export function buildCss(site, pages, { canvas = false } = {}) {
  const parts = [buildBaseCss(site.theme, site.tokens)];
  if (site.languages?.includes('ja')) parts.push(jaCss(site.theme));
  for (const type of Object.keys(REGISTRY)) if (REGISTRY[type].css) parts.push(REGISTRY[type].css);
  const ctx = {
    canvas,
    asset: v => assetUrl(site, v, { canvas, toRoot: '' }),
    target: type => REGISTRY[type]?.styleTarget || ''
  };
  for (const p of Object.values(site.presets || {})) {
    const css = compileNodeCss({ id: p.id, type: p.type, style: p.style }, ctx, { selector: `.p-${p.id}` });
    if (css) parts.push(css);
  }
  const roots = [...pages.map(p => p.root), ...Object.values(site.components || {}).map(c => c.node), site.layout?.header, site.layout?.footer, ...Object.values(site.collections || {}).flatMap(c => [c.card, c.detail])].filter(Boolean);
  for (const r of roots) walk(r, n => {
    const css = compileNodeCss(n, ctx);
    if (css) parts.push(css);
    return true;
  });
  return parts.join('\n');
}

function describe(site, page, lang) {
  const seo = translate(site, page.seo?.description, lang);
  if (seo) return seo;
  let found = '';
  walk(page.root, n => {
    if (n.advanced?.hideLangs?.[lang]) return false;
    if (n.type === 'text') { found = richToText(translate(site, n.props.content, lang)); return !found; }
    return true;
  });
  return [...found].slice(0, lang === 'ja' ? 120 : 160).join('');
}

/* Racines rendues sur une page : contenu, en-tête et pied en blocs, composants utilisés (récursivement) */
function pageRoots(site, page) {
  const roots = [page.root, site.layout?.header, site.layout?.footer].filter(Boolean);
  const seen = new Set();
  for (let i = 0; i < roots.length; i++) walk(roots[i], n => {
    if (n.type === 'collection-list') { const c = site.collections?.[n.props?.collection]; if (c && !seen.has(`col:${c.id}`)) { seen.add(`col:${c.id}`); roots.push(c.card); } }
    const refs = [n.ref, String(n.props?.link || '').match(/^popup:([A-Za-z0-9_-]+)$/)?.[1]].filter(Boolean);
    for (const r of refs) if (!seen.has(r) && site.components?.[r]) { seen.add(r); roots.push(site.components[r].node); }
    return true;
  });
  return roots;
}

export function hasBurger(site, page) {
  if (!site.layout?.header && site.header?.burger !== false) return true;
  let found = false;
  for (const r of pageRoots(site, page)) walk(r, n => { if (n.type === 'nav-menu' && n.props?.burger && n.props?.layout !== 'vertical') found = true; return !found; });
  return found;
}

function pageUsesScript(site, page) {
  if (hasBurger(site, page)) return true;
  let uses = false;
  for (const r of pageRoots(site, page)) walk(r, n => { if (REGISTRY[n.type]?.script) { uses = true; return false; } return true; });
  return uses;
}

/* Journal du site publié : muet, sauf avec ?atelier-debug (gardé ensuite dans localStorage ; ?atelier-debug=0 pour l'arrêter) */
const LOG_SCRIPT = `(function(){var D=false,q=location.search;try{if(/[?&]atelier-debug=0/.test(q))localStorage.removeItem('atelier-debug');else if(/[?&]atelier-debug/.test(q))localStorage.setItem('atelier-debug','1');D=localStorage.getItem('atelier-debug')==='1';}catch(e){D=/[?&]atelier-debug/.test(q)&&!/atelier-debug=0/.test(q);}window.__aLog=function(c,m,d){if(!D||!window.console)return;var t='';try{t=d?' '+JSON.stringify(d):'';}catch(e){}(c.indexOf('fail')>-1?console.warn:console.info).call(console,'[Atelier site] '+c+' '+m+t);};window.__aLog('site.boot','Page chargée',{page:location.pathname,lang:document.documentElement.lang,forms:document.querySelectorAll('form[data-endpoint]').length,lists:document.querySelectorAll('.cl[data-when]').length});window.addEventListener('error',function(e){window.__aLog('site.fail','Erreur JavaScript : '+e.message,{file:e.filename,line:e.lineno});});})();`;

const BASE_SCRIPT = `(function(){document.documentElement.classList.add('js');document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.nav-burger');if(!b)return;var nav=b.closest('.site-nav');var open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));if(nav)nav.classList.toggle('is-open',open);if(window.__aLog)window.__aLog('site.nav','Menu mobile '+(open?'ouvert':'fermé'));});document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;document.querySelectorAll('.nav-burger[aria-expanded="true"]').forEach(function(b){b.setAttribute('aria-expanded','false');var n=b.closest('.site-nav');if(n)n.classList.remove('is-open');b.focus();});});})();`;

export function siteScript() {
  return [LOG_SCRIPT, BASE_SCRIPT, ...Object.values(REGISTRY).filter(d => d.script).map(d => d.script)].filter((v, i, a) => a.indexOf(v) === i).join('\n');
}

/* Élément d'aperçu pour modifier une carte ou une page de détail */
export function previewItem(site, col, itemId) {
  const found = (itemId && findItem(col, itemId)) || col.items.find(i => i.status === 'published') || col.items[0];
  if (found) return found;
  const values = {};
  for (const f of col.fields) {
    if (f.type === 'text') values[f.key] = f.i18n ? { [site.defaultLanguage]: f.label } : f.label;
    if (f.type === 'richtext') { const sample = __('{field} de l’élément.', { field: f.label }); values[f.key] = { [site.defaultLanguage]: `<p>${escapeHtml(sample)}</p>` }; }
    if (f.type === 'date') values[f.key] = localToday();
  }
  return { id: 'apercu', slug: 'apercu', status: 'draft', values };
}

function absoluteAsset(site, value) {
  const v = String(value || '');
  if (/^https:\/\//i.test(v)) return v;
  const a = v.startsWith('asset:') ? site.assets?.[v.slice(6)] : null;
  const base = String(site.baseUrl || '').replace(/\/+$/, '');
  return a && base ? `${base}/assets/${a.file}` : '';
}

/* Titre de la page pour Google et l'onglet : réglé dans le référencement, sinon « Titre – Nom du site » */
export function docTitleOf(site, page, lang) {
  const custom = translate(site, page.seo?.title, lang);
  if (custom) return custom;
  return page.slug === '' ? site.name : `${translate(site, page.title, lang)} – ${site.name}`;
}

function firstImage(site, page, lang) {
  let src = '';
  walk(page.root, n => {
    if (src || n.ref || n.advanced?.hideLangs?.[lang]) return false;
    if (n.type === 'image' && n.props?.src) src = n.props.src;
    else if (n.type === 'card' && n.props?.image) src = n.props.image;
    return !src;
  });
  return src;
}

function sameAsLinks(site) {
  const out = [];
  const roots = [...site.pages.map(p => p.root), site.layout?.header, site.layout?.footer].filter(Boolean);
  for (const r of roots) walk(r, n => {
    if (n.type === 'social') for (const it of n.props?.items || []) if (/^https:\/\/[^\s\x22\x27<>]+$/i.test(it.url || '') && !/^https:\/\/(www\.)?(facebook|instagram|mastodon\.social|x|twitter|linkedin|youtube|tiktok)\.com\/?$/i.test(it.url) && !out.includes(it.url)) out.push(it.url);
    return true;
  });
  return out;
}

const rssCollections = site => (site.baseUrl ? Object.values(site.collections || {}).filter(c => c.settings?.rss && c.dateField) : []);

export function renderPage(site, page, lang, { canvas = false, edit = null, today = null } = {}) {
  const from = pageDir(site, page, lang);
  const toRoot = '../'.repeat(from.length);
  const popups = new Set();
  const editCol = canvas && (edit?.kind === 'card' || edit?.kind === 'detail') ? site.collections?.[edit.id] : null;
  const pageItem = page.collection ? { col: page.collection, item: page.item } : null;
  const ctx = makeContext(site, lang, { canvas, toRoot, from, page, popups, item: pageItem, today });
  const lockedCtx = { ...ctx, locked: true };
  const zoneCtx = zone => (canvas && edit?.kind === zone ? ctx : lockedCtx);
  const home = site.pages.find(p => p.slug === '') || site.pages[0];
  const title = translate(site, page.title, lang);
  const docTitle = docTitleOf(site, page, lang);
  const desc = describe(site, page, lang);
  const canonical = absolute(site, from);
  const alternates = site.languages.map(l => ({ lang: l, segs: pageDir(site, page, l) }));
  const fonts = googleFontsHref(site.theme);
  const itemImage = page.collection && page.collection.imageField ? absoluteAsset(site, page.item.values[page.collection.imageField]) : '';
  const ogImage = absoluteAsset(site, page.seo?.image) || itemImage || absoluteAsset(site, firstImage(site, page, lang));
  const root0 = absolute(site, []);
  const isHome = page.slug === '' && !page.collection;
  const ld = [];
  if (isHome) {
    const logo = absoluteAsset(site, site.header?.logo);
    const same = sameAsLinks(site);
    ld.push({ '@context': 'https://schema.org', '@type': 'Organization', name: site.name, ...(root0 ? { url: root0 } : {}), ...(logo ? { logo } : {}), ...(same.length ? { sameAs: same } : {}) });
    ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, inLanguage: lang, ...(canonical ? { url: canonical } : {}) });
  } else if (canonical) {
    const crumbs = [{ name: site.name, item: absolute(site, pageDir(site, home, lang)) }];
    if (page.collection) {
      const lp = site.pages.find(p => p.id === listPageId(site, page.collection));
      if (lp && lp.slug !== '') crumbs.push({ name: translate(site, lp.title, lang), item: absolute(site, pageDir(site, lp, lang)) });
    }
    crumbs.push({ name: title, item: canonical });
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) });
  }
  const ogType = page.collection?.kind === 'news' ? 'article' : 'website';
  const itemLd = page.collection ? itemJsonLd(site, page.collection, page.item, lang, { url: canonical, image: ogImage }) : null;
  const feeds = rssCollections(site).map(c => `<link rel="alternate" type="application/rss+xml" title="${escapeAttr(`${site.name} – ${c.name}`)}" href="${toRoot}${collectionDir(site, c, lang).join('/')}/feed.xml">`);

  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(docTitle)}</title>`,
    desc ? `<meta name="description" content="${escapeAttr(desc)}">` : '',
    canonical ? `<link rel="canonical" href="${escapeAttr(canonical)}">` : '',
    ...(canonical ? alternates.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${escapeAttr(absolute(site, a.segs))}">`) : []),
    canonical ? `<link rel="alternate" hreflang="x-default" href="${escapeAttr(absolute(site, pageDir(site, page, site.defaultLanguage)))}">` : '',
    page.seo?.noindex ? '<meta name="robots" content="noindex">' : '',
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:title" content="${escapeAttr(docTitle)}">`,
    canonical ? `<meta property="og:url" content="${escapeAttr(canonical)}">` : '',
    `<meta property="og:site_name" content="${escapeAttr(site.name)}">`,
    desc ? `<meta property="og:description" content="${escapeAttr(desc)}">` : '',
    ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
    ...feeds,
    `<meta property="og:locale" content="${lang}">`,
    fonts ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapeAttr(fonts)}">` : '',
    canvas ? `<style id="atelier-css">${buildCss(site, [page], { canvas: true })}</style>` : `<link rel="stylesheet" href="${toRoot}styles.css">`,
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebPage', name: docTitle, inLanguage: lang,
      ...(canonical ? { url: canonical } : {}),
      isPartOf: { '@type': 'WebSite', name: site.name, ...(absolute(site, []) ? { url: absolute(site, []) } : {}) }
    }).replace(/</g, '\\u003c')}</script>`,
    itemLd ? `<script type="application/ld+json">${JSON.stringify(itemLd).replace(/</g, '\\u003c')}</script>` : '',
    ...ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`)
  ].filter(Boolean).join('\n');

  const sticky = site.header?.sticky !== false ? ' site-header--sticky' : '';
  const zoneRoot = zone => (canvas && edit?.kind === zone ? edit.root.children?.[0] : site.layout?.[zone]);
  let headerHtml;
  if (zoneRoot('header')) {
    headerHtml = `<header class="site-header site-header--custom${sticky}" data-zone="header">${renderNode(zoneRoot('header'), zoneCtx('header'))}</header>`;
  } else {
    const menuHtml = renderMenu(site, page, lang, from, { id: 'menu' });
    const langs = site.header?.showLangs !== false ? langLinks(site, page, lang, from, 'codes') : '';
    const logo = assetUrl(site, site.header?.logo, { canvas, toRoot });
    const brand = `${logo ? `<img src="${escapeAttr(logo)}" alt="">` : ''}<span>${escapeHtml(site.name)}</span>`;
    const burger = site.header?.burger !== false ? `<button type="button" class="nav-burger" aria-expanded="false" aria-controls="menu"><span aria-hidden="true">☰</span> ${escapeHtml(siteText('menu', lang))}</button>` : '';
    headerHtml = `<header class="site-header${sticky}" data-zone="header"><div class="site-header__inner">
<a class="brand" href="${ctx.homeHref}">${brand}</a>
<nav class="site-nav" aria-label="${escapeAttr(siteText('menu', lang))}">${burger}${menuHtml}</nav>
${langs}
</div></header>`;
  }
  const mainLocked = canvas && (edit?.kind === 'header' || edit?.kind === 'footer');
  const mainRoot = canvas && ['component', 'card', 'detail'].includes(edit?.kind) ? edit.root : page.root;
  const mainCtx = mainLocked ? lockedCtx : ctx;
  let mainHtml;
  if (editCol && edit.kind === 'card') {
    const it0 = previewItem(site, editCol, edit.item);
    const others = editCol.items.filter(i => i.id !== it0.id && i.status === 'published').slice(0, 2);
    const cardCtx = { ...ctx, item: { col: editCol, item: it0 }, chain: [`col:${editCol.id}`] };
    mainHtml = `<section class="sec"><div class="sec__inner"><ul class="cl cl--grid" style="--cols:3;--cols-t:2"><li class="cl__item">${renderNode(edit.root, cardCtx)}</li>${others.map(it => `<li class="cl__item is-preview">${renderNode(editCol.card, { ...lockedCtx, item: { col: editCol, item: it }, chain: [`col:${editCol.id}`] })}</li>`).join('')}</ul></div></section>`;
  } else if (editCol && edit.kind === 'detail') {
    mainHtml = renderNode(mainRoot, { ...ctx, item: { col: editCol, item: previewItem(site, editCol, edit.item) } });
  } else mainHtml = renderNode(mainRoot, mainCtx);
  const fl = site.pages.filter(p => p.footerLink);
  const footerLinks = fl.length ? `<nav class="footer-links" aria-label="${escapeAttr(siteText('info', lang))}">${fl.map(p => `<a href="${relative(from, pageDir(site, p, lang))}"${p.id === page.id ? ' aria-current="page"' : ''}>${escapeHtml(translate(site, p.title, lang))}</a>`).join('')}</nav>` : '';
  const footerHtml = zoneRoot('footer')
    ? `<footer class="site-footer site-footer--custom" data-zone="footer">${renderNode(zoneRoot('footer'), zoneCtx('footer'))}${footerLinks}</footer>`
    : `<footer class="site-footer" data-zone="footer"><div class="site-footer__inner"><p>${sanitizeInline(translate(site, site.footer?.text, lang))}</p>${footerLinks}</div></footer>`;
  const popupHtml = [];
  const done = new Set();
  for (let guard = 0; guard < 20 && [...popups].some(id => !done.has(id)); guard++) {
    for (const id of [...popups]) {
      if (done.has(id)) continue;
      done.add(id);
      const comp = site.components[id];
      popupHtml.push(`<div popover id="pop-${escapeAttr(id)}" class="popup" role="dialog" aria-label="${escapeAttr(comp.name)}"><button type="button" class="popup__close" popovertarget="pop-${escapeAttr(id)}" popovertargetaction="hide" aria-label="${escapeAttr(siteText('close', lang))}">×</button>${renderNode(comp.node, { ...lockedCtx, chain: [id] })}</div>`);
    }
  }
  const script = !canvas && pageUsesScript(site, page) ? `<script src="${toRoot}site.js" defer></script>` : '';
  const emptyPage = __('Page vide : glissez une section ou un modèle depuis le panneau de gauche');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
${head}
</head>
<body>
<a class="skip" href="#contenu">${escapeHtml(siteText('skip', lang))}</a>
${headerHtml}
<main id="contenu"${mainLocked ? ' class="is-locked"' : ''}>
${mainHtml}${canvas && !(mainRoot.children || []).length ? `<div class="ph ph--page" data-ph="page">${escapeHtml(emptyPage)}</div>` : ''}
</main>
${footerHtml}
${popupHtml.join('\n')}
${script}
</body>
</html>
`;
}

function decodeDataUrl(dataUrl) {
  const i = dataUrl.indexOf(',');
  const bin = atob(dataUrl.slice(i + 1));
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
}

/* Page virtuelle d'un élément de collection (rendue avec la page de détail de la collection) */
export function itemPage(site, col, item) {
  const tf = col.fields.find(f => f.key === col.titleField);
  const title = tf?.i18n ? { ...(item.values[col.titleField] || {}) } : { [site.defaultLanguage]: String(item.values[col.titleField] || '') };
  const description = {};
  if (col.excerptField) for (const l of site.languages) description[l] = displayValue(site, col, item, col.excerptField, l).slice(0, 300);
  return { id: `item:${col.id}:${item.id}`, slug: item.slug, title, seo: { description }, root: col.detail, collection: col, item };
}

export function renderSite(site, { today = null, now = new Date() } = {}) {
  const files = new Map();
  const day = today || localToday(now);
  for (const page of site.pages) for (const lang of site.languages) files.set(pagePath(site, page, lang), renderPage(site, page, lang, { today: day }));
  const itemPages = [];
  const root = absolute(site, []);
  const host = root ? root.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '';
  for (const col of Object.values(site.collections || {})) {
    const published = col.items.filter(i => i.status === 'published');
    if (hasDetail(col)) for (const item of published) {
      const ip = itemPage(site, col, item);
      itemPages.push(ip);
      for (const lang of site.languages) files.set(pagePath(site, ip, lang), renderPage(site, ip, lang, { today: day }));
    }
    for (const lang of site.languages) {
      const dir = collectionDir(site, col, lang).join('/');
      if (col.kind === 'events' && col.dateField) {
        const urlOf = it => (root && hasDetail(col) ? absolute(site, itemDir(site, col, it, lang)) : '');
        files.set(`${dir}/calendar.ics`, buildIcs(site, col, published, lang, { now, host, urlOf }));
        if (hasDetail(col)) for (const it of published) if (it.values[col.dateField]) files.set(`${itemDir(site, col, it, lang).join('/')}/event.ics`, buildIcs(site, col, [it], lang, { now, host, urlOf }));
      }
      if (root && col.settings?.rss && col.dateField) files.set(`${dir}/feed.xml`, buildRss(site, col, lang, { now, absolute: segs => absolute(site, segs), today: day }));
    }
  }
  files.set('styles.css', buildCss(site, site.pages));
  if ([...site.pages, ...itemPages].some(p => pageUsesScript(site, p))) files.set('site.js', siteScript());
  const used = JSON.stringify({ pages: site.pages, header: site.header, components: site.components, layout: site.layout, collections: site.collections });
  for (const [id, a] of Object.entries(site.assets || {})) {
    if (!used.includes(`asset:${id}`)) continue;
    files.set(`assets/${a.file}`, decodeDataUrl(a.dataUrl));
    for (const v of a.variants || []) if (v.dataUrl) files.set(`assets/${v.file}`, decodeDataUrl(v.dataUrl));
  }
  if (root) {
    const urls = [...site.pages.filter(p => !p.seo?.noindex), ...itemPages].flatMap(page => site.languages.map(l => {
      const alts = site.languages.map(x => `    <xhtml:link rel="alternate" hreflang="${x}" href="${escapeHtml(absolute(site, pageDir(site, page, x)))}"/>`).join('\n');
      return `  <url>\n    <loc>${escapeHtml(absolute(site, pageDir(site, page, l)))}</loc>\n${alts}\n  </url>`;
    })).join('\n');
    files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
    files.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${root}sitemap.xml\n`);
  } else files.set('robots.txt', 'User-agent: *\nAllow: /\n');
  return { files };
}
