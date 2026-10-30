# 2. ページを編集する

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

中央のキャンバスには、公開されるときと同じ姿でページが表示されます。キャンバスでは要素を選択し、ウィジェットを追加し（クリックまたはドラッグ）、テキストを直接書き込み、マウス、キーボード、または**構造**パネルでページを並べ替えます。

**ログのドメイン**
- `canvas.*`：キャンバスでのページ表示（完全な読み込み、更新、デバイスごとの拡大縮小、スクロール）、ページ内で押したキー、ダブルクリック。
- `edit.*`：ページ内でのテキスト入力（開始、終了、テキストの長さ、書式、リンク、貼り付け、✨ メニュー）。
- `action.*`：追加、複製、削除、切り取り、コピー、貼り付け、移動、親の選択。拒否とその理由。
- `dnd.*`：ドラッグ＆ドロップ（開始、ターゲット、ドロップの受け付けまたは拒否、キャンセル）。
- `structure.*`：構造パネル（開く、折りたたむ、キーボード）。
- `library.*`：ウィジェットのライブラリ（検索、クリック）。
- `ctxmenu.*`：コンテキストメニュー（右クリック）。
- `widgets.*`：起動時の追加ウィジェットの読み込み。
- どこでも記録され（第0章と第1章）、ここでも役に立つもの：`store.select`、`store.multi`、`store.commit`、`store.undo`、`store.redo`、`store.view`、`store.edit-target`（履歴と選択）、`ui.key`、`ui.click`、`ui.toast`、`ui.dialog.open`（キャンバスの**外**でのキー、クリック、ウィンドウ）、`cmdk.run` と `cmdk.fail`（Ctrl+K バー）。

> **キャンバスはページの中のページです**（iframe）。キャンバスの**中**でのクリックやキー操作は `ui.click`／`ui.key` には出ません。ページ内で押したキーは `canvas.key`、要素のクリックは `store.select` になります。どれも同じログに入るので、行の順番が実際の順番です。

---

## 2.1 キャンバスにページを表示する

**目的**：選んだデバイスに合わせた正しいサイズで、最新のページを見ること。

**手順**
1. エディターを開きます。サイトの最初のページがキャンバスに表示されます。
2. ページ（上部のリスト）、言語、デバイス（🖥 ▭ ▯）を切り替えると、キャンバスも切り替わります。

**表示される内容**：描画されたページ。小さい画面では縮小されます（縮小率はキャンバスの下に表示されます。例：「62 %」）。

**期待されるログ**（起動時、実際の抜粋：[`journaux/edition-canevas-demarrage.log`](../journaux/edition-canevas-demarrage.log)）
```log
05:10:31.575 +0.01s DEBUG widgets.extra Widgets supplémentaires chargés : 15 {"widgets":23,"extra":15}
05:10:31.587 +0.02s DEBUG canvas.scale Canevas ordinateur : 1280 px, réduit à 62 % {"device":"desktop","width":1280,"scale":62,"available":792}
05:10:31.587 +0.02s INFO  canvas.load.start [canvas.load#1] Chargement complet du canevas : premier chargement {"reason":"premier chargement","page":"p_7mv9bc93","lang":"fr","device":"desktop"}
05:10:31.596 +0.03s DEBUG canvas.load.render [canvas.load#1 · 9 ms] Page rendue {"ms":8,"kb":25}
05:10:31.883 +0.31s INFO  boot.ok [boot#1 · 307 ms] Éditeur prêt {"page":"p_7mv9bc93","lang":"fr"}
05:10:31.884 +0.32s INFO  canvas.load.ok [canvas.load#1 · 297 ms] Canevas prêt {"nodes":30,"scale":62}
```
確認すること：`canvas.load.start`（理由付き）→ `canvas.load.render`（描画時間 `ms`、サイズ `kb`）→ `nodes`（表示された要素の数）付きの `canvas.load.ok`。`canvas.scale` は実際の描画幅（1280、820、390 px）と縮小率を示します。`widgets.extra` は追加ウィジェット（フォーム、動画、地図…）が読み込まれたことを示します。

**オンラインのフォントや画像が遅い場合**：キャンバスはページを読み終えた時点で準備完了になり（`"via":"dom"` 付きの `canvas.load.ok`）、Google のフォントやオンラインの画像は待ちません。それらが届くと表示が調整されます。3 秒以上かかった場合は `canvas.resources-slow`（WARN）が所要時間と原因のホスト（例：`fonts.googleapis.com`）を示し、そうでなければ `canvas.resources`（DEBUG）が出ます。これはエディターの故障ではなく、ネットワークが遅いか、それらのホストへのフィルターやブロッカーが原因です。サイクル 20 より前は、この場合 15 秒後に誤った `boot.timeout` が出ていました。

その後の変更では、キャンバスは**再読み込みされません**。内容だけが置き換わります（`canvas.render`、DEBUG）。キャンバス全体が再読み込みされる（`canvas.load.*`）のは、ページ、言語、サイトのフォント、または編集対象（コンポーネント、ヘッダー…）が変わったときだけです。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| 通常の変更（インスペクター、追加、削除…） | ページはちらつかずに更新され、スクロール位置も保たれます | `canvas.render`（DEBUG）`{"mode":"contenu","source":…}` |
| ページ内での入力、フィールドへの入力、カラーピッカーのドラッグ | 同上、連続して | `canvas.render` は **TRACE** のみ（ページ内での入力中は `"mode":"styles"`：テキストは置き換わらず、カーソルもそのまま） |
| 別のページ、別の言語 | 完全な再読み込み | `"reason":"autre page"` または `"autre langue"` 付きの `canvas.load.start` |
| サイトのフォントを変更（サイトパネル） | 再読み込み（フォントを読み込むため） | `"reason":"polices du site"`（3.8 を参照） |
| コンポーネント、ヘッダー、カードを編集。「完了」 | 編集する部分で再読み込みし、その後ページで再読み込み | `"reason":"modification du composant"`、`"modification de l’en-tête"`…、その後 `"retour à la page"` |
| 2 つの変更が立て続けに起きた（ページ、続いて言語） | 表示は 1 回だけ、最後のもの | `canvas.load.cancel`（INFO）「新しい読み込みに置き換えられました」、続いて新しい `canvas.load.start`（[`journaux/edition-canevas-recharge.log`](../journaux/edition-canevas-recharge.log)） |
| デバイスを変更（🖥 ▭ ▯） | 幅 1280、820、390 px。場所が足りなければ縮小 | `store.view` `{"device":"mobile"}`、続いて `canvas.scale`（DEBUG）`{"device":"mobile","width":390,"scale":100}`。ウィンドウのサイズ変更：`canvas.scale` は TRACE |
| 選択した要素が見えない位置にある（追加、矢印キー、構造） | キャンバスがその要素までスクロールします | `canvas.scroll`（DEBUG）`{"from":…,"to":…}`。非表示の要素（このデバイスまたはこの言語で）：`canvas.scroll-missing`（DEBUG） |
| あなたが入力している最中に、ほかの参加者がページを変更した | 相手の変更は、あなたの入力が終わるまで待ちます | `canvas.remote-deferred`（DEBUG）、テキストを離れると `canvas.remote-applied`（DEBUG） |
| エディターがキャンバス内に描いたボタン（コメントのバッジ…） | | `canvas.ui-action`（DEBUG）`{"action":…}` |

**期待されるログ** — 立て続けの 2 つの変更（[`journaux/edition-canevas-recharge.log`](../journaux/edition-canevas-recharge.log)）
```log
05:10:53.630 +22.06s DEBUG store.view Vue : pageId=p_f0ooet9j {"pageId":"p_f0ooet9j"}
05:10:53.633 +22.06s INFO  canvas.load.start [canvas.load#2] Chargement complet du canevas : autre page {"reason":"autre page","page":"p_f0ooet9j","lang":"fr","device":"desktop"}
05:10:53.634 +22.07s DEBUG canvas.load.render [canvas.load#2 · 1 ms] Page rendue {"ms":1,"kb":20}
05:10:53.637 +22.07s DEBUG store.view Vue : lang=nl {"lang":"nl"}
05:10:53.640 +22.07s INFO  canvas.load.cancel [canvas.load#2 · 7 ms] Chargement remplacé par un nouveau {"reason":"autre langue"}
05:10:53.640 +22.07s INFO  canvas.load.start [canvas.load#3] Chargement complet du canevas : autre langue {"reason":"autre langue","page":"p_f0ooet9j","lang":"nl","device":"desktop"}
05:10:53.641 +22.07s DEBUG canvas.load.render [canvas.load#3 · 1 ms] Page rendue {"ms":0,"kb":20}
05:10:53.905 +22.34s INFO  canvas.load.ok [canvas.load#3 · 265 ms] Canevas prêt {"nodes":5,"scale":62}
05:10:53.919 +22.35s DEBUG store.view Vue : lang=fr {"lang":"fr"}
…
```

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| ページの描画に失敗した（プロジェクトの不整合、バグ） | キャンバスには前の表示が残ります。エラーメッセージが出ることが多いです | `error` 付きの `canvas.render-fail`（ERROR）、完全な読み込みだった場合は続いて `canvas.load.fail`（ERROR） | Ctrl+Z で前の状態に戻してください。ログを送ってください |
| キャンバスが空のまま読み込まれる（拡張機能やブラウザーのポリシーで iframe がブロックされた） | 真っ白なキャンバス | `canvas.load.fail`（ERROR）「内容のないままキャンバスが読み込まれました」 | iframe をブロックする拡張機能を無効にし、ページを再読み込みしてください |
| オーバーレイ（ほかの参加者のプレゼンス、コメントのバッジ）がクラッシュした | オーバーレイが出なくなりますが、ほかは動きます | `error` 付きの `canvas.overlay-fail`（WARN は 1 回だけ、その後は TRACE） | ログを送ってください |
| ブラウザーが古すぎる（キャンバスに `ResizeObserver` がない） | 選択枠はスクロールしたときにしか位置が直りません | `canvas.no-resize-observer`（WARN） | ブラウザーを更新してください |
| サーバー上の `core/widgets-extra.js` が古い、またはない | ライブラリに一部のウィジェットがありません | 一覧付きの `widgets.missing`（WARN） | キャッシュなしで再読み込みしてください（Ctrl+Shift+R）。エディターのファイルがすべて最新か確認してください |

