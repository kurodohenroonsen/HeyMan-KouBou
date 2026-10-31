/* Contrôles de l'inspecteur pour chaque type de champ de widget. */
import { h, toast, icon } from './dom.js';
import { askText } from './dialog.js';
import { linkError } from '../core/dialog.js';
import { blockFormats } from '../core/richtext-commands.js';
import { state, root, commitRoot, commit, siteWithRoot, clearReview } from './store.js';
import { setProp, setListItemProp, addListItem, removeListItem, moveListItem } from '../core/tree.js';
import { addAsset, addDocument, updatePageRoot, LANG_LABELS } from '../core/site.js';
import { DOC_ACCEPT, MAX_DOC_BYTES, docMeta, docTypeOf } from '../core/documents.js';
import { escapeHtml } from '../core/escape.js';
import { richToText, sanitizeRich } from '../core/sanitize.js';
import { imageToWebp } from './images.js';
import { makeEditable, format } from './richedit.js';
import { ICONS } from '../core/icons.js';
import { log } from './log.js';
import { __, __c, N_ } from '../core/ui-i18n.js';

let uid = 0;
const fid = () => `f${++uid}`;

/* Adresse https:// (écrit sans « // » littéral : l'extraction des chaînes le prendrait pour un commentaire) */
const isHttps = u => /^https:[/]{2}/.test(u);
const hasText = v => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim() !== '';

function languageRows(field, value, renderInput) {
  const s = state.site;
  const def = s.defaultLanguage;
  const defFilled = hasText(value?.[def]);
  return h('div', { class: 'i18n' }, s.languages.map(lang => {
    const missing = lang !== def && defFilled && !hasText(value?.[lang]);
    const id = fid();
    const row = h('div', { class: 'i18n__row' + (missing ? ' is-missing' : '') + (lang === state.lang ? ' is-current' : '') },
      h('label', { class: 'i18n__lang', for: id, title: LANG_LABELS[lang] }, lang.toUpperCase()));
    row.append(renderInput(lang, id, v => row.classList.toggle('is-missing', lang !== def && defFilled && !hasText(v))));
    return row;
  }));
}

function placeholderFor(value, lang) {
  const def = state.site.defaultLanguage;
  if (lang === def) return '';
  const src = richToText(value?.[def] || '');
  return src ? __('À traduire : {text}', { text: src.slice(0, 50) }) : '';
}

/* Journal : champ modifié (nom, type, langue ; jamais le texte saisi, seulement sa longueur) */
function logField(field, value, lang, how) {
  const v = typeof value === 'string' && !['select', 'icon'].includes(field.type) ? { chars: richToText(value).length } : typeof value === 'boolean' || typeof value === 'number' ? { value } : {};
  log.debug('inspector.field', __('Champ modifié : {field}', { field: __(field.label) || field.key }), { key: field.key, type: field.type, lang: lang || undefined, how, ...v, option: field.type === 'select' || field.type === 'icon' ? value : undefined });
}

