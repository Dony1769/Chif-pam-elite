"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Skull, Loader2, ChevronLeft, ArrowUpCircle, DoorOpen, LogOut } from 'lucide-react';

// --- COMPOSANT AVATAR ARTICULÉ (ÉLITE) ---
const EliteAvatar = ({ isWalking, status }: { isWalking: boolean; status: string }) => (
  <motion.div 
    className="relative w-14 h-24"
    animate={status === 'falling' ? { rotate: 180, scale: 0.8 } : {}}
  >
    {/* Tête */}
    <motion.div className="absolute top-0 left-4 w-6 h-6 bg-orange-200 rounded-full border-2 border-black/20 z-20" />
    {/* Corps */}
    <div className="absolute top-6 left-3 w-8 h-12 bg-emerald-600 rounded-lg border-2 border-emerald-400/30 z-10" />
    {/* Bras */}
    <motion.div 
      animate={isWalking ? { rotate: [30, -30] } : { rotate: 10 }}
      transition={{ repeat: Infinity, duration: 0.5, direction: "alternate" }}
      className="absolute top-7 left-1 w-2 h-8 bg-emerald-700 rounded-full origin-top" 
    />
    <motion.div 
      animate={isWalking ? { rotate: [-30, 30] } : { rotate: -10 }}
      transition={{ repeat: Infinity, duration: 0.5, direction: "alternate" }}
      className="absolute top-7 right-1 w-2 h-8 bg-emerald-700 rounded-full origin-top" 
    />
    {/* Jambes */}
    <motion.div 
      animate={isWalking ? { rotate: [-25, 25] } : { rotate: 0 }}
      transition={{ repeat: Infinity, duration: 0.5, direction: "alternate" }}
      className="absolute bottom-0 left-3 w-2.5 h-10 bg-emerald-800 rounded-full origin-top" 
    />
    <motion.div 
      animate={isWalking ? { rotate: [25, -25] } : { rotate: 0 }}
      transition={{ repeat: Infinity, duration: 0.5, direction: "alternate" }}
      className="absolute bottom-0 right-3 w-2.5 h-10 bg-emerald-800 rounded-full origin-top" 
    />
  </motion.div>
);

