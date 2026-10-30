# 2. Edit a page

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

The canvas, in the centre, shows the page as it will be published. There you select elements, add widgets (click or drag), write the texts directly, and reorganise the page with the mouse, the keyboard or the **Structure** panel.

**Log domains**
- `canvas.*`: display of the page in the canvas (full load, update, scaling per device, scrolling), keys pressed in the page, double-clicks.
- `edit.*`: writing a text in the page (start, end, length of the text, formatting, links, pasting, ✨ menu).
- `action.*`: add, duplicate, delete, cut, copy, paste, move, select the parent; refusals and their reasons.
- `dnd.*`: drag and drop (start, target, drop accepted or refused, cancellation).
- `structure.*`: Structure panel (open, collapse, keyboard).
- `library.*`: widget library (search, click).
- `ctxmenu.*`: context menu (right-click).
- `widgets.*`: loading of the extra widgets at start-up.
- Already logged everywhere (chapters 0 and 1) and useful here: `store.select`, `store.multi`, `store.commit`, `store.undo`, `store.redo`, `store.view`, `store.edit-target` (history and selection), `ui.key`, `ui.click`, `ui.toast`, `ui.dialog.open` (keys, clicks and windows **outside** the canvas), `cmdk.run` and `cmdk.fail` (Ctrl+K bar).

> **The canvas is a page within the page** (an iframe). Clicks and keys **inside** the canvas do not appear as `ui.click` / `ui.key`: a key pressed in the page gives `canvas.key`, a click on an element gives `store.select`. Everything goes into the same log: the order of the lines is the real order.

---

## 2.1 Display the page in the canvas

**Goal**: see the page up to date, at the right size, for the chosen device.

**Steps**
1. Open the editor: the first page of the site appears in the canvas.
2. Change page (list at the top), language or device (🖥 ▭ ▯): the canvas follows.

**What you see**: the rendered page; on a small screen it is scaled down (the scale is shown at the bottom of the canvas, for example “62 %”).

**Expected log** (start-up, real extract: [`journaux/edition-canevas-demarrage.log`](../journaux/edition-canevas-demarrage.log))
```log
05:10:31.575 +0.01s DEBUG widgets.extra Widgets supplémentaires chargés : 15 {"widgets":23,"extra":15}
05:10:31.587 +0.02s DEBUG canvas.scale Canevas ordinateur : 1280 px, réduit à 62 % {"device":"desktop","width":1280,"scale":62,"available":792}
05:10:31.587 +0.02s INFO  canvas.load.start [canvas.load#1] Chargement complet du canevas : premier chargement {"reason":"premier chargement","page":"p_7mv9bc93","lang":"fr","device":"desktop"}
05:10:31.596 +0.03s DEBUG canvas.load.render [canvas.load#1 · 9 ms] Page rendue {"ms":8,"kb":25}
05:10:31.883 +0.31s INFO  boot.ok [boot#1 · 307 ms] Éditeur prêt {"page":"p_7mv9bc93","lang":"fr"}
05:10:31.884 +0.32s INFO  canvas.load.ok [canvas.load#1 · 297 ms] Canevas prêt {"nodes":30,"scale":62}
```
To check: `canvas.load.start` (with the reason) → `canvas.load.render` (rendering time `ms`, size `kb`) → `canvas.load.ok` with `nodes` (number of elements displayed). `canvas.scale` gives the real rendering width (1280, 820 or 390 px) and the scale. `widgets.extra` confirms that the extra widgets (form, video, map…) are loaded.

**Slow online fonts or images**: the canvas is ready as soon as the page has been read (`canvas.load.ok` with `"via":"dom"`), without waiting for Google fonts or online images; the display adjusts when they arrive. If they take more than 3 s, `canvas.resources-slow` (WARN) gives the duration and the hosts involved (for example `fonts.googleapis.com`); otherwise `canvas.resources` (DEBUG). This is not a fault in the editor: slow network, filter or blocker towards these hosts. Before cycle 20, this case caused a false `boot.timeout` after 15 s.

After that, each change **does not reload** the canvas: only the content is replaced (`canvas.render`, DEBUG). The canvas is only fully reloaded (`canvas.load.*`) if the page, the language, the site fonts or the editing target (component, header…) change.

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| Ordinary change (inspector, adding, deleting…) | the page updates without flickering, the scroll position is kept | `canvas.render` (DEBUG) `{"mode":"contenu","source":…}` |
| Typing in the page, typing in a field, dragging a colour picker | same, continuously | `canvas.render` at **TRACE** only (`"mode":"styles"` while writing in the page: the text is not replaced, the cursor stays) |
| Another page, another language | full reload | `canvas.load.start` with `"reason":"autre page"` or `"autre langue"` |
| Site font changed (Site panel) | reload (to load the font) | `"reason":"polices du site"` (see 3.8) |
| Editing a component, the header, a card; “Finish” | reload on the part being edited, then on the page | `"reason":"modification du composant"`, `"modification de l’en-tête"`…, then `"retour à la page"` |
| Two changes very close together (page then language) | a single display, the last one | `canvas.load.cancel` (INFO) “Load replaced by a new one”, then a new `canvas.load.start` ([`journaux/edition-canevas-recharge.log`](../journaux/edition-canevas-recharge.log)) |
| Device changed (🖥 ▭ ▯) | width 1280, 820 or 390 px, scaled down if there is not enough room | `store.view` `{"device":"mobile"}` then `canvas.scale` (DEBUG) `{"device":"mobile","width":390,"scale":100}`; window resized: `canvas.scale` at TRACE |
| Selected element out of view (adding, arrows, Structure) | the canvas scrolls to it | `canvas.scroll` (DEBUG) `{"from":…,"to":…}`; hidden element (on this device or in this language): `canvas.scroll-missing` (DEBUG) |
| Another participant changes the page while you are writing in it | their change waits until you finish typing | `canvas.remote-deferred` (DEBUG), then `canvas.remote-applied` (DEBUG) when you leave the text |
| Button drawn in the canvas by the editor (comment badge…) | | `canvas.ui-action` (DEBUG) `{"action":…}` |

