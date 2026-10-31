/*
 * Réseau de la collaboration : canaux WebRTC entre navigateurs (données chiffrées par DTLS, sans serveur),
 * signalisation par la boîte aux lettres de publish.php (messages chiffrés avec la clé de session)
 * ou par codes à copier-coller. Les messages longs sont découpés (limite de 256 Ko par message).
 *
 * Journal : rtc.* (connexion WebRTC, ICE, canal), signal.* (boîte aux lettres, codes manuels, STUN).
 * Jamais d'adresse IP dans le journal : seulement le type des candidats (host, srflx, relay).
 */
import { splitMessage, Reassembler } from '../core/collab-protocol.js';
import { encryptFor, decryptFrom } from '../core/review.js';
import { signalRoom, errorMessage } from '../core/publish.js';
import { formatEntry } from '../core/log.js';
import { log } from './log.js';
import { __, __n, N_ } from '../core/ui-i18n.js';

const STUN_KEY = 'atelier-stun';
export const DEFAULT_STUN = 'stun:stun.l.google.com:19302';
const STUN_RE = /^stuns?:[a-z0-9.-]+(:\d+)?$/i;
export function stunSetting() {
  try { const v = localStorage.getItem(STUN_KEY); return v === null ? DEFAULT_STUN : v; } catch (e) { log.warn('signal.stun-unreadable', __('Réglage STUN illisible (stockage indisponible) : serveur par défaut'), { error: e }); return DEFAULT_STUN; }
}
export function setStunSetting(v) {
  const value = String(v || '').trim();
  try { localStorage.setItem(STUN_KEY, value); } catch (e) { log.warn('signal.stun-unsaved', __('Réglage STUN non enregistré (stockage indisponible)'), { error: e }); }
  const parts = value.split(/[\s,]+/).filter(Boolean);
  log.info('signal.stun', value ? __n(parts.filter(u => STUN_RE.test(u)).length, 'Serveur STUN réglé : {n} adresse valable', 'Serveur STUN réglé : {n} adresses valables') : __('Serveur STUN vidé : connexion possible seulement sur le même réseau local'), { stun: value, valid: parts.filter(u => STUN_RE.test(u)), ignored: parts.filter(u => !STUN_RE.test(u)) });
}
let warnedStun = '';
const iceServers = () => {
  const parts = stunSetting().split(/[\s,]+/).filter(Boolean);
  const bad = parts.filter(u => !STUN_RE.test(u));
  if (bad.length && warnedStun !== bad.join(' ')) {
    warnedStun = bad.join(' ');
    log.warn('rtc.stun-ignored', __('Adresse(s) ignorée(s) dans le réglage réseau : seuls les serveurs « stun:hôte:port » sont pris en charge (TURN pas encore)'), { ignored: bad.map(u => u.replace(/\/\/[^@/]*@/, '//[masqué]@')) });
  }
  return parts.filter(u => STUN_RE.test(u)).map(urls => ({ urls }));
};

/* Ancienne trace de cycle14 (window.__atelierLog) : on y recopie les lignes du journal de la collaboration */
log.subscribe(e => {
  const out = globalThis.__atelierLog;
  if (!Array.isArray(out) || !/^(rtc|signal|collab|review)\./.test(e.code)) return;
  out.push(formatEntry(e));
  if (out.length > 2000) out.splice(0, out.length - 2000);
});

export const newPeerId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
const short = id => String(id || '').slice(0, 8);

/* ---------- Suivi des connexions WebRTC (diagnostic, contexte du journal) ---------- */
const peers = new Set();
const byPc = new WeakMap();
const counts = () => ({ host: 0, srflx: 0, relay: 0, prflx: 0 });
const ICE_MSG = {
  new: N_('ICE : pas encore commencé'),
  checking: N_('ICE : essai des chemins réseau entre les deux navigateurs'),
  connected: N_('ICE : un chemin réseau fonctionne'),
  completed: N_('ICE : vérification des chemins terminée'),
  disconnected: N_('ICE : chemin réseau perdu (coupure, veille, changement de réseau) ; WebRTC réessaie'),
  failed: N_('ICE : aucun chemin réseau ne fonctionne entre les deux navigateurs'),
  closed: N_('ICE : fermé')
};
const PC_MSG = {
  new: N_('Connexion : nouvelle'),
  connecting: N_('Connexion : établissement (ICE puis chiffrement DTLS)'),
  connected: N_('Connexion : établie et chiffrée'),
  disconnected: N_('Connexion : interrompue, tentative de reprise'),
  failed: N_('Connexion : échec'),
  closed: N_('Connexion : fermée')
};

