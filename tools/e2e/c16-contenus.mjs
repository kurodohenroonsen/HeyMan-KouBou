/* Cycle 16 : journaux des pages et du menu, des réglages du site, des images, des collections (CSV compris) et des versions — extraits du chapitre 4 du guide. */
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(8000);
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const cur = () => page.evaluate(() => window.__atelier.pageId);
  const colByKind = async kind => Object.values((await site()).collections || {}).find(x => x.kind === kind);

  /* Un cas d'usage : repère, actions, codes attendus, extrait pour le guide */
  const kase = async (name, list, fn, { wait, drop = [], errors = [] } = {}) => {
    errors = ['ui.toast', ...errors];
    const s = await mark(page);
    await fn();
    if (wait) await waitCode(page, wait, s, 20000);
    await t.wait(200);
    const es = await since(page, s);
    expectCodes(t, es, list, name);
    expectNoErrors(t, es, name, errors);
    capture(name, es, { drop });
    return es;
  };
  const change = async sel => { await page.locator(sel).dispatchEvent('change'); await t.wait(150); };
  /* Saisie puis sortie du champ : un seul « change » (celui du navigateur, ou envoyé si le navigateur n'en produit pas) */
  const fillChange = async (sel, v) => {
    await page.evaluate(q => { const el = document.querySelector(q); el.__changed = false; el.addEventListener('change', () => { el.__changed = true; }, { once: true }); }, sel);
    await page.fill(sel, v);
    await page.locator(sel).blur().catch(() => {});
    await t.wait(100);
    if (!(await page.evaluate(q => document.querySelector(q)?.__changed ?? true, sel))) await change(sel);
    await t.wait(150);
  };
  const noConfirm = () => page.evaluate(() => { window.__confirm = window.confirm; window.confirm = () => false; });
  const yesConfirm = () => page.evaluate(() => { if (window.__confirm) window.confirm = window.__confirm; });
  /* Fichier fabriqué dans la page et posé dans un champ « fichier » */
  const putFile = (sel, spec) => page.evaluate(async ([sl, sp]) => {
    let blob;
    if (sp.kind === 'gradient' || sp.kind === 'noise') {
      const cv = document.createElement('canvas');
      cv.width = sp.w; cv.height = sp.h;
      const g = cv.getContext('2d');
      if (sp.kind === 'gradient') {
        const gr = g.createLinearGradient(0, 0, sp.w, sp.h);
        gr.addColorStop(0, '#c8181d'); gr.addColorStop(1, '#f6d200');
        g.fillStyle = gr; g.fillRect(0, 0, sp.w, sp.h);
      } else {
        const img = g.createImageData(sp.w, sp.h);
        const a = new Uint32Array(img.data.buffer);
        for (let i = 0; i < a.length; i++) a[i] = ((Math.random() * 0xffffff) | 0) | 0xff000000;
        g.putImageData(img, 0, 0);
      }
      blob = await new Promise(r => cv.toBlob(r, sp.mime || 'image/png', 0.95));
    } else if (sp.kind === 'garbage') {
      const b = new Uint8Array(sp.size || 4096);
      crypto.getRandomValues(b);
      blob = new Blob([b]);
    } else blob = new Blob([sp.text || 'du texte'], { type: sp.type });
    const f = new File([blob], sp.name, { type: sp.type || blob.type });
    const input = document.querySelector(sl);
    const dt = new DataTransfer();
    dt.items.add(f);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [sel, spec]);
  const openVersions = async () => { await page.click('#fileMenu summary'); await page.click('#versionsBtn'); await page.waitForSelector('#versionsDialog[open]'); await t.wait(500); };
  const closeDialog = async () => { await page.keyboard.press('Escape'); await t.wait(200); };

  /* ===================== Versions : version automatique (première modification du jour) ===================== */
  await page.click('[data-left="site"]');
  await t.wait(200);
  await kase('versions-auto', ['version.auto', 'version.save.start', 'version.save.prune', 'version.save.ok', 'storage.version-save'], async () => {
    await fillChange('#leftBody [data-site="name"]', 'MAB – Médias Alternatifs Belges (test)');
  }, { wait: 'version.save.ok' });

  /* ===================== Réglages du site ===================== */
  await kase('pages-reglages-identite', ['settings.name', 'settings.refused', 'settings.base-url'], async () => {
    await fillChange('#leftBody [data-site="name"]', 'MAB – Médias Alternatifs Belges');
    await fillChange('#leftBody [data-site="baseUrl"]', 'http://www.media-alternatif.be');
    await fillChange('#leftBody [data-site="baseUrl"]', 'https://www.media-alternatif.be');
  });
  t.ok((await site()).baseUrl === 'https://www.media-alternatif.be', 'adresse du site en https enregistrée');

  await kase('pages-reglages-langues', ['settings.lang-remove', 'settings.lang-add'], async () => {
    await page.click('#leftBody [data-lang-toggle="en"]');
    await t.wait(250);
    await page.click('#leftBody [data-lang-toggle="en"]');
    await t.wait(250);
  });
  t.ok((await site()).languages.includes('en') && await page.locator('#leftBody [data-lang-toggle="fr"]').isDisabled(), 'langue rajoutée ; la langue principale ne peut pas être décochée');

  await kase('pages-reglages-design', ['settings.color', 'settings.color-name', 'settings.color-add', 'settings.color-remove', 'settings.font', 'settings.theme', 'settings.type-scale', 'settings.space-scale', 'settings.header', 'settings.footer-text'], async () => {
    await page.evaluate(() => { const i = document.querySelector('#leftBody [data-palette="c1"]'); i.value = '#a01014'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
    await t.wait(150);
    await page.fill('#leftBody [data-palette-name="c1"]', 'Rouge MAB');
    await page.press('#leftBody [data-palette-name="c1"]', 'Enter');
    await t.wait(150);
    await page.click('#leftBody #addColorBtn');
    await t.wait(250);
    const added = await page.locator('#leftBody [data-palette-delete]').last().getAttribute('data-palette-delete');
    await page.click(`#leftBody [data-palette-delete="${added}"]`);
    await t.wait(250);
    await page.selectOption('#leftBody [data-font="heading"]', 'system');
    await t.wait(150);
    await fillChange('#leftBody [data-theme="radius"]', '12');
    await fillChange('#leftBody [data-type-token="minSize"]', '17');
    await t.wait(150);
    await fillChange('#leftBody [data-space-token="minSize"]', '14');
    await t.wait(150);
    await page.click('#leftBody [data-header-burger]');
    await t.wait(150);
    await fillChange('#leftBody [data-footer="fr"]', '© 2026 MAB – coopérative des médias alternatifs');
  });
  t.ok((await site()).theme.palette.c1 === '#a01014' && (await site()).header.burger === false, 'couleur et en-tête enregistrés');

  await kase('pages-reglages-entete-blocs', ['settings.layout-customize', 'settings.layout-edit', 'settings.layout-reset'], async () => {
    await page.click('#leftBody [data-layout-edit="header"]');
    await t.wait(400);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(300);
    await page.click('[data-left="site"]');
    await t.wait(200);
    await page.click('#leftBody [data-layout-reset="header"]');
    await t.wait(300);
  });
  t.ok(!(await site()).layout?.header, 'en-tête revenu au défaut');

  /* Presets : créés depuis l'onglet Style (chapitre 3), gérés dans le panneau Site */
  await c.locator('main [data-type="heading"]').first().click();
  await t.wait(200);
  await page.click('[data-insp="style"]');
  await page.click('#inspector [data-preset-new]');
  await page.fill('#inspector [data-preset-name]', 'Titre MAB');
  await page.click('#inspector [data-preset-create]');
  await t.wait(300);
  await page.click('[data-left="site"]');
  await t.wait(200);
  await kase('pages-reglages-presets', ['settings.preset-rename', 'settings.preset-duplicate', 'settings.preset-delete-cancel', 'settings.preset-delete'], async () => {
    const pid = await page.locator('#leftBody [data-preset-rename]').first().getAttribute('data-preset-rename');
    await page.fill(`#leftBody [data-preset-rename="${pid}"]`, 'Titre principal');
    await page.press(`#leftBody [data-preset-rename="${pid}"]`, 'Enter');
    await t.wait(250);
    await page.click(`#leftBody [data-preset-duplicate="${pid}"]`);
    await t.wait(250);
    await noConfirm();
    await page.click(`#leftBody [data-preset-delete="${pid}"]`);
    await yesConfirm();
    await t.wait(150);
    await page.click(`#leftBody [data-preset-delete="${pid}"]`);
    await t.wait(250);
  });
  t.ok(Object.keys((await site()).presets || {}).length === 1, 'preset supprimé, la copie reste');

  /* ===================== Images ===================== */
  const logoFile = '#leftBody [data-field="logo"]';
  const logoUrl = '#leftBody .image-field:has([data-field="logo"]) input[type="url"]';
  await kase('images-import', ['image.import.start', 'image.import.decode', 'image.import.resize', 'image.import.encode', 'image.import.variant', 'image.import.ok', 'settings.logo'], async () => {
    await putFile(logoFile, { kind: 'gradient', w: 2000, h: 1200, name: 'logo-mab.png', type: 'image/png' });
  }, { wait: 'settings.logo' });
  let s = await site();
  const logoAsset = s.assets[String(s.header.logo).slice(6)];
  t.ok(logoAsset && logoAsset.width === 1600 && logoAsset.variants?.length === 2, 'image importée : 1600 px et 2 variantes');

  await kase('images-import-petite', ['image.import.start', 'image.import.decode', 'image.import.encode', 'image.import.ok'], async () => {
    await putFile(logoFile, { kind: 'gradient', w: 320, h: 120, mime: 'image/jpeg', name: 'logo-petit.jpg', type: 'image/jpeg' });
  }, { wait: 'image.import.ok' });

  await kase('images-sans-webp', ['image.import.webp-unsupported', 'image.import.ok'], async () => {
    await page.evaluate(() => {
      const orig = HTMLCanvasElement.prototype.toBlob;
      window.__restoreToBlob = () => { HTMLCanvasElement.prototype.toBlob = orig; };
      HTMLCanvasElement.prototype.toBlob = function (cb, type, q) { return orig.call(this, cb, type === 'image/webp' ? 'image/png' : type, q); };
    });
    const s0 = await mark(page);
    await putFile(logoFile, { kind: 'gradient', w: 400, h: 200, name: 'logo-jpeg.png', type: 'image/png' });
    await waitCode(page, 'image.import.ok', s0, 15000);
    await page.evaluate(() => window.__restoreToBlob());
  });
  s = await site();
  t.ok(s.assets[String(s.header.logo).slice(6)]?.mime === 'image/jpeg', 'sans WebP : image enregistrée en JPEG');

  await kase('images-type-refuse', ['image.type-refused', 'ui.toast'], async () => {
    await putFile(logoFile, { kind: 'text', name: 'logo.svg', type: 'image/svg+xml', text: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    await t.wait(300);
  }, { errors: ['inspector.image.fail'] });
  await kase('images-illisible', ['image.import.start', 'image.import.fail', 'ui.toast'], async () => {
    await putFile(logoFile, { kind: 'garbage', name: 'photo-abimee.png', type: 'image/png', size: 4096 });
  }, { wait: 'image.import.fail', errors: ['image.import.fail', 'inspector.image.fail'] });
  await kase('images-lourde', ['image.import.start', 'image.import.heavy', 'image.import.big-output', 'image.import.ok'], async () => {
    await putFile(logoFile, { kind: 'noise', w: 2000, h: 1600, name: 'photo-lourde.png', type: 'image/png' });
  }, { wait: 'image.import.ok' });

  await page.route('https://www.media-alternatif.be/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }));
  await kase('images-en-ligne', ['settings.logo', 'inspector.image-url'], async () => {
    await page.click('#leftBody .image-field:has([data-field="logo"]) button:has-text("Retirer")');
    await t.wait(300);
    await fillChange(logoUrl, 'https://www.media-alternatif.be/logo.png');
    await t.wait(200);
  });
  t.ok((await site()).header.logo === 'https://www.media-alternatif.be/logo.png', 'logo : une adresse en ligne https est acceptée');
  await page.click('#leftBody .image-field:has([data-field="logo"]) button:has-text("Retirer")');
  await t.wait(300);

  /* Adresse du site effacée : variante (utile plus loin pour le RSS) */
  await kase('pages-reglages-adresse-vide', ['settings.base-url'], async () => {
    await page.click('[data-left="site"]');
    await t.wait(150);
    await fillChange('#leftBody [data-site="baseUrl"]', '');
  });

  /* ===================== Pages et menu ===================== */
  await page.click('[data-left="pages"]');
  await t.wait(200);
  await kase('pages-creer', ['page.add', 'store.commit'], async () => {
    await page.fill('#newPageTitle', 'Notre équipe');
    await page.click('#addPageBtn');
    await t.wait(300);
  });
  const team = (await site()).pages.find(p => p.title.fr === 'Notre équipe');
  t.ok(team?.slug === 'notre-equipe' && await cur() === team.id, 'page créée et ouverte');

  await kase('pages-creer-variantes', ['page.add-refused', 'page.add'], async () => {
    await page.fill('#newPageTitle', '');
    await page.click('#addPageBtn');
    await t.wait(150);
    await page.fill('#newPageTitle', 'Notre équipe');
    await page.press('#newPageTitle', 'Enter');
    await t.wait(300);
  });
  const team2 = (await site()).pages.find(p => p.slug === 'notre-equipe-2');
  t.ok(!!team2, 'titre déjà pris : adresse notre-equipe-2');

  await kase('pages-supprimer', ['page.delete-cancel', 'page.delete'], async () => {
    await noConfirm();
    await page.click(`[data-page-delete="${team2.id}"]`);
    await yesConfirm();
    await t.wait(150);
    await page.click(`[data-page-delete="${team2.id}"]`);
    await t.wait(300);
  });
  s = await site();
  t.ok(!s.pages.some(p => p.id === team2.id), 'page supprimée');
  t.ok(await page.locator(`[data-page-delete="${s.pages[0].id}"]`).count() === 0, 'l’accueil n’a pas de bouton de suppression');

  await page.selectOption('#pageSelect', team.id);
  await t.wait(300);
  await page.click('[data-left="pages"]');
  await t.wait(200);
  await kase('pages-adresse', ['page.slug', 'page.refused', 'page.slug-suggest'], async () => {
    await page.fill(`[data-page-slug="${team.id}"][data-lang="fr"]`, 'equipe');
    await page.press(`[data-page-slug="${team.id}"][data-lang="fr"]`, 'Enter');
    await t.wait(300);
    await page.fill(`[data-page-slug="${team.id}"][data-lang="fr"]`, 'contact');
    await page.press(`[data-page-slug="${team.id}"][data-lang="fr"]`, 'Enter');
    await t.wait(300);
    await fillChange(`[data-page-title="${team.id}"][lang="nl"]`, 'Ons team');
    await page.click(`[data-slug-suggest="${team.id}"][data-lang="nl"]`);
    await t.wait(300);
  }, { errors: [] });
  s = await site();
  t.ok(s.pages.find(p => p.id === team.id).slug === 'equipe' && s.pages.find(p => p.id === team.id).slugs?.nl === 'ons-team', 'adresses FR et NL enregistrées ; doublon refusé');

  await kase('pages-titre-description', ['page.title', 'page.seo'], async () => {
    await fillChange(`[data-page-title="${team.id}"][lang="de"]`, 'Unser Team');
    await fillChange(`[data-page-seo="${team.id}"][lang="fr"]`, 'Les personnes qui font vivre la coopérative.');
    await fillChange(`[data-page-seo="${team.id}"][lang="nl"]`, 'x'.repeat(175));
  });

  await kase('pages-ordre-pied', ['page.move', 'page.footer-link', 'page.open'], async () => {
    await page.click(`[data-page-move="${team.id}"][data-dir="-1"]`);
    await t.wait(300);
    await page.click(`[data-page-footer="${team.id}"]`);
    await t.wait(300);
    await page.click(`[data-page-footer="${team.id}"]`);
    await t.wait(300);
    const home = (await site()).pages[0].id;
    await page.evaluate(id => { document.querySelector(`details[data-page="${id}"]`).open = true; }, home);
    await t.wait(100);
    await page.click(`[data-page-open="${home}"]`);
    await t.wait(300);
  });
  t.ok((await site()).pages[1].id === team.id, 'page montée dans le menu');

  await kase('pages-menu', ['page.menu.customize', 'page.menu.link-refused', 'page.menu.link-add', 'page.menu.indent', 'page.menu.outdent', 'page.menu.move', 'page.menu.label', 'page.menu.url', 'page.menu.remove', 'page.menu.page-add'], async () => {
    await page.click('[data-menu-customize]');
    await t.wait(300);
    await page.click('[data-menu-add-link]');
    await t.wait(150);
    await page.fill('[data-menu-link-label]', 'Facebook');
    await page.fill('[data-menu-link-url]', 'https://www.facebook.com/mab');
    await page.click('[data-menu-add-link]');
    await t.wait(300);
    const link = (await site()).menu.find(x => x.kind === 'link');
    await page.click(`[data-menu-item="${link.id}"] [data-menu-act="indent"]`);
    await t.wait(300);
    await page.click(`[data-menu-item="${link.id}"] [data-menu-act="outdent"]`);
    await t.wait(300);
    await page.click(`[data-menu-item="${link.id}"] [data-menu-act="up"]`);
    await t.wait(300);
    await page.fill(`[data-menu-label="${link.id}"]`, 'Notre page Facebook');
    await page.press(`[data-menu-label="${link.id}"]`, 'Enter');
    await t.wait(300);
    await fillChange(`[data-menu-url="${link.id}"]`, 'https://www.facebook.com/media.alternatif');
    await t.wait(150);
    const pageEntry = (await site()).menu.find(x => x.kind === 'page' && x.pageId === team.id);
    await page.click(`[data-menu-item="${pageEntry.id}"] [data-menu-act="remove"]`);
    await t.wait(300);
    await page.selectOption('[data-menu-add-page]', team.id);
    await t.wait(300);
  });
  s = await site();
  t.ok(s.menu.some(x => x.kind === 'link' && x.url.includes('media.alternatif')) && s.menu.some(x => x.pageId === team.id), 'menu personnalisé : lien et page');

  await kase('pages-menu-auto', ['page.menu.auto-cancel', 'page.menu.auto'], async () => {
    await noConfirm();
    await page.click('[data-menu-auto]');
    await yesConfirm();
    await t.wait(150);
    await page.click('[data-menu-auto]');
    await t.wait(300);
  });
  t.ok((await site()).menu === null, 'menu automatique rétabli');

  await kase('pages-accessibilite', ['page.a11y.open', 'page.a11y.refused', 'page.a11y.create'], async () => {
    await page.click('[data-a11y-page]');
    await page.waitForSelector('#a11yDialog[open]');
    await page.click('#a11yCreate');
    await t.wait(200);
    await page.fill('#a11yDialog [data-a11y="email"]', 'accessibilite@media-alternatif.be');
    await page.click('#a11yCreate');
    await t.wait(400);
  });
  t.ok((await site()).pages.some(p => p.footerLink && /accessib/.test(p.slug)), 'page Accessibilité créée avec un lien dans le pied');

  /* ===================== Collections ===================== */
  await page.click('[data-left="content"]');
  await t.wait(200);
  await kase('collections-creer', ['collection.new.kind', 'collection.create'], async () => {
    await page.click('#newCollectionBtn');
    await page.waitForSelector('#collectionNewDialog[open]');
    await page.click('#collectionNewDialog [data-kind="events"]');
    await page.click('#collectionNewDialog [data-col-create]');
    await t.wait(500);
  });
  let agenda = await colByKind('events');
  t.ok(agenda?.items.length === 3 && (await site()).pages.some(p => p.slug === 'agenda'), 'agenda créé avec 3 exemples et sa page');

  await kase('collections-creer-sans-page', ['collection.new.kind', 'collection.create'], async () => {
    await page.click('#newCollectionBtn');
    await page.waitForSelector('#collectionNewDialog[open]');
    await page.click('#collectionNewDialog [data-kind="members"]');
    await page.click('#collectionNewDialog [data-col-new-page]');
    await page.click('#collectionNewDialog [data-col-new-examples]');
    await page.click('#collectionNewDialog [data-col-create]');
    await t.wait(400);
  });
  const members = await colByKind('members');
  t.ok(members && members.items.length === 0, 'médias membres : sans page ni exemple');

  await page.click('[data-left="content"]');
  await t.wait(200);
  await kase('collections-ouvrir', ['collection.open', 'collection.tab'], async () => {
    await page.click(`#leftBody [data-collection="${agenda.id}"] [data-col-open]`);
    await page.waitForSelector('#collectionDialog[open]');
    await page.click('#collectionDialog [data-col-tab="fields"]');
    await page.click('#collectionDialog [data-col-tab="items"]');
    await t.wait(150);
  });

  let newId;
  await kase('collections-elements', ['collection.item.add', 'collection.item.value', 'collection.item.value-refused', 'collection.item.slug', 'collection.refused', 'collection.item.publish', 'collection.item.draft', 'collection.item.move', 'collection.item.duplicate', 'collection.item.select', 'collection.item.delete-cancel', 'collection.item.delete'], async () => {
    await page.click('#collectionDialog [data-item-add]');
    await t.wait(300);
    newId = await page.locator('#collectionDialog [data-item-form]').getAttribute('data-item-form');
    await page.locator('#collectionDialog [data-item-field-wrap="title"] input[lang="fr"]').fill('Fête de la radio à Couvin');
    await t.wait(200);
    await fillChange('#collectionDialog [data-item-field="date"]', '2099-06-21');
    await fillChange('#collectionDialog [data-item-field="link"]', 'javascript:alert(1)');
    await fillChange('#collectionDialog [data-item-field="link"]', 'https://billets.exemple.be/fete');
    await fillChange('#collectionDialog [data-item-slug]', 'fete-radio');
    const other = (await colByKind('events')).items[0].slug;
    await fillChange('#collectionDialog [data-item-slug]', other);
    await page.selectOption('#collectionDialog [data-item-status]', 'published');
    await t.wait(250);
    await page.selectOption('#collectionDialog [data-item-status]', 'draft');
    await t.wait(250);
    await page.selectOption('#collectionDialog [data-item-status]', 'published');
    await t.wait(250);
    await page.click('#collectionDialog [data-item-up]');
    await t.wait(250);
    await page.click('#collectionDialog [data-item-duplicate]');
    await t.wait(250);
    await page.click(`#collectionDialog [data-item="${newId}"]`);
    await t.wait(200);
    const copy = (await colByKind('events')).items.find(i => i.slug.startsWith('fete-radio-'));
    await page.click(`#collectionDialog [data-item="${copy.id}"]`);
    await t.wait(200);
    await noConfirm();
    await page.click('#collectionDialog [data-item-delete]');
    await yesConfirm();
    await t.wait(150);
    await page.click('#collectionDialog [data-item-delete]');
    await t.wait(300);
  });
  agenda = await colByKind('events');
  const fete = agenda.items.find(i => i.id === newId);
  t.ok(fete?.slug === 'fete-radio' && fete.values.link === 'https://billets.exemple.be/fete' && fete.status === 'published' && agenda.items.length === 4, 'élément : valeurs, adresse, publié ; copie supprimée');

  await kase('images-collection', ['image.import.start', 'image.import.ok', 'collection.item.value'], async () => {
    await page.click(`#collectionDialog [data-item="${newId}"]`);
    await t.wait(200);
    await putFile('#collectionDialog [data-item-field-wrap="image"] input[type="file"]', { kind: 'gradient', w: 1200, h: 800, name: 'fete-radio.png', type: 'image/png' });
  }, { wait: 'collection.item.value' });
  t.ok(String((await colByKind('events')).items.find(i => i.id === newId).values.image).startsWith('asset:'), 'image importée dans l’élément');

  await kase('collections-champs', ['collection.field.add', 'collection.refused', 'collection.field.rename', 'collection.field.i18n', 'collection.field.move', 'collection.field.options', 'collection.field.delete-cancel', 'collection.field.delete'], async () => {
    await page.click('#collectionDialog [data-col-tab="fields"]');
    await t.wait(200);
    await page.fill('#collectionDialog [data-field-new-label]', 'Tarif');
    await page.click('#collectionDialog [data-field-add]');
    await t.wait(250);
    await page.fill('#collectionDialog [data-field-new-label]', '');
    await page.click('#collectionDialog [data-field-add]');
    await t.wait(200);
    await fillChange('#collectionDialog [data-field-label="tarif"]', 'Prix');
    await page.click('#collectionDialog [data-field-i18n="tarif"]');
    await t.wait(250);
    await page.click('#collectionDialog [data-field-row="tarif"] button[aria-label="Monter"]');
    await t.wait(250);
    await page.fill('#collectionDialog [data-field-new-label]', 'Public');
    await page.selectOption('#collectionDialog [data-field-new-type]', 'select');
    await page.click('#collectionDialog [data-field-add]');
    await t.wait(250);
    await fillChange('#collectionDialog [data-field-options="public"]', 'Tout public\nEnfants\nAdultes');
    await noConfirm();
    await page.click('#collectionDialog [data-field-delete="public"]');
    await yesConfirm();
    await t.wait(150);
    await page.click('#collectionDialog [data-field-delete="public"]');
    await t.wait(250);
  });
  agenda = await colByKind('events');
  t.ok(agenda.fields.some(f => f.key === 'tarif' && f.label === 'Prix') && !agenda.fields.some(f => f.key === 'public'), 'champs : ajouté, renommé ; champ supprimé');
  t.ok(await page.locator(`#collectionDialog [data-field-delete="${agenda.titleField}"]`).isDisabled(), 'le champ titre ne peut pas être supprimé');

  await kase('collections-reglages', ['collection.rename', 'collection.slug', 'collection.refused', 'collection.setting', 'collection.rss-no-url'], async () => {
    await page.click('#collectionDialog [data-col-tab="settings"]');
    await t.wait(200);
    await fillChange('#collectionDialog [data-col-name]', 'Agenda du MAB');
    await fillChange('#collectionDialog [data-col-slug="fr"]', '');
    await fillChange('#collectionDialog [data-col-slug="nl"]', 'kalender');
    await page.click('#collectionDialog [data-col-detail]');
    await t.wait(200);
    await page.click('#collectionDialog [data-col-detail]');
    await t.wait(200);
    await page.click('#collectionDialog [data-col-rss]');
    await t.wait(200);
    await page.selectOption('#collectionDialog [data-col-sort]', 'date');
    await t.wait(150);
    await page.selectOption('#collectionDialog [data-col-sortdir]', 'desc');
    await t.wait(150);
  });
  agenda = await colByKind('events');
  t.ok(agenda.name === 'Agenda du MAB' && agenda.slug === 'agenda' && agenda.slugs?.nl === 'kalender' && agenda.settings.rss === true, 'réglages enregistrés ; adresse vide refusée');

  await kase('collections-csv-export', ['collection.csv-export'], async () => {
    await page.click('#collectionDialog [data-col-tab="items"]');
    await t.wait(200);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#collectionDialog [data-col-csv-export]')]);
    const txt = readFileSync(await dl.path(), 'utf8');
    t.ok(txt.includes('slug,status,title.fr') && txt.includes('fete-radio'), 'CSV exporté : en-tête et éléments');
  });

  const csvOk = join(t.shots, 'agenda-c16.csv');
  writeFileSync(csvOk, '﻿slug;title.fr;date;place;status_field\r\nfete-radio;;;Place du Bâti (Couvin);\r\n;Concert solidaire;2099-07-04;Couvin;Annulé\r\n;Soirée débat;2099-13-45;Namur;\r\n;Atelier radio;2099-08-01;Dinant;Inconnu\r\n');
  await kase('collections-csv-import', ['collection.csv-import.start', 'collection.csv-import.read', 'collection.csv-import.row-refused', 'collection.csv-import.ok', 'ui.toast'], async () => {
    await page.setInputFiles('#collectionDialog [data-col-csv-import]', csvOk);
  }, { wait: 'collection.csv-import.ok' });
  agenda = await colByKind('events');
  t.ok(agenda.items.some(i => i.slug === 'concert-solidaire') && agenda.items.find(i => i.id === newId).values.place === 'Place du Bâti (Couvin)' && !agenda.items.some(i => /soiree|atelier-radio/.test(i.slug)), 'import CSV : 1 ajouté, 1 mis à jour, 2 lignes refusées (date invalide, choix inconnu)');

  const csvBad = join(t.shots, 'membres-c16.csv');
  writeFileSync(csvBad, 'nom;ville\r\nRadio Couvin;Couvin\r\n');
  await kase('collections-csv-non-reconnu', ['collection.csv-import.start', 'collection.csv-import.fail'], async () => {
    await page.setInputFiles('#collectionDialog [data-col-csv-import]', csvBad);
  }, { wait: 'collection.csv-import.fail', errors: ['collection.csv-import.fail', 'ui.toast'] });

  await kase('collections-carte-detail', ['collection.item.preview', 'collection.edit-card', 'collection.edit-detail'], async () => {
    await page.click(`#collectionDialog [data-item="${newId}"]`);
    await t.wait(200);
    await page.click('#collectionDialog [data-item-preview]');
    await t.wait(500);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(300);
    await page.click('[data-left="content"]');
    await t.wait(200);
    await page.click(`#leftBody [data-collection="${agenda.id}"] [data-col-card]`);
    await t.wait(500);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(300);
    await page.click('[data-left="content"]');
    await t.wait(200);
    await page.click(`#leftBody [data-collection="${agenda.id}"] [data-col-open]`);
    await page.waitForSelector('#collectionDialog[open]');
    await page.click('#collectionDialog [data-col-edit-detail]');
    await t.wait(500);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(300);
  });

  await page.click('[data-left="content"]');
  await t.wait(200);
  await kase('collections-supprimer', ['collection.open', 'collection.delete-cancel', 'collection.delete'], async () => {
    await page.click(`#leftBody [data-collection="${members.id}"] [data-col-open]`);
    await page.waitForSelector('#collectionDialog[open]');
    await page.click('#collectionDialog [data-col-tab="settings"]');
    await t.wait(150);
    await noConfirm();
    await page.click('#collectionDialog [data-col-delete]');
    await yesConfirm();
    await t.wait(150);
    await page.click('#collectionDialog [data-col-delete]');
    await t.wait(300);
  });
  t.ok(!(await colByKind('members')), 'collection supprimée');

  /* ===================== Versions ===================== */
  await kase('versions-enregistrer', ['version.open', 'version.list', 'version.save.start', 'version.save.ok', 'version.unnamed', 'storage.version-save'], async () => {
    await openVersions();
    await page.fill('#versionsDialog [data-version-name]', 'Avant les essais');
    await page.click('#versionSave');
    await t.wait(400);
    await page.click('#versionSave');
    await t.wait(400);
  });
  t.ok(await page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' }).count() === 1 && await page.locator('#versionsDialog [data-version]', { hasText: 'Version sans nom' }).count() === 1, 'versions nommée et sans nom listées');

  await kase('versions-supprimer', ['version.delete', 'storage.version-delete', 'version.list'], async () => {
    await page.locator('#versionsDialog [data-version]', { hasText: 'Version sans nom' }).locator('[data-version-delete]').click();
    await t.wait(400);
  });
  await closeDialog();

  /* Modification, puis restauration (avec nettoyage : 31 anciennes versions automatiques simulées) */
  const before = (await site()).pages.length;
  await page.click('[data-left="pages"]');
  await page.fill('#newPageTitle', 'Page jetable');
  await page.click('#addPageBtn');
  await t.wait(300);
  await page.evaluate(async () => {
    const light = { ...structuredClone(window.__atelier.site), assets: {} };
    const db = await new Promise((res, rej) => { const r = indexedDB.open('atelier-v2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise((res, rej) => {
      const tx = db.transaction('versions', 'readwrite');
      for (let i = 0; i < 31; i++) {
        const at = new Date(Date.UTC(2025, 0, 1 + i, 9)).toISOString();
        tx.objectStore('versions').put({ id: `v_ancienne${i}`, at, name: '', kind: 'auto', summary: { pages: light.pages.length, components: 0, languages: light.languages.length, name: light.name }, site: light }, `v_ancienne${i}`);
      }
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
  await openVersions();
  await kase('versions-restaurer-annuler', ['version.restore.start', 'version.restore.cancel'], async () => {
    await noConfirm();
    await page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' }).locator('[data-version-restore]').click();
    await yesConfirm();
    await t.wait(200);
  });
  await kase('versions-restaurer', ['version.restore.start', 'version.restore.loaded', 'version.save.start', 'version.save.prune', 'version.save.ok', 'version.restore.safety', 'version.restore.ok', 'storage.version-delete'], async () => {
    await page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' }).locator('[data-version-restore]').click();
  }, { wait: 'version.restore.ok' });
  t.ok((await site()).pages.length === before, 'restaurer : la page jetable a disparu');
  await openVersions();
  t.ok(await page.locator('#versionsDialog .version--safety').count() >= 1 && await page.locator('#versionsDialog .version--auto').count() <= 30, 'version de sécurité enregistrée ; 30 versions automatiques au plus');

  await kase('versions-introuvable', ['version.restore.start', 'storage.version-missing', 'version.restore.fail', 'ui.toast'], async () => {
    const vid = await page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' }).getAttribute('data-version');
    await page.evaluate(id => new Promise((res, rej) => {
      const r = indexedDB.open('atelier-v2');
      r.onsuccess = () => { const tx = r.result.transaction('versions', 'readwrite'); tx.objectStore('versions').delete(id); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); };
      r.onerror = () => rej(r.error);
    }), vid);
    await page.locator(`#versionsDialog [data-version="${vid}"] [data-version-restore]`).click();
  }, { wait: 'version.restore.fail', errors: ['version.restore.fail', 'ui.toast'] });

  await kase('versions-stockage-plein', ['version.save.start', 'version.save.fail', 'ui.toast'], async () => {
    await page.evaluate(() => {
      const orig = IDBObjectStore.prototype.put;
      window.__restorePut = () => { IDBObjectStore.prototype.put = orig; };
      IDBObjectStore.prototype.put = function () { throw new DOMException('Quota dépassé (simulé)', 'QuotaExceededError'); };
    });
    await page.fill('#versionsDialog [data-version-name]', 'Essai stockage plein');
    await page.click('#versionSave');
    await t.wait(400);
    await page.evaluate(() => window.__restorePut());
  }, { wait: 'version.save.fail', errors: ['version.save.fail', 'ui.toast', 'storage.save-fail'] });
  await closeDialog();

  await kase('versions-liste-illisible', ['version.open', 'storage.versions-fail', 'version.list'], async () => {
    await page.evaluate(() => {
      const orig = IDBObjectStore.prototype.getAll;
      window.__restoreGetAll = () => { IDBObjectStore.prototype.getAll = orig; };
      IDBObjectStore.prototype.getAll = function () { throw new DOMException('Lecture impossible (simulée)', 'UnknownError'); };
    });
    await openVersions();
    await page.evaluate(() => window.__restoreGetAll());
  }, { errors: ['storage.versions-fail'] });
  t.ok((await page.locator('#versionsDialog .version-list').textContent()).includes('Aucune version'), 'liste illisible : « Aucune version » affiché');
  await closeDialog();
}
