/*
 * « Demander à Atelier » : une demande en langage courant devient une liste d'actions choisies dans un
 * catalogue FERMÉ (ce que l'éditeur sait déjà faire). Ici, sans IA : schéma pour le modèle, validation et
 * normalisation de chaque action, application pure sur une copie du site (une seule étape d'annulation).
 */
import { TEMPLATES, buildTemplate } from './templates.js';
import { REGISTRY } from './widgets.js';
import { createNode, findNode, findParent, insertNode, setProp, setStyle, walk } from './tree.js';
import { insertAuto, nodeLabel, nodeSummary } from './editing.js';
import { findPage, updatePageRoot, addPage, setPalette, slugify, PALETTE_NAMES } from './site.js';
import { validateStyleValue, STYLE_PROPS } from './style.js';
import { palettePairs } from './contrast.js';
import { translate } from './render.js';
import { sanitizeInline, sanitizeRich } from './sanitize.js';
import { textToRich } from './smart.js';
import { __, __n, N_ } from './ui-i18n.js';

const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’\u0027]/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const MAX_ACTIONS = 10;

export const ACTIONS = {
  add_section: { label: 'Ajouter une section', params: 'template (modèle), title (titre), text (texte)' },
  add_faq: { label: 'Ajouter des questions fréquentes', params: 'title, questions [{ q, a }]' },
  add_widget: { label: 'Ajouter un élément', params: 'type, text' },
  set_text: { label: 'Remplacer le texte de l’élément sélectionné', params: 'text' },
  style: { label: 'Régler un style', params: 'target (selection, headings, texts, buttons, section), property, value, device' },
  set_palette: { label: 'Changer une couleur de la palette', params: 'role (principale, secondaire, texte, fond, discrète, surface), color' },
  add_page: { label: 'Créer une page', params: 'title, slug, sections [{ template, title, text }]' },
  go_to_page: { label: 'Ouvrir une page', params: 'page (titre)' },
  set_view: { label: 'Changer l’appareil ou la langue affichés', params: 'device (desktop, tablet, mobile), lang' },
  open_tool: { label: 'Ouvrir un outil', params: 'tool' }
};

export const WIDGET_TYPES = ['heading', 'text', 'button', 'image', 'spacer', 'divider', 'quote', 'accordion', 'video', 'map', 'social', 'icon-box', 'stats', 'card'];
const PRIMARY = { heading: 'text', text: 'content', button: 'label', quote: 'text', 'icon-box': 'title', card: 'title' };
/* Libellés en français pour le modèle (catalogText) ; N_ + __() pour les aperçus montrés à la personne */
export const TARGETS = { selection: N_('l’élément sélectionné'), headings: N_('tous les titres de la page'), texts: N_('tous les textes de la page'), buttons: N_('tous les boutons de la page'), section: N_('la section sélectionnée') };
const TARGET_TYPE = { headings: 'heading', texts: 'text', buttons: 'button' };
export const STYLE_KEYS = ['color', 'background', 'textAlign', 'fontSize', 'fontWeight', 'textTransform', 'paddingTop', 'paddingBottom', 'borderRadius'];
export const TOOLS = { seo: N_('Référencement'), ai: N_('IA locale'), publish: N_('Publier'), translations: N_('Traductions'), versions: N_('Versions'), log: N_('Journal de débogage'), audit: N_('Vérification avant export'), comments: N_('Commentaires'), palette_logo: N_('Palette depuis le logo'), review_summary: N_('Résumé de la relecture') };
const DEVICES = { desktop: N_('ordinateur'), tablet: N_('tablette'), mobile: N_('mobile') };

