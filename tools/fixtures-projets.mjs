/*
 * Projets de référence (cycle 27, Q7) : écrit dans tests/fixtures/projets/ trois projets .json au format de l'époque.
 * Exécuté une fois sur `main` avant le cycle 27 (schéma 2, images en data URL dans site.assets) : les fichiers sont
 * gardés tels quels ensuite ; tests/migrations.test.js vérifie que chacun s'ouvre, se rend et s'exporte.
 *   node tools/fixtures-projets.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import '../core/widgets-extra.js';
import '../core/collection-widgets.js';
import { demoSite } from '../editor/demo.js';
import { blankSite, addAsset, addPage, updatePageRoot } from '../core/site.js';
import { createNode, createSectionWithColumns } from '../core/tree.js';
import { createCollectionWithPage, setItemValue } from '../core/collections.js';
import { REGISTRY, STRUCTURE } from '../core/widgets.js';

const OUT = new URL('../tests/fixtures/projets/', import.meta.url);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function page1(widgets) {
  const sec = createSectionWithColumns(1);
  sec.children[0].children[0].children = widgets;
  const root = createNode('page');
  root.children = [sec];
  return root;
}
const w = (type, props = {}) => Object.assign(createNode(type), { props: { ...createNode(type).props, ...props } });

/* Site japonais : collections (agenda, actualités), images avec variantes, galerie, carte de contenu */
function japanese() {
  let s = blankSite({ name: '久万高原テスト', main: 'ja', others: ['en'] });
  const a = addAsset(s, { name: '四国カルスト.png', mime: 'image/png', dataUrl: PNG, width: 1600, height: 900, variants: [{ w: 480, dataUrl: PNG2 }, { w: 960, dataUrl: PNG2 }] });
  s = a.site;
  const b = addAsset(s, { name: 'shikoku.png', mime: 'image/png', dataUrl: PNG2, width: 800, height: 600 });
  s = b.site;
  const ev = createCollectionWithPage(s, { kind: 'events', today: '2026-10-30' });
  s = ev.site;
  const news = createCollectionWithPage(s, { kind: 'news', today: '2026-10-30' });
  s = news.site;
  const col = s.collections[news.id];
  const imgField = col.fields.find(f => f.type === 'image');
  if (imgField && col.items[0]) s = setItemValue(s, news.id, col.items[0].id, imgField.key, `asset:${a.id}`);
  const home = s.pages[0];
  const gallery = w('gallery');
  gallery.props.items = [{ src: `asset:${a.id}`, alt: { ja: 'カルスト' }, caption: {} }, { src: `asset:${b.id}`, alt: { ja: '四国' }, caption: {} }];
  const root = page1([
    w('heading', { text: { ja: '久万高原町へようこそ', en: 'Welcome to Kumakōgen' }, level: 'h1' }),
    w('image', { src: `asset:${a.id}`, alt: { ja: '四国カルスト' } }),
    w('text', { content: { ja: '<p>四国の屋根。</p>' } }),
    gallery,
    w('card', { image: `asset:${b.id}`, title: { ja: '面河渓' } })
  ]);
  s = updatePageRoot(s, home.id, root);
  s.header.logo = `asset:${b.id}`;
  return s;
}

/* Site de 30 pages × 50 widgets (générateur décrit dans docs/audit-2026-10-30/D-tests-outillage-perf.md) */
function big() {
  let s = blankSite({ name: 'Trente pages', main: 'fr', others: ['nl', 'en'] });
  const types = Object.keys(REGISTRY).filter(t => !STRUCTURE.has(t) && !['collection-list', 'item-field', 'form'].includes(t));
  for (let p = 0; p < 30; p++) {
    const widgets = Array.from({ length: 50 }, (_, i) => createNode(types[(p * 7 + i) % types.length]));
    const root = page1(widgets);
    if (p === 0) s = updatePageRoot(s, s.pages[0].id, root);
    else s = addPage(s, { slug: `page-${p}`, title: { fr: `Page ${p}`, nl: `Pagina ${p}` }, root });
  }
  return s;
}

mkdirSync(OUT, { recursive: true });
const write = (name, site) => writeFileSync(new URL(name, OUT), JSON.stringify(site, null, 2) + '\n');
write('mab-exemple.atelier.json', demoSite());
write('japonais-collections-images.atelier.json', japanese());
write('trente-pages.atelier.json', big());
console.log('Projets de référence écrits dans tests/fixtures/projets/');
