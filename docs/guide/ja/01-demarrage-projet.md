# 1. 起動、保存、開く

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

Atelier はすべてブラウザーの中で動きます。プロジェクトは**このデバイスに自動で保存**され（ブラウザーのローカルデータベース IndexedDB）、別のパソコンに移したり共有したりするために `.json` ファイルとして保存したり開いたりできます。

**ログのドメイン**：`boot.*`（起動）、`storage.*`（ローカルデータベース：プロジェクト、画像、バージョン、トークン）、`store.*`（変更履歴、選択、表示）、`project.*`（.json ファイル、サンプル、新しいサイト、プレビュー）。

---

## 1.1 エディターを開く

**目的**：前回やめたところからプロジェクトを再開すること。

**手順**
1. Chrome でエディターのアドレスを開きます（Edge、Firefox、Safari でもすべて動きます。ただしオンデバイスAIにはデスクトップの Chrome が必要です）。

**表示される内容**：このデバイスに最後に保存したプロジェクト、または初めてのときは MAB のサンプルです。右上に保存の状態が表示されます：「保存済み」。

**期待されるログ** — プロジェクトが見つかった場合（[`journaux/demarrage-enregistre.log`](../journaux/demarrage-enregistre.log)）
```log
04:37:59.571 +0.00s INFO  boot.log Journal prêt {"console":"debug","keep":"debug","aide":"atelierDebug.copy() ou le bouton 🐞"}
04:37:59.574 +0.00s INFO  boot.start [boot#1] Démarrage d’Atelier (cycle 16) {"url":"http://localhost:8791/"}
04:37:59.588 +0.02s DEBUG storage.open Base locale ouverte {"ms":13}
04:37:59.589 +0.02s INFO  storage.load Projet rechargé depuis cet appareil {"slot":"current","name":"MAB – test du journal","pages":2,"images":0,"ms":14}
04:37:59.591 +0.02s INFO  boot.project [boot#1 · 17 ms] Projet enregistré sur cet appareil rechargé {"source":"saved","name":"MAB – test du journal","pages":2,"languages":["fr","nl","de","en"]}
04:37:59.618 +0.05s DEBUG storage.secret-read Aucun secret gardé {"name":"collab-session"}
04:37:59.833 +0.26s INFO  boot.ok [boot#1 · 259 ms] Éditeur prêt {"page":"p_asw1ynvz","lang":"fr"}
```
確認すること：`boot.start` → `storage.load` → `"source":"saved"` 付きの `boot.project` → `boot.ok`。`boot.ok` の所要時間が、起動全体（キャンバスが表示されるまで）にかかった時間です。

**ほかのパターン**
| 状況 | 変わること | ログ |
|---|---|---|
| このデバイスでの初回 | MAB のサンプルが表示されます | `storage.upgrade`（INFO、データベースを作成 `{"from":0,"to":3}`）、`storage.load-empty`（INFO）、`"source":"demo"` 付きの `boot.project` |
| アドレスに `?fresh=1` を付けた | 保存したプロジェクトを読まずにサンプルが表示されます（保存したプロジェクトは消えませんが、最初の変更で置き換わります） | `"source":"fresh"` 付きの `boot.project`（[`journaux/demarrage-fresh.log`](../journaux/demarrage-fresh.log)） |
| 招待リンク（`#join=…`） | エディターが共同編集のセッションに参加します | `"hash":"#join=…"` 付きの `boot.start`、続いて `collab.*`（第10章） |
| 別のタブで開いている別バージョンの Atelier がデータベースを更新した | 「このページを再読み込みしてください」 | `storage.version-change`（WARN） |

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| 厳格なプライベートブラウズで IndexedDB がブロックされている | エディターはサンプルで開きます。最初の変更の後に「未保存」 | `storage.unavailable` または `storage.open-fail`（ERROR）、続いて `storage.save-fail`（ERROR） | 通常のウィンドウでエディターを開いてください。それまでは ファイル →「プロジェクトを保存（.json）」 |
| Atelier の別のタブがデータベースの更新をブロックしている | 何も出ず、エディターは待ち続けます | `storage.blocked`（WARN） | Atelier のほかのタブを閉じてください |
| 保存したプロジェクトが読めない（新しすぎるバージョン、壊れたデータ） | サンプルが表示されます | 検証エラー付きの `boot.invalid-save`（WARN） | ファイル →「バージョン…」：安全バージョンに残っていることがあります。ログを送ってください |
| データベースを読み込めない | サンプルが表示されます | `storage.load-fail`（ERROR） | ログを送ってください。ディスクの空き容量も確認してください |
| データベースに画像が欠けている | その画像がプロジェクトから消えます | 画像の ID 付きの `storage.assets-missing`（WARN） | 画像をもう一度読み込んでください（第4章） |
| エディターがまったく表示されない | 真っ白なページ | コンソールのみ：`boot.error`／`boot.resource`／`boot.rejection`、15 秒後に `boot.timeout`（ERROR）。読み込み後に起動が失敗した場合は `boot.fail` | コンソールの `[Atelier]` の行をコピーしてください（第0章） |

