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
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
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
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Plus,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import {
  DSButton,
  DSCard,
  DSHeader,
  DSPage,
  DSPanel,
  DSSkeleton,
} from "@/components/ui/primitives";

import ThreeSurface from "@/components/three/ThreeSurface";

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
  accent?: string;
}

/* -------------------------------------------------------------------------- */
/* LOGO                                                                       */
/* -------------------------------------------------------------------------- */

const ChifPamLogo = React.memo(
  ({ glowing = false, size = "md" }: { glowing?: boolean; size?: "sm" | "md" | "lg" }) => {
    const dimensions =
      size === "lg"
        ? "h-16 w-16"
        : size === "sm"
          ? "h-9 w-9"
          : "h-11 w-11";

    return (
      <div className="relative flex items-center justify-center">
        {glowing && (
          <>
            <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-2xl" />
            <div className="absolute inset-2 rounded-full bg-emerald-400/10 blur-md animate-pulse" />
          </>
        )}

        <div
          className={`relative z-10 flex ${dimensions} items-center justify-center rounded-2xl border border-emerald-400/20 bg-slate-950/80 backdrop-blur-xl`}
        >
          <svg
            viewBox="0 0 100 100"
            className={`h-[65%] w-[65%] ${
              glowing
                ? "drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]"
                : "drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
            }`}
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
      </div>
    );
  },
);

ChifPamLogo.displayName = "ChifPamLogo";

/* -------------------------------------------------------------------------- */
/* BACKGROUND                                                                 */
/* -------------------------------------------------------------------------- */

