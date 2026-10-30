# Cycle 20 — Auto-test en console, avec retour arrière

## Demande
29/10/2026, Kudoro : « une commande simple à lancer dans la console JavaScript qui lance une suite de tests avec leurs rapports, afin que je fournisse les logs pour vérifier que tous les cas d’usage fonctionnent, en pensant bien à un rollback pour pouvoir la relancer ».

## Pourquoi
Les tests de bout en bout tournent dans un Chromium de laboratoire. L’auto-test rejoue les cas d’usage du guide **dans le vrai navigateur de la personne, sur sa vraie installation** (hébergement, extensions, réglages, Gemini Nano réel si on le demande), vérifie chaque cas avec le **journal attendu** du guide et l’état du projet, puis produit un **rapport à coller**.

## Spécification
- **Commande** (console du navigateur, F12) : `copy(await atelierDebug.selftest())`. Le rapport est renvoyé (donc copié par `copy`) et aussi placé dans le presse-papiers quand le navigateur l’autorise. Ctrl+K « Auto-test » lance la même chose.
- **Options** : `selftest({ only: ['pages', 4], skip: [...], ai: 'fake' | 'real' | false, publish: true, full: false, download: false })`
  - `only` / `skip` : identifiants de cas ou numéros de chapitre du guide ;
  - `ai` : faux modèle intégré (par défaut : vérifie les écrans et le code, pas la qualité), vrai Gemini Nano (`'real'`), ou cas d’IA ignorés (`false`) ;
  - `publish` : test de connexion à publish.php avec les réglages du projet (lecture seule : jamais de publication) ; ignoré sans adresse ;
  - `full` : ajoute tout le journal de l’auto-test au rapport ; `download` : télécharge aussi un .json.
- **Avant** : refus pendant une session de collaboration ou en relecture (les modifications partiraient chez les autres). Le projet est mis de côté **trois fois** : en mémoire (avec l’historique d’annulation), dans un emplacement de secours de la base locale, et comme version de sécurité « Avant l’auto-test ». Un repère dans `localStorage` signale l’auto-test en cours.
- **Pendant** : l’exemple du MAB est chargé (sélecteurs prévisibles). Les fenêtres de confirmation répondent oui, les téléchargements sont interceptés (rien n’est enregistré sur l’ordinateur), le journal garde le niveau debug. Chaque cas : actions sur l’interface, vérifications de l’état, codes du journal attendus (avec alternatives `a|b`), aucune erreur inattendue ; statut réussi / échoué / erreur / ignoré.
- **Après** (même si un cas plante) : projet, historique, page, langue, appareil, réglages du journal et `localStorage` remis comme avant ; versions et images créées pendant le test supprimées ; emplacement de secours, version de sécurité et repère retirés **seulement si** le projet restauré est identique à l’original (comparaison du JSON).
- **Retour arrière manuel** : `await atelierDebug.rollback()` ; après un rechargement en plein test, l’éditeur restaure tout seul au démarrage (`selftest.recovered`).
- **Rapport** (Markdown) : résultat, note, état du retour arrière, tableau des cas, détail de chaque problème (vérifications ratées, codes manquants, erreurs, extrait du journal du cas), avertissements et erreurs de toute la durée, environnement.
- **Journal** : `selftest.run.*`, `selftest.case`, `selftest.check-fail`, `selftest.missing`, `selftest.unexpected`, `selftest.rollback.*`, `selftest.recovered`, `selftest.refused`.

## Tests écrits d’abord
- `tests/selftest.test.js` : catalogue (identifiants uniques, chapitres, codes attendus) ; choix des cas (identifiants, chapitres, exclusions) ; codes attendus avec alternatives ; erreurs inattendues (motifs autorisés) ; statut d’un cas ; résumé et note ; rapport (résultat, retour arrière, tableau, détails, journal) ; comparaison stable du JSON.
- `tools/e2e/cycle20.mjs` : projet modifié par la personne → auto-test avec le faux modèle → tous les cas réussis, projet et historique identiques, versions et images temporaires supprimées, rapport ; relancé une seconde fois → même résultat ; refus en relecture ; rechargement en plein test → restauration au démarrage ; `rollback()` sans test en cours.