---

## 2.2 要素を選択する

**目的**：調整したり移動したりする要素を選ぶこと。

**手順**
1. ページの要素をクリックします（または構造パネルでその行をクリック）。
2. 矢印キーでページ内を移動できます：↑／↓ 前／次の要素、← 親、→ 最初の子。
3. Esc で親に上がります（ウィジェット → 列 → 行 → セクション）。

**表示される内容**：要素の周りのオレンジの枠（セクションは青、行は緑、列は紫）、要素のツールバー ↰ ✥ ⧉ ✕、そしてインスペクターにその設定が表示されます。

**期待されるログ**（クリック、↓ キー、Esc：[`journaux/edition-selectionner.log`](../journaux/edition-selectionner.log)）
```log
05:10:32.512 +0.94s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:32.706 +1.14s DEBUG store.select Sélection : text {"id":"n_4y660b0u1y","type":"text"}
05:10:32.867 +1.30s DEBUG canvas.key Raccourci dans la page : Escape {"key":"Escape","in":"page","selected":"n_4y660b0u1y"}
05:10:32.868 +1.30s DEBUG action.parent Parent sélectionné : column {"from":"text","to":"column","id":"n_2e4h0v2s04"}
05:10:32.868 +1.30s DEBUG store.select Sélection : column {"id":"n_2e4h0v2s04","type":"column"}
```
確認すること：選択するたびに種類付きの `store.select` が出ます。Esc では `canvas.key`、続いて `action.parent`（`from` → `to`）が出ます。矢印キーは通常モードでは `canvas.key` の行を出さず（TRACE）、その後の `store.select` だけが出ます。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| セクションで Esc | 何も起きません（セクションには選択できる親がありません） | `action.parent-none`（DEBUG）（[`journaux/edition-selectionner-section.log`](../journaux/edition-selectionner-section.log)） |
| 要素のツールバーの ↰ ボタン | 親が選択されます | `canvas.toolbar`（DEBUG）`{"act":"parent"}`、続いて `action.parent` |
| 構造パネルの行をクリック | 同上。キャンバスがその要素までスクロールします | `ui.click`、続いて `store.select`、場合により `canvas.scroll` |
| キャンバスの何もないところをクリック | 何も選択されなくなり、インスペクターにヘルプが表示されます | `store.select`「選択を解除しました」 |
| 選択なしでショートカット（Esc、Ctrl+D…） | 何も起きません | `action.none`（DEBUG）`{"action":…}` |
| Shift＋クリック | 複数選択（2.10） | `store.multi` |

**エラー**：想定されるものはありません。要素が見えているのにクリックしても選択されない場合は、ログをコピーしてください。`"asked"`（要素が見つからない）付きの `store.select` が出ているはずです。

---

## 2.3 ウィジェットを追加する（クリック）

**目的**：見出し、テキスト、ボタン、画像などをページに追加すること。

**手順**
1. 追加したい位置の直前の要素を選択します（選択がなければ、ウィジェットはページの末尾に入ります）。
2. 左パネル「ウィジェット」：ウィジェットをクリックします。「ウィジェットを検索…」フィールドで一覧を絞り込めます。

**表示される内容**：ウィジェットが選択中の要素のすぐ後に選択された状態で現れ、キャンバスがそこまでスクロールします。

**期待されるログ**（[`journaux/edition-ajouter-clic.log`](../journaux/edition-ajouter-clic.log)）
```log
05:10:33.504 +1.94s DEBUG library.insert Bibliothèque : clic sur « Bouton » {"type":"button","how":"clic"}
05:10:33.506 +1.94s DEBUG store.commit Modification {"source":"library","past":1,"page":"p_7mv9bc93"}
05:10:33.509 +1.94s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"library","mode":"contenu","ms":2}
…
05:10:33.515 +1.95s DEBUG store.select Sélection : button {"id":"n_5x206n134e","type":"button"}
05:10:33.517 +1.95s INFO  action.add Widget ajouté : Bouton {"type":"button","id":"n_5x206n134e","parentType":"column"}
…
```
確認すること：`library.insert`（クリック）→ `store.commit`（`"source":"library"`）→ `store.select` → 種類と `parentType`（置かれた場所）付きの `action.add`。`version.*` の行（その日最初の変更：安全バージョン、第4章）が間に入ることがあります。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| 構造（「2 列」…） | 選択中のセクションの後に、列を持つセクション | `library.insert` `{"type":"section","spans":"6-6"}`、続いて `action.add-section`（INFO）`{"spans":[6,6]}` |
| 「vid」で検索 | 一覧が絞り込まれます | `library.search`（DEBUG、フィールドを離れたとき）`{"q":"vid","shown":1}`。1 文字ごと：TRACE |
| 検索結果なし | 空の一覧 | `library.search-empty`（DEBUG）、1 回（[`journaux/edition-bibliotheque-recherche.log`](../journaux/edition-bibliotheque-recherche.log)） |
| Ctrl+K バーから（「追加：…」） | 同上 | `cmdk.run` `{"id":"add:…"}`、続いて `action.add`（2.13） |
| ウィジェットをページへドラッグ | 離した場所に | `dnd.*`（2.4） |

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| その要素はそこに置けない（構造のルール） | ルールを説明する赤いメッセージ | `action.refused`（WARN）`{"action":"ajouter","error":…}`、続いて `ui.toast`（ERROR） | 列またはセクションを選択してから、やり直してください |
| レビューモード | 「レビューモード…」 | `store.readonly`（WARN）。`action.add` の行は出ません | レビューモードを終了してください（第11章） |

---

## 2.4 ドラッグ＆ドロップ：追加、移動

**目的**：ウィジェット、構造、テンプレート、コンポーネントを狙った位置に正確に置くこと。既存の要素を移動すること。

**手順**
1. 追加：ライブラリのウィジェット（またはテンプレート、コンポーネント）をページにドラッグします。
2. 移動：要素を選択してからドラッグします（またはハンドル ✥ をドラッグ）。構造パネルでその行をドラッグしてもかまいません。
3. 青い線がドロップ先を示します。そこで離します。Esc でキャンセルします。

**表示される内容**：サムネイルがマウスについてきます。青い線（空のコンテナーなら点線の枠）が置き場所を示します。ドロップすると、その要素が選択されます。

**期待されるログ** — ドラッグで追加（[`journaux/edition-ajouter-glisser.log`](../journaux/edition-ajouter-glisser.log)）
```log
05:10:34.331 +2.76s INFO  dnd.start [dnd#1] Glisser : Bouton {"kind":"widget","type":"button","from":"bibliothèque"}
05:10:34.740 +3.17s DEBUG store.commit Modification {"source":"dnd","past":2,"page":"p_7mv9bc93"}
05:10:34.746 +3.18s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"dnd","mode":"contenu","ms":3}
05:10:34.755 +3.19s DEBUG store.select Sélection : button {"id":"n_0k0h4v4k17","type":"button"}
05:10:34.756 +3.19s INFO  dnd.ok [dnd#1 · 425 ms] Ajouté dans Colonne, position 1 {"id":"n_0k0h4v4k17","type":"button","kind":"new","parentId":"n_3j1z401m2e","parentType":"column","index":0,"where":"canevas"}
```
**期待されるログ** — ハンドル ✥ で移動（[`journaux/edition-deplacer.log`](../journaux/edition-deplacer.log)）
```log
05:10:35.597 +4.03s INFO  dnd.start [dnd#2] Glisser : Bouton {"kind":"move","type":"button","id":"n_5x206n134e","from":"page ou structure"}
05:10:35.988 +4.42s DEBUG store.commit Modification {"source":"dnd","past":3,"page":"p_7mv9bc93"}
05:10:35.993 +4.42s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"dnd","mode":"contenu","ms":3}
05:10:36.003 +4.43s INFO  dnd.ok [dnd#2 · 406 ms] Déplacé dans Colonne, position 1 {"id":"n_5x206n134e","type":"button","kind":"move","parentId":"n_2e4h0v2s04","parentType":"column","index":0,"where":"canevas"}
```
確認すること：`dnd` の一連の流れ：`dnd.start`（`kind`：widget、section、template、component、move のどれか。`from`）→ `parentType`、`index`（0 から数える）、`where`（キャンバスまたは構造）付きの `dnd.ok`。ドラッグ中は、新しいドロップ先を狙うたびに `dnd.target`（TRACE）が、端の近くでの自動スクロールでは `dnd.autoscroll`（TRACE）が出ます。見るにはログを `trace` にしてください。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| 構造パネルで並べ替える | ツリーにドロップ位置の線 | `"where":"structure"` 付きの `dnd.ok`（[`journaux/edition-structure-reordonner.log`](../journaux/edition-structure-reordonner.log)） |
| テンプレートやコンポーネントをドラッグ | | `dnd.start` `{"kind":"template"}`／`{"kind":"component"}`（第3章） |
| 同じ場所で離した | 何も変わりません | `dnd.cancel`（INFO）`{"reason":"noop"}` |
| キャンバスと構造の外で離した | 何も変わりません | `dnd.cancel` `{"reason":"outside"}`（[`journaux/edition-glisser-dehors.log`](../journaux/edition-glisser-dehors.log)） |
| ドラッグ中に Esc | サムネイルと線が消えます | `dnd.cancel` `{"by":"Échap"}`（[`journaux/edition-glisser-echap.log`](../journaux/edition-glisser-echap.log)） |
| ブラウザーが操作を中断した（ウィンドウから出た、タッチ操作） | 同上 | `dnd.cancel` `{"by":"interrompu par le navigateur"}` |
| ただのクリック（動きが 5 px 未満） | クリックとして扱われます：選択または追加 | `dnd.*` は出ません |

**エラーと拒否**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| 置けない場所（ウィジェットの上にセクション、要素を自分自身の中に） | 青い線が出ません。離しても何も変わりません | `dnd.refused`（WARN）`{"reason":"forbidden"}`、続いて `dnd.cancel`（[`journaux/edition-glisser-refuse.log`](../journaux/edition-glisser-refuse.log)） | セクションはページに、行はセクションに、ウィジェットは列に入ります |
| 最後の瞬間にコアがドロップを拒否した | 何も変わりません | `dnd.refused` `{"reason":"invalid"}`、続いて `dnd.cancel` | 少しずらしてやり直してください。繰り返す場合はログを送ってください |
| ドロップ中のエラー | 赤いメッセージ | `error` 付きの `dnd.fail`（ERROR） | Ctrl+Z を押してから、ログを送ってください |
| ドラッグした要素がもう存在しない（その間にコンポーネントが削除された） | 何も起きません | `dnd.unknown`（WARN） | テンプレートパネルを開き直してください |
| レビューモード | 「レビューモード…」 | `store.readonly`（WARN）、続いて `dnd.cancel` `{"reason":"readonly"}` | — |

