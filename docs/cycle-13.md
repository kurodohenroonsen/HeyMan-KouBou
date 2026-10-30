# Cycle 13 — Contenus répétés (collections)

La feuille de route regroupait « contenus répétés » et « relecture à plusieurs ». Les deux sont gros : ce cycle traite les **collections** (médias membres, actualités, agenda) ; la relecture pair-à-pair devient le cycle 14.

## Recherche (résumé)
- **Webflow CMS** : une *collection* = des champs typés + des éléments ; une *liste* affiche les éléments sur n'importe quelle page ; une *page modèle* génère une page par élément (adresse `/collection/element`) ; le modèle se dessine une fois, chaque page suit.
- **Divi 5 Loop Builder** : on dessine **une** carte avec les widgets habituels, on relie leurs contenus aux champs de l'élément (« dynamic content »), puis on règle la requête : nombre, ordre, décalage, filtres.
- **Google, données structurées Event** : obligatoires `name`, `startDate`, `location` (Place + adresse) ; recommandés `endDate`, `eventStatus` (Scheduled, Cancelled, Postponed, Rescheduled), `image`, `description`, `organizer`. Date seule pour un événement sur la journée (pas de minuit fictif). Le balisage va sur **la page de l'événement**, pas sur la liste.
- **iCalendar (RFC 5545)** : lignes CRLF, repliées à 75 octets, échappement de `\ ; , ` et des retours à la ligne, `DTSTART;VALUE=DATE` pour une journée entière (fin exclusive), `UID` stable, `DTSTAMP` obligatoire.
- **RSS 2.0** : utile à une fédération de médias (agrégateurs, autres sites membres) ; un flux par langue.

## Spécification (écrite avant les tests)