**Expected log** — two changes close together ([`journaux/edition-canevas-recharge.log`](../journaux/edition-canevas-recharge.log))
```log
05:10:53.630 +22.06s DEBUG store.view Vue : pageId=p_f0ooet9j {"pageId":"p_f0ooet9j"}
05:10:53.633 +22.06s INFO  canvas.load.start [canvas.load#2] Chargement complet du canevas : autre page {"reason":"autre page","page":"p_f0ooet9j","lang":"fr","device":"desktop"}
05:10:53.634 +22.07s DEBUG canvas.load.render [canvas.load#2 · 1 ms] Page rendue {"ms":1,"kb":20}
05:10:53.637 +22.07s DEBUG store.view Vue : lang=nl {"lang":"nl"}
05:10:53.640 +22.07s INFO  canvas.load.cancel [canvas.load#2 · 7 ms] Chargement remplacé par un nouveau {"reason":"autre langue"}
05:10:53.640 +22.07s INFO  canvas.load.start [canvas.load#3] Chargement complet du canevas : autre langue {"reason":"autre langue","page":"p_f0ooet9j","lang":"nl","device":"desktop"}
05:10:53.641 +22.07s DEBUG canvas.load.render [canvas.load#3 · 1 ms] Page rendue {"ms":0,"kb":20}
05:10:53.905 +22.34s INFO  canvas.load.ok [canvas.load#3 · 265 ms] Canevas prêt {"nodes":5,"scale":62}
05:10:53.919 +22.35s DEBUG store.view Vue : lang=fr {"lang":"fr"}
…
```

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Rendering the page fails (inconsistent project, bug) | the canvas keeps the old image; often an error message | `canvas.render-fail` (ERROR) with `error`, then `canvas.load.fail` (ERROR) if it was a full load | Ctrl+Z to go back to the previous state; send the log |
| The canvas loads empty (iframe blocked by an extension or a browser policy) | blank canvas | `canvas.load.fail` (ERROR) “Canvas loaded without content” | turn off the extensions that block iframes; reload the page |
| An overlay (another participant's presence, comment badges) crashes | the overlay no longer appears, the rest works | `canvas.overlay-fail` (WARN, once; then TRACE) with `error` | send the log |
| Browser too old (no `ResizeObserver` in the canvas) | the selection frames only move back into place when scrolling | `canvas.no-resize-observer` (WARN) | update the browser |
| `core/widgets-extra.js` file old or missing on the server | some widgets are missing from the library | `widgets.missing` (WARN) with the list | reload without the cache (Ctrl+Shift+R); check that all the editor's files are up to date |

---

## 2.2 Select an element

**Goal**: choose the element to adjust or move.

**Steps**
1. Click an element on the page (or its line in the Structure panel).
2. The arrow keys move through the page: ↑ / ↓ previous / next element, ← parent, → first child.
3. Esc goes up to the parent (widget → column → row → section).

**What you see**: an orange frame around the element (blue for a section, green for a row, purple for a column), its ↰ ✥ ⧉ ✕ bar, and its settings in the inspector.

**Expected log** (click, ↓ arrow, Esc: [`journaux/edition-selectionner.log`](../journaux/edition-selectionner.log))
```log
05:10:32.512 +0.94s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:32.706 +1.14s DEBUG store.select Sélection : text {"id":"n_4y660b0u1y","type":"text"}
05:10:32.867 +1.30s DEBUG canvas.key Raccourci dans la page : Escape {"key":"Escape","in":"page","selected":"n_4y660b0u1y"}
05:10:32.868 +1.30s DEBUG action.parent Parent sélectionné : column {"from":"text","to":"column","id":"n_2e4h0v2s04"}
05:10:32.868 +1.30s DEBUG store.select Sélection : column {"id":"n_2e4h0v2s04","type":"column"}
```
To check: each selection gives `store.select` with the type; Esc gives `canvas.key` then `action.parent` (`from` → `to`). The arrow keys do not give a `canvas.key` line in normal mode (TRACE), only the `store.select` that follows.

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| Esc on a section | nothing (a section has no selectable parent) | `action.parent-none` (DEBUG) ([`journaux/edition-selectionner-section.log`](../journaux/edition-selectionner-section.log)) |
| ↰ button on the element's bar | parent selected | `canvas.toolbar` (DEBUG) `{"act":"parent"}` then `action.parent` |
| Click on a line in the Structure panel | same, the canvas scrolls to the element | `ui.click` then `store.select`, possibly `canvas.scroll` |
| Click on an empty part of the canvas | nothing selected any more, the inspector shows the help | `store.select` “Selection cleared” |
| Shortcut with no selection (Esc, Ctrl+D…) | nothing | `action.none` (DEBUG) `{"action":…}` |
| Shift+click | multiple selection (2.10) | `store.multi` |

**Errors**: none expected. If a click selects nothing although an element is visible, copy the log: you should see `store.select` with `"asked"` (element not found).

---

## 2.3 Add a widget (click)

**Goal**: add a heading, a text, a button, an image… to the page.

**Steps**
1. Select the element after which to add it (otherwise the widget goes at the end of the page).
2. Left-hand “Widgets” panel: click the widget. The “Search widgets…” field filters the list.

**What you see**: the widget appears just after the selection, selected, and the canvas scrolls to it.

**Expected log** ([`journaux/edition-ajouter-clic.log`](../journaux/edition-ajouter-clic.log))
```log
05:10:33.504 +1.94s DEBUG library.insert Bibliothèque : clic sur « Bouton » {"type":"button","how":"clic"}
05:10:33.506 +1.94s DEBUG store.commit Modification {"source":"library","past":1,"page":"p_7mv9bc93"}
05:10:33.509 +1.94s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"library","mode":"contenu","ms":2}
…
05:10:33.515 +1.95s DEBUG store.select Sélection : button {"id":"n_5x206n134e","type":"button"}
05:10:33.517 +1.95s INFO  action.add Widget ajouté : Bouton {"type":"button","id":"n_5x206n134e","parentType":"column"}
…
```
To check: `library.insert` (the click) → `store.commit` (`"source":"library"`) → `store.select` → `action.add` with the type and `parentType` (where it was placed). `version.*` lines (first change of the day: safety version, chapter 4) may appear in between.

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| A structure (“2 columns”…) | a section with its columns, after the selected section | `library.insert` `{"type":"section","spans":"6-6"}` then `action.add-section` (INFO) `{"spans":[6,6]}` |
| Search “vid” | the list shrinks | `library.search` (DEBUG, when you leave the field) `{"q":"vid","shown":1}`; each letter: TRACE |
| Search with no result | empty list | `library.search-empty` (DEBUG), once ([`journaux/edition-bibliotheque-recherche.log`](../journaux/edition-bibliotheque-recherche.log)) |
| Through the Ctrl+K bar (“Add: …”) | same | `cmdk.run` `{"id":"add:…"}` then `action.add` (2.13) |
| By dragging the widget into the page | where you drop it | `dnd.*` (2.4) |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| The element cannot go there (structure rule) | red message explaining the rule | `action.refused` (WARN) `{"action":"ajouter","error":…}` then `ui.toast` (ERROR) | select a column or a section, then try again |
| Review mode | “Review mode…” | `store.readonly` (WARN); no `action.add` line | leave review mode (chapter 11) |

---

## 2.4 Drag and drop: add, move

**Goal**: place a widget, a structure, a template or a component exactly where you want it; move an existing element.

**Steps**
1. Add: drag a widget from the library (or a template, a component) into the page.
2. Move: select the element, then drag it (or drag its ✥ handle); or drag its line in the Structure panel.
3. A blue line shows where it will be dropped; let go. Esc cancels.

**What you see**: a thumbnail follows the mouse; the blue line (or a dotted frame for an empty container) shows the place; after the drop, the element is selected.

**Expected log** — add by dragging ([`journaux/edition-ajouter-glisser.log`](../journaux/edition-ajouter-glisser.log))
```log
05:10:34.331 +2.76s INFO  dnd.start [dnd#1] Glisser : Bouton {"kind":"widget","type":"button","from":"bibliothèque"}
05:10:34.740 +3.17s DEBUG store.commit Modification {"source":"dnd","past":2,"page":"p_7mv9bc93"}
05:10:34.746 +3.18s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"dnd","mode":"contenu","ms":3}
05:10:34.755 +3.19s DEBUG store.select Sélection : button {"id":"n_0k0h4v4k17","type":"button"}
05:10:34.756 +3.19s INFO  dnd.ok [dnd#1 · 425 ms] Ajouté dans Colonne, position 1 {"id":"n_0k0h4v4k17","type":"button","kind":"new","parentId":"n_3j1z401m2e","parentType":"column","index":0,"where":"canevas"}
```
**Expected log** — move with the ✥ handle ([`journaux/edition-deplacer.log`](../journaux/edition-deplacer.log))
```log
05:10:35.597 +4.03s INFO  dnd.start [dnd#2] Glisser : Bouton {"kind":"move","type":"button","id":"n_5x206n134e","from":"page ou structure"}
05:10:35.988 +4.42s DEBUG store.commit Modification {"source":"dnd","past":3,"page":"p_7mv9bc93"}
05:10:35.993 +4.42s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"dnd","mode":"contenu","ms":3}
05:10:36.003 +4.43s INFO  dnd.ok [dnd#2 · 406 ms] Déplacé dans Colonne, position 1 {"id":"n_5x206n134e","type":"button","kind":"move","parentId":"n_2e4h0v2s04","parentType":"column","index":0,"where":"canevas"}
```
To check: a `dnd` run: `dnd.start` (`kind`: widget, section, template, component or move; `from`) → `dnd.ok` with `parentType`, `index` (starting from 0) and `where` (canevas or structure). While dragging, each new target place gives `dnd.target` (TRACE), and automatic scrolling near the edges gives `dnd.autoscroll` (TRACE): set the log to `trace` to see them.

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| Reordering in the Structure panel | drop line in the tree | `dnd.ok` with `"where":"structure"` ([`journaux/edition-structure-reordonner.log`](../journaux/edition-structure-reordonner.log)) |
| Dragging a template or a component | | `dnd.start` `{"kind":"template"}` / `{"kind":"component"}` (chapter 3) |
| Dropping in the same place | nothing changes | `dnd.cancel` (INFO) `{"reason":"noop"}` |
| Dropping outside the canvas and the Structure panel | nothing changes | `dnd.cancel` `{"reason":"outside"}` ([`journaux/edition-glisser-dehors.log`](../journaux/edition-glisser-dehors.log)) |
| Esc while dragging | thumbnail and line disappear | `dnd.cancel` `{"by":"Échap"}` ([`journaux/edition-glisser-echap.log`](../journaux/edition-glisser-echap.log)) |
| The browser interrupts the gesture (window left, touch) | same | `dnd.cancel` `{"by":"interrompu par le navigateur"}` |
| Simple click (less than 5 px of movement) | it is a click: selection or adding | no `dnd.*` |

**Errors and refusals**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Forbidden place (a section on a widget, an element inside its own content) | no blue line; when you let go, nothing changes | `dnd.refused` (WARN) `{"reason":"forbidden"}` then `dnd.cancel` ([`journaux/edition-glisser-refuse.log`](../journaux/edition-glisser-refuse.log)) | a section goes in the page, a row in a section, a widget in a column |
| The core refuses the drop at the last moment | nothing changes | `dnd.refused` `{"reason":"invalid"}` then `dnd.cancel` | try again slightly to one side; if it keeps happening, send the log |
| Error during the drop | red message | `dnd.fail` (ERROR) with `error` | Ctrl+Z then send the log |
| The dragged element no longer exists (component deleted in the meantime) | nothing happens | `dnd.unknown` (WARN) | reopen the Templates panel |
| Review mode | “Review mode…” | `store.readonly` (WARN) then `dnd.cancel` `{"reason":"readonly"}` | — |

**Expected log** — drop refused ([`journaux/edition-glisser-refuse.log`](../journaux/edition-glisser-refuse.log))
```log
05:10:38.014 +6.45s INFO  dnd.start [dnd#5] Glisser : Section {"kind":"move","type":"section","id":"n_43295m1m6y","from":"page ou structure"}
05:10:38.426 +6.86s WARN  dnd.refused [dnd#5 · 412 ms] Dépôt refusé : « section » ne peut pas aller à cet endroit (une section va dans la page, un widget dans une colonne, et rien dans son propre contenu) {"type":"section","reason":"forbidden"}
05:10:38.426 +6.86s INFO  dnd.cancel [dnd#5 · 412 ms] Rien n’a changé {"reason":"forbidden"}
```

---

## 2.5 Write a text in the page

**Goal**: change a heading, a paragraph or the text of a button directly in the page.

**Steps**
1. Double-click the text (or select the element and press Enter, or right-click → “Edit text”).
2. Type. A heading or a button is finished with **Enter**; a paragraph with **Esc** or a click elsewhere.

**What you see**: a blue outline around the text, with the cursor inside; for rich text, the **B I U 🔗 ⌫ ✨** bar above it. The whole typing session counts as **a single** undo step.

**Expected log** ([`journaux/edition-texte-titre.log`](../journaux/edition-texte-titre.log))
```log
05:10:40.328 +8.76s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:40.340 +8.77s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"text","id":"n_2l6m0w3e5i"}
05:10:40.341 +8.77s INFO  edit.start [edit#1] Édition dans la page : heading · text {"id":"n_2l6m0w3e5i","type":"heading","key":"text","field":"inline","lang":"fr","chars":56}
05:10:40.511 +8.94s DEBUG canvas.key Raccourci dans la page : Ctrl+A {"key":"Ctrl+A","in":"texte","selected":"n_2l6m0w3e5i"}
05:10:40.519 +8.95s DEBUG store.commit Modification {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","past":5,"page":"p_7mv9bc93"}
05:10:40.548 +8.98s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.576 +9.01s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.592 +9.02s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.621 +9.05s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.641 +9.07s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.660 +9.09s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.680 +9.11s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.702 +9.13s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.725 +9.16s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.754 +9.19s DEBUG store.commit Modification (même étape d’annulation) {"key":"edit-n_2l6m0w3e5i-text-1","source":"canvas","merged":true,"past":5,"page":"p_7mv9bc93"}
05:10:40.775 +9.21s INFO  edit.ok [edit#1 · 434 ms] Édition terminée : texte enregistré (une seule étape d’annulation) {"id":"n_2l6m0w3e5i","key":"text","changed":true,"chars":11,"before":56,"inputs":11}
05:10:40.779 +9.21s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"edit-done","mode":"contenu","ms":3}
```
To check: `edit.dblclick` → `edit.start` (`edit#n` run: type, field `key`, field type `field`, language, length `chars`) → `store.commit` lines “same undo step” (one per letter) → `edit.ok` with `changed`, `chars` (final length), `before` (length at the start) and `inputs` (number of changes). **The text itself is never written to the log**, only its length. Each letter also gives `edit.input` (TRACE).

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| Enter on a selected element, or “Edit text” menu | editing starts on its first text | `canvas.key` Enter then `edit.keyboard` (DEBUG), `edit.start` |
| Nothing changed | | `edit.ok` “Édition terminée sans changement” `{"changed":false}` |
| Enter on an element with no text (image, divider, section…) | nothing | `edit.no-text` (DEBUG) |
| Double-click on a text that can only be set in the inspector | nothing in the page | `edit.not-editable` (DEBUG) `{"field":…}` |
| Ctrl+Z while writing | writing stops, then the whole typing session is undone | `edit.ok`, `canvas.key` Ctrl+Z, `store.undo` ([`journaux/edition-texte-annuler.log`](../journaux/edition-texte-annuler.log)) |
| The canvas is reloaded while writing (another page, another language) | writing stops; what you typed is kept | `edit.cancel` (INFO) `{"changed":…}` |
| Writing in another language (list of languages at the top) | only that language changes | `edit.start` `{"lang":"nl"}` |
| Writing in a component or the header | every place it is used follows | `edit.start` `{"edit":"component"}` |

**Errors and refusals**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Review mode | “Review mode: you can comment (💬), not edit.” | `edit.readonly` (WARN) | — |
| Text linked to a collection field (in a card) | “This text comes from the “…” field of each item…” | `edit.bound` (WARN) `{"field":…,"collection":…}` | edit it in Content, or unlink it in the inspector (chapter 4) |
| The element was deleted while you were writing (by another participant) | the text disappears with it | `edit.node-gone` (WARN) with `error` | Ctrl+Z if it was you; otherwise, check with the other person |

**Expected log** — refusal and Enter ([`journaux/edition-texte-refus.log`](../journaux/edition-texte-refus.log))
```log
05:10:43.044 +11.47s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:43.058 +11.49s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"text","id":"n_2l6m0w3e5i"}
05:10:43.058 +11.49s WARN  edit.readonly Édition refusée : mode relecture {"id":"n_2l6m0w3e5i","key":"text"}
05:10:43.059 +11.49s INFO  ui.toast Message affiché : Mode relecture : vous pouvez commenter (💬), pas modifier.
05:10:43.237 +11.67s DEBUG store.select Sélection : image {"id":"n_525b6p2v6j","type":"image"}
05:10:43.246 +11.68s DEBUG canvas.key Raccourci dans la page : Enter {"key":"Enter","in":"page","selected":"n_525b6p2v6j"}
05:10:43.247 +11.68s DEBUG edit.no-text Rien à écrire dans l’élément sélectionné (pas de texte modifiable) {"id":"n_525b6p2v6j"}
…
05:10:43.388 +11.82s DEBUG store.select Sélection : button {"id":"n_5x206n134e","type":"button"}
05:10:43.396 +11.83s DEBUG canvas.key Raccourci dans la page : Enter {"key":"Enter","in":"page","selected":"n_5x206n134e"}
05:10:43.396 +11.83s DEBUG edit.keyboard Édition demandée au clavier ou par le menu {"id":"n_5x206n134e"}
05:10:43.396 +11.83s INFO  edit.start [edit#4] Édition dans la page : button · label {"id":"n_5x206n134e","type":"button","key":"label","field":"text","lang":"fr","chars":14}
05:10:43.553 +11.98s INFO  edit.ok [edit#4 · 157 ms] Édition terminée sans changement {"id":"n_5x206n134e","key":"label","changed":false,"chars":14,"before":14,"inputs":0}
…
```

---

## 2.6 Format, add a link, paste

**Goal**: make a word bold, italic, underlined or a link; paste a text copied from elsewhere.

**Steps**
1. While writing a rich text, select a few words.
2. Click **B**, **I**, **U** (or Ctrl+B, Ctrl+I, Ctrl+U), **⌫** to remove the formatting.
3. Link: **🔗**, type the address, Enter (Esc gives up). On an existing link, 🔗 removes it.
4. Paste (Ctrl+V): the text is **always pasted without its formatting**, to keep the site clean.

**What you see**: the formatting straight away; the active button is highlighted. The element selection does not change when you click the bar.

**Expected log** ([`journaux/edition-texte-riche.log`](../journaux/edition-texte-riche.log))
```log
05:10:41.109 +9.54s DEBUG store.select Sélection : text {"id":"n_4y660b0u1y","type":"text"}
05:10:41.127 +9.56s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"content","id":"n_4y660b0u1y"}
05:10:41.127 +9.56s INFO  edit.start [edit#2] Édition dans la page : text · content {"id":"n_4y660b0u1y","type":"text","key":"content","field":"richtext","lang":"fr","chars":161}
05:10:41.361 +9.79s DEBUG edit.format Mise en forme : bold (appliquée) {"cmd":"bold","action":"add","chars":6,"where":"page"}
…
05:10:41.499 +9.93s DEBUG edit.format Mise en forme : italic (appliquée) {"cmd":"italic","action":"add","chars":6,"where":"page"}
…
05:10:41.517 +9.95s DEBUG canvas.key Raccourci dans la page : Ctrl+I {"key":"Ctrl+I","in":"texte","selected":"n_4y660b0u1y"}
05:10:41.658 +10.09s DEBUG edit.link-open Champ d’adresse du lien ouvert {"chars":6}
05:10:41.724 +10.15s WARN  edit.link-invalid Lien refusé : adresse non autorisée (javascript:alert(1)). Utilise https://, mailto:, tel: ou #ancre {"url":"javascript:alert(1)","where":"page"}
05:10:41.873 +10.30s DEBUG edit.link-open Champ d’adresse du lien ouvert {"chars":6}
05:10:41.895 +10.33s DEBUG edit.format Mise en forme : link (appliquée) {"cmd":"link","action":"add","chars":6,"where":"page","url":"https://exemple.be"}
…
05:10:41.907 +10.34s DEBUG canvas.key Raccourci dans la page : Enter {"key":"Enter","in":"champ","selected":"n_4y660b0u1y"}
05:10:42.029 +10.46s DEBUG edit.paste Collage en texte brut : 26 caractère(s), mise en forme et balises retirées {"chars":26,"lines":2,"rich":true,"inline":false,"where":"page"}
…
05:10:42.147 +10.58s INFO  edit.ok [edit#2 · 1020 ms] Édition terminée : texte enregistré (une seule étape d’annulation) {"id":"n_4y660b0u1y","key":"content","changed":true,"chars":188,"before":161,"inputs":4}
05:10:42.150 +10.58s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"edit-done","mode":"contenu","ms":3}
```
To check: `edit.format` gives the command (`bold`, `italic`, `underline`, `link`, `clear`), `action` (`add` or `remove`), the selected length and `where` (page or inspector); an accepted link carries its address (60 characters at most). `edit.paste` gives the length and the number of lines pasted, and `"rich":true` when the clipboard contained formatting (removed).

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| Ctrl+B / Ctrl+I / Ctrl+U | same as the button | `edit.format` then `canvas.key` (the formatting comes before the key line) |
| Button with no text selected, or cursor outside the text | nothing | `edit.format-none` (DEBUG) `{"reason":"empty"}` or `"no-selection"` |
| 🔗 with no selection | nothing | `edit.link-none` (DEBUG) |
| Esc in the address field | the field closes, the text stays selected | `edit.link-cancel` (DEBUG) |
| Same bar in a “rich text” field of the inspector | same | `edit.format` with `"where":"inspecteur"` |
| Pasting a file (copied image) | nothing is pasted | `edit.paste-file` (WARN): use an Image widget |
| Dropping a dragged text or image into the text being written | refused | `edit.drop-blocked` (DEBUG) |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Link address not allowed (`javascript:`, empty address…) | the link is not created | `edit.link-invalid` (WARN) `{"url":…}` | use `https://…`, `mailto:…`, `tel:…`, `#ancre` (an anchor) or a page of the site |

---

## 2.7 ✨ menu in a text (on-device AI)

**Goal**: have the device's AI rewrite or proofread the selected passage, without leaving the page.

**Steps**
1. While writing a rich text, select a passage (otherwise the paragraph where the cursor is will be used).
2. ✨ → choose “Shorter”, “Simpler”… or “Proofread”.
3. Read the suggestion: **Replace** or **Cancel**.

**What you see**: the suggestion under the bar; after “Replace”, the text is marked “to review”.

**Expected log** (real extract from chapter 7: [`journaux/ia-reformuler-repli.log`](../journaux/ia-reformuler-repli.log))
```log
04:57:33.954 +1.15s DEBUG edit.dblclick Double-clic sur un texte de la page {"key":"content","id":"n_3m1c330z5t"}
04:57:33.955 +1.15s INFO  edit.start [edit#1] Édition dans la page : text · content {"id":"n_3m1c330z5t","type":"text","key":"content","field":"richtext","lang":"fr","chars":161}
…
04:57:34.225 +1.42s DEBUG edit.ai-menu [edit#1 · 270 ms] Menu ✨ ouvert {"open":true,"modes":["shorter","simpler","formal","friendly","longer"]}
04:57:34.274 +1.47s DEBUG edit.ai-ask [edit#1 · 319 ms] Demande à l’IA locale : shorter {"mode":"shorter","chars":161,"selection":true}
…
04:57:34.278 +1.48s INFO  ai.rewrite.start [ai.rewrite#1] IA locale : reformuler {"task":"rewrite","inLen":161,"excerpt":"Le MAB réunit les médias alternatifs belges. Nous partageon…","mode":"shorter","lang":"fr","gen":"fr","api":"prompt","source":"test"}
…
04:57:34.280 +1.48s INFO  ai.rewrite.ok [ai.rewrite#1 · 2 ms] Reformuler : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"outLen":44,"excerpt":"Le MAB réunit les médias alternatifs belges."}
04:57:34.281 +1.48s DEBUG edit.ai-proposal [edit#1 · 326 ms] Proposition de l’IA affichée (Remplacer ou Annuler) {"chars":44}
…
04:57:34.330 +1.53s DEBUG ai.mark Texte de l’IA appliqué et marqué « à relire » {"nodeId":"n_3m1c330z5t","field":"content","lang":"fr"}
…
04:57:34.337 +1.53s INFO  edit.ai-apply [edit#1 · 382 ms] Proposition de l’IA appliquée (texte marqué « à relire ») {"id":"n_3m1c330z5t","key":"content","chars":44}
…
```
To check: within the `edit#n` run, `edit.ai-menu` (menu opened, modes offered) → `edit.ai-ask` (mode, target length) → the `ai.*` lines of the call (chapter 7) → `edit.ai-proposal` → `edit.ai-apply` (INFO). The AI call itself is logged by `ai.*`.

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| ✨ a second time | the menu closes | `edit.ai-menu` `{"open":false}` |
| “Cancel” (or “Close” after a proofread with no mistakes) | the suggestion disappears | `edit.ai-cancel` (INFO) `{"pending":true}` |
| “Proofread” with no mistake found | “✓ No mistakes found.” | `edit.ai-proposal` `{"corrections":0}` |
| Writing ended before the answer | the suggestion is ignored | `edit.ai-stale` (DEBUG) |
| “Replace” when the suggestion has already been used | nothing | `edit.ai-apply-none` (DEBUG) |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| On-device AI missing or failing | AI message (see chapter 7) | `ai.*` (WARN or ERROR), then `edit.ai-none` (WARN) | open ✨ On-device AI (top bar) to see its status |
| Nothing selected and cursor outside a paragraph | “Select some text…” | `edit.ai-empty` (WARN) | select a passage |
| AI module not loaded (missing file) | “On-device AI not loaded.” | `edit.ai-unavailable` (WARN) | reload the editor without the cache |

---

## 2.8 Copy, cut, paste, duplicate, delete, move

**Goal**: reorganise the page with the keyboard or the element's bar.

**Steps**
1. Select an element.
2. Ctrl+C copies, Ctrl+X cuts, Ctrl+V pastes after the selection (or inside it if it is a container that accepts it), Ctrl+D (or ⧉) duplicates, Delete (or ✕) deletes, Alt+↑ / Alt+↓ move.

**What you see**: the result straight away; a short message for copy and cut. The clipboard is Atelier's own (it does not use the computer's clipboard).

