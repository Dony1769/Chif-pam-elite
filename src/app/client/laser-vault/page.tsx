"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, Info, X } from 'lucide-react';

// --- SYSTÈME AUDIO OPTIMISÉ ---
const playSound = (type: 'beep' | 'error' | 'win' | 'lost' | 'speedup') => {
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
  } else if (type === 'speedup') {
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } else if (type === 'win') {
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }
};

const EliteAvatar = ({ status, isScared }: { status: string; isScared: boolean }) => (
  <motion.div className="relative w-10 h-16" animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}>
    <motion.div animate={isScared ? { x: [-1, 1, -1] } : {}} transition={{ repeat: Infinity, duration: 0.1 }} className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
    <motion.div animate={isScared ? { rotate: [40, 60] } : { rotate: 20 }} className="absolute top-5 left-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isScared ? { rotate: [-40, -60] } : { rotate: -20 }} className="absolute top-5 right-0 w-1.5 h-5 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

export default function LaserVault() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [showTutorial, setShowTutorial] = useState(false);
  const [bet, setBet] = useState(50);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  
  // LOGIQUE DE DIFFICULTÉ
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(0.5); // Vitesse qui augmente toutes les 2 questions
  const [errorPenalty, setErrorPenalty] = useState(1.0); // Multiplicateur de vitesse en cas d'erreur
  
  const lastTickRef = useRef<number>(0);

  // Vérifier si le tutoriel doit être affiché au montage
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenLaserTutorial');
    if (!hasSeenTutorial) setShowTutorial(true);
  }, []);

  const generateProblem = useCallback((m: number) => {
    const difficultyLevel = Math.floor(m * 2);
    const a = Math.floor(Math.random() * (10 + difficultyLevel)) + 2;
    const b = Math.floor(Math.random() * (10 + difficultyLevel)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  }, []);

  const startGame = async () => {
    setLoading(true);
    try {
      const { data: id, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
      if (error) throw new Error(error.message);
      
      setGameId(id);
      setMultiplier(1.0);
      setLaserY(0);
      setQuestionsSolved(0);
      setBaseSpeed(0.3);
      setErrorPenalty(1.0);
      setInput("");
      generateProblem(1.0);
      setStatus('playing');
      lastTickRef.current = performance.now();
      playSound('beep');
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      
      // ANTI-CHEAT : Sanction si l'onglet est gelé
      if (delta > 350) setLaserY(prev => prev + 5);

      setLaserY(prev => {
        if (prev >= 85) { setStatus('lost'); playSound('lost'); return 85; }
        // Vitesse = Base (qui augmente) * Pénalité Erreur * Scaling Multiplicateur
        return prev + (baseSpeed * errorPenalty * (1 + (multiplier - 1) * 0.15));
      });
      lastTickRef.current = now;
    }, 100);
    return () => clearInterval(timer);
  }, [status, multiplier, baseSpeed, errorPenalty]);

  const handleKey = (num: string) => {
    playSound('beep');
    const newVal = input + num;
    setInput(newVal);
    
    // CAS DU NOMBRE NÉGATIF : On ne valide que si le reste suit
    if (newVal === "-") return;

    if (parseInt(newVal) === problem.a) {
      const nextSolvedCount = questionsSolved + 1;
      setQuestionsSolved(nextSolvedCount);
      setMultiplier(prev => parseFloat((prev + 0.1).toFixed(1)));
      setLaserY(0);
      setInput("");

      // TOUTES LES 2 QUESTIONS : Augmentation de la vitesse de base
      if (nextSolvedCount % 2 === 0) {
        setBaseSpeed(prev => prev + 0.1);
        playSound('speedup');
      }

      generateProblem(multiplier + 0.1);
    } else if (newVal.length >= problem.a.toString().length) {
      // ERREUR : Le laser descend plus vite définitivement (+25% de vitesse)
      setErrorPenalty(p => p + 0.25);
      setInput("");
      playSound('error');
    }
  };

  const closeTutorial = () => {
    localStorage.setItem('hasSeenLaserTutorial', 'true');
    setShowTutorial(false);
  };

  const cashout = async () => {
    const finalPayout = Math.floor(bet * multiplier);
    await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'vault_games', p_payout: finalPayout, p_win: true });
    setStatus('won');
    playSound('win');
  };

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden select-none flex flex-col">
      {/* HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-emerald-500/10 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10"><ChevronLeft size={20}/></button>
        <div className="text-center">
          <h1 className="text-lg text-emerald-500 tracking-tighter">LASER VAULT</h1>
          <p className="text-[6px] tracking-[0.3em] text-white/30 font-bold">ELITE SECURITY</p>
        </div>
        <button onClick={() => setShowTutorial(true)} className="p-2 text-emerald-500"><Info size={20}/></button>
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between overflow-hidden">
        {status === 'idle' ? (
          <div className="mt-10 w-full max-w-xs space-y-6 animate-in zoom-in">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center shadow-2xl relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-black text-[8px] rounded-full">SYSTÈME PRÊT</div>
                <Lock className="text-emerald-500 mx-auto mb-4 mt-2" size={40} />
                <p className="text-[10px] text-zinc-500 mb-1 tracking-widest">MISE HTG</p>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none mb-6 text-white" />
                <button onClick={startGame} className="w-full py-5 bg-emerald-600 text-black rounded-2xl text-xl font-bold active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    {loading ? <Loader2 className="animate-spin mx-auto"/> : "HACKER"}
                </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col h-full">
            {/* ZONE DU COFFRE */}
            <div className="relative h-[38vh] bg-zinc-900/50 rounded-[2.5rem] border-2 border-zinc-800 overflow-hidden shadow-inner mb-3">
              <motion.div style={{ top: `${laserY}%` }} className="absolute left-0 right-0 h-0.5 bg-red-600 shadow-[0_0_25px_red] z-30" />
              
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                 <div className="text-left">
                    <p className="text-[6px] text-zinc-500">ÉTAPE</p>
                    <p className="text-sm text-white">{questionsSolved}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[7px] text-emerald-500 font-bold tracking-widest">MULTIPLICATEUR</p>
                    <h2 className="text-4xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">x{multiplier.toFixed(1)}</h2>
                 </div>
                 <div className="text-right">
                    <p className="text-[6px] text-zinc-500">VITESSE</p>
                    <p className="text-sm text-red-500">{(baseSpeed * 10).toFixed(0)}</p>
                 </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                 <motion.div key={problem.q} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <p className="text-5xl font-black mb-2 tracking-tighter text-white drop-shadow-lg">{problem.q}</p>
                    <div className="h-10 text-3xl text-emerald-500 border-b-2 border-emerald-500/30 px-6 min-w-[120px] bg-white/5 rounded-t-lg">
                        {input}
                    </div>
                 </motion.div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                 <EliteAvatar status={status} isScared={laserY > 50} />
              </div>
            </div>

            {/* CLAVIER */}
            <div className="flex-1 flex flex-col justify-end gap-2 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "-", 0].map(n => (
                  <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => handleKey(n.toString())} className="h-14 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black active:bg-emerald-500 active:text-black transition-colors">
                    {n}
                  </motion.button>
                ))}
                <button onClick={() => setInput("")} className="bg-rose-500/10 text-rose-500 rounded-2xl font-bold text-xs border border-rose-500/20">EFFACER</button>
              </div>
              <button onClick={cashout} className="w-full py-5 bg-emerald-600 text-black font-black rounded-2xl text-xl shadow-xl active:scale-95 border-b-4 border-emerald-900 mt-1">
                ENCAISSER {(bet * multiplier).toFixed(0)} HTG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TUTORIEL MODAL */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-zinc-900 border-2 border-emerald-500/50 p-8 rounded-[3rem] max-w-xs relative shadow-[0_0_50px_rgba(16,185,129,0.2)]">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Info className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-2xl text-center text-emerald-500 mb-6 tracking-tighter">MANUEL DE PIRATAGE</h3>
              <ul className="text-[10px] space-y-5 text-zinc-400 font-bold tracking-wide">
                <li className="flex gap-4 items-start"><span className="bg-emerald-500 text-black px-2 rounded">1</span> <p>RÉSOLVEZ LES CALCULS POUR RÉINITIALISER LE LASER.</p></li>
                <li className="flex gap-4 items-start"><span className="bg-emerald-500 text-black px-2 rounded">2</span> <p>ATTENTION : LA VITESSE AUGMENTE TOUTES LES 2 RÉPONSES !</p></li>
                <li className="flex gap-4 items-start"><span className="bg-rose-500 text-black px-2 rounded">3</span> <p>CHAQUE ERREUR DE FRAPPE ACCÉLÈRE LE LASER DÉFINITIVEMENT.</p></li>
              </ul>
              <button onClick={closeTutorial} className="w-full mt-10 py-5 bg-emerald-600 text-black rounded-2xl font-black text-lg shadow-lg">J'AI COMPRIS</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÉCRAN DE FIN */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-6">
                    {status === 'lost' ? <ShieldAlert size={100} className="text-rose-600 animate-pulse" /> : <Unlock size={100} className="text-emerald-500 animate-bounce" />}
                </div>
                <h2 className="text-6xl font-black italic tracking-tighter">{status === 'lost' ? 'DÉTECTÉ !' : 'VAULT OPENED'}</h2>
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full mt-8 mb-8">
                    <p className="text-[10px] text-zinc-500 mb-2 tracking-[0.5em]">MONTANT TRANSFÉRÉ</p>
                    <p className="text-5xl text-white font-black">{status === 'lost' ? '0' : (bet * multiplier).toFixed(0)} <span className="text-xl text-emerald-500">HTG</span></p>
                </div>
                <button onClick={() => setStatus('idle')} className="w-full py-6 bg-white text-black rounded-3xl font-black text-xl hover:bg-emerald-500 transition-colors">RETOUR AU TERMINAL</button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
