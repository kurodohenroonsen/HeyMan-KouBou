# Cycle 9 — Composants et structure du site

## Spécification (écrite avant les tests)

### Composants
- `site.components[id] = { id, name, node }` : un bloc (section, rangée, colonne ou widget) réutilisable.
- Une **instance** est un nœud `{ type: <type du bloc>, ref: id }` placé dans une page : elle affiche le composant et se met à jour partout quand on le modifie.
- Créer depuis la sélection (le bloc est remplacé par une instance), insérer depuis le panneau Modèles, **modifier le composant** (mode d'édition dédié, bandeau explicite, Terminer), détacher une instance (elle redevient une copie indépendante), renommer, supprimer (les instances deviennent des copies : rien ne disparaît des pages).
- Dans la page, l'intérieur d'une instance n'est pas sélectionnable (on sélectionne l'instance ; double-clic = modifier le composant).
- Un composant ne peut pas s'inclure lui-même (garde-fou anti-boucle).

### En-tête et pied de page en blocs
- `site.layout = { header: node | null, footer: node | null }`. `null` = en-tête/pied par défaut.
- « Personnaliser l'en-tête » crée un en-tête modifiable : widgets **Logo du site**, **Menu**, **Choix de langue** (utilisables aussi ailleurs). Même mécanisme d'édition que les composants (double-clic sur l'en-tête dans la page).

### Menu
- `site.menu = null` (automatique : toutes les pages) ou une liste d'entrées `{ id, kind: 'page' | 'link', pageId | url, label, newTab, children }`, un niveau de sous-menu.
- Panneau Pages → Menu : passer en menu personnalisé, ajouter un lien, monter/descendre, mettre en sous-menu / remonter, renommer (par langue), retirer. Une page supprimée disparaît du menu.
- Rendu : liens relatifs justes dans chaque langue, `aria-current`, sous-menus visibles au survol et au clavier (`:focus-within`).
- **Menu mobile** : bouton « Menu » (hamburger) accessible (`aria-expanded`, `aria-controls`) ; sans JavaScript, le menu reste visible.

### Popups
- Un bouton peut ouvrir un composant dans une fenêtre : lien `popup:<id>`. Rendu avec l'API Popover native (`popovertarget`) : **aucun JavaScript**, fermeture par Échap, bouton Fermer, fond assombri.
- La fenêtre n'est ajoutée qu'une fois par page, seulement si elle est utilisée.

### Sémantique et accessibilité
- Balise de section : section, div, aside, article, nav, header, footer.
- Onglet Avancé : libellé accessible (`aria-label`) traduisible.

## Livré
- **Composants** : clic droit → « Créer un composant… » (ou onglet Avancé, ou Ctrl+K). Panneau Modèles → « Mes composants » : cliquer ou glisser pour réutiliser, renommer, voir le nombre d'utilisations, supprimer. Double-clic sur une instance → mode « modifier le composant » (bandeau violet « N utilisations suivront », Terminer) ; Ctrl+Z fonctionne. Onglets Style et Avancé de l'instance : marges, ancre propres à cette utilisation. « Détacher » en fait une copie indépendante.
- **En-tête et pied de page en blocs** : panneau Site → « Personnaliser avec des blocs » (logo, menu, langues ; pied : logo, texte, menu en colonne, réseaux sociaux). Pendant la modification, la page est grisée et verrouillée. « Revenir au défaut » à tout moment. Double-clic sur l'en-tête personnalisé dans la page = le modifier.
- **3 nouveaux widgets** (catégorie Site) : Logo du site, Menu, Choix de langue.
- **Menu** (panneau Pages) : automatique ou personnalisé ; liens externes, pages absentes à rajouter, ordre, sous-menu (⇥ / ⇤), libellés par langue indépendants du titre de la page, retour au menu automatique. Sous-menus au survol et au clavier.
- **Menu mobile** : bouton « ☰ Menu » accessible (`aria-expanded`, `aria-controls`, Échap le referme) ; sans JavaScript, le menu reste affiché. Réglable (panneau Site, ou case du widget Menu).
- **Popups** : un bouton peut « Ouvrir en fenêtre » un composant (liste « Lier à… »). API Popover native : aucun script, Échap et bouton Fermer, fond assombri.
- **Sémantique** : balises article, nav, header, footer, aside pour les sections ; libellé accessible (`aria-label`) par langue dans l'onglet Avancé.
- Contrôle avant export : bouton qui ouvre une fenêtre dont le composant a été supprimé.

## Bugs trouvés et corrigés
- **Grave** : en modifiant l'en-tête, les champs de l'onglet Contenu écrivaient dans la page au lieu de l'en-tête (le contenu de la page pouvait être remplacé). Toute écriture passe maintenant par un seul point (`siteWithRoot`).
- Les presets ne fonctionnaient pas dans un composant ou l'en-tête.
- Une instance pouvait recevoir des éléments déposés (ignorés au rendu) : refusé désormais.
- Mobile : le bouton « Menu » de l'en-tête en blocs était coupé ; le menu ouvert sortait de l'écran à gauche (le test vérifie maintenant la position, pas seulement la visibilité).

## Tests
- Unitaires : 148 (dont 22 nouveaux : composants, garde-fou anti-boucle, édition ciblée, en-tête et pied, menu, popups, sémantique).
- Bout en bout : 30 nouveaux, 218 au total (cycles 2 à 9), 0 erreur JavaScript, y compris sur le site exporté (popup ouvert et fermé, menu mobile).
