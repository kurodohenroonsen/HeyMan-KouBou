import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNode, insertNode, createSectionWithColumns, setProp } from '../core/tree.js';
import { createSite, updatePageRoot, addPage, normalizeSite } from '../core/site.js';
import { createComponent } from '../core/components.js';
import { makeVersion, diffSites, pruneVersions, isNewDay } from '../core/versions.js';
import { formsConfig, buildPublishPhp, sha256Hex, newToken, gitBlobSha, planGitTree, publishGitHub } from '../core/publish.js';
import { renderPage } from '../core/render.js';

function site1() {
  let s = normalizeSite(createSite({ languages: ['fr', 'nl'] }));
  s = addPage(s, { slug: 'contact', title: { fr: 'Contact' } });
  let root = s.pages[1].root;
  const sec = createSectionWithColumns(1);
  root = insertNode(root, root.id, sec);
  const form = createNode('form');
  form.props.email = 'redaction@media-alternatif.be';
  root = insertNode(root, sec.children[0].children[0].id, form);
  s = updatePageRoot(s, s.pages[1].id, root);
  return { site: s, form };
}

/* ---------- Versions ---------- */
test('makeVersion : résumé, identifiant, date', () => {
  const { site } = site1();
  const v = makeVersion(site, { name: 'Avant refonte', kind: 'manual', at: '2026-10-29T08:00:00.000Z' });
  assert.equal(v.name, 'Avant refonte');
  assert.equal(v.kind, 'manual');
  assert.equal(v.summary.pages, 2);
  assert.ok(/^v_/.test(v.id));
  assert.notEqual(v.site, site);
});

test('diffSites : pages ajoutées, supprimées, modifiées ; composants ; thème ; identique', () => {
  const { site } = site1();
  assert.equal(diffSites(site, site).identical, true);
  let b = addPage(site, { slug: 'equipe', title: { fr: 'Équipe' } });
  const h = createNode('heading');
  b = updatePageRoot(b, b.pages[0].id, insertNode(b.pages[0].root, b.pages[0].root.id, (() => { const s = createSectionWithColumns(1); s.children[0].children[0].children.push(h); return s; })()));
  b = { ...b, theme: { ...b.theme, palette: { ...b.theme.palette, c1: '#123456' } } };
  b = createComponent(b, b.pages[0].id, b.pages[0].root.children[0].id, 'Bloc').site;
  const d = diffSites(site, b);
  assert.deepEqual(d.pagesAdded, ['Équipe']);
  assert.deepEqual(d.pagesChanged, ['Accueil']);
  assert.equal(d.componentsAdded, 1);
  assert.equal(d.themeChanged, true);
  assert.equal(d.identical, false);
  const back = diffSites(b, site);
  assert.deepEqual(back.pagesRemoved, ['Équipe']);
});

test('pruneVersions : versions nommées gardées, automatiques limitées aux plus récentes', () => {
  const list = [];
  for (let i = 0; i < 40; i++) list.push({ id: `a${i}`, kind: i % 10 === 0 ? 'manual' : 'auto', at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() });
  const kept = pruneVersions(list, { maxAuto: 30 });
  assert.equal(kept.filter(v => v.kind === 'manual').length, 4);
  assert.equal(kept.filter(v => v.kind !== 'manual').length, 30);
  assert.ok(kept.some(v => v.id === 'a39') && !kept.some(v => v.id === 'a1'));
});

test('isNewDay : nouvelle version automatique une fois par jour (heure locale)', () => {
  assert.equal(isNewDay(null, new Date('2026-10-29T10:00:00')), true);
  assert.equal(isNewDay('2026-10-29T08:00:00', new Date('2026-10-29T23:00:00')), false);
  assert.equal(isNewDay('2026-10-28T23:59:00', new Date('2026-10-29T00:01:00')), true);
});

/* ---------- publish.php ---------- */
test('sha256Hex et newToken', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const t = newToken();
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.notEqual(t, newToken());
});

test('buildPublishPhp : empreinte du jeton seulement, version, aucune adresse e-mail', async () => {
  const token = 'jeton-secret-de-test';
  const php = buildPublishPhp({ tokenHash: await sha256Hex(token) });
  assert.ok(php.startsWith('<?php'));
  assert.ok(php.includes(await sha256Hex(token)));
  assert.ok(!php.includes(token));
  assert.ok(!php.includes('@media-alternatif.be'));
  assert.ok(php.includes('hash_equals'));
  assert.throws(() => buildPublishPhp({ tokenHash: "x'; system('id'); //" }), /empreinte/i);
});

test('formsConfig : formulaires de toutes les pages et composants, adresses valides seulement', () => {
  let { site, form } = site1();
  const f2 = createNode('form');
  f2.props.email = 'pas-une-adresse';
  const f3 = createNode('form');
  f3.props.email = 'x@y.be';
  f3.props.action = 'https://formspree.io/f/abc';
  let root = insertNode(site.pages[1].root, site.pages[1].root.children[0].children[0].children[0].id, f2);
  root = insertNode(root, root.children[0].children[0].children[0].id, f3);
  site = updatePageRoot(site, site.pages[1].id, root);
  assert.deepEqual(formsConfig(site), { [form.id]: 'redaction@media-alternatif.be' });
});

test('formulaire en mode publish.php : envoi au serveur, adresse absente de la page', () => {
  const { site, form } = site1();
  const s = { ...site, publish: { mode: 'php' } };
  const html = renderPage(s, s.pages[1], 'fr');
  assert.match(html, /<form class="form" action="\.\.\/publish\.php" method="post" data-endpoint/);
  assert.ok(html.includes(`name="_form" value="${form.id}"`));
  assert.ok(html.includes('name="_back" value="contact/"'));
  assert.ok(!html.includes('redaction@') && !html.includes('data-to='));
  const nl = renderPage(s, s.pages[1], 'nl');
  assert.ok(nl.includes('name="_back" value="nl/contact/"'));
});

