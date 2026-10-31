/* Cycle 12 : versions, publication réelle vers publish.php (php -S), formulaire relayé par e-mail, GitHub (API simulée). */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export default async function (t) {
  const { page } = t;
  const c = t.canvas();
  const site = () => page.evaluate(() => window.__atelier.site);
  const sectionCount = () => page.evaluate(() => window.__atelier.site.pages[0].root.children.length);

  /* --- 1. versions --- */
  await page.click('#fileMenu summary');
  await page.click('#versionsBtn');
  await t.wait(300);
  await page.fill('#versionsDialog [data-version-name]', 'Avant les essais');
  await page.click('#versionSave');
  await t.wait(400);
  t.ok(await page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' }).count() === 1, 'version nommée enregistrée');
  await page.keyboard.press('Escape');
  const before = await sectionCount();
  await page.click('[data-left="navigator"]');
  await page.click('#navTree [data-type="section"] >> nth=0');
  await page.keyboard.press('Delete');
  await t.wait(300);
  t.ok(await sectionCount() === before - 1, 'une section supprimée');
  await page.click('#fileMenu summary');
  await page.click('#versionsBtn');
  await t.wait(800);
  const row = page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' });
  t.ok((await row.locator('.version__diff').textContent()).includes('Accueil'), `comparaison : « ${(await row.locator('.version__diff').textContent()).trim()} »`);
  await row.locator('[data-version-restore]').click();
  await t.wait(800);
  t.ok(await sectionCount() === before, 'restaurer : la section est revenue');
  await page.click('#fileMenu summary');
  await page.click('#versionsBtn');
  await t.wait(500);
  t.ok(await page.locator('#versionsDialog .version--safety').count() >= 1, 'une version de sécurité a été enregistrée avant la restauration');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(() => window.__atelier?.ready === true);
  await page.click('#fileMenu summary');
  await page.click('#versionsBtn');
  await t.wait(500);
  t.ok(await page.locator('#versionsDialog [data-version]', { hasText: 'Avant les essais' }).count() === 1, 'les versions survivent au rechargement');
  await page.keyboard.press('Escape');

  /* --- 2. formulaire de contact sur la page Contact --- */
  let s = await site();
  const contact = s.pages.find(p => p.slug === 'contact');
  await page.selectOption('#pageSelect', contact.id);
  await t.wait(400);
  await page.click('[data-left="widgets"]');
  await page.click('.lib-item[data-type="form"]');
  await t.wait(300);
  await page.click('[data-insp="content"]');
  await page.fill('#inspector [data-field="email"]', 'redaction@media-alternatif.be');
  await t.wait(300);

  /* --- 3. publication vers un vrai publish.php (php -S) --- */
  const port = 8900 + Math.floor(Math.random() * 90);
  const www = join(t.shots, 'www12');
  const mailLog = join(t.shots, 'mail12.log');
  rmSync(www, { recursive: true, force: true });
  rmSync(mailLog, { force: true });
  mkdirSync(www, { recursive: true });
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', www], { env: { ...process.env, ATELIER_MAIL_LOG: mailLog }, stdio: 'ignore' });
  try {
    await page.click('#publishBtn');
    await t.wait(300);
    t.ok(await page.locator('#publishDialog[open]').count() === 1, 'fenêtre « Publier »');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#publishDialog [data-pub-generate]')]);
    await dl.saveAs(join(www, 'publish.php'));
    const phpSrc = readFileSync(join(www, 'publish.php'), 'utf8');
    const token = await page.locator('#publishDialog [data-pub="token"]').inputValue();
    t.ok(/^[0-9a-f]{64}$/.test(token) && !phpSrc.includes(token) && phpSrc.includes('hash_equals'), 'publish.php téléchargé : il contient l’empreinte du jeton, pas le jeton');
    await page.fill('#publishDialog [data-pub="url"]', `http://127.0.0.1:${port}/publish.php`);
    await page.locator('#publishDialog [data-pub="url"]').dispatchEvent('change');
    await page.click('#publishDialog [data-pub-test]');
    await page.waitForSelector('#publishDialog [data-pub-status]:is(.is-ok, .is-error)');
    t.ok(await page.locator('#publishDialog [data-pub-status].is-ok').count() === 1, `test de connexion : ${(await page.locator('#publishDialog [data-pub-status]').textContent()).trim()}`);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishDialog [data-pub-status]:is(.is-ok, .is-error):not(:has-text("Test")):not(:has-text("Connexion"))', { timeout: 15000 });
    const pubText = (await page.locator('#publishDialog [data-pub-status]').textContent()).trim();
    t.ok(await page.locator('#publishDialog [data-pub-status][data-pub-ok]').count() === 1 && /Site publié/.test(pubText), `publication : ${pubText}`);
    const files = readdirSync(www, { recursive: true }).map(String);
    t.ok(files.includes('index.html') && files.includes('nl/index.html') && files.includes('contact/index.html') && files.includes('styles.css') && files.includes('site.js'), `fichiers en ligne (${files.length})`);
    t.ok(!JSON.stringify(await site()).includes(token), 'le jeton n’est pas dans le projet');

    /* --- 4. le formulaire du site publié envoie un e-mail --- */
    const ctx = await t.browser.newContext({ locale: 'fr-FR' });
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/contact/`);
    const html = await p.content();
    t.ok(!html.includes('redaction@media-alternatif.be') && html.includes('data-endpoint'), 'page publiée : formulaire relié à publish.php, adresse absente');
    await p.fill('form[data-endpoint] input[type="text"]', 'Ana');
    await p.fill('form[data-endpoint] input[type="email"]', 'ana@exemple.org');
    await p.fill('form[data-endpoint] textarea', 'Notre radio associative voudrait rejoindre le MAB.');
    await p.check('form[data-endpoint] input[name="_consent"]');
    await p.click('form[data-endpoint] [type="submit"]');
    await p.waitForFunction(() => document.querySelector('.form__status')?.textContent.length > 0, null, { timeout: 8000 });
    t.ok((await p.locator('.form__status').textContent()).includes('Merci'), `visiteur : « ${(await p.locator('.form__status').textContent()).trim()} »`);
    const mail = existsSync(mailLog) ? JSON.parse(readFileSync(mailLog, 'utf8').trim().split('\n').at(-1)) : null;
    t.ok(mail && mail.to === 'redaction@media-alternatif.be' && /Reply-To: ana@exemple\.org/.test(mail.headers) && mail.body.includes('radio associative'), 'e-mail transmis à la rédaction, réponse possible au visiteur');
    await ctx.close();

    /* --- 5. republication : page supprimée retirée du serveur --- */
    await page.keyboard.press('Escape');
    await page.click('[data-left="pages"]');
    await page.fill('#newPageTitle', 'Temporaire');
    await page.click('#addPageBtn');
    await t.wait(300);
    await page.click('#publishBtn');
    await t.wait(200);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishDialog [data-pub-status][data-pub-ok]', { timeout: 15000 });
    t.ok(existsSync(join(www, 'temporaire', 'index.html')), 'nouvelle page publiée');
    await page.keyboard.press('Escape');
    s = await site();
    const tmp = s.pages.find(x => x.slug === 'temporaire');
    await page.locator(`[data-page-delete="${tmp.id}"]`).click();
    await t.wait(300);
    await page.click('#publishBtn');
    await t.wait(200);
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishDialog [data-pub-status][data-pub-ok]', { timeout: 15000 });
    t.ok(!existsSync(join(www, 'temporaire')) && (await page.locator('#publishDialog [data-pub-status]').textContent()).includes('retiré'), 'page supprimée : retirée du serveur à la publication suivante');

    /* --- 6. mauvais jeton --- */
    await page.fill('#publishDialog [data-pub="token"]', 'faux-jeton');
    await page.click('#publishDialog [data-pub-run]');
    await page.waitForSelector('#publishDialog [data-pub-status].is-error', { timeout: 15000 });
    t.ok((await page.locator('#publishDialog [data-pub-status]').textContent()).includes('Jeton'), 'mauvais jeton : refus clair');
  } finally {
    php.kill();
  }

  /* --- 7. GitHub (API simulée) --- */
  const gh = { calls: [], auth: new Set() };
  await page.route('https://api.github.com/**', async route => {
    const req = route.request();
    const u = new URL(req.url());
    gh.calls.push(`${req.method()} ${u.pathname}`);
    gh.auth.add(req.headers().authorization);
    const json = (b, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(b) });
    if (req.method() === 'OPTIONS') return json({});
    if (u.pathname.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'c0' } });
    if (u.pathname.endsWith('/git/commits/c0')) return json({ tree: { sha: 't0' } });
    if (u.pathname.includes('/git/trees/t0')) return json({ tree: [{ path: 'README.md', type: 'blob', mode: '100644', sha: 'r1' }], truncated: false });
    if (u.pathname.endsWith('/git/blobs')) return json({ sha: `b${gh.calls.length}` });
    if (u.pathname.endsWith('/git/trees')) return json({ sha: 't1' });
    if (u.pathname.endsWith('/git/commits')) return json({ sha: 'c1abcdef0' });
    if (u.pathname.endsWith('/git/refs/heads/main')) return json({ object: { sha: 'c1abcdef0' } });
    return json({ message: 'Not Found' }, 404);
  });
  await page.click('#publishDialog [data-pub-tab="github"]');
  await page.fill('#publishDialog [data-gh="owner"]', 'aktina');
  await page.fill('#publishDialog [data-gh="repo"]', 'site-mab');
  await page.fill('#publishDialog [data-gh="dir"]', 'www');
  await page.fill('#publishDialog [data-gh="token"]', 'github_pat_test');
  await page.click('#publishDialog [data-gh-run]');
  await page.waitForSelector('#publishDialog [data-gh-status]:is(.is-ok, .is-error)', { timeout: 15000 });
  const ghText = (await page.locator('#publishDialog [data-gh-status]').textContent()).trim();
  t.ok(/commit c1abcde/.test(ghText), `GitHub : ${ghText}`);
  t.ok(gh.calls.filter(x => x.endsWith('/git/commits') && x.startsWith('POST')).length === 1 && gh.calls.at(-1) === 'PATCH /repos/aktina/site-mab/git/refs/heads/main', 'GitHub : un seul commit, puis mise à jour de la branche');
  t.ok([...gh.auth].every(a => a === 'Bearer github_pat_test'), 'GitHub : jeton envoyé seulement en en-tête');
  s = await site();
  t.ok(s.publish.gh.repo === 'site-mab' && !JSON.stringify(s).includes('github_pat_test'), 'réglages GitHub enregistrés, jeton exclu du projet');
  await page.keyboard.press('Escape');

  await page.screenshot({ path: `${t.shots}/cycle12.png` });
}
