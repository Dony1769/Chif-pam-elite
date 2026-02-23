"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BetSelection {
  id: string;
  ticket_id: string;
  match_id: string;
  selected_outcome: "home" | "draw" | "away";
  odds: number;
  result?: "home" | "draw" | "away"; // optionnel, à remplir si match joué
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
      // 🔹 Récupère les tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("bets_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsError) {
        console.error("Erreur tickets:", ticketsError.message);
        setLoading(false);
        return;
      }

      // 🔹 Récupère toutes les sélections associées
      const { data: selectionsData, error: selectionsError } = await supabase
        .from("bet_selections")
        .select("*");

      if (selectionsError) {
        console.error("Erreur sélections:", selectionsError.message);
        setLoading(false);
        return;
      }

      // 🔹 Associe les sélections à leurs tickets
      const ticketsWithSelections = ticketsData!.map((ticket) => ({
        ...ticket,
        selections: selectionsData!.filter((s) => s.ticket_id === ticket.id),
      }));

      setTickets(ticketsWithSelections);
      setLoading(false);
    }

    fetchTickets();
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>;

  // 🔹 Stats globales
  const totalStake = tickets.reduce((acc, t) => acc + Number(t.stake), 0);
  const totalProfit = tickets.reduce((acc, t) => acc + Number(t.total_profit), 0);
  const roi = totalStake ? (totalProfit / totalStake) * 100 : 0;
  const totalBets = tickets.length;
  const wins = tickets.filter((t) => t.status === "won").length;
  const winRate = totalBets ? (wins / totalBets) * 100 : 0;

  return (
    <div style={{ padding: 40 }}>
      <h1>Historique des Paris</h1>

      <p>Total misé : {totalStake}</p>
      <p>Profit total : {totalProfit}</p>
      <p>ROI : {roi.toFixed(2)}%</p>
      <p>Nombre de paris : {totalBets}</p>
      <p>Taux de réussite : {winRate.toFixed(2)}%</p>

      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          style={{
            marginBottom: 20,
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        >
          <p>
            <strong>Ticket :</strong> {ticket.ticket_type.toUpperCase()}
          </p>
          <p>Cote totale : {ticket.total_odds}</p>
          <p>Mise : {ticket.stake}</p>
          <p>Status : {ticket.status}</p>
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
                  padding: "4px 0",
                  backgroundColor:
                    sel.result === sel.selected_outcome
                      ? "#d4edda" // vert si gagné
                      : sel.result
                      ? "#f8d7da" // rouge si perdu
                      : "transparent", // neutre si non joué
                  borderRadius: 4,
                  paddingLeft: 6,
                  paddingRight: 6,
                }}
              >
                <span>Match ID : {sel.match_id}</span>
                <span>
                  Sélection : {sel.selected_outcome.toUpperCase()} | Cote :{" "}
                  {sel.odds}
                </span>
                <span>
                  Résultat :{" "}
                  {sel.result ? sel.result.toUpperCase() : "Non joué"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
