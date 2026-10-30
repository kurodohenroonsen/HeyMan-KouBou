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
14:32:53.000 +4.22s INFO  smart.poster.start [smart.poster#1] Affiche → élément de « Agenda » {"collection":"col_jss2i0qv","kind":"events","imageField":"image"}
…
14:32:53.115 +4.34s INFO  image.import.ok [image.import#1 · 20 ms] Image prête : 240×320 px, 1 Ko (−25 %), 0 variante {"name":"affiche-festival.webp","mime":"image/webp","width":240,"height":320,"kbIn":1,"kbOut":1,"gain":25,"variants":[]}
14:32:53.120 +4.34s INFO  smart.poster.image [smart.poster#1 · 120 ms] Photo prête : 240×320 px, 1 Ko {"name":"affiche-festival.png","width":240,"height":320,"kb":1,"mime":"image/webp"}
14:32:53.169 +4.39s INFO  smart.poster.read [smart.poster#1 · 169 ms] Lecture de l’affiche par l’IA locale
…
14:32:53.171 +4.39s INFO  ai.extract.start [ai.extract#1] IA locale : lecture d’une affiche {"task":"extractItems","collection":"col_jss2i0qv","kind":"events","fields":11,"image":"image/webp (1 Ko)","today":"2026-10-29","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:32:53.173 +4.39s DEBUG ai.extract.call [ai.extract#1 · 2 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"title,date,date_year_shown,time,endDate,endDate_year_shown,endTime,place,address,description,status,link","images":1,"system":"864 car.","inLen":38}
14:32:53.173 +4.39s DEBUG ai.extract.reply [ai.extract#1 · 2 ms] Réponse Prompt API (Gemini Nano) : 353 car. en 1 ms {"api":"prompt","ms":1,"outLen":353,"excerpt":"{\"title\":\"Nuit des radios libres\",\"date\":\"samedi 14 décembr…"}
14:32:53.176 +4.40s WARN  ai.extract.dropped [ai.extract#1 · 5 ms] Élément 1 : « Date de fin (plusieurs jours) » écarté — Date impossible (jour et mois). {"item":1,"field":"endDate","raw":"31 février","reason":"Date impossible (jour et mois)."}
14:32:53.176 +4.40s INFO  ai.extract.ok [ai.extract#1 · 5 ms] Lecture d’une affiche ou d’un texte : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"items":1,"found":[9],"dropped":1,"duplicates":0}
14:32:53.177 +4.40s INFO  smart.poster.preview [smart.poster#1 · 177 ms] Aperçu : 1 élément, 1 coché(s) {"items":1,"checked":1,"duplicates":0,"dropped":1}
…
14:32:53.268 +4.49s INFO  smart.poster.ok [smart.poster#1 · 268 ms] 1 brouillon créé dans « Agenda » {"items":["it_voqbcp56"],"image":"img_bvn55mbt","skipped":0}
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
14:32:53.627 +4.85s INFO  smart.poster.cancel [smart.poster#2 · 39 ms] Fermé sans lecture {"read":false}
…
14:32:53.758 +4.98s INFO  smart.poster.read [smart.poster#3 · 90 ms] Lecture de l’affiche par l’IA locale
…
14:32:53.759 +4.98s INFO  ai.extract.start [ai.extract#2] IA locale : lecture d’une affiche {"task":"extractItems","collection":"col_jss2i0qv","kind":"events","fields":11,"image":"image/webp (1 Ko)","today":"2026-10-29","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:32:53.759 +4.98s WARN  ai.extract.absent [ai.extract#2 · 0 ms] IA absente : L’IA locale de ce navigateur ne lit pas encore les images (Prompt API multimodale). {"has":{"prompt":true,"multimodal":false,"summarizer":true,"translator":true},"need":"multimodal"}
14:32:53.760 +4.98s INFO  ai.extract.cancel [ai.extract#2 · 1 ms] Tâche non lancée (aucun appel au modèle) {"task":"extractItems"}
…
14:32:53.760 +4.98s WARN  smart.poster.read-fail [smart.poster#3 · 92 ms] Lecture impossible : voir ai.extract
```

---

## 12.2 Créer des fiches à partir d'un texte collé

**But** : transformer un e-mail (« voici nos nouveaux membres… »), un programme ou une liste en fiches, en une fois.

**Étapes**
1. Collection → **✨ Depuis un texte** ; colle le texte ; **✨ Lire le texte**.
2. Décoche ce qui ne convient pas (les doublons sont déjà décochés), puis **Créer N brouillons**.

**Journal attendu** ([`journaux/intelligent-texte.log`](journaux/intelligent-texte.log))
```log
14:32:54.420 +5.64s INFO  smart.paste.start [smart.paste#1] Texte collé → éléments de « Médias membres » {"collection":"col_64zx0e3a","kind":"members"}
…
14:32:54.471 +5.69s WARN  smart.paste.empty [smart.paste#1 · 51 ms] Lecture demandée sans texte
14:32:54.519 +5.74s INFO  smart.paste.read [smart.paste#1 · 99 ms] Lecture du texte par l’IA locale (145 car.) {"chars":145}
…
14:32:54.519 +5.74s INFO  ai.extract.start [ai.extract#3] IA locale : lecture d’un texte collé {"task":"extractItems","collection":"col_64zx0e3a","kind":"members","fields":6,"inLen":145,"today":"2026-10-29","lang":"fr","sourceLang":"fr","gen":"fr","api":"prompt","source":"test"}
14:32:54.520 +5.74s DEBUG ai.extract.call [ai.extract#3 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"items","system":"644 car.","inLen":153}
…
14:32:54.520 +5.74s INFO  ai.extract.duplicates [ai.extract#3 · 1 ms] 1 doublon d’un élément existant ou d’une autre proposition {"items":[3]}
14:32:54.521 +5.74s INFO  ai.extract.ok [ai.extract#3 · 2 ms] Lecture d’une affiche ou d’un texte : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"items":3,"found":[5,5,4],"dropped":0,"duplicates":1}
14:32:54.521 +5.74s INFO  smart.paste.preview [smart.paste#1 · 101 ms] Aperçu : 3 éléments, 2 coché(s) {"items":3,"checked":2,"duplicates":1,"dropped":0}
…
14:32:54.579 +5.80s INFO  smart.paste.ok [smart.paste#1 · 159 ms] 2 brouillons créés dans « Médias membres » {"items":["it_m9ayiu82","it_m606udz7"],"skipped":1}
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
14:32:55.269 +6.49s INFO  smart.excerpt.start [smart.excerpt#1] Chapô proposé pour « Le MAB ouvre son site » {"collection":"col_u8bu8jxp","item":"it_uy9as72a","field":"excerpt","from":"body","lang":"fr","chars":19}
…
14:32:55.270 +6.49s INFO  ai.excerpt.start [ai.excerpt#1] IA locale : chapô {"task":"excerpt","title":"Le MAB ouvre son site","inLen":19,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:32:55.270 +6.49s DEBUG ai.excerpt.call [ai.excerpt#1 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"teaser","length":"short","context":"113 car.","inLen":19}
…
14:32:55.271 +6.49s INFO  ai.excerpt.ok [ai.excerpt#1 · 1 ms] Chapô : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":1,"outLen":97,"excerpt":"Le MAB sillonne les maisons de quartier pour faire découvri…"}
14:32:55.271 +6.49s INFO  smart.excerpt.proposal [smart.excerpt#1 · 2 ms] Proposition : 97 car. {"chars":97,"via":"summarizer"}
…
14:32:55.327 +6.55s INFO  smart.excerpt.ok [smart.excerpt#1 · 58 ms] Chapô (résumé) remplacé (marqué « à relire », Ctrl+Z pour annuler) {"field":"excerpt","chars":97,"lang":"fr"}
14:32:55.453 +6.67s INFO  smart.headlines.start [smart.headlines#1] Titres proposés pour « Le MAB ouvre son site » {"collection":"col_u8bu8jxp","item":"it_uy9as72a","field":"title","lang":"fr","chars":19}
…
14:32:55.455 +6.68s DEBUG ai.headlines.call [ai.headlines#1 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"titles","system":"127 car.","inLen":66}
…
14:32:55.455 +6.68s DEBUG ai.headlines.cleaned [ai.headlines#1 · 1 ms] Titres : 3 proposés, 2 gardés (doublons, titre actuel, 3 au plus) {"got":3,"kept":2}
14:32:55.455 +6.68s INFO  ai.headlines.ok [ai.headlines#1 · 1 ms] Titres : proposition prête (Prompt API) {"via":"prompt","fallback":false,"translated":false,"calls":1,"titles":2,"sample":["Le MAB part en tournée dans les quartiers","Tournée des médias libres"]}
14:32:55.455 +6.68s INFO  smart.headlines.proposal [smart.headlines#1 · 2 ms] 2 titre(s) proposé(s) {"titles":["Le MAB part en tournée dans les quartiers","Tournée des médias libres"]}
…
14:32:55.506 +6.73s INFO  smart.headlines.ok [smart.headlines#1 · 53 ms] Titre remplacé (marqué « à relire », Ctrl+Z pour annuler) {"field":"title","chars":25,"lang":"fr"}
14:32:55.606 +6.83s INFO  store.undo Annuler {"left":6,"redo":1}
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
14:32:55.938 +7.16s INFO  smart.excerpt.start [smart.excerpt#2] Chapô proposé pour « Le MAB ouvre son site » {"collection":"col_u8bu8jxp","item":"it_uy9as72a","field":"excerpt","from":"body","lang":"fr","chars":19}
…
14:32:55.939 +7.16s WARN  ai.excerpt.fallback [ai.excerpt#2 · 0 ms] Summarizer non disponible : repli sur la Prompt API (schéma JSON) {"wanted":"summarizer","has":false}
…
14:32:55.940 +7.16s INFO  ai.excerpt.ok [ai.excerpt#2 · 1 ms] Chapô : proposition prête (Prompt API) {"via":"prompt","fallback":true,"translated":false,"calls":1,"outLen":42,"excerpt":"Une tournée pour rencontrer les habitants."}
14:32:55.940 +7.16s INFO  smart.excerpt.proposal [smart.excerpt#2 · 2 ms] Proposition : 42 car. {"chars":42,"via":"prompt"}
14:32:56.004 +7.22s INFO  smart.excerpt.cancel [smart.excerpt#2 · 66 ms] Proposition écartée
…
14:32:56.401 +7.62s INFO  smart.excerpt.start [smart.excerpt#3] Chapô proposé pour « Nouvel élément » {"collection":"col_u8bu8jxp","item":"it_8iuzzwbz","field":"excerpt","from":"body","lang":"fr","chars":0}
14:32:56.401 +7.62s INFO  smart.excerpt.cancel [smart.excerpt#3 · 0 ms] « Texte » est vide : rien à résumer
```

---

## 12.4 Résumer la relecture

**But** : savoir où en est la relecture, et envoyer la liste des choses à faire.

**Étapes** : 💬 → **📋** (en haut du panneau) ou Ctrl+K « Résumé de la relecture ». **✨ Points clés et tâches** ajoute un résumé et une tâche par commentaire ouvert, avec « Aller à ». **📋 Copier** donne le tout en texte simple pour un e-mail.

**Ce que tu vois** : sans IA, toujours : « 2 commentaires ouverts (0 résolu) ; par page : 2 sur « Accueil » ; par auteur : Laurent : 2 ; le plus ancien en attente… ». Avec l'IA : les points clés et les tâches. Rien n'est modifié.

**Journal attendu** ([`journaux/intelligent-relecture.log`](journaux/intelligent-relecture.log))
```log
14:32:58.219 +9.44s INFO  smart.review.open Résumé de la relecture : 2 commentaires ouverts (0 résolu) ; par page : 2 sur « Accueil » ; par auteur : Laurent : 2 ; le plus ancien en attente : Laurent, 2026-10-29, « Le titre est trop long. ». {"total":2,"open":2,"resolved":0,"pages":1,"authors":1}
…
14:32:58.274 +9.49s INFO  ai.review-summary.start [ai.review-summary#1] IA locale : résumé de la relecture {"task":"reviewSummary","comments":2,"open":2,"lang":"fr","sourceLang":"fr","gen":"fr","api":"summarizer","source":"test"}
14:32:58.274 +9.49s DEBUG ai.review-summary.call [ai.review-summary#1 · 0 ms] Appel Summarizer (fr) {"api":"summarizer","lang":"fr","type":"key-points","length":"short","context":"68 car.","inLen":187}
…
14:32:58.275 +9.50s DEBUG ai.review-summary.call [ai.review-summary#1 · 1 ms] Appel Prompt API (Gemini Nano) (fr) {"api":"prompt","lang":"fr","schema":"tasks","system":"130 car.","inLen":90}
…
14:32:58.276 +9.50s INFO  ai.review-summary.ok [ai.review-summary#1 · 2 ms] Résumé de la relecture : proposition prête (Summarizer) {"via":"summarizer","fallback":false,"translated":false,"calls":2,"points":2,"tasks":2,"aiTasks":1,"open":2}
14:32:58.276 +9.50s INFO  smart.review.points 2 points clés, 2 tâches {"points":2,"tasks":2,"via":"summarizer"}
14:32:58.362 +9.58s WARN  smart.review.copy-fail Copie refusée par le navigateur {"error":{"name":"NotAllowedError","message":"Failed to execute 'writeText' on 'Clipboard': Write permission denied.","code":0,"stack":"NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Write permission de…
…
14:32:58.387 +9.61s INFO  smart.review.go Aller au commentaire {"id":"cm_7le1FtDy_b3Q","page":"p_6j1yly5n"}
14:32:58.391 +9.61s DEBUG review.goto Aller à l’élément commenté {"id":"cm_7le1FtDy_b3Q","page":"p_6j1yly5n","node":"n_2c1x2c4012","found":true}
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
14:32:59.303 +10.52s INFO  smart.palette.start [smart.palette#1] Palette depuis le logo {"logo":"aucun"}
…
14:32:59.314 +10.54s INFO  smart.palette.no-logo [smart.palette#1 · 11 ms] Pas de logo importé : choisir une image
14:32:59.372 +10.59s DEBUG smart.palette.file [smart.palette#1 · 69 ms] Image choisie : logo-mab.png {"type":"image/png","kb":0}
14:32:59.386 +10.61s DEBUG smart.palette.pixels [smart.palette#1 · 83 ms] Logo lu : 120×60 px (analysé en 120×60) {"natural":"120×60","sample":"120×60"}
14:32:59.390 +10.61s INFO  smart.palette.colors [smart.palette#1 · 87 ms] 2 couleur(s) dominante(s) {"colors":["#ffd400 51 %","#f2353f 49 %"]}
14:32:59.391 +10.61s INFO  smart.palette.proposal [smart.palette#1 · 88 ms] Proposition : #e00e1a #ffd400 #231516 #fbf7f7 #725a5b #ffffff · 1 correction de contraste {"palette":{"c1":"#e00e1a","c2":"#ffd400","c3":"#231516","c4":"#fbf7f7","c5":"#725a5b","c6":"#ffffff"},"roles":{"c1":"du logo","c2":"…
…
14:32:59.612 +10.83s INFO  smart.palette.ok [smart.palette#1 · 309 ms] Palette appliquée (Ctrl+Z pour revenir à l’ancienne) {"palette":{"c1":"#e00e1a","c2":"#ffd400","c3":"#231516","c4":"#fbf7f7","c5":"#725a5b","c6":"#ffffff"},"changes":1}
…
14:32:59.738 +10.96s INFO  store.undo Annuler {"left":9,"redo":1}
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
14:33:00.074 +11.29s INFO  smart.palette.colors [smart.palette#2 · 42 ms] 1 couleur(s) dominante(s) {"colors":["#222222 100 %"]}
14:33:00.074 +11.29s WARN  smart.palette.no-vivid [smart.palette#2 · 42 ms] Le logo n’a pas de couleur vive : la couleur principale du site est gardée, le reste en découle. {"colors":["#222222"]}
14:33:00.075 +11.30s INFO  smart.palette.proposal [smart.palette#2 · 43 ms] Proposition : #c8181d #f0be7f #231515 #fbf7f7 #725a5a #ffffff {"palette":{"c1":"#c8181d","c2":"#f0be7f","c3":"#231515","c4":"#fbf7f7","c5":"#725a5a","c6":"#ffffff"},"roles":{"c1":"gardée","c2":"dérivée de la principale","c3…
…
14:33:00.099 +11.32s INFO  smart.palette.cancel [smart.palette#2 · 67 ms] Fermé sans appliquer
…
14:33:00.164 +11.38s INFO  smart.palette.colors [smart.palette#3 · 29 ms] 0 couleur(s) dominante(s) {"colors":[]}
14:33:00.164 +11.38s ERROR smart.palette.fail [smart.palette#3 · 29 ms] Logo illisible : Logo entièrement transparent : aucune couleur à lire. {"error":{"name":"Error","message":"Logo entièrement transparent : aucune couleur à lire.","stack":"Error: Logo entièrement transparent : aucune couleur à l…
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
