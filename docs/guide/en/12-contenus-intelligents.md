# 12. Smart content

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

The on-device AI (Gemini Nano in Chrome, see chapter 7) helps you **fill** the site: a photographed poster becomes an event, a pasted email becomes member profiles, an article gets its standfirst and headline ideas, the review is summed up as tasks. The palette from the logo, on the other hand, does not need AI. The common rule: **always a suggestion**, never a silent change; what the AI writes is created as a **draft** or marked **“to review”**, and Ctrl+Z undoes it in one go.

**Log domains**: `smart.*` (the actions in this chapter, on the interface side) and `ai.extract.*`, `ai.excerpt.*`, `ai.headlines.*`, `ai.review-summary.*` (the calls to the model: the same steps as the other AI tasks in chapter 7 — `call`, `reply`, `fallback`, `via-translation`, `cleaned`, `absent`, `refused`, `cancel`…).

---

## 12.1 Creating an event from a photo of a poster

**Goal**: stop copying posters and flyers out by hand.

**Steps**
1. **Content** → the collection (for example the events) → **✨ From a poster**.
2. **📷 Choose the photo** (taken flat and readable), then **✨ Read the poster**.
3. Check the preview: each field found and, in orange, each **discarded** value with its reason.
4. **Create 1 draft**.

**What you see**: a new item as a **draft**, open in the collection window; the photo is its image; the texts are marked “to review” in the translations table. It only appears on the site once it is published (“Published” status).

**What the code does, not the model**: the model copies what it reads; Atelier converts and checks. Dates `14/12/2026`, `14.12.26`, `samedi 14 décembre`, `14. Dezember`, `December 14` → `2026-12-14`; **with no year on the poster**, it is the next date to come (the model says whether the year is written: a year it might have made up is ignored). Times `14h`, `20 h 30`, `8 pm` → `14:00`, `20:30`, `20:00`. Link `mediaslibres.be` → `https://mediaslibres.be`. Choices (“Prévu”, “Annulé”, “Geannuleerd”…) → the value from the list. Then the same checks as when typing by hand (`javascript:` link refused, impossible date refused…).

**Expected log** ([`journaux/intelligent-affiche.log`](../journaux/intelligent-affiche.log))
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
Check: `ai.extract.call` carries the list of fields requested (`schema`) and `images`; `ai.extract.dropped` (WARN) gives, for each discarded value, the field, what was read (`raw`) and the reason; `smart.poster.ok` gives the items created and the imported image.

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Window closed without reading or without creating | nothing is created | `smart.poster.cancel` (INFO) “Closed without reading” or “Closed without creating a draft” |
| The item already exists (same title) | “Duplicate” badge, box unticked | `ai.extract.duplicates` (INFO) |
| No title read | “Untitled” badge, box unticked | `ai.extract.ok` with `missingTitle` |
| Site in Dutch | the AI reads in French, multilingual texts are translated on the device | `ai.extract.via-translation`, `ai.extract.call` from the translator |
| Collection without an image field | the photo is only used for reading | `smart.poster.ok` without `image` |

**Errors** ([`journaux/intelligent-affiche-erreurs.log`](../journaux/intelligent-affiche-erreurs.log))
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| The AI in this Chrome cannot read images (multimodal Prompt API missing or not downloaded) | “This browser’s on-device AI cannot read images yet (multimodal Prompt API).” | `ai.extract.absent` (WARN), `ai.extract.cancel`, `smart.poster.read-fail` (WARN) | ✨ On-device AI: download “Prompt API – images” (chapter 7) |
| Photo unreadable or of a refused type | the image import message | `smart.poster.image-fail` (WARN), `image.import.fail` | another photo (JPG, PNG, WebP) |
| Nothing readable on the photo | “The AI could not read anything in this image: try a sharper photo, taken straight on.” | `ai.extract.fail` (ERROR) | a sharper photo, with the whole poster in the frame |
| Model reply not in the requested format | “Unreadable reply from the on-device AI: try again.” | `ai.extract.unreadable` (WARN), `ai.extract.fail` | try again; if it keeps happening, send the log |
| Cannot create (abnormal case) | error message | `smart.poster.fail` (ERROR) | send the log |

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

## 12.2 Creating items from a pasted text