/* ---------- GitHub ---------- */
test('gitBlobSha : identique à git hash-object', async () => {
  assert.equal(await gitBlobSha(new TextEncoder().encode('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

test('planGitTree : reste du dépôt conservé, fichiers supprimés retirés, envois limités aux nouveautés', () => {
  const existing = [
    { path: 'README.md', type: 'blob', mode: '100644', sha: 'r1' },
    { path: 'www', type: 'tree', mode: '040000', sha: 't1' },
    { path: 'www/index.html', type: 'blob', mode: '100644', sha: 'same' },
    { path: 'www/ancienne/index.html', type: 'blob', mode: '100644', sha: 'old' }
  ];
  const files = new Map([['www/index.html', 'same'], ['www/styles.css', 'new1']]);
  const p = planGitTree(existing, files, 'www');
  assert.deepEqual(p.tree.map(e => e.path).sort(), ['README.md', 'www/index.html', 'www/styles.css']);
  assert.deepEqual(p.upload, ['www/styles.css']);
  assert.deepEqual(p.removed, ['www/ancienne/index.html']);
  assert.equal(p.unchanged, 1);
});

test('publishGitHub : séquence d’appels API, jeton en en-tête, un seul commit', async () => {
  const calls = [];
  const fakeFetch = async (url, opts = {}) => {
    const u = new URL(url);
    calls.push(`${opts.method || 'GET'} ${u.pathname}`);
    assert.equal(opts.headers.Authorization, 'Bearer ghp_test');
    const json = body => ({ ok: true, status: 200, json: async () => body });
    if (u.pathname.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'c0' } });
    if (u.pathname.endsWith('/git/commits/c0')) return json({ tree: { sha: 't0' } });
    if (u.pathname.includes('/git/trees/t0')) return json({ tree: [{ path: 'README.md', type: 'blob', mode: '100644', sha: 'r1' }], truncated: false });
    if (u.pathname.endsWith('/git/blobs')) return json({ sha: 'b' + calls.length });
    if (u.pathname.endsWith('/git/trees')) { const b = JSON.parse(opts.body); assert.ok(b.tree.some(e => e.path === 'README.md')); return json({ sha: 't1' }); }
    if (u.pathname.endsWith('/git/commits')) { const b = JSON.parse(opts.body); assert.deepEqual(b.parents, ['c0']); assert.equal(b.tree, 't1'); return json({ sha: 'c1' }); }
    if (u.pathname.endsWith('/git/refs/heads/main')) { assert.equal(opts.method, 'PATCH'); return json({ object: { sha: 'c1' } }); }
    return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) };
  };
  const files = new Map([['index.html', '<!DOCTYPE html>'], ['assets/a.webp', new Uint8Array([1, 2, 3])]]);
  const r = await publishGitHub({ token: 'ghp_test', owner: 'kudoro', repo: 'mab-site', branch: 'main', dir: 'www', files, message: 'Publication Atelier', fetch: fakeFetch });
  assert.equal(r.commit, 'c1');
  assert.equal(r.uploaded, 2);
  assert.equal(calls.filter(c => c === 'POST /repos/kudoro/mab-site/git/commits').length, 1);
  assert.equal(calls.at(-1), 'PATCH /repos/kudoro/mab-site/git/refs/heads/main');
});

test('publishGitHub : erreurs explicites (jeton refusé, dépôt vide, champ manquant)', async () => {
  const deny = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Bad credentials' }) });
  await assert.rejects(publishGitHub({ token: 'x', owner: 'a', repo: 'b', branch: 'main', files: new Map(), fetch: deny }), /jeton/i);
  const empty = async () => ({ ok: false, status: 409, json: async () => ({ message: 'Git Repository is empty.' }) });
  await assert.rejects(publishGitHub({ token: 'x', owner: 'a', repo: 'b', branch: 'main', files: new Map(), fetch: empty }), /vide/i);
  await assert.rejects(publishGitHub({ token: '', owner: 'a', repo: 'b', branch: 'main', files: new Map(), fetch: deny }), /jeton/i);
  await assert.rejects(publishGitHub({ token: 'x', owner: 'a/../b', repo: 'b', branch: 'main', files: new Map(), fetch: deny }), /dépôt/i);
});

test('setPublishSettings : adresse publish.php en https (ou locale), mode, GitHub', async () => {
  const { setPublishSettings } = await import('../core/site.js');
  let s = site1().site;
  s = setPublishSettings(s, { mode: 'php', url: 'https://www.media-alternatif.be/publish.php' });
  assert.equal(s.publish.mode, 'php');
  assert.throws(() => setPublishSettings(s, { url: 'http://www.media-alternatif.be/publish.php' }), /https/);
  assert.throws(() => setPublishSettings(s, { url: 'https://www.media-alternatif.be/' }), /publish\.php/);
  assert.equal(setPublishSettings(s, { url: 'http://127.0.0.1:8792/publish.php' }).publish.url, 'http://127.0.0.1:8792/publish.php');
  s = setPublishSettings(s, { gh: { owner: 'kudoro', repo: 'mab' } });
  assert.deepEqual(s.publish.gh, { owner: 'kudoro', repo: 'mab', branch: 'main', dir: '' });
  assert.ok(!JSON.stringify(s.publish).includes('token'));
});
