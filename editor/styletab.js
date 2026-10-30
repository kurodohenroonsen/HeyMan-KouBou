/*
 * Onglet Style : réglages par appareil (ordinateur, tablette, mobile) et état survol,
 * appliqués soit à l'élément, soit à son preset (mode « modifier le preset »).
 * Les longueurs acceptent les jetons d'échelle (size:xl, space:m) et les expressions sûres (clamp, min…).
 */
import { h, toast } from './dom.js';
import { state, root, page, commitRoot, commit, setView, emit, siteWithRoot } from './store.js';
import { checkNodeContrast, formatRatio } from '../core/contrast.js';
import { STYLE_PROPS, STYLE_GROUPS, HOVER_PROPS, PALETTE_KEYS, validateStyleValue } from '../core/style.js';
import { setStyle } from '../core/tree.js';
import { setStyleMany } from '../core/editing.js';
import { filterStyleKeys } from '../core/commands.js';
import { updatePageRoot } from '../core/site.js';
import { REGISTRY } from '../core/widgets.js';
import { TYPE_STEPS, SPACE_STEPS, TYPE_LABELS, SPACE_LABELS, typeSizes, spaceSizes, defaultTokens } from '../core/tokens.js';
import { effectivePreset, presetFromNode, setNodePreset, setPresetStyle, detachNode, setDefaultPreset, presetsForType, presetUsage } from '../core/presets.js';
import { imageControl } from './fields.js';
import { copyStyle, pasteStyle } from './actions.js';
import { log } from './log.js';
import { __, __n, N_, fmtNumber } from '../core/ui-i18n.js';
import { PALETTE_NAMES } from '../core/site.js';

const DEVICE_LABEL = { desktop: N_('Ordinateur'), tablet: N_('Tablette'), mobile: N_('Mobile') };
const devLabel = d => __(DEVICE_LABEL[d]);
/* Nom d'une couleur de palette : les noms par défaut (site.js) sont traduits, les noms donnés par la personne restent tels quels */
export const paletteName = (names, k) => {
  const n = names?.[k];
  if (!n) return k;
  if (n === PALETTE_NAMES[k]) return __(PALETTE_NAMES[k]);
  if (n === `Couleur ${k.slice(1)}`) return __('Couleur {n}', { n: k.slice(1) });
  return n;
};
const STRUCT_ONLY = { span: ['column'], gap: ['row', 'column'], alignItems: ['row', 'column'], justifyContent: ['column'], alignSelf: ['column', 'heading', 'text', 'button', 'image', 'spacer', 'divider', 'icon-list', 'quote', 'stats', 'social', 'video', 'accordion', 'gallery', 'form', 'card', 'icon-box', 'map', 'pricing'] };
const NO_TYPO = new Set(['spacer', 'image']);
const NO_FILL = new Set(['spacer']);
const openGroups = new Set(['Typographie', 'Disposition']);
let showPresetForm = false;
let searchQuery = '';
let allDevices = false;
const lastContrast = new Map();
const short = v => (typeof v === 'string' ? v.slice(0, 60) : v);

function applicable(type) {
  return Object.keys(STYLE_PROPS).filter(k => {
    const p = STYLE_PROPS[k];
    if (STRUCT_ONLY[k] && !STRUCT_ONLY[k].includes(type)) return false;
    if (p.group === 'Typographie' && NO_TYPO.has(type)) return false;
    if ((p.group === 'Fond' || p.group === 'Bordure') && NO_FILL.has(type)) return false;
    return true;
  });
}

const stateKey = () => (state.styleState === 'hover' ? 'hover' : state.device);

function cascade(style, key) {
  if (!style) return undefined;
  if (state.styleState === 'hover') return style.desktop?.[key];
  if (state.device === 'tablet') return style.desktop?.[key];
  if (state.device === 'mobile') return style.tablet?.[key] ?? style.desktop?.[key];
  return undefined;
}

const full = (style, key) => (state.styleState === 'hover' ? style?.hover?.[key] ?? style?.desktop?.[key] : style?.[state.device]?.[key] ?? cascade(style, key));

