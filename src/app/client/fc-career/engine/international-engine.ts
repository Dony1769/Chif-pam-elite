/**
 * FC CAREER — Étape 13 : Engine Sélection Nationale
 */

import type {
  InternationalState,
  InternationalCareer,
  InternationalMatch,
  InternationalCompetitionType,
  NationalCallUp,
  NationalTeamLevel,
  TournamentRun,
  TournamentStage,
} from "../types/international";

/* ------------------------------------------------------------------ */
/* Country names                                                       */
/* ------------------------------------------------------------------ */

const COUNTRIES: Record<string, string> = {
  FR: "France", DE: "Allemagne", ES: "Espagne", IT: "Italie", GB: "Angleterre",
  PT: "Portugal", NL: "Pays-Bas", BE: "Belgique", BR: "Brésil", AR: "Argentine",
  SN: "Sénégal", CM: "Cameroun", NG: "Nigeria", JP: "Japon", KR: "Corée du Sud",
  US: "États-Unis", MX: "Mexique", CO: "Colombie", UY: "Uruguay", HR: "Croatie",
  PL: "Pologne", SE: "Suède", DK: "Danemark", NO: "Norvège", CH: "Suisse",
  AT: "Autriche", RS: "Serbie", MA: "Maroc", DZ: "Algérie", TN: "Tunisie",
  CI: "Côte d'Ivoire", GH: "Ghana", EG: "Égypte", TR: "Turquie", HT: "Haïti",
};

export function getCountryName(code: string): string {
  return COUNTRIES[code] ?? code;
}

const OPPONENT_POOL = ["DE", "ES", "IT", "GB", "PT", "NL", "BE", "BR", "AR", "SN", "CM", "JP", "US", "MX", "HR", "PL", "SE", "MA", "TR", "CH"];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createInternationalState(): InternationalState {
  return { career: null, breakActive: false, pendingCallUp: null, nextBreakDay: 60 };
}

/* ------------------------------------------------------------------ */
/* Call-up                                                             */
/* ------------------------------------------------------------------ */

export function checkCallUpEligibility(
  overall: number,
  form: number,
  isInjured: boolean,
  age: number,
): { eligible: boolean; level: NationalTeamLevel } {
  if (isInjured || form <= 50) return { eligible: false, level: "A" };
  if (overall >= 78) return { eligible: true, level: "A" };
  if (overall >= 70 && age <= 21) return { eligible: true, level: "U21" };
  return { eligible: false, level: "A" };
}

export function generateCallUp(
  seasonYear: number,
  dayNumber: number,
  level: NationalTeamLevel,
): NationalCallUp {
  return { id: `callup-${seasonYear}-${dayNumber}`, seasonYear, dayNumber, level, accepted: null };
}

/** Accept or refuse a call-up. Returns deltas. */
export function respondToCallUp(
  accepted: boolean,
): { imageDelta: number; coachTrustDelta: number } {
  if (accepted) return { imageDelta: 5, coachTrustDelta: 0 };
  return { imageDelta: -10, coachTrustDelta: 0 };
}

/* ------------------------------------------------------------------ */
/* Captain check                                                       */
/* ------------------------------------------------------------------ */

export function checkCaptainEligibility(
  caps: number,
  overall: number,
  leadership: number,
): boolean {
  return caps >= 30 && overall >= 82 && leadership >= 70;
}

/* ------------------------------------------------------------------ */
/* International matches                                               */
/* ------------------------------------------------------------------ */

function randomOpponent(exclude: string): { name: string; code: string } {
  const pool = OPPONENT_POOL.filter(c => c !== exclude);
  const code = pool[Math.floor(Math.random() * pool.length)];
  return { name: getCountryName(code), code };
}

/** Generate international matches for a break. */
export function generateBreakMatches(
  competitionType: InternationalCompetitionType,
  dayNumber: number,
  playerNationality: string,
  count: number = 2,
): InternationalMatch[] {
  const matches: InternationalMatch[] = [];
  for (let i = 0; i < count; i++) {
    const opp = randomOpponent(playerNationality);
    matches.push({
      id: `intl-${dayNumber}-${i}`,
      competitionType,
      opponent: opp.name,
      opponentCode: opp.code,
      dayNumber: dayNumber + i * 4,
      played: false,
    });
  }
  return matches;
}

