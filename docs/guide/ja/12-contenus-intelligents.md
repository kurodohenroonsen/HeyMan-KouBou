# 12. スマートコンテンツ

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

オンデバイスAI（Chrome の Gemini Nano。第 7 章を参照）が、サイトの **入力** を手伝います。撮影したポスターはイベントに、貼り付けたメールはメンバーの項目に、記事にはリード文と見出しの案が付き、レビューはタスクの一覧にまとめられます。ロゴからパレットを作る機能は AI を使いません。共通のルール：**必ず提案として示し**、黙って変更することはありません。AI が書いたものは **下書き** として作成されるか **「要確認」** として示され、Ctrl+Z で一度に元に戻せます。

**ログのドメイン**：`smart.*`（この章の操作、画面側）と、`ai.extract.*`、`ai.excerpt.*`、`ai.headlines.*`、`ai.review-summary.*`（モデルの呼び出し。第 7 章のほかの AI タスクと同じ段階：`call`、`reply`、`fallback`、`via-translation`、`cleaned`、`absent`、`refused`、`cancel` など）。

---

## 12.1 ポスターの写真からイベントを作成する

**目的**：ポスターやチラシを手で書き写す手間をなくします。

**手順**
1. **「コンテンツ」** → コレクション（たとえばイベント）→ **「✨ ポスターから」**。
2. **「📷 写真を選択」**（まっすぐ平らに撮った、読みやすい写真）→ **「✨ ポスターを読み取る」**。
3. プレビューを確認します：見つかった各フィールドと、オレンジ色で示される **除外された** 値とその理由。
4. **「下書きを 1 件作成」**。

**画面の表示**：新しい項目が **下書き** として作成され、コレクションのウィンドウで開きます。写真はその項目の画像になり、テキストは翻訳表で「要確認」になります。サイトに表示されるのは公開してから（ステータス「公開」）です。

**モデルではなくコードがすること**：モデルは読んだものを書き写すだけで、変換と確認は Atelier が行います。日付 `14/12/2026`、`14.12.26`、`samedi 14 décembre`、`14. Dezember`、`December 14` → `2026-12-14`。**ポスターに年が書かれていない** 場合は、これから来る直近の日付になります（年が書かれているかどうかはモデルが答えます。モデルが作り出した年は無視されます）。時刻 `14h`、`20 h 30`、`8 pm` → `14:00`、`20:30`、`20:00`。リンク `mediaslibres.be` → `https://mediaslibres.be`。選択肢（「Prévu」「Annulé」「Geannuleerd」など）→ リストの値。そのあと、手入力のときと同じ確認が行われます（`javascript:` のリンクは拒否、ありえない日付は拒否など）。

