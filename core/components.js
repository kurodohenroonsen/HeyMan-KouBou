/*
 * Composants : blocs réutilisables. Une instance { type, ref } affiche le composant référencé
 * et suit ses modifications. Le même mécanisme d'« édition ciblée » sert à l'en-tête et au pied de page.
 */
import { findNode, findParent, walk, reId, createNode } from './tree.js';
import { __ } from './ui-i18n.js';

const clone = v => structuredClone(v);
const newComponentId = () => 'cp_' + Math.random().toString(36).slice(2, 10);

function cleanName(name) {
  const n = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
  if (!n) throw new Error(__('Donnez un nom au composant.'));
  return n;
}

function allRoots(site, fn) {
  for (const p of site.pages) fn(p.root, { pageId: p.id });
  for (const c of Object.values(site.components || {})) fn(c.node, { componentId: c.id });
  if (site.layout?.header) fn(site.layout.header, { zone: 'header' });
  if (site.layout?.footer) fn(site.layout.footer, { zone: 'footer' });
}

/* Le composant `id` est-il (indirectement) contenu dans `node` ? */
function references(site, node, id, seen = new Set()) {
  let found = false;
  walk(node, n => {
    if (found) return false;
    if (n.ref) {
      if (n.ref === id) { found = true; return false; }
      if (!seen.has(n.ref) && site.components?.[n.ref]) {
        seen.add(n.ref);
        if (references(site, site.components[n.ref].node, id, seen)) { found = true; return false; }
      }
    }
    return true;
  });
  return found;
}

export function makeInstance(site, id) {
  const c = site.components?.[id];
  if (!c) throw new Error(__('Composant introuvable.'));
  const n = createNode(c.node.type === 'page' ? 'section' : c.node.type);
  n.ref = id;
  n.props = {};
  if (n.children) n.children = [];
  return n;
}

export function createComponent(site, pageId, nodeId, name) {
  const s = clone(site);
  s.components ||= {};
  const page = s.pages.find(p => p.id === pageId);
  const node = page && findNode(page.root, nodeId);
  if (!node || node.type === 'page') throw new Error(__('Sélectionnez une section, une rangée, une colonne ou un widget.'));
  if (node.ref) throw new Error(__('Cet élément est déjà une instance de composant.'));
  const id = newComponentId();
  s.components[id] = { id, name: cleanName(name), node: reId(node) };
  const inst = makeInstance(s, id);
  const { parent, index } = findParent(page.root, nodeId);
  parent.children[index] = inst;
  return { site: s, id, instanceId: inst.id };
}

export function setComponentNode(site, id, node) {
  if (!site.components?.[id]) throw new Error(__('Composant introuvable.'));
  if (!node || node.type === 'page') throw new Error(__('Un composant contient un seul bloc.'));
  if (references(site, node, id)) throw new Error(__('Un composant ne peut pas s’inclure lui-même.'));
  const s = clone(site);
  s.components[id].node = clone(node);
  return s;
}

export function renameComponent(site, id, name) {
  if (!site.components?.[id]) throw new Error(__('Composant introuvable.'));
  const s = clone(site);
  s.components[id].name = cleanName(name);
  return s;
}

/* Remplace une instance par une copie indépendante (nouveaux identifiants) */
function detachIn(root, site, nodeId) {
  const { parent, index } = findParent(root, nodeId);
  const inst = parent?.children[index];
  const c = inst && site.components?.[inst.ref];
  if (!c) return null;
  const copy = reId(c.node);
  if (inst.advanced?.anchor && !copy.advanced?.anchor) copy.advanced = { ...copy.advanced, anchor: inst.advanced.anchor };
  parent.children[index] = copy;
  return copy.id;
}

export function detachInstance(site, pageId, nodeId) {
  const s = clone(site);
  const page = s.pages.find(p => p.id === pageId);
  if (!page) throw new Error(__('Page introuvable.'));
  const id = detachIn(page.root, s, nodeId);
  if (!id) throw new Error(__('Cet élément n’est pas une instance de composant.'));
  return { site: s, id };
}

export function deleteComponent(site, id) {
  if (!site.components?.[id]) throw new Error(__('Composant introuvable.'));
  const s = clone(site);
  allRoots(s, root => {
    const ids = [];
    walk(root, n => { if (n.ref === id) ids.push(n.id); return true; });
    for (const nid of ids) detachIn(root, s, nid);
  });
  delete s.components[id];
  return s;
}

export function componentUsage(site) {
  const out = Object.fromEntries(Object.keys(site.components || {}).map(k => [k, 0]));
  allRoots(site, (root, where) => walk(root, n => { if (n.ref && n.ref in out && !(where.componentId === n.ref)) out[n.ref]++; return true; }));
  return out;
}

/* ---------- Édition ciblée : composant, en-tête, pied de page ---------- */
const PSEUDO = '__edit';

export function editRoot(site, target) {
  let node = null;
  if (target?.kind === 'component') node = site.components?.[target.id]?.node;
  if (target?.kind === 'header') node = site.layout?.header;
  if (target?.kind === 'footer') node = site.layout?.footer;
  if (target?.kind === 'card') node = site.collections?.[target.id]?.card;
  if (target?.kind === 'detail') { const d = site.collections?.[target.id]?.detail; return d ? clone(d) : null; }
  if (!node) return null;
  return { id: `${PSEUDO}-${target.kind}`, type: 'page', props: {}, style: { desktop: {}, tablet: {}, mobile: {}, hover: {} }, advanced: {}, children: [clone(node)] };
}

export function applyEditRoot(site, target, root) {
  if (target.kind === 'detail') {
    if (!site.collections?.[target.id]) throw new Error(__('Collection introuvable.'));
    if (root?.type !== 'page') throw new Error(__('Page de détail invalide.'));
    const s = clone(site);
    s.collections[target.id].detail = clone(root);
    return s;
  }
  const node = root?.children?.[0];
  if (!node) throw new Error(__('Le bloc modifié ne peut pas être vide : utilisez « Supprimer le composant » ou « Revenir à l’en-tête par défaut ».'));
  if (root.children.length > 1) throw new Error(__('Un seul bloc est autorisé ici : regroupez le contenu dans une section.'));
  if (target.kind === 'component') return setComponentNode(site, target.id, node);
  if (target.kind === 'card') {
    if (!site.collections?.[target.id]) throw new Error(__('Collection introuvable.'));
    if (node.type !== 'column') throw new Error(__('La carte est une colonne : ajoutez les éléments à l’intérieur.'));
    const s = clone(site);
    s.collections[target.id].card = clone(node);
    return s;
  }
  const s = clone(site);
  s.layout ||= { header: null, footer: null };
  s.layout[target.kind] = clone(node);
  return s;
}

export const isPseudoRoot = id => String(id || '').startsWith(PSEUDO);
