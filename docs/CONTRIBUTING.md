# Contribuer à Atelier — conventions du projet

Ce document sert à toute personne (ou agent) qui touche au code. Il décrit ce qui ne se devine pas en lisant un fichier. Lis-le en entier avant de commencer un cycle.

## 1. Méthode : un cycle = une livraison

1. **Spécification** : `docs/cycle-N.md` (Demande, Spécification, Tests écrits d'abord, Livré). Le plan des cycles 25 à 36 est dans `docs/audit-2026-10-30.md` § 6 ; les preuves détaillées dans `docs/audit-2026-10-30/*.md`.
2. **Tests d'abord** (style XP) : tests unitaires Node dans `tests/*.test.js` (lancer `npm test` ; Node 22, sans dépendance), puis scénario de bout en bout `tools/e2e/cycleN.mjs` (Playwright, Chromium). Le test est rouge, puis le code le rend vert.
3. **Développement** : vanilla JS, modules ES, **zéro dépendance à l'exécution** (ni framework, ni bibliothèque : tout est écrit dans le projet). Pas d'outil de build obligatoire pour développer.
4. **Vérification** : `npm test` vert ; le scénario du cycle vert ; les scénarios voisins verts ; régression complète avant livraison (12 min).
5. **Documentation** : guide utilisateur (`docs/guide/`, en français, puis anglais et japonais), README, `docs/cycle-N.md` complété (« Livré »).
6. **Livraison** : `CHANGELOG.md`, commit, zip `pkg-atelier/atelier-vNN.zip`.

## 2. Organisation du code

- `core/` — logique pure, **sans DOM**, importable dans Node et testée unitairement. Modèle du site (`site.js`, `tree.js`), rendu HTML/CSS (`render.js`, `style.js`, `theme.js`, `tokens.js`), widgets (`widgets.js`, `widgets-extra.js`, `collection-widgets.js`), collections, SEO, assainissement (`sanitize.js`, `escape.js`), publication (`publish.js` génère aussi `publish.php`), collaboration (`collab*.js`, `review.js`), IA (`ai-tasks.js`, `assistant.js`, `smart.js`, `bench.js`), journal (`log.js`), auto-test (`selftest.js`).
- `editor/` — l'interface (DOM) : `app.js` (démarrage, raccourcis), `store.js` (état immuable, `commit()`, historique, enregistrement), `canvas.js` (iframe de la page, mise à l'échelle, sélection), `dnd.js`, `inline.js` + `richedit.js` (édition directe), `inspector.js` + `styletab.js` + `fields.js`, `panels.js` (panneaux de gauche), `pages.js`, `*-ui.js` (fenêtres), `log.js` + `log-ui.js`, `storage.js` (IndexedDB), `dom.js` (`h()`, `$`, `toast`).
- `i18n/` — catalogues de l'interface (voir § 4). `tools/` — outillage Node (tests de bout en bout, i18n, guide). `tests/` — unitaires. `docs/` — spécifications, guide, audit. `guide/` — guide HTML **généré** (ne pas éditer à la main).
- Un widget = `register('type', { label, icon, category, fields, defaults, css, script?, render })` dans `core/widgets-extra.js` (voir le README « Ajouter un widget »). Le rendu reçoit un contexte `c` (`c.t` texte dans la langue, `c.esc`, `c.attr`, `c.rich`, `c.inline`, `c.url`, `c.img`, `c.imgTag`).
- Toute modification du modèle passe par les fonctions de `core/` qui retournent un nouvel objet (immuable) ; l'interface appelle `commit(nouveauSite, { key, sticky, label })` dans `editor/store.js`.

## 3. Journal : chaque code est documenté

- On n'écrit pas `console.log`. On utilise `log.info|warn|error|debug|trace('domaine.action', __('Message'), { données })` ou un parcours `const f = log.flow('domaine.action', __('…')); f.step('etape', …); f.ok(…)/f.fail(…)`.
- **Code = `domaine.action`** (minuscules, points, tirets), stable, lisible par un humain. Les secrets (jetons, e-mails, clés) sont masqués automatiquement par nom de clé et par motif, mais on ne les met pas dans les messages.
- **Chaque code nouveau doit être documenté dans `docs/guide/*.md` (français)** — sinon `tests/log-catalog.test.js` est rouge. Convention : une ligne dans la table « Codes de ce chapitre » du chapitre concerné (`| \`domaine.action\` | NIVEAU | à quoi il sert |`) et, si c'est un cas d'usage visible, une section « Variantes / Journal » qui le cite. Puis `node tools/guide-index.mjs` régénère `docs/guide/index-codes.md`.
- Les chapitres anglais (`docs/guide/en/`) et japonais (`docs/guide/ja/`) ont les mêmes sections et les mêmes tables de codes : ajoute-y la même ligne traduite.

## 4. Textes de l'interface : français = clé, puis EN et JA

- Tout texte visible passe par `__('Texte français')` (import `{ __ } from '../core/ui-i18n.js'`), avec paramètres `__('Page « {name} » créée', { name })`, pluriel `__n(n, '{n} page', '{n} pages')`, contexte `__c('contexte', 'Texte')` quand le même français a deux traductions, `N_('Texte')` pour marquer sans traduire (libellés déclarés au chargement du module). Dans `index.html`, les textes sont traduits au démarrage par attribut : regarde comment les boutons existants sont faits.
- Les traductions vivent dans `i18n/parts/<nom>.en.json` et `.ja.json` (clé = français exact, valeur = traduction ; contexte = clé `contexte|Texte`). **Pour un nouveau cycle, crée tes propres fichiers** `i18n/parts/cNN-<sujet>.en.json` et `.ja.json` (évite les conflits avec les autres cycles).
- Après toute modification : `node tools/i18n.mjs build` (régénère `i18n/en.js` et `i18n/ja.js`, chargés par `index.html`) ; `node tools/i18n.mjs check` doit dire `manquantes 0` — c'est aussi ce que vérifie `tests/ui-i18n-coverage.test.js`.
- Glossaire des termes (FR/EN/JA) : `docs/i18n-glossaire.md`. Style : anglais britannique simple ; japonais です・ます調, 「」 pour citer l'interface.

