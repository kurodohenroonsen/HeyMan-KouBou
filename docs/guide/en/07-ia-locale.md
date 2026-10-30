# 7. On-device AI (Gemini Nano in Chrome)

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

Atelier uses the AI **built into Chrome** (Gemini Nano): rewriting, proofreading, suggesting Google descriptions and titles, keyword ideas, image alt text. Everything happens on your computer: no account, no subscription, nothing is sent to a server. Each task uses Chrome’s dedicated API when there is one (Rewriter, Proofreader, Summarizer), and otherwise the **Prompt API** with a reply in a fixed JSON format. Gemini Nano writes in French, German, English, Spanish and Japanese; for **Dutch**, Atelier writes in French, then translates with Chrome’s translator (chapter 5).

**Log domains**: `ai.*` — state of each API (`ai.availability`, `ai.status`), downloads (`ai.download.*`, `ai.progress`), sessions (`ai.session.*`), and a **flow per task**: `ai.rewrite`, `ai.proofread`, `ai.description`, `ai.title`, `ai.keywords`, `ai.alt`, `ai.link`. Translation into Dutch also writes `translate.model.*` (chapter 5).

---

## Reading the flow of a task

Every task writes the same steps, prefixed with its name (`ai.rewrite.call`, `ai.title.call`…):

| Step | Level | What it says |
|---|---|---|
| `….start` (e.g. `ai.rewrite.start`) | INFO | the task, the requested language (`lang`), the writing language (`gen`), the planned API (`api`: `rewriter`, `proofreader`, `summarizer` or `prompt`), the length and an extract of the text (60 characters at most), `source`: `chrome` or `test` |
| `ai.rewrite.fallback` (or `ai.proofread.fallback`, `ai.description.fallback`) | WARN | the dedicated API is not available: falling back to the Prompt API; gives the Chrome setting that turns it on (`flag`) |
| `ai.description.via-translation` | INFO | language not spoken by Gemini Nano: written in `gen`, then translated |
| `ai.title.call` | DEBUG | a call to an API: which one (`api`), language, settings (`tone`, `length`, `type`, `schema` = JSON fields requested, `images`, length of the `system` instructions), input length `inLen` |
| `ai.title.reply` | DEBUG | its reply: duration `ms`, length `outLen`, extract `excerpt` (60 characters) |
| `ai.description.call-fail` | WARN | the call raised an error: name (`error.name`), message, duration, probable cause (`hint`) |
| `ai.title.unreadable` | WARN | the Prompt API did not return the requested JSON (extract of the reply) |
| `ai.title.schema-mismatch` | WARN | readable JSON but without the expected field (`missing`) |
| `ai.alt.cleaned` | DEBUG | the suggestion was cleaned up (quotes, tags, “Image of…”, duplicate keywords): before / after |
| `ai.description.clamped` | WARN | suggestion cut to the maximum length (description 160, title 60, alt text 125, link 60) |
| `ai.description.warning` | WARN | warning about the result (“not shorter than the original”, “short description”) |
| `ai.description.rejected` | WARN | suggestion empty after clean-up: rejected |
| `ai.description.no-translator` | WARN | no translator into the requested language |
| `ai.title.absent` | WARN | AI missing (no Prompt API, or no image reading): the task is not started |
| `ai.rewrite.refused-lang` | WARN | task refused in this language (rewriting, proofreading and link text need a Gemini Nano language) |
| `ai.rewrite.refused` | WARN | other refusal before any call (nothing to rewrite, unknown mode) |
| `….ok` (e.g. `ai.title.ok`) | INFO | suggestion ready: API actually used (`via`), fallback (`fallback`), translated (`translated`), number of calls (`calls`), length and extract |
| `….cancel` (e.g. `ai.rewrite.cancel`) | INFO | “Task not started”: expected refusal, no call to the model |
| `….fail` (e.g. `ai.title.fail`) | ERROR | failure: `reason` = `unreadable` (unreadable reply), `api` (exception from an API), `empty` (nothing suggested), `no-translator`, `translator` (the translation failed), `other` |

The `ai.session.*` and `ai.progress` lines (Chrome session creation, download) appear between `call` and `reply` when the real Chrome is used.

---

## 7.1 Check the state of the APIs and download a model

**Goal**: find out what this Chrome can do, and download the missing models.

**Steps**
1. Top bar: the “✨” button (or Ctrl+K “On-device AI”): the “✨ On-device AI (Gemini Nano in Chrome)” window opens.
2. The table gives the state of each API: “✓ ready”, “⇩ to download”, “… downloading”, “✗ unavailable here”, “— not in this browser”.
3. “Download” next to an API marked “to download” (once only; an unmetered connection is recommended).

**What you see**: the state changes to “✓ ready”; during the download, “Downloading Rewriter: 50%”.

