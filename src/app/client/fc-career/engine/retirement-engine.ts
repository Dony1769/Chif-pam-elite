/**
 * FC CAREER — Étape 19 : Engine Retraite, Vie Après & Héritage
 */

import type {
  RetirementState,
  RetirementInfo,
  RetirementReason,
  LegacyScoreBreakdown,
  Ending,
  EndingTier,
  PostCareerRole,
  PostCareerOption,
  PostCareerState,
  LegacyPlayer,
} from "../types/retirement";

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createRetirementState(): RetirementState {
  return {
    retired: false,
    retirementInfo: null,
    legacyScore: null,
    ending: null,
    postCareer: null,
    legacyPlayers: [],
  };
}

/* ------------------------------------------------------------------ */
/* Retirement Checks                                                   */
/* ------------------------------------------------------------------ */

export function canRetireVoluntarily(age: number): boolean {
  return age >= 32;
}

export function checkForcedRetirement(
  age: number,
  overall: number,
  hasClub: boolean,
  recurringInjuries: number,
): RetirementReason | null {
  if (age > 38) return "forced-age";
  if (overall < 60 && !hasClub) return "forced-rating";
  if (recurringInjuries >= 5) return "forced-injury";
  return null;
}

export function retire(
  state: RetirementState,
  reason: RetirementReason,
  age: number,
  day: number,
  seasonYear: number,
  farewellMatch: boolean,
): RetirementState {
  const info: RetirementInfo = { reason, age, day, seasonYear, farewellMatch };
  return { ...state, retired: true, retirementInfo: info };
}

/* ------------------------------------------------------------------ */
/* Legacy Score                                                        */
/* ------------------------------------------------------------------ */

export interface LegacyInput {
  championships: number;
  cups: number;
  championsLeague: number;
  europaLeague: number;
  worldCup: number;
  euro: number;
  totalGoals: number;
  totalCaps: number;
  avgRating: number;
  goldenGlobes: number;
  goldenBoots: number;
  bestPlayer: number;
  countriesPlayed: number;
  wasCaptainClub: boolean;
  wasCaptainNational: boolean;
  yearsAtOneClub: number;
}

export function computeLegacyScore(input: LegacyInput): LegacyScoreBreakdown {
  // Trophies (max 35)
  let trophies = 0;
  trophies += Math.min(input.championships * 5, 15);
  trophies += Math.min(input.cups * 3, 9);
  trophies += Math.min(input.championsLeague * 8, 16);
  trophies += Math.min(input.europaLeague * 4, 8);
  trophies += Math.min(input.worldCup * 10, 10);
  trophies += Math.min(input.euro * 7, 7);
  trophies = Math.min(trophies, 35);

  // Stats (max 25)
  let stats = 0;
  if (input.totalGoals >= 300) stats += 15;
  else if (input.totalGoals >= 200) stats += 10;
  else if (input.totalGoals >= 100) stats += 5;
  if (input.totalCaps >= 100) stats += 7;
  else if (input.totalCaps >= 50) stats += 3;
  if (input.avgRating > 7.5) stats += 5;
  else if (input.avgRating > 7.0) stats += 3;
  stats = Math.min(stats, 25);

  // Awards (max 25)
  let awards = 0;
  awards += Math.min(input.goldenGlobes * 8, 24);
  awards += Math.min(input.goldenBoots * 4, 8);
  awards += Math.min(input.bestPlayer * 3, 6);
  awards = Math.min(awards, 25);

  // Career (max 15)
  let career = 0;
  if (input.countriesPlayed >= 3) career += 3;
  if (input.wasCaptainClub) career += 2;
  if (input.wasCaptainNational) career += 5;
  if (input.yearsAtOneClub >= 10) career += 5;
  career = Math.min(career, 15);

  const total = Math.min(trophies + stats + awards + career, 100);

  return { trophies, stats, awards, career, total };
}

/* ------------------------------------------------------------------ */
/* Endings                                                             */
/* ------------------------------------------------------------------ */

