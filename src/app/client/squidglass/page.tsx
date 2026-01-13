"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Wallet, Info, CheckCircle2, XCircle, Play } from 'lucide-react';

const CONFIG = {
  facile: { rows: 5, cols: 2, step: 0.3 },
  intermediaire: { rows: 7, cols: 2, step: 0.5 },
  difficile: { rows: 9, cols: 3, step: 0.8 }
};

export default function GlassElite() {
  const [step, setStep] = useState(0); // 0: Menu, 1: Tuto, 2: Jeu
  const [difficulty, setDifficulty] = useState<keyof typeof CONFIG>('intermediaire');
  const [bet, setBet] = useState(10);
  const [gameId, setGameId] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost' | 'loading'>('idle');
  const [showTuto, setShowTuto] = useState(false);
  const [tutoIndex, setTutoIndex] = useState(0);

  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(bet * currentMult);

  // Initialisation : Vérifier si le client veut voir le tuto
  useEffect(() => {
    const skip = localStorage.getItem('skip_glass_tuto');
    if (!skip) setShowTuto(true);
  }, []);

  const startGame = async () => {
    setStatus('loading');
    const sequence = Array.from({ length: CONFIG[difficulty].rows }, () => Math.floor(Math.random() * CONFIG[difficulty].cols));
    
    try {
      const { data, error } = await supabase.rpc('start_glass_game', {
        p_bet: bet, p_rows: CONFIG[difficulty].rows, p_cols: CONFIG[difficulty].cols,
        p_diff: difficulty, p_path: sequence
      });
      if (error) throw error;
      setGameId(data);
      setPath(sequence);
      setHistory([]);
      setStatus('playing');
    } catch (e: any) {
      alert(e.message);
      setStatus('idle');
    }
  };

  const jump = async (col: number) => {
    if (status !== 'playing') return;
    const isCorrect = col === path[history.length];
    
    if (isCorrect) {
      const newHistory = [...history, col];
      setHistory(newHistory);
      if (newHistory.length === CONFIG[difficulty].rows) {
        cashout(1 + (newHistory.length * CONFIG[difficulty].step));
      }
    } else {
      setStatus('lost');
      await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
    }
  };

  const cashout = async (mult: number) => {
    setStatus('loading');
    try {
      const { error } = await supabase.rpc('claim_glass_win', { p_game_id: gameId, p_multiplier: mult });
      if (error) throw error;
      setStatus('won');
    } catch (e) {
      alert("Erreur encaissement");
      setStatus('playing');
    }
  };

  const tutoSteps = [
    { text: "Choisissez votre mise et votre difficulté pour commencer.", icon: <Wallet className="text-rose-500" /> },
    { text: "Traversez le pont en choisissant le bon verre à chaque rangée.", icon: <Play className="text-rose-500" /> },
    { text: "Si le verre se brise, vous perdez tout. Encaissez quand vous voulez !", icon: <Info className="text-rose-500" /> }
  ];

  return (
    <div className="fixed inset-0 bg-[#050508] text-white flex flex-col font-bold overflow-hidden select-none">
      
      {/* HEADER RESPONSIVE */}
      <div className="h-[10%] border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
        <ChevronLeft onClick={() => window.history.back()} className="cursor-pointer" />
        <div className="text-center">
          <h1 className="text-xl tracking-tighter uppercase italic font-black">CHIF <span className="text-rose-500">PAM</span></h1>
          <p className="text-[8px] tracking-[0.3em] text-white/40 -mt-1">ELITE GAMING</p>
        </div>
        <div className="text-emerald-500 text-xs flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live
        </div>
      </div>

      {/* ZONE DE JEU (S'adapte à la hauteur restante) */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        
        {status === 'idle' || status === 'loading' ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-xs space-y-4">
            <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              {(['facile', 'intermediaire', 'difficile'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className={`py-2 text-[10px] rounded-lg transition-all ${difficulty === d ? 'bg-rose-500 shadow-lg' : 'text-white/40'}`}>
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Mise en HTG</p>
              <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl w-full text-center outline-none font-black text-rose-500" />
              <button onClick={startGame} disabled={status === 'loading'} className="w-full py-4 bg-rose-500 rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 transition-transform">
                {status === 'loading' ? "CHARGEMENT..." : "JOUER MAINTENANT"}
              </button>
            </div>
          </motion.div>
        ) : (
          /* LE PONT (Inversé pour voir l'avancée vers le haut) */
          <div className="h-full w-full flex flex-col-reverse justify-start gap-2 overflow-y-auto no-scrollbar py-10">
            {Array.from({ length: CONFIG[difficulty].rows }).map((_, rIndex) => (
              <div key={rIndex} className="flex justify-center gap-3">
                {Array.from({ length: CONFIG[difficulty].cols }).map((_, cIndex) => {
                  const isCurrent = history.length === rIndex;
                  const isPassed = history.length > rIndex && history[rIndex] === cIndex;
                  return (
                    <motion.div
                      key={cIndex}
                      onClick={() => isCurrent && jump(cIndex)}
                      whileTap={{ scale: 0.9 }}
                      className={`h-14 w-20 rounded-xl border-2 transition-all flex items-center justify-center ${
                        isPassed ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 
                        isCurrent ? 'bg-white/5 border-white/20 animate-pulse' : 'bg-white/5 border-white/5 opacity-40'
                      }`}
                    >
                      {isPassed && <CheckCircle2 className="text-emerald-500" size={18} />}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* CONTROLES EN JEU */}
        {status === 'playing' && (
          <div className="absolute bottom-6 left-6 right-6 flex gap-3">
            <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-3">
              <p className="text-[8px] text-white/40 uppercase">Gain Actuel</p>
              <p className="text-xl text-emerald-500 font-black">{currentWin} HTG</p>
            </div>
            <button onClick={() => cashout(currentMult)} disabled={history.length === 0} className="flex-[2] bg-emerald-500 text-black font-black rounded-2xl disabled:opacity-50">
              ENCAISSER
            </button>
          </div>
        )}
      </div>

      {/* TUTORIEL MODAL */}
      <AnimatePresence>
        {showTuto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-[#121218] w-full max-w-xs p-8 rounded-[2.5rem] border border-white/10 text-center space-y-6">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 text-2xl">
                {tutoSteps[tutoIndex].icon}
              </div>
              <p className="text-sm font-medium leading-relaxed">{tutoSteps[tutoIndex].text}</p>
              <div className="flex justify-center gap-1">
                {tutoSteps.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all ${i === tutoIndex ? 'w-4 bg-rose-500' : 'w-1 bg-white/20'}`} />)}
              </div>
              <button 
                onClick={() => {
                  if (tutoIndex < tutoSteps.length - 1) setTutoIndex(tutoIndex + 1);
                  else { setShowTuto(false); localStorage.setItem('skip_glass_tuto', 'true'); }
                }}
                className="w-full py-4 bg-white text-black rounded-2xl font-black"
              >
                {tutoIndex < tutoSteps.length - 1 ? "SUIVANT" : "C'EST PARTI !"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ECRAN DE FIN */}
      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121218] p-10 rounded-[3rem] border border-white/10 text-center space-y-6 w-full max-w-xs shadow-2xl">
              {status === 'won' ? (
                <>
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black italic">SURVIVANT</h2>
                  <p className="text-emerald-500 text-2xl font-black">+{currentWin} HTG</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                    <XCircle size={40} className="text-rose-500" />
                  </div>
                  <h2 className="text-3xl font-black italic text-rose-500">ÉLIMINÉ</h2>
                  <p className="text-white/40 uppercase text-xs">Le verre s'est brisé</p>
                </>
              )}
              <button onClick={() => setStatus('idle')} className="w-full py-4 bg-white text-black rounded-2xl font-black">CONTINUER</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

