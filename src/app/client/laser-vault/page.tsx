"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Sparkles, Radio, Clock, Delete } from 'lucide-react';
import { resolveGameEconomy } from '@/lib/game-economy';
import { NeonGameShell } from '@/components/game/NeonGameShell';

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

const playSound = (type: 'beep' | 'error' | 'win' | 'lost') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
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
    // silence
  }
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([14, 20, 14]);
  }
};

const getQuestionTimeMs = (questionNumber: number) => Math.max(3000, Math.round((8 - (questionNumber - 1) * 0.5) * 1000));

const getNextMultiplier = (answered: number) => {
  const steps = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0];
  return steps[Math.min(answered, steps.length - 1)] ?? 3.0;
};

const generateMathQuestion = (questionsAnswered: number): MathQuestion => {
  const level = questionsAnswered < 5 ? 1 : questionsAnswered < 12 ? 2 : 3;

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
    const useMultiplication = Math.random() > 0.5;
    if (useMultiplication) {
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      return { display: `${a} × ${b}`, answer: a * b };
    }

    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 90) + 10;
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
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 90) + 10;
    return { display: `${a} + ${b}`, answer: a + b };
  }
  if (operation === 1) {
    const a = Math.floor(Math.random() * 90) + 10;
    const b = Math.floor(Math.random() * 90) + 10;
    const left = Math.max(a, b);
    const right = Math.min(a, b);
    return { display: `${left} - ${right}`, answer: left - right };
  }
  if (operation === 2) {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    return { display: `${a} × ${b}`, answer: a * b };
  }

  const answer = Math.floor(Math.random() * 19) + 2;
  const divisor = Math.floor(Math.random() * 9) + 2;
  const dividend = answer * divisor;
  return { display: `${dividend} ÷ ${divisor}`, answer };
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative h-16 w-10" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute left-2 top-4 z-10 h-9 w-6 rounded-lg border border-emerald-400/50 bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute left-3 top-0 h-4 w-4 rounded-full border border-black/20 bg-orange-200" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute left-0 top-5 h-5 w-1.5 origin-top rounded-full bg-emerald-700" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute right-0 top-5 h-5 w-1.5 origin-top rounded-full bg-emerald-700" />
  </motion.div>
);

