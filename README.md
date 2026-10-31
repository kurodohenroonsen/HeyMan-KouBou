# Atelier — éditeur visuel de sites multilingues

Un éditeur « ce que vous voyez est ce que vous obtenez », dans le navigateur, sans serveur ni base de données.
Il produit un site statique (HTML + CSS, un peu de JavaScript seulement si nécessaire) en FR / NL / DE / EN, prêt à déposer chez OVH ou n'importe quel hébergeur.

## Démarrer

L'éditeur est un dossier de fichiers statiques. Il doit être servi en http(s) (pas en double-cliquant sur `index.html`, les modules JavaScript l'interdisent).

```
python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080/. Sur un hébergement OVH : déposer `index.html`, `editor/` et `core/` dans un dossier (par exemple `/atelier/`) et ouvrir son adresse.

Le projet s'enregistre tout seul dans le navigateur (IndexedDB ; les images sont rangées à part et écrites une seule fois). Pour le sauvegarder ou le passer à quelqu'un : **Fichier → Enregistrer le projet (.json)**, puis **Fichier → Ouvrir un projet (.json)** de l’autre côté.

## Guide d'utilisation

> **Le guide complet, à lire dans le navigateur** : [`guide/`](guide/index.html) (français, anglais, japonais ; recherche, captures d’écran, détails techniques repliés). Dans l’éditeur : bouton **❓**, **Fichier → Guide d’utilisation**, **F1** (dans une fenêtre, F1 ouvre son chapitre) ou Ctrl+K « Guide ». Pour commencer : *Bienvenue* (ce que l’atelier fait pour vous), *Prise en main* (deux pages d’un site touristique de Kumakōgen, pas à pas) et *Les widgets*. Les sources Markdown, avec ce que le journal doit montrer dans chaque cas, sont dans [`docs/guide/`](docs/guide/README.md). Ce qui suit en est le résumé.
- **Première visite** : visite guidée de l'écran en 5 étapes (rejouable par ❓ ▾, Fichier ou Ctrl+K) et liste « Pour commencer » de 7 premiers pas qui se cochent seuls, en tête de l'onglet Widgets.
- **Fichier → Voir une démonstration** : Atelier construit lui-même, avec ses vrais boutons, le site de Kumakōgen (2 pages, 3 langues, 23 widgets) en ~4 minutes ; ton site revient intact, ou tu gardes celui-ci comme point de départ.

### L'écran
- **En haut** : nom du site, page affichée, annuler / rétablir, appareil (ordinateur, tablette, mobile), langue affichée, badge « à traduire », menu Fichier, **Exporter le site**.
- **À gauche** : Widgets, Modèles, Structure (arbre de la page), Pages, Site (couleurs, polices, en-tête, pied de page).
- **Au centre** : la page, telle qu'elle sera en ligne, à la vraie largeur de l'appareil choisi.
- **À droite** : l'inspecteur de l'élément sélectionné (Contenu, Style, Avancé).

### Construire une page
- **Modèles** : 13 sections prêtes (héros, avantages, tarifs, FAQ, contact…). Cliquez ou glissez-les dans la page.
- **Widgets** : 18 blocs (titre, texte, bouton, image, espace, séparateur, liste à icônes, encadré, citation, chiffres clés, FAQ, galerie, vidéo, carte, réseaux sociaux, formulaire, carte de contenu, tarif). Clic = ajout après la sélection ; glisser = à l'endroit exact (une ligne bleue montre où).
- **Structure** : section → rangée → colonnes → widgets. Les dispositions de colonnes se choisissent sur la rangée (onglet Contenu).
- **Déplacer** : glisser l'élément sélectionné, ou sa poignée ✥, ou une ligne de l'onglet Structure. Alt+↑ / Alt+↓ au clavier.
- **Écrire** : double-clic sur un texte, un titre ou un bouton, et tapez. Une barre propose gras, italique, souligné, lien. Entrée valide un titre, Échap termine.
- **Clic droit** : dupliquer, copier / coller, copier / coller le style, monter / descendre, supprimer.

### Aller vite
- **Ctrl+K** ouvre la barre de commandes : tapez « ajout bout », « contact », « mobile », « taille »… pour ajouter un widget, aller à une page, sélectionner un élément par son texte ou ouvrir un réglage.
- **Maj+clic** sélectionne plusieurs éléments : un réglage, un collage de style, une duplication ou une suppression s'applique à tous.
- Dans l'onglet Style, le champ **« Chercher un réglage »** filtre les options ; le bouton **🖥▭▯** affiche ordinateur, tablette et mobile côte à côte.
- Au clavier : ↑ ↓ ← → pour parcourir la page, Ctrl+X puis Ctrl+V pour déplacer un élément, `?` pour l'aide.

### Système de design
- Panneau **Site → Échelle de texte** : deux tailles (mobile, grand écran) et un « contraste » suffisent ; tous les titres et textes grandissent en douceur d'un écran à l'autre. Même principe pour **Espacements**.
- Dans l'onglet Style, la liste **« Échelle… »** à côté de la taille et sous chaque marge propose ces valeurs : le site reste cohérent.
- **Presets** : « + Preset » enregistre le style d'un élément sous un nom (« Bouton principal ») ; appliquez-le à d'autres éléments du même type ; « Modifier le preset » change tous ceux qui le suivent ; un réglage fait sur l'élément l'emporte toujours. Un preset peut devenir celui **par défaut** d'un type. Gestion dans le panneau Site.
- **Palette** : 6 couleurs de base nommées, jusqu'à 12 ; la liste « Couleurs hors palette » repère les couleurs figées et les remplace en un clic.
- Les champs de longueur acceptent aussi `clamp()`, `min()`, `max()`, `calc()`. L'onglet Avancé accepte de la CSS personnalisée (déclarations simples).

### Style et adaptation aux écrans
- Onglet **Style** : typographie, fond, marges, bordures, dimensions, disposition, effets.
- Un réglage fait sur **Ordinateur** vaut aussi pour la tablette et le mobile, sauf si vous le changez sur ces appareils : choisissez l'appareil en haut, puis réglez. La valeur héritée est affichée en grisé ; ↺ revient à l'héritage.
- **Survol** : couleur, fond, ombre ou petit mouvement quand la souris passe dessus.
- On peut écrire `30` pour 30 px ; les valeurs incorrectes sont refusées avec un exemple.
- **Avancé** : ancre (pour un lien `#contact`), classes CSS, masquer sur un appareil.
- Panneau **Site** : les 6 couleurs de la palette recolorent tout le site d'un coup ; polices des titres et du texte.

