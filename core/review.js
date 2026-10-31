/*
 * Relecture : identités (clé ECDSA P-256 par personne, did:key), salles et invitations signées,
 * commentaires signés posés sur les éléments, chiffrement des messages de signalisation.
 * WebCrypto uniquement (navigateur et Node 22), aucune dépendance.
 */
import { __, N_ } from './ui-i18n.js';
import { cloneSite } from './asset-store.js';

const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();
const clone = v => structuredClone(v);
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };

/* ---------- Encodages ---------- */
export function b64u(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes) {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b === 0) out = '1' + out; else break; }
  return out;
}
const randomB64 = n => b64u(globalThis.crypto.getRandomValues(new Uint8Array(n)));

/* ---------- Identités ---------- */
const pubOf = jwk => ({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });

export function didKey(pub) {
  const x = unb64u(pub.x);
  const y = unb64u(pub.y);
  const compressed = new Uint8Array(33);
  compressed[0] = (y[31] & 1) ? 0x03 : 0x02;
  compressed.set(x, 1);
  const bytes = new Uint8Array(35);
  bytes.set([0x80, 0x24], 0);
  bytes.set(compressed, 2);
  return `did:key:z${base58(bytes)}`;
}

export async function fingerprint(pub) {
  const h = await subtle.digest('SHA-256', te.encode(`${pub.x}.${pub.y}`));
  return b64u(h).slice(0, 16);
}

/* « Anonyme » reste en français : le nom fait partie des données signées et échangées */
const cleanName = n => String(n ?? '').replace(/[<>\u0000-\u001F]/g, '').trim().replace(/\s+/g, ' ').slice(0, 40) || 'Anonyme';

async function finish(name, pubJwk, privateKey, privJwk) {
  const pub = pubOf(pubJwk);
  const publicKey = await subtle.importKey('jwk', pub, ECDSA, true, ['verify']);
  return { name: cleanName(name), pub, did: didKey(pub), fp: await fingerprint(pub), privateKey, publicKey, privJwk };
}

export async function createIdentity(name) {
  const kp = await subtle.generateKey(ECDSA, true, ['sign', 'verify']);
  const privJwk = await subtle.exportKey('jwk', kp.privateKey);
  const pubJwk = await subtle.exportKey('jwk', kp.publicKey);
  return finish(name, pubJwk, kp.privateKey, privJwk);
}

export async function exportIdentity(id) {
  return { name: id.name, pub: id.pub, priv: id.privJwk };
}

export async function importIdentity(saved) {
  const privateKey = await subtle.importKey('jwk', saved.priv, ECDSA, true, ['sign']);
  return finish(saved.name, saved.pub, privateKey, saved.priv);
}

export function renameIdentity(id, name) { return { ...id, name: cleanName(name) }; }

async function sign(id, text) { return b64u(await subtle.sign(SIGN, id.privateKey, te.encode(text))); }
async function verify(pub, text, sig) {
  try {
    const key = await subtle.importKey('jwk', pubOf(pub), ECDSA, false, ['verify']);
    return await subtle.verify(SIGN, key, unb64u(sig), te.encode(text));
  } catch { return false; }
}

export const signChallenge = (id, nonce, roomId) => sign(id, `atelier-auth|${roomId}|${nonce}|${id.fp}`);
export async function verifyChallenge(pub, nonce, roomId, sig) {
  return verify(pub, `atelier-auth|${roomId}|${nonce}|${await fingerprint(pub)}`, sig);
}

/* ---------- Salles et invitations ---------- */
export function createRoom() { return { secret: randomB64(32) }; }
export async function roomIdOf(secret) { return hex(await subtle.digest('SHA-256', te.encode(`atelier-room|${secret}`))); }

const ROLES = ['editor', 'reviewer'];
export async function createInvite(owner, { secret, role, hostPeer, signal = '', exp = Date.now() + 7 * 24 * 3600 * 1000, name = '' }) {
  if (!ROLES.includes(role)) throw new Error(__('Rôle inconnu : éditeur ou relecteur.'));
  const payload = { v: 1, room: await roomIdOf(secret), role, host: String(hostPeer || ''), signal: String(signal || ''), exp, owner: owner.pub, on: owner.name, ...(name ? { name: cleanName(name) } : {}) };
  const head = b64u(te.encode('{"alg":"ES256","typ":"atelier-invite"}'));
  const body = b64u(te.encode(JSON.stringify(payload)));
  return `${head}.${body}.${await sign(owner, `${head}.${body}`)}`;
}

