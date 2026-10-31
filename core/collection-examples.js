/*
 * Exemples de contenus des collections (cycle 28, A8) : par domaine (association ou média, tourisme, commerce local,
 * association de commerçants, événement) et dans les cinq langues du site. Les dates sont relatives (jours après
 * « aujourd'hui ») et calculées par exampleValues (core/collections.js). Contenu du site, pas de l'interface.
 */
const L = (fr, nl, de, en, ja) => ({ fr, nl, de, en, ja });
const P = (fr, nl, de, en, ja) => L(`<p>${fr}</p>`, `<p>${nl}</p>`, `<p>${de}</p>`, `<p>${en}</p>`, `<p>${ja}</p>`);
const SAMPLE = L('(exemple à remplacer)', '(voorbeeld om te vervangen)', '(Beispiel, bitte ersetzen)', '(example to replace)', '（差し替え用の例）');
const ex = (fr, nl, de, en, ja) => P(`${fr} ${SAMPLE.fr}`, `${nl} ${SAMPLE.nl}`, `${de} ${SAMPLE.de}`, `${en} ${SAMPLE.en}`, `${ja}${SAMPLE.ja}`);
const ADDR = L('Rue de l’Exemple 1, 5000 Namur', 'Voorbeeldstraat 1, 5000 Namen', 'Beispielstraße 1, 5000 Namur', '1 Example Street, 5000 Namur', '〒000-0000 ○○県○○町1-1');
const WEB = 'https://www.example.com';

/* Libellés des catégories de commerces (type de collection « shops ») */
export const SHOP_CATEGORIES = [
  ['food', L('Alimentation', 'Voeding', 'Lebensmittel', 'Food', '食料品')],
  ['horeca', L('Restaurant et café', 'Restaurant en café', 'Restaurant und Café', 'Restaurant and café', '飲食店')],
  ['fashion', L('Mode et beauté', 'Mode en schoonheid', 'Mode und Schönheit', 'Fashion and beauty', 'ファッション・美容')],
  ['home', L('Maison et jardin', 'Huis en tuin', 'Haus und Garten', 'Home and garden', '住まい・園芸')],
  ['crafts', L('Artisanat', 'Ambacht', 'Handwerk', 'Crafts', '工芸・手仕事')],
  ['services', L('Services', 'Diensten', 'Dienstleistungen', 'Services', 'サービス')],
  ['leisure', L('Loisirs et culture', 'Vrije tijd en cultuur', 'Freizeit und Kultur', 'Leisure and culture', 'レジャー・文化')]
];

const HOURS_SHOP = L('Du mardi au samedi, 9 h – 18 h', 'Dinsdag tot zaterdag, 9 – 18 u', 'Dienstag bis Samstag, 9–18 Uhr', 'Tuesday to Saturday, 9 am – 6 pm', '火〜土曜 9:00〜18:00');
const HOURS_CAFE = L('Tous les jours sauf lundi, 8 h – 22 h', 'Elke dag behalve maandag, 8 – 22 u', 'Täglich außer Montag, 8–22 Uhr', 'Every day except Monday, 8 am – 10 pm', '月曜定休 8:00〜22:00');
const HOURS_BAKERY = L('Du mardi au dimanche, 7 h – 13 h', 'Dinsdag tot zondag, 7 – 13 u', 'Dienstag bis Sonntag, 7–13 Uhr', 'Tuesday to Sunday, 7 am – 1 pm', '火〜日曜 7:00〜13:00');

