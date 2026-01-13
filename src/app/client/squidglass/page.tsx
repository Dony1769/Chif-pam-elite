"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, XCircle, Trophy, CheckCircle, Wallet, PlayCircle } from 'lucide-react';

const SETTINGS = {
  facile: { rows: 5, cols: 2, step: 0.3 },
  intermédiaire: { rows: 7, cols: 2, step: 0.5 },
  difficile: { rows: 9, cols: 3, step: 0.8 }
};

export default function SquidGlassElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost'>('idle');
  
  const [gameId, setGameId] = useState<string | null>(null);
  const [glassSequence, setGlassSequence] = useState<number[]>([]);
  const [playerPath, setPlayerPath] = useState<number[]>([]);
  const [brokenGlass, setBrokenGlass] = useState<{ row: number; col: number } | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isJumping, setIsJumping] = useState(false);

  const { rows, cols, step } = SETTINGS[difficulty];
  const currentWin = Math.floor(bet * multiplier);

  const startGame = async () => {
    if (bet < 10 || status === 'loading') return;
    setStatus('loading');
    setPlayerPath([]);
    setBrokenGlass(null);
    setMultiplier(1.0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: paid } = await supabase.rpc('process_bet', { amount: bet });
      if (!paid) { alert("Solde insuffisant"); setStatus('idle'); return; }

      const sequence = Array.from({ length: rows }, () => Math.floor(Math.random() * cols));
      setGlassSequence(sequence);

      const { data: game } = await supabase.from('glass_games').insert([{
        user_id: user.id, bet_amount: bet, difficulty, num_rows: rows, num_cols: cols,
        glass_sequence: sequence, is_active: true
      }]).select().single();

      setGameId(game.id);
      setStatus('playing');
    } catch (e) {
      alert("Erreur de connexion");
      setStatus('idle');
    }
  };

  const handleJump = async (colIndex: number) => {
    if (status !== 'playing' || isJumping || brokenGlass) return;

    setIsJumping(true);
    const currentRow = playerPath.length;
    const isCorrect = colIndex === glassSequence[currentRow];

    // Délai pour l'animation
    setTimeout(async () => {
      if (isCorrect) {
        setPlayerPath(prev => [...prev, colIndex]);
        const nextMultiplier = parseFloat((multiplier + step).toFixed(2));
        setMultiplier(nextMultiplier);
        setIsJumping(false);

        // Auto-cashout si fin du pont
        if (currentRow + 1 === rows) {
          cashout(nextMultiplier);
        }
      } else {
        setBrokenGlass({ row: currentRow, col: colIndex });
        setStatus('lost');
        setIsJumping(false);
        if (gameId) await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
      }
    }, 400);
  };

  // --- MISE À JOUR STRICTE SELON DEMANDE ---
  const cashout = async (finalMult: number) => {
    if (status !== 'playing' && playerPath.length === 0) return;
    setStatus('loading');
    
    try {
      // APPEL RPC : On doit passer le nom du paramètre 'override_multiplier'
      const { data, error } = await supabase.rpc('claim_glass_win', { 
        game_id: gameId, 
        override_multiplier: finalMult 
      });
  
      if (error) throw error;
  
      setStatus('ended');
    } catch (e) {
      console.error(e);
      alert("Erreur lors du retrait. Vérifiez votre connexion.");
      setStatus('playing'); // On remet en jeu si le paiement échoue
    }
  };
  // -----------------------------------------

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase flex flex-col items-center overflow-x-hidden">
      {/* HEADER AVEC LOGO CHIF PAM */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <div className="flex flex-col items-center">
            <span className="text-2xl tracking-tighter text-white">CHIF <span className="text-rose-500">PAM</span></span>
            <span className="text-[7px] tracking-[0.3em] text-slate-500 -mt-1 font-light not-italic text-center">ELITE GAMING</span>
        </div>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md flex-1 flex flex-col">
        {status === 'idle' || status === 'loading' ? (
          <div className="my-auto space-y-6 animate-in fade-in zoom-in duration-500 text-center">
            <h1 className="text-3xl text-rose-500 tracking-widest mb-2 font-black">GLASS BRIDGE</h1>
            
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
              {(['facile', 'intermédiaire', 'difficile'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === d ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-500'}`}>{d}</button>
              ))}
            </div>
            
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-4">
              <p className="text-xs text-slate-500">Mise Minimum: 10 HTG</p>
              <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-center text-4xl w-full outline-none text-rose-500 font-black"/>
              <button onClick={startGame} disabled={status === 'loading'} className="w-full py-5 bg-rose-500 text-white rounded-2xl text-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex justify-center">
                {status === 'loading' ? <Loader2 className="animate-spin"/> : "JOUER MAINTENANT"}
              </button>
            </div>
          </div>
        ) : status === 'playing' ? (
          <div className="flex-1 flex flex-col animate-in fade-in">
            {/* STATS */}
            <div className="flex justify-between mb-4 gap-2">
              <div className="flex-1 bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-[8px] text-slate-500 uppercase">Multiplicateur</p>
                <p className="text-rose-500 text-lg">x{multiplier.toFixed(2)}</p>
              </div>
              <div className="flex-1 bg-white/5 p-3 rounded-xl border border-white/10 text-right">
                <p className="text-[8px] text-slate-500 uppercase">Gain Actuel</p>
                <p className="text-emerald-500 text-lg">{currentWin} HTG</p>
              </div>
            </div>

            {/* LE PONT */}
            <div className="flex-1 bg-black/40 rounded-3xl border border-white/5 p-4 flex flex-col-reverse gap-3 relative overflow-y-auto no-scrollbar">
              {Array.from({ length: rows }).map((_, rIndex) => (
                <div key={rIndex} className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 h-20`}>
                  {Array.from({ length: cols }).map((_, cIndex) => {
                    const isStepped = playerPath[rIndex] === cIndex;
                    const isBroken = brokenGlass?.row === rIndex && brokenGlass?.col === cIndex;
                    return (
                      <motion.button
                        key={cIndex}
                        onClick={() => handleJump(cIndex)}
                        disabled={playerPath.length !== rIndex || isJumping}
                        className={`relative rounded-xl border-2 transition-all duration-500 ${
                          isStepped ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 
                          isBroken ? 'bg-transparent border-transparent' : 'bg-white/5 border-white/10'
                        }`}
                        whileTap={{ scale: 0.9 }}
                      >
                        {isBroken && <span className="absolute inset-0 flex items-center justify-center text-2xl">💥</span>}
                        {isStepped && <CheckCircle className="text-cyan-400 mx-auto" size={20}/>}
                      </motion.button>
                    );
                  })}
                </div>
              ))}

              {/* PERSONNAGE */}
              <AnimatePresence>
                <motion.div
                  className="absolute z-20 pointer-events-none"
                  initial={false}
                  animate={{
                    x: playerPath.length === 0 ? "50%" : 
                       cols === 2 ? (playerPath[playerPath.length-1] === 0 ? "25%" : "75%") :
                       `${(playerPath[playerPath.length-1] * 33) + 16}%`,
                    y: `-${(playerPath.length * 84) + 20}px`,
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                >
                  <motion.div 
                    className="w-10 h-10 bg-rose-500 rounded-lg border-2 border-white shadow-2xl flex items-center justify-center"
                    animate={isJumping ? { 
                      scale: [1, 1.5, 1],
                      y: [0, -40, 0],
                      rotate: [0, 10, 0] 
                    } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="text-[10px] text-white font-bold italic">#456</span>
                  </motion.div>
                  <motion.div 
                    className="w-8 h-2 bg-black/40 rounded-full blur-sm mx-auto mt-1"
                    animate={isJumping ? { scale: [1, 0.5, 1], opacity: [0.4, 0.1, 0.4] } : {}}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* CONTROLES */}
            <div className="mt-4 flex gap-3">
               <button 
                onClick={() => cashout(multiplier)}
                disabled={playerPath.length === 0 || isJumping}
                className="flex-1 py-5 bg-emerald-500 text-black rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Wallet size={20}/> ENCAISSER {currentWin} HTG
              </button>
            </div>
          </div>
        ) : (
          /* ECRAN FIN */
          <div className="my-auto text-center space-y-6 animate-in zoom-in">
            {status === 'lost' ? (
              <>
                <XCircle size={80} className="text-rose-500 mx-auto animate-bounce"/>
                <h2 className="text-4xl">ÉLIMINÉ</h2>
                <p className="text-slate-500 uppercase">Le verre s'est brisé au niveau {playerPath.length + 1}</p>
              </>
            ) : (
              <>
                <Trophy size={80} className="text-emerald-500 mx-auto animate-pulse"/>
                <h2 className="text-4xl text-emerald-500">SURVIVANT</h2>
                <p className="text-2xl">+{currentWin} HTG</p>
              </>
            )}
            
            <div className="flex flex-col gap-3">
                <button onClick={startGame} className="w-full py-5 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <PlayCircle size={20}/> RECOMMENCER
                </button>
                <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-slate-400">
                    RETOUR AU MENU
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
