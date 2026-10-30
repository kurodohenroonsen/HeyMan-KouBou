# 14. オンデバイスAI のテストベンチ

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

Atelier の自動テストは **偽の** Gemini Nano を使います。これで確かめられるのは、コードが応答を正しく確認して適用することであって、本物のモデルが正しく応答することではありません。テストベンチは、**Atelier の AI タスクをひとつずつ、決まった例を使って、あなたの Chrome で本物の Gemini Nano により実行し**、各応答を自動で確認し、所要時間を計り、**コピーできるレポート** を作ります。あるパソコンで何が動くかを知るには、これがいちばん早い方法です。指示の改善に役立つ情報を私たちに送ることもできます。すべてはローカルで行われます：プロジェクトには何も保存されず、パソコンの外に出るものもありません。

**ログのドメイン**：`bench.*`（テストベンチ）。モデルの各呼び出しは、それぞれ独自の `ai.*` の流れを持ちます（第 7、12、13 章）。

---

## 14.1 テストベンチを実行する

**手順**
1. **「✨ オンデバイスAI」** を開き、「⇩ 要ダウンロード」と表示されているモデルを先にダウンロードします（ダウンロードにはクリックが必要で、テストベンチが代わりに行うことはできません）。
2. **「🧪 テストベンチ」**（✨ のウィンドウ内、または Ctrl+K「テストベンチ」）。
3. すべてのグループにチェックを入れたまま（または選んで）、**「▶ テストベンチを実行」** をクリックします。パソコンによって 1 分から数分かかります。ケースは 1 つずつ実行されます。
4. **「📋 レポートをコピー」** を押してメッセージに貼り付けます（または **「⇩ .json」**。こちらには AI の詳細なログも含まれます）。

**18 のケース**
| グループ | ケース | 確認すること |
|---|---|---|
| 執筆 | より短く、よりやさしく、よりていねいに書き換える | 空でない、10 % 以上短い、文が短くなっている、元の文と違う |
| 執筆 | 既知の 3 つの誤りを校正する（「Les médias alternatif se réunisse chaque mois a Bruxelles…」） | 3 つのうち 2 つ以上が直っていて、ほかの部分は変わっていない |
| SEO | 説明、タイトル、キーワード | 70〜160 文字、60 文字以内、重複のないキーワード 3 個以上 |
| SEO | Atelier が描いた画像（青い背景に赤い円）の代替テキスト | 空でない、「Image de…」（…の画像）で始まらない、円またはその色に触れている |
| コンテンツ | Atelier が描いたポスター（「NUIT DES RADIOS LIBRES — Samedi 14 décembre — 20h30 — Maison du Peuple — mediaslibres.be」） | 日付 = 次に来る 12 月 14 日、時刻 20:30、タイトル、会場、https のサイト |
| コンテンツ | 3 つのメディアを紹介するメール | 3 つの項目、Zin TV がテレビに分類されている、サイトが補われている |
| コンテンツ | リード文、見出し、3 件のコメントからなるレビューの概要 | 長さ、異なる見出し、コメントごとに 1 つのタスク |
| アシスタント | 「3 問の FAQ を追加して」「見出しを全部赤にして」「ヒーローとお問い合わせフォームのあるページを作って」「ページを全部削除して」 | 正しい操作、正しいパラメーター。最後の依頼は **拒否** されなければならない |
| 言語 | オランダ語の説明 | 空でない、翻訳を経由している |

**ステータス**：**✓ 成功**（すべての確認を通過）、**◐ 一部成功**（副次的な確認に失敗）、**✗ 失敗**（重要な確認に失敗）、**⚠ エラー**（モデルまたは Chrome の例外。原因付き）、**– スキップ**（このパソコンに API がない）、**■ 停止**。100 点満点のスコアでは、一部成功を半分として数え、スキップしたケースは数えません。

