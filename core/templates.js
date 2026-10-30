/*
 * Modèles de sections prêts à l'emploi. Chaque appel construit une section neuve (identifiants uniques).
 * Les couleurs passent par la palette : un modèle prend automatiquement l'identité du site.
 */
import './widgets-extra.js';
import { createNode, createSectionWithColumns } from './tree.js';
import { __, N_ } from './ui-i18n.js';

const fr = v => ({ fr: v });

function w(type, props = {}, style = {}) {
  const n = createNode(type);
  Object.assign(n.props, props);
  for (const [st, values] of Object.entries(style)) Object.assign(n.style[st], values);
  return n;
}

function sec(spans, cols, { style = {}, props = {}, rowStyle = {} } = {}) {
  const s = createSectionWithColumns(spans.length, spans);
  Object.assign(s.props, props);
  for (const [st, v] of Object.entries(style)) Object.assign(s.style[st], v);
  for (const [st, v] of Object.entries(rowStyle)) Object.assign(s.children[0].style[st], v);
  s.children[0].children.forEach((col, i) => { col.children = cols[i] || []; });
  return s;
}

/* Ajoute une rangée supplémentaire sous la première */
function withRow(s, spans, cols) {
  const extra = createSectionWithColumns(spans.length, spans).children[0];
  extra.children.forEach((col, i) => { col.children = cols[i] || []; });
  s.children.push(extra);
  return s;
}

const title = (text, extra = {}) => w('heading', { text: fr(text), level: 'h2' }, { desktop: { textAlign: 'center', ...extra } });
const intro = text => w('text', { content: fr(`<p>${text}</p>`) }, { desktop: { textAlign: 'center', color: 'palette:c5', maxWidth: '62ch', marginLeft: 'auto', marginRight: 'auto' } });