**Expected log** ([`journaux/ia-etat.log`](../journaux/ia-etat.log), test provider)
```log
14:29:42.072 +0.92s INFO  ai.dialog Fenêtre ✨ IA locale {"lang":"fr","siteLang":"fr","source":"test"}
14:29:42.073 +0.92s DEBUG ai.availability Prompt API (Gemini Nano) : available (fournisseur de test) {"api":"prompt","lang":"fr","state":"available","source":"test"}
14:29:42.073 +0.92s DEBUG ai.availability Prompt API – images : available (fournisseur de test) {"api":"multimodal","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Summarizer : available (fournisseur de test) {"api":"summarizer","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Rewriter : downloadable (fournisseur de test) {"api":"rewriter","lang":"fr","state":"downloadable","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Writer : unavailable (fournisseur de test) {"api":"writer","lang":"fr","state":"unavailable","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Proofreader : available (fournisseur de test) {"api":"proofreader","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Translator : available (fournisseur de test) {"api":"translator","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s DEBUG ai.availability Language Detector : available (fournisseur de test) {"api":"detector","lang":"fr","state":"available","source":"test"}
14:29:42.074 +0.92s INFO  ai.status IA locale : prêt → prompt, multimodal, summarizer, proofreader, translator, detector (2 ms) {"lang":"fr","ms":2,"source":"test","prompt":"available","multimodal":"available","summarizer":"available","rewriter":"downloadable","writer":"unavailable","proofreader":"…
14:29:42.128 +0.97s INFO  ai.download.start [ai.download#1] Téléchargement du modèle Rewriter {"api":"rewriter","lang":"fr","source":"test"}
14:29:42.129 +0.97s INFO  ai.download.ok [ai.download#1 · 1 ms] Rewriter prêt (fournisseur de test)
14:29:42.129 +0.97s DEBUG ai.availability Rewriter : available (fournisseur de test) {"api":"rewriter","lang":"fr","state":"available","source":"test"}
14:29:42.129 +0.97s INFO  ai.status IA locale : prêt → prompt, multimodal, summarizer, rewriter, proofreader, translator, detector (0 ms) {"lang":"fr","ms":0,"source":"test","prompt":"available","multimodal":"available","summarizer":"available","rewriter":"available","writer":"unavailable","proofre…
```
What to look for: one `ai.availability` line **per API** (`state`: `available`, `downloadable`, `downloading`, `unavailable` or `absent`), then `ai.status`, which sums everything up (“ready → …”); the `ai.download` flow for the “Download” button. An API whose state has not changed since the last check goes to TRACE (each task checks the state again).

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Real Chrome | the options requested and the duration of each check | `ai.availability` with `options` and `ms`; `ai.params` (DEBUG, once): default `topK` and `temperature` of the Prompt API ([`journaux/ia-chrome-etat.log`](../journaux/ia-chrome-etat.log)) |
| API missing from the browser (e.g. Writer without the setting) | “— not in this browser” | `ai.availability` `{"state":"absent","global":"Writer","flag":"chrome://flags/#writer-api"}` |
| Download with the real Chrome | progress | `ai.progress` (DEBUG, every 10%), `ai.session.create` (DEBUG, duration and settings), `ai.download.ok` |
| Chrome is already downloading the model in the background (“… downloading”) | **Show progress** button: the percentage appears in the row (“… 37%”), then “ready” | `ai.download-follow` (INFO), `ai.progress`, `ai.download.ok` |
| Chrome does not move the download forward (stuck at 0% in `chrome://on-device-internals`) | after 20 s: “… 0% (Chrome is not progressing)” and a tip | `ai.download-stalled` (WARN): the download happens inside Chrome; check `chrome://on-device-internals` (Model Status, Assets), an unmetered Wi-Fi connection (not a phone hotspot), Chrome open, or restart Chrome |
| Window left open during a Chrome download | the state updates by itself (every 3 s) | `ai.availability` (DEBUG), `ai.download-done` (INFO) when nothing is in progress any more |
| “Copy” a chrome://flags address | “Copied: paste it into the address bar.” | `ai.flag-copied` (DEBUG); if the clipboard is refused: `ai.flag-copy-fail` (WARN), the address is shown |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| `availability()` raises an error (device not eligible…) | “✗ unavailable here” | `ai.availability-fail` (WARN) with `error.name` and `hint` | see 7.7 (hardware, `chrome://on-device-internals`) |
| Chrome does not answer within 4 s | “✗ unavailable here” | `ai.availability-timeout` (WARN) | restart Chrome; look at `chrome://on-device-internals` |
| Download refused: gesture required | “Failed: Requires a user gesture…” | `ai.session.fail` (WARN), then `ai.download.fail` (ERROR) with `hint` “Chrome exige un clic…” (Chrome requires a click from the person; this hint is always in French) | click “Download” again (the click must come from you) |
| Other failure of the button | “Failed: …” | `ai.download-ui` (WARN) if the error has not already been logged | send the log |

```log
14:29:45.056 +3.90s WARN  ai.availability-fail Proofreader : availability() a échoué (NotSupportedError) — considéré indisponible {"api":"proofreader","lang":"fr","ms":4,"options":{"expectedInputLanguages":["fr"]},"error":{"name":"NotSupportedError","message":"The device is not eligible for running…
…
14:29:45.057 +3.90s INFO  ai.status IA locale : prêt → prompt, multimodal, translator (6 ms) {"lang":"fr","ms":6,"source":"chrome","writer":"absent","detector":"absent","prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"downloadable","proofreader":"unavailable","t…
14:29:45.058 +3.90s DEBUG ai.params Réglages par défaut de la Prompt API {"topK":3,"maxTopK":128,"temperature":1,"maxTemperature":2}
14:29:45.111 +3.96s INFO  ai.download.start [ai.download#2] Téléchargement du modèle Rewriter {"api":"rewriter","lang":"fr","source":"chrome"}
14:29:45.112 +3.96s WARN  ai.session.fail Session Rewriter impossible : NotAllowedError — Requires a user gesture when availability is "downloading" or "downloadable". {"api":"rewriter","ms":0,"inputs":"fr","outputs":"fr","error":{"name":"NotAllowedError","message":"Requires a user gesture when ava…
14:29:45.113 +3.96s ERROR ai.download.fail [ai.download#2 · 2 ms] Téléchargement Rewriter impossible : NotAllowedError — Requires a user gesture when availability is "downloading" or "downloadable". {"api":"rewriter","hint":"Chrome exige un clic de la personne pour télécharger le modèle (geste requ…
14:29:45.113 +3.96s INFO  ai.status IA locale : prêt → prompt, multimodal, translator (0 ms) {"lang":"fr","ms":0,"source":"chrome","writer":"absent","detector":"absent","prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"downloadable","proofreader":"unavailable","t…
14:29:45.161 +4.00s INFO  ai.download.start [ai.download#3] Téléchargement du modèle Rewriter {"api":"rewriter","lang":"fr","source":"chrome"}
14:29:45.171 +4.01s DEBUG ai.progress Téléchargement Rewriter : 50 % {"api":"rewriter","pct":50}
14:29:45.178 +4.02s DEBUG ai.progress Téléchargement Rewriter : 100 % {"api":"rewriter","pct":100}
14:29:45.184 +4.03s DEBUG ai.session.create Session Rewriter créée (22 ms) {"api":"rewriter","ms":22,"inputs":"fr","outputs":"fr"}
14:29:45.184 +4.03s INFO  ai.download.ok [ai.download#3 · 23 ms] Rewriter prêt
14:29:45.185 +4.03s INFO  ai.status IA locale : prêt → prompt, multimodal, translator (0 ms) {"lang":"fr","ms":0,"source":"chrome","writer":"absent","detector":"absent","prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"downloadable","proofreader":"unavailable","t…
```

