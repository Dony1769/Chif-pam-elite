"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase-client";
const supabase = supabaseClient;

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  expected_goals_home: number;
  expected_goals_away: number;
}

interface Selection {
  matchId: string;
  selectedOutcome: "home" | "draw" | "away";
  odds: number;
}

export default function CreateTicketPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [oddsInput, setOddsInput] = useState<Record<string, { home: number; draw: number; away: number }>>({});
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStake] = useState<number>(100);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // ⚡ Fetch matchs du jour
  useEffect(() => {
    async function fetchMatches() {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("pari_predictions")
        .select("*")
        .gte("match_date", today)
        .order("match_date", { ascending: true });

      if (data) {
        setMatches(data);
        // Pré-remplissage des cotes
        const defaultOdds: Record<string, { home: number; draw: number; away: number }> = {};
        data.forEach((m) => {
          defaultOdds[m.id] = {
            home: Number(m.probability_home ? (1 / m.probability_home).toFixed(2) : 1.9),
            draw: Number(m.probability_draw ? (1 / m.probability_draw).toFixed(2) : 3.2),
            away: Number(m.probability_away ? (1 / m.probability_away).toFixed(2) : 4.0),
          };
        });
        setOddsInput(defaultOdds);
      }
    }
    fetchMatches();
  }, []);

  // ⚡ Sélection d’un résultat
  const handleSelectOutcome = (matchId: string, outcome: "home" | "draw" | "away") => {
    setSelections((prev) => {
      const filtered = prev.filter((s) => s.matchId !== matchId);
      return [
        ...filtered,
        { matchId, selectedOutcome: outcome, odds: oddsInput[matchId][outcome] },
      ];
    });
  };

  // ⚡ Modification des cotes
  const handleOddsChange = (matchId: string, outcome: "home" | "draw" | "away", value: number) => {
    setOddsInput((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [outcome]: value },
    }));
    setSelections((prev) =>
      prev.map((s) =>
        s.matchId === matchId && s.selectedOutcome === outcome
          ? { ...s, odds: value }
          : s
      )
    );
  };

  // ⚡ Création du ticket simple ou combiné
  const handleCreateTicket = async () => {
    if (selections.length === 0) {
      alert("Veuillez sélectionner au moins un match.");
      return;
    }

    const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);

    // Insertion ticket
    const { data: ticket } = await supabase
      .from("bets_tickets")
      .insert({
        ticket_type: selections.length > 1 ? "combo" : "single",
        total_odds: totalOdds,
        stake,
        potential_win: stake * totalOdds,
        status: "pending",
      })
      .select()
      .single();

    if (!ticket) return;

    // Insertion sélections
    for (const s of selections) {
      await supabase.from("bet_selections").insert({
        ticket_id: ticket.id,
        match_id: s.matchId,
        selected_outcome: s.selectedOutcome,
        odds: s.odds,
      });
    }

    setSuccessMessage(`Ticket créé avec succès ! Type: ${selections.length > 1 ? "Combiné" : "Simple"}`);
    setSelections([]);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Créer un Ticket</h1>
      <p>Sélectionnez vos matchs et entrez les cotes.</p>

      {matches.map((match) => (
        <div key={match.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <h3>{match.home_team} vs {match.away_team} ({match.league})</h3>
          <p>Expected Goals: {match.expected_goals_home.toFixed(2)} - {match.expected_goals_away.toFixed(2)}</p>
          <div style={{ display: "flex", gap: 10 }}>
            {(["home", "draw", "away"] as const).map((outcome) => (
              <div key={outcome}>
                <label>
                  {outcome.toUpperCase()} :{" "}
                  <input
                    type="number"
                    min={1.01}
                    step={0.01}
                    value={oddsInput[match.id]?.[outcome] || 1.0}
                    onChange={(e) =>
                      handleOddsChange(match.id, outcome, parseFloat(e.target.value))
                    }
                  />
                </label>
                <button style={{ marginLeft: 5 }} onClick={() => handleSelectOutcome(match.id, outcome)}>
                  Jouer {outcome.toUpperCase()}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <label>
          Mise :{" "}
          <input type="number" min={1} step={1} value={stake} onChange={(e) => setStake(parseFloat(e.target.value))} />
        </label>
      </div>

      <button onClick={handleCreateTicket} style={{ marginTop: 20, padding: "10px 20px" }}>
        Créer Ticket
      </button>

      {successMessage && <p style={{ color: "green", marginTop: 10 }}>{successMessage}</p>}
    </div>
  );
}
