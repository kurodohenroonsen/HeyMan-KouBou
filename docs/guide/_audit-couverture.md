# Audit de couverture du guide

> Fichier de travail : ne fait pas partie du guide lu par les personnes.

Fait le 29/10/2026 en comparant le code de l'éditeur (`index.html`, `editor/app.js`, `editor/cmdk.js`, les fenêtres `dialog` des `editor/*-ui.js`, `editor/inspector.js`, `editor/styletab.js`, `editor/panels.js`, `editor/pages.js`, `editor/templates.js`, `editor/library.js`, `editor/fields.js`, `editor/ctxmenu.js`, `editor/panel-resize.js`, `editor/ui-lang.js`, `editor/help.js`) avec les chapitres du guide.

Légende : ✓ couvert avant l'audit · ➕ manque comblé par l'audit · ⚠ manque non comblable sans changer le code.

---

## 1. Barre du haut (`index.html`)

| Fonctionnalité | Section du guide |
|---|---|
| Nom du site (champ en haut à gauche) | ✓ 1.2, 4.8 |
| Sélecteur de page | ✓ 4.4 |
| ↶ Annuler / ↷ Rétablir | ✓ 2.9 |
| Ordinateur / Tablette / Mobile | ✓ 2.1, 3.3 |
| Sélecteur de langue affichée | ✓ 5.1 |
| Badge « N à traduire » | ✓ 4.9, 8.1 |
| 🌐 Traductions | ✓ 5.2 |
| 🔎 SEO | ✓ 6.1 |
| ✨ IA locale | ✓ 7.1 |
| Participants (pastilles) | ✓ 10.5 |
| 👥 Travailler à plusieurs | ✓ 10.1 |
| 💬 Commentaires | ✓ 11.1 à 11.8 |
| État d'enregistrement | ✓ 1.2 |
| ❓ Guide d'utilisation | ✓ 1.7 (ajouté par le travail du générateur HTML) |
| 🐞 Journal | ✓ 0.1 |
| Fichier → Guide d'utilisation | ✓ 1.7 |
| Fichier → Aperçu dans un nouvel onglet | ✓ 1.5 |
| Fichier → Versions… | ✓ 4.25 à 4.29 |
| Fichier → Enregistrer le projet (.json) | ✓ 1.3 |
| Fichier → Ouvrir un projet (.json) | ✓ 1.4 |
| Fichier → Recharger l'exemple / Nouveau site vide | ✓ 1.5 |
| Fichier → Langue de l'interface | ✓ 1.6 |
| Exporter le site | ✓ 8.1, 8.2 |
| 🚀 Publier | ✓ 8.3 à 8.6 |
| Note « écran d'au moins 1024 px » | ✓ bienvenue.md ; 2.17 (panneaux empilés sous 900 px) |

## 2. Panneau de gauche

| Fonctionnalité | Section du guide |
|---|---|
| Widgets : bibliothèque, recherche, structures (1 à 4 colonnes, 2/3 + 1/3, 1/3 + 2/3), clic ou glisser | ✓ 2.3, 2.4 ; ➕ catalogue complet : widgets.md |
| Modèles : 13 modèles de sections | ✓ 3.9 |
| Modèles : Mes composants (insérer, renommer, supprimer) | ✓ 3.11 |
| Structure (arbre, replier, clavier, glisser) | ✓ 2.11 |
| Pages : + Page, ✨ Page décrite, ♿ déclaration, fiche (titre, adresse, ⟲, description, ↑ ↓, pied de page, Ouvrir, ✕), menu personnalisé | ✓ 4.1 à 4.7, 13.2 |
| Contenus : + Nouvelle collection, ✎ Carte, ✎ Page de détail, fenêtre (Éléments, Champs, Réglages), CSV, ✨ Depuis une affiche, ✨ Depuis un texte | ✓ 4.16 à 4.24, 12.1, 12.2 |
| Site : Identité, Langues | ✓ 4.8, 4.9 |
| Site : Palette, + Couleur, 🎨 Palette depuis le logo, Contrastes, Couleurs hors palette | ✓ 3.8, 4.10, 12.5 |
| Site : Typographie (polices, arrondi, largeur du contenu, transitions), Échelle de texte, Espacements | ✓ 3.8, 4.10 |
| Site : Presets (renommer, dupliquer, supprimer) | ✓ 3.7, 4.12 |
| Site : En-tête et pied de page en blocs, Revenir au défaut | ✓ 3.12, 4.11 |
| Site : En-tête par défaut (logo, fixe, choix de la langue, menu mobile), texte du pied | ✓ 4.10, 4.15 |
| Poignées de largeur des panneaux | ✓ 2.17 |

## 3. Canevas

