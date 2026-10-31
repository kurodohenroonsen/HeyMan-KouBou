# Journal des modifications

Une entrée par cycle, construite à partir de la section « Livré » de `docs/cycle-NN.md` (cycles 1 à 24), la plus récente en haut. Les numéros de version des livraisons (.zip) ne sont pas écrits dans les comptes rendus : l’entrée porte alors le numéro du cycle (v19 = état livré après le cycle 24, d’après l’audit du 30/10/2026).

## cycle 26 — cycle 26 — 31/10/2026

**Ajouté**
- Visite guidée « Découvrir l'écran » : 5 étapes (bibliothèque, page, inspecteur, barre du haut, Fichier et ❓), masque avec découpe, bulle accessible (Échap, Tab enfermé, flèches) ; proposée à la première visite, jamais ensuite sans demande ; rejouable par ❓ ▾, Fichier et Ctrl+K.
- Liste « Pour commencer » en tête de l'onglet Widgets : 7 premiers pas cochés d'après le journal, pourcentage, liens vers chaque action, repliable et masquable.
- Démonstration Kumakōgen : l'éditeur construit lui-même, par ses vrais boutons, les deux pages du tutoriel (JA, EN, FR, 23 widgets, données vérifiées, illustrations dessinées) ; pause, vitesse, étape suivante, liste, arrêt ; projet de la personne mis de côté puis rendu intact, ou site gardé comme point de départ.
- Journal : `tour.*`, `onboarding.*`, `demo.*`, `project.already-saved`.

**Modifié**
- Ctrl+S affiche « Déjà enregistré » au lieu de télécharger le .json (toujours dans Fichier).
- Toute suppression affiche « Supprimé : … — Ctrl+Z pour annuler ».
- Primitives de pilotage de l'auto-test partagées avec la démonstration (`editor/ui-drive.js`).

**Corrigé**
- Déposer un widget sur une page vide (ou entre deux sections) crée sa section, comme le clic ; un dépôt refusé montre un fantôme barré et un message qui dit où déposer.

## cycle 30 — cycle 30 — 2026-10-31

### Ajouté
- Zoom de la page (ajuster, 100 %, 75 %, 50 % ; Ctrl+0, Ctrl+=, Ctrl+-) et repli des deux panneaux (bouton, Ctrl+Maj+F).
- Champs de longueur en nombre + unité (↑↓ ±1, Maj ±10), bouton « valeur libre », schéma de boîte avec cadenas « lier les 4 côtés », curseurs d'arrondi et d'opacité.
- Mode simple (par défaut) et mode expert (bouton « Tous les réglages », Fichier → Mode expert), choix retenu sur l'appareil.
- Listes à puces et numérotées (boutons, « - » et « 1. » en début de ligne, Entrée, Tab), menu « Format » (titre 2, titre 3, citation, exposant, indice).
- Collage depuis Word, Google Docs et LibreOffice avec gras, italique, liens, listes et intertitres (assaini).
- Icônes SVG monochromes de l'interface (`core/icons.js`).

### Modifié
- En mode Ordinateur, la page prend la largeur disponible dès 1 040 px au lieu d'être rendue à 1 280 px puis réduite.
- Barre du haut sur une seule ligne dès 1 280 px, libellés Traductions, SEO, Exporter, Publier ; plus d'émojis dans la barre ni dans l'inspecteur.
- Couleurs de palette affichées par leur nom (« Couleur principale ») ; libellés de l'inspecteur sur deux lignes au lieu d'être tronqués.
- Liens externes du site publié avec `rel="noopener"` ; styles publiés pour listes, intertitres et citations.

## cycle 29 — cycle 29 — 2026-10-31

