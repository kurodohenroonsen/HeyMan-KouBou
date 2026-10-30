/* Cycle 16 : journal des langues et traductions, du référencement et de l'IA locale (chapitres 5, 6 et 7 du guide), avec extraits réels.
 * Faux Gemini Nano : window.__atelierAI (fournisseur) ou imitation des API de Chrome (LanguageModel, Summarizer, Rewriter, Translator…). */
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mark, since, waitCode, expectCodes, expectNoErrors, capture } from './logs.mjs';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);

  /* Faux fournisseur (même forme que dans cycle15) ; opts : { rewriter, garbage, throwSummarize, longSummary, translator } */
  const installFake = (opts = {}) => page.evaluate(o => {
    window.__atelierAI = {
      status: { prompt: 'available', multimodal: 'available', summarizer: 'available', rewriter: o.rewriter ? 'available' : 'downloadable', writer: 'unavailable', proofreader: 'available', translator: o.translator === false ? 'unavailable' : 'available', detector: 'available' },
      has: { prompt: true, multimodal: true, summarizer: true, rewriter: !!o.rewriter, proofreader: true, translator: o.translator !== false },
      async prompt(req) {
        if (o.garbage) return 'Voici ma proposition : un titre accrocheur !';
        const key = Object.keys(req.schema?.properties || {})[0];
        const r = { text: { text: 'Le MAB réunit les médias alternatifs belges.' }, title: { title: 'MAB – fédération des médias alternatifs belges' }, keywords: { keywords: ['médias alternatifs', 'Médias alternatifs', 'radio associative', 'fédération des médias'] }, alt: { alt: 'Image de une équipe de tournage avec une caméra', decorative: false }, corrections: { corrections: [{ original: 'tout.', replacement: 'tout !' }] } }[key];
        return JSON.stringify(r || {});
      },
      async summarize() {
        if (o.throwSummarize) throw new DOMException('The model execution session has been destroyed.', 'InvalidStateError');
        if (o.longSummary) return 'Le MAB fédère les médias alternatifs belges : matériel partagé, techniciens mutualisés, diffusion commune, formations régulières, indépendance éditoriale garantie pour chaque rédaction membre et pour toutes les autres aussi.';
        return 'Le MAB fédère les médias alternatifs belges : matériel, techniciens et diffusion partagés, indépendance éditoriale garantie.';
      },
      async proofread(req) { const i = req.text.indexOf('Nous'); return { correctedInput: req.text, corrections: i >= 0 ? [{ startIndex: i, endIndex: i + 4, correction: 'Ensemble, nous' }] : [] }; },
      async translate(req) { return `[${req.to}] ${req.text}`; }
    };
    if (o.rewriter) window.__atelierAI.rewrite = async () => 'Le MAB réunit les médias alternatifs belges.';
  }, opts);
  const withAI = (label, task) => page.evaluate(async ([l, k]) => {
    const m = await import('/editor/ai-ui.js');
    const { state } = await import('/editor/store.js');
    const p = state.site.pages[0];
    const tasks = {
      rewriteNl: a => a.rewrite('Le MAB réunit les médias alternatifs.', { mode: 'shorter', lang: 'nl' }),
      rewrite: a => a.rewrite('Le MAB réunit les médias alternatifs belges, chacun gardant sa rédaction.', { mode: 'formal', lang: 'fr' }),
      title: a => a.seoTitle({ title: 'Accueil', text: 'Le MAB fédère les médias alternatifs.', lang: 'fr', sourceLang: 'fr', siteName: 'MAB' }),
      descNl: a => a.seoDescription({ title: 'Accueil', text: 'Le MAB fédère les médias alternatifs.', lang: 'nl', sourceLang: 'fr', siteName: 'MAB' }),
      desc: a => a.seoDescription({ title: 'Accueil', text: 'Le MAB fédère les médias alternatifs.', lang: 'fr', sourceLang: 'fr', siteName: 'MAB' }),
      link: a => a.linkText({ text: 'cliquez ici', target: 'Contact', context: 'Écrivez-nous', lang: 'fr' }),
      boom: () => { throw new Error('erreur-de-test volontaire'); }
    };
    const r = await m.withAI(l, tasks[k]);
    return r ? { ...r, page: p.id } : null;
  }, [label, task]);

  /* ===================== Chapitre 7 : IA locale ===================== */
  await installFake();

  /* --- 7.1 État des API et téléchargement --- */
  {
    const s = await mark(page);
    await page.click('#aiBtn');
    await page.waitForSelector('#aiDialog [data-ai-download="rewriter"]');
    await waitCode(page, 'ai.status', s);
    await page.click('#aiDialog [data-ai-download="rewriter"]');
    await page.waitForFunction(() => document.querySelector('#aiDialog [data-ai-state="rewriter"]')?.textContent.includes('prêt'), null, { timeout: 5000 });
    await page.keyboard.press('Escape');
    const es = await since(page, s);
    expectCodes(t, es, ['ai.dialog', 'ai.availability', 'ai.status', 'ai.download.start', 'ai.download.ok'], 'IA : état et téléchargement');
    t.ok(es.find(e => e.code === 'ai.status')?.data?.prompt === 'available', 'ai.status donne l’état de chaque API (prompt=available)');
    expectNoErrors(t, es, 'IA : état');
    capture('ia-etat', es);
  }

  /* --- 7.2 Reformuler (Rewriter absent → repli sur la Prompt API) dans la page --- */
  const text = c.locator('main [data-type="text"]').first();
  const tid = await text.getAttribute('data-node');
  {
    await installFake({ rewriter: false });
    const s = await mark(page);
    await text.locator('[data-edit]').dblclick();
    await t.wait(200);
    await page.keyboard.press('Control+a');
    await c.locator('#atelier-format [data-fmt="ai"]').click();
    await c.locator('#atelier-format [data-fmt="ai-mode"][data-mode="shorter"]').click();
    await c.locator('#atelier-format .fmt-ai-out:not([hidden])').waitFor({ timeout: 5000 });
    await c.locator('#atelier-format [data-fmt="ai-apply"]').click();
    await t.wait(300);
    const es = await since(page, s);
    expectCodes(t, es, ['ai.provider', 'ai.rewrite.start', 'ai.rewrite.fallback', 'ai.rewrite.call', 'ai.rewrite.reply', 'ai.rewrite.ok', 'ai.mark'], 'reformuler (repli)');
    t.ok(es.find(e => e.code === 'ai.rewrite.call')?.data?.api === 'prompt' && es.find(e => e.code === 'ai.rewrite.ok')?.data?.fallback === true, 'reformuler : appel de la Prompt API, repli noté');
    expectNoErrors(t, es, 'reformuler');
    capture('ia-reformuler-repli', es);
  }

  /* --- 7.3 Reformuler avec le Rewriter, puis corriger avec le Proofreader --- */
  {
    await installFake({ rewriter: true });
    let s = await mark(page);
    await page.keyboard.press('Control+a');
    await c.locator('#atelier-format [data-fmt="ai"]').click();
    await c.locator('#atelier-format [data-fmt="ai-mode"][data-mode="formal"]').click();
    await c.locator('#atelier-format .fmt-ai-out:not([hidden])').waitFor({ timeout: 5000 });
    await c.locator('#atelier-format [data-fmt="ai-cancel"]').click();
    let es = await since(page, s);
    expectCodes(t, es, ['ai.rewrite.start', 'ai.rewrite.call', 'ai.rewrite.ok'], 'reformuler (Rewriter)');
    t.ok(es.find(e => e.code === 'ai.rewrite.call')?.data?.api === 'rewriter' && es.find(e => e.code === 'ai.rewrite.call')?.data?.tone === 'more-formal', 'Rewriter appelé avec tone=more-formal');
    t.ok(!es.some(e => e.code === 'ai.rewrite.fallback'), 'pas de repli quand le Rewriter est là');
    capture('ia-reformuler-rewriter', es);

    await page.keyboard.press('End');
    await page.keyboard.type(' Nous partageons tout.');
    await t.wait(300);
    s = await mark(page);
    await page.keyboard.press('Control+a');
    await c.locator('#atelier-format [data-fmt="ai"]').click();
    await c.locator('#atelier-format [data-fmt="ai-proof"]').click();
    await c.locator('#atelier-format .fmt-ai-out:not([hidden])').waitFor({ timeout: 5000 });
    await c.locator('#atelier-format [data-fmt="ai-apply"]').click();
    await t.wait(300);
    es = await since(page, s);
    expectCodes(t, es, ['ai.proofread.start', 'ai.proofread.call', 'ai.proofread.reply', 'ai.proofread.ok'], 'corriger');
    t.ok(es.find(e => e.code === 'ai.proofread.ok')?.data?.corrections === 1, 'corriger : 1 correction comptée');
    capture('ia-corriger', es);

    /* Proofreader absent : repli Prompt API */
    await page.evaluate(() => { window.__atelierAI.has.proofreader = false; delete window.__atelierAI.proofread; });
    s = await mark(page);
    await page.keyboard.press('Control+a');
    await c.locator('#atelier-format [data-fmt="ai"]').click();
    await c.locator('#atelier-format [data-fmt="ai-proof"]').click();
    await c.locator('#atelier-format .fmt-ai-out:not([hidden])').waitFor({ timeout: 5000 });
    await c.locator('#atelier-format [data-fmt="ai-cancel"]').click();
    es = await since(page, s);
    expectCodes(t, es, ['ai.proofread.fallback', 'ai.proofread.ok'], 'corriger (repli)');
    t.ok(es.find(e => e.code === 'ai.proofread.ok')?.data?.corrections === 1, 'corriger (repli) : 1 correction retrouvée dans le texte');
    capture('ia-corriger-repli', es);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await t.wait(200);
  }

  /* --- 7.4 Texte alternatif d'une image --- */
  await installFake();
  await page.evaluate(async png => {
    const { state, commit } = await import('/editor/store.js');
    const { setProp } = await import('/core/tree.js');
    const { updatePageRoot } = await import('/core/site.js');
    const p = state.site.pages[0];
    const find = n => (n.type === 'image' ? n : (n.children || []).map(find).find(Boolean));
    const img = find(p.root);
    let s = { ...state.site, assets: { ...(state.site.assets || {}), tournage: { name: 'tournage.png', type: 'image/png', dataUrl: png } } };
    s = updatePageRoot(s, p.id, setProp(setProp(p.root, img.id, 'src', 'asset:tournage'), img.id, 'alt', '', 'fr'));
    commit(s, { source: 'test' });
  }, PNG);
  {
    const s = await mark(page);
    await page.click('#seoBtn');
    await page.waitForSelector('#seoDialog [data-ai-alts]');
    await page.click('#seoDialog [data-ai-alts]');
    await waitCode(page, 'seo.alts.ok', s);
    const es = await since(page, s);
    expectCodes(t, es, ['seo.alts.start', 'ai.alt.start', 'ai.alt.call', 'ai.alt.reply', 'ai.alt.cleaned', 'ai.alt.ok', 'seo.alts.image', 'seo.alts.ok'], 'texte alternatif');
    t.ok(es.find(e => e.code === 'ai.alt.call')?.data?.images === 1, 'l’image est donnée au modèle (images: 1)');
    expectNoErrors(t, es, 'texte alternatif');
    capture('ia-texte-alternatif', es);
    capture('seo-alts', es);
    await page.keyboard.press('Escape');
  }

  /* --- 7.5 Erreurs provoquées --- */
  {
    /* Réponse illisible (pas du JSON) */
    await installFake({ garbage: true });
    let s = await mark(page);
    t.ok(await withAI('Titre pour Google', 'title') === null, 'réponse illisible : rien appliqué');
    let es = await since(page, s);
    expectCodes(t, es, ['ai.title.start', 'ai.title.call', 'ai.title.reply', 'ai.title.unreadable', 'ai.title.fail', 'ui.toast'], 'réponse illisible');
    t.ok(es.find(e => e.code === 'ai.title.fail')?.data?.reason === 'unreadable', 'raison : unreadable');
    t.ok(!es.some(e => e.code === 'ai.unexpected'), 'pas de doublon ai.unexpected');
    capture('ia-reponse-illisible', es);

    /* Exception d'une API (session détruite) */
    await installFake({ throwSummarize: true });
    s = await mark(page);
    await withAI('Description pour Google', 'desc');
    es = await since(page, s);
    expectCodes(t, es, ['ai.description.call', 'ai.description.call-fail', 'ai.description.fail'], 'exception d’API');
    t.ok(es.find(e => e.code === 'ai.description.call-fail')?.data?.error?.name === 'InvalidStateError' && !!es.find(e => e.code === 'ai.description.call-fail')?.data?.hint, 'nom de l’erreur et cause probable');
    capture('ia-exception-api', es);

    /* Sortie trop longue : coupée à 160 caractères */
    await installFake({ longSummary: true });
    s = await mark(page);
    const r = await withAI('Description pour Google', 'desc');
    es = await since(page, s);
    expectCodes(t, es, ['ai.description.clamped', 'ai.description.ok'], 'sortie coupée');
    t.ok(r && r.value.length <= 160, `description coupée (${r?.value.length} car.)`);
    capture('ia-sortie-coupee', es);

    /* Néerlandais : refusé pour reformuler, traduit pour la description */
    await installFake();
    s = await mark(page);
    await withAI('Plus court', 'rewriteNl');
    es = await since(page, s);
    expectCodes(t, es, ['ai.rewrite.start', 'ai.rewrite.refused-lang', 'ai.rewrite.cancel'], 'refus en néerlandais');
    t.ok(!es.some(e => e.code === 'ai.rewrite.fail' || e.code === 'ai.rewrite.fallback'), 'refus : pas d’ERROR ni de repli annoncé');
    capture('ia-refus-nl', es);

    s = await mark(page);
    const nl = await withAI('Description pour Google', 'descNl');
    es = await since(page, s);
    expectCodes(t, es, ['ai.description.via-translation', 'ai.description.call', 'ai.description.ok'], 'néerlandais par traduction');
    t.ok(nl?.translated && es.some(e => e.code === 'ai.description.call' && e.data?.api === 'translator' && e.data?.to === 'nl'), 'NL : traduit sur l’appareil (translator → nl)');
    capture('ia-nl-traduction', es);

    await installFake({ translator: false });
    s = await mark(page);
    await withAI('Description pour Google', 'descNl');
    es = await since(page, s);
    expectCodes(t, es, ['ai.description.no-translator', 'ai.description.fail'], 'NL sans traducteur');
    capture('ia-nl-sans-traducteur', es);

    /* IA absente */
    await page.evaluate(() => { window.__atelierAI = { has: {}, status: {} }; });
    s = await mark(page);
    await withAI('Texte de lien', 'link');
    es = await since(page, s);
    expectCodes(t, es, ['ai.link.start', 'ai.link.absent', 'ai.link.cancel'], 'IA absente');
    capture('ia-absente', es);

    /* Erreur imprévue (hors tâche) */
    await installFake();
    s = await mark(page);
    await withAI('Test', 'boom');
    es = await since(page, s);
    expectCodes(t, es, ['ai.unexpected'], 'erreur imprévue');
    capture('ia-erreur-imprevue', es);

    /* Image en ligne illisible */
    s = await mark(page);
    await page.evaluate(async () => { const m = await import('/editor/ai-ui.js'); await m.describeImage('http://127.0.0.1:9/inexistante.png', ''); await m.describeImage('', ''); });
    es = await since(page, s);
    expectCodes(t, es, ['ai.image-fail', 'ai.image-missing'], 'image illisible');
    capture('ia-image-illisible', es);
  }

  /* --- 7.6 Imitation des API de Chrome (chemin du vrai Gemini Nano) --- */
  {
    await page.evaluate(() => {
      delete window.__atelierAI;
      const tgt = () => new EventTarget();
      const progress = async o => { const m = tgt(); o?.monitor?.(m); for (const x of [0, 0.5, 1]) { const e = new Event('downloadprogress'); e.loaded = x; m.dispatchEvent(e); await new Promise(r => setTimeout(r, 5)); } };
      window.__gestureOk = false;
      self.LanguageModel = {
        availability: async () => 'available',
        params: async () => ({ defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2 }),
        async create(o) {
          return { inputQuota: 6144, inputUsage: 0, async prompt(input, opts) { this.inputUsage = 420; const key = Object.keys(opts?.responseConstraint?.properties || {})[0]; return JSON.stringify(key === 'title' ? { title: 'MAB – fédération des médias alternatifs belges' } : { text: 'Le MAB réunit les médias.' }); }, destroy() {} };
        }
      };
      self.Summarizer = { availability: async () => 'downloadable', async create(o) { await progress(o); return { summarize: async () => 'Le MAB fédère les médias alternatifs belges : matériel, techniciens et diffusion partagés.', destroy() {} }; } };
      self.Rewriter = {
        availability: async () => 'downloadable',
        async create(o) {
          if (!window.__gestureOk) throw new DOMException('Requires a user gesture when availability is "downloading" or "downloadable".', 'NotAllowedError');
          await progress(o);
          return { rewrite: async () => 'Le MAB réunit les médias.', destroy() {} };
        }
      };
      self.Proofreader = { availability: async () => { throw new DOMException('The device is not eligible for running on-device model.', 'NotSupportedError'); } };
      try { delete self.Writer; delete self.LanguageDetector; } catch { /* absent */ }
      self.Translator = { availability: async () => 'available', async create() { return { translate: async x => `[nl] ${x}` }; } };
    });
    let s = await mark(page);
    await page.click('#aiBtn');
    await page.waitForSelector('#aiDialog [data-ai-download="rewriter"]');
    await waitCode(page, 'ai.status', s);
    await page.click('#aiDialog [data-ai-download="rewriter"]');
    await waitCode(page, 'ai.download.fail', s);
    await page.evaluate(() => { window.__gestureOk = true; });
    await page.waitForSelector('#aiDialog [data-ai-download="rewriter"]:not([disabled])');
    await page.click('#aiDialog [data-ai-download="rewriter"]');
    await waitCode(page, 'ai.download.ok', s);
    await t.wait(200);
    let es = await since(page, s);
    expectCodes(t, es, ['ai.availability', 'ai.availability-fail', 'ai.params', 'ai.status', 'ai.download.start', 'ai.session.fail', 'ai.download.fail', 'ai.progress', 'ai.session.create', 'ai.download.ok'], 'API de Chrome : état et téléchargement');
    t.ok(es.find(e => e.code === 'ai.session.fail')?.data?.error?.name === 'NotAllowedError' && /geste requis/.test(es.find(e => e.code === 'ai.session.fail')?.data?.hint || ''), 'geste requis : NotAllowedError expliqué');
    t.ok(es.some(e => e.code === 'ai.availability' && e.data?.api === 'writer' && e.data?.state === 'absent'), 'API absente (Writer) notée');
    capture('ia-chrome-etat', es);
    await page.keyboard.press('Escape');

    s = await mark(page);
    const r1 = await withAI('Plus formel', 'rewrite');
    const r2 = await withAI('Titre pour Google', 'title');
    const r3 = await withAI('Description pour Google', 'descNl');
    es = await since(page, s);
    t.ok(r1?.via === 'rewriter' && r2?.value?.includes('fédération') && r3?.translated, 'API de Chrome imitées : Rewriter, Prompt API, Summarizer + Translator');
    expectCodes(t, es, ['ai.provider', 'ai.rewrite.call', 'ai.session.create', 'ai.rewrite.ok', 'ai.title.ok', 'ai.session.usage', 'ai.description.ok', 'translate.model.start', 'translate.model.ok'], 'API de Chrome : tâches');
    t.ok(es.find(e => e.code === 'ai.provider')?.data?.source === 'chrome', 'fournisseur : chrome');
    capture('ia-chrome-taches', es);
    await page.evaluate(() => { for (const g of ['LanguageModel', 'Summarizer', 'Rewriter', 'Proofreader', 'Translator']) delete self[g]; });
  }

  /* Contexte « ia » dans l'en-tête du journal copié */
  {
    const dump = await page.evaluate(() => window.atelierDebug.dump());
    t.ok(/^ia : /m.test(dump) && /traducteur/.test(dump), 'en-tête du journal : contexte « ia » (état des API, traducteur)');
  }

  /* ===================== Chapitre 6 : référencement ===================== */
  await installFake();
  {
    let s = await mark(page);
    await page.click('#seoBtn');
    await page.waitForSelector('#seoDialog [data-seo-page]');
    let es = await since(page, s);
    const open = es.find(e => e.code === 'seo.open');
    t.ok(open && typeof open.data?.site === 'number' && open.data?.pagePoints, `seo.open : note du site ${open?.data?.site} et points par niveau`);
    const sv = await site();
    const contact = sv.pages.find(p => p.slug === 'contact');
    await page.click(`#seoDialog [data-seo-pick="${contact.id}"]`);
    await page.fill('#seoDialog [data-seo="title"]', 'Contact – MAB');
    await page.locator('#seoDialog [data-seo="title"]').dispatchEvent('change');
    await t.wait(150);
    await page.check('#seoDialog [data-seo="noindex"]');
    await t.wait(150);
    await page.selectOption('#seoDialog [data-seo-lang]', 'de');
    await t.wait(150);
    await page.selectOption('#seoDialog [data-seo-lang]', 'fr');
    await t.wait(150);
    es = await since(page, s);
    expectCodes(t, es, ['seo.analysis', 'seo.open', 'seo.page', 'seo.field', 'seo.lang'], 'référencement : ouvrir et régler');
    expectNoErrors(t, es, 'référencement');
    capture('seo-ouvrir-regler', es);

    /* Propositions de l'IA : description, titre, mots-clés */
    await page.click(`#seoDialog [data-seo-pick="${sv.pages[0].id}"]`);
    s = await mark(page);
    await page.click('#seoDialog [data-ai-seo="description"]');
    await waitCode(page, 'seo.ai-applied', s);
    await page.click('#seoDialog [data-ai-seo="keywords"]');
    await page.waitForSelector('#seoDialog [data-kw]');
    await page.click('#seoDialog [data-kw="médias alternatifs"]');
    await t.wait(200);
    await page.click('#seoDialog [data-ai-seo="title"]');
    await page.waitForFunction(() => document.querySelector('#seoDialog [data-seo="title"]')?.value.includes('fédération'), null, { timeout: 5000 });
    es = await since(page, s);
    expectCodes(t, es, ['seo.ai-ask', 'ai.description.start', 'ai.description.call', 'ai.description.ok', 'seo.ai-applied', 'ai.keywords.ok', 'ai.keywords.cleaned', 'seo.keyword-pick', 'ai.title.ok'], 'référencement : propositions de l’IA');
    t.ok(es.filter(e => e.code === 'seo.ai-applied').length === 3, 'trois propositions appliquées (description, mots-clés, titre)');
    capture('seo-ia-propositions', es);

    /* Compléter toutes les descriptions en néerlandais */
    s = await mark(page);
    await page.selectOption('#seoDialog [data-seo-lang]', 'nl');
    await page.waitForSelector('#seoDialog [data-ai-seo-all]');
    await page.click('#seoDialog [data-ai-seo-all]');
    await waitCode(page, 'seo.complete-all.ok', s);
    es = await since(page, s);
    expectCodes(t, es, ['seo.complete-all.start', 'ai.description.via-translation', 'seo.complete-all.page', 'seo.complete-all.ok'], 'compléter les descriptions');
    capture('seo-completer-nl', es);

    /* Compléter sans IA : arrêt après le premier refus */
    await page.selectOption('#seoDialog [data-seo-lang]', 'de');
    await page.evaluate(() => { window.__atelierAI = { has: {}, status: {} }; });
    s = await mark(page);
    await page.waitForSelector('#seoDialog [data-ai-seo-all]');
    await page.click('#seoDialog [data-ai-seo-all]');
    await waitCode(page, 'seo.complete-all.ok', s);
    es = await since(page, s);
    expectCodes(t, es, ['seo.complete-all.start', 'ai.description.absent', 'ai.description.cancel', 'seo.complete-all.stopped', 'seo.complete-all.ok'], 'compléter sans IA');
    capture('seo-completer-sans-ia', es);
    await installFake();

    /* « Aller à » depuis un point signalé */
    await page.selectOption('#seoDialog [data-seo-lang]', 'fr');
    await t.wait(150);
    /* Image de nouveau sans texte alternatif : le point « img-alt » propose « Aller à » */
    await page.evaluate(async () => {
      const { state, commit } = await import('/editor/store.js');
      const { setProp } = await import('/core/tree.js');
      const { updatePageRoot } = await import('/core/site.js');
      const p = state.site.pages[0];
      const find = n => (n.type === 'image' ? n : (n.children || []).map(find).find(Boolean));
      commit(updatePageRoot(state.site, p.id, setProp(p.root, find(p.root).id, 'alt', '', 'fr')), { source: 'test' });
    });
    await page.waitForSelector('#seoDialog [data-check="img-alt"] [data-seo-go]');
    s = await mark(page);
    await page.click('#seoDialog [data-check="img-alt"] [data-seo-go]');
    await t.wait(400);
    es = await since(page, s);
    expectCodes(t, es, ['seo.goto', 'store.select'], 'aller à');
    t.ok(!(await page.locator('#seoDialog').count()), '« Aller à » ferme la fenêtre et sélectionne l’image');
    capture('seo-aller-a', es);
  }

  /* ===================== Chapitre 5 : langues et traductions ===================== */
  {
    /* Tableau : ouvrir, filtrer, saisir, valider */
    let s = await mark(page);
    await page.click('#i18nBtn');
    await page.waitForSelector('#i18nDialog [data-i18n-row]');
    await page.selectOption('#i18nDialog [data-i18n-filter]', 'missing');
    await t.wait(150);
    await page.selectOption('#i18nDialog [data-i18n-filter]', 'all');
    await page.fill('#i18nDialog [data-i18n-search]', 'coop');
    await page.fill('#i18nDialog [data-i18n-search]', '');
    const sv = await site();
    const h1 = await c.locator('[data-type="heading"]:has(h1)').first().getAttribute('data-node');
    const key = `n:${sv.pages[0].id}:${h1}:text`;
    await page.locator(`#i18nDialog [data-i18n-row="${key}"] td[data-lang="de"] [data-i18n-cell]`).click();
    await page.keyboard.type('Freie Bürgerinformation');
    await page.locator('#i18nDialog [data-i18n-search]').click();
    await t.wait(300);
    let es = await since(page, s);
    expectCodes(t, es, ['i18n.open', 'translate.absent', 'i18n.filter', 'i18n.edit'], 'tableau des traductions');
    t.ok(es.find(e => e.code === 'i18n.open')?.data?.visible > 10, 'i18n.open : nombre de textes');
    expectNoErrors(t, es, 'tableau');
    capture('langues-tableau', es);

    /* Traduction automatique (traducteur de test) */
    await page.evaluate(() => { window.__atelierTranslator = async (text, from, to) => `⟨${to}⟩ ${text}`; });
    await page.keyboard.press('Escape');
    s = await mark(page);
    await page.click('#i18nBtn');
    await page.selectOption('#i18nDialog [data-mt-lang]', 'en');
    await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
    await page.click('#i18nDialog [data-mt-run]');
    await page.waitForSelector('#i18nDialog [data-mt-status][data-mt-done]', { timeout: 15000 });
    await page.locator('#i18nDialog [data-review-ok]').first().click();
    await t.wait(200);
    es = await since(page, s);
    expectCodes(t, es, ['translate.status', 'translate.batch.start', 'translate.create', 'translate.batch.ready', 'translate.batch.progress', 'translate.batch.ok', 'i18n.review-ok'], 'traduction automatique');
    const ok = es.find(e => e.code === 'translate.batch.ok');
    t.ok(ok?.data?.count > 10 && ok.data.errors === 0, `translate.batch.ok : ${ok?.data?.count} textes, durée ${ok?.ms} ms`);
    capture('langues-traduction-auto', es);
    await page.keyboard.press('Escape');

    /* Certains textes échouent */
    await page.evaluate(() => { let n = 0; window.__atelierTranslator = async (text, from, to) => { if (++n % 4 === 0) throw new DOMException('Unable to translate (simulé)', 'UnknownError'); return `⟨${to}⟩ ${text}`; }; });
    s = await mark(page);
    await page.click('#i18nBtn');
    await page.selectOption('#i18nDialog [data-mt-lang]', 'de');
    await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
    await page.click('#i18nDialog [data-mt-run]');
    await page.waitForSelector('#i18nDialog [data-mt-status][data-mt-done]', { timeout: 15000 });
    es = await since(page, s);
    expectCodes(t, es, ['translate.text-fail', 'translate.batch.errors', 'translate.batch.ok'], 'traduction : échecs partiels');
    capture('langues-traduction-echecs', es, { drop: ['ui.toast'] });
    await page.keyboard.press('Escape');

    /* Arrêter en cours de route */
    await page.evaluate(() => { window.__atelierTranslator = async (text, from, to) => { await new Promise(r => setTimeout(r, 40)); return `⟨${to}⟩ ${text}`; }; });
    s = await mark(page);
    await page.click('#i18nBtn');
    await page.selectOption('#i18nDialog [data-mt-lang]', 'nl');
    await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
    await page.click('#i18nDialog [data-mt-run]');
    await page.waitForSelector('#i18nDialog [data-mt-cancel]:not([hidden])');
    await t.wait(200);
    await page.click('#i18nDialog [data-mt-cancel]');
    await page.waitForSelector('#i18nDialog [data-mt-status][data-mt-done]', { timeout: 15000 });
    es = await since(page, s);
    expectCodes(t, es, ['translate.batch.start', 'translate.batch.cancel'], 'traduction arrêtée');
    capture('langues-traduction-arret', es);
    await page.keyboard.press('Escape');

    /* Translator de Chrome imité : modèle à télécharger, puis refus (geste requis), paire indisponible, état illisible */
    await page.evaluate(() => {
      delete window.__atelierTranslator;
      window.__trMode = 'ok';
      self.Translator = {
        async availability({ targetLanguage }) {
          if (targetLanguage === 'en' && window.__trMode === 'unavail') return 'unavailable';
          if (window.__trMode === 'throw') throw new DOMException('Service indisponible (simulé)', 'OperationError');
          return 'downloadable';
        },
        async create(o) {
          if (window.__trMode === 'gesture') throw new DOMException('Requires a user gesture when availability is "downloadable".', 'NotAllowedError');
          const m = new EventTarget();
          o.monitor?.(m);
          for (const x of [0, 0.3, 0.6, 1]) { const e = new Event('downloadprogress'); e.loaded = x; m.dispatchEvent(e); await new Promise(r => setTimeout(r, 5)); }
          return { translate: async x => `«${o.targetLanguage}» ${x}` };
        }
      };
    });
    s = await mark(page);
    await page.click('#i18nBtn');
    await page.selectOption('#i18nDialog [data-mt-lang]', 'de');
    await waitCode(page, 'translate.status', s);
    await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
    await page.click('#i18nDialog [data-mt-run]');
    await page.waitForSelector('#i18nDialog [data-mt-status][data-mt-done]', { timeout: 15000 });
    es = await since(page, s);
    expectCodes(t, es, ['translate.status', 'translate.model.start', 'translate.model.download', 'translate.model.ok', 'translate.batch.ok'], 'Translator de Chrome');
    t.ok(es.find(e => e.code === 'translate.status' && e.data?.from === 'fr' && e.data?.to === 'de')?.data?.state === 'downloadable', 'état par paire fr → de : downloadable');
    t.ok(es.find(e => e.code === 'translate.batch.ok')?.data?.count > 0, `textes traduits par le Translator imité (${es.find(e => e.code === 'translate.batch.ok')?.data?.count})`);
    /* fr → nl est déjà prêt (créé par la description NL du chapitre 7) : réutilisé */
    const s2 = await mark(page);
    await page.selectOption('#i18nDialog [data-mt-lang]', 'nl');
    await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
    await page.click('#i18nDialog [data-mt-run]');
    await waitCode(page, 'translate.batch.ok', s2);
    expectCodes(t, await since(page, s2), ['translate.reuse'], 'traducteur réutilisé');
    es = await since(page, s);
    capture('langues-translator-chrome', es);
    /* (fr → de et fr → nl sont déjà prêts dans le cache : les erreurs se provoquent sur fr → en) */
    s = await mark(page);
    await page.evaluate(() => { window.__trMode = 'unavail'; });
    await page.selectOption('#i18nDialog [data-mt-lang]', 'en');
    await waitCode(page, 'translate.unavailable', s);
    await page.evaluate(() => { window.__trMode = 'gesture'; });
    await page.selectOption('#i18nDialog [data-mt-lang]', 'de');
    await page.selectOption('#i18nDialog [data-mt-lang]', 'en');
    await page.waitForSelector('#i18nDialog [data-mt-run]:not([disabled])');
    await page.click('#i18nDialog [data-mt-run]');
    await waitCode(page, 'translate.batch.fail', s);
    await page.evaluate(() => { window.__trMode = 'throw'; });
    await page.selectOption('#i18nDialog [data-mt-lang]', 'nl');
    await waitCode(page, 'translate.status-fail', s);
    es = await since(page, s);
    expectCodes(t, es, ['translate.unavailable', 'translate.model.fail', 'translate.batch.fail', 'translate.status-fail'], 'Translator de Chrome : erreurs');
    t.ok(/geste requis/.test(es.find(e => e.code === 'translate.model.fail')?.data?.hint || ''), 'geste requis expliqué');
    capture('langues-translator-erreurs', es);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { delete self.Translator; });

    /* CSV : export, import avec lignes et colonnes inconnues, fichier invalide */
    const dir = join(t.shots, 'csv16');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    s = await mark(page);
    await page.click('#i18nBtn');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#i18nDialog [data-i18n-export]')]);
    const csvPath = join(dir, 'traductions.csv');
    await dl.saveAs(csvPath);
    const csv = readFileSync(csvPath, 'utf8').replace('Freie Bürgerinformation', 'Unabhängige Bürgerinformation');
    const lines = csv.split('\r\n');
    lines[0] += ',ja';
    writeFileSync(csvPath, `${lines[0]}\r\n${lines.slice(1).join('\r\n')}n:inconnue:zz:text,text,Texte supprimé\r\n`);
    await page.setInputFiles('#i18nDialog [data-i18n-import]', csvPath);
    await waitCode(page, 'i18n.csv-import.ok', s);
    es = await since(page, s);
    expectCodes(t, es, ['i18n.csv-export', 'i18n.csv-import.start', 'i18n.csv-import.parsed', 'i18n.csv-import.unknown-rows', 'i18n.csv-import.unknown-columns', 'i18n.csv-import.ok'], 'CSV');
    t.ok(es.find(e => e.code === 'i18n.csv-import.ok')?.data?.changed >= 1 && es.find(e => e.code === 'i18n.csv-import.unknown-rows')?.data?.keys?.[0] === 'n:inconnue:zz:text', 'CSV : textes mis à jour, ligne inconnue nommée');
    capture('langues-csv', es);
    s = await mark(page);
    const bad = join(dir, 'mauvais.csv');
    writeFileSync(bad, 'nom;prénom\nDupont;Jean\n');
    await page.setInputFiles('#i18nDialog [data-i18n-import]', bad);
    await waitCode(page, 'i18n.csv-import.fail', s);
    es = await since(page, s);
    expectCodes(t, es, ['i18n.csv-import.start', 'i18n.csv-import.fail'], 'CSV invalide');
    capture('langues-csv-invalide', es);
    await page.keyboard.press('Escape');

    /* Langues du site (panneau Site) : retirer puis rajouter l'anglais, changer la langue affichée */
    s = await mark(page);
    await page.click('[data-left="site"]');
    await page.waitForSelector('[data-lang-toggle="en"]');
    await page.uncheck('[data-lang-toggle="en"]');
    await t.wait(300);
    await page.selectOption('#langSelect', 'nl');
    await t.wait(300);
    await page.selectOption('#langSelect', 'fr');
    await t.wait(200);
    await page.check('[data-lang-toggle="en"]');
    await t.wait(300);
    es = await since(page, s);
    expectCodes(t, es, ['settings.lang-add', 'settings.lang-remove'], 'langues du site');
    t.ok((await site()).languages.includes('en'), 'anglais retiré puis rajouté');
    capture('langues-site', es);
  }
  await page.screenshot({ path: `${t.shots}/c16-langues-ia.png` });
}
