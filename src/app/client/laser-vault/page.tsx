"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Zap, Lock, Unlock, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- COMPOSANT AVATAR ARTICULÉ ---
const EliteAvatar = ({ status, isJumping }: { status: string, isJumping: boolean }) => (
  <motion.div className="relative w-12 h-20" animate={status === 'lost' ? { rotate: 90, y: 10, opacity: 0 } : { y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
    <motion.div className="absolute top-5 left-3 w-6 h-10 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" />
    <motion.div className="absolute top-0 left-4 w-5 h-5 bg-orange-200 rounded-full border border-black/20" />
    {/* Bras & Jambes articulés */}
    <motion.div animate={{ rotate: isJumping ? -40 : 10 }} className="absolute top-6 left-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={{ rotate: isJumping ? 40 : -10 }} className="absolute top-6 right-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={{ rotate: isJumping ? -20 : 0 }} className="absolute bottom-0 left-3 w-2 h-7 bg-emerald-800 rounded-full origin-top" />
    <motion.div animate={{ rotate: isJumping ? 20 : 0 }} className="absolute bottom-0 right-3 w-2 h-7 bg-emerald-800 rounded-full origin-top" />
  </motion.div>
);

export default function LaserVault() {
  const router = useRouter();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [bet, setBet] = useState(50);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameId, setGameId] = useState<string | null>(null);

  // Générateur de problèmes (Admin safe : difficulté croissante)
  const generateProblem = useCallback((mult: number) => {
    const level = Math.floor(mult);
    const a = Math.floor(Math.random() * (10 * level)) + 5;
    const b = Math.floor(Math.random() * (5 * level)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.min(level - 1, 2)];
    let q = `${a} ${op} ${b}`;
    let res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q, a: res });
  }, []);

  const startGame = async () => {
    const { data: newId, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
    if (error) return alert("Solde insuffisant !");
    setGameId(newId);
    setGameState('playing');
    setMultiplier(1.2);
    setLaserY(0);
    generateProblem(1.2);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 88) { setGameState('lost'); return 88; }
        return prev + (0.5 * multiplier);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [gameState, multiplier]);

  const handleKey = (num: string) => {
    const newVal = input + num;
    setInput(newVal);
    if (parseInt(newVal) === problem.a) {
      setMultiplier(prev => prev + 0.4);
      setLaserY(0);
      setInput("");
      generateProblem(multiplier + 0.4);
    }
  };

  const cashout = async () => {
    await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'vault_games', p_payout: Math.floor(bet * multiplier), p_win: true });
    setGameState('won');
  };

  return (
    <div className="h-screen bg-black text-white font-sans overflow-hidden flex flex-col">
      {/* Header Premium */}
      <div className="p-4 flex justify-between items-center bg-zinc-900/50 border-b border-emerald-500/20">
        <ArrowLeft onClick={() => router.back()} className="text-emerald-500 cursor-pointer" />
        <div className="text-center">
          <h1 className="text-emerald-500 font-black tracking-tighter">VAULT <span className="text-white">LASER</span></h1>
          <p className="text-[10px] text-zinc-500">SÉCURITÉ MAXIMALE</p>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center p-6">
        {gameState === 'idle' ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs space-y-4 text-center">
            <div className="bg-zinc-900 border border-emerald-500/30 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              <Lock className="mx-auto mb-4 text-emerald-500" size={48} />
              <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none text-emerald-500" />
              <p className="text-xs text-zinc-500 mb-6 uppercase tracking-widest">Mise HTG</p>
              <button onClick={startGame} className="w-full py-4 bg-emerald-600 rounded-2xl font-black hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all">DÉVERROUILLER</button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full max-w-sm h-full flex flex-col pt-10">
            {/* Fenêtre du Coffre */}
            <div className="relative flex-1 bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-800 overflow-hidden shadow-inner">
              {/* Le Laser (Framer Motion) */}
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }} 
                transition={{ repeat: Infinity, duration: 0.2 }}
                style={{ top: `${laserY}%` }}
                className="absolute left-0 right-0 h-1 bg-red-600 shadow-[0_0_20px_red] z-30" 
              />
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                <p className="text-zinc-500 text-xs font-mono mb-2">CRACKING CODE...</p>
                <h2 className="text-5xl font-black font-mono tracking-tighter">{problem.q}</h2>
                <div className="mt-4 h-12 text-3xl font-black text-emerald-500 underline underline-offset-8">{input}</div>
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                <EliteAvatar status={gameState} isJumping={false} />
              </div>
            </div>

            {/* Clavier et Cashout */}
            <div className="grid grid-cols-3 gap-2 mt-4 pb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => handleKey(n.toString())} className="h-14 bg-zinc-900 border border-white/5 rounded-xl text-xl font-bold">
                  {n}
                </motion.button>
              ))}
              <button onClick={cashout} className="col-span-2 bg-emerald-600 text-black font-black rounded-xl text-lg tracking-tighter">
                ENCAISSER x{multiplier.toFixed(1)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals de Fin */}
      <AnimatePresence>
        {(gameState === 'lost' || gameState === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
            <div className="text-center space-y-6">
              {gameState === 'lost' ? <ShieldAlert size={80} className="text-red-500 mx-auto" /> : <Unlock size={80} className="text-emerald-500 mx-auto" />}
              <h2 className="text-4xl font-black italic uppercase">{gameState === 'lost' ? 'ÉLIMINÉ' : 'COFFRE OUVERT'}</h2>
              <p className="text-xl text-zinc-400">{gameState === 'lost' ? 'Le laser vous a touché.' : `+ ${Math.floor(bet * multiplier)} HTG`}</p>
              <button onClick={() => setGameState('idle')} className="w-full py-4 bg-white text-black rounded-2xl font-black">CONTINUER</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

