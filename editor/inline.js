/*
 * Édition directe dans le canevas : double-clic sur un texte, un titre ou un bouton.
 * Chaque saisie est assainie et enregistrée (une seule étape d'annulation par session d'édition).
 * Barre de mise en forme flottante : gras, italique, souligné, lien, effacer.
 */
import { state, root, nodeById, commitRoot, commit, select, emit, siteWithRoot, clearReview } from './store.js';
import { fieldDef } from '../core/widgets.js';
import { setProp, setListItemProp } from '../core/tree.js';
import { richToText } from '../core/sanitize.js';
import { escapeHtml } from '../core/escape.js';
import { makeEditable, format, isActive, selectionInside } from './richedit.js';
import { onCanvasReady, canvasDoc, schedulePosition } from './canvas.js';
import { toast } from './dom.js';
import { fieldLabel } from '../core/collections.js';
import { log } from './log.js';
import { __, __n } from '../core/ui-i18n.js';

let session = null; /* { el, id, key, field, editor, flow, len0, inputs, changed } */
let aiHooks = null;
let aiPending = null;
/* Branché par ai-ui.js : { modes, rewrite(text, mode), proofread(text), mark(nodeId, field) } */
export function setAIHooks(hooks) { aiHooks = hooks; }
let counter = 0;

export const isEditing = () => !!session;

/* « titre » ou « items.2.text » (champ d'un élément de liste) */
function resolveField(type, key) {
  const path = String(key || '').split('.');
  if (path.length === 1) return fieldDef(type, key);
  if (path.length !== 3 || !/^\d+$/.test(path[1])) return null;
  return fieldDef(type, path[0])?.fields?.find(f => f.key === path[2]) || null;
}

const TB = {
  t0: escapeHtml(__('Mise en forme')),
  t1: escapeHtml(__('Gras (Ctrl+B)')),
  t2: escapeHtml(__('Italique (Ctrl+I)')),
  t3: escapeHtml(__('Souligné (Ctrl+U)')),
  t4: escapeHtml(__('Lien')),
  t5: escapeHtml(__('Effacer la mise en forme')),
  t6: escapeHtml(__('IA locale : reformuler, corriger (sur la sélection ou le paragraphe)')),
  t7: escapeHtml(__('Proposition de l’IA locale')),
  t8: escapeHtml(__('Remplacer')),
  t9: escapeHtml(__('Annuler')),
  t10: escapeHtml(__('https://… ou #ancre')),
  t11: escapeHtml(__('Adresse du lien'))
};
const TOOLBAR = `<div id="atelier-format" role="toolbar" aria-label="${TB.t0}" hidden>
<button type="button" data-fmt="bold" title="${TB.t1}"><b>B</b></button>
<button type="button" data-fmt="italic" title="${TB.t2}"><i>I</i></button>
<button type="button" data-fmt="underline" title="${TB.t3}"><u>U</u></button>
<button type="button" data-fmt="link" title="${TB.t4}">🔗</button>
<button type="button" data-fmt="clear" title="${TB.t5}">⌫</button>
<button type="button" data-fmt="ai" title="${TB.t6}" aria-haspopup="true">✨</button>
<span class="fmt-ai" hidden></span>
<div class="fmt-ai-out" hidden role="dialog" aria-label="${TB.t7}"><div class="fmt-ai-text"></div><div class="fmt-ai-acts"><button type="button" data-fmt="ai-apply">${TB.t8}</button><button type="button" data-fmt="ai-cancel">${TB.t9}</button></div></div>
<span class="fmt-link" hidden><input type="url" placeholder="${TB.t10}" aria-label="${TB.t11}"><button type="button" data-fmt="link-ok">OK</button></span>
</div>`;

