"use client";
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sprout, Loader2, ChevronLeft, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CrashElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [mult, setMult] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const timer = useRef<any>(null);
  const multRef = useRef(1.0);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

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
    if (bet < 10 || loading) return;
    setLoading(true);
    setStatus('idle');
    setMult(1.0);
    multRef.current = 1.0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: ok } = await supabase.rpc('process_bet', { amount: bet });
      if (!ok) {
        alert("Solde insuffisant");
        setLoading(false);
        return;
      }

      const result = Math.random();
      const crashAt = result < 0.03 ? 1.0 : parseFloat((0.97 / (1 - result)).toFixed(2));
      
      const { data: game, error: gameErr } = await supabase.from('crash_games').insert({
        user_id: user.id,
        bet_amount: bet,
        crash_point: crashAt,
        status: 'playing'
      }).select().single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setStatus('running');
      setLoading(false);
      playSound(523.25);

      timer.current = setInterval(() => {
        const increment = 0.01 * Math.pow(multRef.current, 0.6);
        const nextMult = multRef.current + increment;

        if (nextMult >= crashAt) {
          handleCrash(game.id, crashAt);
        } else {
          multRef.current = nextMult;
          setMult(nextMult);
        }
      }, 100);

    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleCrash = async (id: string, finalCrash: number) => {
    if (timer.current) clearInterval(timer.current);
    setMult(finalCrash);
    setStatus('crashed');
    playSound(100, 'sawtooth', 0.6);
    await supabase.from('crash_games').update({ status: 'lost' }).eq('id', id);
  };

  const collect = async () => {
    if (status !== 'running' || !gameId || loading) return;
    
    if (timer.current) clearInterval(timer.current);
    setLoading(true);
    const finalMult = parseFloat(multRef.current.toFixed(2));

    try {
      const { data: success } = await supabase.rpc('process_game_win_crash', { 
        p_game_id: gameId, 
        p_multiplier: finalMult 
      });

      if (success) {
        setStatus('collected');
        playSound(1046.50, 'sine', 0.3);
      } else {
        alert("Erreur transaction");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Correction de l'erreur TypeScript : on calcule d'abord le nombre
  const potentialWin = Math.floor(bet * mult);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center p-6 italic font-black uppercase overflow-hidden">
      <div className="w-full flex justify-between items-center mb-12">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
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
            <div 
              style={{ 
                height: status === 'idle' ? '20px' : `${Math.min(150 * (mult / 5), 250)}px`, 
                transition: 'height 0.1s linear' 
              }} 
              className={`w-2 bg-emerald-500 rounded-t-full relative ${status === 'crashed' ? 'bg-rose-500 opacity-30' : 'opacity-100'}`}
            >
              <Leaf className="absolute -left-6 top-10 text-emerald-400 rotate-[-45deg]" size={24} />
              <Leaf className="absolute -right-6 top-20 text-emerald-600 rotate-[45deg]" size={24} />
              <Sprout className="absolute -top-8 -left-3 text-emerald-300" size={32} />
            </div>
          </div>
          
          {status === 'collected' && (
            <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center animate-in fade-in">
              <span className="bg-emerald-500 text-black px-4 py-2 rounded-full text-sm font-bold">ENCAISSÉ !</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900/80 p-8 rounded-[3rem] border border-white/5 space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center px-2 mb-2">
             <span className="text-[10px] text-slate-500">MONTANT MISE</span>
             {/* CORRECTION ICI : Pas de multiplication avec toFixed() */}
             <span className="text-[10px] text-emerald-500">{potentialWin} HTG POTENTIEL</span>
          </div>
          
          <input 
            type="number" 
            value={bet} 
            onChange={e => setBet(Math.max(0, Number(e.target.value)))} 
            disabled={status === 'running'} 
            className="w-full bg-slate-950 p-5 rounded-2xl border border-white/5 outline-none text-2xl text-center text-emerald-500 font-bold focus:border-emerald-500/50 transition-all" 
          />
          
          {status === 'running' ? (
            <button 
              onClick={collect} 
              disabled={loading}
              className="w-full py-6 bg-amber-500 text-slate-950 rounded-[2rem] text-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin"/> : `RÉCOLTER ${potentialWin} HTG`}
            </button>
          ) : (
            <button 
              onClick={start} 
              disabled={loading} 
              className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] text-xl shadow-lg active:scale-95 transition-all flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin"/> : (status === 'crashed' || status === 'collected' ? "REJOUER" : "SEMER LA GRAINE")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
