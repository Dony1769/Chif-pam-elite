"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Fingerprint, 
  ShieldCheck, 
  ShieldX, 
  ChevronLeft, 
  Loader2, 
  Coins, 
  Zap, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- TYPAGES TYPESCRIPT STRICTS ---
interface UserProfile {
  id: string;
  jetons_cp: number;
}

interface GameSettings {
  is_active: boolean;
  maintenance_msg: string | null;
}

interface BiometricGameRecord {
  id: string;
  user_id: string;
  mise_cp: number;
  is_active: boolean;
  gain_cp?: number;
}

type GameStatus = 
  | 'idle' 
  | 'showing' 
  | 'input' 
  | 'lost' 
  | 'won' 
  | 'loading' 
  | 'maintenance';

// --- GESTIONNAIRE AUDIO OPTIMISÉ ---
class SoundController {
  private static audioCtx: AudioContext | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public static play(type: 'click' | 'success' | 'fail' | 'cashout' | 'scan') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case 'scan':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(500, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;

        case 'success':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'fail':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.3);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'cashout':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
      }
    } catch {
      // Ignorer si l'audio est bloqué par le navigateur
    }
  }
}

const triggerHapticFeedback = (pattern: number | number[] = [10, 30, 10]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration non supportée
    }
  }
};

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- ÉTATS COMPOSANT ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>("Protocole de sécurité en cours...");
  
  const [betCP, setBetCP] = useState<number>(100);
  const [multiplier, setMultiplier] = useState<number>(0.5);
  const [gridSize, setGridSize] = useState<number>(5); // Difficulté : Démarrage direct sur grille 5x5
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  
  // Temps d'affichage réduit à 650ms au lieu de 1000ms
  const [displayTime, setDisplayTime] = useState<number>(650); 
  // Temps de saisie réduit à 5 secondes au lieu de 10 secondes
  const [sessionTimer, setSessionTimer] = useState<number>(5); 
  const [sessionsSolved, setSessionsSolved] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [shakeGrid, setShakeGrid] = useState<boolean>(false);

  // --- REFS POUR ACCÈS ATOMIQUE ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null, sessionsSolved: 0 });

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId, sessionsSolved };
  }, [multiplier, gameId, sessionsSolved]);

  // VÉRIFICATION MAINTENANCE ET CHARGEMENT DU PROFIL
  const checkAccess = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('game_settings')
        .select('is_active, maintenance_msg')
        .eq('game_id', 'biometric')
        .maybeSingle<GameSettings>();

      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg || "Serveurs en maintenance.");
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
        if (challengeId && challengeFee) {
          const parsedFee = Math.max(25, Math.floor(Number(challengeFee)));
          setBetCP(isNaN(parsedFee) ? 100 : parsedFee);
        }
      }
    } catch {
      setStatus('idle'); 
    }
  }, [challengeId, challengeFee]);

  const init = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, jetons_cp')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setProfile(data as UserProfile);
        }
      }
      await checkAccess();
    } catch (err) {
      console.error("Échec d'initialisation du profil :", err);
    }
  }, [checkAccess]);

  useEffect(() => { 
    void init(); 
  }, [init]);

  // --- GÉNÉRATION DES MOTIFS (DIFFICULTÉ ACCRUE) ---
  const generatePattern = useCallback((size: number) => {
    const cells = size * size;
    // Nombre de cases dans la séquence augmenté : taille + 2
    const count = Math.min(size + 2, cells); 
    const newPattern: number[] = [];
    
    while (newPattern.length < count) {
      const r = Math.floor(Math.random() * cells);
      if (!newPattern.includes(r)) newPattern.push(r);
    }
    
    setPattern(newPattern);
    setUserPattern([]);
    setSessionTimer(5); // Timer strict de 5 secondes
    setStatus('showing');
    SoundController.play('scan');
  }, []);

  // --- ÉCHEC DE PARTIE ---
  const handleFailure = useCallback(() => {
    if (isProcessingRef.current) return;
    triggerHapticFeedback([100, 50, 100]);
    SoundController.play('fail');
    setShakeGrid(true);
    setTimeout(() => setShakeGrid(false), 500);

    setCombo(1);
    setStatus('lost');
  }, []);

  // --- GESTION DES TIMERS ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    if (status === 'showing') {
      timeoutId = setTimeout(() => {
        setStatus('input');
      }, displayTime);
    }

    if (status === 'input') {
      intervalId = setInterval(() => {
        setSessionTimer((prev) => {
          if (prev <= 1) { 
            clearInterval(intervalId);
            handleFailure(); 
            return 0; 
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, displayTime, handleFailure]);

  // --- DÉMARRAGE D'UNE NOUVELLE PARTIE ---
  const startGame = async () => {
    if (!profile || loading || isProcessingRef.current) return;
    
    const finalFee = challengeId ? Math.floor(Number(challengeFee)) : Math.floor(betCP);
    
    if (isNaN(finalFee) || finalFee < 25) { 
      alert("Mise minimum valide : 25 CP"); 
      return; 
    }
    
    if (profile.jetons_cp < finalFee) {
      alert("Solde de CP insuffisant pour démarrer.");
      return;
    }

    triggerHapticFeedback([20, 50, 20]);
    setLoading(true);
    isProcessingRef.current = true;

    try {
      lockedBetRef.current = finalFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id, 
        p_mise_cp: finalFee, 
        p_gain_cp: 0, 
        p_jeu_nom: 'Biometric Start'
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.message || "Erreur lors du prélèvement des CP.");
      }

      const { data: game, error: gameErr } = await supabase
        .from('biometric_games')
        .insert([{ user_id: profile.id, mise_cp: finalFee, is_active: true }])
        .select()
        .single<BiometricGameRecord>();

      if (gameErr || !game) throw gameErr || new Error("Erreur de création de session.");

      setGameId(game.id);
      setMultiplier(0.5);
      setGridSize(5); // Démarrage en 5x5
      setSessionsSolved(0);
      setCombo(1);
      setDisplayTime(650); // Temps d'affichage initial rapide (650ms)
      
      isProcessingRef.current = false;
      generatePattern(5);
    } catch (e: unknown) { 
      const err = e as Error;
      alert(err.message || "Erreur de communication avec le serveur."); 
      isProcessingRef.current = false;
    } finally { 
      setLoading(false); 
    }
  };

  // --- CLIC SUR LES CASES DE LA GRILLE ---
  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx) || isProcessingRef.current) return;
    
    triggerHapticFeedback(15);
    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    if (!pattern.includes(idx)) { 
      handleFailure(); 
      return; 
    }
    
    SoundController.play('click');
    setCombo((prev) => prev + 1);

    if (nextUserPattern.length === pattern.length) {
      SoundController.play('success');
      const nextSolved = sessionsSolved + 1;
      setSessionsSolved(nextSolved);
      setMultiplier((prev) => parseFloat((prev + 0.15).toFixed(2)));
      
      // Passage à une grille 7x7 dès la 2ème victoire
      let nextGrid = gridSize;
      if (nextSolved >= 2 && gridSize === 5) nextGrid = 7;
      setGridSize(nextGrid);
      
      // Réduction plus rapide du temps d'affichage
      setDisplayTime((prev) => Math.max(200, prev - 80));
      setTimeout(() => generatePattern(nextGrid), 350);
    }
  };

  // --- FINALISATION ET CASH-OUT ---
  const finalizeGame = async (allowPartialRescue: boolean = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentActiveGameId = gameStateRef.current.gameId;
    if (!currentActiveGameId || !profile) {
      isProcessingRef.current = false;
      return;
    }

    setLoading(true);
    
    const secureBet = lockedBetRef.current;
    const currentMult = gameStateRef.current.multiplier;
    const currentSolved = gameStateRef.current.sessionsSolved;
    
    let gainFinal = 0;

    const economy = resolveGameEconomy({
      gameId: 'biometric',
      bet: secureBet,
      multiplier: currentMult,
      difficulty: 'difficile',
      currentStep: currentSolved,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });

    if (!allowPartialRescue && currentMult >= 1.0) {
      gainFinal = economy.payout;
    } else if (allowPartialRescue) {
      gainFinal = Math.floor(secureBet * currentMult);
    } else {
      gainFinal = 0;
    }

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
          p_user_id: profile.id, 
          p_challenge_id: challengeId, 
          p_score: currentSolved * 10
        });
      } else if (gainFinal > 0) {
        await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, 
          p_mise_cp: 0, 
          p_gain_cp: gainFinal, 
          p_jeu_nom: 'Biometric Cashout'
        });
      }

      await supabase
        .from('biometric_games')
        .update({ is_active: false, gain_cp: gainFinal })
        .eq('id', currentActiveGameId);
      
      if (gainFinal > 0) SoundController.play('cashout');
      setStatus(gainFinal > 0 || (challengeId && currentSolved > 0) ? 'won' : 'lost');
    } catch (e) { 
      console.error("Erreur lors de la finalisation :", e); 
    } finally { 
      setLoading(false); 
      isProcessingRef.current = false;
      await init(); 
    }
  };

  const adjustBet = (amount: number | 'max' | 'double') => {
    triggerHapticFeedback(10);
    if (!profile) return;
    const currentBalance = profile.jetons_cp || 25;

    if (amount === 'max') {
      setBetCP(Math.max(25, currentBalance));
    } else if (amount === 'double') {
      setBetCP((prev) => Math.min(currentBalance, Math.max(25, prev * 2)));
    } else {
      setBetCP((prev) => Math.min(currentBalance, Math.max(25, prev + amount)));
    }
  };

  const difficultyLabel = gridSize <= 5 ? 'HARD-SCAN-01' : 'BIOLOCK-EXTREME';
  const progressionStage = Math.min(3, Math.floor(sessionsSolved / 2) + 1);
  const currentCalculatedGain = Math.floor(lockedBetRef.current * multiplier);

  if (status === 'maintenance') {
    return (
      <NeonGameShell accent="amber" className="h-screen">
        <div className="flex h-screen items-center justify-center p-8 text-center text-amber-500 font-black uppercase italic tracking-wider flex-col gap-4">
          <AlertTriangle size={64} className="animate-bounce text-amber-400" />
          <p className="text-xl">{maintenanceMsg}</p>
        </div>
      </NeonGameShell>
    );
  }

  return (
    <NeonGameShell accent="emerald" className="h-screen font-sans select-none">
      
      {/* EN-TÊTE UX / SOLDE */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl z-50">
        <button 
          onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} 
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-2.5 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-90 transition-transform"
        >
          <ChevronLeft size={22}/>
        </button>
        <div className="flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-950/40 px-5 py-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Coins size={18} className="text-emerald-400 animate-pulse" />
          <span className="text-sm font-bold tracking-wide text-emerald-200">
            {profile?.jetons_cp?.toLocaleString() || 0} <span className="text-xs text-emerald-400">CP</span>
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center p-4 md:p-6">
        {status === 'idle' || status === 'loading' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-slate-950/80 p-6 md:p-8 text-center shadow-[0_0_60px_rgba(16,185,129,0.15)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_60%)]" />
            
            {status === 'loading' ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-emerald-400" size={56} />
                <p className="text-xs uppercase tracking-widest text-emerald-400/70">Chargement du protocole...</p>
              </div>
            ) : (
              <>
                <div className="relative mb-6 flex justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }} 
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/10 p-5 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                  >
                    <Fingerprint className="text-emerald-400 drop-shadow-[0_0_15px_#10b981]" size={64} />
                  </motion.div>
                </div>

                <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-black/40 p-3 shadow-inner">
                  <p className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">MODE EXPERT - SCAN RAPIDE</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 mt-1">Grille 5x5 • Minuteur 5s • Zéro Seconde Chance</p>
                </div>

                <div className="mb-6 rounded-3xl border border-white/10 bg-black/60 p-4 shadow-inner">
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                    {challengeId ? 'FRAIS DE MISSION' : 'VOTRE MISE CP (MIN. 25)'}
                  </p>
                  <input 
                    type="number" 
                    disabled={!!challengeId} 
                    value={betCP} 
                    onChange={(e) => setBetCP(Math.max(25, Math.floor(Number(e.target.value) || 0)))} 
                    className="w-full bg-transparent text-center text-4xl font-black tracking-tighter text-white outline-none focus:text-emerald-400" 
                  />

                  {!challengeId && (
                    <div className="mt-3 grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
                      <button onClick={() => adjustBet(-50)} className="rounded-xl border border-white/10 bg-white/5 py-1.5 text-[10px] font-bold text-slate-300 active:bg-white/10">-50</button>
                      <button onClick={() => adjustBet(50)} className="rounded-xl border border-white/10 bg-white/5 py-1.5 text-[10px] font-bold text-slate-300 active:bg-white/10">+50</button>
                      <button onClick={() => adjustBet('double')} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[10px] font-bold text-emerald-300 active:bg-emerald-500/20">x2</button>
                      <button onClick={() => adjustBet('max')} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-1.5 text-[10px] font-bold text-cyan-300 active:bg-cyan-500/20">MAX</button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={startGame} 
                  disabled={loading} 
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-4 font-black text-lg text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> LANCER LE DEFI</>}
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            
            <div className="mb-4 grid w-full grid-cols-4 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Timer</p>
                <p className={`text-lg font-black ${sessionTimer <= 2 ? 'animate-pulse text-rose-400' : 'text-emerald-300'}`}>
                  {sessionTimer}s
                </p>
              </div>

              <div className={`rounded-2xl border p-2.5 text-center transition-all ${multiplier >= 1.0 ? 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
                <p className={`text-[8px] font-bold uppercase ${multiplier >= 1.0 ? 'text-rose-300' : 'text-emerald-300'}`}>Multi</p>
                <div className="text-lg font-black text-white">
                  <AnimatedCounter value={multiplier} prefix="x" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Score</p>
                <div className="text-lg font-black text-cyan-300">
                  <AnimatedCounter value={sessionsSolved} />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-cyan-300">Combo</p>
                <div className="text-lg font-black text-cyan-200">x{combo}</div>
              </div>
            </div>

            <div className="w-full mb-3 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                initial={{ width: '100%' }}
                animate={{ width: status === 'input' ? `${(sessionTimer / 5) * 100}%` : '100%' }}
                transition={{ duration: status === 'input' ? 1 : 0.2, ease: 'linear' }}
              />
            </div>

            <div className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-emerald-300/80 backdrop-blur-xl">
              <span>PROTOCOLE : {difficultyLabel}</span>
              <span>STAGE : {progressionStage}</span>
              <span>GRILLE : {gridSize}x{gridSize}</span>
            </div>

            <div className="mb-6 w-full">
              <ProgressBar value={Math.min(100, (sessionsSolved / 5) * 100)} max={100} label="Séquence Éditée" accent="emerald" />
            </div>

            <motion.div 
              animate={shakeGrid ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="relative rounded-[2.5rem] border border-cyan-400/20 bg-black/60 p-4 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
            >
              <motion.div 
                animate={{ y: [0, 240, 0] }} 
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }} 
                className="pointer-events-none absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee]" 
              />
              
              <div 
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(85vw, 320px)', height: 'min(85vw, 320px)' }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                  const isPatternCell = pattern.includes(i);
                  const isUserSelected = userPattern.includes(i);
                  const isShowing = status === 'showing' && isPatternCell;

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleCellClick(i)}
                      className={`rounded-lg border-2 transition-all duration-150 ${
                        isShowing
                          ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_20px_#10b981]' 
                          : isUserSelected
                          ? 'border-cyan-400 bg-cyan-500/40 shadow-[0_0_10px_#22d3ee]'
                          : 'border-white/10 bg-white/5 active:bg-emerald-500/20'
                      }`}
                    />
                  );
                })}
              </div>
            </motion.div>

            {multiplier >= 1.0 && (
              <motion.button 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                onClick={() => finalizeGame(false)}
                disabled={loading}
                className="w-full mt-6 py-4 font-black rounded-2xl text-lg bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} fill="black" /> ENCAISSER {Math.floor(lockedBetRef.current * multiplier)} CP</>}
              </motion.button>
            )}
            
            {multiplier < 1.0 && !challengeId && (
              <p className="mt-4 text-[9px] text-emerald-400/60 tracking-[0.2em] font-bold uppercase animate-pulse">
                Valeur de sécurité : {currentCalculatedGain} CP
              </p>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE RÉSULTAT */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 ${status === 'lost' ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
              {status === 'lost' ? <ShieldX size={40} className="text-rose-500" /> : <ShieldCheck size={40} className="text-emerald-400" />}
            </div>
            
            <h2 className="text-3xl font-black italic mb-1 tracking-tight uppercase text-white">
              {status === 'lost' ? 'ÉCHEC DE L\'ANALYSE' : 'SCAN RÉUSSI'}
            </h2>
            
            <div className="bg-white/5 p-5 rounded-3xl w-full max-w-xs my-4 border border-white/10 shadow-inner">
              <p className="text-[10px] text-zinc-400 mb-1 font-bold tracking-widest uppercase">Gains Obtenus</p>
              <p className="text-4xl font-black italic tracking-tighter text-white">
                {status === 'won' ? Math.floor(lockedBetRef.current * multiplier) : 0} 
                <span className="text-sm text-emerald-400 ml-1 font-bold">CP</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              {status === 'lost' && currentCalculatedGain > 0 && (
                <button 
                  onClick={() => finalizeGame(true)} 
                  className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                >
                  RÉCUPÉRER MES {currentCalculatedGain} CP & QUITTER
                </button>
              )}

              <button 
                onClick={() => setStatus('idle')} 
                className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-base active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                NOUVELLE TENTATIVE
              </button>

              <button 
                onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} 
                className="w-full py-3 text-zinc-400 hover:text-white rounded-2xl font-bold text-xs active:scale-95 transition-all"
              >
                QUITTER LE JEU
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

export default function BiometricHack() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-400" size={48}/></div>}>
      <BiometricGameContent />
    </Suspense>
  );
}
