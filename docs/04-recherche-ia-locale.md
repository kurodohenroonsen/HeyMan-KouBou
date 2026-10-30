# Recherche — l'IA locale de Chrome (Gemini Nano) dans Atelier

État vérifié fin octobre 2026 sur la documentation Chrome for Developers.

## Ce qui existe dans Chrome
| API | État sur le web | Ce qu'elle fait | Utile pour Atelier |
|---|---|---|---|
| Translator | Stable (Chrome 138) | Traduction entre deux langues, modèles téléchargés par paire | Déjà utilisée (cycle 11) ; seule voie pour le néerlandais |
| Language Detector | Stable (138) | Langue d'un texte, avec un indice de confiance | Repérer un texte collé dans la mauvaise langue |
| Summarizer | Stable (138) | Résumés : points clés, tl;dr, accroche, titre ; 3 longueurs | Descriptions pour Google, chapô des actualités, résumé des commentaires |
| **Prompt API** (`LanguageModel`) | **Stable (148)** | Gemini Nano en direct ; **entrée texte, image et son** ; sortie texte ; **réponse forcée au format JSON (`responseConstraint`)** ; sessions, clonage, suivi du contexte | Presque tout le reste (voir ci-dessous) |
| Writer, Rewriter | Essai développeur (drapeaux) | Écrire, reformuler (ton, longueur) | À reproduire avec la Prompt API |
| Proofreader | Essai développeur | Corrections avec positions dans le texte | À reproduire avec la Prompt API + schéma JSON |
| WebMCP | Essai d'origine (Chrome 149) | Le site déclare des « outils » que les agents du navigateur appellent | Rendre Atelier pilotable par un agent, proprement |

Contraintes :
- **Ordinateur seulement** : Windows 10/11, macOS 13+, Linux, Chromebook Plus. Pas Android ni iOS.
- **Matériel** : au moins 22 Go libres sur le disque du profil Chrome (le modèle est effacé sous 10 Go), et soit une carte graphique avec plus de 4 Go de mémoire, soit 16 Go de mémoire vive et 4 cœurs.
- **Téléchargement** : une seule fois, sur une connexion illimitée ; ensuite tout fonctionne **hors ligne**.
- **Langues de Gemini Nano** : anglais, japonais, espagnol, allemand, français. **Pas le néerlandais.** Pour le NL, on rédige en français puis on passe par Translator, qui gère le néerlandais.
- Pas dans les Web Workers, pas dans les iframes d'une autre origine sans autorisation. Aucune version de modèle garantie : il faut vérifier chaque réponse (schéma JSON, assainissement).

Pourquoi c'est taillé pour Atelier : gratuit (pas de clé, pas de coût par mot), **rien ne quitte l'ordinateur** (important pour des médias et des journalistes), cohérent avec « Mode Avion ou rien » une fois le modèle téléchargé, aucune dépendance à ajouter.

## Idées, de la plus utile à la plus ambitieuse

### A. Écrire mieux, sans quitter la page
1. **✨ dans la barre de mise en forme** (sélection d'un texte) : plus court, plus simple (langage clair / facile à lire), plus formel, plus chaleureux, corriger les fautes. Réponse proposée à côté, acceptée ou refusée ; marquée « à relire » comme les traductions automatiques. Corrections affichées comme un correcteur (positions renvoyées en JSON).
2. **Description pour Google** de chaque page et de chaque élément de collection (Summarizer, ≤ 155 caractères), en FR/DE/EN, puis le NL par Translator.
3. **Textes alternatifs des images** : l'image est envoyée au modèle **localement**, il propose une description courte. Le contrôle avant export « image sans description » gagne un bouton « ✨ Proposer ». Gros gain d'accessibilité.
4. **Contrôle avant export enrichi** : liens « cliquez ici », boutons vagues, titres trop longs, phrases difficiles, ton incohérent d'une page à l'autre. Remarques proposées, jamais appliquées seules.

### B. Contenus intelligents (collections)
5. **Photo d'une affiche → événement d'agenda** : titre, date, heure, lieu, description, lus sur l'image et rangés dans le formulaire (schéma JSON = les champs de la collection). Idéal pour le MAB : un membre photographie son flyer.
6. **Texte libre ou e-mail collé → éléments** : « voici nos 12 médias membres… » devient 12 fiches (nom, ville, type).
7. **Chapô automatique** des actualités (Summarizer, accroche) et titres alternatifs.
8. **Résumé de la relecture** : « Laurent a fait 7 remarques, 3 sur la page Contact » (Summarizer, points clés), et liste de tâches.

### C. Concevoir plus vite
9. **Palette depuis le logo** : l'image du logo → 6 couleurs proposées en JSON, **vérifiées** par notre module de contraste avant d'être proposées.
10. **Créer une page en décrivant ce qu'on veut** : « une page pour présenter notre radio, avec horaires et contact » → plan de sections choisies **uniquement** parmi nos modèles et widgets (schéma JSON), textes de départ, tout annulable par Ctrl+Z.
11. **Commandes en langage naturel** dans Ctrl+K : « mets les titres de cette page en rouge », « ajoute une FAQ de 3 questions sur l'adhésion ». Le modèle choisit parmi une **liste fermée d'actions** déjà existantes (nos commandes), avec aperçu puis confirmation. Pas de code généré, pas de risque.

### D. Ouvrir Atelier aux agents (WebMCP, essai Chrome 149)
12. Déclarer les actions d'Atelier comme **outils** (ajouter une section, modifier un texte, traduire une page, vérifier, publier avec confirmation) : un agent du navigateur (Gemini dans Chrome, et d'autres à venir) les appelle directement au lieu de cliquer à l'aveugle. Dans la lignée de tes projets multi-agents.