/* ---------- Normalisation ---------- */
const COLOR_WORDS = [
  [['rouge', 'red', 'rood', 'rot'], '#dc2626'], [['bleu', 'blue', 'blauw', 'blau'], '#2563eb'], [['vert', 'green', 'groen', 'grun'], '#16a34a'],
  [['jaune', 'yellow', 'geel', 'gelb'], '#facc15'], [['orange', 'oranje'], '#f97316'], [['violet', 'purple', 'paars', 'lila', 'mauve'], '#7c3aed'],
  [['rose', 'pink', 'roze', 'rosa'], '#db2777'], [['noir', 'black', 'zwart', 'schwarz'], '#111111'], [['blanc', 'white', 'wit', 'weiss', 'weis'], '#ffffff'],
  [['gris', 'grey', 'gray', 'grijs', 'grau'], '#6b7280'], [['marron', 'brun', 'brown', 'bruin', 'braun'], '#92400e']
];
const ROLE_WORDS = [[['principale', 'principal', 'primaire', 'primary', 'hoofdkleur', 'c1'], 'c1'], [['secondaire', 'secondary', 'accent', 'c2'], 'c2'], [['texte', 'text', 'tekst', 'c3'], 'c3'], [['fond', 'background', 'achtergrond', 'hintergrund', 'c4'], 'c4'], [['discrete', 'discret', 'muted', 'c5'], 'c5'], [['surface', 'carte', 'c6'], 'c6']];
const words = s => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

export function roleKey(v) {
  const w = words(v);
  return ROLE_WORDS.find(([list]) => list.some(x => w.includes(x)))?.[1] || null;
}

export function normalizeColor(v) {
  const s = String(v ?? '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s.toLowerCase();
  if (/^palette:c\d{1,2}$/.test(s)) return s;
  const w = words(s);
  const role = ROLE_WORDS.filter(([, k]) => k !== 'c3' && k !== 'c4').find(([list]) => list.some(x => w.includes(x)))?.[1];
  if (role) return `palette:${role}`;
  const named = COLOR_WORDS.find(([list]) => list.some(x => w.includes(x)));
  if (named) return named[1];
  if (w.includes('couleur') || w.includes('kleur')) { const r = roleKey(s); if (r) return `palette:${r}`; }
  return null;
}

const SIZE_WORDS = [['enorme', 'size:4xl'], ['immense', 'size:4xl'], ['tres grand', 'size:3xl'], ['very large', 'size:3xl'], ['zeer groot', 'size:3xl'], ['grand', 'size:2xl'], ['large', 'size:2xl'], ['groot', 'size:2xl'], ['gross', 'size:2xl'], ['moyen', 'size:lg'], ['medium', 'size:lg'], ['normal', 'size:base'], ['petit', 'size:sm'], ['small', 'size:sm'], ['klein', 'size:sm']];
export function normalizeSize(v) {
  const f = fold(v);
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vw|ch)$/.test(f) || /^size:/.test(f)) return f;
  return SIZE_WORDS.find(([k]) => f.includes(k))?.[1] || String(v ?? '').trim();
}
const SPACE_WORDS = [['aucun', '0'], ['sans', '0'], ['tres grand', 'space:xl'], ['grand', 'space:l'], ['moyen', 'space:m'], ['normal', 'space:s'], ['petit', 'space:xs']];
const ALIGN = { centre: 'center', center: 'center', milieu: 'center', gecentreerd: 'center', zentriert: 'center', gauche: 'left', left: 'left', links: 'left', droite: 'right', right: 'right', rechts: 'right', justifie: 'justify', justify: 'justify' };
const WEIGHT = [['tres gras', '800'], ['gras', '700'], ['bold', '700'], ['vet', '700'], ['fett', '700'], ['leger', '300'], ['light', '300'], ['normal', '400']];
const CASE = [['majuscule', 'uppercase'], ['uppercase', 'uppercase'], ['hoofdletter', 'uppercase'], ['minuscule', 'lowercase'], ['lowercase', 'lowercase'], ['normal', 'none'], ['aucun', 'none']];

function normalizeStyle(property, value) {
  const f = fold(value);
  switch (property) {
    case 'color': case 'background': return normalizeColor(value);
    case 'fontSize': return normalizeSize(value);
    case 'textAlign': return ALIGN[f.replace(/e$/, '')] || ALIGN[f] || Object.entries(ALIGN).find(([k]) => f.includes(k))?.[1] || f;
    case 'fontWeight': return /^\d{3}$/.test(f) ? f : WEIGHT.find(([k]) => f.includes(k))?.[1] || f;
    case 'textTransform': return CASE.find(([k]) => f.includes(k))?.[1] || f;
    case 'paddingTop': case 'paddingBottom': return /^\d/.test(f) || /^space:/.test(f) ? f : SPACE_WORDS.find(([k]) => f.includes(k))?.[1] || f;
    case 'borderRadius': return /^\d/.test(f) ? f : f.includes('rond') || f.includes('round') ? '999px' : f.includes('carre') || f.includes('square') || f.includes('aucun') ? '0' : f.includes('arrondi') ? '12px' : f;
    default: return String(value ?? '');
  }
}

