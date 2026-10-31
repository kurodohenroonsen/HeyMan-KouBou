/*
 * Démonstration Kumakōgen (cycle 26) : script déclaratif, sans DOM. Chaque étape a un identifiant, une
 * explication en trois langues (say), les widgets qu'elle montre et une fonction run(d) qui pilote l'éditeur
 * par les vrais boutons (editor/demo-driver.js). Les données sont celles de docs/exemple-kumakogen/donnees.md
 * (faits ✅ seulement) ; les textes reprennent le tutoriel docs/guide/prise-en-main.md.
 */

const L = (ja, en, fr) => ({ ja, en, fr });
const LANGS = ['ja', 'en', 'fr'];

/* Faits cités (tels qu'ils figurent dans donnees.md : un test le vérifie) */
export const DEMO_FACTS = ['584 km²', '800 m', '12,8 °C', '16,8 °C', '24,5 °C', '28,1 °C', '1 982 m', '0892-21-1111', '0892-21-1116', '0892-21-1192', '0892-41-0711', '791-1202', '入野1855-6', '701', '266 marches', '9 km', '34 km', '60 cm', '菅生2-1173-2', '2番耕地1442-7', '東明神', '26148.html', '1er–10 juillet', '23 h 45', '26 avril au 3 septembre', '8 déc. 2025 → 8 mars 2026'];