### Composants, en-tête, menu et popups
- **Composants** : clic droit sur un bloc → « Créer un composant… ». Il apparaît dans **Modèles → Mes composants** : cliquez ou glissez pour le réutiliser. Double-clic sur une utilisation pour le modifier : toutes les pages suivent. « Détacher » en fait une copie indépendante.
- **En-tête et pied de page** : panneau Site → « Personnaliser avec des blocs », puis modifiez-les comme une page (widgets Logo du site, Menu, Choix de langue). « Revenir au défaut » à tout moment.
- **Menu** : panneau Pages → « Personnaliser le menu » pour ajouter des liens, créer des sous-menus (⇥), renommer une entrée par langue. Sur mobile, un bouton « ☰ Menu » ouvre le menu.
- **Popups** : sur un bouton, « Lier à… » → « Ouvrir en fenêtre » affiche un composant par-dessus la page (formulaire d'inscription, informations…), sans aucun script.

### Accessibilité et performance
- Sous chaque couleur (onglet Style), une pastille indique le **contraste** réel du texte sur son fond : vert si les règles WCAG AA sont respectées (4,5:1, ou 3:1 pour un grand titre), rouge sinon. Le panneau Site montre les paires de la palette (texte, bouton, liens…) et se met à jour pendant que vous choisissez une couleur.
- La vérification avant export signale aussi les titres mal ordonnés (H2 → H4) et l'absence de titre principal.
- Panneau Pages → **« Créer la déclaration d'accessibilité »** : une page en français, néerlandais, allemand et anglais (WCAG 2.1 AA / EN 301 549), avec un lien dans le pied de page. À relire avant publication.
- Les images importées sont préparées en trois tailles : les téléphones téléchargent la petite, la première image de la page est chargée en priorité, les autres seulement quand on s'en approche.
- Effets : « Apparition au défilement » (onglet Style → Effets) et transitions fluides entre les pages (panneau Site). Les deux sont désactivés automatiquement pour les visiteurs qui préfèrent moins de mouvement.

### Plusieurs langues
- **Fichier → Nouveau site vide** : choisissez le nom, la **langue principale** (français, néerlandais, allemand, anglais ou japonais) et les autres langues ; on en ajoute ou en retire ensuite dans l’onglet Site.
- Choisissez la langue affichée en haut et écrivez directement dans la page : la langue principale n'est pas touchée.
- Dans l'inspecteur, chaque texte a une ligne par langue ; les cases encadrées en orange restent à traduire.
- Le badge **N à traduire** ouvre la liste complète ; « Aller à » ouvre l'élément dans la bonne langue.
- Un texte non traduit s'affiche dans la langue principale sur le site publié.
- **🌐 Traductions** (en haut) ouvre le tableau de tous les textes, une colonne par langue : traduisez sur place, filtrez « à traduire », exportez en **CSV** pour un traducteur puis réimportez son fichier.
- **Traduction automatique** : dans Chrome récent sur ordinateur, le tableau traduit les textes manquants sur votre appareil (rien n'est envoyé à un serveur), en gardant gras et liens. Chaque texte traduit ainsi est marqué « à relire » jusqu'à ce que vous le validiez ou le corrigiez.
- **Adresses traduites** : dans le panneau Pages, chaque page peut avoir son adresse par langue (`/nl/neem-contact-op/`).
- Onglet Avancé → « Masquer dans la langue » pour un contenu qui ne concerne qu'une partie du public.

### Pages et liens
- Panneau **Pages** : ajouter, renommer (par langue), changer l'adresse, écrire la description pour Google, ordonner le menu, supprimer.
- Pour lier un bouton à une page, utilisez « Lier à une page ou une section… » : le lien restera juste dans chaque langue et même si l'adresse de la page change.

### Contenus répétés : membres, actualités, agenda
- Panneau **Contenus** → « + Nouvelle collection » : Médias membres, Actualités, Agenda ou Personnalisée. Atelier crée la collection, sa page de liste (ajoutée au menu) et quelques exemples à remplacer.
- Cliquez sur la collection pour gérer ses **éléments** : un formulaire par élément (textes par langue, image, date, heure, lieu…), brouillon ou publié, adresse, ordre, copie. Onglet **Champs** pour en ajouter (ex. « Tarif »), onglet **Réglages** pour l'adresse par langue, l'ordre, le flux RSS. Import et export **CSV** pour reprendre une liste tenue dans un tableur.
- Widget **Liste de contenus** : à placer sur n'importe quelle page (ex. « Les 3 prochains rendez-vous » sur l'accueil) ; grille ou liste, nombre, ordre, filtre (ex. seulement les radios), à venir ou passés.
- **✎ Carte** et **✎ Page de détail** : on les dessine une fois avec les widgets habituels ; dans l'inspecteur, « 🔗 Relier à un champ » fait suivre un contenu à chaque élément (le titre, l'image, le lien…). Le widget **Champ** affiche une information avec une icône (📅 date, 📍 lieu). Double-clic sur une liste pour modifier sa carte.
- À la publication : une page par élément et par langue (titre, description, image de partage, données structurées Event / NewsArticle / Organization pour Google), le sitemap, un fichier **.ics** par événement (« Ajouter à mon agenda ») et `calendar.ics` pour tout l'agenda, un **flux RSS** des actualités par langue. Les événements passés disparaissent d'eux-mêmes des listes « à venir », même sans republier.

