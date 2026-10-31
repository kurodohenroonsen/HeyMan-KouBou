# Cycle 26 — Première visite

## Demande
Audit du 30/10/2026, § 6.3 « Cycle 26 » : X4 (dépôt sur page vide et retours visibles, constats N6 et N12, relecture B : I1, M2, M3) puis X1 (visite guidée, premiers pas, démonstration Kumakōgen, constat N11, tendances 4 et 10 du § 5.1). « Faudrait qu'un non geek s'en sorte super facilement et comprenne son investissement. »

## Spécification
- **X4** : un widget lâché sur la page elle-même reçoit section › rangée › colonne (`applyDrop`, `dropContainer` dans `core/editing.js`) ; refus → fantôme barré (`.drag-ghost.is-forbidden`) + message « Impossible de déposer ici. » avec où déposer (`dropHint`) ; suppression simple → « Supprimé : <nom> — Ctrl+Z pour annuler » (aussi par Retour arrière hors édition) ; Ctrl+S → « Déjà enregistré », aucun téléchargement (`project.already-saved`).
- **Visite** (`core/tour.js` pur, `editor/tour-ui.js`) : 5 étapes, accueil à la première visite, `localStorage['atelier-tour']`, Passer/Échap → plus jamais d'elle-même ; ❓ ▾ (nouveau petit menu), Fichier → « Visite guidée », Ctrl+K ; masque SVG à découpe, bulle `role="dialog"` + `aria-labelledby`, repositionnée au défilement et au redimensionnement, Tab enfermé, ← → Entrée, focus rendu.
- **Pour commencer** (`core/onboarding.js`, `editor/onboarding-ui.js`) : 7 étapes cochées par abonnement au journal, pourcentage, lien → vers l'action, repliable, masquable (`localStorage['atelier-onboarding']`), Ctrl+K « Pour commencer ».
- **Démonstration** (`core/demo-kumakogen.js` : 31 étapes `{ id, say: {ja, en, fr}, widgets, run }` ; `editor/demo-driver.js` : curseur animé, surbrillance, vrais clics, `click/type/select/check/setField/setListField/addWidget/addTemplate/openTab/importImage/say`, vitesse, pause, avance rapide, arrêt ; `editor/demo-draw.js` : illustrations canvas → WebP ; `editor/demo-ui.js` : panneau, fin « Garder ce site » / « Revenir à mon site »). Projet séparé via `beginSafe({ kind: 'demo' })` / `endSafe` ; reprise au démarrage si l'onglet est fermé en cours.
- Primitives de pilotage de l'auto-test sorties dans `editor/ui-drive.js`, réutilisées par l'auto-test et le pilote.

## Tests écrits d'abord
- `tests/editing.test.js` (+6) : dépôt sur la page enveloppé, entre deux sections, déplacement, section non enveloppée, `dropHint`.
- `tests/tour.test.js` (10) : étapes, i18n EN/JA, proposition à la première visite, déroulement, Passer, rejouer, position de la bulle (côtés, flèche, maintien dans la fenêtre), union et découpe.
- `tests/onboarding.test.js` (5) : codes du journal → étapes, journal simulé, pourcentage, choix retenus.
- `tests/demo-script.test.js` (4) : 23 widgets couverts, 3 langues par étape, faits présents dans `donnees.md`, nombres clés, pas d'e-mail officiel inventé.
- `tools/e2e/cycle26.mjs` (94 vérifications) : X4 complet, première visite (?tour), Échap, non réaffichée, rejouer (❓, Fichier, Ctrl+K), liste qui se coche, démonstration complète en vitesse rapide (23 widgets, 2 pages, `ja`, `validateSite`/`auditSite` sans erreur, site d'origine identique), pause, arrêt, garder le site.

## Livré
Tout ce qui précède ; guide : 1.8 (01-demarrage-projet), « Votre première visite » (bienvenue), encadré de la prise en main, 1.3/2.4/2.9/2.14 mis à jour ; traductions `i18n/parts/J-visite.*.json` ; 410 tests unitaires ; e2e cycle26, cycle6, c16-edition, cycle20, cycle24 verts (456). Démonstration : ~53 s en rapide, ~4 min 10 en normale.

## Limites
- Sous un navigateur piloté (Playwright, `navigator.webdriver`), visite et liste ne sont proposées qu'avec `?tour` (sinon les autres scénarios seraient gênés).
- La vidéo du site de démonstration reste sans adresse (aucune vidéo officielle vérifiée) : un avertissement de la vérification avant export, voulu.
- Les messages du retour arrière gardent le mot « auto-test » (`selftest.rollback.*`) aussi pour la démonstration.
- Textes japonais de la démonstration et de la visite à faire relire par une personne de langue japonaise ; traduction EN/JA du guide à la prochaine vague.
