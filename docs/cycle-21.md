# Cycle 21 — Infobulles des boutons

## Demande
29/10/2026, Kudoro : « beaucoup de boutons ont des icônes mais on ne sait pas trop ce qu’ils font… serait-il possible de rajouter des mousehover ? »

## Constat (inventaire automatique)
Presque tous les boutons à icône ont déjà un texte d’aide (`title`), mais le navigateur ne l’affiche qu’après environ une seconde, en petit, jamais au clavier, et le raccourci est noyé dans le texte (« Annuler (Ctrl+Z) »).

## Spécification
- **Infobulle maison** pour tout élément de l’éditeur qui a un texte d’aide (`data-tip`, `title`, ou `aria-label` d’un bouton à icône) : apparaît après **0,35 s** au survol de la souris, **tout de suite** en passant d’un bouton à l’autre, et au **clavier** (Tab) ; disparaît en sortant, au clic, à Échap, au défilement.
- **Contenu** : le nom en gras ; une ligne d’explication pour les boutons les plus obscurs (`data-tip-desc` : ✨, 👥, 💬, 🐞, ↶ ↷, appareils, ✥…) ; le **raccourci** en touches (« Ctrl » « Z »), avec **⌘ ⇧ ⌥ ⌫** sur Mac.
- Pas de double infobulle : le `title` passe dans `data-tip` au premier survol ; le bouton garde un nom accessible (`aria-label`).
- **Canevas** : la barre de l’élément sélectionné (↰ ✥ ⧉ ✕) a les mêmes infobulles, placées au bon endroit malgré la réduction du canevas ; les `title` du contenu du site ne sont pas concernés.
- **Placement** : sous l’élément, au-dessus s’il n’y a pas la place, jamais hors de la fenêtre.
- **Couverture** : un test parcourt les panneaux, l’inspecteur et les fenêtres principales : tout bouton visible sans au moins trois lettres doit avoir un texte d’aide.
- **Auto-test** : nouveau cas `infobulles` (chapitre 2).

## Tests écrits d’abord
- `tests/tooltip.test.js` : lecture du raccourci dans le texte (`Annuler (Ctrl+Z)`, `(Échap)`, `(Ctrl+Maj+Z)`), touches Mac, bouton « à icône », choix du texte (data-tip > title > aria-label).
- `tools/e2e/cycle21.mjs` : couverture ; survol ↶ → infobulle « Annuler » + Ctrl Z, sous le bouton, sans `title` natif ; passage rapide ↶ → ↷ ; sortie, Échap, clic ; clavier ; barre du canevas ; bord de la fenêtre ; explication de ✨.

## Livré
- `core/tooltip.js` (sans DOM, testé) : raccourci lu dans le texte d’aide, touches Mac, bouton « à icône », choix du texte, placement.
- `editor/tooltip.js` : infobulle unique (`#atelierTip`, `role="tooltip"`, `aria-describedby`), survol 0,35 s, passage rapide immédiat, clavier (Tab, `:focus-visible`), masquage (sortie, clic, Échap, défilement, fenêtre quittée), dans la fenêtre modale ouverte pour passer devant, barre du canevas avec la réduction ; `title` déplacé dans `data-tip`, `aria-label` ajouté aux boutons à icône qui n’en avaient pas ; explications des boutons les plus obscurs.
- Auto-test : cas `infobulles` (25 cas). Guide : chapitre 2.16, chapitre 15.

## Tests
- Unitaires : 338 (dont 5 pour les infobulles).
- Bout en bout : `cycle21`, 18 vérifications ; régression complète : 1575 vérifications, 0 échec.

## Correctif : progression des téléchargements de Chrome (29/10/2026)
- Constat (journal de Kudoro) : Gemini Nano, Summarizer, Rewriter et Writer « … téléchargement » (lancés par Chrome en arrière-plan) : aucun bouton, aucun pourcentage, fenêtre jamais mise à jour.
- Livré : bouton « Voir la progression » qui s'accroche au téléchargement en cours (`ai.download-follow`), pourcentage dans la ligne, mise à jour automatique toutes les 3 s tant que la fenêtre ✨ est ouverte (`ai.download-done`). APP_VERSION 21.
- Test d'abord : `cycle21` (22 vérifications) ; régression complète : 1579 vérifications, 0 échec.
- Suite (journal de Kudoro, 17:50) : 5 suivis lancés, aucun avancement ; `chrome://on-device-internals` montre `nano_v3_gpu_component` repassé à « Not Installed » et `gemma4_component` « Foreground Installing » à 0 % : le blocage est du côté de Chrome. Ajout : après 20 s sans avancement, la ligne dit « Chrome n'avance pas » avec un conseil, `ai.download-stalled` (WARN). Test d'abord (`cycle21`, 25 vérifications) ; specs IA (c16-langues-ia, cycle17, cycle19, cycle20) : 382 vérifications, 0 échec.
- Suite (18:06) : Chrome télécharge enfin `gemma4_component` (18,5 Mo / 2,0 Go), mais il envoyait « 0 % » en boucle : le détecteur de blocage ne comptait que les événements. Correction : seule une vraie avancée compte, et l'alerte n'est plus écrasée par les « 0 % ». Infobulle au clavier : elle suit son bouton quand la barre défile au lieu de disparaître (test qui échouait 1 fois sur 3, puis 4 fois sur 4).
- Régression complète : 1582 vérifications, 0 échec (une première passe avait eu un délai dépassé isolé dans `cycle5`, non reproduit en trois relances ni dans la passe suivante).