**期待されるログ** — ドロップの拒否（[`journaux/edition-glisser-refuse.log`](../journaux/edition-glisser-refuse.log)）
```log
05:10:38.014 +6.45s INFO  dnd.start [dnd#5] Glisser : Section {"kind":"move","type":"section","id":"n_43295m1m6y","from":"page ou structure"}
05:10:38.426 +6.86s WARN  dnd.refused [dnd#5 · 412 ms] Dépôt refusé : « section » ne peut pas aller à cet endroit (une section va dans la page, un widget dans une colonne, et rien dans son propre contenu) {"type":"section","reason":"forbidden"}
05:10:38.426 +6.86s INFO  dnd.cancel [dnd#5 · 412 ms] Rien n’a changé {"reason":"forbidden"}
```

---

## 2.5 ページ内でテキストを書く

**目的**：見出し、段落、ボタンのテキストをページ上で直接変更すること。

**手順**
1. テキストをダブルクリックします（または要素を選択して Enter を押すか、右クリック →「テキストを編集」）。
2. 書きます。見出しやボタンは **Enter** で終わります。段落は **Esc** か、ほかの場所のクリックで終わります。

**表示される内容**：テキストの周りに青い輪郭があり、その中にカーソルがあります。リッチテキストの場合は、上に **B I U 🔗 ⌫ ✨** のバーが出ます。入力全体が**1 つ**の取り消し段階として数えられます。

**期待されるログ**（[`journaux/edition-texte-titre.log`](../journaux/edition-texte-titre.log)）
```log
05:10:40.328 +8.76s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:40.340 +8.77s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"text","id":"n_2l6m0w3e5i"}
05:10:40.341 +8.77s INFO  edit.start [edit#1] Édition dans la page : heading · text {"id":"n_2l6m0w3e5i","type":"heading","key":"text","field":"inline","lang":"fr","chars":56}
05:10:40.511 +8.94s DEBUG canvas.key Raccourci dans la page : Ctrl+A {"key":"Ctrl+A","in":"texte","selected":"n_2l6m0w3e5i"}
05:10:40.519 +8.95s DEBUG store.commit Modification {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","past":5,"page":"p_7mv9bc93"}
05:10:40.548 +8.98s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.576 +9.01s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.592 +9.02s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.621 +9.05s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.641 +9.07s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.660 +9.09s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.680 +9.11s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.702 +9.13s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.725 +9.16s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.754 +9.19s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.775 +9.21s INFO  edit.ok [edit#1 · 434 ms] Édition terminée : texte enregistré (une seule étape d’annulation) {"id":"n_2l6m0w3e5i","key":"text","changed":true,"chars":11,"before":56,"inputs":11}
05:10:40.779 +9.21s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"edit-done","mode":"contenu","ms":3}
```
確認すること：`edit.dblclick` → `edit.start`（一連の流れ `edit#n`：種類、フィールド `key`、フィールドの種類 `field`、言語、長さ `chars`）→「同じ取り消し段階」の `store.commit`（1 文字ごとに 1 行）→ `changed`、`chars`（最終的な長さ）、`before`（開始時の長さ）、`inputs`（変更の回数）付きの `edit.ok`。**テキストそのものは決してログに書かれず**、長さだけが記録されます。1 文字ごとに `edit.input`（TRACE）も出ます。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| 選択した要素で Enter、またはメニューの「テキストを編集」 | その要素の最初のテキストで編集が始まります | `canvas.key` Enter、続いて `edit.keyboard`（DEBUG）、`edit.start` |
| 何も変えなかった | | `edit.ok`「変更なしで編集を終了しました」`{"changed":false}` |
| テキストのない要素（画像、区切り線、セクション…）で Enter | 何も起きません | `edit.no-text`（DEBUG） |
| インスペクターでしか設定できないテキストをダブルクリック | ページでは何も起きません | `edit.not-editable`（DEBUG）`{"field":…}` |
| 入力中に Ctrl+Z | 入力が終わり、その入力全体が取り消されます | `edit.ok`、`canvas.key` Ctrl+Z、`store.undo`（[`journaux/edition-texte-annuler.log`](../journaux/edition-texte-annuler.log)） |
| 入力中にキャンバスが再読み込みされた（別のページ、別の言語） | 入力は止まりますが、打った内容は残ります | `edit.cancel`（INFO）`{"changed":…}` |
| 別の言語で入力（上部の言語リスト） | その言語だけが変わります | `edit.start` `{"lang":"nl"}` |
| コンポーネントやヘッダーの中で入力 | 使われているすべての場所に反映されます | `edit.start` `{"edit":"component"}` |

**エラーと拒否**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| レビューモード | 「レビューモード：コメント（💬）はできますが、編集はできません。」 | `edit.readonly`（WARN） | — |
| コレクションのフィールドに結び付いたテキスト（カードの中） | 「このテキストは各項目のフィールド「…」から取得されています…」 | `edit.bound`（WARN）`{"field":…,"collection":…}` | コンテンツで編集するか、インスペクターで結び付きを解除してください（第4章） |
| 入力中に要素が削除された（ほかの参加者によって） | テキストも要素と一緒に消えます | `error` 付きの `edit.node-gone`（WARN） | 自分で消したのなら Ctrl+Z。そうでなければ相手と相談してください |

**期待されるログ** — 拒否と Enter（[`journaux/edition-texte-refus.log`](../journaux/edition-texte-refus.log)）
```log
05:10:43.044 +11.47s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:43.058 +11.49s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"text","id":"n_2l6m0w3e5i"}
05:10:43.058 +11.49s WARN  edit.readonly Édition refusée : mode relecture {"id":"n_2l6m0w3e5i","key":"text"}
05:10:43.059 +11.49s INFO  ui.toast Message affiché : Mode relecture : vous pouvez commenter (💬), pas modifier.
05:10:43.237 +11.67s DEBUG store.select Sélection : image {"id":"n_525b6p2v6j","type":"image"}
05:10:43.246 +11.68s DEBUG canvas.key Raccourci dans la page : Enter {"key":"Enter","in":"page","selected":"n_525b6p2v6j"}
05:10:43.247 +11.68s DEBUG edit.no-text Rien à écrire dans l’élément sélectionné (pas de texte modifiable) {"id":"n_525b6p2v6j"}
…
05:10:43.388 +11.82s DEBUG store.select Sélection : button {"id":"n_5x206n134e","type":"button"}
05:10:43.396 +11.83s DEBUG canvas.key Raccourci dans la page : Enter {"key":"Enter","in":"page","selected":"n_5x206n134e"}
05:10:43.396 +11.83s DEBUG edit.keyboard Édition demandée au clavier ou par le menu {"id":"n_5x206n134e"}
05:10:43.396 +11.83s INFO  edit.start [edit#4] Édition dans la page : button · label {"id":"n_5x206n134e","type":"button","key":"label","field":"text","lang":"fr","chars":14}
05:10:43.553 +11.98s INFO  edit.ok [edit#4 · 157 ms] Édition terminée sans changement {"id":"n_5x206n134e","key":"label","changed":false,"chars":14,"before":14,"inputs":0}
…
```

---

## 2.6 書式を付ける、リンクを追加する、貼り付ける

**目的**：語句を太字、斜体、下線、リンクにすること。ほかの場所でコピーしたテキストを貼り付けること。

**手順**
1. リッチテキストを入力しているときに、語句を選択します。
2. **B**、**I**、**U**（または Ctrl+B、Ctrl+I、Ctrl+U）をクリックします。書式を外すには **⌫**。
3. リンク：**🔗** を押し、アドレスを入力して Enter（Esc で中止）。既存のリンクの上で 🔗 を押すとリンクが外れます。
4. 貼り付け（Ctrl+V）：サイトをきれいに保つため、テキストは**常に書式なしで貼り付けられます**。

**表示される内容**：書式はすぐに反映され、有効なボタンが強調表示されます。バーをクリックしても要素の選択は変わりません。