/** Simulate an international match result. */
export function simulateInternationalMatch(
  match: InternationalMatch,
  playerOverall: number,
): InternationalMatch {
  const rating = 5.0 + Math.random() * 4.5 + (playerOverall - 75) * 0.05;
  const goals = Math.random() < (playerOverall / 300) ? (Math.random() < 0.3 ? 2 : 1) : 0;
  const assists = Math.random() < (playerOverall / 350) ? 1 : 0;
  const teamScore = Math.floor(Math.random() * 4);
  const oppScore = Math.floor(Math.random() * 3);

  return {
    ...match,
    played: true,
    playerRating: Math.round(Math.min(10, Math.max(4, rating)) * 10) / 10,
    playerGoals: goals,
    playerAssists: assists,
    teamScore: Math.max(teamScore, goals),
    opponentScore: oppScore,
  };
}

/* ------------------------------------------------------------------ */
/* Career update                                                       */
/* ------------------------------------------------------------------ */

export function initCareer(nationality: string, level: NationalTeamLevel): InternationalCareer {
  return {
    team: getCountryName(nationality),
    teamCode: nationality,
    caps: 0,
    goals: 0,
    assists: 0,
    averageRating: 0,
    isCaptain: false,
    level,
    tournaments: [],
    callUps: [],
    matches: [],
  };
}

export function updateCareerWithMatch(career: InternationalCareer, match: InternationalMatch): InternationalCareer {
  const caps = career.caps + 1;
  const goals = career.goals + (match.playerGoals ?? 0);
  const assists = career.assists + (match.playerAssists ?? 0);
  const totalRating = career.averageRating * career.caps + (match.playerRating ?? 6);
  const avgRating = Math.round((totalRating / caps) * 10) / 10;

  return {
    ...career,
    caps,
    goals,
    assists,
    averageRating: avgRating,
    matches: [...career.matches, match],
  };
}

/* ------------------------------------------------------------------ */
/* International breaks schedule                                       */
/* ------------------------------------------------------------------ */

/** International break days in a season (approximate). */
const BREAK_DAYS = [60, 120, 200, 280, 340];

export function getNextBreakDay(currentDay: number): number {
  for (const d of BREAK_DAYS) {
    if (d > currentDay) return d;
  }
  return BREAK_DAYS[0] + 380; // next season
}

/** Determine competition type based on season year. */
export function getCompetitionType(seasonYear: number, breakIndex: number): InternationalCompetitionType {
  // World Cup every 4 years (2026, 2030...), Euro every 4 offset by 2 (2028, 2032...)
  if (seasonYear % 4 === 2 && breakIndex >= 3) return "world-cup";
  if (seasonYear % 4 === 0 && breakIndex >= 3) return "euro";
  if (breakIndex < 2) return "friendly";
  return seasonYear % 2 === 0 ? "euro-qualifier" : "wc-qualifier";
}

/* ------------------------------------------------------------------ */
/* Tournament runs                                                     */
/* ------------------------------------------------------------------ */

const STAGES: TournamentStage[] = ["group", "round-of-16", "quarter-final", "semi-final", "final"];

export function generateTournamentRun(
  type: "world-cup" | "euro",
  year: number,
  playerOverall: number,
  nationality: string,
): TournamentRun {
  // Better players = more likely to advance
  const advanceChance = 0.3 + (playerOverall - 70) * 0.015;
  const matches: InternationalMatch[] = [];
  let furthestStage: TournamentStage = "group";

  for (const stage of STAGES) {
    const opp = randomOpponent(nationality);
    const match: InternationalMatch = {
      id: `tournament-${year}-${stage}`,
      competitionType: type,
      stage,
      opponent: opp.name,
      opponentCode: opp.code,
      dayNumber: 0,
      played: false,
    };
    const simulated = simulateInternationalMatch(match, playerOverall);
    matches.push(simulated);
    furthestStage = stage;

    // Check if eliminated
    if (stage === "group") {
      // Group stage: play 3 matches
      if (Math.random() > advanceChance + 0.2) break;
    } else {
      if ((simulated.teamScore ?? 0) <= (simulated.opponentScore ?? 0) && Math.random() > 0.4) break;
    }
  }

  const playerGoals = matches.reduce((s, m) => s + (m.playerGoals ?? 0), 0);
  const ratings = matches.filter(m => m.playerRating).map(m => m.playerRating!);
  const avgRating = ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;

  return { type, year, stage: furthestStage, matches, playerGoals, playerAvgRating: avgRating };
}
