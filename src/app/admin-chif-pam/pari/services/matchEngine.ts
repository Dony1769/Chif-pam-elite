"use server"; // ✅ Next.js server component directive

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

// Poisson
function poisson(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Dixon-Coles correction pour matchs serrés (0-0, 1-0, 0-1, 1-1)
function dixonColesCorrection(i: number, j: number, lambda: number, mu: number): number {
  if (i === 0 && j === 0) return 0.95;
  if (i === 0 && j === 1) return 0.95;
  if (i === 1 && j === 0) return 0.95;
  if (i === 1 && j === 1) return 0.95;
  return 1;
}

// Calcul des probabilités 1X2 corrigées
function calculateProbabilities(homeAvg: number, awayAvg: number) {
  let home = 0, draw = 0, away = 0;

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const baseProb = poisson(homeAvg, i) * poisson(awayAvg, j);
      const correction = dixonColesCorrection(i, j, homeAvg, awayAvg);
      const p = baseProb * correction;

      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }
  }

  return { home, draw, away };
}

// Récupère 10 derniers matchs
async function fetchTeamLastMatches(teamId: number) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`,
    { headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY! } }
  );
  const data = await res.json();
  return data.matches || [];
}

// Moyennes buts marqués / encaissés avec pondération forme récente
function calculateAverages(matches: any[], teamId: number) {
  let goalsFor = 0, goalsAgainst = 0;
  let totalWeight = 0;

  // Pondération forme récente : derniers matchs ont plus de poids
  const weights = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2]; // 10 derniers matchs
  for (let idx = 0; idx < matches.length; idx++) {
    const match = matches[idx];
    const weight = weights[idx] ?? 1;
    const isHome = match.homeTeam.id === teamId;

    if (isHome) {
      goalsFor += (match.score.fullTime.home ?? 0) * weight;
      goalsAgainst += (match.score.fullTime.away ?? 0) * weight;
    } else {
      goalsFor += (match.score.fullTime.away ?? 0) * weight;
      goalsAgainst += (match.score.fullTime.home ?? 0) * weight;
    }
    totalWeight += weight;
  }

  return {
    avgScored: goalsFor / totalWeight || 1,
    avgConceded: goalsAgainst / totalWeight || 1,
  };
}

// Pondération ligue (exemple)
function leagueWeight(leagueName: string): number {
  const weights: Record<string, number> = {
    "Premier League": 1.1,
    "La Liga": 1.05,
    "Serie A": 1.0,
    "Bundesliga": 1.0,
    "Ligue 1": 0.95,
  };
  return weights[leagueName] ?? 1;
}

// 🔥 Génération quotidienne
export async function generateDailyMatches() {
  const matches = await fetchTodayMatches();

  for (const match of matches) {
    const homeTeam = match.homeTeam.name;
    const awayTeam = match.awayTeam.name;

    // Cache pour stats
    const cachedHome = getTeamStats(match.homeTeam.id);
    const cachedAway = getTeamStats(match.awayTeam.id);

    const homeLast = cachedHome ?? await fetchTeamLastMatches(match.homeTeam.id);
    const awayLast = cachedAway ?? await fetchTeamLastMatches(match.awayTeam.id);

    if (!cachedHome) setTeamStats(match.homeTeam.id, homeLast);
    if (!cachedAway) setTeamStats(match.awayTeam.id, awayLast);

    const homeStats = calculateAverages(homeLast, match.homeTeam.id);
    const awayStats = calculateAverages(awayLast, match.awayTeam.id);

    // 🔹 Pondération domicile / extérieur + poids ligue
    const homeAdvantage = 1.1; // 10% avantage domicile
    const awayDisadvantage = 0.9; // 10% désavantage extérieur
    const leagueCoef = leagueWeight(match.competition.name);

    const homeExpected = ((homeStats.avgScored * homeAdvantage) + awayStats.avgConceded) / 2 * leagueCoef;
    const awayExpected = ((awayStats.avgScored * awayDisadvantage) + homeStats.avgConceded) / 2 * leagueCoef;

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

    // 🔥 Calcul value réel + Over 2.5 avec cotes entrées manuellement
    await detectValue(
      matchId,
      homeExpected,
      awayExpected,
      1.9, // cote Home (à entrer manuellement)
      3.2, // cote Draw
      4.0  // cote Away
    );
  }
        }
