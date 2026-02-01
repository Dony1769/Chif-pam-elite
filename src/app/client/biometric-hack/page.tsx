"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Construction, Zap, Coins, Wallet } from 'lucide-react';

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
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'input' | 'lost' | 'won' | 'loading' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Protocole de sécurité...");
  
  const [betCP, setBetCP] = useState(100);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gridSize, setGridSize] = useState(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState(1000); 
  const [sessionTimer, setSessionTimer] = useState(10);
  const [sessionsSolved, setSessionsSolved] = useState(0);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
    checkMaintenance();
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'biometric').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg);
        setStatus('maintenance');
      } else { setStatus('idle'); }
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
    if (!profile) return;
    setLoading(true);
    try {
      const miseEntiere = Math.floor(betCP);

      // 1. Déduction des CP via RPC
      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: miseEntiere,
          p_gain_cp: 0,
          p_jeu_nom: 'Biometric Hack'
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!result.success) throw new Error(result.message);

      // 2. Insertion en base avec les noms de colonnes exacts (bet_amount)
      const { data: game, error: gameErr } = await supabase.from('biometric_games').insert([{
          user_id: profile.id,
          bet_amount: miseEntiere, // Correction ici
          multiplier: 1.0,
          is_active: true,
          status: 'pending'
      }]).select().single();
      
      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMultiplier(1.0);
      setGridSize(3);
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
      setMultiplier(prev => parseFloat((prev + 0.15).toFixed(2)));
      
      let nextGrid = gridSize;
      if (nextSolvedCount >= 3 && gridSize === 3) nextGrid = 4;
      if (nextSolvedCount >= 6 && gridSize === 4) nextGrid = 5;
      setGridSize(nextGrid);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 500);
    }
  };

  const handleFailure = async () => {
    setStatus('lost');
    playSound(110, 0.5, 'sawtooth');
    if (gameId) {
        await supabase.from('biometric_games').update({ 
            is_active: false, 
            payout: 0,
            status: 'lost' 
        }).eq('id', gameId);
    }
    init(); 
  };

  const cashout = async () => {
    if (loading || sessionsSolved < 2 || !gameId) return;
    setLoading(true);
    const gainCalculé = Math.floor(betCP * multiplier);
    try {
      // 1. Crédit des gains CP via RPC
      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: 0,
          p_gain_cp: gainCalculé,
          p_jeu_nom: 'Biometric Success'
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!result.success) throw new Error(result.message);

      // 2. Update table avec les noms de colonnes exacts
      await supabase.from('biometric_games').update({ 
        is_active: false, 
        payout: gainCalculé,
        multiplier: multiplier,
        status: 'won'
      }).eq('id', gameId);

      setStatus('won');
      playSound(523, 0.5);
    } catch (e: any) { 
      alert("Erreur système lors du cashout."); 
    } finally { 
      setLoading(false); 
      init();
    }
  };

  return (
    <div className="h-screen bg-[#020617] text-white font-black italic uppercase overflow-hidden flex flex-col font-sans">
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 shadow-xl">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-emerald-500 text-sm italic">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-[3rem] border border-white/5">
            <Construction size={50} className="text-amber-500 animate-pulse" />
            <h2 className="text-2xl text-amber-500 mt-4">MAINTENANCE</h2>
            <p className="text-slate-500 text-[8px] text-center mt-2 italic uppercase tracking-widest">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs bg-slate-900/40 border border-white/10 p-10 rounded-[3.5rem] text-center backdrop-blur-md">
            {status === 'loading' ? (
                <Loader2 className="animate-spin mx-auto text-emerald-500" size={50} />
            ) : (
                <>
                <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20" />
                    <Fingerprint className="text-emerald-500 relative" size={70} />
                </div>
                
                <div className="bg-black/60 p-6 rounded-3xl border border-white/5 mb-8">
                    <p className="text-[10px] text-emerald-500 mb-2 font-bold italic text-center">ALLOCATION CP</p>
                    <input type="number" value={betCP} onChange={e => setBetCP(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none text-white tracking-tighter" />
                </div>

                <button onClick={startGame} disabled={loading} className="w-full py-6 rounded-[2rem] text-xl font-black bg-emerald-600 text-white shadow-2xl active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin" /> : "START_SCAN"}
                </button>
                </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full grid grid-cols-3 gap-4 mb-10 px-2">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] text-zinc-500 italic">SEC_TIMER</p>
                    <p className={`text-xl font-black ${sessionTimer < 4 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>{sessionTimer}S</p>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-center">
                    <p className="text-[7px] text-emerald-500 italic font-bold">BONUS</p>
                    <p className="text-2xl font-black text-white">x{multiplier.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] text-zinc-500 italic">GRID</p>
                    <p className="text-xl font-black text-white">{gridSize}x{gridSize}</p>
                </div>
            </div>

            <div 
              className="grid gap-2.5 p-6 bg-black/40 rounded-[3rem] border border-white/10 shadow-2xl relative"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(90vw, 360px)',
                height: 'min(90vw, 360px)'
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCellClick(i)}
                  className={`
                    rounded-xl border-2 transition-all duration-300
                    ${status === 'showing' && pattern.includes(i) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-95' : 'bg-white/5 border-white/5'}
                    ${status === 'input' && userPattern.includes(i) ? 'bg-emerald-600 border-emerald-400 shadow-lg' : ''}
                  `}
                />
              ))}
            </div>

            {multiplier > 1.2 && (
                <button 
                  onClick={cashout}
                  disabled={loading}
                  className="w-full mt-10 py-6 font-black rounded-[2rem] text-xl bg-white text-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>ENCAISSER {Math.floor(betCP * multiplier)} CP <Wallet size={20}/></>}
                </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#020617]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="mb-8">
                {status === 'lost' ? <ShieldX size={120} className="text-rose-600 drop-shadow-2xl" /> : <ShieldCheck size={120} className="text-emerald-500 drop-shadow-2xl" />}
            </motion.div>
            
            <h2 className="text-4xl font-black italic mb-4 uppercase">
              {status === 'lost' ? 'Signal Interrompu' : 'Scan Complété'}
            </h2>
            
            <div className="bg-white/5 p-10 rounded-[3rem] w-full max-w-xs mb-10 border border-white/10 backdrop-blur-md">
                <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.3em] font-bold italic text-center">VALEUR RÉCUPÉRÉE</p>
                <p className="text-6xl font-black tracking-tighter italic text-center">
                    {status === 'lost' ? '0' : Math.floor(betCP * multiplier)} 
                    <span className="text-sm text-emerald-500 ml-2">CP</span>
                </p>
            </div>

            <button onClick={() => setStatus('idle')} className="w-full max-w-xs py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl active:scale-95 transition-all shadow-2xl">
              RETOUR AU SCAN
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
