"use client";

import React, {
useCallback,
useEffect,
useMemo,
useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAppFeedback } from "@/components/ui/AppFeedbackProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import { useRouter } from "next/navigation";

import {
AlertTriangle,
ArrowLeft,
Bell,
BellOff,
Check,
CheckCheck,
ChevronRight,
Coins,
Flame,
Inbox,
Loader2,
Shield,
Trophy,
X,
Zap,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

import {
DSButton,
DSCard,
DSPage,
DSPanel,
DSSkeleton,
} from "@/components/ui/primitives";

import ThreeSurface from "@/components/three/ThreeSurface";

/* -------------------------------------------------------------------------- /
/ TYPES                                                                      /
/ -------------------------------------------------------------------------- */

type FilterType = "TOUT" | "VICTOIRES" | "DÉFIS" | "SYSTÈME";

type NotificationRow = {
id: string;
title: string | null;
content: string | null;
message?: string | null;
created_at: string;
is_read: boolean;
link?: string | null;
admin_note?: string | null;
};

type ChallengeRow = {
id: string;
title: string;
prize_pool_cp: number;
created_at: string;
ends_at: string | null;
is_active: boolean;
};

type TransactionRow = {
id: string;
user_id: string;
type: "DEPOSIT" | "WITHDRAWAL";
status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
amount: number;
admin_note: string | null;
created_at: string;
};

type AlertItem = {
id: string;
title: string;
content: string;
created_at: string;
is_read: boolean;
is_challenge: boolean;
is_victory: boolean;
is_rejection: boolean;
admin_note?: string | null;
link?: string;
};

/* -------------------------------------------------------------------------- /
/ CONSTANTES                                                                 /
/ -------------------------------------------------------------------------- */

const FILTERS: FilterType[] = [
"TOUT",
"VICTOIRES",
"DÉFIS",
"SYSTÈME",
];

const FILTER_LABELS: Record<FilterType, string> = {
TOUT: "Tout",
VICTOIRES: "Victoires",
DÉFIS: "Défis",
SYSTÈME: "Système",
};

const MAX_ITEMS = 100;

/* -------------------------------------------------------------------------- /
/ HELPERS                                                                    /
/ -------------------------------------------------------------------------- */

function isExpired(date: string | null) {
return Boolean(date && new Date(date).getTime() <= Date.now());
}

function formatAlertTime(date: string) {
const value = new Date(date);

if (Number.isNaN(value.getTime())) {
return "DATE_INCONNUE";
}

return value.toLocaleString("fr-FR", {
day: "2-digit",
month: "short",
hour: "2-digit",
minute: "2-digit",
});
}

function isVictoryNotification(notification: NotificationRow) {
const title = notification.title?.toLowerCase() ?? "";
const message = (
notification.message ??
notification.content ??
""
).toLowerCase();

return (
title.includes("vic") ||
title.includes("🥇") ||
title.includes("🥈") ||
title.includes("🥉") ||
message.includes("cp gagné") ||
message.includes("cp remport") ||
message.includes("récompense")
);
}

function isRejectionNotification(notification: NotificationRow) {
const title = notification.title?.toLowerCase() ?? "";
const content = (
notification.content ??
notification.message ??
""
).toLowerCase();

return (
title.includes("refus") ||
title.includes("échec") ||
title.includes("annulé") ||
content.includes("refus") ||
content.includes("annulé")
);
}

/* -------------------------------------------------------------------------- /
/ COMPOSANT                                                                  /
/ -------------------------------------------------------------------------- */

export default function ClientNotifications() {
const router = useRouter();
const { notify } = useAppFeedback();

const {
enabled: pushEnabled,
loading: pushLoading,
subscribe: subscribePush,
} = usePushNotifications();

const [notifications, setNotifications] = useState<NotificationRow[]>([]);
const [liveChallenges, setLiveChallenges] = useState<ChallengeRow[]>([]);
const [rejectedTransactions, setRejectedTransactions] = useState<
TransactionRow[]

«([]);»

const [loading, setLoading] = useState(true);
const [activeFilter, setActiveFilter] =
useState<FilterType>("TOUT");

const [userId, setUserId] = useState<string | null>(null);
const [isTabVisible, setIsTabVisible] = useState(true);
const [isMarkingRead, setIsMarkingRead] = useState(false);

/* ------------------------------------------------------------------------ /
/ VISIBILITÉ                                                               /
/ ------------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------------ /
/ CHARGEMENT GLOBAL                                                        /
/ ------------------------------------------------------------------------ */

const fetchAllData = useCallback(async () => {
try {
setLoading(true);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    router.replace("/connexion");
    return;
  }

  setUserId(user.id);

  const nowIso = new Date().toISOString();

  const [
    notificationsResult,
    challengesResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, title, content, message, created_at, is_read, link, admin_note"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS),

    supabase
      .from("challenges")
      .select(
        "id, title, prize_pool_cp, created_at, ends_at, is_active"
      )
      .eq("is_active", true)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS),

    supabase
      .from("transactions")
      .select(
        "id, user_id, type, status, amount, admin_note, created_at"
      )
      .eq("user_id", user.id)
      .in("status", ["REJECTED", "CANCELLED"])
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS),
  ]);

  if (notificationsResult.error) {
    console.error(
      "Erreur notifications:",
      notificationsResult.error
    );
  }

  if (challengesResult.error) {
    console.error(
      "Erreur challenges:",
      challengesResult.error
    );
  }

  if (transactionsResult.error) {
    console.error(
      "Erreur transactions:",
      transactionsResult.error
    );
  }

  setNotifications(
    (notificationsResult.data ?? []) as NotificationRow[]
  );

  setLiveChallenges(
    (challengesResult.data ?? []) as ChallengeRow[]
  );

  setRejectedTransactions(
    (transactionsResult.data ?? []) as TransactionRow[]
  );
} catch (error) {
  console.error(
    "Erreur globale centre des alertes:",
    error
  );
} finally {
  setLoading(false);
}

}, [router]);

