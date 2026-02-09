"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, ChevronLeft, Loader2, Construction, Zap, Coins, Wallet, Target, Play, HeartPulse } from 'lucide-react';
import RewardedVideo from '@/components/ads/RewardedVideo'; // Import du composant Ad

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

function BiometricGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'input' | 'lost' | 'won' | 'loading' | 'maintenance' | 'watching_ad'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Protocole de sécurité...");
  
  const [betCP, setBetCP] = useState(100);
  const [multiplier, setMultiplier] = useState(0.5); // Start à 0.5
  const [gridSize, setGridSize] = useState(3); 
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState(1000); 
  const [sessionTimer, setSessionTimer] = useState(10);
  const [sessionsSolved, setSessionsSolved] = useState(0);
  const [canRevive, setCanRevive] = useState(true); // Une seule fois par game

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
          if (prev <= 1) { handleFailure(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, displayTime]);

  const startGame = async () => {
    if (!profile || loading) return;
    setLoading(true);
    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, p_mise_cp: finalFee, p_gain_cp: 0, p_jeu_nom: 'Biometric Start'
      });
      if (rpcError || !result.success) throw new Error(result?.message || "Erreur Solde");

      const { data: game, error: gameErr } = await supabase.from('biometric_games').insert([{
          user_id: profile.id, mise_cp: finalFee, is_active: true
      }]).select().single();
      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMultiplier(0.5); // Initialisation à 0.5
      setGridSize(3);
      setSessionsSolved(0);
      setCanRevive(true);
      generatePattern(3);
      playSound(440, 0.1);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleCellClick = (idx: number) => {
    if (status !== 'input' || userPattern.includes(idx)) return;
    const nextUserPattern = [...userPattern, idx];
    setUserPattern(nextUserPattern);

    if (!pattern.includes(idx)) { handleFailure(); return; }
    playSound(880, 0.05);

    if (nextUserPattern.length === pattern.length) {
      setSessionsSolved(s => s + 1);
      setMultiplier(prev => parseFloat((prev + 0.10).toFixed(2))); // +0.1 par succès
      
      let nextGrid = gridSize;
      if (sessionsSolved >= 3 && gridSize === 3) nextGrid = 4;
      if (sessionsSolved >= 6 && gridSize === 4) nextGrid = 5;
      setGridSize(nextGrid);
      
      setDisplayTime(prev => Math.max(300, prev - 100));
      setTimeout(() => generatePattern(nextGrid), 500);
    }
  };

  const handleFailure = async () => {
    // LOGIQUE DE SAUVEGARDE AUTOMATIQUE (Si < 1.0)
    if (multiplier < 1.0 && !challengeId) {
        finalizeGame(true); // On force le cashout du multiplicateur actuel
        return;
    }

    // Sinon, on a perdu (Zone > 1.0 ou Challenge)
    playSound(110, 0.5, 'sawtooth');
    setStatus('lost');
  };

  const finalizeGame = async (wasAutoSaved: boolean = false) => {
    if (!gameId) return;
    setLoading(true);
    
    // Si < 1.0 ou manuel, on calcule le gain. Si perdu en zone > 1.0, gain = 0.
    let gainFinal = 0;
    if (wasAutoSaved || status === 'input') {
        gainFinal = Math.floor(betCP * multiplier);
    }

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
            p_user_id: profile.id, p_challenge_id: challengeId, p_score: sessionsSolved * 10
        });
      } else {
        await supabase.rpc('jouer_partie_cp', {
            p_user_id: profile.id, p_mise_cp: 0, p_gain_cp: gainFinal, p_jeu_nom: 'Biometric Final'
        });
      }

      await supabase.from('biometric_games').update({ is_active: false, gain_cp: gainFinal }).eq('id', gameId);
      setStatus(gainFinal > 0 || (challengeId && sessionsSolved > 0) ? 'won' : 'lost');
      if (gainFinal > 0) playSound(523, 0.5);
    } catch (e) { console.error(e); } finally { setLoading(false); init(); }
  };

  // --- LOGIQUE AD REWARD ---
  const handleAdComplete = () => {
    setCanRevive(false);
    setStatus('showing'); // On remontre le pattern actuel
    generatePattern(gridSize);
    playSound(600, 0.2);
  };

  if (status === 'maintenance') return <div className="h-screen bg-[#020617] flex items-center justify-center text-amber-500 font-black uppercase italic p-10 text-center">{maintenanceMsg}</div>;

  return (
    <div className="h-screen bg-[#020617] text-white font-black italic uppercase overflow-hidden flex flex-col font-sans">
      
      {/* AD OVERLAY */}
      {status === 'watching_ad' && (
          <RewardedVideo onReward={handleAdComplete} onClose={() => setStatus('lost')} />
      )}

      {/* HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <button onClick={() => router.push(challengeId ? '/client/arena' : '/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/5 active:scale-90 shadow-xl">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-emerald-500 text-sm italic">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {status === 'idle' || status === 'loading' ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs bg-slate-900/40 border border-white/10 p-10 rounded-[3.5rem] text-center backdrop-blur-md shadow-2xl">
            {status === 'loading' ? <Loader2 className="animate-spin mx-auto text-emerald-500" size={50} /> : (
                <>
                <Fingerprint className="text-emerald-500 mx-auto mb-8 drop-shadow-[0_0_20px_#10b981]" size={70} />
                <div className="bg-black/60 p-6 rounded-3xl border border-white/5 mb-8 shadow-inner">
                    <p className="text-[10px] text-emerald-500 mb-2 tracking-widest">{challengeId ? 'MISSION FEE' : 'MISE CP'}</p>
                    <input type="number" disabled={!!challengeId} value={betCP} onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} className="bg-transparent text-5xl font-black text-center w-full outline-none text-white focus:text-emerald-400 tracking-tighter" />
                </div>
                <button onClick={startGame} disabled={loading} className="w-full py-6 rounded-[2rem] text-xl font-black bg-emerald-600 text-white shadow-xl active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "INITIALISER LE SCAN"}
                </button>
                </>
            )}
          </motion.div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* IN-GAME HUD */}
            <div className="w-full grid grid-cols-3 gap-4 mb-10">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] text-zinc-500 italic font-bold tracking-widest uppercase">Timer</p>
                    <p className={`text-xl font-black ${sessionTimer < 4 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>{sessionTimer}s</p>
                </div>
                <div className={`p-4 rounded-2xl border text-center transition-all ${multiplier >= 1.0 ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <p className={`text-[7px] italic font-bold uppercase ${multiplier >= 1.0 ? 'text-rose-500' : 'text-emerald-500'}`}>Multiplier</p>
                    <p className="text-2xl font-black">x{multiplier.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-[7px] text-zinc-500 italic font-bold uppercase tracking-widest">Score</p>
                    <p className="text-xl font-black">{sessionsSolved}</p>
                </div>
            </div>

            {/* SCANNER GRID */}
            <div 
              className="grid gap-2.5 p-6 bg-black/40 rounded-[3rem] border border-white/10 shadow-2xl"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, width: 'min(90vw, 360px)', height: 'min(90vw, 360px)' }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCellClick(i)}
                  className={`rounded-xl border-2 transition-all duration-300 ${
                    status === 'showing' && pattern.includes(i) ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_#10b981]' : 
                    status === 'input' && userPattern.includes(i) ? 'bg-emerald-600/50 border-emerald-400' : 'bg-white/5 border-white/5'
                  }`}
                />
              ))}
            </div>

            {/* CASHOUT BUTTON (Only if Multiplier >= 1.0) */}
            {multiplier >= 1.0 && (
                <motion.button 
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  onClick={() => finalizeGame(false)}
                  className="w-full mt-10 py-6 font-black rounded-[2rem] text-xl bg-white text-black shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                >
                  <Zap size={20} fill="black" /> ENCAISSER {Math.floor(betCP * multiplier)} CP
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#020617]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 border-2 ${status === 'lost' ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                {status === 'lost' ? <ShieldX size={48} className="text-rose-500" /> : <ShieldCheck size={48} className="text-emerald-500" />}
            </div>
            
            <h2 className="text-4xl font-black italic mb-2 tracking-tighter uppercase">{status === 'lost' ? 'Scan Interrompu' : 'Succès'}</h2>
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] w-full max-w-xs mb-8 border border-white/10 shadow-inner">
                <p className="text-[10px] text-zinc-500 mb-2 font-bold tracking-widest uppercase">Gains Finale</p>
                <p className="text-6xl font-black italic tracking-tighter text-white">
                    {status === 'won' ? Math.floor(betCP * multiplier) : 0} 
                    <span className="text-sm text-emerald-500 ml-1 uppercase font-black">cp</span>
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                {status === 'lost' && canRevive && (
                    <button onClick={() => setStatus('watching_ad')} className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black text-lg active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20">
                        <HeartPulse className="animate-pulse" size={20}/> REVIVRE (PUBLICITÉ)
                    </button>
                )}
                
                <button onClick={() => router.push(challengeId ? '/client/arena' : '/client/home')} className="w-full py-5 bg-white/5 text-slate-400 rounded-[1.8rem] font-black text-sm active:scale-95 transition-all">
                    QUITTER L'ARÈNE
                </button>
                
                {status === 'won' && (
                     <button onClick={() => setStatus('idle')} className="w-full py-6 bg-emerald-600 text-white rounded-[1.8rem] font-black text-xl active:scale-95 shadow-xl">NOUVEAU SCAN</button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BiometricHack() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50}/></div>}>
      <BiometricGameContent />
    </Suspense>
  );
}
