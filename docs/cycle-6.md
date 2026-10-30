# Cycle 6 — Recette

## Parcours testé de bout en bout (`tools/e2e/cycle6.mjs`)
Site vide → modèle héros → titre écrit dans la page → modèle contact → nom, couleur et adresse du site → destinataire du formulaire → deuxième page avec un modèle → bouton lié à cette page → taille du titre réglée pour le mobile → vérification à 390 / 820 / 1280 px → 5 annulations et 5 rétablissements → rechargement (le projet est retrouvé) → vérification avant export → export → contrôle des fichiers (canonique, hreflang, lien interne, sitemap, aucune trace de l'éditeur, e-mail non lisible) → site exporté sans débordement horizontal à 320, 390, 820 et 1280 px.

## Corrigé pendant la recette
- Onglet Style : la liste « Police » débordait sous le champ voisin.

## Bilan
- Unitaires : 93 réussis, 0 échec.
- Bout en bout : 127 réussis, 0 échec, 0 erreur JavaScript (cycles 2 à 6).
