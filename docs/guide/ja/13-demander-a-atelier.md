# 13. Atelier に頼む

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

やりたいことを文章で書きます：「入会について 3 問の FAQ を追加して」「このページの見出しを赤にして中央揃えにして」「ヒーロー、テキストと画像、お問い合わせのある『私たちのラジオ』というページを作って」。オンデバイスAI（Gemini Nano、第 7 章）が、その依頼を **決められたリストから選んだ操作** に変換します。リストにあるのは、エディターがもともとできることだけです。Atelier は各操作を **確認** し、**プレビュー** を表示してから、すべてを **1 回の「元に戻す」で取り消せる単位** で適用します。コードは一切生成されません。リストにない操作は拒否され、その理由が説明されます。

**ログのドメイン**：`assist.*`（ウィンドウと適用）と `ai.plan.*`（モデルの呼び出し：`call`、`reply`、`rejected`、`actions`、`absent` など）。

**決められたリスト**
| 操作 | 内容 |
|---|---|
| セクションを追加 | テンプレート（ヒーロー、特長、数字、お客様の声、料金、FAQ、行動の呼びかけ、お問い合わせ、ギャラリー、ニュース、テキストと画像、動画）を、見出しとテキスト付きで、選択中のセクションの後ろかページの末尾に追加 |
| FAQ を追加 | 指定された質問と回答（最大 8 件）で FAQ セクションを追加 |
| 要素を追加 | 見出し、テキスト、ボタン、画像、スペース、区切り線、引用、アコーディオン、動画、地図、SNS、ボックス、数字、コンテンツカード |
| テキストを置き換え | 選択中の要素のテキスト |
| スタイルを設定 | 色、背景、配置、サイズ、太さ、大文字・小文字、内側の余白、角の丸み — 選択中の要素、セクション、ページ内のすべての見出し・テキスト・ボタンに対して |
| パレットの色を変更 | メイン、セカンダリ、テキスト、背景、控えめ、サーフェス（コントラストはプレビューで確認） |
| ページを作成 | セクション付きで作成し、そのページを開く |
| ページを開く、デバイスや言語を切り替える、ツールを開く | SEO、AI、公開、翻訳、バージョン、ログ、チェック、コメント、ロゴからパレット、レビューの概要 |

---

## 13.1 Ctrl+K から頼む

**手順**
1. 場所を選択します（たとえば見出しを選ぶと、新しいセクションはその見出しのセクションの後ろに入ります）。
2. **Ctrl+K** を押して依頼を入力します（3 語以上）。1 行目が「✨ Atelier に頼む：…」になるので、**Enter** を押します。
3. **「✨ 準備」**（または Ctrl+Enter）：プレビューに、操作、拒否、警告が一覧表示されます。
4. **「適用」**。Ctrl+Z で依頼全体を一度に元に戻せます。

