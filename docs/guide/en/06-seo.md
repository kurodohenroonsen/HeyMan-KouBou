# 6. SEO

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

The “🔎 SEO” window scores each page out of 100 for Google, shows the preview in search results and on social networks, lists the points to fix, and has the on-device AI (chapter 7) suggest titles, descriptions, keywords and alt texts.

**Log domains**: `seo.*` (window, scores, fields, suggestions applied, batch processing); the AI calls themselves are in `ai.*` (chapter 7).

---

## 6.1 Open SEO and read the scores

**Goal**: know where the site stands and which page to improve first.

**Steps**
1. Top bar: “🔎 SEO” (or Ctrl+K “SEO”).
2. On the left: the site score (average of the pages in the chosen language), the points that concern the whole site, the list of pages with their scores.
3. Click a page; change the language analysed with the menu next to the score.

**What you see**: the coloured score (green ≥ 85, orange ≥ 60, red below), the Google preview and the sharing preview, the list of ✗ ⚠ • ℹ ✓ points.

**Expected log** ([`journaux/seo-ouvrir-regler.log`](../journaux/seo-ouvrir-regler.log))
```log
14:29:45.562 +4.41s DEBUG seo.analysis Analyse : page 88/100, site 85/100 {"pageId":"p_eplwyjrb","lang":"fr","page":88,"site":85,"points":{"good":2,"warn":2,"info":1},"sitePoints":{"warn":1,"info":1},"words":86,"imagesNoAlt":0}
…
14:29:45.573 +4.42s INFO  seo.open Fenêtre Référencement : note du site 85/100 {"lang":"fr","pageId":"p_eplwyjrb","pages":2,"site":85,"page":88,"sitePoints":{"warn":1,"info":1},"pagePoints":{"good":2,"warn":2,"info":1},"missingDesc":2,"baseUrl":true}
14:29:45.663 +4.51s DEBUG seo.page Page choisie : /contact/ (88/100) {"pageId":"p_math7fl6","score":88,"lang":"fr"}
14:29:45.664 +4.51s DEBUG seo.analysis Analyse : page 88/100, site 85/100 {"pageId":"p_math7fl6","lang":"fr","page":88,"site":85,"points":{"good":2,"warn":2,"info":1},"sitePoints":{"warn":1,"info":1},"words":13,"imagesNoAlt":0}
…
14:29:45.725 +4.57s DEBUG seo.analysis Analyse : page 82/100, site 82/100 {"pageId":"p_math7fl6","lang":"fr","page":82,"site":82,"points":{"warn":3,"good":1,"info":1},"sitePoints":{"warn":1,"info":1},"words":13,"imagesNoAlt":0}
…
14:29:45.737 +4.58s DEBUG seo.analysis Analyse : page 82/100, site 82/100 {"pageId":"p_math7fl6","lang":"fr","page":82,"site":82,"points":{"warn":3,"good":1,"info":1},"sitePoints":{"warn":1,"info":1},"words":13,"imagesNoAlt":0}
…
14:29:45.934 +4.78s DEBUG seo.analysis Analyse : page 82/100, site 82/100 {"pageId":"p_math7fl6","lang":"fr","page":82,"site":82,"points":{"info":2,"warn":3,"good":1},"sitePoints":{"warn":1,"info":1},"words":13,"imagesNoAlt":0}
…
14:29:46.132 +4.98s DEBUG seo.analysis Analyse : page 82/100, site 82/100 {"pageId":"p_math7fl6","lang":"de","page":82,"site":82,"points":{"info":2,"warn":3,"good":1},"sitePoints":{"warn":1,"info":1},"words":13,"imagesNoAlt":0}
…
14:29:46.303 +5.15s DEBUG seo.analysis Analyse : page 82/100, site 82/100 {"pageId":"p_math7fl6","lang":"fr","page":82,"site":82,"points":{"info":2,"warn":3,"good":1},"sitePoints":{"warn":1,"info":1},"words":13,"imagesNoAlt":0}
```
To check: `seo.open` gives the site score (`site`), the page score (`page`), the **number of points per level** (`pagePoints`, `sitePoints`: `bad` ✗, `warn` ⚠, `tip` •, `info` ℹ, `good` ✓), the number of missing descriptions (`missingDesc`) and whether the site address has been filled in (`baseUrl`). Each new display writes `seo.analysis` (DEBUG) with the same counters, the number of words and of images without alt text.

