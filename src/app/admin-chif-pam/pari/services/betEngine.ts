import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createTicket(
  selections: {
    matchId: string;
    selectedOutcome: "home" | "draw" | "away";
    odds: number;
  }[],
  stake: number
) {
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);

  const { data: ticket } = await supabase
    .from("bets_tickets")
    .insert({
      ticket_type: selections.length > 1 ? "combo" : "single",
      total_odds: totalOdds,
      stake,
      potential_win: stake * totalOdds,
    })
    .select()
    .single();

  if (!ticket) return null;

  for (const selection of selections) {
    await supabase.from("bet_selections").insert({
      ticket_id: ticket.id,
      match_id: selection.matchId,
      selected_outcome: selection.selectedOutcome,
      odds: selection.odds,
    });
  }

  return ticket;
}

export async function settleTicket(ticketId: string, isWon: boolean) {
  const { data: ticket } = await supabase
    .from("bets_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) return null;

  const profit = isWon
    ? ticket.stake * (ticket.total_odds - 1)
    : -ticket.stake;

  await supabase
    .from("bets_tickets")
    .update({
      status: isWon ? "won" : "lost",
      total_profit: profit,
    })
    .eq("id", ticketId);

  return profit;
}

export async function getGlobalStats() {
  const { data } = await supabase
    .from("bets_tickets")
    .select("*")
    .neq("status", "pending");

  if (!data) return null;

  const totalStake = data.reduce((acc, t) => acc + Number(t.stake), 0);
  const totalProfit = data.reduce((acc, t) => acc + Number(t.total_profit), 0);
  const totalBets = data.length;
  const wins = data.filter((t) => t.status === "won").length;

  return {
    totalStake,
    totalProfit,
    totalBets,
    winRate: totalBets ? (wins / totalBets) * 100 : 0,
    roi: totalStake ? (totalProfit / totalStake) * 100 : 0,
  };
      }
