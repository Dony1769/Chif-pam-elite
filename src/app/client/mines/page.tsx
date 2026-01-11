"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, ChevronLeft, Coins, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const LEVELS = {
  facile: { grid: 25, mines: 3 },
  intermédiaire: { grid: 25, mines: 5 },
  difficile: { grid: 25, mines: 10 }
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

  const playSound = (freq: number, type: OscillatorType = 'sine') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const startGame = async () => {
    if (bet < 10 || loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // Appel RPC pour déduire de la table profiles
      const { data: success } = await supabase.rpc('process_game_bet', { 
        amount_to_deduct: bet,
        game_name: 'MINES'
      });

      if (!success) {
        alert("Solde insuffisant dans votre profil !");
        setLoading(false);
        return;
      }

      const positions = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5).slice(0, LEVELS[level].mines);

      const { data, error } = await supabase.from('mines_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        mines_count: LEVELS[level].mines,
        mine_positions: positions,
        is_active: true
      }]).select().single();

      if (error) throw error;
      setGameData(data);
      setGameState('playing');
      setRevealed([]);
      setCurrentMult(1.0);
      playSound(440);
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally { setLoading(false); }
  };

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing' || revealed.includes(index)) return;

    if (gameData.mine_positions.includes(index)) {
      setGameState('ended');
      playSound(100, 'sawtooth');
    } else {
      const newRevealed = [...revealed, index];
      setRevealed(newRevealed);
      const prob = (25 - LEVELS[level].mines - revealed.length) / (25 - revealed.length);
      setCurrentMult(prev => parseFloat((prev * (0.98 / prob)).toFixed(2)));
      playSound(800 + (revealed.length * 50));
    }
  };

  const cashOut = async () => {
    if (gameState !== 'playing' || revealed.length === 0) return;
    setLoading(true);
    try {
      const winAmount = Math.floor(bet * currentMult);
      await supabase.rpc('process_game_win', { 
        amount_to_add: winAmount,
        game_id: gameData.id,
        final_mult: currentMult
      });
      playSound(1200);
      setGameState('ended');
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black italic uppercase">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-xl text-emerald-500 italic">Mines Elite</h1>
          <span className="text-[8px] text-slate-500 tracking-[0.3em] block">Certifié Fair-Play</span>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
          <div className="flex gap-2">
            {(['facile', 'intermédiaire', 'difficile'] as const).map((l) => (
              <button key={l} onClick={() => gameState === 'idle' && setLevel(l)} className={`flex-1 py-2 rounded-xl text-[9px] border transition-all ${level === l ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-white/5 text-slate-500 border-white/5'}`}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-white/5">
            <Coins className="text-emerald-500" size={20} />
            <input type="number" value={bet} onChange={(e) => setBet(Number(e.target.value))} disabled={gameState === 'playing'} className="bg-transparent flex-1 outline-none text-lg text-emerald-500" />
          </div>
          <button onClick={gameState === 'idle' ? startGame : cashOut} disabled={loading || (gameState === 'playing' && revealed.length === 0)} className={`w-full py-5 rounded-[2rem] shadow-lg transition-all active:scale-95 ${gameState === 'idle' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : gameState === 'idle' ? "Lancer la partie" : `Récolter ${(bet * currentMult).toFixed(0)} HTG`}
          </button>
          {gameState === 'ended' && <button onClick={() => setGameState('idle')} className="w-full text-center text-[10px] text-slate-500 uppercase tracking-widest">Nouvelle Partie</button>}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }).map((_, i) => (
            <button key={i} onClick={() => handleTileClick(i)} className={`aspect-square rounded-xl flex items-center justify-center border transition-all duration-300 ${revealed.includes(i) ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : gameState === 'ended' && gameData?.mine_positions.includes(i) ? 'bg-rose-500/40 border-rose-500 animate-pulse' : 'bg-slate-900 border-white/5 active:bg-slate-800'}`}>
              {revealed.includes(i) && <Gem size={22} className="text-emerald-400" />}
              {gameState === 'ended' && gameData?.mine_positions.includes(i) && <Bomb size={22} className="text-rose-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
