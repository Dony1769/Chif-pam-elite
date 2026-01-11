"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Sprout, Leaf, ChevronLeft, ShieldCheck, 
  TrendingUp, Wallet, AlertTriangle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const SOUNDS = {
  plant: "https://assets.mixkit.co/active_storage/sfx/1105/1105-preview.mp3",
  collect: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  faded: "https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3"
};

export default function GrowthGame() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'growing' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const growthInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (growthInterval.current) clearInterval(growthInterval.current);
    };
  }, []);

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const startGrowth = async () => {
    if (bet <= 0 || loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const seed = Math.random();
      const crashPoint = Math.max(1, (0.99 / (1 - seed))).toFixed(2); 

      setStatus('growing');
      setMultiplier(1.0);
      playSound(SOUNDS.plant);

      growthInterval.current = setInterval(() => {
        setMultiplier(prev => {
          const increment = 0.01 * Math.pow(prev, 0.5); 
          const next = prev + increment;
          
          if (next >= parseFloat(crashPoint)) {
            if (growthInterval.current) clearInterval(growthInterval.current);
            setStatus('crashed');
            playSound(SOUNDS.faded);
            return parseFloat(crashPoint);
          }
          return next;
        });
      }, 100);

    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const collectFruits = async () => {
    if (status !== 'growing' || !growthInterval.current) return;
    
    clearInterval(growthInterval.current);
    setStatus('collected');
    playSound(SOUNDS.collect);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black italic uppercase overflow-hidden">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={24} className="text-slate-400" />
        </button>
        <div className="text-right">
          <h1 className="text-xl text-emerald-500">Croissance Elite</h1>
          <span className="text-[7px] tracking-[0.4em] text-slate-500 italic">Provably Fair System</span>
        </div>
      </div>

      <div className="max-w-md mx-auto flex flex-col items-center">
        
        {/* Zone de Visualisation */}
        <div className="relative w-full h-80 bg-slate-900/30 rounded-[3.5rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden mb-8 shadow-2xl">
          
          <AnimatePresence mode="wait">
            <motion.h2 
              key={multiplier.toFixed(2)}
              initial={{ opacity: 0.5, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-7xl font-black tracking-tighter z-10 ${status === 'crashed' ? 'text-rose-500' : 'text-white'}`}
            >
              {multiplier.toFixed(2)}<span className="text-2xl text-emerald-500 uppercase not-italic">x</span>
            </motion.h2>
          </AnimatePresence>

          {/* Animation de la Plante */}
          <div className="absolute bottom-0 w-full flex justify-center">
            <motion.div 
              animate={{ 
                height: status === 'idle' ? 20 : 150 * (Math.min(multiplier, 5) / 5),
                scale: status === 'crashed' ? [1, 1.05, 1] : 1,
              }}
              transition={{ type: 'spring', stiffness: 50 }}
              className="w-2 bg-emerald-500 rounded-t-full relative"
            >
              <Leaf className="absolute -left-6 top-10 text-emerald-400 rotate-[-45deg]" size={24} />
              <Leaf className="absolute -right-6 top-20 text-emerald-600 rotate-[45deg]" size={24} />
              <Sprout className="absolute -top-8 -left-3 text-emerald-300" size={32} />
            </motion.div>
          </div>

          {status === 'crashed' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-rose-500/20 flex items-center justify-center backdrop-blur-md z-20">
              <div className="bg-rose-500 text-slate-950 px-6 py-2 rounded-full text-xs font-black shadow-xl">LA PLANTE A FANÉ !</div>
            </motion.div>
          )}
        </div>

        {/* Panneau de Mise */}
        <div className="w-full bg-slate-900/80 p-6 rounded-[3rem] border border-white/5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-slate-500 font-bold">Mise (HTG)</span>
            <span className="text-[10px] text-emerald-500 flex items-center gap-1"><Wallet size={12}/> BALANCE</span>
          </div>
          
          <input 
            type="number" 
            value={bet} 
            onChange={(e) => setBet(Math.max(0, Number(e.target.value)))}
            disabled={status === 'growing'}
            className="w-full bg-slate-950 p-5 rounded-2xl border border-white/5 outline-none text-2xl font-black text-center text-emerald-500 focus:border-emerald-500/50 transition-all"
          />

          {status !== 'growing' ? (
            <button 
              onClick={startGrowth}
              disabled={loading}
              className="w-full py-6 bg-emerald-500 text-slate-950 rounded-[2rem] font-black text-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              SEMER LA GRAINE
            </button>
          ) : (
            <button 
              onClick={collectFruits}
              className="w-full py-6 bg-amber-500 text-slate-950 rounded-[2rem] font-black text-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              RÉCOLTER ({(bet * multiplier).toFixed(0)} HTG)
            </button>
          )}
        </div>

        <div className="mt-8 flex gap-8 opacity-30 pb-10">
           <div className="flex flex-col items-center"><ShieldCheck size={20} /><span className="text-[8px] mt-1">Sécurisé</span></div>
           <div className="flex flex-col items-center"><TrendingUp size={20} /><span className="text-[8px] mt-1">Elite</span></div>
        </div>
      </div>
    </div>
  );
}
