import { test } from 'node:test';
import assert from 'node:assert/strict';
import { __, __n, __c, N_, keyOf, setUiLanguage, uiLang, pickUiLang, placeholders, missingKeys, fmtNumber } from '../core/ui-i18n.js';
import { extractJs, extractHtml } from '../tools/i18n.mjs';

test('français par défaut : la clé est le texte', () => {
  setUiLanguage(null);
  assert.equal(uiLang(), 'fr');
  assert.equal(__('Annuler'), 'Annuler');
  assert.equal(__('Page « {name} » créée', { name: 'Équipe' }), 'Page « Équipe » créée');
  assert.equal(__`Page « ${'Équipe'} » créée (${3} blocs)`, 'Page « Équipe » créée (3 blocs)');
  assert.equal(__n(1, '{n} élément', '{n} éléments'), '1 élément');
  assert.equal(__n(0, '{n} élément', '{n} éléments'), '0 élément');
  assert.equal(__n(4, '{n} élément', '{n} éléments'), '4 éléments');
  assert.equal(N_('Texte'), 'Texte');
  assert.equal(__(undefined), '');
});

test('anglais et japonais : traduction, paramètres, ordre libre, repli sur le français', () => {
  setUiLanguage('en', { Annuler: 'Undo', 'Page « {0} » créée ({1} blocs)': 'Created page “{0}” ({1} blocks)', '{n} élément': '{n} item', '{n} éléments': '{n} items' });
  assert.equal(__('Annuler'), 'Undo');
  assert.equal(__`Page « ${'Team'} » créée (${3} blocs)`, 'Created page “Team” (3 blocks)');
  assert.equal(__n(2, '{n} élément', '{n} éléments'), '2 items');
  assert.equal(__('Pas encore traduit'), 'Pas encore traduit');
  assert.ok(missingKeys().includes('Pas encore traduit'), 'les manques sont notés');
  setUiLanguage('ja', { 'Page « {0} » créée ({1} blocs)': '{1} ブロックのページ「{0}」を作成しました' });
  assert.equal(__`Page « ${'チーム'} » créée (${3} blocs)`, '3 ブロックのページ「チーム」を作成しました', 'ordre des paramètres libre');
  assert.equal(fmtNumber(1234.5), (1234.5).toLocaleString('ja-JP'));
  setUiLanguage(null);
});

test('langue de départ : choix retenu, ?lang=, navigateur, sinon anglais', () => {
  assert.equal(pickUiLang({ languages: ['fr-FR', 'en'] }), 'fr');
  assert.equal(pickUiLang({ languages: ['ja-JP'] }), 'ja');
  assert.equal(pickUiLang({ languages: ['nl-BE', 'en-US'] }), 'en');
  assert.equal(pickUiLang({ languages: ['nl-BE'] }), 'en');
  assert.equal(pickUiLang({ saved: 'ja', languages: ['fr'] }), 'ja');
  assert.equal(pickUiLang({ saved: 'xx', languages: ['fr'] }), 'fr');
  assert.equal(pickUiLang({ query: 'en', saved: 'ja' }), 'en');
  assert.equal(pickUiLang({}), 'fr');
});

test('placeholders et clé d’un gabarit', () => {
  assert.deepEqual(placeholders('{n} sur {total} ({0})'), ['0', 'n', 'total']);
  assert.equal(keyOf(['a ', ' b ', '']), 'a {0} b {1}');
});

test('extraction : __(), __``, __n(), N_(), sans les commentaires ni les autres fonctions', () => {
  const src = `
    // __('dans un commentaire')
    /* __\`pas ça\` */
    const a = __('Annuler (Ctrl+Z)');
    const b = __("Guillemets \\"doubles\\"", { x: 1 });
    toast(__\`Page « \${p.title?.fr || \`sans \${'titre'}\`} » créée : \${n} blocs\`);
    log.info('page.add', __n(n, '{n} page ajoutée', '{n} pages ajoutées'), { n });
    const L = { a: N_('Principale') };
    x.__('pas une traduction'); split('non'); const tt = format('non');
    const c = __(\`Sans expression\`);
    const d = __(\`Avec \${x}\`);
  `;
  assert.deepEqual(extractJs(src), ['Annuler (Ctrl+Z)', 'Guillemets "doubles"', 'Page « {0} » créée : {1} blocs', '{n} page ajoutée', '{n} pages ajoutées', 'Principale', 'Sans expression']);
});

test('extraction de index.html : textes et attributs, pas les scripts', () => {
  const html = '<title>Atelier – éditeur</title><script>__("non")</script><button title="Annuler (Ctrl+Z)" aria-label="Annuler">↶</button><span>Ordinateur</span><label class="vh">Page</label><button>🌐 Traductions</button>';
  assert.deepEqual(extractHtml(html).sort(), ['Annuler', 'Annuler (Ctrl+Z)', 'Atelier – éditeur', 'Ordinateur', 'Page', '🌐 Traductions'].sort());
});

test('contexte : même texte français, deux sens', async () => {
  const { extractJs } = await import('../tools/i18n.mjs');
  setUiLanguage(null);
  assert.equal(__c('undo', 'Annuler'), 'Annuler');
  setUiLanguage('en', { 'undo|Annuler': 'Undo', Annuler: 'Cancel' });
  assert.equal(__c('undo', 'Annuler'), 'Undo');
  assert.equal(__('Annuler'), 'Cancel');
  setUiLanguage('ja', {});
  assert.equal(__c('undo', 'Annuler'), 'Annuler', 'sans traduction : le texte français, pas la clé');
  setUiLanguage(null);
  assert.deepEqual(extractJs("x(__c('undo', 'Annuler'))"), ['undo|Annuler']);
});

test('extraction : expressions régulières littérales et __() dans un gabarit', () => {
  const src = [
    "const re = /https?:\\/\\/[^\"']+/g; const a = __('Après regex');",
    "const b = x.replace(/[\"']/g, ''); const c = __('Après guillemets');",
    "const d = n / 2 / 3; const e = __('Après division');",
    "const f = `${__('Dans gabarit')} et ${ok ? __`Imbriqué ${n}` : ''}`;",
    "if (/^\\/\\//.test(u)) toast(__('Après test'));"
  ].join('\n');
  assert.deepEqual(extractJs(src), ['Après regex', 'Après guillemets', 'Après division', 'Dans gabarit', 'Imbriqué {0}', 'Après test']);
});
