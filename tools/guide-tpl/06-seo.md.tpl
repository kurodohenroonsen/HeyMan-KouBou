# 6. Référencement (SEO)

La fenêtre « 🔎 Référencement » note chaque page sur 100 pour Google, montre l'aperçu dans les résultats de recherche et sur les réseaux sociaux, liste les points à corriger, et fait proposer titres, descriptions, mots-clés et textes alternatifs par l'IA locale (chapitre 7).

**Domaines du journal** : `seo.*` (fenêtre, notes, champs, propositions appliquées, traitements en série) ; les appels à l'IA eux-mêmes sont dans `ai.*` (chapitre 7).

---

## 6.1 Ouvrir le référencement et lire les notes

**But** : savoir où en est le site et quelle page améliorer d'abord.

**Étapes**
1. Barre du haut : « 🔎 SEO » (ou Ctrl+K « Référencement »).
2. À gauche : la note du site (moyenne des pages dans la langue choisie), les points qui concernent tout le site, la liste des pages avec leur note.
3. Clique sur une page ; change la langue analysée avec le menu à côté de la note.

**Ce que tu vois** : la note colorée (vert ≥ 85, orange ≥ 60, rouge en dessous), l'aperçu Google et l'aperçu de partage, la liste des points ✗ ⚠ • ℹ ✓.

**Journal attendu** ([`journaux/seo-ouvrir-regler.log`](journaux/seo-ouvrir-regler.log))
```log
<<seo-ouvrir-regler|seo.analysis,seo.open,seo.page>>
```
À vérifier : `seo.open` donne la note du site (`site`), celle de la page (`page`), le **nombre de points par niveau** (`pagePoints`, `sitePoints` : `bad` ✗, `warn` ⚠, `tip` •, `info` ℹ, `good` ✓), le nombre de descriptions manquantes (`missingDesc`) et si l'adresse du site est renseignée (`baseUrl`). Chaque nouvel affichage écrit `seo.analysis` (DEBUG) avec les mêmes compteurs, le nombre de mots et d'images sans texte alternatif.

**Longueurs conseillées** : elles dépendent de la langue analysée. Un caractère japonais occupe à peu près deux fois la largeur d'une lettre latine dans les résultats de Google et le japonais s'écrit sans espaces : les seuils japonais sont donc en caractères.
| Langue | Titre | Description | Texte de la page |
|---|---|---|---|
| fr, nl, de, en | 15 à 60 caractères | 70 à 160 caractères | au moins 150 mots |
| ja | 10 à 32 caractères | 80 à 120 caractères | au moins 300 caractères (sans espaces ni ponctuation) |

En japonais, le mot-clé est cherché sans tenir compte des espaces et de la pleine chasse ; un mot-clé en kana est comparé à l'adresse en rōmaji (チーム ↔ `/chiimu/`), un mot-clé en kanji n'est pas cherché dans l'adresse. Les liens vagues japonais (« こちら », « 詳しくはこちら », « もっと見る »…) sont signalés comme « cliquez ici ».

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Autre page | le détail change | `seo.page` (DEBUG) avec la note de la page |
| Autre langue analysée | notes et champs dans cette langue | `seo.lang` (DEBUG) `{"from":"fr","to":"de"}` puis `seo.analysis` avec `"lang":"de"` |

---

## 6.2 Régler titre, description, mot-clé, image de partage, noindex

**But** : écrire ce que Google affiche, et choisir les pages à ne pas montrer.

**Étapes**
1. « Titre pour Google », « Description », « Mot-clé principal » : le compteur indique la longueur (titre : 60 caractères, description : 160) ; vide = automatique.
2. « Image de partage » ; « Ne pas montrer cette page dans Google (noindex) ».

**Ce que tu vois** : l'aperçu Google se met à jour pendant la frappe ; la note est recalculée quand tu quittes le champ.

