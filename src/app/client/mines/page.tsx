"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp, ShieldAlert, Lock, Clock, ExternalLink, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ExoClickBanner from "@/components/ads/ExoClickBanner";
import MonetagAdScript from '@/components/ads/MonetagAdScript';
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// Helper haptique sécurisé pour mobile
const triggerHaptic = () => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([10, 25, 10]);
    } catch {
      // Ignorer si non supporté
    }
  }
};

type DifficultyLevel = 'facile' | 'intermédiaire' | 'difficile';

interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  type: 'spark' | 'explosion';
}

const MONETAG_REDIRECT_URL = "https://omg10.com/4/11431323";
const REQUIRED_AD_TIME_MS = 6000; // 6 secondes requises

export default function MinesElite() {
  const router = useRouter();

  // --- ÉTATS DU JEU ---
  const [bet, setBet] = useState<number>(100);
  const [jetonsCP, setJetonsCP] = useState<number>(0); 
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermédiaire');
  const [mines, setMines] = useState<number>(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [userId, setUserId] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [effects, setEffects] = useState<ParticleEffect[]>([]);

  // --- SECONDE CHANCE (PUBLICITÉ MONETAG) ---
  const [canUseSecondChance, setCanUseSecondChance] = useState<boolean>(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState<boolean>(false);
  const [adWaiting, setAdWaiting] = useState<boolean>(false);
  const [adError, setAdError] = useState<string | null>(null);

  // --- SYSTÈME & MAINTENANCE ---
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');
  const [checkingSystem, setCheckingSystem] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);

  // --- REFS CRITIQUES DE SÉCURITÉ ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Contrôle d'hydratation
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Synchronisation du nombre de mines selon la difficulté
  useEffect(() => {
    const counts: Record<DifficultyLevel, number> = { facile: 5, intermédiaire: 8, difficile: 11 };
    setMines(counts[difficulty]);
  }, [difficulty]);

  // Timer du jeu
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      handleGameOver(true);
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // Initialisation et vérifications d'authentification
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

        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('jetons_cp')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileErr) console.warn('Erreur chargement profil:', profileErr.message);
        if (active && profileData) {
          setJetonsCP(profileData.jetons_cp ?? 0);
        }

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

      } catch (err: unknown) {
        if (active) {
          const error = err as Error;
          console.error('Erreur init Mines:', error);
          setInitError(error?.message || 'Erreur lors de la connexion au service.');
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

  // VÉRIFICATION DU TEMPS SUR LA PUB APRES RETOUR SUR L'ONGLET
  useEffect(() => {
    const handleFocusOrVisibility = () => {
      if (!adWaiting || isProcessingRef.current) return;

      const clickTimeStr = localStorage.getItem('monetag_click_time');
      if (!clickTimeStr) return;

      const clickTime = parseInt(clickTimeStr, 10);
      const now = Date.now();
      const elapsed = now - clickTime;

      // Nettoyage immédiat pour éviter toute réutilisation malveillante
      localStorage.removeItem('monetag_click_time');
      setAdWaiting(false);

      if (elapsed >= REQUIRED_AD_TIME_MS) {
        // Validation et relance directe au Niveau 1
        applySecondChance();
      } else {
        const remainingSec = Math.ceil((REQUIRED_AD_TIME_MS - elapsed) / 1000);
        setAdError(`Vous devez rester au moins 6 secondes sur l'annonce. (Manquait ${remainingSec}s)`);
        setTimeout(() => setAdError(null), 5000);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, [adWaiting]);

  const getMultiplier = (revealedCount = revealed.length): number => {
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
    const x = col * 20 + 10;
    const y = row * 20 + 10;
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
      setSecondChanceUsed(false);
      setCanUseSecondChance(false);
      setStatus('playing');

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Start game error:', error);
      setInitError(error?.message || 'Impossible de démarrer la partie.');
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

    // Seconde chance éligible en cas d'échec si non encore utilisée dans la session
    const isEligibleForSecondChance = isBombHit && !secondChanceUsed;

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
    setCanUseSecondChance(isEligibleForSecondChance);

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

  // OUVERTURE DU LIEN SPONSORISÉ
  const handleOpenAdForSecondChance = () => {
    if (isProcessingRef.current || !canUseSecondChance) return;

    const requiredFee = Math.floor(lockedBetRef.current * 0.5);
    if (jetonsCP < requiredFee) {
      setAdError(`Solde insuffisant : ${requiredFee} CP requis (50% de la mise).`);
      setTimeout(() => setAdError(null), 4000);
      return;
    }

    localStorage.setItem('monetag_click_time', Date.now().toString());
    setAdWaiting(true);
    window.open(MONETAG_REDIRECT_URL, '_blank');
  };

  // APPLICATION DU RESTART NIVEAU 1 AVEC DÉDUCTIONS (50%)
  const applySecondChance = async () => {
    if (!userId || !gameId || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setLoading(true);

    const extraFee = Math.floor(lockedBetRef.current * 0.5);

    try {
      // 1. Déduction sécurisée via Supabase RPC
      const { data: ok, error } = await supabase.rpc('jouer_partie_cp', { 
        p_user_id: userId,
        p_mise_cp: extraFee,
        p_gain_cp: 0,
        p_jeu_nom: 'Mines Seconde Chance'
      });

      if (error || !ok?.success) {
        throw new Error('Transaction refusée : solde CP insuffisant.');
      }

      // 2. Mise à jour du solde local et réévaluation de la mise attribuée
      setJetonsCP(prev => prev - extraFee);
      lockedBetRef.current = extraFee; // La nouvelle mise devient les 50%
      setBet(extraFee);

      // 3. Génération d'une nouvelle grille de mines
      const newMinePositions = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);

      // 4. Synchronisation base de données
      await supabase
        .from('mines_games')
        .update({ 
          is_active: true,
          bet_amount: extraFee,
          mine_positions: newMinePositions,
          status: 'playing'
        })
        .eq('id', gameId);

      // 5. Réinitialisation complète vers le Niveau 1 (Partie active immédiate)
      setMinePositions(newMinePositions);
      setRevealed([]); // Retour case départ (0 case découverte = Niveau 1)
      setCombo(0);
      setEffects([]);
      setTimeLeft(20);
      setSecondChanceUsed(true);
      setCanUseSecondChance(false);
      setStatus('playing');

    } catch (err: unknown) {
      const error = err as Error;
      setAdError(error?.message || 'Échec de l\'activation de la seconde chance.');
      setTimeout(() => setAdError(null), 4000);
      setStatus('ended');
    } font-bold {
      setLoading(false);
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
      <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
        <Loader2 className="text-violet-500 animate-spin" size={36} />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-4 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="relative z-10 bg-[#0a0a0f] border border-red-500/20 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full">
          <ShieldAlert size={36} className="mx-auto text-red-500 mb-3" />
          <h1 className="text-xl sm:text-2xl text-red-500 mb-2">ERREUR SYSTÈME</h1>
          <p className="text-[10px] sm:text-xs text-slate-400 mb-6 italic">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] tracking-widest text-white hover:bg-white/10 transition-colors">
            RÉESSAYER
          </button>
        </div>
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-4 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="relative z-10 bg-[#0a0a0f] border border-amber-500/20 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full">
          <ShieldAlert size={36} className="mx-auto text-amber-500 mb-3" />
          <h1 className="text-xl sm:text-2xl text-amber-500 mb-2">MAINTENANCE</h1>
          <p className="text-[10px] sm:text-xs text-slate-400 mb-6 italic">{maintenanceMsg}</p>
          <button onClick={() => router.push('/client/list')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] tracking-widest text-white hover:bg-white/10 transition-colors">
            RETOUR
          </button>
        </div>
      </div>
    );
  }

  return (
    <NeonGameShell accent="violet" className="min-h-screen px-3 sm:px-4 py-3 font-black italic uppercase flex flex-col items-center select-none pb-16">
      
      {/* SCRIPT MONETAG */}
      <MonetagAdScript zoneId="11431323" />

      {/* BARRE SUPÉRIEURE */}
      <div className="mb-4 flex w-full max-w-md items-center justify-between gap-2">
        <button 
          onClick={() => router.push('/client/list')} 
          className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5 text-violet-200 shadow-[0_0_15px_rgba(167,139,250,0.15)] active:scale-95 transition-transform"
          aria-label="Retour"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 backdrop-blur-md">
          <Coins size={14} className="text-violet-300" />
          <span className="text-xs sm:text-sm font-black tracking-tighter text-violet-200">
            {Math.floor(jetonsCP).toLocaleString()} CP
          </span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3.5">
        
        {/* NIVEAU DE DIFFICULTÉ */}
        <div className="flex gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
          {(['facile', 'intermédiaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`flex-1 rounded-lg py-2 text-[9px] sm:text-[10px] transition-all ${
                difficulty === level 
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-black shadow-[0_0_15px_rgba(167,139,250,0.25)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* HUD - TABLEAU DE BORD DU NIVEAU ACTIF */}
        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in duration-200">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-xl">
              <p className="mb-0.5 flex items-center justify-center gap-1 text-[7px] sm:text-[8px] text-slate-400">
                <TrendingUp size={9}/> MULTIPLICATEUR (NIV. {revealed.length + 1})
              </p>
              <p className={`text-sm sm:text-base font-bold ${currentMult <= 1.0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                <AnimatedCounter value={Number(currentMult.toFixed(2))} suffix="X" accent={currentMult <= 1.0 ? 'emerald' : 'amber'} />
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-xl">
              <p className="mb-0.5 flex items-center justify-center gap-1 text-[7px] sm:text-[8px] text-slate-400">
                <Zap size={9}/> GAIN POTENTIEL
              </p>
              <p className="text-sm sm:text-base font-bold text-white">
                <AnimatedCounter value={Math.floor(lockedBetRef.current * currentMult)} />
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center backdrop-blur-xl">
              <p className="mb-0.5 flex items-center justify-center gap-1 text-[7px] sm:text-[8px] text-slate-400">
                <ShieldAlert size={9}/> RISQUE
              </p>
              <p className={`text-xs sm:text-sm font-bold ${riskLabel === 'Élevé' ? 'text-rose-400' : riskLabel === 'Moyen' ? 'text-amber-300' : 'text-emerald-300'}`}>
                {riskLabel} · {riskPercent}%
              </p>
            </div>

            <div className={`rounded-xl border p-2.5 text-center transition-all ${timeLeft <= 5 ? 'animate-pulse border-rose-500 bg-rose-500/20' : 'border-white/10 bg-white/5'}`}>
              <p className="text-[7px] sm:text-[8px] text-slate-400 mb-0.5 flex items-center justify-center gap-1">
                <Clock size={9}/> TEMPS
              </p>
              <p className={`text-xs sm:text-sm font-bold ${timeLeft <= 5 ? 'text-rose-500' : 'text-white'}`}>{timeLeft}S</p>
            </div>

            <div className="col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center backdrop-blur-xl">
              <div className="mb-1 flex items-center justify-between text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400">
                <span>Sécurité</span>
                <span className="text-violet-300">{Math.round(safeProbability * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full border border-white/10 bg-white/10">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${Math.round(safeProbability * 100)}%` }} 
                  transition={{ duration: 0.35 }} 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500" 
                />
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION ERREUR PUB */}
        {adError && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-center text-red-300 text-xs font-bold animate-in fade-in">
            {adError}
          </div>
        )}

        {/* MISE / ACTION */}
        <div className="relative z-10 space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_0_30px_rgba(167,139,250,0.1)]">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
            <Coins className="text-emerald-500" size={18} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Math.max(10, Number(e.target.value)))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-lg sm:text-xl text-emerald-500 font-bold placeholder-emerald-900 disabled:opacity-50"
            />
          </div>

          <ProgressBar value={Math.min(100, (revealed.length / 25) * 100)} max={100} label="Progression" accent="violet" />

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length < 1) || (status !== 'playing' && bet > jetonsCP)}
            className={`flex w-full flex-col items-center justify-center rounded-2xl py-3.5 sm:py-4 text-lg sm:text-xl font-black shadow-lg transition-all active:scale-95 ${
              status === 'playing' 
              ? (revealed.length < 1 ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-amber-500/20') 
              : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-black shadow-violet-500/20'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={22} /> : status === 'playing' ? (
              <>
                <span>ENCAISSER</span>
                {currentMult > 1.0 ? (
                  <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-0.5">
                    <ShieldAlert size={9}/> DANGER
                  </span>
                ) : (
                  <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-0.5">
                    <Lock size={9}/> SÉCURISÉ
                  </span>
                )}
              </>
            ) : (bet > jetonsCP ? "SOLDE INSUFFISANT" : "JOUER")}
          </button>
        </div>

        {/* GRILLE DU JEU 5x5 */}
        <div className="relative w-full aspect-square">
          <AnimatePresence>
            {effects.map(effect => (
              <motion.div
                key={effect.id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.25, 1.4], y: [0, -6, 12] }}
                exit={{ opacity: 0, scale: 0.2 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
              >
                {effect.type === 'explosion' ? (
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-rose-400/70" />
                    <div className="absolute h-5 w-5 rounded-full bg-rose-500/40 blur-xl" />
                    <div className="absolute h-3 w-3 rounded-full bg-amber-300/80" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20 text-base text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.35)]">✦</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 h-full w-full">
            {Array.from({ length: 25 }).map((_, i) => {
              const isPremium = premiumIndices.includes(i);
              const isMine = minePositions.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => clickTile(i)}
                  disabled={status !== 'playing' || isProcessingRef.current}
                  className={`relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl border transition-all flex items-center justify-center ${
                    revealed.includes(i) 
                    ? 'border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                    : status === 'ended' && isMine
                    ? 'z-20 scale-105 border-rose-400 bg-rose-600 shadow-md shadow-rose-500/50'
                    : isPremium
                    ? 'border-violet-400/50 bg-violet-500/10 shadow-[0_0_15px_rgba(167,139,250,0.18)]'
                    : 'border-white/10 bg-white/5 active:bg-white/10'
                  }`}
                >
                  {isPremium && !revealed.includes(i) && status === 'playing' && (
                    <span className="absolute left-0.5 top-0.5 sm:left-1 sm:top-1 rounded-full bg-amber-400/80 px-1 py-0.2 text-[6px] sm:text-[7px] font-black text-black">
                      PREM
                    </span>
                  )}
                  {revealed.includes(i) && (
                    <Gem className="text-emerald-400 w-5 h-5 sm:w-7 sm:h-7 animate-in zoom-in duration-300" />
                  )}
                  {status === 'ended' && isMine && (
                    <Bomb className="text-white w-5 h-5 sm:w-7 sm:h-7 animate-in bounce-in duration-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* BANNIÈRE SPONSOR */}
        <div className="relative mt-4 flex min-h-[90px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black/20">
            <p className="absolute top-1.5 right-3 text-[7px] text-slate-600 tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {/* SECONDE CHANCE ET REJOINDRE */}
        {status === 'ended' && (
          <div className="space-y-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {canUseSecondChance && (
              <button 
                onClick={handleOpenAdForSecondChance}
                disabled={adWaiting || loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black border border-amber-300/30 rounded-xl text-xs font-black tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 active:scale-95"
              >
                {adWaiting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>EN ATTENTE DE VALIDATION (6s)...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>SECONDE CHANCE : REVENIR AU NIV. 1 (-50% MISE)</span>
                    <ExternalLink size={14} className="ml-1 opacity-75" />
                  </>
                )}
              </button>
            )}

            <button 
              onClick={() => { setStatus('idle'); setRevealed([]); setTimeLeft(20); setCanUseSecondChance(false); }}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold tracking-widest transition-all text-white active:scale-95"
            >
              REJOUER (MENU PRINCIPAL)
            </button>
          </div>
        )}
      </div>
    </NeonGameShell>
  );
}