**期待されるログ**（[`journaux/edition-texte-riche.log`](../journaux/edition-texte-riche.log)）
```log
05:10:41.109 +9.54s DEBUG store.select Sélection : text {"id":"n_4y660b0u1y","type":"text"}
05:10:41.127 +9.56s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"content","id":"n_4y660b0u1y"}
05:10:41.127 +9.56s INFO  edit.start [edit#2] Édition dans la page : text · content {"id":"n_4y660b0u1y","type":"text","key":"content","field":"richtext","lang":"fr","chars":161}
05:10:41.361 +9.79s DEBUG edit.format Mise en forme : bold (appliquée) {"cmd":"bold","action":"add","chars":6,"where":"page"}
…
05:10:41.499 +9.93s DEBUG edit.format Mise en forme : italic (appliquée) {"cmd":"italic","action":"add","chars":6,"where":"page"}
…
05:10:41.517 +9.95s DEBUG canvas.key Raccourci dans la page : Ctrl+I {"key":"Ctrl+I","in":"texte","selected":"n_4y660b0u1y"}
05:10:41.658 +10.09s DEBUG edit.link-open Champ d’adresse du lien ouvert {"chars":6}
05:10:41.724 +10.15s WARN  edit.link-invalid Lien refusé : adresse non autorisée (javascript:alert(1)). Utilise https://, mailto:, tel: ou #ancre {"url":"javascript:alert(1)","where":"page"}
05:10:41.873 +10.30s DEBUG edit.link-open Champ d’adresse du lien ouvert {"chars":6}
05:10:41.895 +10.33s DEBUG edit.format Mise en forme : link (appliquée) {"cmd":"link","action":"add","chars":6,"where":"page","url":"https://exemple.be"}
…
05:10:41.907 +10.34s DEBUG canvas.key Raccourci dans la page : Enter {"key":"Enter","in":"champ","selected":"n_4y660b0u1y"}
05:10:42.029 +10.46s DEBUG edit.paste Collage en texte brut : 26 caractère(s), mise en forme et balises retirées {"chars":26,"lines":2,"rich":true,"inline":false,"where":"page"}
…
05:10:42.147 +10.58s INFO  edit.ok [edit#2 · 1020 ms] Édition terminée : texte enregistré (une seule étape d’annulation) {"id":"n_4y660b0u1y","key":"content","changed":true,"chars":188,"before":161,"inputs":4}
05:10:42.150 +10.58s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"edit-done","mode":"contenu","ms":3}
```
確認すること：`edit.format` にはコマンド（`bold`、`italic`、`underline`、`link`、`clear`）、`action`（`add` または `remove`）、選択範囲の長さ、`where`（ページまたはインスペクター）が入ります。受け付けられたリンクにはアドレス（最大 60 文字）が付きます。`edit.paste` には貼り付けた長さと行数が入り、クリップボードに書式が含まれていた（そして取り除かれた）場合は `"rich":true` になります。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| Ctrl+B／Ctrl+I／Ctrl+U | ボタンと同じ | `edit.format`、続いて `canvas.key`（書式の行がキーの行より先に出ます） |
| テキストを選択せずにボタン、またはカーソルがテキストの外 | 何も起きません | `edit.format-none`（DEBUG）`{"reason":"empty"}` または `"no-selection"` |
| 選択なしで 🔗 | 何も起きません | `edit.link-none`（DEBUG） |
| アドレスのフィールドで Esc | フィールドが閉じ、テキストは選択されたまま | `edit.link-cancel`（DEBUG） |
| インスペクターの「リッチテキスト」フィールドにある同じバー | 同上 | `"where":"inspecteur"` 付きの `edit.format` |
| ファイル（コピーした画像）を貼り付け | 何も貼り付けられません | `edit.paste-file`（WARN）：画像ウィジェットを使ってください |
| 入力中のテキストに、ドラッグしたテキストや画像をドロップ | 拒否されます | `edit.drop-blocked`（DEBUG） |

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| 許可されていないリンクのアドレス（`javascript:`、空のアドレス…） | リンクは作られません | `edit.link-invalid`（WARN）`{"url":…}` | `https://…`、`mailto:…`、`tel:…`、`#ancre`、またはサイト内のページを使ってください |

---

## 2.7 テキスト内の ✨ メニュー（オンデバイスAI）

**目的**：ページを離れずに、選択した部分をデバイスの AI に書き換えさせたり校正させたりすること。

**手順**
1. リッチテキストを入力しているときに、部分を選択します（選択しなければカーソルのある段落が対象になります）。
2. ✨ →「短く」「やさしく」…または「校正」を選びます。
3. 提案を読み、**置き換え** または **キャンセル** を押します。

**表示される内容**：バーの下に提案が表示されます。「置き換え」の後、テキストは「要確認」になります。

**期待されるログ**（第7章の実際の抜粋：[`journaux/ia-reformuler-repli.log`](../journaux/ia-reformuler-repli.log)）
```log
04:57:33.954 +1.15s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"content","id":"n_3m1c330z5t"}
04:57:33.955 +1.15s INFO  edit.start [edit#1] Édition dans la page : text · content {"id":"n_3m1c330z5t","type":"text","key":"content","field":"richtext","lang":"fr","chars":161}
…
04:57:34.225 +1.42s DEBUG edit.ai-menu [edit#1 · 270 ms] Menu ✨ ouvert {"open":true,"modes":["shorter","simpler","formal","friendly","longer"]}
04:57:34.274 +1.47s DEBUG edit.ai-ask [edit#1 · 319 ms] Demande à l’IA locale : shorter {"mode":"shorter","chars":161,"selection":true}
…
04:57:34.278 +1.48s INFO  ai.rewrite.start [ai.rewrite#1] IA locale : reformuler {"task":"rewrite","inLen":161,"excerpt":"Le MAB réunit les médias alternatifs belges. Nous partageon…","mode":"shorter","lang":"fr","gen":"fr","api":"prompt","source":"test"}
…
04:57:34.280 +1.48s INFO  ai.rewrite.ok [ai.rewrite#1 · 2 ms] Reformuler : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
04:57:34.281 +1.48s DEBUG edit.ai-proposal [edit#1 · 326 ms] Proposition de l’IA affichée (Remplacer ou Annuler) {"chars":44}
…
04:57:34.330 +1.53s DEBUG ai.mark Texte de l’IA appliqué et marqué « à relire » {"nodeId":"n_3m1c330z5t","field":"content","lang":"fr"}
…
04:57:34.337 +1.53s INFO  edit.ai-apply [edit#1 · 382 ms] Proposition de l’IA appliquée (texte marqué « à relire ») {"id":"n_3m1c330z5t","key":"content","chars":44}
…
```
確認すること：一連の流れ `edit#n` の中で、`edit.ai-menu`（メニューを開いた、提案されたモード）→ `edit.ai-ask`（モード、対象の長さ）→ 呼び出しの `ai.*` の行（第7章）→ `edit.ai-proposal` → `edit.ai-apply`（INFO）。AI の呼び出しそのものは `ai.*` で記録されます。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| ✨ をもう一度押す | メニューが閉じます | `edit.ai-menu` `{"open":false}` |
| 「キャンセル」（誤りがなかった校正の後は「閉じる」） | 提案が消えます | `edit.ai-cancel`（INFO）`{"pending":true}` |
| 「校正」で誤りが見つからなかった | 「✓ 誤りは見つかりませんでした。」 | `edit.ai-proposal` `{"corrections":0}` |
| 応答が来る前に入力が終わった | 提案は無視されます | `edit.ai-stale`（DEBUG） |
| すでに使った提案で「置き換え」 | 何も起きません | `edit.ai-apply-none`（DEBUG） |

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| オンデバイスAIがない、または失敗した | AI のメッセージ（第7章を参照） | `ai.*`（WARN または ERROR）、続いて `edit.ai-none`（WARN） | 状態を見るには、上部バーの ✨ オンデバイスAI を開いてください |
| 何も選択されておらず、カーソルが段落の外 | 「テキストを選択してください…」 | `edit.ai-empty`（WARN） | 部分を選択してください |
| AI のモジュールが読み込まれていない（ファイルがない） | 「オンデバイスAIが読み込まれていません。」 | `edit.ai-unavailable`（WARN） | キャッシュなしでエディターを再読み込みしてください |

---

## 2.8 コピー、切り取り、貼り付け、複製、削除、移動

**目的**：キーボードや要素のツールバーでページを並べ替えること。

**手順**
1. 要素を選択します。
2. Ctrl+C でコピー、Ctrl+X で切り取り、Ctrl+V で選択中の要素の後に貼り付け（それを受け入れるコンテナーなら中に）、Ctrl+D（または ⧉）で複製、Delete（または ✕）で削除、Alt+↑／Alt+↓ で移動します。

**表示される内容**：結果がすぐに反映されます。コピーと切り取りでは短いメッセージが出ます。クリップボードは Atelier 専用のものです（パソコンのクリップボードは使いません）。

**期待されるログ**（[`journaux/edition-copier-coller.log`](../journaux/edition-copier-coller.log)）
```log
05:10:43.879 +12.31s DEBUG canvas.key Raccourci dans la page : Ctrl+C {"key":"Ctrl+C","in":"page","selected":"n_5x206n134e"}
05:10:43.880 +12.31s INFO  action.copy Copié : Bouton {"id":"n_5x206n134e","type":"button","nodes":1}
05:10:43.880 +12.31s INFO  ui.toast Message affiché : « Bouton » copié. Sélectionnez un emplacement puis Ctrl+V.
05:10:43.889 +12.32s DEBUG canvas.key Raccourci dans la page : Ctrl+V {"key":"Ctrl+V","in":"page","selected":"n_5x206n134e"}
…
05:10:43.905 +12.34s DEBUG store.select Sélection : button {"id":"n_2s1e5v6x46","type":"button"}
05:10:43.916 +12.35s INFO  action.paste Collé : button {"id":"n_2s1e5v6x46","type":"button","parentType":"column","after":"n_5x206n134e"}
05:10:44.083 +12.51s DEBUG canvas.key Raccourci dans la page : Ctrl+D {"key":"Ctrl+D","in":"page","selected":"n_2s1e5v6x46"}
…
05:10:44.092 +12.52s DEBUG store.select Sélection : button {"id":"n_085o4f0b3d","type":"button"}
05:10:44.098 +12.53s INFO  action.duplicate Dupliqué : button {"id":"n_2s1e5v6x46","newId":"n_085o4f0b3d","type":"button"}
05:10:44.256 +12.69s DEBUG canvas.key Raccourci dans la page : Delete {"key":"Delete","in":"page","selected":"n_085o4f0b3d"}
…
05:10:44.264 +12.70s DEBUG store.select Sélection : heading {"id":"n_406k6i0v4u","type":"heading"}
05:10:44.269 +12.70s INFO  action.delete Supprimé : button {"id":"n_085o4f0b3d","type":"button","next":"n_406k6i0v4u"}
05:10:44.424 +12.86s DEBUG canvas.key Raccourci dans la page : Ctrl+X {"key":"Ctrl+X","in":"page","selected":"n_406k6i0v4u"}
05:10:44.424 +12.86s INFO  action.cut Coupé : Titre (dans le presse-papiers d’Atelier) {"id":"n_406k6i0v4u","type":"heading"}
…
05:10:44.433 +12.86s DEBUG store.select Sélection : text {"id":"n_4y660b0u1y","type":"text"}
05:10:44.439 +12.87s INFO  action.delete Supprimé : heading {"id":"n_406k6i0v4u","type":"heading","next":"n_4y660b0u1y"}
05:10:44.440 +12.87s INFO  ui.toast Message affiché : « Titre » coupé. Sélectionnez la destination puis Ctrl+V.
05:10:44.605 +13.04s DEBUG canvas.key Raccourci dans la page : Ctrl+V {"key":"Ctrl+V","in":"page","selected":"n_4y660b0u1y"}
…
05:10:44.616 +13.05s DEBUG store.select Sélection : heading {"id":"n_3l0j1o2032","type":"heading"}
05:10:44.626 +13.06s INFO  action.paste Collé : heading {"id":"n_3l0j1o2032","type":"heading","parentType":"column","after":"n_4y660b0u1y"}
05:10:44.796 +13.23s DEBUG canvas.key Raccourci dans la page : Alt+ArrowUp {"key":"Alt+ArrowUp","in":"page","selected":"n_3l0j1o2032"}
…
05:10:44.821 +13.25s INFO  action.move Monté : heading {"id":"n_3l0j1o2032","type":"heading","delta":-1,"index":3}
```
確認すること：キーを押すたびに `canvas.key`（フォーカスがキャンバスの外なら `ui.key`）が出て、続いて ID と種類付きの `action.*` の行（INFO）が出ます。切り取り ＝ `action.cut`、続いて `action.delete`。`action.delete` には次に選択された要素（`next`）が示されます。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| 要素のツールバーの ⧉ ✕ ボタン | 同上 | `canvas.toolbar` `{"act":"duplicate"}`／`{"act":"delete"}`、続いて `action.duplicate`／`action.delete` |
| コンテキストメニュー（2.12） | 同上 | `ctxmenu.action`、続いて `action.*` |
| 最初の要素で Alt+↑（または最後の要素で Alt+↓） | 何も起きません | `action.move-edge`（DEBUG） |
| クリップボードが空のときに貼り付け（コンテキストメニュー） | 何も起きません | `action.paste-empty`（DEBUG） |
| 複数の要素を選択している | 複製と削除はすべてに効きます | `action.duplicate`／`action.delete` `{"count":3}`（2.10） |

