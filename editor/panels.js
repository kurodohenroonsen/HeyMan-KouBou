/* Panneaux de gauche : Site (styles globaux, en-tête, pied de page), Pages, Modèles. */
import { h, toast } from './dom.js';
import { state, commit, setView } from './store.js';
import { setPalette, setTheme, setHeader, setFooterText, setSiteMeta, LANG_LABELS, addPaletteColor, removePaletteColor, setPaletteName } from '../core/site.js';
import { PALETTE_KEYS, BASE_PALETTE } from '../core/style.js';
import { TYPE_STEPS, TYPE_LABELS, SPACE_STEPS, SPACE_LABELS, typeSizes, spaceSizes, setTypeTokens, setSpaceTokens } from '../core/tokens.js';
import { colorUsages, replaceColor } from '../core/colors.js';
import { palettePairs, formatRatio } from '../core/contrast.js';
import { presetUsage, renamePreset, deletePreset, duplicatePreset } from '../core/presets.js';
import { REGISTRY } from '../core/widgets.js';
import { customizeHeader, customizeFooter, resetLayout } from '../core/layout.js';
import { setEditTarget } from './store.js';
import { FONTS } from '../core/theme.js';
import { imageControl } from './fields.js';
import { pagesPanel } from './pages.js';
import { templatesPanel } from './templates.js';
import { collectionsPanel } from './collections-ui.js';
import { log } from './log.js';
import { openLogoPalette } from './smart-ui.js';
import { paletteName } from './styletab.js';
import { __, __n, __c } from '../core/ui-i18n.js';

/* `what` : nom court du réglage, pour le journal en cas de refus */
function apply(fn, key, source = 'panel', what = key || 'site') {
  try { return commit(fn(state.site), { key, source }) !== false; } catch (e) {
    log.warn('settings.refused', __('Réglage refusé : {error}', { error: e.message }), { setting: what, error: e });
    toast(e.message, 'error');
    return false;
  }
}

const r1 = n => Math.round(n);

function refreshPairs() {
  const ul = document.querySelector('[data-pairs]');
  if (!ul) return;
  const pal = state.site.theme.palette;
  for (const p of palettePairs(pal)) {
    const li = ul.querySelector(`[data-pair="${p.id}"]`);
    if (!li) continue;
    li.className = `pair ${p.ok ? 'is-ok' : 'is-bad'}`;
    li.querySelector('strong').textContent = `${formatRatio(p.ratio)} ${p.ok ? '✓' : '✗'}`;
    const sw = li.querySelector('.contrast-badge__sw');
    sw.style.background = pal[p.bg.slice(8)];
    sw.style.color = pal[p.fg.slice(8)];
  }
}

