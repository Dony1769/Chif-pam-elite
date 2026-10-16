/**
 * FC CAREER — Sélection nationale
 * Convocations, matchs internationaux, compétitions, objectifs.
 * Pur domaine — aucune dépendance React.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export type NationalCompetitionType =
  | "friendly"          // Match amical
  | "qualifier"         // Éliminatoire de championnat
  | "tournament"        // Tournoi régional
  | "world_cup";        // Coupe du Monde

export type NationalMatchResult = "win" | "draw" | "loss";

export interface NationalMatch {
  id: string;
  season: number;
  week: number;
  competition: NationalCompetitionType;
  opponentCountry: string;
  opponentFlag: string;
  scoreFor: number;
  scoreAgainst: number;
  playerGoals: number;
  playerAssists: number;
  playerRating: number;
  minutesPlayed: number;
  result: NationalMatchResult;
  isHome: boolean;
}

export interface NationalCallup {
  id: string;
  season: number;
  week: number;
  competition: NationalCompetitionType;
  competitionLabel: string;
  opponentCountries: string[]; // Liste des adversaires dans la fenêtre
  confirmed: boolean;
}

export interface NationalTeamState {
  /** Actuellement en liste des sélectionnés */
  called: boolean;
  /** Nombre total de sélections */
  caps: number;
  /** Buts en sélection */
  goals: number;
  /** Passes décisives en sélection */
  assists: number;
  /** Dernière saison de convocation */
  lastCallSeason: number | null;
  /** Matchs internationaux joués */
  matches: NationalMatch[];
  /** Convocations en attente ou passées */
  callups: NationalCallup[];
  /** Rang dans l'équipe nationale (0 = réserviste, 1-11 = titulaire potentiel) */
  squadRank: number;
  /** Titre de capitaine national */
  isNationalCaptain: boolean;
  /** Compétitions majeures gagnées */
  majorTrophies: Array<{ label: string; season: number; icon: string }>;
}

/* ── Initialisation ─────────────────────────────────────────────────── */

export function createInitialNationalTeam(): NationalTeamState {
  return {
    called: false,
    caps: 0,
    goals: 0,
    assists: 0,
    lastCallSeason: null,
    matches: [],
    callups: [],
    squadRank: 0,
    isNationalCaptain: false,
    majorTrophies: [],
  };
}

/* ── Logique de convocation ──────────────────────────────────────────── */

/** Seuil OVR pour être convoqué */
export function nationalCallupThreshold(season: number): number {
  // Plus difficile au fil des saisons (la concurrence augmente)
  if (season <= 3) return 68;
  if (season <= 6) return 70;
  if (season <= 10) return 72;
  return 74;
}

/** Vérifie si le joueur devrait être convoqué cette saison */
export function shouldBeCalledUp(
  overall: number,
  age: number,
  season: number,
  lastCallSeason: number | null,
): boolean {
  if (age > 37) return false; // Trop vieux pour la sélection
  const threshold = nationalCallupThreshold(season);
  if (overall < threshold) return false;
  // Convocation garantie si assez bon, sinon probabilité basée sur OVR
  const bonus = overall - threshold;
  const probability = Math.min(0.95, 0.5 + bonus * 0.04);
  // On utilise une seed déterministe basée sur saison pour cohérence
  const pseudoRandom = ((season * 2654435761) >>> 0) / 4294967296;
  return pseudoRandom < probability;
}

/* ── Simulation de match international ─────────────────────────────── */

const NATIONAL_OPPONENTS = [
  { country: "Nordheim",  flag: "⬜", strength: 75 },
  { country: "Corenthia", flag: "🟥", strength: 70 },
  { country: "Solendra",  flag: "🟨", strength: 68 },
  { country: "Valtara",   flag: "🟦", strength: 72 },
  { country: "Estravia",  flag: "🟩", strength: 65 },
  { country: "Forencia",  flag: "🔶", strength: 78 },
  { country: "Kassevia",  flag: "🟣", strength: 62 },
  { country: "Drakmoor",  flag: "⬛", strength: 80 },
];