**想定されるログ**（[`journaux/intelligent-affiche.log`](../journaux/intelligent-affiche.log)）
```log
14:32:53.000 +4.22s INFO  smart.poster.start [smart.poster#1] Affiche → élément de « Agenda » {"collection":"col_jss2i0qv","kind":"events","imageField":"image"}
…
14:32:53.115 +4.34s INFO  image.import.ok [image.import#1 · 20 ms] Image prête : 240×320 px, 1 Ko (−25 %), 0 variante {"name":"affiche-festival.webp","mime":"image/webp","width":240,"height":320,"kbIn":1,"kbOut":1,"gain":25,"variants":[]}
14:32:53.120 +4.34s INFO  smart.poster.image [smart.poster#1 · 120 ms] Photo prête : 240×320 px, 1 Ko {"name":"affiche-festival.png","width":240,"height":320,"kb":1,"mime":"image/webp"}
14:32:53.169 +4.39s INFO  smart.poster.read [smart.poster#1 · 169 ms] Lecture de l’affiche par l’IA locale
…
14:32:53.171 +4.39s INFO  ai.extract.start [ai.extract#1] IA locale : lecture d’une affiche {"task":"extractItems","collection":"col_jss2i0qv","kind":"events","fields":11,"image":"image/webp (1 Ko)","today":"2026-10-29","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:32:53.173 +4.39s DEBUG ai.extract.call [ai.extract#1 · 2 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"title,date,date_year_shown,time,endDate,endDate_year_shown,endTime,place,address,description,status,link","images":1,"system":"864 car.","inLen":38}
14:32:53.173 +4.39s DEBUG ai.extract.reply [ai.extract#1 · 2 ms] Réponse Prompt API (Gemini Nano) : 353 car. en 1 ms {"api":"prompt","ms":1,"outLen":353,"excerpt":"{\"title\":\"Nuit des radios libres\",\"date\":\"samedi 14 décembr…"}
14:32:53.176 +4.40s WARN  ai.extract.dropped [ai.extract#1 · 5 ms] Élément 1 : « Date de fin (plusieurs jours) » écarté — Date impossible (jour et mois). {"item":1,"field":"endDate","raw":"31 février","reason":"Date impossible (jour et mois)."}
14:32:53.176 +4.40s INFO  ai.extract.ok [ai.extract#1 · 5 ms] Lecture d’une affiche ou d’un texte : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"items":1,"found":[9],"dropped":1,"duplicates":0}
14:32:53.177 +4.40s INFO  smart.poster.preview [smart.poster#1 · 177 ms] Aperçu : 1 élément, 1 coché(s) {"items":1,"checked":1,"duplicates":0,"dropped":1}
…
14:32:53.268 +4.49s INFO  smart.poster.ok [smart.poster#1 · 268 ms] 1 brouillon créé dans « Agenda » {"items":["it_voqbcp56"],"image":"img_bvn55mbt","skipped":0}
```
確認ポイント：`ai.extract.call` には要求したフィールドの一覧（`schema`）と `images` が含まれます。`ai.extract.dropped`（WARN）は、除外した値ごとに、フィールド、読み取った内容（`raw`）、理由を示します。`smart.poster.ok` は作成した項目と読み込んだ画像を示します。

**バリエーション**
| 状況 | 変化 | ログ |
|---|---|---|
| 読み取らずに、または作成せずにウィンドウを閉じた | 何も作成されない | `smart.poster.cancel`（INFO）「読み取らずに閉じました」または「下書きを作成せずに閉じました」 |
| 項目がすでにある（同じタイトル） | 「重複」バッジ、チェックが外れる | `ai.extract.duplicates`（INFO） |
| タイトルが読み取れなかった | 「タイトルなし」バッジ、チェックが外れる | `missingTitle` 付きの `ai.extract.ok` |
| サイトがオランダ語 | AI はフランス語で読み取り、多言語のテキストはデバイス上で翻訳される | `ai.extract.via-translation`、翻訳機能の `ai.extract.call` |
| 画像フィールドのないコレクション | 写真は読み取りにだけ使われる | `image` のない `smart.poster.ok` |

**エラー**（[`journaux/intelligent-affiche-erreurs.log`](../journaux/intelligent-affiche-erreurs.log)）
| 状況 | 表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| この Chrome の AI が画像を読めない（マルチモーダル Prompt API がない、またはダウンロードされていない） | 「このブラウザーのオンデバイスAI は、まだ画像を読み取れません（マルチモーダル Prompt API）。」 | `ai.extract.absent`（WARN）、`ai.extract.cancel`、`smart.poster.read-fail`（WARN） | 「✨ オンデバイスAI」で「Prompt API – 画像」をダウンロードしてください（第 7 章） |
| 写真を読み取れない、または対応していない形式 | 画像の読み込みのメッセージ | `smart.poster.image-fail`（WARN）、`image.import.fail` | 別の写真（JPG、PNG、WebP） |
| 写真から何も読み取れない | 「AI はこの画像から何も読み取れませんでした。正面から撮った、より鮮明な写真でお試しください。」 | `ai.extract.fail`（ERROR） | もっと鮮明な写真で、ポスター全体を枠に収めてください |
| モデルの応答が要求した形式になっていない | 「オンデバイスAI の応答を読み取れません。もう一度お試しください。」 | `ai.extract.unreadable`（WARN）、`ai.extract.fail` | もう一度試してください。繰り返す場合はログを送ってください |
| 作成できない（異常なケース） | エラーメッセージ | `smart.poster.fail`（ERROR） | ログを送ってください |

