# 9. Le site publié

Le site publié est fait de pages HTML statiques, d'une feuille de styles et, si une page en a besoin, d'un petit script `site.js` : menu mobile, formulaire de contact, listes « à venir » de l'agenda, galeries, vidéos et cartes chargées au clic. publish.php relaie les formulaires de contact par e-mail.

**Domaines du journal** : `site.*` (console du visiteur, muette par défaut), `php.contact.*` (formulaires, côté serveur, dans le journal du serveur).

---

## 9.1 Allumer le journal du site

**But** : voir ce que fait le site dans le navigateur d'un visiteur (le tien).

**Étapes**
1. Ajoute `?atelier-debug` à l'adresse d'une page : `https://www.média-alternatif.be/?atelier-debug`. Le réglage est gardé sur cet appareil pour toutes les pages du site.
2. Console (F12) : filtre `[Atelier site]`.
3. Pour l'éteindre : `?atelier-debug=0`.

**Ce que tu vois** : rien de changé à l'écran ; dans la console, une ligne par événement.

**Journal attendu** (extrait réel, navigateur de téléphone simulé : [`journaux/site-publie-console.log`](journaux/site-publie-console.log))
```log
[Atelier site] site.boot Page chargée {"page":"/","lang":"fr","forms":0,"lists":0}
[Atelier site] site.nav Menu mobile ouvert
[Atelier site] site.boot Page chargée {"page":"/contact/","lang":"fr","forms":1,"lists":0}
[Atelier site] site.form.submit Envoi du formulaire {"action":"http://127.0.0.1:9496/publish.php","fields":3}
[Atelier site] site.form.ok Message envoyé {"status":200,"req":"432cac3c"}
```
`site.boot` dit combien la page contient de formulaires reliés à publish.php (`forms`) et de listes datées (`lists`).

Les pages sans menu mobile, formulaire, liste datée, galerie, vidéo ni carte n'ont pas de script : rien ne s'affiche, c'est normal.

---

## 9.2 Envoyer un message par le formulaire de contact

**But** : un visiteur écrit au média ; le message arrive par e-mail à l'adresse choisie dans l'éditeur (jamais visible dans la page).

**Étapes (visiteur)** : remplir le formulaire, « Envoyer ».

**Ce que tu vois** : le bouton se désactive le temps de l'envoi, puis le message de confirmation choisi dans l'éditeur ; le formulaire se vide.

**Journal attendu**
- Dans la console du visiteur (avec `?atelier-debug`) : `site.form.submit` (nombre de champs remplis, sans leur contenu) puis `site.form.ok` avec `req`, la référence de la requête côté serveur.
- Dans le journal du serveur (Journal (icône insecte) → Journal du serveur, chapitre 0 ; extrait réel : [`journaux/php-journal-contact.log`](journaux/php-journal-contact.log)) :
```log
2026-10-29T03:39:49.400Z INFO  php.contact.sent [req 8e07b221 · 0.6 ms] E-mail remis au serveur d’envoi de l’hébergement {"form":"n_5s081k324w","to":"re…@media-alternatif.be","from":"noreply@127.0.0.1","fields":3,"reply_to":true}
2026-10-29T03:39:49.400Z INFO  php.req.end [req 8e07b221 · 0.6 ms] Réponse 200 (contact) {"status":200,"route":"contact","mem_kb":365}
```
Avec `LOG_LEVEL = 'debug'` dans publish.php, une ligne `php.contact.start` (DEBUG) précède : formulaire, destinataire abrégé, nombre de champs.

« E-mail remis au serveur d'envoi » veut dire que PHP a accepté le message (`mail()` a répondu oui). S'il n'arrive pas, regarde d'abord les indésirables, puis l'adresse d'expéditeur `from` : chez OVH, elle doit appartenir au domaine du site (`noreply@ton-domaine`), ce qui est le cas si le site est ouvert par son vrai nom de domaine.

**Variantes**
| Situation | Ce qui change | Journal |
|---|---|---|
| Sans JavaScript (navigateur ancien, script bloqué) | la page se recharge avec le message de confirmation | serveur : `php.contact.sent` puis `php.req.end` 303 ; console (si journal allumé) : `site.form.ok` « Retour du formulaire sans JavaScript : ok » |
| Le visiteur a laissé son e-mail | l'e-mail reçu a « Répondre à » vers le visiteur | `"reply_to":true` |
| Robot (le champ caché « website » est rempli) | le robot voit « Merci. », aucun e-mail n'est envoyé | serveur : `php.contact.bot` (INFO) |

