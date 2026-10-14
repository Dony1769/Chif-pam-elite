FC CAREER --- DOSSIER OFFICIEL DE CONCEPTION ET DE RECONSTRUCTION
Academy to Legend --- Version 1.0
Date : 14 octobre 2026
1. Vision du projet
FC Career est un jeu solo de carrière footballistique destiné en priorité aux navigateurs mobiles Android. Le joueur commence dans une académie, développe ses compétences, dispute des matchs, gagne sa place, progresse vers le football professionnel, négocie ses contrats, rejoint éventuellement de nouveaux clubs, affronte des rivaux, peut représenter sa sélection nationale et construit son héritage jusqu'à la retraite.
Le jeu doit avoir sa propre identité visuelle et technique. Il ne doit pas dépendre du design du site qui l'héberge.
Le projet doit être inspiré des grands principes des modes Carrière de jeux de football modernes, notamment la progression, les rivalités, les objectifs, les contrats, les transferts et l'évolution dynamique des joueurs, sans copier les logos, les ressources graphiques ou les contenus propriétaires d'autres jeux.
Principe fondamental
Chaque action importante doit avoir une conséquence réelle dans les données du jeu.
Un entraînement doit modifier les attributs ou l'état physique selon des règles définies.
Un match doit mettre à jour le score, les statistiques, la forme, la fatigue et le calendrier.
Un contrat doit avoir des conditions et des conséquences financières.
Une promotion doit découler de performances et de critères réels.
Un bouton qui ne fait qu'afficher une animation n'est pas une fonctionnalité complète.
2. Les cinq piliers du jeu
2.1 Progression
Académie, entraînements, attributs, spécialisation, potentiel, fatigue, récupération et évolution du joueur.
2.2 Matchs
Sélection, objectifs, événements en direct, décisions tactiques, notes, statistiques et conséquences sportives.
2.3 Carrière
Coach, concurrence, contrats, agent, transferts, prêts, rivalités et sélection nationale.
2.4 Immersion
Médias, fans, relations, sponsors, événements de vie et journal autobiographique.
2.5 Héritage
Records, trophées, historique des saisons, réputation, retraite et légende personnelle.
Ces piliers doivent être développés progressivement. Il ne faut pas essayer de produire tous les systèmes simultanément.
3. Direction artistique indépendante du site
3.1 Palette de couleurs
Midnight Navy : #101820 --- fond principal.
Graphite : #19252D --- panneaux et surfaces secondaires.
Emerald : #37D99A --- actions clés et accents.
Off-white : #F1F4F6 --- texte principal.
Amber : #F5BD58 --- alertes et objectifs.
Coral : #F16B73 --- erreurs et risques.
L'émeraude doit mettre en valeur les actions importantes, la progression et certains états positifs. Ne pas dessiner un contour émeraude autour de chaque carte. Utiliser des surfaces nuancées, une hiérarchie claire et des espaces négatifs.
3.2 Règles visuelles
Pas de noir pur partout.
Pas de contours émeraude sur chaque carte.
Pas de dizaines de cartes identiques empilées.
Pas de grands espaces vides sans intention.
Pas de texte gris illisible sur fond sombre.
Pas d'animations gratuites qui ralentissent le jeu.
Pas de dépendance exclusive aux images distantes pour afficher les écrans essentiels.
À la place : compositions éditoriales, zones de score fortes, portraits ou silhouettes stylisées, panneaux de statistiques, terrains tactiques, graphiques, chronologies et transitions maîtrisées.
3.3 Motion design
Utiliser Framer Motion et les dépendances déjà installées pour créer : - transitions de navigation fluides ; - apparition progressive des sections ; - animations de score uniquement quand le score change réellement ; - chronologie de match animée ; - transitions entre avant-match, match en cours et résultat ; - progression visuelle des attributs ; - feedbacks de réussite, d'avertissement et d'erreur ; - menus et panneaux mobiles fluides.
Les animations doivent être synchronisées avec les vrais changements d'état. Respecter prefers-reduced-motion. Éviter les mouvements excessifs et les ralentissements.
3.4 Mobile-first
Aucun débordement horizontal.
Aucun texte coupé.
Boutons suffisamment grands pour le toucher.
Navigation adaptée aux petits écrans.
Tableaux convertis en dispositions mobiles lisibles.
Actions principales faciles à trouver.
Interface utilisable sur les largeurs courantes des téléphones Android.
Pas de dépendance à un survol de souris.
4. Structure technique cible
Le dossier parent à conserver est :
src/app/client/fc-career/
Le fichier suivant est le pont d'entrée existant depuis le site vers le jeu et doit être préservé :
src/app/client/fc-career/page.tsx
Avant de le modifier, l'IA doit inspecter ses imports, ses dépendances et son contrat de navigation. Si le fichier dépend de composants supprimés, elle doit adapter uniquement ce qui est nécessaire pour le relier au nouveau jeu.
Arborescence cible
src/app/client/fc-career/
├── page.tsx                         # Pont d'entrée à préserver
└── game/
    ├── app/
    │   ├── FCCareerGame.tsx
    │   ├── GameShell.tsx
    │   ├── GameRouter.tsx
    │   └── GameErrorBoundary.tsx
    ├── design/
    │   ├── tokens.css
    │   ├── game.css
    │   └── animations.ts
    ├── components/
    │   ├── Button.tsx
    │   ├── Modal.tsx
    │   ├── PlayerCard.tsx
    │   ├── StatBar.tsx
    │   ├── ProgressRing.tsx
    │   ├── Timeline.tsx
    │   ├── Pitch.tsx
    │   ├── Toast.tsx
    │   ├── LoadingState.tsx
    │   └── EmptyState.tsx
    ├── screens/
    │   ├── MainMenu.tsx
    │   ├── NewCareer.tsx
    │   ├── Academy.tsx
    │   ├── Dashboard.tsx
    │   ├── PlayerProfile.tsx
    │   ├── Training.tsx
    │   ├── MatchCenter.tsx
    │   ├── MatchResult.tsx
    │   ├── Season.tsx
    │   ├── Contracts.tsx
    │   ├── Transfers.tsx
    │   ├── Social.tsx
    │   ├── Awards.tsx
    │   ├── Journal.tsx
    │   └── Settings.tsx
    ├── domain/
    │   ├── player.ts
    │   ├── academy.ts
    │   ├── club.ts
    │   ├── match.ts
    │   ├── season.ts
    │   ├── contract.ts
    │   ├── transfer.ts
    │   ├── progression.ts
    │   ├── economy.ts
    │   └── events.ts
    ├── engine/
    │   ├── matchEngine.ts
    │   ├── ratingEngine.ts
    │   ├── progressionEngine.ts
    │   ├── trainingEngine.ts
    │   ├── seasonEngine.ts
    │   ├── aiCoach.ts
    │   ├── transferEngine.ts
    │   └── eventEngine.ts
    ├── data/
    │   ├── countries.ts
    │   ├── leagues.ts
    │   ├── clubs.ts
    │   ├── players.ts
    │   ├── positions.ts
    │   ├── playStyles.ts
    │   ├── scenarios.ts
    │   └── achievements.ts
    ├── state/
    │   ├── GameProvider.tsx
    │   ├── gameReducer.ts
    │   ├── selectors.ts
    │   └── actions.ts
    ├── persistence/
    │   ├── saveRepository.ts
    │   ├── saveSchema.ts
    │   ├── migrations.ts
    │   └── backup.ts
    ├── hooks/
    │   ├── useGame.ts
    │   ├── useSave.ts
    │   └── useReducedMotion.ts
    ├── utils/
    │   ├── formatters.ts
    │   ├── ids.ts
    │   ├── dates.ts
    │   ├── random.ts
    │   └── validation.ts
    └── tests/
        ├── unit/
        ├── integration/
        └── fixtures/
