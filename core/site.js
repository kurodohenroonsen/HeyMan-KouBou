/* Site : pages, thème, en-tête, pied de page, ressources, validations. Opérations pures. */
import { createNode, walk, canContain, findNode } from './tree.js';
import { REGISTRY, fieldsOf } from './widgets.js';
import { PALETTE_KEYS, BASE_PALETTE } from './style.js';
import { defaultTokens } from './tokens.js';
import { FONTS } from './theme.js';
import { customFontId } from './fonts.js';
import { validIcon, ICON_SIZES } from './siteicon.js';
import { missingFrom } from './i18n.js';
import { validateCollections } from './collections.js';
import { sanitizeSiteTexts } from './sanitize-site.js';
import { defaultTimezone } from './timezone.js';
import { __, N_ } from './ui-i18n.js';

/* Langues de contenu des sites (noms jamais traduits) */
export const LANG_LABELS = { fr: 'Français', nl: 'Nederlands', de: 'Deutsch', en: 'English', ja: '日本語' };
/* Titre de la page d'accueil et nom d'un nouveau site, dans la langue principale choisie */
export const HOME_TITLES = { fr: 'Accueil', nl: 'Home', de: 'Startseite', en: 'Home', ja: 'ホーム' };
const NEW_SITE_NAMES = { fr: 'Nouveau site', nl: 'Nieuwe site', de: 'Neue Website', en: 'New site', ja: '新しいサイト' };

/* Nouveau site vide : langue principale (le japonais compris) puis les autres langues, inconnues et doublons écartés */
export function blankSite({ name, main = 'fr', others } = {}) {
  const def = Object.hasOwn(LANG_LABELS, main) ? main : 'fr';
  const rest = (others ?? (def === 'fr' ? ['nl', 'de', 'en'] : [])).filter(l => Object.hasOwn(LANG_LABELS, l) && l !== def);
  const clean = String(name ?? '').trim();
  return createSite({ name: clean || NEW_SITE_NAMES[def], languages: [def, ...new Set(rest)] });
}
const clone = v => structuredClone(v);

/*
 * Adresses de pages en japonais : les kana sont transcrits en rōmaji (Hepburn, sans macron :
 * « ー » double la voyelle) → チーム = « chiimu », おしらせ = « oshirase », ニュース = « nyuusu ».
 * Un titre sans aucune lettre latine ni kana (kanji seuls, autre écriture) reçoit une adresse
 * de repli stable « page-<empreinte> » (même titre → même adresse). Dans un titre mêlé de kanji, seuls les
 * katakana sont transcrits (チーム紹介 → « chiimu ») : les hiragana n'y sont que des terminaisons. Les adresses restent en ASCII
 * (a-z, 0-9, -) : aucun souci de nom de dossier dans le .zip, par FTP, chez OVH ou sur GitHub Pages.
 */
const KANA = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n', ゔ: 'vu', ゕ: 'ka', ゖ: 'ke',
  ヷ: 'va', ヸ: 'vi', ヹ: 've', ヺ: 'vo'
};
const SMALL_Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const SMALL_V = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゎ: 'a' };
const toHira = ch => { const c = ch.codePointAt(0); return c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch; };

export function kanaToRomaji(text) {
  const out = [];
  let geminate = false;
  const push = r => {
    if (geminate && /^[bcdfghjkmpqrstvwxyz]/.test(r)) r = (r.startsWith('ch') ? 't' : r[0]) + r;
    geminate = false;
    out.push(r);
  };
  for (const raw of String(text ?? '')) {
    const ch = toHira(raw);
    const last = out.length ? out[out.length - 1] : '';
    if (ch === 'っ') { geminate = true; continue; }
    if (ch === 'ー') { const v = /[aiueo]$/.exec(last); if (v) out[out.length - 1] = last + v[0]; continue; }
    if (SMALL_Y[ch] || SMALL_V[ch]) {
      const v = SMALL_Y[ch] || SMALL_V[ch];
      if (!/[a-z]$/.test(last)) { out.push(SMALL_Y[ch] ? `y${v}` : v); continue; }
      const cons = last.replace(/[aiueo]$/, '');
      out[out.length - 1] = SMALL_Y[ch] ? (['sh', 'ch', 'j'].includes(cons) ? cons + v : `${cons}y${v}`) : (last === 'u' ? `w${v}` : cons + v);
      continue;
    }
    if (ch === '・' || ch === '゠') { geminate = false; out.push(' '); continue; }
    if (ch === 'ゝ' || ch === 'ゞ' || ch === 'ヽ' || ch === 'ヾ') { if (/[a-z]$/.test(last)) out.push(last); continue; }
    if (KANA[ch]) { push(KANA[ch]); continue; }
    geminate = false;
    out.push(raw);
  }
  return out.join('');
}