**Erreurs**
| Situation | Message affiché au visiteur | Journal | Que faire |
|---|---|---|---|
| Formulaire inconnu du serveur (site publié avant d'avoir réglé l'adresse, ou publié par .zip/GitHub sans publish.php à jour) | « Formulaire inconnu. » | console : `site.form.fail` « Refusé par publish.php : Formulaire inconnu. » ; serveur : `php.contact.unknown` (WARN) avec `known` = nombre de formulaires connus | republie depuis l'éditeur par publish.php (c'est la publication qui enregistre les adresses des formulaires) |
| Message vide | « Le message est vide. » | serveur : `php.contact.empty` (INFO) | — |
| Plus de 5 messages en une heure depuis la même adresse | « Trop de messages envoyés. Réessayez dans une heure. » | serveur : `php.contact.rate` (WARN) avec l'empreinte `who` | normal (protection contre les abus) |
| L'hébergement refuse l'envoi | « L’envoi a échoué. Réessayez plus tard. » | serveur : `php.contact.mail-fail` (ERROR) avec `to` et `from` | vérifie dans l'espace client que l'envoi d'e-mails est actif pour l'hébergement ; vérifie `from` |
| publish.php absent ou PHP en panne | « Le message n’a pas pu être envoyé » (texte choisi dans l'éditeur) | console : `site.form.fail` « Réponse illisible (publish.php absent ?) » ou « Réseau injoignable : … » | vérifie que publish.php est bien à la racine (chapitre 8, test de connexion) |

Extrait réel du formulaire inconnu, vu par le serveur ([`journaux/php-contact-inconnu.log`](journaux/php-contact-inconnu.log)) :
```log
2026-10-29T03:38:13.745Z DEBUG php.req.start [req 64807b5b · 0 ms] POST reçu {"method":"POST","who":"e184e45609","bytes":23,"ua":"node","origin":""}
2026-10-29T03:38:13.745Z WARN  php.contact.unknown [req 64807b5b · 0.2 ms] Formulaire inconnu (republiez le site depuis l’éditeur) {"form":"inconnu","known":0}
2026-10-29T03:38:13.745Z WARN  php.req.end [req 64807b5b · 0.3 ms] Réponse 404 (contact) {"status":404,"route":"contact","mem_kb":365}
```

---

## 9.3 Les autres comportements du site

| Ce que fait le visiteur | Journal (console, avec `?atelier-debug`) |
|---|---|
| Ouvre ou ferme le menu sur téléphone (☰) | `site.nav` « Menu mobile ouvert » / « fermé » |
| Ouvre une page avec une liste « à venir » ou « passés » de l'agenda | `site.list` « Liste filtrée par date » `{"when":"upcoming","today":"2026-10-29","shown":3,"total":5,"limit":0}` — `shown` = événements affichés d'après la date **de l'appareil du visiteur** |
| Clique une image d'une galerie agrandissable (ou Entrée sur la vignette) | `site.gallery` « Image agrandie » |
| Clique une vidéo ou une carte (chargées seulement au clic, pour la vie privée) | `site.facade` « Contenu externe chargé après clic » avec l'adresse sans paramètres |
| Une erreur JavaScript se produit sur la page | `site.fail` « Erreur JavaScript : … » avec le fichier et la ligne (affiché en avertissement) |

Si une liste « à venir » est vide alors qu'il y a des événements futurs, compare `today` à la date des événements : c'est la date de l'appareil qui compte, pas celle du serveur.

---

## 9.4 Le serveur et la collaboration

publish.php sert aussi de boîte aux lettres chiffrée pour démarrer une session de collaboration (chapitre 10). Il ne peut pas lire les messages. Ses lignes :

| Code (serveur) | Niveau | Sens |
|---|---|---|
| `php.signal.post` | DEBUG | message chiffré déposé (salle abrégée à 8 caractères, expéditeur, destinataire, taille) |
| `php.signal.get` | DEBUG | relève des messages d'un participant (une par seconde pendant la mise en relation) |
| `php.signal.expired` | DEBUG | salle inactive depuis 15 minutes effacée |
| `php.signal.invalid` | WARN | message refusé : salle, participant ou données invalides |
| `php.signal.too-big` | WARN | message de plus de 16 Ko refusé (64 Ko avant la version 5) |
| `php.signal.full` | WARN | plus de 100 salles ouvertes en même temps |

Ces lignes sont DEBUG : elles n'apparaissent dans le journal du serveur que si `LOG_LEVEL` vaut `'debug'`, mais elles arrivent toujours dans le journal du navigateur avec la trace (TRACE pour les relèves).

---


## 9.5 Vie privée et en-têtes du site publié

**Ce que le visiteur ne subit pas** : aucun cookie, aucun script ni police chargés chez un tiers (les polices sont dans `assets/fonts/`, vérifié par les tests : une page servie ne contacte que son propre hôte), vidéos et cartes chargées seulement au clic. Le `.htaccess` (chapitre 8.8) ajoute les en-têtes de sécurité.

**Formulaire et consentement** : la case « J’accepte… » est obligatoire ; publish.php v5 refuse aussi un envoi sans elle (`consent_required`, HTTP 400) — un robot qui contourne le navigateur n'envoie donc rien. L'e-mail reçu se termine par « Consentement donné. ».

| Situation | Message au visiteur | Journal |
|---|---|---|
| Case non cochée | le navigateur signale la case et n'envoie rien | — |
| Envoi forgé sans la case | « Cochez la case de consentement pour envoyer le message. » | serveur `php.contact.no-consent` (INFO) |

**Collaboration (publish.php v5)** : chaque dépôt dans la boîte aux lettres porte une **preuve** dérivée du secret de la session (que seuls les invités ont, par leur lien) ; le serveur la vérifie sans jamais connaître le secret. Messages de 16 Ko au plus, 2 Mo par salle, 200 messages par quart d'heure et par adresse (empreinte, jamais l'adresse en clair).

