"use client";
import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Zap, Trophy, Minus, Plus, Radio, Sparkles, Eye, Skull, Clock } from 'lucide-react';
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- GESTION AUDIO ---
const playSound = (type: 'beep' | 'error' | 'win' | 'lost') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'beep') {
      osc.frequency.setValueAtTime(880, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(110, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'win') {
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.exponentialRampToValueAtTime(1046, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
    }
  } catch (e) {}
};

// --- AVATAR ---
const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([12, 25, 12]);
  }
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-10 h-16" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-5 left-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-5 right-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

interface MathOperation {
  a: number;
  b: number;
  op: string;
  answer: number;
  display: string;
}

const generateMathOperation = (questionsAnswered: number): MathOperation => {
  // Nombres de 1 à 99
  const a = Math.floor(Math.random() * 99) + 1;
  let b = Math.floor(Math.random() * 99) + 1;
  
  // Choix aléatoire de l'opération
  const operations = ['+', '-', '×', '÷'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  
  let answer = 0;
  switch (op) {
    case '+':
      answer = a + b;
      break;
    case '-':
      answer = a - b;
      break;
    case '×':
      answer = a * b;
      break;
    case '÷':
      // Assurer que la division produit un entier
      while (a % b !== 0) {
        b = Math.floor(Math.random() * 99) + 1;
        if (b > a) b = Math.floor(a / Math.random());
      }
      answer = Math.floor(a / b);
      break;
  }
  
  return {
    a,
    b,
    op,
    answer,
    display: `${a} ${op} ${b}`
  };
};

function QuickCalcGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- ÉTATS ---
  const [profile, setProfile] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; msg: string } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won' | 'maintenance' | 'loading'>('loading');
  
  // Jeu
  const [betCP, setBetCP] = useState(10);
  const [operation, setOperation] = useState<MathOperation | null>(null);
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  
  // Chronomètre
  const [timeRemaining, setTimeRemaining] = useState(5000); // 5 secondes en ms
  const [initialTime, setInitialTime] = useState(5000);

  // 🔒 SÉCURITÉ & REFS CRITIQUES
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null });

  // Synchro Refs
  useEffect(() => {
    gameStateRef.current = { multiplier, gameId };
  }, [multiplier, gameId]);

  // --- INITIALISATION ---
  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
    }
    checkAccess();
  }, []);

  useEffect(() => { init(); }, [init]);

  const checkAccess = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'vault').single();
      if (data && !data.is_active) {
        setMaintenance({ active: true, msg: data.maintenance_msg || "Maintenance." });
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
        if (challengeId && challengeFee) setBetCP(Number(challengeFee));
      }
    } catch (err) { setStatus('idle'); } finally { setLoadingCheck(false); }
  };

  // --- DÉMARRAGE DE PARTIE ---
  const startGame = async () => {
    if (betCP < 10) { alert("Mise minimum : 10 CP"); return; }
    triggerHaptic();
    if (betCP > (profile?.jetons_cp || 0)) { alert("Solde insuffisant"); return; }
    if (loading || status === 'playing') return;

    setLoading(true);
    isProcessingRef.current = false;

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      lockedBetRef.current = finalFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, 
          p_mise_cp: finalFee, 
          p_gain_cp: 0, 
          p_jeu_nom: challengeId ? `Arena: Quick Calc` : 'Quick Calc Solo'
      });
      
      if (rpcError || !result.success) throw new Error(result?.message || "Solde CP insuffisant");

      const { data: game, error: gameErr } = await supabase.from('vault_games').insert([{
          user_id: profile.id, 
          mise_cp: finalFee, 
          is_active: true,
          challenge_id: challengeId || null
      }]).select().single();
      
      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMultiplier(0.5); 
      setQuestionsAnswered(0); 
      setInput("");
      setTimeRemaining(5000);
      setInitialTime(5000);
      
      const newOp = generateMathOperation(0);
      setOperation(newOp);
      
      setStatus('playing');
      playSound('beep');
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  // --- FIN DE PARTIE SÉCURISÉE ---
  const finalizeGame = useCallback(async (reason: 'correct' | 'incorrect' | 'timeout') => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentMult = gameStateRef.current.multiplier;
    const currentGameId = gameStateRef.current.gameId;
    const secureBet = lockedBetRef.current;

    if (!currentGameId) return;
    
    let gainFinal = 0;
    const finalScore = questionsAnswered * 100;
    const economy = resolveGameEconomy({
      gameId: 'laser-vault',
      bet: secureBet,
      multiplier: currentMult,
      difficulty: 'intermédiaire',
      currentStep: questionsAnswered,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });

    const isWin = reason === 'correct' && currentMult >= 1.0;

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

          await supabase.from('challenge_attempts')
            .update({
                total_score: newTotalScore,
                attempts_count: newAttemptsCount,
                last_attempt_at: new Date().toISOString()
            })
            .eq('user_id', profile.id)
            .eq('challenge_id', challengeId);
      } else {
          if (isWin) {
             gainFinal = economy.payout;
          } else {
             gainFinal = 0;
          }
          
          if (gainFinal > 0) {
            await supabase.rpc('jouer_partie_cp', {
                p_user_id: profile.id, p_mise_cp: 0, p_gain_cp: gainFinal,
                p_jeu_nom: 'Quick Calc Win'
            });
          }
      }

      await supabase.from('vault_games').update({ is_active: false, gain_cp: gainFinal }).eq('id', currentGameId);
      
      if (challengeId) {
          setStatus(questionsAnswered > 0 ? 'won' : 'lost');
      } else {
          setStatus(gainFinal > 0 ? 'won' : 'lost');
      }

      if (gainFinal > 0 || (challengeId && questionsAnswered > 0)) playSound('win'); else playSound('error');
    } catch (e) { console.error(e); } finally { init(); }
  }, [challengeId, profile, questionsAnswered, init]);

  // --- CHRONOMÈTRE ---
  useEffect(() => {
    if (status !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 100) {
          finalizeGame('timeout');
          return 0;
        }
        // Réduire le temps disponible à mesure que la difficulté augmente
        const speedReduction = Math.min(200, questionsAnswered * 50);
        return prev - 100 - speedReduction;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [status, questionsAnswered, finalizeGame]);

  // --- SAISIE UTILISATEUR ---
  const handleKey = (num: string) => {
    if (status !== 'playing' || !operation) return;
    playSound('beep');
    
    const newVal = input + num;
    setInput(newVal);
    
    if (newVal === "-") return;
    
    const numValue = parseInt(newVal);
    const answerStr = operation.answer.toString();
    
    // BONNE RÉPONSE
    if (numValue === operation.answer) {
      triggerHaptic();
      playSound('win');
      
      setQuestionsAnswered(q => q + 1);
      setMultiplier(prev => parseFloat((prev + 0.1).toFixed(2)));
      
      // Réduire le temps au fur et à mesure
      setTimeRemaining(prev => Math.max(2000, prev - 300));
      setInitialTime(prev => Math.max(2000, prev - 300));
      
      setInput("");
      const newOp = generateMathOperation(questionsAnswered + 1);
      setOperation(newOp);
      
    // MAUVAISE RÉPONSE (trop de chiffres entrés)
    } else if (newVal.length > answerStr.length) {
      playSound('error');
      finalizeGame('incorrect');
    }
  };

  const handleClear = () => {
    if (status === 'playing') {
      setInput("");
    }
  };

  const handleSubmit = () => {
    if (status !== 'playing' || !operation) return;
    
    if (input === "") return;
    
    const numValue = parseInt(input);
    if (numValue === operation.answer) {
      handleKey("");
    } else {
      playSound('error');
      finalizeGame('incorrect');
    }
  };

  const progressPercent = Math.min(100, (questionsAnswered / 8) * 100);
  const timePercent = Math.max(0, (timeRemaining / initialTime) * 100);
  const isTimeWarning = timePercent < 20;

  if (loadingCheck || status === 'loading') return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <NeonGameShell accent="cyan" className="fixed inset-0 select-none">
      <div className="z-50 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl">
        <button onClick={() => router.push(challengeId ? '/client/rank?challengeId=' + challengeId : '/client/home')} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.16)] active:scale-90">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5">
                <Coins size={14} className="text-cyan-300" />
                <span className="text-[11px] font-bold text-cyan-200">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
            </div>
            {challengeId && <span className="mt-1 animate-pulse text-[6px] tracking-widest text-amber-400">ARENA_MODE_ON</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between relative">
        {status === 'maintenance' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ServerOff className="text-amber-500 mb-6 animate-pulse" size={64} />
            <h1 className="text-2xl text-amber-500 italic uppercase">Maintenance</h1>
            <p className="text-[10px] text-slate-500 mt-2 tracking-widest">{maintenance?.msg}</p>
          </div>
        ) : status === 'idle' ? (
          <div className="flex-1 flex items-center justify-center w-full max-w-xs">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full rounded-[3rem] border border-cyan-400/20 bg-slate-950/70 p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.16)] backdrop-blur-2xl">
              <div className="mb-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cyan-300">
                <Sparkles size={14} /> quick calc
              </div>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                {challengeId ? <Trophy className="text-amber-500" size={28} /> : <Lock className="text-emerald-500" size={28} />}
              </div>
              
              <div className="mb-8 space-y-4">
                  <p className="text-[8px] text-emerald-500 tracking-widest font-bold uppercase">
                      {challengeId ? "Frais de Participation" : "Montant à miser"}
                  </p>
                  
                  {challengeId ? (
                      <p className="text-5xl font-black text-white tracking-tighter">{challengeFee} CP</p>
                  ) : (
                      <div className="flex items-center justify-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                          <button onClick={() => setBetCP(Math.max(10, betCP - 10))} className="p-3 bg-white/5 rounded-xl active:scale-90 transition-all hover:bg-white/10"><Minus size={16}/></button>
                          <div className="w-24">
                              <input 
                                type="number" 
                                value={betCP} 
                                onChange={(e) => setBetCP(Math.max(0, Number(e.target.value)))}
                                className="w-full bg-transparent text-center text-3xl font-black outline-none text-white"
                              />
                              <p className="text-[8px] text-slate-500">CP</p>
                          </div>
                          <button onClick={() => setBetCP(betCP + 10)} className="p-3 bg-white/5 rounded-xl active:scale-90 transition-all hover:bg-white/10"><Plus size={16}/></button>
                      </div>
                  )}
              </div>

              <button onClick={startGame} disabled={loading || (!challengeId && betCP < 10)} className={`w-full rounded-[1.5rem] py-5 text-lg font-black text-white shadow-2xl transition-all active:scale-95 ${challengeId ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "DÉMARRER"}
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-full">
            <div className="relative mb-4 max-h-[42vh] flex-1 shrink-0 overflow-hidden rounded-[2.6rem] border border-cyan-400/25 bg-slate-950/80 shadow-[0_0_45px_rgba(34,211,238,0.16)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.3),rgba(2,6,23,0.86))]" />
              <motion.div animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.03, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.16),transparent_50%)]" />
              
              {/* Chronomètre visuel */}
              <motion.div 
                style={{ height: `${100 - timePercent}%` }} 
                animate={{ backgroundColor: isTimeWarning ? ['rgba(34,211,238,0.1)', 'rgba(239,68,68,0.1)'] : 'rgba(34,211,238,0.1)' }}
                transition={{ duration: isTimeWarning ? 0.4 : 1, repeat: Infinity }}
                className="absolute bottom-0 left-0 right-0 transition-all"
              />

              <motion.div 
                animate={{ opacity: isTimeWarning ? [0.2, 0.5] : 0.1 }} 
                transition={{ duration: 0.6, repeat: Infinity }}
                className="absolute inset-0 border-2 border-rose-500/50"
              />

              <div className="absolute left-6 right-6 top-6 z-10 flex items-start justify-between">
                 <div className="bg-black/80 px-3 py-1.5 rounded-xl border border-white/10 text-center min-w-[60px]">
                    <p className="text-[6px] text-zinc-500 font-bold tracking-widest">RÉPONSES</p>
                    <p className="text-sm text-white font-black">{questionsAnswered}</p>
                 </div>
                 
                 <div className="flex flex-col items-center">
                    <h2 className={`text-5xl font-black italic tracking-tighter transition-colors ${multiplier >= 1 || challengeId ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {challengeId ? `+${questionsAnswered * 100}` : `x${multiplier.toFixed(2)}`}
                    </h2>
                    <span className="text-[7px] text-zinc-500 font-bold uppercase">
                        {multiplier < 1.0 ? "ACCUMULATION" : "GAIN"}
                    </span>
                 </div>

                 <motion.div 
                   animate={{ scale: isTimeWarning ? [1, 1.1] : 1 }}
                   transition={{ duration: 0.5, repeat: Infinity }}
                   className="bg-black/80 px-3 py-1.5 rounded-xl border border-white/10 text-center min-w-[60px]"
                 >
                    <p className="text-[6px] text-zinc-500 uppercase font-bold">TEMPS</p>
                    <p className={`text-sm font-black ${isTimeWarning ? 'text-rose-500' : 'text-cyan-500'}`}>{(timeRemaining / 1000).toFixed(1)}s</p>
                 </motion.div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                 <AnimatePresence mode="wait">
                    <motion.div key={operation?.display} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                        <div className="mb-4 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.35em] text-cyan-300">
                          <Radio size={12} /> calcul mental
                        </div>
                        <p className="text-6xl font-black mb-6 text-white italic tracking-tighter drop-shadow-2xl">{operation?.display}</p>
                        <div className="h-16 text-4xl text-emerald-500 border-b-2 border-emerald-500/40 px-8 font-black italic flex items-center justify-center">
                            {input || "?"}
                        </div>
                    </motion.div>
                 </AnimatePresence>
              </div>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 scale-75">
                <EliteAvatar status={status} isScared={isTimeWarning} />
              </div>
            </div>

            <div className="flex-1">
              <div className="mb-4 rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-inner">
                <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  <span className="flex items-center gap-2"><Clock size={12} /> chronomètre</span>
                  <span className={`font-black ${isTimeWarning ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>{isTimeWarning ? 'CRITIQUE' : 'OK'}</span>
                </div>
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                    <span>progression</span>
                    <span className="text-cyan-300">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.4 }} className="h-full rounded-full bg-linear-to-r from-cyan-400/80 to-emerald-400/80" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-3">
                    <p className="text-slate-400">Temps Limite</p>
                    <p className="mt-1 font-black text-white">{(initialTime / 1000).toFixed(1)}s</p>
                  </div>
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-3">
                    <p className="text-slate-400">Restant</p>
                    <p className={`mt-1 font-black ${isTimeWarning ? 'text-rose-300' : 'text-cyan-300'}`}>{(timeRemaining / 1000).toFixed(1)}s</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3">
                    <p className="text-slate-400">Pts</p>
                    <p className="mt-1 font-black text-emerald-300">{questionsAnswered * 100}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pb-4 shrink-0">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                  <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => handleKey(n.toString())} className="h-14 rounded-2xl border border-cyan-400/20 bg-white/5 text-2xl font-black text-white shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                    {n}
                  </motion.button>
                ))}
                <button onClick={handleClear} className="rounded-2xl border border-rose-500/20 bg-rose-600/10 text-[10px] font-black italic text-rose-500">CLR</button>
                
                <button 
                  onClick={handleSubmit} 
                  className="col-span-3 mt-2 flex items-center justify-center gap-3 rounded-[1.8rem] py-6 text-xl font-black italic shadow-xl transition-all bg-emerald-600 text-white"
                >
                  <Zap size={24} /> VALIDER
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#020617]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-sm">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'lost' && !challengeId ? 'bg-rose-600/20 border-rose-500/40' : 'bg-emerald-500/20 border-emerald-500/40'} border-2`}>
                        {status === 'lost' && !challengeId ? <ShieldAlert size={48} className="text-rose-500" /> : <Unlock size={48} className="text-emerald-500" />}
                    </div>
                    <h2 className="text-4xl font-black italic tracking-tighter mb-2 uppercase">
                        {challengeId ? 'SCORE TRANSMIS' : (status === 'lost' ? 'TEMPS ÉCOULÉ' : 'RÉUSSI')}
                    </h2>
                    <div className="bg-white/5 p-8 rounded-[3rem] w-full mb-10 border border-white/10 shadow-inner">
                        <p className="text-[9px] text-slate-500 mb-3 uppercase italic font-bold tracking-[0.3em]">
                            {challengeId ? "POINTS ARENA" : "CP RÉCUPÉRÉS"}
                        </p>
                        <p className="text-6xl text-white font-black tracking-tighter italic">
                            {challengeId ? questionsAnswered * 100 : (status === 'lost' ? 0 : Math.floor(betCP * multiplier))} 
                            <span className="text-lg text-emerald-500 ml-1 font-black">{challengeId ? 'PTS' : 'CP'}</span>
                        </p>
                    </div>
                    <button onClick={() => router.push(challengeId ? '/client/rank?challengeId=' + challengeId : '/client/home')} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl italic shadow-2xl">
                        {challengeId ? 'VOIR LE CLASSEMENT' : 'RETOUR AU HUB'}
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50} /></div>}>
      <QuickCalcGame />
    </Suspense>
  );
}