```log
14:32:53.627 +4.85s INFO  smart.poster.cancel [smart.poster#2 · 39 ms] Fermé sans lecture {"read":false}
…
14:32:53.758 +4.98s INFO  smart.poster.read [smart.poster#3 · 90 ms] Lecture de l’affiche par l’IA locale
…
14:32:53.759 +4.98s INFO  ai.extract.start [ai.extract#2] IA locale : lecture d’une affiche {"task":"extractItems","collection":"col_jss2i0qv","kind":"events","fields":11,"image":"image/webp (1 Ko)","today":"2026-10-29","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:32:53.759 +4.98s WARN  ai.extract.absent [ai.extract#2 · 0 ms] IA absente : L’IA locale de ce navigateur ne lit pas encore les images (Prompt API multimodale). {"has":{"prompt":true,"multimodal":false,"summarizer":true,"translator":true},"need":"multimodal"}
14:32:53.760 +4.98s INFO  ai.extract.cancel [ai.extract#2 · 1 ms] Tâche non lancée (aucun appel au modèle) {"task":"extractItems"}
…
14:32:53.760 +4.98s WARN  smart.poster.read-fail [smart.poster#3 · 92 ms] Lecture impossible : voir ai.extract
```

---

## 12.2 貼り付けたテキストから項目を作成する

**目的**：メール（「新しいメンバーを紹介します…」）、プログラム、一覧を、まとめて項目にします。

**手順**
1. コレクション →**「✨ テキストから」** でテキストを貼り付け、**「✨ テキストを読み取る」**。
2. 合わないもののチェックを外し（重複はすでに外れています）、**「下書きを N 件作成」**。

**想定されるログ**（[`journaux/intelligent-texte.log`](../journaux/intelligent-texte.log)）
```log
14:32:54.420 +5.64s INFO  smart.paste.start [smart.paste#1] Texte collé → éléments de « Médias membres » {"collection":"col_64zx0e3a","kind":"members"}
…
14:32:54.471 +5.69s WARN  smart.paste.empty [smart.paste#1 · 51 ms] Lecture demandée sans texte
14:32:54.519 +5.74s INFO  smart.paste.read [smart.paste#1 · 99 ms] Lecture du texte par l’IA locale (145 car.) {"chars":145}
…
14:32:54.519 +5.74s INFO  ai.extract.start [ai.extract#3] IA locale : lecture d’un texte collé {"task":"extractItems","collection":"col_64zx0e3a","kind":"members","fields":6,"inLen":145,"today":"2026-10-29","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:32:54.520 +5.74s DEBUG ai.extract.call [ai.extract#3 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"items","system":"644 car.","inLen":153}
…
14:32:54.520 +5.74s INFO  ai.extract.duplicates [ai.extract#3 · 1 ms] 1 doublon d’un élément existant ou d’une autre proposition {"items":[3]}
14:32:54.521 +5.74s INFO  ai.extract.ok [ai.extract#3 · 2 ms] Lecture d’une affiche ou d’un texte : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"items":3,"found":[5,5,4],"dropped":0,"duplicates":1}
14:32:54.521 +5.74s INFO  smart.paste.preview [smart.paste#1 · 101 ms] Aperçu : 3 éléments, 2 coché(s) {"items":3,"checked":2,"duplicates":1,"dropped":0}
…
14:32:54.579 +5.80s INFO  smart.paste.ok [smart.paste#1 · 159 ms] 2 brouillons créés dans « Médias membres » {"items":["it_m9ayiu82","it_m606udz7"],"skipped":1}
```
この例では、最初はテキストなしで読み取りを要求し（`smart.paste.empty`、WARN）、次に 3 人のメンバー（うち 1 人は重複）を含むテキストを読み取っています：下書き 2 件を作成し、1 件を除外しました（`skipped`）。

