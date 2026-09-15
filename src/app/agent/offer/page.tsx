"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Save, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DSBadgeStatus, DSButton, DSCard, DSInput, DSLoader, DSPage } from "@/components/ui/primitives";

type Policy = { min: number; max: number; maxTransaction: number };

export default function AgentOfferPage() {
  const [rate, setRate] = useState("0.015");
  const [minCp, setMinCp] = useState("100");
  const [maxCp, setMaxCp] = useState("10000");
  const [active, setActive] = useState(true);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOffer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session agent introuvable.");
      const [{ data: offer, error: offerError }, { data: marketPolicy, error: policyError }] = await Promise.all([
        supabase.from("p2p_offers").select("rate_htg_per_cp, min_cp, max_cp, active").eq("agent_id", user.id).maybeSingle(),
        supabase.from("market_policy").select("rate_min_htg_per_cp, rate_max_htg_per_cp, max_transaction_cp").eq("active", true).single(),
      ]);
      if (offerError || policyError) throw offerError ?? policyError;
      if (offer) {
        setRate(String(offer.rate_htg_per_cp));
        setMinCp(String(offer.min_cp));
        setMaxCp(String(offer.max_cp));
        setActive(offer.active);
      }
      setPolicy({ min: Number(marketPolicy.rate_min_htg_per_cp), max: Number(marketPolicy.rate_max_htg_per_cp), maxTransaction: Number(marketPolicy.max_transaction_cp) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l’offre.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOffer(); }, [loadOffer]);
  const numericRate = Number(rate);
  const numericMin = Number(minCp);
  const numericMax = Number(maxCp);
  const rateInvalid = Boolean(policy && (numericRate < policy.min || numericRate > policy.max));
  const limitsInvalid = numericMin <= 0 || numericMax < numericMin || Boolean(policy && numericMax > policy.maxTransaction);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    const { error: rpcError } = await supabase.rpc("agent_upsert_offer", { p_rate: numericRate, p_min_cp: numericMin, p_max_cp: numericMax, p_active: active });
    setSaving(false);
    if (rpcError) setError(rpcError.message);
    else setMessage(active ? "Offre active enregistrée." : "Offre mise en pause.");
  };

  if (loading) return <DSPage className="mx-auto max-w-3xl px-4 py-10"><DSLoader label="Chargement de votre offre..." /></DSPage>;
  if (error && !policy) return <DSPage className="mx-auto max-w-3xl px-4 py-10"><DSCard className="border-rose-300/30 p-6 text-rose-200">{error}</DSCard></DSPage>;
  return (
    <DSPage className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Agent Market</p><h1 className="mt-2 text-3xl font-black">Gestion de l’offre</h1></motion.div>
      <DSCard className="p-6">
        <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Store className="text-emerald-300" size={20} /><h2 className="text-xl font-black">Votre prix P2P</h2></div><p className="mt-2 text-sm text-slate-400">La validation finale reste faite par le RPC serveur.</p></div><DSBadgeStatus tone={active ? "success" : "warning"}>{active ? "Active" : "En pause"}</DSBadgeStatus></div>
        {policy && <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><p className="text-xs font-black uppercase tracking-widest text-amber-200">Fourchette autorisée</p><p className="mt-2 text-lg font-black text-white">{policy.min.toFixed(4)} à {policy.max.toFixed(4)} HTG / CP</p><p className="mt-1 text-xs text-slate-400">Maximum par transaction: {policy.maxTransaction.toLocaleString()} CP</p></div>}
        <div className="mt-6 space-y-5"><label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Taux HTG par CP<DSInput value={rate} onChange={(event) => setRate(event.target.value)} type="number" step="0.000001" className={`mt-2 ${rateInvalid ? "border-rose-400" : ""}`} />{rateInvalid && <span className="mt-2 block text-xs text-rose-300">Le taux doit rester entre {policy?.min.toFixed(4)} et {policy?.max.toFixed(4)} HTG/CP.</span>}</label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Minimum CP<DSInput value={minCp} onChange={(event) => setMinCp(event.target.value)} type="number" className="mt-2" /></label><label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Maximum CP<DSInput value={maxCp} onChange={(event) => setMaxCp(event.target.value)} type="number" className={`mt-2 ${limitsInvalid ? "border-rose-400" : ""}`} />{limitsInvalid && <span className="mt-2 block text-xs text-rose-300">Vérifiez les limites et le plafond policy.</span>}</label></div><button type="button" onClick={() => setActive((value) => !value)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${active ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}><span>{active ? "Offre visible sur le marché" : "Offre masquée du marché"}</span>{active ? <Play size={17} /> : <Pause size={17} />}</button><DSButton type="button" onClick={save} disabled={saving || rateInvalid || limitsInvalid}><Save size={16} />{saving ? "Enregistrement..." : "Enregistrer l’offre"}</DSButton>{message && <p className="text-sm text-emerald-200">{message}</p>}{error && <p className="text-sm text-rose-200">{error}</p>}</div>
      </DSCard>
    </DSPage>
  );
}
