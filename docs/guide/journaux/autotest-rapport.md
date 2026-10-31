# Auto-test d’Atelier

- Date : 2026-10-31T12:34:56.010Z
- Durée : 19.4 s
- IA : faux modèle intégré (vérifie les écrans, pas la qualité des réponses)

**Résultat : 24 / 25 réussis** · 1 échoué(s) · 0 erreur(s) · 1 ignoré(s) — Note : 96 / 100

**Retour arrière : ✓ ton projet est revenu exactement comme avant (« MAB – Médias Alternatifs Belges », 3 pages) ; 0 version(s) et 1 image(s) temporaires supprimées.**

| # | Cas d’usage | Chapitre | Statut | Durée |
|---|---|---|---|---|
| 1 | Projet de test chargé et enregistré sur l’appareil | 1 | ✓ réussi | 760 ms |
| 2 | Fenêtre 🐞 Journal : ouvrir, régler, fermer | 0 | ✓ réussi | 721 ms |
| 3 | Sélectionner : clic, flèche ↓, Échap | 2 | ✓ réussi | 460 ms |
| 4 | Ajouter un widget depuis la bibliothèque | 2 | ✓ réussi | 633 ms |
| 5 | Annuler puis rétablir | 2 | ✓ réussi | 1202 ms |
| 6 | Dupliquer, copier, coller, supprimer au clavier | 2 | ✓ réussi | 1447 ms |
| 7 | Modifier un titre directement dans la page | 2 | ✓ réussi | 320 ms |
| 8 | Infobulles des boutons : survol, raccourci, masquage | 2 | ✓ réussi | 637 ms |
| 9 | Élargir les panneaux de gauche et de droite (clavier, double-clic) | 2 | ✓ réussi | 458 ms |
| 10 | Ctrl+K : lancer une commande | 2 | ✓ réussi | 630 ms |
| 11 | Style : taille du texte, puis réinitialiser | 3 | ✓ réussi | 1020 ms |
| 12 | Aperçu mobile puis ordinateur | 3 | ✓ réussi | 788 ms |
| 13 | Créer puis supprimer une page | 4 | ✓ réussi | 443 ms |
| 14 | Importer un logo (image dessinée par le test) | 4 | ✓ réussi | 274 ms |
| 15 | Agenda : créer, ajouter un événement, exporter en CSV | 4 | ✓ réussi | 1109 ms |
| 16 | Versions : enregistrer puis supprimer | 4 | ✓ réussi | 721 ms |
| 17 | Tableau des traductions : ouvrir, filtrer | 5 | ✓ réussi | 524 ms |
| 18 | Référencement : ouvrir, changer de langue | 6 | ✓ réussi | 682 ms |
| 19 | IA locale : état des modèles | 7 | ✓ réussi | 623 ms |
| 20 | Vérifier puis exporter le site en .zip | 8 | ✓ réussi | 304 ms |
| 21 | Enregistrer le projet en .json (menu Fichier) | 1 | ✓ réussi | 479 ms |
| 22 | Tester la connexion à publish.php (sans publier) | 8 | ✗ échoué | 450 ms |
| 23 | Palette depuis le logo, puis annuler | 12 | ✓ réussi | 631 ms |
| 24 | Fiches créées depuis un texte collé (IA) | 12 | ✓ réussi | 840 ms |
| 25 | Demander à Atelier : « ajoute une FAQ de 3 questions » (IA) | 13 | ✓ réussi | 1075 ms |
| 26 | Collaboration en direct (deux appareils) | 10 | – ignoré — demande deux appareils : voir le chapitre 10 du guide |  |

## Détail des problèmes

### ✗ Tester la connexion à publish.php (sans publier) (`publication`, chapitre 8)
- ✗ publish.php à jour — publish.php installé en version 4 : la version 6 ajoute le .htaccess, les polices, la page 404 et protège mieux la collaboration

