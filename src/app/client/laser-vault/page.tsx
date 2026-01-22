"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, Info, X, TriangleAlert, ServerOff, Trophy, Wallet } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';

// --- SYSTÈME AUDIO PREMIUM ---
const playSound = (type: 'beep' | 'error' | 'win' | 'lost' | 'speedup') => {
  if (typeof window === 'undefined') return;
  try {
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
  } catch (e) { /* Audio non supporté */ }
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-10 h-16" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-5 left-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-5 right-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

function LaserVaultGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const { startChallengePayment, recordAttempt, calculateFinalFee } = useChallenge();

  const [profile, setProfile] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; msg: string } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won' | 'maintenance'>('idle');
  
  const [bet, setBet] = useState(50);
  const [paidFee, setPaidFee] = useState(0); 
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(1);
  const [errorPenalty, setErrorPenalty] = useState(1.0);
  const lastTickRef = useRef<number>(0);

  // --- NAVIGATION LOGIC ---
  const handleBack = () => {
    if (challengeId) {
      router.push('/client/challenges');
    } else {
      router.push('/client/home');
    }
  };

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
        setStatus('maintenance');
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
    if (loading) return;
    setLoading(true);
    try {
      if (challengeId) {
        const { data: chall } = await supabase.from('challenges').select('entry_fee_base').eq('id', challengeId).single();
        if (!chall) throw new Error("Mission introuvable");
        
        const finalFee = calculateFinalFee(chall.entry_fee_base, profile?.vip_status);
        const { error } = await startChallengePayment(challengeId, finalFee);
        if (error) throw new Error(error);
        
        setPaidFee(finalFee);
      } else {
        const { data: id, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
        if (error) throw new Error(error.message);
        setGameId(id);
      }
      
      setMultiplier(1.0); setLaserY(0); setQuestionsSolved(0); setBaseSpeed(1); setErrorPenalty(1.0); setInput("");
      generateProblem(1.0); setStatus('playing');
      lastTickRef.current = performance.now(); playSound('beep');
    } catch (e: any) { 
        alert(e.message); 
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 88) { 
            finalizeGame(false); 
            return 88; 
        }
        return prev + (baseSpeed * errorPenalty * (1 + (multiplier - 1) * 0.15));
      });
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier, baseSpeed, errorPenalty]);

  const handleKey = (num: string) => {
    if (status !== 'playing') return;
    playSound('beep');
    const newVal = input + num;
    setInput(newVal);
    if (newVal === "-") return;
    
    if (parseInt(newVal) === problem.a) {
      setQuestionsSolved(q => q + 1);
      setMultiplier(prev => parseFloat((prev + 0.1).toFixed(1)));
      setLaserY(0); 
      setInput("");
      setErrorPenalty(1.0); 
      if ((questionsSolved + 1) % 3 === 0) { 
          setBaseSpeed(s => s + 1.5); 
          playSound('speedup'); 
      }
      generateProblem(multiplier + 0.1);
    } else if (newVal.length >= problem.a.toString().length) {
      setErrorPenalty(p => p + 1.5); 
      setInput(""); 
      playSound('error');
    }
  };

  const finalizeGame = async (isManualCashout: boolean) => {
    if (status !== 'playing') return;
    try {
      if (challengeId) {
        await recordAttempt(challengeId, profile.id, questionsSolved, paidFee);
        setStatus(isManualCashout ? 'won' : 'lost');
      } else {
        const finalPayout = isManualCashout ? Math.floor(bet * multiplier) : 0;
        await supabase.rpc('process_game_result', { 
            p_game_id: gameId, 
            p_table_name: 'vault_games', 
            p_payout: finalPayout, 
            p_win: isManualCashout 
        });
        setStatus(isManualCashout ? 'won' : 'lost');
      }
      if (isManualCashout) playSound('win');
      else playSound('lost');
    } catch (e) { console.error(e); }
  };

  if (loadingCheck) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="fixed inset-0 bg-[#020617] text-white font-black italic uppercase overflow-hidden select-none flex flex-col">
      {/* HEADER ELITE */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50 backdrop-blur-xl shrink-0">
        <button onClick={handleBack} className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all shadow-xl">
          <ChevronLeft size={20}/>
        </button>
        <div className="text-center">
            <h1 className="text-xs text-emerald-500 tracking-[0.3em] leading-none mb-1 underline decoration-white/10 underline-offset-4">{challengeId ? "ARENA_VAULT" : "LASER_VAULT"}</h1>
            <p className="text-[7px] text-slate-500 tracking-widest">ENCRYPTION_LVL_7</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between overflow-hidden relative">
        {status === 'maintenance' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <ServerOff className="text-amber-500 mb-6 animate-pulse" size={64} />
            <h1 className="text-3xl text-amber-500 mb-2 tracking-tighter italic">COFFRE_SCELLÉ</h1>
            <p className="text-[10px] text-slate-500 leading-relaxed border border-white/5 bg-white/5 p-4 rounded-2xl uppercase">{maintenance?.msg}</p>
          </div>
        ) : status === 'idle' ? (
          <div className="flex-1 flex items-center justify-center w-full max-w-xs">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900/40 p-8 rounded-[3.5rem] border border-white/10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-md w-full">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                {challengeId ? <Trophy className="text-amber-500" size={28} /> : <Lock className="text-emerald-500" size={28} />}
              </div>
              
              {!challengeId ? (
                <div className="space-y-1 mb-8 italic">
                    <p className="text-[8px] text-slate-500 tracking-widest uppercase">MONTANT_HACK (HTG)</p>
                    <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none text-white focus:text-emerald-500 transition-colors tracking-tighter" />
                </div>
              ) : (
                <div className="mb-8 bg-black/40 p-5 rounded-3xl border border-white/5 italic">
                    <p className="text-[8px] text-slate-500 tracking-widest mb-1 uppercase">ARENA_OBJECTIVE</p>
                    <p className="text-xl text-white tracking-tighter font-black">CUMUL_CODES_SCAN</p>
                </div>
              )}

              <button 
                onClick={startGame} 
                disabled={loading}
                className={`w-full py-5 rounded-[2rem] text-lg font-black active:scale-95 transition-all shadow-2xl ${challengeId ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}
              >
                {loading ? <Loader2 className="animate-spin mx-auto"/> : (challengeId ? "INIT_INFILTRATION" : "DÉCRYPTAGE_LIVE")}
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-full animate-in fade-in duration-700">
            {/* ZONE DE JEU - ADJUSTED FOR VIEWPORT */}
            <div className="relative flex-1 max-h-[42vh] bg-black rounded-[2.5rem] border-2 border-white/10 overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] mb-4 shrink-0">
              <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
              <motion.div style={{ top: `${laserY}%` }} className="absolute left-0 right-0 h-1 bg-rose-600 shadow-[0_0_40px_#f43f5e] z-30">
                 <div className="absolute top-0 left-0 w-full h-full animate-pulse bg-rose-400" />
              </motion.div>

              <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                 <div className="bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 italic">
                    <p className="text-[6px] text-zinc-500 tracking-widest">CODES</p>
                    <p className="text-sm text-white font-black">{questionsSolved}</p>
                 </div>
                 <h2 className="text-4xl text-emerald-500 font-black italic drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] tracking-tighter">x{multiplier.toFixed(1)}</h2>
                 <div className="bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 text-right italic">
                    <p className="text-[6px] text-zinc-500 tracking-widest uppercase">SPEED</p>
                    <p className="text-sm text-rose-500 font-black">{(baseSpeed * 10).toFixed(0)}%</p>
                 </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
                 <AnimatePresence mode="wait">
                    <motion.div key={problem.q} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                        <p className="text-6xl font-black mb-4 text-white tracking-tighter italic drop-shadow-2xl">{problem.q}</p>
                        <div className="h-12 text-4xl text-emerald-500 border-b-2 border-emerald-500/40 px-8 min-w-[140px] bg-emerald-500/5 rounded-t-xl flex items-center justify-center font-black italic">
                            {input || "?"}
                        </div>
                    </motion.div>
                 </AnimatePresence>
              </div>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 scale-75">
                <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            {/* KEYPAD - COMPACTED FOR NO SCROLL */}
            <div className="flex flex-col justify-end gap-2 pb-4 shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                  <motion.button 
                    key={n} 
                    whileTap={{ scale: 0.9 }} 
                    onClick={() => handleKey(n.toString())} 
                    className="h-12 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black active:bg-emerald-600 transition-all shadow-xl backdrop-blur-md"
                  >
                    {n}
                  </motion.button>
                ))}
                <button onClick={() => setInput("")} className="bg-rose-600/10 text-rose-500 rounded-2xl font-black text-[9px] border border-rose-500/20 uppercase tracking-widest italic">CLR</button>
              </div>
              
              <button 
                onClick={() => finalizeGame(true)} 
                disabled={questionsSolved < 4} 
                className={`w-full py-5 font-black rounded-[1.5rem] text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 italic tracking-tighter ${questionsSolved < 4 ? "bg-zinc-900 text-zinc-700 opacity-50" : "bg-white text-black hover:bg-emerald-500 hover:text-white"}`}
              >
                {questionsSolved < 4 ? "INFILTRATION_LOCKED" : (challengeId ? <><Trophy size={20}/> VALID_UPLINK</> : <><Wallet size={20}/> CASH_OUT {(bet * multiplier).toFixed(0)} HTG</>)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RESULT MODAL */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#020617]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-sm">
                    <div className="relative mb-6">
                        <div className={`absolute inset-0 blur-[60px] opacity-20 ${status === 'lost' ? 'bg-rose-600' : 'bg-emerald-500'}`} />
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto relative ${status === 'lost' ? 'bg-rose-600/20 border-rose-500/40' : 'bg-emerald-500/20 border-emerald-500/40'} border-2 shadow-2xl`}>
                            {status === 'lost' ? <ShieldAlert size={48} className="text-rose-500" /> : <Unlock size={48} className="text-emerald-500" />}
                        </div>
                    </div>
                    
                    <h2 className="text-5xl font-black italic tracking-tighter mb-2 italic underline decoration-white/5 underline-offset-8 uppercase">{status === 'lost' ? 'DETECTION!' : 'HACK_SUCCESS'}</h2>
                    <p className="text-[9px] text-slate-500 tracking-[0.5em] mb-10 italic uppercase">OPERATIONAL_DATA_REPORT</p>

                    <div className="bg-white/5 p-8 rounded-[3rem] w-full mb-10 border border-white/10 shadow-inner backdrop-blur-md">
                        <p className="text-[9px] text-slate-500 mb-3 uppercase tracking-[0.3em] italic font-bold">{challengeId ? 'SESSION_SCORE' : 'VAULT_LOOT'}</p>
                        <p className="text-6xl text-white font-black tracking-tighter italic">{challengeId ? questionsSolved : (status === 'lost' ? '0' : (bet * multiplier).toFixed(0))} <span className="text-lg text-emerald-500 ml-1">{challengeId ? 'PTS' : 'HTG'}</span></p>
                    </div>

                    <button 
                        onClick={handleBack} 
                        className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl active:scale-95 transition-all shadow-xl italic"
                    >
                      {challengeId ? "RETOUR ARENA" : "RETOUR HOME"}
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50} /></div>}>
      <LaserVaultGame />
    </Suspense>
  );
}
