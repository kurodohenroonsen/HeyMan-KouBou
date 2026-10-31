/* Cycle 31 (S7) : copie de secours chiffrée (AES-GCM 256, PBKDF2-SHA-256) et copie dans un dossier local. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptBackup, decryptBackup, deriveKey, parseBackup, BACKUP_ITERATIONS, MAX_BACKUP_BYTES, BACKUP_MAGIC,
  checkCode, BACKUP_NAME_RE, folderFiles, folderWriteDue, exportReminderDue, ago
} from '../core/backup.js';

const site = { name: 'MAB', languages: ['fr'], defaultLanguage: 'fr', pages: [{ id: 'p1', root: { id: 'r', type: 'page', children: [] } }], assets: { a1: { dataUrl: 'data:image/webp;base64,AAAA' } } };
const CODE = 'radio-libre-2026';

test('chiffrer puis déchiffrer : le projet revient à l’identique', async () => {
  const bytes = await encryptBackup(site, CODE, { iterations: 1000 });
  assert.ok(bytes instanceof Uint8Array);
  const back = await decryptBackup(bytes, CODE);
  assert.deepEqual(back.site, site);
  assert.ok(back.at);
});

test('le contenu n’est pas lisible dans le fichier (ni nom, ni image)', async () => {
  const bytes = await encryptBackup(site, CODE, { iterations: 1000 });
  const text = new TextDecoder().decode(bytes);
  assert.ok(!text.includes('MAB') && !text.includes('AAAA') && !text.includes(CODE));
});

test('mauvais code → échec propre (code bad_code), jamais d’exception brute', async () => {
  const bytes = await encryptBackup(site, CODE, { iterations: 1000 });
  await assert.rejects(decryptBackup(bytes, 'pas-le-bon-code'), e => e.code === 'bad_code' && /code/i.test(e.message));
});

test('fichier abîmé ou étranger → échec propre (bad_format)', async () => {
  await assert.rejects(decryptBackup(new TextEncoder().encode('{"pas":"une copie"}'), CODE), e => e.code === 'bad_format');
  const bytes = await encryptBackup(site, CODE, { iterations: 1000 });
  const cut = bytes.slice(0, bytes.length - 20);
  await assert.rejects(decryptBackup(cut, CODE), e => e.code === 'bad_code' || e.code === 'bad_format');
  const tampered = bytes.slice();
  tampered[tampered.length - 1] ^= 1;
  await assert.rejects(decryptBackup(tampered, CODE), e => e.code === 'bad_code');
});

test('format du fichier : en-tête lisible (sel, IV, itérations), puis données chiffrées', async () => {
  const bytes = await encryptBackup(site, CODE, { iterations: 1000, at: new Date('2026-10-31T14:05:00Z') });
  const head = new TextDecoder().decode(bytes.slice(0, BACKUP_MAGIC.length));
  assert.equal(head, BACKUP_MAGIC);
  const { header, data } = parseBackup(bytes);
  assert.equal(header.v, 1);
  assert.equal(header.alg, 'AES-GCM-256');
  assert.equal(header.kdf, 'PBKDF2-SHA-256');
  assert.equal(header.iter, 1000);
  assert.equal(Buffer.from(header.salt, 'base64').length, 16);
  assert.equal(Buffer.from(header.iv, 'base64').length, 12);
  assert.equal(header.at, '2026-10-31T14:05:00.000Z');
  assert.ok(data.length > 16);
});

test('sel et IV aléatoires : deux copies du même projet diffèrent', async () => {
  const a = parseBackup(await encryptBackup(site, CODE, { iterations: 1000 })).header;
  const b = parseBackup(await encryptBackup(site, CODE, { iterations: 1000 })).header;
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.iv, b.iv);
});

test('dérivation : PBKDF2-SHA-256, au moins 300 000 itérations par défaut, clé AES-GCM 256 non exportable', async () => {
  assert.ok(BACKUP_ITERATIONS >= 300000);
  const key = await deriveKey(CODE, new Uint8Array(16), 1000);
  assert.equal(key.algorithm.name, 'AES-GCM');
  assert.equal(key.algorithm.length, 256);
  assert.equal(key.extractable, false);
  const bytes = await encryptBackup(site, CODE);
  assert.equal(parseBackup(bytes).header.iter, BACKUP_ITERATIONS);
});

test('dérivation : même code + même sel → même clé (vérifié en déchiffrant)', async () => {
  const salt = new Uint8Array(16).fill(7);
  const iv = new Uint8Array(12).fill(3);
  const k1 = await deriveKey(CODE, salt, 1000);
  const k2 = await deriveKey(CODE, salt, 1000);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k1, new TextEncoder().encode('bonjour'));
  assert.equal(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k2, ct)), 'bonjour');
});

test('taille : copie refusée au-delà de 100 Mo (too_big)', async () => {
  assert.equal(MAX_BACKUP_BYTES, 100 * 1024 * 1024);
  await assert.rejects(encryptBackup(site, CODE, { iterations: 1000, maxBytes: 200 }), e => e.code === 'too_big');
});

test('déchiffré mais pas un projet Atelier → refusé (bad_content)', async () => {
  const bytes = await encryptBackup({ pas: 'un site' }, CODE, { iterations: 1000, raw: true });
  await assert.rejects(decryptBackup(bytes, CODE), e => e.code === 'bad_content');
});

test('code de secours : 8 caractères au moins', () => {
  assert.ok(checkCode(''));
  assert.ok(checkCode('court'));
  assert.equal(checkCode('assez-long'), '');
  assert.rejects(encryptBackup(site, 'court'), e => e.code === 'bad_code');
});

test('nom des copies sur l’hébergement : backup-AAAAMMJJ-HHMM.json.enc (suffixe si même minute)', () => {
  assert.match('backup-20261031-1405.json.enc', BACKUP_NAME_RE);
  assert.match('backup-20261031-1405-2.json.enc', BACKUP_NAME_RE);
  assert.doesNotMatch('../backup-20261031-1405.json.enc', BACKUP_NAME_RE);
  assert.doesNotMatch('backup-2026.json.enc', BACKUP_NAME_RE);
});

test('dossier local : export autonome + une version par jour', () => {
  const now = new Date(2026, 9, 31, 14, 5);
  assert.deepEqual(folderFiles({ name: 'Médias Alternatifs Belges', now, lastDaily: '' }), { main: 'medias-alternatifs-belges.atelier.json', daily: 'versions/2026-10-31.json', day: '2026-10-31' });
  assert.deepEqual(folderFiles({ name: 'MAB', now, lastDaily: '2026-10-31' }), { main: 'mab.atelier.json', daily: null, day: '2026-10-31' });
  assert.equal(folderFiles({ name: '', now, lastDaily: '' }).main, 'site.atelier.json');
});

test('dossier local : pas plus d’une écriture toutes les 5 s', () => {
  assert.equal(folderWriteDue(0, 10000), 0);
  assert.equal(folderWriteDue(9000, 10000), 4000);
  assert.equal(folderWriteDue(4000, 10000), 0);
});

test('rappel hebdomadaire d’export (Firefox, Safari)', () => {
  const day = 86400000;
  const now = Date.parse('2026-10-31T12:00:00Z');
  assert.equal(exportReminderDue({ lastExport: 0, lastRemind: 0, now }), true);
  assert.equal(exportReminderDue({ lastExport: now - 3 * day, lastRemind: 0, now }), false);
  assert.equal(exportReminderDue({ lastExport: now - 8 * day, lastRemind: now - 2 * day, now }), false);
  assert.equal(exportReminderDue({ lastExport: now - 8 * day, lastRemind: now - 8 * day, now }), true);
});

test('« il y a 2 min »', () => {
  assert.equal(ago(5000), 'à l’instant');
  assert.equal(ago(2 * 60000 + 3000), 'il y a 2 min');
  assert.equal(ago(3 * 3600000), 'il y a 3 h');
  assert.equal(ago(2 * 86400000), 'il y a 2 j');
});
