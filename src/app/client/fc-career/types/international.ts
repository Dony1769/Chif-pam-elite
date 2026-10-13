/**
 * FC CAREER — Étape 13 : Sélection Nationale
 */

/* ------------------------------------------------------------------ */
/* 13.1 — Appel en sélection                                           */
/* ------------------------------------------------------------------ */

export type NationalTeamLevel = "A" | "U21";

export interface NationalCallUp {
  id: string;
  seasonYear: number;
  dayNumber: number;
  level: NationalTeamLevel;
  accepted: boolean | null; // null = pending
}

/* ------------------------------------------------------------------ */
/* 13.2 — Compétitions internationales                                 */
/* ------------------------------------------------------------------ */

export type InternationalCompetitionType =
  | "friendly"
  | "wc-qualifier"     // Qualifications Coupe du Monde
  | "euro-qualifier"    // Qualifications Euro
  | "world-cup"         // Coupe du Monde (48 nations)
  | "euro";             // Championnat d'Europa (24 nations)

export type TournamentStage =
  | "group"
  | "round-of-16"
  | "quarter-final"
  | "semi-final"
  | "final";

export interface InternationalMatch {
  id: string;
  competitionType: InternationalCompetitionType;
  stage?: TournamentStage;
  opponent: string; // country name
  opponentCode: string; // ISO
  dayNumber: number;
  played: boolean;
  playerRating?: number;
  playerGoals?: number;
  playerAssists?: number;
  teamScore?: number;
  opponentScore?: number;
}

export interface TournamentRun {
  type: "world-cup" | "euro";
  year: number;
  stage: TournamentStage; // furthest stage reached
  matches: InternationalMatch[];
  playerGoals: number;
  playerAvgRating: number;
}

/* ------------------------------------------------------------------ */
/* 13.3 — Stats internationales                                        */
/* ------------------------------------------------------------------ */

export interface InternationalCareer {
  team: string; // country name
  teamCode: string; // ISO
  caps: number;
  goals: number;
  assists: number;
  averageRating: number;
  isCaptain: boolean;
  level: NationalTeamLevel;
  tournaments: TournamentRun[];
  callUps: NationalCallUp[];
  matches: InternationalMatch[];
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface InternationalState {
  career: InternationalCareer | null;
  /** Current international break active */
  breakActive: boolean;
  /** Pending call-up to respond to */
  pendingCallUp: NationalCallUp | null;
  /** Next international break day number */
  nextBreakDay: number;
}
