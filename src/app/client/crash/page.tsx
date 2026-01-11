"use client";
import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Sprout, Loader2, ChevronLeft, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CrashElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [mult, setMult] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  // Fonction utilitaire pour sauvegarder la partie dans la base de données
  const saveGame = async (crashPoint: number, multiplier: number, gameStatus: 'won' | 'lost') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('crash_games').insert({
      user_id: user.id,
      bet_amount: bet,
      crash_point: crashPoint,
      multiplier: multiplier,
      status: gameStatus
    });
  };

  const playSound = (freq: number, type: OscillatorType = 'sine', duration = 0.2) => {
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
    if (bet < 10) return alert("Minimum 10 HTG");
    setLoading(true);
    const { data: ok } = await supabase.rpc('process_bet', { amount: bet });
    if (!ok) { alert("Solde insuffisant"); setLoading(false); return; }

    const result = Math.random();
    const crashAt = result < 0.03 ? 1.0 : (0.97 / (1 - result));
    
    setStatus('running');
    setMult(1.0);
    setLoading(false);
    playSound(523.25);

    timer.current = setInterval(() => {
      setMult(prev => {
        const next = prev + 0.01 * Math.pow(prev, 0.6);
        if (next >= crashAt) {
          clearInterval(timer.current);
          setStatus('crashed');
          playSound(100, 'sawtooth', 0.6);
          
          // Enregistrement automatique de la perte lors du crash
          saveGame(crashAt, 1.0, 'lost'); 
          
          return parseFloat(crashAt.toFixed(2));
        }
        return next;
      });
    }, 100);
  };

  const collect = async () => {
    if (status !== 'running') return;
    clearInterval(timer.current);
    setLoading(true);
    
    const finalMult = parseFloat(mult.toFixed(2));
    const win = Math.floor(bet * finalMult);
    
    // Mise à jour du solde
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('process_game_win_crash', { amount: win, mult: finalMult });
    
    // Enregistrement de la victoire dans la table crash_games
    await saveGame(finalMult, finalMult, 'won');
    
    playSound(1046.50, 'sine', 0.3);
    setStatus('collected');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center p-6 italic font-black uppercase overflow-hidden">
      <div className="w-full flex justify-between items-center mb-12">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-xl text-emerald-500 italic">Croissance Elite</h1>
          <span className="text-[7px] text-slate-500 tracking-[0.4em]">Algorithme Provably Fair</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="relative h-80 bg-slate-900/30 rounded-[3.5rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className={`text-8xl tracking-tighter z-10 transition-transform duration-75 ${status === 'crashed' ? 'text-rose-500 scale-110' : 'text-white'}`}>
            {mult.toFixed(2)}<span className="text-3xl text-emerald-500 uppercase not-italic">x</span>
          </div>

          <div className="absolute bottom-0 w-full flex justify-center">
            <div style={{ height: status === 'idle' ? '20px' : `${Math.min(150 * (mult / 5), 200)}px`, transition: 'height 0.1s linear' }} className={`w-2 bg-emerald-500 rounded-t-full relative ${status === 'crashed' ? 'bg-rose-500 opacity-30' : 'opacity-100'}`}>
              <Leaf className="absolute -left-6 top-10 text-emerald-400 rotate-[-45deg]" size={24} />
              <Leaf className="absolute -right-6 top-20 text-emerald-600 rotate-[45deg]" size={24} />
              <Sprout className="absolute -top-8 -left-3 text-emerald-300" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-8 rounded-[3rem] border border-white/5 space-y-4 shadow-2xl backdrop-blur-md">
          <input type="number" value={bet} onChange={e => setBet(Math.max(0, Number(e.target.value)))} disabled={status === 'running'} className="w-full bg-slate-950 p-5 rounded-2xl border border-white/5 outline-none text-2xl text-center text-emerald-500 font-bold" />
          
          {status === 'running' ? (
            <button onClick={collect} className="w-full py-6 bg-amber-500 text-slate-950 rounded-[2rem] text-xl shadow-lg active:scale-95 transition-all">
              RECOLTER {(bet * mult).toFixed(0)} HTG
            </button>
          ) : (
            <button onClick={start} disabled={loading} className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] text-xl shadow-lg active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : status === 'crashed' || status === 'collected' ? "REJOUER" : "SEMER LA GRAINE"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