**Expected log** ([`journaux/edition-copier-coller.log`](../journaux/edition-copier-coller.log))
```log
05:10:43.879 +12.31s DEBUG canvas.key Raccourci dans la page : Ctrl+C {"key":"Ctrl+C","in":"page","selected":"n_5x206n134e"}
05:10:43.880 +12.31s INFO  action.copy Copié : Bouton {"id":"n_5x206n134e","type":"button","nodes":1}
05:10:43.880 +12.31s INFO  ui.toast Message affiché : « Bouton » copié. Sélectionnez un emplacement puis Ctrl+V.
05:10:43.889 +12.32s DEBUG canvas.key Raccourci dans la page : Ctrl+V {"key":"Ctrl+V","in":"page","selected":"n_5x206n134e"}
…
05:10:43.905 +12.34s DEBUG store.select Sélection : button {"id":"n_2s1e5v6x46","type":"button"}
05:10:43.916 +12.35s INFO  action.paste Collé : button {"id":"n_2s1e5v6x46","type":"button","parentType":"column","after":"n_5x206n134e"}
05:10:44.083 +12.51s DEBUG canvas.key Raccourci dans la page : Ctrl+D {"key":"Ctrl+D","in":"page","selected":"n_2s1e5v6x46"}
…
05:10:44.092 +12.52s DEBUG store.select Sélection : button {"id":"n_085o4f0b3d","type":"button"}
05:10:44.098 +12.53s INFO  action.duplicate Dupliqué : button {"id":"n_2s1e5v6x46","newId":"n_085o4f0b3d","type":"button"}
05:10:44.256 +12.69s DEBUG canvas.key Raccourci dans la page : Delete {"key":"Delete","in":"page","selected":"n_085o4f0b3d"}
…
05:10:44.264 +12.70s DEBUG store.select Sélection : heading {"id":"n_406k6i0v4u","type":"heading"}
05:10:44.269 +12.70s INFO  action.delete Supprimé : button {"id":"n_085o4f0b3d","type":"button","next":"n_406k6i0v4u"}
05:10:44.424 +12.86s DEBUG canvas.key Raccourci dans la page : Ctrl+X {"key":"Ctrl+X","in":"page","selected":"n_406k6i0v4u"}
05:10:44.424 +12.86s INFO  action.cut Coupé : Titre (dans le presse-papiers d’Atelier) {"id":"n_406k6i0v4u","type":"heading"}
…
05:10:44.433 +12.86s DEBUG store.select Sélection : text {"id":"n_4y660b0u1y","type":"text"}
05:10:44.439 +12.87s INFO  action.delete Supprimé : heading {"id":"n_406k6i0v4u","type":"heading","next":"n_4y660b0u1y"}
05:10:44.440 +12.87s INFO  ui.toast Message affiché : « Titre » coupé. Sélectionnez la destination puis Ctrl+V.
05:10:44.605 +13.04s DEBUG canvas.key Raccourci dans la page : Ctrl+V {"key":"Ctrl+V","in":"page","selected":"n_4y660b0u1y"}
…
05:10:44.616 +13.05s DEBUG store.select Sélection : heading {"id":"n_3l0j1o2032","type":"heading"}
05:10:44.626 +13.06s INFO  action.paste Collé : heading {"id":"n_3l0j1o2032","type":"heading","parentType":"column","after":"n_4y660b0u1y"}
05:10:44.796 +13.23s DEBUG canvas.key Raccourci dans la page : Alt+ArrowUp {"key":"Alt+ArrowUp","in":"page","selected":"n_3l0j1o2032"}
…
05:10:44.821 +13.25s INFO  action.move Monté : heading {"id":"n_3l0j1o2032","type":"heading","delta":-1,"index":3}
```
To check: each key gives `canvas.key` (or `ui.key` if the focus is outside the canvas), then the `action.*` line (INFO) with the identifier and the type. Cut = `action.cut` then `action.delete`. `action.delete` shows the element selected afterwards (`next`).

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| ⧉ ✕ buttons on the element's bar | same | `canvas.toolbar` `{"act":"duplicate"}` / `{"act":"delete"}` then `action.duplicate` / `action.delete` |
| Context menu (2.12) | same | `ctxmenu.action` then `action.*` |
| Alt+↑ on the first element (or Alt+↓ on the last) | nothing | `action.move-edge` (DEBUG) |
| Paste with an empty clipboard (context menu) | nothing | `action.paste-empty` (DEBUG) |
| Several elements selected | duplicate and delete act on all of them | `action.duplicate` / `action.delete` `{"count":3}` (2.10) |

