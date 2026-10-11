"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Skull, Loader2, ChevronLeft, ArrowUpCircle, LogOut } from 'lucide-react';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

const EliteAvatar = ({ isWalking, status }: { isWalking: boolean; status: string }) => (
  <motion.div 
    className="relative w-14 h-24"
    animate={status === 'falling' ? { rotate: 180, scale: 0.8, y: 100 } : {}}
    transition={{ duration: 0.5 }}
  >
    <div className="absolute top-0 left-4 w-6 h-6 bg-orange-200 rounded-full border-2 border-black/20 z-20" />
    <div className="absolute top-6 left-3 w-8 h-12 bg-emerald-600 rounded-lg border-2 border-emerald-400/30 z-10" />
    
    <motion.div 
      animate={isWalking ? { rotate: [30, -30, 30] } : { rotate: 10 }}
      transition={{ repeat: Infinity, duration: 0.6 }}
      className="absolute top-7 left-1 w-2 h-8 bg-emerald-700 rounded-full origin-top" 
    />
    <motion.div 
      animate={isWalking ? { rotate: [-30, 30, -30] } : { rotate: -10 }}
      transition={{ repeat: Infinity, duration: 0.6 }}
      className="absolute top-7 right-1 w-2 h-8 bg-emerald-700 rounded-full origin-top" 
    />
    <motion.div 
      animate={isWalking ? { rotate: [-25, 25, -25] } : { rotate: 0 }}
      transition={{ repeat: Infinity, duration: 0.6 }}
      className="absolute bottom-0 left-3 w-2.5 h-10 bg-emerald-800 rounded-full origin-top" 
    />
    <motion.div 
      animate={isWalking ? { rotate: [25, -25, 25] } : { rotate: 0 }}
      transition={{ repeat: Infinity, duration: 0.6 }}
      className="absolute bottom-0 right-3 w-2.5 h-10 bg-emerald-800 rounded-full origin-top" 
    />
  </motion.div>
);

export default function HellElevator() {
  const { notify } = useAppFeedback();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'intro' | 'playing' | 'falling' | 'won'>('idle');
  const [bet, setBet] = useState(50);
  const [floor, setFloor] = useState(1);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);

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
      const { data: gId, error } = await supabase.rpc('start_elevator_game', { p_bet: bet });
      if (error) throw new Error(error.message);
      setGameId(gId);

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
      setStatus('intro');
      setTimeout(() => setStatus('playing'), 3500);
    } catch (e: any) {
      notify(e.message, 'danger');
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
      {/* BACKGROUND ANIMATION */}
      {status === 'playing' && (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <motion.div animate={{ y: [-120, 0] }} transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }} className="h-[200%] w-full bg-[linear-gradient(to_bottom,#333_2px,transparent_2px)] bg-[length:100%_60px]" />
        </div>
      )}

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <div className="text-center">
            <h1 className="text-xl text-emerald-500 tracking-tighter">HELL ELEVATOR</h1>
            <p className="text-[7px] tracking-[0.3em] text-white/30 font-bold">ELITE EXPERIENCE</p>
        </div>
        <div className="w-10"/>
      </div>

      {status === 'idle' && (
        <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in">
          <div className="relative">
             <ArrowUpCircle size={100} className="text-emerald-500/20 animate-pulse" />
             <div className="absolute inset-0 flex items-center justify-center">
                <EliteAvatar isWalking={false} status="idle" />
             </div>
          </div>
          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full max-w-xs text-center space-y-4">
            <p className="text-xs text-emerald-500">MISE HTG</p>
            <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none text-white" />
            <button onClick={startSequence} disabled={loading} className="w-full py-5 bg-emerald-500 text-black rounded-3xl text-2xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "MONTER"}
            </button>
          </div>
        </div>
      )}

      {status === 'intro' && (
        <div className="h-full flex flex-col items-center justify-center bg-black">
          <motion.div initial={{ x: -200 }} animate={{ x: 0 }} transition={{ duration: 2 }} className="z-20">
            <EliteAvatar isWalking={true} status="idle" />
          </motion.div>
          <div className="mt-10 w-40 h-64 bg-zinc-900 border-4 border-emerald-500/30 rounded-t-3xl relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]">
             <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ delay: 2.2, duration: 0.8 }} className="absolute inset-0 bg-zinc-800 z-10 border-l border-emerald-500/50" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-1 bg-emerald-500 shadow-[0_0_15px_emerald]" />
             </div>
          </div>
          <p className="mt-6 text-emerald-500 animate-pulse tracking-widest text-xs font-bold">INITIALISATION...</p>
        </div>
      )}

      {status === 'playing' && (
        <div className="h-full flex flex-col pt-24 px-6 pb-10 z-10">
          <div className="flex justify-between items-end mb-10">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-zinc-500 tracking-widest font-bold">ÉTAGE</p>
                  <h2 className="text-5xl text-emerald-500">{floor}</h2>
              </div>
              <div className="text-right bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] text-zinc-500 tracking-widest font-bold">POTENTIEL</p>
                  <h2 className="text-2xl text-amber-500">{(bet * (1 + floor * 0.4)).toFixed(0)}</h2>
              </div>
          </div>

          <motion.div key={currentIndex} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 flex flex-col justify-center">
              <div className="bg-white text-black p-8 rounded-[2.5rem] shadow-2xl mb-8 border-b-8 border-emerald-500">
                <p className="text-center text-xl leading-tight font-black">{questions[currentIndex]?.question}</p>
              </div>
              <div className="grid gap-3 mb-6">
                {questions[currentIndex]?.answers.map((a: string, i: number) => (
                  <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => handleAnswer(a)} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm tracking-tighter hover:bg-white/10">
                    {a}
                  </motion.button>
                ))}
              </div>
          </motion.div>

          <button onClick={cashout} className="w-full py-5 bg-amber-500 text-black rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">
              QUITTER & ENCAISSER
          </button>
        </div>
      )}

      <AnimatePresence>
        {status === 'falling' && (
          <motion.div initial={{ y: -1000 }} animate={{ y: 0 }} className="fixed inset-0 bg-rose-600 z-[100] flex flex-col items-center justify-center p-10 text-center">
            <Skull size={120} className="mb-6 animate-bounce" />
            <h2 className="text-7xl font-black italic tracking-tighter">CRASH !</h2>
            <p className="text-lg font-bold opacity-80">L'ASCENSEUR S'EST ÉCRASÉ.</p>
            <button onClick={() => window.location.reload()} className="mt-12 px-12 py-5 bg-black text-white rounded-3xl font-black text-xl">RECOMMENCER</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === 'won' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-10 text-center">
            <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50 mb-6">
                <LogOut size={60} className="text-emerald-500" />
            </div>
            <h2 className="text-5xl text-emerald-500 font-black tracking-tighter">SUCCÈS !</h2>
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full mt-6 mb-8">
                <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest">TOTAL GAGNÉ</p>
                <p className="text-5xl text-white font-black">{(bet * (1 + floor * 0.4)).toFixed(0)} <span className="text-xl text-zinc-500 font-bold">HTG</span></p>
            </div>
            <button onClick={() => router.push('/client/games')} className="w-full py-5 bg-white text-black rounded-3xl font-black text-xl">MENU PRINCIPAL</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