### Référencement (🔎 SEO) et IA locale (✨)
- **🔎 SEO** : une note sur 100 par page et par langue, l'aperçu dans Google et sur les réseaux sociaux, et la liste de ce qui manque (description, titre principal, textes alternatifs, liens « cliquez ici », pages sans lien…) avec « Aller à ». Réglez le titre pour Google, la description, le mot-clé principal, l'image de partage, ou « ne pas indexer ».
- À la publication, Atelier ajoute les balises de partage (Open Graph, Twitter), les données structurées pour Google (organisation, site, fil d'Ariane, événements, articles) et retire les pages non indexées du sitemap.
- **✨ IA locale** : si votre Chrome (148 ou plus récent, sur ordinateur) dispose de Gemini Nano, Atelier peut proposer des descriptions, des titres, des idées de mots-clés et des textes alternatifs d'images, et reformuler ou corriger un texte (sélectionnez-le pendant l'édition, puis ✨ dans la barre de mise en forme). Rien ne quitte l'ordinateur. Chaque proposition est à accepter, marquée « à relire » et annulable par Ctrl+Z. Le néerlandais est rédigé en français puis traduit sur l'appareil.
- Le bouton ✨ montre l'état de chaque API et permet de télécharger les modèles. Pour Rewriter, Writer et Proofreader (en essai), activez `chrome://flags/#rewriter-api`, `#writer-api` et `#proofreader-api` puis relancez Chrome ; sans elles, Atelier passe par la Prompt API.

