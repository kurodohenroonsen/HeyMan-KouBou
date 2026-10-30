# 5. Langues et traductions

Un site Atelier peut exister en plusieurs langues (français, néerlandais, allemand, anglais, japonais). Tu écris dans la langue principale, puis tu traduis : à la main dans le tableau des traductions, automatiquement **sur ton ordinateur** (traducteur intégré à Chrome, rien n'est envoyé à un serveur), ou en passant un fichier CSV à un traducteur.

**Domaines du journal** : `i18n.*` (tableau des traductions : ouverture, filtres, saisie, relecture, CSV), `translate.*` (traduction sur l'appareil : état du traducteur par paire de langues, téléchargement du modèle, traduction d'un lot, échecs), `settings.lang-*` (langues du site, panneau Site).

---

## 5.1 Choisir les langues du site

**But** : ajouter ou retirer une langue, et changer la langue affichée dans l'éditeur.

**Étapes**
1. Panneau de gauche, onglet « Site » : coche ou décoche une langue (la langue principale ne se décoche pas).
2. En haut, le menu des langues change la langue **affichée** dans le canevas (tu édites alors cette langue).

**Ce que tu vois** : la langue apparaît dans le menu du haut et comme colonne dans le tableau des traductions ; ses textes sont « à traduire ». Une langue retirée disparaît du site publié, mais ses traductions restent dans le projet (la recocher les retrouve).

**Journal attendu** ([`journaux/langues-site.log`](journaux/langues-site.log), lignes `canvas.*` omises)
```log
<<langues-site|settings.lang-remove,store.view,settings.lang-add>>
```
À vérifier : `settings.lang-remove` puis `settings.lang-add` avec la liste `languages` à jour ; `store.view` avec `lang=nl` quand tu changes la langue affichée.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Changer la langue affichée | le canevas se recharge dans cette langue | `store.view` `{"lang":"nl"}` puis `canvas.load.*` (chapitre 2) |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Décocher la langue principale | impossible (case grisée) | rien | change d'abord la langue principale |

---

## 5.2 Ouvrir le tableau des traductions, filtrer, chercher, saisir

**But** : voir tous les textes du site, une colonne par langue, et compléter ce qui manque.

**Étapes**
1. Barre du haut : « 🌐 Traductions » (ou Ctrl+K « Tableau des traductions »).
2. Filtre : « Tous les textes », « À traduire seulement » ou « Traductions automatiques à relire ». Champ « Chercher un texte… ».
3. Clique dans une case et tape la traduction ; elle est enregistrée quand tu quittes la case.
4. « Aller à » ferme le tableau et montre le texte dans la page.

**Ce que tu vois** : en haut, « 24 textes · 59 traductions manquantes · 6 à relire » ; les cases manquantes sont teintées.

**Journal attendu** ([`journaux/langues-tableau.log`](journaux/langues-tableau.log))
```log
<<langues-tableau|i18n.open,translate.absent,i18n.filter,i18n.edit>>
```
À vérifier : `i18n.open` donne le nombre de textes visibles (`visible`), de traductions manquantes (`missing`) et à relire (`review`), et la langue cible de la traduction automatique (`mtLang`). Juste après, une ligne `translate.*` dit si le traducteur de Chrome est disponible (ici `translate.absent` : le navigateur de test n'a pas l'API). `i18n.filter` donne le filtre et le nombre de lignes ; `i18n.edit` la clé du texte, la langue et la longueur saisie.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Recherche | la liste se réduit à chaque lettre | `i18n.search` (TRACE : visible seulement avec `?trace`) `{"len":4,"visible":1}` |
| Plus de 300 textes | bouton « Afficher plus » | `i18n.more` (DEBUG) `{"shown":600,"visible":812}` |
| « Aller à » | le tableau se ferme, le texte est sélectionné dans la page | `i18n.go` (DEBUG) avec `key` et `lang`, puis `store.select` |
| Case vidée | la traduction est retirée (la langue principale s'affiche à la place) | `i18n.edit` avec `"empty":true` |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Texte refusé (langue absente du site, clé disparue pendant la saisie) | message d'erreur rouge | `i18n.edit-fail` (WARN) avec `key`, `lang` et l'erreur | ferme et rouvre le tableau ; si ça se répète, envoie le journal |

---

## 5.3 Traduire automatiquement sur l'appareil

**But** : remplir d'un coup les traductions manquantes d'une langue, sans envoyer les textes à un service en ligne.

**Étapes**
1. Dans le tableau, « ✨ Traduction automatique » : choisis la paire (ex. « FR → EN »).
2. Le message sous la barre dit si le traducteur est prêt ou s'il sera téléchargé.
3. « Traduire les textes manquants » ; « Arrêter » interrompt à tout moment.

**Ce que tu vois** : « Traduction en English : 12 / 21… », puis « Terminé : 21 textes traduits. Relisez-les : ils sont marqués « à relire » ». Le filtre passe sur « à relire ».

**Journal attendu** — traducteur de Chrome, modèle à télécharger ([`journaux/langues-translator-chrome.log`](journaux/langues-translator-chrome.log))
```log
<<langues-translator-chrome|translate.status,translate.batch.start,translate.model.start,translate.model.download,translate.model.ok,translate.batch.ready,translate.batch.progress,translate.batch.ok>>
```
À vérifier : `translate.status` donne l'état **par paire** (`available`, `downloadable`, `downloading`) ; le parcours `translate.batch` contient le parcours `translate.model` (création du traducteur, avec la progression du téléchargement `translate.model.download`), puis `translate.batch.progress` tous les quarts environ, et `translate.batch.ok` avec `count`, `errors`, `total` et la durée totale entre crochets. Chaque texte traduit écrit aussi `translate.text` (TRACE : longueurs et durée), visible avec `?trace`.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Traducteur de test (tests automatiques) | « Traducteur de test » | `translate.status` `{"source":"test"}`, `translate.create` (DEBUG) au lieu de `translate.model.*` ([`journaux/langues-traduction-auto.log`](journaux/langues-traduction-auto.log)) |
| Même paire une deuxième fois | pas de téléchargement | `translate.reuse` (DEBUG) « déjà prêt » au lieu de `translate.model.*` |
| Tout est déjà traduit | « Terminé : 0 texte traduit » | `translate.batch.ok` `{"count":0,"total":0}` |
| Tu cliques « Arrêter » | « Interrompu : 7 textes traduits » ; ceux-là sont gardés | `translate.batch.cancel` (INFO) `{"count":7,"total":17}` ([`journaux/langues-traduction-arret.log`](journaux/langues-traduction-arret.log)) |
| Site à une seule langue | « Ce site n'a qu'une langue. » | `translate.single-lang` (DEBUG) |

Extrait « arrêter » :
```log
<<langues-traduction-arret|translate.batch.start,translate.batch.progress,translate.batch.cancel>>
```

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Navigateur sans API Translator (Firefox, Safari, Chrome < 138, mobile) | « La traduction automatique sur l'appareil demande Chrome 138… Vous pouvez aussi exporter le tableau en CSV » ; bouton grisé | `translate.absent` (WARN) avec le navigateur (`ua`) | Chrome récent sur ordinateur, ou export CSV (5.5) |
| Paire non proposée par Chrome | « Chrome ne propose pas la traduction FR → EN sur cet appareil. » | `translate.unavailable` (WARN) | autre paire, ou CSV |
| Chrome ne répond pas en 4 s | « Chrome ne répond pas pour la traduction automatique… » | `translate.timeout` (WARN) | relance Chrome ; regarde `chrome://on-device-internals` |
| `availability()` lève une erreur | « Traduction automatique indisponible : … » | `translate.status-fail` (WARN) avec `error.name` | envoie le journal |
| Téléchargement refusé (geste requis) | « Traduction automatique impossible : Requires a user gesture… » | `translate.model.fail` (ERROR) avec `hint` « Chrome exige un clic… », puis `translate.batch.fail` (ERROR) | reclique sur le bouton (le téléchargement doit partir d'un clic) |
| Certains textes échouent | « Terminé : 15 textes traduits, 5 échecs » | `translate.text-fail` (WARN) pour chacun (longueur, erreur), `translate.batch.errors` (WARN), puis `translate.batch.ok` avec `errors` | relance : seuls les manquants sont repris |

Extrait « erreurs du traducteur de Chrome » ([`journaux/langues-translator-erreurs.log`](journaux/langues-translator-erreurs.log)) :
```log
<<langues-translator-erreurs|translate.unavailable,translate.batch.start,translate.model.start,translate.model.fail,translate.batch.fail,translate.status-fail>>
```
Extrait « échecs partiels » ([`journaux/langues-traduction-echecs.log`](journaux/langues-traduction-echecs.log)) :
```log
<<langues-traduction-echecs|translate.batch.start,translate.text-fail,translate.batch.errors,translate.batch.ok>>
```

---

## 5.4 Relire les traductions automatiques

**But** : valider ce que la machine (traducteur ou IA locale) a écrit.

**Étapes**
1. Filtre « Traductions automatiques à relire ».
2. Corrige la case si besoin, puis « ✓ Valider ». Corriger le texte directement dans la page le valide aussi.

**Ce que tu vois** : l'étiquette « Traduction automatique à relire » disparaît ; le compteur « à relire » baisse. La vérification avant export (chapitre 8) rappelle ce qui reste à relire.

**Journal attendu** ([`journaux/langues-traduction-auto.log`](journaux/langues-traduction-auto.log))
```log
<<langues-traduction-auto|i18n.review-ok>>
```
`i18n.review-ok` (DEBUG) donne la clé et la langue validées, suivi de `store.commit`.

---

## 5.5 Exporter et importer un CSV pour un traducteur

**But** : faire traduire le site par une personne, dans un tableur.

**Étapes**
1. « ⇩ Export CSV » : un fichier `<site>-traductions.csv` (UTF-8, une colonne par langue, colonne `key` à ne pas toucher).
2. Le traducteur remplit les colonnes, enregistre en CSV (virgule ou point-virgule).
3. « ⇧ Import CSV » : les textes modifiés sont mis à jour.

**Ce que tu vois** : « Import terminé : 1 texte mis à jour, 1 ligne ignorée (texte supprimé ou inconnu). »

**Journal attendu** ([`journaux/langues-csv.log`](journaux/langues-csv.log))
```log
<<langues-csv|i18n.csv-export,i18n.csv-import.start,i18n.csv-import.parsed,i18n.csv-import.unknown-rows,i18n.csv-import.unknown-columns,i18n.csv-import.ok>>
```
À vérifier : `i18n.csv-export` (nombre de lignes, langues) ; le parcours `i18n.csv-import` : `parsed` (lignes et colonnes lues), puis `ok` avec `changed` (textes modifiés) et `unknown` (lignes refusées).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Lignes dont la clé n'existe plus (texte supprimé depuis l'export) | ignorées, comptées dans le message | `i18n.csv-import.unknown-rows` (WARN) avec les 5 premières clés |
| Colonne d'une langue absente du site (ex. `ja`) | colonne ignorée | `i18n.csv-import.unknown-columns` (WARN) |
| Rien n'a changé | « Import terminé : 0 texte mis à jour » | `i18n.csv-import.ok` `{"changed":0}` |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Fichier sans colonne `key` (pas un export d'Atelier) | « Fichier CSV non reconnu : la colonne key est absente… » | `i18n.csv-import.fail` (ERROR) avec le nom du fichier | repars d'un export d'Atelier ; garde la colonne `key` |

```log
<<langues-csv-invalide|i18n.csv-import.start,i18n.csv-import.parsed,i18n.csv-import.fail>>
```

---

## 5.6 Un site en japonais

**But** : publier une version japonaise (ou un site entièrement en japonais) sans texte français ni adresse cassée.

**Étapes**
1. Panneau « Site » : coche « 日本語 ». Pour un site **japonais d'abord**, choisis 日本語 comme **langue principale** au moment de créer le site (Fichier → Nouveau site vide, voir 1.5). Un projet `.json` dont la langue principale est le japonais garde aussi ce réglage quand tu l'ouvres (Fichier → Ouvrir un projet).
2. Traduis comme pour les autres langues (tableau, CSV ou traduction automatique ; la paire fr → ja est proposée par le traducteur de Chrome quand il la connaît).
3. Pour l'adresse d'une page en japonais, clique sur « Proposer depuis le titre traduit » (Pages) ou tape-la : elle est convertie automatiquement.

**Adresses (URL) des pages en japonais** : les adresses restent en lettres latines, chiffres et tirets (`a-z`, `0-9`, `-`). C'est le choix le plus sûr pour un hébergement OVH : pas de nom de dossier en UTF-8 abîmé par l'archive .zip, le transfert FTP ou `publish.php`, pas d'adresse illisible encodée en `%E3%83%81…` quand elle est copiée.
| Titre | Adresse proposée | Règle |
|---|---|---|
| チーム | `/ja/chiimu/` | kana transcrits en rōmaji (Hepburn, sans macron ; « ー » double la voyelle) |
| ｶﾞｲﾄﾞ, ＡＢＣ | `gaido`, `abc` | demi-chasse et pleine chasse ramenés à la forme normale |
| チーム紹介, 会社のチーム | `chiimu` | texte mêlé de kanji : seuls les katakana sont transcrits (les hiragana n'y sont que des terminaisons) |
| 会社案内, お問い合わせ | `page-1i2elyu`… | rien de lisible : adresse de repli `page-<empreinte>`, **stable** (même titre → même adresse) |

Tu peux toujours remplacer l'adresse proposée par la tienne (par ex. `kaisha-annai` ou `contact`).

**Ce que tu vois sur le site publié** : `<html lang="ja">`, liens `hreflang="ja"` et plan du site avec la version japonaise, menu des langues « JA » (ou « 日本語 »). Les textes ajoutés par Atelier suivent la **langue de la page**, jamais celle de l'éditeur : « 本文へ移動 » (aller au contenu), « メニュー », « 動画を再生 », « 地図を表示（Google マップ） », messages du formulaire, dates de l'agenda (« 2026年11月3日火曜日 »). Les pages japonaises reçoivent une pile de polices japonaises de repli (Hiragino, Noto Sans JP, Yu Gothic, Meiryo ; Hiragino Mincho, Noto Serif JP, Yu Mincho pour une police à empattements), placée après la police du thème : ses lettres latines restent celles du thème. Interlignage un peu plus grand et retours à la ligne stricts (kinsoku).

**Journal attendu** : les mêmes codes que pour les autres langues (`settings.lang-add` avec `"lang":"ja"`, `page.add` avec le `slug` en rōmaji, `translate.*` avec `from=fr`, `to=ja`).

---

## Codes de ce chapitre

| Code | Niveau | Sens |
|---|---|---|
| `i18n.csv-export` | INFO | tableau exporté en CSV (lignes, langues, taille) |
| `i18n.csv-import.start`, `i18n.csv-import.ok`, `i18n.csv-import.fail` | INFO / INFO / ERROR | import d'un CSV (nom, taille) ; résultat (`changed`, `unknown`) ; fichier refusé |
| `i18n.csv-import.parsed` | DEBUG | lignes et colonnes lues |
| `i18n.csv-import.unknown-rows` | WARN | lignes ignorées : clé inconnue |
| `i18n.csv-import.unknown-columns` | WARN | colonnes ignorées : langue absente du site |
| `i18n.edit` | DEBUG | traduction saisie dans une case (clé, langue, longueur) |
| `i18n.edit-fail` | WARN | traduction refusée |
| `i18n.filter` | DEBUG | filtre du tableau changé (nombre de lignes) |
| `i18n.go` | DEBUG | « Aller à » depuis le tableau |
| `i18n.more` | DEBUG | « Afficher plus » |
| `i18n.open` | INFO | tableau ouvert (textes, manquants, à relire, langues) |
| `i18n.review-ok` | DEBUG | traduction automatique validée |
| `i18n.search` | TRACE | recherche dans le tableau |
| `settings.lang-add` / `settings.lang-remove` | INFO | langue ajoutée / retirée (panneau Site) |
| `translate.absent` | WARN | pas d'API Translator dans ce navigateur |
| `translate.batch.start`, `translate.batch.ok`, `translate.batch.cancel`, `translate.batch.fail` | INFO / INFO / INFO / ERROR | traduction automatique d'un lot : début, fin (`count`, `errors`, `total`, durée), arrêt, échec |
| `translate.batch.ready` | DEBUG | traducteur prêt, début du lot |
| `translate.batch.progress` | DEBUG | avancement (environ tous les quarts) |
| `translate.batch.errors` | WARN | des textes n'ont pas pu être traduits |
| `translate.create` | DEBUG | traducteur de test utilisé |
| `translate.model.start`, `translate.model.ok`, `translate.model.fail` | INFO / INFO / ERROR | création du traducteur de Chrome pour une paire (téléchargement compris) |
| `translate.model.download` | DEBUG | progression du téléchargement du modèle |
| `translate.reuse` | DEBUG | traducteur déjà prêt pour cette paire |
| `translate.single-lang` | DEBUG | site à une seule langue |
| `translate.status` | INFO | état du traducteur pour une paire |
| `translate.status-fail` | WARN | `Translator.availability()` a échoué |
| `translate.text` | TRACE | un texte traduit (longueurs, durée) |
| `translate.text-fail` | WARN | un texte n'a pas pu être traduit |
| `translate.timeout` | WARN | Chrome ne répond pas en 4 s |
| `translate.unavailable` | WARN | paire non proposée par Chrome sur cet appareil |
