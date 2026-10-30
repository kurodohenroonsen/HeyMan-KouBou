/* Cycle 22 : interface en anglais et en japonais — aucun texte français visible (hors contenu du site), journal traduit, sélecteur de langue. */
import { mark, since } from './logs.mjs';

const FR_WORD = /(^|[\s(«“'’])(le|la|les|des|du|un|une|et|ou|pour|avec|dans|sur|vous|votre|vos|pas|est|sont|aucun|aucune|cette|ce|ces|à|au|aux)(?=[\s,.;:!?)»”]|$)/i;
const FR_CHAR = /[àâçéèêëîïôûùüÿœ]/i;

export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(10000);

  /* Textes visibles de l'éditeur (pas le canevas, pas les champs saisis, pas le contenu du site) qui ont l'air français */
  const frenchLeft = where => page.evaluate(({ where, frw, frc }) => {
    const FRW = new RegExp(frw, 'i');
    const FRC = new RegExp(frc, 'i');
    const s = window.__atelier.site;
    const content = new Set();
    const walk = v => { if (typeof v === 'string') { if (v.length > 1) content.add(v.trim()); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(s);
    const isContent = txt => [...content].some(c => c && (c === txt || (txt.length > 3 && c.includes(txt)) || (c.length > 3 && txt.includes(c))));
    /* noms de langue (écrits dans leur langue) et adresses web : pas du texte d'interface */
    const strip = v => String(v).replace(/Français|Nederlands|Deutsch|English|日本語/g, '').replace(/(https?:\/\/)?[\w.-]*[\w-]+\.(be|com|org|net|fr|jp|eu|io)(\/[^\s]*)?/gi, '');
    const root = document.querySelector('dialog[open]') || document.body;
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      const el = n.parentElement;
      if (!el || el.closest('script, style, iframe, #pageSelect, #langSelect, #siteName, [data-site-content], .lang-name, code, kbd, pre, textarea')) continue;
      if (!el.checkVisibility?.()) continue;
      const txt = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (!/\p{L}{2,}/u.test(txt) || isContent(txt)) continue;
      const bare = strip(txt);
      if (FRC.test(bare) || FRW.test(bare)) out.push(`${where} : ${txt.slice(0, 90)}`);
    }
    for (const el of root.querySelectorAll('[title], [aria-label], [placeholder], [data-tip]')) {
      if (el.closest('iframe') || !el.checkVisibility?.()) continue;
      for (const a of ['title', 'aria-label', 'placeholder', 'data-tip']) {
        const v = el.getAttribute(a);
        if (v && !isContent(v.trim()) && (FRC.test(strip(v)) || FRW.test(strip(v)))) out.push(`${where} [${a}] : ${v.slice(0, 90)}`);
      }
    }
    return [...new Set(out)];
  }, { where, frw: FR_WORD.source, frc: FR_CHAR.source });

  for (const lang of ['en', 'ja']) {
    await page.goto(`${t.base}?lang=${lang}&fresh=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
    t.ok(await page.evaluate(l => document.documentElement.lang === l && document.querySelector('#uiLangSelect').value === l, lang), `${lang} : langue de l’interface active`);
    const left = [];
    left.push(...await frenchLeft(`${lang} écran`));
    for (const l of ['widgets', 'templates', 'navigator', 'pages', 'content', 'site']) { await page.click(`[data-left="${l}"]`); await t.wait(200); left.push(...await frenchLeft(`${lang} panneau ${l}`)); }
    await t.canvas().locator('[data-type="heading"]').first().click();
    for (const i of ['content', 'style', 'advanced']) { await page.click(`[data-insp="${i}"]`); await t.wait(150); left.push(...await frenchLeft(`${lang} inspecteur ${i}`)); }
    for (const id of ['aiBtn', 'collabBtn', 'i18nBtn', 'seoBtn', 'publishBtn', 'exportZipBtn', 'logBtn']) {
      await page.click(`#${id}`);
      await page.waitForSelector('dialog[open]');
      await t.wait(400);
      left.push(...await frenchLeft(`${lang} ${id}`));
      await page.keyboard.press('Escape');
      await t.wait(150);
    }
    /* fenêtres plus profondes */
    const deeper = [
      ['versions', async () => { await page.click('#fileMenu summary'); await page.click('#versionsBtn'); }],
      ['nouvelle collection', async () => { await page.click('[data-left="content"]'); await page.click('#newCollectionBtn'); }],
      ['banc d’essai', async () => { await page.click('#aiBtn'); await page.waitForSelector('#aiDialog[open]'); await page.click('#aiDialog [data-ai-bench]'); }],
      ['palette', async () => { await page.click('[data-left="site"]'); await page.click('#leftBody [data-palette-logo]'); }],
      ['raccourcis', async () => { await page.click('#canvas', { position: { x: 5, y: 5 } }).catch(() => {}); await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('Shift+?'); }]
    ];
    for (const [name, open] of deeper) {
      try {
        await open();
        await page.waitForSelector('dialog[open]', { timeout: 4000 });
        await t.wait(400);
        left.push(...await frenchLeft(`${lang} ${name}`));
      } catch (e) { left.push(`${lang} ${name} : fenêtre non ouverte (${e.message.split('\n')[0].slice(0, 60)})`); }
      await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
      await t.wait(150);
    }
    /* une collection créée puis ouverte */
    await page.click('[data-left="content"]');
    await page.click('#newCollectionBtn');
    await page.click('#collectionNewDialog [data-kind="events"]');
    await page.click('#collectionNewDialog [data-col-create]');
    await t.wait(400);
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    await page.click('[data-left="content"]');
    left.push(...await frenchLeft(`${lang} panneau contenus (agenda)`));
    await page.click('#leftBody [data-col-open]');
    await page.waitForSelector('#collectionDialog[open]');
    await page.click('#collectionDialog [data-item-add]');
    await t.wait(300);
    left.push(...await frenchLeft(`${lang} collection`));
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
    /* commentaires */
    await page.click('#commentsBtn');
    await t.wait(300);
    left.push(...await frenchLeft(`${lang} commentaires`));
    await page.click('#commentsBtn');
    await page.keyboard.press('Control+k');
    await t.wait(300);
    left.push(...await frenchLeft(`${lang} Ctrl+K`));
    await page.keyboard.press('Escape');
    await page.click('#fileMenu summary');
    left.push(...await frenchLeft(`${lang} menu Fichier`));
    await page.click('#fileMenu summary');
    t.ok(left.length === 0, `${lang} : aucun texte français visible (${left.length})${left.length ? ` — ${left.slice(0, 12).join(' | ')}` : ''}`);
    if (left.length) console.log(left.join('\n'));
    await page.screenshot({ path: `${t.shots}/c22-${lang}.png` });

    /* journal dans la langue de l'interface */
    const s = await mark(page);
    await page.click('[data-left="pages"]');
    await page.fill('#newPageTitle', lang === 'ja' ? 'チーム' : 'Team');
    await page.click('#addPageBtn');
    await t.wait(300);
    const es = await since(page, s);
    const add = es.find(e => e.code === 'page.add');
    const bare = String(add?.msg || '').replace(/チーム|Team/g, '');
    t.ok(add && (lang === 'ja' ? /[぀-ヿ一-龯]/.test(bare) : !FR_CHAR.test(bare) && !FR_WORD.test(bare)), `${lang} : journal traduit (page.add : « ${add?.msg} »)`);
    const toast = await page.locator('#toasts').textContent();
    t.ok(!FR_CHAR.test(toast) || lang === 'fr', `${lang} : message affiché traduit (${toast.slice(0, 80)})`);
  }

  /* L'auto-test complet marche aussi en japonais (sélecteurs et textes comparés dans la langue de l'interface) */
  const r = await page.evaluate(async () => { const line = await window.autotest(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); return { line, sum: window.atelierDebug ? await window.atelierDebug.report() : '' }; });
  const m = r.sum.match(/(\d+) \/ (\d+)/);
  t.ok(m && m[1] === m[2], `auto-test en japonais : ${r.line.slice(0, 120)}`);
  if (!(m && m[1] === m[2])) console.log(r.sum.slice(0, 3000));

  /* Sélecteur du menu Fichier : passage au français, retenu au rechargement */
  await page.click('#fileMenu summary');
  await Promise.all([page.waitForNavigation(), page.selectOption('#uiLangSelect', 'fr')]);
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
  t.ok(await page.evaluate(() => document.documentElement.lang === 'fr' && /Fichier/.test(document.querySelector('#fileMenu summary').textContent)), 'sélecteur : interface repassée en français');
  t.ok(await page.evaluate(() => window.__atelier.site.pages.some(p => p.title?.fr === 'チーム')), 'changement de langue : le projet est gardé');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
  t.ok(await page.evaluate(() => document.documentElement.lang === 'fr'), 'choix retenu après rechargement');
}
