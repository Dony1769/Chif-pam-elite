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

  // Système de sons intégré
  const playSound = (type: 'start' | 'collect' | 'crash') => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'start') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    } else if (type === 'collect') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);
    }
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const startGrowth = async () => {
    if (bet < 10 || loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: success } = await supabase.rpc('process_game_bet', { 
        amount_to_deduct: bet,
        game_name: 'CRASH'
      });

      if (!success) throw new Error("Solde insuffisant");

      playSound('start');
      const seed = Math.random();
      const crashPoint = Math.max(1.01, (0.98 / (1 - seed))).toFixed(2); 

      setStatus('growing');
      setMultiplier(1.0);

      growthInterval.current = setInterval(() => {
        setMultiplier(prev => {
          const next = prev + (0.01 * Math.pow(prev, 0.5));
          if (next >= parseFloat(crashPoint)) {
            clearInterval(growthInterval.current!);
            setStatus('crashed');
            playSound('crash');
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
    
    const winAmount = Math.floor(bet * multiplier);
    try {
      await supabase.rpc('process_game_win_crash', { amount: winAmount, mult: multiplier });
      playSound('collect');
      setStatus('collected');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
            <div style={{ height: status === 'idle' ? '20px' : `${Math.min(150 * (multiplier / 5), 200)}px`, transition: 'height 0.1s linear' }} className={`w-2 bg-emerald-500 rounded-t-full relative ${status === 'crashed' ? 'opacity-30' : 'opacity-100'}`}>
              <Leaf className="absolute -left-6 top-10 text-emerald-400 rotate-[-45deg]" size={24} />
              <Leaf className="absolute -right-6 top-20 text-emerald-600 rotate-[45deg]" size={24} />
              <Sprout className="absolute -top-8 -left-3 text-emerald-300" size={32} />
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-900/80 p-6 rounded-[3rem] border border-white/5 space-y-4 shadow-2xl backdrop-blur-md">
          <input type="number" value={bet} onChange={(e) => setBet(Math.max(0, Number(e.target.value)))} disabled={status === 'growing'} className="w-full bg-slate-950 p-5 rounded-2xl border border-white/5 outline-none text-2xl text-center text-emerald-500" />
          <button onClick={status === 'growing' ? collectFruits : startGrowth} disabled={loading} className={`w-full py-6 rounded-[2rem] font-black text-lg transition-all ${status === 'growing' ? 'bg-amber-500' : 'bg-emerald-500'} text-slate-950`}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : status === 'growing' ? `Récolter ${(bet * multiplier).toFixed(0)} HTG` : "Semer la graine"}
          </button>
          {status !== 'growing' && status !== 'idle' && (
            <button onClick={() => setStatus('idle')} className="w-full text-xs text-slate-500 pt-2">Rejouer</button>
          )}
        </div>
      </div>
    </div>
  );
}
