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
    if (bet <= 0 || loading) return;
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Session expirée. Reconnectez-vous.");
        return;
      }

      // 1. DÉDUCTION DU SOLDE
      const { data: ok, error: rpcError } = await supabase.rpc('process_bet', { amount: bet });
      
      if (rpcError || !ok) {
        alert("Solde insuffisant dans votre profil !");
        setLoading(false);
        return;
      }

      // 2. GÉNÉRATION DES MINES
      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);
      
      // 3. CRÉATION DE LA PARTIE EN BASE DE DONNÉES
      const { data, error: insertError } = await supabase.from('mines_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        mines_count: mines,
        mine_positions: pos,
        difficulty_level: difficulty,
        is_active: true
      }]).select().single();

      if (insertError) {
        console.error("Détails de l'erreur d'insertion:", insertError);
        alert("Erreur lors de la création du jeu. Contactez le support.");
        setLoading(false);
        return;
      }

      // 4. LANCEMENT DU JEU
      setGameId(data.id);
      setMinePositions(pos);
      setRevealed([]);
      setStatus('playing'); // Changement d'état critique
      playSound(440);
      
    } catch (err) {
      console.error("Erreur critique:", err);
      alert("Une erreur inattendue est survenue.");
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

  const cashout = async () => {
    if (status !== 'playing' || revealed.length === 0 || loading) return;
    setLoading(true);
    try {
      const { data: winAmount, error } = await supabase.rpc('claim_mines_win', { 
        game_id: gameId, 
        current_tiles_count: revealed.length 
      });

      if (error) throw error;

      playSound(1000, 'sine', 0.4);
      setStatus('ended');
      alert(`Félicitations ! Vous avez gagné ${winAmount.toFixed(0)} HTG`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'encaissement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 font-black italic uppercase select-none">
      {/* Header */}
      <div className="flex justify-between items-center max-w-md mx-auto mb-6">
        <button onClick={() => router.push('/client/home')} className="p-2 bg-[#111] rounded-xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-lg text-emerald-500 tracking-tighter italic">MINES ELITE</h1>
          <p className="text-[6px] text-slate-500 tracking-[0.3em] not-italic">SÉCURISÉ & SYSTÈME PROVABLY FAIR</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* Difficultés */}
        <div className="grid grid-cols-3 gap-2 bg-[#111] p-1.5 rounded-2xl border border-white/5 shadow-inner">
          {(['facile', 'intermédiaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`py-2 rounded-xl text-[10px] transition-all duration-300 ${difficulty === level ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Mise et Actions */}
        <div className="bg-[#0f0f0f] p-5 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
          <div className="bg-black p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <Coins className="text-emerald-500" size={18} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-xl text-emerald-500 font-bold"
            />
          </div>

          {status === 'playing' ? (
            <button 
              onClick={cashout}
              disabled={loading || revealed.length === 0}
              className="w-full py-5 rounded-[1.5rem] text-lg flex flex-col items-center justify-center transition-all active:scale-95 bg-amber-500 text-black font-black"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <span className="text-[10px] tracking-widest opacity-80">ENCAISSER</span>
                  <span className="text-2xl">{(bet * getMultiplier()).toFixed(0)} HTG</span>
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={start}
              disabled={loading}
              className="w-full py-5 rounded-[1.5rem] text-lg flex items-center justify-center transition-all active:scale-95 bg-emerald-500 text-black font-black shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
            >
              {loading ? <Loader2 className="animate-spin" /> : "LANCER LA PARTIE"}
            </button>
          )}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-5 gap-2.5 pt-2">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                revealed.includes(i) 
                ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-600 border-rose-400 scale-95 shadow-[0_0_25px_rgba(225,29,72,0.5)]'
                : 'bg-[#121212] border-white/5 active:bg-[#181818] active:scale-90'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-7 h-7 animate-in zoom-in duration-300" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-black w-7 h-7" />}
            </button>
          ))}
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); setMinePositions([]); }} 
            className="w-full py-4 text-slate-500 text-[11px] tracking-[0.4em] hover:text-white transition-colors"
          >
            &gt; RECOMMENCER &lt;
          </button>
        )}
      </div>
    </div>
  );
}

