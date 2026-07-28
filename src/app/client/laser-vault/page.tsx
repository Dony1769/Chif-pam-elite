"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Sparkles, Delete, RefreshCw, ExternalLink } from 'lucide-react';
import { NeonGameShell } from '@/components/game/NeonGameShell';
import MonetagAdScript from '@/components/ads/MonetagAdScript';

// --- INTERFACES & TYPES ---
interface ProfileLike {
  id?: string;
  jetons_cp?: number;
}

interface MaintenanceState {
  active: boolean;
  msg: string;
}

interface MathQuestion {
  display: string;
  answer: number;
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
    // AudioContext bloqué
  }
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([14, 20, 14]);
  }
};

// --- LOGIQUE DE GESTION DES TEMPS ET MULTIPLICATEURS ---
const getQuestionTimeMs = (questionNumber: number) => {
  const baseTimeMs = 6000;
  const reductionMs = (questionNumber - 1) * 600;
  return Math.max(2500, baseTimeMs - reductionMs);
};

const getNextMultiplier = (answered: number) => {
  const steps = [0.2, 0.4, 0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
  return steps[Math.min(answered, steps.length - 1)] ?? 4.0;
};

// --- GENERATION DES QUESTIONS ---
const generateMathQuestion = (questionsAnswered: number): MathQuestion => {
  const level = questionsAnswered < 3 ? 1 : questionsAnswered < 7 ? 2 : 3;

  if (level === 1) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const isAddition = Math.random() > 0.5;
    if (isAddition) {
      return { display: `${a} + ${b}`, answer: a + b };
    }
    const left = Math.max(a, b);
    const right = Math.min(a, b);
    return { display: `${left} - ${right}`, answer: left - right };
  }

  if (level === 2) {
    const useMultiplication = Math.random() > 0.4;
    if (useMultiplication) {
      const a = Math.floor(Math.random() * 7) + 3;
      const b = Math.floor(Math.random() * 7) + 3;
      return { display: `${a} × ${b}`, answer: a * b };
    }

    const a = Math.floor(Math.random() * 40) + 10;
    const b = Math.floor(Math.random() * 40) + 10;
    const isAddition = Math.random() > 0.5;
    if (isAddition) {
      return { display: `${a} + ${b}`, answer: a + b };
    }
    const left = Math.max(a, b);
    const right = Math.min(a, b);
    return { display: `${left} - ${right}`, answer: left - right };
  }

  const operation = Math.floor(Math.random() * 4);
  if (operation === 0) {
    const a = Math.floor(Math.random() * 80) + 20;
    const b = Math.floor(Math.random() * 80) + 20;
    return { display: `${a} + ${b}`, answer: a + b };
  }
  if (operation === 1) {
    const a = Math.floor(Math.random() * 80) + 20;
    const b = Math.floor(Math.random() * 80) + 20;
    const left = Math.max(a, b);
    const right = Math.min(a, b);
    return { display: `${left} - ${right}`, answer: left - right };
  }
  if (operation === 2) {
    const a = Math.floor(Math.random() * 9) + 3;
    const b = Math.floor(Math.random() * 9) + 3;
    return { display: `${a} × ${b}`, answer: a * b };
  }

  const answer = Math.floor(Math.random() * 15) + 3;
  const divisor = Math.floor(Math.random() * 8) + 2;
  const dividend = answer * divisor;
  return { display: `${dividend} ÷ ${divisor}`, answer };
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
  const [question, setQuestion] = useState<MathQuestion | null>(null);
  const [input, setInput] = useState('');
  const [multiplier, setMultiplier] = useState(0.2);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(6000);
  const [initialTime, setInitialTime] = useState(6000);
  const [shakeAnswer, setShakeAnswer] = useState(false);

  // --- ÉTATS POUR LA SECONDE CHANCE ET PUB ---
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [adClickTime, setAdClickTime] = useState<number | null>(null);
  const [adErrorMsg, setAdErrorMsg] = useState<string | null>(null);
  const [validatingSecondChance, setValidatingSecondChance] = useState(false);

  const lockedBetRef = useRef(0);
  const isProcessingRef = useRef(false);
  const gameStateRef = useRef({ multiplier: 0.2, gameId: null as string | null });

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId };
  }, [multiplier, gameId]);

  const checkAccess = useCallback(async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'vault').single();
      if (data && !data.is_active) {
        setMaintenance({ active: true, msg: data.maintenance_msg || 'Maintenance.' });
        setStatus('maintenance');
      } else {
        setStatus('idle');
        if (challengeId && challengeFee) {
          setBetCP(Number(challengeFee));
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
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
    if (betCP < 10) {
      alert('Mise minimum : 10 CP');
      return;
    }
    triggerHaptic();
    if (betCP > (profile?.jetons_cp || 0)) {
      alert('Solde insuffisant');
      return;
    }
    if (loading || status === 'playing') return;

    setLoading(true);
    isProcessingRef.current = false;
    setSecondChanceUsed(false);
    setAdClickTime(null);
    setAdErrorMsg(null);

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      lockedBetRef.current = finalFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile?.id,
        p_mise_cp: finalFee,
        p_gain_cp: 0,
        p_jeu_nom: challengeId ? 'Arena: Quick Calc' : 'Quick Calc Solo',
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.message || 'Solde CP insuffisant');
      }

      const { data: game, error: gameErr } = await supabase
        .from('vault_games')
        .insert([{ user_id: profile?.id, mise_cp: finalFee, is_active: true, challenge_id: challengeId || null }])
        .select()
        .single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMultiplier(0.2);
      setQuestionsAnswered(0);
      setInput('');
      const firstTimeMs = getQuestionTimeMs(1);
      setTimeRemaining(firstTimeMs);
      setInitialTime(firstTimeMs);
      setQuestion(generateMathQuestion(0));
      setStatus('playing');
      playSound('beep');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Erreur de partie');
    } finally {
      setLoading(false);
    }
  }, [betCP, challengeFee, challengeId, loading, profile?.id, profile?.jetons_cp, status]);

  const finalizeGame = useCallback(async (reason: 'timeout' | 'quit') => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentMult = gameStateRef.current.multiplier;
    const currentGameId = gameStateRef.current.gameId;
    const secureBet = lockedBetRef.current;

    if (!currentGameId || !profile?.id) return;

    const finalScore = questionsAnswered * 100;
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

      setStatus(challengeId ? (questionsAnswered > 0 ? 'won' : 'lost') : gainFinal >= secureBet ? 'won' : 'lost');
      if (gainFinal >= secureBet || (challengeId && questionsAnswered > 0)) {
        playSound('win');
      } else {
        playSound('error');
      }
    } catch (error) {
      console.error(error);
    } finally {
      void init();
    }
  }, [challengeId, init, profile?.id, questionsAnswered]);

  // --- LOGIQUE DE VÉRIFICATION DE LA SECONDE CHANCE APRÈS CLIC ADS ---
  const handleVerifySecondChance = useCallback(async (timestamp: number) => {
    const elapsedSeconds = (Date.now() - timestamp) / 1000;
    
    if (elapsedSeconds < 6) {
      setAdErrorMsg(`Temps insuffisant (${Math.ceil(6 - elapsedSeconds)}s restantes). Vous n'avez pas obtenu la seconde chance.`);
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
        throw new Error(result?.message || 'Erreur lors du prélèvement de la seconde chance');
      }

      // Seconde chance accordée
      setSecondChanceUsed(true);
      isProcessingRef.current = false;
      const nextTime = getQuestionTimeMs(questionsAnswered + 1);
      setTimeRemaining(nextTime);
      setInitialTime(nextTime);
      setInput('');
      setStatus('playing');
      playSound('beep');
    } catch (err: unknown) {
      setAdErrorMsg(err instanceof Error ? err.message : 'Erreur de seconde chance');
    } finally {
      setValidatingSecondChance(false);
      setAdClickTime(null);
      if (typeof window !== 'undefined') localStorage.removeItem('ad_click_timestamp');
      void init();
    }
  }, [init, profile?.id, profile?.jetons_cp, questionsAnswered]);

  // Écoute de retour du joueur sur le jeu
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

    const now = Date.now();
    setAdClickTime(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ad_click_timestamp', now.toString());
    }

    window.open('https://omg10.com/4/11431323', '_blank');
  };

  useEffect(() => {
    if (status !== 'playing') return;

    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 100) {
          void finalizeGame('timeout');
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [finalizeGame, status]);

  const handleInputKey = useCallback((value: string) => {
    if (status !== 'playing' || !question) return;

    if (value === 'DEL') {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    const nextInput = `${input}${value}`;
    const expectedLength = question.answer.toString().length;

    if (nextInput.length > expectedLength) {
      triggerHaptic();
      playSound('error');
      setShakeAnswer(true);
      window.setTimeout(() => setShakeAnswer(false), 350);
      setInput('');
      return;
    }

    setInput(nextInput);
    if (nextInput === question.answer.toString()) {
      triggerHaptic();
      playSound('win');
      const nextCount = questionsAnswered + 1;
      setQuestionsAnswered(nextCount);
      setMultiplier(getNextMultiplier(nextCount));
      const nextTime = getQuestionTimeMs(nextCount + 1);
      setTimeRemaining(nextTime);
      setInitialTime(nextTime);
      setInput('');
      setQuestion(generateMathQuestion(nextCount));
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
    return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;
  }

  // Calcul pour affichage de la seconde chance
  const isEligibleForSecondChance = !challengeId && multiplier < 1.0 && !secondChanceUsed;
  const secondChanceCost = Math.floor(betCP * 0.5);

  return (
    <NeonGameShell accent="cyan" className="fixed inset-0 select-none overflow-hidden h-[100dvh]">
      {/* Monetag Ad Script Integration */}
      <MonetagAdScript zoneId="11431323" />

      {/* HEADER COMPACT */}
      <div className="z-50 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xl shrink-0">
        <button onClick={() => router.push(challengeId ? `/client/rank?challengeId=${challengeId}` : '/client/home')} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200 active:scale-90">
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
            <h1 className="text-xl uppercase italic text-amber-500">Maintenance</h1>
            <p className="mt-2 text-[10px] tracking-widest text-slate-500">{maintenance?.msg}</p>
          </div>
        ) : status === 'idle' ? (
          <div className="flex w-full max-w-xs flex-1 items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full rounded-[2.5rem] border border-cyan-400/20 bg-slate-950/80 p-6 text-center shadow-2xl backdrop-blur-2xl">
              <div className="mb-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cyan-300">
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
                      <p className="text-[8px] text-slate-500">CP</p>
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
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_35%)]" />

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
                  <p className={`text-xs font-black ${isTimeWarning ? 'animate-pulse text-rose-500' : 'text-cyan-400'}`}>{(timeRemaining / 1000).toFixed(1)}s</p>
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
                  <p className="text-[7px] uppercase font-bold text-slate-400">Gain Actuel Estimé</p>
                  <p className="text-sm font-black text-amber-400">{Math.floor(betCP * multiplier)} CP</p>
                </div>
                <EliteAvatar status={status} isScared={isTimeWarning} />
              </div>
            </div>

            {/* PAVÉ NUMÉRIQUE */}
            <div className="shrink-0 space-y-1.5 pb-2">
              <div className="grid grid-cols-3 gap-1.5">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((value) => (
                  <motion.button key={value} whileTap={{ scale: 0.92 }} onClick={() => handleInputKey(value)} className="h-11 rounded-xl border border-cyan-400/20 bg-white/5 text-xl font-black text-white shadow-sm hover:bg-white/10 active:bg-cyan-500/20">
                    {value}
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleInputKey('0')} className="h-11 rounded-xl border border-cyan-400/20 bg-white/5 text-xl font-black text-white hover:bg-white/10">0</motion.button>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleInputKey('DEL')} className="col-span-1 flex h-11 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20">
                  <Delete size={16} />
                </motion.button>
                <button onClick={handleClear} className="col-span-1 rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-black uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/20">CLR</button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ÉCRAN DE FIN DE PARTIE & SECONDE CHANCE */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]/98 p-6 text-center backdrop-blur-2xl">
            <div className="w-full max-w-sm">
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 ${status === 'lost' && !challengeId && multiplier < 1.0 ? 'border-rose-500/40 bg-rose-600/20' : 'border-emerald-500/40 bg-emerald-500/20'}`}>
                {status === 'lost' && !challengeId && multiplier < 1.0 ? <ShieldAlert size={40} className="text-rose-500" /> : <Unlock size={40} className="text-emerald-500" />}
              </div>
              <h2 className="mb-2 text-3xl font-black uppercase italic tracking-tighter">
                {challengeId ? 'SCORE TRANSMIS' : status === 'lost' && multiplier < 1.0 ? 'TEMPS ÉCOULÉ' : 'PARTIE TERMINÉE'}
              </h2>

              <div className="mb-4 w-full rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-inner">
                <p className="mb-2 text-[8px] font-bold uppercase italic tracking-[0.3em] text-slate-400">{challengeId ? 'POINTS ARENA' : 'CP REMPORTÉS'}</p>
                <p className="text-5xl font-black italic tracking-tighter text-white">
                  {challengeId ? questionsAnswered * 100 : Math.floor(betCP * multiplier)}
                  <span className="ml-1 text-base font-black text-emerald-400">{challengeId ? 'PTS' : 'CP'}</span>
                </p>
              </div>

              {/* OPTION DE SECONDE CHANCE DÉCLENCHÉE SI ÉLIGIBLE */}
              {isEligibleForSecondChance && (
                <div className="mb-4 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md">
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <RefreshCw size={14} className="animate-spin" /> Seconde Chance Disponible
                  </div>
                  <p className="text-[10px] text-slate-300 mb-3">
                    Restez <span className="font-bold text-amber-300">6 secondes</span> sur le site sponsorisé pour continuer la partie.
                    <br />
                    <span className="text-[9px] text-amber-400/80">Coût additionnel : -{secondChanceCost} CP (50% de la mise)</span>
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
                      <>
                        SECONDE CHANCE (-{secondChanceCost} CP) <ExternalLink size={14} />
                      </>
                    )}
                  </button>
                </div>
              )}

              <button onClick={() => router.push(challengeId ? `/client/rank?challengeId=${challengeId}` : '/client/home')} className="w-full rounded-[1.5rem] bg-emerald-600 py-4 text-lg font-black italic text-white shadow-xl hover:bg-emerald-500">
                {challengeId ? 'VOIR LE CLASSEMENT' : 'RETOUR AU HUB'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

// --- ENVELOPPE SUSPENSE POUR SEARCH PARAMS EN NEXT.JS 13+ ---
export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
      <QuickCalcGameContent />
    </Suspense>
  );
}