**Goal**: turn an email (“here are our new members…”), a programme or a list into items, in one go.

**Steps**
1. Collection → **✨ From text**; paste the text; **✨ Read the text**.
2. Untick what is not right (duplicates are already unticked), then **Create N drafts**.

**Expected log** ([`journaux/intelligent-texte.log`](../journaux/intelligent-texte.log))
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
Here, the first reading was requested with no text (`smart.paste.empty`, WARN), then a text with three members, one of them a duplicate: 2 drafts created, 1 left out (`skipped`).

**Variants and errors**
| Situation | Message | Log | What to do |
|---|---|---|---|
| More than 30 items in the text | “… over the maximum” | `ai.extract.truncated` (WARN) | paste the rest in a second go |
| No item recognised | “The AI found no item in this text.” | `ai.extract.fail` (ERROR) | a clearer text, one item per paragraph |
| Empty text | “Paste a text first.” | `smart.paste.empty` (WARN) | — |
| Closed without creating | — | `smart.paste.cancel` | — |
| Cannot create | error message | `smart.paste.fail` (ERROR) | send the log |

---

## 12.3 Suggesting a standfirst and headlines

**Goal**: an eye-catching summary (standfirst) and headline ideas for an article, based on its text.

**Steps**: collection window (news) → an article → **✨ Suggest** under “Standfirst” (then “Replace” or “Cancel”); **✨ Headlines** under “Title” (click a headline to use it). In the language shown; Dutch goes through translation.

**Expected log** ([`journaux/intelligent-chapo-titres.log`](../journaux/intelligent-chapo-titres.log))
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
The standfirst comes from Chrome's **Summarizer** (type `teaser`, “to make people want to read”), cut off cleanly at 220 characters. The headlines come from the Prompt API; duplicates and the current title are removed (`ai.headlines.cleaned`).

**Variants and errors** ([`journaux/intelligent-chapo-variantes.log`](../journaux/intelligent-chapo-variantes.log))
| Situation | Message | Log | What to do |
|---|---|---|---|
| Summarizer missing | same result, through the Prompt API | `ai.excerpt.fallback` (WARN) | — |
| Suggestion discarded | — | `smart.excerpt.cancel` / `smart.headlines.cancel` “Suggestion discarded” | — |
| Article text empty | “Write “Text” first.” | `smart.excerpt.cancel` “… is empty: nothing to summarise” | write the text first |
| The AI fails | the AI's message | `ai.excerpt.fail` / `ai.headlines.fail` then `smart.excerpt.fail` / `smart.headlines.fail` (ERROR) | see chapter 7 |

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

## 12.4 Summarising the review

**Goal**: know where the review stands, and send the list of things to do.

**Steps**: 💬 → **📋** (at the top of the panel) or Ctrl+K “Review summary”. **✨ Key points and tasks** adds a summary and one task per open comment, with “Go to”. **📋 Copy** gives the whole thing as plain text for an email.

**What you see**: without AI, always: “2 open comments (0 resolved); by page: 2 on “Home”; by author: Laurent: 2; oldest still waiting…”. With the AI: the key points and the tasks. Nothing is changed.

**Expected log** ([`journaux/intelligent-relecture.log`](../journaux/intelligent-relecture.log))
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
Two calls: the Summarizer (`key-points`) for the key points, the Prompt API for the tasks. A task that the model did not return uses the text of the comment instead (“(comment text)” on screen, `aiTasks` smaller than `tasks` in `ai.review-summary.ok`).

**Variants and errors**
| Situation | Message | Log |
|---|---|---|
| No open comment | ✨ button disabled, “No open comments.” | `smart.review.open` `{"open":0}` |
| Copy accepted / refused by the browser | “Summary copied.” / “Copy refused by the browser.” | `smart.review.copy` (INFO) / `smart.review.copy-fail` (WARN) |
| Comment deleted in the meantime | nothing happens | `review.goto-missing` (WARN) |
| AI unavailable | the AI's message; the summary without AI stays | `ai.review-summary.absent` or `ai.review-summary.fail` |

---

## 12.5 Palette from the logo (no AI)

**Goal**: six colours for the site, taken from the logo, **all readable** (WCAG AA).

