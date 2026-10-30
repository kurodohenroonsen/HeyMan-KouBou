import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, redact, errInfo, formatEntry, LEVELS, validCode } from '../core/log.js';

const clock = () => { let t = 1_800_000_000_000; return { now: () => t, tick: ms => { t += ms; } }; };

test('niveaux : le tampon garde ce qui passe son niveau, les sorties ont le leur', () => {
  const c = clock();
  const seen = [];
  const log = createLogger({ now: c.now, keep: 'debug', sinks: [{ level: 'warn', write: e => seen.push(e.code) }] });
  log.trace('a.trace', 'x');
  log.debug('a.debug', 'x');
  log.info('a.info', 'x');
  log.warn('a.warn', 'x');
  log.error('a.error', 'x');
  assert.deepEqual(log.entries().map(e => e.code), ['a.debug', 'a.info', 'a.warn', 'a.error']);
  assert.deepEqual(seen, ['a.warn', 'a.error']);
  assert.deepEqual(log.counts(), { error: 1, warn: 1 });
  log.setLevels({ keep: 'trace' });
  log.trace('a.trace2', 'x');
  assert.equal(log.entries().at(-1).code, 'a.trace2');
  assert.deepEqual(Object.keys(LEVELS), ['trace', 'debug', 'info', 'warn', 'error', 'off']);
});

test('filtres : niveau minimal, domaine, parcours, texte', () => {
  const log = createLogger({ keep: 'trace' });
  log.debug('store.commit', 'Modification', { key: 'k' });
  log.info('publish.php.start', 'Publication OVH');
  log.error('publish.php.fail', 'Échec', { status: 401 });
  assert.equal(log.entries({ level: 'info' }).length, 2);
  assert.equal(log.entries({ scope: 'publish' }).length, 2);
  assert.equal(log.entries({ text: '401' }).length, 1);
  assert.equal(log.entries({ text: 'modif' }).length, 1);
  assert.equal(log.entries()[0].scope, 'store');
});

test('tampon circulaire : les plus anciens partent, la numérotation continue', () => {
  const log = createLogger({ capacity: 3 });
  for (let i = 0; i < 5; i++) log.info('x.n', `n${i}`);
  const e = log.entries();
  assert.deepEqual(e.map(x => x.msg), ['n2', 'n3', 'n4']);
  assert.equal(e[0].seq, 3);
  assert.equal(log.stats().dropped, 2);
});