/* La cible des réglages : l'élément, plusieurs éléments, ou le preset qu'on modifie */
function targetFor(node, multi) {
  if (multi?.length > 1) {
    return {
      kind: 'multi', preset: null, style: node.style, count: multi.length, node,
      inherited: key => cascade(node.style, key),
      write: (st, key, v) => commitRoot(setStyleMany(root(), multi, st, key, v), { source: 'inspector-style' }),
      writeMany: (st, keys) => { let r = root(); for (const k of keys) r = setStyleMany(r, multi, st, k, ''); commitRoot(r, { source: 'inspector-style' }); },
      writeAsset: (site, st, key, v) => commit(siteWithRoot(site, setStyleMany(root(), multi, st, key, v)), { source: 'inspector-style' })
    };
  }
  const pid = effectivePreset(state.site, node);
  const preset = pid ? state.site.presets[pid] : null;
  if (preset && state.presetEdit === pid) {
    return {
      kind: 'preset', preset, style: preset.style,
      inherited: key => cascade(preset.style, key),
      write: (st, key, v) => commit(setPresetStyle(state.site, pid, st, key, v), { source: 'inspector-style' }),
      writeMany: (st, keys) => { let s = state.site; for (const k of keys) s = setPresetStyle(s, pid, st, k, ''); commit(s, { source: 'inspector-style' }); },
      writeAsset: (site, st, key, v) => commit(setPresetStyle(site, pid, st, key, v), { source: 'inspector-style' })
    };
  }
  return {
    kind: 'node', preset, style: node.style, node,
    inherited: key => {
      const own = cascade(node.style, key);
      if (own !== undefined) return own;
      const p = preset ? full(preset.style, key) : undefined;
      return p !== undefined ? __('{value} · preset', { value: p }) : undefined;
    },
    write: (st, key, v) => commitRoot(setStyle(root(), node.id, st, key, v), { source: 'inspector-style' }),
    writeMany: (st, keys) => { let r = root(); for (const k of keys) r = setStyle(r, node.id, st, k, ''); commitRoot(r, { source: 'inspector-style' }); },
    writeAsset: (site, st, key, v) => commit(siteWithRoot(site, setStyle(root(), node.id, st, key, v)), { source: 'inspector-style' })
  };
}

function write(T, key, value, input, dev) {
  const st = dev || stateKey();
  let v = typeof value === 'string' ? value.trim() : value;
  const def = STYLE_PROPS[key];
  const autoPx = def.kind === 'length' && /^-?(?:\d+|\d*\.\d+)$/.test(String(v)) && String(v) !== '0';
  if (autoPx) v = `${v}px`;
  const where = { key, state: st === 'hover' ? 'survol' : 'normal', device: st === 'hover' ? 'tous' : st, target: T.kind, preset: T.kind === 'preset' ? T.preset.id : undefined, count: T.count, id: T.node?.id };
  if (v !== '' && v !== null && validateStyleValue(key, v) === null) {
    input?.setAttribute('aria-invalid', 'true');
    log.warn('style.refused', __('Valeur refusée pour « {label} » : {value} (unité ou expression non autorisée)', { label: __(def.label), value: short(String(value)) }), { ...where, value: short(String(value)), kind: def.kind });
    toast(__('Valeur refusée pour « {label} » : {value}. Exemples : 24px, 1.5rem, 50%, auto, clamp(1rem, 3vw, 2rem).', { label: __(def.label), value }), 'error');
    return;
  }
  input?.removeAttribute('aria-invalid');
  try {
    T.write(st, key, v);
    if (state.readOnly) return;
    const label = __(def.label);
    const device = where.state === 'survol' ? __('survol') : devLabel(where.device);
    if (v === '' || v === null) log.debug('style.reset', __('« {label} » réinitialisé : valeur héritée ({device})', { label, device }), where);
    else log.debug('style.set', T.kind === 'preset' ? __('{label} = {value} ({device}, preset « {preset} »)', { label, value: short(String(v)), device, preset: T.preset.name })
      : T.kind === 'multi' ? __('{label} = {value} ({device}, {n} éléments)', { label, value: short(String(v)), device, n: T.count })
      : __('{label} = {value} ({device})', { label, value: short(String(v)), device }), { ...where, value: short(String(v)), autoPx: autoPx || undefined, token: /^(size|space):/.test(String(v)) || undefined, palette: String(v).startsWith('palette:') || undefined });
  } catch (e) { log.warn('style.set-fail', __('Réglage « {label} » non appliqué : {error}', { label: __(def.label), error: e.message }), { ...where, error: e }); toast(e.message, 'error'); }
}

const own = (T, key) => T.style?.[stateKey()]?.[key];

