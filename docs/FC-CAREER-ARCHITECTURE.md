# 🏆 FC-CAREER REFONTE - ARCHITECTURE GÉNÉRALE

## 📐 STRUCTURE DOSSIERS NOUVELLE


```
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
```

---

## 🎮 FLUX DE DONNÉES PRINCIPAL

```
PIN Lock
   ↓ [sessionStorage marque accès]
   ↓
Create Player Flow (3 étapes)
   ├─ Step 1: Identité + Morpho → calcul préliminaire
   ├─ Step 2: Position + Style + Club → archetype choisi
   └─ Step 3: Génération full + animation
   ↓ [sauvegarde localStorage avec version]
   ↓
DASHBOARD (HUB) ← POINT CENTRAL
   ├─ Infos Joueur (rating, âge, club, saison)
   ├─ Boutons actions (Entraîner, Reposer, Match?)
   ├─ Calendrier compact (prochains matchs)
   ├─ État saison (jour 1-380, compétitions actives)
   └─ Notifications (offres, messages sélectionnés)
   ↓
Joueur choisit action:
   ├─ ENTRAÎNEMENT → TrainingCenter (session type) → SessionAnimation → résultats
   ├─ REPOS → Récupération fatigue → animation relax
   ├─ MATCH APPROCHE → PreMatchScreen → MatchSimulation → PostMatchScreen
   ├─ VOIR SAISON → SeasonView (calendrier complet + classements)
   ├─ VOIR CLUB → ClubView (transferts, économie, effectif)
   ├─ VOIR STATS → PlayerProfile (courbes progression, historique)
   └─ VOIR TRANSFERTS → TransferMarket (offres en attente)
   ↓
Chaque jour:
   └─ Saison avance (+1 jour)
   └─ Fatigue change selon action
   └─ Entraînement améliore certains attributs
   └─ Matchs se disputent selon calendrier
   └─ Contrats, sponsors, primes se payent
   └─ Offres de clubs arrivent (selon form + potentiel)
   ↓
FIN SAISON (jour 380)
   └─ Résumé carrière (stats, évolution, meilleur joueur du mois?)
   └─ Propositions de clubs
   └─ Réinitialisation saison suivante
```

---

## 📊 SYSTÈME SAISONNIER (Le Cœur)

### Calendrier Réaliste
```
Saison = 380 jours (1 jour = 1 action joueur)

Août (jours 1-31):       Pré-saison
Septembre-Octobre:      Ligue 1 débute (jeudi/dimanche)
Novembre:                Coupe de la Ligue
Décembre-Mai:           Ligue 1 (matchs réguliers)
Janvier:                Mercato d'hiver (transferts possibles)
Février-Mars:           8ème Coupe de France
Avril-Mai:              Finales nationales
Juin:                   Fin de saison

Structure:
- Ligue 1 = 34 matchs (1 par week-end)
- Coupe de la Ligue = 8 matchs éliminatoires
- Coupe de France = 6 matchs éliminatoires
- Total = ~48 matchs dans une saison
```

### État Saison (GameState)
```typescript
{
  seasonNumber: 1,
  currentDay: 45,           // 1-380
  currentMonth: "Septembre",
  
  calendar: {
    upcomingMatches: [...],  // Matchs à venir ce mois
    pastMatches: [...],      // Historique
  },
  
  competitions: {
    ligue1: {
      matchdaysCompleted: 8,
      matchdaysTotal: 34,
      standings: [...],      // Classement
    },
    coupeLigue: {
      round: 3,
      status: "ongoing",
    },
    coupeFrance: {
      round: 2,
      status: "ongoing",
    }
  },
  
  transfers: {
    window: "closed",        // "closed" | "winterOpen" | "summerOpen"
    incomingOffers: [...],   // Offres reçues
    released: false,
  },
  
  playerStats: {
    matchesPlayed: 8,
    matchesStarted: 6,
    matchesSubstitute: 2,
    totalMinutes: 540,
    goals: 0,
    assists: 0,
    rating: 6.8,
    monthlyRating: 6.9,     // Rating du mois courant
  }
}
```