### Ajouté
- Polices livrées avec le site (7 familles OFL dans `fonts/`, 762 Ko) : `@font-face` locales, préchargement de la police des titres, aucune requête vers Google ; police personnalisée `.woff2` (onglet Site → Typographie).
- Icône du site : `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `site.webmanifest`, `theme-color`.
- Pages « Mentions légales » et « Vie privée » générées dans les langues du site, liées au pied ; case de consentement obligatoire dans les formulaires.
- Page `404.html` par langue et `.htaccess` (404, https/www, en-têtes de sécurité, CSP, cache long, compression) ; option GitHub Pages sans `.htaccess`.
- publish.php version 5 : codes d'erreur traduits, `.htaccess` écrit par le serveur, polices, SVG, PDF, audio, manifeste acceptés.
- CSP stricte dans l'éditeur (`editor/boot.js` remplace les scripts en ligne).

### Modifié
- Noms des fichiers de `assets/` suffixés d'une empreinte de contenu ; `og:locale` régional, `twitter:title/description`, `<lastmod>` dans le plan du site.
- Signalisation de la collaboration : preuve de salle, 16 Ko par message, 2 Mo par salle, limite par adresse.

### Corrigé
- Publication partielle annoncée comme réussie (désormais HTTP 500 avec la liste des fichiers, manifeste inchangé).
- Trace de débogage et version de PHP lisibles sans jeton ; `rate.php` sans verrou ; expéditeur du formulaire dérivé de l'en-tête `Host`.

## cycle 25 — 2026-10-31 — Colmatage (sécurité)

### Ajouté
- `core/sanitize-site.js` : `sanitizeSiteTexts(site)` assainit tous les textes d'un projet selon le type de champ (richtext, inline, texte simple), pages, composants, en-tête et pied en blocs, collections, menu, SEO, pied de page ; appelé par `normalizeSite`, à l'ouverture d'un `.json`, sur le projet reçu d'un hôte et sur les modifications reçues d'un pair (`project.import.sanitized`, `collab.snapshot.sanitized`, `collab.ops.sanitized`).
- Jeton de publication lié à l'adresse : `php-token:<origine>` et `github-token:<owner/repo>`, pré-remplis seulement pour la même destination ; migration automatique des anciennes clés (`storage.secret-migrated`).
- Confirmation explicite de la première publication (ou du premier envoi du jeton) vers une adresse ou un dépôt jamais utilisés sur l'appareil (`publish.first-origin`, `publish.*.cancel`).
- Journal `project.import.publish-url` quand un projet ouvert publie ailleurs ; `publish.token-for`.
- `.github/workflows/tests.yml` (tests unitaires à chaque push, bout en bout la nuit) ; ce `CHANGELOG.md`.
- Tests : `tests/sanitize-site.test.js`, `tests/innerhtml.test.js`, cas ajoutés dans `collab`, `publish`, `storage` ; scénario `tools/e2e/cycle25.mjs`.

### Modifié
- `publish` devient une partie privée en collaboration : jamais envoyée, opération d'un pair refusée (« partie privée »).
- Le projet complet reçu d'un hôte est validé (`validateSite(normalizeSite(doc))`) avant d'être chargé.

### Corrigé
- XSS par le tableau des traductions (`editor/i18n-ui.js`) : la cellule n'insère plus que du texte assaini.
- Exfiltration du jeton : un `.json` ou un pair ne peut plus rediriger la publication vers une autre adresse en gardant le jeton pré-rempli.
- Snapshot invalide de l'hôte : refus propre (`collab.snapshot.invalid`) au lieu d'un canevas cassé.

## v19 — cycle 24 — Guide d’utilisation en HTML, pour tout le monde

### Ajouté
- **Guide HTML** : `tools/md.mjs` (Markdown → HTML, détails techniques marqués), `tools/guide-html.mjs` (pages, groupes, sommaire, captures, recherche, langues), `tools/guide-assets/` (styles, recherche, case technique, menu mobile), `tools/guide-captures.mjs` (11 captures × 3 langues, dont la nouvelle fenêtre) → `guide/` : 21 pages par langue, 308 sections indexées.
- **Dans l’éditeur** : bouton ❓, Fichier → Guide d’utilisation, F1 (chapitre de la fenêtre ouverte), Ctrl+K « 📖 Guide d’utilisation » ; `editor/help.js`, journal `ui.help`.
- **Nouveau site vide avec choix des langues** (manque trouvé par l’audit, nécessaire à l’exemple) : `blankSite()` dans `core/site.js` (testé : `tests/new-site.test.js`), fenêtre `editor/new-site-ui.js` (nom, langue principale dont le japonais, autres langues, version de sécurité, Ctrl+Z) ; page d’accueil nommée dans la langue principale (« ホーム ») ; journal `project.new` `{lang, languages}`, `project.new-lang`.
- **Chapitres grand public** (FR, EN, JA) : *Bienvenue dans Atelier*, *Prise en main : le site touristique de Kumakōgen en deux pages* (32 étapes, chacun des 23 widgets, tableau widget → étape pour la future visite guidée), *Tous les widgets* (une fiche par widget, tous ses réglages).
- **Audit de couverture** (`docs/guide/_audit-couverture.md`) et manques comblés dans les trois langues : 1.5 (nouveau site), 1.7 (guide), 2.14 (F1), 2.18 (toutes les commandes Ctrl+K), 3.13–3.16 (haut de l’inspecteur, section/rangée/colonne, effets, popup), 4.7, 4.9, 4.21, 4.30 (liste de contenus), 5.6.
- **Données de l’exemple** : `docs/exemple-kumakogen/donnees.md` (recherche du 29/10/2026, faits ✅ recoupés ou ⚠️ à vérifier, sources ; kuma-kanko.com fermé temporairement ce jour-là).
- **Limites** : textes d’exemple des modèles en français seulement (ligne JA vide au départ dans un site japonais) ; tutoriel vérifié dans le code mais pas encore rejoué de bout en bout (ce sera la visite guidée) ; textes japonais du tutoriel à faire relire par une personne de langue japonaise ; la langue principale d’un site existant ne se change pas.

### Modifié
- **Noms de widgets plus clairs** : « Carte géographique » et « Carte de contenu » (au lieu de deux « Carte ») ; famille « Collections » / 「コレクション」 en anglais et japonais pour les widgets de collection (elle se confondait avec « Contenu »).

### Corrigé
- Tests : 385 unitaires ; régression complète 1687 vérifications de bout en bout, 0 échec (dont 48 pour ce cycle).

## cycle 23 — Panneaux de gauche et de droite redimensionnables

### Ajouté
- `core/panel-size.js` (sans DOM, testé), `editor/panel-resize.js`, variables CSS `--left-w` / `--right-w` de `.workspace`, poignées et styles ; traductions EN/JA (`i18n/parts/G-panneaux.*.json`) ; guide §2.17 en français, anglais et japonais ; auto-test : 26 cas.

### Corrigé
- Régression complète : 1639 vérifications, 0 échec ; unitaires : 371.

## cycle 22 — Interface en français, anglais et japonais ; sites en japonais

### Ajouté
- Socle : `core/ui-i18n.js`, `editor/ui-lang.js`, script de langue de index.html, `tools/i18n.mjs` (extraction robuste : commentaires, expressions régulières, gabarits imbriqués), sélecteur (menu Fichier, Ctrl+K, `?lang=`), polices japonaises de l'éditeur, onglets qui passent sur deux lignes.
- **3254 chaînes** de l'interface et du journal traduites en anglais et en japonais, en six lots (`i18n/parts/` : commun, A édition, B style, C contenus, D IA et journal, E collaboration, F sites), même glossaire ; contextes `__c` pour les mots à deux sens (Annuler, Titre, Carte, Adresse, élément…).
- Échanges entre pairs et données signées inchangés (une personne en français et une autre en japonais travaillent ensemble) ; les erreurs reçues d'un pair sont traduites à l'affichage.
- **Japonais pour les sites** : `ja` dans les langues du site, adresses ASCII lisibles (kana → rōmaji Hepburn, repli `page-<empreinte>` stable), textes publiés par langue de page (fr, nl, de, en, ja — ils restaient en français sur les pages nl, de, en), seuils SEO japonais, polices japonaises du site, traduction fr → ja.
- **Guide** complet en anglais et en japonais : `docs/guide/en/`, `docs/guide/ja/` (16 chapitres, sommaire, index des codes ; extraits de journal d'origine).
- Captures : `docs/captures/c22-en-editeur.png`, `c22-ja-autotest.png`.

## cycle 21 — Infobulles des boutons

### Ajouté
- `core/tooltip.js` (sans DOM, testé) : raccourci lu dans le texte d’aide, touches Mac, bouton « à icône », choix du texte, placement.
- `editor/tooltip.js` : infobulle unique (`#atelierTip`, `role="tooltip"`, `aria-describedby`), survol 0,35 s, passage rapide immédiat, clavier (Tab, `:focus-visible`), masquage (sortie, clic, Échap, défilement, fenêtre quittée), dans la fenêtre modale ouverte pour passer devant, barre du canevas avec la réduction ; `title` déplacé dans `data-tip`, `aria-label` ajouté aux boutons à icône qui n’en avaient pas ; explications des boutons les plus obscurs.
- Auto-test : cas `infobulles` (25 cas). Guide : chapitre 2.16, chapitre 15.

