/* Commentaires : panneau, pastilles dans la page, signatures vérifiées. Fonctionne avec ou sans session. */
import { h, $, toast, icon } from './dom.js';
import { state, subscribe, commit, select, setView, nodeById, setEditTarget } from './store.js';
import { makeComment, verifyComment, addComment, addReply, setResolved, removeComment, removeReply, listComments, openCount } from '../core/review.js';
import { findNode } from '../core/tree.js';
import { nodeLabel, nodeSummary } from '../core/editing.js';
import { translate } from '../core/render.js';
import { colorFor } from '../core/collab-protocol.js';
import { ensureIdentity, currentIdentity, sessionRole, inSession } from './collab-ui.js';
import { addOverlay, onUiAction, schedulePosition } from './canvas.js';
import { log } from './log.js';
import { openReviewSummary } from './smart-ui.js';
import { __, __n, N_, fmtDate } from '../core/ui-i18n.js';

let open = false;
let filter = 'page';
let active = null;
const verified = new Map();

const where = () => (state.editTarget ? `${state.editTarget.kind}:${state.editTarget.id || ''}` : '');

/* « what » reste en français dans les données du journal ; le message est une phrase complète par opération */
const APPLY_FAIL = {
  ajout: N_('Commentaires : ajout impossible ({error})'),
  réponse: N_('Commentaires : réponse impossible ({error})'),
  suppression: N_('Commentaires : suppression impossible ({error})'),
  'suppression de la réponse': N_('Commentaires : suppression de la réponse impossible ({error})'),
  résolution: N_('Commentaires : résolution impossible ({error})'),
  réouverture: N_('Commentaires : réouverture impossible ({error})')
};
function apply(fn, what = '') {
  try { commit(fn(state.site), { source: 'review' }); return true; } catch (e) { log.warn('review.apply-fail', __(APPLY_FAIL[what] || N_('Commentaires : opération impossible ({error})'), { error: e.message }), { what, error: e }); toast(e.message, 'error'); return false; }
}

/* Clé du cache : la signature ET le contenu signé (un commentaire modifié après coup doit être revérifié) */
const sigKey = c => JSON.stringify([c.sig, c.id, c.parentId || null, c.anchor, c.text, c.author?.name, c.author?.fp, c.at]);

function sigBadge(c) {
  const el = h('span', { class: 'sig', 'data-sig': '' }, '…');
  const key = sigKey(c);
  const set = ok => { el.textContent = ok ? __('✓ signé') : __('⚠ signature invalide'); el.className = `sig ${ok ? 'is-ok' : 'is-bad'}`; el.title = ok ? __('Signé par la clé {fp}', { fp: c.author.fp }) : __('Le texte ou l’auteur ne correspondent pas à la signature'); };
  if (verified.has(key)) set(verified.get(key));
  else verifyComment(c).then(ok => {
    if (!verified.has(key)) {
      if (ok) log.debug('review.sig.ok', __('Signature vérifiée : {name}', { name: c.author?.name }), { id: c.id, fp: c.author?.fp, reply: !!c.parentId });
      else log.warn('review.sig.bad', c.parentId ? __('Signature invalide : le texte ou l’auteur de cette réponse ne correspondent pas à la signature (modifiée après coup ?)') : __('Signature invalide : le texte ou l’auteur de ce commentaire ne correspondent pas à la signature (modifié après coup ?)'), { id: c.id, author: c.author?.name, fp: c.author?.fp, reply: !!c.parentId });
    }
    verified.set(key, ok);
    set(ok);
  });
  return el;
}

