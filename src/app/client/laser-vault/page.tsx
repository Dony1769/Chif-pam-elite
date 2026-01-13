"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, Info, X } from 'lucide-react';

// --- SYSTEME AUDIO ELITE (WebAudio) ---
const playSound = (type: 'win' | 'lost' | 'laser' | 'click') => {
  if (typeof window === 'undefined') return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'click') {
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'laser') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } else if (type === 'lost') {
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-12 h-20" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-5 left-3 w-6 h-10 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" />
    <div className="absolute top-0 left-4 w-5 h-5 bg-orange-200 rounded-full border-2 border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-6 left-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-6 right-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
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

  useEffect(() => {
    const tutorialDone = localStorage.getItem('laser_tutorial_done');
    if (!tutorialDone) setShowTutorial(true);
  }, []);

  const generateProblem = useCallback((m: number) => {
    const level = Math.floor(m * 1.5); // Difficulté plus rapide
    const a = Math.floor(Math.random() * (10 * level)) + 2;
    const b = Math.floor(Math.random() * (8 * level)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * Math.min(level, 3))];
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
    } catch (e: any) { alert(e.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 82) { playSound('lost'); setStatus('lost'); return 82; }
        return prev + (0.25 + (multiplier * 0.12)); // Vitesse augmentée pour l'admin
      });
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier]);

  const handleKey = (val: string) => {
    playSound('click');
    if (val === '-' && input !== "") return;
    const newVal = input + val;
    setInput(newVal);

    if (newVal === problem.a.toString()) {
      setMultiplier(prev => parseFloat((prev + 0.15).toFixed(2))); // Gain réduit à 0.15
      setLaserY(0);
      setInput("");
      generateProblem(multiplier + 0.15);
    } else if (newVal.length >= problem.a.toString().length && newVal !== "-") {
      // Mauvaise réponse : Le laser descend de 5% d'un coup
      playSound('laser');
      setLaserY(p => Math.min(p + 5, 82));
      setTimeout(() => setInput(""), 150);
    }
  };

  const cashout = async () => {
    const finalPayout = Math.floor(bet * multiplier);
    await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'vault_games', p_payout: finalPayout, p_win: true });
    setStatus('won');
  };

  const closeTutorial = () => {
    localStorage.setItem('laser_tutorial_done', 'true');
    setShowTutorial(false);
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden flex flex-col">
      
      {/* HEADER COMPACT */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10"><ChevronLeft size={20}/></button>
        <div className="text-center">
          <h1 className="text-lg text-emerald-500 tracking-tighter leading-none">LASER VAULT</h1>
          <p className="text-[6px] tracking-[0.3em] text-white/30 font-bold">ANTI-HACK SYSTEM</p>
        </div>
        <button onClick={() => setShowTutorial(true)} className="p-2 text-zinc-500"><Info size={20}/></button>
      </div>

      <div className="flex-1 relative flex flex-col p-4 gap-4 overflow-hidden">
        {status === 'idle' ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in">
             <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-xs text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="text-emerald-500" size={30} />
                </div>
                <p className="text-[10px] text-zinc-500 mb-1 tracking-widest font-bold">MISE HTG</p>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none mb-6 text-white" />
                <button onClick={startGame} className="w-full py-5 bg-emerald-600 text-black rounded-2xl text-xl font-bold active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto"/> : "START HACK"}
                </button>
            </div>
          </div>
        ) : (
          <>
            {/* VAULT DISPLAY */}
            <div className="relative flex-[1.2] bg-zinc-900/40 rounded-[2rem] border-2 border-zinc-800 overflow-hidden shadow-inner">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} style={{ top: `${laserY}%` }} className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_15px_red] z-30" />
              
              <div className="absolute top-4 left-0 right-0 text-center z-10">
                 <p className="text-[7px] tracking-[0.3em] text-zinc-500 font-bold uppercase">Multiplicateur</p>
                 <h2 className="text-3xl text-emerald-400 leading-none">x{multiplier.toFixed(2)}</h2>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <motion.div key={problem.q} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                    <p className="text-5xl font-black tracking-tighter text-white/90">{problem.q}</p>
                    <div className="mt-2 h-10 text-3xl text-emerald-500 border-b-2 border-emerald-500/20 px-4 inline-block min-w-[80px]">
                        {input}
                    </div>
                 </motion.div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                 <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            {/* KEYPAD COMPACT */}
            <div className="flex-1 grid grid-cols-3 gap-1.5 max-h-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                <button key={n} onClick={() => handleKey(n.toString())} className="bg-white/5 border border-white/5 rounded-xl text-xl font-black active:bg-white/20 transition-colors">
                  {n}
                </button>
              ))}
              <button onClick={() => setInput("")} className="bg-rose-500/10 text-rose-500 rounded-xl font-black text-xs">DEL</button>
            </div>
          </>
        )}
      </div>

      {/* FIXED FOOTER CASHOUT */}
      {status === 'playing' && (
        <div className="p-4 bg-black/80 backdrop-blur-md border-t border-white/5 animate-in slide-in-from-bottom">
           <button onClick={cashout} className="w-full py-4 bg-emerald-600 text-black font-black rounded-2xl text-lg shadow-lg active:scale-95 transition-all">
             ENCAISSER {(bet * multiplier).toFixed(0)} HTG
           </button>
        </div>
      )}

      {/* TUTORIAL MODAL */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-emerald-500/30 p-8 rounded-[2.5rem] max-w-xs w-full text-center relative">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tighter">COMMENT JOUER</h3>
              <ul className="text-left text-[11px] space-y-4 text-zinc-400 font-bold mb-8 italic uppercase">
                <li className="flex gap-3"><Zap size={14} className="text-emerald-500 shrink-0"/> Résolvez le calcul pour réinitialiser le laser.</li>
                <li className="flex gap-3"><Zap size={14} className="text-emerald-500 shrink-0"/> Chaque réussite augmente votre gain.</li>
                <li className="flex gap-3"><Zap size={14} className="text-emerald-500 shrink-0"/> Attention: Une erreur fait descendre le laser !</li>
                <li className="flex gap-3"><Zap size={14} className="text-emerald-500 shrink-0"/> Encassez avant que le laser ne touche l'avatar.</li>
              </ul>
              <button onClick={closeTutorial} className="w-full py-4 bg-white text-black rounded-2xl font-black">J'AI COMPRIS</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULT MODAL */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[150] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
                {status === 'lost' ? <ShieldAlert size={80} className="text-rose-500 mb-4" /> : <Unlock size={80} className="text-emerald-500 mb-4" />}
                <h2 className="text-5xl font-black italic tracking-tighter leading-none">{status === 'lost' ? 'DETECTION' : 'HACK REUSSI'}</h2>
                <p className="text-zinc-500 mt-2 text-xs font-bold uppercase tracking-widest">{status === 'lost' ? 'Système verrouillé' : `Gain: ${(bet * multiplier).toFixed(0)} HTG`}</p>
                <button onClick={() => setStatus('idle')} className="mt-10 w-full max-w-xs py-5 bg-white text-black rounded-2xl font-black active:scale-95">REJOUER</button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

