/*
 * Assainissement de tous les textes d'un projet à l'entrée (cycle 25, S1) : import d'un .json, projet reçu d'un hôte,
 * opérations reçues d'un pair, normalizeSite. Chaque texte est nettoyé selon le type de son champ (fieldsOf) :
 * richtext → sanitizeRich, inline → sanitizeInline, texte simple → balises puis chevrons retirés.
 * Copie sur écriture : seules les branches modifiées sont recopiées ; un projet déjà propre est renvoyé tel quel.
 * Jamais touché : les commentaires (signés), les images, les styles, les réglages (vérifiés ailleurs).
 */
import { fieldsOf } from './widgets.js';
import { sanitizeRich, sanitizeInline } from './sanitize.js';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const kindOf = type => (type === 'richtext' ? 'richtext' : type === 'inline' ? 'inline' : 'text');

/* Texte simple : sans balise ni chevron (comme les valeurs de collections) */
export const plainText = v => String(v).replace(/<[^>]*>/g, '').replace(/[<>]/g, '');

function cleanString(v, kind) {
  if (kind === 'richtext') return sanitizeRich(v);
  if (kind === 'inline') return sanitizeInline(v);
  return plainText(v);
}

/* Passe qui compte les textes modifiés ; chaque fonction renvoie la même valeur si rien n'a changé */
function pass() {
  const ctx = { changed: 0 };
  const str = (v, kind) => {
    if (typeof v !== 'string') return v;
    const c = cleanString(v, kind);
    if (c !== v) ctx.changed++;
    return c;
  };
  /* Valeur traduite { fr: '…', nl: '…' } ou chaîne nue */
  const text = (v, kind) => {
    if (typeof v === 'string') return str(v, kind);
    return isObj(v) ? obj(v, x => str(x, kind)) : v;
  };
  /* Recopie un objet seulement si une de ses valeurs change */
  const obj = (o, fn) => {
    let out = o;
    for (const [k, v] of Object.entries(o)) {
      const nv = fn(v, k);
      if (nv !== v) { if (out === o) out = { ...o }; out[k] = nv; }
    }
    return out;
  };
  const arr = (a, fn) => {
    if (!Array.isArray(a)) return a;
    let out = a;
    a.forEach((v, i) => { const nv = fn(v, i); if (nv !== v) { if (out === a) out = [...a]; out[i] = nv; } });
    return out;
  };
  const propsOf = (type, props) => {
    if (!isObj(props)) return props;
    let out = props;
    for (const f of fieldsOf(type)) {
      const v = props[f.key];
      if (v === undefined) continue;
      let nv = v;
      if (f.type === 'list') nv = arr(v, item => (isObj(item) ? obj(item, (x, k) => { const sf = f.fields?.find(s => s.key === k); return sf && ['text', 'inline', 'richtext'].includes(sf.type) ? text(x, kindOf(sf.type)) : x; }) : item));
      else if (['text', 'inline', 'richtext'].includes(f.type)) nv = text(v, kindOf(f.type));
      if (nv !== v) { if (out === props) out = { ...props }; out[f.key] = nv; }
    }
    return out;
  };
  const node = n => {
    if (!isObj(n)) return n;
    return obj(n, (v, k) => {
      if (k === 'props') return propsOf(n.type, v);
      if (k === 'children') return arr(v, node);
      if (k === 'advanced' && isObj(v) && v.ariaLabel) return obj(v, (x, kk) => (kk === 'ariaLabel' ? text(x, 'text') : x));
      return v;
    });
  };
  const page = p => (isObj(p) ? obj(p, (v, k) => {
    if (k === 'title') return text(v, 'text');
    if (k === 'root') return node(v);
    if (k === 'seo' && isObj(v)) return obj(v, (x, kk) => (kk === 'title' || kk === 'description' ? text(x, 'text') : x));
    return v;
  }) : p);
  const menuItem = it => (isObj(it) ? obj(it, (v, k) => (k === 'label' ? text(v, 'text') : k === 'children' ? arr(v, menuItem) : v)) : it);
  const component = c => (isObj(c) ? obj(c, (v, k) => (k === 'name' ? text(v, 'text') : k === 'node' ? node(v) : v)) : c);
  const option = o => (isObj(o) ? obj(o, (v, k) => (k === 'label' ? text(v, 'text') : v)) : o);
  const field = f => (isObj(f) ? obj(f, (v, k) => (k === 'label' ? text(v, 'text') : k === 'options' ? arr(v, option) : v)) : f);
  const itemValues = (fields, values) => (isObj(values) ? obj(values, (v, k) => {
    const f = Array.isArray(fields) ? fields.find(x => x.key === k) : null;
    return f && (f.type === 'text' || f.type === 'richtext') ? text(v, kindOf(f.type)) : v;
  }) : values);
  const collection = c => (isObj(c) ? obj(c, (v, k) => {
    if (k === 'name') return text(v, 'text');
    if (k === 'fields') return arr(v, field);
    if (k === 'items') return arr(v, it => (isObj(it) ? obj(it, (x, kk) => (kk === 'values' ? itemValues(c.fields, x) : x)) : it));
    if (k === 'card' || k === 'detail') return node(v);
    return v;
  }) : c);
  const site = s => obj(s, (v, k) => {
    if (k === 'name') return text(v, 'text');
    if (k === 'pages') return arr(v, page);
    if (k === 'components' && isObj(v)) return obj(v, component);
    if (k === 'layout' && isObj(v)) return obj(v, node);
    if (k === 'collections' && isObj(v)) return obj(v, collection);
    if (k === 'footer' && isObj(v)) return obj(v, (x, kk) => (kk === 'text' ? text(x, 'inline') : x));
    if (k === 'menu') return arr(v, menuItem);
    return v;
  });
  return { ctx, site };
}

/* Copie assainie du projet (le même objet si rien ne change) et nombre de textes modifiés */
export function sanitizeSiteTexts(site) {
  if (!isObj(site)) return { site, changed: 0 };
  const p = pass();
  const clean = p.site(site);
  return { site: clean, changed: p.ctx.changed };
}
