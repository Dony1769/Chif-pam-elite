import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Factorial typé correctement
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// Poisson pour calcul Over 2.5 ou 1X2
function poisson(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Calcul probabilité Over 2.5
function over25Prob(homeExpected: number, awayExpected: number): number {
  let probUnder = 0;
  for (let i = 0; i <= 2; i++) {
    for (let j = 0; j <= 2; j++) {
      probUnder += poisson(homeExpected, i) * poisson(awayExpected, j);
    }
  }
  return 1 - probUnder; // probabilité Over 2.5
}

// Détection value
export async function detectValue(
  matchId: number,
  expectedHome: number,
  expectedAway: number,
  bookmakerHome: number,
  bookmakerDraw: number,
  bookmakerAway: number
) {
  const probs = {
    home: 0,
    draw: 0,
    away: 0,
  };

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const p = poisson(expectedHome, i) * poisson(expectedAway, j);
      if (i > j) probs.home += p;
      else if (i === j) probs.draw += p;
      else probs.away += p;
    }
  }

  const valueHome = probs.home > 0 && probs.home * bookmakerHome > 1 ? true : false;
  const valueDraw = probs.draw > 0 && probs.draw * bookmakerDraw > 1 ? true : false;
  const valueAway = probs.away > 0 && probs.away * bookmakerAway > 1 ? true : false;

  const over25 = over25Prob(expectedHome, expectedAway);

  // 🔥 Sauvegarde dans Supabase
  await supabase
    .from("pari_predictions")
    .update({
      value_detected: valueHome || valueDraw || valueAway,
      value_home: valueHome,
      value_draw: valueDraw,
      value_away: valueAway,
      over25_prob: over25,
    })
    .eq("id", matchId);
}
