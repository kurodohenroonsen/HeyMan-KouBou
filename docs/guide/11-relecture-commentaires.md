# 11. Relecture et commentaires

Les **commentaires** se posent sur un élément de la page (titre, image, bouton…), avec des réponses et un état « résolu ». Chacun est **signé** par la clé personnelle de son auteur : on sait qui l'a écrit, et on voit tout de suite s'il a été modifié après coup. Ils sont gardés dans le projet, jamais publiés sur le site. Ils marchent **seul** (notes pour soi) ou **à plusieurs** (chapitre 10) ; un **relecteur** invité peut parcourir et commenter, mais rien modifier.

**Domaines du journal**
- `review.*` : le panneau des commentaires, ajout, réponse, résolution, suppression, signatures vérifiées ou invalides, commentaires reçus des autres, opérations de relecture refusées.
- Liés : `collab.readonly` et `store.readonly` (mode relecture), `collab.ops.rejected` et `collab.remote-error` (modification d'un relecteur refusée par l'hôte), `collab.ops.out` / `collab.ops.in` (envoi et réception), `collab.identity.*` (clé personnelle).

Le texte des commentaires n'est **jamais** écrit dans le journal : seulement sa longueur (`chars`), son identifiant (`cm_…`), l'élément commenté et l'empreinte de l'auteur (`fp`).

---

## 11.1 Relire sans modifier (mode relecture)

**But** : parcourir le site d'un autre et le commenter, sans risque de le modifier.

**Étapes** : ouvre un lien **💬 Invitation relecteur** (chapitre 10.3), indique ton nom, **Rejoindre**.

**Ce que tu vois** : « Projet reçu de Kudoro — mode relecture : commentez avec 💬. », la pastille « Mode relecture » en haut. Tu peux changer de page, sélectionner, ouvrir 💬 ; toute modification affiche « Mode relecture : vous pouvez parcourir et commenter (💬), pas modifier. ».