useEffect(() => {
fetchAllData();
}, [fetchAllData]);

/* ------------------------------------------------------------------------ /
/ REALTIME                                                                 /
/ ------------------------------------------------------------------------ */

useEffect(() => {
if (!userId || !isTabVisible) {
return;
}

const channelName = `client_notifications_${userId}`;

const channel = supabase
  .channel(channelName)

  /* ------------------------------ NOTIFICATIONS ----------------------- */

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      if (payload.eventType === "DELETE") {
        const deleted = payload.old as NotificationRow;

        setNotifications((previous) =>
          previous.filter(
            (notification) => notification.id !== deleted.id
          )
        );

        return;
      }

      const notification =
        payload.new as NotificationRow;

      if (!notification?.id) {
        return;
      }

      setNotifications((previous) => {
        const withoutCurrent = previous.filter(
          (item) => item.id !== notification.id
        );

        return [
          notification,
          ...withoutCurrent,
        ].slice(0, MAX_ITEMS);
      });
    }
  )

  /* -------------------------------- CHALLENGES ------------------------ */

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "challenges",
    },
    (payload) => {
      if (payload.eventType === "DELETE") {
        const deleted = payload.old as ChallengeRow;

        setLiveChallenges((previous) =>
          previous.filter(
            (challenge) => challenge.id !== deleted.id
          )
        );

        return;
      }

      const challenge =
        payload.new as ChallengeRow;

      if (!challenge?.id) {
        return;
      }

      const invalid =
        !challenge.is_active ||
        isExpired(challenge.ends_at);

      setLiveChallenges((previous) => {
        if (invalid) {
          return previous.filter(
            (item) => item.id !== challenge.id
          );
        }

        return [
          challenge,
          ...previous.filter(
            (item) => item.id !== challenge.id
          ),
        ].slice(0, MAX_ITEMS);
      });
    }
  )

  /* ------------------------------ TRANSACTIONS ------------------------ */

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "transactions",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      if (payload.eventType === "DELETE") {
        const deleted = payload.old as TransactionRow;

        setRejectedTransactions((previous) =>
          previous.filter(
            (transaction) =>
              transaction.id !== deleted.id
          )
        );

        return;
      }

      const transaction =
        payload.new as TransactionRow;

      if (!transaction?.id) {
        return;
      }

      const isRejected =
        transaction.status === "REJECTED" ||
        transaction.status === "CANCELLED";

      setRejectedTransactions((previous) => {
        if (!isRejected) {
          return previous.filter(
            (item) => item.id !== transaction.id
          );
        }

        return [
          transaction,
          ...previous.filter(
            (item) => item.id !== transaction.id
          ),
        ].slice(0, MAX_ITEMS);
      });
    }
  )

  .subscribe((status) => {
    if (status === "CHANNEL_ERROR") {
      console.warn(
        "Synchronisation realtime des alertes indisponible."
      );
    }
  });

