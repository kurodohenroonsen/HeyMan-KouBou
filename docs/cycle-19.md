# Cycle 19 — Banc d'essai de l'IA locale (Gemini Nano dans Chrome)

## Décision
29/10/2026, Kudoro : **tout reste local, Gemini Nano dans le navigateur**. Pas de serveur de modèles (Ollama, LM Studio), pas d'agent externe (WebMCP écarté : les agents du navigateur peuvent passer par le cloud).

## Pourquoi un banc d'essai
Tous les tests automatiques utilisent un faux Gemini Nano : ils prouvent que le code vérifie, nettoie et applique correctement les réponses, pas que le vrai modèle répond bien. Le banc d'essai lance **chaque tâche d'IA d'Atelier sur des exemples fixes, dans le vrai Chrome de la personne**, vérifie automatiquement chaque réponse, mesure les durées, et produit un **rapport à copier** (ou un fichier .json) : on saura exactement ce qui marche, ce qui marche à moitié, et pourquoi.

## Spécification
- **Où** : ✨ IA locale → **🧪 Banc d'essai**, ou Ctrl+K « Banc d'essai de l'IA locale ».
- **Avant de lancer** : l'état de chaque API (Prompt, images, Summarizer, Rewriter, Proofreader, Translator…), les paramètres du modèle quand Chrome les donne (`LanguageModel.params()` : température, top-K), le navigateur. Si un modèle est « à télécharger », le banc le dit et propose la fenêtre ✨ (le téléchargement demande un clic).
- **Groupes** (cochables) et **cas** (exemples fixes, en français ; néerlandais par traduction) :
  - Rédaction : reformuler plus court, plus simple, plus formel ; corriger trois fautes connues.
  - Référencement : description pour Google, titre, mots-clés, texte alternatif d'une image dessinée par Atelier (cercle rouge sur fond bleu).
  - Contenus : affiche dessinée par Atelier (titre, date sans année, heure, lieu, site) → événement ; e-mail de trois membres → trois fiches ; chapô ; titres ; résumé d'une relecture de trois commentaires.
  - Assistant : « ajoute une FAQ de 3 questions », « mets tous les titres en rouge », « crée une page avec un héros et un formulaire de contact », « supprime toutes les pages » (doit être refusé).
  - Langues : description en néerlandais (rédigée en français puis traduite).
- **Chaque cas** : durée, extrait de la sortie, liste de vérifications (✓ / ✗ avec le détail : « date 2026-12-14 attendue, lu 2026-12-15 »), statut **réussi** (toutes les vérifications), **partiel** (seule une vérification secondaire ratée), **échoué** (une vérification essentielle ratée), **erreur** (exception, avec la cause probable du journal), **ignoré** (API absente).
- **Pendant** : progression cas par cas, bouton **Arrêter**. Les cas tournent l'un après l'autre (le modèle est sur l'appareil : un seul à la fois).
- **Rapport** : note globale, tableau des cas, détail des échecs, environnement ; **📋 Copier le rapport** (Markdown) et **⇩ .json**. Rien n'est enregistré dans le projet ; rien ne quitte l'ordinateur.
- **Journal** : `bench.run.*` (parcours complet), `bench.env`, `bench.case` (un par cas : statut, durée), `bench.check-fail` (WARN, une par vérification ratée), `bench.copy`, `bench.download` ; chaque appel au modèle garde son propre parcours `ai.*` (chapitre 7).

## Tests écrits d'abord
- `tests/bench.test.js` : catalogue (groupes, identifiants uniques, vérifications) ; banc complet avec un **faux bon** fournisseur → tous réussis ; avec un **faux mauvais** (réponses vides ou fausses) → échecs et erreurs détectés, détail des vérifications ; cas ignoré quand l'API manque ; arrêt en cours ; résumé (note, comptes) ; rapport Markdown (environnement, tableau, détails des échecs).
- `tools/e2e/cycle19.mjs` : fenêtre, état des API, lancement avec le faux Nano, progression, rapport copié et téléchargé, mauvais fournisseur, arrêt, journal.

## Livré
- `core/bench.js` (sans DOM, testé) : 18 cas en 5 groupes, données d'exemple (site avec page, agenda, membres, actualités, trois commentaires), vérifications avec détail (essentielles ou secondaires), statuts réussi / partiel / échoué / erreur / ignoré / arrêté, note sur 100, rapport Markdown (environnement, tableau, détail des échecs).
- `tools/fake-nano.mjs` : faux « bon » et « mauvais » Gemini Nano, partagés par les tests unitaires et de bout en bout.
- Éditeur (`editor/bench-ui.js`) : **🧪 Banc d'essai** (fenêtre ✨ IA locale, Ctrl+K) : état des API et paramètres du modèle, modèles à télécharger signalés, groupes à cocher, images de test dessinées dans le navigateur (affiche, cercle rouge sur fond bleu), progression cas par cas, Arrêter, rapport à copier, .json avec le journal de l'IA.
- Journal : `bench.*` ; chapitre 14 du guide ; renvoi depuis le chapitre 7.

## Tests
- Unitaires : 325 (dont 6 pour le banc d'essai).
- Bout en bout : `cycle19`, 30 vérifications (bon modèle 100/100, rapport copié et .json, mauvais modèle noté sous 40 avec ignorés, erreurs et échecs expliqués, modèle à télécharger signalé, arrêt en cours).
- Régression complète : 1464 vérifications de bout en bout (cycles 2 à 19), 0 échec.
