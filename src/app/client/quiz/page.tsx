"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Zap, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SETTINGS = {
  facile: { time: 10, step: 0.15 },
  intermédiaire: { time: 7, step: 0.25 },
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

export default function QuizElite() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [category, setCategory] = useState(9);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost'>('idle');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<any>(null);

  const translate = async (text: string) => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0][0][0];
    } catch { return text; }
  };

  const start = async () => {
    if (bet < 10 || isProcessing) return;
    setIsProcessing(true);
    setStatus('loading');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // 1. Déduction du solde
      const { data: paid, error: betError } = await supabase.rpc('process_bet', { amount: bet });
      if (betError || !paid) { 
        alert("Solde insuffisant"); 
        setStatus('idle');
        return; 
      }

      // 2. Récupération des questions
      const res = await fetch(`https://opentdb.com/api.php?amount=15&category=${category}&type=multiple&encode=url3986`);
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

      // 3. Création de la partie en DB
      const { data: game, error: insErr } = await supabase.from('quiz_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        difficulty,
        questions_data: processed
      }]).select().single();

      if (insErr) throw insErr;

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(1.0);
      setTimeLeft(SETTINGS[difficulty].time);
      setStatus('playing');
    } catch (e) {
      console.error(e);
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && !showCorrection) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 0.1), 100);
    } else if (timeLeft <= 0 && status === 'playing' && !showCorrection) {
      handleAnswer(null);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, status, showCorrection]);

  const handleAnswer = (ans: string | null) => {
    if (showCorrection || isProcessing) return;
    
    setSelectedAnswer(ans);
    const isCorrect = ans === questions[currentIndex].correct;

    if (isCorrect) {
      const newM = parseFloat((multiplier + SETTINGS[difficulty].step).toFixed(2));
      setMultiplier(newM);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(SETTINGS[difficulty].time);
      } else { 
        cashout(newM); 
      }
    } else {
      setShowCorrection(true);
      clearInterval(timerRef.current);
      setTimeout(() => setStatus('lost'), 2000);
    }
  };

  const cashout = async (finalM: number) => {
    if (isProcessing || !gameId) return;
    setIsProcessing(true);
    clearInterval(timerRef.current);

    try {
      const { data, error } = await supabase.rpc('claim_quiz_win', { 
        p_game_id: gameId, 
        p_final_multiplier: finalM 
      });

      if (error || !data) throw new Error("Erreur transaction");
      setStatus('ended');
    } catch (e) {
      alert("Erreur lors de l'encaissement.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <h1 className="text-2xl text-emerald-500 tracking-tighter">QUIZ ELITE</h1>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md space-y-4">
        {status === 'idle' || status === 'loading' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                  {c.icon} <span className="text-[7px]">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              {(['facile', 'intermédiaire', 'difficile'] as const).map(m => (
                <button key={m} onClick={() => setDifficulty(m)} className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === m ? 'bg-white text-black font-black' : 'text-slate-500 font-medium'}`}>
                  {m}
                </button>
              ))}
            </div>

            <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/10 flex justify-between items-center">
                <span className="text-emerald-500 text-xs">MISE HTG</span>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-right outline-none w-24 text-2xl font-black"/>
              </div>
              <button onClick={start} disabled={status === 'loading'} className="w-full py-6 bg-emerald-500 text-black rounded-3xl text-2xl shadow-lg active:scale-95 transition-all flex justify-center">
                {status === 'loading' ? <Loader2 className="animate-spin"/> : "JOUER"}
              </button>
            </div>
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-5 animate-in zoom-in duration-300">
            <div className="flex justify-between gap-3 text-center">
              <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[8px] text-slate-500 mb-1">COTE</p>
                <p className="text-emerald-500 text-xl">{multiplier.toFixed(2)}X</p>
              </div>
              <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[8px] text-slate-500 mb-1">GAIN PROBABLE</p>
                <p className="text-amber-500 text-xl">{(bet * multiplier).toFixed(0)}</p>
              </div>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>

            <div className="bg-white text-black p-8 rounded-[2rem] text-center min-h-[160px] flex items-center justify-center shadow-2xl">
              <p className="text-lg leading-tight uppercase font-black">{questions[currentIndex]?.question}</p>
            </div>

            <div className="grid gap-2">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/10";
                if (showCorrection && isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-105";
                if (showCorrection && isSelected && !isCorrect) style = "bg-rose-600 border-rose-400 text-white animate-shake";

                return (
                  <button key={i} onClick={() => handleAnswer(a)} disabled={showCorrection || isProcessing} className={`p-5 border rounded-2xl text-left transition-all font-bold ${style}`}>
                    {a}
                  </button>
                );
              })}
            </div>

            {!showCorrection && (
              <button onClick={() => cashout(multiplier)} disabled={isProcessing} className="w-full py-5 bg-amber-500 text-black rounded-2xl font-black text-xl active:scale-95 transition-all flex justify-center">
                {isProcessing ? <Loader2 className="animate-spin" /> : "ENCAISSER"}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-10 space-y-6">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${status === 'lost' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                {status === 'lost' ? <XCircle size={50} className="text-rose-500"/> : <Trophy size={50} className="text-emerald-500"/>}
            </div>
            <h2 className={`text-5xl font-black ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>{status === 'lost' ? "PERDU" : "ELITE !"}</h2>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <p className="text-slate-400 text-xs mb-1">GAINS</p>
                <p className="text-4xl font-black">{(status === 'lost' ? 0 : bet * multiplier).toFixed(0)} <span className="text-xs text-slate-500">HTG</span></p>
            </div>
            <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg">REJOUER</button>
          </div>
        )}
      </div>
    </div>
  );
}