const fmt = iso => { try { return fmtDate(new Date(iso), { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; } };

function canDelete(c) {
  const me = currentIdentity();
  return !inSession() || ['owner', 'editor'].includes(sessionRole()) || (me && c.author?.fp === me.fp);
}

function anchorText(c) {
  const page = state.site.pages.find(p => p.id === c.anchor?.pageId);
  const pname = page ? translate(state.site, page.title, state.site.defaultLanguage) : '';
  const label = c.anchor?.label || __('Élément');
  const target = c.anchor?.where ? __('{label} (modèle)', { label }) : label;
  return `${filter === 'all' && pname ? `${pname} · ` : ''}${target}`;
}

/* Depuis le résumé de la relecture */
export function goToComment(id) {
  const c = state.site.review?.comments?.[id];
  if (!c) { log.warn('review.goto-missing', __('Commentaire introuvable (supprimé entre-temps ?)'), { id }); return; }
  if (!open) toggle(true);
  goTo(c);
}

function goTo(c) {
  const a = c.anchor || {};
  log.debug('review.goto', __('Aller à l’élément commenté'), { id: c.id, page: a.pageId, node: a.nodeId, where: a.where || undefined, found: !!state.site.pages.some(p => p.id === a.pageId) });
  if (a.pageId && a.pageId !== state.pageId && state.site.pages.some(p => p.id === a.pageId)) setView({ pageId: a.pageId });
  if (a.where && where() !== a.where) {
    const [kind, id] = a.where.split(':');
    setEditTarget({ kind, ...(id ? { id } : {}) });
  } else if (!a.where && state.editTarget) setEditTarget(null);
  setTimeout(() => { if (nodeById(a.nodeId)) select(a.nodeId, { scroll: true }); active = c.id; render(); schedulePosition(); }, 250);
}

function commentItem(c, n) {
  const reply = h('textarea', { class: 'input', rows: 2, placeholder: __('Répondre…'), 'data-reply-text': c.id, 'aria-label': __('Répondre au commentaire') });
  const sendReply = async () => {
    const me = await needIdentity();
    if (!me) return;
    try {
      const r = await makeComment(me, { anchor: c.anchor, text: reply.value, parentId: c.id });
      if (apply(s => addReply(s, c.id, r), 'réponse')) { log.info('review.reply', __('Réponse ajoutée et signée par {name}', { name: me.name }), { comment: c.id, id: r.id, chars: r.text.length, role: sessionRole() || 'seul' }); reply.value = ''; render(); }
    } catch (e) { log.warn('review.reply-refused', __('Réponse refusée : {error}', { error: e.message }), { comment: c.id, error: e }); toast(e.message, 'error'); }
  };
  reply.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendReply(); } });
  return h('li', { class: `cm${c.resolved ? ' is-resolved' : ''}${active === c.id ? ' is-active' : ''}`, 'data-comment': c.id },
    h('div', { class: 'cm__head' },
      h('span', { class: 'cm__num' }, String(n)),
      h('span', { class: 'cm__dot', style: { background: colorFor(c.author?.fp) } }),
      h('strong', {}, c.author?.name || __('Anonyme')),
      sigBadge(c),
      h('span', { class: 'cm__date' }, fmt(c.at))),
    h('button', { type: 'button', class: 'cm__anchor', 'data-comment-go': c.id, title: __('Aller à l’élément'), onclick: () => goTo(c) }, `↳ ${anchorText(c)}`),
    h('p', { class: 'cm__text' }, c.text),
    (c.replies || []).length ? h('ul', { class: 'cm__replies' }, c.replies.map(r => h('li', { class: 'cm__reply', 'data-reply': r.id },
      h('div', { class: 'cm__head' }, h('span', { class: 'cm__dot', style: { background: colorFor(r.author?.fp) } }), h('strong', {}, r.author?.name || __('Anonyme')), sigBadge(r), h('span', { class: 'cm__date' }, fmt(r.at)),
        canDelete(r) ? h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': __('Supprimer la réponse'), onclick: () => { if (apply(s => removeReply(s, c.id, r.id), 'suppression de la réponse')) { log.info('review.reply.delete', __('Réponse supprimée'), { comment: c.id, id: r.id }); render(); } } }, '✕') : null),
      h('p', { class: 'cm__text' }, r.text)))) : null,
    h('div', { class: 'cm__reply-box' }, reply),
    h('div', { class: 'row-btns' },
      h('button', { type: 'button', class: 'btn btn--small', 'data-reply-add': c.id, onclick: sendReply }, __('Répondre')),
      h('button', { type: 'button', class: 'btn btn--small', 'data-comment-resolve': c.id, onclick: () => { if (apply(s => setResolved(s, c.id, !c.resolved), c.resolved ? 'réouverture' : 'résolution')) { log.info('review.resolve', c.resolved ? __('Commentaire rouvert') : __('Commentaire résolu'), { id: c.id, resolved: !c.resolved, role: sessionRole() || 'seul' }); render(); } } }, c.resolved ? __('Rouvrir') : __('✓ Résolu')),
      canDelete(c) ? h('button', { type: 'button', class: 'btn btn--small is-danger', 'data-comment-delete': c.id, onclick: () => {
        if (!confirm(__('Supprimer ce commentaire et ses réponses ?'))) { log.debug('review.delete-cancel', __('Suppression du commentaire annulée'), { id: c.id }); return; }
        if (apply(s => removeComment(s, c.id), 'suppression')) { log.info('review.delete', __('Commentaire supprimé avec ses réponses'), { id: c.id, replies: (c.replies || []).length }); render(); }
      } }, __('Supprimer')) : null));
}

