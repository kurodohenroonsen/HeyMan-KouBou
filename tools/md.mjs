/*
 * Markdown → HTML pour le guide (cycle 24), sans dépendance. Ce que le guide utilise : titres, paragraphes,
 * listes (imbriquées), tableaux, citations, séparateurs, blocs de code, gras, italique, code, liens.
 * Le HTML brut du Markdown est échappé (jamais interprété).
 * Parties techniques : blocs ```log → <details class="tech"> ; colonnes « Journal / Log / ログ » → class="tech-col" ;
 * section « Codes de ce chapitre » → <section class="tech-section">.
 */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Ancres compatibles GitHub (lettres de toutes les langues gardées, ponctuation retirée, doublons numérotés) */
export function slugger() {
  const seen = new Map();
  return text => {
    const base = String(text).replace(/[`*_~]/g, '').toLowerCase().trim()
      .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

const TECH_COLS = /^(journal|log|logs|ログ|ジャーナル|code|codes|コード|niveau|level|レベル)$/i;
const TECH_SECTIONS = /^(codes de ce chapitre|codes in this chapter|この章のコード)$/i;
/* Paragraphes qui ne parlent que du journal (« Journal attendu », « À vérifier »…) : techniques aussi */
const TECH_PARA = /^\s*\*\*(journal attendu|journal|à vérifier|domaines? du journal|expected log|log|what to look for|what to check|log domains?|想定されるログ|ログ|確認ポイント|ログのドメイン)\*\*/i;

function linkHref(href) {
  const h = href.trim();
  if (/^(javascript|data|vbscript):/i.test(h)) return '#';
  if (/^[a-z]+:/i.test(h) || h.startsWith('#')) return h;
  /* chapitre du guide : .md → .html (ancre gardée) ; README → index */
  return h.replace(/(^|\/)README\.md(#|$)/, '$1index.html$2').replace(/\.md(#|$)/, '.html$1');
}

export function inline(src) {
  const codes = [];
  let s = String(src).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => `<img src="${esc(linkHref(src.replace(/&amp;/g, '&')))}" alt="${alt}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => `<a href="${esc(linkHref(href.replace(/&amp;/g, '&')))}">${text}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?!\w)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(codes[Number(i)])}</code>`);
}

const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));

export function mdToHtml(md, { techLabel = 'Détails techniques', slug = slugger() } = {}) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let i = 0;
  let inTech = false;
  const closeTech = () => { if (inTech) { out.push('</section>'); inTech = false; } };

  const listBlock = (start) => {
    /* liste (avec sous-listes indentées) */
    const items = [];
    const indent0 = lines[start].match(/^\s*/)[0].length;
    const ordered = /^\s*\d+[.)]\s/.test(lines[start]);
    let j = start;
    while (j < lines.length) {
      const l = lines[j];
      const m = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (m && m[1].length === indent0) { items.push({ text: [m[3]], sub: [] }); j++; continue; }
      if (!l.trim()) { if (j + 1 < lines.length && /^\s+([-*+]|\d+[.)])\s/.test(lines[j + 1]) && lines[j + 1].match(/^\s*/)[0].length > indent0) { j++; continue; } break; }
      const ind = l.match(/^\s*/)[0].length;
      if (ind > indent0 && items.length) {
        if (/^\s*([-*+]|\d+[.)])\s/.test(l)) {
          const r = listBlock(j);
          items[items.length - 1].sub.push(r.html);
          j = r.end;
        } else if (/^\s*```/.test(l)) {
          const fence = [];
          j++;
          while (j < lines.length && !/^\s*```/.test(lines[j])) fence.push(lines[j++].replace(new RegExp(`^\\s{0,${ind}}`), ''));
          j++;
          items[items.length - 1].sub.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`);
        } else { items[items.length - 1].text.push(l.trim()); j++; }
        continue;
      }
      if (m && m[1].length < indent0) break;
      if (!m && ind <= indent0) break;
      j++;
    }
    const tag = ordered ? 'ol' : 'ul';
    return { html: `<${tag}>${items.map(it => `<li>${inline(it.text.join(' '))}${it.sub.join('')}</li>`).join('')}</${tag}>`, end: j };
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = line.match(/^```\s*([\w-]*)/);
    if (fence) {
      const lang = fence[1];
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      const code = esc(body.join('\n'));
      out.push(lang === 'log' ? `<details class="tech"><summary>${esc(techLabel)}</summary><pre class="log"><code>${code}</code></pre></details>` : `<pre${lang ? ` class="lang-${lang}"` : ''}><code>${code}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level <= 2) closeTech();
      const id = slug(text);
      headings.push({ level, text: text.replace(/[`*]/g, ''), id });
      const tag = `<h${level} id="${esc(id)}">${inline(text)}</h${level}>`;
      if (level === 2 && TECH_SECTIONS.test(text.replace(/[`*]/g, '').trim())) { out.push(`<section class="tech-section">${tag}`); inTech = true; } else out.push(tag);
      i++;
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\|/.test(line.trim()) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = cells(line);
      const tech = head.map(c => TECH_COLS.test(c.replace(/[`*]/g, '').trim()));
      const cls = k => (tech[k] ? ' class="tech-col"' : '');
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push(`<table><thead><tr>${head.map((c, k) => `<th${cls(k)}>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, k) => `<td${cls(k)}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${mdToHtml(body.join('\n'), { techLabel, slug }).html}</blockquote>`);
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const r = listBlock(i);
      out.push(r.html);
      i = r.end;
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s|\s*(---|\*\*\*)\s*$)/.test(lines[i]) && !(/^\|/.test(lines[i].trim()) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || ''))) para.push(lines[i++].trim());
    if (para.length) out.push(`<p${TECH_PARA.test(para[0]) ? ' class="tech-p"' : ''}>${inline(para.join(' '))}</p>`);
    else i++;
  }
  closeTech();
  return { html: out.join(''), headings };
}