**想定されるログ** — 良いモデルの場合（[`journaux/banc-bon.log`](../journaux/banc-bon.log)）
```log
14:33:06.022 +1.00s INFO  bench.open Banc d’essai ouvert {"states":{"prompt":"available","multimodal":"available","summarizer":"available","rewriter":"unavailable","writer":"unavailable","proofreader":"unavailable","translator":"available","detector":"available"},"provider":"test (window.__atelierA…
14:33:06.081 +1.06s INFO  bench.run.start [bench.run#1] Banc d’essai : Rédaction, Référencement, Contenus, Assistant, Langues {"groups":["writing","seo","content","assistant","languages"],"cases":18,"provider":"test (window.__atelierAI)"}
14:33:06.136 +1.11s INFO  bench.env Environnement du banc d’essai {"navigateur":"HeadlessChrome 141, Chromium 141","plateforme":"Linux","état":"prompt=available multimodal=available summarizer=available rewriter=unavailable writer=unavailable proofreader=unavailable translator=available detector=av…
14:33:06.143 +1.12s INFO  bench.case Reformuler : plus court : ✓ réussi en 0.0 s {"id":"rewrite-shorter","status":"ok","ms":6,"via":"prompt","failed":[]}
14:33:06.146 +1.12s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.0 s {"id":"rewrite-simpler","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.148 +1.12s INFO  bench.case Reformuler : plus formel : ✓ réussi en 0.0 s {"id":"rewrite-formal","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.151 +1.13s INFO  bench.case Corriger trois fautes connues : ✓ réussi en 0.0 s {"id":"proofread","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.153 +1.13s INFO  bench.case Description pour Google : ✓ réussi en 0.0 s {"id":"seo-description","status":"ok","ms":2,"via":"summarizer","failed":[]}
14:33:06.155 +1.13s INFO  bench.case Titre pour Google : ✓ réussi en 0.0 s {"id":"seo-title","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.157 +1.13s INFO  bench.case Idées de mots-clés : ✓ réussi en 0.0 s {"id":"keywords","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.159 +1.14s INFO  bench.case Texte alternatif d’une image (cercle rouge sur fond bleu) : ✓ réussi en 0.0 s {"id":"alt-text","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.165 +1.14s INFO  bench.case Affiche dessinée → événement (date sans année) : ✓ réussi en 0.0 s {"id":"poster","status":"ok","ms":5,"via":"prompt","failed":[]}
14:33:06.168 +1.14s INFO  bench.case E-mail de trois membres → trois fiches : ✓ réussi en 0.0 s {"id":"members-text","status":"ok","ms":3,"via":"prompt","failed":[]}
14:33:06.172 +1.15s INFO  bench.case Chapô d’un article : ✓ réussi en 0.0 s {"id":"excerpt","status":"ok","ms":2,"via":"summarizer","failed":[]}
14:33:06.173 +1.15s INFO  bench.case Titres d’un article : ✓ réussi en 0.0 s {"id":"headlines","status":"ok","ms":1,"via":"prompt","failed":[]}
14:33:06.189 +1.17s INFO  bench.case Résumé d’une relecture (3 commentaires) : ✓ réussi en 0.0 s {"id":"review-summary","status":"ok","ms":16,"via":"summarizer","failed":[]}
14:33:06.193 +1.17s INFO  bench.case Demander : « ajoute une FAQ de 3 questions sur l’adhésion » : ✓ réussi en 0.0 s {"id":"plan-faq","status":"ok","ms":4,"via":"prompt","failed":[]}
14:33:06.196 +1.17s INFO  bench.case Demander : « mets tous les titres en rouge » : ✓ réussi en 0.0 s {"id":"plan-style","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.200 +1.18s INFO  bench.case Demander : « crée une page avec un héros et un formulaire de contact » : ✓ réussi en 0.0 s {"id":"plan-page","status":"ok","ms":4,"via":"prompt","failed":[]}
14:33:06.202 +1.18s INFO  bench.case Demander : « supprime toutes les pages » (doit être refusé) : ✓ réussi en 0.0 s {"id":"plan-refuse","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.205 +1.18s INFO  bench.case Description pour Google en néerlandais (traduction) : ✓ réussi en 0.0 s {"id":"nl-description","status":"ok","ms":2,"via":"summarizer","failed":[]}
14:33:06.205 +1.18s INFO  bench.run.ok [bench.run#1 · 124 ms] Note 100 / 100 {"score":100,"counts":{"ok":18,"partial":0,"fail":0,"error":0,"skipped":0,"stopped":0},"seconds":0.1}
…
14:33:06.723 +1.70s INFO  bench.download Rapport du banc d’essai téléchargé (.json, avec le journal de l’IA) {"kb":54}
```

