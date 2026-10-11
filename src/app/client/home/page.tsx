"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { signOutAndClearClientSession } from "@/lib/client-session";
import { usePathname, useRouter } from "next/navigation";

import {
  Activity,
  ArrowRightLeft,
  ArrowUpRight,
  Bell,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Coins,
  Crown,
  Fingerprint,
  Flame,
  Gift,
  Lock,
  LogOut,
  Menu,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import {
  DSButton,
  DSCard,
  DSHeader,
  DSPage,
  DSPanel,
  DSSkeleton,
} from "@/components/ui/primitives";

import ThreeSurface from "@/components/three/ThreeSurface";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface Profile {
  id: string;
  username: string | null;
  jetons_cp: number;
  balance: number;
  vip_status: string | null;
  vip_expiry: string | null;
  auto_renew: boolean | null;
  login_streak: number | null;
  rank?: string;
}

export interface GameItem {
  id: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  players: string;
  tag?: string;
}

/* -------------------------------------------------------------------------- */
/* LOGO                                                                       */
/* -------------------------------------------------------------------------- */

const ChifPamLogo = React.memo(
  ({ glowing = false }: { glowing?: boolean }) => (
    <div className="relative flex items-center justify-center">
      {glowing && (
        <>
          <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse pointer-events-none" />

          <div className="absolute inset-1 rounded-full border border-emerald-400/20 animate-[spin_8s_linear_infinite] pointer-events-none" />
        </>
      )}

      <svg
        viewBox="0 0 100 100"
        className={[
          "relative z-10 h-10 w-10 sm:h-12 sm:w-12",
          "transition-all duration-500",
          glowing
            ? "scale-105 drop-shadow-[0_0_18px_rgba(16,185,129,0.85)]"
            : "drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]",
        ].join(" ")}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61"
          stroke="#10B981"
          strokeWidth="10"
          strokeLinecap="round"
        />

        <path
          d="M55 45L76 24M76 24H58M76 24V42"
          stroke="#10B981"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
);

ChifPamLogo.displayName = "ChifPamLogo";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const formatNumber = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString("fr-FR");

const MenuLink = React.memo(
  ({
    href,
    icon,
    label,
    badge,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    badge?: string | number;
  }) => (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-white/5 hover:bg-white/5 active:scale-[0.98]"
    >
      <div className="shrink-0">{icon}</div>

      <span className="text-[11px] font-black italic uppercase tracking-wider text-slate-300 transition group-hover:text-white">
        {label}
      </span>

      {badge !== undefined && badge !== "" ? (
        <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
          {badge}
        </span>
      ) : (
        <ChevronRight
          size={14}
          className="ml-auto text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300"
        />
      )}
    </Link>
  )
);

MenuLink.displayName = "MenuLink";

const GameRow = React.memo(
  ({
    href,
    icon,
    title,
    desc,
    players,
    tag,
  }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    players: string;
    tag?: string;
  }) => (
    <Link
      href={href}
      className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/5 bg-slate-950/70 p-3.5 transition-all duration-300 hover:border-emerald-500/30 hover:bg-slate-900 active:scale-[0.985]"
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 transition-transform duration-300 group-hover:scale-105 group-hover:border-emerald-500/30 sm:h-11 sm:w-11">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-xs font-black italic uppercase tracking-wider text-white">
              {title}
            </h4>

            {tag && (
              <span className="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
                {tag}
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-[10px] font-normal italic lowercase text-slate-400">
            {desc}
          </p>
        </div>
      </div>

      <div className="relative z-10 ml-2 flex shrink-0 items-center gap-2">
        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400">
          {players}
        </span>

        <ChevronRight
          size={14}
          className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-400"
        />
      </div>
    </Link>
  )
);

GameRow.displayName = "GameRow";

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function ClientHome() {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [cpToHtgRate, setCpToHtgRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState(false);

  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [activeChallengesCount, setActiveChallengesCount] = useState(0);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isWideViewport, setIsWideViewport] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [cpToConvert, setCpToConvert] = useState(100);

  /* ---------------------------------------------------------------------- */
  /* DERIVED STATE                                                          */
  /* ---------------------------------------------------------------------- */

  const isVipActive = Boolean(
    profile?.vip_status &&
      profile.vip_status !== "free" &&
      profile.vip_expiry &&
      new Date(profile.vip_expiry).getTime() > Date.now()
  );

  const vipExpiryLabel = profile?.vip_expiry
    ? new Date(profile.vip_expiry).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const calculatedHTG = useMemo(() => {
    const cp = Math.max(0, Number(cpToConvert) || 0);

    if (cpToHtgRate === null) return null;

    return (cp * cpToHtgRate).toFixed(2);
  }, [cpToConvert, cpToHtgRate]);

  const totalEstimatedHTG = useMemo(() => {
    if (cpToHtgRate === null) return null;

    return ((profile?.jetons_cp || 0) * cpToHtgRate).toFixed(2);
  }, [cpToHtgRate, profile?.jetons_cp]);

  const globalNotificationCount = unreadNotifs;

  /* ---------------------------------------------------------------------- */
  /* VIEWPORT                                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");

    const updateViewport = () => {
      setIsWideViewport(mediaQuery.matches);
    };

    updateViewport();

    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* CP DEFAULT                                                              */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (profile?.jetons_cp !== undefined) {
      setCpToConvert(Math.min(profile.jetons_cp, 100));
    }
  }, [profile?.jetons_cp]);

  /* ---------------------------------------------------------------------- */
  /* VISIBILITY                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* AUDIO                                                                   */
  /* ---------------------------------------------------------------------- */

  const playPing = useCallback(() => {
    try {
      const audio = new Audio("/sounds/pop.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {
      // Audio non supporté.
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* DATA HELPERS                                                           */
  /* ---------------------------------------------------------------------- */

  const fetchChallengesCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("challenges")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (!error) {
      setActiveChallengesCount(count || 0);
    }
  }, []);

  const refreshChatCount = useCallback(async () => {
    if (!currentUserId || pathname === "/client/chat") {
      setUnreadChat(0);
      return;
    }

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .eq("is_admin_message", true)
      .eq("is_read_by_client", false);

    if (!error) {
      setUnreadChat(count || 0);
    }
  }, [currentUserId, pathname]);

  const fetchNotificationCount = useCallback(async () => {
    if (!currentUserId) return;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (!error) {
      setUnreadNotifs(count || 0);
    }
  }, [currentUserId]);

  /* ---------------------------------------------------------------------- */
  /* MAIN DATA FETCH                                                         */
  /* ---------------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      setProfileLoading(true);
      setSummaryLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setCurrentUserId(null);
        setProfile(null);
        setUnreadNotifs(0);
        setUnreadChat(0);
        setActiveChallengesCount(0);
        return;
      }

      setCurrentUserId(user.id);

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, username, jetons_cp, balance, vip_status, vip_expiry, auto_renew, login_streak"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Erreur chargement profil:", profileError);
      } else {
        setProfile(prof as Profile);
      }

      setProfileLoading(false);

      const [
        notifCountRes,
        challengesCountRes,
        chatCountRes,
      ] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),

        supabase
          .from("challenges")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),

        pathname === "/client/chat"
          ? Promise.resolve({ count: 0, error: null })
          : supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("is_admin_message", true)
              .eq("is_read_by_client", false),
      ]);

      setUnreadNotifs(notifCountRes.count || 0);
      setActiveChallengesCount(challengesCountRes.count || 0);
      setUnreadChat(chatCountRes.count || 0);
    } catch (error) {
      console.error("Erreur globale fetchData:", error);
    } finally {
      setProfileLoading(false);
      setSummaryLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------------------------------------------------------------- */
  /* CONVERSION RATE                                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const fetchConversionRate = async () => {
      setRateLoading(true);
      setRateError(false);

      const { data, error } = await supabase.rpc(
        "get_cp_to_htg_rate"
      );

      if (!mounted) return;

      const numericRate = Number(data);

      if (
        error ||
        !Number.isFinite(numericRate) ||
        numericRate <= 0
      ) {
        console.error(
          "Erreur chargement taux CP -> HTG:",
          error
        );

        setRateError(true);
        setCpToHtgRate(null);
      } else {
        setCpToHtgRate(numericRate);
      }

      setRateLoading(false);
    };

    fetchConversionRate();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* REALTIME                                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!currentUserId || !isTabVisible) return;

    const channel = supabase
      .channel(`client_home_sync_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUserId}`,
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => refreshChatCount()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => fetchNotificationCount()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
        },
        () => fetchChallengesCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    currentUserId,
    fetchChallengesCount,
    fetchNotificationCount,
    isTabVisible,
    refreshChatCount,
  ]);

  /* ---------------------------------------------------------------------- */
  /* CONVERSION                                                              */
  /* ---------------------------------------------------------------------- */

  const handleQuickConvert = async () => {
    if (!profile) return;

    const montantCP = Math.floor(cpToConvert);

    if (Number.isNaN(montantCP) || montantCP < 100) {
      setFeedbackMessage({
        type: "error",
        text: "Un minimum de 100 CP est requis pour effectuer une conversion.",
      });
      return;
    }

    if (montantCP > profile.jetons_cp) {
      setFeedbackMessage({
        type: "error",
        text: "Solde de CP insuffisant pour cette conversion.",
      });
      return;
    }

    setIsConverting(true);
    setFeedbackMessage(null);

    try {
      const { error } = await supabase.rpc(
        "convertir_cp_en_htg",
        {
          p_user_id: profile.id,
          p_montant_cp: montantCP,
        }
      );

      if (error) {
        setFeedbackMessage({
          type: "error",
          text:
            error.message ||
            "Erreur lors de la conversion.",
        });
      } else {
        playPing();

        await fetchData();

        const montantObtenu =
          cpToHtgRate === null
            ? null
            : (montantCP * cpToHtgRate).toFixed(2);

        setFeedbackMessage({
          type: "success",
          text:
            montantObtenu === null
              ? `Conversion réussie ! ${montantCP} CP ont été crédités sur votre solde HTG.`
              : `Conversion réussie ! ${montantCP} CP convertis en ~${montantObtenu} HTG.`,
        });
      }
    } catch (error) {
      console.error(
        "Erreur inattendue conversion:",
        error
      );

      setFeedbackMessage({
        type: "error",
        text: "Une erreur inattendue est survenue.",
      });
    } finally {
      setIsConverting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* GAMES                                                                   */
  /* ---------------------------------------------------------------------- */

  const gamesList: GameItem[] = useMemo(
    () => [
      {
        id: "quiz",
        href: "/client/quiz",
        icon: <Brain className="text-blue-400" />,
        title: "Quiz Insights",
        desc: "Défi cognitif & rapidité",
        players: "3.0k actifs",
        tag: "Populaire",
      },
      {
        id: "laser",
        href: "/client/laser-vault",
        icon: <Lock className="text-indigo-400" />,
        title: "Laser Vault",
        desc: "Réactivité & précision ultime",
        players: "2.1k actifs",
      },
      {
        id: "biometric",
        href: "/client/biometric-hack",
        icon: <Fingerprint className="text-emerald-400" />,
        title: "Biometric Lab",
        desc: "Mémoire adaptative & logique",
        players: "650 actifs",
      },
    ],
    []
  );

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <DSPage
      className={[
        "relative min-h-screen overflow-x-hidden",
        "pb-12 sm:pb-20",
        "font-black italic uppercase text-white",
        "ds-fade-up",
        isVipActive ? "bg-amber-950/10" : "",
      ].join(" ")}
    >
      {/* ------------------------------------------------------------------ */}
      {/* IMMERSIVE BACKGROUND                                               */}
      {/* ------------------------------------------------------------------ */}

      {isWideViewport && (
        <ThreeSurface
          variant={isVipActive ? "vip" : "home"}
          className="pointer-events-none absolute right-[-40px] top-0 h-64 w-96 opacity-60 sm:h-96 sm:w-[34rem] lg:h-[32rem] lg:w-[44rem]"
        />
      )}

      <div className="pointer-events-none absolute left-[-12rem] top-[20rem] h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="pointer-events-none absolute right-[-10rem] top-[55rem] h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />

      {/* ------------------------------------------------------------------ */}
      {/* DRAWER                                                              */}
      {/* ------------------------------------------------------------------ */}

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
              }}
              className="fixed left-0 top-0 z-50 flex h-full w-[86%] max-w-[340px] flex-col justify-between overflow-y-auto border-r border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6"
            >
              <div>
                <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ChifPamLogo glowing={!isVipActive} />

                    <div className="min-w-0">
                      <p className="max-w-40 truncate text-xs font-black lowercase text-white">
                        @{profile?.username || "utilisateur"}
                      </p>

                      <p
                        className={[
                          "text-[10px] font-extrabold tracking-wider",
                          isVipActive
                            ? "text-amber-400"
                            : "text-slate-400",
                        ].join(" ")}
                      >
                        {isVipActive
                          ? "Membre VIP"
                          : "Compte Standard"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-full bg-white/5 p-2 transition hover:bg-white/10"
                    aria-label="Fermer le menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <nav className="space-y-1">
                  <MenuLink
                    href="/client/rewards"
                    icon={<Gift className="text-pink-400" />}
                    label="Centre de Mission"
                    badge={
                      (profile?.login_streak ?? 0) > 0
                        ? `${profile?.login_streak}j`
                        : ""
                    }
                  />

                  <MenuLink
                    href="/client/vip"
                    icon={<Crown className="text-amber-400" />}
                    label="Abonnement VIP"
                  />

                  <MenuLink
                    href="/client/challenges"
                    icon={
                      <ShieldCheck className="text-emerald-400" />
                    }
                    label="Parcours actifs"
                    badge={
                      activeChallengesCount > 0
                        ? activeChallengesCount
                        : undefined
                    }
                  />

                  <MenuLink
                    href="/client/market"
                    icon={
                      <Sparkles className="text-purple-400" />
                    }
                    label="Marketplace"
                  />

                  <MenuLink
                    href="/client/rank"
                    icon={<Trophy className="text-blue-400" />}
                    label="Classement"
                  />

                  <MenuLink
                    href="/client/profile"
                    icon={<User className="text-slate-400" />}
                    label="Mon Profil"
                  />
                </nav>
              </div>

              <div className="mt-auto border-t border-white/10 pt-6">
                <button
                  type="button"
                  onClick={() =>
                    signOutAndClearClientSession().finally(() => {
                      router.replace("/connexion");
                      router.refresh();
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl bg-red-500/10 p-3 text-xs font-black tracking-widest text-red-400 transition hover:bg-red-500/20 active:scale-[0.98]"
                >
                  <LogOut size={16} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 p-3 sm:space-y-6 sm:p-6">
        {/* ---------------------------------------------------------------- */}
        {/* FEEDBACK                                                          */}
        {/* ---------------------------------------------------------------- */}

        <AnimatePresence mode="wait">
          {feedbackMessage && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={[
                "flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-xs tracking-wider backdrop-blur-xl sm:p-4",
                feedbackMessage.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/40 bg-red-500/10 text-red-200",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{feedbackMessage.text}</span>
              </div>

              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="p-1 opacity-60 transition hover:opacity-100"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.4fr_0.8fr]">
          {/* ============================================================ */}
          {/* MAIN COLUMN                                                   */}
          {/* ============================================================ */}

          <div className="space-y-5 sm:space-y-6">
            {/* HEADER ---------------------------------------------------- */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="pt-1">
                  <ChifPamLogo glowing={!isVipActive} />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-black tracking-[0.2em] backdrop-blur-md sm:tracking-[0.3em]">
                    {isVipActive ? (
                      <span className="flex items-center gap-1 text-amber-300">
                        <Crown size={12} />
                        VIP Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Sparkles size={12} />
                        ChifPam Standard
                      </span>
                    )}
                  </div>

                  <DSHeader
                    eyebrow="Tableau de bord"
                    title={`Bienvenue, @${profile?.username || "Aventurier"}`}
                    description="Convertissez vos points, validez vos parcours et débloquez vos récompenses."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-md transition hover:bg-white/10 active:scale-95"
                >
                  <Menu size={16} />
                  Menu
                </button>

                <Link
                  href="/client/notifications"
                  className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] tracking-[0.2em] text-slate-200 backdrop-blur-md transition hover:bg-white/10 active:scale-95"
                >
                  <Bell size={16} />

                  <span className="hidden sm:inline">
                    {globalNotificationCount > 0
                      ? `${globalNotificationCount} Alertes`
                      : "Notifications"}
                  </span>

                  {globalNotificationCount > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* VIP / PROMO ------------------------------------------------ */}

            <AnimatePresence mode="wait">
              {isVipActive ? (
                <motion.div
                  key="vip"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-linear-to-r from-amber-400/15 via-slate-950/90 to-yellow-500/10 p-5 shadow-[0_0_35px_rgba(251,191,36,0.12)] sm:p-6"
                >
                  <div className="pointer-events-none absolute -right-5 -top-8 text-amber-300/10">
                    <Crown size={150} />
                  </div>

                  <div className="pointer-events-none absolute bottom-0 left-0 h-px w-1/2 bg-linear-to-r from-transparent via-amber-300/50 to-transparent" />

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-amber-300">
                      <Crown size={15} />
                      Abonnement actif
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white">
                          Niveau {profile?.vip_status}
                        </h3>

                        {vipExpiryLabel && (
                          <p className="mt-1 flex items-center gap-2 text-[10px] font-normal lowercase text-amber-100/75">
                            <Calendar size={13} />
                            Expire le {vipExpiryLabel}
                          </p>
                        )}
                      </div>

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                        {profile?.auto_renew
                          ? "Renouvellement automatique"
                          : "Renouvellement manuel"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="standard"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl border border-amber-500/30 bg-linear-to-r from-amber-500/15 via-slate-900 to-amber-950/25 p-5 shadow-[0_0_30px_rgba(245,158,11,0.10)] sm:flex-row sm:p-6"
                >
                  <div className="pointer-events-none absolute right-[-30px] top-[-40px] h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />

                  <div className="relative z-10 space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      <Crown size={12} />
                      Passez au niveau supérieur
                    </div>

                    <h3 className="text-base font-black uppercase italic tracking-tight text-white sm:text-lg">
                      Débloquez l&apos;expérience{" "}
                      <span className="text-amber-400">
                        ChifPam VIP
                      </span>
                    </h3>

                    <p className="max-w-md text-xs font-normal lowercase italic text-slate-300">
                      Profitez de -25% sur les frais, de bonus
                      exclusifs et d&apos;un badge doré illuminé sur
                      votre profil.
                    </p>
                  </div>

                  <Link
                    href="/client/vip"
                    className="relative z-10 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-400 via-amber-500 to-amber-400 px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-black shadow-lg transition hover:brightness-110 active:scale-95 sm:w-auto"
                  >
                    <Sparkles size={14} />
                    Découvrir le VIP
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BALANCES -------------------------------------------------- */}

            <DSPanel className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
              {/* CP ------------------------------------------------------ */}

              <DSCard
                className={[
                  "relative overflow-hidden p-5 sm:p-6",
                  isVipActive
                    ? "border-amber-400/40 bg-linear-to-br from-amber-400/15 via-slate-950/80 to-yellow-400/10 shadow-[0_0_30px_rgba(251,191,36,0.08)]"
                    : "",
                ].join(" ")}
              >
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-[0.07]">
                  <Coins
                    size={150}
                    className="text-emerald-400"
                  />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 sm:tracking-[0.35em]">
                      Points de participation (CP)
                    </p>

                    {(profile?.login_streak ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black text-orange-400">
                        <Flame size={12} />
                        {profile?.login_streak}j
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {profileLoading ? (
                      <DSSkeleton className="h-12 w-44" />
                    ) : (
                      <motion.p
                        key={profile?.jetons_cp}
                        initial={{ opacity: 0.4, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-black tracking-tighter text-white sm:text-5xl"
                      >
                        {formatNumber(profile?.jetons_cp)}{" "}
                        <span className="text-base text-emerald-400 sm:text-lg">
                          CP
                        </span>
                      </motion.p>
                    )}

                    <p className="text-xs font-normal lowercase italic text-slate-400">
                      Valeur estimée :{" "}
                      <strong className="font-black text-white">
                        {totalEstimatedHTG === null
                          ? "—"
                          : `${totalEstimatedHTG} HTG`}
                      </strong>
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-normal lowercase italic text-slate-400">
                        Montant à convertir :
                      </span>

                      <span className="font-black text-emerald-300">
                        {calculatedHTG === null
                          ? "—"
                          : `${calculatedHTG} HTG`}
                      </span>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                      <input
                        type="number"
                        min="100"
                        max={profile?.jetons_cp || 100}
                        step="100"
                        value={cpToConvert}
                        onChange={(event) => {
                          const value = Number(
                            event.target.value
                          );

                          setCpToConvert(
                            Number.isFinite(value)
                              ? Math.max(0, value)
                              : 0
                          );
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs font-black text-white outline-none transition focus:border-emerald-500/60 focus:bg-black/60"
                        placeholder="Ex: 500"
                        aria-label="Montant CP à convertir"
                      />

                      <div className="grid grid-cols-4 gap-1.5 sm:contents">
                        {[100, 500, 1000].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() =>
                              setCpToConvert(
                                Math.min(
                                  amount,
                                  profile?.jetons_cp || amount
                                )
                              )
                            }
                            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-[10px] font-black text-emerald-200 transition hover:bg-emerald-500/20 active:scale-95"
                          >
                            {amount}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setCpToConvert(
                              profile?.jetons_cp || 0
                            )
                          }
                          className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-2 py-2 text-[10px] font-black text-amber-200 transition hover:bg-amber-400/20 active:scale-95"
                        >
                          Max
                        </button>
                      </div>

                      <DSButton
                        onClick={handleQuickConvert}
                        disabled={
                          isConverting ||
                          profileLoading ||
                          (profile?.jetons_cp || 0) < 100 ||
                          cpToConvert < 100
                        }
                        variant="success"
                        size="sm"
                        className="flex shrink-0 items-center justify-center gap-2 py-2.5"
                      >
                        <ArrowRightLeft size={14} />
                        {isConverting
                          ? "Conversion..."
                          : "Convertir"}
                      </DSButton>
                    </div>

                    <p className="text-[10px] font-normal lowercase italic text-slate-500">
                      {rateLoading
                        ? "Taux de conversion en cours de chargement..."
                        : rateError
                          ? "Taux indisponible pour le moment."
                          : `Taux : 100 CP = ${(100 * (cpToHtgRate ?? 0)).toFixed(2)} HTG (Min. 100 CP)`}
                    </p>
                  </div>
                </div>
              </DSCard>

              {/* BALANCE ------------------------------------------------- */}

              <DSCard className="flex flex-col justify-between space-y-4 p-5 sm:p-6">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 sm:tracking-[0.35em]">
                      Solde principal
                    </p>

                    <Wallet
                      size={16}
                      className="text-emerald-400"
                    />
                  </div>

                  {profileLoading ? (
                    <DSSkeleton className="mt-3 h-9 w-32" />
                  ) : (
                    <div className="mt-3 flex items-baseline gap-2">
                      <motion.p
                        key={profile?.balance}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        className="text-2xl font-black text-white sm:text-3xl"
                      >
                        {formatNumber(profile?.balance)}
                      </motion.p>

                      <span className="text-xs font-black text-emerald-400">
                        HTG
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/client/finance"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-[10px] font-black text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
                  >
                    <PlusCircle size={12} />
                    Recharger
                  </Link>

                  <Link
                    href="/client/finance"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-black text-slate-300 transition hover:bg-white/10 active:scale-95"
                  >
                    <ArrowUpRight size={12} />
                    Retirer
                  </Link>
                </div>

                <Link
                  href="/client/finance"
                  className="group flex items-center justify-between border-t border-white/5 pt-3 text-left"
                >
                  <span className="text-[10px] font-normal lowercase italic text-slate-500 transition group-hover:text-slate-300">
                    Retraits instantanés
                  </span>

                  <ArrowUpRight
                    size={14}
                    className="text-emerald-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </DSCard>
            </DSPanel>

            {/* ACTIVITIES ------------------------------------------------ */}

            <DSPanel>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 sm:tracking-[0.35em]">
                    Missions & Activités
                  </p>

                  <p className="mt-0.5 text-xs font-normal lowercase italic text-slate-300">
                    Participez pour accumuler des jetons CP
                    supplémentaires.
                  </p>
                </div>

                <Link
                  href="/client/list"
                  className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 transition hover:text-emerald-300"
                >
                  Tout voir →
                </Link>
              </div>

              {/* LIVE ARENA ---------------------------------------------- */}

              <Link
                href="/live"
                className="group mb-4 block"
              >
                <DSCard className="relative overflow-hidden border-fuchsia-400/30 bg-linear-to-r from-fuchsia-500/15 via-slate-950/90 to-emerald-500/10 p-4 shadow-[0_0_30px_rgba(217,70,239,0.10)] transition duration-300 hover:border-fuchsia-300/60"
                >
                  <div className="pointer-events-none absolute -right-3 -top-6 text-fuchsia-400/10 transition-transform duration-500 group-hover:scale-110">
                    <Activity size={112} />
                  </div>

                  <div className="pointer-events-none absolute bottom-0 left-0 h-px w-1/3 bg-linear-to-r from-transparent via-fuchsia-400/50 to-transparent" />

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/15 p-3 text-fuchsia-300">
                        <Activity size={20} />
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-300">
                          Live Arena
                        </p>

                        <p className="mt-1 text-sm font-black text-white">
                          Mises réelles & multijoueur
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight
                      size={20}
                      className="shrink-0 text-fuchsia-300 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                    />
                  </div>
                </DSCard>
              </Link>

              {/* GAME LIST ------------------------------------------------ */}

              <div className="space-y-3">
                {profileLoading || summaryLoading
                  ? [1, 2, 3].map((item) => (
                      <DSSkeleton
                        key={item}
                        className="h-16 w-full"
                      />
                    ))
                  : gamesList.map((game) => (
                      <GameRow
                        key={game.id}
                        href={game.href}
                        icon={game.icon}
                        title={game.title}
                        desc={game.desc}
                        players={game.players}
                        tag={game.tag}
                      />
                    ))}
              </div>
            </DSPanel>
          </div>

          {/* ============================================================ */}
          {/* SECONDARY COLUMN                                              */}
          {/* ============================================================ */}

          <div className="space-y-5 sm:space-y-6">
            {/* ACCOUNT SUMMARY ------------------------------------------ */}

            <DSCard className="space-y-4 p-5 sm:space-y-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 sm:tracking-[0.35em]">
                    Synthèse
                  </p>

                  <p className="mt-0.5 text-base font-black text-white">
                    Activité du compte
                  </p>
                </div>

                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-emerald-300">
                  {activeChallengesCount} Parcours
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Chat Support
                  </p>

                  <motion.p
                    key={unreadChat}
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1 text-2xl font-black text-white sm:mt-2"
                  >
                    {unreadChat}
                  </motion.p>

                  <p className="mt-0.5 text-[10px] lowercase italic text-slate-500">
                    {unreadChat > 0
                      ? "Nouveaux messages"
                      : "À jour"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Alertes
                  </p>

                  <motion.p
                    key={unreadNotifs}
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1 text-2xl font-black text-white sm:mt-2"
                  >
                    {unreadNotifs}
                  </motion.p>

                  <p className="mt-0.5 text-[10px] lowercase italic text-slate-500">
                    {unreadNotifs > 0
                      ? "Non lues"
                      : "Aucune"}
                  </p>
                </div>
              </div>
            </DSCard>

            {/* QUICK ACCESS --------------------------------------------- */}

            <DSCard className="space-y-3 p-5 sm:space-y-4 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 sm:tracking-[0.35em]">
                Accès Rapides
              </p>

              <div className="space-y-2">
                <Link
                  href="/client/finance"
                  className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:border-emerald-500/40 hover:bg-white/10 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <Wallet
                      size={16}
                      className="text-emerald-400"
                    />
                    Gérer mon solde
                  </span>

                  <ChevronRight
                    size={14}
                    className="text-slate-500 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>

                <Link
                  href="/client/notifications"
                  className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:border-emerald-500/40 hover:bg-white/10 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <Bell
                      size={16}
                      className="text-amber-400"
                    />
                    Voir mes alertes
                  </span>

                  <ChevronRight
                    size={14}
                    className="text-slate-500 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>

                <Link
                  href="/client/chat"
                  className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-slate-400 transition hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Activity size={16} />
                    Contacter le support
                  </span>

                  {unreadChat > 0 && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  )}
                </Link>
              </div>
            </DSCard>

            {/* STATUS CARD ------------------------------------------------ */}

            <DSCard className="relative hidden overflow-hidden p-5 sm:block sm:p-6">
              <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.04]">
                {isVipActive ? (
                  <Crown size={150} />
                ) : (
                  <Sparkles size={150} />
                )}
              </div>

              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  Statut ChifPam
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-2xl border",
                      isVipActive
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                    ].join(" ")}
                  >
                    {isVipActive ? (
                      <Crown size={19} />
                    ) : (
                      <ShieldCheck size={19} />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-black text-white">
                      {isVipActive
                        ? "Expérience VIP"
                        : "Compte Standard"}
                    </p>

                    <p className="mt-0.5 text-[10px] font-normal lowercase italic text-slate-500">
                      {isVipActive
                        ? "Accès premium actif"
                        : "Passez au niveau supérieur"}
                    </p>
                  </div>
                </div>
              </div>
            </DSCard>
          </div>
        </div>
      </div>
    </DSPage>
  );
          }