**Errors and refusals**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| Pasting a column or a row where it cannot go | “This element can’t be pasted here: select a column or a section.” | `action.refused` (WARN) `{"action":"coller"}` + `ui.toast` (ERROR) ([`journaux/edition-coller-refuse.log`](../journaux/edition-coller-refuse.log)) | select a row (for a column) or a section (for a row) |
| Cutting several elements at once | “Cut works on one element at a time.” | `action.refused` `{"action":"couper","multi":3}` | cut them one by one, or duplicate / delete them as a group |
| Any other rule of the core | the rule's message | `action.refused` with `error.message` | read the message; otherwise send the log |

**Expected log** — paste refused
```log
05:10:45.135 +13.57s DEBUG canvas.key Raccourci dans la page : Ctrl+V {"key":"Ctrl+V","in":"page","selected":"n_2l6m0w3e5i"}
05:10:45.135 +13.57s WARN  action.refused Action « coller » refusée : Impossible de coller cet élément ici : sélectionnez une colonne ou une section. {"action":"coller","selected":"n_2l6m0w3e5i","type":"heading","error":{"name":"Error","message":"Impossible de coller cet élément ici : sélectionnez une colonne ou une section.","stack":"Error: Impossible de coller cet élément ici : sélectionnez une colonne ou une section.\nat http://localhost:8791/editor/actions.js:126:19\nat safe (http://localhost:8791/editor/actions.js:11:16)\nat pasteClipboard (http://localhost:8791/editor/actions.js:112:3)\nat handleKey (http://localhost:8791/editor/app.js:132:70)"}}
05:10:45.136 +13.57s ERROR ui.toast Message affiché : Impossible de coller cet élément ici : sélectionnez une colonne ou une section. {"type":"error"}
```

