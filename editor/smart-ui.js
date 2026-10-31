/*
 * Contenus intelligents (cycle 17) : affiche → élément, texte collé → éléments, chapô et titres,
 * résumé de la relecture, palette depuis le logo. Toujours une proposition, jamais une modification silencieuse ;
 * ce que l'IA écrit est marqué « à relire » ; une seule étape d'annulation par action.
 */
import { h, $, toast } from './dom.js';
import { openDialog } from './dialog.js';
import { state, commit } from './store.js';
import { log } from './log.js';
import { withAI, markAi } from './ai-ui.js';
import { imageToWebp } from './images.js';
import { addAsset, setPalette, PALETTE_NAMES } from '../core/site.js';
import { addItem, setItemValue, itemTitle, localToday, displayValue } from '../core/collections.js';
import { reviewDigest, digestText, dominantColors, paletteFromColors } from '../core/smart.js';
import { formatRatio } from '../core/contrast.js';
import { __, __n, __c } from '../core/ui-i18n.js';

const col = id => state.site.collections?.[id] || null;
const def = () => state.site.defaultLanguage;
const short = (s, n = 60) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

let hooks = { openCollection: null, goToComment: null };
export function setSmartHooks(h0) { hooks = { ...hooks, ...h0 }; }

function dialog(id, title, ...body) {
  $(`#${id}`)?.remove();
  const d = openDialog({ id,
    className: 'smart-dialog',
    titleId: `${id}Title`,
    title: title,
    body: [...body] });
  return d;
}

