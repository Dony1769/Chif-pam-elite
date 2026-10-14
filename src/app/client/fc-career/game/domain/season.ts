/**
 * FC CAREER — Domaine : Saison et Calendrier
 */

export interface Fixture {
  id: string;
  season: number;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  competitionId: string;
  /** null = pas encore joué */
  result: FixtureResult | null;
}

export interface FixtureResult {
  scoreHome: number;
  scoreAway: number;
}

export interface SeasonSchedule {
  season: number;
  competitionId: string;
  fixtures: Fixture[];
  currentMatchday: number;
  totalMatchdays: number;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  countryId: string | null; // null = internationale
  type: "league" | "cup" | "continental";
  tier: number;
}
