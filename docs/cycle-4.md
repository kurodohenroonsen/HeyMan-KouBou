# Cycle 4 — Glisser-déposer et édition directe

## Livré
- Glisser un widget ou une structure depuis la bibliothèque vers un endroit précis de la page : vignette sous le pointeur, ligne bleue d'insertion (verticale entre des colonnes côte à côte), cadre pointillé pour un conteneur vide, défilement automatique près des bords.
- Déplacer un élément dans la page : poignée ✥ de la barre de sélection, ou glisser directement l'élément sélectionné.
- Réorganiser dans le navigateur (avant / après / dedans) ; on peut aussi glisser depuis le navigateur vers la page.
- Dépôts impossibles ignorés (section dans une colonne, élément dans lui-même, rangée trop imbriquée) ; Échap annule un glisser.
- Édition directe : double-clic (ou Entrée sur l'élément sélectionné) sur un titre, un texte ou un bouton. Entrée valide un titre ou un bouton, Échap termine. Toute la saisie = une seule étape d'annulation. L'édition se fait dans la langue affichée.
- Barre de mise en forme flottante : gras, italique, souligné, lien (champ intégré), effacer. Ctrl+B / I / U.
- Collage toujours en texte brut ; tout contenu est assaini à chaque frappe (aucune balise ou attribut dangereux ne peut être enregistré).
- Menu contextuel (clic droit dans la page ou le navigateur) : modifier le texte, dupliquer, copier/coller, copier/coller le style, monter/descendre, parent, supprimer ; navigable au clavier.
- Raccourcis : Alt+↑ / Alt+↓ pour déplacer, plus ceux du cycle 2.

## Logique pure testée (core/editing.js)
`dropContainer`, `dropIndex`, `isNoopDrop`, `applyDrop`, `moveSibling` : 12 tests unitaires.

## Bugs trouvés par les tests et corrigés
- Entrée pour valider un titre relançait immédiatement l'édition (l'évènement remontait au raccourci « Entrée = éditer »).
- Mauvaise signature de `translate` : la saisie n'était jamais enregistrée.
- Un défilement automatique dans le canevas faisait aussi défiler le cadre de l'éditeur (coordonnées décalées) : cadre en `overflow: clip`, défilement calculé à la main.

## Tests
- Unitaires : 71 réussis. Bout en bout : cycles 2 + 3 + 4 = 68 réussis, 0 erreur JavaScript.
