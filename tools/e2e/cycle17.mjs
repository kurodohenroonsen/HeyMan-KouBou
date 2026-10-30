/* Cycle 17 : contenus intelligents (faux Gemini Nano) — affiche → élément, texte collé → éléments, chapô et titres,
   résumé de la relecture, palette depuis le logo ; journal attendu de chaque cas et extraits pour le guide. */
import { deflateSync } from 'node:zlib';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture } from './logs.mjs';

/* PNG minimal (RGBA) sans dépendance */
function png(w, h, pixel) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = pixel(x, y); const o = y * (w * 4 + 1) + 1 + x * 4; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a; }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const colByKind = async kind => Object.values((await site()).collections || {}).find(x => x.kind === kind);
  const installFake = () => page.evaluate(() => {
    window.__atelierAI = {
      status: { prompt: 'available', multimodal: 'available', summarizer: 'available', rewriter: 'unavailable', writer: 'unavailable', proofreader: 'unavailable', translator: 'available', detector: 'available' },
      has: { prompt: true, multimodal: true, summarizer: true, translator: true },
      calls: [],
      async prompt(req) {
        const keys = Object.keys(req.schema?.properties || {});
        this.calls.push({ api: 'prompt', keys, images: req.images?.length || 0 });
        if (keys.includes('items')) return JSON.stringify({ items: [
          { name: 'Zin TV', logo: '', intro: 'Télévision participative bruxelloise.', type: 'Télévision', city: 'Bruxelles', website: 'zintv.org' },
          { name: 'Radio Air Libre', intro: 'Radio associative à Uccle.', type: 'radio', city: 'Uccle', website: 'https://www.radioairlibre.be' },
          { name: 'ZIN TV', intro: 'Doublon dans le mail.', type: 'tv', city: 'Bruxelles', website: '' }
        ] });
        if (keys.includes('date_year_shown')) return JSON.stringify({ title: 'Nuit des radios libres', date: 'samedi 14 décembre', date_year_shown: false, time: '14h', endDate: '31 février', endDate_year_shown: false, endTime: '23h30', place: 'Maison du Peuple', address: 'Parvis de Saint-Gilles 37, 1060 Bruxelles', description: 'Ateliers, débats et concerts.\n\nEntrée libre.', status: 'Prévu', link: 'mediaslibres.be' });
        if (keys.includes('titles')) return JSON.stringify({ titles: ['Le MAB part en tournée dans les quartiers', 'Tournée des médias libres', 'Le MAB part en tournée dans les quartiers'] });
        if (keys.includes('tasks')) { const ids = [...req.user.matchAll(/(cm_[A-Za-z0-9_-]+)/g)].map(m => m[1]); return JSON.stringify({ tasks: ids.slice(0, 1).map(id => ({ id, task: 'Raccourcir le titre de la page' })) }); }
        if (keys.includes('excerpt')) return JSON.stringify({ excerpt: 'Une tournée pour rencontrer les habitants.' });
        return '{}';
      },
      async summarize(req) {
        this.calls.push({ api: 'summarizer', type: req.type });
        if (req.type === 'teaser') return 'Le MAB sillonne les maisons de quartier pour faire découvrir les médias libres et leurs ateliers.';
        if (req.type === 'key-points') return '- Raccourcir le titre principal.\n- Vérifier l’adresse de contact.';
        return 'Résumé.';
      },
      async translate(req) { this.calls.push({ api: 'translator', to: req.to }); return `[${req.to}] ${req.text}`; }
    };
  });
  await installFake();

  /* --- collections : agenda, actualités, membres --- */
  await page.click('[data-left="content"]');
  for (const kind of ['events', 'news', 'members']) {
    await page.click('#newCollectionBtn');
    await t.wait(150);
    await page.click(`#collectionNewDialog [data-kind="${kind}"]`);
    await page.click('#collectionNewDialog [data-col-create]');
    await t.wait(500);
  }
  t.ok(!!(await colByKind('events')) && !!(await colByKind('news')) && !!(await colByKind('members')), 'agenda, actualités et membres créés');

  /* ===== A. Affiche → élément ===== */
  const events = await colByKind('events');
  await page.click('[data-left="content"]');
  await t.wait(150);
  await page.click(`#leftBody [data-col-open="${events.id}"]`);
  await t.wait(300);
  let s = await mark(page);
  await page.click('#collectionDialog [data-smart-poster]');
  await page.waitForSelector('#smartDialog[open]');
  const poster = png(240, 320, (x, y) => (y < 80 ? [242, 53, 63, 255] : [255, 248, 220, 255]));
  await page.setInputFiles('#smartDialog [data-smart-file]', { name: 'affiche-festival.png', mimeType: 'image/png', buffer: poster });
  await page.waitForFunction(() => !document.querySelector('#smartDialog [data-smart-read]')?.disabled);
  await page.click('#smartDialog [data-smart-read]');
  await page.waitForSelector('#smartDialog [data-smart-item]');
  t.ok(await page.locator('#smartDialog [data-smart-item]').count() === 1, 'affiche : un élément proposé');
  t.ok(await page.locator('#smartDialog [data-smart-dropped="endDate"]').count() === 1, 'affiche : date impossible écartée et signalée');
  t.ok(/14\/12|14 déc/.test(await page.textContent('#smartDialog [data-smart-item]')), 'affiche : date sans année → prochaine occurrence');
  await page.click('#smartDialog [data-smart-create]');
  await waitCode(page, 'smart.poster.ok', s);
  let es = await since(page, s);
  expectCodes(t, es, ['smart.poster.start', 'image.import.ok', 'smart.poster.image', 'smart.poster.read', 'ai.extract.start', 'ai.extract.call', 'ai.extract.reply', 'ai.extract.dropped', 'ai.extract.ok', 'smart.poster.preview', 'smart.poster.ok'], 'affiche');
  expectNoErrors(t, es, 'affiche');
  capture('intelligent-affiche', es);
  let ev = await colByKind('events');
  const created = ev.items.find(i => i.values.title?.fr === 'Nuit des radios libres');
  t.ok(created && created.status === 'draft', 'affiche : brouillon créé');
  t.ok(created?.values.date === '2026-12-14' || /^\d{4}-12-14$/.test(created?.values.date || ''), `affiche : date ${created?.values.date}`);
  t.ok(created?.values.time === '14:00' && created?.values.endTime === '23:30' && created?.values.status === 'scheduled' && created?.values.link === 'https://mediaslibres.be', 'affiche : heure, statut, lien normalisés');
  t.ok(/^asset:/.test(created?.values.image || ''), 'affiche : la photo devient l’image de l’élément');
  t.ok((await site()).mt?.[`ci:${ev.id}:${created?.id}:title|fr`] === 'ai', 'affiche : titre marqué « à relire »');
  t.ok(await page.locator('#collectionDialog[open]').count() === 1 && await page.locator(`#collectionDialog [data-item="${created?.id}"].is-current`).count() === 1, 'affiche : la fenêtre montre le brouillon créé');
  await page.screenshot({ path: `${t.shots}/c17-affiche.png` });

  /* variante : fermer sans créer ; erreur : IA sans images */
  s = await mark(page);
  await page.click('#collectionDialog [data-smart-poster]');
  await page.waitForSelector('#smartDialog[open]');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.__atelierAI.has.multimodal = false; window.__atelierAI.status.multimodal = 'unavailable'; });
  await page.click('#collectionDialog [data-smart-poster]');
  await page.waitForSelector('#smartDialog[open]');
  await page.setInputFiles('#smartDialog [data-smart-file]', { name: 'affiche.png', mimeType: 'image/png', buffer: poster });
  await page.waitForFunction(() => !document.querySelector('#smartDialog [data-smart-read]')?.disabled);
  await page.click('#smartDialog [data-smart-read]');
  await waitCode(page, 'smart.poster.read-fail', s);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.__atelierAI.has.multimodal = true; window.__atelierAI.status.multimodal = 'available'; });
  es = await since(page, s);
  expectCodes(t, es, ['smart.poster.cancel', 'ai.extract.absent', 'smart.poster.read-fail'], 'affiche : fermée, IA sans images');
  capture('intelligent-affiche-erreurs', es);
  await page.keyboard.press('Escape');

  /* ===== B. Texte collé → éléments ===== */
  const members = await colByKind('members');
  await page.click('[data-left="content"]');
  await t.wait(150);
  await page.click(`#leftBody [data-col-open="${members.id}"]`);
  await t.wait(300);
  s = await mark(page);
  const before = members.items.length;
  await page.click('#collectionDialog [data-smart-paste]');
  await page.waitForSelector('#smartDialog[open]');
  await page.click('#smartDialog [data-smart-read]');
  await page.fill('#smartDialog [data-smart-text]', 'Bonjour, voici les nouveaux membres : Zin TV (télé participative, Bruxelles, zintv.org), Radio Air Libre (Uccle) — et encore ZIN TV pour mémoire.');
  await page.click('#smartDialog [data-smart-read]');
  await page.waitForSelector('#smartDialog [data-smart-item]');
  t.ok(await page.locator('#smartDialog [data-smart-item]').count() === 3, 'texte : 3 éléments proposés');
  t.ok(!/\bnull\b|undefined/.test(await page.textContent('#smartDialog')), 'texte : aucun « null » affiché');
  t.ok(await page.locator('#smartDialog [data-smart-pick]:checked').count() === 2, 'texte : le doublon est décoché');
  t.ok(/Créer 2 brouillons/.test(await page.textContent('#smartDialog [data-smart-create]')), 'texte : bouton « Créer 2 brouillons »');
  await page.click('#smartDialog [data-smart-create]');
  await waitCode(page, 'smart.paste.ok', s);
  es = await since(page, s);
  expectCodes(t, es, ['smart.paste.start', 'smart.paste.empty', 'smart.paste.read', 'ai.extract.start', 'ai.extract.duplicates', 'ai.extract.ok', 'smart.paste.preview', 'smart.paste.ok'], 'texte collé');
  expectNoErrors(t, es, 'texte collé');
  capture('intelligent-texte', es);
  const mem = await colByKind('members');
  t.ok(mem.items.length === before + 2, `texte : 2 brouillons créés (${mem.items.length - before})`);
  const zin = mem.items.find(i => i.values.name === 'Zin TV');
  t.ok(zin?.values.type === 'tv' && zin?.values.website === 'https://zintv.org' && zin?.status === 'draft', 'texte : choix par libellé, lien complété, brouillon');
  await page.keyboard.press('Escape');

  /* ===== C. Chapô et titres ===== */
  const news = await colByKind('news');
  await page.click('[data-left="content"]');
  await t.wait(150);
  await page.click(`#leftBody [data-col-open="${news.id}"]`);
  await t.wait(300);
  s = await mark(page);
  await page.click('#collectionDialog [data-smart-excerpt]');
  await page.waitForSelector('#collectionDialog [data-smart-proposal-text]');
  await page.click('#collectionDialog [data-smart-apply]');
  await waitCode(page, 'smart.excerpt.ok', s);
  let n = await colByKind('news');
  const art = n.items.find(i => i.id === (news.items[0]?.id));
  t.ok(/maisons de quartier/.test(art?.values.excerpt?.fr || ''), 'chapô : proposition du Summarizer appliquée');
  t.ok((await site()).mt?.[`ci:${news.id}:${art.id}:excerpt|fr`] === 'ai', 'chapô : marqué « à relire »');
  await page.click('#collectionDialog [data-smart-headlines]');
  await page.waitForSelector('#collectionDialog [data-smart-title]');
  t.ok(await page.locator('#collectionDialog [data-smart-title]').count() === 2, 'titres : doublon retiré');
  await page.locator('#collectionDialog [data-smart-title]').nth(1).click();
  await waitCode(page, 'smart.headlines.ok', s);
  n = await colByKind('news');
  t.ok(n.items.find(i => i.id === art.id)?.values.title?.fr === 'Tournée des médias libres', 'titres : titre choisi appliqué');
  await page.locator('#collectionDialog .audit__head h2').click();
  await page.keyboard.press('Control+z');
  await t.wait(200);
  n = await colByKind('news');
  t.ok(n.items.find(i => i.id === art.id)?.values.title?.fr !== 'Tournée des médias libres', 'titres : Ctrl+Z revient au titre précédent');
  es = await since(page, s);
  expectCodes(t, es, ['smart.excerpt.start', 'ai.excerpt.start', 'ai.excerpt.call', 'ai.excerpt.ok', 'smart.excerpt.proposal', 'smart.excerpt.ok', 'smart.headlines.start', 'ai.headlines.ok', 'smart.headlines.proposal', 'smart.headlines.ok', 'store.undo'], 'chapô et titres');
  capture('intelligent-chapo-titres', es);
  /* variante : sans Summarizer → Prompt API ; article sans texte */
  s = await mark(page);
  await page.evaluate(() => { window.__atelierAI.has.summarizer = false; window.__atelierAI.status.summarizer = 'unavailable'; });
  await page.click('#collectionDialog [data-smart-excerpt]');
  await page.waitForSelector('#collectionDialog [data-smart-proposal-text]');
  t.ok(/rencontrer les habitants/.test(await page.textContent('#collectionDialog [data-smart-proposal-text]')), 'chapô : repli sur la Prompt API');
  await page.click('#collectionDialog [data-smart-proposal] button:has-text("Annuler")');
  await page.click('#collectionDialog [data-item-add]');
  await t.wait(300);
  await page.click('#collectionDialog [data-smart-excerpt]');
  await waitCode(page, 'smart.excerpt.cancel', s);
  await page.evaluate(() => { window.__atelierAI.has.summarizer = true; window.__atelierAI.status.summarizer = 'available'; });
  es = await since(page, s);
  expectCodes(t, es, ['ai.excerpt.fallback', 'smart.excerpt.cancel'], 'chapô : repli et article vide');
  capture('intelligent-chapo-variantes', es);
  await page.keyboard.press('Escape');

  /* ===== D. Résumé de la relecture ===== */
  const heading = c.locator('[data-type="heading"]').first();
  await page.selectOption('#pageSelect', (await site()).pages[0].id);
  await t.wait(400);
  await c.locator('[data-type="heading"]').first().click();
  await page.click('#commentsBtn');
  await t.wait(200);
  for (const [i, txt] of ['Le titre est trop long.', 'Vérifier l’adresse de contact.'].entries()) {
    if (await page.locator('#reviewPanel [data-review-name]').count()) await page.fill('#reviewPanel [data-review-name]', 'Laurent');
    if (i === 1) await c.locator('[data-type="text"]').first().click();
    await page.fill('#reviewPanel textarea', txt);
    await page.click('#reviewPanel [data-comment-add]');
    await t.wait(400);
  }
  s = await mark(page);
  await page.click('#reviewPanel [data-review-summary]');
  await page.waitForSelector('#reviewSummaryDialog[open]');
  t.ok(/2 commentaires ouverts/.test(await page.textContent('#reviewSummaryDialog [data-review-digest]')), 'résumé sans IA : comptes');
  await page.click('#reviewSummaryDialog [data-review-ai-run]');
  await page.waitForSelector('#reviewSummaryDialog [data-review-tasks] li');
  t.ok(await page.locator('#reviewSummaryDialog [data-review-points] li').count() === 2, 'résumé : points clés');
  t.ok(await page.locator('#reviewSummaryDialog [data-review-tasks] li').count() === 2, 'résumé : une tâche par commentaire ouvert');
  t.ok(/Raccourcir le titre de la page/.test(await page.textContent('#reviewSummaryDialog [data-review-tasks]')), 'résumé : tâche reformulée');
  await page.click('#reviewSummaryDialog [data-review-copy]');
  await page.locator('#reviewSummaryDialog [data-review-task-go]').first().click();
  await t.wait(500);
  es = await since(page, s);
  expectCodes(t, es, ['smart.review.open', 'ai.review-summary.start', 'ai.review-summary.ok', 'smart.review.points', 'smart.review.go', 'review.goto'], 'résumé de la relecture');
  t.ok(es.some(e => e.code === 'smart.review.copy' || e.code === 'smart.review.copy-fail'), 'résumé : copie notée');
  capture('intelligent-relecture', es);
  await page.click('#commentsBtn');
  void heading;

  /* ===== E. Palette depuis le logo ===== */
  const oldPal = (await site()).theme.palette;
  s = await mark(page);
  await page.click('[data-left="site"]');
  await t.wait(200);
  await page.click('#leftBody [data-palette-logo]');
  await page.waitForSelector('#paletteDialog[open]');
  const logo = png(120, 60, (x, y) => ((x - 60) ** 2 + (y - 30) ** 2 > 900 ? [0, 0, 0, 0] : x < 60 ? [242, 53, 63, 255] : [255, 212, 0, 255]));
  await page.setInputFiles('#paletteDialog [data-palette-file]', { name: 'logo-mab.png', mimeType: 'image/png', buffer: logo });
  await page.waitForSelector('#paletteDialog [data-palette-apply]:not([hidden])');
  t.ok(await page.locator('#paletteDialog [data-palette-proposal]').count() === 6, 'palette : 6 couleurs proposées');
  t.ok(await page.locator('#paletteDialog .pair.is-bad').count() === 0, 'palette : toutes les paires passent AA');
  t.ok(!/\bnull\b|undefined/.test(await page.textContent('#paletteDialog')), 'palette : aucun « null » affiché');
  await page.screenshot({ path: `${t.shots}/c17-palette.png` });
  await page.click('#paletteDialog [data-palette-apply]');
  await waitCode(page, 'smart.palette.ok', s);
  const newPal = (await site()).theme.palette;
  t.ok(newPal.c1 !== oldPal.c1 && newPal.c2 === '#ffd400', `palette appliquée (${newPal.c1}, ${newPal.c2})`);
  await page.locator('#leftBody h3').first().click();
  await page.keyboard.press('Control+z');
  await t.wait(200);
  t.ok((await site()).theme.palette.c1 === oldPal.c1, 'palette : Ctrl+Z revient à l’ancienne');
  es = await since(page, s);
  expectCodes(t, es, ['smart.palette.start', 'smart.palette.no-logo', 'smart.palette.file', 'smart.palette.pixels', 'smart.palette.colors', 'smart.palette.proposal', 'smart.palette.ok', 'store.undo'], 'palette');
  expectNoErrors(t, es, 'palette');
  capture('intelligent-palette', es);
  /* variante : logo importé, gris ; erreur : logo transparent */
  s = await mark(page);
  await page.click('#leftBody [data-palette-logo]');
  await page.setInputFiles('#paletteDialog [data-palette-file]', { name: 'logo-gris.png', mimeType: 'image/png', buffer: png(40, 40, () => [34, 34, 34, 255]) });
  await page.waitForSelector('#paletteDialog [data-palette-apply]:not([hidden])');
  t.ok(/couleur vive/.test(await page.textContent('#paletteDialog')), 'palette : logo sans couleur vive signalé');
  await page.keyboard.press('Escape');
  await page.click('#leftBody [data-palette-logo]');
  await page.setInputFiles('#paletteDialog [data-palette-file]', { name: 'vide.png', mimeType: 'image/png', buffer: png(20, 20, () => [0, 0, 0, 0]) });
  await waitCode(page, 'smart.palette.fail', s);
  await page.keyboard.press('Escape');
  es = await since(page, s);
  expectCodes(t, es, ['smart.palette.no-vivid', 'smart.palette.cancel', 'smart.palette.fail'], 'palette : gris, transparent');
  capture('intelligent-palette-variantes', es);

  /* Ctrl+K */
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'résumé de la relecture');
  await t.wait(150);
  await page.keyboard.press('Enter');
  t.ok(await page.locator('#reviewSummaryDialog[open]').count() === 1, 'Ctrl+K : résumé de la relecture');
  await page.keyboard.press('Escape');
}