return () => {
  supabase.removeChannel(channel);
};

}, [userId, isTabVisible]);

/* ------------------------------------------------------------------------ /
/ PUSH                                                                     /
/ ------------------------------------------------------------------------ */

const togglePush = useCallback(async () => {
if (pushLoading || pushEnabled) {
return;
}

try {
  await subscribePush();

  notify(
    "Notifications push activées.",
    "success"
  );
} catch (error) {
  notify(
    error instanceof Error
      ? error.message
      : "Erreur technique lors de l'abonnement.",
    "danger"
  );
}

}, [
notify,
pushEnabled,
pushLoading,
subscribePush,
]);

/* ------------------------------------------------------------------------ /
/ MARK ALL AS READ                                                         /
/ ------------------------------------------------------------------------ */

const handleMarkAllAsRead = useCallback(async () => {
if (!userId || isMarkingRead) {
return;
}

try {
  setIsMarkingRead(true);

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  setNotifications((previous) =>
    previous.map((notification) => ({
      ...notification,
      is_read: true,
    }))
  );

  notify(
    "Toutes les notifications ont été marquées comme lues.",
    "success"
  );
} catch (error) {
  console.error(
    "Erreur marquage notifications:",
    error
  );

  notify(
    "Impossible de mettre à jour les notifications.",
    "danger"
  );
} finally {
  setIsMarkingRead(false);
}

}, [
isMarkingRead,
notify,
userId,
]);

/* ------------------------------------------------------------------------ /
/ NORMALISATION DES ALERTES                                                /
/ ------------------------------------------------------------------------ */

const allAlerts = useMemo<AlertItem[]>(() => {
const now = Date.now();

/* ------------------------------- DÉFIS -------------------------------- */

const challengeAlerts: AlertItem[] =
  liveChallenges
    .filter((challenge) => {
      if (!challenge.is_active) {
        return false;
      }

      if (
        challenge.ends_at &&
        new Date(challenge.ends_at).getTime() <= now
      ) {
        return false;
      }

      return true;
    })
    .map((challenge) => ({
      id: `challenge-${challenge.id}`,
      title: `NOUVEAU DÉFI : ${challenge.title}`,
      content: `Récompense : ${challenge.prize_pool_cp.toLocaleString(
        "fr-FR"
      )} CP. Bonne chance !`,
      created_at: challenge.created_at,
      is_read: false,
      is_challenge: true,
      is_victory: false,
      is_rejection: false,
      link: "/client/challenges",
    }));

/* -------------------------- TRANSACTIONS REFUSÉES --------------------- */

const rejectionAlerts: AlertItem[] =
  rejectedTransactions.map((transaction) => {
    const typeLabel =
      transaction.type === "DEPOSIT"
        ? "DÉPÔT"
        : "RETRAIT";

    const statusLabel =
      transaction.status === "CANCELLED"
        ? "ANNULATION"
        : "ÉCHEC";

    return {
      id: `transaction-${transaction.id}`,
      title: `${statusLabel} DE ${typeLabel} (${transaction.amount.toLocaleString(
        "fr-FR"
      )} HTG)`,
      content: transaction.admin_note
        ? `Raison : ${transaction.admin_note}`
        : "Votre demande n'a pas pu être validée par l'administration.",
      created_at: transaction.created_at,
      is_read: false,
      is_challenge: false,
      is_victory: false,
      is_rejection: true,
      admin_note: transaction.admin_note,
      link: "/client/finance",
    };
  });

/* ---------------------------- NOTIFICATIONS --------------------------- */

const notificationAlerts: AlertItem[] =
  notifications.map((notification) => ({
    id: `notification-${notification.id}`,
    title:
      notification.title?.trim() ||
      "ALERTE CHIFPAM",
    content:
      notification.content?.trim() ||
      notification.message?.trim() ||
      "Nouvelle information disponible.",
    created_at: notification.created_at,
    is_read: notification.is_read,
    is_challenge: false,
    is_victory:
      isVictoryNotification(notification),
    is_rejection:
      isRejectionNotification(notification),
    admin_note: notification.admin_note,
    link:
      notification.link ??
      undefined,
  }));

return [
  ...challengeAlerts,
  ...rejectionAlerts,
  ...notificationAlerts,
].sort(
  (a, b) =>
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
);

}, [
liveChallenges,
notifications,
rejectedTransactions,
]);

