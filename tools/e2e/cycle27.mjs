/*
 * Cycle 27 : photos sans douleur. 10 photos importées, octets hors du modèle (blob: dans le canevas), 20 frappes
 * mesurées (perf.commit, canvas.render), rendu ciblé (0 inspector.render, <main> gardé, accordéon ouvert gardé),
 * tas JS (CDP) après 300 modifications, annuler/rétablir, .zip avec les images, rechargement, .json autonome,
 * collaboration avec une image ajoutée, démonstration du cycle 26 en vitesse rapide.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublishPhp, sha256Hex } from '../../core/publish.js';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture } from './logs.mjs';

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

function makePhotos(dir, n) {
  mkdirSync(dir, { recursive: true });
  const py = `from PIL import Image\nimport random\nfor i in range(${n}):\n  im = Image.effect_noise((1600, 1067), 40 + i).convert('RGB')\n  g = Image.linear_gradient('L').resize((1600, 1067))\n  Image.merge('RGB', (im.split()[0], g, Image.new('L', (1600, 1067), 20 * i))).save('${dir}/photo-%d.png' % i)`;
  execFileSync('python3', ['-c', py]);
  return Array.from({ length: n }, (_, i) => join(dir, `photo-${i}.png`));
}

async function heapMb(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('Performance.enable');
  const { metrics } = await cdp.send('Performance.getMetrics');
  await cdp.detach();
  return Math.round(metrics.find(m => m.name === 'JSHeapUsedSize').value / 1048576);
}

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  await page.evaluate(() => window.__atelier.setExpert(true));
  const photos = makePhotos(join(t.shots, 'photos27'), 10);

  /* ---------- 1. Importer 10 photos dans 10 widgets Image ---------- */
  let s = await mark(page);
  await c.locator('main [data-type="image"]').first().click();
  for (let i = 0; i < 9; i++) await page.keyboard.press('Control+d');
  await t.wait(300);
  t.ok(await c.locator('main [data-type="image"]').count() >= 10, '10 widgets Image dans la page');
  for (let i = 0; i < 10; i++) {
    await c.locator('main [data-type="image"]').nth(i).click();
    await page.click('[data-insp="content"]');
    const n0 = await page.evaluate(() => Object.keys(window.__atelier.site.assets).length);
    await page.setInputFiles('#inspector input[type="file"][data-field="src"]', photos[i]);
    await page.waitForFunction(n => Object.keys(window.__atelier.site.assets).length > n, n0, { timeout: 20000 });
  }
  let es = await since(page, s);
  const info = await page.evaluate(async () => {
    const { assets } = await import('/editor/assets.js');
    const s = window.__atelier.site;
    return { n: Object.keys(s.assets).length, json: JSON.stringify(s).length, base64: JSON.stringify(s).includes('base64'), kinds: Object.values(s.assets).every(a => a.kind === 'image' && !a.dataUrl), mb: assets.bytes() / 1048576, stored: Object.keys(s.assets).every(id => assets.has(id)) };
  });
  t.ok(info.n === 10 && !info.base64 && info.kinds && info.stored, `10 images : le site ne garde que des métadonnées (${Math.round(info.json / 1024)} Ko de JSON, ${info.mb.toFixed(1)} Mo d’octets dans le magasin)`);
  const canvasHtml = await c.locator('html').evaluate(h => h.outerHTML);
  t.ok(!/data:image/.test(canvasHtml) && (canvasHtml.match(/<img src="blob:/g) || []).length >= 10, 'canevas : images en blob:, aucune data: d’image');
  t.ok(await c.locator('main [data-type="image"] img').nth(9).evaluate(i => i.complete && i.naturalWidth === 1600), 'canevas : la dixième photo est affichée (1600 px)');
  expectCodes(t, es, ['inspector.image', 'inspector.image.ok'], 'import');
  expectNoErrors(t, es, 'import');

  /* ---------- 2. 20 frappes dans un titre (page) : rendu ciblé, 0 inspector.render, <main> gardé ---------- */
  await page.evaluate(() => window.atelierDebug.level('info', 'trace'));
  const h = c.locator('main [data-type="heading"]').first();
  await h.click();
  await page.click('[data-insp="content"]');
  const mainBefore = await c.locator('main').evaluate(m => { m.__garde = 27; return true; });
  await h.locator('[data-edit]').first().dblclick();
  await page.keyboard.press('End');
  s = await mark(page);
  for (const ch of ' photos !!!!!!!!!!!!!!'.slice(0, 20)) await page.keyboard.type(ch, { delay: 30 });
  await t.wait(300);
  es = await since(page, s, { level: 'trace' });
  const commits = es.filter(e => e.code === 'perf.commit').map(e => e.data.ms);
  const renders = es.filter(e => e.code === 'canvas.render');
  t.ok(commits.length >= 20, `20 frappes dans la page : ${commits.length} modifications`);
  t.ok(median(commits) < 20, `frappe dans la page : médiane ${median(commits)} ms de commit à l’affichage (< 20 ms), max ${Math.max(...commits)} ms`);
  t.ok(es.filter(e => e.code === 'inspector.render').length === 0, `frappes dans la page : 0 inspector.render (${es.filter(e => e.code === 'inspector.render').length})`);
  t.ok(renders.length >= 20 && renders.every(e => e.data.mode === 'styles'), 'frappes dans la page : canevas mis à jour sans remplacer le contenu');
  t.ok(await c.locator('main').evaluate(m => m.__garde === 27) && mainBefore, '<main> du canevas non remplacé');
  const typed = await page.evaluate(() => { const f = n => (n.type === 'heading' ? n : (n.children || []).map(f).find(Boolean)); return f(window.__atelier.site.pages[0].root).props.text.fr; });
  t.ok(/photos/.test(typed), 'texte enregistré dans le projet');
  t.ok(await page.locator('#inspector [data-field="text"][lang="fr"]').inputValue().then(v => /photos/.test(v)), 'inspecteur : la valeur du champ suit la frappe sans être redessiné');
  capture('photos-frappe-dans-la-page', es.filter(e => ['perf.commit', 'canvas.render', 'store.commit'].includes(e.code)).slice(0, 6).map(e => ({ ...e, level: 'debug' })));
  await page.keyboard.press('Escape');
  await t.wait(200);

  /* ---------- 3. 20 frappes dans un champ de l'inspecteur : rendus ciblés seulement ---------- */
  await h.click();
  await page.click('[data-insp="content"]');
  await c.locator('main').evaluate(m => { m.__garde = 28; });
  s = await mark(page);
  await page.locator('#inspector [data-field="text"][lang="fr"]').focus();
  await page.keyboard.press('End');
  for (const ch of 'inspecteur ciblé 27!') await page.keyboard.type(ch, { delay: 30 });
  await t.wait(300);
  es = await since(page, s, { level: 'trace' });
  const r2 = es.filter(e => e.code === 'canvas.render');
  const c2 = es.filter(e => e.code === 'perf.commit').map(e => e.data.ms);
  t.ok(r2.length >= 20 && r2.every(e => e.data.mode === 'nœud'), `20 frappes dans l’inspecteur : ${r2.length} rendus, tous ciblés (un seul élément remplacé)`);
  t.ok(await c.locator('main').evaluate(m => m.__garde === 28), '<main> non remplacé pendant la frappe dans l’inspecteur');
  t.ok(median(c2) < 20, `frappe dans l’inspecteur : médiane ${median(c2)} ms (< 20 ms)`);
  t.ok(await c.locator('main [data-type="heading"]').first().evaluate(e => /ciblé 27/.test(e.textContent)), 'canevas : le titre affiche la frappe');

  /* ---------- 4. Accordéon ouvert gardé pendant une modification ailleurs ---------- */
  const acc = await page.evaluate(async () => {
    const { commitRoot, root } = await import('/editor/store.js');
    const { createNode, insertNode, findParent } = await import('/core/tree.js');
    const r = root();
    const col = (function f(n) { return n.type === 'column' ? n : (n.children || []).map(f).find(Boolean); })(r);
    const a = createNode('accordion');
    commitRoot(insertNode(r, col.id, a, 0), {});
    return a.id;
  });
  await t.wait(400);
  await c.locator(`[data-node="${acc}"] summary`).first().click();
  const open = () => c.locator(`[data-node="${acc}"] details`).first().evaluate(d => d.open);
  const wasOpen = await open();
  await h.click();
  await page.locator('#inspector [data-field="text"][lang="fr"]').fill('Titre après accordéon');
  await t.wait(300);
  t.ok(wasOpen && await open(), 'accordéon ouvert gardé pendant une modification ailleurs dans la page');

  /* ---------- 5. 300 modifications : tas JS borné, historique partagé ---------- */
  const heap0 = await heapMb(page);
  await page.evaluate(async () => {
    const { commit, state } = await import('/editor/store.js');
    const { setPageTitle } = await import('/core/site.js');
    for (let i = 0; i < 300; i++) commit(setPageTitle(state.site, state.pageId, `Accueil ${i}`, 'fr'), { source: 'test' });
  });
  await t.wait(800);
  const heap1 = await heapMb(page);
  const hist = await page.evaluate(async () => {
    const { state, historyBytes } = await import('/editor/store.js');
    return { past: state.past.length, shared: state.past.every(p => p.site.assets === state.site.assets), kb: Math.round(historyBytes() / 1024) };
  });
  t.ok(heap1 < 150, `300 modifications : tas JS ${heap1} Mo (< 150 Mo ; ${heap0} Mo avant)`);
  t.ok(hist.past <= 150 && hist.shared, `historique : ${hist.past} pas, images partagées entre tous les états (${hist.kb} Ko d’historique hors images)`);
  console.log(`  (mesures : frappe page ${median(commits)} ms, inspecteur ${median(c2)} ms, tas ${heap0} → ${heap1} Mo)`);

  /* ---------- 6. Annuler / rétablir identiques ---------- */
  const snapA = await page.evaluate(() => JSON.stringify(window.__atelier.site));
  for (let i = 0; i < 5; i++) await page.keyboard.press('Control+z');
  await t.wait(200);
  const snapU = await page.evaluate(() => JSON.stringify(window.__atelier.site));
  for (let i = 0; i < 5; i++) await page.keyboard.press('Control+Shift+z');
  await t.wait(300);
  const snapR = await page.evaluate(() => JSON.stringify(window.__atelier.site));
  t.ok(snapU !== snapA && snapR === snapA, 'annuler ×5 puis rétablir ×5 : projet identique');
  t.ok(await c.locator('main [data-type="image"] img').first().evaluate(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0), 'après annuler/rétablir : images toujours affichées');

  /* ---------- 7. Export .zip avec les images ---------- */
  s = await mark(page);
  await page.click('#exportZipBtn');
  await page.waitForSelector('#auditDialog[open]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click("#auditExport")]);
  const zipPath = join(t.shots, 'cycle27.zip');
  await dl.saveAs(zipPath);
  const zipText = readFileSync(zipPath).toString('latin1');
  const names = new Set(zipText.match(/assets\/photo-\d(?:-\d)?(?:-\d+)?-[a-z0-9]+\.(?:webp|jpg)/g) || []);
  t.ok(names.size >= 30, `.zip : ${names.size} fichiers d’image (10 photos et leurs variantes)`);
  es = await since(page, s);
  expectCodes(t, es, ['export.zip', 'export.zip.ok'], 'export');

  /* ---------- 8. .json autonome (octets inclus) ---------- */
  const json = await page.evaluate(async () => {
    const { inline } = await import('/editor/assets.js');
    const out = inline(window.__atelier.site);
    return { all: Object.values(out.assets).every(a => /^data:image\//.test(a.dataUrl) && (a.variants || []).every(v => /^data:image\//.test(v.dataUrl))), schema: out.schema };
  });
  t.ok(json.all && json.schema === 3, 'enregistrer le projet (.json) : fichier autonome, images en data URL, schéma 3');

  /* ---------- 9. Recharger : images toujours là ---------- */
  await t.wait(1200);
  await page.goto(t.base);
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
  await t.wait(500);
  const back = await c.locator('main [data-type="image"] img').evaluateAll(xs => xs.filter(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0).length);
  t.ok(back >= 10, `après rechargement : ${back} images affichées depuis la base locale`);
  t.ok(await page.evaluate(() => !JSON.stringify(window.__atelier.site).includes('base64')), 'après rechargement : octets toujours hors du modèle');

  await collab(t);
  await demo(t);
}

/* ---------- 10. Collaboration : l'invitée reçoit les photos, puis une image ajoutée par l'hôte ---------- */
async function collab(t) {
  const { page: A, browser, base } = t;
  const port = 8900 + Math.floor(Math.random() * 90);
  const www = join(t.shots, 'www27');
  rmSync(www, { recursive: true, force: true });
  mkdirSync(www, { recursive: true });
  writeFileSync(join(www, 'publish.php'), buildPublishPhp({ tokenHash: await sha256Hex('x'.repeat(32)) }));
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', www], { stdio: 'ignore' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  try {
    await t.wait(500);
    await A.evaluate(() => localStorage.setItem('atelier-stun', ''));
    await ctx.addInitScript(() => { try { localStorage.setItem('atelier-stun', ''); localStorage.setItem('atelier-stun-set', '1'); } catch { /* ignoré */ } });
    await A.click('#publishBtn');
    await A.fill('#publishDialog [data-pub="url"]', `http://127.0.0.1:${port}/publish.php`);
    await A.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
    await A.keyboard.press('Escape');
    await A.click('#collabBtn');
    await A.waitForSelector('#collabDialog [data-collab-name]');
    await A.fill('#collabDialog [data-collab-name]', 'Kudoro');
    await A.locator('#collabDialog [data-collab-name]').dispatchEvent('change');
    await A.waitForSelector('#collabDialog [data-collab-start]:not([disabled])');
    await A.click('#collabDialog [data-collab-start]');
    await A.waitForSelector('#collabDialog [data-invite="editor"]');
    const link = await A.locator('#collabDialog [data-invite="editor"]').inputValue();
    await A.keyboard.press('Escape');
    const B = await ctx.newPage();
    B.on('dialog', d => d.accept());
    await B.goto(link);
    await B.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    await B.fill('#joinDialog [data-join-name]', 'Ana');
    await B.click('#joinDialog [data-join-go]');
    const ok = await B.waitForFunction(() => window.__collab?.session?.node?.peers().some(p => p.authed) && !document.querySelector('#joinDialog') && window.__atelier?.ready, null, { timeout: 30000 }).then(() => true).catch(() => false);
    t.ok(ok, 'collaboration : l’invitée est connectée et a reçu le projet');
    const cB = B.frameLocator('#canvas');
    const shown = () => cB.locator('main [data-type="image"] img').evaluateAll(xs => xs.filter(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0).length);
    t.ok(await B.waitForFunction(async () => { const { assets } = await import('/editor/assets.js'); return Object.keys(window.__atelier.site.assets).every(id => assets.has(id)) && Object.keys(window.__atelier.site.assets).length >= 10; }, null, { timeout: 30000 }).then(() => true).catch(() => false), 'collaboration : les octets des 10 photos sont arrivés chez l’invitée');
    await t.wait(800);
    t.ok(await shown() >= 10, `collaboration : l’invitée voit les photos (${await shown()})`);
    const sB = await mark(B);
    const cA = t.canvas();
    await cA.locator('main [data-type="image"]').first().click();
    await A.click('[data-insp="content"]');
    const n0 = await A.evaluate(() => Object.keys(window.__atelier.site.assets).length);
    await A.setInputFiles('#inspector input[type="file"][data-field="src"]', join(t.shots, 'photos27', 'photo-3.png'));
    await A.waitForFunction(n => Object.keys(window.__atelier.site.assets).length > n, n0, { timeout: 20000 });
    const newId = await A.evaluate(() => window.__atelier.site.pages[0].root && (function f(n) { return n.type === 'image' ? n.props.src : (n.children || []).map(f).find(Boolean); })(window.__atelier.site.pages[0].root));
    const got = await B.waitForFunction(id => { const f = n => (n.type === 'image' ? n.props.src : (n.children || []).map(f).find(Boolean)); return f(window.__atelier.site.pages[0].root) === id; }, newId, { timeout: 20000 }).then(() => true).catch(() => false);
    await t.wait(800);
    const firstB = await cB.locator('main [data-type="image"] img').first().evaluate(i => ({ ok: i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0 }));
    t.ok(got && firstB.ok, 'collaboration : l’image ajoutée par l’hôte s’affiche chez l’invitée');
    const esB = await since(B, sB);
    expectCodes(t, esB, ['collab.asset.in'], 'collaboration, invitée');
    expectNoErrors(t, esB, 'collaboration, invitée');
    capture('photos-collaboration-invitee', esB.filter(e => /^collab\.(asset|ops)/.test(e.code)));
  } finally {
    await ctx.close();
    php.kill();
  }
}

/* ---------- 11. Démonstration du cycle 26 (vitesse rapide) : elle importe des images ---------- */
async function demo(t) {
  const { page } = t;
  await page.goto(t.base + '?fresh=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
  await t.wait(500);
  const s = await mark(page);
  await page.evaluate(() => window.atelierDemo({ speed: 'fast' }));
  await page.waitForSelector('#demoPanel');
  await page.waitForSelector('#demoEndDialog[open]', { timeout: 300000 });
  const built = await page.evaluate(async () => {
    const { assets } = await import('/editor/assets.js');
    const s = window.__atelier.site;
    return { n: Object.keys(s.assets).length, ok: Object.keys(s.assets).every(id => assets.has(id)), base64: JSON.stringify(s).includes('base64') };
  });
  t.ok(built.n >= 1 && built.ok && !built.base64, `démonstration : ${built.n} image(s) importée(s), octets dans le magasin`);
  await page.click('#demoBack');
  await waitCode(page, 'demo.done', s, 20000);
  const es = await since(page, s);
  expectCodes(t, es, ['demo.start', 'demo.ok', 'demo.done'], 'démonstration');
  expectNoErrors(t, es, 'démonstration');
}
