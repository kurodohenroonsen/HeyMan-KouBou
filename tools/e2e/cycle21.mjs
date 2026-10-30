/* Cycle 21 : infobulles des boutons — couverture, survol, clavier, canevas, placement. */
export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(8000);
  const tip = () => page.evaluate(() => {
    const el = document.querySelector('#atelierTip');
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return { text: el.querySelector('[data-tip-text]')?.textContent || '', desc: el.querySelector('[data-tip-desc]')?.textContent || '', keys: [...el.querySelectorAll('kbd')].map(k => k.textContent), x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const box = sel => page.locator(sel).boundingBox();

  /* ===== 1. Couverture : chaque bouton à icône visible a un texte d'aide ===== */
  const missing = () => page.evaluate(() => {
    const out = [];
    const root = document.querySelector('dialog[open]') || document;
    for (const el of root.querySelectorAll('button, summary, [role=button], label.btn, .lib-item')) {
      if (!el.checkVisibility?.() || !el.getBoundingClientRect().width) continue;
      const txt = (el.textContent || '').trim();
      if ((txt.match(/\p{L}/gu) || []).length >= 3) continue;
      if (el.title || el.dataset.tip || el.getAttribute('aria-label')) continue;
      out.push(el.outerHTML.slice(0, 140));
    }
    return out;
  });
  const holes = [];
  holes.push(...await missing());
  for (const l of ['widgets', 'navigator', 'pages', 'content', 'site']) { await page.click(`[data-left="${l}"]`); await t.wait(150); holes.push(...await missing()); }
  await t.canvas().locator('[data-type="heading"]').first().click();
  for (const i of ['content', 'style', 'advanced']) { await page.click(`[data-insp="${i}"]`); await t.wait(120); holes.push(...await missing()); }
  for (const id of ['aiBtn', 'collabBtn', 'i18nBtn', 'seoBtn', 'publishBtn', 'exportZipBtn', 'logBtn']) {
    await page.click(`#${id}`);
    await page.waitForSelector('dialog[open]');
    await t.wait(250);
    holes.push(...(await missing()).map(x => `${id} : ${x}`));
    await page.keyboard.press('Escape');
    await t.wait(150);
  }
  t.ok(holes.length === 0, `couverture : tous les boutons à icône ont un texte d’aide${holes.length ? ` — ${[...new Set(holes)].slice(0, 5).join(' | ')}` : ''}`);
  await page.click('[data-insp="content"]');

  /* ===== 2. Survol : ↶ ===== */
  await page.mouse.move(5, 500);
  await t.wait(200);
  const u = await box('#undoBtn');
  await page.mouse.move(u.x + u.width / 2, u.y + u.height / 2);
  await t.wait(120);
  t.ok(!(await tip()), 'pas d’infobulle avant le délai');
  await t.wait(450);
  let tp = await tip();
  t.ok(tp?.text === 'Annuler', `survol ↶ : « ${tp?.text} »`);
  t.ok(JSON.stringify(tp?.keys) === JSON.stringify(['Ctrl', 'Z']), `raccourci en touches : ${tp?.keys?.join(' ')}`);
  t.ok(!!tp?.desc, `explication : ${tp?.desc}`);
  t.ok(tp && tp.y >= u.y + u.height && tp.y < u.y + u.height + 20, 'placée sous le bouton');
  t.ok(await page.evaluate(() => !document.querySelector('#undoBtn').hasAttribute('title') && document.querySelector('#undoBtn').dataset.tip && document.querySelector('#undoBtn').getAttribute('aria-label')), 'pas de double infobulle : title déplacé, nom accessible gardé');
  await page.screenshot({ path: `${t.shots}/c21-infobulle.png`, clip: { x: 0, y: 0, width: 900, height: 160 } });

  /* passage rapide au bouton voisin : tout de suite */
  const r = await box('#redoBtn');
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await t.wait(80);
  tp = await tip();
  t.ok(tp?.text === 'Rétablir' && tp.keys.join('+') === 'Ctrl+Maj+Z', `passage rapide ↷ : « ${tp?.text} » ${tp?.keys?.join(' ')}`);

  /* sortie, Échap, clic */
  await page.mouse.move(5, 500);
  await t.wait(150);
  t.ok(!(await tip()), 'sortie : infobulle cachée');
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await t.wait(500);
  await page.keyboard.press('Escape');
  await t.wait(80);
  t.ok(!(await tip()), 'Échap : infobulle cachée');

  /* ✨ : bouton sans aria-label au départ, avec une explication */
  const a = await box('#aiBtn');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await t.wait(500);
  tp = await tip();
  t.ok(/IA locale/.test(tp?.text || '') && /Gemini Nano/.test(tp?.desc || ''), `✨ : « ${tp?.text} » — ${tp?.desc}`);
  t.ok(await page.evaluate(() => !!document.querySelector('#aiBtn').getAttribute('aria-label')), '✨ : nom accessible ajouté');
  await page.mouse.down();
  await page.mouse.up();
  await t.wait(80);
  t.ok(!(await tip()), 'clic : infobulle cachée');
  await page.keyboard.press('Escape');
  await t.wait(150);

  /* bord droit de la fenêtre : jamais dehors */
  const pb = await box('#publishBtn');
  await page.mouse.move(5, 500);
  await t.wait(150);
  await page.mouse.move(pb.x + pb.width - 3, pb.y + pb.height / 2);
  await t.wait(500);
  tp = await tip();
  t.ok(tp && tp.x + tp.w <= 1440 - 4 && tp.x >= 4, `bord de la fenêtre : infobulle dedans (${Math.round(tp?.x)}…${Math.round((tp?.x || 0) + (tp?.w || 0))})`);

  /* ===== 3. Clavier : Tab sur un bouton ===== */
  await page.mouse.move(5, 500);
  await t.wait(150);
  await page.focus('#siteName');
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.matches('[data-device], #aiBtn, #collabBtn, #commentsBtn, #logBtn'))) break;
  }
  await t.wait(500);
  const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  tp = await tip();
  t.ok(!!tp?.text, `clavier : infobulle au focus (${focused} → « ${tp?.text} »)`);
  await page.keyboard.press('Escape');

  /* ===== 4. Canevas : barre de l'élément sélectionné ===== */
  await t.canvas().locator('[data-type="text"]').first().click();
  await t.wait(200);
  const frame = await box('#canvas');
  const scale = await page.evaluate(() => { const f = document.querySelector('#canvas'); return f.getBoundingClientRect().width / f.offsetWidth; });
  const db = await t.canvas().locator('#selToolbar [data-act="duplicate"]').evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const dx = frame.x + (db.x + db.w / 2) * scale;
  const dy = frame.y + (db.y + db.h / 2) * scale;
  await page.mouse.move(dx, dy);
  await t.wait(500);
  tp = await tip();
  t.ok(tp?.text === 'Dupliquer' && tp.keys.join('+') === 'Ctrl+D', `canevas ⧉ : « ${tp?.text} » ${tp?.keys?.join(' ')}`);
  t.ok(tp && Math.abs(tp.x + tp.w / 2 - dx) < 40 && tp.y > dy - 60 && tp.y < dy + 60, 'canevas : infobulle à côté du bouton, malgré la réduction');
  await page.screenshot({ path: `${t.shots}/c21-canevas.png` });
  const siteTitle = await t.canvas().locator('main [title]').count();
  if (siteTitle) {
    const st = await t.canvas().locator('main [title]').first().boundingBox();
    await page.mouse.move(st.x + 2, st.y + 2);
    await t.wait(500);
    t.ok(!(await tip()), 'canevas : les title du contenu du site ne sont pas repris');
  }
  await page.mouse.move(5, 500);

  /* ===== 5. ✨ IA locale : téléchargement lancé par Chrome (« … téléchargement ») — vu chez Kudoro : pas de % ===== */
  await page.evaluate(() => {
    window.__atelierAI = {
      status: { prompt: 'downloading', multimodal: 'downloading', summarizer: 'downloading', rewriter: 'unavailable', writer: 'unavailable', proofreader: 'unavailable', translator: 'available', detector: 'available' },
      has: { prompt: true, summarizer: true, translator: true },
      async download(kind, progress) { for (const p of [0.25, 0.5, 0.75]) { progress(p); await new Promise(r => setTimeout(r, 400)); } progress(1); this.status[kind] = 'available'; },
      async prompt() { return '{}'; }
    };
  });
  await page.click('#aiBtn');
  await page.waitForSelector('#aiDialog [data-ai-download="prompt"]');
  t.ok(/Voir la progression/.test(await page.textContent('#aiDialog [data-ai-download="prompt"]')), 'téléchargement en cours : bouton « Voir la progression »');
  await page.click('#aiDialog [data-ai-download="prompt"]');
  await page.waitForFunction(() => /\d+ %/.test(document.querySelector('#aiDialog [data-ai-state="prompt"]')?.textContent || ''), null, { timeout: 3000 });
  t.ok(true, `progression dans la ligne : ${await page.textContent('#aiDialog [data-ai-state="prompt"]')}`);
  await page.waitForFunction(() => /prêt/.test(document.querySelector('#aiDialog [data-ai-state="prompt"]')?.textContent || ''), null, { timeout: 5000 });
  t.ok(true, 'puis « prêt »');
  /* mise à jour automatique : Chrome finit le Summarizer tout seul */
  await page.evaluate(() => { window.__atelierAI.status.summarizer = 'available'; });
  await page.waitForFunction(() => /prêt/.test(document.querySelector('#aiDialog [data-ai-state="summarizer"]')?.textContent || ''), null, { timeout: 9000 }).then(() => t.ok(true, 'fenêtre mise à jour toute seule (Summarizer prêt sans clic)'), () => t.ok(false, 'fenêtre mise à jour toute seule (Summarizer prêt sans clic)'));
  await page.keyboard.press('Escape');
  await page.evaluate(() => { delete window.__atelierAI; });

  /* ===== 6. Téléchargement de Chrome bloqué à 0 % (vu chez Kudoro : gemma4_component « Foreground Installing » 0 %) ===== */
  await page.evaluate(() => {
    window.__atelierStallMs = 1500;
    window.__atelierAI = {
      status: { prompt: 'downloading', multimodal: 'unavailable', summarizer: 'unavailable', rewriter: 'unavailable', writer: 'unavailable', proofreader: 'unavailable', translator: 'available', detector: 'available' },
      has: { prompt: true },
      download(kind, progress) { progress(0); const t = setInterval(() => progress(0), 300); window.__stopZero = () => clearInterval(t); return new Promise(() => {}); },
      async prompt() { return '{}'; }
    };
  });
  let s6 = await page.evaluate(() => window.atelierDebug.log.stats().seq);
  await page.click('#aiBtn');
  await page.waitForSelector('#aiDialog [data-ai-download="prompt"]');
  await page.click('#aiDialog [data-ai-download="prompt"]');
  await page.waitForFunction(() => /n’avance pas/.test(document.querySelector('#aiDialog [data-ai-state="prompt"]')?.textContent || ''), null, { timeout: 5000 }).then(() => t.ok(true, 'bloqué : la ligne dit que Chrome n’avance pas'), () => t.ok(false, 'bloqué : la ligne dit que Chrome n’avance pas'));
  t.ok(/on-device-internals/.test(await page.textContent('#aiDialog [data-ai-status]')), 'bloqué : conseil affiché (chrome://on-device-internals)');
  const es6 = await page.evaluate(s0 => window.atelierDebug.entries({ since: s0 }), s6);
  t.ok(es6.some(e => e.code === 'ai.download-stalled' && e.level === 'warn'), 'journal : ai.download-stalled (WARN)');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.__stopZero?.(); delete window.__atelierAI; delete window.__atelierStallMs; });
}
