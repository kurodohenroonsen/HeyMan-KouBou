# Architecture

## Modèle de document

```
site
├─ name, baseUrl, languages[], defaultLanguage
├─ theme      palette c1…c6, polices titre/texte, taille de base, rayon, largeur du contenu
├─ header     logo, afficher le sélecteur de langues
├─ footer     texte (4 langues)
├─ assets     images importées (WebP en data URL)
└─ pages[]    id, slug, title{}, seo.description{}, root
               root : nœud « page » → sections → rangées → colonnes → widgets
```

Un nœud :

```json
{
  "id": "n_ab12cd",
  "type": "heading",
  "props": { "text": { "fr": "Bonjour", "nl": "Hallo" }, "level": "h2" },
  "style": { "desktop": { "fontSize": "48px" }, "tablet": {}, "mobile": { "fontSize": "32px" }, "hover": {} },
  "advanced": { "anchor": "intro", "hideOn": { "mobile": false } },
  "children": []
}
```

### Règles d'imbrication

| Parent | Enfants autorisés |
|---|---|
| page | section |
| section | row |
| row | column |
| column | widget, row (une seule rangée imbriquée de profondeur : pas de rangée dans une colonne déjà imbriquée) |
| widget | aucun |

Toute opération (ajout, déplacement, collage) vérifie ces règles. On refuse aussi de déplacer un nœud dans un de ses descendants.

## Styles

- Un **schéma** décrit chaque propriété : type (longueur, couleur, énumération, nombre, ombre…), unités permises, groupe d'affichage (Typographie, Fond, Espacement, Bordure, Dimensions, Disposition, Effets).
- Les valeurs sont validées à l'écriture **et** à la compilation.
- Chaque nœud reçoit une classe `n-<id>`. Le compilateur produit :
  - `.n-id{…}` pour l'ordinateur ;
  - `@media (max-width:1024px){.n-id{…}}` pour la tablette ;
  - `@media (max-width:640px){.n-id{…}}` pour le mobile ;
  - `.n-id:hover{…}` pour le survol (+ `transition`).
- L'héritage ordinateur → tablette → mobile vient de la cascade : seules les valeurs réglées sont écrites.
- Un widget peut désigner la cible de son style (ex. le bouton lui-même, pas son conteneur).
- **Styles globaux** : palette `--c1…--c6` utilisable dans tous les sélecteurs de couleur, polices, taille de base, rayon et largeur de contenu par défaut.

## Rendu

Le cœur (`core/`) est du JavaScript pur, sans DOM : le même code sert à l'aperçu du canevas, à l'export et aux tests Node.

- Pages : `/` pour la langue principale, `/nl/`, `/de/`, `/en/` ; sous-pages `/slug/`, `/nl/slug/`…
- `hreflang` réciproques + `x-default`, `canonical`, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`.
- Un texte non traduit retombe sur la langue principale.
- Masquer un nœud sur un appareil produit une règle `display:none` dans la media query correspondante.

## Éditeur

```
Barre du haut   pages · appareil (ordinateur/tablette/mobile) · langue · annuler/rétablir · enregistrer · exporter
Gauche          Widgets · Modèles · Navigateur · Pages · Site (styles globaux)
Centre          Canevas (iframe même origine) : survol, sélection, barre d'outils, glisser-déposer, édition directe
Droite          Inspecteur : Contenu · Style (appareil courant ou survol) · Avancé
```

- Toute modification passe par `commit()` : historique (annuler/rétablir), sauvegarde IndexedDB, rafraîchissement.
- Le canevas n'est pas rechargé à chaque frappe : on remplace le `<style>` et le contenu de `<main>`, on garde le défilement.
- L'appareil choisi règle à la fois la largeur du canevas et la cible des réglages de style.
