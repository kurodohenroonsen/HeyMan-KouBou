# 11. レビューとコメント

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

**コメント** はページの要素（見出し、画像、ボタンなど）に付けるもので、返信と「解決」の状態を持ちます。コメントはそれぞれ作成者の個人鍵で **署名** されるので、誰が書いたかがわかり、あとから変更された場合もすぐにわかります。コメントはプロジェクト内に保存され、サイトに公開されることはありません。**ひとり** で（自分用のメモとして）も、**複数人** で（第 10 章）も使えます。招待された **レビュアー** は、閲覧とコメントはできますが、何も変更できません。

**ログのドメイン**
- `review.*`：コメントパネル、追加、返信、解決、削除、署名の確認結果（有効・無効）、ほかの人から受け取ったコメント、拒否されたレビュー操作。
- 関連：`collab.readonly` と `store.readonly`（レビューモード）、`collab.ops.rejected` と `collab.remote-error`（レビュアーの変更をホストが拒否）、`collab.ops.out`／`collab.ops.in`（送信と受信）、`collab.identity.*`（個人鍵）。

コメントの本文がログに書かれることは **決してありません**。記録されるのは、長さ（`chars`）、ID（`cm_…`）、コメントを付けた要素、作成者のフィンガープリント（`fp`）だけです。

---

## 11.1 変更せずにレビューする（レビューモード）

**目的**：ほかの人のサイトを、変更してしまう心配なく閲覧し、コメントします。

**手順**：**「💬 レビュアーとして招待」** のリンク（第 10 章の 10.3）を開き、名前を入力して **「参加」** をクリックします。

**画面の表示**：「Kudoro からプロジェクトを受信しました — レビューモード：💬 でコメントしてください。」と表示され、上部に「レビューモード」のバッジが出ます。ページの切り替え、選択、💬 を開くことはできます。何かを変更しようとすると「レビューモード：閲覧とコメント（💬）はできますが、編集はできません。」と表示されます。

**想定されるログ**（[`journaux/collab-relecture-relecteur.log`](../journaux/collab-relecture-relecteur.log)）
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
確認ポイント：`"role":"reviewer"` の付いた `collab.invite.open`、`collab.readonly`、続いて変更を試みるたびに `store.readonly`（WARN）とメッセージ。ホストには何も送られません。

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| それでも変更が送られた（古いバージョンの Atelier、拡張機能、プログラム） | レビュアー：「変更を拒否しました：レビュアー：コメントのみ許可されています」、ホスト：「変更を拒否しました（Laurent、レビュアー）：…」 | ホスト：`collab.ops.rejected`（WARN）`{"role":"reviewer","path":["name"]}`、レビュアー：`collab.remote-error`（WARN） | 何もしなくてかまいません。ホストは変更を適用しません。頻繁に起こる場合は、双方のログを送ってください |

ホスト側（[`journaux/collab-relecture-hote.log`](../journaux/collab-relecture-hote.log)）：
```log
05:08:42.514 +17.28s WARN  collab.ops.rejected 1 modification(s) de Laurent refusée(s) (relecteur) : relecteur : seuls les commentaires sont autorisés {"name":"Laurent","role":"reviewer","count":1,"reason":"relecteur : seuls les commentaires sont autorisés","path":["name"]}
05:08:42.515 +17.28s ERROR ui.toast Message affiché : Modification refusée (Laurent, relecteur) : relecteur : seuls les commentaires sont autorisés {"type":"error"}
```
… レビュアー側：
```log
05:08:42.520 +8.17s WARN  collab.remote-error L’autre côté signale : Modification refusée : relecteur : seuls les commentaires sont autorisés {"from":"Kudoro","message":"Modification refusée : relecteur : seuls les commentaires sont autorisés"}
```

---

## 11.2 コメントを追加する

**目的**：特定の要素に意見を書き込みます。

**手順**
1. ページで要素を選択します。
2. 上部のバーの **💬** をクリックします。インスペクターの代わりに「💬 コメント」パネルが表示されます。
3. 意見を書き、**「💬 コメントする」**（または Ctrl+Enter）をクリックします。初回は「名前（コメントに署名します）」フィールドに名前を入力します。

**画面の表示**：「コメントを追加して署名しました。」と表示され、コメントに「✓ 署名済み」が付き、要素に番号付きのバッジが付きます。💬 ボタンには未解決のコメントの数が表示されます。

**想定されるログ**（セッション中のレビュアー。[`journaux/review-ajouter.log`](../journaux/review-ajouter.log)）
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
確認ポイント：`review.add`（誰が、どの要素に、`role`）、`"review":1` の付いた `collab.ops.out`（コメントがホストに送られる）、`review.sig.ok`。

