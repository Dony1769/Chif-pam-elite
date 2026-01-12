"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp } from 'lucide-react';
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

  useEffect(() => {
    if (difficulty === 'facile') setMines(5);
    if (difficulty === 'intermédiaire') setMines(8);
    if (difficulty === 'difficile') setMines(11);
  }, [difficulty]);

  const getMultiplier = () => {
    if (revealed.length === 0) return 1.0;
    let step = (difficulty === 'facile') ? 0.2 : (difficulty === 'intermédiaire') ? 0.3 : 0.5;
    return parseFloat((1.0 + (revealed.length * step)).toFixed(2));
  };

  const start = async () => {
    if (bet < 10 || loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: ok, error: rpcError } = await supabase.rpc('process_bet', { amount: bet });
      if (rpcError || !ok) {
        alert("Solde insuffisant ou erreur de mise.");
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
    } catch (err) {
      alert("Erreur lors de l'initialisation du jeu.");
    } finally { setLoading(false); }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i)) return;
    if (minePositions.includes(i)) {
      setStatus('ended');
      return;
    }
    setRevealed(prev => [...prev, i]);
  };

  const cashout = async () => {
    if (status !== 'playing' || revealed.length === 0 || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('claim_mines_win', { 
        game_id: gameId, 
        current_tiles_count: revealed.length 
      });
      
      if (error) {
        console.error("Détails erreur SQL:", error);
        alert(`Erreur encaissement : ${error.message}`);
        return;
      }
      
      setStatus('ended');
    } catch (err) {
      alert("Erreur réseau lors de l'encaissement.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase select-none flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-75 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl text-emerald-500 tracking-tighter italic font-black">MINES ELITE</h1>
          <span className="text-[7px] text-slate-500 tracking-[0.3em] block">SÉCURITÉ SERVEUR ACTIVE</span>
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
              {level}
            </button>
          ))}
        </div>

        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
              <p className="text-[8px] text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={10}/> COTE</p>
              <p className="text-xl text-emerald-500 font-bold">{getMultiplier().toFixed(2)}X</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
              <p className="text-[8px] text-slate-500 mb-1 flex items-center gap-1"><Zap size={10}/> GAIN</p>
              <p className="text-xl text-amber-500 font-bold">{(bet * getMultiplier()).toFixed(0)} HTG</p>
            </div>
          </div>
        )}

        <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
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
            className={`w-full py-6 rounded-3xl text-2xl flex flex-col items-center justify-center active:scale-95 transition-all font-black ${status === 'playing' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? `ENCAISSER` : "JOUER"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                revealed.includes(i) 
                ? 'bg-emerald-500/10 border-emerald-500/40' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-600 border-rose-400 scale-105'
                : 'bg-white/5 border-white/5'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-white w-8 h-8" />}
            </button>
          ))}
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); }}
            className="w-full py-4 bg-white/10 rounded-2xl text-[10px] tracking-widest border border-white/10"
          >
            REJOUER
          </button>
        )}
      </div>
    </div>
  );
}