export const INLINE_CSS = `
#atelier-format{position:fixed;display:flex;gap:2px;align-items:center;padding:3px;background:#18181c;border-radius:8px;box-shadow:0 8px 24px -8px rgba(0,0,0,.5);pointer-events:auto;z-index:2}
#atelier-format[hidden],#atelier-format .fmt-link[hidden]{display:none}
#atelier-format button{all:unset;cursor:pointer;min-width:26px;height:26px;padding:0 4px;box-sizing:border-box;display:grid;place-items:center;color:#fff;border-radius:5px;font:600 13px/1 system-ui,sans-serif}
#atelier-format button:hover,#atelier-format button[aria-pressed="true"]{background:#3a3a42}
#atelier-format .fmt-link{display:flex;gap:2px}
#atelier-format .fmt-ai{display:flex;gap:2px;border-left:1px solid #3a3a42;padding-left:3px}
#atelier-format .fmt-ai[hidden],#atelier-format .fmt-ai-out[hidden]{display:none}
#atelier-format .fmt-ai button{font-weight:500;font-size:12px;padding:0 7px}
#atelier-format .fmt-ai-out{position:absolute;left:0;top:100%;margin-top:6px;width:min(420px,80vw);background:#fff;color:#18181c;border-radius:9px;padding:10px 12px;box-shadow:0 12px 32px -10px rgba(0,0,0,.45);font:14px/1.45 system-ui,sans-serif;display:grid;gap:8px}
#atelier-format .fmt-ai-text{white-space:pre-wrap;max-height:240px;overflow:auto}
#atelier-format .fmt-ai-text small{display:block;color:#6b6a72;font-size:12px;margin-bottom:4px}
#atelier-format .fmt-ai-text mark{background:#fde68a;border-radius:2px}
#atelier-format .fmt-ai-acts{display:flex;gap:6px}
#atelier-format .fmt-ai-acts button{all:unset;cursor:pointer;padding:5px 10px;border-radius:6px;background:#18181c;color:#fff;font:600 12.5px system-ui,sans-serif}
#atelier-format .fmt-ai-acts button[data-fmt="ai-cancel"]{background:#ececea;color:#18181c}
#atelier-format input{all:unset;background:#fff;color:#111;border-radius:4px;padding:0 6px;height:24px;width:200px;font:13px system-ui,sans-serif}
`;

function toolbar() { return canvasDoc()?.getElementById('atelier-format'); }

function placeToolbar() {
  const tb = toolbar();
  if (!tb || !session) return;
  const r = session.el.getBoundingClientRect();
  const h = tb.offsetHeight || 32;
  const top = r.top - h - 10 < 4 ? r.bottom + 8 : r.top - h - 10;
  tb.style.left = `${Math.max(4, r.left)}px`;
  tb.style.top = `${top}px`;
  for (const b of tb.querySelectorAll('[data-fmt="bold"],[data-fmt="italic"],[data-fmt="underline"],[data-fmt="link"]'))
    b.setAttribute('aria-pressed', String(isActive(session.el, b.dataset.fmt)));
}

function valueFor(html) {
  return session.field.type === 'text' ? richToText(html) : html;
}

function write(html, final = false) {
  if (!session) return;
  const { id } = session;
  const key = session.el.getAttribute('data-edit');
  const value = valueFor(html);
  const path = key.split('.');
  const props = nodeById(id)?.props || {};
  const raw = path.length === 3 ? props[path[0]]?.[Number(path[1])]?.[path[2]] : props[key];
  const current = session.field.i18n ? (raw?.[state.lang] ?? '') : (raw ?? '');
  if (value === current && !final) return;
  const f = session.flow;
  try {
    const next = path.length === 3 ? setListItemProp(root(), id, path[0], Number(path[1]), path[2], value, state.lang) : setProp(root(), id, key, value, state.lang);
    if (value !== current) {
      session.inputs++;
      session.changed = true;
      /* À chaque frappe : trace (longueur seulement, jamais le texte) */
      f.step('input', __('Texte modifié'), { chars: richToText(String(value)).length }, 'trace');
      commit(clearReview(siteWithRoot(state.site, next), id, key, state.lang), { key: session.key, sticky: true, source: 'canvas' });
    }
  } catch (e) { f.warn('node-gone', __('Texte non enregistré : l’élément a été supprimé pendant l’édition (par toi ou un autre participant)'), { id, key, error: e }); }
}

