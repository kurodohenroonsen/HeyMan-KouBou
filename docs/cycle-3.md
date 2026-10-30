# Cycle 3 — Styles responsives et styles globaux

## Livré
- Onglet Style par groupes repliables : Typographie, Fond, Espacement, Bordure, Dimensions, Disposition, Effets. Seuls les réglages utiles au type d'élément sont proposés (ex. « Largeur de colonne » pour les colonnes).
- Réglage par appareil : la barre d'appareils du haut et celle de l'onglet sont synchronisées. Valeur héritée affichée en grisé (« 80px (hérité) »), bouton ↺ pour revenir à l'héritage.
- État Survol : seules les propriétés animables (couleur, fond, bordure, ombre, transformation, opacité).
- Saisie tolérante : « 30 » devient « 30px » ; une valeur invalide (« 12pt ») est refusée, signalée en rouge, avec des exemples.
- Couleurs : pastilles de la palette (qui suivent la palette globale), transparent, sélecteur libre ou saisie hex/rgb.
- Copier / coller le style (sans écraser la largeur des colonnes).
- Panneau Site : nom, adresse, langues, palette de 6 couleurs (recoloration en direct), polices des titres et du texte (Google Fonts à l'export), taille du texte, arrondi, largeur du contenu, logo, en-tête fixe, choix de langue, pied de page traduit.
- `styleTarget` : le style d'un titre s'applique à la balise h1–h4, celui d'un bouton au lien `.btn`, celui d'une image à `img` ; marges et alignement restent sur l'enveloppe.

## Bugs trouvés par les tests et corrigés
- Taille d'un titre sans effet (le h1 a sa propre taille) → `styleTarget`.
- Groupe « Espacement » refermé par erreur : l'évènement `toggle` initial était compté comme un clic.
- Double validation (Entrée puis perte de focus sur un champ déjà remplacé) → erreur DOM. Corrigé + l'inspecteur ne peut plus se redessiner pendant qu'il se redessine. Les tests échouent désormais si un message affiché contient une erreur technique.

## Tests
- Unitaires : 59 réussis. Bout en bout : cycles 2 + 3 = 38 réussis.
