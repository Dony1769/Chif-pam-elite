import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Typage TS pour tes matchs
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

export default function AnalysePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("pari_predictions")
          .select("*")
          .gte("match_date", today)
          .order("probability_home", { ascending: false });

        if (error) throw error;
        setMatches(data as Match[]);
      } catch (err: any) {
        setError(err.message || "Erreur lors de la récupération des matchs");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Chargement des matchs…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "40px" }}>
      <h1>Analyse des matchs du jour</h1>
      <p>
        Probabilités calculées via distribution de Poisson avec expected goals dynamiques.
      </p>

      {matches.length === 0 && <p>Aucun match trouvé pour aujourd'hui.</p>}

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
            Probabilités : Domicile {(match.probability_home * 100).toFixed(1)}% | Nul{" "}
            {(match.probability_draw * 100).toFixed(1)}% | Extérieur{" "}
            {(match.probability_away * 100).toFixed(1)}%
          </p>

          <p>
            Expected Goals : {match.expected_goals_home.toFixed(2)} -{" "}
            {match.expected_goals_away.toFixed(2)}
          </p>

          <p>Value détectée : {match.value_detected ? "Oui" : "Non"}</p>

          {match.value_home !== undefined && (
            <p>
              Value bets :{" "}
              {match.value_home ? "Home " : ""}
              {match.value_draw ? "Draw " : ""}
              {match.value_away ? "Away " : ""}
            </p>
          )}

          {match.over25_prob !== undefined && (
            <p>Probabilité Over 2.5 : {(match.over25_prob * 100).toFixed(1)}%</p>
          )}
        </div>
      ))}
    </div>
  );
}