export const DEMO_DATA = {
  siteName: '久万高原町 観光ガイド（非公式デモ）',
  pages: {
    home: { title: L('ホーム', 'Home', 'Accueil'), seo: L('愛媛県の中央、標高約800mの高原のまち・久万高原町の見どころと四季を紹介する非公式デモサイトです。', 'Unofficial demo site: the sights and seasons of Kumakōgen, a highland town about 800 m up in central Ehime.', 'Site de démonstration non officiel : les sites et les saisons de Kumakōgen, commune de montagne au centre d’Ehime.') },
    agenda: { title: L('イベント・アクセス', 'Events & access', 'Agenda & accès'), slug: 'agenda', seo: L('久万高原町の主なイベント、松山からの行き方、問い合わせ先、入館料をまとめました（非公式デモ）。', 'Main events in Kumakōgen, how to get there from Matsuyama, contacts and admission prices (unofficial demo).', 'Les grands rendez-vous de Kumakōgen, l’accès depuis Matsuyama, les contacts et les tarifs (démonstration non officielle).') }
  },
  palette: { c1: '#2f6b4f', c2: '#c8902e' },
  footer: L('非公式のデモサイトです。データ：久万高原町、久万高原町観光協会、愛媛県、気象庁、四国ツーリズム創造機構、日本政府観光局（2026年10月29日確認）。イラストはオリジナルです。', 'Unofficial demo site. Data: Kumakōgen Town, Kumakōgen Tourism Association, Ehime Prefecture, Japan Meteorological Agency, Shikoku Tourism, JNTO (checked on 29 October 2026). Original illustrations.', 'Site de démonstration non officiel. Données : commune de Kumakōgen, office de tourisme de Kumakōgen, préfecture d’Ehime, Agence météorologique du Japon, Shikoku Tourism, JNTO (vérifiées le 29/10/2026). Illustrations originales.'),
  officialSite: 'https://www.kumakogen.jp/',
  hero: {
    over: L('四国の軽井沢', 'The Karuizawa of Shikoku', 'Le « Karuizawa de Shikoku »'),
    title: L('久万高原町へようこそ', 'Welcome to Kumakōgen', 'Bienvenue à Kumakōgen'),
    text: L('愛媛県のほぼ中央、標高およそ800mの高原のまち。夏は涼しく、冬は雪に包まれます。', 'A highland town in the heart of Ehime, about 800 m above sea level, with cool summers and snowy winters.', 'Une commune de montagne au centre de la préfecture d’Ehime, à environ 800 m d’altitude, aux étés frais et aux hivers enneigés.'),
    b1: L('イベントを見る', 'See the events', 'Voir l’agenda'), b2: L('アクセス', 'Getting here', 'Venir à Kumakōgen'),
    alt: L('高原の風景のイラスト', 'Illustration of a highland landscape', 'Illustration d’un paysage de montagne')
  },
  stats: [
    ['584 km²', L('愛媛県でいちばん広い町', 'the largest municipality in Ehime', 'la plus grande commune d’Ehime')],
    ['≈ 800 m', L('平均標高', 'average altitude', 'altitude moyenne')],
    ['12.8 °C', L('年平均気温（松山は16.8 °C）', 'average yearly temperature (Matsuyama: 16.8 °C)', 'température moyenne annuelle (Matsuyama : 16,8 °C)')],
    ['1982 m', L('石鎚山・西日本最高峰', 'Mt Ishizuchi, highest peak in western Japan', 'mont Ishizuchi, plus haut sommet de l’ouest du Japon')]
  ],
  features: {
    title: L('久万高原町の楽しみ方', 'Three ways to enjoy Kumakōgen', 'Trois façons de découvrir Kumakōgen'),
    intro: L('大自然、お遍路、そして星空。', 'Nature, pilgrimage and starry skies.', 'Nature, pèlerinage et ciel étoilé.'),
    items: [
      ['globe', L('大自然', 'Nature', 'Nature'), L('四国カルストの高原と、エメラルド色の面河渓。', 'The Shikoku Karst plateau and the emerald Omogo Gorge.', 'Le plateau du Shikoku Karst et les gorges émeraude d’Omogo.')],
      ['pin', L('お遍路', 'Pilgrimage', 'Pèlerinage'), L('四国八十八ヶ所の第44番・第45番札所があります。', 'Temples 44 and 45 of the Shikoku 88-temple pilgrimage.', 'Les temples 44 et 45 du pèlerinage des 88 temples de Shikoku.')],
      ['star', L('星空', 'Starry skies', 'Ciel étoilé'), L('口径60cmの望遠鏡を備えた天体観測館。', 'An observatory with a 60 cm telescope.', 'Un observatoire équipé d’un télescope de 60 cm.')]
    ]
  },
  places: {
    title: L('おすすめスポット', 'Places to visit', 'Sites à visiter'),
    items: [
      ['karst', L('四国カルスト', 'Shikoku Karst', 'Shikoku Karst'), L('標高1,000〜1,500mに広がるカルスト台地。牛の放牧と大パノラマが楽しめます。冬は道路が閉鎖されます。', 'A limestone plateau 1,000 to 1,500 m up, with grazing cattle and sweeping views. The road closes in winter.', 'Un plateau calcaire entre 1 000 et 1 500 m d’altitude, avec des vaches en pâture et une vue immense. Route fermée en hiver.')],
      ['gorge', L('面河渓', 'Omogo Gorge', 'Gorges d’Omogo'), L('エメラルドグリーンの清流と奇岩が続く渓谷。秋の紅葉は四国屈指の美しさです。', 'An emerald-water gorge with easy riverside trails, famous for its autumn colours.', 'Une gorge aux eaux émeraude, avec des sentiers faciles et l’un des plus beaux feuillages d’automne de Shikoku.')],
      ['autumn', L('古岩屋', 'Furuiwaya', 'Furuiwaya'), L('円錐形の礫岩峰が林立する国の名勝。紅葉の季節が特に見事です。', 'A cluster of striking conglomerate rock spires, explored on a short loop trail.', 'Une forêt de pitons rocheux étonnants, à parcourir en une courte boucle.')]
    ]
  },
  pilgrimage: {
    title: L('お遍路の道', 'On the pilgrims’ path', 'Sur le chemin des pèlerins'),
    text: L('四国八十八ヶ所霊場のうち、第44番大宝寺と第45番岩屋寺が町内にあります。両寺の間は歩いて約9km、約3時間30分です。', 'Two temples of the Shikoku 88-temple pilgrimage are in Kumakōgen: Daihō-ji (no. 44) and Iwaya-ji (no. 45). They are about 9 km apart on foot, around 3 h 30.', 'Deux temples du pèlerinage des 88 temples de Shikoku sont à Kumakōgen : le Daihō-ji (n° 44) et l’Iwaya-ji (n° 45). Ils sont à environ 9 km l’un de l’autre à pied, soit environ 3 h 30.'),
    items: [
      ['pin', L('第44番 大宝寺：701年創建と伝わる「中札所」', 'No. 44 Daihō-ji: founded in 701, the "middle temple" of the pilgrimage', 'N° 44 Daihō-ji : fondé en 701, le « temple du milieu » du pèlerinage')],
      ['pin', L('第45番 岩屋寺：巨大な岩壁に抱かれた札所（石段は約266段）', 'No. 45 Iwaya-ji: built against a huge rock face (about 266 steps)', 'N° 45 Iwaya-ji : adossé à une immense falaise (environ 266 marches)')],
      ['clock', L('44番から45番まで徒歩約3時間30分', 'From no. 44 to no. 45: about 3 h 30 on foot', 'Du n° 44 au n° 45 : environ 3 h 30 à pied')]
    ],
    alt: L('杉木立の中の寺のイラスト', 'Illustration of a temple among cedars', 'Illustration d’un temple dans les cèdres')
  },
  quote: {
    text: L('ひと・里・森がふれあい　ともに輝く　元気なまち', 'A lively town where people, villages and forests meet and shine together', 'Une commune vivante où les gens, les villages et la forêt se rencontrent et brillent ensemble'),
    author: '久万高原町',
    role: L('まちの将来像（町の公式サイトより）', 'The town’s vision for the future (official website; our translation)', 'La vision d’avenir de la commune (site officiel ; notre traduction)')
  },
  gallery: {
    title: L('四季の久万高原', 'Kumakōgen through the seasons', 'Kumakōgen au fil des saisons'),
    items: [
      ['karst', L('春〜秋：四国カルストの放牧', 'Spring to autumn: cattle grazing on the Shikoku Karst', 'Du printemps à l’automne : vaches sur le Shikoku Karst')],
      ['stars', L('夏：天体観測館で星空観察', 'Summer: stargazing at the observatory', 'Été : les étoiles à l’observatoire')],
      ['autumn', L('秋：面河渓の紅葉', 'Autumn: autumn colours in the Omogo Gorge', 'Automne : feuillages des gorges d’Omogo')],
      ['snow', L('冬：久万スキーランド', 'Winter: Kuma Ski Land', 'Hiver : Kuma Ski Land')]
    ]
  },
  video: { title: L('動画で見る久万高原町', 'Kumakōgen on video', 'Kumakōgen en vidéo') },
  page2: {
    title: L('イベントとアクセス', 'Events and getting here', 'Agenda et accès'),
    text: L('久万高原町の主なイベントと、松山からの行き方をまとめました。日程は年によって変わることがあります。お出かけ前に公式情報をご確認ください。', 'The main events in Kumakōgen and how to get here from Matsuyama. Dates can change from year to year: please check official information before you go.', 'Les grands rendez-vous de Kumakōgen et l’accès depuis Matsuyama. Les dates peuvent changer d’une année à l’autre : vérifie les informations officielles avant de partir.')
  },
  events: [
    { slug: 'oyamabiraki', title: L('石鎚山お山開き', 'Mt Ishizuchi season opening (O-yamabiraki)', 'Ouverture de la saison du mont Ishizuchi'), date: '2027-07-01', endDate: '2027-07-10', place: '石鎚神社 土小屋遥拝殿 (Tsuchigoya)', description: L('毎年7月1日〜10日。期間中、石鎚スカイラインは午前4時から通行できます。', 'Every year from 1 to 10 July. During the festival, the Ishizuchi Skyline road opens at 4 am.', 'Chaque année du 1er au 10 juillet. Pendant la fête, la route Ishizuchi Skyline ouvre dès 4 h.') },
    { slug: 'joya-no-kane', title: L('大宝寺の除夜の鐘', 'New Year’s Eve bell at Daihō-ji', 'Cloche du Nouvel An au Daihō-ji'), date: '2026-12-31', time: '23:45', place: '大宝寺 Daihō-ji (n° 44)', address: '愛媛県上浮穴郡久万高原町菅生2-1173-2', description: L('どなたでも並んで鐘をつくことができます（無料）。', 'Everyone can queue to ring the bell, free of charge.', 'Chacun peut faire la queue pour sonner la cloche, gratuitement.') },
    { slug: 'kumabi-messe-2026', title: L('久万美メッセ2026「流動」', 'Kumabi Messe 2026 exhibition', 'Exposition Kumabi Messe 2026'), date: '2026-04-26', endDate: '2026-09-03', place: '町立久万美術館 Kuma Art Museum', address: '愛媛県上浮穴郡久万高原町菅生2番耕地1442-7', link: 'https://www.kumakogen.jp/site/muse/26148.html', description: L('町立久万美術館の展覧会。2026年のテーマは「流動」。', 'An exhibition at the Kuma Art Museum; the 2026 theme is "Ryūdō".', 'Une exposition du musée d’art Kuma ; thème 2026 : « Ryūdō ».') },
    { slug: 'kuma-ski-land-2025', title: L('久万スキーランド 2025-26シーズン', 'Kuma Ski Land, 2025-26 season', 'Kuma Ski Land, saison 2025-2026'), date: '2025-12-08', endDate: '2026-03-08', place: '久万スキーランド Kuma Ski Land', address: '愛媛県上浮穴郡久万高原町東明神', description: L('標高900〜1,003mのゲレンデ。ナイターは22時まで。', 'Slopes from 900 to 1,003 m; night skiing until 10 pm.', 'Pistes de 900 à 1 003 m ; ski de nuit jusqu’à 22 h.') }
  ],
  agenda: {
    upcoming: L('これからのイベント', 'Upcoming events', 'Prochains événements'), past: L('これまでのイベント', 'Past events', 'Événements passés'),
    empty: L('現在予定されているイベントはありません。', 'No upcoming events for now.', 'Aucun événement à venir pour l’instant.'),
    addressLabel: L('住所：', 'Address:', 'Adresse :'), more: L('イベント一覧へ', 'All events', 'Tout l’agenda')
  },
  contact: {
    title: L('アクセス・お問い合わせ', 'Getting here & contacts', 'Accès et contacts'),
    text: L('松山から国道33号（三坂峠経由）で約34km、松山ICから町の中心部まで車で約30分です。町内に鉄道の駅はありません。JR松山駅からJR四国バスで約1時間〜1時間10分です。', 'About 34 km from Matsuyama on Route 33 (via the Mikasa Pass), around 30 minutes by car from Matsuyama IC to the town centre. There is no railway station in the town: the JR Shikoku bus from JR Matsuyama Station takes about 1 h to 1 h 10.', 'Environ 34 km depuis Matsuyama par la route nationale 33 (col de Mikasa), soit environ 30 minutes en voiture de l’échangeur Matsuyama IC au centre. Il n’y a pas de gare dans la commune : le bus JR Shikoku met environ 1 h à 1 h 10 depuis la gare JR de Matsuyama.'),
    lines: [
      ['phone', L('久万高原町役場 0892-21-1111', 'Kumakōgen Town Office: +81 892-21-1111', 'Mairie de Kumakōgen : +81 892-21-1111')],
      ['phone', L('観光振興係 0892-21-1116', 'Tourism section of the Town Office: +81 892-21-1116', 'Service du tourisme de la mairie : +81 892-21-1116')],
      ['phone', L('久万高原町観光協会 0892-21-1192', 'Kumakōgen Tourism Association: +81 892-21-1192', 'Office de tourisme de Kumakōgen : +81 892-21-1192')],
      ['pin', L('道の駅 天空の郷さんさん（観光案内 9:00〜17:00）〒791-1202 久万高原町入野1855-6', 'Roadside station Tenkū no Sato Sansan (tourist information, 9 am–5 pm)', 'Aire routière Tenkū no Sato Sansan (information touristique, 9 h–17 h)')]
    ],
    mapAddress: '愛媛県上浮穴郡久万高原町入野1855-6',
    email: 'contact@example.org',
    subject: L('サイトからのお問い合わせ', 'Message from the website', 'Message depuis le site'),
    fields: [L('お名前', 'Name', 'Nom'), L('メールアドレス', 'Email', 'E-mail'), L('メッセージ', 'Message', 'Message')],
    submit: L('送信', 'Send', 'Envoyer'),
    consent: L('いただいた情報は返信のためだけに使います。', 'Your details are only used to reply to you.', 'Vos données servent uniquement à vous répondre.'),
    note: L('公開情報（2026年10月29日確認）', 'Public information, checked on 29 October 2026', 'Données publiques, vérifiées le 29/10/2026')
  },
  faq: {
    title: L('よくある質問', 'Frequently asked questions', 'Questions fréquentes'),
    items: [
      [L('松山からどうやって行けますか？', 'How do I get there from Matsuyama?', 'Comment venir depuis Matsuyama ?'), L('車なら国道33号で約34km、松山ICから町の中心部まで約30分です。バスはJR松山駅からJR四国バスで約1時間〜1時間10分。本数が少ないので、JR四国バスと伊予鉄南予バスの時刻表をご確認ください。', 'By car, about 34 km on Route 33, around 30 minutes from Matsuyama IC to the town centre. By bus, the JR Shikoku bus from JR Matsuyama Station takes about 1 h to 1 h 10. Buses are infrequent: check the JR Shikoku Bus and Iyotetsu Nanyo Bus timetables.', 'En voiture, environ 34 km par la route 33, soit environ 30 minutes de Matsuyama IC au centre. En bus, le bus JR Shikoku met environ 1 h à 1 h 10 depuis la gare JR de Matsuyama. Les bus sont rares : consulte les horaires de JR Shikoku Bus et d’Iyotetsu Nanyo Bus.')],
      [L('町内に駅はありますか？', 'Is there a train station?', 'Y a-t-il une gare ?'), L('町内に鉄道の駅はありません。JR四国バスで「久万中学校前」または「久万高原」まで行き、伊予鉄南予バスや町営バスに乗り換えます。', 'No, there is no railway station in the town. Take the JR Shikoku bus to "Kuma Chūgakkō-mae" or "Kumakōgen", then change to Iyotetsu Nanyo buses or town buses.', 'Non, la commune n’a pas de gare. Le bus JR Shikoku va jusqu’aux arrêts « Kuma Chūgakkō-mae » ou « Kumakōgen » ; on continue avec les bus Iyotetsu Nanyo ou les bus municipaux.')],
      [L('おすすめの季節は？', 'When is the best time to visit?', 'Quelle est la meilleure saison ?'), L('夏は涼しく（8月の平均気温は24.5 °C、松山は28.1 °C）、星空も楽しめます。秋（10月〜11月中旬）は紅葉の季節です。石鎚スカイラインは4月〜11月に通行でき、12月〜3月は閉鎖されます。冬は雪が多く、スキーが楽しめます。', 'Summer is cool (24.5 °C on average in August, against 28.1 °C in Matsuyama) and great for stargazing. Autumn (October to mid-November) brings the autumn colours. The Ishizuchi Skyline road is open from April to November and closed from December to March. Winter is snowy, with skiing.', 'L’été est frais (24,5 °C en moyenne en août, contre 28,1 °C à Matsuyama) et idéal pour les étoiles. L’automne (octobre à mi-novembre) est la saison des feuillages. La route Ishizuchi Skyline est ouverte d’avril à novembre et fermée de décembre à mars. L’hiver est enneigé : on y skie.')],
      [L('どこに泊まれますか？', 'Where can I stay?', 'Où dormir ?'), L('天体観測館のとなりの「久万高原ふるさと旅行村」に、通年のコテージ・バンガローと、4月〜11月末のキャンプ場があります（0892-41-0711）。ほかの宿は観光協会（0892-21-1192）へお問い合わせください。', 'Kumakōgen Furusato Ryokō-mura, next to the observatory, has cabins and bungalows all year and a campsite from April to the end of November (+81 892-41-0711). For other places to stay, contact the Tourism Association (+81 892-21-1192).', 'Le village de vacances Kumakōgen Furusato Ryokō-mura, à côté de l’observatoire, propose des chalets et bungalows toute l’année et un camping d’avril à fin novembre (+81 892-41-0711). Pour les autres hébergements, contacte l’office de tourisme (+81 892-21-1192).')]
    ]
  },
  pricing: {
    title: L('入館料（大人）', 'Admission (adults)', 'Tarifs d’entrée (adultes)'),
    intro: L('2026年10月29日時点の情報です。最新の料金は各施設にご確認ください。', 'Information checked on 29 October 2026: please check prices with each venue.', 'Informations vérifiées le 29/10/2026 : vérifie les tarifs auprès de chaque lieu.'),
    items: [
      { title: L('町立久万美術館', 'Kuma Art Museum', 'Musée d’art Kuma'), price: '¥500', period: L('大人（2026年の展覧会）', 'adults (2026 exhibition)', 'adulte (exposition 2026)'), features: L('<ul><li>9:30〜17:00（入館は16:30まで）</li><li>月曜休館</li></ul>', '<ul><li>9:30 am–5 pm (last entry 4:30 pm)</li><li>Closed on Mondays</li></ul>', '<ul><li>9 h 30–17 h (dernière entrée 16 h 30)</li><li>Fermé le lundi</li></ul>'), button: L('公式ページ', 'Official page', 'Page officielle'), link: 'https://www.kumakogen.jp/site/muse/' },
      { title: L('天体観測館', 'Astronomical Observatory', 'Observatoire astronomique'), price: '¥500', period: L('大人', 'adults', 'adulte'), features: L('<ul><li>観望会：金・土 19:00〜22:00（予約制）</li><li>口径60cmの反射望遠鏡</li></ul>', '<ul><li>Night viewing: Fri &amp; Sat 7–10 pm (booking required)</li><li>60 cm reflecting telescope</li></ul>', '<ul><li>Observation : vendredi et samedi 19 h–22 h, sur réservation</li><li>Télescope à miroir de 60 cm</li></ul>'), badge: L('夏は天の川', 'Milky Way in summer', 'Voie lactée en été') },
      { title: L('上黒岩考古館', 'Kamikuroiwa site museum', 'Musée du site de Kamikuroiwa'), price: '¥100', period: L('大人', 'adults', 'adulte'), features: L('<ul><li>4月〜11月 9:00〜17:00</li><li>月曜休館</li><li>縄文時代の岩陰遺跡</li></ul>', '<ul><li>April–November, 9 am–5 pm</li><li>Closed on Mondays</li><li>Jōmon-period rock shelter</li></ul>', '<ul><li>Avril à novembre, 9 h–17 h</li><li>Fermé le lundi</li><li>Abri sous roche de la période Jōmon</li></ul>') }
    ]
  },
  component: 'Coordonnées',
  preset: 'Bouton principal',
  version: 'Site complet avant publication'
};