**Journal attendu** ([`journaux/collab-relecture-relecteur.log`](journaux/collab-relecture-relecteur.log))
```log
05:08:34.646 +0.29s INFO  collab.invite.open Invitation de Kudoro : relecteur {"role":"reviewer","owner":"Kudoro","ownerFp":"IY4BOSk6K6wwsZ8i","via":"boîte aux lettres","signal":"http://127.0.0.1:8864/publish.php","hours":168}
…
05:08:34.810 +0.46s INFO  collab.join.start [collab.join#1] Rejoindre une session {"name":"Laurent","fp":"7ylCE0KoKaMHlDzu","via":"boîte aux lettres"}
05:08:34.811 +0.46s DEBUG collab.join.invite [collab.join#1 · 1 ms] Invitation valable : Kudoro invite comme relecteur {"role":"reviewer","owner":"Kudoro","host":"caf096d817f96803","signal":"http://127.0.0.1:8864/publish.php","hours":168}
…
05:08:34.831 +0.48s INFO  collab.readonly Mode relecture : parcourir et commenter seulement {"role":"reviewer"}
…
05:08:40.891 +6.54s INFO  collab.join.ok [collab.join#1 · 6081 ms] Connecté·e à l’hôte : vérification des identités puis réception du projet {"role":"reviewer","room":"b0d6c15c"}
…
05:08:40.893 +6.54s INFO  collab.auth Identité vérifiée : Kudoro (hôte) {"name":"Kudoro","fp":"IY4BOSk6K6wwsZ8i","role":"owner","peers":1}
…
05:08:40.898 +6.54s INFO  collab.snapshot Projet reçu de Kudoro {"docId":"doc_a20a22aa6f5e49c0","pages":2,"comments":0}
…
05:08:40.912 +6.56s INFO  ui.toast Message affiché : Projet reçu de Kudoro — mode relecture : commentez avec 💬.
…
05:08:42.051 +7.70s DEBUG store.select Sélection : heading {"id":"n_5b6g691i2o","type":"heading"}
05:08:42.082 +7.73s DEBUG canvas.key Raccourci dans la page : Delete {"key":"Delete","in":"page","selected":"n_5b6g691i2o"}
05:08:42.083 +7.73s WARN  store.readonly Modification refusée : mode relecture {"source":"action"}
```
À vérifier : `collab.invite.open` avec `"role":"reviewer"`, `collab.readonly`, puis pour chaque tentative de modification `store.readonly` (WARN) et le message. Rien ne part vers l'hôte.

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Une modification part quand même (ancienne version d'Atelier, extension, programme) | relecteur : « Modification refusée : relecteur : seuls les commentaires sont autorisés » ; hôte : « Modification refusée (Laurent, relecteur) : … » | hôte : `collab.ops.rejected` (WARN) `{"role":"reviewer","path":["name"]}` ; relecteur : `collab.remote-error` (WARN) | rien : l'hôte n'applique pas la modification. Si c'est fréquent, envoie-nous les deux journaux |

Chez l'hôte ([`journaux/collab-relecture-hote.log`](journaux/collab-relecture-hote.log)) :
```log
05:08:42.514 +17.28s WARN  collab.ops.rejected 1 modification(s) de Laurent refusée(s) (relecteur) : relecteur : seuls les commentaires sont autorisés {"name":"Laurent","role":"reviewer","count":1,"reason":"relecteur : seuls les commentaires sont autorisés","path":["name"]}
05:08:42.515 +17.28s ERROR ui.toast Message affiché : Modification refusée (Laurent, relecteur) : relecteur : seuls les commentaires sont autorisés {"type":"error"}
```
… et chez le relecteur :
```log
05:08:42.520 +8.17s WARN  collab.remote-error L’autre côté signale : Modification refusée : relecteur : seuls les commentaires sont autorisés {"from":"Kudoro","message":"Modification refusée : relecteur : seuls les commentaires sont autorisés"}
```

---

## 11.2 Ajouter un commentaire

**But** : poser une remarque sur un élément précis.

**Étapes**
1. Sélectionne l'élément dans la page.
2. Clique **💬** (barre du haut) : le panneau « 💬 Commentaires » remplace l'inspecteur.
3. Écris ta remarque, puis **💬 Commenter** (ou Ctrl+Entrée). La première fois, indique ton nom dans le champ « Votre nom (signe vos commentaires) ».

**Ce que tu vois** : « Commentaire ajouté et signé. » ; le commentaire apparaît avec « ✓ signé » et une pastille numérotée se pose sur l'élément. Le bouton 💬 affiche le nombre de commentaires ouverts.

**Journal attendu** (un relecteur, en session ; [`journaux/review-ajouter.log`](journaux/review-ajouter.log))
```log
05:08:42.591 +8.24s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":0,"openCount":0,"readOnly":true}
…
05:08:42.675 +8.32s DEBUG store.commit Modification {"source":"review","past":1,"page":"p_hlwzd6p4"}
…
05:08:42.685 +8.33s DEBUG collab.ops.out 1 modification(s) envoyée(s) à 1 participant(s) {"n":1,"to":1,"review":1}
…
05:08:42.712 +8.36s INFO  review.add Commentaire ajouté et signé par Laurent sur « Titre » {"id":"cm_e_pChwMPXbaY","page":"p_hlwzd6p4","node":"n_21063j4e5p","type":"heading","chars":34,"role":"reviewer"}
05:08:42.714 +8.36s INFO  ui.toast Message affiché : Commentaire ajouté et signé.
05:08:42.715 +8.36s DEBUG review.sig.ok Signature vérifiée : Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","reply":false}
```
À vérifier : `review.add` (qui, sur quel élément, `role`), `collab.ops.out` avec `"review":1` (le commentaire part chez l'hôte), `review.sig.ok`.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Sans session (notes pour toi) | rien ne part | `review.add` `{"role":"seul"}`, pas de `collab.ops.out` ([`journaux/review-sans-session.log`](journaux/review-sans-session.log)) |
| Première fois, avec ton nom | une clé personnelle est créée | `collab.identity.new` avant `review.add` |
| Commentaire sur un modèle, l'en-tête ou le pied | « (modèle) » dans l'ancre | `review.add` avec `where` (ex. `"header:"`) |

Extrait sans session ([`journaux/review-sans-session.log`](journaux/review-sans-session.log)) :
```log
05:09:06.154 +0.84s INFO  collab.identity.new Clé personnelle créée pour Misako {"fp":"ExD_rKZhYH4w6wVJ","did":"did:key:zDnaenNjHzBv4t5J"}
…
05:09:06.158 +0.84s DEBUG store.commit Modification {"source":"review","past":1,"page":"p_2vt78shm"}
…
05:09:06.182 +0.87s INFO  review.add Commentaire ajouté et signé par Misako sur « Titre » {"id":"cm_wf3xX1-IZcGF","page":"p_2vt78shm","node":"n_4d2b6i4d0k","type":"heading","chars":22,"role":"seul"}
…
05:09:06.185 +0.87s DEBUG review.sig.ok Signature vérifiée : Misako {"id":"cm_wf3xX1-IZcGF","fp":"ExD_rKZhYH4w6wVJ","reply":false}
```

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Pas de nom (première fois) | « Indiquez votre nom pour signer vos commentaires. » | `review.no-identity` (WARN) ([`journaux/review-sans-nom.log`](journaux/review-sans-nom.log)) | écris ton nom au-dessus du champ |
| Commentaire vide | « Le commentaire est vide. » | `review.add-refused` (WARN) | écris quelque chose |
| Le projet refuse la modification (bogue) | message de l'erreur | `review.apply-fail` (WARN) `{"what":"ajout"}` | envoie-nous le journal |

```log
05:09:05.739 +0.42s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":0,"openCount":0,"readOnly":false}
…
05:09:05.803 +0.49s WARN  review.no-identity Commentaire non signé : nom manquant
05:09:05.803 +0.49s ERROR ui.toast Message affiché : Indiquez votre nom pour signer vos commentaires. {"type":"error"}
```

---

## 11.3 Recevoir les commentaires des autres

**But** : voir arriver, en direct, les commentaires des participants.

**Étapes** : rien à faire ; ouvre 💬 pour les lire.

**Ce que tu vois** : le compteur du bouton 💬 augmente ; dans le panneau, chaque commentaire porte « ✓ signé » (signature vérifiée **chez toi**, avec la clé publique de l'auteur).

**Journal attendu** (chez l'hôte ; [`journaux/review-recevoir.log`](journaux/review-recevoir.log))
```log
05:08:42.689 +17.45s DEBUG collab.ops.in 1 modification(s) de Laurent appliquée(s) {"name":"Laurent","received":1,"applied":1,"review":1}
05:08:42.689 +17.45s DEBUG store.remote Modifications d’un autre participant appliquées {"ops":1,"history":3}
…
05:08:42.695 +17.46s INFO  review.remote Commentaire reçu de Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","page":"p_hlwzd6p4","node":"n_21063j4e5p"}
…
05:08:42.796 +17.56s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":1,"openCount":1,"readOnly":false}
05:08:42.802 +17.57s DEBUG review.sig.ok Signature vérifiée : Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","reply":false}
```
`review.remote` dit ce qui est arrivé : « Commentaire reçu de … », « Réponse reçue au commentaire de … », « Commentaire résolu (ou rouvert) par un autre participant », « Commentaire supprimé par un autre participant ». L'hôte vérifie **chaque** commentaire avant de l'accepter et de le relayer (11.7).

---

## 11.4 Répondre à un commentaire

**But** : discuter d'une remarque.

**Étapes** : sous le commentaire, écris dans « Répondre… », puis **Répondre** (ou Ctrl+Entrée).

**Ce que tu vois** : la réponse s'affiche sous le commentaire, signée ; elle arrive chez les autres.

**Journal attendu** (l'hôte répond ; [`journaux/review-repondre.log`](journaux/review-repondre.log))
```log
05:08:42.891 +17.65s DEBUG store.commit Modification {"source":"review","past":4,"page":"p_hlwzd6p4"}
…
05:08:42.897 +17.66s DEBUG collab.ops.out 2 modification(s) envoyée(s) à 2 participant(s) {"n":2,"to":2,"review":2}
05:08:42.905 +17.67s INFO  review.reply Réponse ajoutée et signée par Kudoro {"comment":"cm_e_pChwMPXbaY","id":"cm_veMfqF8LDcQE","chars":24,"role":"owner"}
05:08:42.915 +17.68s DEBUG review.sig.ok Signature vérifiée : Kudoro {"id":"cm_veMfqF8LDcQE","fp":"IY4BOSk6K6wwsZ8i","reply":true}
```
Chez le relecteur ([`journaux/review-repondre-recu.log`](journaux/review-repondre-recu.log)) :
```log
05:08:42.904 +8.55s DEBUG collab.ops.in 2 modification(s) de Kudoro appliquée(s) {"name":"Kudoro","received":2,"applied":2,"review":2}
…
05:08:42.911 +8.56s INFO  review.remote Réponse reçue au commentaire de Laurent {"id":"cm_e_pChwMPXbaY","replies":1}
05:08:42.916 +8.56s DEBUG review.sig.ok Signature vérifiée : Kudoro {"id":"cm_veMfqF8LDcQE","fp":"IY4BOSk6K6wwsZ8i","reply":true}
```

**Variantes et erreurs**
| Situation | Message affiché | Journal |
|---|---|---|
| Supprimer une réponse (✕, auteur ou éditeur) | la réponse disparaît | `review.reply.delete` (INFO) |
| Réponse vide | « Le commentaire est vide. » | `review.reply-refused` (WARN) |
| Le commentaire a été supprimé entre-temps | « Commentaire introuvable. » | `review.apply-fail` (WARN) `{"what":"réponse"}` |

---

## 11.5 Résoudre ou rouvrir un commentaire

**But** : marquer une remarque comme traitée.

**Étapes** : **✓ Résolu** sous le commentaire (puis **Rouvrir** si besoin). Tout participant peut le faire, relecteur compris.

**Ce que tu vois** : le commentaire passe en grisé, sa pastille disparaît de la page, le compteur 💬 diminue ; chez les autres aussi.

**Journal attendu** (l'hôte résout, le relecteur reçoit ; [`journaux/review-resoudre.log`](journaux/review-resoudre.log))
```log
05:08:43.040 +17.80s DEBUG store.commit Modification {"source":"review","past":5,"page":"p_hlwzd6p4"}
…
05:08:43.047 +17.81s DEBUG collab.ops.out 1 modification(s) envoyée(s) à 2 participant(s) {"n":1,"to":2,"review":1}
05:08:43.059 +17.82s INFO  review.resolve Commentaire résolu {"id":"cm_e_pChwMPXbaY","resolved":true,"role":"owner"}
05:08:43.064 +8.71s INFO  review.remote Commentaire résolu par un autre participant {"id":"cm_e_pChwMPXbaY","resolved":true}
```

---

## 11.6 Supprimer un commentaire

**But** : retirer un commentaire et ses réponses.

**Étapes** : **Supprimer** sous le commentaire, puis confirme. Le bouton n'apparaît que pour son auteur, l'hôte et les éditeurs (ou toujours, sans session).

**Ce que tu vois** : le commentaire et sa pastille disparaissent.

**Journal attendu** ([`journaux/review-supprimer.log`](journaux/review-supprimer.log))
```log
05:09:06.274 +0.96s DEBUG store.commit Modification {"source":"review","past":3,"page":"p_2vt78shm"}
…
05:09:06.280 +0.96s INFO  review.delete Commentaire supprimé avec ses réponses {"id":"cm_wf3xX1-IZcGF","replies":0}
```

**Variantes**
| Situation | Journal |
|---|---|
| Tu annules la confirmation | `review.delete-cancel` (DEBUG) |
| En session : un relecteur supprime le commentaire d'un autre (programme, ancienne version) | refusé par l'hôte : `review.ops.rejected` « seul l’auteur ou un éditeur peut supprimer un commentaire » |

---

## 11.7 Signature invalide

**But** : repérer un commentaire modifié après sa signature (fichier .json retouché à la main, programme, tentative de fraude).

**Ce que tu vois** : « ⚠ signature invalide » à la place de « ✓ signé » (survol : « Le texte ou l’auteur ne correspondent pas à la signature »). En session, l'hôte **refuse** un tel commentaire : il n'arrive chez personne.

**Journal attendu — commentaire déjà dans le projet, texte changé après coup** ([`journaux/review-signature-invalide.log`](journaux/review-signature-invalide.log))
```log
05:09:06.208 +0.89s DEBUG store.commit Modification {"source":"review","past":2,"page":"p_2vt78shm"}
…
05:09:06.219 +0.90s WARN  review.sig.bad Signature invalide : le texte ou l’auteur de ce commentaire ne correspondent pas à la signature (modifié après coup ?) {"id":"cm_wf3xX1-IZcGF","author":"Misako","fp":"ExD_rKZhYH4w6wVJ","reply":false}
```

**Journal attendu — commentaire falsifié envoyé par un participant** (l'éditrice envoie un commentaire dont le texte a été changé après la signature ; [`journaux/review-signature-refusee.log`](journaux/review-signature-refusee.log))
```log
05:08:57.679 +32.44s WARN  review.ops.rejected 1 opération(s) de relecture de Ana refusée(s) : signature du commentaire invalide {"name":"Ana","role":"editor","count":1,"reason":"signature du commentaire invalide","path":["review","comments","cm_nzS7samL_C8v"]}
05:08:57.681 +6.98s WARN  collab.remote-error L’autre côté signale : Modification refusée : signature du commentaire invalide {"from":"Kudoro","message":"Modification refusée : signature du commentaire invalide"}
```
La première ligne vient de l'hôte, la seconde de l'éditrice : le commentaire n'est pas appliqué.

**Raisons de refus possibles** (`reason` de `review.ops.rejected`, WARN, chez l'hôte)
| `reason` | Sens |
|---|---|
| `signature du commentaire invalide` / `signature de la réponse invalide` | texte, auteur, date ou ancre changés après la signature |
| `commentaire au nom de quelqu’un d’autre` / `réponse au nom de quelqu’un d’autre` | signé par une autre personne que celle qui l'envoie |
| `seul l’auteur ou un éditeur peut supprimer un commentaire` (ou `une réponse`) | suppression par un relecteur qui n'en est pas l'auteur |
| `modification d’un commentaire signé refusée` | changement direct d'un champ d'un commentaire (autre que « résolu » et les réponses) |
| `remplacement de toute la relecture refusé` / `suppression de toute la relecture refusée` | tentative de remplacer ou d'effacer tous les commentaires |

Que faire : si tu n'as rien retouché, ne fais pas confiance au contenu de ce commentaire et préviens l'hôte ; envoie-nous le journal.

---

## 11.8 Filtrer et retrouver les commentaires

**But** : voir les commentaires de la page, tous ceux qui restent ouverts, ou tous.

**Étapes** : liste déroulante en haut du panneau : « Cette page », « Ouverts (tout le site) », « Tous ». Clique sur « ↳ … » d'un commentaire pour aller à l'élément (changement de page ou de modèle compris), ou sur une pastille numérotée dans la page pour ouvrir son commentaire.

**Journal attendu** : `review.filter` (DEBUG) `{"filter":"open","count":…}` ; `review.goto` (DEBUG) `{"page":…,"node":…,"found":true}` suivi de `store.view` et `store.select` ; `review.panel` (INFO) à l'ouverture et à la fermeture du panneau (`comments`, `openCount`, `readOnly`).

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `review.add` | INFO | commentaire ajouté et signé |
| `review.add-refused` | WARN | commentaire refusé (vide…) |
| `review.apply-fail` | WARN | opération sur les commentaires impossible (`what`) |
| `review.delete` | INFO | commentaire supprimé avec ses réponses |
| `review.delete-cancel` | DEBUG | suppression annulée |
| `review.filter` | DEBUG | filtre du panneau changé |
| `review.goto` | DEBUG | aller à l'élément commenté |
| `review.no-identity` | WARN | commentaire non signé : nom manquant |
| `review.ops.rejected` | WARN | opération de relecture refusée par l'hôte (`reason`) |
| `review.panel` | INFO | panneau des commentaires ouvert ou fermé |
| `review.remote` | INFO | commentaire reçu, répondu, résolu ou supprimé par un autre participant |
| `review.reply` | INFO | réponse ajoutée et signée |
| `review.reply-refused` | WARN | réponse refusée (vide…) |
| `review.reply.delete` | INFO | réponse supprimée |
| `review.resolve` | INFO | commentaire résolu ou rouvert |
| `review.sig.bad` | WARN | signature invalide (contenu modifié après signature) |
| `review.sig.ok` | DEBUG | signature vérifiée |
| `collab.readonly` | INFO | mode relecture activé (chapitre 10) |
| `store.readonly` | WARN | modification refusée en mode relecture |