async function needIdentity() {
  let me = await ensureIdentity();
  if (me) return me;
  const n = $('#reviewPanel [data-review-name]')?.value?.trim();
  if (!n) { log.warn('review.no-identity', __('Commentaire non signé : nom manquant')); toast(__('Indiquez votre nom pour signer vos commentaires.'), 'error'); $('#reviewPanel [data-review-name]')?.focus(); return null; }
  me = await ensureIdentity(n);
  return me;
}

function composer() {
  const node = nodeById(state.selected);
  const me = currentIdentity();
  const text = h('textarea', { class: 'input', rows: 3, placeholder: node ? __('Votre remarque sur « {label} »…', { label: nodeLabel(node) }) : __('Sélectionnez un élément dans la page pour le commenter'), disabled: !node, 'data-comment-text': '', 'aria-label': __('Nouveau commentaire') });
  const add = async () => {
    const n = nodeById(state.selected);
    if (!n) return;
    const id = await needIdentity();
    if (!id) return;
    try {
      const sum = nodeSummary(n, state.site, state.lang);
      const c = await makeComment(id, { anchor: { pageId: state.pageId, nodeId: n.id, where: where(), label: `${nodeLabel(n)}${sum ? ` : ${sum}` : ''}`.slice(0, 80) }, text: text.value });
      if (apply(s => addComment(s, c), 'ajout')) { log.info('review.add', __('Commentaire ajouté et signé par {name} sur « {label} »', { name: id.name, label: nodeLabel(n) }), { id: c.id, page: state.pageId, node: n.id, type: n.type, where: where() || undefined, chars: c.text.length, role: sessionRole() || 'seul' }); active = c.id; text.value = ''; render(); schedulePosition(); toast(__('Commentaire ajouté et signé.')); }
    } catch (e) { log.warn('review.add-refused', __('Commentaire refusé : {error}', { error: e.message }), { node: n.id, error: e }); toast(e.message, 'error'); }
  };
  text.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } });
  return h('div', { class: 'cm-new' },
    me ? null : h('input', { class: 'input input--sm', type: 'text', placeholder: __('Votre nom (signe vos commentaires)'), 'data-review-name': '', 'aria-label': __('Votre nom'), maxlength: 40 }),
    text,
    h('div', { class: 'row-btns' }, h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-comment-add': '', disabled: !node, onclick: add }, __('💬 Commenter')), h('span', { class: 'hint' }, __('Ctrl+Entrée'))));
}

function render() {
  const p = $('#reviewPanel');
  if (!p || !open) return;
  const scroll = p.querySelector('.review-body')?.scrollTop || 0;
  const list = filter === 'all' ? listComments(state.site, {}) : filter === 'open' ? listComments(state.site, { open: true }) : listComments(state.site, { pageId: state.pageId }).filter(c => (c.anchor?.where || '') === where());
  const sel = h('select', { class: 'control control--sm', 'data-review-filter': '', 'aria-label': __('Filtrer les commentaires') },
    [['page', __('Cette page')], ['open', __('Ouverts (tout le site)')], ['all', __('Tous')]].map(([v, l]) => h('option', { value: v, selected: filter === v }, l)));
  sel.addEventListener('change', () => { filter = sel.value; log.debug('review.filter', __('Filtre des commentaires : {filter}', { filter }), { filter, count: list.length }); render(); schedulePosition(); });
  const body = h('div', { class: 'review-body' }, composer(),
    list.length ? h('ol', { class: 'cm-list' }, list.map((c, i) => commentItem(c, i + 1))) : h('p', { class: 'hint' }, filter === 'page' ? __('Aucun commentaire sur cette page.') : __('Aucun commentaire.')));
  p.replaceChildren(
    h('div', { class: 'insp-head review-head' }, h('h2', { class: 'insp-title' }, __('💬 Commentaires')), sel, h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-review-summary': '', title: __('Résumé de la relecture'), 'aria-label': __('Résumé de la relecture'), onclick: () => openReviewSummary() }, '📋'), h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': __('Fermer les commentaires'), onclick: () => toggle(false) }, '✕')),
    h('p', { class: 'hint review-note' }, __('Chaque commentaire est signé par la clé de son auteur. Ils sont gardés dans le projet, jamais publiés sur le site.')),
    body);
  body.scrollTop = scroll;
}

