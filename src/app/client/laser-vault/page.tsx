"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2 } from 'lucide-react';

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div 
    className="relative w-12 h-20"
    animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}
    transition={{ duration: 0.5 }}
  >
    <motion.div 
      animate={isScared ? { x: [-1, 1, -1] } : {}} 
      transition={{ repeat: Infinity, duration: 0.1 }}
      className="absolute top-5 left-3 w-6 h-10 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" 
    />
    <div className="absolute top-0 left-4 w-5 h-5 bg-orange-200 rounded-full border-2 border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-6 left-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-6 right-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

export default function LaserVault() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [bet, setBet] = useState(50);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  const generateProblem = useCallback((m: number) => {
    const level = Math.floor(m);
    const a = Math.floor(Math.random() * (10 * level)) + 5;
    const b = Math.floor(Math.random() * (5 * level)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.min(level - 1, 2)];
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
      setInput("");
      generateProblem(1.0);
      setStatus('playing');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 82) { setStatus('lost'); return 82; }
        return prev + (0.2 + (multiplier * 0.1));
      });
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier]);

  const handleKey = (num: string) => {
    const newVal = input + num;
    setInput(newVal);
    if (parseInt(newVal) === problem.a) {
      setMultiplier(prev => parseFloat((prev + 0.3).toFixed(1)));
      setLaserY(0);
      setInput("");
      generateProblem(multiplier + 0.3);
    } else if (newVal.length >= problem.a.toString().length && parseInt(newVal) !== problem.a) {
        setTimeout(() => setInput(""), 200);
    }
  };

  const cashout = async () => {
    const finalPayout = Math.floor(bet * multiplier);
    await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'vault_games', p_payout: finalPayout, p_win: true });
    setStatus('won');
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden select-none relative">
      <div className="p-6 flex justify-between items-center bg-black/40 border-b border-emerald-500/10 z-50 relative">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <div className="text-center">
          <h1 className="text-xl text-emerald-500 tracking-tighter">LASER <span className="text-white font-black">VAULT</span></h1>
          <p className="text-[7px] tracking-[0.3em] text-white/30 font-bold">SECURED TERMINAL</p>
        </div>
        <div className="w-10"/>
      </div>

      <div className="h-full flex flex-col p-6 items-center">
        {status === 'idle' ? (
          <div className="mt-20 w-full max-w-xs space-y-6 animate-in zoom-in">
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 text-center shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="text-emerald-500" size={40} />
                </div>
                <p className="text-xs text-zinc-500 mb-2 font-bold tracking-widest">MISE INITIALE</p>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none mb-8 text-emerald-500" />
                <button onClick={startGame} className="w-full py-6 bg-emerald-600 text-black rounded-3xl text-xl font-bold active:scale-95 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)]">
                    {loading ? <Loader2 className="animate-spin mx-auto"/> : "ACTIVER"}
                </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-[82vh]">
            <div className="relative flex-1 bg-zinc-900/50 rounded-[2.5rem] border-4 border-zinc-800 overflow-hidden shadow-inner mb-4">
              <motion.div 
                animate={{ opacity: [1, 0.4, 1], scaleX: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.1 }}
                style={{ top: `${laserY}%` }}
                className="absolute left-0 right-0 h-1 bg-red-600 shadow-[0_0_30px_red] z-30" 
              />
              <div className="absolute top-8 left-0 right-0 text-center z-10">
                 <p className="text-[8px] tracking-[0.4em] text-zinc-500 font-bold">MULTIPLICATEUR</p>
                 <h2 className="text-5xl text-emerald-400">x{multiplier.toFixed(1)}</h2>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <motion.div key={problem.q} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                    <p className="text-7xl font-black mb-4 tracking-tighter text-white drop-shadow-2xl">{problem.q}</p>
                    <div className="h-12 text-4xl text-emerald-500 border-b-4 border-emerald-500/30 px-8 min-w-[120px] font-bold">
                        {input}
                    </div>
                 </motion.div>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                 <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => handleKey(n.toString())} className="h-16 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black hover:bg-white/10">
                  {n}
                </motion.button>
              ))}
              <button onClick={() => setInput("")} className="bg-rose-500/10 text-rose-500 rounded-2xl font-bold text-xs uppercase border border-rose-500/20">RESET</button>
              <button onClick={cashout} className="col-span-3 py-5 bg-emerald-600 text-black font-black rounded-3xl text-xl shadow-xl active:scale-95 mt-2">
                ENCAISSER {(bet * multiplier).toFixed(0)} HTG
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center">
                {status === 'lost' ? <ShieldAlert size={100} className="text-rose-500 mb-6" /> : <Unlock size={100} className="text-emerald-500 mb-6" />}
                <h2 className="text-6xl font-black italic tracking-tighter">{status === 'lost' ? 'ÉCHEC' : 'REMPORTÉ'}</h2>
                <p className="text-zinc-500 mt-2 font-bold">{status === 'lost' ? 'ALERTE DE SÉCURITÉ' : `GAIN TOTAL : ${(bet * multiplier).toFixed(0)} HTG`}</p>
                <button onClick={() => setStatus('idle')} className="mt-12 w-full max-w-xs py-6 bg-white text-black rounded-[2rem] font-black text-xl active:scale-95">CONTINUER</button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

