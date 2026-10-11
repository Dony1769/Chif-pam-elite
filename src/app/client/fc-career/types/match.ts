/**
 * FC CAREER — Simulation de match & statistiques
 */

import type { MatchRating } from "./player";

export type MatchEvent =
  | { id: string; minute: number; type: "goal"; scorer: string; clubId: string; assist?: string }
  | { id: string; minute: number; type: "chance"; clubId: string; description: string }
  | { id: string; minute: number; type: "card"; clubId: string; player: string; color: "yellow" | "red" }
  | { id: string; minute: number; type: "sub"; clubId: string; out: string; in: string }
  | { id: string; minute: number; type: "var"; clubId: string; outcome: string };

export interface TeamStats {
  possession: number; // %
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  offsides: number;
  passAccuracy: number; // %
  duelsWon: number; // %
}

export interface SimulatedMatch {
  id: string;
  dayNumber: number;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homeStats: TeamStats;
  awayStats: TeamStats;
  /** Note & stats du joueur utilisateur. */
  userRating: MatchRating;
  userPlayed: boolean;
  userMinutes: number;
  manOfTheMatch?: string;
}

/** Ligne de composition (11 titulaires + banc). */
export interface LineupSlot {
  playerId: string;
  name: string;
  positionId: string;
  role: string; // rôle tactique (constants/positions)
  ratingPrediction: number; // note estimée 0-10
}

export interface Lineup {
  formationId: string;
  starters: LineupSlot[];
  bench: LineupSlot[];
  captainId: string;
}

/** Paramètres d'une simulation (graine aléatoire pour rejouer un match). */
export interface SimulationOptions {
  seed?: number;
  fast?: boolean;
  intensityHome?: number; // pression/coefficient offensif 0-1
  intensityAway?: number;
}