function QuickCalcGame() {
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
  const [multiplier, setMultiplier] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(8000);
  const [initialTime, setInitialTime] = useState(8000);
  const [shakeAnswer, setShakeAnswer] = useState(false);

  const lockedBetRef = useRef(0);
  const isProcessingRef = useRef(false);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null });

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      setMultiplier(0.5);
      setQuestionsAnswered(0);
      setInput('');
      setTimeRemaining(getQuestionTimeMs(1));
      setInitialTime(getQuestionTimeMs(1));
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
      specialEventMultiplier: 1,
    });

    const isWin = reason === 'timeout' ? currentMult >= 1.0 : false;

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
        gainFinal = isWin ? economy.payout : 0;
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

      setStatus(challengeId ? (questionsAnswered > 0 ? 'won' : 'lost') : gainFinal > 0 ? 'won' : 'lost');
      if (gainFinal > 0 || (challengeId && questionsAnswered > 0)) {
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

  const progressPercent = useMemo(() => Math.min(100, (questionsAnswered / 8) * 100), [questionsAnswered]);
  const timePercent = useMemo(() => Math.max(0, (timeRemaining / initialTime) * 100), [initialTime, timeRemaining]);
  const isTimeWarning = timePercent < 20;

  if (loadingCheck || status === 'loading') {
    return <div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;
  }

  return (
    <NeonGameShell accent="cyan" className="fixed inset-0 select-none">
      <div className="z-50 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl">
        <button onClick={() => router.push(challengeId ? `/client/rank?challengeId=${challengeId}` : '/client/home')} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.16)] active:scale-90">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5">
            <Coins size={14} className="text-cyan-300" />
            <span className="text-[11px] font-bold text-cyan-200">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
          </div>
          {challengeId && <span className="mt-1 animate-pulse text-[6px] tracking-widest text-amber-400">ARENA_MODE_ON</span>}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-between p-4">
        {status === 'maintenance' ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <ServerOff className="mb-6 animate-pulse text-amber-500" size={64} />
            <h1 className="text-2xl uppercase italic text-amber-500">Maintenance</h1>
            <p className="mt-2 text-[10px] tracking-widest text-slate-500">{maintenance?.msg}</p>
          </div>
        ) : status === 'idle' ? (
          <div className="flex w-full max-w-xs flex-1 items-center justify-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full rounded-[3rem] border border-cyan-400/20 bg-slate-950/70 p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.16)] backdrop-blur-2xl">
              <div className="mb-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em] text-cyan-300">
                <Sparkles size={14} /> quick calc
              </div>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                {challengeId ? <ShieldAlert className="text-amber-500" size={28} /> : <Lock className="text-emerald-500" size={28} />}
              </div>

              <div className="mb-8 space-y-4">
                <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">{challengeId ? 'Frais de Participation' : 'Montant à miser'}</p>

                {challengeId ? (
                  <p className="text-5xl font-black tracking-tighter text-white">{challengeFee} CP</p>
                ) : (
                  <div className="flex items-center justify-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-2">
                    <button onClick={() => setBetCP((prev) => Math.max(10, prev - 10))} className="rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10 active:scale-90"><Lock size={16} /></button>
                    <div className="w-24">
                      <input type="number" value={betCP} onChange={(event) => setBetCP(Math.max(0, Number(event.target.value)))} className="w-full bg-transparent text-center text-3xl font-black text-white outline-none" />
                      <p className="text-[8px] text-slate-500">CP</p>
                    </div>
                    <button onClick={() => setBetCP((prev) => prev + 10)} className="rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10 active:scale-90"><Sparkles size={16} /></button>
                  </div>
                )}
              </div>

              <button onClick={startGame} disabled={loading || (!challengeId && betCP < 10)} className={`w-full rounded-[1.5rem] py-5 text-lg font-black text-white shadow-2xl transition-all active:scale-95 ${challengeId ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-500'}`}>
                {loading ? <Loader2 className="mx-auto animate-spin" /> : 'DÉMARRER'}
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="flex h-full w-full max-w-sm flex-col">
            <div className="relative mb-4 flex-1 shrink-0 overflow-hidden rounded-[2.6rem] border border-cyan-400/25 bg-slate-950/80 shadow-[0_0_45px_rgba(34,211,238,0.16)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(2,6,23,0.3),rgba(2,6,23,0.86))]" />
              <motion.div animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.03, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.16),transparent_50%)]" />

              <motion.div style={{ height: `${100 - timePercent}%` }} animate={{ backgroundColor: isTimeWarning ? ['rgba(34,211,238,0.1)', 'rgba(239,68,68,0.1)'] : 'rgba(34,211,238,0.1)' }} transition={{ duration: isTimeWarning ? 0.4 : 1, repeat: Infinity }} className="absolute bottom-0 left-0 right-0 transition-all" />
              <motion.div animate={{ opacity: isTimeWarning ? [0.2, 0.5] : 0.1 }} transition={{ duration: 0.6, repeat: Infinity }} className="absolute inset-0 border-2 border-rose-500/50" />

              <div className="absolute left-6 right-6 top-6 z-10 flex items-start justify-between">
                <div className="min-w-[60px] rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 text-center">
                  <p className="text-[6px] font-bold tracking-widest text-zinc-500">RÉPONSES</p>
                  <p className="text-sm font-black text-white">{questionsAnswered}</p>
                </div>

                <div className="flex flex-col items-center">
                  <h2 className={`text-5xl font-black italic tracking-tighter transition-colors ${multiplier >= 1 || challengeId ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {challengeId ? `+${questionsAnswered * 100}` : `x${multiplier.toFixed(2)}`}
                  </h2>
                  <span className="text-[7px] font-bold uppercase text-zinc-500">{multiplier < 1.0 ? 'ACCUMULATION' : 'GAIN'}</span>
                </div>

                <motion.div animate={{ scale: isTimeWarning ? [1, 1.1] : 1 }} transition={{ duration: 0.5, repeat: Infinity }} className="min-w-[60px] rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 text-center">
                  <p className="text-[6px] font-bold uppercase text-zinc-500">TEMPS</p>
                  <p className={`text-sm font-black ${isTimeWarning ? 'text-rose-500' : 'text-cyan-500'}`}>{(timeRemaining / 1000).toFixed(1)}s</p>
                </motion.div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                <AnimatePresence mode="wait">
                  <motion.div key={question?.display} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center">
                    <div className="mb-4 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.35em] text-cyan-300">
                      <Radio size={12} /> calcul mental
                    </div>
                    <div className="mb-4 rounded-[2rem] border border-cyan-400/20 bg-black/25 px-6 py-5 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                      <p className="text-6xl font-black italic tracking-tighter text-white drop-shadow-2xl">{question?.display}</p>
                    </div>
                    <motion.div animate={shakeAnswer ? { x: [0, -8, 8, -8, 0] } : { x: 0 }} className={`mx-auto flex h-20 w-full max-w-[260px] items-center justify-center rounded-[1.6rem] border px-4 text-center text-5xl font-black italic tracking-tighter ${shakeAnswer ? 'border-rose-400 bg-rose-500/15 text-rose-300' : 'border-cyan-400/30 bg-white/10 text-cyan-200'}`}>
                      {input ? <span>{input}</span> : <motion.span initial={{ opacity: 0.8 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} className="text-cyan-400/70">_</motion.span>}
                    </motion.div>
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
                  <span className={`font-black ${isTimeWarning ? 'animate-pulse text-rose-400' : 'text-cyan-400'}`}>{isTimeWarning ? 'CRITIQUE' : 'OK'}</span>
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

              <div className="grid grid-cols-3 gap-2 pb-4">
                {['7', '8', '9'].map((value) => (
                  <motion.button key={value} whileTap={{ scale: 0.95 }} onClick={() => handleInputKey(value)} className="h-14 rounded-2xl border border-cyan-400/20 bg-white/5 text-2xl font-black text-white shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                    {value}
                  </motion.button>
                ))}
                {['4', '5', '6'].map((value) => (
                  <motion.button key={value} whileTap={{ scale: 0.95 }} onClick={() => handleInputKey(value)} className="h-14 rounded-2xl border border-cyan-400/20 bg-white/5 text-2xl font-black text-white shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                    {value}
                  </motion.button>
                ))}
                {['1', '2', '3'].map((value) => (
                  <motion.button key={value} whileTap={{ scale: 0.95 }} onClick={() => handleInputKey(value)} className="h-14 rounded-2xl border border-cyan-400/20 bg-white/5 text-2xl font-black text-white shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                    {value}
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleInputKey('0')} className="h-14 rounded-2xl border border-cyan-400/20 bg-white/5 text-2xl font-black text-white shadow-[0_0_18px_rgba(34,211,238,0.08)]">0</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleInputKey('DEL')} className="col-span-2 flex h-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-600/10 text-sm font-black uppercase tracking-[0.25em] text-rose-400">
                  <Delete size={18} />
                </motion.button>
                <button onClick={handleClear} className="col-span-1 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">CLR</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]/98 p-8 text-center backdrop-blur-2xl">
            <div className="w-full max-w-sm">
              <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 ${status === 'lost' && !challengeId ? 'border-rose-500/40 bg-rose-600/20' : 'border-emerald-500/40 bg-emerald-500/20'}`}>
                {status === 'lost' && !challengeId ? <ShieldAlert size={48} className="text-rose-500" /> : <Unlock size={48} className="text-emerald-500" />}
              </div>
              <h2 className="mb-2 text-4xl font-black uppercase italic tracking-tighter">
                {challengeId ? 'SCORE TRANSMIS' : status === 'lost' ? 'TEMPS ÉCOULÉ' : 'RÉUSSI'}
              </h2>
              <div className="mb-10 w-full rounded-[3rem] border border-white/10 bg-white/5 p-8 shadow-inner">
                <p className="mb-3 text-[9px] font-bold uppercase italic tracking-[0.3em] text-slate-500">{challengeId ? 'POINTS ARENA' : 'CP RÉCUPÉRÉS'}</p>
                <p className="text-6xl font-black italic tracking-tighter text-white">
                  {challengeId ? questionsAnswered * 100 : status === 'lost' ? 0 : Math.floor(betCP * multiplier)}
                  <span className="ml-1 text-lg font-black text-emerald-500">{challengeId ? 'PTS' : 'CP'}</span>
                </p>
              </div>
              <button onClick={() => router.push(challengeId ? `/client/rank?challengeId=${challengeId}` : '/client/home')} className="w-full rounded-[2rem] bg-emerald-600 py-6 text-xl font-black italic text-white shadow-2xl">
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" size={50} /></div>}>
      <QuickCalcGame />
    </Suspense>
  );
}
