/* Recherche tolérante pour la barre de commandes et la recherche dans les réglages (sans DOM). */
import { STYLE_PROPS } from './style.js';
import { __ } from './ui-i18n.js';

export function normalizeText(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const isBoundary = (text, i) => i === 0 || /[\s:·\-–—/(,.'’«»]/.test(text[i - 1]);

function tokenScore(tok, text) {
  let best = 0;
  for (let i = text.indexOf(tok); i !== -1; i = text.indexOf(tok, i + 1)) {
    const s = 10 + (i === 0 ? 6 : isBoundary(text, i) ? 4 : 0) + (tok.length / text.length) * 2;
    if (s > best) best = s;
  }
  if (best) return best;
  let j = 0;
  for (const ch of text) if (ch === tok[j]) j++;
  return j === tok.length ? 2 : 0;
}

/* 0 = ne correspond pas ; plus c'est haut, mieux c'est */
export function fuzzyScore(query, text) {
  const q = normalizeText(query);
  if (!q) return 1;
  const t = normalizeText(text);
  let total = 0;
  for (const tok of q.split(' ')) {
    const s = tokenScore(tok, t);
    if (!s) return 0;
    total += s;
  }
  return total;
}

/* cmds : [{ id, label, keywords? }] ; recent : ids des dernières commandes lancées */
export function rankCommands(cmds, query, { recent = [], limit = 40 } = {}) {
  const scored = [];
  cmds.forEach((c, i) => {
    let s = Math.max(fuzzyScore(query, c.label), c.keywords ? fuzzyScore(query, c.keywords) * 0.8 : 0);
    if (!s) return;
    s *= c.weight ?? 1;
    const r = recent.indexOf(c.id);
    if (r !== -1) s += (normalizeText(query) ? 3 : 100) + (recent.length - r) * 0.01;
    scored.push({ c, s, i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.slice(0, limit).map(x => x.c);
}

/* Réglages de style correspondant à une recherche (libellé ou groupe) */
export function filterStyleKeys(query) {
  const q = normalizeText(query);
  const keys = Object.keys(STYLE_PROPS);
  if (!q) return keys;
  return keys.filter(k => {
    const { label, group } = STYLE_PROPS[k];
    /* Libellés français et traduits : la recherche marche dans les trois langues */
    const text = normalizeText(`${label} ${group} ${__(label)} ${__(group)}`);
    return q.split(' ').every(tok => text.includes(tok));
  });
}
