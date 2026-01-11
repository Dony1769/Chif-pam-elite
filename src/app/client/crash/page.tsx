"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Sprout, Leaf, ChevronLeft, ShieldCheck, 
  TrendingUp, Timer, Wallet, AlertTriangle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const SOUNDS = {
  plant: "https://assets.mixkit.co/active_storage/sfx/1105/1105-preview.mp3", // Son de pousse
  collect: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3", // Récolte
  faded: "https://assets.mixkit.co/active_storage/sfx/253/253-preview.mp3" // La plante fane
};

export default function GrowthGame() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'growing' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const growthInterval = useRef<any>(null);

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  // Logique de croissance exponentielle
  const startGrowth = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // Déterminer le crash point à l'avance (Provably Fair)
      // Logique mathématique : plus le multiplicateur est haut, plus c'est rare
      const crashPoint = (Math.random() * 10 + 1).toFixed(2);

      setStatus('growing');
      setMultiplier(1.0);
      playSound(SOUNDS.plant);

      growthInterval.current = setInterval(() => {
        setMultiplier(prev => {
          const next = prev + 0.01 * (prev * 0.5); // Accélération douce
          if (next >= parseFloat(crashPoint)) {
            clearInterval(growthInterval.current);
            setStatus('crashed');
            playSound(SOUNDS.faded);
            return parseFloat(crashPoint);
          }
          return next;
        });
      }, 100);

    } catch (err) {
      alert("Erreur lors du lancement");
    } finally { setLoading(false); }
  };

  const collectFruits = async () => {
    if (status !== 'growing') return;
    clearInterval(growthInterval.current);
    setStatus('collected');
    playSound(SOUNDS.collect);
    
    // Ici, appel à ta fonction de crédit balance (Trigger SQL déjà prêt)
    // Ajout dans la table crash_games
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans italic uppercase">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ChevronLeft size={24} className="text-slate-400" />
        </button>
        <div className="text-right">
          <h1 className="text-xl font-black text-emerald-500 italic">Croissance Elite</h1>
          <span className="text-[7px] tracking-[0.4em] text-slate-500">Système de récolte certifié</span>
        </div>
      </div>

      <div className="max-w-md mx-auto flex flex-col items-center">
        
        {/* Zone de Visualisation de la Plante */}
        <div className="relative w-full h-80 bg-slate-900/30 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden mb-8">
          
          {/* Multiplicateur Géant */}
          <motion.h2 
            key={multiplier}
            initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className={`text-7xl font-black tracking-tighter z-10 ${status === 'crashed' ? 'text-rose-500' : 'text-white'}`}
          >
            {multiplier.toFixed(2)}<span className="text-2xl text-emerald-500">x</span>
          </motion.h2>

          {/* Animation de la Plante */}
          <div className="absolute bottom-0 w-full flex justify-center">
            <motion.div 
              animate={{ 
                height: status === 'idle' ? 20 : 150 * (multiplier / 5),
                scale: status === 'crashed' ? [1, 1.1, 0.9] : 1,
                opacity: status === 'crashed' ? 0.3 : 1
              }}
              className="w-2 bg-emerald-500 rounded-t-full relative"
            >
              <Leaf className="absolute -left-6 top-10 text-emerald-400 rotate-[-45deg]" size={24} />
              <Leaf className="absolute -right-6 top-20 text-emerald-600 rotate-[45deg]" size={24} />
              <Sprout className="absolute -top-8 -left-3 text-emerald-300" size={32} />
            </motion.div>
          </div>

          {status === 'crashed' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-rose-500/10 flex items-center justify-center backdrop-blur-sm">
              <span className="bg-rose-500 text-white px-4 py-1 rounded-full text-[10px] font-black">La plante a fané !</span>
            </motion.div>
          )}
        </div>

        {/* Panneau de Mise */}
        <div className="w-full bg-slate-900 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[9px] text-slate-500">Mise Totale (HTG)</span>
            <span className="text-[9px] text-emerald-500 flex items-center gap-1"><Wallet size={10}/> Solde: {bet}</span>
          </div>
          
          <input 
            type="number" value={bet} onChange={(e) => setBet(Number(e.target.value))}
            disabled={status === 'growing'}
            className="w-full bg-slate-950 p-4 rounded-2xl border border-white/5 outline-none text-xl font-black text-center"
          />

          {status !== 'growing' ? (
            <button 
              onClick={startGrowth}
              className="w-full py-5 bg-emerald-500 text-slate-950 rounded-[2rem] font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Semer la graine
            </button>
          ) : (
            <button 
              onClick={collectFruits}
              className="w-full py-5 bg-amber-500 text-slate-950 rounded-[2rem] font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              Récolter ({(bet * multiplier).toFixed(0)} HTG)
            </button>
          )}
        </div>

        <div className="mt-8 flex gap-6">
          <div className="flex flex-col items-center opacity-40">
            <ShieldCheck size={18} />
            <span className="text-[7px] mt-1">Provably Fair</span>
          </div>
          <div className="flex flex-col items-center opacity-40">
            <TrendingUp size={18} />
            <span className="text-[7px] mt-1">Haut Rendement</span>
          </div>
        </div>
      </div>
    </div>
  );
}
