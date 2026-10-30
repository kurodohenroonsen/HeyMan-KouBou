# Guide d'utilisation d'Atelier — avec les journaux attendus

Aussi disponible en : [English](en/README.md) · [日本語](ja/README.md)

Ce guide décrit **chaque fonctionnalité** d'Atelier, cas d'usage par cas d'usage. Pour chacun :

1. **But** et **étapes** : ce que tu fais.
2. **Chemin normal** : ce que tu vois, puis le **journal attendu**.
3. **Variantes** : les autres chemins qui réussissent aussi.
4. **Erreurs** : ce qui peut échouer, le message affiché, la ligne du journal, et quoi faire.

Les extraits de journal sont **réels** : ils sont capturés par les tests de bout en bout (dossier [`journaux/`](journaux/)). Les heures, les durées et les identifiants changent d'une fois à l'autre ; ce qui compte, ce sont les **codes**, leur **ordre** et leur **niveau**.

## Pour commencer
Tu découvres Atelier ? Commence ici, sans aucune connaissance technique :
- [Bienvenue dans Atelier](bienvenue.md) : ce que l'atelier fait pour toi, en quelques minutes.
- [Prise en main : le site touristique de Kumakōgen](prise-en-main.md) : créer pas à pas deux pages complètes, avec chaque widget.
- [Tous les widgets](widgets.md) : chaque élément qu'on peut poser dans une page, à quoi il sert et ce qu'on peut régler.

Les chapitres ci-dessous détaillent chaque fonctionnalité. Les **détails techniques** (journal, codes) servent surtout en cas de souci : dans le guide en ligne, ils sont cachés tant qu'on ne coche pas « Afficher les détails techniques ».

## Chapitres
| # | Chapitre | Contenu |
|---|---|---|
| 0 | [Le journal de débogage](00-journal.md) | Récupérer les journaux du navigateur, de la console et du serveur ; lire une ligne ; réglages |
| 1 | [Démarrer, enregistrer, ouvrir](01-demarrage-projet.md) | Démarrage, sauvegarde automatique, fichiers .json, exemple, nouveau site, aperçu |
| 2 | [Éditer une page](02-edition.md) | Sélection, ajout, glisser-déposer, texte en place, copier-coller, annuler, structure, Ctrl+K, raccourcis, infobulles |
| 3 | [Mise en forme et design](03-style-design.md) | Inspecteur, styles par appareil et par état, presets, couleurs et polices du site, modèles, composants, en-tête et pied |
| 4 | [Pages, images, collections, versions](04-pages-images-contenus.md) | Pages et menu, images, collections (membres, actualités, agenda), CSV, versions |
| 5 | [Langues et traductions](05-langues-traductions.md) | Langues du site, tableau des traductions, traduction sur l'appareil, « à relire », CSV |
| 6 | [Référencement (SEO)](06-seo.md) | Notes, aperçus, champs, conseils, publication |
| 7 | [IA locale (Gemini Nano)](07-ia-locale.md) | État et téléchargement, reformuler, corriger, descriptions, textes alternatifs |
| 8 | [Vérifier, exporter, publier](08-verifier-exporter-publier.md) | Contrôle avant export, accessibilité, .zip, OVH (publish.php), GitHub, journal du serveur |
| 9 | [Le site publié](09-site-publie.md) | Formulaires de contact, menu mobile, agenda « à venir », vidéos et cartes, journal du site |
| 10 | [Travailler à plusieurs](10-collaboration.md) | Héberger, inviter, rejoindre, présence, hors ligne, codes manuels, réseau |
| 11 | [Relecture et commentaires](11-relecture-commentaires.md) | Mode relecture, commentaires signés, réponses, résolution |
| 12 | [Contenus intelligents](12-contenus-intelligents.md) | Affiche → événement, texte collé → fiches, chapô et titres, résumé de la relecture, palette depuis le logo |
| 13 | [Demander à Atelier](13-demander-a-atelier.md) | Demandes en langage courant, liste fermée d'actions, page décrite, refus |
| 14 | [Banc d'essai de l'IA locale](14-banc-essai.md) | Tester le vrai Gemini Nano sur des exemples fixes, lire le rapport |
| 15 | [Auto-test en console](15-auto-test.md) | Rejouer tous les cas d’usage dans ton navigateur, rapport à coller, retour arrière |
| A | [Index des codes du journal](index-codes.md) | Tous les codes, par domaine, avec leur niveau et leur chapitre |

## Lire une ligne du journal
```
12:03:04.567 +2.31s INFO  publish.php.ok [publish.php#2 · 840 ms] Site publié : 42 fichiers {"written":42,"removed":1,"ref":"9f3a01c2"}
│            │      │     │              │                        │                         └ données (secrets masqués)
│            │      │     │              │                        └ message
│            │      │     │              └ parcours n° 2 de « publish.php », 840 ms depuis son début
│            │      │     └ code stable : domaine.action
│            │      └ niveau : TRACE, DEBUG, INFO, WARN, ERROR
│            └ temps depuis l'ouverture de l'éditeur
└ heure locale
```
- Un **parcours** commence par `….start`, peut avoir des étapes, et finit par `….ok` (réussi), `….fail` (échec, niveau ERROR, avec l'erreur) ou `….cancel` (abandonné par la personne).
- Les lignes `php.…` viennent de **publish.php** sur l'hébergement : l'éditeur les reçoit avec la réponse quand le journal est en mode `debug` (voir le chapitre 0). Elles portent `req`, la référence de la requête côté serveur.
- Les lignes `ui.…` (clics, champs, fenêtres, messages) montrent **ce que la personne a fait** ; elles sont omises dans la plupart des extraits de ce guide pour rester lisibles, mais elles sont dans le journal copié.

## Niveaux
| Niveau | Sens | Exemple |
|---|---|---|
| TRACE | Très bavard, désactivé par défaut | survol d'un élément, relève de la boîte aux lettres chaque seconde |
| DEBUG | Fonctionnement détaillé | modification enregistrée, clic, fenêtre ouverte |
| INFO | Étape visible pour la personne | publication terminée, projet ouvert |
| WARN | Anomalie gérée, repli, refus attendu | jeton refusé, image introuvable, API d'IA absente |
| ERROR | Échec | publication impossible, enregistrement local impossible, erreur JavaScript |

## Pour signaler un problème
1. Refais l'opération qui pose problème.
2. Clique sur **🐞** (barre du haut) puis **📋 Copier le journal**. Si l'hébergement est concerné, ouvre d'abord « Journal du serveur » et clique **Lire le journal du serveur** : ses lignes sont ajoutées à la copie.
3. Colle le tout dans ton message, avec une phrase : ce que tu as fait, ce que tu attendais, ce qui s'est passé.

Le journal copié commence par l'environnement (navigateur, écran, stockage, projet, réglages) : pas besoin de le décrire.