### E. Au-delà de Chrome — écarté (décision du 29/10/2026 : tout reste local, Gemini Nano dans le navigateur)
- **Fournisseur local au choix** : un serveur de modèles sur la machine ou le réseau (type Ollama / LM Studio, compatible OpenAI, sur `localhost`), par exemple ta machine LLM sur le Mac. Il couvrirait le néerlandais, Firefox et Safari, et des modèles plus gros. Même interface dans Atelier, même règle : rien ne part dans le nuage.

## Principes à tenir
- **Amélioration progressive** : chaque bouton ✨ n'apparaît que si `availability()` le permet. Le téléchargement est expliqué et demandé (taille, une seule fois), avec une barre de progression. Sans IA, Atelier reste complet.
- **Humain dans la boucle** : toujours une proposition, jamais une modification silencieuse ; tout passe par l'historique (Ctrl+Z) ; textes marqués « à relire ».
- **Sorties vérifiées** : schémas JSON stricts, puis nos assainisseurs (texte, texte riche, liens, couleurs) ; valeurs de style validées par `style.js` ; dates par `collections.js`.
- **Testable** : un faux `LanguageModel` injecté dans les tests (comme le faux traducteur du cycle 11), pour des tests de bout en bout déterministes.

## Proposition de cycles
| Cycle | Contenu |
|---|---|
| **15 — IA locale : socle et rédaction** ✅ (avec le référencement complet) | Détection et téléchargement accompagné ; service `ai.js` (Prompt, Summarizer, Detector, Translator, avec faux pour les tests) ; ✨ reformuler / simplifier / corriger dans la page ; descriptions Google ; textes alternatifs des images ; NL par traduction |
| **16 — Journal de débogage et guide d'utilisation** ✅ | Journal complet navigateur + publish.php v4 + site publié, guide avec les journaux attendus (voir `docs/cycle-16.md`) |
| **17 — Contenus intelligents** ✅ | Affiche photographiée → événement ; texte collé → éléments ; chapô ; résumé de la relecture ; palette depuis le logo |
| **18 — Demander à Atelier** ✅ | Commandes en langage naturel (liste fermée d'actions, aperçu, annulable) ; page créée depuis une description |
| **19 — Banc d’essai de l’IA locale** ✅ | Décision de Kudoro (29/10/2026) : **tout reste local, Gemini Nano dans le navigateur** (pas de serveur de modèles, pas d’agent externe). Chaque tâche testée sur des exemples fixes dans le vrai Chrome, rapport à copier (voir `docs/cycle-19.md`). |

## Sources
- Built-in AI APIs (statut) — https://developer.chrome.com/docs/ai/built-in-apis
- Prompt API — https://developer.chrome.com/docs/ai/prompt-api
- Summarizer API — https://developer.chrome.com/docs/ai/summarizer-api
- Writer API — https://developer.chrome.com/docs/ai/writer-api
- Rewriter API — https://developer.chrome.com/docs/ai/rewriter-api
- Proofreader API — https://developer.chrome.com/docs/ai/proofreader-api
- Markus Nissl, « Contracts, Not Prompts » (état au 13/09/2026) — https://www.markusnissl.com/blog/chrome-built-in-ai-apis
- WebMCP, essai d'origine Chrome 149 — https://ppc.land/chrome-149-origin-trial-puts-webmcp-in-developers-hands-at-last/