/* ---------- Schéma et consigne ---------- */
const s_ = n => ({ type: 'string', maxLength: n });
const en = list => ({ type: 'string', enum: ['', ...list] });

export function planSchema(site) {
  const tpl = TEMPLATES.map(t => t.id);
  const item = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: Object.keys(ACTIONS) },
      template: en(tpl), title: s_(120), text: s_(800), type: en(WIDGET_TYPES), target: en(Object.keys(TARGETS)), property: en(STYLE_KEYS),
      value: s_(40), device: en(Object.keys(DEVICES)), lang: en(site.languages), page: s_(80), tool: en(Object.keys(TOOLS)), role: s_(30), color: s_(30), slug: s_(60),
      questions: { type: 'array', maxItems: 8, items: { type: 'object', properties: { q: s_(200), a: s_(800) }, required: ['q', 'a'], additionalProperties: false } },
      sections: { type: 'array', maxItems: 8, items: { type: 'object', properties: { template: en(tpl), title: s_(120), text: s_(800) }, required: ['template'], additionalProperties: false } }
    },
    required: ['action'],
    additionalProperties: false
  };
  return { type: 'object', properties: { actions: { type: 'array', maxItems: MAX_ACTIONS, items: item }, summary: s_(240) }, required: ['actions', 'summary'], additionalProperties: false };
}

export function catalogText(site) {
  const lines = Object.entries(ACTIONS).map(([k, a]) => `- ${k} : ${a.label} — ${a.params}`);
  return [
    'Actions possibles (liste fermée) :', ...lines,
    `Modèles de section (template) : ${TEMPLATES.map(t => `${t.id} = ${t.label}`).join(' ; ')}.`,
    `Types d’éléments (type) : ${WIDGET_TYPES.map(t => `${t} = ${REGISTRY[t]?.label || t}`).join(' ; ')}.`,
    `Réglages de style (property) : ${STYLE_KEYS.map(k => `${k} = ${STYLE_PROPS[k].label}`).join(' ; ')}. Couleurs : nom (rouge, bleu…), rôle (principale, secondaire) ou #rrggbb. Tailles : petit, normal, moyen, grand, très grand.`,
    `Outils (tool) : ${Object.entries(TOOLS).map(([k, v]) => `${k} = ${v}`).join(' ; ')}.`,
    `Langues du site : ${site.languages.join(', ')}.`
  ].join('\n');
}

const pageTitle = (site, p) => translate(site, p.title, site.defaultLanguage) || p.slug || 'Sans titre';
const uiPageTitle = (site, p) => translate(site, p.title, site.defaultLanguage) || p.slug || __('Sans titre');
function sectionLabel(site, sec, lang) {
  let h = null;
  walk(sec, n => { if (!h && n.type === 'heading') h = n; return !h; });
  const t = h ? clip(translate(site, h.props.text, lang).replace(/<[^>]*>/g, ''), 50) : '';
  return t ? `« ${t} »` : 'sans titre';
}
/* Même chose pour les aperçus montrés à la personne */
function uiSectionLabel(site, sec, lang) {
  let h = null;
  walk(sec, n => { if (!h && n.type === 'heading') h = n; return !h; });
  const t = h ? clip(translate(site, h.props.text, lang).replace(/<[^>]*>/g, ''), 50) : '';
  return t ? __('« {title} »', { title: t }) : __('sans titre');
}

export function pageContext(site, ctx) {
  const page = findPage(site, ctx.pageId) || site.pages[0];
  const lang = ctx.lang || site.defaultLanguage;
  const sel = ctx.selectedId ? findNode(page.root, ctx.selectedId) : null;
  return [
    `Pages : ${site.pages.map(p => pageTitle(site, p)).join(', ')} (affichée : ${pageTitle(site, page)}).`,
    `Sections de la page affichée : ${page.root.children.map((s, i) => `${i + 1}. ${sectionLabel(site, s, lang)}`).join(' ; ') || 'aucune'}.`,
    sel ? `Élément sélectionné : ${nodeLabel(sel)}${(() => { const x = clip(nodeSummary(sel, site, lang), 60); return x ? ` « ${x} »` : ''; })()}.` : 'Aucun élément sélectionné.',
    `Langue affichée : ${lang}.`
  ].join('\n').slice(0, 1800);
}

