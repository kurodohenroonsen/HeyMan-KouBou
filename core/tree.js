/*
 * Arbre du document : création, recherche et opérations pures (chaque fonction renvoie un nouvel arbre).
 */
import { REGISTRY, STRUCTURE, isWidget, fieldDef } from './widgets.js';
import { validateStyleValue, STYLE_PROPS, HOVER_PROPS, STATES } from './style.js';
import { sanitizeRich, sanitizeInline } from './sanitize.js';
import { __ } from './ui-i18n.js';

export function newId() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  return 'n_' + Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

const clone = v => structuredClone(v);
const emptyStyle = () => ({ desktop: {}, tablet: {}, mobile: {}, hover: {} });
const emptyAdvanced = () => ({ anchor: '', cssClass: '', hideOn: { desktop: false, tablet: false, mobile: false } });

export function createNode(type) {
  const def = REGISTRY[type];
  if (!def) throw new Error(__('Type inconnu : {type}', { type }));
  const node = { id: newId(), type, props: def.defaults(), style: emptyStyle(), advanced: emptyAdvanced() };
  if (STRUCTURE.has(type)) node.children = [];
  return node;
}

/* Section prête à l'emploi : section > rangée > N colonnes (largeurs sur 12) */
export function createSectionWithColumns(count = 1, spans) {
  const sec = createNode('section');
  const row = createNode('row');
  const n = Math.max(1, Math.min(6, count));
  const widths = spans && spans.length === n ? spans : Array.from({ length: n }, () => Math.floor(12 / n));
  row.children = widths.map(w => {
    const col = createNode('column');
    col.style.desktop.span = w;
    return col;
  });
  sec.children = [row];
  return sec;
}

export function walk(node, fn, parent = null, depth = 0) {
  if (fn(node, parent, depth) === false) return false;
  for (const c of node.children || []) if (walk(c, fn, node, depth + 1) === false) return false;
  return true;
}

export function findNode(root, id) {
  let found = null;
  walk(root, n => { if (n.id === id) { found = n; return false; } return true; });
  return found;
}

export function findParent(root, id) {
  let res = { parent: null, index: -1 };
  walk(root, n => {
    const i = (n.children || []).findIndex(c => c.id === id);
    if (i >= 0) { res = { parent: n, index: i }; return false; }
    return true;
  });
  return res;
}

export function pathTo(root, id) {
  const path = [];
  const rec = n => {
    path.push(n.id);
    if (n.id === id) return true;
    for (const c of n.children || []) if (rec(c)) return true;
    path.pop();
    return false;
  };
  return rec(root) ? path : [];
}

function rowsInPath(root, id) {
  const ids = pathTo(root, id);
  return ids.map(x => findNode(root, x)).filter(n => n?.type === 'row').length;
}

export function canContain(root, parentId, childType) {
  const parent = findNode(root, parentId);
  if (!parent || parent.ref) return false;
  switch (parent.type) {
    case 'page': return childType === 'section';
    case 'section': return childType === 'row';
    case 'row': return childType === 'column';
    case 'column':
      if (isWidget(childType)) return true;
      if (childType === 'row') return rowsInPath(root, parentId) < 2;
      return false;
    default: return false;
  }
}

function containsRow(node) {
  let has = false;
  for (const c of node.children || []) walk(c, n => { if (n.type === 'row') { has = true; return false; } return true; });
  return has;
}

function check(root, parentId, node) {
  if (!findNode(root, parentId)) throw new Error(__('Emplacement introuvable : {id}', { id: parentId }));
  if (!canContain(root, parentId, node.type)) throw new Error(__('« {label} » n’est pas autorisé à cet endroit.', { label: REGISTRY[node.type] ? __(REGISTRY[node.type].label) : node.type }));
  if (node.type === 'row' && containsRow(node) && rowsInPath(root, parentId) >= 1) throw new Error(__('Une rangée imbriquée ne peut pas en contenir une autre : ce n’est pas autorisé.'));
}

export function insertNode(root, parentId, node, index) {
  check(root, parentId, node);
  const r = clone(root);
  const parent = findNode(r, parentId);
  const at = index === undefined ? parent.children.length : Math.max(0, Math.min(index, parent.children.length));
  parent.children.splice(at, 0, clone(node));
  return r;
}