function labelRow(T, key, def) {
  const set = own(T, key) !== undefined;
  return h('label', { for: `sty-${key}` }, h('span', {}, __(def.label)),
    set ? h('button', { type: 'button', class: 'sp-reset', 'data-reset': key, title: __('Revenir à la valeur héritée'), 'aria-label': __('Réinitialiser {label}', { label: __(def.label) }), onclick: e => { e.preventDefault(); write(T, key, ''); } }, '↺') : null);
}

function inheritedFor(T, key, dev) {
  if (!dev) return T.inherited(key);
  if (dev === 'desktop') return undefined;
  const s = T.style || {};
  return dev === 'tablet' ? s.desktop?.[key] : s.tablet?.[key] ?? s.desktop?.[key];
}

function textInput(T, key, def, extra = {}, dev) {
  const current = dev ? T.style?.[dev]?.[key] : own(T, key);
  const inh = inheritedFor(T, key, dev);
  const input = h('input', { class: 'input', id: dev ? `sty-${key}-${dev}` : `sty-${key}`, type: 'text', 'data-style': key, 'data-device-col': dev || null, spellcheck: 'false', autocomplete: 'off',
    placeholder: inh !== undefined ? __('{value} (hérité)', { value: inh }) : (def.kind === 'length' ? (dev ? '—' : __('ex. 24px')) : ''), ...extra });
  input.value = current ?? '';
  let last = String(current ?? '');
  const commitInput = () => {
    if (!input.isConnected || input.value === last) return;
    last = input.value;
    write(T, key, input.value, input, dev);
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitInput(); } });
  input.addEventListener('change', commitInput);
  return input;
}

/* Liste des jetons d'échelle pour une longueur (taille de texte ou espacement) */
function tokenPicker(T, key) {
  const def = STYLE_PROPS[key];
  if (!def.size && !def.space) return null;
  const tokens = state.site.tokens || defaultTokens();
  const current = String(own(T, key) ?? '');
  const sizes = def.size ? typeSizes(tokens.type) : spaceSizes(tokens.space);
  const steps = def.size ? TYPE_STEPS : SPACE_STEPS;
  const labels = def.size ? TYPE_LABELS : SPACE_LABELS;
  const prefix = def.size ? 'size:' : 'space:';
  const sel = h('select', { class: 'control control--token', 'data-token-pick': key, 'aria-label': __('{label} : choisir dans l’échelle', { label: __(def.label) }), title: __('Choisir dans l’échelle du site') },
    h('option', { value: '' }, def.size ? __('Échelle…') : '⇕'),
    steps.map(k => h('option', { value: prefix + k, selected: current === prefix + k }, `${__(labels[k])} · ${Math.round(sizes[k].min)}–${Math.round(sizes[k].max)} px`)));
  sel.addEventListener('change', () => { if (sel.value) write(T, key, sel.value); });
  return sel;
}