/* ---------- A et B : affiche ou texte collé → éléments ---------- */
export function openSmartImport(colId, mode = 'poster') {
  const c = col(colId);
  if (!c) return;
  const poster = mode === 'poster';
  const f = poster ? log.flow('smart.poster', __('Affiche → élément de « {name} »', { name: c.name }), { collection: c.id, kind: c.kind, imageField: c.imageField || undefined })
    : log.flow('smart.paste', __('Texte collé → éléments de « {name} »', { name: c.name }), { collection: c.id, kind: c.kind });
  let img = null;
  let blob = null;
  let result = null;
  let done = false;
  const status = h('p', { class: 'pub-status', role: 'status', 'data-smart-status': '' });
  const out = h('div', { class: 'smart-out', 'data-smart-out': '' });
  const go = h('button', { type: 'button', class: 'btn btn--small btn--primary btn--ai', 'data-smart-read': '', disabled: poster, onclick: () => read() }, poster ? __('✨ Lire l’affiche') : __('✨ Lire le texte'));
  const create = h('button', { type: 'button', class: 'btn btn--primary', 'data-smart-create': '', hidden: true, onclick: () => createDrafts() }, __('Créer'));
  let input;
  let preview = null;
  if (poster) {
    preview = h('img', { class: 'smart-poster', alt: '', hidden: true, 'data-smart-preview': '' });
    input = h('input', { type: 'file', accept: 'image/*', 'data-smart-file': '', 'aria-label': __('Photo de l’affiche') });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      status.textContent = __('Préparation de l’image…');
      try {
        img = await imageToWebp(file);
        blob = await (await fetch(img.dataUrl)).blob();
        f.step('image', __('Photo prête : {width}×{height} px, {kb} Ko', { width: img.width, height: img.height, kb: Math.round(img.bytes / 1024) }), { name: short(file.name, 80), width: img.width, height: img.height, kb: Math.round(img.bytes / 1024), mime: img.mime }, 'info');
        preview.src = img.dataUrl;
        preview.hidden = false;
        go.disabled = false;
        status.textContent = __('Photo prête : cliquez « ✨ Lire l’affiche ».');
      } catch (e) { f.warn('image-fail', __('Photo refusée : {error}', { error: e.message }), { error: e }); status.textContent = e.message; img = null; go.disabled = true; }
    });
  } else {
    input = h('textarea', { class: 'input smart-text', rows: 9, 'data-smart-text': '', placeholder: __('Collez ici un e-mail, une liste de membres, un programme…'), 'aria-label': __('Texte à lire') });
  }
  const d = dialog('smartDialog', poster ? __('✨ Affiche → {name}', { name: c.name }) : __('✨ Texte collé → {name}', { name: c.name }),
    h('div', { class: 'a11y-form' },
      h('p', { class: 'hint' }, poster
        ? __('Photographiez l’affiche ou le flyer bien à plat. L’IA lit l’image sur votre ordinateur (rien n’est envoyé) et remplit la fiche ; vous vérifiez avant de créer un brouillon.')
        : __('L’IA repère les éléments du texte (un membre, un événement, un article…) et remplit une fiche pour chacun ; vous choisissez ceux à créer, en brouillon.')),
      poster ? h('label', { class: 'btn btn--small upload' }, __('📷 Choisir la photo'), input) : input,
      preview,
      h('div', { class: 'row-btns' }, go),
      status, out),
    h('div', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer')), create));
  d.addEventListener('close', () => { if (!done) f.cancel(result ? __('Fermé sans créer de brouillon') : __('Fermé sans lecture'), { read: !!result }); });

  async function read() {
    const text = poster ? '' : input.value;
    if (!poster && !text.trim()) { status.textContent = __('Collez d’abord un texte.'); f.step('empty', __('Lecture demandée sans texte'), {}, 'warn'); return; }
    status.textContent = poster ? __('Lecture de l’affiche…') : __('Lecture du texte…');
    go.disabled = true;
    f.step('read', poster ? __('Lecture de l’affiche par l’IA locale') : __('Lecture du texte par l’IA locale ({n} car.)', { n: text.length }), { chars: poster ? undefined : text.length }, 'info');
    const r = await withAI(poster ? __('Lecture de l’affiche') : __('Lecture du texte'), a => a.extractItems({ site: state.site, col: c, image: poster ? blob : null, text, lang: state.lang, today: localToday() }));
    go.disabled = false;
    if (!r) { status.textContent = __('Lecture impossible (voir le message).'); f.step('read-fail', __('Lecture impossible : voir ai.extract'), {}, 'warn'); return; }
    result = r;
    showResult();
  }

  function showResult() {
    const fresh = col(c.id);
    const dup = new Set(result.duplicates || []);
    const rows = result.value.map((x, i) => {
      const checked = !dup.has(i) && !x.missingTitle;
      const fake = { values: x.values };
      const title = itemTitle(state.site, fresh, fake, def()) || __('(sans titre)');
      const found = x.found.filter(k => k !== fresh.titleField).map(k => {
        const fd = fresh.fields.find(ff => ff.key === k);
        let v;
        try { v = displayValue(state.site, fresh, fake, k, def(), { format: 'short' }); } catch { v = ''; }
        return h('li', {}, h('strong', {}, __('{field} : ', { field: fd?.label || k })), short(String(v).replace(/<[^>]*>/g, ' '), 140));
      });
      const dropped = x.dropped.map(dd => h('li', { class: 'is-dropped', 'data-smart-dropped': dd.key }, __('⚠ {field} écarté : {reason}', { field: dd.label, reason: dd.reason }), dd.raw ? h('small', { class: 'hint' }, __(' (lu : « {value} »)', { value: short(dd.raw, 60) })) : null));
      return h('li', { class: 'smart-item', 'data-smart-item': i },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked, 'data-smart-pick': i }), h('strong', {}, title),
          dup.has(i) ? h('span', { class: 'badge badge--draft' }, __('Doublon')) : null, x.missingTitle ? h('span', { class: 'badge badge--draft' }, __('Sans titre')) : null),
        h('ul', { class: 'smart-fields' }, found, dropped));
    });
    const dropped = result.value.reduce((t, x) => t + x.dropped.length, 0);
    out.replaceChildren(...[
      h('p', { class: 'hint' }, [
        __n(result.value.length, '{n} élément trouvé', '{n} éléments trouvés'),
        dropped ? __n(dropped, '{n} valeur écartée (à saisir à la main)', '{n} valeurs écartées (à saisir à la main)') : '',
        result.truncated ? __('{n} au-delà du maximum', { n: result.truncated }) : '',
        result.translated ? __('textes traduits en {lang}', { lang: def().toUpperCase() }) : ''
      ].filter(Boolean).join(' · ') + __('. Ils seront créés en brouillon, textes marqués « à relire ».')),
      h('ol', { class: 'smart-items' }, rows),
      poster && c.imageField ? h('p', { class: 'hint' }, __('La photo de l’affiche deviendra l’image de l’élément.')) : null].filter(Boolean));
    const upd = () => { const n = out.querySelectorAll('[data-smart-pick]:checked').length; create.textContent = __n(n, 'Créer {n} brouillon', 'Créer {n} brouillons'); create.disabled = !n; };
    out.addEventListener('change', upd);
    create.hidden = false;
    upd();
    status.textContent = __('Vérifiez, décochez ce qui ne convient pas, puis créez.');
    f.step('preview', __('Aperçu : {items}, {n} coché(s)', { items: Math.abs(result.value.length) <= 1 ? __c('item', '{n} élément', { n: result.value.length }) : __c('item', '{n} éléments', { n: result.value.length }), n: out.querySelectorAll('[data-smart-pick]:checked').length }), { items: result.value.length, checked: out.querySelectorAll('[data-smart-pick]:checked').length, duplicates: result.duplicates?.length || 0, dropped, missingTitle: result.value.filter(x => x.missingTitle).length || undefined }, 'info');
  }

  function createDrafts() {
    const picks = [...out.querySelectorAll('[data-smart-pick]:checked')].map(x => Number(x.dataset.smartPick));
    if (!picks.length) return;
    let s = state.site;
    const ids = [];
    let assetId = null;
    try {
      if (poster && img && c.imageField) { const ra = addAsset(s, img); s = ra.site; assetId = ra.id; }
      for (const i of picks) {
        const x = result.value[i];
        const values = { ...x.values };
        if (assetId) values[c.imageField] = `asset:${assetId}`;
        const r = addItem(s, c.id, values, { status: 'draft' });
        s = r.site;
        ids.push(r.itemId);
        for (const fd of col(c.id).fields) if (fd.i18n && x.values[fd.key]) s = markAi(s, `ci:${c.id}:${r.itemId}:${fd.key}`, def());
      }
    } catch (e) { f.fail(e, { picks: picks.length }, __('Création impossible : {error}', { error: e.message })); done = true; toast(e.message, 'error'); return; }
    commit(s, { source: 'collections' });
    done = true;
    f.ok(__n(ids.length, '{n} brouillon créé dans « {name} »', '{n} brouillons créés dans « {name} »', { name: c.name }), { items: ids, image: assetId || undefined, skipped: result.value.length - ids.length });
    toast(__n(ids.length, '{n} brouillon créé : relisez-le puis publiez-le.', '{n} brouillons créés : relisez-les puis publiez-les.'));
    d.close();
    hooks.openCollection?.(c.id, { itemId: ids[0] });
  }
}

