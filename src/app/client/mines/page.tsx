"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MinesElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [mines, setMines] = useState(3);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  // Ajuster les mines selon la difficulté choisie (Comme sur tes screens)
  useEffect(() => {
    if (difficulty === 'facile') setMines(1);
    if (difficulty === 'intermédiaire') setMines(3);
    if (difficulty === 'difficile') setMines(5);
  }, [difficulty]);

  const playSound = (freq: number, type: OscillatorType = 'sine', duration = 0.1) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const start = async () => {
    setLoading(true);
    try {
      const { data: ok, error: rpcError } = await supabase.rpc('process_bet', { amount: bet });
      
      if (rpcError || !ok) {
        alert("Solde insuffisant dans votre profil !"); // Message exact de tes screens
        setLoading(false);
        return;
      }

      const pos = Array.from({ length: 25 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, mines);
      
      const { data, error } = await supabase.from('mines_games').insert([{
        user_id: (await supabase.auth.getUser()).data.user?.id,
        bet_amount: bet,
        mines_count: mines,
        mine_positions: pos,
        difficulty_level: difficulty
      }]).select().single();

      if (error) throw error;

      setGameId(data.id);
      setMinePositions(pos);
      setRevealed([]);
      setStatus('playing');
      playSound(440);
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i)) return;
    
    if (minePositions.includes(i)) {
      setStatus('ended');
      playSound(150, 'sawtooth', 0.5);
      return;
    }
    
    const newRevealed = [...revealed, i];
    setRevealed(newRevealed);
    playSound(600 + (newRevealed.length * 40));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 font-black italic uppercase select-none">
      {/* Header */}
      <div className="flex justify-between items-center max-w-md mx-auto mb-6">
        <button onClick={() => router.push('/client/home')} className="p-2 bg-[#111] rounded-xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-lg text-emerald-500 tracking-tighter">MINES ELITE</h1>
          <p className="text-[6px] text-slate-500 tracking-[0.3em] not-italic">CERTIFIÉ FAIR-PLAY</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Sélecteur de Difficulté (Design exact screenshot) */}
        <div className="grid grid-cols-3 gap-2 bg-[#111] p-1.5 rounded-2xl border border-white/5">
          {(['facile', 'intermédiaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`py-2 rounded-xl text-[10px] transition-all ${difficulty === level ? 'bg-emerald-500 text-black' : 'hover:bg-white/5 text-slate-500'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Zone de Mise */}
        <div className="bg-[#0f0f0f] p-5 rounded-[2rem] border border-white/5 space-y-4">
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Coins className="text-emerald-500" size={18} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-xl text-emerald-500"
            />
          </div>

          <button 
            onClick={status === 'playing' ? () => {} : start}
            disabled={loading}
            className={`w-full py-5 rounded-[1.5rem] text-lg flex items-center justify-center transition-all active:scale-95 ${status === 'playing' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-emerald-500 text-black'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? "JEU EN COURS..." : "JOUER"}
          </button>
        </div>

        {/* Grille de Jeu (Responsive Mobile) */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-300 border ${
                revealed.includes(i) 
                ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-500 border-rose-300 scale-95'
                : 'bg-[#111] border-white/5 active:bg-[#1a1a1a]'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-6 h-6 animate-bounce" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-black w-6 h-6" />}
            </button>
          ))}
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); }} 
            className="w-full py-3 text-slate-500 text-[10px] tracking-widest hover:text-white"
          >
            REESSAYER
          </button>
        )}
      </div>
    </div>
  );
}
