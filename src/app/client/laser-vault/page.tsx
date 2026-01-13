"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Zap, Loader2 } from 'lucide-react';

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div 
    className="relative w-12 h-20"
    animate={status === 'lost' ? { y: 20, opacity: 0, rotate: 90 } : {}}
  >
    <motion.div 
      animate={isScared ? { x: [-1, 1, -1] } : {}} 
      transition={{ repeat: Infinity, duration: 0.1 }}
      className="absolute top-5 left-3 w-6 h-10 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" 
    />
    <div className="absolute top-0 left-4 w-5 h-5 bg-orange-200 rounded-full border border-black/20" />
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

  // Générateur de calculs mentaux (Elite Math)
  const generateProblem = useCallback((m: number) => {
    const level = Math.floor(m);
    const a = Math.floor(Math.random() * (10 * level)) + 5;
    const b = Math.floor(Math.random() * (5 * level)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.min(level - 1, 2)];
    let res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  }, []);

  const startGame = async () => {
    setLoading(true);
    const { data: id, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
    if (error) { alert("Solde insuffisant"); setLoading(false); return; }

    setGameId(id);
    setMultiplier(1.0);
    setLaserY(0);
    setInput("");
    generateProblem(1.0);
    setStatus('playing');
    setLoading(false);
  };

  // Logique du Laser qui descend
  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 85) { setStatus('lost'); return 85; }
        // Le laser accélère selon le multiplicateur
        return prev + (0.3 * multiplier);
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
    }
  };

  const cashout = async () => {
    const finalPayout = Math.floor(bet * multiplier);
    await supabase.rpc('process_game_result', { 
      p_game_id: gameId, 
      p_table_name: 'vault_games', 
      p_payout: finalPayout, 
      p_win: true 
    });
    setStatus('won');
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden select-none">
      
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center bg-black/40 border-b border-emerald-500/10">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <div className="text-center">
          <h1 className="text-xl text-emerald-500 tracking-tighter">LASER <span className="text-white">VAULT</span></h1>
          <p className="text-[7px] tracking-[0.3em] text-white/30">ELITE SECURITY</p>
        </div>
        <div className="w-10"/>
      </div>

      <div className="h-full flex flex-col p-6 items-center">
        {status === 'idle' ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-20 w-full max-w-xs space-y-6">
            <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 text-center shadow-2xl relative">
                <Lock className="mx-auto text-emerald-500 mb-4" size={50} />
                <p className="text-xs text-zinc-500 mb-2">MISE HTG</p>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none mb-6 text-emerald-500" />
                <button onClick={startGame} className="w-full py-5 bg-emerald-600 text-black rounded-3xl text-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto"/> : "HACKER"}
                </button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-[80vh]">
            
            {/* ZONE DE DANGER (LE COFFRE) */}
            <div className="relative flex-1 bg-zinc-900/50 rounded-[2.5rem] border-4 border-zinc-800 overflow-hidden shadow-inner">
              
              {/* LASER VISUEL */}
              <motion.div 
                animate={{ opacity: [1, 0.3, 1], scaleX: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 0.1 }}
                style={{ top: `${laserY}%` }}
                className="absolute left-0 right-0 h-1 bg-red-600 shadow-[0_0_25px_red] z-30" 
              />

              {/* INFOS DU JEU */}
              <div className="absolute top-8 left-0 right-0 text-center">
                 <p className="text-[8px] tracking-[0.4em] text-zinc-500">CÔTE ACTUELLE</p>
                 <h2 className="text-4xl text-emerald-400">x{multiplier.toFixed(1)}</h2>
              </div>

              {/* CALCUL */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <motion.div key={problem.q} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                    <p className="text-6xl font-black mb-4 tracking-tighter">{problem.q}</p>
                    <div className="h-10 text-3xl text-emerald-500 border-b-2 border-emerald-500/30 px-6 min-w-[80px]">
                        {input}
                    </div>
                 </motion.div>
              </div>

              {/* AVATAR AU FOND DU COFFRE */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                 <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            {/* CLAVIER NUMÉRIQUE */}
            <div className="grid grid-cols-3 gap-2 mt-4 pb-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => handleKey(n.toString())} className="h-14 bg-white/5 border border-white/5 rounded-2xl text-xl font-bold">
                  {n}
                </motion.button>
              ))}
              <button onClick={() => setInput("")} className="bg-red-500/10 text-red-500 rounded-2xl font-bold text-xs uppercase">Effacer</button>
              <button onClick={cashout} className="col-span-3 py-4 bg-emerald-600 text-black font-black rounded-2xl text-xl shadow-lg mt-2">
                ENCAISSER {(bet * multiplier).toFixed(0)} HTG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FIN */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center">
                {status === 'lost' ? <ShieldAlert size={100} className="text-red-500 mb-6" /> : <Unlock size={100} className="text-emerald-500 mb-6" />}
                <h2 className="text-5xl font-black italic">{status === 'lost' ? 'SÉCURITÉ ACTIVÉE' : 'ACCÈS ACCORDÉ'}</h2>
                <p className="text-zinc-500 mt-2">{status === 'lost' ? 'LE LASER VOUS A DÉTECTÉ.' : `GAIN : ${(bet * multiplier).toFixed(0)} HTG`}</p>
                <button onClick={() => setStatus('idle')} className="mt-10 w-full max-w-xs py-5 bg-white text-black rounded-[2rem] font-black">REJOUER</button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
