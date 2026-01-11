"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Trophy } from 'lucide-react';
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

  useEffect(() => {
    if (difficulty === 'facile') setMines(1);
    if (difficulty === 'intermédiaire') setMines(3);
    if (difficulty === 'difficile') setMines(5);
  }, [difficulty]);

  const getMultiplier = () => {
    let m = 1.0;
    for (let i = 0; i < revealed.length; i++) {
      m = m * (0.97 / ((25 - mines - i) / (25 - i)));
    }
    return m;
  };

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
    if (bet < 10) return alert("Mise minimum 10 HTG");
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Veuillez vous connecter");

      const { data: ok } = await supabase.rpc('process_bet', { amount: bet });
      if (!ok) {
        alert("Solde insuffisant !");
        setLoading(false);
        return;
      }

      const pos = Array.from({ length: 25 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, mines);
      
      const { data, error } = await supabase.from('mines_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        mines_count: mines,
        mine_positions: pos,
        difficulty_level: difficulty,
        is_active: true
      }]).select().single();

      if (error) throw error;

      setGameId(data.id);
      setMinePositions(pos);
      setRevealed([]);
      setStatus('playing');
      playSound(440);
    } catch (err) {
      console.error(err);
      alert("Erreur technique. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i)) return;
    
    if (minePositions.includes(i)) {
      setStatus('ended');
      playSound(100, 'sawtooth', 0.6);
      return;
    }
    
    const newRevealed = [...revealed, i];
    setRevealed(newRevealed);
    playSound(500 + (newRevealed.length * 50));
  };

  const cashout = async () => {
    if (status !== 'playing' || revealed.length === 0 || loading) return;
    setLoading(true);
    try {
      const { data: win, error } = await supabase.rpc('claim_mines_win', { 
        game_id: gameId, 
        current_tiles_count: revealed.length 
      });
      if (error) throw error;

      playSound(800, 'sine', 0.5);
      setStatus('ended');
    } catch (err) {
      alert("Erreur lors de l'encaissement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white p-4 font-black italic uppercase select-none flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-75 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl text-emerald-500 tracking-tighter leading-none">MINES ELITE</h1>
          <span className="text-[7px] text-slate-500 tracking-[0.5em] not-italic">PROVABLY FAIR SYSTEM</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Difficultés */}
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
          {['facile', 'intermédiaire', 'difficile'].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level as any)}
              disabled={status === 'playing'}
              className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === level ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-white/5'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Panneau de contrôle */}
        <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-5">
          <div className="relative group">
            <label className="text-[10px] text-emerald-500/50 ml-4 mb-1 block tracking-widest">MISE TOTALE (HTG)</label>
            <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/10 group-focus-within:border-emerald-500/50 transition-all">
              <Coins className="text-emerald-500" size={20} />
              <input 
                type="number" 
                value={bet} 
                onChange={(e) => setBet(Number(e.target.value))}
                disabled={status === 'playing'}
                className="bg-transparent flex-1 outline-none text-2xl text-emerald-500 font-bold"
              />
            </div>
          </div>

          {status === 'playing' ? (
            <button 
              onClick={cashout}
              disabled={loading || revealed.length === 0}
              className="w-full py-6 rounded-3xl bg-amber-500 text-black flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl shadow-amber-500/10"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <span className="text-[10px] font-bold tracking-[0.2em]">ENCAISSER MAINTENANT</span>
                  <span className="text-3xl">{(bet * getMultiplier()).toFixed(0)} HTG</span>
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={start}
              disabled={loading}
              className="w-full py-6 rounded-3xl bg-emerald-500 text-black text-2xl flex items-center justify-center active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : "JOUER"}
            </button>
          )}
        </div>

        {/* Grille de jeu */}
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                revealed.includes(i) 
                ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-500 border-rose-300 scale-110 z-10 animate-bounce'
                : 'bg-white/5 border-white/5 hover:bg-white/10 active:scale-90'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8 drop-shadow-glow animate-in zoom-in" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-black w-8 h-8" />}
            </button>
          ))}
        </div>

        {status === 'ended' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4">
            <button 
              onClick={() => { setStatus('idle'); setRevealed([]); setGameId(null); }} 
              className="px-8 py-3 bg-white/5 rounded-full text-[10px] tracking-[0.4em] text-slate-400 hover:text-white transition-all border border-white/5"
            >
              NOUVELLE CHANCE ?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

