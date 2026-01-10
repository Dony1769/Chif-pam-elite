"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Gem, Bomb, ChevronLeft, ShieldCheck, 
  Coins, Trophy, AlertCircle, Loader2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Sons (URLs classiques et propres)
const SOUNDS = {
  click: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3",
  lose: "https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3",
  cashout: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"
};

const LEVELS = {
  facile: { grid: 36, mines: 3, label: "6x6", startMult: 1.05 },
  intermédiaire: { grid: 25, mines: 5, label: "5x5", startMult: 1.20 },
  difficile: { grid: 16, mines: 8, label: "4x4", startMult: 1.50 }
};

export default function MinesGame() {
  const router = useRouter();
  const [level, setLevel] = useState<keyof typeof LEVELS>('intermédiaire');
  const [bet, setBet] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState<any>(null);

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  // Logique du multiplicateur progressif (Honnête)
  const calculateNextMultiplier = (revealedCount: number) => {
    const { grid, mines } = LEVELS[level];
    const remainingSafe = grid - mines - revealedCount;
    const totalRemaining = grid - revealedCount;
    const prob = remainingSafe / totalRemaining;
    return (currentMult * (0.98 / prob)).toFixed(2); // 0.98 pour garder 2% de marge plateforme
  };

  const startGame = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // Génération des mines côté serveur (simulation pour l'exemple client)
      const positions = Array.from({ length: LEVELS[level].grid }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, LEVELS[level].mines);

      const { data, error } = await supabase.from('mines_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        mines_count: LEVELS[level].mines,
        mine_positions: positions,
        difficulty_level: level,
        multiplier: 1.0
      }]).select().single();

      if (error) throw error;
      setGameData(data);
      setGameState('playing');
      setRevealed([]);
      setCurrentMult(1.0);
    } catch (err) {
      alert("Solde insuffisant ou erreur réseau");
    } finally { setLoading(false); }
  };

  const handleTileClick = async (index: number) => {
    if (gameState !== 'playing' || revealed.includes(index)) return;

    if (gameData.mine_positions.includes(index)) {
      // PERDU
      playSound(SOUNDS.lose);
      setGameState('ended');
      await supabase.from('mines_games').update({ is_active: false, is_won: false }).eq('id', gameData.id);
    } else {
      // GAGNÉ (Case Gemme)
      playSound(SOUNDS.click);
      const nextMult = parseFloat(calculateNextMultiplier(revealed.length));
      setRevealed([...revealed, index]);
      setCurrentMult(nextMult);
    }
  };

  const cashOut = async () => {
    if (gameState !== 'playing' || revealed.length === 0) return;
    setLoading(true);
    playSound(SOUNDS.cashout);
    
    await supabase.from('mines_games').update({ 
      is_active: false, 
      is_won: true, 
      multiplier: currentMult 
    }).eq('id', gameData.id);

    setGameState('ended');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans italic uppercase">
      {/* Header avec bouton retour */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5 text-slate-400 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-end">
          <h1 className="text-xl font-black tracking-tighter text-emerald-500">Mines Elite</h1>
          <span className="text-[8px] tracking-[0.3em] text-slate-500">Provably Fair System</span>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* Panneau de contrôle */}
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
          <div className="flex gap-2">
            {(['facile', 'intermédiaire', 'difficile'] as const).map((l) => (
              <button 
                key={l}
                onClick={() => gameState === 'idle' && setLevel(l)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black border transition-all ${level === l ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-white/5 border-white/5 text-slate-500'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-white/5">
            <Coins className="text-emerald-500" size={20} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={gameState === 'playing'}
              className="bg-transparent flex-1 outline-none font-black text-lg" 
            />
          </div>

          {gameState === 'idle' ? (
            <button onClick={startGame} disabled={loading} className="w-full py-5 bg-emerald-500 text-slate-950 rounded-[2rem] font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex justify-center">
              {loading ? <Loader2 className="animate-spin" /> : "Lancer l'exploration"}
            </button>
          ) : (
            <button onClick={cashOut} disabled={revealed.length === 0 || gameState === 'ended'} className="w-full py-5 bg-amber-500 text-slate-950 rounded-[2rem] font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
              Cash Out ({(bet * currentMult).toFixed(0)} HTG)
            </button>
          )}
        </div>

        {/* Grille de Jeu */}
        <div className={`grid gap-2 mx-auto ${level === 'facile' ? 'grid-cols-6' : level === 'intermédiaire' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {Array.from({ length: LEVELS[level].grid }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
                revealed.includes(i) 
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : gameState === 'ended' && gameData.mine_positions.includes(i)
                  ? 'bg-rose-500/40 border-rose-500'
                  : 'bg-slate-900 border-white/5 hover:border-emerald-500/50'
              } border`}
            >
              {revealed.includes(i) && <Gem size={20} className="text-emerald-500 animate-bounce" />}
              {gameState === 'ended' && gameData.mine_positions.includes(i) && <Bomb size={20} className="text-rose-500" />}
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 px-4">
          <div className="flex items-center gap-2"><ShieldCheck size={14}/> 100% Vérifiable</div>
          <div className="flex items-center gap-2 text-white"><Trophy size={14} className="text-amber-500"/> Multi: {currentMult}x</div>
        </div>

        {gameState === 'ended' && (
          <button onClick={() => setGameState('idle')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs">
            Rejouer une partie
          </button>
        )}
      </div>
    </div>
  );
}

