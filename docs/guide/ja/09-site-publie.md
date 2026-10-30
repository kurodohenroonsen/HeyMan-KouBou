# 9. 公開サイト

*以下のログ抜粋はフランス語で記録したものです。コードとレベルはどの言語でも同じです（実際のログのメッセージは表示言語で出ます）。*

公開サイトは、静的な HTML ページ、スタイルシート 1 つ、そしてページに必要な場合だけ小さなスクリプト `site.js` でできています。`site.js` が担当するのは、モバイルメニュー、お問い合わせフォーム、イベントの「今後の予定」リスト、ギャラリー、クリックして読み込む動画と地図です。お問い合わせフォームの内容は、publish.php がメールで転送します。

**ログのドメイン**：`site.*`（訪問者のブラウザーのコンソール。初期状態では何も出しません）、`php.contact.*`（フォーム。サーバー側で、サーバーのログに記録されます）。

---

## 9.1 サイトのログをオンにする

**目的**：訪問者（あなた自身）のブラウザーで、サイトが何をしているかを見ること。

**手順**
1. ページのアドレスの末尾に `?atelier-debug` を付けます：`https://www.média-alternatif.be/?atelier-debug`。この設定はこのデバイスに保存され、サイトのすべてのページに効きます。
2. コンソール（F12）で `[Atelier site]` で絞り込みます。
3. オフにするには `?atelier-debug=0` を付けます。

**画面の表示**：画面は何も変わりません。コンソールに、出来事ごとに 1 行ずつ表示されます。

**想定されるログ**（実際の抜粋。スマートフォンのブラウザーを模擬：[`journaux/site-publie-console.log`](../journaux/site-publie-console.log)）
```log
[Atelier site] site.boot Page chargée {"page":"/","lang":"fr","forms":0,"lists":0}
[Atelier site] site.nav Menu mobile ouvert
[Atelier site] site.boot Page chargée {"page":"/contact/","lang":"fr","forms":1,"lists":0}
[Atelier site] site.form.submit Envoi du formulaire {"action":"http://127.0.0.1:9496/publish.php","fields":3}
[Atelier site] site.form.ok Message envoyé {"status":200,"req":"432cac3c"}
```
`site.boot` は、そのページに publish.php とつながったフォームがいくつあるか（`forms`）、日付付きのリストがいくつあるか（`lists`）を示します。

モバイルメニュー、フォーム、日付付きリスト、ギャラリー、動画、地図のどれもないページにはスクリプトがありません。何も表示されないのは正常です。

---

## 9.2 お問い合わせフォームからメッセージを送る

**目的**：訪問者がメディアにメッセージを書くと、エディターで指定したメールアドレスに届きます（このアドレスはページには表示されません）。

**手順（訪問者）**：フォームに入力して「送信」を押します。

**画面の表示**：送信中はボタンが押せなくなり、その後エディターで設定した確認メッセージが表示されて、フォームが空になります。

**想定されるログ**
- 訪問者のコンソール（`?atelier-debug` 付き）：`site.form.submit`（入力されたフィールドの数。内容は記録しません）、続いて `site.form.ok` と `req`（サーバー側のリクエストの参照番号）。
- サーバーのログ（🐞 → サーバーのログ、第 0 章。実際の抜粋：[`journaux/php-journal-contact.log`](../journaux/php-journal-contact.log)）：
```log
2026-10-29T03:39:49.400Z INFO  php.contact.sent [req 8e07b221 · 0.6 ms] E-mail remis au serveur d’envoi de l’hébergement {"form":"n_5s081k324w","to":"re…@media-alternatif.be","from":"noreply@127.0.0.1","fields":3,"reply_to":true}
2026-10-29T03:39:49.400Z INFO  php.req.end [req 8e07b221 · 0.6 ms] Réponse 200 (contact) {"status":200,"route":"contact","mem_kb":365}
```
publish.php で `LOG_LEVEL = 'debug'` にしている場合は、その前に `php.contact.start`（DEBUG）の行が出ます：フォーム、省略した宛先、フィールドの数。

