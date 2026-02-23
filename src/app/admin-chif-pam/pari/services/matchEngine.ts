import { fetchTodayMatches } from "./fetchMatches";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function generateDailyMatches() {
  const matches = await fetchTodayMatches();

  for (const match of matches) {
    const homeTeam = match.homeTeam.name;
    const awayTeam = match.awayTeam.name;

    // Moyennes simplifiées provisoires
    const homeAvg = 1.5;
    const awayAvg = 1.2;

    const probs = calculateProbabilities(homeAvg, awayAvg);

    await supabase.from("pari_predictions").insert({
      home_team: homeTeam,
      away_team: awayTeam,
      league: match.competition.name,
      match_date: match.utcDate,
      expected_goals_home: homeAvg,
      expected_goals_away: awayAvg,
      probability_home: probs.home,
      probability_draw: probs.draw,
      probability_away: probs.away,
      over25: probs.home + probs.away,
      mental_score_home: 70,
      mental_score_away: 65,
      value_detected: probs.home > 0.55,
      risk_level: "MEDIUM",
    });
  }
}
