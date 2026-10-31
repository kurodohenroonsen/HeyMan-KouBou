/* Cycle 28 (X2) : modèles de sites complets, dans les cinq langues, et site vide inchangé. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_TEMPLATES, buildTemplate } from '../core/site-templates.js';
import { blankSite, normalizeSite, validateSite, LANG_LABELS } from '../core/site.js';
import { auditSite } from '../core/audit.js';
import { effectiveMenu } from '../core/menu.js';
import { renderSite } from '../core/render.js';
import { walk } from '../core/tree.js';

const LANGS = Object.keys(LANG_LABELS);
const IDS = SITE_TEMPLATES.filter(t => t.id !== 'blank').map(t => t.id);
const HOME_WORDS = { fr: /[a-zàâçéèêëîïôûù]/i, nl: /[a-z]/i, de: /[a-zäöüß]/i, en: /[a-z]/i, ja: /[぀-ヿ一-鿿]/ };
/* Avertissements attendus d'un modèle : ce que la personne doit compléter elle-même */
const EXPECTED = /image non choisie|formulaire sans adresse|à compléter|te vullen|auszufüllen|to be completed|要記入|carte sans adresse/;
const strip = v => String(v || '').replace(/<[^>]*>/g, '').trim();

test('six choix : cinq modèles complets et le site vide, chacun avec vignette SVG et description', () => {
  assert.deepEqual(SITE_TEMPLATES.map(t => t.id), ['association', 'tourism', 'shop', 'merchants', 'event', 'blank']);
  for (const t of SITE_TEMPLATES) {
    assert.ok(t.label && t.description, t.id);
    assert.match(t.thumb, /^<svg [^>]*viewBox="0 0 160 100"[^>]*>[\s\S]*<\/svg>$/, `${t.id} : vignette SVG dessinée`);
    assert.ok(!/<script|on\w+=|href=/i.test(t.thumb), `${t.id} : vignette sans script ni lien`);
  }
});

test('« Site vide » : exactement le site vide du cycle 24', () => {
  const a = buildTemplate('blank', { name: 'Essai', main: 'ja', others: ['en'] });
  const b = blankSite({ name: 'Essai', main: 'ja', others: ['en'] });
  assert.equal(a.pages.length, 1);
  assert.deepEqual({ ...a, pages: null }, { ...b, pages: null });
  assert.throws(() => buildTemplate('inconnu', {}), /Modèle de site inconnu/);
});

