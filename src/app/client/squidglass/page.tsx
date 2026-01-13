"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Wallet, CheckCircle2, XCircle } from 'lucide-react';

const CONFIG = {
  facile: { rows: 5, cols: 2, step: 0.3 },
  intermediaire: { rows: 7, cols: 2, step: 0.5 },
  difficile: { rows: 9, cols: 3, step: 0.8 }
};

export default function GlassEliteFinal() {
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost' | 'loading'>('idle');
  const [difficulty, setDifficulty] = useState<keyof typeof CONFIG>('intermediaire');
  const [bet, setBet] = useState(10);
  const [gameId, setGameId] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]); // Séquence gagnante
  const [history, setHistory] = useState<number[]>([]); // Choix du joueur
  const [isJumping, setIsJumping] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(bet * currentMult);

  // --- PERSISTANCE : RÉCUPÉRER LE JEU AU CHARGEMENT ---
  useEffect(() => {
    const checkActiveGame = async () => {
      const { data, error } = await supabase.rpc('get_active_glass_game');
      if (data && data.length > 0) {
        const game = data[0];
        setGameId(game.id);
        setBet(game.bet_amount);
        setDifficulty(game.difficulty as any);
        setPath(game.path_sequence);
        setHistory(game.current_path || []);
        setStatus('playing');
      }
    };
    checkActiveGame();
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

  const handleJump = async (colIndex: number) => {
    if (isJumping || status !== 'playing') return;
    
    setIsJumping(true);
    const isCorrect = colIndex === path[history.length];

    // Attendre la fin de l'animation de saut (600ms)
    setTimeout(async () => {
      if (isCorrect) {
        const newHistory = [...history, colIndex];
        setHistory(newHistory);
        setIsJumping(false);
        // Sauvegarder en DB pour le refresh
        await supabase.rpc('update_glass_progress', { p_game_id: gameId, p_new_path: newHistory });
        
        if (newHistory.length === CONFIG[difficulty].rows) {
          cashout(1 + (newHistory.length * CONFIG[difficulty].step));
        }
      } else {
        setStatus('lost');
        setIsJumping(false);
        await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
      }
    }, 500);
  };

  const cashout = async (mult: number) => {
    setStatus('loading');
    try {
      await supabase.rpc('claim_glass_win', { p_game_id: gameId, p_multiplier: mult });
      setStatus('won');
    } catch (e) {
      alert("Erreur encaissement");
      setStatus('playing');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050508] text-white flex flex-col font-bold overflow-hidden">
      
      {/* HEADER COMPACT */}
      <div className="h-[8%] flex items-center justify-between px-6 bg-black/40 border-b border-white/5">
        <ChevronLeft onClick={() => window.history.back()} className="w-6 h-6" />
        <div className="text-center">
            <span className="text-lg tracking-tighter">CHIF <span className="text-rose-500">PAM</span></span>
            <p className="text-[7px] text-white/30 tracking-[.3em] uppercase">Elite Gaming</p>
        </div>
        <div className="w-6" />
      </div>

      {/* ZONE DE JEU (RESPONSIVE) */}
      <div className="flex-1 relative p-2 flex flex-col justify-end pb-24 items-center" ref={containerRef}>
        
        {status === 'idle' || status === 'loading' ? (
          <div className="w-full max-w-xs space-y-4 mb-20">
             <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              {['facile', 'intermediaire', 'difficile'].map(d => (
                <button key={d} onClick={() => setDifficulty(d as any)} className={`py-2 text-[9px] rounded-lg transition-all ${difficulty === d ? 'bg-rose-500 shadow-lg' : 'text-white/40'}`}>
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center space-y-4">
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl w-full text-center outline-none font-black text-rose-500" />
                <button onClick={startGame} className="w-full py-4 bg-rose-500 rounded-2xl shadow-lg active:scale-95 transition-transform">JOUER</button>
            </div>
          </div>
        ) : (
          /* LE PONT ET L'AVATAR */
          <div className="relative w-full max-w-[280px] h-full flex flex-col-reverse justify-start gap-1">
            {Array.from({ length: CONFIG[difficulty].rows }).map((_, rIndex) => (
              <div key={rIndex} className="grid grid-cols-2 gap-1 h-full max-h-[50px]">
                {[0, 1].map((cIndex) => {
                  const isPassed = history.length > rIndex && history[rIndex] === cIndex;
                  const isCurrent = history.length === rIndex;
                  return (
                    <div
                      key={cIndex}
                      onClick={() => isCurrent && handleJump(cIndex)}
                      className={`relative rounded-lg border transition-all ${
                        isPassed ? 'bg-emerald-500/10 border-emerald-500/40' : 
                        isCurrent ? 'bg-white/10 border-white/30 animate-pulse cursor-pointer' : 'bg-white/5 border-white/5'
                      }`}
                    >
                        {isPassed && <CheckCircle2 size={14} className="text-emerald-500 absolute top-1 right-1" />}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* AVATAR #456 (TRAVAILLE AVEC FRAMER MOTION) */}
            <AnimatePresence>
                {status === 'playing' && (
                    <motion.div
                        initial={false}
                        animate={{
                            // Calcul de la position X et Y basé sur l'historique
                            x: history.length === 0 ? "0%" : (history[history.length-1] === 0 ? "-55%" : "55%"),
                            y: history.length === 0 ? "60px" : `-${(history.length - 1) * 54 + 54}px`,
                            scale: isJumping ? 1.4 : 1,
                        }}
                        transition={{ type: "spring", stiffness: 120, damping: 15 }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        {/* Le petit personnage */}
                        <div className="flex flex-col items-center">
                            <div className="bg-rose-500 text-[10px] px-2 py-0.5 rounded-full mb-1 border border-white shadow-xl">#456</div>
                            <div className="w-8 h-8 bg-teal-600 rounded-lg border-2 border-white/20 shadow-2xl overflow-hidden">
                                <div className="w-full h-1/2 bg-white/10" /> {/* Design du survêtement */}
                            </div>
                            {/* Ombre portée */}
                            <motion.div 
                                animate={{ scale: isJumping ? 0.5 : 1, opacity: isJumping ? 0.2 : 0.4 }}
                                className="w-6 h-1 bg-black rounded-full mt-1 blur-[1px]" 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FOOTER CONTROLES */}
      {status === 'playing' && (
        <div className="h-[12%] bg-black/60 backdrop-blur-lg border-t border-white/5 p-4 flex gap-4">
            <div className="flex-1 bg-white/5 rounded-2xl flex flex-col justify-center px-4 border border-white/5">
                <span className="text-[9px] text-white/30 uppercase tracking-tighter">Gain Actuel</span>
                <span className="text-emerald-400 text-lg">HTG {currentWin}</span>
            </div>
            <button 
                onClick={() => cashout(currentMult)} 
                disabled={history.length === 0}
                className="flex-1 bg-emerald-500 text-black font-black rounded-2xl active:scale-95 disabled:opacity-20 transition-all"
            >
                ENCAISSER
            </button>
        </div>
      )}

      {/* ECRAN FIN */}
      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                <div className="bg-[#121218] p-8 rounded-[2.5rem] border border-white/10 text-center space-y-6 w-full max-w-xs shadow-2xl">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 ${status === 'won' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-rose-500/10 border-rose-500 text-rose-500'}`}>
                        {status === 'won' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                    </div>
                    <h2 className="text-3xl font-black italic">{status === 'won' ? 'GAGNÉ !' : 'ÉLIMINÉ'}</h2>
                    <p className="text-xl text-white/60">{status === 'won' ? `+${currentWin} HTG` : 'Mise perdue'}</p>
                    <button onClick={() => setStatus('idle')} className="w-full py-4 bg-white text-black rounded-2xl font-black">CONTINUER</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