/* ---------- C : chapô et titres dans le formulaire d'un élément ---------- */
const plainOf = v => String(v ?? '').replace(/<\/p>|<br>/g, '\n').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();

export function decorateItemControls(c, it, controls, rerender) {
  const body = c.fields.find(f => f.type === 'richtext' && f.key !== c.excerptField);
  if (!body) return controls;
  const lang = () => state.lang;
  const textOf = () => { const v = it.values[body.key]; return plainOf(typeof v === 'object' ? (v?.[lang()] || v?.[def()] || '') : v); };
  const titleOf = () => { const v = it.values[c.titleField]; return typeof v === 'object' ? (v?.[lang()] || v?.[def()] || '') : String(v ?? ''); };
  const apply = (key, value, f) => {
    const fd = c.fields.find(x => x.key === key);
    try {
      let s = setItemValue(state.site, c.id, it.id, key, value, fd?.i18n ? lang() : null);
      if (fd?.i18n) s = markAi(s, `ci:${c.id}:${it.id}:${key}`, lang());
      commit(s, { source: 'collections' });
      f.ok(__('{field} remplacé (marqué « à relire », Ctrl+Z pour annuler)', { field: fd?.label || key }), { field: key, chars: value.length, lang: lang() });
      rerender();
    } catch (e) { f.fail(e, { field: key }); toast(e.message, 'error'); }
  };
  const box = (key, makeBody) => {
    const wrap = h('div', { class: 'smart-proposal', 'data-smart-proposal': key });
    return { wrap, show(...kids) { wrap.replaceChildren(...kids); }, clear() { wrap.replaceChildren(); } };
  };
  return controls.map(ctl => {
    const key = ctl.getAttribute?.('data-item-field-wrap');
    const fd = c.fields.find(x => x.key === key);
    if (!fd || fd.type !== 'text') return ctl;
    if (key === c.excerptField) {
      const b = box(key);
      const btn = h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-smart-excerpt': '', title: __('Proposer un chapô à partir de « {field} »', { field: body.label }), onclick: async () => {
        const f = log.flow('smart.excerpt', __('Chapô proposé pour « {title} »', { title: short(titleOf()) }), { collection: c.id, item: it.id, field: key, from: body.key, lang: lang(), chars: textOf().length });
        if (!textOf()) { f.cancel(__('« {field} » est vide : rien à résumer', { field: body.label }), {}); toast(__('Écrivez d’abord « {field} ».', { field: body.label }), 'error'); return; }
        const r = await withAI(__('Chapô'), a => a.excerpt({ title: titleOf(), text: textOf(), lang: lang(), sourceLang: def() }));
        if (!r) { f.fail(new Error(__('proposition impossible (voir ai.excerpt)'))); return; }
        f.step('proposal', __('Proposition : {n} car.', { n: r.value.length }), { chars: r.value.length, via: r.via, translated: r.translated || undefined }, 'info');
        b.show(h('p', { class: 'smart-proposal__text', 'data-smart-proposal-text': '' }, r.value),
          h('div', { class: 'row-btns' },
            h('button', { type: 'button', class: 'btn btn--small btn--primary', 'data-smart-apply': '', onclick: () => apply(key, r.value, f) }, __('Remplacer')),
            h('button', { type: 'button', class: 'btn btn--small', onclick: () => { b.clear(); f.cancel(__('Proposition écartée'), {}); } }, __('Annuler'))));
      } }, __('✨ Proposer'));
      return h('div', { class: 'smart-wrap', 'data-item-field-wrap': key }, ctl, h('div', { class: 'row-btns' }, btn), b.wrap);
    }
    if (key === c.titleField) {
      const b = box(key);
      const btn = h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-smart-headlines': '', title: __('Proposer trois titres'), onclick: async () => {
        const f = log.flow('smart.headlines', __('Titres proposés pour « {title} »', { title: short(titleOf()) }), { collection: c.id, item: it.id, field: key, lang: lang(), chars: textOf().length });
        const r = await withAI(__('Titres'), a => a.headlines({ title: titleOf(), text: textOf(), lang: lang(), sourceLang: def() }));
        if (!r) { f.fail(new Error(__('proposition impossible (voir ai.headlines)'))); return; }
        f.step('proposal', __('{n} titre(s) proposé(s)', { n: r.value.length }), { titles: r.value }, 'info');
        b.show(h('p', { class: 'hint' }, __('Cliquez un titre pour le prendre :')),
          h('div', { class: 'kw-list' }, r.value.map(t => h('button', { type: 'button', class: 'btn btn--small', 'data-smart-title': '', onclick: () => apply(key, t, f) }, t))),
          h('button', { type: 'button', class: 'btn btn--small', onclick: () => { b.clear(); f.cancel(__('Titres écartés'), {}); } }, __('Annuler')));
      } }, __('✨ Titres'));
      return h('div', { class: 'smart-wrap', 'data-item-field-wrap': key }, ctl, h('div', { class: 'row-btns' }, btn), b.wrap);
    }
    return ctl;
  });
}