---

## 1.2 変更する：自動保存と履歴

**目的**：変更を決して失わないこと。

**手順**
1. 何でも変更します（ここでは左上のサイト名）。
2. 最後の変更から約 0.6 秒後に、プロジェクトがこのデバイスに保存されます。

**表示される内容**：「変更あり」、続いて「保存済み」。

**期待されるログ**
```log
04:38:00.380 +0.81s DEBUG store.commit Modification {"key":"site-name","source":"topbar","past":1,"page":"p_asw1ynvz"}
04:38:01.907 +2.34s DEBUG storage.save Projet enregistré sur cet appareil {"ms":1,"kb":12}
```
- `store.commit`：変更が履歴に入ります。`past` ＝ 元に戻せる段階の数。`key` は同じフィールドでの素早い入力を 1 つの段階にまとめます（`"merged":true`：「同じ取り消し段階」）。`source` ＝ 変更したエディターの部分（topbar、inspector、canvas、site、pages、collections、remote…）。
- `storage.save`：`kb` ＝ 画像を除いたプロジェクトのサイズ。`newImages` ＝ 初めて書き込んだ画像（画像は 1 回しか書き込まれません）。

**ほかのパターン**
| 状況 | 変わること | ログ |
|---|---|---|
| Ctrl+Z／Ctrl+Shift+Z（または ↶ ↷） | 元に戻す／やり直す | `ui.key`、続いて残りの段階数付きの `store.undo`／`store.redo`（INFO）。元に戻すものがない場合：`store.undo-none`／`store.redo-none`（DEBUG） |
| 要素を選択 | | `store.select`（DEBUG）。Shift＋クリック：`store.multi`（DEBUG） |
| ページ、言語、デバイスの切り替え | | `store.view`（DEBUG）`{"pageId":…}`、`{"lang":"nl"}`、`{"device":"mobile"}` |
| キャンバスの要素へのマウスオーバー | | `store.hover`（TRACE のみ） |
| コンポーネント、ヘッダー、コレクションのカードの編集 | 「…を編集中です」の帯 | `store.edit-target`（INFO）。戻るとき：「ページに戻りました」 |
| ほかの参加者からの変更を受信 | | 操作数付きの `store.remote`（DEBUG）（第10章） |
| プロジェクトの置き換え（ファイルを開く、サンプル、新しいサイト） | | `store.load`（INFO） |

**エラー**
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| ストレージがいっぱい、データベースがブロックされている | 「未保存」 | エラー（`QuotaExceededError`…）付きの `storage.save-fail`（ERROR）。ふたたび保存できたとき：`storage.save-recovered`（INFO） | すぐに .json で保存してください。空き容量を作ってください（重すぎる画像、古いバージョン） |
| レビューモードでの変更 | 「レビューモード：閲覧とコメント（💬）はできますが、編集はできません。」 | `store.readonly`（WARN） | 正常です。ホストに編集権限を頼んでください（第11章） |
| バグ：エディターの一部が不正なサイトを送った | 何も変わりません | `store.invalid`（ERROR） | ログを送ってください |