/* ------------------------------------------------------------------------ /
/ FILTRAGE                                                                  /
/ ------------------------------------------------------------------------ */

const filteredAlerts = useMemo(() => {
return allAlerts.filter((alert) => {
switch (activeFilter) {
case "VICTOIRES":
return alert.is_victory;

    case "DÉFIS":
      return alert.is_challenge;

    case "SYSTÈME":
      return (
        !alert.is_challenge &&
        !alert.is_victory
      );

    case "TOUT":
    default:
      return true;
  }
});

}, [
activeFilter,
allAlerts,
]);

/* ------------------------------------------------------------------------ /
/ COMPTEURS                                                                /
/ ------------------------------------------------------------------------ */

const counts = useMemo(
() => ({
TOUT: allAlerts.filter(
(alert) => !alert.is_read
).length,

  VICTOIRES: allAlerts.filter(
    (alert) =>
      !alert.is_read &&
      alert.is_victory
  ).length,

  DÉFIS: allAlerts.filter(
    (alert) =>
      !alert.is_read &&
      alert.is_challenge
  ).length,

  SYSTÈME: allAlerts.filter(
    (alert) =>
      !alert.is_read &&
      !alert.is_challenge &&
      !alert.is_victory
  ).length,
}),
[allAlerts]

);

const unreadCount = counts.TOUT;

/* ------------------------------------------------------------------------ /
/ LOADING                                                                   /
/ ------------------------------------------------------------------------ */

if (loading) {
return (
<DSPage className="min-h-screen overflow-hidden">
<div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
<div className="pointer-events-none absolute -right-40 -top-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
<div className="pointer-events-none absolute -left-40 top-72 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <DSSkeleton className="h-12 w-12 rounded-2xl" />

          <div className="space-y-2 text-center">
            <DSSkeleton className="mx-auto h-5 w-48" />
            <DSSkeleton className="mx-auto h-2 w-32" />
          </div>

          <DSSkeleton className="h-12 w-12 rounded-2xl" />
        </div>

        <DSSkeleton className="h-14 w-full rounded-2xl" />

        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <DSCard
              key={item}
              className="p-5"
            >
              <div className="flex gap-4">
                <DSSkeleton className="h-12 w-12 shrink-0 rounded-2xl" />

                <div className="flex-1 space-y-3">
                  <DSSkeleton className="h-4 w-2/3" />
                  <DSSkeleton className="h-3 w-full" />
                  <DSSkeleton className="h-3 w-1/3" />
                </div>
              </div>
            </DSCard>
          ))}
        </div>
      </div>
    </div>
  </DSPage>
);

}

/* ------------------------------------------------------------------------ /
/ RENDER                                                                    /
/ ------------------------------------------------------------------------ */

