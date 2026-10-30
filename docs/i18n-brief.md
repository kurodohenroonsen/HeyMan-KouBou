# Consigne de traduction de l’interface (cycle 22) — pour chaque lot

Projet : `/home/claude/atelier2` (éditeur de sites Atelier, JS vanilla, modules ES, sans dépendance). L’interface et le journal sont en français ; on ajoute l’anglais et le japonais, le français restant la langue source et la clé.

## Outils déjà en place (ne pas les modifier sans raison)
- `core/ui-i18n.js` : `__('Texte')`, `__('Texte {name}', { name })`, gabarit `` __`Texte ${x} et ${y}` `` (clé « Texte {0} et {1} »), pluriel `__n(n, '{n} élément', '{n} éléments')`, contexte `__c('undo', 'Annuler')`, marqueur `N_('…')`, et `fmtNumber`, `fmtDate`, `uiLocale()` pour les nombres et dates.
  Import : `import { __, __n, __c, N_ } from '../core/ui-i18n.js';` (depuis `editor/`) ou `'./ui-i18n.js'` (depuis `core/`).
- Le catalogue de la langue choisie est chargé **avant** les modules : `__()` marche aussi au niveau du module (constantes).
- `node tools/i18n.mjs extract` (liste `i18n/sources.json`), `node tools/i18n.mjs check [fichier]` (manquants, placeholders, conflits), `node tools/i18n.mjs build` (génère `i18n/en.js`, `i18n/ja.js`).
- Traductions : **tes** fichiers `i18n/parts/<lot>.en.json` et `i18n/parts/<lot>.ja.json` (objet `{ "texte français exact": "traduction" }`). `i18n/parts/00-commun.*.json` contient les mots courants (Annuler = Cancel, Fermer…) : réutilise-les, ne les redéfinis pas autrement (sinon conflit).
- Glossaire et règles de style : `docs/i18n-glossaire.md` (à suivre strictement).

## Ce qu’il faut faire dans tes fichiers
1. Entourer **chaque texte visible par la personne** : libellés, boutons, titres de fenêtres, `title`, `aria-label`, `placeholder`, `confirm()`, `prompt()`, `toast()`, textes d’état, messages d’erreur affichés, **et les messages du journal** (`log.info/debug/warn/error/trace('code', MESSAGE, data)`, `f.step(sub, MESSAGE…)`, `f.ok(MESSAGE…)`, `f.fail(err, data, MESSAGE)`, `f.warn(sub, MESSAGE…)`, `f.cancel(MESSAGE)`, `log.flow(code, MESSAGE…)`). Les **codes** et les **données** du journal ne changent jamais.
2. Pluriels du type `${n} élément${n > 1 ? 's' : ''}` → `__n(n, '{n} élément', '{n} éléments')`. Morceaux de phrase assemblés avec des conditions → phrases complètes séparées, chacune traduisible.
3. Dates et nombres formatés en `fr-BE` / `toLocaleString('fr…')` pour l’affichage → `fmtDate` / `fmtNumber` / `uiLocale()`.
4. **Ne pas traduire** : contenu des sites (textes par défaut des widgets et modèles, exemple du MAB dans `editor/demo.js`), consignes et catalogues envoyés au modèle d’IA (`core/ai-tasks.js` : prompts système ; `core/assistant.js` : `catalogText` / descriptions pour le modèle), entrées de test du banc d’essai (`benchFixtures`), le gabarit PHP de `core/publish.js`, sélecteurs CSS, attributs `data-*`, noms de fichiers, URL, identifiants, expressions régulières, chaînes comparées par le code (si du code compare un texte affiché, garder la logique cohérente), les noms de langue (« Français », « Nederlands »…).
5. Écrire les traductions **en** et **ja** de toutes les chaînes de tes fichiers dans tes deux fichiers de lot. Vérifier : `node tools/i18n.mjs check <fichier>` → 0 manquante pour chacun de tes fichiers ; aucun conflit ; mêmes `{…}`.
6. Ne modifie que tes fichiers (liste du lot) et tes deux fichiers de traduction. Si une chaîne d’un autre fichier te manque, ne la touche pas : signale-la dans ton rapport.

## Vérifier sans rien casser (la machine n’a que 2 cœurs, d’autres lots tournent en même temps)
- `npm test` (tests unitaires, en français : ils doivent tous rester verts ; les tests e2e et unitaires vérifient des textes français, qui ne changent pas).
- **Seulement** les specs de bout en bout qui touchent tes fichiers, une à la fois : `node tools/e2e/run.mjs http://localhost:8791/ /tmp/claude-0/-home-claude/31bec845-c6cd-562f-9f49-62956b94fdb1/scratchpad/shots-<lot> <spec>` (le serveur statique tourne déjà sur 8791 ; ne le relance pas). Ne lance **jamais** toute la suite. Specs : cycle2 … cycle21, c16-edition, c16-contenus, c16-langues-ia, c16-collab.
- `node tools/i18n.mjs build` puis, pour voir tes écrans : `node tools/e2e/run.mjs … cycle22` (vérifie qu’aucun texte français ne reste visible en anglais et en japonais ; il échouera tant que les autres lots ne sont pas finis : regarde seulement les lignes qui viennent de tes écrans).
- Erreur fréquente : `__` utilisé dans un fichier sans l’import ; nom local `__` ; gabarit dont une expression contient elle-même du texte français (le sortir dans un `__()` séparé).

## Rapport final (court)
Fichiers modifiés, nombre de chaînes entourées, `check` par fichier (0 manquante), tests lancés et résultats, chaînes laissées volontairement en français (et pourquoi), points douteux de traduction.
