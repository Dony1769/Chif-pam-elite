"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Trophy, Zap, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MinesElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  
  // Augmentation du nombre de mines pour la sécurité de la banque
  const [mines, setMines] = useState(5); 

  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [liveWinners, setLiveWinners] = useState<any[]>([]);

  // Niveaux plus stricts : 3, 5 ou 8 mines sur 25 cases
  useEffect(() => {
    if (difficulty === 'facile') setMines(3);
    if (difficulty === 'intermédiaire') setMines(5);
    if (difficulty === 'difficile') setMines(8);
  }, [difficulty]);

  useEffect(() => {
    const fetchWinners = async () => {
      const { data } = await supabase.from('live_winners').select('*').limit(5);
      if (data) setLiveWinners(data);
    };
    fetchWinners();
    const channel = supabase.channel('realtime_wins').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mines_games' }, fetchWinners).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Calcul du multiplicateur avec une marge de 6% pour la banque (0.94)
  const getMultiplier = () => {
    if (revealed.length === 0) return 1.0;
    let m = 1.0;
    const houseEdge = 0.94; // Protection de la banque
    
    for (let i = 0; i < revealed.length; i++) {
      const probabilityOfWinning = (25 - mines - i) / (25 - i);
      m = m * (houseEdge / probabilityOfWinning);
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

      // Mélange aléatoire des mines
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
      // Le calcul final du gain est géré par le RPC claim_mines_win pour la sécurité
      const { error } = await supabase.rpc('claim_mines_win', { 
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
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase select-none flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-75 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl text-emerald-500 tracking-tighter leading-none italic font-black">MINES ELITE</h1>
          <div className="flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[7px] text-slate-500 tracking-[0.3em] not-italic">SYSTÈME LIVE CERTIFIÉ</span>
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
              {level} ({level === 'facile' ? '3' : level === 'intermédiaire' ? '5' : '8'} Bombes)
            </button>
          ))}
        </div>

        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in duration-300">
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <TrendingUp className="text-emerald-500" size={16} />
              <div>
                <p className="text-[8px] text-slate-500 leading-none mb-1">MULTIPLICATEUR</p>
                <p className="text-lg leading-none text-emerald-500 font-bold">{getMultiplier().toFixed(2)}X</p>
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <Zap className="text-amber-500" size={16} />
              <div>
                <p className="text-[8px] text-slate-500 leading-none mb-1">PROCHAIN GAIN</p>
                <p className="text-lg leading-none text-amber-500 font-bold">{(bet * getMultiplier()).toFixed(0)} HTG</p>
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
            className={`w-full py-6 rounded-3xl text-2xl flex flex-col items-center justify-center active:scale-95 transition-all font-black shadow-xl ${status === 'playing' ? 'bg-amber-500 text-black shadow-amber-500/20' : 'bg-emerald-500 text-black shadow-emerald-500/20'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? (
              <>
                <span className="text-[10px] tracking-[0.2em] opacity-80 mb-1">ENCAISSER</span>
                <span>{(bet * getMultiplier()).toFixed(0)} HTG</span>
              </>
            ) : "JOUER"}
          </button>
        </div>

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
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8 drop-shadow-glow" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-black w-8 h-8" />}
            </button>
          ))}
        </div>

        {status === 'ended' && (
          <div className="text-center">
            <button 
              onClick={() => { setStatus('idle'); setRevealed([]); setGameId(null); }} 
              className="px-8 py-3 bg-white/5 rounded-full text-[10px] tracking-[0.4em] text-slate-400 border border-white/5"
            >
              &gt; RECOMMENCER &lt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