/* ---------- Validation ---------- */
const sectionOf = (root, id) => {
  let cur = id;
  while (cur) {
    const { parent } = findParent(root, cur);
    const n = findNode(root, cur);
    if (n?.type === 'section') return n;
    cur = parent?.id;
  }
  return null;
};
const CONTENT = new Set(['add_section', 'add_faq', 'add_widget', 'set_text', 'style']);

function findPageByName(site, name) {
  const x = fold(name);
  if (!x) return null;
  const list = site.pages.map(p => ({ p, t: fold(pageTitle(site, p)), s: fold(p.slug) }));
  return (list.find(o => o.t === x || o.s === x) || list.find(o => o.t.includes(x) || x.includes(o.t) || o.s.includes(x)))?.p || null;
}

export function validatePlan(site, raw, ctx = {}) {
  const page = findPage(site, ctx.pageId) || site.pages[0];
  const lang = ctx.lang || site.defaultLanguage;
  const list = Array.isArray(raw?.actions) ? raw.actions : [];
  const steps = [];
  const rejected = [];
  const warnings = [];
  if (list.length > MAX_ACTIONS) warnings.push(__('La demande donnait {n} actions : seules les {max} premières sont gardées (10 actions au plus par demande).', { n: list.length, max: MAX_ACTIONS }));
  const sel = ctx.selectedId ? findNode(page.root, ctx.selectedId) : null;
  const tplOf = id => TEMPLATES.find(t => t.id === id);
  let pal = { ...site.theme.palette };
  let anchor = sel ? sectionOf(page.root, sel.id) : null;
  for (const a of list.slice(0, MAX_ACTIONS)) {
    const action = String(a?.action ?? '');
    const reject = reason => rejected.push({ action: action || '(vide)', reason, raw: a });
    const empty = __('(vide)');
    if (!ACTIONS[action]) { reject(__('Action inconnue : « {action} » (hors de la liste fermée).', { action: clip(action, 40) })); continue; }
    if (CONTENT.has(action) && ctx.editTarget) { reject(__('Terminez d’abord l’édition du composant, de l’en-tête ou de la carte (bouton « Terminer »), puis redemandez.')); continue; }
    const where = anchor ? __('après la section {section}', { section: uiSectionLabel(site, anchor, lang) }) : __('en fin de page');
    switch (action) {
      case 'add_section': {
        const t = tplOf(a.template);
        if (!t) { reject(__('Modèle de section inconnu : {template}.', { template: clip(a.template, 40) || empty })); break; }
        steps.push({ action, params: { template: t.id, title: clip(a.title, 120), text: String(a.text ?? '').slice(0, 800) }, label: a.title ? __('Ajouter la section « {template} » titrée « {title} » {where}', { template: __(t.label), title: clip(a.title, 60), where }) : __('Ajouter la section « {template} » {where}', { template: __(t.label), where }) });
        break;
      }
      case 'add_faq': {
        const qs = (Array.isArray(a.questions) ? a.questions : []).map(x => ({ q: clip(x?.q, 200), a: String(x?.a ?? '').slice(0, 800).trim() })).filter(x => x.q && x.a).slice(0, 8);
        if (!qs.length) { reject(__('Questions fréquentes sans question ni réponse.')); break; }
        steps.push({ action, params: { title: clip(a.title, 120), questions: qs }, label: a.title
          ? __n(qs.length, 'Ajouter des questions fréquentes « {title} » ({n} question) {where}', 'Ajouter des questions fréquentes « {title} » ({n} questions) {where}', { title: clip(a.title, 60), where })
          : __n(qs.length, 'Ajouter des questions fréquentes ({n} question) {where}', 'Ajouter des questions fréquentes ({n} questions) {where}', { where }) });
        break;
      }
      case 'add_widget': {
        if (!WIDGET_TYPES.includes(a.type)) { reject(__('Type d’élément inconnu : {type}.', { type: clip(a.type, 30) || empty })); break; }
        const pos = sel ? __('après « {element} »', { element: nodeLabel(sel) }) : __('en fin de page');
        steps.push({ action, params: { type: a.type, text: String(a.text ?? '').slice(0, 800) }, label: a.text && PRIMARY[a.type] ? __('Ajouter « {widget} » : « {text} » {where}', { widget: __(REGISTRY[a.type].label), text: clip(a.text, 50), where: pos }) : __('Ajouter « {widget} » {where}', { widget: __(REGISTRY[a.type].label), where: pos }) });
        break;
      }
      case 'set_text': {
        if (!sel) { reject(__('Sélectionnez d’abord l’élément dont il faut remplacer le texte.')); break; }
        if (!PRIMARY[sel.type]) { reject(__('L’élément sélectionné ({element}) n’a pas de texte principal à remplacer.', { element: nodeLabel(sel) })); break; }
        if (!clip(a.text, 10)) { reject(__('Texte vide.')); break; }
        steps.push({ action, params: { nodeId: sel.id, field: PRIMARY[sel.type], text: String(a.text).slice(0, 800) }, label: __('Remplacer le texte de « {element} » par « {text} »', { element: nodeLabel(sel), text: clip(a.text, 60) }) });
        break;
      }
      case 'style': {
        const target = a.target || (sel ? 'selection' : '');
        if (!TARGETS[target]) { reject(__('Cible de style inconnue : {target}.', { target: clip(a.target, 30) || empty })); break; }
        if (!STYLE_KEYS.includes(a.property)) { reject(__('Réglage non autorisé : {property}.', { property: clip(a.property, 30) || empty })); break; }
        const norm = normalizeStyle(a.property, a.value);
        const v = norm === null ? null : validateStyleValue(a.property, norm);
        if (v === null) { reject(a.property === 'color' || a.property === 'background' ? __('Couleur non reconnue : {value}.', { value: clip(a.value, 30) }) : __('Valeur non reconnue pour « {property} » : {value}.', { property: __(STYLE_PROPS[a.property].label), value: clip(a.value, 30) })); break; }
        if ((target === 'selection' || target === 'section') && !sel) { reject(__('Sélectionnez d’abord l’élément (ou la section) à mettre en forme.')); break; }
        const secNode = target === 'section' ? sectionOf(page.root, sel.id) : null;
        if (target === 'section' && !secNode) { reject(__('Aucune section autour de la sélection.')); break; }
        const ids = target === 'selection' ? [sel.id] : target === 'section' ? [secNode.id] : (() => { const o = []; walk(page.root, n => { if (n.type === TARGET_TYPE[target]) o.push(n.id); return true; }); return o; })();
        if (!ids.length) { reject(__('Aucun élément visé ({target}) sur cette page.', { target: __(TARGETS[target]) })); break; }
        const device = DEVICES[a.device] ? a.device : 'desktop';
        const base = __('{property} : {value} pour {target}', { property: __(STYLE_PROPS[a.property].label), value: v, target: __(TARGETS[target]) });
        const deviceName = device !== 'desktop' ? __(DEVICES[device]) : '';
        steps.push({ action, params: { target, ids, property: a.property, value: v, state: device }, label: `${base}${ids.length > 1 ? ` (${ids.length})` : ''}${deviceName ? ` (${deviceName})` : ''}` });
        break;
      }
      case 'set_palette': {
        const key = roleKey(a.role);
        if (!key) { reject(__('Couleur de palette inconnue : {role} (principale, secondaire, texte, fond, discrète, surface).', { role: clip(a.role, 30) || empty })); break; }
        const c = normalizeColor(a.color);
        if (!c || c.startsWith('palette:')) { reject(__('Couleur non reconnue : {value}.', { value: clip(a.color, 30) })); break; }
        const hex = c.length === 4 ? `#${[...c.slice(1)].map(x => x + x).join('')}` : c;
        pal = { ...pal, [key]: hex };
        steps.push({ action, params: { key, color: hex }, label: __('Couleur « {name} » de la palette : {hex}', { name: __(PALETTE_NAMES[key]), hex }) });
        break;
      }
      case 'add_page': {
        const title = clip(a.title, 120);
        if (!title) { reject(__('Page sans titre.')); break; }
        const sections = [];
        for (const sct of (Array.isArray(a.sections) ? a.sections : []).slice(0, 8)) {
          const t = tplOf(sct?.template);
          if (!t) { rejected.push({ action: 'add_page', reason: __('Modèle de section inconnu : {template} (section ignorée dans la page « {title} »).', { template: clip(sct?.template, 40) || empty, title }), raw: sct }); continue; }
          sections.push({ template: t.id, title: clip(sct.title, 120), text: String(sct.text ?? '').slice(0, 800) });
        }
        steps.push({ action, params: { title, slug: slugify(a.slug || title).slice(0, 60), sections }, label: sections.length ? __('Créer la page « {title} » avec {sections}', { title, sections: sections.map(x => __('« {title} »', { title: __(tplOf(x.template).label) })).join(', ') }) : __('Créer la page « {title} » (vide)', { title }) });
        if (Array.isArray(site.menu)) warnings.push(__('Le menu est personnalisé : ajoutez « {title} » au menu (panneau Pages) pour qu’elle y apparaisse.', { title }));
        break;
      }
      case 'go_to_page': {
        const p = findPageByName(site, a.page);
        if (!p) { reject(__('Page introuvable : « {page} ».', { page: clip(a.page, 50) })); break; }
        steps.push({ action, params: { pageId: p.id }, label: __('Ouvrir la page « {title} »', { title: uiPageTitle(site, p) }) });
        break;
      }
      case 'set_view': {
        const device = DEVICES[a.device] ? a.device : '';
        const l = site.languages.includes(a.lang) ? a.lang : '';
        if (!device && !l) { reject(__('Ni appareil ni langue du site reconnus.')); break; }
        const label = device && l ? __('Afficher en {device} et en {lang}', { device: __(DEVICES[device]), lang: l.toUpperCase() }) : device ? __('Afficher en {device}', { device: __(DEVICES[device]) }) : __('Afficher en {lang}', { lang: l.toUpperCase() });
        steps.push({ action, params: { device, lang: l }, label });
        break;
      }
      case 'open_tool': {
        if (!TOOLS[a.tool]) { reject(__('Outil inconnu : {tool}.', { tool: clip(a.tool, 30) || empty })); break; }
        steps.push({ action, params: { tool: a.tool }, label: __('Ouvrir « {tool} »', { tool: __(TOOLS[a.tool]) }) });
        break;
      }
      default: reject(__('Action non prise en charge.'));
    }
  }
  if (steps.some(s => s.action === 'set_palette')) {
    const bad = palettePairs(pal).filter(p => !p.ok);
    if (bad.length) warnings.push(__('Contraste insuffisant après ce changement de palette : {pairs} (vérifiez dans le panneau Site).', { pairs: bad.map(p => __(p.label).toLowerCase()).join(', ') }));
  }
  return { steps, rejected, warnings };
}

