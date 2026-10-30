# Cycle 23 — Panneaux de gauche et de droite redimensionnables

## Demande
30/10/2026, Kudoro : « fais qu’on puisse agrandir les deux sidebars à gauche et à droite ».

## Spécification
- Une **poignée** sur le bord intérieur de chaque panneau (`role="separator"`, nom dans la langue de l’interface, infobulle avec l’explication) : trait de couleur au survol, pointeur ↔.
- **Souris** : glisser ; la page se remet à l’échelle pendant le glisser ; le canevas n’avale pas le pointeur (`body.is-resizing`).
- **Clavier** : ← → (Maj : 64 px au lieu de 16), Début (le plus étroit), Fin (le plus large) ; `aria-valuenow` suit.
- **Double-clic** : largeur d’origine (290 / 330 px ; 250 / 300 px sous 1100 px de large).
- **Bornes** : au moins 220 px à gauche et 260 px à droite, au plus 640 px, toujours au moins 420 px pour la page ; la fenêtre rétrécit → les panneaux rétrécissent (sans perdre le choix enregistré). Sous 900 px : panneaux empilés, pas de poignée.
- **Retenu** sur l’appareil (`localStorage['atelier-panels']`) ; le panneau des commentaires prend la largeur de l’inspecteur.
- **Journal** : `ui.panel-resize` (DEBUG), `ui.panel-reset` (INFO), `ui.panel-restore` (DEBUG).
- **Auto-test** : cas `panneaux` (les largeurs de la personne sont remises après).

## Tests écrits d’abord
- `tests/panel-size.test.js` : largeurs d’origine, bornes (minimum, maximum, place du canevas, valeurs illisibles), pas du clavier selon le côté, lecture sûre des largeurs retenues.
- `tools/e2e/cycle23.mjs` : deux poignées ; glisser à gauche (+120 px, canevas plus étroit, remise à l’échelle, journal) ; à droite (+90 px) ; bornes ; clavier et `aria-valuenow` ; retenu après rechargement ; panneau des commentaires ; double-clic ; infobulle ; nom en japonais.

## Livré
- `core/panel-size.js` (sans DOM, testé), `editor/panel-resize.js`, variables CSS `--left-w` / `--right-w` de `.workspace`, poignées et styles ; traductions EN/JA (`i18n/parts/G-panneaux.*.json`) ; guide §2.17 en français, anglais et japonais ; auto-test : 26 cas.
- Régression complète : 1639 vérifications, 0 échec ; unitaires : 371.
