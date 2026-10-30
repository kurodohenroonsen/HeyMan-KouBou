# Cycle 22 — Interface en français, anglais et japonais ; sites en japonais

## Demande
29/10/2026, Kudoro : « rends-nous notre outil i18n, FR/EN/JA » ; choix : **tout traduire, journal compris** ; le japonais devient aussi une langue de contenu des sites ; langue de l’interface **automatique + sélecteur**.

## Spécification
- **Langue de l’interface** : français (source), anglais, japonais. Au premier lancement : `?lang=` dans l’adresse, sinon le choix retenu sur l’appareil, sinon la première langue du navigateur que l’éditeur connaît (fr, en, ja), sinon l’anglais. **Sélecteur** dans le menu Fichier (« Langue de l’interface ») et Ctrl+K (« 🌍 English », « 🌍 日本語 », « 🌍 Français ») : le projet est enregistré, puis la page se recharge dans la nouvelle langue ; le choix est retenu (`localStorage['atelier-ui-lang']`).
- **Tout est traduit** : textes fixes (index.html), panneaux, inspecteur, fenêtres, messages, infobulles, confirmations, rapports (auto-test, banc d’essai), et **messages du journal** (console, 🐞, copies). Les **codes du journal** et les données restent identiques dans les trois langues (on peut toujours lire un journal japonais avec le guide français).
- **Pas traduit** : le contenu des sites (il suit la langue de chaque page du site), les consignes envoyées au modèle d’IA, les noms de langue, les noms de produits.
- **Japonais pour les sites** : `ja` rejoint fr, nl, de, en (panneau Site, traductions, SEO, adresses de pages, textes publiés, polices).
- **Guide** : version anglaise et japonaise (`docs/guide/en/`, `docs/guide/ja/`), mêmes chapitres ; les extraits de journal restent ceux capturés en français (codes identiques).
- **Polices de l’éditeur en japonais** : Hiragino, Noto Sans JP, Yu Gothic, Meiryo.

## Mécanisme
- `core/ui-i18n.js` : le texte français est la clé (à la gettext) ; `__('…')`, `` __`… ${x} …` ``, `__n(n, singulier, pluriel)`, `__c(contexte, '…')` (même mot, deux sens : « Annuler » ↶ / « Annuler » d’une fenêtre), `N_()`, `fmtNumber`, `fmtDate`. Une traduction absente retombe sur le français.
- Catalogues `i18n/en.js`, `i18n/ja.js` (générés par `node tools/i18n.mjs build` depuis `i18n/parts/*.json`), chargés **avant** les modules par un petit script de index.html (même origine, synchrone) : `__()` marche partout, même au niveau des modules.
- `editor/ui-lang.js` : traduction des textes fixes de index.html au démarrage, sélecteur, changement de langue.
- `tools/i18n.mjs` : extraction (`__`, `__n`, `__c`, `N_`, index.html), contrôle (manquantes, `{paramètres}`, conflits), génération.
- Glossaire commun : `docs/i18n-glossaire.md` ; consigne des lots : `docs/i18n-brief.md`.

## Tests écrits d’abord
- `tests/ui-i18n.test.js` : français par défaut ; anglais et japonais ; paramètres et ordre libre ; pluriel ; contexte ; langue de départ ; extraction (commentaires, gabarits imbriqués, autres fonctions ignorées, index.html).
- `tests/ui-i18n-coverage.test.js` : **chaque** chaîne extraite a sa traduction anglaise et japonaise, avec les mêmes `{paramètres}`, sans contradiction.
- `tools/e2e/cycle22.mjs` : en anglais puis en japonais, aucun texte français visible (écran, 6 panneaux, inspecteur, 7 fenêtres, Ctrl+K, menu Fichier — hors contenu du site) ; journal traduit ; message affiché traduit ; sélecteur → français, projet gardé, choix retenu.
- `tests/site-ja.test.js`, `tools/e2e/cycle22-ja-site.mjs` : site en japonais (lot F).

## Livré
- Socle : `core/ui-i18n.js`, `editor/ui-lang.js`, script de langue de index.html, `tools/i18n.mjs` (extraction robuste : commentaires, expressions régulières, gabarits imbriqués), sélecteur (menu Fichier, Ctrl+K, `?lang=`), polices japonaises de l'éditeur, onglets qui passent sur deux lignes.
- **3254 chaînes** de l'interface et du journal traduites en anglais et en japonais, en six lots (`i18n/parts/` : commun, A édition, B style, C contenus, D IA et journal, E collaboration, F sites), même glossaire ; contextes `__c` pour les mots à deux sens (Annuler, Titre, Carte, Adresse, élément…).
- Échanges entre pairs et données signées inchangés (une personne en français et une autre en japonais travaillent ensemble) ; les erreurs reçues d'un pair sont traduites à l'affichage.
- **Japonais pour les sites** : `ja` dans les langues du site, adresses ASCII lisibles (kana → rōmaji Hepburn, repli `page-<empreinte>` stable), textes publiés par langue de page (fr, nl, de, en, ja — ils restaient en français sur les pages nl, de, en), seuils SEO japonais, polices japonaises du site, traduction fr → ja.
- **Guide** complet en anglais et en japonais : `docs/guide/en/`, `docs/guide/ja/` (16 chapitres, sommaire, index des codes ; extraits de journal d'origine).
- Captures : `docs/captures/c22-en-editeur.png`, `c22-ja-autotest.png`.

## Tests
- Unitaires : 367 (dont 8 pour le mécanisme, 7 pour la couverture, 13 pour les sites en japonais).
- Bout en bout : `cycle22` (13 vérifications : aucun texte français visible en anglais et en japonais sur l'écran, les 6 panneaux, l'inspecteur, 12 fenêtres, une collection, les commentaires, Ctrl+K, le menu Fichier ; journal et messages traduits ; auto-test complet en japonais ; sélecteur et projet gardé), `cycle22-ja-site` (25).
- Régression complète : 1610 réussies et 10 échecs, tous dans cycle14 et c16-collab : leurs seconds navigateurs démarraient l'interface en anglais. Ces specs imposent maintenant `fr-FR` ; relancées, 225/225.

## Limites connues
- Messages renvoyés par publish.php (serveur PHP) : encore en français.
- Textes d'aide `hint` des données du journal : en français (données, pas messages).
- Exemple du MAB et contenus par défaut des widgets : en français (contenu du site).