export function rtcStatus() {
  return [...peers].map(p => ({
    lien: p.label, côté: p.side === 'offer' ? 'demande' : 'réponse', ice: p.pc.iceConnectionState, connexion: p.pc.connectionState, collecte: p.pc.iceGatheringState,
    canal: p.channel?.readyState || 'aucun', locaux: p.local, distants: p.remoteSet ? p.remote : 'pas encore reçus', paire: p.pair || undefined, stun: p.stun.length ? p.stun : 'aucun', âge: `${Math.round((performance.now() - p.t0) / 1000)} s`
  }));
}

function candidateTypes(sdp) {
  const c = counts();
  for (const m of String(sdp || '').matchAll(/^a=candidate:.* typ ([a-z]+)/gm)) c[m[1]] = (c[m[1]] || 0) + 1;
  return c;
}

/* Pourquoi la connexion ne s'établit pas : déduit des candidats échangés */
function diagnose(p) {
  const L = p.local;
  const R = p.remote;
  let cause;
  if (!p.remoteSet) cause = __('La réponse de l’autre navigateur n’est jamais arrivée : rien n’a pu être essayé.');
  else if (!L.host && !L.srflx && !L.relay) cause = __('Ce navigateur n’a trouvé aucune adresse réseau (WebRTC bloqué par une extension, une stratégie d’entreprise ou le navigateur).');
  else if (!R.host && !R.srflx && !R.relay && !R.prflx) cause = __('L’autre navigateur n’a envoyé aucune adresse réseau (WebRTC bloqué de son côté, ou code de connexion incomplet).');
  else if (!p.stun.length) cause = __('Aucun serveur STUN réglé : seule une connexion sur le même réseau local est possible. Remets le serveur STUN par défaut (Réglage réseau).');
  else if (!L.srflx) cause = __('Ce navigateur n’a obtenu aucune adresse publique (aucun candidat srflx) : serveur STUN injoignable ou UDP bloqué par un pare-feu (réseau d’entreprise, hôtel). Essaie un autre réseau, par exemple le partage de connexion d’un téléphone.');
  else if (!R.srflx && !R.relay) cause = __('L’autre navigateur n’a envoyé que des adresses locales (aucun candidat srflx) : son serveur STUN est vide ou injoignable, ou son UDP est bloqué.');
  else cause = __('Les deux navigateurs ont une adresse publique, mais aucun chemin ne passe : NAT « symétrique » (box 4G/5G, CGNAT, réseau d’entreprise) ou pare-feu. Il faut un serveur TURN (relais), pas encore pris en charge par Atelier.');
  return { cause, data: { label: p.label, ice: p.pc.iceConnectionState, pc: p.pc.connectionState, gathering: p.pc.iceGatheringState, local: L, remote: p.remoteSet ? R : null, stun: p.stun, iceErrors: p.iceErrors || undefined, ms: Math.round(performance.now() - p.t0) } };
}

