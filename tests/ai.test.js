import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAI, NANO_LANGS, REWRITE_MODES, applyCorrections, clampAtWord, cleanAlt } from '../core/ai-tasks.js';

/* Faux fournisseur : enregistre les appels et renvoie des réponses préparées */
function fake({ native = false, replies = {}, translate = true } = {}) {
  const calls = [];
  const p = {
    calls,
    has: { prompt: true, multimodal: true, summarizer: native, rewriter: native, proofreader: native, translator: translate },
    async prompt(req) { calls.push({ api: 'prompt', ...req }); const key = Object.keys(req.schema?.properties || {})[0]; const r = replies[key]; return typeof r === 'function' ? r(req) : r; },
    async summarize(req) { calls.push({ api: 'summarizer', ...req }); return replies.summary; },
    async rewrite(req) { calls.push({ api: 'rewriter', ...req }); return replies.rewritten; },
    async proofread(req) { calls.push({ api: 'proofreader', ...req }); return replies.proofread; },
    async translate(req) { calls.push({ api: 'translator', ...req }); return `[${req.to}] ${req.text}`; }
  };
  if (!translate) delete p.translate;
  return p;
}

test('langues de Gemini Nano : pas de néerlandais ; modes de reformulation', () => {
  assert.ok(NANO_LANGS.has('fr') && NANO_LANGS.has('de') && NANO_LANGS.has('en') && !NANO_LANGS.has('nl'));
  assert.deepEqual(Object.keys(REWRITE_MODES), ['shorter', 'simpler', 'formal', 'friendly', 'longer']);
});

test('reformuler : API dédiée si disponible (ton et longueur), sinon Prompt API avec schéma ; résultat nettoyé', async () => {
  const n = fake({ native: true, replies: { rewritten: '  Un texte <b>plus court</b>.  ' } });
  const r = await createAI(n).rewrite('Un texte qui est vraiment beaucoup trop long.', { mode: 'shorter', lang: 'fr' });
  assert.equal(r.value, 'Un texte plus court.');
  assert.equal(r.via, 'rewriter');
  assert.equal(n.calls[0].length, 'shorter');
  const f = await createAI(n).rewrite('Bonjour', { mode: 'formal', lang: 'fr' });
  assert.equal(n.calls[1].tone, 'more-formal');
  void f;
  const p = fake({ replies: { text: '{"text":"Phrase simple. Mots courts."}' } });
  const r2 = await createAI(p).rewrite('Une phrase alambiquée et interminable.', { mode: 'simpler', lang: 'fr' });
  assert.equal(r2.value, 'Phrase simple. Mots courts.');
  assert.equal(r2.via, 'prompt');
  assert.equal(p.calls[0].lang, 'fr');
  assert.ok(p.calls[0].schema.required.includes('text'));
  assert.match(p.calls[0].system, /clair/i);
  await assert.rejects(createAI(p).rewrite('Hallo', { mode: 'shorter', lang: 'nl' }), /néerlandais/);
  await assert.rejects(createAI(p).rewrite('x', { mode: 'magique', lang: 'fr' }), /Mode/);
  const long = fake({ replies: { text: '{"text":"Ceci est maintenant beaucoup plus long que le texte de départ, hélas."}' } });
  const r3 = await createAI(long).rewrite('Court.', { mode: 'shorter', lang: 'fr' });
  assert.match(r3.warning, /plus court/);
});

test('corriger : corrections positionnées (API dédiée ou Prompt API), corrections inventées ignorées', async () => {
  const text = 'Je vais a la maison demain, et il on mangé.';
  const n = fake({ native: true, replies: { proofread: { correctedInput: 'Je vais à la maison demain, et ils ont mangé.', corrections: [{ startIndex: 8, endIndex: 9, correction: 'à' }, { startIndex: 31, endIndex: 36, correction: 'ils ont' }] } } });
  const r = await createAI(n).proofread(text, { lang: 'fr' });
  assert.equal(r.via, 'proofreader');
  assert.deepEqual(r.value.corrections.map(c => [c.original, c.replacement]), [['a', 'à'], ['il on', 'ils ont']]);
  assert.equal(r.value.corrected, 'Je vais à la maison demain, et ils ont mangé.');
  const p = fake({ replies: { corrections: '```json\n{"corrections":[{"original":"il on","replacement":"ils ont"},{"original":"n’existe pas","replacement":"x"},{"original":"a la","replacement":"à la"}]}\n```' } });
  const r2 = await createAI(p).proofread(text, { lang: 'fr' });
  assert.equal(r2.via, 'prompt');
  assert.equal(r2.value.corrections.length, 2, 'la correction introuvable est ignorée');
  assert.equal(r2.value.corrected, 'Je vais à la maison demain, et ils ont mangé.');
  assert.ok(r2.value.corrections[0].start < r2.value.corrections[1].start, 'triées dans l’ordre du texte');
  assert.equal(applyCorrections('abc def', [{ start: 4, end: 7, replacement: 'XYZ' }, { start: 0, end: 1, replacement: 'A' }]), 'Abc XYZ');
});

