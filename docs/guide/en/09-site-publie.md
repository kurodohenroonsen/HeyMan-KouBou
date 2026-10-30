# 9. The published site

*The log extracts below were captured in French; codes and levels are identical in every language (the messages in your log are in the interface language).*

The published site is made of static HTML pages, a style sheet and, if a page needs it, a small `site.js` script: mobile menu, contact form, “upcoming” event lists, galleries, and videos and maps that load on click. publish.php forwards contact forms by email.

**Log domains**: `site.*` (the visitor’s console, silent by default), `php.contact.*` (forms, on the server side, in the server log).

Note: the site script and publish.php write their own messages in French, whatever the interface language. They are quoted below as they appear, with their meaning in brackets.

---

## 9.1 Turn on the site log

**Goal**: see what the site does in a visitor’s browser (yours).

**Steps**
1. Add `?atelier-debug` to the address of a page: `https://www.média-alternatif.be/?atelier-debug`. The setting is kept on this device for every page of the site.
2. Console (F12): filter on `[Atelier site]`.
3. To turn it off: `?atelier-debug=0`.

**What you see**: nothing changes on screen; in the console, one line per event.

**Expected log** (real extract, simulated phone browser: [`journaux/site-publie-console.log`](../journaux/site-publie-console.log))
```log
[Atelier site] site.boot Page chargée {"page":"/","lang":"fr","forms":0,"lists":0}
[Atelier site] site.nav Menu mobile ouvert
[Atelier site] site.boot Page chargée {"page":"/contact/","lang":"fr","forms":1,"lists":0}
[Atelier site] site.form.submit Envoi du formulaire {"action":"http://127.0.0.1:9496/publish.php","fields":3}
[Atelier site] site.form.ok Message envoyé {"status":200,"req":"432cac3c"}
```
`site.boot` tells you how many forms linked to publish.php (`forms`) and how many dated lists (`lists`) the page contains.

Pages with no mobile menu, form, dated list, gallery, video or map have no script: nothing is shown, and that is normal.

---

## 9.2 Send a message with the contact form

**Goal**: a visitor writes to the media outlet; the message arrives by email at the address chosen in the editor (never visible in the page).

**Steps (visitor)**: fill in the form, then the send button (“Envoyer” on a French site).

**What you see**: the button is disabled while the message is being sent, then the confirmation message chosen in the editor appears; the form is cleared.

**Expected log**
- In the visitor’s console (with `?atelier-debug`): `site.form.submit` (number of fields filled in, without their content), then `site.form.ok` with `req`, the reference of the request on the server side.
- In the server log (🐞 → Server log, chapter 0; real extract: [`journaux/php-journal-contact.log`](../journaux/php-journal-contact.log)):
```log
2026-10-29T03:39:49.400Z INFO  php.contact.sent [req 8e07b221 · 0.6 ms] E-mail remis au serveur d’envoi de l’hébergement {"form":"n_5s081k324w","to":"re…@media-alternatif.be","from":"noreply@127.0.0.1","fields":3,"reply_to":true}
2026-10-29T03:39:49.400Z INFO  php.req.end [req 8e07b221 · 0.6 ms] Réponse 200 (contact) {"status":200,"route":"contact","mem_kb":365}
```
With `LOG_LEVEL = 'debug'` in publish.php, a `php.contact.start` line (DEBUG) comes first: form, shortened recipient, number of fields.

“E-mail remis au serveur d’envoi” (email handed to the sending server) means that PHP accepted the message (`mail()` answered yes). If it does not arrive, look in the spam folder first, then at the sender address `from`: at OVH, it must belong to the site’s domain (`noreply@your-domain`), which is the case if the site is opened through its real domain name.

**Variants**
| Situation | What changes | Log |
|---|---|---|
| Without JavaScript (old browser, script blocked) | the page reloads with the confirmation message | server: `php.contact.sent`, then `php.req.end` 303; console (if the log is on): `site.form.ok` “Retour du formulaire sans JavaScript : ok” (form returned without JavaScript: ok) |
| The visitor left their email address | the email received has “Reply to” set to the visitor | `"reply_to":true` |
| Robot (the hidden “website” field is filled in) | the robot sees “Merci.” (Thank you.), no email is sent | server: `php.contact.bot` (INFO) |