| Fonctionnalité | Section du guide |
|---|---|
| Affichage, mise à l'échelle, rechargements | ✓ 2.1 |
| Sélection, flèches, Échap, Maj+clic | ✓ 2.2, 2.10 |
| Barre de l'élément ↰ ✥ ⧉ ✕ | ✓ 2.2, 2.4, 2.8 |
| Écriture dans la page, barre B I U 🔗 ⌫ ✨ | ✓ 2.5 à 2.7 |
| Double-clic sur en-tête, pied, composant, liste | ✓ 2.15, 3.11, 3.12 |
| Menu contextuel | ✓ 2.12 |
| Bandeau « Vous modifiez… » : Terminer | ✓ 3.11, 3.12, 4.21 |
| Bandeau d'une carte ou page de détail : liste « Aperçu : … », bouton « Éléments » | ➕ 4.21 (paragraphe « Le bandeau pendant la modification ») |

## 4. Inspecteur

| Fonctionnalité | Section du guide |
|---|---|
| Onglets Contenu, Style, Avancé | ✓ 3.1 |
| Haut de l'inspecteur : chemin cliquable, ↰ 🖌 📋 ⧉ ✕, note de présence | ➕ 3.13 |
| Sélection multiple (en-tête « N éléments ») | ✓ 2.10 |
| Champs (textes par langue, listes, liens, « Lier à une page ou une section… », images, cases, nombres, listes d'éléments) | ✓ 3.1, 3.2 ; widgets.md (réglage par réglage) |
| Section : Largeur du contenu, Balise ; Rangée : Disposition des colonnes (9 choix), Empiler les colonnes ; Colonne : largeur par appareil | ➕ 3.14 (avant : seule la disposition était citée en 3.1) |
| Lien de bouton « Ouvrir en fenêtre (popup) » | ➕ 3.16 (avant : seulement cité dans un tableau du journal en 3.1) |
| Encadré d'instance de composant (Modifier le composant, Détacher) | ✓ 3.11 |
| Encadré d'une Liste de contenus (Gérer les éléments, ✎ Carte, ✎ Page de détail, + Nouvelle collection) et ses réglages (collection, disposition, colonnes, événements, ordre, sens, nombre, filtre, texte vide, lien sous la liste) | ➕ 4.30 ; widgets.md |
| Liaison « 🔗 Relier à un champ… » | ✓ 3.1, 4.21 |
| ✨ Décrire l'image | ✓ 3.1, 7.4 |
| Style : appareils, Normal / Survol, Copier / Coller, recherche, 🖥▭▯, échelles, couleurs de palette, contraste | ✓ 3.3 à 3.6 |
| Style : presets (+ Preset, Modifier le preset, Détacher, Par défaut) | ✓ 3.7 |
| Style : groupe Effets (Apparition au défilement, Transformation, Durée de transition, Opacité) | ➕ 3.15 |
| Avancé : ancre, classes CSS, libellé accessible, Réutiliser, Masquer sur, Masquer dans la langue, CSS personnalisée | ✓ 3.1, 3.10, 3.11 |

## 5. Barre de commandes (`editor/cmdk.js`)

| Commandes | Section du guide |
|---|---|
| Fonctionnement général, `cmdk.run`, `cmdk.fail` | ✓ 2.13 |
| Ajouter : … (tous les widgets), Modèle : …, Composant : … | ✓ 2.13, 3.9, 3.11 |
| Contenus : …, Modifier la carte / la page de détail : …, Nouvelle collection | ✓ 4.16, 4.17 (en partie) ; ➕ 2.18 |
| Modifier l'en-tête / le pied de page du site (passe en blocs si besoin) | ➕ 2.18 |
| Terminer la modification en cours | ➕ 2.18 |
| Page : … | ➕ 2.18 |
| Élément : … (sélectionner un élément de la page, recherche par `#ancre`) | ➕ 2.18 |
| Appareil : …, Langue : … | ➕ 2.18 |
| Panneau : … | ➕ 2.18 |
| Réglage : … (style) | ✓ 2.13, 3.3 |
| Actions (dupliquer, supprimer, copier / coller le style, parent, composant, annuler, rétablir, exporter, vérifier, textes à traduire, tableau des traductions, nouvelle page, enregistrer, publier, versions, aperçu) | ✓ chapitres concernés ; ➕ liste en 2.18 |
| SEO, IA locale, Demander à Atelier, Banc d'essai, Palette depuis le logo, Résumé de la relecture, Auto-test, Journal | ✓ 6, 7, 13, 14, 12.5, 12.4, 15, 0 |
| 🌍 langue de l'interface | ✓ 1.6 |
| 📖 Guide d'utilisation | ✓ 1.7 ; ➕ 2.18 |
| Aide : raccourcis clavier | ✓ 2.14 |
| Commandes récentes en tête de liste | ➕ 2.18 |
| Phrase de 3 mots ou plus → « ✨ Demander à Atelier : … » | ✓ 13.1 ; ➕ 2.18 |

## 6. Raccourcis (`editor/app.js`, `editor/help.js`)

| Raccourci | Section du guide |
|---|---|
| Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z, Ctrl+S, Ctrl+K, Ctrl+Alt+J, Ctrl+D (même dans un champ de l'inspecteur), ?, Échap, Ctrl+X, Ctrl+C, Ctrl+V, flèches, Suppr / Retour arrière, Alt+↑ / Alt+↓, Entrée | ✓ 2.14 |
| F1 (guide d'utilisation, sur le chapitre de la fenêtre ouverte) | ✓ 1.7 ; ➕ ligne ajoutée au tableau de 2.14 |

## 7. Fenêtres (`dialog`)

| Fenêtre (`id`) | Section du guide |
|---|---|
| `cmdk`, `shortcutsDialog` | ✓ 2.13, 2.14 |
| `auditDialog` | ✓ 8.1 |
| `publishDialog` | ✓ 8.3 à 8.6 |
| `versionsDialog` | ✓ 4.25 à 4.29 |
| `i18nDialog` | ✓ 5.2 à 5.5 |
| `seoDialog` | ✓ 6.1 à 6.6 |
| `aiDialog` | ✓ 7.1 |
| `askDialog` | ✓ 13 |
| `benchDialog` | ✓ 14 |
| `selftestDialog` | ✓ 15 |
| `logDialog` | ✓ 0.1 à 0.4 |
| `collabDialog`, `joinDialog` | ✓ 10 |
| `collectionNewDialog`, `collectionDialog` | ✓ 4.16 à 4.24 |
| `a11yDialog` | ✓ 4.7 |
| fenêtres de `smart-ui.js` (affiche, texte collé, chapô et titres, résumé de la relecture, palette depuis le logo) | ✓ 12.1 à 12.5 |

## 8. Publication et site publié

| Fonctionnalité | Section du guide |
|---|---|
| Vérification, .zip, publish.php (télécharger, tester, publier), GitHub | ✓ 8 |
| Formulaire, menu mobile, listes datées, galeries, vidéos et cartes au clic | ✓ 9 ; widgets.md |

## 9. Widgets

Les 23 widgets du registre (`core/widgets.js`, `core/widgets-extra.js`, `core/collection-widgets.js`) et les 3 éléments de structure (section, rangée, colonne) ont chacun leur fiche dans [widgets.md](widgets.md), réglage par réglage. Avant l'audit, aucun chapitre ne décrivait les réglages propres à chaque widget (seuls les cas d'usage généraux de l'inspecteur l'étaient) : c'était le plus gros manque.

---

## Manques trouvés et comblés

| Manque | Ajout |
|---|---|
| Réglages de chaque widget, de la section, de la rangée et de la colonne | `widgets.md` (nouveau) |
| Familles de commandes de Ctrl+K (Page, Élément, Affichage, Panneau, Site, Terminer, récentes) | 2.18 |
| F1 absent du tableau des raccourcis | ligne ajoutée en 2.14 |
| Haut de l'inspecteur : chemin, boutons, note de présence | 3.13 |
| Section (largeur du contenu, balise), rangée (9 dispositions, empilement), colonne (largeur par appareil) | 3.14 |
| Groupe Effets du style (apparition au défilement, transformation, durée, opacité) | 3.15 |
| Bouton qui ouvre un composant en fenêtre (popup) | 3.16 |
| Bandeau de modification d'une carte ou d'une page de détail (liste « Aperçu », bouton « Éléments ») | 4.21 |
| Réglages du widget Liste de contenus (à venir, passés, ordre, nombre, filtre, lien) | 4.30 |
| Langues de la déclaration d'accessibilité (FR, NL, DE, EN seulement) | paragraphe ajouté en 4.7 |
| Liste des langues du site sans le japonais | 4.9 corrigé |

## Points corrigés parce qu'ils induisaient en erreur

| Où | Avant | Après |
|---|---|---|
| 5.6 (modèle `tools/guide-tpl/05-langues-traductions.md.tpl`) | « Le japonais peut aussi être la langue principale d'un nouveau projet. » | la langue principale se fixe à la création du projet, l'éditeur ne permet pas de la choisir (« Nouveau site vide » commence en français) ; un `.json` en japonais garde son réglage |
| 4.9 | « (français, néerlandais, allemand, anglais) » | japonais ajouté ; précision sur « Nouveau site vide » |

## Manques non comblables sans changer le code

| Manque | Conséquence |
|---|---|
| ✓ Choisir la langue principale (cycle 24 : fenêtre « Nouveau site vide » avec nom, langue principale dont le japonais, autres langues) | documenté en 1.5, 4.9, 5.6 et à l'étape 1 de la prise en main. Changer la langue principale d'un site existant reste impossible. |
| ⚠ Textes d'exemple des modèles et des widgets uniquement en français (`fr(…)`) | dans un site dont la langue principale n'est pas le français, ces textes n'apparaissent pas dans la langue principale (ligne vide) : signalé dans le tutoriel (étape 6). |
| ⚠ Déclaration d'accessibilité générée en FR, NL, DE, EN seulement | pour un site en japonais principal, le titre et le texte de cette page sont vides en japonais tant qu'ils ne sont pas traduits ; signalé en 4.7. |
| ⚠ Pas de fonction « dessiner une illustration » dans l'éditeur | les illustrations de la visite guidée devront être produites par la visite elle-même ; le tutoriel demande d'importer une image quelconque puis de la remplacer par ses photos. |

## Non traité ici

Les traductions anglaise et japonaise du guide (`docs/guide/en/`, `docs/guide/ja/`) ne reprennent pas encore les ajouts de l'audit, ni `bienvenue.md`, `prise-en-main.md` et `widgets.md`.
