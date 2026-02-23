import { createClient } from "@supabase/supabase-js";

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  expected_goals_home: number;
  expected_goals_away: number;
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  value_detected: boolean;
  value_home?: boolean;
  value_draw?: boolean;
  value_away?: boolean;
  over25_prob?: number;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AnalysePage() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("pari_predictions")
    .select("*")
    .gte("match_date", today)
    .order("probability_home", { ascending: false });

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Erreur récupération données</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  const matches = (data as Match[]) || [];

  return (
    <div style={{ padding: "40px" }}>
      <h1>Analyse des matchs du jour</h1>

      <p>
        Probabilités calculées via distribution de Poisson avec expected goals dynamiques.
      </p>

      {matches.length === 0 && <p>Aucun match trouvé aujourd’hui.</p>}

      {matches.map((match) => (
        <div
          key={match.id}
          style={{
            marginBottom: "25px",
            padding: "15px",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
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
            Expected Goals :
            {match.expected_goals_home.toFixed(2)} -
            {match.expected_goals_away.toFixed(2)}
          </p>

          <p>
            Value détectée :
            {match.value_detected ? " ✅ Oui" : " ❌ Non"}
          </p>

          {match.value_home && <p>🔥 Value Home</p>}
          {match.value_draw && <p>🔥 Value Draw</p>}
          {match.value_away && <p>🔥 Value Away</p>}

          {match.over25_prob !== undefined && (
            <p>
              Over 2.5 : {(match.over25_prob * 100).toFixed(1)}%
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
