# Glossaire FR → EN → JA de l’interface (cycle 22)

Référence commune pour les traductions de l’interface, du journal et du guide. Les termes de l’interface traduits ici doivent être repris à l’identique dans le guide.

## Règles de style
- **Anglais** : anglais britannique neutre et simple (`colour` → on garde `color` pour les réglages CSS mais `colour` dans les phrases ; préférer la phrase sans le mot si possible), majuscule seulement en début de libellé (« Export site », pas « Export Site »), phrases courtes, impératif pour les boutons (« Save version »), « you » pour les messages.
- **Japonais** : boutons et libellés courts (体言止め : 「バージョンを保存」「書き出し」) ; messages et explications en です・ます調 ; guillemets « » → 「」 ; ponctuation pleine chasse （、。：） sauf dans les codes, nombres, URL ; pas d’espace entre japonais et chiffres sauf lisibilité ; unités `px`, `Ko`→`KB`, `Mo`→`MB`.
- **Ne jamais traduire** : codes du journal (`page.add`), noms de produits (Atelier, Gemini Nano, Gemma, Chrome, OVH, GitHub, publish.php, MAMP), extensions (.zip, .json, .csv, .md), `{paramètres}`, emoji, raccourcis clavier (Ctrl, ⌘) sauf les noms de touches : Maj → Shift, Échap → Esc, Suppr → Delete, Entrée → Enter (en anglais **et** en japonais : `(Ctrl+Shift+Z)`).
- Les `{0}`, `{name}`, `{n}` doivent tous rester ; leur ordre peut changer.
- « Annuler » : *undo* (↶) ≠ *cancel* (bouton de fenêtre) → `__c('undo', 'Annuler')` pour l’action d’historique.

## Termes
| Français | English | 日本語 |
|---|---|---|
| Atelier (l’éditeur) | Atelier | Atelier |
| éditeur | editor | エディター |
| site | site | サイト |
| page | page | ページ |
| Accueil (page) | Home | ホーム |
| section / rangée / colonne | section / row / column | セクション／行／列 |
| widget | widget | ウィジェット |
| élément (de la page) | element | 要素 |
| bloc | block | ブロック |
| canevas | canvas | キャンバス |
| inspecteur | inspector | インスペクター |
| panneau | panel | パネル |
| Widgets / Modèles / Structure / Pages / Contenus / Site | Widgets / Templates / Structure / Pages / Content / Site | ウィジェット／テンプレート／構造／ページ／コンテンツ／サイト |
| Contenu / Style / Avancé (onglets) | Content / Style / Advanced | コンテンツ／スタイル／詳細 |
| collection | collection | コレクション |
| élément (d’une collection) | item | 項目 |
| agenda / événement | events / event | イベント |
| membres | members | メンバー |
| actualités / article | news / article | ニュース／記事 |
| champ | field | フィールド |
| brouillon / publié | draft / published | 下書き／公開 |
| publier / publication | publish / publishing | 公開する／公開 |
| exporter / export | export | 書き出す／書き出し |
| version / version de sécurité / version automatique | version / safety version / automatic version | バージョン／安全バージョン／自動バージョン |
| annuler (↶) / rétablir (↷) | undo / redo | 元に戻す／やり直す |
| annuler (fenêtre) / fermer / appliquer / enregistrer | cancel / close / apply / save | キャンセル／閉じる／適用／保存 |
| dupliquer / supprimer / copier / coller / couper | duplicate / delete / copy / paste / cut | 複製／削除／コピー／貼り付け／切り取り |
| sélectionner / sélection | select / selection | 選択 |
| glisser-déposer | drag and drop | ドラッグ＆ドロップ |
| traduction / traduire / à traduire / à relire | translation / translate / to translate / to review | 翻訳／翻訳する／未翻訳／要確認 |
| langue (du site) / langue principale | language / main language | 言語／メイン言語 |
| langue de l’interface | interface language | 表示言語 |
| référencement | SEO | SEO |
| description pour Google | Google description | Google 向けの説明 |
| IA locale | on-device AI | オンデバイスAI |
| modèle (d’IA) / télécharger le modèle | model / download the model | モデル／モデルをダウンロード |
| Banc d’essai | Test bench | テストベンチ |
| Demander à Atelier | Ask Atelier | Atelier に頼む |
| Contenus intelligents | Smart content | スマートコンテンツ |
| reformuler / corriger / texte alternatif | rewrite / proofread / alt text | 書き換え／校正／代替テキスト |
| Journal de débogage / journal | Debug log / log | デバッグログ／ログ |
| Auto-test / retour arrière | Self-test / rollback | セルフテスト／ロールバック |
| relecture / commentaire / résoudre | review / comment / resolve | レビュー／コメント／解決 |
| Travailler à plusieurs / session / hôte / invité / relecteur | Collaborate / session / host / guest / reviewer | 共同編集／セッション／ホスト／ゲスト／レビュアー |
| invitation / code | invite / code | 招待／コード |
| appareil : ordinateur / tablette / mobile | device: desktop / tablet / mobile | デバイス：デスクトップ／タブレット／モバイル |
| en-tête / pied de page / menu | header / footer / menu | ヘッダー／フッター／メニュー |
| palette / couleur / police | palette / colour / font | パレット／色／フォント |
| style / preset / composant / modèle (de section) | style / preset / component / template | スタイル／プリセット／コンポーネント／テンプレート |
| contraste | contrast | コントラスト |
| image / galerie / vidéo / carte | image / gallery / video / map | 画像／ギャラリー／動画／地図 |
| lien / bouton / titre / texte / liste | link / button / heading / text / list | リンク／ボタン／見出し／テキスト／リスト |
| formulaire de contact | contact form | お問い合わせフォーム |
| adresse (URL d’une page) | address (URL) / slug | アドレス（URL） |
| jeton | token | トークン |
| hébergement | hosting | ホスティング |
| vérification (avant export) | check | チェック |
| accessibilité | accessibility | アクセシビリティ |
| enregistré / non enregistré / modifié | saved / not saved / modified | 保存済み／未保存／変更あり |
| projet | project | プロジェクト |
| réglages | settings | 設定 |
| raccourci | shortcut | ショートカット |
| infobulle | tooltip | ツールチップ |
| rôle « éditeur » (collaboration) | editor | 編集者 |
| boîte aux lettres (publish.php, collaboration) | mailbox | メッセージボックス |
| mise en relation (collaboration) | connecting | 接続 |
| résoudre (commentaire, bouton) | Resolve | 解決 |
