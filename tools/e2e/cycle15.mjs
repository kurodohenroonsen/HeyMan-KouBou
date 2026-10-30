/* Cycle 15 : IA locale (faux Gemini Nano injecté), ✨ reformuler / corriger dans la page, ✨ décrire une image, référencement complet. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const installFake = () => page.evaluate(() => {
    window.__atelierAI = {
      status: { prompt: 'available', multimodal: 'available', summarizer: 'available', rewriter: 'downloadable', writer: 'unavailable', proofreader: 'available', translator: 'available', detector: 'available' },
      has: { prompt: true, multimodal: true, summarizer: true, rewriter: false, proofreader: true, translator: true },
      calls: [],
      async prompt(req) {
        const key = Object.keys(req.schema?.properties || {})[0];
        this.calls.push({ api: 'prompt', key, lang: req.lang, images: req.images?.length || 0 });
        const r = { text: { text: 'Le MAB réunit les médias alternatifs belges.' }, title: { title: 'MAB – fédération des médias alternatifs belges' }, keywords: { keywords: ['médias alternatifs', 'radio associative', 'fédération des médias'] }, alt: { alt: 'Image de une équipe de tournage avec une caméra', decorative: false } }[key];
        return JSON.stringify(r || {});
      },
      async summarize(req) { this.calls.push({ api: 'summarizer', lang: req.lang }); return 'Le MAB fédère les médias alternatifs belges : matériel, techniciens et diffusion partagés, indépendance éditoriale garantie pour chaque rédaction membre.'; },
      async proofread(req) { this.calls.push({ api: 'proofreader' }); const i = req.text.indexOf('Nous'); return { correctedInput: req.text, corrections: i >= 0 ? [{ startIndex: i, endIndex: i + 4, correction: 'Ensemble, nous' }] : [] }; },
      async translate(req) { this.calls.push({ api: 'translator', to: req.to }); return `[${req.to}] ${req.text}`; }
    };
  });
  await installFake();

  /* --- 1. fenêtre IA locale --- */
  await page.click('#aiBtn');
  await page.waitForSelector('#aiDialog [data-ai-api="prompt"]');
  t.ok((await page.locator('#aiDialog [data-ai-state="prompt"]').textContent()).includes('prêt'), 'état des API : Prompt API prête');
  await page.click('#aiDialog [data-ai-download="rewriter"]');
  t.ok(await page.waitForFunction(() => document.querySelector('#aiDialog [data-ai-state="rewriter"]')?.textContent.includes('prêt'), null, { timeout: 5000 }).then(() => true).catch(() => false), 'téléchargement d’un modèle en essai (Rewriter)');
  t.ok((await page.locator('#aiDialog').textContent()).includes('chrome://flags/#proofreader-api'), 'réglages Chrome des API en essai indiqués');
  await page.keyboard.press('Escape');

  /* --- 2. ✨ reformuler dans la page --- */
  const text = c.locator('main [data-type="text"]').first();
  const tid = await text.getAttribute('data-node');
  await text.locator('[data-edit]').dblclick();
  await t.wait(200);
  await page.keyboard.press('Control+a');
  await c.locator('#atelier-format [data-fmt="ai"]').click();
  await c.locator('#atelier-format [data-fmt="ai-mode"][data-mode="shorter"]').click();
  await c.locator('#atelier-format .fmt-ai-out:not([hidden])').waitFor({ timeout: 5000 });
  t.ok((await c.locator('#atelier-format .fmt-ai-text').textContent()).includes('Le MAB réunit les médias alternatifs belges.'), '✨ Plus court : proposition affichée avant de remplacer');
  await c.locator('#atelier-format [data-fmt="ai-apply"]').click();
  await t.wait(300);
  let s = await site();
  const node = id => { const f = n => n.id === id ? n : (n.children || []).map(f).find(Boolean); return f(s.pages[0].root); };
  t.ok(node(tid).props.content.fr.includes('Le MAB réunit les médias alternatifs belges.') && !node(tid).props.content.fr.includes('Chaque rédaction'), 'texte remplacé dans le site');
  t.ok(s.mt?.[`n:${s.pages[0].id}:${tid}:content|fr`] === 'ai', 'marqué « à relire »');

  /* --- 3. ✨ corriger (corrections positionnées) --- */
  await page.keyboard.press('End');
  await page.keyboard.type(' Nous partageons tout.');
  await t.wait(300);
  await page.keyboard.press('Control+a');
  await c.locator('#atelier-format [data-fmt="ai"]').click();
  await c.locator('#atelier-format [data-fmt="ai-proof"]').click();
  await c.locator('#atelier-format .fmt-ai-out:not([hidden])').waitFor({ timeout: 5000 });
  t.ok((await c.locator('#atelier-format .fmt-ai-text mark').count()) === 1, '✨ Corriger : la correction est surlignée');
  await c.locator('#atelier-format [data-fmt="ai-apply"]').click();
  await t.wait(300);
  s = await site();
  t.ok(node(tid).props.content.fr.includes('Ensemble, nous partageons tout.'), 'correction appliquée à l’endroit exact');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await t.wait(200);
  await page.keyboard.press('Control+z');
  await t.wait(300);
  s = await site();
  t.ok(!node(tid).props.content.fr.includes('Ensemble, nous'), 'Ctrl+Z annule');

  /* --- 4. ✨ décrire une image --- */
  const img = c.locator('main [data-type="image"]').first();
  const iid = await img.getAttribute('data-node');
  await img.click();
  await page.click('[data-insp="content"]');
  await page.setInputFiles('#inspector input[type="file"][data-field="src"]', { name: 'tournage.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('#inspector [data-ai-alt]', { timeout: 8000 });
  await page.locator('#inspector [data-field="alt"][lang="fr"]').fill('');
  await t.wait(300);
  await page.click('#seoBtn');
  await page.waitForSelector('#seoDialog [data-check="img-alt"] [data-seo-go]');
  t.ok(true, 'référencement : image sans texte alternatif signalée');
  await page.click('#seoDialog [data-check="img-alt"] [data-seo-go]');
  await t.wait(500);
  t.ok(!(await page.locator('#seoDialog').count()) && (await page.evaluate(() => window.__atelier.selected)) === iid, '« Aller à » sélectionne l’image concernée');
  await page.click('[data-insp="content"]');
  await page.click('#inspector [data-ai-alt]');
  await t.wait(600);
  s = await site();
  t.ok(node(iid).props.alt.fr === 'Une équipe de tournage avec une caméra', `texte alternatif proposé et nettoyé (« ${node(iid).props.alt.fr} »)`);
  t.ok(await page.evaluate(() => window.__atelierAI.calls.some(x => x.key === 'alt' && x.images === 1)), 'l’image a été donnée au modèle local');

  /* --- 5. référencement --- */
  await page.click('#seoBtn');
  await page.waitForSelector('#seoDialog [data-seo-page]');
  const score0 = Number((await page.locator('#seoDialog [data-seo-score]').textContent()).split('/')[0]);
  t.ok(score0 > 0 && score0 <= 100, `note de la page d’accueil : ${score0}/100`);
  t.ok(await page.locator('#seoDialog [data-seo-preview]').count() === 1, 'aperçu Google');
  t.ok((await page.locator('#seoDialog [data-seo-preview]').textContent()).includes('média-alternatif.be'), 'adresse accentuée lisible dans l’aperçu');
  t.ok(await page.locator('#seoDialog [data-check="desc-auto"]').count() === 1, 'point signalé : description automatique');
  await page.click('#seoDialog [data-ai-seo="description"]');
  await page.waitForFunction(() => document.querySelector('#seoDialog [data-seo="description"]')?.value.startsWith('Le MAB fédère'), null, { timeout: 5000 });
  s = await site();
  const home = s.pages[0];
  t.ok(home.seo.description.fr.length <= 160 && home.seo.description.fr.startsWith('Le MAB fédère'), '✨ description proposée (Summarizer), 160 caractères au plus');
  t.ok(s.mt?.[`p:${home.id}:seo|fr`] === 'ai', 'description marquée « à relire »');
  await page.click('#seoDialog [data-ai-seo="keywords"]');
  await page.waitForSelector('#seoDialog [data-kw]');
  await page.click('#seoDialog [data-kw="médias alternatifs"]');
  await page.waitForSelector('#seoDialog [data-check="keyword-h1"]');
  t.ok(await page.locator('#seoDialog [data-check="keyword-desc"].is-good').count() === 1, 'mot-clé choisi parmi les idées, vérifié dans la description');
  await page.click('#seoDialog [data-ai-seo="title"]');
  await page.waitForFunction(() => document.querySelector('#seoDialog [data-seo="title"]')?.value.includes('fédération'), null, { timeout: 5000 });
  const score1 = Number((await page.locator('#seoDialog [data-seo-score]').textContent()).split('/')[0]);
  t.ok(score1 > score0, `la note monte (${score0} → ${score1})`);
  await page.selectOption('#seoDialog [data-seo-lang]', 'nl');
  await page.waitForSelector('#seoDialog [data-ai-seo-all]');
  await page.click('#seoDialog [data-ai-seo-all]');
  await page.waitForFunction(() => window.__atelier.site.pages.every(p => p.seo?.description?.nl), null, { timeout: 8000 });
  s = await site();
  t.ok(s.pages.every(p => p.seo.description.nl.startsWith('[nl] ')), 'néerlandais : rédigé en français puis traduit sur l’appareil, pour toutes les pages');
  t.ok(await page.evaluate(() => window.__atelierAI.calls.some(x => x.api === 'summarizer' && x.lang === 'fr')), 'génération faite en français');
  await page.selectOption('#seoDialog [data-seo-lang]', 'fr');
  const contact = s.pages.find(p => p.slug === 'contact');
  await page.click(`#seoDialog [data-seo-pick="${contact.id}"]`);
  await page.check('#seoDialog [data-seo="noindex"]');
  await t.wait(300);
  t.ok((await site()).pages.find(p => p.id === contact.id).seo.noindex === true, 'contact : ne pas indexer');
  await page.screenshot({ path: `${t.shots}/cycle15-seo.png` });
  await page.keyboard.press('Escape');

  /* --- 6. sans IA : message clair, le référencement reste --- */
  await page.evaluate(() => { window.__atelierAI = { has: {}, status: {} }; });
  await page.click('#seoBtn');
  await page.click('#seoDialog [data-ai-seo="title"]');
  await t.wait(400);
  t.ok(await page.locator('#toasts .toast', { hasText: 'IA locale indisponible' }).count() >= 1, 'sans IA : message qui explique comment l’activer');
  await page.keyboard.press('Escape');
  await installFake();

  /* --- 7. site publié --- */
  await page.click('#exportZipBtn');
  await t.wait(300);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#auditExport')]);
  const dir = join(t.shots, 'export15');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await dl.saveAs(join(dir, 'site.zip'));
  execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', join(dir, 'site.zip'), join(dir, 'site')]);
  const h = readFileSync(join(dir, 'site', 'index.html'), 'utf8');
  t.ok(h.includes('<title>MAB – fédération des médias alternatifs belges</title>') && h.includes('<meta name="description" content="Le MAB fédère'), 'publié : titre et description pour Google');
  t.ok(h.includes('"@type":"Organization"') && h.includes('twitter:card') && h.includes('og:site_name'), 'publié : Organization, Open Graph, Twitter');
  t.ok(h.includes('alt="Une équipe de tournage avec une caméra"'), 'publié : texte alternatif');
  const nl = readFileSync(join(dir, 'site', 'nl', 'index.html'), 'utf8');
  t.ok(nl.includes('<meta name="description" content="[nl] Le MAB'), 'publié : description néerlandaise');
  const ct = readFileSync(join(dir, 'site', 'contact', 'index.html'), 'utf8');
  t.ok(ct.includes('<meta name="robots" content="noindex">') && h.includes('"@type":"WebSite"'), 'publié : contact non indexé');
  t.ok(!readFileSync(join(dir, 'site', 'sitemap.xml'), 'utf8').includes('/contact/'), 'sitemap sans la page non indexée');
  await page.screenshot({ path: `${t.shots}/cycle15.png` });
}
