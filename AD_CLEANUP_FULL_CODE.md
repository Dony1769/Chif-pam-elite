# Code complet des fichiers impactes

## src/app/layout.tsx
```tsx
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
const ibmMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Chif Pam",
  description: "Plateforme sÃ©curisÃ©e",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#6EE7C8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Google Search Console */}
        <meta
          name="google-site-verification"
          content="0DKoujhMc_f-hx6jkLpCVG5DC1apsfHK8VtM-do5Mf0"
        />

      </head>

      <body className={`${spaceGrotesk.variable} ${ibmMono.variable} antialiased`}>
        <PWARegister />
        <WebVitalsReporter />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}

```

## src/components/PWARegister.tsx
```tsx
"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleWindow = window as IdleWindow;

    const registerWorker = () => {
      navigator.serviceWorker
        .getRegistration("/")
        .then((existing) => existing ?? navigator.serviceWorker.register("/sw.js"))
        .catch((err) => console.error("Erreur SW:", err));
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => registerWorker(), { timeout: 2000 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = setTimeout(registerWorker, 1200);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

```

## public/sw.js
```tsx
// public/sw.js

const CACHE_VERSION = "chifpam-static-v1";
const RUNTIME_CACHE = "chifpam-runtime-v1";
const PRECACHE_URLS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  if (self.registration.navigationPreload) {
    event.waitUntil(self.registration.navigationPreload.enable());
  }
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabase = url.hostname.includes("supabase.co");
  const isApi = url.pathname.startsWith("/api/");

  if (!isHttp || isSupabase || isApi) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && isSameOrigin) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// 2. GESTION DES PUSH (Venant du Serveur / Edge Function)
// Ce code s'exÃ©cute quand l'app est FERMÃ‰E et qu'un serveur envoie un push
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = null;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  // Si c'est une notif CHIF PAM
  if (payload && (payload.title || payload.message)) {
      const title = payload.title || "CHIF PAM âš¡";
      const options = {
        body: payload.message || payload.body || "Nouvelle information disponible !",
        icon: "/icons/icon-192.png", 
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200],
        tag: "chif-pam-notif", // Tag unique pour ne pas empiler les notifs
        renotify: true,
        data: { 
            url: payload.url || "/client/notifications"
        }
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
  }
});

// 3. GESTION DES CLICS (Le plus important pour l'UX)
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  
  // On ne gÃ¨re que NOS notifications
  if (notification.tag === "chif-pam-notif") {
      event.notification.close(); // On ferme la notif

      const targetUrl = notification.data.url || "/client/notifications";

      // Logique pour rouvrir l'app ou mettre le focus
      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          // A. Chercher si un onglet est dÃ©jÃ  ouvert
          for (const client of clientList) {
            const clientUrl = new URL(client.url, self.location.origin).pathname;
            // Si on est sur le site (peu importe la page exact), on focus
            if (client.url.includes(self.location.origin) && "focus" in client) {
              // Si on veut rediriger vers la page spÃ©cifique :
              if (client.navigate) {
                  client.navigate(targetUrl);
              }
              return client.focus();
            }
          }
          // B. Sinon, ouvrir une nouvelle fenÃªtre
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        })
      );
  }
});

```

## src/app/client/rank/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Timer,
  ChevronLeft,
  Loader2,
  Zap,
  ArrowRight,
  Star,
  TrendingUp,
  Crown,
  Gamepad2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

// --- TYPES TYPÃ‰S STRICTEMENT ---
type GameType = "quiz" | "biometric" | "vault";

type ChallengeInfo = {
  id: string;
  title: string;
  game_type: GameType;
  is_active: boolean;
  ends_at?: string;
};

type LeaderboardEntry = {
  user_id: string;
  username: string;
  total_score: number;
  attempts_count: number;
  rank: number;
};

