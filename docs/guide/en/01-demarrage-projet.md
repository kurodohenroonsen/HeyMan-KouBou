# 1. Start, save, open

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

Atelier runs entirely in the browser: the project is saved **automatically on this device** (the browser's local IndexedDB database), and it can be saved to or opened from a `.json` file to move it to another computer or share it.

**Log domains**: `boot.*` (start-up), `storage.*` (local database: project, images, versions, tokens), `store.*` (history of changes, selection, view), `project.*` (.json files, example, new site, preview).

---

## 1.1 Open the editor

**Goal**: find your project where you left it.

**Steps**
1. Open the editor's address in Chrome (or Edge, Firefox, Safari: everything works, except the on-device AI, which needs Chrome on a computer).

**What you see**: the last project saved on this device, or the MAB example the first time. At the top right, the saving status: “Saved”.

**Expected log** — project found ([`journaux/demarrage-enregistre.log`](../journaux/demarrage-enregistre.log))
```log
04:37:59.571 +0.00s INFO  boot.log Journal prêt {"console":"debug","keep":"debug","aide":"atelierDebug.copy() ou le bouton 🐞"}
04:37:59.574 +0.00s INFO  boot.start [boot#1] Démarrage d’Atelier (cycle 16) {"url":"http://localhost:8791/"}
04:37:59.588 +0.02s DEBUG storage.open Base locale ouverte {"ms":13}
04:37:59.589 +0.02s INFO  storage.load Projet rechargé depuis cet appareil {"slot":"current","name":"MAB – test du journal","pages":2,"images":0,"ms":14}
04:37:59.591 +0.02s INFO  boot.project [boot#1 · 17 ms] Projet enregistré sur cet appareil rechargé {"source":"saved","name":"MAB – test du journal","pages":2,"languages":["fr","nl","de","en"]}
04:37:59.618 +0.05s DEBUG storage.secret-read Aucun secret gardé {"name":"collab-session"}
04:37:59.833 +0.26s INFO  boot.ok [boot#1 · 259 ms] Éditeur prêt {"page":"p_asw1ynvz","lang":"fr"}
```
To check: `boot.start` → `storage.load` → `boot.project` with `"source":"saved"` → `boot.ok`. The duration of `boot.ok` is the full start-up time (canvas displayed).

**Variants**
| Situation | What changes | Log |
|---|---|---|
| First visit on this device | the MAB example appears | `storage.upgrade` (INFO, database created `{"from":0,"to":3}`), `storage.load-empty` (INFO), `boot.project` with `"source":"demo"` |
| Address with `?fresh=1` | the example appears without reading the saved project (it is not deleted; it will be replaced at the first change) | `boot.project` with `"source":"fresh"` ([`journaux/demarrage-fresh.log`](../journaux/demarrage-fresh.log)) |
| Invite link (`#join=…`) | the editor joins the collaboration session | `boot.start` with `"hash":"#join=…"`, then `collab.*` (chapter 10) |
| Database updated by another version of Atelier open in another tab | “Another tab is updating the database: reload this page” | `storage.version-change` (WARN) |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Strict private browsing, IndexedDB blocked | the editor opens with the example; “Not saved” after the first change | `storage.unavailable` or `storage.open-fail` (ERROR), then `storage.save-fail` (ERROR) | open the editor in a normal window; in the meantime, File → “Save project (.json)” |
| Another Atelier tab is blocking the database update | nothing, the editor waits | `storage.blocked` (WARN) | close the other Atelier tabs |
| Saved project unreadable (future version, damaged data) | the example appears | `boot.invalid-save` (WARN) with the validation errors | File → “Versions…”: a safety version may contain it; send us the log |
| Database cannot be read | the example appears | `storage.load-fail` (ERROR) | send the log; check the disk space |
| Images are missing from the database | the images concerned disappear from the project | `storage.assets-missing` (WARN) with their identifiers | import them again (chapter 4) |
| The editor does not appear at all | blank page | console only: `boot.error` / `boot.resource` / `boot.rejection`, then `boot.timeout` (ERROR) after 15 s; `boot.fail` if start-up failed after loading | copy the `[Atelier]` lines from the console (chapter 0) |

---

## 1.2 Make changes: automatic saving and history

**Goal**: never lose a change.

**Steps**
1. Change anything (here the site name, at the top left).
2. About 0.6 s after the last change, the project is saved on this device.

**What you see**: “Modified”, then “Saved”.

**Expected log**
```log
04:38:00.380 +0.81s DEBUG store.commit Modification {"key":"site-name","source":"topbar","past":1,"page":"p_asw1ynvz"}
04:38:01.907 +2.34s DEBUG storage.save Projet enregistré sur cet appareil {"ms":1,"kb":12}
```
- `store.commit`: a change enters the history; `past` = number of steps you can undo; `key` groups quick keystrokes in the same field into a single step (`"merged":true`: “same undo step”); `source` = the part of the editor that made the change (topbar, inspector, canvas, site, pages, collections, remote…).
- `storage.save`: `kb` = size of the project without the images; `newImages` = images written for the first time (they are only written once).

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Ctrl+Z / Ctrl+Shift+Z (or ↶ ↷) | undo / redo | `ui.key` then `store.undo` / `store.redo` (INFO) with the number of remaining steps; nothing to undo: `store.undo-none` / `store.redo-none` (DEBUG) |
| Selecting an element | | `store.select` (DEBUG); Shift+click: `store.multi` (DEBUG) |
| Changing page, language, device | | `store.view` (DEBUG) `{"pageId":…}`, `{"lang":"nl"}`, `{"device":"mobile"}` |
| Hovering over an element on the canvas | | `store.hover` (TRACE only) |
| Editing a component, the header, a collection card | “You are editing…” banner | `store.edit-target` (INFO); to go back: “Back to the page” |
| Change received from another participant | | `store.remote` (DEBUG) with the number of operations (chapter 10) |
| Project replaced (file opened, example, new site) | | `store.load` (INFO) |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Storage space full, database blocked | “Not saved” | `storage.save-fail` (ERROR) with the error (`QuotaExceededError`…); when it works again: `storage.save-recovered` (INFO) | save to .json straight away; free up space (images that are too heavy, old versions) |
| Change in review mode | “Review mode: you can browse and comment (💬), not edit.” | `store.readonly` (WARN) | normal: ask the host for editing rights (chapter 11) |
| Bug: a part of the editor sends an invalid site | nothing changes | `store.invalid` (ERROR) | send us the log |

Real extract (full storage simulated then restored: [`journaux/enregistrement-impossible.log`](../journaux/enregistrement-impossible.log))
```log
04:38:00.380 +0.81s DEBUG store.commit Modification {"key":"site-name","source":"topbar","past":1,"page":"p_asw1ynvz"}
04:38:00.981 +1.41s ERROR storage.save-fail Projet NON enregistré sur cet appareil : Quota dépassé (simulé) (espace plein, navigation privée ou IndexedDB bloqué) {"error":{"name":"QuotaExceededError","message":"Quota dépassé (simulé)","code":22},"name":"QuotaExceededError"}
04:38:01.306 +1.74s DEBUG store.commit Modification (même étape d’annulation) {"key":"site-name","source":"topbar","merged":true,"past":1,"page":"p_asw1ynvz"}
04:38:01.907 +2.34s DEBUG storage.save Projet enregistré sur cet appareil {"ms":1,"kb":12}
04:38:01.907 +2.34s INFO  storage.save-recovered Enregistrement rétabli
```

---

## 1.3 Save the project to a file (.json)

**Goal**: keep a copy, move to another computer, send the project.

**Steps**: File → “Save project (.json)”, or **Ctrl+S**.

**What you see**: a file `nom-du-site.atelier.json` (named after your site) is downloaded (images included); message “Project saved as a .json file.”.

**Expected log** ([`journaux/projet-enregistrer-json.log`](../journaux/projet-enregistrer-json.log))
```log
04:38:04.372 +4.80s INFO  project.export-json Projet enregistré en fichier .json {"kb":34,"pages":2}
04:38:04.374 +4.80s INFO  ui.toast Message affiché : Projet enregistré en fichier .json.
```
Publishing tokens are **never** in this file (they stay on the device, see `storage.secret-*` in chapter 8).

---

## 1.4 Open a project (.json)

**Goal**: pick up a project saved to a file.

**Steps**: File → “Open a project (.json)”, choose the file.

**What you see**: the project replaces the current one; message “Project opened.”. A safety version of the previous project is saved (File → Versions…), and Ctrl+Z goes back.

**Expected log** ([`journaux/projet-ouvrir-json.log`](../journaux/projet-ouvrir-json.log))
```log
04:38:04.404 +4.83s INFO  project.import.start [project.import#1] Ouverture d’un projet .json {"name":"mab.atelier.json","kb":34}
04:38:04.409 +4.84s DEBUG storage.version-save Version enregistrée {"id":"v_mvsztmnto9vrr"}
04:38:04.414 +4.84s INFO  store.load Projet chargé dans l’éditeur {"name":"MAB – Médias Alternatifs Belges","pages":2,"keepHistory":true}
04:38:04.417 +4.85s INFO  project.import.ok [project.import#1 · 13 ms] Projet ouvert {"pages":2,"name":"MAB – Médias Alternatifs Belges"}
04:38:04.418 +4.85s INFO  ui.toast Message affiché : Projet ouvert.
```

**Errors** ([`journaux/projet-ouvrir-json-erreurs.log`](../journaux/projet-ouvrir-json-erreurs.log))
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| The file is not JSON (damaged, cut off, another format) | “Unreadable file: this is not valid JSON (…)” | `project.import.fail` (ERROR) with the position of the error | use a complete copy of the file |
| Valid JSON but not an Atelier project (or from an unknown version) | “Unreadable file: Project format not recognised (version 2 expected).” (or the first validation error) | `project.import.invalid` (WARN) with the first 5 errors, then `project.import.fail` (ERROR) | check that it really is a `.atelier.json` file; send us the log if it is one |

```log
04:38:04.463 +4.89s INFO  project.import.start [project.import#2] Ouverture d’un projet .json {"name":"casse.json","kb":0}
04:38:04.468 +4.90s ERROR project.import.fail [project.import#2 · 5 ms] ce n’est pas du JSON valide (Expected double-quoted property name in JSON at position 19 (line 1 column 20)) {…}
04:38:04.490 +4.92s INFO  project.import.start [project.import#3] Ouverture d’un projet .json {"name":"invalide.json","kb":0}
04:38:04.492 +4.92s WARN  project.import.invalid [project.import#3 · 2 ms] Projet refusé par la validation {"errors":["Format de projet non reconnu (version 2 attendue).","La langue principale doit faire partie des langues du site.","Le site doit avoir exactement une page d’accueil."]}
04:38:04.493 +4.92s ERROR project.import.fail [project.import#3 · 3 ms] Format de projet non reconnu (version 2 attendue). {…}
```

---

## 1.5 Reload the example, start an empty site, preview

**Goal**: start again from the MAB example or from a blank page; see the page as a visitor does.

**Steps**
- File → “Reload the example”, then confirm.
- File → “New empty site”: a small window asks for
  - the **site name** (you can change it later in the Site panel);
  - the **main language**: the one you write in first, which visitors see by default (French, Dutch, German, English or **Japanese**). It cannot be changed afterwards;
  - the **other languages** (ticked by default: Dutch, German and English for a site in French; English for a site in Japanese). You can add or remove some later in the Site panel.

  Then **Create the site**. The home page is already called “Home” in the main language (“ホーム” in Japanese).
- File → “Preview in a new tab”.

**Expected log** ([`journaux/projet-exemple-nouveau-apercu.log`](../journaux/projet-exemple-nouveau-apercu.log))
```log
22:27:21.339 +5.05s INFO  project.cancel Remplacement annulé {"action":"demo"}
22:27:21.461 +5.17s DEBUG storage.version-save Version enregistrée {"id":"v_mvu20qk5kumdz","name":"Avant un nouveau site vide","kind":"safety"}
22:27:21.476 +5.19s INFO  store.load Projet chargé dans l’éditeur {"name":"Nouveau site","pages":1,"keepHistory":true}
22:27:21.479 +5.19s INFO  project.new Nouveau site vide : « Nouveau site », langue principale Français {"lang":"fr","languages":["fr","nl","de","en"]}
22:27:21.931 +5.64s DEBUG storage.version-save Version enregistrée {"id":"v_mvu20qx7f7iz5","name":"Avant de recharger l’exemple","kind":"safety"}
22:27:21.943 +5.66s INFO  store.load Projet chargé dans l’éditeur {"name":"MAB – Médias Alternatifs Belges","pages":2,"keepHistory":true}
22:27:21.949 +5.66s INFO  project.demo Exemple rechargé
22:27:22.391 +6.11s INFO  project.preview Aperçu dans un nouvel onglet {"page":"p_883srvr4","lang":"fr"}
```
To check: each replacement starts with `storage.version-save` (the safety version) then `store.load`.

**Variants**
| Situation | What changes | Log |
|---|---|---|
| You answer “Cancel” (or close the new site window) | nothing changes | `project.cancel` (INFO) `{"action":"demo"}` or `{"action":"new"}` |
| You change the main language in the new site window | the languages ticked by default follow | `project.new-lang` (DEBUG) `{"lang":"ja"}` |
| The preview is blocked by the browser (pop-ups) | no tab opens | `project.preview` is recorded anyway: allow pop-ups for the editor's address |

---

## 1.6 Interface language (French, English, Japanese)

**Goal**: use the editor in French, English or Japanese. The interface language does not change the language of your sites (see chapter 5).

**Steps**: **File** menu → “Interface language”, or Ctrl+K “🌍 English” / “🌍 日本語” / “🌍 Français”.

**Normal path**: the project is saved and the page reloads in the new language; the choice is remembered on this device. At the very first launch, the editor takes the browser's language (French, English or Japanese; otherwise English). You can also force a language through the address: `?lang=en`, `?lang=ja`, `?lang=fr`.

Everything follows the chosen language: buttons, panels, windows, messages, tooltips, reports from the self-test and the test bench, and **the log messages**. The **log codes** (`page.add`…) are the same in all three languages: a log copied in Japanese can be read with this guide.

| Situation | Log |
|---|---|
| Start-up | `ui.lang-ready` (DEBUG): language, number of fixed texts translated, catalogue loaded |
| Language change | `ui.lang` (INFO), then reload |
| Project not saved before the change | `ui.lang-save-fail` (WARN): the change happens anyway; automatic saving had already taken place at most 0.6 s after the last change |
| Translation file not found (`i18n/en.js` or `i18n/ja.js`) | `ui.lang-missing` (WARN): the interface stays in French |

---

## 1.7 Opening the user guide

**Goal**: find help without leaving the editor.

**Steps**: the **❓** button at the top right, **File → User guide**, the **F1** key, or Ctrl+K “Guide”. If a window is open (Publish, SEO, on-device AI…), F1 goes straight to the chapter about it.

**What you see**: the guide opens in a new tab, in the interface language (French, English or Japanese). You can search it (box at the top, or the “/” key), change language and move from chapter to chapter; **technical details** (log, codes) are hidden: tick “Show technical details” to see them.

| Situation | Log |
|---|---|
| Guide opened | `ui.help` (INFO): page opened, language, window you came from |

---

## Codes in this chapter
| Code | Level | Meaning |
|---|---|---|
| `boot.fail` | ERROR | start-up failed |
| `boot.invalid-save` | WARN | saved project unreadable, example loaded instead |
| `boot.ok` | INFO | editor ready (total start-up time) |
| `boot.project` | INFO | project chosen at start-up (`source`: saved, demo, fresh) |
| `boot.start` | INFO | start of start-up |
| `project.cancel` | INFO | project replacement cancelled |
| `project.demo` | INFO | example reloaded |
| `project.export-json` | INFO | project saved as .json |
| `project.import.start`, `project.import.ok`, `project.import.fail` | INFO / INFO / ERROR | opening a .json file |
| `project.import.invalid` | WARN | file refused by the validation |
| `project.new` | INFO | new empty site (name, main language, languages) |
| `project.new-lang` | DEBUG | main language chosen in the new site window |
| `project.preview` | INFO | preview in a new tab |
| `storage.assets-missing` | WARN | images missing from the local database |
| `storage.blocked` | WARN | database blocked by another tab |
| `storage.load` | INFO | project reloaded from the device |
| `storage.load-empty` | INFO | no saved project |
| `storage.load-fail` | ERROR | saved project cannot be read |
| `storage.open` | DEBUG | local database opened |
| `storage.open-fail` | ERROR | local database inaccessible |
| `storage.save` | DEBUG | project saved on the device |
| `storage.save-fail` | ERROR | project not saved |
| `storage.save-recovered` | INFO | saving restored after a failure |
| `storage.unavailable` | ERROR | IndexedDB missing |
| `storage.upgrade` | INFO | local database created or updated |
| `storage.version-change` | WARN | another tab is updating the database |
| `store.commit` | DEBUG | change entered in the history |
| `store.edit-target` | INFO | editing a component, the header, a card… or back to the page |
| `store.hover` | TRACE | hover |
| `store.invalid` | ERROR | change ignored: invalid site (bug) |
| `store.load` | INFO | project loaded into the editor |
| `store.multi` | DEBUG | multiple selection |
| `store.readonly` | WARN | change refused in review mode |
| `store.redo`, `store.redo-none` | INFO / DEBUG | redo |
| `store.remote` | DEBUG | changes from another participant applied |
| `store.select` | DEBUG | selection |
| `store.undo`, `store.undo-none` | INFO / DEBUG | undo |
| `store.view` | DEBUG | page, language or device displayed |
| `ui.lang` | INFO | interface language changed (reload) |
| `ui.lang-missing` | WARN | translations for the chosen language not found: interface in French |
| `ui.lang-ready` | DEBUG | interface ready in the chosen language |
| `ui.lang-save-fail` | WARN | project not saved just before the language change |
| `ui.help` | INFO | user guide opened (❓ button, File, F1, Ctrl+K) |
