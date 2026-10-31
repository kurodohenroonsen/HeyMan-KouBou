# Journal des versions

## v29 — cycle 29 — 2026-10-31

### Ajouté
- Polices livrées avec le site (7 familles OFL dans `fonts/`, 762 Ko) : `@font-face` locales, préchargement de la police des titres, aucune requête vers Google ; police personnalisée `.woff2` (onglet Site → Typographie).
- Icône du site : `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `site.webmanifest`, `theme-color`.
- Pages « Mentions légales » et « Vie privée » générées dans les langues du site, liées au pied ; case de consentement obligatoire dans les formulaires.
- Page `404.html` par langue et `.htaccess` (404, https/www, en-têtes de sécurité, CSP, cache long, compression) ; option GitHub Pages sans `.htaccess`.
- publish.php version 5 : codes d'erreur traduits, `.htaccess` écrit par le serveur, polices, SVG, PDF, audio, manifeste acceptés.
- CSP stricte dans l'éditeur (`editor/boot.js` remplace les scripts en ligne).

### Modifié
- Noms des fichiers de `assets/` suffixés d'une empreinte de contenu ; `og:locale` régional, `twitter:title/description`, `<lastmod>` dans le plan du site.
- Signalisation de la collaboration : preuve de salle, 16 Ko par message, 2 Mo par salle, limite par adresse.

### Corrigé
- Publication partielle annoncée comme réussie (désormais HTTP 500 avec la liste des fichiers, manifeste inchangé).
- Trace de débogage et version de PHP lisibles sans jeton ; `rate.php` sans verrou ; expéditeur du formulaire dérivé de l'en-tête `Host`.
