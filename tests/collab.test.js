import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, setProp, removeNode, moveNode, findNode } from '../core/tree.js';
import { createSite, updatePageRoot, normalizeSite, addPage } from '../core/site.js';
import '../core/render.js';
import { createClock, diffDocs, applyOps, createReplica, validateOps, pathKey } from '../core/collab.js';
import { CollabNode, splitMessage, Reassembler } from '../core/collab-protocol.js';
import { createIdentity, createRoom, roomIdOf, createInvite, makeComment, addComment, setResolved } from '../core/review.js';

const clone = v => structuredClone(v);

function site0() {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr', 'nl'] }));
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(2, [6, 6]);
  root = insertNode(root, root.id, sec);
  const [c1, c2] = sec.children[0].children;
  const h = createNode('heading'); h.props.text = { fr: 'Titre' };
  const t = createNode('text');
  root = insertNode(root, c1.id, h);
  root = insertNode(root, c2.id, t);
  s = updatePageRoot(s, s.pages[0].id, root);
  return { site: s, h, t, c1, c2, pageId: s.pages[0].id };
}
const edit = (site, fn) => updatePageRoot(site, site.pages[0].id, fn(site.pages[0].root));
const nodeIn = (site, id) => findNode(site.pages[0].root, id);

/* ---------- Horloge ---------- */
test('horloge logique hybride : croissante, ordonnée entre participants, suit les horloges reçues', () => {
  let t = 1000;
  const a = createClock('aaaa', () => t);
  const b = createClock('bbbb', () => t);
  const a1 = a.tick(); const a2 = a.tick();
  assert.ok(a1 < a2, 'même milliseconde : compteur');
  const b1 = b.tick();
  assert.notEqual(a1, b1);
  t = 500;
  const a3 = a.tick();
  assert.ok(a3 > a2, 'horloge qui recule : reste croissante');
  const far = createClock('zzzz', () => 9_999_999).tick();
  b.observe(far);
  assert.ok(b.tick() > far, 'après réception, toujours plus récent');
});

/* ---------- Différences ---------- */
test('diffDocs : propriété, élément ajouté (avec ordre), supprimé, déplacé, liste sans identifiant, partie collab ignorée', () => {
  const { site, h, c1, c2 } = site0();
  let ops = diffDocs(site, edit(site, r => setProp(r, h.id, 'text', 'Bonjour', 'fr')));
  assert.equal(ops.length, 1);
  assert.deepEqual(ops[0].v, 'Bonjour');
  assert.equal(ops[0].p.at(-1), 'fr');
  assert.ok(ops[0].p.includes(`#i:${h.id}`), JSON.stringify(ops[0].p));
  const b = createNode('button');
  ops = diffDocs(site, edit(site, r => insertNode(r, c1.id, b)));
  assert.ok(ops.some(o => o.p.at(-1) === `#i:${b.id}` && o.v?.id === b.id), 'élément ajouté en entier');
  assert.ok(ops.some(o => o.order && o.order.includes(b.id)), 'ordre de la liste');
  ops = diffDocs(site, edit(site, r => removeNode(r, h.id)));
  assert.ok(ops.some(o => o.del && o.p.at(-1) === `#i:${h.id}`));
  ops = diffDocs(site, edit(site, r => moveNode(r, h.id, c2.id, 0)));
  assert.ok(ops.some(o => o.del) && ops.some(o => o.v?.id === h.id), 'déplacement : retiré ici, ajouté là');
  const acc = createNode('accordion');
  let s2 = edit(site, r => insertNode(r, c2.id, acc));
  const s3 = clone(s2);
  nodeIn(s3, acc.id).props.items[1].title.fr = 'Changé';
  ops = diffDocs(s2, s3);
  assert.equal(ops.length, 1);
  assert.equal(ops[0].p.at(-1), 'items', 'liste sans identifiant : remplacée entière');
  assert.deepEqual(diffDocs(site, { ...site, collab: { x: 1 } }), [], 'collab jamais synchronisé');
  assert.deepEqual(diffDocs(site, clone(site)), []);
  const odd = { ...site, theme: { ...site.theme, '#bizarre': 1 } };
  ops = diffDocs(site, odd);
  assert.equal(applyOps(site, ops).theme['#bizarre'], 1, 'clé qui commence par # : échappée');
});

