src/app/client/fc-career/
├── types/
│   ├── game.ts              # Univers du jeu (saisons, calendrier, compétitions)
│   ├── player.ts            # Joueur (attributs, contrats, historique)
│   ├── club.ts              # Club, académie, ligue
│   ├── match.ts             # Simulation de match, statistiques
│   ├── economy.ts           # Salaires, primes, sponsors
│   └── ui.ts                # États UI, animations, transitions
│
├── engine/
│   ├── player-generator.ts  # Création joueur réaliste (morpho → attributs)
│   ├── attribute-calculator.ts # Calcul attributs avec système de potentiel
│   ├── match-engine.ts      # Simulation match en détail (roles, notation)
│   ├── progression.ts       # Entraînement, amélioration, fatigue
│   ├── season-manager.ts    # Calendrier, compétitions, avancements
│   ├── transfer-system.ts   # Transferts, contrats, offres de clubs
│   └── economic-engine.ts   # Salaires, sponsors, primes, budget
│
├── constants/
│   ├── attributes.ts        # Les 51 attributs réalistes
│   ├── positions.ts         # Postes, formations, archetypes
│   ├── clubs.ts             # Clubs réels français + divisions
│   ├── competitions.ts      # Ligue 1, Ligue 2, Coupes
│   ├── formations.ts        # Systèmes de jeu
│   └── scaling.ts           # Courbes de progression, multiplicateurs
│
├── utils/
│   ├── storage.ts           # Persistence localStorage + versioning
│   ├── animations.ts        # Timing functions, delays pour motion design
│   ├── formatters.ts        # Affichage, nombres, dates
│   └── validators.ts        # Vérifications données
│
├── components/
│   ├── OnboardingFlow/      # Authentification → création joueur
│   │   ├── PinLock.tsx
│   │   ├── CreatePlayerStep1.tsx  (identité, âge, morpho)
│   │   ├── CreatePlayerStep2.tsx  (position, style, clubs)
│   │   └── GenerationScreen.tsx   (animation de génération)
│   │
│   ├── Dashboard/           # Hub principal avec motion design
│   │   ├── DashboardLayout.tsx
│   │   ├── PlayerCard.tsx        (statut joueur, form)
│   │   ├── SeasonWidget.tsx      (infos saison)
│   │   ├── UpcomingMatches.tsx   (matchs à venir)
│   │   └── QuickActions.tsx      (entraînement, repos, etc.)
│   │
│   ├── SeasonView/         # Calendrier, compétitions, classements
│   │   ├── CalendarView.tsx
│   │   ├── CompetitionTabs.tsx
│   │   ├── StandingsTable.tsx
│   │   └── FixtureCard.tsx
│   │
│   ├── MatchCenter/        # Avant / pendant / après match
│   │   ├── PreMatchScreen.tsx    (infos, composition)
│   │   ├── MatchSimulation.tsx   (animation live, actions)
│   │   ├── PostMatchScreen.tsx   (stats, notes, évolution)
│   │   └── MatchTimeline.tsx     (résumé événements)
│   │
│   ├── TrainingCenter/     # Entraînement et progression
│   │   ├── TrainingDashboard.tsx
│   │   ├── SessionSelector.tsx   (type entraînement)
│   │   ├── SessionAnimation.tsx  (progression attributs en temps réel)
│   │   └── FatigueChart.tsx
│   │
│   ├── ClubView/           # Info club, économie, transferts
│   │   ├── ClubOverview.tsx
│   │   ├── EconomyPanel.tsx      (salaire, primes, sponsors)
│   │   ├── TransferMarket.tsx    (offres, propositions)
│   │   └── ContractDetails.tsx
│   │
│   ├── PlayerProfile/      # Stats, historique, achievements
│   │   ├── StatsPanel.tsx
│   │   ├── GrowthChart.tsx       (évolution attributs)
│   │   ├── HistoryTimeline.tsx   (carrière du joueur)
│   │   └── AchievementsSection.tsx
│   │
│   └── SharedUI/           # Réutilisable
│       ├── AnimatedStat.tsx       (nombre avec animation)
│       ├── ProgressBar.tsx        (barre animated)
│       ├── Card.tsx               (avec hover, motion)
│       ├── Modal.tsx              (transition smooth)
│       └── Notifications.tsx      (toast, alerts animés)
│
├── hooks/
│   ├── useGameState.ts      # State du jeu global
│   ├── usePlayer.ts         # Actions joueur
│   ├── useMatch.ts          # Actions match
│   ├── useSeason.ts         # Progression saisonnière
│   ├── useAnimation.ts      # Triggers animations
│   └── useMotion.ts         # Contexte motion design
│
├── context/
│   ├── GameContext.ts       # State global + dispatch
│   ├── PlayerContext.ts     # Infos joueur actuel
│   └── UIContext.ts         # État UI, modals, animations
│
├── page.tsx                 # Entry point (PIN lock)
├── layout.tsx              # Layout principal avec motion
└── globals.css             # CSS variables, animations, transitions
