import { fetchTodayMatches } from "./fetchMatches";
import { detectValue } from "./valueEngine";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Factorial typé TS
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function poisson(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function calculateProbabilities(homeAvg: number, awayAvg: number) {
  let home = 0;
  let draw = 0;
  let away = 0;

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

// 🔥 Récupère 10 derniers matchs d'une équipe
async function fetchTeamLastMatches(teamId: number) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`,
    {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_API_KEY!,
      },
    }
  );
  const data = await res.json();
  return data.matches || [];
}

// 🔥 Moyennes buts marqués / encaissés
function calculateAverages(matches: any[], teamId: number) {
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of matches) {
    const isHome = match.homeTeam.id === teamId;
    if (isHome) {
      goalsFor += match.score.fullTime.home ?? 0;
      goalsAgainst += match.score.fullTime.away ?? 0;
    } else {
      goalsFor += match.score.fullTime.away ?? 0;
      goalsAgainst += match.score.fullTime.home ?? 0;
    }
  }

  return {
    avgScored: goalsFor / matches.length || 1,
    avgConceded: goalsAgainst / matches.length || 1,
  };
}

// 🔥 Génération quotidienne des matchs
export async function generateDailyMatches() {
  const matches = await fetchTodayMatches();

  for (const match of matches) {
    const homeTeam = match.homeTeam.name;
    const awayTeam = match.awayTeam.name;

    // Stats réelles
    const homeLast = await fetchTeamLastMatches(match.homeTeam.id);
    const awayLast = await fetchTeamLastMatches(match.awayTeam.id);

    const homeStats = calculateAverages(homeLast, match.homeTeam.id);
    const awayStats = calculateAverages(awayLast, match.awayTeam.id);

    // Expected goals dynamique
    const homeExpected = (homeStats.avgScored + awayStats.avgConceded) / 2;
    const awayExpected = (awayStats.avgScored + homeStats.avgConceded) / 2;

    const probs = calculateProbabilities(homeExpected, awayExpected);

    // 🔥 Insertion initiale Supabase
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
        over25: probs.home + probs.away, // temporaire, calcul réel sera via valueEngine
        mental_score_home: 70,
        mental_score_away: 65,
        value_detected: false, // initial, update via valueEngine
        risk_level: "MEDIUM",
      })
      .select("id");

    const matchId = insertedData?.[0]?.id;
    if (!matchId) continue;

    // 🔥 Appel valueEngine pour calcul Value + Over 2.5
    await detectValue(
      matchId,
      homeExpected,
      awayExpected,
      1.9, // bookmakerHome exemple
      3.2, // bookmakerDraw exemple
      4.0 // bookmakerAway exemple
    );
  }
}
