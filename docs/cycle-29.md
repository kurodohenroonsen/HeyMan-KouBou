# Cycle 29 — Site publié conforme

## Demande
Audit du 30/10/2026, § 4.2 (N13, N14, N15, N21, N22) et § 6.3 « Cycle 29 » : polices auto-hébergées et police personnalisée (W1), icône, manifeste et métadonnées (W2), pages légales et consentement (W3), publish.php v5 (S4), CSP de l'éditeur, `.htaccess` et 404 du site publié (S5) — un seul redépôt FTP.

## Spécification
- **W1** : 7 polices OFL embarquées (`fonts/`, manifeste `core/fonts.js`), lues par `fetch('fonts/…')` à l'export et à la publication, écrites dans `assets/fonts/` (noms suffixés d'une empreinte) ; `@font-face` locales `font-display: swap`, `<link rel="preload">` de la police des titres ; canevas sur les mêmes fichiers ; plus de `googleFontsHref` ni de `preconnect`. Police personnalisée `.woff2` (nom, graisse, style) dans `site.fonts`, utilisable pour titres ou texte. Japonais : pile système.
- **W2** : « Icône du site » (PNG, JPEG, WebP, SVG assaini) → `favicon.ico` (PNG 32 dans un ICO, encodeur maison), `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `site.webmanifest` ; `theme-color` = couleur principale ; `og:locale` régional ; `twitter:title/description` ; `<lastmod>` (dernière modification de la séance).
- **W3** : `core/legalpages.js` — « Mentions légales » (dénomination, forme, siège, BCE, RPM, e-mail, téléphone, TVA facultative, hébergeur) et « Vie privée » (formulaire relayé sans stockage, façades, polices locales, aucun cookie, hébergeur, droits RGPD, APD) en 5 langues, liées au pied ; case de consentement `required` liée à la page vie privée ; publish.php refuse un envoi sans `_consent`. Interface : « modèle à adapter, à faire relire ».
- **S4** : publish.php v5 — 16 Ko par message, 2 Mo par salle, 200 messages par quart d'heure et par adresse hachée, **preuve de salle** ; `rename` en échec → 500 `move_failed` + liste, manifeste non écrit ; trace et version PHP réservées au jeton ; `rate.php` sous `flock` ; `From` fixé depuis `baseUrl` ; extensions `woff2 svg pdf mp3 m4a ogg ics webmanifest ico` ; `.htaccess` écrit par publish.php lui-même ; `{ok:false, code, message}` traduit par l'éditeur ; message de mise à jour pour une v4.
- **S5** : CSP dans `index.html`, démarrage déplacé dans `editor/boot.js` (catalogue chargé par un `<script>` inséré, puis `app.js` ; plus de `document.write`) ; `404.html` par langue (`<base>`, en-tête et pied du site, liens vers les accueils) ; `.htaccess` (404 par langue, https et www d'après `baseUrl`, en-têtes, CSP du site, HSTS, cache long sur les fichiers à empreinte, charset, `mod_deflate`) ; option GitHub Pages (`publish.server = 'pages'`) sans `.htaccess`.

## Tests écrits d'abord
- `tests/fonts.test.js` (6) : empreintes, manifeste ↔ `fonts/` (existence, taille, empreinte, licence), `@font-face`, préchargement, police personnalisée.
- `tests/render-c29.test.js` (8) : aucune URL Google, `@font-face` locales, preload, icônes et manifeste, `theme-color`, `og:locale`, `twitter:*`, `lastmod`, 404, `.htaccess` selon `baseUrl` et mode, noms suffixés, `rel="icon"`, `sanitizeSvg`.
- `tests/legalpages.test.js` (5) : champs obligatoires, contenu par langue, échappement, lien dans le pied, consentement `required`.
- `tests/publish-php.test.js` : 8 cas v5 (trace sans jeton → 404, codes, nouvelles extensions, `.php`/`.htaccess` refusés, `.htaccess` identique au gabarit de l'éditeur et options forgées refusées, `moved < count` → 500, `Host` forgé sans effet, sans consentement → 400, preuve de salle, 16 Ko → 413, salle 2 Mo, 201ᵉ message → 429) ; anciens cas adaptés.
- `tools/e2e/cycle29.mjs` (46 vérifications) : 0 violation CSP (éditeur et canevas, toutes les fenêtres, édition, export, publication), polices du canevas, police personnalisée, icône, pages légales en un clic, consentement, export servi : hôtes = 127.0.0.1 seulement, icône servie, 404, formulaire sans consentement non envoyé, publish.php v4 → message de mise à jour.

## Livré
- Fichiers : `core/fonts.js`, `core/fingerprint.js`, `core/siteicon.js`, `core/htaccess.js`, `core/legalpages.js`, `editor/fontfiles.js`, `editor/boot.js`, `fonts/` (7 familles, 762 Ko), `docs/tiers.md`, `i18n/parts/K-site-publie.*.json` (104 chaînes).
- Modifiés : `core/render.js`, `core/theme.js`, `core/site.js`, `core/publish.js`, `core/widgets-extra.js`, `editor/canvas.js`, `editor/app.js`, `editor/panels.js`, `editor/pages.js`, `editor/images.js`, `editor/publish-ui.js`, `editor/collab-net.js`, `editor/log.js`, `editor/cmdk.js`, `editor/help.js`, `index.html`, `tools/guide-index.mjs`.
- Guide : 4.31 (polices), 4.32 (icône), 4.33 (pages légales, consentement), 8.7 (publish.php v5, `.htaccess`, 404, codes d'erreur, hébergement de l'éditeur), 9.5 (vie privée, en-têtes, signalisation).
- Scénarios adaptés : `cycle10` (noms suffixés), `cycle12` (case de consentement), `cycle16` (pas de trace avec un jeton faux, trace avec jeton).

## Limites et décisions
- **Preuve de salle** : `roomId = sha256('atelier-room|' + secret)` ne permet pas de preuve vérifiable sans révéler le secret ; la boîte aux lettres utilise donc une salle dérivée : `preuve = sha256('atelier-proof|' + secret)`, `salle = sha256('atelier-room|' + preuve)`. Le serveur vérifie la pré-image sans jamais voir le secret ; quiconque voit la preuve (le serveur) peut déposer, mais il est déjà de confiance. Pas de rotation quotidienne (HMAC du jour) : inutile avec ce schéma, à revoir si les invitations deviennent révocables (K1).
- **CSP de l'éditeur** : deux écarts au texte de l'audit, justifiés par des fonctions existantes — `connect-src` ajoute `data: blob:` (lecture locale d'images pour l'IA) et `http://localhost:* http://127.0.0.1:*` (publish.php local, seule exception http déjà admise) ; `img-src` ajoute `https:` (images en ligne choisies par adresse depuis le cycle 3).
- Trace de débogage : sans jeton → 404 ; avec un jeton faux, la requête continue sans trace (sinon un préflight ou une relève de boîte aux lettres échouerait).
- Le japonais n'a pas de police embarquée ; une police personnalisée n'a pas de sous-ensemble automatique.
- Pages légales : textes à faire relire par un juriste (et la version japonaise par une personne de langue japonaise) ; pas de mise à jour automatique d'une page déjà générée (en recréer une).
- Une publication vers publish.php v4 n'envoie ni polices, ni SVG, ni manifeste, ni `.htaccess` (message affiché).
- Les traductions EN/JA du guide restent à faire (vague suivante).
