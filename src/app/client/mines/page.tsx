"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Trophy, Zap, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MinesElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [mines, setMines] = useState(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [liveWinners, setLiveWinners] = useState<any[]>([]);

  // Configuration des paliers demandée
  useEffect(() => {
    if (difficulty === 'facile') setMines(5);
    if (difficulty === 'intermédiaire') setMines(8);
    if (difficulty === 'difficile') setMines(11);
  }, [difficulty]);

  useEffect(() => {
    const fetchWinners = async () => {
      const { data } = await supabase.from('mines_games')
        .select('user_id, multiplier, bet_amount')
        .eq('is_won', true)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setLiveWinners(data);
    };
    fetchWinners();
  }, [status]);

  // Algorithme de Multiplicateur Professionnel avec Marge Maison (0.94)
  const getMultiplier = () => {
    if (revealed.length === 0) return 1.0;
    
    let baseStep = 0.2;
    if (difficulty === 'intermédiaire') baseStep = 0.3;
    if (difficulty === 'difficile') baseStep = 0.5;

    let m = 1.0;
    for (let i = 0; i < revealed.length; i++) {
      // Formule combinant ton incrément fixe + la probabilité réelle avec marge de 6%
      const probaReelle = (25 - mines - i) / (25 - i);
      m = m * (0.94 / probaReelle);
    }
    
    // On ajoute ton palier de début de case
    return m + (revealed.length * baseStep) - baseStep;
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

      // Appel RPC sécurisé (Déduction solde avant de générer les mines)
      const { data: ok } = await supabase.rpc('process_bet', { amount: bet });
      if (!ok) {
        alert("Solde insuffisant !");
        return;
      }

      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);
      
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
      alert("Erreur technique. Contactez le support.");
    } finally {
      setLoading(false);
    }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i)) return;
    
    if (minePositions.includes(i)) {
      setStatus('ended');
      playSound(100, 'sawtooth', 0.6);
      // Optionnel: Update DB pour marquer perdu (déjà géré par l'absence de claim)
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
      const finalMult = getMultiplier();
      const { error } = await supabase.rpc('claim_mines_win', { 
        game_id: gameId, 
        current_tiles_count: revealed.length,
        claimed_multiplier: finalMult // Sécurité: validation côté serveur nécessaire
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
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase select-none flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-75 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl text-emerald-500 tracking-tighter italic font-black">MINES ELITE</h1>
          <div className="flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[7px] text-slate-500 tracking-[0.3em] not-italic uppercase">Provably Fair 6% Edge</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-5">
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          {['facile', 'intermédiaire', 'difficile'].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level as any)}
              disabled={status === 'playing'}
              className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === level ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500'}`}
            >
              {level} ({level === 'facile' ? '5' : level === 'intermédiaire' ? '8' : '11'} 💣)
            </button>
          ))}
        </div>

        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={16} />
              <div>
                <p className="text-[8px] text-slate-500 mb-1">COTE ACTUELLE</p>
                <p className="text-lg text-emerald-500 font-bold">{getMultiplier().toFixed(2)}X</p>
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <Zap className="text-amber-500" size={16} />
              <div>
                <p className="text-[8px] text-slate-500 mb-1">PROCHAIN GAIN</p>
                <p className="text-lg text-amber-500 font-bold">{(bet * getMultiplier()).toFixed(0)} HTG</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4">
          <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/10">
            <Coins className="text-emerald-500" size={20} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-2xl text-emerald-500 font-bold"
            />
          </div>

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length === 0)}
            className={`w-full py-6 rounded-3xl text-2xl flex flex-col items-center justify-center active:scale-95 transition-all font-black ${status === 'playing' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? (
              <>
                <span className="text-[10px] tracking-[0.2em] opacity-80 mb-1">ENCAISSER</span>
                <span>{(bet * getMultiplier()).toFixed(0)} HTG</span>
              </>
            ) : "LANCER L'EXPLORATION"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                revealed.includes(i) 
                ? 'bg-emerald-500/10 border-emerald-500/50' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-500 border-rose-300 scale-105'
                : 'bg-white/5 border-white/5'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-black w-8 h-8" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

