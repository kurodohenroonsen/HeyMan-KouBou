/*
 * Copies de secours hors du navigateur (cycle 31, S7). Sans DOM, avec WebCrypto (navigateur et Node 22).
 *  - Copie chiffrée pour l'hébergement : AES-GCM 256, clé dérivée par PBKDF2-SHA-256 d'un code de secours choisi par
 *    la personne ; sel et IV aléatoires rangés dans l'en-tête du fichier ; le serveur ne voit ni le code ni le contenu.
 *    Fichier : « ATELIER-BACKUP\n » + en-tête JSON (une ligne) + « \n » + données chiffrées (JSON compressé en gzip).
 *    L'en-tête sert de données authentifiées : le modifier (itérations, sel…) fait échouer le déchiffrement.
 *  - Dossier local : noms des fichiers écrits, rythme des écritures, rappel hebdomadaire d'export.
 */
import { __ } from './ui-i18n.js';

export const BACKUP_MAGIC = 'ATELIER-BACKUP\n';
export const BACKUP_ITERATIONS = 310000;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export const MIN_CODE_LENGTH = 8;
export const BACKUP_NAME_RE = /^backup-\d{8}-\d{4}(-\d{1,3})?\.json\.enc$/;
export const FOLDER_GAP_MS = 5000;
export const REMIND_EVERY_MS = 7 * 86400000;

const enc = new TextEncoder();
const dec = new TextDecoder();
const fail = (code, message) => Object.assign(new Error(message), { code });

const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

/* Message d'erreur si le code de secours ne convient pas, '' sinon */
export function checkCode(code) {
  return String(code || '').length >= MIN_CODE_LENGTH ? '' : __('Le code de secours doit avoir au moins {n} caractères.', { n: MIN_CODE_LENGTH });
}

export async function deriveKey(code, salt, iterations = BACKUP_ITERATIONS, subtle = globalThis.crypto.subtle) {
  const base = await subtle.importKey('raw', enc.encode(String(code).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function pipe(bytes, Stream, kind) {
  if (typeof Stream !== 'function') return bytes;
  const out = new Blob([bytes]).stream().pipeThrough(new Stream(kind));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/* Projet → fichier chiffré (Uint8Array). opts : iterations, at (Date), maxBytes, raw (contenu tel quel, pour les tests) */
export async function encryptBackup(site, code, { iterations = BACKUP_ITERATIONS, at = new Date(), maxBytes = MAX_BACKUP_BYTES, raw = false } = {}) {
  const bad = checkCode(code);
  if (bad) throw fail('bad_code', bad);
  const c = globalThis.crypto;
  const plain = enc.encode(JSON.stringify(raw ? site : { atelier: 'backup', v: 1, at: at.toISOString(), site }));
  const zipped = await pipe(plain, globalThis.CompressionStream, 'gzip');
  const z = zipped !== plain ? 'gzip' : '';
  const salt = c.getRandomValues(new Uint8Array(16));
  const iv = c.getRandomValues(new Uint8Array(12));
  const header = { v: 1, alg: 'AES-GCM-256', kdf: 'PBKDF2-SHA-256', iter: iterations, salt: toB64(salt), iv: toB64(iv), z, at: at.toISOString() };
  const head = enc.encode(BACKUP_MAGIC + JSON.stringify(header) + '\n');
  if (head.length + zipped.length + 16 > maxBytes) throw fail('too_big', __('Copie de secours trop volumineuse (100 Mo au plus) : retirez des images inutilisées ou exportez le projet en .json.'));
  const key = await deriveKey(code, salt, iterations);
  const data = new Uint8Array(await c.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: head }, key, zipped));
  const out = new Uint8Array(head.length + data.length);
  out.set(head);
  out.set(data, head.length);
  return out;
}

/* En-tête et données d'un fichier de copie ; erreur bad_format si ce n'en est pas un */
export function parseBackup(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const notOurs = () => fail('bad_format', __('Ce fichier n’est pas une copie de secours d’Atelier (ou il est abîmé).'));
  if (dec.decode(b.subarray(0, BACKUP_MAGIC.length)) !== BACKUP_MAGIC) throw notOurs();
  const end = b.indexOf(10, BACKUP_MAGIC.length);
  if (end < 0) throw notOurs();
  let header;
  try { header = JSON.parse(dec.decode(b.subarray(BACKUP_MAGIC.length, end))); } catch { throw notOurs(); }
  if (header?.v !== 1 || header.alg !== 'AES-GCM-256' || header.kdf !== 'PBKDF2-SHA-256' || !(header.iter >= 1000) || !header.salt || !header.iv) throw notOurs();
  return { header, head: b.subarray(0, end + 1), data: b.subarray(end + 1) };
}

/* Fichier chiffré → { at, site } ; erreurs : bad_format, bad_code (mauvais code ou fichier modifié), bad_content */
export async function decryptBackup(bytes, code) {
  const { header, head, data } = parseBackup(bytes);
  let plain;
  try {
    const key = await deriveKey(code, fromB64(header.salt), header.iter);
    plain = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(header.iv), additionalData: head }, key, data));
  } catch { throw fail('bad_code', __('Code de secours incorrect (ou copie modifiée) : rien n’a été chargé.')); }
  let doc;
  try { doc = JSON.parse(dec.decode(header.z === 'gzip' ? await pipe(plain, globalThis.DecompressionStream, 'gzip') : plain)); } catch { doc = null; }
  if (doc?.atelier !== 'backup' || !Array.isArray(doc.site?.pages)) throw fail('bad_content', __('La copie déchiffrée ne contient pas de projet Atelier.'));
  return { at: doc.at || header.at, site: doc.site };
}

/* ---------- Dossier local ---------- */
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const pad = n => String(n).padStart(2, '0');
export const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* Fichiers à écrire : l'export autonome, et la version du jour si elle n'est pas encore écrite */
export function folderFiles({ name, now = new Date(), lastDaily = '' }) {
  const day = localDay(now);
  return { main: `${slug(name) || 'site'}.atelier.json`, daily: lastDaily === day ? null : `versions/${day}.json`, day };
}

/* Attente (ms) avant la prochaine écriture dans le dossier : une toutes les 5 s au plus */
export const folderWriteDue = (lastAt, now) => (lastAt ? Math.max(0, lastAt + FOLDER_GAP_MS - now) : 0);

/* Rappel « exporte une copie » (navigateurs sans dossier local) : une fois par semaine au plus, si le dernier export a plus d'une semaine */
export function exportReminderDue({ lastExport = 0, lastRemind = 0, now = Date.now() }) {
  return now - (Number(lastExport) || 0) >= REMIND_EVERY_MS && now - (Number(lastRemind) || 0) >= REMIND_EVERY_MS;
}

/* « il y a 2 min » */
export function ago(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return __('à l’instant');
  if (m < 60) return __('il y a {n} min', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return __('il y a {n} h', { n: h });
  return __('il y a {n} j', { n: Math.floor(h / 24) });
}
