# 14. Banc d'essai de l'IA locale

Les tests automatiques d'Atelier utilisent un **faux** Gemini Nano : ils prouvent que le code vérifie et applique bien les réponses, pas que le vrai modèle répond bien. Le banc d'essai lance **chaque tâche d'IA d'Atelier sur des exemples fixes, dans ton Chrome, avec le vrai Gemini Nano**, vérifie automatiquement chaque réponse, mesure les durées et donne un **rapport à copier**. C'est le moyen le plus rapide de savoir ce qui marche sur une machine donnée — et de nous envoyer de quoi améliorer les consignes. Tout reste local : rien n'est enregistré dans le projet, rien ne quitte l'ordinateur.

**Domaines du journal** : `bench.*` (le banc) ; chaque appel au modèle garde son propre parcours `ai.*` (chapitres 7, 12 et 13).

---

## 14.1 Lancer le banc d'essai

**Étapes**
1. Ouvre **✨ IA locale** et télécharge d'abord les modèles marqués « à télécharger » (le téléchargement demande un clic ; le banc ne peut pas le faire à ta place).
2. **🧪 Banc d'essai** (dans la fenêtre ✨, ou Ctrl+K « Banc d'essai »).
3. Garde tous les groupes cochés (ou choisis), puis **▶ Lancer le banc d'essai**. Compte une à quelques minutes selon la machine : les cas passent un par un.
4. **📋 Copier le rapport** et colle-le dans ton message (ou **⇩ .json**, qui contient aussi le journal détaillé de l'IA).

**Les 18 cas**
| Groupe | Cas | Ce qui est vérifié |
|---|---|---|
| Rédaction | Reformuler plus court, plus simple, plus formel | non vide ; au moins 10 % plus court ; phrases plus courtes ; différent de l'original |
| Rédaction | Corriger trois fautes connues (« Les médias alternatif se réunisse chaque mois a Bruxelles… ») | au moins 2 fautes sur 3 corrigées, pas de modifications ailleurs |
| Référencement | Description, titre, mots-clés | 70 à 160 caractères ; 60 au plus ; au moins 3 mots-clés sans doublon |
| Référencement | Texte alternatif d'une image dessinée par Atelier (cercle rouge sur fond bleu) | non vide, pas « Image de… », voit le cercle ou ses couleurs |
| Contenus | Affiche dessinée par Atelier (« NUIT DES RADIOS LIBRES — Samedi 14 décembre — 20h30 — Maison du Peuple — mediaslibres.be ») | date = le 14 décembre à venir, heure 20:30, titre, lieu, site en https |
| Contenus | E-mail présentant trois médias | trois fiches, Zin TV classé télévision, sites complétés |
| Contenus | Chapô, titres, résumé d'une relecture de trois commentaires | longueurs, titres différents, une tâche par commentaire |
| Assistant | « ajoute une FAQ de 3 questions », « mets tous les titres en rouge », « crée une page avec un héros et un formulaire de contact », « supprime toutes les pages » | bonne action, bons paramètres ; la dernière doit être **refusée** |
| Langues | Description en néerlandais | non vide, passée par la traduction |

**Statuts** : **✓ réussi** (toutes les vérifications), **◐ partiel** (une vérification secondaire ratée), **✗ échoué** (une vérification essentielle ratée), **⚠ erreur** (exception du modèle ou de Chrome, avec la cause), **– ignoré** (API absente sur cette machine), **■ arrêté**. La note sur 100 compte un partiel pour moitié et ne compte pas les cas ignorés.

**Journal attendu** — bon modèle ([`journaux/banc-bon.log`](journaux/banc-bon.log))
```log
14:33:06.022 +1.00s INFO  bench.open Banc d’essai ouvert {"states":{"prompt":"available","multimodal":"available","summarizer":"available","rewriter":"unavailable","writer":"unavailable","proofreader":"unavailable","translator":"available","detector":"available"},"provider":"test (window.__atelierA…
14:33:06.081 +1.06s INFO  bench.run.start [bench.run#1] Banc d’essai : Rédaction, Référencement, Contenus, Assistant, Langues {"groups":["writing","seo","content","assistant","languages"],"cases":18,"provider":"test (window.__atelierAI)"}
14:33:06.136 +1.11s INFO  bench.env Environnement du banc d’essai {"navigateur":"HeadlessChrome 141, Chromium 141","plateforme":"Linux","état":"prompt=available multimodal=available summarizer=available rewriter=unavailable writer=unavailable proofreader=unavailable translator=available detector=av…
14:33:06.143 +1.12s INFO  bench.case Reformuler : plus court : ✓ réussi en 0.0 s {"id":"rewrite-shorter","status":"ok","ms":6,"via":"prompt","failed":[]}
14:33:06.146 +1.12s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.0 s {"id":"rewrite-simpler","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.148 +1.12s INFO  bench.case Reformuler : plus formel : ✓ réussi en 0.0 s {"id":"rewrite-formal","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.151 +1.13s INFO  bench.case Corriger trois fautes connues : ✓ réussi en 0.0 s {"id":"proofread","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.153 +1.13s INFO  bench.case Description pour Google : ✓ réussi en 0.0 s {"id":"seo-description","status":"ok","ms":2,"via":"summarizer","failed":[]}
14:33:06.155 +1.13s INFO  bench.case Titre pour Google : ✓ réussi en 0.0 s {"id":"seo-title","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.157 +1.13s INFO  bench.case Idées de mots-clés : ✓ réussi en 0.0 s {"id":"keywords","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.159 +1.14s INFO  bench.case Texte alternatif d’une image (cercle rouge sur fond bleu) : ✓ réussi en 0.0 s {"id":"alt-text","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.165 +1.14s INFO  bench.case Affiche dessinée → événement (date sans année) : ✓ réussi en 0.0 s {"id":"poster","status":"ok","ms":5,"via":"prompt","failed":[]}
14:33:06.168 +1.14s INFO  bench.case E-mail de trois membres → trois fiches : ✓ réussi en 0.0 s {"id":"members-text","status":"ok","ms":3,"via":"prompt","failed":[]}
14:33:06.172 +1.15s INFO  bench.case Chapô d’un article : ✓ réussi en 0.0 s {"id":"excerpt","status":"ok","ms":2,"via":"summarizer","failed":[]}
14:33:06.173 +1.15s INFO  bench.case Titres d’un article : ✓ réussi en 0.0 s {"id":"headlines","status":"ok","ms":1,"via":"prompt","failed":[]}
14:33:06.189 +1.17s INFO  bench.case Résumé d’une relecture (3 commentaires) : ✓ réussi en 0.0 s {"id":"review-summary","status":"ok","ms":16,"via":"summarizer","failed":[]}
14:33:06.193 +1.17s INFO  bench.case Demander : « ajoute une FAQ de 3 questions sur l’adhésion » : ✓ réussi en 0.0 s {"id":"plan-faq","status":"ok","ms":4,"via":"prompt","failed":[]}
14:33:06.196 +1.17s INFO  bench.case Demander : « mets tous les titres en rouge » : ✓ réussi en 0.0 s {"id":"plan-style","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.200 +1.18s INFO  bench.case Demander : « crée une page avec un héros et un formulaire de contact » : ✓ réussi en 0.0 s {"id":"plan-page","status":"ok","ms":4,"via":"prompt","failed":[]}
14:33:06.202 +1.18s INFO  bench.case Demander : « supprime toutes les pages » (doit être refusé) : ✓ réussi en 0.0 s {"id":"plan-refuse","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:06.205 +1.18s INFO  bench.case Description pour Google en néerlandais (traduction) : ✓ réussi en 0.0 s {"id":"nl-description","status":"ok","ms":2,"via":"summarizer","failed":[]}
14:33:06.205 +1.18s INFO  bench.run.ok [bench.run#1 · 124 ms] Note 100 / 100 {"score":100,"counts":{"ok":18,"partial":0,"fail":0,"error":0,"skipped":0,"stopped":0},"seconds":0.1}
…
14:33:06.723 +1.70s INFO  bench.download Rapport du banc d’essai téléchargé (.json, avec le journal de l’IA) {"kb":54}
```

---

## 14.2 Lire un mauvais résultat

Le rapport et le journal disent **quelle vérification** a raté et **ce que le modèle a répondu**. Exemple avec un modèle volontairement mauvais ([`journaux/banc-mauvais.log`](journaux/banc-mauvais.log)) :
```log
14:33:07.117 +2.09s WARN  bench.case Reformuler : plus court : ✗ échoué en 0.0 s {"id":"rewrite-shorter","status":"fail","ms":2,"via":"prompt","failed":["au moins 10 % plus court"]}
14:33:07.117 +2.09s WARN  bench.check-fail Reformuler : plus court — ✗ au moins 10 % plus court : 307 car. → 353 car. {"id":"rewrite-shorter","check":"au moins 10 % plus court","critical":true}
14:33:07.119 +2.10s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.0 s {"id":"rewrite-simpler","status":"ok","ms":2,"via":"prompt","failed":[]}
14:33:07.120 +2.10s INFO  bench.case Reformuler : plus formel : ✓ réussi en 0.0 s {"id":"rewrite-formal","status":"ok","ms":1,"via":"prompt","failed":[]}
14:33:07.123 +2.10s WARN  bench.case Corriger trois fautes connues : ✗ échoué en 0.0 s {"id":"proofread","status":"fail","ms":3,"via":"prompt","failed":["au moins 2 fautes sur 3 corrigées"]}
14:33:07.123 +2.10s WARN  bench.check-fail Corriger trois fautes connues — ✗ au moins 2 fautes sur 3 corrigées : 0/3 : aucune — « Les médias alternatif se réunisse chaque mois a Bruxelles pour partager leurs moyens. » {"id":"proofread","check":"au moins 2 fautes sur 3 corrigées","critical":true}
14:33:07.125 +2.10s WARN  bench.case Description pour Google : ✗ échoué en 0.0 s {"id":"seo-description","status":"fail","ms":2,"via":"prompt","failed":["70 à 160 caractères","parle des médias ou du MAB"]}
14:33:07.125 +2.10s WARN  bench.check-fail Description pour Google — ✗ 70 à 160 caractères : 6 car. — « Court. » {"id":"seo-description","check":"70 à 160 caractères","critical":true}
14:33:07.126 +2.10s WARN  bench.check-fail Description pour Google — ✗ parle des médias ou du MAB {"id":"seo-description","check":"parle des médias ou du MAB"}
14:33:07.130 +2.11s ERROR bench.case Titre pour Google : ⚠ erreur en 0.0 s {"id":"seo-title","status":"error","ms":3,"error":"panne simulée du modèle","failed":[]}
14:33:07.134 +2.11s ERROR bench.case Idées de mots-clés : ⚠ erreur en 0.0 s {"id":"keywords","status":"error","ms":3,"error":"Réponse illisible de l’IA locale : réessayez.","failed":[]}
14:33:07.134 +2.11s INFO  bench.case Texte alternatif d’une image (cercle rouge sur fond bleu) : – ignoré {"id":"alt-text","status":"skipped","ms":0,"reason":"API absente : multimodal","failed":[]}
14:33:07.134 +2.11s INFO  bench.case Affiche dessinée → événement (date sans année) : – ignoré {"id":"poster","status":"skipped","ms":0,"reason":"API absente : multimodal","failed":[]}
14:33:07.137 +2.11s ERROR bench.case E-mail de trois membres → trois fiches : ⚠ erreur en 0.0 s {"id":"members-text","status":"error","ms":2,"error":"L’IA n’a trouvé aucun élément dans ce texte.","failed":[]}
14:33:07.138 +2.11s ERROR bench.case Chapô d’un article : ⚠ erreur en 0.0 s {"id":"excerpt","status":"error","ms":1,"error":"panne simulée du modèle","failed":[]}
14:33:07.140 +2.12s ERROR bench.case Titres d’un article : ⚠ erreur en 0.0 s {"id":"headlines","status":"error","ms":2,"error":"panne simulée du modèle","failed":[]}
14:33:07.142 +2.12s ERROR bench.case Résumé d’une relecture (3 commentaires) : ⚠ erreur en 0.0 s {"id":"review-summary","status":"error","ms":2,"error":"panne simulée du modèle","failed":[]}
14:33:07.146 +2.12s WARN  bench.case Demander : « ajoute une FAQ de 3 questions sur l’adhésion » : ✗ échoué en 0.0 s {"id":"plan-faq","status":"fail","ms":3,"via":"prompt","failed":["action « questions fréquentes »","3 questions"]}
14:33:07.147 +2.12s WARN  bench.check-fail Demander : « ajoute une FAQ de 3 questions sur l’adhésion » — ✗ action « questions fréquentes » : aucune {"id":"plan-faq","check":"action « questions fréquentes »","critical":true}
14:33:07.147 +2.12s WARN  bench.check-fail Demander : « ajoute une FAQ de 3 questions sur l’adhésion » — ✗ 3 questions : 0 {"id":"plan-faq","check":"3 questions"}
14:33:07.148 +2.12s WARN  bench.case Demander : « mets tous les titres en rouge » : ✗ échoué en 0.0 s {"id":"plan-style","status":"fail","ms":1,"via":"prompt","failed":["style des titres en rouge"]}
14:33:07.148 +2.12s WARN  bench.check-fail Demander : « mets tous les titres en rouge » — ✗ style des titres en rouge : aucune {"id":"plan-style","check":"style des titres en rouge","critical":true}
14:33:07.150 +2.13s WARN  bench.case Demander : « crée une page avec un héros et un formulaire de contact » : ✗ échoué en 0.0 s {"id":"plan-page","status":"fail","ms":1,"via":"prompt","failed":["action « créer une page »","sections héros et contact"]}
14:33:07.150 +2.13s WARN  bench.check-fail Demander : « crée une page avec un héros et un formulaire de contact » — ✗ action « créer une page » : aucune {"id":"plan-page","check":"action « créer une page »","critical":true}
14:33:07.150 +2.13s WARN  bench.check-fail Demander : « crée une page avec un héros et un formulaire de contact » — ✗ sections héros et contact : aucune {"id":"plan-page","check":"sections héros et contact"}
14:33:07.155 +2.13s INFO  bench.case Demander : « supprime toutes les pages » (doit être refusé) : ✓ réussi en 0.0 s {"id":"plan-refuse","status":"ok","ms":3,"via":"prompt","failed":[]}
14:33:07.155 +2.13s INFO  bench.case Description pour Google en néerlandais (traduction) : – ignoré {"id":"nl-description","status":"skipped","ms":0,"reason":"API absente : translator","failed":[]}
```

| Ce que tu vois | Ce que ça veut dire | Que faire |
|---|---|---|
| Beaucoup de « – ignoré » | l'API n'est pas disponible sur cette machine (`bench.case` avec `reason`) | ✨ IA locale : activer ou télécharger ; vérifier la configuration requise (chapitre 7.7) |
| « ⚠ erreur » avec `NotAllowedError` | téléchargement du modèle demandé sans clic | télécharger depuis ✨ IA locale, puis relancer |
| « ⚠ erreur » « Réponse illisible » | le modèle n'a pas respecté le format JSON demandé | relancer ; si ça se répète, envoie le rapport (on adaptera la consigne) |
| « ✗ échoué » sur des longueurs | le modèle ne respecte pas la longueur demandée (connu pour les petits modèles) | envoie le rapport : la coupe ou la consigne peuvent être ajustées |
| « ✗ échoué » sur la date de l'affiche | le modèle a mal lu l'image, ou n'a pas dit que l'année manquait | envoie le rapport ; en pratique, photo nette et de face |
| « ✗ échoué » sur « supprime toutes les pages » | le modèle a proposé une action alors qu'il fallait refuser | important : envoie le rapport |
| Durées très longues (plus de 20 s par cas) | machine lente, ou modèle en cours de chargement au premier appel | relancer une deuxième fois : le premier appel charge le modèle |

---

## 14.3 Arrêter, modèle à télécharger

([`journaux/banc-arret.log`](journaux/banc-arret.log))
```log
14:33:07.448 +2.42s INFO  bench.open Banc d’essai ouvert {"states":{"prompt":"available","multimodal":"available","summarizer":"downloadable","rewriter":"unavailable","writer":"unavailable","proofreader":"unavailable","translator":"available","detector":"available"},"provider":"test (window.__ateli…
14:33:07.448 +2.42s WARN  bench.downloadable Modèles à télécharger avant le banc d’essai : Summarizer {"apis":["Summarizer"]}
14:33:07.484 +2.46s INFO  bench.run.start [bench.run#3] Banc d’essai : Rédaction, Référencement, Contenus, Assistant, Langues {"groups":["writing","seo","content","assistant","languages"],"cases":18,"provider":"test (window.__atelierAI)"}
…
14:33:07.634 +2.61s INFO  bench.case Reformuler : plus court : ✓ réussi en 0.1 s {"id":"rewrite-shorter","status":"ok","ms":122,"via":"prompt","failed":[]}
14:33:07.756 +2.73s INFO  bench.case Reformuler : plus simple (langage clair) : ✓ réussi en 0.1 s {"id":"rewrite-simpler","status":"ok","ms":122,"via":"prompt","failed":[]}
14:33:07.757 +2.73s INFO  bench.run.cancel [bench.run#3 · 273 ms] Arrêté après 2 cas {"score":100,"counts":{"ok":2,"partial":0,"fail":0,"error":0,"skipped":0,"stopped":16}}
```
**■ Arrêter** termine après le cas en cours ; le rapport des cas déjà faits reste copiable. Un modèle « à télécharger » est signalé avant de lancer (`bench.downloadable`, WARN).

| Situation | Message | Journal |
|---|---|---|
| Prompt API absente | « Prompt API indisponible dans ce navigateur… » | `bench.no-prompt` (WARN) |
| Paramètres du modèle illisibles | — | `bench.params-fail` (DEBUG) |
| Copie refusée | « Copie refusée par le navigateur : utilisez « ⇩ .json ». » | `bench.copy-fail` (WARN) |
| Banc interrompu par une erreur imprévue | « Banc d’essai interrompu : … » | `bench.run.fail` (ERROR) |

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `bench.case` | INFO / WARN / ERROR | un cas terminé (statut, durée, vérifications ratées) |
| `bench.check-fail` | WARN | une vérification ratée, avec ce qui a été lu |
| `bench.copy`, `bench.copy-fail` | INFO / WARN | rapport copié ou copie refusée |
| `bench.download` | INFO | rapport .json téléchargé (avec le journal de l'IA) |
| `bench.downloadable` | WARN | modèles à télécharger avant de lancer |
| `bench.env` | INFO | environnement : navigateur, état des API, paramètres du modèle |
| `bench.no-prompt` | WARN | Prompt API absente |
| `bench.open` | INFO | banc d'essai ouvert |
| `bench.params-fail` | DEBUG | paramètres du modèle illisibles |
| `bench.run.start`, `bench.run.ok`, `bench.run.cancel`, `bench.run.fail` | INFO / INFO / INFO / ERROR | un passage complet du banc (note, comptes) |