export function removeNode(root, id) {
  if (root.id === id) throw new Error(__('La racine de la page ne peut pas être supprimée.'));
  const r = clone(root);
  const { parent, index } = findParent(r, id);
  if (!parent) throw new Error(__('Élément introuvable : {id}', { id }));
  parent.children.splice(index, 1);
  return r;
}

export function moveNode(root, id, newParentId, index) {
  if (pathTo(root, newParentId).includes(id)) throw new Error(__('Impossible de déplacer un élément dans un de ses descendants.'));
  const node = findNode(root, id);
  if (!node) throw new Error(__('Élément introuvable : {id}', { id }));
  const from = findParent(root, id);
  let r = removeNode(root, id);
  let at = index;
  if (from.parent.id === newParentId && at !== undefined && from.index < at) at -= 1;
  check(r, newParentId, node);
  const parent = findNode(r, newParentId);
  at = at === undefined ? parent.children.length : Math.max(0, Math.min(at, parent.children.length));
  parent.children.splice(at, 0, clone(node));
  return r;
}

export function reId(node) {
  const n = clone(node);
  walk(n, x => { x.id = newId(); });
  return n;
}

export function duplicateNode(root, id) {
  const { parent, index } = findParent(root, id);
  if (!parent) throw new Error(__('Cet élément ne peut pas être dupliqué.'));
  const copy = reId(findNode(root, id));
  const r = clone(root);
  findNode(r, parent.id).children.splice(index + 1, 0, copy);
  return { root: r, newId: copy.id };
}

function update(root, id, fn) {
  const r = clone(root);
  const n = findNode(r, id);
  if (!n) throw new Error(__('Élément introuvable : {id}', { id }));
  fn(n);
  return r;
}

export function normalizeFieldValue(def, value) {
  if (!def) throw new Error(__('Champ inconnu.'));
  switch (def.type) {
    case 'select':
      if (typeof def.options === 'function') {
        if (!/^[A-Za-z0-9_@=:.-]{0,120}$/.test(String(value ?? ''))) throw new Error(__('Valeur non autorisée pour « {label} »', { label: __(def.label) }));
        return String(value ?? '');
      }
      if (!def.options.some(o => o.value === value)) throw new Error(__('Valeur non autorisée pour « {label} » : {value}', { label: __(def.label), value }));
      return value;
    case 'toggle': return !!value;
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error(__('Valeur numérique attendue pour « {label} ».', { label: __(def.label) }));
      return Math.max(def.min ?? -Infinity, Math.min(def.max ?? Infinity, n));
    }
    case 'richtext': return sanitizeRich(value);
    case 'inline': return sanitizeInline(value);
    case 'document': {
      const v = String(value ?? '');
      if (v && !/^asset:doc_[a-z0-9]+$/i.test(v)) throw new Error(__('Valeur non autorisée pour « {label} » : {value}', { label: __(def.label), value: v.slice(0, 40) }));
      return v;
    }
    default: return String(value ?? '');
  }
}

function writeField(target, def, value, lang) {
  const v = normalizeFieldValue(def, value);
  if (def.i18n) target[def.key] = { ...(target[def.key] || {}), [lang]: v };
  else target[def.key] = v;
}

export function setProp(root, id, key, value, lang) {
  return update(root, id, n => writeField(n.props, fieldDef(n.type, key), value, lang));
}

export function setListItemProp(root, id, key, index, subKey, value, lang) {
  return update(root, id, n => {
    const list = fieldDef(n.type, key);
    const sub = list?.fields?.find(f => f.key === subKey);
    const item = n.props[key]?.[index];
    if (!item) throw new Error(__('Élément {n} introuvable.', { n: index + 1 }));
    writeField(item, sub, value, lang);
  });
}

export function addListItem(root, id, key) {
  return update(root, id, n => {
    const list = fieldDef(n.type, key);
    n.props[key] = [...(n.props[key] || []), list?.newItem ? list.newItem() : {}];
  });
}

export function removeListItem(root, id, key, index) {
  return update(root, id, n => { n.props[key] = (n.props[key] || []).filter((_, i) => i !== index); });
}

