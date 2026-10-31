/* Intégration : le vrai publish.php généré, servi par PHP (php -S), interrogé en HTTP. Ignoré si PHP est absent. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPublishPhp, sha256Hex, signalRoom } from '../core/publish.js';
import { buildHtaccess } from '../core/htaccess.js';
import { createZip } from '../core/zip.js';

let php = true;
try { execFileSync('php', ['-m'], { stdio: 'pipe' }); } catch { php = false; }

const TOKEN = 'jeton-de-test-0123456789abcdef';
const PORT = 8800 + Math.floor(Math.random() * 150);
const URL_ = `http://127.0.0.1:${PORT}/publish.php`;
let dir, mailLog, server;

const zip = files => new Blob([createZip(Object.entries(files).map(([name, data]) => ({ name, data })))], { type: 'application/zip' });
async function publish(files, { token = TOKEN, forms, htaccess } = {}) {
  const fd = new FormData();
  fd.append('site', zip(files), 'site.zip');
  if (forms) fd.append('forms', JSON.stringify(forms));
  if (htaccess) fd.append('htaccess', typeof htaccess === 'string' ? htaccess : JSON.stringify(htaccess));
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
  writeFileSync(join(dir, 'publish.php'), buildPublishPhp({ tokenHash: await sha256Hex(TOKEN), baseUrl: 'https://www.media-alternatif.be' }));
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
  for (const bad of ['../evil.html', '/etc/x.html', 'x.php', 'a/.htaccess', 'shell.php.html', 'atelier-data/forms.php', 'img/a.exe', 'publish.php', 'a b.html']) {
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
  const r = await contact({ _form: 'f1', _back: 'contact/', 'Nom': 'Ana\r\nBcc: victime@exemple.org', 'E-mail': 'ana@exemple.org', 'Message': 'Bonjour, je voudrais rejoindre le MAB.', website: '', _consent: 'oui' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const log = readFileSync(mailLog, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const m = log.at(-1);
  assert.equal(m.to, 'redaction@exemple.be');
  assert.match(m.headers, /Reply-To: ana@exemple\.org/);
  assert.ok(!/Bcc/i.test(m.headers));
  assert.ok(m.body.includes('Bonjour, je voudrais rejoindre le MAB.'));
  assert.match(m.headers, /^From: Site <noreply@media-alternatif\.be>/, 'expéditeur fixé à la génération (adresse du site, sans www)');
});

t('formulaire : robot (champ piège), formulaire inconnu, message vide', async () => {
  const before = existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0;
  const bot = await contact({ _form: 'f1', Message: 'spam', website: 'http://spam' });
  assert.equal(bot.status, 200);
  assert.equal((existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0), before, 'aucun e-mail pour le robot');
  assert.equal((await contact({ _form: 'inconnu', Message: 'x', _consent: 'oui' })).status, 404);
  assert.equal((await contact({ _form: 'f1', Message: '   ', _consent: 'oui' })).status, 422);
});

t('formulaire sans JavaScript : redirection vers la page avec un message', async () => {
  const r = await contact({ _form: 'f1', _back: 'nl/contact/', Message: 'Hallo', _consent: 'oui' }, {});
  assert.equal(r.status, 303);
  assert.equal(r.location, 'nl/contact/?form=ok');
  const evil = await contact({ _form: 'f1', _back: 'https://evil.example/', Message: 'x', _consent: 'oui' }, {});
  assert.equal(evil.location, './?form=ok');
});

t('formulaire : 5 messages par heure et par adresse IP', async () => {
  let last;
  for (let i = 0; i < 8; i++) last = await contact({ _form: 'f1', Message: `m${i}`, _consent: 'oui' });
  assert.equal(last.status, 429);
});

/* ---------- Boîte aux lettres de signalisation (collaboration) ---------- */
const SR = await signalRoom('secret-de-salle-de-test');
const ROOM = SR.room;
const signal = body => fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proof: SR.proof, ...body }) }).then(async r => ({ status: r.status, body: await r.json() }));
const poll = (room, peer, after = 0) => fetch(`${URL_}?signal=${room}&peer=${peer}&after=${after}`).then(async r => ({ status: r.status, body: await r.json() }));

