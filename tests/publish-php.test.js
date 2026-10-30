/* Intégration : le vrai publish.php généré, servi par PHP (php -S), interrogé en HTTP. Ignoré si PHP est absent. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPublishPhp, sha256Hex } from '../core/publish.js';
import { createZip } from '../core/zip.js';

let php = true;
try { execFileSync('php', ['-m'], { stdio: 'pipe' }); } catch { php = false; }

const TOKEN = 'jeton-de-test-0123456789abcdef';
const PORT = 8800 + Math.floor(Math.random() * 150);
const URL_ = `http://127.0.0.1:${PORT}/publish.php`;
let dir, mailLog, server;

const zip = files => new Blob([createZip(Object.entries(files).map(([name, data]) => ({ name, data })))], { type: 'application/zip' });
async function publish(files, { token = TOKEN, forms } = {}) {
  const fd = new FormData();
  fd.append('site', zip(files), 'site.zip');
  if (forms) fd.append('forms', JSON.stringify(forms));
  const r = await fetch(URL_, { method: 'POST', body: fd, headers: token ? { 'X-Atelier-Token': token } : {} });
  return { status: r.status, body: await r.json() };
}
async function contact(fields, headers = { Accept: 'application/json' }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const r = await fetch(URL_, { method: 'POST', body: fd, headers, redirect: 'manual' });
  return { status: r.status, location: r.headers.get('location'), body: r.headers.get('content-type')?.includes('json') ? await r.json() : null };
}

before(async () => {
  if (!php) return;
  dir = mkdtempSync(join(tmpdir(), 'atelier-php-'));
  mailLog = join(dir, '..', `mail-${PORT}.log`);
  writeFileSync(join(dir, 'publish.php'), buildPublishPhp({ tokenHash: await sha256Hex(TOKEN) }));
  writeFileSync(join(dir, 'google1234.html'), 'google-site-verification');
  server = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', dir], { env: { ...process.env, ATELIER_MAIL_LOG: mailLog, ATELIER_TEST_FAULT: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(URL_); if (r.ok) return; } catch { /* démarrage */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('php -S ne démarre pas');
});
after(() => { server?.kill(); if (dir) rmSync(dir, { recursive: true, force: true }); if (mailLog) rmSync(mailLog, { force: true }); });

const t = (name, fn) => test(name, { skip: !php && 'PHP absent' }, fn);

t('GET : test de connexion sans secret', async () => {
  const r = await fetch(URL_);
  const b = await r.json();
  assert.equal(b.atelier, true);
  assert.equal(b.zip, true);
  assert.ok(!JSON.stringify(b).includes(await sha256Hex(TOKEN)));
});