export function moveListItem(root, id, key, index, delta) {
  return update(root, id, n => {
    const l = n.props[key] || [];
    const j = Math.max(0, Math.min(l.length - 1, index + delta));
    if (j === index) return;
    const [it] = l.splice(index, 1);
    l.splice(j, 0, it);
  });
}

/* Écrit une valeur validée dans un objet style { desktop, tablet, mobile, hover } (élément ou preset) */
export function writeStyleValue(style, state, key, value) {
  if (!STATES.includes(state)) throw new Error(__('État inconnu : {state}', { state }));
  if (!STYLE_PROPS[key]) throw new Error(__('Propriété de style inconnue : {key}', { key }));
  if (state === 'hover' && !HOVER_PROPS.includes(key)) throw new Error(__('« {label} » ne se règle pas au survol.', { label: __(STYLE_PROPS[key].label) }));
  style[state] ||= {};
  if (value === '' || value === null || value === undefined) { delete style[state][key]; return; }
  const v = validateStyleValue(key, value);
  if (v === null) throw new Error(__('Valeur invalide pour « {label} » : {value}', { label: __(STYLE_PROPS[key].label), value }));
  style[state][key] = v;
}

export function setStyle(root, id, state, key, value) {
  return update(root, id, n => {
    n.style ||= emptyStyle();
    writeStyleValue(n.style, state, key, value);
  });
}

/* CSS personnalisée d'un élément : déclarations simples uniquement */
export function sanitizeCustomCss(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if (v.length > 600) throw new Error(__('CSS personnalisée : 600 caractères maximum.'));
  if (/[<>{}@\\]|\/\*|url\s*\(|expression|javascript:|image-set|-moz-binding|behavior/i.test(v)) throw new Error(__('CSS personnalisée refusée : utilisez seulement des déclarations « propriété: valeur; » (pas d’accolades, de @, d’url() ni de commentaires).'));
  const out = [];
  for (const decl of v.split(';').map(d => d.trim()).filter(Boolean)) {
    const m = decl.match(/^(-{0,2}[a-z][a-z0-9-]*)\s*:\s*(.+)$/i);
    if (!m) throw new Error(__('CSS personnalisée refusée : « {decl} » n’est pas une déclaration « propriété: valeur ».', { decl: decl.slice(0, 40) }));
    out.push(`${m[1].toLowerCase()}:${m[2].trim()}`);
  }
  return out.join(';');
}

export function setStyleBundle(root, id, style) {
  return update(root, id, n => {
    const next = emptyStyle();
    for (const st of STATES) for (const [k, v] of Object.entries(style?.[st] || {})) {
      if (st === 'hover' && !HOVER_PROPS.includes(k)) continue;
      const ok = validateStyleValue(k, v);
      if (ok !== null) next[st][k] = ok;
    }
    n.style = next;
  });
}

export function setAdvanced(root, id, patch) {
  return update(root, id, n => {
    n.advanced ||= emptyAdvanced();
    if ('anchor' in patch) {
      n.advanced.anchor = String(patch.anchor || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
    }
    if ('cssClass' in patch) {
      n.advanced.cssClass = String(patch.cssClass || '').split(/\s+/).filter(c => /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(c)).slice(0, 8).join(' ');
    }
    if ('css' in patch) n.advanced.css = sanitizeCustomCss(patch.css);
    if ('ariaLabel' in patch) n.advanced.ariaLabel = { ...(n.advanced.ariaLabel || {}), [patch.lang || 'fr']: String(patch.ariaLabel ?? '').replace(/[<>]/g, '').slice(0, 120) };
    if (patch.hideLangs) n.advanced.hideLangs = { ...(n.advanced.hideLangs || {}), ...Object.fromEntries(Object.entries(patch.hideLangs).filter(([k]) => /^[a-z]{2}$/.test(k)).map(([k, v]) => [k, !!v])) };
    if (patch.hideOn) n.advanced.hideOn = { ...n.advanced.hideOn, ...Object.fromEntries(Object.entries(patch.hideOn).map(([k, v]) => [k, !!v])) };
  });
}
