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

// IMPORT DE LA PUBLICITÉ
import ExoClickBanner from "@/components/ads/ExoClickBanner"; 

export default function CrashElite() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [bet, setBet] = useState(100); 
  const [jetonsCP, setJetonsCP] = useState(0); 
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [mult, setMult] = useState(1.0);
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintMsg, setMaintMsg] = useState("");

  const multRef = useRef<number>(1.0);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const crashAtRef = useRef<number>(0);
  const gameBoxRef = useRef<HTMLDivElement>(null);
  const isCollectingRef = useRef<boolean>(false);

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

  const collect = useCallback(async (forcedMult?: number) => {
    if (status !== 'running' || !gameId || loading || isCollectingRef.current || !userId) return;
    
    isCollectingRef.current = true;
    setLoading(true);

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    const finalMult = forcedMult || parseFloat(multRef.current.toFixed(2));
    const winAmount = Math.floor(bet * finalMult); 

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
      isCollectingRef.current = false;
    }
  }, [status, gameId, loading, userId, bet]);

  const gameLoop = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;
    
    const currentMult = Math.pow(Math.E, 0.06 * elapsed); 
    
    if (currentMult >= crashAtRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      setMult(crashAtRef.current);
      setStatus('crashed');
      triggerCrashAnimation();
      
      if (gameId) {
          supabase.from('crash_games').update({ status: 'crashed' }).eq('id', gameId).then();
      }

    } else if (autoCashout > 1.01 && currentMult >= autoCashout) {
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
    if (bet > jetonsCP || bet < 10 || loading || status === 'running') return;
    
    setLoading(true);
    setStatus('idle');
    setMult(1.0);
    multRef.current = 1.0;
    startTimeRef.current = null;
    isCollectingRef.current = false;

    try {
      const { data: ok, error: rpcErr } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: userId,
          p_mise_cp: Math.floor(bet),
          p_gain_cp: 0,
          p_jeu_nom: 'Crash Bet'
      });

      if (rpcErr || !ok.success) {
        alert("Solde insuffisant ou erreur.");
        setLoading(false);
        return;
      }

      setJetonsCP(prev => prev - bet); 

      // --- ALGORITHME DU CRASH POINT (HOUSE EDGE CONFIGURÉ À 30%) ---
      const result = Math.random();
      
      // 30% de chance de CRASH INSTANTANÉ (1.00x)
      // Le joueur perd immédiatement s'il n'a pas auto-cashout à 1.01 (impossible en pratique)
      if (result < 0.30) {
        crashAtRef.current = 1.00;
      } else {
        // Sinon, calcul normal (Provably Fair standard)
        // 0.99 / (1 - X) donne une distribution exponentielle
        // On retire le 0.30 déjà consommé pour normaliser le reste
        const remainingProb = (result - 0.30) / 0.70; 
        crashAtRef.current = parseFloat((0.99 / (1 - remainingProb)).toFixed(2));
      }

      const { data: game, error: gameErr } = await supabase.from('crash_games').insert({
        user_id: userId,
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
      console.error(error);
      alert("Erreur technique.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center p-4 font-sans select-none overflow-hidden relative">
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

      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/list')} className="p-3 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={22} />
        </button>
        
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-emerald-500 font-black tracking-tighter">{Math.floor(jetonsCP).toLocaleString()} CP</span>
        </div>
      </div>

      <main className="w-full max-w-lg space-y-4">
        
        {/* --- ZONE DE JEU --- */}
        <div ref={gameBoxRef} className="game-box relative h-80 bg-[#0a0a0f] rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="absolute bottom-0 w-full flex justify-center items-end">
             <motion.div style={{ height: `${Math.min((mult - 1) * 150, 280)}px` }} className="w-4 bg-gradient-to-t from-emerald-800 to-emerald-400 rounded-t-full relative">
                {mult > 1.2 && <SproutLeaf side="left" top="20%" />}
                {mult > 1.5 && <SproutLeaf side="right" top="40%" />}
                {mult > 2.0 && <SproutLeaf side="left" top="60%" />}
             </motion.div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-7xl font-black tracking-tighter ${status === 'crashed' ? 'text-rose-500' : 'text-emerald-400'}`}>
              {mult.toFixed(2)}<span className="text-2xl ml-1">x</span>
            </span>
            {status === 'running' && <div className="text-[10px] font-bold text-white/30 tracking-[0.4em] uppercase animate-pulse">En cours...</div>}
          </div>

          <AnimatePresence>
            {status === 'collected' && (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="win-display absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center z-20">
                <div className="bg-emerald-500 text-black px-10 py-5 rounded-full font-black text-3xl shadow-2xl">
                   +{Math.floor(bet * mult)} CP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🧠 ZONE PUB SÉCURISÉE */}
        <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-black/20 relative min-h-[80px] flex items-center justify-center">
            <p className="absolute top-1 right-2 text-[6px] text-slate-600 font-black uppercase tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {/* --- PANNEAU DE CONTRÔLE --- */}
        <div className="bg-[#0d0d12] p-6 rounded-[2.5rem] border border-white/5 space-y-5 shadow-2xl relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Coins size={10} /> Mise (CP)</label>
              <input 
                type="number" 
                value={bet} 
                onChange={e => setBet(Number(e.target.value))} 
                disabled={status === 'running'} 
                className="w-full bg-black/50 p-4 rounded-2xl border border-white/5 outline-none text-xl font-bold text-center focus:border-emerald-500/50" 
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
                className="w-full bg-black/50 p-4 rounded-2xl border border-white/5 outline-none text-xl font-bold text-center focus:border-amber-500/50" 
              />
            </div>
          </div>

          {status === 'running' ? (
            <button 
                onClick={() => collect()} 
                disabled={loading} 
                className="w-full py-6 bg-amber-500 text-black rounded-[2rem] text-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : `STOP @ ${Math.floor(bet * mult)} CP`}
            </button>
          ) : (
            <button 
                onClick={start} 
                disabled={loading || isMaintenance || bet > jetonsCP} 
                className={`w-full py-6 rounded-[2rem] text-2xl font-black shadow-lg active:scale-95 transition-all ${status === 'crashed' ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-black'}`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (status === 'crashed' ? "REJOUER" : "LANCER")}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function SproutLeaf({ side, top }: { side: 'left' | 'right', top: string }) {
  return (
    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`absolute w-8 h-4 bg-emerald-400 rounded-full ${side === 'left' ? '-left-8 rotate-[-30deg]' : '-right-8 rotate-[30deg]'}`} style={{ top }} />
  );
}
