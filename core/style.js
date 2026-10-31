/*
 * Schéma des propriétés de style, validation et compilation en CSS.
 * Toute valeur passe par validateStyleValue() : rien de libre n'atteint la feuille de style.
 */

import { N_ } from './ui-i18n.js';

const LEN = /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw)$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;
export const PALETTE_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
export const BASE_PALETTE = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const TYPE_TOKENS = ['sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
const SPACE_TOKENS = ['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

/*
 * Expressions CSS autorisées dans les champs de longueur : clamp(), min(), max(), calc()
 * avec nombres, unités, opérateurs et variables d'échelle uniquement.
 */
const EXPR_TOKEN = /\s*(?:(-?(?:\d+|\d*\.\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ch|cqi|cqw)?)|(var\(--(?:step-(?:sm|base|lg|xl|2xl|3xl|4xl)|space-(?:3xs|2xs|xs|s|m|l|xl|2xl|3xl))\))|(clamp|min|max|calc)\(|(\()|(\))|([+\-*\/,]))\s*/y;
export function validExpression(v) {
  if (v.length > 120 || !/^(?:clamp|min|max|calc)\(/.test(v)) return false;
  EXPR_TOKEN.lastIndex = 0;
  let depth = 0;
  let pos = 0;
  while (pos < v.length) {
    EXPR_TOKEN.lastIndex = pos;
    const m = EXPR_TOKEN.exec(v);
    if (!m || m[0] === '') return false;
    if (m[3] || m[4]) depth++;
    if (m[5]) { depth--; if (depth < 0) return false; }
    if (depth === 0 && pos + m[0].length < v.length) return false;
    pos += m[0].length;
  }
  return depth === 0;
}

export const FONT_FAMILIES = {
  heading: 'var(--font-h)', body: 'var(--font-b)',
  system: 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',
  serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,Menlo,Consolas,monospace'
};
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 3px rgb(0 0 0 / .12)',
  md: '0 6px 18px -6px rgb(0 0 0 / .25)',
  lg: '0 18px 40px -12px rgb(0 0 0 / .35)'
};
export const TRANSFORMS = { none: 'none', lift: 'translateY(-4px)', grow: 'scale(1.03)', shrink: 'scale(.97)' };

const enumOf = (...v) => ({ kind: 'enum', values: v });
const len = (opts = {}) => ({ kind: 'length', ...opts });
const sp = (opts = {}) => len({ space: true, ...opts });

/* group : regroupement affiché dans l'inspecteur ; css : propriété CSS produite */
export const STYLE_PROPS = {
  fontFamily: { group: 'Typographie', label: N_('Police'), css: 'font-family', ...enumOf('heading', 'body', 'system', 'serif', 'mono') },
  fontSize: { group: 'Typographie', label: N_('Taille'), css: 'font-size', ...len({ size: true }) },
  fontWeight: { group: 'Typographie', label: N_('Graisse'), css: 'font-weight', ...enumOf('300', '400', '500', '600', '700', '800', '900') },
  lineHeight: { group: 'Typographie', label: N_('Interligne'), css: 'line-height', kind: 'number', min: 0.8, max: 3, step: 0.05 },
  letterSpacing: { group: 'Typographie', label: N_('Espacement des lettres'), css: 'letter-spacing', ...len({ negative: true }) },
  textAlign: { group: 'Typographie', label: N_('Alignement'), css: 'text-align', ...enumOf('left', 'center', 'right', 'justify') },
  textTransform: { group: 'Typographie', label: N_('Casse'), css: 'text-transform', ...enumOf('none', 'uppercase', 'lowercase', 'capitalize') },
  fontStyle: { group: 'Typographie', label: N_('Style'), css: 'font-style', ...enumOf('normal', 'italic') },
  color: { group: 'Typographie', label: N_('Couleur du texte'), css: 'color', kind: 'color' },

  background: { group: 'Fond', label: N_('Couleur de fond'), css: 'background-color', kind: 'color' },
  backgroundImage: { group: 'Fond', label: N_('Image de fond'), css: 'background-image', kind: 'image' },
  backgroundSize: { group: 'Fond', label: N_('Taille de l’image'), css: 'background-size', ...enumOf('cover', 'contain', 'auto') },
  backgroundPosition: { group: 'Fond', label: N_('Position de l’image'), css: 'background-position', ...enumOf('center', 'top', 'bottom', 'left', 'right') },

  marginTop: { group: 'Espacement', label: N_('Marge haut'), css: 'margin-top', ...sp({ negative: true, auto: true }) },
  marginRight: { group: 'Espacement', label: N_('Marge droite'), css: 'margin-right', ...sp({ negative: true, auto: true }) },
  marginBottom: { group: 'Espacement', label: N_('Marge bas'), css: 'margin-bottom', ...sp({ negative: true, auto: true }) },
  marginLeft: { group: 'Espacement', label: N_('Marge gauche'), css: 'margin-left', ...sp({ negative: true, auto: true }) },
  paddingTop: { group: 'Espacement', label: N_('Marge intérieure haut'), css: 'padding-top', ...sp() },
  paddingRight: { group: 'Espacement', label: N_('Marge intérieure droite'), css: 'padding-right', ...sp() },
  paddingBottom: { group: 'Espacement', label: N_('Marge intérieure bas'), css: 'padding-bottom', ...sp() },
  paddingLeft: { group: 'Espacement', label: N_('Marge intérieure gauche'), css: 'padding-left', ...sp() },

  borderWidth: { group: 'Bordure', label: N_('Épaisseur'), css: 'border-width', ...len() },
  borderStyle: { group: 'Bordure', label: N_('Type'), css: 'border-style', ...enumOf('none', 'solid', 'dashed', 'dotted') },
  borderColor: { group: 'Bordure', label: N_('Couleur'), css: 'border-color', kind: 'color' },
  borderRadius: { group: 'Bordure', label: N_('Arrondi'), css: 'border-radius', ...sp() },
  boxShadow: { group: 'Bordure', label: N_('Ombre'), css: 'box-shadow', kind: 'preset', map: SHADOWS },

  width: { group: 'Dimensions', label: N_('Largeur'), css: 'width', ...sp({ auto: true }) },
  maxWidth: { group: 'Dimensions', label: N_('Largeur maximale'), css: 'max-width', ...sp() },
  minHeight: { group: 'Dimensions', label: N_('Hauteur minimale'), css: 'min-height', ...sp() },

  gap: { group: 'Disposition', label: N_('Espace entre les éléments'), css: 'gap', ...sp() },
  alignItems: { group: 'Disposition', label: N_('Alignement vertical du contenu'), css: 'align-items', ...enumOf('start', 'center', 'end', 'stretch') },
  alignSelf: { group: 'Disposition', label: N_('Alignement vertical'), css: 'align-self', ...enumOf('start', 'center', 'end', 'stretch') },
  justifyContent: { group: 'Disposition', label: N_('Répartition'), css: 'justify-content', ...enumOf('start', 'center', 'end', 'space-between') },
  span: { group: 'Disposition', label: N_('Largeur de colonne (sur 12)'), css: 'grid-column', kind: 'int', min: 1, max: 12 },

  opacity: { group: 'Effets', label: N_('Opacité'), css: 'opacity', kind: 'number', min: 0, max: 1, step: 0.05 },
  transform: { group: 'Effets', label: N_('Transformation'), css: 'transform', kind: 'preset', map: TRANSFORMS },
  transitionDuration: { group: 'Effets', label: N_('Durée de transition (ms)'), css: 'transition', kind: 'int', min: 0, max: 3000 },
  reveal: { group: 'Effets', label: N_('Apparition au défilement'), css: null, special: true, ...enumOf('none', 'fade', 'up', 'zoom') }
};

export const HOVER_PROPS = ['color', 'background', 'borderColor', 'boxShadow', 'transform', 'opacity'];
export const STATES = ['desktop', 'tablet', 'mobile', 'hover'];
export const STYLE_GROUPS = [N_('Typographie'), N_('Fond'), N_('Espacement'), N_('Bordure'), N_('Dimensions'), N_('Disposition'), N_('Effets')];
/* Mode simple (cycle 30) : seuls ces groupes sont montrés ; les autres attendent le mode expert */
export const SIMPLE_GROUPS = ['Typographie', 'Fond', 'Espacement', 'Bordure'];
export const isExpertKey = key => !!STYLE_PROPS[key] && !SIMPLE_GROUPS.includes(STYLE_PROPS[key].group);

/* ---------- Champs nombre + unité (cycle 30) ---------- */
export const LENGTH_UNITS = ['px', 'rem', 'em', '%', 'vh', 'vw'];
const NUM_UNIT = /^(-?(?:\d+|\d*\.\d+))\s*(px|rem|em|%|vh|vw)$/;
/* Pas des flèches : 1 (Maj : 10) en px, %, vh, vw ; 0,1 (Maj : 1) en rem et em */
const STEP = { px: 1, '%': 1, vh: 1, vw: 1, rem: 0.1, em: 0.1 };
const round3 = n => Math.round(n * 1000) / 1000;

/* '0.85rem' → { n: 0.85, unit: 'rem' } ; '0' → px ; valeur libre (auto, clamp(), jeton) → null */
export function parseLength(v) {
  const s = String(v ?? '').trim();
  if (s === '0') return { n: 0, unit: 'px' };
  const m = NUM_UNIT.exec(s);
  return m ? { n: Number(m[1]), unit: m[2] } : null;
}

export function formatLength(n, unit = 'px') {
  const r = round3(Number(n));
  return `${r === 0 ? 0 : r}${unit}`;
}

/* Ce que la personne a tapé dans le champ nombre : un nombre seul prend l'unité choisie ; « 24px » est compris ;
   tout le reste (auto, clamp(), jeton…) passe tel quel et sera validé par validateStyleValue. */
export function lengthFromInput(text, unit = 'px') {
  const s = String(text ?? '').trim().replace(',', '.');
  if (s === '') return '';
  if (s === '0') return '0';
  if (/^-?(?:\d+|\d*\.\d+)$/.test(s)) return formatLength(Number(s), unit);
  const m = /^(-?(?:\d+|\d*\.\d+))\s+(px|rem|em|%|vh|vw)$/.exec(s);
  return m ? `${m[1]}${m[2]}` : s;
}

export const isFreeLength = v => v !== undefined && v !== null && String(v).trim() !== '' && !parseLength(v);

/* Flèche ↑ (dir 1) ou ↓ (dir -1) sur un champ : nouvelle valeur, ou null si la valeur est libre */
export function stepLength(v, dir, { big = false, unit = 'px', min = 0 } = {}) {
  const cur = String(v ?? '').trim() === '' ? { n: 0, unit } : parseLength(v);
  if (!cur) return null;
  const step = (STEP[cur.unit] || 1) * (big ? 10 : 1);
  return formatLength(Math.max(min, round3(cur.n + dir * step)), cur.unit);
}

/* ---------- Marges : les quatre côtés liés (cycle 30) ---------- */
const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
export const boxKeys = prefix => SIDES.map(s => prefix + s);
export const linkedBox = (prefix, value) => Object.fromEntries(boxKeys(prefix).map(k => [k, value]));

/* Lié d'office quand les quatre côtés sont égaux ; les marges extérieures vides restent libres */
export function boxLinkedDefault(prefix, values = {}) {
  const vals = boxKeys(prefix).map(k => values[k] ?? '');
  const same = vals.every(v => v === vals[0]);
  if (!same) return false;
  return vals[0] !== '' || prefix === 'padding';
}

/* ---------- Noms des couleurs de palette (cycle 30) ---------- */
/* Noms par défaut (core/site.js) : courts dans le panneau Site, longs partout où une couleur est affichée */
const DEFAULT_NAMES = { c1: 'Principale', c2: 'Secondaire', c3: 'Texte', c4: 'Fond', c5: 'Discrète', c6: 'Surface' };
export const PALETTE_LABELS = { c1: N_('Couleur principale'), c2: N_('Couleur secondaire'), c3: N_('Couleur du texte'), c4: N_('Couleur de fond'), c5: N_('Couleur discrète'), c6: N_('Couleur de surface') };

/* Nom court d'une couleur : les noms par défaut sont traduits, ceux donnés par la personne restent tels quels */
export function paletteName(names, k) {
  const n = names?.[k];
  if (!n) return k;
  if (n === DEFAULT_NAMES[k]) return __(DEFAULT_NAMES[k]);
  if (n === `Couleur ${k.slice(1)}`) return __('Couleur {n}', { n: k.slice(1) });
  return n;
}

/* Libellé affiché pour une valeur de couleur du modèle : « Couleur principale », « Rouge MAB », « #bbbbbb »… */
export function colorLabel(value, names = {}) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (v === 'transparent') return __('Transparent');
  if (!v.startsWith('palette:')) return v;
  const k = v.slice(8);
  const n = names?.[k];
  if (n && n === DEFAULT_NAMES[k] && PALETTE_LABELS[k]) return __(PALETTE_LABELS[k]);
  return paletteName(names, k);
}

const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/* Ce que la personne a tapé dans le champ couleur : un nom de palette (long ou court) → palette:cN ; sinon tel quel */
export function parseColorInput(text, names = {}) {
  const s = String(text ?? '').trim();
  if (!s || s.startsWith('palette:') || s.startsWith('#')) return s;
  const f = fold(s);
  for (const k of PALETTE_KEYS) {
    if (!names?.[k]) continue;
    if (f === fold(colorLabel(`palette:${k}`, names)) || f === fold(paletteName(names, k)) || f === fold(names[k])) return `palette:${k}`;
  }
  return s;
}

/* Propriétés qui restent sur le conteneur du widget quand le widget cible un élément intérieur */
const WRAPPER_KEYS = new Set(['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'textAlign', 'width', 'maxWidth', 'alignSelf']);

export function validateStyleValue(key, raw) {
  const def = STYLE_PROPS[key];
  if (!def) return null;
  const v = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim();
  if (v === '') return null;
  switch (def.kind) {
    case 'length':
      if (v === '0') return '0';
      if (def.auto && v === 'auto') return 'auto';
      if (def.size && /^size:/.test(v)) return TYPE_TOKENS.includes(v.slice(5)) ? v : null;
      if (def.space && /^space:/.test(v)) return SPACE_TOKENS.includes(v.slice(6)) ? v : null;
      if (/^(?:clamp|min|max|calc)\(/.test(v)) return validExpression(v) ? v : null;
      if (!LEN.test(v)) return null;
      if (!def.negative && v.startsWith('-')) return null;
      return v;
    case 'color':
      if (v === 'transparent' || HEX.test(v) || RGB.test(v)) return v;
      if (v.startsWith('palette:') && PALETTE_KEYS.includes(v.slice(8))) return v;
      return null;
    case 'enum':
      return def.values.includes(v) ? v : null;
    case 'preset':
      return Object.prototype.hasOwnProperty.call(def.map, v) ? v : null;
    case 'number': {
      if (!/^-?(?:\d+|\d*\.\d+)$/.test(v)) return null;
      const n = Number(v);
      return n >= def.min && n <= def.max ? v : null;
    }
    case 'int': {
      if (!/^\d+$/.test(v)) return null;
      const n = Number(v);
      return n >= def.min && n <= def.max ? n : null;
    }
    case 'image':
      return /^asset:[a-z0-9_]+$/i.test(v) || /^https:\/\/[^\s"'()\\]+$/i.test(v) ? v : null;
    default:
      return null;
  }
}

function cssValue(key, value, ctx) {
  const def = STYLE_PROPS[key];
  const v = validateStyleValue(key, value);
  if (v === null) return null;
  switch (def.kind) {
    case 'color': return String(v).startsWith('palette:') ? `var(--${v.slice(8)})` : v;
    case 'preset': return def.map[v];
    case 'image': {
      const url = String(v).startsWith('asset:') ? ctx?.asset?.(v) : v;
      return url ? `url("${String(url).replace(/["\\\n]/g, '')}")` : null;
    }
    default:
      if (key === 'fontFamily') return FONT_FAMILIES[v];
      if (def.kind === 'length' && String(v).startsWith('size:')) return `var(--step-${String(v).slice(5)})`;
      if (def.kind === 'length' && String(v).startsWith('space:')) return `var(--space-${String(v).slice(6)})`;
      if (key === 'span') return `span ${v}`;
      if (key === 'transitionDuration') return `all ${v}ms ease`;
      return String(v);
  }
}

function declarations(entries, ctx) {
  const out = [];
  for (const [k, raw] of entries) {
    if (STYLE_PROPS[k]?.special) continue;
    const val = cssValue(k, raw, ctx);
    if (val !== null && val !== undefined) out.push(`${STYLE_PROPS[k].css}:${val}`);
  }
  return out.join(';');
}

const MEDIA = { tablet: '@media (max-width:1024px)', mobile: '@media (max-width:640px)' };

/**
 * @param node   nœud { id, type, style, advanced }
 * @param ctx    { asset(value) → url | null, target(type) → sélecteur intérieur | '' }
 */
export function compileNodeCss(node, ctx = {}, { selector } = {}) {
  const sel = selector || `.n-${node.id}`;
  const target = ctx.target ? ctx.target(node.type) : (node.type === 'button' ? '.btn' : '');
  const rules = [];
  const emit = (selector, entries, wrapMedia) => {
    if (!entries.length) return;
    const d = declarations(entries, ctx);
    if (!d) return;
    rules.push(wrapMedia ? `${wrapMedia}{${selector}{${d}}}` : `${selector}{${d}}`);
  };
  const split = entries => {
    if (!target) return [entries, []];
    return [entries.filter(([k]) => WRAPPER_KEYS.has(k)), entries.filter(([k]) => !WRAPPER_KEYS.has(k))];
  };
  for (const state of ['desktop', 'tablet', 'mobile']) {
    const entries = Object.entries(node.style?.[state] || {});
    const [outer, inner] = split(entries);
    emit(sel, outer, MEDIA[state]);
    emit(`${sel} ${target}`, inner, MEDIA[state]);
  }
  const hover = Object.entries(node.style?.hover || {}).filter(([k]) => HOVER_PROPS.includes(k));
  emit(target ? `${sel} ${target}:hover` : `${sel}:hover`, hover);
  if (node.advanced?.css && !/[<>{}@\\]/.test(node.advanced.css)) rules.push(`${sel}{${node.advanced.css}}`);
  const reveal = node.style?.desktop?.reveal;
  if (reveal && reveal !== 'none' && STYLE_PROPS.reveal.values.includes(reveal)) rules.push(`@supports (animation-timeline: view()){@media (prefers-reduced-motion: no-preference){${sel}{animation:atelier-${reveal} both linear;animation-timeline:view();animation-range:entry 0% cover 30%}}}`);
  const hide = node.advanced?.hideOn || {};
  const hidden = ctx.canvas ? 'opacity:.3!important;outline:2px dashed #8a8a96;outline-offset:-2px' : 'display:none!important';
  if (hide.desktop) rules.push(`@media (min-width:1025px){${sel}{${hidden}}}`);
  if (hide.tablet) rules.push(`@media (min-width:641px) and (max-width:1024px){${sel}{${hidden}}}`);
  if (hide.mobile) rules.push(`@media (max-width:640px){${sel}{${hidden}}}`);
  return rules.join('\n');
}
