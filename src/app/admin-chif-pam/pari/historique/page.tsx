import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function HistoriquePage() {
  const { data: tickets } = await supabase
    .from("bets_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  const totalStake = tickets?.reduce((acc, t) => acc + Number(t.stake), 0) || 0;
  const totalProfit =
    tickets?.reduce((acc, t) => acc + Number(t.total_profit), 0) || 0;

  const roi = totalStake ? (totalProfit / totalStake) * 100 : 0;

  return (
    <div style={{ padding: 40 }}>
      <h1>Historique des Paris</h1>

      <p>Total misé : {totalStake}</p>
      <p>Profit total : {totalProfit}</p>
      <p>ROI : {roi.toFixed(2)}%</p>

      {tickets?.map((ticket) => (
        <div key={ticket.id} style={{ marginBottom: 20 }}>
          <p>Type : {ticket.ticket_type}</p>
          <p>Cote totale : {ticket.total_odds}</p>
          <p>Mise : {ticket.stake}</p>
          <p>Status : {ticket.status}</p>
          <p>Profit : {ticket.total_profit}</p>
        </div>
      ))}
    </div>
  );
}