test('description pour Google : Summarizer si disponible, coupée proprement à 160 caractères, sans balises', async () => {
  const long = 'Le MAB fédère les médias alternatifs belges et leur permet de partager du matériel, des techniciens et des abonnements de diffusion, tout en gardant chacun son entière indépendance éditoriale et sa ligne.';
  const n = fake({ native: true, replies: { summary: `<p>${long}</p>` } });
  const r = await createAI(n).seoDescription({ title: 'Accueil', text: 'Texte de la page…', lang: 'fr', siteName: 'MAB' });
  assert.equal(r.via, 'summarizer');
  assert.ok(r.value.length <= 160, r.value.length);
  assert.ok(r.value.endsWith('…') && !r.value.includes('<'));
  assert.equal(n.calls[0].type, 'tldr');
  const p = fake({ replies: { description: '{"description":"Le MAB réunit les médias libres de Belgique."}' } });
  const r2 = await createAI(p).seoDescription({ title: 'Accueil', text: 'x', lang: 'fr', keyword: 'médias libres' });
  assert.equal(r2.value, 'Le MAB réunit les médias libres de Belgique.');
  assert.match(p.calls[0].user, /médias libres/);
  assert.ok(p.calls[0].schema.properties.description.maxLength <= 170);
  assert.match(r2.warning, /court/, 'description courte : avertissement');
});

test('néerlandais : rédigé en français puis traduit sur l’appareil', async () => {
  const p = fake({ replies: { description: '{"description":"Le MAB réunit les médias alternatifs belges et partage matériel, techniciens et diffusion."}' } });
  const r = await createAI(p).seoDescription({ title: 'Home', text: 'Texte en français', lang: 'nl', sourceLang: 'fr' });
  assert.equal(p.calls[0].lang, 'fr');
  assert.equal(r.translated, true);
  assert.ok(r.value.startsWith('[nl] Le MAB'));
  assert.equal(p.calls.at(-1).api, 'translator');
  const noTr = fake({ translate: false, replies: { description: '{"description":"x"}' } });
  await assert.rejects(createAI(noTr).seoDescription({ title: 'x', text: 'x', lang: 'nl', sourceLang: 'fr' }), /traduction/i);
});

test('titre pour Google, mots-clés, texte de lien', async () => {
  const p = fake({ replies: {
    title: '{"title":"MAB – la fédération des médias alternatifs belges, matériel partagé et indépendance"}',
    keywords: '{"keywords":["Médias alternatifs","médias alternatifs","radio associative","","fédération des médias","presse indépendante","média libre","télévision locale"]}',
    anchor: '{"anchor":"Découvrir nos médias membres"}'
  } });
  const ai = createAI(p);
  const t = await ai.seoTitle({ title: 'Accueil', text: 'x', lang: 'fr', siteName: 'MAB' });
  assert.ok(t.value.length <= 60 && t.value.startsWith('MAB'), t.value);
  const k = await ai.keywords({ title: 'Accueil', text: 'x', lang: 'fr' });
  assert.deepEqual(k.value, ['médias alternatifs', 'radio associative', 'fédération des médias', 'presse indépendante', 'média libre']);
  const l = await ai.linkText({ text: 'Cliquez ici', target: 'Médias membres', context: 'Découvrez qui nous sommes.', lang: 'fr' });
  assert.equal(l.value, 'Découvrir nos médias membres');
});

test('texte alternatif : image envoyée au modèle, préfixes « Image de… » retirés, 125 caractères, image décorative', async () => {
  const p = fake({ replies: { alt: '{"alt":"Photo de une équipe de tournage avec une caméra sur trépied devant un bâtiment","decorative":false}' } });
  const img = { type: 'image', value: 'blob' };
  const r = await createAI(p).altText({ image: img, context: 'Page Accueil, section Le matériel', lang: 'fr' });
  assert.equal(r.value, 'Une équipe de tournage avec une caméra sur trépied devant un bâtiment');
  assert.ok(p.calls[0].images?.[0] === img, 'l’image fait partie de la demande');
  const deco = fake({ replies: { alt: '{"alt":"","decorative":true}' } });
  const r2 = await createAI(deco).altText({ image: img, lang: 'fr' });
  assert.equal(r2.value, '');
  assert.equal(r2.decorative, true);
  assert.equal(cleanAlt('Image d’un chat noir.'), 'Un chat noir');
  assert.equal(cleanAlt('Screenshot of the home page'), 'The home page');
  assert.ok(cleanAlt('x'.repeat(300)).length <= 125);
  const noVision = fake({ replies: {} });
  noVision.has.multimodal = false;
  await assert.rejects(createAI(noVision).altText({ image: img, lang: 'fr' }), /image/i);
});

test('réponses illisibles et IA absente : messages clairs', async () => {
  const p = fake({ replies: { description: 'je ne sais pas' } });
  await assert.rejects(createAI(p).seoDescription({ title: 'x', text: 'x', lang: 'fr' }), /illisible/);
  const none = fake();
  none.has.prompt = false;
  await assert.rejects(createAI(none).seoTitle({ title: 'x', text: 'x', lang: 'fr' }), /IA locale/);
  assert.equal(clampAtWord('un deux trois quatre', 12), 'un deux…');
  assert.equal(clampAtWord('court', 12), 'court');
});
