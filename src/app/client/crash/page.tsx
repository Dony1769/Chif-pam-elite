"use client";
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ChevronLeft, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

export default function CrashElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [mult, setMult] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  
  // Refs pour la performance (évite les re-renders inutiles)
  const multRef = useRef(1.0);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const curveRef = useRef<SVGSVGElement>(null);

  // --- ANIMATION GSAP HAUTE PERFORMANCE ---
  useEffect(() => {
    if (status === 'running') {
      gsap.to(".game-bg", { opacity: 0.1, duration: 1, repeat: -1, yoyo: true });
      gsap.fromTo(".mult-text", { scale: 0.9 }, { scale: 1.1, duration: 0.2, ease: "power1.inOut" });
    } else {
      gsap.killTweensOf(".game-bg");
    }
  }, [status]);

  const gameLoop = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;

    // Formule mathématique de croissance exponentielle (Elite)
    // 15k users : le calcul est fait localement pour la fluidité
    const currentMult = Math.pow(Math.E, 0.08 * elapsed);
    
    if (currentMult >= (window as any).crashAt) {
      handleCrash(gameId!, (window as any).crashAt);
    } else {
      multRef.current = currentMult;
      setMult(currentMult);
      requestRef.current = requestAnimationFrame(gameLoop);
    }
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

      // 1. Transaction atomique
      const { data: ok, error: rpcErr } = await supabase.rpc('process_bet', { amount: bet });
      if (!ok || rpcErr) {
        alert("Solde insuffisant ou erreur réseau");
        setLoading(false);
        return;
      }

      // 2. Génération du crash point (Provably Fair)
      const result = Math.random();
      const crashAt = result < 0.03 ? 1.0 : parseFloat((0.97 / (1 - result)).toFixed(2));
      (window as any).crashAt = crashAt; // Stockage sécurisé temporaire

      // 3. Création de la partie
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
      startTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error) {
      console.error(error);
      setLoading(false);
      alert("Une erreur est survenue lors du lancement.");
    }
  };

  const handleCrash = async (id: string, finalCrash: number) => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setMult(finalCrash);
    setStatus('crashed');
    
    // Animation de secousse avec GSAP
    gsap.to(".game-container", { x: 10, duration: 0.05, repeat: 5, yoyo: true });
    
    await supabase.from('crash_games').update({ status: 'lost' }).eq('id', id);
  };

  const collect = async () => {
    if (status !== 'running' || !gameId || loading) return;
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setLoading(true);
    const finalMult = parseFloat(multRef.current.toFixed(2));

    try {
      const { data: success } = await supabase.rpc('process_game_win_crash', { 
        p_game_id: gameId, 
        p_multiplier: finalMult 
      });

      if (success) {
        setStatus('collected');
        gsap.fromTo(".win-badge", { y: 50, opacity: 0 }, { y: 0, opacity: 1, ease: "back.out" });
      } else {
        alert("Erreur lors de l'encaissement.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center p-4 font-sans uppercase overflow-hidden">
      
      {/* Header Premium */}
      <div className="w-full max-w-lg flex justify-between items-center mb-8 mt-4">
        <button onClick={() => router.back()} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-emerald-500 font-black italic text-xl">
            <TrendingUp size={20} /> CROISSANCE ELITE
          </div>
          <div className="flex items-center gap-1 text-[8px] text-slate-500 tracking-[0.2em]">
            <ShieldCheck size={10} /> SÉCURITÉ MILITAIRE QUANTIQUE
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg space-y-6 game-container">
        {/* Zone Graphique Centrale */}
        <div className="relative h-96 bg-[#0a0a0f] rounded-[3rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          <div className="game-bg absolute inset-0 bg-emerald-500/5 opacity-0 pointer-events-none" />
          
          <AnimatePresence>
            {status === 'crashed' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-rose-500/10 z-0" />
            )}
          </AnimatePresence>

          <div className={`mult-text text-8xl font-black tracking-tighter z-10 transition-colors duration-300 ${status === 'crashed' ? 'text-rose-500' : 'text-white'}`}>
            {mult.toFixed(2)}<span className="text-3xl text-emerald-500">x</span>
          </div>

          {/* Effet visuel de croissance (SVG Dynamique) */}
          <svg className="absolute bottom-0 w-full h-full pointer-events-none">
            <motion.path
              d={`M 0 400 Q ${200 * mult} ${400 - (20 * mult)} 500 0`}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className={status === 'crashed' ? 'text-rose-500/20' : 'text-emerald-500/30'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: mult / 10 }}
            />
          </svg>
          
          {status === 'collected' && (
            <div className="win-badge absolute bottom-10 z-20">
              <span className="bg-emerald-500 text-black px-8 py-3 rounded-2xl text-lg font-black shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                +{Math.floor(bet * mult)} HTG
              </span>
            </div>
          )}
        </div>

        {/* Panneau de Contrôle */}
        <div className="bg-[#0d0d12] p-6 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center px-4">
             <span className="text-[10px] text-slate-500 font-bold tracking-widest">CONFIGURATION MISE</span>
             <div className="flex items-center gap-2">
                <Zap size={12} className="text-amber-500" />
                <span className="text-xs text-emerald-500 font-black">{Math.floor(bet * mult)} HTG GAIN</span>
             </div>
          </div>
          
          <div className="relative group">
            <input 
              type="number" 
              value={bet} 
              onChange={e => setBet(Math.max(0, Number(e.target.value)))} 
              disabled={status === 'running'} 
              className="w-full bg-black/40 p-6 rounded-3xl border border-white/5 outline-none text-3xl text-center text-white font-black focus:border-emerald-500/50 transition-all" 
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-bold">HTG</div>
          </div>
          
          <div className="flex gap-2">
            {[10, 50, 100, 500].map(val => (
                <button 
                  key={val} 
                  onClick={() => setBet(val)} 
                  disabled={status === 'running'}
                  className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-bold border border-white/5 active:bg-emerald-500/20"
                >
                  {val}
                </button>
            ))}
          </div>

          {status === 'running' ? (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={collect} 
              disabled={loading}
              className="w-full py-7 bg-gradient-to-r from-amber-400 to-amber-600 text-black rounded-3xl text-2xl font-black shadow-[0_10px_40px_rgba(245,158,11,0.3)] flex justify-center items-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin"/> : "ENCAISSER MAINTENANT"}
            </motion.button>
          ) : (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={start} 
              disabled={loading} 
              className="w-full py-7 bg-gradient-to-r from-emerald-400 to-emerald-600 text-black rounded-3xl text-2xl font-black shadow-[0_10px_40px_rgba(16,185,129,0.3)] flex justify-center items-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin"/> : (status === 'crashed' || status === 'collected' ? "NOUVELLE TENTATIVE" : "LANCER LA CROISSANCE")}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