t('OPTIONS : préflight CORS', async () => {
  const r = await fetch(URL_, { method: 'OPTIONS' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  assert.match(r.headers.get('access-control-allow-headers'), /X-Atelier-Token/i);
});

t('publication refusée sans jeton ou avec un mauvais jeton', async () => {
  assert.equal((await publish({ 'index.html': 'x' }, { token: '' })).status, 401);
  assert.equal((await publish({ 'index.html': 'x' }, { token: 'mauvais' })).status, 401);
  assert.ok(!existsSync(join(dir, 'index.html')));
});

t('publication : fichiers écrits, formulaires enregistrés hors d’atteinte du web', async () => {
  const r = await publish({ 'index.html': '<h1>Accueil</h1>', 'styles.css': 'body{}', 'nl/index.html': '<h1>Home</h1>', 'assets/a.webp': new Uint8Array([1, 2, 3]) }, { forms: { f1: 'redaction@exemple.be', f2: 'pas une adresse' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.written, 4);
  assert.equal(readFileSync(join(dir, 'nl', 'index.html'), 'utf8'), '<h1>Home</h1>');
  assert.deepEqual([...readFileSync(join(dir, 'assets', 'a.webp'))], [1, 2, 3]);
  const formsFile = readFileSync(join(dir, 'atelier-data', 'forms.php'), 'utf8');
  assert.ok(formsFile.startsWith('<?php http_response_code(404); exit; ?>'));
  assert.ok(formsFile.includes('redaction@exemple.be') && !formsFile.includes('pas une adresse'));
  const web = await fetch(`http://127.0.0.1:${PORT}/atelier-data/forms.php`);
  assert.equal(web.status, 404);
  assert.ok(!(await web.text()).includes('redaction@'));
});

t('paquet dangereux refusé en entier : rien n’est écrit', async () => {
  for (const bad of ['../evil.html', '/etc/x.html', 'x.php', 'a/.htaccess', 'shell.php.html', 'atelier-data/forms.php', 'img/a.svg', 'publish.php', 'a b.html']) {
    const r = await publish({ 'ok.html': 'ok', [bad]: 'x' });
    assert.equal(r.status, 400, `${bad} : ${JSON.stringify(r.body)}`);
    assert.ok(r.body.rejected.some(x => x.startsWith(bad.replace(/^\//, '')) || x.includes(bad)), JSON.stringify(r.body));
  }
  assert.ok(!existsSync(join(dir, 'ok.html')));
  assert.ok(readFileSync(join(dir, 'publish.php'), 'utf8').includes('hash_equals'), 'publish.php intact');
});

t('nouvelle publication : anciens fichiers retirés, fichiers ajoutés à la main conservés', async () => {
  const r = await publish({ 'index.html': '<h1>Accueil v2</h1>', 'styles.css': 'body{color:red}' });
  assert.equal(r.status, 200);
  assert.equal(r.body.removed, 2);
  assert.ok(!existsSync(join(dir, 'nl', 'index.html')) && !existsSync(join(dir, 'nl')));
  assert.ok(existsSync(join(dir, 'google1234.html')));
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<h1>Accueil v2</h1>');
});

t('formulaire de contact : e-mail envoyé à l’adresse configurée, Reply-To validé, pas d’injection d’en-tête', async () => {
  await publish({ 'index.html': 'x' }, { forms: { f1: 'redaction@exemple.be' } });
  const r = await contact({ _form: 'f1', _back: 'contact/', 'Nom': 'Ana\r\nBcc: victime@exemple.org', 'E-mail': 'ana@exemple.org', 'Message': 'Bonjour, je voudrais rejoindre le MAB.', website: '' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const log = readFileSync(mailLog, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const m = log.at(-1);
  assert.equal(m.to, 'redaction@exemple.be');
  assert.match(m.headers, /Reply-To: ana@exemple\.org/);
  assert.ok(!/Bcc/i.test(m.headers));
  assert.ok(m.body.includes('Bonjour, je voudrais rejoindre le MAB.'));
  assert.match(m.headers, /^From: Site <noreply@127\.0\.0\.1>/, 'adresse d’expéditeur sans le port');
});

t('formulaire : robot (champ piège), formulaire inconnu, message vide', async () => {
  const before = existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0;
  const bot = await contact({ _form: 'f1', Message: 'spam', website: 'http://spam' });
  assert.equal(bot.status, 200);
  assert.equal((existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0), before, 'aucun e-mail pour le robot');
  assert.equal((await contact({ _form: 'inconnu', Message: 'x' })).status, 404);
  assert.equal((await contact({ _form: 'f1', Message: '   ' })).status, 422);
});

t('formulaire sans JavaScript : redirection vers la page avec un message', async () => {
  const r = await contact({ _form: 'f1', _back: 'nl/contact/', Message: 'Hallo' }, {});
  assert.equal(r.status, 303);
  assert.equal(r.location, 'nl/contact/?form=ok');
  const evil = await contact({ _form: 'f1', _back: 'https://evil.example/', Message: 'x' }, {});
  assert.equal(evil.location, './?form=ok');
});

t('formulaire : 5 messages par heure et par adresse IP', async () => {
  let last;
  for (let i = 0; i < 8; i++) last = await contact({ _form: 'f1', Message: `m${i}` });
  assert.equal(last.status, 429);
});

/* ---------- Boîte aux lettres de signalisation (collaboration) ---------- */
const ROOM = 'a'.repeat(32) + 'b'.repeat(32);
const signal = body => fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json() }));
const poll = (room, peer, after = 0) => fetch(`${URL_}?signal=${room}&peer=${peer}&after=${after}`).then(async r => ({ status: r.status, body: await r.json() }));

t('signalisation : déposer et relever des messages chiffrés par destinataire', async () => {
  const st = await (await fetch(URL_)).json();
  assert.equal(st.signal, true, 'le statut annonce la signalisation');
  assert.equal(st.version, '4');
  let r = await signal({ signal: ROOM, from: 'guest01', to: 'host0001', data: 'Y2hpZmZyw6k=' });
  assert.equal(r.status, 200);
  assert.ok(r.body.id > 0);
  r = await signal({ signal: ROOM, from: 'guest02', to: 'host0001', data: 'QVVUUkU=' });
  const forHost = await poll(ROOM, 'host0001');
  assert.equal(forHost.body.messages.length, 2);
  assert.deepEqual(forHost.body.messages.map(m => m.from), ['guest01', 'guest02']);
  const after = await poll(ROOM, 'host0001', forHost.body.messages[0].id);
  assert.equal(after.body.messages.length, 1, 'seulement les nouveaux');
  assert.equal((await poll(ROOM, 'guest01')).body.messages.length, 0, 'pas les messages des autres');
  await signal({ signal: ROOM, from: 'host0001', to: 'guest01', data: 'UkVQT05TRQ==' });
  const g = await poll(ROOM, 'guest01');
  assert.equal(g.body.messages.length, 1);
  assert.equal(g.body.messages[0].data, 'UkVQT05TRQ==');
});

t('signalisation : salle, participant et taille vérifiés ; rien de lisible depuis le web', async () => {
  assert.equal((await signal({ signal: '../etc', from: 'g1', to: 'h1', data: 'x' })).status, 400);
  assert.equal((await signal({ signal: ROOM, from: 'g/../1', to: 'h1', data: 'x' })).status, 400);
  assert.equal((await signal({ signal: ROOM, from: 'g1', to: 'h1', data: 'x'.repeat(70000) })).status, 413);
  assert.equal((await signal({ signal: ROOM, from: 'g1', to: 'h1', data: '<script>' })).status, 400, 'données en base64 uniquement');
  assert.equal((await poll('zz', 'h1')).status, 400);
  const files = execFileSync('ls', ['-R', dir]).toString();
  assert.ok(!/signal[^\n]*\.json/.test(files), 'aucun fichier .json lisible');
  const direct = await fetch(`http://127.0.0.1:${PORT}/atelier-data/signal-${ROOM}.php`);
  assert.equal(direct.status, 404);
  assert.ok(!(await direct.text()).includes('Y2hpZmZy'));
});

/* ---------- Journal du serveur (publish.php v4) ---------- */
const logFile = () => join(dir, 'atelier-data', `log-${new Date().toISOString().slice(0, 7)}.php`);
const lines0 = () => logLines();
const logLines = () => readFileSync(logFile(), 'utf8').split('\n').slice(1).filter(Boolean).map(l => JSON.parse(l));

t('journal : identifiant de requête dans l’en-tête, exposé par CORS ; statut sans diagnostic sans jeton', async () => {
  const r = await fetch(URL_);
  const id = r.headers.get('x-atelier-request');
  assert.match(id, /^[0-9a-f]{8}$/);
  assert.match(r.headers.get('access-control-expose-headers'), /X-Atelier-Request/i);
  const b = await r.json();
  assert.equal(b.log, true);
  assert.equal(b.req, id);
  assert.equal(b.diag, undefined, 'pas de diagnostic sans jeton');
  assert.equal(b._trace, undefined, 'pas de trace sans atelier_debug');
});

t('journal : statut avec le jeton → diagnostic de l’hébergement', async () => {
  const b = await (await fetch(URL_, { headers: { 'X-Atelier-Token': TOKEN } })).json();
  for (const k of ['upload_max_filesize', 'post_max_size', 'memory_limit', 'max_execution_time', 'mail', 'data_writable', 'root_writable', 'log_level']) assert.ok(k in b.diag, k);
  const bad = await (await fetch(URL_, { headers: { 'X-Atelier-Token': 'faux' } })).json();
  assert.equal(bad.diag, undefined);
});

t('journal : ?atelier_debug=1 renvoie la trace de la requête', async () => {
  const r = await fetch(`${URL_}?atelier_debug=1`);
  const b = await r.json();
  assert.ok(Array.isArray(b._trace));
  const evs = b._trace.map(e => e.ev);
  assert.ok(evs.includes('php.req.start') && evs.includes('php.status'), evs.join(','));
  assert.ok(b._trace.every(e => e.req === r.headers.get('x-atelier-request')));
  for (const e of b._trace) { assert.ok(['debug', 'info', 'warn', 'error'].includes(e.lvl)); assert.equal(typeof e.ms, 'number'); }
  assert.ok(!JSON.stringify(b._trace).includes(dir), 'aucun chemin du serveur dans la trace');
});

t('journal : publication refusée puis réussie, écrites dans le fichier protégé, sans jeton ni IP', async () => {
  const fd = new FormData();
  fd.append('site', zip({ 'index.html': 'x' }), 'site.zip');
  const denied = await fetch(`${URL_}?atelier_debug=1`, { method: 'POST', body: fd, headers: { 'X-Atelier-Token': 'mauvais-jeton-123' } });
  assert.equal(denied.status, 401);
  const db = await denied.json();
  assert.ok(db._trace.some(e => e.ev === 'php.publish.denied' && e.lvl === 'warn'));
  const ok = await publish({ 'index.html': '<h1>Journal</h1>', 'a.css': 'b{}' });
  assert.equal(ok.status, 200);
  const raw = readFileSync(logFile(), 'utf8');
  assert.ok(raw.startsWith('<?php http_response_code(404); exit; ?>'));
  assert.ok(!raw.includes(TOKEN) && !raw.includes('mauvais-jeton-123'), 'aucun jeton');
  assert.ok(!raw.includes('"127.0.0.1"') && lines0().every(l => l.data?.who !== '127.0.0.1'), 'aucune adresse IP');
  const lines = logLines();
  const pub = lines.filter(l => l.ev === 'php.publish.ok').at(-1);
  assert.equal(pub.data.written, 2);
  assert.ok(lines.some(l => l.ev === 'php.publish.denied'));
  assert.ok(lines.some(l => l.ev === 'php.req.end' && l.data.status === 401));
  const web = await fetch(`http://127.0.0.1:${PORT}/atelier-data/log-${new Date().toISOString().slice(0, 7)}.php`);
  assert.equal(web.status, 404);
});

t('journal : contact noté sans le contenu du message, adresse abrégée', async () => {
  await publish({ 'index.html': 'x' }, { forms: { f9: 'redaction@exemple.be' } });
  const r = await contact({ _form: 'f9', Message: 'Contenu très privé du visiteur' }, { Accept: 'application/json', 'X-Forwarded-For': '9.9.9.9' });
  assert.ok([200, 429].includes(r.status));
  const raw = readFileSync(logFile(), 'utf8');
  assert.ok(!raw.includes('Contenu très privé'), 'pas le contenu');
  assert.ok(!raw.includes('redaction@exemple.be'), 'adresse abrégée');
  assert.ok(raw.includes('re…@exemple.be'));
  assert.ok(logLines().some(l => /^php\.contact\./.test(l.ev)));
});

t('journal : ?logs refusé sans jeton, lu avec le jeton', async () => {
  const no = await fetch(`${URL_}?logs=20`);
  assert.equal(no.status, 401);
  const r = await fetch(`${URL_}?logs=20`, { headers: { 'X-Atelier-Token': TOKEN } });
  const b = await r.json();
  assert.equal(b.ok, true);
  assert.ok(b.lines.length > 0 && b.lines.length <= 20);
  for (const l of b.lines) for (const k of ['t', 'req', 'lvl', 'ev']) assert.ok(k in l, k);
  assert.ok(b.files.every(f => /^log-\d{4}-\d\d(\.old)?\.php$/.test(f)));
  assert.ok(logLines().some(l => l.ev === 'php.logs.denied'));
});

t('journal : une exception renvoie 500 avec la référence de la requête et reste notée', async () => {
  const r = await fetch(`${URL_}?atelier_fault=exception`);
  assert.equal(r.status, 500);
  const b = await r.json();
  const id = r.headers.get('x-atelier-request');
  assert.equal(b.ok, false);
  assert.ok(b.error.includes(id), b.error);
  assert.ok(logLines().some(l => l.ev === 'php.exception' && l.req === id));
  const w = await fetch(`${URL_}?atelier_fault=warning&atelier_debug=1`);
  const wb = await w.json();
  assert.ok(wb._trace.some(e => e.ev === 'php.warning'), 'avertissement PHP noté');
});

t('journal : signalisation tracée en mode debug', async () => {
  const r = await fetch(`${URL_}?atelier_debug=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signal: ROOM, from: 'guest09', to: 'host0001', data: 'QUJD' }) });
  const b = await r.json();
  assert.ok(b._trace.some(e => e.ev === 'php.signal.post'));
  assert.ok(!JSON.stringify(b._trace).includes(ROOM), 'salle abrégée');
});
