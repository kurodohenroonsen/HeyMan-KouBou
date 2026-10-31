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
  /* ===== X1.a Première visite : la visite guidée est proposée (sans ?fresh), Échap/Passer, plus jamais ensuite ===== */
  {
    t.ok(await page.locator('#tourBubble').count() === 0, 'avec ?fresh (tests), aucune visite proposée');
    await page.evaluate(() => localStorage.removeItem('atelier-tour'));
    await page.goto(t.base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true);
    await page.waitForSelector('#tourBubble', { timeout: 5000 });
    let s = await mark(page);
    let es = await since(page, 0);
    t.ok(es.some(e => e.code === 'tour.start' && e.data?.auto === true), 'première visite : journal tour.start {auto:true}');
    t.ok(await page.locator('#tourBubble[role="dialog"][aria-labelledby="tourTitle"]').count() === 1, 'bulle role=dialog avec aria-labelledby');
    t.ok(await page.locator('#tourMask').count() === 1, 'masque affiché');
    t.ok(/Bienvenue/.test(await page.locator('#tourTitle').textContent()), 'accueil « Bienvenue dans Atelier »');
    t.ok(await page.evaluate(() => document.activeElement?.closest('#tourBubble') !== null), 'le focus est dans la bulle');
    await page.click('#tourBubble [data-tour="next"]');
    await t.wait(200);
    t.ok(/bibliothèque/i.test(await page.locator('#tourTitle').textContent()), 'étape 1 : la bibliothèque');
    t.ok(await page.locator('#tourBubble').getAttribute('data-side') === 'right', 'bulle à droite du panneau de gauche');
    const cut = await page.evaluate(() => document.querySelector('#tourMask path').getAttribute('d'));
    t.ok(/Z.*M.*Z/.test(cut), 'masque avec découpe autour de la cible');
    /* Tab enfermé dans la bulle */
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    t.ok(await page.evaluate(() => document.activeElement?.closest('#tourBubble') !== null), 'Tab reste dans la bulle');
    await page.keyboard.press('ArrowRight');
    await t.wait(150);
    t.ok(/page/i.test(await page.locator('#tourTitle').textContent()), 'flèche → : étape 2, la page');
    await page.keyboard.press('ArrowLeft');
    await t.wait(150);
    t.ok(/bibliothèque/i.test(await page.locator('#tourTitle').textContent()), 'flèche ← : retour à l’étape 1');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await t.wait(150);
    t.ok(/inspecteur/i.test(await page.locator('#tourTitle').textContent()) && await page.locator('#tourBubble').getAttribute('data-side') === 'left', 'étape 3 : l’inspecteur, bulle à gauche');
    /* redimensionnement : la bulle suit */
    const before = await page.locator('#tourBubble').boundingBox();
    await page.setViewportSize({ width: 1240, height: 900 });
    await t.wait(250);
    const after = await page.locator('#tourBubble').boundingBox();
    t.ok(after.x < before.x, 'après un redimensionnement, la bulle est repositionnée');
    await page.setViewportSize({ width: 1440, height: 900 });
    await t.wait(200);
    await page.keyboard.press('Escape');
    await t.wait(200);
    es = await since(page, s);
    t.ok(await page.locator('#tourBubble').count() === 0 && await page.locator('#tourMask').count() === 0, 'Échap : visite fermée (masque et bulle retirés)');
    expectCodes(t, es, ['tour.step', 'tour.skip'], 'visite passée');
    t.ok(es.find(e => e.code === 'tour.skip')?.data?.step === 2, 'tour.skip : étape atteinte (3e = index 2)');
    t.ok(JSON.parse(await page.evaluate(() => localStorage.getItem('atelier-tour')))?.how === 'skip', 'choix retenu : atelier-tour {how:skip}');
    capture('premiere-visite-visite-guidee', es);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true);
    await t.wait(900);
    t.ok(await page.locator('#tourBubble').count() === 0, 'après « Passer », la visite n’est plus proposée');
  }

  /* ===== X1.a Rejouer : ❓ ▾, Fichier, Ctrl+K ; Terminer ===== */
  {
    let s = await mark(page);
    await page.click('#helpMenu > summary');
    await page.click('#helpTourBtn');
    await page.waitForSelector('#tourBubble');
    t.ok(!/Bienvenue/.test(await page.locator('#tourTitle').textContent()), 'relancée à la demande : première étape directement (pas d’accueil)');
    t.ok(await page.evaluate(() => !document.querySelector('#helpMenu').open), 'le menu ❓ ▾ se referme');
    for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowRight'); await t.wait(120); }
    t.ok(/Terminer|Finish|終了/.test(await page.locator('#tourBubble [data-tour="next"]').textContent()), 'dernière étape : bouton « Terminer »');
    t.ok(await page.locator('#tourBubble').getAttribute('data-side') === 'bottom', 'étape 5 : bulle sous Fichier et ❓');
    await page.click('#tourBubble [data-tour="next"]');
    await t.wait(200);
    let es = await since(page, s);
    expectCodes(t, es, ['tour.start', 'tour.done'], 'visite terminée');
    t.ok(es.find(e => e.code === 'tour.start')?.data?.from === '❓', 'tour.start depuis ❓');
    t.ok(await page.locator('#tourBubble').count() === 0, 'Terminer : fermée');
    await page.click('#fileMenu > summary');
    await page.click('#tourBtn');
    await page.waitForSelector('#tourBubble');
    t.ok(await page.locator('#tourBubble').count() === 1, 'Fichier → Visite guidée');
    await page.click('#tourBubble [data-tour="skip"]');
    await t.wait(150);
    await page.keyboard.press('Control+k');
    await page.fill('#cmdkInput', 'visite');
    await t.wait(200);
    await page.keyboard.press('Enter');
    await page.waitForSelector('#tourBubble');
    t.ok(await page.locator('#tourBubble').count() === 1, 'Ctrl+K « Visite guidée »');
    await page.keyboard.press('Escape');
    await t.wait(150);
  }

  /* ===== X1.b Liste « Pour commencer » : 7 étapes, cochées par le journal, pourcentage, liens, masquer ===== */
  {
    await page.evaluate(() => localStorage.removeItem('atelier-onboarding'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true);
    await page.click('[data-left="widgets"]');
    await t.wait(150);
    t.ok(await page.locator('#onboarding').count() === 1, 'bloc « Pour commencer » en tête de l’onglet Widgets');
    t.ok(await page.locator('#onboarding .onboard__item').count() === 7, '7 étapes');
    t.ok(await page.locator('#onboarding .onboard__item.is-done').count() === 0, 'aucune cochée au départ');
    t.ok(/0 \/ 7/.test(await page.locator('[data-onboard-pct]').textContent()), 'pourcentage 0 %');
    const done = () => page.locator('#onboarding .onboard__item.is-done').evaluateAll(els => els.map(e => e.dataset.onboard));
    let s = await mark(page);
    await page.click('[data-device="mobile"]');
    await t.wait(200);
    t.ok((await done()).includes('mobile'), '« Regarder sur mobile » cochée automatiquement');
    await page.click('[data-device="desktop"]');
    await page.click('[data-left="templates"]');
    await page.click('.tpl[data-template="features"]');
    await t.wait(300);
    await page.click('[data-left="widgets"]');
    await t.wait(150);
    t.ok((await done()).includes('section'), '« Ajouter une section » cochée après un modèle');
    await page.click('[data-left="site"]');
    await page.fill('#leftBody [data-site="name"]', 'Mon site à moi');
    await page.locator('#leftBody [data-site="name"]').dispatchEvent('change');
    await page.click('[data-left="widgets"]');
    await t.wait(150);
    t.ok((await done()).includes('name'), '« Nommer le site » cochée');
    t.ok(/3 \/ 7 · 43 %/.test(await page.locator('[data-onboard-pct]').textContent()), 'pourcentage 43 %');
    let es = await since(page, s);
    expectCodes(t, es, ['onboarding.step-done'], 'étapes cochées');
    t.ok(es.filter(e => e.code === 'onboarding.step-done').length === 3, 'trois lignes onboarding.step-done');
    capture('premiere-visite-pour-commencer', es);
    /* lien « → » d'une étape : écrire un titre → le premier titre passe en édition */
    await page.click('#onboarding [data-onboard-go="heading"]');
    await t.wait(400);
    t.ok(await c.locator('[contenteditable="true"]').count() === 1, 'lien « Écrire un titre » : le titre est en cours d’écriture');
    await page.keyboard.type(' !');
    await page.keyboard.press('Enter');
    await t.wait(300);
    t.ok((await done()).includes('heading'), '« Écrire un titre » cochée après l’écriture');
    /* replier, choix retenu après rechargement ; masquer */
    await page.click('#onboarding .onboard__toggle');
    t.ok(await page.locator('#onboardList').isHidden(), 'liste repliée');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true);
    await t.wait(200);
    t.ok(await page.locator('#onboardList').isHidden() && (await done()).length === 4, 'après rechargement : repliée, 4 étapes toujours cochées');
    await page.click('#onboarding .onboard__toggle');
    await page.click('#onboarding .onboard__hide');
    await t.wait(150);
    t.ok(await page.locator('#onboarding').count() === 0, '« Masquer la liste » : bloc retiré');
    await page.keyboard.press('Control+k');
    await page.fill('#cmdkInput', 'pour commencer');
    await t.wait(200);
    await page.keyboard.press('Enter');
    await t.wait(200);
    t.ok(await page.locator('#onboarding').count() === 1, 'Ctrl+K « Pour commencer » : la liste revient');
  }
}