t('signalisation : déposer et relever des messages chiffrés par destinataire', async () => {
  const st = await (await fetch(URL_)).json();
  assert.equal(st.signal, true, 'le statut annonce la signalisation');
  assert.equal(st.version, '5');
  assert.equal(st.php, undefined, 'version de PHP réservée au jeton');
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
  assert.equal((await signal({ signal: ROOM, from: 'g1', to: 'h1', data: 'x'.repeat(17000) })).status, 413, 'plus de 16 Ko : refusé');
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
  const r = await fetch(`${URL_}?atelier_debug=1`, { headers: { 'X-Atelier-Token': TOKEN } });
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
  const denied = await fetch(URL_, { method: 'POST', body: fd, headers: { 'X-Atelier-Token': 'mauvais-jeton-123' } });
  assert.equal(denied.status, 401);
  const db = await denied.json();
  assert.equal(db.code, 'token_refused');
  assert.equal(db._trace, undefined);
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
  const r = await contact({ _form: 'f9', Message: 'Contenu très privé du visiteur', _consent: 'oui' }, { Accept: 'application/json', 'X-Forwarded-For': '9.9.9.9' });
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
  const w = await fetch(`${URL_}?atelier_fault=warning&atelier_debug=1`, { headers: { 'X-Atelier-Token': TOKEN } });
  const wb = await w.json();
  assert.ok(wb._trace.some(e => e.ev === 'php.warning'), 'avertissement PHP noté');
});

t('journal : signalisation tracée en mode debug', async () => {
  const r = await fetch(`${URL_}?atelier_debug=1`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier-Token': TOKEN }, body: JSON.stringify({ signal: ROOM, proof: SR.proof, from: 'guest09', to: 'host0001', data: 'QUJD' }) });
  const b = await r.json();
  assert.ok(b._trace.some(e => e.ev === 'php.signal.post'));
  assert.ok(!JSON.stringify(b._trace).includes(ROOM), 'salle abrégée');
});

/* ---------- publish.php v5 (cycle 29) ---------- */
t('v5 : trace et version de PHP réservées au jeton ; ?atelier_debug sans jeton → 404', async () => {
  const no = await fetch(`${URL_}?atelier_debug=1`);
  assert.equal(no.status, 404);
  const nb = await no.json();
  assert.equal(nb.code, 'not_found');
  assert.equal(nb._trace, undefined);
  const bad = await fetch(`${URL_}?atelier_debug=1`, { headers: { 'X-Atelier-Token': 'faux' } });
  assert.equal(bad.status, 404);
  const ok = await (await fetch(URL_, { headers: { 'X-Atelier-Token': TOKEN } })).json();
  assert.match(ok.php, /^\d+\.\d+/);
  assert.equal(ok.diag.mail_domain, 'media-alternatif.be');
  assert.equal(ok.htaccess, true);
});

t('v5 : chaque erreur porte un code machine et un message', async () => {
  const r = await publish({ 'index.html': 'x' }, { token: 'mauvais' });
  assert.equal(r.body.code, 'token_refused');
  assert.equal(r.body.ok, false);
  assert.ok(r.body.message && r.body.req);
  const m = await fetch(URL_, { method: 'PUT' });
  assert.equal((await m.json()).code, 'method');
});

t('v5 : nouvelles extensions acceptées, .php et .htaccess dans le paquet toujours refusés', async () => {
  const files = { 'index.html': 'x', 'assets/fonts/a-0123abcd.woff2': 'w', 'favicon.svg': '<svg/>', 'favicon.ico': 'i', 'assets/statuts.pdf': 'p', 'assets/emission.mp3': 'm', 'assets/e.m4a': 'm', 'assets/e.ogg': 'o', 'agenda/calendar.ics': 'c', 'site.webmanifest': '{}' };
  const r = await publish(files);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  for (const k of Object.keys(files)) assert.ok(existsSync(join(dir, k)), k);
  for (const bad of ['evil.php', '.htaccess', 'a/.htaccess', 'x.phtml']) {
    const b = await publish({ 'index.html': 'x', [bad]: 'x' });
    assert.equal(b.status, 400, bad);
    assert.equal(b.body.code, 'rejected');
  }
});

t('v5 : .htaccess écrit par publish.php lui-même, identique au gabarit de l’éditeur ; options forgées refusées', async () => {
  const o = { host: 'www.media-alternatif.be', https: true, www: 'add', path: '/', langs: ['fr', 'nl'] };
  const r = await publish({ 'index.html': 'x', '404.html': 'nf' }, { htaccess: o });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.htaccess, true);
  assert.equal(readFileSync(join(dir, '.htaccess'), 'utf8'), buildHtaccess(o));
  const bad = await publish({ 'index.html': 'y' }, { htaccess: { ...o, host: 'evil.be"\nRewriteRule' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, 'htaccess_invalid');
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), 'x', 'rien publié');
});