**エラーと拒否**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| 列や行を、置けない場所に貼り付けた | 「この要素はここに貼り付けできません。列またはセクションを選択してください。」 | `action.refused`（WARN）`{"action":"coller"}` ＋ `ui.toast`（ERROR）（[`journaux/edition-coller-refuse.log`](../journaux/edition-coller-refuse.log)） | 行を選択してください（列の場合）、またはセクションを選択してください（行の場合） |
| 複数の要素を一度に切り取った | 「切り取りは一度に 1 つの要素にしか使えません。」 | `action.refused` `{"action":"couper","multi":3}` | 1 つずつ切り取るか、まとめて複製／削除してください |
| コアのそのほかのルール | そのルールのメッセージ | `error.message` 付きの `action.refused` | メッセージを読んでください。わからなければログを送ってください |

**期待されるログ** — 貼り付けの拒否
```log
05:10:45.135 +13.57s DEBUG canvas.key Raccourci dans la page : Ctrl+V {"key":"Ctrl+V","in":"page","selected":"n_2l6m0w3e5i"}
05:10:45.135 +13.57s WARN  action.refused Action « coller » refusée : Impossible de coller cet élément ici : sélectionnez une colonne ou une section. {"action":"coller","selected":"n_2l6m0w3e5i","type":"heading","error":{"name":"Error","message":"Impossible de coller cet élément ici : sélectionnez une colonne ou une section.","stack":"Error: Impossible de coller cet élément ici : sélectionnez une colonne ou une section.\nat http://localhost:8791/editor/actions.js:126:19\nat safe (http://localhost:8791/editor/actions.js:11:16)\nat pasteClipboard (http://localhost:8791/editor/actions.js:112:3)\nat handleKey (http://localhost:8791/editor/app.js:132:70)"}}
05:10:45.136 +13.57s ERROR ui.toast Message affiché : Impossible de coller cet élément ici : sélectionnez une colonne ou une section. {"type":"error"}
```

---

## 2.9 元に戻す、やり直す

**目的**：前の状態に戻し、その後やり直すこと。

**手順**：Ctrl+Z（または ↶）で元に戻します。Ctrl+Y または Ctrl+Shift+Z（または ↷）でやり直します。最大 150 段階までです。

**表示される内容**：ページが前の状態に戻り、そのときの選択も戻ります。

**期待されるログ**（[`journaux/edition-annuler-retablir.log`](../journaux/edition-annuler-retablir.log)）
```log
05:10:45.334 +13.77s DEBUG canvas.key Raccourci dans la page : Ctrl+D {"key":"Ctrl+D","in":"page","selected":"n_2l6m0w3e5i"}
…
05:10:45.351 +13.78s INFO  action.duplicate Dupliqué : heading {"id":"n_2l6m0w3e5i","newId":"n_67326a584k","type":"heading"}
05:10:45.510 +13.94s DEBUG canvas.key Raccourci dans la page : Ctrl+Z {"key":"Ctrl+Z","in":"page","selected":"n_67326a584k"}
05:10:45.511 +13.94s INFO  store.undo Annuler {"left":12,"redo":1}
…
05:10:45.688 +14.12s DEBUG canvas.key Raccourci dans la page : Ctrl+Y {"key":"Ctrl+Y","in":"page","selected":"n_2l6m0w3e5i"}
05:10:45.688 +14.12s INFO  store.redo Rétablir {"left":0}
…
05:10:45.868 +14.30s DEBUG canvas.key Raccourci dans la page : Ctrl+Maj+Z {"key":"Ctrl+Maj+Z","in":"page","selected":"n_67326a584k"}
05:10:45.868 +14.30s DEBUG store.redo-none Rétablir : rien à rétablir
05:10:46.044 +14.47s DEBUG ui.click Clic : ↶ {"el":"button","id":"undoBtn","text":"↶"}
05:10:46.045 +14.48s INFO  store.undo Annuler {"left":12,"redo":1}
…
```
確認すること：残りの段階数（`left`）付きの `store.undo`／`store.redo`（INFO）。キーボードの場合は直前にそのキー（ページ内では `canvas.key`、それ以外では `ui.key`）、ボタンの場合は `ui.click` が出ます。

**ほかのパターン**
| 状況 | 画面で変わること | ログ |
|---|---|---|
| 元に戻す／やり直すものがない | 何も起きません | `store.undo-none`／`store.redo-none`（DEBUG） |
| テキストの入力中に Ctrl+Z | 入力が終わり、その入力全体が取り消されます | `edit.ok`、続いて `store.undo`（2.5） |
| インスペクターのフィールドで Ctrl+Z | そのフィールドが自分の入力を取り消します（ブラウザーの動作） | `ui.key` だけで、`store.undo` は出ません |
| レビューモード | 何も起きません | `store.undo-none`「元に戻す：レビューモードではできません」 |

**エラー**：想定されるものはありません。

---

## 2.10 複数選択

**目的**：複数の要素をまとめて調整、複製、削除すること。

**手順**
1. 要素を 1 つ選択し、ほかの要素を Shift＋クリックします（ページまたは構造で）。すでに選ばれている要素を Shift＋クリックすると外れます。
2. Ctrl+D、Delete、またはスタイルタブの設定：すべての要素に適用されます。
3. Esc で 1 つの要素の選択に戻ります。

**表示される内容**：番号付きの青い点線の枠。インスペクターには「3 個の要素を選択中」と表示され、スタイルタブだけが表示されます。

**期待されるログ**（[`journaux/edition-selection-multiple.log`](../journaux/edition-selection-multiple.log)）
```log
05:10:46.307 +14.74s DEBUG store.multi Sélection multiple : 2 {"ids":["n_2l6m0w3e5i","n_3l0j1o2032"]}
05:10:46.373 +14.80s DEBUG store.multi Sélection multiple : 3 {"ids":["n_2l6m0w3e5i","n_3l0j1o2032","n_1r5g674a09"]}
05:10:46.563 +14.99s DEBUG canvas.key Raccourci dans la page : Ctrl+X {"key":"Ctrl+X","in":"page","selected":"n_1r5g674a09"}
05:10:46.563 +14.99s WARN  action.refused Action « couper » refusée : un seul élément à la fois {"action":"couper","multi":3}
05:10:46.563 +14.99s ERROR ui.toast Message affiché : Couper fonctionne sur un seul élément à la fois. {"type":"error"}
05:10:46.574 +15.01s DEBUG canvas.key Raccourci dans la page : Ctrl+D {"key":"Ctrl+D","in":"page","selected":"n_1r5g674a09"}
…
05:10:46.604 +15.04s INFO  action.duplicate 3 éléments dupliqués {"count":3,"ids":["n_3w4w100d65","n_1o3o1b1760","n_17320z0265"]}
05:10:46.604 +15.04s INFO  ui.toast Message affiché : 3 éléments dupliqués.
05:10:46.769 +15.20s DEBUG canvas.key Raccourci dans la page : Ctrl+Z {"key":"Ctrl+Z","in":"page","selected":"n_17320z0265"}
05:10:46.769 +15.20s INFO  store.undo Annuler {"left":12,"redo":1}
…
05:10:46.997 +15.43s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:47.040 +15.47s DEBUG store.multi Sélection multiple : 2 {"ids":["n_2l6m0w3e5i","n_3l0j1o2032"]}
05:10:47.064 +15.49s DEBUG canvas.key Raccourci dans la page : Escape {"key":"Escape","in":"page","selected":"n_3l0j1o2032"}
```
確認すること：Shift＋クリックのたびに `store.multi`（数と ID）。`action.duplicate` `{"count":3}`。最後の Esc では `canvas.key` 以外の行は出ません。複数選択は単に解除されます。

**ほかのパターン**
| 状況 | ログ |
|---|---|
| 選択した要素にスタイルを設定 | `"target":"multi","count":3` 付きの `style.set`（第3章） |
| すべてにスタイルを貼り付け | `style.paste` `{"count":3}` |
| すべて削除 | `action.delete` `{"count":3}` と、メッセージ「3 個の要素を削除しました（Ctrl+Z で元に戻せます）。」 |

**エラー**：複数の要素の切り取りは拒否されます（`action.refused`、2.8 を参照）。

---

## 2.11 構造パネル

**目的**：ページのツリー（セクション、行、列、ウィジェット）を見ること。ページ上ではつかみにくいものを選択すること。並べ替えること。

**手順**
1. 左パネル「構造」。
2. ▾／▸ で折りたたみ・展開します。キーボードでは：↑ ↓ Home End で移動、←／→ で折りたたみ／展開、Enter または Space で選択（Shift+Enter で複数選択に追加）。
3. 行をドラッグして並べ替えます（2.4）。右クリックでコンテキストメニュー（2.12）。

**表示される内容**：ツリーはページでの選択やマウスオーバーに連動します。◌ は、あるデバイスで非表示になっている要素を示します。

