/* Captures de l'éditeur pour le guide HTML, dans les trois langues : node tools/guide-captures.mjs [http://localhost:8791/]
   → docs/captures/guide/<fr|en|ja>/<nom>.jpg (puis node tools/guide-html.mjs les copie dans guide/assets/captures/). */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] || 'http://localhost:8791/';
const browser = await chromium.launch();
for (const lang of ['fr', 'en', 'ja']) {
  const out = join(ROOT, 'docs/captures/guide', lang);
  mkdirSync(out, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: { fr: 'fr-FR', en: 'en-GB', ja: 'ja-JP' }[lang] });
  const p = await ctx.newPage();
  await p.goto(`${base}?lang=${lang}&fresh=1`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__atelier?.ready === true);
  const shot = name => p.screenshot({ path: join(out, `${name}.jpg`), type: 'jpeg', quality: 85 });
  const closeAll = () => p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const dialog = async (open, name) => { await open(); await p.waitForSelector('dialog[open]'); await p.waitForTimeout(500); await shot(name); await closeAll(); await p.waitForTimeout(150); };
  await p.frameLocator('#canvas').locator('[data-type="heading"]').first().click();
  await p.waitForTimeout(300);
  await shot('editeur');
  await p.click('[data-insp="style"]');
  await p.waitForTimeout(300);
  await shot('style');
  await p.click('[data-insp="content"]');
  await p.click('[data-left="pages"]');
  await p.waitForTimeout(300);
  await shot('pages');
  await p.click('[data-left="widgets"]');
  await dialog(() => p.click('#i18nBtn'), 'traductions');
  await dialog(() => p.click('#seoBtn'), 'seo');
  await dialog(() => p.click('#aiBtn'), 'ia');
  await dialog(() => p.click('#publishBtn'), 'publier');
  await dialog(() => p.click('#collabBtn'), 'collab');
  await dialog(() => p.click('#logBtn'), 'journal');
  await dialog(async () => { await p.click('#fileMenu > summary'); await p.click('#newSiteBtn'); await p.selectOption('#newSiteMain', 'ja'); await p.check('[data-new-lang="fr"]'); await p.fill('#newSiteName', '久万高原町 観光ガイド（非公式デモ）'); }, 'nouveau-site');
  await p.evaluate(() => window.autotest({ only: [4] }));
  await p.waitForSelector('#selftestDialog[open]');
  await p.waitForTimeout(300);
  await shot('autotest');
  await ctx.close();
  console.log(`${lang} : captures dans docs/captures/guide/${lang}/`);
}
await browser.close();
