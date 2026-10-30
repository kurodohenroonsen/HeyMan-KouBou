/* Échappement HTML et filtrage des URL : tout texte saisi passe par ici avant d'atteindre une page. */

const HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"]/g, c => HTML[c]);
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  const compact = url.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/);
  if (!scheme) return url;
  return ALLOWED_SCHEMES.includes(scheme[1] + ':') ? url : '#';
}
