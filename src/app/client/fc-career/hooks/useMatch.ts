/**
 * FC CAREER — Actions match (programmation, simulation, résultats).
 */

"use client";

import { useCallback, useMemo } from "react";
import type { Player } from "../types/player";
import type { Club } from "../types/club";
import type { SeasonState, MatchDay } from "../types/game";
import type { SimulatedMatch } from "../types/match";
import { simulateMatch, predictRating, selectionChance } from "../engine/match-engine";
import { nextUserFixture } from "../engine/season-manager";
import { getClub } from "../constants/clubs";

export interface MatchMethods {
  /** Prochaine rencontre du club utilisateur (ou undefined si saison finie). */
  getUpcoming: (season: SeasonState, userClubId: string) => MatchDay | undefined;
  /** Clubs (domicile/extérieur) résolus d'une journée du calendrier. */
  resolveClubs: (fixture: MatchDay) => { home: Club; away: Club } | null;
  /** Simule un match complet ; seed permet de rejouer le même match à l'identique. */
  simulate: (home: Club, away: Club, player: Player, seed?: number) => SimulatedMatch;
  /** Note attendue du joueur avant le match (pré-visualisation). */
  predictedRating: (player: Player) => number;
  /** Probabilité de sélection (titulaire/banc) pour l'affichage pré-match. */
  selectionProbability: (player: Player) => number;
}

export function useMatch(): MatchMethods {
  const getUpcoming = useCallback(
    (season: SeasonState, userClubId: string) => nextUserFixture(season, userClubId),
    [],
  );

  const resolveClubs = useCallback((fixture: MatchDay) => {
    const home = getClub(fixture.homeClubId);
    const away = getClub(fixture.awayClubId);
    return home && away ? { home, away } : null;
  }, []);

  const simulate = useCallback(
    (home: Club, away: Club, player: Player, seed?: number) =>
      simulateMatch(home, away, player, seed !== undefined ? { seed } : {}),
    [],
  );

  const predictedRating = useCallback((player: Player) => predictRating(player), []);
  const selectionProbability = useCallback(
    (player: Player) => Math.round(selectionChance(player) * 100) / 100,
    [],
  );

  return useMemo(
    () => ({ getUpcoming, resolveClubs, simulate, predictedRating, selectionProbability }),
    [getUpcoming, resolveClubs, simulate, predictedRating, selectionProbability],
  );
}
