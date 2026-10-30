# Plan de tests

Chaque cycle commence par ses tests. Unitaires : `node --test` (Node 22, sans dépendance). Bout en bout : Playwright + Chromium.

## Cycle 1 — Cœur
- Arbre : création, recherche, parent, chemin ; insertion à un index ; règles d'imbrication (refus explicites) ; déplacement (y compris vers un autre parent, refus vers un descendant) ; duplication avec nouveaux identifiants profonds ; suppression ; opérations pures (l'original ne change pas).
- Styles : validation par type (longueurs, couleurs, jetons de palette, énumérations, nombres bornés) ; rejet des injections (`;`, `}`, `url(`, `expression`, `@import`) ; compilation ordinateur/tablette/mobile/survol ; héritage (seules les valeurs réglées sont émises) ; masquage par appareil ; transition.
- Assainisseur : liste blanche, attributs supprimés, liens filtrés, entités, balises non fermées, commentaires et scripts retirés, `<div>` / `<span style>` ramenés à du texte propre.
- Rendu : document complet, langue, repli de traduction, hreflang/canonical, chemins relatifs, classes `n-…`, `data-node` seulement dans le canevas, export complet (pages × langues, CSS, sitemap, robots, images).

## Cycle 2 — Éditeur
- Le canevas affiche la page ; clic = sélection + inspecteur ; survol = contour ; navigateur synchronisé ; modification d'un paramètre = mise à jour immédiate du canevas sans rechargement (défilement conservé) ; ajout par clic depuis la bibliothèque ; annuler/rétablir ; aucune erreur console.

## Cycle 3 — Styles
- Un réglage en mode « Mobile » n'agit qu'à 390 px (style calculé vérifié dans le canevas aux 3 largeurs) ; état survol ; palette globale (changer `c1` recolore tout ce qui l'utilise) ; copier/coller le style ; réinitialiser une valeur.

## Cycle 4 — Glisser-déposer et édition directe
- Glisser un widget de la bibliothèque dans une colonne précise ; réordonner dans le canevas et dans le navigateur ; dépôt refusé là où c'est interdit ; édition directe d'un titre ; gras/italique/lien ; collage forcé en texte brut ; tentative d'injection neutralisée ; raccourcis (Suppr, Ctrl+D, Ctrl+C/V, Échap).

## Cycle 5 — Widgets, modèles, pages, export
- Chaque widget se rend correctement (unitaire) ; insertion de chaque modèle ; pages (ajout, renommage, SEO) ; badge de traductions ; export zip lisible, toutes langues, aucun lien cassé interne ; site exporté sans débordement horizontal à 390 px.

## Cycle 6 — Recette
- Toute la suite + parcours complet « créer une page de zéro jusqu'à l'export » ; captures ordinateur/tablette/mobile.