## Livré
- `core/selftest.js` (sans DOM, testé) : catalogue de 24 cas (chapitres 0 à 13), choix par identifiant ou chapitre, codes attendus avec alternatives, erreurs autorisées par cas, statut, résumé et note, rapport Markdown (résultat, retour arrière, tableau, détails avec extrait du journal, avertissements, environnement), JSON stable.
- `editor/selftest.js` : pilotage de la vraie interface (clics, saisies, raccourcis, fichiers dessinés dans le navigateur), confirmations et téléchargements interceptés, faux modèle intégré (`core/fake-nano.js`, partagé avec les tests) ou vrai Gemini Nano, délai par cas, arrêt propre (un cas arrêté échoue à sa prochaine attente au lieu de continuer).
- `editor/selftest-safe.js` : mise de côté (mémoire avec l'historique, emplacement `selftest-backup`, version de sécurité, repère `localStorage`), retour arrière vérifié (JSON identique en mémoire, réenregistré et relu), nettoyage des versions et images temporaires, `rollback()` manuel, restauration au démarrage après une interruption.
- `editor/store.js` : `captureState()` / `restoreState()` ; `editor/storage.js` : `deleteProject`, `listAssetIds`, `deleteAssets`.
- Console : `atelierDebug.selftest(options)`, `.rollback()`, `.report()`, `.cases()` ; Ctrl+K « Auto-test ».
- Journal : `selftest.*`, `store.restore`, `storage.project-delete`, `storage.asset-delete` ; chapitre 15 du guide (exemple de rapport réel : `docs/guide/journaux/autotest-rapport.md`).

## Tests
- Unitaires : 333 (dont 8 pour l'auto-test).
- Bout en bout : `cycle20`, 73 vérifications (24 cas réussis dont la connexion à un faux publish.php, projet de la personne identique après coup — site, historique, page, appareil, versions, images, réglages —, relance par chapitre, un cas seul sans les précédents, `ai: false`, refus en relecture, rechargement en plein test restauré au démarrage, `rollback()` pendant un test).
- Régression complète : 1537 vérifications (après le correctif du canevas) de bout en bout (cycles 2 à 20), 0 échec.

## Correctif après le premier essai sur MAMP (29/10/2026)
- Constat (journal de Kudoro) : `canvas.load.ok` après 19 s et faux `boot.timeout` : l'événement `load` de l'iframe attendait les polices Google.
- Correction : le canevas est prêt dès que sa page est lue (repère `atelier-load` + `readyState`), `canvas.load.ok` indique `via` ; l'arrivée des ressources externes est notée (`canvas.resources`, ou `canvas.resources-slow` en WARN au-delà de 3 s, avec les hôtes).
- Test d'abord : `cycle20` simule des polices à 9 s → éditeur prêt en ~0,5 s, pas de `boot.timeout`, hôte lent nommé.

## Sans coller dans la console (29/10/2026)
- Constat : Chrome refuse de coller dans la console (protection « allow pasting »).
- Livré : `editor/selftest-ui.js` — adresse `?autotest` (`=real`, `=off`) lancée au démarrage puis nettoyée ; commande courte `autotest()` ; Ctrl+K « Auto-test » ; fenêtre 🧪 du rapport (résultat, retour arrière, rapport, 📋 Copier par un vrai clic, ⇩ .md, ↻ Relancer). Journal : `selftest.auto`, `selftest.dialog`, `selftest.report-download`.
- Test d'abord : `cycle20` (fenêtre, copie, .md, `?autotest` nettoyé et projet remis, Ctrl+K).
- Régression complète après l'ajout : 1553 vérifications de bout en bout, 0 échec ; 333 tests unitaires.

## Premier rapport réel (Chrome 156, Mac, MAMP — 29/10/2026)
- 21 / 22 réussis ; `texte` en erreur : `edit.start` puis plus rien (pas de `edit.ok`). Cause : la fenêtre n'avait pas le focus (éditeur ouvert depuis le Terminal) ; sans focus, `blur()` ne produit pas l'événement « blur » qui termine l'édition. Ce n'est pas un défaut de l'éditeur (en vrai, on clique dans la page, qui a alors le focus), mais de l'auto-test.
- Test d'abord : `cycle20` empêche `blur()` d'agir dans le canevas → erreur reproduite ; correction : événement « blur » envoyé par l'auto-test (`selftest.focus-fallback`).