/* Les erreurs restent en français (N_) : elles passent dans les messages entre pairs et les données du journal ; traduites à l'affichage avec __() */
export async function verifyInvite(token, { roomId, now = Date.now() } = {}) {
  try {
    const [head, body, sig] = String(token).split('.');
    if (!head || !body || !sig) return { ok: false, error: N_('Invitation illisible.') };
    const p = JSON.parse(td.decode(unb64u(body)));
    if (!p.owner?.x || !ROLES.includes(p.role)) return { ok: false, error: N_('Invitation non valide.') };
    if (!(await verify(p.owner, `${head}.${body}`, sig))) return { ok: false, error: N_('Signature de l’invitation invalide.') };
    if (roomId && p.room !== roomId) return { ok: false, error: N_('Invitation pour une autre session.') };
    if (typeof p.exp !== 'number' || p.exp < now) return { ok: false, error: N_('Invitation expirée : demandez un nouveau lien.') };
    return { ok: true, role: p.role, ownerPub: pubOf(p.owner), ownerFp: await fingerprint(p.owner), ownerName: cleanName(p.on), hostPeer: p.host, signal: p.signal, exp: p.exp, room: p.room, name: p.name || '' };
  } catch { return { ok: false, error: N_('Invitation illisible.') }; }
}

export const joinFragment = (secret, invite) => `join=${secret}.${invite}`;
export function parseJoin(hash) {
  const m = /(?:^#?|&)join=([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.exec(String(hash || ''));
  return m ? { secret: m[1], invite: m[2] } : null;
}

/* ---------- Chiffrement des messages (AES-GCM, clé dérivée du secret par HKDF) ---------- */
async function roomKey(secret) {
  const base = await subtle.importKey('raw', unb64u(secret), 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: te.encode('atelier-signal'), info: te.encode('v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptFor(secret, obj) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, await roomKey(secret), te.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv); out.set(ct, 12);
  return b64u(out);
}
export async function decryptFrom(secret, box) {
  const bytes = unb64u(box);
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await roomKey(secret), bytes.slice(12));
  return JSON.parse(td.decode(pt));
}

/* ---------- Commentaires ---------- */
const cleanText = t => String(t ?? '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000);
const cleanAnchor = a => ({ pageId: String(a?.pageId || '').slice(0, 60), nodeId: String(a?.nodeId || '').slice(0, 60), ...(a?.where ? { where: String(a.where).slice(0, 80) } : {}), ...(a?.label ? { label: cleanText(a.label).slice(0, 80) } : {}) });
const payloadOf = c => JSON.stringify(['atelier-comment', c.id, c.parentId || null, c.anchor, c.text, c.author.name, c.author.fp, c.at]);

export async function makeComment(identity, { anchor, text, parentId = null, at = new Date().toISOString() }) {
  const t = cleanText(text);
  if (!t) throw new Error(__('Le commentaire est vide.'));
  const c = { id: 'cm_' + randomB64(9), parentId, anchor: cleanAnchor(anchor), text: t, author: { name: identity.name, fp: identity.fp, pub: identity.pub }, at };
  if (!parentId) { c.resolved = false; c.replies = []; }
  c.sig = await sign(identity, payloadOf(c));
  return c;
}

export async function verifyComment(c) {
  try {
    if (!c?.author?.pub || (await fingerprint(c.author.pub)) !== c.author.fp) return false;
    return verify(c.author.pub, payloadOf(c), c.sig);
  } catch { return false; }
}

function withReview(site) {
  const s = cloneSite(site);
  s.review = { comments: {}, ...(s.review || {}) };
  s.review.comments = { ...(s.review.comments || {}) };
  return s;
}

function checkShape(c) {
  if (!c || typeof c.id !== 'string' || !/^cm_[A-Za-z0-9_-]{6,20}$/.test(c.id)) throw new Error(__('Commentaire invalide.'));
  if (!cleanText(c.text)) throw new Error(__('Le commentaire est vide.'));
}

export function addComment(site, c) {
  checkShape(c);
  const s = withReview(site);
  s.review.comments[c.id] = { ...clone(c), text: cleanText(c.text), resolved: !!c.resolved, replies: Array.isArray(c.replies) ? clone(c.replies) : [] };
  return s;
}

export function addReply(site, commentId, reply) {
  checkShape(reply);
  const s = withReview(site);
  const c = s.review.comments[commentId];
  if (!c) throw new Error(__('Commentaire introuvable.'));
  s.review.comments[commentId] = { ...c, replies: [...(c.replies || []), clone(reply)] };
  return s;
}

export function setResolved(site, commentId, on) {
  if (!site.review?.comments?.[commentId]) throw new Error(__('Commentaire introuvable.'));
  const s = withReview(site);
  s.review.comments[commentId] = { ...s.review.comments[commentId], resolved: !!on };
  return s;
}

export function removeComment(site, commentId) {
  if (!site.review?.comments?.[commentId]) throw new Error(__('Commentaire introuvable.'));
  const s = withReview(site);
  delete s.review.comments[commentId];
  return s;
}

export function removeReply(site, commentId, replyId) {
  const c = site.review?.comments?.[commentId];
  if (!c) throw new Error(__('Commentaire introuvable.'));
  const s = withReview(site);
  s.review.comments[commentId] = { ...c, replies: (c.replies || []).filter(r => r.id !== replyId) };
  return s;
}

export function listComments(site, { pageId, open = false } = {}) {
  return Object.values(site.review?.comments || {})
    .filter(c => (!pageId || c.anchor?.pageId === pageId) && (!open || !c.resolved))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export const openCount = (site, pageId) => listComments(site, { pageId, open: true }).length;

/* Contrôle des opérations de relecture reçues : signatures et auteurs (raisons en français, N_ : elles passent entre pairs) */
export async function checkReviewOps(ops, { role, fp, doc }) {
  const ok = [];
  const rejected = [];
  for (const op of ops) {
    if (op.p[0] !== 'review') { ok.push(op); continue; }
    const reason = await (async () => {
      const [, coll, cid, sub, rseg, ...rest] = op.p;
      if (op.p.length === 1) return op.v && typeof op.v === 'object' && !op.del ? wholeReason(op.v.comments || {}, role, fp, doc) : role === 'owner' ? null : N_('suppression de toute la relecture refusée');
      if (coll !== 'comments') return N_('chemin de relecture inconnu');
      if (op.p.length === 2) return op.v && typeof op.v === 'object' && !op.del ? wholeReason(op.v, role, fp, doc) : role === 'owner' ? null : N_('suppression de toute la relecture refusée');
      const existing = doc?.review?.comments?.[cid];
      const isEditor = role === 'owner' || role === 'editor';
      const isAuthor = existing?.author?.fp === fp;
      if (op.p.length === 3) {
        if (op.del) return isEditor || isAuthor ? null : N_('seul l’auteur ou un éditeur peut supprimer un commentaire');
        if (!(await verifyComment(op.v)) || op.v.id !== cid) return N_('signature du commentaire invalide');
        if (role !== 'owner' && op.v.author.fp !== fp) return N_('commentaire au nom de quelqu’un d’autre');
        if (existing && !isEditor && !isAuthor) return N_('commentaire existant');
        return null;
      }
      if (sub === 'resolved' && op.p.length === 4) return isEditor || isAuthor || role === 'reviewer' ? null : N_('non autorisé');
      if (sub === 'replies') {
        if (op.p.length === 4) return op.order ? null : N_('réponses : opération non autorisée');
        if (op.p.length === 5 && !rest.length) {
          const reply = (existing?.replies || []).find(r => `#i:${r.id}` === rseg);
          if (op.del) return isEditor || reply?.author?.fp === fp ? null : N_('seul l’auteur ou un éditeur peut supprimer une réponse');
          if (!(await verifyComment(op.v)) || `#i:${op.v.id}` !== rseg) return N_('signature de la réponse invalide');
          if (role !== 'owner' && op.v.author.fp !== fp) return N_('réponse au nom de quelqu’un d’autre');
          return null;
        }
      }
      return N_('modification d’un commentaire signé refusée');
    })();
    if (reason) rejected.push({ op, reason }); else ok.push(op);
  }
  return { ok, rejected };
}

async function wholeReason(comments, role, fp, doc) {
  if (role !== 'owner' && Object.keys(doc?.review?.comments || {}).length) return N_('remplacement de toute la relecture refusé');
  for (const [id, c] of Object.entries(comments || {})) {
    if (c?.id !== id || !(await verifyComment(c))) return N_('signature du commentaire invalide');
    if (role !== 'owner' && c.author.fp !== fp) return N_('commentaire au nom de quelqu’un d’autre');
    for (const r of c.replies || []) if (!(await verifyComment(r)) || (role !== 'owner' && r.author.fp !== fp)) return N_('réponse non valide');
  }
  return null;
}
