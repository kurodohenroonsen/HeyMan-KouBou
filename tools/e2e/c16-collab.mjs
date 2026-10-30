/* Cycle 16 : journal de la collaboration (collab.*, rtc.*, signal.*) et de la relecture (review.*).
   Plusieurs navigateurs isolés (WebRTC réel), boîte aux lettres publish.php servie par php -S, codes manuels,
   invitations falsifiées ou expirées, boîte aux lettres injoignable, échec ICE provoqué, commentaires signés. */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPublishPhp, sha256Hex } from '../../core/publish.js';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture, codes } from './logs.mjs';

export default async function (t) {
  const { page: A, browser, base } = t;
  const cA = t.canvas();
  const errors = [];
  const port = 8800 + Math.floor(Math.random() * 90);
  const port2 = port + 100;
  const www = join(t.shots, 'www16c');
  const www2 = join(t.shots, 'www16c2');
  for (const d of [www, www2, join(www, 'ancien')]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }
  const phpFile = buildPublishPhp({ tokenHash: await sha256Hex('x'.repeat(32)) });
  writeFileSync(join(www, 'publish.php'), phpFile);
  writeFileSync(join(www2, 'publish.php'), phpFile);
  /* publish.php « ancien » : répond, mais sans boîte aux lettres */
  writeFileSync(join(www, 'ancien', 'publish.php'), '<?php header("Content-Type: application/json"); header("Access-Control-Allow-Origin: *"); echo json_encode(["atelier" => true, "version" => "2", "php" => PHP_VERSION, "zip" => true]);');
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', www], { stdio: 'ignore' });
  let php2 = spawn('php', ['-S', `127.0.0.1:${port2}`, '-t', www2], { stdio: 'ignore' });
  const box = `http://127.0.0.1:${port}/publish.php`;
  const contexts = [];
  const newPage = async ({ stun = '', strip = false } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
    contexts.push(ctx);
    await ctx.addInitScript(([s, st]) => {
      window.__atelierLog = [];
      try { if (!localStorage.getItem('atelier-stun-set')) { localStorage.setItem('atelier-stun', s); localStorage.setItem('atelier-stun-set', '1'); } } catch { /* ignoré */ }
      if (st) {
        /* Échec ICE provoqué : les adresses de l'autre navigateur sont retirées avant d'être données à WebRTC */
        const orig = RTCPeerConnection.prototype.setRemoteDescription;
        RTCPeerConnection.prototype.setRemoteDescription = function (d) {
          return orig.call(this, d && d.sdp ? { type: d.type, sdp: d.sdp.split('\r\n').filter(l => !/^a=(candidate|end-of-candidates)/.test(l)).join('\r\n') } : d);
        };
      }
    }, [stun, strip]);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`page invitée : ${e.message}`));
    p.on('dialog', d => d.accept());
    return { ctx, p };
  };
  const ready = pg => pg.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
  const waitFor = async (pg, fn, arg, ms = 15000) => pg.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
  const findText = (pg, id, prop = 'text') => pg.evaluate(([i, k]) => { const f = n => n.id === i ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.[k]?.fr; }, [id, prop]);
  const has = (es, c) => codes(es).includes(c);
  const dump = async (pg, tag) => console.log(`--- ${tag}\n` + (await pg.evaluate(() => (window.__atelierLog || []).slice(-30).join('\n')).catch(() => '')));
  const hostStart = async (pg, name, url) => {
    if (url !== undefined) {
      await pg.click('#publishBtn');
      await pg.fill('#publishDialog [data-pub="url"]', url);
      await pg.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
      await pg.keyboard.press('Escape');
    }
    await pg.click('#collabBtn');
    await pg.waitForSelector('#collabDialog [data-collab-name]');
    await pg.fill('#collabDialog [data-collab-name]', name);
    await pg.locator('#collabDialog [data-collab-name]').dispatchEvent('change');
    await pg.waitForSelector('#collabDialog [data-collab-start]:not([disabled])');
    await pg.click('#collabDialog [data-collab-start]');
    await pg.waitForSelector('#collabDialog [data-invite="reviewer"]');
    return { editor: await pg.locator('#collabDialog [data-invite="editor"]').inputValue(), reviewer: await pg.locator('#collabDialog [data-invite="reviewer"]').inputValue() };
  };
  const joinBy = async (pg, link, name) => {
    await pg.goto(link);
    await pg.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    if (name) await pg.fill('#joinDialog [data-join-name]', name);
    await pg.click('#joinDialog [data-join-go]');
  };
  const connected = pg => waitFor(pg, () => window.__collab?.session?.node?.peers().some(p => p.authed) && !!window.__collab.session.node.replica.docId && !document.querySelector('#joinDialog'));

  try {
    await A.evaluate(() => { localStorage.setItem('atelier-stun', ''); window.__atelierLog = []; });
    await A.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin }).catch(() => {});

    /* ---------- 1. Héberger une session (boîte aux lettres publish.php) ---------- */
    let s = await mark(A);
    const links = await hostStart(A, 'Kudoro', box);
    let es = await since(A, s);
    t.ok(links.editor.includes('#join=') && links.reviewer.includes('#join='), 'héberger : liens d’invitation créés');
    expectCodes(t, es, ['collab.open', 'collab.identity.new', 'collab.host.start', 'signal.check', 'collab.host.signal', 'signal.host', 'signal.start', 'collab.invite.create', 'collab.host.ok'], 'héberger');
    expectNoErrors(t, es, 'héberger');
    t.ok(!JSON.stringify(es).includes(links.editor.split('#join=')[1].slice(0, 43)), 'héberger : la clé de session n’apparaît pas dans le journal');
    capture('collab-heberger', es);

    /* ---------- 2. Inviter : copier le lien ---------- */
    s = await mark(A);
    await A.click('#collabDialog [data-copy-editor]');
    await t.wait(300);
    es = await since(A, s);
    t.ok(has(es, 'collab.invite.copy') || has(es, 'collab.invite.copy-fail'), 'inviter : copie du lien journalisée');
    capture('collab-inviter', es, { drop: ['ui.toast'] });
    await A.keyboard.press('Escape');

    /* ---------- 3. Rejoindre par lien (éditrice) ---------- */
    const { p: B, ctx: ctxB } = await newPage();
    s = await mark(A);
    await joinBy(B, links.editor, 'Ana');
    const okB = await connected(B);
    if (!okB) { await dump(A, 'hôte'); await dump(B, 'Ana'); }
    t.ok(okB, 'rejoindre par lien : connectée, projet reçu');
    await waitCode(B, 'rtc.pair', 0, 8000).catch(() => {});
    await waitCode(A, 'rtc.pair', s, 8000).catch(() => {});
    const esB = await since(B, 0);
    expectCodes(t, esB, ['collab.join.link', 'collab.invite.open', 'collab.identity.new', 'collab.join.start', 'collab.join.invite', 'collab.join.backup', 'rtc.join.start', 'rtc.pc.create', 'rtc.join.offer', 'rtc.ice.no-stun', 'signal.post', 'rtc.join.sent', 'signal.receive', 'rtc.ice.remote', 'rtc.join.answer', 'rtc.ice.state', 'rtc.pc.state', 'rtc.channel.open', 'rtc.join.ok', 'collab.join.ok', 'collab.link.new', 'collab.hello', 'collab.auth', 'collab.sync.ask', 'collab.snapshot', 'rtc.pair'], 'rejoindre par lien (invitée)');
    expectNoErrors(t, esB, 'rejoindre par lien (invitée)');
    t.ok(has(esB, 'rtc.ice.gathered') || has(esB, 'rtc.ice.gather-timeout'), 'journal (rejoindre par lien) : collecte des adresses (rtc.ice.gathered ou rtc.ice.gather-timeout)');
    capture('collab-rejoindre-lien-invite', esB.filter(e => !/^(boot|app|storage|store|perf|versions|ai|i18n|log)\./.test(e.code)));
    es = await since(A, s);
    expectCodes(t, es, ['signal.receive', 'rtc.accept.start', 'rtc.pc.create', 'rtc.ice.remote', 'rtc.accept.answer', 'signal.post', 'rtc.accept.sent', 'rtc.channel.open', 'rtc.accept.ok', 'collab.link.new', 'collab.hello', 'collab.auth', 'collab.sync.snapshot'], 'rejoindre par lien (hôte)');
    expectNoErrors(t, es, 'rejoindre par lien (hôte)');
    capture('collab-rejoindre-lien-hote', es);
    const ctxt = await A.evaluate(async () => (await window.atelierDebug.dump()).split('\n').find(l => l.startsWith('collaboration :')) || '');
    t.ok(/hôte/.test(ctxt) && /liens/.test(ctxt) && /stun/.test(ctxt), `journal copié : contexte « collaboration » (${ctxt.slice(0, 120)}…)`);
    const rtcText = JSON.stringify(esB.filter(e => /^rtc\./.test(e.code))).replace(/https?:\/\/[^"]*/g, '');
    t.ok(!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(rtcText) && !/\.local\b/.test(rtcText), 'rtc.* : aucune adresse IP dans le journal (hors adresse de publish.php)');

    /* ---------- 4. Présence ---------- */
    const cB = B.frameLocator('#canvas');
    const heading = cA.locator('main [data-type="heading"]').first();
    const hid = await heading.getAttribute('data-node');
    s = await mark(A);
    await t.wait(300);
    await cB.locator(`[data-node="${hid}"]`).click();
    if (!(await waitFor(B, id => window.__atelier.selected === id, hid, 3000))) await cB.locator(`[data-node="${hid}"]`).click();
    t.ok(await waitFor(A, () => { const b = document.querySelector('#canvas').contentDocument.querySelector('.ab--peer'); return b && b.style.display === 'block'; }), 'présence : l’hôte voit la sélection d’Ana');
    es = await since(A, s);
    expectCodes(t, es, ['collab.presence'], 'présence');
    capture('collab-presence', es);

    /* ---------- 5. Une modification arrive chez l’autre ---------- */
    s = await mark(A);
    const sB = await mark(B);
    await heading.click();
    await A.click('[data-insp="content"]');
    await A.locator('#inspector [data-field="text"][lang="fr"]').fill('Titre changé par Kudoro');
    t.ok(await waitFor(B, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.text?.fr === 'Titre changé par Kudoro'; }, hid), 'modification : reçue par l’éditrice');
    es = await since(A, s);
    expectCodes(t, es, ['store.commit', 'collab.ops.out'], 'modification (hôte)');
    capture('collab-modification-hote', es.filter(e => e.code !== 'collab.presence'));
    es = await since(B, sB);
    expectCodes(t, es, ['collab.ops.in', 'store.remote'], 'modification (invitée)');
    capture('collab-modification-invite', es.filter(e => e.code !== 'collab.presence'));

    /* ---------- 6. Relecteur : rejoindre, modification refusée, commentaires ---------- */
    const { p: C } = await newPage();
    s = await mark(A);
    await joinBy(C, links.reviewer, 'Laurent');
    const okC = await waitFor(C, () => !!window.__collab?.session?.node?.replica.docId && !document.querySelector('#joinDialog') && document.body.classList.contains('is-readonly'));
    if (!okC) { await dump(A, 'hôte'); await dump(C, 'relecteur'); }
    t.ok(okC, 'relecteur connecté, mode relecture');
    await t.wait(500);
    let sC = await mark(C);
    await C.frameLocator('#canvas').locator(`[data-node="${hid}"]`).click();
    await C.keyboard.press('Delete');
    await t.wait(400);
    /* Un relecteur qui force l'envoi d'une modification : l'hôte la refuse */
    const sA6 = await mark(A);
    await C.evaluate(() => {
      const st = [...window.__collab.session.node.links.values()].find(x => x.authed);
      st.link.send({ t: 'ops', ops: [{ p: ['name'], v: 'Modifié par le relecteur', ts: `${String(Date.now()).padStart(16, '0')}.0000.force` }] });
    });
    await waitCode(A, 'collab.ops.rejected', sA6, 6000).catch(() => {});
    await waitCode(C, 'collab.remote-error', sC, 6000).catch(() => {});
    t.ok(await A.evaluate(() => window.__atelier.site.name !== 'Modifié par le relecteur'), 'relecture : l’hôte n’applique pas la modification forcée');
    es = await since(C, 0);
    expectCodes(t, es, ['collab.invite.open', 'collab.readonly', 'collab.join.ok', 'collab.snapshot', 'store.readonly', 'collab.remote-error'], 'mode relecture (relecteur)');
    capture('collab-relecture-relecteur', es.filter(e => !/^(boot|app|storage|perf|versions|ai|i18n|log|rtc|signal)\./.test(e.code) && e.code !== 'collab.presence'));
    es = await since(A, sA6);
    expectCodes(t, es, ['collab.ops.rejected'], 'mode relecture (hôte)');
    capture('collab-relecture-hote', es.filter(e => e.code !== 'collab.presence'));

    /* ---------- 7. Commentaire ajouté (relecteur) ---------- */
    sC = await mark(C);
    s = await mark(A);
    await C.click('#commentsBtn');
    await C.fill('#reviewPanel [data-comment-text]', 'Le titre pourrait être plus court.');
    await C.click('#reviewPanel [data-comment-add]');
    t.ok(await waitFor(A, () => document.querySelector('#commentsBtn').textContent.includes('1')), 'commentaire : arrive chez l’hôte (💬 1)');
    es = await since(C, sC);
    expectCodes(t, es, ['review.panel', 'review.add', 'collab.ops.out'], 'commentaire ajouté (relecteur)');
    expectNoErrors(t, es, 'commentaire ajouté (relecteur)');
    capture('review-ajouter', es.filter(e => e.code !== 'collab.presence'));
    await A.click('#commentsBtn');
    t.ok(await waitFor(A, () => document.querySelector('#reviewPanel .cm .sig')?.textContent.includes('signé')), 'commentaire : signature vérifiée chez l’hôte');
    es = await since(A, s);
    expectCodes(t, es, ['collab.ops.in', 'review.remote', 'review.panel', 'review.sig.ok'], 'commentaire reçu (hôte)');
    capture('review-recevoir', es.filter(e => e.code !== 'collab.presence'));

    /* ---------- 8. Répondre, résoudre ---------- */
    s = await mark(A);
    sC = await mark(C);
    const cid = await A.locator('#reviewPanel [data-comment]').first().getAttribute('data-comment');
    await A.fill(`#reviewPanel [data-reply-text="${cid}"]`, 'D’accord, je raccourcis.');
    await A.click(`#reviewPanel [data-reply-add="${cid}"]`);
    t.ok(await waitFor(C, id => (window.__atelier.site.review?.comments?.[id]?.replies || []).length === 1, cid), 'réponse : reçue par le relecteur');
    await waitCode(C, 'review.sig.ok', sC, 4000).catch(() => {});
    es = await since(A, s);
    expectCodes(t, es, ['review.reply', 'collab.ops.out'], 'réponse (hôte)');
    capture('review-repondre', es.filter(e => e.code !== 'collab.presence'));
    es = await since(C, sC);
    expectCodes(t, es, ['collab.ops.in', 'review.remote'], 'réponse (relecteur)');
    capture('review-repondre-recu', es.filter(e => e.code !== 'collab.presence'));
    s = await mark(A);
    sC = await mark(C);
    await A.click(`#reviewPanel [data-comment-resolve="${cid}"]`);
    t.ok(await waitFor(C, id => window.__atelier.site.review?.comments?.[id]?.resolved === true, cid), 'résolu : le relecteur le voit');
    es = await since(A, s);
    expectCodes(t, es, ['review.resolve', 'collab.ops.out'], 'résoudre');
    capture('review-resoudre', [...es, ...(await since(C, sC)).filter(e => e.code === 'review.remote')].sort((x, y) => x.t - y.t || x.seq - y.seq).filter(e => e.code !== 'collab.presence'));

    /* ---------- 9. Hors ligne puis retour (l’éditrice ferme son onglet, modifie, revient) ---------- */
    const bid = await cA.locator('main [data-type="button"]').first().getAttribute('data-node');
    s = await mark(A);
    await B.close();
    t.ok(await waitFor(A, () => document.querySelectorAll('#peers .peer').length === 1), 'hors ligne : l’hôte ne voit plus Ana');
    await waitCode(A, 'collab.peer.leave', s, 5000).catch(() => {});
    es = await since(A, s);
    expectCodes(t, es, ['rtc.channel.close', 'collab.link.closed', 'collab.peer.leave'], 'départ (hôte)');
    capture('collab-depart-hote', es.filter(e => e.code !== 'collab.presence'));
    const B2 = await ctxB.newPage();
    B2.on('pageerror', e => errors.push(`page invitée : ${e.message}`));
    await B2.goto(base);
    await ready(B2);
    await t.wait(300);
    await B2.frameLocator('#canvas').locator(`[data-node="${bid}"]`).click();
    await B2.click('[data-insp="content"]');
    await B2.locator('#inspector [data-field="label"][lang="fr"]').fill('Écrit hors ligne');
    await t.wait(900);
    s = await mark(A);
    await B2.goto(links.editor);
    await B2.waitForSelector('#joinDialog [data-join-go]', { timeout: 10000 });
    await B2.click('#joinDialog [data-join-go]');
    const okR = await waitFor(A, id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(window.__atelier.site.pages[0].root)?.props?.label?.fr === 'Écrit hors ligne'; }, bid);
    if (!okR) { await dump(A, 'hôte'); await dump(B2, 'Ana reprise'); }
    t.ok(okR, 'retour : la modification faite hors ligne arrive chez l’hôte');
    await waitCode(B2, 'collab.sync.merged', 0, 5000).catch(() => {});
    es = await since(B2, 0);
    expectCodes(t, es, ['collab.restore', 'store.commit', 'collab.join.link', 'collab.join.invite', 'collab.join.rejoin', 'rtc.join.ok', 'collab.join.ok', 'collab.auth', 'collab.sync.ask', 'collab.sync.merged'], 'retour (invitée)');
    expectNoErrors(t, es, 'retour (invitée)');
    capture('collab-hors-ligne-retour', es.filter(e => !/^(boot|app|storage|perf|versions|ai|i18n|log)\./.test(e.code) && !/^rtc\.(ice|pc)\./.test(e.code) && e.code !== 'collab.presence'));
    es = await since(A, s);
    expectCodes(t, es, ['rtc.accept.ok', 'collab.auth', 'collab.sync.delta', 'collab.ops.in'], 'retour (hôte)');
    capture('collab-hors-ligne-hote', es.filter(e => !/^rtc\.(ice|pc)\./.test(e.code) && e.code !== 'collab.presence'));

    /* ---------- 10. Signatures : commentaire falsifié envoyé par l’éditrice ---------- */
    s = await mark(A);
    const sB2 = await mark(B2);
    await B2.evaluate(async () => {
      const R = await import('/core/review.js');
      const { currentIdentity } = await import('/editor/collab-ui.js');
      const pg = window.__atelier.site.pages[0];
      const c = await R.makeComment(currentIdentity(), { anchor: { pageId: pg.id, nodeId: pg.root.id }, text: 'Texte signé' });
      c.text = 'Texte changé après la signature';
      const st = [...window.__collab.session.node.links.values()].find(x => x.authed);
      st.link.send({ t: 'ops', ops: [{ p: ['review', 'comments', c.id], v: c, ts: `${String(Date.now()).padStart(16, '0')}.0000.force` }] });
    });
    await waitCode(A, 'review.ops.rejected', s, 6000).catch(() => {});
    await waitCode(B2, 'collab.remote-error', sB2, 6000).catch(() => {});
    es = await since(A, s);
    expectCodes(t, es, ['review.ops.rejected'], 'commentaire falsifié (hôte)');
    t.ok(await A.evaluate(() => Object.keys(window.__atelier.site.review.comments).length === 1), 'commentaire falsifié : refusé par l’hôte');
    capture('review-signature-refusee', [...es, ...(await since(B2, sB2)).filter(e => e.code === 'collab.remote-error')].sort((x, y) => x.t - y.t || x.seq - y.seq).filter(e => e.code !== 'collab.presence' && e.code !== 'ui.toast'));

    /* ---------- 11. Quitter (l’éditrice) ---------- */
    s = await mark(A);
    const sQ = await mark(B2);
    await B2.click('#collabBtn');
    await B2.click('#collabDialog [data-collab-stop]');
    t.ok(await waitFor(A, () => document.querySelectorAll('#peers .peer').length === 1), 'quitter : l’hôte ne voit plus Ana');
    es = await since(B2, sQ);
    expectCodes(t, es, ['collab.open', 'collab.leave', 'collab.node.close', 'rtc.channel.close'], 'quitter (invitée)');
    t.ok(!has(es, 'collab.host-lost'), 'quitter : pas de faux message « connexion interrompue »');
    capture('collab-quitter', es);
    await B2.keyboard.press('Escape');

    /* ---------- 12. Invitation falsifiée, expirée, abîmée ---------- */
    const { p: K } = await newPage();
    await K.goto(base);
    await ready(K);
    const forge = kind => K.evaluate(async ([link, k]) => {
      const R = await import('/core/review.js');
      const j = R.parseJoin(new URL(link).hash);
      if (k === 'abime') { const [h, b, sig] = j.invite.split('.'); const i = 12; return `${location.origin}${location.pathname}#${R.joinFragment(j.secret, `${h}.${b}.${sig.slice(0, i)}${sig[i] === 'A' ? 'B' : 'A'}${sig.slice(i + 1)}`)}`; }
      const body = JSON.parse(new TextDecoder().decode(R.unb64u(j.invite.split('.')[1])));
      const id = await R.createIdentity('Faussaire');
      const inv = await R.createInvite(id, { secret: j.secret, role: 'editor', hostPeer: body.host, signal: body.signal, ...(k === 'expire' ? { exp: Date.now() - 60000 } : {}) });
      return `${location.origin}${location.pathname}#${R.joinFragment(j.secret, inv)}`;
    }, [links.editor, kind]);
    let sK = await mark(K);
    await K.goto(await forge('abime'));
    await K.waitForSelector('#joinDialog [data-join-status]');
    t.ok(await waitFor(K, () => /invalide|illisible/.test(document.querySelector('#joinDialog [data-join-status]').textContent) && document.querySelector('#joinDialog [data-join-go]').disabled), 'invitation abîmée : refusée, bouton « Rejoindre » désactivé');
    es = await since(K, sK);
    expectCodes(t, es, ['collab.join.link', 'collab.invite.invalid'], 'invitation abîmée');
    let invalid = es;
    await K.keyboard.press('Escape');
    sK = await mark(K);
    await K.goto(await forge('expire'));
    t.ok(await waitFor(K, () => /expirée/.test(document.querySelector('#joinDialog [data-join-status]')?.textContent || '')), 'invitation expirée : « demandez un nouveau lien »');
    es = await since(K, sK);
    expectCodes(t, es, ['collab.invite.invalid'], 'invitation expirée');
    invalid = [...invalid, ...es];
    capture('collab-invitation-invalide', invalid);
    await K.keyboard.press('Escape');
    s = await mark(A);
    sK = await mark(K);
    await K.goto(await forge('falsifiee'));
    await K.waitForSelector('#joinDialog [data-join-go]:not([disabled])', { timeout: 10000 });
    await K.fill('#joinDialog [data-join-name]', 'Faussaire');
    await K.click('#joinDialog [data-join-go]');
    await waitCode(A, 'collab.refused.owner', s, 15000).catch(() => {});
    await waitCode(K, 'collab.remote-error', sK, 5000).catch(() => {});
    es = await since(A, s);
    expectCodes(t, es, ['rtc.accept.ok', 'collab.refused.owner'], 'invitation falsifiée (hôte)');
    t.ok(await A.evaluate(() => document.querySelectorAll('#peers .peer').length === 1), 'invitation falsifiée : personne de plus chez l’hôte');
    capture('collab-invitation-falsifiee-hote', es.filter(e => !/^rtc\.(ice|pc)\./.test(e.code) && e.code !== 'collab.presence'));
    es = await since(K, sK);
    expectCodes(t, es, ['collab.join.ok', 'collab.remote-error'], 'invitation falsifiée (invité)');
    capture('collab-invitation-falsifiee-invite', es.filter(e => !/^rtc\.(ice|pc)\./.test(e.code) && !/^(versions|storage|store)\./.test(e.code)));

    /* ---------- 13. Signature invalide d’un commentaire déjà dans le projet (sans session) ---------- */
    const { p: L } = await newPage();
    await L.goto(`${base}?fresh=1`);
    await ready(L);
    let sL = await mark(L);
    await L.frameLocator('#canvas').locator('main [data-type="heading"]').first().click();
    await L.click('#commentsBtn');
    await L.fill('#reviewPanel [data-comment-text]', 'Remarque sans session.');
    await L.click('#reviewPanel [data-comment-add]');
    await t.wait(300);
    es = await since(L, sL);
    expectCodes(t, es, ['review.panel', 'review.no-identity'], 'commentaire sans nom');
    capture('review-sans-nom', es);
    sL = await mark(L);
    await L.fill('#reviewPanel [data-review-name]', 'Misako');
    await L.click('#reviewPanel [data-comment-add]');
    t.ok(await waitFor(L, () => document.querySelector('#reviewPanel .cm .sig')?.textContent.includes('signé')), 'sans session : commentaire ajouté et signé');
    es = await since(L, sL);
    expectCodes(t, es, ['collab.identity.new', 'review.add', 'review.sig.ok'], 'commentaire sans session');
    capture('review-sans-session', es);
    sL = await mark(L);
    await L.evaluate(async () => {
      const store = await import('/editor/store.js');
      const site = structuredClone(store.state.site);
      const c = Object.values(site.review.comments)[0];
      c.text = `${c.text} (texte modifié à la main dans le fichier)`;
      store.commit(site, { source: 'review' });
    });
    t.ok(await waitFor(L, () => document.querySelector('#reviewPanel .cm .sig')?.textContent.includes('invalide')), 'signature invalide : « ⚠ signature invalide »');
    es = await since(L, sL);
    expectCodes(t, es, ['review.sig.bad'], 'signature invalide');
    capture('review-signature-invalide', es);
    sL = await mark(L);
    const cidL = await L.locator('#reviewPanel [data-comment]').first().getAttribute('data-comment');
    await L.click(`#reviewPanel [data-comment-delete="${cidL}"]`);
    t.ok(await waitFor(L, () => !document.querySelector('#reviewPanel [data-comment]')), 'supprimer : le commentaire disparaît');
    es = await since(L, sL);
    expectCodes(t, es, ['review.delete'], 'supprimer');
    capture('review-supprimer', es);

    /* ---------- 14. Codes manuels (publish.php trop ancien → pas de boîte aux lettres) ---------- */
    const { p: E } = await newPage();
    await E.goto(`${base}?fresh=1`);
    await ready(E);
    await E.evaluate(() => { window.__atelier.site.name = 'Site manuel'; });
    let sE = await mark(E);
    const manualLinks = await hostStart(E, 'Hôte manuel', `http://127.0.0.1:${port}/ancien/publish.php`);
    es = await since(E, sE);
    expectCodes(t, es, ['collab.host.start', 'signal.unsupported', 'collab.host.signal', 'collab.host.ok'], 'héberger sans boîte aux lettres');
    t.ok(es.some(e => e.code === 'signal.unsupported' && e.data?.why === 'trop ancien'), 'publish.php ancien : « trop ancien » dans le journal');
    capture('collab-heberger-codes', es);
    const { p: F } = await newPage();
    await joinBy(F, manualLinks.reviewer, 'Relecteur manuel');
    await F.waitForSelector('#joinDialog [data-join-offer]', { timeout: 15000 });
    const offerCode = await F.locator('#joinDialog [data-join-offer]').inputValue();
    /* erreur : code incomplet collé chez l’hôte */
    sE = await mark(E);
    await E.fill('#collabDialog [data-manual-offer]', offerCode.slice(0, 80));
    await E.click('#collabDialog [data-manual-accept]');
    await waitCode(E, 'rtc.manual-answer.fail', sE, 5000).catch(() => {});
    es = await since(E, sE);
    expectCodes(t, es, ['rtc.manual-answer.start', 'signal.code-invalid', 'rtc.manual-answer.fail'], 'code incomplet');
    t.ok(await E.locator('#toasts .toast', { hasText: 'code illisible' }).count() >= 1, 'code incomplet : message « Code non reconnu : code illisible… »');
    capture('collab-codes-incomplet', es);
    sE = await mark(E);
    await E.fill('#collabDialog [data-manual-offer]', offerCode);
    await E.click('#collabDialog [data-manual-accept]');
    await E.waitForFunction(() => document.querySelector('#collabDialog [data-manual-answer]')?.value.length > 100, null, { timeout: 15000 });
    const answerCode = await E.locator('#collabDialog [data-manual-answer]').inputValue();
    /* erreur : l’invité colle son propre code au lieu de la réponse */
    let sF = await mark(F);
    await F.fill('#joinDialog [data-join-answer]', offerCode);
    await F.click('#joinDialog [data-join-finish]');
    await waitCode(F, 'rtc.manual-finish.fail', sF, 5000).catch(() => {});
    es = await since(F, sF);
    expectCodes(t, es, ['rtc.manual-finish.start', 'signal.code-wrong', 'rtc.manual-finish.fail'], 'mauvais code');
    capture('collab-codes-mauvais', es.filter(e => !/^rtc\.(ice|pc)\./.test(e.code)));
    sF = await mark(F);
    await F.fill('#joinDialog [data-join-answer]', answerCode);
    await F.click('#joinDialog [data-join-finish]');
    t.ok(await waitFor(F, () => window.__atelier.site.name === 'Site manuel'), 'codes manuels : projet reçu sans serveur');
    await waitCode(E, 'rtc.accept.ok', sE, 5000).catch(() => {});
    es = await since(F, 0);
    expectCodes(t, es, ['collab.join.start', 'collab.join.ok', 'rtc.manual-offer.start', 'rtc.manual-offer.ok', 'rtc.manual-finish.start', 'rtc.manual-finish.remote', 'rtc.channel.open', 'rtc.manual-finish.ok', 'collab.auth', 'collab.snapshot'], 'codes manuels (invité)');
    capture('collab-codes-invite', es.filter(e => !/^(boot|app|storage|store|perf|versions|ai|i18n|log)\./.test(e.code) ));
    es = await since(E, sE);
    expectCodes(t, es, ['rtc.manual-answer.start', 'rtc.manual-answer.ok', 'rtc.accept.start', 'rtc.accept.ok', 'collab.auth', 'collab.sync.snapshot'], 'codes manuels (hôte)');
    expectNoErrors(t, es, 'codes manuels (hôte)');
    capture('collab-codes-hote', es);

    /* ---------- 15. Boîte aux lettres injoignable (publish.php arrêté après l’invitation) ---------- */
    const { p: H } = await newPage();
    await H.goto(`${base}?fresh=1`);
    await ready(H);
    const hLinks = await hostStart(H, 'Hôte coupé', `http://127.0.0.1:${port2}/publish.php`);
    php2.kill();
    php2 = null;
    await t.wait(500);
    const sH = await mark(H);
    const { p: G } = await newPage();
    await joinBy(G, hLinks.editor, 'Invité coupé');
    t.ok(await waitFor(G, () => /Échec de la connexion/.test(document.querySelector('#joinDialog [data-join-status]')?.textContent || ''), null, 15000), 'boîte aux lettres injoignable : « Échec de la connexion »');
    es = await since(G, 0);
    expectCodes(t, es, ['rtc.join.start', 'signal.post-fail', 'rtc.join.fail', 'collab.join.fail'], 'boîte aux lettres injoignable (invité)');
    capture('collab-boite-injoignable', es.filter(e => !/^(boot|app|storage|store|perf|versions|ai|i18n|log)\./.test(e.code) && !/^rtc\.(ice|pc)\./.test(e.code)));
    await waitCode(H, 'signal.poll-fail', sH, 6000).catch(() => {});
    es = await since(H, sH);
    expectCodes(t, es, ['signal.poll-fail'], 'boîte aux lettres injoignable (hôte)');
    capture('collab-boite-injoignable-hote', es);

    /* ---------- 16. Échec de la connexion directe (STUN injoignable, adresses retirées) ---------- */
    const { p: I } = await newPage({ strip: true });
    await I.goto(`${base}?fresh=1`);
    await ready(I);
    let sI = await mark(I);
    await I.click('#collabBtn');
    await I.click('#collabDialog .collab-adv summary');
    await I.fill('#collabDialog [data-collab-stun]', 'stun:127.0.0.1:9 turn:relais.exemple.be:3478');
    await I.locator('#collabDialog [data-collab-stun]').dispatchEvent('change');
    es = await since(I, sI);
    expectCodes(t, es, ['signal.stun'], 'régler le STUN');
    capture('collab-stun-regle', es);
    await I.keyboard.press('Escape');
    const iLinks = await hostStart(I, 'Hôte isolé', box);
    sI = await mark(I);
    const { p: J } = await newPage({ stun: 'stun:127.0.0.1:9', strip: true });
    await joinBy(J, iLinks.editor, 'Invité isolé');
    t.ok(await waitFor(J, () => /Échec de la connexion/.test(document.querySelector('#joinDialog [data-join-status]')?.textContent || ''), null, 45000), 'échec ICE : « Échec de la connexion » chez l’invité');
    es = await since(J, 0);
    expectCodes(t, es, ['rtc.ice.no-srflx', 'rtc.join.sent', 'rtc.join.answer', 'rtc.channel.timeout', 'rtc.join.fail', 'collab.join.fail'], 'échec ICE (invité)');
    const why = es.find(e => e.code === 'rtc.channel.timeout');
    t.ok(/srflx|STUN/.test(why?.msg || ''), `échec ICE : cause expliquée (${(why?.msg || '').slice(0, 90)}…)`);
    capture('collab-echec-ice', es.filter(e => !/^(boot|app|storage|store|perf|versions|ai|i18n|log)\./.test(e.code)));
    await waitCode(I, 'rtc.accept.fail', sI, 40000).catch(() => {});
    es = await since(I, sI);
    expectCodes(t, es, ['rtc.accept.start', 'rtc.ice.no-srflx', 'rtc.accept.sent', 'rtc.channel.timeout', 'rtc.accept.fail'], 'échec ICE (hôte)');
    capture('collab-echec-ice-hote', es);

    /* ---------- 17. Fermer la session (hôte) ---------- */
    s = await mark(A);
    await A.click('#collabBtn');
    await A.click('#collabDialog [data-collab-stop]');
    await t.wait(500);
    es = await since(A, s);
    expectCodes(t, es, ['collab.leave', 'signal.stop', 'collab.node.close'], 'fermer la session');
    capture('collab-fermer', es);
    await A.keyboard.press('Escape');
    await A.screenshot({ path: `${t.shots}/c16-collab-hote.png` });
  } finally {
    let k = 0;
    for (const c of contexts) for (const pg of c.pages()) await pg.screenshot({ path: `${t.shots}/c16-collab-ctx${k++}.png` }).catch(() => {});
    for (const c of contexts) await c.close().catch(() => {});
    php.kill();
    php2?.kill();
  }
  t.ok(errors.length === 0, `aucune erreur JavaScript dans les navigateurs invités${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
}
