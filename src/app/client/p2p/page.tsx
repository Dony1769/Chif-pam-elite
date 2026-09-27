"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Loader2,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MarketSwitcher } from "@/components/client/MarketSwitcher";

type Offer = {
  id: string;
  agent_id: string;
  rate_htg_per_cp: number;
  min_cp: number;
  max_cp: number;
  payment_methods: string[];
  available_balance: number;
  reputation_level: number;
  successful_clients_count: number;
  username: string;
};

type Feedback = { type: "success" | "error"; text: string } | null;

const QUICK_AMOUNTS = [100, 500, 1000, 2500];

function ReputationStars({ level }: { level: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(level)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < filled ? "fill-amber-300 text-amber-300" : "text-slate-700"} />
      ))}
    </div>
  );
}

function VolumeRangeMeter({ min, max, floor, ceiling }: { min: number; max: number; floor: number; ceiling: number }) {
  const span = Math.max(1, ceiling - floor);
  const left = Math.min(96, Math.max(0, ((min - floor) / span) * 100));
  const width = Math.max(4, Math.min(100 - left, ((max - min) / span) * 100));
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/5">
      <div className="absolute h-1 rounded-full bg-emerald-400/60" style={{ left: `${left}%`, width: `${width}%` }} />
    </div>
  );
}

function OfferCard({
  offer,
  isSelected,
  isBest,
  cpFloor,
  cpCeiling,
  onSelect,
}: {
  offer: Offer;
  isSelected: boolean;
  isBest: boolean;
  cpFloor: number;
  cpCeiling: number;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.99 }}
      className={`relative w-full rounded-2xl border p-4 text-left transition ${
        isSelected
          ? "border-emerald-300 bg-emerald-300/10 shadow-[0_0_28px_rgba(16,185,129,0.12)]"
          : "border-white/10 bg-white/3 hover:border-emerald-300/40 hover:bg-white/4"
      }`}
    >
      {isBest && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-amber-300 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-950">
          Meilleur taux
        </span>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-black text-white">@{offer.username}</span>
          <ReputationStars level={offer.reputation_level} />
        </div>
        <span className="font-mono text-base font-black text-emerald-200">
          {offer.rate_htg_per_cp.toFixed(4)} <span className="text-[10px] font-bold text-slate-500">HTG/CP</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Users size={12} className="text-slate-500" /> {offer.successful_clients_count.toLocaleString("fr-FR")} client(s) servis
        </span>
        <span>Paiement : {offer.payment_methods.join(" · ")}</span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>Plage {offer.min_cp.toLocaleString("fr-FR")} – {offer.max_cp.toLocaleString("fr-FR")} CP</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Wallet size={11} /> {offer.available_balance.toLocaleString("fr-FR")} CP en stock
          </span>
        </div>
        <VolumeRangeMeter min={offer.min_cp} max={offer.max_cp} floor={cpFloor} ceiling={cpCeiling} />
      </div>
    </motion.button>
  );
}

function OfferSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-white/3 p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>
      <div className="mt-3 h-3 w-40 rounded bg-white/5" />
      <div className="mt-3 h-1 w-full rounded-full bg-white/5" />
    </div>
  );
}