---

## 2.9 Undo and redo

**Goal**: go back, then redo.

**Steps**: Ctrl+Z (or ↶) undoes; Ctrl+Y or Ctrl+Shift+Z (or ↷) redoes. Up to 150 steps.

**What you see**: the page goes back to its previous state, with the selection you had then.

**Expected log** ([`journaux/edition-annuler-retablir.log`](../journaux/edition-annuler-retablir.log))
```log
05:10:45.334 +13.77s DEBUG canvas.key Raccourci dans la page : Ctrl+D {"key":"Ctrl+D","in":"page","selected":"n_2l6m0w3e5i"}
…
05:10:45.351 +13.78s INFO  action.duplicate Dupliqué : heading {"id":"n_2l6m0w3e5i","newId":"n_67326a584k","type":"heading"}
05:10:45.510 +13.94s DEBUG canvas.key Raccourci dans la page : Ctrl+Z {"key":"Ctrl+Z","in":"page","selected":"n_67326a584k"}
05:10:45.511 +13.94s INFO  store.undo Annuler {"left":12,"redo":1}
…
05:10:45.688 +14.12s DEBUG canvas.key Raccourci dans la page : Ctrl+Y {"key":"Ctrl+Y","in":"page","selected":"n_2l6m0w3e5i"}
05:10:45.688 +14.12s INFO  store.redo Rétablir {"left":0}
…
05:10:45.868 +14.30s DEBUG canvas.key Raccourci dans la page : Ctrl+Maj+Z {"key":"Ctrl+Maj+Z","in":"page","selected":"n_67326a584k"}
05:10:45.868 +14.30s DEBUG store.redo-none Rétablir : rien à rétablir
05:10:46.044 +14.47s DEBUG ui.click Clic : ↶ {"el":"button","id":"undoBtn","text":"↶"}
05:10:46.045 +14.48s INFO  store.undo Annuler {"left":12,"redo":1}
…
```
To check: `store.undo` / `store.redo` (INFO) with the number of remaining steps (`left`); with the keyboard, the key just before (`canvas.key` in the page, `ui.key` elsewhere), with the button `ui.click`.

**Variants**
| Situation | What changes on screen | Log |
|---|---|---|
| Nothing to undo / redo | nothing | `store.undo-none` / `store.redo-none` (DEBUG) |
| Ctrl+Z while writing a text | writing stops, the whole typing session is undone | `edit.ok` then `store.undo` (2.5) |
| Ctrl+Z in an inspector field | the field undoes its own typing (browser behaviour) | `ui.key` only, no `store.undo` |
| Review mode | nothing | `store.undo-none` “Undo: not possible in review mode” |

**Errors**: none expected.

---

## 2.10 Multiple selection

**Goal**: adjust, duplicate or delete several elements at once.

**Steps**
1. Select an element, then Shift+click others (in the page or in Structure). Shift+click on an element already selected removes it.
2. Ctrl+D, Delete, or settings in the Style tab: they apply to all of them.
3. Esc goes back to a single element.

**What you see**: numbered dotted blue frames; the inspector shows “3 elements selected” and only the Style tab.

**Expected log** ([`journaux/edition-selection-multiple.log`](../journaux/edition-selection-multiple.log))
```log
05:10:46.307 +14.74s DEBUG store.multi Sélection multiple : 2 {"ids":["n_2l6m0w3e5i","n_3l0j1o2032"]}
05:10:46.373 +14.80s DEBUG store.multi Sélection multiple : 3 {"ids":["n_2l6m0w3e5i","n_3l0j1o2032","n_1r5g674a09"]}
05:10:46.563 +14.99s DEBUG canvas.key Raccourci dans la page : Ctrl+X {"key":"Ctrl+X","in":"page","selected":"n_1r5g674a09"}
05:10:46.563 +14.99s WARN  action.refused Action « couper » refusée : un seul élément à la fois {"action":"couper","multi":3}
05:10:46.563 +14.99s ERROR ui.toast Message affiché : Couper fonctionne sur un seul élément à la fois. {"type":"error"}
05:10:46.574 +15.01s DEBUG canvas.key Raccourci dans la page : Ctrl+D {"key":"Ctrl+D","in":"page","selected":"n_1r5g674a09"}
…
05:10:46.604 +15.04s INFO  action.duplicate 3 éléments dupliqués {"count":3,"ids":["n_3w4w100d65","n_1o3o1b1760","n_17320z0265"]}
05:10:46.604 +15.04s INFO  ui.toast Message affiché : 3 éléments dupliqués.
05:10:46.769 +15.20s DEBUG canvas.key Raccourci dans la page : Ctrl+Z {"key":"Ctrl+Z","in":"page","selected":"n_17320z0265"}
05:10:46.769 +15.20s INFO  store.undo Annuler {"left":12,"redo":1}
…
05:10:46.997 +15.43s DEBUG store.select Sélection : heading {"id":"n_2l6m0w3e5i","type":"heading"}
05:10:47.040 +15.47s DEBUG store.multi Sélection multiple : 2 {"ids":["n_2l6m0w3e5i","n_3l0j1o2032"]}
05:10:47.064 +15.49s DEBUG canvas.key Raccourci dans la page : Escape {"key":"Escape","in":"page","selected":"n_3l0j1o2032"}
```
To check: `store.multi` (number and identifiers) at each Shift+click; `action.duplicate` `{"count":3}`. The final Esc has no other line than `canvas.key`: the multiple selection is simply cleared.

**Variants**
| Situation | Log |
|---|---|
| Style set on the selection | `style.set` with `"target":"multi","count":3` (chapter 3) |
| Paste the style onto all of them | `style.paste` `{"count":3}` |
| Delete all of them | `action.delete` `{"count":3}` and the message “3 elements deleted (Ctrl+Z to undo).” |

