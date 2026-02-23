import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Calcul Poisson pour Over 2.5
export function calculateOver25(homeAvg: number, awayAvg: number) {
  let prob = 0;

  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      if (i + j > 2) {
        prob += (Math.pow(homeAvg, i) * Math.exp(-homeAvg) / factorial(i)) *
                (Math.pow(awayAvg, j) * Math.exp(-awayAvg) / factorial(j));
      }
    }
  }
  return prob;
}

function factorial(n: number) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// Détecter value bet
export function detectValue(probReal: number, bookmakerOdd: number, threshold = 0.08) {
  const implied = 1 / bookmakerOdd; // Cote => probabilité implicite
  const diff = probReal - implied;
  return {
    value: diff > threshold,
    diff,
  };
}

// Stocker value dans Supabase
export async function updateValueBet(matchId: number, probHome: number, probDraw: number, probAway: number, over25: number, odds: {home:number,draw:number,away:number,over25:number}) {
  const homeValue = detectValue(probHome, odds.home);
  const drawValue = detectValue(probDraw, odds.draw);
  const awayValue = detectValue(probAway, odds.away);
  const overValue = detectValue(over25, odds.over25);

  await supabase.from("pari_predictions").update({
    value_home: homeValue.value,
    value_draw: drawValue.value,
    value_away: awayValue.value,
    value_over25: overValue.value
  }).eq("id", matchId);
}