export default function P2PMarketPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [amount, setAmount] = useState("100");
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    const loadOffers = async () => {
      const { data } = await supabase
        .from("p2p_offers")
        .select("id, agent_id, rate_htg_per_cp, min_cp, max_cp, payment_methods")
        .eq("active", true)
        .order("rate_htg_per_cp", { ascending: true });
      const rows = data ?? [];
      const agentIds = rows.map((row) => row.agent_id);
      const [{ data: agents }, { data: profiles }] = await Promise.all([
        supabase.from("agent_profiles").select("user_id, reputation_level, successful_clients_count").in("user_id", agentIds),
        supabase.from("profiles").select("id, username, balance, locked_balance").in("id", agentIds),
      ]);
      setOffers(
        rows.map((row) => {
          const agent = agents?.find((entry) => entry.user_id === row.agent_id);
          const profile = profiles?.find((entry) => entry.id === row.agent_id);
          return {
            ...row,
            available_balance: Math.max(0, Number(profile?.balance ?? 0) - Number(profile?.locked_balance ?? 0)),
            reputation_level: agent?.reputation_level ?? 0,
            successful_clients_count: agent?.successful_clients_count ?? 0,
            username: profile?.username ?? "Agent",
          };
        })
      );
      setLoading(false);
    };
    void loadOffers();
  }, []);

  const selected = useMemo(() => offers.find((entry) => entry.id === selectedOffer) ?? null, [offers, selectedOffer]);

  const marketStats = useMemo(() => {
    if (!offers.length) return { best: 0, average: 0, cpFloor: 0, cpCeiling: 0 };
    const rates = offers.map((o) => o.rate_htg_per_cp);
    return {
      best: Math.min(...rates),
      average: rates.reduce((sum, r) => sum + r, 0) / rates.length,
      cpFloor: Math.min(...offers.map((o) => o.min_cp)),
      cpCeiling: Math.max(...offers.map((o) => o.max_cp)),
    };
  }, [offers]);

  const cp = Math.max(0, Math.floor(Number(amount) || 0));
  const totalHtg = selected ? cp * selected.rate_htg_per_cp : 0;
  const amountInRange = selected ? cp >= selected.min_cp && cp <= selected.max_cp : false;
  const rateDiffPct =
    selected && marketStats.average ? ((selected.rate_htg_per_cp - marketStats.average) / marketStats.average) * 100 : 0;

  const execute = async () => {
    if (!selectedOffer || !Number.isInteger(Number(amount)) || Number(amount) <= 0) return;
    setSubmitting(true);
    setFeedback(null);
    const offer = offers.find((entry) => entry.id === selectedOffer);
    const { data: transaction, error } = await supabase.rpc("p2p_buy_cp", {
      p_offer_id: selectedOffer,
      p_amount_cp: Number(amount),
    });
    if (error) {
      setFeedback({ type: "error", text: error.message });
    } else {
      setFeedback({
        type: "success",
        text: `${Number(transaction?.amount_cp ?? amount).toLocaleString()} CP avec @${offer?.username} pour ${Number(
          transaction?.amount_htg ?? 0
        ).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} HTG.`,
      });
    }
    setSubmitting(false);
  };

  return (
    <main className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-[#05070b] px-4 py-6 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.10),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(245,158,11,0.08),transparent_28%)]" />

      <div className="relative mx-auto max-w-5xl space-y-6">
        <MarketSwitcher active="p2p" />

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} aria-label="Retour" className="rounded-xl border border-white/10 p-3 transition hover:border-emerald-300/40">
              <ArrowLeftRight size={18} />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Marché interne</p>
              <h1 className="text-3xl font-black">CP P2P</h1>
            </div>
          </div>

          {!loading && offers.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5">
              <TrendingDown size={15} className="text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">Meilleur taux</span>
              <span className="font-mono text-sm font-black text-amber-100">{marketStats.best.toFixed(4)} HTG/CP</span>
            </div>
          )}
        </header>

        <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-emerald-300" size={20} />
            <p className="text-sm leading-6 text-slate-300">
              Les gourdes et les CP restent dans la plateforme. Le prix final est calculé et validé par Supabase.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Agents disponibles</h2>
              <span className="text-xs text-slate-500">{offers.length} offre(s)</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <OfferSkeleton />
                <OfferSkeleton />
                <OfferSkeleton />
              </div>
            ) : offers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
                <p className="text-sm font-bold text-white">Aucune offre active pour le moment</p>
                <p className="mt-1 text-xs text-slate-500">Revenez bientôt, de nouveaux agents publient régulièrement.</p>
              </div>
            ) : (
              <motion.div layout className="space-y-3">
                {offers.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <OfferCard
                      offer={offer}
                      isSelected={selectedOffer === offer.id}
                      isBest={index === 0}
                      cpFloor={marketStats.cpFloor}
                      cpCeiling={marketStats.cpCeiling}
                      onSelect={() => {
                        setSelectedOffer(offer.id);
                        setFeedback(null);
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>

          <section className="h-fit space-y-4 rounded-3xl border border-white/10 bg-white/3 p-5 lg:sticky lg:top-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Achat sécurisé</p>
              <p className="mt-1 text-sm text-slate-400">
                {selected ? `Vous achetez auprès de @${selected.username}.` : "Sélectionnez une offre pour acheter des CP avec votre solde HTG."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Montant CP
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setFeedback(null);
                  }}
                  className={`mt-2 w-full rounded-xl border bg-slate-950 px-4 py-3 text-white transition ${
                    selected && !amountInRange ? "border-rose-400/50" : "border-white/10 focus:border-emerald-300/50"
                  }`}
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-200"
                  >
                    {value.toLocaleString("fr-FR")}
                  </button>
                ))}
                {selected && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.max(0, Math.min(selected.max_cp, selected.available_balance))))}
                    className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition hover:border-amber-300/50"
                  >
                    Max
                  </button>
                )}
              </div>

              {selected && !amountInRange && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <AlertCircle size={13} /> Cette offre accepte entre {selected.min_cp.toLocaleString("fr-FR")} et{" "}
                  {selected.max_cp.toLocaleString("fr-FR")} CP.
                </p>
              )}
            </div>

            {selected && (
              <div className="space-y-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm">
                <p className="font-black text-white">@{selected.username}</p>
                <p className="text-slate-300">
                  Prix payé : <strong className="text-emerald-200">{totalHtg.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} HTG</strong>
                </p>
                <p className="text-slate-400">
                  {cp.toLocaleString("fr-FR")} CP à {selected.rate_htg_per_cp.toFixed(4)} HTG/CP
                </p>
                {marketStats.average > 0 && (
                  <p className={`flex items-center gap-1.5 text-xs font-bold ${
                    rateDiffPct < -0.05 ? "text-emerald-300" : rateDiffPct > 0.05 ? "text-amber-300" : "text-slate-400"
                  }`}>
                    {rateDiffPct < -0.05 ? <TrendingDown size={13} /> : rateDiffPct > 0.05 ? <TrendingUp size={13} /> : <Minus size={13} />}
                    {Math.abs(rateDiffPct) < 0.05
                      ? "Aligné sur la moyenne du marché"
                      : `${Math.abs(rateDiffPct).toFixed(1)}% ${rateDiffPct < 0 ? "moins cher" : "plus cher"} que la moyenne du marché`}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void execute()}
              disabled={submitting || !selectedOffer || cp <= 0 || (selected ? !amountInRange : false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? "Validation..." : "Acheter les CP"}
            </button>

            <AnimatePresence mode="wait">
              {feedback && (
                <motion.div
                  key={feedback.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                    feedback.type === "success"
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-200"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
}
