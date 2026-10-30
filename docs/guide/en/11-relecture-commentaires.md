# 11. Review and comments

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

**Comments** are attached to an element of the page (heading, image, button…), with replies and a “resolved” state. Each one is **signed** with its author's personal key: you know who wrote it, and you can see straight away if it was changed afterwards. They are kept in the project and never published on the site. They work **on your own** (notes for yourself) or **with others** (chapter 10); an invited **reviewer** can browse and comment, but not change anything.

**Log domains**
- `review.*`: the comments panel, adding, replying, resolving, deleting, valid or invalid signatures, comments received from others, refused review operations.
- Related: `collab.readonly` and `store.readonly` (review mode), `collab.ops.rejected` and `collab.remote-error` (a reviewer's change refused by the host), `collab.ops.out` / `collab.ops.in` (sending and receiving), `collab.identity.*` (personal key).

The text of comments is **never** written to the log: only its length (`chars`), its identifier (`cm_…`), the element commented on and the author's fingerprint (`fp`).

---

## 11.1 Reviewing without editing (review mode)

**Goal**: browse someone else's site and comment on it, with no risk of changing it.

**Steps**: open a **💬 Reviewer invite** link (chapter 10.3), enter your name, **Join**.

**What you see**: “Project received from Kudoro — review mode: comment with 💬.”, the “Review mode” badge at the top. You can change page, select, open 💬; any change shows “Review mode: you can browse and comment (💬), not edit.”.

**Expected log** ([`journaux/collab-relecture-relecteur.log`](../journaux/collab-relecture-relecteur.log))
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
Check: `collab.invite.open` with `"role":"reviewer"`, `collab.readonly`, then for each attempted change `store.readonly` (WARN) and the message. Nothing is sent to the host.

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| A change is sent anyway (old version of Atelier, extension, program) | reviewer: “Change refused: reviewer: only comments are allowed”; host: “Change refused (Laurent, reviewer): …” | host: `collab.ops.rejected` (WARN) `{"role":"reviewer","path":["name"]}`; reviewer: `collab.remote-error` (WARN) | nothing: the host does not apply the change. If it happens often, send us both logs |

On the host's side ([`journaux/collab-relecture-hote.log`](../journaux/collab-relecture-hote.log)):
```log
05:08:42.514 +17.28s WARN  collab.ops.rejected 1 modification(s) de Laurent refusée(s) (relecteur) : relecteur : seuls les commentaires sont autorisés {"name":"Laurent","role":"reviewer","count":1,"reason":"relecteur : seuls les commentaires sont autorisés","path":["name"]}
05:08:42.515 +17.28s ERROR ui.toast Message affiché : Modification refusée (Laurent, relecteur) : relecteur : seuls les commentaires sont autorisés {"type":"error"}
```
… and on the reviewer's side:
```log
05:08:42.520 +8.17s WARN  collab.remote-error L’autre côté signale : Modification refusée : relecteur : seuls les commentaires sont autorisés {"from":"Kudoro","message":"Modification refusée : relecteur : seuls les commentaires sont autorisés"}
```

---

## 11.2 Adding a comment

**Goal**: leave a remark on a specific element.

**Steps**
1. Select the element in the page.
2. Click **💬** (top bar): the “💬 Comments” panel replaces the inspector.
3. Write your remark, then **💬 Comment** (or Ctrl+Enter). The first time, enter your name in the “Your name (signs your comments)” field.

**What you see**: “Comment added and signed.”; the comment appears with “✓ signed” and a numbered badge is placed on the element. The 💬 button shows the number of open comments.

**Expected log** (a reviewer, in a session; [`journaux/review-ajouter.log`](../journaux/review-ajouter.log))
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
Check: `review.add` (who, on which element, `role`), `collab.ops.out` with `"review":1` (the comment is sent to the host), `review.sig.ok`.

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Without a session (notes for yourself) | nothing is sent | `review.add` `{"role":"seul"}`, no `collab.ops.out` ([`journaux/review-sans-session.log`](../journaux/review-sans-session.log)) |
| First time, with your name | a personal key is created | `collab.identity.new` before `review.add` |
| Comment on a template, the header or the footer | “(template)” in the anchor | `review.add` with `where` (e.g. `"header:"`) |

Extract without a session ([`journaux/review-sans-session.log`](../journaux/review-sans-session.log)):
```log
05:09:06.154 +0.84s INFO  collab.identity.new Clé personnelle créée pour Misako {"fp":"ExD_rKZhYH4w6wVJ","did":"did:key:zDnaenNjHzBv4t5J"}
…
05:09:06.158 +0.84s DEBUG store.commit Modification {"source":"review","past":1,"page":"p_2vt78shm"}
…
05:09:06.182 +0.87s INFO  review.add Commentaire ajouté et signé par Misako sur « Titre » {"id":"cm_wf3xX1-IZcGF","page":"p_2vt78shm","node":"n_4d2b6i4d0k","type":"heading","chars":22,"role":"seul"}
…
05:09:06.185 +0.87s DEBUG review.sig.ok Signature vérifiée : Misako {"id":"cm_wf3xX1-IZcGF","fp":"ExD_rKZhYH4w6wVJ","reply":false}
```

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| No name (first time) | “Enter your name to sign your comments.” | `review.no-identity` (WARN) ([`journaux/review-sans-nom.log`](../journaux/review-sans-nom.log)) | type your name above the field |
| Empty comment | “The comment is empty.” | `review.add-refused` (WARN) | write something |
| The project refuses the change (bug) | the error message | `review.apply-fail` (WARN) `{"what":"ajout"}` | send us the log |

```log
05:09:05.739 +0.42s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":0,"openCount":0,"readOnly":false}
…
05:09:05.803 +0.49s WARN  review.no-identity Commentaire non signé : nom manquant
05:09:05.803 +0.49s ERROR ui.toast Message affiché : Indiquez votre nom pour signer vos commentaires. {"type":"error"}
```

---

## 11.3 Receiving other people's comments

**Goal**: see the participants' comments arrive, live.

**Steps**: nothing to do; open 💬 to read them.

**What you see**: the counter on the 💬 button goes up; in the panel, each comment shows “✓ signed” (signature verified **on your side**, with the author's public key).

**Expected log** (on the host's side; [`journaux/review-recevoir.log`](../journaux/review-recevoir.log))
```log
05:08:42.689 +17.45s DEBUG collab.ops.in 1 modification(s) de Laurent appliquée(s) {"name":"Laurent","received":1,"applied":1,"review":1}
05:08:42.689 +17.45s DEBUG store.remote Modifications d’un autre participant appliquées {"ops":1,"history":3}
…
05:08:42.695 +17.46s INFO  review.remote Commentaire reçu de Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","page":"p_hlwzd6p4","node":"n_21063j4e5p"}
…
05:08:42.796 +17.56s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":1,"openCount":1,"readOnly":false}
05:08:42.802 +17.57s DEBUG review.sig.ok Signature vérifiée : Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","reply":false}
```
`review.remote` says what arrived: “Comment received from …”, “Reply received to …’s comment”, “Comment resolved (or reopened) by another participant”, “Comment deleted by another participant”. The host checks **every** comment before accepting it and passing it on (11.7).

---

## 11.4 Replying to a comment

**Goal**: discuss a remark.

**Steps**: under the comment, type in “Reply…”, then **Reply** (or Ctrl+Enter).

**What you see**: the reply appears under the comment, signed; it reaches the others.

**Expected log** (the host replies; [`journaux/review-repondre.log`](../journaux/review-repondre.log))
```log
05:08:42.891 +17.65s DEBUG store.commit Modification {"source":"review","past":4,"page":"p_hlwzd6p4"}
…
05:08:42.897 +17.66s DEBUG collab.ops.out 2 modification(s) envoyée(s) à 2 participant(s) {"n":2,"to":2,"review":2}
05:08:42.905 +17.67s INFO  review.reply Réponse ajoutée et signée par Kudoro {"comment":"cm_e_pChwMPXbaY","id":"cm_veMfqF8LDcQE","chars":24,"role":"owner"}
05:08:42.915 +17.68s DEBUG review.sig.ok Signature vérifiée : Kudoro {"id":"cm_veMfqF8LDcQE","fp":"IY4BOSk6K6wwsZ8i","reply":true}
```
On the reviewer's side ([`journaux/review-repondre-recu.log`](../journaux/review-repondre-recu.log)):
```log
05:08:42.904 +8.55s DEBUG collab.ops.in 2 modification(s) de Kudoro appliquée(s) {"name":"Kudoro","received":2,"applied":2,"review":2}
…
05:08:42.911 +8.56s INFO  review.remote Réponse reçue au commentaire de Laurent {"id":"cm_e_pChwMPXbaY","replies":1}
05:08:42.916 +8.56s DEBUG review.sig.ok Signature vérifiée : Kudoro {"id":"cm_veMfqF8LDcQE","fp":"IY4BOSk6K6wwsZ8i","reply":true}
```

**Variants and errors**
| Situation | Message shown | Log |
|---|---|---|
| Deleting a reply (✕, author or editor) | the reply disappears | `review.reply.delete` (INFO) |
| Empty reply | “The comment is empty.” | `review.reply-refused` (WARN) |
| The comment was deleted in the meantime | “Comment not found.” | `review.apply-fail` (WARN) `{"what":"réponse"}` |

---

## 11.5 Resolving or reopening a comment

**Goal**: mark a remark as dealt with.

**Steps**: **✓ Resolve** under the comment (then **Reopen** if needed). Any participant can do this, reviewers included.

**What you see**: the comment is greyed out, its badge disappears from the page, the 💬 counter goes down; on the others' side too.

**Expected log** (the host resolves, the reviewer receives; [`journaux/review-resoudre.log`](../journaux/review-resoudre.log))
```log
05:08:43.040 +17.80s DEBUG store.commit Modification {"source":"review","past":5,"page":"p_hlwzd6p4"}
…
05:08:43.047 +17.81s DEBUG collab.ops.out 1 modification(s) envoyée(s) à 2 participant(s) {"n":1,"to":2,"review":1}
05:08:43.059 +17.82s INFO  review.resolve Commentaire résolu {"id":"cm_e_pChwMPXbaY","resolved":true,"role":"owner"}
05:08:43.064 +8.71s INFO  review.remote Commentaire résolu par un autre participant {"id":"cm_e_pChwMPXbaY","resolved":true}
```

---

## 11.6 Deleting a comment

**Goal**: remove a comment and its replies.

**Steps**: **Delete** under the comment, then confirm. The button only appears for its author, the host and editors (or always, without a session).

**What you see**: the comment and its badge disappear.

**Expected log** ([`journaux/review-supprimer.log`](../journaux/review-supprimer.log))
```log
05:09:06.274 +0.96s DEBUG store.commit Modification {"source":"review","past":3,"page":"p_2vt78shm"}
…
05:09:06.280 +0.96s INFO  review.delete Commentaire supprimé avec ses réponses {"id":"cm_wf3xX1-IZcGF","replies":0}
```

**Variants**
| Situation | Log |
|---|---|
| You cancel the confirmation | `review.delete-cancel` (DEBUG) |
| In a session: a reviewer deletes someone else's comment (program, old version) | refused by the host: `review.ops.rejected` “only the author or an editor can delete a comment” |

---

## 11.7 Invalid signature

**Goal**: spot a comment that was changed after it was signed (.json file edited by hand, program, attempted fraud).

**What you see**: “⚠ invalid signature” instead of “✓ signed” (on hover: “The text or author does not match the signature”). In a session, the host **refuses** such a comment: it reaches nobody.

**Expected log — comment already in the project, text changed afterwards** ([`journaux/review-signature-invalide.log`](../journaux/review-signature-invalide.log))
```log
05:09:06.208 +0.89s DEBUG store.commit Modification {"source":"review","past":2,"page":"p_2vt78shm"}
…
05:09:06.219 +0.90s WARN  review.sig.bad Signature invalide : le texte ou l’auteur de ce commentaire ne correspondent pas à la signature (modifié après coup ?) {"id":"cm_wf3xX1-IZcGF","author":"Misako","fp":"ExD_rKZhYH4w6wVJ","reply":false}
```

**Expected log — forged comment sent by a participant** (the editor sends a comment whose text was changed after signing; [`journaux/review-signature-refusee.log`](../journaux/review-signature-refusee.log))
```log
05:08:57.679 +32.44s WARN  review.ops.rejected 1 opération(s) de relecture de Ana refusée(s) : signature du commentaire invalide {"name":"Ana","role":"editor","count":1,"reason":"signature du commentaire invalide","path":["review","comments","cm_nzS7samL_C8v"]}
05:08:57.681 +6.98s WARN  collab.remote-error L’autre côté signale : Modification refusée : signature du commentaire invalide {"from":"Kudoro","message":"Modification refusée : signature du commentaire invalide"}
```
The first line comes from the host, the second from the editor: the comment is not applied.

**Possible reasons for refusal** (`reason` of `review.ops.rejected`, WARN, on the host's side; in French in the extracts above)
| `reason` | Meaning |
|---|---|
| `invalid comment signature` / `invalid reply signature` (`signature du commentaire invalide` / `signature de la réponse invalide`) | text, author, date or anchor changed after signing |
| `comment in someone else’s name` / `reply in someone else’s name` (`commentaire au nom de quelqu’un d’autre` / `réponse au nom de quelqu’un d’autre`) | signed by someone other than the person sending it |
| `only the author or an editor can delete a comment` (or `a reply`) (`seul l’auteur ou un éditeur peut supprimer un commentaire` / `une réponse`) | deletion by a reviewer who is not the author |
| `changing a signed comment refused` (`modification d’un commentaire signé refusée`) | direct change to a field of a comment (other than “resolved” and the replies) |
| `replacing the whole review refused` / `deleting the whole review refused` (`remplacement de toute la relecture refusé` / `suppression de toute la relecture refusée`) | attempt to replace or erase all the comments |

What to do: if you did not edit anything by hand, do not trust the content of this comment and warn the host; send us the log.

---

## 11.8 Filtering and finding comments

**Goal**: see the comments on the page, all those still open, or all of them.

**Steps**: drop-down list at the top of the panel: “This page”, “Open (whole site)”, “All”. Click a comment's “↳ …” to go to the element (including a change of page or template), or click a numbered badge in the page to open its comment.

**Expected log**: `review.filter` (DEBUG) `{"filter":"open","count":…}`; `review.goto` (DEBUG) `{"page":…,"node":…,"found":true}` followed by `store.view` and `store.select`; `review.panel` (INFO) when the panel opens and closes (`comments`, `openCount`, `readOnly`).

---

## Codes in this chapter
| Code | Level | Meaning |
|---|---|---|
| `review.add` | INFO | comment added and signed |
| `review.add-refused` | WARN | comment refused (empty…) |
| `review.apply-fail` | WARN | operation on the comments impossible (`what`) |
| `review.delete` | INFO | comment deleted with its replies |
| `review.delete-cancel` | DEBUG | deletion cancelled |
| `review.filter` | DEBUG | panel filter changed |
| `review.goto` | DEBUG | go to the element commented on |
| `review.no-identity` | WARN | comment not signed: name missing |
| `review.ops.rejected` | WARN | review operation refused by the host (`reason`) |
| `review.panel` | INFO | comments panel opened or closed |
| `review.remote` | INFO | comment received, replied to, resolved or deleted by another participant |
| `review.reply` | INFO | reply added and signed |
| `review.reply-refused` | WARN | reply refused (empty…) |
| `review.reply.delete` | INFO | reply deleted |
| `review.resolve` | INFO | comment resolved or reopened |
| `review.sig.bad` | WARN | invalid signature (content changed after signing) |
| `review.sig.ok` | DEBUG | signature verified |
| `collab.readonly` | INFO | review mode on (chapter 10) |
| `store.readonly` | WARN | change refused in review mode |
