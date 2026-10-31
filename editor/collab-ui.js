/* Collaboration : identité, session (hôte ou invité), invitations, participants, présence. */
import { h, $, toast } from './dom.js';
import { openDialog } from './dialog.js';
import { state, subscribe, emit, load, applyRemote, setView, select } from './store.js';
import { createReplica } from '../core/collab.js';
import { CollabNode, colorFor } from '../core/collab-protocol.js';
import { validateSite, normalizeSite } from '../core/site.js';
import { sanitizeSiteTexts } from '../core/sanitize-site.js';
import { createIdentity, exportIdentity, importIdentity, renameIdentity, createRoom, roomIdOf, createInvite, verifyInvite, joinFragment, parseJoin } from '../core/review.js';
import { getSecret, setSecret } from './storage.js';
import { hostViaMailbox, joinViaMailbox, manualOffer, manualAnswer, signalSupported, newPeerId, stunSetting, setStunSetting, DEFAULT_STUN, rtcStatus } from './collab-net.js';
import { log, registerContext } from './log.js';
import { beforeRisky } from './versions-ui.js';
import { addOverlay, onUiAction, schedulePosition } from './canvas.js';
import { findNode } from '../core/tree.js';
import { nodeLabel } from '../core/editing.js';
import { __, __n, N_ } from '../core/ui-i18n.js';
import { assets } from './assets.js';

let identity = null;
let session = null;
const presence = new Map();
/* Libellés en français (N_) : gardés tels quels dans le contexte du journal, traduits à l'affichage avec roleLabel */
const ROLE_LABEL = { owner: N_('hôte'), editor: N_('éditeur'), reviewer: N_('relecteur') };
const roleLabel = r => (ROLE_LABEL[r] ? __(ROLE_LABEL[r]) : r || '');
const hostLabel = () => session?.hostName || __('l’hôte');
const short = id => String(id || '').slice(0, 8);

/* ---------- Identité ---------- */
export async function ensureIdentity(name) {
  if (!identity) {
    const saved = await getSecret('identity').catch(e => { log.warn('collab.identity.unreadable', __('Clé personnelle illisible (stockage indisponible)'), { error: e }); return null; });
    if (saved) {
      try { identity = await importIdentity(JSON.parse(saved)); log.debug('collab.identity.load', __('Clé personnelle chargée : {name}', { name: identity.name }), { fp: identity.fp }); }
      catch (e) { identity = null; log.warn('collab.identity.invalid', __('Clé personnelle enregistrée illisible : une nouvelle sera créée (les anciens commentaires restent signés par l’ancienne)'), { error: e }); }
    }
  }
  if (!identity && name !== undefined) { identity = await createIdentity(name); log.info('collab.identity.new', __('Clé personnelle créée pour {name}', { name: identity.name }), { fp: identity.fp, did: identity.did.slice(0, 24) }); }
  if (identity && name !== undefined && name.trim() && name.trim() !== identity.name) { const before = identity.name; identity = renameIdentity(identity, name); log.info('collab.identity.rename', __('Nom changé : {before} → {name}', { before, name: identity.name }), { fp: identity.fp }); }
  if (identity) await setSecret('identity', JSON.stringify(await exportIdentity(identity))).catch(e => log.warn('collab.identity.unsaved', __('Clé personnelle non enregistrée sur cet appareil (stockage indisponible) : elle sera perdue au rechargement'), { error: e }));
  return identity;
}
export const currentIdentity = () => identity;
export const sessionRole = () => session?.role || null;
export const inSession = () => !!session;

/* ---------- Session ---------- */
function pushLocal() {
  if (!session?.node || session.node.replica.doc === null) return;
  session.node.local(state.site);
  saveState();
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!session) return;
    const r = session.node.replica;
    setSecret('collab-session', JSON.stringify({ role: session.role, secret: session.secret, invite: session.invite || null, peerId: session.peerId, docId: r.docId, signal: session.signal, hostName: session.hostName, table: r.table() }))
      .then(() => log.trace('collab.save', __('État de la session enregistré (reprise après rechargement)'), { docId: r.docId }))
      .catch(e => log.warn('collab.save-fail', __('État de la session non enregistré : la reprise après un rechargement ne sera pas possible'), { error: e }));
  }, 800);
}

