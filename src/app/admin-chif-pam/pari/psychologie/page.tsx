import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PsychologiePage() {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("pari_predictions")
    .select("*")
    .gte("match_date", today);

  return (
    <div style={{ padding: "40px" }}>
      <h1>Analyse Psychologique</h1>

      <p>
        Le score mental est basé sur la dynamique, pression, contexte et
        stabilité récente.
      </p>

      {data?.map((match) => (
        <div key={match.id} style={{ marginBottom: "20px" }}>
          <h3>
            {match.home_team} vs {match.away_team}
          </h3>

          <p>
            Score mental domicile : {match.mental_score_home}/100
          </p>

          <p>
            Score mental extérieur : {match.mental_score_away}/100
          </p>

          <p>Niveau de risque : {match.risk_level}</p>
        </div>
      ))}
    </div>
  );
}