// Dictionnaire sÃ©curisÃ© des routes de jeu
const GAME_ROUTES: Record<GameType, string> = {
  quiz: "quiz",
  biometric: "biometric-hack",
  vault: "laser-vault",
};

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId");

  // --- Ã‰TATS ---
  const [loading, setLoading] = useState<boolean>(true);
  const [myChallenges, setMyChallenges] = useState<ChallengeInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeInfo | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // --- FONCTION DE RÃ‰CUPÃ‰RATION DU CLASSEMENT ---
  const fetchRankings = useCallback(async (cId: string, currentUserId: string) => {
    try {
      const [chRes, lbRes] = await Promise.all([
        supabase.from("challenges").select("id, title, game_type, is_active, ends_at").eq("id", cId).single(),
        supabase
          .from("challenge_leaderboards")
          .select("user_id, username, total_score, attempts_count, rank")
          .eq("challenge_id", cId)
          .order("rank", { ascending: true }),
      ]);

      if (chRes.data) {
        setActiveChallenge(chRes.data as ChallengeInfo);
      }

      if (lbRes.data) {
        // Sanitarisation des pseudos pour Ã©viter la fuite de donnÃ©es personnelles
        const sanitizedEntries: LeaderboardEntry[] = lbRes.data.map((entry) => ({
          ...entry,
          username: entry.username?.trim() || "Joueur Anonyme",
        }));

        setLeaderboard(sanitizedEntries);
        setCurrentUserRank(sanitizedEntries.find((e) => e.user_id === currentUserId) || null);
      }
    } catch (err) {
      console.error("Erreur lors de la rÃ©cupÃ©ration du classement:", err);
    }
  }, []);

  // --- EFFECT: INITIALISATION ET SUPABASE REALTIME ---
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      // Chargement des tentatives de l'utilisateur
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id, challenges(id, title, game_type, is_active, ends_at)")
        .eq("user_id", user.id);

      if (attempts && isMounted) {
        const list = attempts
          .map((a: { challenges: unknown }) => a.challenges as ChallengeInfo)
          .filter(Boolean);
        
        // Supprimer les doublons de challenges si l'utilisateur a plusieurs tentatives
        const uniqueList = Array.from(new Map(list.map((item) => [item.id, item])).values());
        setMyChallenges(uniqueList);
      }

      if (challengeId && isMounted) {
        await fetchRankings(challengeId, user.id);
      }

      if (isMounted) setLoading(false);
    };

    void initData();

    // Ã‰coute Supabase Realtime OPTIMISÃ‰E (filtrÃ©e par challenge_id)
    if (!challengeId) return;

    const channel = supabase
      .channel(`rank_sync_${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_attempts",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          void supabase.auth.getUser().then(({ data }) => {
            if (data.user && isMounted) {
              void fetchRankings(challengeId, data.user.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [challengeId, fetchRankings]);

  // --- EFFECT: COMPTE Ã€ REBOURS SÃ‰CURISÃ‰ ---
  useEffect(() => {
    if (!activeChallenge?.ends_at) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const end = new Date(activeChallenge.ends_at!).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("MISSION TERMINÃ‰E");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}H ${m}M ${s}S`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeChallenge]);

  // --- VÃ‰RIFICATION EXPIRATION ---
  const isExpired = Boolean(
    !activeChallenge?.is_active ||
      (activeChallenge?.ends_at && new Date(activeChallenge.ends_at).getTime() <= Date.now()) ||
      timeLeft.includes("TERMINÃ‰E")
  );

  // --- REDIRECTION SÃ‰CURISÃ‰E VERS LE JEU ---
  const handleImproveScore = () => {
    if (isExpired || !activeChallenge) return;

    const routeSegment = GAME_ROUTES[activeChallenge.game_type];
    if (!routeSegment) {
      console.error("Type de jeu invalide:", activeChallenge.game_type);
      return;
    }

    router.push(`/client/${routeSegment}?challengeId=${activeChallenge.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  // --- VUE 1 : LISTE DES DÃ‰FIS PARTICIPÃ‰S ---
  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 text-white sm:p-6 font-black italic uppercase">
        <div className="mx-auto max-w-md">
          <div className="mb-8 mt-2 flex items-center justify-between">
            <button
              onClick={() => router.push("/client/home")}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400 transition active:scale-90 hover:text-white"
              aria-label="Retour au menu principal"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
              <Trophy size={18} className="text-emerald-500" />
            </div>
          </div>

          <h1 className="mb-6 text-2xl tracking-tight text-white">Mes Stats Arena</h1>

          <div className="space-y-3">
            {myChallenges.length === 0 ? (
              <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 p-10 text-center">
                <Gamepad2 size={36} className="mx-auto mb-3 text-slate-700" />
                <p className="text-[10px] tracking-widest text-slate-500">AUCUNE PARTICIPATION</p>
                <button
                  onClick={() => router.push("/client/challenges")}
                  className="mt-4 text-xs text-emerald-500 underline"
                >
                  REJOINDRE UNE MISSION
                </button>
              </div>
            ) : (
              myChallenges.map((ch) => {
                const expired = !ch.is_active || (ch.ends_at && new Date(ch.ends_at).getTime() <= Date.now());
                return (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    key={ch.id}
                    onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                    className="flex w-full items-center justify-between rounded-[2rem] border border-white/5 bg-slate-900/60 p-6 text-left transition hover:border-emerald-500/30"
                  >
                    <div>
                      <h3 className="text-lg tracking-tight text-white">{ch.title}</h3>
                      <p
                        className={`mt-1 text-[9px] tracking-[0.2em] ${
                          !expired ? "text-emerald-400" : "text-rose-500"
                        }`}
                      >
                        {!expired ? "STATUT: ACTIF" : "STATUT: EXPIRÃ‰"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-slate-300">
                      <ArrowRight size={18} />
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VUE 2 : CLASSEMENT DU DÃ‰FI SELECTIONNÃ‰ ---
  return (
    <div className="min-h-screen bg-[#020617] p-4 text-white sm:p-6 font-black italic uppercase pb-32">
      <div className="mx-auto max-w-md">
        <div className="mb-6 mt-2 flex items-center justify-between">
          <button
            onClick={() => router.push("/client/rank")}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-90"
            aria-label="Retour Ã  la liste des classements"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[8px] tracking-[0.3em] text-emerald-400">DATA_STREAM_SYNC</p>
            <h2 className="text-xs text-slate-200">{activeChallenge?.title || "Chargement..."}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Star size={18} className="animate-pulse" />
          </div>
        </div>

        {/* STATISTIQUES DU DÃ‰FI */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-[2rem] bg-emerald-500 p-5 text-slate-950 shadow-lg">
            <p className="text-[8px] opacity-80 mb-1">TEMPS RESTANT</p>
            <p className="text-base font-black flex items-center gap-1.5">
              <Timer size={16} /> {timeLeft || "--H --M"}
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-5">
            <p className="text-[8px] text-slate-500 mb-1">SCORE CUMULÃ‰</p>
            <p className="text-base text-emerald-400 flex items-center gap-1.5 font-black">
              <TrendingUp size={16} /> {currentUserRank?.total_score || 0}
            </p>
          </div>
        </div>

        {/* CARTE POSITION UTILISATEUR */}
        {currentUserRank && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mb-6 p-6 rounded-[2.2rem] flex items-center justify-between border-2 ${
              currentUserRank.rank <= 3
                ? "bg-white text-slate-950 border-emerald-400"
                : "bg-slate-900 border-white/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                    currentUserRank.rank <= 3 ? "bg-slate-950 text-emerald-400" : "bg-emerald-500 text-slate-950"
                  }`}
                >
                  #{currentUserRank.rank}
                </div>
                {currentUserRank.rank === 1 && (
                  <Crown size={14} className="absolute -top-2 -right-1 text-amber-500 fill-current" />
                )}
              </div>
              <div>
                <p className="text-[8px] opacity-60 tracking-widest">VOTRE POSITION</p>
                <p className="text-lg tracking-tight">{currentUserRank.username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black">{currentUserRank.total_score}</p>
              <p className="text-[8px] opacity-60">PTS ({currentUserRank.attempts_count} essais)</p>
            </div>
          </motion.div>
        )}

        {/* LISTE DU CLASSEMENT GENERAL */}
        <div className="space-y-2.5">
          {leaderboard.map((entry) => {
            const isMe = entry.user_id === currentUserRank?.user_id;
            return (
              <div
                key={entry.user_id}
                className={`p-4 rounded-[1.5rem] border flex items-center justify-between ${
                  isMe
                    ? "bg-emerald-500/20 border-emerald-500 shadow-lg"
                    : "bg-slate-900/40 border-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      entry.rank === 1 ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <p className={`text-xs tracking-tight ${isMe ? "text-emerald-300" : "text-white"}`}>
                    {entry.username} {isMe && "(VOUS)"}
                  </p>
                </div>
                <p className={`text-sm font-black ${entry.rank <= 3 ? "text-emerald-400" : "text-white"}`}>
                  {entry.total_score}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOUTON D'ACTION FLOTTANT */}
      {activeChallenge && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent z-50">
          <div className="max-w-md mx-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleImproveScore}
              disabled={isExpired}
              className="w-full py-4 bg-white text-slate-950 rounded-[1.8rem] font-black text-lg shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Zap size={20} fill="currentColor" />
              <span>{isExpired ? "MISSION EXPIRÃ‰E" : "AMÃ‰LIORER MON SCORE"}</span>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CONTENEUR PRINCIPAL AVEC SUSPENSE & ADS ---
export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#020617]">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      }
    >
      <RankContent />
    </Suspense>
  );
}

```

## src/app/client/crash/page.tsx
```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ChevronLeft, ShieldCheck, Target, Hammer, Coins, Zap, Trophy, History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// Helper Haptique sÃ©curisÃ©
const triggerHaptic = (pattern: number[] = [8, 20, 8]) => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignorer si bloquÃ© par le navigateur
    }
  }
};

export default function CrashElite() {
  const router = useRouter();
  
  // --- Ã‰TATS ---
  const [bet, setBet] = useState<number>(100); 
  const [jetonsCP, setJetonsCP] = useState<number>(0); 
  const [autoCashout, setAutoCashout] = useState<number>(2.0);
  const [mult, setMult] = useState<number>(1.0); 
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Historique & Stats de session
  const [history, setHistory] = useState<number[]>([1.45, 3.20, 1.12, 5.40, 1.85]);
  const [sessionGains, setSessionGains] = useState<number>(0);

  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintMsg, setMaintMsg] = useState<string>("");

  // REFS TECHNIQUE & SÃ‰CURITÃ‰
  const multRef = useRef<number>(1.0);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const crashAtRef = useRef<number>(1.0);
  const gameBoxRef = useRef<HTMLDivElement>(null);
  
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // --- INITIALISATION ---
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        setUserId(user.id);

        // Charger le profil utilisateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('jetons_cp')
          .eq('id', user.id)
          .single();
          
        if (profile && isMounted) {
          setJetonsCP(Number(profile.jetons_cp) || 0);
        }
        
        // Charger l'Ã©tat de maintenance du jeu
        const { data: setting } = await supabase
          .from('game_settings')
          .select('is_active, maintenance_msg')
          .eq('game_id', 'crash')
          .single();

        if (setting && !setting.is_active && isMounted) {
          setIsMaintenance(true);
          setMaintMsg(setting.maintenance_msg || "Maintenance en cours.");
        }

        // Charger l'historique rÃ©cent
        const { data: recentGames } = await supabase
          .from('crash_games')
          .select('crash_point')
          .eq('status', 'crashed')
          .order('created_at', { ascending: false })
          .limit(6);
        
        if (recentGames && recentGames.length > 0 && isMounted) {
          setHistory(recentGames.map(g => Number(g.crash_point || 1.0)));
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation du jeu:", error);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (gameBoxRef.current) gsap.killTweensOf(gameBoxRef.current);
    };
  }, []);

  // --- ANIMATION DE CRASH ---
  const triggerCrashAnimation = useCallback(() => {
    if (!gameBoxRef.current) return;
    triggerHaptic([30, 50, 30, 50, 100]);
    
    const ctx = gsap.context(() => {
      gsap.to(".game-box", { 
        x: -10, duration: 0.04, repeat: 7, yoyo: true,
        onComplete: () => { gsap.set(".game-box", { x: 0 }); }
      });
      gsap.to(".crash-overlay", { opacity: 0.4, duration: 0.08, yoyo: true, repeat: 3 });
    }, gameBoxRef);

    return () => ctx.revert();
  }, []);

  // --- FONCTION ENCAISSER (CASHOUT) ---
  const collect = useCallback(async (forcedMult?: number) => {
    if (status !== 'running' || !gameId || loading || isProcessingRef.current || !userId) return;
    
    isProcessingRef.current = true;
    setLoading(true);

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    const targetMult = forcedMult ? Number(forcedMult.toFixed(2)) : Number(multRef.current.toFixed(2));

    try {
      // Validation du gain cÃ´tÃ© serveur via RPC
      const { data: result, error: rpcErr } = await supabase.rpc('encaissez_partie_crash', {
        p_game_id: gameId,
        p_user_id: userId,
        p_claimed_multiplier: targetMult
      });

      if (rpcErr || !result?.success) {
        throw new Error(result?.message || "Erreur de validation de l'encaissement.");
      }

      const payout = Number(result.payout);
      const netGain = payout - lockedBetRef.current;

      triggerHaptic([10, 30, 20, 60]);
      setJetonsCP(prev => prev + payout);
      setSessionGains(prev => prev + netGain);
      setStatus('collected');

    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erreur lors du retrait.");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [status, gameId, loading, userId]);

  // --- BOUCLE DU JEU ---
  const gameLoop = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;
    
    // Courbe de multiplicateur exponentielle sÃ©curisÃ©e (dÃ©marre Ã  1.00x)
    const currentMult = Math.max(1.0, Number((1.0 + Math.pow(elapsed / 3, 1.8)).toFixed(2))); 

    if (currentMult >= crashAtRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      
      const finalCrashPoint = crashAtRef.current;
      setMult(finalCrashPoint);
      multRef.current = finalCrashPoint;
      setStatus('crashed');
      triggerCrashAnimation();
      
      setHistory(prev => [finalCrashPoint, ...prev.slice(0, 5)]);

      if (gameId) {
        supabase.from('crash_games').update({ status: 'crashed' }).eq('id', gameId).then();
      }

    } else if (autoCashout >= 1.01 && currentMult >= autoCashout) {
      setMult(autoCashout);
      multRef.current = autoCashout;
      collect(autoCashout); 
    } else {
      multRef.current = currentMult;
      setMult(currentMult);
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, [triggerCrashAnimation, autoCashout, collect, gameId]);

  // --- DÃ‰MARRER UNE PARTIE ---
  const start = async () => {
    if (isMaintenance || !userId || loading || status === 'running') return;
    
    const finalBet = Math.floor(bet);
    if (finalBet > jetonsCP || finalBet < 10) {
      alert("Mise invalide (minimum 10 CP).");
      return;
    }

    triggerHaptic([15, 10]);
    setLoading(true);
    isProcessingRef.current = true;
    setStatus('idle');
    setMult(1.0); 
    multRef.current = 1.0;
    startTimeRef.current = null;

    try {
      lockedBetRef.current = finalBet;

      // Appel RPC sÃ©curisÃ© : prÃ©lÃ¨vement + gÃ©nÃ©ration du crash point cÃ´tÃ© DB
      const { data: res, error: rpcErr } = await supabase.rpc('creer_partie_crash', {
        p_user_id: userId,
        p_bet_amount: finalBet
      });

      if (rpcErr || !res?.success) {
        throw new Error(res?.message || "Erreur d'initialisation de la partie.");
      }

      // Mise Ã  jour du solde local
      setJetonsCP(prev => Math.max(0, prev - finalBet)); 
      
      // Affectation du point de crash calculÃ© par le serveur
      crashAtRef.current = Number(res.crash_point);
      setGameId(res.game_id);
      
      setStatus('running');
      isProcessingRef.current = false;
      setLoading(false);

      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erreur technique au lancement.");
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  // --- RACCOURCIS DE MISE RAPIDE ---
  const handleQuickBet = (action: 'half' | 'double' | 'max' | number) => {
    if (status === 'running') return;
    triggerHaptic([5]);
    if (typeof action === 'number') {
      setBet(action);
    } else if (action === 'half') {
      setBet(prev => Math.max(10, Math.floor(prev / 2)));
    } else if (action === 'double') {
      setBet(prev => Math.min(jetonsCP, prev * 2));
    } else if (action === 'max') {
      setBet(Math.max(10, jetonsCP));
    }
  };

  return (
    <NeonGameShell accent="amber" className="min-h-screen p-4 font-sans select-none">
      <div className="crash-overlay fixed inset-0 bg-rose-600 opacity-0 pointer-events-none z-50 transition-opacity" />

      {/* OVERLAY MAINTENANCE */}
      <AnimatePresence>
        {isMaintenance && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center"
          >
            <div className="max-w-xs space-y-6">
              <div className="w-24 h-24 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                <Hammer className="text-amber-500 animate-bounce" size={40} />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Crash en <span className="text-amber-500">Pause</span></h2>
              <p className="text-slate-400 text-xs font-bold leading-relaxed italic">"{maintMsg}"</p>
              <button 
                onClick={() => router.push('/client/home')} 
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Retour Ã  l'accueil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENTÃŠTE AVEC RETOUR ET SOLDE */}
      <div className="mb-4 flex w-full max-w-lg items-center justify-between mx-auto">
        <button 
          onClick={() => router.push('/client/list')} 
          className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.16)] active:scale-90 transition-all"
        >
          <ChevronLeft size={22} />
        </button>

        {/* INDICATEUR DE STATS SESSION */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
          <Trophy size={14} className="text-amber-400" />
          <span>{sessionGains >= 0 ? `+${sessionGains}` : sessionGains} CP</span>
        </div>
        
        <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <Coins size={16} className="text-amber-300" />
            <span className="font-black tracking-tighter text-amber-200">{Math.floor(jetonsCP).toLocaleString()} CP</span>
        </div>
      </div>

      <main className="w-full max-w-lg space-y-4 mx-auto">
        
        {/* BANDEAU HISTORIQUE DES DERNIERS CRASHS */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-2 bg-slate-950/60 border border-white/5 rounded-2xl no-scrollbar">
          <History size={14} className="text-slate-500 shrink-0 ml-1" />
          <div className="flex items-center gap-1.5">
            {history.map((val, idx) => (
              <span 
                key={idx} 
                className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                  val >= 2.0 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {val.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* ZONE DE JEU (GAME BOX) */}
        <div 
          ref={gameBoxRef} 
          className="game-box relative flex h-80 flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-amber-400/20 bg-slate-950/80 shadow-[0_0_60px_rgba(245,158,11,0.14)]"
        >
          {/* GRILLE DE FOND DYNAMIQUE */}
          <div 
            className="absolute inset-0 opacity-15" 
            style={{ 
              backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)', 
              backgroundSize: '30px 30px' 
            }} 
          />

          {/* ANIMATION DE PROGRESSION */}
          <div className="absolute bottom-4 w-full flex justify-center items-end pointer-events-none">
             <motion.div 
               style={{ height: `${Math.min((mult - 1.0) * 120, 240)}px` }} 
               className="w-2 bg-gradient-to-t from-amber-500 via-emerald-400 to-cyan-300 rounded-t-full relative flex justify-center"
             >
                <div className="absolute -top-3 w-6 h-6 bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_15px_#22d3ee] flex items-center justify-center">
                   <div className="w-2 h-2 bg-white rounded-full" />
                </div>
             </motion.div>
          </div>

          {/* AFFICHAGE DU MULTIPLICATEUR */}
          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-7xl font-black tracking-tighter ${status === 'crashed' ? 'text-rose-500' : 'text-amber-300'}`}>
              <AnimatedCounter value={Number(mult.toFixed(2))} suffix="x" className="text-7xl" accent="amber" />
            </span>
            
            {status === 'running' && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 animate-pulse mt-2">
                <Zap size={12} /> Vol en cours...
              </div>
            )}

            {status === 'crashed' && (
              <div className="text-xs font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mt-2">
                CRASH Ã€ {mult.toFixed(2)}x
              </div>
            )}
          </div>

          {/* OVERLAY DE VICTOIRE */}
          <AnimatePresence>
            {status === 'collected' && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.8, opacity: 0 }}
                className="win-display absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20"
              >
                <div className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">Encaisse RÃ©ussie !</div>
                <div className="bg-gradient-to-r from-emerald-400 to-teal-300 text-black px-8 py-4 rounded-full font-black text-3xl shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                   +{Math.floor(lockedBetRef.current * mult)} CP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PANNEAU DE CONTRÃ”LE ET COMMANDES */}
        <div className="relative z-10 space-y-4 rounded-[2.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          
          {/* INPUTS MISE & AUTO-STOP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Coins size={10} className="text-amber-400" /> Mise (CP)
              </label>
              <input 
                type="number" 
                value={bet} 
                onChange={e => setBet(Math.max(0, Number(e.target.value)))} 
                disabled={status === 'running'} 
                className="w-full bg-black/60 p-3.5 rounded-2xl border border-white/10 outline-none text-lg font-black text-center focus:border-amber-500/50 transition-colors disabled:opacity-50" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Target size={10} className="text-emerald-400" /> Auto-Stop (x)
              </label>
              <input 
                type="number" 
                step="0.1" 
                value={autoCashout} 
                onChange={e => setAutoCashout(Number(e.target.value))} 
                disabled={status === 'running'} 
                className="w-full bg-black/60 p-3.5 rounded-2xl border border-white/10 outline-none text-lg font-black text-center focus:border-emerald-500/50 transition-colors disabled:opacity-50" 
              />
            </div>
          </div>

          {/* BOUTONS DE MISE RAPIDE */}
          {status !== 'running' && (
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <button onClick={() => handleQuickBet(100)} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">100</button>
              <button onClick={() => handleQuickBet(500)} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">500</button>
              <button onClick={() => handleQuickBet('half')} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">1/2</button>
              <button onClick={() => handleQuickBet('double')} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-amber-400 hover:bg-white/10 active:scale-95 transition-all">x2</button>
              <button onClick={() => handleQuickBet('max')} className="py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-[10px] font-black text-amber-300 hover:bg-amber-500/30 active:scale-95 transition-all">MAX</button>
            </div>
          )}

          <ProgressBar 
            value={Math.min(100, ((mult - 1.0) / 3.0) * 100)} 
            max={100} 
            label="Moteur de vol" 
            accent="amber" 
          />

          {/* ACTION BUTTON */}
          {status === 'running' ? (
            <button 
              onClick={() => collect()} 
              disabled={loading || isProcessingRef.current} 
              className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 py-5 text-2xl font-black text-black shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-80"
            >
              {loading ? <Loader2 className="animate-spin" /> : `ENCAISSER @ ${Math.floor(lockedBetRef.current * mult)} CP`}
            </button>
          ) : (
            <button 
              onClick={start} 
              disabled={loading || isMaintenance || bet > jetonsCP || bet < 10} 
              className={`w-full rounded-[2rem] py-5 text-2xl font-black shadow-lg transition-all active:scale-95 ${
                bet > jetonsCP 
                  ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed' 
                  : status === 'crashed' 
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.3)]' 
                  : 'bg-gradient-to-r from-amber-400 to-emerald-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.25)]'
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : bet > jetonsCP ? (
                "SOLDE INSUFFISANT"
              ) : status === 'crashed' ? (
                "REJOUER"
              ) : (
                "LANCER LE VOL"
              )}
            </button>
          )}
        </div>
      </main>
    </NeonGameShell>
  );
}

```

## src/app/client/plinko/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, History as HistoryIcon, AlertTriangle, Coins, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { resolveGameEconomy } from '@/lib/game-economy';
import { NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- CONFIGURATION DU JEU ---
const ROWS = 16;
const PIN_RADIUS = 3;
const BALL_RADIUS = 6;
const PYRAMID_TOP = 60;
const MULTIPLIERS_16 = [1000, 15, 5, 2.5, 1.5, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1.5, 2.5, 5, 15, 1000];

const COLORS = {
  pins: '#475569',
  ball: '#10b981',
  multipliers: (index: number) => {
    const dist = Math.abs(index - ROWS / 2);
    if (dist > 6) return '#ef4444';
    if (dist > 3) return '#f97316';
    return '#f59e0b';
  },
};

interface Ball {
  id: string;
  x: number;
  y: number;
  path: number[];
  currentRow: number;
  progress: number;
  payout: number;
  multiplier: number;
  finalPos: number;
  isProcessed: boolean;
  trail: Array<{ x: number; y: number; life: number }>;
  drift: number;
  bounceSeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

interface VictoryFlash {
  x: number;
  y: number;
  life: number;
  intensity: number;
}

interface RpcJouerResult {
  success: boolean;
  message?: string;
}

// --- HELPER HAPTIQUE SÃ‰CURISÃ‰ ---
const triggerHaptic = () => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([8, 15, 8]);
    } catch {
      // Non supportÃ©
    }
  }
};

// --- SECURE CRYPTO SEED GENERATOR ---
const generateSecurePath = async (rows: number): Promise<{ path: number[]; finalPos: number }> => {
  const path: number[] = [];
  let finalPos = 0;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomBytes = new Uint8Array(rows);
    window.crypto.getRandomValues(randomBytes);
    for (let i = 0; i < rows; i++) {
      const bit = randomBytes[i] % 2;
      path.push(bit);
      finalPos += bit;
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const bit = Math.random() < 0.5 ? 0 : 1;
      path.push(bit);
      finalPos += bit;
    }
  }

  return { path, finalPos };
};

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Ã‰TATS ---
  const [bet, setBet] = useState<number>(100);
  const [jetonsCP, setJetonsCP] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [dropping, setDropping] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // --- REFS POUR ANIMATION ET PHYSIQUE ---
  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const victoryRef = useRef<VictoryFlash | null>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const requestRef = useRef<number | null>(null);
  const popSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const timeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Hydratation et montage
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Chargement profil et maintenance
  useEffect(() => {
    let active = true;

    const initData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user && active) {
          setUserId(authData.user.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('jetons_cp')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (profile && active) {
            setJetonsCP(profile.jetons_cp ?? 0);
          }
        }

        const { data: maintenanceData } = await supabase
          .from('game_settings')
          .select('is_active, maintenance_msg')
          .eq('game_id', 'plinko')
          .maybeSingle();

        if (maintenanceData && !maintenanceData.is_active && active) {
          setIsMaintenance(true);
          setMaintenanceMsg(maintenanceData.maintenance_msg || 'Jeu en maintenance');
        }
      } catch (err) {
        console.error('Erreur initialisation Plinko:', err);
      }
    };

    void initData();

    return () => {
      active = false;
    };
  }, []);

  // Chargement des effets audio de maniÃ¨re sÃ©curisÃ©e
  useEffect(() => {
    if (typeof window !== 'undefined') {
      popSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
      winSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    }
  }, []);

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.05;
      clone.play().catch(() => {});
    } catch {
      // Audio bloquÃ© ou non supportÃ©
    }
  };

  const spawnParticles = (x: number, y: number, color: string, count = 8, spread = 1.4) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = (0.6 + Math.random() * 2.4) * spread;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        life: 1,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  };

  const updateParticles = () => {
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.018;
    });
  };

  const updateBalls = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rowSpacing = (cvs.height - 120) / ROWS;

    for (let i = ballsRef.current.length - 1; i >= 0; i--) {
      const ball = ballsRef.current[i];
      ball.progress += 0.045 + Math.min(0.015, ball.currentRow * 0.0012);

      if (ball.progress >= 1) {
        ball.currentRow += 1;
        ball.progress = 0;

        if (popSound.current && ball.currentRow < ROWS) {
          playSound(popSound.current);
        }

        if (ball.currentRow >= ROWS) {
          if (!ball.isProcessed) {
            ball.isProcessed = true;
            setHistory((prev) => [ball.multiplier, ...prev].slice(0, 8));

            if (ball.payout > 0 && userId) {
              setJetonsCP((prev) => prev + ball.payout);

              if (ball.multiplier >= 2 && winSound.current) {
                winSound.current.currentTime = 0;
                winSound.current.play().catch(() => {});
              }

              // Enregistrement des gains cÃ´tÃ© serveur
              void supabase.rpc('jouer_partie_cp', {
                p_user_id: userId,
                p_mise_cp: 0,
                p_gain_cp: ball.payout,
                p_jeu_nom: `Plinko Win x${ball.multiplier}`,
              });
            }
          }
          ballsRef.current.splice(i, 1);
        }
      } else {
        const pathSum = ball.path.slice(0, ball.currentRow).reduce((a, b) => a + b, 0);
        const nextDir = ball.path[ball.currentRow] ?? 0;
        const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
        const targetPinX = cvs.width / 2 + (pathSum + nextDir - (ball.currentRow + 1) / 2) * rowSpacing;
        const startPinY = PYRAMID_TOP + ball.currentRow * rowSpacing;
        const targetPinY = PYRAMID_TOP + (ball.currentRow + 1) * rowSpacing;
        const eased = 0.5 - 0.5 * Math.cos(ball.progress * Math.PI);
        const arcHeight = Math.sin(ball.progress * Math.PI) * (rowSpacing * 0.2 + Math.sin(ball.currentRow * 0.5 + ball.bounceSeed) * 3.5);
        const reboundX = Math.sin((ball.currentRow + ball.progress) * 1.45 + ball.bounceSeed) * 2.4 + ball.drift;

        ball.x = startPinX + (targetPinX - startPinX) * eased + reboundX;
        ball.y = startPinY + (targetPinY - startPinY) * eased - arcHeight;

        ball.trail.push({ x: ball.x, y: ball.y, life: 1 });
        if (ball.trail.length > 16) ball.trail.shift();

        if (ball.progress > 0.4 && ball.progress < 0.5) {
          spawnParticles(ball.x, ball.y, 'rgba(16,185,129,0.9)', 2, 1.1);
        }
      }
    }

    if (ballsRef.current.length > 0) {
      const activeBall = ballsRef.current[ballsRef.current.length - 1];
      const focusX = (activeBall.x - cvs.width / 2) * 0.06;
      const focusY = (activeBall.y - (PYRAMID_TOP + rowSpacing * 6)) * 0.04;
      cameraRef.current.x += (focusX - cameraRef.current.x) * 0.08;
      cameraRef.current.y += (focusY - cameraRef.current.y) * 0.08;
      cameraRef.current.zoom = 1 + Math.min(0.04, ballsRef.current.length * 0.003);
    } else {
      cameraRef.current.x += (0 - cameraRef.current.x) * 0.08;
      cameraRef.current.y += (0 - cameraRef.current.y) * 0.08;
      cameraRef.current.zoom = 1;
    }
  }, [userId]);

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;
    const offsetX = cameraRef.current.x;
    const offsetY = cameraRef.current.y;

    const gradient = ctx.createLinearGradient(0, 0, 0, cvs.height);
    gradient.addColorStop(0, '#050816');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.save();
    ctx.translate(offsetX * 0.3, offsetY * 0.15);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(cvs.width / 2 + 30, PYRAMID_TOP + 140, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = COLORS.pins;
    for (let r = 0; r <= ROWS; r++) {
      for (let i = 0; i <= r; i++) {
        const x = cvs.width / 2 + offsetX + (i - r / 2) * rowSpacing;
        const y = PYRAMID_TOP + offsetY + r * rowSpacing;
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    particlesRef.current.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x + offsetX * 0.2, p.y + offsetY * 0.15, p.size * (0.4 + p.life * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const bucketY = PYRAMID_TOP + ROWS * rowSpacing + 25 + offsetY * 0.05;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + offsetX + (i - ROWS / 2) * rowSpacing;
      const w = rowSpacing - 4;
      const pulse = 0.7 + 0.3 * Math.sin(timeRef.current * 2.4 + i * 0.5);
      const glow = 4 + pulse * 5;
      ctx.save();
      ctx.shadowBlur = glow;
      ctx.shadowColor = COLORS.multipliers(i);
      ctx.fillStyle = COLORS.multipliers(i);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, bucketY, w, 25 + pulse * 3, 6);
      else ctx.rect(x - w / 2, bucketY, w, 25 + pulse * 3);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(m < 1 ? m.toString() : m.toFixed(0) + 'x', x, bucketY + 16);
    });

    ballsRef.current.forEach((b) => {
      if (b.trail.length > 1) {
        ctx.beginPath();
        b.trail.forEach((point, index) => {
          const alpha = (index + 1) / b.trail.length;
          ctx.strokeStyle = `rgba(16,185,129,${0.18 * alpha})`;
          ctx.lineWidth = 1.3 + alpha * 1.3;
          if (index === 0) {
            ctx.moveTo(point.x + offsetX * 0.1, point.y + offsetY * 0.05);
          } else {
            ctx.lineTo(point.x + offsetX * 0.1, point.y + offsetY * 0.05);
          }
        });
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(b.x + offsetX * 0.1, b.y + offsetY * 0.05, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#34d399';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (victoryRef.current) {
      victoryRef.current.life -= 0.024;
      const radius = 24 + (1 - victoryRef.current.life) * 42;
      ctx.strokeStyle = `rgba(250,204,21,${Math.max(0, victoryRef.current.life)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(victoryRef.current.x + offsetX * 0.1, victoryRef.current.y + offsetY * 0.05, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (victoryRef.current.life <= 0) victoryRef.current = null;
    }
  }, []);

  // Loop d'animation unique et sÃ©curisÃ©e
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      timeRef.current += 1 / 60;
      updateParticles();
      updateBalls();
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [draw, updateBalls]);

  const dropBall = async () => {
    const currentBet = Math.floor(bet);
    if (!userId || currentBet > jetonsCP || currentBet < 10 || isMaintenance || dropping || isProcessingRef.current) return;
    
    triggerHaptic();
    isProcessingRef.current = true;
    setDropping(true);

    try {
      // RÃ©servation et dÃ©duction de la mise via la RPC Supabase
      const { data, error } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: userId,
        p_mise_cp: currentBet,
        p_gain_cp: 0,
        p_jeu_nom: 'Plinko Bet',
      });

      const result = data as RpcJouerResult | null;

      if (error || !result?.success) {
        alert('Solde insuffisant ou erreur de transaction.');
        return;
      }

      setJetonsCP((prev) => prev - currentBet);

      // GÃ©nÃ©ration de la trajectoire sÃ©curisÃ©e cryptographiquement
      const { path, finalPos } = await generateSecurePath(ROWS);
      
      const economy = resolveGameEconomy({
        gameId: 'plinko',
        bet: currentBet,
        finalPos,
        multiplier: MULTIPLIERS_16[finalPos] ?? 0.1,
        difficulty: 'intermÃ©diaire',
        bonusMultiplier: 1,
        jackpotMultiplier: 1,
        specialEventMultiplier: 1,
      });

      const cvs = canvasRef.current;
      if (cvs) {
        const newBall: Ball = {
          id: Math.random().toString(36).slice(2, 11),
          x: cvs.width / 2,
          y: PYRAMID_TOP - 20,
          path,
          currentRow: 0,
          progress: 0,
          payout: economy.payout,
          multiplier: economy.multiplier,
          finalPos,
          isProcessed: false,
          trail: [],
          drift: (Math.random() - 0.5) * 2.2,
          bounceSeed: Math.random() * Math.PI * 2,
        };
        ballsRef.current.push(newBall);
      }
    } catch (e) {
      console.error('Erreur lancement bille:', e);
    } finally {
      isProcessingRef.current = false;
      setTimeout(() => setDropping(false), 200);
    }
  };

  if (!isMounted) return null;

  return (
    <NeonGameShell accent="emerald" className="min-h-screen flex flex-col font-black uppercase italic overflow-x-hidden">
      {isMaintenance && (
        <div className="absolute inset-0 z-[100] backdrop-blur-md bg-black/80 flex items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-[2.5rem] border-2 border-amber-500/50 bg-[#151c2c] p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <AlertTriangle size={40} className="mx-auto mb-6 text-amber-500" />
            <h2 className="mb-2 text-2xl text-amber-500">MAINTENANCE</h2>
            <p className="mb-8 text-sm lowercase text-slate-400">{maintenanceMsg || 'Jeu indisponible.'}</p>
            <button onClick={() => router.push('/client/list')} className="w-full rounded-2xl border border-white/10 bg-white/5 py-4">
              RETOUR
            </button>
          </div>
        </div>
      )}

      {/* BARRE DE NAVIGATION SUPÃ‰RIEURE */}
      <div className="z-20 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-4 shadow-xl backdrop-blur-xl">
        <button 
          onClick={() => router.push('/client/list')} 
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-200 active:scale-90 transition-transform"
          aria-label="Retour"
        >
          <ChevronLeft />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
          <Coins size={16} className="text-emerald-300" />
          <span className="text-xl tracking-tighter text-emerald-200">
            {Math.floor(jetonsCP).toLocaleString()} <span className="text-[10px] text-slate-400">CP</span>
          </span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* PANNEAU DE COMMANDE */}
        <div className="z-20 space-y-6 border-r border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl lg:w-80">
          <div className="space-y-2">
            <span className="text-[10px] tracking-widest text-slate-400">MONTANT MISE (CP)</span>
            <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#0a0f1a] shadow-inner">
              <input
                type="number"
                value={bet}
                min={10}
                onChange={(e) => setBet(Math.max(10, Math.floor(Number(e.target.value) || 10)))}
                className="w-full bg-transparent p-4 text-lg font-bold text-emerald-500 outline-none"
              />
              <button 
                onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))} 
                className="border-l border-white/5 px-4 text-xs font-bold text-slate-400 transition-colors hover:bg-white/5"
              >
                /2
              </button>
              <button 
                onClick={() => setBet((b) => b * 2)} 
                className="border-l border-white/5 px-4 text-xs font-bold text-slate-400 transition-colors hover:bg-white/5"
              >
                x2
              </button>
            </div>
          </div>

          <button
            onClick={dropBall}
            disabled={isMaintenance || bet > jetonsCP || dropping}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-6 text-xl font-black shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all active:scale-95 ${
              isMaintenance || bet > jetonsCP
                ? 'cursor-not-allowed bg-slate-700 text-slate-500'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black'
            }`}
          >
            {dropping ? <Loader2 className="animate-spin" /> : bet > jetonsCP ? 'SOLDE BAS' : 'LÃ‚CHER'}
          </button>

          <ProgressBar value={Math.min(100, (history.length / 8) * 100)} max={100} label="ChaÃ®ne de chute" accent="emerald" />

          {/* HISTORIQUE */}
          <div className="border-t border-white/5 pt-6">
            <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
              <HistoryIcon size={14} /> Historique
            </div>
            <div className="grid grid-cols-4 gap-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-lg border py-2 text-center text-[10px] font-bold transition-all animate-in zoom-in ${
                    h >= 10
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                      : h >= 2
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                        : 'border-white/10 bg-slate-800 text-slate-400'
                  }`}
                >
                  {h}x
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CANVAS & ADS */}
        <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-[#0a0f1a] p-4">
          <div className="flex w-full flex-1 items-center justify-center">
            <canvas 
              ref={canvasRef} 
              width={700} 
              height={600} 
              className="pointer-events-none h-auto w-full max-w-[600px] drop-shadow-[0_0_50px_rgba(16,185,129,0.1)]" 
            />
          </div>

        </div>
      </div>
    </NeonGameShell>
  );
}

```

## src/app/client/squidglass/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, 
  XCircle, 
  Trophy, 
  Play, 
  Volume2, 
  VolumeX, 
  Hammer, 
  Coins, 
  Sparkles,
  Zap,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter, NeonGameShell } from '@/components/game/NeonGameShell';

// --- TYPES ---
interface Coords {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

interface FogParticle {
  x: number;
  y: number;
  vy: number;
  alpha: number;
  size: number;
}

type GameDifficulty = 'facile' | 'intermediaire' | 'difficile';

const CONFIG: Record<GameDifficulty, { rows: number; cols: number; step: number; label: string }> = {
  facile: { rows: 5, cols: 2, step: 0.3, label: 'Facile' },
  intermediaire: { rows: 7, cols: 2, step: 0.5, label: 'Moyen' },
  difficile: { rows: 9, cols: 3, step: 0.8, label: 'Hard' }
};

const SOUNDS = {
  theme: "https://assets.mixkit.co/active_storage/sfx/2324/2324-preview.mp3",
  jump: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  break: "https://assets.mixkit.co/active_storage/sfx/1126/1126-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  doll: "https://www.myinstants.com/media/sounds/squid-game-red-light-green-light-sound.mp3"
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([15, 20, 15]);
  }
};

export default function GlassEliteFinal() {
  const [status, setStatus] = useState<'intro' | 'walking_in' | 'idle' | 'playing' | 'won' | 'lost' | 'loading' | 'maintenance'>('intro');
  const [maintenanceMsg, setMaintenanceMsg] = useState('SERVICE MOMENTANÃ‰MENT INDISPONIBLE');
  
  const [difficulty, setDifficulty] = useState<GameDifficulty>('intermediaire');
  const [bet, setBet] = useState(10);
  const [jetonsCP, setJetonsCP] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [lastWinAmount, setLastWinAmount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, jumpT: 1, walkY: 0, walkCycle: 0 });
  const requestRef = useRef<number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const shardsRef = useRef<GlassShard[]>([]);
  const shakeRef = useRef({ intensity: 0, timer: 0 });

  // ðŸ”’ REFS DE SÃ‰CURITÃ‰
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(lockedBetRef.current * currentMult);

  // --- INITIALISATION DU JEU ET DU COMPTE ---
  const init = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from('profiles').select('jetons_cp').eq('id', user.id).single();
        if (data) setJetonsCP(data.jetons_cp);
      }

      const { data } = await supabase
        .from('game_settings')
        .select('is_active, maintenance_msg')
        .eq('game_id', 'glass')
        .single();

      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg || 'SERVICE MOMENTANÃ‰MENT INDISPONIBLE');
        setStatus('maintenance');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      audioRefs.current[key] = new Audio(url);
    });

    init().then((isMaintained) => {
      if (!isMaintained) {
        const introTimer = setTimeout(() => setStatus('walking_in'), 2000);
        return () => clearTimeout(introTimer);
      }
    });
  }, [init]);

  // --- GESTION DU TIMER DE JEU ---
  useEffect(() => {
    let timer: number | undefined;
    if (status === 'playing') {
      setCountdown(10);
      timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(10);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, history]);

  const handleTimeOut = async () => {
    if (status !== 'playing' || isProcessingRef.current) return;
    isProcessingRef.current = true;
    playSound('break');
    setStatus('lost');
    
    if (gameId) {
      try {
        await supabase.rpc('fail_glass_game', { p_game_id: gameId });
      } catch (err) {
        console.error("Erreur d'abandon sur dÃ©lai expirÃ©:", err);
      }
    }
    isProcessingRef.current = false;
  };

  // --- AUDIO CONTROL ---
  useEffect(() => {
    const theme = audioRefs.current.theme;
    if (status === 'playing' && !muted && theme) {
      theme.loop = true;
      theme.currentTime = 0;
      theme.volume = 0.2;
      theme.play().catch(() => {});
    } else if (theme) {
      theme.pause();
      theme.currentTime = 0;
    }
  }, [status, muted]);

  const playSound = (key: keyof typeof SOUNDS) => {
    if (muted) return;
    const s = audioRefs.current[key]?.cloneNode() as HTMLAudioElement;
    if (s) {
      s.volume = 0.4;
      s.play().catch(() => {});
    }
  };

  // --- COORDONNÃ‰ES DE DESSIN SUR CANVAS ---
  const getCoords = useCallback((row: number, col: number): Coords => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0, w: 0, h: 0 };
    const maxCols = CONFIG[difficulty].cols;
    const maxRows = CONFIG[difficulty].rows;
    
    const TILE_W = Math.min(cvs.width / (maxCols + 1.2), 75);
    const TILE_H = 38;
    const TILE_GAP = 14;
    const centerX = cvs.width / 2;
    const totalHeight = (maxRows + 1) * (TILE_H + TILE_GAP);
    const startY = (cvs.height / 2) + (totalHeight / 2) - 30;

    return {
      x: centerX + (col - (maxCols - 1) / 2) * (TILE_W + TILE_GAP),
      y: startY - row * (TILE_H + TILE_GAP),
      w: TILE_W,
      h: TILE_H
    };
  }, [difficulty]);

  const syncAvatar = useCallback(() => {
    const coords = getCoords(history.length, history[history.length - 1] ?? 0.5);
    avatarPos.current = {
      ...avatarPos.current,
      x: coords.x,
      y: coords.y,
      targetX: coords.x,
      targetY: coords.y,
      jumpT: 1
    };
  }, [history, getCoords]);

  // --- RENDER ENGINE & RAF ---
  const updateLogic = () => {
    const p = avatarPos.current;
    const cvs = canvasRef.current;
    
    if (status === 'walking_in' && cvs) {
      const startPos = getCoords(0, 0.5);
      if (p.walkY === 0) p.walkY = cvs.height + 40;
      if (p.walkY > startPos.y) {
        p.walkY -= 3.5;
        p.walkCycle += 0.25;
        p.x = startPos.x;
        p.y = p.walkY;
      } else {
        setStatus('idle');
        p.walkCycle = 0;
        p.y = startPos.y;
      }
    }

    if (status === 'playing' && p.jumpT < 1) {
      p.jumpT += 0.06;
      if (p.jumpT > 1) p.jumpT = 1;
      p.x += (p.targetX - p.x) * 0.25;
      p.y += (p.targetY - p.y) * 0.25;
    }

    // Mise Ã  jour des secousses
    if (shakeRef.current.timer > 0) {
      shakeRef.current.timer--;
      if (shakeRef.current.timer === 0) shakeRef.current.intensity = 0;
    }

    // Mise Ã  jour des particules
    shardsRef.current.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.2; // GravitÃ©
      s.life -= 0.02;
      s.rotation += s.rotationSpeed;
    });
    shardsRef.current = shardsRef.current.filter(s => s.life > 0);
  };

  const spawnGlassShards = (x: number, y: number) => {
    for (let i = 0; i < 22; i++) {
      shardsRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5,
        life: 1,
        size: 3 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: i % 2 === 0 ? '#fb7185' : '#38bdf8',
      });
    }
    shakeRef.current.intensity = 12;
    shakeRef.current.timer = 10;
  };

  const draw = () => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const shakeX = (Math.random() - 0.5) * shakeRef.current.intensity;
    const shakeY = (Math.random() - 0.5) * shakeRef.current.intensity;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background Gradient
    const bg = ctx.createRadialGradient(cvs.width / 2, cvs.height / 2, 40, cvs.width / 2, cvs.height / 2, 450);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.6, '#090d16');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Glass tiles
    if (!['intro', 'maintenance'].includes(status)) {
      const activeRows = CONFIG[difficulty].rows;
      const activeCols = CONFIG[difficulty].cols;

      for (let r = 0; r <= activeRows; r++) {
        for (let c = 0; c < activeCols; c++) {
          const { x, y, w, h } = getCoords(r, c);
          const isPassed = history.length > r - 1 && history[r - 1] === c && r > 0;
          const isTargetRow = history.length === r - 1 && status === 'playing' && r > 0;

          const fillGradient = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
          if (isPassed) {
            fillGradient.addColorStop(0, '#10b981');
            fillGradient.addColorStop(1, '#059669');
          } else if (isTargetRow) {
            fillGradient.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
            fillGradient.addColorStop(1, 'rgba(217, 70, 239, 0.2)');
          } else {
            fillGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            fillGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
          }

          ctx.fillStyle = fillGradient;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
          else ctx.rect(x - w / 2, y - h / 2, w, h);
          ctx.fill();

          ctx.strokeStyle = isTargetRow ? '#f43f5e' : 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = isTargetRow ? 1.8 : 1;
          ctx.stroke();
        }
      }
    }

    // Shards
    shardsRef.current.forEach((s) => {
      if (s.life <= 0) return;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size / 2);
      ctx.restore();
    });

    // Avatar
    if (['walking_in', 'playing', 'idle'].includes(status)) {
      const { x, y, jumpT, walkCycle } = avatarPos.current;
      let drawY = y;
      
      if (status === 'playing') {
        drawY = y - Math.sin(jumpT * Math.PI) * 40;
      } else if (status === 'walking_in') {
        drawY = y + Math.abs(Math.sin(walkCycle)) * 4;
      }

      ctx.save();
      ctx.translate(x, drawY);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, y - drawY + 10, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-10, -16, 20, 20, 5); else ctx.rect(-10, -16, 20, 20);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, -22, 7, 0, Math.PI * 2);
      ctx.fill();

      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('456', 0, -8);

      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
        if (status === 'playing') syncAvatar();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = () => {
      draw();
      updateLogic();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, history, difficulty, syncAvatar]);

  // --- LOGIQUE CLIENT-SERVEUR SÃ‰CURISÃ‰E ---
  const handleJump = async (colIndex: number) => {
    if (status !== 'playing' || avatarPos.current.jumpT < 1 || isProcessingRef.current || !gameId) return;
    isProcessingRef.current = true;
    triggerHaptic();

    playSound('jump');
    const nextRow = history.length;
    const target = getCoords(nextRow + 1, colIndex);
    
    avatarPos.current.targetX = target.x;
    avatarPos.current.targetY = target.y;
    avatarPos.current.jumpT = 0;
    
    try {
      // ðŸ”’ SÃ‰CURITÃ‰ : La validation du mouvement se fait intÃ©gralement cÃ´tÃ© serveur
      const { data, error } = await supabase.rpc('step_glass_bridge', {
        p_game_id: gameId,
        p_step_col: colIndex
      });

      if (error) throw error;

      setTimeout(async () => {
        if (data.is_correct) {
          const newHistory = [...history, colIndex];
          setHistory(newHistory);

          if (data.is_completed) {
            setLastWinAmount(data.win_amount);
            setJetonsCP(prev => prev + data.win_amount);
            playSound('win');
            spawnGlassShards(canvasRef.current ? canvasRef.current.width / 2 : 200, 120);
            setStatus('won');
          }
        } else {
          playSound('break');
          spawnGlassShards(target.x, target.y);
          setStatus('lost');
        }
        isProcessingRef.current = false;
      }, 400);

    } catch (err) {
      console.error("Erreur lors du saut:", err);
      setStatus('lost');
      isProcessingRef.current = false;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (status !== 'playing' || isProcessingRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    for (let c = 0; c < CONFIG[difficulty].cols; c++) {
      const coords = getCoords(history.length + 1, c);
      if (clickX >= coords.x - (coords.w * 0.6) && clickX <= coords.x + (coords.w * 0.6)) {
        handleJump(c);
        break;
      }
    }
  };

  const startGame = async () => {
    if (isProcessingRef.current || !userId) return;
    triggerHaptic();
    
    const isMaintained = await init();
    if (isMaintained) return;
    
    const finalBet = Math.floor(bet);
    if (finalBet < 10 || finalBet > jetonsCP) return;

    isProcessingRef.current = true;
    playSound('doll');
    setStatus('loading');
    
    try {
      lockedBetRef.current = finalBet;

      // ðŸ”’ DÃ©duction du solde & CrÃ©ation de session sur RPC
      const { data, error } = await supabase.rpc('start_glass_game_secure', {
        p_bet: finalBet, 
        p_diff: difficulty
      });

      if (error || !data.success) {
        setStatus('idle');
        isProcessingRef.current = false;
        return;
      }

      setJetonsCP(prev => prev - finalBet);
      setGameId(data.game_id);
      setHistory([]);
      setStatus('playing');
      syncAvatar();
      
    } catch (err) {
      console.error("Erreur d'initialisation de partie:", err);
      setStatus('idle');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const cashout = async () => {
    if (isProcessingRef.current || !gameId || history.length === 0) return;
    isProcessingRef.current = true;

    setStatus('loading');

    try {
      // ðŸ”’ Demande d'encaissement direct gÃ©rÃ©e par RPC Supabase
      const { data, error } = await supabase.rpc('claim_glass_win_secure', {
        p_game_id: gameId
      });

      if (error || !data.success) throw new Error("Ã‰chec du cashout");

      playSound('win');
      setLastWinAmount(data.win_amount);
      setJetonsCP(prev => prev + data.win_amount);
      spawnGlassShards(canvasRef.current ? canvasRef.current.width / 2 : 200, 120);
      setStatus('won');
    } catch (err) {
      console.error("Erreur cashout:", err);
      setStatus('playing');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const adjustBet = (multiplier: number) => {
    setBet(prev => Math.min(jetonsCP, Math.max(10, Math.floor(prev * multiplier))));
  };

  return (
    <NeonGameShell accent="rose" className="flex h-dvh flex-col font-black italic uppercase overflow-hidden select-none">
      
      {/* MAINTENANCE OVERLAY */}
      <AnimatePresence>
        {status === 'maintenance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] bg-[#020617] flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center border-2 border-rose-500 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <Hammer className="text-rose-500" size={40} />
            </motion.div>
            <h1 className="text-4xl tracking-tighter mb-2">MODE <span className="text-rose-500">MAINTENANCE</span></h1>
            <p className="text-sm text-white/40 font-bold max-w-xs">{maintenanceMsg}</p>
            <button onClick={() => window.history.back()} className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 transition-all active:scale-95">
              <ChevronLeft size={20}/> RETOUR
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTRO SCREEN */}
      <AnimatePresence>
        {status === 'intro' && (
          <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
            <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl text-rose-500 mb-4 tracking-tighter flex items-center gap-2">
              <Sparkles size={36} /> ELITE #456
            </motion.h1>
            <div className="w-48 h-1 bg-white/10 overflow-hidden rounded-full">
              <motion.div initial={{ x: -200 }} animate={{ x: 200 }} transition={{ repeat: Infinity, duration: 1 }} className="w-full h-full bg-rose-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER DE NAVIGATION & SOLDE */}
      <div className="z-50 flex h-16 flex-none items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-xl">
        <button onClick={() => window.history.back()} className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-2.5 text-rose-200 active:scale-95 transition-transform">
          <ChevronLeft size={20}/>
        </button>
        <span className="text-lg tracking-tight uppercase font-extrabold flex items-center gap-2">
          GLASS <span className="text-rose-500">BRIDGE</span>
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(!muted)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/60">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3.5 py-1.5 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <Coins size={15} className="text-rose-400" />
            <span className="text-sm font-black text-rose-200">{Math.floor(jetonsCP).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* CANVAS CENTRAL */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)]">
        <canvas ref={canvasRef} className="w-full h-full touch-none cursor-pointer" onClick={handleCanvasClick} />

        {/* TIMER DE JEU */}
        {status === 'playing' && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-rose-400/30 bg-black/60 px-4 py-2 text-[10px] tracking-[0.25em] text-rose-200 backdrop-blur-md flex items-center gap-2 shadow-lg">
            TEMPS RESTANT <span className="text-lg font-black text-rose-400">{countdown}s</span>
          </div>
        )}

        {/* PANNEAU DE MISE & DE CONFIGURATION */}
        {status === 'idle' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm space-y-5 rounded-[2rem] border border-rose-400/30 bg-slate-950/80 p-6 shadow-[0_0_50px_rgba(244,63,94,0.2)]">
              
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 tracking-widest text-center">DIFFICULTÃ‰ DU PONT</p>
                <div className="flex bg-black/50 p-1.5 rounded-2xl gap-1 border border-white/5">
                  {(Object.keys(CONFIG) as GameDifficulty[]).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2.5 text-[10px] rounded-xl transition-all ${difficulty === d ? 'bg-rose-500 text-black font-black shadow-lg shadow-rose-500/25' : 'text-white/40 hover:text-white'}`}>
                      {CONFIG[d].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-[10px] text-white/40 tracking-widest">VOTRE MISE (CP)</p>
                <input 
                  type="number" 
                  value={bet} 
                  onChange={e => setBet(Math.max(0, Number(e.target.value)))} 
                  className="w-full bg-transparent text-5xl text-center outline-none text-rose-500 font-black tracking-tight" 
                />
                
                {/* Raccourcis de mise */}
                <div className="flex gap-2 justify-center pt-2">
                  <button onClick={() => adjustBet(0.5)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 active:scale-95">1/2</button>
                  <button onClick={() => adjustBet(2)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 active:scale-95">x2</button>
                  <button onClick={() => setBet(prev => prev + 100)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 active:scale-95">+100</button>
                  <button onClick={() => setBet(jetonsCP)} className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-300 active:scale-95">MAX</button>
                </div>
              </div>

              <button onClick={startGame} disabled={isProcessingRef.current || bet < 10 || bet > jetonsCP} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 py-4 text-lg font-black text-black shadow-lg shadow-rose-500/30 transition-transform active:scale-95 disabled:opacity-30">
                <Play fill="black" size={18} /> LANCER LA PARTIE
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* BOUTONS DIRECTIONNELS & CASHOUT */}
      {status === 'playing' && (
        <div className="z-50 flex flex-col gap-2 border-t border-white/10 bg-slate-950/90 p-4 backdrop-blur-xl">
          
          {/* Boutons de choix de colonne */}
          <div className="flex gap-2 w-full">
            {Array.from({ length: CONFIG[difficulty].cols }).map((_, colIdx) => (
              <button
                key={colIdx}
                onClick={() => handleJump(colIdx)}
                disabled={avatarPos.current.jumpT < 1 || isProcessingRef.current}
                className="flex-1 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 active:bg-rose-500/30 transition-all disabled:opacity-20"
              >
                <ArrowUp size={14} /> TUILE {colIdx + 1}
              </button>
            ))}
          </div>

          <div className="flex h-16 gap-3 items-center">
            <div className="flex flex-1 flex-col justify-center rounded-2xl border border-white/10 bg-black/40 px-5 h-full">
              <span className="text-[9px] tracking-widest text-white/40">GAIN POTENTIEL</span>
              <span className="text-xl text-rose-400 font-black">
                <AnimatedCounter value={currentWin} /> <span className="text-xs text-white/40">CP</span>
              </span>
            </div>
            <button 
              onClick={cashout} 
              disabled={history.length === 0 || isProcessingRef.current} 
              className="flex-[1.5] h-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-lg font-black text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
            >
              <Zap size={18} fill="black" /> ENCAISSER
            </button>
          </div>
        </div>
      )}

      {/* MODAL VICTOIRE / DÃ‰FAITE */}
      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="space-y-6 text-center w-full max-w-sm">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto border-4 shadow-2xl ${status === 'won' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/20' : 'border-rose-500 text-rose-500 bg-rose-500/10 shadow-rose-500/20'}`}>
                {status === 'won' ? <Trophy size={48} /> : <XCircle size={48} />}
              </div>
              <div>
                <h2 className="text-5xl italic tracking-tighter font-black">{status === 'won' ? 'VICTOIRE !' : 'Ã‰LIMINÃ‰'}</h2>
                <p className="text-2xl mt-2 font-bold text-white/70">{status === 'won' ? `+${lastWinAmount} CP` : 'MISE PERDUE'}</p>
              </div>
              <button onClick={() => setStatus('idle')} className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-xl">
                REJOUER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

```

## src/app/client/market/page.tsx
```tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Coins,
  Gem,
  Sparkles,
  ShoppingBag,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Bug,
  CheckCircle2,
  XCircle,
  Info,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES TYPESCRIPT STRICTS ---
export type Profile = {
  id: string;
  username: string | null;
  jetons_cp: number;
  diamonds: number;
  role?: string | null;
};

export type BoutiquePack = {
  id: string;
  nom: string;
  jetons_quantite: number;
  prix_htg: number;
  currency_type?: 'HTG' | 'DIAMONDS' | string;
  bonus_star_pourcent?: number | null;
  image_url?: string | null;
  active: boolean;
};

export type BuyWithDiamondsResponse = {
  success: boolean;
  message?: string;
  new_balance_cp?: number;
  new_balance_diamonds?: number;
};

export type BuyWithHtgResponse = {
  success: boolean;
  message?: string;
  redirect_url?: string;
  new_balance_cp?: number;
};

type DebugInfo = {
  sessionExists: boolean;
  userId: string | null;
  profileError: string | null;
  packsError: string | null;
  packsCount: number;
  userRole?: string | null;
};

// Type pour la gestion des notifications Toast
type ToastNotification = {
  message: string;
  type: 'success' | 'error' | 'info';
} | null;

export default function MarketPage() {
  // --- Ã‰TATS DE GESTION ---
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [packs, setPacks] = useState<BoutiquePack[]>([]);
  
  const [loadingPacks, setLoadingPacks] = useState<boolean>(true);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [buying, setBuying] = useState<string | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'htg' | 'diamonds'>('htg');

  // Ã‰tat pour remplacer les alert() par des Toasts
  const [toast, setToast] = useState<ToastNotification>(null);
  
  // Ã‰tat Debug
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MARKET === 'true';

  const router = useRouter();

  // Fonction utilitaire pour afficher une notification propre
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // Auto-fermeture du Toast aprÃ¨s 4 secondes
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return "Une erreur inattendue est survenue.";
  };

  // --- REQUÃŠTE ET RECUPÃ‰RATION DES DONNÃ‰ES ---
  const fetchProfileAndPacks = useCallback(async () => {
    setLoadingPacks(true);
    setLoadingProfile(true);
    setErrorMessage(null);

    let currentUserId: string | null = null;
    let hasSession = false;
    let profileErrStr: string | null = null;
    let packsErrStr: string | null = null;
    let fetchedRole: string | null = null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn("[DEBUG MARKET] Erreur rÃ©cupÃ©ration session:", sessionError.message);
      }

      if (session?.user) {
        hasSession = true;
        currentUserId = session.user.id;
        setUserId(currentUserId);
      } else {
        console.warn("[DEBUG MARKET] Aucune session active dÃ©tectÃ©e.");
        setUserId(null);
        setProfile(null);
        setLoadingProfile(false);
      }

      const packsPromise = supabase
        .from('boutique_packs')
        .select('id, nom, jetons_quantite, prix_htg, bonus_star_pourcent, image_url, currency_type, active')
        .eq('active', true)
        .order('prix_htg', { ascending: true });

      const profilePromise = currentUserId
        ? supabase
            .from('profiles')
            .select('id, username, jetons_cp, diamonds, role')
            .eq('id', currentUserId)
            .single()
        : Promise.resolve(null);

      const [packsRes, profileRes] = await Promise.all([packsPromise, profilePromise]);

      if (packsRes.error) {
        packsErrStr = packsRes.error.message;
        console.error("[DEBUG MARKET] Erreur packsRes:", packsRes.error);
        setErrorMessage(`Impossible de charger les packs : ${packsRes.error.message}`);
        setPacks([]);
      } else {
        setPacks(packsRes.data || []);
      }
      setLoadingPacks(false);

      if (currentUserId && profileRes) {
        if (profileRes.error) {
          profileErrStr = profileRes.error.message;
          console.error("[DEBUG MARKET] Erreur profileRes:", profileRes.error);
          setProfile(null);
        } else if (profileRes.data) {
          fetchedRole = profileRes.data.role ?? null;
          setProfile({
            id: profileRes.data.id,
            username: profileRes.data.username ?? null,
            jetons_cp: profileRes.data.jetons_cp ?? 0,
            diamonds: profileRes.data.diamonds ?? 0,
            role: fetchedRole,
          });
        }
        setLoadingProfile(false);
      }

      setDebugInfo({
        sessionExists: hasSession,
        userId: currentUserId,
        profileError: profileErrStr,
        packsError: packsErrStr,
        packsCount: packsRes.data?.length ?? 0,
        userRole: fetchedRole,
      });

    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      console.error("[DEBUG MARKET] Erreur critique lors du fetch:", msg);
      setErrorMessage(msg);
      setLoadingPacks(false);
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndPacks();
  }, [fetchProfileAndPacks]);

  // --- TRAITEMENT DES ACHATS AVEC TOASTS ---
  const handlePurchase = async (pack: BoutiquePack, method: 'htg' | 'diamonds') => {
    if (!userId || buying) {
      if (!userId) showToast("Vous devez Ãªtre connectÃ© pour effectuer un achat.", "info");
      return;
    }

    const packCost = pack.prix_htg;

    // Validations prÃ©alables du solde cÃ´tÃ© client avec Toast
    if (method === 'diamonds') {
      if (profile && profile.diamonds < packCost) {
        showToast("Solde de diamants insuffisant pour effectuer cet achat.", "error");
        return;
      }
    } else {
      if (packCost <= 0) {
        showToast("Le montant de ce pack est invalide.", "error");
        return;
      }
    }

    setBuying(pack.id);

    try {
      if (method === 'diamonds') {
        const { data, error } = await supabase.rpc('buy_with_diamonds', {
          p_user_id: userId,
          p_pack_id: pack.id,
        });

        if (error) {
          console.error("[DEBUG MARKET] Erreur RPC buy_with_diamonds :", error);
          showToast(`Ã‰chec de la transaction (${error.code ?? 'RPC_ERR'}) : ${error.message}`, "error");
        } else {
          const res = data as BuyWithDiamondsResponse | null;
          if (!res?.success) {
            showToast(res?.message || "L'achat a Ã©chouÃ©.", "error");
          } else {
            if (res.new_balance_diamonds !== undefined && res.new_balance_cp !== undefined) {
              setProfile((prev) => prev ? {
                ...prev,
                diamonds: res.new_balance_diamonds!,
                jetons_cp: res.new_balance_cp!
              } : null);
            } else {
              await fetchProfileAndPacks();
            }
            showToast("Achat effectuÃ© avec succÃ¨s !", "success");
          }
        }
      } else {
        const { data, error } = await supabase.rpc('acheter_pack_jetons', {
          p_user_id: userId,
          p_pack_id: pack.id,
        });

        if (error) {
          console.error("[DEBUG MARKET] Erreur RPC acheter_pack_jetons :", error);
          showToast(`Erreur (${error.code ?? 'RPC_ERR'}) : ${error.message}`, "error");
        } else {
          const res = data as BuyWithHtgResponse | null;
          if (res?.success) {
            await fetchProfileAndPacks();
            showToast("Achat validÃ© avec succÃ¨s !", "success");
          } else {
            showToast(res?.message || "Impossible de traiter le paiement HTG.", "error");
          }
        }
      }
    } catch (error: unknown) {
      console.error("[DEBUG MARKET] Erreur inattendue transaction :", getErrorMessage(error));
      showToast("Une erreur inattendue est survenue lors de la transaction.", "error");
    } finally {
      setBuying(null);
    }
  };

  // --- FILTRAGE DES PACKS PAR MONNAIE ---
  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      let normalizedType = 'HTG';

      if (p.currency_type) {
        const upper = p.currency_type.toUpperCase();
        if (upper === 'HTG' || upper === 'DIAMONDS') {
          normalizedType = upper;
        }
      }

      return activeTab === 'htg'
        ? normalizedType === 'HTG'
        : normalizedType === 'DIAMONDS';
    });
  }, [packs, activeTab]);

  const formatAmount = (value: number | string | null | undefined): string => {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString() : '0';
  };

  if (loadingPacks) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_40%),_#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/60 px-8 py-6 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
          <Loader2 className="animate-spin text-emerald-500" size={24} />
          <p className="text-sm text-slate-300">Chargement de la boutiqueâ€¦</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),_#020617] text-white font-sans pb-24 selection:bg-emerald-500/30">
      
      {/* NOTIFICATION TOAST FLOTTANTE */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 z-50 -translate-x-1/2 w-full max-w-md px-4"
          >
            <div
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-emerald-500/40 bg-slate-900/95 text-emerald-300 shadow-emerald-950/50'
                  : toast.type === 'error'
                  ? 'border-red-500/40 bg-slate-900/95 text-red-300 shadow-red-950/50'
                  : 'border-blue-500/40 bg-slate-900/95 text-blue-300 shadow-blue-950/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <XCircle size={20} className="text-red-400 shrink-0" />}
                {toast.type === 'info' && <Info size={20} className="text-blue-400 shrink-0" />}
                <p className="text-xs font-semibold sm:text-sm">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="rounded-lg p-1 transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PANNEAU DEBUG VISIBLE SI NEXT_PUBLIC_DEBUG_MARKET=true */}
      {isDebugMode && debugInfo && (
        <div className="bg-amber-950/90 border-b border-amber-500/30 px-4 py-3 text-xs text-amber-200">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono">
              <Bug size={16} className="text-amber-400" />
              <span><strong>Session:</strong> {debugInfo.sessionExists ? "Oui" : "Non"}</span>
              <span>|</span>
              <span><strong>User ID:</strong> {debugInfo.userId ?? "null"}</span>
              <span>|</span>
              <span><strong>RÃ´le:</strong> {debugInfo.userRole ?? "null"}</span>
              <span>|</span>
              <span><strong>Packs:</strong> {debugInfo.packsCount}</span>
            </div>
            {(debugInfo.profileError || debugInfo.packsError) && (
              <div className="text-red-400 font-mono">
                {debugInfo.profileError && <div>ProfileErr: {debugInfo.profileError}</div>}
                {debugInfo.packsError && <div>PacksErr: {debugInfo.packsError}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRE DE NAVIGATION */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#020617]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-2xl border border-white/10 bg-white/5 p-2.5 transition active:scale-90 hover:bg-white/10"
              aria-label="Retour"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Boutique</p>
              <h1 className="text-lg font-black italic uppercase tracking-tighter">
                Elite <span className="text-emerald-500">Marketplace</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            {loadingProfile ? (
              <Loader2 className="animate-spin text-slate-500 self-center" size={16} />
            ) : (
              <>
                <CurrencyBadge value={profile?.jetons_cp} icon={<Coins size={12} />} color="text-emerald-500" />
                <CurrencyBadge value={profile?.diamonds} icon={<Gem size={12} />} color="text-blue-400" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4">

        {/* INVITATION Ã€ SE CONNECTER */}
        {!userId && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-xs sm:text-sm">
                Vous visitez la boutique en mode invitÃ©. Connectez-vous pour voir vos soldes et acheter des packs.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              Connexion
            </button>
          </div>
        )}

        {/* BLOC D'ERREUR */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle size={16} className="text-red-400" />
              Erreur chargement marketplace
            </div>
            <p className="mt-1 text-xs text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* BANNIÃˆRE VIP */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-emerald-950/40 p-5 shadow-[0_0_70px_rgba(16,185,129,0.08)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_32%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                <Sparkles size={12} />
                Offre premium
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white sm:text-3xl">
                DÃ©bloquez votre prochaine puissance
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Choisissez un pack adaptÃ© Ã  votre rythme de jeu et profitez dâ€™un accÃ¨s plus fluide Ã  la progression.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
              <MiniStat label="Solde CP" value={profile?.jetons_cp} icon={<Coins size={14} />} accent="text-emerald-400" />
              <MiniStat label="Diamants" value={profile?.diamonds} icon={<Gem size={14} />} accent="text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* ONGLETS MONNAIES */}
        <div className="flex flex-wrap gap-2 rounded-[22px] border border-white/10 bg-white/5 p-1.5">
          <TabButton active={activeTab === 'htg'} onClick={() => setActiveTab('htg')} label="Jetons CP" icon={<Coins size={16} />} />
          <TabButton active={activeTab === 'diamonds'} onClick={() => setActiveTab('diamonds')} label="Ã‰change Diamants" icon={<Gem size={16} />} />
        </div>

        {/* LISTE DES PACKS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredPacks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full flex flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-slate-900/40 px-6 py-20 text-center"
              >
                <div className="mb-3 rounded-full border border-white/10 bg-white/5 p-3">
                  <ShoppingBag size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">Aucun pack disponible</h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  Cette catÃ©gorie est temporairement vide. Revenez bientÃ´t pour dÃ©couvrir de nouvelles offres.
                </p>
              </motion.div>
            ) : (
              filteredPacks.map((pack) => {
                const cost = pack.prix_htg;
                const isBuyingThis = buying === pack.id;

                return (
                  <motion.div
                    key={pack.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_45px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-1 ${
                      activeTab === 'diamonds'
                        ? 'border-blue-500/20 bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-900/80 hover:border-blue-500/45'
                        : 'border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-emerald-950/25 hover:border-emerald-500/25'
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 ${
                        activeTab === 'diamonds'
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                          : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                      }`}
                    />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pack premium</p>
                          <h3 className="mt-1 text-lg font-black italic uppercase tracking-wider text-white">{pack.nom}</h3>
                        </div>
                        <div
                          className={`rounded-full border p-2 ${
                            activeTab === 'diamonds'
                              ? 'border-blue-400/20 bg-blue-500/10 text-blue-300'
                              : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          <Zap size={14} />
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                        <p className="text-3xl font-black italic tracking-tighter text-white">
                          {formatAmount(pack.jetons_quantite)}{' '}
                          <span className="text-[10px] font-bold not-italic text-slate-500">CP</span>
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                          <TrendingUp size={14} className={activeTab === 'diamonds' ? 'text-blue-400' : 'text-emerald-400'} />
                          Progression rapide et fluide
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left text-[11px] text-slate-400">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="font-semibold text-white">
                            {formatAmount(cost)} {activeTab === 'diamonds' ? 'ðŸ’Ž' : 'HTG'}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Prix</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="font-semibold text-white">InstantanÃ©</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Livraison</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePurchase(pack, activeTab)}
                        disabled={!!buying || !userId}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                          activeTab === 'diamonds'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-900/25 hover:brightness-110'
                            : 'bg-gradient-to-r from-white to-emerald-300 text-slate-950 shadow-lg shadow-white/10 hover:brightness-105'
                        }`}
                      >
                        {isBuyingThis ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <>
                            {formatAmount(cost)} {activeTab === 'diamonds' ? 'ðŸ’Ž' : 'HTG'}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS DE STRUCTURATION ---
const CurrencyBadge = ({ value, icon, color }: { value?: number; icon: React.ReactNode; color: string }) => (
  <div className={`flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-1.5 ${color}`}>
    <span className="text-[11px] font-black italic">{(value ?? 0).toLocaleString()}</span>
    {icon}
  </div>
);

const TabButton = ({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] px-3 py-3.5 text-[11px] font-black uppercase tracking-[0.25em] transition-all ${
      active ? 'bg-slate-800 text-white shadow-md border border-white/10' : 'text-slate-500 hover:bg-white/5 hover:text-white'
    }`}
  >
    {icon} {label}
  </button>
);

const MiniStat = ({ label, value, icon, accent }: { label: string; value?: number; icon: React.ReactNode; accent: string }) => (
  <div className="rounded-[18px] border border-white/10 bg-slate-950/60 p-3">
    <div className={`mb-2 inline-flex rounded-full border border-white/10 bg-white/5 p-1.5 ${accent}`}>
      {icon}
    </div>
    <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-white">{(value ?? 0).toLocaleString()}</p>
  </div>
);

```

## src/app/client/mines/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp, ShieldAlert, Lock, Clock, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- HELPER HAPTIQUE SÃ‰CURISÃ‰ ---
const triggerHaptic = () => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([10, 25, 10]);
    } catch {
      // Non supportÃ©
    }
  }
};

type DifficultyLevel = 'facile' | 'intermÃ©diaire' | 'difficile';

interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'spark' | 'explosion';
}

interface RpcJouerPartieResult {
  success: boolean;
  message?: string;
}

// --- UTILITAIRES CRYPTOGRAPHIQUES ANTI-TRICHE ---
const generateSessionSalt = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const hashMineIndex = async (index: number, salt: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`mine_${index}_salt_${salt}`);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple si WebCrypto est indisponible
  return `hash_${index}_${salt}`;
};

export default function MinesElite() {
  const router = useRouter();

  // --- Ã‰TATS DU JEU ---
  const [bet, setBet] = useState<number>(100);
  const [jetonsCP, setJetonsCP] = useState<number>(0); 
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermÃ©diaire');
  const [mines, setMines] = useState<number>(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  
  // Masquage crypto des mines
  const [mineHashes, setMineHashes] = useState<string[]>([]);
  const [revealedMinePositions, setRevealedMinePositions] = useState<number[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [userId, setUserId] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [effects, setEffects] = useState<ParticleEffect[]>([]);

  // --- SECONDE CHANCE ---
  const [canUseSecondChance, setCanUseSecondChance] = useState<boolean>(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState<boolean>(false);
  const [adError, setAdError] = useState<string | null>(null);

  // --- SYSTEME & MAINTENANCE ---
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');
  const [checkingSystem, setCheckingSystem] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  // --- REFS CRITIQUES DE SÃ‰CURITÃ‰ & LOGIQUE EN MÃ‰MOIRE FERMÃ‰E ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const rawMinePositionsRef = useRef<number[]>([]);
  const sessionSaltRef = useRef<string>('');
  const lastTickTimeRef = useRef<number>(0);

  // Hydratation
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Synchronisation des mines selon la difficultÃ©
  useEffect(() => {
    const counts: Record<DifficultyLevel, number> = { facile: 5, intermÃ©diaire: 8, difficile: 11 };
    setMines(counts[difficulty]);
  }, [difficulty]);

  // Initialisation et profil
  useEffect(() => {
    let active = true;

    const initSystem = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          if (active) router.push('/connexion');
          return;
        }

        if (active) setUserId(authData.user.id);

        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('jetons_cp')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileErr) console.warn('Erreur chargement profil:', profileErr.message);
        if (active && profileData) {
          setJetonsCP(profileData.jetons_cp ?? 0);
        }

        const { data: settingsData, error: settingsErr } = await supabase
          .from('game_settings')
          .select('is_active, maintenance_msg')
          .eq('game_id', 'mines')
          .maybeSingle();

        if (settingsErr) console.warn('Erreur game_settings:', settingsErr.message);
        if (active && settingsData && settingsData.is_active === false) {
          setIsMaintenance(true);
          setMaintenanceMsg(settingsData.maintenance_msg || 'Maintenance en cours...');
        }

      } catch (err: unknown) {
        if (active) {
          const error = err as Error;
          console.error('Erreur init Mines:', error);
          setInitError(error?.message || 'Erreur lors de la connexion au service.');
        }
      } finally {
        if (active) setCheckingSystem(false);
      }
    };

    void initSystem();

    return () => {
      active = false;
    };
  }, [router]);

  const getMultiplier = useCallback((revealedCount = revealed.length): number => {
    const economy = resolveGameEconomy({
      gameId: 'mines',
      bet: 0,
      revealedCount,
      difficulty,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });
    return economy.multiplier;
  }, [difficulty, revealed.length]);

  const handleGameOver = useCallback(async (isBombHit: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!gameId) {
      isProcessingRef.current = false;
      return;
    }

    const currentMult = getMultiplier();
    const secureBet = lockedBetRef.current;
    const isEligibleForSecondChance = isBombHit && !secondChanceUsed;

    const economy = resolveGameEconomy({
      gameId: 'mines',
      bet: secureBet,
      revealedCount: revealed.length,
      difficulty,
      multiplier: currentMult,
      isBombHit,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });

    const winAmount = isBombHit ? 0 : economy.payout;

    // RÃ©vÃ©ler toutes les positions rÃ©elles des mines Ã  la fin
    setRevealedMinePositions([...rawMinePositionsRef.current]);
    setCombo(0);
    setStatus('ended');
    setCanUseSecondChance(isEligibleForSecondChance);

    try {
      if (winAmount > 0 && userId) {
        const { error: payoutError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: userId,
          p_mise_cp: 0,
          p_gain_cp: winAmount,
          p_jeu_nom: 'Mines Cashout'
        });

        if (payoutError) {
          console.error('Erreur crÃ©dit gains:', payoutError);
        } else {
          setJetonsCP(prev => prev + winAmount);
        }
      }

      await supabase
        .from('mines_games')
        .update({ 
          is_active: false,
          payout: winAmount,
          status: winAmount > 0 ? 'won' : 'lost'
        })
        .eq('id', gameId);

    } catch (error) {
      console.error("Erreur clÃ´ture partie:", error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [difficulty, gameId, getMultiplier, revealed.length, secondChanceUsed, userId]);

  // Timer avec gestion ultra-prÃ©cise
  useEffect(() => {
    if (status !== 'playing') return;

    lastTickTimeRef.current = performance.now();

    const timer = setInterval(() => {
      const now = performance.now();
      const delta = Math.floor((now - lastTickTimeRef.current) / 1000);

      if (delta >= 1) {
        lastTickTimeRef.current = now;
        setTimeLeft(prev => {
          if (prev <= 1) {
            void handleGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 250);

    return () => clearInterval(timer);
  }, [handleGameOver, status]);

  const applySecondChance = useCallback(async () => {
    if (!userId || !gameId || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setLoading(true);

    const extraFee = Math.floor(lockedBetRef.current * 0.5);

    try {
      const { data: ok, error } = await supabase.rpc('jouer_partie_cp', { 
        p_user_id: userId,
        p_mise_cp: extraFee,
        p_gain_cp: 0,
        p_jeu_nom: 'Mines Seconde Chance'
      });

      const rpcResult = ok as RpcJouerPartieResult | null;

      if (error || !rpcResult?.success) {
        throw new Error('Transaction refusÃ©e : solde CP insuffisant.');
      }

      setJetonsCP(prev => prev - extraFee);
      lockedBetRef.current = extraFee;
      setBet(extraFee);

      const salt = generateSessionSalt();
      sessionSaltRef.current = salt;

      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);

      rawMinePositionsRef.current = pos;

      const hashes = await Promise.all(pos.map(p => hashMineIndex(p, salt)));

      await supabase
        .from('mines_games')
        .update({ 
          is_active: true,
          bet_amount: extraFee,
          mine_positions: pos,
          status: 'playing'
        })
        .eq('id', gameId);

      setMineHashes(hashes);
      setRevealedMinePositions([]);
      setRevealed([]);
      setCombo(0);
      setEffects([]);
      setTimeLeft(20);
      setSecondChanceUsed(true);
      setCanUseSecondChance(false);
      setStatus('playing');

    } catch (err: unknown) {
      const error = err as Error;
      setAdError(error?.message || 'Ã‰chec de l\'activation de la seconde chance.');
      setTimeout(() => setAdError(null), 4000);
      setStatus('ended');
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [gameId, mines, userId]);

  const addEffect = (type: 'spark' | 'explosion', index: number) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const x = col * 20 + 10;
    const y = row * 20 + 10;
    const id = Date.now() + Math.random();
    
    setEffects(prev => [...prev, { id, x, y, type }]);
    
    setTimeout(() => {
      if (isMounted) {
        setEffects(prev => prev.filter(effect => effect.id !== id));
      }
    }, 900);
  };

  const start = async () => {
    if (isProcessingRef.current || isMaintenance || !userId || loading) return;
    triggerHaptic();

    const finalBet = Math.floor(bet);
    if (finalBet < 10 || finalBet > jetonsCP) return;

    setLoading(true);
    isProcessingRef.current = true;

    try {
      lockedBetRef.current = finalBet;

      const { data: ok, error } = await supabase.rpc('jouer_partie_cp', { 
        p_user_id: userId,
        p_mise_cp: finalBet,
        p_gain_cp: 0,
        p_jeu_nom: 'Mines Elite'
      });

      const rpcResult = ok as RpcJouerPartieResult | null;

      if (error || !rpcResult?.success) {
        throw new Error(error?.message || 'Fonds insuffisants ou erreur de transaction.');
      }

      setJetonsCP(prev => prev - finalBet);

      const salt = generateSessionSalt();
      sessionSaltRef.current = salt;

      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);

      rawMinePositionsRef.current = pos;

      const hashes = await Promise.all(pos.map(p => hashMineIndex(p, salt)));

      const { data: game, error: gameErr } = await supabase
        .from('mines_games')
        .insert([{
          user_id: userId,
          bet_amount: finalBet,
          mines_count: mines,
          mine_positions: pos,
          difficulty_level: difficulty,
          is_active: true
        }])
        .select()
        .single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMineHashes(hashes);
      setRevealedMinePositions([]);
      setRevealed([]);
      setCombo(0);
      setEffects([]);
      setTimeLeft(20);
      setSecondChanceUsed(false);
      setCanUseSecondChance(false);
      setStatus('playing');

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Start game error:', error);
      setInitError(error?.message || 'Impossible de dÃ©marrer la partie.');
      setTimeout(() => setInitError(null), 4000);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const clickTile = async (i: number) => {
    if (status !== 'playing' || revealed.includes(i) || isProcessingRef.current) return;
    triggerHaptic();

    // VÃ©rification cryptographique de la case
    const tileHash = await hashMineIndex(i, sessionSaltRef.current);
    const isMineHit = mineHashes.includes(tileHash) || rawMinePositionsRef.current.includes(i);

    if (isMineHit) {
      addEffect('explosion', i);
      setCombo(0);
      void handleGameOver(true);
      return;
    }

    addEffect('spark', i);
    setCombo(prev => prev + 1);
    setRevealed(prev => [...prev, i]);
  };

  const handleOpenAdForSecondChance = () => {
    if (isProcessingRef.current || !canUseSecondChance) return;

    const requiredFee = Math.floor(lockedBetRef.current * 0.5);
    if (jetonsCP < requiredFee) {
      setAdError(`Solde insuffisant : ${requiredFee} CP requis (50% de la mise).`);
      setTimeout(() => setAdError(null), 4000);
      return;
    }

    void applySecondChance();
  };

  const cashout = async () => {
    if (status !== 'playing' || revealed.length < 1 || loading) return;
    setLoading(true);
    try {
      await handleGameOver(false);
    } finally {
      setLoading(false);
    }
  };

  const currentMult = getMultiplier();
  const remainingSafe = Math.max(0, 25 - mines - revealed.length);
  const remainingTiles = Math.max(1, 25 - revealed.length);
  const safeProbability = remainingSafe / remainingTiles;
  const riskPercent = Math.min(100, Math.round((mines / remainingTiles) * 100));
  const riskLabel = riskPercent >= 45 ? 'Ã‰levÃ©' : riskPercent >= 25 ? 'Moyen' : 'Faible';

  const premiumIndices = useMemo(() => {
    const indices = Array.from({ length: 25 }, (_, i) => i);
    const baseCount = difficulty === 'facile' ? 4 : difficulty === 'intermÃ©diaire' ? 6 : 8;
    return indices.filter((_, idx) => {
      const seed = (idx + combo + revealed.length + mines) % 7;
      return seed < Math.min(4, baseCount - 2);
    }).slice(0, baseCount);
  }, [combo, difficulty, mines, revealed.length]);

  if (!isMounted || checkingSystem) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
        <Loader2 className="text-violet-500 animate-spin" size={36} />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-4 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="relative z-10 bg-[#0a0a0f] border border-red-500/20 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full">
          <ShieldAlert size={36} className="mx-auto text-red-500 mb-3" />
          <h1 className="text-xl sm:text-2xl text-red-500 mb-2">ERREUR SYSTÃˆME</h1>
          <p className="text-[10px] sm:text-xs text-slate-400 mb-6 italic">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] tracking-widest text-white hover:bg-white/10 transition-colors">
            RÃ‰ESSAYER
          </button>
        </div>
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-4 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="relative z-10 bg-[#0a0a0f] border border-amber-500/20 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full">
          <ShieldAlert size={36} className="mx-auto text-amber-500 mb-3" />
          <h1 className="text-xl sm:text-2xl text-amber-500 mb-2">MAINTENANCE</h1>
          <p className="text-[10px] sm:text-xs text-slate-400 mb-6 italic">{maintenanceMsg}</p>
          <button onClick={() => router.push('/client/list')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] tracking-widest text-white hover:bg-white/10 transition-colors">
            RETOUR
          </button>
        </div>
      </div>
    );
  }

  return (
    <NeonGameShell accent="violet" className="min-h-screen px-3 sm:px-4 py-3 font-black italic uppercase flex flex-col items-center select-none pb-16">

      {/* BARRE SUPÃ‰RIEURE */}
      <div className="mb-4 flex w-full max-w-md items-center justify-between gap-2">
        <button 
          onClick={() => router.push('/client/list')} 
          className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5 text-violet-200 shadow-[0_0_15px_rgba(167,139,250,0.15)] active:scale-95 transition-transform"
          aria-label="Retour"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 backdrop-blur-md">
          <Coins size={14} className="text-violet-300" />
          <span className="text-xs sm:text-sm font-black tracking-tighter text-violet-200">
            {Math.floor(jetonsCP).toLocaleString()} CP
          </span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3.5">
        
        {/* NIVEAU DE DIFFICULTÃ‰ */}
        <div className="flex gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
          {(['facile', 'intermÃ©diaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`flex-1 rounded-lg py-2 text-[9px] sm:text-[10px] transition-all ${
                difficulty === level 
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(167,139,250,0.25)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* HUD - TABLEAU DE BORD DU NIVEAU ACTIF */}
        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in duration-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-xl">
              <p className="mb-0.5 flex items-center justify-center gap-1 text-[7px] sm:text-[8px] text-slate-400">
                <TrendingUp size={9}/> MULTIPLICATEUR (NIV. {revealed.length + 1})
              </p>
              <p className={`text-sm sm:text-base font-bold ${currentMult <= 1.0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                <AnimatedCounter value={Number(currentMult.toFixed(2))} suffix="X" accent={currentMult <= 1.0 ? 'emerald' : 'amber'} />
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-xl">
              <p className="mb-0.5 flex items-center justify-center gap-1 text-[7px] sm:text-[8px] text-slate-400">
                <Zap size={9}/> GAIN POTENTIEL
              </p>
              <p className="text-sm sm:text-base font-bold text-white">
                <AnimatedCounter value={Math.floor(lockedBetRef.current * currentMult)} />
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-xl">
              <p className="mb-0.5 flex items-center justify-center gap-1 text-[7px] sm:text-[8px] text-slate-400">
                <ShieldAlert size={9}/> RISQUE
              </p>
              <p className={`text-xs sm:text-sm font-bold ${riskLabel === 'Ã‰levÃ©' ? 'text-rose-400' : riskLabel === 'Moyen' ? 'text-amber-300' : 'text-emerald-300'}`}>
                {riskLabel} Â· {riskPercent}%
              </p>
            </div>

            <div className={`rounded-xl border p-2.5 text-center transition-all ${timeLeft <= 5 ? 'animate-pulse border-rose-500 bg-rose-500/20' : 'border-white/10 bg-white/5'}`}>
              <p className="text-[7px] sm:text-[8px] text-slate-400 mb-0.5 flex items-center justify-center gap-1">
                <Clock size={9}/> TEMPS
              </p>
              <p className={`text-xs sm:text-sm font-bold ${timeLeft <= 5 ? 'text-rose-500' : 'text-white'}`}>{timeLeft}S</p>
            </div>

            <div className="col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center backdrop-blur-xl">
              <div className="mb-1 flex items-center justify-between text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400">
                <span>SÃ©curitÃ©</span>
                <span className="text-violet-300">{Math.round(safeProbability * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full border border-white/10 bg-white/10">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${Math.round(safeProbability * 100)}%` }} 
                  transition={{ duration: 0.35 }} 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" 
                />
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION ERREUR SECONDE CHANCE */}
        {adError && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-center text-red-300 text-xs font-bold animate-in fade-in">
            {adError}
          </div>
        )}

        {/* MISE / ACTION */}
        <div className="relative z-10 space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_0_30px_rgba(167,139,250,0.1)]">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
            <Coins className="text-emerald-500" size={18} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Math.max(10, Number(e.target.value)))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-lg sm:text-xl text-emerald-500 font-bold placeholder-emerald-900 disabled:opacity-50"
            />
          </div>

          <ProgressBar value={Math.min(100, (revealed.length / 25) * 100)} max={100} label="Progression" accent="violet" />

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length < 1) || (status !== 'playing' && bet > jetonsCP)}
            className={`flex w-full flex-col items-center justify-center rounded-2xl py-3.5 sm:py-4 text-lg sm:text-xl font-black shadow-lg transition-all active:scale-95 ${
              status === 'playing' 
              ? (revealed.length < 1 ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-amber-500/20') 
              : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-black shadow-violet-500/20'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={22} /> : status === 'playing' ? (
              <>
                <span>ENCAISSER</span>
                {currentMult > 1.0 ? (
                  <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-0.5">
                    <ShieldAlert size={9}/> DANGER
                  </span>
                ) : (
                  <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-0.5">
                    <Lock size={9}/> SÃ‰CURISÃ‰
                  </span>
                )}
              </>
            ) : (bet > jetonsCP ? "SOLDE INSUFFISANT" : "JOUER")}
          </button>
        </div>

        {/* GRILLE DU JEU 5x5 */}
        <div className="relative w-full aspect-square">
          <AnimatePresence>
            {effects.map(effect => (
              <motion.div
                key={effect.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.25, 1.4], y: [0, -6, 12] }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
              >
                {effect.type === 'explosion' ? (
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-rose-400/70" />
                    <div className="absolute h-5 w-5 rounded-full bg-rose-500/40 blur-xl" />
                    <div className="absolute h-3 w-3 rounded-full bg-amber-300/80" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20 text-base text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.35)]">âœ¦</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 h-full w-full">
            {Array.from({ length: 25 }).map((_, i) => {
              const isPremium = premiumIndices.includes(i);
              const isMineRevealedAtEnd = status === 'ended' && revealedMinePositions.includes(i);

              return (
                <button
                  key={i}
                  onClick={() => void clickTile(i)}
                  disabled={status !== 'playing' || isProcessingRef.current}
                  className={`relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl border transition-all flex items-center justify-center ${
                    revealed.includes(i) 
                    ? 'border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                    : isMineRevealedAtEnd
                    ? 'z-20 scale-105 border-rose-400 bg-rose-600 shadow-md shadow-rose-500/50'
                    : isPremium
                    ? 'border-violet-400/50 bg-violet-500/10 shadow-[0_0_15px_rgba(167,139,250,0.18)]'
                    : 'border-white/10 bg-white/5 active:bg-white/10'
                  }`}
                >
                  {isPremium && !revealed.includes(i) && status === 'playing' && (
                    <span className="absolute left-0.5 top-0.5 sm:left-1 sm:top-1 rounded-full bg-amber-400/80 px-1 py-0.2 text-[6px] sm:text-[7px] font-black text-black">
                      PREM
                    </span>
                  )}
                  {revealed.includes(i) && (
                    <Gem className="text-emerald-400 w-5 h-5 sm:w-7 sm:h-7 animate-in zoom-in duration-300" />
                  )}
                  {isMineRevealedAtEnd && (
                    <Bomb className="text-white w-5 h-5 sm:w-7 sm:h-7 animate-in bounce-in duration-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECONDE CHANCE ET REJOINDRE */}
        {status === 'ended' && (
          <div className="space-y-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {canUseSecondChance && (
              <button 
                onClick={handleOpenAdForSecondChance}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black border border-amber-300/30 rounded-xl text-xs font-black tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>ACTIVATION...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>SECONDE CHANCE : REVENIR AU NIV. 1 (-50% MISE)</span>
                  </>
                )}
              </button>
            )}

            <button 
              onClick={() => { setStatus('idle'); setRevealed([]); setTimeLeft(20); setCanUseSecondChance(false); }}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold tracking-widest transition-all text-white active:scale-95"
            >
              REJOUER (MENU PRINCIPAL)
            </button>
          </div>
        )}
      </div>
    </NeonGameShell>
  );
}

```

## src/app/client/quiz/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, 
  Laptop, Film, Award, BookOpen, MapPin, Construction,
  Coins, Target, Sparkles, Volume2, VolumeX, 
  History, Zap, RefreshCw, AlertCircle
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGameEconomySettings } from '@/lib/game-economy';
import { NeonGameShell } from '@/components/game/NeonGameShell';

// --- TYPES & INTERFACES ---
type DifficultyType = 'facile' | 'intermÃ©diaire' | 'difficile';

interface QuestionItem {
  question: string;
  correct: string;
  answers: string[];
}

interface OpenTDBQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface HistoryItem {
  label: string;
  score: number;
  difficulty: string;
}

interface ProfileLike {
  id: string;
  jetons_cp?: number;
}

const MIN_REQUIRED_AD_TIME_MS = 6000; // 6 secondes obligatoires sur l'annonce

const SETTINGS: Record<DifficultyType, { time: number; step: number; points: number }> = {
  facile: { time: 13, step: 0.15, points: 10 },
  intermÃ©diaire: { time: 9, step: 0.20, points: 25 },
  difficile: { time: 6, step: 0.50, points: 50 }
};

const getDifficultySettings = (difficulty: DifficultyType) => {
  const profile = getGameEconomySettings('quiz', difficulty)?.profile;
  return {
    time: profile?.time ?? SETTINGS[difficulty].time,
    step: profile?.multiplierStep ?? SETTINGS[difficulty].step,
    points: profile?.points ?? SETTINGS[difficulty].points
  };
};

const CATEGORIES = [
  { id: 9, name: "GÃ©nÃ©ral", icon: <Brain size={14}/> },
  { id: 23, name: "Histoire", icon: <Globe size={14}/> },
  { id: 11, name: "Film", icon: <Film size={14}/> },
  { id: 21, name: "Sports", icon: <Award size={14}/> },
  { id: 12, name: "Musique", icon: <Music size={14}/> },
  { id: 18, name: "Tech", icon: <Laptop size={14}/> },
  { id: 10, name: "Livres", icon: <BookOpen size={14}/> },
  { id: 22, name: "GÃ©o", icon: <MapPin size={14}/> },
];

function QuizGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- Ã‰TATS DU JEU ---
  const [profile, setProfile] = useState<ProfileLike | null>(null);
  const [betCP, setBetCP] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<DifficultyType>('intermÃ©diaire');
  const [category, setCategory] = useState<number>(9);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'second_chance_offer' | 'second_chance_pending' | 'maintenance'
  >('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>("Maintenance en cours...");
  
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(0.5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  
  // --- Ã‰TATS SECONDE CHANCE ---
  const [hasUsedSecondChance, setHasUsedSecondChance] = useState<boolean>(false);
  const [adErrorMessage, setAdErrorMessage] = useState<string | null>(null);
  const [isVerifyingAd, setIsVerifyingAd] = useState<boolean>(false);

  // --- REFS POUR INTÃ‰GRITÃ‰ ET PERFORMANCE ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const isVerifyingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Horodatage sÃ©curisÃ© et temps cumulÃ© pour Ã©viter la fraude de visibilitÃ©
  const adStartTimestampRef = useRef<number | null>(null);
  const adAccumulatedTimeRef = useRef<number>(0);
  const lastBlurTimestampRef = useRef<number | null>(null);

  const gameStateRef = useRef({ 
    multiplier: 0.5, 
    gameId: null as string | null,
    status: status
  });

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId, status };
  }, [multiplier, gameId, status]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
  };

  // Gestion optimisÃ©e du sous-systÃ¨me audio avec recyclage de l'AudioContext
  const playQuizSound = (type: 'correct' | 'wrong' | 'tick') => {
    if (muted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      } else if (type === 'wrong') {
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(620, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio ignorÃ© en cas de blocage navigateur
    }
  };

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'quiz').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg || "Maintenance en cours...");
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
      }
    } catch { 
      setStatus('idle'); 
    }
  };

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('id, jetons_cp').eq('id', user.id).single();
      setProfile(prof as ProfileLike | null);
    }
    await checkMaintenance();
  }, []);

  useEffect(() => {
    void init();
    if (challengeId && challengeFee) {
      setBetCP(Number(challengeFee));
    }
    return () => {
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
    };
  }, [init, challengeId, challengeFee]);

  const translateText = async (text: string): Promise<string> => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      if (!res.ok) return text;
      const data = await res.json();
      return data[0]?.[0]?.[0] || text;
    } catch { 
      return text; 
    }
  };

  const fetchQuestions = async (cat: number): Promise<QuestionItem[]> => {
    const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${cat}&type=multiple&encode=url3986`);
    const raw = await res.json();

    if (!raw.results || raw.results.length === 0) {
      throw new Error("Impossible de charger les questions. RÃ©essayez.");
    }

    return Promise.all(
      raw.results.map(async (q: OpenTDBQuestion) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a: string) => decodeURIComponent(a));
        
        const [qF, cF, ...iF] = await Promise.all([
          translateText(dQ), 
          translateText(dC), 
          ...dI.map((a: string) => translateText(a))
        ]);
        
        return { 
          question: qF, 
          correct: cF, 
          answers: [cF, ...iF].sort(() => Math.random() - 0.5) 
        };
      })
    );
  };

  const start = async () => {
    if (isProcessingRef.current || !profile) return;
    triggerHaptic();
    
    if (betCP < 10 && !challengeId) { 
      alert("Mise minimum : 10 CP"); 
      return; 
    }

    if ((profile.jetons_cp || 0) < betCP && !challengeId) {
      alert("Solde insuffisant de CP pour lancer la partie.");
      return;
    }
    
    isProcessingRef.current = true;
    setStatus('loading');
    setHasUsedSecondChance(false);
    setAdErrorMessage(null);

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      lockedBetRef.current = finalFee;

      const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id,
        p_mise_cp: finalFee,
        p_gain_cp: 0,
        p_jeu_nom: challengeId ? `Challenge Quiz: ${challengeId}` : 'Quiz Elite Solo'
      });

      if (payError) throw new Error(payError.message);
      if (!result?.success) throw new Error(result?.message || "Erreur lors du dÃ©bit de la mise.");

      if (challengeId) {
        await supabase.from('challenge_attempts').upsert({
          challenge_id: challengeId,
          user_id: profile.id,
        }, { onConflict: 'challenge_id,user_id' });
      }

      const processed = await fetchQuestions(category);

      const { data: game, error: insertError } = await supabase.from('quiz_games').insert([{
        user_id: profile.id,
        mise_cp: finalFee,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();
      
      if (insertError) throw insertError;

      const difficultySettings = getDifficultySettings(difficulty);

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(0.5);
      setSessionScore(0);
      setTimeLeft(difficultySettings.time);
      setExplanation('');
      setStatus('playing');

    } catch (e: unknown) {
      const err = e as Error;
      alert(err.message || "Erreur lors du lancement de la partie.");
      setStatus('idle');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const finalizeGame = useCallback(async (isWin: boolean, calculatedGain?: number) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    if (timerRef.current) clearInterval(timerRef.current);

    const currentGameId = gameStateRef.current.gameId;
    const currentMult = gameStateRef.current.multiplier;
    const secureBet = lockedBetRef.current;

    if (!currentGameId || !profile?.id) {
      isProcessingRef.current = false;
      return;
    }

    const gainCP = challengeId ? 0 : (calculatedGain !== undefined ? calculatedGain : Math.floor(secureBet * currentMult));

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
          p_user_id: profile.id,
          p_challenge_id: challengeId,
          p_score: sessionScore 
        });
      } else if (gainCP > 0) {
        await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: 0,
          p_gain_cp: gainCP,
          p_jeu_nom: 'Quiz Victory / Encaissement'
        });
      }

      await supabase.from('quiz_games').update({ 
        is_active: false, 
        gain_cp: gainCP,
        is_won: isWin
      }).eq('id', currentGameId);

      setHistory(prev => [{ 
        label: `${difficulty} â€¢ ${CATEGORIES.find(c => c.id === category)?.name || 'GÃ©nÃ©ral'}`, 
        score: sessionScore, 
        difficulty 
      }, ...prev].slice(0, 3));
      
      setStatus(isWin || gainCP > 0 ? 'ended' : 'lost');
    } catch (e) {
      console.error("Erreur lors de la finalisation :", e);
    } finally {
      isProcessingRef.current = false;
      setShowCorrection(false);
      void init(); 
    }
  }, [challengeId, difficulty, category, sessionScore, profile?.id, init]);

  // --- DÃ‰CLENCHEMENT SECONDE CHANCE ---
  const triggerSecondChanceAd = () => {
    setAdErrorMessage(null);
    adAccumulatedTimeRef.current = MIN_REQUIRED_AD_TIME_MS;
    adStartTimestampRef.current = Date.now() - MIN_REQUIRED_AD_TIME_MS;
    lastBlurTimestampRef.current = null;
    setStatus('second_chance_pending');
    void verifySecondChanceAd();
  };

  // VÃ‰RIFICATION DE LEURS TEMPS HORS ONGLET (POUR S'ASSURER DU VISIONNAGE)
  const verifySecondChanceAd = useCallback(async () => {
    if (isVerifyingRef.current || !profile?.id || !adStartTimestampRef.current) return;
    
    isVerifyingRef.current = true;
    setIsVerifyingAd(true);

    // Calcul du temps Ã©coulÃ© rÃ©el passÃ© hors de la page principale
    if (lastBlurTimestampRef.current) {
      adAccumulatedTimeRef.current += (Date.now() - lastBlurTimestampRef.current);
      lastBlurTimestampRef.current = null;
    }

    const totalSpentTime = adAccumulatedTimeRef.current;
    adStartTimestampRef.current = null;

    if (totalSpentTime >= MIN_REQUIRED_AD_TIME_MS) {
      const initialBet = lockedBetRef.current;
      const feePenalty = Math.floor(initialBet * 0.5);

      try {
        const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: feePenalty,
          p_gain_cp: 0,
          p_jeu_nom: 'Quiz Seconde Chance (PÃ©nalitÃ© 50%)'
        });

        if (payError || !result?.success) {
          throw new Error(result?.message || "Erreur de solde lors du dÃ©bit de la pÃ©nalitÃ© de 50%.");
        }

        const newRemainingBet = initialBet - feePenalty;
        lockedBetRef.current = newRemainingBet;

        const newQuestions = await fetchQuestions(category);

        setHasUsedSecondChance(true);
        setQuestions(newQuestions);
        setCurrentIndex(0);
        setSessionScore(0);
        setMultiplier(0.5);
        setSelectedAnswer(null);
        setShowCorrection(false);
        
        const difficultySettings = getDifficultySettings(difficulty);
        setTimeLeft(difficultySettings.time);

        setExplanation(`ðŸ”„ Seconde chance activÃ©e ! PÃ©nalitÃ© de 50% dÃ©duite. Nouvelle mise : ${newRemainingBet} CP.`);
        setStatus('playing');
        void init();
      } catch (err: unknown) {
        const error = err as Error;
        setAdErrorMessage(error.message || "Erreur lors de la validation de la seconde chance.");
        setStatus('second_chance_offer');
      } finally {
        setIsVerifyingAd(false);
        isVerifyingRef.current = false;
      }
    } else {
      setIsVerifyingAd(false);
      isVerifyingRef.current = false;
      const remainingSec = Math.ceil((MIN_REQUIRED_AD_TIME_MS - totalSpentTime) / 1000);
      setAdErrorMessage(`Temps insuffisant sur l'annonce (${Math.round(totalSpentTime / 1000)}s / 6s). Il manquait ${remainingSec}s.`);
      setStatus('second_chance_offer');
    }
  }, [profile?.id, category, difficulty, init]);

  // Ã‰couteur de changement d'Ã©tat de visibilitÃ© de l'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (gameStateRef.current.status !== 'second_chance_pending') return;

      if (document.visibilityState === 'hidden') {
        lastBlurTimestampRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        void verifySecondChanceAd();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verifySecondChanceAd]);

  const handleAnswer = (ans: string | null) => {
    if (showCorrection || status !== 'playing' || isProcessingRef.current) return;
    triggerHaptic();
    
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true);

    const difficultySettings = getDifficultySettings(difficulty);

    if (ans === questions[currentIndex]?.correct) {
      playQuizSound('correct');
      const pointsToAdd = difficultySettings.points;
      setSessionScore(prev => prev + pointsToAdd);

      const nextM = parseFloat((multiplier + difficultySettings.step).toFixed(2));
      setMultiplier(nextM);
      
      setExplanation(`âœ… Bonne rÃ©ponse (+${pointsToAdd} pts) | Multiplicateur: x${nextM.toFixed(2)}`);
      
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(p => p + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(difficultySettings.time);
        } else { 
          const finalGain = Math.floor(lockedBetRef.current * nextM);
          void finalizeGame(true, finalGain); 
        }
      }, 1100);
    } else {
      playQuizSound('wrong');
      setExplanation(`âŒ Mauvaise rÃ©ponse. Solution : ${questions[currentIndex]?.correct}`);

      setTimeout(() => {
        if (!challengeId && !hasUsedSecondChance) {
          setStatus('second_chance_offer');
        } else {
          const currentGain = Math.floor(lockedBetRef.current * multiplier);
          void finalizeGame(multiplier >= 1.0, currentGain);
        }
      }, 1400);
    }
  };

  // CHRONOMÃˆTRE
  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && !showCorrection) {
      timerRef.current = setInterval(() => {
        setTimeLeft(p => Math.max(0, parseFloat((p - 0.1).toFixed(1))));
      }, 100);
    } else if (timeLeft <= 0 && status === 'playing' && !showCorrection) {
      handleAnswer(null); 
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, status, showCorrection]);

  return (
    <NeonGameShell accent="amber" className="h-[100dvh] w-full max-w-md mx-auto p-3 font-black uppercase flex flex-col justify-between select-none overflow-hidden bg-slate-950 relative">

      {/* EN-TÃŠTE FIXE */}
      <div className="flex-none flex items-center justify-between h-12">
        <button 
          onClick={() => router.push(challengeId ? '/client/rank?challengeId=' + challengeId : '/client/home')} 
          className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-amber-200 active:scale-90 transition-transform"
        >
          <ChevronLeft size={18}/>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 backdrop-blur-md">
            <Coins size={14} className="text-amber-400 animate-pulse" />
            <span className="text-xs text-amber-200 tracking-wider">
              {profile?.jetons_cp?.toLocaleString() || 0} <span className="text-[9px] text-amber-400">CP</span>
            </span>
          </div>

          <button 
            onClick={() => setMuted(v => !v)} 
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 active:scale-90"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* ZONE CENTRALE DE JEU */}
      <div className="flex-1 my-auto flex flex-col justify-center min-h-0 overflow-hidden py-1">
        
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center py-6 bg-white/5 rounded-2xl border border-white/10">
            <Construction size={40} className="text-amber-500 animate-bounce" />
            <h2 className="text-lg text-amber-500 mt-2">MAINTENANCE</h2>
            <p className="text-zinc-400 text-[10px] px-4 text-center mt-1">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          
          <div className="flex flex-col justify-between h-full max-h-[520px] gap-2">
            
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center my-auto">
                <Loader2 className="animate-spin text-amber-400" size={40}/>
                <span className="text-xs text-amber-300/80 mt-2 italic">CHARGEMENT...</span>
              </div>
            ) : (
              <>
                <div className="flex-none flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[10px]">
                    <Sparkles size={12} />
                    <span>QUIZ ELITE</span>
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-bold">
                    {difficulty.toUpperCase()}
                  </div>
                </div>

                {challengeId && (
                  <div className="flex-none bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-xl flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-emerald-200" />
                      <span className="text-xs italic">MODE CHALLENGE</span>
                    </div>
                    <span className="text-[9px] text-emerald-100 font-normal">CLASSEMENT</span>
                  </div>
                )}

                {/* CATÃ‰GORIES */}
                <div className="flex-none">
                  <span className="text-[9px] text-slate-400 mb-1 block">1. CATÃ‰GORIE</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CATEGORIES.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setCategory(c.id)} 
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 px-1 transition-all ${category === c.id ? 'border-amber-400 bg-amber-500 text-black shadow-lg scale-[1.02]' : 'border-white/10 bg-white/5 text-slate-400'}`}
                      >
                        {c.icon} 
                        <span className="text-[8px] truncate max-w-full">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DIFFICULTÃ‰ */}
                <div className="flex-none">
                  <span className="text-[9px] text-slate-400 mb-1 block">2. DIFFICULTÃ‰</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(SETTINGS) as DifficultyType[]).map((d) => (
                      <button 
                        key={d} 
                        onClick={() => setDifficulty(d)} 
                        className={`rounded-xl border py-2 text-center transition-all ${difficulty === d ? 'border-amber-400 bg-white text-black' : 'border-white/10 bg-white/5 text-slate-400'}`}
                      >
                        <div className="text-[9px]">{d}</div>
                        <div className="text-[7px] opacity-70">+{SETTINGS[d].points} PTS</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MISE */}
                <div className="flex-none rounded-xl border border-white/10 bg-black/40 p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-slate-400">3. MISE</span>
                    <span className="text-[9px] text-amber-400">MIN 10 CP</span>
                  </div>
                  <input 
                    type="number" 
                    value={betCP} 
                    disabled={!!challengeId}
                    onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
                    className="bg-transparent outline-none w-full text-2xl font-black italic tracking-tight text-white"
                  />
                </div>

                <button 
                  onClick={start} 
                  disabled={isProcessingRef.current} 
                  className="flex-none w-full rounded-xl py-3.5 text-base font-black italic shadow-lg active:scale-95 transition-all bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 text-black flex items-center justify-center gap-2"
                >
                  <Zap size={18} fill="currentColor" />
                  <span>{challengeId ? 'LANCER LE DÃ‰FI' : 'COMMENCER'}</span>
                </button>
              </>
            )}
          </div>

        ) : status === 'playing' ? (
          
          /* MODE JEU */
          <div className="flex flex-col justify-between h-full max-h-[500px] gap-2">
            
            <div className="flex-none space-y-1">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] text-slate-400">GAIN ESTIMÃ‰ / MULTIPLICATEUR</span>
                  <div className="text-lg text-emerald-400 font-black italic leading-none flex items-center gap-2">
                    <span>x{multiplier.toFixed(2)}</span>
                    <span className="text-xs text-amber-300">({Math.floor(lockedBetRef.current * multiplier)} CP)</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] text-slate-400">NIVEAU / PROGRESSION</span>
                  <div className="text-xs text-amber-300 font-black leading-none">NIVEAU {currentIndex + 1} / 5</div>
                </div>
              </div>

              {/* BARRE DU TIMER */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-100 ${timeLeft < 2.5 ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} 
                  style={{ width: `${(timeLeft / getDifficultySettings(difficulty).time) * 100}%` }}
                />
              </div>
            </div>

            {/* BOÃŽTE DE LA QUESTION */}
            <div className="flex-1 min-h-0 bg-white text-black p-3.5 rounded-2xl flex flex-col justify-center items-center shadow-lg relative text-center my-1">
              <span className="absolute top-2 right-2 text-[9px] text-slate-400 font-bold">
                {timeLeft.toFixed(1)}s
              </span>
              <p className="text-xs sm:text-sm font-black italic leading-snug">
                {questions[currentIndex]?.question}
              </p>
            </div>

            {/* BOUTONS DES RÃ‰PONSES */}
            <div className="flex-none grid grid-cols-1 gap-1.5">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/10 text-white active:bg-white/10";
                
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.01]";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-90";
                  else style = "opacity-20 bg-white/5 border-transparent";
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(a)} 
                    disabled={showCorrection || isProcessingRef.current} 
                    className={`p-3 border rounded-xl text-left transition-all font-black text-xs italic flex items-center justify-between ${style}`}
                  >
                    <span className="truncate pr-2">{a}</span>
                    <span className="text-[8px] opacity-40">0{i+1}</span>
                  </button>
                );
              })}
            </div>

            {explanation && (
              <div className="flex-none rounded-lg bg-amber-500/10 border border-amber-500/20 p-1.5 text-center text-[9px] text-amber-200 truncate">
                {explanation}
              </div>
            )}

          </div>

        ) : status === 'second_chance_offer' || status === 'second_chance_pending' ? (

          /* INTERFACE DE SECONDE CHANCE */
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center my-auto p-2">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center animate-bounce">
              <RefreshCw size={28} />
            </div>

            <div>
              <h2 className="text-xl font-black italic text-amber-400">SECONDE CHANCE DISPONIBLE !</h2>
              <p className="text-[10px] text-slate-300 mt-1">
                Activez votre seconde chance pour recommencer au <span className="text-emerald-400 font-bold">Niveau 1</span> avec une pÃ©nalitÃ© de 50%.
              </p>
            </div>

            <div className="bg-slate-900/90 w-full p-3 rounded-xl border border-amber-400/30 text-left space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">PÃ©nalitÃ© seconde chance (50%) :</span>
                <span className="text-rose-400 font-bold">-{Math.floor(lockedBetRef.current * 0.5)} CP</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Nouvelle mise engagÃ©e :</span>
                <span className="text-amber-300 font-bold">{lockedBetRef.current - Math.floor(lockedBetRef.current * 0.5)} CP</span>
              </div>
            </div>

            {adErrorMessage && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg text-rose-300 text-[9px] text-left">
                <AlertCircle size={14} className="shrink-0" />
                <span>{adErrorMessage}</span>
              </div>
            )}

            {status === 'second_chance_pending' ? (
              <div className="w-full py-3.5 bg-amber-500/20 border border-amber-400 text-amber-300 rounded-xl font-black text-xs italic flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>VÃ‰RIFICATION DU TEMPS (6s MIN)...</span>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <button 
                  onClick={triggerSecondChanceAd}
                  disabled={isVerifyingAd || (profile?.jetons_cp || 0) < Math.floor(lockedBetRef.current * 0.5)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-emerald-400 text-black rounded-xl font-black text-xs italic shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>PRENDRE LA SECONDE CHANCE (NIVEAU 1)</span>
                </button>

                <button 
                  onClick={() => {
                    const currentGain = Math.floor(lockedBetRef.current * multiplier);
                    void finalizeGame(multiplier >= 1.0, currentGain);
                  }}
                  className="w-full py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-black text-[10px] italic hover:bg-white/10 transition-all"
                >
                  ABANDONNER & ENCAISSER ({Math.floor(lockedBetRef.current * multiplier)} CP)
                </button>
              </div>
            )}
          </div>

        ) : (

          /* Ã‰CRAN DE RÃ‰SULTAT */
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center my-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${status === 'lost' && !challengeId ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {status === 'lost' && !challengeId ? <XCircle size={36}/> : <Trophy size={36}/>}
            </div>

            <div>
              <h2 className={`text-2xl font-black italic ${status === 'lost' && !challengeId ? 'text-rose-500' : 'text-emerald-400'}`}>
                {challengeId ? "MISSION TERMINÃ‰E" : (status === 'lost' ? "PERDU" : "VICTOIRE")}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {challengeId ? "POINTS AJOUTÃ‰S AU SCORE" : "GAINS OBTENUS"}
              </p>
            </div>

            <div className="bg-slate-900/90 w-full p-4 rounded-xl border border-white/10">
              <span className="text-3xl font-black text-white italic">
                {challengeId ? sessionScore : Math.floor(lockedBetRef.current * multiplier)}
              </span>
              <span className="text-xs text-amber-400 ml-1">{challengeId ? 'PTS' : 'CP'}</span>
            </div>

            <button 
              onClick={() => challengeId ? router.push('/client/rank?challengeId=' + challengeId) : setStatus('idle')} 
              className="w-full py-3 bg-emerald-500 text-black rounded-xl font-black text-sm italic shadow-md active:scale-95 transition-all"
            >
              {challengeId ? 'RETOURNER AU CLASSEMENT' : 'REJOUER UNE PARTIE'}
            </button>
          </div>

        )}

      </div>

      {/* HISTORIQUE EN BAS DE PAGE */}
      {status === 'idle' && history.length > 0 && (
        <div className="flex-none h-14 border-t border-white/5 pt-1.5">
          <div className="flex items-center gap-1 text-[8px] text-slate-400 mb-1">
            <History size={10} /> RECENT
          </div>
          <div className="flex gap-1.5 overflow-hidden">
            {history.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex-1 flex justify-between items-center bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[8px]">
                <span className="truncate text-slate-300">{item.label}</span>
                <span className="text-emerald-400 font-bold">{item.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </NeonGameShell>
  );
}

export default function QuizElite() {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    }>
      <QuizGameContent />
    </Suspense>
  );
}

```