「E-mail remis au serveur d'envoi」（メールを送信サーバーに渡しました）は、PHP がメッセージを受け付けた（`mail()` が成功を返した）という意味です。メールが届かないときは、まず迷惑メールフォルダーを確認し、次に差出人アドレス `from` を確認してください。OVH では、差出人はサイトのドメインのアドレス（`noreply@あなたのドメイン`）でなければなりません。サイトを本来のドメイン名で開いていれば、そうなっています。

**バリエーション**
| 状況 | 変わること | ログ |
|---|---|---|
| JavaScript なし（古いブラウザー、スクリプトがブロックされている） | ページが再読み込みされ、確認メッセージが表示される | サーバー：`php.contact.sent`、続いて `php.req.end` 303。コンソール（ログがオンの場合）：`site.form.ok`「Retour du formulaire sans JavaScript : ok」（JavaScript なしのフォームからの戻り：成功） |
| 訪問者が自分のメールアドレスを入力した | 受け取ったメールの「返信先」が訪問者になる | `"reply_to":true` |
| ロボット（隠しフィールド「website」が入力されている） | ロボットには「Merci.」（ありがとうございます）と表示され、メールは送られない | サーバー：`php.contact.bot`（INFO） |

**エラー**
| 状況 | 訪問者に表示されるメッセージ | ログ | 対処 |
|---|---|---|---|
| サーバーが知らないフォーム（アドレスを設定する前にサイトを公開した、または最新の publish.php なしで .zip や GitHub から公開した） | 「Formulaire inconnu.」（不明なフォームです） | コンソール：`site.form.fail`「Refusé par publish.php : Formulaire inconnu.」（publish.php が拒否：不明なフォーム）。サーバー：`php.contact.unknown`（WARN）。`known` は登録済みのフォームの数 | エディターから publish.php で公開し直してください（フォームの宛先アドレスを登録するのは公開の処理です） |
| メッセージが空 | 「Le message est vide.」（メッセージが空です） | サーバー：`php.contact.empty`（INFO） | — |
| 同じアドレスから 1 時間に 5 通を超えて送信 | 「Trop de messages envoyés. Réessayez dans une heure.」（送信数が多すぎます。1 時間後にもう一度お試しください） | サーバー：`php.contact.rate`（WARN）。識別用の値 `who` 付き | 正常です（悪用を防ぐ仕組み） |
| ホスティングが送信を拒否 | 「L’envoi a échoué. Réessayez plus tard.」（送信に失敗しました。後でもう一度お試しください） | サーバー：`php.contact.mail-fail`（ERROR）。`to` と `from` 付き | ホスティングのお客様ページで、メール送信が有効になっているか確認してください。`from` も確認してください |
| publish.php がない、または PHP が動いていない | 「Le message n’a pas pu être envoyé」（エディターで設定したテキスト） | コンソール：`site.form.fail`「Réponse illisible (publish.php absent ?)」（読み取れない応答：publish.php がない？）または「Réseau injoignable : …」（ネットワークに接続できません：…） | publish.php がルートにあるか確認してください（第 8 章、接続テスト） |

不明なフォームを、サーバー側から見た実際の抜粋（[`journaux/php-contact-inconnu.log`](../journaux/php-contact-inconnu.log)）：
```log
2026-10-29T03:38:13.745Z DEBUG php.req.start [req 64807b5b · 0 ms] POST reçu {"method":"POST","who":"e184e45609","bytes":23,"ua":"node","origin":""}
2026-10-29T03:38:13.745Z WARN  php.contact.unknown [req 64807b5b · 0.2 ms] Formulaire inconnu (republiez le site depuis l’éditeur) {"form":"inconnu","known":0}
2026-10-29T03:38:13.745Z WARN  php.req.end [req 64807b5b · 0.3 ms] Réponse 404 (contact) {"status":404,"route":"contact","mem_kb":365}
```

---

## 9.3 サイトのそのほかの動作