async function readPair(p) {
  try {
    const stats = await p.pc.getStats();
    let pair = null;
    stats.forEach(s => { if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId) || pair; });
    if (!pair) stats.forEach(s => { if (!pair && s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') pair = s; });
    if (!pair) { log.debug('rtc.pair-unknown', __('Chemin réseau utilisé inconnu (statistiques incomplètes)'), { label: p.label }); return; }
    const lc = stats.get(pair.localCandidateId);
    const rc = stats.get(pair.remoteCandidateId);
    p.pair = { local: lc?.candidateType, remote: rc?.candidateType, protocol: lc?.protocol, rttMs: typeof pair.currentRoundTripTime === 'number' ? Math.round(pair.currentRoundTripTime * 1000) : undefined };
    log.info('rtc.pair', __(p.pair.local === 'relay' || p.pair.remote === 'relay' ? N_('Chemin réseau utilisé : {local} ↔ {remote} ({protocol}), par un relais') : N_('Chemin réseau utilisé : {local} ↔ {remote} ({protocol})'), { local: p.pair.local, remote: p.pair.remote, protocol: p.pair.protocol || '?' }), { label: p.label, ...p.pair, ms: Math.round(performance.now() - p.t0) });
  } catch (e) { log.warn('rtc.stats-fail', __('Statistiques WebRTC illisibles'), { label: p.label, error: e }); }
}

function makePc(side, label) {
  const servers = iceServers();
  const pc = new RTCPeerConnection({ iceServers: servers });
  const p = { pc, side, label: String(label || ''), t0: performance.now(), local: counts(), remote: counts(), remoteSet: false, stun: servers.map(s => s.urls), pair: null, iceErrors: 0, channel: null, failedLogged: false };
  peers.add(p);
  byPc.set(pc, p);
  log.debug('rtc.pc.create', side === 'offer' ? __('Connexion WebRTC créée (côté demande)') : __('Connexion WebRTC créée (côté réponse)'), { side, label: p.label, stun: p.stun.length ? p.stun : 'aucun (réseau local seulement)' });
  pc.addEventListener('icecandidate', e => {
    if (!e.candidate) return;
    const type = e.candidate.type || /typ ([a-z]+)/.exec(e.candidate.candidate || '')?.[1] || 'inconnu';
    p.local[type] = (p.local[type] || 0) + 1;
    log.trace('rtc.ice.candidate', __('Candidat local : {type}', { type }), { label: p.label, type, protocol: e.candidate.protocol, mdns: /\.local\b/.test(e.candidate.candidate || '') || undefined });
  });
  pc.addEventListener('icecandidateerror', e => {
    p.iceErrors++;
    log.add(p.iceErrors <= 3 ? 'debug' : 'trace', 'rtc.ice.error', __('Erreur ICE {code} sur {url} : {text} (701 = serveur injoignable depuis une interface ; sans gravité si un candidat srflx existe)', { code: e.errorCode, url: e.url || __('un serveur'), text: e.errorText || __('sans détail') }), { label: p.label, url: e.url, code: e.errorCode, text: e.errorText, n: p.iceErrors });
  });
  pc.addEventListener('icegatheringstatechange', () => {
    log.debug('rtc.ice.gathering', __('Collecte des candidats : {state}', { state: pc.iceGatheringState }), { label: p.label, state: pc.iceGatheringState, local: p.local });
  });
  pc.addEventListener('iceconnectionstatechange', () => {
    const s = pc.iceConnectionState;
    log.add(s === 'connected' || s === 'completed' ? 'info' : s === 'failed' || s === 'disconnected' ? 'warn' : 'debug', 'rtc.ice.state', ICE_MSG[s] ? __(ICE_MSG[s]) : __('ICE : {state}', { state: s }), { label: p.label, state: s, ms: Math.round(performance.now() - p.t0) });
  });
  pc.addEventListener('connectionstatechange', () => {
    const s = pc.connectionState;
    log.add(s === 'connected' ? 'info' : s === 'failed' || s === 'disconnected' ? 'warn' : 'debug', 'rtc.pc.state', PC_MSG[s] ? __(PC_MSG[s]) : __('Connexion : {state}', { state: s }), { label: p.label, state: s, ms: Math.round(performance.now() - p.t0) });
    if (s === 'connected') { p.wasConnected = true; readPair(p); }
    if (s === 'failed' && !p.failedLogged) {
      p.failedLogged = true;
      if (p.wasConnected) {
        log.info('rtc.lost', __('Connexion perdue après avoir fonctionné : l’autre navigateur a été fermé, mis en veille ou a changé de réseau'), { label: p.label, ms: Math.round(performance.now() - p.t0), pair: p.pair || undefined });
        peers.delete(p);
      } else {
        const d = diagnose(p);
        log.warn('rtc.failed', __('Connexion directe impossible : {cause}', { cause: d.cause }), d.data);
      }
    }
    if (s === 'closed') peers.delete(p);
  });
  return p;
}

async function setRemote(p, desc) {
  await p.pc.setRemoteDescription(desc);
  p.remote = candidateTypes(desc.sdp);
  p.remoteSet = true;
  log.debug('rtc.ice.remote', __('Adresses reçues de l’autre navigateur : {list}', { list: Object.entries(p.remote).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || __('aucune') }), { label: p.label, type: desc.type, remote: p.remote });
}

/* Lien du protocole au-dessus d'un canal de données */
export function channelLink(channel, pc, label = '') {
  const p = byPc.get(pc);
  if (p) p.channel = channel;
  const re = new Reassembler();
  const queue = [];
  let stalled = false;
  let sent = 0;
  let received = 0;
  channel.bufferedAmountLowThreshold = 1 << 20;
  const pump = () => {
    while (queue.length && channel.readyState === 'open' && channel.bufferedAmount < 4 << 20) channel.send(queue.shift());
    if (queue.length && channel.readyState === 'open' && !stalled) {
      stalled = true;
      log.debug('rtc.flow.wait', __('Tampon d’envoi plein (4 Mo) : envoi en pause'), { label, queued: queue.length, buffered: channel.bufferedAmount });
    } else if (!queue.length && stalled) {
      stalled = false;
      log.debug('rtc.flow.resume', __('Tampon d’envoi vidé : envoi repris'), { label, buffered: channel.bufferedAmount });
    }
  };
  channel.onbufferedamountlow = pump;
  const opened = () => log.info('rtc.channel.open', __('Canal de données ouvert avec {name}', { name: label || __('l’autre navigateur') }), { label, ms: p ? Math.round(performance.now() - p.t0) : undefined });
  if (channel.readyState === 'open') opened(); else channel.addEventListener('open', opened);
  channel.addEventListener('open', pump);
  /* Cause SCTP 12 (« User-Initiated Abort ») : l'autre côté a fermé le canal, ce n'est pas une panne */
  channel.addEventListener('error', e => log.add(e.error?.sctpCauseCode === 12 ? 'debug' : 'warn', 'rtc.channel.error', e.error?.sctpCauseCode === 12 ? __('Canal fermé par l’autre côté') : __('Erreur du canal de données : {error}', { error: e.error?.message || __('inconnue') }), { label, detail: e.error?.errorDetail, sctp: e.error?.sctpCauseCode, error: e.error }));
  const inbox = [];
  let handler = null;
  const link = {
    label,
    get onmessage() { return handler; },
    set onmessage(fn) { handler = fn; while (handler && inbox.length) handler(inbox.shift()); },
    onclose: null,
    send(obj) {
      if (['closing', 'closed'].includes(channel.readyState)) { log.debug('rtc.send-dropped', __('Message « {t} » non envoyé : canal {state}', { t: obj?.t, state: channel.readyState }), { label, t: obj?.t }); return; }
      const str = JSON.stringify(obj);
      const parts = splitMessage(str);
      sent++;
      log.trace('rtc.send', __('Envoi « {t} »', { t: obj.t }), { label, t: obj.t, bytes: str.length, state: channel.readyState });
      if (parts.length > 1) log.trace('rtc.chunk.split', __('Message « {t} » découpé en {n} morceaux', { t: obj.t, n: parts.length }), { label, t: obj.t, parts: parts.length, bytes: str.length });
      queue.push(...parts);
      pump();
    },
    close() {
      try { channel.close(); } catch (e) { log.warn('rtc.close-error', __('Fermeture du canal impossible'), { label, error: e }); }
      try { pc?.close(); } catch (e) { log.warn('rtc.close-error', __('Fermeture de la connexion impossible'), { label, error: e }); }
      if (p) peers.delete(p);
    }
  };
  channel.onmessage = e => {
    const raw = String(e.data);
    const full = re.push(raw);
    if (full === null) { log.trace('rtc.chunk.part', __('Morceau de message reçu'), { label, bytes: raw.length }); return; }
    if (raw[0] === '\u0001') log.trace('rtc.chunk.join', __('Message reconstitué à partir de ses morceaux'), { label, bytes: full.length });
    let msg;
    try { msg = JSON.parse(full); } catch (err) { log.warn('rtc.recv.invalid', __('Message reçu illisible (JSON) : ignoré'), { label, bytes: full.length, error: err }); return; }
    received++;
    log.trace('rtc.recv', __('Reçu « {t} »', { t: msg?.t }), { label, t: msg?.t, bytes: full.length });
    if (handler) handler(msg); else inbox.push(msg);
  };
  let closed = false;
  const done = () => {
    if (closed) return;
    closed = true;
    log.info('rtc.channel.close', __('Canal de données fermé avec {name}', { name: label || __('l’autre navigateur') }), { label, pc: pc?.connectionState, ice: pc?.iceConnectionState, sent, received });
    link.onclose?.();
  };
  channel.onclose = done;
  pc?.addEventListener('connectionstatechange', () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) done(); });
  return link;
}

