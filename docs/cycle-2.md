# Cycle 2 — Éditeur : canevas, sélection, inspecteur

## Livré
- Canevas en iframe de même origine, rendu à la vraie largeur de l'appareil (ordinateur ≥ 1280 px, tablette 820 px, mobile 390 px) puis mis à l'échelle : les media queries du site s'appliquent exactement comme en ligne.
- Mise à jour sans rechargement (CSS, en-tête, contenu, pied de page) : le défilement est conservé.
- Survol / sélection avec étiquette colorée par niveau (section bleu, rangée vert, colonne violet, widget orange) et mini barre d'outils (parent, déplacer, dupliquer, supprimer).
- Inspecteur Contenu / Style / Avancé, fil d'Ariane, navigateur (arbre repliable), bibliothèque de widgets cliquable, annuler/rétablir avec la sélection.

## Décisions
- L'historique enregistre `{site, selected}` : annuler remet aussi la sélection.
- Les éléments masqués sur un appareil restent visibles en transparence dans l'éditeur.

## Tests
- 21 tests de bout en bout (`tools/e2e/cycle2.mjs`), 0 erreur JavaScript.
- Le test de conservation du défilement tient compte de la hauteur réduite quand un titre passe de H1 à H3.