function presenceNow() {
  const t = state.editTarget;
  return { pageId: state.pageId, selected: state.selected, edit: t ? `${t.kind}:${t.id || ''}` : '' };
}

/* Cycle 25 : tout projet ou texte reçu d'un pair est assaini ; un projet complet invalide est refusé avant d'être chargé */
const sanitizeDoc = doc => { const r = sanitizeSiteTexts(doc); return { doc: r.site, changed: r.changed }; };
const validateDoc = doc => validateSite(normalizeSite(doc));

/* Octets d'une image reçus d'un pair (cycle 27) : le canevas est redessiné une fois les images arrivées */
let assetTimer = 0;
function assetArrived() {
  clearTimeout(assetTimer);
  assetTimer = setTimeout(() => emit('doc', { source: 'remote', assets: true }), 60);
}

function makeNode({ role, secret, roomId, invite, replica }) {
  return new CollabNode({
    identity, role, secret, roomId, invite, replica, log, sanitizeDoc, validateDoc, assets,
    onAsset: assetArrived,
    onRemote: (doc, ops, info) => {
      if (info?.snapshot) {
        load(doc);
        state.past = [];
        state.future = [];
        state.readOnly = session?.role === 'reviewer';
        document.body.classList.toggle('is-readonly', state.readOnly);
        emit('view', { reload: true });
        toast(state.readOnly ? __('Projet reçu de {name} — mode relecture : commentez avec 💬.', { name: hostLabel() }) : __('Projet reçu de {name}.', { name: hostLabel() }));
      } else applyRemote(doc, ops);
      saveState();
      renderPeers();
    },
    onError: msg => { toast(msg, 'error'); setStatus(msg, 'error'); },
    onPeers: () => {
      if (session && session.role !== 'owner' && !session.leaving) {
        const up = session.node.peers().some(p => p.authed);
        if (up) session.wasConnected = true;
        else if (session.wasConnected) { session.wasConnected = false; log.warn('collab.host-lost', __('Connexion avec {name} interrompue : modifications gardées, rouvre le lien d’invitation pour les fusionner', { name: hostLabel() }), { role: session.role }); toast(__('Connexion avec l’hôte interrompue. Rouvrez le lien d’invitation pour reprendre : vos modifications sont gardées et seront fusionnées.'), 'error'); }
      }
      renderPeers();
      renderDialog();
    },
    onPresence: (fp, p) => { if (p) presence.set(fp, p); else presence.delete(fp); renderPeers(); emit('presence', {}); schedulePosition(); /* redessine les cadres des autres tout de suite */ }
  });
}

async function hostLinks() {
  session.links = {};
  const base = `${location.origin}${location.pathname}`;
  for (const role of ['editor', 'reviewer']) session.links[role] = `${base}#${joinFragment(session.secret, await createInvite(identity, { secret: session.secret, role, hostPeer: session.peerId, signal: session.signal }))}`;
  log.debug('collab.invite.create', __('Liens d’invitation créés (éditeur et relecteur, valables 7 jours)'), { roles: Object.keys(session.links), days: 7, via: session.signal ? 'boîte aux lettres' : 'codes', chars: session.links.editor.length });
}

