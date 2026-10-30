Also available in: [Français](../README.md) · [日本語](../ja/README.md)

# Atelier user guide — with the expected logs

This guide describes **every feature** of Atelier, one use case at a time. For each one:

1. **Goal** and **steps**: what you do.
2. **Normal path**: what you see, then the **expected log**.
3. **Variants**: the other paths that also succeed.
4. **Errors**: what can fail, the message shown, the log line, and what to do.

The log extracts are **real**: they are captured by the end-to-end tests (folder [`journaux/`](../journaux/)). Times, durations and identifiers change from one run to the next; what matters are the **codes**, their **order** and their **level**.

## Getting started
New to Atelier? Start here, no technical knowledge needed:
- [Welcome to Atelier](bienvenue.md): what Atelier does for you, in a few minutes.
- [Getting started: the Kumakōgen tourist website](prise-en-main.md): build two complete pages step by step, using every widget.
- [All the widgets](widgets.md): every element you can place in a page, what it is for and what you can set.

The chapters below describe each feature in detail. The **technical details** (log, codes) are mostly useful when something goes wrong: in the online guide, they stay hidden until you tick “Show technical details”.

## Chapters
| # | Chapter | Contents |
|---|---|---|
| 0 | [The debug log](00-journal.md) | Getting the browser, console and server logs; reading a line; settings |
| 1 | [Start, save, open](01-demarrage-projet.md) | Start-up, automatic saving, .json files, example, new site, preview |
| 2 | [Edit a page](02-edition.md) | Selection, adding, drag and drop, in-place text, copy and paste, undo, structure, Ctrl+K, shortcuts, tooltips |
| 3 | [Layout and design](03-style-design.md) | Inspector, styles per device and per state, presets, site colours and fonts, templates, components, header and footer |
| 4 | [Pages, images, collections, versions](04-pages-images-contenus.md) | Pages and menu, images, collections (members, news, events), CSV, versions |
| 5 | [Languages and translations](05-langues-traductions.md) | Site languages, translation table, on-device translation, “to review”, CSV |
| 6 | [SEO](06-seo.md) | Scores, previews, fields, tips, publishing |
| 7 | [On-device AI (Gemini Nano)](07-ia-locale.md) | Status and download, rewrite, proofread, descriptions, alt text |
| 8 | [Check, export, publish](08-verifier-exporter-publier.md) | Check before export, accessibility, .zip, OVH (publish.php), GitHub, server log |
| 9 | [The published site](09-site-publie.md) | Contact forms, mobile menu, “upcoming” events, videos and maps, site log |
| 10 | [Collaborate](10-collaboration.md) | Hosting, inviting, joining, presence, offline, manual codes, network |
| 11 | [Review and comments](11-relecture-commentaires.md) | Review mode, signed comments, replies, resolving |
| 12 | [Smart content](12-contenus-intelligents.md) | Poster → event, pasted text → items, standfirst and headings, review summary, palette from the logo |
| 13 | [Ask Atelier](13-demander-a-atelier.md) | Requests in everyday language, closed list of actions, described page, refusals |
| 14 | [On-device AI test bench](14-banc-essai.md) | Testing the real Gemini Nano on fixed examples, reading the report |
| 15 | [Self-test in the console](15-auto-test.md) | Replaying every use case in your browser, report to paste, rollback |
| A | [Log code index](index-codes.md) | All the codes, by domain, with their level and chapter |

## Reading a log line
```
12:03:04.567 +2.31s INFO  publish.php.ok [publish.php#2 · 840 ms] Site publié : 42 fichiers {"written":42,"removed":1,"ref":"9f3a01c2"}
│            │      │     │              │                        │                         └ data (secrets hidden)
│            │      │     │              │                        └ message
│            │      │     │              └ run no. 2 of “publish.php”, 840 ms since it started
│            │      │     └ stable code: domain.action
│            │      └ level: TRACE, DEBUG, INFO, WARN, ERROR
│            └ time since the editor was opened
└ local time
```
- A **run** starts with `….start`, may have steps, and ends with `….ok` (succeeded), `….fail` (failed, ERROR level, with the error) or `….cancel` (abandoned by the person).
- The `php.…` lines come from **publish.php** on the hosting: the editor receives them with the response when the log is in `debug` mode (see chapter 0). They carry `req`, the reference of the request on the server side.
- The `ui.…` lines (clicks, fields, windows, messages) show **what the person did**; they are left out of most extracts in this guide to keep them readable, but they are in the copied log.

## Levels
| Level | Meaning | Example |
|---|---|---|
| TRACE | Very verbose, off by default | hovering over an element, checking the mailbox every second |
| DEBUG | Detailed workings | change saved, click, window opened |
| INFO | Step visible to the person | publishing finished, project opened |
| WARN | Handled anomaly, fallback, expected refusal | token refused, image not found, AI API missing |
| ERROR | Failure | publishing impossible, local saving impossible, JavaScript error |

## To report a problem
1. Do the operation that causes the problem again.
2. Click **🐞** (top bar) then **📋 Copy the log**. If the hosting is involved, first open “Server log (publish.php)” and click **Read the server log**: its lines are added to the copy.
3. Paste everything into your message, with a sentence: what you did, what you expected, what happened.

The copied log starts with the environment (browser, screen, storage, project, settings): no need to describe it.
