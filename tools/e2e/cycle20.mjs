/* Cycle 20 : auto-test en console (atelierDebug.selftest) et retour arrière — projet de la personne remis à l'identique. */
import { writeFileSync } from 'node:fs';
import { mark, since, waitCode, expectCodes, capture } from './logs.mjs';

export default async function (t) {
  const { page } = t;
  page.setDefaultTimeout(10000);

  /* Faux publish.php (lecture seule : le test de connexion ne fait qu'un GET) */
  await page.route(/faux-ovh\/publish\.php/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ atelier: true, version: '4', php: '8.2.0', zip: true, req: 'r-test' }) }));

  /* Photographie du projet de la personne : site, historique, vue, versions, images, réglages */
  const photo = () => page.evaluate(async () => {
    const { stableJson } = await import('/core/selftest.js');
    const { listVersions, listAssetIds, loadProject } = await import('/editor/storage.js');
    const s = window.__atelier;
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('atelier')) ls[k] = localStorage.getItem(k); }
    const stored = await loadProject();
    return {
      site: stableJson(s.site), past: s.past.length, future: s.future.length, pageId: s.pageId, lang: s.lang, device: s.device,
      versions: (await listVersions()).map(v => v.id).sort().join(','), assets: (await listAssetIds()).sort().join(','),
      ls: stableJson(ls), stored: stored ? stableJson({ ...stored, assets: Object.keys(stored.assets || {}) }) : null,
      backup: !!(await loadProject('selftest-backup')), name: s.site.name, pages: s.site.pages.length
    };
  });
  const same = (a, b, label) => {
    for (const k of ['site', 'past', 'future', 'pageId', 'lang', 'device', 'versions', 'assets', 'ls']) t.ok(a[k] === b[k], `${label} : ${k} identique${a[k] === b[k] ? '' : ` (avant ${String(a[k]).slice(0, 80)} / après ${String(b[k]).slice(0, 80)})`}`);
  };

  /* ===== 0. La personne travaille : une page, un logo, une adresse de publication, une modification à annuler ===== */
  await page.click('[data-left="pages"]');
  await page.fill('#newPageTitle', 'Page de Laurent');
  await page.click('#addPageBtn');
  await t.wait(300);
  await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 120;
    const g = cv.getContext('2d'); g.fillStyle = '#226633'; g.fillRect(0, 0, 300, 120);
    const f = new File([await new Promise(r => cv.toBlob(r, 'image/png'))], 'logo-laurent.png', { type: 'image/png' });
    document.querySelector('[data-left="site"]').click();
    await new Promise(r => setTimeout(r, 200));
    const input = document.querySelector('#leftBody [data-field="logo"]');
    const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await waitCode(page, 'settings.logo', 0, 15000);
  await page.click('#publishBtn');
  await page.click('#publishDialog [data-pub-tab="php"]');
  await page.fill('#publishDialog [data-pub="url"]', `${t.base}faux-ovh/publish.php`);
  await page.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
  await page.keyboard.press('Escape');
  await page.click('[data-device="tablet"]');
  await page.click('#undoBtn');
  await t.wait(900);
  const before = await photo();
  t.ok(before.future === 1 && before.past >= 2 && before.stored, `projet de départ : ${before.pages} pages, historique ${before.past}/${before.future}, enregistré`);

  /* ===== 1. Auto-test complet avec le faux modèle ===== */
  let s = await mark(page);
  const report = await page.evaluate(() => window.atelierDebug.selftest({ download: false }));
  writeFileSync(new URL('../../docs/guide/journaux/autotest-rapport.md', import.meta.url), report);
  const res = report.match(/\*\*Résultat : (\d+) \/ (\d+) réussis\*\* · (\d+) échoué\(s\) · (\d+) erreur\(s\) · (\d+) ignoré\(s\) — Note : (\d+) \/ 100/);
  t.ok(!!res, 'rapport : ligne de résultat');
  t.ok(res && res[1] === res[2] && res[6] === '100', `auto-test : ${res?.[0]}`);
  if (res && res[1] !== res[2]) console.log(report.split('## Détail des problèmes')[1]?.slice(0, 6000));
  t.ok(/ignoré — demande deux appareils/.test(report), 'collaboration ignorée avec la raison');
  t.ok(/\| Tester la connexion à publish\.php \(sans publier\) \| 8 \| ✓ réussi/.test(report), 'publication : connexion testée sur l’adresse du projet');
  t.ok(/Retour arrière : ✓ ton projet est revenu exactement comme avant \(« [^»]+ », \d+ pages\)/.test(report), 'rapport : retour arrière réussi');
  t.ok(/## Environnement/.test(report) && /navigateur : /.test(report), 'rapport : environnement');
  t.ok(!/[0-9a-f]{64}/.test(report), 'rapport : aucun jeton en clair');
  const realAi = await page.evaluate(async () => { const m = await import('/editor/ai.js'); const st = await m.aiStatus('fr', { quiet: true }); return Object.entries(st).map(([k, v]) => `${k}=${v}`).join(' '); });
  const aiLine = report.split('\n').find(l => l.startsWith('- ia : ')) || '';
  t.ok(aiLine.includes(realAi) && !aiLine.includes('test (window.__atelierAI)'), `rapport : état réel de l’IA du navigateur, pas celui du faux modèle (${realAi})`);
  let after = await photo();
  same(before, after, 'après l’auto-test');
  t.ok(after.stored === before.stored && !after.backup, 'copie enregistrée identique ; copie de secours effacée');
  t.ok(await page.evaluate(() => localStorage.getItem('atelier-selftest')) === null, 'repère d’auto-test retiré');
  t.ok(await page.evaluate(() => !('__atelierAI' in window)), 'faux modèle retiré');
  t.ok(await page.evaluate(() => window.confirm.toString().includes('native code') && HTMLAnchorElement.prototype.click.toString().includes('native code')), 'confirmations et téléchargements rétablis');
  t.ok(await page.locator('dialog[open]').count() === 0, 'aucune fenêtre laissée ouverte');
  t.ok(await page.evaluate(() => window.__atelier.site.pages.some(p => p.title?.fr === 'Page de Laurent')), 'la page de Laurent est toujours là');
  let es = await since(page, s);
  expectCodes(t, es, ['selftest.run.start', 'selftest.backup.start', 'selftest.backup.ok', 'selftest.case', 'store.restore', 'selftest.rollback.start', 'selftest.rollback.ok', 'selftest.run.ok', 'storage.version-delete'], 'auto-test');
  capture('autotest-lancement', es.filter(e => /^(selftest|store\.restore|storage\.(version-delete|asset-delete|project-delete))/.test(e.code)));
  await page.screenshot({ path: `${t.shots}/c20-apres.png` });

  /* ===== 2. Relancé : sélection par chapitre et identifiant ===== */
  s = await mark(page);
  const r2 = await page.evaluate(() => window.atelierDebug.selftest({ only: [4, 'demander'], ai: 'fake' }));
  t.ok(/\*\*Résultat : 5 \/ 5 réussis/.test(r2), `relancé (chapitre 4 + demander) : ${r2.match(/\*\*Résultat[^\n]*/)?.[0]}`);
  t.ok(/Sélection : seulement 4, demander/.test(r2), 'rapport : sélection indiquée');
  after = await photo();
  same(before, after, 'après la relance');
  t.ok(await page.evaluate(() => window.atelierDebug.report()) === r2, 'atelierDebug.report() renvoie le dernier rapport');
  t.ok((await page.evaluate(() => window.atelierDebug.cases())).includes('demander (chapitre 13)'), 'atelierDebug.cases() liste les cas');

  /* ===== 3. Sans IA, puis refus ===== */
  const r3 = await page.evaluate(() => window.atelierDebug.selftest({ only: ['demander', 'pages'], ai: false }));
  t.ok(/ignoré — IA désactivée/.test(r3) && /\*\*Résultat : 1 \/ 1 réussis/.test(r3), 'ai: false : cas d’IA ignorés');
  const r4 = await page.evaluate(() => window.atelierDebug.selftest({ only: ['annuler', 'texte'] }));
  t.ok(/\*\*Résultat : 2 \/ 2 réussis/.test(r4), 'un cas seul fonctionne sans les précédents (annuler, texte)');
  t.ok((await photo()).past === before.past, 'historique de la personne intact (l’exemple démarre sans historique)');
  s = await mark(page);
  const refused = await page.evaluate(async () => { window.__atelier.readOnly = true; const r = await window.atelierDebug.selftest(); window.__atelier.readOnly = false; return r; });
  t.ok(/refusé en mode relecture/.test(refused), 'refus en mode relecture');
  t.ok(/Aucun cas ne correspond/.test(await page.evaluate(() => window.atelierDebug.selftest({ only: ['inconnu'] }))), 'sélection vide : liste des identifiants');
  es = await since(page, s);
  expectCodes(t, es, ['selftest.refused'], 'refus');
  capture('autotest-refus', es.filter(e => /^selftest/.test(e.code)));
  t.ok(/Rien à restaurer/.test(await page.evaluate(() => window.atelierDebug.rollback())), 'rollback() sans test : rien à restaurer');

  /* ===== 4. Rechargement en plein test : restauration au démarrage ===== */
  const ref = await photo();
  s = await mark(page);
  await page.evaluate(() => { window.atelierDebug.selftest({ ai: 'fake' }); });
  await page.waitForFunction(s0 => window.atelierDebug.entries({ since: s0 }).filter(e => e.code === 'selftest.case').length >= 6, s, { timeout: 30000 });
  t.ok(await page.evaluate(() => !window.__atelier.site.pages.some(p => p.title?.fr === 'Page de Laurent')), 'pendant le test : l’exemple remplace le projet');
  await page.goto(t.base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
  await waitCode(page, 'selftest.rollback.ok', 0, 10000);
  const back = await photo();
  t.ok(back.site === ref.site, 'rechargé : projet d’avant le test repris');
  t.ok(back.versions === ref.versions && back.assets === ref.assets && !back.backup, 'rechargé : versions et images temporaires supprimées, copie de secours effacée');
  t.ok(await page.evaluate(() => localStorage.getItem('atelier-selftest')) === null, 'rechargé : repère retiré');
  es = await since(page, 0);
  expectCodes(t, es, ['selftest.recovered', 'selftest.rollback.ok', 'ui.toast'], 'restauration au démarrage');
  capture('autotest-interrompu', es.filter(e => /^(selftest|storage\.(load|version-delete|asset-delete|project-delete))/.test(e.code)));

  /* ===== 5. Retour arrière manuel pendant un test ===== */
  s = await mark(page);
  await page.evaluate(() => { window.__run = window.atelierDebug.selftest({ only: [2, 3, 4] }); });
  await page.waitForFunction(s0 => window.atelierDebug.entries({ since: s0 }).some(e => e.code === 'selftest.case'), s, { timeout: 20000 });
  const rb = await page.evaluate(() => window.atelierDebug.rollback());
  t.ok(/Retour arrière : ✓/.test(rb), `rollback() pendant le test : ${rb.slice(0, 90)}`);
  const r5 = await page.evaluate(() => window.__run);
  t.ok(/arrêté : retour arrière demandé/.test(r5), 'le test s’arrête après le cas en cours (cas suivants : arrêtés)');
  es = await since(page, s);
  expectCodes(t, es, ['selftest.stop', 'selftest.rollback.ok'], 'arrêt par rollback()');
  capture('autotest-rollback', es.filter(e => /^selftest/.test(e.code)));
  await t.wait(500);
  const end = await photo();
  t.ok(end.site === ref.site && end.versions === ref.versions && !end.backup, 'rollback() pendant le test : projet d’origine, rien ne traîne');

  /* ===== 6. Polices Google très lentes (vu chez Kudoro : canevas prêt en 19 s, boot.timeout) ===== */
  await page.route(/fonts\.(googleapis|gstatic)\.com/, async r => { await new Promise(x => setTimeout(x, 9000)); await r.fulfill({ status: 200, contentType: 'text/css', body: '' }).catch(() => {}); });
  const t0 = Date.now();
  await page.goto(`${t.base}?fresh=1`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 15000 });
  const readyMs = Date.now() - t0;
  t.ok(readyMs < 5000, `polices lentes : éditeur prêt en ${readyMs} ms (sans attendre les polices)`);
  t.ok(await page.evaluate(() => !!document.querySelector('#canvas').contentDocument.querySelector('[data-type="heading"]')), 'polices lentes : page affichée dans le canevas');
  await waitCode(page, 'canvas.resources-slow', 0, 15000);
  es = await since(page, 0);
  t.ok(!es.some(e => e.code === 'boot.timeout'), 'polices lentes : pas de boot.timeout');
  const slow = es.find(e => e.code === 'canvas.resources-slow');
  t.ok(/fonts\.googleapis\.com/.test(JSON.stringify(slow?.data || {})), `polices lentes : hôte lent nommé (${JSON.stringify(slow?.data)})`);
  expectCodes(t, es, ['canvas.load.start', 'canvas.load.ok', 'boot.ok', 'canvas.resources-slow'], 'polices lentes');
  capture('canevas-polices-lentes', es.filter(e => /^(boot\.(start|ok)|canvas\.(load|resources))/.test(e.code)));
  await page.unroute(/fonts\.(googleapis|gstatic)\.com/);

  /* ===== 7. Sans coller dans la console : autotest(), adresse ?autotest, fenêtre du rapport ===== */
  await page.goto(t.base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__atelier?.ready === true, null, { timeout: 10000 });
  s = await mark(page);
  const line = await page.evaluate(() => window.autotest({ only: ['pages', 'annuler'] }));
  t.ok(/^Auto-test : 2 \/ 2 réussis/.test(line), `autotest() renvoie une ligne courte : ${line}`);
  await page.waitForSelector('#selftestDialog[open]');
  t.ok(/# Auto-test d’Atelier/.test(await page.inputValue('#selftestDialog [data-selftest-report]')), 'fenêtre : rapport complet affiché');
  t.ok(/2 \/ 2 réussis/.test(await page.textContent('#selftestDialog [data-selftest-summary]')) && /Retour arrière : ✓/.test(await page.textContent('#selftestDialog [data-selftest-summary]')), 'fenêtre : résultat et retour arrière en tête');
  await page.click('#selftestDialog [data-selftest-copy]');
  await t.wait(300);
  t.ok(/copié/i.test(await page.textContent('#selftestDialog [data-selftest-status]')), 'fenêtre : 📋 Copier (clic dans la page : le navigateur autorise)');
  const clip2 = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  t.ok(!clip2 || /^# Auto-test d’Atelier/.test(clip2), 'presse-papiers : le rapport');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#selftestDialog [data-selftest-download]')]);
  t.ok(/^atelier-auto-test-.*\.md$/.test(dl2.suggestedFilename()), `fenêtre : ⇩ .md (${dl2.suggestedFilename()})`);
  await page.screenshot({ path: `${t.shots}/c20-rapport.png` });
  await page.click('#selftestDialog [data-selftest-close]');
  es = await since(page, s);
  expectCodes(t, es, ['selftest.dialog', 'selftest.report-download'], 'fenêtre du rapport');
  t.ok(es.some(e => e.code === 'selftest.copy' || e.code === 'selftest.copy-fail'), 'journal (fenêtre du rapport) : copie notée');
  capture('autotest-fenetre', es.filter(e => /^selftest\.(run\.(start|ok)|dialog|copy|copy-fail|report-download)$/.test(e.code)));

  /* adresse ?autotest : lancé tout seul au démarrage, l'adresse est nettoyée (pas de relance au rechargement) */
  const ref2 = await photo();
  await page.goto(`${t.base}?autotest`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#selftestDialog[open]', { timeout: 120000 });
  t.ok(!/autotest/.test(page.url()), `adresse nettoyée : ${page.url()}`);
  t.ok(/25 \/ 25 réussis|24 \/ 24 réussis/.test(await page.textContent('#selftestDialog [data-selftest-summary]')), `?autotest : ${(await page.textContent('#selftestDialog [data-selftest-summary]')).slice(0, 80)}`);
  t.ok((await photo()).site === ref2.site, '?autotest : projet remis comme avant');
  es = await since(page, 0);
  expectCodes(t, es, ['selftest.auto', 'selftest.run.ok', 'selftest.dialog'], 'adresse ?autotest');
  capture('autotest-adresse', es.filter(e => /^selftest\.(auto|run\.(start|ok)|dialog)$/.test(e.code)));

  /* Ctrl+K « Auto-test » : même fenêtre */
  await page.click('#selftestDialog [data-selftest-close]');
  await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', 'auto-test');
  await t.wait(150);
  await page.keyboard.press('Enter');
  await page.waitForSelector('#selftestDialog[open]', { timeout: 120000 });
  t.ok(true, 'Ctrl+K « Auto-test » : fenêtre du rapport');
  await page.click('#selftestDialog [data-selftest-close]');

  /* ===== 8. Fenêtre sans le focus (vu chez Kudoro, Chrome 156 sur Mac : l'éditeur lancé depuis le Terminal) =====
     Sans le focus, blur() ne déclenche pas l'événement « blur » : le texte en place ne se termine pas tout seul. */
  await page.addInitScript(() => { try { if (window.top.__noFocus) HTMLElement.prototype.blur = function () {}; } catch { /* autre origine */ } });
  await page.evaluate(() => { window.__noFocus = true; });
  s = await mark(page);
  const r8 = await page.evaluate(() => window.atelierDebug.selftest({ only: ['texte'] }));
  t.ok(/\*\*Résultat : 1 \/ 1 réussis/.test(r8), `sans focus : modifier un titre réussit (${r8.match(/\*\*Résultat[^\n]*/)?.[0]})`);
  es = await since(page, s);
  expectCodes(t, es, ['selftest.focus-fallback', 'edit.ok'], 'sans focus');
  await page.evaluate(() => { window.__noFocus = false; });
}