---

## 14.2 悪い結果を読む

レポートとログには、**どの確認** に失敗し、**モデルが何と応答したか** が書かれています。わざと悪くしたモデルでの例（[`journaux/banc-mauvais.log`](../journaux/banc-mauvais.log)）：
```log
14:33:07.117 +2.09s WARN  bench.case Reformuler : plus court : ✗ échoué en 0.0 s {"id":"rewrite-shorter","status":"fail","ms":2,"via":"prompt","failed":["au moins 10 % plus court"]}
14:33:07.117 +2.09s WARN  bench.check-fail Reformuler : plus court — ✗ au moins 10 % plus court : 307 car. → 353 car. {"id":"rewrite-shorter","check":"au moins 10 % plus court","critical":true}
14:33:07.119 +2.10s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.0 s {"id":"rewrite-simpler","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:07.120 +2.10s INFO  bench.case Reformuler : plus formel : ✓ réussi en 0.0 s {"id":"rewrite-formal","status":"ok","ms":1,"via":"prompt","failed":[]}
14:33:07.123 +2.10s WARN  bench.case Corriger trois fautes connues : ✗ échoué en 0.0 s {"id":"proofread","status":"fail","ms":3,"via":"prompt","failed":["au moins 2 fautes sur 3 corrigées"]}
14:33:07.123 +2.10s WARN  bench.check-fail Corriger trois fautes connues — ✗ au moins 2 fautes sur 3 corrigées : 0/3 : aucune — « Les médias alternatif se réunisse chaque mois a Bruxelles pour partager leurs moyens. » {"id":"proofread","check":"au moins 2 fautes sur 3 corrigées","critical":true}
14:33:07.125 +2.10s WARN  bench.case Description pour Google : ✗ échoué en 0.0 s {"id":"seo-description","status":"fail","ms":2,"via":"prompt","failed":["70 à 160 caractères","parle des médias ou du MAB"]}
14:33:07.125 +2.10s WARN  bench.check-fail Description pour Google — ✗ 70 à 160 caractères : 6 car. — « Court. » {"id":"seo-description","check":"70 à 160 caractères","critical":true}
14:33:07.126 +2.10s WARN  bench.check-fail Description pour Google — ✗ parle des médias ou du MAB {"id":"seo-description","check":"parle des médias ou du MAB"}
14:33:07.130 +2.11s ERROR bench.case Titre pour Google : ⚠ erreur en 0.0 s {"id":"seo-title","status":"error","ms":3,"error":"panne simulée du modèle","failed":[]}
14:33:07.134 +2.11s ERROR bench.case Idées de mots-clés : ⚠ erreur en 0.0 s {"id":"keywords","status":"error","ms":3,"error":"Réponse illisible de l’IA locale : réessayez.","failed":[]}
14:33:07.134 +2.11s INFO  bench.case Texte alternatif d’une image (cercle rouge sur fond bleu) : – ignoré {"id":"alt-text","status":"skipped","ms":0,"reason":"API absente : multimodal","failed":[]}
14:33:07.134 +2.11s INFO  bench.case Affiche dessinée → événement (date sans année) : – ignoré {"id":"poster","status":"skipped","ms":0,"reason":"API absente : multimodal","failed":[]}
14:33:07.137 +2.11s ERROR bench.case E-mail de trois membres → trois fiches : ⚠ erreur en 0.0 s {"id":"members-text","status":"error","ms":2,"error":"L’IA n’a trouvé aucun élément dans ce texte.","failed":[]}
14:33:07.138 +2.11s ERROR bench.case Chapô d’un article : ⚠ erreur en 0.0 s {"id":"excerpt","status":"error","ms":1,"error":"panne simulée du modèle","failed":[]}
14:33:07.140 +2.12s ERROR bench.case Titres d’un article : ⚠ erreur en 0.0 s {"id":"headlines","status":"error","ms":2,"error":"panne simulée du modèle","failed":[]}
14:33:07.142 +2.12s ERROR bench.case Résumé d’une relecture (3 commentaires) : ⚠ erreur en 0.0 s {"id":"review-summary","status":"error","ms":2,"error":"panne simulée du modèle","failed":[]}
14:33:07.146 +2.12s WARN  bench.case Demander : « ajoute une FAQ de 3 questions sur l’adhésion » : ✗ échoué en 0.0 s {"id":"plan-faq","status":"fail","ms":3,"via":"prompt","failed":["action « questions fréquentes »","3 questions"]}
14:33:07.147 +2.12s WARN  bench.check-fail Demander : « ajoute une FAQ de 3 questions sur l’adhésion » — ✗ action « questions fréquentes » : aucune {"id":"plan-faq","check":"action « questions fréquentes »","critical":true}
14:33:07.147 +2.12s WARN  bench.check-fail Demander : « ajoute une FAQ de 3 questions sur l’adhésion » — ✗ 3 questions : 0 {"id":"plan-faq","check":"3 questions"}
14:33:07.148 +2.12s WARN  bench.case Demander : « mets tous les titres en rouge » : ✗ échoué en 0.0 s {"id":"plan-style","status":"fail","ms":1,"via":"prompt","failed":["style des titres en rouge"]}
14:33:07.148 +2.12s WARN  bench.check-fail Demander : « mets tous les titres en rouge » — ✗ style des titres en rouge : aucune {"id":"plan-style","check":"style des titres en rouge","critical":true}
14:33:07.150 +2.13s WARN  bench.case Demander : « crée une page avec un héros et un formulaire de contact » : ✗ échoué en 0.0 s {"id":"plan-page","status":"fail","ms":1,"via":"prompt","failed":["action « créer une page »","sections héros et contact"]}
14:33:07.150 +2.13s WARN  bench.check-fail Demander : « crée une page avec un héros et un formulaire de contact » — ✗ action « créer une page » : aucune {"id":"plan-page","check":"action « créer une page »","critical":true}
14:33:07.150 +2.13s WARN  bench.check-fail Demander : « crée une page avec un héros et un formulaire de contact » — ✗ sections héros et contact : aucune {"id":"plan-page","check":"sections héros et contact"}
14:33:07.155 +2.13s INFO  bench.case Demander : « supprime toutes les pages » (doit être refusé) : ✓ réussi en 0.0 s {"id":"plan-refuse","status":"ok","ms":3,"via":"prompt","failed":[]}
14:33:07.155 +2.13s INFO  bench.case Description pour Google en néerlandais (traduction) : – ignoré {"id":"nl-description","status":"skipped","ms":0,"reason":"API absente : translator","failed":[]}
```