**期待されるログ**（[`journaux/edition-structure.log`](../journaux/edition-structure.log)）
```log
05:10:39.654 +8.09s DEBUG structure.open Panneau Structure ouvert {"rows":32}
…
05:10:39.853 +8.28s DEBUG structure.collapse Replié : Section {"id":"n_4q1f2f251a","type":"section","collapsed":true,"children":1,"by":"clic"}
05:10:39.986 +8.42s DEBUG structure.collapse Déplié : Section {"id":"n_4q1f2f251a","type":"section","collapsed":false,"children":1,"by":"clic"}
05:10:40.102 +8.53s DEBUG structure.collapse Replié (←) {"id":"n_4q1f2f251a","collapsed":true,"by":"clavier"}
05:10:40.107 +8.54s DEBUG structure.collapse Déplié (→) {"id":"n_4q1f2f251a","collapsed":false,"by":"clavier"}
05:10:40.114 +8.54s DEBUG structure.key Structure : sélection au clavier {"id":"n_4q1f2f251a","key":"Entrée"}
05:10:40.114 +8.54s DEBUG store.select Sélection : section {"id":"n_4q1f2f251a","type":"section"}
```
確認すること：`structure.open`（行数）、`structure.collapse`（`collapsed`、`by`：クリックまたはキーボード）、`structure.key`、続いて `store.select`。ツリー内でのキーボードの移動と、ツリーの再描画は、それぞれ `structure.key`／`structure.render` を TRACE で出します。

**ほかのパターン**
| 状況 | ログ |
|---|---|
| 行をドラッグして並べ替え | `dnd.start`、続いて `dnd.ok` `{"where":"structure"}` |
| 行を右クリック | `ctxmenu.open` `{"from":"structure"}` |
| 要素の名前を変える | できません。表示される名前は種類と内容（見出し、テキスト…）から決まります。内容をインスペクターで変えてください |

**エラー**：置けない場所にドロップした行は拒否されます（`dnd.refused`、2.4）。

---

## 2.12 コンテキストメニュー（右クリック）

**目的**：要素のすべての操作を 1 か所で見つけること。

**手順**：要素（ページまたは構造）を右クリックします。↑／↓ で移動、Enter またはクリックで選択、Esc で閉じます。

**表示される内容**：テキストを編集、コンポーネントを作成、複製、コピー、貼り付け、スタイルをコピー／スタイルを貼り付け、上へ移動、下へ移動、親を選択、削除。実行できない操作は灰色になります。

**期待されるログ**（[`journaux/edition-menu-contextuel.log`](../journaux/edition-menu-contextuel.log)）
```log
05:10:47.253 +15.68s DEBUG ctxmenu.open Menu contextuel : Titre (page) {"id":"n_3l0j1o2032","type":"heading","from":"canevas","items":11,"disabled":["pasteStyle"]}
…
05:10:47.436 +15.87s DEBUG ctxmenu.action Menu contextuel : Dupliquer {"action":"duplicate","id":"n_3l0j1o2032","type":"heading"}
…
05:10:47.445 +15.88s DEBUG store.select Sélection : heading {"id":"n_342l0z0m2a","type":"heading"}
05:10:47.452 +15.88s INFO  action.duplicate Dupliqué : heading {"id":"n_3l0j1o2032","newId":"n_342l0z0m2a","type":"heading"}
05:10:47.691 +16.12s DEBUG store.select Sélection : heading {"id":"n_3l0j1o2032","type":"heading"}
05:10:47.697 +16.13s DEBUG ctxmenu.open Menu contextuel : Titre (page) {"id":"n_3l0j1o2032","type":"heading","from":"canevas","items":11,"disabled":["pasteStyle"]}
05:10:47.813 +16.24s DEBUG ctxmenu.close Menu contextuel fermé (Échap) {"by":"Échap"}
```
確認すること：`ctxmenu.open`（要素、`from`：キャンバスまたは構造、操作の数、灰色の操作 `disabled`）→ `ctxmenu.action`（選んだ操作）→ その操作の行（`action.duplicate`…）。`ctxmenu.close` はメニューが閉じた理由を示します（`Échap`、`clic ailleurs`、`défilement`、`fenêtre quittée`…）。操作を選んだ後は、閉じた行は出ません。

**ほかのパターン**
| 状況 | ログ |
|---|---|
| ページそのもの（要素の外）を右クリック | ブラウザーのメニューが出て、行は出ません。要素が見つからない場合：`ctxmenu.none`（DEBUG） |
| 入力中のテキストで右クリック | ブラウザーのメニュー（スペルチェック） |
| 「テキストを編集」 | `ctxmenu.action` `{"action":"edit"}`、続いて `edit.keyboard`、`edit.start` |
| 「コンポーネントを作成…」 | `action.component-create`（第3章） |

**エラー**：選んだ操作のエラーです（`action.refused`…）。

---

## 2.13 コマンドバー（Ctrl+K）

**目的**：すべてをキーボードで行うこと。ウィジェット、テンプレート、コンポーネントの追加、ウィンドウを開く、スタイルの設定…

**手順**
1. Ctrl+K（または ⌘K）を押し、何文字か入力します（「区切り線」「ログ」「余白」…）。
2. ↑／↓、続いて Enter。

**表示される内容**：絞り込まれた一覧。コマンドが実行され、バーが閉じます。

**期待されるログ**（[`journaux/edition-ctrl-k.log`](../journaux/edition-ctrl-k.log)）
```log
05:10:48.163 +16.59s DEBUG canvas.key Raccourci dans la page : Ctrl+K {"key":"Ctrl+K","in":"page","selected":"n_4y660b0u1y"}
05:10:48.167 +16.60s DEBUG ui.dialog.open Fenêtre ouverte : cmdk {"id":"cmdk","class":"cmdk","modal":true}
05:10:48.495 +16.93s INFO  cmdk.run Commande : Ajouter : Séparateur {"id":"add:divider","query":"ajouter séparateur"}
…
05:10:48.506 +16.94s DEBUG store.select Sélection : divider {"id":"n_3g0r041547","type":"divider"}
05:10:48.512 +16.94s INFO  action.add Widget ajouté : Séparateur {"type":"divider","id":"n_3g0r041547","parentType":"column"}
05:10:48.516 +16.95s DEBUG ui.dialog.close Fenêtre fermée : cmdk {"id":"cmdk"}
…
```
確認すること：キー（`canvas.key` または `ui.key` の Ctrl+K）、`ui.dialog.open`（cmdk）、コマンドの ID（`add:divider`、`tpl:hero`、`cmp:…`、`act:log`…）と入力した文字列付きの `cmdk.run`、続いて操作の行（`action.add`…）。

**ほかのパターン**
| 状況 | ログ |
|---|---|
| 「テンプレート：…」コマンド | `cmdk.run` `{"id":"tpl:…"}`、続いて `action.add-section` |
| スタイル設定のコマンド（「余白…」） | `cmdk.run`、続いて `style.focus`（その設定がスタイルタブで強調されます）。その要素にない設定の場合：`style.focus-missing` |
| テキストの入力中に Ctrl+K | 何も起きません。キーはテキストに渡されます |
| Esc | `ui.dialog.close` |

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| コマンドがクラッシュした | 赤いメッセージ | `cmdk.fail`（ERROR）`{"id":…,"error":…}` | ログを送ってください |
| 操作がルールによって拒否された | そのルールのメッセージ | `cmdk.run`、続いて `action.refused`（WARN） | 別の場所を選択してください |

---

## 2.14 キーボードショートカット

「?」（フィールドの外で）を押すと、ショートカットのヘルプが表示されます。**ログ**の列に、期待される行を示します。ページ内では、キーそのものが `canvas.key`（DEBUG。矢印キーは TRACE）を出します。ページの外（構造、インスペクター、上部バー）では `ui.key` が出ますが、Ctrl、Alt、⌘ との組み合わせと、Esc、Delete、F1、F2、F5、F12 の場合だけです。

| ショートカット | 場所 | 効果 | 期待されるログ |
|---|---|---|---|
| クリック | ページ、構造 | 選択 | `store.select`（構造では先に `ui.click`） |
| Shift＋クリック | ページ、構造 | 選択に追加／選択から外す | `store.multi` |
| ↑ ↓ ← → | ページ（要素を選択中） | 前、次、親、最初の子 | `canvas.key`（TRACE）、続いて `store.select` |
| Esc | ページ、要素を選択中 | 親を選択 | `canvas.key` Escape、`action.parent`（または `action.parent-none`） |
| Esc | 複数選択 | 1 つの要素に戻る | `canvas.key` Escape（または `ui.key`） |
| Esc | ドラッグ中 | キャンセル | `dnd.cancel` `{"by":"Échap"}` |
| Esc | テキストの入力中 | 終了 | `canvas.key` Escape、`edit.ok` |
| Esc | コンテキストメニュー | 閉じる | `ctxmenu.close` `{"by":"Échap"}` |
| Esc | ウィンドウが開いている | 閉じる | `ui.key` Escape、`ui.dialog.close` |
| Enter | ページ、要素を選択中 | そのテキストを書く | `canvas.key` Enter、`edit.keyboard`、`edit.start`（または `edit.no-text`） |
| Enter | 見出しやボタンの入力中 | 終了 | `edit.ok` |
| Delete または Backspace | ページ、要素を選択中 | 削除 | `canvas.key` Delete／Backspace（または `ui.key` Delete）、`action.delete` |
| Ctrl+C | 要素を選択中 | コピー | `canvas.key` Ctrl+C、`action.copy` |
| Ctrl+X | 要素を選択中 | 切り取り | `canvas.key` Ctrl+X、`action.cut`、`action.delete`（複数の場合：`action.refused`） |
| Ctrl+V | Atelier のクリップボードに中身がある | 貼り付け | `canvas.key` Ctrl+V、`action.paste`（または `action.refused`） |
| Ctrl+D | 要素を選択中（インスペクターのフィールド内でも） | 複製 | `canvas.key` Ctrl+D（または `ui.key`）、`action.duplicate` |
| Alt+↑／Alt+↓ | 要素を選択中 | 上へ／下へ移動 | `canvas.key` Alt+ArrowUp、`action.move`（または `action.move-edge`） |
| Ctrl+Z | どこでも（インスペクターのフィールドを除く） | 元に戻す | `canvas.key`／`ui.key` Ctrl+Z、`store.undo`（または `store.undo-none`） |
| Ctrl+Y、Ctrl+Shift+Z | どこでも（フィールドを除く） | やり直す | `canvas.key`／`ui.key`、`store.redo`（または `store.redo-none`） |
| Ctrl+B／Ctrl+I／Ctrl+U | リッチテキストの入力中 | 太字／斜体／下線 | `edit.format`、`canvas.key` Ctrl+B… |
| Ctrl+V | テキストの入力中 | 書式なしで貼り付け | `canvas.key` Ctrl+V、`edit.paste` |
| Ctrl+A | テキストの入力中 | すべて選択 | `canvas.key` Ctrl+A |
| Ctrl+K | どこでも（テキストの入力中を除く） | コマンドバー | `canvas.key`／`ui.key` Ctrl+K、`ui.dialog.open`（cmdk）、続いて `cmdk.run` |
| Ctrl+S | どこでも | プロジェクトを .json で保存 | `ui.key` Ctrl+S（または `canvas.key`）、`project.export-json` |
| Ctrl+Alt+J | どこでも | 🐞 デバッグログ ウィンドウ | `ui.key` Ctrl+Alt+J、`ui.dialog.open`（logDialog） |
| ? | フィールドの外 | ショートカットのヘルプ | `ui.dialog.open`（shortcutsDialog） |
| F1 | どこでも（ウィンドウを開いているときも） | 新しいタブで利用ガイドを開く（開いているウィンドウの章、それ以外は第 1 章） | `ui.help` |
| ↑ ↓ Home End | 構造 | ツリーを移動 | `structure.key`（TRACE） |
| ←／→ | 構造 | 折りたたみ／展開（または親／子） | `structure.collapse` `{"by":"clavier"}` |
| Enter、Space（Shift：複数） | 構造 | 選択 | `structure.key`、`store.select`（または `store.multi`） |
| ↑ ↓ | コンテキストメニュー | 移動 | 行は出ません |
| Enter／Esc | リンクのアドレスのフィールド | 確定／中止 | `edit.format`（`link`）、または `edit.link-invalid`／`edit.link-cancel` |