**想定されるログ**（[`journaux/demander-faq.log`](../journaux/demander-faq.log)）
```log
14:33:02.142 +1.33s INFO  cmdk.run Commande : ✨ Demander à Atelier : « ajoute une faq sur l’adhésion » {"id":"ask:query","query":"ajoute une faq sur l’adhésion"}
14:33:02.143 +1.33s INFO  assist.open Demander à Atelier {"chars":29,"page":"p_npfmhg4o","selected":"n_451r6g4p6i","lang":"fr"}
…
14:33:02.191 +1.38s INFO  ai.plan.start [ai.plan#1] IA locale : préparer une demande (actions de la liste fermée) {"task":"plan","request":"ajoute une faq sur l’adhésion","inLen":29,"page":"p_npfmhg4o","selected":"n_451r6g4p6i","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:33:02.194 +1.38s DEBUG ai.plan.call [ai.plan#1 · 3 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"actions,summary","system":"2672 car.","inLen":310}
14:33:02.195 +1.38s DEBUG ai.plan.reply [ai.plan#1 · 4 ms] Réponse Prompt API (Gemini Nano) : 357 car. en 1 ms {"api":"prompt","ms":1,"outLen":357,"excerpt":"{\"summary\":\"J’ajoute une section de questions fréquentes su…"}
14:33:02.197 +1.39s INFO  ai.plan.actions [ai.plan#1 · 6 ms] 1 action valide : add_faq {"steps":["add_faq"],"summary":"J’ajoute une section de questions fréquentes sur l’adhésion."}
14:33:02.197 +1.39s INFO  ai.plan.ok [ai.plan#1 · 6 ms] Demande à Atelier : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"steps":1,"rejected":0,"warnings":0}
14:33:02.197 +1.39s INFO  assist.plan 1 action(s) prête(s), 0 refusée(s) {"request":"ajoute une faq sur l’adhésion","summary":"J’ajoute une section de questions fréquentes sur l’adhésion.","steps":["add_faq"],"rejected":0,"warnings":0}
14:33:02.386 +1.57s INFO  assist.apply.start [assist.apply#1] Application de 1 action(s) {"steps":["add_faq"]}
14:33:02.389 +1.58s INFO  assist.apply.step [assist.apply#1 · 3 ms] Ajouter des questions fréquentes « Adhérer au MAB » (3 questions) après la section « Fédération indépendante »
…
14:33:02.404 +1.59s INFO  assist.apply.ok [assist.apply#1 · 18 ms] 1 action(s) appliquée(s) (Ctrl+Z pour tout annuler) {"done":1,"errors":0,"aiTexts":7,"view":{},"ui":[],"changed":true}
…
14:33:02.470 +1.66s INFO  store.undo Annuler {"left":0,"redo":1}
```
確認ポイント：`ai.plan.call` は指示（`system`、カタログを含む）と依頼の大きさを示します。`ai.plan.actions` は採用された操作、`assist.apply.step` は適用した操作ごとに 1 行、`assist.apply.ok` は AI が書いたテキストの数（`aiTexts`、「要確認」として示されます）を示します。

**バリエーション — ページ全体への設定**（[`journaux/demander-style.log`](../journaux/demander-style.log)）
```log
14:33:02.996 +2.18s INFO  ai.plan.actions [ai.plan#2 · 1 ms] 2 actions valides : style, style {"steps":["style","style"],"summary":"Je mets les titres en rouge et je les centre."}
…
14:33:02.996 +2.18s INFO  assist.plan 2 action(s) prête(s), 0 refusée(s) {"request":"mets les titres de cette page en rouge et centrés","summary":"Je mets les titres en rouge et je les centre.","steps":["style","style"],"rejected":0,"warnings":0}
…
14:33:03.041 +2.23s INFO  assist.apply.step [assist.apply#2 · 7 ms] Couleur du texte : #dc2626 pour tous les titres de la page (7)
14:33:03.041 +2.23s INFO  assist.apply.step [assist.apply#2 · 7 ms] Alignement : center pour tous les titres de la page (7)
…
14:33:03.054 +2.24s INFO  assist.apply.ok [assist.apply#2 · 20 ms] 2 action(s) appliquée(s) (Ctrl+Z pour tout annuler) {"done":2,"errors":0,"aiTexts":0,"view":{},"ui":[],"changed":true}
```
「rouge」（赤）は `#dc2626` に、「centré」（中央揃え）は `center` になります。モデルは理解した内容を伝えるだけで、変換と確認はコードが行います（認識できない色や値は拒否されます）。

---

## 13.2 説明からページを作成する

**手順**：**「ページ」** パネル → **「✨ 説明からページ作成」**（または Ctrl+K）でページを説明し、**「✨ 準備」** → **「適用」**。ページがセクション、見出し、最初のテキスト付きで作成され、開きます。

