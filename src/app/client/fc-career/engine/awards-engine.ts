/**
 * FC CAREER — Étape 12 : Engine Récompenses & Trophées
 */

import type {
  AwardsState,
  GoldenGlobeCandidate,
  GoldenGlobeCeremony,
  GoldenGlobeResult,
  LeagueAward,
  LeagueAwardType,
  EuropeanAward,
  LeagueRanking,
} from "../types/awards";

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createAwardsState(): AwardsState {
  return {
    goldenGlobes: [],
    leagueAwards: [],
    europeanAwards: [],
    topScorers: [],
    topAssisters: [],
    playerOfMonthHistory: [],
  };
}

/* ------------------------------------------------------------------ */
/* Globe d'Or                                                          */
/* ------------------------------------------------------------------ */

/** Compute a candidate's Globe d'Or score. */
export function computeGoldenGlobeScore(c: Omit<GoldenGlobeCandidate, "score">): number {
  const ratingScore = (c.avgRating / 10) * 30;
  const trophyScore = Math.min(c.collectiveTrophies * 8.33, 25);
  const goalContrib = Math.min((c.goals + c.assists) * 0.5, 20);
  const champScore = (c.championsPerformance / 10) * 15;
  const popScore = (c.popularity / 100) * 10;
  return ratingScore + trophyScore + goalContrib + champScore + popScore;
}

/** Check minimum conditions for Globe d'Or eligibility. */
export function isGoldenGlobeEligible(
  avgRating: number,
  matchesPlayed: number,
  goals: number,
  collectiveTrophies: number,
): boolean {
  if (avgRating < 8.0) return false;
  if (matchesPlayed < 25) return false;
  if (collectiveTrophies < 1 && goals < 20) return false;
  return true;
}

/** Generate AI candidates for the ceremony. */
function generateAICandidates(seasonYear: number): GoldenGlobeCandidate[] {
  const names = [
    "Marco Vitali", "Lucas Ferreira", "Ahmed Al-Rashid", "Tobias Krüger",
    "Pablo Moreno", "Yuki Tanaka", "Samuel Okafor", "Hugo Blanchard",
    "Dimitri Petrov", "Andres Castillo", "Erik Lindqvist", "João Ribeiro",
    "Moussa Diallo", "Liam O'Brien", "Rafael dos Santos", "Karim Benzali",
    "Nils Svensson", "Carlos Ruiz", "Adrien Lefèvre", "William Amoah",
    "Ismaël Traoré", "Thomas Hartmann", "Pierre Dubois", "Santiago Herrera",
    "Ibrahim Konaté", "Mateo Rodríguez", "Florian Meier", "Daniel Osei",
    "Victor Johansson",
  ];
  const clubs = ["paris-sg", "real-madrid", "fc-barcelona", "man-city", "bayern-munich", "juventus", "liverpool", "inter-milan"];

  return names.map((name, i) => {
    const avgRating = 7.2 + Math.random() * 2.3;
    const goals = 5 + Math.floor(Math.random() * 30);
    const assists = 3 + Math.floor(Math.random() * 18);
    const trophies = Math.random() > 0.6 ? 1 + Math.floor(Math.random() * 2) : 0;
    const champPerf = 6.0 + Math.random() * 3.5;
    const pop = 30 + Math.floor(Math.random() * 70);
    const candidate: Omit<GoldenGlobeCandidate, "score"> = {
      playerId: `ai-${i}`,
      name,
      clubId: clubs[i % clubs.length],
      avgRating,
      matchesPlayed: 25 + Math.floor(Math.random() * 20),
      goals,
      assists,
      collectiveTrophies: trophies,
      championsPerformance: champPerf,
      popularity: pop,
    };
    return { ...candidate, score: computeGoldenGlobeScore(candidate) };
  });
}

