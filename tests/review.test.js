import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns } from '../core/tree.js';
import { createSite, updatePageRoot, normalizeSite, validateSite } from '../core/site.js';
import { renderSite } from '../core/render.js';
import { diffDocs } from '../core/collab.js';
import {
  createIdentity, exportIdentity, importIdentity, didKey, createRoom, roomIdOf, createInvite, verifyInvite, joinFragment, parseJoin,
  signChallenge, verifyChallenge, makeComment, verifyComment, addComment, addReply, setResolved, removeComment, listComments, openCount,
  encryptFor, decryptFrom
} from '../core/review.js';

function site0() {
  let s = normalizeSite(createSite({ name: 'MAB', languages: ['fr'] }));
  let root = s.pages[0].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const h = createNode('heading');
  root = insertNode(root, sec.children[0].children[0].id, h);
  return { site: updatePageRoot(s, s.pages[0].id, root), h };
}

test('identité : clé P-256, did:key, empreinte, export et import', async () => {
  const me = await createIdentity('Laurent');
  assert.equal(me.name, 'Laurent');
  assert.match(me.did, /^did:key:zDn[1-9A-HJ-NP-Za-km-z]+$/);
  assert.equal(me.did, didKey(me.pub));
  assert.match(me.fp, /^[A-Za-z0-9_-]{16}$/);
  const saved = await exportIdentity(me);
  assert.ok(saved.priv?.d && saved.pub?.x && !('d' in saved.pub), 'clé publique sans partie privée');
  const back = await importIdentity(saved);
  assert.equal(back.fp, me.fp);
  const sig = await signChallenge(back, 'nonce-123', 'room');
  assert.equal(await verifyChallenge(me.pub, 'nonce-123', 'room', sig), true);
  assert.equal(await verifyChallenge(me.pub, 'nonce-124', 'room', sig), false);
  const other = await createIdentity('X');
  assert.notEqual(other.fp, me.fp);
});

test('salle : secret aléatoire, identifiant = SHA-256, lien de participation', async () => {
  const a = createRoom(); const b = createRoom();
  assert.notEqual(a.secret, b.secret);
  assert.match(a.secret, /^[A-Za-z0-9_-]{43}$/);
  const id = await roomIdOf(a.secret);
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.equal(id, await roomIdOf(a.secret));
  const owner = await createIdentity('Kudoro');
  const inv = await createInvite(owner, { secret: a.secret, role: 'reviewer', hostPeer: 'abcd1234', signal: 'https://www.exemple.be/publish.php' });
  const frag = joinFragment(a.secret, inv);
  assert.ok(frag.startsWith('join='));
  const p = parseJoin(`#${frag}`);
  assert.equal(p.secret, a.secret);
  assert.equal(p.invite, inv);
  assert.equal(parseJoin('#autre'), null);
});

test('invitation : rôle signé, salle, expiration, falsification détectée', async () => {
  const { secret } = createRoom();
  const roomId = await roomIdOf(secret);
  const owner = await createIdentity('Kudoro');
  const inv = await createInvite(owner, { secret, role: 'editor', hostPeer: 'h1', signal: 'https://x.be/publish.php', name: 'Ana' });
  const v = await verifyInvite(inv, { roomId });
  assert.equal(v.ok, true, v.error);
  assert.equal(v.role, 'editor');
  assert.equal(v.ownerFp, owner.fp);
  assert.equal(v.hostPeer, 'h1');
  assert.equal(v.signal, 'https://x.be/publish.php');
  assert.equal((await verifyInvite(inv, { roomId: '0'.repeat(64) })).ok, false, 'autre salle');
  const [h, body, sig] = inv.split('.');
  const pl = JSON.parse(Buffer.from(body, 'base64url').toString());
  pl.role = 'owner';
  assert.equal((await verifyInvite([h, Buffer.from(JSON.stringify(pl)).toString('base64url'), sig].join('.'), { roomId })).ok, false, 'rôle modifié');
  const old = await createInvite(owner, { secret, role: 'reviewer', hostPeer: 'h1', exp: Date.now() - 1000 });
  assert.match((await verifyInvite(old, { roomId })).error, /expir/i);
  assert.equal((await verifyInvite('n.importe.quoi', { roomId })).ok, false);
  await assert.rejects(createInvite(owner, { secret, role: 'admin', hostPeer: 'h1' }), /Rôle/);
});

test('commentaires : signés, vérifiés, réponses, résolution, suppression, liste par page', async () => {
  const { site, h } = site0();
  const pageId = site.pages[0].id;
  const ana = await createIdentity('Ana');
  const c = await makeComment(ana, { anchor: { pageId, nodeId: h.id }, text: '  Le titre <b>est</b>\n trop long.  ' });
  assert.equal(c.text, 'Le titre est\ntrop long.');
  assert.equal(c.author.name, 'Ana');
  assert.equal(c.author.fp, ana.fp);
  assert.equal(await verifyComment(c), true);
  assert.equal(await verifyComment({ ...c, text: 'Autre chose' }), false, 'texte modifié : signature invalide');
  assert.equal(await verifyComment({ ...c, author: { ...c.author, name: 'Laurent' } }), false, 'auteur modifié');
  let s = addComment(site, c);
  assert.equal(openCount(s), 1);
  const lau = await createIdentity('Laurent');
  const r = await makeComment(lau, { anchor: c.anchor, text: 'D’accord, je raccourcis.', parentId: c.id });
  s = addReply(s, c.id, r);
  assert.equal(s.review.comments[c.id].replies.length, 1);
  assert.equal(await verifyComment(s.review.comments[c.id].replies[0]), true);
  s = setResolved(s, c.id, true);
  assert.equal(openCount(s), 0);
  assert.equal(listComments(s, { pageId }).length, 1);
  assert.equal(listComments(s, { pageId, open: true }).length, 0);
  assert.equal(listComments(s, { pageId: 'autre' }).length, 0);
  assert.throws(() => addComment(s, { ...c, text: '' }), /vide/);
  s = removeComment(s, c.id);
  assert.equal(listComments(s, {}).length, 0);
  assert.throws(() => setResolved(s, 'x', true), /introuvable/);
  await assert.rejects(makeComment(ana, { anchor: c.anchor, text: '   ' }), /vide/);
});

test('commentaires : jamais publiés, projet toujours valide, synchronisables', async () => {
  const { site, h } = site0();
  const me = await createIdentity('Kudoro');
  const c = await makeComment(me, { anchor: { pageId: site.pages[0].id, nodeId: h.id }, text: 'Note interne très secrète' });
  const s = addComment(site, c);
  assert.ok(validateSite(s).ok);
  for (const [, v] of renderSite(s).files) if (typeof v === 'string') assert.ok(!v.includes('très secrète'));
  const ops = diffDocs(site, s);
  assert.ok(ops.length >= 1 && ops.every(o => o.p[0] === 'review'));
});

test('chiffrement des messages de signalisation (AES-GCM, clé tirée du secret)', async () => {
  const { secret } = createRoom();
  const box = await encryptFor(secret, { t: 'offer', sdp: 'v=0…' });
  assert.equal(typeof box, 'string');
  assert.ok(!box.includes('offer'));
  assert.deepEqual(await decryptFrom(secret, box), { t: 'offer', sdp: 'v=0…' });
  await assert.rejects(decryptFrom(createRoom().secret, box));
  const box2 = await encryptFor(secret, { t: 'offer', sdp: 'v=0…' });
  assert.notEqual(box, box2, 'vecteur aléatoire à chaque message');
});
