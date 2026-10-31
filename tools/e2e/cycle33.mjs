/* Cycle 33 : accessible et cohérent — onglets au clavier, Monter/Descendre et « Déplacer vers… » sans glisser,
 * fenêtres Atelier au clavier (suppression d'une page, adresse d'un lien), SVG et PDF importés, lightbox au clavier
 * sur le site exporté. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, expectCodes, expectNoErrors, capture, waitCode } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  page.setDefaultTimeout(8000);
  const st = () => page.evaluate(() => ({ left: window.__atelier.left, insp: window.__atelier.insp, sel: window.__atelier.selected }));
  const active = () => page.evaluate(() => {
    const a = document.activeElement;
    return a ? [...a.attributes].filter(x => x.name.startsWith('data-') || x.name === 'id').map(x => `${x.name}=${x.value}`).join(' ') : '';
  });
  const siteOf = () => page.evaluate(() => window.__atelier.site);
  const parentOf = id => page.evaluate(nid => {
    const find = (n, p) => { if (n.id === nid) return { parent: p?.id, index: p?.children.indexOf(n) }; for (const ch of n.children || []) { const r = find(ch, n); if (r) return r; } return null; };
    return find(window.__atelier.site.pages.find(p => p.id === window.__atelier.pageId).root, null);
  }, id);

  /* ===== 1. Onglets : flèches, Début, Fin (motif APG), tabindex « roving » ===== */
  let s = await mark(page);
  await page.focus('[data-left="widgets"]');
  await page.keyboard.press('ArrowRight');
  t.ok((await st()).left === 'templates' && (await active()).includes('data-left=templates'), 'panneau de gauche : → passe à « Modèles » et garde le focus');
  await page.keyboard.press('End');
  t.ok((await st()).left === 'site' && (await active()).includes('data-left=site'), 'Fin : dernier onglet (« Site »)');
  await page.keyboard.press('Home');
  t.ok((await st()).left === 'widgets', 'Début : premier onglet');
  t.ok(await page.evaluate(() => [...document.querySelectorAll('[data-left]')].map(b => b.tabIndex).join(',')) === '0,-1,-1,-1,-1,-1', 'un seul onglet atteint par Tab');
  await c.locator('[data-type="text"]').first().click();
  await page.focus('#inspector [data-insp="content"]');
  await page.keyboard.press('ArrowRight');
  t.ok((await st()).insp === 'style' && (await active()).includes('data-insp=style'), 'inspecteur : → ouvre l’onglet Style, focus rendu après reconstruction');
  await page.keyboard.press('ArrowLeft');
  t.ok((await st()).insp === 'content', 'inspecteur : ← revient à Contenu');
  let es = await since(page, s);
  expectCodes(t, es, ['ui.tab-key', 'inspector.tab'], 'onglets au clavier');
  capture('a11y-onglets-clavier', es);

  /* ===== 2. ▼ dans la barre de l'élément : déplacer sans glisser (WCAG 2.5.7) ===== */
  const pick = await page.evaluate(() => {
    let out = null;
    const visit = n => { if (out) return; if (n.type === 'column' && n.children.length >= 2 && !['row', 'column'].includes(n.children[0].type)) out = n.children[0].id; else (n.children || []).forEach(visit); };
    visit(window.__atelier.site.pages.find(p => p.id === window.__atelier.pageId).root);
    return out;
  });
  await page.evaluate(id => window.__atelier.selectId(id), pick);
  await t.wait(300);
  const before = await parentOf(pick);
  s = await mark(page);
  await c.locator('#selToolbar [data-act="down"]').click();
  await waitCode(page, 'action.move', s);
  const after = await parentOf(pick);
  t.ok(after.parent === before.parent && after.index === before.index + 1, `▼ descend l’élément (position ${before.index} → ${after.index})`);
  await c.locator('#selToolbar [data-act="up"]').click();
  await t.wait(200);
  t.ok((await parentOf(pick)).index === before.index, '▲ le remonte');
  es = await since(page, s);
  expectCodes(t, es, ['canvas.toolbar', 'action.move'], 'monter / descendre');
  capture('a11y-monter-descendre', es);

  /* ===== 3. « Déplacer vers… » (menu contextuel) : choisir la colonne de destination ===== */
  s = await mark(page);
  await page.click('[data-left="navigator"]');
  await page.click(`#navTree [data-node-id="${pick}"]`, { button: 'right' });
  await page.click('#ctxMenu [data-ctx="moveTo"]');
  await page.waitForSelector('#moveToDialog[open]');
  t.ok((await active()).includes('data-move-target'), 'fenêtre « Déplacer vers… » : le focus est sur la liste des destinations');
  const opts = await page.locator('#moveToDialog [data-move-target] option').count();
  await page.keyboard.press('End');
  const target = await page.locator('#moveToDialog [data-move-target]').inputValue();
  await page.keyboard.press('Enter');
  await waitCode(page, 'action.move-to', s);
  t.ok((await parentOf(pick)).parent === target && opts > 1, `élément déplacé dans la colonne choisie (${opts} destinations proposées)`);
  es = await since(page, s);
  expectCodes(t, es, ['ctxmenu.action', 'action.move-to-open', 'action.move-to'], 'déplacer vers');
  expectNoErrors(t, es, 'déplacer vers');
  capture('a11y-deplacer-vers', es);
  await page.keyboard.press('Control+z');
  await t.wait(200);

  /* ===== 4. Supprimer une page : fenêtre Atelier, entièrement au clavier ===== */
  await page.click('[data-left="pages"]');
  const victim = await page.evaluate(() => window.__atelier.site.pages.at(-1).id);
  const pages0 = (await siteOf()).pages.length;
  /* la fiche de la page est repliée : la déplier */
  await page.locator(`[data-page-delete="${victim}"]`).evaluate(b => { b.closest('details').open = true; });
  s = await mark(page);
  await page.focus(`[data-page-delete="${victim}"]`);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#pageDeleteDialog[open]');
  const dlg = await page.evaluate(() => { const d = document.querySelector('#pageDeleteDialog'); return { labelled: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent || '', modal: d.getAttribute('aria-modal'), focus: document.activeElement.hasAttribute('data-confirm-cancel') }; });
  t.ok(/Supprimer la page/.test(dlg.labelled) && dlg.modal === 'true' && dlg.focus, 'fenêtre Atelier : titrée, modale, focus sur « Annuler » (suppression)');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#pageDeleteDialog', { state: 'detached' });
  t.ok((await siteOf()).pages.length === pages0 && (await active()).includes(`data-page-delete=${victim}`), 'Échap : rien n’est supprimé, le focus revient au bouton ✕');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#pageDeleteDialog[open]');
  await page.keyboard.press('Tab');
  t.ok((await active()).includes('data-confirm'), 'Tab : bouton « Supprimer »');
  await page.keyboard.press('Enter');
  await waitCode(page, 'page.delete', s);
  t.ok((await siteOf()).pages.length === pages0 - 1, 'Entrée : la page est supprimée');
  es = await since(page, s);
  expectCodes(t, es, ['ui.dialog.open', 'page.delete-cancel', 'ui.confirm', 'page.delete'], 'supprimer une page au clavier');
  capture('a11y-supprimer-page-clavier', es);
  await page.keyboard.press('Control+z');
  await t.wait(200);
  t.ok((await siteOf()).pages.length === pages0, 'Ctrl+Z : la page revient');

  /* ===== 5. Adresse d'un lien dans le texte riche : champ dans une fenêtre, adresse vérifiée ===== */
  await c.locator('[data-type="text"]').first().click();
  await page.click('[data-insp="content"]');
  const area = page.locator('#inspector .rich-input').first();
  await area.evaluate(el => { el.focus(); const r = document.createRange(); r.selectNodeContents(el.querySelector('p') || el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  s = await mark(page);
  await page.click('#inspector [data-rt="link"]');
  await page.waitForSelector('#linkUrlDialog[open]');
  await page.fill('#linkUrlDialog [data-ask-input]', 'javascript:alert(1)');
  await page.keyboard.press('Enter');
  t.ok(await page.locator('#linkUrlDialog[open]').count() === 1 && /non autorisée/.test(await page.locator('#linkUrlDialogError').textContent()), 'adresse javascript: refusée dans la fenêtre (message sous le champ)');
  await page.fill('#linkUrlDialog [data-ask-input]', 'https://www.media-alternatif.be/');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#linkUrlDialog', { state: 'detached' });
  await t.wait(300);
  const content = await page.evaluate(id => JSON.stringify(window.__atelier.site.pages.flatMap(p => [p.root]).map(r => r)).includes('href=\\"https://www.media-alternatif.be/\\"'), null);
  t.ok(content, 'lien créé avec l’adresse saisie, sans prompt() du navigateur');
  es = await since(page, s);
  capture('a11y-lien-adresse', es);

  /* ===== 6. SVG propre et PDF importés ; galerie ===== */
  const svgPath = join(t.shots, 'logo-c33.svg');
  writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40"><rect width="120" height="40" rx="6" fill="#c8181d"/><text x="60" y="26" font-size="16" text-anchor="middle" fill="#fff">MAB</text></svg>');
  const pdfPath = join(t.shots, 'statuts-c33.pdf');
  writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'.padEnd(3000, ' '));
  await page.click('[data-left="widgets"]');
  s = await mark(page);
  await page.click('#leftBody .lib-item[data-type="gallery"]');
  await t.wait(300);
  await page.locator('#inspector input[type="file"][data-field="src"]').first().setInputFiles(svgPath);
  await waitCode(page, 'image.svg.ok', s);
  await t.wait(300);
  let site = await siteOf();
  const svgAsset = Object.values(site.assets).find(a => a.mime === 'image/svg+xml');
  t.ok(!!svgAsset && /\.svg$/.test(svgAsset.file) && !svgAsset.variants, `SVG importé tel quel, sans conversion (${svgAsset?.file})`);
  await page.click('#leftBody .lib-item[data-type="button"]');
  await t.wait(300);
  await page.locator('#inspector input[type="file"][data-field="file"]').setInputFiles(pdfPath);
  await waitCode(page, 'inspector.document.ok', s);
  await t.wait(300);
  site = await siteOf();
  const doc = Object.values(site.assets).find(a => a.kind === 'document');
  t.ok(doc?.mime === 'application/pdf' && doc.size === 3000, `PDF importé (${doc?.file}, ${doc?.size} octets)`);
  t.ok(/PDF/.test(await page.locator('#inspector [data-doc-field="file"]').textContent()), 'inspecteur : nom, type et taille du fichier affichés');
  es = await since(page, s);
  expectCodes(t, es, ['image.svg.start', 'image.svg.ok', 'inspector.document.start', 'inspector.document.ok'], 'SVG et PDF');
  expectNoErrors(t, es, 'SVG et PDF');
  capture('images-svg-document', es);

  /* ===== 7. Export : document dans assets/docs/, lien de téléchargement, lightbox au clavier ===== */
  await page.click('#exportZipBtn');
  await page.waitForSelector('#auditDialog[open]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export33');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const files = readdirSync(join(dir, 'site'), { recursive: true }).map(String);
  t.ok(files.some(f => /^assets\/docs\/statuts-c33-[0-9a-f]{8}\.pdf$/.test(f)) && files.some(f => /^assets\/logo-c33-[0-9a-f]{8}\.svg$/.test(f)), 'export : PDF dans assets/docs/, SVG dans assets/');
  const home = readFileSync(join(dir, 'site', 'index.html'), 'utf8');
  const link = home.match(/<a [^>]*assets\/docs\/statuts-c33[^>]*>[\s\S]*?<\/a>/)?.[0] || '';
  t.ok(/type="application\/pdf"/.test(link) && /rel="noopener"/.test(link) && /\(PDF, 3 Ko\)/.test(link), `lien de téléchargement avec type et taille : ${link.replace(/\s+/g, ' ').slice(0, 160)}`);

  const ctx = await t.browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + join(dir, 'site', 'index.html'));
  const thumb = p.locator('.gal[data-zoom] a').first();
  await thumb.focus();
  await p.keyboard.press('Enter');
  await p.waitForSelector('dialog.lb[open]');
  const lb = await p.evaluate(() => { const d = document.querySelector('dialog.lb'); const a = document.activeElement; return { modal: d.getAttribute('aria-modal'), close: a.classList.contains('lb__close'), label: a.getAttribute('aria-label'), visible: a.getBoundingClientRect().width >= 24 }; });
  t.ok(lb.modal === 'true' && lb.close && lb.label === 'Fermer' && lb.visible, 'lightbox : modale, focus sur le bouton « Fermer » visible et libellé');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Shift+Tab');
  await p.keyboard.press('Tab');
  t.ok(await p.evaluate(() => document.activeElement.classList.contains('lb__close')), 'lightbox : Tab reste dans la fenêtre');
  await p.keyboard.press('Escape');
  await p.waitForSelector('dialog.lb', { state: 'detached' });
  t.ok(await p.evaluate(() => document.activeElement?.matches('.gal[data-zoom] a')), 'Échap : lightbox fermée, focus rendu à la vignette');
  await ctx.close();
}
