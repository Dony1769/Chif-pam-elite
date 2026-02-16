"use client";
import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Zap, Trophy, Minus, Plus } from "lucide-react";

// AUDIO
const playSound = (type: "beep" | "error" | "win") => {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === "beep") { osc.frequency.setValueAtTime(880, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    if (type === "error") { osc.frequency.setValueAtTime(110, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
    if (type === "win") { osc.frequency.setValueAtTime(523, now); osc.frequency.exponentialRampToValueAtTime(1046, now + 0.5); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
  } catch {}
};

// AVATAR
const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-10 h-16" animate={status === "lost" ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
  </motion.div>
);

function LaserVaultGame() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId");
  const challengeFee = searchParams.get("fee");

  const [profile, setProfile] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; msg: string } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<"idle" | "playing" | "lost" | "won" | "maintenance" | "loading">("loading");

  const [betCP, setBetCP] = useState(10);
  const [lockedBet, setLockedBet] = useState(0);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(4);
  const [errorPenalty, setErrorPenalty] = useState(1);

  const isProcessingRef = useRef(false);
  const gameStateRef = useRef({ multiplier: 0.5, lockedBet: 0, gameId: null as string | null });

  useEffect(() => { gameStateRef.current = { multiplier, lockedBet, gameId }; }, [multiplier, lockedBet, gameId]);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    }
    try {
      const { data } = await supabase.from("game_settings").select("is_active, maintenance_msg").eq("game_id", "vault").single();
      if (data && !data.is_active) { setMaintenance({ active: true, msg: data.maintenance_msg }); setStatus("maintenance"); }
      else setStatus("idle");
    } catch { setStatus("idle"); }
    setLoadingCheck(false);
  }, []);

  useEffect(() => { init(); }, [init]);

  const generateProblem = useCallback((m: number) => {
    const d = Math.floor(m * 2.5);
    const a = Math.floor(Math.random() * (8 + d)) + 2;
    const b = Math.floor(Math.random() * (8 + d)) + 2;
    const ops = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const res = op === "+" ? a + b : op === "-" ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  }, []);

  const startGame = async () => {

    if (betCP < 10 || betCP > (profile?.jetons_cp || 0) || loading) return;

    setLoading(true);

    try {

      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      setLockedBet(finalFee);

      const { data: result, error } = await supabase.rpc("jouer_partie_cp", { p_user_id: profile.id, p_mise_cp: finalFee, p_gain_cp: 0, p_jeu_nom: "Laser Vault Solo" });
      if (error || !result.success) throw new Error(result?.message);

      const { data: game } = await supabase.from("vault_games").insert([{ user_id: profile.id, mise_cp: finalFee, is_active: true }]).select().single();

      setGameId(game.id);
      setMultiplier(0.5);
      setLaserY(0);
      setQuestionsSolved(0);
      setBaseSpeed(4);
      setErrorPenalty(1);
      setInput("");
      generateProblem(0.5);
      setStatus("playing");
      playSound("beep");

    } catch (e:any) { alert(e.message); }

    setLoading(false);
  };

  const finalizeGame = useCallback(async (isLaserHit: boolean) => {

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const { multiplier, lockedBet, gameId } = gameStateRef.current;
    if (!gameId || lockedBet <= 0) { isProcessingRef.current = false; return; }

    let gainFinal = 0;

    if (!isLaserHit) gainFinal = Math.floor(lockedBet * multiplier);
    else gainFinal = multiplier < 1 ? Math.floor(lockedBet * multiplier) : 0;

    try {

      if (gainFinal > 0) await supabase.rpc("jouer_partie_cp", { p_user_id: profile.id, p_mise_cp: 0, p_gain_cp: gainFinal, p_jeu_nom: "Vault Win" });

      await supabase.from("vault_games").update({ is_active: false, gain_cp: gainFinal }).eq("id", gameId);

      setStatus(gainFinal > 0 ? "won" : "lost");
      playSound(gainFinal > 0 ? "win" : "error");

    } catch {}

    isProcessingRef.current = false;
    init();

  }, [profile, init]);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 88) { finalizeGame(true); return 88; }
        const speedFactor = multiplier < 1 ? 0.4 : 1 + (multiplier - 1) * 0.2;
        return prev + baseSpeed * errorPenalty * speedFactor;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier, baseSpeed, errorPenalty, finalizeGame]);

  const handleKey = (num: string) => {
    if (status !== "playing") return;
    playSound("beep");
    const newVal = input + num;
    setInput(newVal);
    if (parseInt(newVal) === problem.a) {
      setQuestionsSolved(q => q + 1);
      setMultiplier(m => Number((m + 0.05).toFixed(2)));
      setLaserY(0);
      setInput("");
      setErrorPenalty(1);
      generateProblem(multiplier + 0.05);
    } else if (newVal.length >= problem.a.toString().length + 1) {
      setErrorPenalty(p => p + (multiplier < 1 ? 0.05 : 0.15));
      setInput("");
      playSound("error");
    }
  };

  if (loadingCheck) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col">

      <div className="p-4 flex justify-between bg-black/40">
        <button onClick={() => router.push("/client/home")}><ChevronLeft/></button>
        <div className="text-emerald-500 flex items-center gap-2"><Coins size={14}/>{profile?.jetons_cp || 0} CP</div>
      </div>

      {status === "idle" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-2xl text-center">

            <input
              type="number"
              value={betCP}
              disabled={status === "playing"}
              onChange={e => setBetCP(Math.max(10, Number(e.target.value)))}
              className="text-black px-3 py-2 rounded mb-4"
            />

            <button onClick={startGame} className="bg-emerald-600 px-6 py-3 rounded-xl">
              {loading ? "..." : "Jouer"}
            </button>

          </div>
        </div>
      )}

      {status === "playing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">

          <div className="text-4xl">{problem.q}</div>
          <div className="text-emerald-500 text-2xl">{input}</div>

          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9,0].map(n =>
              <button key={n} onClick={() => handleKey(String(n))} className="bg-white/10 p-4 rounded-xl">{n}</button>
            )}
          </div>

          <button onClick={() => finalizeGame(false)} className="bg-emerald-600 px-6 py-4 rounded-xl">
            CASH OUT {Math.floor(lockedBet * multiplier)} CP
          </button>

        </div>
      )}

      <AnimatePresence>
        {(status === "won" || status === "lost") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">{status === "won" ? "Gagné" : "Perdu"}</div>
              <button onClick={() => router.push("/client/home")} className="bg-emerald-600 px-6 py-3 rounded-xl">Retour</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-emerald-500"/></div>}>
      <LaserVaultGame/>
    </Suspense>
  );
      }