Journal du cas :
```
13:35:12.028 +18.70s DEBUG selftest.case-start Cas : Tester la connexion à publish.php (sans publier) {"id":"publication","chapter":8}
13:35:12.029 +18.70s DEBUG ui.click Clic : Publier {"el":"button","id":"publishBtn","text":"Publier"}
13:35:12.031 +18.70s INFO  publish.open Fenêtre Publier {"mode":"zip","tab":"php","ok":true,"errors":0,"warnings":4}
13:35:12.035 +18.70s DEBUG ui.dialog.open Fenêtre ouverte : Publier le site {"id":"publishDialog","class":"audit","modal":true}
13:35:12.039 +18.71s DEBUG publish.token-for Dépôt GitHub incomplet : aucun jeton pré-rempli
13:35:12.042 +18.71s DEBUG storage.secret-read Aucun secret gardé {"name":"backup-code:https://www.xn--mdia-alternatif-bnb.be"}
13:35:12.044 +18.71s DEBUG storage.secret-read Aucun secret gardé {"name":"php-token:https://www.xn--mdia-alternatif-bnb.be"}
13:35:12.044 +18.71s DEBUG publish.token-for Aucun jeton gardé pour www.xn--mdia-alternatif-bnb.be {"origin":"https://www.xn--mdia-alternatif-bnb.be","known":false}
13:35:12.099 +18.77s DEBUG ui.click Clic : OVH (publish.php) {"el":"button","text":"OVH (publish.php)","data":{"pubTab":"php"},"dialog":"publishDialog"}
13:35:12.162 +18.83s DEBUG ui.change Champ modifié : input {"el":"input","data":{"pub":"url"},"dialog":"publishDialog","value":"http://localhost:8833/faux-ovh/publish.php"}
13:35:12.163 +18.83s DEBUG store.commit Modification {"source":"site","past":17,"page":"p_xcmre7ry"}
13:35:12.168 +18.84s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"site","mode":"contenu","ms":4}
13:35:12.175 +18.84s DEBUG storage.secret-read Aucun secret gardé {"name":"php-token:http://localhost:8833"}
13:35:12.176 +18.85s DEBUG publish.token-for Aucun jeton gardé pour localhost:8833 {"origin":"http://localhost:8833","known":false}
13:35:12.249 +18.92s DEBUG ui.click Clic : Tester la connexion {"el":"button","text":"Tester la connexion","data":{"pubTest":""},"dialog":"publishDialog"}
13:35:12.251 +18.92s DEBUG store.commit Modification {"source":"site","past":18,"page":"p_xcmre7ry"}
13:35:12.255 +18.93s DEBUG canvas.render Canevas mis à jour sans rechargement (en-tête, contenu, pied, styles) {"source":"site","mode":"contenu","ms":3}
13:35:12.260 +18.93s INFO  publish.test.start [publish.test#1] Test de connexion à publish.php {"url":"http://localhost:8833/faux-ovh/publish.php","token":false}
13:35:12.264 +18.93s DEBUG net.request GET localhost:8833/faux-ovh/publish.php {"id":9,"method":"GET","url":"http://localhost:8833/faux-ovh/publish.php"}
13:35:12.283 +18.95s DEBUG net.response 200 GET localhost:8833/faux-ovh/publish.php (19 ms) {"id":9,"status":200,"ms":19,"type":"application/json","size":70}
13:35:12.285 +18.95s WARN  publish.test.old-version [publish.test#1 · 25 ms] publish.php installé en version 4 : la version 6 ajoute le .htaccess, les polices, la page 404 et protège mieux la collaboration {"installed":"4","expected":"6"}
13:35:12.285 +18.95s INFO  publish.test.ok [publish.test#1 · 25 ms] publish.php répond {"version":"4","php":"8.2.0","zip":true,"req":"r-test"}
```

## Avertissements et erreurs pendant l’auto-test
```
13:35:12.285 +18.95s WARN  publish.test.old-version [publish.test#1 · 25 ms] publish.php installé en version 4 : la version 6 ajoute le .htaccess, les polices, la page 404 et protège mieux la collaboration {"installed":"4","expected":"6"}
13:35:13.039 +19.71s WARN  translate.timeout Translator.availability(fr → nl) sans réponse après 4 s : considéré indisponible {"from":"fr","to":"nl","ms":4001}
```

## Environnement
- atelier : cycle 21 · publish.php attendu v6
- date : 2026-10-31T12:35:19.420Z
- fuseau : Europe/Brussels
- adresse : http://localhost:8833/
- navigateur : HeadlessChrome 141, Chromium 141
- agent : Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.7390.37 Safari/537.36
- plateforme : Linux
- langues : fr-FR
- écran : 1440×900 · fenêtre 1440×900 · ×1
- machine : 2 cœurs · 8 Go
- réseau : en ligne · 4g
- stockage : 0 Mo utilisés sur 452 Mo
- journal : console debug · tampon debug · trace serveur oui
- mémoireJs : 13 Mo
- ia : {"fournisseur":"Chrome","globales":"LanguageModel (absent), Summarizer, Rewriter (absent), Writer (absent), Proofreader (absent), Translator, LanguageDetector","état":"prompt=absent multimodal=absent rewriter=absent writer=absent proofreader=absent summarizer=unavailable detector=downloadable translator=unavailable","vérifié":"il y a 0 s, langue fr","traducteur":"fr>nl=timeout"}
- interface : {"langue":"fr","navigateur":"fr-FR"}
- projet : {"nom":"MAB – Médias Alternatifs Belges","langues":["fr","nl","de","en"],"pages":3,"éléments":38,"collections":0,"composants":0,"images":"1 (1 Ko)","publication":"zip","adresse":"https://www.xn--mdia-alternatif-bnb.be"}
- éditeur : {"page":"p_gm7pw4uw","langue":"fr","appareil":"tablet","sélection":null,"édition":"page","relecture":false,"annuler":3,"rétablir":1}
- collaboration : {"session":"aucune","stun":"stun:stun.l.google.com:19302","identité":"aucune"}