---

## 7.2 Rewrite a text

**Goal**: make a paragraph shorter, simpler, more formal, warmer or a little longer.

**Steps**
1. Double-click a text in the page, select the passage (or nothing: the whole paragraph).
2. Formatting bar: “✨”, then the mode (“Shorter”…).
3. The suggestion appears: “Replace” or “Cancel”.

**What you see**: the suggestion under the bar; after “Replace”, the text is marked “to review”.

**Expected log** — with the Rewriter ([`journaux/ia-reformuler-rewriter.log`](../journaux/ia-reformuler-rewriter.log))
```log
14:29:43.029 +1.87s DEBUG ai.provider Fournisseur d’IA de test (window.__atelierAI) {"source":"test","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"proofreader":true,"translator":true},"methods":["prompt","summarize","rewrite","proofread","translate"]}
14:29:43.031 +1.88s INFO  ai.rewrite.start [ai.rewrite#2] IA locale : reformuler {"task":"rewrite","inLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges.","mode":"formal","lang":"fr","gen":"fr","api":"rewriter","source":"test"}
14:29:43.031 +1.88s DEBUG ai.rewrite.call [ai.rewrite#2 · 0 ms] Appel Rewriter (fr) {"api":"rewriter","lang":"fr","tone":"more-formal","length":"as-is","inLen":44}
14:29:43.032 +1.88s DEBUG ai.rewrite.reply [ai.rewrite#2 · 1 ms] Réponse Rewriter : 44 car. en 1 ms {"api":"rewriter","ms":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
14:29:43.032 +1.88s INFO  ai.rewrite.ok [ai.rewrite#2 · 1 ms] Reformuler : proposition prête (Rewriter) {"via":"rewriter","fallback":false,"translated":false,"calls":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
```
What to look for: `ai.provider` (provider and usable APIs `has`), `ai.rewrite.call` with `"api":"rewriter"` and the tone (`more-formal`, `more-casual`, `as-is`) or the length (`shorter`, `longer`, `as-is`) sent to Chrome, `ai.rewrite.ok` with `"via":"rewriter"`. The `edit.ai-*` lines (chapter 2) say what the formatting bar does; “Replace” adds `ai.mark` (text marked “to review”).

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Rewriter missing (Chrome without the setting) | same result, through the Prompt API | `ai.rewrite.fallback` (WARN), `ai.rewrite.call` with `"api":"prompt","schema":"text"`, `ai.rewrite.ok` with `"fallback":true` ([`journaux/ia-reformuler-repli.log`](../journaux/ia-reformuler-repli.log)) |
| “Shorter” does not shorten | “The suggestion is not shorter than the original.” | `ai.rewrite.warning` (WARN) |

```log
14:29:42.551 +1.40s INFO  ai.rewrite.start [ai.rewrite#1] IA locale : reformuler {"task":"rewrite","inLen":161,"excerpt":"Le MAB réunit les médias alternatifs belges. Nous partageon…","mode":"shorter","lang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:42.552 +1.40s WARN  ai.rewrite.fallback [ai.rewrite#1 · 1 ms] Rewriter non disponible : repli sur la Prompt API (schéma JSON) {"wanted":"rewriter","has":false,"flag":"chrome://flags/#rewriter-api"}
14:29:42.553 +1.40s DEBUG ai.rewrite.call [ai.rewrite#1 · 2 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"text","system":"253 car.","inLen":169}
14:29:42.553 +1.40s DEBUG ai.rewrite.reply [ai.rewrite#1 · 2 ms] Réponse Prompt API (Gemini Nano) : 55 car. en 1 ms {"api":"prompt","ms":1,"outLen":55,"excerpt":"{\"text\":\"Le MAB réunit les médias alternatifs belges.\"}"}
14:29:42.554 +1.40s INFO  ai.rewrite.ok [ai.rewrite#1 · 3 ms] Reformuler : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
…
14:29:42.610 +1.45s DEBUG ai.mark Texte de l’IA appliqué et marqué « à relire » {"nodeId":"n_6t0n5u1i3w","field":"content","lang":"fr"}
```

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Text in Dutch | “Rewriting is not available in Dutch yet: Gemini Nano only speaks…” | `ai.rewrite.refused-lang` (WARN), `ai.rewrite.cancel` (INFO): no call | rewrite in French, then translate (chapter 5) |
| Empty selection | “Nothing to rewrite.” | `ai.rewrite.refused` (WARN), `ai.rewrite.cancel` | select a text |
| The API raises an error | Chrome’s message | `ai.rewrite.call-fail` (WARN) with `hint`, `ai.rewrite.fail` (ERROR) `"reason":"api"` | see 7.7 |
| Empty suggestion | “The AI suggested nothing: try again.” | `ai.rewrite.rejected` (WARN), `ai.rewrite.fail` `"reason":"empty"` | try again, or rewrite a longer sentence |

```log
14:29:44.925 +3.77s INFO  ai.rewrite.start [ai.rewrite#3] IA locale : reformuler {"task":"rewrite","inLen":37,"excerpt":"Le MAB réunit les médias alternatifs.","mode":"shorter","lang":"nl","gen":"nl","api":"prompt","source":"test"}
14:29:44.925 +3.77s WARN  ai.rewrite.refused-lang [ai.rewrite#3 · 0 ms] Refusé en nl : La reformulation n’est pas encore disponible en néerlandais : Gemini Nano ne parle que français, allemand, anglais, espagnol et japonais. {"lang":"nl","langs":["en","ja","es","de","fr"]}
14:29:44.925 +3.77s INFO  ai.rewrite.cancel [ai.rewrite#3 · 0 ms] Tâche non lancée (aucun appel au modèle) {"task":"rewrite"}
14:29:44.925 +3.77s ERROR ui.toast Message affiché : La reformulation n’est pas encore disponible en néerlandais : Gemini Nano ne parle que français, allemand, anglais, espagnol et japonais. {"type":"error"}
```

---

## 7.3 Proofread mistakes

**Goal**: pick up spelling, grammar, agreement and punctuation mistakes, without changing the style.