function paletteSection(s) {
  const t = s.theme;
  const names = t.paletteNames || {};
  const rows = PALETTE_KEYS.filter(k => t.palette[k]).map(k => {
    const shown = paletteName(names, k);
    const input = h('input', { type: 'color', value: t.palette[k], 'data-palette': k, 'aria-label': __('Couleur {name}', { name: shown }) });
    input.addEventListener('input', () => { apply(x => setPalette(x, k, input.value), `palette-${k}`); refreshPairs(); log.trace('settings.color', __('Couleur en cours de réglage'), { key: k, value: input.value }); });
    input.addEventListener('change', () => {
      const bad = palettePairs(state.site.theme.palette).filter(p => !p.ok && (p.bg.endsWith(`:${k}`) || p.fg.endsWith(`:${k}`)));
      log.info('settings.color', __('Couleur « {name} » : {value}', { name: shown, value: input.value }), { key: k, value: input.value, lowContrast: bad.length ? bad.map(p => `${p.label} ${formatRatio(p.ratio)}`) : undefined });
    });
    const name = h('input', { class: 'input input--sm', type: 'text', value: shown, 'data-palette-name': k, 'aria-label': __('Nom de la couleur {key}', { key: k }) });
    /* Nom à jour (Entrée puis « change » l'enregistraient deux fois : le panneau ne se redessine pas) */
    /* Le nom par défaut s'affiche traduit : le laisser tel quel ne le renomme pas */
    const saveName = () => { const cur = state.site.theme.paletteNames?.[k] || ''; if (name.isConnected && name.value.trim() !== cur && name.value.trim() !== paletteName({ [k]: cur }, k) && apply(x => setPaletteName(x, k, name.value), null, 'panel', 'color-name')) log.info('settings.color-name', __('Couleur {key} renommée : « {name} »', { key: k, name: name.value.trim().slice(0, 40) }), { key: k, name: name.value.trim().slice(0, 40) }); };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } });
    name.addEventListener('change', saveName);
    const del = BASE_PALETTE.includes(k) ? null : h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-palette-delete': k, 'aria-label': __('Supprimer {name}', { name: shown }), title: __('Supprimer cette couleur'), onclick: () => { if (apply(x => removePaletteColor(x, k), null, 'site', 'color-remove')) log.info('settings.color-remove', __('Couleur « {name} » supprimée de la palette', { name: shown }), { key: k, value: t.palette[k] }); } }, '✕');
    return h('div', { class: 'pal-row' }, input, name, h('code', { class: 'pal-key' }, k), del);
  });
  const add = h('button', { type: 'button', class: 'btn btn--small', id: 'addColorBtn', disabled: PALETTE_KEYS.every(k => t.palette[k]), onclick: () => {
    const before = new Set(Object.keys(state.site.theme.palette).filter(k => state.site.theme.palette[k]));
    if (apply(x => addPaletteColor(x, '#7c3aed').site, null, 'site', 'color-add')) {
      const k = PALETTE_KEYS.find(x => state.site.theme.palette[x] && !before.has(x));
      log.info('settings.color-add', __('Couleur ajoutée à la palette ({key})', { key: k }), { key: k, value: '#7c3aed', colors: before.size + 1 });
    }
  } }, __('+ Couleur'));

  const uses = colorUsages(s);
  const usage = uses.length ? h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Couleurs hors palette ({n})', { n: uses.length })),
    h('p', { class: 'hint' }, __('Ces couleurs sont figées dans des éléments : elles ne suivront pas un changement de palette. Remplacez-les en un clic.')),
    h('ul', { class: 'usage-list' }, uses.slice(0, 12).map(u => {
      const sel = h('select', { class: 'control control--sm', 'data-color-replace': '', 'aria-label': __('Remplacer {color}', { color: u.value }) },
        h('option', { value: '' }, __('Remplacer par…')),
        PALETTE_KEYS.filter(k => t.palette[k]).map(k => h('option', { value: `palette:${k}` }, paletteName(names, k))));
      sel.addEventListener('change', () => { if (sel.value && apply(x => replaceColor(x, u.value, sel.value), null, 'site', 'color-replace')) { log.info('settings.color-replace', __n(u.count, '{from} remplacée par {to} partout ({n} réglage)', '{from} remplacée par {to} partout ({n} réglages)', { from: u.value, to: sel.value }), { from: u.value, to: sel.value, count: u.count }); toast(__n(u.count, '{color} remplacée partout ({n} réglage).', '{color} remplacée partout ({n} réglages).', { color: u.value })); } });
      return h('li', { class: 'usage', 'data-color-usage': u.value }, h('span', { class: 'usage__sw', style: { background: u.value } }), h('code', {}, u.value), h('span', { class: 'count' }, `×${u.count}`), sel);
    }))) : null;

  const pairs = h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Contrastes (WCAG AA : {ratio} pour le texte)', { ratio: formatRatio(4.5) })),
    h('ul', { class: 'pair-list', 'data-pairs': '' }, palettePairs(t.palette).map(p => h('li', { class: `pair ${p.ok ? 'is-ok' : 'is-bad'}`, 'data-pair': p.id },
      h('span', { class: 'contrast-badge__sw', style: { background: t.palette[p.bg.slice(8)], color: t.palette[p.fg.slice(8)] }, 'aria-hidden': 'true' }, 'Aa'),
      h('span', {}, __(p.label)), h('strong', {}, `${formatRatio(p.ratio)} ${p.ok ? '✓' : '✗'}`)))));
  return [h('h3', {}, __('Palette')),
    h('p', { class: 'hint' }, __('Ces couleurs sont proposées partout dans l’onglet Style. Les changer ici recolore tout le site.')),
    h('div', { class: 'pal-list' }, rows), h('div', { class: 'row-btns' }, add, h('button', { type: 'button', class: 'btn btn--small', 'data-palette-logo': '', title: __('Proposer les six couleurs à partir du logo, contrastes corrigés'), onclick: () => openLogoPalette() }, __('🎨 Palette depuis le logo'))), pairs, usage];
}