/* write(value, lang) applique la modification ; key regroupe l'historique */
export function fieldControl(field, value, write, keyBase) {
  const label = h('span', { class: 'field__label' }, __(field.label));
  const wrap = h('div', { class: 'field', 'data-field-wrap': field.key }, label);
  const key = lang => `${keyBase}:${field.key}:${lang || ''}`;

  switch (field.type) {
    case 'text':
    case 'inline': {
      if (field.i18n) {
        const formatted = Object.values(value || {}).some(v => /<[a-z]/i.test(v || ''));
        wrap.append(languageRows(field, value, (lang, id, mark) => {
          const input = h('input', { class: 'input', id, type: 'text', lang, 'data-field': field.key, placeholder: placeholderFor(value, lang) });
          input.value = field.type === 'inline' ? richToText(value?.[lang] || '') : (value?.[lang] || '');
          input.addEventListener('input', () => {
            mark(input.value);
            write(field.type === 'inline' ? escapeHtml(input.value) : input.value, lang, key(lang));
          });
          /* Enregistré à chaque frappe ; journalisé une fois, à la sortie du champ */
          input.addEventListener('change', () => logField(field, input.value, lang, 'saisie'));
          return input;
        }));
        if (field.type === 'inline' && formatted) wrap.append(h('p', { class: 'hint' }, __('Ce texte contient de la mise en forme : modifiez-le directement dans la page (double-clic) pour la garder.')));
        else if (field.type === 'inline') wrap.append(h('p', { class: 'hint' }, __('Double-cliquez sur le texte dans la page pour le modifier et le mettre en forme.')));
      } else {
        const input = h('input', { class: 'input', type: 'text', 'data-field': field.key });
        input.value = value || '';
        input.addEventListener('input', () => write(input.value, null, key()));
        input.addEventListener('change', () => logField(field, input.value, null, 'saisie'));
        wrap.append(input);
      }
      return wrap;
    }
    case 'richtext': {
      wrap.append(languageRows(field, value, (lang, id, mark) => {
        const box = h('div', { class: 'rich-field' });
        const area = h('div', { class: 'rich-input', id, lang, 'data-field': field.key, role: 'textbox', 'aria-multiline': 'true', 'aria-label': `${__(field.label)} (${LANG_LABELS[lang]})`, 'data-placeholder': placeholderFor(value, lang) });
        area.innerHTML = sanitizeRich(value?.[lang] || '');
        const push = html => { mark(html); write(html, lang, key(lang)); };
        let typed = false;
        makeEditable(area, { onInput: html => { typed = true; push(html); }, onDone: html => { if (typed) logField(field, html, lang, 'texte riche'); typed = false; } });
        const btn = (cmd, text, title) => h('button', { type: 'button', class: 'rt-btn', 'data-rt': cmd, title, 'aria-label': title, onmousedown: e => e.preventDefault(), onclick: async () => {
          let arg;
          if (cmd === 'link') {
            const sel = area.ownerDocument.getSelection();
            const range = sel.rangeCount && area.contains(sel.getRangeAt(0).commonAncestorContainer) ? sel.getRangeAt(0).cloneRange() : null;
            arg = await askText({ id: 'linkUrlDialog', title: __('Lien'), label: __('Adresse du lien (https://…, mailto:…, #ancre)'), value: 'https://', validate: linkError, ok: __('Créer le lien') });
            if (arg === null) return;
            area.focus();
            if (range) { sel.removeAllRanges(); sel.addRange(range); }
          }
          if (format(area, cmd, arg)) push(sanitizeRich(area.innerHTML));
        } }, typeof text === 'string' ? text : icon(text.icon, 15));
        /* Menu « Format » : la sélection du texte est retenue avant que la liste prenne le focus, puis rendue */
        let saved = null;
        const fmt = h('select', { class: 'control', 'data-rt': 'format', 'aria-label': __('Format : intertitre, citation, exposant'),
          onmousedown: () => { const s = area.ownerDocument.getSelection(); saved = s.rangeCount && area.contains(s.getRangeAt(0).commonAncestorContainer) ? s.getRangeAt(0).cloneRange() : null; } },
          h('option', { value: '' }, __('Format…')), blockFormats().map(f => h('option', { value: f.tag }, f.label)),
          h('option', { value: 'sup' }, __('Exposant')), h('option', { value: 'sub' }, __('Indice')));
        fmt.addEventListener('change', () => {
          const cmd = fmt.value;
          fmt.value = '';
          if (!cmd) return;
          area.focus();
          if (saved) { const s = area.ownerDocument.getSelection(); s.removeAllRanges(); s.addRange(saved); }
          if (format(area, cmd)) push(sanitizeRich(area.innerHTML));
        });
        box.append(h('div', { class: 'rt-bar' }, btn('bold', __c('bold', 'G'), __('Gras (Ctrl+B)')), btn('italic', 'I', __('Italique (Ctrl+I)')), btn('underline', __c('underline', 'S'), __('Souligné (Ctrl+U)')),
          btn('link', { icon: 'link' }, __('Lien')), btn('ul', { icon: 'list-ul' }, __('Liste à puces')), btn('ol', { icon: 'list-ol' }, __('Liste numérotée')), fmt,
          btn('clear', { icon: 'clear' }, __('Retirer la mise en forme'))), area);
        return box;
      }));
      return wrap;
    }
    case 'select': {
      const sel = h('select', { class: 'control', 'data-field': field.key, 'aria-label': __(field.label) },
        field.options.map(o => h('option', { value: o.value, selected: o.value === value }, __(o.label))));
      sel.addEventListener('change', () => { logField(field, sel.value, null, 'liste'); write(sel.value, null); });
      wrap.append(sel);
      return wrap;
    }
    case 'icon': {
      const sel = h('select', { class: 'control', 'data-field': field.key, 'aria-label': __(field.label) },
        Object.entries(ICONS).map(([k, ic]) => h('option', { value: k, selected: k === value }, __(ic.label))));
      sel.addEventListener('change', () => { logField(field, sel.value, null, 'liste'); write(sel.value, null); });
      wrap.append(sel);
      return wrap;
    }
    case 'url': {
      const input = h('input', { class: 'input', type: 'text', 'data-field': field.key, placeholder: __('https://…, #ancre, mailto:…, tel:…'), spellcheck: 'false' });
      input.value = value || '';
      input.addEventListener('input', () => { write(input.value.trim(), null, key()); pick.value = ''; });
      input.addEventListener('change', () => log.debug('inspector.field', __('Lien modifié : {field}', { field: __(field.label) || field.key }), { key: field.key, type: 'url', how: 'saisie', kind: linkKind(input.value.trim()) }));
      const pick = linkPicker(value, v => { input.value = v; write(v, null); }, { popups: !!field.popups });
      pick.setAttribute('data-link-pick', field.key);
      wrap.append(input, pick);
      return wrap;
    }
    case 'toggle': {
      const cb = h('input', { type: 'checkbox', 'data-field': field.key, checked: !!value });
      cb.addEventListener('change', () => { logField(field, cb.checked, null, 'case'); write(cb.checked, null); });
      wrap.replaceChildren(h('label', { class: 'check' }, cb, __(field.label)));
      return wrap;
    }
    case 'number': {
      const input = h('input', { class: 'input', type: 'number', 'data-field': field.key, min: field.min, max: field.max, step: field.step || 1 });
      input.value = value ?? '';
      input.addEventListener('input', () => { if (input.value !== '') write(Number(input.value), null, key()); });
      input.addEventListener('change', () => { if (input.value === '') log.debug('inspector.field-empty', __('Champ nombre vidé : valeur précédente gardée ({field})', { field: __(field.label) || field.key }), { key: field.key }); else logField(field, Number(input.value), null, 'saisie'); });
      wrap.append(input);
      return wrap;
    }
    case 'image': {
      wrap.append(imageControl(value, v => write(v, null), field.key));
      return wrap;
    }
    case 'document': {
      wrap.append(documentControl(value, v => write(v, null), field.key));
      return wrap;
    }
    default:
      return wrap;
  }
}

