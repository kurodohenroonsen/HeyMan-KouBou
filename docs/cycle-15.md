# Cycle 15 — IA locale (Gemini Nano) et référencement complet

## Recherche (résumé, voir aussi 04-recherche-ia-locale.md)
- **Stables** : Prompt API (`LanguageModel`, Chrome 148, texte + image + son en entrée, réponse forcée par schéma JSON `responseConstraint`), Summarizer, Translator, Language Detector (Chrome 138).
- **Essai développeur** (activables par Kudoro) : `chrome://flags/#writer-api`, `#rewriter-api` (« Enabled Multilingual » pour le français), `#proofreader-api`, puis relancer Chrome. État du modèle : `chrome://on-device-internals`.
- `availability()` : `unavailable`, `downloadable`, `downloading`, `available`. Le premier `create()` d'un modèle à télécharger doit suivre un geste de la personne (clic, touche).
- Gemini Nano : anglais, japonais, espagnol, allemand, français — **pas le néerlandais** (passer par Translator). Les consignes de longueur sont approximatives : mesurer et couper dans le code. Indiquer `expectedInputs` / `expectedOutputs` avec les langues, sinon les réponses sont moins fiables.
- Google : titre ≈ 50–60 caractères, description ≈ 70–160 (coupée au-delà), un seul H1, texte alternatif des images, liens au texte explicite, données structurées (Organization, BreadcrumbList), balises de partage Open Graph et Twitter, `noindex` pour les pages à ne pas indexer, `hreflang` et sitemap (déjà faits).

## Spécification (écrite avant les tests)