## 5. Tests de bout en bout

- Lanceur : `node tools/e2e/run.mjs http://localhost:8791/ <dossier-captures> [cycleNN …]` ; sans nom de cycle, tout tourne (≈ 12 min). Serveur statique à lancer avant : `python3 -m http.server 8791` à la racine du projet (ou un autre port, passé en URL).
- Playwright et axe-core sont dans `tools/node_modules` (`npm install --prefix tools playwright@1.56.1 axe-core@4.10.3`, Chromium via `npx --prefix tools playwright install chromium`). Dans un worktree git, `tools/node_modules` n'existe pas : fais un lien symbolique vers celui du dépôt principal.
- Un scénario exporte `default async function (t)` avec `t.page`, `t.canvas()` (frameLocator de l'iframe), `t.ok(condition, 'message')`, `t.wait(ms)` (à éviter : préfère `waitCode`, `waitForFunction`, `waitForSelector`), `t.base`, `t.shots`. Le journal sert d'oracle : `mark(page)` → actions → `since(page, s)` → `expectCodes(t, es, ['code.un', 'code.deux'], 'libellé')` (`tools/e2e/logs.mjs`). `capture('nom', es)` écrit un extrait réel dans `docs/guide/journaux/nom.log` pour le guide.
- Les erreurs JS, erreurs de console et toasts d'erreur inattendus font échouer le scénario (vérifié par `run.mjs`). L'état est vierge à chaque scénario (`?fresh=1`, contexte neuf). `window.__atelier` expose l'état pour les tests (`site`, `ready`), `window.atelierDebug` le journal, `window.autotest()` l'auto-test.
- Un nouveau cycle = un fichier `tools/e2e/cycleNN.mjs` déjà listé dans `run.mjs` (les fichiers absents sont ignorés).

## 6. Guide utilisateur

- Source : `docs/guide/*.md` (français, référence), `docs/guide/en/`, `docs/guide/ja/` (mêmes noms de fichiers, mêmes sections numérotées). Modèle de section : `docs/guide/_modele.md` (But, Étapes, Chemin normal, Journal attendu, Variantes, Erreurs). Les chapitres 05, 06, 07, 12, 13, 14, 15 sont générés depuis `tools/guide-tpl/*.md.tpl` (`python3 tools/guide-sync.py tools/guide-tpl/*.tpl`) : modifie le `.tpl`, pas le `.md`.
- Guide HTML : `node tools/guide-html.mjs` → `guide/` (captures : `cd tools && node guide-captures.mjs`, éditeur servi sur :8791). Les classes « techniques » (journal, codes) sont repliées par défaut dans le HTML.
- Nouveau chapitre ou section : français d'abord, puis EN et JA (`docs/i18n-guide-brief.md` donne les règles de traduction : termes de l'interface exactement comme dans les catalogues, blocs ```log jamais traduits, liens `journaux/` → `../journaux/`).

## 7. Sécurité : règles non négociables

- Aucun jeton, mot de passe ou clé dans le projet (`site.json`), dans les journaux, dans les tests ou dans la documentation. Les secrets vivent dans `editor/storage.js` (magasin `secrets`), liés à l'appareil. La clé privée ne quitte jamais l'appareil.
- Tout texte qui entre dans le modèle (saisie, import, collaboration, IA) passe par `core/sanitize.js` ; tout HTML émis passe par `escape.js` ou le rendu. Jamais d'`innerHTML` avec une valeur non assainie dans `editor/`.
- `publish.php` : liste blanche d'extensions, chemins contrôlés, jeton haché ; toute évolution s'accompagne d'un test dans `tests/publish-php.test.js` (PHP réel).

## 8. Style de code

- Français dans les commentaires, les messages, les noms de tests ; identifiants en anglais court.
- Lignes de 200 caractères au plus pour le nouveau code ; une fonction = une idée ; pas de duplication des blocs `try/catch + log + toast` (helper partagé).
- Pas de `prompt()`/`confirm()`/`alert()` : fenêtres `<dialog>` via les helpers de `editor/dom.js` (à partir du cycle 33 ; avant, suivre l'existant).
- Commits : un par cycle au moins, message en français (« Cycle 25 : colmatage XSS et jeton lié à l'adresse »), terminé par les lignes d'attribution demandées par l'outil s'il y en a. Ne commite pas `guide/`, `i18n/en.js`, `i18n/ja.js` (générés, ignorés par git) ni les réécritures de `docs/guide/journaux/*.log` que tu n'as pas voulues (`git checkout -- docs/guide/journaux` avant de committer, puis `git add` des seuls nouveaux fichiers).

## 9. Livraison

- Version : nom du zip `atelier-vNN.zip` (NN = numéro de version, un par cycle livré). Zip : `zip -qr pkg-atelier/atelier-vNN.zip . -x "node_modules/*" "*/node_modules/*" "pkg-atelier/*" "shots/*" ".git/*" "docs/captures/guide/*"` après `node tools/i18n.mjs build` et `node tools/guide-html.mjs`.
- README : section « Guide d'utilisation » (résumé par fonctionnalité) et « Pour les développeurs » à tenir à jour ; les chiffres de tests y sont recopiés à la main (à remplacer par un script, voir audit Q9).
