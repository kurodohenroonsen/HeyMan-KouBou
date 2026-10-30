# Relecture D — tests, outillage, performance, documentation, accessibilité de l'éditeur

Audit du 30/10/2026 sur Atelier v19 (`/home/claude/atelier2`), lecture seule. Tout ce qui est chiffré ci-dessous a été **mesuré** dans ce conteneur (Chromium de Playwright, serveur statique Python sur le port 8791, CPU partagé avec d'autres travaux : les temps sont des ordres de grandeur). Ce qui n'a pas pu être vérifié ici est marqué **à vérifier**.

## 1. Résumé

- Le cœur (`core/`, 42 fichiers) est couvert à **96 % de lignes** par 385 tests unitaires en 25 s ; l'interface (`editor/`, 47 fichiers, 744 Ko) n'a **aucun test unitaire** (2 fichiers importés indirectement) et ne vit que par les 1 687 vérifications de bout en bout, qui durent **≈ 12 min**, séquentielles, dont **≈ 3 min d'attentes fixes** (`t.wait`, 705 occurrences).
- Pas de dépôt git dans le projet livré, pas de CI, pas de lint, pas de types, pas de licence, pas de CHANGELOG : le zip est la seule trace. Le bus factor est de 1.
- L'éditeur se charge par **87 modules ES non groupés** (chaîne d'imports de profondeur 22) et un catalogue de traduction de 300 Ko écrit par `document.write` : **0,6 s sur localhost, 1,8 s en ADSL, 3,3 s en 4G (4,2 s en japonais), 7,3 s en 3G** (mesuré, cache vide, sans compression). Un `modulepreload` ou un bundle d'une commande ramènerait tout cela à ~1 aller-retour.
- En édition, l'éditeur tient : un réglage de style met le canevas à jour en **≈ 90 ms** (rendu 4–8 ms, sans rechargement de l'iframe), même sur un site artificiel de **30 pages × 50 widgets** (import 170 ms, changement de page 58 ms, enregistrement 640 Ko en 14–19 ms). La frappe reste fluide (quelques tâches longues ≤ 74 ms sur le gros site).
- Le guide (96 000 mots en français, 21 pages × 3 langues) embarque **191 extraits de journal recopiés dans trois langues** alors que les tests de bout en bout réécrivent les 200 fichiers `.log` à chaque exécution : la dérive est structurelle (constatée au cycle 24).
- axe-core sur l'éditeur : **2 violations WCAG A** (deux bogues d'attributs ARIA, faciles), 1 contraste AA dans la fenêtre SEO, des cibles de 12 px (WCAG 2.2), pas de point de repère `main`. Le clavier fonctionne dans la bibliothèque (vrais boutons).
- Les navigateurs annoncés dans le guide (Firefox, Safari) ne sont **jamais testés** ; seul Chromium l'est (Firefox/WebKit non installables ici : à vérifier chez Kudoro).

## 2. Points positifs (précis)

