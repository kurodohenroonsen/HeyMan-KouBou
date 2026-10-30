# Cycle 11 — Langues

## Spécification (écrite avant les tests)

### Adresses traduites
- `page.slugs = { nl: 'team', de: 'team', en: 'team' }` ; la langue principale garde `page.slug`. Sans traduction, l'adresse de la langue principale est reprise.
- Tous les liens (menu, choix de langue, liens internes `page:ID`, hreflang, canonique, sitemap) suivent l'adresse de chaque langue.
- Unicité vérifiée par langue. Bouton « depuis le titre » pour proposer l'adresse à partir du titre traduit.

### Inventaire des textes traduisibles
- Un seul inventaire pour tout le site : titres et descriptions des pages, champs traduisibles des éléments (listes comprises), composants, en-tête et pied en blocs, libellés du menu, texte du pied de page par défaut, libellés accessibles.
- Chaque texte a une clé stable (`n:<racine>:<élément>:<champ>`, `p:<page>:title`…) et un type (court, mise en forme, texte riche).
- « Textes à traduire » et la vérification avant export utilisent cet inventaire (les composants et le menu sont désormais comptés).

### Tableau des traductions
- Une ligne par texte, une colonne par langue, modifiable sur place ; filtres « à traduire seulement », « à relire », recherche, page.
- Export CSV (UTF-8, compatible tableur) pour un traducteur, puis import : seules les clés connues sont acceptées, tout est assaini, un compte rendu indique ce qui a changé.

### Traduction automatique sur l'appareil
- Si le navigateur propose l'API Translator (Chrome 138+ sur ordinateur), bouton « Traduire automatiquement » vers une langue : textes manquants seulement, mise en forme conservée (seuls les morceaux de texte sont traduits, les balises restent), progression et annulation.
- Les traductions automatiques sont marquées **« à relire »** jusqu'à ce qu'une personne modifie ou valide le texte ; la vérification avant export les compte.
- Sans l'API : bouton désactivé avec une explication. Aucun texte n'est envoyé à un serveur.

### Masquer dans une langue
- Onglet Avancé : « Masquer en NL / DE / EN » (contenu qui n'a de sens que dans certaines langues). Dans l'éditeur, l'élément reste visible en transparence.

## Livré
- **Adresses traduites** (panneau Pages, une ligne par langue, bouton ⟲ « depuis le titre ») : `/nl/neem-contact-op/` au lieu de `/nl/contact/`. Menu, choix de langue, liens internes, hreflang, canonique et sitemap suivent. Doublons refusés par langue.
- **Inventaire unique des textes** : pages, éléments (listes comprises), composants, en-tête et pied en blocs, menu, pied de page, libellés accessibles. Le badge « à traduire » et la vérification avant export comptent maintenant aussi les composants et le menu, et « Aller à » ouvre le composant ou l'en-tête concerné.
- **Tableau des traductions** (bouton 🌐 en haut, Ctrl+K, ou depuis la vérification) : une ligne par texte, une colonne par langue, cases manquantes en orange, édition sur place avec la mise en forme (gras, liens), filtres « à traduire » et « à relire », recherche, « Aller à ».
- **Export / import CSV** pour un traducteur : UTF-8 lisible par les tableurs ; à l'import, seules les clés connues sont prises, tout est assaini, compte rendu (textes mis à jour, lignes ignorées).
- **Traduction automatique sur l'appareil** (API Translator de Chrome) : textes manquants seulement, une langue à la fois, balises préservées (seuls les morceaux de texte sont traduits : « <strong>sans compromis</strong> » reste en gras), progression, arrêt. Chaque texte traduit est marqué **à relire** : « ✓ Valider » dans le tableau, ou toute correction (tableau, inspecteur, page) retire la marque ; la vérification avant export rappelle le nombre restant. Rien n'est envoyé à un serveur.
- **Masquer dans une langue** (onglet Avancé) : l'élément disparaît du site dans cette langue (et de la description pour Google), reste visible en transparence dans l'éditeur.

## Bugs trouvés et corrigés
- Un texte masqué dans une langue réapparaissait dans la description pour Google (premier paragraphe de la page).
- Dans un navigateur sans modèle de traduction, `Translator.availability()` ne répond jamais : délai de 4 s puis explication ; la préparation du traducteur peut être interrompue.
- L'onglet Avancé pouvait afficher le mot « null » (élément vide ajouté tel quel depuis le cycle 9).

## Tests
- Unitaires : 179 (dont 12 nouveaux : adresses par langue, inventaire, écriture assainie, traduction par morceaux, annulation, relecture, CSV, masquage).
- Bout en bout : 23 nouveaux (traducteur de test injecté à la place de l'API Chrome, comportement réel sans modèle vérifié aussi).