**バリエーション**
| 状況 | 変化 | ログ |
|---|---|---|
| セッションなし（自分用のメモ） | 何も送られない | `review.add` `{"role":"seul"}`、`collab.ops.out` はなし（[`journaux/review-sans-session.log`](../journaux/review-sans-session.log)） |
| 初回で、名前を入力した | 個人鍵が作成される | `review.add` の前に `collab.identity.new` |
| テンプレート、ヘッダー、フッターへのコメント | 付け先の表示に「（テンプレート）」 | `where` 付きの `review.add`（例：`"header:"`） |

セッションなしの場合の抜粋（[`journaux/review-sans-session.log`](../journaux/review-sans-session.log)）：
```log
05:09:06.154 +0.84s INFO  collab.identity.new Clé personnelle créée pour Misako {"fp":"ExD_rKZhYH4w6wVJ","did":"did:key:zDnaenNjHzBv4t5J"}
…
05:09:06.158 +0.84s DEBUG store.commit Modification {"source":"review","past":1,"page":"p_2vt78shm"}
…
05:09:06.182 +0.87s INFO  review.add Commentaire ajouté et signé par Misako sur « Titre » {"id":"cm_wf3xX1-IZcGF","page":"p_2vt78shm","node":"n_4d2b6i4d0k","type":"heading","chars":22,"role":"seul"}
…
05:09:06.185 +0.87s DEBUG review.sig.ok Signature vérifiée : Misako {"id":"cm_wf3xX1-IZcGF","fp":"ExD_rKZhYH4w6wVJ","reply":false}
```

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| 名前がない（初回） | 「コメントに署名するために名前を入力してください。」 | `review.no-identity`（WARN）（[`journaux/review-sans-nom.log`](../journaux/review-sans-nom.log)） | 入力欄の上に名前を入力してください |
| コメントが空 | 「コメントが空です。」 | `review.add-refused`（WARN） | 何か書いてください |
| プロジェクトが変更を受け付けない（バグ） | エラーのメッセージ | `review.apply-fail`（WARN）`{"what":"ajout"}` | ログを送ってください |

```log
05:09:05.739 +0.42s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":0,"openCount":0,"readOnly":false}
…
05:09:05.803 +0.49s WARN  review.no-identity Commentaire non signé : nom manquant
05:09:05.803 +0.49s ERROR ui.toast Message affiché : Indiquez votre nom pour signer vos commentaires. {"type":"error"}
```

---

## 11.3 ほかの人のコメントを受け取る

**目的**：参加者のコメントが届くのをリアルタイムで見ます。

**手順**：何もする必要はありません。読むときは 💬 を開きます。

**画面の表示**：💬 ボタンの数が増えます。パネルでは、各コメントに「✓ 署名済み」が付いています（作成者の公開鍵を使い、**あなたの側で** 署名を確認しています）。

**想定されるログ**（ホスト側。[`journaux/review-recevoir.log`](../journaux/review-recevoir.log)）
```log
05:08:42.689 +17.45s DEBUG collab.ops.in 1 modification(s) de Laurent appliquée(s) {"name":"Laurent","received":1,"applied":1,"review":1}
05:08:42.689 +17.45s DEBUG store.remote Modifications d’un autre participant appliquées {"ops":1,"history":3}
…
05:08:42.695 +17.46s INFO  review.remote Commentaire reçu de Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","page":"p_hlwzd6p4","node":"n_21063j4e5p"}
…
05:08:42.796 +17.56s INFO  review.panel Panneau des commentaires ouvert {"open":true,"comments":1,"openCount":1,"readOnly":false}
05:08:42.802 +17.57s DEBUG review.sig.ok Signature vérifiée : Laurent {"id":"cm_e_pChwMPXbaY","fp":"7ylCE0KoKaMHlDzu","reply":false}
```
`review.remote` は届いた内容を示します：「… からコメントを受信」「… のコメントへの返信を受信」「別の参加者がコメントを解決しました（または再オープンしました）」「別の参加者がコメントを削除しました」。ホストは、受け入れて中継する前に **すべての** コメントを確認します（11.7）。

---

## 11.4 コメントに返信する

**目的**：意見について話し合います。

**手順**：コメントの下の「返信…」に書き込み、**「返信」**（または Ctrl+Enter）をクリックします。

**画面の表示**：返信が署名付きでコメントの下に表示され、ほかの人にも届きます。

