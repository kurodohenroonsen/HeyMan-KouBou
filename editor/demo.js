/* Projet d'exemple : page d'accueil du MAB construite avec les widgets (en partie traduite). */
import { createSite, updatePageRoot, addPage, setPalette, setTheme, setFooterText } from '../core/site.js';
import { createNode, createSectionWithColumns, insertNode, setProp, setStyle } from '../core/tree.js';

function widget(type, props = {}, style = {}) {
  const n = createNode(type);
  for (const [k, v] of Object.entries(props)) n.props[k] = v;
  for (const [st, values] of Object.entries(style)) Object.assign(n.style[st], values);
  return n;
}

function section(spans, cols, style = {}, props = {}) {
  const sec = createSectionWithColumns(spans.length, spans);
  Object.assign(sec.props, props);
  for (const [st, values] of Object.entries(style)) Object.assign(sec.style[st], values);
  sec.children[0].children.forEach((col, i) => { col.children = cols[i] || []; });
  return sec;
}

export function demoSite() {
  let site = createSite({ name: 'MAB – Médias Alternatifs Belges', languages: ['fr', 'nl', 'de', 'en'], defaultLanguage: 'fr', baseUrl: 'https://www.xn--mdia-alternatif-bnb.be' });
  site = setPalette(site, 'c1', '#c8181d');
  site = setPalette(site, 'c2', '#f6d200');
  site = setPalette(site, 'c3', '#121216');
  site = setPalette(site, 'c4', '#f5f5f2');
  site = setTheme(site, { fonts: { heading: 'archivo', body: 'system' }, radius: 8 });
  site = setFooterText(site, '© 2026 MAB – Médias Alternatifs Belges', 'fr');
  site.pages[0].title = { fr: 'Accueil', nl: 'Home', de: 'Startseite', en: 'Home' };

  const hero = section([7, 5], [
    [
      widget('heading', { text: { fr: 'Fédération indépendante', nl: 'Onafhankelijke federatie' }, level: 'p' },
        { desktop: { color: 'palette:c1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem' } }),
      widget('heading', { text: { fr: 'L’information citoyenne libre, <strong>sans compromis</strong> ni censure', nl: 'Vrije burgerinformatie, <strong>zonder compromissen</strong> of censuur' }, level: 'h1' },
        { mobile: { fontSize: '2.2rem' } }),
      widget('text', { content: { fr: '<p>Le MAB réunit les médias alternatifs belges. Nous partageons le matériel, les techniciens et les outils de diffusion. Chaque rédaction garde sa ligne éditoriale.</p>' } },
        { desktop: { fontSize: '1.15rem', color: 'palette:c5', maxWidth: '58ch' } }),
      widget('button', { label: { fr: 'Rejoindre la coopérative', nl: 'Word lid van de coöperatie' }, link: '#contact', size: 'lg' },
        { hover: { transform: 'lift' }, desktop: { transitionDuration: 200 } })
    ],
    [widget('image', { ratio: '4/3', alt: { fr: 'Régie de production partagée' } })]
  ], {}, {});
  hero.children[0].style.desktop.alignItems = 'center';

  const card = (title, text) => [
    widget('heading', { text: { fr: title }, level: 'h3' }),
    widget('text', { content: { fr: `<p>${text}</p>` } }, { desktop: { color: 'palette:c5' } })
  ];
  const features = section([12], [[
    widget('heading', { text: { fr: 'Ce que nous mettons en commun' }, level: 'h2' }, { desktop: { textAlign: 'center', marginBottom: '8px' } })
  ]], { desktop: { background: 'palette:c6' } });
  const grid = createNode('row');
  grid.children = [4, 4, 4].map(() => { const c = createNode('column'); c.style.desktop.span = 4; return c; });
  [
    card('Le matériel', 'Caméras, micros et valises de transmission, prêtés aux médias membres.'),
    card('Des techniciens neutres', 'Ils font la technique pour tout le monde, sans rôle éditorial.'),
    card('Les abonnements', 'Un seul abonnement de diffusion, payé une fois pour tous.')
  ].forEach((ws, i) => {
    const col = grid.children[i];
    col.children = ws;
    Object.assign(col.style.desktop, { background: 'palette:c4', paddingTop: '24px', paddingRight: '24px', paddingBottom: '24px', paddingLeft: '24px', borderRadius: '12px' });
    Object.assign(col.style.hover, { boxShadow: 'md' });
  });
  features.children.push(grid);

  const cta = section([8, 4], [
    [
      widget('heading', { text: { fr: 'Votre média veut nous rejoindre ?' }, level: 'h2' }),
      widget('text', { content: { fr: '<p>Écrivez-nous : nous vous présentons le projet et répondons à vos questions.</p>' } })
    ],
    [widget('button', { label: { fr: 'Écrire à l’équipe' }, link: 'mailto:contact@media-alternatif.be', variant: 'secondary', size: 'lg' }, { desktop: { textAlign: 'right' }, mobile: { textAlign: 'left' } })]
  ], { desktop: { background: 'palette:c3', color: 'palette:c4' } });
  cta.advanced.anchor = 'contact';
  cta.children[0].style.desktop.alignItems = 'center';

  let r = site.pages[0].root;
  for (const s of [hero, features, cta]) r = insertNode(r, r.id, s);
  site = updatePageRoot(site, site.pages[0].id, r);

  site = addPage(site, { slug: 'contact', title: { fr: 'Contact', nl: 'Contact', de: 'Kontakt', en: 'Contact' } });
  const contact = section([12], [[
    widget('heading', { text: { fr: 'Écrire à l’équipe' }, level: 'h1' }),
    widget('text', { content: { fr: '<p>Une question ou une proposition de sujet ? Écrivez à <a href="mailto:contact@media-alternatif.be">contact@media-alternatif.be</a>.</p>' } })
  ]]);
  const p2 = site.pages[1];
  site = updatePageRoot(site, p2.id, insertNode(p2.root, p2.root.id, contact));
  return site;
}
