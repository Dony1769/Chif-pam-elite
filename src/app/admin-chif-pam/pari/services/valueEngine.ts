import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Factorial avec cache pour perf
const factorialCache: Record<number, number> = {};
function factorial(n: number): number {
  if (n <= 1) return 1;
  if (factorialCache[n]) return factorialCache[n];
  factorialCache[n] = n * factorial(n - 1);
  return factorialCache[n];
}

// Poisson
function poisson(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Probabilité Over 2.5
function over25Prob(home: number, away: number): number {
  let probUnder = 0;
  for (let i = 0; i <= 2; i++) {
    for (let j = 0; j <= 2; j++) {
      probUnder += poisson(home, i) * poisson(away, j);
    }
  }
  return 1 - probUnder;
}

// Détection Value optimisée
export async function detectValue(
  matchId: number,
  expectedHome: number,
  expectedAway: number,
  bookmakerHome: number,
  bookmakerDraw: number,
  bookmakerAway: number
) {
  let probs = { home: 0, draw: 0, away: 0 };
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const p = poisson(expectedHome, i) * poisson(expectedAway, j);
      if (i > j) probs.home += p;
      else if (i === j) probs.draw += p;
      else probs.away += p;
    }
  }

  const over25 = over25Prob(expectedHome, expectedAway);

  const valueThreshold = 0.05; // edge minimal pour valider un value bet
  const valueHome = probs.home * bookmakerHome - 1 > valueThreshold;
  const valueDraw = probs.draw * bookmakerDraw - 1 > valueThreshold;
  const valueAway = probs.away * bookmakerAway - 1 > valueThreshold;

  const roiHome = probs.home * bookmakerHome - 1;
  const roiDraw = probs.draw * bookmakerDraw - 1;
  const roiAway = probs.away * bookmakerAway - 1;

  await supabase.from("pari_predictions").update({
    value_detected: valueHome || valueDraw || valueAway,
    value_home: valueHome,
    value_draw: valueDraw,
    value_away: valueAway,
    over25_prob: over25,
    roi_home: roiHome,
    roi_draw: roiDraw,
    roi_away: roiAway,
  }).eq("id", matchId);
}