/* Cycle 33 (W4) : champ « Fichier » — document à télécharger (PDF, DOCX, MP3…, 25 Mo au plus), gardé dans le projet */
function readDataUrl(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
}
export function documentControl(value, set, dataField = 'file') {
  const v = String(value || '');
  const asset = v.startsWith('asset:') ? state.site.assets[v.slice(6)] : null;
  const input = h('input', { type: 'file', accept: DOC_ACCEPT, 'data-field': dataField, 'aria-label': __('Importer un fichier') });
  input.addEventListener('change', async () => {
    const f0 = input.files?.[0];
    if (!f0) return;
    const info = { field: dataField, name: f0.name.slice(0, 80), kb: Math.max(1, Math.round(f0.size / 1024)) };
    if (!docTypeOf(f0.name) || f0.size > MAX_DOC_BYTES) {
      const msg = !docTypeOf(f0.name) ? __('Type de fichier non pris en charge : PDF, DOCX, ODT, XLSX, PPTX, ZIP, MP3, M4A, OGG ou ICS.') : __('Fichier trop lourd : 25 Mo au plus.');
      log.warn('inspector.document-refused', __('Fichier refusé : {error}', { error: msg }), info);
      toast(msg, 'error');
      input.value = '';
      return;
    }
    const f = log.flow('inspector.document', __('Import du fichier « {name} »', { name: info.name }), info);
    try {
      const r = addDocument(state.site, { name: f0.name, dataUrl: await readDataUrl(f0) });
      state.site = r.site;
      set(`asset:${r.id}`);
      const a = r.site.assets[r.id];
      f.ok(__('Fichier ajouté : {file} ({meta})', { file: a.file, meta: docMeta(a, 'fr') }), { asset: r.id, file: a.file, mime: a.mime, kb: Math.max(1, Math.round(a.size / 1024)) });
      toast(__('Fichier ajouté : {file} ({meta}).', { file: a.file, meta: docMeta(a, state.lang) }));
    } catch (e) { f.fail(e, info, __('Fichier non importé : {error}', { error: e.message })); toast(e.message, 'error'); }
  });
  return h('div', { class: 'doc-field', 'data-doc-field': dataField },
    asset ? h('p', { class: 'doc-field__name' }, `📄 ${asset.file} · ${docMeta(asset, state.lang)}`) : h('p', { class: 'hint' }, __('Aucun fichier : le lien ordinaire est utilisé.')),
    h('div', { class: 'row-btns' },
      h('label', { class: 'btn btn--small upload' }, asset ? __('Remplacer le fichier') : __('Importer un fichier'), input),
      asset ? h('button', { class: 'btn btn--small', type: 'button', 'data-doc-remove': dataField, onclick: () => { log.debug('inspector.document-remove', __('Fichier retiré du champ (il reste dans le projet)'), { field: dataField, asset: v.slice(6) }); set(''); } }, __('Retirer')) : null));
}

