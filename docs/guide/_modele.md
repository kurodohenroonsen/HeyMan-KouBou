# Modèle d'un chapitre du guide (à suivre pour chaque chapitre)

> Fichier de travail pour les rédacteurs : ne fait pas partie du guide lu par les personnes.

Ton : français clair, tutoiement, phrases courtes ; les noms de boutons entre « guillemets » tels qu'ils s'affichent, avec leur icône. Pas de jargon sans explication. Les codes du journal entre accents graves : `domaine.action`.

````markdown
# N. Titre du chapitre

Une ou deux phrases : à quoi sert cette partie d'Atelier.

**Domaines du journal** : `domaine1.*`, `domaine2.*` (et ce qu'ils couvrent en une ligne chacun).

---

## N.1 Titre du cas d'usage (verbe à l'infinitif : « Ajouter un widget »)

**But** : une phrase.

**Étapes**
1. …
2. …

**Ce que tu vois** : le résultat à l'écran, en une ou deux phrases.

**Journal attendu** (chemin normal, extrait réel : [`journaux/nom-du-cas.log`](journaux/nom-du-cas.log))
```log
04:23:19.499 +0.01s INFO  exemple.start [exemple#1] …
04:23:19.817 +0.33s INFO  exemple.ok [exemple#1 · 318 ms] …
```
À vérifier : les codes clés, dans cet ordre (une phrase).

**Variantes**
| Situation | Ce qui change à l'écran | Journal |
|---|---|---|
| … | … | `exemple.variante` (INFO) au lieu de … |

**Erreurs**
| Situation | Message affiché | Journal | Que faire |
|---|---|---|---|
| … | « … » | `exemple.fail` (ERROR) avec `error.message` = … | … |

---
````

Règles :
- **Chaque code** que ton code source écrit doit apparaître au moins une fois dans le chapitre (un test le vérifie : `node --test tests/log-catalog.test.js`). Les étapes d'un parcours s'écrivent en entier : `publish.php.package`, pas seulement `package`.
- Les extraits de journal viennent des fichiers produits par les tests (`docs/guide/journaux/*.log`) : copie-les tels quels, en coupant au besoin les lignes sans intérêt (indique `…`).
- Un cas d'usage par fonctionnalité visible ; regroupe les petites variantes dans le tableau plutôt que de multiplier les sections.
- Termine le chapitre par « **Codes de ce chapitre** » : tableau code → niveau → sens, trié par code.
