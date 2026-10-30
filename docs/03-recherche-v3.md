# Recherche v3 : comment améliorer encore Atelier (octobre 2026)

Méthode : comparer avec les éditeurs du moment (Divi 5, Elementor 4 « atomique », Webflow, Framer, Puck), les standards du web actuels et les obligations légales, puis confronter tout ça à ce qu'Atelier fait déjà, ou pas.

## 1. Ce que font les concurrents et qu'Atelier n'a pas encore

| Idée | Qui la fait | Ce qu'Atelier a aujourd'hui | Intérêt |
|---|---|---|---|
| **Variables de design** (couleurs, polices, espacements, tailles réutilisables) ; « rechercher-remplacer » d'une valeur figée par une variable | Divi 5, Elementor 4, Webflow | 6 couleurs de palette seulement | ★★★ |
| **Presets / classes** : un style nommé (« Bouton principal », « Carte ») appliqué à N éléments, modifié une fois | Divi 5 (presets, presets de groupes d'options), Elementor 4 (classes) | Copier/coller le style (copie, pas de lien) | ★★★ |
| **Composants avec emplacements** : un bloc réutilisable (bandeau CTA, carte membre) qui se met à jour partout | Divi 5 (composants et slots), Webflow (props, variantes), Puck (slots) | Rien | ★★★ |
| **Modes de variables** : thème clair/sombre, thème « événement » sur une page | Webflow (variable modes) | Rien | ★★ |
| **Éditeur responsive « tout en un »** : voir et régler la valeur ordinateur/tablette/mobile côte à côte, sans changer d'appareil | Divi 5 | Il faut changer d'appareil | ★★ |
| **Points de rupture réglables** | Divi 5 (7 points, largeurs modifiables) | 3 fixes (1024 / 640) | ★ |
| **Unités avancées** : `clamp()`, `min()`, variables CSS dans les champs | Divi 5 | px / rem / em / % / vh / vw | ★★ |
| **Disposition flex et grille visuelle** (ordre, retour à la ligne, éditeur de grille) | Divi 5 | Grille 12 colonnes + alignements | ★★ |
| **Sélection multiple et modification en lot** | Divi 5 | Rien | ★★ |
| **Barre de commandes** (Ctrl+K : ajouter un widget, aller à un réglage, changer de page) et **recherche dans les réglages** | Divi 5 | Rien | ★★★ (peu coûteux) |
| **En-tête et pied de page construits en blocs**, menus éditables, popups / menu hors écran (« canvases ») | Divi 5, Webflow | En-tête et pied fixes, menu = liste des pages | ★★★ |
| **Interactions** : apparition au défilement, popups, ouvrir/fermer | Divi 5, Elementor 4 | Survol uniquement | ★★ |
| **Traduction automatique** en lot, **vue tableau** des traductions, adresses traduites par langue (`/nl/over-ons/`) | Framer | Traduction manuelle, même adresse dans toutes les langues | ★★★ |
| **Attributs personnalisés et balises sémantiques** (nav, article, header, aria-label) | Divi 5 | Balise de section seulement | ★★ |
| **Boucles / contenu répété** (actualités, membres, agenda depuis une liste) | Divi 5 (Loop Builder), Webflow/Framer (CMS) | Rien | ★★ (utile au MAB : liste des médias membres) |
| **Agent IA dans l'éditeur** | Divi 5, Framer | Rien | ★ (voir §3 : version locale) |

À noter : la critique d'Elementor 4 relève qu'un système de classes mal pensé (limite de classes, pas de CSS perso, pas de vraies listes HTML dans les textes) frustre les utilisateurs avancés. Leçon : garder les presets simples, laisser une porte « CSS perso » pour les experts, et ne jamais casser l'édition directe.

## 2. Le web de 2026 : ce qu'on peut utiliser sans dépendance

- **Requêtes de conteneur** (disponibles partout) : une carte s'adapte à la largeur de sa colonne, pas seulement à celle de l'écran. Idéal pour nos widgets (carte, tarif, encadré) placés dans des colonnes de tailles variées.
- **Typographie et espacements fluides** avec `clamp()` (méthode Utopia : une échelle de tailles calculée entre un mobile et un écran large). Supprime la plupart des réglages par appareil : un titre « grand » grandit tout seul.
- **Transitions entre pages** (View Transitions) : même document dans Chrome, Safari 18 et Firefox 144 ; entre documents, Chrome et Safari. Une ligne CSS `@view-transition { navigation: auto; }` rend la navigation du site exporté fluide, et les navigateurs qui ne la gèrent pas l'ignorent.
- **Animations au défilement en pur CSS** (`animation-timeline: view()`) : Chrome 115+, Safari 26 ; Firefox en préversion → à proposer avec repli (pas d'animation) et toujours désactivées si le visiteur préfère moins de mouvement.
- **Images** : `srcset`/`sizes` (plusieurs tailles), `fetchpriority="high"` sur l'image principale du haut de page (meilleur LCP), `loading="lazy"` ailleurs. AVIF par `canvas.toBlob` n'est pas fiable partout : le navigateur renvoie un PNG sans prévenir → tester le type du résultat et garder WebP en repli.
- **IA intégrée à Chrome, sur l'appareil** : API Translator et Language Detector stables depuis Chrome 138 ; Writer, Rewriter et Proofreader encore en test. Traduction FR→NL/DE/EN **sans serveur ni clé**, cohérente avec la philosophie hors-ligne. Uniquement dans Chrome ordinateur, modèle téléchargé une fois → bouton visible seulement si disponible.

## 3. Obligations légales : l'accessibilité

- L'**European Accessibility Act** s'applique depuis le 28 juin 2025 (période de transition jusqu'en 2030 pour l'existant). Référence technique : EN 301 549, donc **WCAG 2.1 AA**. Les microentreprises (moins de 10 personnes et moins de 2 M€ de chiffre d'affaires) ont des exemptions partielles ; une ASBL n'est concernée que si elle fournit un des services visés. Les sites publics belges relèvent déjà de la directive sur l'accessibilité web. Une **déclaration d'accessibilité** est demandée.
- Les **ATAG 2.0** (règles pour les outils de création) demandent que l'outil aide à produire du contenu accessible : invites pour le texte alternatif, contrôle du contraste, titres dans l'ordre, et un éditeur lui-même utilisable au clavier.
- Pour Atelier, c'est un vrai argument face à Wix ou Divi : **« accessible par défaut, vérifié avant export »**.

## 4. Les manques de notre propre code (audit honnête)

1. **Images stockées en base64 dans le projet** : le JSON grossit vite (une galerie de 20 photos = plusieurs Mo, enregistrés à chaque frappe). → Stocker les fichiers à part dans IndexedDB (Blob), le projet ne garde qu'une référence.
2. **Une seule taille d'image** exportée → pas de `srcset`, pas de priorité pour l'image principale.
3. **Re-rendu complet du contenu** de la page à chaque modification depuis l'inspecteur : bien pour 10 sections, lent au-delà de 50.
4. **Annuler/rétablir seulement en mémoire** : pas d'historique de versions (« revenir à hier »).
5. **Publication = zip à déposer à la main.**
6. **Aucun contrôle de contraste** ni d'ordre des titres ; aucun test d'accessibilité automatique du site exporté.
7. **Adresses non traduites** : une page « Équipe » devient `/de/equipe/` au lieu de `/de/team/`.
8. **L'éditeur lui-même** n'est pas entièrement utilisable au clavier (glisser-déposer à la souris uniquement).

## 5. Feuille de route proposée (cycles courts, tests d'abord)

| Cycle | Contenu | Pourquoi d'abord |
|---|---|---|
| **7 — Système de design** ✅ | Variables (couleurs, espacements, tailles de texte fluides `clamp()`), presets de style nommés et liés (« Bouton principal »), rechercher-remplacer couleur → variable, champs acceptant `clamp()`/`var()` | C'est ce qui sépare un « constructeur de pages » d'un vrai outil ; tout le reste en profite |
| **8 — Productivité** ✅ | Barre de commandes Ctrl+K, recherche dans les réglages, sélection multiple, vue « 3 appareils côte à côte » dans l'onglet Style, déplacement au clavier (accessibilité de l'éditeur) | Peu coûteux, gros gain au quotidien |
| **9 — Composants et structure du site** ✅ | Composants réutilisables avec emplacements, en-tête/pied en blocs, éditeur de menu, popups / menu mobile, balises sémantiques et attributs aria | Les sites réels (MAB) en ont besoin |
| **10 — Accessibilité et performance** ✅ | Contraste WCAG AA en direct, ordre des titres, déclaration d'accessibilité générée (FR/NL/DE/EN), images en Blob + `srcset` + priorité LCP, transitions entre pages, tests axe-core du site exporté | Obligation légale et argument commercial |
| **11 — Langues** ✅ | Traduction automatique sur l'appareil (Chrome Translator API) en lot avec relecture, vue tableau des traductions, adresses traduites par langue | Le multilingue est la promesse n°1 d'Atelier |
| **12 — Publication et versions** ✅ | Instantanés de versions (IndexedDB), publication en un clic : (a) `publish.php` sur OVH (aussi pour le formulaire), ou (b) dépôt GitHub + intégration Git d'OVH (webhook, sans PHP) | Fin du zip manuel |
| **13 — Contenus répétés** ✅ | Collections (médias membres, actualités, agenda) avec carte et page de détail dessinées une fois, champs reliés, iCal, RSS, données structurées | Base stabilisée : on y va |
| **14 — Relecture à plusieurs** ✅ | Relecture et édition à plusieurs en pair-à-pair (CRDT type Yjs, héritier du Web Reviewer), commentaires signés | Après les collections |

Recommandation : **7 puis 8** en premier (environ deux sprints), parce que les variables et presets changent le format des données ; les faire tard obligerait à migrer tous les projets existants.

## Sources
- Divi 5, liste des nouveautés : https://help.elegantthemes.com/en/articles/12331954-exploring-divi-5-s-new-features
- Divi 5, presets : https://www.elegantthemes.com/blog/theme-releases/preset-based-design
- Divi 5, variables de design : https://elegantthemes.com/blog/theme-sneak-peeks/divi-5-sneak-peek-divi-design-variables
- Elementor 4 atomique : https://theplusaddons.com/blog/elementor-atomic-editor-explained/
- Webflow, modes de variables : https://webflow.com/updates/variable-modes
- Framer, localisation : https://www.framer.com/updates/localization
- Puck 0.20 : https://puckeditor.com/blog/puck-020
- Chrome, API d'IA intégrées : https://developer.chrome.com/docs/ai/built-in-apis
- View Transitions 2025 : https://developer.chrome.com/blog/view-transitions-in-2025
- Animations au défilement : https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- AVIF et canvas.toBlob : https://dev.to/dailytechid/canvastoblob-can-silently-hand-you-back-a-png-when-it-cant-encode-what-you-asked-for-4blo
- Utopia, échelles fluides : https://smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/
- European Accessibility Act : https://www.accessibility.works/european-accessibility-act/
- ATAG 2.0 : https://www.w3.org/WAI/AU/2009/ED-ATAG20-20090909/Overview.html
- OVHcloud, intégration Git : https://docs.ovhcloud.com/fr/guides/web-cloud/web-hosting/git-integration-webhosting
- Yjs : https://docs.yjs.dev/llms-full.txt
