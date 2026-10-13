/**
 * FC CAREER — Étape 12 : Récompenses & Trophées
 */

/* ------------------------------------------------------------------ */
/* 12.1 — Globe d'Or                                                   */
/* ------------------------------------------------------------------ */

export interface GoldenGlobeCandidate {
  playerId: string;
  name: string;
  clubId: string;
  avgRating: number;
  matchesPlayed: number;
  goals: number;
  assists: number;
  collectiveTrophies: number;
  championsPerformance: number; // avg rating in champions
  popularity: number; // 0-100
  score: number; // computed
}

export type GoldenGlobeResult = "winner" | "finalist" | "nominated" | "none";

export interface GoldenGlobeCeremony {
  seasonYear: number;
  candidates: GoldenGlobeCandidate[];
  playerRank: number;
  playerResult: GoldenGlobeResult;
}

/* ------------------------------------------------------------------ */
/* 12.2 — Récompenses par championnat                                  */
/* ------------------------------------------------------------------ */

export type LeagueAwardType =
  | "top-scorer"       // Meilleur buteur
  | "top-assister"     // Meilleur passeur
  | "best-player"      // Meilleur joueur
  | "best-young"       // Meilleur jeune (U21)
  | "best-goalkeeper"  // Meilleur gardien
  | "player-of-month"  // Joueur du mois
  | "team-of-season";  // Équipe type

export interface LeagueAward {
  type: LeagueAwardType;
  label: string;
  seasonYear: number;
  competitionId: string;
  playerName: string;
  value?: number; // goals, assists, or avg rating
}

/* ------------------------------------------------------------------ */
/* 12.3 — Récompenses européennes                                      */
/* ------------------------------------------------------------------ */

export type EuropeanAwardType =
  | "golden-boot"      // Soulier d'Or
  | "champions-mvp"    // MVP Coupe des Champions
  | "champions-team";  // Équipe type Champions

export interface EuropeanAward {
  type: EuropeanAwardType;
  label: string;
  seasonYear: number;
  playerName: string;
  value?: number;
}

/* ------------------------------------------------------------------ */
/* Classements                                                         */
/* ------------------------------------------------------------------ */

export interface LeagueRanking {
  rank: number;
  playerName: string;
  clubId: string;
  value: number; // goals or assists
  isPlayer: boolean; // true if it's our player
}

export interface AwardsState {
  /** Globe d'Or ceremonies */
  goldenGlobes: GoldenGlobeCeremony[];
  /** League awards won by the player */
  leagueAwards: LeagueAward[];
  /** European awards won by the player */
  europeanAwards: EuropeanAward[];
  /** Current season top scorers (updated each match day) */
  topScorers: LeagueRanking[];
  /** Current season top assisters */
  topAssisters: LeagueRanking[];
  /** Player of the month history */
  playerOfMonthHistory: { month: number; seasonYear: number; won: boolean }[];
}