export function startEditing(el) {
  const nodeEl = el.closest('[data-node]');
  if (!nodeEl) return false;
  const id = nodeEl.getAttribute('data-node');
  const node = nodeById(id);
  const key = el.getAttribute('data-edit');
  const field = node && resolveField(node.type, key);
  if (!field || !['inline', 'richtext', 'text'].includes(field.type)) { log.debug('edit.not-editable', __('Ce texte ne se modifie pas dans la page (voir l’inspecteur)'), { id, type: node?.type, key, field: field?.type }); return false; }
  if (state.readOnly) { log.warn('edit.readonly', __('Édition refusée : mode relecture'), { id, key }); toast(__('Mode relecture : vous pouvez commenter (💬), pas modifier.')); return false; }
  const boundTo = node.bind?.[String(key).split('.')[0]];
  if (boundTo) {
    const t = state.editTarget;
    const col = t && state.site.collections?.[t.id];
    log.warn('edit.bound', __('Édition refusée : texte relié au champ « {field} » de la collection', { field: boundTo }), { id, key, field: boundTo, collection: t?.id });
    toast(__('Ce texte vient du champ « {field} » de chaque élément : modifiez-le dans Contenus, ou déliez-le dans l’inspecteur.', { field: col ? fieldLabel(col, boundTo) : boundTo }));
    return false;
  }
  if (session?.el === el) return true;
  stopEditing();
  if (state.selected !== id) select(id);
  const doc = el.ownerDocument;
  const sel = doc.getSelection();
  const saved = sel && sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer) ? sel.getRangeAt(0).cloneRange() : null;
  const inline = field.type !== 'richtext';
  const len0 = richToText(el.innerHTML).length;
  const f = log.flow('edit', __('Édition dans la page : {type} · {key}', { type: node.type, key }), { id, type: node.type, key, field: field.type, lang: state.lang, chars: len0, edit: state.editTarget?.kind });
  session = { el, id, key: `edit-${id}-${key}-${++counter}`, field, flow: f, len0, inputs: 0, changed: false };
  session.editor = makeEditable(el, {
    inline,
    onInput: html => { write(html); placeToolbar(); },
    onDone: html => { write(html, true); stopEditing(); },
    onKey: e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ['z', 'y'].includes(e.key.toLowerCase())) { el.blur(); return true; }
      if (field.type === 'text' && mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
      return true;
    }
  });
  el.focus({ preventScroll: true });
  if (saved) { sel.removeAllRanges(); sel.addRange(saved); }
  const tb = toolbar();
  if (tb) { tb.hidden = field.type === 'text'; tb.querySelector('.fmt-link').hidden = true; }
  placeToolbar();
  emit('editing', { id });
  return true;
}

export function stopEditing() {
  if (!session) return;
  const s = session;
  session = null;
  const chars = richToText(s.el.innerHTML).length;
  s.flow.ok(s.changed ? __('Édition terminée : texte enregistré (une seule étape d’annulation)') : __('Édition terminée sans changement'), { id: s.id, key: s.el.getAttribute('data-edit'), changed: s.changed, chars, before: s.len0, inputs: s.inputs });
  s.editor.stop();
  const tb = toolbar();
  if (tb) { tb.hidden = true; tb.querySelector('.fmt-ai').hidden = true; tb.querySelector('.fmt-ai-out').hidden = true; }
  aiPending = null;
  emit('doc', { source: 'edit-done' });
  schedulePosition();
}

/* Texte visé par l'IA : la sélection, sinon le paragraphe du curseur, sinon tout le texte */
function aiTarget() {
  const el = session.el;
  const doc = el.ownerDocument;
  const sel = doc.getSelection();
  if (sel.rangeCount && !sel.getRangeAt(0).collapsed && el.contains(sel.getRangeAt(0).commonAncestorContainer)) return sel.getRangeAt(0).cloneRange();
  let block = null;
  if (session.field.type === 'richtext' && sel.rangeCount) {
    for (let n = sel.anchorNode; n && n !== el; n = n.parentNode) if (n.nodeType === 1 && /^(P|LI|H[1-6]|BLOCKQUOTE)$/.test(n.tagName)) { block = n; break; }
  }
  const r = doc.createRange();
  r.selectNodeContents(block || el);
  return r;
}