/* Empreinte courte et stable (FNV-1a 32 bits, base 36) */
const shortHash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };

export function slugify(text, { fallback = 'page' } = {}) {
  let src = String(text ?? '').normalize('NFC');
  src = src.replace(/[\uFF01-\uFF5E\uFF65-\uFF9F]+/g, m => m.normalize('NFKC'));
  if (/[\u3041-\u30FF]/.test(src)) {
    /* Texte mêlé de kanji : les hiragana y sont surtout des terminaisons et particules (« お問い合わせ ») ; on ne garde que les katakana */
    if (/\p{Script=Han}/u.test(src)) src = src.replace(/[\u3041-\u309F]+/g, ' ');
    src = kanaToRomaji(src);
  }
  const slug = src.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  if (slug || !fallback || !/[\p{L}\p{N}]/u.test(src)) return slug;
  return `${fallback}-${shortHash(src.trim())}`;
}

export function newPageId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

/* Noms par défaut, gardés en français dans le projet ; l'affichage les traduit avec __() */
export const PALETTE_NAMES = { c1: N_('Principale'), c2: N_('Secondaire'), c3: N_('Texte'), c4: N_('Fond'), c5: N_('Discrète'), c6: N_('Surface') };

/* Complète un projet créé par une version précédente (sans le modifier en place) ; tous ses textes sont assainis (cycle 25) */
export function normalizeSite(site) {
  const s = sanitizeSiteTexts(clone(site)).site;
  s.theme ||= {};
  s.theme.paletteNames = { ...PALETTE_NAMES, ...(s.theme.paletteNames || {}) };
  for (const k of Object.keys(s.theme.paletteNames)) if (!BASE_PALETTE.includes(k) && !s.theme.palette?.[k]) delete s.theme.paletteNames[k];
  const d = defaultTokens();
  s.tokens = { type: { ...d.type, ...(s.tokens?.type || {}) }, space: { ...d.space, ...(s.tokens?.space || {}) } };
  s.presets ||= {};
  s.defaultPresets ||= {};
  s.components ||= {};
  if (!s.collections || typeof s.collections !== 'object') s.collections = {};
  s.layout = { header: null, footer: null, ...(s.layout || {}) };
  if (!Array.isArray(s.menu)) s.menu = null;
  if (!s.fonts || typeof s.fonts !== 'object') s.fonts = {};
  return s;
}

export function createSite({ name = 'Mon site', languages = ['fr'], defaultLanguage, baseUrl = '' } = {}) {
  const def = defaultLanguage || languages[0];
  return {
    version: 2,
    name,
    timezone: defaultTimezone(def),
    baseUrl,
    languages: [def, ...languages.filter(l => l !== def)],
    defaultLanguage: def,
    theme: {
      palette: { c1: '#0f766e', c2: '#f59e0b', c3: '#16161a', c4: '#f7f7f4', c5: '#5f5f69', c6: '#ffffff' },
      paletteNames: { ...PALETTE_NAMES },
      fonts: { heading: 'system', body: 'system' },
      baseSize: 17, radius: 10, contentWidth: 1160
    },
    tokens: defaultTokens(),
    presets: {},
    defaultPresets: {},
    components: {},
    collections: {},
    layout: { header: null, footer: null },
    menu: null,
    fonts: {},
    header: { logo: '', showLangs: true, sticky: true },
    footer: { text: { [def]: `© ${name}` } },
    pages: [{ id: newPageId(), slug: '', title: { [def]: HOME_TITLES[def] || 'Accueil' }, seo: { description: {} }, root: createNode('page') }],
    assets: {}
  };
}

export const findPage = (site, id) => site.pages.find(p => p.id === id) || null;

