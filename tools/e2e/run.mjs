/* Lanceur des tests de bout en bout : node tools/e2e/run.mjs http://localhost:8791/ [dossier-captures] [cycle…] */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8791/';
const shots = process.argv[3] || './shots';
const only = process.argv.slice(4);
mkdirSync(shots, { recursive: true });

const specs = ['cycle2', 'cycle3', 'cycle4', 'cycle5', 'cycle6', 'cycle7', 'cycle8', 'cycle9', 'cycle10', 'cycle11', 'cycle12', 'cycle13', 'cycle14', 'cycle15', 'cycle16', 'c16-edition', 'c16-contenus', 'c16-langues-ia', 'c16-collab', 'cycle17', 'cycle18', 'cycle19', 'cycle20', 'cycle21', 'cycle22', 'cycle22-ja-site', 'cycle23', 'cycle24', 'cycle25', 'cycle26', 'cycle27', 'cycle28', 'cycle29', 'cycle30', 'cycle31', 'cycle32', 'cycle33', 'cycle34', 'cycle35', 'cycle36'].filter(s => !only.length || only.includes(s));
const browser = await chromium.launch();
let failed = 0, passed = 0;

for (const name of specs) {
  let mod;
  try { mod = await import(`./${name}.mjs`); } catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND') continue; throw e; }
  console.log(`\n=== ${name} ===`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: process.env.ATELIER_LOCALE || 'fr-FR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/erreur-de-test-volontaire/.test(e.message)) errors.push(e.message); });
  const benign = /fonts\.(googleapis|gstatic)|ERR_|net::|Failed to load resource/;
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    if (/erreur-de-test|\/absent\/publish\.php/.test(txt)) return;
    if (txt.includes('[Atelier]')) {
      /* Erreurs notées par le journal : seules les erreurs non prévues font échouer (les erreurs testées exprès sont normales) */
      if (/ (app\.uncaught|app\.rejection|boot\.(error|timeout|rejection)|store\.invalid) /.test(txt) || (/ (app\.console|app\.resource|boot\.resource) /.test(txt) && !benign.test(txt))) errors.push(txt);
      return;
    }
    if (!benign.test(txt)) errors.push(txt);
  });
  await page.exposeFunction('__toastSeen', txt => { if (/Failed to|TypeError|ReferenceError|is not a function|Cannot read|undefined|null/.test(txt)) errors.push('toast: ' + txt); });
  await page.addInitScript(() => {
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.closest?.('#toasts')) window.__toastSeen(n.textContent); })
      .observe(document, { childList: true, subtree: true });
  });
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Équipe' : undefined));
  const t = {
    page, browser, base, shots,
    canvas: () => page.frameLocator('#canvas'),
    ok(cond, msg) { if (cond) { passed++; console.log('  PASS ' + msg); } else { failed++; console.log('  FAIL ' + msg); } },
    async wait(ms = 250) { await page.waitForTimeout(ms); }
  };
  try {
    await page.goto(base + '?fresh=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 8000 });
    await mod.default(t);
  } catch (e) {
    failed++;
    console.log('  FAIL exception : ' + e.message.split('\n')[0]);
    await page.screenshot({ path: `${shots}/${name}-erreur.png` }).catch(() => {});
  }
  t.ok(errors.length === 0, `aucune erreur JavaScript (${name})` + (errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await browser.close();
console.log(`\nRésultat : ${passed} réussis, ${failed} échoués`);
process.exitCode = failed ? 1 : 0;