---

## 👤 SYSTÈME D'ATTRIBUTS (Réaliste)

### 51 Attributs (Réels FC27)
```
PHYSIQUE (7):
  - Pace (vitesse)
  - Strength (force)
  - Stamina (endurance)
  - Acceleration (accélération)
  - Sprint Speed (vitesse de sprint)
  - Agility (agilité)
  - Balance (équilibre)

TECHNIQUE (12):
  - Dribbling
  - Crossing
  - Passing
  - Short Pass Accuracy
  - Crossing Accuracy
  - Shot Power
  - Finishing (finition)
  - Long Shots
  - Curve
  - Volleys
  - Ball Control
  - Weak Foot Accuracy

MENTAL (15):
  - Positioning (positionnement)
  - Composure (assurance)
  - Decision Making
  - Reaction Time
  - Vision (vision de jeu)
  - Awareness (conscience)
  - Concentration
  - Jumping
  - Heading Accuracy
  - Defensive Awareness
  - Tactical Discipline
  - Off The Ball (jeu hors-balle)
  - Workrate (intensité)
  - Leadership
  - Personality

DÉFENSE (12):
  - Marking
  - Tackling (tacle)
  - Positioning (défensif)
  - Slide Tackle
  - Standing Tackle
  - Interception
  - Heading Accuracy (défensif)
  - Blocks
  - Clearances
  - Aggression
  - Anticipation
  - Arm Strength (GK)

PORTIER (5):
  - Diving
  - Handling
  - Kicking
  - Positioning (GK)
  - Reflexes
```

### Génération Réaliste
```
Input:
  - Âge (13-18)
  - Taille (160-195cm)
  - Poids (55-95kg)
  - Pied préféré
  - Position choisie
  - Style de jeu (équilibré, agressif, défensif)

Processus:
  1. Attributs de base = aléa faible (5-25) pour tous
  2. Par position, certains attrs boostés (ex: attaquant → Finishing +15)
  3. Morpho affecte physique:
     - Taille +5cm → Jumping +3, Heading +2
     - Poids -5kg → Pace +2, Agility +1
  4. Style affecte mental:
     - Agressif → Aggression +8, Decision -3
     - Défensif → Marking +8, Dribbling -3
  5. Potentiel calculé (différence entre plafond et niveau actuel):
     - Jeune (14-15) → potentiel élevé (+30-50)
     - Moyen (16-17) → potentiel moyen (+20-30)
     - Vieux (18) → potentiel faible (+10-20)

Output:
  - 51 attributs (0-99)
  - Rating (moyenne pondérée par poste)
  - Potentiel (nombre d'étapes de progression)
  - Taux croissance par âge
```

### Progression Réaliste
```
Chaque entraînement ciblé:
  - +1 à +4 points selon:
    - Fatigue (moins fatigué = plus de gains)
    - Potentiel restant (s'épuise)
    - Âge (18 → gains lents; 15 → gains rapides)
    - Qualité coach (mauvais coach = -20%)
    
Chaque match:
  - Attributs pertinents +0.5 à +2 (si bien noté)
  - Augmentation faible mais continue
  
Limite: Rating max ~95 à 18 ans (selon potentiel initial)
```

---

## ⚽ SYSTÈME DE MATCH (Simulation + Motion)

### Avant le Match (Pre-Match Screen)
```
Animation:
  - Fade in background stade
  - Infos équipe coulissent (composition, formation)
  - Rating joueur s'affiche avec animation
  - Conditions meteo + importance match (motion parallax)

Infos affichées:
  - Composition adverse
  - Formation équipe
  - Météo
  - Importance match (amical, championnat, coupe)
  - Historique H2H
  - Prévisualisation rôle (titulaire/remplaçant/tribune)

Boutons:
  - Lancer le match (transition smooth)
  - Annuler (pop back)
```