**バリエーションとエラー**
| 状況 | メッセージ | ログ | 対処 |
|---|---|---|---|
| テキストに 30 件を超える項目がある | 「… 件が上限を超過」 | `ai.extract.truncated`（WARN） | 残りは 2 回目に貼り付けてください |
| 項目がひとつも認識されない | 「AI はこのテキストから項目を見つけられませんでした。」 | `ai.extract.fail`（ERROR） | もっとはっきりしたテキストにし、1 段落に 1 項目にしてください |
| テキストが空 | 「先にテキストを貼り付けてください。」 | `smart.paste.empty`（WARN） | — |
| 作成せずに閉じた | — | `smart.paste.cancel` | — |
| 作成できない | エラーメッセージ | `smart.paste.fail`（ERROR） | ログを送ってください |

---

## 12.3 リード文と見出しを提案する

**目的**：記事の本文から、読みたくなる要約（リード文）と見出しの案を作ります。

**手順**：コレクション（ニュース）のウィンドウ → 記事 →「リード文」の下の **「✨ 提案」**（そのあと「置き換え」または「キャンセル」）。「タイトル」の下の **「✨ 見出し」**（見出しをクリックすると採用されます）。表示中の言語で作られます。オランダ語は翻訳を経由します。

**想定されるログ**（[`journaux/intelligent-chapo-titres.log`](../journaux/intelligent-chapo-titres.log)）
```log
14:32:55.269 +6.49s INFO  smart.excerpt.start [smart.excerpt#1] Chapô proposé pour « Le MAB ouvre son site » {"collection":"col_u8bu8jxp","item":"it_uy9as72a","field":"excerpt","from":"body","lang":"fr","chars":19}
…
14:32:55.270 +6.49s INFO  ai.excerpt.start [ai.excerpt#1] IA locale : chapô {"task":"excerpt","title":"Le MAB ouvre son site","inLen":19,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:32:55.270 +6.49s DEBUG ai.excerpt.call [ai.excerpt#1 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"teaser","length":"short","context":"113 car.","inLen":19}
…
14:32:55.271 +6.49s INFO  ai.excerpt.ok [ai.excerpt#1 · 1 ms] Chapô : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":1,"outLen":97,"excerpt":"Le MAB sillonne les maisons de quartier pour faire découvri…"}
14:32:55.271 +6.49s INFO  smart.excerpt.proposal [smart.excerpt#1 · 2 ms] Proposition : 97 car. {"chars":97,"via":"summarizer"}
…
14:32:55.327 +6.55s INFO  smart.excerpt.ok [smart.excerpt#1 · 58 ms] Chapô (résumé) remplacé (marqué « à relire », Ctrl+Z pour annuler) {"field":"excerpt","chars":97,"lang":"fr"}
14:32:55.453 +6.67s INFO  smart.headlines.start [smart.headlines#1] Titres proposés pour « Le MAB ouvre son site » {"collection":"col_u8bu8jxp","item":"it_uy9as72a","field":"title","lang":"fr","chars":19}
…
14:32:55.455 +6.68s DEBUG ai.headlines.call [ai.headlines#1 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"titles","system":"127 car.","inLen":66}
…
14:32:55.455 +6.68s DEBUG ai.headlines.cleaned [ai.headlines#1 · 1 ms] Titres : 3 proposés, 2 gardés (doublons, titre actuel, 3 au plus) {"got":3,"kept":2}
14:32:55.455 +6.68s INFO  ai.headlines.ok [ai.headlines#1 · 1 ms] Titres : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"titles":2,"sample":["Le MAB part en tournée dans les quartiers","Tournée des médias libres"]}
14:32:55.455 +6.68s INFO  smart.headlines.proposal [smart.headlines#1 · 2 ms] 2 titre(s) proposé(s) {"titles":["Le MAB part en tournée dans les quartiers","Tournée des médias libres"]}
…
14:32:55.506 +6.73s INFO  smart.headlines.ok [smart.headlines#1 · 53 ms] Titre remplacé (marqué « à relire », Ctrl+Z pour annuler) {"field":"title","chars":25,"lang":"fr"}
14:32:55.606 +6.83s INFO  store.undo Annuler {"left":6,"redo":1}
```
リード文は Chrome の **Summarizer**（種類 `teaser`、「読みたくなるように」）が作り、220 文字できれいに切りそろえます。見出しは Prompt API が作ります。重複と現在のタイトルは取り除かれます（`ai.headlines.cleaned`）。