**Steps**: as in 7.2, then “Proofread” in the ✨ menu. The corrections are highlighted; “Replace” applies them at the exact spot.

**Expected log** — with the Proofreader ([`journaux/ia-corriger.log`](../journaux/ia-corriger.log))
```log
14:29:43.816 +2.66s INFO  ai.proofread.start [ai.proofread#1] IA locale : corriger les fautes {"task":"proofread","inLen":66,"excerpt":"Le MAB réunit les médias alternatifs belges. Nous partageon…","lang":"fr","gen":"fr","api":"proofreader","source":"test"}
14:29:43.816 +2.66s DEBUG ai.proofread.call [ai.proofread#1 · 0 ms] Appel Proofreader (fr) {"api":"proofreader","lang":"fr","inLen":66}
14:29:43.817 +2.66s DEBUG ai.proofread.reply [ai.proofread#1 · 1 ms] Réponse Proofreader : 165 car. en 1 ms {"api":"proofreader","ms":1,"outLen":165,"excerpt":"{\"correctedInput\":\"Le MAB réunit les médias alternatifs bel…"}
14:29:43.817 +2.66s INFO  ai.proofread.ok [ai.proofread#1 · 1 ms] Corriger : proposition prête (Proofreader) {"via":"proofreader","fallback":false,"translated":false,"calls":1,"corrections":1,"outLen":76}
…
14:29:43.891 +2.73s DEBUG ai.mark Texte de l’IA appliqué et marqué « à relire » {"nodeId":"n_6t0n5u1i3w","field":"content","lang":"fr"}
```
What to look for: `ai.proofread.ok` with `corrections` (number of mistakes found in the text).

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Proofreader missing | the Prompt API returns “original → correction” pairs, which are found in the text | `ai.proofread.fallback` (WARN), `"schema":"corrections"` ([`journaux/ia-corriger-repli.log`](../journaux/ia-corriger-repli.log)) |
| No mistakes | “No mistakes found” | `ai.proofread.ok` `{"corrections":0}` |

```log
14:29:44.319 +3.16s INFO  ai.proofread.start [ai.proofread#2] IA locale : corriger les fautes {"task":"proofread","inLen":76,"excerpt":"Le MAB réunit les médias alternatifs belges. Ensemble, nous…","lang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.319 +3.16s WARN  ai.proofread.fallback [ai.proofread#2 · 0 ms] Proofreader non disponible : repli sur la Prompt API (schéma JSON) {"wanted":"proofreader","has":false,"flag":"chrome://flags/#proofreader-api"}
14:29:44.319 +3.16s DEBUG ai.proofread.call [ai.proofread#2 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"corrections","system":"303 car.","inLen":76}
14:29:44.319 +3.16s DEBUG ai.proofread.reply [ai.proofread#2 · 0 ms] Réponse Prompt API (Gemini Nano) : 61 car. en 0 ms {"api":"prompt","ms":0,"outLen":61,"excerpt":"{\"corrections\":[{\"original\":\"tout.\",\"replacement\":\"tout !\"}…"}
14:29:44.320 +3.16s INFO  ai.proofread.ok [ai.proofread#2 · 1 ms] Corriger : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"corrections":1,"outLen":77}
```

**Errors**: as in 7.2 (`ai.proofread.refused-lang`, `ai.proofread.call-fail`, `ai.proofread.unreadable`, `ai.proofread.fail`).

---

## 7.4 Describe an image (alt text)

**Goal**: useful alt text for blind people and for Google.

**Steps**: select an image → inspector, Content tab → “✨ Describe the image” (or, for a whole page, chapter 6.5).

**What you see**: the “Alt text” field fills in (marked “to review”).

**Expected log** ([`journaux/ia-texte-alternatif.log`](../journaux/ia-texte-alternatif.log))
```log
14:29:44.785 +3.63s INFO  ai.alt.start [ai.alt#1] IA locale : texte alternatif d’une image {"task":"altText","image":"image/png (0 Ko)","context":310,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.785 +3.63s DEBUG ai.alt.call [ai.alt#1 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"alt,decorative","images":1,"system":"306 car.","inLen":351}
14:29:44.786 +3.63s DEBUG ai.alt.reply [ai.alt#1 · 1 ms] Réponse Prompt API (Gemini Nano) : 76 car. en 0 ms {"api":"prompt","ms":0,"outLen":76,"excerpt":"{\"alt\":\"Image de une équipe de tournage avec une caméra\",\"d…"}
14:29:44.787 +3.63s DEBUG ai.alt.cleaned [ai.alt#1 · 2 ms] Proposition nettoyée (guillemets, balises, préfixe « Image de »…) {"before":"Image de une équipe de tournage avec une caméra","after":"Une équipe de tournage avec une caméra"}
14:29:44.787 +3.63s INFO  ai.alt.ok [ai.alt#1 · 2 ms] Texte alternatif : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"outLen":38,"excerpt":"Une équipe de tournage avec une caméra"}
```
What to look for: `ai.alt.start` with the type and weight of the image (`image`); `ai.alt.call` with `"images":1`; `ai.alt.cleaned` shows the prefix removed (“Image de” in this French extract, “Image of” in English); `ai.alt.ok` with `decorative` if the AI judges the image decorative (empty text).

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Online image unreadable (CORS, offline) | “Online image not reachable: import it into the project…” | `net.fail` (ERROR), `ai.image-fail` (WARN) | import the image into the project |
| No image | “No image.” | `ai.image-missing` (WARN) | choose an image first |
| Prompt API without images | “This browser’s on-device AI cannot read images yet…” | `ai.alt.absent` (WARN) `{"need":"multimodal"}`, `ai.alt.cancel` | recent Chrome; see 7.7 |
| The AI cannot describe it | “The AI could not describe this image.” | `ai.alt.rejected` (WARN), `ai.alt.fail` | write it yourself |

