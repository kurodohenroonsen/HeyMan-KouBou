/*
 * Modèles de sections prêts à l'emploi. Chaque appel construit une section neuve (identifiants uniques).
 * Les couleurs passent par la palette : un modèle prend automatiquement l'identité du site.
 * Les textes d'exemple sont neutres et écrits dans les cinq langues ; buildTemplate(id, { lang }) ne garde que la langue
 * principale du site (cycle 28).
 */
import './widgets-extra.js';
import { createNode, createSectionWithColumns, localizeTree } from './tree.js';
import { L5 } from './widgets.js';
import { __, N_ } from './ui-i18n.js';


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

const title = (text, extra = {}) => w('heading', { text, level: 'h2' }, { desktop: { textAlign: 'center', ...extra } });
const para = t => Object.fromEntries(Object.entries(t).map(([l, v]) => [l, `<p>${v}</p>`]));
const intro = text => w('text', { content: para(text) }, { desktop: { textAlign: 'center', color: 'palette:c5', maxWidth: '62ch', marginLeft: 'auto', marginRight: 'auto' } });

export const TEMPLATES = [
  {
    id: 'hero', label: N_('Héros'), description: N_('Grand titre, texte, deux boutons et une image'),
    build: () => {
      const s = sec([6, 6], [
        [
          w('heading', { text: L5('Petit surtitre', 'Kleine bovenkop', 'Kleine Dachzeile', 'Small overline', '小見出し'), level: 'p' }, { desktop: { color: 'palette:c1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem' } }),
          w('heading', { text: L5('Un titre fort qui dit ce que vous faites', 'Een sterke titel die zegt wat u doet', 'Eine starke Überschrift, die sagt, was Sie tun', 'A strong headline that says what you do', 'あなたの活動がひと目でわかる見出し'), level: 'h1' }, { mobile: { fontSize: '2.2rem' } }),
          w('text', { content: para(L5('Une phrase d’accroche qui explique pour qui, et ce que cela change.', 'Een pakkende zin die uitlegt voor wie het is en wat het verandert.', 'Ein einladender Satz: für wen, und was sich dadurch ändert.', 'One catchy sentence that explains who it is for and what it changes.', '誰のために、何が変わるのかを伝えるひと言。')) }, { desktop: { fontSize: '1.15rem', color: 'palette:c5' } }),
          w('button', { label: L5('Commencer', 'Beginnen', 'Loslegen', 'Get started', 'はじめる'), link: '#contact', size: 'lg' }, { hover: { transform: 'lift' } }),
          w('button', { label: L5('En savoir plus', 'Meer weten', 'Mehr erfahren', 'Learn more', '詳しく見る'), link: '#contact', variant: 'link' })
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
      w('heading', { text: L5('Un titre centré, simple et lisible', 'Een gecentreerde, eenvoudige en leesbare titel', 'Eine zentrierte, klare Überschrift', 'A centred, simple and readable headline', 'シンプルで読みやすい中央の見出し'), level: 'h1' }, { desktop: { textAlign: 'center', color: 'palette:c6' } }),
      w('text', { content: para(L5('Un sous-titre court pour préciser la promesse.', 'Een korte ondertitel die de belofte verduidelijkt.', 'Ein kurzer Untertitel, der das Versprechen präzisiert.', 'A short subtitle to make the promise clear.', '伝えたいことを短く補足するサブタイトル。')) }, { desktop: { textAlign: 'center', color: 'palette:c6', opacity: 0.85, fontSize: '1.15rem' } }),
      w('button', { label: L5('Nous contacter', 'Contacteer ons', 'Kontakt aufnehmen', 'Contact us', 'お問い合わせ'), link: '#contact', size: 'lg', variant: 'secondary' }, { desktop: { alignSelf: 'center' } })
    ]], { style: { desktop: { background: 'palette:c3', paddingTop: '120px', paddingBottom: '120px' } } })
  },
  {
    id: 'features', label: N_('Avantages'), description: N_('Titre et trois encadrés à icône'),
    build: () => withRow(sec([12], [[title(L5('Pourquoi nous choisir', 'Waarom voor ons kiezen', 'Warum wir', 'Why choose us', '選ばれる理由')),
      intro(L5('Trois raisons concrètes, en une phrase chacune.', 'Drie concrete redenen, elk in één zin.', 'Drei konkrete Gründe, jeweils in einem Satz.', 'Three concrete reasons, one sentence each.', '具体的な理由を3つ、それぞれ一文で。'))]]), [4, 4, 4], [
      [w('icon-box', { icon: 'pin', title: L5('Proximité', 'Nabijheid', 'Nähe', 'Close to you', '地域密着'), text: para(L5('Une équipe locale, joignable et à l’écoute.', 'Een lokaal team, bereikbaar en luisterbereid.', 'Ein lokales Team, erreichbar und aufmerksam.', 'A local team you can reach, who listens.', '地元のスタッフが、いつでも親身に対応します。')) })],
      [w('icon-box', { icon: 'star', title: L5('Qualité', 'Kwaliteit', 'Qualität', 'Quality', '品質'), text: para(L5('Un travail soigné et des produits choisis.', 'Zorgvuldig werk en uitgekozen producten.', 'Sorgfältige Arbeit und ausgewählte Produkte.', 'Careful work and well-chosen products.', '丁寧な仕事と、選び抜いた品。')) })],
      [w('icon-box', { icon: 'shield', title: L5('Confiance', 'Vertrouwen', 'Vertrauen', 'Trust', '安心'), text: para(L5('Des engagements clairs, et tenus.', 'Duidelijke afspraken die we nakomen.', 'Klare Zusagen, die wir einhalten.', 'Clear commitments that we keep.', 'はっきりした約束を、きちんと守ります。')) })]
    ])
  },
  {
    id: 'stats', label: N_('Chiffres clés'), description: N_('Bandeau de chiffres sur fond coloré'),
    build: () => sec([12], [[w('stats', {}, { desktop: { color: 'palette:c6' } })]], { style: { desktop: { background: 'palette:c1' } } })
  },
  {
    id: 'testimonials', label: N_('Témoignages'), description: N_('Trois citations en cartes'),
    build: () => withRow(sec([12], [[title(L5('Ils en parlent', 'Zij vertellen erover', 'Das sagen andere', 'What people say', 'お客さまの声'))]]), [4, 4, 4], [0, 1, 2].map(() => [w('quote', { variant: 'card' })]))
  },
  {
    id: 'pricing', label: N_('Tarifs'), description: N_('Trois formules, celle du milieu mise en avant'),
    build: () => withRow(sec([12], [[title(L5('Nos formules', 'Onze formules', 'Unsere Angebote', 'Our plans', '料金プラン')),
      intro(L5('Choisissez la formule qui vous convient.', 'Kies de formule die bij u past.', 'Wählen Sie das passende Angebot.', 'Choose the plan that suits you.', 'ご希望に合うプランをお選びください。'))]]), [4, 4, 4], [
      [w('pricing', { title: L5('Essentiel', 'Basis', 'Basis', 'Essential', 'ベーシック'), price: '20 €' })],
      [w('pricing', { title: L5('Confort', 'Comfort', 'Komfort', 'Comfort', 'スタンダード'), price: '49 €', highlight: true, badge: L5('Le plus choisi', 'Meest gekozen', 'Am beliebtesten', 'Most popular', '一番人気') })],
      [w('pricing', { title: L5('Complet', 'Volledig', 'Komplett', 'Complete', 'プレミアム'), price: '99 €' })]
    ])
  },
  {
    id: 'faq', label: N_('Questions fréquentes'), description: N_('Titre et accordéon'),
    build: () => sec([3, 6, 3], [[], [title(L5('Questions fréquentes', 'Veelgestelde vragen', 'Häufige Fragen', 'Frequently asked questions', 'よくある質問')), w('accordion', { faqSchema: true })], []], { rowStyle: {} })
  },
  {
    id: 'cta', label: N_('Appel à l’action'), description: N_('Bandeau avec texte et bouton'),
    build: () => {
      const s = sec([8, 4], [
        [w('heading', { text: L5('Une question, un projet ?', 'Een vraag of een project?', 'Eine Frage, ein Vorhaben?', 'A question or a project?', 'ご質問・ご相談はお気軽に'), level: 'h2' }, { desktop: { color: 'palette:c6' } }),
          w('text', { content: para(L5('Écrivez-nous, nous vous répondons rapidement.', 'Schrijf ons, we antwoorden snel.', 'Schreiben Sie uns, wir antworten schnell.', 'Write to us and we will reply quickly.', 'メッセージをお送りください。すぐにお返事します。')) }, { desktop: { color: 'palette:c6', opacity: 0.85 } })],
        [w('button', { label: L5('Prendre contact', 'Contact opnemen', 'Kontakt aufnehmen', 'Get in touch', '問い合わせる'), link: '#contact', size: 'lg', variant: 'secondary' }, { desktop: { alignSelf: 'end' }, tablet: { alignSelf: 'start' } })]
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
          w('heading', { text: L5('Contact', 'Contact', 'Kontakt', 'Contact', 'お問い合わせ'), level: 'h2' }),
          w('icon-list', { items: [{ icon: 'mail', text: L5('contact@exemple.be') }, { icon: 'phone', text: L5('+32 2 000 00 00', '+32 2 000 00 00', '+32 2 000 00 00', '+32 2 000 00 00', '000-000-0000') },
            { icon: 'pin', text: L5('Rue de l’Exemple 1, 1000 Ville', 'Voorbeeldstraat 1, 1000 Stad', 'Beispielstraße 1, 1000 Stadt', '1 Example Street, 1000 Town', '〒000-0000 ○○県○○市1-1') }] }),
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
    build: () => sec([12], [[title(L5('En images', 'In beeld', 'In Bildern', 'In pictures', 'フォトギャラリー')), w('gallery')]])
  },
  {
    id: 'cards', label: N_('Actualités'), description: N_('Trois cartes avec image, texte et lien'),
    build: () => withRow(sec([12], [[title(L5('Dernières nouvelles', 'Laatste nieuws', 'Neuigkeiten', 'Latest news', '最新のお知らせ'))]]), [4, 4, 4], [0, 1, 2].map(() => [w('card')]))
  },
  {
    id: 'text-image', label: N_('Texte et image'), description: N_('Paragraphe à gauche, image à droite'),
    build: () => {
      const s = sec([6, 6], [
        [w('heading', { text: L5('Notre histoire', 'Ons verhaal', 'Unsere Geschichte', 'Our story', '私たちについて'), level: 'h2' }),
          w('text', { content: L5('<p>Racontez en quelques lignes d’où vous venez et ce qui vous anime.</p><p>Un deuxième paragraphe pour les détails.</p>', '<p>Vertel in enkele regels waar u vandaan komt en wat u drijft.</p><p>Een tweede alinea voor de details.</p>', '<p>Erzählen Sie in wenigen Zeilen, woher Sie kommen und was Sie antreibt.</p><p>Ein zweiter Absatz für die Einzelheiten.</p>', '<p>Tell in a few lines where you come from and what drives you.</p><p>A second paragraph for the details.</p>', '<p>どんな思いで始めたのか、数行で紹介しましょう。</p><p>詳しい内容は2つ目の段落に。</p>') }), w('icon-list')],
        [w('image', { ratio: '4/3' })]
      ]);
      s.children[0].style.desktop.alignItems = 'center';
      return s;
    }
  },
  {
    id: 'video', label: N_('Vidéo'), description: N_('Titre centré et vidéo'),
    build: () => sec([2, 8, 2], [[], [title(L5('Découvrez-nous en 2 minutes', 'Leer ons kennen in 2 minuten', 'Lernen Sie uns in 2 Minuten kennen', 'Get to know us in 2 minutes', '2分でわかる私たち')), w('video')], []])
  }
];

/* Section neuve ; { lang } : langue principale du site, { langs } : toutes les langues à remplir */
export function buildTemplate(id, { lang = 'fr', langs } = {}) {
  const t = TEMPLATES.find(x => x.id === id);
  if (!t) throw new Error(__('Modèle inconnu : {id}', { id }));
  return localizeTree(t.build(), langs?.length ? langs : [lang]);
}
