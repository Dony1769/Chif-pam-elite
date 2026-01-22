"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Timer, Trophy, Construction, Zap } from 'lucide-react';
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
  const { startChallengePayment, recordAttempt, calculateFinalFee } = useChallenge();

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'input' | 'lost' | 'won' | 'loading' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Protocole de sécurité en cours...");
  const [bet, setBet] = useState(50);
  const [paidFee, setPaidFee] = useState(0); // Tracking du prix payé pour le record
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
      const timer = setTimeout(() => setStatus('input'), displayTime);
      return () => clearTimeout(timer);
    }
    if (status === 'input') {
      const interval = setInterval(() => {
        setSessionTimer(prev => {
          if (prev <= 1) { handleFailure(); return 0; }
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
        const { data: chall } = await supabase.from('challenges').select('entry_fee_base').eq('id', challengeId).single();
        if (!chall) throw new Error("Mission introuvable");

        const finalFee = calculateFinalFee(chall.entry_fee_base, profile?.vip_status);
        const { error } = await startChallengePayment(challengeId, finalFee);
        if (error) throw new Error(error);
        
        setPaidFee(finalFee); // On mémorise pour l'insert final
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
    } catch (e: any) { 
        alert(e.message); 
    } finally { setLoading(false); }
  };

  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx)) return;
    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    if (!pattern.includes(idx)) { handleFailure(); return; }
    playSound(880, 0.05);

    if (nextUserPattern.length === pattern.length) {
      const nextSolvedCount = sessionsSolved + 1;
      setSessionsSolved(nextSolvedCount);
      setMultiplier(prev => parseFloat((prev + 0.1).toFixed(1)));
      
      let nextGrid = gridSize;
      if (nextSolvedCount >= 3 && gridSize === 4) nextGrid = 5;
      if (nextSolvedCount >= 6 && gridSize === 5) nextGrid = 6;
      setGridSize(nextGrid);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 500);
    }
  };

  const handleFailure = async () => {
    setStatus('lost');
    playSound(110, 0.5, 'sawtooth');
    if (challengeId && sessionsSolved > 0) {
      await recordAttempt(challengeId, profile.id, sessionsSolved, paidFee);
    }
  };

  const cashout = async () => {
    if (loading || sessionsSolved < 1) return;
    setLoading(true);
    try {
      if (challengeId) {
        await recordAttempt(challengeId, profile.id, sessionsSolved, paidFee);
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
    } catch (e: any) { alert("Erreur système."); } finally { setLoading(false); }
  };

  return (
    <div className="h-screen bg-[#020617] text-white font-black italic uppercase overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        {/* MISE À JOUR LOGIQUE REDIRECTION */}
        <button 
          onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} 
          className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all shadow-xl"
        >
          <ChevronLeft size={20}/>
        </button>
        
        <div className="text-center">
          <h1 className="text-xl text-emerald-500 tracking-[0.2em] italic underline decoration-white/10 underline-offset-8">
            {challengeId ? "ARENA_PROTOCOL" : "BIOMETRIC_HACK"}
          </h1>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center space-y-6 bg-white/5 rounded-[3rem] border border-white/5 w-full max-w-xs p-10 backdrop-blur-md">
            <Construction size={50} className="text-amber-500 animate-pulse" />
            <h2 className="text-2xl text-amber-500 text-center">MAINTENANCE</h2>
            <p className="text-slate-500 text-[8px] text-center tracking-widest leading-loose uppercase italic">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs bg-slate-900/40 border border-white/10 p-10 rounded-[3.5rem] text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {status === 'loading' ? (
                <Loader2 className="animate-spin mx-auto text-emerald-500" size={50} />
            ) : (
                <>
                <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                    {challengeId ? <Trophy className="text-amber-500 relative" size={70} /> : <Fingerprint className="text-emerald-500 relative" size={70} />}
                </div>
                
                {!challengeId ? (
                <div className="bg-black/60 p-6 rounded-3xl border border-white/5 mb-8 shadow-inner">
                    <p className="text-[10px] text-emerald-500 mb-2 tracking-widest font-bold italic">ALLOCATION_BET (HTG)</p>
                    <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none text-white tracking-tighter" />
                </div>
                ) : (
                <div className="mb-8 p-6 bg-black/40 rounded-3xl border border-white/5 italic">
                    <p className="text-[9px] text-zinc-500 tracking-[0.3em] mb-1">MODE_CUMULATIF</p>
                    <p className="text-2xl text-white font-black">ARENA_REPUTATION</p>
                </div>
                )}

                <button onClick={startGame} disabled={loading} className={`w-full py-6 rounded-[2rem] text-xl font-black active:scale-95 shadow-2xl transition-all flex items-center justify-center gap-3 ${challengeId ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}>
                    {loading ? <Loader2 className="animate-spin" /> : "INITIALISER SCAN"}
                </button>
                </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* HUD ELITE */}
            <div className="w-full grid grid-cols-3 gap-4 mb-10 px-2">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] text-zinc-500 tracking-widest italic">TIMER</p>
                    <p className={`text-xl font-black ${sessionTimer < 4 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>{sessionTimer}S</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 opacity-20"><Zap size={10}/></div>
                    <p className="text-[7px] text-emerald-500 tracking-widest italic">{challengeId ? "SCORE" : "MULT"}</p>
                    <p className="text-2xl font-black">{challengeId ? sessionsSolved : `x${multiplier.toFixed(1)}`}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] text-zinc-500 tracking-widest italic">MATRIX</p>
                    <p className="text-xl font-black text-white">{gridSize}x{gridSize}</p>
                </div>
            </div>

            {/* GRID SCANNER */}
            <div 
              className="grid gap-2.5 p-6 bg-black/40 rounded-[3rem] border border-white/10 shadow-2xl relative"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(90vw, 360px)',
                height: 'min(90vw, 360px)'
              }}
            >
              <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none rounded-[3rem]" />
              {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCellClick(i)}
                  className={`
                    rounded-xl border-2 transition-all duration-300
                    ${status === 'showing' && pattern.includes(i) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)] scale-95' : 'bg-white/5 border-white/5'}
                    ${status === 'input' && userPattern.includes(i) ? 'bg-emerald-600 border-emerald-400 shadow-lg' : ''}
                  `}
                />
              ))}
            </div>

            {/* CASHOUT PREMIUM */}
            {!challengeId && multiplier > 1.0 && (
                <button 
                  onClick={cashout}
                  disabled={loading}
                  className="w-full mt-10 py-6 font-black rounded-[2rem] text-xl bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>ENCAISSER {(bet * multiplier).toFixed(0)} HTG <ShieldCheck size={20}/></>}
                </button>
            )}

            {challengeId && (
                <div className="mt-10 px-8 py-3 bg-white/5 rounded-full border border-white/5 flex items-center gap-3 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                    <p className="text-[8px] text-zinc-400 tracking-[0.4em] italic font-bold">UPLINK_ENCRYPTED_AND_LIVE</p>
                </div>
            )}
          </div>
        )}
      </div>

      {/* RESULT MODAL PREMIUM */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="relative mb-12">
                <div className={`absolute inset-0 blur-[100px] opacity-30 ${status === 'lost' ? 'bg-rose-600' : 'bg-emerald-500'}`} />
                {status === 'lost' ? <ShieldX size={140} className="text-rose-600 relative drop-shadow-2xl" /> : <ShieldCheck size={140} className="text-emerald-500 relative drop-shadow-2xl" />}
            </motion.div>
            
            <h2 className="text-5xl font-black tracking-tighter italic mb-4">
              {status === 'lost' ? 'CONNECTION_LOST' : 'ACCESS_GRANTED'}
            </h2>
            
            <div className="bg-white/5 p-12 rounded-[3.5rem] w-full max-w-xs mb-12 border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                <p className="text-[10px] text-zinc-500 mb-4 tracking-[0.4em] font-bold">SESSION_DATA_RECOVERY</p>
                <p className="text-6xl font-black tracking-tighter italic">
                    {challengeId ? sessionsSolved : (status === 'lost' ? '0' : (bet * multiplier).toFixed(0))} 
                    <span className="text-sm text-emerald-500 ml-3">{challengeId ? 'PTS' : 'HTG'}</span>
                </p>
            </div>

            <button 
              onClick={() => challengeId ? router.push('/client/challenges') : setStatus('idle')} 
              className="w-full max-w-xs py-7 bg-emerald-600 text-white rounded-[2.5rem] font-black text-2xl active:scale-95 transition-all shadow-2xl hover:bg-emerald-500"
            >
              {challengeId ? "RETOUR ARENA" : "RECO-SCAN"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BiometricHack() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50}/></div>}>
      <BiometricGameContent />
    </Suspense>
  );
}

