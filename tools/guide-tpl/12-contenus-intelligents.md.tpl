# 12. Contenus intelligents

L'IA locale (Gemini Nano dans Chrome, voir le chapitre 7) aide à **remplir** le site : une affiche photographiée devient un événement, un e-mail collé devient des fiches de membres, un article reçoit son chapô et des idées de titres, la relecture se résume en tâches. La palette depuis le logo, elle, n'a pas besoin d'IA. Règle commune : **toujours une proposition**, jamais une modification silencieuse ; ce que l'IA écrit est créé en **brouillon** ou marqué **« à relire »**, et Ctrl+Z annule en une fois.

**Domaines du journal** : `smart.*` (les actions de ce chapitre, côté interface) et `ai.extract.*`, `ai.excerpt.*`, `ai.headlines.*`, `ai.review-summary.*` (les appels au modèle : mêmes étapes que les autres tâches d'IA du chapitre 7 — `call`, `reply`, `fallback`, `via-translation`, `cleaned`, `absent`, `refused`, `cancel`…).

---

## 12.1 Créer un événement à partir de la photo d'une affiche

**But** : ne plus recopier les affiches et les flyers à la main.

**Étapes**
1. **Contenus** → la collection (par exemple l'agenda) → **✨ Depuis une affiche**.
2. **📷 Choisir la photo** (prise bien à plat, lisible), puis **✨ Lire l'affiche**.
3. Vérifie l'aperçu : chaque champ trouvé, et en orange chaque valeur **écartée** avec sa raison.
4. **Créer 1 brouillon**.

**Ce que tu vois** : un nouvel élément en **brouillon**, ouvert dans la fenêtre de la collection ; la photo est son image ; les textes sont marqués « à relire » dans le tableau des traductions. Il n'apparaît sur le site qu'une fois publié (statut « Publié »).

**Ce que fait le code, pas le modèle** : le modèle recopie ce qu'il lit ; Atelier convertit et vérifie. Dates `14/12/2026`, `14.12.26`, `samedi 14 décembre`, `14. Dezember`, `December 14` → `2026-12-14` ; **sans année sur l'affiche**, c'est la prochaine date à venir (le modèle dit si l'année est écrite : une année qu'il aurait inventée est ignorée). Heures `14h`, `20 h 30`, `8 pm` → `14:00`, `20:30`, `20:00`. Lien `mediaslibres.be` → `https://mediaslibres.be`. Choix (« Prévu », « Annulé », « Geannuleerd »…) → la valeur de la liste. Puis les mêmes vérifications qu'à la saisie (lien `javascript:` refusé, date impossible refusée…).

**Journal attendu** ([`journaux/intelligent-affiche.log`](journaux/intelligent-affiche.log))
```log
<<intelligent-affiche|smart.poster.start,image.import.ok,smart.poster.image,smart.poster.read,ai.extract.start,ai.extract.call,ai.extract.reply,ai.extract.dropped,ai.extract.ok,smart.poster.preview,smart.poster.ok>>
```
À vérifier : `ai.extract.call` porte la liste des champs demandés (`schema`) et `images`; `ai.extract.dropped` (WARN) dit, pour chaque valeur écartée, le champ, ce qui a été lu (`raw`) et la raison ; `smart.poster.ok` donne les éléments créés et l'image importée.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Fenêtre fermée sans lire ou sans créer | rien n'est créé | `smart.poster.cancel` (INFO) « Fermé sans lecture » ou « Fermé sans créer de brouillon » |
| L'élément existe déjà (même titre) | badge « Doublon », case décochée | `ai.extract.duplicates` (INFO) |
| Pas de titre lu | badge « Sans titre », case décochée | `ai.extract.ok` avec `missingTitle` |
| Site en néerlandais | l'IA lit en français, les textes multilingues sont traduits sur l'appareil | `ai.extract.via-translation`, `ai.extract.call` du traducteur |
| Collection sans champ image | la photo sert seulement à la lecture | `smart.poster.ok` sans `image` |

**Erreurs** ([`journaux/intelligent-affiche-erreurs.log`](journaux/intelligent-affiche-erreurs.log))
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| L'IA de ce Chrome ne lit pas les images (Prompt API multimodale absente ou non téléchargée) | « L’IA locale de ce navigateur ne lit pas encore les images (Prompt API multimodale). » | `ai.extract.absent` (WARN), `ai.extract.cancel`, `smart.poster.read-fail` (WARN) | ✨ IA locale : télécharger « Prompt API – images » (chapitre 7) |
| Photo illisible ou d'un type refusé | message de l'import d'image | `smart.poster.image-fail` (WARN), `image.import.fail` | autre photo (JPG, PNG, WebP) |
| Rien de lisible sur la photo | « L’IA n’a rien su lire sur cette image : essayez une photo plus nette, prise de face. » | `ai.extract.fail` (ERROR) | photo plus nette, affiche entière dans le cadre |
| Réponse du modèle hors du format demandé | « Réponse illisible de l’IA locale : réessayez. » | `ai.extract.unreadable` (WARN), `ai.extract.fail` | réessayer ; si ça se répète, envoie le journal |
| Création impossible (cas anormal) | message d'erreur | `smart.poster.fail` (ERROR) | envoie le journal |

```log
<<intelligent-affiche-erreurs|smart.poster.cancel,smart.poster.read,ai.extract.start,ai.extract.absent,ai.extract.cancel,smart.poster.read-fail>>
```

---

## 12.2 Créer des fiches à partir d'un texte collé

**But** : transformer un e-mail (« voici nos nouveaux membres… »), un programme ou une liste en fiches, en une fois.

**Étapes**
1. Collection → **✨ Depuis un texte** ; colle le texte ; **✨ Lire le texte**.
2. Décoche ce qui ne convient pas (les doublons sont déjà décochés), puis **Créer N brouillons**.

**Journal attendu** ([`journaux/intelligent-texte.log`](journaux/intelligent-texte.log))
```log
<<intelligent-texte|smart.paste.start,smart.paste.empty,smart.paste.read,ai.extract.start,ai.extract.call,ai.extract.duplicates,ai.extract.ok,smart.paste.preview,smart.paste.ok>>
```
Ici, la première lecture a été demandée sans texte (`smart.paste.empty`, WARN), puis un texte avec trois membres dont un doublon : 2 brouillons créés, 1 écarté (`skipped`).

**Variantes et erreurs**
| Situation | Message | Journal | Que faire |
|---|---|---|---|
| Plus de 30 éléments dans le texte | « … au-delà du maximum » | `ai.extract.truncated` (WARN) | coller le reste en une deuxième fois |
| Aucun élément reconnu | « L’IA n’a trouvé aucun élément dans ce texte. » | `ai.extract.fail` (ERROR) | texte plus explicite, un élément par paragraphe |
| Texte vide | « Collez d’abord un texte. » | `smart.paste.empty` (WARN) | — |
| Fermé sans créer | — | `smart.paste.cancel` | — |
| Création impossible | message d'erreur | `smart.paste.fail` (ERROR) | envoie le journal |

---

## 12.3 Proposer un chapô et des titres

**But** : un résumé d'accroche (chapô) et des idées de titres pour un article, à partir de son texte.

**Étapes** : fenêtre de la collection (actualités) → un article → **✨ Proposer** sous « Chapô » (puis « Remplacer » ou « Annuler ») ; **✨ Titres** sous « Titre » (cliquer un titre pour le prendre). Dans la langue affichée ; le néerlandais passe par la traduction.

**Journal attendu** ([`journaux/intelligent-chapo-titres.log`](journaux/intelligent-chapo-titres.log))
```log
<<intelligent-chapo-titres|smart.excerpt.start,ai.excerpt.start,ai.excerpt.call,ai.excerpt.ok,smart.excerpt.proposal,smart.excerpt.ok,smart.headlines.start,ai.headlines.call,ai.headlines.cleaned,ai.headlines.ok,smart.headlines.proposal,smart.headlines.ok,store.undo>>
```
Le chapô vient du **Summarizer** de Chrome (type `teaser`, « pour donner envie de lire »), coupé proprement à 220 caractères. Les titres viennent de la Prompt API ; les doublons et le titre actuel sont retirés (`ai.headlines.cleaned`).

**Variantes et erreurs** ([`journaux/intelligent-chapo-variantes.log`](journaux/intelligent-chapo-variantes.log))
| Situation | Message | Journal | Que faire |
|---|---|---|---|
| Summarizer absent | même résultat, par la Prompt API | `ai.excerpt.fallback` (WARN) | — |
| Proposition écartée | — | `smart.excerpt.cancel` / `smart.headlines.cancel` « Proposition écartée » | — |
| Texte de l'article vide | « Écrivez d’abord « Texte ». » | `smart.excerpt.cancel` « … est vide : rien à résumer » | écrire le texte d'abord |
| L'IA échoue | message de l'IA | `ai.excerpt.fail` / `ai.headlines.fail` puis `smart.excerpt.fail` / `smart.headlines.fail` (ERROR) | voir chapitre 7 |

```log
<<intelligent-chapo-variantes|smart.excerpt.start,ai.excerpt.fallback,ai.excerpt.ok,smart.excerpt.proposal,smart.excerpt.cancel>>
```

---

## 12.4 Résumer la relecture

**But** : savoir où en est la relecture, et envoyer la liste des choses à faire.

**Étapes** : 💬 → **📋** (en haut du panneau) ou Ctrl+K « Résumé de la relecture ». **✨ Points clés et tâches** ajoute un résumé et une tâche par commentaire ouvert, avec « Aller à ». **📋 Copier** donne le tout en texte simple pour un e-mail.

**Ce que tu vois** : sans IA, toujours : « 2 commentaires ouverts (0 résolu) ; par page : 2 sur « Accueil » ; par auteur : Laurent : 2 ; le plus ancien en attente… ». Avec l'IA : les points clés et les tâches. Rien n'est modifié.

**Journal attendu** ([`journaux/intelligent-relecture.log`](journaux/intelligent-relecture.log))
```log
<<intelligent-relecture|smart.review.open,ai.review-summary.start,ai.review-summary.call,ai.review-summary.ok,smart.review.points,smart.review.copy-fail,smart.review.go,review.goto>>
```
Deux appels : le Summarizer (`key-points`) pour les points clés, la Prompt API pour les tâches. Une tâche que le modèle n'a pas rendue reprend le texte du commentaire (« (texte du commentaire) » à l'écran, `aiTasks` plus petit que `tasks` dans `ai.review-summary.ok`).

**Variantes et erreurs**
| Situation | Message | Journal |
|---|---|---|
| Aucun commentaire ouvert | bouton ✨ désactivé, « Aucun commentaire ouvert. » | `smart.review.open` `{"open":0}` |
| Copie acceptée / refusée par le navigateur | « Résumé copié. » / « Copie refusée par le navigateur. » | `smart.review.copy` (INFO) / `smart.review.copy-fail` (WARN) |
| Commentaire supprimé entre-temps | rien ne se passe | `review.goto-missing` (WARN) |
| IA indisponible | message de l'IA ; le résumé sans IA reste | `ai.review-summary.absent` ou `ai.review-summary.fail` |

---

## 12.5 Palette depuis le logo (sans IA)

**But** : six couleurs pour le site, tirées du logo, **toutes lisibles** (WCAG AA).

**Étapes** : panneau **Site** → Palette → **🎨 Palette depuis le logo** (le logo de l'en-tête, ou une image à choisir) → vérifier les couleurs, les corrections et les sept contrastes → **Appliquer la palette** (Ctrl+Z pour revenir à l'ancienne).

**Comment** : les pixels opaques du logo sont regroupés en couleurs dominantes ; la plus vive qui supporte un texte blanc devient la **principale**, une deuxième teinte assez différente la **secondaire** ; texte, fond, discrète en sont dérivés ; puis la clarté est corrigée jusqu'à ce que les sept paires passent 4,5:1 (texte sur le fond, liens, bouton principal, bouton secondaire, texte clair sur fond sombre…). Chaque correction est annoncée (« Principale assombrie pour le texte blanc des boutons et les liens sur le fond : #f2353f → #e00e1a »).

**Journal attendu** ([`journaux/intelligent-palette.log`](journaux/intelligent-palette.log))
```log
<<intelligent-palette|smart.palette.start,smart.palette.no-logo,smart.palette.file,smart.palette.pixels,smart.palette.colors,smart.palette.proposal,smart.palette.ok,store.undo>>
```

**Variantes et erreurs** ([`journaux/intelligent-palette-variantes.log`](journaux/intelligent-palette-variantes.log))
| Situation | Message | Journal | Que faire |
|---|---|---|---|
| Logo importé dans l'en-tête | lu directement | `smart.palette.start` `{"logo":"importé"}` puis `smart.palette.pixels` | — |
| Logo sans couleur vive (noir, gris) | « Le logo n’a pas de couleur vive : la couleur principale du site est gardée… » | `smart.palette.no-vivid` (WARN) | choisir la principale à la main si besoin |
| Fermé sans appliquer | — | `smart.palette.cancel` | — |
| Logo transparent, image illisible | « Logo illisible : … » | `smart.palette.fail` (ERROR) | autre image |
| Logo en ligne (adresse https) d'un site qui n'autorise pas sa lecture | « Ce logo en ligne ne peut pas être lu… : importez l’image dans le projet. » | `smart.palette.fail` avec `hint` CORS | importer le logo |

```log
<<intelligent-palette-variantes|smart.palette.colors,smart.palette.no-vivid,smart.palette.proposal,smart.palette.cancel,smart.palette.fail>>
```

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `ai.excerpt.start`, `ai.excerpt.ok`, `ai.excerpt.fail` | INFO / INFO / ERROR | appel au modèle pour un chapô |
| `ai.extract.start`, `ai.extract.ok`, `ai.extract.fail` | INFO / INFO / ERROR | lecture d'une affiche ou d'un texte |
| `ai.extract.dropped` | WARN | valeur lue écartée (champ, valeur, raison) |
| `ai.extract.duplicates` | INFO | doublons d'éléments existants ou proposés |
| `ai.extract.truncated` | WARN | éléments au-delà du maximum |
| `ai.headlines.start`, `ai.headlines.ok`, `ai.headlines.fail` | INFO / INFO / ERROR | propositions de titres |
| `ai.review-summary.start`, `ai.review-summary.ok`, `ai.review-summary.fail` | INFO / INFO / ERROR | points clés et tâches de la relecture |
| `review.goto-missing` | WARN | commentaire introuvable depuis le résumé |
| `smart.excerpt.start`, `smart.excerpt.proposal`, `smart.excerpt.ok`, `smart.excerpt.cancel`, `smart.excerpt.fail` | INFO… / ERROR | chapô dans le formulaire d'un élément |
| `smart.headlines.start`, `smart.headlines.proposal`, `smart.headlines.ok`, `smart.headlines.cancel`, `smart.headlines.fail` | INFO… / ERROR | titres dans le formulaire d'un élément |
| `smart.palette.start`, `smart.palette.no-logo`, `smart.palette.file`, `smart.palette.pixels`, `smart.palette.colors`, `smart.palette.no-vivid`, `smart.palette.proposal`, `smart.palette.ok`, `smart.palette.cancel`, `smart.palette.fail` | INFO, DEBUG, WARN, ERROR | palette depuis le logo |
| `smart.paste.start`, `smart.paste.empty`, `smart.paste.read`, `smart.paste.read-fail`, `smart.paste.preview`, `smart.paste.ok`, `smart.paste.cancel`, `smart.paste.fail` | INFO, WARN, ERROR | texte collé → éléments |
| `smart.poster.start`, `smart.poster.image`, `smart.poster.image-fail`, `smart.poster.read`, `smart.poster.read-fail`, `smart.poster.preview`, `smart.poster.ok`, `smart.poster.cancel`, `smart.poster.fail` | INFO, WARN, ERROR | affiche → élément |
| `smart.review.copy`, `smart.review.copy-fail` | INFO / WARN | résumé copié ou copie refusée |
| `smart.review.go` | INFO | aller au commentaire d'une tâche |
| `smart.review.open` | INFO | résumé de la relecture ouvert (comptes) |
| `smart.review.points` | INFO | points clés et tâches affichés |