### Modèle
- `site.collections[id] = { id, name, kind, slug, slugs{lang}, fields[], items[], card, detail, settings }`.
- Types de collection proposés avec leurs champs : **Médias membres** (nom, logo, présentation, type de média, ville, site web), **Actualités** (titre, date, image, chapô, texte, auteur), **Agenda** (titre, date, heure, date de fin, lieu, adresse, image, description, statut, lien d'inscription), **Personnalisée** (titre seulement).
- Types de champ : texte, texte riche, image, date, heure, lien, e-mail, nombre, choix (options traduisibles), case à cocher. Les champs texte et texte riche sont traduisibles.
- Élément : `{ id, slug, status: 'published'|'draft', values }`. Adresse propre unique dans la collection, calculée depuis le titre. Les brouillons ne sont jamais publiés.
- Adresses : `/<collection>/<element>/`, et `/<langue>/<collection traduite>/<element>/`. Une page du même nom que la collection (ex. page « agenda ») sert de page de liste, sans conflit.

### Liste (widget « Liste de contenus »)
- Réglages : collection, disposition (grille ou liste), colonnes, nombre maximum, ordre (champ + sens), filtre par choix (ex. « Radio »), pour l'agenda : à venir / passés / tous, texte si vide, lien « Voir tout ».
- Chaque élément est affiché avec la **carte** de la collection : une colonne de widgets ordinaires dont les contenus peuvent être **reliés à un champ** (titre → Nom, image → Logo, bouton → page de l'élément).
- Agenda « à venir » : filtré à la publication ; un petit script masque ensuite les événements devenus passés et respecte le maximum ; sans JavaScript, le maximum s'applique en CSS.

### Modèles
- « Modifier la carte » et « Modifier la page de détail » ouvrent l'édition ciblée (comme les composants) avec un élément d'aperçu. Dans l'inspecteur, chaque contenu compatible propose « Relier à un champ » ; un contenu relié n'est plus modifiable dans la page (un message dit où le changer).
- Conversions sûres : texte → texte riche (échappé, en paragraphe), texte riche → texte (texte seul), date → texte (format de la langue : « 3 novembre 2026 »), choix → libellé traduit, lien spécial « page de l'élément » et « page de la liste ».
- Nouveau widget **Champ** : affiche un champ avec une icône et un libellé (ex. 📅 3 nov. 2026, 📍 Namur).
- Lien interne `item:<collection>:<élément>` utilisable partout (bouton, menu…).

### Pages de détail publiées
- Une page par élément publié et par langue ; titre, description, `og:image`, canonique et `hreflang` ; données structurées : Event (agenda), NewsArticle (actualités), Organization (membres) ; présentes dans le sitemap.
- Agenda : un fichier `.ics` (« Ajouter à mon agenda ») par événement et un `agenda.ics` pour toute la collection. Actualités : un flux RSS par langue `feed.xml`, annoncé dans le `<head>` des pages.
- publish.php version 2 accepte `.ics` ; avec un publish.php version 1, les `.ics` sont retirés de l'envoi avec un message (le reste est publié).

### Éditeur
- Onglet **Contenus** à gauche : collections, nombre d'éléments, « + Nouvelle collection » (avec, en option, la page de liste créée et ajoutée au menu, et des éléments d'exemple).
- Fenêtre de collection : éléments (recherche, ajouter, dupliquer, monter/descendre, supprimer, brouillon/publié), formulaire de l'élément par langue, onglet Champs (ajouter, renommer, type, options, supprimer), onglet Réglages (nom, adresse par langue, pages de détail, ordre par défaut, page de liste) ; export / import CSV des éléments.
- Traductions : les textes des éléments, les libellés des choix et les textes des modèles entrent dans l'inventaire (clés `ci:`, `co:`, `n:k:`, `n:d:`), donc dans « à traduire », la traduction automatique et le CSV.
- Versions : les différences signalent les collections modifiées. Vérification avant export : liste sans collection, collection vide, événement sans date ni lieu, image sans description.

### Sécurité
- Valeurs assainies à l'écriture selon le type (texte sans balises, texte riche filtré, liens sûrs uniquement, dates `AAAA-MM-JJ`, heures `HH:MM`, images `asset:` ou https).
- Adresses (collection et éléments) limitées à `a-z0-9-`, jamais `assets`, un code de langue ou un nom réservé.

## Livré
- **Panneau Contenus** : collections avec leur nombre d'éléments et de brouillons, « + Nouvelle collection » en quatre types (Médias membres, Actualités, Agenda, Personnalisée). En option : page de liste créée et ajoutée au menu, exemples clairement marqués « à remplacer ».
- **Fenêtre de collection** : éléments (recherche, ajout en brouillon, formulaire par langue, image, date, heure, lien vérifié, adresse, publié ou brouillon, ordre, copie, suppression, « voir sa page ») ; champs (ajout, nom, « à traduire », choix un par ligne, ordre, suppression avec nettoyage des valeurs et des liaisons) ; réglages (nom, adresse par langue, pages de détail, RSS, page de liste, ordre par défaut, suppression) ; export et import CSV (mise à jour par adresse, choix reconnus par leur libellé, lignes en erreur signalées).
- **Liste de contenus** (widget) : grille ou liste, colonnes, maximum, ordre, filtre par choix, à venir / passés pour l'agenda, texte si vide, lien « voir tout ». Les événements devenus passés sont masqués chez le visiteur par un petit script ; sans JavaScript, la sélection faite à la publication reste correcte.
- **Carte et page de détail** dessinées avec l'édition ciblée : bandeau avec choix de l'élément d'aperçu, « 🔗 Relier à un champ » dans l'inspecteur (titre, texte, image, lien, avec conversions sûres), texte relié protégé de l'édition directe (message qui dit où le changer), widget **Champ** (icône, libellé, format de date), double-clic sur une liste pour modifier sa carte.
- **Lien interne** `item:` vers la page d'un élément, juste dans chaque langue.
- **Publication** : pages de détail par langue (titre, description, `og:image`, canonique, `hreflang`, sitemap), JSON-LD Event / NewsArticle / Organization, `.ics` par événement et `calendar.ics` (fuseau Europe/Brussels, journées entières, repli RFC 5545), flux RSS par langue annoncé dans le `<head>`. publish.php passe en version 2 (accepte `.ics`) ; avec une version 1 installée, le site est publié sans les `.ics` et un message explique comment mettre à jour.
- **Partout ailleurs** : textes des éléments, libellés des choix et textes fixes des modèles dans les traductions (à traduire, traduction automatique, CSV, « Aller à ») ; versions (« contenus différents : Agenda ») ; contrôle avant export (liste sans collection, événement sans date ni lieu, collection vide, lien vers un brouillon) ; Ctrl+K (ouvrir une collection, sa carte, sa page de détail, nouvelle collection).

## Corrigé en cours de route
- Bouton « Ajouter à mon agenda » : lien `./event.ics` simplifié en `event.ics`.
- Fenêtre de collection : un nouveau rendu pendant le précédent (champ quitté au moment d'un clic) provoquait une erreur ; les rendus sont maintenant mis en file.
- Un widget dont le rendu est vide n'ajoute plus d'enveloppe vide au site publié (évite des espaces fantômes dans les cartes).
- Onglets du panneau de gauche (six maintenant) et bandeau d'édition resserrés pour tenir sans être coupés.

## Tests
- Unitaires : 232 (dont 30 nouveaux dans `tests/collections.test.js`) : modèle, valeurs hostiles, requêtes (brouillons, tri, filtre, à venir / passés), dates en quatre langues, liaisons, liens `item:`, rendu des listes et des pages de détail, JSON-LD, iCal (CRLF, échappement, repli à 75 octets), RSS, traductions, édition ciblée, validation, contrôle avant export, versions, CSV, publication.
- Bout en bout : 333 au total (régression complète des cycles 2 à 13 au vert), dont 46 nouveaux : création de l'agenda, modification en direct, brouillon, lien refusé, champ ajouté, carte et page de détail reliées, aperçu par élément, maximum, Ctrl+K, import CSV, traductions, export (pages par langue, .ics, Event), axe-core sans violation WCAG 2.1 AA sur la liste et la page de détail (ordinateur et mobile), script « à venir » sur le site publié.