```log
14:29:45.002 +3.85s ERROR net.fail GET 127.0.0.1:9/inexistante.png : Failed to fetch (réseau, CORS ou adresse injoignable) {"id":1,"url":"http://127.0.0.1:9/inexistante.png","ms":3,"online":true,"error":{"name":"TypeError","message":"Failed to fetch","stack":"TypeError: Failed to fetch\nat atelierF…
14:29:45.002 +3.85s WARN  ai.image-fail Image en ligne illisible (CORS ou hors ligne) : à importer dans le projet {"src":"http://127.0.0.1:9/inexistante.png","error":{"name":"TypeError","message":"Failed to fetch","stack":"TypeError: Failed to fetch\nat atelierFetch (http://localhost:8791/editor/lo…
…
14:29:45.003 +3.85s WARN  ai.image-missing Pas d’image à décrire {"src":""}
```

---

## 7.5 Descriptions, titles and keywords; Dutch through translation

**Goal**: the SEO suggestions (chapter 6), in all the site’s languages.

**What you see**: see 6.3 and 6.4.

**Expected log** — description in Dutch ([`journaux/ia-nl-traduction.log`](../journaux/ia-nl-traduction.log))
```log
14:29:44.934 +3.78s INFO  ai.description.start [ai.description#3] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":37,"lang":"nl","sourceLang":"fr","gen":"fr","api":"summarizer","translateTo":"nl","source":"test"}
14:29:44.934 +3.78s INFO  ai.description.via-translation [ai.description#3 · 0 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":true}
14:29:44.934 +3.78s DEBUG ai.description.call [ai.description#3 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"109 car.","inLen":37}
14:29:44.934 +3.78s DEBUG ai.description.reply [ai.description#3 · 0 ms] Réponse Summarizer : 124 car. en 0 ms {"api":"summarizer","ms":0,"outLen":124,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel, tec…"}
14:29:44.935 +3.78s DEBUG ai.description.call [ai.description#3 · 1 ms] Appel Translator {"api":"translator","from":"fr","to":"nl","inLen":124}
14:29:44.935 +3.78s DEBUG ai.description.reply [ai.description#3 · 1 ms] Réponse Translator : 129 car. en 0 ms {"api":"translator","ms":0,"outLen":129,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
14:29:44.935 +3.78s INFO  ai.description.ok [ai.description#3 · 1 ms] Description pour Google : proposition prête (Summarizer, traduite en nl) {"via":"summarizer","fallback":false,"translated":true,"calls":2,"outLen":129,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
```
What to look for: `gen` = `fr` and `translateTo` = `nl` in `ai.description.start`; two calls: `summarizer` (in French), then `translator` (`fr` → `nl`); `ai.description.ok` with `"translated":true` and `"calls":2`. The title and the keywords always go through the Prompt API (`ai.title.*`, `ai.keywords.*`, with `ai.keywords.cleaned` when duplicates are removed).

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Summarizer missing | the Prompt API writes the description | `ai.description.fallback` (WARN), `"schema":"description"` |
| Suggestion too long | cut at the last word before 160 characters | `ai.description.clamped` (WARN) `{"max":160,"from":224,"to":154}` ([`journaux/ia-sortie-coupee.log`](../journaux/ia-sortie-coupee.log)) |

```log
14:29:44.914 +3.76s DEBUG ai.description.call [ai.description#2 · 1 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"109 car.","inLen":37}
14:29:44.914 +3.76s DEBUG ai.description.reply [ai.description#2 · 1 ms] Réponse Summarizer : 224 car. en 0 ms {"api":"summarizer","ms":0,"outLen":224,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel part…"}
14:29:44.914 +3.76s WARN  ai.description.clamped [ai.description#2 · 1 ms] Proposition coupée à 160 caractères (le modèle en a écrit 224) {"max":160,"from":224,"to":154}
14:29:44.914 +3.76s INFO  ai.description.ok [ai.description#2 · 1 ms] Description pour Google : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":1,"outLen":154,"excerpt":"Le MAB fédère les médias alternatifs belges : matériel part…"}
```

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| No translator into Dutch | “Translation into Dutch unavailable on this device…” | `ai.description.no-translator` (WARN), `ai.description.fail` (ERROR) `"reason":"no-translator"` | chapter 5.3 (Translator) |
| Unreadable reply (not JSON) | “Unreadable reply from the on-device AI: try again.” | `ai.title.unreadable` (WARN) with the extract of the reply, `ai.title.fail` `"reason":"unreadable"` | try again; if it happens again, send the log (the extract shows what the model wrote) |
| Exception from an API (session destroyed, model unloaded) | Chrome’s message | `ai.description.call-fail` (WARN) with `error.name` and `hint`, `ai.description.fail` `"reason":"api"` | try again; see 7.7 |

```log
14:29:44.949 +3.79s INFO  ai.description.start [ai.description#4] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":37,"lang":"nl","sourceLang":"fr","gen":"fr","api":"summarizer","translateTo":"nl","source":"test"}
14:29:44.949 +3.79s INFO  ai.description.via-translation [ai.description#4 · 0 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":false}
…
14:29:44.950 +3.79s WARN  ai.description.no-translator [ai.description#4 · 1 ms] Pas de traducteur fr → nl sur cet appareil {"from":"fr","to":"nl"}
14:29:44.950 +3.79s ERROR ai.description.fail [ai.description#4 · 1 ms] Traduction en néerlandais indisponible sur cet appareil (l’IA rédige en français, puis traduit). {"task":"seoDescription","reason":"no-translator","calls":1,"error":{"name":"Error","message":"Traduction en néerlandais indisponi…
```
```log
14:29:44.870 +3.71s INFO  ai.title.start [ai.title#1] IA locale : titre pour Google {"task":"seoTitle","title":"Accueil","inLen":37,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.873 +3.72s DEBUG ai.title.call [ai.title#1 · 3 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"title","system":"189 car.","inLen":81}
14:29:44.873 +3.72s DEBUG ai.title.reply [ai.title#1 · 3 ms] Réponse Prompt API (Gemini Nano) : 44 car. en 0 ms {"api":"prompt","ms":1,"outLen":44,"excerpt":"Voici ma proposition : un titre accrocheur !"}
14:29:44.874 +3.72s WARN  ai.title.unreadable [ai.title#1 · 4 ms] Réponse illisible : ce n’est pas le JSON demandé (schéma) {"outLen":44,"excerpt":"Voici ma proposition : un titre accrocheur !","schema":"title","error":{"name":"Error","message":"Réponse illisible de l’IA locale : réessayez.","stack…
14:29:44.876 +3.72s ERROR ai.title.fail [ai.title#1 · 6 ms] Réponse illisible de l’IA locale : réessayez. {"task":"seoTitle","reason":"unreadable","calls":1,"error":{"name":"Error","message":"Réponse illisible de l’IA locale : réessayez.","stack":"Error: Réponse illisible de l’IA locale : réessayez…
```
```log
14:29:44.896 +3.74s INFO  ai.description.start [ai.description#1] IA locale : description pour Google {"task":"seoDescription","title":"Accueil","inLen":37,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:29:44.896 +3.74s DEBUG ai.description.call [ai.description#1 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"tldr","length":"short","context":"109 car.","inLen":37}
14:29:44.897 +3.74s WARN  ai.description.call-fail [ai.description#1 · 1 ms] Summarizer a échoué après 1 ms : InvalidStateError — The model execution session has been destroyed. {"api":"summarizer","ms":1,"error":{"name":"InvalidStateError","message":"The model execution session has been destroyed.…
14:29:44.897 +3.74s ERROR ai.description.fail [ai.description#1 · 1 ms] The model execution session has been destroyed. {"task":"seoDescription","reason":"api","calls":1,"hint":"Session fermée ou modèle déchargé : réessaie.","error":{"name":"InvalidStateError","message":"The model execution session…
```

