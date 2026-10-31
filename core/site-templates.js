/*
 * Modèles de sites complets (cycle 28, X2) : association ou média, tourisme ou commune, commerce ou artisan local,
 * association de commerçants, événement ou festival, et site vide. buildTemplate(id, { name, main, others }) renvoie un
 * site valide : pages construites avec les widgets habituels, menu automatique, en-tête et pied en blocs, collections
 * avec exemples du domaine, référencement renseigné, palette et polices du modèle, pages légales à compléter.
 * Tous les textes existent dans les cinq langues (fr, nl, de, en, ja) et sont posés sous les langues du site.
 * Logique pure : les vignettes sont des SVG dessinés (aucune image binaire).
 */
import { blankSite, newPageId, slugify, HOME_TITLES } from './site.js';
import { createNode, createSectionWithColumns, localizeTree } from './tree.js';
import { L5 } from './widgets.js';
import './widgets-extra.js';
import { buildTemplate as buildSection } from './templates.js';
import { createCollectionWithPage, setCollectionMeta } from './collections.js';
import { customizeHeader, customizeFooter } from './layout.js';
import { addLegalPages, TO_COMPLETE } from './legalpages.js';
import { escapeHtml } from './escape.js';
import { __, N_ } from './ui-i18n.js';
import { THUMBS } from './site-thumbs.js';

const ALL = ['fr', 'nl', 'de', 'en', 'ja'];
const T = L5;
const html = (t, tag = 'p') => Object.fromEntries(ALL.map(l => [l, `<${tag}>${t[l]}</${tag}>`]));

/* ---------- Briques de mise en page (textes dans les cinq langues, réduits à la fin par localizeTree) ---------- */
function w(type, props = {}, style = {}) {
  const n = createNode(type, { langs: ALL });
  Object.assign(n.props, props);
  for (const [st, v] of Object.entries(style)) Object.assign(n.style[st], v);
  return n;
}

function sec(spans, cols, { bg, pad, anchor } = {}) {
  const s = createSectionWithColumns(spans.length, spans);
  if (bg) s.style.desktop.background = bg;
  if (pad) Object.assign(s.style.desktop, { paddingTop: pad, paddingBottom: pad });
  if (anchor) s.advanced.anchor = anchor;
  s.children[0].children.forEach((col, i) => { col.children = cols[i] || []; });
  return s;
}

function addRow(s, spans, cols) {
  const row = createSectionWithColumns(spans.length, spans).children[0];
  row.children.forEach((col, i) => { col.children = cols[i] || []; });
  s.children.push(row);
  return s;
}

const h = (text, level = 'h2', style = {}) => w('heading', { text, level }, { desktop: style });
const txt = (t, style = {}) => w('text', { content: html(t) }, { desktop: style });
const btn = (label, link, variant = 'primary', size = 'lg') => w('button', { label, link, variant, size });

/* Bandeau d'accueil : grand titre sur la couleur principale, phrase d'accroche et bouton */
function hero(title, text, label, link) {
  return sec([12], [[
    h(title, 'h1', { textAlign: 'center', color: 'palette:c6' }),
    txt(text, { textAlign: 'center', color: 'palette:c6', fontSize: '1.2rem', maxWidth: '60ch', marginLeft: 'auto', marginRight: 'auto' }),
    w('button', { label, link, variant: 'secondary', size: 'lg' }, { desktop: { alignSelf: 'center' } })
  ]], { bg: 'palette:c1', pad: '96px' });
}

/* Titre, introduction et trois encadrés à icône */
function boxes(title, intro, items) {
  const s = sec([12], [[h(title, 'h2', { textAlign: 'center' }), txt(intro, { textAlign: 'center', color: 'palette:c5' })]]);
  return addRow(s, [4, 4, 4], items.map(([icon, t, x]) => [w('icon-box', { icon, title: t, text: html(x) })]));
}

/* Titre et liste de contenus d'une collection */
function listing(title, colId, { limit = 3, columns = '3', when = 'all', more, link, bg } = {}) {
  const list = w('collection-list', { collection: colId, limit, columns, when, moreLabel: more || L5(''), moreLink: link || '' });
  return sec([12], [[h(title, 'h2'), list]], { bg });
}

/* Bandeau d'appel à l'action sur fond sombre */
function cta(title, text, label, link) {
  const s = sec([8, 4], [
    [h(title, 'h2', { color: 'palette:c6' }), txt(text, { color: 'palette:c6' })],
    [w('button', { label, link, variant: 'secondary', size: 'lg' }, { desktop: { alignSelf: 'end' }, tablet: { alignSelf: 'start' } })]
  ], { bg: 'palette:c3' });
  s.children[0].style.desktop.alignItems = 'center';
  return s;
}

/* Liste à icônes (horaires, accès, infos pratiques) avec un titre */
const iconList = (title, items) => sec([12], [[h(title, 'h2'), w('icon-list', { items: items.map(([icon, text]) => ({ icon, text })) })]]);

/* Modèle de section dont les liens d'un type de widget pointent vers une page du site */
function relinked(id, type, link) {
  const s = buildSection(id, { langs: ALL });
  const walkIn = n => { if (n.type === type) n.props.link = link; (n.children || []).forEach(walkIn); };
  walkIn(s);
  return s;
}

/* Section Contact (modèle de section) : adresse de la carte = adresse d'exemple du modèle */
function contact(address) {
  const s = buildSection('contact', { langs: ALL });
  const walkIn = n => { if (n.type === 'map') n.props.address = address; (n.children || []).forEach(walkIn); };
  walkIn(s);
  return s;
}

const TEXTS = {
  contactTitle: T('Contact', 'Contact', 'Kontakt', 'Contact', 'お問い合わせ'),
  contactText: T('Une question ? Écrivez-nous ou passez nous voir : nous vous répondons rapidement.',
    'Een vraag? Schrijf ons of kom langs: we antwoorden snel.',
    'Eine Frage? Schreiben Sie uns oder besuchen Sie uns: Wir antworten schnell.',
    'A question? Write to us or drop by: we will reply quickly.',
    'ご質問はメッセージまたはご来訪でどうぞ。すぐにお返事します。'),
  contactSeo: T('Coordonnées, plan d’accès et formulaire de contact : écrivez-nous, nous vous répondons rapidement.',
    'Contactgegevens, routebeschrijving en contactformulier: schrijf ons, we antwoorden snel.',
    'Kontaktdaten, Anfahrt und Kontaktformular: Schreiben Sie uns, wir antworten schnell.',
    'Contact details, directions and contact form: write to us and we will reply quickly.',
    '連絡先、アクセス、お問い合わせフォーム。お気軽にメッセージをお送りください。'),
  address: 'Rue de l’Exemple 1, 5000 Namur',
  more: T('Tout voir', 'Alles bekijken', 'Alle ansehen', 'See all', 'すべて見る')
};

