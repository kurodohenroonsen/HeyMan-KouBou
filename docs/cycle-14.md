# Cycle 14 — Relecture et édition à plusieurs (pair-à-pair)

## Recherche (résumé)
- **Figma** (« How Figma's multiplayer technology works ») : pas d'OT ; chaque propriété de chaque objet est un registre « le dernier qui écrit gagne » ; deux personnes qui changent des propriétés ou des objets différents ne se gênent jamais ; deux modifications simultanées du même texte : une des deux valeurs entières gagne (jugé acceptable pour un outil de mise en page) ; identifiants d'objets créés par chaque client ; à la reconnexion, on récupère l'état et on rejoue ses changements faits hors ligne ; « annuler » n'annule que ses propres changements.
- **CRDT** : Yjs fusionnerait aussi le texte caractère par caractère, mais c'est une dépendance (Atelier n'en a aucune) et un éditeur de pages a surtout des propriétés. On garde l'idée CRDT là où elle sert : registres LWW avec horloge logique hybride (convergence garantie sans serveur), éléments identifiés, ordre des listes, suppressions qui gagnent.
- **WebRTC sans serveur de données** : un canal de données chiffré (DTLS) entre navigateurs. Il faut seulement échanger une offre et une réponse (« signalisation ») : soit en copier-coller, soit par une boîte aux lettres minuscule. Vérifié ici : deux navigateurs isolés se connectent en local sans serveur STUN.
- **Web Reviewer** : relecture pair-à-pair d'un site ; on reprend l'esprit (commentaires posés sur la page, partagés sans base de données) en l'intégrant à l'éditeur.

## Spécification (écrite avant les tests)

### Synchronisation (core/collab.js)
- Le projet est un document JSON. Chaque modification locale est comparée à l'état précédent et devient une liste d'opérations : valeur d'une propriété, élément ajouté ou supprimé (repéré par son identifiant : `id`, `key` ou `value`), ordre d'une liste.
- Chaque opération porte un horodatage logique hybride (heure, compteur, participant). Une opération reçue ne s'applique que si elle est plus récente que celle déjà connue pour ce chemin : tout le monde converge vers le même état, quel que soit l'ordre d'arrivée.
- Listes : ajouts simultanés gardés tous les deux, ordre déterministe ; suppression d'un élément plus récente que sa création : supprimé partout, même si quelqu'un modifiait l'intérieur.
- Reprise : chaque participant garde la table des versions ; à la reconnexion, on échange seulement ce qui manque, dans les deux sens (modifications hors ligne fusionnées).
- « Annuler » n'annule que ses propres modifications (l'historique est mis à jour avec celles des autres).
- Sécurité : chemins dangereux refusés (`__proto__`…), images reçues vérifiées, partie `collab` jamais synchronisée.

### Identité, invitations, commentaires signés (core/review.js)
- Chaque personne a une clé ECDSA P-256 créée dans son navigateur (identifiant `did:key:zDn…`, empreinte courte affichée). La clé privée ne quitte jamais l'appareil.
- Session : un secret aléatoire (dans le lien, après `#`, jamais envoyé au serveur) ; identifiant de salle = SHA-256 du secret.
- Invitation = lien signé par la personne qui ouvre la session : rôle (**éditeur** ou **relecteur**), salle, expiration. À la connexion, chacun prouve qu'il possède sa clé (défi signé) et présente son invitation.
- Relecteur : ne peut que commenter. Les opérations qu'il envoie hors de la relecture sont refusées par les autres, même avec un éditeur modifié.
- Commentaire : posé sur un élément d'une page (ou d'une carte, d'un composant…), texte, auteur, date, **signature** ; réponses signées ; résolu / rouvert ; supprimé par son auteur ou un éditeur. Signature vérifiée à l'affichage (✓ signé, ⚠ signature invalide). Les commentaires ne sont jamais publiés sur le site.

### Connexion (pair-à-pair, en étoile)
- La personne qui ouvre la session est le point central ; les autres se connectent à elle en WebRTC. Les données passent directement entre navigateurs (chiffrées), sans serveur.
- Signalisation, au choix : par `publish.php` (boîte aux lettres temporaire de messages **chiffrés** avec la clé de session : le serveur ne voit ni le contenu ni la clé ; 15 min, taille et débit limités) ou **manuelle** (deux codes à copier-coller, utilisable sans aucun serveur).
- Messages découpés en morceaux (canal limité à 256 Ko par message) : le projet complet, images comprises, passe à la première connexion.

### Éditeur
- Bouton **👥** : votre nom, démarrer la session, liens d'invitation éditeur et relecteur, participants connectés, arrêter. Lien `#join=…` : fenêtre « Rejoindre » (une version de sécurité de son propre projet est enregistrée avant).
- Présence : pastilles des participants dans la barre du haut ; l'élément sélectionné par chacun encadré à sa couleur avec son nom ; message dans l'inspecteur si quelqu'un d'autre travaille sur le même élément.
- Mode relecture : la page se consulte et se sélectionne, rien ne se modifie ; bandeau « Mode relecture ».
- **💬 Commentaires** : panneau (cette page / tous / ouverts), commenter l'élément sélectionné, répondre, résoudre, aller à l'élément, pastilles numérotées dans la page. Fonctionne aussi sans session (notes pour soi, exportées avec le projet).
- Une modification reçue pendant qu'on écrit dans la page n'interrompt pas la saisie.