**Recommended lengths**: they depend on the language analysed. A Japanese character takes up roughly twice the width of a Latin letter in Google's results, and Japanese is written without spaces: the Japanese thresholds are therefore in characters.
| Language | Title | Description | Page text |
|---|---|---|---|
| fr, nl, de, en | 15 to 60 characters | 70 to 160 characters | at least 150 words |
| ja | 10 to 32 characters | 80 to 120 characters | at least 300 characters (without spaces or punctuation) |

In Japanese, the keyword is searched for ignoring spaces and full-width forms; a keyword in kana is compared with the address in rōmaji (チーム ↔ `/chiimu/`), and a keyword in kanji is not searched for in the address. Vague Japanese links (“こちら”, “詳しくはこちら”, “もっと見る”…) are flagged like “click here”.

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Another page | the details change | `seo.page` (DEBUG) with the page's score |
| Another language analysed | scores and fields in that language | `seo.lang` (DEBUG) `{"from":"fr","to":"de"}` then `seo.analysis` with `"lang":"de"` |

---

## 6.2 Set the title, description, keyword, sharing image, noindex

**Goal**: write what Google shows, and choose the pages not to show.

**Steps**
1. “Google title”, “Description”, “Main keyword”: the counter shows the length (title: 60 characters, description: 160); empty = automatic.
2. “Sharing image”; “Do not show this page in Google (noindex)”.

**What you see**: the Google preview updates as you type; the score is recalculated when you leave the field.

**Expected log** (same extract)
```log
14:29:45.724 +4.57s DEBUG seo.field Champ « title » modifié (fr) {"pageId":"p_math7fl6","field":"title","lang":"fr","len":13}
…
14:29:45.728 +4.57s DEBUG seo.field Champ « title » modifié (fr) {"pageId":"p_math7fl6","field":"title","lang":"fr","len":13}
…
14:29:45.925 +4.77s DEBUG seo.field noindex activé {"pageId":"p_math7fl6","field":"noindex","value":true}
…
14:29:46.131 +4.97s DEBUG seo.lang Langue analysée : de {"from":"fr","to":"de"}
…
14:29:46.301 +5.14s DEBUG seo.lang Langue analysée : fr {"from":"de","to":"fr"}
```
To check: `seo.field` (DEBUG) gives the page, the field (`title`, `description`, `keyword`, `noindex`, `image`), the language and the length; each keystroke also writes `store.commit` (grouped into one undo step). The score dropping here (88 → 82) is normal: a title that is too short is flagged.

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Setting refused (page deleted in the meantime, invalid value) | red error message | `seo.apply-fail` (WARN) with the page, the language and the error | close and reopen the window; send the log if it keeps happening |

---

## 6.3 Have the AI suggest a description, title and keywords

**Goal**: get a first draft, to be reviewed.

**Steps**
1. “✨ Suggest” next to the description or the title; “✨ Ideas” next to the keyword.
2. For keywords, click one of the ideas to choose it.

**What you see**: the field fills in; “Description suggested (marked “to review”).” The suggested texts appear in the “to review” filter of the translations table (chapter 5).

