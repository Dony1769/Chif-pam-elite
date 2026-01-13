"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, Info, X } from 'lucide-react';

// --- SYSTÈME AUDIO ---
const playSound = (type: 'beep' | 'error' | 'win' | 'lost' | 'laser') => {
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
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
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

export default function LaserVault() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [showTutorial, setShowTutorial] = useState(false);
  const [bet, setBet] = useState(50);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [laserSpeedMultiplier, setLaserSpeedMultiplier] = useState(1.0);
  
  const lastTickRef = useRef<number>(0);

  const generateProblem = useCallback((m: number) => {
    const level = Math.floor(m * 2);
    const a = Math.floor(Math.random() * (10 + level)) + 2;
    const b = Math.floor(Math.random() * (10 + level)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  }, []);

  const startGame = async () => {
    setLoading(true);
    try {
      const { data: id, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
      if (error) throw new Error(error.message);
      setGameId(id);
      setMultiplier(1.0);
      setLaserY(0);
      setLaserSpeedMultiplier(1.0);
      setInput("");
      generateProblem(1.0);
      setStatus('playing');
      lastTickRef.current = performance.now();
      playSound('beep');
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      
      // PROTECTION ANTI-TRICHE (Si l'onglet est inactif ou le temps manipulé)
      if (delta > 300) { 
        setLaserY(prev => prev + 10); // Sanction immédiate
      }

      setLaserY(prev => {
        if (prev >= 85) { setStatus('lost'); playSound('error'); return 85; }
        return prev + (0.3 * laserSpeedMultiplier * (1 + (multiplier - 1) * 0.2));
      });
      lastTickRef.current = now;
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier, laserSpeedMultiplier]);

  const handleKey = (num: string) => {
    playSound('beep');
    const newVal = input + num;
    setInput(newVal);
    
    if (parseInt(newVal) === problem.a) {
      setMultiplier(prev => parseFloat((prev + 0.1).toFixed(1))); // Gain admin maîtrisé
      setLaserY(0);
      setInput("");
      generateProblem(multiplier + 0.1);
    } else if (newVal.length >= problem.a.toString().length && newVal !== "-") {
      // ERREUR : Le laser descend plus vite pour le reste de la partie
      setLaserSpeedMultiplier(p => p + 0.2);
      setInput("");
      playSound('error');
    }
  };

  const cashout = async () => {
    const finalPayout = Math.floor(bet * multiplier);
    await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'vault_games', p_payout: finalPayout, p_win: true });
    setStatus('won');
    playSound('win');
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden select-none flex flex-col">
      {/* HEADER COMPACT */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-emerald-500/10 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10"><ChevronLeft size={20}/></button>
        <div className="text-center">
          <h1 className="text-lg text-emerald-500 tracking-tighter">LASER VAULT</h1>
          <p className="text-[6px] tracking-[0.3em] text-white/30 font-bold">ANTI-THEFT SYSTEM</p>
        </div>
        <button onClick={() => setShowTutorial(true)} className="p-2 text-emerald-500"><Info size={20}/></button>
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between overflow-hidden">
        {status === 'idle' ? (
          <div className="mt-10 w-full max-w-xs space-y-6 animate-in zoom-in">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
                <Lock className="text-emerald-500 mx-auto mb-4" size={40} />
                <p className="text-[10px] text-zinc-500 mb-1 tracking-widest">MISE HTG</p>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none mb-6 text-white" />
                <button onClick={startGame} className="w-full py-5 bg-emerald-600 text-black rounded-2xl text-xl font-bold active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto"/> : "ACTIVER"}
                </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-full">
            {/* ZONE DU COFFRE - RÉDUITE POUR LE MOBILE */}
            <div className="relative h-[35vh] bg-zinc-900/50 rounded-[2rem] border-2 border-zinc-800 overflow-hidden shadow-inner mb-3">
              <motion.div style={{ top: `${laserY}%` }} className="absolute left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_20px_red] z-30" />
              <div className="absolute top-4 left-0 right-0 text-center z-10">
                 <p className="text-[7px] text-zinc-500 font-bold">COTE</p>
                 <h2 className="text-3xl text-emerald-400">x{multiplier.toFixed(1)}</h2>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <motion.div key={problem.q} className="text-center">
                    <p className="text-5xl font-black mb-2 tracking-tighter text-white">{problem.q}</p>
                    <div className="h-10 text-3xl text-emerald-500 border-b-2 border-emerald-500/30 px-6 min-w-[100px]">{input}</div>
                 </motion.div>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                 <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            {/* CLAVIER - ULTRA COMPACT */}
            <div className="flex-1 flex flex-col justify-end gap-2 pb-4">
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                  <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => handleKey(n.toString())} className="h-12 bg-white/5 border border-white/10 rounded-xl text-xl font-black">
                    {n}
                  </motion.button>
                ))}
                <button onClick={() => setInput("")} className="bg-rose-500/10 text-rose-500 rounded-xl font-bold text-xs">CLR</button>
              </div>
              <button onClick={cashout} className="w-full py-4 bg-emerald-600 text-black font-black rounded-xl text-lg shadow-lg active:scale-95 border-b-4 border-emerald-800">
                ENCAISSER {(bet * multiplier).toFixed(0)} HTG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TUTORIEL MODAL */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-emerald-500/30 p-8 rounded-[2rem] max-w-xs relative">
              <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 text-zinc-500"><X/></button>
              <h3 className="text-2xl text-emerald-500 mb-4">COMMENT JOUER ?</h3>
              <ul className="text-xs space-y-4 text-zinc-300 italic">
                <li className="flex gap-3"><span className="text-emerald-500 font-bold">01.</span> Résolvez le calcul avant que le laser ne touche l'avatar.</li>
                <li className="flex gap-3"><span className="text-emerald-500 font-bold =">02.</span> Chaque erreur accélère le laser définitivement !</li>
                <li className="flex gap-3"><span className="text-emerald-500 font-bold">03.</span> Encaissez avant qu'il ne soit trop tard.</li>
              </ul>
              <button onClick={() => setShowTutorial(false)} className="w-full mt-8 py-4 bg-emerald-600 text-black rounded-xl font-black">COMPRIS</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL FIN */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
                {status === 'lost' ? <ShieldAlert size={80} className="text-rose-500 mb-4" /> : <Unlock size={80} className="text-emerald-500 mb-4" />}
                <h2 className="text-5xl font-black italic">{status === 'lost' ? 'BUSTED' : 'CLEAN'}</h2>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 w-full mt-6 mb-8">
                    <p className="text-xs text-zinc-500 mb-2 tracking-widest uppercase">RÉSULTAT</p>
                    <p className="text-4xl text-white font-black">{status === 'lost' ? '0' : (bet * multiplier).toFixed(0)} <span className="text-sm text-zinc-500">HTG</span></p>
                </div>
                <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg">REJOUER</button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

