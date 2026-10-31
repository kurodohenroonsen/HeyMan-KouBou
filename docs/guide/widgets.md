# Tous les widgets

Un **widget**, c'est une brique de page : un titre, un texte, une image, un bouton, une carte… Tu les poses dans des **colonnes**, elles-mêmes rangées dans des **rangées**, elles-mêmes dans des **sections**. Ce chapitre présente chaque brique, une par une : à quoi elle sert, quand la choisir, chacun de ses réglages, et ce qu'elle donne sur le site publié, sur un téléphone et en plusieurs langues.

Les exemples viennent du site touristique de Kumakōgen construit dans [la prise en main](prise-en-main.md).

---

## Avant de commencer : ce qui vaut pour tous les widgets

### Ajouter un widget

- Panneau de gauche, onglet **Widgets** : clique sur un widget. Il se place juste **après l'élément sélectionné** (sinon à la fin de la page).
- Ou **glisse-le** dans la page : une ligne bleue montre où il va tomber. Échap annule.
- Ou **Ctrl+K** puis « Ajouter : … » (par exemple « Ajouter : Galerie »).
- Le champ **Chercher un widget…** filtre la liste.

Dans la bibliothèque, les widgets sont rangés par familles : **Texte**, **Base**, **Média**, **Contenu**, **Contenus** (collections), **Interaction**, **Contact** et **Site**. Tout en haut, la famille **Structure** ajoute une section déjà découpée en colonnes : « 1 colonne », « 2 colonnes », « 3 colonnes », « 4 colonnes », « 2/3 + 1/3 », « 1/3 + 2/3 ».

### Régler un widget : l'inspecteur

Clique sur le widget dans la page : ses réglages s'affichent à droite, dans l'**inspecteur**. En haut, le **chemin** (par exemple « Section › Rangée › Colonne › Titre ») : clique sur un niveau pour le sélectionner. Juste dessous, cinq boutons : **↰** (sélectionner le parent), **🖌** (copier le style), **📋** (coller le style), **⧉** (dupliquer), **✕** (supprimer).

Trois onglets :

- **Contenu** : ce que dit le widget (textes, liens, images, listes). C'est l'onglet décrit widget par widget plus bas.
- **Style** : son apparence (voir ci-dessous).
- **Avancé** : réglages pour aller plus loin (voir ci-dessous).

Dans la page, le widget sélectionné porte une petite barre : **↰** (parent), **✥** (poignée pour le déplacer en glissant), **⧉** (dupliquer), **✕** (supprimer). Un **double-clic** sur un texte permet de l'écrire directement dans la page.

### Les textes en plusieurs langues

Un réglage de texte qui se traduit affiche **une ligne par langue du site** (par exemple JA, EN, FR). La langue principale se remplit en premier ; une ligne qui manque est teintée et montre « À traduire : … » avec le texte d'origine. Sur le site publié, un texte non traduit s'affiche dans la langue principale.

