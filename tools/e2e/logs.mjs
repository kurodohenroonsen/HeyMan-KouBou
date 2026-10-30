/*
 * Aides des tests de bout en bout pour le journal (cycle 16) :
 *   const s = await mark(t.page);                 // repère avant un cas d'usage
 *   … actions …
 *   const es = await since(t.page, s);            // événements du journal depuis le repère
 *   expectCodes(t, es, ['publish.php.start', 'publish.php.ok'], 'publier');
 *   await capture('publier-ovh-normal', es);      // extrait réel pour docs/guide/journaux/
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatEntry } from '../../core/log.js';

const OUT = new URL('../../docs/guide/journaux/', import.meta.url).pathname;

export async function mark(page) {
  return page.evaluate(() => window.atelierDebug.log.stats().seq);
}

export async function since(page, seq, { level = 'debug' } = {}) {
  return page.evaluate(([s, l]) => window.atelierDebug.entries({ since: s, level: l }), [seq, level]);
}

/* Attend qu'un code apparaisse (les journaux de réponses serveur arrivent un peu après) */
export async function waitCode(page, code, seq = 0, timeout = 8000) {
  await page.waitForFunction(([c, s]) => window.atelierDebug.entries({ since: s }).some(e => e.code === c), [code, seq], { timeout });
}

export const codes = es => es.map(e => e.code);

export function expectCodes(t, es, list, label = '') {
  const have = new Set(codes(es));
  for (const c of list) t.ok(have.has(c), `journal${label ? ` (${label})` : ''} : ${c}`);
}

export function expectNoErrors(t, es, label = '', allow = []) {
  const errs = es.filter(e => e.level === 'error' && !allow.includes(e.code));
  t.ok(!errs.length, `journal${label ? ` (${label})` : ''} : aucune erreur inattendue${errs.length ? ` — ${errs.map(e => `${e.code} ${e.msg}`).slice(0, 3).join(' | ')}` : ''}`);
}

/* Écrit l'extrait (sans les clics ni les survols, sauf demande) dans docs/guide/journaux/<nom>.log */
export function capture(name, es, { ui = false, drop = [] } = {}) {
  mkdirSync(OUT, { recursive: true });
  const keep = es.filter(e => (ui || !/^ui\.(click|change|key|menu)$/.test(e.code)) && e.level !== 'trace' && !drop.includes(e.code));
  const text = keep.map(e => formatEntry(e)).join('\n') + '\n';
  writeFileSync(join(OUT, `${name}.log`), text);
  return text;
}