/* ---------- D : résumé de la relecture ---------- */
export function openReviewSummary() {
  const dg = reviewDigest(state.site);
  log.info('smart.review.open', __('Résumé de la relecture : {digest}', { digest: digestText(dg) }), { total: dg.total, open: dg.open, resolved: dg.resolved, pages: dg.byPage.length, authors: dg.byAuthor.length });
  const aiOut = h('div', { class: 'smart-out', 'data-review-ai': '' });
  let lastText = digestText(dg);
  const copy = h('button', { type: 'button', class: 'btn btn--small', 'data-review-copy': '', onclick: async () => {
    try { await navigator.clipboard.writeText(lastText); log.info('smart.review.copy', __('Résumé copié'), { chars: lastText.length }); toast(__('Résumé copié.')); }
    catch (e) { log.warn('smart.review.copy-fail', __('Copie refusée par le navigateur'), { error: e }); toast(__('Copie refusée par le navigateur.'), 'error'); }
  } }, __('📋 Copier'));
  const btn = h('button', { type: 'button', class: 'btn btn--small btn--ai', 'data-review-ai-run': '', disabled: !dg.open, onclick: async () => {
    const r = await withAI(__('Résumé de la relecture'), a => a.reviewSummary({ site: state.site, lang: state.lang }));
    if (!r) return;
    const { points, tasks } = r.value;
    log.info('smart.review.points', __('{points}, {tasks}', { points: __n(points.length, '{n} point clé', '{n} points clés'), tasks: __n(tasks.length, '{n} tâche', '{n} tâches') }), { points: points.length, tasks: tasks.length, via: r.via });
    lastText = [digestText(dg), '', __('Points clés :'), ...points.map(p => `- ${p}`), '', __('À faire :'), ...tasks.map(t => `[ ] ${t.task} (${t.page}, ${t.author})`)].join('\n');
    aiOut.replaceChildren(
      h('h3', {}, __('Points clés')), h('ul', { 'data-review-points': '' }, points.map(p => h('li', {}, p))),
      h('h3', {}, __('À faire')), h('ol', { class: 'smart-tasks', 'data-review-tasks': '' }, tasks.map(t => h('li', {},
        h('span', {}, t.task, h('small', { class: 'hint' }, t.ai ? ` — ${t.page}, ${t.author}` : __(' — {page}, {author} (texte du commentaire)', { page: t.page, author: t.author }))), ' ',
        h('button', { type: 'button', class: 'btn btn--small', 'data-review-task-go': t.id, onclick: () => { log.info('smart.review.go', __('Aller au commentaire'), { id: t.id, page: t.pageId }); d.close(); hooks.goToComment?.(t.id); } }, __('Aller à'))))));
  } }, __('✨ Points clés et tâches'));
  const d = dialog('reviewSummaryDialog', __('📋 Résumé de la relecture'),
    h('div', { class: 'a11y-form' },
      h('p', { 'data-review-digest': '' }, digestText(dg)),
      dg.byPage.length ? h('div', { class: 'mini-grid' },
        h('div', {}, h('h3', {}, __('Par page (ouverts)')), h('ul', {}, dg.byPage.map(p => h('li', {}, __('{name} : {n}', { name: p.title, n: p.open }))))),
        h('div', {}, h('h3', {}, __('Par auteur')), h('ul', {}, dg.byAuthor.map(a => h('li', {}, __('{name} : {open} ouvert(s) sur {total}', { name: a.name, open: a.open, total: a.total })))))) : null,
      h('div', { class: 'row-btns' }, btn, copy, dg.open ? null : h('span', { class: 'hint' }, __('Aucun commentaire ouvert.'))),
      aiOut),
    h('div', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer'))));
}

/* ---------- E : palette depuis le logo (sans IA) ---------- */
async function pixelsOf(src) {
  const im = new Image();
  im.decoding = 'async';
  if (/^https:/i.test(src)) im.crossOrigin = 'anonymous';
  im.src = src;
  await im.decode();
  const scale = Math.min(1, 200 / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * scale));
  const hh = Math.max(1, Math.round(im.naturalHeight * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = hh;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, w, hh);
  return { data: ctx.getImageData(0, 0, w, hh).data, w, h: hh, natural: `${im.naturalWidth}×${im.naturalHeight}` };
}

export async function openLogoPalette() {
  const logo = String(state.site.header?.logo || '');
  const a = logo.startsWith('asset:') ? state.site.assets?.[logo.slice(6)] : null;
  const src = a ? a.dataUrl : /^https:/i.test(logo) ? logo : '';
  const f = log.flow('smart.palette', __('Palette depuis le logo'), { logo: a ? 'importé' : src ? 'en ligne' : 'aucun', file: a?.file || undefined });
  const out = h('div', { class: 'smart-out', 'data-palette-out': '' });
  const apply = h('button', { type: 'button', class: 'btn btn--primary', 'data-palette-apply': '', hidden: true }, __('Appliquer la palette'));
  const file = h('input', { type: 'file', accept: 'image/*', 'data-palette-file': '', 'aria-label': __('Image du logo') });
  let applied = false;
  const d = dialog('paletteDialog', __('🎨 Palette depuis le logo'),
    h('div', { class: 'a11y-form' },
      h('p', { class: 'hint' }, __('Atelier lit les couleurs du logo, en déduit les six couleurs du site et corrige leur clarté pour que tous les textes restent lisibles (WCAG AA). Rien ne change avant « Appliquer » ; Ctrl+Z revient en arrière.')),
      src ? null : h('label', { class: 'btn btn--small upload' }, __('🖼 Choisir une image de logo'), file),
      out),
    h('div', { class: 'audit__foot' }, h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, __('Fermer')), apply));
  d.addEventListener('close', () => { if (!applied) f.cancel(__('Fermé sans appliquer'), {}); });
  const run = async s => {
    try {
      const px = await pixelsOf(s);
      f.step('pixels', __('Logo lu : {size} px (analysé en {w}×{h})', { size: px.natural, w: px.w, h: px.h }), { natural: px.natural, sample: `${px.w}×${px.h}` });
      const colors = dominantColors(px.data);
      f.step('colors', __('{n} couleur(s) dominante(s)', { n: colors.length }), { colors: colors.map(c => `${c.hex} ${Math.round(c.weight * 100)} %`) }, 'info');
      if (!colors.length) throw new Error(__('Logo entièrement transparent : aucune couleur à lire.'));
      const r = paletteFromColors(colors, { fallback: state.site.theme.palette.c1 });
      if (r.warning) f.warn('no-vivid', r.warning, { colors: colors.map(c => c.hex) });
      f.step('proposal', r.changes.length ? __n(r.changes.length, 'Proposition : {palette} · {n} correction de contraste', 'Proposition : {palette} · {n} corrections de contraste', { palette: Object.values(r.palette).join(' ') }) : __('Proposition : {palette}', { palette: Object.values(r.palette).join(' ') }), { palette: r.palette, roles: r.roles, changes: r.changes, ok: r.ok, failing: r.pairs.filter(p => !p.ok).map(p => p.id) }, 'info');
      const names = { ...Object.fromEntries(Object.entries(PALETTE_NAMES).map(([k, v]) => [k, __(v)])), ...(state.site.theme.paletteNames || {}) };
      out.replaceChildren(...[
        h('div', { class: 'pal-proposal' }, Object.entries(r.palette).map(([k, v]) => h('div', { class: 'pal-swatch', 'data-palette-proposal': k },
          h('span', { class: 'pal-swatch__sw', style: { background: v } }),
          h('span', {}, h('strong', {}, names[k] || k), h('br'), h('code', {}, v), h('br'), h('small', { class: 'hint' }, __('avant {colour} · {role}', { colour: state.site.theme.palette[k] || '—', role: r.roles[k] })))))),
        r.warning ? h('p', { class: 'pub-status is-info' }, r.warning) : null,
        r.changes.length ? h('ul', { class: 'hint' }, r.changes.map(ch => h('li', {}, __('{name} {why} : {from} → {to}', { name: names[ch.key], why: ch.why, from: ch.from, to: ch.to })))) : null,
        h('ul', { class: 'pair-list' }, r.pairs.map(p => h('li', { class: `pair ${p.ok ? 'is-ok' : 'is-bad'}` },
          h('span', { class: 'contrast-badge__sw', style: { background: r.palette[p.bg.slice(8)], color: r.palette[p.fg.slice(8)] }, 'aria-hidden': 'true' }, 'Aa'),
          h('span', {}, __(p.label)), h('strong', {}, `${formatRatio(p.ratio)} ${p.ok ? '✓' : '✗'}`))))].filter(Boolean));
      apply.hidden = false;
      apply.onclick = () => {
        let s2 = state.site;
        try { for (const [k, v] of Object.entries(r.palette)) s2 = setPalette(s2, k, v); }
        catch (e) { f.fail(e); toast(e.message, 'error'); return; }
        commit(s2, { source: 'site' });
        applied = true;
        f.ok(__('Palette appliquée (Ctrl+Z pour revenir à l’ancienne)'), { palette: r.palette, changes: r.changes.length });
        toast(__('Palette appliquée : tout le site suit (Ctrl+Z pour annuler).'));
        d.close();
      };
    } catch (e) {
      const tainted = /tainted|SecurityError|cross-origin/i.test(`${e.name} ${e.message}`);
      applied = true;
      f.fail(e, { hint: tainted ? 'Logo en ligne sans autorisation CORS : importez-le dans le projet.' : undefined }, tainted ? __('Logo en ligne illisible (autorisation CORS) : importez-le dans le projet') : __('Logo illisible : {error}', { error: e.message }));
      out.replaceChildren(h('p', { class: 'pub-status is-error' }, tainted ? __('Ce logo en ligne ne peut pas être lu (le site qui l’héberge ne l’autorise pas) : importez l’image dans le projet.') : __('Logo illisible : {error}', { error: e.message })));
    }
  };
  file.addEventListener('change', async () => {
    const fl = file.files?.[0];
    if (!fl) return;
    f.step('file', __('Image choisie : {name}', { name: short(fl.name, 80) }), { type: fl.type, kb: Math.round(fl.size / 1024) });
    const url = URL.createObjectURL(fl);
    await run(url);
    URL.revokeObjectURL(url);
  });
  if (src) await run(src);
  else f.step('no-logo', __('Pas de logo importé : choisir une image'), {}, 'info');
}