**バリエーションとエラー**（[`journaux/intelligent-chapo-variantes.log`](../journaux/intelligent-chapo-variantes.log)）
| 状況 | メッセージ | ログ | 対処 |
|---|---|---|---|
| Summarizer がない | Prompt API で同じ結果 | `ai.excerpt.fallback`（WARN） | — |
| 提案を破棄した | — | `smart.excerpt.cancel`／`smart.headlines.cancel`「提案を破棄しました」 | — |
| 記事の本文が空 | 「先に「テキスト」を書いてください。」 | `smart.excerpt.cancel`「「…」が空です：要約するものがありません」 | 先に本文を書いてください |
| AI が失敗した | AI のメッセージ | `ai.excerpt.fail`／`ai.headlines.fail`、続いて `smart.excerpt.fail`／`smart.headlines.fail`（ERROR） | 第 7 章を参照 |

```log
14:32:55.938 +7.16s INFO  smart.excerpt.start [smart.excerpt#2] Chapô proposé pour « Le MAB ouvre son site » {"collection":"col_u8bu8jxp","item":"it_uy9as72a","field":"excerpt","from":"body","lang":"fr","chars":19}
…
14:32:55.939 +7.16s WARN  ai.excerpt.fallback [ai.excerpt#2 · 0 ms] Summarizer non disponible : repli sur la Prompt API (schéma JSON) {"wanted":"summarizer","has":false}
…
14:32:55.940 +7.16s INFO  ai.excerpt.ok [ai.excerpt#2 · 1 ms] Chapô : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"outLen":42,"excerpt":"Une tournée pour rencontrer les habitants."}
14:32:55.940 +7.16s INFO  smart.excerpt.proposal [smart.excerpt#2 · 2 ms] Proposition : 42 car. {"chars":42,"via":"prompt"}
14:32:56.004 +7.22s INFO  smart.excerpt.cancel [smart.excerpt#2 · 66 ms] Proposition écartée
…
14:32:56.401 +7.62s INFO  smart.excerpt.start [smart.excerpt#3] Chapô proposé pour « Nouvel élément » {"collection":"col_u8bu8jxp","item":"it_8iuzzwbz","field":"excerpt","from":"body","lang":"fr","chars":0}
14:32:56.401 +7.62s INFO  smart.excerpt.cancel [smart.excerpt#3 · 0 ms] « Texte » est vide : rien à résumer
```

---

## 12.4 レビューを要約する

**目的**：レビューの進み具合を把握し、やることの一覧を送ります。

**手順**：💬 → **📋**（パネルの上部）、または Ctrl+K「レビューの概要」。**「✨ 要点とタスク」** を押すと、要約と、未解決のコメントごとのタスクが「移動」付きで追加されます。**「📋 コピー」** で、メール用にすべてをプレーンテキストで取得できます。

**画面の表示**：AI なしでも常に表示されます：「未解決のコメント 2 件（解決済み 0 件）、ページ別：「ホーム」に 2 件、作成者別：Laurent：2、最も古い未対応…」。AI を使うと、要点とタスクが加わります。何も変更されません。

