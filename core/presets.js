/*
 * Presets : styles nommés, partagés par plusieurs éléments du même type.
 * Un élément porte `preset` : un identifiant, '-' (aucun) ou rien (preset par défaut du type).
 * Le réglage fait sur l'élément l'emporte toujours sur celui du preset.
 */
import { findNode, walk, writeStyleValue } from './tree.js';
import { STATES } from './style.js';
import { REGISTRY } from './widgets.js';
import { editRoot, applyEditRoot } from './components.js';
import { __ } from './ui-i18n.js';

const clone = v => structuredClone(v);
const emptyStyle = () => ({ desktop: {}, tablet: {}, mobile: {}, hover: {} });
const newPresetId = () => 'ps_' + Math.random().toString(36).slice(2, 10);

function cleanName(name) {
  const n = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!n) throw new Error(__('Donnez un nom au preset.'));
  return n;
}

function cleanStyle(style) {
  const out = emptyStyle();
  for (const st of STATES) for (const [k, v] of Object.entries(style?.[st] || {})) {
    try { writeStyleValue(out, st, k, v); } catch { /* valeur ignorée */ }
  }
  return out;
}

/* where : identifiant de page, ou cible d'édition { kind: 'component' | 'header' | 'footer' } */
function rootOf(site, where) {
  if (where && typeof where === 'object') return editRoot(site, where);
  return site.pages.find(p => p.id === where)?.root || null;
}

function withNode(site, where, nodeId, fn) {
  const s = clone(site);
  const r = rootOf(s, where);
  if (!r) throw new Error(__('Page introuvable.'));
  const node = findNode(r, nodeId);
  if (!node) throw new Error(__('Élément introuvable.'));
  fn(node, s);
  return where && typeof where === 'object' ? applyEditRoot(s, where, r) : s;
}

function allNodes(site, fn) {
  for (const p of site.pages) walk(p.root, n => { fn(n, p); return true; });
}

export function createPreset(site, { name, type, style }) {
  if (!REGISTRY[type] || type === 'page') throw new Error(__('Type inconnu : {type}', { type }));
  const s = clone(site);
  s.presets ||= {};
  const id = newPresetId();
  s.presets[id] = { id, name: cleanName(name), type, style: cleanStyle(style) };
  return { site: s, id };
}

export function presetFromNode(site, pageId, nodeId, name) {
  const r0 = rootOf(site, pageId);
  const node = r0 && findNode(r0, nodeId);
  if (!node) throw new Error(__('Élément introuvable.'));
  const style = clone(node.style || emptyStyle());
  const keep = emptyStyle();
  if (node.type === 'column') for (const st of ['desktop', 'tablet', 'mobile']) {
    if (style[st]?.span !== undefined) { keep[st].span = style[st].span; delete style[st].span; }
  }
  const r = createPreset(site, { name, type: node.type, style });
  const s = withNode(r.site, pageId, nodeId, n => { n.preset = r.id; n.style = keep; });
  return { site: s, id: r.id };
}

export function setNodePreset(site, pageId, nodeId, presetId) {
  return withNode(site, pageId, nodeId, (n, s) => {
    if (presetId === null || presetId === undefined || presetId === '') { delete n.preset; return; }
    if (presetId === '-') { n.preset = '-'; return; }
    const p = s.presets?.[presetId];
    if (!p) throw new Error(__('Preset introuvable.'));
    if (p.type !== n.type) throw new Error(__('Ce preset est prévu pour un autre type d’élément ({type}).', { type: __(REGISTRY[p.type]?.label) || p.type }));
    n.preset = presetId;
  });
}

/* Détacher : l'apparence est conservée (style du preset recopié sous celui de l'élément) */
export function detachNode(site, pageId, nodeId) {
  return withNode(site, pageId, nodeId, (n, s) => {
    const pid = effectivePreset(s, n);
    if (pid) n.style = mergeStyles(s.presets[pid].style, n.style);
    n.preset = '-';
  });
}

function mergeStyles(base, over) {
  const out = emptyStyle();
  for (const st of STATES) out[st] = { ...(base?.[st] || {}), ...(over?.[st] || {}) };
  return out;
}

export function setPresetStyle(site, id, state, key, value) {
  if (!site.presets?.[id]) throw new Error(__('Preset introuvable.'));
  const s = clone(site);
  writeStyleValue(s.presets[id].style, state, key, value);
  return s;
}

export function renamePreset(site, id, name) {
  if (!site.presets?.[id]) throw new Error(__('Preset introuvable.'));
  const s = clone(site);
  s.presets[id].name = cleanName(name);
  return s;
}

export function duplicatePreset(site, id) {
  const p = site.presets?.[id];
  if (!p) throw new Error(__('Preset introuvable.'));
  return createPreset(site, { name: __('{name} (copie)', { name: p.name }).slice(0, 40), type: p.type, style: p.style });
}

export function deletePreset(site, id, { keepLook = true } = {}) {
  const p = site.presets?.[id];
  if (!p) throw new Error(__('Preset introuvable.'));
  const s = clone(site);
  const wasDefault = s.defaultPresets?.[p.type] === id;
  allNodes(s, n => {
    const uses = n.preset === id || (wasDefault && n.type === p.type && !n.preset);
    if (!uses) return;
    if (keepLook) n.style = mergeStyles(p.style, n.style);
    if (n.preset === id) delete n.preset;
  });
  if (wasDefault) delete s.defaultPresets[p.type];
  delete s.presets[id];
  return s;
}

export function setDefaultPreset(site, type, id) {
  const s = clone(site);
  s.defaultPresets ||= {};
  if (!id) { delete s.defaultPresets[type]; return s; }
  const p = s.presets?.[id];
  if (!p || p.type !== type) throw new Error(__('Preset introuvable pour ce type.'));
  s.defaultPresets[type] = id;
  return s;
}

export function effectivePreset(site, node) {
  if (!node || node.preset === '-') return null;
  if (node.preset) return site.presets?.[node.preset] ? node.preset : null;
  const d = site.defaultPresets?.[node.type];
  return d && site.presets?.[d] ? d : null;
}

/* Nombre d'éléments qui utilisent chaque preset (directement ou par défaut) */
export function presetUsage(site) {
  const out = Object.fromEntries(Object.keys(site.presets || {}).map(id => [id, 0]));
  allNodes(site, n => { const id = effectivePreset(site, n); if (id) out[id]++; });
  return out;
}

export function presetsForType(site, type) {
  return Object.values(site.presets || {}).filter(p => p.type === type).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
