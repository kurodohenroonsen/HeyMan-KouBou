/* Barre de commandes (Ctrl+K) et aide des raccourcis (?). */
import { h, $, toast } from './dom.js';
import { UI_LANGS, uiLang, __, __c } from '../core/ui-i18n.js';
import { setUiLang } from './ui-lang.js';
import { openGuide } from './help.js';
import { saveProject } from './storage.js';
import { state, root, select, setView, undo, redo, emit, commit, setEditTarget } from './store.js';
import { REGISTRY, isWidget } from '../core/widgets.js';
import { TEMPLATES, buildTemplate } from '../core/templates.js';
import { STYLE_PROPS } from '../core/style.js';
import { walk } from '../core/tree.js';
import { translate } from '../core/render.js';
import { LANG_LABELS } from '../core/site.js';
import { nodeLabel, nodeSummary } from '../core/editing.js';
import { rankCommands } from '../core/commands.js';
import { insertWidget, insertSection, duplicateSelected, deleteSelected, copyStyle, pasteStyle, selectParent, insertComponent, createComponentFromSelected } from './actions.js';
import { customizeHeader, customizeFooter } from '../core/layout.js';
import { focusStyleField } from './styletab.js';
import { openAudit } from './audit-ui.js';
import { openTranslations } from './i18n-ui.js';
import { openPublish } from './publish-ui.js';
import { openVersions } from './versions-ui.js';
import { openCollection, openNewCollection } from './collections-ui.js';
import { openSeo } from './seo-ui.js';
import { openLog } from './log-ui.js';
import { openLogoPalette, openReviewSummary } from './smart-ui.js';
import { openAsk } from './assistant-ui.js';
import { openBench } from './bench-ui.js';
import { log } from './log.js';
import { openAI } from './ai-ui.js';

const RECENT_KEY = 'atelier-cmdk-recent';
let recent = [];
try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(x => typeof x === 'string').slice(0, 8); } catch { recent = []; }

let dialog = null;
let items = [];
let active = 0;
let hooks = {};

export function setCommandHooks(h) { hooks = h; }

function remember(id) {
  recent = [id, ...recent.filter(x => x !== id)].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { /* stockage indisponible */ }
}

function panel(name) {
  state.left = name;
  document.querySelector(`[data-left="${name}"]`)?.click();
}