test('parcours : identifiant, durée, réussite et échec', () => {
  const c = clock();
  const log = createLogger({ now: c.now, keep: 'debug' });
  const f = log.flow('publish.php', 'Publication OVH', { files: 3 });
  assert.match(f.id, /^publish\.php#\d+$/);
  c.tick(120);
  f.step('upload', 'Envoi', { kb: 12 });
  c.tick(300);
  const end = f.ok('Site publié', { written: 3 });
  const es = log.entries();
  assert.deepEqual(es.map(e => e.code), ['publish.php.start', 'publish.php.upload', 'publish.php.ok']);
  assert.ok(es.every(e => e.flow === f.id));
  assert.equal(end.ms, 420);
  assert.equal(es[1].ms, 120);
  const g = log.flow('publish.php', 'Publication OVH');
  assert.notEqual(g.id, f.id);
  c.tick(50);
  const fail = g.fail(new TypeError('Failed to fetch'), { url: 'https://x.be/publish.php' });
  assert.equal(fail.level, 'error');
  assert.equal(fail.code, 'publish.php.fail');
  assert.equal(fail.data.error.name, 'TypeError');
  assert.equal(fail.data.error.message, 'Failed to fetch');
  assert.equal(fail.ms, 50);
  assert.equal(g.ok('trop tard'), null, 'un parcours terminé ne se termine pas deux fois');
  const h = log.flow('ai.task', 'Tâche');
  h.warn('fallback', 'Repli sur la Prompt API');
  assert.equal(log.entries().at(-1).level, 'warn');
  assert.equal(log.entries().at(-1).code, 'ai.task.fallback');
});

test('masquage : secrets, jetons, adresses, images, e-mails, longueurs, profondeur', () => {
  const tok = 'a'.repeat(64);
  const r = redact({
    token: 'abc', secret: 's', password: 'p', authorization: 'Bearer x', jwk: { d: 'k' }, privateKey: 'k', 'X-Atelier-Token': 't',
    pathKey: 'n:p1:t:text', textKey: 'k', key: 'champ', apiKey: 'cle-secrete',
    hash: tok,
    url: 'https://x.be/editeur/?a=1&token=zz#join=SECRET',
    img: 'data:image/webp;base64,' + 'A'.repeat(4000),
    mail: 'redaction@exemple.be',
    long: 'x'.repeat(1000),
    list: Array.from({ length: 30 }, (_, i) => i),
    deep: { a: { b: { c: { x: { e: 1 } } } } },
    n: 3, ok: true, nul: null
  });
  for (const k of ['token', 'secret', 'password', 'authorization', 'jwk', 'privateKey', 'X-Atelier-Token', 'apiKey', 'hash']) assert.equal(r[k], '[masqué]', k);
  assert.equal(r.pathKey, 'n:p1:t:text');
  assert.equal(r.textKey, 'k');
  assert.equal(r.key, 'champ');
  assert.equal(r.url, 'https://x.be/editeur/?a=1&token=[masqué]#join=[masqué]');
  assert.match(r.img, /^data:image\/webp \(3 Ko\)$/);
  assert.equal(r.mail, 're…@exemple.be');
  assert.ok(r.long.length < 340 && r.long.endsWith('… (1000 car.)'));
  assert.equal(r.list.length, 21);
  assert.equal(r.list.at(-1), '… +10');
  assert.equal(r.deep.a.b.c.x, '[…]');
  assert.equal(r.n, 3);
  assert.equal(r.ok, true);
  assert.equal(r.nul, null);
  assert.equal(redact('texte avec redaction@exemple.be dedans'), 'texte avec re…@exemple.be dedans');
  assert.equal(redact(`https://x.be/publish.php?signal=${'ab12cd34'}${'e'.repeat(56)}&peer=h1`), 'https://x.be/publish.php?signal=ab12cd34…&peer=h1', 'salle abrégée');
});

test('masquage : objets particuliers (Error, Map, Set, Uint8Array, fonctions, cycles)', () => {
  const o = { a: 1 };
  o.self = o;
  const r = redact({ e: new RangeError('trop'), m: new Map([['x', 1]]), s: new Set([1, 2]), b: new Uint8Array(2048), f: () => 1, o, date: new Date(0) });
  assert.equal(r.e.name, 'RangeError');
  assert.deepEqual(r.m, { x: 1 });
  assert.deepEqual(r.s, [1, 2]);
  assert.equal(r.b, 'Uint8Array (2 Ko)');
  assert.equal(r.f, '[fonction]');
  assert.equal(r.o.self, '[cycle]');
  assert.equal(r.date, '1970-01-01T00:00:00.000Z');
  const ei = errInfo(Object.assign(new Error('x'), { code: 'E1' }));
  assert.equal(ei.code, 'E1');
  assert.ok(ei.stack.split('\n').length <= 5);
  assert.deepEqual(errInfo('simple'), { name: 'Error', message: 'simple' });
});

test('données paresseuses : la fonction n’est appelée que si le niveau passe', () => {
  const log = createLogger({ keep: 'info' });
  let calls = 0;
  log.debug('x.lazy', 'non', () => { calls++; return { a: 1 }; });
  assert.equal(calls, 0);
  log.info('x.lazy', 'oui', () => { calls++; return { a: 1 }; });
  assert.equal(calls, 1);
  assert.deepEqual(log.entries().at(-1).data, { a: 1 });
  log.info('x.lazy', 'casse', () => { throw new Error('boum'); });
  assert.match(log.entries().at(-1).data.dataError, /boum/);
});

test('format texte : heure, temps écoulé, niveau, code, parcours, message, données', () => {
  const c = clock();
  const log = createLogger({ now: c.now });
  c.tick(2310);
  const f = log.flow('publish.php', 'Publication OVH');
  c.tick(840);
  const e = f.ok('Site publié', { written: 42 });
  const line = formatEntry(e, { tz: 'UTC' });
  assert.match(line, /^\d\d:\d\d:\d\d\.\d{3} \+3\.15s INFO {2}publish\.php\.ok \[publish\.php#\d+ · 840 ms\] Site publié \{"written":42\}$/);
  const plain = formatEntry({ ...e, flow: null, ms: null, data: undefined }, { tz: 'UTC' });
  assert.match(plain, /INFO {2}publish\.php\.ok Site publié$/);
});

test('dump : en-tête d’environnement puis lignes, et JSON', () => {
  const log = createLogger();
  log.info('boot.ready', 'Éditeur prêt', { ms: 12 });
  const txt = log.dump({ header: { version: '16', navigateur: 'Chrome 148' }, tz: 'UTC' });
  assert.match(txt, /^=== Journal Atelier ===/);
  assert.match(txt, /version : 16/);
  assert.match(txt, /navigateur : Chrome 148/);
  assert.match(txt, /boot\.ready Éditeur prêt/);
  const j = JSON.parse(log.dump({ format: 'json', header: { version: '16' } }));
  assert.equal(j.header.version, '16');
  assert.equal(j.entries[0].code, 'boot.ready');
});

test('abonnement et vidage', () => {
  const log = createLogger();
  const got = [];
  const off = log.subscribe(e => got.push(e.code));
  log.info('a.b', 'x');
  off();
  log.info('a.c', 'x');
  assert.deepEqual(got, ['a.b']);
  log.error('a.d', 'x');
  log.clear();
  assert.equal(log.entries().length, 0);
  assert.deepEqual(log.counts(), { error: 0, warn: 0 });
});

test('une sortie qui plante ne casse pas le journal', () => {
  const log = createLogger({ sinks: [{ level: 'trace', write() { throw new Error('console cassée'); } }] });
  assert.doesNotThrow(() => log.info('a.b', 'x'));
  assert.equal(log.entries().length, 1);
});

test('codes valides', () => {
  assert.ok(validCode('publish.php.ok'));
  assert.ok(validCode('ai.seo-all.start'));
  assert.ok(!validCode('Publish.OK'));
  assert.ok(!validCode('seul'));
  assert.ok(!validCode('a..b'));
});
