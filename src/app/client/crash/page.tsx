"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Sprout, Leaf, ChevronLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GrowthGame() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'growing' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const growthInterval = useRef<NodeJS.Timeout | null>(null);

  const playSound = (freq: number, type: OscillatorType = 'sine', duration = 0.2) => {
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
  };

  const startGrowth = async () => {
    if (bet < 10 || loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // Déduction du solde dans 'profiles'
      const { data: success } = await supabase.rpc('process_game_bet', { 
        amount_to_deduct: bet,
        game_name: 'CRASH'
      });

      if (!success) {
        alert("Solde insuffisant !");
        setLoading(false);
        return;
      }

      const crashPoint = Math.max(1.01, (0.99 / (1 - Math.random()))).toFixed(2);
      setStatus('growing');
      setMultiplier(1.0);
      playSound(523.25);

      growthInterval.current = setInterval(() => {
        setMultiplier(prev => {
          const next = prev + (0.01 * Math.pow(prev, 0.5));
          if (next >= parseFloat(crashPoint)) {
            if (growthInterval.current) clearInterval(growthInterval.current);
            setStatus('crashed');
            playSound(150, 'sawtooth', 0.5);
            return parseFloat(crashPoint);
          }
          return next;
        });
      }, 100);

    } catch (err: any) {
      alert(err.message);
    } finally { setLoading(false); }
  };

  const collectFruits = async () => {
    if (status !== 'growing' || !growthInterval.current) return;
    clearInterval(growthInterval.current);
    setLoading(true);
    
    try {
      const winAmount = Math.floor(bet * multiplier);
      await supabase.rpc('process_game_win_crash', { amount: winAmount, mult: multiplier });
      playSound(1046.50, 'sine', 0.4);
      setStatus('collected');
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black italic uppercase overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="text-right">
          <h1 className="text-xl text-emerald-500">Croissance Elite</h1>
          <span className="text-[7px] text-slate-500 tracking-[0.4em]">Algorithme Provably Fair</span>
        </div>
      </div>

      <div className="max-w-md mx-auto flex flex-col items-center">
        <div className="relative w-full h-80 bg-slate-900/30 rounded-[3.5rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden mb-8 shadow-2xl">
          <h2 className={`text-7xl tracking-tighter z-10 transition-all duration-75 ${status === 'crashed' ? 'text-rose-500 scale-110' : 'text-white'}`}>
            {multiplier.toFixed(2)}<span className="text-2xl text-emerald-500 uppercase not-italic">x</span>
          </h2>
          <div className="absolute bottom-0 w-full flex justify-center">
            <div style={{ height: status === 'idle' ? '20px' : `${Math.min(150 * (multiplier / 5), 200)}px` }} className={`w-2 bg-emerald-500 rounded-t-full relative transition-all duration-100 ${status === 'crashed' ? 'bg-rose-900 opacity-50' : 'opacity-100'}`}>
              <Leaf className="absolute -left-6 top-10 text-emerald-400 rotate-[-45deg]" size={24} />
              <Leaf className="absolute -right-6 top-20 text-emerald-600 rotate-[45deg]" size={24} />
              <Sprout className="absolute -top-8 -left-3 text-emerald-300" size={32} />
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-900/80 p-6 rounded-[3rem] border border-white/5 space-y-4 shadow-2xl backdrop-blur-md">
          <input type="number" value={bet} onChange={(e) => setBet(Math.max(10, Number(e.target.value)))} disabled={status === 'growing'} className="w-full bg-slate-950 p-5 rounded-2xl border border-white/5 outline-none text-2xl text-center text-emerald-500 font-bold" />
          <button onClick={status === 'growing' ? collectFruits : startGrowth} disabled={loading} className={`w-full py-6 rounded-[2rem] font-black text-lg transition-all active:scale-95 ${status === 'growing' ? 'bg-amber-500' : 'bg-emerald-500'} text-slate-950`}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : status === 'growing' ? `Récolter ${(bet * multiplier).toFixed(0)} HTG` : "Lancer la croissance"}
          </button>
          {status !== 'growing' && status !== 'idle' && <button onClick={() => setStatus('idle')} className="w-full text-center text-[10px] text-slate-500 uppercase tracking-widest pt-2">Réessayer</button>}
        </div>
      </div>
    </div>
  );
}