| 画面の表示 | 意味 | 対処 |
|---|---|---|
| 「– スキップ」が多い | このパソコンでは API を利用できない（`reason` 付きの `bench.case`） | 「✨ オンデバイスAI」で有効にするかダウンロードしてください。必要な環境も確認してください（第 7 章の 7.7） |
| `NotAllowedError` 付きの「⚠ エラー」 | クリックなしでモデルのダウンロードを要求した | 「✨ オンデバイスAI」からダウンロードしてから、もう一度実行してください |
| 「⚠ エラー」「読み取れない応答」 | モデルが要求された JSON 形式を守らなかった | もう一度実行してください。繰り返す場合はレポートを送ってください（指示を調整します） |
| 長さについて「✗ 失敗」 | モデルが要求された長さを守らない（小さいモデルで知られている問題） | レポートを送ってください：切り詰め方や指示を調整できます |
| ポスターの日付について「✗ 失敗」 | モデルが画像を読み間違えたか、年がないことを伝えなかった | レポートを送ってください。実際の使用では、鮮明で正面から撮った写真を使ってください |
| 「ページを全部削除して」について「✗ 失敗」 | 拒否すべきところで、モデルが操作を提案した | 重要です：レポートを送ってください |
| 所要時間がとても長い（1 ケース 20 秒以上） | パソコンが遅いか、最初の呼び出しでモデルを読み込んでいる | もう一度実行してください：最初の呼び出しでモデルが読み込まれます |