function buildCommands() {
  const s = state.site;
  const def = s.defaultLanguage;
  const list = [];
  const add = (id, group, label, run, keywords = '', kbd = '', weight = 1) => list.push({ id, group, label, run, keywords, kbd, weight });

  for (const [type, d] of Object.entries(REGISTRY)) if (isWidget(type)) add(`add:${type}`, __('Ajouter'), __('Ajouter : {label}', { label: __(d.label) }), () => insertWidget(type), `${d.label} ${d.category} ${__(d.category)} widget insérer add insert 追加 挿入`);
  for (const t of TEMPLATES) add(`tpl:${t.id}`, __('Modèle'), __('Modèle : {label}', { label: __(t.label) }), () => insertSection(null, buildTemplate(t.id)), `${t.description} ${__(t.description)} section template テンプレート セクション`);
  for (const c of Object.values(s.components || {})) add(`cmp:${c.id}`, __('Composant'), __('Composant : {name}', { name: c.name }), () => insertComponent(c.id), 'réutilisable insérer bloc component reusable insert block コンポーネント 再利用 ブロック');
  for (const c of Object.values(s.collections || {})) {
    add(`col:${c.id}`, __('Contenus'), __('Contenus : {name} ({n})', { name: c.name, n: c.items.length }), () => openCollection(c.id), 'collection éléments liste membres agenda actualités items list members events news コレクション 項目 リスト メンバー イベント ニュース');
    add(`colcard:${c.id}`, __('Contenus'), __('Modifier la carte : {name}', { name: c.name }), () => setEditTarget({ kind: 'card', id: c.id }), 'modèle gabarit carte template card layout テンプレート カード');
    add(`coldetail:${c.id}`, __('Contenus'), __('Modifier la page de détail : {name}', { name: c.name }), () => setEditTarget({ kind: 'detail', id: c.id }), 'modèle gabarit page élément template detail item テンプレート 詳細ページ 項目');
  }
  add('act:seo', __('Action'), __('Référencement (SEO) : notes, aperçu Google, conseils'), () => openSeo(), 'seo google description titre mot-clé référencement title keyword search 検索 キーワード タイトル 説明');
  add('act:ai', __('Action'), __('IA locale (Gemini Nano) : état et téléchargement'), () => openAI(), 'ia nano gemini intelligence artificielle ai artificial intelligence model download AI 人工知能 モデル ダウンロード');
  add('act:ask', __('IA'), __('✨ Demander à Atelier (décrire ce que vous voulez)'), () => openAsk(''), 'demander assistant ia faire créer ajouter langage naturel ask ai create add natural language 頼む アシスタント AI 作成 追加');
  add('act:bench', __('IA'), __('🧪 Banc d’essai de l’IA locale (tester Gemini Nano, rapport)'), () => openBench(), 'test nano gemini ia rapport essai bench ai report テストベンチ AI レポート');
  add('act:palette-logo', __('Action'), __('Palette depuis le logo (couleurs du site, contrastes corrigés)'), () => openLogoPalette(), 'couleurs palette logo charte colours colors brand パレット ロゴ 色');
  add('act:review-summary', __('Action'), __('Résumé de la relecture (commentaires, tâches)'), () => openReviewSummary(), 'commentaires relecture résumé tâches comments review summary tasks コメント レビュー 要約 タスク');
  add('act:selftest', __('Action'), __('🧪 Auto-test des cas d’usage (rapport, projet remis comme avant)'), async () => { const { runAutotest } = await import('./selftest-ui.js'); runAutotest(); }, 'test auto autotest selftest verifier cas usage rapport rollback self-test check report セルフテスト レポート ロールバック');
  for (const [l, name] of Object.entries(UI_LANGS)) if (l !== uiLang()) add(`act:ui-${l}`, __('Action'), `🌍 ${name}`, () => setUiLang(l, { save: () => saveProject(state.site) }), `langue interface language 言語 表示言語 ${l} ${name}`);
  add('act:guide', 'Action', __('📖 Guide d’utilisation'), () => openGuide(), `guide aide help manuel documentation ガイド ヘルプ ${__('Guide d’utilisation')}`, 'F1');
  add('act:log', __('Action'), __('Journal de débogage : copier, télécharger, journal du serveur'), () => openLog(), 'journal log debug bug erreur console error デバッグログ ログ エラー', 'Ctrl+Alt+J');
  add('act:collection', __('Contenus'), __('Nouvelle collection (membres, actualités, agenda…)'), () => openNewCollection(), 'créer liste contenus répétés cms create new list content collection 作成 新規 リスト コンテンツ コレクション');
  for (const z of ['header', 'footer']) add(`zone:${z}`, __('Site'), z === 'header' ? __('Modifier l’en-tête du site') : __('Modifier le pied de page du site'), () => {
    if (!state.site.layout?.[z]) commit(z === 'header' ? customizeHeader(state.site) : customizeFooter(state.site), { source: 'site' });
    setEditTarget({ kind: z });
  }, z === 'header' ? 'menu logo navigation haut header top ヘッダー メニュー ロゴ' : 'bas footer bottom フッター');
  if (state.editTarget) add('act:done', __('Action'), __('Terminer la modification en cours'), () => setEditTarget(null), 'quitter fermer done finish exit close 終了 閉じる');
  for (const p of s.pages) add(`page:${p.id}`, __('Page'), __('Page : {title}', { title: translate(s, p.title, def) || __('Sans titre') }), () => setView({ pageId: p.id }), p.slug ? `/${p.slug}/` : 'accueil home ホーム');

  const editRootNode = root();
  if (editRootNode) {
    let n = 0;
    walk(editRootNode, node => {
      if (node.type === 'page' || n > 300) return true;
      n++;
      const sum = nodeSummary(node, s, state.lang);
      add(`node:${node.id}`, __('Élément'), sum ? __('{label} : {summary}', { label: nodeLabel(node), summary: sum }) : nodeLabel(node), () => select(node.id, { scroll: true }), node.advanced?.anchor ? `#${node.advanced.anchor}` : '', '', 0.85);
      return true;
    });
  }

  add('device:desktop', __('Affichage'), __('Appareil : Ordinateur'), () => setView({ device: 'desktop' }), 'écran desktop computer screen デスクトップ 画面 パソコン');
  add('device:tablet', __('Affichage'), __('Appareil : Tablette'), () => setView({ device: 'tablet' }), 'ipad tablet タブレット');
  add('device:mobile', __('Affichage'), __('Appareil : Mobile'), () => setView({ device: 'mobile' }), 'téléphone smartphone phone mobile モバイル スマホ 携帯');
  for (const l of s.languages) add(`lang:${l}`, __('Affichage'), __('Langue : {lang}', { lang: LANG_LABELS[l] }), () => setView({ lang: l }), `${l} language 言語`);
  for (const [k, label, kw] of [['widgets', __('Widgets'), 'widgets ウィジェット'], ['templates', __('Modèles'), 'templates テンプレート'], ['navigator', __('Structure'), 'structure tree 構造'], ['pages', __('Pages'), 'pages ページ'], ['content', __('Contenus (collections)'), 'content collections コンテンツ コレクション'], ['site', __('Site (couleurs, polices, presets)'), 'site colours colors fonts presets サイト 色 フォント プリセット']]) add(`panel:${k}`, __('Panneau'), __('Panneau : {label}', { label }), () => panel(k), `panneau panel パネル ${kw}`);

  if (state.selected) {
    for (const [k, d] of Object.entries(STYLE_PROPS)) add(`style:${k}`, __('Réglage'), __('Réglage : {label}', { label: __(d.label) }), () => {
      state.insp = 'style';
      state.styleState = 'normal';
      emit('styleState');
      setTimeout(() => { if (!focusStyleField(k)) toast(__('« {label} » ne s’applique pas à cet élément.', { label: __(d.label) }), 'error'); }, 0);
    }, `${d.label} ${d.group} ${__(d.group)} style setting 設定 スタイル`);
    add('act:duplicate', __('Action'), __('Dupliquer la sélection'), duplicateSelected, 'copie duplicate copy 複製 コピー', 'Ctrl+D');
    add('act:delete', __('Action'), __('Supprimer la sélection'), deleteSelected, 'effacer delete remove erase 削除', __('Suppr'));
    add('act:copystyle', __('Action'), __('Copier le style'), copyStyle, 'copy style スタイル コピー');
    add('act:pastestyle', __('Action'), __('Coller le style'), pasteStyle, 'paste style スタイル 貼り付け');
    add('act:parent', __('Action'), __('Sélectionner le parent'), selectParent, 'select parent 親 選択', __('Échap'));
    add('act:component', __('Action'), __('Créer un composant à partir de la sélection'), createComponentFromSelected, 'réutiliser symbole component reuse symbol コンポーネント 再利用');
  }
  add('act:undo', __('Action'), __c('undo', 'Annuler'), undo, 'retour undo back 元に戻す 取り消し', 'Ctrl+Z');
  add('act:redo', __('Action'), __('Rétablir'), redo, 'refaire redo やり直す', __('Ctrl+Maj+Z'));
  add('act:export', __('Action'), __('Exporter le site'), () => openAudit('export'), 'zip publier télécharger export download publish 書き出し ダウンロード');
  add('act:audit', __('Action'), __('Vérifier le site (accessibilité, liens)'), () => openAudit('export'), 'contrôle erreurs check errors accessibility links チェック エラー アクセシビリティ リンク');
  add('act:translate', __('Action'), __('Textes à traduire'), () => openAudit('translations'), 'traduction langues translation languages 翻訳 言語 未翻訳');
  add('act:i18n', __('Action'), __('Tableau des traductions (CSV, traduction automatique)'), () => openTranslations(), 'langues traduire relire csv translations translate review languages 翻訳 言語 要確認');
  add('act:newpage', __('Action'), __('Nouvelle page'), () => { panel('pages'); setTimeout(() => $('#newPageTitle')?.focus(), 0); }, 'ajouter page new add 新規 ページ 追加');
  add('act:save', __('Action'), __('Enregistrer le projet (.json)'), () => hooks.exportJson?.(), 'sauvegarder save project 保存 プロジェクト', 'Ctrl+S');
  add('act:publish', __('Action'), __('Publier le site (OVH, GitHub)'), () => openPublish(), 'mettre en ligne ftp déployer publish deploy online 公開 デプロイ');
  add('act:versions', __('Action'), __('Versions du projet (enregistrer, restaurer)'), () => openVersions(), 'historique sauvegarde revenir history backup restore versions 履歴 バージョン 復元');
  add('act:preview', __('Action'), __('Aperçu dans un nouvel onglet'), () => hooks.preview?.(), 'voir preview view tab プレビュー タブ');
  add('act:keys', __('Aide'), __('Aide : raccourcis clavier'), openShortcuts, 'clavier touches help keyboard shortcuts keys ヘルプ キーボード ショートカット', '?');
  return list;
}

