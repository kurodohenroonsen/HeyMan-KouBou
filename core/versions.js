/* Versions du projet : instantanés datés, comparaison avec l'état actuel, tri des versions automatiques. */
import { translate } from './render.js';
import { __, __n } from './ui-i18n.js';
import { cloneSite } from './asset-store.js';

const newVersionId = () => 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function summarize(site) {
  return { pages: site.pages.length, components: Object.keys(site.components || {}).length, languages: site.languages.length, name: site.name };
}

export function makeVersion(site, { name = '', kind = 'manual', at = new Date().toISOString() } = {}) {
  return { id: newVersionId(), at, name: String(name).trim().slice(0, 80), kind, summary: summarize(site), site: cloneSite(site) };
}

const title = (site, p) => translate(site, p.title, site.defaultLanguage) || (p.slug ? `/${p.slug}/` : __('Accueil'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Différences pour aller de `from` à `to` */
export function diffSites(from, to) {
  const fp = new Map(from.pages.map(p => [p.id, p]));
  const tp = new Map(to.pages.map(p => [p.id, p]));
  const pagesAdded = to.pages.filter(p => !fp.has(p.id)).map(p => title(to, p));
  const pagesRemoved = from.pages.filter(p => !tp.has(p.id)).map(p => title(from, p));
  const pagesChanged = to.pages.filter(p => fp.has(p.id) && !same(fp.get(p.id), p)).map(p => title(to, p));
  const fc = from.components || {};
  const tc = to.components || {};
  const componentsAdded = Object.keys(tc).filter(k => !fc[k]).length;
  const componentsRemoved = Object.keys(fc).filter(k => !tc[k]).length;
  const componentsChanged = Object.keys(tc).filter(k => fc[k] && !same(fc[k], tc[k])).length;
  const themeChanged = !same(from.theme, to.theme) || !same(from.tokens, to.tokens) || !same(from.presets, to.presets);
  const structureChanged = !same(from.menu, to.menu) || !same(from.layout, to.layout) || !same(from.header, to.header) || !same(from.footer, to.footer);
  const fk = from.collections || {};
  const tk = to.collections || {};
  const collectionsAdded = Object.keys(tk).filter(k => !fk[k]).map(k => tk[k].name);
  const collectionsRemoved = Object.keys(fk).filter(k => !tk[k]).map(k => fk[k].name);
  const collectionsChanged = Object.keys(tk).filter(k => fk[k] && !same(fk[k], tk[k])).map(k => tk[k].name);
  const settingsChanged = from.name !== to.name || from.baseUrl !== to.baseUrl || !same(from.languages, to.languages);
  const identical = !pagesAdded.length && !pagesRemoved.length && !pagesChanged.length && !componentsAdded && !componentsRemoved && !componentsChanged && !themeChanged && !structureChanged && !settingsChanged && !collectionsAdded.length && !collectionsRemoved.length && !collectionsChanged.length && same(Object.keys(from.assets || {}), Object.keys(to.assets || {}));
  return { pagesAdded, pagesRemoved, pagesChanged, componentsAdded, componentsRemoved, componentsChanged, themeChanged, structureChanged, settingsChanged, collectionsAdded, collectionsRemoved, collectionsChanged, identical };
}

export function describeDiff(d) {
  if (d.identical) return __('Identique à l’état actuel.');
  const parts = [];
  if (d.pagesAdded.length) parts.push(__('pages en plus : {list}', { list: d.pagesAdded.join(', ') }));
  if (d.pagesRemoved.length) parts.push(__('pages en moins : {list}', { list: d.pagesRemoved.join(', ') }));
  if (d.pagesChanged.length) parts.push(__('pages différentes : {list}', { list: d.pagesChanged.join(', ') }));
  const comp = d.componentsAdded + d.componentsRemoved + d.componentsChanged;
  if (comp) parts.push(__n(comp, '{n} composant différent', '{n} composants différents'));
  if (d.collectionsAdded?.length) parts.push(__('contenus en plus : {list}', { list: d.collectionsAdded.join(', ') }));
  if (d.collectionsRemoved?.length) parts.push(__('contenus en moins : {list}', { list: d.collectionsRemoved.join(', ') }));
  if (d.collectionsChanged?.length) parts.push(__('contenus différents : {list}', { list: d.collectionsChanged.join(', ') }));
  if (d.themeChanged) parts.push(__('couleurs, polices ou presets'));
  if (d.structureChanged) parts.push(__('menu, en-tête ou pied de page'));
  if (d.settingsChanged) parts.push(__('réglages du site'));
  return parts.join(' · ');
}

export function pruneVersions(list, { maxAuto = 30 } = {}) {
  const manual = list.filter(v => v.kind === 'manual');
  const auto = list.filter(v => v.kind !== 'manual').sort((a, b) => b.at.localeCompare(a.at)).slice(0, maxAuto);
  return [...manual, ...auto].sort((a, b) => b.at.localeCompare(a.at));
}

const localDay = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
export function isNewDay(lastAt, now = new Date()) {
  return !lastAt || localDay(lastAt) !== localDay(now);
}
