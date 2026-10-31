# Auto-test d’Atelier

- Date : 2026-10-29T21:31:20.897Z
- Durée : 19.1 s
- IA : faux modèle intégré (vérifie les écrans, pas la qualité des réponses)

**Résultat : 25 / 25 réussis** · 0 échoué(s) · 0 erreur(s) · 1 ignoré(s) — Note : 100 / 100

**Retour arrière : ✓ ton projet est revenu exactement comme avant (« MAB – Médias Alternatifs Belges », 3 pages) ; 0 version(s) et 1 image(s) temporaires supprimées.**

| # | Cas d’usage | Chapitre | Statut | Durée |
|---|---|---|---|---|
| 1 | Projet de test chargé et enregistré sur l’appareil | 1 | ✓ réussi | 771 ms |
| 2 | Fenêtre 🐞 Journal : ouvrir, régler, fermer | 0 | ✓ réussi | 702 ms |
| 3 | Sélectionner : clic, flèche ↓, Échap | 2 | ✓ réussi | 441 ms |
| 4 | Ajouter un widget depuis la bibliothèque | 2 | ✓ réussi | 619 ms |
| 5 | Annuler puis rétablir | 2 | ✓ réussi | 1158 ms |
| 6 | Dupliquer, copier, coller, supprimer au clavier | 2 | ✓ réussi | 1401 ms |
| 7 | Modifier un titre directement dans la page | 2 | ✓ réussi | 289 ms |
| 8 | Infobulles des boutons : survol, raccourci, masquage | 2 | ✓ réussi | 637 ms |
| 9 | Élargir les panneaux de gauche et de droite (clavier, double-clic) | 2 | ✓ réussi | 458 ms |
| 10 | Ctrl+K : lancer une commande | 2 | ✓ réussi | 615 ms |
| 11 | Style : taille du texte, puis réinitialiser | 3 | ✓ réussi | 866 ms |
| 12 | Aperçu mobile puis ordinateur | 3 | ✓ réussi | 788 ms |
| 13 | Créer puis supprimer une page | 4 | ✓ réussi | 449 ms |
| 14 | Importer un logo (image dessinée par le test) | 4 | ✓ réussi | 310 ms |
| 15 | Agenda : créer, ajouter un événement, exporter en CSV | 4 | ✓ réussi | 1129 ms |
| 16 | Versions : enregistrer puis supprimer | 4 | ✓ réussi | 726 ms |
| 17 | Tableau des traductions : ouvrir, filtrer | 5 | ✓ réussi | 531 ms |
| 18 | Référencement : ouvrir, changer de langue | 6 | ✓ réussi | 679 ms |
| 19 | IA locale : état des modèles | 7 | ✓ réussi | 621 ms |
| 20 | Vérifier puis exporter le site en .zip | 8 | ✓ réussi | 322 ms |
| 21 | Enregistrer le projet en .json (Ctrl+S) | 1 | ✓ réussi | 458 ms |
| 22 | Tester la connexion à publish.php (sans publier) | 8 | ✓ réussi | 440 ms |
| 23 | Palette depuis le logo, puis annuler | 12 | ✓ réussi | 639 ms |
| 24 | Fiches créées depuis un texte collé (IA) | 12 | ✓ réussi | 861 ms |
| 25 | Demander à Atelier : « ajoute une FAQ de 3 questions » (IA) | 13 | ✓ réussi | 1080 ms |
| 26 | Collaboration en direct (deux appareils) | 10 | – ignoré — demande deux appareils : voir le chapitre 10 du guide |  |

## Avertissements et erreurs pendant l’auto-test
```
22:31:37.610 +19.64s WARN  translate.timeout Translator.availability(fr → nl) sans réponse après 4 s : considéré indisponible {"from":"fr","to":"nl","ms":4001}
```

## Environnement
- atelier : cycle 21 · publish.php attendu v4
- date : 2026-10-29T21:31:43.988Z
- fuseau : Europe/Brussels
- adresse : http://localhost:8791/
- navigateur : HeadlessChrome 141, Chromium 141
- agent : Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.7390.37 Safari/537.36
- plateforme : Linux
- langues : fr-FR
- écran : 1440×900 · fenêtre 1440×900 · ×1
- machine : 2 cœurs · 8 Go
- réseau : en ligne · 4g
- stockage : 0 Mo utilisés sur 534 Mo
- journal : console debug · tampon debug · trace serveur oui
- mémoireJs : 14 Mo
- ia : {"fournisseur":"Chrome","globales":"LanguageModel (absent), Summarizer, Rewriter (absent), Writer (absent), Proofreader (absent), Translator, LanguageDetector","état":"prompt=absent multimodal=absent rewriter=absent writer=absent proofreader=absent summarizer=unavailable detector=downloadable translator=unavailable","vérifié":"il y a 0 s, langue fr","traducteur":"fr>nl=timeout"}
- interface : {"langue":"fr","navigateur":"fr-FR"}
- projet : {"nom":"MAB – Médias Alternatifs Belges","langues":["fr","nl","de","en"],"pages":3,"éléments":38,"collections":0,"composants":0,"images":"1 (1 Ko)","publication":"zip","adresse":"https://www.xn--mdia-alternatif-bnb.be"}
- éditeur : {"page":"p_2ehilrhs","langue":"fr","appareil":"tablet","sélection":null,"édition":"page","relecture":false,"annuler":3,"rétablir":1}
- collaboration : {"session":"aucune","stun":"stun:stun.l.google.com:19302","identité":"aucune"}