/** Run the Globe d'Or ceremony. */
export function runGoldenGlobeCeremony(
  seasonYear: number,
  playerName: string,
  playerClubId: string,
  avgRating: number,
  matchesPlayed: number,
  goals: number,
  assists: number,
  collectiveTrophies: number,
  championsPerformance: number,
  popularity: number,
): GoldenGlobeCeremony {
  const aiCandidates = generateAICandidates(seasonYear);

  const eligible = isGoldenGlobeEligible(avgRating, matchesPlayed, goals, collectiveTrophies);
  const playerCandidate: GoldenGlobeCandidate = {
    playerId: "player",
    name: playerName,
    clubId: playerClubId,
    avgRating,
    matchesPlayed,
    goals,
    assists,
    collectiveTrophies,
    championsPerformance,
    popularity,
    score: 0,
  };
  playerCandidate.score = computeGoldenGlobeScore(playerCandidate);

  const allCandidates = eligible ? [...aiCandidates, playerCandidate] : aiCandidates;
  allCandidates.sort((a, b) => b.score - a.score);

  const playerRank = allCandidates.findIndex(c => c.playerId === "player") + 1;

  let playerResult: GoldenGlobeResult = "none";
  if (playerRank === 1) playerResult = "winner";
  else if (playerRank <= 3) playerResult = "finalist";
  else if (playerRank <= 30) playerResult = "nominated";

  return {
    seasonYear,
    candidates: allCandidates.slice(0, 30),
    playerRank: playerRank || 99,
    playerResult,
  };
}

/* ------------------------------------------------------------------ */
/* League rankings                                                     */
/* ------------------------------------------------------------------ */

/** Generate fake league rankings with player injected. */
export function generateLeagueRankings(
  playerName: string,
  playerClubId: string,
  playerGoals: number,
  playerAssists: number,
): { topScorers: LeagueRanking[]; topAssisters: LeagueRanking[] } {
  const fakeScorers = [
    { name: "Marco Vitali", goals: 18 + Math.floor(Math.random() * 12) },
    { name: "Pablo Moreno", goals: 15 + Math.floor(Math.random() * 10) },
    { name: "Lucas Ferreira", goals: 12 + Math.floor(Math.random() * 10) },
    { name: "Samuel Okafor", goals: 10 + Math.floor(Math.random() * 8) },
    { name: "Hugo Blanchard", goals: 8 + Math.floor(Math.random() * 8) },
    { name: "Ahmed Al-Rashid", goals: 7 + Math.floor(Math.random() * 7) },
    { name: "Tobias Krüger", goals: 5 + Math.floor(Math.random() * 7) },
    { name: "Karim Benzali", goals: 4 + Math.floor(Math.random() * 6) },
    { name: "Liam O'Brien", goals: 3 + Math.floor(Math.random() * 5) },
  ];
  const fakeAssisters = [
    { name: "Adrien Lefèvre", assists: 14 + Math.floor(Math.random() * 8) },
    { name: "Mateo Rodríguez", assists: 11 + Math.floor(Math.random() * 7) },
    { name: "Nils Svensson", assists: 9 + Math.floor(Math.random() * 6) },
    { name: "Erik Lindqvist", assists: 7 + Math.floor(Math.random() * 6) },
    { name: "Pierre Dubois", assists: 6 + Math.floor(Math.random() * 5) },
    { name: "Florian Meier", assists: 5 + Math.floor(Math.random() * 5) },
    { name: "Daniel Osei", assists: 4 + Math.floor(Math.random() * 4) },
    { name: "Victor Johansson", assists: 3 + Math.floor(Math.random() * 4) },
    { name: "Santiago Herrera", assists: 2 + Math.floor(Math.random() * 3) },
  ];

  const clubs = ["paris-sg", "real-madrid", "fc-barcelona", "man-city", "bayern-munich", "juventus", "liverpool", "inter-milan", "ac-milan"];

  const scorerEntries: LeagueRanking[] = [
    ...fakeScorers.map((s, i) => ({ rank: 0, playerName: s.name, clubId: clubs[i % clubs.length], value: s.goals, isPlayer: false })),
    { rank: 0, playerName, clubId: playerClubId, value: playerGoals, isPlayer: true },
  ];
  scorerEntries.sort((a, b) => b.value - a.value);
  scorerEntries.forEach((e, i) => (e.rank = i + 1));

  const assisterEntries: LeagueRanking[] = [
    ...fakeAssisters.map((a, i) => ({ rank: 0, playerName: a.name, clubId: clubs[i % clubs.length], value: a.assists, isPlayer: false })),
    { rank: 0, playerName, clubId: playerClubId, value: playerAssists, isPlayer: true },
  ];
  assisterEntries.sort((a, b) => b.value - a.value);
  assisterEntries.forEach((e, i) => (e.rank = i + 1));

  return { topScorers: scorerEntries.slice(0, 10), topAssisters: assisterEntries.slice(0, 10) };
}