t('v5 : mise en place impossible (moved < count) → 500 avec la liste, manifeste inchangé', async () => {
  await publish({ 'index.html': 'ok' });
  const before = readFileSync(join(dir, 'atelier-data', 'manifest.php'), 'utf8');
  writeFileSync(join(dir, 'bloque'), 'fichier régulier qui bloque un dossier');
  const r = await publish({ 'index.html': 'neuf', 'bloque/page.html': 'x' });
  assert.equal(r.status, 500, JSON.stringify(r.body));
  assert.equal(r.body.code, 'move_failed');
  assert.deepEqual(r.body.failed, ['bloque/page.html']);
  assert.equal(readFileSync(join(dir, 'atelier-data', 'manifest.php'), 'utf8'), before, 'manifeste non écrit');
  rmSync(join(dir, 'bloque'), { force: true });
});

t('v5 : expéditeur fixé à la génération, un en-tête Host forgé est sans effet', async () => {
  await publish({ 'index.html': 'x' }, { forms: { fh: 'redaction@exemple.be' } });
  const fd = new FormData();
  for (const [k, v] of Object.entries({ _form: 'fh', Message: 'Bonjour', _consent: 'oui' })) fd.append(k, v);
  const { request } = await import('node:http');
  const req0 = new Request('http://x', { method: 'POST', body: fd });
  const ct = req0.headers.get('content-type');
  const raw = Buffer.from(await req0.arrayBuffer());
  await new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port: PORT, path: '/publish.php', method: 'POST', headers: { Host: 'www.attaquant.example', Accept: 'application/json', 'Content-Type': ct } }, r => { r.resume(); r.on('end', res); });
    req.on('error', rej);
    req.end(raw);
  });
  const m = readFileSync(mailLog, 'utf8').trim().split('\n').map(l => JSON.parse(l)).at(-1);
  assert.match(m.headers, /^From: Site <noreply@media-alternatif\.be>/);
  assert.ok(!m.headers.includes('attaquant'));
});

t('v5 : formulaire sans consentement → 400 avec code, aucun e-mail', async () => {
  await publish({ 'index.html': 'x' }, { forms: { fc: 'redaction@exemple.be' } });
  const before = existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0;
  const r = await contact({ _form: 'fc', Message: 'Sans case cochée' }, { Accept: 'application/json', 'X-Forwarded-For': '1.1.1.1' });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'consent_required');
  assert.equal(existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0, before);
});

t('v5 : signalisation — preuve de salle exigée, 201ᵉ message → 429, salle bornée à 2 Mo', async () => {
  const other = await signalRoom('autre-secret');
  const noProof = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signal: other.room, from: 'g1', to: 'h1', data: 'QQ==' }) });
  assert.equal(noProof.status, 403);
  assert.equal((await noProof.json()).code, 'signal_proof');
  const wrong = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signal: other.room, proof: SR.proof, from: 'g1', to: 'h1', data: 'QQ==' }) });
  assert.equal(wrong.status, 403, 'preuve d’une autre salle');
  const post = body => fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signal: other.room, proof: other.proof, from: 'g1', to: 'h1', ...body }) });
  const big = 'A'.repeat(16000);
  let full = null;
  for (let i = 0; i < 140 && !full; i++) { const r = await post({ data: big }); if (r.status !== 200) full = { status: r.status, code: (await r.json()).code }; }
  assert.deepEqual(full, { status: 429, code: 'signal_room_full' }, 'salle pleine avant 2 Mo + 16 Ko');
  let last;
  for (let i = 0; i < 210; i++) { last = await post({ data: 'QQ==', signal: (await signalRoom(`s${i % 3}`)).room, proof: (await signalRoom(`s${i % 3}`)).proof }); if (last.status === 429) break; }
  assert.equal(last.status, 429);
  assert.equal((await last.json()).code, 'signal_rate', 'limite par adresse hachée');
});
