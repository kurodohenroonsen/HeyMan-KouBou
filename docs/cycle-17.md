# Cycle 17 — Contenus intelligents

## Recherche (résumé)
- **Prompt API** : image dans le message (`{ type: 'image', value: Blob | ImageBitmap | canvas… }`, plusieurs images possibles), `expectedInputs: [{ type: 'image' }, { type: 'text', languages }]`, réponse forcée par `responseConstraint` (schéma JSON ; le schéma compte dans la fenêtre de contexte, `omitResponseConstraintInput` existe mais demande alors de décrire le format dans la consigne). Débordement de contexte : `QuotaExceededError`. Le modèle est petit : il faut **vérifier chaque valeur** et ne jamais créer de contenu publié sans relecture.
- **Summarizer** : `type` = `key-points` (3, 5 ou 7 points selon `length`), `tldr`, `teaser` (« les parties les plus intéressantes, pour donner envie de lire » : c'est exactement un chapô), `headline` (12, 17 ou 22 mots) ; `format` `plain-text` ou `markdown` ; `sharedContext` à la création, `context` à chaque appel ; langues en, ja, es, de, fr.
- **Affiches** : la date est souvent écrite sans année (« sam. 14 déc. ») ou en toutes lettres, l'heure en « 20h30 », le site sans `https://`. Ces formats se normalisent mieux **dans le code** que dans la consigne : le modèle rend ce qu'il lit, le code convertit et vérifie.
- **Palette depuis un logo** : une IA n'est pas nécessaire. Les couleurs dominantes se calculent dans le navigateur (pixels du logo, regroupement), les rôles (principale, secondaire, texte, fond, discrète, surface) s'en déduisent, et notre module de contraste corrige la clarté jusqu'à ce que **toutes** les paires de la palette passent WCAG AA. Résultat déterministe, testable, et qui marche dans tous les navigateurs.

## Spécification

### A. Affiche photographiée → élément (toute collection, idéal pour l'agenda)
- Collection → onglet Éléments → **✨ Depuis une affiche** : choisir une photo (ou glisser-déposer).
- La photo va au modèle **sur l'appareil** avec un schéma JSON construit à partir des champs de la collection : texte, texte mis en forme (rendu en texte simple), date, heure, lien, e-mail, nombre, choix (liste fermée des valeurs), oui/non ; les champs image sont exclus. Pour une date : le modèle dit aussi si l'année figure sur l'affiche.
- Le code **normalise et vérifie** chaque valeur : dates `14/12/2026`, `14.12.26`, `2026-12-14`, `14 décembre 2026`, `sam. 14 déc.` → `AAAA-MM-JJ` (sans année : prochaine date à venir à partir d'aujourd'hui) ; heures `20h30`, `20 h`, `8:30 pm` → `HH:MM` ; liens sans schéma → `https://` ; choix par valeur ou par libellé (dans toutes les langues) ; puis `cleanValue` de la collection. Une valeur refusée est écartée **et signalée** (champ, valeur lue, raison).
- **Aperçu** avant création : chaque champ trouvé, chaque champ écarté ; « Créer le brouillon ». L'élément est créé **en brouillon**, la photo devient son image (importée comme toute image, en WebP), les textes générés sont marqués « à relire ». Une seule étape d'annulation.

### B. Texte collé → éléments
- **✨ Depuis un texte collé** : coller un e-mail, une liste de membres, un programme. Le modèle renvoie une liste d'éléments (30 au plus) selon le même schéma, chacun normalisé et vérifié comme en A.
- Aperçu : une ligne par élément (titre, champs trouvés, champs écartés), une case à cocher par élément ; « Créer N brouillons ». Les doublons (même titre qu'un élément existant ou qu'un autre élément proposé) sont signalés et décochés.

### C. Chapô et titres (collections avec un champ « chapô » ou « résumé », et un texte)
- Dans le formulaire d'un élément : **✨** à côté du chapô (Summarizer `teaser` court, sinon Prompt API ; 220 caractères au plus) et **✨** à côté du titre (3 titres différents, 90 caractères au plus, cliquer pour choisir). Langue affichée ; néerlandais par traduction. Proposition → « Remplacer » ; marqué « à relire » ; Ctrl+Z.

### D. Résumé de la relecture
- Panneau 💬 → **📋 Résumé** : toujours disponible, sans IA : nombre de commentaires ouverts et résolus, par page, par auteur, le plus ancien en attente. Avec l'IA : **les points clés** (Summarizer `key-points`, sinon Prompt API) et une **liste de tâches** (une par commentaire ouvert, reformulée à l'impératif, avec « Aller à »). Rien n'est modifié : c'est une lecture. Bouton « Copier » (texte simple, pour un e-mail à l'équipe).

### E. Palette depuis le logo (sans IA)
- Panneau Site → Palette → **🎨 Palette depuis le logo** (si un logo importé existe ; sinon choisir une image).
- Couleurs dominantes (pixels opaques, regroupés), rôle de chacune, puis corrections de contraste. Aperçu : les 6 couleurs, les 7 paires de contraste avec leur ratio, les corrections faites (« principale assombrie de #e30613 à #c1050f pour le texte blanc des boutons »). « Appliquer » en une étape d'annulation. Logo sans couleur vive : la couleur principale reste celle du site, l'aperçu le dit.

### Journal
- Tâches d'IA : parcours `ai.extract`, `ai.excerpt`, `ai.headlines`, `ai.review-summary` (mêmes étapes que les autres tâches : appel, réponse, repli, traduction, refus).
- Interface : `smart.poster.*`, `smart.paste.*`, `smart.excerpt.*`, `smart.headlines.*`, `smart.review.*`, `smart.palette.*` ; chaque valeur écartée est une ligne `ai.extract.dropped` (WARN) avec le champ, la valeur lue et la raison.

## Tests écrits d'abord
- `tests/smart.test.js` : schéma construit depuis les champs ; normalisation des dates (formats, année manquante → prochaine occurrence, dates impossibles), heures, liens, choix par libellé ; valeurs écartées avec raison ; texte mis en forme ; extraction d'une affiche (image transmise, multimodal requis) et d'un texte (plusieurs éléments, plafond, doublons) avec faux fournisseur ; traduction vers le néerlandais des champs multilingues ; chapô (Summarizer teaser ou repli, coupe propre) ; titres (3, uniques, coupés) ; résumé de relecture sans IA (comptes par page et par auteur) et avec IA (points clés en liste, tâches reliées aux commentaires) ; couleurs dominantes (pixels transparents ignorés, regroupement), palette (rôles, toutes les paires AA, corrections listées, logo gris).
- `tools/e2e/cycle17.mjs` (faux Gemini Nano) : affiche → aperçu → brouillon avec image ; valeur écartée ; texte collé → 3 brouillons dont un doublon décoché ; chapô et titres ; résumé de relecture avec et sans IA ; palette depuis le logo appliquée puis annulée ; journal attendu de chaque cas, extraits pour le guide.

## Livré
- `core/smart.js` (sans IA, testé) : schéma JSON d'un élément depuis les champs de la collection ; normalisation des dates d'affiche (formats numériques, mois en lettres FR/NL/DE/EN, année manquante → prochaine occurrence, année inventée ignorée), heures (`20h30`, `8 pm`…), liens sans `https://`, nombres, choix par valeur ou par libellé dans toutes les langues, texte → texte mis en forme ; valeurs écartées avec leur raison ; doublons ; résumé chiffré de la relecture ; couleurs dominantes d'une image ; palette c1…c6 avec corrections de contraste jusqu'à WCAG AA pour les sept paires.
- `core/ai-tasks.js` : `extractItems` (image ou texte → éléments vérifiés, traduction des champs multilingues si la langue principale n'est pas parlée par Gemini Nano), `excerpt` (Summarizer `teaser`, sinon Prompt API), `headlines` (3 titres uniques), `reviewSummary` (Summarizer `key-points` + tâches par commentaire, ids vérifiés, commentaires oubliés repris tels quels).
- Éditeur (`editor/smart-ui.js`) : **✨ Depuis une affiche** et **✨ Depuis un texte** dans chaque collection (aperçu, valeurs écartées signalées, doublons décochés, brouillons, photo importée comme image de l'élément, textes « à relire », une étape d'annulation) ; **✨ Proposer** (chapô) et **✨ Titres** dans le formulaire d'un élément ; **📋 Résumé de la relecture** (sans IA, puis points clés et tâches avec « Aller à », copie) ; **🎨 Palette depuis le logo** dans le panneau Site ; Ctrl+K pour la palette et le résumé.
- Journal : `smart.*` et `ai.extract`, `ai.excerpt`, `ai.headlines`, `ai.review-summary` ; chapitre 12 du guide avec extraits réels ; repérage des parcours déclarés avec une condition (`const f = a ? log.flow(…) : log.flow(…)`).

## Corrigé en cours de route
- Fenêtres de la palette et du texte collé : « null » s'affichait à la place d'un bloc absent.
- Fenêtre d'une collection : les nouveaux boutons décalaient la liste des éléments (grille du panneau latéral).

## Tests
- Unitaires : 312 (dont 12 nouveaux pour `core/smart.js` et les tâches).
- Bout en bout : `cycle17`, 90 vérifications avec un faux Gemini Nano (affiche, valeur écartée, IA sans images, texte collé avec doublon, chapô par Summarizer et par repli, titres, Ctrl+Z, résumé de la relecture avec et sans IA, palette appliquée puis annulée, logo gris, logo transparent, Ctrl+K).
- Régression complète : 1388 vérifications de bout en bout (cycles 2 à 17), 0 échec.