実際の抜粋（ストレージ不足を再現してから回復：[`journaux/enregistrement-impossible.log`](../journaux/enregistrement-impossible.log)）
```log
04:38:00.380 +0.81s DEBUG store.commit Modification {"key":"site-name","source":"topbar","past":1,"page":"p_asw1ynvz"}
04:38:00.981 +1.41s ERROR storage.save-fail Projet NON enregistré sur cet appareil : Quota dépassé (simulé) (espace plein, navigation privée ou IndexedDB bloqué) {"error":{"name":"QuotaExceededError","message":"Quota dépassé (simulé)","code":22},"name":"QuotaExceededError"}
04:38:01.306 +1.74s DEBUG store.commit Modification (même étape d’annulation) {"key":"site-name","source":"topbar","merged":true,"past":1,"page":"p_asw1ynvz"}
04:38:01.907 +2.34s DEBUG storage.save Projet enregistré sur cet appareil {"ms":1,"kb":12}
04:38:01.907 +2.34s INFO  storage.save-recovered Enregistrement rétabli
```

---

## 1.3 プロジェクトをファイル（.json）に保存する

**目的**：コピーを残す、パソコンを替える、プロジェクトを送る。

**手順**：ファイル →「プロジェクトを保存（.json）」、または **Ctrl+S**。

**表示される内容**：`nom-du-site.atelier.json` というファイル（画像を含む）がダウンロードされ、「プロジェクトを .json ファイルとして保存しました。」というメッセージが出ます。

**期待されるログ**（[`journaux/projet-enregistrer-json.log`](../journaux/projet-enregistrer-json.log)）
```log
04:38:04.372 +4.80s INFO  project.export-json Projet enregistré en fichier .json {"kb":34,"pages":2}
04:38:04.374 +4.80s INFO  ui.toast Message affiché : Projet enregistré en fichier .json.
```
公開トークンがこのファイルに入ることは**決してありません**（トークンはデバイスに残ります。第8章の `storage.secret-*` を参照）。

---

## 1.4 プロジェクト（.json）を開く

**目的**：ファイルに保存したプロジェクトを再開すること。

**手順**：ファイル →「プロジェクトを開く（.json）」で、ファイルを選びます。

**表示される内容**：そのプロジェクトが現在のものと置き換わり、「プロジェクトを開きました。」というメッセージが出ます。前のプロジェクトの安全バージョンが保存され（ファイル → バージョン…）、Ctrl+Z で元に戻せます。

**期待されるログ**（[`journaux/projet-ouvrir-json.log`](../journaux/projet-ouvrir-json.log)）
```log
04:38:04.404 +4.83s INFO  project.import.start [project.import#1] Ouverture d’un projet .json {"name":"mab.atelier.json","kb":34}
04:38:04.409 +4.84s DEBUG storage.version-save Version enregistrée {"id":"v_mvsztmnto9vrr"}
04:38:04.414 +4.84s INFO  store.load Projet chargé dans l’éditeur {"name":"MAB – Médias Alternatifs Belges","pages":2,"keepHistory":true}
04:38:04.417 +4.85s INFO  project.import.ok [project.import#1 · 13 ms] Projet ouvert {"pages":2,"name":"MAB – Médias Alternatifs Belges"}
04:38:04.418 +4.85s INFO  ui.toast Message affiché : Projet ouvert.
```

**エラー**（[`journaux/projet-ouvrir-json-erreurs.log`](../journaux/projet-ouvrir-json-erreurs.log)）
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| ファイルが JSON ではない（壊れている、途中で切れている、別の形式） | 「ファイルを読み込めません：有効な JSON ではありません（…）」 | エラーの位置付きの `project.import.fail`（ERROR） | ファイルの完全なコピーを用意し直してください |
| 正しい JSON だが Atelier のプロジェクトではない（または不明なバージョン） | 「ファイルを読み込めません：プロジェクトの形式を認識できません（バージョン 2 が必要です）。」（または最初の検証エラー） | 最初の 5 件のエラー付きの `project.import.invalid`（WARN）、続いて `project.import.fail`（ERROR） | 本当に `.atelier.json` ファイルか確認してください。そうであればログを送ってください |

```log
04:38:04.463 +4.89s INFO  project.import.start [project.import#2] Ouverture d’un projet .json {"name":"casse.json","kb":0}
04:38:04.468 +4.90s ERROR project.import.fail [project.import#2 · 5 ms] ce n’est pas du JSON valide (Expected double-quoted property name in JSON at position 19 (line 1 column 20)) {…}
04:38:04.490 +4.92s INFO  project.import.start [project.import#3] Ouverture d’un projet .json {"name":"invalide.json","kb":0}
04:38:04.492 +4.92s WARN  project.import.invalid [project.import#3 · 2 ms] Projet refusé par la validation {"errors":["Format de projet non reconnu (version 2 attendue).","La langue principale doit faire partie des langues du site.","Le site doit avoir exactement une page d’accueil."]}
04:38:04.493 +4.92s ERROR project.import.fail [project.import#3 · 3 ms] Format de projet non reconnu (version 2 attendue). {…}
```

