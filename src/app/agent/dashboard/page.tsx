"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Coins,
  CreditCard,
  ShoppingCart,
  Users,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  WalletCards,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  DSBadgeStatus,
  DSButton,
  DSCard,
  DSInput,
  DSLoader,
  DSModal,
  DSPage,
} from "@/components/ui/primitives";

type AgentStats = {
  cp: number;
  balance: number;
  level: number;
  clients: number;
  volume: number;
  wholesale: number;
  floor: number;
  resaleRate: number;
  reputationDiscount: number;
};

type StatCardProps = {
  label: string;
  value: string;
  icon: typeof Coins;
  accent: string;
};

const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: StatCardProps) {
  return (
    <DSCard className="group relative overflow-hidden border-white/8 bg-white/[0.025] p-5 transition-colors duration-200 hover:border-white/15">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl transition-opacity duration-200 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] ${accent}`}
        >
          <Icon size={19} strokeWidth={2} />
        </div>

        <ArrowUpRight
          size={15}
          className="text-slate-600 transition-colors duration-200 group-hover:text-slate-400"
        />
      </div>

      <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="relative mt-2 truncate text-2xl font-black tracking-tight text-white">
        {value}
      </p>
    </DSCard>
  );
});

function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function AgentDashboardPage() {
  const reduceMotion = useReducedMotion();

  const [stats, setStats] = useState<AgentStats | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState("1000");
  const [message, setMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw authError ?? new Error("Session agent introuvable.");
      }

      const [
        { data: profile, error: profileError },
        { data: agent, error: agentError },
        { data: transactions, error: txError },
        { data: policy, error: policyError },
        { data: offer, error: offerError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("jetons_cp, balance")
          .eq("id", user.id)
          .single(),

        supabase
          .from("agent_profiles")
          .select("reputation_level, successful_clients_count")
          .eq("user_id", user.id)
          .single(),

        supabase
          .from("p2p_transactions")
          .select("amount_htg")
          .eq("agent_id", user.id)
          .eq("status", "completed"),

        supabase
          .from("market_policy")
          .select(
            "wholesale_price_htg_per_cp, wholesale_floor_htg_per_cp, rate_max_htg_per_cp",
          )
          .eq("active", true)
          .single(),

        supabase
          .from("p2p_offers")
          .select("rate_htg_per_cp")
          .eq("agent_id", user.id)
          .maybeSingle(),
      ]);

      const queryError =
        profileError ??
        agentError ??
        txError ??
        policyError ??
        offerError;

      if (queryError) {
        throw queryError;
      }

      const wholesale = Number(policy.wholesale_price_htg_per_cp ?? 0);
      const floor = Number(policy.wholesale_floor_htg_per_cp ?? 0);
      const level = Number(agent.reputation_level ?? 0);

      const reputationDiscount = Math.min(
        Math.max(0, wholesale - floor),
        level,
      );

      const volume = (transactions ?? []).reduce(
        (sum, row) => sum + Number(row.amount_htg ?? 0),
        0,
      );

      setStats({
        cp: Number(profile.jetons_cp ?? 0),
        balance: Number(profile.balance ?? 0),
        level,
        clients: Number(agent.successful_clients_count ?? 0),
        volume,
        wholesale,
        floor,
        resaleRate: Number(
          offer?.rate_htg_per_cp ?? policy.rate_max_htg_per_cp ?? 0,
        ),
        reputationDiscount,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const purchaseData = useMemo(() => {
    const simulatedCp = Math.max(
      0,
      Math.floor(Number(purchaseAmount) || 0),
    );

    if (!stats) {
      return {
        simulatedCp,
        effectivePrice: 0,
        purchaseCost: 0,
        resaleEstimate: 0,
        projectedProfit: 0,
      };
    }

    const effectivePrice = Math.max(
      stats.floor,
      stats.wholesale - stats.reputationDiscount,
    );

    const purchaseCost = simulatedCp * effectivePrice;
    const resaleEstimate = simulatedCp * stats.resaleRate;
    const projectedProfit = resaleEstimate - purchaseCost;

    return {
      simulatedCp,
      effectivePrice,
      purchaseCost,
      resaleEstimate,
      projectedProfit,
    };
  }, [purchaseAmount, stats]);

  const progress = useMemo(() => {
    if (!stats) return 0;
    return Math.min(100, (stats.clients % 10) * 10);
  }, [stats]);

  const buyWholesale = useCallback(async () => {
    const amount = Math.floor(Number(purchaseAmount));

    if (!Number.isFinite(amount) || amount < 1) {
      setMessage("Veuillez saisir une quantité de CP valide.");
      return;
    }

    setPurchaseLoading(true);
    setMessage(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "agent_buy_wholesale",
        {
          p_amount_cp: amount,
        },
      );

      if (rpcError) {
        setMessage(rpcError.message);
        return;
      }

      setMessage(
        `${Number(data.amount_cp).toLocaleString()} CP achetés pour ${Number(
          data.amount_htg,
        ).toLocaleString()} HTG.`,
      );

      setPurchaseOpen(false);

      await loadData(true);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Achat impossible.",
      );
    } finally {
      setPurchaseLoading(false);
    }
  }, [loadData, purchaseAmount]);

  if (loading) {
    return (
      <DSPage className="mx-auto max-w-6xl px-4 py-10">
        <DSLoader label="Chargement du tableau de bord agent..." />
      </DSPage>
    );
  }

  if (error || !stats) {
    return (
      <DSPage className="mx-auto max-w-6xl px-4 py-10">
        <DSCard className="border-rose-300/20 bg-rose-300/[0.03] p-6">
          <p className="text-sm font-semibold text-rose-200">
            {error ?? "Données agent indisponibles."}
          </p>

          <DSButton
            type="button"
            variant="secondary"
            className="mt-5"
            onClick={() => void loadData()}
          >
            <RefreshCw size={16} />
            Réessayer
          </DSButton>
        </DSCard>
      </DSPage>
    );
  }

  const cards: StatCardProps[] = [
    {
      label: "Stock CP",
      value: formatNumber(stats.cp),
      icon: Coins,
      accent: "text-emerald-300",
    },
    {
      label: "Solde HTG",
      value: `${formatNumber(stats.balance)} HTG`,
      icon: CreditCard,
      accent: "text-cyan-300",
    },
    {
      label: "Réputation",
      value: `Niveau ${stats.level}`,
      icon: Award,
      accent: "text-amber-300",
    },
    {
      label: "Clients",
      value: formatNumber(stats.clients),
      icon: Users,
      accent: "text-fuchsia-300",
    },
    {
      label: "Volume P2P",
      value: `${formatNumber(stats.volume)} HTG`,
      icon: ShoppingCart,
      accent: "text-sky-300",
    },
  ];

  const introAnimation = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35 },
      };

  return (
    <DSPage className="relative isolate mx-auto max-w-6xl overflow-hidden px-4 py-7 sm:py-9">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden"
      >
        <div className="absolute left-[8%] top-[-180px] h-[420px] w-[420px] rounded-full bg-emerald-400/[0.045] blur-[110px]" />
        <div className="absolute right-[5%] top-[-160px] h-[380px] w-[380px] rounded-full bg-cyan-400/[0.035] blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/20 to-transparent" />
      </div>

      {/* Header */}
      <motion.header
        {...introAnimation}
        className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-300">
              Espace agent
            </p>
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
            Tableau de bord
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Votre activité, votre stock et votre progression réunis dans un
            espace unique.
          </p>
        </div>

        <DSButton
          type="button"
          variant="ghost"
          onClick={() => void loadData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto"
        >
          <RefreshCw
            size={15}
            className={refreshing ? "animate-spin" : ""}
          />
          Actualiser
        </DSButton>
      </motion.header>

      {/* Main balance / identity block */}
      <motion.section
        {...introAnimation}
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 0.4,
                delay: 0.04,
              }
        }
      >
        <DSCard className="relative overflow-hidden border-white/10 bg-linear-to-br from-white/[0.055] via-white/[0.025] to-emerald-300/[0.025] p-6 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full border border-emerald-300/[0.06]"
          />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DSBadgeStatus tone="success">
                  Agent actif
                </DSBadgeStatus>

                <DSBadgeStatus tone="warning">
                  Niveau {stats.level}
                </DSBadgeStatus>
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Votre stock disponible
                </p>

                <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                    {formatNumber(stats.cp)}
                  </span>

                  <span className="pb-1 text-sm font-bold uppercase tracking-widest text-emerald-300">
                    CP
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  Solde disponible :{" "}
                  <span className="font-bold text-slate-200">
                    {formatNumber(stats.balance)} HTG
                  </span>
                </p>
              </div>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.045] shadow-[0_0_50px_rgba(52,211,153,0.07)]">
              <WalletCards
                size={38}
                strokeWidth={1.5}
                className="text-emerald-300"
              />
            </div>
          </div>
        </DSCard>
      </motion.section>

      {/* Stats */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 8,
                  }
            }
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: 1,
                    y: 0,
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 0.28,
                    delay: 0.05 + index * 0.035,
                  }
            }
          >
            <StatCard {...card} />
          </motion.div>
        ))}
      </section>

      {/* Core dashboard */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Reputation */}
        <DSCard className="relative overflow-hidden border-white/8 bg-white/[0.025] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Progression
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                Réputation agent
              </h2>
            </div>

            <Award
              size={20}
              className="text-amber-300"
            />
          </div>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-black text-white">
                {stats.level}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Niveau actuel
              </p>
            </div>

            <p className="text-right text-xs text-slate-400">
              {stats.clients % 10}/10
              <br />
              <span className="text-slate-600">
                clients réussis
              </span>
            </p>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              initial={
                reduceMotion
                  ? false
                  : {
                      width: 0,
                    }
              }
              animate={{
                width: `${progress}%`,
              }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 0.7,
                      ease: "easeOut",
                    }
              }
              className="h-full rounded-full bg-linear-to-r from-amber-300 via-emerald-300 to-cyan-300"
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            {stats.clients % 10}/10 clients réussis vers le prochain
            palier.
          </p>

          <div className="mt-7 flex items-center gap-2 border-t border-white/7 pt-5">
            <ShieldCheck
              size={16}
              className="text-emerald-300"
            />
            <span className="text-xs text-slate-400">
              Progression basée sur votre activité agent.
            </span>
          </div>
        </DSCard>

        {/* Wholesale simulator */}
        <DSCard className="relative overflow-hidden border-white/8 bg-white/[0.025] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles
                  size={15}
                  className="text-emerald-300"
                />

                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Simulateur
                </p>
              </div>

              <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                Achat de gros & marge
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Estimez votre opération avant validation.
              </p>
            </div>

            <DSBadgeStatus tone="info">
              Temps réel
            </DSBadgeStatus>
          </div>

          <div className="mt-6">
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Quantité de CP

              <DSInput
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={purchaseAmount}
                onChange={(event) =>
                  setPurchaseAmount(event.target.value)
                }
                className="mt-2"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/7 bg-black/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Coût achat
              </p>

              <p className="mt-2 text-lg font-black text-white">
                {formatNumber(
                  purchaseData.purchaseCost,
                  2,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                HTG
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Revente estimée
              </p>

              <p className="mt-2 text-lg font-black text-cyan-200">
                {formatNumber(
                  purchaseData.resaleEstimate,
                  2,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                {stats.resaleRate.toFixed(4)} HTG/CP
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                purchaseData.projectedProfit >= 0
                  ? "border-emerald-300/10 bg-emerald-300/[0.025]"
                  : "border-rose-300/10 bg-rose-300/[0.025]"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Gain projeté
              </p>

              <p
                className={`mt-2 text-lg font-black ${
                  purchaseData.projectedProfit >= 0
                    ? "text-emerald-200"
                    : "text-rose-200"
                }`}
              >
                {formatNumber(
                  purchaseData.projectedProfit,
                  2,
                )}
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                HTG
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/7 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Prix agent
              </p>

              <p className="mt-1 text-sm font-bold text-white">
                {purchaseData.effectivePrice.toFixed(4)} HTG/CP
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Réduction réputation
              </p>

              <p className="mt-1 text-sm font-bold text-emerald-200">
                {stats.reputationDiscount.toFixed(4)} HTG/CP
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <TrendingUp
                size={15}
                className="text-emerald-300"
              />
              {purchaseData.simulatedCp.toLocaleString()} CP simulés
            </div>

            <DSButton
              type="button"
              onClick={() => setPurchaseOpen(true)}
              disabled={purchaseData.simulatedCp < 1}
            >
              <ShoppingCart size={16} />
              Acheter le stock
            </DSButton>
          </div>

          {message && (
            <p
              className={`mt-4 rounded-xl border p-3 text-xs ${
                message.includes("pour")
                  ? "border-emerald-300/10 bg-emerald-300/[0.03] text-emerald-200"
                  : "border-rose-300/10 bg-rose-300/[0.03] text-rose-200"
              }`}
            >
              {message}
            </p>
          )}
        </DSCard>
      </section>

      {/* Navigation actions */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <DSButton
          as="a"
          href="/agent/offer"
          className="group h-auto justify-between rounded-2xl p-4"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <ShoppingCart size={17} />
            </span>

            <span className="text-left">
              <span className="block text-sm font-bold">
                Gérer mon offre
              </span>
              <span className="mt-0.5 block text-[11px] font-normal text-white/50">
                Configurez votre activité P2P
              </span>
            </span>
          </span>

          <ArrowUpRight
            size={17}
            className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </DSButton>

        <DSButton
          as="a"
          href="/agent/finance"
          variant="secondary"
          className="group h-auto justify-between rounded-2xl p-4"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <CreditCard size={17} />
            </span>

            <span className="text-left">
              <span className="block text-sm font-bold">
                Dépôt / retrait
              </span>
              <span className="mt-0.5 block text-[11px] font-normal text-white/50">
                Gérez votre solde HTG
              </span>
            </span>
          </span>

          <ArrowUpRight
            size={17}
            className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </DSButton>
      </section>

      {/* Purchase confirmation */}
      <DSModal
        open={purchaseOpen}
        title="Confirmer l’achat de stock"
        description="Le RPC serveur recalculera le montant exact avant débit."
        onClose={() => {
          if (!purchaseLoading) {
            setPurchaseOpen(false);
          }
        }}
        footer={
          <div className="flex justify-end gap-2">
            <DSButton
              type="button"
              variant="ghost"
              onClick={() => setPurchaseOpen(false)}
              disabled={purchaseLoading}
            >
              Annuler
            </DSButton>

            <DSButton
              type="button"
              onClick={() => void buyWholesale()}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                  Débit...
                </>
              ) : (
                <>
                  <ShoppingCart size={15} />
                  Confirmer
                </>
              )}
            </DSButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Opération
            </p>

            <p className="mt-2 text-2xl font-black text-white">
              {purchaseData.simulatedCp.toLocaleString()} CP
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Montant estimé
              </p>

              <p className="mt-1 font-bold text-white">
                {formatNumber(
                  purchaseData.purchaseCost,
                  2,
                )}{" "}
                HTG
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Prix agent
              </p>

              <p className="mt-1 font-bold text-emerald-200">
                {purchaseData.effectivePrice.toFixed(4)} HTG/CP
              </p>
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Le montant affiché est une estimation. Le serveur effectuera
            le calcul final au moment de la validation.
          </p>
        </div>
      </DSModal>
    </DSPage>
  );
          }
