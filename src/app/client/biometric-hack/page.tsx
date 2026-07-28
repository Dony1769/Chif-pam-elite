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
  HeartPulse, 
  Zap, 
  Sparkles,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { getGameEconomySettings, resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- TYPAGES TYPESCRIPT STRICTS ---
interface UserProfile {
  id: string;
  jetons_cp: number;
  [key: string]: unknown;
}

interface GameSettings {
  is_active: boolean;
  maintenance_msg: string;
}

interface BiometricGameRecord {
  id: string;
  user_id: string;
  mise_cp: number;
  is_active: boolean;
  gain_cp?: number;
}

type GameStatus = 'idle' | 'showing' | 'input' | 'lost' | 'won' | 'loading' | 'maintenance' | 'awaiting_ad_return';

const MONETAG_AD_URL = "https://omg10.com/4/11431323";
const REQUIRED_AD_TIME_MS = 6000; // 6 secondes

// --- SYSTÈME AUDIO ÉVOLUÉ (Web Audio API) ---
const playAdvancedSound = (type: 'click' | 'success' | 'fail' | 'cashout' | 'scan') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    // Ignorer si bloqué par le navigateur
  }
};

const triggerHapticFeedback = (pattern: number | number[] = [10, 30, 10]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- ÉTATS ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>("Protocole de sécurité en cours...");
  
  const [betCP, setBetCP] = useState<number>(100);
  const [multiplier, setMultiplier] = useState<number>(0.5);
  const [gridSize, setGridSize] = useState<number>(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState<number>(1000); 
  const [sessionTimer, setSessionTimer] = useState<number>(10);
  const [sessionsSolved, setSessionsSolved] = useState<number>(0);
  const [canRevive, setCanRevive] = useState<boolean>(true);
  const [combo, setCombo] = useState<number>(1);
  const [shakeGrid, setShakeGrid] = useState<boolean>(false);
  const [adErrorMsg, setAdErrorMsg] = useState<string | null>(null);

  // REFS
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null });

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId };
  }, [multiplier, gameId]);

  const checkAccess = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('game_settings')
        .select('is_active, maintenance_msg')
        .eq('game_id', 'biometric')
        .single<GameSettings>();

      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg || "Serveurs en maintenance.");
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
        if (challengeId && challengeFee) setBetCP(Number(challengeFee));
      }
    } catch {
      setStatus('idle'); 
    }
  }, [challengeId, challengeFee]);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data as UserProfile);
    }
    await checkAccess();
  }, [checkAccess]);

  useEffect(() => { 
    init(); 
  }, [init]);

  // --- VÉRIFICATION DU RETOUR APPRÈS CLIC SUR LA PUB ---
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && status === 'awaiting_ad_return') {
        const adStartTime = localStorage.getItem('biometric_ad_start_time');
        if (!adStartTime) {
          setStatus('lost');
          return;
        }

        const elapsedTime = Date.now() - parseInt(adStartTime, 10);
        localStorage.removeItem('biometric_ad_start_time');

        if (elapsedTime >= REQUIRED_AD_TIME_MS) {
          // Temps respecté (>= 6s) -> Déduction de 50% de la mise
          const penaltyFee = Math.floor(lockedBetRef.current * 0.5);
          
          if (profile && profile.jetons_cp < penaltyFee) {
            setAdErrorMsg("Solde insuffisant pour la relance (50% de la mise requis).");
            setStatus('lost');
            return;
          }

          setLoading(true);
          try {
            const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
              p_user_id: profile?.id, 
              p_mise_cp: penaltyFee, 
              p_gain_cp: 0, 
              p_jeu_nom: 'Biometric Revive Fee'
            });

            if (rpcError || !result?.success) {
              throw new Error("Erreur de déduction pour la seconde chance.");
            }

            setCanRevive(false);
            setCombo(1);
            setAdErrorMsg(null);
            isProcessingRef.current = false;
            setStatus('showing');
            generatePattern(gridSize);
            playAdvancedSound('scan');
            await init();
          } catch (e: unknown) {
            const err = e as Error;
            setAdErrorMsg(err.message || "Échec de l'activation de la seconde chance.");
            setStatus('lost');
          } finally {
            setLoading(false);
          }
        } else {
          const remainingSec = Math.ceil((REQUIRED_AD_TIME_MS - elapsedTime) / 1000);
          setAdErrorMsg(`Temps insuffisant sur le lien pub (${remainingSec}s manquantes). Seconde chance annulée.`);
          setStatus('lost');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, profile, gridSize, init]);

  // --- GENERATION DES MOTIFS ---
  const generatePattern = useCallback((size: number) => {
    const cells = size * size;
    const count = size + 1; 
    const newPattern: number[] = [];
    while (newPattern.length < count) {
      const r = Math.floor(Math.random() * cells);
      if (!newPattern.includes(r)) newPattern.push(r);
    }
    setPattern(newPattern);
    setUserPattern([]);
    setSessionTimer(10);
    setStatus('showing');
    playAdvancedSound('scan');
  }, []);
  
  // --- TIMERS DE PHASE ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    if (status === 'showing') {
      timeoutId = setTimeout(() => setStatus('input'), displayTime);
    }

    if (status === 'input') {
      intervalId = setInterval(() => {
        setSessionTimer(prev => {
          if (prev <= 1) { 
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
  }, [status, displayTime]);

  // --- DÉMARRAGE DU JEU ---
  const startGame = async () => {
    if (!profile || loading) return;
    if (betCP < 10 && !challengeId) { 
      alert("Mise minimum : 10 CP"); 
      return; 
    }
    
    triggerHapticFeedback([20, 50, 20]);
    setLoading(true);
    setAdErrorMsg(null);
    isProcessingRef.current = false;

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      lockedBetRef.current = finalFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id, 
        p_mise_cp: finalFee, 
        p_gain_cp: 0, 
        p_jeu_nom: 'Biometric Start'
      });

      if (rpcError || !result?.success) throw new Error(result?.message || "Solde de CP insuffisant.");

      const { data: game, error: gameErr } = await supabase
        .from('biometric_games')
        .insert([{ user_id: profile.id, mise_cp: finalFee, is_active: true }])
        .select()
        .single<BiometricGameRecord>();

      if (gameErr) throw gameErr;

      const economySettings = getGameEconomySettings('biometric', 'intermédiaire').profile;
      setGameId(game.id);
      setMultiplier(0.5);
      setGridSize(economySettings.gridSize ?? 3);
      setSessionsSolved(0);
      setCanRevive(true);
      setCombo(1);
      setDisplayTime(economySettings.displayTime ?? 1000);
      generatePattern(economySettings.gridSize ?? 3);
    } catch (e: unknown) { 
      const err = e as Error;
      alert(err.message || "Erreur de communication avec le serveur."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx)) return;
    
    triggerHapticFeedback(15);
    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    if (!pattern.includes(idx)) { 
      handleFailure(); 
      return; 
    }
    
    playAdvancedSound('click');
    setCombo(prev => prev + 1);

    if (nextUserPattern.length === pattern.length) {
      playAdvancedSound('success');
      setSessionsSolved(s => s + 1);
      setMultiplier(prev => parseFloat((prev + 0.10).toFixed(2)));
      
      let nextGrid = gridSize;
      if (sessionsSolved >= 2 && gridSize === 3) nextGrid = 5;
      if (sessionsSolved >= 4 && gridSize === 5) nextGrid = 7;
      setGridSize(nextGrid);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 400);
    }
  };

  const handleFailure = async () => {
    triggerHapticFeedback([100, 50, 100]);
    playAdvancedSound('fail');
    setShakeGrid(true);
    setTimeout(() => setShakeGrid(false), 500);

    setCombo(1);
    setStatus('lost');
  };

  // --- CRAMPONNER LE GAIN ET CLÔTURER ---
  const finalizeGame = async (wasAutoSaved: boolean = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!gameId) return;
    setLoading(true);
    
    const secureBet = lockedBetRef.current;
    const currentMult = gameStateRef.current.multiplier;
    let gainFinal = 0;

    const economy = resolveGameEconomy({
      gameId: 'biometric',
      bet: secureBet,
      multiplier: currentMult,
      difficulty: 'intermédiaire',
      currentStep: sessionsSolved,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });

    if (wasAutoSaved || status === 'input' || status === 'showing' || status === 'lost') {
      gainFinal = economy.payout;
    } else {
      gainFinal = 0;
    }

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
          p_user_id: profile?.id, 
          p_challenge_id: challengeId, 
          p_score: sessionsSolved * 10
        });
      } else if (gainFinal > 0) {
        await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile?.id, 
          p_mise_cp: 0, 
          p_gain_cp: gainFinal, 
          p_jeu_nom: 'Biometric Final'
        });
      }

      await supabase
        .from('biometric_games')
        .update({ is_active: false, gain_cp: gainFinal })
        .eq('id', gameId);
      
      if (gainFinal > 0) playAdvancedSound('cashout');
      setStatus(gainFinal > 0 || (challengeId && sessionsSolved > 0) ? 'won' : 'lost');
    } catch (e) { 
      console.error("Erreur lors de la finalisation :", e); 
    } finally { 
      setLoading(false); 
      init(); 
    }
  };

  // --- DÉCLENCHEMENT DU CLIC SUR LA PUB ---
  const handleAdClick = () => {
    localStorage.setItem('biometric_ad_start_time', Date.now().toString());
    setStatus('awaiting_ad_return');
    window.open(MONETAG_AD_URL, '_blank');
  };

  const adjustBet = (amount: number | 'max' | 'double') => {
    triggerHapticFeedback(10);
    if (!profile) return;
    if (amount === 'max') {
      setBetCP(Math.max(10, profile.jetons_cp || 10));
    } else if (amount === 'double') {
      setBetCP(prev => Math.min(profile.jetons_cp || prev, prev * 2));
    } else {
      setBetCP(prev => Math.max(10, prev + amount));
    }
  };

  const difficultyLabel = gridSize <= 3 ? 'IRIS-01' : gridSize <= 5 ? 'FINGERPRINT-02' : 'BIOLOCK-03';
  const progressionStage = Math.min(3, Math.floor(sessionsSolved / 2) + 1);

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

  // Calcul du gain si abandon en zone < 1.00
  const currentCalculatedGain = Math.floor(lockedBetRef.current * multiplier);

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
                <p className="text-xs uppercase tracking-widest text-emerald-400/70">Initialisation du Scanner...</p>
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
                  <p className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">LABORATOIRE BIOMETRIC</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/70 mt-1">Analyse Iris • Empreinte Digitale</p>
                </div>

                <div className="mb-6 rounded-3xl border border-white/10 bg-black/60 p-4 shadow-inner">
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                    {challengeId ? 'FRAIS DE MISSION' : 'VOTRE MISE CP'}
                  </p>
                  <input 
                    type="number" 
                    disabled={!!challengeId} 
                    value={betCP} 
                    onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
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
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-4 font-black text-lg text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> INITIALISER LE SCAN</>}
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            
            <div className="mb-4 grid w-full grid-cols-4 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center backdrop-blur-xl">
                <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Timer</p>
                <p className={`text-lg font-black ${sessionTimer <= 3 ? 'animate-pulse text-rose-400' : 'text-emerald-300'}`}>
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
                animate={{ width: status === 'input' ? `${(sessionTimer / 10) * 100}%` : '100%' }}
                transition={{ duration: status === 'input' ? 1 : 0.2, ease: 'linear' }}
              />
            </div>

            <div className="mb-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-emerald-300/80 backdrop-blur-xl">
              <span>ÉCHELLE : {difficultyLabel}</span>
              <span>STAGE : {progressionStage}</span>
              <span>GRILLE : {gridSize}x{gridSize}</span>
            </div>

            <div className="mb-6 w-full">
              <ProgressBar value={Math.min(100, (sessionsSolved / 6) * 100)} max={100} label="Progression Séquence" accent="emerald" />
            </div>

            <motion.div 
              animate={shakeGrid ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="relative rounded-[2.5rem] border border-cyan-400/20 bg-black/60 p-4 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
            >
              <motion.div 
                animate={{ y: [0, 240, 0] }} 
                transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} 
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
                      className={`rounded-xl border-2 transition-all duration-200 ${
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
                {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} fill="black" /> ENCAISSER {Math.floor(betCP * multiplier)} CP</>}
              </motion.button>
            )}
            
            {multiplier < 1.0 && !challengeId && (
              <p className="mt-4 text-[9px] text-emerald-400/60 tracking-[0.2em] font-bold uppercase animate-pulse">
                Zone de sauvetage : {currentCalculatedGain} CP
              </p>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE RÉSULTAT ET DE SECONDE CHANCE */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won' || status === 'awaiting_ad_return') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            {status === 'awaiting_ad_return' ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={56} className="animate-spin text-cyan-400" />
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Vérification du lien sponsorisé...</h3>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Passez au moins 6 secondes sur la page sponsorisée ouverte dans votre nouvel onglet puis revenez ici.
                </p>
              </div>
            ) : (
              <>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 ${status === 'lost' ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                  {status === 'lost' ? <ShieldX size={40} className="text-rose-500" /> : <ShieldCheck size={40} className="text-emerald-400" />}
                </div>
                
                <h2 className="text-3xl font-black italic mb-1 tracking-tight uppercase text-white">
                  {status === 'lost' ? 'Scan Interrompu' : 'Analyse Validée'}
                </h2>

                {adErrorMsg && (
                  <p className="mt-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl max-w-xs">
                    {adErrorMsg}
                  </p>
                )}
                
                <div className="bg-white/5 p-5 rounded-3xl w-full max-w-xs my-4 border border-white/10 shadow-inner">
                  <p className="text-[10px] text-zinc-400 mb-1 font-bold tracking-widest uppercase">Gains Obtenus</p>
                  <p className="text-4xl font-black italic tracking-tighter text-white">
                    {status === 'won' ? Math.floor(lockedBetRef.current * multiplier) : currentCalculatedGain} 
                    <span className="text-sm text-emerald-400 ml-1 font-bold">CP</span>
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {/* Option Pub / Seconde Chance si : Perdu + Mode hors challenge + Multiplicateur < 1.00 */}
                  {status === 'lost' && canRevive && !challengeId && multiplier < 1.00 && (
                    <button 
                      onClick={handleAdClick} 
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl font-black text-xs active:scale-95 flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 border border-cyan-300/30"
                    >
                      <span className="flex items-center gap-2">
                        <HeartPulse className="animate-pulse" size={18}/> SECONDE CHANCE (LIEN PUB) <ExternalLink size={14} />
                      </span>
                      <span className="text-[9px] font-medium text-cyan-100/80">
                        Coût : {Math.floor(lockedBetRef.current * 0.5)} CP (50% de la mise) • Visite 6s
                      </span>
                    </button>
                  )}
                  
                  {status === 'lost' && (
                    <button 
                      onClick={() => finalizeGame(true)} 
                      className="w-full py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                    >
                      RÉCUPÉRER MES {currentCalculatedGain} CP & QUITTER
                    </button>
                  )}

                  {status === 'won' && (
                    <button 
                      onClick={() => setStatus('idle')} 
                      className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-base active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                      NOUVELLE SESSION
                    </button>
                  )}

                  <button 
                    onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} 
                    className="w-full py-3 text-zinc-400 hover:text-white rounded-2xl font-bold text-xs active:scale-95 transition-all"
                  >
                    QUITTER LE JEU
                  </button>
                </div>
              </>
            )}
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
