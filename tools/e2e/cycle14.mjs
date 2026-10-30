/* Cycle 14 : collaboration pair-à-pair entre trois navigateurs isolés (WebRTC réel), signalisation par publish.php (php -S),
   présence, relecteur limité aux commentaires signés, annuler seulement ses changements, reprise après coupure, codes manuels. */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublishPhp, sha256Hex } from '../../core/publish.js';

export default async function (t) {
  const { page: A, browser, base } = t;
  const cA = t.canvas();
  const errors = [];
  const port = 8900 + Math.floor(Math.random() * 90);
  const www = join(t.shots, 'www14');
  rmSync(www, { recursive: true, force: true });
  mkdirSync(www, { recursive: true });
  writeFileSync(join(www, 'publish.php'), buildPublishPhp({ tokenHash: await sha256Hex('x'.repeat(32)) }));
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', www], { stdio: 'ignore' });
  const contexts = [];
  const newPage = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
    contexts.push(ctx);
    await ctx.addInitScript(() => { window.__atelierLog = []; try { localStorage.setItem('atelier-stun', ''); } catch { /* ignoré */ } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`page invitée : ${e.message}`));
    p.on('dialog', d => d.accept());
    return { ctx, p };
  };
  const text = async (pg, id) => pg.evaluate(i => { const f = n => n.id === i ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.text?.fr; }, id);
  const waitFor = async (pg, fn, arg, ms = 15000) => pg.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
  try {
    await A.evaluate(() => { localStorage.setItem('atelier-stun', ''); window.__atelierLog = []; });
    const dump = async (pg, tag) => console.log(`--- ${tag}\n` + (await pg.evaluate(() => (window.__atelierLog || []).slice(-40).join('\n')).catch(() => '')));

    /* --- 1. l'hôte ouvre une session (publish.php sert de boîte aux lettres) --- */
    await A.click('#publishBtn');
    await A.fill('#publishDialog [data-pub="url"]', `http://127.0.0.1:${port}/publish.php`);
    await A.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
    await A.keyboard.press('Escape');
    await A.click('#collabBtn');
    await t.wait(300);
    await A.fill('#collabDialog [data-collab-name]', 'Kudoro');
    await A.locator('#collabDialog [data-collab-name]').dispatchEvent('change');
    await t.wait(500);
    await A.click('#collabDialog [data-collab-start]');
    await A.waitForSelector('#collabDialog [data-invite="reviewer"]');
    const editorLink = await A.locator('#collabDialog [data-invite="editor"]').inputValue();
    const reviewerLink = await A.locator('#collabDialog [data-invite="reviewer"]').inputValue();
    t.ok(editorLink.includes('#join=') && editorLink.startsWith(base) && !editorLink.includes('?'), 'liens d’invitation créés (éditeur et relecteur)');
    await A.keyboard.press('Escape');

    /* --- 2. une éditrice rejoint depuis un autre navigateur --- */
    const { p: B, ctx: ctxB } = await newPage();
    await B.goto(editorLink);
    await B.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    t.ok((await B.locator('#joinDialog').textContent()).includes('Kudoro vous invite à modifier'), 'invitation reconnue : qui invite, pour quoi');
    await B.fill('#joinDialog [data-join-name]', 'Ana');
    await B.click('#joinDialog [data-join-go]');
    const gotB = await waitFor(B, () => window.__collab?.session?.node?.peers().some(p => p.authed) && !!window.__collab.session.node.replica.docId && !document.querySelector('#joinDialog'));
    const toastsOf = pg => pg.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' / ') + ' | join: ' + (document.querySelector('#joinDialog [data-join-status]')?.textContent || '-'));
    if (!gotB) { await dump(A, 'hôte'); await dump(B, 'Ana'); }
    t.ok(gotB, `connexion directe établie, projet reçu${gotB ? '' : ` — invitée : ${await toastsOf(B)} — hôte : ${await toastsOf(A)}`}`);
    t.ok(await waitFor(A, () => document.querySelectorAll('#peers .peer').length === 1), 'l’hôte voit l’éditrice dans la barre du haut');
    t.ok(!(await B.evaluate(() => document.body.classList.contains('is-readonly'))), 'éditrice : édition possible');

    /* --- 3. modifications en direct, dans les deux sens --- */
    const cB = B.frameLocator('#canvas');
    const heading = cA.locator('main [data-type="heading"]').first();
    const hid = await heading.getAttribute('data-node');
    await heading.click();
    await A.click('[data-insp="content"]');
    await A.locator('#inspector [data-field="text"][lang="fr"]').fill('Titre changé par Kudoro');
    t.ok(await waitFor(B, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.text?.fr === 'Titre changé par Kudoro'; }, hid), 'modification de l’hôte reçue par l’éditrice');
    t.ok(await waitFor(B, () => document.querySelector('#canvas').contentDocument.body.textContent.includes('Titre changé par Kudoro')), 'la page de l’éditrice s’affiche à jour');
    const btn = cB.locator('main [data-type="button"]').first();
    const bid = await btn.getAttribute('data-node');
    await t.wait(400);
    await btn.click();
    if (!(await waitFor(B, id => window.__atelier.selected === id, bid, 3000))) await btn.click();
    await B.click('[data-insp="content"]');
    await B.locator('#inspector [data-field="label"][lang="fr"]').fill('Rejoindre le MAB');
    t.ok(await waitFor(A, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.label?.fr === 'Rejoindre le MAB'; }, bid), 'modification de l’éditrice reçue par l’hôte');

    /* --- 4. présence --- */
    await cB.locator(`[data-node="${hid}"]`).click();
    t.ok(await waitFor(A, () => { const b = document.querySelector('#canvas').contentDocument.querySelector('.ab--peer'); return b && b.style.display === 'block' && b.textContent.includes('Ana'); }), 'l’hôte voit l’élément sélectionné par Ana, à sa couleur');
    await heading.click();
    t.ok(await waitFor(A, () => document.querySelector('#inspector [data-presence-note]')?.textContent.includes('Ana')), 'inspecteur : « Ana travaille aussi sur… »');

    /* --- 5. annuler ne retire que ses propres modifications --- */
    await A.locator('#inspector [data-field="text"][lang="fr"]').blur();
    await t.wait(1700);
    await A.click('#undoBtn');
    await t.wait(300);
    const undone = await text(A, hid);
    t.ok(undone !== 'Titre changé par Kudoro', `annuler : le titre de l’hôte revient en arrière (« ${undone} »)`);
    t.ok(await waitFor(A, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.label?.fr === 'Rejoindre le MAB'; }, bid, 2000), 'le bouton modifié par Ana reste');
    t.ok(await waitFor(B, ([id, v]) => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.text?.fr === v; }, [hid, undone]), 'l’annulation arrive chez Ana');

    /* --- 6. un relecteur : rien ne se modifie, les commentaires signés passent --- */
    const { p: C } = await newPage();
    await C.goto(reviewerLink);
    await C.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    t.ok((await C.locator('#joinDialog').textContent()).includes('relire et commenter'), 'invitation relecteur');
    await C.fill('#joinDialog [data-join-name]', 'Laurent');
    await C.click('#joinDialog [data-join-go]');
    const okC = await waitFor(C, () => !!window.__collab?.session?.node?.replica.docId && !document.querySelector('#joinDialog') && document.body.classList.contains('is-readonly'));
    if (!okC) { await dump(A, 'hôte'); await dump(C, 'relecteur'); }
    t.ok(okC, 'relecteur connecté, mode relecture');
    await t.wait(400);
    const cC = C.frameLocator('#canvas');
    await cC.locator(`[data-node="${hid}"]`).click();
    await C.keyboard.press('Delete');
    await t.wait(800);
    t.ok(await A.evaluate(id => !!(function f(n) { return n.id === id ? n : (n.children || []).map(f).find(Boolean); })(window.__atelier.site.pages[0].root), hid), 'Suppr chez le relecteur : rien n’est supprimé chez l’hôte');
    t.ok(await C.locator('#toasts .toast', { hasText: 'Mode relecture' }).count() >= 1, 'message « mode relecture »');
    await C.click('#commentsBtn');
    await C.fill('#reviewPanel [data-comment-text]', 'Le titre pourrait être plus court.');
    await C.click('#reviewPanel [data-comment-add]');
    t.ok(await waitFor(A, () => document.querySelector('#commentsBtn').textContent.includes('1')), 'le commentaire arrive chez l’hôte (💬 1)');
    await A.click('#commentsBtn');
    t.ok(await waitFor(A, () => document.querySelector('#reviewPanel .cm .sig')?.textContent.includes('signé')), 'commentaire de Laurent : signature vérifiée');
    t.ok(await waitFor(B, () => Object.values(window.__atelier.site.review?.comments || {}).some(c => c.author.name === 'Laurent')), 'relayé à Ana');
    t.ok(await waitFor(A, () => document.querySelector('#canvas').contentDocument.querySelector('.cm-pin')?.style.display === 'block'), 'pastille numérotée sur l’élément commenté');
    await A.click('#reviewPanel [data-comment-resolve]');
    t.ok(await waitFor(C, () => Object.values(window.__atelier.site.review.comments).every(c => c.resolved)), 'résolu par l’hôte : le relecteur le voit');

    /* --- 7. coupure, modification hors ligne, reprise --- */
    await B.close();
    t.ok(await waitFor(A, () => document.querySelectorAll('#peers .peer').length === 1), 'Ana partie : l’hôte ne voit plus que Laurent');
    const B2 = await ctxB.newPage();
    await B2.addInitScript(() => { window.__atelierLog = []; });
    B2.on('pageerror', e => errors.push(`page invitée : ${e.message}`));
    await B2.goto(base);
    await B2.waitForFunction(() => window.__atelier?.ready === true);
    await B2.frameLocator('#canvas').locator(`[data-node="${bid}"]`).click();
    await B2.click('[data-insp="content"]');
    await B2.locator('#inspector [data-field="label"][lang="fr"]').fill('Écrit hors ligne');
    await t.wait(900);
    await B2.goto(editorLink);
    await B2.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    await B2.click('#joinDialog [data-join-go]');
    const okR = await waitFor(A, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.label?.fr === 'Écrit hors ligne'; }, bid);
    if (!okR) { await dump(A, 'hôte'); await dump(B2, 'Ana reprise'); }
    t.ok(okR, 'reprise : la modification faite hors ligne arrive chez l’hôte');
    t.ok(await waitFor(C, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.label?.fr === 'Écrit hors ligne'; }, bid), '… et chez le relecteur');
    t.ok(await B2.evaluate(() => Object.values(window.__atelier.site.review?.comments || {}).length === 1), 'Ana a aussi reçu ce qu’elle avait manqué');
    await A.screenshot({ path: `${t.shots}/cycle14-hote.png` });
    await C.screenshot({ path: `${t.shots}/cycle14-relecteur.png` });

    /* --- 8. sans serveur : codes à copier-coller --- */
    const { p: E } = await newPage();
    await E.goto(`${base}?fresh=1`);
    await E.waitForFunction(() => window.__atelier?.ready === true);
    await E.evaluate(() => { window.__atelier.site.name = 'Site manuel'; });
    await E.click('#collabBtn');
    await E.fill('#collabDialog [data-collab-name]', 'Hôte manuel');
    await E.locator('#collabDialog [data-collab-name]').dispatchEvent('change');
    await t.wait(400);
    await E.click('#collabDialog [data-collab-start]');
    await E.waitForSelector('#collabDialog [data-invite="reviewer"]');
    const manualLink = await E.locator('#collabDialog [data-invite="reviewer"]').inputValue();
    const { p: F } = await newPage();
    await F.goto(manualLink);
    await F.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    await F.fill('#joinDialog [data-join-name]', 'Relecteur manuel');
    await F.click('#joinDialog [data-join-go]');
    await F.waitForSelector('#joinDialog [data-join-offer]', { timeout: 15000 });
    const offerCode = await F.locator('#joinDialog [data-join-offer]').inputValue();
    t.ok(offerCode.length > 100 && !offerCode.includes('v=0'), 'code de connexion créé (chiffré)');
    await E.fill('#collabDialog [data-manual-offer]', offerCode);
    await E.click('#collabDialog [data-manual-accept]');
    await E.waitForFunction(() => document.querySelector('#collabDialog [data-manual-answer]')?.value.length > 100, null, { timeout: 15000 });
    const answerCode = await E.locator('#collabDialog [data-manual-answer]').inputValue();
    await F.fill('#joinDialog [data-join-answer]', answerCode);
    await F.click('#joinDialog [data-join-finish]');
    t.ok(await waitFor(F, () => window.__atelier.site.name === 'Site manuel'), 'connexion par codes : projet reçu sans aucun serveur');
  } finally {
    let k = 0;
    for (const c of contexts) for (const pg of c.pages()) await pg.screenshot({ path: `${t.shots}/cycle14-ctx${k++}.png` }).catch(() => {});
    for (const c of contexts) await c.close().catch(() => {});
    php.kill();
  }
  t.ok(errors.length === 0, `aucune erreur JavaScript dans les navigateurs invités${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
}
