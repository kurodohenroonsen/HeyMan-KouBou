/* Cycle 16 — chapitres 2 (Éditer une page) et 3 (Mise en forme et design) : cas d'usage, journaux attendus, extraits réels. */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mark, since, expectCodes, expectNoErrors, capture, codes } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const S = () => page.evaluate(() => ({ selected: window.__atelier.selected, multi: [...window.__atelier.multi], edit: window.__atelier.editTarget }));
  const site = () => page.evaluate(() => window.__atelier.site);
  const kids = id => page.evaluate(id => {
    const find = (n, i) => n.id === i ? n : (n.children || []).reduce((a, k) => a || find(k, i), null);
    const s = window.__atelier; const p = s.site.pages.find(p => p.id === s.pageId) || s.site.pages[0];
    return (find(p.root, id)?.children || []).map(k => ({ id: k.id, type: k.type }));
  }, id);
  const count = type => page.evaluate(type => JSON.stringify(window.__atelier.site.pages[0].root).split(`"type":"${type}"`).length - 1, type);
  const has = (es, code, pred = () => true) => es.some(e => e.code === code && pred(e));
  /* Point de l'éditeur correspondant à un élément du canevas (fy, fx : fractions de sa boîte) */
  async function canvasPoint(selector, fy = 0.5, fx = 0.5) {
    const box = await page.locator('#canvas').boundingBox();
    if (!selector.startsWith('#selToolbar')) await c.locator(selector).first().evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await t.wait(120);
    const r = await c.locator(selector).first().evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    const scale = await page.evaluate(() => { const f = document.querySelector('#canvas'); return f.getBoundingClientRect().width / f.offsetWidth; });
    return { x: box.x + (r.x + r.w * fx) * scale, y: box.y + (r.y + r.h * fy) * scale };
  }
  async function drag(from, to) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await t.wait(80);
    await page.mouse.move(to.x, to.y + 1);
    await t.wait(80);
  }
  const center = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const only = (es, re) => es.filter(e => re.test(e.code));

  /* ================= Chapitre 2 : éditer une page ================= */

  /* 2.0 Chargement du canevas au démarrage, widgets supplémentaires */
  {
    const es = await since(page, 0);
    expectCodes(t, es, ['widgets.extra', 'canvas.load.start', 'canvas.load.render', 'canvas.load.ok', 'canvas.scale'], 'canevas au démarrage');
    t.ok(es.find(e => e.code === 'canvas.load.ok')?.data?.nodes > 10, 'canvas.load.ok compte les éléments affichés');
    expectNoErrors(t, es, 'canevas au démarrage');
    capture('edition-canevas-demarrage', only(es, /^(widgets|canvas|boot\.ok)/));
  }

  /* 2.1 Sélectionner : clic, flèches, Échap */
  {
    const h1 = c.locator('[data-type="heading"]:has(h1)').first();
    const h1Id = await h1.getAttribute('data-node');
    const s = await mark(page);
    await h1.click();
    await t.wait(150);
    await page.keyboard.press('ArrowDown');
    await t.wait(150);
    const afterArrow = (await S()).selected;
    await page.keyboard.press('Escape');
    await t.wait(150);
    const es = await since(page, s);
    t.ok(afterArrow && afterArrow !== h1Id, 'flèche ↓ : élément suivant sélectionné');
    t.ok((await page.evaluate(() => window.__atelier.typeOf(window.__atelier.selected))) === 'column', 'Échap : la colonne parente est sélectionnée');
    expectCodes(t, es, ['store.select', 'canvas.key', 'action.parent'], 'sélectionner');
    capture('edition-selectionner', es);

    /* variante : Échap sur une section (pas de parent sélectionnable) */
    const sec = await c.locator('main > [data-type="section"]').first().getAttribute('data-node');
    const s2 = await mark(page);
    await c.locator(`[data-node="${sec}"]`).click({ position: { x: 4, y: 4 } });
    await page.keyboard.press('Escape');
    await t.wait(100);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['action.parent-none'], 'Échap sur une section');
    capture('edition-selectionner-section', es2);
  }

  /* 2.2 Ajouter un widget : clic dans la bibliothèque */
  await page.click('[data-left="widgets"]');
  await t.wait(100);
  {
    await c.locator('[data-type="text"]').first().click();
    await t.wait(100);
    const before = await count('button');
    const s = await mark(page);
    await page.click('.lib-item[data-type="button"]');
    await t.wait(300);
    const es = await since(page, s);
    t.ok((await count('button')) === before + 1, 'clic : bouton ajouté après la sélection');
    expectCodes(t, es, ['library.insert', 'action.add', 'store.commit', 'store.select', 'canvas.render'], 'ajouter (clic)');
    expectNoErrors(t, es, 'ajouter (clic)');
    capture('edition-ajouter-clic', es);

    /* variante : recherche dans la bibliothèque, sans résultat */
    const s2 = await mark(page);
    await page.fill('#libFilter', 'zzzz');
    await page.press('#libFilter', 'Enter');
    await t.wait(100);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['library.search-empty'], 'recherche sans résultat');
    await page.fill('#libFilter', 'vid');
    await page.locator('#libFilter').blur();
    await t.wait(100);
    const es2b = await since(page, s2);
    expectCodes(t, es2b, ['library.search'], 'recherche de widget');
    capture('edition-bibliotheque-recherche', es2b);
    await page.fill('#libFilter', '');
    await page.locator('#libFilter').dispatchEvent('input');
  }

  /* 2.3 Ajouter en glissant, déplacer, dépôts refusés */
  {
    const imgCol = await c.locator('[data-type="image"]').first().evaluate(e => e.closest('[data-type="column"]').getAttribute('data-node'));
    const before = await kids(imgCol);
    const s = await mark(page);
    await drag(await center(page.locator('.lib-item[data-type="button"]')), await canvasPoint(`[data-node="${imgCol}"] [data-type="image"]`, 0.15));
    await page.mouse.up();
    await t.wait(300);
    const es = await since(page, s);
    t.ok((await kids(imgCol)).length === before.length + 1, 'glisser : bouton déposé dans la colonne de l’image');
    expectCodes(t, es, ['dnd.start', 'dnd.ok', 'store.commit', 'store.select'], 'ajouter (glisser)');
    t.ok(es.find(e => e.code === 'dnd.ok')?.data?.parentType === 'column', 'dnd.ok : dans une colonne');
    capture('edition-ajouter-glisser', es);

    /* déplacer avec la poignée ✥ */
    const heroCol = await c.locator('[data-type="heading"]:has(h1)').first().evaluate(e => e.closest('[data-type="column"]').getAttribute('data-node'));
    const heroKids = await kids(heroCol);
    const btnId = heroKids.find(k => k.type === 'button').id;
    await c.locator(`[data-node="${btnId}"]`).click();
    await t.wait(150);
    const s2 = await mark(page);
    await drag(await canvasPoint('#selToolbar [data-act="move"]'), await canvasPoint(`[data-node="${heroKids[0].id}"]`, 0.2));
    await page.mouse.up();
    await t.wait(300);
    const es2 = await since(page, s2);
    t.ok((await kids(heroCol))[0].id === btnId, 'poignée ✥ : bouton remonté');
    t.ok((await S()).selected === btnId, 'après le déplacement, l’élément reste sélectionné');
    expectCodes(t, es2, ['dnd.start', 'dnd.ok'], 'déplacer');
    t.ok(es2.find(e => e.code === 'dnd.ok')?.data?.kind === 'move', 'dnd.ok : kind move');
    capture('edition-deplacer', es2);

    /* lâcher hors du canevas */
    const s3 = await mark(page);
    const headings = await count('heading');
    await drag(await center(page.locator('.lib-item[data-type="heading"]')), await center(page.locator('#inspector')));
    await page.mouse.up();
    await t.wait(200);
    const es3 = await since(page, s3);
    t.ok((await count('heading')) === headings, 'hors du canevas : rien ajouté');
    expectCodes(t, es3, ['dnd.start', 'dnd.cancel'], 'lâcher dehors');
    t.ok(es3.find(e => e.code === 'dnd.cancel')?.data?.reason === 'outside', 'dnd.cancel : raison outside');
    capture('edition-glisser-dehors', es3);

    /* Échap pendant le glisser */
    const s4 = await mark(page);
    await drag(await center(page.locator('.lib-item[data-type="heading"]')), await canvasPoint(`[data-node="${heroKids[0].id}"]`, 0.5));
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await t.wait(200);
    const es4 = await since(page, s4);
    t.ok((await count('heading')) === headings, 'Échap : glisser annulé');
    t.ok(has(es4, 'dnd.cancel', e => e.data?.by === 'Échap'), 'dnd.cancel : par Échap');
    capture('edition-glisser-echap', es4);

    /* dépôt refusé : une section sur un widget, dans la Structure */
    await page.click('[data-left="navigator"]');
    await t.wait(150);
    const secId = await c.locator('main > [data-type="section"]').nth(1).getAttribute('data-node');
    const s5 = await mark(page);
    const order = JSON.stringify((await site()).pages[0].root.children.map(x => x.id));
    const row = page.locator(`#navTree [data-node-id="${btnId}"]`);
    await drag(await center(page.locator(`#navTree [data-node-id="${secId}"]`)), await center(row));
    await page.mouse.up();
    await t.wait(250);
    const es5 = await since(page, s5);
    t.ok(JSON.stringify((await site()).pages[0].root.children.map(x => x.id)) === order, 'section sur un widget : refusée');
    expectCodes(t, es5, ['dnd.start', 'dnd.refused', 'dnd.cancel'], 'dépôt refusé');
    capture('edition-glisser-refuse', es5);

    /* réordonner dans la Structure */
    const k2 = await kids(heroCol);
    const s6 = await mark(page);
    const bb = await page.locator(`#navTree [data-node-id="${k2[0].id}"]`).boundingBox();
    await drag(await center(page.locator(`#navTree [data-node-id="${k2[2].id}"]`)), { x: bb.x + bb.width / 2, y: bb.y + 3 });
    await page.mouse.up();
    await t.wait(300);
    const es6 = await since(page, s6);
    t.ok((await kids(heroCol))[0].id === k2[2].id, 'Structure : élément remonté en tête');
    t.ok(has(es6, 'dnd.ok', e => e.data?.where === 'structure'), 'dnd.ok : dans la structure');
    capture('edition-structure-reordonner', es6);
  }

  /* 2.4 Panneau Structure : ouvrir, replier, clavier */
  {
    await page.click('[data-left="widgets"]');
    await t.wait(100);
    const s = await mark(page);
    await page.click('[data-left="navigator"]');
    await t.wait(150);
    await page.locator('#navTree .nav-row--section .nav-toggle').first().click();
    await t.wait(100);
    await page.locator('#navTree .nav-row--section .nav-toggle').first().click();
    await t.wait(100);
    const row = page.locator('#navTree .nav-row--section').first();
    await row.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await t.wait(150);
    const es = await since(page, s);
    expectCodes(t, es, ['structure.open', 'structure.collapse', 'structure.key', 'store.select'], 'structure');
    t.ok(es.filter(e => e.code === 'structure.collapse').length >= 4, 'structure : replier/déplier (clic et clavier)');
    capture('edition-structure', es);
  }

  /* 2.5 Éditer un texte en place : titre, Entrée */
  const h1 = c.locator('[data-type="heading"]:has(h1)').first();
  const h1Id = await h1.getAttribute('data-node');
  {
    const s = await mark(page);
    await h1.locator('h1').dblclick();
    await t.wait(150);
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Bonjour MAB');
    await page.keyboard.press('Enter');
    await t.wait(250);
    const es = await since(page, s);
    t.ok(JSON.stringify(await site()).includes('"fr":"Bonjour MAB"'), 'titre écrit dans la page');
    expectCodes(t, es, ['edit.dblclick', 'edit.start', 'store.commit', 'edit.ok'], 'texte en place');
    const ok = es.find(e => e.code === 'edit.ok');
    t.ok(ok?.data?.changed === true && ok?.data?.chars === 11, 'edit.ok : longueur seulement (11 caractères)');
    t.ok(!JSON.stringify(es.filter(e => e.code.startsWith('edit.'))).includes('Bonjour MAB'), 'le texte saisi n’est pas dans le journal');
    expectNoErrors(t, es, 'texte en place');
    capture('edition-texte-titre', es);
  }

  /* 2.6 Texte riche : gras, lien refusé puis accepté, collage, Échap */
  {
    const txt = c.locator('[data-type="text"]').first();
    const txtId = await txt.getAttribute('data-node');
    const selectStart = () => c.locator(`[data-node="${txtId}"] .rich`).evaluate(el => {
      const p = el.querySelector('p') || el;
      const tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 6);
      const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, 6);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      document.dispatchEvent(new Event('selectionchange'));
    });
    const s = await mark(page);
    await txt.locator('.rich').dblclick();
    await t.wait(150);
    await selectStart();
    await c.locator('#atelier-format [data-fmt="bold"]').click();
    await t.wait(100);
    t.ok((await S()).selected === txtId, 'la barre de mise en forme ne vide pas la sélection');
    await page.keyboard.press('Control+i');
    await t.wait(100);
    await c.locator('#atelier-format [data-fmt="link"]').click();
    await c.locator('#atelier-format .fmt-link input').fill('javascript:alert(1)');
    await c.locator('#atelier-format [data-fmt="link-ok"]').click();
    await t.wait(100);
    await selectStart();
    await c.locator('#atelier-format [data-fmt="link"]').click();
    await c.locator('#atelier-format .fmt-link input').fill('https://exemple.be');
    await c.locator('#atelier-format .fmt-link input').press('Enter');
    await t.wait(100);
    await c.locator(`[data-node="${txtId}"] .rich`).evaluate(el => {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const dt = new DataTransfer();
      dt.setData('text/html', '<b>riche</b><img src=x onerror="alert(1)">');
      dt.setData('text/plain', 'Ligne collée\nseconde ligne');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await t.wait(100);
    await page.keyboard.press('Escape');
    await t.wait(250);
    const es = await since(page, s);
    t.ok(await c.locator(`[data-node="${txtId}"] .rich a[href="https://exemple.be"]`).count() === 1, 'lien https ajouté');
    expectCodes(t, es, ['edit.start', 'edit.format', 'edit.link-open', 'edit.link-invalid', 'edit.paste', 'canvas.key', 'edit.ok'], 'texte riche');
    t.ok(has(es, 'edit.paste', e => e.data?.rich === true && e.data?.lines === 2), 'edit.paste : 2 lignes, mise en forme retirée');
    capture('edition-texte-riche', es);

    /* Ctrl+Z dans l'édition : termine l'édition puis annule */
    const s2 = await mark(page);
    await txt.locator('.rich').dblclick();
    await t.wait(100);
    await page.keyboard.type(' ajout');
    await page.keyboard.press('Control+z');
    await t.wait(250);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['edit.start', 'edit.ok', 'canvas.key', 'store.undo'], 'Ctrl+Z pendant l’édition');
    capture('edition-texte-annuler', es2);
  }

  /* 2.7 Refus d'édition : mode relecture ; Entrée sans texte */
  {
    const s = await mark(page);
    await page.evaluate(() => { window.__atelier.readOnly = true; });
    await h1.locator('h1').dblclick();
    await t.wait(150);
    await page.evaluate(() => { window.__atelier.readOnly = false; });
    await c.locator('[data-type="image"]').first().click();
    await page.keyboard.press('Enter');
    await t.wait(100);
    await c.locator('[data-type="button"]').first().click();
    await page.keyboard.press('Enter');
    await t.wait(150);
    await page.keyboard.press('Escape');
    await t.wait(150);
    const es = await since(page, s);
    expectCodes(t, es, ['edit.readonly', 'edit.no-text', 'edit.keyboard', 'edit.start', 'edit.ok'], 'refus et Entrée');
    capture('edition-texte-refus', es);
  }

  /* 2.8 Copier, coller, couper, dupliquer, supprimer */
  {
    const heroCol = await c.locator('[data-type="heading"]:has(h1)').first().evaluate(e => e.closest('[data-type="column"]').getAttribute('data-node'));
    const k = await kids(heroCol);
    await c.locator(`[data-node="${k[1].id}"]`).click();
    await t.wait(100);
    const s = await mark(page);
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await t.wait(150);
    await page.keyboard.press('Control+d');
    await t.wait(150);
    await page.keyboard.press('Delete');
    await t.wait(150);
    await page.keyboard.press('Control+x');
    await t.wait(150);
    await page.keyboard.press('Control+v');
    await t.wait(150);
    await page.keyboard.press('Alt+ArrowUp');
    await t.wait(150);
    const es = await since(page, s);
    t.ok((await kids(heroCol)).length === k.length + 1, 'copier, coller, dupliquer, supprimer, couper, coller : un élément de plus');
    expectCodes(t, es, ['action.copy', 'action.paste', 'action.duplicate', 'action.delete', 'action.cut', 'action.move'], 'copier-coller');
    capture('edition-copier-coller', es);

    /* refus : coller une colonne dans un widget */
    const col = await c.locator('[data-type="column"]').first().getAttribute('data-node');
    await page.click('[data-left="navigator"]');
    await page.click(`#navTree [data-node-id="${col}"]`);
    await page.keyboard.press('Control+c');
    await c.locator('[data-type="heading"]').first().click();
    const s2 = await mark(page);
    await page.keyboard.press('Control+v');
    await t.wait(150);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['action.refused', 'ui.toast'], 'coller refusé');
    t.ok(has(es2, 'action.refused', e => e.data?.action === 'coller'), 'action.refused : coller');
    capture('edition-coller-refuse', es2);
  }

  /* 2.9 Annuler, rétablir */
  {
    await c.locator('[data-type="heading"]').first().click();
    const s = await mark(page);
    await page.keyboard.press('Control+d');
    await t.wait(150);
    await page.keyboard.press('Control+z');
    await t.wait(150);
    await page.keyboard.press('Control+y');
    await t.wait(150);
    await page.keyboard.press('Control+Shift+z');
    await t.wait(150);
    await page.click('#undoBtn');
    await t.wait(150);
    const es = await since(page, s);
    expectCodes(t, es, ['action.duplicate', 'store.undo', 'store.redo', 'store.redo-none'], 'annuler / rétablir');
    capture('edition-annuler-retablir', es, { ui: true });
  }

  /* 2.10 Sélection multiple */
  {
    const hs = c.locator('[data-type="heading"]');
    await hs.nth(0).click();
    const s = await mark(page);
    await hs.nth(1).click({ modifiers: ['Shift'] });
    await hs.nth(2).click({ modifiers: ['Shift'] });
    await t.wait(150);
    const n = (await S()).multi.length;
    await page.keyboard.press('Control+x');
    await page.keyboard.press('Control+d');
    await t.wait(150);
    await page.keyboard.press('Control+z');
    await t.wait(150);
    await hs.nth(0).click();
    await hs.nth(1).click({ modifiers: ['Shift'] });
    await page.keyboard.press('Escape');
    await t.wait(150);
    const es = await since(page, s);
    t.ok(n === 3, 'Maj+clic : trois éléments sélectionnés');
    t.ok((await S()).multi.length === 0, 'Échap : retour à un seul élément');
    expectCodes(t, es, ['store.multi', 'action.refused', 'action.duplicate', 'store.undo'], 'sélection multiple');
    t.ok(has(es, 'action.duplicate', e => e.data?.count === 3), 'action.duplicate : 3 éléments');
    capture('edition-selection-multiple', es);
  }

  /* 2.11 Menu contextuel */
  {
    const hs = c.locator('[data-type="heading"]');
    const before = await count('heading');
    const s = await mark(page);
    await hs.nth(1).click({ button: 'right' });
    await t.wait(150);
    t.ok(await page.locator('#ctxMenu').isVisible(), 'clic droit : menu affiché');
    await page.click('#ctxMenu [data-ctx="duplicate"]');
    await t.wait(200);
    await hs.nth(1).click({ button: 'right' });
    await t.wait(100);
    await page.keyboard.press('Escape');
    await t.wait(100);
    const es = await since(page, s);
    t.ok((await count('heading')) === before + 1, 'menu : dupliquer');
    expectCodes(t, es, ['ctxmenu.open', 'ctxmenu.action', 'action.duplicate', 'ctxmenu.close'], 'menu contextuel');
    capture('edition-menu-contextuel', es);
    await page.keyboard.press('Control+z');
    await t.wait(150);
  }

  /* 2.12 Ctrl+K : ajouter un widget par la barre de commandes */
  {
    await c.locator('[data-type="text"]').first().click();
    const before = await count('divider');
    const s = await mark(page);
    await page.keyboard.press('Control+k');
    await t.wait(150);
    await page.fill('#cmdkInput', 'ajouter séparateur');
    await t.wait(150);
    await page.keyboard.press('Enter');
    await t.wait(300);
    const es = await since(page, s);
    t.ok((await count('divider')) === before + 1, 'Ctrl+K : séparateur ajouté');
    expectCodes(t, es, ['canvas.key', 'cmdk.run', 'action.add'], 'Ctrl+K');
    capture('edition-ctrl-k', es, { ui: true });
    await page.keyboard.press('Escape');
  }

  /* 2.13 Raccourcis : ? (aide), Ctrl+Alt+J (journal), Ctrl+S (fichier .json) */
  {
    await c.locator('[data-type="heading"]').first().click();
    const s = await mark(page);
    await page.keyboard.press('Alt+ArrowDown');
    await t.wait(100);
    await page.keyboard.press('Alt+ArrowUp');
    await t.wait(100);
    await page.locator('#saveState').click();
    await page.keyboard.press('?');
    await t.wait(150);
    const help = await page.locator('dialog[open]').count();
    await page.keyboard.press('Escape');
    await t.wait(100);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
    await t.wait(100);
    await page.keyboard.press('Control+Alt+j');
    await t.wait(200);
    const logOpen = await page.locator('#logDialog[open]').count();
    await page.keyboard.press('Escape');
    await t.wait(100);
    const es = await since(page, s);
    t.ok(help === 1 && logOpen === 1 && !!dl, 'raccourcis : aide, enregistrement .json, journal');
    expectCodes(t, es, ['canvas.key', 'action.move', 'ui.key', 'ui.dialog.open', 'project.export-json'], 'raccourcis');
    capture('edition-raccourcis', es, { ui: true });
  }

  /* 2.14 En-tête et pied de page : verrouillés tant qu'ils ne sont pas personnalisés */
  {
    const s = await mark(page);
    await c.locator('header.site-header').first().dblclick({ position: { x: 3, y: 3 } });
    await t.wait(200);
    const es = await since(page, s);
    expectCodes(t, es, ['canvas.zone-locked', 'ui.toast'], 'en-tête verrouillé');
    capture('edition-entete-verrouille', es);
  }

  /* ================= Chapitre 3 : mise en forme et design ================= */

  /* 3.1 Inspecteur : onglets, champs, refus */
  {
    const hh = c.locator('[data-type="heading"]:has(h2)').first();
    await hh.click();
    await t.wait(100);
    const s = await mark(page);
    await page.click('[data-insp="content"]');
    await page.selectOption('#inspector [data-field="level"]', 'h3');
    await t.wait(150);
    await page.fill('#inspector [data-field="text"][lang="fr"]', 'Titre de section');
    await page.locator('#inspector [data-field="text"][lang="fr"]').blur();
    await t.wait(150);
    await page.click('[data-insp="advanced"]');
    await page.fill('#inspector [data-adv="anchor"]', 'services');
    await page.locator('#inspector [data-adv="anchor"]').blur();
    await t.wait(150);
    await page.fill('#inspector [data-adv="css"]', 'outline: 2px solid red');
    await page.locator('#inspector [data-adv="css"]').blur();
    await t.wait(150);
    await page.fill('#inspector [data-adv="css"]', 'color:red}body{display:none');
    await page.locator('#inspector [data-adv="css"]').blur();
    await t.wait(150);
    await page.click('[data-insp="content"]');
    await t.wait(100);
    const es = await since(page, s);
    expectCodes(t, es, ['inspector.tab', 'inspector.field', 'inspector.advanced', 'inspector.css-refused'], 'inspecteur');
    t.ok(has(es, 'inspector.field', e => e.data?.key === 'level' && e.data?.option === 'h3'), 'inspector.field : liste « level » = h3');
    t.ok(has(es, 'inspector.field', e => e.data?.key === 'text' && e.data?.chars === 16 && e.data?.lang === 'fr'), 'inspector.field : texte, longueur seulement');
    capture('style-inspecteur', es);

    /* variante : disposition des colonnes d'une rangée, liste (élément ajouté) */
    await page.click('[data-left="navigator"]');
    const row = page.locator('#navTree [data-type="row"]').first();
    await row.click();
    await t.wait(100);
    const s2 = await mark(page);
    await page.click('#inspector [data-layout="4-4-4"]');
    await t.wait(200);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['inspector.layout', 'store.commit'], 'disposition');
    capture('style-inspecteur-disposition', es2);
    await page.keyboard.press('Control+z');
  }

  /* 3.1 bis Inspecteur : lien, case, liste, adresse d'image */
  {
    await c.locator('[data-type="button"]').first().click();
    await page.click('[data-insp="content"]');
    await t.wait(100);
    const s = await mark(page);
    const pages = (await site()).pages;
    await page.selectOption('#inspector [data-link-pick="link"]', `page:${pages[1].id}`);
    await t.wait(100);
    await page.fill('#inspector [data-field="link"]', 'http://exemple.be');
    await page.locator('#inspector [data-field="link"]').blur();
    await page.locator('#inspector [data-field="newTab"]').check();
    await t.wait(100);
    await page.click('[data-left="widgets"]');
    await page.click('.lib-item[data-type="icon-list"]');
    await t.wait(200);
    await page.click('[data-insp="content"]');
    await page.click('#inspector [data-list-add="items"]');
    await t.wait(150);
    await c.locator('[data-type="image"]').first().click();
    await page.click('[data-insp="content"]');
    await page.fill('#inspector .image-field input[type="url"]', 'ftp://exemple.be/photo.jpg');
    await page.locator('#inspector .image-field input[type="url"]').blur();
    await t.wait(150);
    await page.keyboard.press('Control+z');
    await t.wait(150);
    const es = await since(page, s);
    expectCodes(t, es, ['inspector.link-pick', 'inspector.field', 'inspector.list', 'inspector.image-url'], 'inspecteur : variantes');
    t.ok(has(es, 'inspector.field', e => e.data?.kind === 'http (non sécurisé)'), 'inspector.field : lien http signalé');
    t.ok(has(es, 'inspector.image-url', e => e.level === 'warn'), 'inspector.image-url : adresse sans https en WARN');
    capture('style-inspecteur-variantes', es);
  }

  /* 3.1 ter Rechargement interrompu : changer de page puis de langue aussitôt */
  {
    const s = await mark(page);
    const pages = (await site()).pages;
    await page.evaluate(([p1]) => {
      const ps = document.querySelector('#pageSelect'); ps.value = p1; ps.dispatchEvent(new Event('change', { bubbles: true }));
      const ls = document.querySelector('#langSelect'); ls.value = 'nl'; ls.dispatchEvent(new Event('change', { bubbles: true }));
    }, [pages[1].id]);
    await page.waitForFunction(s0 => window.atelierDebug.entries({ since: s0 }).some(e => e.code === 'canvas.load.ok'), s);
    await page.evaluate(([p0]) => {
      const ls = document.querySelector('#langSelect'); ls.value = 'fr'; ls.dispatchEvent(new Event('change', { bubbles: true }));
      const ps = document.querySelector('#pageSelect'); ps.value = p0; ps.dispatchEvent(new Event('change', { bubbles: true }));
    }, [pages[0].id]);
    await t.wait(400);
    const es = await since(page, s);
    expectCodes(t, es, ['canvas.load.start', 'canvas.load.cancel', 'canvas.load.ok'], 'rechargement interrompu');
    capture('edition-canevas-recharge', es);
  }

  /* 3.2 Styles par appareil */
  {
    await h1.click();
    await page.click('[data-insp="style"]');
    await t.wait(150);
    const s = await mark(page);
    await page.fill('#inspector [data-style="fontSize"]', '72');
    await page.press('#inspector [data-style="fontSize"]', 'Enter');
    await t.wait(200);
    await page.click('[data-device="mobile"]');
    await t.wait(400);
    await page.fill('#inspector [data-style="fontSize"]', '30px');
    await page.press('#inspector [data-style="fontSize"]', 'Enter');
    await t.wait(200);
    await page.click('#inspector [data-reset="fontSize"]');
    await t.wait(200);
    await page.fill('#inspector [data-style="fontSize"]', '12pt');
    await page.press('#inspector [data-style="fontSize"]', 'Enter');
    await t.wait(200);
    await page.fill('#inspector [data-style="fontSize"]', '');
    await page.press('#inspector [data-style="fontSize"]', 'Enter');
    await page.click('[data-device="desktop"]');
    await t.wait(400);
    const es = await since(page, s);
    t.ok(has(es, 'style.set', e => e.data?.device === 'desktop' && e.data?.value === '72px' && e.data?.autoPx), 'style.set : 72 → 72px sur ordinateur');
    t.ok(has(es, 'style.set', e => e.data?.device === 'mobile'), 'style.set : sur mobile');
    t.ok(has(es, 'canvas.scale', e => e.data?.device === 'mobile'), 'canvas.scale : canevas mobile');
    expectCodes(t, es, ['style.set', 'store.view', 'canvas.scale', 'style.reset', 'style.refused'], 'styles par appareil');
    capture('style-appareils', es);

    /* tablette par l'onglet Style, vue 3 appareils */
    const s2 = await mark(page);
    await page.click('#inspector .state-switch button:has-text("Tablette")');
    await t.wait(300);
    await page.click('#inspector [data-style-all-devices]');
    await t.wait(150);
    await page.fill('#inspector [data-style="fontSize"][data-device-col="mobile"]', '28px');
    await page.press('#inspector [data-style="fontSize"][data-device-col="mobile"]', 'Enter');
    await t.wait(150);
    await page.click('#inspector [data-style-all-devices]');
    await page.click('#inspector .state-switch button:has-text("Ordinateur")');
    await t.wait(300);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['style.device', 'style.all-devices', 'style.set'], 'trois appareils');
    capture('style-trois-appareils', es2);
  }

  /* 3.3 État survol, contraste */
  {
    const btn = c.locator('[data-type="button"]').first();
    await btn.click();
    await page.click('[data-insp="style"]');
    const s = await mark(page);
    await page.click('#inspector [data-style-state="hover"]');
    await t.wait(150);
    await page.click('#inspector [data-style-wrap="background"] [data-swatch="c3"]');
    await t.wait(200);
    await page.click('#inspector [data-style-state="normal"]');
    await t.wait(150);
    const es = await since(page, s);
    t.ok(has(es, 'style.set', e => e.data?.state === 'survol' && e.data?.palette), 'style.set : survol, couleur de palette');
    expectCodes(t, es, ['style.state', 'style.set'], 'survol');
    capture('style-survol', es);

    const txt = c.locator('[data-type="text"]').first();
    await txt.click();
    await page.click('[data-insp="style"]');
    const s2 = await mark(page);
    await page.fill('#inspector [data-style="color"]', '#bbbbbb');
    await page.press('#inspector [data-style="color"]', 'Enter');
    await t.wait(250);
    await page.click('#inspector [data-style-wrap="color"] [data-swatch="c3"]');
    await t.wait(250);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['style.set', 'style.contrast-low', 'style.contrast-ok'], 'contraste');
    capture('style-contraste', es2);
  }

  /* 3.4 Copier / coller le style */
  {
    await h1.click();
    await page.click('[data-insp="style"]');
    const s = await mark(page);
    await page.click('#inspector [data-style-copy]');
    await c.locator('[data-type="heading"]:has(h2)').first().click();
    await t.wait(100);
    await page.click('#inspector [data-act="pasteStyle"]');
    await t.wait(200);
    const es = await since(page, s);
    expectCodes(t, es, ['style.copy', 'style.paste'], 'copier le style');
    capture('style-copier-coller', es);
  }

  /* 3.5 Presets */
  {
    const btns = c.locator('[data-type="button"]');
    await btns.nth(0).click();
    await page.click('[data-insp="style"]');
    await t.wait(100);
    const s = await mark(page);
    await page.click('#inspector [data-preset-new]');
    await page.fill('#inspector [data-preset-name]', 'Bouton sombre');
    await page.click('#inspector [data-preset-create]');
    await t.wait(250);
    const pid = Object.entries((await site()).presets).find(([, p]) => p.name === 'Bouton sombre')?.[0];
    await btns.nth(1).click();
    await t.wait(100);
    await page.selectOption('#inspector [data-preset-select]', pid);
    await t.wait(250);
    await page.click('#inspector [data-preset-edit]');
    await t.wait(150);
    await page.locator('#inspector .style-group:has([data-style-wrap="background"])').evaluate(d => { d.open = true; });
    await page.click('#inspector [data-style-wrap="background"] [data-swatch="c2"]');
    await t.wait(200);
    await page.click('#inspector [data-preset-edit]');
    await page.click('#inspector [data-preset-default]');
    await t.wait(150);
    await page.click('#inspector [data-preset-detach]');
    await t.wait(200);
    await page.click('#inspector [data-preset-new]');
    await page.fill('#inspector [data-preset-name]', '');
    await page.click('#inspector [data-preset-create]');
    await t.wait(150);
    const es = await since(page, s);
    t.ok(!!pid, 'preset créé');
    expectCodes(t, es, ['style.preset-form', 'style.preset-create', 'style.preset-apply', 'style.preset-edit', 'style.set', 'style.preset-default', 'style.preset-detach', 'style.preset-refused'], 'presets');
    t.ok(has(es, 'style.set', e => e.data?.target === 'preset'), 'style.set : sur le preset');
    capture('style-presets', es);
  }

  /* 3.6 Couleurs et polices du site (panneau Site) */
  {
    await page.click('[data-left="site"]');
    await t.wait(150);
    const s = await mark(page);
    await page.locator('[data-palette="c1"]').evaluate(e => { e.value = '#0055aa'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
    await t.wait(300);
    await page.selectOption('[data-font="heading"]', 'georgia');
    await t.wait(500);
    const es = await since(page, s);
    t.ok(has(es, 'canvas.load.start', e => e.data?.reason === 'polices du site'), 'police changée : canevas rechargé (polices du site)');
    expectCodes(t, es, ['store.commit', 'canvas.load.start', 'canvas.load.ok'], 'couleurs et polices');
    capture('style-couleurs-polices', es);
  }

  /* 3.7 Modèle de section : clic et glisser */
  {
    await page.click('[data-left="templates"]');
    await t.wait(150);
    const before = await count('section');
    const s = await mark(page);
    await page.click('.tpl[data-template="hero"]');
    await t.wait(300);
    const lastSec = await c.locator('main > [data-type="section"]').last().getAttribute('data-node');
    await page.locator('.tpl[data-template="contact"]').scrollIntoViewIfNeeded();
    await drag(await center(page.locator('.tpl[data-template="contact"]')), await canvasPoint(`[data-node="${lastSec}"]`, 0.9));
    await page.mouse.up();
    await t.wait(300);
    const es = await since(page, s);
    t.ok((await count('section')) === before + 2, 'deux modèles ajoutés (clic et glisser)');
    expectCodes(t, es, ['template.insert', 'action.add-section', 'dnd.start', 'dnd.ok'], 'modèles');
    capture('style-modele-section', es);
  }

  /* 3.8 Composant : créer, insérer, modifier, renommer, supprimer */
  {
    const cta = c.locator('main > [data-type="section"]').nth(2);
    const ctaId = await cta.getAttribute('data-node');
    await page.click('[data-left="navigator"]');
    await t.wait(100);
    const s = await mark(page);
    await page.click(`#navTree [data-node-id="${ctaId}"]`, { button: 'right' });
    await t.wait(150);
    await page.click('#ctxMenu [data-ctx="component"]');
    await t.wait(300);
    const cid = Object.keys((await site()).components || {})[0];
    await page.click('[data-left="templates"]');
    await t.wait(150);
    await c.locator('[data-type="heading"]').first().click();
    await page.click(`[data-component="${cid}"]`);
    await t.wait(300);
    const es = await since(page, s);
    t.ok(!!cid && await c.locator(`[data-ref="${cid}"]`).count() === 2, 'composant créé puis inséré (2 instances)');
    expectCodes(t, es, ['ctxmenu.action', 'action.component-create', 'template.component', 'action.component-insert'], 'composant créer et insérer');
    capture('style-composant-creer', es);

    const s2 = await mark(page);
    await c.locator(`[data-ref="${cid}"]`).first().dblclick({ position: { x: 4, y: 4 } });
    await t.wait(400);
    await c.locator('[data-type="heading"]').first().locator('.heading').dblclick();
    await t.wait(150);
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Ensemble');
    await page.keyboard.press('Enter');
    await t.wait(200);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(400);
    const es2 = await since(page, s2);
    t.ok((await c.locator(`[data-ref="${cid}"]`).first().textContent()).includes('Ensemble'), 'composant modifié partout');
    expectCodes(t, es2, ['canvas.dblclick', 'store.edit-target', 'canvas.load.start', 'edit.start', 'edit.ok'], 'composant modifier');
    capture('style-composant-modifier', es2);

    const s3 = await mark(page);
    await page.fill(`[data-component-rename="${cid}"]`, 'Appel à l’action');
    await page.press(`[data-component-rename="${cid}"]`, 'Enter');
    await t.wait(150);
    await page.click('[data-left="navigator"]');
    await t.wait(100);
    const anyH = await c.locator('[data-type="heading"]').first().getAttribute('data-node');
    await page.click(`#navTree [data-node-id="${anyH}"]`);
    await page.click('[data-insp="advanced"]');
    await page.evaluate(() => { window.__atelier.editTarget = { kind: 'header' }; });
    await page.click('#inspector [data-component-create]').catch(() => {});
    await page.evaluate(() => { window.__atelier.editTarget = null; });
    await page.click('[data-left="templates"]');
    await t.wait(150);
    await page.click(`[data-component-delete="${cid}"]`);
    await t.wait(300);
    const es3 = await since(page, s3);
    t.ok(!(await site()).components?.[cid], 'composant supprimé');
    expectCodes(t, es3, ['action.component-rename', 'action.component-delete'], 'composant renommer, supprimer');
    capture('style-composant-renommer-supprimer', es3);
  }

  /* 3.9 En-tête en blocs */
  {
    await page.click('[data-left="site"]');
    await t.wait(150);
    const s = await mark(page);
    await page.click('[data-layout-edit="header"]');
    await t.wait(400);
    await c.locator('header [data-type="nav-menu"]').click();
    await page.click('[data-insp="content"]');
    await page.selectOption('#inspector [data-field="align"]', 'start');
    await t.wait(200);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(400);
    const es = await since(page, s);
    expectCodes(t, es, ['store.edit-target', 'canvas.load.start', 'canvas.load.ok', 'inspector.field'], 'en-tête en blocs');
    capture('style-entete-blocs', es);

    const s2 = await mark(page);
    await c.locator('header.site-header').first().dblclick({ position: { x: 3, y: 3 } });
    await t.wait(400);
    await page.click('#editBanner [data-edit-done]');
    await t.wait(300);
    const es2 = await since(page, s2);
    expectCodes(t, es2, ['canvas.dblclick', 'store.edit-target'], 'en-tête : double-clic');
    capture('style-entete-double-clic', es2);
  }

  /* 3.10 Image : importer dans l'inspecteur */
  {
    const pngPath = join(t.shots, 'c16-photo.png');
    execFileSync('python3', ['-c', "from PIL import Image\nImage.linear_gradient('L').resize((800, 450)).convert('RGB').save('" + pngPath + "')"]);
    const badPath = join(t.shots, 'c16-faux.png');
    execFileSync('python3', ['-c', "open('" + badPath + "','wb').write(b'pas une image')"]);
    await c.locator('[data-type="image"]').first().click();
    await page.click('[data-insp="content"]');
    const s = await mark(page);
    await page.setInputFiles('#inspector input[type="file"][data-field="src"]', pngPath);
    await page.waitForFunction(() => window.atelierDebug.entries().some(e => e.code === 'inspector.image.ok' || e.code === 'inspector.image.fail'), null, { timeout: 15000 });
    await t.wait(200);
    await page.setInputFiles('#inspector input[type="file"][data-field="src"]', badPath);
    await page.waitForFunction(s0 => window.atelierDebug.entries({ since: s0 }).some(e => e.code === 'inspector.image.fail'), s, { timeout: 15000 }).catch(() => {});
    await t.wait(200);
    const es = await since(page, s);
    expectCodes(t, es, ['inspector.image.start', 'inspector.image.webp', 'inspector.image.ok', 'inspector.image.fail'], 'image');
    capture('style-image', es);
  }

  /* Pas d'erreur imprévue dans tout le parcours */
  {
    const es = await since(page, 0);
    expectNoErrors(t, es, 'édition et design', ['inspector.image.fail', 'image.import.fail', 'ui.toast']);
    const all = new Set(codes(es));
    t.ok(all.size > 60, `${all.size} codes différents vus pendant le test`);
  }
  await page.screenshot({ path: `${t.shots}/c16-edition.png` });
}