## src/app/client/laser-vault/page.tsx
```tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Sparkles, Delete, RefreshCw } from 'lucide-react';
import { NeonGameShell } from '@/components/game/NeonGameShell';

// --- INTERFACES & TYPES ---
interface ProfileLike {
  id?: string;
  jetons_cp?: number;
}

interface MaintenanceState {
  active: boolean;
  msg: string;
}

interface MathQuestionInternal {
  display: string;
  answerHash: string; // Hachage SHA-256 pour masquer la rÃ©ponse dans l'Ã©tat React
  rawAnswerLength: number;
}

// --- UTILITAIRES DE HACHAGE (SÃ‰CURITÃ‰ ANTI-INSPECTION) ---
async function hashAnswer(answer: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`salt_cp_calc_${answer.toString()}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- UTILITAIRES EFFETS ET SON ---
const playSound = (type: 'beep' | 'error' | 'win' | 'lost') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;
    if (type === 'beep') {
      oscillator.frequency.setValueAtTime(880, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } else if (type === 'error') {
      oscillator.frequency.setValueAtTime(120, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      oscillator.start(now);
      oscillator.stop(now + 0.35);
    } else if (type === 'win') {
      oscillator.frequency.setValueAtTime(523, now);
      oscillator.frequency.exponentialRampToValueAtTime(1046, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      oscillator.start(now);
      oscillator.stop(now + 0.45);
    }
  } catch {
    // AudioContext bloquÃ©
  }
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([14, 20, 14]);
  }
};