test('applyOps : copie seulement le chemin modifié (le reste est partagé)', () => {
  const { site, h } = site0();
  const ops = diffDocs(site, edit(site, r => setProp(r, h.id, 'text', 'X', 'fr')));
  const out = applyOps(site, ops);
  assert.equal(nodeIn(out, h.id).props.text.fr, 'X');
  assert.equal(nodeIn(site, h.id).props.text.fr, 'Titre', 'original intact');
  assert.equal(out.theme, site.theme, 'branches non touchées partagées');
  assert.equal(out.pages[0].root.children[0].children[0].children[1], site.pages[0].root.children[0].children[0].children[1]);
});

/* ---------- Réplicas : convergence ---------- */
function pair() {
  const { site, ...rest } = site0();
  let t = 1_000_000;
  const now = () => t++;
  const A = createReplica({ replica: 'A', doc: clone(site), docId: 'd1', now });
  const B = createReplica({ replica: 'B', doc: clone(site), docId: 'd1', now });
  return { A, B, ...rest };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('modifications simultanées de propriétés différentes : toutes gardées des deux côtés', () => {
  const { A, B, h, t } = pair();
  const oa = A.local(edit(A.doc, r => setProp(r, h.id, 'text', 'Par A', 'fr')));
  const ob = B.local(edit(B.doc, r => setProp(r, t.id, 'content', '<p>Par B</p>', 'fr')));
  A.receive(ob); B.receive(oa);
  assert.ok(same(A.doc, B.doc));
  assert.equal(nodeIn(A.doc, h.id).props.text.fr, 'Par A');
  assert.equal(nodeIn(A.doc, t.id).props.content.fr, '<p>Par B</p>');
});

test('même propriété : la plus récente gagne partout, quel que soit l’ordre d’arrivée', () => {
  const { A, B, h } = pair();
  const oa = A.local(edit(A.doc, r => setProp(r, h.id, 'text', 'A', 'fr')));
  const ob = B.local(edit(B.doc, r => setProp(r, h.id, 'text', 'B', 'fr')));
  const r1 = B.receive(oa);
  A.receive(ob);
  assert.equal(r1.applied.length, 0, 'B a écrit après A : l’ancienne valeur est ignorée');
  assert.ok(same(A.doc, B.doc));
  assert.equal(nodeIn(A.doc, h.id).props.text.fr, 'B');
});

test('ajouts simultanés dans la même colonne : les deux gardés, même ordre partout', () => {
  const { A, B, c1 } = pair();
  const x = createNode('button'); const y = createNode('divider');
  const oa = A.local(edit(A.doc, r => insertNode(r, c1.id, x)));
  const ob = B.local(edit(B.doc, r => insertNode(r, c1.id, y)));
  A.receive(ob); B.receive(oa);
  assert.ok(same(A.doc, B.doc));
  const kids = nodeIn(A.doc, c1.id).children.map(n => n.id);
  assert.ok(kids.includes(x.id) && kids.includes(y.id) && kids.length === 3);
});

test('suppression contre modification à l’intérieur : supprimé des deux côtés', () => {
  const { A, B, h } = pair();
  const oa = A.local(edit(A.doc, r => removeNode(r, h.id)));
  const ob = B.local(edit(B.doc, r => setProp(r, h.id, 'text', 'Encore là ?', 'fr')));
  A.receive(ob); B.receive(oa);
  assert.ok(same(A.doc, B.doc));
  assert.equal(nodeIn(B.doc, h.id), null);
});

test('reprise après coupure : chacun envoie ce qui manque à l’autre (fusion hors ligne)', () => {
  const { A, B, h, t, c1 } = pair();
  A.local(edit(A.doc, r => setProp(r, h.id, 'text', 'Hors ligne A', 'fr')));
  const z = createNode('spacer');
  A.local(edit(A.doc, r => insertNode(r, c1.id, z)));
  B.local(edit(B.doc, r => setProp(r, t.id, 'content', '<p>Hors ligne B</p>', 'fr')));
  const forB = A.delta(B.summary());
  const forA = B.delta(A.summary());
  B.receive(forB); A.receive(forA);
  assert.ok(same(A.doc, B.doc));
  assert.equal(nodeIn(B.doc, h.id).props.text.fr, 'Hors ligne A');
  assert.ok(nodeIn(B.doc, z.id));
  assert.equal(nodeIn(A.doc, t.id).props.content.fr, '<p>Hors ligne B</p>');
  assert.equal(A.delta(B.summary()).length, 0, 'plus rien à échanger');
});

test('convergence aléatoire : 3 participants, 300 modifications, livraison dans le désordre', () => {
  let seed = 42;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const { site, c1, c2 } = site0();
  let t = 5_000_000;
  const now = () => t + rnd(50);
  const R = ['A', 'B', 'C'].map(id => createReplica({ replica: id, doc: clone(site), docId: 'd', now }));
  const queues = R.map(() => []);
  for (let step = 0; step < 300; step++) {
    t += rnd(3);
    const i = rnd(3);
    const me = R[i];
    const cols = [c1.id, c2.id].filter(id => nodeIn(me.doc, id));
    let next = me.doc;
    const kids = cols.flatMap(id => nodeIn(me.doc, id).children.map(n => n.id));
    const k = rnd(4);
    try {
      if (k === 0 || !kids.length) next = edit(me.doc, r => insertNode(r, cols[rnd(cols.length)], createNode(['button', 'divider', 'heading'][rnd(3)])));
      else if (k === 1) next = edit(me.doc, r => removeNode(r, kids[rnd(kids.length)]));
      else if (k === 2) {
        const id = kids[rnd(kids.length)];
        const n = nodeIn(me.doc, id);
        next = n.type === 'heading' ? edit(me.doc, r => setProp(r, id, 'text', `v${step}`, 'fr'))
          : n.type === 'button' ? edit(me.doc, r => setProp(r, id, 'label', `b${step}`, 'fr'))
          : edit(me.doc, r => setProp(r, id, 'line', ['solid', 'dashed', 'dotted'][rnd(3)]));
      }
      else next = edit(me.doc, r => moveNode(r, kids[rnd(kids.length)], cols[rnd(cols.length)], 0));
    } catch { next = me.doc; }
    const ops = me.local(next);
    for (let j = 0; j < 3; j++) if (j !== i) queues[j].push(ops);
    for (let j = 0; j < 3; j++) if (queues[j].length && rnd(2)) R[j].receive(queues[j].splice(rnd(queues[j].length), 1)[0]);
  }
  for (let j = 0; j < 3; j++) while (queues[j].length) R[j].receive(queues[j].shift());
  assert.ok(same(R[0].doc, R[1].doc) && same(R[1].doc, R[2].doc), 'les trois documents sont identiques');
});

test('annuler en collaboration : l’historique reçoit les changements des autres, « annuler » ne retire que les siens', () => {
  const { A, B, h, t } = pair();
  const before = A.doc;
  A.local(edit(A.doc, r => setProp(r, h.id, 'text', 'Ma modif', 'fr')));
  const ob = B.local(edit(B.doc, r => setProp(r, t.id, 'content', '<p>Celle de B</p>', 'fr')));
  const { applied } = A.receive(ob);
  const rebased = applyOps(before, applied);
  const undoOps = A.local(rebased);
  B.receive(undoOps);
  assert.equal(nodeIn(A.doc, h.id).props.text.fr, 'Titre', 'ma modification est annulée');
  assert.equal(nodeIn(A.doc, t.id).props.content.fr, '<p>Celle de B</p>', 'celle de B reste');
  assert.ok(same(A.doc, B.doc));
});

test('validateOps : chemins dangereux, relecteur limité aux commentaires, images vérifiées', () => {
  const ok = { p: ['pages', '#i:p1', 'title', 'fr'], v: 'x', ts: '1' };
  assert.equal(validateOps([ok], { role: 'editor' }).ok.length, 1);
  for (const bad of [
    { p: ['__proto__', 'polluted'], v: 1, ts: '1' },
    { p: ['theme', 'constructor', 'prototype'], v: 1, ts: '1' },
    { p: ['collab', 'x'], v: 1, ts: '1' },
    { p: ['assets', 'img_x'], v: { file: 'a.png', mime: 'image/png', dataUrl: 'javascript:alert(1)' }, ts: '1' },
    { p: ['assets', 'img_x', 'dataUrl'], v: 'data:text/html;base64,PHNjcmlwdD4=', ts: '1' }
  ]) assert.equal(validateOps([bad], { role: 'editor' }).rejected.length, 1, JSON.stringify(bad.p));
  const r = validateOps([ok, { p: ['review', 'comments', 'c1', 'resolved'], v: true, ts: '1' }], { role: 'reviewer' });
  assert.equal(r.rejected.length, 1);
  assert.match(r.rejected[0].reason, /relecteur/i);
  assert.equal(r.ok.length, 1);
  assert.equal(pathKey(['a', '#i:b']), pathKey(['a', '#i:b']));
});

/* ---------- Découpage des messages ---------- */
test('messages découpés en morceaux puis réassemblés (canal limité à 256 Ko)', () => {
  const big = JSON.stringify({ t: 'snapshot', data: 'é'.repeat(300000) });
  const parts = splitMessage(big, 64000);
  assert.ok(parts.length >= 5 && parts.every(p => p.length <= 64100));
  const r = new Reassembler();
  let out = null;
  for (const p of [...parts].reverse()) out = r.push(p) ?? out;
  assert.equal(out, big);
  assert.equal(new Reassembler().push(splitMessage('{"t":"x"}', 64000)[0]), '{"t":"x"}');
});

/* ---------- Protocole complet (liens en mémoire) ---------- */
function linkPair(log) {
  const a = { label: 'a', closed: false, send: m => { if (!a.closed) queueMicrotask(() => b.onmessage?.(JSON.parse(JSON.stringify(m)))); log?.push(m.t); }, close: () => { a.closed = b.closed = true; a.onclose?.(); b.onclose?.(); } };
  const b = { label: 'b', closed: false, send: m => { if (!b.closed) queueMicrotask(() => a.onmessage?.(JSON.parse(JSON.stringify(m)))); }, close: () => a.close() };
  return [a, b];
}
const settle = async () => { for (let i = 0; i < 60; i++) await new Promise(r => setTimeout(r, 10)); };

async function session() {
  const { site, h, t, c1 } = site0();
  const room = createRoom();
  const roomId = await roomIdOf(room.secret);
  const owner = await createIdentity('Kudoro');
  const ed = await createIdentity('Ana');
  const rev = await createIdentity('Laurent');
  const invEd = await createInvite(owner, { secret: room.secret, role: 'editor', hostPeer: 'host' });
  const invRev = await createInvite(owner, { secret: room.secret, role: 'reviewer', hostPeer: 'host' });
  const events = { host: [], ed: [], rev: [] };
  const mk = (who, identity, role, invite, doc) => {
    const n = new CollabNode({ identity, role, secret: room.secret, roomId, invite, replica: createReplica({ replica: identity.fp.slice(0, 8), doc, docId: doc ? 'doc-1' : null }), onRemote: (d, ops, info) => events[who].push({ d, ops, info }), onError: e => events[who].push({ error: e }) });
    return n;
  };
  const host = mk('host', owner, 'owner', null, clone(site));
  const guestEd = mk('ed', ed, 'editor', invEd, null);
  const guestRev = mk('rev', rev, 'reviewer', invRev, null);
  const [h1, g1] = linkPair(); host.connect(h1); guestEd.connect(g1);
  const [h2, g2] = linkPair(); host.connect(h2); guestRev.connect(g2);
  await settle();
  return { site, h, t, c1, host, guestEd, guestRev, events, owner, ed, rev, room, roomId, links: { h1, g1, h2, g2 } };
}

test('protocole : invitation vérifiée, preuve de clé, copie du projet envoyée aux invités', async () => {
  const s = await session();
  assert.equal(s.host.peers().length, 2);
  assert.ok(s.host.peers().every(p => p.authed));
  assert.deepEqual(s.host.peers().map(p => p.role).sort(), ['editor', 'reviewer']);
  assert.ok(same(s.guestEd.replica.doc, s.host.replica.doc), 'éditeur : projet reçu');
  assert.ok(same(s.guestRev.replica.doc, s.host.replica.doc), 'relecteur : projet reçu');
  assert.ok(s.events.ed.some(e => e.info?.snapshot));
});

test('protocole : une modification d’éditeur arrive chez l’hôte et chez le relecteur', async () => {
  const s = await session();
  await s.guestEd.local(edit(s.guestEd.replica.doc, r => setProp(r, s.h.id, 'text', 'Modifié par Ana', 'fr')));
  await settle();
  assert.equal(nodeIn(s.host.replica.doc, s.h.id).props.text.fr, 'Modifié par Ana');
  assert.equal(nodeIn(s.guestRev.replica.doc, s.h.id).props.text.fr, 'Modifié par Ana', 'relayé par l’hôte');
  await s.host.local(edit(s.host.replica.doc, r => setProp(r, s.t.id, 'content', '<p>Hôte</p>', 'fr')));
  await settle();
  assert.equal(nodeIn(s.guestEd.replica.doc, s.t.id).props.content.fr, '<p>Hôte</p>');
});

test('protocole : le relecteur ne modifie rien, ses commentaires signés passent ; commentaire falsifié refusé', async () => {
  const s = await session();
  await s.guestRev.local(edit(s.guestRev.replica.doc, r => setProp(r, s.h.id, 'text', 'Piraté', 'fr')));
  await settle();
  assert.equal(nodeIn(s.host.replica.doc, s.h.id).props.text.fr, 'Titre', 'modification du relecteur refusée');
  assert.ok(s.events.host.some(e => /relecteur/i.test(e.error || '')));
  const c = await makeComment(s.rev, { anchor: { pageId: s.site.pages[0].id, nodeId: s.h.id }, text: 'Le titre est trop long.' });
  await s.guestRev.local(addComment(s.guestRev.replica.doc, c));
  await settle();
  assert.equal(s.host.replica.doc.review.comments[c.id].text, 'Le titre est trop long.');
  assert.equal(s.guestEd.replica.doc.review.comments[c.id].author.name, 'Laurent', 'relayé à l’éditeur');
  const forged = await makeComment(s.ed, { anchor: { pageId: s.site.pages[0].id, nodeId: s.h.id }, text: 'Faux' });
  forged.author = { ...c.author };
  await s.guestEd.local(addComment(s.guestEd.replica.doc, forged));
  await settle();
  assert.ok(!s.host.replica.doc.review.comments[forged.id], 'signature qui ne correspond pas : refusé');
  await s.guestEd.local(setResolved(s.guestEd.replica.doc, c.id, true));
  await settle();
  assert.equal(s.guestRev.replica.doc.review.comments[c.id].resolved, true, 'un éditeur peut résoudre');
});

test('protocole : invitation trafiquée ou d’une autre salle refusée', async () => {
  const { site } = site0();
  const room = createRoom();
  const roomId = await roomIdOf(room.secret);
  const owner = await createIdentity('Kudoro');
  const mallory = await createIdentity('Mallory');
  const inv = await createInvite(owner, { secret: room.secret, role: 'reviewer', hostPeer: 'host' });
  const [head, body, sig] = inv.split('.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  payload.role = 'editor';
  const tampered = [head, Buffer.from(JSON.stringify(payload)).toString('base64url'), sig].join('.');
  const selfSigned = await createInvite(mallory, { secret: room.secret, role: 'editor', hostPeer: 'host' });
  for (const bad of [tampered, selfSigned]) {
    const errors = [];
    const host = new CollabNode({ identity: owner, role: 'owner', secret: room.secret, roomId, replica: createReplica({ replica: 'h', doc: clone(site), docId: 'x' }), onRemote: () => {}, onError: e => errors.push(e) });
    const guest = new CollabNode({ identity: mallory, role: 'editor', secret: room.secret, roomId, invite: bad, replica: createReplica({ replica: 'g', doc: null, docId: null }), onRemote: () => {}, onError: () => {} });
    const [a, b] = linkPair(); host.connect(a); guest.connect(b);
    await settle();
    assert.equal(host.peers().filter(p => p.authed).length, 0, 'pas connecté');
    assert.ok(errors.some(e => /invitation/i.test(e)), errors.join(' / '));
    assert.equal(guest.replica.doc, null, 'rien reçu');
  }
});

test('protocole : reconnexion d’un invité avec des modifications faites hors ligne', async () => {
  const s = await session();
  s.links.g1.close();
  await settle();
  assert.equal(s.host.peers().length, 1, 'l’hôte voit le départ');
  await s.guestEd.local(edit(s.guestEd.replica.doc, r => setProp(r, s.h.id, 'text', 'Écrit dans le train', 'fr')));
  await s.host.local(edit(s.host.replica.doc, r => setProp(r, s.t.id, 'content', '<p>Pendant ce temps</p>', 'fr')));
  const [a, b] = linkPair(); s.host.connect(a); s.guestEd.connect(b);
  await settle();
  assert.equal(nodeIn(s.host.replica.doc, s.h.id).props.text.fr, 'Écrit dans le train');
  assert.equal(nodeIn(s.guestEd.replica.doc, s.t.id).props.content.fr, '<p>Pendant ce temps</p>');
  assert.ok(same(s.host.replica.doc, s.guestEd.replica.doc));
  assert.ok(same(s.host.replica.doc, s.guestRev.replica.doc), 'le relecteur a aussi reçu le texte du train');
});

test('protocole : présence relayée (page et élément sélectionné)', async () => {
  const s = await session();
  const seen = [];
  s.guestRev.onPresence = (fp, p) => seen.push({ fp, p });
  s.guestEd.setPresence({ pageId: 'p1', selected: s.h.id });
  await settle();
  assert.ok(seen.some(x => x.fp === s.ed.fp && x.p.selected === s.h.id && x.p.name === 'Ana'));
});

void addPage;

test('protocole : le premier message perdu (canal tout juste ouvert) est renvoyé, la connexion aboutit', async () => {
  const { site } = site0();
  const room = createRoom();
  const roomId = await roomIdOf(room.secret);
  const owner = await createIdentity('Kudoro');
  const guestId = await createIdentity('Ana');
  const inv = await createInvite(owner, { secret: room.secret, role: 'editor', hostPeer: 'h' });
  const host = new CollabNode({ identity: owner, role: 'owner', secret: room.secret, roomId, replica: createReplica({ replica: 'h', doc: clone(site), docId: 'd' }) });
  const guest = new CollabNode({ identity: guestId, role: 'editor', secret: room.secret, roomId, invite: inv, replica: createReplica({ replica: 'g', doc: null, docId: null }) });
  const [a, b] = linkPair();
  let dropped = false;
  const send0 = a.send;
  a.send = m => { if (!dropped && m.t === 'hello') { dropped = true; return; } send0(m); };
  host.connect(a); guest.connect(b);
  for (let i = 0; i < 300 && !guest.replica.doc; i++) await new Promise(r => setTimeout(r, 10));
  assert.ok(dropped, 'le premier hello de l’hôte a bien été perdu');
  assert.ok(same(guest.replica.doc, host.replica.doc), 'projet reçu malgré tout');
  host.close(); guest.close();
});