/* ---------- Les modèles ---------- */
/*
 * Chaque modèle : vignette, palette, polices, forme juridique proposée pour les mentions légales, nom par défaut,
 * collections (type, domaine d'exemples, nom et adresse par langue) et pages (adresse par langue, titre, description
 * pour Google, sections). Les pages reçoivent `ctx` : { col: identifiants des collections, page: identifiants des pages }.
 */
const SITE_DEFS = {
  association: {
    label: N_('Association ou média'),
    description: N_('Accueil, actualités, membres, agenda et contact : pour une association, une fédération ou un média local.'),
    palette: { c1: '#1d4ed8', c2: '#fbbf24', c3: '#0f172a', c4: '#f8fafc', c5: '#475569', c6: '#ffffff' },
    fonts: { heading: 'archivo', body: 'public-sans' }, form: 'asbl',
    name: T('Mon association', 'Mijn vereniging', 'Mein Verein', 'My association', 'わたしたちの団体'),
    tagline: T('Ensemble, on va plus loin', 'Samen komen we verder', 'Gemeinsam kommen wir weiter', 'Together we go further', 'みんなで、もっと先へ'),
    collections: [
      { key: 'news', kind: 'news', name: T('Actualités', 'Nieuws', 'Neuigkeiten', 'News', 'お知らせ'), slug: T('actualites', 'nieuws', 'neuigkeiten', 'news', 'oshirase'),
        seo: T('Les dernières nouvelles de l’association : projets, rencontres et appels à participer.', 'Het laatste nieuws van de vereniging: projecten, ontmoetingen en oproepen.', 'Die neuesten Nachrichten des Vereins: Projekte, Treffen und Aufrufe.', 'The latest news from the association: projects, meetings and calls to take part.', '団体の最新ニュース。プロジェクト、交流会、参加のお知らせ。') },
      { key: 'members', kind: 'members', name: T('Membres', 'Leden', 'Mitglieder', 'Members', 'メンバー'), slug: T('membres', 'leden', 'mitglieder', 'members', 'menbaa'),
        seo: T('Les membres de l’association : qui ils sont, où les trouver et comment les contacter.', 'De leden van de vereniging: wie ze zijn, waar u ze vindt en hoe u ze bereikt.', 'Die Mitglieder des Vereins: wer sie sind, wo man sie findet und wie man sie erreicht.', 'The association’s members: who they are, where to find them and how to reach them.', '団体のメンバーをご紹介します。それぞれの活動内容、拠点、連絡先をまとめました。') },
      { key: 'events', kind: 'events', name: T('Agenda', 'Agenda', 'Termine', 'Events', 'イベント'), slug: T('agenda', 'agenda', 'termine', 'events', 'ibento'),
        seo: T('Les prochains rendez-vous : assemblées, ateliers et fêtes, à ajouter à votre agenda.', 'De volgende afspraken: vergaderingen, workshops en feesten, voor in uw agenda.', 'Die nächsten Termine: Versammlungen, Workshops und Feste für Ihren Kalender.', 'Upcoming events: meetings, workshops and parties to add to your calendar.', '総会、ワークショップ、お祭りなど、今後の予定。') }
    ],
    pages: [
      { key: 'home', seo: T('Une association ouverte à tous : découvrez nos actions, nos membres et nos prochains rendez-vous.', 'Een vereniging die openstaat voor iedereen: ontdek onze acties, leden en volgende afspraken.', 'Ein Verein, offen für alle: Entdecken Sie unsere Aktionen, Mitglieder und nächsten Termine.', 'An association open to everyone: discover our work, our members and our next events.', 'だれでも参加できる団体です。活動、メンバー、今後のイベントをご紹介します。'),
        build: c => [
          hero(T('Agir ensemble, près de chez vous', 'Samen actie voeren, dicht bij u', 'Gemeinsam handeln, ganz in Ihrer Nähe', 'Taking action together, close to home', '地域で、いっしょに動く'),
            T('Nous rassemblons les habitants, les bénévoles et les partenaires autour de projets utiles à tous.', 'We brengen inwoners, vrijwilligers en partners samen rond projecten die iedereen ten goede komen.', 'Wir bringen Bewohner, Freiwillige und Partner für Projekte zusammen, die allen nützen.', 'We bring residents, volunteers and partners together around projects that benefit everyone.', '住民、ボランティア、パートナーをつなぎ、みんなの役に立つプロジェクトを進めています。'),
            T('Nous rejoindre', 'Word lid', 'Mitmachen', 'Join us', '参加する'), `page:${c.page.contact}`),
          boxes(T('Nos missions', 'Onze opdrachten', 'Unsere Aufgaben', 'What we do', '私たちの活動'), T('Trois façons d’agir, au quotidien.', 'Drie manieren om dagelijks te handelen.', 'Drei Wege, wie wir täglich handeln.', 'Three ways we act, every day.', '日々の3つの取り組み。'), [
            ['users', T('Rassembler', 'Verbinden', 'Zusammenbringen', 'Bring together', 'つなぐ'), T('Des rencontres régulières, ouvertes à tous.', 'Regelmatige ontmoetingen, open voor iedereen.', 'Regelmäßige Treffen, offen für alle.', 'Regular meetings, open to everyone.', 'だれでも参加できる定期的な集まり。')],
            ['comment', T('Informer', 'Informeren', 'Informieren', 'Inform', '伝える'), T('Des nouvelles claires sur ce qui se passe près de chez vous.', 'Duidelijk nieuws over wat er in uw buurt gebeurt.', 'Klare Nachrichten aus Ihrer Umgebung.', 'Clear news about what is happening near you.', '身近な出来事をわかりやすくお届け。')],
            ['heart', T('Soutenir', 'Steunen', 'Unterstützen', 'Support', '支える'), T('Un coup de main à ceux qui lancent un projet.', 'Een helpende hand voor wie een project start.', 'Hilfe für alle, die ein Projekt starten.', 'A helping hand for anyone starting a project.', '新しく何かを始める人を応援します。')]
          ]),
          listing(T('Dernières nouvelles', 'Laatste nieuws', 'Neuigkeiten', 'Latest news', '最新のお知らせ'), c.col.news, { more: TEXTS.more, link: `page:${c.page.news}` }),
          listing(T('Prochains rendez-vous', 'Volgende afspraken', 'Nächste Termine', 'Coming up', '今後のイベント'), c.col.events, { when: 'upcoming', more: TEXTS.more, link: `page:${c.page.events}`, bg: 'palette:c6' }),
          cta(T('Envie de participer ?', 'Zin om mee te doen?', 'Lust mitzumachen?', 'Want to take part?', '参加してみませんか？'), T('Devenez membre ou bénévole : chaque coup de main compte.', 'Word lid of vrijwilliger: elke hulp telt.', 'Werden Sie Mitglied oder Freiwilliger: Jede Hilfe zählt.', 'Become a member or volunteer: every bit of help counts.', '会員やボランティアとして、ぜひお力を貸してください。'),
            T('Nous écrire', 'Schrijf ons', 'Schreiben Sie uns', 'Write to us', 'メッセージを送る'), `page:${c.page.contact}`)
        ] },
      { key: 'news', collection: 'news' },
      { key: 'members', collection: 'members' },
      { key: 'events', collection: 'events' },
      { key: 'contact', title: TEXTS.contactTitle, slug: T('contact', 'contact', 'kontakt', 'contact', 'otoiawase'), seo: TEXTS.contactSeo,
        build: () => [sec([12], [[h(TEXTS.contactTitle, 'h1'), txt(TEXTS.contactText)]]), contact(TEXTS.address), buildSection('faq', { langs: ALL })] }
    ]
  },

  tourism: {
    label: N_('Tourisme ou commune'),
    description: N_('Accueil, à découvrir, agenda et accès, contact : pour un office du tourisme, une commune ou un village.'),
    palette: { c1: '#166534', c2: '#eab308', c3: '#1c1917', c4: '#fafaf5', c5: '#57534e', c6: '#ffffff' },
    fonts: { heading: 'fraunces', body: 'dm-sans' }, form: 'asbl',
    name: T('Notre village', 'Ons dorp', 'Unser Dorf', 'Our village', 'わたしたちの町'),
    tagline: T('Nature, patrimoine et saveurs', 'Natuur, erfgoed en smaken', 'Natur, Kulturerbe und Genuss', 'Nature, heritage and flavours', '自然・歴史・味わい'),
    collections: [
      { key: 'places', kind: 'custom', name: T('À découvrir', 'Ontdekken', 'Entdecken', 'Discover', '見どころ'), slug: T('decouvrir', 'ontdekken', 'entdecken', 'discover', 'midokoro'),
        seo: T('Les lieux à ne pas manquer : points de vue, patrimoine et musées, avec nos conseils de visite.', 'Plekken die u niet mag missen: uitzichten, erfgoed en musea, met onze tips.', 'Orte, die Sie nicht verpassen sollten: Aussichtspunkte, Kulturerbe und Museen, mit Tipps.', 'Places not to miss: viewpoints, heritage and museums, with our visiting tips.', '見逃せない展望台、歴史的な場所、資料館を、おすすめの回り方とともにご紹介。') },
      { key: 'events', kind: 'events', name: T('Agenda et accès', 'Agenda en bereikbaarheid', 'Termine und Anfahrt', 'Events and getting here', 'イベント・アクセス'), slug: T('agenda', 'agenda', 'termine', 'events', 'ibento'),
        seo: T('Marchés, balades et fêtes à venir, et comment venir : voiture, train, bus et stationnement.', 'Markten, wandelingen en feesten, en hoe u ons bereikt: auto, trein, bus en parkeren.', 'Märkte, Wanderungen und Feste, und die Anreise: Auto, Bahn, Bus und Parken.', 'Upcoming markets, walks and festivals, and how to get here: car, train, bus and parking.', 'これからの市、散策、お祭りと、車・電車・バスでのアクセス。'),
        after: () => [iconList(T('Comment venir', 'Hoe komt u er', 'Anfahrt', 'Getting here', 'アクセス'), [
          ['pin', T('En voiture : parking gratuit au centre du village.', 'Met de auto: gratis parking in het dorpscentrum.', 'Mit dem Auto: kostenloser Parkplatz in der Dorfmitte.', 'By car: free parking in the village centre.', '車：町の中心に無料駐車場があります。')],
          ['globe', T('En train : gare la plus proche à 15 minutes, puis bus.', 'Met de trein: dichtstbijzijnde station op 15 minuten, dan de bus.', 'Mit der Bahn: nächster Bahnhof 15 Minuten entfernt, dann Bus.', 'By train: nearest station 15 minutes away, then the bus.', '電車：最寄り駅から15分、そこからバス。')],
          ['clock', T('Office du tourisme ouvert tous les jours, 9 h – 17 h.', 'Toerismebureau elke dag open, 9 – 17 u.', 'Touristinformation täglich geöffnet, 9–17 Uhr.', 'Tourist office open daily, 9 am – 5 pm.', '観光案内所 毎日9:00〜17:00。')]
        ]), sec([12], [[w('map', { address: TEXTS.address, height: '320' })]])] }
    ],
    pages: [
      { key: 'home', seo: T('Bienvenue au village : balades, patrimoine, produits du terroir et agenda des fêtes et marchés.', 'Welkom in het dorp: wandelingen, erfgoed, streekproducten en een agenda van feesten en markten.', 'Willkommen im Dorf: Wanderungen, Kulturerbe, regionale Produkte und Termine für Feste und Märkte.', 'Welcome to the village: walks, heritage, local produce and a calendar of festivals and markets.', '町へようこそ。散策、歴史、特産品、お祭りや市の予定をご案内します。'),
        build: c => [
          hero(T('Bienvenue chez nous', 'Welkom bij ons', 'Willkommen bei uns', 'Welcome to our village', 'ようこそ、わたしたちの町へ'),
            T('Des paysages préservés, un patrimoine vivant et des producteurs passionnés vous attendent.', 'Ongerepte landschappen, levend erfgoed en gepassioneerde producenten wachten op u.', 'Unberührte Landschaften, lebendiges Kulturerbe und leidenschaftliche Erzeuger erwarten Sie.', 'Unspoilt landscapes, living heritage and passionate producers are waiting for you.', '豊かな自然、受け継がれる文化、こだわりの生産者がお待ちしています。'),
            T('Préparer ma visite', 'Mijn bezoek voorbereiden', 'Besuch planen', 'Plan my visit', '旅の準備をする'), `page:${c.page.events}`),
          boxes(T('Pourquoi venir', 'Waarom komen', 'Warum kommen', 'Why visit', 'ここに来る理由'), T('Trois bonnes raisons de passer quelques jours ici.', 'Drie goede redenen om hier enkele dagen door te brengen.', 'Drei gute Gründe für ein paar Tage hier.', 'Three good reasons to spend a few days here.', '数日過ごしたくなる3つの理由。'), [
            ['globe', T('La nature', 'De natuur', 'Die Natur', 'Nature', '自然'), T('Forêts, rivières et sentiers balisés pour tous les niveaux.', 'Bossen, rivieren en bewegwijzerde paden voor elk niveau.', 'Wälder, Flüsse und markierte Wege für jedes Niveau.', 'Forests, rivers and waymarked trails for every level.', '森と川、レベルに合わせて選べる散策路。')],
            ['star', T('Le patrimoine', 'Het erfgoed', 'Das Kulturerbe', 'Heritage', '歴史と文化'), T('Églises, vieux ponts et traditions encore bien vivantes.', 'Kerken, oude bruggen en levende tradities.', 'Kirchen, alte Brücken und lebendige Bräuche.', 'Churches, old bridges and living traditions.', '古い寺社や石橋、今も続く伝統。')],
            ['heart', T('Les saveurs', 'De smaken', 'Der Genuss', 'Flavours', '味わい'), T('Marchés, fermes et restaurants qui cuisinent local.', 'Markten, boerderijen en restaurants die lokaal koken.', 'Märkte, Höfe und Restaurants mit regionaler Küche.', 'Markets, farms and restaurants cooking local food.', '市場、農家、地元食材の料理店。')]
          ]),
          listing(T('À découvrir', 'Ontdekken', 'Entdecken', 'Discover', '見どころ'), c.col.places, { more: TEXTS.more, link: `page:${c.page.places}` }),
          listing(T('Prochains rendez-vous', 'Volgende afspraken', 'Nächste Termine', 'Coming up', '今後のイベント'), c.col.events, { when: 'upcoming', more: TEXTS.more, link: `page:${c.page.events}`, bg: 'palette:c6' })
        ] },
      { key: 'places', collection: 'places' },
      { key: 'events', collection: 'events' },
      { key: 'contact', title: TEXTS.contactTitle, slug: T('contact', 'contact', 'kontakt', 'contact', 'otoiawase'), seo: TEXTS.contactSeo,
        build: () => [sec([12], [[h(TEXTS.contactTitle, 'h1'), txt(TEXTS.contactText)]]), contact(TEXTS.address)] }
    ]
  },

  shop: {
    label: N_('Commerce ou artisan local'),
    description: N_('Accueil, offre ou carte, à propos, horaires et accès, contact : pour une boutique, un restaurant ou un artisan.'),
    palette: { c1: '#9a3412', c2: '#fcd34d', c3: '#292524', c4: '#fffbf5', c5: '#57534e', c6: '#ffffff' },
    fonts: { heading: 'lora', body: 'public-sans' }, form: 'independant',
    name: T('Ma boutique', 'Mijn winkel', 'Mein Geschäft', 'My shop', 'わたしのお店'),
    tagline: T('Fait ici, avec soin', 'Hier gemaakt, met zorg', 'Hier gemacht, mit Sorgfalt', 'Made here, with care', 'この町で、ていねいに'),
    collections: [
      { key: 'offer', kind: 'custom', name: T('Notre offre', 'Ons aanbod', 'Unser Angebot', 'What we offer', '商品・メニュー'), slug: T('offre', 'aanbod', 'angebot', 'offer', 'menyuu'),
        seo: T('Nos produits, nos services et la suggestion du moment, préparés sur place avec des fournisseurs locaux.', 'Onze producten, diensten en de suggestie van het moment, ter plaatse bereid met lokale leveranciers.', 'Unsere Produkte, Leistungen und der aktuelle Tipp, vor Ort mit regionalen Lieferanten zubereitet.', 'Our products, services and this season’s pick, made on site with local suppliers.', '地元の仕入れ先とともに店内でつくる商品、サービス、今月のおすすめ。') }
    ],
    pages: [
      { key: 'home', seo: T('Votre commerce de proximité : produits choisis, conseils personnalisés et accueil chaleureux, au cœur du quartier.', 'Uw buurtwinkel: uitgekozen producten, persoonlijk advies en een warm onthaal, midden in de wijk.', 'Ihr Geschäft um die Ecke: ausgewählte Produkte, persönliche Beratung und herzlicher Empfang.', 'Your local shop: carefully chosen products, personal advice and a warm welcome in the heart of the neighbourhood.', '地域のお店です。選び抜いた品、ていねいなご相談、あたたかいおもてなし。'),
        build: c => [
          hero(T('Le bon produit, près de chez vous', 'Het juiste product, dicht bij u', 'Das richtige Produkt, ganz in Ihrer Nähe', 'The right product, close to home', 'いいものを、すぐ近くで'),
            T('Des produits choisis avec soin, des conseils sincères et le plaisir d’un vrai commerce de quartier.', 'Zorgvuldig gekozen producten, eerlijk advies en het plezier van een echte buurtwinkel.', 'Sorgfältig ausgewählte Produkte, ehrliche Beratung und die Freude an einem echten Laden um die Ecke.', 'Carefully chosen products, honest advice and the pleasure of a real local shop.', '心を込めて選んだ品と、正直なアドバイス。まちのお店ならではの楽しさを。'),
            T('Voir notre offre', 'Ons aanbod bekijken', 'Unser Angebot', 'See what we offer', '商品を見る'), `page:${c.page.offer}`),
          buildSection('features', { langs: ALL }),
          listing(T('La sélection du moment', 'De selectie van het moment', 'Unsere aktuelle Auswahl', 'Our current selection', 'いまのおすすめ'), c.col.offer, { more: TEXTS.more, link: `page:${c.page.offer}`, bg: 'palette:c6' }),
          buildSection('testimonials', { langs: ALL }),
          cta(T('Une commande, une question ?', 'Een bestelling, een vraag?', 'Eine Bestellung, eine Frage?', 'An order or a question?', 'ご注文・ご質問はこちら'), T('Passez à la boutique ou écrivez-nous : nous répondons vite.', 'Kom langs in de winkel of schrijf ons: we antwoorden snel.', 'Kommen Sie vorbei oder schreiben Sie uns: Wir antworten schnell.', 'Drop in or write to us: we reply quickly.', 'ご来店またはメッセージでどうぞ。すぐにお返事します。'),
            T('Nous contacter', 'Contacteer ons', 'Kontakt', 'Contact us', 'お問い合わせ'), `page:${c.page.contact}`)
        ] },
      { key: 'offer', collection: 'offer' },
      { key: 'about', title: T('À propos', 'Over ons', 'Über uns', 'About us', '私たちについて'), slug: T('a-propos', 'over-ons', 'ueber-uns', 'about', 'about'),
        seo: T('Notre histoire, notre savoir-faire et nos engagements : qui se cache derrière le comptoir.', 'Ons verhaal, onze knowhow en onze engagementen: wie er achter de toonbank staat.', 'Unsere Geschichte, unser Können und unsere Werte: wer hinter der Theke steht.', 'Our story, our know-how and our commitments: who is behind the counter.', 'お店の歩み、技術、こだわり。カウンターの向こうの私たちをご紹介。'),
        build: () => [
          sec([12], [[h(T('À propos', 'Over ons', 'Über uns', 'About us', '私たちについて'), 'h1'), txt(T('Une histoire de famille, de passion et de quartier.', 'Een verhaal van familie, passie en buurt.', 'Eine Geschichte von Familie, Leidenschaft und Nachbarschaft.', 'A story of family, passion and neighbourhood.', '家族と情熱と、この町の物語。'), { color: 'palette:c5' })]]),
          buildSection('text-image', { langs: ALL }),
          sec([12], [[w('stats')]], { bg: 'palette:c6' })
        ] },
      { key: 'hours', title: T('Horaires et accès', 'Openingsuren en route', 'Öffnungszeiten und Anfahrt', 'Opening hours and directions', '営業時間・アクセス'), slug: T('horaires', 'openingsuren', 'oeffnungszeiten', 'opening-hours', 'eigyou-jikan'),
        seo: T('Jours et heures d’ouverture, adresse, plan d’accès et stationnement à proximité de la boutique.', 'Openingsdagen en -uren, adres, routebeschrijving en parkeren bij de winkel.', 'Öffnungstage und -zeiten, Adresse, Anfahrt und Parken in der Nähe.', 'Opening days and hours, address, directions and parking near the shop.', '営業日と営業時間、住所、アクセス、近くの駐車場。'),
        build: () => [
          sec([12], [[h(T('Horaires et accès', 'Openingsuren en route', 'Öffnungszeiten und Anfahrt', 'Opening hours and directions', '営業時間・アクセス'), 'h1')]]),
          iconList(T('Horaires', 'Openingsuren', 'Öffnungszeiten', 'Opening hours', '営業時間'), [
            ['clock', T('Du mardi au vendredi : 9 h – 18 h', 'Dinsdag tot vrijdag: 9 – 18 u', 'Dienstag bis Freitag: 9–18 Uhr', 'Tuesday to Friday: 9 am – 6 pm', '火〜金曜：9:00〜18:00')],
            ['clock', T('Samedi : 9 h – 17 h', 'Zaterdag: 9 – 17 u', 'Samstag: 9–17 Uhr', 'Saturday: 9 am – 5 pm', '土曜：9:00〜17:00')],
            ['calendar', T('Fermé le dimanche et le lundi', 'Gesloten op zondag en maandag', 'Sonntag und Montag geschlossen', 'Closed on Sunday and Monday', '日曜・月曜定休')]
          ]),
          iconList(T('Accès', 'Bereikbaarheid', 'Anfahrt', 'Getting here', 'アクセス'), [
            ['pin', T(TEXTS.address, 'Voorbeeldstraat 1, 5000 Namen', 'Beispielstraße 1, 5000 Namur', '1 Example Street, 5000 Namur', '〒000-0000 ○○県○○町1-1')],
            ['globe', T('Parking gratuit à 50 m, arrêt de bus devant la boutique.', 'Gratis parking op 50 m, bushalte voor de winkel.', 'Kostenloser Parkplatz in 50 m, Bushaltestelle vor dem Geschäft.', 'Free parking 50 m away, bus stop in front of the shop.', '50m先に無料駐車場、店の前にバス停があります。')]
          ]),
          sec([12], [[w('map', { address: TEXTS.address, height: '320' })]])
        ] },
      { key: 'contact', title: TEXTS.contactTitle, slug: T('contact', 'contact', 'kontakt', 'contact', 'otoiawase'), seo: TEXTS.contactSeo,
        build: () => [sec([12], [[h(TEXTS.contactTitle, 'h1'), txt(TEXTS.contactText)]]), contact(TEXTS.address)] }
    ]
  },

  merchants: {
    label: N_('Association de commerçants / promotion d’une ville'),
    description: N_('Accueil, les commerces (catégorie, adresse, horaires, lien), agenda, actualités, devenir membre, contact.'),
    palette: { c1: '#be123c', c2: '#fde047', c3: '#1f2937', c4: '#fffaf5', c5: '#4b5563', c6: '#ffffff' },
    fonts: { heading: 'oswald', body: 'dm-sans' }, form: 'asbl',
    name: T('Commerces de notre ville', 'Handelaars van onze stad', 'Geschäfte unserer Stadt', 'Our town’s shops', 'まちの商店会'),
    tagline: T('Achetez local, faites vivre votre ville', 'Koop lokaal, houd uw stad levend', 'Kaufen Sie lokal, beleben Sie Ihre Stadt', 'Shop local, keep your town alive', '地元で買って、まちを元気に'),
    collections: [
      { key: 'shops', kind: 'shops', name: T('Les commerces', 'De handelszaken', 'Die Geschäfte', 'The shops', 'お店紹介'), slug: T('commerces', 'handelszaken', 'geschaefte', 'shops', 'omise'),
        seo: T('Tous les commerces membres : catégorie, adresse, horaires d’ouverture et site web, pour acheter local.', 'Alle aangesloten handelszaken: categorie, adres, openingsuren en website, om lokaal te kopen.', 'Alle Mitgliedsgeschäfte: Kategorie, Adresse, Öffnungszeiten und Website, um lokal einzukaufen.', 'All member shops: category, address, opening hours and website, so you can shop local.', '加盟店の一覧。業種、住所、営業時間、ウェブサイト。') },
      { key: 'events', kind: 'events', name: T('Agenda', 'Agenda', 'Termine', 'Events', 'イベント'), slug: T('agenda', 'agenda', 'termine', 'events', 'ibento'),
        seo: T('Braderies, nocturnes et marchés : tous les événements des commerçants de la ville.', 'Braderieën, koopavonden en markten: alle evenementen van de handelaars van de stad.', 'Flohmärkte, lange Einkaufsabende und Märkte: alle Veranstaltungen der Geschäfte.', 'Street sales, late-night shopping and markets: every event from the town’s shops.', '大売り出し、夜間営業、マーケットなど商店会のイベント。') },
      { key: 'news', kind: 'news', name: T('Actualités', 'Nieuws', 'Neuigkeiten', 'News', 'お知らせ'), slug: T('actualites', 'nieuws', 'neuigkeiten', 'news', 'oshirase'),
        seo: T('Les nouvelles de l’association : nouveaux membres, projets communs et vie du centre-ville.', 'Nieuws van de vereniging: nieuwe leden, gezamenlijke projecten en het leven in het centrum.', 'Neuigkeiten des Vereins: neue Mitglieder, gemeinsame Projekte und das Leben in der Innenstadt.', 'News from the association: new members, joint projects and town-centre life.', '商店会のニュース。新しい加盟店、共同の取り組み、まちの話題。') }
    ],
    pages: [
      { key: 'home', seo: T('Les commerçants de la ville réunis : annuaire des boutiques, agenda des braderies et marchés, actualités.', 'De handelaars van de stad samen: winkelgids, agenda van braderieën en markten, nieuws.', 'Die Geschäfte der Stadt vereint: Verzeichnis, Termine für Märkte und Aktionen, Neuigkeiten.', 'The town’s shops together: shop directory, calendar of street sales and markets, news.', 'まちの商店が集まりました。お店紹介、イベント、お知らせ。'),
        build: c => [
          hero(T('Achetez local, faites vivre votre ville', 'Koop lokaal, houd uw stad levend', 'Kaufen Sie lokal, beleben Sie Ihre Stadt', 'Shop local, keep your town alive', '地元で買って、まちを元気に'),
            T('Boutiques, artisans, cafés et restaurants : découvrez les commerçants qui font battre le cœur de la ville.', 'Winkels, ambachtslui, cafés en restaurants: ontdek de handelaars die de stad doen leven.', 'Läden, Handwerker, Cafés und Restaurants: Entdecken Sie die Geschäfte, die die Stadt beleben.', 'Shops, craftspeople, cafés and restaurants: discover the businesses at the heart of town.', '商店、職人、カフェ、レストラン。まちの元気をつくるお店をご紹介します。'),
            T('Trouver un commerce', 'Een winkel vinden', 'Geschäft finden', 'Find a shop', 'お店を探す'), `page:${c.page.shops}`),
          boxes(T('Pourquoi acheter local', 'Waarom lokaal kopen', 'Warum lokal einkaufen', 'Why shop local', '地元で買う理由'), T('Chaque achat ici fait vivre la ville.', 'Elke aankoop hier houdt de stad levend.', 'Jeder Einkauf hier belebt die Stadt.', 'Every purchase here keeps the town alive.', 'ここでの買い物が、まちを支えます。'), [
            ['users', T('Des conseils', 'Advies', 'Beratung', 'Advice', '相談できる'), T('Des commerçants qui connaissent leurs produits.', 'Handelaars die hun producten kennen.', 'Händler, die ihre Produkte kennen.', 'Shopkeepers who know their products.', '商品をよく知る店主がいます。')],
            ['pin', T('Tout près', 'Dichtbij', 'Ganz nah', 'Close by', 'すぐ近く'), T('Moins de trajets, plus de temps pour vous.', 'Minder verplaatsingen, meer tijd voor u.', 'Weniger Wege, mehr Zeit für Sie.', 'Less travel, more time for you.', '移動が少なく、時間にゆとりを。')],
            ['heart', T('Une ville vivante', 'Een levende stad', 'Eine lebendige Stadt', 'A lively town', 'にぎわうまち'), T('Des emplois, des vitrines éclairées, des rues animées.', 'Banen, verlichte etalages, levendige straten.', 'Arbeitsplätze, beleuchtete Schaufenster, belebte Straßen.', 'Jobs, lit-up windows, lively streets.', '雇用と明るいショーウィンドウ、にぎやかな通り。')]
          ]),
          listing(T('Nos commerces', 'Onze handelszaken', 'Unsere Geschäfte', 'Our shops', '加盟店'), c.col.shops, { limit: 4, columns: '4', more: TEXTS.more, link: `page:${c.page.shops}`, bg: 'palette:c6' }),
          listing(T('Prochains événements', 'Volgende evenementen', 'Nächste Veranstaltungen', 'Coming up', '今後のイベント'), c.col.events, { when: 'upcoming', more: TEXTS.more, link: `page:${c.page.events}` }),
          listing(T('Actualités', 'Nieuws', 'Neuigkeiten', 'News', 'お知らせ'), c.col.news, { more: TEXTS.more, link: `page:${c.page.news}`, bg: 'palette:c6' }),
          cta(T('Vous êtes commerçant ?', 'Bent u handelaar?', 'Sie haben ein Geschäft?', 'Do you run a shop?', 'お店を営んでいる方へ'), T('Rejoignez l’association : visibilité, événements communs et entraide.', 'Sluit u aan: zichtbaarheid, gezamenlijke evenementen en onderlinge hulp.', 'Treten Sie bei: Sichtbarkeit, gemeinsame Aktionen und gegenseitige Hilfe.', 'Join the association: visibility, shared events and mutual support.', '加盟すると、宣伝、共同イベント、助け合いが受けられます。'),
            T('Devenir membre', 'Lid worden', 'Mitglied werden', 'Become a member', '加盟する'), `page:${c.page.join}`)
        ] },
      { key: 'shops', collection: 'shops' },
      { key: 'events', collection: 'events' },
      { key: 'news', collection: 'news' },
      { key: 'join', title: T('Devenir membre', 'Lid worden', 'Mitglied werden', 'Become a member', '加盟のご案内'), slug: T('devenir-membre', 'lid-worden', 'mitglied-werden', 'join', 'kamei'),
        seo: T('Rejoindre l’association des commerçants : avantages, formules d’adhésion et réponses à vos questions.', 'Aansluiten bij de handelaarsvereniging: voordelen, lidmaatschapsformules en antwoorden op uw vragen.', 'Dem Händlerverein beitreten: Vorteile, Mitgliedsbeiträge und Antworten auf Ihre Fragen.', 'Joining the shopkeepers’ association: benefits, membership options and answers to your questions.', '商店会への加盟について。特典、会費プラン、よくある質問。'),
        build: c => [
          sec([12], [[h(T('Devenir membre', 'Lid worden', 'Mitglied werden', 'Become a member', '加盟のご案内'), 'h1'),
            txt(T('Ensemble, les commerçants sont plus visibles et plus forts : site commun, événements et entraide.', 'Samen zijn handelaars zichtbaarder en sterker: gezamenlijke website, evenementen en onderlinge hulp.', 'Gemeinsam sind Händler sichtbarer und stärker: gemeinsame Website, Aktionen und Hilfe.', 'Together, shops are more visible and stronger: a shared website, events and mutual support.', '力を合わせれば、お店はもっと目立ち、もっと強くなります。共通サイト、イベント、助け合い。'))]]),
          relinked('pricing', 'pricing', `page:${c.page.contact}`),
          buildSection('faq', { langs: ALL }),
          cta(T('Prêt à nous rejoindre ?', 'Klaar om aan te sluiten?', 'Bereit beizutreten?', 'Ready to join?', '加盟してみませんか？'), T('Écrivez-nous, nous passons vous présenter l’association.', 'Schrijf ons, we komen de vereniging voorstellen.', 'Schreiben Sie uns, wir stellen Ihnen den Verein vor.', 'Write to us and we will come and introduce the association.', 'ご連絡いただければ、お店に伺ってご説明します。'),
            T('Nous écrire', 'Schrijf ons', 'Schreiben Sie uns', 'Write to us', 'メッセージを送る'), `page:${c.page.contact}`)
        ] },
      { key: 'contact', title: TEXTS.contactTitle, slug: T('contact', 'contact', 'kontakt', 'contact', 'otoiawase'), seo: TEXTS.contactSeo,
        build: () => [sec([12], [[h(TEXTS.contactTitle, 'h1'), txt(TEXTS.contactText)]]), contact(TEXTS.address)] }
    ]
  },

  event: {
    label: N_('Événement ou festival'),
    description: N_('Accueil, programme, infos pratiques, contact : pour un festival, une fête locale ou une journée thématique.'),
    palette: { c1: '#6d28d9', c2: '#fb923c', c3: '#1e1b4b', c4: '#faf9ff', c5: '#4c4f6b', c6: '#ffffff' },
    fonts: { heading: 'archivo', body: 'dm-sans' }, form: 'asbl',
    name: T('Notre festival', 'Ons festival', 'Unser Festival', 'Our festival', 'わたしたちのフェスティバル'),
    tagline: T('Deux jours de fête pour tous', 'Twee dagen feest voor iedereen', 'Zwei Tage Fest für alle', 'Two days of celebration for everyone', 'みんなで楽しむ2日間'),
    collections: [
      { key: 'program', kind: 'events', name: T('Programme', 'Programma', 'Programm', 'Programme', 'プログラム'), slug: T('programme', 'programma', 'programm', 'programme', 'puroguramu'),
        seo: T('Le programme heure par heure : concerts, ateliers pour enfants et spectacle de clôture.', 'Het programma uur per uur: concerten, workshops voor kinderen en slotvoorstelling.', 'Das Programm Stunde für Stunde: Konzerte, Kinderworkshops und Abschlussvorstellung.', 'The programme hour by hour: concerts, children’s workshops and closing show.', 'コンサート、子ども向けワークショップ、クロージングまで、時間ごとのプログラム。') }
    ],
    pages: [
      { key: 'home', seo: T('Deux jours de concerts, d’ateliers et de rencontres pour toute la famille : programme, billets et accès.', 'Twee dagen concerten, workshops en ontmoetingen voor het hele gezin: programma, tickets en bereikbaarheid.', 'Zwei Tage Konzerte, Workshops und Begegnungen für die ganze Familie: Programm, Tickets und Anfahrt.', 'Two days of concerts, workshops and meetings for the whole family: programme, tickets and getting here.', '家族みんなで楽しめるコンサートとワークショップの2日間。プログラム、チケット、アクセス。'),
        build: c => [
          hero(T('Le rendez-vous de l’année', 'De afspraak van het jaar', 'Das Ereignis des Jahres', 'The event of the year', '今年いちばんのお祭り'),
            T('Concerts, ateliers et spectacles : deux jours de fête, en plein cœur de la ville.', 'Concerten, workshops en voorstellingen: twee dagen feest, midden in de stad.', 'Konzerte, Workshops und Shows: zwei Festtage mitten in der Stadt.', 'Concerts, workshops and shows: two days of celebration in the heart of town.', 'コンサート、ワークショップ、ショー。まちの真ん中で2日間のお祭り。'),
            T('Voir le programme', 'Bekijk het programma', 'Zum Programm', 'See the programme', 'プログラムを見る'), `page:${c.page.program}`),
          sec([12], [[w('stats', { items: [
            { value: '2', label: T('jours de fête', 'feestdagen', 'Festtage', 'days of celebration', '日間の開催') },
            { value: '20', label: T('concerts et spectacles', 'concerten en voorstellingen', 'Konzerte und Shows', 'concerts and shows', 'のステージ') },
            { value: '0 €', label: T('pour les moins de 12 ans', 'voor kinderen onder 12', 'für Kinder unter 12', 'for under-12s', '12歳以下は無料') }
          ] })]], { bg: 'palette:c6' }),
          listing(T('Au programme', 'Op het programma', 'Auf dem Programm', 'On the programme', 'プログラム'), c.col.program, { limit: 4, columns: '2', more: TEXTS.more, link: `page:${c.page.program}` }),
          cta(T('Prêts pour la fête ?', 'Klaar voor het feest?', 'Bereit für das Fest?', 'Ready to celebrate?', '準備はいいですか？'), T('Billets, accès, accessibilité : toutes les infos pratiques.', 'Tickets, bereikbaarheid, toegankelijkheid: alle praktische info.', 'Tickets, Anfahrt, Barrierefreiheit: alle praktischen Infos.', 'Tickets, getting here, accessibility: all the practical information.', 'チケット、アクセス、バリアフリー情報はこちら。'),
            T('Infos pratiques', 'Praktische info', 'Praktische Infos', 'Practical information', 'ご来場案内'), `page:${c.page.info}`)
        ] },
      { key: 'program', collection: 'program' },
      { key: 'info', title: T('Infos pratiques', 'Praktische info', 'Praktische Infos', 'Practical information', 'ご来場案内'), slug: T('infos-pratiques', 'praktische-info', 'praktische-infos', 'practical-information', 'goraijou-annai'),
        seo: T('Billets, accès en train et en voiture, accessibilité et questions fréquentes pour bien préparer votre venue.', 'Tickets, met de trein of auto, toegankelijkheid en veelgestelde vragen om uw bezoek voor te bereiden.', 'Tickets, Anreise mit Bahn und Auto, Barrierefreiheit und häufige Fragen für Ihren Besuch.', 'Tickets, getting here by train or car, accessibility and frequently asked questions to plan your visit.', 'チケット、電車・車でのアクセス、バリアフリー、よくある質問。'),
        build: () => [
          sec([12], [[h(T('Infos pratiques', 'Praktische info', 'Praktische Infos', 'Practical information', 'ご来場案内'), 'h1')]]),
          boxes(T('Bien préparer votre venue', 'Uw bezoek goed voorbereiden', 'Ihren Besuch vorbereiten', 'Planning your visit', 'ご来場の前に'), T('Tout ce qu’il faut savoir avant de venir.', 'Alles wat u moet weten voor u komt.', 'Alles, was Sie vorher wissen sollten.', 'Everything to know before you come.', 'お越しの前に知っておきたいこと。'), [
            ['tag', T('Billets', 'Tickets', 'Tickets', 'Tickets', 'チケット'), T('En prévente en ligne et sur place, gratuit pour les moins de 12 ans.', 'In voorverkoop online en ter plaatse, gratis voor kinderen onder 12.', 'Im Vorverkauf online und vor Ort, gratis für Kinder unter 12.', 'On sale online and on site, free for under-12s.', 'オンラインと会場で販売。12歳以下は無料。')],
            ['pin', T('Accès', 'Bereikbaarheid', 'Anfahrt', 'Getting here', 'アクセス'), T('À 10 minutes à pied de la gare, parkings fléchés.', 'Op 10 minuten wandelen van het station, bewegwijzerde parkings.', '10 Gehminuten vom Bahnhof, ausgeschilderte Parkplätze.', 'A 10-minute walk from the station, signposted car parks.', '駅から徒歩10分、駐車場は案内表示あり。')],
            ['heart', T('Accessibilité', 'Toegankelijkheid', 'Barrierefreiheit', 'Accessibility', 'バリアフリー'), T('Site accessible en fauteuil roulant, espace calme pour les familles.', 'Terrein toegankelijk met rolstoel, rustige ruimte voor gezinnen.', 'Gelände rollstuhlgerecht, ruhiger Bereich für Familien.', 'Wheelchair-accessible site, quiet area for families.', '車いすで移動でき、家族向けの静かなスペースもあります。')]
          ]),
          sec([12], [[w('map', { address: TEXTS.address, height: '320' })]]),
          buildSection('faq', { langs: ALL })
        ] },
      { key: 'contact', title: TEXTS.contactTitle, slug: T('contact', 'contact', 'kontakt', 'contact', 'otoiawase'), seo: TEXTS.contactSeo,
        build: () => [sec([12], [[h(TEXTS.contactTitle, 'h1'), txt(TEXTS.contactText)]]), contact(TEXTS.address)] }
    ]
  }
};

