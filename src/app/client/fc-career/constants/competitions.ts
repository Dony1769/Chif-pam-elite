/**
 * FC CAREER — Compétitions françaises : Ligue 1, Ligue 2, Coupes
 */

import type { CompetitionId, Division } from "../types/club";

export interface CompetitionDef {
  id: CompetitionId;
  name: string;
  shortName: string;
  type: "league" | "cup" | "friendly";
  division: "Ligue 1" | "Ligue 2" | "National" | "all";
  totalDays: number; // journées de championnat (0 pour coupes)
  trophyIcon: string; // emoji / clé d'icône
  prestige: number; // 0-100
  /** Primes de match indicatives (€) par résultat. */
  bonuses: { win: number; draw: number; goal: number };
}

export const COMPETITIONS: CompetitionDef[] = [
  {
    id: "ligue1",
    name: "Championnat de France de Ligue 1",
    shortName: "Ligue 1",
    type: "league",
    division: "Ligue 1",
    totalDays: 34,
    trophyIcon: "🏆",
    prestige: 85,
    bonuses: { win: 15000, draw: 6000, goal: 8000 },
  },
  {
    id: "ligue2",
    name: "Championnat de France de Ligue 2 BKT",
    shortName: "Ligue 2",
    type: "league",
    division: "Ligue 2",
    totalDays: 34,
    trophyIcon: "🥈",
    prestige: 60,
    bonuses: { win: 5000, draw: 2000, goal: 2500 },
  },
  {
    id: "national",
    name: "Championnat National",
    shortName: "National",
    type: "league",
    division: "National",
    totalDays: 34,
    trophyIcon: "🥉",
    prestige: 40,
    bonuses: { win: 1500, draw: 600, goal: 700 },
  },
  {
    id: "coupe-de-france",
    name: "Coupe de France",
    shortName: "CDF",
    type: "cup",
    division: "all",
    totalDays: 0,
    trophyIcon: "🎖️",
    prestige: 70,
    bonuses: { win: 10000, draw: 0, goal: 5000 },
  },
  {
    id: "coupe-la-ligue",
    name: "Coupe de la Ligue",
    shortName: "CDL",
    type: "cup",
    division: "all",
    totalDays: 0,
    trophyIcon: "⭐",
    prestige: 55,
    bonuses: { win: 8000, draw: 0, goal: 4000 },
  },
  {
    id: "amical",
    name: "Matchs amicaux",
    shortName: "AMI",
    type: "friendly",
    division: "all",
    totalDays: 0,
    trophyIcon: "🤝",
    prestige: 5,
    bonuses: { win: 500, draw: 200, goal: 300 },
  },
];

export function getCompetition(id: CompetitionId): CompetitionDef {
  const c = COMPETITIONS.find((x) => x.id === id);
  if (!c) throw new Error(`Compétition inconnue: ${id}`);
  return c;
}

/** Compétitions jouables selon la division du club utilisateur. */
export function getCompetitionsForDivision(division: Division): CompetitionId[] {
  const league: CompetitionId =
    division === "Ligue 1" ? "ligue1" : division === "Ligue 2" ? "ligue2" : "national";
  return [league, "coupe-de-france"];
}
