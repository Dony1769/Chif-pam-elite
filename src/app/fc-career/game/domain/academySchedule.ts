/**
 * FC CAREER — Génération du calendrier académique
 * Vraie ligue jeunes : 10 équipes, 18 journées (A/R) + tournois + matchs amicaux.
 * Sélection titulaire/remplaçant, évaluation coach après chaque match, recruteurs.
 */

import type { Career, AcademyState } from "./career";
import type { Fixture, SeasonSchedule } from "./season";
import { createRng, seedFromString } from "../utils/random";
import { generateId } from "../utils/ids";

export const ACADEMY_SEASON_WEEKS = 38;
export const PROMOTION_THRESHOLD = 80;  // score pour passer pro
export const RELEGATION_THRESHOLD = 30; // score pour être renvoyé

/* ── Équipes adverses de la ligue jeunes ──────────────────────────── */

export const YOUTH_LEAGUE_OPPONENTS = [
  { id: "albion-u18",       name: "Albion U18",        strength: 72 },
  { id: "riverside-acad",   name: "Riverside Academy", strength: 65 },
  { id: "north-city-youth", name: "North City Youth",  strength: 80 },
  { id: "east-end-u18",     name: "East End U18",      strength: 58 },
  { id: "westbrook-youth",  name: "Westbrook Youth",   strength: 70 },
  { id: "harbor-acad",      name: "Harbor Academy",    strength: 75 },
  { id: "southgate-u18",    name: "Southgate U18",     strength: 62 },
  { id: "forest-acad",      name: "Forest Academy",    strength: 68 },
  { id: "united-youth",     name: "United Youth",      strength: 85 },
];

/* ── Types académie ────────────────────────────────────────────────── */

export type StartingStatus = "starter" | "sub" | "unused";

export interface AcademyMatchContext {
  fixtureId: string;
  competitionId: "youth-league" | "academy-cup" | "friendly";
  opponentId: string;
  opponentName: string;
  opponentStrength: number;
  isHome: boolean;
  matchday: number;
  /** Rôle du joueur dans ce match (décidé par le coach selon l'entraînement) */
  startingStatus: StartingStatus;
  /** Évaluation coach post-match (remplie après le match) */
  postMatchEval?: AcademyPostMatchEval;
}

export interface AcademyPostMatchEval {
  rating: number;          // 1-10
  goals: number;
  assists: number;
  minutesPlayed: number;
  coachComment: string;
  coachObjectiveForNext: string;
  recruiterNoticed: boolean;
  recruiterClubId?: string;
  evalScoreDelta: number;  // +/- sur le score d'évaluation académie
}

/* ── Génération du calendrier complet ─────────────────────────────── */

export function generateAcademySchedule(
  careerId: string,
  season: number,
): SeasonSchedule {
  const rng = createRng(seedFromString(`${careerId}-acad-s${season}`));
  const fixtures: Fixture[] = [];
  let matchday = 1;

  // 1. Ligue jeunes (18 matchdays: aller-retour contre 9 équipes)
  const opponents = [...YOUTH_LEAGUE_OPPONENTS];
  // Génère les 18 matchs de ligue (matchdays 1,3,5,7,9,11,13,15,17,21,23,25,27,29,31,33,35,37)
  const leagueWeeks = [1,3,5,7,9,11,13,15,17,21,23,25,27,29,31,33,35,37];
  // Aller
  for (let i = 0; i < 9; i++) {
    const opp = opponents[i];
    const isHome = rng.chance(0.5);
    fixtures.push({
      id: generateId("yl"),
      season,
      matchday,
      competitionId: "youth-league",
      homeClubId: isHome ? "academy" : opp.id,
      awayClubId: isHome ? opp.id : "academy",
      result: null,
    });
    matchday++;
  }
  // Retour (inverser domicile/extérieur)
  for (let i = 0; i < 9; i++) {
    const opp = opponents[i];
    // Trouver le premier match aller pour inverser
    const firstMatch = fixtures.find(f =>
      f.competitionId === "youth-league" &&
      (f.homeClubId === opp.id || f.awayClubId === opp.id)
    );
    const firstIsHome = firstMatch?.homeClubId === "academy";
    // Retour = inverse
    const isHome = !firstIsHome;
    fixtures.push({
      id: generateId("yl"),
      season,
      matchday,
      competitionId: "youth-league",
      homeClubId: isHome ? "academy" : opp.id,
      awayClubId: isHome ? opp.id : "academy",
      result: null,
    });
    matchday++;
  }

  // Réassigner les matchdays aux semaines correctes
  const leagueFixtures = fixtures.filter(f => f.competitionId === "youth-league");
  leagueFixtures.forEach((f, i) => {
    f.matchday = leagueWeeks[i] ?? (leagueWeeks[leagueWeeks.length - 1] + (i - leagueWeeks.length + 1) * 2);
  });

  // 2. Coupe académie (phases de groupes + KO aux semaines 18, 20, 26, 32, 36)
  const cupWeeks = [18, 20, 26, 32, 36];
  const cupRounds = ["group-1", "group-2", "quarterfinal", "semifinal", "final"];
  for (let i = 0; i < cupWeeks.length; i++) {
    const opp = rng.pick(opponents);
    const isHome = rng.chance(0.5);
    fixtures.push({
      id: generateId("cup"),
      season,
      matchday: cupWeeks[i],
      competitionId: "academy-cup",
      homeClubId: isHome ? "academy" : opp.id,
      awayClubId: isHome ? opp.id : "academy",
      result: null,
    });
  }

  // 3. Matchs amicaux (semaines 2, 16, 38)
  const friendlyWeeks = [2, 16, 38];
  for (const week of friendlyWeeks) {
    const opp = rng.pick(opponents);
    const isHome = rng.chance(0.5);
    fixtures.push({
      id: generateId("fr"),
      season,
      matchday: week,
      competitionId: "friendly",
      homeClubId: isHome ? "academy" : opp.id,
      awayClubId: isHome ? opp.id : "academy",
      result: null,
    });
  }

  const totalMatchdays = 38;

  return {
    season,
    competitionId: "youth-league",
    fixtures,
    currentMatchday: 1,
    totalMatchdays,
  };
}

