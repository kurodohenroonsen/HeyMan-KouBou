# Cycle 18 — Demander à Atelier

## Principe
Tu écris ce que tu veux en français (ou en néerlandais, allemand, anglais) dans **Ctrl+K** : « ajoute une FAQ de 3 questions sur l’adhésion », « mets les titres de cette page en rouge », « crée une page pour présenter notre radio avec les horaires et un formulaire de contact ». Gemini Nano traduit la demande en **actions choisies dans une liste fermée** (celles qu'Atelier sait déjà faire) ; Atelier **vérifie** chaque action, montre un **aperçu**, puis applique tout en **une seule étape d'annulation**. Aucun code n'est généré, aucune action hors liste n'est possible : une action inconnue ou un paramètre invalide est refusé et expliqué.

## Recherche (résumé)
- Gemini Nano est un petit modèle : il comprend bien une consigne courte et un **schéma JSON** (`responseConstraint`) qui énumère les valeurs permises (noms d'actions, identifiants des modèles de section, types de widgets, langues). Les valeurs libres (couleurs dites « rouge », tailles « plus grand ») se normalisent **dans le code**, comme les dates du cycle 17.
- Les assistants d'éditeurs de sites (constructeurs de pages avec IA) suivent le même schéma : intention → plan d'opérations connues → aperçu → validation humaine. C'est aussi ce qui rendra Atelier pilotable par un agent du navigateur (WebMCP, cycle 19) avec le **même catalogue**.

## Catalogue fermé (core/assistant.js)
| Action | Paramètres | Effet |
|---|---|---|
| `add_section` | `template` (liste des modèles), `title`, `text` | ajoute un modèle de section après la sélection (ou en fin de page), titre et texte remplacés |
| `add_faq` | `title`, `questions` [{ `q`, `a` }] (8 au plus) | section Questions fréquentes avec les questions données |
| `add_widget` | `type` (titre, texte, bouton, image, espace, séparateur, citation, accordéon, vidéo, carte, réseaux, encadré, chiffres, carte de contenu), `text` | ajoute un widget après la sélection |
| `set_text` | `text` | remplace le texte de l'élément sélectionné (titre, texte, bouton, citation…) |
| `style` | `target` (sélection, titres, textes, boutons, section), `property` (couleur, fond, alignement, taille, graisse, casse, marges intérieures, arrondi), `value`, `device` | règle un style ; couleurs « rouge », « principale », `#c00` ; tailles « petit » à « très grand » ; alignement « centré »… |
| `set_palette` | `role` (principale, secondaire, texte, fond, discrète, surface), `color` | change une couleur de la palette (contraste vérifié dans l'aperçu) |
| `add_page` | `title`, `slug`, `sections` [{ `template`, `title`, `text` }] | crée une page avec ses sections et l'ouvre |
| `go_to_page` | `page` | ouvre une page (titre approchant) |
| `set_view` | `device`, `lang` | appareil ou langue affichés |
| `open_tool` | `tool` (référencement, IA, publier, traductions, versions, journal, vérification, commentaires, palette depuis le logo, résumé de la relecture) | ouvre une fenêtre |

## Spécification
- **Ctrl+K** : dès que la recherche fait au moins 3 mots, une ligne « ✨ Demander à Atelier : … » apparaît en tête ; Entrée l'ouvre. Aussi : Ctrl+K « Demander à Atelier », et **✨ Page décrite** dans le panneau Pages (demande préremplie « Crée une page … »).
- Fenêtre **✨ Demander à Atelier** : la demande (modifiable), « ✨ Préparer », puis l'**aperçu** : une ligne par action (« Ajouter la section « Questions fréquentes » avec 3 questions après « Héros » »), les actions refusées avec leur raison, les avertissements (contraste insuffisant, menu personnalisé qui ne montrera pas la nouvelle page, demande ambiguë). « Appliquer » : toutes les modifications en **une** étape d'annulation, puis les changements de vue et les fenêtres demandées.
- Contexte donné au modèle : pages (titres), page affichée et ses sections (résumé), élément sélectionné (type et extrait), langues, modèles de section et widgets disponibles. Jamais le contenu complet du site.
- Les textes écrits par l'IA sont marqués « à relire ».
- Sans IA : la fenêtre explique comment l'activer ; la recherche Ctrl+K habituelle reste.

## Journal
- `ai.plan.*` (tâche d'IA : appel, réponse, actions proposées, refusées) ; `assist.*` : `assist.open`, `assist.plan` (actions validées, refusées avec raison), `assist.rejected` (une ligne par action refusée), `assist.apply` (parcours : chaque action appliquée, erreurs, vue, fenêtres), `assist.cancel`.

## Tests écrits d'abord
- `tests/assistant.test.js` : schéma (énumérations), validation (action inconnue, modèle inconnu, valeur de style invalide, sélection requise, page inconnue, outil inconnu), normalisation (couleurs par nom et par rôle, tailles, alignements, appareils, langues), application (section après la sélection avec titre et texte, FAQ, widget, style sur tous les titres, texte de la sélection, palette avec avertissement de contraste, page avec sections et adresse unique, vue et outils), tâche `plan` avec faux fournisseur.
- `tools/e2e/cycle18.mjs` : Ctrl+K → demande → aperçu → appliquer → Ctrl+Z ; FAQ, titres en rouge, page décrite ; action refusée ; sans IA.

## Livré
- `core/assistant.js` (sans IA, testé) : catalogue fermé de 10 actions, schéma JSON pour le modèle (énumérations des actions, modèles de section, types d'éléments, réglages, outils, langues), consigne (catalogue) et contexte court (pages, sections de la page affichée, sélection), validation et normalisation (couleurs par nom FR/NL/DE/EN, par rôle ou en hexadécimal ; tailles ; alignements ; graisses ; casse ; marges ; arrondis), refus expliqués, avertissements (contraste de la palette, menu personnalisé, plus de 10 actions), application pure en une étape (sections après la sélection dans l'ordre demandé, FAQ, éléments, styles résolus au moment d'appliquer, texte de la sélection, palette, pages avec sections et adresse unique, vue, outils), liste des textes écrits par l'IA.
- `core/ai-tasks.js` : tâche `plan`.
- Éditeur (`editor/assistant-ui.js`) : fenêtre **✨ Demander à Atelier** (demande, exemples, aperçu, refus, avertissements, Appliquer) ; Ctrl+K : une phrase de 3 mots ou plus propose « ✨ Demander à Atelier : … » en tête, et la commande « Demander à Atelier » ; **✨ Page décrite** dans le panneau Pages ; textes marqués « à relire » ; outils demandés ouverts après application.
- Journal : `assist.*`, `ai.plan.*` ; chapitre 13 du guide.

## Tests
- Unitaires : 319 (dont 7 nouveaux pour l'assistant).
- Bout en bout : `cycle18`, 46 vérifications (Ctrl+K → FAQ → Ctrl+Z, titres en rouge et centrés, page décrite avec une section refusée et l'outil SEO ouvert, demande hors liste, fermeture sans appliquer, IA absente).

## Corrigé en cours de route
- Ctrl+K : une phrase qui est le nom exact d'une commande (« journal de débogage », « résumé de la relecture ») garde la commande en tête ; « Demander à Atelier » vient juste après.
- Régression complète : 1434 vérifications de bout en bout (cycles 2 à 18), 0 échec.
