/*
 * Vignettes des modèles de sites (cycle 28) : petits SVG dessinés à la main (160 × 100), aux couleurs de chaque modèle,
 * sans texte, sans lien ni script. L'éditeur les affiche comme image (data:image/svg+xml), jamais par innerHTML.
 */
const frame = (body, bg = '#ffffff') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" width="160" height="100">`
  + `<rect width="160" height="100" rx="6" fill="${bg}"/>${body}</svg>`;
/* Barre d'en-tête : pastille de logo et trois traits de menu */
const header = c => `<rect x="8" y="7" width="14" height="6" rx="2" fill="${c}"/>`
  + [96, 116, 136].map(x => `<rect x="${x}" y="9" width="14" height="2.5" rx="1" fill="#94a3b8"/>`).join('');
const lines = (x, y, n, w, c = '#cbd5e1') => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 5}" width="${w - i * 6}" height="2.5" rx="1" fill="${c}"/>`).join('');
const card = (x, y, c) => `<rect x="${x}" y="${y}" width="44" height="30" rx="3" fill="#ffffff" stroke="#e2e8f0"/>`
  + `<rect x="${x + 3}" y="${y + 3}" width="38" height="12" rx="2" fill="${c}" opacity=".25"/>${lines(x + 3, y + 19, 2, 30)}`;

export const THUMBS = {
  /* Association ou média : bandeau bleu, bulles de dialogue, trois cartes */
  association: frame(header('#1d4ed8')
    + '<rect x="0" y="20" width="160" height="34" fill="#1d4ed8"/>'
    + '<rect x="14" y="27" width="48" height="16" rx="5" fill="#ffffff"/><path d="M22 43 l4 6 l3-6z" fill="#ffffff"/>'
    + '<rect x="70" y="31" width="40" height="13" rx="5" fill="#fbbf24"/><path d="M100 44 l3 5 l2-5z" fill="#fbbf24"/>'
    + lines(120, 30, 3, 30, '#bfdbfe') + card(8, 62, '#1d4ed8') + card(58, 62, '#1d4ed8') + card(108, 62, '#1d4ed8'), '#f8fafc'),
  /* Tourisme ou commune : montagnes, soleil, rivière */
  tourism: frame(header('#166534')
    + '<rect x="0" y="20" width="160" height="44" fill="#dcfce7"/><circle cx="128" cy="32" r="7" fill="#eab308"/>'
    + '<path d="M0 64 L34 32 L58 52 L86 26 L124 64Z" fill="#166534"/><path d="M70 64 L104 40 L160 64Z" fill="#15803d"/>'
    + '<path d="M0 60 C40 56 60 66 100 60 S150 58 160 62 L160 64 L0 64Z" fill="#60a5fa"/>'
    + card(8, 68, '#166534') + card(58, 68, '#eab308') + card(108, 68, '#166534'), '#fafaf5'),
  /* Commerce ou artisan local : vitrine avec store rayé et porte */
  shop: frame(header('#9a3412')
    + Array.from({ length: 8 }, (_, i) => `<rect x="${24 + i * 14}" y="22" width="14" height="10" fill="${i % 2 ? '#ffffff' : '#9a3412'}"/>`).join('')
    + '<path d="M24 32 h112 l-4 5 h-104z" fill="#7c2d12"/><rect x="28" y="37" width="104" height="32" fill="#fff7ed" stroke="#fdba74"/>'
    + '<rect x="34" y="42" width="50" height="22" rx="2" fill="#fcd34d" opacity=".55"/><rect x="96" y="42" width="28" height="27" rx="2" fill="#9a3412"/>'
    + '<circle cx="119" cy="56" r="1.6" fill="#fcd34d"/>' + lines(28, 78, 3, 104, '#d6d3d1'), '#fffbf5'),
  /* Association de commerçants : une rue de petites boutiques et une épingle de carte */
  merchants: frame(header('#be123c')
    + [[8, '#be123c'], [46, '#f59e0b'], [84, '#0f766e'], [122, '#1d4ed8']].map(([x, c]) => `<rect x="${x}" y="30" width="30" height="30" rx="2" fill="#ffffff" stroke="#e5e7eb"/>`
      + `<path d="M${x} 30 h30 l-3 -6 h-24z" fill="${c}"/><rect x="${x + 11}" y="44" width="8" height="16" fill="${c}" opacity=".7"/>`).join('')
    + '<path d="M80 66 c-6 0 -9 4 -9 8 c0 6 9 14 9 14 s9-8 9-14 c0-4 -3-8 -9-8z" fill="#be123c"/><circle cx="80" cy="74" r="3" fill="#ffffff"/>'
    + '<rect x="0" y="60" width="160" height="3" fill="#d1d5db"/>' + lines(8, 70, 3, 56) + lines(100, 70, 3, 52), '#fffaf5'),
  /* Événement ou festival : scène, projecteurs, étoiles et billet */
  event: frame(header('#6d28d9')
    + '<rect x="0" y="20" width="160" height="50" fill="#1e1b4b"/>'
    + '<path d="M30 20 L10 70 L50 70Z" fill="#a78bfa" opacity=".35"/><path d="M130 20 L110 70 L150 70Z" fill="#fb923c" opacity=".35"/>'
    + '<rect x="40" y="56" width="80" height="14" fill="#6d28d9"/>'
    + [[60, 34], [80, 28], [100, 36]].map(([x, y]) => `<path d="M${x} ${y - 5} l1.6 3.4 l3.7 .5 l-2.7 2.6 l.7 3.7 l-3.3 -1.8 l-3.3 1.8 l.7 -3.7 l-2.7 -2.6 l3.7 -.5z" fill="#fde68a"/>`).join('')
    + '<rect x="56" y="76" width="48" height="18" rx="3" fill="#fb923c"/><circle cx="56" cy="85" r="3" fill="#faf9ff"/><circle cx="104" cy="85" r="3" fill="#faf9ff"/>'
    + lines(64, 82, 2, 30, '#ffffff'), '#faf9ff'),
  /* Site vide : une page en pointillés et un signe plus */
  blank: frame(header('#94a3b8')
    + '<rect x="20" y="24" width="120" height="66" rx="4" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3"/>'
    + '<path d="M80 46 v22 M69 57 h22" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>', '#f8fafc')
};