| Code (serveur) | Niveau | Sens |
|---|---|---|
| `php.signal.denied` | WARN | dépôt sans preuve ou avec la preuve d'une autre salle (403) |
| `php.signal.rate` | WARN | trop de messages depuis la même adresse (429) |
| `php.signal.room-full` | WARN | salle pleine, 2 Mo (429) |

---

## 9.6 Galerie agrandie (lightbox) au clavier et au lecteur d'écran

**But** : que l'agrandissement d'une image de galerie soit utilisable sans souris (cycle 33).

**Étapes** (côté visiteur)
1. Tab jusqu'à une vignette, **Entrée** : l'image s'ouvre en grand dans une fenêtre modale (`aria-modal="true"`, le reste de la page devient inactif).
2. Le focus est sur le bouton **✕** visible en haut à droite, libellé « Fermer » dans la langue de la page ; Tab reste sur ce bouton (le focus ne part pas derrière la fenêtre).
3. **Échap**, Entrée sur ✕, ou un clic n'importe où ferment l'image ; le focus revient à la vignette.

**Ce que tu vois** : l'image sur fond sombre, un rond blanc ✕ ; le journal du site (`?atelier-debug`) note `site.gallery`.

---

## Codes de ce chapitre
| Code | Niveau | Sens |
|---|---|---|
| `php.contact.bot` | INFO | (serveur) robot détecté, rien n'est envoyé |
| `php.contact.empty` | INFO | (serveur) message vide refusé |
| `php.contact.mail-fail` | ERROR | (serveur) l'hébergement refuse l'envoi |
| `php.contact.rate` | WARN | (serveur) trop de messages de la même adresse |
| `php.contact.sent` | INFO | (serveur) e-mail remis au serveur d'envoi |
| `php.contact.start` | DEBUG | (serveur) message de contact reçu |
| `php.contact.unknown` | WARN | (serveur) formulaire inconnu |
| `php.signal.expired` | DEBUG | (serveur) salle effacée |
| `php.signal.full` | WARN | (serveur) trop de salles |
| `php.signal.get` | DEBUG | (serveur) relève des messages |
| `php.signal.invalid` | WARN | (serveur) message de signalisation refusé |
| `php.signal.post` | DEBUG | (serveur) message déposé |
| `php.signal.too-big` | WARN | (serveur) message trop grand |
| `site.boot` | INFO | page chargée |
| `site.facade` | INFO | vidéo ou carte chargée après clic |
| `site.fail` | WARN | erreur JavaScript sur le site |
| `site.form.fail` | WARN | envoi du formulaire en échec |
| `site.form.ok` | INFO | message envoyé |
| `site.form.submit` | INFO | envoi du formulaire |
| `site.gallery` | INFO | image agrandie |
| `site.list` | INFO | liste de l'agenda filtrée par date |
| `site.nav` | INFO | menu mobile ouvert ou fermé |
| `php.contact.no-consent` | INFO | (serveur, v5) envoi sans la case de consentement refusé |
| `php.signal.denied` | WARN | (serveur, v5) preuve de salle absente ou fausse |
| `php.signal.rate` | WARN | (serveur, v5) trop de messages de signalisation de la même adresse |
| `php.signal.room-full` | WARN | (serveur, v5) salle de signalisation pleine (2 Mo) |
