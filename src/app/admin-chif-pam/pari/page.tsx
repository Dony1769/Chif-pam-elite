import { createClient } from "@supabase/supabase-js";

export default async function PariDashboard() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Admin - Système de Paris</h1>

      <p>
        Cette section génère automatiquement 10 matchs par jour avec analyse
        statistique (Poisson), score mental et détection de value.
      </p>

      <ul>
        <li>Analyse des probabilités</li>
        <li>Score psychologique des équipes</li>
        <li>Détection value bet</li>
        <li>Historique complet</li>
      </ul>

      <p>
        Les données sont stockées dans Supabase et protégées par rôle admin.
      </p>
    </div>
  );
}