- **Séparation cœur / interface** réellement tenue : `core/` est sans DOM, importable dans Node, et le même `renderPage` sert au canevas, à l'export et aux tests (`core/render.js`, `editor/canvas.js:83`). Couverture `core/` : 96,1 % lignes, 83,8 % branches, 94 % fonctions (`node --test --experimental-test-coverage`).
- **Tests écrits d'abord, par cycle**, chaque `docs/cycle-N.md` liste les tests avant le livré ; 36 fichiers unitaires + 28 scénarios de bout en bout, tous verts (385/385, 1 687/1 687 le 30/10).
- **Journal structuré comme oracle de test** : `tools/e2e/logs.mjs` (`mark`/`since`/`expectCodes`) vérifie des parcours entiers par leurs codes, et `tests/log-catalog.test.js` + `tests/ui-i18n-coverage.test.js` sont de vraies barrières (code non documenté ou chaîne non traduite = test rouge). 901 codes indexés automatiquement (`tools/guide-index.mjs`).
- **Isolation des tests de bout en bout** : un contexte neuf par scénario (`run.mjs:18`), `?fresh=1`, IndexedDB vierge ; ports aléatoires pour les serveurs PHP (`c16-collab.mjs:14`, `cycle12.mjs:61`) ; vrai PHP (`publish-php.test.js`), vrai WebRTC entre navigateurs (`c16-collab.mjs`), faux Gemini Nano (`core/fake-nano.js`).
- **Auto-test dans le navigateur de l'utilisateur** (26 cas, rapport à coller, retour arrière) : un outil de support rare dans cette catégorie d'outils.
- **Zéro dépendance à l'exécution**, Node 22 nu pour les unitaires : la suite tourne partout, sans `node_modules` ; le projet vieillira bien.
- **Performance d'édition saine** : mise à jour du canevas sans rechargement (`canvas.js:167-194`, remplacement de `header/main/footer`), historique immuable à 150 pas (`store.js:92-101`), enregistrement différé 600 ms ; mesuré stable jusqu'à 1 500 widgets.
- **Documentation utilisateur hors norme** : guide complet en trois langues, captures, codes du journal, exemples réels ; README de 236 lignes avec une section développeurs (organisation, ajout d'un widget, tests, sécurité).
- **Accessibilité pensée dans l'éditeur** : rôles et `aria-label` sur la barre, `role="separator"` sur les poignées, infobulles clavier, bibliothèque en vrais `<button>` (Tab + Entrée ajoutent un widget : vérifié) ; contrastes des textes courants mesurés ≥ 6,1:1.

## 3. Points négatifs

### Bloquant (à traiter avant toute remise à un tiers)

| # | Constat | Preuve | Impact | Correction |
|---|---|---|---|---|
| B1 | **Aucun gestionnaire de versions ni CI** : le dossier n'est pas un dépôt git, pas de `.github/`, pas de tag par version ; la livraison est un zip de 23 Mo refait à la main, sans historique ni diff. | `git status` → « not a git repository » ; `ls -a` sans `.git` ; `pkg-atelier/atelier-v7…v19.zip` | Impossible de retrouver « ce qui a changé entre v17 et v19 » autrement qu'en lisant `docs/cycle-*.md` ; aucune exécution automatique des 2 072 tests ; régression silencieuse possible à chaque zip ; reprise par un autre développeur très coûteuse. | Dépôt git (privé) + `CHANGELOG.md` + tag `v19` ; GitHub Actions : `npm test` à chaque push, bout en bout nocturne avec Chromium (image Playwright officielle), zip de livraison produit par l'action. Effort S. |
| B2 | **L'interface (`editor/`, 744 Ko, 47 fichiers) n'a aucun test unitaire** ; seuls 2 fichiers (`storage.js` 37 %, `log.js` 25 %) sont touchés indirectement. Toute la logique de `store.js`, `dnd.js`, `inline.js`, `fields.js`, `canvas.js`, `cmdk.js`, `pages.js`, `collab-net.js`… n'est vérifiée que par la régression de 12 min. | Rapport de couverture : `editor` 45/47 fichiers absents | Cycle de retour de 12 min pour toute modification de l'interface ; tentation de ne pas relancer ; les flocons constatés aux cycles 20-21 (focus, défilement) viennent de là. | Extraire la logique pure vers `core/` (déjà fait pour `commands.js`, `selftest.js`, `panel-size.js`, `tooltip.js`) : cibles prioritaires `store.js` (historique, fusion de clés, lecture seule), `dnd.js` (calcul de la cible de dépôt), `inline.js` (commandes de texte), `cmdk.js` (classement), `fields.js` (validation des champs) ; viser 60 % de `editor/` couvert. Effort M, par petits pas. |

### Important

| # | Constat | Preuve | Impact | Correction |
|---|---|---|---|---|
| I1 | **87 modules ES chargés un par un, chaîne d'imports de profondeur 22, `app.js` importe 45 modules** ; aucun `modulepreload`, aucun bundle, aucune minification. | Mesuré cache vide : localhost 0,62–0,75 s ; ADSL (50 ms, 8 Mbit/s) 1,83 s ; 4G (100 ms, 4 Mbit/s) 3,3 s ; Fast 3G 7,3 s ; 14 à 22 « vagues » de requêtes | Chez OVH, démarrage de 2 à 7 s selon la connexion, alors que tout tient en 1,2 Mo (≈ 300 Ko compressés). Lighthouse signalera « Avoid chaining critical requests ». | (a) Sans build : générer dans `index.html` la liste `<link rel="modulepreload">` des 87 modules (script de build de 20 lignes, testé) → 1 vague. (b) Ou `esbuild` en une commande (`esbuild editor/app.js --bundle --format=esm --minify`) pour la livraison, modules nus en développement. Effort S. |
| I2 | **Catalogue de traduction injecté par `document.write`** (`index.html:16`), 252 Ko (EN) / 307 Ko (JA) non compressés, bloquant le parseur avant la découverte de `editor/app.js` (`index.html:104`). | Mesuré 4G : interface JA prête en 4,2 s contre 3,3 s en FR | +0,9 s pour les utilisateurs EN/JA ; `document.write` est déconseillé par Chrome (intervention sur connexions lentes pour les scripts tiers, avertissement Lighthouse « Avoid document.write() ») — l'intervention vise surtout les scripts d'autre origine : risque réel **à confirmer** par la recherche web du parent. | Remplacer par un `<script type="module">` qui fait `await import('./i18n/ja.js')` avant `app.js`, ou un `<link rel="modulepreload">` conditionnel ; découper le catalogue par domaine (00-commun chargé d'abord, le reste différé). Effort S. |
| I3 | **Mise à jour chez l'utilisateur sans contrôle de cache** : aucune empreinte dans les URL des modules, pas de `.htaccess` (`Cache-Control`, compression), pas de version affichée (seul `package.json` dit 2.0.0 ; le zip dit v19). | `grep -rn "?v=\|Cache-Control" index.html editor core` → rien côté éditeur | Après dépôt d'une v20 sur OVH, un navigateur peut servir `app.js` neuf avec un `store.js` en cache (heuristique de fraîcheur sur `Last-Modified`) → erreurs d'import incompréhensibles ; aucun moyen pour Laurent de dire « je suis en v19 ». | Version dans un seul endroit (`core/version.js`), affichée dans Fichier → À propos et dans le journal `boot.ok` ; `index.html` référence `editor/app.js?v=19` et les imports internes passent par un bundle ou un `importmap` versionné ; `.htaccess` livré (compression `mod_deflate` — **à vérifier** sur l'offre OVH de Laurent — et `Cache-Control: no-cache` sur `index.html`, `immutable` sur les fichiers versionnés). Effort S/M. |
| I4 | **Pas de mode hors ligne pour l'éditeur** : aucun service worker ; les données sont locales (IndexedDB) mais l'application doit être téléchargée à chaque ouverture. | `grep serviceWorker` → rien | Contredit la promesse « local-first » dès que l'éditeur est servi par OVH et non par MAMP ; une coupure = éditeur inaccessible. | Service worker « cache d'abord » des 90 fichiers listés par le build (même liste que I1), mise à jour contrôlée par la version (I3). Effort M. Dépend de I1/I3. |
| I5 | **Régression de bout en bout de ≈ 12 min, séquentielle, avec 705 attentes fixes (≈ 184 s cumulées) et un lanceur maison** (`run.mjs`) : pas de workers, pas de reprise, pas de trace Playwright en cas d'échec (seule une capture), pas de rapport, messages `FAIL` sans attendu/obtenu pour la plupart des `t.ok`. | `grep -c "t.wait("` = 705 ; durée mesurée 711 s | Boucle de retour lente ; diagnostic d'un flocon difficile ; personne ne la lance « pour voir ». | Remplacer les `t.wait(n)` par des attentes de condition (`waitForFunction` sur le journal : `waitCode` existe déjà dans `logs.mjs` mais n'est utilisé que 4 fois) ; 3 workers (les scénarios sont déjà isolés) ; `tracing.start` + `stop` en cas d'échec ; option `--only` conservée. Alternative : passer à `@playwright/test` (workers, retries, traces, rapport HTML) en gardant `logs.mjs`. Effort M. |
| I6 | **Les extraits de journal du guide dérivent dans trois langues** : 191 blocs ```log recopiés dans `docs/guide/*.md`, 190 dans `en/`, 190 dans `ja/`, alors que `capture()` réécrit 200 `.log` (horodatages et identifiants aléatoires) à chaque régression ; seuls 7 chapitres sur 16 sont régénérés (`tools/guide-tpl/*.tpl` + `guide-sync.py`, seul script Python du projet). | Cycle 24 : les deux traducteurs ont dû recopier à la main 45 blocs qui avaient changé | Chaque régression rend les guides faux ou oblige à une resynchronisation manuelle ; les traductions ne sont jamais exactement à jour. | (1) `capture()` normalise ce qui change sans valeur documentaire : heures → `hh:mm:ss` relatives à 0, `+N.NNs` arrondis, identifiants `v_…`/`p_…` remplacés par `v_xxx`/`p_xxx` (le texte « À vérifier » n'en parle jamais) → plus de diff inutile. (2) Le générateur HTML lit le bloc depuis `journaux/<nom>.log` (le lien précède déjà chaque bloc) au lieu du Markdown, pour les trois langues → source unique. (3) Porter `guide-sync.py` en Node. Effort S+S+S. |
| I7 | **Navigateurs annoncés non testés** : `bienvenue.md:5` promet Chrome, Edge, Firefox, Safari ; la suite ne tourne que sur Chromium ; 23 `structuredClone`, 21 `showModal`, `Object.hasOwn`, `.at(-1)` (Safari ≥ 15.4), WebRTC, `srcdoc`, IndexedDB avec `Blob`. | `grep webkit|firefox tools/e2e` → rien ; installation de Firefox refusée par le réseau ici | Laurent sur Safari peut rencontrer un bogue que personne n'a vu. | Un scénario « fumée » (démarrer, ajouter un widget, exporter) sur `firefox` et `webkit` de Playwright, lancé avant chaque livraison ; matrice de navigateurs dans le README. Effort S (une fois les navigateurs installés chez Kudoro). |
| I8 | **Aucune licence, aucun CHANGELOG, architecture documentée périmée** : `docs/01-architecture.md` (74 lignes) date du cycle 1 (« footer texte (4 langues) », « images WebP en data URL ») et ignore jetons, presets, composants, collections, versions, collaboration ; `docs/02-plan-de-tests.md` s'arrête au cycle 6 ; 2,2 % de lignes de commentaires (416/18 918), 9 JSDoc pour 427 exports de `core/`. | Fichiers cités | Un repreneur doit reconstituer l'architecture depuis 24 comptes rendus de cycle et un code très dense (266 lignes > 300 caractères). La question de la propriété du code (ASBL Aktina ? Laurent ?) n'est écrite nulle part. | `LICENSE` (choix à faire avec Laurent : propriétaire, ou libre type MIT/EUPL), `CHANGELOG.md` alimenté par les « Livré » des cycles, `docs/01-architecture.md` refait (modèle v2 complet, flux de données éditeur → canevas → export, collaboration, stockage), JSDoc sur les exports de `core/` les plus utilisés (`tree`, `site`, `editing`, `render`). Effort M. |
| I9 | **Accessibilité de l'éditeur : 2 violations WCAG A, 1 AA** (axe-core 4.10, document principal, iframe exclue) : `aria-pressed` posé sur la `<div id="frame">` parce que `app.js:85` cible `$$('[data-device]')` qui attrape aussi le cadre du canevas (même sélecteur à `app.js:192` : un clic sur le cadre appelle `setView`) ; `<div id="peers" aria-label>` sans rôle (`index.html:51`) ; texte `.share__noimg` à ≈ 2,9:1 dans la fenêtre SEO (`editor.css:549`) ; boutons de réinitialisation de style de 12 px (`.sp-reset`, WCAG 2.2 2.5.8 : 24 px) ; pas de `<main>`, pas de `<h1>`, deux `banner` quand une fenêtre est ouverte. | `axe-editor.txt` | Un relecteur avec lecteur d'écran entend « pressé » sur le canevas ; conformité WCAG 2.2 AA non atteinte pour l'outil lui-même (la loi européenne sur l'accessibilité vise les services, pas cet outil interne, mais l'argument commercial « accessible » doit valoir pour l'éditeur aussi). | Corriger les sélecteurs (`.seg[data-device]`), `role="group"` sur `#peers`, contraste du gabarit, cibles ≥ 24 px, `<main id="stage">`, titre caché de niveau 1 ; ajouter axe sur l'éditeur dans un scénario de bout en bout (comme `cycle10.mjs` le fait pour le site publié). Effort S. |

### Mineur

| # | Constat | Preuve | Correction |
|---|---|---|---|
| m1 | Pas de lint ni de formateur ni de vérification de types ; `package.json` n'a qu'un script. | `package.json` | ESLint (config plate, 10 règles : `no-unused-vars`, `eqeqeq`, `no-undef`, `max-len` 200 en avertissement) et `// @ts-check` + `tsc --noEmit --allowJs --checkJs` sur `core/` d'abord : zéro build, bogues de signature attrapés. Effort S. |
| m2 | Aucun test de non-régression visuelle : 47 captures servent à la documentation, jamais comparées. | `grep toHaveScreenshot|pixelmatch` → rien | Comparer 6 écrans clés (éditeur FR/JA, inspecteur Style, fenêtre Publier, site exporté à 390 px) avec tolérance ; Playwright l'intègre. Effort S. |
| m3 | Aucun budget de performance testé. | — | Dans un scénario : `boot.ok` < 1 500 ms sur localhost, `canvas.render` médian < 20 ms sur le site de 200 widgets, taille du zip exporté < X Ko par page ; données déjà dans le journal (`ms`). Effort S. |
| m4 | Aucun test de migration de projet : `validateSite` refuse les versions ≠ 2 (`site.js:348`), `normalizeSite` complète les champs, mais aucun projet ancien n'est conservé comme fixture. | `tests/` | Garder `tests/fixtures/projets/v2-cycle5.json`, `v2-cycle12.json`… et tester « s'ouvre, se rend, s'exporte » à chaque cycle ; prévoir `site.schema` entier pour les migrations futures. Effort S. |
| m5 | Zip de livraison de 23,4 Mo : `guide/` 10,3 Mo (captures JPEG 5 Mo, journaux 1 Mo) + `docs/` 9,4 Mo (captures PNG des tests) = 85 % du poids ; `i18n/sources.json` (323 Ko, artefact de build) livré. | `unzip -l` | Deux archives : `atelier-vNN.zip` (exécution : `index.html`, `core/`, `editor/`, `i18n/*.js`, `guide/`) et `atelier-vNN-sources.zip` (`docs/`, `tests/`, `tools/`) ; captures du guide à 1 280 px et 75 % de qualité. Effort S. |
| m6 | Les dépendances d'outillage ne sont figées que dans une phrase du README (`playwright@1.56.1 axe-core@4.10.3`) ; pas de `tools/package.json` ni de lockfile ; `tools/node_modules` est ici un lien symbolique vers un autre dossier. | `ls -la tools/node_modules` | `tools/package.json` + `package-lock.json`, `engines.node ≥ 22`, `.nvmrc`. Effort S. |
| m7 | Le lanceur de bout en bout exige un serveur statique lancé à part (`python3 -m http.server 8791`) : plusieurs fois coupé par la limite de 2 h pendant ces cycles. | historique de session | `run.mjs` démarre son propre serveur `node:http` sur un port libre. Effort S. |
| m8 | La frappe sur un site de 1 500 widgets produit 8 tâches longues (≤ 74 ms) pour 37 caractères : fusion d'historique correcte, mais chaque commit reclone le site (640 Ko) et l'enregistre au complet. | `perf.txt` | Enregistrer par page (clé `page:id` dans IndexedDB) et ne cloner que la page modifiée ; non prioritaire pour un site de la taille du MAB. Effort M. |
| m9 | Chiffres de tests recopiés à la main dans le README (« 385 tests unitaires », « 1687 vérifications ») : déjà faux après chaque cycle tant qu'on n'y pense pas. | `README.md:222` | Les produire par script (`npm run stats`) ou ne pas les citer. Effort S. |

## 4. Mesures

### 4.1 Tests

| Mesure | Valeur |
|---|---|
| Unitaires (`npm test`) | 385 réussis / 0 échec, **24,8 s** (dont PHP réel) ; avec couverture 27,9 s |
| Couverture `core/` (42 fichiers, tous importés) | lignes 96,1 %, branches 83,8 %, fonctions 94,0 % ; plus faibles : `menu.js` 87,5 %, `tree.js` 91,3 %, `site.js` 92,5 %, `review.js` 93,1 % |
| Couverture `editor/` (47 fichiers) | 45 jamais importés ; `storage.js` 36,7 %, `log.js` 25,1 % |
| Couverture `tools/` | `i18n.mjs` 87,6 %, `md.mjs` 93,8 %, `log-codes.mjs` 100 % ; `guide-html.mjs`, `guide-captures.mjs`, `guide-index.mjs` non testés |
| Bout en bout | 28 scénarios, **1 687 réussis / 0 échec, 711 s** (séquentiel, un navigateur, un contexte par scénario) |
| Attentes fixes | 705 `t.wait(n)` = 183,6 s cumulées (≈ 26 % du temps) ; 2 `waitForTimeout` ; 111 `waitForSelector`, 55 `waitForFunction` |
| Assertions | 763 appels `t.ok(booléen, message)` ; les valeurs attendues/obtenues ne figurent que quand le message les inclut |
| axe-core | sur 4 pages exportées (cycle 10, cycle 13), à 2 largeurs, WCAG 2.1 AA ; **jamais sur l'éditeur** |
| Visuel, performance, mutation, propriétés, navigateurs autres que Chromium | aucun |

### 4.2 Chargement de l'éditeur (cache vide, sans compression, médiane de 2-3 essais)

| Condition | Prêt (`__atelier.ready`) | Requêtes | Octets JS | Vagues de requêtes |
|---|---|---|---|---|
| localhost, FR | 0,54–0,75 s | 88 (87 JS + 1 CSS de 48 Ko) | 1 176 943 | ≈ 5 |
| localhost, JA | 0,51 s | 89 | 1 484 447 (+307 Ko de catalogue) | ≈ 5 |
| ADSL simulé (50 ms, 8 Mbit/s), FR | **1,83 s** | 88 | idem | 14 |
| 4G simulée (100 ms, 4 Mbit/s), FR | **3,3–3,4 s** | 88 | idem | 18 |
| 4G simulée, JA | **4,2 s** | 89 | idem | 19 |
| Fast 3G simulé (150 ms, 1,6 Mbit/s), FR | **7,3 s** | 88 | idem | 22 |

Chaîne d'imports statique : profondeur maximale **22** depuis `editor/app.js`, 45 imports directs, 4 fichiers avec `import()` dynamique (`cmdk.js`, `log.js`, `selftest.js`, `selftest-ui.js`). Tas JS après démarrage ≈ 10 Mo (mesure grossière de `performance.memory`).

### 4.3 Édition

| Mesure | Site MAB (2 pages) | 30 pages × 50 widgets (640 Ko) | 1 page de 200 widgets (85 Ko) |
|---|---|---|---|
| Import `.json` (mur / `project.import` / `canvas.load`) | — | 170 / 94 / 41 ms, page rendue en 7 ms (41 Ko de HTML, 70 nœuds) | 118 / 34 / 55 ms, 5 ms (106 Ko, 280 nœuds) |
| Changement de page | — | 58 ms | — |
| Clic sur un widget → inspecteur | — | 102 ms | 139 ms |
| Réglage de style (taille de texte) → canevas à jour | 84 ms (rendu 4 ms, 0 rechargement) | 92 ms (5 ms, 0) | 97 ms (8 ms, 0) |
| Frappe de 37 caractères en édition directe | 20 ms/car (surcoût Playwright inclus), 0 tâche longue | 51 ms/car, **8 tâches longues (max 74 ms)** | 38 ms/car, 1 tâche longue (51 ms) |
| Enregistrement automatique | — | 640 Ko en 14–19 ms | 85 Ko en 5–6 ms |

Conclusion : aucun rechargement d'iframe pendant l'édition ; le coût est linéaire avec la taille du **site** (clone + enregistrement complets), pas de la page. Confortable pour le MAB, à surveiller au-delà de 500 Ko de projet.

### 4.4 Accessibilité de l'éditeur (axe-core 4.10, WCAG 2.0/2.1/2.2 AA + bonnes pratiques, iframe exclue)

| Écran | Violations | Détail |
|---|---|---|
| Éditeur, élément sélectionné, onglet Contenu | 5 | `aria-allowed-attr` critique (`#frame[aria-pressed]`), `aria-prohibited-attr` sérieux (`#peers`), `landmark-one-main`, `page-has-heading-one`, `region` (poignées hors repère) |
| Onglet Style | 6 | + `target-size` sérieux (WCAG 2.2) : 4 boutons `[data-reset]` |
| Fenêtre SEO ouverte | 6 | + `color-contrast` sérieux (`.share__noimg`), `landmark-no-duplicate-banner`, `landmark-unique` (`.topbar`) |
| Contrastes mesurés | OK | `.hint` 6,1:1 (12,5 px), libellés 17,7:1, segments 17,7:1, menu 17,7:1 |
| Clavier, panneau Widgets | OK | `#libFilter` → Tab parcourt les `button.lib-item` (« 1 colonne », « 2 colonnes »…) ; Entrée ajoute l'élément après la sélection |
| À vérifier à la main | 9–14 nœuds `color-contrast` (dégradés/images de fond), `frame-tested` (iframe) |

### 4.5 Documentation

| Mesure | Valeur |
|---|---|
| Guide FR | 23 fichiers, 95 995 mots, 191 blocs ```log ; EN 190, JA 190 ; 200 fichiers `journaux/*.log` réécrits par 157 `capture()` |
| Chapitres régénérés depuis un modèle | 7 / 16 (`tools/guide-tpl`, `guide-sync.py`) |
| `docs/01-architecture.md` | 74 lignes, état du cycle 1 ; `docs/02-plan-de-tests.md` : cycles 1–6 seulement |
| Commentaires | 416 lignes / 18 918 (2,2 %) ; 9 JSDoc pour 427 exports de `core/` ; 266 lignes > 300 caractères |
| Licence, CHANGELOG, CONTRIBUTING, `.nvmrc`, `engines` | absents |
| Zip v19 | 23,4 Mo, 860 fichiers : `guide/` 10,3 Mo, `docs/` 9,4 Mo, `i18n/` 1,5 Mo, `editor/` 0,7 Mo, `core/` 0,5 Mo |

## 5. Cas d'usage à créer ou modifier

| # | Cas d'usage | Pourquoi | Critère d'acceptation | Tests à écrire d'abord | Fichiers | Effort |
|---|---|---|---|---|---|---|
| D-1 | **Mettre le projet sous git avec intégration continue** | B1 | `git log` par cycle, tag par version ; à chaque push : unitaires < 2 min ; chaque nuit : bout en bout Chromium ; artefact zip produit par l'action | Le workflow lui-même est le test ; un commit volontairement cassé doit faire échouer l'action | `.github/workflows/tests.yml`, `.gitignore`, `CHANGELOG.md` | S |
| D-2 | **Démarrage en une vague : `modulepreload` généré (ou bundle esbuild)** | I1, I2 | Sur 4G simulée, `__atelier.ready` < 1,5 s (contre 3,3 s) ; `index.html` contient la liste exacte des modules ; un module oublié = test rouge ; plus de `document.write` | `tests/preload.test.js` : la liste dans `index.html` = fermeture transitive des imports de `app.js` ; `tools/e2e/perf.mjs` : budget de démarrage avec `Network.emulateNetworkConditions` | `tools/build.mjs` (nouveau), `index.html`, `README.md` | S |
| D-3 | **Version affichée et cache maîtrisé** | I3 | Fichier → À propos montre « Atelier v20 (2026-11-xx) » ; le journal `boot.ok` porte la version ; `.htaccess` livré ; après mise à jour, aucun mélange de modules (URL versionnées) | Unitaire : `core/version.js` cohérent avec `CHANGELOG.md` et le nom du zip ; bout en bout : le menu affiche la version ; test d'intégration `.htaccess` avec PHP intégré (`php -S` ne lit pas `.htaccess` : vérifier au moins la syntaxe, et chez OVH **à vérifier**) | `core/version.js`, `editor/app.js`, `index.html`, `.htaccess`, `tools/build.mjs` | S/M |
| D-4 | **Éditeur utilisable hors ligne (service worker)** | I4 | Charger l'éditeur une fois, couper le réseau, recharger : l'éditeur démarre et le projet est là ; une nouvelle version est proposée au redémarrage, jamais imposée en pleine édition | Bout en bout : `context.setOffline(true)` puis `reload` → `__atelier.ready` ; journal `sw.update-available` ; unitaire : liste de précache = liste D-2 | `sw.js`, `editor/app.js` (enregistrement + bannière « nouvelle version »), `tools/build.mjs` | M |
| D-5 | **Tests unitaires de l'interface par extraction vers `core/`** | B2 | 60 % de lignes de `editor/` couvertes ou déplacées dans `core/` ; les 5 modules cités testés sans navigateur | Tests pour `core/history.js` (fusion par clé, 150 pas, lecture seule), `core/drop-target.js` (géométrie de dépôt), `core/inline-commands.js`, `core/field-validation.js`, `core/cmdk-rank.js` | `editor/store.js`, `dnd.js`, `inline.js`, `fields.js`, `cmdk.js` → nouveaux fichiers `core/` | M |
| D-6 | **Régression de bout en bout en 4 minutes** | I5 | < 4 min sur la machine de Kudoro ; 0 `t.wait` hors cas justifiés (commentés) ; trace Playwright jointe à chaque échec ; 3 workers | Réécrire les attentes en `waitCode`/`waitForFunction` ; `run.mjs --workers 3` ; un scénario qui échoue exprès produit `trace.zip` | `tools/e2e/run.mjs`, `logs.mjs`, 28 scénarios | M |
| D-7 | **Guide sans dérive : journaux normalisés et lus à la construction** | I6 | Deux régressions successives ne changent aucun fichier de `docs/guide/` ; le HTML EN/JA montre le même journal que le FR ; `guide-sync.py` remplacé par Node | `tests/guide-html.test.js` : un bloc ```log vide avec lien `journaux/x.log` est rempli depuis le fichier ; `tests/log.test.js` : `formatEntry` en mode « documentation » masque heures et identifiants | `tools/e2e/logs.mjs`, `tools/md.mjs`, `tools/guide-html.mjs`, `tools/guide-sync.mjs` | S+S+S |
| D-8 | **Fumée Firefox et Safari avant chaque livraison** | I7 | Démarrer, ajouter un widget, modifier un texte, exporter : vert sur `firefox` et `webkit` ; README : matrice des navigateurs | `tools/e2e/smoke.mjs` paramétré par navigateur | `tools/e2e/run.mjs` (option `--browser`), `README.md`, `docs/guide/bienvenue.md` | S |
| D-9 | **Éditeur conforme WCAG 2.2 AA (document principal)** | I9 | axe-core 0 violation A/AA sur 5 écrans (éditeur, Style, SEO, Publier, Journal) ; cibles ≥ 24 px ; `<main>` et `<h1>` présents | `tools/e2e/a11y-editor.mjs` (comme `cycle10.mjs` pour le site) | `editor/app.js:85,192`, `index.html:51,92`, `editor/editor.css:175,549` | S |
| D-10 | **Documentation de reprise** : architecture à jour, licence, CHANGELOG, JSDoc des exports du cœur | I8 | Un développeur extérieur installe, lance les tests, ajoute un widget et livre un zip en suivant `docs/` seulement (à faire tester par une personne réelle) ; `LICENSE` choisi avec Laurent | `tests/log-catalog`-like : chaque export public de `core/tree.js`, `site.js`, `editing.js`, `render.js` a un JSDoc (test de présence) | `docs/01-architecture.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `core/*.js` | M |
| D-11 | **Fixtures de projets anciens et schéma versionné** | m4 | Les projets des cycles 5, 12, 19 s'ouvrent, se rendent et s'exportent sans erreur ; `site.schema` incrémenté à chaque changement de modèle, migration explicite | `tests/migrations.test.js` sur `tests/fixtures/projets/*.json` | `core/site.js` (`normalizeSite` → `migrate`), fixtures | S |
| D-12 | **Budgets de performance et comparaisons visuelles dans la régression** | m2, m3 | Démarrage, rendu, taille d'export sous budget ; 6 captures comparées avec 0,2 % de tolérance | `tools/e2e/perf.mjs`, `tools/e2e/visual.mjs` | nouveaux scénarios, `run.mjs` | S |
| D-13 | **Deux archives de livraison et outillage figé** | m5, m6, m7, m9 | `atelier-vNN.zip` < 6 Mo sans `docs/` ; `atelier-vNN-sources.zip` ; `tools/package.json` + lockfile ; `run.mjs` lance son serveur ; chiffres du README produits par script | `tests/package.test.js` : le zip d'exécution contient exactement la liste D-2 + `guide/` | `tools/build.mjs`, `tools/package.json`, `tools/e2e/run.mjs`, `README.md` | S |
| D-14 | **Lint et types sans build** | m1 | `npm run lint` et `npm run types` verts en CI ; `// @ts-check` sur `core/` | — (ce sont des vérifications) | `eslint.config.js`, `jsconfig.json`, `package.json` | S |

Hors de mon périmètre mais vu en passant : `app.js:192` attache un clic « changer d'appareil » au cadre du canevas (même sélecteur trop large que I9) ; `core/collections.js` fait 1 048 lignes et 55 Ko, le plus gros module du cœur (relecture A).
