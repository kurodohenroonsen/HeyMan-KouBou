/* Cycle 13 : collections (agenda), éléments, champs, carte et page de détail reliées, export, iCal, axe-core. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AXE = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'axe-core', 'axe.min.js');

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const colOf = async () => Object.values((await site()).collections)[0];
  const cards = () => c.locator('.w-collection-list .cl__item:not([hidden])');

  /* --- 1. créer l'agenda avec sa page et des exemples --- */
  await page.click('[data-left="content"]');
  await t.wait(200);
  t.ok(await page.locator('#leftBody .col-empty').count() === 1, 'panneau Contenus : aucune collection au départ');
  await page.click('#newCollectionBtn');
  await t.wait(200);
  await page.click('#collectionNewDialog [data-kind="events"]');
  t.ok(await page.locator('#collectionNewDialog [data-col-new-name]').inputValue() === 'Agenda', 'type Agenda : nom proposé');
  await page.click('#collectionNewDialog [data-col-create]');
  await t.wait(600);
  let col = await colOf();
  let s = await site();
  const agendaPage = s.pages.find(p => p.slug === 'agenda');
  t.ok(col && col.items.length === 3 && agendaPage, 'collection créée avec 3 exemples et la page /agenda/');
  t.ok(await page.locator('#pageSelect').inputValue() === agendaPage.id, 'la page de liste est affichée');
  t.ok(await cards().count() === 3, `la liste montre 3 cartes (${await cards().count()})`);
  t.ok((await cards().first().textContent()).includes('Assemblée générale'), 'carte : titre de l’élément (exemple neutre, cycle 28)');
  t.ok(await c.locator('.w-collection-list .fld').first().locator('svg').count() === 1, 'carte : date avec icône');
  t.ok(await page.locator('#leftBody [data-collection]').count() === 1, 'panneau Contenus : la collection est listée');

  /* --- 2. modifier un élément : la page suit en direct --- */
  await page.click('#leftBody [data-col-open]');
  await t.wait(300);
  t.ok(await page.locator('#collectionDialog [data-item]').count() === 3, 'fenêtre de la collection : 3 éléments');
  const titleFr = page.locator('#collectionDialog [data-item-field-wrap="title"] input[lang="fr"]');
  await titleFr.fill('Assemblée générale 2026');
  await t.wait(500);
  t.ok((await cards().first().textContent()).includes('Assemblée générale 2026'), 'titre modifié : la carte suit');
  t.ok((await page.locator('#collectionDialog [data-item].is-current').textContent()).includes('Assemblée générale 2026'), 'la liste des éléments suit aussi');
  col = await colOf();
  t.ok(col.items[0].slug === 'assemblee-generale-du-mab', 'l’adresse ne change pas toute seule (liens stables)');
  await page.selectOption('#collectionDialog [data-item-status]', 'draft');
  await t.wait(400);
  t.ok(await cards().count() === 2, 'brouillon : retiré de la liste');
  await page.selectOption('#collectionDialog [data-item-status]', 'published');
  await t.wait(300);

  /* --- 3. nouvel élément, valeurs vérifiées --- */
  await page.click('#collectionDialog [data-item-add]');
  await t.wait(300);
  t.ok(await page.locator('#collectionDialog [data-item]').count() === 4, 'élément ajouté (brouillon)');
  await page.locator('#collectionDialog [data-item-field-wrap="title"] input[lang="fr"]').fill('Fête de la radio à Couvin');
  await page.locator('#collectionDialog [data-item-field="date"]').fill('2099-06-21');
  await page.locator('#collectionDialog [data-item-field="date"]').dispatchEvent('change');
  await page.locator('#collectionDialog [data-item-field="time"]').fill('18:30');
  await page.locator('#collectionDialog [data-item-field="time"]').dispatchEvent('change');
  await page.locator('#collectionDialog [data-item-field-wrap="place"] input').fill('Place du Bâti');
  await page.locator('#collectionDialog [data-item-field="link"]').fill('javascript:alert(1)');
  await page.locator('#collectionDialog [data-item-field="link"]').dispatchEvent('change');
  await t.wait(300);
  t.ok(await page.locator('#collectionDialog [data-item-field="link"][aria-invalid="true"]').count() === 1, 'lien javascript: refusé');
  await page.locator('#collectionDialog [data-item-field="link"]').fill('https://billets.exemple.be/fete');
  await page.locator('#collectionDialog [data-item-field="link"]').dispatchEvent('change');
  await page.fill('#collectionDialog [data-item-slug]', 'fete-radio');
  await page.locator('#collectionDialog [data-item-slug]').dispatchEvent('change');
  await t.wait(200);
  await page.selectOption('#collectionDialog [data-item-status]', 'published');
  await t.wait(400);
  col = await colOf();
  const fete = col.items.find(i => i.slug === 'fete-radio');
  t.ok(fete && fete.values.date === '2099-06-21' && fete.values.time === '18:30' && fete.values.link === 'https://billets.exemple.be/fete' && fete.status === 'published', 'valeurs enregistrées (date, heure, lien sûr, adresse, publié)');
  t.ok(await cards().count() === 4 && (await cards().last().textContent()).includes('Fête de la radio'), 'la liste « à venir » le place en dernier (date la plus lointaine)');

  /* --- 4. champ ajouté --- */
  await page.click('#collectionDialog [data-col-tab="fields"]');
  await t.wait(200);
  await page.fill('#collectionDialog [data-field-new-label]', 'Tarif');
  await page.click('#collectionDialog [data-field-add]');
  await t.wait(300);
  t.ok(await page.locator('#collectionDialog [data-field-row="tarif"]').count() === 1, 'champ « Tarif » ajouté');
  await page.click('#collectionDialog [data-col-tab="items"]');
  await t.wait(200);
  await page.click(`#collectionDialog [data-item="${fete.id}"]`);
  await t.wait(200);
  await page.locator('#collectionDialog [data-item-field-wrap="tarif"] input[lang="fr"]').fill('Gratuit');
  await t.wait(300);

  /* --- 5. la carte : relier, ajouter un champ --- */
  await page.click('#collectionDialog [data-col-edit-card]');
  await t.wait(600);
  t.ok(await page.locator('#editBanner:not([hidden])').count() === 1 && (await page.locator('#editBanner').textContent()).includes('carte'), 'édition de la carte : bandeau');
  const card = c.locator('.cl__item:not(.is-preview)').first();
  t.ok(await card.locator('[data-node]').count() > 3, 'la carte est modifiable (éléments sélectionnables)');
  await card.locator('[data-type="heading"]').click();
  await t.wait(250);
  t.ok(await page.locator('#inspector .is-bound').count() >= 1 && (await page.locator('#inspector .is-bound').first().textContent()).includes('Titre'), 'titre de la carte : relié au champ « Titre »');
  await card.locator('[data-type="heading"] [data-edit]').dblclick();
  await t.wait(300);
  t.ok(await page.locator('#toasts .toast', { hasText: 'vient du champ' }).count() >= 1, 'texte relié : pas d’édition directe, message clair');
  await page.click('[data-left="widgets"]');
  await page.click('.lib-item[data-type="item-field"]');
  await t.wait(300);
  await page.click('[data-insp="content"]');
  await page.selectOption('#inspector [data-field="field"]', 'tarif');
  await t.wait(200);
  await page.selectOption('#inspector [data-field="icon"]', 'tag');
  await t.wait(200);
  await page.locator('#inspector [data-field="label"][lang="fr"]').fill('Tarif :');
  await t.wait(400);
  col = await colOf();
  let hasField = false;
  const walk = n => { if (n.type === 'item-field' && n.props.field === 'tarif') hasField = true; (n.children || []).forEach(walk); };
  walk(col.card);
  t.ok(hasField, 'widget Champ « Tarif » ajouté à la carte');
  await page.selectOption('#editBanner [data-preview-item]', fete.id);
  await t.wait(600);
  t.ok((await c.locator('.cl__item:not(.is-preview)').first().textContent()).includes('Gratuit'), 'aperçu avec un autre élément : sa valeur s’affiche');
  await page.click('#editBanner [data-edit-done]');
  await t.wait(500);
  t.ok((await cards().last().textContent()).includes('Tarif : Gratuit'), 'toutes les cartes suivent le modèle');

  /* --- 6. page de détail --- */
  await page.click('[data-left="content"]');
  await page.click(`#leftBody [data-col-detail]`);
  await t.wait(600);
  t.ok(await c.locator('main h1').count() === 1, 'page de détail : titre principal (H1) relié');
  await page.selectOption('#editBanner [data-preview-item]', fete.id);
  await t.wait(600);
  t.ok((await c.locator('main h1').textContent()).includes('Fête de la radio à Couvin'), 'aperçu : titre de l’élément choisi');
  t.ok((await c.locator('main').textContent()).includes('18:30'), 'aperçu : date et heure');
  await page.click('#editBanner [data-edit-done]');
  await t.wait(400);

  /* --- 7. inspecteur de la liste, Ctrl+K --- */
  await c.locator('.w-collection-list').first().click();
  await t.wait(250);
  await page.click('[data-insp="content"]');
  t.ok(await page.locator('#inspector [data-list-manage]').count() === 1, 'inspecteur de la liste : gérer, carte, page de détail');
  await page.fill('#inspector [data-field="limit"]', '2');
  await t.wait(400);
  t.ok(await cards().count() === 2, 'nombre maximum : 2 cartes');
  await page.keyboard.press('Control+k');
  await t.wait(200);
  await page.keyboard.type('contenus agenda');
  await t.wait(200);
  await page.keyboard.press('Enter');
  await t.wait(300);
  t.ok(await page.locator('#collectionDialog[open]').count() === 1, 'Ctrl+K « Contenus : Agenda » ouvre la collection');

  /* --- 8. import CSV --- */
  const csv = join(t.shots, 'agenda13.csv');
  writeFileSync(csv, '﻿title.fr;date;place;status_field\r\nConcert solidaire;2099-07-04;Couvin;Annulé\r\n');
  await page.setInputFiles('#collectionDialog [data-col-csv-import]', csv);
  await t.wait(500);
  col = await colOf();
  const concert = col.items.find(i => i.slug === 'concert-solidaire');
  t.ok(concert && concert.values.status === 'cancelled', 'import CSV : élément ajouté, statut reconnu par son libellé');
  await page.keyboard.press('Escape');
  await t.wait(200);

  /* --- 9. traductions --- */
  await page.click('#i18nBtn');
  await t.wait(400);
  t.ok(await page.locator('#i18nDialog').textContent().then(x => x.includes('Contenus « Agenda »')), 'tableau des traductions : textes des éléments présents');
  await page.keyboard.press('Escape');
  await t.wait(200);

  /* --- 10. export : pages de détail, iCal, données structurées, accessibilité --- */
  await page.click('#exportZipBtn');
  await t.wait(300);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export13');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const files = readdirSync(join(dir, 'site'), { recursive: true }).map(String);
  t.ok(files.includes('agenda/fete-radio/index.html') && files.includes('nl/agenda/fete-radio/index.html'), 'pages de détail dans chaque langue');
  t.ok(files.includes('agenda/calendar.ics') && files.includes('agenda/fete-radio/event.ics'), 'agenda .ics complet et par événement');
  const detail = readFileSync(join(dir, 'site', 'agenda', 'fete-radio', 'index.html'), 'utf8');
  const ev = [...detail.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1])).find(x => x['@type'] === 'Event');
  t.ok(ev && ev.startDate === '2099-06-21T18:30:00+02:00' && ev.location?.name === 'Place du Bâti', 'données structurées Event');
  t.ok(detail.includes('href="event.ics"') && detail.includes('href="https://billets.exemple.be/fete"'), 'boutons « Ajouter à mon agenda » et billetterie');
  t.ok(detail.includes('href="../"'), 'lien retour vers la liste');
  const ics = readFileSync(join(dir, 'site', 'agenda', 'fete-radio', 'event.ics'), 'utf8');
  t.ok(ics.includes('DTSTART;TZID=Europe/Brussels:20990621T183000') && ics.includes('SUMMARY:Fête de la radio à Couvin'), 'fichier .ics de l’événement');
  const list = readFileSync(join(dir, 'site', 'agenda', 'index.html'), 'utf8');
  t.ok(list.includes('data-when="upcoming"') && list.includes('href="fete-radio/"'), 'page de liste : cartes liées aux pages de détail');

  const ctx = await t.browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  await p.route(/^https?:/, r => r.abort());
  for (const [f, w] of [[join('agenda', 'index.html'), 1280], [join('agenda', 'index.html'), 390], [join('agenda', 'fete-radio', 'index.html'), 1280], [join('nl', 'agenda', 'fete-radio', 'index.html'), 390]]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto('file://' + join(dir, 'site', f));
    await p.addScriptTag({ path: AXE });
    const res = await p.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return r.violations.map(v => `${v.id} (${v.nodes.length}) : ${v.nodes[0]?.target?.join(' ')}`);
    });
    t.ok(res.length === 0, `axe-core ${f} à ${w} px : 0 violation WCAG 2.1 AA` + (res.length ? ' — ' + res.join(' | ') : ''));
  }
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.goto('file://' + join(dir, 'site', 'agenda', 'index.html'));
  await p.waitForTimeout(200);
  t.ok(await p.locator('.cl__item:not([hidden])').count() === 2, 'site publié : le script garde 2 événements à venir');
  await p.screenshot({ path: `${t.shots}/cycle13-publie.png` });
  await p.goto('file://' + join(dir, 'site', 'agenda', 'fete-radio', 'index.html'));
  await p.screenshot({ path: `${t.shots}/cycle13-detail.png`, fullPage: true });
  await ctx.close();
  await page.screenshot({ path: `${t.shots}/cycle13.png` });
}
