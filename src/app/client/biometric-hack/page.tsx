"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Info, Timer, Trophy, Construction } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge';

// --- AUDIO SYSTEM ---
const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const { startChallengeEntry, submitChallengeScore, calculateFinalFee } = useChallenge();

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'input' | 'lost' | 'won' | 'loading' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Protocole de sécurité en cours...");
  const [bet, setBet] = useState(50);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gridSize, setGridSize] = useState(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState(1000); 
  const [sessionTimer, setSessionTimer] = useState(10);
  const [sessionsSolved, setSessionsSolved] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      checkMaintenance();
    };
    init();
  }, []);

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'biometric').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg);
        setStatus('maintenance');
      } else {
        setStatus('idle');
      }
    } catch (e) { setStatus('idle'); }
  };

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
                    handleFailure();
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

        const finalFee = calculateFinalFee(chall.entry_fee, profile?.vip_status);
        const { error } = await startChallengeEntry(challengeId, profile.id, finalFee);
        if (error) throw new Error(error);
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
      handleFailure();
      return;
    }

    playSound(880, 0.05);

    if (nextUserPattern.length === pattern.length) {
      const nextSolvedCount = sessionsSolved + 1;
      setSessionsSolved(nextSolvedCount);
      const nextMultiplier = parseFloat((multiplier + 0.1).toFixed(1));
      setMultiplier(nextMultiplier);
      
      // Augmentation de difficulté
      let nextGrid = gridSize;
      if (nextSolvedCount >= 3 && gridSize === 4) nextGrid = 6;
      if (nextSolvedCount >= 6 && gridSize === 6) nextGrid = 8;
      setGridSize(nextGrid);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 500);
    }
  };

  const handleFailure = async () => {
    setStatus('lost');
    playSound(110, 0.5, 'sawtooth');
    if (challengeId) {
      // Enregistre le score même si perdu
      await submitChallengeScore(challengeId, profile.id, sessionsSolved);
    }
  };

  const cashout = async () => {
    if (loading || sessionsSolved < 1) return;
    setLoading(true);
    try {
      if (challengeId) {
        await submitChallengeScore(challengeId, profile.id, sessionsSolved);
        setStatus('won');
      } else {
        const finalPayout = Math.floor(bet * multiplier);
        await supabase.rpc('process_game_result', { 
          p_game_id: gameId, 
          p_table_name: 'biometric_games', 
          p_payout: finalPayout, 
          p_win: true 
        });
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
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden flex flex-col font-sans">
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-emerald-500/10 z-50">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all"><ChevronLeft size={20}/></button>
        <div className="text-center">
          <h1 className="text-xl text-emerald-500 tracking-[0.2em]">{challengeId ? "ARENA BIOMETRIC" : "BIOMETRIC HACK"}</h1>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 bg-white/5 rounded-[3rem] border border-white/5 w-full max-w-xs p-8">
            <Construction size={50} className="text-amber-500 animate-pulse" />
            <h2 className="text-2xl text-amber-500 text-center">MAINTENANCE</h2>
            <p className="text-slate-500 text-[8px] text-center tracking-widest leading-loose">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs bg-zinc-900/50 border border-white/5 p-8 rounded-[3rem] text-center shadow-2xl backdrop-blur-sm">
            {status === 'loading' ? (
                <Loader2 className="animate-spin mx-auto text-emerald-500" size={40} />
            ) : (
                <>
                {challengeId ? <Trophy className="mx-auto mb-6 text-amber-500" size={60} /> : <Fingerprint className="mx-auto mb-6 text-emerald-500" size={60} />}
                
                {!challengeId ? (
                <div className="bg-black/40 p-5 rounded-2xl border border-white/10 mb-8">
                    <p className="text-[10px] text-emerald-500 mb-2 tracking-widest font-bold">MISE (HTG)</p>
                    <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none text-white" />
                </div>
                ) : (
                <div className="mb-8 space-y-1">
                    <p className="text-[10px] text-zinc-500 tracking-widest">MODE DÉFI CUMULATIF</p>
                    <p className="text-2xl text-white">SCORE GLOBAL</p>
                </div>
                )}

                <button onClick={startGame} className={`w-full py-6 rounded-3xl text-xl font-black active:scale-95 shadow-xl transition-all ${challengeId ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}>
                    LANCER LE SCAN
                </button>
                </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* HUD */}
            <div className="w-full flex justify-between mb-8 px-4">
                <div className="text-left">
                    <p className="text-[7px] text-zinc-500 tracking-widest">TEMPS RESTANT</p>
                    <p className={`text-xl font-black ${sessionTimer < 4 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                        {sessionTimer}S
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[7px] text-emerald-500 tracking-widest">{challengeId ? "SESSIONS" : "MULTIPLICATEUR"}</p>
                    <p className="text-4xl font-black">{challengeId ? sessionsSolved : `x${multiplier.toFixed(1)}`}</p>
                </div>
                <div className="text-right">
                    <p className="text-[7px] text-zinc-500 tracking-widest">MATRICE</p>
                    <p className="text-xl font-black text-white">{gridSize}x{gridSize}</p>
                </div>
            </div>

            {/* GRID */}
            <div 
              className="grid gap-2 p-5 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-inner"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(85vw, 340px)',
                height: 'min(85vw, 340px)'
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCellClick(i)}
                  className={`
                    rounded-xl border-2 transition-all duration-200
                    ${status === 'showing' && pattern.includes(i) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-95' : 'bg-black/40 border-white/5'}
                    ${status === 'input' && userPattern.includes(i) ? 'bg-emerald-600 border-emerald-400' : ''}
                  `}
                />
              ))}
            </div>

            {/* CASHOUT BUTTON */}
            {!challengeId && multiplier > 1.0 && (
                <button 
                onClick={cashout}
                disabled={loading}
                className="w-full mt-10 py-6 font-black rounded-[2rem] text-xl bg-emerald-600 text-white shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                {loading ? <Loader2 className="animate-spin" /> : <>ENCAISSER {(bet * multiplier).toFixed(0)} HTG <ShieldCheck size={20}/></>}
                </button>
            )}

            {challengeId && (
                <div className="mt-8 text-center text-[8px] text-zinc-500 tracking-[0.4em] animate-pulse">
                    SYSTÈME D'ENREGISTREMENT AUTOMATIQUE ACTIF
                </div>
            )}
          </div>
        )}
      </div>

      {/* RESULT MODAL */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-8">
                <div className={`absolute inset-0 blur-3xl opacity-20 ${status === 'lost' ? 'bg-red-600' : 'bg-emerald-500'}`} />
                {status === 'lost' ? <ShieldX size={120} className="text-red-600 relative" /> : <ShieldCheck size={120} className="text-emerald-500 relative" />}
            </div>
            
            <h2 className="text-5xl font-black tracking-tighter italic">{status === 'lost' ? 'HACK ÉCHOUÉ' : 'SYSTÈME FORCÉ'}</h2>
            
            <div className="bg-white/5 p-10 rounded-[3rem] w-full max-w-xs mt-10 mb-10 border border-white/10 shadow-inner">
                <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.3em] font-bold">RÉSULTAT DE SESSION</p>
                <p className="text-5xl font-black">
                    {challengeId ? sessionsSolved : (status === 'lost' ? '0' : (bet * multiplier).toFixed(0))} 
                    <span className="text-sm text-emerald-500 ml-2">{challengeId ? 'SESSIONS' : 'HTG'}</span>
                </p>
            </div>

            <button onClick={() => challengeId ? router.push('/client/rank') : setStatus('idle')} className="w-full max-w-xs py-6 bg-white text-black rounded-[2rem] font-black text-xl active:scale-95 transition-all">
                {challengeId ? "VOIR TON RANG" : "RETOUR UNITÉ"}
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