---

## 7.6 When the AI is missing

**Goal**: understand why a ✨ button does nothing.

**What you see**: “On-device AI unavailable: open ✨ On-device AI to enable it (Chrome 148 or later, on a computer).” The rest of Atelier works normally.

**Expected log** ([`journaux/ia-absente.log`](../journaux/ia-absente.log), here for the “link text” task `ai.link`, planned for the accessibility check)
```log
14:29:44.965 +3.81s DEBUG ai.provider Fournisseur d’IA de test (window.__atelierAI) {"source":"test","lang":"fr","has":{},"methods":[]}
14:29:44.965 +3.81s INFO  ai.link.start [ai.link#1] IA locale : texte de lien {"task":"linkText","excerpt":"cliquez ici","target":"Contact","lang":"fr","gen":"fr","api":"prompt","source":"test"}
14:29:44.966 +3.81s WARN  ai.link.absent [ai.link#1 · 1 ms] IA absente : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"has":{},"need":"prompt"}
14:29:44.967 +3.81s INFO  ai.link.cancel [ai.link#1 · 2 ms] Tâche non lancée (aucun appel au modèle) {"task":"linkText"}
14:29:44.967 +3.81s ERROR ui.toast Message affiché : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"type":"error"}
```
What to look for: `ai.provider` with `"has":{}` (no usable API); the task ends with `….absent` (WARN) and `….cancel` (INFO), never with an error.

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Unexpected error outside a task | the error’s message | `ai.unexpected` (ERROR) with the stack | send the log |

```log
14:29:44.985 +3.83s ERROR ai.unexpected Test : erreur inattendue — erreur-de-test volontaire {"label":"Test","lang":"fr","error":{"name":"Error","message":"erreur-de-test volontaire","stack":"Error: erreur-de-test volontaire\nat boom (eval at evaluate (:290:30), <anonymous>:12:27)\nat Module.withAI…
```

---

## 7.7 Try the real Gemini Nano and send us the log

> **The easiest way**: run the **🧪 Test bench** (chapter 14): it tests each task on fixed examples and produces a report to copy.

The automatic tests use a fake Gemini Nano. Your log, with the real one, tells us exactly what your Chrome can do.

**Requirements set by Chrome**: a Windows 10/11, macOS 13 or later, Linux or Chromebook Plus computer; **22 GB free** on the disk that holds the Chrome profile; a graphics card with **more than 4 GB** of memory, or a processor with **16 GB of RAM** and 4 cores; an unmetered connection for the first download. Not on phones.

**Steps**
1. Chrome up to date (menu ⋮ → Help → About Google Chrome).
2. Turn on the trial APIs: open each address, choose the value shown, then “Relaunch”:
   - `chrome://flags/#rewriter-api` → **Enabled Multilingual** (otherwise the Rewriter only speaks English);
   - `chrome://flags/#writer-api` → **Enabled Multilingual** (or **Enabled**);
   - `chrome://flags/#proofreader-api` → **Enabled**.
   The exact names sometimes change from one version to the next: type `rewriter`, `writer`, `proofreader` or `prompt api` in the `chrome://flags` search. If Chrome rejects your hardware although it is good enough, the `chrome://flags/#optimization-guide-on-device-model` setting → “Enabled BypassPerfRequirement” lifts the check (at your own risk).
3. Open `chrome://on-device-internals`: the “Model Status” tab says whether the model is downloaded and ready, and why not if it isn’t; keep it open during the test.
4. Open Atelier with `?debug` at the end of the address (this is already the default setting during the test phase).
5. The “✨” button in the top bar: wait for the states; click “Download” for each API marked “to download” (one at a time; the first one takes several minutes).
6. Try each task once: “Shorter” and “Proofread” on a paragraph (7.2, 7.3), “✨ Describe the image” (7.4), in 🔎 SEO “✨ Suggest” for the description and the title, “✨ Ideas”, then the NL language and “✨ Complete the missing descriptions” (6.3, 6.4).
7. 🐞 → “📋 Copy the log”, paste it into your message with a screenshot of `chrome://on-device-internals`.

**What the log should show when everything works**
- At the top of the copied log, the `AI:` line (environment context): `provider: Chrome`, the globals present (`LanguageModel, Summarizer, Rewriter, Writer, Proofreader, Translator, LanguageDetector`, with “(missing)” next to the ones that are not there), the last known state of each API and the state of the translator for each language pair.
- `ai.status` with `"source":"chrome"` and `available` for `prompt`, `multimodal`, `summarizer`, `rewriter`, `proofreader`, `translator`; `ai.params` (default settings of the Prompt API).
- For each task: `ai.<task>.start` with `"source":"chrome"` and the planned API, **no** `….fallback`, an `ai.session.create` line (session creation time, languages, settings, `inputQuota`), `….call` then `….reply` with a duration of a few hundred milliseconds to a few seconds, `ai.session.usage` (tokens used / quota) for the Prompt API, and `….ok`.