/* Liste affichée dans « Nouveau site » : cinq modèles et le site vide */
export const SITE_TEMPLATES = [
  ...Object.entries(SITE_DEFS).map(([id, d]) => ({ id, label: d.label, description: d.description, thumb: THUMBS[id] })),
  { id: 'blank', label: N_('Site vide'), description: N_('Une page d’accueil vide : vous construisez tout vous-même.'), thumb: THUMBS.blank }
];

/* ---------- Assemblage ---------- */
const pick = (t, langs) => Object.fromEntries(langs.map(l => [l, t[l] ?? t.fr]));

/* Adresse de page par langue : celle de la langue principale, puis les autres si elles diffèrent */
function slugsOf(t, langs) {
  const main = slugify(t[langs[0]]) || 'page';
  const others = {};
  for (const l of langs.slice(1)) { const v = slugify(t[l]); if (v && v !== main) others[l] = v; }
  return { slug: main, slugs: others };
}

function rootOf(sections, langs) {
  const root = createNode('page');
  root.children = sections.map(s => localizeTree(s, langs));
  return root;
}

/* Collection, sa page de liste (titre, introduction, adresses traduites) et ses exemples */
function addCollection(s, spec, domain, langs, today) {
  const r = createCollectionWithPage(s, { kind: spec.kind, name: spec.name[langs[0]], withPage: true, examples: true, today, domain, langs });
  let site = r.site;
  const { slug, slugs } = slugsOf(spec.slug, langs);
  site = setCollectionMeta(site, r.id, { slug });
  for (const [l, v] of Object.entries(slugs)) site = setCollectionMeta(site, r.id, { slug: v, lang: l });
  const page = site.pages.find(p => p.id === r.pageId);
  Object.assign(page, { slug, slugs, title: pick(spec.name, langs), seo: { description: pick(spec.seo, langs) } });
  const cell = page.root.children[0].children[0].children[0];
  cell.children[0].props.text = Object.fromEntries(langs.map(l => [l, escapeHtml(spec.name[l] ?? spec.name.fr)]));
  cell.children.splice(1, 0, localizeTree(txt(spec.seo, { color: 'palette:c5' }), langs));
  return { site, id: r.id, pageId: r.pageId };
}

