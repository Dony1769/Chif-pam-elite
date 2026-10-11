/**
 * FC CAREER — Barre d'index des types (ré-exports)
 * Permet `import type { ... } from "../types"` dans les pages.
 */

export type * from "./types/game";
export type * from "./types/player";
export type * from "./types/club";
export type * from "./types/match";
export type * from "./types/economy";
export type * from "./types/ui";

// Ré-exports nommés pour compatibilité stricte TS.
export type { GamePhase, MatchDay, SeasonState, GameSave } from "./types/game";

export type {
  AttributeGroup,
  AttributeMap,
  Morphology,
  Contract,
  SeasonStatLine,
  ProgressionPoint,
  Player,
  MatchRating,
} from "./types/player";

export type {
  Division,
  CompetitionId,
  ClubColors,
  AcademyInfo,
  Club,
  LeagueStandingRow,
  League,
} from "./types/club";

export type {
  MatchEvent,
  TeamStats,
  SimulatedMatch,
  LineupSlot,
  Lineup,
  SimulationOptions,
} from "./types/match";

export type {
  SponsorDeal,
  WeeklyEconomySummary,
  Wallet,
  SalaryOffer,
  TransferProposal,
} from "./types/economy";

export type {
  ToastKind,
  Toast,
  ModalId,
  RouteView,
  MotionContextValue,
  UIState,
} from "./types/ui";


/* ------------------------------------------------------------------ */
/* Helpers de persistance (utilisés par dashboard / create-player)     */
/* ------------------------------------------------------------------ */

import type { FullSave } from "./utils/storage";
import type { GameSave, MatchDay, SeasonState } from "./types/game";
import type { Player } from "./types/player";
import type { Wallet } from "./types/economy";
import type { SimulatedMatch } from "./types/match";

/**
 * État de carrière manipulé par les pages (hub).
 * C'est la vue "runtime" de la sauvegarde : meta (versionnée) + joueur + wallet.
 */
export interface CareerRuntimeState {
  meta: GameSave;
  player: Player | null;
  wallet: Wallet | null;
  /** Dernier match simulé (non persisté, perdu au rechargement). */
  lastMatch?: SimulatedMatch | null;
}

/** Convertit une sauvegarde storage.ts -> état de carrière des pages. */
export function toCareerState(save: FullSave | null): CareerRuntimeState | null {
  if (!save) return null;
  return { meta: save.meta, player: save.player, wallet: save.wallet };
}

/** Convertit un état de carrière -> sauvegarde storage.ts. */
export function toFullSave(state: CareerRuntimeState): FullSave {
  return { meta: state.meta, player: state.player, wallet: state.wallet };
}

/** Saison en cours (raccourci typé). */
export type CareerSeason = SeasonState;

/** Alias de journée pour les composants calendrier. */
export type CareerFixture = MatchDay;
export type AttributeCategory =
| 'Attaque'
| 'Technique & Passes'
| 'Physique & Moteur'
| 'Mental & Tactique'
| 'Défense'
| 'Gardien';

export interface AttributeDefinition {
id: string;
name: string;
category: AttributeCategory;
description: string;
}

export type PlayerAttributes = Record<string, number>;


export type CareerStage =
| 'academie'
| 'jeunes'
| 'reserve'
| 'professionnel'
| 'retraite';

export type PreferredFoot = 'droit' | 'gauche' | 'ambidextre';

export type PlayerArchetype =
| 'technicien'
| 'sprinteur'
| 'physique'
| 'createur'
| 'finisseur'
| 'defenseur'
| 'gardien'
| 'polyvalent';

export type PlayerPosition =
| 'GB'
| 'DD'
| 'DC'
| 'DG'
| 'MDC'
| 'MC'
| 'MOC'
| 'AD'
| 'AG'
| 'BU';

export type AcademyLevel =
| 'local'
| 'regional'
| 'national'
| 'elite';

export interface PlayerPhysicalProfile {
heightCm: number;
weightKg: number;
preferredFoot: PreferredFoot;
primaryPosition: PlayerPosition;
secondaryPositions: PlayerPosition[];
archetype: PlayerArchetype;
}

export interface PlayerPotential {
overallPotential: number;
attributePotentials: PlayerAttributes;
developmentRate: number;
consistency: number;
}

export interface AcademyProfile {
academyName: string;
academyLevel: AcademyLevel;
enrollmentSeason: number;
enrollmentWeek: number;
evaluationScore: number;
trialsCompleted: number;
trainingSessionsCompleted: number;
youthMatchesPlayed: number;
promotionEligible: boolean;
}

export interface SponsorContract {
id: string;
sponsorName: string;
objective: string;
targetCount: number;
currentCount: number;
durationMatches: number;
rewardSkillPoints: number;
completed: boolean;
failed: boolean;
}

export interface CoachProfile {
id: string;
name: string;
preferredFormation: '4-3-3' | '4-2-3-1' | '3-5-2' | '4-4-2';
tacticalStyle: 'Possession' | 'Contre-attaque' | 'Gegenpressing' | 'Bus';
patienceRating: number;
strictness: number;
relation: number;
}

export interface PlayerReputation {
niveau: number;
image: number;
moral: number;
followers: number;
}

export type MessageSender =
| 'coach'
| 'agent'
| 'club'
| 'sponsor'
| 'presse'
| 'famille'
| 'systeme';

export interface GameMessage {
id: string;
from: MessageSender;
season: number;
week: number;
title: string;
body: string;
read: boolean;
}

export type Participation = 'titulaire' | 'remplacant' | 'tribune';

export type TrainingFocus =
| 'technique'
| 'physique'
| 'mental'
| 'tactique'
| 'repos';

export interface SeasonStats {
matches: number;
wins: number;
draws: number;
losses: number;
goals: number;
assists: number;
ratingSum: number;
ratedMatches: number;
}

export interface WeekReport {
season: number;
week: number;
opponentName: string;
home: boolean;
goalsFor: number;
goalsAgainst: number;
participation: Participation;
rating: number | null;
playerGoals: number;
playerAssists: number;
reputationDelta: number;
newInjuryWeeks: number;
}

export interface GameEvent {
id: string;
from: MessageSender;
title: string;
body: string;
choices: Array<{
id: string;
label: string;
}>;
}

export interface CareerClub {
id: string;
name: string;
country: string;
division: string;
reputation: number;
youthAcademyLevel: AcademyLevel;
}

export interface CareerContract {
id: string;
clubId: string;
clubName: string;
type: 'academie' | 'jeune' | 'professionnel';
startSeason: number;
durationSeasons: number;
weeklySalary: number;
active: boolean;
}

export interface PlayerCareerState {
saveVersion: number;
isUnlocked: boolean;

playerName: string;
age: number;
careerStage: CareerStage;

season: number;
week: number;

physicalProfile: PlayerPhysicalProfile;
heightCm: number;
weightKg: number;

skillPointsAvailable: number;
attributes: PlayerAttributes;
potential: PlayerPotential;

assignedPosition: string;
isStarter: boolean;

clubName: string;
clubId: string | null;
division: string;
teamStrength: number;

coach: CoachProfile;
academy: AcademyProfile | null;
contract: CareerContract | null;

activeSponsors: SponsorContract[];

matchHistoryCount: number;
form: number;
fatigue: number;
injuryWeeks: number;

trainedThisWeek: boolean;
lastTrainingNote: string | null;

reputation: PlayerReputation;

inbox: GameMessage[];
seasonStats: SeasonStats;

careerStats: {
matches: number;
goals: number;
assists: number;
};

pendingEvent: GameEvent | null;
lastWeek: WeekReport | null;
}
