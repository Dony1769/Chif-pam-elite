"use client";
import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Wallet, ShieldAlert, Footprints, Trophy } from 'lucide-react';

// Configuration du jeu
const DIFFICULTIES = {
  facile: { label: 'FACILE', rows: 6, cols: 2, multiplier_inc: 0.30 }, // x1.30, x1.60...
  moyen: { label: 'MOYEN', rows: 9, cols: 2, multiplier_inc: 0.50 },
  difficile: { label: 'EXTRÊME', rows: 12, cols: 3, multiplier_inc: 0.90 }
};

export default function SquidGlassUltimate() {
  const router = useRouter();
  
  // États du jeu
  const [balance, setBalance] = useState<number | null>(null); // Pour affichage seulement
  const [bet, setBet] = useState(50);
  const [level, setLevel] = useState<'facile' | 'moyen' | 'difficile'>('moyen');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost' | 'cashing'>('idle');
  
  // États logiques
  const [gameId, setGameId] = useState<string | null>(null);
  const [sequence, setSequence] = useState<number[]>([]); // La liste des bons verres
  const [currentStep, setCurrentStep] = useState(0); // À quelle rangée on est
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([]); // Où le joueur a sauté
  
  // États d'animation
  const [isJumping, setIsJumping] = useState(false);
  const [shatteredGlass, setShatteredGlass] = useState<{r: number, c: number} | null>(null);

  const config = DIFFICULTIES[level];
  const currentGain = Math.floor(bet * multiplier);

  // --- LOGIQUE JEU ---

  const startGame = async () => {
    if (bet < 10) return alert("Mise minimum 10 HTG");
    setGameState('playing');
    setShatteredGlass(null);
    setHistory([]);
    setCurrentStep(0);
    setMultiplier(1.0);
    setSequence([]);

    try {
      // 1. Générer la séquence secrète côté client (pour l'instant, idéalement serveur)
      const newSequence = Array.from({ length: config.rows }, () => Math.floor(Math.random() * config.cols));
      setSequence(newSequence);

      // 2. Appel RPC pour créer le jeu et débiter
      const { data: newGameId, error } = await supabase.rpc('start_glass_game', {
        bet_amount: bet,
        rows: config.rows,
        cols: config.cols,
        difficulty: level,
        path_sequence: newSequence
      });

      if (error) throw error;
      setGameId(newGameId);

    } catch (e) {
      console.error(e);
      alert("Erreur démarrage. Vérifiez votre solde.");
      setGameState('idle');
    }
  };

  const handleJump = (colIndex: number) => {
    if (isJumping || gameState !== 'playing') return;
    setIsJumping(true);

    const isCorrect = sequence[currentStep] === colIndex;
    
    // Animation délai
    setTimeout(async () => {
      if (isCorrect) {
        // SUCCÈS
        setHistory(prev => [...prev, colIndex]);
        const nextMult = parseFloat((multiplier + config.multiplier_inc).toFixed(2));
        setMultiplier(nextMult);
        setCurrentStep(prev => prev + 1);
        setIsJumping(false);

        // Si fin du pont atteinte
        if (currentStep + 1 === config.rows) {
          handleCashout(nextMult);
        }
      } else {
        // ÉCHEC
        setShatteredGlass({ r: currentStep, c: colIndex });
        setGameState('lost');
        setIsJumping(false);
        // Mettre fin au jeu en base (optionnel, le serveur le sait déjà par inactivité, mais propre)
        if (gameId) await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
      }
    }, 600); // Temps du saut
  };

  const handleCashout = async (finalMult: number) => {
    setGameState('cashing');
    try {
      const { error } = await supabase.rpc('claim_glass_win', {
        game_id: gameId,
        final_multiplier: finalMult
      });
      if (error) throw error;
      setGameState('won');
    } catch (e) {
      alert("Erreur encaissement");
      setGameState('playing');
    }
  };

  // --- RENDU VISUEL ---

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-hidden flex flex-col relative">
      
      {/* HEADER */}
      <div className="z-10 p-4 flex justify-between items-center bg-[#121218] border-b border-white/5">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
            <ChevronLeft size={24} />
        </button>
        <div className="text-center">
            <h1 className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
                CHIF PAM
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Glass Survival</p>
        </div>
        <div className="w-10" />
      </div>

      {/* ZONE DE JEU (Scrollable inversée) */}
      <div className="flex-1 relative overflow-y-auto no-scrollbar bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#050508] to-black">
        <div className="min-h-full flex flex-col-reverse justify-start items-center pb-32 pt-10 gap-4">
            
            {/* GÉNÉRATION DU PONT */}
            {gameState !== 'idle' && Array.from({ length: config.rows }).map((_, rIndex) => (
                <div key={rIndex} className="relative w-full max-w-sm px-6">
                    {/* Numéro de palier sur le côté */}
                    <div className={`absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold ${rIndex === currentStep ? 'text-rose-500' : 'text-gray-700'}`}>
                        {(rIndex + 1).toString().padStart(2, '0')}
                    </div>

                    <div className={`grid gap-4 ${config.cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {Array.from({ length: config.cols }).map((_, cIndex) => {
                            // États de la tuile
                            const isPastStep = rIndex < currentStep;
                            const isCurrentStep = rIndex === currentStep;
                            const wasChosen = history[rIndex] === cIndex;
                            const isBroken = shatteredGlass?.r === rIndex && shatteredGlass?.c === cIndex;
                            const isSafe = isPastStep && wasChosen;

                            return (
                                <motion.button
                                    key={cIndex}
                                    disabled={!isCurrentStep || isJumping || gameState !== 'playing'}
                                    onClick={() => handleJump(cIndex)}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ 
                                        opacity: isBroken ? 0 : 1, 
                                        scale: isBroken ? 1.2 : 1,
                                        borderColor: isSafe ? '#10b981' : 'rgba(255,255,255,0.1)'
                                    }}
                                    transition={{ duration: 0.3, delay: rIndex * 0.05 }}
                                    className={`
                                        h-20 rounded-xl border-2 relative overflow-hidden transition-all
                                        ${isBroken ? 'bg-red-500/20' : 'bg-white/5 backdrop-blur-sm'}
                                        ${isSafe ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-white/10'}
                                        ${isCurrentStep && !isJumping ? 'animate-pulse border-white/30 cursor-pointer hover:bg-white/10' : ''}
                                    `}
                                >
                                    {/* EFFET DE BRISE DE VERRE */}
                                    {isBroken && (
                                        <motion.div 
                                            initial={{ scale: 0 }} 
                                            animate={{ scale: 1.5, opacity: 0 }} 
                                            className="absolute inset-0 bg-rose-500 flex items-center justify-center"
                                        >
                                            <span className="text-4xl">💥</span>
                                        </motion.div>
                                    )}

                                    {/* MARQUEUR DE PASSAGE */}
                                    {isSafe && (
                                        <motion.div 
                                            initial={{ scale: 0 }} 
                                            animate={{ scale: 1 }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <Footprints className="text-emerald-500 rotate-90" size={32} />
                                        </motion.div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            {/* AVATAR JOUEUR (Flottant) */}
            {gameState === 'playing' && (
                <motion.div
                    className="fixed bottom-32 pointer-events-none z-50 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                    animate={{
                        y: isJumping ? -100 : 0,
                        scale: isJumping ? 1.2 : 1
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                   {/* On peut mettre une icone ou laisser vide, l'effet visuel est sur les cases */}
                </motion.div>
            )}
        </div>
      </div>

      {/* INTERFACE DE CONTRÔLE (BAS) */}
      <div className="z-20 bg-[#121218] border-t border-white/5 p-5 pb-8 rounded-t-3xl shadow-2xl">
        <AnimatePresence mode="wait">
            {gameState === 'idle' ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-4"
                >
                    {/* SÉLECTEUR DIFFICULTÉ */}
                    <div className="flex bg-black/40 p-1 rounded-xl">
                        {(Object.keys(DIFFICULTIES) as Array<keyof typeof DIFFICULTIES>).map((d) => (
                            <button
                                key={d}
                                onClick={() => setLevel(d)}
                                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${level === d ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                {DIFFICULTIES[d].label}
                            </button>
                        ))}
                    </div>

                    {/* INPUT MISE */}
                    <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                        <Wallet className="text-gray-500" />
                        <div className="flex-1">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Votre Mise</p>
                            <input 
                                type="number" 
                                value={bet} 
                                onChange={(e) => setBet(Number(e.target.value))}
                                className="bg-transparent text-2xl font-black text-white w-full outline-none"
                            />
                        </div>
                        <span className="text-rose-500 font-bold">HTG</span>
                    </div>

                    <button 
                        onClick={startGame}
                        className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-500 rounded-xl font-black text-lg tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(225,29,72,0.4)]"
                    >
                        JOUER
                    </button>
                </motion.div>
            ) : gameState === 'playing' ? (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex gap-4"
                >
                    <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
                        <p className="text-[10px] text-gray-500 font-bold">GAIN POTENTIEL</p>
                        <p className="text-2xl font-black text-emerald-400">{currentGain} HTG</p>
                    </div>
                    
                    <button 
                        onClick={() => handleCashout(multiplier)}
                        disabled={currentStep === 0 || isJumping}
                        className="flex-[2] bg-emerald-500 text-black font-black text-xl rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        ENCAISSER <Wallet size={20} className="fill-black" />
                    </button>
                </motion.div>
            ) : (
                /* ÉCRAN DE FIN (GAGNÉ / PERDU) */
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-4"
                >
                    {gameState === 'won' ? (
                        <>
                            <Trophy className="mx-auto text-yellow-400 mb-2" size={60} />
                            <h2 className="text-3xl font-black text-white">VICTOIRE !</h2>
                            <p className="text-emerald-400 text-xl font-bold">Vous avez gagné {currentGain} HTG</p>
                        </>
                    ) : (
                        <>
                            <ShieldAlert className="mx-auto text-rose-600 mb-2" size={60} />
                            <h2 className="text-3xl font-black text-white">ÉLIMINÉ</h2>
                            <p className="text-gray-400">Le verre s'est brisé.</p>
                        </>
                    )}
                    
                    <button 
                        onClick={() => setGameState('idle')}
                        className="w-full py-4 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-all mt-4"
                    >
                        Rejouer
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

    </div>
  );
}