/* Corrections positionnées appliquées sur les nœuds de texte : la mise en forme est gardée */
function applyEdits(range, corrections) {
  const doc = range.startContainer.ownerDocument;
  const walker = doc.createTreeWalker(range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  const segs = [];
  let pos = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!range.intersectsNode(n)) continue;
    const a = n === range.startContainer ? range.startOffset : 0;
    const b = n === range.endContainer ? range.endOffset : n.data.length;
    if (b <= a) continue;
    segs.push({ n, a, b, g: pos });
    pos += b - a;
  }
  const at = i => segs.find(s => i >= s.g && i <= s.g + (s.b - s.a));
  for (const c of [...corrections].sort((x, y) => y.start - x.start)) {
    const s1 = at(c.start);
    const s2 = at(c.end);
    if (!s1 || !s2) continue;
    const o1 = s1.a + (c.start - s1.g);
    const o2 = s2.a + (c.end - s2.g);
    if (s1 === s2) { s1.n.replaceData(o1, o2 - o1, c.replacement); continue; }
    s2.n.deleteData(s2.a, o2 - s2.a);
    for (const m of segs.filter(s => s.g > s1.g && s.g < s2.g)) m.n.deleteData(m.a, m.b - m.a);
    s1.n.replaceData(o1, s1.b - o1, c.replacement);
  }
}

function aiOut(html, canApply) {
  const tb = toolbar();
  const box = tb.querySelector('.fmt-ai-out');
  box.querySelector('.fmt-ai-text').innerHTML = html;
  box.querySelector('[data-fmt="ai-apply"]').hidden = !canApply;
  box.querySelector('[data-fmt="ai-cancel"]').textContent = canApply ? __('Annuler') : __('Fermer');
  box.hidden = false;
  tb.querySelector('.fmt-ai').hidden = true;
}

