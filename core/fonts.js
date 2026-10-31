/*
 * Polices auto-hébergées (cycle 29) : manifeste des fichiers woff2 embarqués dans fonts/<famille>/ (paquets Fontsource,
 * licence SIL OFL 1.1, sous-ensembles latin et latin-ext), règles @font-face locales pour le canevas et le site publié,
 * polices personnalisées importées (.woff2) rangées dans site.fonts. Aucune requête vers un tiers : le site publié
 * reçoit les fichiers dans assets/fonts/, avec un nom suffixé de leur empreinte (cache long sans risque).
 * Japonais : pile système (core/render.js, jaFontStack), aucun fichier.
 */
import { FONTS } from './theme.js';
import { fingerprint, suffixed } from './fingerprint.js';

/* Plages Unicode des sous-ensembles (celles de Fontsource / Google Fonts) */
export const SUBSETS = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
};

const f = (file, subset, weight, style, hash, bytes) => ({ file, subset, weight, style, hash, bytes });
/* Police variable : « wght » dans le nom du fichier, plage de graisses dans la règle */
const fam = (family, dir, source, range, files) => ({
  family, dir, source, license: 'OFL-1.1', variable: !!range,
  files: files.map(x => (x.weight === 'wght' ? { ...x, weight: range } : x))
});

/* Clé du thème (core/theme.js FONTS) → fichiers. Statique (400 et 700) ou variable selon le lot le plus léger. */
export const FONT_FILES = {
  archivo: fam('Archivo', 'archivo', '@fontsource/archivo@5.3.0', null, [
    f('archivo-latin-400-italic.woff2', 'latin', '400', 'italic', '9372d50e', 15820),
    f('archivo-latin-400-normal.woff2', 'latin', '400', 'normal', 'f79a38d5', 14700),
    f('archivo-latin-700-italic.woff2', 'latin', '700', 'italic', '3573a006', 16004),
    f('archivo-latin-700-normal.woff2', 'latin', '700', 'normal', 'a398bb30', 14508),
    f('archivo-latin-ext-400-italic.woff2', 'latin-ext', '400', 'italic', 'f7fbc9f7', 13568),
    f('archivo-latin-ext-400-normal.woff2', 'latin-ext', '400', 'normal', '398f2bb6', 12928),
    f('archivo-latin-ext-700-italic.woff2', 'latin-ext', '700', 'italic', 'e9dc2c43', 14112),
    f('archivo-latin-ext-700-normal.woff2', 'latin-ext', '700', 'normal', 'a27b1ca5', 13272)
  ]),
  'dm-sans': fam('DM Sans', 'dm-sans', '@fontsource/dm-sans@5.3.0', null, [
    f('dm-sans-latin-400-italic.woff2', 'latin', '400', 'italic', '8e11b3ba', 15140),
    f('dm-sans-latin-400-normal.woff2', 'latin', '400', 'normal', 'edd59174', 14200),
    f('dm-sans-latin-700-italic.woff2', 'latin', '700', 'italic', '10caa2d6', 15224),
    f('dm-sans-latin-700-normal.woff2', 'latin', '700', 'normal', '63675ec9', 14348),
    f('dm-sans-latin-ext-400-italic.woff2', 'latin-ext', '400', 'italic', 'fa6bc5f5', 8128),
    f('dm-sans-latin-ext-400-normal.woff2', 'latin-ext', '400', 'normal', 'abe7386f', 7364),
    f('dm-sans-latin-ext-700-italic.woff2', 'latin-ext', '700', 'italic', '57a0a18a', 8172),
    f('dm-sans-latin-ext-700-normal.woff2', 'latin-ext', '700', 'normal', '22f6e4f9', 7452)
  ]),
  'public-sans': fam('Public Sans', 'public-sans', '@fontsource-variable/public-sans@5.3.0', '100 900', [
    f('public-sans-latin-ext-wght-italic.woff2', 'latin-ext', 'wght', 'italic', '37653956', 19312),
    f('public-sans-latin-ext-wght-normal.woff2', 'latin-ext', 'wght', 'normal', 'c42edbe2', 18472),
    f('public-sans-latin-wght-italic.woff2', 'latin', 'wght', 'italic', '93e3d9c7', 28292),
    f('public-sans-latin-wght-normal.woff2', 'latin', 'wght', 'normal', '72517885', 26832)
  ]),
  'source-serif': fam('Source Serif 4', 'source-serif', '@fontsource/source-serif-4@5.3.1', null, [
    f('source-serif-4-latin-400-italic.woff2', 'latin', '400', 'italic', 'f3fbf232', 20092),
    f('source-serif-4-latin-400-normal.woff2', 'latin', '400', 'normal', '1899369b', 20088),
    f('source-serif-4-latin-700-italic.woff2', 'latin', '700', 'italic', '08e56adb', 21484),
    f('source-serif-4-latin-700-normal.woff2', 'latin', '700', 'normal', 'dba795fc', 21716),
    f('source-serif-4-latin-ext-400-italic.woff2', 'latin-ext', '400', 'italic', '354c2b50', 18452),
    f('source-serif-4-latin-ext-400-normal.woff2', 'latin-ext', '400', 'normal', 'bdf93282', 17844),
    f('source-serif-4-latin-ext-700-italic.woff2', 'latin-ext', '700', 'italic', 'f8c6190f', 19156),
    f('source-serif-4-latin-ext-700-normal.woff2', 'latin-ext', '700', 'normal', '757f9573', 18468)
  ]),
  fraunces: fam('Fraunces', 'fraunces', '@fontsource-variable/fraunces@5.3.0', '100 900', [
    f('fraunces-latin-ext-wght-italic.woff2', 'latin-ext', 'wght', 'italic', '80326b56', 40528),
    f('fraunces-latin-ext-wght-normal.woff2', 'latin-ext', 'wght', 'normal', '7521a037', 33584),
    f('fraunces-latin-wght-italic.woff2', 'latin', 'wght', 'italic', '4a611079', 45656),
    f('fraunces-latin-wght-normal.woff2', 'latin', 'wght', 'normal', 'f55f32fe', 36620)
  ]),
  lora: fam('Lora', 'lora', '@fontsource-variable/lora@5.3.0', '400 700', [
    f('lora-latin-ext-wght-italic.woff2', 'latin-ext', 'wght', 'italic', '6402415e', 21128),
    f('lora-latin-ext-wght-normal.woff2', 'latin-ext', 'wght', 'normal', '80a55a2b', 20088),
    f('lora-latin-wght-italic.woff2', 'latin', 'wght', 'italic', 'acf5ed31', 40772),
    f('lora-latin-wght-normal.woff2', 'latin', 'wght', 'normal', '14fda163', 37788)
  ]),
  oswald: fam('Oswald', 'oswald', '@fontsource/oswald@5.3.0', null, [
    f('oswald-latin-400-normal.woff2', 'latin', '400', 'normal', 'f46cf1b8', 12248),
    f('oswald-latin-700-normal.woff2', 'latin', '700', 'normal', 'eeb60c3d', 12672),
    f('oswald-latin-ext-400-normal.woff2', 'latin-ext', '400', 'normal', 'c24986c2', 11624),
    f('oswald-latin-ext-700-normal.woff2', 'latin-ext', '700', 'normal', '541fa73c', 11980)
  ])
};

