/* Génère docs/guide/index-codes.md : tous les codes du journal (source), leur niveau, le chapitre qui les explique.
   node tools/guide-index.mjs */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { codesIn, sourceFiles } from './log-codes.mjs';

const root = new URL('..', import.meta.url).pathname;
const guideDir = join(root, 'docs', 'guide');
const chapters = readdirSync(guideDir).filter(f => /^\d\d-.*\.md$/.test(f)).sort().map(f => ({ f, title: readFileSync(join(guideDir, f), 'utf8').split('\n')[0].replace(/^#\s*/, ''), text: readFileSync(join(guideDir, f), 'utf8') }));
const esc = c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LV = { trace: 'TRACE', debug: 'DEBUG', info: 'INFO', warn: 'WARN', error: 'ERROR' };
function levels(src) {
  const out = new Map();
  const put = (c, l) => { if (!out.has(c)) out.set(c, new Set()); out.get(c).add(l); };
  for (const m of src.matchAll(/\blog\.(trace|debug|info|warn|error)\(\s*'([a-z0-9.-]+)'/g)) put(m[2], LV[m[1]]);
  for (const m of src.matchAll(/\blog\.add\(\s*([^,]+),\s*'([a-z0-9.-]+)'/g)) { const lits = [...m[1].matchAll(/'(trace|debug|info|warn|error)'/g)].map(x => LV[x[1]]); (lits.length ? lits : ['variable']).forEach(l => put(m[2], l)); }
  for (const m of src.matchAll(/\balog\(\s*([^,]+),\s*'([a-z0-9.-]+)'/g)) { const lits = [...m[1].matchAll(/'(debug|info|warn|error)'/g)].map(x => LV[x[1]]); (lits.length ? lits : ['selon le statut']).forEach(l => put(m[2], l)); }
  for (const m of src.matchAll(/'(site\.[a-z0-9.-]+)'/g)) put(m[1], /fail/.test(m[1]) ? 'WARN' : 'INFO');
  const flows = new Map();
  for (const m of src.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*log\.flow\(\s*'([a-z0-9.-]+)'/g)) { (flows.get(m[1]) || flows.set(m[1], new Set()).get(m[1])).add(m[2]); }
  for (const m of src.matchAll(/\blog\.flow\(\s*'([a-z0-9.-]+)'/g)) { put(`${m[1]}.start`, 'INFO'); put(`${m[1]}.ok`, 'INFO'); put(`${m[1]}.fail`, 'ERROR'); }
  for (const [v, bases] of flows) {
    for (const m of src.matchAll(new RegExp(`\\b${v}\\.(step|warn|info)\\(\\s*'([a-z0-9-]+)'([^\\n]*)`, 'g'))) {
      const lv = m[1] === 'warn' ? 'WARN' : m[1] === 'info' ? 'INFO' : (/,\s*'(trace|debug|info|warn|error)'\s*\)/.exec(m[3])?.[1] || 'debug').toUpperCase();
      for (const b of bases) put(`${b}.${m[2]}`, lv);
    }
    if (new RegExp(`\\b${v}\\.cancel\\(`).test(src)) for (const b of bases) put(`${b}.cancel`, 'INFO');
  }
  return out;
}

const all = new Map();
const add = (code, lv, file) => {
  if (!all.has(code)) all.set(code, { levels: new Set(), files: new Set() });
  const e = all.get(code);
  lv?.forEach(l => e.levels.add(l));
  e.files.add(file);
};
for (const f of sourceFiles(root)) {
  const src = readFileSync(join(root, f), 'utf8');
  const lv = levels(src);
  const { codes, alternatives } = codesIn(src);
  for (const c of codes) add(c, lv.get(c), f);
  for (const alts of alternatives) for (const c of alts) if (chapters.some(ch => new RegExp(`${esc(c)}(?![a-z0-9-])`).test(ch.text))) add(c, lv.get(c), f);
}
for (const c of ['boot.error', 'boot.resource', 'boot.rejection', 'boot.timeout']) add(c, new Set(['ERROR']), 'editor/boot.js');

const where = c => chapters.filter(ch => new RegExp(`\`${esc(c)}\``).test(ch.text) || new RegExp(`${esc(c)}(?![a-z0-9.-])`).test(ch.text)).map(ch => `[${ch.f.slice(0, 2).replace(/^0/, '')}](${ch.f})`);
const byDomain = new Map();
for (const c of [...all.keys()].sort()) {
  const d = c.split('.')[0];
  if (!byDomain.has(d)) byDomain.set(d, []);
  byDomain.get(d).push(c);
}
const out = ['# Index des codes du journal', '', 'Tous les codes que l’éditeur, publish.php et le site publié peuvent écrire, par domaine. Fichier généré par `node tools/guide-index.mjs` à partir du code source : il est toujours à jour avec le code.', '',
  `**${all.size} codes** dans ${byDomain.size} domaines.`, '', '| Domaine | Codes |', '|---|---|', ...[...byDomain].map(([d, cs]) => `| [\`${d}\`](#${d}) | ${cs.length} |`), ''];
for (const [d, cs] of byDomain) {
  out.push(`## ${d}`, '', '| Code | Niveau | Chapitre | Source |', '|---|---|---|---|');
  for (const c of cs) {
    const e = all.get(c);
    out.push(`| \`${c}\` | ${[...e.levels].sort().join(', ') || '—'} | ${where(c).join(' ') || '—'} | ${[...e.files].map(f => `\`${f}\``).join(', ')} |`);
  }
  out.push('');
}
writeFileSync(join(guideDir, 'index-codes.md'), out.join('\n'));
console.log(`index-codes.md : ${all.size} codes, ${byDomain.size} domaines`);