---

## 1.5 サンプルの再読み込み、空のサイトの開始、プレビュー

**目的**：MAB のサンプルや白紙のページからやり直すこと。訪問者と同じようにページを見ること。

**手順**
- ファイル →「サンプルを再読み込み」、続いて確認します。
- ファイル →「新しい空のサイト」：小さなウィンドウで次の項目を聞かれます。
  - **サイト名**（あとから「サイト」タブで変更できます）。
  - **メイン言語**（メイン言語）：最初に書く言語で、訪問者に標準で表示される言語です（フランス語、オランダ語、ドイツ語、英語、または**日本語**）。あとからは変更できません。
  - **サイトのほかの言語**（最初からチェックが入っています。フランス語のサイトならオランダ語・ドイツ語・英語、日本語のサイトなら英語）。あとから「サイト」タブで追加や削除ができます。

  最後に **サイトを作成** を押します。トップページには、最初からメイン言語で「ホーム」にあたる名前が付いています（日本語なら「ホーム」、フランス語なら「Accueil」）。
- ファイル →「新しいタブでプレビュー」。

**期待されるログ**（[`journaux/projet-exemple-nouveau-apercu.log`](../journaux/projet-exemple-nouveau-apercu.log)）
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
確認すること：置き換えのたびに、まず `storage.version-save`（安全バージョン）、続いて `store.load` が出ます。

**ほかのパターン**
| 状況 | 変わること | ログ |
|---|---|---|
| 確認で「キャンセル」と答えた（または新しいサイトのウィンドウを閉じた） | 何も変わりません | `project.cancel`（INFO）`{"action":"demo"}` または `{"action":"new"}` |
| 新しいサイトのウィンドウでメイン言語を変えた | 最初からチェックが入る言語もそれに合わせて変わります | `project.new-lang`（DEBUG）`{"lang":"ja"}` |
| ブラウザーがプレビューをブロックした（ポップアップ） | タブが開きません | それでも `project.preview` は記録されます。エディターのアドレスでポップアップを許可してください |

---

## 1.6 表示言語（フランス語、英語、日本語）

**目的**：エディターをフランス語、英語、日本語のどれかで使うこと。表示言語を変えても、サイトの言語は変わりません（第5章を参照）。

**手順**：**ファイル** メニュー →「表示言語」、または Ctrl+K で「🌍 English」／「🌍 日本語」／「🌍 Français」。

**通常の流れ**：プロジェクトが保存され、ページが新しい言語で再読み込みされます。選んだ言語はこのデバイスに記憶されます。いちばん最初に起動したときは、ブラウザーの言語（フランス語、英語、日本語。それ以外なら英語）が使われます。アドレスで言語を指定することもできます：`?lang=en`、`?lang=ja`、`?lang=fr`。

ボタン、パネル、ウィンドウ、メッセージ、ツールチップ、セルフテストとテストベンチのレポート、そして**ログのメッセージ**まで、すべてが選んだ言語になります。**ログのコード**（`page.add`…）は 3 つの言語で同じなので、日本語でコピーしたログもこのガイドで読めます。

| 状況 | ログ |
|---|---|
| 起動 | `ui.lang-ready`（DEBUG）：言語、翻訳された固定テキストの数、読み込んだカタログ |
| 言語の変更 | `ui.lang`（INFO）、続いて再読み込み |
| 変更の前にプロジェクトが保存されなかった | `ui.lang-save-fail`（WARN）：それでも言語は変わります。自動保存は、最後の変更から遅くとも 0.6 秒後にすでに済んでいます |
| 翻訳ファイルが見つからない（`i18n/en.js` または `i18n/ja.js`） | `ui.lang-missing`（WARN）：表示はフランス語のままです |

---

## 1.7 利用ガイドを開く

**目的**：エディターを離れずに助けを見つけます。