**Errors**
| Situation | Message shown to the visitor | Log | What to do |
|---|---|---|---|
| Form unknown to the server (site published before the address was set, or published by .zip/GitHub without an up-to-date publish.php) | “Formulaire inconnu.” (unknown form) | console: `site.form.fail` “Refusé par publish.php : Formulaire inconnu.” (refused by publish.php: unknown form); server: `php.contact.unknown` (WARN) with `known` = number of known forms | publish again from the editor through publish.php (publishing is what records the forms’ addresses) |
| Empty message | “Le message est vide.” (the message is empty) | server: `php.contact.empty` (INFO) | — |
| More than 5 messages in one hour from the same address | “Trop de messages envoyés. Réessayez dans une heure.” (too many messages sent, try again in an hour) | server: `php.contact.rate` (WARN) with the fingerprint `who` | normal (protection against abuse) |
| The hosting refuses to send | “L’envoi a échoué. Réessayez plus tard.” (sending failed, try again later) | server: `php.contact.mail-fail` (ERROR) with `to` and `from` | check in the customer area that sending email is turned on for the hosting; check `from` |
| publish.php missing or PHP down | “Le message n’a pas pu être envoyé” (the message could not be sent; text chosen in the editor) | console: `site.form.fail` “Réponse illisible (publish.php absent ?)” (unreadable reply, publish.php missing?) or “Réseau injoignable : …” (network unreachable) | check that publish.php is at the root of the site (chapter 8, connection test) |

Real extract of the unknown form, as seen by the server ([`journaux/php-contact-inconnu.log`](../journaux/php-contact-inconnu.log)):
```log
2026-10-29T03:38:13.745Z DEBUG php.req.start [req 64807b5b · 0 ms] POST reçu {"method":"POST","who":"e184e45609","bytes":23,"ua":"node","origin":""}
2026-10-29T03:38:13.745Z WARN  php.contact.unknown [req 64807b5b · 0.2 ms] Formulaire inconnu (republiez le site depuis l’éditeur) {"form":"inconnu","known":0}
2026-10-29T03:38:13.745Z WARN  php.req.end [req 64807b5b · 0.3 ms] Réponse 404 (contact) {"status":404,"route":"contact","mem_kb":365}
```

---

## 9.3 The site’s other behaviours

| What the visitor does | Log (console, with `?atelier-debug`) |
|---|---|
| Opens or closes the menu on a phone (☰) | `site.nav` “Menu mobile ouvert” / “fermé” (mobile menu opened / closed) |
| Opens a page with an “upcoming” or “past” event list | `site.list` “Liste filtrée par date” (list filtered by date) `{"when":"upcoming","today":"2026-10-29","shown":3,"total":5,"limit":0}` — `shown` = events shown according to the date **of the visitor’s device** |
| Clicks an image in an enlargeable gallery | `site.gallery` “Image agrandie” (image enlarged) |
| Clicks a video or a map (loaded only on click, for privacy) | `site.facade` “Contenu externe chargé après clic” (external content loaded after click) with the address without parameters |
| A JavaScript error happens on the page | `site.fail` “Erreur JavaScript : …” (JavaScript error) with the file and line (shown as a warning) |

If an “upcoming” list is empty although there are future events, compare `today` with the date of the events: it is the device’s date that counts, not the server’s.

---

## 9.4 The server and collaboration

publish.php also acts as an encrypted mailbox for starting a collaboration session (chapter 10). It cannot read the messages. Its lines:

| Code (server) | Level | Meaning |
|---|---|---|
| `php.signal.post` | DEBUG | encrypted message left (room shortened to 8 characters, sender, recipient, size) |
| `php.signal.get` | DEBUG | a participant collects their messages (once a second while connecting) |
| `php.signal.expired` | DEBUG | room inactive for 15 minutes, deleted |
| `php.signal.invalid` | WARN | message refused: invalid room, participant or data |
| `php.signal.too-big` | WARN | message over 64 KB refused |
| `php.signal.full` | WARN | more than 100 rooms open at the same time |

These lines are DEBUG: they only appear in the server log if `LOG_LEVEL` is `'debug'`, but they always reach the browser log with the trace (TRACE for collections of messages).

---

## Codes in this chapter
| Code | Level | Meaning |
|---|---|---|
| `php.contact.bot` | INFO | (server) robot detected, nothing is sent |
| `php.contact.empty` | INFO | (server) empty message refused |
| `php.contact.mail-fail` | ERROR | (server) the hosting refuses to send |
| `php.contact.rate` | WARN | (server) too many messages from the same address |
| `php.contact.sent` | INFO | (server) email handed to the sending server |
| `php.contact.start` | DEBUG | (server) contact message received |
| `php.contact.unknown` | WARN | (server) unknown form |
| `php.signal.expired` | DEBUG | (server) room deleted |
| `php.signal.full` | WARN | (server) too many rooms |
| `php.signal.get` | DEBUG | (server) messages collected |
| `php.signal.invalid` | WARN | (server) signalling message refused |
| `php.signal.post` | DEBUG | (server) message left |
| `php.signal.too-big` | WARN | (server) message too large |
| `site.boot` | INFO | page loaded |
| `site.facade` | INFO | video or map loaded after a click |
| `site.fail` | WARN | JavaScript error on the site |
| `site.form.fail` | WARN | form sending failed |
| `site.form.ok` | INFO | message sent |
| `site.form.submit` | INFO | form being sent |
| `site.gallery` | INFO | image enlarged |
| `site.list` | INFO | event list filtered by date |
| `site.nav` | INFO | mobile menu opened or closed |