**Errors**: cutting several elements is refused (`action.refused`, see 2.8).

---

## 2.11 Structure panel

**Goal**: see the page's tree (sections, rows, columns, widgets), select things that are hard to catch in the page, reorder.

**Steps**
1. Left-hand “Structure” panel.
2. ▾ / ▸ collapse and expand; with the keyboard: ↑ ↓ Home End to move through, ← / → to collapse / expand, Enter or Space to select (Shift+Enter adds to the multiple selection).
3. Drag a line to reorder (2.4); right-click for the context menu (2.12).

**What you see**: the tree follows the selection and the hovering in the page. ◌ marks an element hidden on a device.

**Expected log** ([`journaux/edition-structure.log`](../journaux/edition-structure.log))
```log
05:10:39.654 +8.09s DEBUG structure.open Panneau Structure ouvert {"rows":32}
…
05:10:39.853 +8.28s DEBUG structure.collapse Replié : Section {"id":"n_4q1f2f251a","type":"section","collapsed":true,"children":1,"by":"clic"}
05:10:39.986 +8.42s DEBUG structure.collapse Déplié : Section {"id":"n_4q1f2f251a","type":"section","collapsed":false,"children":1,"by":"clic"}
05:10:40.102 +8.53s DEBUG structure.collapse Replié (←) {"id":"n_4q1f2f251a","collapsed":true,"by":"clavier"}
05:10:40.107 +8.54s DEBUG structure.collapse Déplié (→) {"id":"n_4q1f2f251a","collapsed":false,"by":"clavier"}
05:10:40.114 +8.54s DEBUG structure.key Structure : sélection au clavier {"id":"n_4q1f2f251a","key":"Entrée"}
05:10:40.114 +8.54s DEBUG store.select Sélection : section {"id":"n_4q1f2f251a","type":"section"}
```
To check: `structure.open` (number of lines), `structure.collapse` (`collapsed`, `by`: click or keyboard), `structure.key` then `store.select`. Keyboard moves in the tree and each redraw of the tree give `structure.key` / `structure.render` at TRACE.

**Variants**
| Situation | Log |
|---|---|
| Reordering by dragging a line | `dnd.start` then `dnd.ok` `{"where":"structure"}` |
| Right-click on a line | `ctxmenu.open` `{"from":"structure"}` |
| Renaming an element | not available: the name shown comes from the type and the content (heading, text…); change the content in the inspector |

**Errors**: a line dropped in a forbidden place is refused (`dnd.refused`, 2.4).

---

## 2.12 Context menu (right-click)

**Goal**: find all of an element's actions in one place.

**Steps**: right-click an element (page or Structure); ↑ / ↓ to move through, Enter or click to choose, Esc to close.

**What you see**: Edit text, Create a component…, Duplicate, Copy, Paste, Copy style / Paste style, Move up, Move down, Select parent, Delete. Actions that are not possible are greyed out.

**Expected log** ([`journaux/edition-menu-contextuel.log`](../journaux/edition-menu-contextuel.log))
```log
05:10:47.253 +15.68s DEBUG ctxmenu.open Menu contextuel : Titre (page) {"id":"n_3l0j1o2032","type":"heading","from":"canevas","items":11,"disabled":["pasteStyle"]}
…
05:10:47.436 +15.87s DEBUG ctxmenu.action Menu contextuel : Dupliquer {"action":"duplicate","id":"n_3l0j1o2032","type":"heading"}
…
05:10:47.445 +15.88s DEBUG store.select Sélection : heading {"id":"n_342l0z0m2a","type":"heading"}
05:10:47.452 +15.88s INFO  action.duplicate Dupliqué : heading {"id":"n_3l0j1o2032","newId":"n_342l0z0m2a","type":"heading"}
05:10:47.691 +16.12s DEBUG store.select Sélection : heading {"id":"n_3l0j1o2032","type":"heading"}
05:10:47.697 +16.13s DEBUG ctxmenu.open Menu contextuel : Titre (page) {"id":"n_3l0j1o2032","type":"heading","from":"canevas","items":11,"disabled":["pasteStyle"]}
05:10:47.813 +16.24s DEBUG ctxmenu.close Menu contextuel fermé (Échap) {"by":"Échap"}
```
To check: `ctxmenu.open` (element, `from`: canvas or structure, number of actions, greyed-out actions `disabled`) → `ctxmenu.action` (the action chosen) → the action's line (`action.duplicate`…). `ctxmenu.close` says why the menu closed (`Échap`, `clic ailleurs`, `défilement`, `fenêtre quittée`…: Esc, click elsewhere, scrolling, window left); after an action, there is no closing line.

**Variants**
| Situation | Log |
|---|---|
| Right-click on the page itself (outside the elements) | the browser's menu, no line; on an element that cannot be found: `ctxmenu.none` (DEBUG) |
| Right-click in a text being written | the browser's menu (spell checker) |
| “Edit text” | `ctxmenu.action` `{"action":"edit"}` then `edit.keyboard`, `edit.start` |
| “Create a component…” | `action.component-create` (chapter 3) |

**Errors**: those of the chosen action (`action.refused`…).

---

## 2.13 Command bar (Ctrl+K)

**Goal**: do everything with the keyboard: add a widget, a template, a component, open a window, set a style…

**Steps**
1. Ctrl+K (or ⌘K), type a few letters (“add divider”, “log”, “margin”…).
2. ↑ / ↓ then Enter.

**What you see**: the filtered list; the command runs and the bar closes.

**Expected log** ([`journaux/edition-ctrl-k.log`](../journaux/edition-ctrl-k.log))
```log
05:10:48.163 +16.59s DEBUG canvas.key Raccourci dans la page : Ctrl+K {"key":"Ctrl+K","in":"page","selected":"n_4y660b0u1y"}
05:10:48.167 +16.60s DEBUG ui.dialog.open Fenêtre ouverte : cmdk {"id":"cmdk","class":"cmdk","modal":true}
05:10:48.495 +16.93s INFO  cmdk.run Commande : Ajouter : Séparateur {"id":"add:divider","query":"ajouter séparateur"}
…
05:10:48.506 +16.94s DEBUG store.select Sélection : divider {"id":"n_3g0r041547","type":"divider"}
05:10:48.512 +16.94s INFO  action.add Widget ajouté : Séparateur {"type":"divider","id":"n_3g0r041547","parentType":"column"}
05:10:48.516 +16.95s DEBUG ui.dialog.close Fenêtre fermée : cmdk {"id":"cmdk"}
…
```
To check: the key (`canvas.key` or `ui.key` Ctrl+K), `ui.dialog.open` (cmdk), `cmdk.run` with the command's identifier (`add:divider`, `tpl:hero`, `cmp:…`, `act:log`…) and what you had typed, then the action's line (`action.add`…).

**Variants**
| Situation | Log |
|---|---|
| “Template: …” command | `cmdk.run` `{"id":"tpl:…"}` then `action.add-section` |
| Command for a style setting (“Margin…”) | `cmdk.run` then `style.focus` (the setting is highlighted in the Style tab); setting not available for this element: `style.focus-missing` |
| Ctrl+K while writing a text | nothing: the key is left to the text |
| Esc | `ui.dialog.close` |

**Errors**
| Situation | Message shown | Log | What to do |
|---|---|---|---|
| The command crashes | red message | `cmdk.fail` (ERROR) `{"id":…,"error":…}` | send the log |
| The action is refused by a rule | the rule's message | `cmdk.run` then `action.refused` (WARN) | select another place |

---

## 2.14 Keyboard shortcuts

“?” (outside a field) shows the shortcut help. The **Log** column gives the expected lines. In the page, the key itself gives `canvas.key` (DEBUG, except the arrows at TRACE); outside the page (Structure, inspector, top bar), `ui.key` — but only for combinations with Ctrl, Alt or ⌘, and for Esc, Delete and F1, F2, F5, F12.

