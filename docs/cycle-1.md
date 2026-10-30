# Cycle 1 — Cœur : bilan

**Livré** : `core/tree.js` (arbre et opérations pures), `core/style.js` (schéma, validation, compilation responsive + survol), `core/sanitize.js` (texte riche sans DOM), `core/widgets.js` (registre + 6 widgets de base), `core/site.js` (pages, thème, ressources, validations, traductions manquantes), `core/theme.js` (polices, CSS de base), `core/render.js` (HTML, CSS, export), `core/zip.js`, `core/escape.js`.

**Tests** : 48 tests unitaires verts (arbre 14, styles 10, assainisseur 9, rendu 8, échappement 4, zip 2, + 1 de structure).

**Décisions prises en cours de cycle**
- La couleur de fond compile en `background-color` (et non `background`) pour ne jamais effacer une image de fond réglée à côté.
- Les champs « texte court enrichi » (titres) reçoivent du HTML : l'éditeur échappe le texte brut saisi dans l'inspecteur ; la mise en forme se fait directement dans la page.
- Grille à 12 colonnes (CSS grid). L'empilement sur mobile/tablette passe par une classe de rangée et ne s'applique qu'aux colonnes sans largeur mobile/tablette explicite (`col--ms`, `col--ts`), ce qui laisse la main à l'utilisateur.
