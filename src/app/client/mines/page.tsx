"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp, ShieldAlert, Lock, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ExoClickBanner from "@/components/ads/ExoClickBanner";
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// Helper haptique sécurisé pour mobile
const triggerHaptic = () => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([10, 25, 10]);
    } catch {
      // Ignorer si bloqué par le navigateur
    }
  }
};

export default function MinesElite() {
  const router = useRouter();
  
  // --- ÉTATS DU JEU ---
  const [bet, setBet] = useState<number>(100);
  const [jetonsCP, setJetonsCP] = useState<number>(0); 
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [mines, setMines] = useState<number>(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [userId, setUserId] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [effects, setEffects] = useState<Array<{ id: number; x: number; y: number; type: 'spark' | 'explosion' }>>([]);

  // --- SYSTÈME & MAINTENANCE ---
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');
  const [checkingSystem, setCheckingSystem] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  // --- REFS CRITIQUES ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Unmount Check
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Synchronisation du nombre de mines selon la difficulté
  useEffect(() => {
    const counts = { facile: 5, intermédiaire: 8, difficile: 11 };
    setMines(counts[difficulty]);
  }, [difficulty]);

  // Timer de jeu
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      handleGameOver(true); 
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // Initialisation et Chargement des données
  useEffect(() => {
    let active = true;

    const initSystem = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          if (active) router.push('/connexion');
          return;
        }

        if (active) setUserId(authData.user.id);

        // Chargement Profil
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('jetons_cp')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileErr) console.warn('Erreur chargement profil:', profileErr.message);
        if (active && profileData) {
          setJetonsCP(profileData.jetons_cp ?? 0);
        }

        // Vérification Maintenance
        const { data: settingsData, error: settingsErr } = await supabase
          .from('game_settings')
          .select('is_active, maintenance_msg')
          .eq('game_id', 'mines')
          .maybeSingle();

        if (settingsErr) console.warn('Erreur game_settings:', settingsErr.message);
        if (active && settingsData && settingsData.is_active === false) {
          setIsMaintenance(true);
          setMaintenanceMsg(settingsData.maintenance_msg || 'Maintenance en cours...');
        }

      } catch (err: any) {
        if (active) {
          console.error('Erreur init Mines:', err);
          setInitError(err?.message || 'Erreur lors de la connexion au service.');
        }
      } finally {
        if (active) setCheckingSystem(false);
      }
    };

    initSystem();

    return () => {
      active = false;
    };
  }, [router]);

  // Calcul du multiplicateur de gain
  const getMultiplier = (revealedCount = revealed.length) => {
    const economy = resolveGameEconomy({
      gameId: 'mines',
      bet: 0,
      revealedCount,
      difficulty,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });
    return economy.multiplier;
  };

  const addEffect = (type: 'spark' | 'explosion', index: number) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const x = 10 + col * 20;
    const y = 10 + row * 20;
    const id = Date.now() + Math.random();
    
    setEffects(prev => [...prev, { id, x, y, type }]);
    
    setTimeout(() => {
      if (isMounted) {
        setEffects(prev => prev.filter(effect => effect.id !== id));
      }
    }, 900);
  };

  const start = async () => {
    if (isProcessingRef.current || isMaintenance || !userId || loading) return;
    triggerHaptic();

    const finalBet = Math.floor(bet);
    if (finalBet < 10 || finalBet > jetonsCP) return;

    setLoading(true);
    isProcessingRef.current = true;

    try {
      lockedBetRef.current = finalBet;

      // Débit du montant parié (Profit direct pour la maison/admin si perdu)
      const { data: ok, error } = await supabase.rpc('jouer_partie_cp', { 
        p_user_id: userId,
        p_mise_cp: finalBet,
        p_gain_cp: 0,
        p_jeu_nom: 'Mines Elite'
      });

      if (error || !ok?.success) {
        throw new Error(error?.message || 'Fonds insuffisants ou erreur de transaction.');
      }

      setJetonsCP(prev => prev - finalBet);

      // Positions aléatoires des mines
      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);

      const { data: game, error: gameErr } = await supabase
        .from('mines_games')
        .insert([{
          user_id: userId,
          bet_amount: finalBet,
          mines_count: mines,
          mine_positions: pos,
          difficulty_level: difficulty,
          is_active: true
        }])
        .select()
        .single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMinePositions(pos);
      setRevealed([]);
      setCombo(0);
      setEffects([]);
      setTimeLeft(20);
      setStatus('playing');

    } catch (err: any) {
      console.error('Start game error:', err);
      setInitError(err?.message || 'Impossible de démarrer la partie.');
      setTimeout(() => setInitError(null), 4000);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i) || isProcessingRef.current) return;
    triggerHaptic();

    if (minePositions.includes(i)) {
      addEffect('explosion', i);
      setCombo(0);
      handleGameOver(true);
      return;
    }

    addEffect('spark', i);
    setCombo(prev => prev + 1);
    setRevealed(prev => [...prev, i]);
  };

  const handleGameOver = async (isBombHit: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!gameId) {
      isProcessingRef.current = false;
      return;
    }

    const currentMult = getMultiplier();
    const secureBet = lockedBetRef.current;

    const economy = resolveGameEconomy({
      gameId: 'mines',
      bet: secureBet,
      revealedCount: revealed.length,
      difficulty,
      multiplier: currentMult,
      isBombHit,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });

    let winAmount = isBombHit ? 0 : economy.payout;

    setCombo(0);
    setStatus('ended');

    try {
      if (winAmount > 0 && userId) {
        const { error: payoutError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: userId,
          p_mise_cp: 0,
          p_gain_cp: winAmount,
          p_jeu_nom: 'Mines Cashout'
        });

        if (payoutError) {
          console.error('Erreur crédit gains:', payoutError);
        } else {
          setJetonsCP(prev => prev + winAmount);
        }
      }

      await supabase
        .from('mines_games')
        .update({ 
          is_active: false,
          payout: winAmount,
          status: winAmount > 0 ? 'won' : 'lost'
        })
        .eq('id', gameId);

    } catch (error) {
      console.error("Erreur clôture partie:", error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const cashout = async () => {
    if (status !== 'playing' || revealed.length < 1 || loading) return;
    setLoading(true);
    try {
      await handleGameOver(false);
    } finally {
      setLoading(false);
    }
  };

  const currentMult = getMultiplier();
  const remainingSafe = Math.max(0, 25 - mines - revealed.length);
  const remainingTiles = Math.max(1, 25 - revealed.length);
  const safeProbability = remainingSafe / remainingTiles;
  const riskPercent = Math.min(100, Math.round((mines / remainingTiles) * 100));
  const riskLabel = riskPercent >= 45 ? 'Élevé' : riskPercent >= 25 ? 'Moyen' : 'Faible';

  const premiumIndices = useMemo(() => {
    const indices = Array.from({ length: 25 }, (_, i) => i);
    const baseCount = difficulty === 'facile' ? 4 : difficulty === 'intermédiaire' ? 6 : 8;
    return indices.filter((_, idx) => {
      const seed = (idx + combo + revealed.length + mines) % 7;
      return seed < Math.min(4, baseCount - 2);
    }).slice(0, baseCount);
  }, [combo, difficulty, mines, revealed.length]);

  if (!isMounted || checkingSystem) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="text-violet-500 animate-spin" size={40} />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-6 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="relative z-10 bg-[#0a0a0f] border border-red-500/20 p-10 rounded-[3rem] shadow-2xl max-w-md w-full">
          <ShieldAlert size={40} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl text-red-500 mb-2">ERREUR SYSTÈME</h1>
          <p className="text-xs text-slate-400 mb-6 italic">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] tracking-widest text-white">
            RÉESSAYER
          </button>
        </div>
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-6 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="relative z-10 bg-[#0a0a0f] border border-amber-500/20 p-10 rounded-[3rem] shadow-2xl max-w-md w-full">
          <ShieldAlert size={40} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl text-amber-500 mb-2">MAINTENANCE</h1>
          <p className="text-xs text-slate-400 mb-6 italic">{maintenanceMsg}</p>
          <button onClick={() => router.push('/client/list')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] tracking-widest text-white">
            RETOUR
          </button>
        </div>
      </div>
    );
  }

  return (
    <NeonGameShell accent="violet" className="min-h-screen p-4 font-black italic uppercase flex flex-col items-center select-none pb-20">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <button onClick={() => router.push('/client/list')} className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.16)]">
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2">
          <Coins size={16} className="text-violet-300" />
          <span className="font-black tracking-tighter text-violet-200">{Math.floor(jetonsCP).toLocaleString()} CP</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-5">
        {/* Choix Difficulté */}
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
          {(['facile', 'intermédiaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`flex-1 rounded-xl py-3 text-[10px] transition-all ${difficulty === level ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-black shadow-[0_0_20px_rgba(167,139,250,0.25)]' : 'text-slate-500'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* HUD Stats */}
        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in duration-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
              <p className="mb-1 flex items-center justify-center gap-1 text-[8px] text-slate-500"><TrendingUp size={10}/> COTE</p>
              <p className={`text-lg font-bold ${currentMult <= 1.0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                <AnimatedCounter value={Number(currentMult.toFixed(2))} suffix="X" accent={currentMult <= 1.0 ? 'emerald' : 'amber'} />
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
              <p className="mb-1 flex items-center justify-center gap-1 text-[8px] text-slate-500"><Zap size={10}/> GAIN POTENTIEL</p>
              <p className="text-lg font-bold text-white"><AnimatedCounter value={Math.floor(lockedBetRef.current * currentMult)} /></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
              <p className="mb-1 flex items-center justify-center gap-1 text-[8px] text-slate-500"><ShieldAlert size={10}/> RISQUE</p>
              <p className={`text-lg font-bold ${riskLabel === 'Élevé' ? 'text-rose-400' : riskLabel === 'Moyen' ? 'text-amber-300' : 'text-emerald-300'}`}>{riskLabel} · {riskPercent}%</p>
            </div>
            <div className={`rounded-2xl border p-4 text-center transition-all ${timeLeft <= 5 ? 'animate-pulse border-rose-500 bg-rose-500/20' : 'border-white/10 bg-white/5'}`}>
              <p className="text-[8px] text-slate-500 mb-1 flex items-center justify-center gap-1"><Clock size={10}/> TEMPS</p>
              <p className={`text-lg font-bold ${timeLeft <= 5 ? 'text-rose-500' : 'text-white'}`}>{timeLeft}S</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-center backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between text-[8px] uppercase tracking-[0.3em] text-slate-500">
                <span>Chance de Sécurité</span>
                <span className="text-violet-300">{Math.round(safeProbability * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(safeProbability * 100)}%` }} transition={{ duration: 0.35 }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" />
              </div>
            </div>
          </div>
        )}

        {/* Panneau de Mise / Action */}
        <div className="relative z-10 space-y-4 rounded-[2.5rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_0_45px_rgba(167,139,250,0.12)]">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-5">
            <Coins className="text-emerald-500" size={20} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Math.max(10, Number(e.target.value)))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-2xl text-emerald-500 font-bold placeholder-emerald-900 disabled:opacity-50"
            />
          </div>

          <ProgressBar value={Math.min(100, (revealed.length / 25) * 100)} max={100} label="Progression" accent="violet" />

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length < 1) || (status !== 'playing' && bet > jetonsCP)}
            className={`flex w-full flex-col items-center justify-center rounded-3xl py-6 text-2xl font-black shadow-lg transition-all active:scale-95 ${
              status === 'playing' 
              ? (revealed.length < 1 ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-amber-500/20') 
              : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-black shadow-violet-500/20'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? (
              <>
                <span>ENCAISSER</span>
                {currentMult > 1.0 ? (
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-1"><ShieldAlert size={10}/> DANGER</span>
                ) : (
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-1"><Lock size={10}/> SÉCURISÉ</span>
                )}
              </>
            ) : (bet > jetonsCP ? "SOLDE INSUFFISANT" : "JOUER")}
          </button>
        </div>

        {/* Grille de jeu */}
        <div className="relative">
          <AnimatePresence>
            {effects.map(effect => (
              <motion.div
                key={effect.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.25, 1.4], y: [0, -6, 12] }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="pointer-events-none absolute z-30"
                style={{ left: `calc(${effect.x}% - 20px)`, top: `calc(${effect.y}% - 20px)` }}
              >
                {effect.type === 'explosion' ? (
                  <div className="relative flex h-10 w-10 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-rose-400/70" />
                    <div className="absolute h-6 w-6 rounded-full bg-rose-500/40 blur-xl" />
                    <div className="absolute h-4 w-4 rounded-full bg-amber-300/80" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-xl text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)]">✦</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 25 }).map((_, i) => {
              const isPremium = premiumIndices.includes(i);
              const isMine = minePositions.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => clickTile(i)}
                  disabled={status !== 'playing' || isProcessingRef.current}
                  className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
                    revealed.includes(i) 
                    ? 'border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : status === 'ended' && isMine
                    ? 'z-20 scale-105 border-rose-400 bg-rose-600 shadow-lg shadow-rose-500/50'
                    : isPremium
                    ? 'border-violet-400/50 bg-violet-500/10 shadow-[0_0_20px_rgba(167,139,250,0.18)]'
                    : 'border-white/10 bg-white/5 active:bg-white/10'
                  }`}
                >
                  {isPremium && !revealed.includes(i) && status === 'playing' && (
                    <span className="absolute left-1 top-1 rounded-full bg-amber-400/80 px-1.5 py-0.5 text-[8px] font-black text-black">PREM</span>
                  )}
                  {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8 animate-in zoom-in duration-300 mx-auto" />}
                  {status === 'ended' && isMine && <Bomb className="text-white w-8 h-8 animate-in bounce-in duration-500 mx-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone Publicitaire / Sponsor */}
        <div className="relative mt-6 flex min-h-[100px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <p className="absolute top-2 right-4 text-[8px] text-slate-600 tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); setTimeLeft(20); }}
            className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold tracking-widest transition-all text-white"
          >
            REJOUER
          </button>
        )}
      </div>
    </NeonGameShell>
  );
}
