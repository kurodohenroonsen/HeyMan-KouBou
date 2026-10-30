# Consigne de traduction du guide (cycle 22)

Source : `docs/guide/*.md` (français, référence). Cible : `docs/guide/en/` (anglais) ou `docs/guide/ja/` (japonais), **mêmes noms de fichiers**.

## Règles
1. **Termes de l’interface identiques à l’éditeur** : chaque nom de bouton, onglet, fenêtre, menu, message cité dans le guide doit être écrit **exactement** comme l’éditeur l’affiche dans la langue cible. Les traductions de l’éditeur sont dans `i18n/parts/*.en.json` et `i18n/parts/*.ja.json` (clé = texte français exact) ; cherche-y le texte français cité (`grep -h '"Texte français"' i18n/parts/*.<lang>.json`). Pour le reste, suis `docs/i18n-glossaire.md` (style compris : anglais britannique simple ; japonais です・ます調, 「」 pour les citations).
2. **Ne pas traduire** : les blocs ```log … ``` (extraits réels du journal, capturés en français : garde-les tels quels), le code (`code`, blocs de code, commandes), les codes du journal (`page.add`), les noms de fichiers, URL, raccourcis (Ctrl, ⌘ ; mais noms de touches : Maj → Shift, Échap → Esc, Suppr → Delete, Entrée → Enter), les noms de produits.
3. Au début de chaque chapitre traduit, juste sous le titre, une ligne : EN « *The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).* » — JA 「*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*」
4. **Liens** : `journaux/x.log` → `../journaux/x.log` ; un lien vers un autre chapitre `NN-xxx.md#ancre` → `NN-xxx.md` **sans ancre** (les ancres dépendent des titres traduits), en gardant le numéro de section dans le texte (« §2.5 ») ; un lien vers une section **du même chapitre** → l’ancre du titre traduit (règle GitHub : minuscules, ponctuation retirée, espaces → `-` ; les caractères japonais restent) ; `index-codes.md` reste `index-codes.md` ; `../xxx` → `../../xxx`.
5. Garder les numéros de section (« ## 2.5 … »), les tableaux, l’ordre, la structure ; traduire tout le texte, y compris les tableaux (sauf colonnes de codes).
6. Qualité : un guide d’utilisation clair pour une personne non technique (Laurent, Misako). Pas de traduction mot à mot lourde.
7. Écris chaque fichier en entier (pas de troncature, pas de « … reste identique »). Vérifie à la fin : même nombre de titres `##`/`###` et de blocs ```log que le français, aucun bloc ```log modifié (compare-les), aucun lien vers `journaux/` sans `../`.

## Rapport final (court)
Fichiers écrits, vérifications faites (titres, blocs log, liens), termes de l’interface introuvables dans les catalogues (et ce que tu as mis), points douteux.