/* ---------- Aides du script ---------- */
async function texts(d, key, triple, opts = {}) { for (const l of LANGS) await d.setField(key, triple[l], { ...opts, lang: l }); }
async function listTexts(d, list, i, key, triple) { for (const l of LANGS) await d.setListField(list, i, key, triple[l], { lang: l }); }
const img = (field = 'src') => `#inspector [data-field-wrap="${field}"] input[type="file"]`;
const p = triple => Object.fromEntries(LANGS.map(l => [l, `<p>${triple[l]}</p>`]));

const S = (id, say, widgets, run) => ({ id, say, widgets, run });
const D = DEMO_DATA;

export const DEMO_STEPS = [
  S('intro', L('これから、愛媛県久万高原町の観光サイトを、エディターの本物のボタンだけを使って作ります。2ページ、3言語、23種類のウィジェットをすべて一度は使います。', 'I am going to build a tourist site for Kumakōgen (Ehime, Japan) using only the editor’s real buttons: two pages, three languages, and each of the 23 widgets at least once.', 'Je vais construire le site touristique de Kumakōgen (Ehime, Japon) en n’utilisant que les vrais boutons de l’éditeur : deux pages, trois langues, et chacun des 23 widgets au moins une fois.'), [],
    async d => { await d.say(D.intro); }),

  S('new-site', L('まず「ファイル → 新しい空のサイト」。サイト名を入力し、メイン言語に日本語、ほかの言語に英語とフランス語を選びます。', 'First, File → New empty site: I type the site name, choose Japanese as the main language, English and French as the other languages.', 'D’abord, Fichier → Nouveau site vide : je tape le nom du site, je choisis le japonais comme langue principale, l’anglais et le français comme autres langues.'), [],
    async d => {
      await d.menu('newSiteBtn');
      await d.type('#newSiteName', D.siteName);
      await d.select('#newSiteMain', 'ja');
      await d.check('[data-new-lang="en"]', true);
      await d.check('[data-new-lang="fr"]', true);
      const s = d.seq();
      await d.click('#newSiteCreate');
      await d.waitCode('project.new', s, 10000);
      await d.waitCode('canvas.load.ok', s, 10000);
      d.mem.home = d.state.site.pages[0].id;
    }),

  S('pages', L('「ページ」タブで、ホームの英語・フランス語のタイトルを入れ、2ページ目「イベント・アクセス」を作って、アドレスを「agenda」に、各言語の Google 向けの説明も書きます。', 'In the Pages tab I translate the home title, create the second page “Events & access”, set its address to “agenda” and write the Google description in each language.', 'Dans l’onglet Pages, je traduis le titre de l’accueil, je crée la deuxième page « Agenda & accès », je règle son adresse sur « agenda » et j’écris la description pour Google dans chaque langue.'), [],
    async d => {
      await d.openTab('pages');
      const home = d.mem.home;
      await d.fill(`[data-page-title="${home}"][lang="en"]`, D.pages.home.title.en, { change: false });
      await d.fill(`[data-page-title="${home}"][lang="fr"]`, D.pages.home.title.fr, { change: false });
      for (const l of LANGS) await d.fill(`[data-page-seo="${home}"][lang="${l}"]`, D.pages.home.seo[l], { change: false });
      await d.type('#newPageTitle', D.pages.agenda.title.ja);
      const s = d.seq();
      await d.click('#addPageBtn');
      await d.waitCode('page.add', s, 6000);
      await d.waitCode('canvas.load.ok', s, 10000);
      const p2 = d.state.site.pages[1].id;
      d.mem.agenda = p2;
      await d.fill(`[data-page-title="${p2}"][lang="en"]`, D.pages.agenda.title.en, { change: false });
      await d.fill(`[data-page-title="${p2}"][lang="fr"]`, D.pages.agenda.title.fr, { change: false });
      await d.fill(`[data-page-slug="${p2}"][data-lang="ja"]`, D.pages.agenda.slug);
      for (const l of LANGS) await d.fill(`[data-page-seo="${p2}"][lang="${l}"]`, D.pages.agenda.seo[l], { change: false });
    }),

  S('site-style', L('「サイト」タブ：パレットのメインカラーを森の緑、サブカラーをオークル（黄土色）に。見出しのフォントは Source Serif 4、角の丸みは 12。ロゴには描いたイラストを取り込みます。', 'Site tab: the main colour becomes a forest green, the secondary an ochre; headings in Source Serif 4, corner radius 12; the logo is a drawn illustration.', 'Onglet Site : la couleur principale devient un vert forêt, la secondaire un ocre ; les titres en Source Serif 4, l’arrondi à 12 ; le logo est une illustration dessinée.'), [],
    async d => {
      await d.openTab('site');
      await d.fill('#leftBody [data-palette="c1"]', D.palette.c1);
      await d.fill('#leftBody [data-palette="c2"]', D.palette.c2);
      await d.select('#leftBody [data-font="heading"]', 'source-serif');
      await d.fill('#leftBody [data-theme="radius"]', '12');
      await d.importImage('#leftBody [data-field="logo"]', 'logo', '', 'logo-kumakogen');
    }),

  S('header', L('ヘッダーを「ブロックでカスタマイズ」：サイトロゴ、メニュー、言語の切り替えが並びます。言語の切り替えを「名前」表示に、ロゴの高さを 40 px にして「終了」。', 'I customise the header with blocks: site logo, menu and language switch. The language switch shows names, the logo is 40 px high, then “Done”.', 'Je personnalise l’en-tête avec des blocs : logo du site, menu et choix de langue. Le choix de langue affiche les noms, le logo fait 40 px, puis « Terminer ».'), ['site-logo', 'nav-menu', 'lang-switch'],
    async d => {
      let s = d.seq();
      await d.click('#leftBody [data-layout-edit="header"]');
      await d.waitCode('canvas.load.ok', s, 10000);
      await d.selectNode(d.find('lang-switch').id);
      await d.setField('style', 'names');
      await d.selectNode(d.find('site-logo').id);
      await d.setField('size', '40');
      s = d.seq();
      await d.click('#editBanner [data-edit-done]');
      await d.waitCode('canvas.load.ok', s, 10000);
    }),

  S('footer', L('フッターも同じ：テキストに3言語のクレジットを書き、「SNS」ウィジェットの例のリンクを消して、町の公式サイトへのリンクだけを残します。', 'Same for the footer: the credits in three languages in the Text widget, and the Social networks widget keeps a single link, to the town’s official site.', 'Même chose pour le pied de page : les crédits en trois langues dans le widget Texte, et le widget Réseaux sociaux ne garde qu’un lien, vers le site officiel de la commune.'), ['text', 'social', 'site-logo', 'nav-menu'],
    async d => {
      await d.openTab('site');
      let s = d.seq();
      await d.click('#leftBody [data-layout-edit="footer"]');
      await d.waitCode('canvas.load.ok', s, 10000);
      await d.selectNode(d.find('text').id);
      await texts(d, 'content', p(D.footer));
      await d.selectNode(d.find('social').id);
      for (let i = 0; i < 3; i++) await d.removeListItem('items', 0);
      await d.addListItem('items');
      await d.setListField('items', 0, 'network', 'website');
      await d.setListField('items', 0, 'url', D.officialSite);
      s = d.seq();
      await d.click('#editBanner [data-edit-done]');
      await d.waitCode('canvas.load.ok', s, 10000);
    }),

  S('hero', L('ホームページへ。「テンプレート → ヒーロー」で、2列のセクション（見出し、テキスト、ボタン2つ、画像）が一度に入ります。各テキストをインスペクターの JA / EN / FR の行に書き、ボタンを2ページ目にリンクします。', 'Home page. Templates → Hero adds a two-column section at once: headings, text, two buttons and an image. I write each text in the JA / EN / FR rows of the inspector and link the buttons to page 2.', 'Page d’accueil. Modèles → Héros ajoute d’un coup une section à deux colonnes : titres, texte, deux boutons et une image. J’écris chaque texte dans les lignes JA / EN / FR de l’inspecteur et je lie les boutons à la page 2.'), ['heading', 'text', 'button', 'image'],
    async d => {
      await d.openPage(d.mem.home);
      const sec = await d.addTemplate('hero');
      d.mem.heroSection = sec;
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.hero.over);
      await d.selectNode(d.find('heading', 1, sec).id);
      d.mem.h1 = d.state.selected;
      await d.setField('text', D.hero.title.ja, { lang: 'ja', typed: true });
      await d.setField('text', D.hero.title.en, { lang: 'en' });
      await d.setField('text', D.hero.title.fr, { lang: 'fr' });
      await d.selectNode(d.find('text', 0, sec).id);
      await texts(d, 'content', p(D.hero.text));
      const [b1, b2] = [d.find('button', 0, sec).id, d.find('button', 1, sec).id];
      d.mem.heroButtons = [b1, b2];
      await d.selectNode(b1);
      await texts(d, 'label', D.hero.b1);
      await d.pickLink('link', `page:${d.mem.agenda}`);
      await d.selectNode(b2);
      await texts(d, 'label', D.hero.b2);
      await d.pickLink('link', `page:${d.mem.agenda}`);
      await d.selectNode(d.find('image', 0, sec).id);
      await d.importImage(img('src'), 'highland', '久万高原', 'kumakogen-highland');
      await texts(d, 'alt', D.hero.alt);
    }),

  S('stats', L('「テンプレート → 主要数値」：面積 584 km²、平均標高およそ 800 m、年平均気温 12.8 °C、石鎚山 1982 m。数値はそのまま、説明だけを3言語で。4つ目は「＋ 数値」で追加します。', 'Templates → Key figures: 584 km², about 800 m of altitude, 12.8 °C on average, Mt Ishizuchi 1982 m. The value stays as is, only the caption is translated; the fourth is added with “+ Figure”.', 'Modèles → Chiffres clés : 584 km², environ 800 m d’altitude, 12,8 °C de moyenne, le mont Ishizuchi à 1982 m. La valeur ne se traduit pas, seule la légende ; le quatrième chiffre s’ajoute avec « + Chiffre ».'), ['stats'],
    async d => {
      await d.selectNode(d.mem.heroSection);
      const sec = await d.addTemplate('stats');
      await d.selectNode(d.find('stats', 0, sec).id);
      await d.addListItem('items');
      for (let i = 0; i < D.stats.length; i++) {
        await d.setListField('items', i, 'value', D.stats[i][0]);
        await listTexts(d, 'items', i, 'label', D.stats[i][1]);
      }
      d.mem.statsSection = sec;
    }),

  S('features', L('「テンプレート → 強み」：見出しと3つのアイコン付きボックス。それぞれにアイコン（地球、場所、星）、タイトル、テキストを設定します。', 'Templates → Features: a heading and three icon boxes, each with its icon (globe, pin, star), a title and a text.', 'Modèles → Avantages : un titre et trois encadrés à icône, chacun avec son icône (monde, lieu, étoile), un titre et un texte.'), ['icon-box'],
    async d => {
      await d.selectNode(d.mem.statsSection);
      const sec = await d.addTemplate('features');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.features.title);
      await d.selectNode(d.find('text', 0, sec).id);
      await texts(d, 'content', p(D.features.intro));
      for (let i = 0; i < 3; i++) {
        const [icon, title, text] = D.features.items[i];
        await d.selectNode(d.find('icon-box', i, sec).id);
        await d.setField('icon', icon);
        await texts(d, 'title', title);
        await texts(d, 'text', p(text));
      }
      d.mem.featuresSection = sec;
    }),

  S('cards', L('「テンプレート → ニュース」の3枚のカードを「おすすめスポット」に：描いたイラスト、代替テキスト、タイトル、テキスト。リンクのテキストを空にするとリンクが消えます。', 'Templates → News gives three content cards, which become “Places to visit”: a drawn illustration, alt text, a title and a text; an empty link text removes the link.', 'Modèles → Actualités donne trois cartes de contenu, qui deviennent « Sites à visiter » : illustration dessinée, description, titre et texte ; un texte de lien vide supprime le lien.'), ['card'],
    async d => {
      await d.selectNode(d.mem.featuresSection);
      const sec = await d.addTemplate('cards');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.places.title);
      d.mem.cards = [];
      for (let i = 0; i < 3; i++) {
        const [kind, title, text] = D.places.items[i];
        const id = d.find('card', i, sec).id;
        d.mem.cards.push(id);
        await d.selectNode(id);
        await d.importImage(img('image'), kind, title.ja, `spot-${i + 1}`);
        await texts(d, 'alt', title);
        await texts(d, 'title', title);
        await texts(d, 'text', p(text));
        for (const l of LANGS) await d.setField('button', '', { lang: l });
      }
      d.mem.cardsSection = sec;
    }),

  S('pilgrimage', L('「テンプレート → テキストと画像」：お遍路の話。アイコン付きリストに第44番・第45番札所の行を入れ、右に杉木立の寺のイラストを置きます。', 'Templates → Text and image, for the pilgrimage: the icon list gets the lines about temples 44 and 45, and an illustration of a temple among cedars on the right.', 'Modèles → Texte et image, pour le pèlerinage : la liste à icônes reçoit les lignes sur les temples 44 et 45, et une illustration d’un temple dans les cèdres à droite.'), ['icon-list', 'image'],
    async d => {
      await d.selectNode(d.mem.cardsSection);
      const sec = await d.addTemplate('text-image');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.pilgrimage.title);
      await d.selectNode(d.find('text', 0, sec).id);
      await texts(d, 'content', p(D.pilgrimage.text));
      const list = d.find('icon-list', 0, sec).id;
      d.mem.pilgrimList = list;
      await d.selectNode(list);
      for (let i = 0; i < 3; i++) {
        await d.setListField('items', i, 'icon', D.pilgrimage.items[i][0]);
        await listTexts(d, 'items', i, 'text', D.pilgrimage.items[i][1]);
      }
      await d.selectNode(d.find('image', 0, sec).id);
      await d.importImage(img('src'), 'temple', '大宝寺', 'temple');
      await texts(d, 'alt', D.pilgrimage.alt);
      d.mem.pilgrimSection = sec;
    }),

  S('quote', L('リストを選んでから「ウィジェット → 引用」：町の将来像（公式サイトより）を大きな引用として入れます。', 'With the list selected, Widgets → Quote: the town’s official vision statement, shown as a large quote.', 'La liste sélectionnée, Widgets → Citation : la devise officielle de la commune, en grande citation.'), ['quote'],
    async d => {
      await d.selectNode(d.mem.pilgrimList);
      await d.addWidget('quote');
      await texts(d, 'text', p(D.quote.text));
      await d.setField('author', D.quote.author);
      await texts(d, 'role', D.quote.role);
      await d.setField('variant', 'big');
    }),

  S('gallery', L('「テンプレート → ギャラリー」：四季の4枚（「＋ 画像」で4枚目を追加）、4列表示。見出しの下に「スペース」ウィジェットを入れ、「詳細」タブでモバイルでは非表示にします。', 'Templates → Gallery: four seasons (“+ Image” adds the fourth), four columns. A Spacer widget goes under the heading, hidden on mobile from the Advanced tab.', 'Modèles → Galerie : les quatre saisons (« + Image » ajoute la quatrième), sur quatre colonnes. Un widget Espace sous le titre, masqué sur mobile depuis l’onglet Avancé.'), ['gallery', 'spacer'],
    async d => {
      await d.selectNode(d.mem.pilgrimSection);
      const sec = await d.addTemplate('gallery');
      d.mem.gallerySection = sec;
      const title = d.find('heading', 0, sec).id;
      await d.selectNode(title);
      await texts(d, 'text', D.gallery.title);
      await d.selectNode(d.find('gallery', 0, sec).id);
      await d.addListItem('items');
      for (let i = 0; i < 4; i++) {
        const [kind, cap] = D.gallery.items[i];
        await d.importImage(`#inspector [data-field-wrap="items"] .list-item:nth-of-type(${i + 1}) input[type="file"]`, kind, cap.ja.split('：')[1] || cap.ja, `saison-${i + 1}`);
        await listTexts(d, 'items', i, 'alt', cap);
        await listTexts(d, 'items', i, 'caption', cap);
      }
      await d.setField('columns', '4');
      await d.selectNode(title);
      await d.addWidget('spacer');
      await d.setField('size', '32');
      await d.inspectorTab('advanced');
      await d.check('#inspector [data-adv="hide-mobile"]', true);
      await d.inspectorTab('content');
    }),

  S('video', L('「テンプレート → 動画」：見出しとプレビュー画像を設定します。公式の動画の URL は確認できなかったので空のままにします。書き出し前のチェックが「動画のアドレスがありません」と知らせてくれます。', 'Templates → Video: heading and preview image. I could not verify an official video address, so I leave it empty: the check before export will flag the missing address.', 'Modèles → Vidéo : titre et image d’aperçu. Je n’ai pas pu vérifier l’adresse d’une vidéo officielle, je la laisse vide : la vérification avant export signalera l’adresse manquante.'), ['video'],
    async d => {
      await d.selectNode(d.mem.gallerySection);
      const sec = await d.addTemplate('video');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.video.title);
      await d.selectNode(d.find('video', 0, sec).id);
      await texts(d, 'title', D.video.title);
      await d.importImage(img('poster'), 'highland', '久万高原', 'video-poster');
      d.mem.videoSection = sec;
    }),

  S('page2-intro', L('2ページ目へ。「ウィジェット → 構造 → 1列」で空のセクション、次に「見出し」（レベル H1）と「テキスト」をクリックで追加します。', 'Page 2. Widgets → Structure → 1 column adds an empty section; then a Heading (level H1) and a Text, added by click.', 'Page 2. Widgets → Structure → 1 colonne ajoute une section vide ; puis un Titre (niveau H1) et un Texte, ajoutés par clic.'), ['heading', 'text'],
    async d => {
      await d.openPage(d.mem.agenda);
      const sec = await d.addStructure('12');
      d.mem.introSection = sec;
      await d.addWidget('heading');
      await d.setField('level', 'h1');
      await texts(d, 'text', D.page2.title);
      await d.addWidget('text');
      d.mem.introText = d.state.selected;
      await texts(d, 'content', p(D.page2.text));
    }),

  S('collection', L('「コンテンツ → 新しいコレクション」でイベントのコレクション「Agenda」を作ります（一覧ページと例は無し）。4つの実際のイベントを、タイトル、日付、場所、説明とともに入力し、「公開」にします。', 'Content → New collection creates the “Agenda” events collection (no list page, no examples). I enter four real events — title, dates, place, description — and publish them.', 'Contenus → Nouvelle collection crée la collection d’événements « Agenda » (sans page de liste ni exemples). J’entre quatre événements réels : titre, dates, lieu, description, puis je les publie.'), [],
    async d => {
      await d.openTab('content');
      await d.click('#newCollectionBtn');
      await d.click('#collectionNewDialog [data-kind="events"]');
      await d.fill('#collectionNewDialog [data-col-new-name]', 'Agenda', { change: false });
      await d.check('#collectionNewDialog [data-col-new-page]', false);
      await d.check('#collectionNewDialog [data-col-new-examples]', false);
      let s = d.seq();
      await d.click('#collectionNewDialog [data-col-create]');
      await d.waitCode('collection.create', s, 6000);
      const col = Object.values(d.state.site.collections).find(c => c.kind === 'events');
      d.mem.collection = col.id;
      await d.openTab('content');
      await d.click(`#leftBody [data-col-open="${col.id}"]`);
      for (const ev of D.events) {
        s = d.seq();
        await d.click('#collectionDialog [data-item-add]');
        await d.waitCode('collection.item.add', s, 6000);
        const F = '#collectionDialog [data-item-form]';
        for (const l of LANGS) await d.fill(`${F} [data-item-field-wrap="title"] input[lang="${l}"]`, ev.title[l]);
        await d.fill(`${F} [data-item-field="date"]`, ev.date);
        if (ev.endDate) await d.fill(`${F} [data-item-field="endDate"]`, ev.endDate);
        if (ev.time) await d.fill(`${F} [data-item-field="time"]`, ev.time);
        await d.fill(`${F} [data-item-field-wrap="place"] input`, ev.place);
        if (ev.address) await d.fill(`${F} [data-item-field-wrap="address"] input`, ev.address);
        if (ev.link) await d.fill(`${F} [data-item-field="link"]`, ev.link);
        for (const l of LANGS) {
          const area = await d.ui.el(`${F} [data-item-field-wrap="description"] .rich-input[lang="${l}"]`);
          area.innerHTML = `<p>${ev.description[l]}</p>`;
          area.dispatchEvent(new Event('input', { bubbles: true }));
          area.dispatchEvent(new FocusEvent('blur'));
          await d.wait(120);
        }
        await d.fill(`${F} [data-item-slug]`, ev.slug);
        await d.select(`${F} [data-item-status]`, 'published');
      }
      d.closeDialogs();
    }),

  S('agenda-lists', L('イベントの表示：「見出し」、次に「コンテンツリスト」（コレクション Agenda、2列のカード、「これから」）。点線の「区切り線」、もう一つの見出し、過去のイベントのリスト（新しい順）。', 'Showing the events: a Heading, then a Content list (collection Agenda, two-column cards, upcoming); a dotted Divider, another Heading and a list of past events, newest first.', 'Afficher l’agenda : un Titre, puis une Liste de contenus (collection Agenda, grille de deux colonnes, à venir) ; un Séparateur en pointillés, un autre Titre et la liste des événements passés, du plus récent au plus ancien.'), ['collection-list', 'divider', 'heading'],
    async d => {
      await d.selectNode(d.mem.introText);
      await d.addWidget('heading');
      await texts(d, 'text', D.agenda.upcoming);
      const l1 = await d.addWidget('collection-list');
      await d.setField('collection', d.mem.collection);
      await d.setField('layout', 'grid');
      await d.setField('columns', '2');
      await d.setField('when', 'upcoming');
      await texts(d, 'empty', D.agenda.empty);
      await d.addWidget('divider');
      await d.setField('line', 'dotted');
      await d.setField('length', '50');
      await d.addWidget('heading');
      await texts(d, 'text', D.agenda.past);
      const l2 = await d.addWidget('collection-list');
      await d.setField('collection', d.mem.collection);
      await d.setField('when', 'past');
      await d.setField('sortDir', 'desc');
      d.mem.lists = [l1, l2];
    }),

  S('card', L('リストの「✎ カード」で、イベントのカードを一度だけデザインします：場所の「フィールド」ウィジェットを選び、「住所」の「フィールド」ウィジェットを追加。すべてのリストに反映されます。', 'With “✎ Card” on a list I design the event card once: I select the place Field widget and add a Field widget for the address; every list follows.', 'Avec « ✎ Carte » sur une liste, je dessine une seule fois la carte d’un événement : je sélectionne le Champ du lieu et j’ajoute un widget Champ pour l’adresse ; toutes les listes suivent.'), ['item-field'],
    async d => {
      await d.selectNode(d.mem.lists[0]);
      let s = d.seq();
      await d.click('#inspector [data-list-card]');
      await d.waitCode('canvas.load.ok', s, 10000);
      const col = d.state.site.collections[d.mem.collection];
      const it = col.items.find(i => i.slug === 'joya-no-kane');
      if (it) await d.select('#editBanner [data-preview-item]', it.id);
      await d.selectNode(d.find('item-field', 2).id);
      await d.addWidget('item-field');
      await d.setField('field', 'address');
      await texts(d, 'label', D.agenda.addressLabel);
      await d.setField('icon', 'none');
      s = d.seq();
      await d.click('#editBanner [data-edit-done]');
      await d.waitCode('canvas.load.ok', s, 10000);
    }),

  S('contact', L('「テンプレート → お問い合わせ」：アンカーを「acces」に。見出し、アクセスのテキスト、電話番号のリスト、地図（道の駅の住所、ズーム 15）、フォーム（受信アドレス、件名、項目名、ボタン、プライバシーの注記）。SNS ウィジェットはフッターにあるので削除します。', 'Templates → Contact: anchor “acces”; heading, access text, a list of phone numbers, a Map (roadside station address, zoom 15), a Form (recipient, subject, field labels, button, privacy note). The Social networks widget is already in the footer: I delete it.', 'Modèles → Contact : ancre « acces » ; titre, texte d’accès, liste des téléphones, Carte géographique (adresse de l’aire routière, zoom 15), Formulaire (adresse de réception, objet, libellés des champs, bouton, mention vie privée). Les Réseaux sociaux sont déjà dans le pied de page : je les supprime.'), ['icon-list', 'map', 'social', 'form', 'text'],
    async d => {
      await d.selectNode(d.sectionOf(d.mem.lists[1]));
      const sec = await d.addTemplate('contact');
      d.mem.contactSection = sec;
      await d.inspectorTab('advanced');
      await d.fill('#inspector [data-adv="anchor"]', 'acces');
      await d.inspectorTab('content');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.contact.title);
      await d.addWidget('text');
      await texts(d, 'content', p(D.contact.text));
      const list = d.find('icon-list', 0, sec).id;
      d.mem.contactList = list;
      await d.selectNode(list);
      await d.addListItem('items');
      for (let i = 0; i < 4; i++) {
        await d.setListField('items', i, 'icon', D.contact.lines[i][0]);
        await listTexts(d, 'items', i, 'text', D.contact.lines[i][1]);
      }
      await d.selectNode(d.find('map', 0, sec).id);
      await d.setField('address', D.contact.mapAddress);
      await d.setField('zoom', '15');
      await d.setField('height', '320');
      await d.selectNode(d.find('social', 0, sec).id);
      await d.click('#inspector [data-act="delete"]');
      await d.selectNode(d.find('form', 0, sec).id);
      await d.setField('email', D.contact.email);
      await texts(d, 'subject', D.contact.subject);
      for (let i = 0; i < 3; i++) await listTexts(d, 'fields', i, 'label', D.contact.fields[i]);
      await texts(d, 'submit', D.contact.submit);
      await texts(d, 'consent', D.contact.consent);
      await d.selectNode(list);
      await d.addWidget('text');
      await texts(d, 'content', p(D.contact.note));
    }),

  S('faq', L('「テンプレート → よくある質問」：アコーディオンに4つの質問（「＋ 質問」で追加）と答えを入れます。Google には FAQ として知らせます。', 'Templates → FAQ: the accordion gets four questions (“+ Question” adds them) with their answers, reported to Google as a FAQ.', 'Modèles → Questions fréquentes : l’accordéon reçoit quatre questions (« + Question » les ajoute) et leurs réponses, signalées à Google comme FAQ.'), ['accordion'],
    async d => {
      await d.selectNode(d.mem.contactSection);
      const sec = await d.addTemplate('faq');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.faq.title);
      await d.selectNode(d.find('accordion', 0, sec).id);
      await d.addListItem('items');
      await d.addListItem('items');
      for (let i = 0; i < 4; i++) {
        await listTexts(d, 'items', i, 'title', D.faq.items[i][0]);
        await listTexts(d, 'items', i, 'content', p(D.faq.items[i][1]));
      }
      d.mem.faqSection = sec;
    }),

  S('pricing', L('「テンプレート → 料金」：3つの施設の入館料（美術館 ¥500、天体観測館 ¥500、考古館 ¥100）。真ん中は強調され、バッジが付きます。', 'Templates → Pricing: admission for three venues (art museum ¥500, observatory ¥500, site museum ¥100); the middle one is highlighted with a badge.', 'Modèles → Tarifs : les entrées de trois lieux (musée d’art ¥500, observatoire ¥500, musée du site ¥100) ; celui du milieu est mis en avant avec un badge.'), ['pricing'],
    async d => {
      await d.selectNode(d.mem.faqSection);
      const sec = await d.addTemplate('pricing');
      await d.selectNode(d.find('heading', 0, sec).id);
      await texts(d, 'text', D.pricing.title);
      await d.selectNode(d.find('text', 0, sec).id);
      await texts(d, 'content', p(D.pricing.intro));
      for (let i = 0; i < 3; i++) {
        const it = D.pricing.items[i];
        await d.selectNode(d.find('pricing', i, sec).id);
        await texts(d, 'title', it.title);
        await d.setField('price', it.price);
        await texts(d, 'period', it.period);
        await texts(d, 'features', it.features);
        for (const l of LANGS) await d.setField('button', it.button ? it.button[l] : '', { lang: l });
        await d.setField('link', it.link || '');
        if (it.badge) await texts(d, 'badge', it.badge);
      }
    }),

  S('home-events', L('ホームに戻り、次のイベントを3つだけ表示するリストを追加します：「ウィジェット → 1列」、見出し、コンテンツリスト（最大 3 件、下に「イベント一覧へ」のリンク）。カードは同じものです：一度デザインすれば十分。', 'Back on the home page, a list of the next three events: Structure → 1 column, a Heading, a Content list (maximum 3, with an “All events” link below). Same card: designed once.', 'Retour à l’accueil, une liste des trois prochains événements : Structure → 1 colonne, un Titre, une Liste de contenus (maximum 3, avec un lien « Tout l’agenda » dessous). Même carte : dessinée une seule fois.'), ['collection-list', 'heading'],
    async d => {
      await d.openPage(d.mem.home);
      await d.selectNode(d.mem.videoSection);
      await d.addStructure('12');
      await d.addWidget('heading');
      await texts(d, 'text', D.agenda.upcoming);
      await d.addWidget('collection-list');
      await d.setField('collection', d.mem.collection);
      await d.setField('when', 'upcoming');
      await d.setField('limit', '3');
      await texts(d, 'moreLabel', D.agenda.more);
      await d.pickLink('moreLink', `page:${d.mem.agenda}`);
    }),

  S('component', L('連絡先のリストを「コンポーネント」にします（詳細タブ → コンポーネントを作成）。ホームの2つ目のボタンは、このコンポーネントを「ウィンドウで開く（ポップアップ）」リンクに。', 'The contact list becomes a component (Advanced tab → Create a component). The second home button then opens it as a popup window.', 'La liste des coordonnées devient un composant (onglet Avancé → Créer un composant). Le second bouton de l’accueil l’ouvre alors en fenêtre (popup).'), ['button', 'icon-list'],
    async d => {
      await d.openPage(d.mem.agenda);
      await d.selectNode(d.mem.contactList);
      await d.inspectorTab('advanced');
      d.answerPrompt(D.component);
      const s = d.seq();
      await d.click('#inspector [data-component-create]');
      await d.waitCode('action.component-create', s, 6000);
      const comp = Object.keys(d.state.site.components)[0];
      await d.openPage(d.mem.home);
      await d.selectNode(d.mem.heroButtons[1]);
      await d.inspectorTab('content');
      await d.pickLink('link', `popup:${comp}`);
    }),

  S('mobile', L('「モバイル」ボタン：列が縦に並び、メニューが「☰」に畳まれます。大見出しを選び、スタイルタブでモバイルだけの文字サイズ（「見出し2」の段階）を選びます。', 'The Mobile button: columns stack, the menu folds into “☰”. I select the main heading and, in the Style tab, choose a mobile-only size from the scale (“Heading 2”).', 'Le bouton Mobile : les colonnes s’empilent, le menu se replie en « ☰ ». Je sélectionne le grand titre et, dans l’onglet Style, je choisis une taille pour le mobile seulement, dans l’échelle (« Titre 2 »).'), [],
    async d => {
      await d.click('[data-device="mobile"]');
      await d.wait(600);
      await d.selectNode(d.mem.h1);
      await d.inspectorTab('style');
      await d.select('#inspector [data-token-pick="fontSize"]', 'size:h2');
      await d.wait(400);
      await d.click('[data-device="desktop"]');
      await d.inspectorTab('content');
    }),

  S('preset', L('最初のボタンのスタイルを「プリセット」として保存し（「＋ プリセット」）、ボタンの既定にします。カードには「スクロール時に表示」の効果と、ホバー時に「持ち上げる」動きを付けます。', 'The first button’s style is saved as a preset (“+ Preset”) and made the default for buttons. A card gets a reveal-on-scroll effect and a “lift” on hover.', 'Le style du premier bouton devient un preset (« + Preset »), par défaut pour les boutons. Une carte reçoit une apparition au défilement et un « Soulever » au survol.'), ['button', 'card'],
    async d => {
      await d.selectNode(d.mem.heroButtons[0]);
      await d.inspectorTab('style');
      await d.click('#inspector [data-preset-new]');
      await d.fill('#inspector [data-preset-name]', D.preset, { change: false });
      await d.click('#inspector [data-preset-create]');
      await d.check('#inspector [data-preset-default]', true);
      await d.selectNode(d.mem.cards[0]);
      await d.inspectorTab('style');
      await d.select('#inspector [data-style="reveal"]', 'up');
      await d.click('#inspector [data-style-state="hover"]');
      await d.select('#inspector [data-style="transform"]', 'lift');
      await d.click('#inspector [data-style-state="normal"]');
      await d.fill('#inspector [data-style="transitionDuration"]', '200');
      await d.inspectorTab('content');
    }),

  S('translations', L('「🌐 翻訳」：サイトのすべてのテキストが言語ごとの列に並びます。「未翻訳のみ」で残りが分かり、Chrome ならパソコン上で自動翻訳もできます。', '“🌐 Translations”: every text of the site in one column per language; a filter shows what is left, and recent Chrome can translate on the computer itself.', '« 🌐 Traductions » : tous les textes du site, une colonne par langue ; un filtre montre ce qui reste, et Chrome récent peut traduire sur l’ordinateur même.'), [],
    async d => { await d.click('#i18nBtn'); await d.ui.el('#i18nDialog[open]'); await d.wait(1500); d.closeDialogs(); }),

  S('seo', L('「🔎 SEO」：ページごと、言語ごとの点数と、Google での見え方、直すべき点が分かります。', '“🔎 SEO”: a score per page and language, the Google preview and what to fix.', '« 🔎 SEO » : une note par page et par langue, l’aperçu dans Google et ce qu’il faut corriger.'), [],
    async d => { await d.click('#seoBtn'); await d.ui.el('#seoDialog[open]'); await d.wait(1500); d.closeDialogs(); }),

  S('versions', L('「ファイル → バージョン」で「公開前の完成版」という名前のバージョンを保存します。いつでも元に戻せます。', 'File → Versions: I save a version named “Complete site before publishing”; it can be restored at any time.', 'Fichier → Versions : j’enregistre une version « Site complet avant publication » ; elle se restaure à tout moment.'), [],
    async d => {
      await d.menu('versionsBtn');
      await d.ui.el('#versionsDialog[open]');
      await d.fill('#versionsDialog [data-version-name]', D.version, { change: false });
      const s = d.seq();
      await d.click('#versionSave');
      await d.waitCode('version.save.ok|version.save.fail', s, 8000);
      await d.wait(600);
      d.closeDialogs();
    }),

  S('check', L('「サイトを書き出す」：書き出し前のチェックが、ブロックするエラー、確認すべき点（例：動画のアドレス）、未翻訳のテキストを一覧にします。', '“Export site”: the check before export lists blocking errors, points to review (for example the video address) and texts to translate.', '« Exporter le site » : la vérification avant export liste les erreurs qui bloquent, les points à vérifier (par exemple l’adresse de la vidéo) et les textes à traduire.'), [],
    async d => { await d.click('#exportZipBtn'); await d.ui.el('#auditDialog[open]'); await d.wait(1800); d.closeDialogs(); }),

  S('publish', L('「🚀 公開」：publish.php を一度サーバーに置けば、あとはワンクリックで公開できます。GitHub や .zip でも。', '“🚀 Publish”: once publish.php is on the server, publishing is one click; GitHub or a .zip also work.', '« 🚀 Publier » : une fois publish.php déposé chez l’hébergeur, publier se fait en un clic ; GitHub ou un .zip marchent aussi.'), [],
    async d => { await d.click('#publishBtn'); await d.ui.el('#publishDialog[open]'); await d.wait(1500); d.closeDialogs(); }),

  S('end', L('完成です：2ページ、3言語、23種類のウィジェット。このサイトをあなたの出発点にすることも、元のサイトに戻ることもできます。', 'Done: two pages, three languages, 23 widgets. You can keep this site as your starting point, or go back to your own site.', 'Voilà : deux pages, trois langues, 23 widgets. Vous pouvez garder ce site comme point de départ, ou revenir à votre site.'), [],
    async d => { await d.openPage(d.mem.home); await d.wait(400); })
];

/* Types de widgets montrés par le script (déclarés étape par étape) */
export const demoWidgetTypes = () => [...new Set(DEMO_STEPS.flatMap(s => s.widgets))];
