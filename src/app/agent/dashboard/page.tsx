"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  ArrowUpRight,
  Coins,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
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

type DashboardCard = {
  label: string;
  value: string;
  icon: typeof Coins;
  accent: string;
};

export default function AgentDashboardPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState("1000");

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  /**
   * Chargement des données agent.
   *
   * IMPORTANT :
   * Cette partie conserve la logique de l'ancien dashboard.
   * La refonte concerne uniquement la présentation.
   */
  const loadData = useCallback(async () => {
    setLoading(true);
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

      if (
        profileError ||
        agentError ||
        txError ||
        policyError ||
        offerError
      ) {
        throw (
          profileError ??
          agentError ??
          txError ??
          policyError ??
          offerError
        );
      }

      if (!profile || !agent || !policy) {
        throw new Error("Données agent indisponibles.");
      }

      const wholesalePrice = Number(
        policy.wholesale_price_htg_per_cp ?? 0,
      );

      const wholesaleFloor = Number(
        policy.wholesale_floor_htg_per_cp ?? 0,
      );

      const reputationLevel = Number(
        agent.reputation_level ?? 0,
      );

      const reputationDiscount = Math.min(
        Math.max(0, wholesalePrice - wholesaleFloor),
        reputationLevel,
      );

      setStats({
        cp: Number(profile.jetons_cp ?? 0),
        balance: Number(profile.balance ?? 0),
        level: reputationLevel,
        clients: Number(
          agent.successful_clients_count ?? 0,
        ),
        volume: (transactions ?? []).reduce(
          (sum, row) => sum + Number(row.amount_htg ?? 0),
          0,
        ),
        wholesale: wholesalePrice,
        floor: wholesaleFloor,
        resaleRate: Number(
          offer?.rate_htg_per_cp ??
            policy.rate_max_htg_per_cp ??
            0,
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
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /**
   * Prix réellement affiché à l'agent.
   */
  const effectivePrice = useMemo(() => {
    if (!stats) return 0;

    return Math.max(
      stats.floor,
      stats.wholesale - stats.reputationDiscount,
    );
  }, [stats]);

  /**
   * Quantité affichée dans le simulateur.
   *
   * Cette valeur sert uniquement à l'interface.
   * Le RPC reste l'autorité finale pour le montant réel.
   */
  const simulatedCp = useMemo(() => {
    return Math.max(
      0,
      Math.floor(Number(purchaseAmount) || 0),
    );
  }, [purchaseAmount]);

  const purchaseCost = simulatedCp * effectivePrice;

  const resaleEstimate =
    simulatedCp * (stats?.resaleRate ?? 0);

  const projectedProfit =
    resaleEstimate - purchaseCost;

  const reputationProgress = stats
    ? Math.min(100, (stats.clients % 10) * 10)
    : 0;

  const cards = useMemo<DashboardCard[]>(() => {
    if (!stats) return [];

    return [
      {
        label: "Solde CP",
        value: stats.cp.toLocaleString(),
        icon: Coins,
        accent: "text-emerald-300",
      },
      {
        label: "Solde HTG",
        value: `${stats.balance.toLocaleString()} HTG`,
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
        label: "Clients uniques",
        value: stats.clients.toLocaleString(),
        icon: Users,
        accent: "text-fuchsia-300",
      },
      {
        label: "Volume P2P",
        value: `${stats.volume.toLocaleString()} HTG`,
        icon: ShoppingCart,
        accent: "text-sky-300",
      },
    ];
  }, [stats]);

  /**
   * ACHAT WHOLESALE
   *
   * LOGIQUE CONSERVÉE DE L'ANCIEN CODE.
   *
   * Le dashboard appelle toujours :
   * agent_buy_wholesale
   *
   * avec :
   * p_amount_cp
   */
  const buyWholesale = async () => {
    setPurchaseLoading(true);
    setMessage(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "agent_buy_wholesale",
        {
          p_amount_cp: Math.floor(
            Number(purchaseAmount),
          ),
        },
      );

      /**
       * Même comportement métier que l'ancien dashboard :
       * le RPC reste responsable de la validation réelle.
       */
      if (rpcError) {
        setMessage(rpcError.message);
      } else {
        setMessage(
          `${Number(data.amount_cp).toLocaleString()} CP achetés pour ${Number(
            data.amount_htg,
          ).toLocaleString()} HTG.`,
        );
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Achat impossible.",
      );
    } finally {
      /**
       * Le modal est fermé après la tentative,
       * comme dans l'ancien comportement.
       */
      setPurchaseLoading(false);
      setPurchaseOpen(false);

      /**
       * Les données sont toujours actualisées après l'achat.
       */
      await loadData();
    }
  };

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
        <DSCard className="border-rose-300/30 p-6 text-rose-200">
          {error ?? "Données agent indisponibles."}
        </DSCard>
      </DSPage>
    );
  }

  return (
    <DSPage className="mx-auto max-w-6xl px-4 py-7 sm:py-9">
      <div className="space-y-7">

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />

                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-300">
                  Espace agent
                </p>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Tableau de bord
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Suivez votre stock, votre réputation et votre activité P2P.
              </p>
            </div>

            <DSBadgeStatus tone="success">
              Agent actif
            </DSBadgeStatus>
          </div>
        </motion.section>

        {/* STATS */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(
            ({ label, value, icon: Icon, accent }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.035, 0.14),
                  duration: 0.25,
                }}
              >
                <DSCard className="group h-full border-white/[0.08] bg-white/[0.02] p-5 transition-colors duration-200 hover:border-emerald-300/20">
                  <div className="flex items-center justify-between">
                    <Icon
                      size={20}
                      className={accent}
                    />

                    <ArrowUpRight
                      size={15}
                      className="text-slate-700 transition-colors group-hover:text-slate-500"
                    />
                  </div>

                  <p className="mt-6 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1.5 text-lg font-black tracking-tight text-white">
                    {value}
                  </p>
                </DSCard>
              </motion.div>
            ),
          )}
        </section>

        {/* MAIN GRID */}
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">

          {/* REPUTATION */}
          <DSCard className="relative overflow-hidden border-white/[0.08] bg-white/[0.02] p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-300/5 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Progression
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                    Réputation agent
                  </h2>
                </div>

                <DSBadgeStatus tone="warning">
                  Niveau {stats.level}
                </DSBadgeStatus>
              </div>

              <div className="mt-8">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Progression
                  </span>

                  <span className="font-semibold text-amber-200">
                    {stats.clients % 10}/10
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${reputationProgress}%`,
                    }}
                    transition={{
                      duration: 0.65,
                      ease: "easeOut",
                    }}
                    className="h-full rounded-full bg-linear-to-r from-amber-300 to-emerald-300"
                  />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                  <TrendingUp
                    size={17}
                    className="text-emerald-300"
                  />

                  <p className="mt-3 text-[11px] text-slate-500">
                    Clients réussis
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {stats.clients.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                  <Award
                    size={17}
                    className="text-amber-300"
                  />

                  <p className="mt-3 text-[11px] text-slate-500">
                    Niveau actuel
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    {stats.level}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                {stats.clients % 10}/10 clients réussis vers le prochain
                palier.
              </p>
            </div>
          </DSCard>

          {/* WHOLESALE */}
          <DSCard className="relative overflow-hidden border-emerald-300/10 bg-white/[0.025] p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-300/5 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet
                      size={17}
                      className="text-emerald-300"
                    />

                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Simulateur agent
                    </p>
                  </div>

                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                    Achat de gros & marge
                  </h2>
                </div>

                <DSBadgeStatus tone="info">
                  Temps réel
                </DSBadgeStatus>
              </div>

              <label className="mt-6 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CP à acheter

                <DSInput
                  type="number"
                  min={1}
                  step={1}
                  value={purchaseAmount}
                  onChange={(event) =>
                    setPurchaseAmount(event.target.value)
                  }
                  className="mt-2"
                />
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Prix de gros
                  </p>

                  <p className="mt-2 text-lg font-black text-white">
                    {purchaseCost.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    HTG
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Revente estimée
                  </p>

                  <p className="mt-2 text-lg font-black text-cyan-200">
                    {resaleEstimate.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    {stats.resaleRate.toFixed(4)} HTG/CP
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    projectedProfit >= 0
                      ? "border-emerald-300/15 bg-emerald-300/[0.035]"
                      : "border-rose-300/15 bg-rose-300/[0.035]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Bénéfice projeté
                  </p>

                  <p
                    className={`mt-2 text-lg font-black ${
                      projectedProfit >= 0
                        ? "text-emerald-200"
                        : "text-rose-200"
                    }`}
                  >
                    {projectedProfit.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    HTG
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-300/[0.08] bg-emerald-300/[0.025] px-4 py-3">
                <p className="text-xs leading-5 text-emerald-100/70">
                  Réduction réputation actuelle :{" "}
                  <span className="font-semibold text-emerald-200">
                    {stats.reputationDiscount.toFixed(4)} HTG/CP
                  </span>{" "}
                  · prix agent{" "}
                  <span className="font-semibold text-white">
                    {effectivePrice.toFixed(4)} HTG/CP
                  </span>
                  .
                </p>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                {message ? (
                  <p
                    className={`text-xs ${
                      message.includes("pour")
                        ? "text-emerald-200"
                        : "text-rose-200"
                    }`}
                  >
                    {message}
                  </p>
                ) : (
                  <span />
                )}

                <DSButton
                  type="button"
                  onClick={() => setPurchaseOpen(true)}
                >
                  <ShoppingCart size={16} />
                  Acheter le stock
                </DSButton>
              </div>
            </div>
          </DSCard>
        </div>

        {/* ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.25 }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          {/* app/agent/offer/page.tsx => /agent/offer */}
          <DSButton
            as="a"
            href="/agent/offer"
            className="group"
          >
            Gérer mon offre

            <ArrowUpRight
              size={15}
              className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </DSButton>

          <DSButton
            as="a"
            href="/agent/finance"
            variant="secondary"
          >
            Dépôt / retrait
          </DSButton>
        </motion.div>

        {/* PURCHASE MODAL */}
        <DSModal
          open={purchaseOpen}
          title="Confirmer l’achat de stock"
          description="Le RPC serveur recalculera le montant exact avant débit."
          onClose={() => setPurchaseOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <DSButton
                type="button"
                variant="ghost"
                onClick={() => setPurchaseOpen(false)}
              >
                Annuler
              </DSButton>

              <DSButton
                type="button"
                onClick={buyWholesale}
                disabled={purchaseLoading}
              >
                {purchaseLoading
                  ? "Débit..."
                  : "Confirmer"}
              </DSButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-xs text-slate-500">
                Stock sélectionné
              </p>

              <p className="mt-1 text-2xl font-black text-white">
                {simulatedCp.toLocaleString()} CP
              </p>
            </div>

            <p className="text-sm leading-6 text-slate-300">
              Vous allez engager{" "}
              <strong className="text-white">
                {purchaseCost.toLocaleString()} HTG
              </strong>{" "}
              pour {simulatedCp.toLocaleString()} CP, au prix estimé de{" "}
              <strong className="text-emerald-200">
                {effectivePrice.toFixed(4)} HTG/CP
              </strong>
              .
            </p>
          </div>
        </DSModal>
      </div>
    </DSPage>
  );
      }