Cette arborescence est une cible, pas une obligation de créer tous les fichiers immédiatement. Ne crée pas de fichiers vides. Chaque module doit avoir une responsabilité précise.
Règles d'architecture
Les écrans affichent les données et déclenchent des actions.
Les moteurs contiennent les règles de jeu, pas les composants React.
L'état centralisé applique les actions et valide les transitions.
Le système de sauvegarde est le seul responsable de la lecture et de l'écriture des sauvegardes.
Les données fictives proviennent de fichiers de données cohérents.
Les calculs de match et de progression doivent pouvoir être testés indépendamment du navigateur.
Un seul moteur de match produit le résultat utilisé par l'ensemble du jeu.
Respecter les frontières serveur/client de Next.js pour les hooks, localStorage et les interactions navigateur.
5. Modèle de carrière : de l'académie à la légende
Étape 1 --- Académie
Développement, matchs de jeunes, évaluations, sélection et premiers recruteurs.
Étape 2 --- Transition vers le senior
Équipe réserve, entraînements avancés, premières minutes et prêt éventuel.
Étape 3 --- Premier contrat professionnel
Négociation du salaire, durée, rôle et objectifs.
Étape 4 --- Installation dans l'élite
Titularisation, rivalités, responsabilités et ambitions de club.
Étape 5 --- Sommet de carrière
Trophées, sélection nationale, distinctions et records.
Étape 6 --- Fin de carrière et héritage
Derniers contrats, évolution liée à l'âge, retraite et bilan historique.
Les âges sont des repères de conception, pas des promotions automatiques. La montée en équipe première doit dépendre de la qualité du joueur, de ses performances, des besoins du club et des décisions du coach.
Données essentielles du joueur
Chaque joueur doit avoir : - identité, âge, nationalité, pied dominant et poste ; - attributs techniques, physiques, mentaux, offensifs, défensifs et de gardien ; - note globale calculée en fonction du poste ; - potentiel et courbe d'évolution ; - forme, fatigue, moral et condition physique ; - statistiques de carrière et de saison ; - traits de personnalité et styles de jeu ; - réputation, popularité et statut dans le vestiaire ; - contrat, salaire, durée, rôle et historique de transferts ; - historique de progression, blessures, suspensions et récompenses.
Le potentiel n'est pas une promesse de progression automatique. Un joueur peut ne jamais l'atteindre. L'entraînement, le temps de jeu, les performances, l'âge et les conditions de carrière influencent son évolution.
Clubs et compétitions
Construire un univers fictif cohérent : - plusieurs pays et niveaux de championnat ; - des clubs avec identité, budget, réputation, installations et philosophie ; - des effectifs avec postes et niveaux plausibles ; - des calendriers, classements et résultats ; - des compétitions nationales et, plus tard, continentales ; - des centres de formation avec des joueurs qui progressent indépendamment du joueur principal.
Commencer avec un petit univers complet et fonctionnel plutôt qu'une grande liste de clubs sans comportement réel.
6. Systèmes de jeu
Système                             Comportement attendu
Académie                            Évaluations, entraîneurs, objectifs, matchs de jeunes, promotion
Attributs                           Progression mesurable, poste, potentiel, styles de jeu
Entraînement                        Sessions, charge, fatigue, récupération, spécialisation
Sélection                           Convocation, titularisation, remplacements, concurrence
Match                               Simulation, événements, décisions, score, statistiques
Coach                               Philosophie, confiance, rôle, temps de jeu, conversations
Vestiaire                           Cohésion, rivalités, amitiés, leadership
Agent                               Conseils, offres, négociations et objectifs de carrière
Contrats                            Salaire, durée, rôle, primes et clauses
Transferts                          Intérêt des clubs, offres, négociations, prêts et historique
Saison                              Calendrier, classement, résultats et évolution des compétitions
Santé                               Fatigue, blessures, récupération et disponibilité
Médias                              Interviews, réputation et réactions aux performances
Sponsors                            Contrats, missions, échéances et récompenses
Vie personnelle                     Événements, choix et conséquences sur la carrière
Sélection nationale                 Convocations, compétitions, objectifs et statistiques
Fans                                Popularité, soutien, rivalités et réaction aux résultats
Récompenses                         Joueur du mois, distinctions, trophées et records
Monde vivant                        Résultats des autres équipes, progression des rivaux, transferts
Journal                             Historique chronologique des événements significatifs
Retraite                            Bilan, records, titres, réputation et héritage
Défis de carrière                   Scénarios, conditions de réussite, échec et récompenses
Systèmes supplémentaires pour différencier FC Career
Rivaux évolutifs : un joueur de l'académie peut devenir un concurrent, signer ailleurs, progresser ou te retrouver en sélection.
Réputation multidimensionnelle : réputation sportive, popularité, confiance du coach et image médiatique sont distinctes.
Décisions à compromis : rester pour obtenir du temps de jeu, partir dans un club plus prestigieux, accepter un prêt ou demander une augmentation doit présenter avantages et risques.
Notes dynamiques : distinguer les attributs de fond de la note de performance momentanée.
Saisons mémorables : chaque saison produit un bilan, des records, des événements marquants et des conséquences.
Monde vivant : les clubs et les rivaux évoluent même sans contrôle direct du joueur.
Défis rejouables : chaque défi possède un état de départ, des objectifs, des conditions d'échec et des récompenses.
Les simulations doivent être reproductibles avec les mêmes données et la même graine aléatoire afin de faciliter les tests.
7. Le cœur du jeu : moteur de match
Le moteur de match doit être terminé et validé avant d'investir massivement dans les systèmes secondaires.
Déroulement obligatoire
Préparation : adversaire, tactique, fatigue et objectifs.
Validation : disponibilité, journée et état du match.
Simulation : événements ordonnés et décisions tactiques.
Résultat : score, note et statistiques individuelles.
Conséquences : progression, fatigue, blessures éventuelles et récompenses.
Sauvegarde : résultat validé une seule fois et calendrier actualisé.
Événements possibles
occasions, tirs cadrés et arrêts ;
passes décisives, dribbles et duels ;
cartons, fautes et blessures éventuelles ;
remplacements et changements tactiques ;
moments de pression, domination ou difficulté ;
actions du joueur principal selon son poste et son temps de présence.
Le moteur peut utiliser une simulation statistique et probabiliste, mais il doit respecter des invariants : score non négatif, résultat unique, minutes valides, événements ordonnés et statistiques cohérentes.
Un but affiché dans la timeline doit être répercuté sur le score. Une passe décisive doit correspondre à une action réelle de la simulation. Les statistiques ne doivent jamais être ajoutées deux fois après actualisation.
Choix tactiques
Un événement important peut proposer plusieurs décisions, par exemple : - prendre davantage de risques dans la construction ; - conserver le ballon pour calmer le match ; - attaquer l'espace derrière la défense.
Chaque choix doit avoir des effets définis sur la simulation, les risques, la fatigue ou les probabilités d'événements. L'effet doit être calculé dans le moteur, pas simplement annoncé dans le texte.
Note du joueur
La note finale doit découler des événements et des statistiques, en tenant compte du poste et du temps de jeu. Un gardien ne doit pas être noté exactement comme un attaquant. Un défenseur doit pouvoir obtenir une bonne note sans marquer.
Tests de match
Chaque match terminé possède un résultat.
Les buts correspondent au score.
Les statistiques restent dans des limites cohérentes.
La note est valide.
Le résultat ne peut pas être validé deux fois.
Les récompenses ne sont pas attribuées deux fois.
Le calendrier passe à la bonne journée.
La sauvegarde restaurée conserve le résultat.
8. Données et sauvegarde
La sauvegarde locale est acceptable pour la première version. Elle doit être versionnée, validée et récupérable.
Structure indicative : - meta : version, identifiant de carrière, dates de création et de dernière sauvegarde ; - career : âge, phase de carrière, objectifs, saison et historique ; - player : identité, attributs, état physique, progression et statistiques ; - club : club actuel, rôle, contrat et situation dans l'effectif ; - world : compétitions, calendriers, classements, rivaux et événements ; - systems : états des systèmes réellement implémentés ; - history : événements significatifs et bilans de saison.
Chaque sauvegarde possède une version de schéma. Une migration transforme les anciennes versions prises en charge. Une sauvegarde invalide doit être signalée sans écraser silencieusement une sauvegarde valide.
Les données doivent être validées à la lecture et à l'écriture. Les actions critiques, notamment la fin d'un match, doivent être idempotentes.
9. Étapes obligatoires de développement
L'IA doit suivre ces étapes dans l'ordre. Elle ne doit pas générer l'ensemble du jeu en une seule réponse ou créer tous les écrans avant d'avoir un noyau fonctionnel.
ÉTAPE 0 --- Inventaire et nettoyage contrôlé
Objectif : préserver le pont d'entrée et éviter de casser le site.
Examiner le contenu de src/app/client/fc-career/.
Lire le page.tsx existant et identifier ses imports.
Identifier les dépendances installées, les scripts, les tests et les styles globaux.
Vérifier l'état Git et les modifications non enregistrées.
Créer un point de restauration Git avant le nettoyage.
Supprimer uniquement les anciens fichiers appartenant au jeu à l'intérieur du dossier autorisé.
Ne pas supprimer page.tsx, les fichiers partagés du site, package.json, les configurations ou les dépendances communes.
Préparer le nouveau point d'entrée interne sans casser le routage.
Validation : le dossier est propre, le pont est préservé et le projet parent compile toujours.
ÉTAPE 1 --- Fondations techniques
Objectif : créer un noyau stable avant le gameplay.
Créer les types métier, le modèle de sauvegarde, les identifiants, le générateur aléatoire testable, le dépôt de sauvegarde, les migrations et le système central d'actions.
Validation : tests de création, lecture, écriture, restauration et validation des données. Aucun écran de jeu complexe à ce stade.
ÉTAPE 2 --- Design system indépendant
Objectif : construire le langage visuel avant de multiplier les écrans.
Créer les variables de couleurs, typographies, surfaces, boutons, cartes joueurs, panneaux, modales, toasts, états de chargement et animations.
Validation : une page de démonstration des composants, vérifiée sur téléphone et ordinateur, avec une identité visuelle cohérente.
ÉTAPE 3 --- Création de carrière et académie
Objectif : rendre le début de carrière jouable.
Créer le menu principal, la création du joueur, le choix du pays, du poste et du style, le choix de l'académie, la fiche joueur, les attributs initiaux et le premier calendrier.
Validation : un nouvel utilisateur peut créer une carrière, fermer la page, revenir et retrouver son joueur.
ÉTAPE 4 --- Entraînement et progression
Objectif : donner au joueur des décisions sportives significatives.
Construire les sessions, la récupération, la fatigue, le moral, le potentiel, les points d'attribut et les spécialisations. Relier les actions aux données du joueur.
Validation : les effets sont mesurables, cohérents, sauvegardés et couverts par des tests.
ÉTAPE 5 --- Moteur de match et expérience en direct
Objectif : produire un match réellement jouable de bout en bout.
Construire la préparation, la simulation, la timeline, les choix tactiques, le score, les statistiques, la note, les conséquences et la sauvegarde.
Validation bloquante : plusieurs matchs successifs sont jouables, les résultats sont cohérents et aucun résultat n'est comptabilisé deux fois.
ÉTAPE 6 --- Coach, sélection et passage au professionnel
Objectif : faire dépendre le temps de jeu des performances.
Construire la confiance du coach, la concurrence, les objectifs, les titularisations, les remplacements, la réserve et la promotion en équipe première.
Validation : la promotion découle de règles testées, pas d'un bouton qui change simplement le statut du joueur.
ÉTAPE 7 --- Contrats, agent et transferts
Objectif : rendre les décisions de carrière significatives.
Ajouter les offres, négociations, durée des contrats, salaires, primes, prêts, changements de club et historique des transferts.
Validation : les conditions négociées sont enregistrées et ont un effet réel sur la carrière.
ÉTAPE 8 --- Monde vivant et immersion
Objectif : rendre les saisons uniques.
Ajouter rivalités, autres joueurs, transferts des clubs, événements de vie, médias, sponsors, fans, sélections nationales et journal.
Validation : les événements sont générés par les systèmes de jeu et ont des conséquences persistantes.
ÉTAPE 9 --- Saisons, compétitions et héritage
Objectif : assurer la continuité de la carrière sur plusieurs années.
Ajouter compétitions, classements, records, récompenses, bilans de saison, défis et retraite.
Validation : le monde et le joueur continuent d'évoluer sans incohérences entre saisons.
ÉTAPE 10 --- Polissage, tests et livraison
Objectif : transformer un prototype fonctionnel en jeu fiable.
Vérifier les parcours, sauvegardes, erreurs, performances, transitions, écrans mobiles, cas limites et build de production.
Validation : tests réussis, principaux parcours fonctionnels sur mobile et livraison Git propre.
Règle de passage entre les étapes
À la fin de chaque étape, l'IA fournit un rapport bref avec les fichiers modifiés, les tests réellement exécutés et les problèmes restants. Elle ne commence l'étape suivante qu'après validation du jalon courant. Les tests ne sont jamais reportés à la fin du projet.
10. Tableau de suivi des étapes
[ ]
Étape 0 --- Nettoyage et protection du pont
[ ]
Étape 1 --- Fondations et sauvegardes
[ ]
Étape 2 --- Design system
[ ]
Étape 3 --- Création et académie
[ ]
Étape 4 --- Entraînement
[ ]
Étape 5 --- Moteur de match
[ ]
Étape 6 --- Coach et carrière professionnelle
[ ]
Étape 7 --- Contrats et transferts
[ ]
Étape 8 --- Monde vivant et immersion
[ ]
Étape 9 --- Saisons et héritage
[ ]
Étape 10 --- Tests et livraison
Règles finales
Ne supprime jamais le pont d'entrée.
Ne supprime rien en dehors du périmètre autorisé.
Ne développe pas tous les systèmes en même temps.
Ne considère jamais un build réussi comme une preuve suffisante de jouabilité.
N'ajoute pas de fonctionnalités avant que le cœur du jeu soit stable.
N'invente aucun résultat de test.
Préserve les sauvegardes et les changements existants.
Valide chaque étape avant de passer à la suivante.
Objectif final : un jeu de carrière footballistique cohérent, jouable, immersif, mobile-first et maintenable, de l'académie à la retraite.
