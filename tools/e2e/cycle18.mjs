/* Cycle 18 : « Demander à Atelier » (faux Gemini Nano) — Ctrl+K, aperçu, application en une étape, page décrite, refus, sans IA. */
import { mark, since, waitCode, expectCodes, expectNoErrors, capture } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const curPage = async () => { const s = await site(); const id = await page.evaluate(() => window.__atelier.pageId); return s.pages.find(p => p.id === id); };
  const count = (root, type) => { let n = 0; const w = x => { if (x.type === type) n++; (x.children || []).forEach(w); }; w(root); return n; };
  await page.evaluate(() => {
    window.__atelierAI = {
      status: { prompt: 'available', multimodal: 'available', summarizer: 'available', rewriter: 'unavailable', writer: 'unavailable', proofreader: 'unavailable', translator: 'available', detector: 'available' },
      has: { prompt: true, multimodal: true, summarizer: true, translator: true },
      async prompt(req) {
        const q = (req.user.match(/Demande : ([\s\S]*)$/) || [])[1]?.toLowerCase() || '';
        if (/faq/.test(q)) return JSON.stringify({ summary: 'J’ajoute une section de questions fréquentes sur l’adhésion.', actions: [{ action: 'add_faq', title: 'Adhérer au MAB', questions: [{ q: 'Qui peut adhérer ?', a: 'Tout média associatif belge.' }, { q: 'Combien ça coûte ?', a: 'L’adhésion est gratuite la première année.' }, { q: 'Comment faire ?', a: 'Écrivez-nous via le formulaire de contact.' }] }] });
        if (/titres/.test(q)) return JSON.stringify({ summary: 'Je mets les titres en rouge et je les centre.', actions: [{ action: 'style', target: 'headings', property: 'color', value: 'rouge' }, { action: 'style', target: 'headings', property: 'textAlign', value: 'centré' }] });
        if (/page/.test(q)) return JSON.stringify({ summary: 'Je crée la page « Notre radio » avec trois sections.', actions: [{ action: 'add_page', title: 'Notre radio', sections: [{ template: 'hero', title: 'Radio Panik, la radio des Bruxellois' }, { template: 'text-image', text: 'Une radio associative, libre et participative.' }, { template: 'carrousel-3d' }, { template: 'contact' }] }, { action: 'open_tool', tool: 'seo' }] });
        return JSON.stringify({ summary: 'Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions.', actions: [{ action: 'delete_site' }] });
      }
    };
  });

  /* ===== 1. Ctrl+K → une phrase → Demander à Atelier : FAQ ===== */
  await c.locator('[data-type="heading"]').first().click();
  await t.wait(150);
  let s = await mark(page);
  const before = await curPage();
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'ajoute une faq sur l’adhésion');
  await t.wait(150);
  t.ok(/Demander à Atelier/.test(await page.locator('#cmdk [role=option], #cmdk li').first().textContent()), 'Ctrl+K : « Demander à Atelier » en tête pour une phrase');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#askDialog[open]');
  t.ok(await page.inputValue('#askDialog [data-ask-request]') === 'ajoute une faq sur l’adhésion', 'la demande est reprise');
  await page.click('#askDialog [data-ask-plan]');
  await page.waitForSelector('#askDialog [data-ask-step]');
  t.ok(/questions fréquentes/i.test(await page.textContent('#askDialog [data-ask-steps]')) && /3 questions/.test(await page.textContent('#askDialog [data-ask-steps]')), 'aperçu : la FAQ et ses 3 questions');
  await page.screenshot({ path: `${t.shots}/c18-demander.png` });
  await page.click('#askDialog [data-ask-apply]');
  await waitCode(page, 'assist.apply.ok', s);
  let p = await curPage();
  t.ok(count(p.root, 'accordion') === count(before.root, 'accordion') + 1, 'FAQ ajoutée à la page');
  const accTitles = JSON.stringify(p.root).includes('Qui peut adhérer ?');
  t.ok(accTitles, 'FAQ : questions écrites');
  t.ok(Object.keys((await site()).mt || {}).some(k => /:items\.0\.title\|fr$/.test(k)), 'FAQ : textes marqués « à relire »');
  await page.keyboard.press('Control+z');
  await t.wait(250);
  p = await curPage();
  t.ok(count(p.root, 'accordion') === count(before.root, 'accordion'), 'Ctrl+Z annule toute la demande en une fois');
  let es = await since(page, s);
  expectCodes(t, es, ['cmdk.run', 'assist.open', 'ai.plan.start', 'ai.plan.call', 'ai.plan.actions', 'ai.plan.ok', 'assist.plan', 'assist.apply.start', 'assist.apply.step', 'assist.apply.ok', 'store.undo'], 'FAQ');
  expectNoErrors(t, es, 'FAQ');
  capture('demander-faq', es);

  /* ===== 2. Titres en rouge et centrés ===== */
  s = await mark(page);
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'demander à atelier');
  await t.wait(150);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#askDialog[open]');
  await page.fill('#askDialog [data-ask-request]', 'mets les titres de cette page en rouge et centrés');
  await page.keyboard.press('Control+Enter');
  await page.waitForSelector('#askDialog [data-ask-step]');
  t.ok(await page.locator('#askDialog [data-ask-step="style"]').count() === 2, 'aperçu : deux réglages de style');
  await page.click('#askDialog [data-ask-apply]');
  await waitCode(page, 'assist.apply.ok', s);
  p = await curPage();
  const heads = []; const wh = x => { if (x.type === 'heading') heads.push(x); (x.children || []).forEach(wh); }; wh(p.root);
  t.ok(heads.length > 0 && heads.every(h => h.style.desktop.color === '#dc2626' && h.style.desktop.textAlign === 'center'), `tous les titres rouges et centrés (${heads.length})`);
  es = await since(page, s);
  expectCodes(t, es, ['assist.open', 'ai.plan.ok', 'assist.plan', 'assist.apply.ok'], 'titres');
  capture('demander-style', es);

  /* ===== 3. Page décrite (panneau Pages) : une section refusée, page créée et ouverte, outil ouvert ===== */
  s = await mark(page);
  await page.click('[data-left="pages"]');
  await t.wait(200);
  await page.click('#leftBody [data-page-describe]');
  await page.waitForSelector('#askDialog[open]');
  t.ok(/Crée une page/.test(await page.inputValue('#askDialog [data-ask-request]')), 'page décrite : demande préremplie');
  await page.fill('#askDialog [data-ask-request]', 'Crée une page « Notre radio » avec un héros, un texte et image et le contact');
  await page.click('#askDialog [data-ask-plan]');
  await page.waitForSelector('#askDialog [data-ask-step]');
  t.ok(/carrousel-3d/.test(await page.textContent('#askDialog [data-ask-rejected]')), 'page décrite : section inconnue refusée et expliquée');
  await page.click('#askDialog [data-ask-apply]');
  await waitCode(page, 'assist.apply.ok', s);
  await t.wait(300);
  const sNow = await site();
  const radio = sNow.pages.find(x => x.title.fr === 'Notre radio');
  t.ok(radio && radio.root.children.length === 3, 'page décrite : créée avec 3 sections');
  t.ok(await page.inputValue('#pageSelect') === radio?.id, 'page décrite : ouverte');
  t.ok(JSON.stringify(radio?.root).includes('Radio Panik, la radio des Bruxellois'), 'page décrite : titre du héros écrit');
  t.ok(sNow.mt?.[`p:${radio?.id}:title|fr`] === 'ai', 'page décrite : titre marqué « à relire »');
  t.ok(await page.locator('#seoDialog[open]').count() === 1, 'page décrite : outil SEO ouvert');
  await page.keyboard.press('Escape');
  es = await since(page, s);
  expectCodes(t, es, ['assist.open', 'ai.plan.rejected', 'assist.rejected', 'assist.plan', 'assist.apply.ok', 'store.view'], 'page décrite');
  capture('demander-page', es);

  /* ===== 4. Rien à faire ; fermer sans appliquer ; sans IA ===== */
  s = await mark(page);
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'supprime tout le site maintenant');
  await t.wait(150);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#askDialog[open]');
  await page.click('#askDialog [data-ask-plan]');
  await page.waitForSelector('#askDialog [data-ask-nothing]');
  t.ok(await page.locator('#askDialog [data-ask-apply]:not([hidden])').count() === 0, 'rien à faire : pas de bouton Appliquer');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.__atelierAI.has.prompt = false; window.__atelierAI.status.prompt = 'unavailable'; });
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'ajoute une faq sur les dons');
  await t.wait(150);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#askDialog[open]');
  await page.click('#askDialog [data-ask-plan]');
  await waitCode(page, 'assist.plan-fail', s);
  await page.keyboard.press('Escape');
  es = await since(page, s);
  expectCodes(t, es, ['ai.plan.rejected', 'assist.rejected', 'assist.nothing', 'assist.cancel', 'ai.plan.absent', 'assist.plan-fail'], 'refus et sans IA');
  capture('demander-refus-sans-ia', es);
}