**想定されるログ**（[`journaux/intelligent-relecture.log`](../journaux/intelligent-relecture.log)）
```log
14:32:58.219 +9.44s INFO  smart.review.open Résumé de la relecture : 2 commentaires ouverts (0 résolu) ; par page : 2 sur « Accueil » ; par auteur : Laurent : 2 ; le plus ancien en attente : Laurent, 2026-10-29, « Le titre est trop long. ». {"total":2,"open":2,"resolved":0,"pages":1,"authors":1}
…
14:32:58.274 +9.49s INFO  ai.review-summary.start [ai.review-summary#1] IA locale : résumé de la relecture {"task":"reviewSummary","comments":2,"open":2,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:32:58.274 +9.49s DEBUG ai.review-summary.call [ai.review-summary#1 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"key-points","length":"short","context":"68 car.","inLen":187}
…
14:32:58.275 +9.50s DEBUG ai.review-summary.call [ai.review-summary#1 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"tasks","system":"130 car.","inLen":90}
…
14:32:58.276 +9.50s INFO  ai.review-summary.ok [ai.review-summary#1 · 2 ms] Résumé de la relecture : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":2,"points":2,"tasks":2,"aiTasks":1,"open":2}
14:32:58.276 +9.50s INFO  smart.review.points 2 points clés, 2 tâches {"points":2,"tasks":2,"via":"summarizer"}
14:32:58.362 +9.58s WARN  smart.review.copy-fail Copie refusée par le navigateur {"error":{"name":"NotAllowedError","message":"Failed to execute 'writeText' on 'Clipboard': Write permission denied.","code":0,"stack":"NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Write permission de…
…
14:32:58.387 +9.61s INFO  smart.review.go Aller au commentaire {"id":"cm_7le1FtDy_b3Q","page":"p_6j1yly5n"}
14:32:58.391 +9.61s DEBUG review.goto Aller à l’élément commenté {"id":"cm_7le1FtDy_b3Q","page":"p_6j1yly5n","node":"n_2c1x2c4012","found":true}
```
呼び出しは 2 回です：要点には Summarizer（`key-points`）、タスクには Prompt API を使います。モデルが返さなかったタスクは、コメントの本文で代用されます（画面では「（コメント本文）」、`ai.review-summary.ok` では `aiTasks` が `tasks` より小さくなります）。

**バリエーションとエラー**
| 状況 | メッセージ | ログ |
|---|---|---|
| 未解決のコメントがない | ✨ ボタンが無効、「未解決のコメントはありません。」 | `smart.review.open` `{"open":0}` |
| ブラウザーがコピーを許可した／拒否した | 「概要をコピーしました。」／「ブラウザーがコピーを拒否しました。」 | `smart.review.copy`（INFO）／`smart.review.copy-fail`（WARN） |
| その間にコメントが削除された | 何も起きない | `review.goto-missing`（WARN） |
| AI を利用できない | AI のメッセージ。AI なしの概要は残る | `ai.review-summary.absent` または `ai.review-summary.fail` |

---

## 12.5 ロゴからパレット（AI なし）

**目的**：ロゴから、**すべて読みやすい**（WCAG AA）サイト用の 6 色を取り出します。

**手順**：**「サイト」** パネル →「パレット」→ **「🎨 ロゴからパレット」**（ヘッダーのロゴ、または選んだ画像）→ 色、補正、7 つのコントラストを確認 → **「パレットを適用」**（Ctrl+Z で以前のパレットに戻せます）。