for (const id of IDS) {
  for (const main of LANGS) {
    test(`modèle ${id} en ${main} : valide, sans erreur d’audit, textes dans la langue principale`, () => {
      const others = LANGS.filter(l => l !== main).slice(0, 2);
      const site = normalizeSite(buildTemplate(id, { name: `Test ${id}`, main, others, today: '2026-11-01' }));
      assert.equal(site.defaultLanguage, main);
      assert.deepEqual(site.languages, [main, ...others]);
      const v = validateSite(site);
      assert.deepEqual(v.errors, [], 'validateSite');
      const a = auditSite(site);
      assert.deepEqual(a.errors, [], 'auditSite : aucune erreur');
      const odd = a.warnings.map(w => w.message).filter(m => !EXPECTED.test(m));
      assert.deepEqual(odd, [], 'pas d’avertissement inattendu (liens cassés, contraste, titres…)');
      assert.equal(JSON.stringify(site).includes('MAB'), false, 'aucune mention du MAB');
      assert.ok(site.pages.length >= 4, 'au moins quatre pages');
      const home = site.pages.find(p => p.slug === '');
      assert.match(strip(home.title[main]), HOME_WORDS[main], 'titre de l’accueil dans la langue principale');
      let h1 = '';
      walk(home.root, n => { if (!h1 && n.type === 'heading' && n.props.level === 'h1') h1 = strip(n.props.text?.[main]); return !h1; });
      assert.ok(h1.length > 3, 'titre H1 de l’accueil dans la langue principale');
      for (const l of others) assert.ok(strip(home.title[l]), `titre d’accueil aussi en ${l}`);
      if (main === 'ja') assert.match(h1, HOME_WORDS.ja);
      if (main !== 'ja') assert.ok(!HOME_WORDS.ja.test(h1), 'pas de japonais dans un site non japonais');
      /* Menu complet : toutes les pages hors pages légales */
      const menu = effectiveMenu(site);
      const inMenu = new Set(menu.flatMap(m => [m, ...(m.children || [])]).filter(m => m.kind === 'page').map(m => m.pageId));
      for (const p of site.pages.filter(x => !x.footerLink)) assert.ok(inMenu.has(p.id), `page « ${p.slug || 'accueil'} » dans le menu`);
      /* En-tête et pied en blocs */
      assert.equal(site.layout.header?.type, 'section');
      assert.equal(site.layout.footer?.type, 'section');
      /* SEO renseigné */
      for (const p of site.pages) assert.ok(strip(p.seo?.description?.[main]).length >= 20, `description SEO de « ${p.slug || 'accueil'} »`);
      assert.ok(strip(home.seo?.title?.[main]).length >= 10, 'titre SEO de l’accueil');
      /* Collections avec 3 à 4 exemples dans la langue principale */
      const cols = Object.values(site.collections);
      assert.ok(cols.length >= 1, 'au moins une collection');
      for (const c of cols) {
        assert.ok(c.items.length >= 3 && c.items.length <= 4, `${c.name} : 3 à 4 exemples`);
        for (const it of c.items) {
          const tv = it.values[c.titleField];
          const t = typeof tv === 'object' ? tv[main] : tv;
          assert.ok(strip(t), `${c.name} : titre d’exemple en ${main}`);
        }
        assert.ok(c.settings.listPage && site.pages.some(p => p.id === c.settings.listPage), `${c.name} : page de liste`);
      }
      /* Pages légales à compléter, liées dans le pied */
      assert.ok(site.pages.some(p => p.legal === 'legal' && p.footerLink), 'mentions légales');
      assert.ok(site.pages.some(p => p.legal === 'privacy' && p.footerLink), 'vie privée');
      /* Palette et polices du modèle */
      assert.notEqual(site.theme.palette.c1, '#0f766e', 'palette propre au modèle');
      assert.equal(site.timezone, main === 'ja' ? 'Asia/Tokyo' : 'Europe/Brussels');
    });
  }
}

test('Association de commerçants : la liste des commerces a catégorie, adresse, horaires et lien', () => {
  const site = buildTemplate('merchants', { name: 'Couvin commerces', main: 'fr', others: ['nl'], today: '2026-11-01' });
  const shops = Object.values(site.collections).find(c => c.kind === 'shops');
  assert.ok(shops, 'collection des commerces');
  for (const k of ['category', 'address', 'hours', 'website']) assert.ok(shops.fields.some(f => f.key === k), k);
  assert.ok(shops.items.length >= 3);
  assert.ok(shops.items.every(i => i.values.category && i.values.address && strip(i.values.hours?.fr)));
  const pages = site.pages.map(p => p.title.fr);
  for (const want of [/Accueil/, /commerces/i, /Agenda/i, /Actualités/i, /membre/i, /Contact/i]) assert.ok(pages.some(t => want.test(t)), `page ${want}`);
  assert.ok(site.pages.find(p => p.slug === '').title.nl, 'textes posés aussi sous les autres langues');
});

test('Tourisme en japonais : textes japonais, agenda à venir, export complet', () => {
  const site = buildTemplate('tourism', { name: '久万高原町', main: 'ja', others: ['en'], today: '2026-11-01' });
  const ev = Object.values(site.collections).find(c => c.kind === 'events');
  assert.ok(ev.items.every(i => /[぀-ヿ一-鿿]/.test(i.values.title.ja)), 'événements en japonais');
  assert.ok(ev.items.every(i => i.values.date >= '2026-11-01'), 'événements à venir');
  const files = renderSite(site);
  assert.ok(files.has('index.html'));
  assert.match(files.get('index.html'), /lang="ja"/);
  const ics = [...files.keys()].find(k => k.endsWith('.ics'));
  assert.ok(ics, 'agenda .ics');
  assert.match(files.get(ics), /TZID:Asia\/Tokyo/);
});