## Livré
- **Synchronisation** (`core/collab.js`) : différences en opérations, registres « le dernier qui écrit gagne » avec horloge logique hybride, éléments repérés par `id` / `key` / `value`, ordre des listes, suppressions qui gagnent, reprise par échange des tables de versions, opérations vérifiées (chemins dangereux, images, partie privée), annuler qui ne retire que ses propres modifications (l'historique reçoit celles des autres).
- **Identité et relecture** (`core/review.js`) : clé ECDSA P-256 créée dans le navigateur (`did:key:zDn…`), salles (secret dans le lien, identifiant SHA-256), invitations signées (rôle, salle, expiration 7 jours), preuve de possession de la clé, commentaires et réponses signés, vérification des signatures et des auteurs à la réception, chiffrement AES-GCM des messages de mise en relation.
- **Protocole** (`core/collab-protocol.js`) : étoile autour de l'hôte, hello / auth / sync / snapshot / delta / ops / presence, relais par l'hôte, rôle relecteur limité aux commentaires, messages découpés en morceaux et réassemblés, traitement des messages dans l'ordre, salut renvoyé tant que l'autre n'a pas répondu.
- **publish.php version 3** : boîte aux lettres de signalisation (messages chiffrés, salle de 64 caractères hexadécimaux, 64 Ko par message, 200 messages gardés, 15 minutes, 100 sessions au plus, fichiers protégés).
- **Éditeur** : bouton 👥 (nom, clé, démarrer, liens éditeur et relecteur, connexion par codes, participants, fermer ; reprise après rechargement), fenêtre « Rejoindre » sur un lien `#join=…` (une version de sécurité d'abord), pastilles des participants (clic : aller où ils travaillent), cadre coloré sur l'élément sélectionné par chacun, message « Ana travaille aussi sur… » dans l'inspecteur, mode relecture (rien ne se modifie, bandeau), modifications reçues sans interrompre une saisie (page et inspecteur), bouton 💬 avec le nombre de commentaires ouverts, panneau (cette page, ouverts, tous ; commenter l'élément sélectionné, répondre, résoudre, supprimer, aller à l'élément ; ✓ signé / ⚠), pastilles numérotées dans la page.
- Canal WebRTC : flux contrôlé (pas de saturation de la mémoire tampon avec un gros projet), messages reçus avant la mise en place gardés en attente. STUN réglable (par défaut celui de Google, vide = réseau local seulement).

## Limites connues (choisies)
- Deux personnes qui écrivent en même temps dans le même texte : la dernière version entière gagne (comme Figma). La présence montre qui travaille sur quel élément, ce qui évite la plupart des collisions.
- Listes sans identifiant (questions d'un accordéon, images d'une galerie) : la liste entière est la valeur ; deux modifications simultanées de la même liste, la dernière gagne.
- L'hôte doit rester connecté : il relaie les modifications. S'il recharge la page, « Reprendre la session » rouvre la même salle et les invités se reconnectent avec les mêmes liens.
- Sans serveur STUN joignable, la connexion directe ne passe qu'en réseau local ; certains réseaux d'entreprise bloquent WebRTC (il faudrait un relais TURN).

## Corrigé en cours de route
- Le premier message d'un canal tout juste ouvert se perdait parfois (connexion bloquée une fois sur deux en test) : les messages arrivés avant la mise en place sont gardés et le salut est renvoyé.
- Messages traités dans le désordre pendant la vérification (asynchrone) des signatures : traitement en file par lien.
- Bug du cycle 11 trouvé en regardant les captures : une règle CSS de la fenêtre des traductions (`.i18n`) élargissait aussi les champs multilingues de l'inspecteur et de la fenêtre des contenus à 1280 px (texte coupé à droite) ; limitée à la fenêtre.
- Un lien `#join=…` ouvert dans un onglet déjà ouvert ne déclenchait rien (changement d'ancre sans rechargement) : géré.

## Tests
- Unitaires : 259 (dont 27 nouveaux) : horloge, différences, application par copie du chemin, convergence (propriétés, même propriété, ajouts simultanés, suppression contre modification, 300 modifications aléatoires entre 3 participants livrées dans le désordre), reprise hors ligne, annuler en collaboration, opérations refusées, découpage des messages, protocole complet avec liens en mémoire (invitations, relecteur, commentaire falsifié, invitation trafiquée, reconnexion, présence, premier message perdu), identités, invitations, commentaires signés, chiffrement, boîte aux lettres du vrai publish.php.
- Bout en bout : 363 au total (cycles 2 à 14 au vert), dont 30 nouveaux avec **trois navigateurs isolés reliés en vrai WebRTC** : invitation, projet reçu, modifications dans les deux sens, présence, annuler, relecteur (Suppr sans effet, commentaire signé relayé, pastille, résolution), coupure puis reprise avec une modification faite hors ligne, connexion par codes sans aucun serveur. Cinq passages de suite au vert après correction.