function withPage(site, pageId, fn) {
  const s = clone(site);
  const p = findPage(s, pageId);
  if (!p) throw new Error(__('Page introuvable : {id}', { id: pageId }));
  fn(p, s);
  return s;
}

export function updatePageRoot(site, pageId, root) {
  return withPage(site, pageId, p => { p.root = clone(root); });
}

export function addPage(site, { slug, title, root }) {
  const s = clone(site);
  const clean = slugify(slug);
  if (!clean) throw new Error(__('Donnez un nom à la page.'));
  if (s.pages.some(p => p.slug === clean)) throw new Error(__('Une page « {slug} » existe déjà.', { slug: clean }));
  s.pages.push({ id: newPageId(), slug: clean, title: clone(title || {}), seo: { description: {} }, root: root ? clone(root) : createNode('page') });
  return s;
}

export function removePage(site, pageId) {
  const p = findPage(site, pageId);
  if (!p) throw new Error(__('Page introuvable.'));
  if (p.slug === '') throw new Error(__('La page d’accueil ne peut pas être supprimée.'));
  const s = clone(site);
  s.pages = s.pages.filter(x => x.id !== pageId);
  if (Array.isArray(s.menu)) {
    const keep = it => it.kind !== 'page' || it.pageId !== pageId;
    s.menu = s.menu.filter(keep).map(it => ({ ...it, children: (it.children || []).filter(keep) }));
  }
  return s;
}

export function effectiveSlug(site, page, lang) {
  return !lang || lang === site.defaultLanguage ? page.slug : (page.slugs?.[lang] || page.slug);
}

export function setPageSlug(site, pageId, slug, lang) {
  const p = findPage(site, pageId);
  if (!p) throw new Error(__('Page introuvable.'));
  if (p.slug === '') throw new Error(__('L’adresse de la page d’accueil est fixe.'));
  const def = !lang || lang === site.defaultLanguage;
  const clean = slugify(slug);
  if (!clean && def) throw new Error(__('L’adresse ne peut pas être vide.'));
  if (clean && site.pages.some(x => x.id !== pageId && x.slug !== '' && effectiveSlug(site, x, lang || site.defaultLanguage) === clean)) throw new Error(def ? __('Une page « {slug} » existe déjà.', { slug: clean }) : __('Une page « {slug} » existe déjà en {lang}.', { slug: clean, lang: lang.toUpperCase() }));
  return withPage(site, pageId, page => {
    if (def) page.slug = clean;
    else {
      page.slugs = { ...(page.slugs || {}) };
      if (clean && clean !== page.slug) page.slugs[lang] = clean; else delete page.slugs[lang];
    }
  });
}

export function setPageTitle(site, pageId, value, lang) {
  return withPage(site, pageId, p => { p.title = { ...p.title, [lang]: String(value) }; });
}

export function setPageFooterLink(site, pageId, on) {
  return withPage(site, pageId, p => { p.footerLink = !!on; });
}

export function setPageSeo(site, pageId, value, lang) {
  return withPage(site, pageId, p => { p.seo = { ...(p.seo || {}), description: { ...(p.seo?.description || {}), [lang]: String(value).slice(0, 300) } }; });
}

