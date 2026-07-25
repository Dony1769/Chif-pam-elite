"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, ChevronLeft, TrendingUp, 
  ShieldCheck, DollarSign, Target, Hammer, Coins, Zap, Trophy, History, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// IMPORT DE LA PUBLICITÉ
import ExoClickBanner from "@/components/ads/ExoClickBanner"; 

const triggerHaptic = (pattern = [8, 20, 8]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export default function CrashElite() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [bet, setBet] = useState<number>(100); 
  const [jetonsCP, setJetonsCP] = useState<number>(0); 
  const [autoCashout, setAutoCashout] = useState<number>(2.0);
  const [mult, setMult] = useState<number>(0.5); 
  const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'collected'>('idle');
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Historique & Stats de session
  const [history, setHistory] = useState<number[]>([1.45, 3.20, 1.12, 5.40, 1.85]);
  const [sessionGains, setSessionGains] = useState<number>(0);

  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintMsg, setMaintMsg] = useState<string>("");

  const multRef = useRef<number>(0.5);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const crashAtRef = useRef<number>(0);
  const gameBoxRef = useRef<HTMLDivElement>(null);
  
  // 🔒 SÉCURITÉ REFS
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // --- INITIALISATION ---
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

      // Charger les derniers crashs enregistrés
      const { data: recentGames } = await supabase
        .from('crash_games')
        .select('crash_point')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (recentGames && recentGames.length > 0) {
        setHistory(recentGames.map(g => Number(g.crash_point || 1.0)));
      }
    };
    init();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      gsap.killTweensOf(".game-box");
    };
  }, []);

  // --- ANIMATION DE CRASH ---
  const triggerCrashAnimation = useCallback(() => {
    if (!gameBoxRef.current) return;
    triggerHaptic([30, 50, 30, 50, 100]);
    const ctx = gsap.context(() => {
      gsap.to(".game-box", { 
        x: -12, duration: 0.04, repeat: 7, yoyo: true,
        onComplete: () => { gsap.set(".game-box", { x: 0 }); }
      });
      gsap.to(".crash-overlay", { opacity: 0.5, duration: 0.08, yoyo: true, repeat: 4 });
    }, gameBoxRef);
    return () => ctx.revert();
  }, []);

  // --- FONCTION ENCAISSER (CASHOUT) ---
  const collect = useCallback(async (forcedMult?: number) => {
    if (status !== 'running' || !gameId || loading || isProcessingRef.current || !userId) return;
    
    isProcessingRef.current = true;
    setLoading(true);

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    const finalMult = forcedMult || parseFloat(multRef.current.toFixed(2));
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

      triggerHaptic([10, 30, 20, 60]);
      setJetonsCP(prev => prev + winAmount);
      setSessionGains(prev => prev + (winAmount - secureBet));
      
      await supabase.from('crash_games').update({
        status: 'cashed_out',
        multiplier_out: finalMult,
        payout: winAmount
      }).eq('id', gameId);

      setStatus('collected');
    } catch (e) {
      alert("Erreur de synchronisation lors du gain.");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  }, [status, gameId, loading, userId]);

  // --- BOUCLE DU JEU ---
  const gameLoop = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;
    
    const currentMult = 0.5 * Math.pow(Math.E, 0.08 * elapsed); 
    
    if (currentMult >= crashAtRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
      
      const finalCrashPoint = Number(crashAtRef.current.toFixed(2));
      setMult(finalCrashPoint);
      setStatus('crashed');
      triggerCrashAnimation();
      
      setHistory(prev => [finalCrashPoint, ...prev.slice(0, 5)]);

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

  // --- DEMARRER UNE PARTIE ---
  const start = async () => {
    if (isMaintenance || !userId) return;
    triggerHaptic([15, 10]);
    if (bet > jetonsCP || bet < 10 || loading || status === 'running') return;
    
    setLoading(true);
    isProcessingRef.current = false;
    setStatus('idle');
    setMult(0.5); 
    multRef.current = 0.5;
    startTimeRef.current = null;

    try {
      const finalBet = Math.floor(bet);
      lockedBetRef.current = finalBet;

      const { data: ok, error: rpcErr } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: userId,
        p_mise_cp: finalBet,
        p_gain_cp: 0,
        p_jeu_nom: 'Crash Bet'
      });

      if (rpcErr || !ok.success) {
        alert("Solde insuffisant ou erreur lors du prélèvement.");
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
      alert("Erreur technique au lancement.");
      setLoading(false);
    }
  };

  // --- RACCOURCIS DE MISE RAPIDE ---
  const handleQuickBet = (action: 'half' | 'double' | 'max' | number) => {
    if (status === 'running') return;
    triggerHaptic([5]);
    if (typeof action === 'number') {
      setBet(action);
    } else if (action === 'half') {
      setBet(prev => Math.max(10, Math.floor(prev / 2)));
    } else if (action === 'double') {
      setBet(prev => Math.min(jetonsCP, prev * 2));
    } else if (action === 'max') {
      setBet(jetonsCP);
    }
  };

  return (
    <NeonGameShell accent="amber" className="min-h-screen p-4 font-sans select-none">
      <div className="crash-overlay fixed inset-0 bg-rose-600 opacity-0 pointer-events-none z-50 transition-opacity" />

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
              <button 
                onClick={() => router.push('/client/home')} 
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Retour à l'accueil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENTÊTE AVEC RETOUR ET SOLDE */}
      <div className="mb-4 flex w-full max-w-lg items-center justify-between mx-auto">
        <button 
          onClick={() => router.push('/client/list')} 
          className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.16)] active:scale-90 transition-all"
        >
          <ChevronLeft size={22} />
        </button>

        {/* INDICATEUR DE STATS SESSION */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
          <Trophy size={14} className="text-amber-400" />
          <span>{sessionGains >= 0 ? `+${sessionGains}` : sessionGains} CP</span>
        </div>
        
        <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <Coins size={16} className="text-amber-300" />
            <span className="font-black tracking-tighter text-amber-200">{Math.floor(jetonsCP).toLocaleString()} CP</span>
        </div>
      </div>

      <main className="w-full max-w-lg space-y-4 mx-auto">
        
        {/* BANDEAU HISTORIQUE DES DERNIERS CRASHS */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-2 bg-slate-950/60 border border-white/5 rounded-2xl no-scrollbar">
          <History size={14} className="text-slate-500 shrink-0 ml-1" />
          <div className="flex items-center gap-1.5">
            {history.map((val, idx) => (
              <span 
                key={idx} 
                className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                  val >= 2.0 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {val.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* ZONE DE JEU (GAME BOX) */}
        <div 
          ref={gameBoxRef} 
          className="game-box relative flex h-80 flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-amber-400/20 bg-slate-950/80 shadow-[0_0_60px_rgba(245,158,11,0.14)]"
        >
          {/* GRILLE DE FOND DYNAMIQUE */}
          <div 
            className="absolute inset-0 opacity-15" 
            style={{ 
              backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)', 
              backgroundSize: '30px 30px' 
            }} 
          />

          {/* FUSÉE / ORBE ANIMÉE DE PROGRESSION */}
          <div className="absolute bottom-4 w-full flex justify-center items-end pointer-events-none">
             <motion.div 
               style={{ height: `${Math.min((mult - 0.5) * 180, 250)}px` }} 
               className="w-2 bg-gradient-to-t from-amber-500 via-emerald-400 to-cyan-300 rounded-t-full relative flex justify-center"
             >
                {/* Tête de fusée néon */}
                <div className="absolute -top-3 w-6 h-6 bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_15px_#22d3ee] flex items-center justify-center">
                   <div className="w-2 h-2 bg-white rounded-full" />
                </div>
             </motion.div>
          </div>

          {/* AFFICHAGE DU MULTIPLICATEUR */}
          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-7xl font-black tracking-tighter ${status === 'crashed' ? 'text-rose-500' : 'text-amber-300'}`}>
              <AnimatedCounter value={Number(mult.toFixed(2))} suffix="x" className="text-7xl" accent="amber" />
            </span>
            
            {status === 'running' && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 animate-pulse mt-2">
                <Zap size={12} /> Vol en cours...
              </div>
            )}

            {status === 'crashed' && (
              <div className="text-xs font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mt-2">
                CRASH À {mult.toFixed(2)}x
              </div>
            )}
          </div>

          {/* OVERLAY DE VICTOIRE */}
          <AnimatePresence>
            {status === 'collected' && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.8, opacity: 0 }}
                className="win-display absolute inset-0 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20"
              >
                <div className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">Encaisse Réussie !</div>
                <div className="bg-gradient-to-r from-emerald-400 to-teal-300 text-black px-8 py-4 rounded-full font-black text-3xl shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                   +{Math.floor(lockedBetRef.current * mult)} CP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ZONE PUB SÉCURISÉE */}
        <div className="relative flex min-h-[70px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <p className="absolute top-1 right-2 text-[6px] text-slate-600 font-black uppercase tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {/* PANNEAU DE CONTRÔLE ET COMMANDES */}
        <div className="relative z-10 space-y-4 rounded-[2.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          
          {/* INPUTS MISE & AUTO-STOP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Coins size={10} className="text-amber-400" /> Mise (CP)
              </label>
              <input 
                type="number" 
                value={bet} 
                onChange={e => setBet(Math.max(0, Number(e.target.value)))} 
                disabled={status === 'running'} 
                className="w-full bg-black/60 p-3.5 rounded-2xl border border-white/10 outline-none text-lg font-black text-center focus:border-amber-500/50 transition-colors disabled:opacity-50" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Target size={10} className="text-emerald-400" /> Auto-Stop (x)
              </label>
              <input 
                type="number" 
                step="0.1" 
                value={autoCashout} 
                onChange={e => setAutoCashout(Number(e.target.value))} 
                disabled={status === 'running'} 
                className="w-full bg-black/60 p-3.5 rounded-2xl border border-white/10 outline-none text-lg font-black text-center focus:border-emerald-500/50 transition-colors disabled:opacity-50" 
              />
            </div>
          </div>

          {/* BOUTONS DE MISE RAPIDE */}
          {status !== 'running' && (
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <button onClick={() => handleQuickBet(100)} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">100</button>
              <button onClick={() => handleQuickBet(500)} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">500</button>
              <button onClick={() => handleQuickBet('half')} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 active:scale-95 transition-all">1/2</button>
              <button onClick={() => handleQuickBet('double')} className="py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-amber-400 hover:bg-white/10 active:scale-95 transition-all">x2</button>
              <button onClick={() => handleQuickBet('max')} className="py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-[10px] font-black text-amber-300 hover:bg-amber-500/30 active:scale-95 transition-all">MAX</button>
            </div>
          )}

          <ProgressBar 
            value={Math.min(100, (mult > 0.5 ? (mult - 0.5) / 2.5 : 0) * 100)} 
            max={100} 
            label="Moteur de vol" 
            accent="amber" 
          />

          {/* ACTION BUTTON */}
          {status === 'running' ? (
            <button 
              onClick={() => collect()} 
              disabled={loading || isProcessingRef.current} 
              className="flex w-full items-center justify-center gap-2 rounded-[2rem] bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 py-5 text-2xl font-black text-black shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-80"
            >
              {loading ? <Loader2 className="animate-spin" /> : `ENCAISSER @ ${Math.floor(lockedBetRef.current * mult)} CP`}
            </button>
          ) : (
            <button 
              onClick={start} 
              disabled={loading || isMaintenance || bet > jetonsCP || bet < 10} 
              className={`w-full rounded-[2rem] py-5 text-2xl font-black shadow-lg transition-all active:scale-95 ${
                bet > jetonsCP 
                  ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed' 
                  : status === 'crashed' 
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.3)]' 
                  : 'bg-gradient-to-r from-amber-400 to-emerald-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.25)]'
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : bet > jetonsCP ? (
                "SOLDE INSUFFISANT"
              ) : status === 'crashed' ? (
                "REJOUER"
              ) : (
                "LANCER LE VOL"
              )}
            </button>
          )}
        </div>
      </main>
    </NeonGameShell>
  );
}