Quelques réglages **ne se traduisent pas** : ils sont les mêmes dans toutes les langues (une adresse e-mail, un prix, un chiffre, une adresse postale, un nom d'auteur). Ils n'ont qu'une seule ligne. C'est indiqué pour chaque widget.

Pour tout traduire au même endroit : bouton **Traductions** (icône 文A) en haut (voir le chapitre [5](05-langues-traductions.md)).

### Les liens

Un réglage « Lien » accepte une adresse tapée à la main : `https://…` (un autre site), `mailto:…` (un e-mail), `tel:…` (un téléphone) ou `#ancre` (un endroit de la page). La liste **Lier à une page ou une section…** propose les pages du site et les ancres de la page ouverte : choisis plutôt dans cette liste, le lien suivra si l'adresse de la page change.

### Les images

Un réglage « Image » propose **Importer une image** (un fichier de ton ordinateur : JPG, PNG, WebP, GIF, AVIF) ou l'adresse d'une image en ligne (`https://…`). **Remplacer** change l'image, **Retirer** la vide. Atelier convertit l'image importée au format WebP, la réduit si elle est très grande et prépare des versions plus légères pour les téléphones (voir [4.13](04-pages-images-contenus.md)).

### L'onglet Style

L'onglet **Style** règle l'apparence. Les réglages sont rangés en sept groupes ; seuls ceux qui ont un sens pour l'élément s'affichent.

| Groupe | Réglages |
|---|---|
| **Typographie** | Police, Taille, Graisse (épaisseur des lettres), Interligne, Espacement des lettres, Alignement, Casse (majuscules…), Style (italique), Couleur du texte |
| **Fond** | Couleur de fond, Image de fond, Taille de l'image (couvrir, contenir, taille réelle), Position de l'image |
| **Espacement** | Marges extérieures (haut, droite, bas, gauche) et marges intérieures (l'espace entre le bord et le contenu) |
| **Bordure** | Épaisseur, Type (pleine, tirets, pointillés), Couleur, Arrondi, Ombre |
| **Dimensions** | Largeur, Largeur maximale, Hauteur minimale |
| **Disposition** | Espace entre les éléments, alignements, répartition, largeur de colonne (voir Section, Rangée, Colonne) |
| **Effets** | Opacité, Transformation au survol (soulever, agrandir, réduire), Durée de transition, Apparition au défilement (fondu, glissé vers le haut, zoom) |

Ce qu'il faut savoir :
- **Par appareil** : les boutons **Ordinateur**, **Tablette**, **Mobile** de l'onglet (ou icônes ordinateur, tablette, mobile en haut de l'écran) choisissent l'appareil réglé. Un réglage fait sur ordinateur vaut aussi pour la tablette et le mobile, sauf si tu le changes pour eux. Le bouton **bouton aux trois écrans** montre les trois appareils côte à côte.
- **Survol** : réglages appliqués quand la souris passe dessus (couleurs, bordure, ombre, transformation, opacité). **Normal** pour revenir.
- **Valeurs** : tape `24px`, `1.5rem`, `50%` ou `auto` (un nombre seul devient des pixels), ou choisis dans l'**échelle du site** (« Échelle… » pour les tailles de texte, « ⇕ » pour les espacements) : tout le site reste harmonieux. **↺** revient à la valeur héritée.
- **Couleurs** : les pastilles sont les couleurs de la **palette du site** (panneau **Site**). Choisis-les plutôt qu'une couleur libre : si tu changes la palette, tout suit. Sous la couleur du texte et du fond, une pastille indique le **contraste** (lisibilité) : verte ✓ ou rouge ✗.
- **Chercher un réglage** filtre la liste (« marge », « couleur »…).
- **Copier** / **Coller** : donne à un élément le style d'un autre.
- **Presets** : un style enregistré sous un nom (« Bouton principal ») et réutilisable. Liste des presets, **+ Preset**, **Modifier le preset**, **Détacher**, « Par défaut pour les … » (voir [3.7](03-style-design.md)).
- L'**apparition au défilement** ne se joue que dans les navigateurs qui la savent faire, et jamais chez un visiteur qui a demandé moins d'animations à son appareil.

### L'onglet Avancé

| Réglage | À quoi il sert |
|---|---|
| **Ancre (pour un lien #ancre)** | Un nom court (`acces`) : un bouton ou un menu peut alors mener directement à cet endroit avec `#acces`. |
| **Classes CSS** | Pour les personnes qui écrivent du CSS : un nom de classe ajouté à l'élément. |
| **Libellé accessible** | Un nom lu par les lecteurs d'écran pour cette zone, dans la langue affichée (par exemple « Accès en voiture »). |
| **Réutiliser** | **Créer un composant à partir de ce bloc** : le bloc devient réutilisable sur toutes les pages et se modifie une fois pour toutes ([3.11](03-style-design.md)). |
| **Masquer sur** | Ordinateur, Tablette, Mobile : cache l'élément sur cet appareil. Dans l'éditeur, il reste visible en transparence pour pouvoir le sélectionner. |
| **Masquer dans la langue** | Cache l'élément dans une langue (pas dans la langue principale) : utile pour une information qui ne concerne qu'une partie du public. |
| **CSS personnalisée (experts)** | Des déclarations `propriété: valeur;` appliquées à l'élément. Les accolades, `@` et `url()` sont refusés. |

---

## Section

**À quoi elle sert** : une grande bande horizontale de la page (l'accueil, une présentation, une galerie…). Chaque page est une suite de sections. Une section contient une ou plusieurs rangées.

**Quand l'utiliser** : pour chaque nouveau « chapitre » de la page. Ajoute-la avec une structure de la famille **Structure** (« 2 colonnes »…) ou un modèle tout prêt (panneau **Modèles**).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Largeur du contenu** | **Centrée** : le contenu garde la largeur du site (réglée dans le panneau **Site**) et la section reste centrée. **Large** : le contenu s'étend davantage. **Pleine largeur** : le contenu va d'un bord de l'écran à l'autre. Le fond de la section, lui, occupe toujours toute la largeur. |
| **Balise (sens pour Google et les lecteurs d'écran)** | Dit ce qu'est la section : **section** (une partie de la page, le choix habituel), **div** (sans signification), **article** (un contenu qui se lit seul), **aside** (un contenu annexe), **nav** (une navigation), **header** (un en-tête), **footer** (un pied). |

**Style utile** : Couleur de fond, Image de fond (avec Taille « Couvrir » pour une grande photo), marges intérieures haut et bas pour aérer.

**Sur le site publié** : une bande pleine largeur ; son fond va jusqu'aux bords de l'écran.

**Sur mobile** : la section reste une bande ; ce sont les rangées à l'intérieur qui empilent leurs colonnes.

**En plusieurs langues** : rien à traduire ; ses widgets se traduisent.

**Accessibilité** : choisis la bonne **Balise** ; pour une section importante, donne-lui un **Libellé accessible** (onglet Avancé).

**Astuce** : sur un fond en image, vérifie que le texte reste lisible (la pastille de contraste te le rappelle).

---

## Rangée

**À quoi elle sert** : une ligne de colonnes à l'intérieur d'une section (par exemple deux colonnes côte à côte : un texte et une image).

**Quand l'utiliser** : elle est créée avec la section ; ajoute une deuxième rangée quand une section a besoin de deux lignes différentes (un titre centré, puis trois encadrés).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Disposition des colonnes** | Des boutons dessinés : 1 colonne, 2 colonnes égales, 3 colonnes, 4 colonnes, 2/3 + 1/3, 1/3 + 2/3, 1/4 + 3/4, 3/4 + 1/4, 1/4 + 1/2 + 1/4. Un clic redécoupe la rangée. |
| **Empiler les colonnes** | **Sur mobile** (le choix habituel : les colonnes passent l'une sous l'autre sur un téléphone), **Sur tablette et mobile**, ou **Jamais** (elles restent côte à côte, même sur un petit écran). |

**Style utile** : Disposition → **Espace entre les éléments** (l'écart entre les colonnes) et **Alignement vertical du contenu** (aligner les colonnes en haut, au centre ou en bas).

**Sur mobile** : selon « Empiler les colonnes ». Garde « Sur mobile », sauf pour des éléments très petits (un logo et un bouton côte à côte).

**Astuce** : vérifie toujours le résultat avec le bouton **Mobile** en haut de l'écran.

---

## Colonne

**À quoi elle sert** : la case où l'on pose les widgets. Les widgets d'une colonne se placent l'un sous l'autre.

**Réglages** : pas d'onglet Contenu. La **largeur** de la colonne se règle dans l'onglet **Style**, groupe **Disposition** : **Largeur de colonne (sur 12)**. La rangée est découpée en 12 parts : 6 = la moitié, 4 = un tiers, 12 = toute la largeur. Ce réglage peut changer **par appareil** (par exemple 6 sur ordinateur, 12 sur mobile).

**Style utile** : **Espace entre les éléments** (l'écart entre les widgets de la colonne), **Répartition** (début, centre, fin, réparti), **Alignement vertical** (placer cette colonne en haut, au centre ou en bas de la rangée), un fond et un arrondi pour en faire un encadré.

**Astuce** : pour centrer un bouton dans une colonne, sélectionne le bouton, onglet Style → Disposition → **Alignement vertical** : « Centre ».

---

## Titre

Famille **Texte**.

**À quoi il sert** : un titre de page ou de section (« 久万高原町へようこそ », « Découvrir Kumakōgen »).

**Quand l'utiliser** : en tête de chaque section. Un seul **H1** par page : le titre principal. Les sections ont des H2, leurs sous-parties des H3.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Texte** (se traduit) | Le texte du titre. Double-clic dans la page pour l'écrire directement, avec gras, italique ou lien. |
| **Niveau** | **H1 – titre de page**, H2, H3, H4, ou **Paragraphe** (un texte qui ressemble à un titre sans en être un, par exemple un petit surtitre). |
| **Lien (facultatif)** | Tout le titre devient un lien. |

**Sur le site publié** : un vrai titre, que Google et les lecteurs d'écran utilisent pour comprendre la page. La taille suit l'échelle de texte du site.

**Sur mobile** : la taille se réduit en douceur toute seule (échelle du site) ; tu peux la régler pour le mobile dans l'onglet Style.

**Accessibilité** : ne saute pas de niveau (H2 puis H4) ; ne choisis pas un niveau pour sa taille, règle plutôt la taille dans l'onglet Style.

**Astuce** : la fenêtre **SEO** (icône loupe) vérifie qu'il y a un seul H1 par page.

---

## Texte

Famille **Texte**.

**À quoi il sert** : un ou plusieurs paragraphes, avec gras, italique, souligné, liens et listes.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Texte** (se traduit) | Le texte mis en forme. Dans l'inspecteur, une petite barre : **G** (gras), **I** (italique), **S** (souligné), **🔗** (lien), et un bouton pour retirer la mise en forme. |

Le plus simple est d'écrire **dans la page** : double-clic sur le texte, puis la barre **B I U 🔗 ⌫ ✨** au-dessus. Un texte collé depuis ailleurs perd sa mise en forme (le site reste propre). **IA locale** (icône étincelle) propose de reformuler ou de corriger avec l'IA locale (si elle est installée, [chapitre 7](07-ia-locale.md)).

**Sur mobile** : le texte se replie à la largeur de l'écran.

**En plusieurs langues** : une zone par langue dans l'inspecteur ; dans la page, tu écris dans la langue choisie en haut de l'écran.

**Accessibilité** : un lien doit dire où il mène (« Horaires du musée » plutôt que « cliquez ici ») : la fenêtre **SEO** (icône loupe) signale les liens vagues, y compris en japonais (« こちら »).

**Astuce** : garde des paragraphes courts ; pour une liste avec des pictogrammes, préfère la **Liste à icônes**.

---

## Liste à icônes

Famille **Texte**.

**À quoi elle sert** : une liste courte où chaque ligne commence par un petit pictogramme (une coche, un lieu, une horloge…).

**Quand l'utiliser** : points forts, informations pratiques (adresse, téléphone, horaires), ce qu'il faut emporter.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Éléments** | La liste des lignes. **+ Élément** en ajoute une ; sur chaque ligne : ↑ ↓ pour l'ordre, ✕ pour la supprimer. |
| → **Icône** | Le pictogramme de la ligne : Coche, Flèche, Étoile, Point, Cœur, Téléphone, E-mail, Lieu, Horloge, Personnes, Bouclier, Éclair, Caméra, Calendrier, Étiquette, Monde. |
| → **Texte** (se traduit) | Le texte de la ligne (gras, italique ou lien possibles en l'écrivant dans la page). |
| **Taille des icônes** | Petite, Moyenne, Grande. |

**Sur le site publié** : une liste ; les icônes prennent la couleur principale du site.

**Accessibilité** : les icônes sont décoratives (ignorées par les lecteurs d'écran) : le texte doit se suffire à lui-même.

**Astuce** : pour un téléphone, écris le texte en lien `tel:…` : sur un smartphone, un toucher lance l'appel.

---

## Bouton

Famille **Base**.

**À quoi il sert** : inviter à une action (« Voir l'agenda », « Comment venir »).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Texte du bouton** (se traduit) | Ce qui est écrit sur le bouton. |
| **Lien** | Où il mène : une page du site, une ancre, une adresse, ou **Ouvrir en fenêtre (popup)** : un de tes composants s'ouvre alors dans une fenêtre par-dessus la page (cette option n'apparaît que si le site a des composants). |
| **Apparence** | **Plein** (le plus visible), **Secondaire**, **Contour**, **Lien simple**. |
| **Taille** | Petit, Moyen, Grand. |
| **Ouvrir dans un nouvel onglet** | Pour un lien vers un autre site. |

**Sur le site publié** : un lien en forme de bouton (ou un vrai bouton qui ouvre la fenêtre, pour un popup ; la fenêtre se ferme par sa croix ou Échap).

**Sur mobile** : le bouton reste assez grand pour un doigt.

**Accessibilité** : un texte qui dit l'action ; évite « Cliquez ici ».

**Astuce** : un seul bouton **Plein** par section ; les autres en **Contour** ou **Lien simple**. La vérification avant export signale un bouton sans lien.

---

## Espace

Famille **Base**.

**À quoi il sert** : ajouter du vide entre deux widgets.

**Réglages** : **Hauteur** : 16, 32, 64, 96 ou 128 px.

**Accessibilité** : ignoré par les lecteurs d'écran.

**Astuce** : pour aérer toute une section, préfère les marges intérieures de la section (onglet Style) ; garde l'Espace pour un écart ponctuel. Avec **Masquer sur → Mobile** (onglet Avancé), l'espace disparaît sur téléphone.

---

## Séparateur

Famille **Base**.

**À quoi il sert** : un trait horizontal qui sépare deux parties.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Trait** | Plein, Tirets, Pointillés. |
| **Épaisseur** | 1, 2 ou 4 px. |
| **Longueur** | 25 %, 50 % ou 100 % de la largeur. |

**Sur le site publié** : une vraie ligne de séparation (comprise par les lecteurs d'écran).

**Astuce** : le trait prend la **couleur du texte** : change-la dans l'onglet Style → Typographie → Couleur du texte.

---

## Image

Famille **Média**.

**À quoi elle sert** : une photo ou une illustration.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Image** | **Importer une image**, **Remplacer**, **Retirer**, ou l'adresse d'une image en ligne. |
| **Description (pour les lecteurs d'écran et Google)** (se traduit) | Ce que montre l'image, en une phrase. Le bouton **✨ Décrire l'image** demande une proposition à l'IA locale (marquée « à relire »). Laisse vide pour une image purement décorative. |
| **Légende** (se traduit) | Un texte affiché sous l'image (par exemple d'où vient la photo). |
| **Format** | **Original**, 16:9, 4:3, **Carré**, **Portrait** : l'image est recadrée à ce format. |
| **Lien (facultatif)** | L'image devient cliquable. |

**Sur le site publié** : l'image en WebP, avec des versions plus légères que le navigateur choisit selon la taille de l'écran ; la première image de la page se charge en priorité, les suivantes au fil du défilement. Une image non choisie n'affiche **rien** (et la vérification avant export te le signale).

**Sur mobile** : l'image prend la largeur de sa colonne ; le téléphone télécharge une version plus légère.

**Accessibilité** : la description est indispensable pour une image qui informe. La fenêtre **SEO** (icône loupe) peut décrire d'un coup toutes les images sans description d'une page.

**Astuce** : dans la prise en main, les images sont de simples illustrations : **remplace-les par tes propres photos**.

---

## Galerie

Famille **Média**.

**À quoi elle sert** : plusieurs images en grille, agrandies au clic.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Images** | La liste des images ; **+ Image** en ajoute une. Pour chacune : **Image**, **Description** (se traduit), **Légende** (se traduit). |
| **Colonnes (ordinateur)** | 2, 3 ou 4 images par ligne. |
| **Format** | Carré, 4:3, 16:9 ou Original : toutes les vignettes au même format. |
| **Agrandir au clic** | Un clic ouvre l'image en grand sur fond sombre ; un clic ou Échap la referme. |

**Sur mobile** : deux images par ligne.

**Accessibilité** : une description pour chaque image ; l'agrandissement se ferme au clavier (Échap) et rend la main à la vignette.

**Astuce** : une case sans image n'apparaît pas sur le site publié : tu peux préparer la galerie avant d'avoir toutes les photos.

---

## Vidéo

Famille **Média**.

**À quoi elle sert** : montrer une vidéo YouTube ou Vimeo.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Adresse YouTube ou Vimeo** | Colle l'adresse de la vidéo (celle de la barre d'adresse ou du bouton « Partager »). |
| **Titre (lu par les lecteurs d'écran)** (se traduit) | Le nom de la vidéo, affiché aussi sur l'image d'attente. |
| **Image d'aperçu (facultatif)** | L'image montrée avant la lecture. |
| **Format** | 16:9, 4:3, Carré, **Vertical 9:16** (pour une vidéo de téléphone). |

**Sur le site publié** : le visiteur voit d'abord une image avec un bouton ▶ et la phrase « La vidéo se charge depuis YouTube quand vous cliquez. » **Rien n'est chargé chez YouTube ou Vimeo avant ce clic** : pas de pisteur à l'ouverture de la page. YouTube est appelé en mode « sans cookie ».

**En plusieurs langues** : la phrase d'attente et le bouton sont écrits dans la langue de la page (« 動画を再生 » en japonais).

**Astuce** : si l'adresse n'est pas reconnue, le canevas l'indique et la vérification avant export le signale.

---

## Carte géographique

Famille **Contact** (icône ⌖ dans la bibliothèque ; à ne pas confondre avec la [carte de contenu](#carte-de-contenu)).

**À quoi elle sert** : situer un lieu (un office de tourisme, un départ de randonnée).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Adresse** | L'adresse cherchée sur la carte (la même dans toutes les langues). |
| **Zoom (3 à 20)** | 3 : tout un pays ; 15 : un quartier ; 20 : une rue. |
| **Hauteur** | 240, 320, 400 ou 480 px. |

**Sur le site publié** : un cadre avec l'adresse et « Afficher la carte (Google Maps) ». **Google Maps n'est chargé qu'au clic** du visiteur. Un lien **OpenStreetMap** ouvre la même adresse dans un nouvel onglet.

**En plusieurs langues** : l'adresse ne se traduit pas ; les boutons s'affichent dans la langue de la page (« 地図を表示（Google マップ） »).

**Astuce** : écris l'adresse comme Google Maps la comprend (tu peux la vérifier d'abord sur Google Maps).

---

## Réseaux sociaux

Famille **Contact**.

**À quoi il sert** : des liens vers les comptes officiels (Facebook, Instagram…).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Liens** | **+ Lien** pour chaque compte. Pour chacun : **Réseau** (Facebook, Instagram, X, LinkedIn, YouTube, TikTok, Mastodon, Bluesky, E-mail, Site web) et **Adresse**. Pour « E-mail », une simple adresse suffit. |
| **Apparence** | **Pastilles** ou **Liens texte**. |
| **Alignement** | Gauche, Centre, Droite. |

**Sur le site publié** : les liens vers d'autres sites s'ouvrent dans un nouvel onglet. Une ligne sans adresse n'apparaît pas.

**Accessibilité** : chaque lien porte le nom du réseau.

**Astuce** : la fenêtre **SEO** (icône loupe) rappelle que Google associe les réseaux sociaux au site quand ce widget est présent. Mets-le dans le pied de page : il sera sur toutes les pages.

---

## Formulaire

Famille **Contact**.

**À quoi il sert** : laisser un visiteur écrire (une question, une demande).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Adresse qui reçoit les messages** | L'e-mail qui reçoit les messages. Il n'est **jamais écrit en clair** dans la page. |
| **Ou adresse d'envoi (service de formulaire, https://…)** | Si tu utilises un service de formulaires en ligne : son adresse. Elle passe avant l'e-mail. |
| **Objet du message** (se traduit) | L'objet de l'e-mail reçu. |
| **Champs** | La liste des cases à remplir ; **+ Champ** en ajoute une. Pour chacune : **Libellé** (se traduit), **Type** (Texte court, E-mail, Téléphone, Texte long), **Obligatoire**. |
| **Texte du bouton** (se traduit) | Par exemple « Envoyer ». |
| **Mention vie privée (facultatif)** (se traduit) | Une phrase sous le formulaire. |

**Sur le site publié**, selon la publication :
- publié chez OVH avec **publish.php** : le message part vers ton e-mail par ton hébergement, sans que l'adresse apparaisse ([chapitre 9](09-site-publie.md)) ;
- avec un service de formulaire : le message part vers ce service ;
- sinon : le logiciel de courrier du visiteur s'ouvre, message prêt.

Un piège invisible arrête les robots qui remplissent tous les champs. Le message de confirmation s'affiche dans la langue de la page.

**Accessibilité** : chaque case a son libellé ; les cases obligatoires sont marquées d'une étoile et vérifiées par le navigateur ; le message de résultat est annoncé aux lecteurs d'écran.

**Astuce** : sans adresse de réception, le canevas affiche « ⚠ Indiquez l'adresse qui reçoit les messages dans l'inspecteur » et la vérification avant export le signale.

---

## Encadré icône

Famille **Contenu**.

**À quoi il sert** : un pictogramme, un petit titre et deux phrases (un avantage, une activité).

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Icône** | Un des 16 pictogrammes (voir Liste à icônes). |
| **Titre** (se traduit) | Le titre de l'encadré. |
| **Texte** (se traduit) | Une ou deux phrases. |
| **Disposition** | **Icône au-dessus**, **Icône à gauche**, **Centré**. |
| **Lien (facultatif)** | Le titre devient un lien. |

**Quand l'utiliser** : par trois dans une rangée « 3 colonnes » (le modèle **Avantages** le fait pour toi).

**Accessibilité** : le titre est un H3 ; l'icône est décorative.

---

## Citation

Famille **Contenu**.

**À quoi elle sert** : une phrase marquante ou un témoignage, avec son auteur.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Citation** (se traduit) | La phrase citée. |
| **Auteur** | Le nom (le même dans toutes les langues). |
| **Fonction ou média** (se traduit) | Qui est cette personne. |
| **Photo (facultatif)** | Un petit portrait rond. |
| **Apparence** | **Trait** (un trait de couleur à gauche), **Carte** (un encadré), **Grande citation** (en grand, avec un guillemet). |

**Accessibilité** : c'est une vraie citation pour les lecteurs d'écran ; la photo est décorative (le nom est écrit à côté).

**Astuce** : ne cite que des paroles réelles, avec l'accord de la personne.

---

## Chiffres clés

Famille **Contenu**.

**À quoi il sert** : quelques chiffres en grand, avec leur légende.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Chiffres** | **+ Chiffre** pour chacun. **Valeur** (par exemple `120`, `35 %` : la même dans toutes les langues) et **Légende** (se traduit). |
| **Alignement** | Centré, À gauche. |

**Sur mobile** : les chiffres se placent côte à côte tant qu'il y a la place, sinon l'un sous l'autre.

**Astuce** : chaque chiffre doit avoir une source sûre ; dans la prise en main, ils viennent des données vérifiées.

---

## Carte de contenu

Famille **Contenu** (icône ▤ dans la bibliothèque ; à ne pas confondre avec la [carte géographique](#carte-géographique)).

**À quoi elle sert** : une vignette avec image, titre, texte et lien « Lire la suite → ».

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Image** | L'image du haut (recadrée en paysage). |
| **Description de l'image** (se traduit) | Pour les lecteurs d'écran. |
| **Titre** (se traduit) | Le titre de la carte. |
| **Texte** (se traduit) | Un court texte. |
| **Texte du lien** (se traduit) | Par exemple « En savoir plus ». |
| **Lien** | Où mène la carte. Sans texte du lien ou sans lien, la ligne « → » n'apparaît pas. |

**Quand l'utiliser** : trois cartes côte à côte pour présenter des lieux ou des pages. Pour une **liste qui se met à jour toute seule** (des événements), préfère la **Liste de contenus**.

**Sur mobile** : les cartes s'empilent, une par ligne (si la rangée empile ses colonnes sur mobile).

---

## Tarif

Famille **Contenu**.

**À quoi il sert** : une formule avec son prix et ce qu'elle comprend.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Formule** (se traduit) | Le nom de la formule. |
| **Prix (ex. 49 €)** | Le prix (le même dans toutes les langues : écris la devise, par exemple `¥500`). |
| **Période (ex. par mois)** (se traduit) | Par exemple « par personne ». |
| **Ce qui est inclus (liste à puces)** (se traduit) | Une liste ; chaque ligne reçoit une coche. |
| **Texte du bouton** (se traduit) et **Lien du bouton** | L'action proposée. |
| **Mettre en avant** | Bordure de couleur et bouton plein. |
| **Badge (ex. Le plus choisi)** (se traduit) | Une petite étiquette au-dessus. |

**Astuce** : n'affiche que des prix réels et à jour ; pour un tarif qui change souvent, renvoie plutôt vers la page officielle.

---

## Accordéon (FAQ)

Famille **Interaction**.

**À quoi il sert** : des questions dont la réponse s'ouvre au clic. Parfait pour une FAQ.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Questions** | **+ Question** pour chacune. **Question** (se traduit) et **Réponse** (se traduit, mise en forme possible). |
| **Première réponse ouverte** | La première réponse est visible au chargement. |
| **Signaler à Google comme FAQ (données structurées)** | Ajoute au site publié une description des questions et réponses que Google sait lire. |

**Sur le site publié** : chaque question s'ouvre et se ferme au clic, au toucher ou au clavier (Entrée, Espace).

**Accessibilité** : fonctionne au clavier et avec les lecteurs d'écran, sans script.

**Astuce** : le modèle **Questions fréquentes** (panneau Modèles) pose un titre et un accordéon centrés, avec l'option Google déjà cochée.

---

## Logo du site

Famille **Site**.

**À quoi il sert** : le logo (ou le nom) du site, qui ramène à l'accueil.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Afficher le nom du site** | Le nom s'affiche à côté du logo. |
| **Hauteur du logo** | 32, 40, 56 ou 72 px. |

L'image du logo se choisit une fois pour tout le site : panneau **Site** → **En-tête par défaut** → **Logo**. Sans logo, le nom du site s'affiche.

**Quand l'utiliser** : dans l'en-tête et le pied de page personnalisés (Atelier l'y place déjà quand tu choisis **Personnaliser avec des blocs**).

**Accessibilité** : si le nom est masqué, le lien garde le nom du site pour les lecteurs d'écran.

---

## Menu

Famille **Site**.

**À quoi il sert** : le menu du site.

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Disposition** | **En ligne** (horizontal, pour l'en-tête) ou **En colonne** (vertical, pour le pied de page). |
| **Alignement** | Gauche, Centre, Droite. |
| **Bouton « Menu » sur mobile** | Sur téléphone, le menu se replie derrière un bouton « ☰ Menu » (seulement en ligne). |

Le **contenu** du menu se règle dans le panneau **Pages** : l'ordre des pages, et **Personnaliser le menu** pour des liens, des sous-menus et des libellés ([4.6](04-pages-images-contenus.md)).

**En plusieurs langues** : les libellés suivent la langue de la page ; le bouton s'appelle « メニュー » en japonais.

**Accessibilité** : une vraie navigation, nommée « Menu » ; le bouton mobile annonce s'il est ouvert ou fermé.

---

## Choix de langue

Famille **Site**.

**À quoi il sert** : passer d'une langue à l'autre **sur la même page**.

**Réglages** : **Affichage** : **Codes (FR, NL…)** (par exemple JA · EN · FR) ou **Noms (Français…)** (日本語 · English · Français).

**Sur le site publié** : un lien par langue du site ; la langue en cours est signalée. Avec une seule langue, le widget n'affiche rien.

**Accessibilité** : chaque lien annonce sa langue, pour que le lecteur d'écran prononce correctement « 日本語 ».

**Astuce** : avec l'en-tête par défaut, le choix de langue est déjà là (case **Afficher le choix de la langue** du panneau **Site**). Ce widget sert dans un en-tête ou un pied personnalisés.

---

## Liste de contenus

Famille **Contenus**.

**À quoi elle sert** : afficher les éléments d'une **collection** (par exemple les événements de l'agenda), chacun sous forme de carte. Quand tu ajoutes un événement à la collection, toutes les listes se mettent à jour.

**Réglages (onglet Contenu)** — en haut, un encadré : **Gérer les éléments**, **✎ Carte** (dessiner la carte), **✎ Page de détail** ; sans collection : **+ Nouvelle collection**.

| Réglage | Ce que ça fait |
|---|---|
| **Collection** | Quelle collection afficher. |
| **Disposition** | **Grille de cartes** ou **Liste (image à gauche)**. |
| **Colonnes (ordinateur)** | 1 à 4 cartes par ligne (grille seulement). |
| **Événements** | Pour un agenda : **Tous**, **À venir**, **Passés**. |
| **Ordre** | Ordre de la collection, Ordre manuel (glisser dans Contenus), ou par un champ (par date, par titre…). |
| **Sens** | Automatique, Croissant (A→Z, plus ancien d'abord), Décroissant (Z→A, plus récent d'abord). |
| **Nombre maximum (0 = tous)** | Par exemple 3 pour « les trois prochains événements » sur l'accueil. |
| **Filtrer** | Seulement les éléments qui ont un choix donné (par exemple un statut). |
| **Texte si la liste est vide** (se traduit) | Par exemple « Aucun événement à venir pour l'instant. » |
| **Lien sous la liste (ex. Voir tout l'agenda)** (se traduit) et **Adresse du lien sous la liste** | Un bouton sous la liste. |

**Sur le site publié** : pour « À venir » et « Passés », c'est **le jour du visiteur** qui compte : un événement passé disparaît tout seul de la liste « À venir », sans republier.

**Sur mobile** : une carte par ligne (deux sur tablette).

**Astuce** : un **double-clic** sur la liste ouvre la modification de la carte, dessinée une seule fois pour tous les éléments.

---

## Champ

Famille **Contenus**.

**À quoi il sert** : afficher **une information d'un élément** de collection (sa date, son lieu, son adresse…) dans la **carte** ou la **page de détail** de la collection.

**Quand l'utiliser** : seulement en modifiant une carte ou une page de détail (**✎ Carte**, **✎ Page de détail**). Ailleurs, le canevas indique « Champ : s'affiche dans une carte ou une page de détail de collection ».

**Réglages (onglet Contenu)**
| Réglage | Ce que ça fait |
|---|---|
| **Champ affiché** | L'information à montrer ; pour un agenda, aussi **Date et heure**. |
| **Libellé avant la valeur (facultatif)** (se traduit) | Par exemple « Lieu : ». |
| **Icône** | **Aucune** ou un pictogramme (Calendrier, Lieu, Horloge…). |
| **Format des dates** | « 3 novembre 2026 », « 3 nov. 2026 » ou « mardi 3 novembre 2026 ». |

**Sur le site publié** : chaque carte montre la valeur de son propre élément ; un lien ou un e-mail devient cliquable ; un champ vide n'affiche rien. Le statut « Prévu » d'un événement ne s'affiche pas (seuls « Annulé », « Reporté », « Nouvelle date » se voient).

**En plusieurs langues** : les dates s'écrivent dans la langue de la page (« 2026年11月3日火曜日 » en japonais).

**Astuce** : un titre, un texte ou une image de la carte peuvent aussi être **reliés** à un champ : dans l'inspecteur, la liste **🔗 Relier à un champ…** à côté du réglage.

---

## Pour aller plus loin

- Ajouter, déplacer, écrire dans la page : [chapitre 2](02-edition.md).
- Style, presets, modèles, composants : [chapitre 3](03-style-design.md).
- Pages, menu, images, collections : [chapitre 4](04-pages-images-contenus.md).
- Construire un site complet pas à pas : [Prise en main](prise-en-main.md).