## cycle 20 — Auto-test en console, avec retour arrière

### Ajouté
- `core/selftest.js` (sans DOM, testé) : catalogue de 24 cas (chapitres 0 à 13), choix par identifiant ou chapitre, codes attendus avec alternatives, erreurs autorisées par cas, statut, résumé et note, rapport Markdown (résultat, retour arrière, tableau, détails avec extrait du journal, avertissements, environnement), JSON stable.
- `editor/selftest.js` : pilotage de la vraie interface (clics, saisies, raccourcis, fichiers dessinés dans le navigateur), confirmations et téléchargements interceptés, faux modèle intégré (`core/fake-nano.js`, partagé avec les tests) ou vrai Gemini Nano, délai par cas, arrêt propre (un cas arrêté échoue à sa prochaine attente au lieu de continuer).
- `editor/selftest-safe.js` : mise de côté (mémoire avec l'historique, emplacement `selftest-backup`, version de sécurité, repère `localStorage`), retour arrière vérifié (JSON identique en mémoire, réenregistré et relu), nettoyage des versions et images temporaires, `rollback()` manuel, restauration au démarrage après une interruption.
- `editor/store.js` : `captureState()` / `restoreState()` ; `editor/storage.js` : `deleteProject`, `listAssetIds`, `deleteAssets`.
- Console : `atelierDebug.selftest(options)`, `.rollback()`, `.report()`, `.cases()` ; Ctrl+K « Auto-test ».
- Journal : `selftest.*`, `store.restore`, `storage.project-delete`, `storage.asset-delete` ; chapitre 15 du guide (exemple de rapport réel : `docs/guide/journaux/autotest-rapport.md`).

## cycle 19 — Banc d'essai de l'IA locale (Gemini Nano dans Chrome)

### Ajouté
- `core/bench.js` (sans DOM, testé) : 18 cas en 5 groupes, données d'exemple (site avec page, agenda, membres, actualités, trois commentaires), vérifications avec détail (essentielles ou secondaires), statuts réussi / partiel / échoué / erreur / ignoré / arrêté, note sur 100, rapport Markdown (environnement, tableau, détail des échecs).
- `tools/fake-nano.mjs` : faux « bon » et « mauvais » Gemini Nano, partagés par les tests unitaires et de bout en bout.
- Éditeur (`editor/bench-ui.js`) : **🧪 Banc d'essai** (fenêtre ✨ IA locale, Ctrl+K) : état des API et paramètres du modèle, modèles à télécharger signalés, groupes à cocher, images de test dessinées dans le navigateur (affiche, cercle rouge sur fond bleu), progression cas par cas, Arrêter, rapport à copier, .json avec le journal de l'IA.
- Journal : `bench.*` ; chapitre 14 du guide ; renvoi depuis le chapitre 7.

## cycle 18 — Demander à Atelier

### Ajouté
- `core/assistant.js` (sans IA, testé) : catalogue fermé de 10 actions, schéma JSON pour le modèle (énumérations des actions, modèles de section, types d'éléments, réglages, outils, langues), consigne (catalogue) et contexte court (pages, sections de la page affichée, sélection), validation et normalisation (couleurs par nom FR/NL/DE/EN, par rôle ou en hexadécimal ; tailles ; alignements ; graisses ; casse ; marges ; arrondis), refus expliqués, avertissements (contraste de la palette, menu personnalisé, plus de 10 actions), application pure en une étape (sections après la sélection dans l'ordre demandé, FAQ, éléments, styles résolus au moment d'appliquer, texte de la sélection, palette, pages avec sections et adresse unique, vue, outils), liste des textes écrits par l'IA.
- `core/ai-tasks.js` : tâche `plan`.
- Éditeur (`editor/assistant-ui.js`) : fenêtre **✨ Demander à Atelier** (demande, exemples, aperçu, refus, avertissements, Appliquer) ; Ctrl+K : une phrase de 3 mots ou plus propose « ✨ Demander à Atelier : … » en tête, et la commande « Demander à Atelier » ; **✨ Page décrite** dans le panneau Pages ; textes marqués « à relire » ; outils demandés ouverts après application.
- Journal : `assist.*`, `ai.plan.*` ; chapitre 13 du guide.

### Corrigé
- Ctrl+K : une phrase qui est le nom exact d'une commande (« journal de débogage », « résumé de la relecture ») garde la commande en tête ; « Demander à Atelier » vient juste après.
- Régression complète : 1434 vérifications de bout en bout (cycles 2 à 18), 0 échec.

## cycle 17 — Contenus intelligents

### Ajouté
- `core/smart.js` (sans IA, testé) : schéma JSON d'un élément depuis les champs de la collection ; normalisation des dates d'affiche (formats numériques, mois en lettres FR/NL/DE/EN, année manquante → prochaine occurrence, année inventée ignorée), heures (`20h30`, `8 pm`…), liens sans `https://`, nombres, choix par valeur ou par libellé dans toutes les langues, texte → texte mis en forme ; valeurs écartées avec leur raison ; doublons ; résumé chiffré de la relecture ; couleurs dominantes d'une image ; palette c1…c6 avec corrections de contraste jusqu'à WCAG AA pour les sept paires.
- `core/ai-tasks.js` : `extractItems` (image ou texte → éléments vérifiés, traduction des champs multilingues si la langue principale n'est pas parlée par Gemini Nano), `excerpt` (Summarizer `teaser`, sinon Prompt API), `headlines` (3 titres uniques), `reviewSummary` (Summarizer `key-points` + tâches par commentaire, ids vérifiés, commentaires oubliés repris tels quels).
- Éditeur (`editor/smart-ui.js`) : **✨ Depuis une affiche** et **✨ Depuis un texte** dans chaque collection (aperçu, valeurs écartées signalées, doublons décochés, brouillons, photo importée comme image de l'élément, textes « à relire », une étape d'annulation) ; **✨ Proposer** (chapô) et **✨ Titres** dans le formulaire d'un élément ; **📋 Résumé de la relecture** (sans IA, puis points clés et tâches avec « Aller à », copie) ; **🎨 Palette depuis le logo** dans le panneau Site ; Ctrl+K pour la palette et le résumé.
- Journal : `smart.*` et `ai.extract`, `ai.excerpt`, `ai.headlines`, `ai.review-summary` ; chapitre 12 du guide avec extraits réels ; repérage des parcours déclarés avec une condition (`const f = a ? log.flow(…) : log.flow(…)`).

### Corrigé
- Fenêtres de la palette et du texte collé : « null » s'affichait à la place d'un bloc absent.
- Fenêtre d'une collection : les nouveaux boutons décalaient la liste des éléments (grille du panneau latéral).

## cycle 16 — Journal de débogage (navigateur et PHP) et guide d'utilisation

### Ajouté
- **Journal central** (`core/log.js`, `editor/log.js`) : un seul journal pour tout l'éditeur, iframe comprise ; console (`[Atelier]`, couleurs par niveau, JSON compact recopiable), tampon de 5000 événements, parcours mesurés, masquage avant écriture, réglages `?debug` / `?trace` / `?quiet`, API `atelierDebug` dans la console.
- **Captures globales** : erreurs non attrapées, promesses rejetées, fichiers non chargés, CSP, en ligne / hors ligne, lenteurs (> 200 ms), `console.error` d'autres scripts, chaque requête réseau (avec la trace de publish.php recopiée dans l'ordre), fenêtres, clics, champs, raccourcis, messages affichés. Script de démarrage classique : erreurs de chargement et démarrage qui n'aboutit pas en 15 s.
- **Fenêtre 🐞** (barre du haut, Ctrl+Alt+J, Ctrl+K « Journal ») : pastille d'erreurs, filtres, recherche, réglages, copier (avec l'environnement : navigateur, écran, stockage, projet, éditeur, IA, collaboration), télécharger, vider, journal du serveur.
- **publish.php version 4** : identifiant par requête (`X-Atelier-Request`), journal protégé `atelier-data/log-AAAA-MM.php` (rotation à 2 Mo, niveau réglable `LOG_LEVEL`), trace renvoyée avec `?atelier_debug=1`, `?logs=N` et diagnostic de l'hébergement avec le jeton, avertissements / exceptions / erreurs fatales notés (500 avec référence), cause précise d'un envoi refusé (`upload_max_filesize`, `post_max_size`…), aucune IP, aucun jeton, aucun contenu de message.
- **Site publié** : journal muet par défaut, allumé par `?atelier-debug` (menu mobile, formulaire, listes datées, galeries, vidéos et cartes, erreurs).
- **Instrumentation de tous les modules** : 748 codes dans 39 domaines (démarrage, sauvegarde, historique, édition, canevas, inspecteur, styles, glisser-déposer, actions, structure, modèles, pages, réglages, images, collections, versions, traductions, SEO, IA locale avec cause probable de chaque échec de Chrome, publication, collaboration WebRTC avec diagnostic ICE, relecture, PHP, site publié).
- **Guide d'utilisation** `docs/guide/` : 12 chapitres, chaque cas d'usage avec chemin normal, variantes et erreurs, extraits réels (`docs/guide/journaux/`, 176 fichiers produits par les tests), index de tous les codes généré depuis le source (`tools/guide-index.mjs`), extraits des chapitres 5 à 7 regénérables (`tools/guide-sync.py`).

### Corrigé
- publish.php : l'adresse d'expéditeur des formulaires contenait le port (`noreply@hote8080`) quand l'hôte en avait un.
- Logo : une adresse `https://` était ignorée sans message ; elle est acceptée (le rendu la gérait déjà).
- Panneaux Pages et Site : Entrée puis « change » enregistraient deux fois (deux étapes d'annulation) ; le bouton ⟲ de l'adresse par langue partait d'un titre périmé ; la vignette du logo ne se redessinait pas ; une modification refusée en mode relecture était annoncée comme réussie.
- Versions : la suppression n'avait pas de traitement d'erreur.
- Édition : un clic sur la barre de mise en forme vidait la sélection ; le déplacement avec la poignée ✥ perdait la sélection ; renommer un composant enregistrait deux fois ; « Image ajoutée en WebP » même quand le navigateur avait produit du JPEG.
- Collaboration : cadre de présence non redessiné ; cache des signatures qui gardait « ✓ signé » pour un commentaire modifié ; message d'erreur à tort en quittant la session ; message vide pour un code manuel incomplet ; erreur de traitement confondue avec un message indéchiffrable.
- Traduction : sans API Translator, une erreur TypeError au lieu d'un message clair.

## cycle 15 — IA locale (Gemini Nano) et référencement complet

### Ajouté
- **Publication** : `<title>` réglable, `og:type`, `og:url`, `og:site_name`, `og:image` (image de partage, sinon image de l'élément, sinon première image), `twitter:card`, `robots noindex` (et sitemap sans ces pages), JSON-LD Organization (logo, réseaux) + WebSite sur l'accueil, BreadcrumbList sur les autres pages et les pages d'éléments.
- Tout texte écrit par l'IA est marqué « à relire » (tableau des traductions, filtre « à relire ») et s'annule en une fois par Ctrl+Z.
- Adresses accentuées affichées lisiblement (punycode décodé : www.média-alternatif.be).

### Modifié
- **Référencement** (`core/seo.js`) : titre pour Google, description, mot-clé principal (par langue), image de partage, « ne pas indexer » ; analyse par page et par langue avec note sur 100 et points classés (problème, à améliorer, conseil, bien) ; points du site (adresse, logo, réseaux sociaux) ; titres et descriptions en double ; pages orphelines ; liens au texte vague ; images sans texte alternatif ou au nom de fichier ; mot-clé dans le titre, la description, le H1, l'adresse et le début du texte ; traductions manquantes.
- **Éditeur** : bouton ✨ (état de chaque API, téléchargement avec progression, réglages Chrome à copier pour Rewriter, Writer, Proofreader) ; ✨ dans la barre de mise en forme (sur la sélection ou le paragraphe ; proposition, puis Remplacer ou Annuler ; corrections surlignées et appliquées à l'endroit exact, mise en forme gardée) ; 🔎 SEO (aperçu Google et partage, champs avec compteurs, ✨ proposer titre / description / idées de mots-clés, ✨ décrire les images manquantes, ✨ compléter toutes les descriptions manquantes de la langue, « Aller à ») ; ✨ Décrire l'image dans l'inspecteur ; Ctrl+K « Référencement » et « IA locale ».

### Corrigé
- **IA locale** (`core/ai-tasks.js` + `editor/ai.js`) : API dédiées de Chrome quand elles sont là (Summarizer, Rewriter, Proofreader — y compris en essai développeur), sinon Prompt API avec schéma JSON ; tâches reformuler (5 modes), corriger, description, titre, mots-clés, texte alternatif (image donnée au modèle localement), texte de lien ; sorties nettoyées et coupées proprement ; néerlandais rédigé en français puis traduit.
- Ctrl+Z après une proposition de l'IA n'annulait que la marque « à relire » (étape séparée) : marque et texte forment désormais une seule étape.
- « Compléter les descriptions » en NL ignorait les pages dont la description française servait de repli : la langue doit maintenant avoir sa propre description.
- Les anciennes fonctions de description (panneau Pages, traductions) écrasaient les nouveaux réglages de référencement : elles les gardent.

## cycle 14 — Relecture et édition à plusieurs (pair-à-pair)

### Ajouté
- **Identité et relecture** (`core/review.js`) : clé ECDSA P-256 créée dans le navigateur (`did:key:zDn…`), salles (secret dans le lien, identifiant SHA-256), invitations signées (rôle, salle, expiration 7 jours), preuve de possession de la clé, commentaires et réponses signés, vérification des signatures et des auteurs à la réception, chiffrement AES-GCM des messages de mise en relation.
- **Protocole** (`core/collab-protocol.js`) : étoile autour de l'hôte, hello / auth / sync / snapshot / delta / ops / presence, relais par l'hôte, rôle relecteur limité aux commentaires, messages découpés en morceaux et réassemblés, traitement des messages dans l'ordre, salut renvoyé tant que l'autre n'a pas répondu.
- **publish.php version 3** : boîte aux lettres de signalisation (messages chiffrés, salle de 64 caractères hexadécimaux, 64 Ko par message, 200 messages gardés, 15 minutes, 100 sessions au plus, fichiers protégés).
- Canal WebRTC : flux contrôlé (pas de saturation de la mémoire tampon avec un gros projet), messages reçus avant la mise en place gardés en attente. STUN réglable (par défaut celui de Google, vide = réseau local seulement).

### Modifié
- **Synchronisation** (`core/collab.js`) : différences en opérations, registres « le dernier qui écrit gagne » avec horloge logique hybride, éléments repérés par `id` / `key` / `value`, ordre des listes, suppressions qui gagnent, reprise par échange des tables de versions, opérations vérifiées (chemins dangereux, images, partie privée), annuler qui ne retire que ses propres modifications (l'historique reçoit celles des autres).
- **Éditeur** : bouton 👥 (nom, clé, démarrer, liens éditeur et relecteur, connexion par codes, participants, fermer ; reprise après rechargement), fenêtre « Rejoindre » sur un lien `#join=…` (une version de sécurité d'abord), pastilles des participants (clic : aller où ils travaillent), cadre coloré sur l'élément sélectionné par chacun, message « Ana travaille aussi sur… » dans l'inspecteur, mode relecture (rien ne se modifie, bandeau), modifications reçues sans interrompre une saisie (page et inspecteur), bouton 💬 avec le nombre de commentaires ouverts, panneau (cette page, ouverts, tous ; commenter l'élément sélectionné, répondre, résoudre, supprimer, aller à l'élément ; ✓ signé / ⚠), pastilles numérotées dans la page.

### Corrigé
- Le premier message d'un canal tout juste ouvert se perdait parfois (connexion bloquée une fois sur deux en test) : les messages arrivés avant la mise en place sont gardés et le salut est renvoyé.
- Messages traités dans le désordre pendant la vérification (asynchrone) des signatures : traitement en file par lien.
- Bug du cycle 11 trouvé en regardant les captures : une règle CSS de la fenêtre des traductions (`.i18n`) élargissait aussi les champs multilingues de l'inspecteur et de la fenêtre des contenus à 1280 px (texte coupé à droite) ; limitée à la fenêtre.
- Un lien `#join=…` ouvert dans un onglet déjà ouvert ne déclenchait rien (changement d'ancre sans rechargement) : géré.

## cycle 13 — Contenus répétés (collections)

### Ajouté
- **Fenêtre de collection** : éléments (recherche, ajout en brouillon, formulaire par langue, image, date, heure, lien vérifié, adresse, publié ou brouillon, ordre, copie, suppression, « voir sa page ») ; champs (ajout, nom, « à traduire », choix un par ligne, ordre, suppression avec nettoyage des valeurs et des liaisons) ; réglages (nom, adresse par langue, pages de détail, RSS, page de liste, ordre par défaut, suppression) ; export et import CSV (mise à jour par adresse, choix reconnus par leur libellé, lignes en erreur signalées).
- **Liste de contenus** (widget) : grille ou liste, colonnes, maximum, ordre, filtre par choix, à venir / passés pour l'agenda, texte si vide, lien « voir tout ». Les événements devenus passés sont masqués chez le visiteur par un petit script ; sans JavaScript, la sélection faite à la publication reste correcte.
- **Lien interne** `item:` vers la page d'un élément, juste dans chaque langue.
- **Publication** : pages de détail par langue (titre, description, `og:image`, canonique, `hreflang`, sitemap), JSON-LD Event / NewsArticle / Organization, `.ics` par événement et `calendar.ics` (fuseau Europe/Brussels, journées entières, repli RFC 5545), flux RSS par langue annoncé dans le `<head>`. publish.php passe en version 2 (accepte `.ics`) ; avec une version 1 installée, le site est publié sans les `.ics` et un message explique comment mettre à jour.
- **Partout ailleurs** : textes des éléments, libellés des choix et textes fixes des modèles dans les traductions (à traduire, traduction automatique, CSV, « Aller à ») ; versions (« contenus différents : Agenda ») ; contrôle avant export (liste sans collection, événement sans date ni lieu, collection vide, lien vers un brouillon) ; Ctrl+K (ouvrir une collection, sa carte, sa page de détail, nouvelle collection).

### Modifié
- **Panneau Contenus** : collections avec leur nombre d'éléments et de brouillons, « + Nouvelle collection » en quatre types (Médias membres, Actualités, Agenda, Personnalisée). En option : page de liste créée et ajoutée au menu, exemples clairement marqués « à remplacer ».
- **Carte et page de détail** dessinées avec l'édition ciblée : bandeau avec choix de l'élément d'aperçu, « 🔗 Relier à un champ » dans l'inspecteur (titre, texte, image, lien, avec conversions sûres), texte relié protégé de l'édition directe (message qui dit où le changer), widget **Champ** (icône, libellé, format de date), double-clic sur une liste pour modifier sa carte.

### Corrigé
- Bouton « Ajouter à mon agenda » : lien `./event.ics` simplifié en `event.ics`.
- Fenêtre de collection : un nouveau rendu pendant le précédent (champ quitté au moment d'un clic) provoquait une erreur ; les rendus sont maintenant mis en file.
- Un widget dont le rendu est vide n'ajoute plus d'enveloppe vide au site publié (évite des espaces fantômes dans les cartes).
- Onglets du panneau de gauche (six maintenant) et bandeau d'édition resserrés pour tenir sans être coupés.

## cycle 12 — Publication et versions

### Ajouté
- **Versions** (Fichier → Versions…, ou Ctrl+K) : enregistrer une version nommée ; version automatique au début de chaque journée de travail ; version de sécurité avant restauration, ouverture d'un projet, nouveau site ou exemple. Chaque version indique ce qui diffère de l'état actuel (« pages différentes : Accueil »…). Restaurer (annulable par Ctrl+Z), supprimer. Les images ne sont pas recopiées. 30 versions automatiques au plus, les versions nommées sont gardées.
- **Secrets** : jetons gardés dans le champ, ou sur l'appareil si on coche « se souvenir », jamais dans le projet, l'export .json ou les versions.

### Modifié
- **🚀 Publier**, trois voies : - **OVH avec publish.php** : « ⇩ publish.php » crée un jeton et télécharge le fichier personnalisé ; on le dépose une fois par FTP ; « Tester la connexion » ; « Publier le site ». Les formulaires de contact passent alors par publish.php et arrivent par e-mail : l'adresse ne figure plus du tout dans les pages. - **GitHub → OVH** : un commit par publication, seuls les fichiers modifiés sont envoyés, les fichiers retirés du site disparaissent du dossier, le reste du dépôt est conservé ; l'intégration Git d'OVH déploie (webhook). - **Fichier .zip** comme avant.

### Corrigé
- Fenêtre Publier : étape 1 coupée en deux et boutons étirés sur toute la largeur, remis en ligne après la vérification visuelle.
- Le lanceur de tests comptait comme « erreur JavaScript » le message réseau d'un refus HTTP volontaire (401) : seules les vraies exceptions sont désormais comptées.

## cycle 11 — Langues

### Ajouté
- **Adresses traduites** (panneau Pages, une ligne par langue, bouton ⟲ « depuis le titre ») : `/nl/neem-contact-op/` au lieu de `/nl/contact/`. Menu, choix de langue, liens internes, hreflang, canonique et sitemap suivent. Doublons refusés par langue.
- **Inventaire unique des textes** : pages, éléments (listes comprises), composants, en-tête et pied en blocs, menu, pied de page, libellés accessibles. Le badge « à traduire » et la vérification avant export comptent maintenant aussi les composants et le menu, et « Aller à » ouvre le composant ou l'en-tête concerné.
- **Tableau des traductions** (bouton 🌐 en haut, Ctrl+K, ou depuis la vérification) : une ligne par texte, une colonne par langue, cases manquantes en orange, édition sur place avec la mise en forme (gras, liens), filtres « à traduire » et « à relire », recherche, « Aller à ».
- **Export / import CSV** pour un traducteur : UTF-8 lisible par les tableurs ; à l'import, seules les clés connues sont prises, tout est assaini, compte rendu (textes mis à jour, lignes ignorées).
- **Traduction automatique sur l'appareil** (API Translator de Chrome) : textes manquants seulement, une langue à la fois, balises préservées (seuls les morceaux de texte sont traduits : « <strong>sans compromis</strong> » reste en gras), progression, arrêt. Chaque texte traduit est marqué **à relire** : « ✓ Valider » dans le tableau, ou toute correction (tableau, inspecteur, page) retire la marque ; la vérification avant export rappelle le nombre restant. Rien n'est envoyé à un serveur.
- **Masquer dans une langue** (onglet Avancé) : l'élément disparaît du site dans cette langue (et de la description pour Google), reste visible en transparence dans l'éditeur.

## cycle 10 — Accessibilité et performance

### Ajouté
- **Contraste en direct** : pastille sous « Couleur du texte » et « Couleur de fond » (rapport réel, seuil, grand texte), y compris pour les boutons selon leur apparence et le fond hérité des parents ; fond en image signalé « à vérifier à l'œil ». Panneau Site : 7 paires de palette (texte, texte discret, liens, boutons, texte clair sur sombre, cartes) recalculées pendant le choix de couleur.
- **Vérification avant export** : contrastes insuffisants (élément, couleurs, rapport), niveaux de titres sautés, absence ou excès de H1.
- **Déclaration d'accessibilité** en FR/NL/DE/EN : assistant (organisation, contact, état de conformité, date, limites connues pré-remplies avec la vérification), page en `<article>`, lien « Accessibilité » dans le pied de page, hors du menu principal. Toute page peut être marquée « lien dans le pied de page ».
- **Images responsives** : variantes 480 / 960 / 1600 px à l'import (repli JPEG si le navigateur ne sait pas encoder en WebP), `srcset`, `sizes` calculé d'après la colonne (imbrications et empilement mobile/tablette compris), `width`/`height`, priorité haute pour la première image seulement, chargement différé pour les autres.
- **Enregistrement léger** : le projet sauvegardé passe de plusieurs Mo à quelques Ko (12 Ko pour le site d'exemple avec photo), les images sont écrites une seule fois à part. Anciens projets relus sans perte.
- **Mouvement** : transitions entre pages (`@view-transition`), apparition au défilement (Fondu, Montée, Zoom) en CSS pur ; tout est coupé pour les visiteurs qui préfèrent moins de mouvement.
- **axe-core** dans les tests : accueil (ordinateur et mobile), contact en néerlandais, déclaration en français et en allemand : **0 violation WCAG 2.1 A/AA**. Contre-épreuve : une copie volontairement abîmée de la page fait bien ressortir 3 violations (image sans description, contraste, lien vide).

## cycle 9 — Composants et structure du site

### Ajouté
- **3 nouveaux widgets** (catégorie Site) : Logo du site, Menu, Choix de langue.
- **Menu** (panneau Pages) : automatique ou personnalisé ; liens externes, pages absentes à rajouter, ordre, sous-menu (⇥ / ⇤), libellés par langue indépendants du titre de la page, retour au menu automatique. Sous-menus au survol et au clavier.
- **Menu mobile** : bouton « ☰ Menu » accessible (`aria-expanded`, `aria-controls`, Échap le referme) ; sans JavaScript, le menu reste affiché. Réglable (panneau Site, ou case du widget Menu).
- **Popups** : un bouton peut « Ouvrir en fenêtre » un composant (liste « Lier à… »). API Popover native : aucun script, Échap et bouton Fermer, fond assombri.
- **Sémantique** : balises article, nav, header, footer, aside pour les sections ; libellé accessible (`aria-label`) par langue dans l'onglet Avancé.
- Contrôle avant export : bouton qui ouvre une fenêtre dont le composant a été supprimé.

### Modifié
- **Composants** : clic droit → « Créer un composant… » (ou onglet Avancé, ou Ctrl+K). Panneau Modèles → « Mes composants » : cliquer ou glisser pour réutiliser, renommer, voir le nombre d'utilisations, supprimer. Double-clic sur une instance → mode « modifier le composant » (bandeau violet « N utilisations suivront », Terminer) ; Ctrl+Z fonctionne. Onglets Style et Avancé de l'instance : marges, ancre propres à cette utilisation. « Détacher » en fait une copie indépendante.
- **En-tête et pied de page en blocs** : panneau Site → « Personnaliser avec des blocs » (logo, menu, langues ; pied : logo, texte, menu en colonne, réseaux sociaux). Pendant la modification, la page est grisée et verrouillée. « Revenir au défaut » à tout moment. Double-clic sur l'en-tête personnalisé dans la page = le modifier.

## cycle 8 — Productivité et clavier

### Ajouté
- **Barre de commandes Ctrl+K** : 18 widgets, 13 modèles, pages, tous les éléments de la page (cherchés par leur texte), appareils, langues, panneaux, 40 réglages de style, actions (dupliquer, exporter, vérifier, textes à traduire, nouvelle page…). Recherche sans accents, plusieurs mots, lettres dans l'ordre. Les dernières commandes reviennent en tête (mémorisées dans ce navigateur).
- **Recherche dans les réglages** (onglet Style) : filtre en direct et ouvre les groupes concernés.
- **Sélection multiple** : Maj+clic dans la page ou la Structure ; cadres bleus numérotés ; inspecteur « N éléments sélectionnés » ; réglages, coller le style, dupliquer, supprimer sur tous, en une seule étape d'annulation.
- **Vue tous appareils** (bouton 🖥▭▯) : trois champs côte à côte pour chaque longueur ou nombre.
- **Clavier** : ↑ ↓ ← → pour parcourir la page ; Ctrl+X puis Ctrl+V pour déplacer sans souris ; Structure entièrement navigable (flèches, Début/Fin, Entrée, ← / → pour replier/déplier) ; Ctrl+D fonctionne même depuis un champ de l'inspecteur ; `?` affiche l'aide.

### Corrigé
- Ctrl+D ne faisait rien quand le focus était dans un champ de l'inspecteur.
- Maj+clic surlignait aussi du texte dans la page.
- Recherche « tit » : les nombreux éléments de la page passaient devant « Ajouter : Titre » (poids réduit pour les éléments).

## cycle 7 — Système de design

### Ajouté
- **Échelles fluides** dans le panneau Site : taille du texte et contraste entre tailles, pour le mobile et le grand écran, avec aperçu des 7 tailles ; échelle d'espacements avec aperçu. Les titres H1–H4 et le texte utilisent l'échelle : sans aucun réglage, un H2 fait 33 px sur mobile et 44 px sur grand écran.
- **Onglet Style** : à côté de « Taille », une liste « Échelle… » (Titre 1 · 40–55 px…) ; sous chaque marge, une liste d'espacements. Les expressions `clamp()`, `min()`, `max()`, `calc()` sont acceptées si elles sont sûres.
- **CSS personnalisée** par élément (onglet Avancé), filtrée.
- Les anciens projets sont complétés automatiquement à l'ouverture (`normalizeSite`).
- Contrôle avant export : une couleur supprimée de la palette mais encore utilisée est signalée.

### Modifié
- **Presets** : « + Preset » enregistre le style de l'élément sous un nom ; la liste applique un preset ; « Modifier le preset » (bandeau bleu explicite : « N éléments suivront ces réglages ») ; « Détacher » ; « Par défaut pour les Boutons ». Gestion dans le panneau Site : renommer, dupliquer, supprimer (les éléments gardent leur apparence).
- **Palette** : noms modifiables, jusqu'à 12 couleurs ; liste des **couleurs hors palette** avec remplacement en un clic sur tout le site (éléments et presets, tous appareils).

## cycle 6 — Recette

### Corrigé
- Onglet Style : la liste « Police » débordait sous le champ voisin.

## cycle 5 — Widgets, modèles, pages, contrôle et export

### Ajouté
- 12 widgets en plus des 6 de base (18 au total) : liste à icônes, encadré icône, citation, chiffres clés, accordéon/FAQ (avec données structurées Google en option), galerie (agrandissement au clic), vidéo YouTube/Vimeo, carte, réseaux sociaux, formulaire de contact, carte de contenu, tarif.
- Vie privée : vidéo et carte sont des « façades » ; rien n'est chargé chez YouTube, Vimeo ou Google avant le clic du visiteur (youtube-nocookie, Vimeo `dnt=1`).
- Formulaire sans serveur : ouvre le logiciel de courriel du visiteur avec le message prérempli ; l'adresse de réception est encodée dans la page (pas lisible par les robots) ; champ piège anti-spam. Option : adresse d'envoi https (service de formulaire, ou le futur `publish.php`).
- Édition directe des éléments de liste (ex. une ligne de la liste à icônes, une question de la FAQ).
- 13 modèles de sections (héros, héros centré, avantages, chiffres, témoignages, tarifs, FAQ, appel à l'action, contact, galerie, actualités, texte + image, vidéo), avec schéma miniature, à cliquer ou glisser.
- Pages : ajout (adresse propre générée depuis le titre), ouverture, titre par langue, adresse, description Google par langue avec compteur, ordre du menu, suppression (sauf l'accueil).
- Liens internes `page:ID` : choisis dans une liste, ils restent justes dans chaque langue et après un changement d'adresse.
- Fenêtre « Vérification avant export » : erreurs bloquantes, points à vérifier (image sans description, ancre ou page introuvable, bouton sans lien, formulaire sans destinataire, vidéo non reconnue, zéro ou plusieurs H1…), textes à traduire ; chaque ligne a un bouton « Aller à ». Le badge « N à traduire » ouvre la même fenêtre.

### Corrigé
- Une image non choisie laissait un cadre vide sur le site publié.
- Re-rendu du panneau de gauche pendant un évènement de perte de focus (même protection que l'inspecteur).

## cycle 4 — Glisser-déposer et édition directe

### Ajouté
- Glisser un widget ou une structure depuis la bibliothèque vers un endroit précis de la page : vignette sous le pointeur, ligne bleue d'insertion (verticale entre des colonnes côte à côte), cadre pointillé pour un conteneur vide, défilement automatique près des bords.
- Déplacer un élément dans la page : poignée ✥ de la barre de sélection, ou glisser directement l'élément sélectionné.
- Réorganiser dans le navigateur (avant / après / dedans) ; on peut aussi glisser depuis le navigateur vers la page.
- Dépôts impossibles ignorés (section dans une colonne, élément dans lui-même, rangée trop imbriquée) ; Échap annule un glisser.
- Édition directe : double-clic (ou Entrée sur l'élément sélectionné) sur un titre, un texte ou un bouton. Entrée valide un titre ou un bouton, Échap termine. Toute la saisie = une seule étape d'annulation. L'édition se fait dans la langue affichée.
- Barre de mise en forme flottante : gras, italique, souligné, lien (champ intégré), effacer. Ctrl+B / I / U.
- Collage toujours en texte brut ; tout contenu est assaini à chaque frappe (aucune balise ou attribut dangereux ne peut être enregistré).
- Raccourcis : Alt+↑ / Alt+↓ pour déplacer, plus ceux du cycle 2.

### Modifié
- Menu contextuel (clic droit dans la page ou le navigateur) : modifier le texte, dupliquer, copier/coller, copier/coller le style, monter/descendre, parent, supprimer ; navigable au clavier.

## cycle 3 — Styles responsives et styles globaux

### Ajouté
- Onglet Style par groupes repliables : Typographie, Fond, Espacement, Bordure, Dimensions, Disposition, Effets. Seuls les réglages utiles au type d'élément sont proposés (ex. « Largeur de colonne » pour les colonnes).
- Réglage par appareil : la barre d'appareils du haut et celle de l'onglet sont synchronisées. Valeur héritée affichée en grisé (« 80px (hérité) »), bouton ↺ pour revenir à l'héritage.
- État Survol : seules les propriétés animables (couleur, fond, bordure, ombre, transformation, opacité).
- Couleurs : pastilles de la palette (qui suivent la palette globale), transparent, sélecteur libre ou saisie hex/rgb.
- Copier / coller le style (sans écraser la largeur des colonnes).
- Panneau Site : nom, adresse, langues, palette de 6 couleurs (recoloration en direct), polices des titres et du texte (Google Fonts à l'export), taille du texte, arrondi, largeur du contenu, logo, en-tête fixe, choix de langue, pied de page traduit.
- `styleTarget` : le style d'un titre s'applique à la balise h1–h4, celui d'un bouton au lien `.btn`, celui d'une image à `img` ; marges et alignement restent sur l'enveloppe.

### Modifié
- Saisie tolérante : « 30 » devient « 30px » ; une valeur invalide (« 12pt ») est refusée, signalée en rouge, avec des exemples.

## cycle 2 — Éditeur : canevas, sélection, inspecteur

### Ajouté
- Canevas en iframe de même origine, rendu à la vraie largeur de l'appareil (ordinateur ≥ 1280 px, tablette 820 px, mobile 390 px) puis mis à l'échelle : les media queries du site s'appliquent exactement comme en ligne.
- Mise à jour sans rechargement (CSS, en-tête, contenu, pied de page) : le défilement est conservé.
- Survol / sélection avec étiquette colorée par niveau (section bleu, rangée vert, colonne violet, widget orange) et mini barre d'outils (parent, déplacer, dupliquer, supprimer).
- Inspecteur Contenu / Style / Avancé, fil d'Ariane, navigateur (arbre repliable), bibliothèque de widgets cliquable, annuler/rétablir avec la sélection.

## cycle 1 — Cœur : bilan

### Ajouté
- Cœur : bilan

