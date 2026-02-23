import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AnalysePage() {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("pari_predictions")
    .select("*")
    .gte("match_date", today)
    .order("probability_home", { ascending: false });

  return (
    <div style={{ padding: "40px" }}>
      <h1>Analyse des matchs du jour</h1>

      <p>
        Les probabilités sont calculées via distribution de Poisson avec
        expected goals dynamiques.
      </p>

      {data?.map((match) => (
        <div key={match.id} style={{ marginBottom: "20px" }}>
          <h3>
            {match.home_team} vs {match.away_team}
          </h3>

          <p>Ligue : {match.league}</p>

          <p>
            Probabilités :  
            Domicile {(match.probability_home * 100).toFixed(1)}% |  
            Nul {(match.probability_draw * 100).toFixed(1)}% |  
            Extérieur {(match.probability_away * 100).toFixed(1)}%
          </p>

          <p>
            Expected Goals : {match.expected_goals_home.toFixed(2)} -{" "}
            {match.expected_goals_away.toFixed(2)}
          </p>

          <p>
            Value détectée : {match.value_detected ? "Oui" : "Non"}
          </p>
        </div>
      ))}
    </div>
  );
}