export function movePage(site, pageId, delta) {
  const s = clone(site);
  const i = s.pages.findIndex(p => p.id === pageId);
  const j = Math.max(1, Math.min(s.pages.length - 1, i + delta));
  if (i <= 0 || i === j) return s;
  const [p] = s.pages.splice(i, 1);
  s.pages.splice(j, 0, p);
  return s;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function addPaletteColor(site, color, name) {
  if (!HEX.test(color)) throw new Error(__('Couleur invalide.'));
  const key = PALETTE_KEYS.find(k => !site.theme.palette[k]);
  if (!key) throw new Error(__('La palette contient déjà 12 couleurs.'));
  const s = clone(site);
  s.theme.palette[key] = color.toLowerCase();
  s.theme.paletteNames = { ...(s.theme.paletteNames || {}), [key]: String(name || `Couleur ${key.slice(1)}`).slice(0, 30) };
  return { site: s, key };
}

export function removePaletteColor(site, key) {
  if (BASE_PALETTE.includes(key)) throw new Error(__('Les 6 couleurs de base ne peuvent pas être supprimées (elles servent au thème).'));
  if (!site.theme.palette[key]) throw new Error(__('Couleur inconnue.'));
  const s = clone(site);
  delete s.theme.palette[key];
  if (s.theme.paletteNames) delete s.theme.paletteNames[key];
  return s;
}

export function setPaletteName(site, key, name) {
  if (!site.theme.palette[key]) throw new Error(__('Couleur inconnue.'));
  const n = String(name ?? '').trim().slice(0, 30);
  if (!n) throw new Error(__('Donnez un nom à la couleur.'));
  const s = clone(site);
  s.theme.paletteNames = { ...(s.theme.paletteNames || {}), [key]: n };
  return s;
}

export function setPalette(site, key, color) {
  if (!PALETTE_KEYS.includes(key)) throw new Error(__('Couleur de palette inconnue.'));
  if (!HEX.test(color)) throw new Error(__('Couleur invalide.'));
  const s = clone(site);
  s.theme.palette[key] = color.toLowerCase();
  return s;
}

export function setTheme(site, patch) {
  const s = clone(site);
  if (patch.fonts) {
    for (const k of ['heading', 'body']) {
      const v = patch.fonts[k];
      if (!v) continue;
      if (FONTS[v]) s.theme.fonts[k] = v;
      else if (customFontId(v)) {
        if (!s.fonts?.[customFontId(v)]) throw new Error(__('Police personnalisée inconnue.'));
        s.theme.fonts[k] = v;
      }
    }
  }
  if ('baseSize' in patch) s.theme.baseSize = Math.max(14, Math.min(22, Number(patch.baseSize) || 17));
  if ('radius' in patch) s.theme.radius = Math.max(0, Math.min(40, Number(patch.radius) || 0));
  if ('pageTransitions' in patch) s.theme.pageTransitions = !!patch.pageTransitions;
  if ('contentWidth' in patch) s.theme.contentWidth = Math.max(720, Math.min(1600, Number(patch.contentWidth) || 1160));
  return s;
}

export function setHeader(site, patch) {
  const s = clone(site);
  if ('logo' in patch) s.header.logo = /^asset:[a-z0-9_]+$/i.test(patch.logo) || /^https:\/\/[^\s\x22\x27<>]{4,500}$/i.test(patch.logo) || patch.logo === '' ? patch.logo : s.header.logo;
  if ('showLangs' in patch) s.header.showLangs = !!patch.showLangs;
  if ('sticky' in patch) s.header.sticky = !!patch.sticky;
  if ('burger' in patch) s.header.burger = !!patch.burger;
  return s;
}

export function setFooterText(site, value, lang) {
  const s = clone(site);
  s.footer.text = { ...s.footer.text, [lang]: String(value) };
  return s;
}

/* Réglages de publication (sans aucun secret) */
export function setPublishSettings(site, patch) {
  const s = clone(site);
  const p = { mode: 'zip', url: '', gh: { owner: '', repo: '', branch: 'main', dir: '' }, ...(s.publish || {}) };
  if ('mode' in patch) p.mode = ['zip', 'php', 'github'].includes(patch.mode) ? patch.mode : 'zip';
  /* Serveur visé : Apache (OVH : .htaccess généré) ou GitHub Pages (sans .htaccess) */
  if ('server' in patch) p.server = patch.server === 'pages' ? 'pages' : 'apache';
  if ('url' in patch) {
    const u = String(patch.url || '').trim();
    if (u && !/^https?:\/\/[^\s\x22\x27<>]+\/publish\.php$/i.test(u)) throw new Error(__('Adresse attendue : https://www.votre-site.be/publish.php'));
    if (/^http:[/][/]/i.test(u) && !/^http:[/][/](localhost|127\.0\.0\.1)(:\d+)?[/]/i.test(u)) throw new Error(__('Utilisez une adresse https:// (le jeton ne doit pas circuler en clair).'));
    p.url = u;
  }
  if (patch.gh) {
    const g = { ...p.gh, ...patch.gh };
    for (const k of ['owner', 'repo', 'branch', 'dir']) g[k] = String(g[k] || '').trim().slice(0, 100);
    p.gh = g;
  }
  s.publish = p;
  return s;
}

/* Icône du site : { svg?, png: { 32, 180, 192, 512 } } préparée par l'éditeur (core/siteicon.js la valide) ; null la retire */
export function setSiteIcon(site, icon) {
  const s = clone(site);
  if (icon === null || icon === undefined) { delete s.icon; return s; }
  if (!validIcon(icon)) throw new Error(__('Icône invalide : image carrée PNG, JPEG, WebP ou SVG attendue.'));
  s.icon = { ...(icon.svg ? { svg: icon.svg } : {}), png: Object.fromEntries(ICON_SIZES.map(n => [n, icon.png[n]])) };
  return s;
}

export function setSiteMeta(site, patch) {
  const s = clone(site);
  if ('name' in patch) s.name = String(patch.name).slice(0, 80);
  if ('baseUrl' in patch) {
    const u = String(patch.baseUrl).trim();
    if (u && !/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[^\s]*)?$/i.test(u)) throw new Error(__('L’adresse du site doit commencer par https://'));
    s.baseUrl = u.replace(/\/+$/, '');
  }
  if (patch.languages) {
    const langs = patch.languages.filter(l => LANG_LABELS[l]);
    if (!langs.includes(s.defaultLanguage)) throw new Error(__('La langue principale doit rester active.'));
    s.languages = [s.defaultLanguage, ...langs.filter(l => l !== s.defaultLanguage)];
  }
  return s;
}

