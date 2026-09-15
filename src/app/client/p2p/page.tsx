"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Offer = {
  id: string;
  agent_id: string;
  rate_htg_per_cp: number;
  min_cp: number;
  max_cp: number;
  available_balance: number;
  reputation_level: number;
  successful_clients_count: number;
  username: string;
};

export default function P2PMarketPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [amount, setAmount] = useState("100");
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOffers = async () => {
      const { data } = await supabase.from("p2p_offers").select("id, agent_id, rate_htg_per_cp, min_cp, max_cp").eq("active", true).order("rate_htg_per_cp", { ascending: true });
      const rows = data ?? [];
      const agentIds = rows.map((row) => row.agent_id);
      const [{ data: agents }, { data: profiles }] = await Promise.all([
        supabase.from("agent_profiles").select("user_id, reputation_level, successful_clients_count").in("user_id", agentIds),
        supabase.from("profiles").select("id, username, balance, locked_balance").in("id", agentIds),
      ]);
      setOffers(rows.map((row) => {
        const agent = agents?.find((entry) => entry.user_id === row.agent_id);
        const profile = profiles?.find((entry) => entry.id === row.agent_id);
        return {
          ...row,
          available_balance: Math.max(0, Number(profile?.balance ?? 0) - Number(profile?.locked_balance ?? 0)),
          reputation_level: agent?.reputation_level ?? 0,
          successful_clients_count: agent?.successful_clients_count ?? 0,
          username: profile?.username ?? "Agent",
        };
      }));
      setLoading(false);
    };
    void loadOffers();
  }, []);

  const execute = async () => {
    if (!selectedOffer || !Number.isInteger(Number(amount)) || Number(amount) <= 0) return;
    setSubmitting(true);
    setMessage(null);
    const offer = offers.find((entry) => entry.id === selectedOffer);
    const { data: transaction, error } = await supabase.rpc("p2p_buy_cp", {
      p_offer_id: selectedOffer,
      p_amount_cp: Number(amount),
    });
    setMessage(error?.message ?? `${Number(transaction?.amount_cp ?? amount).toLocaleString()} CP avec @${offer?.username} pour ${Number(transaction?.amount_htg ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} HTG.`);
    setSubmitting(false);
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[#05070b] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3"><button type="button" onClick={() => router.back()} aria-label="Retour" className="rounded-xl border border-white/10 p-3"><ArrowLeftRight size={18} /></button><div><p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Marché interne</p><h1 className="text-3xl font-black">CP P2P</h1></div></header>
        <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/5 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 text-emerald-300" size={20} /><p className="text-sm leading-6 text-slate-300">Les gourdes et les CP restent dans la plateforme. Le prix final est calculé et validé par Supabase.</p></div></section>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Agents disponibles</h2><span className="text-xs text-slate-500">{offers.length} offre(s)</span></div>{loading ? <Loader2 className="animate-spin text-emerald-300" /> : offers.map((offer) => <button type="button" key={offer.id} onClick={() => setSelectedOffer(offer.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedOffer === offer.id ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-white/[0.03] hover:border-emerald-300/40"}`}><div className="flex items-center justify-between"><span className="font-black">@{offer.username}</span><span className="font-mono text-emerald-200">{offer.rate_htg_per_cp} HTG/CP</span></div><div className="mt-3 flex gap-4 text-xs text-slate-400"><span>Niveau {offer.reputation_level}</span><span>{offer.successful_clients_count} clients uniques</span><span>{offer.min_cp} - {offer.max_cp} CP</span></div></button>)}</section>
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Achat sécurisé</p><p className="mt-1 text-sm text-slate-400">Sélectionnez une offre pour acheter des CP avec votre solde HTG.</p></div><label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Montant CP<input type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white" /></label>{selectedOffer && (() => { const offer = offers.find((entry) => entry.id === selectedOffer); const cp = Math.max(0, Math.floor(Number(amount) || 0)); const paid = cp * Number(offer?.rate_htg_per_cp ?? 0); return <div className="space-y-1 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm"><p className="font-black text-white">@{offer?.username}</p><p className="text-slate-300">Prix payé : <strong className="text-emerald-200">{paid.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} HTG</strong></p><p className="text-slate-400">{cp.toLocaleString()} CP à {Number(offer?.rate_htg_per_cp ?? 0).toFixed(4)} HTG/CP</p><p className="text-slate-400">Stock CP agent : {Number(offer?.available_balance ?? 0).toLocaleString("fr-FR")} CP</p></div>; })()}<button type="button" onClick={execute} disabled={submitting || !selectedOffer} className="w-full rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 disabled:opacity-40">{submitting ? "Validation..." : "Acheter les CP"}</button>{message && <p className="text-sm text-emerald-200">{message}</p>}</section>
        </div>
      </div>
    </main>
  );
}