import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function PsychologiePage() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseServer
    .from("pari_predictions")
    .select("*")
    .gte("match_date", today);

  if (error) {
    return (
      <div>
        <h2>Erreur récupération données</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Analyse Psychologique</h1>

      {data?.map((match) => (
        <div
          key={match.id}
          style={{
            padding: 15,
            marginBottom: 20,
            background: "#1e293b",
            borderRadius: 8,
          }}
        >
          <h3>
            {match.home_team} vs {match.away_team}
          </h3>

          <p>
            Score mental domicile : {match.mental_score_home ?? 0}/100
          </p>

          <p>
            Score mental extérieur : {match.mental_score_away ?? 0}/100
          </p>

          <p>Niveau de risque : {match.risk_level ?? "Non défini"}</p>
        </div>
      ))}
    </div>
  );
}