/* ---------- Application ---------- */
function customize(sec, { title, text }, lang, found) {
  let h = null;
  let t = null;
  walk(sec, n => { if (!h && n.type === 'heading') h = n; if (!t && n.type === 'text') t = n; return true; });
  let root = sec;
  if (title && h) { root = setProp(root, h.id, 'text', sanitizeInline(title.replace(/[<>]/g, '')), lang); found.push({ nodeId: h.id, field: 'text' }); }
  if (text && t) { root = setProp(root, t.id, 'content', textToRich(text), lang); found.push({ nodeId: t.id, field: 'content' }); }
  return root;
}

function faqSection(params, lang, found) {
  let sec = buildTemplate('faq', { lang });
  sec = customize(sec, { title: params.title }, lang, found);
  let acc = null;
  walk(sec, n => { if (!acc && n.type === 'accordion') acc = n; return !acc; });
  acc.props.items = params.questions.map(q => ({ title: { [lang]: sanitizeInline(q.q.replace(/[<>]/g, '')) }, content: { [lang]: sanitizeRich(textToRich(q.a)) } }));
  params.questions.forEach((_, i) => { found.push({ nodeId: acc.id, field: `items.${i}.title` }, { nodeId: acc.id, field: `items.${i}.content` }); });
  return sec;
}