| Shortcut | Where | Effect | Expected log |
|---|---|---|---|
| Click | page, Structure | select | `store.select` (Structure: `ui.click` before) |
| Shift+click | page, Structure | add to / remove from the selection | `store.multi` |
| ↑ ↓ ← → | page (element selected) | previous, next, parent, first child | `canvas.key` (TRACE) then `store.select` |
| Esc | page, element selected | select the parent | `canvas.key` Escape, `action.parent` (or `action.parent-none`) |
| Esc | multiple selection | go back to a single element | `canvas.key` Escape (or `ui.key`) |
| Esc | while dragging | cancel | `dnd.cancel` `{"by":"Échap"}` |
| Esc | text being written | finish | `canvas.key` Escape, `edit.ok` |
| Esc | context menu | close | `ctxmenu.close` `{"by":"Échap"}` |
| Esc | open window | close | `ui.key` Escape, `ui.dialog.close` |
| Enter | page, element selected | write its text | `canvas.key` Enter, `edit.keyboard`, `edit.start` (or `edit.no-text`) |
| Enter | heading or button being written | finish | `edit.ok` |
| Delete or Backspace | page, element selected | delete | `canvas.key` Delete / Backspace (or `ui.key` Delete), `action.delete` |
| Ctrl+C | element selected | copy | `canvas.key` Ctrl+C, `action.copy` |
| Ctrl+X | element selected | cut | `canvas.key` Ctrl+X, `action.cut`, `action.delete` (several: `action.refused`) |
| Ctrl+V | Atelier clipboard filled | paste | `canvas.key` Ctrl+V, `action.paste` (or `action.refused`) |
| Ctrl+D | element(s) selected, even in an inspector field | duplicate | `canvas.key` Ctrl+D (or `ui.key`), `action.duplicate` |
| Alt+↑ / Alt+↓ | element selected | move up / down | `canvas.key` Alt+ArrowUp, `action.move` (or `action.move-edge`) |
| Ctrl+Z | everywhere (except an inspector field) | undo | `canvas.key` / `ui.key` Ctrl+Z, `store.undo` (or `store.undo-none`) |
| Ctrl+Y, Ctrl+Shift+Z | everywhere (except a field) | redo | `canvas.key` / `ui.key`, `store.redo` (or `store.redo-none`) |
| Ctrl+B / Ctrl+I / Ctrl+U | rich text being written | bold / italic / underline | `edit.format`, `canvas.key` Ctrl+B… |
| Ctrl+V | text being written | paste without formatting | `canvas.key` Ctrl+V, `edit.paste` |
| Ctrl+A | text being written | select all | `canvas.key` Ctrl+A |
| Ctrl+K | everywhere (except a text being written) | command bar | `canvas.key` / `ui.key` Ctrl+K, `ui.dialog.open` (cmdk), then `cmdk.run` |
| Ctrl+S | everywhere | save the project as .json | `ui.key` Ctrl+S (or `canvas.key`), `project.export-json` |
| Ctrl+Alt+J | everywhere | 🐞 Debug log window | `ui.key` Ctrl+Alt+J, `ui.dialog.open` (logDialog) |
| ? | outside a field | shortcut help | `ui.dialog.open` (shortcutsDialog) |
| F1 | everywhere, even in an open window | user guide in a new tab (at the chapter about the open window; see chapter 1) | `ui.help` |
| ↑ ↓ Home End | Structure | move through the tree | `structure.key` (TRACE) |
| ← / → | Structure | collapse / expand (or parent / child) | `structure.collapse` `{"by":"clavier"}` |
| Enter, Space (Shift: multiple) | Structure | select | `structure.key`, `store.select` (or `store.multi`) |
| ↑ ↓ | context menu | move through | no line |
| Enter / Esc | link address field | confirm / give up | `edit.format` (`link`) or `edit.link-invalid` / `edit.link-cancel` |

**Expected log** — Alt+↓, Alt+↑, ?, Ctrl+S, Ctrl+Alt+J ([`journaux/edition-raccourcis.log`](../journaux/edition-raccourcis.log))
```log
05:10:48.896 +17.33s DEBUG canvas.key Raccourci dans la page : Alt+ArrowDown {"key":"Alt+ArrowDown","in":"page","selected":"n_2l6m0w3e5i"}
…
05:10:48.912 +17.34s INFO  action.move Descendu : heading {"id":"n_2l6m0w3e5i","type":"heading","delta":1,"index":1}
05:10:49.022 +17.45s DEBUG canvas.key Raccourci dans la page : Alt+ArrowUp {"key":"Alt+ArrowUp","in":"page","selected":"n_2l6m0w3e5i"}
…
05:10:49.045 +17.48s INFO  action.move Monté : heading {"id":"n_2l6m0w3e5i","type":"heading","delta":-1,"index":0}
05:10:49.171 +17.60s DEBUG ui.dialog.open Fenêtre ouverte : Raccourcis clavier {"id":"shortcutsDialog","class":"keys","modal":true}
05:10:49.345 +17.78s DEBUG ui.key Raccourci : Escape {"key":"Escape","in":"button"}
05:10:49.351 +17.78s DEBUG ui.dialog.close Fenêtre fermée : Raccourcis clavier {"id":"shortcutsDialog"}
05:10:49.457 +17.89s DEBUG ui.key Raccourci : Ctrl+S {"key":"Ctrl+S","in":"body"}
05:10:49.458 +17.89s INFO  project.export-json Projet enregistré en fichier .json {"kb":38,"pages":2}
…
05:10:49.461 +17.89s INFO  ui.toast Message affiché : Projet enregistré en fichier .json.
05:10:49.575 +18.01s DEBUG ui.key Raccourci : Ctrl+Alt+J {"key":"Ctrl+Alt+J","in":"body"}
05:10:49.581 +18.01s DEBUG ui.dialog.open Fenêtre ouverte : 🐞 Journal de débogage {"id":"logDialog","class":"audit log-dialog","modal":true}
…
05:10:49.851 +18.28s DEBUG ui.key Raccourci : Escape {"key":"Escape","in":"button"}
05:10:49.861 +18.29s DEBUG ui.dialog.close Fenêtre fermée : 🐞 Journal de débogage {"id":"logDialog"}
```

---

## 2.15 Header and footer in the page

**Goal**: understand why the header and the footer cannot be selected like everything else.

**Steps**: double-click the header or the footer.

**What you see**: as long as they have not been customised, a message: “To edit the header block by block: Site panel → “Customise”.” Once customised, the double-click opens their editing in blocks (chapter 3.12).

**Expected log** ([`journaux/edition-entete-verrouille.log`](../journaux/edition-entete-verrouille.log))
```log
05:10:50.011 +18.44s DEBUG store.select Sélection vidée {"id":null}
05:10:50.022 +18.45s INFO  canvas.zone-locked En-tête non personnalisé : à activer dans le panneau Site {"zone":"header"}
05:10:50.022 +18.45s INFO  ui.toast Message affiché : Pour modifier l’en-tête bloc par bloc : panneau Site → « Personnaliser ».
```
To check: `canvas.zone-locked` (INFO) `{"zone":"header"}` or `"footer"`.

**Variants**
| Situation | Log |
|---|---|
| Header or footer already customised | `canvas.dblclick` `{"target":"header"}` then `store.edit-target`, `canvas.load.start` |
| Double-click on a component instance | `canvas.dblclick` `{"target":"component"}` (chapter 3.11) |
| Double-click on a content list | `canvas.dblclick` `{"target":"card"}` (editing the card, chapter 4) |

**Errors**: none.

---

## 2.16 Button tooltips

**Goal**: know what an icon button does without clicking it.

**Steps**: leave the mouse on the button for a moment (a third of a second), or reach it with the keyboard using Tab.

**Normal path**: a dark bubble appears under the button (above it if there is no room, never outside the window) with:
- the **name** in bold;
- the **shortcut** as keys, if there is one: `Ctrl` `Z` — on a Mac `⌘` `Z`, with `⇧` for Shift, `⌥` for Alt, `⌫` for Delete;
- a **line of explanation** for the least obvious buttons: ✨ On-device AI, 👥 Collaborate, 💬 comments, 🐞 log, ↶ ↷, desktop / tablet / mobile, Translations, SEO, Publish, Export, the ↰ ✥ ⧉ ✕ bar of the selected element, 🖌 📋, ↺, 🖥▭▯.

When you slide from one button to its neighbour, the bubble follows straight away. It disappears when the mouse leaves, on a click, with Esc or when scrolling. The buttons on the selected element's bar (in the page) have the same bubbles, placed correctly even when the page is scaled down; the help texts of the site itself (links on the page) are not affected.

**Variants**: on a touch screen, there is no bubble on touch (a touch is a click); with the keyboard, the bubble only appears with Tab, not after a click.

**Log**: nothing (hovering is not recorded, so as not to flood the log). To check: the self-test (chapter 15) has an `infobulles` case.

---

## 2.17 Widening the left and right panels

**Goal**: give more room to the settings (inspector, Content, Site) or, the other way round, to the page.

**Steps**: move the mouse over the inner edge of a panel (between the panel and the page): a coloured line appears and the pointer becomes ↔. Hold the click and drag. With the keyboard: Tab to the handle, then ← → (Shift: bigger steps), Home (narrowest), End (widest). **Double-click** the handle: original width.

**What you see**: the page rescales while you drag; the width is remembered on this device (it comes back next time). The comments panel takes the same width as the inspector.

**Limits**: at least 220 px on the left and 260 px on the right, at most 640 px each, and always at least 420 px for the page; if the window gets narrower, the panels shrink by themselves. On a small screen (under 900 px) the panels are stacked and the handles disappear.

| Situation | Log |
|---|---|
| Width changed (mouse or keyboard) | `ui.panel-resize` (DEBUG): side, before, after, `by` (mouse / keyboard) |
| Double-click: original width | `ui.panel-reset` (INFO) |
| Start-up with remembered widths | `ui.panel-restore` (DEBUG) |

---

## 2.18 Everything the command bar offers

**Goal**: know what to type in **Ctrl+K** to go faster, without looking for the button.

**Steps**
1. **Ctrl+K** (or ⌘K).
2. Type a word from the family you want (table below), ↑ / ↓, then **Enter**.

