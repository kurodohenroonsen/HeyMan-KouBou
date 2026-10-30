# 15. Auto-test en console

L'auto-test rejoue **les cas d'usage de ce guide dans ton navigateur, sur ton installation**, comme si quelqu'un cliquait à ta place : il ajoute un widget, annule, crée une page, importe un logo, crée un agenda, exporte le site, teste la connexion à publish.php… Pour chaque cas, il vérifie **ce qui a changé dans le projet** et **le journal attendu** (les codes des chapitres précédents), puis donne un **rapport à coller** dans ton message. Ton projet est **mis de côté avant** et **remis exactement comme avant** à la fin (historique d'annulation compris) : tu peux le relancer autant de fois que tu veux.

**Domaines du journal** : `selftest.*` (l'auto-test et le retour arrière) ; chaque cas garde les codes de son chapitre (`page.*`, `collection.*`, `export.*`…).

---

## 15.1 Lancer l'auto-test

Trois façons, du plus simple au plus détaillé. À chaque fois : ne touche à rien et **reste sur cet onglet** pendant 20 à 60 secondes (dans un onglet en arrière-plan, Chrome ralentit la page et des cas dépasseraient leur délai). L'éditeur affiche l'exemple du MAB, des fenêtres s'ouvrent et se ferment, puis la fenêtre **🧪 Auto-test** montre le résultat, le retour arrière et le rapport : **📋 Copier le rapport** (ou **⇩ .md**) et colle-le dans ton message.

1. **Par l'adresse, sans console** : ouvre `http://localhost:8888/atelier/?autotest` (ton adresse + `?autotest`). L'auto-test démarre tout seul ; l'adresse est nettoyée aussitôt, donc un rechargement ne le relance pas. `?autotest=real` utilise ton Gemini Nano, `?autotest=off` ignore les cas d'IA.
2. **Ctrl+K** « Auto-test ».
3. **Dans la console** (F12, onglet Console), une commande courte à **taper** :
   ```js
   autotest()
   ```
   Elle renvoie une ligne de résultat et ouvre la même fenêtre. Avec options : `autotest({ ai: 'real' })`, `autotest({ only: [4] })`.

**Chrome refuse de coller dans la console ?** C'est une protection de Chrome la première fois : tape à la main `allow pasting` (ou `autoriser le collage` si Chrome est en français), Entrée, puis colle. Le plus simple reste de taper `autotest()` ou d'utiliser l'adresse `?autotest`.

**Pour les développeurs** : `copy(await atelierDebug.selftest())` fait la même chose sans fenêtre et met le rapport dans le presse-papiers (`copy` est une commande de la console de Chrome) ; `await atelierDebug.report()` redonne le dernier rapport.

**Options**
| Option | Effet | Exemple |
|---|---|---|
| `only` | seulement ces cas (identifiants ou numéros de chapitre) | `atelierDebug.selftest({ only: [4, 'demander'] })` |
| `skip` | tous sauf ceux-là | `atelierDebug.selftest({ skip: ['publication'] })` |
| `ai` | `'fake'` (par défaut) : faux modèle intégré, vérifie les écrans ; `'real'` : ton Gemini Nano ; `false` : cas d'IA ignorés | `atelierDebug.selftest({ ai: 'real' })` |
| `publish` | `true` (par défaut) : test de connexion à publish.php avec l'adresse du projet — **lecture seule, jamais de publication** ; `false` : ignoré | `atelierDebug.selftest({ publish: false })` |
| `full` | ajoute tout le journal de l'auto-test au rapport (long) | `autotest({ full: true })` |
| `download` | télécharge aussi un .json (rapport, résultats, journal) | `atelierDebug.selftest({ download: true })` |

`await atelierDebug.cases()` liste les identifiants. Pour la **qualité** des réponses du vrai Gemini Nano, le bon outil reste le banc d'essai (chapitre 14) ; `ai: 'real'` vérifie surtout que les écrans fonctionnent avec lui.

**Les 26 cas**
| Identifiant | Chapitre | Cas | Vérifié |
|---|---|---|---|
| `demarrage` | 1 | Projet de test chargé et enregistré | exemple affiché, `storage.save` |
| `journal` | 0 | Fenêtre 🐞 : ouvrir, régler, fermer | lignes affichées, réglage remis |
| `selection` | 2 | Clic, flèche ↓, Échap | titre, élément suivant, colonne parente |
| `ajout` | 2 | Widget depuis la bibliothèque | un bouton de plus, sélectionné |
| `annuler` | 2 | Annuler, rétablir | le bouton part puis revient |
| `raccourcis` | 2 | Ctrl+D, Ctrl+C, Ctrl+V, Suppr | nombre de titres à chaque étape |
| `texte` | 2 | Titre modifié dans la page | texte enregistré, `edit.ok` |
| `panneaux` | 2 | Élargir les panneaux (clavier, double-clic) | panneau de gauche et de droite plus larges, poignée qui annonce sa largeur, largeur d'origine ; tes largeurs sont remises après |
| `infobulles` | 2 | Infobulles des boutons | survol de ↶ (« Annuler » + touches), passage rapide sur ✨, masquage au clic |
| `commande` | 2 | Ctrl+K « journal de débogage » | la fenêtre s'ouvre |
| `style` | 3 | Taille du texte, ↺ | 31px posé puis retiré |
| `appareils` | 3 | Mobile puis ordinateur | largeur du canevas |
| `pages` | 4 | Créer puis supprimer une page | page ouverte, puis disparue |
| `image` | 4 | Logo dessiné par le test | image convertie, dans le projet |
| `collection` | 4 | Agenda, événement, CSV | date et titre enregistrés, .csv |
| `versions` | 4 | Enregistrer puis supprimer | version listée puis retirée |
| `traductions` | 5 | Tableau, filtre | tableau affiché |
| `seo` | 6 | Référencement, autre langue | analyse relancée |
| `ia-etat` | 7 | État des modèles | fenêtre remplie |
| `verifier-exporter` | 8 | Vérification puis .zip | export autorisé, .zip produit |
| `enregistrer-json` | 1 | Ctrl+S | .json lisible avec toutes les pages |
| `publication` | 8 | Tester la connexion à publish.php | réponse de publish.php, version à jour |
| `palette` | 12 | Palette depuis le logo, annuler | couleurs AA, appliquée puis annulée |
| `contenus-texte` | 12 | Fiches depuis un texte collé (IA) | 3 fiches proposées puis créées |
| `demander` | 13 | « ajoute une FAQ de 3 questions » (IA) | FAQ ajoutée, Ctrl+Z l'enlève d'un coup |
| `collaboration` | 10 | Deux appareils | toujours ignoré (voir le chapitre 10) |

**Journal attendu** — par l'adresse ([`journaux/autotest-adresse.log`](journaux/autotest-adresse.log)) :
```log
<<autotest-adresse>>
```

Puis, cas par cas ([`journaux/autotest-lancement.log`](journaux/autotest-lancement.log), début)
```log
<<autotest-lancement|selftest.run.start,selftest.backup.start,selftest.backup.ok,selftest.case>>
```

---

## 15.2 Lire le rapport

Le rapport commence par le **résultat** (« 23 / 23 réussis — Note : 100 / 100 ») et l'**état du retour arrière**, puis un tableau des cas. Pour chaque cas raté, il donne :
- les **vérifications ratées**, avec ce qui a été lu (« un bouton de plus sur la page — attendu 3, lu 2 ») ;
- les **codes du journal attendus qui manquent** (comparer avec le chapitre du cas) ;
- les **erreurs inattendues** (`ERROR` qui ne fait pas partie du cas) ;
- l'**extrait du journal du cas** (les 80 dernières lignes).

Viennent ensuite tous les avertissements et erreurs de la durée du test, puis l'environnement (navigateur, stockage, IA, projet).

| Statut | Sens |
|---|---|
| **✓ réussi** | toutes les vérifications et tous les codes attendus, aucune erreur inattendue |
| **✗ échoué** | une vérification ratée, un code attendu manquant ou une erreur inattendue |
| **⚠ erreur** | le cas s'est arrêté : élément introuvable, délai dépassé, exception (la cause est donnée) |
| **– ignoré** | condition absente : pas d'IA, pas d'adresse de publish.php, deux appareils nécessaires, arrêt demandé |

Exemple réel : publish.php introuvable à l'adresse du projet (le cas échoue, la cause est dans le rapport) :
```
### ✗ Tester la connexion à publish.php (sans publier) (`publication`, chapitre 8)
- ✗ publish.php répond — réponse 404 qui n’est pas celle de publish.php
```
→ chapitre 8, « Tester la connexion » : vérifier l'adresse et que le fichier est bien déposé.

---

## 15.3 Le retour arrière

Avant le premier cas, ton projet est mis de côté **trois fois** :
1. **en mémoire**, avec l'historique d'annulation, la page, la langue et l'appareil ouverts ;
2. dans un **emplacement de secours** de la base locale du navigateur ;
3. comme **version de sécurité** « Avant l'auto-test (date) » (Fichier → Versions).

À la fin — même si un cas plante — l'éditeur remet tout, vérifie que le projet est **identique à l'original** (comparaison du contenu), le réenregistre et le relit, remet les réglages du journal et les préférences du navigateur, puis supprime les versions et images créées pendant le test. La copie de secours et la version de sécurité ne sont effacées **que si** la vérification est bonne.

```log
<<autotest-rollback|selftest.rollback.start,selftest.rollback.memory,selftest.rollback.saved,selftest.rollback.ok,selftest.run.ok>>
```

**Arrêter et revenir en arrière tout de suite** :
```js
await atelierDebug.rollback()
```
Pendant un test, l'arrêt se fait **après le cas en cours** (les cas suivants sont « ignorés : arrêté »), puis le projet est remis ([`journaux/autotest-rollback.log`](journaux/autotest-rollback.log)) :
```log
<<autotest-rollback|selftest.stop,selftest.case,selftest.rollback.ok>>
```

**Page rechargée ou onglet fermé en plein test** : au prochain démarrage, l'éditeur reprend la copie de secours tout seul, fait le ménage et l'annonce (« L'auto-test avait été interrompu : ton projet a été remis comme avant. »). L'historique d'annulation repart de zéro dans ce cas ([`journaux/autotest-interrompu.log`](journaux/autotest-interrompu.log)) :
```log
<<autotest-interrompu|storage.load,selftest.recovered,selftest.rollback.start,storage.version-delete,storage.project-delete,selftest.rollback.ok>>
```

| Situation | Message | Journal | Que faire |
|---|---|---|---|
| Session de collaboration en cours | « Auto-test refusé : quitte d'abord la session de collaboration » | `selftest.refused` (WARN) | les modifications partiraient chez les autres : quitter 👥, relancer |
| Mode relecture | « Auto-test refusé en mode relecture. » | `selftest.refused` (WARN) | idem |
| Déjà en cours | « Un auto-test est déjà en cours. » | `selftest.refused` (WARN) | attendre, ou `atelierDebug.rollback()` |
| Sélection vide | liste des identifiants | `selftest.refused` (WARN) | corriger `only` / `skip` |
| Retour arrière incomplet | « Retour arrière : ✗ … » | `selftest.rollback.fail` (ERROR) | `await atelierDebug.rollback()`, ou restaurer « Avant l'auto-test » dans Versions |
| Copie de secours introuvable | « … restaure la version « Avant l'auto-test » » | `selftest.recover-missing` (WARN) | Fichier → Versions |
| Presse-papiers refusé | « Copie refusée : clique dans le rapport, Ctrl+A puis Ctrl+C » | `selftest.copy-fail` (WARN) | sélectionner le texte du rapport, ou « ⇩ .md » |

```log
<<autotest-refus>>
```

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `selftest.run.start`, `selftest.run.ok`, `selftest.run.fail` | INFO / INFO / ERROR | un passage complet (cas, résultat, état du retour arrière) |
| `selftest.run.aborted` | ERROR | auto-test interrompu par une erreur imprévue (le retour arrière a quand même lieu) |
| `selftest.backup.start`, `selftest.backup.slot`, `selftest.backup.ok`, `selftest.backup.fail` | INFO / DEBUG / INFO / ERROR | mise de côté du projet (mémoire, copie de secours, version de sécurité) |
| `selftest.case-start` | DEBUG | début d'un cas |
| `selftest.case` | INFO / WARN | un cas terminé (statut, durée) |
| `selftest.check-fail` | WARN | une vérification ratée, avec ce qui a été lu |
| `selftest.missing` | WARN | codes du journal attendus absents pendant le cas |
| `selftest.unexpected` | WARN | erreurs inattendues pendant le cas |
| `selftest.download` | DEBUG | téléchargement intercepté pendant le test (rien n'est enregistré sur l'ordinateur) |
| `selftest.copy`, `selftest.copy-fail` | DEBUG / INFO / WARN | rapport copié, ou presse-papiers refusé (depuis la console : DEBUG ; bouton de la fenêtre : INFO / WARN) |
| `selftest.dialog` | INFO | fenêtre 🧪 du rapport ouverte |
| `selftest.ai-recheck-fail` | DEBUG | état réel de l'IA non revérifié après le test (l'environnement du rapport peut être incomplet) |
| `selftest.focus-fallback` | DEBUG | la fenêtre n'avait pas le focus (console, Terminal ou autre application devant) : fin d'édition du texte simulée |
| `selftest.report-download` | INFO | rapport téléchargé en .md |
| `selftest.auto` | INFO | auto-test demandé par l'adresse `?autotest` |
| `selftest.refused` | WARN | auto-test refusé (collaboration, relecture, déjà en cours, sélection vide) |
| `selftest.stop` | INFO | arrêt demandé par `atelierDebug.rollback()` pendant un test |
| `selftest.rollback.start`, `selftest.rollback.ok`, `selftest.rollback.fail` | INFO / INFO / ERROR | retour arrière (fin de test, manuel, ou au démarrage) |
| `selftest.rollback.memory`, `selftest.rollback.saved` | DEBUG / WARN | projet remis en mémoire ; réenregistré et relu (WARN si différent) |
| `selftest.rollback.assets` | WARN | images temporaires non retirées (sans gravité) |
| `selftest.rollback.none` | INFO | `rollback()` : rien à restaurer |
| `selftest.recovered` | WARN | au démarrage : auto-test interrompu, copie de secours reprise |
| `selftest.recover-missing`, `selftest.recover-fail` | WARN / ERROR | copie de secours introuvable ; nettoyage impossible au démarrage |
| `store.restore` | INFO | éditeur remis dans l'état photographié (projet, historique, vue) |
| `storage.project-delete`, `storage.asset-delete` | DEBUG | copie de secours effacée ; images temporaires retirées |