/* ── Décision titulaire/remplaçant ─────────────────────────────────── */

/**
 * Le coach choisit le statut du joueur selon ses performances récentes.
 * trainingScore: note d'entraînement de la semaine (0-100)
 * evalScore: score d'évaluation académie (0-100)
 */
export function decideStartingStatus(
  trainingScore: number,
  evalScore: number,
  competitionId: string,
  rng: ReturnType<typeof createRng>,
): StartingStatus {
  // Score combiné
  const combined = trainingScore * 0.6 + evalScore * 0.4;

  if (competitionId === "friendly") {
    // En amical, plus de rotation — plus facile d'être titulaire
    if (combined >= 55) return "starter";
    if (combined >= 35) return "sub";
    return rng.chance(0.4) ? "sub" : "unused";
  }

  if (combined >= 75) return "starter";
  if (combined >= 50) return rng.chance(0.7) ? "starter" : "sub";
  if (combined >= 35) return "sub";
  return rng.chance(0.3) ? "sub" : "unused";
}

/* ── Évaluation coach post-match ───────────────────────────────────── */

export function generatePostMatchEval(
  matchRating: number,
  goals: number,
  assists: number,
  minutesPlayed: number,
  startingStatus: StartingStatus,
  currentEvalScore: number,
  rng: ReturnType<typeof createRng>,
): AcademyPostMatchEval {
  // Delta sur le score d'évaluation
  let delta = 0;
  if (minutesPlayed >= 60) {
    if (matchRating >= 8.0) delta = 8;
    else if (matchRating >= 7.0) delta = 5;
    else if (matchRating >= 6.0) delta = 2;
    else if (matchRating >= 5.0) delta = -2;
    else delta = -5;
  } else if (minutesPlayed > 0) {
    if (matchRating >= 7.5) delta = 4;
    else if (matchRating >= 6.5) delta = 2;
    else if (matchRating >= 5.5) delta = 0;
    else delta = -2;
  } else {
    delta = -1; // Non utilisé
  }

  // Bonus buts/passes
  delta += goals * 3 + assists * 2;

  // Commentaire coach
  const coachComment = pickCoachComment(matchRating, minutesPlayed, goals, startingStatus, rng);
  const coachObjectiveForNext = pickNextObjective(matchRating, currentEvalScore + delta, rng);

  // Recruteur (chance proportionnelle à la perf)
  const recruiterChance = matchRating >= 8.5 ? 0.25 : matchRating >= 7.5 ? 0.12 : matchRating >= 7.0 ? 0.05 : 0;
  const recruiterNoticed = rng.chance(recruiterChance);
  const recruiterClubs = ["fc-meridian", "athletic-united", "city-fc", "dynamo-fc", "sport-club"];
  const recruiterClubId = recruiterNoticed ? rng.pick(recruiterClubs) : undefined;

  return {
    rating: matchRating,
    goals,
    assists,
    minutesPlayed,
    coachComment,
    coachObjectiveForNext,
    recruiterNoticed,
    recruiterClubId,
    evalScoreDelta: Math.max(-15, Math.min(15, delta)),
  };
}

