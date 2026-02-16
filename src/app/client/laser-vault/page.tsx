"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  Unlock,
  Lock,
  ChevronLeft,
  Loader2,
  ServerOff,
  Coins,
  Zap,
  Trophy,
  Minus,
  Plus,
} from "lucide-react";

/* ========================= */
/* AUDIO */
/* ========================= */

const playSound = (type: "beep" | "error" | "win") => {
  if (typeof window === "undefined") return;

  try {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "beep") {
      osc.frequency.setValueAtTime(880, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }

    if (type === "error") {
      osc.frequency.setValueAtTime(110, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    if (type === "win") {
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.exponentialRampToValueAtTime(1046, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {}
};

/* ========================= */
/* AVATAR */
/* ========================= */

const EliteAvatar = ({
  status,
  isScared,
}: {
  status: string;
  isScared: boolean;
}) => (
  <motion.div
    className="relative w-10 h-16"
    animate={status === "lost" ? { rotate: 90, opacity: 0 } : {}}
  >
    <motion.div
      animate={isScared ? { x: [-1, 1, -1] } : {}}
      transition={{ repeat: Infinity, duration: 0.1 }}
      className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg"
    />
  </motion.div>
);

/* ========================= */
/* GAME */
/* ========================= */

function LaserVaultGame() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const challengeId = searchParams.get("challengeId");
  const challengeFee = searchParams.get("fee");

  /* ========================= */
  /* STATES */
  /* ========================= */

  const [profile, setProfile] = useState<any>(null);

  const [status, setStatus] = useState<
    "loading" | "idle" | "playing" | "won" | "lost" | "maintenance"
  >("loading");

  const [loading, setLoading] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  const [betCP, setBetCP] = useState(10);

  // 🔒 locked bet (SECURITY)
  const [lockedBet, setLockedBet] = useState(0);

  const [multiplier, setMultiplier] = useState(0.5);
  const [laserY, setLaserY] = useState(0);

  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");

  const [gameId, setGameId] = useState<string | null>(null);

  const [questionsSolved, setQuestionsSolved] = useState(0);

  const [baseSpeed, setBaseSpeed] = useState(4);
  const [errorPenalty, setErrorPenalty] = useState(1);

  /* ========================= */
  /* SECURITY REFS */
  /* ========================= */

  const isProcessingRef = useRef(false);

  const gameStateRef = useRef({
    multiplier: 0.5,
    lockedBet: 0,
    gameId: null as string | null,
  });

  useEffect(() => {
    gameStateRef.current = {
      multiplier,
      lockedBet,
      gameId,
    };
  }, [multiplier, lockedBet, gameId]);

  /* ========================= */
  /* INIT */
  /* ========================= */

  const init = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
    }

    setStatus("idle");
    setLoadingCheck(false);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  /* ========================= */
  /* GENERATE PROBLEM */
  /* ========================= */

  const generateProblem = useCallback((mult: number) => {
    const a = Math.floor(Math.random() * 10) + 2;
    const b = Math.floor(Math.random() * 10) + 2;

    const ops = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];

    const result =
      op === "+"
        ? a + b
        : op === "-"
        ? a - b
        : a * b;

    setProblem({
      q: `${a} ${op} ${b}`,
      a: result,
    });
  }, []);

  /* ========================= */
  /* START GAME */
  /* ========================= */

  const startGame = async () => {
    if (!profile) return;

    if (betCP < 10) {
      alert("Minimum 10 CP");
      return;
    }

    if (betCP > profile.jetons_cp) {
      alert("Solde insuffisant");
      return;
    }

    setLoading(true);

    try {
      const finalBet = challengeId
        ? Number(challengeFee)
        : Math.floor(betCP);

      // 🔒 LOCK BET
      setLockedBet(finalBet);

      const { data, error } = await supabase
        .from("vault_games")
        .insert({
          user_id: profile.id,
          mise_cp: finalBet,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setGameId(data.id);

      setMultiplier(0.5);
      setLaserY(0);
      setQuestionsSolved(0);
      setErrorPenalty(1);
      setBaseSpeed(4);

      generateProblem(0.5);

      setStatus("playing");

      playSound("beep");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ========================= */
  /* FINALIZE GAME SECURE */
  /* ========================= */

  const finalizeGame = useCallback(
    async (isLaserHit: boolean) => {
      if (isProcessingRef.current) return;

      isProcessingRef.current = true;

      const { multiplier, lockedBet, gameId } =
        gameStateRef.current;

      if (!gameId || lockedBet <= 0) {
        isProcessingRef.current = false;
        return;
      }

      let gain = 0;

      if (!isLaserHit) {
        gain = Math.floor(lockedBet * multiplier);
      } else {
        gain =
          multiplier < 1
            ? Math.floor(lockedBet * multiplier)
            : 0;
      }

      try {
        await supabase
          .from("vault_games")
          .update({
            is_active: false,
            gain_cp: gain,
          })
          .eq("id", gameId);

        setStatus(gain > 0 ? "won" : "lost");

        playSound(gain > 0 ? "win" : "error");
      } catch (e) {
        console.error(e);
      }

      isProcessingRef.current = false;

      init();
    },
    [init]
  );

  /* ========================= */
  /* LASER LOOP */
  /* ========================= */

  useEffect(() => {
    if (status !== "playing") return;

    const timer = setInterval(() => {
      setLaserY((prev) => {
        if (prev >= 90) {
          finalizeGame(true);
          return 90;
        }

        return prev + baseSpeed * 0.5;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [status, baseSpeed, finalizeGame]);

  /* ========================= */
  /* INPUT */
  /* ========================= */

  const handleKey = (n: string) => {
    if (status !== "playing") return;

    const newVal = input + n;

    setInput(newVal);

    if (parseInt(newVal) === problem.a) {
      setMultiplier((m) =>
        parseFloat((m + 0.05).toFixed(2))
      );

      setLaserY(0);
      setInput("");

      generateProblem(multiplier + 0.05);
    }
  };

  /* ========================= */
  /* UI */
  /* ========================= */

  if (loadingCheck)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="h-screen flex flex-col justify-center items-center gap-6">

      <div>
        CP: {profile?.jetons_cp ?? 0}
      </div>

      {status === "idle" && (
        <>
          <input
            type="number"
            value={betCP}
            disabled={status === "playing"}
            onChange={(e) =>
              setBetCP(Number(e.target.value))
            }
          />

          <button onClick={startGame}>
            START
          </button>
        </>
      )}

      {status === "playing" && (
        <>
          <div>{problem.q}</div>

          <div>x{multiplier.toFixed(2)}</div>

          <button
            onClick={() =>
              finalizeGame(false)
            }
          >
            CASHOUT{" "}
            {Math.floor(
              lockedBet * multiplier
            )}
          </button>

          <div>
            {[1,2,3,4,5,6,7,8,9,0].map(n=>(
              <button key={n} onClick={()=>handleKey(n.toString())}>
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {(status === "won" ||
        status === "lost") && (
        <div>
          {status === "won"
            ? "WIN"
            : "LOST"}
        </div>
      )}
    </div>
  );
}

/* ========================= */
/* PAGE */
/* ========================= */

export default function LaserVaultPage() {
  return (
    <Suspense fallback={<Loader2 />}>
      <LaserVaultGame />
    </Suspense>
  );
                                      }
