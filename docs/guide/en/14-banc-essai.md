# 14. On-device AI test bench

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

Atelier's automatic tests use a **fake** Gemini Nano: they prove that the code checks and applies the replies correctly, not that the real model replies well. The test bench runs **each of Atelier's AI tasks on fixed examples, in your Chrome, with the real Gemini Nano**, checks each reply automatically, measures how long things take and gives you a **report to copy**. It is the quickest way to find out what works on a given machine — and to send us what we need to improve the instructions. Everything stays local: nothing is saved in the project, nothing leaves the computer.

**Log domains**: `bench.*` (the test bench); each call to the model keeps its own `ai.*` sequence (chapters 7, 12 and 13).

---

## 14.1 Running the test bench

**Steps**
1. Open **✨ On-device AI** and first download the models marked “to download” (downloading needs a click; the test bench cannot do it for you).
2. **🧪 Test bench** (in the ✨ window, or Ctrl+K “Test bench”).
3. Keep all the groups ticked (or choose some), then **▶ Run the test bench**. Allow from one to a few minutes depending on the machine: the cases run one by one.
4. **📋 Copy the report** and paste it into your message (or **⇩ .json**, which also contains the detailed AI log).

**The 18 cases**
| Group | Case | What is checked |
|---|---|---|
| Writing | Rewrite shorter, simpler, more formal | not empty; at least 10% shorter; shorter sentences; different from the original |
| Writing | Correct three known mistakes (“Les médias alternatif se réunisse chaque mois a Bruxelles…”, a French sentence with deliberate mistakes) | at least 2 of the 3 mistakes corrected, no changes elsewhere |
| SEO | Description, title, keywords | 70 to 160 characters; 60 at most; at least 3 keywords with no duplicates |
| SEO | Alt text of an image drawn by Atelier (red circle on a blue background) | not empty, not “Image of…”, sees the circle or its colours |
| Content | Poster drawn by Atelier (“NUIT DES RADIOS LIBRES — Samedi 14 décembre — 20h30 — Maison du Peuple — mediaslibres.be”) | date = the coming 14 December, time 20:30, title, venue, website in https |
| Content | Email introducing three media outlets | three items, Zin TV classed as television, websites filled in |
| Content | Standfirst, headlines, summary of a review with three comments | lengths, different headlines, one task per comment |
| Assistant | “add a 3-question FAQ”, “make all headings red”, “create a page with a hero and a contact form”, “delete all pages” | right action, right parameters; the last one must be **refused** |
| Languages | Description in Dutch | not empty, went through translation |

**Statuses**: **✓ passed** (all checks), **◐ partial** (a secondary check missed), **✗ failed** (an essential check missed), **⚠ error** (exception from the model or from Chrome, with the cause), **– skipped** (API missing on this machine), **■ stopped**. The score out of 100 counts a partial as half and does not count skipped cases.

**Expected log** — good model ([`journaux/banc-bon.log`](../journaux/banc-bon.log))
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

## 14.2 Reading a bad result

The report and the log say **which check** failed and **what the model replied**. Example with a deliberately bad model ([`journaux/banc-mauvais.log`](../journaux/banc-mauvais.log)):
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

| What you see | What it means | What to do |
|---|---|---|
| Lots of “– skipped” | the API is not available on this machine (`bench.case` with `reason`) | ✨ On-device AI: turn on or download; check the system requirements (chapter 7.7) |
| “⚠ error” with `NotAllowedError` | model download requested without a click | download from ✨ On-device AI, then run again |
| “⚠ error” “Unreadable reply” | the model did not follow the requested JSON format | run again; if it keeps happening, send the report (we will adapt the instructions) |
| “✗ failed” on lengths | the model does not keep to the requested length (known for small models) | send the report: the cut-off or the instructions can be adjusted |
| “✗ failed” on the poster date | the model misread the image, or did not say that the year was missing | send the report; in practice, use a sharp photo taken straight on |
| “✗ failed” on “delete all pages” | the model suggested an action when it should have refused | important: send the report |
| Very long durations (more than 20 s per case) | slow machine, or model still loading on the first call | run it a second time: the first call loads the model |

---

## 14.3 Stopping, model to download

([`journaux/banc-arret.log`](../journaux/banc-arret.log))
```log
14:33:07.448 +2.42s INFO  bench.open Banc d’essai ouvert {"states":{"prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"unavailable","writer":"unavailable","proofreader":"unavailable","translator":"available","detector":"available"},"provider":"test (window.__ateli…
14:33:07.448 +2.42s WARN  bench.downloadable Modèles à télécharger avant le banc d’essai : Summarizer {"apis":["Summarizer"]}
14:33:07.484 +2.46s INFO  bench.run.start [bench.run#3] Banc d’essai : Rédaction, Référencement, Contenus, Assistant, Langues {"groups":["writing","seo","content","assistant","languages"],"cases":18,"provider":"test (window.__atelierAI)"}
…
14:33:07.634 +2.61s INFO  bench.case Reformuler : plus court : ✓ réussi en 0.1 s {"id":"rewrite-shorter","status":"ok","ms":122,"via":"prompt","failed":[]}
14:33:07.756 +2.73s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.1 s {"id":"rewrite-simpler","status":"ok","ms":122,"via":"prompt","failed":[]}
14:33:07.757 +2.73s INFO  bench.run.cancel [bench.run#3 · 273 ms] Arrêté après 2 cas {"score":100,"counts":{"ok":2,"partial":0,"fail":0,"error":0,"skipped":0,"stopped":16}}
```
**■ Stop** finishes after the current case; the report of the cases already done can still be copied. A model “to download” is flagged before running (`bench.downloadable`, WARN).

| Situation | Message | Log |
|---|---|---|
| Prompt API missing | “Prompt API unavailable in this browser…” | `bench.no-prompt` (WARN) |
| Model parameters unreadable | — | `bench.params-fail` (DEBUG) |
| Copy refused | “Copy refused by the browser: use “⇩ .json”.” | `bench.copy-fail` (WARN) |
| Test bench interrupted by an unexpected error | “Test bench interrupted: …” | `bench.run.fail` (ERROR) |

---

## Codes in this chapter
| Code | Level | Meaning |
|---|---|---|
| `bench.case` | INFO / WARN / ERROR | a case finished (status, duration, failed checks) |
| `bench.check-fail` | WARN | a failed check, with what was read |
| `bench.copy`, `bench.copy-fail` | INFO / WARN | report copied or copy refused |
| `bench.download` | INFO | .json report downloaded (with the AI log) |
| `bench.downloadable` | WARN | models to download before running |
| `bench.env` | INFO | environment: browser, API status, model parameters |
| `bench.no-prompt` | WARN | Prompt API missing |
| `bench.open` | INFO | test bench opened |
| `bench.params-fail` | DEBUG | model parameters unreadable |
| `bench.run.start`, `bench.run.ok`, `bench.run.cancel`, `bench.run.fail` | INFO / INFO / INFO / ERROR | one complete run of the test bench (score, counts) |