function renderList() {
  const ul = dialog.querySelector('.cmdk__list');
  if (!items.length) { ul.replaceChildren(h('li', { class: 'cmdk__empty' }, __('Aucune commande ne correspond.'))); return; }
  ul.replaceChildren(...items.map((c, i) => h('li', {
    class: 'cmdk__item', role: 'option', id: `cmd-${i}`, 'data-cmd': c.id, 'aria-selected': String(i === active),
    onmousemove: () => { if (active !== i) { active = i; mark(); } },
    onclick: () => run(i)
  }, h('span', { class: 'cmdk__group' }, c.group), h('span', { class: 'cmdk__label' }, c.label), c.kbd ? h('kbd', {}, c.kbd) : null)));
  dialog.querySelector('#cmdkInput').setAttribute('aria-activedescendant', `cmd-${active}`);
}

function mark() {
  dialog.querySelectorAll('.cmdk__item').forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
  const el = dialog.querySelector(`#cmd-${active}`);
  el?.scrollIntoView({ block: 'nearest' });
  dialog.querySelector('#cmdkInput').setAttribute('aria-activedescendant', `cmd-${active}`);
}

let all = [];
function refresh(q) {
  items = rankCommands(all, q, { recent, limit: 40 });
  /* Une phrase (3 mots ou plus) : proposer de la confier à « Demander à Atelier » */
  const words = String(q || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3 && !/^demander\b/i.test(q.trim())) {
    const ask = { id: 'ask:query', group: __('IA'), label: __('✨ Demander à Atelier : « {query} »', { query: q.trim().slice(0, 80) }), run: () => openAsk(q.trim()), keywords: '', kbd: '' };
    /* Si la phrase est le nom d'une commande (tous ses mots y figurent), la commande reste en tête */
    const fold = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const top = items[0] ? fold(`${items[0].label} ${items[0].keywords || ''}`) : '';
    const isCommand = top && words.filter(w => w.length > 2).every(w => top.includes(fold(w)));
    items.splice(isCommand ? 1 : 0, 0, ask);
  }
  active = 0;
  renderList();
}