function scaleSection(s) {
  const tt = s.tokens.type;
  const sz = typeSizes(tt);
  const numIn = (attr, key, value, min, max, step, label, fn) => {
    const input = h('input', { class: 'input', type: 'number', min, max, step, value, [attr]: key, 'aria-label': label });
    const save = () => {
      const now = (attr === 'data-type-token' ? state.site.tokens.type : state.site.tokens.space)?.[key] ?? value;
      if (!input.isConnected || Number(input.value) === Number(now)) return;
      if (!apply(x => fn(x, { [key]: input.value }), null, 'site', `${attr === 'data-type-token' ? 'type' : 'space'}-${key}`)) return;
      if (attr === 'data-type-token') log.info('settings.type-scale', __('Échelle de texte : {label} = {value}', { label, value: input.value }), { key, from: Number(now), to: Number(input.value) });
      else log.info('settings.space-scale', __('Espacements : {label} = {value}', { label, value: input.value }), { key, from: Number(now), to: Number(input.value) });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    input.addEventListener('change', save);
    return h('label', { class: 'mini' }, h('span', {}, label), input);
  };
  const sp = spaceSizes(s.tokens.space);
  return [
    h('h3', {}, __('Échelle de texte')),
    h('p', { class: 'hint' }, __('Les tailles grandissent en douceur entre le mobile (390 px) et le grand écran (1280 px). Les titres H1–H4 et le texte les utilisent.')),
    h('div', { class: 'mini-grid' },
      numIn('data-type-token', 'minSize', tt.minSize, 12, 24, 0.5, __('Texte mobile (px)'), setTypeTokens),
      numIn('data-type-token', 'maxSize', tt.maxSize, 12, 28, 0.5, __('Texte grand écran (px)'), setTypeTokens),
      numIn('data-type-token', 'minRatio', tt.minRatio, 1, 1.618, 0.01, __('Contraste mobile'), setTypeTokens),
      numIn('data-type-token', 'maxRatio', tt.maxRatio, 1, 1.618, 0.01, __('Contraste grand écran'), setTypeTokens)),
    h('ul', { class: 'scale-preview', 'data-type-preview': '' }, [...TYPE_STEPS].reverse().map(k => h('li', {},
      h('span', { class: 'scale-sample', style: { fontSize: `${Math.min(sz[k].max, 34)}px` } }, 'Aa'),
      h('span', {}, h('strong', {}, __(TYPE_LABELS[k])), ` ${r1(sz[k].min)} → ${r1(sz[k].max)} px`)))),
    h('h3', {}, __('Espacements')),
    h('div', { class: 'mini-grid' },
      numIn('data-space-token', 'minSize', s.tokens.space.minSize, 8, 32, 1, __('Base mobile (px)'), setSpaceTokens),
      numIn('data-space-token', 'maxSize', s.tokens.space.maxSize, 8, 40, 1, __('Base grand écran (px)'), setSpaceTokens)),
    h('ul', { class: 'scale-preview scale-preview--space' }, SPACE_STEPS.map(k => h('li', {},
      h('span', { class: 'space-bar', style: { width: `${Math.min(sp[k].max, 120)}px` } }),
      h('span', {}, h('strong', {}, __(SPACE_LABELS[k])), ` ${r1(sp[k].min)} → ${r1(sp[k].max)} px`))))
  ];
}

function presetsSection(s) {
  const list = Object.values(s.presets || {}).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, 'fr'));
  if (!list.length) return [h('h3', {}, __('Presets')), h('p', { class: 'hint' }, __('Aucun preset. Dans l’onglet Style d’un élément, « + Preset » enregistre son style pour le réutiliser.'))];
  const usage = presetUsage(s);
  return [h('h3', {}, __('Presets ({n})', { n: list.length })), h('div', { class: 'preset-list' }, list.map(p => {
    const name = h('input', { class: 'input input--sm', type: 'text', value: p.name, 'data-preset-rename': p.id, 'aria-label': __('Nom du preset') });
    const save = () => { if (name.isConnected && name.value.trim() && name.value.trim() !== (state.site.presets?.[p.id]?.name ?? p.name) && apply(x => renamePreset(x, p.id, name.value), null, 'site', 'preset-rename')) log.info('settings.preset-rename', __('Preset renommé : « {from} » → « {to} »', { from: p.name, to: name.value.trim().slice(0, 40) }), { id: p.id, type: p.type }); };
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    name.addEventListener('change', save);
    const isDef = s.defaultPresets?.[p.type] === p.id;
    return h('div', { class: 'preset-row', 'data-preset-row': p.id }, name,
      h('span', { class: 'preset-row__meta' }, [__(REGISTRY[p.type]?.label) || p.type, isDef ? __('par défaut') : null, (usage[p.id] <= 1 ? __c('page', '{n} élément', { n: usage[p.id] }) : __c('page', '{n} éléments', { n: usage[p.id] }))].filter(Boolean).join(' · ')),
      h('span', { class: 'row-btns' },
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-preset-duplicate': p.id, title: __('Dupliquer'), 'aria-label': __('Dupliquer {name}', { name: p.name }), onclick: () => { if (apply(x => duplicatePreset(x, p.id).site, null, 'site', 'preset-duplicate')) log.info('settings.preset-duplicate', __('Preset « {name} » dupliqué', { name: p.name }), { id: p.id, type: p.type, presets: Object.keys(state.site.presets || {}).length }); } }, '⧉'),
        h('button', { type: 'button', class: 'icon-btn icon-btn--sm is-danger', 'data-preset-delete': p.id, title: __('Supprimer (les éléments gardent leur apparence)'), 'aria-label': __('Supprimer {name}', { name: p.name }), onclick: () => {
          if (usage[p.id] && !confirm(__n(usage[p.id], 'Supprimer le preset « {name} » ? L’élément concerné garde son apparence.', 'Supprimer le preset « {name} » ? Les {n} éléments concernés gardent leur apparence.', { name: p.name }))) { log.debug('settings.preset-delete-cancel', __('Suppression du preset « {name} » annulée', { name: p.name }), { id: p.id }); return; }
          if (apply(x => deletePreset(x, p.id, { keepLook: true }), null, 'site', 'preset-delete')) log.info('settings.preset-delete', __n(usage[p.id], 'Preset « {name} » supprimé ({n} élément garde son apparence)', 'Preset « {name} » supprimé ({n} éléments gardent leur apparence)', { name: p.name }), { id: p.id, type: p.type, used: usage[p.id], wasDefault: isDef || undefined });
        } }, '✕')));
  }))];
}