const SHOPS = [
  { name: L('Boulangerie du Centre', 'Bakkerij Centrum', 'Bäckerei im Zentrum', 'Centre Bakery', 'まちなかベーカリー'), category: 'food', address: ADDR, hours: HOURS_BAKERY, phone: '+32 81 00 00 01', website: WEB,
    intro: ex('Pain au levain, viennoiseries et pâtisseries maison.', 'Zuurdesembrood, koffiekoeken en huisgemaakt gebak.', 'Sauerteigbrot, Gebäck und hausgemachte Kuchen.', 'Sourdough bread, pastries and home-made cakes.', '天然酵母パンと焼き菓子の店。') },
  { name: L('Café de la Place', 'Café aan het Plein', 'Café am Platz', 'The Square Café', '広場のカフェ'), category: 'horeca', address: ADDR, hours: HOURS_CAFE, phone: '+32 81 00 00 02', website: WEB,
    intro: ex('Petite restauration, produits locaux et terrasse au soleil.', 'Lichte maaltijden, lokale producten en een zonnig terras.', 'Kleine Gerichte, regionale Produkte und Sonnenterrasse.', 'Light meals, local produce and a sunny terrace.', '地元食材の軽食と日当たりのよいテラス。') },
  { name: L('Fleurs et Jardin', 'Bloem en Tuin', 'Blumen und Garten', 'Flowers and Garden', '花と庭'), category: 'home', address: ADDR, hours: HOURS_SHOP, phone: '+32 81 00 00 03', website: WEB,
    intro: ex('Fleuriste et plantes de saison, conseils pour votre jardin.', 'Bloemist en seizoensplanten, advies voor uw tuin.', 'Floristik und Saisonpflanzen, Beratung für Ihren Garten.', 'Florist and seasonal plants, advice for your garden.', '季節の花と鉢植え、庭づくりの相談も。') },
  { name: L('Atelier du Cuir', 'Lederatelier', 'Lederwerkstatt', 'The Leather Workshop', '革工房'), category: 'crafts', address: ADDR, hours: HOURS_SHOP, phone: '+32 81 00 00 04', website: WEB,
    intro: ex('Maroquinerie faite main et réparations sur place.', 'Handgemaakte lederwaren en herstellingen ter plaatse.', 'Handgefertigte Lederwaren und Reparaturen vor Ort.', 'Hand-made leather goods and repairs on site.', '手作りの革製品と修理。') }
];

/* Exemple d'événement : décalage en jours, heures, lieu, description */
const ev = (days, title, place, description, extra = {}) => ({ days, title, place, address: ADDR, description, ...extra });

