"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Info } from 'lucide-react';

// --- AUDIO SYSTEM ---
const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
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

export default function BiometricHack() {
  const router = useRouter();
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
    setStatus('showing');
  }, []);
  
  useEffect(() => {
    if (status === 'showing') {
      const timer = setTimeout(() => {
        setStatus('input');
      }, displayTime);
      return () => clearTimeout(timer);
    }
  }, [status, displayTime]);

  const startGame = async () => {
    setLoading(true);
    try {
      const { data: id, error } = await supabase.rpc('start_biometric_hack', { p_bet: bet });
      if (error) throw new Error(error.message);
      setGameId(id);
      setMultiplier(1.0);
      setGridSize(4);
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
      const nextMultiplier = parseFloat((multiplier + 0.2).toFixed(1));
      setMultiplier(nextMultiplier);
      
      if (nextMultiplier > 1.2 && gridSize === 4) setGridSize(5);
      if (nextMultiplier > 1.5 && gridSize === 5) setGridSize(6);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(gridSize), 500);
    }
  };

  // --- MISE À JOUR DE LA FONCTION CASHOUT ---
  const cashout = async () => {
    if (!gameId || status !== 'input') return;

    setLoading(true);
    try {
      const finalPayout = Math.floor(bet * multiplier);
      
      const { error } = await supabase.rpc('process_game_result', { 
        p_game_id: gameId, 
        p_table_name: 'biometric_games', 
        p_payout: finalPayout, 
        p_win: true 
      });

      if (error) throw error;

      setStatus('won');
      playSound(523, 0.5);
    } catch (e: any) {
      console.error(e.message);
      alert("Erreur lors de l'encaissement. Contactez le support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden flex flex-col">
      <div className="p-4 flex justify-between items-center bg-black border-b border-emerald-500/20">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-lg"><ChevronLeft/></button>
        <div className="text-center">
          <h1 className="text-xl text-emerald-500 tracking-widest">BIOMETRIC HACK</h1>
          <p className="text-[6px] text-white/40 tracking-[0.4em]">NEURAL INTERFACE v2.0</p>
        </div>
        <button onClick={() => setShowTutorial(true)} className="text-emerald-500"><Info/></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {status === 'idle' ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-xs bg-zinc-900 border border-white/10 p-8 rounded-[3rem] text-center shadow-2xl">
            <Fingerprint className="mx-auto mb-6 text-emerald-500" size={60} />
            <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.3em]">ENTRER MISE (HTG)</p>
            <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none mb-8 text-white" />
            <button onClick={startGame} className="w-full py-5 bg-emerald-600 text-black rounded-2xl text-xl font-bold active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
               {loading ? <Loader2 className="animate-spin mx-auto"/> : "SCANNER"}
            </button>
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="w-full flex justify-between mb-8 px-4">
                <div className="text-left">
                    <p className="text-[7px] text-zinc-500">SÉCURITÉ</p>
                    <p className="text-xl text-red-500">{displayTime}ms</p>
                </div>
                <div className="text-center">
                    <p className="text-[7px] text-emerald-500">COTE ACTUELLE</p>
                    <p className="text-4xl">x{multiplier.toFixed(1)}</p>
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
              disabled={status === 'showing' || loading}
              className="w-full mt-10 py-5 bg-emerald-600 text-black font-black rounded-2xl text-xl active:scale-95 disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : `ENCAISSER ${(bet * multiplier).toFixed(0)} HTG`}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTutorial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-emerald-500/30 p-8 rounded-[2.5rem] max-w-xs">
              <h3 className="text-2xl text-emerald-500 mb-6 text-center">BIOMETRIC MANUAL</h3>
              <div className="space-y-6 text-[10px] text-zinc-400">
                <p className="flex gap-3"><span className="text-emerald-500">1.</span> MÉMORISEZ LES CASES QUI S'ALLUMENT EN VERT.</p>
                <p className="flex gap-3"><span className="text-emerald-500">2.</span> REPRODUISEZ LE PATTERN EXACT APRÈS L'EXTINCTION.</p>
                <p className="flex gap-3"><span className="text-emerald-500">3.</span> PLUS LA COTE MONTE, PLUS LA GRILLE GRANDIT ET LE TEMPS DIMINUE.</p>
              </div>
              <button onClick={() => setShowTutorial(false)} className="w-full mt-10 py-4 bg-emerald-600 text-black rounded-xl font-black">START SYSTEM</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
            {status === 'lost' ? <ShieldX size={100} className="text-red-600 mb-6" /> : <ShieldCheck size={100} className="text-emerald-500 mb-6" />}
            <h2 className="text-5xl font-black tracking-tighter">{status === 'lost' ? 'ACCESS DENIED' : 'SYSTEM BREACHED'}</h2>
            <div className="bg-white/5 p-8 rounded-[3rem] w-full mt-8 mb-8 border border-white/10">
                <p className="text-[10px] text-zinc-500 mb-2">TRANSFERT FINAL</p>
                <p className="text-5xl">{status === 'lost' ? '0' : (bet * multiplier).toFixed(0)} <span className="text-sm text-emerald-500">HTG</span></p>
            </div>
            <button onClick={() => setStatus('idle')} className="w-full py-6 bg-white text-black rounded-2xl font-black text-xl">REVENIR</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