function getEndingTier(score: number): EndingTier {
  if (score >= 90) return "living-legend";
  if (score >= 75) return "icon";
  if (score >= 60) return "solid";
  if (score >= 40) return "average";
  if (score >= 20) return "wasted";
  return "broken";
}

const ENDINGS: Record<EndingTier, Omit<Ending, "tier">> = {
  "living-legend": { emoji: "🏛️", title: "LÉGENDE VIVANTE", description: "Statue devant le stade. Ton nom est éternel." },
  "icon": { emoji: "⭐", title: "ICÔNE", description: "Carrière exceptionnelle. Respecté par tous." },
  "solid": { emoji: "🎖️", title: "CARRIÈRE SOLIDE", description: "Bon pro, respecté. Reconversion possible." },
  "average": { emoji: "📋", title: "CARRIÈRE MOYENNE", description: "Sans éclat. Peu de souvenirs." },
  "wasted": { emoji: "😔", title: "TALENT GÂCHÉ", description: "Blessures ou mauvais choix. Le « et si... »" },
  "broken": { emoji: "💀", title: "CARRIÈRE BRISÉE", description: "Scandales, faillite. Ton nom = échec." },
};

export function getEnding(score: number): Ending {
  const tier = getEndingTier(score);
  return { tier, ...ENDINGS[tier] };
}

/* ------------------------------------------------------------------ */
/* Post-Career                                                         */
/* ------------------------------------------------------------------ */

const POST_CAREER_OPTIONS: PostCareerOption[] = [
  { role: "tv-consultant", label: "Consultant TV", emoji: "🎙️", description: "Tu commentes les matchs et donnes ton avis.", minScore: 40, minLeadership: 0 },
  { role: "coach", label: "Entraîneur", emoji: "⚽", description: "Tu gères une équipe : formation, tactique, recrutement.", minScore: 60, minLeadership: 70 },
  { role: "sporting-director", label: "Directeur sportif", emoji: "🏢", description: "Tu recrutes des joueurs et gères le budget.", minScore: 70, minLeadership: 0 },
  { role: "peaceful-retirement", label: "Retraite paisible", emoji: "🏖️", description: "Tu vis de tes investissements.", minScore: 0, minLeadership: 0 },
];

export function getAvailablePostCareerOptions(legacyScore: number, leadership: number): PostCareerOption[] {
  return POST_CAREER_OPTIONS.filter(o => legacyScore >= o.minScore && leadership >= o.minLeadership);
}

export function choosePostCareer(
  state: RetirementState,
  role: PostCareerRole,
  wealth: number,
): RetirementState {
  const postCareer: PostCareerState = {
    role,
    popularity: role === "tv-consultant" ? 50 : 0,
    teamManaged: role === "coach" || role === "sporting-director" ? "À déterminer" : "",
    wealth,
  };
  return { ...state, postCareer };
}

export function applyLegacyAndEnding(
  state: RetirementState,
  input: LegacyInput,
): RetirementState {
  const legacyScore = computeLegacyScore(input);
  const ending = getEnding(legacyScore.total);
  return { ...state, legacyScore, ending };
}

/* ------------------------------------------------------------------ */
/* Cross-Career Legacy                                                 */
/* ------------------------------------------------------------------ */

export function createLegacyPlayer(
  name: string,
  position: string,
  clubs: string[],
  goals: number,
  assists: number,
  caps: number,
  trophies: number,
  legacyScore: number,
  postCareerRole: PostCareerRole | null,
): LegacyPlayer {
  const endingTier = getEndingTier(legacyScore);
  return {
    name,
    position,
    clubs,
    goals,
    assists,
    caps,
    trophies,
    legacyScore,
    endingTier,
    hasStatue: legacyScore >= 90,
    postCareerRole,
  };
}

export function addLegacyPlayer(state: RetirementState, legacy: LegacyPlayer): RetirementState {
  return { ...state, legacyPlayers: [...state.legacyPlayers, legacy] };
}