function colorControl(T, key, def) {
  const current = own(T, key);
  const pal = state.site.theme.palette;
  const names = state.site.theme.paletteNames || {};
  const swatches = h('div', { class: 'swatches' },
    PALETTE_KEYS.filter(k => pal[k]).map(k => h('button', { type: 'button', class: 'swatch', 'data-swatch': k, title: names[k] ? paletteName(names, k) : __('Couleur {n}', { n: k.slice(1) }), 'aria-label': __('Couleur de palette : {name}', { name: paletteName(names, k) }), 'aria-pressed': String(current === `palette:${k}`), style: { background: pal[k] }, onclick: () => write(T, key, `palette:${k}`) })),
    h('button', { type: 'button', class: 'swatch', 'data-swatch': 'transparent', title: __('Transparent'), 'aria-label': __('Transparent'), 'aria-pressed': String(current === 'transparent'), style: { background: 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/8px 8px' }, onclick: () => write(T, key, 'transparent') }));
  const picker = h('input', { type: 'color', class: 'color-input', 'aria-label': __('{label} : couleur libre', { label: __(def.label) }), value: /^#[0-9a-f]{6}$/i.test(current || '') ? current : '#000000' });
  picker.addEventListener('change', () => write(T, key, picker.value));
  const inh = T.inherited(key);
  return h('div', { class: 'sp sp--wide' + (current !== undefined ? ' is-set' : ''), 'data-style-wrap': key }, labelRow(T, key, def),
    h('div', { class: 'sp-row' }, picker, textInput(T, key, def, { placeholder: inh ? __('{value} (hérité)', { value: inh }) : __('#hex, rgb(…) ou palette') })), swatches,
    (key === 'color' || key === 'background') && T.kind !== 'preset' && T.node ? contrastBadge(T.node) : null);
}

/* Contraste réel du texte de l'élément sur son fond (WCAG AA) */
function contrastBadge(node) {
  let r;
  try { r = checkNodeContrast(state.site, page(), node.id, root()); } catch (e) { log.warn('style.contrast-error', __('Contraste non calculé : {error}', { error: e.message }), { id: node.id, error: e }); r = null; }
  if (!r || r.skipped) return null;
  /* Signalé quand le résultat change (l'onglet est redessiné souvent) */
  const sig = r.unknown ? 'unknown' : `${r.ok}|${formatRatio(r.ratio)}`;
  const prev = lastContrast.get(node.id);
  if (prev !== sig) {
    lastContrast.set(node.id, sig);
    if (r.unknown) log.debug('style.contrast-unknown', __('Contraste non mesurable : fond en image'), { id: node.id, required: r.required });
    else if (!r.ok) log.warn('style.contrast-low', r.large ? __('Contraste insuffisant : {ratio} pour {required}:1 requis (grand texte)', { ratio: formatRatio(r.ratio), required: fmtNumber(r.required) }) : __('Contraste insuffisant : {ratio} pour {required}:1 requis', { ratio: formatRatio(r.ratio), required: fmtNumber(r.required) }), { id: node.id, type: node.type, ratio: Math.round(r.ratio * 100) / 100, required: r.required, large: r.large || undefined, fg: r.fg, bg: r.bg });
    /* Debug quand il redevient suffisant après un contraste insuffisant ; trace sinon (premier affichage) */
    else log.add(prev && prev.startsWith('false') ? 'debug' : 'trace', 'style.contrast-ok', __('Contraste suffisant : {ratio}', { ratio: formatRatio(r.ratio) }), { id: node.id, ratio: Math.round(r.ratio * 100) / 100, required: r.required });
  }
  const req = r.large ? __('{required}:1 requis (grand texte)', { required: fmtNumber(r.required) }) : __('{required}:1 requis', { required: fmtNumber(r.required) });
  if (r.unknown) return h('p', { class: 'contrast-badge is-unknown', 'data-contrast': '' }, __('Fond en image : vérifiez le contraste à l’œil ({req}).', { req }));
  return h('p', { class: `contrast-badge ${r.ok ? 'is-ok' : 'is-bad'}`, 'data-contrast': '', title: __('Texte {fg} sur fond {bg}', { fg: r.fg, bg: r.bg }) },
    h('span', { class: 'contrast-badge__sw', style: { background: r.bg, color: r.fg }, 'aria-hidden': 'true' }, 'Aa'),
    __('Contraste {ratio} {mark} — {req}', { ratio: formatRatio(r.ratio), mark: r.ok ? '✓' : '✗', req }));
}

const LABELS = {
  textAlign: { left: N_('Gauche'), center: N_('Centré'), right: N_('Droite'), justify: N_('Justifié') },
  textTransform: { none: N_('Normale'), uppercase: N_('MAJUSCULES'), lowercase: N_('minuscules'), capitalize: N_('Première Lettre') },
  fontStyle: { normal: N_('Normal'), italic: N_('Italique') },
  fontFamily: { heading: N_('Police des titres'), body: N_('Police du texte'), system: N_('Système'), serif: N_('Avec empattement'), mono: N_('Chasse fixe') },
  fontWeight: { 300: N_('300 – fin'), 400: N_('400 – normal'), 500: N_('500'), 600: N_('600 – demi-gras'), 700: N_('700 – gras'), 800: N_('800'), 900: N_('900 – noir') },
  backgroundSize: { cover: N_('Couvrir'), contain: N_('Contenir'), auto: N_('Taille réelle') },
  backgroundPosition: { center: N_('Centre'), top: N_('Haut'), bottom: N_('Bas'), left: N_('Gauche'), right: N_('Droite') },
  borderStyle: { none: N_('Aucune'), solid: N_('Pleine'), dashed: N_('Tirets'), dotted: N_('Pointillés') },
  boxShadow: { none: N_('Aucune'), sm: N_('Légère'), md: N_('Moyenne'), lg: N_('Forte') },
  transform: { none: N_('Aucune'), lift: N_('Soulever'), grow: N_('Agrandir'), shrink: N_('Réduire') },
  alignItems: { start: N_('Début'), center: N_('Centre'), end: N_('Fin'), stretch: N_('Étirer') },
  alignSelf: { start: N_('Début'), center: N_('Centre'), end: N_('Fin'), stretch: N_('Étirer') },
  justifyContent: { start: N_('Début'), center: N_('Centre'), end: N_('Fin'), 'space-between': N_('Réparti') }
};

function control(T, key) {
  const def = STYLE_PROPS[key];
  const current = own(T, key);
  const inh = T.inherited(key);
  const cls = 'sp' + (current !== undefined ? ' is-set' : inh !== undefined ? ' is-inherited' : '');
  if (def.kind === 'color') return colorControl(T, key, def);
  if (def.kind === 'enum' || def.kind === 'preset') {
    const values = def.kind === 'enum' ? def.values : Object.keys(def.map);
    const sel = h('select', { class: 'control', id: `sty-${key}`, 'data-style': key },
      h('option', { value: '' }, inh !== undefined ? __('{value} (hérité)', { value: __(LABELS[key]?.[String(inh).replace(__('{value} · preset', { value: '' }), '')]) || inh }) : '—'),
      values.map(v => h('option', { value: v, selected: v === current }, __(LABELS[key]?.[v]) || v)));
    sel.addEventListener('change', () => write(T, key, sel.value));
    return h('div', { class: cls, 'data-style-wrap': key }, labelRow(T, key, def), sel);
  }
  if (def.kind === 'image') {
    const box = imageControl(current, v => write(T, key, v), `style-${key}`, (site, value) => {
      try { T.writeAsset(site, stateKey(), key, value); } catch (e) { toast(e.message, 'error'); }
    });
    return h('div', { class: cls + ' sp--wide', 'data-style-wrap': key }, labelRow(T, key, def), box);
  }
  const extra = def.kind === 'int' || def.kind === 'number' ? { inputmode: 'decimal' } : {};
  if (allDevices && state.styleState !== 'hover' && ['length', 'int', 'number'].includes(def.kind)) {
    const anySet = ['desktop', 'tablet', 'mobile'].some(d => T.style?.[d]?.[key] !== undefined);
    return h('div', { class: 'sp sp--wide' + (anySet ? ' is-set' : ''), 'data-style-wrap': key }, h('label', {}, h('span', {}, __(def.label))),
      h('div', { class: 'dev3' }, ['desktop', 'tablet', 'mobile'].map(d => h('label', { class: 'dev3__cell' },
        h('span', { class: 'dev3__ico', title: devLabel(d), 'aria-hidden': 'true' }, { desktop: '🖥', tablet: '▭', mobile: '▯' }[d]),
        textInput(T, key, def, { ...extra, 'aria-label': `${__(def.label)} – ${devLabel(d)}` }, d)))));
  }
  const picker = def.kind === 'length' ? tokenPicker(T, key) : null;
  return h('div', { class: cls + (picker && def.size ? ' sp--wide' : ''), 'data-style-wrap': key }, labelRow(T, key, def),
    picker ? h('div', { class: 'sp-row' }, textInput(T, key, def, extra), picker) : textInput(T, key, def, extra));
}

const BOX = [['Top', N_('Haut')], ['Right', N_('Droite')], ['Bottom', N_('Bas')], ['Left', N_('Gauche')]];

function boxGroup(T, prefix, title) {
  const keys = BOX.map(([s]) => prefix + s);
  const anySet = keys.some(k => own(T, k) !== undefined);
  return h('div', { class: 'sp sp--wide' + (anySet ? ' is-set' : ''), 'data-style-keys': keys.join(' ') },
    h('label', {}, h('span', {}, title), anySet ? h('button', { type: 'button', class: 'sp-reset', title: __('Tout réinitialiser'), onclick: e => {
      e.preventDefault();
      try { T.writeMany(stateKey(), keys); log.debug('style.reset', __('{title} réinitialisées ({device})', { title, device: stateKey() === 'hover' ? __('survol') : devLabel(stateKey()) }), { keys, device: stateKey(), target: T.kind }); } catch (err) { log.warn('style.set-fail', __('{title} : réinitialisation impossible : {error}', { title, error: err.message }), { keys, error: err }); toast(err.message, 'error'); }
    } }, '↺') : null),
    h('div', { class: 'box4' }, keys.map(k => h('div', { class: 'box4__cell' },
      textInput(T, k, STYLE_PROPS[k], { 'aria-label': __(STYLE_PROPS[k].label), placeholder: T.inherited(k) ?? '—' }),
      tokenPicker(T, k)))),
    h('div', { class: 'box4-labels', 'aria-hidden': 'true' }, BOX.map(([, l]) => h('span', {}, __(l)))));
}

/* Barre des presets : choisir, créer, modifier, détacher, définir par défaut */
function presetBar(node) {
  const s = state.site;
  const pid = effectivePreset(s, node);
  const preset = pid ? s.presets[pid] : null;
  const typeLabel = __(REGISTRY[node.type]?.label) || node.type;
  const list = presetsForType(s, node.type);
  const def = s.defaultPresets?.[node.type] && s.presets[s.defaultPresets[node.type]];
  const apply = (fn, what) => {
    try { commit(fn(state.site), { source: 'inspector-style' }); return true; }
    catch (e) { log.warn('style.preset-refused', __('Preset : {error}', { error: e.message }), { what, id: node.id, type: node.type, error: e }); toast(e.message, 'error'); return false; }
  };

  const sel = h('select', { class: 'control', 'data-preset-select': '', 'aria-label': __('Preset de style') },
    h('option', { value: '', selected: !node.preset }, def ? __('Par défaut : {name}', { name: def.name }) : __('Aucun preset')),
    def ? h('option', { value: '-', selected: node.preset === '-' }, __('Aucun preset')) : null,
    list.map(p => h('option', { value: p.id, selected: node.preset === p.id }, p.name)));
  sel.addEventListener('change', () => {
    state.presetEdit = null;
    if (apply(x => setNodePreset(x, state.editTarget || state.pageId, node.id, sel.value), 'apply')) log.info('style.preset-apply', sel.value && sel.value !== '-' ? __('Preset « {name} » appliqué', { name: s.presets[sel.value]?.name }) : sel.value === '-' ? __('Aucun preset (même pas celui par défaut)') : __('Preset retiré : celui par défaut s’applique s’il existe'), { id: node.id, type: node.type, preset: sel.value || null });
  });

  const name = h('input', { class: 'input', type: 'text', 'data-preset-name': '', placeholder: __('ex. {type} principal', { type: typeLabel }), 'aria-label': __('Nom du nouveau preset') });
  const create = () => {
    try {
      const r = presetFromNode(state.site, state.editTarget || state.pageId, node.id, name.value);
      showPresetForm = false;
      commit(r.site, { source: 'inspector-style' });
      log.info('style.preset-create', __('Preset « {name} » créé à partir de l’élément', { name: r.site.presets[r.id].name }), { preset: r.id, type: node.type, id: node.id, props: Object.values(r.site.presets[r.id].style || {}).reduce((n, o) => n + Object.keys(o || {}).length, 0) });
      toast(__('Preset « {name} » créé. Appliquez-le à d’autres « {type} » depuis cette liste.', { name: r.site.presets[r.id].name, type: typeLabel }));
    } catch (e) { log.warn('style.preset-refused', __('Preset non créé : {error}', { error: e.message }), { what: 'create', id: node.id, type: node.type, chars: name.value.length, error: e }); toast(e.message, 'error'); name.focus(); }
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); create(); } if (e.key === 'Escape') { log.debug('style.preset-form', __('Création de preset abandonnée (Échap)'), { open: false }); showPresetForm = false; emit('styleState'); } });

  const editing = preset && state.presetEdit === pid;
  const defBox = preset ? h('input', { type: 'checkbox', 'data-preset-default': '', checked: s.defaultPresets?.[node.type] === pid }) : null;
  defBox?.addEventListener('change', () => { if (apply(x => setDefaultPreset(x, node.type, defBox.checked ? pid : null), 'default')) log.info('style.preset-default', defBox.checked ? __('Preset « {name} » par défaut pour les nouveaux « {type} »', { name: preset.name, type: typeLabel }) : __('Plus de preset par défaut pour les « {type} »', { type: typeLabel }), { type: node.type, preset: defBox.checked ? pid : null }); });

  return h('div', { class: 'preset-bar' + (editing ? ' is-editing' : '') },
    h('div', { class: 'sp-row' }, sel,
      h('button', { type: 'button', class: 'btn btn--small', 'data-preset-new': '', title: __('Enregistrer le style de cet élément comme preset'), onclick: () => { showPresetForm = !showPresetForm; log.debug('style.preset-form', showPresetForm ? __('Formulaire « nouveau preset » ouvert') : __('Formulaire « nouveau preset » fermé'), { open: showPresetForm, type: node.type }); emit('styleState'); } }, __('+ Preset'))),
    showPresetForm ? h('div', { class: 'sp-row' }, name, h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-preset-create': '', onclick: create }, __('Créer'))) : null,
    preset ? h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn btn--small' + (editing ? ' is-on' : ''), 'data-preset-edit': '', 'aria-pressed': String(!!editing), onclick: () => { state.presetEdit = editing ? null : pid; log.info('style.preset-edit', editing ? __('Fin de la modification du preset « {name} »', { name: preset.name }) : __n(presetUsage(s)[pid] || 0, 'Modification du preset « {name} » : les réglages s’appliquent à {n} élément', 'Modification du preset « {name} » : les réglages s’appliquent à {n} éléments', { name: preset.name }), { preset: pid, on: !editing, uses: presetUsage(s)[pid] || 0 }); emit('styleState'); } }, editing ? __('Terminer') : __('Modifier le preset')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-preset-detach': '', title: __('Garder l’apparence mais ne plus suivre le preset'), onclick: () => { state.presetEdit = null; if (apply(x => detachNode(x, state.editTarget || state.pageId, node.id), 'detach')) log.info('style.preset-detach', __('Élément détaché du preset « {name} » : apparence gardée', { name: preset.name }), { id: node.id, preset: pid }); } }, __('Détacher')),
      h('label', { class: 'check check--sm' }, defBox, __('Par défaut pour les « {type} »', { type: typeLabel }))) : null);
}

/* Filtre les réglages affichés (sans reconstruire l'onglet, pour garder le focus) */
function applyFilter(body) {
  const keys = new Set(filterStyleKeys(searchQuery));
  const q = searchQuery.trim();
  body.querySelectorAll('.style-group').forEach(g => {
    let visible = 0;
    g.querySelectorAll('[data-style-wrap], [data-style-keys]').forEach(el => {
      const ks = el.dataset.styleWrap ? [el.dataset.styleWrap] : el.dataset.styleKeys.split(' ');
      const show = !q || ks.some(k => keys.has(k));
      el.hidden = !show;
      if (show) visible++;
    });
    g.hidden = !visible;
    if (q && visible) g.open = true;
  });
  const empty = body.querySelector('.style-empty');
  if (empty) empty.hidden = !q || !!body.querySelector('.style-group:not([hidden])');
}

/* Ouvre l'onglet Style sur un réglage (barre de commandes) */
export function focusStyleField(key) {
  const el = document.querySelector(`#inspector [data-style="${key}"]:not([data-device-col]), #inspector [data-style="${key}"]`);
  if (!el) { log.debug('style.focus-missing', __('Réglage « {key} » absent de l’onglet Style pour cet élément', { key }), { key, selected: state.selected || null }); return false; }
  log.debug('style.focus', __('Réglage « {key} » mis en avant dans l’onglet Style', { key }), { key });
  el.closest('details')?.setAttribute('open', '');
  el.scrollIntoView({ block: 'center' });
  el.focus();
  return true;
}

export function styleTab(node, multi) {
  if (showPresetForm && state.lastStyleNode !== node.id) showPresetForm = false;
  state.lastStyleNode = node.id;
  const pid = effectivePreset(state.site, node);
  if (state.presetEdit && state.presetEdit !== pid) state.presetEdit = null;
  const T = targetFor(node, multi);
  const hoverMode = state.styleState === 'hover';
  const keys = applicable(node.type).filter(k => !hoverMode || HOVER_PROPS.includes(k)).filter(k => T.kind !== 'preset' || k !== 'span');
  const st = stateKey();
  const usage = T.kind === 'preset' ? presetUsage(state.site)[T.preset.id] : 0;
  const head = h('div', { class: 'style-head' + (T.kind === 'preset' ? ' is-preset' : '') },
    node.type !== 'page' && T.kind !== 'multi' ? presetBar(node) : null,
    T.kind === 'multi' ? h('p', { class: 'preset-note' }, __('Réglages appliqués aux {n} éléments sélectionnés (valeurs affichées : {type} actif).', { n: T.count, type: __(REGISTRY[node.type]?.label) || node.type })) : null,
    T.kind === 'preset'
      ? h('p', { class: 'preset-note' }, __('✎ Vous modifiez le preset'), ' ', h('strong', {}, `« ${T.preset.name} »`), __n(usage, ' : {n} élément suivra ces réglages.', ' : {n} éléments suivront ces réglages.'))
      : null,
    h('p', { class: 'hint' }, __('Réglages pour :'), ' ', h('strong', {}, hoverMode ? __('Survol (tous appareils)') : devLabel(state.device)),
      hoverMode ? '' : ' ', hoverMode ? '' : state.device === 'desktop' ? __('— s’appliquent aussi à la tablette et au mobile, sauf réglage contraire.') : __('— les valeurs non réglées sont héritées de l’appareil plus grand.')),
    h('div', { class: 'state-switch', role: 'group', 'aria-label': __('Appareil réglé') },
      ['desktop', 'tablet', 'mobile'].map(d => h('button', { type: 'button', 'aria-pressed': String(!hoverMode && state.device === d), onclick: () => { log.debug('style.device', __('Onglet Style : réglages pour {device}', { device: devLabel(d) }), { device: d, from: state.device }); state.styleState = 'normal'; setView({ device: d }); } }, devLabel(d)))),
    h('div', { class: 'state-switch', role: 'group', 'aria-label': __('État') },
      h('button', { type: 'button', 'data-style-state': 'normal', 'aria-pressed': String(!hoverMode), onclick: () => { log.debug('style.state', __('Onglet Style : état normal'), { state: 'normal' }); state.styleState = 'normal'; emit('styleState'); } }, __('Normal')),
      h('button', { type: 'button', 'data-style-state': 'hover', 'aria-pressed': String(hoverMode), onclick: () => { log.debug('style.state', __('Onglet Style : état survol (réglages communs à tous les appareils)'), { state: 'hover' }); state.styleState = 'hover'; emit('styleState'); } }, __('Survol')),
      h('button', { type: 'button', 'data-style-copy': '', title: __('Copier tout le style de cet élément'), onclick: copyStyle }, __('Copier')),
      h('button', { type: 'button', 'data-style-paste': '', title: __('Coller le style copié'), disabled: !state.styleClipboard, onclick: pasteStyle }, __('Coller'))),
    h('div', { class: 'sp-row style-tools' },
      h('input', { class: 'input input--sm', type: 'search', 'data-style-search': '', value: searchQuery, placeholder: __('Chercher un réglage (marge, couleur…)'), 'aria-label': __('Chercher un réglage'), oninput: e => { searchQuery = e.target.value; applyFilter(e.target.closest('.insp-body')); log.trace('style.search', __('Recherche d’un réglage'), { q: searchQuery.slice(0, 30), shown: filterStyleKeys(searchQuery).length }); } }),
      h('button', { type: 'button', class: 'btn btn--small' + (allDevices ? ' is-on' : ''), 'data-style-all-devices': '', 'aria-pressed': String(allDevices), title: __('Voir et régler ordinateur, tablette et mobile côte à côte'), onclick: () => { allDevices = !allDevices; log.debug('style.all-devices', allDevices ? __('Vue « trois appareils côte à côte »') : __('Vue d’un seul appareil'), { on: allDevices }); emit('styleState'); } }, '🖥▭▯')));

  const groups = STYLE_GROUPS.map(g => {
    const gKeys = keys.filter(k => STYLE_PROPS[k].group === g);
    if (!gKeys.length) return null;
    const count = gKeys.filter(k => T.style?.[st]?.[k] !== undefined).length;
    const det = h('details', { class: 'style-group', open: openGroups.has(g) || count > 0 || (hoverMode && g !== 'Dimensions') },
      h('summary', {}, __(g), count ? h('span', { class: 'count' }, __n(count, '{n} réglé', '{n} réglés')) : null));
    det.firstChild.addEventListener('click', () => { if (det.open) openGroups.delete(g); else openGroups.add(g); });
    const grid = h('div', { class: 'style-grid' });
    if (g === 'Espacement') {
      if (gKeys.includes('marginTop')) grid.append(boxGroup(T, 'margin', __('Marges extérieures')));
      if (gKeys.includes('paddingTop')) grid.append(boxGroup(T, 'padding', __('Marges intérieures')));
    } else gKeys.forEach(k => grid.append(control(T, k)));
    det.append(grid);
    return det;
  });
  const empty = h('p', { class: 'hint style-empty', hidden: true }, __('Aucun réglage ne correspond à cette recherche.'));
  if (searchQuery.trim()) queueMicrotask(() => { const b = head.closest('.insp-body'); if (b) applyFilter(b); });
  return [head, ...groups.filter(Boolean), empty];
}
