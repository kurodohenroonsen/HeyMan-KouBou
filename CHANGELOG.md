# Journal des versions

## v26 — cycle 26 — 31/10/2026

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