/* Nom du fichier dans le site publié : assets/fonts/<nom>-<empreinte>.woff2 */
export const exportFontName = file => `assets/fonts/${suffixed(file.file, file.hash)}`;
/* Chemin du fichier dans l'éditeur (même origine) */
export const editorFontPath = (key, file) => `fonts/${FONT_FILES[key].dir}/${file.file}`;

const face = (family, style, weight, url, range) =>
  `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url("${url}") format("woff2");${range ? `unicode-range:${range}` : ''}}`;

/*
 * Règles @font-face d'une famille embarquée. urlPrefix : dossier des fichiers vu depuis la feuille de style
 * (canevas : adresse absolue de fonts/<famille>/ dans l'éditeur ; site : assets/fonts/). hashed : noms suffixés (site).
 */
export function fontFaceCss(key, { urlPrefix = 'assets/fonts/', hashed = true } = {}) {
  const fam = FONT_FILES[key];
  if (!fam) return '';
  return fam.files.map(x => face(fam.family, x.style, x.weight, urlPrefix + (hashed ? suffixed(x.file, x.hash) : x.file), SUBSETS[x.subset])).join('\n');
}

const CUSTOM = /^custom:([a-z0-9_]+)$/i;
const isCustomKey = key => CUSTOM.test(String(key || ''));
export const customFontId = key => (CUSTOM.exec(String(key || '')) || [])[1] || null;

/* Clés de familles embarquées utilisées par le thème (titres puis texte), sans doublon */
export function themeFontKeys(site) {
  const keys = [site?.theme?.fonts?.heading, site?.theme?.fonts?.body].filter(k => FONT_FILES[k]);
  return [...new Set(keys)];
}