### Pendant le Match (Motion Design ★★★)
```
Affichage Split Screen / Timeline:

GAUCHE: Statut Temps Réel
  - Chrono match (0'-90')
  - Score en temps réel (animation scoreboard)
  - Events timeline (goals, cartons, substitutions)
  - Rating du joueur en direct

DROITE: Heatmap Joueur
  - Position zone de jeu (heat-map couleur progression)
  - Distance parcourue (animation ligne)
  - Statistiques live:
    - Passes (complétées/tentées)
    - Tirs
    - Interceptions
    - etc.

Motion Design:
  - Chaque événement (but, passe réussie) = flash screen
  - Rating joueur monte/baisse fluidement
  - Chrono augmente en continu
  - Si joueur entre/sort → animation transition
  - Events arrivent avec ease-out + pop animation
  
Pas de "voir le match joué" mais simulation calculée + UI fluide
```

### Après le Match (Post-Match Screen)
```
Phases animées:
  1. Fade in résultat (2s)
  2. Statistiques joueur remontent (cascade):
     - Temps jeu
     - Passes
     - Tirs
     - Notes moyennes
  3. Rating final apparaît (grande animation)
  4. Feedback carrière (en rouge/vert):
     - Attributs gagnés (si match bon)
     - Contrats modifiés
     - Offres reçues?

Infos:
  - Rating match (0-10)
  - Statistiques détaillées
  - Comparaison équipe
  - Votes fan/presse (si bon)
  - Évolution potentiel
  
Boutons:
  - Retour dashboard
  - Voir stats détaillées
```

---

## 🏋️ SYSTÈME D'ENTRAÎNEMENT (Réaliste)

### Types de Sessions
```
Équilibré (3x/semaine):
  - Tous attributs +1 à +2
  - Coût fatigue: +15

Spécialisé - Vitesse:
  - Pace, Acceleration, Sprint Speed +3 à +5
  - Autres +0.5
  - Coût fatigue: +20

Spécialisé - Technique:
  - Dribbling, Passing, Ball Control +3 à +5
  - Autres +0.5
  - Coût fatigue: +18

Spécialisé - Défense:
  - Marking, Tackling, Positioning +3 à +5
  - Autres +0.5
  - Coût fatigue: +18

Spécialisé - Finition:
  - Finishing, Shot Power, Curve +3 à +5
  - Autres +0.5
  - Coût fatigue: +20

Repos Actif:
  - Tous attributs +0
  - Fatigue -30 (grosse récup)
  - Essence: récupération

Repos Complet:
  - Tous attributs +0
  - Fatigue -50 (max récup)
  - Essence: repos total
```

### Animation Session d'Entraînement
```
1. Écran charge (loader circulaire)
2. Affiche session type + attributs cibles
3. Barre de progression remonte (90 secondes réelles = 1 session)
4. Pour chaque attribut ciblé:
   - Apparition progressive de la barre (stagger 100ms)
   - Nombre final monte depuis 0 (ease-out)
   - Si nouveau record perso = éclat dorée

5. Fin: Button "Terminer session"
6. Retour dashboard avec nouveau rating affiché
```

---

## 💰 SYSTÈME ÉCONOMIQUE (Réaliste)

### Structure Salaire + Primes
```
Contrat Base:
  - Salaire mensuel selon club:
    - Top clubs (PSG, Lyon): 5k-15k €/mois
    - Clubs moyens (Lens, Rennes): 1k-3k €/mois
    - Petits clubs: 300-800 €/mois
  - Bonus de signature (à la signature)
  - Durée contrat (1-5 ans)

Primes Activées:
  - Par match joué: 100-500€ (selon club)
  - But/Assist: 200-1000€
  - Clean sheet (défense): 150-800€
  - Player of the match: 300-2000€
  - Victoire championnat: 50k€
  - Coupe gagnée: 20k€

Sponsors:
  - Si rating > 7.5 + matchs joués > 10:
    - Nike/Adidas: 500€/mois
    - Petits sponsors: 100-300€/mois
  - Rating > 8.5 + fame:
    - Big sponsors: 2k-5k€/mois

Dépenses:
  - Salaire imposé (existe)
  - Équipement + matériel: 50-100€/mois
  - Agent (10% des primes)

Budget Joueur:
  - Affichage dans ClubView
  - Accumule au fil du temps
  - Statut économique (riche/normal/pauvre)
```