**Normal path**: before you type anything, the list first shows the commands you have used recently (the last 8, remembered on this device). Each line starts with its family, and a keyboard shortcut is shown on the right when there is one.

| Family | Example commands | What they do |
|---|---|---|
| Add | “Add: Gallery” | adds this widget after the selection (every widget is offered) |
| Template | “Template: FAQ” | adds this ready-made section |
| Component | “Component: …” | inserts one of your components |
| Content | “Content: Agenda (6)”, “Edit card: Agenda”, “Edit detail page: Agenda”, “New collection (members, news, events…)” | opens a collection or edits its card and its detail page |
| Site | “Edit the site header”, “Edit the site footer” | turns the header or footer into blocks (if it is not already) and opens it |
| Page | “Page: Agenda & accès” | opens this page |
| Element | “Heading: Découvrir Kumakōgen”, or `#acces` | selects this element of the open page (or of the header, the card… being edited) and scrolls to it; search for an anchor with `#` |
| View | “Device: Mobile”, “Language: English” | changes the device or the language shown |
| Panel | “Panel: Pages”, “Panel: Site (colours, fonts, presets)” | opens this tab of the left panel |
| Setting | “Setting: Margin top”, “Setting: Background color” | opens the Style tab on this setting (only when an element is selected) |
| Action | “Duplicate the selection”, “Copy style”, “Create a component from the selection”, “Finish the current edit”, “Export site”, “Publish the site (OVH, GitHub)”, “Project versions”, “Preview in a new tab”, “Translations table”, “🌍 English” | the actions of the editor’s buttons and menus |
| AI | “✨ Ask Atelier”, “🧪 On-device AI test bench” | see chapters [13](13-demander-a-atelier.md) and [14](14-banc-essai.md) |
| Help | “Help: keyboard shortcuts”, “📖 User guide” | the list of shortcuts (like the ? key); the guide (like F1) |

**A sentence of three words or more** (“add a FAQ about getting here”) adds the line “✨ Ask Atelier: “…”” at the top (chapter [13](13-demander-a-atelier.md)); if the sentence is in fact the name of a command, the command stays first.

**Log**: every command run gives `cmdk.run` with its identifier (`add:…`, `tpl:…`, `col:…`, `colcard:…`, `coldetail:…`, `zone:header`, `page:…`, `node:…`, `device:mobile`, `lang:en`, `panel:pages`, `style:marginTop`, `act:…`); a command that crashes gives `cmdk.fail` (2.13).

---

## Codes in this chapter

| Code | Level | Meaning |
|---|---|---|
| `action.add` | INFO | widget added (type, place) |
| `action.add-section` | INFO | section added (structure or template) |
| `action.copy` | INFO | element copied to Atelier's clipboard |
| `action.cut` | INFO | element cut (followed by `action.delete`) |
| `action.delete` | INFO | element(s) deleted |
| `action.duplicate` | INFO | element(s) duplicated |
| `action.move` | INFO | element moved up or down (Alt+↑ / Alt+↓, menu) |
| `action.move-edge` | DEBUG | already first / last |
| `action.none` | DEBUG | action requested without a suitable selection |
| `action.parent` | DEBUG | parent selected (Esc, ↰) |
| `action.parent-none` | DEBUG | no selectable parent |
| `action.paste` | INFO | element pasted |
| `action.paste-empty` | DEBUG | Atelier's clipboard empty |
| `action.refused` | WARN | action refused, with the reason (`action`, `error`) |
| `canvas.dblclick` | DEBUG | double-click that opens editing (component, card, header, footer) |
| `canvas.key` | DEBUG, TRACE | key pressed in the page (arrows at TRACE) |
| `canvas.load.start` | INFO | full reload of the canvas, with the reason |
| `canvas.load.render` | DEBUG | page rendered (duration, size) |
| `canvas.load.ok` | INFO | canvas ready (number of elements) |
| `canvas.resources` | DEBUG | online fonts and images of the canvas loaded (duration, hosts) |
| `canvas.resources-slow` | WARN | slow online fonts or images (more than 3 s): the editor remains usable |
| `canvas.load.cancel` | INFO | load replaced by a more recent one |
| `canvas.load.fail` | ERROR | canvas not loaded (rendering impossible, empty document) |
| `canvas.no-resize-observer` | WARN | old browser: frames only moved back into place when scrolling |
| `canvas.overlay-fail` | WARN, TRACE | overlay (presence, comments) in error |
| `canvas.remote-applied` | DEBUG | remote changes applied after your typing |
| `canvas.remote-deferred` | DEBUG | remote change put on hold while you type |
| `canvas.render` | DEBUG, TRACE | canvas updated without reloading (TRACE at each keystroke) |
| `canvas.render-fail` | ERROR | page cannot be rendered |
| `canvas.scale` | DEBUG, TRACE | rendering width and scale (TRACE when resizing) |
| `canvas.scroll` | DEBUG | scrolling to the selected element |
| `canvas.scroll-missing` | DEBUG | selected element not in the canvas (hidden) |
| `canvas.toolbar` | DEBUG | button on the element's bar (↰ ⧉ ✕) |
| `canvas.ui-action` | DEBUG | editor button drawn in the canvas |
| `canvas.zone-locked` | INFO | header or footer not customised |
| `cmdk.fail` | ERROR | Ctrl+K command failed |
| `cmdk.run` | INFO | Ctrl+K command run |
| `ctxmenu.action` | DEBUG | action chosen in the context menu |
| `ctxmenu.close` | DEBUG | menu closed (reason) |
| `ctxmenu.none` | DEBUG | no menu for this element |
| `ctxmenu.open` | DEBUG | context menu opened |
| `dnd.autoscroll` | TRACE | automatic scrolling while dragging |
| `dnd.cancel` | INFO | drag ended without change (outside, same place, Esc, refusal) |
| `dnd.fail` | ERROR | drop impossible (error) |
| `dnd.ok` | INFO | drop accepted (parent, position) |
| `dnd.refused` | WARN | forbidden place |
| `dnd.start` | INFO | start of a drag |
| `dnd.target` | TRACE | new target place |
| `dnd.unknown` | WARN | dragged element not found |
| `edit.ai-apply` | INFO | AI suggestion applied |
| `edit.ai-apply-none` | DEBUG | nothing to apply |
| `edit.ai-ask` | DEBUG | request sent to the AI (mode, length) |
| `edit.ai-cancel` | INFO | suggestion discarded |
| `edit.ai-empty` | WARN | no text targeted |
| `edit.ai-menu` | DEBUG | ✨ menu opened or closed |
| `edit.ai-none` | WARN | no suggestion (see `ai.*`) |
| `edit.ai-proposal` | DEBUG | suggestion shown |
| `edit.ai-stale` | DEBUG | suggestion arrived after writing ended |
| `edit.ai-unavailable` | WARN | AI module not loaded |
| `edit.bound` | WARN | text linked to a collection: writing refused |
| `edit.cancel` | INFO | writing interrupted by a reload of the canvas |
| `edit.dblclick` | DEBUG | double-click on a text |
| `edit.drop-blocked` | DEBUG | drop into a text being written ignored |
| `edit.fail` | ERROR | failed end of the `edit` run: planned, not used today (writing ends with `edit.ok` or `edit.cancel`) |
| `edit.format` | DEBUG | formatting applied or removed |
| `edit.format-none` | DEBUG | formatting had no effect (nothing selected) |
| `edit.input` | TRACE | text changed (length), at each keystroke |
| `edit.keyboard` | DEBUG | writing requested with Enter or the menu |
| `edit.link-cancel` | DEBUG | link abandoned (Esc) |
| `edit.link-invalid` | WARN | link address refused |
| `edit.link-none` | DEBUG | 🔗 with no text selected |
| `edit.link-open` | DEBUG | address field opened |
| `edit.no-text` | DEBUG | nothing to write in the selected element |
| `edit.node-gone` | WARN | element deleted while writing |
| `edit.not-editable` | DEBUG | text that is set in the inspector |
| `edit.ok` | INFO | writing finished (changed or not, lengths) |
| `edit.paste` | DEBUG | paste as plain text (length, lines) |
| `edit.paste-file` | WARN | pasted file ignored |
| `edit.readonly` | WARN | writing refused: review mode |
| `edit.start` | INFO | start of writing (element, field, language, length) |
| `library.insert` | DEBUG | click on a widget or a structure |
| `library.search` | DEBUG, TRACE | widget search (TRACE at each letter) |
| `library.search-empty` | DEBUG | no widget matches |
| `structure.collapse` | DEBUG | line collapsed or expanded |
| `structure.key` | DEBUG, TRACE | keyboard selection (TRACE for moves) |
| `structure.open` | DEBUG | Structure panel opened |
| `structure.render` | TRACE | tree redrawn |
| `widgets.extra` | DEBUG | extra widgets loaded |
| `widgets.missing` | WARN | extra widgets missing |
| `ui.panel-reset` | INFO | original width of a panel (double-click on the handle) |
| `ui.panel-resize` | DEBUG | a panel's width changed (mouse or keyboard) |
| `ui.panel-restore` | DEBUG | remembered widths applied at start-up |