function pickCoachComment(
  rating: number,
  minutes: number,
  goals: number,
  status: StartingStatus,
  rng: ReturnType<typeof createRng>,
): string {
  if (minutes === 0) {
    return rng.pick([
      "Tu n'as pas eu de temps de jeu aujourd'hui. Travaille à l'entraînement pour mériter ta place.",
      "Match difficile pour toi — tu es resté sur le banc. Montre-moi plus à l'entraînement.",
    ]);
  }
  if (goals >= 2) {
    return rng.pick([
      `${goals} buts ! C'est exactement ce que j'attendais de toi. Continue sur cette lancée.`,
      "Double but — tu as été décisif. Les recruteurs remarquent ce genre de performances.",
    ]);
  }
  if (rating >= 8.0) {
    return rng.pick([
      "Excellente prestation. Tu mérites ta place de titulaire.",
      "Très bon match. Tu grandis à chaque rencontre.",
      "C'est ce niveau que j'attendais de toi. Garde ça.",
    ]);
  }
  if (rating >= 7.0) {
    return rng.pick([
      "Bon match dans l'ensemble. Il y a encore des détails à affiner.",
      "Solide. Pas parfait, mais tu es dans la bonne direction.",
    ]);
  }
  if (rating >= 6.0) {
    return rng.pick([
      "Match correct mais sans éclat. Tu peux mieux faire.",
      "Moyen. J'attends plus de toi la semaine prochaine.",
    ]);
  }
  if (rating >= 5.0) {
    return rng.pick([
      "En dessous de ce que j'attends. Tu dois hausser le niveau.",
      "Match difficile. Remets-toi en question et travaille.",
    ]);
  }
  return rng.pick([
    "Mauvaise prestation. Si ça continue, ta place n'est pas garantie.",
    "Je suis déçu. Tu as les capacités pour mieux faire — montre-le.",
  ]);
}

function pickNextObjective(
  rating: number,
  newEvalScore: number,
  rng: ReturnType<typeof createRng>,
): string {
  if (newEvalScore >= 75) {
    return rng.pick([
      "Maintiens ce niveau élevé — une promotion en réserve est possible.",
      "Continue comme ça et tu pourrais rejoindre le groupe pro rapidement.",
    ]);
  }
  if (rating >= 7.0) {
    return rng.pick([
      "Obtiens une note de 7+ lors du prochain match.",
      "Sois décisif (but ou passe) lors du prochain match.",
    ]);
  }
  if (rating >= 6.0) {
    return rng.pick([
      "Améliore tes duels — tu en as perdu trop aujourd'hui.",
      "Sois plus présent dans les phases défensives.",
      "Travaille ta première touche de balle à l'entraînement.",
    ]);
  }
  return rng.pick([
    "Concentre-toi sur les bases — positionnement et intensité.",
    "Revois tes fondamentaux à l'entraînement cette semaine.",
  ]);
}

/* ── Ligue jeunes : classement ─────────────────────────────────────── */

export interface YouthLeagueRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/** Construit le classement initial de la ligue jeunes */
export function buildInitialYouthLeagueStanding(): YouthLeagueRow[] {
  const teams: { id: string; name: string }[] = [
    { id: "academy", name: "Mon Académie" },
    ...YOUTH_LEAGUE_OPPONENTS.map(o => ({ id: o.id, name: o.name })),
  ];
  return teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
}

/** Simule un match de la ligue jeunes entre l'académie et un adversaire */
export function simulateYouthMatch(
  opponentStrength: number,
  playerEvalScore: number,
  startingStatus: StartingStatus,
  rng: ReturnType<typeof createRng>,
): { scoreAcademy: number; scoreOpp: number } {
  const academyStr = 0.3 + (playerEvalScore / 100) * 0.5;
  const oppStr = 0.2 + (opponentStrength / 100) * 0.6;

  // Avantage domicile géré par l'appelant
  const avgGoals = 2.2;
  const totalGoals = Math.round(rng.float(0, avgGoals * 1.8));
  const total = academyStr + oppStr;
  const acadBias = academyStr / total;

  let scoreAcademy = 0;
  let scoreOpp = 0;
  for (let i = 0; i < totalGoals; i++) {
    if (rng.chance(acadBias)) scoreAcademy++;
    else scoreOpp++;
  }
  return { scoreAcademy, scoreOpp };
}

/* ── État initial de l'académie ─────────────────────────────────────── */

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
