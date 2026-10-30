# Cycle 10 — Accessibilité et performance

## Spécification (écrite avant les tests)

### Contraste (WCAG 2.1 AA, critère 1.4.3)
- Calcul du rapport de contraste (luminance relative WCAG) entre la couleur du texte et le fond réellement visible (fond de l'élément ou du premier parent qui en a un, sinon le fond du site).
- Seuils : 4,5:1 pour le texte normal, 3:1 pour le grand texte (titres H1–H3, ou taille ≥ 24 px).
- Les boutons sont vérifiés avec leurs couleurs réelles selon l'apparence (plein, secondaire, contour, lien).
- Un fond avec image ne peut pas être vérifié automatiquement : signalé « à vérifier à l'œil ».
- Dans l'éditeur : pastille de contraste en direct sous les couleurs (onglet Style) et dans la palette (paires usuelles : texte/fond, bouton, texte discret). Dans la vérification avant export : chaque élément insuffisant, avec « Aller à ».

### Structure des titres (critère 1.3.1)
- Avertissement si une page n'a pas de H1, ou si un niveau est sauté (H2 → H4).

### Déclaration d'accessibilité
- Création en un clic d'une page « Accessibilité » en FR, NL, DE, EN : état de conformité (WCAG 2.1 AA / EN 301 549), date, méthode (auto-évaluation outillée), contenus non accessibles connus (issus de la vérification), contact pour signaler un problème, voies de recours.
- Lien automatique dans le pied de page (pages marquées « lien dans le pied de page »).

### Images responsives (performance)
- À l'import : variantes WebP 480, 960, 1600 px (selon la taille d'origine).
- Rendu : `srcset` + `sizes` calculé d'après la largeur de la colonne, `width` / `height` (pas de décalage de mise en page), `loading="lazy"` et `decoding="async"`, sauf la **première image de la page** : `loading="eager"` et `fetchpriority="high"` (meilleur LCP).

### Enregistrement léger
- Les images sont enregistrées à part dans le navigateur, une seule fois ; le projet sans images est réenregistré à chaque modification. Ancien format relu sans perte.

### Mouvement
- Transitions fluides entre les pages du site exporté (`@view-transition`), désactivées si le visiteur préfère moins de mouvement ; réglable dans le panneau Site.
- Effet d'apparition au défilement (onglet Style → Effets) en CSS pur (`animation-timeline: view()`), sans effet pour les navigateurs qui ne le gèrent pas ni pour les visiteurs qui préfèrent moins de mouvement.

### Tests automatiques d'accessibilité
- Le site exporté (accueil ordinateur et mobile, page Contact en néerlandais, déclaration d'accessibilité) est analysé par axe-core : zéro violation WCAG 2.1 A/AA.

## Livré
- **Contraste en direct** : pastille sous « Couleur du texte » et « Couleur de fond » (rapport réel, seuil, grand texte), y compris pour les boutons selon leur apparence et le fond hérité des parents ; fond en image signalé « à vérifier à l'œil ». Panneau Site : 7 paires de palette (texte, texte discret, liens, boutons, texte clair sur sombre, cartes) recalculées pendant le choix de couleur.
- **Vérification avant export** : contrastes insuffisants (élément, couleurs, rapport), niveaux de titres sautés, absence ou excès de H1.
- **Déclaration d'accessibilité** en FR/NL/DE/EN : assistant (organisation, contact, état de conformité, date, limites connues pré-remplies avec la vérification), page en `<article>`, lien « Accessibilité » dans le pied de page, hors du menu principal. Toute page peut être marquée « lien dans le pied de page ».
- **Images responsives** : variantes 480 / 960 / 1600 px à l'import (repli JPEG si le navigateur ne sait pas encoder en WebP), `srcset`, `sizes` calculé d'après la colonne (imbrications et empilement mobile/tablette compris), `width`/`height`, priorité haute pour la première image seulement, chargement différé pour les autres.
- **Enregistrement léger** : le projet sauvegardé passe de plusieurs Mo à quelques Ko (12 Ko pour le site d'exemple avec photo), les images sont écrites une seule fois à part. Anciens projets relus sans perte.
- **Mouvement** : transitions entre pages (`@view-transition`), apparition au défilement (Fondu, Montée, Zoom) en CSS pur ; tout est coupé pour les visiteurs qui préfèrent moins de mouvement.
- **axe-core** dans les tests : accueil (ordinateur et mobile), contact en néerlandais, déclaration en français et en allemand : **0 violation WCAG 2.1 A/AA**. Contre-épreuve : une copie volontairement abîmée de la page fait bien ressortir 3 violations (image sans description, contraste, lien vide).

## Remarques
- Le calcul de contraste est statique (d'après les styles). Il ne voit pas une image de fond : ces cas sont signalés pour une vérification à l'œil.
- Une exception intermittente a été observée une fois sur trois passages complets de la suite, sans se reproduire ensuite ; à surveiller.

## Tests
- Unitaires : 167 (dont 19 nouveaux : formules WCAG, couleurs semi-transparentes, contraste des éléments et boutons, titres, déclaration, srcset/sizes/priorité, variantes à l'export, enregistrement séparé, mouvement).
- Bout en bout : 23 nouveaux, 241 au total (cycles 2 à 10), 0 erreur JavaScript.