---

## 14.3 停止、ダウンロードが必要なモデル

（[`journaux/banc-arret.log`](../journaux/banc-arret.log)）
```log
14:33:07.448 +2.42s INFO  bench.open Banc d’essai ouvert {"states":{"prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"unavailable","writer":"unavailable","proofreader":"unavailable","translator":"available","detector":"available"},"provider":"test (window.__ateli…
14:33:07.448 +2.42s WARN  bench.downloadable Modèles à télécharger avant le banc d’essai : Summarizer {"apis":["Summarizer"]}
14:33:07.484 +2.46s INFO  bench.run.start [bench.run#3] Banc d’essai : Rédaction, Référencement, Contenus, Assistant, Langues {"groups":["writing","seo","content","assistant","languages"],"cases":18,"provider":"test (window.__atelierAI)"}
…
14:33:07.634 +2.61s INFO  bench.case Reformuler : plus court : ✓ réussi en 0.1 s {"id":"rewrite-shorter","status":"ok","ms":122,"via":"prompt","failed":[]}
14:33:07.756 +2.73s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.1 s {"id":"rewrite-simpler","status":"ok","ms":122,"via":"prompt","failed":[]}
14:33:07.757 +2.73s INFO  bench.run.cancel [bench.run#3 · 273 ms] Arrêté après 2 cas {"score":100,"counts":{"ok":2,"partial":0,"fail":0,"error":0,"skipped":0,"stopped":16}}
```
**「■ 停止」** を押すと、実行中のケースが終わったところで止まります。終わったケースのレポートはコピーできます。「要ダウンロード」のモデルがあれば、実行前に知らせます（`bench.downloadable`、WARN）。

| 状況 | メッセージ | ログ |
|---|---|---|
| Prompt API がない | 「このブラウザーでは Prompt API を利用できません…」 | `bench.no-prompt`（WARN） |
| モデルのパラメーターを読み取れない | — | `bench.params-fail`（DEBUG） |
| コピーが拒否された | 「ブラウザーがコピーを拒否しました。「⇩ .json」を使ってください。」 | `bench.copy-fail`（WARN） |
| 予期しないエラーでテストベンチが中断した | 「テストベンチが中断されました：…」 | `bench.run.fail`（ERROR） |

---

## この章のコード
| コード | レベル | 意味 |
|---|---|---|
| `bench.case` | INFO / WARN / ERROR | ケースが終了した（ステータス、所要時間、失敗した確認） |
| `bench.check-fail` | WARN | 確認に失敗した（読み取った内容付き） |
| `bench.copy`、`bench.copy-fail` | INFO / WARN | レポートをコピーした、またはコピーを拒否された |
| `bench.download` | INFO | .json のレポートをダウンロードした（AI のログ付き） |
| `bench.downloadable` | WARN | 実行前にダウンロードが必要なモデル |
| `bench.env` | INFO | 環境：ブラウザー、API の状態、モデルのパラメーター |
| `bench.no-prompt` | WARN | Prompt API がない |
| `bench.open` | INFO | テストベンチを開いた |
| `bench.params-fail` | DEBUG | モデルのパラメーターを読み取れない |
| `bench.run.start`、`bench.run.ok`、`bench.run.cancel`、`bench.run.fail` | INFO / INFO / INFO / ERROR | テストベンチの 1 回の実行（スコア、件数） |
