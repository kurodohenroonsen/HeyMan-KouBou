# 7. IA locale (Gemini Nano dans Chrome)

Atelier utilise l'IA **intégrée à Chrome** (Gemini Nano) : reformuler, corriger les fautes, proposer descriptions et titres pour Google, idées de mots-clés, textes alternatifs des images. Tout se passe sur ton ordinateur : pas de compte, pas d'abonnement, rien n'est envoyé à un serveur. Chaque tâche utilise l'API dédiée de Chrome quand elle existe (Rewriter, Proofreader, Summarizer) et sinon la **Prompt API** avec une réponse au format JSON imposé. Gemini Nano écrit en français, allemand, anglais, espagnol et japonais ; pour le **néerlandais**, Atelier rédige en français puis traduit avec le traducteur de Chrome (chapitre 5).

**Domaines du journal** : `ai.*` — état de chaque API (`ai.availability`, `ai.status`), téléchargement (`ai.download.*`, `ai.progress`), sessions (`ai.session.*`), et un **parcours par tâche** : `ai.rewrite`, `ai.proofread`, `ai.description`, `ai.title`, `ai.keywords`, `ai.alt`, `ai.link`. La traduction vers le néerlandais écrit aussi `translate.model.*` (chapitre 5).

---

## Lire le parcours d'une tâche

Toutes les tâches écrivent les mêmes étapes, préfixées par leur nom (`ai.rewrite.call`, `ai.title.call`…) :

