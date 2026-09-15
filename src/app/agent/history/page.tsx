"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DSEmptyState, DSButton, DSCard, DSLoader, DSPage } from "@/components/ui/primitives";

type Transaction = { id: string; direction: string; amount_cp: number; amount_htg: number; rate_htg_per_cp: number; created_at: string };
const PAGE_SIZE = 20;

export default function AgentHistoryPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadRows = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session agent introuvable.");
      const { data, error: queryError } = await supabase.from("p2p_transactions").select("id, direction, amount_cp, amount_htg, rate_htg_per_cp, created_at").eq("agent_id", user.id).order("created_at", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      if (queryError) throw queryError;
      const next = (data ?? []) as Transaction[];
      setRows((current) => append ? [...current, ...next] : next);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l’historique.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  useEffect(() => { void loadRows(0, false); }, [loadRows]);
  if (loading) return <DSPage className="mx-auto max-w-5xl px-4 py-10"><DSLoader label="Chargement de l’historique..." /></DSPage>;
  return <DSPage className="mx-auto max-w-5xl space-y-6 px-4 py-8"><div><p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Traçabilité</p><h1 className="mt-2 text-3xl font-black">Historique P2P</h1></div>{error && <DSCard className="border-rose-300/30 p-5 text-rose-200">{error}</DSCard>}{!error && rows.length === 0 ? <DSEmptyState title="Votre activité apparaîtra ici" description="Vos ventes et rachats P2P seront conservés dans cet historique dès votre première transaction." action={<DSButton as="a" href="/agent/offer">Configurer mon offre</DSButton>} /> : <div className="space-y-3">{rows.map((row, index) => { const sale = row.direction === "buy_cp"; return <motion.div key={row.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index, 8) * 0.03 }}><DSCard className={`flex flex-wrap items-center justify-between gap-4 border-l-4 p-4 ${sale ? "border-l-emerald-300" : "border-l-amber-300"}`}><div className="flex items-center gap-3"><span className={`rounded-xl p-2 ${sale ? "bg-emerald-300/10 text-emerald-300" : "bg-amber-300/10 text-amber-300"}`}>{sale ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}</span><div><p className="font-black">{sale ? "Vente de CP" : "Rachat de CP"}</p><p className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString("fr-FR")}</p></div></div><div className="text-right"><p className="font-black text-white">{Number(row.amount_cp).toLocaleString()} CP</p><p className={`text-sm ${sale ? "text-emerald-200" : "text-amber-200"}`}>{Number(row.amount_htg).toLocaleString()} HTG · {Number(row.rate_htg_per_cp).toFixed(4)}/CP</p></div></DSCard></motion.div>; })}{hasMore && <DSButton type="button" variant="secondary" onClick={() => void loadRows(rows.length, true)} disabled={loadingMore}>{loadingMore ? "Chargement..." : "Charger plus"}</DSButton>}</div>}</DSPage>;
}
