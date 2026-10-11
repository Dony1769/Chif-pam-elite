/**
 * FC CAREER — Univers du jeu
 * Saisons, calendrier, compétitions, état global de la partie.
 */

import type { CompetitionId } from "./club";

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
}

/** Clés / constantes globales du jeu. */
export const GAME_CONSTANTS = {
  CURRENT_SAVE_VERSION: 1,
  STORAGE_KEY: "fc-career:save",
  MAX_SEASON_DAYS: 34,
  WEEKS_BETWEEN_MATCHES: 1,
} as const;