Extract obtained with an **imitation** of Chrome’s APIs (same code as the real one, fake durations) ([`journaux/ia-chrome-taches.log`](../journaux/ia-chrome-taches.log)):
```log
14:29:45.435 +4.28s DEBUG ai.provider Fournisseur d’IA : API de Chrome {"source":"chrome","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"writer":false,"proofreader":false,"translator":true}}
14:29:45.435 +4.28s INFO  ai.rewrite.start [ai.rewrite#4] IA locale : reformuler {"task":"rewrite","inLen":73,"excerpt":"Le MAB réunit les médias alternatifs belges, chacun gardant…","mode":"formal","lang":"fr","gen":"fr","api":"rewriter","source":"chrome"}
14:29:45.435 +4.28s DEBUG ai.rewrite.call [ai.rewrite#4 · 0 ms] Appel Rewriter (fr) {"api":"rewriter","lang":"fr","tone":"more-formal","length":"as-is","inLen":73}
14:29:45.441 +4.29s DEBUG ai.progress Téléchargement Rewriter : 50 % {"api":"rewriter","pct":50}
14:29:45.447 +4.29s DEBUG ai.progress Téléchargement Rewriter : 100 % {"api":"rewriter","pct":100}
14:29:45.452 +4.30s DEBUG ai.session.create Session Rewriter créée (16 ms) {"api":"rewriter","ms":16,"inputs":"fr","outputs":"fr","length":"as-is","tone":"more-formal","format":"plain-text"}
14:29:45.453 +4.30s DEBUG ai.rewrite.reply [ai.rewrite#4 · 18 ms] Réponse Rewriter : 25 car. en 17 ms {"api":"rewriter","ms":17,"outLen":25,"excerpt":"Le MAB réunit les médias."}
14:29:45.453 +4.30s INFO  ai.rewrite.ok [ai.rewrite#4 · 18 ms] Reformuler : proposition prête (Rewriter) {"via":"rewriter","fallback":false,"translated":false,"calls":1,"outLen":25,"excerpt":"Le MAB réunit les médias."}
…
14:29:45.459 +4.30s DEBUG ai.provider Fournisseur d’IA : API de Chrome {"source":"chrome","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"writer":false,"proofreader":false,"translator":true}}
14:29:45.459 +4.30s INFO  ai.title.start [ai.title#2] IA locale : titre pour Google {"task":"seoTitle","title":"Accueil","inLen":37,"lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"chrome"}
14:29:45.459 +4.30s DEBUG ai.title.call [ai.title#2 · 0 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"title","system":"189 car.","inLen":81}
14:29:45.460 +4.30s DEBUG ai.session.create Session Prompt API (Gemini Nano) créée (0 ms) {"api":"prompt","ms":0,"inputs":"text:fr","outputs":"text:fr","system":"1 message(s), 189 car.","inputQuota":6144}
14:29:45.460 +4.30s DEBUG ai.session.usage Prompt API : 420 / 6144 jetons d’entrée utilisés {"inputUsage":420,"inputQuota":6144}
14:29:45.460 +4.30s DEBUG ai.title.reply [ai.title#2 · 1 ms] Réponse Prompt API (Gemini Nano) : 58 car. en 1 ms {"api":"prompt","ms":1,"outLen":58,"excerpt":"{\"title\":\"MAB – fédération des médias alternatifs belges\"}"}
14:29:45.460 +4.30s INFO  ai.title.ok [ai.title#2 · 1 ms] Titre pour Google : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"outLen":46,"excerpt":"MAB – fédération des médias alternatifs belges"}
…
14:29:45.465 +4.31s DEBUG ai.provider Fournisseur d’IA : API de Chrome {"source":"chrome","lang":"fr","has":{"prompt":true,"multimodal":true,"summarizer":true,"rewriter":true,"writer":false,"proofreader":false,"translator":true}}
…
14:29:45.466 +4.31s INFO  ai.description.via-translation [ai.description#5 · 1 ms] Gemini Nano ne parle pas nl : rédaction en fr, puis traduction sur l’appareil {"gen":"fr","to":"nl","translator":true}
…
14:29:45.472 +4.32s DEBUG ai.progress Téléchargement Summarizer : 50 % {"api":"summarizer","pct":50}
14:29:45.477 +4.32s DEBUG ai.progress Téléchargement Summarizer : 100 % {"api":"summarizer","pct":100}
14:29:45.483 +4.33s DEBUG ai.session.create Session Summarizer créée (17 ms) {"api":"summarizer","ms":17,"inputs":"fr","outputs":"fr","type":"tldr","length":"short","format":"plain-text","sharedContext":"109 car."}
…
14:29:45.484 +4.33s INFO  translate.model.start [translate.model#1] Préparation du traducteur fr → nl {"from":"fr","to":"nl"}
14:29:45.485 +4.33s INFO  translate.model.ok [translate.model#1 · 1 ms] Traducteur fr → nl prêt {"downloaded":false}
…
14:29:45.485 +4.33s INFO  ai.description.ok [ai.description#5 · 20 ms] Description pour Google : proposition prête (Summarizer, traduite en nl) {"via":"summarizer","fallback":false,"translated":true,"calls":2,"outLen":95,"excerpt":"[nl] Le MAB fédère les médias alternatifs belges : matériel…"}
```