function waitIce(p, ms = 4000) {
  const { pc } = p;
  const t0 = performance.now();
  let reported = false;
  const report = timedOut => {
    if (reported) return;
    reported = true;
    const data = { label: p.label, ms: Math.round(performance.now() - t0), local: p.local, stun: p.stun.length ? p.stun : 'aucun' };
    const slowStun = p.stun.length && !p.local.srflx;
    const found = p.local.host + p.local.srflx + p.local.relay;
    if (timedOut) log.add(slowStun ? 'warn' : 'debug', 'rtc.ice.gather-timeout', slowStun ? __n(found, 'Collecte des adresses non terminée après {s} s : envoi de {n} adresse trouvée (serveur STUN lent ou injoignable ?)', 'Collecte des adresses non terminée après {s} s : envoi des {n} adresses trouvées (serveur STUN lent ou injoignable ?)', { s: ms / 1000 }) : __n(found, 'Collecte des adresses non terminée après {s} s : envoi de {n} adresse trouvée', 'Collecte des adresses non terminée après {s} s : envoi des {n} adresses trouvées', { s: ms / 1000 }), data);
    else log.debug('rtc.ice.gathered', __('Candidats trouvés : {host} host, {srflx} srflx, {relay} relay', { host: p.local.host, srflx: p.local.srflx, relay: p.local.relay }), data);
    if (!p.stun.length) log.info('rtc.ice.no-stun', __('Aucun serveur STUN : seules les adresses locales sont proposées (même réseau seulement)'), { label: p.label });
    else if (!p.local.srflx) log.warn('rtc.ice.no-srflx', __('Aucune adresse publique obtenue (pas de candidat srflx) : serveur STUN injoignable ou UDP bloqué ; la connexion ne marchera que sur le même réseau'), { label: p.label, stun: p.stun, iceErrors: p.iceErrors });
  };
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') { report(false); resolve(); return; }
    const t = setTimeout(() => { report(true); resolve(); }, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); report(false); resolve(); } });
  });
}

