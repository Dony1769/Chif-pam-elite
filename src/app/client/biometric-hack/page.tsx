"use client";
import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Construction, Coins, HeartPulse, Zap } from 'lucide-react';
import RewardedVideo from '@/components/ads/RewardedVideo';
import { getGameEconomySettings, resolveGameEconomy } from '@/lib/game-economy';
import { AnimatedCounter, NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// --- AUDIO SYSTEM ---
const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 30, 10]);
  }
};

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- ÉTATS ---
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'input' | 'lost' | 'won' | 'loading' | 'maintenance' | 'watching_ad'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Protocole de sécurité...");
  
  const [betCP, setBetCP] = useState(100);
  const [multiplier, setMultiplier] = useState(0.5);
  const [gridSize, setGridSize] = useState(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState(1000); 
  const [sessionTimer, setSessionTimer] = useState(10);
  const [sessionsSolved, setSessionsSolved] = useState(0);
  const [canRevive, setCanRevive] = useState(true);
  const [combo, setCombo] = useState(1);

  // 🔒 SÉCURITÉ REFS
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null });

  // Synchro Refs
  useEffect(() => {
    gameStateRef.current = { multiplier, gameId };
  }, [multiplier, gameId]);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
    checkAccess();
  }, []);

  useEffect(() => { init(); }, [init]);

  const checkAccess = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'biometric').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg);
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
        if (challengeId && challengeFee) setBetCP(Number(challengeFee));
      }
    } catch (e) { setStatus('idle'); }
  };

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
  }, []);
  
  useEffect(() => {
    if (status === 'showing') {
      const timer = setTimeout(() => setStatus('input'), displayTime);
      return () => clearTimeout(timer);
    }
    if (status === 'input') {
      const interval = setInterval(() => {
        setSessionTimer(prev => {
          if (prev <= 1) { 
              // Temps écoulé = Échec
              handleFailure(); 
              return 0; 
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, displayTime]);

  const startGame = async () => {
    if (!profile || loading) return;
    if (betCP < 10 && !challengeId) { alert("Mise minimum 10 CP"); return; }
    
    triggerHaptic();
    setLoading(true);
    isProcessingRef.current = false; // Reset lock

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      
      // 🔒 VERROUILLAGE DE LA MISE
      lockedBetRef.current = finalFee;

      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, p_mise_cp: finalFee, p_gain_cp: 0, p_jeu_nom: 'Biometric Start'
      });
      if (rpcError || !result.success) throw new Error(result?.message || "Erreur Solde");

      const { data: game, error: gameErr } = await supabase.from('biometric_games').insert([{
          user_id: profile.id, mise_cp: finalFee, is_active: true
      }]).select().single();
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
      playSound(440, 0.1);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx)) return;
    triggerHaptic();
    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    // ERREUR DE MOTIF
    if (!pattern.includes(idx)) { 
        handleFailure(); 
        return; 
    }
    
    playSound(880, 0.05);
    setCombo(prev => prev + 1);

    // SUCCÈS SÉQUENCE
    if (nextUserPattern.length === pattern.length) {
      setSessionsSolved(s => s + 1);
      setMultiplier(prev => parseFloat((prev + 0.10).toFixed(2)));
      
      let nextGrid = gridSize;
      if (sessionsSolved >= 2 && gridSize === 3) nextGrid = 5;
      if (sessionsSolved >= 4 && gridSize === 5) nextGrid = 7;
      setGridSize(nextGrid);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 500);
    }
  };

  const handleFailure = async () => {
    triggerHaptic();
    // Si on perd en zone "Safe" (<1.0) et hors challenge, on encaisse auto
    const currentMult = gameStateRef.current.multiplier;
    if (currentMult < 1.0 && !challengeId) {
        finalizeGame(true); // true = forced/auto cashout (sauvetage)
        return;
    }
    playSound(110, 0.5, 'sawtooth');
    setCombo(1);
    setStatus('lost');
  };

  // --- FIN DE PARTIE SÉCURISÉE ---
  // wasAutoSaved = true si déclenché par échec en zone safe
  // wasAutoSaved = false si déclenché par bouton "Encasser"
  const finalizeGame = async (wasAutoSaved: boolean = false) => {
    // 🛡️ ANTI DOUBLE-APPEL
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

    // Calcul Gain
    if (wasAutoSaved) {
        // Sauvetage (Perte < 1.0)
        gainFinal = economy.payout;
    } else if (status === 'input' || status === 'showing') {
        // Encaissement Manuel (Win)
        gainFinal = economy.payout;
    } else {
        // Perte totale
        gainFinal = 0;
    }

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
            p_user_id: profile.id, p_challenge_id: challengeId, p_score: sessionsSolved * 10
        });
      } else {
        if (gainFinal > 0) {
            await supabase.rpc('jouer_partie_cp', {
                p_user_id: profile.id, p_mise_cp: 0, p_gain_cp: gainFinal, p_jeu_nom: 'Biometric Final'
            });
        }
      }

      await supabase.from('biometric_games').update({ is_active: false, gain_cp: gainFinal }).eq('id', gameId);
      
      setStatus(gainFinal > 0 || (challengeId && sessionsSolved > 0) ? 'won' : 'lost');
      if (gainFinal > 0) playSound(523, 0.5);
    } catch (e) { console.error(e); } finally { setLoading(false); init(); }
  };

  // --- REWARD ---
  const handleAdComplete = () => {
    setCanRevive(false);
    setCombo(1);
    isProcessingRef.current = false; // On déverrouille pour continuer
    setStatus('showing');
    generatePattern(gridSize);
    playSound(600, 0.2);
  };

  const difficultyLabel = gridSize <= 3 ? 'IRIS-01' : gridSize <= 5 ? 'FINGERPRINT-02' : 'BIOLOCK-03';
  const progressionStage = Math.min(3, Math.floor(sessionsSolved / 2) + 1);

  if (status === 'maintenance') return <NeonGameShell accent="amber" className="h-screen"><div className="flex h-screen items-center justify-center p-10 text-center text-amber-500 font-black uppercase italic">{maintenanceMsg}</div></NeonGameShell>;

  return (
    <NeonGameShell accent="emerald" className="h-screen font-sans select-none">
      
      {status === 'watching_ad' && (
          <RewardedVideo 
            onReward={handleAdComplete} 
            onClose={() => setStatus('lost')} 
            zoneId={5848554} 
          />
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl z-50">
        <button onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-90">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
            <Coins size={16} className="text-emerald-300" />
            <span className="text-sm italic text-emerald-200">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center p-6">
        {status === 'idle' || status === 'loading' ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-xs overflow-hidden rounded-[2.5rem] border border-emerald-400/20 bg-slate-950/60 p-8 text-center shadow-[0_0_60px_rgba(16,185,129,0.16)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_55%)]" />
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }} className="pointer-events-none absolute inset-6 rounded-full border border-cyan-400/20" />
            {status === 'loading' ? <Loader2 className="animate-spin mx-auto text-emerald-500" size={50} /> : (
                <>
                <div className="relative mb-6 flex justify-center"><div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 p-5 shadow-[0_0_25px_rgba(16,185,129,0.2)]"><Fingerprint className="text-emerald-300 drop-shadow-[0_0_20px_#10b981]" size={70} /></div></div>
                <div className="mb-6 rounded-3xl border border-cyan-400/20 bg-black/40 p-4 shadow-inner">
                    <p className="mb-2 text-[10px] tracking-widest text-cyan-400">LABORATOIRE BIOMETRIC</p>
                    <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-emerald-400/70">Scanner • Iris • Empreinte</p>
                </div>
                <div className="mb-8 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-inner">
                    <p className="mb-2 text-[10px] tracking-widest text-emerald-500">{challengeId ? 'MISSION FEE' : 'MISE CP'}</p>
                    <input 
                        type="number" 
                        disabled={!!challengeId} 
                        value={betCP} 
                        onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
                        className="w-full bg-transparent text-center text-5xl font-black tracking-tighter text-white outline-none focus:text-emerald-400" 
                    />
                </div>
                <button onClick={startGame} disabled={loading} className="w-full rounded-3xl bg-linear-to-r from-emerald-500 to-cyan-500 py-6 text-xl font-black text-white shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all active:scale-95">
                    {loading ? <Loader2 className="mx-auto animate-spin" /> : 'INITIALISER LE SCAN'}
                </button>
                </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* IN-GAME HUD */}
            <div className="mb-6 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">Timer</p>
                    <p className={`text-xl font-black ${sessionTimer < 4 ? 'animate-pulse text-rose-400' : 'text-emerald-300'}`}>{sessionTimer}s</p>
                </div>
                <div className={`rounded-2xl border p-4 text-center transition-all ${multiplier >= 1.0 ? 'border-rose-400/30 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.18)]' : 'border-emerald-400/20 bg-emerald-500/10'}`}>
                    <p className={`text-[7px] font-bold uppercase ${multiplier >= 1.0 ? 'text-rose-300' : 'text-emerald-300'}`}>Multiplier</p>
                    <div className="text-2xl font-black"><AnimatedCounter value={multiplier} prefix="x" /></div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">Score</p>
                    <div className="text-xl font-black text-cyan-300"><AnimatedCounter value={sessionsSolved} /></div>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-center backdrop-blur-xl">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-cyan-300">Combo</p>
                    <div className="text-xl font-black text-cyan-200">x{combo}</div>
                </div>
            </div>
            <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 backdrop-blur-xl">
              <span>ÉCHELLE {difficultyLabel}</span>
              <span>STAGE {progressionStage}</span>
              <span>DIFFICULTÉ {gridSize}x{gridSize}</span>
            </div>
            <div className="mb-8 w-full rounded-4xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
              <ProgressBar value={Math.min(100, (sessionsSolved / 6) * 100)} max={100} label="Progression de la séquence" accent="emerald" />
            </div>

            {/* SCANNER GRID */}
            <div className="relative rounded-[3rem] border border-cyan-400/20 bg-black/50 p-4 shadow-[0_0_70px_rgba(34,211,238,0.18)]">
              <motion.div animate={{ y: [0, 260, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }} className="pointer-events-none absolute inset-x-6 top-0 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              <motion.div animate={{ scale: [1, 1.02, 1], opacity: [0.25, 0.5, 0.25] }} transition={{ repeat: Infinity, duration: 2.8 }} className="pointer-events-none absolute inset-2 rounded-[2.4rem] border border-cyan-400/20" />
              <motion.div animate={{ x: [0, 10, 0], y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3.2 }} className="pointer-events-none absolute -left-3 top-4 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[8px] uppercase tracking-[0.3em] text-emerald-300">IRIS</motion.div>
              <motion.div animate={{ x: [0, -10, 0], y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 3.5 }} className="pointer-events-none absolute -right-3 bottom-4 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[8px] uppercase tracking-[0.3em] text-cyan-300">PRINT</motion.div>
              <div 
                className="grid gap-2.5"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(90vw, 360px)', height: 'min(90vw, 360px)' }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleCellClick(i)}
                    className={`rounded-xl border-2 transition-all duration-300 ${
                      status === 'showing' && pattern.includes(i) ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_15px_#10b981]' : 
                      status === 'input' && userPattern.includes(i) ? 'border-emerald-400 bg-emerald-600/50' : 'border-white/5 bg-white/5'
                    }`}
                  />
                ))}
              </div>
            </div>

            {multiplier >= 1.0 && (
                <motion.button 
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  onClick={() => finalizeGame(false)}
                  disabled={loading}
                  className="w-full mt-10 py-6 font-black rounded-4xl text-xl bg-white text-black shadow-2xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} fill="black" /> ENCAISSER {Math.floor(betCP * multiplier)} CP</>}
                </motion.button>
            )}
            
            {multiplier < 1.0 && !challengeId && (
                <p className="mt-8 text-[8px] text-emerald-500/50 tracking-[0.3em] font-black uppercase animate-pulse">Mode Sauvetage Actif : Pas de perte</p>
            )}
          </div>
        )}
      </div>

      {/* RESULTS MODAL */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-100 bg-[#020617]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 border-2 ${status === 'lost' ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                {status === 'lost' ? <ShieldX size={48} className="text-rose-500" /> : <ShieldCheck size={48} className="text-emerald-500" />}
            </div>
            
            <h2 className="text-4xl font-black italic mb-2 tracking-tighter uppercase">{status === 'lost' ? 'Scan Interrompu' : 'Succès'}</h2>
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] w-full max-w-xs mb-8 border border-white/10 shadow-inner">
                <p className="text-[10px] text-zinc-500 mb-2 font-bold tracking-widest uppercase">Gains Finale</p>
                <p className="text-6xl font-black italic tracking-tighter text-white">
                    {/* Le gain affiché dépend du statut. Won = Gain réel, Lost = 0 */}
                    {status === 'won' ? Math.floor(lockedBetRef.current * multiplier) : 0} 
                    <span className="text-sm text-emerald-500 ml-1 uppercase font-black">cp</span>
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                
                {/* BOUTON REVIVRE PAR PUB */}
                {status === 'lost' && canRevive && (
                    <button onClick={() => setStatus('watching_ad')} className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black text-lg active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20">
                        <HeartPulse className="animate-pulse" size={20}/> REVIVRE (PUBLICITÉ)
                    </button>
                )}
                
                <button onClick={() => router.push(challengeId ? '/client/challenges' : '/client/home')} className="w-full py-5 bg-white/5 text-slate-400 rounded-[1.8rem] font-black text-sm active:scale-95 transition-all">
                    QUITTER L'ARÈNE
                </button>
                
                {status === 'won' && (
                     <button onClick={() => setStatus('idle')} className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black text-xl active:scale-95 shadow-xl">NOUVEAU SCAN</button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}

export default function BiometricHack() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50}/></div>}>
      <BiometricGameContent />
    </Suspense>
  );
}
