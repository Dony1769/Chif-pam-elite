"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, Info, X, TriangleAlert, ServerOff, Trophy } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';

// --- SYSTÈME AUDIO ---
const playSound = (type: 'beep' | 'error' | 'win' | 'lost' | 'speedup') => {
  if (typeof window === 'undefined') return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (type === 'beep') {
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'error') {
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } else if (type === 'speedup') {
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } else if (type === 'win') {
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-10 h-16" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-5 left-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-5 right-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

// Composant interne pour utiliser useSearchParams en toute sécurité avec Next.js 14/15
function LaserVaultGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const { startChallengeEntry, submitChallengeScore } = useChallenge();

  const [profile, setProfile] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; msg: string } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [showTutorial, setShowTutorial] = useState(false);
  const [bet, setBet] = useState(50);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(4);
  const [errorPenalty, setErrorPenalty] = useState(1.0);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
      }
      checkAccess();
    };
    init();
  }, []);

  const checkAccess = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'vault').single();
      if (data && !data.is_active) {
        setMaintenance({ active: true, msg: data.maintenance_msg || "En maintenance." });
      }
    } catch (err) { console.error(err); } finally { setLoadingCheck(false); }
  };

  const generateProblem = useCallback((m: number) => {
    const difficultyLevel = Math.floor(m * 2);
    const a = Math.floor(Math.random() * (10 + difficultyLevel)) + 2;
    const b = Math.floor(Math.random() * (10 + difficultyLevel)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  }, []);

  const startGame = async () => {
    setLoading(true);
    try {
      if (challengeId) {
        const { data: chall } = await supabase.from('challenges').select('entry_fee').eq('id', challengeId).single();
        if (!chall) throw new Error("Défi introuvable");
        let finalFee = chall.entry_fee;
        if (profile?.vip_status === 'monthly') finalFee *= 0.75;
        else if (profile?.vip_status === 'weekly') finalFee *= 0.90;
        const { error } = await startChallengeEntry(challengeId, profile.id, finalFee);
        if (error) throw new Error(error);
        setBet(0);
      } else {
        const { data: id, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
        if (error) throw new Error(error.message);
        setGameId(id);
      }
      setMultiplier(1.0); setLaserY(0); setQuestionsSolved(0); setBaseSpeed(1); setErrorPenalty(1.0); setInput("");
      generateProblem(1.0); setStatus('playing');
      lastTickRef.current = performance.now(); playSound('beep');
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      if (delta > 350) setLaserY(prev => prev + 5);
      setLaserY(prev => {
        if (prev >= 85) { setStatus('lost'); playSound('lost'); return 85; }
        return prev + (baseSpeed * errorPenalty * (1 + (multiplier - 1) * 0.15));
      });
      lastTickRef.current = now;
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier, baseSpeed, errorPenalty]);

  const handleKey = (num: string) => {
    playSound('beep');
    const newVal = input + num;
    setInput(newVal);
    if (newVal === "-") return;
    if (parseInt(newVal) === problem.a) {
      setQuestionsSolved(q => q + 1);
      setMultiplier(prev => parseFloat((prev + 0.1).toFixed(1)));
      setLaserY(0); setInput("");
      if ((questionsSolved + 1) % 2 === 0) { setBaseSpeed(s => s + 1); playSound('speedup'); }
      generateProblem(multiplier + 0.1);
    } else if (newVal.length >= problem.a.toString().length) {
      setErrorPenalty(p => p + 2); setInput(""); playSound('error');
    }
  };

  const cashout = async () => {
    if (questionsSolved < 1) return;
    if (challengeId) {
      await submitChallengeScore(challengeId, profile.id, questionsSolved);
      setStatus('won');
    } else {
      const finalPayout = Math.floor(bet * multiplier);
      await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'vault_games', p_payout: finalPayout, p_win: true });
      setStatus('won');
    }
    playSound('win');
  };

  if (loadingCheck) return <div className="h-screen bg-[#050508] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  if (maintenance?.active) {
    return (
      <div className="h-screen bg-[#050508] text-white font-black italic uppercase p-6 flex flex-col">
        <button onClick={() => router.back()} className="self-start p-3 bg-white/5 rounded-2xl border border-white/10 mb-10"><ChevronLeft size={24}/></button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <ServerOff className="text-rose-500 mb-8" size={64} />
          <h1 className="text-4xl text-rose-500 mb-4">ACCÈS REFUSÉ</h1>
          <p className="text-lg bg-rose-900/10 p-6 rounded-2xl border border-rose-500/20">{maintenance.msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden select-none flex flex-col">
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-emerald-500/10 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10"><ChevronLeft size={20}/></button>
        <h1 className="text-lg text-emerald-500 tracking-tighter">{challengeId ? "DÉFI COMMUNAUTAIRE" : "LASER VAULT"}</h1>
        <button onClick={() => setShowTutorial(true)} className="p-2 text-emerald-500"><Info size={20}/></button>
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between overflow-hidden">
        {status === 'idle' ? (
          <div className="mt-10 w-full max-w-xs space-y-6">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
              {challengeId ? <Trophy className="text-amber-500 mx-auto mb-4" size={40} /> : <Lock className="text-emerald-500 mx-auto mb-4" size={40} />}
              {!challengeId ? (
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none mb-6 text-white" />
              ) : (
                <div className="mb-6"><p className="text-[10px] text-slate-500">OBJECTIF</p><p className="text-3xl text-white tracking-tighter uppercase">Score Max</p></div>
              )}
              <button onClick={startGame} className={`w-full py-5 rounded-2xl text-xl font-bold active:scale-95 transition-all ${challengeId ? 'bg-amber-600' : 'bg-emerald-600'} text-black shadow-xl`}>
                {loading ? <Loader2 className="animate-spin mx-auto"/> : (challengeId ? "LANCER DÉFI" : "HACKER")}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-full">
            <div className="relative h-[38vh] bg-zinc-900/50 rounded-[2.5rem] border-2 border-zinc-800 overflow-hidden shadow-inner mb-3">
              <motion.div style={{ top: `${laserY}%` }} className="absolute left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_25px_red] z-30" />
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                 <div><p className="text-[6px] text-zinc-500 uppercase">Étape</p><p className="text-sm text-white">{questionsSolved}</p></div>
                 <h2 className="text-4xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">x{multiplier.toFixed(1)}</h2>
                 <div className="text-right"><p className="text-[6px] text-zinc-500 uppercase">Vitesse</p><p className="text-sm text-red-500">{(baseSpeed * 10).toFixed(0)}</p></div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                 <motion.div key={problem.q} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <p className="text-5xl font-black mb-2 text-white">{problem.q}</p>
                    <div className="h-10 text-3xl text-emerald-500 border-b-2 border-emerald-500/30 px-6 min-w-[120px] bg-white/5">{input}</div>
                 </motion.div>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2"><EliteAvatar status={status} isScared={laserY > 50} /></div>
            </div>

            <div className="flex-1 flex flex-col justify-end gap-2 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                  <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => handleKey(n.toString())} className="h-14 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black active:bg-emerald-500 active:text-black transition-colors">{n}</motion.button>
                ))}
                <button onClick={() => setInput("")} className="bg-rose-500/10 text-rose-500 rounded-2xl font-bold text-[10px] border border-rose-500/20">EFFACER</button>
              </div>
              <button onClick={cashout} disabled={questionsSolved < 4} className={`w-full py-5 font-black rounded-2xl text-xl shadow-xl active:scale-95 border-b-4 mt-1 transition-all ${questionsSolved < 4 ? "bg-zinc-800 text-zinc-500 border-zinc-900 opacity-50" : "bg-emerald-600 text-black border-emerald-900"}`}>
                {questionsSolved < 4 ? "ENCORE 1 ÉTAPE..." : (challengeId ? "VALIDER SCORE" : `ENCAISSER ${(bet * multiplier).toFixed(0)} HTG`)}
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-6xl font-black italic tracking-tighter">{status === 'lost' ? 'DÉTECTÉ !' : (challengeId ? 'DÉFI FINI' : 'OUVERT !')}</h2>
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full mt-8 mb-8">
                    {challengeId ? (
                      <div><p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest">Score Enregistré</p><p className="text-6xl text-white font-black">{questionsSolved}</p></div>
                    ) : (
                      <p className="text-5xl text-white font-black">{status === 'lost' ? '0' : (bet * multiplier).toFixed(0)} <span className="text-xl text-emerald-500">HTG</span></p>
                    )}
                </div>
                <button onClick={() => challengeId ? router.push('/client/challenges') : setStatus('idle')} className="w-full py-6 bg-white text-black rounded-3xl font-black text-xl hover:bg-emerald-500 transition-colors">
                  {challengeId ? "CLASSEMENT" : "RETOUR"}
                </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper obligatoire pour useSearchParams dans Next.js
export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#050508] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>}>
      <LaserVaultGame />
    </Suspense>
  );
}