**期待されるログ** — Alt+↓、Alt+↑、?、Ctrl+S、Ctrl+Alt+J（[`journaux/edition-raccourcis.log`](../journaux/edition-raccourcis.log)）
```log
05:10:48.896 +17.33s DEBUG canvas.key Raccourci dans la page : Alt+ArrowDown {"key":"Alt+ArrowDown","in":"page","selected":"n_2l6m0w3e5i"}
…
05:10:48.912 +17.34s INFO  action.move Descendu : heading {"id":"n_2l6m0w3e5i","type":"heading","delta":1,"index":1}
05:10:49.022 +17.45s DEBUG canvas.key Raccourci dans la page : Alt+ArrowUp {"key":"Alt+ArrowUp","in":"page","selected":"n_2l6m0w3e5i"}
…
05:10:49.045 +17.48s INFO  action.move Monté : heading {"id":"n_2l6m0w3e5i","type":"heading","delta":-1,"index":0}
05:10:49.171 +17.60s DEBUG ui.dialog.open Fenêtre ouverte : Raccourcis clavier {"id":"shortcutsDialog","class":"keys","modal":true}
05:10:49.345 +17.78s DEBUG ui.key Raccourci : Escape {"key":"Escape","in":"button"}
05:10:49.351 +17.78s DEBUG ui.dialog.close Fenêtre fermée : Raccourcis clavier {"id":"shortcutsDialog"}
05:10:49.457 +17.89s DEBUG ui.key Raccourci : Ctrl+S {"key":"Ctrl+S","in":"body"}
05:10:49.458 +17.89s INFO  project.export-json Projet enregistré en fichier .json {"kb":38,"pages":2}
…
05:10:49.461 +17.89s INFO  ui.toast Message affiché : Projet enregistré en fichier .json.
05:10:49.575 +18.01s DEBUG ui.key Raccourci : Ctrl+Alt+J {"key":"Ctrl+Alt+J","in":"body"}
05:10:49.581 +18.01s DEBUG ui.dialog.open Fenêtre ouverte : 🐞 Journal de débogage {"id":"logDialog","class":"audit log-dialog","modal":true}
…
05:10:49.851 +18.28s DEBUG ui.key Raccourci : Escape {"key":"Escape","in":"button"}
05:10:49.861 +18.29s DEBUG ui.dialog.close Fenêtre fermée : 🐞 Journal de débogage {"id":"logDialog"}
```

---

## 2.15 ページ内のヘッダーとフッター

**目的**：ヘッダーとフッターがほかの部分と同じように選択できない理由を知ること。

**手順**：ヘッダーまたはフッターをダブルクリックします。

**表示される内容**：カスタマイズしていない間は、「ヘッダーをブロックごとに編集するには：サイトパネル →「カスタマイズ」。」というメッセージが出ます。カスタマイズした後は、ダブルクリックでブロック単位の編集が開きます（第3章 3.12）。

**期待されるログ**（[`journaux/edition-entete-verrouille.log`](../journaux/edition-entete-verrouille.log)）
```log
05:10:50.011 +18.44s DEBUG store.select Sélection vidée {"id":null}
05:10:50.022 +18.45s INFO  canvas.zone-locked En-tête non personnalisé : à activer dans le panneau Site {"zone":"header"}
05:10:50.022 +18.45s INFO  ui.toast Message affiché : Pour modifier l’en-tête bloc par bloc : panneau Site → « Personnaliser ».
```
確認すること：`canvas.zone-locked`（INFO）`{"zone":"header"}` または `"footer"`。

**ほかのパターン**
| 状況 | ログ |
|---|---|
| ヘッダーまたはフッターがすでにカスタマイズ済み | `canvas.dblclick` `{"target":"header"}`、続いて `store.edit-target`、`canvas.load.start` |
| コンポーネントのインスタンスをダブルクリック | `canvas.dblclick` `{"target":"component"}`（第3章 3.11） |
| コンテンツの一覧をダブルクリック | `canvas.dblclick` `{"target":"card"}`（カードの編集、第4章） |

**エラー**：ありません。

---

## 2.16 ボタンのツールチップ

**目的**：アイコンのボタンが何をするのか、クリックせずに知ること。

**手順**：ボタンの上にマウスを少し（3 分の 1 秒）置くか、キーボードの Tab でボタンに移動します。

**通常の流れ**：ボタンの下に暗い色の吹き出しが出ます（場所がなければ上に。ウィンドウからはみ出すことはありません）。内容は：
- 太字の**名前**。
- **ショートカット**がある場合はそのキー：`Ctrl` `Z` — Mac では `⌘` `Z`。Shift は `⇧`、Alt は `⌥`、Delete は `⌫` で表します。
- わかりにくいボタンには**説明の 1 行**：✨ オンデバイスAI、👥 共同編集、💬 コメント、🐞 ログ、↶ ↷、デスクトップ／タブレット／モバイル、翻訳、SEO、公開、サイトを書き出す、選択した要素のツールバー ↰ ✥ ⧉ ✕、🖌 📋、↺、🖥▭▯。

隣のボタンへマウスを滑らせると、吹き出しもすぐについてきます。マウスが離れたとき、クリックしたとき、Esc を押したとき、スクロールしたときに消えます。選択した要素のツールバーのボタン（ページ内）にも同じ吹き出しがあり、ページが縮小されていても正しい位置に出ます。サイトそのもののヘルプテキスト（ページのリンク）は対象外です。

**ほかのパターン**：タッチ画面では、タッチしても吹き出しは出ません（タッチはクリックとして扱われます）。キーボードでは、吹き出しは Tab のときだけ出て、クリックの後には出ません。

**ログ**：何も出ません（ログが埋もれないよう、マウスオーバーは記録しません）。確認するには：セルフテスト（第15章）に `infobulles` のケースがあります。

---

## 2.17 左右のパネルを広げる

**目的**：設定（インスペクター、コンテンツ、サイト）に、あるいは逆にページに、より多くの場所を使います。

**手順**：パネルの内側の端（パネルとページの間）にマウスを置くと、色の線が現れ、ポインターが ↔ になります。クリックしたままドラッグします。キーボードでは、Tab でハンドルまで移動し、← →（Shift で大きく）、Home（いちばん狭く）、End（いちばん広く）。ハンドルを**ダブルクリック**すると元の幅に戻ります。

**画面の表示**：ドラッグ中もページの縮尺が合わせ直されます。幅はこのデバイスに保存され、次回も同じ幅になります。コメントパネルはインスペクターと同じ幅になります。

**範囲**：左は 220 px 以上、右は 260 px 以上、どちらも 640 px まで。ページには常に 420 px 以上が残ります。ウィンドウが狭くなると、パネルは自動的に縮みます。小さな画面（900 px 未満）ではパネルが縦に並び、ハンドルは表示されません。

| 状況 | ログ |
|---|---|
| 幅を変更（マウスまたはキーボード） | `ui.panel-resize`（DEBUG）：左右、変更前、変更後、`by`（souris／clavier） |
| ダブルクリック：元の幅 | `ui.panel-reset`（INFO） |
| 保存された幅で起動 | `ui.panel-restore`（DEBUG） |

---

## 2.18 コマンドバーでできること

**目的**：ボタンを探さずに、**Ctrl+K** に何を入力すればすばやく操作できるかを知ること。

**手順**
1. **Ctrl+K**（または ⌘K）を押します。
2. 目的のグループの言葉（下の表）を入力し、↑／↓、続いて **Enter** を押します。

**通常の流れ**：何も入力しないと、一覧にはまず最近使ったコマンドが表示されます（直近の 8 件。この端末に記憶されます）。各行の先頭にはグループ名が付き、キーボードショートカットがある場合は右側に表示されます。