export function applyPlan(site, steps, ctx = {}) {
  let s = site;
  let pageId = (findPage(site, ctx.pageId) || site.pages[0]).id;
  const lang = ctx.lang || site.defaultLanguage;
  let selected = ctx.selectedId || null;
  let anchor = null;
  { const p = findPage(s, pageId); const sec = selected ? sectionOf(p.root, selected) : null; anchor = sec?.id || null; }
  const view = {};
  const ui = [];
  const done = [];
  const errors = [];
  const aiTexts = [];
  const rootOf = () => findPage(s, pageId).root;
  const setRoot = r => { s = updatePageRoot(s, pageId, r); };
  const insertSection = sec => {
    const root = rootOf();
    const idx = anchor ? root.children.findIndex(c => c.id === anchor) + 1 : root.children.length;
    setRoot(insertNode(root, root.id, sec, idx > 0 ? idx : root.children.length));
    anchor = sec.id;
  };
  for (const st of steps) {
    const found = [];
    try {
      const p = st.params;
      switch (st.action) {
        case 'add_section': insertSection(customize(buildTemplate(p.template, { lang: s.defaultLanguage }), p, lang, found)); break;
        case 'add_faq': insertSection(faqSection(p, lang, found)); break;
        case 'add_widget': {
          const n = createNode(p.type, { lang: s.defaultLanguage });
          let node = n;
          if (p.text && PRIMARY[p.type]) {
            const field = PRIMARY[p.type];
            const v = REGISTRY[p.type].fields.find(f => f.key === field)?.type === 'richtext' ? textToRich(p.text) : sanitizeInline(p.text.replace(/[<>]/g, ''));
            node = setProp(n, n.id, field, v, lang);
            found.push({ nodeId: n.id, field });
          }
          const r = insertAuto(rootOf(), selected, node);
          setRoot(r.root);
          selected = r.id;
          break;
        }
        case 'set_text': {
          const n = findNode(rootOf(), p.nodeId);
          if (!n) throw new Error(__('Élément sélectionné introuvable.'));
          const v = REGISTRY[n.type].fields.find(f => f.key === p.field)?.type === 'richtext' ? textToRich(p.text) : sanitizeInline(p.text.replace(/[<>]/g, ''));
          setRoot(setProp(rootOf(), p.nodeId, p.field, v, lang));
          found.push({ nodeId: p.nodeId, field: p.field });
          break;
        }
        case 'style': {
          let r = rootOf();
          /* Titres, textes, boutons : tous ceux de la page au moment d'appliquer (y compris ceux ajoutés juste avant) */
          const ids = TARGET_TYPE[p.target] ? (() => { const o = []; walk(r, n => { if (n.type === TARGET_TYPE[p.target]) o.push(n.id); return true; }); return o; })() : p.ids;
          for (const id of ids) if (findNode(r, id)) r = setStyle(r, id, p.state, p.property, p.value);
          setRoot(r);
          break;
        }
        case 'set_palette': s = setPalette(s, p.key, p.color); break;
        case 'add_page': {
          let slug = p.slug || 'page';
          for (let n = 2; s.pages.some(x => x.slug === slug); n++) slug = `${p.slug}-${n}`;
          let root = createNode('page');
          const created = [];
          for (const sec of p.sections) { const x = customize(buildTemplate(sec.template, { lang: s.defaultLanguage }), sec, s.defaultLanguage, created); root = insertNode(root, root.id, x, root.children.length); }
          s = addPage(s, { slug, title: { [s.defaultLanguage]: p.title }, root });
          pageId = s.pages[s.pages.length - 1].id;
          view.pageId = pageId;
          selected = null;
          anchor = null;
          for (const c of created) found.push(c);
          found.push({ pageTitle: true });
          break;
        }
        case 'go_to_page': pageId = p.pageId; view.pageId = p.pageId; selected = null; anchor = null; break;
        case 'set_view': if (p.device) view.device = p.device; if (p.lang) view.lang = p.lang; break;
        case 'open_tool': ui.push(p.tool); break;
        default: throw new Error(__('Action non prise en charge.'));
      }
      for (const f of found) aiTexts.push({ pageId, lang: st.action === 'add_page' ? s.defaultLanguage : lang, ...f });
      done.push(st.label);
    } catch (e) { errors.push({ label: st.label, error: e.message }); }
  }
  return { site: s, view, ui, done, errors, aiTexts, lang };
}
