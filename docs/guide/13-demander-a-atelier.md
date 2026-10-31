# 13. Demander à Atelier

Tu écris ce que tu veux, en phrases : « ajoute une FAQ de 3 questions sur l’adhésion », « mets les titres de cette page en rouge et centrés », « crée une page Notre radio avec un héros, un texte et image et le contact ». L'IA locale (Gemini Nano, chapitre 7) traduit la demande en **actions choisies dans une liste fermée** : uniquement ce que l'éditeur sait déjà faire. Atelier **vérifie** chaque action, montre un **aperçu**, puis applique tout en **une seule étape d'annulation**. Aucun code n'est produit ; une action hors liste est refusée et expliquée.

**Domaines du journal** : `assist.*` (la fenêtre et l'application) et `ai.plan.*` (l'appel au modèle : `call`, `reply`, `rejected`, `actions`, `absent`…).

**La liste fermée**
| Action | Ce qu'elle fait |
|---|---|
| Ajouter une section | un modèle (héros, avantages, chiffres, témoignages, tarifs, FAQ, appel à l'action, contact, galerie, actualités, texte et image, vidéo), avec titre et texte, après la section sélectionnée ou en fin de page |
| Ajouter des questions fréquentes | une section FAQ avec les questions et réponses données (8 au plus) |
| Ajouter un élément | titre, texte, bouton, image, espace, séparateur, citation, accordéon, vidéo, carte, réseaux, encadré, chiffres, carte de contenu |
| Remplacer le texte | de l'élément sélectionné |
| Régler un style | couleur, fond, alignement, taille, graisse, casse, marges intérieures, arrondi — de la sélection, de la section, de tous les titres, textes ou boutons de la page |
| Changer une couleur de la palette | principale, secondaire, texte, fond, discrète, surface (le contraste est vérifié dans l'aperçu) |
| Créer une page | avec ses sections ; la page s'ouvre |
| Ouvrir une page, changer l'appareil ou la langue, ouvrir un outil | référencement, IA, publier, traductions, versions, journal, vérification, commentaires, palette depuis le logo, résumé de la relecture |

---

## 13.1 Demander depuis Ctrl+K

**Étapes**
1. Sélectionne l'endroit (par exemple un titre : la nouvelle section viendra après sa section).
2. **Ctrl+K**, tape ta demande (au moins trois mots) : la première ligne devient « ✨ Demander à Atelier : … » ; **Entrée**.
3. **✨ Préparer** (ou Ctrl+Entrée) : l'aperçu liste les actions, les refus et les avertissements.
4. **Appliquer** ; Ctrl+Z annule toute la demande en une fois.

**Journal attendu** ([`journaux/demander-faq.log`](journaux/demander-faq.log))
```log
14:33:02.142 +1.33s INFO  cmdk.run Commande : ✨ Demander à Atelier : « ajoute une faq sur l’adhésion » {"id":"ask:query","query":"ajoute une faq sur l’adhésion"}
14:33:02.143 +1.33s INFO  assist.open Demander à Atelier {"chars":29,"page":"p_npfmhg4o","selected":"n_451r6g4p6i","lang":"fr"}
…
14:33:02.191 +1.38s INFO  ai.plan.start [ai.plan#1] IA locale : préparer une demande (actions de la liste fermée) {"task":"plan","request":"ajoute une faq sur l’adhésion","inLen":29,"page":"p_npfmhg4o","selected":"n_451r6g4p6i","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:33:02.194 +1.38s DEBUG ai.plan.call [ai.plan#1 · 3 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"actions,summary","system":"2672 car.","inLen":310}
14:33:02.195 +1.38s DEBUG ai.plan.reply [ai.plan#1 · 4 ms] Réponse Prompt API (Gemini Nano) : 357 car. en 1 ms {"api":"prompt","ms":1,"outLen":357,"excerpt":"{\"summary\":\"J’ajoute une section de questions fréquentes su…"}
14:33:02.197 +1.39s INFO  ai.plan.actions [ai.plan#1 · 6 ms] 1 action valide : add_faq {"steps":["add_faq"],"summary":"J’ajoute une section de questions fréquentes sur l’adhésion."}
14:33:02.197 +1.39s INFO  ai.plan.ok [ai.plan#1 · 6 ms] Demande à Atelier : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"steps":1,"rejected":0,"warnings":0}
14:33:02.197 +1.39s INFO  assist.plan 1 action(s) prête(s), 0 refusée(s) {"request":"ajoute une faq sur l’adhésion","summary":"J’ajoute une section de questions fréquentes sur l’adhésion.","steps":["add_faq"],"rejected":0,"warnings":0}
14:33:02.386 +1.57s INFO  assist.apply.start [assist.apply#1] Application de 1 action(s) {"steps":["add_faq"]}
14:33:02.389 +1.58s INFO  assist.apply.step [assist.apply#1 · 3 ms] Ajouter des questions fréquentes « Adhérer au MAB » (3 questions) après la section « Fédération indépendante »
…
14:33:02.404 +1.59s INFO  assist.apply.ok [assist.apply#1 · 18 ms] 1 action(s) appliquée(s) (Ctrl+Z pour tout annuler) {"done":1,"errors":0,"aiTexts":7,"view":{},"ui":[],"changed":true}
…
14:33:02.470 +1.66s INFO  store.undo Annuler {"left":0,"redo":1}
```
À vérifier : `ai.plan.call` montre la taille de la consigne (`system`, avec le catalogue) et de la demande ; `ai.plan.actions` les actions retenues ; `assist.apply.step` une ligne par action appliquée ; `assist.apply.ok` le nombre de textes écrits par l'IA (`aiTexts`, marqués « à relire »).

**Variante — un réglage sur toute la page** ([`journaux/demander-style.log`](journaux/demander-style.log))
```log
14:33:02.996 +2.18s INFO  ai.plan.actions [ai.plan#2 · 1 ms] 2 actions valides : style, style {"steps":["style","style"],"summary":"Je mets les titres en rouge et je les centre."}
…
14:33:02.996 +2.18s INFO  assist.plan 2 action(s) prête(s), 0 refusée(s) {"request":"mets les titres de cette page en rouge et centrés","summary":"Je mets les titres en rouge et je les centre.","steps":["style","style"],"rejected":0,"warnings":0}
…
14:33:03.041 +2.23s INFO  assist.apply.step [assist.apply#2 · 7 ms] Couleur du texte : #dc2626 pour tous les titres de la page (7)
14:33:03.041 +2.23s INFO  assist.apply.step [assist.apply#2 · 7 ms] Alignement : center pour tous les titres de la page (7)
…
14:33:03.054 +2.24s INFO  assist.apply.ok [assist.apply#2 · 20 ms] 2 action(s) appliquée(s) (Ctrl+Z pour tout annuler) {"done":2,"errors":0,"aiTexts":0,"view":{},"ui":[],"changed":true}
```
« rouge » devient `#dc2626`, « centré » devient `center` : le modèle dit ce qu'il a compris, le code convertit et vérifie (une couleur ou une valeur non reconnue est refusée).

---

## 13.2 Créer une page à partir d'une description

**Étapes** : panneau **Pages** → **✨ Page décrite** (ou Ctrl+K) ; décris la page ; **✨ Préparer** ; **Appliquer**. La page est créée avec ses sections, titres et textes de départ, puis ouverte.

**Journal attendu** ([`journaux/demander-page.log`](journaux/demander-page.log))
```log
14:33:03.402 +2.59s INFO  assist.open Demander à Atelier {"chars":23,"page":"p_npfmhg4o","selected":"n_451r6g4p6i","lang":"fr"}
…
14:33:03.472 +2.66s DEBUG ai.plan.call [ai.plan#3 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"actions,summary","system":"2672 car.","inLen":357}
…
14:33:03.473 +2.66s WARN  ai.plan.rejected [ai.plan#3 · 2 ms] Action refusée (add_page) : Modèle de section inconnu : carrousel-3d (section ignorée dans la page « Notre radio »). {"action":"add_page"}
14:33:03.473 +2.66s INFO  ai.plan.actions [ai.plan#3 · 2 ms] 2 actions valides : add_page, open_tool {"steps":["add_page","open_tool"],"summary":"Je crée la page « Notre radio » avec trois sections."}
…
14:33:03.473 +2.66s INFO  assist.plan 2 action(s) prête(s), 1 refusée(s) {"request":"Crée une page « Notre radio » avec un héros, un texte et image et le contact","summary":"Je crée la page « Notre radio » avec trois sections.","steps":["add_page","open_tool"],"rejected":1,"warnings":0}
14:33:03.473 +2.66s WARN  assist.rejected Action refusée (add_page) : Modèle de section inconnu : carrousel-3d (section ignorée dans la page « Notre radio »). {"action":"add_page"}
14:33:03.520 +2.71s INFO  assist.apply.start [assist.apply#3] Application de 2 action(s) {"steps":["add_page","open_tool"]}
14:33:03.524 +2.71s INFO  assist.apply.step [assist.apply#3 · 4 ms] Créer la page « Notre radio » avec « Héros », « Texte et image », « Contact »
14:33:03.524 +2.71s INFO  assist.apply.step [assist.apply#3 · 4 ms] Ouvrir « Référencement »
…
14:33:03.537 +2.73s DEBUG store.view Vue : pageId=p_t4t7f4p0 {"pageId":"p_t4t7f4p0"}
…
14:33:03.583 +2.77s INFO  assist.apply.ok [assist.apply#3 · 63 ms] 2 action(s) appliquée(s) (Ctrl+Z pour tout annuler) {"done":2,"errors":0,"aiTexts":3,"view":{"pageId":"p_t4t7f4p0"},"ui":["seo"],"changed":true}
```
Ici le modèle a aussi proposé un modèle de section qui n'existe pas (`carrousel-3d`) : il est refusé, le reste de la page est créé.

**Bon à savoir** : le modèle n'invente pas les faits (horaires, adresses, prix) : il écrit des textes de départ génériques, marqués « à relire » ; complète-les. Si le menu est personnalisé, un avertissement rappelle d'y ajouter la nouvelle page.

---

## 13.3 Refus, rien à faire, IA absente

([`journaux/demander-refus-sans-ia.log`](journaux/demander-refus-sans-ia.log))
```log
14:33:04.239 +3.43s WARN  ai.plan.rejected [ai.plan#4 · 1 ms] Action refusée (delete_site) : Action inconnue : « delete_site » (hors de la liste fermée). {"action":"delete_site"}
14:33:04.240 +3.43s INFO  ai.plan.actions [ai.plan#4 · 2 ms] 0 action valide : aucune {"steps":[],"summary":"Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions."}
…
14:33:04.240 +3.43s INFO  assist.plan 0 action(s) prête(s), 1 refusée(s) {"request":"supprime tout le site maintenant","summary":"Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions.","steps":[],"rejected":1,"warnings":0}
14:33:04.240 +3.43s WARN  assist.rejected Action refusée (delete_site) : Action inconnue : « delete_site » (hors de la liste fermée). {"action":"delete_site"}
14:33:04.240 +3.43s INFO  assist.nothing Aucune action applicable pour cette demande {"summary":"Je ne peux pas supprimer tout le site : ce n’est pas dans la liste des actions."}
…
14:33:04.270 +3.46s INFO  assist.cancel Demande fermée sans appliquer {"steps":0}
…
14:33:04.504 +3.69s WARN  ai.plan.absent [ai.plan#5 · 2 ms] IA absente : IA locale indisponible : ouvrez ✨ IA locale pour l’activer (Chrome 148 ou plus récent, sur ordinateur). {"has":{"prompt":false,"multimodal":true,"summarizer":true,"translator":true},"need":"prompt"}
14:33:04.504 +3.69s INFO  ai.plan.cancel [ai.plan#5 · 2 ms] Tâche non lancée (aucun appel au modèle) {"task":"plan"}
…
14:33:04.505 +3.69s WARN  assist.plan-fail Demande non préparée (voir ai.plan) {"chars":27}
```

| Situation | Ce que tu vois | Journal | Que faire |
|---|---|---|---|
| Demande hors de la liste (« supprime tout le site ») | « Rien à faire avec les actions disponibles… », pas de bouton Appliquer | `ai.plan.rejected` / `assist.rejected` (WARN) « Action inconnue », `assist.nothing` | reformuler, ou utiliser la recherche de Ctrl+K |
| Paramètre invalide (couleur inconnue, réglage non autorisé, page introuvable, outil inconnu) | l'action est listée dans « Refusé » avec la raison | `assist.rejected` (WARN) | préciser la demande |
| Action qui demande une sélection (« remplace ce texte », « cette section ») sans sélection | « Sélectionnez d’abord… » | `assist.rejected` | sélectionner puis redemander |
| En train de modifier un composant, l'en-tête ou une carte | « Terminez d’abord l’édition… » | `assist.rejected` | « Terminer », puis redemander |
| Plus de 10 actions | les 10 premières sont gardées | `assist.warning` (WARN) | découper la demande |
| Palette au contraste insuffisant | avertissement dans l'aperçu | `assist.warning` | vérifier dans le panneau Site |
| Fenêtre fermée sans appliquer | rien ne change | `assist.cancel` (INFO) | — |
| IA locale indisponible | « Préparation impossible » + bouton IA locale (icône étincelle) | `ai.plan.absent` (WARN), `assist.plan-fail` (WARN) | chapitre 7 |
| Réponse du modèle illisible | « Réponse illisible de l’IA locale : réessayez. » | `ai.plan.unreadable`, `ai.plan.fail` (ERROR), `assist.plan-fail` | réessayer |
| Une action échoue à l'application (cas anormal) | « N actions appliquées » en erreur | `assist.apply.step-fail` (WARN) ; si aucune ne passe : `assist.apply.fail` (ERROR) | envoie le journal |
| Un outil demandé ne s'ouvre pas | — | `assist.apply.tool-fail` (WARN) | l'ouvrir à la main |

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `ai.plan.start`, `ai.plan.ok`, `ai.plan.fail` | INFO / INFO / ERROR | appel au modèle pour préparer la demande |
| `ai.plan.actions` | INFO | actions valides retenues |
| `ai.plan.rejected` | WARN | action proposée par le modèle et refusée |
| `assist.apply.start`, `assist.apply.step`, `assist.apply.ok`, `assist.apply.fail` | INFO / INFO / INFO / ERROR | application de la demande (une étape d'annulation) |
| `assist.apply.step-fail` | WARN | une action n'a pas pu s'appliquer |
| `assist.apply.tool-fail` | WARN | un outil demandé ne s'est pas ouvert |
| `assist.cancel` | INFO | fenêtre fermée sans appliquer |
| `assist.nothing` | INFO | aucune action applicable |
| `assist.open` | INFO | fenêtre « Demander à Atelier » ouverte |
| `assist.plan` | INFO | demande préparée (actions, refus, avertissements) |
| `assist.plan-fail` | WARN | demande non préparée (IA absente ou en échec) |
| `assist.rejected` | WARN | action refusée, avec la raison |
| `assist.warning` | WARN | avertissement de l'aperçu (contraste, menu, nombre d'actions) |
