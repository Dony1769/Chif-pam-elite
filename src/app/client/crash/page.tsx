"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ChevronLeft, TrendingUp, 
  ShieldCheck, DollarSign, Sprout, Target, AlertTriangle, Hammer, Coins
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// IMPORT DE LA PUBLICITÉ
import ExoClickBanner from "@/components/ads/ExoClickBanner"; 

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([8, 20, 8]);
  }
};

export default function CrashElite() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [bet, setBet] = useState(100); 
  const [jetonsCP, setJetonsCP] = useState(0); 
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [mult, setMult] = useState(0.5); // DÉPART À 0.5x
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintMsg, setMaintMsg] = useState("");

  const multRef = useRef<number>(0.5);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const crashAtRef = useRef<number>(0);
  const gameBoxRef = useRef<HTMLDivElement>(null);
  
  // 🔒 SÉCURITÉ REFS
  const lockedBetRef = useRef<number>(0); // Mise inviolable
  const isProcessingRef = useRef<boolean>(false); // Verrou anti-double appel

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            const { data } = await supabase.from('profiles').select('jetons_cp').eq('id', user.id).single();
            if (data) setJetonsCP(data.jetons_cp);
        }
        
        const { data: setting } = await supabase.from('game_settings').select('*').eq('game_id', 'crash').single();
        if (setting && !setting.is_active) {
            setIsMaintenance(true);
            setMaintMsg(setting.maintenance_msg);
        }
    };
    init();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      gsap.killTweensOf(".game-box");
    };
  }, []);

  const triggerCrashAnimation = useCallback(() => {
    if (!gameBoxRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(".game-box", { 
        x: -10, duration: 0.05, repeat: 5, yoyo: true,
        onComplete: () => { gsap.set(".game-box", { x: 0 }); }
      });
      gsap.to(".crash-overlay", { opacity: 0.4, duration: 0.1, yoyo: true, repeat: 3 });
    }, gameBoxRef);
    return () => ctx.revert();
  }, []);

  // --- FONCTION ENCAISSER SÉCURISÉE ---
  const collect = useCallback(async (forcedMult?: number) => {
    // 🛡️ SÉCURITÉ : Si déjà en cours de traitement ou pas en jeu, on bloque
    if (status !== 'running' || !gameId || loading || isProcessingRef.current || !userId) return;
    
    isProcessingRef.current = true; // VERROUILLAGE
    setLoading(true);

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    const finalMult = forcedMult || parseFloat(multRef.current.toFixed(2));
    
    // 🔒 UTILISATION DE LA MISE VERROUILLÉE (Pas l'input)
    const secureBet = lockedBetRef.current;
    const economy = resolveGameEconomy({
      gameId: 'crash',
      bet: secureBet,
      multiplier: finalMult,
      difficulty: 'intermédiaire',
      autoCashout: finalMult,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });
    const winAmount = economy.payout; 

    try {
      const { data: result, error: rpcErr } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: userId,
          p_mise_cp: 0,
          p_gain_cp: winAmount, 
          p_jeu_nom: `Crash Win x${finalMult}`
      });

      if (rpcErr || !result.success) throw new Error("Erreur transaction gain");

      setJetonsCP(prev => prev + winAmount);
      
      await supabase.from('crash_games').update({
          status: 'cashed_out',
          multiplier_out: finalMult,
          payout: winAmount
      }).eq('id', gameId);

      setStatus('collected');
    } catch (e) {
      alert("Erreur de synchronisation.");
    } finally {
      setLoading(false);
      isProcessingRef.current = false; // DÉVERROUILLAGE (Fin de partie)
    }
  }, [status, gameId, loading, userId]); // Note: bet retiré des dépendances car on utilise lockedBetRef

  const gameLoop = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;
    
    const currentMult = 0.5 * Math.pow(Math.E, 0.08 * elapsed); 
    
    if (currentMult >= crashAtRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      setMult(crashAtRef.current);
      setStatus('crashed');
      triggerCrashAnimation();
      
      if (gameId) {
          supabase.from('crash_games').update({ status: 'crashed' }).eq('id', gameId).then();
      }

    } else if (autoCashout > 0.51 && currentMult >= autoCashout) {
      setMult(autoCashout);
      multRef.current = autoCashout;
      collect(autoCashout); 
    } else {
      multRef.current = currentMult;
      setMult(currentMult);
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, [triggerCrashAnimation, autoCashout, collect, gameId]);

  const start = async () => {
    if (isMaintenance || !userId) return;
    triggerHaptic();
    if (bet > jetonsCP || bet < 10 || loading || status === 'running') return;
    
    setLoading(true);
    isProcessingRef.current = false; // Reset sécurité pour nouvelle partie
    setStatus('idle');
    setMult(0.5); 
    multRef.current = 0.5;
    startTimeRef.current = null;

    try {
      const finalBet = Math.floor(bet);
      
      // 🔒 VERROUILLAGE MISE
      lockedBetRef.current = finalBet;

      const { data: ok, error: rpcErr } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: userId,
          p_mise_cp: finalBet,
          p_gain_cp: 0,
          p_jeu_nom: 'Crash Bet'
      });

      if (rpcErr || !ok.success) {
        alert("Solde insuffisant ou erreur.");
        setLoading(false);
        return;
      }

      setJetonsCP(prev => prev - finalBet); 

      const result = Math.random();
      const economy = resolveGameEconomy({
        gameId: 'crash',
        bet: finalBet,
        difficulty: 'intermédiaire',
        multiplier: 1,
        randomValue: result,
        bonusMultiplier: 1,
        jackpotMultiplier: 1,
        specialEventMultiplier: 1
      });
      crashAtRef.current = Number((economy.metadata.crashPoint as number) ?? 1.0);

      const { data: game, error: gameErr } = await supabase.from('crash_games').insert({
        user_id: userId,
        bet_amount: finalBet,
        crash_point: crashAtRef.current, 
        status: 'playing'
      }).select().single();

      if (gameErr) throw gameErr;
      
      setGameId(game.id);
      setStatus('running');
      setLoading(false);
      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error) {
      console.error(error);
      alert("Erreur technique.");
      setLoading(false);
    }
  };

  return (
    <NeonGameShell accent="amber" className="min-h-screen p-4 font-sans select-none">
      <div className="crash-overlay fixed inset-0 bg-rose-600 opacity-0 pointer-events-none z-50" />

      {/* OVERLAY MAINTENANCE */}
      <AnimatePresence>
        {isMaintenance && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center"
          >
            <div className="max-w-xs space-y-6">
              <div className="w-24 h-24 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                <Hammer className="text-amber-500 animate-bounce" size={40} />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Crash en <span className="text-amber-500">Pause</span></h2>
              <p className="text-slate-400 text-xs font-bold leading-relaxed italic">"{maintMsg || "Nous effectuons des mises à jour."}"</p>
              <button onClick={() => router.push('/client/home')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Retour à l'accueil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex w-full max-w-lg items-center justify-between">
        <button onClick={() => router.push('/client/list')} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.16)] active:scale-90 transition-all">
          <ChevronLeft size={22} />
        </button>
        
        <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2">
            <Coins size={16} className="text-amber-300" />
            <span className="font-black tracking-tighter text-amber-200">{Math.floor(jetonsCP).toLocaleString()} CP</span>
        </div>
      </div>

      <main className="w-full max-w-lg space-y-4">
        
        {/* --- ZONE DE JEU (GAME BOX) --- */}
        <div ref={gameBoxRef} className="game-box relative flex h-80 flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-amber-400/20 bg-slate-950/70 shadow-[0_0_60px_rgba(245,158,11,0.14)]">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="absolute bottom-0 w-full flex justify-center items-end">
             <motion.div style={{ height: `${Math.min((mult - 0.5) * 200, 280)}px` }} className="w-4 bg-gradient-to-t from-emerald-800 to-emerald-400 rounded-t-full relative">
                {mult > 1.2 && <SproutLeaf side="left" top="20%" />}
                {mult > 1.5 && <SproutLeaf side="right" top="40%" />}
                {mult > 2.0 && <SproutLeaf side="left" top="60%" />}
             </motion.div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-7xl font-black tracking-tighter ${status === 'crashed' ? 'text-rose-400' : 'text-amber-300'}`}>
              <AnimatedCounter value={Number(mult.toFixed(2))} suffix="x" className="text-7xl" accent="amber" />
            </span>
            {status === 'running' && <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 animate-pulse">En cours...</div>}
          </div>

          <AnimatePresence>
            {status === 'collected' && (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="win-display absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center z-20">
                <div className="bg-emerald-500 text-black px-10 py-5 rounded-full font-black text-3xl shadow-2xl">
                   {/* Affichage basé sur la mise sécurisée */}
                   +{Math.floor(lockedBetRef.current * mult)} CP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🧠 ZONE PUB SÉCURISÉE */}
        <div className="relative flex min-h-[80px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <p className="absolute top-1 right-2 text-[6px] text-slate-600 font-black uppercase tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {/* --- PANNEAU DE CONTRÔLE --- */}
        <div className="relative z-10 space-y-5 rounded-[2.5rem] border border-white/10 bg-slate-950/65 p-6 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Coins size={10} /> Mise (CP)</label>
              <input 
                type="number" 
                value={bet} 
                onChange={e => setBet(Number(e.target.value))} 
                disabled={status === 'running'} 
                className="w-full bg-black/50 p-4 rounded-2xl border border-white/5 outline-none text-xl font-bold text-center focus:border-emerald-500/50 transition-colors disabled:opacity-50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Target size={10} /> Auto-Stop (x)</label>
              <input 
                type="number" 
                step="0.1" 
                value={autoCashout} 
                onChange={e => setAutoCashout(Number(e.target.value))} 
                disabled={status === 'running'} 
                className="w-full bg-black/50 p-4 rounded-2xl border border-white/5 outline-none text-xl font-bold text-center focus:border-amber-500/50 transition-colors disabled:opacity-50" 
              />
            </div>
          </div>

          <ProgressBar value={Math.min(100, (mult > 0.5 ? (mult - 0.5) / 2.5 : 0) * 100)} max={100} label="Moteur de chute" accent="amber" />

          {status === 'running' ? (
            <button 
                onClick={() => collect()} 
                disabled={loading || isProcessingRef.current} 
                className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-gradient-to-r from-amber-400 to-orange-500 py-6 text-2xl font-black text-black shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all active:scale-95 disabled:opacity-80"
            >
                {loading ? <Loader2 className="animate-spin" /> : `STOP @ ${Math.floor(lockedBetRef.current * mult)} CP`}
            </button>
          ) : (
            <button 
                onClick={start} 
                disabled={loading || isMaintenance || bet > jetonsCP} 
                className={`w-full rounded-[2rem] py-6 text-2xl font-black shadow-lg transition-all active:scale-95 ${status === 'crashed' ? 'bg-rose-600 text-white' : 'bg-gradient-to-r from-amber-400 to-emerald-500 text-black'}`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (status === 'crashed' ? "REJOUER" : "LANCER")}
            </button>
          )}
        </div>
      </main>
    </NeonGameShell>
  );
}

function SproutLeaf({ side, top }: { side: 'left' | 'right', top: string }) {
  return (
    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`absolute w-8 h-4 bg-emerald-400 rounded-full ${side === 'left' ? '-left-8 rotate-[-30deg]' : '-right-8 rotate-[30deg]'}`} style={{ top }} />
  );
}