**想定されるログ**（ホストが返信する場合。[`journaux/review-repondre.log`](../journaux/review-repondre.log)）
```log
05:08:42.891 +17.65s DEBUG store.commit Modification {"source":"review","past":4,"page":"p_hlwzd6p4"}
…
05:08:42.897 +17.66s DEBUG collab.ops.out 2 modification(s) envoyée(s) à 2 participant(s) {"n":2,"to":2,"review":2}
05:08:42.905 +17.67s INFO  review.reply Réponse ajoutée et signée par Kudoro {"comment":"cm_e_pChwMPXbaY","id":"cm_veMfqF8LDcQE","chars":24,"role":"owner"}
05:08:42.915 +17.68s DEBUG review.sig.ok Signature vérifiée : Kudoro {"id":"cm_veMfqF8LDcQE","fp":"IY4BOSk6K6wwsZ8i","reply":true}
```
レビュアー側（[`journaux/review-repondre-recu.log`](../journaux/review-repondre-recu.log)）：
```log
05:08:42.904 +8.55s DEBUG collab.ops.in 2 modification(s) de Kudoro appliquée(s) {"name":"Kudoro","received":2,"applied":2,"review":2}
…
05:08:42.911 +8.56s INFO  review.remote Réponse reçue au commentaire de Laurent {"id":"cm_e_pChwMPXbaY","replies":1}
05:08:42.916 +8.56s DEBUG review.sig.ok Signature vérifiée : Kudoro {"id":"cm_veMfqF8LDcQE","fp":"IY4BOSk6K6wwsZ8i","reply":true}
```

**バリエーションとエラー**
| 状況 | 表示されるメッセージ | ログ |
|---|---|---|
| 返信を削除する（✕、作成者または編集者） | 返信が消える | `review.reply.delete`（INFO） |
| 返信が空 | 「コメントが空です。」 | `review.reply-refused`（WARN） |
| その間にコメントが削除された | 「コメントが見つかりません。」 | `review.apply-fail`（WARN）`{"what":"réponse"}` |

---

## 11.5 コメントを解決する・再オープンする

**目的**：意見を対応済みとしてマークします。

**手順**：コメントの下の **「✓ 解決」** をクリックします（必要なら、あとで **「再オープン」**）。レビュアーを含め、どの参加者でもできます。

**画面の表示**：コメントがグレー表示になり、ページ上のバッジが消え、💬 の数が減ります。ほかの人の画面でも同じです。

**想定されるログ**（ホストが解決し、レビュアーが受け取る場合。[`journaux/review-resoudre.log`](../journaux/review-resoudre.log)）
```log
05:08:43.040 +17.80s DEBUG store.commit Modification {"source":"review","past":5,"page":"p_hlwzd6p4"}
…
05:08:43.047 +17.81s DEBUG collab.ops.out 1 modification(s) envoyée(s) à 2 participant(s) {"n":1,"to":2,"review":1}
05:08:43.059 +17.82s INFO  review.resolve Commentaire résolu {"id":"cm_e_pChwMPXbaY","resolved":true,"role":"owner"}
05:08:43.064 +8.71s INFO  review.remote Commentaire résolu par un autre participant {"id":"cm_e_pChwMPXbaY","resolved":true}
```

---

## 11.6 コメントを削除する

**目的**：コメントとその返信を取り除きます。

**手順**：コメントの下の **「削除」** をクリックし、確認します。このボタンが表示されるのは、作成者、ホスト、編集者だけです（セッションなしの場合は常に表示）。

**画面の表示**：コメントとそのバッジが消えます。

**想定されるログ**（[`journaux/review-supprimer.log`](../journaux/review-supprimer.log)）
```log
05:09:06.274 +0.96s DEBUG store.commit Modification {"source":"review","past":3,"page":"p_2vt78shm"}
…
05:09:06.280 +0.96s INFO  review.delete Commentaire supprimé avec ses réponses {"id":"cm_wf3xX1-IZcGF","replies":0}
```

**バリエーション**
| 状況 | ログ |
|---|---|
| 確認でキャンセルした | `review.delete-cancel`（DEBUG） |
| セッション中に、レビュアーがほかの人のコメントを削除した（プログラム、古いバージョン） | ホストが拒否：`review.ops.rejected`「コメントを削除できるのは作成者または編集者のみです」 |

---

## 11.7 無効な署名

**目的**：署名のあとで変更されたコメント（手で書き換えた .json ファイル、プログラム、不正の試み）を見つけます。

**画面の表示**：「✓ 署名済み」の代わりに「⚠ 無効な署名」が表示されます（マウスを重ねると「テキストまたは作成者が署名と一致しません」）。セッション中は、ホストがそのようなコメントを **拒否** するので、誰にも届きません。

**想定されるログ — プロジェクトにすでにあるコメントの本文が、あとから変更された場合**（[`journaux/review-signature-invalide.log`](../journaux/review-signature-invalide.log)）
```log
05:09:06.208 +0.89s DEBUG store.commit Modification {"source":"review","past":2,"page":"p_2vt78shm"}
…
05:09:06.219 +0.90s WARN  review.sig.bad Signature invalide : le texte ou l’auteur de ce commentaire ne correspondent pas à la signature (modifié après coup ?) {"id":"cm_wf3xX1-IZcGF","author":"Misako","fp":"ExD_rKZhYH4w6wVJ","reply":false}
```