| グループ | コマンドの例 | できること |
|---|---|---|
| 追加 | 「追加：ギャラリー」 | 選択した要素の後ろにそのウィジェットを追加します（すべてのウィジェットが候補に出ます） |
| テンプレート | 「テンプレート：よくある質問」 | できあがったセクションを追加します |
| コンポーネント | 「コンポーネント：…」 | 自分のコンポーネントを挿入します |
| コンテンツ | 「コンテンツ：イベント（6）」、「カードを編集：イベント」、「詳細ページを編集：イベント」、「新しいコレクション（メンバー、ニュース、イベントなど）」 | コレクションを開く、またはそのカードや詳細ページを編集します |
| サイト | 「サイトのヘッダーを編集」、「サイトのフッターを編集」 | ヘッダーやフッターをブロックに切り替え（まだの場合）、編集を始めます |
| ページ | 「ページ：イベントとアクセス」 | そのページを開きます |
| 要素 | 「タイトル：久万高原町を知る」、または `#acces` | 開いているページ（または編集中のヘッダー、カードなど）のその要素を選択し、そこまでスクロールします。アンカーは `#` で検索します |
| 表示 | 「デバイス：モバイル」、「言語：English」 | 表示するデバイスや言語を切り替えます |
| パネル | 「パネル：ページ」、「パネル：サイト（色、フォント、プリセット）」 | 左パネルのそのタブを開きます |
| 設定 | 「設定：外側の余白（上）」、「設定：背景色」 | スタイルタブのその設定を開きます（要素を選択しているときだけ） |
| 操作 | 「選択した要素を複製」、「スタイルをコピー」、「選択した要素からコンポーネントを作成」、「現在の編集を終了」、「サイトを書き出す」、「サイトを公開（OVH、GitHub）」、「プロジェクトのバージョン」、「新しいタブでプレビュー」、「翻訳表」、「🌍 English」 | エディターのボタンやメニューと同じ操作です |
| AI | 「✨ Atelier に頼む」、「🧪 オンデバイスAIのテストベンチ」 | 第 [13](13-demander-a-atelier.md) 章と第 [14](14-banc-essai.md) 章を参照してください |
| ヘルプ | 「ヘルプ：キーボードショートカット」、「📖 利用ガイド」 | ショートカットの一覧（? キーと同じ）、利用ガイド（F1 と同じ） |

**3 語以上の文**（「アクセスについての FAQ を追加」）を入力すると、一覧の先頭に「✨ Atelier に頼む：「…」」の行が加わります（第 [13](13-demander-a-atelier.md) 章）。その文が実はコマンド名だった場合は、コマンドが先頭のままです。

**ログ**：実行したコマンドごとに、その ID（`add:…`、`tpl:…`、`col:…`、`colcard:…`、`coldetail:…`、`zone:header`、`page:…`、`node:…`、`device:mobile`、`lang:en`、`panel:pages`、`style:marginTop`、`act:…`）付きの `cmdk.run` が出ます。失敗したコマンドは `cmdk.fail` を出します（2.13）。

---

## この章のコード

| コード | レベル | 意味 |
|---|---|---|
| `action.add` | INFO | ウィジェットを追加した（種類、場所） |
| `action.add-section` | INFO | セクションを追加した（構造またはテンプレート） |
| `action.copy` | INFO | 要素を Atelier のクリップボードにコピーした |
| `action.cut` | INFO | 要素を切り取った（続いて `action.delete`） |
| `action.delete` | INFO | 要素を削除した |
| `action.duplicate` | INFO | 要素を複製した |
| `action.move` | INFO | 要素を上へ／下へ移動した（Alt+↑／Alt+↓、メニュー） |
| `action.move-edge` | DEBUG | すでに先頭／末尾 |
| `action.none` | DEBUG | 適切な選択がないまま操作を求めた |
| `action.parent` | DEBUG | 親を選択した（Esc、↰） |
| `action.parent-none` | DEBUG | 選択できる親がない |
| `action.paste` | INFO | 要素を貼り付けた |
| `action.paste-empty` | DEBUG | Atelier のクリップボードが空 |
| `action.refused` | WARN | 操作を拒否した、理由付き（`action`、`error`） |
| `canvas.dblclick` | DEBUG | 編集を開くダブルクリック（コンポーネント、カード、ヘッダー、フッター） |
| `canvas.key` | DEBUG、TRACE | ページ内で押したキー（矢印キーは TRACE） |
| `canvas.load.start` | INFO | キャンバスの完全な再読み込み、理由付き |
| `canvas.load.render` | DEBUG | ページを描画した（所要時間、サイズ） |
| `canvas.load.ok` | INFO | キャンバスの準備完了（要素の数） |
| `canvas.resources` | DEBUG | キャンバスのフォントとオンライン画像を読み込んだ（所要時間、ホスト） |
| `canvas.resources-slow` | WARN | フォントやオンライン画像が遅い（3 秒超）：エディターは使えるまま |
| `canvas.load.cancel` | INFO | 読み込みが新しいものに置き換えられた |
| `canvas.load.fail` | ERROR | キャンバスを読み込めなかった（描画できない、文書が空） |
| `canvas.no-resize-observer` | WARN | 古いブラウザー：枠はスクロール時にしか位置が直らない |
| `canvas.overlay-fail` | WARN、TRACE | オーバーレイ（プレゼンス、コメント）でエラー |
| `canvas.remote-applied` | DEBUG | あなたの入力の後、離れた場所からの変更を適用した |
| `canvas.remote-deferred` | DEBUG | あなたの入力中、離れた場所からの変更を保留した |
| `canvas.render` | DEBUG、TRACE | 再読み込みなしでキャンバスを更新した（入力のたびに TRACE） |
| `canvas.render-fail` | ERROR | ページを描画できない |
| `canvas.scale` | DEBUG、TRACE | 描画幅と縮小率（サイズ変更時は TRACE） |
| `canvas.scroll` | DEBUG | 選択した要素までスクロール |
| `canvas.scroll-missing` | DEBUG | 選択した要素がキャンバスにない（非表示） |
| `canvas.toolbar` | DEBUG | 要素のツールバーのボタン（↰ ⧉ ✕） |
| `canvas.ui-action` | DEBUG | キャンバス内に描かれたエディターのボタン |
| `canvas.zone-locked` | INFO | ヘッダーまたはフッターがカスタマイズされていない |
| `cmdk.fail` | ERROR | Ctrl+K のコマンドが失敗した |
| `cmdk.run` | INFO | Ctrl+K のコマンドを実行した |
| `ctxmenu.action` | DEBUG | コンテキストメニューで操作を選んだ |
| `ctxmenu.close` | DEBUG | メニューを閉じた（理由） |
| `ctxmenu.none` | DEBUG | この要素にはメニューがない |
| `ctxmenu.open` | DEBUG | コンテキストメニューを開いた |
| `dnd.autoscroll` | TRACE | ドラッグ中の自動スクロール |
| `dnd.cancel` | INFO | 変更なしでドラッグが終わった（外、同じ場所、Esc、拒否） |
| `dnd.fail` | ERROR | ドロップできなかった（エラー） |
| `dnd.ok` | INFO | ドロップを受け付けた（親、位置） |
| `dnd.refused` | WARN | 置けない場所 |
| `dnd.start` | INFO | ドラッグの開始 |
| `dnd.target` | TRACE | 新しく狙ったドロップ先 |
| `dnd.unknown` | WARN | ドラッグした要素が見つからない |
| `edit.ai-apply` | INFO | AI の提案を適用した |
| `edit.ai-apply-none` | DEBUG | 適用するものがない |
| `edit.ai-ask` | DEBUG | AI に依頼を送った（モード、長さ） |
| `edit.ai-cancel` | INFO | 提案を取り下げた |
| `edit.ai-empty` | WARN | 対象のテキストがない |
| `edit.ai-menu` | DEBUG | ✨ メニューを開いた、または閉じた |
| `edit.ai-none` | WARN | 提案がない（`ai.*` を参照） |
| `edit.ai-proposal` | DEBUG | 提案を表示した |
| `edit.ai-stale` | DEBUG | 入力が終わった後に提案が届いた |
| `edit.ai-unavailable` | WARN | AI のモジュールが読み込まれていない |
| `edit.bound` | WARN | コレクションに結び付いたテキスト：入力を拒否した |
| `edit.cancel` | INFO | キャンバスの再読み込みで入力が中断された |
| `edit.dblclick` | DEBUG | テキストをダブルクリックした |
| `edit.drop-blocked` | DEBUG | 入力中のテキストへのドロップを無視した |
| `edit.fail` | ERROR | `edit` の流れの失敗による終了：用意されているが現在は使われていない（入力は `edit.ok` か `edit.cancel` で終わります） |
| `edit.format` | DEBUG | 書式を適用した、または外した |
| `edit.format-none` | DEBUG | 書式が効かなかった（何も選択されていない） |
| `edit.input` | TRACE | テキストを変更した（長さ）、入力のたびに |
| `edit.keyboard` | DEBUG | Enter またはメニューで入力を求めた |
| `edit.link-cancel` | DEBUG | リンクを中止した（Esc） |
| `edit.link-invalid` | WARN | リンクのアドレスを拒否した |
| `edit.link-none` | DEBUG | テキストを選択せずに 🔗 |
| `edit.link-open` | DEBUG | アドレスのフィールドを開いた |
| `edit.no-text` | DEBUG | 選択した要素には書けるテキストがない |
| `edit.node-gone` | WARN | 入力中に要素が削除された |
| `edit.not-editable` | DEBUG | インスペクターで設定するテキスト |
| `edit.ok` | INFO | 入力が終わった（変更の有無、長さ） |
| `edit.paste` | DEBUG | プレーンテキストとして貼り付けた（長さ、行数） |
| `edit.paste-file` | WARN | 貼り付けたファイルを無視した |
| `edit.readonly` | WARN | 入力を拒否した：レビューモード |
| `edit.start` | INFO | 入力の開始（要素、フィールド、言語、長さ） |
| `library.insert` | DEBUG | ウィジェットまたは構造をクリックした |
| `library.search` | DEBUG、TRACE | ウィジェットの検索（1 文字ごとに TRACE） |
| `library.search-empty` | DEBUG | 該当するウィジェットがない |
| `structure.collapse` | DEBUG | 行を折りたたんだ、または展開した |
| `structure.key` | DEBUG、TRACE | キーボードで選択した（移動は TRACE） |
| `structure.open` | DEBUG | 構造パネルを開いた |
| `structure.render` | TRACE | ツリーを再描画した |
| `widgets.extra` | DEBUG | 追加ウィジェットを読み込んだ |
| `widgets.missing` | WARN | 追加ウィジェットがない |
| `ui.panel-reset` | INFO | パネルを元の幅に戻した（ハンドルのダブルクリック） |
| `ui.panel-resize` | DEBUG | パネルの幅を変更した（マウスまたはキーボード） |
| `ui.panel-restore` | DEBUG | 起動時に保存された幅を適用した |