export default function HellElevator() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'intro' | 'playing' | 'falling' | 'won'>('idle');
  const [bet, setBet] = useState(50);
  const [floor, setFloor] = useState(1);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

  // Système de traduction identique au Quiz
  const translate = async (text: string) => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0][0][0];
    } catch { return text; }
  };

  const startSequence = async () => {
    setLoading(true);
    try {
      // 1. Appel RPC pour payer la mise
      const { data: gId, error } = await supabase.rpc('start_elevator_game', { p_bet: bet });
      if (error) throw new Error("Solde insuffisant");
      setGameId(gId);

      // 2. Charger les questions (OpenTDB)
      const res = await fetch(`https://opentdb.com/api.php?amount=20&type=multiple&encode=url3986`);
      const raw = await res.json();
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const questionFr = await translate(decodeURIComponent(q.question));
        const correctFr = await translate(decodeURIComponent(q.correct_answer));
        const incorrectsFr = await Promise.all(q.incorrect_answers.map((ans: string) => translate(decodeURIComponent(ans))));
        return {
          question: questionFr,
          correct: correctFr,
          answers: [correctFr, ...incorrectsFr].sort(() => Math.random() - 0.5)
        };
      }));

      setQuestions(processed);
      setLoading(false);
      setStatus('intro'); // Lancer l'intro immersive

      // 3. Après 3s d'intro, on commence le jeu
      setTimeout(() => setStatus('playing'), 3500);
    } catch (e: any) {
      alert(e.message);
      setLoading(false);
    }
  };

  const handleAnswer = async (ans: string) => {
    if (ans === questions[currentIndex].correct) {
      setFloor(f => f + 1);
      setCurrentIndex(c => c + 1);
    } else {
      setStatus('falling');
      await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'elevator_games', p_payout: 0, p_win: false });
    }
  };

  const cashout = async () => {
    const payout = Math.floor(bet * (1 + floor * 0.4));
    await supabase.rpc('process_game_result', { p_game_id: gameId, p_table_name: 'elevator_games', p_payout: payout, p_win: true });
    setStatus('won');
  };

  return (
    <div className="h-screen bg-[#050508] text-white overflow-hidden font-black italic uppercase select-none relative">
      
      {/* HEADER COMPACT */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <div className="text-center">
            <h1 className="text-xl text-emerald-500 tracking-tighter">HELL ELEVATOR</h1>
            <p className="text-[7px] tracking-[0.3em] text-white/30">NIVEAU ÉLITE</p>
        </div>
        <div className="w-10"/>
      </div>

      {/* --- PHASE 1 : MENU --- */}
      {status === 'idle' && (
        <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
             <ArrowUpCircle size={100} className="text-emerald-500/20 animate-pulse" />
             <div className="absolute inset-0 flex items-center justify-center">
                <EliteAvatar isWalking={false} status="idle" />
             </div>
          </div>
          
          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full max-w-xs text-center space-y-4">
            <p className="text-xs text-emerald-500">MISE HTG</p>
            <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none" />
            <button onClick={startSequence} disabled={loading} className="w-full py-5 bg-emerald-500 text-black rounded-3xl text-2xl flex justify-center">
              {loading ? <Loader2 className="animate-spin"/> : "MONTER"}
            </button>
          </div>
        </div>
      )}

      {/* --- PHASE 2 : INTRO IMMERSIVE (L'AVATAR MARCHE) --- */}
      {status === 'intro' && (
        <div className="h-full flex flex-col items-center justify-center">
          <motion.div 
            initial={{ x: -200, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            transition={{ duration: 2 }}
            className="z-20"
          >
            <EliteAvatar isWalking={true} status="idle" />
          </motion.div>
          
          {/* L'ascenseur au loin */}
          <div className="mt-10 w-40 h-64 bg-zinc-900 border-4 border-emerald-500/30 rounded-t-3xl relative overflow-hidden">
             <motion.div 
               initial={{ width: "100%" }} 
               animate={{ width: "0%" }} 
               transition={{ delay: 2.2, duration: 0.8 }}
               className="absolute inset-0 bg-zinc-800 z-10 border-l border-emerald-500/50"
             />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-1 bg-emerald-500 shadow-[0_0_15px_emerald]" />
             </div>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="mt-6 text-emerald-500">ACCÈS ÉTAGE 1...</motion.p>
        </div>
      )}

      {/* --- PHASE 3 : LE JEU --- */}
      {status === 'playing' && (
        <div className="h-full flex flex-col pt-24 px-6 pb-10 relative">
          {/* Background : Gaine d'ascenseur qui défile */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <motion.div 
              animate={{ y: [-100, 0] }} 
              transition={{ repeat: Infinity, duration: 0.4, ease: "linear" }} 
              className="h-[200%] w-full bg-[linear-gradient(to_bottom,#333_2px,transparent_2px)] bg-[length:100%_60px]" 
            />
          </div>

          <div className="z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-[10px] text-zinc-500 tracking-widest">ÉTAGE</p>
                    <h2 className="text-6xl text-emerald-500">{floor}</h2>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-zinc-500 tracking-widest">GAIN</p>
                    <h2 className="text-2xl text-amber-500">{(bet * (1 + floor * 0.4)).toFixed(0)}</h2>
                </div>
            </div>

            <motion.div 
              key={currentIndex} 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="bg-white text-black p-8 rounded-[2.5rem] shadow-2xl relative"
            >
              <p className="text-center text-lg leading-tight">{questions[currentIndex]?.question}</p>
            </motion.div>

            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(a)}
                  className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm tracking-tighter"
                >
                  {a}
                </motion.button>
              ))}
            </div>

            <button onClick={cashout} className="w-full py-5 bg-amber-500 text-black rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">
                ENCAISSER & SORTIR
            </button>
          </div>
        </div>
      )}

      {/* --- PHASE 4 : LA CHUTE (GAME OVER) --- */}
      <AnimatePresence>
        {status === 'falling' && (
          <motion.div 
            initial={{ y: -1000 }} 
            animate={{ y: 0 }} 
            className="fixed inset-0 bg-rose-600 z-[100] flex flex-col items-center justify-center p-10 text-center"
          >
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 0.2 }}>
                <Skull size={120} />
            </motion.div>
            <h2 className="text-7xl font-black italic mt-6 tracking-tighter">CRASH !</h2>
            <p className="opacity-80 text-lg">L'ASCENSEUR S'EST ÉCRASÉ AU SOL.</p>
            <button onClick={() => window.location.reload()} className="mt-12 w-full max-w-xs py-5 bg-black text-white rounded-3xl font-black">RETOUR AU REZ-DE-CHAUSSÉE</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PHASE 5 : VICTOIRE (CASHOUT) --- */}
      <AnimatePresence>
        {status === 'won' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-10 text-center">
            <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50 mb-6">
                <LogOut size={60} className="text-emerald-500" />
            </div>
            <h2 className="text-5xl text-emerald-500 font-black tracking-tighter">JACKPOT !</h2>
            <p className="text-white/40 mb-8 uppercase tracking-widest">Vous avez quitté l'ascenseur à temps.</p>
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full mb-8">
                <p className="text-4xl text-white font-black">{(bet * (1 + floor * 0.4)).toFixed(0)} <span className="text-xs text-zinc-500">HTG</span></p>
            </div>
            <button onClick={() => router.push('/client/games')} className="w-full py-5 bg-white text-black rounded-3xl font-black text-xl">VOIR MON SOLDE</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