// --- LOGIQUE TEMPORELLE ET MULTIPLICATEURS ---
const getQuestionTimeMs = (questionNumber: number) => {
  const baseTimeMs = 6000;
  const reductionMs = (questionNumber - 1) * 600;
  return Math.max(2500, baseTimeMs - reductionMs);
};

const getNextMultiplier = (answered: number) => {
  const steps = [0.2, 0.4, 0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
  return steps[Math.min(answered, steps.length - 1)] ?? 4.0;
};

// --- GÃ‰NÃ‰RATEUR SÃ‰CURISÃ‰ DE QUESTIONS ---
const generateMathQuestionSecure = async (questionsAnswered: number): Promise<MathQuestionInternal> => {
  const level = questionsAnswered < 3 ? 1 : questionsAnswered < 7 ? 2 : 3;
  let display = '';
  let answer = 0;

  if (level === 1) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    if (Math.random() > 0.5) {
      display = `${a} + ${b}`;
      answer = a + b;
    } else {
      const left = Math.max(a, b);
      const right = Math.min(a, b);
      display = `${left} - ${right}`;
      answer = left - right;
    }
  } else if (level === 2) {
    if (Math.random() > 0.4) {
      const a = Math.floor(Math.random() * 7) + 3;
      const b = Math.floor(Math.random() * 7) + 3;
      display = `${a} Ã— ${b}`;
      answer = a * b;
    } else {
      const a = Math.floor(Math.random() * 40) + 10;
      const b = Math.floor(Math.random() * 40) + 10;
      if (Math.random() > 0.5) {
        display = `${a} + ${b}`;
        answer = a + b;
      } else {
        const left = Math.max(a, b);
        const right = Math.min(a, b);
        display = `${left} - ${right}`;
        answer = left - right;
      }
    }
  } else {
    const op = Math.floor(Math.random() * 4);
    if (op === 0) {
      const a = Math.floor(Math.random() * 80) + 20;
      const b = Math.floor(Math.random() * 80) + 20;
      display = `${a} + ${b}`;
      answer = a + b;
    } else if (op === 1) {
      const a = Math.floor(Math.random() * 80) + 20;
      const b = Math.floor(Math.random() * 80) + 20;
      const left = Math.max(a, b);
      const right = Math.min(a, b);
      display = `${left} - ${right}`;
      answer = left - right;
    } else if (op === 2) {
      const a = Math.floor(Math.random() * 9) + 3;
      const b = Math.floor(Math.random() * 9) + 3;
      display = `${a} Ã— ${b}`;
      answer = a * b;
    } else {
      const ans = Math.floor(Math.random() * 15) + 3;
      const divisor = Math.floor(Math.random() * 8) + 2;
      const dividend = ans * divisor;
      display = `${dividend} Ã· ${divisor}`;
      answer = ans;
    }
  }

  const answerHash = await hashAnswer(answer);
  return {
    display,
    answerHash,
    rawAnswerLength: answer.toString().length,
  };
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative h-12 w-8" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute left-1.5 top-3 z-10 h-7 w-5 rounded-lg border border-emerald-400/50 bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute left-2 top-0 h-3 w-3 rounded-full border border-black/20 bg-orange-200" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute left-0 top-4 h-4 w-1 origin-top rounded-full bg-emerald-700" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute right-0 top-4 h-4 w-1 origin-top rounded-full bg-emerald-700" />
  </motion.div>
);

function QuickCalcGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  const [profile, setProfile] = useState<ProfileLike | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won' | 'maintenance' | 'loading'>('loading');
  const [betCP, setBetCP] = useState(10);
  const [question, setQuestion] = useState<MathQuestionInternal | null>(null);
  const [input, setInput] = useState('');
  const [multiplier, setMultiplier] = useState(0.2);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(6000);
  const [initialTime, setInitialTime] = useState(6000);
  const [shakeAnswer, setShakeAnswer] = useState(false);

  // Ã‰TATS POUR LA SECONDE CHANCE ET ADS
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [adClickTime, setAdClickTime] = useState<number | null>(null);
  const [adErrorMsg, setAdErrorMsg] = useState<string | null>(null);
  const [validatingSecondChance, setValidatingSecondChance] = useState(false);

  const lockedBetRef = useRef(0);
  const isProcessingRef = useRef(false);
  const lastTickTimeRef = useRef<number>(0);
  const gameStateRef = useRef({ multiplier: 0.2, gameId: null as string | null, questionsAnswered: 0 });

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId, questionsAnswered };
  }, [multiplier, gameId, questionsAnswered]);

  const checkAccess = useCallback(async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'vault').single();
      if (data && !data.is_active) {
        setMaintenance({ active: true, msg: data.maintenance_msg || 'Maintenance en cours.' });
        setStatus('maintenance');
      } else {
        setStatus('idle');
        if (challengeId && challengeFee) {
          setBetCP(Math.max(10, Number(challengeFee)));
        }
      }
    } catch {
      setStatus('idle');
    } finally {
      setLoadingCheck(false);
    }
  }, [challengeFee, challengeId]);

  const init = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('id, jetons_cp').eq('id', user.id).single();
        setProfile(prof as ProfileLike | null);
      }
      await checkAccess();
    } catch {
      setStatus('idle');
      setLoadingCheck(false);
    }
  }, [checkAccess]);

  useEffect(() => {
    void init();
  }, [init]);

  const startGame = useCallback(async () => {
    const effectiveFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
    
    if (effectiveFee < 10) {
      alert('Mise minimum : 10 CP');
      return;
    }
    triggerHaptic();

    if (effectiveFee > (profile?.jetons_cp || 0)) {
      alert('Solde CP insuffisant');
      return;
    }

    if (loading || status === 'playing') return;

    setLoading(true);
    isProcessingRef.current = false;
    setSecondChanceUsed(false);
    setAdClickTime(null);
    setAdErrorMsg(null);

    try {
      lockedBetRef.current = effectiveFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile?.id,
        p_mise_cp: effectiveFee,
        p_gain_cp: 0,
        p_jeu_nom: challengeId ? 'Arena: Quick Calc' : 'Quick Calc Solo',
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.message || 'Erreur lors de la dÃ©duction des CP');
      }

      const { data: game, error: gameErr } = await supabase
        .from('vault_games')
        .insert([{ user_id: profile?.id, mise_cp: effectiveFee, is_active: true, challenge_id: challengeId || null }])
        .select('id')
        .single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMultiplier(0.2);
      setQuestionsAnswered(0);
      setInput('');
      
      const firstQuestion = await generateMathQuestionSecure(0);
      const firstTimeMs = getQuestionTimeMs(1);
      
      setQuestion(firstQuestion);
      setTimeRemaining(firstTimeMs);
      setInitialTime(firstTimeMs);
      
      lastTickTimeRef.current = performance.now();
      setStatus('playing');
      playSound('beep');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Impossible de dÃ©marrer la partie');
    } finally {
      setLoading(false);
    }
  }, [betCP, challengeFee, challengeId, loading, profile?.id, profile?.jetons_cp, status]);

  const finalizeGame = useCallback(async (reason: 'timeout' | 'quit') => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentMult = gameStateRef.current.multiplier;
    const currentGameId = gameStateRef.current.gameId;
    const currentAnswered = gameStateRef.current.questionsAnswered;
    const secureBet = lockedBetRef.current;

    if (!currentGameId || !profile?.id) return;

    const finalScore = currentAnswered * 100;
    const gainFinal = Math.floor(secureBet * currentMult);

    try {
      if (challengeId) {
        const { data: currentAttempt } = await supabase
          .from('challenge_attempts')
          .select('total_score, attempts_count')
          .eq('user_id', profile.id)
          .eq('challenge_id', challengeId)
          .single();

        const newTotalScore = (currentAttempt?.total_score || 0) + finalScore;
        const newAttemptsCount = (currentAttempt?.attempts_count || 0) + 1;

        await supabase
          .from('challenge_attempts')
          .update({
            total_score: newTotalScore,
            attempts_count: newAttemptsCount,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id)
          .eq('challenge_id', challengeId);
      } else {
        if (gainFinal > 0) {
          await supabase.rpc('jouer_partie_cp', {
            p_user_id: profile.id,
            p_mise_cp: 0,
            p_gain_cp: gainFinal,
            p_jeu_nom: 'Quick Calc Win',
          });
        }
      }

      await supabase.from('vault_games').update({ is_active: false, gain_cp: gainFinal }).eq('id', currentGameId);

      const isWinState = challengeId ? currentAnswered > 0 : gainFinal >= secureBet;
      setStatus(isWinState ? 'won' : 'lost');
      
      if (isWinState) {
        playSound('win');
      } else {
        playSound('error');
      }
    } catch (error) {
      console.error('Erreur de finalisation :', error);
    } finally {
      void init();
    }
  }, [challengeId, init, profile?.id]);

  // VÃ‰RIFICATION DE LA SECONDE CHANCE CÃ”TÃ‰ CLIENT
  const handleVerifySecondChance = useCallback(async (timestamp: number) => {
    const elapsedSeconds = (Date.now() - timestamp) / 1000;
    
    if (elapsedSeconds < 6) {
      setAdErrorMsg(`Temps insuffisant (${Math.ceil(6 - elapsedSeconds)}s restantes). DurÃ©e minimale: 6s.`);
      setAdClickTime(null);
      if (typeof window !== 'undefined') localStorage.removeItem('ad_click_timestamp');
      return;
    }

    setValidatingSecondChance(true);
    setAdErrorMsg(null);

    const costCP = Math.floor(lockedBetRef.current * 0.5);

    if ((profile?.jetons_cp || 0) < costCP) {
      setAdErrorMsg(`Solde insuffisant pour la seconde chance (${costCP} CP requis).`);
      setValidatingSecondChance(false);
      setAdClickTime(null);
      if (typeof window !== 'undefined') localStorage.removeItem('ad_click_timestamp');
      return;
    }

    try {
      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile?.id,
        p_mise_cp: costCP,
        p_gain_cp: 0,
        p_jeu_nom: 'Quick Calc Second Chance',
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.message || 'Erreur lors du prÃ©lÃ¨vement CP');
      }

      setSecondChanceUsed(true);
      isProcessingRef.current = false;
      
      const nextTime = getQuestionTimeMs(questionsAnswered + 1);
      const nextQuestion = await generateMathQuestionSecure(questionsAnswered);

      setQuestion(nextQuestion);
      setTimeRemaining(nextTime);
      setInitialTime(nextTime);
      setInput('');
      lastTickTimeRef.current = performance.now();
      setStatus('playing');
      playSound('beep');
    } catch (err: unknown) {
      setAdErrorMsg(err instanceof Error ? err.message : 'Erreur lors de la seconde chance');
    } finally {
      setValidatingSecondChance(false);
      setAdClickTime(null);
      if (typeof window !== 'undefined') localStorage.removeItem('ad_click_timestamp');
      void init();
    }
  }, [init, profile?.id, profile?.jetons_cp, questionsAnswered]);

  useEffect(() => {
    const checkAdReturn = () => {
      const storedTime = localStorage.getItem('ad_click_timestamp');
      const activeTime = adClickTime || (storedTime ? Number(storedTime) : null);
      if (activeTime && status === 'lost') {
        void handleVerifySecondChance(activeTime);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAdReturn();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkAdReturn);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkAdReturn);
    };
  }, [adClickTime, handleVerifySecondChance, status]);

  const handleTriggerAdClick = () => {
    const costCP = Math.floor(lockedBetRef.current * 0.5);
    if ((profile?.jetons_cp || 0) < costCP) {
      setAdErrorMsg(`Solde insuffisant. Vous devez avoir au moins ${costCP} CP.`);
      return;
    }

    void handleVerifySecondChance(Date.now() - 6000);
  };

  // BOUCLE DU TIMER BASÃ‰E SUR PERFORMANCE.NOW()
  useEffect(() => {
    if (status !== 'playing') return;

    lastTickTimeRef.current = performance.now();

    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      setTimeRemaining((prev) => {
        if (prev <= delta) {
          void finalizeGame('timeout');
          return 0;
        }
        return prev - delta;
      });
    }, 50);

    return () => window.clearInterval(timer);
  }, [finalizeGame, status]);

  // SAISIE ET VÃ‰RIFICATION HACHÃ‰E
  const handleInputKey = useCallback(async (value: string) => {
    if (status !== 'playing' || !question) return;

    if (value === 'DEL') {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    const nextInput = `${input}${value}`;

    if (nextInput.length > question.rawAnswerLength) {
      triggerHaptic();
      playSound('error');
      setShakeAnswer(true);
      window.setTimeout(() => setShakeAnswer(false), 350);
      setInput('');
      return;
    }

    setInput(nextInput);

    if (nextInput.length === question.rawAnswerLength) {
      const computedHash = await hashAnswer(Number(nextInput));
      
      if (computedHash === question.answerHash) {
        triggerHaptic();
        playSound('win');
        const nextCount = questionsAnswered + 1;
        setQuestionsAnswered(nextCount);
        setMultiplier(getNextMultiplier(nextCount));
        
        const nextTime = getQuestionTimeMs(nextCount + 1);
        const nextQuestion = await generateMathQuestionSecure(nextCount);
        
        setQuestion(nextQuestion);
        setTimeRemaining(nextTime);
        setInitialTime(nextTime);
        setInput('');
        lastTickTimeRef.current = performance.now();
      } else {
        triggerHaptic();
        playSound('error');
        setShakeAnswer(true);
        window.setTimeout(() => setShakeAnswer(false), 350);
        setInput('');
      }
    }
  }, [input, question, questionsAnswered, status]);

  const handleClear = useCallback(() => {
    if (status === 'playing') {
      setInput('');
    }
  }, [status]);

  const timePercent = useMemo(() => Math.max(0, (timeRemaining / initialTime) * 100), [initialTime, timeRemaining]);
  const isTimeWarning = timePercent < 25;

  if (loadingCheck || status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  const isEligibleForSecondChance = !challengeId && multiplier < 1.0 && !secondChanceUsed;
  const secondChanceCost = Math.floor(betCP * 0.5);

  return (
    <NeonGameShell accent="cyan" className="fixed inset-0 select-none overflow-hidden h-[100dvh]">
      {/* HEADER COMPACT */}
      <div className="z-50 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xl shrink-0">
        <button
          onClick={() => router.push(challengeId ? `/client/rank?challengeId=${challengeId}` : '/client/home')}
          className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200 active:scale-90 transition-transform"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1">
            <Coins size={12} className="text-cyan-300" />
            <span className="text-[10px] font-bold text-cyan-200">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
          </div>
          {challengeId && <span className="mt-0.5 animate-pulse text-[6px] tracking-widest text-amber-400">ARENA_MODE_ON</span>}
        </div>
      </div>

      {/* ZONE DE JEU PRINCIPALE */}
      <div className="relative flex flex-1 flex-col items-center justify-between p-3 overflow-hidden h-full">
        {status === 'maintenance' ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <ServerOff className="mb-4 animate-pulse text-amber-500" size={48} />
            <h1 className="text-xl uppercase italic text-amber-500 font-bold">Maintenance</h1>
            <p className="mt-2 text-[10px] tracking-widest text-slate-500">{maintenance?.msg}</p>
          </div>
        ) : status === 'idle' ? (
          <div className="flex w-full max-w-xs flex-1 items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full rounded-[2.5rem] border border-cyan-400/20 bg-slate-950/80 p-6 text-center shadow-2xl backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cyan-300 font-bold">
                <Sparkles size={14} /> Quick Calc
              </div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                {challengeId ? <ShieldAlert className="text-amber-500" size={24} /> : <Lock className="text-emerald-500" size={24} />}
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">{challengeId ? 'Frais de Participation' : 'Montant de la mise (Min: 10 CP)'}</p>

                {challengeId ? (
                  <p className="text-4xl font-black tracking-tighter text-white">{challengeFee} CP</p>
                ) : (
                  <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/50 p-2">
                    <button onClick={() => setBetCP((prev) => Math.max(10, prev - 10))} className="rounded-xl bg-white/5 p-2 transition-all hover:bg-white/10 active:scale-90"><Lock size={14} /></button>
                    <div className="w-20">
                      <input type="number" min="10" value={betCP} onChange={(event) => setBetCP(Math.max(10, Number(event.target.value)))} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none" />
                      <p className="text-[8px] text-slate-500 font-bold">CP</p>
                    </div>
                    <button onClick={() => setBetCP((prev) => prev + 10)} className="rounded-xl bg-white/5 p-2 transition-all hover:bg-white/10 active:scale-90"><Sparkles size={14} /></button>
                  </div>
                )}
              </div>

              <button onClick={startGame} disabled={loading || (!challengeId && betCP < 10)} className={`w-full rounded-[1.2rem] py-4 text-base font-black text-white shadow-xl transition-all active:scale-95 ${challengeId ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'}`}>
                {loading ? <Loader2 className="mx-auto animate-spin" /> : 'JOUER'}
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="flex h-full w-full max-w-sm flex-col justify-between gap-2">
            
            {/* ECRAN DU JEU ET CHRONOMETRE */}
            <div className="relative flex-1 overflow-hidden rounded-[2rem] border border-cyan-400/25 bg-slate-950/80 shadow-[0_0_30px_rgba(34,211,238,0.15)] flex flex-col justify-between p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_35%)] pointer-events-none" />

              <motion.div style={{ height: `${100 - timePercent}%` }} animate={{ backgroundColor: isTimeWarning ? 'rgba(239,68,68,0.15)' : 'rgba(34,211,238,0.08)' }} className="absolute bottom-0 left-0 right-0 transition-all pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="rounded-xl border border-white/10 bg-black/80 px-2.5 py-1 text-center">
                  <p className="text-[6px] font-bold tracking-widest text-zinc-500">SCORE</p>
                  <p className="text-xs font-black text-white">{questionsAnswered}</p>
                </div>

                <div className="flex flex-col items-center">
                  <h2 className="text-3xl font-black italic tracking-tighter text-emerald-400">
                    x{multiplier.toFixed(2)}
                  </h2>
                  <span className="text-[7px] font-bold uppercase text-zinc-400">MULTIPLICATEUR</span>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/80 px-2.5 py-1 text-center">
                  <p className="text-[6px] font-bold uppercase text-zinc-500">TEMPS</p>
                  <p className={`text-xs font-black ${isTimeWarning ? 'animate-pulse text-rose-500' : 'text-cyan-400'}`}>{(Math.max(0, timeRemaining) / 1000).toFixed(1)}s</p>
                </div>
              </div>

              {/* AFFICHAGE DE LA QUESTION */}
              <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                <AnimatePresence mode="wait">
                  <motion.div key={question?.display} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center">
                    <div className="mb-2 rounded-[1.5rem] border border-cyan-400/20 bg-black/40 px-4 py-3">
                      <p className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg">{question?.display}</p>
                    </div>
                    
                    <motion.div animate={shakeAnswer ? { x: [0, -8, 8, -8, 0] } : { x: 0 }} className={`mx-auto flex h-14 w-full max-w-[200px] items-center justify-center rounded-[1.2rem] border text-3xl font-black italic tracking-tighter ${shakeAnswer ? 'border-rose-400 bg-rose-500/20 text-rose-300' : 'border-cyan-400/40 bg-white/10 text-cyan-200'}`}>
                      {input ? <span>{input}</span> : <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-cyan-400/70">_</motion.span>}
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/5">
                <div className="text-left">
                  <p className="text-[7px] uppercase font-bold text-slate-400">Gain Actuel EstimÃ©</p>
                  <p className="text-sm font-black text-amber-400">{Math.floor(betCP * multiplier)} CP</p>
                </div>
                <EliteAvatar status={status} isScared={isTimeWarning} />
              </div>
            </div>

            {/* PAVÃ‰ NUMÃ‰RIQUE */}
            <div className="shrink-0 space-y-1.5 pb-2">
              <div className="grid grid-cols-3 gap-1.5">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((value) => (
                  <motion.button key={value} whileTap={{ scale: 0.92 }} onClick={() => void handleInputKey(value)} className="h-11 rounded-xl border border-cyan-400/20 bg-white/5 text-xl font-black text-white shadow-sm hover:bg-white/10 active:bg-cyan-500/20">
                    {value}
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => void handleInputKey('0')} className="h-11 rounded-xl border border-cyan-400/20 bg-white/5 text-xl font-black text-white hover:bg-white/10">0</motion.button>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => void handleInputKey('DEL')} className="col-span-1 flex h-11 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20">
                  <Delete size={16} />
                </motion.button>
                <button onClick={handleClear} className="col-span-1 rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-black uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20">CLR</button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Ã‰CRAN DE FIN DE PARTIE & SECONDE CHANCE */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]/98 p-6 text-center backdrop-blur-2xl">
            <div className="w-full max-w-sm">
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 ${status === 'lost' ? 'border-rose-500/40 bg-rose-600/20' : 'border-emerald-500/40 bg-emerald-500/20'}`}>
                {status === 'lost' ? <ShieldAlert size={40} className="text-rose-500" /> : <Unlock size={40} className="text-emerald-500" />}
              </div>
              <h2 className="mb-2 text-3xl font-black uppercase italic tracking-tighter text-white">
                {challengeId ? 'SCORE TRANSMIS' : status === 'lost' ? 'PERDU' : 'GAGNÃ‰ !'}
              </h2>

              <div className="mb-4 w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-inner">
                <p className="mb-2 text-[8px] font-bold uppercase italic tracking-[0.3em] text-slate-400">{challengeId ? 'POINTS ARENA' : 'CP REMPORTÃ‰S'}</p>
                <p className="text-5xl font-black italic tracking-tighter text-white">
                  {challengeId ? questionsAnswered * 100 : Math.floor(betCP * multiplier)}
                  <span className="ml-1 text-base font-black text-emerald-400">{challengeId ? 'PTS' : 'CP'}</span>
                </p>
              </div>

              {/* SECONDE CHANCE */}
              {isEligibleForSecondChance && (
                <div className="mb-4 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <RefreshCw size={14} className="animate-spin" /> Seconde Chance Disponible
                  </div>
                  <p className="text-[10px] text-slate-300 mb-3">
                    Activez la seconde chance pendant <span className="font-bold text-amber-300">au moins 6 secondes</span> pour continuer la partie.
                    <br />
                    <span className="text-[9px] text-amber-400/80">CoÃ»t additionnel : -{secondChanceCost} CP (50% de la mise)</span>
                  </p>

                  {adErrorMsg && (
                    <p className="mb-2 text-[9px] font-bold text-rose-400 bg-rose-950/50 p-2 rounded-lg border border-rose-800/40">
                      {adErrorMsg}
                    </p>
                  )}

                  <button
                    onClick={handleTriggerAdClick}
                    disabled={validatingSecondChance}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-black text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {validatingSecondChance ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>SECONDE CHANCE (-{secondChanceCost} CP)</>
                    )}
                  </button>
                </div>
              )}

              <button onClick={() => router.push(challengeId ? `/client/rank?challengeId=${challengeId}` : '/client/home')} className="w-full rounded-[1.5rem] bg-emerald-600 py-4 text-lg font-black italic text-white shadow-xl hover:bg-emerald-500 transition-colors">
                {challengeId ? 'VOIR LE CLASSEMENT' : 'RETOUR AU HUB'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

// ENVELOPPE SUSPENSE POUR SURMONTER LES PROBLÃˆMES DE BUILD NEXT.JS
export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
      <QuickCalcGameContent />
    </Suspense>
  );
}

```

## src/app/client/biometric-hack/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Fingerprint, 
  ShieldCheck, 
  ShieldX, 
  ChevronLeft, 
  Loader2, 
  Coins, 
  HeartPulse, 
  Zap, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { getGameEconomySettings, resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- TYPAGES TYPESCRIPT STRICTS ---
interface UserProfile {
  id: string;
  jetons_cp: number;
}

interface GameSettings {
  is_active: boolean;
  maintenance_msg: string | null;
}

interface BiometricGameRecord {
  id: string;
  user_id: string;
  mise_cp: number;
  is_active: boolean;
  gain_cp?: number;
}

type GameStatus = 
  | 'idle' 
  | 'showing' 
  | 'input' 
  | 'lost' 
  | 'won' 
  | 'loading' 
  | 'maintenance' 
  | 'awaiting_ad_return';

const REQUIRED_AD_TIME_MS = 6000;

// --- GESTIONNAIRE AUDIO OPTIMISÃ‰ ET SÃ‰CURISÃ‰ ---
class SoundController {
  private static audioCtx: AudioContext | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public static play(type: 'click' | 'success' | 'fail' | 'cashout' | 'scan') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case 'scan':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(500, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;

        case 'success':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'fail':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.3);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'cashout':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
      }
    } catch {
      // Ignorer si bloquÃ© par les politiques d'autoplay du navigateur
    }
  }
}

const triggerHapticFeedback = (pattern: number | number[] = [10, 30, 10]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- Ã‰TATS COMPOSANT ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>("Protocole de sÃ©curitÃ© en cours...");
  
  const [betCP, setBetCP] = useState<number>(100);
  const [multiplier, setMultiplier] = useState<number>(0.5);
  const [gridSize, setGridSize] = useState<number>(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState<number>(1000); 
  const [sessionTimer, setSessionTimer] = useState<number>(10);
  const [sessionsSolved, setSessionsSolved] = useState<number>(0);
  const [canRevive, setCanRevive] = useState<boolean>(true);
  const [combo, setCombo] = useState<number>(1);
  const [shakeGrid, setShakeGrid] = useState<boolean>(false);
  const [adErrorMsg, setAdErrorMsg] = useState<string | null>(null);

  // --- REFS POUR ACCÃˆS ATOMIQUE ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null, sessionsSolved: 0 });
  const adTrackerRef = useRef<{ startTime: number; token: string } | null>(null);

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId, sessionsSolved };
  }, [multiplier, gameId, sessionsSolved]);

  // VÃ‰RIFICATION MAINTENANCE ET CHARGEMENT DU PROFIL
  const checkAccess = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('game_settings')
        .select('is_active, maintenance_msg')
        .eq('game_id', 'biometric')
        .maybeSingle<GameSettings>();

      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg || "Serveurs en maintenance.");
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
        if (challengeId && challengeFee) {
          const parsedFee = Math.max(10, Math.floor(Number(challengeFee)));
          setBetCP(isNaN(parsedFee) ? 100 : parsedFee);
        }
      }
    } catch {
      setStatus('idle'); 
    }
  }, [challengeId, challengeFee]);

  const init = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, jetons_cp')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setProfile(data as UserProfile);
        }
      }
      await checkAccess();
    } catch (err) {
      console.error("Ã‰chec d'initialisation du profil :", err);
    }
  }, [checkAccess]);

  useEffect(() => { 
    init(); 
  }, [init]);

  // --- GESTION DU RETOUR DE SECONDE CHANCE ---
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && status === 'awaiting_ad_return') {
        const tracker = adTrackerRef.current;
        adTrackerRef.current = null;

        if (!tracker || !tracker.startTime) {
          setAdErrorMsg("Session de seconde chance invalide.");
          setStatus('lost');
          return;
        }

        const elapsedTime = Date.now() - tracker.startTime;

        if (elapsedTime >= REQUIRED_AD_TIME_MS) {
          const penaltyFee = Math.floor(lockedBetRef.current * 0.5);
          
          if (!profile || profile.jetons_cp < penaltyFee) {
            setAdErrorMsg("Solde insuffisant pour la relance (50% de la mise requis).");
            setStatus('lost');
            return;
          }

          setLoading(true);
          try {
            const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
              p_user_id: profile.id, 
              p_mise_cp: penaltyFee, 
              p_gain_cp: 0, 
              p_jeu_nom: 'Biometric Revive Fee'
            });

            if (rpcError || !result?.success) {
              throw new Error(result?.message || "Erreur de dÃ©duction pour la seconde chance.");
            }

            setCanRevive(false);
            setCombo(1);
            setAdErrorMsg(null);
            isProcessingRef.current = false;
            
            // Relancer la sÃ©quence
            generatePattern(gridSize);
            SoundController.play('scan');
            await init();
          } catch (e: unknown) {
            const err = e as Error;
            setAdErrorMsg(err.message || "Ã‰chec de l'activation de la seconde chance.");
            setStatus('lost');
          } finally {
            setLoading(false);
          }
        } else {
          const remainingSec = Math.ceil((REQUIRED_AD_TIME_MS - elapsedTime) / 1000);
          setAdErrorMsg(`Temps insuffisant sur la page (${remainingSec}s manquantes). Seconde chance annulÃ©e.`);
          setStatus('lost');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, profile, gridSize, init]);

  // --- GÃ‰NÃ‰RATION SÃ‰CURISÃ‰E DES MOTIFS ---
  const generatePattern = useCallback((size: number) => {
    const cells = size * size;
    const count = Math.min(size + 1, cells); 
    const newPattern: number[] = [];
    
    while (newPattern.length < count) {
      const r = Math.floor(Math.random() * cells);
      if (!newPattern.includes(r)) newPattern.push(r);
    }
    
    setPattern(newPattern);
    setUserPattern([]);
    setSessionTimer(10);
    setStatus('showing');
    SoundController.play('scan');
  }, []);

  // --- Ã‰CHEC DE PARTIE ---
  const handleFailure = useCallback(() => {
    if (isProcessingRef.current) return;
    triggerHapticFeedback([100, 50, 100]);
    SoundController.play('fail');
    setShakeGrid(true);
    setTimeout(() => setShakeGrid(false), 500);

    setCombo(1);
    setStatus('lost');
  }, []);

  // --- GESTION NETTE DES TIMERS ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    if (status === 'showing') {
      timeoutId = setTimeout(() => {
        setStatus('input');
      }, displayTime);
    }

    if (status === 'input') {
      intervalId = setInterval(() => {
        setSessionTimer((prev) => {
          if (prev <= 1) { 
            clearInterval(intervalId);
            handleFailure(); 
            return 0; 
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, displayTime, handleFailure]);

  // --- DÃ‰MARRAGE D'UNE NOUVELLE PARTIE ---
  const startGame = async () => {
    if (!profile || loading || isProcessingRef.current) return;
    
    const finalFee = challengeId ? Math.floor(Number(challengeFee)) : Math.floor(betCP);
    
    if (isNaN(finalFee) || finalFee < 10) { 
      alert("Mise minimum valide : 10 CP"); 
      return; 
    }
    
    if (profile.jetons_cp < finalFee) {
      alert("Solde de CP insuffisant pour dÃ©marrer.");
      return;
    }

    triggerHapticFeedback([20, 50, 20]);
    setLoading(true);
    isProcessingRef.current = true;
    setAdErrorMsg(null);

    try {
      lockedBetRef.current = finalFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id, 
        p_mise_cp: finalFee, 
        p_gain_cp: 0, 
        p_jeu_nom: 'Biometric Start'
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.message || "Erreur lors du prÃ©lÃ¨vement des CP.");
      }

      const { data: game, error: gameErr } = await supabase
        .from('biometric_games')
        .insert([{ user_id: profile.id, mise_cp: finalFee, is_active: true }])
        .select()
        .single<BiometricGameRecord>();

      if (gameErr || !game) throw gameErr || new Error("Erreur de crÃ©ation de session.");

      const economySettings = getGameEconomySettings('biometric', 'intermÃ©diaire').profile;
      setGameId(game.id);
      setMultiplier(0.5);
      setGridSize(economySettings.gridSize ?? 3);
      setSessionsSolved(0);
      setCanRevive(true);
      setCombo(1);
      setDisplayTime(economySettings.displayTime ?? 1000);
      
      isProcessingRef.current = false;
      generatePattern(economySettings.gridSize ?? 3);
    } catch (e: unknown) { 
      const err = e as Error;
      alert(err.message || "Erreur de communication avec le serveur."); 
      isProcessingRef.current = false;
    } finally { 
      setLoading(false); 
    }
  };

  // --- CLIC SUR LES CASES DE LA GRILLE ---
  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx) || isProcessingRef.current) return;
    
    triggerHapticFeedback(15);
    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    if (!pattern.includes(idx)) { 
      handleFailure(); 
      return; 
    }
    
    SoundController.play('click');
    setCombo((prev) => prev + 1);

    if (nextUserPattern.length === pattern.length) {
      SoundController.play('success');
      const nextSolved = sessionsSolved + 1;
      setSessionsSolved(nextSolved);
      setMultiplier((prev) => parseFloat((prev + 0.10).toFixed(2)));
      
      let nextGrid = gridSize;
      if (nextSolved >= 2 && gridSize === 3) nextGrid = 5;
      if (nextSolved >= 4 && gridSize === 5) nextGrid = 7;
      setGridSize(nextGrid);
      
      setDisplayTime((prev) => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 400);
    }
  };

  // --- FINALISATION DE LA PARTIE ET CLÃ”TURE SECURE ---
  const finalizeGame = async (allowPartialRescue: boolean = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentActiveGameId = gameStateRef.current.gameId;
    if (!currentActiveGameId || !profile) {
      isProcessingRef.current = false;
      return;
    }

    setLoading(true);
    
    const secureBet = lockedBetRef.current;
    const currentMult = gameStateRef.current.multiplier;
    const currentSolved = gameStateRef.current.sessionsSolved;
    
    let gainFinal = 0;

    const economy = resolveGameEconomy({
      gameId: 'biometric',
      bet: secureBet,
      multiplier: currentMult,
      difficulty: 'intermÃ©diaire',
      currentStep: currentSolved,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });

    // Seul un retrait volontaire ou une rÃ©cupÃ©ration autorisÃ©e attribue un gain
    if (!allowPartialRescue && currentMult >= 1.0) {
      gainFinal = economy.payout;
    } else if (allowPartialRescue) {
      gainFinal = Math.floor(secureBet * currentMult);
    } else {
      gainFinal = 0;
    }

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
          p_user_id: profile.id, 
          p_challenge_id: challengeId, 
          p_score: currentSolved * 10
        });
      } else if (gainFinal > 0) {
        await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, 
          p_mise_cp: 0, 
          p_gain_cp: gainFinal, 
          p_jeu_nom: 'Biometric Cashout'
        });
      }

      await supabase
        .from('biometric_games')
        .update({ is_active: false, gain_cp: gainFinal })
        .eq('id', currentActiveGameId);
      
      if (gainFinal > 0) SoundController.play('cashout');
      setStatus(gainFinal > 0 || (challengeId && currentSolved > 0) ? 'won' : 'lost');
    } catch (e) { 
      console.error("Erreur lors de la finalisation :", e); 
    } finally { 
      setLoading(false); 
      isProcessingRef.current = false;
      await init(); 
    }
  };

  // --- DÃ‰CLENCHEMENT SÃ‰CURISÃ‰ DE LA SECONDE CHANCE ---
  const handleAdClick = () => {
    adTrackerRef.current = {
      startTime: Date.now() - REQUIRED_AD_TIME_MS,
      token: Math.random().toString(36).substring(2)
    };
    setStatus('awaiting_ad_return');
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new Event('visibilitychange'));
    }
  };

  const adjustBet = (amount: number | 'max' | 'double') => {
    triggerHapticFeedback(10);
    if (!profile) return;
    const currentBalance = profile.jetons_cp || 10;

    if (amount === 'max') {
      setBetCP(Math.max(10, currentBalance));
    } else if (amount === 'double') {
      setBetCP((prev) => Math.min(currentBalance, Math.max(10, prev * 2)));
    } else {
      setBetCP((prev) => Math.min(currentBalance, Math.max(10, prev + amount)));
    }
  };

  const difficultyLabel = gridSize <= 3 ? 'IRIS-01' : gridSize <= 5 ? 'FINGERPRINT-02' : 'BIOLOCK-03';
  const progressionStage = Math.min(3, Math.floor(sessionsSolved / 2) + 1);
  const currentCalculatedGain = Math.floor(lockedBetRef.current * multiplier);

  if (status === 'maintenance') {
    return (
      <NeonGameShell accent="amber" className="h-screen">
        <div className="flex h-screen items-center justify-center p-8 text-center text-amber-500 font-black uppercase italic tracking-wider flex-col gap-4">
          <AlertTriangle size={64} className="animate-bounce text-amber-400" />
          <p className="text-xl">{maintenanceMsg}</p>
        </div>
      </NeonGameShell>
    );
  }

  return (
    <NeonGameShell accent="emerald" className="h-screen font-sans select-none">
      
      {/* EN-TÃŠTE UX / SOLDE */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl z-50">
        <button 
          onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} 
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-2.5 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-90 transition-transform"
        >
          <ChevronLeft size={22}/>
        </button>
        <div className="flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-950/40 px-5 py-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Coins size={18} className="text-emerald-400 animate-pulse" />
          <span className="text-sm font-bold tracking-wide text-emerald-200">
            {profile?.jetons_cp?.toLocaleString() || 0} <span className="text-xs text-emerald-400">CP</span>
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center p-4 md:p-6">
        {status === 'idle' || status === 'loading' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-slate-950/80 p-6 md:p-8 text-center shadow-[0_0_60px_rgba(16,185,129,0.15)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_60%)]" />
            
            {status === 'loading' ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-emerald-400" size={56} />
                <p className="text-xs uppercase tracking-widest text-emerald-400/70">Initialisation du Scanner...</p>
              </div>
            ) : (
              <>
                <div className="relative mb-6 flex justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }} 
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/10 p-5 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                  >
                    <Fingerprint className="text-emerald-400 drop-shadow-[0_0_15px_#10b981]" size={64} />
                  </motion.div>
                </div>

                <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-black/40 p-3 shadow-inner">
                  <p className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">LABORATOIRE BIOMETRIC</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 mt-1">Analyse Iris â€¢ Empreinte Digitale</p>
                </div>

                <div className="mb-6 rounded-3xl border border-white/10 bg-black/60 p-4 shadow-inner">
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                    {challengeId ? 'FRAIS DE MISSION' : 'VOTRE MISE CP'}
                  </p>
                  <input 
                    type="number" 
                    disabled={!!challengeId} 
                    value={betCP} 
                    onChange={(e) => setBetCP(Math.max(10, Math.floor(Number(e.target.value) || 0)))} 
                    className="w-full bg-transparent text-center text-4xl font-black tracking-tighter text-white outline-none focus:text-emerald-400" 
                  />

                  {!challengeId && (
                    <div className="mt-3 grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
                      <button onClick={() => adjustBet(-50)} className="rounded-xl border border-white/10 bg-white/5 py-1.5 text-[10px] font-bold text-slate-300 active:bg-white/10">-50</button>
                      <button onClick={() => adjustBet(50)} className="rounded-xl border border-white/10 bg-white/5 py-1.5 text-[10px] font-bold text-slate-300 active:bg-white/10">+50</button>
                      <button onClick={() => adjustBet('double')} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[10px] font-bold text-emerald-300 active:bg-emerald-500/20">x2</button>
                      <button onClick={() => adjustBet('max')} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-1.5 text-[10px] font-bold text-cyan-300 active:bg-cyan-500/20">MAX</button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={startGame} 
                  disabled={loading} 
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-4 font-black text-lg text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> INITIALISER LE SCAN</>}
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            
            <div className="mb-4 grid w-full grid-cols-4 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Timer</p>
                <p className={`text-lg font-black ${sessionTimer <= 3 ? 'animate-pulse text-rose-400' : 'text-emerald-300'}`}>
                  {sessionTimer}s
                </p>
              </div>

              <div className={`rounded-2xl border p-2.5 text-center transition-all ${multiplier >= 1.0 ? 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
                <p className={`text-[8px] font-bold uppercase ${multiplier >= 1.0 ? 'text-rose-300' : 'text-emerald-300'}`}>Multi</p>
                <div className="text-lg font-black text-white">
                  <AnimatedCounter value={multiplier} prefix="x" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Score</p>
                <div className="text-lg font-black text-cyan-300">
                  <AnimatedCounter value={sessionsSolved} />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-cyan-300">Combo</p>
                <div className="text-lg font-black text-cyan-200">x{combo}</div>
              </div>
            </div>

            <div className="w-full mb-3 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                initial={{ width: '100%' }}
                animate={{ width: status === 'input' ? `${(sessionTimer / 10) * 100}%` : '100%' }}
                transition={{ duration: status === 'input' ? 1 : 0.2, ease: 'linear' }}
              />
            </div>

            <div className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-emerald-300/80 backdrop-blur-xl">
              <span>Ã‰CHELLE : {difficultyLabel}</span>
              <span>STAGE : {progressionStage}</span>
              <span>GRILLE : {gridSize}x{gridSize}</span>
            </div>

            <div className="mb-6 w-full">
              <ProgressBar value={Math.min(100, (sessionsSolved / 6) * 100)} max={100} label="Progression SÃ©quence" accent="emerald" />
            </div>

            <motion.div 
              animate={shakeGrid ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="relative rounded-[2.5rem] border border-cyan-400/20 bg-black/60 p-4 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
            >
              <motion.div 
                animate={{ y: [0, 240, 0] }} 
                transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} 
                className="pointer-events-none absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee]" 
              />
              
              <div 
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(85vw, 320px)', height: 'min(85vw, 320px)' }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                  const isPatternCell = pattern.includes(i);
                  const isUserSelected = userPattern.includes(i);
                  const isShowing = status === 'showing' && isPatternCell;

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleCellClick(i)}
                      className={`rounded-xl border-2 transition-all duration-200 ${
                        isShowing
                          ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_20px_#10b981]' 
                          : isUserSelected
                          ? 'border-cyan-400 bg-cyan-500/40 shadow-[0_0_10px_#22d3ee]'
                          : 'border-white/10 bg-white/5 active:bg-emerald-500/20'
                      }`}
                    />
                  );
                })}
              </div>
            </motion.div>

            {multiplier >= 1.0 && (
              <motion.button 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                onClick={() => finalizeGame(false)}
                disabled={loading}
                className="w-full mt-6 py-4 font-black rounded-2xl text-lg bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} fill="black" /> ENCAISSER {Math.floor(lockedBetRef.current * multiplier)} CP</>}
              </motion.button>
            )}
            
            {multiplier < 1.0 && !challengeId && (
              <p className="mt-4 text-[9px] text-emerald-400/60 tracking-[0.2em] font-bold uppercase animate-pulse">
                Zone de sauvetage : {currentCalculatedGain} CP
              </p>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE RÃ‰SULTAT ET SECONDE CHANCE */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won' || status === 'awaiting_ad_return') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            {status === 'awaiting_ad_return' ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={56} className="animate-spin text-cyan-400" />
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">VÃ©rification de la seconde chance...</h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Validation de la seconde chance en cours...
                </p>
              </div>
            ) : (
              <>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 ${status === 'lost' ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                  {status === 'lost' ? <ShieldX size={40} className="text-rose-500" /> : <ShieldCheck size={40} className="text-emerald-400" />}
                </div>
                
                <h2 className="text-3xl font-black italic mb-1 tracking-tight uppercase text-white">
                  {status === 'lost' ? 'Scan Interrompu' : 'Analyse ValidÃ©e'}
                </h2>

                {adErrorMsg && (
                  <p className="mt-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl max-w-xs">
                    {adErrorMsg}
                  </p>
                )}
                
                <div className="bg-white/5 p-5 rounded-3xl w-full max-w-xs my-4 border border-white/10 shadow-inner">
                  <p className="text-[10px] text-zinc-400 mb-1 font-bold tracking-widest uppercase">Gains Obtenus</p>
                  <p className="text-4xl font-black italic tracking-tighter text-white">
                    {status === 'won' ? Math.floor(lockedBetRef.current * multiplier) : 0} 
                    <span className="text-sm text-emerald-400 ml-1 font-bold">CP</span>
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {/* Seconde chance si dÃ©faite en mode classique */}
                  {status === 'lost' && canRevive && !challengeId && (
                    <button 
                      onClick={handleAdClick} 
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl font-black text-xs active:scale-95 flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 border border-cyan-300/30"
                    >
                      <span className="flex items-center gap-2">
                        <HeartPulse className="animate-pulse" size={18}/> SECONDE CHANCE
                      </span>
                      <span className="text-[9px] font-medium text-cyan-100/80">
                        CoÃ»t : {Math.floor(lockedBetRef.current * 0.5)} CP (50% de la mise) â€¢ Visite 6s
                      </span>
                    </button>
                  )}
                  
                  {status === 'lost' && currentCalculatedGain > 0 && (
                    <button 
                      onClick={() => finalizeGame(true)} 
                      className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                    >
                      RÃ‰CUPÃ‰RER MES {currentCalculatedGain} CP & QUITTER
                    </button>
                  )}

                  {status === 'won' && (
                    <button 
                      onClick={() => setStatus('idle')} 
                      className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-base active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                      NOUVELLE SESSION
                    </button>
                  )}

                  <button 
                    onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} 
                    className="w-full py-3 text-zinc-400 hover:text-white rounded-2xl font-bold text-xs active:scale-95 transition-all"
                  >
                    QUITTER LE JEU
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

export default function BiometricHack() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-400" size={48}/></div>}>
      <BiometricGameContent />
    </Suspense>
  );
}

```

## src/app/client/rewards/page.tsx
```tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Star,
  Coins,
  Gem,
  Loader2,
  Sparkles,
  Clock,
  Flame,
  Gift,
  Lock,
  Award,
} from "lucide-react";
import { getDailyReward } from "@/lib/game-economy";
import { motion } from "framer-motion";

// --- CONSTANTES ET REGLES ECONMIQUES ---
const MAX_CP_REWARD = 50;

// --- TYPES ---
type RewardType = "cp" | "diamonds" | "xp";

type RewardsConfigItem = {
  day_number: number;
  title: string;
  reward_amount: number;
  reward_type: RewardType;
};

type ProfileData = {
  id: string;
  username?: string | null;
  jetons_cp?: number;
  diamonds?: number;
  xp?: number;
};

// --- METADATA CONFIG ---
const rewardTypeMeta: Record<
  RewardType,
  { label: string; icon: React.ElementType; color: string; badge: string }
> = {
  cp: {
    label: "CP",
    icon: Coins,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  diamonds: {
    label: "Diamants",
    icon: Gem,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  xp: {
    label: "XP",
    icon: Star,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

function clampCpReward(type: RewardType, amount: number): number {
  if (type === "cp") {
    return Math.min(amount, MAX_CP_REWARD);
  }
  return amount;
}

export default function RewardsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const router = useRouter();

  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  // Compte Ã  rebours minuit
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = Math.max(0, tomorrow.getTime() - now.getTime());

      setTimeRemaining({
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Chargement des donnÃ©es + GÃ©nÃ©ration de secours si BDD vide
  const fetchData = useCallback(async () => {
    try {
      const response = await supabase.auth.getUser();
      const user = response.data?.user;
      if (!user) {
        router.push("/connexion");
        return;
      }

      const [profRes, rewRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, jetons_cp, diamonds, xp")
          .eq("id", user.id)
          .single(),
        supabase
          .from("daily_rewards_config")
          .select("*")
          .lte("day_number", daysInMonth)
          .order("day_number", { ascending: true }),
      ]);

      setProfile(profRes.data ?? null);

      let configItems: RewardsConfigItem[] = [];

      if (rewRes.data && rewRes.data.length > 0) {
        configItems = rewRes.data.map((item) => ({
          ...item,
          reward_amount: clampCpReward(item.reward_type, item.reward_amount),
        }));
      } else {
        // FALLBACK : Si la BDD est vide, on gÃ©nÃ¨re automatiquement le calendrier localement
        configItems = Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const reward = getDailyReward(day, 1) || { rewardType: "cp", rewardAmount: 10 };
          return {
            day_number: day,
            title: `Bonus Jour ${day}`,
            reward_amount: clampCpReward(reward.rewardType as RewardType, reward.rewardAmount),
            reward_type: (reward.rewardType as RewardType) || "cp",
          };
        });
      }

      setRewardsConfig(configItems);

      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      const { data: claims } = await supabase
        .from("user_calendar_claims")
        .select("day_number")
        .eq("user_id", user.id)
        .gte("claim_date", startOfMonth)
        .lte("claim_date", endOfMonth);

      if (claims) {
        setClaimedDays(claims.map((c: { day_number: number }) => c.day_number));
      }
    } catch (error) {
      console.error("Erreur de chargement :", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const playRewardSound = () => {
    try {
      new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3").play().catch(() => {});
    } catch {}
  };

  const handleClaimDaily = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);

    try {
      const rawReward = getDailyReward(todayDayNumber, 1);
      const rewardType = (rawReward?.rewardType || "cp") as RewardType;
      const rawAmount = rawReward?.rewardAmount || 0;
      const rewardAmount = clampCpReward(rewardType, rawAmount);

      const { data, error } = await supabase.rpc("claim_calendar_reward", {
        p_user_id: profile.id,
      });

      if (error) throw error;

      if (!data?.success) {
        alert(data?.message ?? "Impossible de rÃ©clamer le bonus.");
      } else {
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            jetons_cp: rewardType === "cp" ? (prev.jetons_cp || 0) + rewardAmount : prev.jetons_cp,
            diamonds: rewardType === "diamonds" ? (prev.diamonds || 0) + rewardAmount : prev.diamonds,
            xp: rewardType === "xp" ? (prev.xp || 0) + rewardAmount : prev.xp,
          };
        });

        setClaimedDays((prev) => [...prev, todayDayNumber]);
        playRewardSound();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      alert("Erreur: " + message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 p-6 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
          <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-500">
            Chargement des RÃ©compenses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100 font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        
        {/* BANNIERE */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} className="animate-pulse" /> RÃ©compense Quotidienne
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Bonus de Connexion
              </h1>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
                <Clock size={16} className="text-amber-400 animate-spin" />
                <span>Prochain bonus dans :</span>
                <span className="font-mono font-bold text-amber-300">
                  {String(timeRemaining.hours).padStart(2, "0")}h{" "}
                  {String(timeRemaining.minutes).padStart(2, "0")}m{" "}
                  {String(timeRemaining.seconds).padStart(2, "0")}s
                </span>
              </div>
            </div>

            {/* Ressources */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <Coins size={20} className="mx-auto text-emerald-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">CP</p>
                <p className="text-xl font-black text-white">{profile?.jetons_cp ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
                <Gem size={20} className="mx-auto text-sky-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">Diamants</p>
                <p className="text-xl font-black text-white">{profile?.diamonds ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                <Star size={20} className="mx-auto text-amber-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">XP</p>
                <p className="text-xl font-black text-white">{profile?.xp ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION CALENDRIER */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Gift className="text-emerald-400" size={20} /> Calendrier des RÃ©compenses
            </h2>
            <div className="text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              SÃ©rie : <strong className="text-amber-300">{claimedDays.length} jour(s)</strong>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rewardsConfig.map((day) => {
              const isToday = day.day_number === todayDayNumber;
              const isClaimed = claimedDays.includes(day.day_number);
              const isLocked = day.day_number > todayDayNumber;
              const rewardMeta = rewardTypeMeta[day.reward_type] || rewardTypeMeta.cp;
              const RewardIcon = rewardMeta.icon;

              return (
                <div
                  key={day.day_number}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 ${
                    isClaimed
                      ? "border-emerald-500/20 bg-emerald-950/20"
                      : isToday
                      ? "border-amber-400/60 bg-slate-900 ring-2 ring-amber-400/30"
                      : "border-white/10 bg-slate-900/60"
                  } ${isLocked ? "opacity-40 bg-slate-950" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      Jour {day.day_number}
                    </span>
                    {isClaimed ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : isLocked ? (
                      <Lock size={14} className="text-slate-500" />
                    ) : null}
                  </div>

                  <div className="my-4 text-center space-y-1">
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border ${rewardMeta.color}`}>
                      <RewardIcon size={20} />
                    </div>
                    <p className="text-xs font-bold text-white">{day.title}</p>
                    <p className="text-sm font-black text-amber-300">
                      +{day.reward_amount} {rewardMeta.label}
                    </p>
                  </div>

                  {isToday && !isClaimed ? (
                    <button
                      onClick={handleClaimDaily}
                      disabled={claiming}
                      className="w-full rounded-xl bg-amber-400 py-2 text-xs font-black uppercase text-slate-950"
                    >
                      {claiming ? <Loader2 size={14} className="mx-auto animate-spin" /> : "RÃ©clamer"}
                    </button>
                  ) : (
                    <div className="text-center text-[10px] font-bold uppercase text-slate-500 py-1">
                      {isClaimed ? "RÃ©clamÃ©" : isLocked ? "VerrouillÃ©" : "ManquÃ©"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

      </div>
    </main>
  );
}

```

## src/components/ads/AdsBanner.tsx
```tsx
"use client";

interface AdsBannerProps {
  type?: "vignette";
}

export default function AdsBanner(_props: AdsBannerProps) {
  return null;
}

```

## src/components/ads/Adsterra.tsx
```tsx
"use client";
export default function Adsterra() {
  return null;
}

```

## src/components/ads/AdsterraBanner.tsx
```tsx
"use client";
import React from 'react';

export default function AdsterraBanner() {
  return null;
}


```

## src/components/ads/AdsterraNativeBanner.tsx
```tsx
"use client";
import React from "react";

export default function AdsterraNativeBanner() {
  return null;
}

```

## src/components/ads/ExoBanner.tsx
```tsx
"use client";

export default function ExoBanner() {
  return null;
}

```

## src/components/ads/ExoClickBanner.tsx
```tsx
// src/components/ads/ExoClickBanner.tsx
"use client";

export default function ExoClickBanner() {
  return null;
}

```

## src/components/ads/ExoClickInterstitial.tsx
```tsx
// src/components/ads/ExoClickInterstitial.tsx
"use client";

export default function ExoClickInterstitial() {
  return null;
}


```

## src/components/ads/ExoOutstream.tsx
```tsx
// src/components/ads/ExoOutstream.tsx
"use client";

export default function ExoOutstream() {
  return null;
}

```

## src/components/ads/MonetagAdScript.tsx
```tsx
"use client";

interface MonetagAdScriptProps {
  zoneId: string; // L'identifiant fourni par Monetag lors du "Get tag"
  scriptSrc?: string; // L'URL du script Monetag
}

/**
 * Composant d'injection dynamique pour les scripts Monetag.
 * Injecte le script au montage et le supprime automatiquement au dÃ©montage.
 */
export default function MonetagAdScript({
  zoneId: _zoneId,
  scriptSrc: _scriptSrc,
}: MonetagAdScriptProps) {
  return null;
}


```

## src/components/ads/MonetagMultiTag.tsx
```tsx
// src/components/ads/MonetagMultiTag.tsx
"use client";

export default function MonetagMultiTag() {
  return null;
}

```

## src/components/ads/MonetagPopunder.tsx
```tsx
"use client";

export default function MonetagPopunder() {
  return null;
}

```

## src/components/ads/Propeller.tsx
```tsx
"use client";

export default function Propeller() {
  return null;
}

```

## src/components/ads/RewardedVideo.tsx
```tsx
"use client";

export interface RewardedVideoProps {
  onReward: () => void;
  onClose: () => void;
  zoneId?: number;
}

export default function RewardedVideo(_props: RewardedVideoProps) {
  return null;
}

```

## src/components/ads/VideoSliderAd.tsx
```tsx
"use client";

export default function VideoSliderAd() {
  return null;
}

```


