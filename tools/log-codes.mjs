/* Repérage des codes du journal dans le source (utilisé par tests/log-catalog.test.js et tools/guide-index.mjs). */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const sourceFiles = root => ['editor', 'core'].flatMap(d => readdirSync(join(root, d)).filter(f => f.endsWith('.js')).map(f => join(d, f))).filter(f => f !== join('core', 'log.js'));

export function codesIn(src) {
  const out = new Set();
  const add = c => out.add(c);
  for (const m of src.matchAll(/\blog\.(?:trace|debug|info|warn|error)\(\s*'([a-z0-9.-]+)'/g)) add(m[1]);
  for (const m of src.matchAll(/\blog\.add\(\s*[^,]+,\s*'([a-z0-9.-]+)'/g)) add(m[1]);
  for (const m of src.matchAll(/\balog\([^,]+,\s*'([a-z0-9.-]+)'/g)) add(m[1]);
  for (const m of src.matchAll(/'(site\.(?!(?:zip|js|css|json|html)')[a-z0-9.-]+)'/g)) add(m[1]);
  /* Parcours : const f = log.flow('base', …) puis f.step('sous', …) */
  const flows = new Map();
  /* const f = log.flow('a', …) ou const f = cond ? log.flow('a', …) : log.flow('b', …) */
  for (const m of src.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*([^;]*?\blog\.flow\([^;]*)/g)) {
    if (!/^\s*(?:[^=;]*\?\s*)?log\.flow\(/.test(m[2])) continue;
    if (!flows.has(m[1])) flows.set(m[1], new Set());
    for (const x of m[2].matchAll(/\blog\.flow\(\s*'([a-z0-9.-]+)'/g)) {
      flows.get(m[1]).add(x[1]);
      for (const end of ['start', 'ok', 'fail']) add(`${x[1]}.${end}`);
    }
  }
  for (const m of src.matchAll(/\blog\.flow\(\s*'([a-z0-9.-]+)'/g)) for (const end of ['start', 'ok', 'fail']) add(`${m[1]}.${end}`);
  const alt = [];
  for (const [v, bases] of flows) {
    for (const m of src.matchAll(new RegExp(`\\b${v}\\.(?:step|warn|info)\\(\\s*'([a-z0-9-]+)'`, 'g'))) alt.push([...bases].map(b => `${b}.${m[1]}`));
    if (new RegExp(`\\b${v}\\.cancel\\(`).test(src)) alt.push([...bases].map(b => `${b}.cancel`));
  }
  return { codes: [...out], alternatives: alt };
}

