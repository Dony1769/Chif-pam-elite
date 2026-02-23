"use client"; // 🔹 Important si tu veux utiliser React state / effets

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BetTicket {
  id: string;
  ticket_type: "single" | "combo";
  total_odds: number;
  stake: number;
  potential_win: number;
  total_profit: number;
  status: "pending" | "won" | "lost";
  created_at: string;
}

export default function HistoriquePage() {
  const [tickets, setTickets] = useState<BetTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("bets_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur Supabase:", error.message);
      } else {
        setTickets(data as BetTicket[]);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  const totalStake = tickets.reduce((acc, t) => acc + Number(t.stake), 0);
  const totalProfit = tickets.reduce((acc, t) => acc + Number(t.total_profit), 0);
  const roi = totalStake ? (totalProfit / totalStake) * 100 : 0;
  const totalBets = tickets.length;
  const wins = tickets.filter((t) => t.status === "won").length;
  const winRate = totalBets ? (wins / totalBets) * 100 : 0;

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Historique des Paris</h1>

      <p>Total misé : {totalStake}</p>
      <p>Profit total : {totalProfit}</p>
      <p>ROI : {roi.toFixed(2)}%</p>
      <p>Nombre de paris : {totalBets}</p>
      <p>Taux de réussite : {winRate.toFixed(2)}%</p>

      {tickets.map((ticket) => (
        <div key={ticket.id} style={{ marginBottom: 20, padding: 10, border: "1px solid #ccc" }}>
          <p>Type : {ticket.ticket_type}</p>
          <p>Cote totale : {ticket.total_odds}</p>
          <p>Mise : {ticket.stake}</p>
          <p>Status : {ticket.status}</p>
          <p>Profit : {ticket.total_profit}</p>
          <p>Potentiel gain : {ticket.potential_win}</p>
        </div>
      ))}
    </div>
  );
}
