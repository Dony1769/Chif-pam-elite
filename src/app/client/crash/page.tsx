"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ChevronLeft, TrendingUp, 
  ShieldCheck, History, DollarSign, Sprout, Target 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

export default function CrashElite() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [bet, setBet] = useState(10);
  const [autoCashout, setAutoCashout] = useState(2.0); // Nouvel état Auto-Cashout
  const [mult, setMult] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  // --- REFS ---
  const multRef = useRef<number>(1.0);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const crashAtRef = useRef<number>(0);
  const gameBoxRef = useRef<HTMLDivElement>(null);
  const isCollectingRef = useRef<boolean>(false); // Sécurité anti-double collect

  // --- NETTOYAGE ---
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      gsap.killTweensOf(".game-box");
    };
  }, []);

  // --- ANIMATION DE CRASH (CORRECTION TS DÉFINITIVE) ---
  const triggerCrashAnimation = useCallback(() => {
    if (!gameBoxRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(".game-box", { 
        x: -10, duration: 0.05, repeat: 5, yoyo: true,
        onComplete: () => { gsap.set(".game-box", { x: 0 }); } // Accolades = Void
      });
      gsap.to(".crash-overlay", { opacity: 0.4, duration: 0.1, yoyo: true, repeat: 3 });
    }, gameBoxRef);
    return () => ctx.revert();
  }, []);

  // --- ENCAISSEMENT (LOGIQUE RÉUTILISABLE) ---
  const collect = useCallback(async (forcedMult?: number) => {
    if (status !== 'running' || !gameId || loading || isCollectingRef.current) return;
    
    isCollectingRef.current = true;
    setLoading(true);

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    const finalMult = forcedMult || parseFloat(multRef.current.toFixed(2));

    try {
      const { data: success, error: collectErr } = await supabase.rpc('process_game_win_crash', { 
        p_game_id: gameId, 
        p_multiplier: finalMult 
      });

      if (collectErr || !success) throw new Error();

      setStatus('collected');
      gsap.fromTo(".win-display", { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out" });
    } catch (e) {
      alert("Erreur de synchronisation. Gain non validé.");
    } finally {
      setLoading(false);
      isCollectingRef.current = false;
    }
  }, [status, gameId, loading]);

  // --- BOUCLE DU JEU ---
  const gameLoop = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;

    // FORMULE AVEC HOUSE EDGE (0.97 = 3% de marge pour vous)
    const currentMult = Math.pow(Math.E, 0.07 * elapsed) * 1;
    
    // 1. Vérifier si on crash
    if (currentMult >= crashAtRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      setMult(crashAtRef.current);
      setStatus('crashed');
      triggerCrashAnimation();
    } 
    // 2. Vérifier si l'Auto-Cashout est atteint
    else if (autoCashout > 1.01 && currentMult >= autoCashout) {
      setMult(autoCashout);
      multRef.current = autoCashout;
      collect(autoCashout); 
    }
    // 3. Continuer la croissance
    else {
      multRef.current = currentMult;
      setMult(currentMult);
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, [triggerCrashAnimation, autoCashout, collect]);

  // --- START ---
  const start = async () => {
    if (bet < 10 || loading || status === 'running') return;
    
    setLoading(true);
    setStatus('idle');
    setMult(1.0);
    multRef.current = 1.0;
    startTimeRef.current = null;
    isCollectingRef.current = false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // MISE
      const { data: ok, error: rpcErr } = await supabase.rpc('process_bet', { p_amount: Number(bet) });
      if (rpcErr || !ok) {
        alert("Solde insuffisant.");
        setLoading(false);
        return;
      }

      // MATHÉMATIQUES DE LA MAISON (HOUSE EDGE)
      const result = Math.random();
      // 5% de chance de "Instant Crash" à 1.00x (Le casino gagne direct)
      if (result < 0.05) {
        crashAtRef.current = 1.00;
      } else {
        // Formule standard : (97 / (100 - random_entre_0_et_97))
        // Cela garantit une espérance de gain négative pour le joueur sur le long terme
        crashAtRef.current = parseFloat((0.97 / (1 - result)).toFixed(2));
      }

      const { data: game, error: gameErr } = await supabase.from('crash_games').insert({
        user_id: user.id,
        bet_amount: Number(bet),
        crash_point: crashAtRef.current,
        status: 'playing'
      }).select().single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setStatus('running');
      setLoading(false);
      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error) {
      alert("Erreur technique.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center p-4 font-sans select-none overflow-hidden">
      <div className="crash-overlay fixed inset-0 bg-rose-600 opacity-0 pointer-events-none z-50" />

      {/* Header */}
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={22} />
        </button>
        <div className="text-right">
          <div className="flex items-center gap-2 text-emerald-400 font-black italic text-lg">
            <Sprout size={20} className="animate-pulse" /> PLANTE ELITE
          </div>
          <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">
            <ShieldCheck size={8} className="inline mr-1"/> Sécurité Maison Activée (3% Edge)
          </div>
        </div>
      </div>

      <main className="w-full max-w-lg space-y-4">
        
        {/* Game Box - LA PLANTE */}
        <div ref={gameBoxRef} className="game-box relative h-96 bg-[#0a0a0f] rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* Tige et Feuilles */}
          <div className="absolute bottom-0 w-full flex justify-center items-end">
             <motion.div 
                style={{ height: `${Math.min((mult - 1) * 150, 300)}px` }}
                className="w-4 bg-gradient-to-t from-emerald-800 to-emerald-400 rounded-t-full relative"
             >
                {mult > 1.2 && <SproutLeaf side="left" top="20%" />}
                {mult > 1.5 && <SproutLeaf side="right" top="40%" />}
                {mult > 2.0 && <SproutLeaf side="left" top="60%" />}
             </motion.div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-8xl font-black tracking-tighter ${status === 'crashed' ? 'text-rose-500' : 'text-emerald-400'}`}>
              {mult.toFixed(2)}<span className="text-2xl ml-1">x</span>
            </span>
            {status === 'running' && <div className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase">Croissance...</div>}
          </div>

          <AnimatePresence>
            {status === 'collected' && (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="win-display absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center z-20">
                <div className="bg-emerald-500 text-black px-10 py-5 rounded-full font-black text-3xl shadow-2xl">
                   +{Math.floor(bet * mult)} HTG
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panneau de Contrôle */}
        <div className="bg-[#0d0d12] p-6 rounded-[2.5rem] border border-white/5 space-y-5 shadow-2xl">
          
          <div className="grid grid-cols-2 gap-4">
            {/* MISE */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <DollarSign size={10} /> Mise (HTG)
              </label>
              <input 
                type="number" value={bet} 
                onChange={e => setBet(Number(e.target.value))}
                disabled={status === 'running'}
                className="w-full bg-black/50 p-4 rounded-2xl border border-white/5 outline-none text-xl font-bold text-center focus:border-emerald-500/50"
              />
            </div>
            {/* AUTO CASHOUT */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Target size={10} /> Auto-Cashout
              </label>
              <input 
                type="number" step="0.1" value={autoCashout} 
                onChange={e => setAutoCashout(Number(e.target.value))}
                disabled={status === 'running'}
                className="w-full bg-black/50 p-4 rounded-2xl border border-white/5 outline-none text-xl font-bold text-center focus:border-amber-500/50"
              />
            </div>
          </div>

          {status === 'running' ? (
            <button 
              onClick={() => collect()} 
              disabled={loading}
              className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-black rounded-[2rem] text-2xl font-black shadow-xl active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : `ENCAISSER ${Math.floor(bet * mult)}`}
            </button>
          ) : (
            <button 
              onClick={start} 
              disabled={loading} 
              className={`w-full py-6 rounded-[2rem] text-2xl font-black shadow-lg active:scale-95 transition-all
                ${status === 'crashed' ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-black'}`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (status === 'crashed' ? "REPLANTER" : "LANCER")}
            </button>
          )}

          <div className="flex gap-2 opacity-50">
             {[10, 50, 100, 500].map(v => (
               <button key={v} onClick={() => setBet(v)} disabled={status === 'running'} className="flex-1 py-2 bg-white/5 rounded-lg text-xs font-bold border border-white/10">
                 {v}
               </button>
             ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Composant Petit Feuille
function SproutLeaf({ side, top }: { side: 'left' | 'right', top: string }) {
  return (
    <motion.div 
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`absolute w-8 h-4 bg-emerald-400 rounded-full ${side === 'left' ? '-left-8 rotate-[-30deg]' : '-right-8 rotate-[30deg]'}`}
      style={{ top }}
    />
  );
}