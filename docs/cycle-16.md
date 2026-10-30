# Cycle 16 — Journal de débogage (navigateur et PHP) et guide d'utilisation

## Pourquoi
Kudoro et Laurent vont essayer Atelier sur leurs machines (Chrome, Gemini Nano, OVH, collaboration Japon ↔ Belgique). Pour corriger vite, il faut des journaux **complets, lisibles et copiables**, côté navigateur comme côté serveur, et un **guide** qui dit, pour chaque fonctionnalité, ce que le journal doit montrer quand tout va bien, dans les variantes et en cas d'erreur.

## Recherche (résumé)
- **OVH mutualisé** : les erreurs PHP ne sont pas toujours enregistrées dans les journaux de l'hébergement (fil de la communauté OVH ; le mode « dev » de `.ovhconfig` les affiche à l'écran, mais pas de journal fiable). Atelier tient donc **son propre journal** dans `atelier-data/` (déjà protégé : `.htaccess` + fichiers `.php` qui commencent par `exit`), lisible depuis l'éditeur avec le jeton de publication. Les avertissements et erreurs vont **aussi** dans `error_log()` de PHP, au cas où l'hébergement les garde.
- **Navigateur** : niveaux (trace, debug, info, warn, error), messages structurés (code stable + message humain + données), tampon circulaire en mémoire, masquage des secrets **avant** d'écrire, horodatage relatif au démarrage, identifiant de « parcours » pour suivre une opération sur plusieurs étapes et en mesurer la durée. Les objets affichés dans la console se recopient mal : chaque ligne porte aussi ses données en JSON compact, et un bouton « Copier » donne le journal complet avec l'environnement.
- **Ce que la console ne voit pas** : erreurs de chargement d'un module ou d'un fichier (événement `error` en phase de capture), promesses rejetées sans `catch`, violations de CSP, passage hors ligne. Un petit script classique, chargé avant les modules, les capture dès la première milliseconde et signale un démarrage qui n'aboutit pas.

## Spécification

