/**
 * FC CAREER — Génération du calendrier académique
 * 38 semaines de saison, matchs d'évaluation toutes les ~6 semaines.
 */

import type { Career, AcademyState } from "./career";
import type { Fixture, SeasonSchedule } from "./season";
import { createRng, seedFromString } from "../utils/random";
import { generateId } from "../utils/ids";

export const ACADEMY_SEASON_WEEKS = 38;
export const EVAL_INTERVAL = 6;         // matchs d'évaluation toutes les 6 semaines
export const PROMOTION_THRESHOLD = 80;  // score pour passer pro
export const RELEGATION_THRESHOLD = 30; // score pour être renvoyé

/** Génère le calendrier de la saison académique */
export function generateAcademySchedule(
  careerId: string,
  season: number,
): SeasonSchedule {
  const rng = createRng(seedFromString(`${careerId}-s${season}`));

  const opponents = [
    "albion-u18", "riverside-academy", "north-city-youth",
    "east-end-u18", "westbrook-youth", "harbor-academy",
  ];

  const fixtures: Fixture[] = [];
  let matchday = 1;

  for (let week = 1; week <= ACADEMY_SEASON_WEEKS; week++) {
    if (week % EVAL_INTERVAL === 0) {
      const isHome = rng.chance(0.5);
      const opp = rng.pick(opponents);
      fixtures.push({
        id: generateId("m"),
        season,
        matchday,
        competitionId: "academy-eval",
        homeClubId:  isHome ? "academy" : opp,
        awayClubId:  isHome ? opp : "academy",
        result: null,
      });
      matchday++;
    }
  }

  const totalMatchdays = matchday - 1;

  return {
    season,
    competitionId: "academy-eval",
    fixtures,
    currentMatchday: 1,
    totalMatchdays,
  };
}

/** État initial de l'académie */
export function initialAcademyState(): AcademyState {
  return {
    stage: "youth",
    evaluationScore: 50,
    promotionThreshold: PROMOTION_THRESHOLD,
    weeksInStage: 0,
  };
}

/** Crée la carrière initiale (phase académie) */
export function createInitialCareer(careerId: string): Career {
  return {
    id: careerId,
    phase: "academy",
    season: 1,
    matchday: 1,
    week: 1,
    academy: initialAcademyState(),
    objectives: [],
    events: [],
    completedMatchIds: new Set<string>(),
    seasonSummaries: [],
  };
}