function sitePanel() {
  const s = state.site;
  const t = s.theme;
  const name = h('input', { class: 'input', type: 'text', value: s.name, 'data-site': 'name' });
  name.addEventListener('input', () => { if (apply(x => setSiteMeta(x, { name: name.value }), 'site-name', 'panel', 'name')) log.trace('settings.name', __('Nom du site en cours de frappe'), { length: name.value.length }); });
  name.addEventListener('change', () => log.info('settings.name', __('Nom du site : « {name} »', { name: name.value.slice(0, 60) }), { length: name.value.length, empty: !name.value.trim() || undefined }));
  const base = h('input', { class: 'input', type: 'url', value: s.baseUrl || '', placeholder: __('https://www.exemple.be'), 'data-site': 'baseUrl', spellcheck: 'false' });
  base.addEventListener('change', () => { if (apply(x => setSiteMeta(x, { baseUrl: base.value }), null, 'panel', 'base-url')) log.info('settings.base-url', base.value.trim() ? __('Adresse du site : {url}', { url: base.value.trim() }) : __('Adresse du site effacée (plan du site, RSS et liens de langue absolus désactivés)'), { url: base.value.trim() || null }); });
  const langs = Object.entries(LANG_LABELS).map(([code, label]) => {
    const cb = h('input', { type: 'checkbox', checked: s.languages.includes(code), disabled: code === s.defaultLanguage, 'data-lang-toggle': code });
    cb.addEventListener('change', () => {
      const next = cb.checked ? [...s.languages, code] : s.languages.filter(l => l !== code);
      if (apply(x => setSiteMeta(x, { languages: next }), null, 'panel', cb.checked ? 'lang-add' : 'lang-remove')) {
        if (cb.checked) log.info('settings.lang-add', __('Langue ajoutée : {lang} (textes à traduire)', { lang: label }), { lang: code, languages: next, main: s.defaultLanguage });
        else log.info('settings.lang-remove', __('Langue retirée : {lang} (ses traductions restent dans le projet)', { lang: label }), { lang: code, languages: next, main: s.defaultLanguage });
      }
      setView({});
    });
    return h('label', { class: 'check' }, cb, code === s.defaultLanguage ? __('{lang} (principale)', { lang: label }) : label);
  });

  const fontSel = role => {
    const sel = h('select', { class: 'control', 'data-font': role }, Object.entries(FONTS).map(([k, f]) => h('option', { value: k, selected: t.fonts[role] === k }, __(f.label))));
    sel.addEventListener('change', () => { if (apply(x => setTheme(x, { fonts: { [role]: sel.value } }), null, 'panel', `font-${role}`)) log.info('settings.font', role === 'heading' ? __('Police des titres : {font}', { font: __(FONTS[sel.value]?.label) || sel.value }) : __('Police du texte : {font}', { font: __(FONTS[sel.value]?.label) || sel.value }), { role, font: sel.value, google: sel.value !== 'system' }); });
    return sel;
  };
  const numberField = (key, label, min, max, unit) => {
    const input = h('input', { class: 'input', type: 'number', min, max, value: t[key], 'data-theme': key });
    input.addEventListener('change', () => { if (apply(x => setTheme(x, { [key]: input.value }), null, 'panel', key)) log.info('settings.theme', `${label} : ${state.site.theme[key]} ${unit}`, { key, value: state.site.theme[key], typed: input.value }); });
    return h('div', { class: 'field' }, h('label', { class: 'field__label' }, `${label} (${unit})`), input);
  };

  const trans = h('input', { type: 'checkbox', checked: s.theme.pageTransitions !== false, 'data-page-transitions': '' });
  trans.addEventListener('change', () => { if (apply(x => setTheme(x, { pageTransitions: trans.checked }), null, 'panel', 'transitions')) log.info('settings.theme', trans.checked ? __('Transitions entre les pages : oui') : __('Transitions entre les pages : non'), { key: 'pageTransitions', value: trans.checked }); });
  const headerToggle = (cb, key, label) => cb.addEventListener('change', () => { if (apply(x => setHeader(x, { [key]: cb.checked }), null, 'panel', `header-${key}`)) log.info('settings.header', cb.checked ? __('En-tête par défaut : {setting} oui', { setting: label }) : __('En-tête par défaut : {setting} non', { setting: label }), { key, value: cb.checked }); });
  const burger = h('input', { type: 'checkbox', checked: s.header.burger !== false, 'data-header-burger': '' });
  headerToggle(burger, 'burger', __('bouton « Menu » sur mobile'));
  const sticky = h('input', { type: 'checkbox', checked: s.header.sticky !== false });
  headerToggle(sticky, 'sticky', __('en-tête fixe'));
  const showLangs = h('input', { type: 'checkbox', checked: s.header.showLangs !== false });
  headerToggle(showLangs, 'showLangs', __('choix de la langue'));
  /* Logo : importé (asset:…), adresse en ligne (https://…) ou retiré ('') */
  const logoKind = v => (!v ? 'none' : String(v).startsWith('asset:') ? 'asset' : 'url');
  const logLogo = v => {
    const kind = logoKind(v);
    if (kind === 'none') log.info('settings.logo', __('Logo retiré : le nom du site s’affiche à sa place'), { kind });
    else if (kind === 'asset') log.info('settings.logo', __('Logo importé'), { kind, asset: String(v).slice(6), file: state.site.assets?.[String(v).slice(6)]?.file });
    else if (state.site.header.logo !== v) log.warn('settings.logo-ignored', __('Adresse du logo ignorée : seule une image importée ou une adresse https:// est acceptée'), { kind, url: String(v).slice(0, 120), kept: logoKind(state.site.header.logo) });
    else log.info('settings.logo', __('Logo en ligne : {url}', { url: String(v).slice(0, 120) }), { kind, url: String(v).slice(0, 120) });
  };
  /* Source « site » : le panneau se redessine et montre la nouvelle vignette (avant le cycle 16, elle restait l’ancienne) */
  const logo = imageControl(s.header.logo, v => { if (apply(x => setHeader(x, { logo: v }), null, 'site', 'logo')) logLogo(v); }, 'logo', (site, value) => { if (apply(() => setHeader(site, { logo: value }), null, 'site', 'logo')) logLogo(value); });

  const footer = h('div', { class: 'i18n' }, s.languages.map(lang => {
    const input = h('input', { class: 'input', type: 'text', lang, 'data-footer': lang, value: s.footer.text?.[lang] || '', placeholder: lang === s.defaultLanguage ? '' : __('À traduire : {text}', { text: s.footer.text?.[s.defaultLanguage] || '' }) });
    input.addEventListener('input', () => apply(x => setFooterText(x, input.value, lang), `footer-${lang}`, 'panel', 'footer-text'));
    input.addEventListener('change', () => log.info('settings.footer-text', __n(input.value.length, 'Texte du pied de page ({lang}) : {n} caractère', 'Texte du pied de page ({lang}) : {n} caractères', { lang: lang.toUpperCase() }), { lang, length: input.value.length }));
    return h('div', { class: 'i18n__row' }, h('span', { class: 'i18n__lang' }, lang.toUpperCase()), input);
  }));

  return [
    h('h3', {}, __('Identité')),
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Nom du site')), name),
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Adresse du site (pour Google et les liens de langue)')), base),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Langues')), ...langs),
    ...paletteSection(s),
    h('h3', {}, __('Typographie')),
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Police des titres')), fontSel('heading')),
    h('div', { class: 'field' }, h('label', { class: 'field__label' }, __('Police du texte')), fontSel('body')),
    h('p', { class: 'hint' }, __('Les polices autres que « Système » sont chargées depuis Google Fonts sur le site publié.')),
    numberField('radius', __('Arrondi des angles'), 0, 40, 'px'),
    numberField('contentWidth', __('Largeur du contenu'), 720, 1600, 'px'),
    h('label', { class: 'check' }, trans, __('Transitions fluides entre les pages (sauf si le visiteur préfère moins de mouvement)')),
    ...scaleSection(s),
    ...presetsSection(s),
    h('h3', {}, __('En-tête et pied de page')),
    ...['header', 'footer'].map(z => {
      const custom = !!s.layout?.[z];
      const label = z === 'header' ? __('En-tête') : __('Pied de page');
      return h('div', { class: 'field' }, h('span', { class: 'field__label' }, custom ? __('{zone} : personnalisé (blocs)', { zone: label }) : __('{zone} : par défaut', { zone: label })),
        h('div', { class: 'layout-zone' },
          h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-layout-edit': z, onclick: () => {
            if (!custom && apply(x => (z === 'header' ? customizeHeader(x) : customizeFooter(x)), null, 'site', `layout-${z}`)) log.info('settings.layout-customize', __('{zone} converti en blocs modifiables', { zone: label }), { zone: z });
            log.info('settings.layout-edit', z === 'header' ? __('Modification de l’en-tête en blocs') : __('Modification du pied de page en blocs'), { zone: z, custom: custom || undefined });
            setEditTarget({ kind: z });
          } }, custom ? __('Modifier') : __('Personnaliser avec des blocs')),
          custom ? h('button', { type: 'button', class: 'btn btn--small', 'data-layout-reset': z, onclick: () => {
            if (state.editTarget?.kind === z) setEditTarget(null);
            if (apply(x => resetLayout(x, z), null, 'site', `layout-reset-${z}`)) log.info('settings.layout-reset', __('{zone} : retour à la version par défaut (Ctrl+Z pour annuler)', { zone: label }), { zone: z });
          } }, __('Revenir au défaut')) : null));
    }),
    h('h3', {}, __('En-tête par défaut')),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Logo')), logo),
    h('label', { class: 'check' }, sticky, __('En-tête fixe en haut de l’écran')),
    h('label', { class: 'check' }, showLangs, __('Afficher le choix de la langue')),
    h('label', { class: 'check' }, burger, __('Bouton « Menu » sur mobile')),
    h('h3', {}, __('Pied de page')),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Texte du pied de page')), footer)
  ];
}

export function leftPanels(which) {
  if (which === 'site') return sitePanel().flat().filter(Boolean);
  if (which === 'pages') return pagesPanel();
  if (which === 'templates') return templatesPanel();
  if (which === 'content') return collectionsPanel();
  return [];
}