### Système de Transfert
```
Offres arrivent si:
  - Rating > 7.0 + 10 matchs joués
  - Clubs recherchent postes carencés
  - Potentiel élevé visible

Offres proposent:
  - Club
  - Salaire nouveau
  - Bonus signature
  - Durée

Joueur accepte/refuse (coût 1 jour saison)

Si accepté:
  - Transition club
  - Équipe nouvelle
  - Adaptation 5-10 jours (fatigue +20)
```

---

## 🎨 MOTION DESIGN - POINTS-CLÉ

### Transitions Pages
```
Dashboard → TrainingCenter:
  Slide-in gauche + fade background (300ms, ease-out-cubic)

Dashboard → SeasonView:
  Zoom in calendrier + blur (400ms)

Dashboard → MatchCenter:
  Stadium background entre + flip score (500ms, bounce)

Match → Post-Match:
  Stabilité 3s puis fade in résultats (stagger cascade)
```

### Micro-Interactions
```
Clic bouton action:
  - Ripple effect (200ms)
  - Button scale 0.95 → 1.0 (100ms)

Stat augmente:
  - Nombre remonte (ease-out)
  - Background couleur temporaire (#4CAF50 si gain)

Fatigue change:
  - Barre se remplit/vide (smooth, 600ms)
  - Couleur change (vert → jaune → rouge)

Notification arrive:
  - Toast slide-in (200ms, ease-out)
  - Shake subtle (200ms)
  - Auto-dismiss après 5s
```

### Animations Contextuelles
```
Session entraînement:
  - Loader circulaire + texte % (looped)
  - Attributes bars remontent (stagger)
  - Son optionnel (beep discret)

Match en cours:
  - Chrono smooth
  - Score changes with flash
  - Events pop-in avec icône
  - Rating courbe fluidement

Post-match:
  - Cascade cascade valeurs (stagger 100ms)
  - Rating final avec scale + spin (700ms)
```

---

## 🔄 GESTION D'ÉTAT (Hooks + Context)

### GameContext Structure
```typescript
type GameState = {
  // Player
  player: {
    id: string
    name: string
    age: number
    position: Position
    club: Club
    attributes: AttributeMap
    rating: number
    fatigue: number
    injuries: Injury[]
    contract: Contract
    history: CareerEvent[]
  }
  
  // Season
  season: {
    number: number
    currentDay: number
    month: Month
    competitions: CompetitionMap
    calendar: CalendarEvent[]
  }
  
  // Economy
  economy: {
    balance: number
    salary: number
    primes: number
    sponsors: number
  }
  
  // Transfers
  transfers: {
    window: "closed" | "winterOpen" | "summerOpen"
    incomingOffers: TransferOffer[]
    released: boolean
  }
}

type GameActions =
  | { type: "TRAIN"; payload: TrainingSession }
  | { type: "REST"; payload: { type: "active" | "complete" } }
  | { type: "PLAY_MATCH"; payload: Match }
  | { type: "ADVANCE_DAY" }
  | { type: "ACCEPT_TRANSFER"; payload: TransferOffer }
  | { type: "UPDATE_SEASON" }
  | etc...
```

### Hooks Principaux
```typescript
// useGameState(): [GameState, dispatch]
// usePlayer(): PlayerMethods (train, rest, accept contract)
// useMatch(): MatchMethods (getUpcoming, simulate, getResult)
// useSeason(): SeasonMethods (advance, update standings)
// useAnimation(): AnimationTriggers (pour déclencher motions)
// useMotion(): MotionContext (timing functions globales)
```

---

## 📱 LAYOUT PRINCIPAL

