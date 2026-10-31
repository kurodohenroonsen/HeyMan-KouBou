# Composants tiers embarqués

Atelier n'a aucune dépendance d'exécution (`core/` et `editor/` n'importent rien de `node_modules`). Seuls des fichiers de polices sont livrés avec l'éditeur et copiés dans le site publié.

## Polices (cycle 29)

Fichiers woff2 récupérés depuis npm (paquets [Fontsource](https://fontsource.org), qui redistribuent les polices de Google Fonts), rangés dans `fonts/<famille>/` avec leur `LICENSE`, décrits dans `core/fonts.js` (fichier, sous-ensemble, graisse, style, empreinte, taille ; vérifié par `tests/fonts.test.js`). Sous-ensembles latin et latin-ext seulement ; le japonais utilise les polices du système.

Toutes sont sous **SIL Open Font License 1.1** (OFL) : usage, intégration dans un site et redistribution libres, y compris commerciales ; la licence doit accompagner les fichiers (elle est dans chaque dossier) ; les polices ne peuvent pas être vendues seules ; une version modifiée ne peut pas garder un « nom de police réservé » (cas de Lora). Atelier ne les modifie pas.

| Famille | Paquet npm | Fichiers | Poids |
|---|---|---|---|
| Archivo | `@fontsource/archivo@5.3.0` | 400 et 700, droit et italique | 112 Ko |
| DM Sans | `@fontsource/dm-sans@5.3.0` | 400 et 700, droit et italique | 88 Ko |
| Public Sans | `@fontsource-variable/public-sans@5.3.0` | variable 100–900, droit et italique | 91 Ko |
| Source Serif 4 | `@fontsource/source-serif-4@5.3.1` | 400 et 700, droit et italique | 154 Ko |
| Fraunces | `@fontsource-variable/fraunces@5.3.0` | variable 100–900, droit et italique | 153 Ko |
| Lora | `@fontsource-variable/lora@5.3.0` | variable 400–700, droit et italique | 117 Ko |
| Oswald | `@fontsource/oswald@5.3.0` | 400 et 700, droit (pas d'italique) | 47 Ko |

Total : 762 Ko (779 836 octets). Pour chaque famille, la version la plus légère a été retenue entre le paquet statique (400 + 700) et le paquet variable. Un site n'embarque que les familles qu'il utilise (titres et texte).

Mettre à jour une police : `npm pack @fontsource/<nom>` dans un dossier temporaire, copier les `files/<nom>-latin(-ext)-…woff2` et `LICENSE`, puis recalculer empreintes et tailles dans `core/fonts.js` (le test indique les valeurs attendues).

Les polices personnalisées importées par l'utilisateur (`.woff2`) restent sous la licence choisie par leur auteur : c'est à l'utilisateur de vérifier qu'elle autorise l'usage sur le web.