async function onAI(cmd, b) {
  const tb = toolbar();
  const menu = tb.querySelector('.fmt-ai');
  const f = session.flow;
  if (cmd === 'ai') {
    if (!aiHooks) { f.warn('ai-unavailable', __('Menu ✨ indisponible : le module d’IA locale n’est pas chargé'), {}); toast(__('IA locale non chargée.')); return; }
    if (menu.hidden) {
      menu.innerHTML = [...aiHooks.modes.map(m => `<button type="button" data-fmt="ai-mode" data-mode="${m.id}">${escapeHtml(m.label)}</button>`), '<button type="button" data-fmt="ai-proof">' + escapeHtml(__('Corriger')) + '</button>'].join('');
      menu.hidden = false;
      tb.querySelector('.fmt-ai-out').hidden = true;
      f.step('ai-menu', __('Menu ✨ ouvert'), { open: true, modes: aiHooks.modes.map(m => m.id) });
    } else { menu.hidden = true; f.step('ai-menu', __('Menu ✨ fermé'), { open: false }); }
    return;
  }
  if (cmd === 'ai-cancel') { f.step('ai-cancel', aiPending ? __('Proposition de l’IA écartée') : __('Résultat de l’IA fermé'), { pending: !!aiPending }, 'info'); aiPending = null; tb.querySelector('.fmt-ai-out').hidden = true; return; }
  if (cmd === 'ai-apply') {
    if (!aiPending || !session) { f.step('ai-apply-none', __('Rien à appliquer (proposition déjà utilisée ou édition terminée)'), {}); return; }
    const { range, value, corrections } = aiPending;
    aiPending = null;
    session.el.focus({ preventScroll: true });
    if (corrections) applyEdits(range, corrections);
    else { range.deleteContents(); range.insertNode(range.startContainer.ownerDocument.createTextNode(value)); }
    const id = session.id;
    const key = session.el.getAttribute('data-edit');
    const histKey = session.key;
    write(session.editor.clean(), true);
    aiHooks.mark(id, key, histKey);
    f.info('ai-apply', corrections ? __n(corrections.length, '{n} correction de l’IA appliquée (texte marqué « à relire »)', '{n} corrections de l’IA appliquées (texte marqué « à relire »)') : __('Proposition de l’IA appliquée (texte marqué « à relire »)'), { id, key, corrections: corrections?.length, chars: corrections ? undefined : String(value).length });
    tb.querySelector('.fmt-ai-out').hidden = true;
    placeToolbar();
    return;
  }
  if (cmd !== 'ai-mode' && cmd !== 'ai-proof') return;
  const range = aiTarget();
  const text = range.toString();
  if (!text.trim()) { f.warn('ai-empty', __('Menu ✨ : aucun texte visé (sélection vide)'), {}); toast(__('Sélectionnez un texte (ou placez le curseur dans un paragraphe).')); return; }
  menu.hidden = true;
  const s0 = session;
  b?.setAttribute('aria-busy', 'true');
  f.step('ai-ask', cmd === 'ai-mode' ? __('Demande à l’IA locale : {mode}', { mode: b?.dataset.mode }) : __('Demande à l’IA locale : corriger'), { mode: cmd === 'ai-mode' ? b?.dataset.mode : 'proofread', chars: text.length, selection: !range.collapsed });
  if (cmd === 'ai-mode') {
    const r = await aiHooks.rewrite(text, b.dataset.mode);
    if (!r) { f.step('ai-none', __('Pas de proposition de l’IA (voir les lignes ai.* juste avant)'), {}, 'warn'); return; }
    if (session !== s0) { f.step('ai-stale', __('Proposition de l’IA ignorée : l’édition s’est terminée entre-temps'), {}); return; }
    aiPending = { range, value: r.value };
    f.step('ai-proposal', __('Proposition de l’IA affichée (Remplacer ou Annuler)'), { chars: String(r.value).length, warning: r.warning || undefined });
    const note = escapeHtml(__('✨ Proposition (vous pouvez encore la modifier après)'));
    aiOut(`${r.warning ? `<small>⚠ ${escapeHtml(r.warning)}</small>` : `<small>${note}</small>`}${escapeHtml(r.value)}`, true);
  } else {
    const r = await aiHooks.proofread(text);
    if (!r) { f.step('ai-none', __('Pas de proposition de l’IA (voir les lignes ai.* juste avant)'), {}, 'warn'); return; }
    if (session !== s0) { f.step('ai-stale', __('Proposition de l’IA ignorée : l’édition s’est terminée entre-temps'), {}); return; }
    const cs = r.value.corrections;
    if (!cs.length) { f.step('ai-proposal', __('Correction : aucune faute trouvée'), { corrections: 0 }); aiOut(escapeHtml(__('✓ Aucune faute trouvée.')), false); return; }
    aiPending = { range, corrections: cs };
    f.step('ai-proposal', __n(cs.length, 'Correction : {n} proposition affichée', 'Correction : {n} propositions affichées'), { corrections: cs.length });
    let html = '';
    let last = 0;
    for (const c of cs) { html += `${escapeHtml(text.slice(last, c.start))}<mark title="${escapeHtml(c.original)}">${escapeHtml(c.replacement)}</mark>`; last = c.end; }
    html += escapeHtml(text.slice(last));
    const head = escapeHtml(__n(cs.length, '{n} correction :', '{n} corrections :'));
    aiOut(`<small>✨ ${head} ${cs.slice(0, 4).map(c => `${escapeHtml(c.original)} → ${escapeHtml(c.replacement)}`).join(', ')}${cs.length > 4 ? '…' : ''}</small>${html}`, true);
  }
}