**Journal attendu** (même extrait)
```log
<<seo-ouvrir-regler|seo.field,seo.lang>>
```
À vérifier : `seo.field` (DEBUG) donne la page, le champ (`title`, `description`, `keyword`, `noindex`, `image`), la langue et la longueur ; chaque frappe écrit aussi `store.commit` (regroupées en une étape d'annulation). La note qui baisse ici (88 → 82) est normale : un titre trop court est signalé.

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Réglage refusé (page supprimée entre-temps, valeur invalide) | message d'erreur rouge | `seo.apply-fail` (WARN) avec la page, la langue et l'erreur | ferme et rouvre la fenêtre ; envoie le journal si ça se répète |

---

## 6.3 Faire proposer description, titre et mots-clés par l'IA

**But** : obtenir un premier jet, à relire.

**Étapes**
1. « ✨ Proposer » à côté de la description ou du titre ; « ✨ Idées » à côté du mot-clé.
2. Pour les mots-clés, clique sur une des idées pour la choisir.

**Ce que tu vois** : le champ se remplit ; « Description proposée (marquée « à relire ») ». Les textes proposés apparaissent dans le filtre « à relire » du tableau des traductions (chapitre 5).

**Journal attendu** ([`journaux/seo-ia-propositions.log`](journaux/seo-ia-propositions.log))
```log
<<seo-ia-propositions|seo.ai-ask,ai.description.start,ai.description.call,ai.description.reply,ai.description.ok,seo.ai-applied,ai.keywords.cleaned,ai.keywords.ok,seo.keyword-pick,ai.title.ok>>
```
À vérifier : pour chaque bouton, `seo.ai-ask` (ce qui est demandé, longueur du texte de la page `inLen`), le parcours `ai.description` / `ai.keywords` / `ai.title` (chapitre 7 : API utilisée, réponse), puis `seo.ai-applied` (INFO) avec la longueur du texte appliqué et `translated`. Un mot-clé choisi écrit `seo.keyword-pick`.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Langue néerlandaise | l'IA rédige en français puis traduit | `ai.description.via-translation`, puis `seo.ai-applied` avec `"translated":true` |
| Proposition trop longue | coupée à 160 caractères (description) ou 60 (titre) | `ai.description.clamped` (WARN) (chapitre 7) |
| Description courte (moins de 70 caractères) | le message le signale | `ai.description.warning` (WARN), `seo.ai-applied` avec `warning` |

**Erreurs** : voir chapitre 7 (IA absente, réponse illisible, exception) ; dans tous les cas rien n'est écrit dans le site et aucune ligne `seo.ai-applied` n'apparaît.

---

## 6.4 Compléter toutes les descriptions d'une langue

**But** : remplir d'un coup les descriptions manquantes (ou automatiques) de toutes les pages.

**Étapes**
1. Choisis la langue analysée (ex. NL).
2. « ✨ Compléter les 2 descriptions manquantes ».

**Ce que tu vois** : une notification par page, puis « 2 descriptions proposées en NL (à relire…) ».

**Journal attendu** ([`journaux/seo-completer-nl.log`](journaux/seo-completer-nl.log))
```log
<<seo-completer-nl|seo.complete-all.start,ai.description.start,ai.description.via-translation,ai.description.ok,seo.complete-all.page,seo.complete-all.ok>>
```
À vérifier : `seo.complete-all.start` avec le nombre de pages et leurs identifiants ; pour chacune un parcours `ai.description` puis `seo.complete-all.page` ; `seo.complete-all.ok` avec `done` / `pages` et la durée totale.

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| L'IA échoue ou est absente sur une page | le message de l'IA, puis « 0 description proposée » | `ai.description.absent` (ou `ai.description.fail`), `seo.complete-all.stopped` (WARN) avec la page et le nombre déjà fait, puis `seo.complete-all.ok` | règle l'IA (chapitre 7) et relance : seules les pages manquantes sont reprises |
| Erreur imprévue pendant la boucle | message d'erreur | `seo.complete-all.fail` (ERROR) | envoie le journal |

```log
<<seo-completer-sans-ia|seo.complete-all.start,ai.description.absent,ai.description.cancel,seo.complete-all.stopped,seo.complete-all.ok>>
```

---

## 6.5 Décrire les images sans texte alternatif

**But** : donner un texte alternatif (lu par les lecteurs d'écran et par Google) à toutes les images d'une page.

**Étapes**
1. Quand la page a des images sans texte alternatif : « ✨ Décrire les N images sans texte alternatif ».

**Ce que tu vois** : « 1 texte alternatif proposé (à relire). » ; la note monte (ici 73 → 88).

**Journal attendu** ([`journaux/seo-alts.log`](journaux/seo-alts.log))
```log
<<seo-alts|seo.alts.start,ai.alt.start,ai.alt.call,ai.alt.cleaned,ai.alt.ok,seo.alts.image,seo.alts.ok,seo.analysis>>
```
À vérifier : `seo.alts.start` avec le nombre d'images ; pour chacune `ai.alt.*` (avec `"images":1` dans `ai.alt.call` : l'image est bien donnée au modèle) et `seo.alts.image` ; `seo.alts.ok` avec `done`, `images` et `skipped` (images sans fichier).

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| Image en ligne (https://) illisible | « Image en ligne inaccessible : importez-la dans le projet… » | `ai.image-fail` (WARN), `seo.alts.stopped` (WARN) | importe l'image dans le projet (chapitre 4) |
| IA sans lecture d'images | « L'IA locale de ce navigateur ne lit pas encore les images » | `ai.alt.absent`, `seo.alts.stopped` | voir chapitre 7 (Prompt API multimodale) |
| Erreur imprévue | message d'erreur | `seo.alts.fail` (ERROR) | envoie le journal |

---

## 6.6 Aller à un point signalé

**But** : corriger directement l'élément concerné (image sans texte alternatif, titre manquant…).

**Étapes** : clique « Aller à » à côté du point.

**Ce que tu vois** : la fenêtre se ferme, la page s'ouvre et l'élément est sélectionné.

**Journal attendu** ([`journaux/seo-aller-a.log`](journaux/seo-aller-a.log))
```log
<<seo-aller-a|seo.goto,store.select>>
```

---

## Codes de ce chapitre

| Code | Niveau | Sens |
|---|---|---|
| `seo.ai-applied` | INFO | proposition de l'IA appliquée (description, titre) ou idées de mots-clés affichées |
| `seo.ai-ask` | DEBUG | proposition demandée à l'IA (quoi, page, langue, longueur du texte) |
| `seo.alts.start`, `seo.alts.ok`, `seo.alts.fail` | INFO / INFO / ERROR | « Décrire les images » : début (nombre d'images), fin (`done`, `skipped`), échec |
| `seo.alts.image` | DEBUG | texte alternatif appliqué à une image |
| `seo.alts.stopped` | WARN | arrêt après un échec de l'IA |
| `seo.analysis` | DEBUG | analyse affichée : notes, points par niveau, mots, images sans texte alternatif |
| `seo.apply-fail` | WARN | réglage de référencement refusé |
| `seo.complete-all.start`, `seo.complete-all.ok`, `seo.complete-all.fail` | INFO / INFO / ERROR | « Compléter les descriptions » d'une langue |
| `seo.complete-all.page` | DEBUG | description appliquée à une page |
| `seo.complete-all.stopped` | WARN | arrêt après un échec de l'IA |
| `seo.field` | DEBUG | champ modifié (titre, description, mot-clé, noindex, image) |
| `seo.goto` | DEBUG | « Aller à » un point signalé |
| `seo.keyword-pick` | DEBUG | mot-clé choisi parmi les idées |
| `seo.lang` | DEBUG | langue analysée changée |
| `seo.open` | INFO | fenêtre ouverte : note du site, de la page, points par niveau |
| `seo.page` | DEBUG | page choisie |