**Typical failure messages**
| What you see in the log | Probable cause | What to do |
|---|---|---|
| `ai.availability` `{"state":"downloadable"}` for an API, and nothing happens when you use it | model not downloaded yet | “Download” in ✨ On-device AI; follow `ai.progress`; `chrome://on-device-internals` shows the download |
| `ai.availability` `{"state":"downloading"}` that goes on and on | download in progress (several GB) or blocked by a metered connection | leave Chrome open, on an unmetered connection; check the disk space |
| `ai.session.fail` / `ai.download.fail` with `NotAllowedError` “Requires a user gesture…” | **gesture required**: Chrome only downloads a model after a click from the person | click “Download” yourself; do not start the task from the console |
| `ai.availability` `{"state":"unavailable"}` for every API, or `ai.availability-fail` “The device is not eligible…” with `hint` “Matériel insuffisant…” (hardware not good enough; this hint is always in French) | **hardware not good enough** (graphics memory, RAM, disk) or system not supported | look at the reason in `chrome://on-device-internals`; free up 22 GB; try another computer |
| `ai.availability` `{"state":"absent","global":"Rewriter"}` (or Writer, Proofreader) | `chrome://flags` setting not turned on, or Chrome too old | step 2; Atelier does the same thing with the Prompt API (`….fallback`) |
| `ai.availability` `{"state":"absent","global":"LanguageModel"}` | Prompt API missing (Chrome too old, a browser other than Chrome, Chrome on mobile) | up-to-date Chrome on a computer |
| `….call-fail` with `NotSupportedError` | **language not supported** by this model (e.g. Rewriter without “Enabled Multilingual”, or a language other than fr, de, en, es, ja) | the “Enabled Multilingual” setting; for Dutch, Atelier translates (`….via-translation`) |
| `….call-fail` with `QuotaExceededError` | text too long for the model | rewrite a shorter part |
| `….call-fail` with `InvalidStateError` or `OperationError` / `UnknownError` | session closed, model unloaded, graphics memory full | try again; close some tabs; look at “Event Logs” in `chrome://on-device-internals` |
| `….unreadable` with an extract in free text | the model did not follow the requested JSON format | try again; send us the extract |
| `ai.availability-timeout` | Chrome does not answer (model service stuck) | restart Chrome |

---

## Codes in this chapter

| Code | Level | Meaning |
|---|---|---|
| `ai.alt.start`, `ai.alt.ok`, `ai.alt.fail`, `ai.alt.cancel` | INFO / INFO / ERROR / INFO | “image alt text” task |
| `ai.availability` | DEBUG (TRACE if unchanged) | state of an API (options, duration) |
| `ai.availability-fail` | WARN | `availability()` raised an error: API considered unavailable |
| `ai.availability-timeout` | WARN | `availability()` with no answer within 4 s |
| `ai.description.start`, `ai.description.ok`, `ai.description.fail`, `ai.description.cancel` | INFO / INFO / ERROR / INFO | “Google description” task |
| `ai.dialog` | INFO | ✨ On-device AI window opened |
| `ai.download.start`, `ai.download.ok`, `ai.download.fail` | INFO / INFO / ERROR | download of a model (“Download” button) |
| `ai.download-follow` | INFO | following a download already started by Chrome (“Show progress” button) |
| `ai.download-stalled` | WARN | no progress from Chrome for 20 s during a followed download |
| `ai.download-done` | INFO | Chrome’s downloads finished while the ✨ window was open |
| `ai.download-ui` | WARN | failure of the “Download” button not logged elsewhere |
| `ai.flag-copied` | DEBUG | chrome://flags address copied |
| `ai.flag-copy-fail` | WARN | clipboard refused |
| `ai.image-fail` | WARN | online image unreadable for the description |
| `ai.image-missing` | WARN | no image to describe |
| `ai.keywords.start`, `ai.keywords.ok`, `ai.keywords.fail`, `ai.keywords.cancel` | INFO / INFO / ERROR / INFO | “keyword ideas” task |
| `ai.link.start`, `ai.link.ok`, `ai.link.fail`, `ai.link.cancel` | INFO / INFO / ERROR / INFO | “link text” task |
| `ai.mark` | DEBUG | AI text applied in the page and marked “to review” |
| `ai.params` | DEBUG | default settings of the Prompt API (topK, temperature) |
| `ai.progress` | DEBUG | progress of a model download |
| `ai.proofread.start`, `ai.proofread.ok`, `ai.proofread.fail`, `ai.proofread.cancel` | INFO / INFO / ERROR / INFO | “proofread mistakes” task |
| `ai.provider` | DEBUG | provider used (Chrome or test) and usable APIs |
| `ai.rewrite.start`, `ai.rewrite.ok`, `ai.rewrite.fail`, `ai.rewrite.cancel` | INFO / INFO / ERROR / INFO | “rewrite” task |
| `ai.rewrite.absent`, `ai.title.absent`, `ai.alt.absent`… | WARN | AI missing for this task |
| `ai.rewrite.call`, `ai.rewrite.reply`, `ai.rewrite.call-fail`… | DEBUG / DEBUG / WARN | call to an API, its reply, its failure (all tasks) |
| `ai.rewrite.cleaned`, `ai.keywords.cleaned`, `ai.alt.cleaned`… | DEBUG | suggestion cleaned up |
| `ai.rewrite.fallback`, `ai.proofread.fallback`, `ai.description.fallback` | WARN | falling back to the Prompt API |
| `ai.rewrite.refused`, `ai.rewrite.refused-lang`, `ai.proofread.refused-lang`, `ai.link.refused-lang` | WARN | task refused before any call |
| `ai.rewrite.rejected`, `ai.alt.rejected`… | WARN | empty suggestion rejected |
| `ai.rewrite.warning`, `ai.description.warning` | WARN | warning about the result |
| `ai.description.clamped`, `ai.title.clamped`, `ai.alt.clamped`, `ai.link.clamped` | WARN | suggestion cut to the maximum length |
| `ai.description.no-translator`, `ai.title.no-translator`, `ai.keywords.no-translator`, `ai.alt.no-translator` | WARN | no translator into the requested language |
| `ai.description.via-translation`, `ai.title.via-translation`, `ai.keywords.via-translation`, `ai.alt.via-translation` | INFO | written in another language, then translated |
| `ai.title.unreadable`, `ai.title.schema-mismatch`… | WARN | Prompt API reply unreadable / without the expected field |
| `ai.session.create` | DEBUG | Chrome session created (duration, languages, settings, quota) |
| `ai.session.fail` | WARN | session cannot be created (error name, probable cause) |
| `ai.session.reuse` | TRACE | session reused |
| `ai.session.usage` | DEBUG | input tokens used / session quota (Prompt API) |
| `ai.status` | INFO (DEBUG before a task) | summary of the state of all APIs |
| `ai.title.start`, `ai.title.ok`, `ai.title.fail`, `ai.title.cancel` | INFO / INFO / ERROR / INFO | “Google title” task |
| `ai.unexpected` | ERROR | unexpected error during a ✨ action |
