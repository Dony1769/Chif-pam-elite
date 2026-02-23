import { fetchTodayMatches } from "./fetchMatches";
import { detectValue } from "./valueEngine";
import { createClient } from "@supabase/supabase-js";
import { getTeamStats, setTeamStats } from "./cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Factorial typé TS
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// Poisson pour 1X2 / Over
function poisson(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Calcul 1X2
function calculateProbabilities(homeAvg: number, awayAvg: number) {
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const p = poisson(homeAvg, i) * poisson(awayAvg, j);
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }
  }
  return { home, draw, away };
}

// 🔥 Récupère 10 derniers matchs
async function fetchTeamLastMatches(teamId: number) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`,
    { headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY! } }
  );
  const data = await res.json();
  return data.matches || [];
}

// 🔥 Moyennes buts marqués / encaissés avec pondération forme récente
function calculateWeightedAverages(matches: any[], teamId: number) {
  let goalsFor = 0, goalsAgainst = 0;
  let totalWeight = 0;

  // Poids décroissant pour forme récente (les 5 derniers matchs ont plus d'importance)
  const weights = matches.map((_, idx) =>
    1 + Math.max(0, 5 - idx) * 0.2
  ).reverse(); // Inverse pour que les plus récents soient les plus lourds

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const weight = weights[i];
    const isHome = match.homeTeam.id === teamId;

    const scored = isHome ? match.score.fullTime.home ?? 0 : match.score.fullTime.away ?? 0;
    const conceded = isHome ? match.score.fullTime.away ?? 0 : match.score.fullTime.home ?? 0;

    goalsFor += scored * weight;
    goalsAgainst += conceded * weight;
    totalWeight += weight;
  }

  return {
    avgScored: goalsFor / totalWeight || 1,
    avgConceded: goalsAgainst / totalWeight || 1,
  };
}

// 🔹 Pondération ligues
const leagueWeights: Record<string, number> = {
  "Premier League": 1.2,
  "La Liga": 1.2,
  "Serie A": 1.15,
  "Bundesliga": 1.15,
  "Ligue 1": 1.1,
  default: 1,
};

// 🔹 Pondération domicile / extérieur
const HOME_ADV = 1.1;
const AWAY_DISADV = 0.9;

// 🔥 Génération quotidienne des matchs
export async function generateDailyMatches() {
  const matches = await fetchTodayMatches();

  for (const match of matches) {
    const homeTeam = match.homeTeam.name;
    const awayTeam = match.awayTeam.name;

    // 🔹 Cache pour stats
    const cachedHome = getTeamStats(match.homeTeam.id);
    const cachedAway = getTeamStats(match.awayTeam.id);

    const homeLast = cachedHome ?? await fetchTeamLastMatches(match.homeTeam.id);
    const awayLast = cachedAway ?? await fetchTeamLastMatches(match.awayTeam.id);

    if (!cachedHome) setTeamStats(match.homeTeam.id, homeLast);
    if (!cachedAway) setTeamStats(match.awayTeam.id, awayLast);

    // 🔹 Moyennes pondérées forme récente
    const homeStats = calculateWeightedAverages(homeLast, match.homeTeam.id);
    const awayStats = calculateWeightedAverages(awayLast, match.awayTeam.id);

    // 🔹 Pondération ligue
    const leagueWeight = leagueWeights[match.competition.name] ?? leagueWeights.default;

    // 🔹 Expected goals dynamiques avec pondérations domicile/extérieur + ligue
    const homeExpected = ((homeStats.avgScored * HOME_ADV) + (awayStats.avgConceded * AWAY_DISADV)) / 2 * leagueWeight;
    const awayExpected = ((awayStats.avgScored * AWAY_DISADV) + (homeStats.avgConceded * HOME_ADV)) / 2 * leagueWeight;

    const probs = calculateProbabilities(homeExpected, awayExpected);

    // 🔹 Insertion initiale Supabase
    const { data: insertedData } = await supabase
      .from("pari_predictions")
      .insert({
        home_team: homeTeam,
        away_team: awayTeam,
        league: match.competition.name,
        match_date: match.utcDate,
        expected_goals_home: homeExpected,
        expected_goals_away: awayExpected,
        probability_home: probs.home,
        probability_draw: probs.draw,
        probability_away: probs.away,
        over25: probs.home + probs.away, // valeur temporaire
        mental_score_home: 70,
        mental_score_away: 65,
        value_detected: false,
        risk_level: "MEDIUM",
      })
      .select("id");

    const matchId = insertedData?.[0]?.id;
    if (!matchId) continue;

    // 🔹 Calcul value réel et Over 2.5
    await detectValue(
      matchId,
      homeExpected,
      awayExpected,
      1.9, // cote Home exemple
      3.2, // cote Draw exemple
      4.0  // cote Away exemple
    );
  }
}