| Étape | Niveau | Ce qu'elle dit |
|---|---|---|
| `….start` (ex. `ai.rewrite.start`) | INFO | la tâche, la langue demandée (`lang`), la langue de rédaction (`gen`), l'API prévue (`api` : `rewriter`, `proofreader`, `summarizer` ou `prompt`), la longueur et un extrait du texte (60 caractères au plus), `source` : `chrome` ou `test` |
| `ai.rewrite.fallback` (ou `ai.proofread.fallback`, `ai.description.fallback`) | WARN | l'API dédiée n'est pas disponible : repli sur la Prompt API ; donne le réglage Chrome qui l'active (`flag`) |
| `ai.description.via-translation` | INFO | langue non parlée par Gemini Nano : rédaction en `gen`, puis traduction |
| `ai.title.call` | DEBUG | un appel à une API : laquelle (`api`), langue, réglages (`tone`, `length`, `type`, `schema` = champs JSON demandés, `images`, longueur des consignes `system`), longueur d'entrée `inLen` |
| `ai.title.reply` | DEBUG | sa réponse : durée `ms`, longueur `outLen`, extrait `excerpt` (60 caractères) |
| `ai.description.call-fail` | WARN | l'appel a levé une erreur : nom (`error.name`), message, durée, cause probable (`hint`) |
| `ai.title.unreadable` | WARN | la Prompt API n'a pas renvoyé le JSON demandé (extrait de la réponse) |
| `ai.title.schema-mismatch` | WARN | JSON lisible mais sans le champ attendu (`missing`) |
| `ai.alt.cleaned` | DEBUG | la proposition a été nettoyée (guillemets, balises, « Image de… », doublons de mots-clés) : avant / après |
| `ai.description.clamped` | WARN | proposition coupée à la longueur maximale (description 160, titre 60, texte alternatif 125, lien 60) |
| `ai.description.warning` | WARN | avertissement sur le résultat (« pas plus courte que l'original », « description courte ») |
| `ai.description.rejected` | WARN | proposition vide après nettoyage : rejetée |
| `ai.description.no-translator` | WARN | pas de traducteur vers la langue demandée |
| `ai.title.absent` | WARN | IA absente (pas de Prompt API, ou pas de lecture d'images) : la tâche n'est pas lancée |
| `ai.rewrite.refused-lang` | WARN | tâche refusée dans cette langue (reformuler, corriger et texte de lien demandent une langue de Gemini Nano) |
| `ai.rewrite.refused` | WARN | autre refus avant tout appel (rien à reformuler, mode inconnu) |
| `….ok` (ex. `ai.title.ok`) | INFO | proposition prête : API réellement utilisée (`via`), repli (`fallback`), traduite (`translated`), nombre d'appels (`calls`), longueur et extrait |
| `….cancel` (ex. `ai.rewrite.cancel`) | INFO | « Tâche non lancée » : refus attendu, aucun appel au modèle |
| `….fail` (ex. `ai.title.fail`) | ERROR | échec : `reason` = `unreadable` (réponse illisible), `api` (exception d'une API), `empty` (rien proposé), `no-translator`, `translator` (la traduction a échoué), `other` |

Les lignes `ai.session.*` et `ai.progress` (création des sessions de Chrome, téléchargement) s'intercalent entre `call` et `reply` quand le vrai Chrome est utilisé.

---

## 7.1 Vérifier l'état des API et télécharger un modèle

**But** : savoir ce que ce Chrome sait faire, et télécharger les modèles manquants.

**Étapes**
1. Barre du haut : bouton « ✨ » (ou Ctrl+K « IA locale ») : la fenêtre « ✨ IA locale (Gemini Nano dans Chrome) » s'ouvre.
2. Le tableau donne l'état de chaque API : « ✓ prêt », « ⇩ à télécharger », « … téléchargement », « ✗ indisponible ici », « — absent de ce navigateur ».
3. « Télécharger » à côté d'une API « à télécharger » (une seule fois ; connexion illimitée conseillée).

**Ce que tu vois** : l'état passe à « ✓ prêt » ; pendant le téléchargement, « Téléchargement Rewriter : 50 % ».

**Journal attendu** ([`journaux/ia-etat.log`](journaux/ia-etat.log), fournisseur de test)
```log
14:29:42.072 +0.92s INFO  ai.dialog Fenêtre ✨ IA locale {"lang":"fr","siteLang":"fr","source":"test"}
14:29:42.073 +0.92s DEBUG ai.availability Prompt API (Gemini Nano) : available (fournisseur de test) {"api":"prompt","lang":"fr","state":"available","source":"test"}
14:29:42.073 +0.92s DEBUG ai.availability Prompt API – images : available (fournisseur de test) {"api":"multimodal","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Summarizer : available (fournisseur de test) {"api":"summarizer","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Rewriter : downloadable (fournisseur de test) {"api":"rewriter","lang":"fr","state":"downloadable","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Writer : unavailable (fournisseur de test) {"api":"writer","lang":"fr","state":"unavailable","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Proofreader : available (fournisseur de test) {"api":"proofreader","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Translator : available (fournisseur de test) {"api":"translator","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Language Detector : available (fournisseur de test) {"api":"detector","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s INFO  ai.status IA locale : prêt → prompt, multimodal, summarizer, proofreader, translator, detector (2 ms) {"lang":"fr","ms":2,"source":"test","prompt":"available","multimodal":"available","summarizer":"available","rewriter":"downloadable","writer":"unavailable","proofreader":"…
14:29:42.128 +0.97s INFO  ai.download.start [ai.download#1] Téléchargement du modèle Rewriter {"api":"rewriter","lang":"fr","source":"test"}
14:29:42.129 +0.97s INFO  ai.download.ok [ai.download#1 · 1 ms] Rewriter prêt (fournisseur de test)
14:29:42.129 +0.97s DEBUG ai.availability Rewriter : available (fournisseur de test) {"api":"rewriter","lang":"fr","state":"available","source":"test"}
14:29:42.129 +0.97s INFO  ai.status IA locale : prêt → prompt, multimodal, summarizer, rewriter, proofreader, translator, detector (0 ms) {"lang":"fr","ms":0,"source":"test","prompt":"available","multimodal":"available","summarizer":"available","rewriter":"available","writer":"unavailable","proofre…
```
À vérifier : une ligne `ai.availability` **par API** (`state` : `available`, `downloadable`, `downloading`, `unavailable` ou `absent`), puis `ai.status` qui résume tout (« prêt → … ») ; le parcours `ai.download` pour le bouton « Télécharger ». Une API dont l'état n'a pas changé depuis la dernière vérification passe en TRACE (chaque tâche revérifie l'état).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Vrai Chrome | les options demandées et la durée de chaque vérification | `ai.availability` avec `options` et `ms` ; `ai.params` (DEBUG, une fois) : `topK` et `temperature` par défaut de la Prompt API ([`journaux/ia-chrome-etat.log`](journaux/ia-chrome-etat.log)) |
| API absente du navigateur (ex. Writer sans réglage) | « — absent de ce navigateur » | `ai.availability` `{"state":"absent","global":"Writer","flag":"chrome://flags/#writer-api"}` |
| Téléchargement avec le vrai Chrome | progression | `ai.progress` (DEBUG, tous les 10 %), `ai.session.create` (DEBUG, durée et réglages), `ai.download.ok` |
| Chrome télécharge déjà le modèle en arrière-plan (« … téléchargement ») | bouton **Voir la progression** : le pourcentage s'affiche dans la ligne (« … 37 % »), puis « prêt » | `ai.download-follow` (INFO), `ai.progress`, `ai.download.ok` |
| Chrome ne fait pas avancer le téléchargement (bloqué à 0 % dans `chrome://on-device-internals`) | après 20 s : « … 0 % (Chrome n'avance pas) » et un conseil | `ai.download-stalled` (WARN) : le téléchargement se fait dans Chrome ; vérifier `chrome://on-device-internals` (Model Status, Assets), connexion Wi-Fi illimitée (pas de partage de connexion du téléphone), Chrome ouvert, ou relancer Chrome |
| Fenêtre laissée ouverte pendant un téléchargement de Chrome | l'état se met à jour tout seul (toutes les 3 s) | `ai.availability` (DEBUG), `ai.download-done` (INFO) quand plus rien n'est en cours |
| « Copier » une adresse chrome://flags | « Copié : collez-le dans la barre d'adresse. » | `ai.flag-copied` (DEBUG) ; si le presse-papiers est refusé : `ai.flag-copy-fail` (WARN), l'adresse est affichée |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| `availability()` lève une erreur (appareil non éligible…) | « ✗ indisponible ici » | `ai.availability-fail` (WARN) avec `error.name` et `hint` | voir 7.7 (matériel, `chrome://on-device-internals`) |
| Chrome ne répond pas en 4 s | « ✗ indisponible ici » | `ai.availability-timeout` (WARN) | relance Chrome ; regarde `chrome://on-device-internals` |
| Téléchargement refusé : geste requis | « Échec : Requires a user gesture… » | `ai.session.fail` (WARN), puis `ai.download.fail` (ERROR) avec `hint` « Chrome exige un clic… » | reclique sur « Télécharger » (le clic doit venir de toi) |
| Autre échec du bouton | « Échec : … » | `ai.download-ui` (WARN) si l'erreur n'a pas déjà été notée | envoie le journal |

```log
14:29:45.056 +3.90s WARN  ai.availability-fail Proofreader : availability() a échoué (NotSupportedError) — considéré indisponible {"api":"proofreader","lang":"fr","ms":4,"options":{"expectedInputLanguages":["fr"]},"error":{"name":"NotSupportedError","message":"The device is not eligible for running…
…
14:29:45.057 +3.90s INFO  ai.status IA locale : prêt → prompt, multimodal, translator (6 ms) {"lang":"fr","ms":6,"source":"chrome","writer":"absent","detector":"absent","prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"downloadable","proofreader":"unavailable","t…
14:29:45.058 +3.90s DEBUG ai.params Réglages par défaut de la Prompt API {"topK":3,"maxTopK":128,"temperature":1,"maxTemperature":2}
14:29:45.111 +3.96s INFO  ai.download.start [ai.download#2] Téléchargement du modèle Rewriter {"api":"rewriter","lang":"fr","source":"chrome"}
14:29:45.112 +3.96s WARN  ai.session.fail Session Rewriter impossible : NotAllowedError — Requires a user gesture when availability is "downloading" or "downloadable". {"api":"rewriter","ms":0,"inputs":"fr","outputs":"fr","error":{"name":"NotAllowedError","message":"Requires a user gesture when ava…
14:29:45.113 +3.96s ERROR ai.download.fail [ai.download#2 · 2 ms] Téléchargement Rewriter impossible : NotAllowedError — Requires a user gesture when availability is "downloading" or "downloadable". {"api":"rewriter","hint":"Chrome exige un clic de la personne pour télécharger le modèle (geste requ…
14:29:45.113 +3.96s INFO  ai.status IA locale : prêt → prompt, multimodal, translator (0 ms) {"lang":"fr","ms":0,"source":"chrome","writer":"absent","detector":"absent","prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"downloadable","proofreader":"unavailable","t…
14:29:45.161 +4.00s INFO  ai.download.start [ai.download#3] Téléchargement du modèle Rewriter {"api":"rewriter","lang":"fr","source":"chrome"}
14:29:45.171 +4.01s DEBUG ai.progress Téléchargement Rewriter : 50 % {"api":"rewriter","pct":50}
14:29:45.178 +4.02s DEBUG ai.progress Téléchargement Rewriter : 100 % {"api":"rewriter","pct":100}
14:29:45.184 +4.03s DEBUG ai.session.create Session Rewriter créée (22 ms) {"api":"rewriter","ms":22,"inputs":"fr","outputs":"fr"}
14:29:45.184 +4.03s INFO  ai.download.ok [ai.download#3 · 23 ms] Rewriter prêt
14:29:45.185 +4.03s INFO  ai.status IA locale : prêt → prompt, multimodal, translator (0 ms) {"lang":"fr","ms":0,"source":"chrome","writer":"absent","detector":"absent","prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"downloadable","proofreader":"unavailable","t…
```

---

## 7.2 Reformuler un texte

**But** : rendre un paragraphe plus court, plus simple, plus formel, plus chaleureux ou un peu plus long.

**Étapes**
1. Double-clique un texte dans la page, sélectionne le passage (ou rien : tout le paragraphe).
2. Barre de mise en forme : « ✨ », puis le mode (« Plus court »…).
3. La proposition s'affiche : « Remplacer » ou « Annuler ».

**Ce que tu vois** : la proposition sous la barre ; après « Remplacer », le texte est marqué « à relire ».

**Journal attendu** — avec le Rewriter ([`journaux/ia-reformuler-rewriter.log`](journaux/ia-reformuler-rewriter.log))
```log
14:29:43.029 +1.87s DEBUG ai.provider Fournisseur d’IA de test (window.__atelierAI) {"source":"test","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"proofreader":true,"translator":true},"methods":["prompt","summarize","rewrite","proofread","translate"]}
14:29:43.031 +1.88s INFO  ai.rewrite.start [ai.rewrite#2] IA locale : reformuler {"task":"rewrite","inLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges.","mode":"formal","lang":"fr","gen":"fr","api":"rewriter","source":"test"}
14:29:43.031 +1.88s DEBUG ai.rewrite.call [ai.rewrite#2 · 0 ms] Appel Rewriter (fr) {"api":"rewriter","lang":"fr","tone":"more-formal","length":"as-is","inLen":44}
14:29:43.032 +1.88s DEBUG ai.rewrite.reply [ai.rewrite#2 · 1 ms] Réponse Rewriter : 44 car. en 1 ms {"api":"rewriter","ms":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
14:29:43.032 +1.88s INFO  ai.rewrite.ok [ai.rewrite#2 · 1 ms] Reformuler : proposition prête (Rewriter) {"via":"rewriter","fallback":false,"translated":false,"calls":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
```
À vérifier : `ai.provider` (fournisseur et API utilisables `has`), `ai.rewrite.call` avec `"api":"rewriter"` et le ton (`more-formal`, `more-casual`, `as-is`) ou la longueur (`shorter`, `longer`, `as-is`) envoyés à Chrome, `ai.rewrite.ok` avec `"via":"rewriter"`. Les lignes `edit.ai-*` (chapitre 2) disent ce que fait la barre de mise en forme ; « Remplacer » ajoute `ai.mark` (texte marqué « à relire »).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Rewriter absent (Chrome sans le réglage) | même résultat, par la Prompt API | `ai.rewrite.fallback` (WARN), `ai.rewrite.call` avec `"api":"prompt","schema":"text"`, `ai.rewrite.ok` avec `"fallback":true` ([`journaux/ia-reformuler-repli.log`](journaux/ia-reformuler-repli.log)) |
| « Plus court » ne raccourcit pas | « La proposition n'est pas plus courte que l'original. » | `ai.rewrite.warning` (WARN) |

```log
14:29:42.551 +1.40s INFO  ai.rewrite.start [ai.rewrite#1] IA locale : reformuler {"task":"rewrite","inLen":161,"excerpt":"Le MAB réunit les médias alternatifs belges. Nous partageon…","mode":"shorter","lang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:42.552 +1.40s WARN  ai.rewrite.fallback [ai.rewrite#1 · 1 ms] Rewriter non disponible : repli sur la Prompt API (schéma JSON) {"wanted":"rewriter","has":false,"flag":"chrome://flags/#rewriter-api"}
14:29:42.553 +1.40s DEBUG ai.rewrite.call [ai.rewrite#1 · 2 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"text","system":"253 car.","inLen":169}
14:29:42.553 +1.40s DEBUG ai.rewrite.reply [ai.rewrite#1 · 2 ms] Réponse Prompt API (Gemini Nano) : 55 car. en 1 ms {"api":"prompt","ms":1,"outLen":55,"excerpt":"{\"text\":\"Le MAB réunit les médias alternatifs belges.\"}"}
14:29:42.554 +1.40s INFO  ai.rewrite.ok [ai.rewrite#1 · 3 ms] Reformuler : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
…
14:29:42.610 +1.45s DEBUG ai.mark Texte de l’IA appliqué et marqué « à relire » {"nodeId":"n_6t0n5u1i3w","field":"content","lang":"fr"}
```

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Texte en néerlandais | « La reformulation n'est pas encore disponible en néerlandais : Gemini Nano ne parle que… » | `ai.rewrite.refused-lang` (WARN), `ai.rewrite.cancel` (INFO) : aucun appel | reformule en français puis traduis (chapitre 5) |
| Sélection vide | « Rien à reformuler. » | `ai.rewrite.refused` (WARN), `ai.rewrite.cancel` | sélectionne un texte |
| L'API lève une erreur | le message de Chrome | `ai.rewrite.call-fail` (WARN) avec `hint`, `ai.rewrite.fail` (ERROR) `"reason":"api"` | voir 7.7 |
| Proposition vide | « L'IA n'a rien proposé : réessayez. » | `ai.rewrite.rejected` (WARN), `ai.rewrite.fail` `"reason":"empty"` | réessaie, ou reformule une phrase plus longue |

```log
14:29:44.925 +3.77s INFO  ai.rewrite.start [ai.rewrite#3] IA locale : reformuler {"task":"rewrite","inLen":37,"excerpt":"Le MAB réunit les médias alternatifs.","mode":"shorter","lang":"nl","gen":"nl","api":"prompt","source":"test"}
14:29:44.925 +3.77s WARN  ai.rewrite.refused-lang [ai.rewrite#3 · 0 ms] Refusé en nl : La reformulation n’est pas encore disponible en néerlandais : Gemini Nano ne parle que français, allemand, anglais, espagnol et japonais. {"lang":"nl","langs":["en","ja","es","de","fr"]}
14:29:44.925 +3.77s INFO  ai.rewrite.cancel [ai.rewrite#3 · 0 ms] Tâche non lancée (aucun appel au modèle) {"task":"rewrite"}
14:29:44.925 +3.77s ERROR ui.toast Message affiché : La reformulation n’est pas encore disponible en néerlandais : Gemini Nano ne parle que français, allemand, anglais, espagnol et japonais. {"type":"error"}
```

---

## 7.3 Corriger les fautes

**But** : relever orthographe, grammaire, accords et ponctuation, sans changer le style.

**Étapes** : comme 7.2, puis « Corriger » dans le menu ✨. Les corrections sont surlignées ; « Remplacer » les applique à l'endroit exact.

**Journal attendu** — avec le Proofreader ([`journaux/ia-corriger.log`](journaux/ia-corriger.log))
```log
14:29:43.816 +2.66s INFO  ai.proofread.start [ai.proofread#1] IA locale : corriger les fautes {"task":"proofread","inLen":66,"excerpt":"Le MAB réunit les médias alternatifs belges. Nous partageon…","lang":"fr","gen":"fr","api":"proofreader","source":"test"}
14:29:43.816 +2.66s DEBUG ai.proofread.call [ai.proofread#1 · 0 ms] Appel Proofreader (fr) {"api":"proofreader","lang":"fr","inLen":66}
14:29:43.817 +2.66s DEBUG ai.proofread.reply [ai.proofread#1 · 1 ms] Réponse Proofreader : 165 car. en 1 ms {"api":"proofreader","ms":1,"outLen":165,"excerpt":"{\"correctedInput\":\"Le MAB réunit les médias alternatifs bel…"}
14:29:43.817 +2.66s INFO  ai.proofread.ok [ai.proofread#1 · 1 ms] Corriger : proposition prête (Proofreader) {"via":"proofreader","fallback":false,"translated":false,"calls":1,"corrections":1,"outLen":76}
…
14:29:43.891 +2.73s DEBUG ai.mark Texte de l’IA appliqué et marqué « à relire » {"nodeId":"n_6t0n5u1i3w","field":"content","lang":"fr"}
```
À vérifier : `ai.proofread.ok` avec `corrections` (nombre de fautes retrouvées dans le texte).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Proofreader absent | la Prompt API renvoie des paires « original → correction », retrouvées dans le texte | `ai.proofread.fallback` (WARN), `"schema":"corrections"` ([`journaux/ia-corriger-repli.log`](journaux/ia-corriger-repli.log)) |
| Aucune faute | « Aucune faute trouvée » | `ai.proofread.ok` `{"corrections":0}` |

```log
14:29:44.319 +3.16s INFO  ai.proofread.start [ai.proofread#2] IA locale : corriger les fautes {"task":"proofread","inLen":76,"excerpt":"Le MAB réunit les médias alternatifs belges. Ensemble, nous…","lang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.319 +3.16s WARN  ai.proofread.fallback [ai.proofread#2 · 0 ms] Proofreader non disponible : repli sur la Prompt API (schéma JSON) {"wanted":"proofreader","has":false,"flag":"chrome://flags/#proofreader-api"}
14:29:44.319 +3.16s DEBUG ai.proofread.call [ai.proofread#2 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"corrections","system":"303 car.","inLen":76}
14:29:44.319 +3.16s DEBUG ai.proofread.reply [ai.proofread#2 · 0 ms] Réponse Prompt API (Gemini Nano) : 61 car. en 0 ms {"api":"prompt","ms":0,"outLen":61,"excerpt":"{\"corrections\":[{\"original\":\"tout.\",\"replacement\":\"tout !\"}…"}
14:29:44.320 +3.16s INFO  ai.proofread.ok [ai.proofread#2 · 1 ms] Corriger : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"corrections":1,"outLen":77}
```

**Erreurs** : comme 7.2 (`ai.proofread.refused-lang`, `ai.proofread.call-fail`, `ai.proofread.unreadable`, `ai.proofread.fail`).

---

## 7.4 Décrire une image (texte alternatif)

**But** : un texte alternatif utile pour les personnes aveugles et pour Google.

**Étapes** : sélectionne une image → inspecteur, onglet Contenu → « ✨ Décrire l'image » (ou, pour toute une page, chapitre 6.5).

**Ce que tu vois** : le champ « Texte alternatif » se remplit (marqué « à relire »).

**Journal attendu** ([`journaux/ia-texte-alternatif.log`](journaux/ia-texte-alternatif.log))
```log
14:29:44.785 +3.63s INFO  ai.alt.start [ai.alt#1] IA locale : texte alternatif d’une image {"task":"altText","image":"image/png (0 Ko)","context":310,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.785 +3.63s DEBUG ai.alt.call [ai.alt#1 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"alt,decorative","images":1,"system":"306 car.","inLen":351}
14:29:44.786 +3.63s DEBUG ai.alt.reply [ai.alt#1 · 1 ms] Réponse Prompt API (Gemini Nano) : 76 car. en 0 ms {"api":"prompt","ms":0,"outLen":76,"excerpt":"{\"alt\":\"Image de une équipe de tournage avec une caméra\",\"d…"}
14:29:44.787 +3.63s DEBUG ai.alt.cleaned [ai.alt#1 · 2 ms] Proposition nettoyée (guillemets, balises, préfixe « Image de »…) {"before":"Image de une équipe de tournage avec une caméra","after":"Une équipe de tournage avec une caméra"}
14:29:44.787 +3.63s INFO  ai.alt.ok [ai.alt#1 · 2 ms] Texte alternatif : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"outLen":38,"excerpt":"Une équipe de tournage avec une caméra"}
```
À vérifier : `ai.alt.start` avec le type et le poids de l'image (`image`) ; `ai.alt.call` avec `"images":1` ; `ai.alt.cleaned` montre le préfixe « Image de » retiré ; `ai.alt.ok` avec `decorative` si l'IA juge l'image décorative (texte vide).

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Image en ligne illisible (CORS, hors ligne) | « Image en ligne inaccessible : importez-la dans le projet… » | `net.fail` (ERROR), `ai.image-fail` (WARN) | importe l'image dans le projet |
| Pas d'image | « Pas d'image. » | `ai.image-missing` (WARN) | choisis d'abord une image |
| Prompt API sans images | « L'IA locale de ce navigateur ne lit pas encore les images… » | `ai.alt.absent` (WARN) `{"need":"multimodal"}`, `ai.alt.cancel` | Chrome récent ; voir 7.7 |
| L'IA ne sait pas décrire | « L'IA n'a pas su décrire cette image. » | `ai.alt.rejected` (WARN), `ai.alt.fail` | écris-le toi-même |

```log
14:29:45.002 +3.85s ERROR net.fail GET 127.0.0.1:9/inexistante.png : Failed to fetch (réseau, CORS ou adresse injoignable) {"id":1,"url":"http://127.0.0.1:9/inexistante.png","ms":3,"online":true,"error":{"name":"TypeError","message":"Failed to fetch","stack":"TypeError: Failed to fetch\nat atelierF…
14:29:45.002 +3.85s WARN  ai.image-fail Image en ligne illisible (CORS ou hors ligne) : à importer dans le projet {"src":"http://127.0.0.1:9/inexistante.png","error":{"name":"TypeError","message":"Failed to fetch","stack":"TypeError: Failed to fetch\nat atelierFetch (http://localhost:8791/editor/lo…
…
14:29:45.003 +3.85s WARN  ai.image-missing Pas d’image à décrire {"src":""}
```

---

## 7.5 Descriptions, titres et mots-clés ; le néerlandais par traduction

**But** : les propositions du référencement (chapitre 6), dans toutes les langues du site.

**Ce que tu vois** : voir 6.3 et 6.4.

**Journal attendu** — description en néerlandais ([`journaux/ia-nl-traduction.log`](journaux/ia-nl-traduction.log))
```log
14:29:44.934 +3.78s INFO  ai.description.start [ai.description#3] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":37,"lang":"nl","sourceLang":"fr","gen":"fr","api":"summarizer","translateTo":"nl","source":"test"}
14:29:44.934 +3.78s INFO  ai.description.via-translation [ai.description#3 · 0 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":true}
14:29:44.934 +3.78s DEBUG ai.description.call [ai.description#3 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"109 car.","inLen":37}
14:29:44.934 +3.78s DEBUG ai.description.reply [ai.description#3 · 0 ms] Réponse Summarizer : 124 car. en 0 ms {"api":"summarizer","ms":0,"outLen":124,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel, tec…"}
14:29:44.935 +3.78s DEBUG ai.description.call [ai.description#3 · 1 ms] Appel Translator {"api":"translator","from":"fr","to":"nl","inLen":124}
14:29:44.935 +3.78s DEBUG ai.description.reply [ai.description#3 · 1 ms] Réponse Translator : 129 car. en 0 ms {"api":"translator","ms":0,"outLen":129,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
14:29:44.935 +3.78s INFO  ai.description.ok [ai.description#3 · 1 ms] Description pour Google : proposition prête (Summarizer, traduite en nl) {"via":"summarizer","fallback":false,"translated":true,"calls":2,"outLen":129,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
```
À vérifier : `gen` = `fr` et `translateTo` = `nl` dans `ai.description.start` ; deux appels : `summarizer` (en français) puis `translator` (`fr` → `nl`) ; `ai.description.ok` avec `"translated":true` et `"calls":2`. Le titre et les mots-clés passent toujours par la Prompt API (`ai.title.*`, `ai.keywords.*`, avec `ai.keywords.cleaned` quand des doublons sont retirés).

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Summarizer absent | la Prompt API rédige la description | `ai.description.fallback` (WARN), `"schema":"description"` |
| Proposition trop longue | coupée au dernier mot avant 160 caractères | `ai.description.clamped` (WARN) `{"max":160,"from":224,"to":154}` ([`journaux/ia-sortie-coupee.log`](journaux/ia-sortie-coupee.log)) |

```log
14:29:44.914 +3.76s DEBUG ai.description.call [ai.description#2 · 1 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"109 car.","inLen":37}
14:29:44.914 +3.76s DEBUG ai.description.reply [ai.description#2 · 1 ms] Réponse Summarizer : 224 car. en 0 ms {"api":"summarizer","ms":0,"outLen":224,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel part…"}
14:29:44.914 +3.76s WARN  ai.description.clamped [ai.description#2 · 1 ms] Proposition coupée à 160 caractères (le modèle en a écrit 224) {"max":160,"from":224,"to":154}
14:29:44.914 +3.76s INFO  ai.description.ok [ai.description#2 · 1 ms] Description pour Google : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":1,"outLen":154,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel part…"}
```

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Pas de traducteur vers le néerlandais | « Traduction vers le néerlandais indisponible sur cet appareil… » | `ai.description.no-translator` (WARN), `ai.description.fail` (ERROR) `"reason":"no-translator"` | chapitre 5.3 (Translator) |
| Réponse illisible (pas du JSON) | « Réponse illisible de l'IA locale : réessayez. » | `ai.title.unreadable` (WARN) avec l'extrait de la réponse, `ai.title.fail` `"reason":"unreadable"` | réessaie ; si ça se répète, envoie le journal (l'extrait montre ce que le modèle a écrit) |
| Exception d'une API (session détruite, modèle déchargé) | le message de Chrome | `ai.description.call-fail` (WARN) avec `error.name` et `hint`, `ai.description.fail` `"reason":"api"` | réessaie ; voir 7.7 |

```log
14:29:44.949 +3.79s INFO  ai.description.start [ai.description#4] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":37,"lang":"nl","sourceLang":"fr","gen":"fr","api":"summarizer","translateTo":"nl","source":"test"}
14:29:44.949 +3.79s INFO  ai.description.via-translation [ai.description#4 · 0 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":false}
…
14:29:44.950 +3.79s WARN  ai.description.no-translator [ai.description#4 · 1 ms] Pas de traducteur fr → nl sur cet appareil {"from":"fr","to":"nl"}
14:29:44.950 +3.79s ERROR ai.description.fail [ai.description#4 · 1 ms] Traduction en néerlandais indisponible sur cet appareil (l’IA rédige en français, puis traduit). {"task":"seoDescription","reason":"no-translator","calls":1,"error":{"name":"Error","message":"Traduction en néerlandais indisponi…
```
```log
14:29:44.870 +3.71s INFO  ai.title.start [ai.title#1] IA locale : titre pour Google {"task":"seoTitle","title":"Accueil","inLen":37,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.873 +3.72s DEBUG ai.title.call [ai.title#1 · 3 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"title","system":"189 car.","inLen":81}
14:29:44.873 +3.72s DEBUG ai.title.reply [ai.title#1 · 3 ms] Réponse Prompt API (Gemini Nano) : 44 car. en 0 ms {"api":"prompt","ms":1,"outLen":44,"excerpt":"Voici ma proposition : un titre accrocheur !"}
14:29:44.874 +3.72s WARN  ai.title.unreadable [ai.title#1 · 4 ms] Réponse illisible : ce n’est pas le JSON demandé (schéma) {"outLen":44,"excerpt":"Voici ma proposition : un titre accrocheur !","schema":"title","error":{"name":"Error","message":"Réponse illisible de l’IA locale : réessayez.","stack…
14:29:44.876 +3.72s ERROR ai.title.fail [ai.title#1 · 6 ms] Réponse illisible de l’IA locale : réessayez. {"task":"seoTitle","reason":"unreadable","calls":1,"error":{"name":"Error","message":"Réponse illisible de l’IA locale : réessayez.","stack":"Error: Réponse illisible de l’IA locale : réessayez…
```
```log
14:29:44.896 +3.74s INFO  ai.description.start [ai.description#1] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":37,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:29:44.896 +3.74s DEBUG ai.description.call [ai.description#1 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"109 car.","inLen":37}
14:29:44.897 +3.74s WARN  ai.description.call-fail [ai.description#1 · 1 ms] Summarizer a échoué après 1 ms : InvalidStateError — The model execution session has been destroyed. {"api":"summarizer","ms":1,"error":{"name":"InvalidStateError","message":"The model execution session has been destroyed.…
14:29:44.897 +3.74s ERROR ai.description.fail [ai.description#1 · 1 ms] The model execution session has been destroyed. {"task":"seoDescription","reason":"api","calls":1,"hint":"Session fermée ou modèle déchargé : réessaie.","error":{"name":"InvalidStateError","message":"The model execution session…
```

---

## 7.6 Quand l'IA est absente

**But** : comprendre pourquoi un bouton ✨ ne fait rien.

**Ce que tu vois** : « IA locale indisponible : ouvrez ✨ IA locale pour l'activer (Chrome 148 ou plus récent, sur ordinateur). » Le reste d'Atelier fonctionne normalement.

**Journal attendu** ([`journaux/ia-absente.log`](journaux/ia-absente.log), ici pour la tâche « texte de lien » `ai.link`, prévue pour la vérification d'accessibilité)
```log
14:29:44.965 +3.81s DEBUG ai.provider Fournisseur d’IA de test (window.__atelierAI) {"source":"test","lang":"fr","has":{},"methods":[]}
14:29:44.965 +3.81s INFO  ai.link.start [ai.link#1] IA locale : texte de lien {"task":"linkText","excerpt":"cliquez ici","target":"Contact","lang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.966 +3.81s WARN  ai.link.absent [ai.link#1 · 1 ms] IA absente : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"has":{},"need":"prompt"}
14:29:44.967 +3.81s INFO  ai.link.cancel [ai.link#1 · 2 ms] Tâche non lancée (aucun appel au modèle) {"task":"linkText"}
14:29:44.967 +3.81s ERROR ui.toast Message affiché : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"type":"error"}
```
À vérifier : `ai.provider` avec `"has":{}` (aucune API utilisable) ; la tâche se termine par `….absent` (WARN) et `….cancel` (INFO), jamais par une erreur.

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Erreur imprévue hors d'une tâche | le message de l'erreur | `ai.unexpected` (ERROR) avec la pile | envoie le journal |

```log
14:29:44.985 +3.83s ERROR ai.unexpected Test : erreur inattendue — erreur-de-test volontaire {"label":"Test","lang":"fr","error":{"name":"Error","message":"erreur-de-test volontaire","stack":"Error: erreur-de-test volontaire\nat boom (eval at evaluate (:290:30), <anonymous>:12:27)\nat Module.withAI…
```

---

## 7.7 Essayer le vrai Gemini Nano et nous envoyer le journal

> **Le plus simple** : lance le **🧪 Banc d'essai** (chapitre 14) : il teste chaque tâche sur des exemples fixes et produit un rapport à copier.

Les tests automatiques utilisent un faux Gemini Nano. Ton journal, avec le vrai, nous dit exactement ce que ton Chrome sait faire.

**Configuration demandée par Chrome** : ordinateur Windows 10/11, macOS 13 ou plus récent, Linux ou Chromebook Plus ; **22 Go libres** sur le disque du profil Chrome ; carte graphique avec **plus de 4 Go** de mémoire, ou processeur avec **16 Go de mémoire vive** et 4 cœurs ; connexion illimitée pour le premier téléchargement. Pas sur téléphone.

**Étapes**
1. Chrome à jour (menu ⋮ → Aide → À propos de Google Chrome).
2. Active les API en essai : ouvre chaque adresse, choisis la valeur indiquée, puis « Relaunch » :
   - `chrome://flags/#rewriter-api` → **Enabled Multilingual** (sinon le Rewriter ne parle qu'anglais) ;
   - `chrome://flags/#writer-api` → **Enabled Multilingual** (ou **Enabled**) ;
   - `chrome://flags/#proofreader-api` → **Enabled**.
   Les noms exacts changent parfois d'une version à l'autre : tape `rewriter`, `writer`, `proofreader` ou `prompt api` dans la recherche de `chrome://flags`. Si Chrome refuse ton matériel alors qu'il est suffisant, le réglage `chrome://flags/#optimization-guide-on-device-model` → « Enabled BypassPerfRequirement » lève le contrôle (à tes risques).
3. Ouvre `chrome://on-device-internals` : l'onglet « Model Status » dit si le modèle est téléchargé et prêt, et pourquoi sinon ; garde-le ouvert pendant l'essai.
4. Ouvre Atelier avec `?debug` à la fin de l'adresse (c'est déjà le réglage par défaut pendant la phase de test).
5. Bouton « ✨ » de la barre du haut : attends les états ; clique « Télécharger » pour chaque API « à télécharger » (une à la fois ; la première prend plusieurs minutes).
6. Essaie chaque tâche une fois : « Plus court » et « Corriger » sur un paragraphe (7.2, 7.3), « ✨ Décrire l'image » (7.4), dans 🔎 Référencement « ✨ Proposer » la description et le titre, « ✨ Idées », puis la langue NL et « ✨ Compléter les descriptions » (6.3, 6.4).
7. 🐞 → « 📋 Copier le journal », colle-le dans ton message avec une capture de `chrome://on-device-internals`.

**Ce que le journal doit montrer quand tout marche**
- En tête du journal copié, la ligne `ia :` (contexte de l'environnement) : `fournisseur : Chrome`, les globales présentes (`LanguageModel, Summarizer, Rewriter, Writer, Proofreader, Translator, LanguageDetector`, « (absent) » à côté de celles qui manquent), le dernier état connu de chaque API et l'état du traducteur par paire.
- `ai.status` avec `"source":"chrome"` et `available` pour `prompt`, `multimodal`, `summarizer`, `rewriter`, `proofreader`, `translator` ; `ai.params` (réglages par défaut de la Prompt API).
- Pour chaque tâche : `ai.<tâche>.start` avec `"source":"chrome"` et l'API prévue, **pas** de `….fallback`, une ligne `ai.session.create` (durée de création de la session, langues, réglages, `inputQuota`), `….call` puis `….reply` avec une durée de quelques centaines de millisecondes à quelques secondes, `ai.session.usage` (jetons utilisés / quota) pour la Prompt API, et `….ok`.

Extrait obtenu avec une **imitation** des API de Chrome (même code que le vrai, durées factices) ([`journaux/ia-chrome-taches.log`](journaux/ia-chrome-taches.log)) :
```log
14:29:45.435 +4.28s DEBUG ai.provider Fournisseur d’IA : API de Chrome {"source":"chrome","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"writer":false,"proofreader":false,"translator":true}}
14:29:45.435 +4.28s INFO  ai.rewrite.start [ai.rewrite#4] IA locale : reformuler {"task":"rewrite","inLen":73,"excerpt":"Le MAB réunit les médias alternatifs belges, chacun gardant…","mode":"formal","lang":"fr","gen":"fr","api":"rewriter","source":"chrome"}
14:29:45.435 +4.28s DEBUG ai.rewrite.call [ai.rewrite#4 · 0 ms] Appel Rewriter (fr) {"api":"rewriter","lang":"fr","tone":"more-formal","length":"as-is","inLen":73}
14:29:45.441 +4.29s DEBUG ai.progress Téléchargement Rewriter : 50 % {"api":"rewriter","pct":50}
14:29:45.447 +4.29s DEBUG ai.progress Téléchargement Rewriter : 100 % {"api":"rewriter","pct":100}
14:29:45.452 +4.30s DEBUG ai.session.create Session Rewriter créée (16 ms) {"api":"rewriter","ms":16,"inputs":"fr","outputs":"fr","length":"as-is","tone":"more-formal","format":"plain-text"}
14:29:45.453 +4.30s DEBUG ai.rewrite.reply [ai.rewrite#4 · 18 ms] Réponse Rewriter : 25 car. en 17 ms {"api":"rewriter","ms":17,"outLen":25,"excerpt":"Le MAB réunit les médias."}
14:29:45.453 +4.30s INFO  ai.rewrite.ok [ai.rewrite#4 · 18 ms] Reformuler : proposition prête (Rewriter) {"via":"rewriter","fallback":false,"translated":false,"calls":1,"outLen":25,"excerpt":"Le MAB réunit les médias."}
…
14:29:45.459 +4.30s DEBUG ai.provider Fournisseur d’IA : API de Chrome {"source":"chrome","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"writer":false,"proofreader":false,"translator":true}}
14:29:45.459 +4.30s INFO  ai.title.start [ai.title#2] IA locale : titre pour Google {"task":"seoTitle","title":"Accueil","inLen":37,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"chrome"}
14:29:45.459 +4.30s DEBUG ai.title.call [ai.title#2 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"title","system":"189 car.","inLen":81}
14:29:45.460 +4.30s DEBUG ai.session.create Session Prompt API (Gemini Nano) créée (0 ms) {"api":"prompt","ms":0,"inputs":"text:fr","outputs":"text:fr","system":"1 message(s), 189 car.","inputQuota":6144}
14:29:45.460 +4.30s DEBUG ai.session.usage Prompt API : 420 / 6144 jetons d’entrée utilisés {"inputUsage":420,"inputQuota":6144}
14:29:45.460 +4.30s DEBUG ai.title.reply [ai.title#2 · 1 ms] Réponse Prompt API (Gemini Nano) : 58 car. en 1 ms {"api":"prompt","ms":1,"outLen":58,"excerpt":"{\"title\":\"MAB – fédération des médias alternatifs belges\"}"}
14:29:45.460 +4.30s INFO  ai.title.ok [ai.title#2 · 1 ms] Titre pour Google : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"outLen":46,"excerpt":"MAB – fédération des médias alternatifs belges"}
…
14:29:45.465 +4.31s DEBUG ai.provider Fournisseur d’IA : API de Chrome {"source":"chrome","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"writer":false,"proofreader":false,"translator":true}}
…
14:29:45.466 +4.31s INFO  ai.description.via-translation [ai.description#5 · 1 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":true}
…
14:29:45.472 +4.32s DEBUG ai.progress Téléchargement Summarizer : 50 % {"api":"summarizer","pct":50}
14:29:45.477 +4.32s DEBUG ai.progress Téléchargement Summarizer : 100 % {"api":"summarizer","pct":100}
14:29:45.483 +4.33s DEBUG ai.session.create Session Summarizer créée (17 ms) {"api":"summarizer","ms":17,"inputs":"fr","outputs":"fr","type":"tldr","length":"short","format":"plain-text","sharedContext":"109 car."}
…
14:29:45.484 +4.33s INFO  translate.model.start [translate.model#1] Préparation du traducteur fr → nl {"from":"fr","to":"nl"}
14:29:45.485 +4.33s INFO  translate.model.ok [translate.model#1 · 1 ms] Traducteur fr → nl prêt {"downloaded":false}
…
14:29:45.485 +4.33s INFO  ai.description.ok [ai.description#5 · 20 ms] Description pour Google : proposition prête (Summarizer, traduite en nl) {"via":"summarizer","fallback":false,"translated":true,"calls":2,"outLen":95,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
```

**Messages typiques d'échec**
| Ce que tu vois dans le journal | Cause probable | Que faire |
|---|---|---|
| `ai.availability` `{"state":"downloadable"}` pour une API, et rien ne se passe à l'usage | modèle pas encore téléchargé | « Télécharger » dans ✨ IA locale ; suis `ai.progress` ; `chrome://on-device-internals` montre le téléchargement |
| `ai.availability` `{"state":"downloading"}` qui dure | téléchargement en cours (plusieurs Go) ou bloqué par une connexion limitée | laisse Chrome ouvert, connexion illimitée ; vérifie l'espace disque |
| `ai.session.fail` / `ai.download.fail` avec `NotAllowedError` « Requires a user gesture… » | **geste requis** : Chrome ne télécharge un modèle qu'après un clic de la personne | clique toi-même « Télécharger » ; ne lance pas la tâche depuis la console |
| `ai.availability` `{"state":"unavailable"}` pour toutes les API, ou `ai.availability-fail` « The device is not eligible… » avec `hint` « Matériel insuffisant… » | **matériel insuffisant** (mémoire graphique, mémoire vive, disque) ou système non pris en charge | regarde la raison dans `chrome://on-device-internals` ; libère 22 Go ; essaie un autre ordinateur |
| `ai.availability` `{"state":"absent","global":"Rewriter"}` (ou Writer, Proofreader) | réglage `chrome://flags` non activé, ou Chrome trop ancien | étape 2 ; Atelier fait la même chose avec la Prompt API (`….fallback`) |
| `ai.availability` `{"state":"absent","global":"LanguageModel"}` | Prompt API absente (Chrome trop ancien, navigateur autre que Chrome, Chrome sur mobile) | Chrome à jour sur ordinateur |
| `….call-fail` avec `NotSupportedError` | **langue non prise en charge** par ce modèle (ex. Rewriter sans « Enabled Multilingual », ou une langue hors fr, de, en, es, ja) | réglage « Enabled Multilingual » ; pour le néerlandais Atelier traduit (`….via-translation`) |
| `….call-fail` avec `QuotaExceededError` | texte trop long pour le modèle | reformule une partie plus courte |
| `….call-fail` avec `InvalidStateError` ou `OperationError` / `UnknownError` | session fermée, modèle déchargé, mémoire graphique saturée | réessaie ; ferme des onglets ; regarde « Event Logs » dans `chrome://on-device-internals` |
| `….unreadable` avec un extrait en texte libre | le modèle n'a pas respecté le format JSON demandé | réessaie ; envoie-nous l'extrait |
| `ai.availability-timeout` | Chrome ne répond pas (service du modèle bloqué) | relance Chrome |

---

## Codes de ce chapitre

| Code | Niveau | Sens |
|---|---|---|
| `ai.alt.start`, `ai.alt.ok`, `ai.alt.fail`, `ai.alt.cancel` | INFO / INFO / ERROR / INFO | tâche « texte alternatif d'une image » |
| `ai.availability` | DEBUG (TRACE si inchangé) | état d'une API (options, durée) |
| `ai.availability-fail` | WARN | `availability()` a levé une erreur : API considérée indisponible |
| `ai.availability-timeout` | WARN | `availability()` sans réponse en 4 s |
| `ai.description.start`, `ai.description.ok`, `ai.description.fail`, `ai.description.cancel` | INFO / INFO / ERROR / INFO | tâche « description pour Google » |
| `ai.dialog` | INFO | fenêtre ✨ IA locale ouverte |
| `ai.download.start`, `ai.download.ok`, `ai.download.fail` | INFO / INFO / ERROR | téléchargement d'un modèle (bouton « Télécharger ») |
| `ai.download-follow` | INFO | suivi d'un téléchargement déjà lancé par Chrome (bouton « Voir la progression ») |
| `ai.download-stalled` | WARN | aucun avancement de Chrome depuis 20 s pendant un téléchargement suivi |
| `ai.download-done` | INFO | les téléchargements de Chrome sont terminés pendant que la fenêtre ✨ était ouverte |
| `ai.download-ui` | WARN | échec du bouton « Télécharger » non noté ailleurs |
| `ai.flag-copied` | DEBUG | adresse chrome://flags copiée |
| `ai.flag-copy-fail` | WARN | presse-papiers refusé |
| `ai.image-fail` | WARN | image en ligne illisible pour la description |
| `ai.image-missing` | WARN | pas d'image à décrire |
| `ai.keywords.start`, `ai.keywords.ok`, `ai.keywords.fail`, `ai.keywords.cancel` | INFO / INFO / ERROR / INFO | tâche « idées de mots-clés » |
| `ai.link.start`, `ai.link.ok`, `ai.link.fail`, `ai.link.cancel` | INFO / INFO / ERROR / INFO | tâche « texte de lien » |
| `ai.mark` | DEBUG | texte de l'IA appliqué dans la page et marqué « à relire » |
| `ai.params` | DEBUG | réglages par défaut de la Prompt API (topK, température) |
| `ai.progress` | DEBUG | progression d'un téléchargement de modèle |
| `ai.proofread.start`, `ai.proofread.ok`, `ai.proofread.fail`, `ai.proofread.cancel` | INFO / INFO / ERROR / INFO | tâche « corriger les fautes » |
| `ai.provider` | DEBUG | fournisseur utilisé (Chrome ou test) et API utilisables |
| `ai.rewrite.start`, `ai.rewrite.ok`, `ai.rewrite.fail`, `ai.rewrite.cancel` | INFO / INFO / ERROR / INFO | tâche « reformuler » |
| `ai.rewrite.absent`, `ai.title.absent`, `ai.alt.absent`… | WARN | IA absente pour cette tâche |
| `ai.rewrite.call`, `ai.rewrite.reply`, `ai.rewrite.call-fail`… | DEBUG / DEBUG / WARN | appel d'une API, sa réponse, son échec (toutes les tâches) |
| `ai.rewrite.cleaned`, `ai.keywords.cleaned`, `ai.alt.cleaned`… | DEBUG | proposition nettoyée |
| `ai.rewrite.fallback`, `ai.proofread.fallback`, `ai.description.fallback` | WARN | repli sur la Prompt API |
| `ai.rewrite.refused`, `ai.rewrite.refused-lang`, `ai.proofread.refused-lang`, `ai.link.refused-lang` | WARN | tâche refusée avant tout appel |
| `ai.rewrite.rejected`, `ai.alt.rejected`… | WARN | proposition vide rejetée |
| `ai.rewrite.warning`, `ai.description.warning` | WARN | avertissement sur le résultat |
| `ai.description.clamped`, `ai.title.clamped`, `ai.alt.clamped`, `ai.link.clamped` | WARN | proposition coupée à la longueur maximale |
| `ai.description.no-translator`, `ai.title.no-translator`, `ai.keywords.no-translator`, `ai.alt.no-translator` | WARN | pas de traducteur vers la langue demandée |
| `ai.description.via-translation`, `ai.title.via-translation`, `ai.keywords.via-translation`, `ai.alt.via-translation` | INFO | rédaction dans une autre langue puis traduction |
| `ai.title.unreadable`, `ai.title.schema-mismatch`… | WARN | réponse de la Prompt API illisible / sans le champ attendu |
| `ai.session.create` | DEBUG | session de Chrome créée (durée, langues, réglages, quota) |
| `ai.session.fail` | WARN | création de session impossible (nom de l'erreur, cause probable) |
| `ai.session.reuse` | TRACE | session réutilisée |
| `ai.session.usage` | DEBUG | jetons d'entrée utilisés / quota de la session (Prompt API) |
| `ai.status` | INFO (DEBUG avant une tâche) | résumé de l'état de toutes les API |
| `ai.title.start`, `ai.title.ok`, `ai.title.fail`, `ai.title.cancel` | INFO / INFO / ERROR / INFO | tâche « titre pour Google » |
| `ai.unexpected` | ERROR | erreur imprévue pendant une action ✨ |