function ImmersiveBackground({ vip }: { vip: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute -top-48 right-[-15%] h-[520px] w-[520px] rounded-full blur-[130px] ${
          vip ? "bg-amber-500/10" : "bg-emerald-500/10"
        }`}
      />

      <div className="absolute -bottom-60 left-[-15%] h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[130px]" />

      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/50 to-transparent" />

      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[12%] top-[25%] h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_20px_5px_rgba(16,185,129,.4)]"
      />

      <motion.div
        animate={{ y: [0, 25, 0], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[22%] top-[42%] h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_20px_5px_rgba(34,211,238,.3)]"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

export default function ClientHome() {
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

  const router = useRouter();
  const pathname = usePathname();

  const isVipActive = Boolean(
    profile?.vip_status &&
      profile.vip_status !== "free" &&
      profile.vip_expiry &&
      new Date(profile.vip_expiry).getTime() > Date.now(),
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
    if (!profile?.jetons_cp) return "0.00";

    return (profile.jetons_cp * cpToHtgRate).toFixed(2);
  }, [cpToHtgRate, profile?.jetons_cp]);

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
  /* VISIBILITY                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* CP DEFAULT                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (profile?.jetons_cp !== undefined) {
      setCpToConvert(Math.min(profile.jetons_cp, 100));
    }
  }, [profile?.jetons_cp]);

  /* ---------------------------------------------------------------------- */
  /* AUDIO                                                                  */
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
  /* COUNTERS                                                               */
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

  /* ---------------------------------------------------------------------- */
  /* DATA                                                                   */
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
        setProfileLoading(false);
        setSummaryLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, username, jetons_cp, balance, vip_status, vip_expiry, auto_renew, login_streak",
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Erreur chargement profil:", profileError);
      } else {
        setProfile(prof as Profile);
      }

      setProfileLoading(false);

      const [notifCountRes, challengesCountRes, chatCountRes] =
        await Promise.all([
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

      setSummaryLoading(false);
    } catch (error) {
      console.error("Erreur globale fetchData:", error);
      setProfileLoading(false);
      setSummaryLoading(false);
    } finally {
      setProfileLoading(false);
      setSummaryLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------------------------------------------------------------------- */
  /* CONVERSION RATE                                                        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const fetchConversionRate = async () => {
      setRateLoading(true);
      setRateError(false);

      const { data, error } = await supabase.rpc("get_cp_to_htg_rate");
      const numericRate = Number(data);

      if (
        error ||
        !Number.isFinite(numericRate) ||
        numericRate <= 0
      ) {
        console.error("Erreur chargement taux CP -> HTG:", error);
        setRateError(true);
        setCpToHtgRate(null);
      } else {
        setCpToHtgRate(numericRate);
      }

      setRateLoading(false);
    };

    fetchConversionRate();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* REALTIME                                                               */
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
          setProfile(payload.new as Profile);
        },
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => refreshChatCount(),
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => fetchNotificationCount(),
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
        },
        () => fetchChallengesCount(),
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
  /* CONVERT                                                                */
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
      const { error } = await supabase.rpc("convertir_cp_en_htg", {
        p_user_id: profile.id,
        p_montant_cp: montantCP,
      });

      if (error) {
        setFeedbackMessage({
          type: "error",
          text: error.message || "Erreur lors de la conversion.",
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
    } catch (err) {
      console.error("Erreur inattendue conversion:", err);

      setFeedbackMessage({
        type: "error",
        text: "Une erreur inattendue est survenue.",
      });
    } finally {
      setIsConverting(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* GAMES                                                                  */
  /* ---------------------------------------------------------------------- */

  const gamesList: GameItem[] = useMemo(
    () => [
      {
        id: "quiz",
        href: "/client/quiz",
        icon: <Brain className="text-blue-400" size={21} />,
        title: "Quiz Insights",
        desc: "Défi cognitif & rapidité",
        players: "3.0k",
        tag: "Populaire",
      },
      {
        id: "laser",
        href: "/client/laser-vault",
        icon: <Lock className="text-indigo-400" size={21} />,
        title: "Laser Vault",
        desc: "Réactivité & précision ultime",
        players: "2.1k",
      },
      {
        id: "biometric",
        href: "/client/biometric-hack",
        icon: <Fingerprint className="text-emerald-400" size={21} />,
        title: "Biometric Lab",
        desc: "Mémoire adaptative & logique",
        players: "650",
      },
    ],
    [],
  );

  const quickActions = [
    {
      href: "/client/finance",
      icon: <Wallet size={16} />,
      label: "Finances",
      sub: "Gérer mon solde",
    },
    {
      href: "/client/rewards",
      icon: <Gift size={16} />,
      label: "Récompenses",
      sub: "Mes missions",
    },
    {
      href: "/client/rank",
      icon: <Trophy size={16} />,
      label: "Classement",
      sub: "Voir le ranking",
    },
    {
      href: "/client/profile",
      icon: <User size={16} />,
      label: "Profil",
      sub: "Mon compte",
    },
  ];

  const globalNotificationCount = unreadNotifs;

  return (
    <DSPage
      className={`relative min-h-screen overflow-x-hidden pb-16 font-black italic uppercase ${
        isVipActive ? "bg-[#100d03]" : "bg-[#020617]"
      }`}
    >
      <ImmersiveBackground vip={isVipActive} />

      {/* ---------------------------------------------------------------- */}
      {/* 3D AMBIENT                                                      */}
      {/* ---------------------------------------------------------------- */}

      {isWideViewport && (
        <ThreeSurface
          variant={isVipActive ? "vip" : "home"}
          className="pointer-events-none absolute right-[-40px] top-0 z-0 h-72 w-[420px] opacity-55 sm:h-96 sm:w-[520px] lg:h-[520px] lg:w-[720px]"
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MOBILE DRAWER                                                   */}
      {/* ---------------------------------------------------------------- */}

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 26,
                stiffness: 220,
              }}
              className="fixed left-0 top-0 z-50 flex h-full w-[88%] max-w-[350px] flex-col justify-between overflow-y-auto border-r border-white/10 bg-[#050912]/95 p-5 shadow-2xl backdrop-blur-2xl"
            >
              <div>
                <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <ChifPamLogo glowing={!isVipActive} />

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black lowercase text-white">
                        @{profile?.username || "utilisateur"}
                      </p>

                      <p
                        className={`mt-1 text-[9px] font-black tracking-[0.2em] ${
                          isVipActive
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {isVipActive
                          ? "Membre VIP"
                          : "Compte Standard"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10"
                    aria-label="Fermer le menu"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mb-7 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] tracking-[0.25em] text-slate-500">
                      SOLDE CP
                    </span>

                    <Coins size={15} className="text-emerald-400" />
                  </div>

                  <p className="mt-2 text-2xl font-black tracking-tight text-white">
                    {(profile?.jetons_cp || 0).toLocaleString()}
                    <span className="ml-1 text-xs text-emerald-400">
                      CP
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <MenuLink
                    href="/client/home"
                    icon={<LayoutDashboard className="text-emerald-400" />}
                    label="Tableau de bord"
                  />

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
                    icon={<ShieldCheck className="text-emerald-400" />}
                    label="Parcours actifs"
                    badge={
                      activeChallengesCount > 0
                        ? activeChallengesCount
                        : undefined
                    }
                  />

                  <MenuLink
                    href="/client/market"
                    icon={<Sparkles className="text-purple-400" />}
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
                </div>
              </div>

              <button
                onClick={() =>
                  signOutAndClearClientSession().finally(() => {
                    router.replace("/connexion");
                    router.refresh();
                  })
                }
                className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-xs tracking-widest text-red-400 transition hover:bg-red-500/10"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- */}
      {/* CONTENT                                                          */}
      {/* ---------------------------------------------------------------- */}

      <div className="relative z-10 mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        {/* -------------------------------------------------------------- */}
        {/* TOP NAV                                                        */}
        {/* -------------------------------------------------------------- */}

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center justify-between"
        >
          <Link
            href="/client/home"
            className="flex items-center gap-3"
          >
            <ChifPamLogo glowing={!isVipActive} />

            <div className="hidden sm:block">
              <p className="text-sm font-black tracking-[0.18em] text-white">
                CHIF<span className="text-emerald-400">PAM</span>
              </p>

              <p className="text-[8px] font-bold tracking-[0.3em] text-slate-600">
                DIGITAL ARENA
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/client/notifications"
              className="relative flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[9px] tracking-[0.15em] text-slate-300 backdrop-blur-xl transition hover:border-emerald-400/30 hover:bg-white/10"
            >
              <Bell size={15} />

              <span className="hidden sm:inline">
                {globalNotificationCount > 0
                  ? `${globalNotificationCount} alertes`
                  : "Notifications"}
              </span>

              {globalNotificationCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,.9)]" />
              )}
            </Link>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-[9px] tracking-[0.15em] text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
            >
              <Menu size={16} />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------- */}
        {/* FEEDBACK                                                       */}
        {/* -------------------------------------------------------------- */}

        <AnimatePresence>
          {feedbackMessage && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-5 flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-[10px] tracking-wider backdrop-blur-xl ${
                feedbackMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/30 bg-red-500/10 text-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{feedbackMessage.text}</span>
              </div>

              <button
                onClick={() => setFeedbackMessage(null)}
                className="p-1 opacity-60 transition hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -------------------------------------------------------------- */}
        {/* HERO                                                           */}
        {/* -------------------------------------------------------------- */}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl sm:p-7 lg:p-8"
        >
          <div className="absolute right-[-100px] top-[-130px] h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative mt-1 shrink-0">
                <ChifPamLogo
                  size="lg"
                  glowing={!isVipActive}
                />

                <span
                  className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#020617] ${
                    isVipActive
                      ? "bg-amber-400 text-black"
                      : "bg-emerald-400 text-black"
                  }`}
                >
                  {isVipActive ? (
                    <Crown size={10} />
                  ) : (
                    <Zap size={10} />
                  )}
                </span>
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] tracking-[0.22em] ${
                      isVipActive
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {isVipActive ? (
                      <>
                        <Crown size={11} />
                        VIP ACTIF
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} />
                        CHIFPAM STANDARD
                      </>
                    )}
                  </span>

                  {(profile?.login_streak ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[8px] text-orange-300">
                      <Flame size={11} />
                      {profile?.login_streak} JOURS
                    </span>
                  )}
                </div>

                <DSHeader
                  eyebrow="TABLEAU DE BORD"
                  title={`Bienvenue, @${profile?.username || "Aventurier"}`}
                  description="Votre espace personnel pour jouer, convertir, progresser et débloquer vos récompenses."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Link
                href="/client/challenges"
                className="group flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[9px] tracking-[0.15em] text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
              >
                <ShieldCheck size={14} />
                Missions
                <ChevronRight
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>

              <Link
                href="/client/market"
                className="group flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[9px] tracking-[0.15em] text-slate-300 transition hover:bg-white/10"
              >
                <Sparkles size={14} />
                Market
                <ChevronRight
                  size={12}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </motion.section>

        {/* -------------------------------------------------------------- */}
        {/* VIP BANNER                                                      */}
        {/* -------------------------------------------------------------- */}

        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`relative mb-6 overflow-hidden rounded-[28px] border p-5 sm:p-6 ${
            isVipActive
              ? "border-amber-300/25 bg-linear-to-r from-amber-500/10 via-slate-950/90 to-yellow-500/5"
              : "border-amber-500/25 bg-linear-to-r from-amber-500/10 via-slate-950/90 to-amber-900/10"
          }`}
        >
          <Crown className="absolute -right-5 -top-8 h-40 w-40 text-amber-400/[0.06]" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[9px] tracking-[0.22em] text-amber-300">
                <Crown size={13} />

                {isVipActive
                  ? "EXPÉRIENCE PREMIUM ACTIVE"
                  : "CHIFPAM PREMIUM"}
              </div>

              {isVipActive ? (
                <>
                  <h2 className="text-base text-white sm:text-lg">
                    Niveau {profile?.vip_status}
                  </h2>

                  {vipExpiryLabel && (
                    <p className="mt-1 flex items-center gap-2 text-[9px] font-normal lowercase text-amber-100/60">
                      <Calendar size={12} />
                      Expire le {vipExpiryLabel}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-base text-white sm:text-lg">
                    Débloquez l&apos;expérience{" "}
                    <span className="text-amber-400">
                      ChifPam VIP
                    </span>
                  </h2>

                  <p className="mt-1 max-w-xl text-[9px] font-normal lowercase text-slate-400">
                    Bonus exclusifs, frais réduits et expérience
                    premium sur votre compte.
                  </p>
                </>
              )}
            </div>

            <Link
              href="/client/vip"
              className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-amber-300 via-amber-500 to-yellow-400 px-5 py-3 text-[9px] tracking-[0.16em] text-black shadow-[0_0_25px_rgba(245,158,11,.16)] transition hover:brightness-110 active:scale-[0.98]"
            >
              {isVipActive ? "Gérer mon VIP" : "Découvrir le VIP"}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </motion.section>

        {/* -------------------------------------------------------------- */}
        {/* MAIN GRID                                                       */}
        {/* -------------------------------------------------------------- */}

        <div className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
          <div className="space-y-5">
            {/* ---------------------------------------------------------- */}
            {/* CP TERMINAL                                                */}
            {/* ---------------------------------------------------------- */}

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <DSCard
                className={`relative overflow-hidden rounded-[30px] p-5 sm:p-7 ${
                  isVipActive
                    ? "border-amber-400/20"
                    : "border-emerald-500/15"
                }`}
              >
                <div className="absolute right-[-30px] top-[-50px] opacity-[0.035]">
                  <Coins size={280} />
                </div>

                <div className="relative z-10">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[8px] tracking-[0.3em] text-emerald-400">
                        WALLET DIGITAL
                      </p>

                      <h2 className="mt-1 text-sm text-white sm:text-base">
                        Points de participation
                      </h2>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                      <Coins
                        size={18}
                        className="text-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
                    {/* BALANCE */}
                    <div className="flex flex-col justify-between">
                      <div>
                        <p className="mb-2 text-[8px] tracking-[0.22em] text-slate-500">
                          SOLDE DISPONIBLE
                        </p>

                        {profileLoading ? (
                          <DSSkeleton className="h-14 w-48" />
                        ) : (
                          <div className="flex items-end gap-2">
                            <p className="text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">
                              {(profile?.jetons_cp || 0).toLocaleString()}
                            </p>

                            <span className="mb-2 text-xs text-emerald-400">
                              CP
                            </span>
                          </div>
                        )}

                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,.8)]" />

                          <span className="text-[8px] font-normal lowercase tracking-normal text-slate-500">
                            Valeur estimée
                          </span>

                          <span className="text-[9px] text-white">
                            {totalEstimatedHTG === null
                              ? "—"
                              : `${totalEstimatedHTG} HTG`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-2">
                        <Link
                          href="/client/rewards"
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[8px] text-slate-300 transition hover:bg-white/10"
                        >
                          <Gift size={13} />
                          Gagner des CP
                        </Link>

                        <Link
                          href="/client/rank"
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[8px] text-slate-300 transition hover:bg-white/10"
                        >
                          <Trophy size={13} />
                          Mon classement
                        </Link>
                      </div>
                    </div>

                    {/* CONVERTER */}
                    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] tracking-[0.25em] text-slate-500">
                            CONVERSION
                          </p>

                          <p className="mt-1 text-xs text-white">
                            CP → HTG
                          </p>
                        </div>

                        <ArrowRightLeft
                          size={16}
                          className="text-emerald-400"
                        />
                      </div>

                      <div className="mb-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2">
                        <span className="text-[8px] font-normal lowercase text-slate-500">
                          Vous convertissez
                        </span>

                        <span className="text-[10px] text-emerald-300">
                          {calculatedHTG === null
                            ? "—"
                            : `${calculatedHTG} HTG`}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="100"
                            max={profile?.jetons_cp || 100}
                            step="100"
                            value={cpToConvert}
                            onChange={(e) =>
                              setCpToConvert(
                                Math.max(
                                  0,
                                  Number(e.target.value),
                                ),
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-black text-white outline-none transition placeholder:text-slate-700 focus:border-emerald-500/60"
                            placeholder="100"
                          />

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600">
                            CP
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {[100, 500, 1000].map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() =>
                                setCpToConvert(
                                  Math.min(
                                    amount,
                                    profile?.jetons_cp ||
                                      amount,
                                  ),
                                )
                              }
                              className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 py-2 text-[8px] text-emerald-300 transition hover:bg-emerald-500/10"
                            >
                              {amount}
                            </button>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              setCpToConvert(
                                profile?.jetons_cp || 0,
                              )
                            }
                            className="rounded-lg border border-amber-400/10 bg-amber-400/5 py-2 text-[8px] text-amber-300 transition hover:bg-amber-400/10"
                          >
                            MAX
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
                          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3"
                        >
                          <ArrowRightLeft size={14} />

                          {isConverting
                            ? "Conversion..."
                            : "Convertir maintenant"}
                        </DSButton>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[8px] font-normal lowercase text-slate-600">
                          {rateLoading
                            ? "Chargement du taux..."
                            : rateError
                              ? "Taux indisponible."
                              : `100 CP = ${(100 * (cpToHtgRate ?? 0)).toFixed(2)} HTG`}
                        </p>

                        <span className="text-[7px] text-slate-700">
                          MIN. 100 CP
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DSCard>
            </motion.section>

            {/* ---------------------------------------------------------- */}
            {/* LIVE                                                         */}
            {/* ---------------------------------------------------------- */}

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <Link href="/live" className="group block">
                <DSCard className="relative overflow-hidden rounded-[28px] border-fuchsia-400/20 bg-linear-to-r from-fuchsia-500/10 via-slate-950/80 to-emerald-500/5 p-5 transition hover:border-fuchsia-400/40 sm:p-6">
                  <div className="absolute right-0 top-0 h-full w-1/3 bg-fuchsia-500/[0.035] blur-3xl" />

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10">
                        <Activity
                          size={21}
                          className="text-fuchsia-300"
                        />

                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-fuchsia-400" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] tracking-[0.25em] text-fuchsia-300">
                            LIVE ARENA
                          </span>

                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[7px] text-red-300">
                            LIVE
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-white">
                          Mises réelles & multijoueur
                        </p>

                        <p className="mt-1 text-[8px] font-normal lowercase text-slate-500">
                          Entrez dans l&apos;arène ChifPam.
                        </p>
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition group-hover:border-fuchsia-400/30 group-hover:bg-fuchsia-400/10">
                      <ArrowRight
                        size={15}
                        className="text-fuchsia-300 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                </DSCard>
              </Link>
            </motion.section>

            {/* ---------------------------------------------------------- */}
            {/* ACTIVITIES                                                   */}
            {/* ---------------------------------------------------------- */}

            <DSPanel className="rounded-[30px] p-4 sm:p-6">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-[8px] tracking-[0.28em] text-slate-500">
                    EXPÉRIENCES
                  </p>

                  <h2 className="mt-1 text-sm text-white">
                    Missions & activités
                  </h2>

                  <p className="mt-1 text-[8px] font-normal lowercase text-slate-600">
                    Participez pour accumuler des jetons CP.
                  </p>
                </div>

                <Link
                  href="/client/list"
                  className="flex items-center gap-1 text-[8px] tracking-[0.18em] text-emerald-400 transition hover:text-emerald-300"
                >
                  TOUT VOIR
                  <ArrowUpRight size={12} />
                </Link>
              </div>

              <div className="space-y-2.5">
                {profileLoading || summaryLoading
                  ? [1, 2, 3].map((item) => (
                      <DSSkeleton
                        key={item}
                        className="h-[72px] w-full rounded-2xl"
                      />
                    ))
                  : gamesList.map((game, index) => (
                      <GameRow
                        key={game.id}
                        index={index}
                        {...game}
                      />
                    ))}
              </div>
            </DSPanel>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* RIGHT COLUMN                                                  */}
          {/* ------------------------------------------------------------ */}

          <aside className="space-y-5">
            {/* ---------------------------------------------------------- */}
            {/* ACCOUNT HUD                                                  */}
            {/* ---------------------------------------------------------- */}

            <DSCard className="overflow-hidden rounded-[30px] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[8px] tracking-[0.28em] text-slate-500">
                    ACCOUNT HUD
                  </p>

                  <h2 className="mt-1 text-sm text-white">
                    Activité du compte
                  </h2>
                </div>

                <div
                  className={`rounded-full border px-2.5 py-1 text-[7px] tracking-[0.15em] ${
                    isVipActive
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  }`}
                >
                  {isVipActive ? "VIP" : "STANDARD"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  icon={<Activity size={14} />}
                  label="Parcours"
                  value={activeChallengesCount}
                  accent="emerald"
                />

                <StatTile
                  icon={<Bell size={14} />}
                  label="Alertes"
                  value={unreadNotifs}
                  accent="amber"
                />

                <StatTile
                  icon={<Activity size={14} />}
                  label="Support"
                  value={unreadChat}
                  accent="blue"
                />

                <StatTile
                  icon={<Flame size={14} />}
                  label="Streak"
                  value={profile?.login_streak || 0}
                  accent="orange"
                />
              </div>
            </DSCard>

            {/* ---------------------------------------------------------- */}
            {/* BALANCE CARD                                                */}
            {/* ---------------------------------------------------------- */}

            <DSCard className="relative overflow-hidden rounded-[30px] p-5 sm:p-6">
              <div className="absolute right-[-35px] top-[-35px] h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] tracking-[0.28em] text-slate-500">
                      MAIN WALLET
                    </p>

                    <p className="mt-1 text-xs text-white">
                      Solde principal
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                    <Wallet
                      size={15}
                      className="text-emerald-400"
                    />
                  </div>
                </div>

                {profileLoading ? (
                  <DSSkeleton className="mt-5 h-10 w-36" />
                ) : (
                  <div className="mt-5 flex items-baseline gap-2">
                    <p className="text-3xl text-white">
                      {(profile?.balance || 0).toLocaleString()}
                    </p>

                    <span className="text-[9px] text-emerald-400">
                      HTG
                    </span>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href="/client/finance"
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-[8px] text-emerald-300 transition hover:bg-emerald-500/15"
                  >
                    <PlusCircle size={13} />
                    Recharger
                  </Link>

                  <Link
                    href="/client/finance"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-[8px] text-slate-300 transition hover:bg-white/10"
                  >
                    <ArrowUpRight size={13} />
                    Retirer
                  </Link>
                </div>

                <Link
                  href="/client/finance"
                  className="mt-3 flex items-center justify-between border-t border-white/5 pt-3"
                >
                  <span className="text-[8px] font-normal lowercase text-slate-600">
                    Voir toutes les opérations
                  </span>

                  <ArrowRight
                    size={12}
                    className="text-emerald-400"
                  />
                </Link>
              </div>
            </DSCard>

            {/* ---------------------------------------------------------- */}
            {/* QUICK ACCESS                                                */}
            {/* ---------------------------------------------------------- */}

            <DSCard className="rounded-[30px] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[8px] tracking-[0.28em] text-slate-500">
                  NAVIGATION
                </p>

                <Zap size={14} className="text-emerald-400" />
              </div>

              <div className="space-y-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.href + action.label}
                    href={action.href}
                    className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.025] p-3 transition hover:border-emerald-500/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-black/20 text-slate-400 transition group-hover:text-emerald-400">
                        {action.icon}
                      </div>

                      <div>
                        <p className="text-[9px] text-white">
                          {action.label}
                        </p>

                        <p className="mt-0.5 text-[7px] font-normal lowercase text-slate-600">
                          {action.sub}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      size={13}
                      className="text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-emerald-400"
                    />
                  </Link>
                ))}
              </div>
            </DSCard>

            {/* ---------------------------------------------------------- */}
            {/* SUPPORT                                                     */}
            {/* ---------------------------------------------------------- */}

            <Link href="/client/chat" className="group block">
              <DSCard className="rounded-[26px] border-blue-400/10 bg-blue-500/[0.035] p-5 transition hover:border-blue-400/25">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10">
                    <Activity
                      size={16}
                      className="text-blue-300"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] tracking-[0.2em] text-blue-300">
                      SUPPORT
                    </p>

                    <p className="mt-1 truncate text-xs text-white">
                      Besoin d&apos;aide ?
                    </p>

                    <p className="mt-0.5 text-[8px] font-normal lowercase text-slate-600">
                      Contacter l&apos;équipe ChifPam
                    </p>
                  </div>

                  <ArrowUpRight
                    size={15}
                    className="text-slate-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-300"
                  />
                </div>
              </DSCard>
            </Link>
          </aside>
        </div>
      </div>
    </DSPage>
  );
}

/* -------------------------------------------------------------------------- */
/* MENU LINK                                                                  */
/* -------------------------------------------------------------------------- */

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
      className="group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white/5"
    >
      <div className="shrink-0">{icon}</div>

      <span className="text-[10px] tracking-[0.14em] text-slate-300 transition group-hover:text-white">
        {label}
      </span>

      {badge !== undefined && badge !== "" ? (
        <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] text-emerald-300">
          {badge}
        </span>
      ) : (
        <ChevronRight
          size={13}
          className="ml-auto text-slate-700 transition group-hover:text-slate-400"
        />
      )}
    </Link>
  ),
);

MenuLink.displayName = "MenuLink";

/* -------------------------------------------------------------------------- */
/* GAME ROW                                                                   */
/* -------------------------------------------------------------------------- */

const GameRow = React.memo(
  ({
    href,
    icon,
    title,
    desc,
    players,
    tag,
    index,
  }: GameItem & { index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={href}
        className="group flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/45 p-3.5 transition hover:border-emerald-500/20 hover:bg-white/[0.035]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 transition group-hover:scale-105 group-hover:border-emerald-500/20">
            {icon}

            <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-slate-950 bg-emerald-400 opacity-70" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-[10px] tracking-[0.12em] text-white">
                {title}
              </h4>

              {tag && (
                <span className="shrink-0 rounded bg-amber-400/10 px-1.5 py-0.5 text-[7px] text-amber-300">
                  {tag}
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-[8px] font-normal lowercase text-slate-600">
              {desc}
            </p>
          </div>
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-2">
          <span className="hidden rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-2 py-1 text-[7px] text-emerald-400 sm:block">
            {players} actifs
          </span>

          <ChevronRight
            size={14}
            className="text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-emerald-400"
          />
        </div>
      </Link>
    </motion.div>
  ),
);

GameRow.displayName = "GameRow";

/* -------------------------------------------------------------------------- */
/* STAT TILE                                                                  */
/* -------------------------------------------------------------------------- */

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "emerald" | "amber" | "blue" | "orange";
}) {
  const accentClasses = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/10",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/10",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/10",
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[7px] tracking-[0.15em] text-slate-600">
          {label}
        </span>

        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg border ${accentClasses[accent]}`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-3 text-xl text-white">{value}</p>
    </div>
  );
          }
