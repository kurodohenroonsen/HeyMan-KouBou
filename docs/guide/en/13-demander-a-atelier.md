# 13. Ask Atelier

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

You write what you want, in plain sentences: “add a 3-question FAQ about membership”, “make the headings on this page red and centred”, “create an Our radio page with a hero, a text and image section and the contact details”. The on-device AI (Gemini Nano, chapter 7) turns the request into **actions chosen from a closed list**: only things the editor can already do. Atelier **checks** each action, shows a **preview**, then applies everything as **a single undo step**. No code is produced; an action that is not in the list is refused and explained.

**Log domains**: `assist.*` (the window and applying the actions) and `ai.plan.*` (the call to the model: `call`, `reply`, `rejected`, `actions`, `absent`…).

**The closed list**
| Action | What it does |
|---|---|
| Add a section | a template (hero, benefits, figures, testimonials, pricing, FAQ, call to action, contact, gallery, news, text and image, video), with a heading and text, after the selected section or at the end of the page |
| Add an FAQ | an FAQ section with the questions and answers given (8 at most) |
| Add an element | heading, text, button, image, spacer, divider, quote, accordion, video, map, social links, callout box, figures, content card |
| Replace the text | of the selected element |
| Set a style | colour, background, alignment, size, weight, letter case, padding, rounded corners — for the selection, the section, or all the headings, texts or buttons of the page |
| Change a palette colour | main, secondary, text, background, muted, surface (the contrast is checked in the preview) |
| Create a page | with its sections; the page opens |
| Open a page, change the device or language, open a tool | SEO, AI, publish, translations, versions, log, check, comments, palette from the logo, review summary |

---

## 13.1 Asking from Ctrl+K

**Steps**
1. Select the place (for example a heading: the new section will come after its section).
2. **Ctrl+K**, type your request (at least three words): the first line becomes “✨ Ask Atelier: …”; **Enter**.
3. **✨ Prepare** (or Ctrl+Enter): the preview lists the actions, the refusals and the warnings.
4. **Apply**; Ctrl+Z undoes the whole request in one go.

**Expected log** ([`journaux/demander-faq.log`](../journaux/demander-faq.log))
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
Check: `ai.plan.call` shows the size of the instructions (`system`, with the catalogue) and of the request; `ai.plan.actions` the actions kept; `assist.apply.step` one line per action applied; `assist.apply.ok` the number of texts written by the AI (`aiTexts`, marked “to review”).

**Variant — one setting for the whole page** ([`journaux/demander-style.log`](../journaux/demander-style.log))
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
“rouge” (red) becomes `#dc2626`, “centré” (centred) becomes `center`: the model says what it understood, the code converts and checks (an unrecognised colour or value is refused).

---

## 13.2 Creating a page from a description

**Steps**: **Pages** panel → **✨ Described page** (or Ctrl+K); describe the page; **✨ Prepare**; **Apply**. The page is created with its sections, headings and starter texts, then opened.

**Expected log** ([`journaux/demander-page.log`](../journaux/demander-page.log))
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
Here the model also suggested a section template that does not exist (`carrousel-3d`): it is refused, and the rest of the page is created.

**Good to know**: the model does not make up facts (opening hours, addresses, prices): it writes generic starter texts, marked “to review”; fill them in. If the menu is customised, a warning reminds you to add the new page to it.

---

## 13.3 Refusals, nothing to do, AI missing

([`journaux/demander-refus-sans-ia.log`](../journaux/demander-refus-sans-ia.log))
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

| Situation | What you see | Log | What to do |
|---|---|---|---|
| Request outside the list (“delete the whole site”) | “Nothing to do with the available actions…”, no Apply button | `ai.plan.rejected` / `assist.rejected` (WARN) “Unknown action”, `assist.nothing` | rephrase, or use the Ctrl+K search |
| Invalid parameter (unknown colour, setting not allowed, page not found, unknown tool) | the action is listed under “Refused” with the reason | `assist.rejected` (WARN) | make the request more precise |
| Action that needs a selection (“replace this text”, “this section”) with nothing selected | “First select…” | `assist.rejected` | select, then ask again |
| While editing a component, the header or a card | “First finish editing…” | `assist.rejected` | “Finish”, then ask again |
| More than 10 actions | the first 10 are kept | `assist.warning` (WARN) | split the request |
| Palette with insufficient contrast | warning in the preview | `assist.warning` | check in the Site panel |
| Window closed without applying | nothing changes | `assist.cancel` (INFO) | — |
| On-device AI unavailable | “Preparation failed.” + ✨ On-device AI button | `ai.plan.absent` (WARN), `assist.plan-fail` (WARN) | chapter 7 |
| Unreadable model reply | “Unreadable reply from the on-device AI: try again.” | `ai.plan.unreadable`, `ai.plan.fail` (ERROR), `assist.plan-fail` | try again |
| An action fails when applied (abnormal case) | “N actions applied” as an error | `assist.apply.step-fail` (WARN); if none get through: `assist.apply.fail` (ERROR) | send the log |
| A requested tool does not open | — | `assist.apply.tool-fail` (WARN) | open it by hand |

---

## Codes in this chapter
| Code | Level | Meaning |
|---|---|---|
| `ai.plan.start`, `ai.plan.ok`, `ai.plan.fail` | INFO / INFO / ERROR | call to the model to prepare the request |
| `ai.plan.actions` | INFO | valid actions kept |
| `ai.plan.rejected` | WARN | action suggested by the model and refused |
| `assist.apply.start`, `assist.apply.step`, `assist.apply.ok`, `assist.apply.fail` | INFO / INFO / INFO / ERROR | applying the request (one undo step) |
| `assist.apply.step-fail` | WARN | an action could not be applied |
| `assist.apply.tool-fail` | WARN | a requested tool did not open |
| `assist.cancel` | INFO | window closed without applying |
| `assist.nothing` | INFO | no action can be applied |
| `assist.open` | INFO | “Ask Atelier” window opened |
| `assist.plan` | INFO | request prepared (actions, refusals, warnings) |
| `assist.plan-fail` | WARN | request not prepared (AI missing or failed) |
| `assist.rejected` | WARN | action refused, with the reason |
| `assist.warning` | WARN | preview warning (contrast, menu, number of actions) |
