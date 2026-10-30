# Cycle 12 — Publication et versions

## Spécification (écrite avant les tests)

### Versions
- « Enregistrer une version » (nommée) ; versions automatiques : la première modification de chaque jour, et avant toute opération risquée (restaurer, ouvrir un projet, nouveau site, exemple).
- Liste : date, nom, nombre de pages, différences avec l'état actuel (pages ajoutées, supprimées, modifiées ; composants ; thème). Restaurer (une version de sécurité de l'état actuel est enregistrée d'abord), supprimer.
- Stockage dans le navigateur ; les images ne sont pas dupliquées (elles restent dans le magasin d'images). Au plus 30 versions automatiques (les plus anciennes sont retirées), les versions nommées sont gardées.

### Publication sur OVH avec `publish.php`
- L'éditeur génère un fichier `publish.php` personnalisé, à déposer **une seule fois** par FTP à la racine du site. Il contient l'empreinte SHA-256 d'un jeton secret (le jeton lui-même n'y est pas).
- « Publier » envoie le site en zip avec le jeton. Le serveur :
  - refuse sans jeton valide (comparaison en temps constant, petite attente en cas d'échec) ;
  - refuse tout le paquet si une entrée est dangereuse : chemin absolu ou `..`, fichier caché, extension hors liste (html, css, js, xml, txt, webp, jpg, png, gif, avif, ico, json), fichier `.php`, taille excessive ;
  - écrit les fichiers, puis supprime uniquement les fichiers de la publication précédente qui n'existent plus (manifeste) : les fichiers ajoutés à la main (vérification Google…) ne sont jamais touchés ; ne s'écrase jamais lui-même.
- Formulaire de contact sans logiciel de courriel : le formulaire envoie au même `publish.php`, qui transmet par e-mail à l'adresse configurée pour ce formulaire. Les adresses ne sont jamais dans les pages publiques : elles sont envoyées avec la publication et stockées côté serveur dans un fichier PHP non lisible par le web. Champ piège anti-robots, 5 messages par heure et par adresse IP, longueurs limitées, aucune donnée du visiteur dans les en-têtes sauf un `Reply-To` validé.
- `GET publish.php` : « test de connexion » (version, sans secret). Préflight CORS géré (l'éditeur peut être sur une autre adresse).

### Publication par GitHub (intégration Git d'OVH, sans PHP)
- Jeton GitHub à portée limitée, dépôt, branche, dossier. Publication par l'API Git : seuls les fichiers modifiés sont envoyés (empreinte Git calculée localement), les fichiers supprimés du site disparaissent du dossier, le reste du dépôt est conservé. Un seul commit par publication ; OVH déploie via son webhook.

### Secrets
- Jetons enregistrés seulement si on le demande (« se souvenir sur cet appareil »), à part du projet : jamais dans l'export .json, jamais dans les versions.

## Livré
- **Versions** (Fichier → Versions…, ou Ctrl+K) : enregistrer une version nommée ; version automatique au début de chaque journée de travail ; version de sécurité avant restauration, ouverture d'un projet, nouveau site ou exemple. Chaque version indique ce qui diffère de l'état actuel (« pages différentes : Accueil »…). Restaurer (annulable par Ctrl+Z), supprimer. Les images ne sont pas recopiées. 30 versions automatiques au plus, les versions nommées sont gardées.
- **🚀 Publier**, trois voies :
  - **OVH avec publish.php** : « ⇩ publish.php » crée un jeton et télécharge le fichier personnalisé ; on le dépose une fois par FTP ; « Tester la connexion » ; « Publier le site ». Les formulaires de contact passent alors par publish.php et arrivent par e-mail : l'adresse ne figure plus du tout dans les pages.
  - **GitHub → OVH** : un commit par publication, seuls les fichiers modifiés sont envoyés, les fichiers retirés du site disparaissent du dossier, le reste du dépôt est conservé ; l'intégration Git d'OVH déploie (webhook).
  - **Fichier .zip** comme avant.
- **Secrets** : jetons gardés dans le champ, ou sur l'appareil si on coche « se souvenir », jamais dans le projet, l'export .json ou les versions.

## publish.php — garanties vérifiées par les tests (vrai serveur PHP 8.3)
- Sans jeton ou avec un mauvais jeton : refus (401), rien n'est écrit.
- Paquet refusé en entier si une seule entrée est dangereuse : `../`, chemin absolu, fichier caché, `.php` (même `x.php.html`), `.svg`, espace dans le nom, dossier réservé, ou `publish.php` lui-même.
- Publication suivante : les anciens fichiers du site qui n'existent plus sont supprimés (et les dossiers vides), les fichiers ajoutés à la main (vérification Google…) sont conservés.
- Adresses des formulaires stockées dans un fichier PHP qui répond 404 si on l'appelle depuis le web.
- Formulaire : e-mail à l'adresse configurée, `Reply-To` validé, tentative d'injection d'en-tête (`\r\nBcc:`) neutralisée, champ piège pour les robots, formulaire inconnu (404), message vide (422), 5 messages par heure et par IP (429), retour sans JavaScript (redirection 303, uniquement vers une adresse relative du site).
- Préflight CORS, test de connexion sans secret.

## Corrigé
- Fenêtre Publier : étape 1 coupée en deux et boutons étirés sur toute la largeur, remis en ligne après la vérification visuelle.
- Le lanceur de tests comptait comme « erreur JavaScript » le message réseau d'un refus HTTP volontaire (401) : seules les vraies exceptions sont désormais comptées.

## Tests
- Unitaires : 202 (dont 23 nouveaux), parmi lesquels 10 tests d'intégration du vrai publish.php servi par `php -S`.
- Bout en bout : 287 au total (régression complète des cycles 2 à 12 au vert), dont 23 nouveaux : versions, publication réelle vers publish.php, formulaire du site publié rempli par un visiteur jusqu'à l'e-mail, republication, mauvais jeton, GitHub (API simulée).
