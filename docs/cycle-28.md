# Cycle 28 — Modèles de sites et contenus par langue

## Demande
Audit du 30/10/2026, § 6.3 « Cycle 28 » : **X2** (démarrer d'un modèle de site, plus jamais de page blanche), **A8** (contenus par défaut dans la langue principale, plus de MAB hors de l'exemple) et **W5** (fuseau horaire du site). Constats N11 et N17 ; relectures A (I5, I7, A6, A8) et B (I10, UC-I10). Kudoro vise les petits commerces, les indépendants et les associations de promotion des commerces d'une ville ou d'une région : un modèle « Association de commerçants » s'ajoute aux quatre de l'audit.

## Spécification
- **Nouveau site** (ex-« Nouveau site vide ») : nom, langue principale, autres langues, puis **choix d'un modèle** (vignette SVG dessinée, nom, description ; « Site vide » coché d'office, comportement inchangé).
- `core/site-templates.js` → `buildTemplate(id, { name, main, others, today })` : générateur pur, site complet et valide. Cinq modèles : *Association ou média* (accueil, actualités, membres, agenda, contact), *Tourisme ou commune* (accueil, à découvrir, agenda et accès, contact), *Commerce ou artisan local* (accueil, offre, à propos, horaires et accès, contact), *Association de commerçants / promotion d'une ville* (accueil, les commerces, agenda, actualités, devenir membre, contact), *Événement ou festival* (accueil, programme, infos pratiques, contact), et *Site vide*. Pour chacun : sections construites avec les widgets et les modèles de section existants, menu automatique complet, en-tête et pied en blocs, collections avec 3 à 4 exemples du domaine, titre et description pour Google sur chaque page, palette (contrastes AA vérifiés) et polices, fuseau, pages « Mentions légales » et « Vie privée » (cycle 29) avec des champs « [à compléter] ». Textes dans les cinq langues, posés sous toutes les langues choisies.
- **Contenus par défaut** : `defaults()` des widgets, modèles de section et exemples de collections dans les cinq langues (`L5`), neutres ou propres au domaine ; `createNode(type, { lang | langs })`, `buildTemplate(id, { lang | langs })` et `addListItem(…, lang)` ne posent que la langue principale (les autres restent « à traduire ») ; champs `siteText` (texte « liste vide ») gardés dans les cinq langues.
- **Fuseau** : `site.timezone` (IANA ; Europe/Brussels, Asia/Tokyo si la langue principale est le japonais ; projets anciens : déduit de la langue), réglable dans l'onglet Site (liste courte + saisie libre, validée par `Intl`) ; iCal `TZID` + `VTIMEZONE` (Europe/Brussels, Paris, Luxembourg, Amsterdam, Berlin, London, Asia/Tokyo, UTC), sinon `DTSTART` en UTC ; JSON-LD avec décalage ; affichage inchangé.

## Tests écrits d'abord
- `tests/site-templates.test.js` : six choix et vignettes ; site vide identique au cycle 24 ; chaque modèle × chaque langue principale (25 cas) : `validateSite` et `auditSite` sans erreur, aucun avertissement hors « à compléter » attendus, aucun « MAB », ≥ 4 pages, titre d'accueil et H1 dans la langue principale, menu complet, en-tête et pied en blocs, SEO renseigné, collections 3–4 exemples, pages légales, palette, fuseau ; commerces (catégorie, adresse, horaires, lien) ; tourisme japonais exporté avec `TZID:Asia/Tokyo` ; contrastes AA des palettes.
- `tests/widgets-extra.test.js` : site ja → `defaults()` sous `ja` en japonais ; cinq langues, sans MAB ; nouvel élément de liste en ja ; modèles de section insérés en japonais sans clé `fr`.
- `tests/collections.test.js` : fuseau par défaut et validation ; décalages (été, hiver, Tokyo, UTC, New York, Kolkata) ; ICS Asia/Tokyo ; ICS en UTC hors liste ; JSON-LD `+09:00` ; `exampleValues` par domaine et langue ; collection dans un site japonais.
- `tools/e2e/cycle28.mjs` (37 vérifications) : fenêtre et vignettes ; « Association de commerçants » en français (8 pages, menu, pied, 4 commerces, rappel « à compléter » à l'export) ; « Tourisme » en japonais (textes, menu, agenda, Asia/Tokyo, export `.ics` avec `TZID:Asia/Tokyo`, JSON-LD `+09:00`) ; widget Titre et modèle FAQ en japonais ; fuseau modifié puis refusé ; site vide inchangé.

## Livré
- `core/site-templates.js`, `core/site-thumbs.js` (vignettes), `core/collection-examples.js` (exemples par domaine, 5 langues), `core/timezone.js` ; type de collection **Commerces** (`shops`, carte, page de détail, LocalBusiness) dans `core/collections.js`.
- `editor/new-site-ui.js` (cartes de modèles), `editor/panels.js` (fuseau), `editor/cmdk.js` (Ctrl+K « Nouveau site… »), appels avec la langue principale dans `editor/actions.js`, `dnd.js`, `templates.js`, `fields.js` et `core/assistant.js`.
- Contrôle avant export : avertissement « informations à compléter » (`TO_COMPLETE` de `core/legalpages.js`).
- Guide : 1.5 (modèles, tableau des vignettes), 4.16 (exemples, Commerces), 4.34 (fuseau), Bienvenue (pour qui), Prise en main (étape 1) ; codes `project.new-template`, `settings.timezone` ; traductions `i18n/parts/N-modeles.*.json`.
- Démonstration Kumakōgen : passe en mode expert pour les effets (cassée depuis le cycle 30).
- Tests : 533 unitaires ; e2e `cycle28` 37/37 ; `cycle6`, `cycle13` (adapté : exemple neutre, décalage horaire), `c16-contenus`, `cycle22-ja-site`, `cycle24`, `cycle26` verts.

## Limites
- Textes japonais, néerlandais et allemand des modèles à faire relire par des locuteurs ; descriptions japonaises pour Google plus courtes que les 80–120 caractères conseillés.
- Les exemples restent en place dans les autres langues quand on réécrit la langue principale : le tableau des traductions ne les signale pas (choix : site lisible tout de suite dans chaque langue).
- Pas d'images dans les modèles (espaces réservés) ; adresses, téléphones et site web d'exemple fictifs.
- Les pages légales d'un modèle contiennent « [à compléter] » et `0000.000.000` jusqu'à ce que la personne les remplace (signalé à l'export).