**Expected log** ([`journaux/seo-ia-propositions.log`](../journaux/seo-ia-propositions.log))
```log
14:29:46.576 +5.42s DEBUG seo.ai-ask Proposition demandée : description {"kind":"description","pageId":"p_eplwyjrb","lang":"fr","sourceLang":"fr","inLen":584}
…
14:29:46.576 +5.42s INFO  ai.description.start [ai.description#6] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":584,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:29:46.577 +5.42s DEBUG ai.description.call [ai.description#6 · 1 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"137 car.","inLen":584}
14:29:46.577 +5.42s DEBUG ai.description.reply [ai.description#6 · 1 ms] Réponse Summarizer : 124 car. en 0 ms {"api":"summarizer","ms":0,"outLen":124,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel, tec…"}
14:29:46.577 +5.42s INFO  ai.description.ok [ai.description#6 · 1 ms] Description pour Google : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":1,"outLen":124,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel, tec…"}
…
14:29:46.583 +5.43s INFO  seo.ai-applied Description de l’IA appliquée (marquée « à relire ») {"kind":"description","pageId":"p_eplwyjrb","lang":"fr","len":124,"via":"summarizer","translated":false}
…
14:29:46.641 +5.49s DEBUG seo.ai-ask Proposition demandée : keywords {"kind":"keywords","pageId":"p_eplwyjrb","lang":"fr","sourceLang":"fr","inLen":584}
…
14:29:46.643 +5.49s DEBUG ai.keywords.cleaned [ai.keywords#1 · 1 ms] Mots-clés : 4 proposés, 3 gardés (doublons, 5 au plus) {"got":4,"kept":3}
14:29:46.643 +5.49s INFO  ai.keywords.ok [ai.keywords#1 · 1 ms] Mots-clés : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"keywords":3,"sample":["médias alternatifs","radio associative","fédération des médias"]}
14:29:46.643 +5.49s INFO  seo.ai-applied 3 idée(s) de mots-clés affichée(s) {"kind":"keywords","pageId":"p_eplwyjrb","lang":"fr","count":3,"translated":false}
…
14:29:46.692 +5.54s DEBUG seo.keyword-pick Mot-clé choisi parmi les idées {"pageId":"p_eplwyjrb","lang":"fr","keyword":"médias alternatifs"}
…
14:29:46.942 +5.79s DEBUG seo.ai-ask Proposition demandée : title {"kind":"title","pageId":"p_eplwyjrb","lang":"fr","sourceLang":"fr","inLen":584}
…
14:29:46.944 +5.79s INFO  ai.title.ok [ai.title#3 · 1 ms] Titre pour Google : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"outLen":46,"excerpt":"MAB – fédération des médias alternatifs belges"}
…
14:29:46.949 +5.79s INFO  seo.ai-applied Titre de l’IA appliqué (marqué « à relire ») {"kind":"title","pageId":"p_eplwyjrb","lang":"fr","len":46,"translated":false}
```
To check: for each button, `seo.ai-ask` (what is requested, length of the page text `inLen`), the `ai.description` / `ai.keywords` / `ai.title` run (chapter 7: API used, response), then `seo.ai-applied` (INFO) with the length of the applied text and `translated`. A chosen keyword writes `seo.keyword-pick`.

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Dutch language | the AI writes in French and then translates | `ai.description.via-translation`, then `seo.ai-applied` with `"translated":true` |
| Suggestion too long | cut to 160 characters (description) or 60 (title) | `ai.description.clamped` (WARN) (chapter 7) |
| Short description (fewer than 70 characters) | the message points it out | `ai.description.warning` (WARN), `seo.ai-applied` with `warning` |

**Errors**: see chapter 7 (AI missing, unreadable answer, exception); in every case nothing is written into the site and no `seo.ai-applied` line appears.

---

## 6.4 Complete all the descriptions in a language

**Goal**: fill in all the missing (or automatic) descriptions of every page in one go.

**Steps**
1. Choose the language analysed (e.g. NL).
2. “✨ Complete the 2 missing descriptions”.

**What you see**: a notification per page, then “2 descriptions suggested in NL (to review…)”.

