import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function HistoriquePage() {
  const { data } = await supabase
    .from("pari_predictions")
    .select("*")
    .order("match_date", { ascending: false })
    .limit(50);

  return (
    <div style={{ padding: "40px" }}>
      <h1>Historique des prédictions</h1>

      <p>
        Archive des matchs générés automatiquement par le moteur statistique.
      </p>

      {data?.map((match) => (
        <div key={match.id} style={{ marginBottom: "15px" }}>
          <strong>
            {match.home_team} vs {match.away_team}
          </strong>{" "}
          - {new Date(match.match_date).toLocaleDateString()}
        </div>
      ))}
    </div>
  );
}