**しくみ**：ロゴの不透明なピクセルを、主要な色にまとめます。白い文字が読める最も鮮やかな色が **メイン**、十分に違う 2 番目の色合いが **セカンダリ** になり、テキスト、背景、控えめの色はそこから導き出します。そのあと、7 つの組み合わせ（背景上のテキスト、リンク、メインボタン、セカンダリボタン、暗い背景上の明るいテキストなど）がすべて 4.5:1 を満たすまで明るさを補正します。補正はそれぞれ表示されます（「メイン（ボタンの白い文字と背景上のリンクのために暗く調整）：#f2353f → #e00e1a」）。

**想定されるログ**（[`journaux/intelligent-palette.log`](../journaux/intelligent-palette.log)）
```log
14:32:59.303 +10.52s INFO  smart.palette.start [smart.palette#1] Palette depuis le logo {"logo":"aucun"}
…
14:32:59.314 +10.54s INFO  smart.palette.no-logo [smart.palette#1 · 11 ms] Pas de logo importé : choisir une image
14:32:59.372 +10.59s DEBUG smart.palette.file [smart.palette#1 · 69 ms] Image choisie : logo-mab.png {"type":"image/png","kb":0}
14:32:59.386 +10.61s DEBUG smart.palette.pixels [smart.palette#1 · 83 ms] Logo lu : 120×60 px (analysé en 120×60) {"natural":"120×60","sample":"120×60"}
14:32:59.390 +10.61s INFO  smart.palette.colors [smart.palette#1 · 87 ms] 2 couleur(s) dominante(s) {"colors":["#ffd400 51 %","#f2353f 49 %"]}
14:32:59.391 +10.61s INFO  smart.palette.proposal [smart.palette#1 · 88 ms] Proposition : #e00e1a #ffd400 #231516 #fbf7f7 #725a5b #ffffff · 1 correction de contraste {"palette":{"c1":"#e00e1a","c2":"#ffd400","c3":"#231516","c4":"#fbf7f7","c5":"#725a5b","c6":"#ffffff"},"roles":{"c1":"du logo","c2":"…
…
14:32:59.612 +10.83s INFO  smart.palette.ok [smart.palette#1 · 309 ms] Palette appliquée (Ctrl+Z pour revenir à l’ancienne) {"palette":{"c1":"#e00e1a","c2":"#ffd400","c3":"#231516","c4":"#fbf7f7","c5":"#725a5b","c6":"#ffffff"},"changes":1}
…
14:32:59.738 +10.96s INFO  store.undo Annuler {"left":9,"redo":1}
```

**バリエーションとエラー**（[`journaux/intelligent-palette-variantes.log`](../journaux/intelligent-palette-variantes.log)）
| 状況 | メッセージ | ログ | 対処 |
|---|---|---|---|
| ロゴをヘッダーに読み込んである | そのまま読み取られる | `smart.palette.start` `{"logo":"importé"}`、続いて `smart.palette.pixels` | — |
| 鮮やかな色のないロゴ（黒、グレー） | 「ロゴに鮮やかな色がありません：サイトのメインカラーを保ち…」 | `smart.palette.no-vivid`（WARN） | 必要ならメインの色を手で選んでください |
| 適用せずに閉じた | — | `smart.palette.cancel` | — |
| 透明なロゴ、読み取れない画像 | 「ロゴを読み取れません：…」 | `smart.palette.fail`（ERROR） | 別の画像 |
| 読み取りを許可していないサイトにあるオンラインのロゴ（https のアドレス） | 「このオンラインのロゴは読み取れません…：画像をプロジェクトに読み込んでください。」 | CORS の `hint` 付きの `smart.palette.fail` | ロゴを読み込んでください |

