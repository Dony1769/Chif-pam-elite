"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Info, Timer, Trophy } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';

// --- AUDIO SYSTEM ---
const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  if (typeof window === 'undefined') return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + duration);
};

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const { startChallengeEntry, submitChallengeScore } = useChallenge();

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'input' | 'lost' | 'won'>('idle');
  const [bet, setBet] = useState(50);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gridSize, setGridSize] = useState(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [displayTime, setDisplayTime] = useState(1000); 
  const [sessionTimer, setSessionTimer] = useState(10);
  const [sessionsSolved, setSessionsSolved] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
    };
    fetchUser();
  }, []);

  const generatePattern = useCallback((size: number) => {
    const cells = size * size;
    const count = size + 1; 
    const newPattern: number[] = [];
    while (newPattern.length < count) {
      const r = Math.floor(Math.random() * cells);
      if (!newPattern.includes(r)) newPattern.push(r);
    }
    setPattern(newPattern);
    setUserPattern([]);
    setSessionTimer(10);
    setStatus('showing');
  }, []);
  
  useEffect(() => {
    if (status === 'showing') {
      const timer = setTimeout(() => {
        setStatus('input');
      }, displayTime);
      return () => clearTimeout(timer);
    }

    if (status === 'input') {
        const interval = setInterval(() => {
            setSessionTimer(prev => {
                if (prev <= 1) {
                    setStatus('lost');
                    playSound(110, 0.5, 'sawtooth');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [status, displayTime]);

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
        const { data: id, error } = await supabase.rpc('start_biometric_hack', { p_bet: bet });
        if (error) throw new Error(error.message);
        setGameId(id);
      }

      setMultiplier(1.0);
      setGridSize(4);
      setSessionsSolved(0);
      setDisplayTime(1000);
      generatePattern(3);
      playSound(440, 0.1);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx)) return;

    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    if (!pattern.includes(idx)) {
      setStatus('lost');
      playSound(110, 0.5, 'sawtooth');
      return;
    }

    playSound(880, 0.05);

    if (nextUserPattern.length === pattern.length) {
      const nextSolvedCount = sessionsSolved + 1;
      setSessionsSolved(nextSolvedCount);
      const nextMultiplier = parseFloat((multiplier + 0.2).toFixed(1));
      setMultiplier(nextMultiplier);
      
      if (nextMultiplier > 1.2 && gridSize === 4) setGridSize(5);
      if (nextMultiplier > 1.5 && gridSize === 5) setGridSize(6);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(gridSize), 500);
    }
  };

  const cashout = async () => {
    if (status !== 'input' || sessionsSolved < 2) return;

    setLoading(true);
    try {
      if (challengeId) {
        await submitChallengeScore(challengeId, profile.id, sessionsSolved);
        setStatus('won');
      } else {
        const finalPayout = Math.floor(bet * multiplier);
        const { error } = await supabase.rpc('process_game_result', { 
          p_game_id: gameId, 
          p_table_name: 'biometric_games', 
          p_payout: finalPayout, 
          p_win: true 
        });
        if (error) throw error;
        setStatus('won');
      }
      playSound(523, 0.5);
    } catch (e: any) {
      alert("Erreur système.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden flex flex-col">
      <div className="p-4 flex justify-between items-center bg-black border-b border-emerald-500/20 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-lg"><ChevronLeft/></button>
        <div className="text-center">
          <h1 className="text-xl text-emerald-500 tracking-widest">{challengeId ? "DÉFI BIOMÉTRIQUE" : "BIOMETRIC HACK"}</h1>
        </div>
        <button onClick={() => setShowTutorial(true)} className="text-emerald-500"><Info/></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {status === 'idle' ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-xs bg-zinc-900 border border-white/10 p-8 rounded-[3rem] text-center shadow-2xl relative">
            {challengeId ? <Trophy className="mx-auto mb-6 text-amber-500" size={60} /> : <Fingerprint className="mx-auto mb-6 text-emerald-500" size={60} />}
            
            {!challengeId ? (
              <>
                <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.3em]">ENTRER MISE (HTG)</p>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none mb-8 text-white" />
              </>
            ) : (
              <div className="mb-8">
                <p className="text-[10px] text-zinc-500 mb-1">OBJECTIF</p>
                <p className="text-3xl text-white">MAX SESSIONS</p>
              </div>
            )}

            <button onClick={startGame} className={`w-full py-5 rounded-2xl text-xl font-bold active:scale-95 shadow-xl ${challengeId ? 'bg-amber-600' : 'bg-emerald-600'} text-black`}>
               {loading ? <Loader2 className="animate-spin mx-auto"/> : (challengeId ? "LANCER DÉFI" : "SCANNER")}
            </button>
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full flex justify-between mb-8 px-4">
                <div className="text-left">
                    <p className="text-[7px] text-zinc-500">TIMER</p>
                    <p className={`text-xl flex items-center gap-1 ${sessionTimer < 4 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                        <Timer size={14}/> {sessionTimer}S
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[7px] text-emerald-500 uppercase">{challengeId ? "Sessions" : "Cote"}</p>
                    <p className="text-4xl">{challengeId ? sessionsSolved : `x${multiplier.toFixed(1)}`}</p>
                </div>
                <div className="text-right">
                    <p className="text-[7px] text-zinc-500">GRILLE</p>
                    <p className="text-xl">{gridSize}x{gridSize}</p>
                </div>
            </div>

            <div 
              className="grid gap-2 p-4 bg-white/5 rounded-[2rem] border border-white/10"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(80vw, 320px)',
                height: 'min(80vw, 320px)'
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCellClick(i)}
                  className={`
                    rounded-xl border-2 transition-all duration-200
                    ${status === 'showing' && pattern.includes(i) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_emerald]' : 'bg-black/40 border-white/5'}
                    ${status === 'input' && userPattern.includes(i) ? 'bg-emerald-900 border-emerald-500' : ''}
                  `}
                />
              ))}
            </div>

            <button 
              onClick={cashout}
              disabled={status === 'showing' || loading || sessionsSolved < 2}
              className={`w-full mt-10 py-5 font-black rounded-2xl text-xl active:scale-95 transition-all flex flex-col justify-center items-center
                ${sessionsSolved < 2 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' : (challengeId ? 'bg-amber-600 text-black' : 'bg-emerald-600 text-black shadow-xl')}
              `}
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                    <span>{sessionsSolved < 2 ? "SYSTÈME VERROUILLÉ" : (challengeId ? "VALIDER LE SCORE" : `ENCAISSER ${(bet * multiplier).toFixed(0)} HTG`)}</span>
                    {sessionsSolved < 2 && <span className="text-[8px] opacity-60 italic">TERMINEZ ENCORE {2 - sessionsSolved} SESSIONS</span>}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
            {status === 'lost' ? <ShieldX size={100} className="text-red-600 mb-6" /> : <ShieldCheck size={100} className="text-emerald-500 mb-6" />}
            <h2 className="text-5xl font-black tracking-tighter uppercase">{status === 'lost' ? 'HACK FAILED' : 'HACK SUCCESS'}</h2>
            <div className="bg-white/5 p-8 rounded-[3rem] w-full mt-8 mb-8 border border-white/10">
                <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">{challengeId ? "Score Final" : "Gain"}</p>
                <p className="text-5xl">{challengeId ? sessionsSolved : (status === 'lost' ? '0' : (bet * multiplier).toFixed(0))} <span className="text-sm text-emerald-500">{challengeId ? 'SESSIONS' : 'HTG'}</span></p>
            </div>
            <button onClick={() => challengeId ? router.push('/client/challenges') : setStatus('idle')} className="w-full py-6 bg-white text-black rounded-2xl font-black text-xl uppercase tracking-tighter">
                {challengeId ? "VOIR CLASSEMENT" : "REVENIR"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BiometricHack() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#050508] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>}>
      <BiometricGameContent />
    </Suspense>
  );
}