function renderCount() {
  const b = $('#commentsBtn');
  if (!b) return;
  const n = openCount(state.site);
  /* icône SVG (cycle 30) + nombre de commentaires ouverts */
  b.replaceChildren(icon('comment', 17), ...(n ? [h('span', { class: 'cm-count' }, String(n))] : []));
  b.title = n ? __n(n, '{n} commentaire ouvert', '{n} commentaires ouverts') : __('Commentaires');
  b.setAttribute('aria-pressed', String(open));
}

export function toggle(on = !open) {
  if (on !== open) log.info('review.panel', on ? __('Panneau des commentaires ouvert') : __('Panneau des commentaires fermé'), { open: on, comments: listComments(state.site, {}).length, openCount: openCount(state.site), readOnly: !!state.readOnly });
  open = on;
  $('#reviewPanel').hidden = !open;
  $('#inspector').hidden = open;
  renderCount();
  render();
  schedulePosition();
}

export function openReview({ focus = null } = {}) {
  if (focus) active = focus;
  toggle(true);
  setTimeout(() => $(`#reviewPanel [data-comment="${CSS.escape(focus || '')}"]`)?.scrollIntoView({ block: 'nearest' }), 50);
}

/* Pastilles numérotées sur les éléments commentés */
function pins({ doc, ui, nodeElement }) {
  const list = listComments(state.site, { pageId: state.pageId, open: true }).filter(c => (c.anchor?.where || '') === where());
  const els = [...ui.querySelectorAll('.cm-pin')];
  while (els.length < list.length) {
    const el = doc.createElement('div');
    el.className = 'cm-pin';
    el.setAttribute('data-ui-action', 'comment');
    ui.append(el);
    els.push(el);
  }
  const all = listComments(state.site, { pageId: state.pageId }).filter(c => (c.anchor?.where || '') === where());
  els.forEach((el, i) => {
    const c = list[i];
    const target = c && nodeElement(c.anchor.nodeId);
    if (!target) { el.style.display = 'none'; return; }
    const r = target.getBoundingClientRect();
    el.style.display = 'block';
    el.style.left = `${Math.max(14, r.right - 6)}px`;
    el.style.top = `${Math.max(14, r.top + 6)}px`;
    el.dataset.uiArg = c.id;
    el.textContent = String(all.indexOf(c) + 1);
    el.title = `${c.author?.name || ''} : ${c.text.slice(0, 80)}`;
    el.classList.toggle('is-active', active === c.id);
  });
}

/* Commentaires reçus d'un autre participant (journal seulement) */
let known = null;
function noteRemote(opts) {
  const all = state.site.review?.comments || {};
  if (known && opts?.source === 'remote') {
    for (const [id, c] of Object.entries(all)) {
      const old = known.get(id);
      if (!old) log.info('review.remote', __('Commentaire reçu de {name}', { name: c.author?.name || __('Anonyme') }), { id, fp: c.author?.fp, page: c.anchor?.pageId, node: c.anchor?.nodeId });
      else if ((c.replies || []).length > old.replies) log.info('review.remote', __('Réponse reçue au commentaire de {name}', { name: c.author?.name || __('Anonyme') }), { id, replies: c.replies.length });
      else if (!!c.resolved !== old.resolved) log.info('review.remote', c.resolved ? __('Commentaire résolu par un autre participant') : __('Commentaire rouvert par un autre participant'), { id, resolved: !!c.resolved });
    }
    for (const id of known.keys()) if (!all[id]) log.info('review.remote', __('Commentaire supprimé par un autre participant'), { id });
  }
  known = new Map(Object.entries(all).map(([id, c]) => [id, { replies: (c.replies || []).length, resolved: !!c.resolved }]));
}

export function initReview() {
  $('#commentsBtn')?.addEventListener('click', () => toggle());
  addOverlay(pins);
  onUiAction((act, arg) => { if (act === 'comment') openReview({ focus: arg }); });
  subscribe((reason, opts) => {
    if (reason === 'doc' || reason === 'view') { renderCount(); schedulePosition(); noteRemote(opts); }
    if (!open) return;
    const typing = $('#reviewPanel')?.contains(document.activeElement) && document.activeElement.matches('textarea,input') && document.activeElement.value;
    if (reason === 'selection' || reason === 'view' || (reason === 'doc' && !typing)) render();
    void opts;
  });
  renderCount();
  void findNode;
}
