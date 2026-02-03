"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Zap } from 'lucide-react';

const playSound = (type: 'beep' | 'error' | 'win' | 'lost') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'beep') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'win') {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {}
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-10 h-16" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-5 left-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-5 right-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

function LaserVaultGame() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; msg: string } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won' | 'maintenance' | 'loading'>('loading');
  
  const [betCP, setBetCP] = useState(100);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(0.5); // Start à 0.5
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(1); // Vitesse initiale plus douce
  const [errorPenalty, setErrorPenalty] = useState(1.0);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
    }
    checkAccess();
  }, []);

  useEffect(() => { init(); }, [init]);

  const checkAccess = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'vault').single();
      if (data && !data.is_active) {
        setMaintenance({ active: true, msg: data.maintenance_msg || "Maintenance." });
        setStatus('maintenance');
      } else { setStatus('idle'); }
    } catch (err) { setStatus('idle'); } finally { setLoadingCheck(false); }
  };

  const generateProblem = useCallback((m: number) => {
    const difficultyLevel = Math.floor(m * 2.5);
    const a = Math.floor(Math.random() * (8 + difficultyLevel)) + 2;
    const b = Math.floor(Math.random() * (8 + difficultyLevel)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  }, []);

  const startGame = async () => {
    if (loading || !profile) return;
    setLoading(true);
    try {
      const roundedMise = Math.floor(betCP);
      const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, p_mise_cp: roundedMise, p_gain_cp: 0, p_jeu_nom: 'Laser Vault'
      });
      if (rpcError || !result.success) throw new Error(result?.message || "Erreur Solde");

      const { data: game, error: gameErr } = await supabase.from('vault_games').insert([{
          user_id: profile.id, mise_cp: roundedMise, is_active: true
      }]).select().single();
      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMultiplier(0.5); setLaserY(0); setQuestionsSolved(0); setBaseSpeed(0.6); setErrorPenalty(1.0); setInput("");
      generateProblem(0.5); setStatus('playing');
      playSound('beep');
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      setLaserY(prev => {
        if (prev >= 88) {
          // Si multiplier < 1.0, c'est un sauvetage automatique des meubles
          // Si multiplier >= 1.0, c'est une détection (perte totale car pas de cashout manuel)
          finalizeGame(multiplier < 1.0); 
          return 88;
        }
        // Vitesse bridée tant que multiplier < 1
        const speedFactor = multiplier < 1.0 ? 0.4 : (1 + (multiplier - 1) * 0.2);
        return prev + (baseSpeed * errorPenalty * speedFactor);
      });
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier, baseSpeed, errorPenalty]);

  const handleKey = (num: string) => {
    if (status !== 'playing') return;
    playSound('beep');
    const newVal = input + num;
    setInput(newVal);
    if (newVal === "-") return;
    
    if (parseInt(newVal) === problem.a) {
      setQuestionsSolved(q => q + 1);
      setMultiplier(prev => parseFloat((prev + 0.05).toFixed(2))); // +0.05
      setLaserY(0); setInput(""); setErrorPenalty(1.0); 
      // La vitesse n'augmente réellement que si on est au dessus de 1.0
      if (multiplier >= 1.0 && (questionsSolved + 1) % 2 === 0) {
          setBaseSpeed(s => s + 0.4);
      }
      generateProblem(multiplier + 0.05);
    } else if (newVal.length >= problem.a.toString().length) {
      setErrorPenalty(p => p + 1.1); setInput(""); playSound('error');
    }
  };

  const finalizeGame = async (wasAutoSaved: boolean) => {
    if (status !== 'playing' || !gameId) return;
    
    // Logique cruciale : 
    // Si autoSaved (laser touche quand mult < 1) -> Gain = Mise * Multiplier
    // Si Cashout Manuel (mult >= 1) -> Gain = Mise * Multiplier
    // Si Laser touche (mult >= 1) -> Gain = 0 (Échec du risque)
    const isManual = status === 'playing' && multiplier >= 1.0 && !wasAutoSaved;
    let gainFinal = 0;

    if (multiplier < 1.0) {
        gainFinal = Math.floor(betCP * multiplier); // Sauvetage partiel
    } else if (wasAutoSaved === false) { 
        // C'est un cashout manuel au dessus de 1.0
        gainFinal = Math.floor(betCP * multiplier);
    } else {
        // Le laser a touché alors qu'on était au dessus de 1.0 (Risk failed)
        gainFinal = 0;
    }
    
    try {
      await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id, p_mise_cp: 0, p_gain_cp: gainFinal,
          p_jeu_nom: gainFinal > 0 ? 'Vault Success' : 'Vault Detected'
      });
      await supabase.from('vault_games').update({ is_active: false, gain_cp: gainFinal }).eq('id', gameId);
      setStatus(gainFinal > 0 ? 'won' : 'lost');
      if (gainFinal > 0) playSound('win'); else playSound('error');
    } catch (e) { console.error(e); } finally { init(); }
  };

  if (loadingCheck || status === 'loading') return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="fixed inset-0 bg-[#020617] text-white font-black italic uppercase overflow-hidden select-none flex flex-col font-sans">
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/5 z-50 backdrop-blur-xl">
        <button onClick={() => router.push('/client/home')} className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Coins size={14} className="text-emerald-500" />
            <span className="text-emerald-500 text-[11px] italic font-bold">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between relative">
        {status === 'maintenance' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <ServerOff className="text-amber-500 mb-6 animate-pulse" size={64} />
            <h1 className="text-2xl text-amber-500 italic uppercase">Vault Scellé</h1>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">{maintenance?.msg}</p>
          </div>
        ) : status === 'idle' ? (
          <div className="flex-1 flex items-center justify-center w-full max-w-xs">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900/40 p-8 rounded-[3rem] border border-white/10 text-center shadow-2xl backdrop-blur-md w-full">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <Lock className="text-emerald-500" size={28} />
              </div>
              <div className="space-y-1 mb-8 italic">
                  <p className="text-[8px] text-emerald-500 tracking-widest font-bold uppercase">Mise à sécuriser</p>
                  <input type="number" value={betCP} onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} className="bg-transparent text-5xl font-black text-center w-full outline-none text-white focus:text-emerald-500 tracking-tighter" />
              </div>
              <button onClick={startGame} disabled={loading} className="w-full py-5 rounded-[1.5rem] text-lg font-black bg-emerald-600 text-white shadow-[0_15px_30px_rgba(5,150,105,0.3)] active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : "LANCER L'EXTRACTION"}
              </button>
            </motion.div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-full">
            <div className="relative flex-1 max-h-[42vh] bg-black rounded-[2.5rem] border-2 border-white/10 overflow-hidden mb-4 shrink-0 shadow-inner">
              {/* Le Laser */}
              <motion.div style={{ top: `${laserY}%` }} className="absolute left-0 right-0 h-1 bg-rose-600 shadow-[0_0_40px_#f43f5e] z-30" />

              <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                 <div className="bg-black/80 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 text-center min-w-[60px]">
                    <p className="text-[6px] text-zinc-500 font-bold tracking-widest">CODES</p>
                    <p className="text-sm text-white font-black">{questionsSolved}</p>
                 </div>
                 
                 <div className="flex flex-col items-center">
                    <h2 className={`text-5xl font-black italic tracking-tighter drop-shadow-lg transition-colors ${multiplier >= 1 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        x{multiplier.toFixed(2)}
                    </h2>
                    {multiplier < 1 && <span className="text-[7px] text-rose-500 animate-pulse font-bold">MODE SAUVETAGE</span>}
                 </div>

                 <div className="bg-black/80 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 text-center min-w-[60px]">
                    <p className="text-[6px] text-zinc-500 uppercase font-bold">SÉCURITÉ</p>
                    <p className="text-sm text-rose-500 font-black">{(baseSpeed * 10).toFixed(0)}%</p>
                 </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <AnimatePresence mode="wait">
                    <motion.div key={problem.q} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                        <p className="text-6xl font-black mb-4 text-white italic tracking-tighter drop-shadow-2xl">{problem.q}</p>
                        <div className="h-12 text-4xl text-emerald-500 border-b-2 border-emerald-500/40 px-8 font-black italic tracking-widest">
                            {input || "?"}
                        </div>
                    </motion.div>
                 </AnimatePresence>
              </div>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 scale-75">
                <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pb-4 shrink-0">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                <motion.button key={n} whileTap={{ scale: 0.95 }} onClick={() => handleKey(n.toString())} className="h-14 bg-white/5 border border-white/5 rounded-2xl text-2xl font-black active:bg-emerald-600 transition-colors">
                  {n}
                </motion.button>
              ))}
              <button onClick={() => setInput("")} className="bg-rose-600/10 text-rose-500 rounded-2xl font-black text-[10px] italic border border-rose-500/20 tracking-widest">CLR</button>
              
              <button 
                onClick={() => finalizeGame(false)} 
                disabled={multiplier < 1.0} 
                className={`col-span-3 mt-2 py-6 font-black rounded-[1.8rem] text-xl italic tracking-tighter transition-all shadow-xl flex items-center justify-center gap-3 ${multiplier < 1.0 ? "bg-zinc-900 text-zinc-700 opacity-60" : "bg-emerald-600 text-white animate-bounce-short"}`}
              >
                {multiplier < 1.0 ? (
                    <>SAUVETAGE EN COURS...</>
                ) : (
                    <><Zap size={24} /> CASH OUT {Math.floor(betCP * multiplier)} CP</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#020617]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-sm">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'lost' ? 'bg-rose-600/20 border-rose-500/40' : 'bg-emerald-500/20 border-emerald-500/40'} border-2`}>
                        {status === 'lost' ? <ShieldAlert size={48} className="text-rose-500" /> : <Unlock size={48} className="text-emerald-500" />}
                    </div>
                    <h2 className="text-5xl font-black italic tracking-tighter mb-2 uppercase">{status === 'lost' ? 'ALERTE' : 'VAULT OUVERT'}</h2>
                    <div className="bg-white/5 p-8 rounded-[3rem] w-full mb-10 border border-white/10 shadow-inner">
                        <p className="text-[9px] text-slate-500 mb-3 uppercase italic font-bold tracking-[0.3em]">JETONS RÉCUPÉRÉS</p>
                        <p className="text-6xl text-white font-black tracking-tighter italic">{Math.floor(betCP * multiplier)} <span className="text-lg text-emerald-500 ml-1 font-black">CP</span></p>
                        {status === 'lost' && <p className="text-[8px] text-rose-500 mt-4 font-bold tracking-widest">DÉTECTION À x{multiplier.toFixed(2)}</p>}
                    </div>
                    <button onClick={() => setStatus('idle')} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xl italic shadow-2xl">RETOUR AU HUB</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50} /></div>}>
      <LaserVaultGame />
    </Suspense>
  );
}