### Référencement (core/seo.js, sans IA, toujours disponible)
- Par page et par langue : **titre pour Google** (facultatif, sinon « Titre – Nom du site »), **description**, **mot-clé principal**, **image de partage**, **ne pas indexer**.
- Analyse par page et par langue, note sur 100 et liste de points (bien, à améliorer, problème), chacun avec « Aller à » quand il vise un élément :
  titre (présent, longueur, unique), description (présente ou automatique, longueur, unique), un seul H1, ordre des titres, mot-clé (dans le titre, la description, le H1, l'adresse, le début du texte), quantité de texte (< 150 mots), images sans texte alternatif ou au nom de fichier non parlant, liens au texte vague (« cliquez ici », « ici », « lire la suite » répété), page sans aucun lien interne vers elle (hors menu), adresse trop longue, traductions manquantes du titre et de la description, page non indexée.
- Points du site : adresse du site (canonique, sitemap), titres ou descriptions en double, logo pour Google, réseaux sociaux.
- Publication : `<title>` et description pour Google ; `og:type`, `og:url`, `og:site_name`, `og:image` (image de partage, sinon première image de la page), `twitter:card` ; `robots noindex` (et page retirée du sitemap) ; JSON-LD **Organization** + **WebSite** sur l'accueil (logo, réseaux sociaux du widget Réseaux), **BreadcrumbList** sur les autres pages et les pages d'éléments.

### IA locale (core/ai-tasks.js + editor/ai.js)
- Fournisseur abstrait : Prompt API (obligatoire pour l'IA), et si disponibles Summarizer, Rewriter, Writer, Proofreader, Translator, Language Detector. Chaque tâche utilise l'API dédiée si elle est là, sinon la Prompt API avec un schéma JSON. Un faux fournisseur sert aux tests.
- Tâches : **reformuler** (plus court, plus simple / langage clair, plus formel, plus chaleureux, plus long), **corriger** (corrections positionnées), **description pour Google**, **titre pour Google**, **mots-clés**, **texte alternatif d'une image** (l'image va au modèle localement), **meilleur texte de lien**.
- Sorties toujours vérifiées : texte sans balises, longueurs coupées proprement (description ≤ 160, titre ≤ 60, alt ≤ 125, sans « Image de… »), corrections retrouvées dans le texte d'origine (sinon ignorées), mots-clés dédoublonnés. Tout ce que l'IA écrit est marqué « à relire » (même filtre que les traductions automatiques) et s'annule par Ctrl+Z.
- Langues : FR, DE, EN directement ; **NL** : rédigé en français puis traduit (Translator) pour les descriptions, titres et textes alternatifs ; reformuler et corriger en NL : message clair « pas encore disponible ».

### Éditeur
- **✨ IA locale** (barre du haut) : état de chaque API, bouton de téléchargement avec progression, réglages Chrome à activer (copiables) pour les API en essai, rappel : rien ne quitte l'ordinateur.
- **✨ dans la barre de mise en forme** (texte en cours d'édition) : sur la sélection, ou le paragraphe : plus court, plus simple, plus formel, plus chaleureux, plus long, corriger. Proposition affichée, « Remplacer » ou « Annuler » ; la mise en forme du reste du texte est gardée.
- **🔎 Référencement** : pages et notes ; aperçu Google et aperçu de partage ; champs ; liste des points ; ✨ proposer le titre, la description, des mots-clés (cliquer pour choisir), les textes alternatifs manquants ; ✨ « compléter toutes les descriptions manquantes » de la langue affichée.
- Inspecteur d'une image : **✨ Décrire l'image**.
- Ctrl+K : « Référencement », « IA locale ».
- Sans IA disponible : tout le référencement reste là ; les boutons ✨ expliquent comment l'activer.

## Livré
- **Référencement** (`core/seo.js`) : titre pour Google, description, mot-clé principal (par langue), image de partage, « ne pas indexer » ; analyse par page et par langue avec note sur 100 et points classés (problème, à améliorer, conseil, bien) ; points du site (adresse, logo, réseaux sociaux) ; titres et descriptions en double ; pages orphelines ; liens au texte vague ; images sans texte alternatif ou au nom de fichier ; mot-clé dans le titre, la description, le H1, l'adresse et le début du texte ; traductions manquantes.
- **Publication** : `<title>` réglable, `og:type`, `og:url`, `og:site_name`, `og:image` (image de partage, sinon image de l'élément, sinon première image), `twitter:card`, `robots noindex` (et sitemap sans ces pages), JSON-LD Organization (logo, réseaux) + WebSite sur l'accueil, BreadcrumbList sur les autres pages et les pages d'éléments.
- **IA locale** (`core/ai-tasks.js` + `editor/ai.js`) : API dédiées de Chrome quand elles sont là (Summarizer, Rewriter, Proofreader — y compris en essai développeur), sinon Prompt API avec schéma JSON ; tâches reformuler (5 modes), corriger, description, titre, mots-clés, texte alternatif (image donnée au modèle localement), texte de lien ; sorties nettoyées et coupées proprement ; néerlandais rédigé en français puis traduit.
- **Éditeur** : bouton ✨ (état de chaque API, téléchargement avec progression, réglages Chrome à copier pour Rewriter, Writer, Proofreader) ; ✨ dans la barre de mise en forme (sur la sélection ou le paragraphe ; proposition, puis Remplacer ou Annuler ; corrections surlignées et appliquées à l'endroit exact, mise en forme gardée) ; 🔎 SEO (aperçu Google et partage, champs avec compteurs, ✨ proposer titre / description / idées de mots-clés, ✨ décrire les images manquantes, ✨ compléter toutes les descriptions manquantes de la langue, « Aller à ») ; ✨ Décrire l'image dans l'inspecteur ; Ctrl+K « Référencement » et « IA locale ».
- Tout texte écrit par l'IA est marqué « à relire » (tableau des traductions, filtre « à relire ») et s'annule en une fois par Ctrl+Z.
- Adresses accentuées affichées lisiblement (punycode décodé : www.média-alternatif.be).

## Corrigé en cours de route
- Ctrl+Z après une proposition de l'IA n'annulait que la marque « à relire » (étape séparée) : marque et texte forment désormais une seule étape.
- « Compléter les descriptions » en NL ignorait les pages dont la description française servait de repli : la langue doit maintenant avoir sa propre description.
- Les anciennes fonctions de description (panneau Pages, traductions) écrasaient les nouveaux réglages de référencement : elles les gardent.

## Tests
- Unitaires : 275 (dont 16 nouveaux) : réglages et analyse du référencement, publication (Open Graph, Twitter, noindex, sitemap, Organization, WebSite, BreadcrumbList), punycode, tâches d'IA avec faux fournisseur (API dédiée ou Prompt API, nettoyage, coupures, corrections retrouvées ou ignorées, néerlandais par traduction, réponses illisibles, IA absente).
- Bout en bout : 395 au total (cycles 2 à 15 au vert), dont 32 nouveaux, avec un faux Gemini Nano injecté dans la page (fenêtre ✨, téléchargement, reformuler et corriger dans la page, Ctrl+Z, décrire une image, référencement de bout en bout, NL, noindex, sans IA, site publié).
- Pas de vrai Gemini Nano dans l'environnement de test : à essayer dans ton Chrome (✨ indique l'état réel de chaque API).