**想定されるログ — 参加者が偽造されたコメントを送った場合**（編集者が、署名のあとで本文を変えたコメントを送る。[`journaux/review-signature-refusee.log`](../journaux/review-signature-refusee.log)）
```log
05:08:57.679 +32.44s WARN  review.ops.rejected 1 opération(s) de relecture de Ana refusée(s) : signature du commentaire invalide {"name":"Ana","role":"editor","count":1,"reason":"signature du commentaire invalide","path":["review","comments","cm_nzS7samL_C8v"]}
05:08:57.681 +6.98s WARN  collab.remote-error L’autre côté signale : Modification refusée : signature du commentaire invalide {"from":"Kudoro","message":"Modification refusée : signature du commentaire invalide"}
```
1 行目はホスト側、2 行目は編集者側のものです。コメントは適用されません。

**考えられる拒否の理由**（ホスト側の `review.ops.rejected`（WARN）の `reason`）
| `reason` | 意味 |
|---|---|
| `signature du commentaire invalide`／`signature de la réponse invalide`（「コメントの署名が無効です」／「返信の署名が無効です」） | 署名のあとで本文、作成者、日付、または付け先が変更された |
| `commentaire au nom de quelqu’un d’autre`／`réponse au nom de quelqu’un d’autre`（「他人の名前でのコメント」／「他人の名前での返信」） | 送ってきた人とは別の人が署名している |
| `seul l’auteur ou un éditeur peut supprimer un commentaire`（または `une réponse`）（「コメント（返信）を削除できるのは作成者または編集者のみです」） | 作成者ではないレビュアーによる削除 |
| `modification d’un commentaire signé refusée`（「署名済みコメントの変更は拒否されました」） | コメントのフィールドを直接変更しようとした（「解決」と返信以外） |
| `remplacement de toute la relecture refusé`／`suppression de toute la relecture refusée`（「レビュー全体の置き換えは拒否されました」／「レビュー全体の削除は拒否されました」） | すべてのコメントを置き換える、または消去しようとした |

対処：自分で何も書き換えていないなら、そのコメントの内容を信用せず、ホストに知らせてください。ログも送ってください。

---

## 11.8 コメントを絞り込む・探す

**目的**：このページのコメント、未解決のコメントすべて、またはすべてのコメントを表示します。

**手順**：パネル上部のドロップダウンリストで「このページ」「未解決（サイト全体）」「すべて」を選びます。コメントの「↳ …」をクリックするとその要素に移動します（ページやテンプレートの切り替えも含む）。ページ上の番号付きバッジをクリックすると、そのコメントが開きます。

**想定されるログ**：`review.filter`（DEBUG）`{"filter":"open","count":…}`。`review.goto`（DEBUG）`{"page":…,"node":…,"found":true}` に続いて `store.view` と `store.select`。パネルを開いたときと閉じたときに `review.panel`（INFO）（`comments`、`openCount`、`readOnly`）。

---

## この章のコード
| コード | レベル | 意味 |
|---|---|---|
| `review.add` | INFO | コメントを追加して署名した |
| `review.add-refused` | WARN | コメントを拒否した（空など） |
| `review.apply-fail` | WARN | コメントに対する操作ができない（`what`） |
| `review.delete` | INFO | コメントを返信ごと削除した |
| `review.delete-cancel` | DEBUG | 削除をキャンセルした |
| `review.filter` | DEBUG | パネルの絞り込みを変更した |
| `review.goto` | DEBUG | コメントを付けた要素へ移動 |
| `review.no-identity` | WARN | 署名できないコメント：名前がない |
| `review.ops.rejected` | WARN | ホストがレビュー操作を拒否した（`reason`） |
| `review.panel` | INFO | コメントパネルを開いた、または閉じた |
| `review.remote` | INFO | ほかの参加者によるコメントの受信、返信、解決、削除 |
| `review.reply` | INFO | 返信を追加して署名した |
| `review.reply-refused` | WARN | 返信を拒否した（空など） |
| `review.reply.delete` | INFO | 返信を削除した |
| `review.resolve` | INFO | コメントを解決した、または再オープンした |
| `review.sig.bad` | WARN | 無効な署名（署名のあとで内容が変更された） |
| `review.sig.ok` | DEBUG | 署名を確認した |
| `collab.readonly` | INFO | レビューモードが有効になった（第 10 章） |
| `store.readonly` | WARN | レビューモードのため変更を拒否した |
