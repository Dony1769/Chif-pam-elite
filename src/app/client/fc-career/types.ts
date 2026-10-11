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
/* Types de plus haut niveau (pages dashboard / create-player)        */
/* ------------------------------------------------------------------ */

import type { Player, Morphology } from "./types/player";
import type { PositionId, PlayingStyleId } from "./constants/positions";
import type { Wallet } from "./types/economy";
import type { GameSave, SeasonState, MatchDay } from "./types/game";
import type { SimulatedMatch } from "./types/match";

/** Académie : niveau du centre de formation dont est issu le joueur. */
export type AcademyLevel = "amateur" | "regional" | "national" | "prestige";

/** Alias pratique du poste (même domaine que PositionId). */
export type PlayerPosition = PositionId;

/** Préférence de pied (aligné sur Player.foot). */
export type PreferredFoot = Player["foot"];

/** Focus d'entraînement = type de séance (engine/progression). */
export type TrainingFocus =
  | "shooting"
  | "passing"
  | "dribbling"
  | "physical"
  | "tactical"
  | "recovery"
  | "match-prep";

/** État complet de la carrière persisté (ce que lit/écrit storage.ts). */
export interface PlayerCareerState {
  meta: GameSave;
  player: Player | null;
  wallet: Wallet | null;
  /** Dernier match simulé (pour PostMatchScreen). */
  lastMatch?: SimulatedMatch | null;
  /** Match en cours de simulation live. */
  currentFixture?: MatchDay | null;
}

/** Données saisies à l'étape de création du joueur. */
export interface CreatePlayerDraft {
  firstName: string;
  lastName: string;
  age: number;
  position: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  style: PlayingStyleId;
  morphology: Morphology;
  heightCm: number;
  weightKg: number;
  foot: PreferredFoot;
  academy: AcademyLevel;
  preferredClubId: string;
}

/* ------------------------------------------------------------------ */
/* Helpers de persistance (utilisés par dashboard / create-player)     */
/* ------------------------------------------------------------------ */

import type { FullSave } from "./utils/storage";
import type { SeasonState as _SeasonState } from "./types/game";

/** Convertit une sauvegarde storage.ts -> état de carrière des pages. */
export function toCareerState(save: FullSave | null): PlayerCareerState | null {
  if (!save) return null;
  return { meta: save.meta, player: save.player, wallet: save.wallet };
}

/** Convertit un état de carrière -> sauvegarde storage.ts. */
export function toFullSave(state: PlayerCareerState): FullSave {
  return { meta: state.meta, player: state.player, wallet: state.wallet };
}

/** Saison en cours (raccourci typé). */
export type CareerSeason = _SeasonState;

/** Alias de journée pour les composants calendrier. */
export type CareerFixture = MatchDay;

// Evite l'avertissement d'import inutilisé si SeasonState n'est pas ré-exporté ailleurs.
export type { _SeasonState as SeasonSnapshot };
