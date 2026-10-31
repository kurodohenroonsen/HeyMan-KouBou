# 1. Démarrer, enregistrer, ouvrir

Atelier fonctionne entièrement dans le navigateur : le projet est enregistré **automatiquement sur cet appareil** (base locale IndexedDB du navigateur), et peut être enregistré ou ouvert en fichier `.json` pour le changer d'ordinateur ou le partager.

**Domaines du journal** : `boot.*` (démarrage), `storage.*` (base locale : projet, images, versions, jetons), `store.*` (historique des modifications, sélection, vue), `project.*` (fichiers .json, exemple, nouveau site, aperçu).

---

## 1.1 Ouvrir l'éditeur

**But** : retrouver son projet là où on l'a laissé.

**Étapes**
1. Ouvre l'adresse de l'éditeur dans Chrome (ou Edge, Firefox, Safari : tout fonctionne, sauf l'IA locale qui demande Chrome sur ordinateur).

**Ce que tu vois** : le dernier projet enregistré sur cet appareil, ou l'exemple du MAB la première fois. En haut à droite, l'état de l'enregistrement : « Enregistré ».

**Journal attendu** — projet retrouvé ([`journaux/demarrage-enregistre.log`](journaux/demarrage-enregistre.log))
```log
04:37:59.571 +0.00s INFO  boot.log Journal prêt {"console":"debug","keep":"debug","aide":"atelierDebug.copy() ou le bouton 🐞"}
04:37:59.574 +0.00s INFO  boot.start [boot#1] Démarrage d’Atelier (cycle 16) {"url":"http://localhost:8791/"}
04:37:59.588 +0.02s DEBUG storage.open Base locale ouverte {"ms":13}
04:37:59.589 +0.02s INFO  storage.load Projet rechargé depuis cet appareil {"slot":"current","name":"MAB – test du journal","pages":2,"images":0,"ms":14}
04:37:59.591 +0.02s INFO  boot.project [boot#1 · 17 ms] Projet enregistré sur cet appareil rechargé {"source":"saved","name":"MAB – test du journal","pages":2,"languages":["fr","nl","de","en"]}
04:37:59.618 +0.05s DEBUG storage.secret-read Aucun secret gardé {"name":"collab-session"}
04:37:59.833 +0.26s INFO  boot.ok [boot#1 · 259 ms] Éditeur prêt {"page":"p_asw1ynvz","lang":"fr"}
```
À vérifier : `boot.start` → `storage.load` → `boot.project` avec `"source":"saved"` → `boot.ok`. La durée de `boot.ok` est le temps de démarrage complet (canevas affiché).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Première visite sur cet appareil | l'exemple du MAB s'affiche | `storage.upgrade` (INFO, base créée `{"from":0,"to":3}`), `storage.load-empty` (INFO), `boot.project` avec `"source":"demo"` |
| Adresse avec `?fresh=1` | l'exemple s'affiche sans lire le projet enregistré (il n'est pas effacé ; il sera remplacé à la première modification) | `boot.project` avec `"source":"fresh"` ([`journaux/demarrage-fresh.log`](journaux/demarrage-fresh.log)) |
| Lien d'invitation (`#join=…`) | l'éditeur rejoint la session de collaboration | `boot.start` avec `"hash":"#join=…"`, puis `collab.*` (chapitre 10) |
| Base mise à jour par une autre version d'Atelier ouverte dans un autre onglet | « rechargez cette page » | `storage.version-change` (WARN) |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Navigation privée stricte, IndexedDB bloqué | l'éditeur s'ouvre avec l'exemple ; « Non enregistré » après la première modification | `storage.unavailable` ou `storage.open-fail` (ERROR), puis `storage.save-fail` (ERROR) | ouvre l'éditeur dans une fenêtre normale ; en attendant, Fichier → « Enregistrer le projet (.json) » |
| Un autre onglet d'Atelier bloque la mise à jour de la base | rien, l'éditeur attend | `storage.blocked` (WARN) | ferme les autres onglets d'Atelier |
| Projet enregistré illisible (version future, données abîmées) | l'exemple s'affiche | `boot.invalid-save` (WARN) avec les erreurs de validation | Fichier → « Versions… » : une version de sécurité peut le contenir ; envoie-nous le journal |
| Lecture de la base impossible | l'exemple s'affiche | `storage.load-fail` (ERROR) | envoie le journal ; vérifie l'espace disque |
| Des images manquent dans la base | les images concernées disparaissent du projet | `storage.assets-missing` (WARN) avec leurs identifiants | réimporte-les (chapitre 4) |
| L'éditeur ne s'affiche pas du tout | page blanche | console seulement : `boot.error` / `boot.resource` / `boot.rejection`, puis `boot.timeout` (ERROR) après 15 s ; `boot.fail` si le démarrage a échoué après le chargement | copie les lignes `[Atelier]` de la console (chapitre 0) |

---

## 1.2 Modifier : enregistrement automatique et historique

**But** : ne jamais perdre une modification.

**Étapes**
1. Modifie n'importe quoi (ici le nom du site, en haut à gauche).
2. Environ 0,6 s après la dernière modification, le projet est enregistré sur cet appareil.

**Ce que tu vois** : « Modifié », puis « Enregistré ».

**Journal attendu**
```log
04:38:00.380 +0.81s DEBUG store.commit Modification {"key":"site-name","source":"topbar","past":1,"page":"p_asw1ynvz"}
04:38:01.907 +2.34s DEBUG storage.save Projet enregistré sur cet appareil {"ms":1,"kb":12}
```
- `store.commit` : une modification entre dans l'historique ; `past` = nombre d'étapes qu'on peut annuler ; `key` regroupe les frappes rapides dans un même champ en une seule étape (`"merged":true` : « même étape d'annulation ») ; `source` = la partie de l'éditeur qui a modifié (topbar, inspector, canvas, site, pages, collections, remote…).
- `storage.save` : `kb` = poids du projet sans les images ; `newImages` = images écrites pour la première fois (elles ne sont écrites qu'une fois).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Ctrl+Z / Ctrl+Maj+Z (ou ↶ ↷) | retour en arrière / rétablir | `ui.key` puis `store.undo` / `store.redo` (INFO) avec le nombre d'étapes restantes ; rien à annuler : `store.undo-none` / `store.redo-none` (DEBUG) |
| Sélection d'un élément | | `store.select` (DEBUG) ; Maj+clic : `store.multi` (DEBUG) |
| Changement de page, de langue, d'appareil | | `store.view` (DEBUG) `{"pageId":…}`, `{"lang":"nl"}`, `{"device":"mobile"}` |
| Survol d'un élément du canevas | | `store.hover` (TRACE seulement) |
| Modification d'un composant, de l'en-tête, d'une carte de collection | bandeau « Vous modifiez… » | `store.edit-target` (INFO) ; retour : « Retour à la page » |
| Modification reçue d'un autre participant | | `store.remote` (DEBUG) avec le nombre d'opérations (chapitre 10) |
| Projet remplacé (fichier ouvert, exemple, nouveau site) | | `store.load` (INFO) |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Espace de stockage plein, base bloquée | « Non enregistré » | `storage.save-fail` (ERROR) avec l'erreur (`QuotaExceededError`…) ; quand ça remarche : `storage.save-recovered` (INFO) | enregistre tout de suite en .json ; libère de l'espace (images trop lourdes, vieilles versions) |
| Modification en mode relecture | « Mode relecture : vous pouvez parcourir et commenter (💬), pas modifier. » | `store.readonly` (WARN) | normal : demande les droits d'édition à l'hôte (chapitre 11) |
| Bogue : une partie de l'éditeur envoie un site invalide | rien ne change | `store.invalid` (ERROR) | envoie-nous le journal |

Extrait réel (espace plein simulé puis rétabli : [`journaux/enregistrement-impossible.log`](journaux/enregistrement-impossible.log))
```log
04:38:00.380 +0.81s DEBUG store.commit Modification {"key":"site-name","source":"topbar","past":1,"page":"p_asw1ynvz"}
04:38:00.981 +1.41s ERROR storage.save-fail Projet NON enregistré sur cet appareil : Quota dépassé (simulé) (espace plein, navigation privée ou IndexedDB bloqué) {"error":{"name":"QuotaExceededError","message":"Quota dépassé (simulé)","code":22},"name":"QuotaExceededError"}
04:38:01.306 +1.74s DEBUG store.commit Modification (même étape d’annulation) {"key":"site-name","source":"topbar","merged":true,"past":1,"page":"p_asw1ynvz"}
04:38:01.907 +2.34s DEBUG storage.save Projet enregistré sur cet appareil {"ms":1,"kb":12}
04:38:01.907 +2.34s INFO  storage.save-recovered Enregistrement rétabli
```

---

## 1.3 Enregistrer le projet en fichier (.json)

**But** : garder une copie, changer d'ordinateur, envoyer le projet.

**Étapes** : Fichier → « Enregistrer le projet (.json) », ou **Ctrl+S**.

**Ce que tu vois** : un fichier `nom-du-site.atelier.json` est téléchargé (images comprises) ; message « Projet enregistré en fichier .json. ».

**Journal attendu** ([`journaux/projet-enregistrer-json.log`](journaux/projet-enregistrer-json.log))
```log
04:38:04.372 +4.80s INFO  project.export-json Projet enregistré en fichier .json {"kb":34,"pages":2}
04:38:04.374 +4.80s INFO  ui.toast Message affiché : Projet enregistré en fichier .json.
```
Les jetons de publication ne sont **jamais** dans ce fichier (ils restent sur l'appareil, voir `storage.secret-*` au chapitre 8).

---

## 1.4 Ouvrir un projet (.json)

**But** : reprendre un projet enregistré en fichier.

**Étapes** : Fichier → « Ouvrir un projet (.json) », choisir le fichier.

**Ce que tu vois** : le projet remplace l'actuel ; message « Projet ouvert. ». Une version de sécurité du projet précédent est enregistrée (Fichier → Versions…), et Ctrl+Z revient en arrière.

**Journal attendu** ([`journaux/projet-ouvrir-json.log`](journaux/projet-ouvrir-json.log))
```log
04:38:04.404 +4.83s INFO  project.import.start [project.import#1] Ouverture d’un projet .json {"name":"mab.atelier.json","kb":34}
04:38:04.409 +4.84s DEBUG storage.version-save Version enregistrée {"id":"v_mvsztmnto9vrr"}
04:38:04.414 +4.84s INFO  store.load Projet chargé dans l’éditeur {"name":"MAB – Médias Alternatifs Belges","pages":2,"keepHistory":true}
04:38:04.417 +4.85s INFO  project.import.ok [project.import#1 · 13 ms] Projet ouvert {"pages":2,"name":"MAB – Médias Alternatifs Belges"}
04:38:04.418 +4.85s INFO  ui.toast Message affiché : Projet ouvert.
```

**Erreurs** ([`journaux/projet-ouvrir-json-erreurs.log`](journaux/projet-ouvrir-json-erreurs.log))
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Le fichier n'est pas du JSON (abîmé, coupé, autre format) | « Fichier illisible : ce n’est pas du JSON valide (…) » | `project.import.fail` (ERROR) avec la position de l'erreur | reprends une copie complète du fichier |
| JSON valide mais pas un projet Atelier (ou d'une version inconnue) | « Fichier illisible : Format de projet non reconnu (version 2 attendue). » (ou la première erreur de validation) | `project.import.invalid` (WARN) avec les 5 premières erreurs, puis `project.import.fail` (ERROR) | vérifie que c'est bien un fichier `.atelier.json` ; envoie-nous le journal si c'en est un |

```log
04:38:04.463 +4.89s INFO  project.import.start [project.import#2] Ouverture d’un projet .json {"name":"casse.json","kb":0}
04:38:04.468 +4.90s ERROR project.import.fail [project.import#2 · 5 ms] ce n’est pas du JSON valide (Expected double-quoted property name in JSON at position 19 (line 1 column 20)) {…}
04:38:04.490 +4.92s INFO  project.import.start [project.import#3] Ouverture d’un projet .json {"name":"invalide.json","kb":0}
04:38:04.492 +4.92s WARN  project.import.invalid [project.import#3 · 2 ms] Projet refusé par la validation {"errors":["Format de projet non reconnu (version 2 attendue).","La langue principale doit faire partie des langues du site.","Le site doit avoir exactement une page d’accueil."]}
04:38:04.493 +4.92s ERROR project.import.fail [project.import#3 · 3 ms] Format de projet non reconnu (version 2 attendue). {…}
```

---

## 1.5 Recharger l'exemple, commencer un site vide, aperçu

**But** : repartir de l'exemple du MAB ou d'une page blanche ; voir la page comme un visiteur.

**Étapes**
- Fichier → « Recharger l’exemple », puis confirmer.
- Fichier → « Nouveau site vide » : une petite fenêtre demande
  - le **nom du site** (modifiable ensuite dans l'onglet Site) ;
  - la **langue principale** : celle dans laquelle tu écris d'abord, que les visiteurs voient par défaut (français, néerlandais, allemand, anglais ou **japonais**). Elle ne se change plus ensuite ;
  - les **autres langues** (cochées d'office : néerlandais, allemand et anglais pour un site en français ; anglais pour un site en japonais). On peut en ajouter ou en retirer plus tard dans l'onglet Site.

  Puis **Créer le site**. La page d'accueil porte déjà le nom « Accueil » dans la langue principale (« ホーム » en japonais).
- Fichier → « Aperçu dans un nouvel onglet ».

**Journal attendu** ([`journaux/projet-exemple-nouveau-apercu.log`](journaux/projet-exemple-nouveau-apercu.log))
```log
22:27:21.339 +5.05s INFO  project.cancel Remplacement annulé {"action":"demo"}
22:27:21.461 +5.17s DEBUG storage.version-save Version enregistrée {"id":"v_mvu20qk5kumdz","name":"Avant un nouveau site vide","kind":"safety"}
22:27:21.476 +5.19s INFO  store.load Projet chargé dans l’éditeur {"name":"Nouveau site","pages":1,"keepHistory":true}
22:27:21.479 +5.19s INFO  project.new Nouveau site vide : « Nouveau site », langue principale Français {"lang":"fr","languages":["fr","nl","de","en"]}
22:27:21.931 +5.64s DEBUG storage.version-save Version enregistrée {"id":"v_mvu20qx7f7iz5","name":"Avant de recharger l’exemple","kind":"safety"}
22:27:21.943 +5.66s INFO  store.load Projet chargé dans l’éditeur {"name":"MAB – Médias Alternatifs Belges","pages":2,"keepHistory":true}
22:27:21.949 +5.66s INFO  project.demo Exemple rechargé
22:27:22.391 +6.11s INFO  project.preview Aperçu dans un nouvel onglet {"page":"p_883srvr4","lang":"fr"}
```
À vérifier : chaque remplacement commence par `storage.version-save` (la version de sécurité) puis `store.load`.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Tu réponds « Annuler » (ou fermes la fenêtre du nouveau site) | rien ne change | `project.cancel` (INFO) `{"action":"demo"}` ou `{"action":"new"}` |
| Tu changes la langue principale dans la fenêtre du nouveau site | les langues cochées d'office suivent | `project.new-lang` (DEBUG) `{"lang":"ja"}` |
| L'aperçu est bloqué par le navigateur (fenêtres surgissantes) | aucun onglet ne s'ouvre | `project.preview` est noté quand même : autorise les fenêtres pour l'adresse de l'éditeur |

---

## 1.6 Langue de l'interface (français, anglais, japonais)

**But** : utiliser l'éditeur en français, en anglais ou en japonais. La langue de l'interface ne change pas la langue des sites (voir le chapitre 5).

**Étapes** : menu **Fichier** → « Langue de l'interface », ou Ctrl+K « 🌍 English » / « 🌍 日本語 » / « 🌍 Français ».

**Chemin normal** : le projet est enregistré, la page se recharge dans la nouvelle langue ; le choix est retenu sur cet appareil. Au tout premier lancement, l'éditeur prend la langue du navigateur (français, anglais ou japonais ; sinon l'anglais). On peut aussi forcer une langue par l'adresse : `?lang=en`, `?lang=ja`, `?lang=fr`.

Tout suit la langue choisie : boutons, panneaux, fenêtres, messages, infobulles, rapports de l'auto-test et du banc d'essai, et **les messages du journal**. Les **codes du journal** (`page.add`…) sont les mêmes dans les trois langues : un journal copié en japonais se lit avec ce guide.

| Situation | Journal |
|---|---|
| Démarrage | `ui.lang-ready` (DEBUG) : langue, nombre de textes fixes traduits, catalogue chargé |
| Changement de langue | `ui.lang` (INFO), puis rechargement |
| Projet non enregistré avant le changement | `ui.lang-save-fail` (WARN) : le changement a lieu quand même ; la sauvegarde automatique avait déjà eu lieu au plus tard 0,6 s après la dernière modification |
| Fichier de traductions introuvable (`i18n/en.js` ou `i18n/ja.js`) | `ui.lang-missing` (WARN) : l'interface reste en français |

---

## 1.7 Ouvrir le guide d'utilisation

**But** : trouver de l'aide sans quitter l'éditeur.

**Étapes** : bouton **Guide** (icône point d’interrogation) en haut à droite, menu **Fichier → Guide d'utilisation**, touche **F1**, ou Ctrl+K « Guide ». Si une fenêtre est ouverte (Publier, SEO, IA locale…), F1 ouvre directement le chapitre qui en parle.

**Chemin normal** : le guide s'ouvre dans un nouvel onglet, dans la langue de l'interface (français, anglais ou japonais). On peut y chercher (case en haut, ou touche « / »), changer de langue, passer d'un chapitre à l'autre ; les **détails techniques** (journal, codes) sont cachés : coche « Afficher les détails techniques » pour les voir.

| Situation | Journal |
|---|---|
| Guide ouvert | `ui.help` (INFO) : page ouverte, langue, fenêtre d'où l'on vient |

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `boot.fail` | ERROR | le démarrage a échoué |
| `boot.invalid-save` | WARN | projet enregistré illisible, exemple chargé à la place |
| `boot.ok` | INFO | éditeur prêt (durée totale du démarrage) |
| `boot.project` | INFO | projet choisi au démarrage (`source` : saved, demo, fresh) |
| `boot.start` | INFO | début du démarrage |
| `project.cancel` | INFO | remplacement du projet annulé |
| `project.demo` | INFO | exemple rechargé |
| `project.export-json` | INFO | projet enregistré en .json |
| `project.import.start`, `project.import.ok`, `project.import.fail` | INFO / INFO / ERROR | ouverture d'un .json |
| `project.import.invalid` | WARN | fichier refusé par la validation |
| `project.new` | INFO | nouveau site vide (nom, langue principale, langues) |
| `project.new-lang` | DEBUG | langue principale choisie dans la fenêtre du nouveau site |
| `project.preview` | INFO | aperçu dans un nouvel onglet |
| `storage.assets-missing` | WARN | images absentes de la base locale |
| `storage.blocked` | WARN | base bloquée par un autre onglet |
| `storage.load` | INFO | projet rechargé depuis l'appareil |
| `storage.load-empty` | INFO | aucun projet enregistré |
| `storage.load-fail` | ERROR | lecture du projet enregistré impossible |
| `storage.open` | DEBUG | base locale ouverte |
| `storage.open-fail` | ERROR | base locale inaccessible |
| `storage.save` | DEBUG | projet enregistré sur l'appareil |
| `storage.save-fail` | ERROR | projet non enregistré |
| `storage.save-recovered` | INFO | enregistrement rétabli après un échec |
| `storage.unavailable` | ERROR | IndexedDB absent |
| `storage.upgrade` | INFO | base locale créée ou mise à jour |
| `storage.version-change` | WARN | un autre onglet met la base à jour |
| `store.commit` | DEBUG | modification entrée dans l'historique |
| `store.edit-target` | INFO | édition d'un composant, de l'en-tête, d'une carte… ou retour à la page |
| `store.hover` | TRACE | survol |
| `store.invalid` | ERROR | modification ignorée : site invalide (bogue) |
| `store.load` | INFO | projet chargé dans l'éditeur |
| `store.multi` | DEBUG | sélection multiple |
| `store.readonly` | WARN | modification refusée en mode relecture |
| `store.redo`, `store.redo-none` | INFO / DEBUG | rétablir |
| `store.remote` | DEBUG | modifications d'un autre participant appliquées |
| `store.select` | DEBUG | sélection |
| `store.undo`, `store.undo-none` | INFO / DEBUG | annuler |
| `store.view` | DEBUG | page, langue ou appareil affichés |
| `ui.lang` | INFO | changement de la langue de l'interface (rechargement) |
| `ui.lang-missing` | WARN | traductions de la langue choisie introuvables : interface en français |
| `ui.lang-ready` | DEBUG | interface prête dans la langue choisie |
| `ui.lang-save-fail` | WARN | projet non enregistré juste avant le changement de langue |
| `ui.help` | INFO | guide d'utilisation ouvert (bouton Guide (icône point d’interrogation), Fichier, F1, Ctrl+K) |