### Contenus intelligents (✨, 🎨)
- **✨ Depuis une affiche** (fenêtre d'une collection) : la photo d'une affiche ou d'un flyer devient un élément en brouillon (date, heure, lieu, lien…), lu par l'IA locale et vérifié champ par champ ; la photo devient son image.
- **✨ Depuis un texte** : un e-mail ou une liste collée devient plusieurs fiches en brouillon (doublons signalés).
- **✨ Proposer** (chapô) et **✨ Titres** dans le formulaire d'un article.
- **📋 Résumé de la relecture** (panneau 💬) : comptes par page et par auteur, puis points clés et tâches avec l'IA.
- **🎨 Palette depuis le logo** (panneau Site) : six couleurs tirées du logo, contrastes corrigés pour rester lisibles ; sans IA.
- Toujours une proposition à vérifier ; brouillons et textes « à relire » ; Ctrl+Z annule.

### Banc d'essai de l'IA locale (🧪)
- ✨ IA locale → **🧪 Banc d'essai** : chaque tâche d'IA d'Atelier est lancée sur des exemples fixes avec le vrai Gemini Nano de ce Chrome, vérifiée automatiquement et chronométrée ; **📋 Copier le rapport** pour l'envoyer. Tout reste sur l'ordinateur.

### Langue de l'interface : français, anglais, japonais
- Menu **Fichier → Langue de l'interface** (ou Ctrl+K « 🌍 English », « 🌍 日本語 », « 🌍 Français ») ; au premier lancement, la langue du navigateur ; `?lang=en` ou `?lang=ja` dans l'adresse. Tout suit : écrans, messages, infobulles, rapports, **et le journal** (les codes du journal restent identiques).
- Le **japonais** est aussi une langue de contenu des sites (avec fr, nl, de, en) : adresses de pages lisibles (kana → rōmaji), textes publiés en japonais, SEO adapté, polices japonaises.
- Guide en trois langues : [`docs/guide/`](docs/guide/README.md), [`docs/guide/en/`](docs/guide/en/README.md), [`docs/guide/ja/`](docs/guide/ja/README.md).

### Largeur des panneaux
- Glisse le bord intérieur du panneau de gauche ou de droite (ou Tab jusqu'à la poignée, puis ← →, Maj pour aller plus vite, Début, Fin) ; double-clic : largeur d'origine ; la largeur est retenue sur l'appareil.

### Infobulles
- Survole (ou atteins au clavier avec Tab) n'importe quel bouton à icône : son nom, son raccourci en touches (⌘ ⇧ ⌥ sur Mac) et, pour les plus obscurs (✨ 👥 💬 🐞, appareils, barre ↰ ✥ ⧉ ✕ du canevas…), une ligne d'explication.

### Auto-test en console (🧪, avec retour arrière)
- Adresse de l'éditeur + `?autotest` (ou `autotest()` tapé dans la console, ou Ctrl+K « Auto-test ») rejoue 25 cas d'usage du guide sur l'exemple du MAB (édition, style, pages, images, agenda, versions, traductions, référencement, export, connexion à publish.php, palette, contenus intelligents, Demander à Atelier), vérifie l'état et le journal attendu, puis affiche le **rapport** dans une fenêtre (📋 Copier, ⇩ .md). Pour les développeurs : `copy(await atelierDebug.selftest())`.
- Ton projet est mis de côté (mémoire, copie de secours, version de sécurité) et **remis exactement comme avant** à la fin, historique compris ; `await atelierDebug.rollback()` arrête et restaure tout de suite ; après un rechargement en plein test, le démarrage restaure tout seul. Options : `only`, `skip`, `ai: 'fake' | 'real' | false`, `publish`, `full`, `download` (chapitre 15 du guide).

### Demander à Atelier (✨ dans Ctrl+K)
- Écrivez votre demande dans **Ctrl+K** (« ajoute une FAQ de 3 questions sur l’adhésion », « mets les titres en rouge », « crée une page Notre radio avec un héros et le contact ») puis « ✨ Demander à Atelier » ; ou **✨ Page décrite** dans le panneau Pages.
- L'IA locale choisit seulement parmi les actions que l'éditeur sait faire (liste fermée) ; vous voyez l'aperçu (et ce qui est refusé, avec la raison) avant d'appliquer ; Ctrl+Z annule tout en une fois.

### Travailler à plusieurs (👥) et commenter (💬)
- **👥** : indiquez votre nom (une clé personnelle est créée dans votre navigateur), « Démarrer une session », puis envoyez le lien **éditeur** (peut tout modifier) ou **relecteur** (commente seulement). L'invité ouvre le lien, donne son nom, « Rejoindre » : il reçoit le projet et chacun voit les modifications des autres en direct.
- Les données passent directement de navigateur à navigateur (WebRTC, chiffré). Seule la mise en relation passe par votre `publish.php` (messages chiffrés, effacés après 15 minutes) ; sans publish.php, l'invité et vous échangez deux codes par e-mail ou messagerie.
- Les pastilles en haut montrent qui est là (clic : aller où il travaille) ; l'élément sélectionné par chacun est encadré à sa couleur.
- « Annuler » n'annule que vos propres modifications. Coupure de réseau ou page fermée : rouvrez le lien d'invitation, ce qui a été modifié entre-temps est fusionné.
- **💬** : sélectionnez un élément, écrivez votre remarque. Chaque commentaire est **signé** par la clé de son auteur (✓ signé). Répondre, résoudre, aller à l'élément ; des pastilles numérotées marquent les éléments commentés. Les commentaires restent dans le projet, jamais sur le site publié. Ils fonctionnent aussi sans session (notes pour soi).
- Deux personnes qui écrivent en même temps dans le même texte : la dernière version gagne ; la présence évite d'en arriver là.

### Publier en un clic (🚀 Publier)
- **OVH avec publish.php** (recommandé) :
  1. Dans « 🚀 Publier », cliquez « ⇩ publish.php » : un fichier personnalisé est téléchargé, avec un jeton secret affiché dans le champ (cochez « se souvenir sur cet appareil » si vous le souhaitez).
  2. Une seule fois, déposez `publish.php` par FTP dans le dossier du site chez OVH (« www »), à côté de `index.html`.
  3. Indiquez son adresse (`https://www.votre-site.be/publish.php`), « Tester la connexion », puis « Publier le site ». Ensuite, chaque publication se fait en un clic.
  - Bonus : les formulaires de contact passent alors par ce fichier et arrivent par e-mail, sans ouvrir le logiciel de courriel du visiteur et sans que votre adresse apparaisse dans les pages.
  - Si vous perdez le jeton : recréez un publish.php et redéposez-le.
- **GitHub → OVH** (sans PHP) : indiquez le dépôt et un jeton GitHub à accès limité ; Atelier envoie seulement les fichiers modifiés, et l'intégration Git d'OVH (Hébergement → Git, avec webhook) met le site à jour.
- **Fichier .zip** : voir ci-dessous.

### Versions
- Fichier → **Versions…** : enregistrez une version avant un gros changement, comparez avec l'état actuel, restaurez. Une version est aussi gardée automatiquement chaque jour et avant toute restauration ou ouverture d'un autre projet. Les versions restent dans ce navigateur : gardez aussi de temps en temps une copie « Enregistrer le projet (.json) ».

### Publier à la main
1. **Exporter le site** : une vérification s'affiche (images sans description, liens cassés, formulaire sans destinataire, textes à traduire…). Chaque ligne a un bouton « Aller à ».
2. **Exporter** télécharge un `.zip` : `index.html`, `nl/`, `de/`, `en/`, une page par dossier, `styles.css`, `assets/`, `sitemap.xml`, `robots.txt`.
3. Décompressez et déposez le contenu à la racine du site chez OVH (FTP ou gestionnaire de fichiers). C'est tout : pas de PHP, pas de base de données.

Renseignez l'**adresse du site** (panneau Site) avant l'export : elle sert aux liens canoniques, aux liens entre langues et au sitemap pour Google.

### Journal de débogage (🐞)
- Tout ce que fait l'éditeur est noté : dans la console (F12, lignes **[Atelier]**) et dans la fenêtre **🐞** (barre du haut, Ctrl+Alt+J ou Ctrl+K « Journal »). Pastille rouge = nombre d'erreurs.
- Pour signaler un problème : refaites-le, **🐞 → 📋 Copier le journal**, collez-le dans votre message (l'environnement est inclus ; jetons, secrets et images sont masqués).
- **Journal du serveur** : publish.php (version 4) note publications, formulaires et erreurs PHP dans `atelier-data/log-AAAA-MM.php` (illisible depuis le web) ; 🐞 → « Lire le journal du serveur » avec le jeton. En mode debug, chaque réponse de publish.php renvoie aussi sa trace, recopiée dans le journal du navigateur (`php.*`).
- Réglages : `?debug`, `?trace`, `?quiet` dans l'adresse, ou 🐞 → Réglages ; console : `atelierDebug.copy()`.
- Site publié : ajouter `?atelier-debug` à l'adresse d'une page allume son journal (**[Atelier site]**) sur cet appareil ; `?atelier-debug=0` l'éteint.

### Vie privée
- Vidéo et carte : rien n'est chargé chez YouTube, Vimeo ou Google tant que le visiteur ne clique pas.
- Le formulaire ouvre le logiciel de courriel du visiteur ; l'adresse de réception n'apparaît pas en clair dans la page. Un service de formulaire (adresse https) peut le remplacer.
- Les polices Google ne sont chargées que si vous en choisissez une autre que « Système » ou « Georgia ».

## Raccourcis

| Touche | Action |
|---|---|
| Ctrl+K | Barre de commandes |
| ↑ ↓ / ← → | Élément précédent, suivant / parent, premier enfant |
| Maj+clic | Ajouter ou retirer de la sélection |
| Ctrl+X | Couper (puis Ctrl+V ailleurs) |
| ? | Aide des raccourcis |
| Double-clic / Entrée | Écrire dans l'élément |
| Échap | Terminer l'écriture, sinon sélectionner le parent |
| Suppr | Supprimer |
| Ctrl+D | Dupliquer |
| Ctrl+C / Ctrl+V | Copier / coller l'élément |
| Alt+↑ / Alt+↓ | Monter / descendre |
| Ctrl+Z / Ctrl+Maj+Z | Annuler / rétablir |
| Ctrl+B / I / U | Gras / italique / souligné |
| Ctrl+S | Rappel « Déjà enregistré » (le fichier .json : Fichier → Enregistrer le projet) |
| Ctrl+Alt+J | Journal de débogage |

## Pour les développeurs

### Organisation
- `core/` — logique pure, sans DOM, testée dans Node : jetons et échelles fluides (`tokens.js`), presets (`presets.js`), couleurs hors palette (`colors.js`), recherche de commandes (`commands.js`), composants et édition ciblée (`components.js`), menu (`menu.js`), en-tête et pied en blocs (`layout.js`), contraste et titres (`contrast.js`), déclaration d’accessibilité (`a11ypage.js`), traductions, CSV et traduction automatique (`i18n.js`), publication et publish.php (`publish.js`), versions (`versions.js`), collections, iCal et RSS (`collections.js`, widgets `collection-widgets.js`), synchronisation pair-à-pair (`collab.js`, `collab-protocol.js`), identités, invitations et commentaires signés (`review.js`), référencement (`seo.js`), tâches d'IA locale (`ai-tasks.js`), contenus intelligents et palette depuis le logo (`smart.js`), catalogue fermé d'actions de l'assistant (`assistant.js`), banc d'essai de l'IA locale (`bench.js`), catalogue et rapport de l’auto-test (`selftest.js`), infobulles (`tooltip.js`), faux Gemini Nano (`fake-nano.js`), arbre (`tree.js`), registre des widgets (`widgets.js`, `widgets-extra.js`), styles typés et compilation CSS par appareil (`style.js`), thème (`theme.js`), rendu HTML et export (`render.js`), assainissement du texte riche (`sanitize.js`), modèles (`templates.js`), contrôle avant export (`audit.js`), opérations d'édition et de glisser-déposer (`editing.js`), zip (`zip.js`).
- `editor/` — l'interface : `store.js` (état, historique, enregistrement), `canvas.js` (iframe de même origine, mise à l'échelle, sélection), `dnd.js`, `inline.js` + `richedit.js` (édition directe), `inspector.js` + `styletab.js` + `fields.js`, `navigator.js`, `library.js`, `templates.js`, `pages.js`, `panels.js`, `audit-ui.js`, `collections-ui.js` (contenus), `collab-ui.js` + `collab-net.js` (session, WebRTC, signalisation), `review-ui.js` (commentaires), `ai.js` + `ai-ui.js` (IA locale de Chrome), `seo-ui.js` (référencement), `smart-ui.js` (contenus intelligents), `assistant-ui.js` (Demander à Atelier), `bench-ui.js` (banc d'essai de l'IA locale), `selftest.js` + `selftest-safe.js` + `selftest-ui.js` (auto-test et retour arrière), `tooltip.js` (infobulles), `ctxmenu.js`, `cmdk.js` (barre de commandes et aide), `log.js` + `log-ui.js` (journal de débogage : console, fenêtre 🐞, réseau, erreurs, journal du serveur).
- Langues de l'interface : `core/ui-i18n.js` (`__()`, le français est la clé), catalogues `i18n/en.js` et `i18n/ja.js` générés par `node tools/i18n.mjs build` depuis `i18n/parts/*.json` ; `node tools/i18n.mjs check` liste ce qui manque (vérifié par `tests/ui-i18n-coverage.test.js`) ; glossaire `docs/i18n-glossaire.md`.
- Journal : `core/log.js` (événements structurés, niveaux, parcours mesurés, masquage des secrets) ; chaque code est documenté dans `docs/guide/` (vérifié par `tests/log-catalog.test.js`) et listé dans `docs/guide/index-codes.md` (`node tools/guide-index.mjs`).
- `docs/` — recherche, architecture, plan de tests, compte rendu de chaque cycle, audit du 30/10/2026 (`docs/audit-2026-10-30.md` : points positifs, points négatifs, écart au marché, plan des cycles 25 à 36) ; `docs/guide/` — guide d'utilisation avec les journaux attendus (extraits réels dans `docs/guide/journaux/`, produits par les tests de bout en bout).
- Guide HTML : `node tools/guide-html.mjs` construit `guide/` depuis `docs/guide/` (convertisseur `tools/md.mjs`, gabarit et groupes dans `tools/guide-html.mjs`, styles et recherche dans `tools/guide-assets/`) ; captures dans les trois langues : `cd tools && node guide-captures.mjs` (serveur sur le port 8791 ; elles vont dans `docs/captures/guide/`, absent du .zip puisque `guide/` les contient déjà). Données de l’exemple Kumakōgen, avec leurs sources : `docs/exemple-kumakogen/donnees.md`.

### Ajouter un widget
Dans `core/widgets-extra.js` :

```js
register('mon-widget', {
  label: 'Mon widget', icon: '★', category: 'Contenu',
  fields: [{ key: 'title', type: 'inline', i18n: true, label: 'Titre' }],
  defaults: () => ({ title: { fr: 'Bonjour' } }),
  css: '.mw{padding:12px}',
  render(p, c) { return `<div class="mw" data-edit="title">${c.inline(c.t(p.title))}</div>`; }
});
```

`c.t` choisit la langue, `c.esc` / `c.attr` échappent, `c.rich` / `c.inline` assainissent, `c.url` sécurise un lien (et résout `page:ID`), `c.img` donne l'adresse d'une image. `data-edit="champ"` (ou `items.0.champ`) rend le texte modifiable directement dans la page. Déclarez `script` si le widget a besoin de JavaScript sur le site publié : `site.js` n'est ajouté qu'aux pages qui l'utilisent.

### Tests
Les tests unitaires n'ont besoin que de Node 22 (et de PHP pour les tests d'intégration de publish.php, ignorés sinon). Les tests de bout en bout demandent Playwright (avec Chromium) et axe-core, installés dans `tools/` :

```
node --test tests/*.test.js
npm install --prefix tools playwright@1.56.1 axe-core@4.10.3
npx --prefix tools playwright install chromium
python3 -m http.server 8791 &
node tools/e2e/run.mjs http://localhost:8791/ /tmp/captures
```
385 tests unitaires (dont l’intégration du vrai publish.php avec PHP et la vérification que chaque code du journal est documenté) et 1687 vérifications de bout en bout (Playwright + Chromium, axe-core pour l’accessibilité, navigateurs reliés en WebRTC pour la collaboration, faux Gemini Nano pour l’IA locale, journaux attendus de chaque cas d’usage) couvrent les cycles 1 à 24.

### Sécurité
- Tout texte saisi est assaini à chaque frappe (liste blanche de balises, liens filtrés : pas de `javascript:`).
- Les valeurs de style sont typées et validées avant d'être écrites dans la CSS.
- Les adresses vidéo sont analysées strictement (identifiant alphanumérique uniquement).
- Les identifiants d'éléments et ancres sont nettoyés ; les données structurées JSON-LD sont échappées.
- Collaboration : clé privée jamais exportée hors du navigateur, invitations signées et datées, preuve de possession de la clé à chaque connexion, rôle relecteur appliqué par l'hôte, commentaires signés et vérifiés, opérations reçues filtrées (chemins dangereux, images), mise en relation chiffrée de bout en bout (le serveur ne voit ni la clé ni le contenu).
- Les valeurs des collections sont vérifiées selon leur type (texte sans balises, dates AAAA-MM-JJ, liens https/mailto/tel uniquement, images importées ou https), à la saisie comme à l'import CSV ; iCal et RSS sont échappés selon leur format.

### Suite possible
- Relais TURN facultatif pour les réseaux qui bloquent les connexions directes ; fusion caractère par caractère des textes (type Yjs) si l'usage le demande.
- Pagination et filtres côté visiteur pour les longues listes, recherche dans le site.
- Plus de langues (espagnol, italien, japonais…).