const DATA_IMG = /^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i;
const DATA_WOFF2 = /^data:(?:font\/woff2|application\/(?:font-woff2|octet-stream));base64,[a-z0-9+/=]+$/i;
const FONT_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

/* Police personnalisée (.woff2 importé) : nom de famille, graisse, style ; le fichier reste dans le projet (site.fonts) */
export function addFont(site, { family, weight = '400', style = 'normal', dataUrl, name = '' }) {
  if (!DATA_WOFF2.test(String(dataUrl || ''))) throw new Error(__('Police non prise en charge : importez un fichier .woff2.'));
  const fam = String(family ?? '').replace(/["<>\\]/g, '').trim().slice(0, 60);
  if (!fam) throw new Error(__('Donnez un nom à la police.'));
  if (String(dataUrl).length > 4_000_000) throw new Error(__('Police trop lourde (3 Mo au plus).'));
  const s = clone(site);
  s.fonts ||= {};
  const id = 'font_' + Math.random().toString(36).slice(2, 10);
  const base = slugify(String(name || fam).replace(/\.woff2$/i, ''), { fallback: 'police' }) || 'police';
  const taken = new Set(Object.values(s.fonts).map(x => x.file));
  let file = `${base}.woff2`;
  for (let n = 2; taken.has(file); n++) file = `${base}-${n}.woff2`;
  const w = FONT_WEIGHTS.includes(String(weight)) ? String(weight) : '400';
  s.fonts[id] = { family: fam, weight: w, style: style === 'italic' ? 'italic' : 'normal', file, dataUrl };
  return { site: s, id };
}

/* Retire une police personnalisée ; un rôle du thème qui n'a plus de fichier pour sa famille revient à « Système » */
export function removeFont(site, id) {
  if (!site.fonts?.[id]) throw new Error(__('Police inconnue.'));
  const s = clone(site);
  const fam = s.fonts[id].family;
  delete s.fonts[id];
  const other = Object.keys(s.fonts).find(x => s.fonts[x].family === fam);
  for (const k of ['heading', 'body']) {
    if (customFontId(s.theme.fonts[k]) !== id) continue;
    s.theme.fonts[k] = other ? `custom:${other}` : 'system';
  }
  return s;
}

export function addAsset(site, { name, mime, dataUrl, width, height, variants }) {
  if (!DATA_IMG.test(dataUrl)) throw new Error(__('Image non prise en charge.'));
  for (const v of variants || []) if (!DATA_IMG.test(v.dataUrl) || !(v.w > 0)) throw new Error(__('Variante d’image invalide.'));
  const s = clone(site);
  const id = 'img_' + Math.random().toString(36).slice(2, 10);
  const dot = String(name).lastIndexOf('.');
  const ext = dot > 0 ? slugify(String(name).slice(dot + 1), { fallback: '' }) || 'bin' : 'bin';
  const base = slugify(dot > 0 ? String(name).slice(0, dot) : name, { fallback: 'image' }) || 'image';
  const taken = new Set(Object.values(s.assets).map(a => a.file));
  let file = `${base}.${ext}`;
  for (let n = 2; taken.has(file); n++) file = `${base}-${n}.${ext}`;
  const stem = file.slice(0, file.lastIndexOf('.'));
  s.assets[id] = { file, mime, dataUrl };
  if (width > 0 && height > 0) { s.assets[id].width = Math.round(width); s.assets[id].height = Math.round(height); }
  if (variants?.length) s.assets[id].variants = variants.filter(v => !width || v.w < width).sort((a, b) => a.w - b.w).map(v => ({ w: Math.round(v.w), file: `${stem}-${Math.round(v.w)}.${ext}`, dataUrl: v.dataUrl }));
  return { site: s, id };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSite(site) {
  const errors = [];
  if (site?.version !== 2) errors.push(__('Format de projet non reconnu (version 2 attendue).'));
  if (!Array.isArray(site?.pages)) return { ok: false, errors: [...errors, __('Aucune page.')] };
  if (!site.languages?.includes(site.defaultLanguage)) errors.push(__('La langue principale doit faire partie des langues du site.'));
  for (const l of site.languages || []) if (!LANG_LABELS[l]) errors.push(__('Langue non prise en charge : {lang}', { lang: l }));
  const seen = new Set();
  let homes = 0;
  for (const p of site.pages) {
    if (p.slug === '') homes++;
    else if (!SLUG_RE.test(p.slug)) errors.push(__('Adresse (slug) invalide : « {slug} »', { slug: p.slug }));
    if (seen.has(p.slug)) errors.push(__('Adresse en double : « {slug} »', { slug: p.slug }));
    seen.add(p.slug);
    if (p.root?.type !== 'page') { errors.push(p.slug ? __('La page « {slug} » n’a pas de racine.', { slug: p.slug }) : __('La page d’accueil n’a pas de racine.')); continue; }
    walk(p.root, (n, parent) => {
      if (n.preset && n.preset !== '-') {
        const pr = site.presets?.[n.preset];
        if (!pr) errors.push(__('Preset introuvable sur un élément « {type} » : {preset}', { type: n.type, preset: n.preset }));
        else if (pr.type !== n.type) errors.push(__('Preset « {name} » prévu pour « {type} », appliqué à « {applied} »', { name: pr.name, type: pr.type, applied: n.type }));
      }
      if (n.ref) {
        const c = site.components?.[n.ref];
        if (!c) errors.push(p.slug ? __('Composant introuvable (instance sur la page « {slug} »)', { slug: p.slug }) : __('Composant introuvable (instance sur la page d’accueil)'));
        else if (c.node.type !== n.type) errors.push(__('Instance du composant « {name} » de type incohérent', { name: c.name }));
      }
      if (!REGISTRY[n.type]) errors.push(__('Type inconnu : {type}', { type: n.type }));
      else if (parent && !canContain(p.root, parent.id, n.type)) errors.push(__('« {type} » mal placé dans « {parent} »', { type: n.type, parent: parent.type }));
      return true;
    });
  }
  if (homes !== 1) errors.push(__('Le site doit avoir exactement une page d’accueil.'));
  errors.push(...validateCollections(site, { canContain, registry: REGISTRY }));
  for (const lang of (site.languages || []).filter(l => l !== site.defaultLanguage)) {
    const seenL = new Set();
    for (const p of site.pages) {
      if (p.slug === '') continue;
      const sl = effectiveSlug(site, p, lang);
      if (p.slugs?.[lang] && !SLUG_RE.test(p.slugs[lang])) errors.push(__('Adresse (slug) invalide en {lang} : « {slug} »', { lang: lang.toUpperCase(), slug: p.slugs[lang] }));
      if (seenL.has(sl)) errors.push(__('Adresse en double en {lang} : « {slug} »', { lang: lang.toUpperCase(), slug: sl }));
      seenL.add(sl);
    }
  }
  return { ok: errors.length === 0, errors };
}

const filled = v => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim() !== '';

/* Textes présents dans la langue principale et absents dans une autre (voir i18n.js pour l'inventaire) */
export function missingTranslations(site) {
  return missingFrom(site);
}

export { findNode };