/* Pages légales (cycle 29) avec des champs « à compléter » signalés par le contrôle avant export */
function legalPages(s, def, langs) {
  const todo = TO_COMPLETE[langs[0]] || TO_COMPLETE.fr;
  return addLegalPages(s, { name: s.name, form: def.form, seat: todo, number: '0000.000.000', email: 'contact@example.com', host: todo }).site;
}

/*
 * Site complet d'après un modèle. name : nom du site (défaut : nom du modèle dans la langue principale) ; main : langue
 * principale ; others : autres langues ; today : date de référence des exemples datés (AAAA-MM-JJ).
 */
export function buildTemplate(id, { name, main = 'fr', others, today } = {}) {
  if (id === 'blank') return blankSite({ name, main, others });
  const def = SITE_DEFS[id];
  if (!def) throw new Error(__('Modèle de site inconnu : {id}', { id: String(id).slice(0, 40) }));
  const base = blankSite({ name, main, others });
  const langs = base.languages;
  const lang = langs[0];
  let s = { ...base, name: String(name ?? '').trim() ? base.name : def.name[lang] };
  s.theme = { ...s.theme, palette: { ...def.palette }, fonts: { ...def.fonts } };
  s.footer = { text: Object.fromEntries(langs.map(l => [l, `© ${s.name} – ${def.tagline[l]}`])) };
  const ctx = { col: {}, page: {} };
  const specs = Object.fromEntries(def.collections.map(c => [c.key, c]));
  for (const spec of def.collections) {
    const r = addCollection(s, spec, id, langs, today);
    s = r.site;
    ctx.col[spec.key] = r.id;
    ctx.page[spec.key] = r.pageId;
  }
  const home = s.pages[0];
  for (const p of def.pages) if (!p.collection && p.key !== 'home') ctx.page[p.key] = newPageId();
  ctx.page.home = home.id;
  const pages = def.pages.map(p => {
    if (p.collection) {
      const page = s.pages.find(x => x.id === ctx.page[p.collection]);
      const after = specs[p.collection].after?.() || [];
      page.root.children.push(...after.map(x => localizeTree(x, langs)));
      return page;
    }
    if (p.key === 'home') {
      const seo = { title: Object.fromEntries(langs.map(l => [l, `${s.name} – ${def.tagline[l]}`])), description: pick(p.seo, langs) };
      return { ...home, title: pick(HOME_TITLES, langs), seo, root: rootOf(p.build(ctx), langs) };
    }
    return { id: ctx.page[p.key], ...slugsOf(p.slug, langs), title: pick(p.title, langs), seo: { description: pick(p.seo, langs) }, root: rootOf(p.build(ctx), langs) };
  });
  s = { ...s, pages };
  s = customizeFooter(customizeHeader(s));
  return legalPages(s, def, langs);
}

export { buildTemplate as buildSiteTemplate };
