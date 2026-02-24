"use client";

import { useEffect, useState } from "react";
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
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ⚡ Fetch matchs du jour
  useEffect(() => {
    async function fetchMatches() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("pari_predictions")
          .select("*")
          .gte("match_date", today)
          .order("match_date", { ascending: true });

        if (error) throw error;
        if (data) {
          setMatches(data);
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
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur lors du chargement des matchs.");
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

  // ⚡ Création du ticket
  const handleCreateTicket = async () => {
    if (selections.length === 0) {
      alert("Veuillez sélectionner au moins un match.");
      return;
    }

    try {
      const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);

      const { data: ticket, error: ticketError } = await supabase
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

      if (ticketError || !ticket) throw ticketError || new Error("Erreur création ticket");

      // Insert selections
      const selectionInserts = selections.map((s) => ({
        ticket_id: ticket.id,
        match_id: s.matchId,
        selected_outcome: s.selectedOutcome,
        odds: s.odds,
      }));

      const { error: selError } = await supabase.from("bet_selections").insert(selectionInserts);
      if (selError) throw selError;

      setSuccessMessage(`Ticket créé avec succès ! Type: ${selections.length > 1 ? "Combiné" : "Simple"}`);
      setSelections([]);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la création du ticket.");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Créer un Ticket</h1>
      <p>Sélectionnez vos matchs et entrez les cotes.</p>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {matches.map((match) => {
        const selected = selections.find((s) => s.matchId === match.id)?.selectedOutcome;
        return (
          <div key={match.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10, borderRadius: 6 }}>
            <h3>{match.home_team} vs {match.away_team} ({match.league})</h3>
            <p>Expected Goals: {match.expected_goals_home.toFixed(2)} - {match.expected_goals_away.toFixed(2)}</p>
            <div style={{ display: "flex", gap: 10 }}>
              {(["home", "draw", "away"] as const).map((outcome) => (
                <div key={outcome} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input
                    type="number"
                    min={1.01}
                    step={0.01}
                    value={oddsInput[match.id]?.[outcome] || 1.0}
                    onChange={(e) => handleOddsChange(match.id, outcome, parseFloat(e.target.value))}
                    style={{ width: 60 }}
                  />
                  <button
                    style={{
                      padding: "4px 8px",
                      backgroundColor: selected === outcome ? "#10b981" : "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelectOutcome(match.id, outcome)}
                  >
                    {outcome.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 20 }}>
        <label>
          Mise :{" "}
          <input type="number" min={1} step={1} value={stake} onChange={(e) => setStake(parseFloat(e.target.value))} />
        </label>
      </div>

      <button
        onClick={handleCreateTicket}
        style={{ marginTop: 20, padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
      >
        Créer Ticket
      </button>

      {successMessage && <p style={{ color: "green", marginTop: 10 }}>{successMessage}</p>}
    </div>
  );
}