export function simulateNationalMatch(
  playerOverall: number,
  playerAge: number,
  competition: NationalCompetitionType,
  opponentStrength: number,
  season: number,
  week: number,
  rng: () => number,
): Omit<NationalMatch, "id" | "opponentCountry" | "opponentFlag"> {
  const teamStrength = playerOverall + (rng() * 10 - 5);
  const opponentScore = Math.max(0, Math.round(opponentStrength / 25 - 1 + rng() * 3 - 1));
  const teamScore = Math.max(0, Math.round(teamStrength / 25 - 1 + rng() * 3 - 1));

  const result: NationalMatchResult = teamScore > opponentScore ? "win"
    : teamScore < opponentScore ? "loss"
    : "draw";

  // Performance personnelle basée sur l'OVR
  const baseRating = 5 + (playerOverall / 100) * 4;
  const playerRating = Math.round(Math.max(3, Math.min(10, baseRating + (rng() * 3 - 1.5))) * 10) / 10;

  // Position : attaquant ou MF marque plus
  const playerGoals = rng() < 0.25 ? 1 : rng() < 0.05 ? 2 : 0;
  const playerAssists = playerGoals === 0 && rng() < 0.2 ? 1 : 0;

  return {
    season,
    week,
    competition,
    scoreFor: teamScore,
    scoreAgainst: opponentScore,
    playerGoals,
    playerAssists,
    playerRating,
    minutesPlayed: 90,
    result,
    isHome: rng() < 0.5,
  };
}

/* ── Mise à jour fin de saison ──────────────────────────────────────── */

export function updateNationalTeamEndOfSeason(
  state: NationalTeamState,
  playerOverall: number,
  playerAge: number,
  season: number,
  rng: () => number,
): NationalTeamState {
  const called = shouldBeCalledUp(playerOverall, playerAge, season, state.lastCallSeason);

  if (!called) {
    return { ...state, called: false };
  }

  // Générer 1-2 matchs par saison si convoqué
  const matchCount = rng() < 0.5 ? 1 : 2;
  const competition: NationalCompetitionType = season % 4 === 0 ? "qualifier"
    : season % 6 === 0 ? "tournament"
    : "friendly";

  const newMatches: NationalMatch[] = [];
  let totalGoals = state.goals;
  let totalAssists = state.assists;

  for (let i = 0; i < matchCount; i++) {
    const opponentIdx = Math.floor(rng() * NATIONAL_OPPONENTS.length);
    const opponent = NATIONAL_OPPONENTS[opponentIdx];
    const matchData = simulateNationalMatch(
      playerOverall, playerAge, competition, opponent.strength,
      season, 30 + i * 4, rng
    );
    const match: NationalMatch = {
      ...matchData,
      id: `nat-${season}-${i}`,
      opponentCountry: opponent.country,
      opponentFlag: opponent.flag,
    };
    newMatches.push(match);
    totalGoals += match.playerGoals;
    totalAssists += match.playerAssists;
  }

  // Rang dans l'équipe (basé sur OVR)
  const squadRank = playerOverall >= 80 ? Math.floor(rng() * 5) + 1
    : playerOverall >= 72 ? Math.floor(rng() * 7) + 4
    : 10;

  return {
    ...state,
    called: true,
    caps: state.caps + matchCount,
    goals: totalGoals,
    assists: totalAssists,
    lastCallSeason: season,
    matches: [...newMatches, ...state.matches].slice(0, 30),
    squadRank,
  };
}

/* ── Compétition de type ─────────────────────────────────────────────── */

export const COMPETITION_LABELS: Record<NationalCompetitionType, string> = {
  friendly:    "Match amical",
  qualifier:   "Éliminatoire",
  tournament:  "Tournoi régional",
  world_cup:   "Coupe du Monde",
};

export const COMPETITION_ICONS: Record<NationalCompetitionType, string> = {
  friendly:    "🤝",
  qualifier:   "🏆",
  tournament:  "🎖️",
  world_cup:   "🌍",
};
