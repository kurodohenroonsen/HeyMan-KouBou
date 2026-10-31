/*
 * Protocole de collaboration, indépendant du transport (WebRTC dans l'éditeur, liens en mémoire dans les tests).
 * Topologie en étoile : la personne qui ouvre la session (« owner ») reçoit les autres, vérifie leurs invitations,
 * applique et relaie les modifications. Chaque lien : hello (clé publique, invitation, défi) → auth (défi signé)
 * → sync (table des versions) → snapshot ou delta → ops / presence.
 */
import { createReplica, validateOps, getAt } from './collab.js';
import { verifyInvite, signChallenge, verifyChallenge, fingerprint, checkReviewOps } from './review.js';
import { __, __n, N_ } from './ui-i18n.js';

export const PEER_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4d7c0f'];
export const colorFor = fp => PEER_COLORS[[...String(fp)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PEER_COLORS.length];
/* Journal facultatif (compatible avec createLogger de core/log.js) : muet par défaut, le cœur reste pur */
const NOFLOW = { step() {}, info() {}, warn() {}, ok() {}, fail() {}, cancel() {} };
export const NOLOG = { trace() {}, debug() {}, info() {}, warn() {}, error() {}, add() {}, flow: () => NOFLOW };
const ROLE_FR = { owner: N_('hôte'), editor: N_('éditeur'), reviewer: N_('relecteur') };
const roleName = r => (ROLE_FR[r] ? __(ROLE_FR[r]) : r);

/* Les messages « error » échangés entre pairs restent en français (même forme quelle que soit la langue de chacun) :
   chaque côté les traduit pour l'affichage avec localizeWire. */
const WIRE_FIXED = new Set([
  N_('Preuve d’identité invalide : connexion refusée.'),
  N_('Identité invalide : connexion refusée.'),
  N_('Invitation refusée : elle n’a pas été créée par cette session.'),
  N_('Hôte inconnu : ce n’est pas la personne qui a envoyé l’invitation.'),
  N_('Erreur de collaboration')
]);
const WIRE_PATTERNS = [
  [/^Invitation refusée \((.*)\) : (.*)$/s, (name, reason) => __('Invitation refusée ({name}) : {reason}', { name, reason: __(reason) })],
  [/^Invitation refusée : (.*)$/s, reason => __('Invitation refusée : {reason}', { reason: __(reason) })],
  [/^Modification refusée : (.*)$/s, reason => __('Modification refusée : {reason}', { reason: __(reason) })]
];
export function localizeWire(text) {
  const s = String(text ?? '');
  if (WIRE_FIXED.has(s)) return __(s);
  for (const [re, fn] of WIRE_PATTERNS) { const m = re.exec(s); if (m) return fn(...m.slice(1)); }
  return s;
}
const nonce = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

/* ---------- Découpage des messages (canal WebRTC limité à 256 Ko par message) ---------- */
let chunkSeq = 0;
export function splitMessage(str, size = 60000) {
  if (str.length <= size) return [str];
  const id = `${Date.now().toString(36)}${(++chunkSeq).toString(36)}`;
  const n = Math.ceil(str.length / size);
  const out = [];
  for (let i = 0; i < n; i++) out.push(`\u0001${id}:${i}:${n}:${str.slice(i * size, (i + 1) * size)}`);
  return out;
}

export class Reassembler {
  constructor() { this.parts = new Map(); }
  push(part) {
    if (part[0] !== '\u0001') return part;
    const m = /^\u0001([a-z0-9]+):(\d+):(\d+):/.exec(part.slice(0, 40));
    if (!m) return null;
    const [, id, i, n] = m;
    const entry = this.parts.get(id) || { n: Number(n), got: new Map() };
    entry.got.set(Number(i), part.slice(m[0].length));
    this.parts.set(id, entry);
    if (entry.got.size < entry.n) return null;
    this.parts.delete(id);
    return Array.from({ length: entry.n }, (_, k) => entry.got.get(k)).join('');
  }
}

/* ---------- Nœud de collaboration ---------- */
export class CollabNode {
  /*
   * Crochets facultatifs (cycle 25), le cœur restant indépendant du modèle de site :
   *   sanitizeDoc(doc) → { doc, changed } : textes assainis d'un projet reçu (snapshot) ou obtenu après des opérations reçues ;
   *   validateDoc(doc) → { ok, errors }  : un snapshot invalide est refusé sans toucher au projet local.
   */
  constructor({ identity, role, secret, roomId, invite = null, replica, onRemote = () => {}, onError = () => {}, onPeers = () => {}, onPresence = () => {}, log = NOLOG, sanitizeDoc = null, validateDoc = null }) {
    Object.assign(this, { identity, role, secret, roomId, invite, replica, onRemote, onError, onPeers, onPresence, log, sanitizeDoc, validateDoc });
    this.links = new Map();
    this.presence = null;
    this.color = colorFor(identity.fp);
    this.inviteInfo = null;
  }

  get isHost() { return this.role === 'owner'; }

  /* Projet reçu en entier : assaini puis vérifié ; { ok, doc, changed } ou { ok: false, errors } */
  _checkDoc(doc) {
    try {
      let d = doc;
      let changed = 0;
      if (this.sanitizeDoc) { const r = this.sanitizeDoc(doc); d = r.doc; changed = r.changed || 0; }
      if (this.validateDoc) {
        const v = this.validateDoc(d);
        if (!v.ok) return { ok: false, errors: v.errors?.length ? v.errors : [__('document invalide')] };
      }
      return { ok: true, doc: d, changed };
    } catch (e) { return { ok: false, errors: [e?.message || String(e)] }; }
  }

  /* Après des opérations reçues : le document assaini et les opérations réécrites avec les valeurs nettoyées */
  _sanitizeApplied(st, doc, applied) {
    if (!applied.length || !this.sanitizeDoc) return { doc, ops: applied };
    const r = this.sanitizeDoc(doc);
    if (!r.changed) return { doc, ops: applied };
    this.replica.doc = r.doc;
    this.log.warn('collab.ops.sanitized', __n(r.changed, '{n} texte reçu de {name} nettoyé (balise ou attribut hors liste blanche)', '{n} textes reçus de {name} nettoyés (balises ou attributs hors liste blanche)', { name: st.name }), { name: st.name, changed: r.changed });
    const ops = applied.map(op => {
      if (op.del || op.order) return op;
      const cv = getAt(r.doc, op.p);
      return cv === undefined ? op : { ...op, v: structuredClone(cv) };
    });
    return { doc: r.doc, ops };
  }

  connect(link) {
    const st = { link, authed: false, helloOk: false, nonce: nonce(), fp: null, role: null, name: '', color: '', presence: null, pendingAuth: null };
    this.links.set(link, st);
    const log = this.log;
    st.chain = Promise.resolve();
    log.debug('collab.link.new', this.isHost ? __('Nouveau lien : présentation (hôte)') : __('Nouveau lien : présentation (invité)'), { label: link.label, links: this.links.size });
    link.onmessage = m => { st.chain = st.chain.then(() => this._msg(st, m)).catch(e => { log.error('collab.message-fail', __('Message « {t} » non traité : {error}', { t: m?.t, error: e.message }), { t: m?.t, from: st.name || link.label, error: e }); this.onError(__('Collaboration : {error}', { error: e.message })); }); };
    link.onclose = () => {
      if (!this.links.has(link)) return;
      this.links.delete(link);
      log.info('collab.link.closed', st.name ? (st.authed ? __('Lien fermé avec {name}', { name: st.name }) : __('Lien fermé avec {name} (avant vérification de l’identité)', { name: st.name })) : (st.authed ? __('Lien fermé') : __('Lien fermé (avant vérification de l’identité)')), { name: st.name || undefined, fp: st.fp || undefined, role: st.role || undefined, authed: st.authed, left: this.links.size });
      if (this.isHost && st.fp) log.info('collab.peer.leave', __('{name} a quitté la session', { name: st.name }), { fp: st.fp, role: st.role });
      if (this.isHost && st.fp) this._broadcast({ t: 'leave', fp: st.fp }, link);
      if (!this.isHost && st.fp) this.onPresence(st.fp, null);
      this.onPeers(this.peers());
    };
    const hello = () => link.send({ t: 'hello', v: 1, fp: this.identity.fp, pub: this.identity.pub, name: this.identity.name, color: this.color, invite: this.invite, nonce: st.nonce });
    hello();
    /* Le premier message d'un canal tout juste ouvert peut se perdre : on le renvoie tant que l'autre n'a pas répondu */
    let tries = 0;
    const retry = setInterval(() => {
      if (st.authed || st.pendingAuth || !this.links.has(link)) { clearInterval(retry); return; }
      if (++tries > 15) { clearInterval(retry); log.warn('collab.hello.timeout', __('L’autre navigateur ne répond pas à la présentation depuis 15 s (version d’Atelier différente, ou canal bloqué)'), { label: link.label, helloOk: st.helloOk }); return; }
      log.trace('collab.hello.retry', __('Présentation renvoyée'), { tries });
      hello();
    }, 1000);
    return st;
  }

  peers() {
    return [...this.links.values()].filter(s => s.fp).map(s => ({ fp: s.fp, name: s.name, role: s.role, color: s.color, authed: s.authed, presence: s.presence }));
  }

  _refuse(st, message) {
    this.onError(localizeWire(message));
    try { st.link.send({ t: 'error', message }); } catch (e) { this.log.warn('collab.send-fail', __('Refus non transmis : lien déjà fermé'), { error: e }); }
    setTimeout(() => { try { st.link.close(); } catch (e) { this.log.warn('collab.close-fail', __('Fermeture du lien impossible'), { error: e }); } }, 50);
    this.links.delete(st.link);
  }

  _send(st, msg) { if (this.links.has(st.link)) st.link.send(msg); }
  _broadcast(msg, except = null) {
    for (const [link, st] of this.links) if (link !== except && st.authed) link.send(msg);
  }

  async _msg(st, m) {
    const log = this.log;
    if (!m || typeof m !== 'object') { log.warn('collab.message-invalid', __('Message de collaboration invalide : ignoré'), { type: typeof m }); return; }
    if (m.t === 'error') {
      const text = String(m.message || 'Erreur de collaboration').slice(0, 300);
      const shown = localizeWire(text);
      log.warn('collab.remote-error', __('L’autre côté signale : {message}', { message: shown }), { from: st.name || st.link.label, message: text });
      this.onError(shown);
      return;
    }
    if (m.t === 'hello') return this._hello(st, m);
    if (m.t === 'auth') {
      if (st.authed) return;
      if (!st.helloOk) { st.pendingAuth = m; log.trace('collab.auth.early', __('Preuve reçue avant la présentation : gardée pour plus tard')); return; }
      if (!(await verifyChallenge(st.pub, st.nonce, this.roomId, m.sig))) {
        log.warn('collab.refused.auth', __('Preuve d’identité de {name} invalide : connexion refusée (clé privée différente de la clé annoncée)', { name: st.name }), { name: st.name, fp: st.fp });
        return this._refuse(st, 'Preuve d’identité invalide : connexion refusée.');
      }
      st.authed = true;
      log.info('collab.auth', __('Identité vérifiée : {name} ({role})', { name: st.name, role: roleName(st.role) }), { name: st.name, fp: st.fp, role: st.role, peers: this.peers().filter(p => p.authed).length });
      this.onPeers(this.peers());
      if (!this.isHost) {
        const summary = this.replica.docId ? this.replica.summary() : null;
        log.debug('collab.sync.ask', this.replica.docId ? __('Demande des modifications manquées (reprise)') : __('Demande du projet à l’hôte'), { docId: this.replica.docId, known: summary ? Object.keys(summary).length : 0 });
        this._send(st, { t: 'sync', docId: this.replica.docId, summary });
      }
      if (this.presence) this._send(st, { t: 'presence', fp: this.identity.fp, p: this._me(this.presence) });
      if (this.isHost) for (const o of this.links.values()) if (o !== st && o.authed && o.presence) this._send(st, { t: 'presence', fp: o.fp, p: o.presence });
      return;
    }
    if (!st.authed) return;
    switch (m.t) {
      case 'sync':
        if (!this.isHost) return;
        if (m.docId && m.docId === this.replica.docId) {
          const ops = this.replica.delta(m.summary || {});
          log.info('collab.sync.delta', __n(ops.length, 'Reprise de {name} : {n} modification manquée envoyée', 'Reprise de {name} : {n} modifications manquées envoyées', { name: st.name }), { name: st.name, ops: ops.length });
          this._send(st, { t: 'delta', ops, summary: this.replica.summary() });
        } else {
          const snapshot = this.replica.snapshot();
          log.info('collab.sync.snapshot', __('Envoi du projet complet à {name}', { name: st.name }), { name: st.name, why: m.docId ? 'autre document' : 'nouveau participant', pages: snapshot.doc?.pages?.length, kb: Math.round(JSON.stringify(snapshot).length / 1024) });
          this._send(st, { t: 'snapshot', snapshot });
        }
        return;
      case 'snapshot': {
        if (this.isHost || st.role !== 'owner') { log.warn('collab.snapshot-refused', __('Projet complet reçu d’un participant qui n’est pas l’hôte : ignoré'), { from: st.name, role: st.role }); return; }
        const sn = m.snapshot || {};
        const got = this._checkDoc(sn.doc);
        if (!got.ok) {
          const shown = __('Projet reçu de {name} refusé (document invalide) : {error}', { name: st.name, error: got.errors[0] });
          log.warn('collab.snapshot.invalid', shown, { from: st.name, docId: sn.docId, errors: got.errors.slice(0, 5) });
          this.onError(shown);
          return;
        }
        this.replica = createReplica({ replica: this.replica.replica, doc: got.doc, docId: sn.docId, table: sn.table || {} });
        if (got.changed) log.warn('collab.snapshot.sanitized', __n(got.changed, '{n} texte du projet reçu de {name} nettoyé (balise ou attribut hors liste blanche)', '{n} textes du projet reçu de {name} nettoyés (balises ou attributs hors liste blanche)', { name: st.name }), { from: st.name, changed: got.changed });
        log.info('collab.snapshot', __('Projet reçu de {name}', { name: st.name }), { docId: sn.docId, pages: got.doc?.pages?.length, comments: Object.keys(got.doc?.review?.comments || {}).length });
        this.onRemote(this.replica.doc, null, { snapshot: true, from: st.fp });
        return;
      }
      case 'delta': {
        if (this.isHost) return;
        await this._incoming(st, m.ops || []);
        const mine = this.replica.delta(m.summary || {});
        log.info('collab.sync.merged', __('Reprise : {in} modification(s) reçue(s), {out} envoyée(s) à l’hôte', { in: (m.ops || []).length, out: mine.length }), { in: (m.ops || []).length, out: mine.length });
        if (mine.length) this._send(st, { t: 'ops', ops: mine });
        return;
      }
      case 'ops':
        await this._incoming(st, m.ops || []);
        return;
      case 'presence': {
        log.debug('collab.presence', __('Présence de {name}', { name: this.isHost ? st.name : m.p?.name || m.fp }), { fp: this.isHost ? st.fp : m.fp, page: m.p?.pageId, selected: m.p?.selected });
        if (this.isHost) {
          st.presence = { ...(m.p || {}), name: st.name, color: st.color, role: st.role };
          this.onPresence(st.fp, st.presence);
          this._broadcast({ t: 'presence', fp: st.fp, p: st.presence }, st.link);
        } else this.onPresence(m.fp, m.p);
        return;
      }
      case 'leave':
        if (!this.isHost) { log.info('collab.peer.leave', __('Un participant a quitté la session'), { fp: m.fp }); this.onPresence(m.fp, null); }
        return;
      default:
        log.debug('collab.message-unknown', __('Message inconnu « {t} » : ignoré (version différente ?)', { t: String(m.t).slice(0, 20) }), { t: String(m.t).slice(0, 20) });
    }
  }

  async _hello(st, m) {
    const log = this.log;
    if (st.helloOk) {
      if (m.fp === st.fp && m.nonce === st.peerNonce) { log.trace('collab.hello.again', __('Présentation répétée : preuve renvoyée')); this._send(st, { t: 'auth', sig: await signChallenge(this.identity, m.nonce, this.roomId) }); }
      return;
    }
    const name = String(m.name || '').slice(0, 40);
    if (!m.pub?.x || (await fingerprint(m.pub)) !== m.fp) {
      log.warn('collab.refused.identity', __('Identité de {name} invalide (empreinte et clé publique ne correspondent pas) : connexion refusée', { name: name || __('l’autre participant') }), { name, fp: m.fp });
      return this._refuse(st, 'Identité invalide : connexion refusée.');
    }
    if (this.isHost) {
      const v = await verifyInvite(m.invite, { roomId: this.roomId });
      if (!v.ok) { log.warn('collab.refused.invite', __('Invitation de {name} refusée : {reason}', { name, reason: __(v.error) }), { name, fp: m.fp, reason: v.error }); return this._refuse(st, `Invitation refusée (${name}) : ${v.error}`); }
      if (v.ownerFp !== this.identity.fp) { log.warn('collab.refused.owner', __('Invitation de {name} refusée : signée par une autre clé que celle de l’hôte (lien falsifié ou d’une autre session)', { name }), { name, fp: m.fp, signer: v.ownerFp, signerName: v.ownerName }); return this._refuse(st, 'Invitation refusée : elle n’a pas été créée par cette session.'); }
      st.role = v.role;
      log.debug('collab.hello', __('Présentation de {name} : invitation valable ({role}, expire dans {h} h)', { name, role: roleName(v.role), h: Math.max(0, Math.round((v.exp - Date.now()) / 3600000)) }), { name, fp: m.fp, role: v.role });
    } else {
      this.inviteInfo ||= await verifyInvite(this.invite, { roomId: this.roomId });
      if (!this.inviteInfo.ok) { log.warn('collab.refused.invite', __('Invitation refusée : {reason}', { reason: __(this.inviteInfo.error) }), { reason: this.inviteInfo.error }); return this._refuse(st, `Invitation refusée : ${this.inviteInfo.error}`); }
      if (this.inviteInfo.ownerFp !== m.fp) { log.warn('collab.refused.host', __('Hôte inconnu : {name} n’est pas la personne qui a signé l’invitation ({owner})', { name, owner: this.inviteInfo.ownerName }), { name, fp: m.fp, expected: this.inviteInfo.ownerFp }); return this._refuse(st, 'Hôte inconnu : ce n’est pas la personne qui a envoyé l’invitation.'); }
      st.role = 'owner';
      log.debug('collab.hello', __('Présentation de l’hôte {name} : c’est bien la personne qui a signé l’invitation', { name }), { name, fp: m.fp, role: 'owner' });
    }
    Object.assign(st, { peerNonce: m.nonce, fp: m.fp, pub: m.pub, name: String(m.name || 'Anonyme').slice(0, 40), color: /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : colorFor(m.fp), helloOk: true });
    this._send(st, { t: 'auth', sig: await signChallenge(this.identity, m.nonce, this.roomId) });
    if (st.pendingAuth) { const a = st.pendingAuth; st.pendingAuth = null; await this._msg(st, a); }
  }

  async _incoming(st, ops) {
    const role = st.role;
    const v1 = validateOps(ops, { role: role === 'reviewer' ? 'reviewer' : 'editor' });
    const v2 = await checkReviewOps(v1.ok, { role, fp: st.fp, doc: this.replica.doc });
    const rejected = [...v1.rejected, ...v2.rejected];
    const log = this.log;
    if (v1.rejected.length) log.warn('collab.ops.rejected', __n(v1.rejected.length, '{n} modification de {name} refusée ({role}) : {reason}', '{n} modifications de {name} refusées ({role}) : {reason}', { name: st.name, role: roleName(role), reason: __(v1.rejected[0].reason) }), { name: st.name, role, count: v1.rejected.length, reason: v1.rejected[0].reason, path: v1.rejected[0].op?.p?.slice(0, 4) });
    if (v2.rejected.length) log.warn('review.ops.rejected', __n(v2.rejected.length, '{n} opération de relecture de {name} refusée : {reason}', '{n} opérations de relecture de {name} refusées : {reason}', { name: st.name, reason: __(v2.rejected[0].reason) }), { name: st.name, role, count: v2.rejected.length, reason: v2.rejected[0].reason, path: v2.rejected[0].op?.p?.slice(0, 3) });
    if (rejected.length) {
      const msg = __('Modification refusée ({name}, {role}) : {reason}', { name: st.name, role: roleName(role === 'reviewer' || role === 'owner' ? role : 'editor'), reason: __(rejected[0].reason) });
      this.onError(msg);
      if (this.isHost) this._send(st, { t: 'error', message: `Modification refusée : ${rejected[0].reason}` });
    }
    if (!v2.ok.length || !this.replica.doc) { if (v2.ok.length) log.debug('collab.ops.early', __('Modifications reçues avant le projet : ignorées (elles reviendront avec la reprise)'), { n: v2.ok.length }); return; }
    const received = this.replica.receive(v2.ok);
    const { doc, ops: applied } = this._sanitizeApplied(st, received.doc, received.applied);
    log.debug('collab.ops.in', applied.length < v2.ok.length ? __('{applied} modification(s) de {name} appliquée(s) ({skipped} déjà connue(s) ou plus ancienne(s))', { name: st.name, applied: applied.length, skipped: v2.ok.length - applied.length }) : __n(applied.length, '{n} modification de {name} appliquée', '{n} modifications de {name} appliquées', { name: st.name }), { name: st.name, received: v2.ok.length, applied: applied.length, review: applied.filter(o => o.p?.[0] === 'review').length || undefined });
    if (applied.length) {
      this.onRemote(doc, applied, { from: st.fp });
      if (this.isHost) { this._broadcast({ t: 'ops', ops: applied }, st.link); log.trace('collab.ops.relay', __('Modifications relayées aux autres participants'), { n: applied.length }); }
    }
  }

  _me(p) { return { ...p, name: this.identity.name, color: this.color, role: this.role }; }

  async local(next) {
    const ops = this.replica.local(next);
    if (ops.length) {
      const to = [...this.links.values()].filter(s => s.authed).length;
      this.log.debug('collab.ops.out', __('{n} modification(s) envoyée(s) à {to} participant(s)', { n: ops.length, to }), { n: ops.length, to, review: ops.filter(o => o.p?.[0] === 'review').length || undefined });
      this._broadcast({ t: 'ops', ops });
    }
    return ops;
  }

  setPresence(p) {
    this.presence = p;
    this._broadcast({ t: 'presence', fp: this.identity.fp, p: this._me(p) });
  }

  close() {
    this.log.debug('collab.node.close', __n(this.links.size, 'Fermeture de {n} lien', 'Fermeture de {n} liens'), { links: this.links.size });
    for (const link of [...this.links.keys()]) { try { link.close(); } catch (e) { this.log.warn('collab.close-fail', __('Fermeture du lien impossible'), { error: e }); } }
    this.links.clear();
    this.onPeers([]);
  }
}
