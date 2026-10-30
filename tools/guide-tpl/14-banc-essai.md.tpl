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
<<banc-bon|bench.open,bench.run.start,bench.env,bench.case,bench.download,bench.run.ok>>
```

---

## 14.2 Lire un mauvais résultat

Le rapport et le journal disent **quelle vérification** a raté et **ce que le modèle a répondu**. Exemple avec un modèle volontairement mauvais ([`journaux/banc-mauvais.log`](journaux/banc-mauvais.log)) :
```log
<<banc-mauvais|bench.case,bench.check-fail>>
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
<<banc-arret|bench.open,bench.downloadable,bench.run.start,bench.case,bench.run.cancel>>
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