### Format d'un événement
```
12:03:04.567 +2.31s INFO  publish.php.ok [publish.php#2 · 840 ms] Site publié {"written":42,"removed":1}
```
- **code** : `domaine.action[.détail]`, minuscules, chiffres et tirets ; stable (les tests et le guide s'y réfèrent). Le domaine (premier segment) sert de filtre.
- **niveau** : `trace` (très bavard : survol, sondage de la signalisation), `debug` (détail de fonctionnement), `info` (étapes visibles pour la personne), `warn` (anomalie gérée, repli), `error` (échec).
- **message** : français, court, compréhensible sans le code.
- **données** : objet ; masqué et tronqué automatiquement.
- **parcours** : `log.flow('publish.php', 'Publication OVH', données)` écrit `publish.php.start`, puis `.step(…)`, et se termine par `publish.php.ok` (avec la durée) ou `publish.php.fail` (niveau error, avec l'erreur et la durée). Toutes les lignes portent `[publish.php#n]`.

### Masquage (dans `core/log.js`, testé)
- Clés `token`, `secret`, `password`, `authorization`, `jwk`, `private…`, `d`, `x-atelier-token`, `apiKey` (pas `key`, `pathKey`, `textKey`, qui sont des noms de champs) : `[masqué]`.
- Chaînes de 64 caractères hexadécimaux (jetons) : `[masqué]` ; les identifiants de salle sont abrégés par le code qui les journalise.
- Adresses : le fragment `#join=…` et les paramètres `token`, `secret`, `key`, `code` : `[masqué]`.
- `data:…;base64,…` : `data:image/webp (12 Ko)`.
- Adresses e-mail : `re…@exemple.be`.
- Chaînes > 300 caractères : coupées avec la longueur ; tableaux > 20 : coupés ; profondeur > 5 : `[…]`.
- Erreurs : `{name, message, stack (5 lignes)}`.

### Réglages
- `?debug` : console en `debug` ; `?trace` : tout ; `?quiet` : console en `warn`. Réglage gardé dans `localStorage['atelier-log']`.
- **Par défaut, pendant la phase de débogage** : console et tampon en `debug`. Tampon de 5000 événements.
- Console : `window.atelierDebug` → `.dump()`, `.copy()`, `.download()`, `.level('trace')`, `.entries()`, `.clear()`.

### Ce qui est journalisé partout, sans toucher aux modules
- Démarrage (`boot.*`), environnement, erreurs non attrapées (`app.uncaught`), promesses rejetées (`app.rejection`), fichiers qui ne se chargent pas (`app.resource`), CSP (`app.csp`), en ligne / hors ligne (`app.online`, `app.offline`), onglet caché ou visible (`app.visibility`).
- Chaque requête réseau (`net.request`, `net.response`, `net.fail`) : méthode, adresse masquée, statut, durée, taille ; sans en-têtes ni corps.
- Chaque fenêtre ouverte ou fermée (`ui.dialog.open`, `ui.dialog.close`), chaque clic sur un bouton ou un onglet (`ui.click`), chaque champ modifié (`ui.change`, valeur courte ; jamais les mots de passe), chaque message affiché (`ui.toast`, niveau error pour un message d'erreur).
- Historique et sauvegarde (`store.*`, `storage.*`).

### Journal du serveur (publish.php version 4)
- Chaque requête reçoit un identifiant (en-tête `X-Atelier-Request`, exposé par CORS) et écrit des lignes JSON dans `atelier-data/log-AAAA-MM.php` (rotation à 2 Mo vers `.old.php`). L'adresse IP n'est jamais écrite : seulement une empreinte courte salée.
- `?atelier_debug=1` (ajouté par l'éditeur quand le journal est en `debug`) : la réponse JSON contient `_trace`, les événements de cette requête ; l'éditeur les recopie dans son journal sous le domaine `php`. Un paramètre plutôt qu'un en-tête : un publish.php plus ancien l'ignore au lieu de refuser la requête (CORS).
- `GET ?logs=200` avec le jeton (`X-Atelier-Token`) : dernières lignes du journal du serveur. Le statut (`GET`) avec le jeton ajoute `diag` (limites d'envoi, `mail()`, dossier inscriptible, mémoire, durée maximale).
- Erreurs PHP (avertissements, exceptions, erreurs fatales) : journalisées ; une exception renvoie `500` avec la référence de la requête.
- Jamais dans le journal : jeton, contenu des messages de contact, contenu des fichiers ; adresses e-mail abrégées.

### Site publié
- `site.js` journalise dans la console (préfixe `[Atelier site]`) si l'adresse contient `?atelier-debug` ou si `localStorage['atelier-debug']` vaut `1` : menu mobile, formulaire (envoi, réponse), listes « à venir », vidéos et cartes chargées. Muet sinon.

### Fenêtre 🐞 Journal (barre du haut, Ctrl+K « Journal », Ctrl+Alt+J)
- Pastille rouge du nombre d'erreurs depuis le démarrage.
- Filtres : niveau minimal, domaine, recherche ; liste en direct (500 dernières lignes affichées).
- Réglage du niveau de la console et du tampon.
- **Copier le journal** (environnement + événements), **Télécharger (.log)**, **Vider**.
- **Journal du serveur** : lit `?logs` avec l'adresse et le jeton de la fenêtre Publier ; les lignes s'ajoutent à la copie.

### Guide d'utilisation (`docs/guide/`)
Un chapitre par domaine. Pour chaque cas d'usage :
1. **But** et **étapes** (ce que la personne fait).
2. **Chemin normal** : ce qu'elle voit, puis le **journal attendu** (extrait réel capturé par les tests de bout en bout).
3. **Variantes** (chemins alternatifs) : situation → ce qui change → codes du journal.
4. **Erreurs** : situation → message affiché → code et niveau → que faire.

Un test vérifie que **chaque code** écrit dans le code source (navigateur et PHP) est documenté dans le guide.

## Tests écrits d'abord
- `tests/log.test.js` : niveaux et filtrage, tampon circulaire, parcours (ids, durée, ok/fail), masquage (clés, jetons, URL, data URL, e-mails, longueurs, profondeur, erreurs), données paresseuses (fonction appelée seulement si le niveau passe), format texte, `dump` avec en-tête, abonnement.
- `tests/publish-php.test.js` : identifiant de requête, `_trace` avec `atelier_debug`, journal écrit et protégé, pas de jeton ni d'IP en clair, `?logs` refusé sans jeton et lu avec, `diag` avec jeton seulement, exception → 500 avec référence.
- `tests/log-catalog.test.js` : chaque code du source est dans `docs/guide/`.
- Bout en bout `cycle16` et scénarios par domaine : codes attendus présents dans `atelierDebug.entries()` pour les chemins normaux, variantes et erreurs ; extraits enregistrés dans `docs/guide/journaux/`.

## Livré
- **Journal central** (`core/log.js`, `editor/log.js`) : un seul journal pour tout l'éditeur, iframe comprise ; console (`[Atelier]`, couleurs par niveau, JSON compact recopiable), tampon de 5000 événements, parcours mesurés, masquage avant écriture, réglages `?debug` / `?trace` / `?quiet`, API `atelierDebug` dans la console.
- **Captures globales** : erreurs non attrapées, promesses rejetées, fichiers non chargés, CSP, en ligne / hors ligne, lenteurs (> 200 ms), `console.error` d'autres scripts, chaque requête réseau (avec la trace de publish.php recopiée dans l'ordre), fenêtres, clics, champs, raccourcis, messages affichés. Script de démarrage classique : erreurs de chargement et démarrage qui n'aboutit pas en 15 s.
- **Fenêtre 🐞** (barre du haut, Ctrl+Alt+J, Ctrl+K « Journal ») : pastille d'erreurs, filtres, recherche, réglages, copier (avec l'environnement : navigateur, écran, stockage, projet, éditeur, IA, collaboration), télécharger, vider, journal du serveur.
- **publish.php version 4** : identifiant par requête (`X-Atelier-Request`), journal protégé `atelier-data/log-AAAA-MM.php` (rotation à 2 Mo, niveau réglable `LOG_LEVEL`), trace renvoyée avec `?atelier_debug=1`, `?logs=N` et diagnostic de l'hébergement avec le jeton, avertissements / exceptions / erreurs fatales notés (500 avec référence), cause précise d'un envoi refusé (`upload_max_filesize`, `post_max_size`…), aucune IP, aucun jeton, aucun contenu de message.
- **Site publié** : journal muet par défaut, allumé par `?atelier-debug` (menu mobile, formulaire, listes datées, galeries, vidéos et cartes, erreurs).
- **Instrumentation de tous les modules** : 748 codes dans 39 domaines (démarrage, sauvegarde, historique, édition, canevas, inspecteur, styles, glisser-déposer, actions, structure, modèles, pages, réglages, images, collections, versions, traductions, SEO, IA locale avec cause probable de chaque échec de Chrome, publication, collaboration WebRTC avec diagnostic ICE, relecture, PHP, site publié).
- **Guide d'utilisation** `docs/guide/` : 12 chapitres, chaque cas d'usage avec chemin normal, variantes et erreurs, extraits réels (`docs/guide/journaux/`, 176 fichiers produits par les tests), index de tous les codes généré depuis le source (`tools/guide-index.mjs`), extraits des chapitres 5 à 7 regénérables (`tools/guide-sync.py`).

## Corrigé en cours de route
- publish.php : l'adresse d'expéditeur des formulaires contenait le port (`noreply@hote8080`) quand l'hôte en avait un.
- Logo : une adresse `https://` était ignorée sans message ; elle est acceptée (le rendu la gérait déjà).
- Panneaux Pages et Site : Entrée puis « change » enregistraient deux fois (deux étapes d'annulation) ; le bouton ⟲ de l'adresse par langue partait d'un titre périmé ; la vignette du logo ne se redessinait pas ; une modification refusée en mode relecture était annoncée comme réussie.
- Versions : la suppression n'avait pas de traitement d'erreur.
- Édition : un clic sur la barre de mise en forme vidait la sélection ; le déplacement avec la poignée ✥ perdait la sélection ; renommer un composant enregistrait deux fois ; « Image ajoutée en WebP » même quand le navigateur avait produit du JPEG.
- Collaboration : cadre de présence non redessiné ; cache des signatures qui gardait « ✓ signé » pour un commentaire modifié ; message d'erreur à tort en quittant la session ; message vide pour un code manuel incomplet ; erreur de traitement confondue avec un message indéchiffrable.
- Traduction : sans API Translator, une erreur TypeError au lieu d'un message clair.

## Tests
- Unitaires : 300 (dont 12 du journal, 8 de publish.php v4 avec un vrai PHP, 4 du catalogue code ↔ guide).
- Bout en bout : cycles 2 à 15 inchangés et 5 nouveaux scénarios du cycle 16 (journal et publication, édition et design, contenus, langues / SEO / IA, collaboration et relecture) qui vérifient les codes attendus et écrivent les extraits du guide.