function run(i) {
  const c = items[i];
  if (!c) return;
  dialog.close();
  remember(c.id);
  log.info('cmdk.run', __('Commande : {label}', { label: c.label }), { id: c.id, query: dialog.querySelector('#cmdkInput')?.value.slice(0, 60) || undefined });
  try { c.run(); } catch (e) { log.error('cmdk.fail', __('Commande en échec : {label}', { label: c.label }), { id: c.id, error: e }); toast(e.message, 'error'); }
}

function ensure() {
  if (dialog) return dialog;
  dialog = h('dialog', { class: 'cmdk', id: 'cmdk', 'aria-label': __('Barre de commandes') },
    h('input', { class: 'cmdk__input', id: 'cmdkInput', type: 'text', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'cmdkList', 'aria-autocomplete': 'list', autocomplete: 'off', spellcheck: 'false', placeholder: __('Que voulez-vous faire ? (ajouter, page, élément, réglage…)') }),
    h('ul', { class: 'cmdk__list', id: 'cmdkList', role: 'listbox', 'aria-label': __('Commandes') }),
    h('div', { class: 'cmdk__foot', 'aria-hidden': 'true' }, h('span', {}, __('↑↓ choisir')), h('span', {}, __('Entrée lancer')), h('span', {}, __('Échap fermer'))));
  document.body.append(dialog);
  const input = dialog.querySelector('#cmdkInput');
  input.addEventListener('input', () => refresh(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    else if (e.key === 'PageDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 8); mark(); }
    else if (e.key === 'PageUp') { e.preventDefault(); active = Math.max(0, active - 8); mark(); }
    e.stopPropagation();
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  return dialog;
}

export function openCommands() {
  ensure();
  all = buildCommands();
  const input = dialog.querySelector('#cmdkInput');
  input.value = '';
  refresh('');
  if (!dialog.open) dialog.showModal();
  input.focus();
}

const SHORTCUTS = [
  ['Ctrl+K', __('Barre de commandes : tout trouver et tout faire')],
  [__('Double-clic / Entrée'), __('Écrire dans l’élément')],
  ['↑ ↓', __('Élément précédent / suivant')],
  ['← →', __('Parent / premier enfant')],
  [__('Maj+clic'), __('Ajouter ou retirer de la sélection')],
  [__('Échap'), __('Terminer l’écriture, quitter la sélection multiple, sinon parent')],
  [__('Suppr'), __('Supprimer')],
  ['Ctrl+D', __('Dupliquer')],
  ['Ctrl+C / Ctrl+X / Ctrl+V', __('Copier / couper / coller (déplacer sans souris)')],
  ['Alt+↑ / Alt+↓', __('Monter / descendre')],
  [__('Ctrl+Z / Ctrl+Maj+Z'), __('Annuler / rétablir')],
  ['Ctrl+B / I / U', __('Gras / italique / souligné')],
  ['Ctrl+S', __('Enregistrer le projet (.json)')],
  ['Ctrl+Alt+J', __('Journal de débogage (copier pour signaler un problème)')],
  ['?', __('Cette aide')]
];

export function openShortcuts() {
  let d = $('#shortcutsDialog');
  if (!d) {
    d = h('dialog', { class: 'keys', id: 'shortcutsDialog', 'aria-labelledby': 'keysTitle' },
      h('header', { class: 'audit__head' }, h('h2', { id: 'keysTitle' }, __('Raccourcis clavier')), h('button', { type: 'button', class: 'icon-btn', 'aria-label': __('Fermer'), onclick: () => d.close() }, '✕')),
      h('table', {}, h('tbody', {}, SHORTCUTS.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))))));
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    document.body.append(d);
  }
  if (!d.open) d.showModal();
}
