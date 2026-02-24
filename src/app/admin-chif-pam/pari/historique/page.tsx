"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";

interface BetSelection {
  id: string;
  ticket_id: string;
  match_id: string;
  selected_outcome: "home" | "draw" | "away";
  odds: number;
  result?: "home" | "draw" | "away";
}

interface BetTicket {
  id: string;
  ticket_type: "single" | "combo";
  total_odds: number;
  stake: number;
  potential_win: number;
  total_profit: number;
  status: "pending" | "won" | "lost";
  created_at: string;
  selections?: BetSelection[];
}

export default function HistoriquePage() {
  const [tickets, setTickets] = useState<BetTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      try {
        // 🔹 Récupération tickets
        const { data: ticketsData, error: ticketsError } = await supabaseClient
          .from("bets_tickets")
          .select("*")
          .order("created_at", { ascending: false });

        if (ticketsError) throw ticketsError;

        // 🔹 Récupération sélections
        const { data: selectionsData, error: selectionsError } = await supabaseClient
          .from("bet_selections")
          .select("*");

        if (selectionsError) throw selectionsError;

        // 🔹 Association sélections → tickets
        const ticketsWithSelections = ticketsData!.map((ticket) => ({
          ...ticket,
          selections: selectionsData!.filter((s) => s.ticket_id === ticket.id),
        }));

        setTickets(ticketsWithSelections);
      } catch (error: any) {
        console.error("Erreur récupération:", error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>;

  // 🔹 Statistiques globales
  const totalStake = tickets.reduce((acc, t) => acc + Number(t.stake), 0);
  const totalProfit = tickets.reduce((acc, t) => acc + Number(t.total_profit), 0);
  const roi = totalStake ? (totalProfit / totalStake) * 100 : 0;
  const totalBets = tickets.length;
  const wins = tickets.filter((t) => t.status === "won").length;
  const winRate = totalBets ? (wins / totalBets) * 100 : 0;

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 20 }}>Historique des Paris</h1>

      <div style={{ marginBottom: 30 }}>
        <p>Total misé : <strong>{totalStake}</strong></p>
        <p>Profit total : <strong>{totalProfit}</strong></p>
        <p>ROI : <strong>{roi.toFixed(2)}%</strong></p>
        <p>Nombre de paris : <strong>{totalBets}</strong></p>
        <p>Taux de réussite : <strong>{winRate.toFixed(2)}%</strong></p>
      </div>

      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          style={{
            marginBottom: 20,
            padding: 15,
            border: "1px solid #ccc",
            borderRadius: 8,
            backgroundColor: "#0f172a",
            color: "white",
          }}
        >
          <p><strong>Ticket :</strong> {ticket.ticket_type.toUpperCase()}</p>
          <p>Cote totale : {ticket.total_odds}</p>
          <p>Mise : {ticket.stake}</p>
          <p>Status : {ticket.status.toUpperCase()}</p>
          <p>Profit : {ticket.total_profit}</p>
          <p>Potentiel gain : {ticket.potential_win}</p>

          <div style={{ marginTop: 10 }}>
            <strong>Matchs sélectionnés :</strong>
            {ticket.selections?.map((sel) => (
              <div
                key={sel.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                  padding: "4px 8px",
                  borderRadius: 4,
                  backgroundColor:
                    sel.result === sel.selected_outcome
                      ? "#065f46" // vert si gagné
                      : sel.result
                      ? "#7f1d1d" // rouge si perdu
                      : "#1e293b", // neutre si non joué
                }}
              >
                <span>Match ID : {sel.match_id}</span>
                <span>Sélection : {sel.selected_outcome.toUpperCase()} | Cote : {sel.odds}</span>
                <span>Résultat : {sel.result ? sel.result.toUpperCase() : "Non joué"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