return (
<DSPage className="relative min-h-screen overflow-x-hidden pb-28 text-white">
{/* ------------------------------------------------------------------ /}
{/ ATMOSPHÈRE                                                         /}
{/ ------------------------------------------------------------------ */}

  <div className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute -right-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.07] blur-3xl" />

    <div className="absolute -left-48 top-[35%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/[0.035] blur-3xl" />

    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/[0.025] blur-3xl" />
  </div>

  <div className="pointer-events-none absolute right-0 top-0 hidden h-72 w-[30rem] opacity-35 lg:block">
    <ThreeSurface
      variant="home"
      className="h-full w-full"
    />
  </div>

  {/* ------------------------------------------------------------------ */}
  {/* CONTENU                                                             */}
  {/* ------------------------------------------------------------------ */}

  <div className="relative mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-7">
    {/* -------------------------------------------------------------- */}
    {/* HEADER                                                           */}
    {/* -------------------------------------------------------------- */}

    <motion.header
      initial={{
        opacity: 0,
        y: -12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
      }}
      className="sticky top-2 z-30 mb-5 rounded-[1.75rem] border border-white/10 bg-[#020617]/80 p-3 shadow-2xl backdrop-blur-2xl sm:top-4 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            router.push("/client/home")
          }
          aria-label="Retour au tableau de bord"
          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-slate-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-90"
        >
          <ArrowLeft
            size={19}
            className="transition-transform group-hover:-translate-x-0.5"
          />
        </button>

        <div className="min-w-0 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="hidden h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] sm:block" />

            <h1 className="truncate text-sm font-black tracking-[0.12em] text-white sm:text-base">
              CENTRE D&apos;ALERTES
            </h1>

            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[8px] font-black text-black">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-[7px] font-black tracking-[0.35em] text-emerald-500/50 sm:text-[8px]">
            RADAR_ACTIF · SYNCHRONISÉ
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={
            isMarkingRead ||
            unreadCount === 0
          }
          aria-label="Marquer toutes les notifications comme lues"
          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/20 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {isMarkingRead ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <CheckCheck
              size={18}
              className="transition-transform group-hover:scale-110"
            />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* FILTRES                                                       */}
      {/* ------------------------------------------------------------ */}

      <div className="mt-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1.5">
          {FILTERS.map((filter) => {
            const active =
              activeFilter === filter;

            const count =
              counts[filter];

            return (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setActiveFilter(filter)
                }
                className={`relative flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all sm:px-4 ${
                  active
                    ? "border-emerald-400 bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.18)]"
                    : "border-white/5 bg-white/[0.035] text-slate-500 hover:border-white/10 hover:bg-white/[0.07] hover:text-slate-300"
                }`}
              >
                {filter === "VICTOIRES" && (
                  <Trophy size={12} />
                )}

                {filter === "DÉFIS" && (
                  <Flame size={12} />
                )}

                {filter === "SYSTÈME" && (
                  <Shield size={12} />
                )}

                {filter === "TOUT" && (
                  <Zap size={12} />
                )}

                <span>
                  {FILTER_LABELS[filter]}
                </span>

                {count > 0 && (
                  <span
                    className={`flex min-w-5 items-center justify-center rounded-md px-1 py-0.5 text-[8px] ${
                      active
                        ? "bg-black/90 text-emerald-400"
                        : "bg-emerald-500 text-black"
                    }`}
                  >
                    {count > 99
                      ? "99+"
                      : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.header>

    {/* -------------------------------------------------------------- */}
    {/* INTRODUCTION                                                    */}
    {/* -------------------------------------------------------------- */}

    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.05,
        duration: 0.4,
      }}
      className="mb-5 flex items-end justify-between gap-4 px-1"
    >
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400/70">
          Flux système
        </p>

        <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
          Vos dernières alertes
        </h2>
      </div>

      <div className="hidden items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-slate-600 sm:flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        LIVE
      </div>
    </motion.div>

    {/* -------------------------------------------------------------- */}
    {/* LISTE                                                           */}
    {/* -------------------------------------------------------------- */}

    <div className="space-y-3">
      <AnimatePresence
        mode="popLayout"
        initial={false}
      >
        {filteredAlerts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{
              opacity: 0,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
            }}
          >
            <DSCard className="flex min-h-[25rem] flex-col items-center justify-center border-white/5 bg-white/[0.015] text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-white/[0.025]">
                  <Inbox
                    size={34}
                    strokeWidth={1.2}
                    className="text-slate-700"
                  />
                </div>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-600">
                Aucune alerte
              </p>

              <p className="mt-2 max-w-xs text-[10px] font-normal lowercase not-italic leading-relaxed text-slate-700">
                Le radar ChifPam est calme pour le moment.
              </p>
            </DSCard>
          </motion.div>
        ) : (
          filteredAlerts.map(
            (alert, index) => {
              const rejection =
                alert.is_rejection;

              const challenge =
                alert.is_challenge;

              const victory =
                alert.is_victory;

              const unread =
                !alert.is_read;

              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{
                    opacity: 0,
                    y: 12,
                    scale: 0.985,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: -20,
                    scale: 0.97,
                  }}
                  transition={{
                    duration: 0.28,
                    delay:
                      Math.min(
                        index,
                        5
                      ) * 0.025,
                  }}
                >
                  <DSCard
                    onClick={() => {
                      if (alert.link) {
                        router.push(
                          alert.link
                        );
                      }
                    }}
                    className={`group relative cursor-pointer overflow-hidden p-4 transition-all duration-300 sm:p-5 ${
                      rejection
                        ? "border-red-500/30 bg-gradient-to-br from-red-950/30 via-slate-950/80 to-black hover:border-red-400/50"
                        : challenge
                        ? "border-blue-500/25 bg-gradient-to-br from-blue-950/30 via-slate-950/80 to-black hover:border-blue-400/50"
                        : victory
                        ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-950/80 to-black hover:border-emerald-400/50"
                        : unread
                        ? "border-white/10 bg-white/[0.035] hover:border-emerald-500/25 hover:bg-white/[0.05]"
                        : "border-white/5 bg-white/[0.015] opacity-55 hover:opacity-75"
                    }`}
                  >
                    {/* ACCENT LATÉRAL -------------------------------- */}

                    <div
                      className={`absolute inset-y-0 left-0 w-[2px] ${
                        rejection
                          ? "bg-red-500"
                          : challenge
                          ? "bg-blue-500"
                          : victory
                          ? "bg-emerald-500"
                          : unread
                          ? "bg-emerald-500/50"
                          : "bg-transparent"
                      }`}
                    />

                    {/* GLOW DISCRET ----------------------------------- */}

                    {unread && (
                      <div
                        className={`pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl ${
                          rejection
                            ? "bg-red-500/10"
                            : challenge
                            ? "bg-blue-500/10"
                            : victory
                            ? "bg-emerald-500/10"
                            : "bg-white/[0.03]"
                        }`}
                      />
                    )}

                    {/* DOT NON LU -------------------------------------- */}

                    {unread && (
                      <div className="absolute right-4 top-4">
                        <span className="relative flex h-2.5 w-2.5">
                          <span
                            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                              rejection
                                ? "bg-red-400"
                                : challenge
                                ? "bg-blue-400"
                                : "bg-emerald-400"
                            }`}
                          />

                          <span
                            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                              rejection
                                ? "bg-red-500"
                                : challenge
                                ? "bg-blue-500"
                                : "bg-emerald-500"
                            }`}
                          />
                        </span>
                      </div>
                    )}

                    <div className="relative z-10 flex gap-3.5 sm:gap-4">
                      {/* ICÔNE ---------------------------------------- */}

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12 ${
                          rejection
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : challenge
                            ? "border-blue-400/30 bg-blue-500/15 text-blue-300"
                            : victory
                            ? "border-emerald-400/30 bg-emerald-500 text-black shadow-[0_0_18px_rgba(16,185,129,0.18)]"
                            : "border-white/10 bg-white/[0.045] text-slate-500"
                        }`}
                      >
                        {rejection ? (
                          <AlertTriangle
                            size={19}
                          />
                        ) : challenge ? (
                          <Flame
                            size={19}
                          />
                        ) : victory ? (
                          <Trophy
                            size={19}
                          />
                        ) : (
                          <Shield
                            size={19}
                          />
                        )}
                      </div>

                      {/* CONTENU -------------------------------------- */}

                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {challenge && (
                                <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-blue-400">
                                  DÉFI
                                </span>
                              )}

                              {victory && (
                                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-400">
                                  RÉCOMPENSE
                                </span>
                              )}

                              {rejection && (
                                <span className="rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-red-400">
                                  FINANCE
                                </span>
                              )}
                            </div>

                            <h3
                              className={`mt-1 text-[12px] font-black leading-tight tracking-tight sm:text-sm ${
                                rejection
                                  ? "text-red-300"
                                  : challenge
                                  ? "text-blue-300"
                                  : victory
                                  ? "text-emerald-300"
                                  : "text-white"
                              }`}
                            >
                              {alert.title}
                            </h3>
                          </div>

                          {alert.link && (
                            <ChevronRight
                              size={15}
                              className="mt-1 shrink-0 text-slate-700 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-400"
                            />
                          )}
                        </div>

                        <p
                          className={`mt-2 text-[10px] font-normal leading-relaxed sm:text-[11px] ${
                            rejection
                              ? "text-red-100/70"
                              : victory
                              ? "text-slate-200"
                              : "text-slate-400"
                          }`}
                        >
                          {alert.content}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-600">
                              {formatAlertTime(
                                alert.created_at
                              )}
                            </span>

                            {!unread && (
                              <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-700">
                                <Check
                                  size={9}
                                />
                                Lu
                              </span>
                            )}
                          </div>

                          {rejection && (
                            <span className="text-[7px] font-black uppercase tracking-[0.12em] text-red-500/70">
                              Voir finance
                            </span>
                          )}

                          {challenge && (
                            <span className="animate-pulse text-[7px] font-black uppercase tracking-[0.12em] text-blue-500">
                              Voir le défi
                            </span>
                          )}

                          {victory && (
                            <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.12em] text-emerald-500">
                              <Coins size={9} />
                              Solde mis à jour
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </DSCard>
                </motion.div>
              );
            }
          )
        )}
      </AnimatePresence>
    </div>

    {/* -------------------------------------------------------------- */}
    {/* PANNEAU PUSH                                                     */}
    {/* -------------------------------------------------------------- */}

    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.2,
        duration: 0.4,
      }}
      className="mt-5"
    >
      <DSPanel className="relative overflow-hidden border-white/5 p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-16 opacity-[0.035]">
          {pushEnabled ? (
            <Bell size={170} />
          ) : (
            <BellOff size={170} />
          )}
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  pushEnabled
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 bg-white/[0.04] text-slate-500"
                }`}
              >
                {pushEnabled ? (
                  <Bell size={16} />
                ) : (
                  <BellOff size={16} />
                )}
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white">
                  Notifications push
                </p>

                <p className="mt-0.5 text-[9px] font-normal lowercase not-italic text-slate-500">
                  {pushEnabled
                    ? "Votre radar peut vous prévenir en temps réel."
                    : "Recevez les alertes importantes même hors du site."}
                </p>
              </div>
            </div>
          </div>

          <DSButton
            type="button"
            onClick={togglePush}
            disabled={
              pushLoading ||
              pushEnabled
            }
            variant={
              pushEnabled
                ? "secondary"
                : "success"
            }
            size="sm"
            className="w-full shrink-0 sm:w-auto"
          >
            {pushLoading ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : pushEnabled ? (
              <Check size={14} />
            ) : (
              <Bell size={14} />
            )}

            {pushEnabled
              ? "Push actif"
              : "Activer le push"}
          </DSButton>
        </div>
      </DSPanel>
    </motion.div>

    {/* -------------------------------------------------------------- */}
    {/* FOOTER STATUS                                                    */}
    {/* -------------------------------------------------------------- */}

    <div className="mt-5 flex items-center justify-center gap-2 text-[7px] font-black uppercase tracking-[0.22em] text-slate-700">
      <span className="h-1 w-1 rounded-full bg-emerald-500/60" />
      ChifPam notification radar
      <span className="h-1 w-1 rounded-full bg-emerald-500/60" />
    </div>
  </div>
</DSPage>

);
        }