**Steps**: **Site** panel → Palette → **🎨 Palette from the logo** (the logo in the header, or an image you choose) → check the colours, the corrections and the seven contrasts → **Apply the palette** (Ctrl+Z to go back to the old one).

**How it works**: the opaque pixels of the logo are grouped into dominant colours; the brightest one that can carry white text becomes the **main** colour, a second, different enough shade becomes the **secondary** colour; text, background and muted are derived from them; then the lightness is corrected until all seven pairs pass 4.5:1 (text on the background, links, main button, secondary button, light text on a dark background…). Each correction is announced (“Main darkened for the white text of buttons and for links on the background: #f2353f → #e00e1a”).

**Expected log** ([`journaux/intelligent-palette.log`](../journaux/intelligent-palette.log))
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

**Variants and errors** ([`journaux/intelligent-palette-variantes.log`](../journaux/intelligent-palette-variantes.log))
| Situation | Message | Log | What to do |
|---|---|---|---|
| Logo imported in the header | read directly | `smart.palette.start` `{"logo":"importé"}` then `smart.palette.pixels` | — |
| Logo with no bright colour (black, grey) | “The logo has no bright colour: the site’s main colour is kept…” | `smart.palette.no-vivid` (WARN) | choose the main colour by hand if needed |
| Closed without applying | — | `smart.palette.cancel` | — |
| Transparent logo, unreadable image | “Logo unreadable: …” | `smart.palette.fail` (ERROR) | another image |
| Online logo (https address) from a site that does not allow it to be read | “This online logo cannot be read…: import the image into the project.” | `smart.palette.fail` with `hint` CORS | import the logo |

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

## Codes in this chapter
| Code | Level | Meaning |
|---|---|---|
| `ai.excerpt.start`, `ai.excerpt.ok`, `ai.excerpt.fail` | INFO / INFO / ERROR | call to the model for a standfirst |
| `ai.extract.start`, `ai.extract.ok`, `ai.extract.fail` | INFO / INFO / ERROR | reading a poster or a text |
| `ai.extract.dropped` | WARN | value read but discarded (field, value, reason) |
| `ai.extract.duplicates` | INFO | duplicates of existing or suggested items |
| `ai.extract.truncated` | WARN | items over the maximum |
| `ai.headlines.start`, `ai.headlines.ok`, `ai.headlines.fail` | INFO / INFO / ERROR | headline suggestions |
| `ai.review-summary.start`, `ai.review-summary.ok`, `ai.review-summary.fail` | INFO / INFO / ERROR | key points and tasks of the review |
| `review.goto-missing` | WARN | comment not found from the summary |
| `smart.excerpt.start`, `smart.excerpt.proposal`, `smart.excerpt.ok`, `smart.excerpt.cancel`, `smart.excerpt.fail` | INFO… / ERROR | standfirst in an item's form |
| `smart.headlines.start`, `smart.headlines.proposal`, `smart.headlines.ok`, `smart.headlines.cancel`, `smart.headlines.fail` | INFO… / ERROR | headlines in an item's form |
| `smart.palette.start`, `smart.palette.no-logo`, `smart.palette.file`, `smart.palette.pixels`, `smart.palette.colors`, `smart.palette.no-vivid`, `smart.palette.proposal`, `smart.palette.ok`, `smart.palette.cancel`, `smart.palette.fail` | INFO, DEBUG, WARN, ERROR | palette from the logo |
| `smart.paste.start`, `smart.paste.empty`, `smart.paste.read`, `smart.paste.read-fail`, `smart.paste.preview`, `smart.paste.ok`, `smart.paste.cancel`, `smart.paste.fail` | INFO, WARN, ERROR | pasted text → items |
| `smart.poster.start`, `smart.poster.image`, `smart.poster.image-fail`, `smart.poster.read`, `smart.poster.read-fail`, `smart.poster.preview`, `smart.poster.ok`, `smart.poster.cancel`, `smart.poster.fail` | INFO, WARN, ERROR | poster → item |
| `smart.review.copy`, `smart.review.copy-fail` | INFO / WARN | summary copied or copy refused |
| `smart.review.go` | INFO | go to a task's comment |
| `smart.review.open` | INFO | review summary opened (counts) |
| `smart.review.points` | INFO | key points and tasks shown |
