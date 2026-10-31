/*
 * .htaccess du site publié (cycle 29), généré d'après l'adresse du site : page 404 par langue, redirection
 * http → https et www / sans www, en-têtes de sécurité (CSP compatible avec les façades vidéo et carte, polices
 * locales), cache long sur les fichiers suffixés d'une empreinte, compression. publish.php reproduit exactement
 * ce gabarit à partir des mêmes options (il n'accepte aucun .htaccess arbitraire) : tests/publish-php.test.js
 * compare les deux. GitHub Pages n'en a pas besoin (publish.server = 'pages').
 */
import { LANG_LABELS } from './site.js';

const HOST = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?)+$/i;
const PATH = /^\/([a-z0-9._-]+\/)*$/i;
const CSP = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://maps.google.com https://www.openstreetmap.org; connect-src 'self'; form-action 'self' https:; base-uri 'self'; object-src 'none'; frame-ancestors 'self'";
const CACHED = 'woff2|webp|jpe?g|png|gif|avif|svg|ico|css|js|pdf|mp3|m4a|ogg|docx|odt|xlsx|pptx|zip';
const DEFLATE = 'text/html text/css application/javascript application/json image/svg+xml text/xml application/xml application/manifest+json text/plain text/calendar';

/* Options du .htaccess déduites du site : hôte et chemin de baseUrl, https, www à ajouter ou retirer, langues */
export function htaccessOptions(site) {
  let host = '';
  let path = '/';
  let https = false;
  try {
    if (site.baseUrl) {
      const u = new URL(site.baseUrl);
      host = u.hostname.toLowerCase();
      https = u.protocol === 'https:';
      path = u.pathname.replace(/\/*$/, '/');
    }
  } catch { host = ''; }
  const www = !host ? '' : host.startsWith('www.') ? 'add' : 'strip';
  return { host, https, www, path, langs: [...(site.languages || [])] };
}

export function validateHtaccessOptions(o) {
  const out = { host: String(o?.host || '').toLowerCase(), https: !!o?.https, www: ['add', 'strip', ''].includes(o?.www) ? o.www : '', path: String(o?.path || '/'), langs: Array.isArray(o?.langs) ? o.langs.filter(l => LANG_LABELS[l]) : [] };
  if (out.host && !HOST.test(out.host)) throw new Error(`Nom d’hôte invalide pour le .htaccess : ${out.host.slice(0, 40)}`);
  if (!PATH.test(out.path)) throw new Error(`Chemin invalide pour le .htaccess : ${out.path.slice(0, 40)}`);
  if (!out.host) { out.https = false; out.www = ''; }
  return out;
}

const esc = s => s.replace(/\./g, '\\.');

export function buildHtaccess(options) {
  const o = validateHtaccessOptions(options);
  const [main, ...others] = o.langs;
  const lines = [
    '# Fichier généré par Atelier (cycle 29) : il est réécrit à chaque publication, modifiez plutôt les réglages du site.',
    'AddDefaultCharset UTF-8',
    'Options -Indexes',
    'DirectoryIndex index.html',
    'AddType font/woff2 .woff2',
    'AddType application/manifest+json .webmanifest',
    'AddType text/calendar .ics',
    `ErrorDocument 404 ${o.path}404.html`
  ];
  for (const l of others) lines.push(`<If "%{REQUEST_URI} =~ m#^${o.path}${l}/#">`, `  ErrorDocument 404 ${o.path}${l}/404.html`, '</If>');
  if (o.host && (o.https || o.www)) {
    lines.push('<IfModule mod_rewrite.c>', 'RewriteEngine On');
    if (o.https) lines.push('RewriteCond %{HTTPS} !=on', 'RewriteCond %{HTTP:X-Forwarded-Proto} !=https', 'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]');
    const scheme = o.https ? 'https' : 'http';
    if (o.www === 'add') lines.push(`RewriteCond %{HTTP_HOST} ^${esc(o.host.slice(4))}$ [NC]`, `RewriteRule ^ ${scheme}://${o.host}%{REQUEST_URI} [L,R=301]`);
    if (o.www === 'strip') lines.push(`RewriteCond %{HTTP_HOST} ^www\\.${esc(o.host)}$ [NC]`, `RewriteRule ^ ${scheme}://${o.host}%{REQUEST_URI} [L,R=301]`);
    lines.push('</IfModule>');
  }
  lines.push('<IfModule mod_headers.c>');
  if (o.https) lines.push('Header always set Strict-Transport-Security "max-age=31536000"');
  lines.push(
    'Header always set X-Content-Type-Options "nosniff"',
    'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"',
    'Header always set X-Frame-Options "SAMEORIGIN"',
    `Header always set Content-Security-Policy "${CSP}${o.https ? '; upgrade-insecure-requests' : ''}"`,
    `<FilesMatch "-[0-9a-f]{8}\\.(${CACHED})$">`,
    '  Header set Cache-Control "public, max-age=31536000, immutable"',
    '</FilesMatch>',
    '<FilesMatch "\\.(html|css|js|xml|txt|webmanifest|ics)$">',
    '  Header set Cache-Control "no-cache"',
    '</FilesMatch>',
    '</IfModule>',
    '<IfModule mod_deflate.c>',
    `AddOutputFilterByType DEFLATE ${DEFLATE}`,
    '</IfModule>'
  );
  if (main) lines.push(`# Langue principale : ${main}`);
  return lines.join('\n') + '\n';
}