export async function startSession({ resume = null } = {}) {
  if (!identity) { log.warn('collab.no-identity', __('Session impossible : indique d’abord ton nom')); throw new Error(__('Indiquez d’abord votre nom.')); }
  if (session?.offline && session.role === 'owner') {
    const f = log.flow('collab.resume', __('Reprise de la session interrompue (hôte)'), { room: short(session.roomId), docId: session.node.replica.docId });
    try {
      const url = state.site.publish?.url || '';
      session.signal = url && await signalSupported(url) ? url : '';
      session.offline = false;
      if (session.signal) session.hosting = hostViaMailbox({ url: session.signal, roomId: session.roomId, peerId: session.peerId, secret: session.secret, onLink: l => session?.node.connect(l), onError: () => {} });
      await hostLinks();
      saveState();
      session.node.setPresence(presenceNow());
      renderPeers();
      f.ok(__('Session reprise : les invités peuvent se reconnecter avec les mêmes liens'), { via: session.signal ? 'boîte aux lettres' : 'codes' });
      return session;
    } catch (e) { f.fail(e); throw e; }
  }
  if (session) { log.debug('collab.host.already', __('Session déjà ouverte'), { role: session.role }); return session; }
  const f = log.flow('collab.host', __('Ouverture d’une session de collaboration'), { name: identity.name, fp: identity.fp, resume: !!resume });
  try {
    const room = resume ? { secret: resume.secret } : createRoom();
    const roomId = await roomIdOf(room.secret);
    const peerId = resume?.peerId || newPeerId();
    const docId = resume?.docId || `doc_${newPeerId()}`;
    const replica = createReplica({ replica: `${identity.fp.slice(0, 6)}${peerId.slice(0, 4)}`, doc: state.site, docId, table: resume?.table || {} });
    const url = state.site.publish?.url || '';
    const signal = url && await signalSupported(url) ? url : '';
    f.step('signal', signal ? __('Mise en relation par la boîte aux lettres de publish.php') : url ? __('publish.php ne sert pas de boîte aux lettres : mise en relation par codes') : __('Pas d’adresse publish.php (onglet Publier) : mise en relation par codes'), { via: signal ? 'boîte aux lettres' : 'codes', url: url || undefined }, 'info');
    session = { role: 'owner', secret: room.secret, roomId, peerId, signal, hostName: identity.name };
    session.node = makeNode({ role: 'owner', secret: room.secret, roomId, replica });
    if (signal) session.hosting = hostViaMailbox({ url: signal, roomId, peerId, secret: room.secret, onLink: l => session?.node.connect(l), onError: () => {} });
    await hostLinks();
    saveState();
    session.node.setPresence(presenceNow());
    renderPeers();
    f.ok(__('Session ouverte : envoie un lien d’invitation'), { room: short(roomId), peer: peerId, docId, via: signal ? 'boîte aux lettres' : 'codes', stun: stunSetting() || 'aucun' });
    return session;
  } catch (e) { f.fail(e); throw e; }
}

export async function joinSession({ secret, invite }, { manual = null } = {}) {
  if (!identity) { log.warn('collab.no-identity', __('Session impossible : indique d’abord ton nom')); throw new Error(__('Indiquez d’abord votre nom.')); }
  const f = log.flow('collab.join', __('Rejoindre une session'), { name: identity.name, fp: identity.fp, via: manual ? 'codes' : 'boîte aux lettres' });
  try {
    const roomId = await roomIdOf(secret);
    const v = await verifyInvite(invite, { roomId });
    if (!v.ok) throw new Error(__(v.error));
    f.step('invite', __('Invitation valable : {name} invite comme {role}', { name: v.ownerName, role: roleLabel(v.role) }), { role: v.role, owner: v.ownerName, host: v.hostPeer, signal: v.signal || 'aucune (codes)', hours: Math.round((v.exp - Date.now()) / 3600000) });
    if (session && session.secret === secret && session.role !== 'owner') {
      f.step('rejoin', __('Même session qu’avant : reconnexion, les modifications faites entre-temps seront fusionnées'), { docId: session.node.replica.docId }, 'info');
      session.offline = false;
      session.invite = invite;
      if (manual) { f.ok(__('Prêt pour l’échange de codes')); return session; }
      const link = await joinViaMailbox({ url: v.signal, roomId, peerId: session.peerId, secret, hostPeer: v.hostPeer });
      session.node.connect(link);
      session.node.setPresence(presenceNow());
      f.ok(__('Reconnecté·e : vérification des identités puis reprise'), { role: v.role });
      return session;
    }
    if (session) stopSession();
    const saved = JSON.parse(await getSecret('collab-session').catch(e => { log.warn('collab.restore-unreadable', __('État de session enregistré illisible'), { error: e }); return null; }) || 'null');
    const resume = saved && saved.secret === secret && saved.docId ? saved : null;
    if (resume) f.step('resume', __('Session déjà suivie sur cet appareil : reprise sans recopier le projet'), { docId: resume.docId }, 'info');
    else { await beforeRisky(__('Avant de rejoindre une session de collaboration')); f.step('backup', __('Projet actuel enregistré dans les versions avant de recevoir celui de l’hôte')); }
    const peerId = resume?.peerId || newPeerId();
    const replica = createReplica({ replica: `${identity.fp.slice(0, 6)}${peerId.slice(0, 4)}`, doc: resume ? state.site : null, docId: resume?.docId || null, table: resume?.table || {} });
    session = { role: v.role, secret, roomId, peerId, invite, signal: v.signal, hostName: v.ownerName };
    session.node = makeNode({ role: v.role, secret, roomId, invite, replica });
    state.readOnly = v.role === 'reviewer';
    document.body.classList.toggle('is-readonly', state.readOnly);
    if (state.readOnly) log.info('collab.readonly', __('Mode relecture : parcourir et commenter seulement'), { role: v.role });
    saveState();
    if (manual) { f.ok(__('Session prête : échange de codes à faire'), { role: v.role, room: short(roomId) }); return session; }
    const link = await joinViaMailbox({ url: v.signal, roomId, peerId, secret, hostPeer: v.hostPeer });
    session.node.connect(link);
    session.node.setPresence(presenceNow());
    f.ok(__('Connecté·e à l’hôte : vérification des identités puis réception du projet'), { role: v.role, room: short(roomId) });
    return session;
  } catch (e) { f.fail(e); throw e; }
}

