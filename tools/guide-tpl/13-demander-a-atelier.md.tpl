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
<<demander-faq|cmdk.run,assist.open,ai.plan.start,ai.plan.call,ai.plan.reply,ai.plan.actions,ai.plan.ok,assist.plan,assist.apply.start,assist.apply.step,assist.apply.ok,store.undo>>
```
À vérifier : `ai.plan.call` montre la taille de la consigne (`system`, avec le catalogue) et de la demande ; `ai.plan.actions` les actions retenues ; `assist.apply.step` une ligne par action appliquée ; `assist.apply.ok` le nombre de textes écrits par l'IA (`aiTexts`, marqués « à relire »).

**Variante — un réglage sur toute la page** ([`journaux/demander-style.log`](journaux/demander-style.log))
```log
<<demander-style|ai.plan.actions,assist.plan,assist.apply.step,assist.apply.ok>>
```
« rouge » devient `#dc2626`, « centré » devient `center` : le modèle dit ce qu'il a compris, le code convertit et vérifie (une couleur ou une valeur non reconnue est refusée).

---

## 13.2 Créer une page à partir d'une description

**Étapes** : panneau **Pages** → **✨ Page décrite** (ou Ctrl+K) ; décris la page ; **✨ Préparer** ; **Appliquer**. La page est créée avec ses sections, titres et textes de départ, puis ouverte.

**Journal attendu** ([`journaux/demander-page.log`](journaux/demander-page.log))
```log
<<demander-page|assist.open,ai.plan.call,ai.plan.rejected,ai.plan.actions,assist.plan,assist.rejected,assist.apply.start,assist.apply.step,store.view,assist.apply.ok>>
```
Ici le modèle a aussi proposé un modèle de section qui n'existe pas (`carrousel-3d`) : il est refusé, le reste de la page est créé.

**Bon à savoir** : le modèle n'invente pas les faits (horaires, adresses, prix) : il écrit des textes de départ génériques, marqués « à relire » ; complète-les. Si le menu est personnalisé, un avertissement rappelle d'y ajouter la nouvelle page.

---

## 13.3 Refus, rien à faire, IA absente

([`journaux/demander-refus-sans-ia.log`](journaux/demander-refus-sans-ia.log))
```log
<<demander-refus-sans-ia|ai.plan.rejected,ai.plan.actions,assist.plan,assist.rejected,assist.nothing,assist.cancel,ai.plan.absent,ai.plan.cancel,assist.plan-fail>>
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
| IA locale indisponible | « Préparation impossible » + bouton ✨ IA locale | `ai.plan.absent` (WARN), `assist.plan-fail` (WARN) | chapitre 7 |
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