/* ------------------------------------------------------------------ */
/* Player of the Month                                                 */
/* ------------------------------------------------------------------ */

/** Check if player wins Player of the Month (simplified). */
export function checkPlayerOfMonth(avgRatingThisMonth: number, goalsThisMonth: number): boolean {
  // Simplified: high performance = win
  return avgRatingThisMonth >= 7.5 && goalsThisMonth >= 3;
}

/* ------------------------------------------------------------------ */
/* League awards at end of season                                      */
/* ------------------------------------------------------------------ */

export function checkLeagueAwards(
  seasonYear: number,
  competitionId: string,
  playerGoals: number,
  playerAssists: number,
  playerAvgRating: number,
  playerAge: number,
  playerPosition: string,
  topScorers: LeagueRanking[],
  topAssisters: LeagueRanking[],
): LeagueAward[] {
  const awards: LeagueAward[] = [];
  const playerName = "Joueur";

  // Top scorer
  const scorerRank = topScorers.find(r => r.isPlayer);
  if (scorerRank && scorerRank.rank === 1) {
    awards.push({ type: "top-scorer", label: "Meilleur Buteur", seasonYear, competitionId, playerName, value: playerGoals });
  }

  // Top assister
  const assisterRank = topAssisters.find(r => r.isPlayer);
  if (assisterRank && assisterRank.rank === 1) {
    awards.push({ type: "top-assister", label: "Meilleur Passeur", seasonYear, competitionId, playerName, value: playerAssists });
  }

  // Best player (avg rating >= 8.0 and top 3 in either goals or assists)
  if (playerAvgRating >= 8.0 && ((scorerRank && scorerRank.rank <= 3) || (assisterRank && assisterRank.rank <= 3))) {
    awards.push({ type: "best-player", label: "Meilleur Joueur", seasonYear, competitionId, playerName, value: playerAvgRating });
  }

  // Best young (U21)
  if (playerAge <= 21 && playerAvgRating >= 7.0) {
    awards.push({ type: "best-young", label: "Meilleur Jeune", seasonYear, competitionId, playerName, value: playerAvgRating });
  }

  // Best goalkeeper
  if (playerPosition === "GK" && playerAvgRating >= 7.5) {
    awards.push({ type: "best-goalkeeper", label: "Meilleur Gardien", seasonYear, competitionId, playerName, value: playerAvgRating });
  }

  return awards;
}

/* ------------------------------------------------------------------ */
/* European awards                                                     */
/* ------------------------------------------------------------------ */

const LEAGUE_COEFFICIENTS: Record<string, number> = {
  "ligue-1": 2, "premier-league": 2, "la-liga": 2, "serie-a": 2, "bundesliga": 2,
};

/** Check Golden Boot (Soulier d'Or). */
export function checkGoldenBoot(
  seasonYear: number,
  playerGoals: number,
  competitionId: string,
): EuropeanAward | null {
  const coeff = LEAGUE_COEFFICIENTS[competitionId] ?? 1;
  const adjustedGoals = playerGoals * coeff;
  // Threshold: 40+ adjusted goals is competitive
  if (adjustedGoals >= 40) {
    return { type: "golden-boot", label: "Soulier d'Or d'Europa", seasonYear, playerName: "Joueur", value: adjustedGoals };
  }
  return null;
}