export function stopSession() {
  if (!session) return;
  log.info('collab.leave', session.role === 'owner' ? __('Session fermée par l’hôte') : __('Session quittée'), { role: session.role, peers: session.node.peers().filter(p => p.authed).length, room: short(session.roomId) });
  session.leaving = true;
  session.hosting?.stop();
  session.node.close();
  session = null;
  presence.clear();
  state.readOnly = false;
  document.body.classList.remove('is-readonly');
  setSecret('collab-session', '').catch(e => log.warn('collab.save-fail', __('État de la session non effacé (stockage indisponible)'), { error: e }));
  renderPeers();
  emit('presence', {});
  emit('doc', { source: 'history' });
}

export function peersOn(nodeId) {
  return [...presence.values()].filter(p => p.selected === nodeId && p.pageId === state.pageId);
}

/* ---------- Barre du haut : pastilles des participants ---------- */
function initials(name) { return String(name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

function renderPeers() {
  const box = $('#peers');
  if (!box) return;
  $('#collabBtn')?.classList.toggle('is-live', !!session);
  if (!session) { box.replaceChildren(); return; }
  const people = session.node.peers().filter(p => p.authed);
  box.replaceChildren(...people.map(p => {
    const pr = presence.get(p.fp);
    return h('button', { type: 'button', class: 'peer', 'data-peer': p.fp, style: { background: p.color }, title: pr ? __('{name} ({role}) — cliquer pour aller où il·elle travaille', { name: p.name, role: roleLabel(p.role) }) : `${p.name} (${roleLabel(p.role)})`, 'aria-label': `${p.name}, ${roleLabel(p.role)}`, onclick: () => {
      if (!pr) return;
      if (pr.pageId && pr.pageId !== state.pageId && state.site.pages.some(x => x.id === pr.pageId)) setView({ pageId: pr.pageId });
      if (pr.selected) setTimeout(() => select(pr.selected, { scroll: true }), 300);
    } }, initials(p.name));
  }));
  if (state.readOnly) box.append(h('span', { class: 'readonly-pill', title: __('Vous pouvez parcourir les pages et commenter (💬).') }, __('Mode relecture')));
}

/* ---------- Calque de présence dans le canevas ---------- */
function presenceOverlay({ doc, ui, nodeElement }) {
  const mine = presenceNow().edit;
  const list = [...presence.entries()].filter(([, p]) => p.pageId === state.pageId && (p.edit || '') === mine && p.selected);
  const boxes = [...ui.querySelectorAll('.ab--peer')];
  while (boxes.length < list.length) {
    const b = doc.createElement('div');
    b.className = 'ab ab--peer';
    b.innerHTML = '<span class="ab__label"></span>';
    ui.append(b);
    boxes.push(b);
  }
  boxes.forEach((b, i) => {
    const entry = list[i];
    const el = entry && nodeElement(entry[1].selected);
    if (!el) { b.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    Object.assign(b.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    b.style.setProperty('--peer', entry[1].color || colorFor(entry[0]));
    b.dataset.peer = entry[0];
    b.querySelector('.ab__label').textContent = entry[1].name || '';
  });
}

/* ---------- Fenêtre « Collaborer » ---------- */
let statusText = '';
function setStatus(text, kind = '') {
  statusText = text;
  const el = $('#collabDialog [data-collab-status]');
  if (el) { el.textContent = text; el.className = `pub-status${kind ? ` is-${kind}` : ''}`; }
}

const copyBtn = (input, attr) => h('button', { type: 'button', class: 'btn btn--small', [attr]: '', onclick: async () => {
  input.select();
  try { await navigator.clipboard.writeText(input.value); log.info('collab.invite.copy', __('Lien d’invitation copié'), { what: attr }); toast(__('Lien copié.')); }
  catch (e) { log.warn('collab.invite.copy-fail', __('Presse-papiers refusé : lien sélectionné, à copier avec Ctrl+C'), { what: attr, error: e }); document.execCommand?.('copy'); toast(__('Lien sélectionné : copiez-le (Ctrl+C).')); }
} }, __('Copier'));

function renderDialog() {
  const d = $('#collabDialog');
  if (!d) return;
  const body = d.querySelector('[data-collab-body]');
  const name = h('input', { class: 'input', type: 'text', value: identity?.name || '', placeholder: __('ex. Laurent'), 'data-collab-name': '', 'aria-label': __('Votre nom'), maxlength: 40 });
  name.addEventListener('change', async () => { await ensureIdentity(name.value); renderDialog(); });
  const idLine = identity ? h('p', { class: 'hint', title: identity.did }, __('Votre clé : {fp} · {did}… (créée dans ce navigateur, jamais envoyée)', { fp: identity.fp, did: identity.did.slice(0, 24) })) : h('p', { class: 'hint' }, __('Une clé personnelle sera créée dans ce navigateur pour signer vos commentaires.'));
  const parts = [h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Votre nom (vu par les autres)')), name, idLine)];
  if (session?.offline) {
    parts.push(
      h('p', {}, session.role === 'owner' ? __('Votre session a été interrompue (page rechargée). Reprenez-la : les invités pourront se reconnecter avec les mêmes liens, et les modifications faites entre-temps seront fusionnées.') : __('Session de {name} interrompue. Vos modifications sont gardées : rouvrez le lien d’invitation pour vous reconnecter et les fusionner.', { name: hostLabel() })),
      h('div', { class: 'row-btns' },
        session.role === 'owner' ? h('button', { type: 'button', class: 'btn btn--primary', 'data-collab-resume': '', onclick: async () => { await startSession(); renderDialog(); } }, __('Reprendre la session')) : null,
        h('button', { type: 'button', class: 'btn is-danger', 'data-collab-stop': '', onclick: () => { stopSession(); renderDialog(); } }, session.role === 'owner' ? __('Fermer la session') : __('Quitter la session'))));
  } else if (!session) {
    const stun = h('input', { class: 'input input--sm', type: 'text', value: stunSetting(), placeholder: DEFAULT_STUN, 'data-collab-stun': '', spellcheck: 'false', 'aria-label': __('Serveur STUN') });
    stun.addEventListener('change', () => setStunSetting(stun.value));
    const url = state.site.publish?.url;
    parts.push(
      h('p', {}, __('Ouvrez une session pour travailler à plusieurs sur ce projet : chacun voit les modifications des autres en direct, les relecteurs commentent sans rien modifier. Les données passent directement d’un navigateur à l’autre, chiffrées.')),
      h('p', { class: 'hint' }, url ? __('Mise en relation par votre publish.php ({url}) : messages chiffrés, effacés après 15 minutes.', { url }) : __('Sans publish.php (onglet Publier), la mise en relation se fait par deux codes à copier-coller (e-mail, messagerie…).')),
      h('details', { class: 'collab-adv' }, h('summary', {}, __('Réglage réseau')), h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Serveur STUN (aide à traverser les box internet ; vide = réseau local seulement)')), stun)),
      h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--primary', 'data-collab-start': '', disabled: !identity, onclick: async e => {
        e.currentTarget.disabled = true;
        try { await startSession(); setStatus(__('Session ouverte : envoyez un lien d’invitation.'), 'ok'); } catch (err) { toast(err.message, 'error'); /* déjà journalisé : collab.host.fail ou collab.no-identity */ }
        renderDialog();
      } }, __('👥 Démarrer une session'))));
  } else if (session.role === 'owner') {
    const linkRow = role => {
      const input = h('input', { class: 'input input--mono input--sm', type: 'text', readonly: true, value: session.links[role], 'data-invite': role, 'aria-label': __('Lien d’invitation {role}', { role: roleLabel(role) }) });
      return h('div', { class: 'field' }, h('span', { class: 'field__label' }, role === 'editor' ? __('✎ Invitation éditeur (peut tout modifier)') : __('💬 Invitation relecteur (commente seulement)')), h('div', { class: 'add-page' }, input, copyBtn(input, `data-copy-${role}`)));
    };
    const offer = h('textarea', { class: 'input input--mono', rows: 3, placeholder: __('Collez ici le code de connexion reçu d’un invité'), 'data-manual-offer': '', 'aria-label': __('Code de connexion reçu') });
    const answer = h('textarea', { class: 'input input--mono', rows: 3, readonly: true, 'data-manual-answer': '', 'aria-label': __('Code de réponse à renvoyer'), placeholder: __('Le code de réponse apparaîtra ici') });
    const accept = async () => {
      try {
        answer.value = await manualAnswer({ secret: session.secret, offerCode: offer.value, onLink: l => session?.node.connect(l), onError: err => toast(err.message, 'error') });
        answer.select();
        setStatus(__('Renvoyez ce code de réponse à l’invité ; la connexion s’établit dès qu’il le colle.'), 'ok');
      } catch (err) { toast(__('Code non reconnu : {error}', { error: err.message }), 'error'); /* déjà journalisé : rtc.manual-answer.fail */ }
    };
    const peers = session.node.peers().filter(p => p.authed);
    parts.push(
      linkRow('editor'), linkRow('reviewer'),
      h('p', { class: 'hint' }, session.signal ? __('Les liens restent valables 7 jours. Ils contiennent la clé de la session : envoyez-les seulement aux personnes concernées.') : __('Les liens restent valables 7 jours. Ils contiennent la clé de la session : envoyez-les seulement aux personnes concernées. Sans publish.php, l’invité vous enverra un code de connexion à coller ci-dessous.')),
      h('details', { class: 'collab-adv', open: !session.signal }, h('summary', {}, __('Connexion par codes (sans serveur)')),
        offer, h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small', 'data-manual-accept': '', onclick: accept }, __('Créer le code de réponse'))), answer),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Participants ({n})', { n: peers.length })),
        h('ul', { class: 'peer-list', 'data-collab-peers': '' }, peers.length ? peers.map(p => h('li', {}, h('span', { class: 'peer peer--sm', style: { background: p.color } }, initials(p.name)), ` ${p.name} · ${roleLabel(p.role)} · `, h('code', {}, p.fp))) : h('li', { class: 'hint' }, __('Personne pour l’instant.')))),
      h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn is-danger', 'data-collab-stop': '', onclick: () => { stopSession(); setStatus(__('Session fermée.')); renderDialog(); } }, __('Fermer la session'))));
  } else {
    const host = session.node.peers().find(p => p.role === 'owner' && p.authed);
    parts.push(
      h('p', {}, host ? __('Connecté·e à la session de {name}, comme {role}.', { name: host.name, role: roleLabel(session.role) }) : __('Session de {name} : connexion en cours ou interrompue.', { name: session.hostName })),
      h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn is-danger', 'data-collab-stop': '', onclick: () => { stopSession(); setStatus(__('Vous avez quitté la session.')); renderDialog(); } }, __('Quitter la session'))));
  }
  parts.push(h('p', { class: 'pub-status', 'data-collab-status': '', role: 'status' }, statusText));
  body.replaceChildren(...parts);
}

export async function openCollab() {
  await ensureIdentity();
  log.info('collab.open', __('Fenêtre « Travailler à plusieurs »'), { state: !session ? 'aucune session' : session.offline ? 'interrompue' : session.role, peers: session ? session.node.peers().filter(p => p.authed).length : 0, identity: !!identity, publish: state.site.publish?.url ? 'oui' : 'non' });
  $('#collabDialog')?.remove();
  const d = openDialog({ id: 'collabDialog',
    className: 'collab',
    titleId: 'collabTitle',
    title: __('👥 Travailler à plusieurs'),
    body: [h('div', { class: 'a11y-form', 'data-collab-body': '' })],
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))] });
  renderDialog();
}

