# Cycle 5 — Widgets, modèles, pages, contrôle et export

## Livré
- 12 widgets en plus des 6 de base (18 au total) : liste à icônes, encadré icône, citation, chiffres clés, accordéon/FAQ (avec données structurées Google en option), galerie (agrandissement au clic), vidéo YouTube/Vimeo, carte, réseaux sociaux, formulaire de contact, carte de contenu, tarif.
- Vie privée : vidéo et carte sont des « façades » ; rien n'est chargé chez YouTube, Vimeo ou Google avant le clic du visiteur (youtube-nocookie, Vimeo `dnt=1`).
- Formulaire sans serveur : ouvre le logiciel de courriel du visiteur avec le message prérempli ; l'adresse de réception est encodée dans la page (pas lisible par les robots) ; champ piège anti-spam. Option : adresse d'envoi https (service de formulaire, ou le futur `publish.php`).
- Édition directe des éléments de liste (ex. une ligne de la liste à icônes, une question de la FAQ).
- 13 modèles de sections (héros, héros centré, avantages, chiffres, témoignages, tarifs, FAQ, appel à l'action, contact, galerie, actualités, texte + image, vidéo), avec schéma miniature, à cliquer ou glisser.
- Pages : ajout (adresse propre générée depuis le titre), ouverture, titre par langue, adresse, description Google par langue avec compteur, ordre du menu, suppression (sauf l'accueil).
- Liens internes `page:ID` : choisis dans une liste, ils restent justes dans chaque langue et après un changement d'adresse.
- Fenêtre « Vérification avant export » : erreurs bloquantes, points à vérifier (image sans description, ancre ou page introuvable, bouton sans lien, formulaire sans destinataire, vidéo non reconnue, zéro ou plusieurs H1…), textes à traduire ; chaque ligne a un bouton « Aller à ». Le badge « N à traduire » ouvre la même fenêtre.

## Tests
- Unitaires : 93 réussis (rendu de chaque widget, analyse stricte des adresses vidéo, échappement, modèles valides, contrôle avant export, liens internes par langue).
- Bout en bout : 106 réussis sur les cycles 2 à 5, dont l'export réel : zip décompressé, site ouvert à 390 px sans débordement, vidéo chargée au clic, accordéon, page néerlandaise.

## Corrigé
- Une image non choisie laissait un cadre vide sur le site publié.
- Re-rendu du panneau de gauche pendant un évènement de perte de focus (même protection que l'inspecteur).