function openChannel(channel, p, ms = 20000) {
  return new Promise((resolve, reject) => {
    if (channel.readyState === 'open') { resolve(); return; }
    const t = setTimeout(() => {
      const d = diagnose(p);
      log.warn('rtc.channel.timeout', __('Canal non ouvert après {s} s : {cause}', { s: ms / 1000, cause: d.cause }), d.data);
      reject(new Error(__('la connexion directe n’a pas abouti (pare-feu ou réseau d’entreprise ?)')));
    }, ms);
    channel.addEventListener('open', () => { clearTimeout(t); resolve(); });
  });
}

/* ---------- Boîte aux lettres publish.php ---------- */
export class Mailbox {
  constructor({ url, roomId, peerId, secret, interval = 1500 }) {
    Object.assign(this, { url, roomId, peerId, secret, interval });
    this.after = 0;
    this.timer = null;
    this.stopped = false;
    this.failing = 0;
    this.polls = 0;
    this.got = 0;
  }
  /* Salle de la boîte aux lettres et preuve (publish.php v5) : dérivées du secret, qui ne quitte jamais le navigateur */
  box() { return (this.boxP ||= signalRoom(this.secret)); }
  async post(to, obj) {
    const data = await encryptFor(this.secret, obj);
    log.debug('signal.post', __('Dépôt d’un message chiffré « {t} » pour {to}', { t: obj.t, to }), { room: short(this.roomId), from: this.peerId, to, t: obj.t, bytes: data.length });
    let r;
    const box = await this.box();
    try { r = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signal: box.room, proof: box.proof, from: this.peerId, to, data }) }); } catch (e) {
      log.warn('signal.post-fail', __('Boîte aux lettres injoignable : publish.php arrêté ou déplacé, hors ligne, ou requête bloquée ({error})', { error: e.message }), { url: this.url, t: obj.t, online: globalThis.navigator?.onLine, error: e });
      throw Object.assign(new Error(__('boîte aux lettres injoignable ({error})', { error: e.message })), { cause: e });
    }
    if (!r.ok) {
      const b = await r.json().catch(e => { log.warn('signal.not-json', __('Réponse {status} de la boîte aux lettres illisible (pas du JSON) : publish.php absent, trop ancien, ou page d’erreur de l’hébergement', { status: r.status }), { status: r.status, error: e }); return {}; });
      const err = Object.assign(new Error(errorMessage(b, r.status)), { code: b.code });
      log.warn('signal.post-refused', __('Dépôt refusé par publish.php ({status}) : {error}', { status: r.status, error: err.message }), { status: r.status, t: obj.t, error: err });
      throw err;
    }
  }
  start(onMessage, onError) {
    log.debug('signal.start', __('Relève de la boîte aux lettres toutes les {s} s', { s: this.interval / 1000 }), { room: short(this.roomId), peer: this.peerId, every: this.interval });
    const tick = async () => {
      if (this.stopped) return;
      try {
        this.polls++;
        const r = await fetch(`${this.url}?signal=${(await this.box()).room}&peer=${this.peerId}&after=${this.after}`, { cache: 'no-store' });
        let b;
        try { b = await r.json(); } catch { throw Object.assign(new Error(__('réponse {status} qui n’est pas du JSON (publish.php absent, trop ancien ou en erreur)', { status: r.status })), { status: r.status }); }
        if (this.failing) { log.info('signal.recovered', __n(this.failing, 'Boîte aux lettres de nouveau joignable après {n} échec', 'Boîte aux lettres de nouveau joignable après {n} échecs'), { room: short(this.roomId), failures: this.failing }); this.failing = 0; }
        const msgs = b.messages || [];
        log.trace('signal.poll', msgs.length ? __n(msgs.length, '{n} message', '{n} messages') : __('Aucun message'), { after: this.after, count: msgs.length });
        if (msgs.length) log.debug('signal.receive', __n(msgs.length, '{n} message relevé dans la boîte aux lettres', '{n} messages relevés dans la boîte aux lettres'), { room: short(this.roomId), count: msgs.length, from: [...new Set(msgs.map(m => m.from))] });
        for (const m of msgs) {
          this.after = Math.max(this.after, m.id);
          let msg;
          try { msg = await decryptFrom(this.secret, m.data); } catch (e) {
            log.warn('signal.decrypt-fail', __('Message illisible avec la clé de cette session (autre session, lien modifié ou message altéré) : ignoré'), { from: m.from, id: m.id, error: e });
            continue;
          }
          this.got++;
          log.trace('signal.decrypt', __('Message « {t} » déchiffré', { t: msg?.t }), { from: m.from, id: m.id, t: msg?.t });
          try { await onMessage(m.from, msg); } catch (e) { log.error('signal.handle-fail', __('Message « {t} » de la boîte aux lettres non traité : {error}', { t: msg?.t, error: e.message }), { from: m.from, t: msg?.t, error: e }); }
        }
      } catch (e) {
        this.failing++;
        if (this.failing === 1 || this.failing % 10 === 0) log.warn('signal.poll-fail', this.failing > 1 ? __('Boîte aux lettres injoignable ({n} essais) : {error}', { n: this.failing, error: e.message }) : __('Boîte aux lettres injoignable : {error}', { error: e.message }), { url: this.url, status: e.status, failures: this.failing, online: globalThis.navigator?.onLine, error: e });
        else log.trace('signal.poll-retry', __('Boîte aux lettres toujours injoignable'), { failures: this.failing });
        onError?.(e);
      }
      if (!this.stopped) this.timer = setTimeout(tick, this.interval);
    };
    tick();
  }
  stop() {
    if (!this.stopped) log.debug('signal.stop', __('Relève de la boîte aux lettres arrêtée'), { room: short(this.roomId), polls: this.polls, received: this.got });
    this.stopped = true;
    clearTimeout(this.timer);
  }
}

