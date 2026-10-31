/* Cycle 30 : lisible et simple — page lisible sur un portable (zoom, panneaux), réglages sans CSS (nombre + unité,
   cadenas, noms de couleurs, mode simple / expert), listes et texte riche, barre du haut en icônes SVG. */
import { mark, since, expectCodes, capture } from './logs.mjs';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}⧉✕↰✥]/u;

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  page.setDefaultTimeout(8000);
  const site = () => page.evaluate(() => window.__atelier.site);
  const exported = async () => page.evaluate(async () => {
    const { renderSite } = await import('./core/render.js');
    return Object.fromEntries([...renderSite(window.__atelier.site).files].filter(([k]) => k.endsWith('.html') || k === 'styles.css').map(([k, v]) => [k, String(v)]));
  });
  const scale = () => page.evaluate(() => { const f = document.querySelector('#canvas'); return Math.round(f.getBoundingClientRect().width / f.offsetWidth * 100); });

  /* ===== X7. Barre du haut : icônes SVG, libellés, une seule ligne, aucun émoji ===== */
  const bar = () => page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    const text = [...tb.querySelectorAll('button, summary')].filter(b => b.checkVisibility()).map(b => b.innerText).join(' ');
    const name = document.querySelector('#siteName');
    return { h: tb.getBoundingClientRect().height, svg: tb.querySelectorAll('svg.ico').length, text, overflow: document.documentElement.scrollWidth > innerWidth, nameCut: name.scrollWidth > name.clientWidth + 1 };
  });
  let b = await bar();
  t.ok(b.svg >= 14, `barre du haut : ${b.svg} icônes SVG`);
  t.ok(!EMOJI.test(b.text), `barre du haut : aucun émoji (${b.text.replace(/\s+/g, ' ').slice(0, 80)})`);
  t.ok(await page.evaluate(() => [...document.querySelectorAll('.topbar svg')].every(s => s.getAttribute('aria-hidden') === 'true')), 'icônes : aria-hidden');
  /* Intégration v20 (menu ❓ ▾ du cycle 26, copie de secours du cycle 31) : à 1 440 px seul « Publier » garde son libellé, rien ne déborde ni ne se chevauche ; tous les libellés au-delà de 1 600 px, nom entier à 1 920 px */
  t.ok(/Publier/.test(b.text) && !b.overflow, 'à 1 440 px : « Publier » libellé, pas de débordement');
  t.ok(await page.evaluate(() => document.querySelector('.tb-brand').getBoundingClientRect().right <= document.querySelector('#pageSelect').getBoundingClientRect().left), 'à 1 440 px : le nom du site ne chevauche pas la page');
  await page.setViewportSize({ width: 1920, height: 900 });
  await t.wait(200);
  const wide = await bar();
  t.ok(/Publier/.test(wide.text) && /Exporter/.test(wide.text) && /Traductions/.test(wide.text) && /SEO/.test(wide.text), 'libellés visibles à 1 920 px : Publier, Exporter, Traductions, SEO');
  t.ok(!wide.nameCut, 'nom du site non tronqué à 1 920 px');
  await page.setViewportSize({ width: 1440, height: 900 });
  await t.wait(200);
  for (const id of ['undoBtn', 'redoBtn', 'i18nBtn', 'seoBtn', 'aiBtn', 'collabBtn', 'commentsBtn', 'helpBtn', 'logBtn', 'exportZipBtn', 'publishBtn']) {
    if (!(await page.locator(`#${id}`).getAttribute('aria-label'))) t.ok(false, `#${id} : nom accessible`);
  }
  await page.screenshot({ path: `${t.shots}/c30-barre-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 60 } });
  await page.setViewportSize({ width: 1280, height: 720 });
  await t.wait(300);
  b = await bar();
  t.ok(b.h <= 52 && !b.overflow, `1 280 px : barre sur une ligne (${Math.round(b.h)} px), pas de débordement`);
  t.ok(!/Traductions/.test(b.text), '1 280 px : libellés secondaires masqués (infobulle gardée)');
  await page.screenshot({ path: `${t.shots}/c30-barre-1280.png`, clip: { x: 0, y: 0, width: 1280, height: 60 } });

  /* ===== X3. Portable 1 366 × 768 : panneaux repliés = 100 %, zoom, raccourcis ===== */
  await page.setViewportSize({ width: 1366, height: 768 });
  await t.wait(300);
  const open0 = await scale();
  let s = await mark(page);
  await page.click('#panelsBtn');
  await t.wait(300);
  t.ok(await scale() === 100, `panneaux repliés : page à 100 % (avant : ${open0} %)`);
  const fs = await c.locator('main .w-text .rich p').first().evaluate(p => parseFloat(getComputedStyle(p).fontSize));
  t.ok(fs * (await scale()) / 100 >= 15, `texte courant affiché à ${Math.round(fs * (await scale()) / 100 * 10) / 10} px (≥ 15)`);
  t.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement de la fenêtre');
  const cw = await page.evaluate(() => document.querySelector('#canvas').offsetWidth);
  t.ok(cw >= 1300, `page rendue à la largeur disponible (${cw} px)`);
  await page.screenshot({ path: `${t.shots}/c30-portable-replie.png` });
  await page.keyboard.press('Control+Shift+F');
  await t.wait(300);
  t.ok(await page.locator('.panel--left').isVisible(), 'Ctrl+Maj+F : panneaux de retour');
  t.ok(await scale() < 100, `panneaux ouverts : page ajustée (${await scale()} %)`);
  await page.selectOption('#zoomSelect', '100');
  await t.wait(250);
  t.ok(await scale() === 100 && await page.evaluate(() => document.querySelector('#stage').classList.contains('is-overflow')), 'zoom 100 % : taille réelle, la scène défile');
  await page.keyboard.press('Control+-');
  await t.wait(200);
  t.ok(await scale() === 75, 'Ctrl+- : 75 %');
  await page.keyboard.press('Control+-');
  await t.wait(200);
  t.ok(await scale() === 50 && await page.locator('#zoomOutBtn').isDisabled(), 'Ctrl+- : 50 %, bouton − désactivé');
  await page.keyboard.press('Control+=');
  await t.wait(200);
  t.ok(await scale() === 75, 'Ctrl+= : 75 %');
  await page.keyboard.press('Control+0');
  await t.wait(200);
  t.ok(await scale() === open0 && await page.inputValue('#zoomSelect') === 'fit', `Ctrl+0 : ajuster (${await scale()} %)`);
  let es = await since(page, s);
  expectCodes(t, es, ['ui.panels', 'canvas.zoom', 'canvas.scale'], 'zoom et panneaux');
  capture('c30-zoom-panneaux', es.filter(e => /^(ui\.panels|canvas\.zoom|canvas\.scale)$/.test(e.code)));

  /* glisser-déposer et sélection justes à 75 % */
  await page.selectOption('#zoomSelect', '75');
  await t.wait(250);
  const h0 = await c.locator('[data-type="heading"]').first();
  await h0.click();
  t.ok(await page.evaluate(() => window.__atelier.typeOf(window.__atelier.selected)) === 'heading', 'zoom 75 % : clic = bonne sélection');
  const sel = await c.locator('#atelier-select').boundingBox();
  const hb = await h0.boundingBox();
  t.ok(sel && hb && Math.abs(sel.x - hb.x) < 3 && Math.abs(sel.width - hb.width) < 3, 'zoom 75 % : cadre de sélection sur l’élément');
  const before = (await site()).pages[0].root.children[0].children[0].children[0].children.length;
  const lib = await page.locator('.lib-item:has-text("Texte"), .lib-item:has-text("Text")').first().boundingBox();
  const target = await c.locator('[data-type="heading"]').first().boundingBox();
  await page.mouse.move(lib.x + 20, lib.y + 20);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(lib.x + (target.x + 40 - lib.x) * i / 8, lib.y + (target.y + target.height - 2 - lib.y) * i / 8);
  await page.mouse.up();
  await t.wait(300);
  const after = (await site()).pages[0].root.children[0].children[0].children[0].children.length;
  t.ok(after === before + 1, `zoom 75 % : dépôt dans la bonne colonne (${before} → ${after})`);
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+0');
  await page.setViewportSize({ width: 1440, height: 900 });
  await t.wait(300);

  /* ===== X5. Réglages sans CSS ===== */
  await c.locator('[data-type="heading"]').first().click();
  await page.click('[data-insp="style"]');
  const fsInput = page.locator('#inspector [data-style="fontSize"]').first();
  t.ok(await fsInput.inputValue() === '0.85' && await page.locator('#inspector [data-unit="fontSize"]').inputValue() === 'rem', `« 0.85rem » affiché 0.85 + rem`);
  t.ok(await page.locator('#inspector [data-style="color"]').inputValue() === 'Couleur principale', `couleur : « ${await page.locator('#inspector [data-style="color"]').inputValue()} » au lieu de palette:c1`);
  t.ok((await page.locator('#inspector [data-style-wrap="color"] [data-swatch="c1"]').getAttribute('aria-label')).includes('Couleur principale'), 'pastille : nom lisible');
  await page.fill('#inspector [data-style="fontSize"]', '24px');
  await page.press('#inspector [data-style="fontSize"]', 'Enter');
  await t.wait(150);
  t.ok(JSON.stringify((await site()).pages[0].root).includes('"fontSize":"24px"'), '« 24px » tapé dans le champ nombre : compris');
  /* marges : ↑ sur la marge haute = +1px dans le site publié */
  s = await mark(page);
  await page.locator('#inspector .style-group:has([data-style="paddingTop"])').evaluate(d => { d.open = true; });
  const mt = page.locator('#inspector [data-style="marginTop"]');
  await mt.fill('10');
  await mt.press('Enter');
  await t.wait(100);
  await page.locator('#inspector [data-style="marginTop"]').press('ArrowUp');
  await t.wait(150);
  const id = await page.evaluate(() => window.__atelier.selected);
  let css = (await exported())['styles.css'];
  t.ok(new RegExp(`\\.n-${id}\\{[^}]*margin-top:11px`).test(css), '↑ sur la marge haute : 11px dans le site publié (+1px)');
  await page.locator('#inspector [data-style="marginTop"]').press('Shift+ArrowUp');
  await t.wait(150);
  css = (await exported())['styles.css'];
  t.ok(new RegExp(`\\.n-${id}\\{[^}]*margin-top:21px`).test(css), 'Maj+↑ : +10px');
  /* cadenas : lier les 4 côtés */
  await page.click('#inspector [data-box-lock="margin"]');
  await page.locator('#inspector [data-style="marginBottom"]').fill('16');
  await page.locator('#inspector [data-style="marginBottom"]').press('Enter');
  await t.wait(150);
  const desk = async () => (await page.evaluate(i => { const f = n => n.id === i ? n : (n.children || []).reduce((a, k) => a || f(k), null); return f(window.__atelier.site.pages[0].root).style.desktop; }, id));
  let d = await desk();
  t.ok(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].every(k => d[k] === '16px'), 'cadenas fermé : 16px sur les 4 côtés en une fois');
  es = await since(page, s);
  expectCodes(t, es, ['style.set', 'style.box-lock'], 'nombre + unité, cadenas');
  capture('c30-style-nombre-unite', es.filter(e => e.code.startsWith('style.')));

  /* mode simple / expert */
  t.ok(await page.locator('#inspector [data-style="maxWidth"]').count() === 0 && await page.locator('#inspector [data-style="opacity"]').count() === 0, 'mode simple : dimensions et effets cachés');
  await page.click('[data-insp="advanced"]');
  t.ok(await page.locator('#inspector [data-adv="class"]').count() === 0 && await page.locator('#inspector [data-adv="css"]').count() === 0, 'mode simple : Classes CSS et CSS personnalisée cachées');
  t.ok(await page.locator('#inspector [data-adv="anchor"]').count() === 1, 'mode simple : l’ancre reste');
  s = await mark(page);
  await page.click('#inspector [data-expert-on]');
  await t.wait(150);
  t.ok(await page.locator('#inspector [data-adv="class"]').count() === 1 && await page.locator('#inspector [data-adv="css"]').count() === 1, 'mode expert : Classes CSS et CSS personnalisée visibles');
  await page.click('[data-insp="style"]');
  t.ok(await page.locator('#inspector [data-style="maxWidth"]').count() === 1 && await page.locator('#inspector [data-range="opacity"]').count() === 1, 'mode expert : dimensions, curseur d’opacité');
  t.ok(await page.locator('#inspector [data-range="borderRadius"]').count() === 1, 'curseur d’arrondi');
  t.ok(await page.evaluate(() => localStorage.getItem('atelier-expert')) === '1', 'choix retenu (localStorage)');
  await page.locator('#inspector .style-group:has([data-style="maxWidth"])').evaluate(d => { d.open = true; });
  await page.click('#inspector [data-free="maxWidth"]');
  await page.fill('#inspector [data-style="maxWidth"]', 'clamp(10rem, 50vw, 40rem)');
  await page.press('#inspector [data-style="maxWidth"]', 'Enter');
  await t.wait(150);
  t.ok((await desk()).maxWidth === 'clamp(10rem, 50vw, 40rem)', 'valeur libre : clamp() accepté');
  await page.click('#fileMenu > summary');
  t.ok(await page.isChecked('#expertToggle'), 'Fichier : case « Mode expert » cochée');
  await page.uncheck('#expertToggle');
  await page.click('#fileMenu > summary');
  await t.wait(150);
  t.ok(await page.locator('#inspector [data-style="maxWidth"]').count() === 0, 'Fichier → mode simple : réglages experts cachés');
  es = await since(page, s);
  expectCodes(t, es, ['ui.mode'], 'mode simple / expert');
  /* libellés non tronqués à 330 px */
  const cut = await page.evaluate(() => [...document.querySelectorAll('#inspector .sp > label span, #inspector .field__label')].filter(e => e.checkVisibility() && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  t.ok(!cut.length, `libellés de l’inspecteur non tronqués à 330 px${cut.length ? ' : ' + cut.join(', ') : ''}`);
  await page.locator('#inspector').screenshot({ path: `${t.shots}/c30-inspecteur-style.png` });
  await page.keyboard.press('Control+z');

  /* ===== X6. Listes et texte riche ===== */
  const text = c.locator('[data-type="text"] [data-edit="content"]').first();
  await text.dblclick();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Intro');
  await page.keyboard.press('Enter');
  s = await mark(page);
  await page.keyboard.type('- a');
  await page.keyboard.press('Enter');
  await page.keyboard.type('b');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Fin');
  await page.keyboard.press('Escape');
  await t.wait(250);
  let html = (await exported())['index.html'];
  t.ok(/<ul><li>a<\/li><li>b<\/li><\/ul>/.test(html), 'taper « - a », Entrée, « b » → ul > li × 2 dans le site exporté');
  t.ok(/<\/ul><p>Fin<\/p>/.test(html), 'Entrée sur un item vide : sortie de la liste');
  es = await since(page, s);
  expectCodes(t, es, ['edit.list', 'edit.list-exit'], 'liste tapée');
  /* boutons : numérotée, imbrication, intertitre, citation */
  await text.dblclick();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1. un');
  await page.keyboard.press('Enter');
  await page.keyboard.type('deux');
  await page.keyboard.press('Tab');
  await c.locator('#atelier-format [data-fmt="format"]').click();
  t.ok(await c.locator('#atelier-format .fmt-blocks').isVisible(), 'menu « Format » ouvert');
  await c.locator('#atelier-format [data-fmt="ul"]').click();
  await page.keyboard.press('Escape');
  await t.wait(200);
  html = (await exported())['index.html'];
  t.ok(/<ol><li>un<ul><li>deux<\/li><\/ul><\/li><\/ol>/.test(html), `1. + Tab : sous-liste, bouton puces (${(html.match(/<ol>.*?<\/ol>/) || [''])[0].slice(0, 90)})`);
  await text.dblclick();
  await page.keyboard.press('Control+Home');
  await c.locator('#atelier-format [data-fmt="format"]').click();
  await c.locator('#atelier-format .fmt-blocks [data-fmt="h2"]').click();
  await page.keyboard.press('Escape');
  await t.wait(200);
  html = (await exported())['index.html'];
  t.ok(/<h2>Intro<\/h2>/.test(html), 'menu Format → Titre 2');
  /* collage d'une liste HTML (Word) → puces gardées */
  s = await mark(page);
  await text.dblclick();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await c.locator('body').evaluate((b, word) => {
    const dt = new DataTransfer();
    dt.setData('text/html', word);
    dt.setData('text/plain', 'Premier gras\nSecond lien');
    b.ownerDocument.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, `<p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span>&nbsp; </span></span><![endif]>Premier <b>gras</b><o:p></o:p></p><p class=MsoListParagraphCxSpLast style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span>&nbsp; </span></span><![endif]>Second <a href="https://exemple.be">lien</a><o:p></o:p></p>`);
  await page.keyboard.press('Escape');
  await t.wait(250);
  html = (await exported())['index.html'];
  t.ok(/<ul><li>Premier <strong>gras<\/strong><\/li><li>Second <a href="https:\/\/exemple\.be" rel="noopener">lien<\/a><\/li><\/ul>/.test(html), 'collage Word : puces, gras et lien gardés, rel="noopener" au rendu');
  t.ok(!/mso-|o:p/.test(html), 'collage : aucun déchet de Word');
  es = await since(page, s);
  expectCodes(t, es, ['edit.paste-rich'], 'collage avec mise en forme');
  capture('c30-collage-word', es.filter(e => e.code.startsWith('edit.')));
  /* inspecteur : barre avec listes */
  await c.locator('[data-type="text"]').first().click();
  await page.click('[data-insp="content"]');
  t.ok(await page.locator('#inspector [data-rt="ul"]').count() >= 1 && await page.locator('#inspector [data-rt="format"]').count() >= 1, 'inspecteur : boutons liste et menu Format');
  t.ok(/\.rich blockquote\{/.test((await exported())['styles.css']), 'site publié : citation et intertitres stylés');
  await page.screenshot({ path: `${t.shots}/c30-listes.png` });

  /* ===== Captures de référence FR et JA ===== */
  await page.screenshot({ path: `${t.shots}/c30-reference-fr.png` });
  await page.goto(`${t.base}?lang=ja&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await t.wait(300);
  b = await bar();
  t.ok(b.h <= 52 && !b.overflow, `japonais, 1 280 px : barre sur une ligne (${Math.round(b.h)} px)`);
  await page.screenshot({ path: `${t.shots}/c30-reference-ja.png` });
  await page.evaluate(() => { localStorage.removeItem('atelier-ui-lang'); localStorage.removeItem('atelier-expert'); });
  await page.goto(`${t.base}?lang=fr&fresh=1`, { waitUntil: 'networkidle' });
}