export function imageControl(value, set, dataField = 'image', onAsset) {
  const s = state.site;
  const v = String(value || '');
  const asset = v.startsWith('asset:') ? s.assets[v.slice(6)] : null;
  const src = asset ? asset.dataUrl : (/^https:\/\//.test(v) ? v : '');
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg', 'data-field': dataField, 'aria-label': __('Importer une image') });
  file.addEventListener('change', async () => {
    const f0 = file.files?.[0];
    if (!f0) { log.debug('inspector.image-none', __('Choix d’image annulé'), { field: dataField }); return; }
    const f = log.flow('inspector.image', __('Import d’une image'), { field: dataField, type: f0.type || '?', kb: Math.round(f0.size / 1024) });
    try {
      const img = await imageToWebp(f0);
      const fmt = img.mime === 'image/webp' ? 'WebP' : img.mime === 'image/jpeg' ? 'JPEG' : img.mime === 'image/svg+xml' ? 'SVG' : String(img.mime || '').replace('image/', '').toUpperCase();
      f.step('webp', __('Image convertie en {format}', { format: fmt }), { mime: img.mime, width: img.width, height: img.height, kb: Math.max(1, Math.round(img.bytes / 1024)), variants: img.variants?.length || undefined });
      const r = addAsset(state.site, img);
      if (onAsset) onAsset(r.site, `asset:${r.id}`);
      else {
        state.site = r.site;
        set(`asset:${r.id}`);
      }
      f.ok(__('Image ajoutée : {w}×{h} px', { w: img.width, h: img.height }), { asset: r.id, field: dataField });
      toast(__('Image ajoutée en {format} : {w}×{h} px, {kb} Ko.', { format: fmt, w: img.width, h: img.height, kb: Math.max(1, Math.round(img.bytes / 1024)) }));
    } catch (e) { f.fail(e, { field: dataField, type: f0.type }, __('Image non importée : {error}', { error: e.message })); toast(e.message, 'error'); }
  });
  const url = h('input', { class: 'input', type: 'url', placeholder: __('ou adresse d’une image en ligne (https://…)'), spellcheck: 'false' });
  url.value = asset ? '' : v;
  url.addEventListener('change', () => { const u = url.value.trim(); log.add(u && !isHttps(u) ? 'warn' : 'debug', 'inspector.image-url', u ? (isHttps(u) ? __('Image en ligne choisie (adresse https)') : __('Adresse d’image sans https:// : elle risque d’être refusée ou bloquée')) : __('Adresse d’image effacée'), { field: dataField, https: isHttps(u), chars: u.length }); set(u); });
  return h('div', { class: 'image-field' },
    src ? h('img', { src, alt: '' }) : h('div', { class: 'image-empty' }, __('Aucune image')),
    h('div', { class: 'row-btns' },
      h('label', { class: 'btn btn--small upload' }, src ? __('Remplacer') : __('Importer une image'), file),
      src ? h('button', { class: 'btn btn--small', type: 'button', onclick: () => { log.debug('inspector.image-remove', __('Image retirée du champ (le fichier reste dans le projet)'), { field: dataField }); set(''); } }, __('Retirer')) : null),
    url);
}

/* Éditeur complet des champs d'un nœud (onglet Contenu) */
export function nodeFields(node) {
  const def = node.fields;
  return def;
}

export function listControl(node, field) {
  const items = node.props[field.key] || [];
  const wrap = h('div', { class: 'field', 'data-field-wrap': field.key }, h('span', { class: 'field__label' }, __(field.label)));
  const itemLabel = __(field.itemLabel) || __('Élément');
  const apply = (fn, opts, what) => {
    try { commitRoot(fn(root()), opts); if (what) log.debug('inspector.list', __('{item} : {action}', { item: itemLabel, action: __(what.action) }), { key: field.key, id: node.id, ...what }); }
    catch (e) { log.warn('inspector.refused', __('Liste « {label} » : {error}', { label: __(field.label), error: e.message }), { what: 'list', key: field.key, id: node.id, error: e }); toast(e.message, 'error'); }
  };
  wrap.append(h('div', { class: 'list-items' }, items.map((item, i) => {
    const card = h('details', { class: 'list-item', open: items.length <= 3 },
      h('summary', { class: 'list-item__head' },
        h('strong', {}, `${itemLabel} ${i + 1}`),
        h('span', { class: 'list-item__sum' }, richToText(Object.values(item).map(v => (typeof v === 'object' ? v?.[state.site.defaultLanguage] : '')).find(Boolean) || '')),
        h('span', { class: 'list-item__tools' },
          h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': __('Monter'), disabled: i === 0, onclick: e => { e.preventDefault(); apply(r => moveListItem(r, node.id, field.key, i, -1), undefined, { action: N_('monté'), index: i }); } }, '↑'),
          h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': __('Descendre'), disabled: i === items.length - 1, onclick: e => { e.preventDefault(); apply(r => moveListItem(r, node.id, field.key, i, 1), undefined, { action: N_('descendu'), index: i }); } }, '↓'),
          h('button', { class: 'icon-btn icon-btn--sm', type: 'button', 'aria-label': __('Supprimer'), onclick: e => { e.preventDefault(); apply(r => removeListItem(r, node.id, field.key, i), undefined, { action: N_('supprimé'), index: i }); } }, '✕'))));
    for (const sf of field.fields) {
      card.append(fieldControl(sf, item[sf.key], (v, lang, key) => {
        if (sf.type === 'image' || sf.type === 'document') {
          apply(r => setListItemProp(r, node.id, field.key, i, sf.key, v, lang));
          return;
        }
        apply(r => setListItemProp(r, node.id, field.key, i, sf.key, v, lang), { key, source: 'inspector' });
      }, `${node.id}:${field.key}:${i}`));
    }
    return card;
  })));
  wrap.append(h('button', { class: 'btn btn--small', type: 'button', 'data-list-add': field.key, onclick: () => apply(r => addListItem(r, node.id, field.key), undefined, { action: N_('ajouté'), count: items.length + 1 }) }, `+ ${itemLabel}`));
  return wrap;
}

export function propWriter(node) {
  return (key, sourceInspector = true) => (value, lang, histKey) => {
    try {
      const next = setProp(root(), node.id, key, value, lang);
      commit(clearReview(siteWithRoot(state.site, next), node.id, key, lang), histKey ? { key: histKey, source: sourceInspector ? 'inspector' : undefined } : {});
    } catch (e) { log.warn('inspector.refused', __('Valeur refusée pour « {key} » : {error}', { key, error: e.message }), { what: 'field', key, lang: lang || undefined, id: node.id, type: node.type, error: e }); toast(e.message, 'error'); }
  };
}

/* Liste déroulante : pages du site et ancres de la page courante */
export function linkPicker(value, set, { popups = false } = {}) {
  const s = state.site;
  const def = s.defaultLanguage;
  const anchors = [];
  const cur = s.pages.find(p => p.id === state.pageId);
  const visit = n => { if (n.advanced?.anchor) anchors.push(n.advanced.anchor); (n.children || []).forEach(visit); };
  if (cur) visit(cur.root);
  const v = String(value || '');
  const untitled = __('Sans titre');
  const home = __('accueil');
  const pageOption = p => `${richToText(p.title?.[def] || '') || untitled} (${p.slug ? `/${p.slug}/` : home})`;
  const sel = h('select', { class: 'control control--sm', 'aria-label': __('Choisir une page ou une ancre') },
    h('option', { value: '' }, __('Lier à une page ou une section…')),
    h('optgroup', { label: __('Pages du site') }, s.pages.map(p => h('option', { value: `page:${p.id}`, selected: v === `page:${p.id}` }, pageOption(p)))),
    anchors.length ? h('optgroup', { label: __('Sections de cette page') }, anchors.map(a => h('option', { value: `#${a}`, selected: v === `#${a}` }, `#${a}`))) : null,
    popups && Object.keys(s.components || {}).length ? h('optgroup', { label: __('Ouvrir en fenêtre (popup)') }, Object.values(s.components).map(c => h('option', { value: `popup:${c.id}`, selected: v === `popup:${c.id}` }, `▣ ${c.name}`))) : null);
  sel.addEventListener('change', () => { if (sel.value) { log.debug('inspector.link-pick', __('Lien choisi dans la liste : {kind}', { kind: __(linkKind(sel.value)) }), { kind: linkKind(sel.value), value: sel.value.slice(0, 60) }); set(sel.value); } });
  return sel;
}

/* Sorte de lien, pour le journal (sans l'adresse complète) */
function linkKind(v) {
  const s = String(v || '');
  if (!s) return N_('vide');
  if (s.startsWith('page:')) return N_('page');
  if (s.startsWith('popup:')) return N_('fenêtre (popup)');
  if (s.startsWith('#')) return N_('ancre');
  if (/^mailto:/i.test(s)) return N_('e-mail');
  if (/^tel:/i.test(s)) return N_('téléphone');
  if (/^https:[/]{2}/i.test(s)) return N_('https');
  if (/^http:[/]{2}/i.test(s)) return N_('http (non sécurisé)');
  return N_('autre');
}