export async function signalSupported(url) {
  let r;
  try { r = await fetch(url, { cache: 'no-store' }); } catch (e) {
    log.warn('signal.unsupported', __('Boîte aux lettres injoignable ({error}) : mise en relation par codes à copier-coller', { error: e.message }), { url, why: 'injoignable', online: globalThis.navigator?.onLine, error: e });
    return false;
  }
  let b;
  try { b = await r.json(); } catch (e) {
    log.warn('signal.unsupported', __('Réponse {status} qui n’est pas celle de publish.php : mise en relation par codes à copier-coller', { status: r.status }), { url, why: 'pas du JSON', status: r.status, error: e });
    return false;
  }
  if (!b?.signal) {
    log.warn('signal.unsupported', b?.version ? __('publish.php version {version} sans boîte aux lettres (trop ancien : retélécharge-le) : mise en relation par codes à copier-coller', { version: b.version }) : __('publish.php sans boîte aux lettres (trop ancien : retélécharge-le) : mise en relation par codes à copier-coller'), { url, why: 'trop ancien', version: b?.version, status: r.status });
    return false;
  }
  log.debug('signal.check', __('Boîte aux lettres disponible (publish.php version {version})', { version: b.version }), { url, version: b.version, req: b.req });
  return true;
}

/* Attend l'ouverture du canal côté réponse (l'événement datachannel n'arrive que si ICE aboutit) */
function answerSide(p, f, onLink, onError, ms = 30000) {
  const t = setTimeout(() => {
    if (f.done) return;
    const d = diagnose(p);
    log.warn('rtc.channel.timeout', __('Canal non ouvert après {s} s : {cause}', { s: ms / 1000, cause: d.cause }), d.data);
    f.fail(new Error(__('la connexion directe n’a pas abouti')), d.data);
  }, ms);
  p.pc.ondatachannel = e => {
    const ch = e.channel;
    const l = channelLink(ch, p.pc, p.label);
    openChannel(ch, p).then(() => { clearTimeout(t); f.ok(__('Liaison directe prête avec {name}', { name: p.label }), { ms: Math.round(performance.now() - p.t0) }); onLink(l); })
      .catch(err => { clearTimeout(t); f.fail(err, diagnose(p).data); onError?.(err); });
  };
}