**Expected log** ([`journaux/seo-completer-nl.log`](../journaux/seo-completer-nl.log))
```log
14:29:47.042 +5.89s INFO  seo.complete-all.start [seo.complete-all#1] Compléter les descriptions en nl : 2 page(s) {"lang":"nl","pages":2,"ids":["p_eplwyjrb","p_math7fl6"]}
…
14:29:47.043 +5.89s INFO  ai.description.start [ai.description#7] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":584,"keyword":"médias alternatifs","lang":"nl","sourceLang":"fr","gen":"fr","api":"summarizer","translateTo":"nl","source":"test"}
14:29:47.043 +5.89s INFO  ai.description.via-translation [ai.description#7 · 0 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":true}
…
14:29:47.043 +5.89s INFO  ai.description.ok [ai.description#7 · 0 ms] Description pour Google : proposition prête (Summarizer, traduite en nl) {"via":"summarizer","fallback":false,"translated":true,"calls":2,"outLen":129,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
…
14:29:47.050 +5.89s DEBUG seo.complete-all.page [seo.complete-all#1 · 8 ms] Description appliquée : accueil {"pageId":"p_eplwyjrb","len":129,"translated":true}
…
14:29:47.051 +5.89s INFO  ai.description.start [ai.description#8] IA locale : description pour Google {"task":"seoDescription","title":"Contact","inLen":99,"lang":"nl","sourceLang":"fr","gen":"fr","api":"summarizer","translateTo":"nl","source":"test"}
14:29:47.051 +5.89s INFO  ai.description.via-translation [ai.description#8 · 0 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":true}
…
14:29:47.053 +5.90s INFO  ai.description.ok [ai.description#8 · 2 ms] Description pour Google : proposition prête (Summarizer, traduite en nl) {"via":"summarizer","fallback":false,"translated":true,"calls":2,"outLen":129,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
…
14:29:47.058 +5.90s DEBUG seo.complete-all.page [seo.complete-all#1 · 16 ms] Description appliquée : /contact/ {"pageId":"p_math7fl6","len":129,"translated":true}
14:29:47.058 +5.90s INFO  seo.complete-all.ok [seo.complete-all#1 · 16 ms] 2 description(s) proposée(s) sur 2 {"done":2,"pages":2,"lang":"nl"}
```
To check: `seo.complete-all.start` with the number of pages and their identifiers; for each one an `ai.description` run then `seo.complete-all.page`; `seo.complete-all.ok` with `done` / `pages` and the total duration.

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| The AI fails or is missing on a page | the AI's message, then “0 descriptions suggested” | `ai.description.absent` (or `ai.description.fail`), `seo.complete-all.stopped` (WARN) with the page and the number already done, then `seo.complete-all.ok` | set up the AI (chapter 7) and start again: only the missing pages are taken up |
| Unexpected error during the loop | error message | `seo.complete-all.fail` (ERROR) | send the log |

```log
14:29:47.159 +6.00s INFO  seo.complete-all.start [seo.complete-all#2] Compléter les descriptions en de : 2 page(s) {"lang":"de","pages":2,"ids":["p_eplwyjrb","p_math7fl6"]}
…
14:29:47.160 +6.00s WARN  ai.description.absent [ai.description#9 · 1 ms] IA absente : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"has":{},"need":"prompt"}
14:29:47.160 +6.00s INFO  ai.description.cancel [ai.description#9 · 1 ms] Tâche non lancée (aucun appel au modèle) {"task":"seoDescription"}
…
14:29:47.160 +6.00s WARN  seo.complete-all.stopped [seo.complete-all#2 · 1 ms] Arrêt après 0 page(s) : l’IA a échoué (voir ai.description ci-dessus) {"pageId":"p_eplwyjrb","done":0}
14:29:47.161 +6.00s INFO  seo.complete-all.ok [seo.complete-all#2 · 2 ms] 0 description(s) proposée(s) sur 2 {"done":0,"pages":2,"lang":"de"}
```

---

## 6.5 Describe the images without alt text

**Goal**: give an alt text (read by screen readers and by Google) to all the images on a page.

**Steps**
1. When the page has images without alt text: “✨ Describe the N images without alt text”.

**What you see**: “1 alt text suggested (to review).”; the score goes up (here 73 → 88).