```log
14:33:00.074 +11.29s INFO  smart.palette.colors [smart.palette#2 · 42 ms] 1 couleur(s) dominante(s) {"colors":["#222222 100 %"]}
14:33:00.074 +11.29s WARN  smart.palette.no-vivid [smart.palette#2 · 42 ms] Le logo n’a pas de couleur vive : la couleur principale du site est gardée, le reste en découle. {"colors":["#222222"]}
14:33:00.075 +11.30s INFO  smart.palette.proposal [smart.palette#2 · 43 ms] Proposition : #c8181d #f0be7f #231515 #fbf7f7 #725a5a #ffffff {"palette":{"c1":"#c8181d","c2":"#f0be7f","c3":"#231515","c4":"#fbf7f7","c5":"#725a5a","c6":"#ffffff"},"roles":{"c1":"gardée","c2":"dérivée de la principale","c3…
…
14:33:00.099 +11.32s INFO  smart.palette.cancel [smart.palette#2 · 67 ms] Fermé sans appliquer
…
14:33:00.164 +11.38s INFO  smart.palette.colors [smart.palette#3 · 29 ms] 0 couleur(s) dominante(s) {"colors":[]}
14:33:00.164 +11.38s ERROR smart.palette.fail [smart.palette#3 · 29 ms] Logo illisible : Logo entièrement transparent : aucune couleur à lire. {"error":{"name":"Error","message":"Logo entièrement transparent : aucune couleur à lire.","stack":"Error: Logo entièrement transparent : aucune couleur à l…
```

---

## この章のコード
| コード | レベル | 意味 |
|---|---|---|
| `ai.excerpt.start`、`ai.excerpt.ok`、`ai.excerpt.fail` | INFO / INFO / ERROR | リード文のためのモデル呼び出し |
| `ai.extract.start`、`ai.extract.ok`、`ai.extract.fail` | INFO / INFO / ERROR | ポスターまたはテキストの読み取り |
| `ai.extract.dropped` | WARN | 読み取った値を除外した（フィールド、値、理由） |
| `ai.extract.duplicates` | INFO | 既存または提案中の項目との重複 |
| `ai.extract.truncated` | WARN | 上限を超えた項目 |
| `ai.headlines.start`、`ai.headlines.ok`、`ai.headlines.fail` | INFO / INFO / ERROR | 見出しの提案 |
| `ai.review-summary.start`、`ai.review-summary.ok`、`ai.review-summary.fail` | INFO / INFO / ERROR | レビューの要点とタスク |
| `review.goto-missing` | WARN | 概要から移動しようとしたコメントが見つからない |
| `smart.excerpt.start`、`smart.excerpt.proposal`、`smart.excerpt.ok`、`smart.excerpt.cancel`、`smart.excerpt.fail` | INFO… / ERROR | 項目のフォームでのリード文 |
| `smart.headlines.start`、`smart.headlines.proposal`、`smart.headlines.ok`、`smart.headlines.cancel`、`smart.headlines.fail` | INFO… / ERROR | 項目のフォームでの見出し |
| `smart.palette.start`、`smart.palette.no-logo`、`smart.palette.file`、`smart.palette.pixels`、`smart.palette.colors`、`smart.palette.no-vivid`、`smart.palette.proposal`、`smart.palette.ok`、`smart.palette.cancel`、`smart.palette.fail` | INFO、DEBUG、WARN、ERROR | ロゴからパレット |
| `smart.paste.start`、`smart.paste.empty`、`smart.paste.read`、`smart.paste.read-fail`、`smart.paste.preview`、`smart.paste.ok`、`smart.paste.cancel`、`smart.paste.fail` | INFO、WARN、ERROR | 貼り付けたテキスト → 項目 |
| `smart.poster.start`、`smart.poster.image`、`smart.poster.image-fail`、`smart.poster.read`、`smart.poster.read-fail`、`smart.poster.preview`、`smart.poster.ok`、`smart.poster.cancel`、`smart.poster.fail` | INFO、WARN、ERROR | ポスター → 項目 |
| `smart.review.copy`、`smart.review.copy-fail` | INFO / WARN | 概要をコピーした、またはコピーを拒否された |
| `smart.review.go` | INFO | タスクのコメントへ移動 |
| `smart.review.open` | INFO | レビューの概要を開いた（件数） |
| `smart.review.points` | INFO | 要点とタスクを表示した |