| 訪問者の操作 | ログ（コンソール、`?atelier-debug` 付き） |
|---|---|
| スマートフォンでメニュー（☰）を開く・閉じる | `site.nav`「Menu mobile ouvert」（モバイルメニューを開きました）／「fermé」（閉じました） |
| イベントの「今後の予定」または「過去の予定」リストがあるページを開く | `site.list`「Liste filtrée par date」（日付で絞り込んだリスト）`{"when":"upcoming","today":"2026-10-29","shown":3,"total":5,"limit":0}` — `shown` は、**訪問者のデバイスの**日付をもとに表示されたイベントの数 |
| 拡大表示できるギャラリーの画像をクリックする | `site.gallery`「Image agrandie」（画像を拡大しました） |
| 動画や地図をクリックする（プライバシーのため、クリックしたときだけ読み込まれる） | `site.facade`「Contenu externe chargé après clic」（クリック後に外部コンテンツを読み込みました）。パラメーターを除いたアドレス付き |
| ページで JavaScript のエラーが起きる | `site.fail`「Erreur JavaScript : …」（JavaScript エラー：…）。ファイルと行番号付き（警告として表示） |

今後のイベントがあるのに「今後の予定」リストが空のときは、`today` とイベントの日付を比べてください。基準になるのはサーバーではなく、デバイスの日付です。

---

## 9.4 サーバーと共同編集

publish.php は、共同編集のセッション（第 10 章）を始めるための暗号化されたメッセージボックスとしても使われます。publish.php はメッセージの中身を読めません。記録される行は次のとおりです。

| コード（サーバー） | レベル | 意味 |
|---|---|---|
| `php.signal.post` | DEBUG | 暗号化されたメッセージを置いた（8 文字に省略したルーム、送信者、受信者、サイズ） |
| `php.signal.get` | DEBUG | 参加者がメッセージを取りに来た（接続中は 1 秒に 1 回） |
| `php.signal.expired` | DEBUG | 15 分間使われなかったルームを消去した |
| `php.signal.invalid` | WARN | メッセージを拒否：ルーム、参加者、またはデータが無効 |
| `php.signal.too-big` | WARN | 64 KB を超えるメッセージを拒否 |
| `php.signal.full` | WARN | 同時に開いているルームが 100 を超えた |

これらの行は DEBUG なので、サーバーのログに出るのは `LOG_LEVEL` が `'debug'` のときだけです。ただし、ブラウザーのログにはトレースとともに必ず届きます（メッセージの取得は TRACE）。

---

## この章のコード
| コード | レベル | 意味 |
|---|---|---|
| `php.contact.bot` | INFO | （サーバー）ロボットを検出、何も送らない |
| `php.contact.empty` | INFO | （サーバー）空のメッセージを拒否 |
| `php.contact.mail-fail` | ERROR | （サーバー）ホスティングが送信を拒否 |
| `php.contact.rate` | WARN | （サーバー）同じアドレスからのメッセージが多すぎる |
| `php.contact.sent` | INFO | （サーバー）メールを送信サーバーに渡した |
| `php.contact.start` | DEBUG | （サーバー）お問い合わせメッセージを受信 |
| `php.contact.unknown` | WARN | （サーバー）不明なフォーム |
| `php.signal.expired` | DEBUG | （サーバー）ルームを消去 |
| `php.signal.full` | WARN | （サーバー）ルームが多すぎる |
| `php.signal.get` | DEBUG | （サーバー）メッセージの取得 |
| `php.signal.invalid` | WARN | （サーバー）シグナリングのメッセージを拒否 |
| `php.signal.post` | DEBUG | （サーバー）メッセージを置いた |
| `php.signal.too-big` | WARN | （サーバー）メッセージが大きすぎる |
| `site.boot` | INFO | ページを読み込んだ |
| `site.facade` | INFO | クリック後に動画または地図を読み込んだ |
| `site.fail` | WARN | サイトで JavaScript のエラー |
| `site.form.fail` | WARN | フォームの送信に失敗 |
| `site.form.ok` | INFO | メッセージを送信した |
| `site.form.submit` | INFO | フォームの送信 |
| `site.gallery` | INFO | 画像を拡大した |
| `site.list` | INFO | イベントのリストを日付で絞り込んだ |
| `site.nav` | INFO | モバイルメニューを開いた・閉じた |