function onToolbar(e) {
  const b = e.target.closest('[data-fmt]');
  if (!b || !session) return;
  e.preventDefault();
  const el = session.el;
  const cmd = b.dataset.fmt;
  if (cmd.startsWith('ai')) { onAI(cmd, b); return; }
  const tb = toolbar();
  const linkBox = tb.querySelector('.fmt-link');
  if (cmd === 'link') {
    const s = selectionInside(el);
    if (isActive(el, 'link')) { format(el, 'link'); write(session.editor.clean()); placeToolbar(); return; }
    if (!s || s.range.collapsed) { log.debug('edit.link-none', __('Lien : sélectionne d’abord le texte à lier'), {}); return; }
    session.range = s.range.cloneRange();
    log.debug('edit.link-open', __('Champ d’adresse du lien ouvert'), { chars: s.range.toString().length });
    linkBox.hidden = false;
    const input = linkBox.querySelector('input');
    input.value = '';
    input.focus();
    return;
  }
  if (cmd === 'link-ok') { applyLink(); return; }
  if (format(el, cmd)) write(session.editor.clean());
  placeToolbar();
}

function applyLink() {
  if (!session?.range) return;
  const tb = toolbar();
  const input = tb.querySelector('.fmt-link input');
  const el = session.el;
  el.focus({ preventScroll: true });
  const sel = el.ownerDocument.getSelection();
  sel.removeAllRanges();
  sel.addRange(session.range);
  session.range = null;
  if (format(el, 'link', input.value.trim())) write(session.editor.clean());
  tb.querySelector('.fmt-link').hidden = true;
  placeToolbar();
}

function bind(doc) {
  if (session) session.flow.cancel(__('Édition interrompue : le canevas a été rechargé (autre page, langue ou cible)'), { id: session.id, changed: session.changed });
  session = null;
  const ui = doc.getElementById('atelier-ui');
  if (ui && !doc.getElementById('atelier-format')) {
    ui.insertAdjacentHTML('beforeend', TOOLBAR);
    const style = doc.createElement('style');
    style.textContent = INLINE_CSS;
    doc.head.append(style);
  }
  const tb = doc.getElementById('atelier-format');
  tb.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
  tb.addEventListener('click', onToolbar);
  tb.querySelector('.fmt-link input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); log.debug('edit.link-cancel', __('Lien abandonné (Échap)')); tb.querySelector('.fmt-link').hidden = true; session?.el.focus(); }
  });
  tb.querySelector('.fmt-link input').addEventListener('blur', e => {
    if (session && !e.relatedTarget?.closest?.('#atelier-format') && e.relatedTarget !== session.el) { session.range = null; tb.querySelector('.fmt-link').hidden = true; stopEditingSoon(); }
  });
  doc.addEventListener('dblclick', e => {
    const el = e.target.closest('[data-edit]');
    if (!el || e.target.closest('#atelier-ui')) return;
    e.preventDefault();
    log.debug('edit.dblclick', __('Double-clic sur un texte de la page'), { key: el.getAttribute('data-edit'), id: el.closest('[data-node]')?.getAttribute('data-node') });
    startEditing(el);
  });
  doc.addEventListener('selectionchange', () => { if (session) placeToolbar(); });
  doc.defaultView.addEventListener('scroll', () => { if (session) placeToolbar(); }, { passive: true });
}

function stopEditingSoon() {
  setTimeout(() => { if (session && canvasDoc()?.activeElement !== session.el) stopEditing(); }, 0);
}

/* Commencer l'édition de l'élément sélectionné (Entrée, menu contextuel) */
export function editSelected() {
  const doc = canvasDoc();
  const el = doc?.querySelector(`[data-node="${CSS.escape(state.selected || '')}"] [data-edit]`);
  if (!el) { log.debug('edit.no-text', __('Rien à écrire dans l’élément sélectionné (pas de texte modifiable)'), { id: state.selected }); return false; }
  log.debug('edit.keyboard', __('Édition demandée au clavier ou par le menu'), { id: state.selected });
  return startEditing(el);
}

export function initInline() {
  onCanvasReady(bind);
}
