"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp, ShieldAlert, Lock, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
// Import Publicité
import ExoClickBanner from "@/components/ads/ExoClickBanner";
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 25, 10]);
  }
};

export default function MinesElite() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [bet, setBet] = useState(100); // Mise en CP (Input UI)
  const [jetonsCP, setJetonsCP] = useState(0); 
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [mines, setMines] = useState(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [userId, setUserId] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [effects, setEffects] = useState<Array<{ id: number; x: number; y: number; type: 'spark' | 'explosion' }>>([]);

  // --- MAINTENANCE ---
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // 🔒 SÉCURITÉ & REFS CRITIQUES
  const lockedBetRef = useRef<number>(0); // Stocke la mise inviolable au lancement
  const isProcessingRef = useRef<boolean>(false); // Mutex pour empêcher les doubles appels

  // TIMER
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      // Temps écoulé = Défaite forcée (Bombe simulée)
      handleGameOver(true); 
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // INITIALISATION
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Vérifier l'authentification
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          router.push('/connexion');
          return;
        }

        setUserId(authData.user.id);

        // 2. Charger le solde CP du profil
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('jetons_cp')
            .eq('id', authData.user.id)
            .single();
          if (profileData?.jetons_cp !== undefined) {
            setJetonsCP(profileData.jetons_cp);
          }
        } catch (profileErr) {
          console.warn('Profile load failed:', profileErr);
          setJetonsCP(0);
        }

        // 3. Vérifier maintenance
        try {
          const { data: settingsData } = await supabase
            .from('game_settings')
            .select('is_active, maintenance_msg')
            .eq('game_id', 'mines')
            .maybeSingle();
          if (settingsData && settingsData.is_active === false) {
            setIsMaintenance(true);
            setMaintenanceMsg(settingsData.maintenance_msg || 'Maintenance en cours...');
          }
        } catch (settingsErr) {
          console.warn('Settings load failed:', settingsErr);
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Erreur lors du chargement';
        console.error('Init error:', errMsg);
        setInitError(errMsg);
      } finally {
        setCheckingSystem(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    const counts = { facile: 5, intermédiaire: 8, difficile: 11 };
    setMines(counts[difficulty]);
  }, [difficulty]);

  // --- CALCUL DU MULTIPLICATEUR ---
  // Base 0.5 + Incrément selon difficulté
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
    window.setTimeout(() => {
      setEffects(prev => prev.filter(effect => effect.id !== id));
    }, 900);
  };

  const start = async () => {
    if (isProcessingRef.current || isMaintenance || !userId) return;
    triggerHaptic();
    if (bet < 10 || bet > jetonsCP || loading) return;
    
    setLoading(true);
    isProcessingRef.current = true; // Verrouillage temporaire pendant l'init

    try {
      const finalBet = Math.floor(bet);
      
      // 🔒 VERROUILLAGE DÉFINITIF DE LA MISE
      lockedBetRef.current = finalBet;

      // 1. Transaction RPC : DÉBIT MISE CP
      const { data: ok, error } = await supabase.rpc('jouer_partie_cp', { 
          p_user_id: userId,
          p_mise_cp: finalBet,
          p_gain_cp: 0,
          p_jeu_nom: 'Mines Bet'
      });

      if (error || !ok?.success) {
        const errorMsg = error?.message || 'Erreur lors du débit CP';
        setInitError(errorMsg);
        setLoading(false);
        isProcessingRef.current = false;
        setTimeout(() => setInitError(null), 4000);
        return;
      }

      setJetonsCP(prev => prev - finalBet); 

      // 2. Génération Mines (Côté client pour la démo, idéalement côté serveur)
      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);
      
      // 3. Création partie DB
      const { data: game, error: gameErr } = await supabase.from('mines_games').insert([{
        user_id: userId,
        bet_amount: finalBet,
        mines_count: mines,
        mine_positions: pos,
        difficulty_level: difficulty,
        is_active: true
      }]).select().single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMinePositions(pos);
      setRevealed([]);
      setCombo(0);
      setEffects([]);
      setTimeLeft(20);
      setStatus('playing');
      
      // Déverrouillage pour le jeu
      isProcessingRef.current = false;

    } catch (err: any) {
      const errorMsg = err?.message || 'Erreur technique';
      setInitError(errorMsg);
      console.error('Start error:', err);
      isProcessingRef.current = false;
      setTimeout(() => setInitError(null), 4000);
    } finally { setLoading(false); }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i) || isProcessingRef.current) return;
    triggerHaptic();
    
    // BOOM (Mine touchée)
    if (minePositions.includes(i)) {
      addEffect('explosion', i);
      setCombo(0);
      handleGameOver(true); // true = forced loss
      return;
    }
    
    // SAFE
    addEffect('spark', i);
    setCombo(prev => prev + 1);
    setRevealed(prev => [...prev, i]);
  };

  // --- FIN DE PARTIE SÉCURISÉE ---
  const handleGameOver = async (isBombHit: boolean) => {
    // 🛡️ ANTI DOUBLE-APPEL
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!gameId) return;
    
    // Calcul basé sur l'état actuel
    const currentMult = getMultiplier();
    
    // 🔒 UTILISATION DE LA MISE SÉCURISÉE (Pas l'input)
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
    let winAmount = economy.payout;

    if (isBombHit && currentMult <= 1.0) {
      winAmount = economy.payout;
    } else if (isBombHit) {
      winAmount = 0;
    }

    setCombo(0);
    setStatus('ended');

    try {
        // Transaction Gain (si > 0)
        if (winAmount > 0) {
            const { error: payoutError } = await supabase.rpc('jouer_partie_cp', {
                p_user_id: userId,
                p_mise_cp: 0,
                p_gain_cp: winAmount,
                p_jeu_nom: isBombHit ? 'Mines Safety Cashout' : 'Mines Win'
            });
            if (payoutError) {
              console.error('Payout error:', payoutError);
              setInitError('Erreur lors du crédit des gains');
              setTimeout(() => setInitError(null), 3000);
            }
            setJetonsCP(prev => prev + winAmount);
        }

        // Fermeture session DB
        await supabase.from('mines_games').update({ 
            is_active: false,
            payout: winAmount,
            status: winAmount > 0 ? 'won' : 'lost'
        }).eq('id', gameId);

    } catch (error) {
        console.error("Erreur clôture:", error);
    } finally {
        // On laisse le statut 'ended' mais on déverrouille pour permettre "Rejouer"
        isProcessingRef.current = false;
    }
  };

  const cashout = async () => {
    // Min 1 case pour encaisser
    if (status !== 'playing' || revealed.length < 1 || loading) return; 
    
    setLoading(true);
    try {
        await handleGameOver(false); // false = cashout volontaire
    } catch (err: any) {
        alert("Erreur d'encaissement.");
    } finally { setLoading(false); }
  };

  if (checkingSystem) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="text-emerald-500 animate-spin" size={40} />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-6 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
        <div className="relative z-10 bg-[#0a0a0f] border border-red-500/20 p-10 rounded-[3rem] shadow-2xl shadow-red-500/10 max-w-md w-full">
          <ShieldAlert size={40} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl text-red-500 mb-2 tracking-tighter">ERREUR</h1>
          <p className="text-xs text-slate-400 mb-6 italic">«{initError}»</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] tracking-widest">RÉESSAYER</button>
        </div>
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-6 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="absolute inset-0 bg-amber-500/5 animate-pulse"></div>
        <div className="relative z-10 bg-[#0a0a0f] border border-amber-500/20 p-10 rounded-[3rem] shadow-2xl shadow-amber-500/10 max-w-md w-full">
          <ShieldAlert size={40} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl text-amber-500 mb-2 tracking-tighter">MAINTENANCE</h1>
          <p className="text-xs text-slate-400 mb-6 italic">"{maintenanceMsg}"</p>
          <button onClick={() => router.push('/client/list')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] tracking-widest">RETOUR</button>
        </div>
      </div>
    );
  }

  const currentMult = getMultiplier();
  const remainingSafe = Math.max(0, 25 - mines - revealed.length);
  const remainingTiles = Math.max(1, 25 - revealed.length);
  const safeProbability = remainingSafe / remainingTiles;
  const riskPercent = Math.min(100, Math.round((mines / Math.max(1, 25 - revealed.length)) * 100));
  const riskLabel = riskPercent >= 45 ? 'Élevé' : riskPercent >= 25 ? 'Moyen' : 'Faible';
  const premiumIndices = useMemo(() => {
    const indices = Array.from({ length: 25 }, (_, i) => i);
    const baseCount = difficulty === 'facile' ? 4 : difficulty === 'intermédiaire' ? 6 : 8;
    return indices.filter((_, idx) => {
      const seed = (idx + combo + revealed.length + mines) % 7;
      return seed < Math.min(4, baseCount - 2);
    }).slice(0, baseCount);
  }, [combo, difficulty, mines, revealed.length]);

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
              className={`flex-1 rounded-xl py-3 text-[10px] transition-all ${difficulty === level ? 'bg-linear-to-r from-violet-500 to-fuchsia-500 text-black shadow-[0_0_20px_rgba(167,139,250,0.25)]' : 'text-slate-500'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Stats et Timer */}
        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in duration-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
              <p className="mb-1 flex items-center justify-center gap-1 text-[8px] text-slate-500"><TrendingUp size={10}/> COTE</p>
              <p className={`text-lg font-bold ${currentMult <= 1.0 ? 'text-emerald-300' : 'text-amber-300'}`}><AnimatedCounter value={Number(currentMult.toFixed(2))} suffix="X" accent={currentMult <= 1.0 ? 'emerald' : 'amber'} /></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
              <p className="mb-1 flex items-center justify-center gap-1 text-[8px] text-slate-500"><Zap size={10}/> GAIN</p>
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
                <span>Probabilité</span>
                <span className="text-violet-300">{Math.round(safeProbability * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(safeProbability * 100)}%` }} transition={{ duration: 0.35 }} className="h-full rounded-full bg-linear-to-r from-emerald-400 to-cyan-500" />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                <span>Combo x{combo}</span>
                <span>{remainingSafe} cases sûres restantes</span>
              </div>
            </div>
          </div>
        )}

        {/* Panneau de Jeu */}
        <div className="relative z-10 space-y-4 rounded-[2.5rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_0_45px_rgba(167,139,250,0.12)]">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 p-5">
            <Coins className="text-emerald-500" size={20} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-2xl text-emerald-500 font-bold placeholder-emerald-900 disabled:opacity-50"
            />
          </div>

          <ProgressBar value={Math.min(100, (revealed.length / 25) * 100)} max={100} label="Sécurité du terrain" accent="violet" />

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length < 1) || (status !== 'playing' && bet > jetonsCP)}
            className={`flex w-full flex-col items-center justify-center rounded-3xl py-6 text-2xl font-black shadow-lg transition-all active:scale-95 ${
              status === 'playing' 
              ? (revealed.length < 1 ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-linear-to-r from-amber-400 to-orange-500 text-black shadow-amber-500/20') 
              : 'bg-linear-to-r from-violet-500 to-fuchsia-500 text-black shadow-violet-500/20'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? (
              <>
                <span>ENCAISSER</span>
                {/* Indicateur Zone Danger */}
                {currentMult > 1.0 && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-1"><ShieldAlert size={10}/> ZONE DANGER</span>}
                {currentMult <= 1.0 && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-1"><Lock size={10}/> SÉCURISÉ</span>}
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
                    ? 'border-violet-400/50 bg-violet-500/10 shadow-[0_0_20px_rgba(167,139,250,0.18)] before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle,_rgba(255,255,255,0.18),_transparent_60%)]'
                    : 'border-white/10 bg-white/5 active:bg-white/10'
                  }`}
                >
                  {isPremium && !revealed.includes(i) && status === 'playing' && (
                    <span className="absolute left-1 top-1 rounded-full bg-amber-400/80 px-1.5 py-0.5 text-[8px] font-black text-black">PREM</span>
                  )}
                  {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8 animate-in zoom-in duration-300" />}
                  {status === 'ended' && isMine && <Bomb className="text-white w-8 h-8 animate-in bounce-in duration-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- ZONE PUBLICITÉ --- */}
        <div className="relative mt-6 flex min-h-25 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <p className="absolute top-2 right-4 text-[8px] text-slate-600 tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); setTimeLeft(20); }}
            className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold tracking-widest transition-all"
          >
            REJOUER
          </button>
        )}
      </div>
    </NeonGameShell>
  );
}

