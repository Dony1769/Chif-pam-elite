/**
 * FC CAREER — Progression saisonnière (calendrier, classement, avancement).
 */

"use client";

import { useCallback, useMemo } from "react";
import type { SeasonState, MatchDay } from "../types/game";
import type { Club, LeagueStandingRow } from "../types/club";
import {
  createSeason,
  advanceSeason,
  nextUserFixture,
  computeStandings,
} from "../engine/season-manager";
import { getClubsByDivision } from "../constants/clubs";

export interface SeasonMethods {
  /** Crée une saison complète (calendrier aller-retour) pour la division du club. */
  newSeason: (userClub: Club, seasonYear?: number) => SeasonState;
  /** Applique les résultats d'une journée et avance la saison d'un jour. */
  advance: (
    season: SeasonState,
    results: { dayId: string; homeScore: number; awayScore: number }[],
  ) => SeasonState;
  /** Prochaine journée du joueur. */
  upcoming: (season: SeasonState, userClubId: string) => MatchDay | undefined;
  /** Classement actualisé de la division. */
  standings: (season: SeasonState, division: Club["division"]) => LeagueStandingRow[];
  /** Jours restants avant fin de saison. */
  daysRemaining: (season: SeasonState) => number;
}

export function useSeason(): SeasonMethods {
  const newSeason = useCallback(
    (userClub: Club, seasonYear?: number) =>
      createSeason(getClubsByDivision(userClub.division), seasonYear ?? new Date().getFullYear() + 1, userClub),
    [],
  );

  const advance = useCallback(
    (season: SeasonState, results: { dayId: string; homeScore: number; awayScore: number }[]) =>
      advanceSeason(season, results),
    [],
  );

  const upcoming = useCallback(
    (season: SeasonState, userClubId: string) => nextUserFixture(season, userClubId),
    [],
  );

  const standings = useCallback(
    (season: SeasonState, division: Club["division"]) =>
      computeStandings(season, getClubsByDivision(division)),
    [],
  );

  const daysRemaining = useCallback((season: SeasonState) => {
    if (season.isOver) return 0;
    const remaining = season.fixtures.filter((f) => !f.played).length;
    return remaining;
  }, []);

  return useMemo(
    () => ({ newSeason, advance, upcoming, standings, daysRemaining }),
    [newSeason, advance, upcoming, standings, daysRemaining],
  );
}
