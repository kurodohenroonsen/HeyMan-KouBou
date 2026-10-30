# Cycle 24 — Guide d’utilisation en HTML, pour tout le monde

## Demande
Kudoro : « fais les guides en full HTML, et pense bien à toutes les fonctionnalités, car après on fera un first visit […] qui démontrera la création complète de deux pages […] avec au moins une fois chacun des widgets, avec explication de tout ce qui est possible de faire […] faudrait qu’un non geek s’en sorte super facilement et comprenne son investissement de 4000 euros dedans » — « et comme exemple, tu vas créer le site web touristique de Kumakōgen à Ehime avec de vraies données trouvées sur le net ».

## Spécification
- **Guide HTML** généré depuis `docs/guide/` (`node tools/guide-html.mjs` → `guide/`) : une page par chapitre et par langue (FR, EN, JA ; chapitre non traduit → version française avec un bandeau), sans dépendance ni réseau.
- **Pour un non-informaticien** : grands caractères, lignes courtes, chapitres groupés (Bien démarrer · Utiliser au quotidien · L’IA dans l’éditeur · Travailler à plusieurs · En cas de souci), sommaire du chapitre, captures d’écran de l’éditeur dans la langue de la page, chapitre précédent / suivant.
- **Détails techniques cachés** : blocs de journal, colonnes « Journal / Niveau », tableaux de codes et paragraphes « Journal attendu / À vérifier » repliés ; une case « Afficher les détails techniques » les montre (choix retenu, `localStorage['atelier-guide-tech']`) ; jamais imprimés.
- **Recherche** dans la langue de la page (tous les mots, sans accents ; sous-chaîne en japonais), raccourci « / », flèches, Entrée ouvre la section, message si rien n’est trouvé.
- **Langues** : liens vers la même page dans les deux autres langues ; `guide/` redirige vers la langue du navigateur ; « Ouvrir l’éditeur » garde la langue.
- **Petit écran** : menu des chapitres repliable (☰), pas de défilement horizontal. **Impression** : sans menus.
- **Dans l’éditeur** : bouton ❓, Fichier → Guide d’utilisation, F1, Ctrl+K « Guide » ; F1 dans une fenêtre (Publier, SEO, IA…) ouvre son chapitre ; journal `ui.help` (INFO).
- **Nouveaux chapitres grand public** : *Bienvenue* (ce que l’atelier fait pour vous, ce que vaut l’investissement), *Prise en main* (créer pas à pas deux pages d’un site touristique de Kumakōgen, avec de vraies données sourcées), *Les widgets* (chacun, à quoi il sert, ce qu’on peut régler) ; audit de couverture des fonctionnalités.
- **Exemple Kumakōgen** : `docs/exemple-kumakogen/donnees.md`, faits recoupés (✅) ou à vérifier (⚠️), sources citées, pas de photo ni de logo officiel, mention « site de démonstration non officiel ». Sert aussi à la future visite guidée (cycle suivant).

## Tests écrits d’abord
- `tests/guide-html.test.js` : conversion Markdown → HTML (titres, ancres comme GitHub, tableaux, listes, code, liens `.md` → `.html`, `javascript:` refusé), classes techniques (blocs de journal, colonnes, sections de codes, paragraphes) dans les trois langues.
- `tools/e2e/cycle24.mjs` : ❓ / F1 / Fichier / Ctrl+K ouvrent le guide (bon chapitre selon la fenêtre, journal `ui.help`) ; toutes les pages existent dans les trois langues, aucun lien interne cassé ; capture affichée ; détails techniques cachés puis montrés, choix retenu ; recherche (FR, EN, JA), surlignage, Entrée, aucun résultat ; changement de langue sur la même page ; redirection de `guide/` ; téléphone (☰, pas de défilement horizontal) ; interface anglaise → guide anglais ; aucune erreur JavaScript.

## Livré
- **Guide HTML** : `tools/md.mjs` (Markdown → HTML, détails techniques marqués), `tools/guide-html.mjs` (pages, groupes, sommaire, captures, recherche, langues), `tools/guide-assets/` (styles, recherche, case technique, menu mobile), `tools/guide-captures.mjs` (11 captures × 3 langues, dont la nouvelle fenêtre) → `guide/` : 21 pages par langue, 308 sections indexées.
- **Dans l’éditeur** : bouton ❓, Fichier → Guide d’utilisation, F1 (chapitre de la fenêtre ouverte), Ctrl+K « 📖 Guide d’utilisation » ; `editor/help.js`, journal `ui.help`.
- **Nouveau site vide avec choix des langues** (manque trouvé par l’audit, nécessaire à l’exemple) : `blankSite()` dans `core/site.js` (testé : `tests/new-site.test.js`), fenêtre `editor/new-site-ui.js` (nom, langue principale dont le japonais, autres langues, version de sécurité, Ctrl+Z) ; page d’accueil nommée dans la langue principale (« ホーム ») ; journal `project.new` `{lang, languages}`, `project.new-lang`.
- **Noms de widgets plus clairs** : « Carte géographique » et « Carte de contenu » (au lieu de deux « Carte ») ; famille « Collections » / 「コレクション」 en anglais et japonais pour les widgets de collection (elle se confondait avec « Contenu »).
- **Chapitres grand public** (FR, EN, JA) : *Bienvenue dans Atelier*, *Prise en main : le site touristique de Kumakōgen en deux pages* (32 étapes, chacun des 23 widgets, tableau widget → étape pour la future visite guidée), *Tous les widgets* (une fiche par widget, tous ses réglages).
- **Audit de couverture** (`docs/guide/_audit-couverture.md`) et manques comblés dans les trois langues : 1.5 (nouveau site), 1.7 (guide), 2.14 (F1), 2.18 (toutes les commandes Ctrl+K), 3.13–3.16 (haut de l’inspecteur, section/rangée/colonne, effets, popup), 4.7, 4.9, 4.21, 4.30 (liste de contenus), 5.6.
- **Données de l’exemple** : `docs/exemple-kumakogen/donnees.md` (recherche du 29/10/2026, faits ✅ recoupés ou ⚠️ à vérifier, sources ; kuma-kanko.com fermé temporairement ce jour-là).
- Tests : 385 unitaires ; régression complète 1687 vérifications de bout en bout, 0 échec (dont 48 pour ce cycle).
- **Limites** : textes d’exemple des modèles en français seulement (ligne JA vide au départ dans un site japonais) ; tutoriel vérifié dans le code mais pas encore rejoué de bout en bout (ce sera la visite guidée) ; textes japonais du tutoriel à faire relire par une personne de langue japonaise ; la langue principale d’un site existant ne se change pas.
