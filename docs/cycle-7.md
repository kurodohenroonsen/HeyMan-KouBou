# Cycle 7 — Système de design

## Spécification (écrite avant les tests)

### Échelles fluides (méthode Utopia)
- `site.tokens.type = { minSize, maxSize, minRatio, maxRatio, minVw: 390, maxVw: 1280 }` → 7 tailles `sm, base, lg, xl, 2xl, 3xl, 4xl` (pas −1 à 5), chacune `clamp(min, a + b vw, max)`.
- `site.tokens.space = { minSize, maxSize }` → 9 espacements `3xs … 3xl` (×0,25 à ×6).
- CSS : variables `--step-xl`, `--space-m` sur `:root`. Les titres H1–H4 et le texte utilisent l'échelle : un site s'adapte à l'écran sans réglage par appareil.
- Dans l'onglet Style : `size:xl` pour la taille du texte, `space:m` pour marges, marges intérieures, espace entre éléments, arrondi, largeur.

### Valeurs avancées
- Les champs de longueur acceptent `clamp()`, `min()`, `max()`, `calc()` avec nombres, unités (px rem em % vh vw ch cqi), opérateurs et `var(--step-*)` / `var(--space-*)` uniquement. Tout autre caractère est refusé (pas d'injection dans la CSS).

### Presets (styles nommés et liés)
- `site.presets[id] = { id, name, type, style }`, `site.defaultPresets[type] = id`.
- Un élément porte `preset` : un identifiant, `'-'` (aucun, même s'il existe un preset par défaut) ou rien (preset par défaut du type s'il existe).
- CSS : `.p-<id>` émis avant les styles d'élément ; **un réglage fait sur l'élément l'emporte toujours sur le preset**.
- Opérations : créer depuis un élément (son style passe dans le preset), appliquer, détacher (le style du preset est recopié sur l'élément), modifier le style du preset, renommer, dupliquer, supprimer (les éléments liés sont détachés proprement), preset par défaut d'un type.

### Couleurs
- Palette de 6 couleurs nommées + jusqu'à 6 couleurs supplémentaires (`c7`–`c12`), noms modifiables.
- « Couleurs utilisées hors palette » : liste des couleurs figées (hex/rgb) utilisées dans les éléments et presets, avec remplacement en un clic par une couleur de la palette.

### CSS personnalisée (experts)
- Onglet Avancé : déclarations CSS pour l'élément (`propriété: valeur;`). Refusé : `<`, `{`, `}`, `@`, `\`, commentaires, `url(`, `expression`, `javascript:`. 600 caractères maximum.

## Livré
- **Échelles fluides** dans le panneau Site : taille du texte et contraste entre tailles, pour le mobile et le grand écran, avec aperçu des 7 tailles ; échelle d'espacements avec aperçu. Les titres H1–H4 et le texte utilisent l'échelle : sans aucun réglage, un H2 fait 33 px sur mobile et 44 px sur grand écran.
- **Onglet Style** : à côté de « Taille », une liste « Échelle… » (Titre 1 · 40–55 px…) ; sous chaque marge, une liste d'espacements. Les expressions `clamp()`, `min()`, `max()`, `calc()` sont acceptées si elles sont sûres.
- **Presets** : « + Preset » enregistre le style de l'élément sous un nom ; la liste applique un preset ; « Modifier le preset » (bandeau bleu explicite : « N éléments suivront ces réglages ») ; « Détacher » ; « Par défaut pour les Boutons ». Gestion dans le panneau Site : renommer, dupliquer, supprimer (les éléments gardent leur apparence).
- **Palette** : noms modifiables, jusqu'à 12 couleurs ; liste des **couleurs hors palette** avec remplacement en un clic sur tout le site (éléments et presets, tous appareils).
- **CSS personnalisée** par élément (onglet Avancé), filtrée.
- Les anciens projets sont complétés automatiquement à l'ouverture (`normalizeSite`).
- Contrôle avant export : une couleur supprimée de la palette mais encore utilisée est signalée.

## Bugs trouvés et corrigés
- Un « null » s'affichait dans le panneau Site quand aucune couleur hors palette n'existait.
- Libellés d'échelle décalés par rapport aux titres réels (H3 utilise « xl », H4 « lg »).
- Accord : « 1 élément suivra ».

## Tests
- Unitaires : 117 (dont 24 nouveaux : formule fluide, jetons, expressions refusées, presets, couleurs, CSS personnalisée, migration).
- Bout en bout : 27 nouveaux (cycle 7), 154 au total, 0 erreur JavaScript.
