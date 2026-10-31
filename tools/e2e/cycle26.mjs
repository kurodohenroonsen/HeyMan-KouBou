/*
 * Cycle 26 : première visite — dépôt sur page vide et retours visibles (X4), visite guidée, liste « Pour commencer »
 * et démonstration Kumakōgen (X1). Le site de la personne doit être intact après la démonstration.
 */
import { mark, since, waitCode, expectCodes, capture } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  page.setDefaultTimeout(10000);
  const S = () => page.evaluate(() => ({ selected: window.__atelier.selected, pageId: window.__atelier.pageId, lang: window.__atelier.lang, device: window.__atelier.device, name: window.__atelier.site.name, languages: window.__atelier.site.languages, pages: window.__atelier.site.pages.length }));
  const site = () => page.evaluate(() => window.__atelier.site);
  const toasts = re => page.locator('#toasts .toast').filter({ hasText: re }).count();
  const center = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  async function canvasPoint(selector, fy = 0.5, fx = 0.5) {
    const box = await page.locator('#canvas').boundingBox();
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

  /* ===== X4.1 Déposer un widget sur une page vide : section + colonne + widget, comme le clic ===== */
  {
    await page.click('#fileMenu > summary');
    await page.click('#newSiteBtn');
    await page.waitForSelector('#newSiteDialog[open]');
    await page.fill('#newSiteName', 'Site vide du test');
    let s = await mark(page);
    await page.click('#newSiteCreate');
    await waitCode(page, 'project.new', s);
    await waitCode(page, 'canvas.load.ok', s);
    await t.wait(200);
    t.ok((await site()).pages[0].root.children.length === 0, 'nouveau site : page vide');
    t.ok(await c.locator('.ph--page').count() === 1, 'espace réservé « Page vide » affiché');
    t.ok(/widget/.test(await c.locator('.ph--page').textContent()), 'l’espace réservé invite aussi à glisser un widget');
    s = await mark(page);
    await drag(await center(page.locator('.lib-item[data-type="heading"]')), await canvasPoint('.ph--page', 0.5));
    const ghostForbidden = await page.evaluate(() => document.querySelector('#dragGhost').classList.contains('is-forbidden'));
    await page.mouse.up();
    await waitCode(page, 'dnd.ok', s);
    await t.wait(200);
    let es = await since(page, s);
    const root = (await site()).pages[0].root;
    t.ok(!ghostForbidden, 'au-dessus de la page vide, le fantôme n’est pas barré');
    t.ok(root.children.length === 1 && root.children[0].type === 'section', 'dépôt sur page vide : une section créée');
    t.ok(root.children[0].children[0]?.children[0]?.children[0]?.type === 'heading', 'section › rangée › colonne › Titre');
    const ok = es.find(e => e.code === 'dnd.ok');
    t.ok(ok?.data?.wrapped === true && ok?.data?.type === 'heading', 'dnd.ok : wrapped, type heading');
    t.ok((await S()).selected === root.children[0].children[0].children[0].children[0].id, 'le Titre déposé est sélectionné');
    capture('premiere-visite-depot-page-vide', es);

    /* un deuxième widget, déposé sous la première section (marge de la page) → deuxième section */
    s = await mark(page);
    const main = await canvasPoint('main', 0.98);
    await drag(await center(page.locator('.lib-item[data-type="text"]')), main);
    await page.mouse.up();
    await waitCode(page, 'dnd.ok', s);
    await t.wait(150);
    t.ok((await site()).pages[0].root.children.length === 2, 'dépôt sous la section : deuxième section créée');
  }

  /* ===== X4.2 Dépôt refusé : fantôme barré + message qui dit où déposer ===== */
  {
    /* dans la Structure : une section lâchée sur un widget (seul endroit où rien n'est possible) */
    await page.click('[data-left="navigator"]');
    await t.wait(150);
    const root0 = (await site()).pages[0].root;
    const secId = root0.children[0].id;
    const headId = root0.children[0].children[0].children[0].children[0].id;
    const s = await mark(page);
    const before = JSON.stringify(root0);
    await drag(await center(page.locator(`#navTree [data-node-id="${secId}"]`)), await center(page.locator(`#navTree [data-node-id="${headId}"]`)));
    const forbidden = await page.evaluate(() => document.querySelector('#dragGhost').classList.contains('is-forbidden'));
    await page.mouse.up();
    await t.wait(250);
    const es = await since(page, s);
    t.ok(forbidden, 'fantôme barré (classe is-forbidden) au-dessus d’un emplacement interdit');
    t.ok(JSON.stringify((await site()).pages[0].root) === before, 'rien n’a changé');
    expectCodes(t, es, ['dnd.refused', 'dnd.cancel', 'ui.toast'], 'dépôt refusé');
    t.ok((await toasts(/Impossible de déposer ici/)) === 1, 'message : impossible de déposer ici + où déposer');
    t.ok(!(await page.evaluate(() => document.querySelector('#dragGhost').classList.contains('is-forbidden'))), 'fantôme remis à neuf après le lâcher');
    capture('premiere-visite-depot-refuse', es);
    await page.click('[data-left="widgets"]');
    await t.wait(100);
  }

  /* ===== X4.3 Suppression simple → message avec Ctrl+Z ; Retour arrière hors édition : même message ===== */
  {
    await c.locator('[data-type="text"]').first().click();
    let s = await mark(page);
    await page.keyboard.press('Delete');
    await waitCode(page, 'action.delete', s);
    let es = await since(page, s);
    t.ok((await toasts(/Supprimé : Texte — Ctrl\+Z/)) === 1, 'Suppr : « Supprimé : Texte — Ctrl+Z pour annuler »');
    expectCodes(t, es, ['action.delete', 'ui.toast'], 'supprimer');
    capture('premiere-visite-supprimer', es);
    await page.click('#undoBtn');
    await t.wait(200);
    t.ok(await c.locator('[data-type="text"]').count() === 1, 'Ctrl+Z (↶) : le texte revient');
    await c.locator('[data-type="text"]').first().click();
    s = await mark(page);
    await page.keyboard.press('Backspace');
    await waitCode(page, 'action.delete', s);
    t.ok((await toasts(/Supprimé : Texte — Ctrl\+Z/)) >= 1, 'Retour arrière hors édition : supprime, avec le même message');
    await page.click('#undoBtn');
    await t.wait(200);
  }

  /* ===== X4.4 Ctrl+S : « Déjà enregistré », aucun téléchargement ; le .json reste dans Fichier ===== */
  {
    let download = null;
    page.once('download', d => { download = d; });
    const s = await mark(page);
    await page.locator('#saveState').click();
    await page.keyboard.press('Control+s');
    await t.wait(300);
    const es = await since(page, s);
    t.ok((await toasts(/Déjà enregistré/)) === 1 && download === null, 'Ctrl+S : message « Déjà enregistré », rien n’est téléchargé');
    expectCodes(t, es, ['project.already-saved'], 'Ctrl+S');
    t.ok(!es.some(e => e.code === 'project.export-json'), 'aucun export .json déclenché par Ctrl+S');
    capture('premiere-visite-ctrl-s', es);
  }
}