/* ---------- Rejoindre (lien #join=…) ---------- */
export async function openJoin(join) {
  await ensureIdentity();
  const v = await verifyInvite(join.invite, { roomId: await roomIdOf(join.secret) });
  if (v.ok) log.info('collab.invite.open', __('Invitation de {name} : {role}', { name: v.ownerName, role: roleLabel(v.role) }), { role: v.role, owner: v.ownerName, ownerFp: v.ownerFp, via: v.signal ? 'boîte aux lettres' : 'codes', signal: v.signal || undefined, hours: Math.round((v.exp - Date.now()) / 3600000) });
  else log.warn('collab.invite.invalid', __('Invitation refusée : {reason}', { reason: __(v.error) }), { reason: v.error });
  $('#joinDialog')?.remove();
  const name = h('input', { class: 'input', type: 'text', value: identity?.name || '', placeholder: __('Votre nom'), 'data-join-name': '', 'aria-label': __('Votre nom'), maxlength: 40 });
  const status = h('p', { class: 'pub-status', 'data-join-status': '', role: 'status' }, v.ok ? '' : __(v.error));
  const area = h('div', { class: 'join-manual' });
  const go = h('button', { type: 'button', class: 'btn btn--primary', 'data-join-go': '', disabled: !v.ok, onclick: async () => {
    if (!name.value.trim()) { log.warn('collab.join.no-name', __('Rejoindre : nom manquant')); name.focus(); status.textContent = __('Indiquez votre nom.'); return; }
    go.disabled = true;
    await ensureIdentity(name.value);
    try {
      if (v.signal) {
        status.textContent = __('Connexion directe en cours…');
        await joinSession(join);
        status.textContent = __('Connecté·e : réception du projet…');
        setTimeout(() => d.close(), 600);
      } else {
        await joinSession(join, { manual: true });
        const off = await manualOffer({ secret: join.secret, peerId: session.peerId });
        const code = h('textarea', { class: 'input input--mono', rows: 3, readonly: true, 'data-join-offer': '', 'aria-label': __('Votre code de connexion') });
        code.value = off.code;
        const ans = h('textarea', { class: 'input input--mono', rows: 3, 'data-join-answer': '', 'aria-label': __('Code de réponse reçu'), placeholder: __('Collez ici le code de réponse') });
        area.replaceChildren(
          h('p', {}, __('1. Envoyez ce code à {name} (e-mail, messagerie) :', { name: v.ownerName })), code,
          h('p', {}, __('2. Collez ici le code de réponse reçu :')), ans,
          h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--primary', 'data-join-finish': '', onclick: async () => {
            try { const link = await off.finish(ans.value); session.node.connect(link); session.node.setPresence(presenceNow()); status.textContent = __('Connecté·e : réception du projet…'); setTimeout(() => d.close(), 600); }
            catch (err) { status.textContent = __('Échec : {error}', { error: err.message }); /* déjà journalisé : rtc.manual-finish.fail */ }
          } }, __('Se connecter'))));
        code.select();
      }
    } catch (err) { status.textContent = __('Échec de la connexion : {error}', { error: err.message }); go.disabled = false; /* déjà journalisé : collab.join.fail ou rtc.manual-offer.fail */ }
  } }, __('Rejoindre'));
  const d = openDialog({ id: 'joinDialog',
    className: 'collab',
    titleId: 'joinTitle',
    title: __('👥 Rejoindre une session'),
    body: [h('div', { class: 'a11y-form' },
      v.ok ? h('p', {}, v.role === 'reviewer' ? __('{name} vous invite à relire et commenter le site, en direct, de navigateur à navigateur.', { name: v.ownerName }) : __('{name} vous invite à modifier le site, en direct, de navigateur à navigateur.', { name: v.ownerName })) : null,
      v.ok ? h('p', { class: 'hint' }, __('Rôle : {role}. Votre projet actuel est d’abord enregistré dans les versions (Fichier → Versions).', { role: roleLabel(v.role) })) : null,
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, __('Votre nom')), name),
      area, status)],
    actions: [h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Annuler')),
    go] });
  name.focus();
}

