/**
 * FC CAREER — Domaine : Club et Compétition
 */

export type ClubTier = 1 | 2 | 3 | 4;

export interface ClubColors {
  primary: string;   // hex
  secondary: string; // hex
}

export interface Club {
  id: string;
  name: string;
  shortName: string;   // ex: "PSG"
  countryId: string;
  leagueId: string;
  tier: ClubTier;
  colors: ClubColors;
  /** Budget de masse salariale hebdomadaire max (€) */
  wagesBudget: number;
  /** Budget de transferts (€) */
  transferBudget: number;
  /** Réputation 0-100 */
  reputation: number;
  /** Taille du centre de formation 1-5 */
  academyLevel: number;
  /** Philosophie de jeu */
  philosophy: "attacking" | "balanced" | "defensive" | "possession" | "counter";
}

export interface League {
  id: string;
  name: string;
  countryId: string;
  tier: ClubTier;
  clubCount: number;
}

export interface Country {
  id: string;
  name: string;
  code: string; // ISO 3166-1 alpha-2
  flag: string; // emoji
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export type Standing = StandingRow[];
