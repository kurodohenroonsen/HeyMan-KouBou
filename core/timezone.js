/*
 * Fuseau horaire du site (cycle 28, W5) : identifiant IANA (« Europe/Brussels », « Asia/Tokyo »…), décalage d'une heure
 * locale calculé avec Intl.DateTimeFormat (heure d'été comprise), définitions VTIMEZONE des fuseaux courants pour
 * l'iCal et dates ISO avec décalage pour le JSON-LD. Logique pure, sans DOM.
 */
import { __ } from './ui-i18n.js';

export const DEFAULT_TZ = 'Europe/Brussels';
/* Liste courte proposée dans l'onglet Site (saisie libre possible) */
export const TIMEZONES = ['Europe/Brussels', 'Europe/Paris', 'Europe/Luxembourg', 'Europe/Amsterdam', 'Europe/Berlin', 'Europe/London', 'Asia/Tokyo', 'UTC'];

export const defaultTimezone = lang => (lang === 'ja' ? 'Asia/Tokyo' : DEFAULT_TZ);

const formats = new Map();
function formatter(tz) {
  if (!formats.has(tz)) {
    formats.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }
  return formats.get(tz);
}

export function validTimezone(tz) {
  if (typeof tz !== 'string' || !/^(UTC|[A-Za-z]+(\/[A-Za-z0-9_+-]+){1,2})$/.test(tz)) return false;
  try { formatter(tz); return true; } catch { return false; }
}

/* Fuseau effectif : le réglage du site, sinon celui de sa langue principale (projets antérieurs au cycle 28) */
export const siteTimezone = site => (validTimezone(site?.timezone) ? site.timezone : defaultTimezone(site?.defaultLanguage));

export function setSiteTimezone(site, tz) {
  const v = String(tz ?? '').trim();
  if (!validTimezone(v)) throw new Error(__('Fuseau horaire inconnu : {tz} (exemple : Europe/Brussels).', { tz: v.slice(0, 40) }));
  return { ...structuredClone(site), timezone: v };
}

/* Décalage (minutes) du fuseau à un instant UTC donné */
function offsetAt(tz, ms) {
  const p = Object.fromEntries(formatter(tz).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 60000);
}

/* Heure locale (AAAA-MM-JJ, HH:MM) du fuseau → instant UTC et décalage en minutes */
function toUtc(tz, date, time = '00:00') {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const guess = offsetAt(tz, wall);
  const off = offsetAt(tz, wall - guess * 60000);
  return { ms: wall - off * 60000, off };
}

const pad = n => String(n).padStart(2, '0');
const fmtOffset = min => `${min < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(min) / 60))}:${pad(Math.abs(min) % 60)}`;

/* « +09:00 », « +01:00 », « -05:00 » */
export const tzOffset = (tz, date, time) => fmtOffset(toUtc(tz, date, time).off);

/* Date ISO avec décalage pour le JSON-LD : 2026-11-03T19:00:00+09:00 */
export const isoWithOffset = (tz, date, time) => `${date}T${time}:00${tzOffset(tz, date, time)}`;

/* Instant UTC au format iCal : 20261104T000000Z */
export const icsUtc = (tz, date, time) => new Date(toUtc(tz, date, time).ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/* ---------- VTIMEZONE (RFC 5545) des fuseaux courants ---------- */
const rule = (kind, from, to, name, start, rrule) => [`BEGIN:${kind}`, `TZOFFSETFROM:${from}`, `TZOFFSETTO:${to}`, `TZNAME:${name}`, `DTSTART:${start}`, ...(rrule ? [`RRULE:${rrule}`] : []), `END:${kind}`];
const EU_MARCH = 'FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU';
const EU_OCTOBER = 'FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU';
const CET = [...rule('DAYLIGHT', '+0100', '+0200', 'CEST', '19700329T020000', EU_MARCH), ...rule('STANDARD', '+0200', '+0100', 'CET', '19701025T030000', EU_OCTOBER)];
const ZONES = {
  'Europe/Brussels': CET, 'Europe/Paris': CET, 'Europe/Luxembourg': CET, 'Europe/Amsterdam': CET, 'Europe/Berlin': CET,
  'Europe/London': [...rule('DAYLIGHT', '+0000', '+0100', 'BST', '19700329T010000', EU_MARCH), ...rule('STANDARD', '+0100', '+0000', 'GMT', '19701025T020000', EU_OCTOBER)],
  'Asia/Tokyo': rule('STANDARD', '+0900', '+0900', 'JST', '19700101T000000'),
  UTC: rule('STANDARD', '+0000', '+0000', 'UTC', '19700101T000000')
};

/* Lignes VTIMEZONE du fuseau, ou null (l'iCal écrit alors les heures en UTC) */
export const vtimezone = tz => (ZONES[tz] ? ['BEGIN:VTIMEZONE', `TZID:${tz}`, ...ZONES[tz], 'END:VTIMEZONE'] : null);
