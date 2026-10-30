/*
 * Jetons de design : échelles fluides de tailles de texte et d'espacements (méthode Utopia).
 * Une valeur fluide passe de sa taille « mobile » (à minVw) à sa taille « grand écran » (à maxVw)
 * sans palier : clamp(min, a + b vw, max).
 */
import { __, N_ } from './ui-i18n.js';

export const TYPE_STEPS = ['sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
const TYPE_POWER = { sm: -1, base: 0, lg: 1, xl: 2, '2xl': 3, '3xl': 4, '4xl': 5 };
export const SPACE_STEPS = ['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
const SPACE_MULT = { '3xs': 0.25, '2xs': 0.5, xs: 0.75, s: 1, m: 1.5, l: 2, xl: 3, '2xl': 4, '3xl': 6 };

export const TYPE_LABELS = { sm: N_('Petit'), base: N_('Texte'), lg: N_('Titre 4'), xl: N_('Titre 3'), '2xl': N_('Accroche'), '3xl': N_('Titre 2'), '4xl': N_('Titre 1') };
export const SPACE_LABELS = { '3xs': N_('Minuscule'), '2xs': N_('Très petit'), xs: N_('Petit'), s: N_('Normal'), m: N_('Moyen'), l: N_('Grand'), xl: N_('Très grand'), '2xl': N_('Énorme'), '3xl': N_('Section') };

export function defaultTokens() {
  return {
    type: { minSize: 16, maxSize: 18, minRatio: 1.2, maxRatio: 1.25, minVw: 390, maxVw: 1280 },
    space: { minSize: 16, maxSize: 20 }
  };
}

const r4 = n => Number(n.toFixed(4));
const rem = px => `${r4(px / 16)}rem`;

export function fluid(minPx, maxPx, minVw = 390, maxVw = 1280) {
  if (Math.abs(minPx - maxPx) < 0.005) return rem(minPx);
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const intercept = minPx - slope * minVw;
  const lo = Math.min(minPx, maxPx);
  const hi = Math.max(minPx, maxPx);
  const sign = slope < 0 ? '-' : '+';
  return `clamp(${rem(lo)}, ${rem(intercept)} ${sign} ${r4(Math.abs(slope) * 100)}vw, ${rem(hi)})`;
}

/* Tailles en px aux deux extrémités, pour l'aperçu dans l'éditeur */
export function typeSizes(t) {
  return Object.fromEntries(TYPE_STEPS.map(k => [k, {
    min: t.minSize * t.minRatio ** TYPE_POWER[k],
    max: t.maxSize * t.maxRatio ** TYPE_POWER[k]
  }]));
}

export function typeScale(t) {
  const sizes = typeSizes(t);
  return Object.fromEntries(TYPE_STEPS.map(k => [k, fluid(sizes[k].min, sizes[k].max, t.minVw, t.maxVw)]));
}

export function spaceSizes(s) {
  return Object.fromEntries(SPACE_STEPS.map(k => [k, { min: s.minSize * SPACE_MULT[k], max: s.maxSize * SPACE_MULT[k] }]));
}

export function spaceScale(s, vw = { minVw: 390, maxVw: 1280 }) {
  const sizes = spaceSizes(s);
  return Object.fromEntries(SPACE_STEPS.map(k => [k, fluid(sizes[k].min, sizes[k].max, vw.minVw, vw.maxVw)]));
}

export function tokensCss(tokens = defaultTokens()) {
  const t = { ...defaultTokens().type, ...(tokens.type || {}) };
  const s = { ...defaultTokens().space, ...(tokens.space || {}) };
  const ts = typeScale(t);
  const ss = spaceScale(s, t);
  return [...TYPE_STEPS.map(k => `--step-${k}:${ts[k]}`), ...SPACE_STEPS.map(k => `--space-${k}:${ss[k]}`)].join(';');
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function num(v, what) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(__('Valeur numérique attendue pour {what}.', { what }));
  return n;
}

export function setTypeTokens(site, patch) {
  const s = structuredClone(site);
  s.tokens ||= defaultTokens();
  const t = { ...defaultTokens().type, ...s.tokens.type };
  if ('minSize' in patch) t.minSize = clamp(num(patch.minSize, __('la taille mobile')), 12, 24);
  if ('maxSize' in patch) t.maxSize = clamp(num(patch.maxSize, __('la taille grand écran')), 12, 28);
  if ('minRatio' in patch) t.minRatio = clamp(num(patch.minRatio, __('le ratio mobile')), 1, 1.618);
  if ('maxRatio' in patch) t.maxRatio = clamp(num(patch.maxRatio, __('le ratio grand écran')), 1, 1.618);
  s.tokens.type = t;
  return s;
}

export function setSpaceTokens(site, patch) {
  const s = structuredClone(site);
  s.tokens ||= defaultTokens();
  const sp = { ...defaultTokens().space, ...s.tokens.space };
  if ('minSize' in patch) sp.minSize = clamp(num(patch.minSize, __('l’espacement mobile')), 8, 32);
  if ('maxSize' in patch) sp.maxSize = clamp(num(patch.maxSize, __('l’espacement grand écran')), 8, 40);
  s.tokens.space = sp;
  return s;
}