/* Session gardée après un rechargement : les modifications faites hors ligne restent suivies */
async function restoreSaved() {
  const saved = JSON.parse(await getSecret('collab-session').catch(e => { log.warn('collab.restore-unreadable', __('État de session enregistré illisible'), { error: e }); return null; }) || 'null');
  if (!saved?.secret || !saved.docId) return;
  await ensureIdentity();
  if (!identity) { log.warn('collab.restore-no-identity', __('Session enregistrée, mais clé personnelle absente : reprise impossible'), { role: saved.role }); return; }
  const roomId = await roomIdOf(saved.secret);
  const replica = createReplica({ replica: `${identity.fp.slice(0, 6)}${saved.peerId.slice(0, 4)}`, doc: state.site, docId: saved.docId, table: saved.table || {} });
  session = { role: saved.role, secret: saved.secret, roomId, peerId: saved.peerId, invite: saved.invite, signal: saved.signal || '', hostName: saved.hostName || '', offline: true };
  session.node = makeNode({ role: saved.role, secret: saved.secret, roomId, invite: saved.invite, replica });
  state.readOnly = saved.role === 'reviewer';
  document.body.classList.toggle('is-readonly', state.readOnly);
  log.info('collab.restore', saved.role === 'owner' ? __('Session interrompue retrouvée ({role}) : reprends-la dans 👥', { role: roleLabel(saved.role) }) : __('Session interrompue retrouvée ({role}) : rouvre le lien d’invitation pour te reconnecter', { role: roleLabel(saved.role) }), { role: saved.role, docId: saved.docId, host: saved.hostName, via: saved.signal ? 'boîte aux lettres' : 'codes' });
  renderPeers();
}