export const TEMPLATES = [
  {
    id: 'hero', label: N_('Héros'), description: N_('Grand titre, texte, deux boutons et une image'),
    build: () => {
      const s = sec([6, 6], [
        [
          w('heading', { text: fr('Petit surtitre'), level: 'p' }, { desktop: { color: 'palette:c1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem' } }),
          w('heading', { text: fr('Un titre fort qui dit ce que vous faites'), level: 'h1' }, { mobile: { fontSize: '2.2rem' } }),
          w('text', { content: fr('<p>Une phrase d’accroche qui explique pour qui, et ce que cela change.</p>') }, { desktop: { fontSize: '1.15rem', color: 'palette:c5' } }),
          w('button', { label: fr('Commencer'), link: '#contact', size: 'lg' }, { hover: { transform: 'lift' } }),
          w('button', { label: fr('En savoir plus'), link: '#', variant: 'link' })
        ],
        [w('image', { ratio: '4/3' })]
      ]);
      s.children[0].style.desktop.alignItems = 'center';
      return s;
    }
  },
  {
    id: 'hero-center', label: N_('Héros centré'), description: N_('Titre centré sur fond sombre'),
    build: () => sec([12], [[
      w('heading', { text: fr('Un titre centré, simple et lisible'), level: 'h1' }, { desktop: { textAlign: 'center', color: 'palette:c6' } }),
      w('text', { content: fr('<p>Un sous-titre court pour préciser la promesse.</p>') }, { desktop: { textAlign: 'center', color: 'palette:c6', opacity: 0.85, fontSize: '1.15rem' } }),
      w('button', { label: fr('Nous contacter'), link: '#contact', size: 'lg', variant: 'secondary' }, { desktop: { alignSelf: 'center' } })
    ]], { style: { desktop: { background: 'palette:c3', paddingTop: '120px', paddingBottom: '120px' } } })
  },
  {
    id: 'features', label: N_('Avantages'), description: N_('Titre et trois encadrés à icône'),
    build: () => withRow(sec([12], [[title('Pourquoi nous rejoindre'), intro('Trois raisons concrètes, en une phrase chacune.')]]), [4, 4, 4], [
      [w('icon-box', { icon: 'camera', title: fr('Du matériel'), text: fr('<p>Caméras, micros et régies partagés.</p>') })],
      [w('icon-box', { icon: 'users', title: fr('Des personnes'), text: fr('<p>Des techniciens disponibles pour tous.</p>') })],
      [w('icon-box', { icon: 'shield', title: fr('L’indépendance'), text: fr('<p>Chaque média garde sa ligne éditoriale.</p>') })]
    ])
  },
  {
    id: 'stats', label: N_('Chiffres clés'), description: N_('Bandeau de chiffres sur fond coloré'),
    build: () => sec([12], [[w('stats', {}, { desktop: { color: 'palette:c6' } })]], { style: { desktop: { background: 'palette:c1' } } })
  },
  {
    id: 'testimonials', label: N_('Témoignages'), description: N_('Trois citations en cartes'),
    build: () => withRow(sec([12], [[title('Ils en parlent')]]), [4, 4, 4], [0, 1, 2].map(() => [w('quote', { variant: 'card' })]))
  },
  {
    id: 'pricing', label: N_('Tarifs'), description: N_('Trois formules, celle du milieu mise en avant'),
    build: () => withRow(sec([12], [[title('Formules d’adhésion'), intro('Une cotisation proportionnelle à la taille de chaque média.')]]), [4, 4, 4], [
      [w('pricing', { title: fr('Petit média'), price: '20 €' })],
      [w('pricing', { title: fr('Média moyen'), price: '49 €', highlight: true, badge: fr('Le plus choisi') })],
      [w('pricing', { title: fr('Grand média'), price: '99 €' })]
    ])
  },
  {
    id: 'faq', label: N_('Questions fréquentes'), description: N_('Titre et accordéon'),
    build: () => sec([3, 6, 3], [[], [title('Questions fréquentes'), w('accordion', { faqSchema: true })], []], { rowStyle: {} })
  },
  {
    id: 'cta', label: N_('Appel à l’action'), description: N_('Bandeau avec texte et bouton'),
    build: () => {
      const s = sec([8, 4], [
        [w('heading', { text: fr('Prêt à mutualiser vos moyens ?'), level: 'h2' }, { desktop: { color: 'palette:c6' } }), w('text', { content: fr('<p>Écrivez-nous, nous vous rappelons dans la semaine.</p>') }, { desktop: { color: 'palette:c6', opacity: 0.85 } })],
        [w('button', { label: fr('Prendre contact'), link: '#contact', size: 'lg', variant: 'secondary' }, { desktop: { alignSelf: 'end' }, tablet: { alignSelf: 'start' } })]
      ], { style: { desktop: { background: 'palette:c3' } } });
      s.children[0].style.desktop.alignItems = 'center';
      return s;
    }
  },
  {
    id: 'contact', label: N_('Contact'), description: N_('Coordonnées, carte et formulaire'),
    build: () => {
      const s = sec([5, 7], [
        [
          w('heading', { text: fr('Contact'), level: 'h2' }),
          w('icon-list', { items: [{ icon: 'mail', text: fr('contact@exemple.be') }, { icon: 'phone', text: fr('+32 2 000 00 00') }, { icon: 'pin', text: fr('Rue de la Loi 16, 1000 Bruxelles') }] }),
          w('map', { height: '240' }),
          w('social')
        ],
        [w('form')]
      ]);
      s.advanced.anchor = 'contact';
      return s;
    }
  },
  {
    id: 'gallery', label: N_('Galerie'), description: N_('Titre et galerie d’images'),
    build: () => sec([12], [[title('En images'), w('gallery')]])
  },
  {
    id: 'cards', label: N_('Actualités'), description: N_('Trois cartes avec image, texte et lien'),
    build: () => withRow(sec([12], [[title('Dernières nouvelles')]]), [4, 4, 4], [0, 1, 2].map(() => [w('card')]))
  },
  {
    id: 'text-image', label: N_('Texte et image'), description: N_('Paragraphe à gauche, image à droite'),
    build: () => {
      const s = sec([6, 6], [
        [w('heading', { text: fr('Notre histoire'), level: 'h2' }), w('text', { content: fr('<p>Racontez en quelques lignes d’où vous venez et ce qui vous anime.</p><p>Un deuxième paragraphe pour les détails.</p>') }), w('icon-list')],
        [w('image', { ratio: '4/3' })]
      ]);
      s.children[0].style.desktop.alignItems = 'center';
      return s;
    }
  },
  {
    id: 'video', label: N_('Vidéo'), description: N_('Titre centré et vidéo'),
    build: () => sec([2, 8, 2], [[], [title('Découvrez le projet en 2 minutes'), w('video')], []])
  }
];

export function buildTemplate(id) {
  const t = TEMPLATES.find(x => x.id === id);
  if (!t) throw new Error(__('Modèle inconnu : {id}', { id }));
  return t.build();
}