/* Hôte : répond aux offres reçues dans la boîte aux lettres */
export function hostViaMailbox({ url, roomId, peerId, secret, onLink, onError }) {
  const box = new Mailbox({ url, roomId, peerId, secret, interval: 2000 });
  const seen = new Set();
  log.info('signal.host', __('En attente des invités dans la boîte aux lettres de publish.php'), { room: short(roomId), peer: peerId, url });
  box.start(async (from, msg) => {
    if (msg?.t !== 'offer') { log.debug('signal.ignored', __('Message « {t} » ignoré : l’hôte attend des demandes de connexion', { t: msg?.t }), { from, t: msg?.t }); return; }
    if (seen.has(`${from}|${msg.n}`)) { log.trace('signal.duplicate', __('Demande déjà traitée'), { from }); return; }
    seen.add(`${from}|${msg.n}`);
    const f = log.flow('rtc.accept', __('Demande de connexion reçue de {from}', { from }), { from, via: 'boîte aux lettres' });
    let p;
    try {
      p = makePc('answer', from);
      answerSide(p, f, onLink, onError);
      await setRemote(p, { type: 'offer', sdp: msg.sdp });
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      f.step('answer', __('Réponse créée : collecte des adresses réseau'));
      await waitIce(p);
      await box.post(from, { t: 'answer', sdp: p.pc.localDescription.sdp, n: msg.n });
      f.step('sent', __('Réponse déposée dans la boîte aux lettres : ouverture du canal…'), { local: p.local }, 'info');
    } catch (e) { f.fail(e, p ? diagnose(p).data : { from }); }
  }, onError);
  return { stop: () => box.stop() };
}

/* Invité : envoie son offre à l'hôte et attend la réponse */
export async function joinViaMailbox({ url, roomId, peerId, secret, hostPeer, timeout = 30000 }) {
  const f = log.flow('rtc.join', __('Connexion à l’hôte {host} par la boîte aux lettres', { host: hostPeer }), { host: hostPeer, url, room: short(roomId) });
  let p = null;
  try {
    p = makePc('offer', hostPeer);
    const ch = p.pc.createDataChannel('atelier', { ordered: true });
    const link = channelLink(ch, p.pc, hostPeer);
    await p.pc.setLocalDescription(await p.pc.createOffer());
    f.step('offer', __('Demande de connexion créée : collecte des adresses réseau'));
    await waitIce(p);
    const box = new Mailbox({ url, roomId, peerId, secret, interval: 1000 });
    const n = Date.now();
    await box.post(hostPeer, { t: 'offer', sdp: p.pc.localDescription.sdp, n });
    f.step('sent', __('Demande déposée dans la boîte aux lettres : en attente de la réponse de l’hôte'), { local: p.local }, 'info');
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        box.stop();
        log.warn('signal.no-answer', __('Aucune réponse de l’hôte en {s} s : session fermée, page de l’hôte fermée ou en veille, ou invitation d’une ancienne session', { s: timeout / 1000 }), { host: hostPeer, polls: box.polls });
        reject(new Error(__('pas de réponse : la session est-elle toujours ouverte de l’autre côté ?')));
      }, timeout);
      box.start(async (from, msg) => {
        if (from !== hostPeer || msg?.t !== 'answer' || msg.n !== n) { log.debug('signal.ignored', __('Message « {t} » ignoré (pas la réponse attendue)', { t: msg?.t }), { from, t: msg?.t }); return; }
        box.stop();
        clearTimeout(t);
        try { await setRemote(p, { type: 'answer', sdp: msg.sdp }); resolve(); } catch (e) { reject(e); }
      });
    });
    f.step('answer', __('Réponse de l’hôte reçue : ouverture du canal…'), { remote: p.remote }, 'info');
    await openChannel(ch, p);
    f.ok(__('Liaison directe prête avec l’hôte'), { ms: Math.round(performance.now() - p.t0) });
    return link;
  } catch (e) { f.fail(e, p ? diagnose(p).data : {}); throw e; }
}

