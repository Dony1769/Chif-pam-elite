"use client"; // ⚠️ nécessaire si on veut utiliser des hooks ou JSX dynamique côté client

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Ticket {
  id: string;
  ticket_type: "single" | "combo";
  total_odds: number;
  stake: number;
  potential_win: number;
  total_profit: number;
  status: "pending" | "won" | "lost";
  created_at: string;
}

interface Selection {
  id: string;
  ticket_id: string;
  match_id: string;
  selected_outcome: "home" | "draw" | "away";
  odds: number;
  result: string | null;
  profit: number;
}

export default function HistoriquePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data: ticketsData } = await supabase
        .from<Ticket>("bets_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: selectionsData } = await supabase
        .from<Selection>("bet_selections")
        .select("*");

      setTickets(ticketsData || []);
      setSelections(selectionsData || []);
    }

    fetchData();
  }, []);

  const totalStake = tickets.reduce((acc, t) => acc + Number(t.stake), 0);
  const totalProfit = tickets.reduce((acc, t) => acc + Number(t.total_profit), 0);
  const roi = totalStake ? (totalProfit / totalStake) * 100 : 0;

  return (
    <div style={{ padding: 40 }}>
      <h1>Historique des Paris</h1>

      <p>Total misé : {totalStake}</p>
      <p>Profit total : {totalProfit}</p>
      <p>ROI : {roi.toFixed(2)}%</p>
      <hr style={{ margin: "20px 0" }} />

      {tickets.map((ticket) => (
        <div key={ticket.id} style={{ marginBottom: 30, padding: 10, border: "1px solid #ccc", borderRadius: 6 }}>
          <p><strong>Type :</strong> {ticket.ticket_type}</p>
          <p><strong>Cote totale :</strong> {ticket.total_odds}</p>
          <p><strong>Mise :</strong> {ticket.stake}</p>
          <p><strong>Status :</strong> {ticket.status}</p>
          <p><strong>Profit :</strong> {ticket.total_profit}</p>

          <h4>Sélections :</h4>
          <ul>
            {selections
              .filter((s) => s.ticket_id === ticket.id)
              .map((s) => (
                <li key={s.id}>
                  Match ID: {s.match_id} | Choix: {s.selected_outcome} | Cote: {s.odds} | Résultat: {s.result || "-"} | Profit: {s.profit}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