**想定されるログ**（[`journaux/demander-page.log`](../journaux/demander-page.log)）
```log
14:33:03.402 +2.59s INFO  assist.open Demander à Atelier {"chars":23,"page":"p_npfmhg4o","selected":"n_451r6g4p6i","lang":"fr"}
…
14:33:03.472 +2.66s DEBUG ai.plan.call [ai.plan#3 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"actions,summary","system":"2672 car.","inLen":357}
…
14:33:03.473 +2.66s WARN  ai.plan.rejected [ai.plan#3 · 2 ms] Action refusée (add_page) : Modèle de section inconnu : carrousel-3d (section ignorée dans la page « Notre radio »). {"action":"add_page"}
14:33:03.473 +2.66s INFO  ai.plan.actions [ai.plan#3 · 2 ms] 2 actions valides : add_page, open_tool {"steps":["add_page","open_tool"],"summary":"Je crée la page « Notre radio » avec trois sections."}
…
14:33:03.473 +2.66s INFO  assist.plan 2 action(s) prête(s), 1 refusée(s) {"request":"Crée une page « Notre radio » avec un héros, un texte et image et le contact","summary":"Je crée la page « Notre radio » avec trois sections.","steps":["add_page","open_tool"],"rejected":1,"warnings":0}
14:33:03.473 +2.66s WARN  assist.rejected Action refusée (add_page) : Modèle de section inconnu : carrousel-3d (section ignorée dans la page « Notre radio »). {"action":"add_page"}
14:33:03.520 +2.71s INFO  assist.apply.start [assist.apply#3] Application de 2 action(s) {"steps":["add_page","open_tool"]}
14:33:03.524 +2.71s INFO  assist.apply.step [assist.apply#3 · 4 ms] Créer la page « Notre radio » avec « Héros », « Texte et image », « Contact »
14:33:03.524 +2.71s INFO  assist.apply.step [assist.apply#3 · 4 ms] Ouvrir « Référencement »
…
14:33:03.537 +2.73s DEBUG store.view Vue : pageId=p_t4t7f4p0 {"pageId":"p_t4t7f4p0"}
…
14:33:03.583 +2.77s INFO  assist.apply.ok [assist.apply#3 · 63 ms] 2 action(s) appliquée(s) (Ctrl+Z pour tout annuler) {"done":2,"errors":0,"aiTexts":3,"view":{"pageId":"p_t4t7f4p0"},"ui":["seo"],"changed":true}
```
この例では、モデルが存在しないセクションのテンプレート（`carrousel-3d`）も提案しました。それは拒否され、ページの残りの部分は作成されます。

**覚えておくこと**：モデルは事実（営業時間、住所、料金）を作り出しません。一般的な最初のテキストを書き、「要確認」として示します。内容は自分で補ってください。メニューをカスタマイズしている場合は、新しいページをメニューに加えるよう警告が表示されます。

---

## 13.3 拒否、何もすることがない、AI がない

（[`journaux/demander-refus-sans-ia.log`](../journaux/demander-refus-sans-ia.log)）
```log
14:33:04.239 +3.43s WARN  ai.plan.rejected [ai.plan#4 · 1 ms] Action refusée (delete_site) : Action inconnue : « delete_site » (hors de la liste fermée). {"action":"delete_site"}
14:33:04.240 +3.43s INFO  ai.plan.actions [ai.plan#4 · 2 ms] 0 action valide : aucune {"steps":[],"summary":"Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions."}
…
14:33:04.240 +3.43s INFO  assist.plan 0 action(s) prête(s), 1 refusée(s) {"request":"supprime tout le site maintenant","summary":"Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions.","steps":[],"rejected":1,"warnings":0}
14:33:04.240 +3.43s WARN  assist.rejected Action refusée (delete_site) : Action inconnue : « delete_site » (hors de la liste fermée). {"action":"delete_site"}
14:33:04.240 +3.43s INFO  assist.nothing Aucune action applicable pour cette demande {"summary":"Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions."}
…
14:33:04.270 +3.46s INFO  assist.cancel Demande fermée sans appliquer {"steps":0}
…
14:33:04.504 +3.69s WARN  ai.plan.absent [ai.plan#5 · 2 ms] IA absente : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"has":{"prompt":false,"multimodal":true,"summarizer":true,"translator":true},"need":"prompt"}
14:33:04.504 +3.69s INFO  ai.plan.cancel [ai.plan#5 · 2 ms] Tâche non lancée (aucun appel au modèle) {"task":"plan"}
…
14:33:04.505 +3.69s WARN  assist.plan-fail Demande non préparée (voir ai.plan) {"chars":27}
```