**Expected log** ([`journaux/seo-alts.log`](../journaux/seo-alts.log))
```log
14:29:44.686 +3.53s DEBUG seo.analysis Analyse : page 73/100, site 78/100 {"pageId":"p_eplwyjrb","lang":"fr","page":73,"site":78,"points":{"good":2,"warn":2,"bad":1,"info":1},"sitePoints":{"warn":1,"info":1},"words":86,"imagesNoAlt":1}
…
14:29:44.771 +3.62s INFO  seo.alts.start [seo.alts#1] Textes alternatifs manquants : 1 image(s) {"pageId":"p_eplwyjrb","lang":"fr","images":1}
…
14:29:44.785 +3.63s INFO  ai.alt.start [ai.alt#1] IA locale : texte alternatif d’une image {"task":"altText","image":"image/png (0 Ko)","context":310,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.785 +3.63s DEBUG ai.alt.call [ai.alt#1 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"alt,decorative","images":1,"system":"306 car.","inLen":351}
…
14:29:44.787 +3.63s DEBUG ai.alt.cleaned [ai.alt#1 · 2 ms] Proposition nettoyée (guillemets, balises, préfixe « Image de »…) {"before":"Image de une équipe de tournage avec une caméra","after":"Une équipe de tournage avec une caméra"}
14:29:44.787 +3.63s INFO  ai.alt.ok [ai.alt#1 · 2 ms] Texte alternatif : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"outLen":38,"excerpt":"Une équipe de tournage avec une caméra"}
…
14:29:44.801 +3.65s DEBUG seo.alts.image [seo.alts#1 · 30 ms] Texte alternatif appliqué {"nodeId":"n_6j2j5p1w24","len":38}
14:29:44.801 +3.65s INFO  seo.alts.ok [seo.alts#1 · 30 ms] 1 texte(s) alternatif(s) proposé(s) sur 1 {"done":1,"images":1,"skipped":0}
…
14:29:44.804 +3.65s DEBUG seo.analysis Analyse : page 88/100, site 85/100 {"pageId":"p_eplwyjrb","lang":"fr","page":88,"site":85,"points":{"good":2,"warn":2,"info":1},"sitePoints":{"warn":1,"info":1},"words":86,"imagesNoAlt":0}
```
To check: `seo.alts.start` with the number of images; for each one `ai.alt.*` (with `"images":1` in `ai.alt.call`: the image really is given to the model) and `seo.alts.image`; `seo.alts.ok` with `done`, `images` and `skipped` (images without a file).

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Unreadable online image (https://) | “Online image not reachable: import it into the project…” | `ai.image-fail` (WARN), `seo.alts.stopped` (WARN) | import the image into the project (chapter 4) |
| AI that cannot read images | “This browser’s on-device AI cannot read images yet” | `ai.alt.absent`, `seo.alts.stopped` | see chapter 7 (multimodal Prompt API) |
| Unexpected error | error message | `seo.alts.fail` (ERROR) | send the log |

---

## 6.6 Go to a flagged point

**Goal**: fix the element concerned directly (image without alt text, missing heading…).

**Steps**: click “Go to” next to the point.

**What you see**: the window closes, the page opens and the element is selected.

**Expected log** ([`journaux/seo-aller-a.log`](../journaux/seo-aller-a.log))
```log
14:29:47.458 +6.30s DEBUG seo.goto Aller à l’élément signalé (img-alt) {"check":"img-alt","pageId":"p_eplwyjrb","nodeId":"n_6j2j5p1w24"}
…
14:29:47.710 +6.55s DEBUG store.select Sélection : image {"id":"n_6j2j5p1w24","type":"image"}
```

---

## Codes in this chapter

| Code | Level | Meaning |
|---|---|---|
| `seo.ai-applied` | INFO | AI suggestion applied (description, title) or keyword ideas shown |
| `seo.ai-ask` | DEBUG | suggestion requested from the AI (what, page, language, text length) |
| `seo.alts.start`, `seo.alts.ok`, `seo.alts.fail` | INFO / INFO / ERROR | “Describe the images”: start (number of images), end (`done`, `skipped`), failure |
| `seo.alts.image` | DEBUG | alt text applied to an image |
| `seo.alts.stopped` | WARN | stopped after an AI failure |
| `seo.analysis` | DEBUG | analysis displayed: scores, points per level, words, images without alt text |
| `seo.apply-fail` | WARN | SEO setting refused |
| `seo.complete-all.start`, `seo.complete-all.ok`, `seo.complete-all.fail` | INFO / INFO / ERROR | “Complete the descriptions” for a language |
| `seo.complete-all.page` | DEBUG | description applied to a page |
| `seo.complete-all.stopped` | WARN | stopped after an AI failure |
| `seo.field` | DEBUG | field changed (title, description, keyword, noindex, image) |
| `seo.goto` | DEBUG | “Go to” a flagged point |
| `seo.keyword-pick` | DEBUG | keyword chosen from the ideas |
| `seo.lang` | DEBUG | language analysed changed |
| `seo.open` | INFO | window opened: site score, page score, points per level |
| `seo.page` | DEBUG | page chosen |