/* ---------- Démarrage ---------- */
export function initCollab() {
  subscribe((reason, opts) => {
    if (!session) return;
    if (reason === 'doc' && opts.source !== 'remote') pushLocal();
    if (reason === 'selection' || reason === 'view') session.node.setPresence(presenceNow());
  });
  addOverlay(presenceOverlay);
  onUiAction(() => {});
  const join = parseJoin(location.hash);
  if (join) { log.info('collab.join.link', __('Lien d’invitation ouvert')); history.replaceState(null, '', location.pathname + location.search); }
  else if (/[#&]join=/.test(location.hash)) log.warn('collab.join.bad-link', __('Lien d’invitation incomplet ou abîmé (copie coupée ?)'), { chars: location.hash.length });
  restoreSaved().catch(e => log.warn('collab.restore-fail', __('Reprise de la session enregistrée impossible : {error}', { error: e.message }), { error: e })).finally(() => { if (join) setTimeout(() => openJoin(join), 200); });
  window.addEventListener('hashchange', () => {
    const j = parseJoin(location.hash);
    if (!j) return;
    log.info('collab.join.link', __('Lien d’invitation ouvert'));
    history.replaceState(null, '', location.pathname + location.search);
    openJoin(j);
  });
  registerContext('collaboration', () => {
    if (!session) return { session: 'aucune', stun: stunSetting() || 'aucun', identité: identity ? identity.fp : 'aucune' };
    const ps = session.node.peers();
    return {
      rôle: ROLE_LABEL[session.role] || session.role, état: session.offline ? 'interrompue' : 'ouverte', salle: short(session.roomId), participant: session.peerId, identité: identity?.fp,
      miseEnRelation: session.signal ? `boîte aux lettres ${session.signal}` : 'codes à copier-coller', stun: stunSetting() || 'aucun',
      pairs: ps.length, vérifiés: ps.filter(p => p.authed).length, participants: ps.map(p => `${p.name} (${ROLE_LABEL[p.role] || p.role}${p.authed ? '' : ', non vérifié'})`),
      liens: rtcStatus(), document: session.node.replica.docId, relecture: !!state.readOnly
    };
  });
  window.__collab = { get session() { return session; }, presence, peersOn };
}

export function presenceLabel(nodeId) {
  const ps = peersOn(nodeId);
  if (!ps.length) return '';
  const node = findNode(state.site.pages.find(p => p.id === state.pageId)?.root || {}, nodeId);
  const names = ps.map(p => p.name).join(', ');
  return node ? __n(ps.length, '{names} travaille aussi sur « {label} ».', '{names} travaillent aussi sur « {label} ».', { names, label: nodeLabel(node) }) : __n(ps.length, '{names} travaille aussi sur cet élément.', '{names} travaillent aussi sur cet élément.', { names });
}
