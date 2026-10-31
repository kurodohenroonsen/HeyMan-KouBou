# Conventions de travail sur Atelier (pour les agents et les développeurs)

Lis ce fichier en entier avant de toucher au code. Ensuite lis `README.md` (section « Pour les développeurs »), `docs/cycle-24.md` (modèle de compte rendu de cycle) et la partie de `docs/audit-2026-10-30.md` qui concerne ton cycle (§ 4 pour les constats, § 6.3 pour les critères d'acceptation, tests à écrire d'abord et fichiers). Les relectures détaillées sont dans `docs/audit-2026-10-30/`.

## 1. Méthode (XP)
1. **Tests d'abord** : écris les tests unitaires (`tests/*.test.js`, `node --test`) puis le scénario de bout en bout (`tools/e2e/cycleNN.mjs`) **avant** le code ; ils doivent échouer, puis passer.
2. **Cycles courts** : un cycle = `docs/cycle-NN.md` (Demande, Spécification, Tests écrits d'abord, Livré, Limites), le code, les tests, le guide, les traductions de l'interface.
3. **Rien de cassé** : à la fin, `npm test` (385+ tests) doit être vert, et les scénarios de bout en bout de ton cycle **et** ceux qui touchent aux mêmes fonctions (par exemple `cycle6`, `cycle16`, `c16-edition` pour l'édition ; `cycle12`, `cycle19` pour la publication ; `c16-collab` pour la collaboration) doivent passer. Ne lance pas la régression complète (12 min) à chaque essai : seulement à la fin, si tu as le temps.
4. **Pas de dépendance d'exécution** : `core/` et `editor/` n'importent rien de `node_modules`. L'outillage (`tools/`, `tests/`) peut utiliser Node 22 nu et Playwright/axe déjà installés.
5. **Lisibilité** : lignes de 120 caractères au plus pour le nouveau code, fonctions courtes, un commentaire d'en-tête par fichier qui dit ce qu'il fait, pas de code mort. Le français est la langue du code (commentaires, messages, journal) et de la documentation.

## 2. Organisation du code
- `core/` : logique pure, **sans DOM** (importable dans Node), testée unitairement. Toute logique nouvelle qui peut vivre sans DOM va ici.
- `editor/` : l'interface (DOM, événements, fenêtres). Construction du DOM avec `h()` de `editor/dom.js` ; **jamais `innerHTML` avec un texte venant du projet** sans `sanitizeRich`/`sanitizeInline` (`core/sanitize.js`).
- État : un seul `commit()` dans `editor/store.js` (voir `commit(fn, opts)` ; `opts.key` fusionne les frappes, `opts.sticky`). Lis `editor/store.js` avant de modifier l'état.
- Rendu : `core/render.js` (`renderPage`, `renderSite`) sert au canevas, à l'export et aux tests ; le canevas est `editor/canvas.js` (iframe, mise à jour sans rechargement).
- Widgets : `core/widgets.js` (base) et `core/widgets-extra.js` (`register(type, {label, icon, category, fields, defaults, css, script, render})`), collections : `core/collections.js`, `core/collection-widgets.js`.
- Modèle du projet : `core/site.js` (`createSite`, `blankSite`, `normalizeSite`, `validateSite`, `addAsset`) ; tout changement de format doit être couvert par une migration dans `normalizeSite` et par un test avec un projet ancien (`tests/fixtures/`).
- Journal : `log.info/debug/warn/error('domaine.action', __('message'), { données })` (`editor/log.js`, `core/log.js`). **Chaque nouveau code** doit être documenté dans le guide français (tableau « Codes de ce chapitre » du chapitre concerné) : le test `tests/log-catalog.test.js` échoue sinon. Pas de secret, d'adresse IP ni d'e-mail en clair dans le journal (le masquage est automatique pour les clés connues : vérifie).
- Fenêtres (cycle 33) : toujours `openDialog()`, `confirmDialog()` ou `askText()` de `editor/dialog.js` (jamais `h('dialog'`, `prompt()`, `confirm()`, `alert()`) : `<dialog class="audit">`, `aria-labelledby`, Échap, focus initial et rendu ; boutons de réponse `[data-confirm]` / `[data-confirm-cancel]` (dans les scénarios : `t.confirm()`, `t.answer()`) ; `editor/help.js` fait le lien fenêtre → chapitre du guide (`BY_DIALOG`) : ajoute tes fenêtres.
- Infobulles : chaque nouveau bouton a un `title` ou `aria-label`, et une description dans `DESC` de `editor/tooltip.js` si c'est un bouton-icône.
- Barre de commandes : chaque nouvelle action importante est aussi dans `editor/cmdk.js` (`add(id, groupe, libellé, fn, …)`).
- Auto-test : si ta fonction est un parcours utilisateur courant, ajoute un cas dans `editor/selftest.js` (`SELFTEST_CASES`) avec son retour arrière.

## 3. Langues de l'interface (obligatoire)
- Tout texte visible est écrit en français dans le code via `__('…')` (ou `` __`…${x}` `` avec paramètres `{0}`, `__n(n, 'un', 'plusieurs')`, `__c('contexte', 'texte')`, `N_()` pour une chaîne évaluée plus tard). Le français est la clé.
- Ajoute les traductions anglaise et japonaise dans **un nouveau fichier de partie** pour ton cycle : `i18n/parts/<lettre>-<nom>.en.json` et `.ja.json` (clé = texte français exact → traduction ; lettre suivante disponible dans l'ordre alphabétique, nom court). Style : anglais britannique simple ; japonais です・ます調. Glossaire : `docs/i18n-glossaire.md`.
- Puis : `node tools/i18n.mjs build` (régénère `i18n/en.js` et `i18n/ja.js`) et `node tools/i18n.mjs check` (0 manquante). Le test `tests/ui-i18n-coverage.test.js` échoue sinon.
- Les textes qui vont dans le **site publié** (pas l'interface) sont dans `SITE_TEXT` de `core/widgets-extra.js` ou `L(fr, nl, de, en, ja)` dans `core/collections.js` : cinq langues, pas trois.

## 4. Guide d'utilisation
- Source : `docs/guide/*.md` (français, référence). Ajoute une section numérotée dans le chapitre concerné (ou un chapitre), avec **But, Étapes, Ce que tu vois, Variantes, Erreurs**, et les lignes du tableau « Codes de ce chapitre ». Modèle : `docs/guide/_modele.md`. Public : non-informaticien ; les détails techniques (journal) sont repliés automatiquement dans le guide HTML.
- N'écris **pas** les traductions EN/JA du guide dans ton cycle (elles sont faites par vague) ; n'exécute pas `node tools/guide-html.mjs` ni `tools/guide-captures.mjs` (faits à l'intégration). Exécute `node tools/guide-index.mjs` si tu as ajouté des codes (il régénère `docs/guide/index-codes.md`).
- Mets à jour `README.md` (la section fonctionnelle concernée, en 1 à 3 lignes) et `CHANGELOG.md` (une entrée par cycle, format « ## vNN — cycle NN — date », puces « Ajouté / Modifié / Corrigé »).

## 5. Tests de bout en bout
- Lanceur : `node tools/e2e/run.mjs http://localhost:PORT/ <dossier-captures> cycleNN` ; un serveur statique doit tourner : `python3 -m http.server PORT` lancé **en arrière-plan** depuis la racine de ta copie de travail (utilise le port qui t'a été attribué, jamais 8791).
- Écris `tools/e2e/cycleNN.mjs` sur le modèle de `tools/e2e/cycle24.mjs` : `export default async function (t)`, `t.page`, `t.canvas()`, `t.ok(cond, message)`, `t.wait(ms)` (à éviter : préfère `page.waitForFunction` ou `waitCode` de `tools/e2e/logs.mjs`), `mark/since/expectCodes/capture` pour vérifier le journal. Ajoute `'cycleNN'` à la liste `specs` de `tools/e2e/run.mjs` (à la fin).
- `capture(nom, entrées)` écrit `docs/guide/journaux/<nom>.log` que le guide cite ; utilise-le pour les parcours que tu documentes.
- Les captures d'écran pour la vérification vont dans le dossier de captures passé au lanceur, pas dans `docs/captures/` (sauf si le guide les utilise).

## 6. Git et copie de travail
- Tu travailles dans ta propre copie (worktree git) sur ta branche. Avant de commencer : `ln -s /home/claude/atelier2/tools/node_modules tools/node_modules` dans ta copie (les dépendances d'outillage sont partagées, non versionnées).
- **Commits petits et fréquents** sur ta branche (`git add -A && git commit -m "cycle NN : …"`), message en français, première ligne ≤ 72 caractères. Ne modifie jamais `pkg-atelier/`. Ne touche pas aux fichiers hors de ton périmètre sans raison, pour limiter les conflits d'intégration : si tu dois modifier `index.html`, `editor/editor.css`, `editor/app.js`, `core/site.js` ou `core/render.js`, fais des modifications **locales et petites** (pas de reformatage, pas de réordonnancement).
- Ne fais pas de `git merge`, `rebase` ni `push` : l'intégration dans `main` est faite par l'orchestrateur.
- À la fin : tout commité, `git status` propre, `npm test` vert, scénarios de ton cycle verts, et un rapport (voir § 8).

## 7. Sécurité et vie privée (rappels)
- Jetons, clés privées : jamais dans le projet `.json`, jamais dans le journal, jamais dans l'URL.
- Tout HTML venant d'un projet, d'un pair, d'un CSV, d'une IA ou d'un collage passe par `core/sanitize.js` **à l'entrée** et au rendu.
- Le site publié ne contacte aucun serveur tiers sans action du visiteur (façades au clic) ; pas de cookie, pas de script tiers.
- Les messages d'erreur serveur portent un `code` machine et sont traduits côté éditeur.

## 8. Rapport de fin de cycle (dans ta réponse finale, 300 mots max)
1. Branche et dernier commit.
2. Ce qui est livré (par cas d'usage, critère d'acceptation par critère : fait / pas fait / partiel).
3. Tests : nombre d'unitaires (total `npm test`), vérifications de bout en bout de ton scénario, autres scénarios relancés.
4. Fichiers « chauds » modifiés (`index.html`, `editor.css`, `app.js`, `site.js`, `render.js`, `run.mjs`, parties i18n, chapitres du guide) pour préparer l'intégration.
5. Ce qui reste, les doutes, les décisions prises à la place de Kudoro.
