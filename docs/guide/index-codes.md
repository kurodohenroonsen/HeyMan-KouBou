# Index des codes du journal

Tous les codes que l’éditeur, publish.php et le site publié peuvent écrire, par domaine. Fichier généré par `node tools/guide-index.mjs` à partir du code source : il est toujours à jour avec le code.

**926 codes** dans 44 domaines.

| Domaine | Codes |
|---|---|
| [`action`](#action) | 22 |
| [`ai`](#ai) | 135 |
| [`app`](#app) | 10 |
| [`assist`](#assist) | 13 |
| [`audit`](#audit) | 3 |
| [`bench`](#bench) | 14 |
| [`boot`](#boot) | 10 |
| [`canvas`](#canvas) | 20 |
| [`cmdk`](#cmdk) | 2 |
| [`collab`](#collab) | 73 |
| [`collection`](#collection) | 42 |
| [`ctxmenu`](#ctxmenu) | 4 |
| [`dnd`](#dnd) | 8 |
| [`edit`](#edit) | 30 |
| [`export`](#export) | 4 |
| [`fonts`](#fonts) | 2 |
| [`i18n`](#i18n) | 15 |
| [`image`](#image) | 10 |
| [`inspector`](#inspector) | 22 |
| [`library`](#library) | 3 |
| [`log`](#log) | 8 |
| [`net`](#net) | 4 |
| [`page`](#page) | 30 |
| [`perf`](#perf) | 1 |
| [`php`](#php) | 50 |
| [`project`](#project) | 10 |
| [`publish`](#publish) | 25 |
| [`review`](#review) | 18 |
| [`rtc`](#rtc) | 53 |
| [`selftest`](#selftest) | 33 |
| [`seo`](#seo) | 20 |
| [`settings`](#settings) | 35 |
| [`signal`](#signal) | 25 |
| [`site`](#site) | 9 |
| [`smart`](#smart) | 38 |
| [`storage`](#storage) | 22 |
| [`store`](#store) | 15 |
| [`structure`](#structure) | 4 |
| [`style`](#style) | 24 |
| [`template`](#template) | 3 |
| [`translate`](#translate) | 21 |
| [`ui`](#ui) | 15 |
| [`version`](#version) | 19 |
| [`widgets`](#widgets) | 2 |

## action

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `action.add` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.add-section` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.component-cancel` | INFO | [3](03-style-design.md) | `editor/actions.js` |
| `action.component-create` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.component-delete` | INFO | [3](03-style-design.md) | `editor/templates.js` |
| `action.component-delete-cancel` | INFO | [3](03-style-design.md) | `editor/templates.js` |
| `action.component-detach` | INFO | [3](03-style-design.md) | `editor/actions.js` |
| `action.component-edit` | DEBUG | [3](03-style-design.md) | `editor/actions.js` |
| `action.component-insert` | INFO | [3](03-style-design.md) | `editor/actions.js` |
| `action.component-rename` | INFO | [3](03-style-design.md) | `editor/templates.js` |
| `action.copy` | INFO | [2](02-edition.md) | `editor/actions.js` |
| `action.cut` | INFO | [2](02-edition.md) | `editor/actions.js` |
| `action.delete` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.duplicate` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.move` | INFO | [2](02-edition.md) | `editor/actions.js` |
| `action.move-edge` | DEBUG | [2](02-edition.md) | `editor/actions.js` |
| `action.none` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.parent` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `action.parent-none` | DEBUG | [2](02-edition.md) | `editor/actions.js` |
| `action.paste` | INFO | [2](02-edition.md) | `editor/actions.js` |
| `action.paste-empty` | DEBUG | [2](02-edition.md) | `editor/actions.js`, `editor/app.js` |
| `action.refused` | WARN | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js`, `editor/templates.js` |

## ai

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `ai.alt.absent` | WARN | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.call` | DEBUG | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.cancel` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.clamped` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.cleaned` | DEBUG | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.no-translator` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.ok` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.rejected` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.reply` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.start` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.alt.via-translation` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.absent` | WARN | [6](06-seo.md) | `editor/ai.js` |
| `ai.description.call` | DEBUG | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.call-fail` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.cancel` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.clamped` | WARN | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.fail` | ERROR | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.fallback` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.no-translator` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.ok` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.rejected` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.reply` | DEBUG | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.start` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.via-translation` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.description.warning` | WARN | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.dialog` | INFO | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.download-done` | INFO | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.download-follow` | INFO | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.download-stalled` | WARN | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.download-ui` | WARN | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.download.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.download.ok` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.download.start` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.excerpt.call` | DEBUG | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.excerpt.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.excerpt.fallback` | WARN | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.excerpt.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.excerpt.start` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.absent` | WARN | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.call` | DEBUG | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.cancel` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.dropped` | WARN | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.duplicates` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.reply` | DEBUG | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.start` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.truncated` | WARN | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.unreadable` | WARN | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.extract.via-translation` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.flag-copied` | DEBUG | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.flag-copy-fail` | WARN | [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.headlines.call` | DEBUG | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.headlines.cleaned` | DEBUG | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.headlines.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.headlines.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.headlines.start` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.image-fail` | WARN | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.image-missing` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.cancel` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.cleaned` | DEBUG | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.no-translator` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.ok` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.start` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.keywords.via-translation` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.absent` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.cancel` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.clamped` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.ok` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.refused-lang` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.link.start` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.mark` | DEBUG | [2](02-edition.md) [7](07-ia-locale.md) | `editor/ai-ui.js` |
| `ai.params` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.plan.absent` | WARN | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.actions` | INFO | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.call` | DEBUG | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.cancel` | INFO | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.fail` | ERROR | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.ok` | INFO | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.rejected` | WARN | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.reply` | DEBUG | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.start` | INFO | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.plan.unreadable` | WARN | [13](13-demander-a-atelier.md) | `editor/ai.js` |
| `ai.progress` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.call` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.call-fail` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.cancel` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.fallback` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.ok` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.refused-lang` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.reply` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.start` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.proofread.unreadable` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.provider` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.review-summary.absent` | WARN | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.review-summary.call` | DEBUG | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.review-summary.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.review-summary.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.review-summary.start` | INFO | [12](12-contenus-intelligents.md) | `editor/ai.js` |
| `ai.rewrite.absent` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.call` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.call-fail` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.cancel` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.cleaned` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.fallback` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.ok` | INFO | [2](02-edition.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.refused` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.refused-lang` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.rejected` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.reply` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.start` | INFO | [2](02-edition.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.rewrite.warning` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.session.create` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.session.fail` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.session.reuse` | TRACE | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.session.usage` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.status` | DEBUG, INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.absent` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.call` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.cancel` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.clamped` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.fail` | ERROR | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.no-translator` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.ok` | INFO | [6](06-seo.md) [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.reply` | DEBUG | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.schema-mismatch` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.start` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.unreadable` | WARN | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.title.via-translation` | INFO | [7](07-ia-locale.md) | `editor/ai.js` |
| `ai.unexpected` | ERROR | [7](07-ia-locale.md) | `editor/ai-ui.js` |

## app

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `app.console` | ERROR, WARN | [0](00-journal.md) | `editor/log.js` |
| `app.csp` | ERROR | [0](00-journal.md) | `editor/log.js` |
| `app.leave` | INFO | [0](00-journal.md) | `editor/log.js` |
| `app.offline` | WARN | [0](00-journal.md) [10](10-collaboration.md) | `editor/log.js` |
| `app.online` | INFO | [0](00-journal.md) [10](10-collaboration.md) | `editor/log.js` |
| `app.rejection` | ERROR | [0](00-journal.md) | `editor/log.js` |
| `app.resource` | ERROR | [0](00-journal.md) [4](04-pages-images-contenus.md) | `editor/log.js` |
| `app.storage-event` | DEBUG | [0](00-journal.md) | `editor/log.js` |
| `app.uncaught` | ERROR | [0](00-journal.md) | `editor/log.js` |
| `app.visibility` | DEBUG | [0](00-journal.md) | `editor/log.js` |

## assist

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `assist.apply.fail` | ERROR | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.apply.ok` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.apply.start` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.apply.step` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.apply.step-fail` | WARN | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.apply.tool-fail` | WARN | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.cancel` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.nothing` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.open` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.plan` | INFO | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.plan-fail` | WARN | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.rejected` | WARN | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |
| `assist.warning` | WARN | [13](13-demander-a-atelier.md) | `editor/assistant-ui.js` |

## audit

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `audit.export` | INFO | [8](08-verifier-exporter-publier.md) | `editor/audit-ui.js` |
| `audit.go` | INFO | [8](08-verifier-exporter-publier.md) | `editor/audit-ui.js` |
| `audit.open` | INFO, WARN | [8](08-verifier-exporter-publier.md) | `editor/audit-ui.js` |

## bench

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `bench.case` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.check-fail` | WARN | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.copy` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.copy-fail` | WARN | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.download` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.downloadable` | WARN | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.env` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.no-prompt` | WARN | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.open` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.params-fail` | DEBUG | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.run.cancel` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.run.fail` | ERROR | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.run.ok` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |
| `bench.run.start` | INFO | [14](14-banc-essai.md) | `editor/bench-ui.js` |

## boot

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `boot.error` | ERROR | [0](00-journal.md) [1](01-demarrage-projet.md) | `editor/boot.js` |
| `boot.fail` | ERROR | [1](01-demarrage-projet.md) | `editor/app.js` |
| `boot.invalid-save` | WARN | [1](01-demarrage-projet.md) | `editor/app.js` |
| `boot.log` | INFO | [0](00-journal.md) [1](01-demarrage-projet.md) | `editor/log.js` |
| `boot.ok` | INFO | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/app.js` |
| `boot.project` | INFO | [1](01-demarrage-projet.md) | `editor/app.js` |
| `boot.rejection` | ERROR | [0](00-journal.md) [1](01-demarrage-projet.md) | `editor/boot.js` |
| `boot.resource` | ERROR | [0](00-journal.md) [1](01-demarrage-projet.md) | `editor/boot.js` |
| `boot.start` | INFO | [1](01-demarrage-projet.md) | `editor/app.js` |
| `boot.timeout` | ERROR | [0](00-journal.md) [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/boot.js` |

## canvas

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `canvas.dblclick` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |
| `canvas.key` | DEBUG, TRACE | [2](02-edition.md) [11](11-relecture-commentaires.md) | `editor/canvas.js` |
| `canvas.load.fail` | ERROR | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.load.ok` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |
| `canvas.load.render` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |
| `canvas.load.start` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |
| `canvas.no-resize-observer` | WARN | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.overlay-fail` | TRACE, WARN | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.remote-applied` | DEBUG | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.remote-deferred` | DEBUG | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.render` | DEBUG, TRACE | [2](02-edition.md) [10](10-collaboration.md) | `editor/canvas.js` |
| `canvas.render-fail` | ERROR | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.resources` | DEBUG | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.resources-slow` | WARN | [0](00-journal.md) [2](02-edition.md) | `editor/canvas.js` |
| `canvas.scale` | variable | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |
| `canvas.scroll` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |
| `canvas.scroll-missing` | DEBUG | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.toolbar` | DEBUG | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.ui-action` | DEBUG | [2](02-edition.md) | `editor/canvas.js` |
| `canvas.zone-locked` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/canvas.js` |

## cmdk

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `cmdk.fail` | ERROR | [2](02-edition.md) | `editor/cmdk.js` |
| `cmdk.run` | INFO | [2](02-edition.md) [3](03-style-design.md) [13](13-demander-a-atelier.md) | `editor/cmdk.js` |

## collab

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `collab.auth` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `collab.auth.early` | TRACE | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.close-fail` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.hello` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.hello.again` | TRACE | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.hello.retry` | TRACE | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.hello.timeout` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.host-lost` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.host.already` | DEBUG | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.host.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.host.ok` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.host.signal` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.host.start` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.identity.invalid` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.identity.load` | DEBUG | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.identity.new` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/collab-ui.js` |
| `collab.identity.rename` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.identity.unreadable` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.identity.unsaved` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.invite.copy` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.invite.copy-fail` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.invite.create` | DEBUG | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.invite.invalid` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.invite.open` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/collab-ui.js` |
| `collab.join.backup` | DEBUG | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.bad-link` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.invite` | DEBUG | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/collab-ui.js` |
| `collab.join.link` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.no-name` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.ok` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/collab-ui.js` |
| `collab.join.rejoin` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.resume` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.join.start` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/collab-ui.js` |
| `collab.leave` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.link.closed` | INFO | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.link.new` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.message-fail` | ERROR | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.message-invalid` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.message-unknown` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.no-identity` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.node.close` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.open` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.ops.early` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.ops.in` | DEBUG | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `collab.ops.out` | DEBUG | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `collab.ops.rejected` | WARN | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `collab.ops.relay` | TRACE | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.peer.leave` | INFO | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.presence` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.readonly` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/collab-ui.js` |
| `collab.refused.auth` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.refused.host` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.refused.identity` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.refused.invite` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.refused.owner` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.remote-error` | WARN | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `collab.restore` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.restore-fail` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.restore-no-identity` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.restore-unreadable` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.resume.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.resume.ok` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.resume.start` | INFO | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.save` | TRACE | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.save-fail` | WARN | [10](10-collaboration.md) | `editor/collab-ui.js` |
| `collab.send-fail` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.snapshot` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `collab.snapshot-refused` | WARN | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.sync.ask` | DEBUG | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.sync.delta` | INFO | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.sync.merged` | INFO | [10](10-collaboration.md) | `core/collab-protocol.js` |
| `collab.sync.snapshot` | INFO | [10](10-collaboration.md) | `core/collab-protocol.js` |

## collection

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `collection.create` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.create-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.csv-export` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.csv-import.fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.csv-import.ok` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.csv-import.read` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.csv-import.row-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.csv-import.start` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.delete` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.delete-cancel` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.edit-card` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.edit-detail` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.add` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.delete` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.delete-cancel` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.i18n` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.move` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.options` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.field.rename` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.goto` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.add` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.delete` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.delete-cancel` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.draft` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.duplicate` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.move` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.preview` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.publish` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.search` | TRACE | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.select` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.slug` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.value` | DEBUG, TRACE | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.item.value-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.missing` | WARN | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.new.kind` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.open` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.refused` | WARN | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.rename` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.rss-no-url` | WARN | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.setting` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.slug` | INFO | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |
| `collection.tab` | DEBUG | [4](04-pages-images-contenus.md) | `editor/collections-ui.js` |

## ctxmenu

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `ctxmenu.action` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/ctxmenu.js` |
| `ctxmenu.close` | DEBUG | [2](02-edition.md) | `editor/ctxmenu.js` |
| `ctxmenu.none` | DEBUG | [2](02-edition.md) | `editor/ctxmenu.js` |
| `ctxmenu.open` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/ctxmenu.js` |

## dnd

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `dnd.autoscroll` | TRACE | [2](02-edition.md) | `editor/dnd.js` |
| `dnd.cancel` | INFO | [2](02-edition.md) | `editor/dnd.js` |
| `dnd.fail` | ERROR | [2](02-edition.md) | `editor/dnd.js` |
| `dnd.ok` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/dnd.js` |
| `dnd.refused` | WARN | [2](02-edition.md) | `editor/dnd.js` |
| `dnd.start` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/dnd.js` |
| `dnd.target` | TRACE | [2](02-edition.md) | `editor/dnd.js` |
| `dnd.unknown` | WARN | [2](02-edition.md) | `editor/dnd.js` |

## edit

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `edit.ai-apply` | INFO | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-apply-none` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-ask` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-cancel` | INFO | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-empty` | WARN | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-menu` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-none` | WARN | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-proposal` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-stale` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.ai-unavailable` | WARN | [2](02-edition.md) | `editor/inline.js` |
| `edit.bound` | WARN | [2](02-edition.md) | `editor/inline.js` |
| `edit.dblclick` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/inline.js` |
| `edit.drop-blocked` | DEBUG | [2](02-edition.md) | `editor/richedit.js` |
| `edit.fail` | ERROR | [2](02-edition.md) | `editor/inline.js` |
| `edit.format` | DEBUG | [2](02-edition.md) | `editor/richedit.js` |
| `edit.format-none` | DEBUG | [2](02-edition.md) | `editor/richedit.js` |
| `edit.input` | TRACE | [2](02-edition.md) | `editor/inline.js` |
| `edit.keyboard` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.link-cancel` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.link-invalid` | WARN | [2](02-edition.md) | `editor/richedit.js` |
| `edit.link-none` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.link-open` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.no-text` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.node-gone` | WARN | [2](02-edition.md) | `editor/inline.js` |
| `edit.not-editable` | DEBUG | [2](02-edition.md) | `editor/inline.js` |
| `edit.ok` | INFO | [2](02-edition.md) [3](03-style-design.md) [15](15-auto-test.md) | `editor/inline.js` |
| `edit.paste` | DEBUG | [2](02-edition.md) | `editor/richedit.js` |
| `edit.paste-file` | WARN | [2](02-edition.md) | `editor/richedit.js` |
| `edit.readonly` | WARN | [2](02-edition.md) | `editor/inline.js` |
| `edit.start` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/inline.js` |

## export

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `export.zip.fail` | ERROR | [8](08-verifier-exporter-publier.md) | `editor/app.js` |
| `export.zip.ok` | INFO | [8](08-verifier-exporter-publier.md) | `editor/app.js` |
| `export.zip.render` | DEBUG | [8](08-verifier-exporter-publier.md) | `editor/app.js` |
| `export.zip.start` | INFO | [8](08-verifier-exporter-publier.md) | `editor/app.js` |

## fonts

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `fonts.load` | DEBUG | [4](04-pages-images-contenus.md) | `editor/fontfiles.js` |
| `fonts.load-fail` | WARN | [4](04-pages-images-contenus.md) | `editor/fontfiles.js` |

## i18n

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `i18n.csv-export` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.csv-import.fail` | ERROR | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.csv-import.ok` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.csv-import.parsed` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.csv-import.start` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.csv-import.unknown-columns` | WARN | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.csv-import.unknown-rows` | WARN | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.edit` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.edit-fail` | WARN | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.filter` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.go` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.more` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.open` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.review-ok` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `i18n.search` | TRACE | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |

## image

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `image.import.big-output` | WARN | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.import.decode` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.import.encode` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.import.fail` | ERROR | [3](03-style-design.md) [4](04-pages-images-contenus.md) [12](12-contenus-intelligents.md) | `editor/images.js` |
| `image.import.heavy` | WARN | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.import.ok` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) [12](12-contenus-intelligents.md) | `editor/images.js` |
| `image.import.resize` | DEBUG | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.import.start` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.import.variant` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/images.js` |
| `image.type-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/images.js` |

## inspector

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `inspector.advanced` | DEBUG | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.alt-ai` | DEBUG | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.alt-ai-none` | DEBUG | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.alt-ai-ok` | INFO | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.bind` | INFO | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.css-refused` | WARN | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.field` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.field-empty` | DEBUG | [3](03-style-design.md) | `editor/fields.js` |
| `inspector.image-none` | DEBUG | [3](03-style-design.md) | `editor/fields.js` |
| `inspector.image-remove` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.image-url` | DEBUG, WARN | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.image.fail` | ERROR | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.image.ok` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.image.start` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.image.webp` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/fields.js` |
| `inspector.layout` | INFO | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.link-pick` | DEBUG | [3](03-style-design.md) | `editor/fields.js` |
| `inspector.list` | DEBUG | [3](03-style-design.md) | `editor/fields.js` |
| `inspector.refused` | WARN | [3](03-style-design.md) | `editor/fields.js`, `editor/inspector.js` |
| `inspector.remote-deferred` | DEBUG | [3](03-style-design.md) [10](10-collaboration.md) | `editor/inspector.js` |
| `inspector.render` | TRACE | [3](03-style-design.md) | `editor/inspector.js` |
| `inspector.tab` | DEBUG | [3](03-style-design.md) | `editor/inspector.js` |

## library

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `library.insert` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/library.js` |
| `library.search` | DEBUG, TRACE | [2](02-edition.md) | `editor/library.js` |
| `library.search-empty` | DEBUG | [2](02-edition.md) | `editor/library.js` |

## log

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `log.clear` | INFO | [0](00-journal.md) | `editor/log-ui.js` |
| `log.copy` | INFO | [0](00-journal.md) | `editor/log-ui.js` |
| `log.copy-fail` | WARN | [0](00-journal.md) | `editor/log-ui.js` |
| `log.download` | INFO | [0](00-journal.md) | `editor/log-ui.js` |
| `log.server.fail` | ERROR | [0](00-journal.md) | `editor/log-ui.js` |
| `log.server.ok` | INFO | [0](00-journal.md) | `editor/log-ui.js` |
| `log.server.start` | INFO | [0](00-journal.md) | `editor/log-ui.js` |
| `log.settings` | INFO | [0](00-journal.md) | `editor/log.js` |

## net

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `net.fail` | WARN, variable | [0](00-journal.md) [7](07-ia-locale.md) [8](08-verifier-exporter-publier.md) [10](10-collaboration.md) | `editor/log.js` |
| `net.recovered` | INFO | [0](00-journal.md) | `editor/log.js` |
| `net.request` | variable | [0](00-journal.md) [8](08-verifier-exporter-publier.md) [10](10-collaboration.md) | `editor/log.js` |
| `net.response` | variable | [0](00-journal.md) [8](08-verifier-exporter-publier.md) | `editor/log.js` |

## page

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `page.a11y.create` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.a11y.open` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.a11y.refused` | WARN | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.add` | INFO | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) [5](05-langues-traductions.md) | `editor/pages.js` |
| `page.add-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.delete` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.delete-cancel` | DEBUG | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.footer-link` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.legal.create` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.legal.open` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.legal.refused` | WARN | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.auto` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.auto-cancel` | DEBUG | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.customize` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.indent` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.label` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.link-add` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.link-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.move` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.outdent` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.page-add` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.remove` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.menu.url` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.move` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.open` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.refused` | WARN | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.seo` | INFO, WARN | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.slug` | INFO | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.slug-suggest` | DEBUG | [4](04-pages-images-contenus.md) | `editor/pages.js` |
| `page.title` | INFO, TRACE | [4](04-pages-images-contenus.md) | `editor/pages.js` |

## perf

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `perf.longtask` | DEBUG | [0](00-journal.md) | `editor/log.js` |

## php

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `php.contact.bot` | INFO | [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.empty` | INFO | [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.mail-fail` | ERROR | [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.no-consent` | INFO | [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.rate` | WARN | [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.sent` | INFO | [0](00-journal.md) [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.start` | DEBUG | [9](09-site-publie.md) | `core/publish.js` |
| `php.contact.unknown` | WARN | [9](09-site-publie.md) | `core/publish.js` |
| `php.data-corrupt` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.data-fail` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.debug.denied` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.diag` | INFO, WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.diag.denied` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.exception` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.fatal` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.logs.denied` | WARN | [0](00-journal.md) | `core/publish.js` |
| `php.logs.read` | INFO | [0](00-journal.md) | `core/publish.js` |
| `php.method` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.bad-zip` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.checked` | DEBUG | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.denied` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.forms-skipped` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.htaccess` | DEBUG | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.htaccess-fail` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.htaccess-invalid` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.move-fail` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.nofile` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.nozip` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.ok` | INFO | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.partial` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.read-fail` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.rejected` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.staged` | DEBUG | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.start` | INFO | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.too-big` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.publish.write-fail` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.req.end` | selon le statut | [0](00-journal.md) [8](08-verifier-exporter-publier.md) [9](09-site-publie.md) | `core/publish.js` |
| `php.req.start` | DEBUG | [0](00-journal.md) [8](08-verifier-exporter-publier.md) [9](09-site-publie.md) | `core/publish.js` |
| `php.signal.denied` | WARN | [9](09-site-publie.md) | `core/publish.js` |
| `php.signal.expired` | DEBUG | [9](09-site-publie.md) | `core/publish.js` |
| `php.signal.full` | WARN | [9](09-site-publie.md) [10](10-collaboration.md) | `core/publish.js` |
| `php.signal.get` | DEBUG | [9](09-site-publie.md) | `core/publish.js` |
| `php.signal.invalid` | WARN | [9](09-site-publie.md) [10](10-collaboration.md) | `core/publish.js` |
| `php.signal.post` | DEBUG | [9](09-site-publie.md) [10](10-collaboration.md) | `core/publish.js` |
| `php.signal.rate` | WARN | [9](09-site-publie.md) | `core/publish.js` |
| `php.signal.room-full` | WARN | [9](09-site-publie.md) | `core/publish.js` |
| `php.signal.too-big` | WARN | [9](09-site-publie.md) [10](10-collaboration.md) | `core/publish.js` |
| `php.status` | DEBUG | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.warning` | WARN | [8](08-verifier-exporter-publier.md) | `core/publish.js` |
| `php.write-fail` | ERROR | [8](08-verifier-exporter-publier.md) | `core/publish.js` |

## project

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `project.cancel` | INFO | [1](01-demarrage-projet.md) | `editor/app.js`, `editor/new-site-ui.js` |
| `project.demo` | INFO | [1](01-demarrage-projet.md) | `editor/app.js` |
| `project.export-json` | INFO | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/app.js` |
| `project.import.fail` | ERROR | [1](01-demarrage-projet.md) | `editor/app.js` |
| `project.import.invalid` | WARN | [1](01-demarrage-projet.md) | `editor/app.js` |
| `project.import.ok` | INFO | [1](01-demarrage-projet.md) | `editor/app.js` |
| `project.import.start` | INFO | [1](01-demarrage-projet.md) | `editor/app.js` |
| `project.new` | INFO | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) | `editor/new-site-ui.js` |
| `project.new-lang` | DEBUG | [1](01-demarrage-projet.md) | `editor/new-site-ui.js` |
| `project.preview` | INFO | [1](01-demarrage-projet.md) | `editor/app.js` |

## publish

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `publish.github.fail` | ERROR | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.github.ok` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.github.package` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.github.start` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.github.upload` | DEBUG | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.open` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.fail` | ERROR | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.generate` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.ok` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.package` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.partial` | ERROR | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.rejected` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.start` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.version` | DEBUG | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.version-unknown` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.php.warnings` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.settings-invalid` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.diag` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.fail` | ERROR | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.no-zip` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.not-json` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.ok` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.old-version` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.start` | INFO | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |
| `publish.test.token-refused` | WARN | [8](08-verifier-exporter-publier.md) | `editor/publish-ui.js` |

## review

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `review.add` | INFO | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.add-refused` | WARN | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.apply-fail` | WARN | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.delete` | INFO | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.delete-cancel` | DEBUG | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.filter` | DEBUG | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.goto` | DEBUG | [11](11-relecture-commentaires.md) [12](12-contenus-intelligents.md) | `editor/review-ui.js` |
| `review.goto-missing` | WARN | [12](12-contenus-intelligents.md) | `editor/review-ui.js` |
| `review.no-identity` | WARN | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.ops.rejected` | WARN | [11](11-relecture-commentaires.md) | `core/collab-protocol.js` |
| `review.panel` | INFO | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.remote` | INFO | [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.reply` | INFO | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.reply-refused` | WARN | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.reply.delete` | INFO | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.resolve` | INFO | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.sig.bad` | WARN | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |
| `review.sig.ok` | DEBUG | [11](11-relecture-commentaires.md) | `editor/review-ui.js` |

## rtc

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `rtc.accept.answer` | DEBUG, INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.accept.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.accept.ok` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.accept.sent` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.accept.start` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.channel.close` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.channel.error` | DEBUG, WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.channel.open` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.channel.timeout` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.chunk.join` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.chunk.part` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.chunk.split` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.close-error` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.failed` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.flow.resume` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.flow.wait` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.candidate` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.error` | DEBUG, TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.gather-timeout` | DEBUG, WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.gathered` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.gathering` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.no-srflx` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.no-stun` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.remote` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.ice.state` | DEBUG, INFO, WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.join.answer` | DEBUG, INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.join.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.join.offer` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.join.ok` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.join.sent` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.join.start` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.lost` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-answer.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-answer.ok` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-answer.start` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-cancel` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-finish.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-finish.ok` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-finish.remote` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-finish.start` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-offer.fail` | ERROR | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-offer.ok` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.manual-offer.start` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.pair` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.pair-unknown` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.pc.create` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.pc.state` | DEBUG, INFO, WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.recv` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.recv.invalid` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.send` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.send-dropped` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.stats-fail` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `rtc.stun-ignored` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |

## selftest

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `selftest.ai-recheck-fail` | DEBUG | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.auto` | INFO | [15](15-auto-test.md) | `editor/selftest-ui.js` |
| `selftest.backup.fail` | ERROR | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.backup.ok` | INFO | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.backup.slot` | DEBUG | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.backup.start` | INFO | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.case` | INFO | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.case-start` | DEBUG | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.check-fail` | WARN | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.copy` | DEBUG, INFO | [15](15-auto-test.md) | `editor/selftest-ui.js`, `editor/selftest.js` |
| `selftest.copy-fail` | DEBUG, WARN | [15](15-auto-test.md) | `editor/selftest-ui.js`, `editor/selftest.js` |
| `selftest.dialog` | INFO | [15](15-auto-test.md) | `editor/selftest-ui.js` |
| `selftest.download` | DEBUG | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.focus-fallback` | DEBUG | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.missing` | WARN | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.recover-fail` | ERROR | [15](15-auto-test.md) | `editor/app.js` |
| `selftest.recover-missing` | WARN | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.recovered` | WARN | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.refused` | WARN | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.report-download` | INFO | [15](15-auto-test.md) | `editor/selftest-ui.js` |
| `selftest.rollback.assets` | WARN | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.rollback.fail` | ERROR | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.rollback.memory` | DEBUG | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.rollback.none` | INFO | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.rollback.ok` | INFO | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.rollback.saved` | DEBUG | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.rollback.start` | INFO | [15](15-auto-test.md) | `editor/selftest-safe.js` |
| `selftest.run.aborted` | ERROR | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.run.fail` | ERROR | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.run.ok` | INFO | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.run.start` | INFO | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.stop` | INFO | [15](15-auto-test.md) | `editor/selftest.js` |
| `selftest.unexpected` | WARN | [15](15-auto-test.md) | `editor/selftest.js` |

## seo

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `seo.ai-applied` | INFO | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.ai-ask` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.alts.fail` | ERROR | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.alts.image` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.alts.ok` | INFO | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.alts.start` | INFO | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.alts.stopped` | WARN | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.analysis` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.apply-fail` | WARN | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.complete-all.fail` | ERROR | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.complete-all.ok` | INFO | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.complete-all.page` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.complete-all.start` | INFO | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.complete-all.stopped` | WARN | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.field` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.goto` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.keyword-pick` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.lang` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.open` | INFO | [6](06-seo.md) | `editor/seo-ui.js` |
| `seo.page` | DEBUG | [6](06-seo.md) | `editor/seo-ui.js` |

## settings

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `settings.base-url` | INFO | [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.color` | INFO, TRACE | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.color-add` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.color-name` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.color-remove` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.color-replace` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.font` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.font-import` | INFO | [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.font-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.font-remove` | INFO | [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.footer-text` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.header` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.icon-refused` | WARN | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `settings.icon-remove` | INFO | [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.icon.decode` | DEBUG | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `settings.icon.fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `settings.icon.not-square` | WARN | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `settings.icon.ok` | INFO | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `settings.icon.start` | INFO | [4](04-pages-images-contenus.md) | `editor/images.js` |
| `settings.lang-add` | INFO | [4](04-pages-images-contenus.md) [5](05-langues-traductions.md) | `editor/panels.js` |
| `settings.lang-remove` | INFO | [4](04-pages-images-contenus.md) [5](05-langues-traductions.md) | `editor/panels.js` |
| `settings.layout-customize` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.layout-edit` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.layout-reset` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.logo` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.logo-ignored` | WARN | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.name` | INFO, TRACE | [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.preset-delete` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.preset-delete-cancel` | DEBUG | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.preset-duplicate` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.preset-rename` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.refused` | WARN | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.space-scale` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.theme` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |
| `settings.type-scale` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/panels.js` |

## signal

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `signal.check` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.code-invalid` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.code-wrong` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.decrypt` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.decrypt-fail` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.duplicate` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.handle-fail` | ERROR | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.host` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.ignored` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.no-answer` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.not-json` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.poll` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.poll-fail` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.poll-retry` | TRACE | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.post` | DEBUG | [9](09-site-publie.md) [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.post-fail` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.post-refused` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.receive` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.recovered` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.start` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.stop` | DEBUG | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.stun` | INFO | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.stun-unreadable` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.stun-unsaved` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |
| `signal.unsupported` | WARN | [10](10-collaboration.md) | `editor/collab-net.js` |

## site

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `site.boot` | INFO | [9](09-site-publie.md) | `core/render.js` |
| `site.facade` | INFO | [9](09-site-publie.md) | `core/widgets-extra.js` |
| `site.fail` | WARN | [9](09-site-publie.md) | `core/render.js` |
| `site.form.fail` | WARN | [9](09-site-publie.md) | `core/widgets-extra.js` |
| `site.form.ok` | INFO | [9](09-site-publie.md) | `core/widgets-extra.js` |
| `site.form.submit` | INFO | [9](09-site-publie.md) | `core/widgets-extra.js` |
| `site.gallery` | INFO | [9](09-site-publie.md) | `core/widgets-extra.js` |
| `site.list` | INFO | [4](04-pages-images-contenus.md) [9](09-site-publie.md) | `core/collection-widgets.js` |
| `site.nav` | INFO | [9](09-site-publie.md) | `core/render.js` |

## smart

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `smart.excerpt.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.excerpt.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.excerpt.start` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.headlines.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.headlines.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.headlines.start` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.cancel` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.colors` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.file` | DEBUG | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.no-logo` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.no-vivid` | WARN | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.pixels` | DEBUG | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.proposal` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.palette.start` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.cancel` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.empty` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.preview` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.read` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.read-fail` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.paste.start` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.cancel` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.fail` | ERROR | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.image` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.image-fail` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.ok` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.preview` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.read` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.read-fail` | — | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.poster.start` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.review.copy` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.review.copy-fail` | WARN | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.review.go` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.review.open` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |
| `smart.review.points` | INFO | [12](12-contenus-intelligents.md) | `editor/smart-ui.js` |

## storage

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `storage.asset-delete` | DEBUG | [15](15-auto-test.md) | `editor/storage.js` |
| `storage.assets-missing` | WARN | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.blocked` | WARN | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) | `editor/storage.js` |
| `storage.load` | INFO | [1](01-demarrage-projet.md) [15](15-auto-test.md) | `editor/storage.js` |
| `storage.load-empty` | INFO | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.load-fail` | ERROR | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.open` | DEBUG | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.open-fail` | ERROR | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.project-delete` | DEBUG | [15](15-auto-test.md) | `editor/storage.js` |
| `storage.save` | DEBUG | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) [15](15-auto-test.md) | `editor/store.js` |
| `storage.save-fail` | ERROR | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) | `editor/store.js` |
| `storage.save-recovered` | INFO | [1](01-demarrage-projet.md) | `editor/store.js` |
| `storage.secret-fail` | WARN | [8](08-verifier-exporter-publier.md) | `editor/storage.js` |
| `storage.secret-read` | DEBUG | [1](01-demarrage-projet.md) [8](08-verifier-exporter-publier.md) | `editor/storage.js` |
| `storage.secret-write` | INFO | [8](08-verifier-exporter-publier.md) [10](10-collaboration.md) | `editor/storage.js` |
| `storage.unavailable` | ERROR | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) | `editor/storage.js` |
| `storage.upgrade` | INFO | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.version-change` | WARN | [1](01-demarrage-projet.md) | `editor/storage.js` |
| `storage.version-delete` | DEBUG | [4](04-pages-images-contenus.md) [15](15-auto-test.md) | `editor/storage.js` |
| `storage.version-missing` | WARN | [4](04-pages-images-contenus.md) | `editor/storage.js` |
| `storage.version-save` | DEBUG | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) | `editor/storage.js` |
| `storage.versions-fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/storage.js` |

## store

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `store.commit` | DEBUG | [0](00-journal.md) [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [4](04-pages-images-contenus.md) [5](05-langues-traductions.md) [6](06-seo.md) [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/store.js` |
| `store.edit-target` | INFO | [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/store.js` |
| `store.hover` | TRACE | [0](00-journal.md) [1](01-demarrage-projet.md) | `editor/store.js` |
| `store.invalid` | ERROR | [1](01-demarrage-projet.md) | `editor/store.js` |
| `store.load` | INFO | [1](01-demarrage-projet.md) [4](04-pages-images-contenus.md) | `editor/store.js` |
| `store.multi` | DEBUG | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/app.js`, `editor/store.js` |
| `store.readonly` | WARN | [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [11](11-relecture-commentaires.md) | `editor/store.js` |
| `store.redo` | INFO | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/store.js` |
| `store.redo-none` | DEBUG | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/store.js` |
| `store.remote` | DEBUG | [1](01-demarrage-projet.md) [10](10-collaboration.md) [11](11-relecture-commentaires.md) | `editor/store.js` |
| `store.restore` | INFO | [15](15-auto-test.md) | `editor/store.js` |
| `store.select` | DEBUG | [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [5](05-langues-traductions.md) [6](06-seo.md) [8](08-verifier-exporter-publier.md) [11](11-relecture-commentaires.md) | `editor/store.js` |
| `store.undo` | INFO | [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [4](04-pages-images-contenus.md) [12](12-contenus-intelligents.md) [13](13-demander-a-atelier.md) | `editor/store.js` |
| `store.undo-none` | DEBUG | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/store.js` |
| `store.view` | DEBUG | [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [4](04-pages-images-contenus.md) [5](05-langues-traductions.md) [8](08-verifier-exporter-publier.md) [11](11-relecture-commentaires.md) [13](13-demander-a-atelier.md) | `editor/store.js` |

## structure

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `structure.collapse` | DEBUG | [2](02-edition.md) | `editor/navigator.js` |
| `structure.key` | DEBUG, TRACE | [2](02-edition.md) | `editor/navigator.js` |
| `structure.open` | DEBUG | [2](02-edition.md) | `editor/navigator.js` |
| `structure.render` | TRACE | [2](02-edition.md) | `editor/navigator.js` |

## style

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `style.all-devices` | DEBUG | [3](03-style-design.md) | `editor/styletab.js` |
| `style.contrast-error` | WARN | [3](03-style-design.md) | `editor/styletab.js` |
| `style.contrast-low` | WARN | [3](03-style-design.md) | `editor/styletab.js` |
| `style.contrast-ok` | DEBUG, TRACE | [3](03-style-design.md) | `editor/styletab.js` |
| `style.contrast-unknown` | DEBUG | [3](03-style-design.md) | `editor/styletab.js` |
| `style.copy` | INFO | [3](03-style-design.md) | `editor/actions.js` |
| `style.device` | DEBUG | [3](03-style-design.md) | `editor/styletab.js` |
| `style.focus` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/styletab.js` |
| `style.focus-missing` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/styletab.js` |
| `style.paste` | INFO | [2](02-edition.md) [3](03-style-design.md) | `editor/actions.js` |
| `style.paste-empty` | DEBUG | [3](03-style-design.md) | `editor/actions.js` |
| `style.preset-apply` | INFO | [3](03-style-design.md) | `editor/styletab.js` |
| `style.preset-create` | INFO | [3](03-style-design.md) [4](04-pages-images-contenus.md) | `editor/styletab.js` |
| `style.preset-default` | INFO | [3](03-style-design.md) | `editor/styletab.js` |
| `style.preset-detach` | INFO | [3](03-style-design.md) | `editor/styletab.js` |
| `style.preset-edit` | INFO | [3](03-style-design.md) | `editor/styletab.js` |
| `style.preset-form` | DEBUG | [3](03-style-design.md) | `editor/styletab.js` |
| `style.preset-refused` | WARN | [3](03-style-design.md) | `editor/styletab.js` |
| `style.refused` | WARN | [3](03-style-design.md) | `editor/styletab.js` |
| `style.reset` | DEBUG | [3](03-style-design.md) | `editor/styletab.js` |
| `style.search` | TRACE | [3](03-style-design.md) | `editor/styletab.js` |
| `style.set` | DEBUG | [2](02-edition.md) [3](03-style-design.md) | `editor/styletab.js` |
| `style.set-fail` | WARN | [3](03-style-design.md) | `editor/styletab.js` |
| `style.state` | DEBUG | [3](03-style-design.md) | `editor/styletab.js` |

## template

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `template.component` | DEBUG | [3](03-style-design.md) | `editor/templates.js` |
| `template.fail` | ERROR | [3](03-style-design.md) | `editor/templates.js` |
| `template.insert` | INFO | [3](03-style-design.md) | `editor/templates.js` |

## translate

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `translate.absent` | WARN | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.batch.cancel` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.batch.errors` | WARN | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.batch.fail` | ERROR | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.batch.ok` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.batch.progress` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.batch.ready` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.batch.start` | INFO | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.create` | DEBUG | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.model.download` | DEBUG | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.model.fail` | ERROR | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.model.ok` | INFO | [5](05-langues-traductions.md) [7](07-ia-locale.md) | `editor/translator.js` |
| `translate.model.start` | INFO | [5](05-langues-traductions.md) [7](07-ia-locale.md) | `editor/translator.js` |
| `translate.reuse` | DEBUG | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.single-lang` | DEBUG | [5](05-langues-traductions.md) | `editor/i18n-ui.js` |
| `translate.status` | INFO | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.status-fail` | WARN | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.text` | TRACE | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.text-fail` | WARN | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.timeout` | WARN | [5](05-langues-traductions.md) | `editor/translator.js` |
| `translate.unavailable` | WARN | [5](05-langues-traductions.md) | `editor/translator.js` |

## ui

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `ui.change` | DEBUG | [0](00-journal.md) | `editor/log.js` |
| `ui.click` | DEBUG | [0](00-journal.md) [2](02-edition.md) | `editor/log.js` |
| `ui.dialog.close` | DEBUG | [0](00-journal.md) [2](02-edition.md) [4](04-pages-images-contenus.md) | `editor/log.js` |
| `ui.dialog.open` | DEBUG | [0](00-journal.md) [2](02-edition.md) [4](04-pages-images-contenus.md) [8](08-verifier-exporter-publier.md) | `editor/log.js` |
| `ui.help` | INFO | [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/help.js` |
| `ui.key` | DEBUG | [0](00-journal.md) [1](01-demarrage-projet.md) [2](02-edition.md) | `editor/log.js` |
| `ui.lang` | INFO | [1](01-demarrage-projet.md) | `editor/ui-lang.js` |
| `ui.lang-missing` | WARN | [1](01-demarrage-projet.md) | `editor/ui-lang.js` |
| `ui.lang-ready` | DEBUG | [1](01-demarrage-projet.md) | `editor/ui-lang.js` |
| `ui.lang-save-fail` | WARN | [1](01-demarrage-projet.md) | `editor/ui-lang.js` |
| `ui.menu` | DEBUG | [0](00-journal.md) | `editor/log.js` |
| `ui.panel-reset` | INFO | [2](02-edition.md) | `editor/panel-resize.js` |
| `ui.panel-resize` | DEBUG | [2](02-edition.md) | `editor/panel-resize.js` |
| `ui.panel-restore` | DEBUG | [2](02-edition.md) | `editor/panel-resize.js` |
| `ui.toast` | ERROR, INFO, WARN | [0](00-journal.md) [1](01-demarrage-projet.md) [2](02-edition.md) [3](03-style-design.md) [4](04-pages-images-contenus.md) [7](07-ia-locale.md) [8](08-verifier-exporter-publier.md) [11](11-relecture-commentaires.md) | `editor/dom.js` |

## version

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `version.auto` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.delete` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.delete-fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.diff-fail` | WARN | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.init` | DEBUG | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.list` | DEBUG | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.list-fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.open` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.cancel` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.loaded` | DEBUG | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.ok` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.safety` | DEBUG | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.safety-missing` | WARN | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.restore.start` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.save.fail` | ERROR | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.save.ok` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.save.start` | INFO | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |
| `version.unnamed` | DEBUG | [4](04-pages-images-contenus.md) | `editor/versions-ui.js` |

## widgets

| Code | Niveau | Chapitre | Source |
|---|---|---|---|
| `widgets.extra` | DEBUG | [2](02-edition.md) | `editor/widgets-extra-loader.js` |
| `widgets.missing` | WARN | [2](02-edition.md) | `editor/widgets-extra-loader.js` |