```
Page Root:
  └─ Navbar (sticky top)
      ├─ Logo Chif-Pam
      ├─ Joueur nom + rating
      ├─ Jour/Mois saison
      ├─ Fatigue bar (petit)
      └─ Solde économique

  └─ Main Dashboard (grid 3 colonnes)
      │
      ├─ Colonne 1: Infos Joueur (card)
      │   ├─ Photo (placehold)
      │   ├─ Nom, Âge, Position
      │   ├─ Club actuel
      │   ├─ Rating grand
      │   ├─ Fatigue bar (grosse)
      │   └─ Cond. physique (icons)
      │
      ├─ Colonne 2: Actions Rapides (cards stack)
      │   ├─ Entraîner (bouton)
      │   ├─ Reposer (bouton)
      │   ├─ Voir stats (bouton)
      │   ├─ Voir saison (bouton)
      │   ├─ Voir transferts (badge si offres)
      │   └─ Voir club (bouton)
      │
      └─ Colonne 3: Timeline Rapide
          ├─ Prochains matchs (mini cards)
          ├─ Derniers résultats (mini stats)
          ├─ Notifications (toast stack)
          └─ Events saison (timeline compressée)

  └─ Footer (minimal)
      └─ Version save + Last save time
```

---

## 💾 PERSISTENCE & VERSIONING

```
LocalStorage Key: "fc_career_save_v2"

Structure:
{
  version: 2,
  lastSaveTime: timestamp,
  checksum: hash,
  data: {
    // Entire GameState
    player: {...},
    season: {...},
    economy: {...},
    transfers: {...}
  }
}

Migrations:
  v1 → v2: Ajouter structure competitions, calendrier
  v2 → v3: (future)

On Load:
  - Vérifier version
  - Appliquer migrations si nécessaire
  - Normaliser données
  - Valider checksum
  - Si erreur: proposer reset
```

---

## 🎯 ROADMAP IMPLÉMENTATION

**Phase 1: Fondations**
1. Types complètes (game, player, match, economy)
2. Constants (attributes, positions, clubs, competitions)
3. PlayerGenerator engine
4. Storage avec versioning

**Phase 2: Core Gameplay**
5. SeasonManager (calendrier, jours qui avancent)
6. AttributeCalculator (progression réaliste)
7. GameContext + Hooks
8. Dashboard basique (sans motion d'abord)

**Phase 3: Gameplay Avancé**
9. MatchEngine (simulation détaillée)
10. TrainingSystem (entraînement + progression visuelle)
11. EconomicEngine (salaires, transferts)
12. TransferSystem (offres, acceptation)

**Phase 4: UI Complète + Motion**
13. SeasonView (calendrier, standings)
14. MatchCenter (pré/simulation/post)
15. TrainingCenter (avec animations)
16. ClubView / PlayerProfile
17. Animations & micro-interactions
18. Responsive design

**Phase 5: Polish**
19. Notifications fluides
20. Sound design optionnel
21. Feedback utilisateur amélioré
22. Performance optimization

---

## 📋 RÉSUMÉ ARCHITECTURE

| Aspect | Ancien | Nouveau |
|--------|--------|---------|
| Durée saison | Vague | 380 jours (réaliste) |
| Matchs | Pas de matchs | 48 matchs / saison (calendrier réel) |
| Attributs | Basique | 51 réalistes + potentiel |
| Progression | Linéaire | Non-linéaire + fatigue + potentiel |
| Clubs | 1 académie | Clubs réels + transferts + contrats |
| Économie | Aucune | Salaires + primes + sponsors |
| UI Motion | Aucune | Transitions fluides + micro-animations |
| État Match | Invisible | Simulation visible + timeline events |
| Sauvegarde | Simple | Versioning + migration |

---

## ✅ VALIDATION ARCHITECTURE

Cette architecture permet:
- ✅ Progression réaliste sur 1-4 saisons
- ✅ Matchs avec simulation et feedback
- ✅ Économie jouable
- ✅ Transferts et clubs réels
- ✅ Motion design intégré dès le début
- ✅ Sauvegarde robuste
- ✅ Scalabilité future (multi-joueurs, ligues)
