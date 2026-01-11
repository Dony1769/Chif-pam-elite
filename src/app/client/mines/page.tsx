"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MinesElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [mines, setMines] = useState(3);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Générateur de sons (Pas de téléchargement nécessaire)
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
    } catch (e) { console.log("Audio error"); }
  };

  const getMultiplier = (count: number) => {
    let m = 1.0;
    for (let i = 0; i < count; i++) {
      m = m * (0.97 / ((25 - mines - i) / (25 - i)));
    }
    return m.toFixed(2);
  };

  const start = async () => {
    if (bet < 10) return alert("Minimum 10 HTG");
    setLoading(true);
    const { data: ok } = await supabase.rpc('process_bet', { amount: bet });
    if (!ok) { alert("Solde insuffisant"); setLoading(false); return; }

    const pos = Array.from({ length: 25 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, mines);
    const { data } = await supabase.from('mines_games').insert([{
      user_id: (await supabase.auth.getUser()).data.user?.id,
      bet_amount: bet,
      mines_count: mines,
      mine_positions: pos
    }]).select().single();

    setGameId(data.id);
    setMinePositions(pos);
    setRevealed([]);
    setStatus('playing');
    setLoading(false);
    playSound(440); // Son de départ
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i)) return;
    if (minePositions.includes(i)) {
      setStatus('ended');
      playSound(150, 'sawtooth', 0.5); // Son d'explosion
      return;
    }
    const newRevealed = [...revealed, i];
    setRevealed(newRevealed);
    playSound(600 + (newRevealed.length * 50)); // Son de gemme qui monte en gamme
  };

  const cashout = async () => {
    setLoading(true);
    await supabase.rpc('claim_mines_win', { game_id: gameId, current_tiles_count: revealed.length });
    playSound(1000, 'sine', 0.4); // Son de victoire
    setStatus('ended');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black italic uppercase">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-xl text-emerald-500">Mines Elite</h1>
          <span className="text-[7px] text-slate-500 tracking-[0.4em]">Algorithme Provably Fair</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl h-fit space-y-6">
          <div>
            <label className="text-emerald-500 text-xs mb-2 block">Montant de la mise</label>
            <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-white/10">
              <Coins className="text-emerald-500" size={20} />
              <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} disabled={status === 'playing'} className="bg-transparent flex-1 outline-none text-xl text-emerald-500" />
            </div>
          </div>

          <div>
            <label className="text-rose-500 text-xs mb-2 block">Nombre de mines : {mines}</label>
            <input type="range" min="1" max="20" value={mines} onChange={e => setMines(Number(e.target.value))} disabled={status === 'playing'} className="w-full accent-rose-500" />
          </div>

          {status === 'playing' ? (
            <button onClick={cashout} disabled={revealed.length === 0 || loading} className="w-full py-6 bg-amber-500 text-slate-950 rounded-[2rem] text-xl active:scale-95 transition-all shadow-lg">
              ENCAISSER {(bet * parseFloat(getMultiplier(revealed.length))).toFixed(0)} HTG
            </button>
          ) : (
            <button onClick={start} disabled={loading} className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] text-xl active:scale-95 transition-all shadow-lg">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "LANCER"}
            </button>
          )}
          {status === 'ended' && <button onClick={() => setStatus('idle')} className="w-full text-center text-[10px] text-slate-500 tracking-widest pt-2">REESSAYER</button>}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }).map((_, i) => (
            <button key={i} onClick={() => clickTile(i)} className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${revealed.includes(i) ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : status === 'ended' && minePositions.includes(i) ? 'bg-rose-500 border-2 border-rose-300 animate-pulse' : 'bg-slate-900 border border-white/5 active:bg-slate-800'}`}>
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8 animate-bounce" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-slate-950 w-8 h-8" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