/* Fichiers à copier dans le site publié : { src: chemin dans l'éditeur, name: chemin dans le site, bytes } */
export function fontFilesFor(site) {
  const out = [];
  for (const key of themeFontKeys(site)) for (const x of FONT_FILES[key].files) out.push({ key, src: editorFontPath(key, x), name: exportFontName(x), bytes: x.bytes });
  return out;
}

/* Fichier à précharger (<link rel="preload">) : la police des titres (sinon celle du texte), latin, droite, graisse de base */
export function preloadFont(site) {
  for (const key of [site?.theme?.fonts?.heading, site?.theme?.fonts?.body]) {
    const fam = FONT_FILES[key];
    if (!fam) continue;
    const x = fam.files.find(y => y.subset === 'latin' && y.style === 'normal' && (fam.variable || y.weight === '400')) || fam.files[0];
    return { key, src: editorFontPath(key, x), name: exportFontName(x) };
  }
  return null;
}

/* Polices personnalisées du projet (site.fonts) → { key, label, stack } ; les options du thème = embarquées + personnalisées */
export function customFonts(site) {
  return Object.entries(site?.fonts || {}).map(([id, x]) => ({ id, ...x }));
}

export function fontOptions(site) {
  const built = Object.entries(FONTS).map(([key, x]) => ({ key, label: x.label, stack: x.stack, custom: false }));
  const seen = new Set();
  const custom = [];
  for (const x of customFonts(site)) {
    if (seen.has(x.family)) continue;
    seen.add(x.family);
    custom.push({ key: `custom:${x.id}`, label: x.family, stack: `"${x.family}",${serifLike(x.family) ? 'Georgia,serif' : 'system-ui,sans-serif'}`, custom: true });
  }
  return [...built, ...custom];
}

const serifLike = name => /serif|garamond|baskerville|georgia|times|libre|caslon|playfair|merriweather/i.test(name) && !/sans/i.test(name);

/* Pile CSS d'un rôle du thème (heading | body), ou d'une clé donnée */
export function fontStack(site, roleOrKey) {
  const key = roleOrKey === 'heading' || roleOrKey === 'body' ? site?.theme?.fonts?.[roleOrKey] : roleOrKey;
  if (FONTS[key]) return FONTS[key].stack;
  const id = customFontId(key);
  const x = id && site?.fonts?.[id];
  if (!x) return FONTS.system.stack;
  return fontOptions(site).find(o => o.key === `custom:${id}`)?.stack || FONTS.system.stack;
}

/* Fichier exporté d'une police personnalisée : assets/fonts/<fichier>-<empreinte>.woff2 */
export const customFontExportName = x => `assets/fonts/${suffixed(x.file, fingerprint(x.dataUrl))}`;

/* Polices personnalisées utilisées par le thème (toutes les graisses de la même famille) */
export function usedCustomFonts(site) {
  const fams = new Set();
  for (const role of ['heading', 'body']) {
    const id = customFontId(site?.theme?.fonts?.[role]);
    if (id && site?.fonts?.[id]) fams.add(site.fonts[id].family);
  }
  return customFonts(site).filter(x => fams.has(x.family));
}

/* @font-face des polices personnalisées : data: dans le canevas, fichiers dans assets/fonts/ sur le site */
export function customFontCss(site, { canvas = false, urlPrefix = 'assets/fonts/' } = {}) {
  return usedCustomFonts(site).map(x => face(x.family, x.style || 'normal', x.weight || '400', canvas ? x.dataUrl : urlPrefix + suffixed(x.file, fingerprint(x.dataUrl)), '')).join('\n');
}

/* Toutes les règles @font-face d'un site (embarquées + personnalisées) */
export function fontsCss(site, { canvas = false, fontBase = 'fonts/' } = {}) {
  const parts = themeFontKeys(site).map(key => (canvas
    ? fontFaceCss(key, { urlPrefix: `${fontBase}${FONT_FILES[key].dir}/`, hashed: false })
    : fontFaceCss(key, { urlPrefix: 'assets/fonts/' })));
  const custom = customFontCss(site, { canvas });
  if (custom) parts.push(custom);
  return parts.join('\n');
}

/* Signature des polices du thème : quand elle change, le canevas est rechargé (nouvelles règles @font-face) */
export function fontSignature(site) {
  return JSON.stringify([site?.theme?.fonts?.heading, site?.theme?.fonts?.body, usedCustomFonts(site).map(x => `${x.id}:${x.weight}:${x.style}`)]);
}

export { isCustomKey };
