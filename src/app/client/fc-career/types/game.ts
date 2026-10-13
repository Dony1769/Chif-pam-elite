/**
 * FC CAREER — Univers du jeu
 * Saisons, calendrier, compétitions, état global de la partie.
 */

import type { CompetitionId } from "./club";
import type { CoachRelationship, SquadState, ObjectivesState, ActiveLoan } from "./coach";
import type { AgentState, MercatoState } from "./agent";
import type { LifestyleState, Endorsement, LifeEventOccurrence } from "./lifestyle";
import type { MentalState, ActiveInjury, SanctionState, PressConference } from "./wellness";

export type GamePhase =
  | "onboarding" // PIN + création joueur
  | "hub" // dashboard
  | "training"
  | "pre-match"
  | "live-match"
  | "post-match"
  | "season"
  | "market"
  | "profile";

/** Une journée de championnat (une ligne du calendrier). */
export interface MatchDay {
  id: string;
  dayNumber: number;
  competitionId: CompetitionId;
  homeClubId: string;
  awayClubId: string;
  date: string; // ISO
  played: boolean;
  homeScore?: number;
  awayScore?: number;
}

/** Saison sauvegardée dans le state global. */
export interface SeasonState {
  seasonYear: number; // 2026 => saison 2025-2026
  currentDay: number; // journée en cours (0 = pré-saison)
  competitionIds: CompetitionId[];
  fixtures: MatchDay[];
  isOver: boolean;
}

/** Sauvegarde complète persistée en localStorage. */
export interface GameSave {
  version: number;
  createdAt: string;
  lastPlayedAt: string;
  pinHash: string | null;
  phase: GamePhase;
  season: SeasonState | null;
  clubId: string;

  // Étape 7 — Coach & Concurrence
  coachRelationship: CoachRelationship | null;
  squad: SquadState | null;
  objectives: ObjectivesState | null;
  activeLoan: ActiveLoan | null;

  // Étape 9 — Agents & Transferts
  agentState: AgentState | null;
  mercatoState: MercatoState | null;

  // Étape 10 — Économie, Marques & Vie Privée
  lifestyleState: LifestyleState | null;
  endorsements: Endorsement[] | null;
  lifeEvents: LifeEventOccurrence[] | null;

  // Étape 11 — Médias, Blessures, Mental & Sanctions
  mentalState: MentalState | null;
  activeInjury: ActiveInjury | null;
  sanctionState: SanctionState | null;
  pressConferences: PressConference[] | null;
}

/** Clés / constantes globales du jeu. */
export const GAME_CONSTANTS = {
  CURRENT_SAVE_VERSION: 1,
  STORAGE_KEY: "fc-career:save",
  MAX_SEASON_DAYS: 380,
  WEEKS_BETWEEN_MATCHES: 1,
} as const;
