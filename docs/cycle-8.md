# Cycle 8 — Productivité et clavier

## Spécification (écrite avant les tests)

### Barre de commandes (Ctrl+K ou ⌘K)
- Une seule zone de recherche pour : ajouter un widget ou un modèle, aller à une page, sélectionner un élément de la page (par son texte), changer d'appareil ou de langue, ouvrir un panneau, aller à un réglage de style (« taille », « marge »), et les actions (annuler, dupliquer, exporter…).
- Recherche tolérante : sans accents ni majuscules, plusieurs mots, début de mot favorisé, lettres dans l'ordre acceptées (« tmo » → « Titre mobile »).
- Flèches pour choisir, Entrée pour lancer, Échap pour fermer. Les dernières commandes reviennent en tête.

### Recherche dans les réglages
- Champ en haut de l'onglet Style : « marge », « couleur »… filtre les réglages et ouvre les groupes concernés.

### Sélection multiple
- Maj+clic (page ou Structure) ajoute ou retire un élément de la sélection.
- Avec plusieurs éléments : supprimer, dupliquer, coller le style, et **chaque réglage de style s'applique à tous**. L'inspecteur l'indique (« 3 éléments sélectionnés »).
- Un élément dont le parent est aussi sélectionné n'est traité qu'une fois (pas de double suppression ou duplication).

### Vue « tous les appareils »
- Bouton dans l'onglet Style : chaque longueur et nombre affiche trois champs côte à côte (ordinateur, tablette, mobile), modifiables sans changer d'appareil.

### Clavier
- ↑ / ↓ : élément précédent / suivant ; ← : parent ; → : premier enfant (quand on n'écrit pas).
- Ctrl+X : couper (puis Ctrl+V pour coller ailleurs) : déplacer un élément sans souris.
- Structure : flèches pour parcourir l'arbre, Entrée pour sélectionner.
- `?` : aide des raccourcis.

## Livré
- **Barre de commandes Ctrl+K** : 18 widgets, 13 modèles, pages, tous les éléments de la page (cherchés par leur texte), appareils, langues, panneaux, 40 réglages de style, actions (dupliquer, exporter, vérifier, textes à traduire, nouvelle page…). Recherche sans accents, plusieurs mots, lettres dans l'ordre. Les dernières commandes reviennent en tête (mémorisées dans ce navigateur).
- **Recherche dans les réglages** (onglet Style) : filtre en direct et ouvre les groupes concernés.
- **Sélection multiple** : Maj+clic dans la page ou la Structure ; cadres bleus numérotés ; inspecteur « N éléments sélectionnés » ; réglages, coller le style, dupliquer, supprimer sur tous, en une seule étape d'annulation.
- **Vue tous appareils** (bouton 🖥▭▯) : trois champs côte à côte pour chaque longueur ou nombre.
- **Clavier** : ↑ ↓ ← → pour parcourir la page ; Ctrl+X puis Ctrl+V pour déplacer sans souris ; Structure entièrement navigable (flèches, Début/Fin, Entrée, ← / → pour replier/déplier) ; Ctrl+D fonctionne même depuis un champ de l'inspecteur ; `?` affiche l'aide.

## Corrigé
- Ctrl+D ne faisait rien quand le focus était dans un champ de l'inspecteur.
- Maj+clic surlignait aussi du texte dans la page.
- Recherche « tit » : les nombreux éléments de la page passaient devant « Ajouter : Titre » (poids réduit pour les éléments).

## Tests
- Unitaires : 127 (dont 11 nouveaux : recherche tolérante, classement, sélection multiple, navigation).
- Bout en bout : 34 nouveaux, 188 au total (cycles 2 à 8), 0 erreur JavaScript.
