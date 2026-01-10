"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Gem, Bomb, Wallet, Play, 
  RotateCcw, Trophy, AlertTriangle, Info,
  Volume2, VolumeX, ShieldCheck
} from 'lucide-react';

// Configuration des niveaux
const LEVELS = {
  facile: { grid: 36, mines: 3, empties: 10, startMult: 1.15, label: 'Facile' },
  intermediaire: { grid: 25, mines: 5, empties: 5, startMult: 1.45, label: 'Amateur' },
  difficile: { grid: 16, mines: 5, empties: 2, startMult: 2.10, label: 'Élite' },
};

export default function MinesGame() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(10);
  const [level, setLevel] = useState<keyof typeof LEVELS>('intermediaire');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [grid, setGrid] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Sons (Utilisation de sons synthétiques pour éviter les fichiers lourds)
  const playSound = (type: 'click' | 'gem' | 'empty' | 'bomb' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'gem') { osc.frequency.setValueAtTime(880, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); }
    if (type === 'bomb') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); }
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => { fetchBalance(); }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      setBalance(data?.balance || 0);
    }
  };

  const startGame = async () => {
    if (bet > balance || bet <= 0) return alert("Solde insuffisant");
    setLoading(true);
    
    // Initialisation de la grille locale (les mines sont placées aléatoirement)
    const currentLevel = LEVELS[level];
    let newGrid = Array(currentLevel.grid).fill('gem');
    
    // Placer les mines
    let minesPlaced = 0;
    while (minesPlaced < currentLevel.mines) {
      let idx = Math.floor(Math.random() * currentLevel.grid);
      if (newGrid[idx] !== 'mine') { newGrid[idx] = 'mine'; minesPlaced++; }
    }
    
    // Placer les cases vides
    let emptiesPlaced = 0;
    while (emptiesPlaced < currentLevel.empties) {
      let idx = Math.floor(Math.random() * currentLevel.grid);
      if (newGrid[idx] === 'gem') { newGrid[idx] = 'empty'; emptiesPlaced++; }
    }

    // Débit du solde (Simulation via UI, le trigger SQL fera le reste en DB)
    setBalance(prev => prev - bet);
    setGrid(newGrid);
    setRevealed([]);
    setMultiplier(currentLevel.startMult);
    setGameState('playing');
    setLoading(false);
    playSound('click');
  };

  const handleTileClick = (idx: number) => {
    if (gameState !== 'playing' || revealed.includes(idx)) return;

    const content = grid[idx];
    setRevealed(prev => [...prev, idx]);

    if (content === 'mine') {
      setGameState('lost');
      playSound('bomb');
    } else if (content === 'empty') {
      playSound('click');
      // Les cases vides ne montent pas le multiplicateur mais maintiennent le jeu
    } else {
      setMultiplier(prev => prev + (level === 'difficile' ? 0.5 : 0.15));
      playSound('gem');
    }
  };

  const cashOut = async () => {
    if (gameState !== 'playing' || revealed.length === 0) return;
    setLoading(true);
    const gain = Math.floor(bet * multiplier);
    
    // Logique Supabase pour mettre à jour le gain réel
    // (A faire ici : Appel à ta table mines_games avec status 'won')
    
    setGameState('won');
    setBalance(prev => prev + gain);
    playSound('win');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans italic uppercase">
      {/* HEADER PRO */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={24} className="text-emerald-500" />
        </button>
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
          <Wallet size={16} className="text-emerald-500" />
          <span className="text-sm font-black tracking-tighter">{balance.toLocaleString()} HTG</span>
        </div>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 bg-white/5 rounded-2xl">
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* SÉLECTEUR DE NIVEAU */}
      {gameState === 'idle' && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(Object.keys(LEVELS) as Array<keyof typeof LEVELS>).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`py-3 rounded-xl text-[10px] border transition-all ${level === l ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
              {LEVELS[l].label}
            </button>
          ))}
        </div>
      )}

      {/* ZONE DE JEU */}
      <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-6 backdrop-blur-xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1">
            <h2 className="text-xs text-slate-500 tracking-widest">Multiplicateur</h2>
            <p className="text-4xl font-black text-emerald-500">{multiplier.toFixed(2)}x</p>
          </div>
          {gameState === 'playing' && (
            <button onClick={cashOut} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-black animate-pulse shadow-lg shadow-emerald-500/20">
              CASH OUT
            </button>
          )}
        </div>

        {/* GRILLE DYNAMIQUE */}
        <div className={`grid gap-2 mx-auto`} style={{ 
          gridTemplateColumns: `repeat(${Math.sqrt(LEVELS[level].grid)}, minmax(0, 1fr))` 
        }}>
          {Array(LEVELS[level].grid).fill(null).map((_, i) => (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              disabled={gameState !== 'playing' || revealed.includes(i)}
              className={`aspect-square rounded-xl border-2 transition-all duration-300 flex items-center justify-center
                ${revealed.includes(i) 
                  ? grid[i] === 'mine' ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/20' 
                  : grid[i] === 'empty' ? 'bg-slate-800 border-white/10 opacity-40'
                  : 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 border-white/5 hover:border-emerald-500/30'}`}
            >
              {revealed.includes(i) && (
                <>
                  {grid[i] === 'mine' && <Bomb size={20} className="text-white animate-bounce" />}
                  {grid[i] === 'gem' && <Gem size={20} className="text-white" />}
                  {grid[i] === 'empty' && <div className="w-2 h-2 rounded-full bg-slate-600" />}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTRÔLES BAS */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-3xl border border-white/5">
          <div className="flex-1">
            <p className="text-[8px] text-slate-500 mb-1 px-2">Montant de la mise</p>
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={gameState === 'playing'}
              className="bg-transparent text-xl font-black w-full px-2 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setBet(b => b/2)} className="px-3 py-2 bg-white/5 rounded-xl text-[10px]">/2</button>
            <button onClick={() => setBet(b => b*2)} className="px-3 py-2 bg-white/5 rounded-xl text-[10px]">x2</button>
          </div>
        </div>

        <button 
          onClick={gameState === 'idle' ? startGame : () => setGameState('idle')}
          disabled={loading}
          className={`w-full py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95
            ${gameState === 'playing' ? 'bg-slate-800 text-slate-500 border border-white/5' : 'bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/20'}`}
        >
          {gameState === 'playing' ? <RotateCcw size={24} /> : <Play size={24} />}
          {gameState === 'playing' ? 'Abandonner' : 'Lancer la Mine'}
        </button>
      </div>

      {/* MODAL FIN DE PARTIE */}
      {gameState === 'lost' && (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in">
          <div className="bg-slate-900 border border-rose-500/30 p-10 rounded-[3rem] text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-3xl font-black italic">Mine Explosée !</h3>
            <p className="text-slate-500 text-sm italic">Patience est mère de sûreté. <br/>Réessaie avec sagesse.</p>
            <button onClick={() => setGameState('idle')} className="w-full py-4 bg-white/5 rounded-2xl font-black">Réessayer</button>
          </div>
        </div>
      )}
    </div>
  );
}