| 状況 | 画面の表示 | ログ | 対処 |
|---|---|---|---|
| リストにない依頼（「サイトを全部削除して」） | 「利用できる操作では何もできません…」、「適用」ボタンなし | `ai.plan.rejected`／`assist.rejected`（WARN）「Action inconnue」（不明な操作）、`assist.nothing` | 言い換えるか、Ctrl+K の検索を使ってください |
| 無効なパラメーター（不明な色、許可されていない設定、見つからないページ、不明なツール） | その操作が理由付きで「拒否」に表示される | `assist.rejected`（WARN） | 依頼をもっと具体的にしてください |
| 選択が必要な操作（「このテキストを置き換えて」「このセクション」）なのに何も選択していない | 「先に、… を選択してください。」 | `assist.rejected` | 選択してから、もう一度依頼してください |
| コンポーネント、ヘッダー、カードを編集中 | 「先にコンポーネント、ヘッダー、カードの編集を終えてから…」 | `assist.rejected` | 「完了」を押してから、もう一度依頼してください |
| 操作が 10 件を超える | 最初の 10 件だけが残る | `assist.warning`（WARN） | 依頼を分けてください |
| コントラストが足りないパレット | プレビューに警告 | `assist.warning` | 「サイト」パネルで確認してください |
| 適用せずにウィンドウを閉じた | 何も変わらない | `assist.cancel`（INFO） | — |
| オンデバイスAI を利用できない | 「準備できませんでした。」＋「✨ オンデバイスAI」ボタン | `ai.plan.absent`（WARN）、`assist.plan-fail`（WARN） | 第 7 章 |
| モデルの応答を読み取れない | 「オンデバイスAI の応答を読み取れません。もう一度お試しください。」 | `ai.plan.unreadable`、`ai.plan.fail`（ERROR）、`assist.plan-fail` | もう一度試してください |
| 適用中に操作が失敗した（異常なケース） | 「操作 N 件を適用しました」がエラー表示になる | `assist.apply.step-fail`（WARN）。ひとつも適用できなかった場合は `assist.apply.fail`（ERROR） | ログを送ってください |
| 依頼したツールが開かない | — | `assist.apply.tool-fail`（WARN） | 手で開いてください |

---

## この章のコード
| コード | レベル | 意味 |
|---|---|---|
| `ai.plan.start`、`ai.plan.ok`、`ai.plan.fail` | INFO / INFO / ERROR | 依頼を準備するためのモデル呼び出し |
| `ai.plan.actions` | INFO | 採用された有効な操作 |
| `ai.plan.rejected` | WARN | モデルが提案し、拒否された操作 |
| `assist.apply.start`、`assist.apply.step`、`assist.apply.ok`、`assist.apply.fail` | INFO / INFO / INFO / ERROR | 依頼の適用（1 回の「元に戻す」単位） |
| `assist.apply.step-fail` | WARN | 操作を適用できなかった |
| `assist.apply.tool-fail` | WARN | 依頼したツールが開かなかった |
| `assist.cancel` | INFO | 適用せずにウィンドウを閉じた |
| `assist.nothing` | INFO | 適用できる操作がない |
| `assist.open` | INFO | 「Atelier に頼む」ウィンドウを開いた |
| `assist.plan` | INFO | 依頼を準備した（操作、拒否、警告） |
| `assist.plan-fail` | WARN | 依頼を準備できなかった（AI がない、または失敗） |
| `assist.rejected` | WARN | 操作を拒否した（理由付き） |
| `assist.warning` | WARN | プレビューの警告（コントラスト、メニュー、操作の数） |
