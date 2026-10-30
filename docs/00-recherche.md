# Cycle 0 — Recherche

But : un éditeur visuel « tout-en-un » dans l'esprit de Divi, Elementor ou Wix, qui produit un site statique multilingue (FR/NL/DE/EN) à déposer sur OVH, sans base de données.

## Ce que font les outils de référence

| Sujet | Divi | Elementor | GrapesJS (open source, BSD-3) | Décision pour l'Atelier |
|---|---|---|---|---|
| Structure | Section → Rangée → Colonne → Module | Conteneurs flexbox imbriqués (avant : Section → Colonne → Widget) | Arbre de composants libre | Section → Rangée → Colonne → Widget, avec une rangée imbriquée possible dans une colonne. Lisible pour un non-développeur, assez souple. |
| Réglages | Onglets Contenu / Design / Avancé | Contenu / Style / Avancé | Gestionnaire de styles + traits | Inspecteur à 3 onglets : Contenu, Style, Avancé |
| Responsive | Valeurs par appareil, héritées | Valeurs par point de rupture, héritées ordinateur → tablette → mobile | Device Manager + media queries | 3 appareils. Une valeur tablette ou mobile ne remplace que ce qui est réglé ; le reste hérite (cascade CSS max-width). |
| Survol | Onglet « survol » par réglage, transitions réglables dans Avancé | État « survol » sur les styles | États CSS | État « survol » dans l'onglet Style + durée de transition |
| Bibliothèque | Modules + mises en page | Widgets + modèles | Block Manager | Bibliothèque de widgets + modèles de sections |
| Arbre | Calques (Layers) | Navigator | Layer Manager | Navigateur : arbre cliquable, réordonnable |
| Historique | Oui | Oui | Undo Manager | Annuler/rétablir sur tout le document |
| Stockage | Base WordPress | Base WordPress | JSON + HTML/CSS | JSON du projet (navigateur + fichier), export HTML/CSS statique |

Sources : documentation Elementor sur les conteneurs et les valeurs responsives héritées ; aide Divi sur les options de survol (réglage par option, transitions dans l'onglet Avancé) ; README de GrapesJS (modules Block, Style, Layer, Asset Manager, licence BSD-3).

Pourquoi ne pas reprendre GrapesJS tel quel : c'est mature, mais l'Atelier a besoin de contrôler son propre modèle (textes en 4 langues dans chaque champ, export statique multilingue avec hreflang, future relecture signée bloc par bloc). On garde du vanilla JS sans dépendance, comme le reste de tes projets.

## Édition directe dans la page

- `document.execCommand()` est marqué obsolète et non standard par MDN ; son comportement varie selon les navigateurs. On ne bâtit pas dessus.
- On utilise `contenteditable` uniquement sur les éléments de texte d'un widget (titre, paragraphe, libellé de bouton). La mise en forme (gras, italique, souligné, lien) passe par l'API Selection/Range.
- **Le collage est forcé en texte brut**, puis tout le contenu est **assaini** à chaque modification avec une liste blanche stricte : `p br strong b em i u a ul ol li`. Seul `href` passe, après filtrage de l'adresse. C'est la règle que donnent MDN et les guides sur contenteditable : ne jamais réinjecter du HTML saisi sans l'assainir.

## Glisser-déposer à travers l'iframe

Le glisser-déposer HTML5 natif gère mal le passage de la fenêtre de l'éditeur vers une iframe (événements perdus, position fausse). Les constructeurs de pages utilisent plutôt un **glisser maison par événements pointeur** : on suit la souris dans la fenêtre principale, on convertit les coordonnées dans l'iframe, `elementFromPoint` dans le document du canevas, et un indicateur de dépôt. Ça marche à la souris, au stylet et au tactile, et Playwright peut le tester.

Condition : l'iframe du canevas est de **même origine** (srcdoc sans sandbox). C'est acceptable parce qu'elle n'affiche que notre propre rendu, assaini : aucun widget « HTML libre », aucun script saisi par l'utilisateur.

## Sécurité retenue

- Aucun HTML libre ; textes riches assainis ; adresses filtrées (`javascript:`, `data:`, `vbscript:` refusées).
- Les valeurs de style sont **typées et validées** (longueur avec unité autorisée, couleur hex/rgb ou jeton de palette, liste fermée pour les énumérations) : pas d'injection CSS possible par un champ.
- Le rendu exporté ne contient du JavaScript que pour deux comportements optionnels : la vidéo en « clic pour charger » (pas de cookie YouTube avant le clic) et le menu mobile.
