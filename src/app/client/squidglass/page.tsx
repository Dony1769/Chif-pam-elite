"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, XCircle, Trophy, Square, CheckCircle } from 'lucide-react';

// --- CONFIGURATION DU JEU ---
const SETTINGS = {
  facile: { rows: 4, cols: 2, winMultiplier: 2 },         // 4 lignes, 2 colonnes
  intermédiaire: { rows: 6, cols: 2, winMultiplier: 3 },  // 6 lignes, 2 colonnes
  difficile: { rows: 8, cols: 3, winMultiplier: 5 }       // 8 lignes, 3 colonnes
};

const GLASS_SOUND = new Audio('/sounds/glass_break.mp3'); // Assure-toi d'avoir un son de verre qui se brise
const WALK_SOUND = new Audio('/sounds/walk.mp3');         // Et un son de pas

export default function SquidGlass() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost'>('idle');
  const [gameId, setGameId] = useState<string | null>(null);
  const [glassSequence, setGlassSequence] = useState<number[]>([]); // Séquence des verres solides (index de la colonne)
  const [playerPath, setPlayerPath] = useState<number[]>([]);       // Chemin du joueur (colonne choisie à chaque rangée)
  const [brokenGlass, setBrokenGlass] = useState<{ row: number; col: number } | null>(null); // Verre qui se brise
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0); // Multiplicateur affiché
  const [showCorrection, setShowCorrection] = useState(false); // Afficher la bonne voie après l'erreur

  const { rows, cols, winMultiplier } = SETTINGS[difficulty];

  useEffect(() => {
    // Le multiplicateur augmente à chaque pas réussi
    const baseStep = { facile: 0.25, intermédiaire: 0.35, difficile: 0.5 }; // Augmentation par pas
    setCurrentMultiplier(1 + (playerPath.length * baseStep[difficulty]));
  }, [playerPath.length, difficulty]);


  const generateGlassSequence = () => {
    // Génère une séquence aléatoire de colonnes pour les verres solides
    const sequence: number[] = [];
    for (let i = 0; i < rows; i++) {
      sequence.push(Math.floor(Math.random() * cols)); // 0, 1 ou 2 pour 3 colonnes
    }
    return sequence;
  };

  const startGame = async () => {
    if (bet < 10 || status === 'loading') return;
    setStatus('loading');
    setPlayerPath([]);
    setBrokenGlass(null);
    setShowCorrection(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // 1. Débit de la mise
      const { data: paid } = await supabase.rpc('process_bet', { amount: bet });
      if (!paid) { alert("Solde insuffisant"); setStatus('idle'); return; }

      // 2. Génération de la séquence de verres
      const newSequence = generateGlassSequence();
      setGlassSequence(newSequence);

      // 3. Création du jeu en DB
      const { data: game, error } = await supabase.from('glass_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        difficulty,
        num_rows: rows,
        num_cols: cols,
        glass_sequence: newSequence, // Stocke la séquence secrète pour validation
        is_active: true
      }]).select().single();

      if (error) throw error;

      setGameId(game.id);
      setStatus('playing');

    } catch (e) {
      alert("Erreur au démarrage du jeu.");
      setStatus('idle');
    }
  };

  const handleGlassClick = async (colIndex: number) => {
    if (status !== 'playing' || brokenGlass !== null) return; // Ne rien faire si perdu ou en animation

    const currentRow = playerPath.length;

    if (colIndex === glassSequence[currentRow]) {
      // BON VERRE
      WALK_SOUND.play();
      setPlayerPath(prev => [...prev, colIndex]);

      if (currentRow + 1 === rows) {
        // VICTOIRE !
        setStatus('ended');
        await supabase.rpc('claim_glass_win', { game_id: gameId }); // Appelle la fonction de gain
      }
    } else {
      // MAUVAIS VERRE
      GLASS_SOUND.play();
      setBrokenGlass({ row: currentRow, col: colIndex });
      setShowCorrection(true); // Active l'affichage de la bonne voie
      setStatus('lost'); // Passe en perdu immédiatement

      // Met à jour la DB pour marquer le jeu comme perdu
      if (gameId) {
        await supabase.from('glass_games').update({ is_active: false, is_won: false }).eq('id', gameId);
      }
    }
  };

  const getGlassStyle = (rowIndex: number, colIndex: number) => {
    let base = "bg-white/5 border-white/10"; // Style par défaut
    
    // Si le verre est cassé
    if (brokenGlass && brokenGlass.row === rowIndex && brokenGlass.col === colIndex) {
      return "bg-rose-700 border-rose-500 animate-pulse";
    }
    // Si c'est la voie du joueur
    if (playerPath[rowIndex] === colIndex) {
      return "bg-emerald-600 border-emerald-400";
    }
    // Si on est en mode correction et c'est la bonne voie future
    if (showCorrection && rowIndex > playerPath.length && glassSequence[rowIndex] === colIndex) {
        return "bg-emerald-500/30 border-emerald-500/20"; // Chemin transparent
    }
    return base;
  };


  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <h1 className="text-2xl text-emerald-500 tracking-tighter">SQUID GLASS</h1>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status === 'idle' || status === 'loading' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Difficulté */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              {(['facile', 'intermédiaire', 'difficile'] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === d ? 'bg-white text-black font-black' : 'text-slate-500 font-medium'}`}>
                  {d} ({SETTINGS[d].rows} lignes, {SETTINGS[d].cols} colonnes)
                </button>
              ))}
            </div>

            <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/10 flex justify-between items-center">
                <span className="text-emerald-500 text-xs">MISE HTG</span>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-right outline-none w-24 text-2xl font-black"/>
              </div>
              <button onClick={startGame} disabled={status === 'loading'} className="w-full py-6 bg-emerald-500 text-black rounded-3xl text-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex justify-center">
                {status === 'loading' ? <Loader2 className="animate-spin"/> : "COMMENCER"}
              </button>
            </div>
          </div>
        ) : status === 'playing' || showCorrection ? (
          <div className="animate-in zoom-in duration-300">
            {/* HUD */}
            <div className="flex justify-between bg-white/5 p-4 rounded-2xl border border-white/10 mb-6">
              <div>
                <span className="text-[8px] text-slate-500">MULTI.</span>
                <p className="text-emerald-500 text-2xl mt-1">{currentMultiplier.toFixed(2)}X</p>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-slate-500">POTENTIEL</span>
                <p className="text-amber-500 text-2xl mt-1">{(bet * currentMultiplier).toFixed(0)} HTG</p>
              </div>
            </div>

            {/* Grid de Verre */}
            <div className="relative flex flex-col items-center justify-center gap-2" style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-2" style={{ transform: `translateZ(-${rowIndex * 20}px) rotateX(15deg)` }}>
                  {Array.from({ length: cols }).map((_, colIndex) => (
                    <motion.button
                      key={colIndex}
                      className={`relative w-20 h-20 rounded-xl flex items-center justify-center text-xs border-2 transition-all duration-300 transform-gpu ${getGlassStyle(rowIndex, colIndex)}`}
                      onClick={() => handleGlassClick(colIndex)}
                      disabled={playerPath.length !== rowIndex || status !== 'playing' || brokenGlass !== null}
                      initial={{ y: 0, opacity: 1, scale: 1 }}
                      animate={brokenGlass && brokenGlass.row === rowIndex && brokenGlass.col === colIndex ? { y: 200, opacity: 0, rotateX: 90, transition: { duration: 0.5, ease: "easeIn" } } : { y: 0, opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {brokenGlass && brokenGlass.row === rowIndex && brokenGlass.col === colIndex && (
                        <span className="absolute text-white text-5xl font-black -mt-2">💥</span>
                      )}
                      {playerPath[rowIndex] === colIndex && <CheckCircle size={30} className="text-white"/>}
                    </motion.button>
                  ))}
                </div>
              ))}
              
              {/* Le Joueur */}
              <AnimatePresence>
                {playerPath.length < rows && (status === 'playing' || showCorrection) && (
                  <motion.div
                    className="absolute z-10 w-12 h-12 bg-white rounded-full border-2 border-emerald-500 flex items-center justify-center shadow-lg"
                    initial={{ 
                        y: -15, 
                        x: cols === 2 ? (playerPath[0] === 0 ? -45 : 45) : (playerPath[0] === 0 ? -90 : playerPath[0] === 1 ? 0 : 90), // Position initiale pour 2 ou 3 colonnes
                        z: 0 
                    }}
                    animate={{
                        y: playerPath.length * 88, // 88 est la hauteur d'une dalle + l'espacement
                        x: cols === 2 ? (playerPath[playerPath.length - 1] === 0 ? -45 : 45) : 
                           (playerPath[playerPath.length - 1] === 0 ? -90 : playerPath[playerPath.length - 1] === 1 ? 0 : 90),
                        transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.3 }
                    }}
                    exit={{ opacity: 0, y: 50, transition: { duration: 0.2 } }}
                    style={{
                      transformOrigin: 'center bottom',
                      bottom: 'auto',
                      left: '50%',
                      marginLeft: '-24px', // Centrer le joueur
                      transform: `translateZ(${playerPath.length * -20}px) rotateX(15deg) translateY(${playerPath.length * 88}px)`
                    }}
                  >
                    <span className="text-black text-xs font-bold">YOU</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {brokenGlass && (
              <p className="text-center text-rose-500 text-sm mt-4">Oh non ! Le verre était fragile. Regarde la bonne voie.</p>
            )}
          </div>
        ) : (
          <div className="text-center py-10 space-y-6 animate-in zoom-in">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${status === 'lost' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                {status === 'lost' ? <XCircle size={50} className="text-rose-500"/> : <Trophy size={50} className="text-emerald-500"/>}
            </div>
            <div>
                <h2 className={`text-5xl font-black tracking-tighter ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>{status === 'lost' ? "ÉLIMINÉ" : "VAINQUEUR !"}</h2>
                <p className="text-slate-500 text-xs mt-1">
                    {status === 'lost' 
                    ? `TU AS FAIT ${playerPath.length} PAS SUR ${rows}` 
                    : `TU AS GAGNÉ ${winMultiplier}X TA MISE !`}
                </p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <p className="text-slate-400 text-xs mb-1">TOTAL GAGNÉ</p>
                <p className="text-4xl font-black text-white">{status === 'lost' ? "0" : (bet * winMultiplier).toFixed(0)} <span className="text-xs text-slate-500">HTG</span></p>
            </div>
            <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg active:scale-95 transition-all">REJOUER</button>
          </div>
        )}
      </div>
    </div>
  );
}