**手順**：右上の **❓** ボタン、**ファイル → 利用ガイド**、**F1** キー、または Ctrl+K で「ガイド」。ウィンドウ（公開、SEO、オンデバイスAI など）を開いているときは、F1 でその章が直接開きます。

**画面の表示**：ガイドは新しいタブで、表示言語（フランス語・英語・日本語）で開きます。上の検索欄（または「/」キー）で検索でき、言語の切り替えや章の移動もできます。**技術的な詳細**（ログ、コード）は隠れています。見たいときは「技術的な詳細を表示」にチェックを入れます。

| 状況 | ログ |
|---|---|
| ガイドを開いた | `ui.help`（INFO）：開いたページ、言語、開いていたウィンドウ |

---

## この章のコード
| コード | レベル | 意味 |
|---|---|---|
| `boot.fail` | ERROR | 起動に失敗した |
| `boot.invalid-save` | WARN | 保存したプロジェクトが読めず、代わりにサンプルを読み込んだ |
| `boot.ok` | INFO | エディターの準備完了（起動全体の所要時間） |
| `boot.project` | INFO | 起動時に選ばれたプロジェクト（`source`：saved、demo、fresh） |
| `boot.start` | INFO | 起動の開始 |
| `project.cancel` | INFO | プロジェクトの置き換えをキャンセルした |
| `project.demo` | INFO | サンプルを再読み込みした |
| `project.export-json` | INFO | プロジェクトを .json で保存した |
| `project.import.start`、`project.import.ok`、`project.import.fail` | INFO / INFO / ERROR | .json を開く |
| `project.import.invalid` | WARN | 検証でファイルが拒否された |
| `project.new` | INFO | 新しい空のサイト（名前、メイン言語、言語） |
| `project.new-lang` | DEBUG | 新しいサイトのウィンドウでメイン言語を選んだ |
| `project.preview` | INFO | 新しいタブでプレビュー |
| `storage.assets-missing` | WARN | ローカルデータベースに画像がない |
| `storage.blocked` | WARN | 別のタブがデータベースをブロックしている |
| `storage.load` | INFO | デバイスからプロジェクトを再読み込みした |
| `storage.load-empty` | INFO | 保存されたプロジェクトがない |
| `storage.load-fail` | ERROR | 保存したプロジェクトを読み込めない |
| `storage.open` | DEBUG | ローカルデータベースを開いた |
| `storage.open-fail` | ERROR | ローカルデータベースにアクセスできない |
| `storage.save` | DEBUG | プロジェクトをデバイスに保存した |
| `storage.save-fail` | ERROR | プロジェクトが保存されなかった |
| `storage.save-recovered` | INFO | 失敗の後、保存が回復した |
| `storage.unavailable` | ERROR | IndexedDB がない |
| `storage.upgrade` | INFO | ローカルデータベースを作成または更新した |
| `storage.version-change` | WARN | 別のタブがデータベースを更新している |
| `store.commit` | DEBUG | 変更が履歴に入った |
| `store.edit-target` | INFO | コンポーネント、ヘッダー、カードなどの編集、またはページに戻る |
| `store.hover` | TRACE | マウスオーバー |
| `store.invalid` | ERROR | 変更を無視：不正なサイト（バグ） |
| `store.load` | INFO | プロジェクトをエディターに読み込んだ |
| `store.multi` | DEBUG | 複数選択 |
| `store.readonly` | WARN | レビューモードのため変更を拒否した |
| `store.redo`、`store.redo-none` | INFO / DEBUG | やり直す |
| `store.remote` | DEBUG | ほかの参加者の変更を適用した |
| `store.select` | DEBUG | 選択 |
| `store.undo`、`store.undo-none` | INFO / DEBUG | 元に戻す |
| `store.view` | DEBUG | 表示中のページ、言語、デバイス |
| `ui.lang` | INFO | 表示言語の変更（再読み込み） |
| `ui.lang-missing` | WARN | 選んだ言語の翻訳が見つからない：表示はフランス語 |
| `ui.lang-ready` | DEBUG | 選んだ言語で表示の準備ができた |
| `ui.lang-save-fail` | WARN | 言語を変える直前にプロジェクトが保存されなかった |
| `ui.help` | INFO | 利用ガイドを開いた（❓ ボタン、ファイル、F1、Ctrl+K） |