/* ---------- Signalisation manuelle (codes à copier-coller, aucun serveur) ---------- */
async function readCode(secret, code, expected, wrongMsg) {
  let msg;
  try { msg = await decryptFrom(secret, String(code).trim()); } catch (e) {
    log.warn('signal.code-invalid', __('Code illisible : incomplet (copie coupée), modifié, ou créé pour une autre session'), { chars: String(code).trim().length, expected, error: e });
    throw Object.assign(new Error(__('code illisible : incomplet, modifié ou créé pour une autre session')), { cause: e });
  }
  if (msg?.t !== expected) {
    log.warn('signal.code-wrong', __('Ce code n’est pas celui attendu (« {got} » au lieu de « {expected} »)', { got: msg?.t, expected }), { got: msg?.t, expected });
    throw new Error(wrongMsg);
  }
  return msg;
}

export async function manualOffer({ secret, peerId }) {
  const f = log.flow('rtc.manual-offer', __('Création du code de connexion (sans serveur)'), { peer: peerId });
  let p;
  let ch;
  let link;
  let code;
  try {
    p = makePc('offer', 'manuel');
    ch = p.pc.createDataChannel('atelier', { ordered: true });
    link = channelLink(ch, p.pc, 'manuel');
    await p.pc.setLocalDescription(await p.pc.createOffer());
    await waitIce(p);
    code = await encryptFor(secret, { t: 'offer', sdp: p.pc.localDescription.sdp, from: peerId });
    f.ok(__('Code de connexion prêt : à envoyer à l’hôte'), { chars: code.length, local: p.local });
  } catch (e) { f.fail(e); throw e; }
  return {
    code,
    async finish(answerCode) {
      const g = log.flow('rtc.manual-finish', __('Connexion avec le code de réponse reçu'), { chars: String(answerCode).trim().length });
      try {
        const msg = await readCode(secret, answerCode, 'answer', __('Ce code n’est pas une réponse de cette session.'));
        await setRemote(p, { type: 'answer', sdp: msg.sdp });
        g.step('remote', __('Code de réponse accepté : ouverture du canal…'), { remote: p.remote }, 'info');
        await openChannel(ch, p);
        g.ok(__('Liaison directe prête avec l’hôte'), { ms: Math.round(performance.now() - p.t0) });
        return link;
      } catch (e) { g.fail(e, diagnose(p).data); throw e; }
    },
    cancel() { log.info('rtc.manual-cancel', __('Connexion par codes abandonnée')); p.pc.close(); }
  };
}

export async function manualAnswer({ secret, offerCode, onLink, onError }) {
  const f = log.flow('rtc.manual-answer', __('Code de connexion reçu : création du code de réponse'), { chars: String(offerCode).trim().length });
  let g = null;
  try {
    const msg = await readCode(secret, offerCode, 'offer', __('Ce code n’est pas une demande de connexion de cette session.'));
    const p = makePc('answer', msg.from || 'manuel');
    g = log.flow('rtc.accept', __('Demande de connexion par code de {name}', { name: p.label }), { from: p.label, via: 'codes' });
    answerSide(p, g, onLink, onError, 180000);
    await setRemote(p, { type: 'offer', sdp: msg.sdp });
    await p.pc.setLocalDescription(await p.pc.createAnswer());
    await waitIce(p);
    const code = await encryptFor(secret, { t: 'answer', sdp: p.pc.localDescription.sdp });
    f.ok(__('Code de réponse prêt : à renvoyer à l’invité'), { chars: code.length, local: p.local });
    return code;
  } catch (e) { f.fail(e); g?.fail(e); throw e; }
}