export const EXAMPLES = {
  association: {
    members: [
      { name: 'Radio Vallée', city: L('Couvin', 'Couvin', 'Couvin', 'Couvin', 'クーヴァン'), type: 'radio', intro: ex('Radio associative de la vallée.', 'Vrije radio uit de vallei.', 'Freies Radio aus dem Tal.', 'Community radio from the valley.', '谷のコミュニティラジオ。') },
      { name: 'TV Quartiers', city: L('Liège', 'Luik', 'Lüttich', 'Liège', 'リエージュ'), type: 'tv', intro: ex('Télévision de proximité faite par et pour les habitants.', 'Buurttelevisie door en voor de bewoners.', 'Lokalfernsehen von und für die Bewohner.', 'Local television made by and for residents.', '住民による住民のための地域テレビ。') },
      { name: 'Le Journal des Communes', city: L('Namur', 'Namen', 'Namur', 'Namur', 'ナミュール'), type: 'press', intro: ex('Mensuel indépendant d’information locale.', 'Onafhankelijk lokaal maandblad.', 'Unabhängige lokale Monatszeitung.', 'Independent local monthly paper.', '地域の独立系月刊紙。') }
    ],
    news: [
      { days: -3, title: L('Notre nouveau site est en ligne', 'Onze nieuwe website staat online', 'Unsere neue Website ist online', 'Our new website is live', '新しいウェブサイトを公開しました'),
        excerpt: L('Toutes nos activités, enfin réunies au même endroit.', 'Al onze activiteiten eindelijk op één plek.', 'Alle unsere Aktivitäten endlich an einem Ort.', 'All our activities, finally in one place.', '活動のすべてを、ひとつの場所で。'),
        body: ex('Présentez ici la nouvelle en quelques paragraphes.', 'Vertel het nieuws hier in enkele alinea’s.', 'Erzählen Sie die Neuigkeit hier in einigen Absätzen.', 'Tell the news here in a few paragraphs.', 'ここにお知らせの本文を書きます。') },
      { days: -20, title: L('Appel à bénévoles', 'Oproep aan vrijwilligers', 'Freiwillige gesucht', 'Call for volunteers', 'ボランティア募集'),
        excerpt: L('Quelques heures par mois suffisent pour nous aider.', 'Enkele uren per maand volstaan om ons te helpen.', 'Ein paar Stunden im Monat helfen uns schon.', 'A few hours a month is enough to help us.', '月に数時間からお手伝いいただけます。'),
        body: ex('Expliquez les missions proposées et comment s’inscrire.', 'Leg uit welke taken er zijn en hoe men zich inschrijft.', 'Beschreiben Sie die Aufgaben und wie man sich meldet.', 'Explain the tasks on offer and how to sign up.', '募集内容と申し込み方法を説明します。') },
      { days: -40, title: L('Retour sur l’assemblée générale', 'Terugblik op de algemene vergadering', 'Rückblick auf die Mitgliederversammlung', 'Looking back at the general meeting', '総会のご報告'),
        excerpt: L('Les décisions prises et les projets de l’année.', 'De genomen beslissingen en de plannen voor het jaar.', 'Die Beschlüsse und die Vorhaben des Jahres.', 'The decisions taken and this year’s plans.', '決定事項と今年の計画。'),
        body: ex('Résumez les points importants.', 'Vat de belangrijkste punten samen.', 'Fassen Sie die wichtigsten Punkte zusammen.', 'Sum up the main points.', '主なポイントをまとめます。') }
    ],
    events: [
      ev(14, L('Assemblée générale', 'Algemene vergadering', 'Mitgliederversammlung', 'General meeting', '総会'), L('Maison des associations', 'Verenigingshuis', 'Haus der Vereine', 'Community centre', '市民活動センター'),
        ex('Ouverte à tous les membres.', 'Open voor alle leden.', 'Offen für alle Mitglieder.', 'Open to all members.', '会員どなたでも参加できます。'), { time: '19:00' }),
      ev(28, L('Atelier : tourner avec un smartphone', 'Workshop: filmen met een smartphone', 'Workshop: Filmen mit dem Smartphone', 'Workshop: filming with a smartphone', 'ワークショップ：スマホで動画撮影'), L('Studio partagé', 'Gedeelde studio', 'Gemeinsames Studio', 'Shared studio', '共同スタジオ'),
        ex('Initiation pratique, sans prérequis.', 'Praktische initiatie, geen voorkennis nodig.', 'Praktische Einführung, ohne Vorkenntnisse.', 'Hands-on introduction, no experience needed.', '初心者向けの実践講座です。'), { time: '14:00', endTime: '17:00' }),
      ev(45, L('Fête annuelle', 'Jaarlijks feest', 'Jahresfest', 'Annual party', '年次フェスティバル'), L('Centre culturel', 'Cultureel centrum', 'Kulturzentrum', 'Arts centre', '文化センター'),
        ex('Deux jours de rencontres et de concerts.', 'Twee dagen ontmoetingen en concerten.', 'Zwei Tage Begegnungen und Konzerte.', 'Two days of meetings and concerts.', '交流とコンサートの2日間。'), { endDays: 46 })
    ],
    custom: [
      { title: L('Premier élément', 'Eerste item', 'Erster Eintrag', 'First item', '項目 その1'), text: ex('Texte de présentation.', 'Voorstellingstekst.', 'Vorstellungstext.', 'Introduction text.', '紹介文。') },
      { title: L('Deuxième élément', 'Tweede item', 'Zweiter Eintrag', 'Second item', '項目 その2'), text: ex('Texte de présentation.', 'Voorstellingstekst.', 'Vorstellungstext.', 'Introduction text.', '紹介文。') },
      { title: L('Troisième élément', 'Derde item', 'Dritter Eintrag', 'Third item', '項目 その3'), text: ex('Texte de présentation.', 'Voorstellingstekst.', 'Vorstellungstext.', 'Introduction text.', '紹介文。') }
    ],
    shops: SHOPS.slice(0, 3)
  },
  tourism: {
    events: [
      ev(6, L('Marché du terroir', 'Streekmarkt', 'Bauernmarkt', 'Local produce market', '産直マルシェ'), L('Place communale', 'Gemeenteplein', 'Gemeindeplatz', 'Village square', '役場前広場'),
        ex('Producteurs locaux, dégustations et animations.', 'Lokale producenten, proeverijen en animatie.', 'Regionale Erzeuger, Verkostungen und Unterhaltung.', 'Local producers, tastings and entertainment.', '地元の生産者が集まる試食とイベントの市。'), { time: '08:00', endTime: '13:00' }),
      ev(13, L('Balade guidée au lever du soleil', 'Begeleide wandeling bij zonsopgang', 'Geführte Wanderung bei Sonnenaufgang', 'Guided sunrise walk', '朝日を見るガイド付き散策'), L('Office du tourisme', 'Toerismebureau', 'Touristinformation', 'Tourist office', '観光案内所'),
        ex('Inscription conseillée, bonnes chaussures indispensables.', 'Inschrijving aangeraden, goede schoenen noodzakelijk.', 'Anmeldung empfohlen, gutes Schuhwerk nötig.', 'Booking advised, good shoes essential.', '要予約、歩きやすい靴でご参加ください。'), { time: '06:30', endTime: '09:00' }),
      ev(20, L('Concert en plein air', 'Openluchtconcert', 'Open-Air-Konzert', 'Open-air concert', '野外コンサート'), L('Parc du château', 'Kasteelpark', 'Schlosspark', 'Castle park', '城跡公園'),
        ex('Musique sous les étoiles, entrée libre.', 'Muziek onder de sterren, gratis toegang.', 'Musik unter den Sternen, Eintritt frei.', 'Music under the stars, free entry.', '星空の下の音楽会、入場無料。'), { time: '20:00' }),
      ev(34, L('Fête des récoltes', 'Oogstfeest', 'Erntefest', 'Harvest festival', '収穫祭'), L('Centre du village', 'Dorpskern', 'Dorfmitte', 'Village centre', '町の中心部'),
        ex('Deux jours de fête, de produits locaux et de musique.', 'Twee dagen feest, lokale producten en muziek.', 'Zwei Tage Fest, regionale Produkte und Musik.', 'Two days of festivities, local produce and music.', '地元の味と音楽を楽しむ2日間。'), { endDays: 35 })
    ],
    custom: [
      { title: L('Le belvédère', 'Het uitkijkpunt', 'Der Aussichtspunkt', 'The viewpoint', '展望台'), text: ex('Vue panoramique sur la vallée, à 20 minutes à pied.', 'Panoramisch uitzicht over de vallei, op 20 minuten wandelen.', 'Panoramablick über das Tal, 20 Minuten zu Fuß.', 'Panoramic view over the valley, a 20-minute walk.', '谷を一望できる展望台。徒歩20分。') },
      { title: L('Le vieux pont', 'De oude brug', 'Die alte Brücke', 'The old bridge', '古い石橋'), text: ex('Pont de pierre du XVIIIe siècle, au bord de la rivière.', 'Stenen brug uit de 18e eeuw, aan de rivier.', 'Steinbrücke aus dem 18. Jahrhundert am Fluss.', '18th-century stone bridge by the river.', '川辺に残る18世紀の石橋。') },
      { title: L('Le musée local', 'Het lokale museum', 'Das Heimatmuseum', 'The local museum', '郷土資料館'), text: ex('L’histoire et les traditions de la région.', 'De geschiedenis en tradities van de streek.', 'Geschichte und Bräuche der Region.', 'The history and traditions of the area.', '地域の歴史と伝統を紹介。') }
    ]
  },
  shop: {
    custom: [
      { title: L('Notre spécialité', 'Onze specialiteit', 'Unsere Spezialität', 'Our speciality', '当店の看板商品'), text: ex('Ce qui fait votre réputation, en deux phrases.', 'Waar u bekend om staat, in twee zinnen.', 'Wofür Sie bekannt sind, in zwei Sätzen.', 'What you are known for, in two sentences.', 'お店の自慢を2文で。') },
      { title: L('La suggestion du moment', 'De suggestie van het moment', 'Der aktuelle Tipp', 'This season’s pick', '今月のおすすめ'), text: ex('Un produit ou un service de saison.', 'Een seizoensproduct of -dienst.', 'Ein saisonales Produkt oder Angebot.', 'A seasonal product or service.', '季節の商品やサービス。') },
      { title: L('Sur commande', 'Op bestelling', 'Auf Bestellung', 'Made to order', 'ご注文・オーダーメイド'), text: ex('Ce que vous préparez à la demande, et le délai.', 'Wat u op aanvraag maakt, en de termijn.', 'Was Sie auf Anfrage fertigen, und die Lieferzeit.', 'What you make on request, and how long it takes.', 'ご要望に応じた品と、お渡しまでの目安。') }
    ],
    events: [
      ev(10, L('Journée portes ouvertes', 'Opendeurdag', 'Tag der offenen Tür', 'Open day', 'オープンデー'), L('À la boutique', 'In de winkel', 'Im Geschäft', 'At the shop', '店舗にて'),
        ex('Démonstrations et dégustation offertes.', 'Demonstraties en gratis proeverij.', 'Vorführungen und kostenlose Verkostung.', 'Demonstrations and free tasting.', '実演と無料試食があります。'), { time: '10:00', endTime: '17:00' }),
      ev(24, L('Atelier découverte', 'Ontdekkingsworkshop', 'Schnupperworkshop', 'Taster workshop', '体験ワークショップ'), L('À l’atelier', 'In het atelier', 'In der Werkstatt', 'At the workshop', '工房にて'),
        ex('Places limitées, sur inscription.', 'Beperkte plaatsen, op inschrijving.', 'Begrenzte Plätze, mit Anmeldung.', 'Limited places, booking required.', '定員制・要予約。'), { time: '14:00', endTime: '16:00' }),
      ev(40, L('Soirée nouveautés', 'Avond van de nieuwigheden', 'Neuheiten-Abend', 'New arrivals evening', '新商品の夕べ'), L('À la boutique', 'In de winkel', 'Im Geschäft', 'At the shop', '店舗にて'),
        ex('Découvrez la nouvelle collection autour d’un verre.', 'Ontdek de nieuwe collectie bij een drankje.', 'Entdecken Sie die neue Kollektion bei einem Glas.', 'Discover the new range over a drink.', '新作をドリンクとともにご紹介。'), { time: '18:30' })
    ]
  },
  merchants: {
    shops: SHOPS,
    events: [
      ev(9, L('Grande braderie', 'Grote braderie', 'Großer Flohmarkt der Geschäfte', 'Big street sale', '大売り出し'), L('Rues du centre', 'Straten in het centrum', 'Straßen der Innenstadt', 'Town-centre streets', '中心商店街'),
        ex('Toutes les boutiques sur le trottoir, bonnes affaires garanties.', 'Alle winkels op de stoep, koopjes gegarandeerd.', 'Alle Geschäfte auf dem Gehweg, Schnäppchen garantiert.', 'Every shop out on the pavement, bargains guaranteed.', '各店が店頭に並ぶお得なセール。'), { time: '09:00', endTime: '18:00' }),
      ev(30, L('Nocturne des commerçants', 'Koopavond', 'Langer Einkaufsabend', 'Late-night shopping', '夜間営業イベント'), L('Centre-ville', 'Stadscentrum', 'Innenstadt', 'Town centre', '中心市街地'),
        ex('Boutiques ouvertes jusqu’à 22 h, animations et vin chaud.', 'Winkels open tot 22 uur, animatie en glühwein.', 'Geschäfte bis 22 Uhr geöffnet, Programm und Glühwein.', 'Shops open until 10 pm, entertainment and mulled wine.', '22時まで営業、催しとホットワインも。'), { time: '18:00', endTime: '22:00' }),
      ev(50, L('Marché de fin d’année', 'Eindejaarsmarkt', 'Jahresendmarkt', 'End-of-year market', '年末マーケット'), L('Place du marché', 'Marktplein', 'Marktplatz', 'Market square', '市場広場'),
        ex('Chalets des commerçants et artisans de la ville.', 'Chalets van de handelaars en ambachtslui van de stad.', 'Hütten der Händler und Handwerker der Stadt.', 'Stalls from the town’s shops and craftspeople.', 'まちの商店と職人が出店します。'), { endDays: 51 })
    ],
    news: [
      { days: -4, title: L('Bienvenue à nos nouveaux membres', 'Welkom aan onze nieuwe leden', 'Willkommen, neue Mitglieder', 'Welcome to our new members', '新しい会員のご紹介'),
        excerpt: L('Trois commerces rejoignent l’association ce mois-ci.', 'Drie handelszaken sluiten zich deze maand aan.', 'Drei Geschäfte treten diesen Monat bei.', 'Three shops join the association this month.', '今月、3店舗が新たに加盟しました。'),
        body: ex('Présentez les nouveaux membres.', 'Stel de nieuwe leden voor.', 'Stellen Sie die neuen Mitglieder vor.', 'Introduce the new members.', '新会員を紹介します。') },
      { days: -18, title: L('La carte de fidélité commune arrive', 'De gezamenlijke klantenkaart komt eraan', 'Die gemeinsame Kundenkarte kommt', 'The shared loyalty card is coming', '共通ポイントカードが始まります'),
        excerpt: L('Une seule carte pour tous les commerces participants.', 'Eén kaart voor alle deelnemende winkels.', 'Eine Karte für alle teilnehmenden Geschäfte.', 'One card for every participating shop.', '加盟店で使える共通カード。'),
        body: ex('Expliquez le fonctionnement et les avantages.', 'Leg uit hoe het werkt en wat de voordelen zijn.', 'Erklären Sie Ablauf und Vorteile.', 'Explain how it works and the benefits.', '仕組みと特典を説明します。') },
      { days: -35, title: L('Résultats de l’enquête clients', 'Resultaten van de klantenenquête', 'Ergebnisse der Kundenumfrage', 'Customer survey results', 'お客さまアンケートの結果'),
        excerpt: L('Ce que les habitants attendent de leur centre-ville.', 'Wat de inwoners van hun centrum verwachten.', 'Was die Bewohner von ihrer Innenstadt erwarten.', 'What residents want from their town centre.', '住民が中心街に望むこと。'),
        body: ex('Résumez les chiffres clés.', 'Vat de kerncijfers samen.', 'Fassen Sie die wichtigsten Zahlen zusammen.', 'Sum up the key figures.', '主な数字をまとめます。') }
    ]
  },
  event: {
    events: [
      ev(30, L('Ouverture du festival', 'Opening van het festival', 'Festivaleröffnung', 'Festival opening', 'フェスティバル開幕'), L('Grande scène', 'Hoofdpodium', 'Hauptbühne', 'Main stage', 'メインステージ'),
        ex('Mot d’accueil et premier concert.', 'Welkomstwoord en eerste concert.', 'Begrüßung und erstes Konzert.', 'Welcome speech and first concert.', '開会のあいさつと最初のステージ。'), { time: '18:00', endTime: '19:30' }),
      ev(30, L('Concert principal', 'Hoofdconcert', 'Hauptkonzert', 'Headline concert', 'メインコンサート'), L('Grande scène', 'Hoofdpodium', 'Hauptbühne', 'Main stage', 'メインステージ'),
        ex('La tête d’affiche de cette édition.', 'De hoofdact van deze editie.', 'Der Hauptact dieser Ausgabe.', 'This year’s headline act.', '今回のヘッドライナー。'), { time: '21:00', endTime: '23:00' }),
      ev(31, L('Ateliers pour enfants', 'Workshops voor kinderen', 'Workshops für Kinder', 'Children’s workshops', '子ども向けワークショップ'), L('Espace familles', 'Familieruimte', 'Familienbereich', 'Family area', 'ファミリーエリア'),
        ex('Bricolage, maquillage et contes.', 'Knutselen, schminken en verhalen.', 'Basteln, Schminken und Geschichten.', 'Crafts, face painting and stories.', '工作、フェイスペイント、おはなし会。'), { time: '10:00', endTime: '12:00' }),
      ev(31, L('Spectacle de clôture', 'Slotvoorstelling', 'Abschlussvorstellung', 'Closing show', 'クロージングショー'), L('Grande scène', 'Hoofdpodium', 'Hauptbühne', 'Main stage', 'メインステージ'),
        ex('Final en musique et en lumières.', 'Finale met muziek en licht.', 'Finale mit Musik und Licht.', 'A finale of music and lights.', '音と光のフィナーレ。'), { time: '20:00', endTime: '22:00' })
    ]
  }
};

export const EXAMPLE_DOMAINS = Object.keys(EXAMPLES);

/* Exemples d'un type de collection pour un domaine (repli : le domaine « association », puis « personnalisée ») */
export const examplesFor = (kind, domain = 'association') =>
  structuredClone(EXAMPLES[domain]?.[kind] || EXAMPLES.association[kind] || EXAMPLES.association.custom);
