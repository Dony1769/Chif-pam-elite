"use client";
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin, Construction, Wallet, Zap } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChallenge } from '@/hooks/useChallenge';

const SETTINGS = {
  facile: { time: 10, step: 0.15 },
  intermédiaire: { time: 7, step: 0.20 },
  difficile: { time: 4, step: 0.50 }
};

const CATEGORIES = [
  { id: 9, name: "Général", icon: <Brain size={18}/> },
  { id: 23, name: "Histoire", icon: <Globe size={18}/> },
  { id: 11, name: "Film", icon: <Film size={18}/> },
  { id: 21, name: "Sports", icon: <Award size={18}/> },
  { id: 18, name: "Tech", icon: <Laptop size={18}/> },
  { id: 12, name: "Musique", icon: <Music size={18}/> },
  { id: 10, name: "Livres", icon: <BookOpen size={18}/> },
  { id: 22, name: "Géo", icon: <MapPin size={18}/> },
];

function QuizGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const { calculateFinalFee } = useChallenge();

  const [profile, setProfile] = useState<any>(null);
  const [bet, setBet] = useState(10);
  const [actualPaidFee, setActualPaidFee] = useState(0); 
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [category, setCategory] = useState(9);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Maintenance en cours...");
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<any>(null);

  // Logique de redirection dynamique
  const handleBack = () => {
    if (challengeId) {
      router.push('/client/challenges');
    } else {
      router.push('/client/home');
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
      }
      checkMaintenance();
    };
    init();
  }, []);

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'quiz').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg);
        setStatus('maintenance');
      } else {
        setStatus('idle');
      }
    } catch (e) { setStatus('idle'); }
  };

  const translate = async (text: string) => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0][0][0];
    } catch { return text; }
  };

  const start = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatus('loading');

    try {
      let finalFee = bet;

      if (challengeId) {
        const { data: chall } = await supabase.from('challenges').select('entry_fee_base').eq('id', challengeId).single();
        if (!chall) throw new Error("Défi introuvable");
        
        finalFee = calculateFinalFee(chall.entry_fee_base, profile?.vip_status);
        
        const { data: success, error: payError } = await supabase.rpc('process_challenge_payment', { 
            p_challenge_id: challengeId,
            p_amount: finalFee 
        });

        if (payError || !success) throw new Error("Solde insuffisant pour ce défi.");
        setActualPaidFee(finalFee);
      } else {
        const { data: paid, error: betError } = await supabase.rpc('process_bet', { amount: bet });
        if (betError || !paid) throw new Error("Solde insuffisant.");
      }

      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a:string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a:string) => translate(a))]);
        return { question: qF, correct: cF, answers: [cF, ...iF].sort(() => Math.random() - 0.5) };
      }));

      if (!challengeId) {
        const { data: game } = await supabase.from('quiz_games').insert([{
          user_id: profile.id, bet_amount: bet, difficulty, questions_data: processed, is_active: true
        }]).select().single();
        setGameId(game.id);
      }

      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(1.0);
      setTimeLeft(SETTINGS[difficulty].time);
      setStatus('playing');
    } catch (e: any) {
      alert(e.message);
      setStatus('idle');
    } finally { setIsProcessing(false); }
  };

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && !showCorrection) {
      timerRef.current = setInterval(() => setTimeLeft(p => Math.max(0, parseFloat((p - 0.1).toFixed(1)))), 100);
    } else if (timeLeft <= 0 && status === 'playing' && !showCorrection) {
      handleAnswer(null);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, status, showCorrection]);

  const handleAnswer = (ans: string | null) => {
    if (showCorrection || status !== 'playing') return;
    clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true);

    if (ans === questions[currentIndex].correct) {
      const nextM = parseFloat((multiplier + SETTINGS[difficulty].step).toFixed(2));
      setMultiplier(nextM);
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(p => p + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(SETTINGS[difficulty].time);
        } else { finalizeGame(true); }
      }, 1500);
    } else {
      finalizeGame(false);
    }
  };

  const finalizeGame = async (isWin: boolean) => {
    setIsProcessing(true);
    try {
      if (challengeId) {
        const sessionScore = currentIndex * 10 + (isWin ? 10 : 0);
        
        const { error: attemptError } = await supabase.from('challenge_attempts').insert([{
            challenge_id: challengeId,
            user_id: profile.id,
            score_gained: sessionScore,
            amount_paid: actualPaidFee
        }]);

        if (attemptError) throw attemptError;
        setStatus(isWin ? 'ended' : 'lost');
      } else {
        if (isWin) {
          await supabase.rpc('claim_quiz_win', { p_game_id: gameId, p_final_multiplier: multiplier });
          setStatus('ended');
        } else {
          if (gameId) await supabase.from('quiz_games').update({ is_active: false }).eq('id', gameId);
          setStatus('lost');
        }
      }
    } catch (e) { 
      console.error("Erreur de finalisation:", e);
    } finally { 
      setIsProcessing(false); 
      setShowCorrection(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={handleBack} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all shadow-xl">
          <ChevronLeft/>
        </button>
        <h1 className="text-2xl text-emerald-500 italic tracking-tighter underline decoration-white/10 underline-offset-8 uppercase">
          {challengeId ? "ARENA_QUIZ" : "QUIZ_ELITE"}
        </h1>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md space-y-4">
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white/5 rounded-[3rem] border border-white/5 backdrop-blur-md">
            <Construction size={60} className="text-amber-500 animate-pulse" />
            <div className="text-center">
                <h2 className="text-3xl text-amber-500 tracking-tighter italic">UNITÉ_MAINTENANCE</h2>
                <p className="text-slate-500 text-[10px] mt-2 px-10 leading-relaxed tracking-widest uppercase">{maintenanceMsg}</p>
            </div>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          <div className="space-y-6">
            {status === 'loading' ? (
               <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-emerald-500" size={50}/>
                    <p className="text-[8px] text-emerald-500/50 tracking-[0.3em] italic">SYNC_DATABASE_NODE...</p>
               </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setCategory(c.id)} className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}>
                      {c.icon} <span className="text-[7px] font-black italic">{c.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(SETTINGS).map((lv) => (
                    <button key={lv} onClick={() => setDifficulty(lv as any)} className={`py-3 rounded-2xl border text-[10px] transition-all font-black italic uppercase ${difficulty === lv ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                      {lv}
                    </button>
                  ))}
                </div>

                {!challengeId && (
                  <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/10 flex justify-between items-center group">
                      <span className="text-emerald-500 text-[10px] italic font-bold">ALLOCATION_HTG</span>
                      <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-right outline-none w-24 text-3xl font-black text-white group-focus-within:text-emerald-500 transition-colors"/>
                    </div>
                  </div>
                )}
                
                <button 
                    onClick={start} 
                    disabled={isProcessing}
                    className={`w-full py-7 rounded-[2.5rem] text-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all active:scale-95 ${challengeId ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'} font-black italic`}
                >
                  {challengeId ? "INITIALISER LA TENTATIVE" : "START_ELITE_SESSION"}
                </button>
              </>
            )}
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-end px-2">
                <div className="text-left">
                    <p className="text-[10px] text-slate-500 tracking-widest italic font-bold">MULT_X</p>
                    <p className="text-3xl text-emerald-500 font-black italic tracking-tighter">{multiplier.toFixed(2)}</p>
                </div>
                {multiplier > 1.5 && !challengeId && (
                    <button 
                        onClick={() => finalizeGame(true)}
                        className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black flex items-center gap-2 animate-bounce shadow-2xl"
                    >
                        <Wallet size={14}/> CASHOUT_SYSTEM
                    </button>
                )}
            </div>

            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className={`h-full transition-all duration-100 ease-linear ${timeLeft < 2 ? 'bg-rose-500 shadow-[0_0_15px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_15px_#10b981]'}`} style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>

            <div className="bg-white text-black p-10 rounded-[3.5rem] text-center min-h-[200px] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden border-b-[8px] border-emerald-500/20">
              <div className="absolute top-4 left-0 w-full flex justify-center">
                <span className="text-[9px] text-slate-400 tracking-[0.5em] font-black uppercase italic">CORE_TASK {currentIndex + 1} / 5</span>
              </div>
              <p className="text-xl leading-tight font-black uppercase italic tracking-tighter">{questions[currentIndex]?.question}</p>
            </div>

            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/5 text-white";
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.03] z-10 shadow-[0_0_30px_rgba(16,185,129,0.5)]";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-60";
                  else style = "opacity-20";
                }
                return (
                  <button key={i} onClick={() => handleAnswer(a)} disabled={showCorrection} className={`p-6 border rounded-[1.8rem] text-left transition-all font-black text-xs italic ${style} active:scale-95`}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative inline-block">
                <div className={`absolute inset-0 blur-3xl opacity-30 ${status === 'lost' ? 'bg-rose-600' : 'bg-emerald-500'}`} />
                <div className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center relative border-2 ${status === 'lost' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    {status === 'lost' ? <XCircle size={70} className="text-rose-500"/> : <Trophy size={70} className="text-emerald-500"/>}
                </div>
            </div>

            <div>
                <h2 className={`text-6xl font-black italic tracking-tighter ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>{status === 'lost' ? "FAILED" : "SUCCESS"}</h2>
                <p className="text-[10px] text-slate-500 tracking-[0.5em] mt-3 font-bold uppercase italic">TRANSACTION_COMPLETED</p>
            </div>
            
            <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <p className="text-[11px] text-slate-500 mb-4 tracking-[0.3em] font-black italic uppercase">SESSION_REVENUE</p>
                <p className="text-6xl font-black text-white italic tracking-tighter">
                    {challengeId ? (currentIndex * 10 + (status === 'ended' ? 10 : 0)) : (status === 'lost' ? 0 : (bet * multiplier).toFixed(0))} 
                    <span className="text-lg text-emerald-500 ml-3">{challengeId ? 'PTS' : 'HTG'}</span>
                </p>
                {challengeId && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <p className="text-[9px] text-emerald-500/80 tracking-widest font-black italic uppercase mb-2">ARENA_INDEX_UPDATED</p>
                        <p className="text-[8px] text-slate-600 italic uppercase">SYNC_COST: {actualPaidFee} HTG</p>
                    </div>
                )}
            </div>

            <button 
                onClick={handleBack} 
                className="w-full py-7 bg-white text-black rounded-[2.5rem] font-black text-2xl active:scale-95 transition-all shadow-2xl italic"
            >
              {challengeId ? "VOIR LE CLASSEMENT" : "RECO-SYNC"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizElite() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={50} /></div>}>
      <QuizGameContent />
    </Suspense>
  );
}

