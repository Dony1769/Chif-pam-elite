"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Inbox,
  Loader2,
  CheckCheck,
  Bell,
  Trophy,
  Shield,
  Flame,
  BellOff,
  Coins,
  Crown,
  Medal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FilterType = "TOUT" | "VICTOIRES" | "DÉFIS" | "SYSTÈME";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

type ChallengeRow = {
  id: string;
  title: string;
  prize_pool_cp: number;
  game_type: string;
  created_at: string;
  is_active: boolean;
};

type AlertItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_challenge: boolean;
  is_victory: boolean;
  rank_position?: number;
  link?: string;
};

type NotificationOptionsWithVibrate = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
  data?: { url: string };
};

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEbxxcO2dGwTgPFasWQ0bZGSIoAhAbYPDB7X0p5cIp4eU6Qg2ZVe6Zyrky30AcvqGkHGU_SZZQGAtBrI8DK17gw";

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [liveChallenges, setLiveChallenges] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("TOUT");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const router = useRouter();

  // --- Notification native locale ---
  const sendNativePush = async (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const swReg = await navigator.serviceWorker.ready;
      if (!swReg) return;

      const options: NotificationOptionsWithVibrate = {
        body: body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200],
        tag: "chif-pam-notif",
        renotify: true,
        data: { url: "/client/notifications" },
      };

      await swReg.showNotification(title, options);
    } catch (err) {
      console.error("Erreur affichage notification native:", err);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }
      setUserId(user.id);

      const [notifsRes, challengesRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, user_id, title, content, type, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("challenges")
          .select("id, title, prize_pool_cp, game_type, created_at, is_active")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (notifsRes.data) setNotifications(notifsRes.data as NotificationRow[]);
      if (challengesRes.data) setLiveChallenges(challengesRes.data as ChallengeRow[]);
    } catch (err) {
      console.error("Erreur de chargement des données:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const checkPushSubscription = useCallback(async () => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub && Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    void fetchAllData();
    void checkPushSubscription();
  }, [checkPushSubscription, fetchAllData]);

  // Synchronisation en temps réel via Supabase Realtime
  useEffect(() => {
    if (!userId || !isTabVisible) return;

    const channel = supabase
      .channel("notifications_realtime_sync")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          void sendNativePush(
            newNotif.title || "CHIF PAM ⚡",
            newNotif.content || "Nouvelle notification"
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenges",
        },
        (payload) => {
          const newChallenge = payload.new as ChallengeRow;
          if (newChallenge.is_active) {
            setLiveChallenges((prev) => [
              newChallenge,
              ...prev.filter((c) => c.id !== newChallenge.id),
            ]);
            void sendNativePush("NOUVEAU DÉFI DISPONIBLE 🔥", newChallenge.title);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isTabVisible, userId]);

  const togglePush = async () => {
    setIsRegistering(true);
    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        if (userId) {
          const { error } = await supabase.from("push_subscriptions").upsert(
            {
              user_id: userId,
              subscription: sub.toJSON(),
            },
            { onConflict: "subscription" }
          );

          if (!error) {
            void sendNativePush("NOTIFICATIONS ACTIVÉES ✅", "Le radar de notifications est actif.");
            setPushEnabled(true);
          } else {
            alert("Erreur lors de la sauvegarde de l'abonnement push.");
          }
        }
      } else {
        alert("Permission refusée. Modifiez les paramètres de votre navigateur.");
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur technique s'est produite.");
    } finally {
      setIsRegistering(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
  };

  const allAlerts = useMemo<AlertItem[]>(() => {
    const mappedChallenges: AlertItem[] = liveChallenges.map((c) => ({
      id: `challenge-${c.id}`,
      title: `DÉFI : ${c.title}`,
      content: `Jackpot de ${c.prize_pool_cp.toLocaleString()} CP à remporter. Participez dès maintenant !`,
      created_at: c.created_at,
      is_read: false,
      is_challenge: true,
      is_victory: false,
      link: "/client/challenges",
    }));

    const normalizedNotifs: AlertItem[] = notifications.map((n) => {
      const title = n.title || "ALERTE SYSTÈME";
      const content = n.content || "Nouvelle information";

      // Détection des victoires Top 3 ou gains de CP
      const isTop1 = title.includes("🥇") || title.includes("#1") || title.toLowerCase().includes("1er");
      const isTop2 = title.includes("🥈") || title.includes("#2") || title.toLowerCase().includes("2eme");
      const isTop3 = title.includes("🥉") || title.includes("#3") || title.toLowerCase().includes("3eme");

      const isVictory =
        isTop1 ||
        isTop2 ||
        isTop3 ||
        title.toLowerCase().includes("victoire") ||
        title.toLowerCase().includes("récompense") ||
        n.type === "reward";

      let rank_position: number | undefined;
      if (isTop1) rank_position = 1;
      else if (isTop2) rank_position = 2;
      else if (isTop3) rank_position = 3;

      return {
        id: n.id,
        title,
        content,
        created_at: n.created_at,
        is_read: n.is_read,
        is_challenge: false,
        is_victory: isVictory,
        rank_position,
        link: isVictory ? "/client/rank" : undefined,
      };
    });

    return [...mappedChallenges, ...normalizedNotifs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, liveChallenges]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((n) => {
      if (activeFilter === "TOUT") return true;
      if (activeFilter === "VICTOIRES") return n.is_victory;
      if (activeFilter === "DÉFIS") return n.is_challenge;
      if (activeFilter === "SYSTÈME") return !n.is_challenge && !n.is_victory;
      return true;
    });
  }, [allAlerts, activeFilter]);

  const counts = useMemo(
    () => ({
      TOUT: allAlerts.filter((n) => !n.is_read).length,
      VICTOIRES: allAlerts.filter((n) => !n.is_read && n.is_victory).length,
      DÉFIS: allAlerts.filter((n) => !n.is_read && n.is_challenge).length,
      SYSTÈME: allAlerts.filter((n) => !n.is_read && !n.is_challenge && !n.is_victory).length,
    }),
    [allAlerts]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-emerald-500">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-24">
      {/* En-tête */}
      <div className="sticky top-0 z-20 space-y-4 border-b border-white/10 bg-[#020617]/95 p-5 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/client/home")}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 transition active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl tracking-tighter">CENTRE_D_ALERTES</h1>
            <p className="text-[8px] tracking-[0.3em] text-emerald-400">
              SYNCHRONISATION_TEMPS_RÉEL
            </p>
          </div>
          <button
            onClick={markAllAsRead}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400 active:scale-95 transition"
            title="Tout marquer comme lu"
          >
            <CheckCheck size={20} />
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(["TOUT", "VICTOIRES", "DÉFIS", "SYSTÈME"] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`relative flex items-center gap-2 rounded-2xl px-5 py-2.5 text-[9px] tracking-widest whitespace-nowrap border transition ${
                activeFilter === filter
                  ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/20"
                  : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
              }`}
            >
              <span>{filter}</span>
              {counts[filter] > 0 && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[8px] ${
                    activeFilter === filter
                      ? "bg-slate-950 text-emerald-400"
                      : "bg-emerald-500 text-slate-950"
                  }`}
                >
                  {counts[filter]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des alertes */}
      <div className="p-4 space-y-3 sm:p-6">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-600">
              <Inbox size={50} strokeWidth={1.5} />
              <p className="mt-4 text-[10px] tracking-[0.4em]">AUCUNE ALERTE TROUVÉE</p>
            </div>
          ) : (
            filteredAlerts.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => n.link && router.push(n.link)}
                className={`relative overflow-hidden rounded-[2rem] border p-5 transition cursor-pointer ${
                  n.is_victory
                    ? "border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                    : n.is_challenge
                    ? "border-blue-500/50 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 shadow-[0_0_25px_rgba(59,130,246,0.15)]"
                    : n.is_read
                    ? "border-white/5 bg-slate-900/30 opacity-50"
                    : "border-white/10 bg-slate-900/80 backdrop-blur-md"
                }`}
              >
                {!n.is_read && (
                  <div className="absolute top-4 right-4 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icône dynamique selon le type */}
                  <div
                    className={`rounded-2xl p-3 ${
                      n.is_victory
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                        : n.is_challenge
                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {n.rank_position === 1 ? (
                      <Crown size={22} className="text-amber-300 fill-current" />
                    ) : n.rank_position === 2 || n.rank_position === 3 ? (
                      <Medal size={22} />
                    ) : n.is_victory ? (
                      <Trophy size={22} />
                    ) : n.is_challenge ? (
                      <Flame size={22} />
                    ) : (
                      <Shield size={22} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`text-sm tracking-tight ${
                          n.is_victory
                            ? "text-emerald-400 font-black"
                            : n.is_challenge
                            ? "text-blue-400 font-black"
                            : "text-white"
                        }`}
                      >
                        {n.title}
                      </h3>
                      {n.is_victory && <Coins size={14} className="text-emerald-400" />}
                    </div>

                    <p className="text-xs not-italic text-slate-300 font-medium leading-relaxed lowercase">
                      {n.content}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[8px] tracking-widest text-slate-500">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {n.is_victory && (
                        <span className="text-[8px] font-black text-emerald-400 tracking-widest">
                          VOIR LE CLASSEMENT
                        </span>
                      )}
                      {n.is_challenge && (
                        <span className="text-[8px] font-black text-blue-400 tracking-widest animate-pulse">
                          REJOINDRER LA MISSION
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Bouton Fixe d'Abonnement aux Notifications Push */}
      <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
        <button
          onClick={togglePush}
          disabled={isRegistering}
          className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-6 py-3.5 text-[10px] font-black tracking-widest shadow-2xl transition active:scale-95 ${
            pushEnabled
              ? "bg-slate-900 border border-emerald-500/30 text-emerald-400"
              : "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
          }`}
        >
          {isRegistering ? (
            <Loader2 size={16} className="animate-spin" />
          ) : pushEnabled ? (
            <Bell size={16} />
          ) : (
            <BellOff size={16} />
          )}
          <span>{pushEnabled ? "PUSH ACTIF" : "ACTIVER LES NOTIFICATIONS PUSH"}</span>
        </button>
      </div>
    </div>
  );
}
