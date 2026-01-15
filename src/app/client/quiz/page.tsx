"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SETTINGS = {
  facile: { time: 10, step: 0.20 },
  intermédiaire: { time: 7, step: 0.50 },
  difficile: { time: 4, step: 1.00 }
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
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`, { signal: controller.signal });
      clearTimeout(id);
      const data = await res.json();
      return data[0][0][0];
    } catch { return text; }
  };

  // --- MISE À JOUR : START ---
  const start = async () => {
    if (bet < 10 || isProcessing) return;
    
    // RESET TOTAL IMMÉDIAT (Évite le bug de la réponse verte)
    setIsProcessing(true);
    setStatus('loading');
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowCorrection(false);
    setMultiplier(1.0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // 1. Fetch Questions
      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      if (!raw.results || raw.results.length === 0) throw new Error("API Offline");

      // 2. Traduction Parallèle
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a:string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a:string) => translate(a))]);
        return { question: qF, correct: cF, answers: [cF, ...iF].sort(() => Math.random() - 0.5) };
      }));

      // 3. Paiement
      const { data: paid, error: betError } = await supabase.rpc('process_bet', { amount: bet });
      if (betError || !paid) { 
        alert("Solde insuffisant."); 
        setStatus('idle');
        setIsProcessing(false);
        return; 
      }

      // 4. Création en base
      const { data: game, error: insErr } = await supabase.from('quiz_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();

      if (insErr) throw insErr;

      setGameId(game.id);
      setQuestions(processed);
      setTimeLeft(SETTINGS[difficulty].time);
      setStatus('playing');

    } catch (e) {
      alert("Erreur de connexion. L'argent n'a pas été débité. Réessayez.");
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && !showCorrection) {
      timerRef.current = setInterval(() => setTimeLeft(p => Math.max(0, parseFloat((p - 0.1).toFixed(1)))), 100);
    } else if (timeLeft <= 0 && status === 'playing' && !showCorrection) {
      handleAnswer(null);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, status, showCorrection]);

  // --- MISE À JOUR : HANDLE ANSWER ---
  const handleAnswer = (ans: string | null) => {
    // SÉCURITÉ : Si on est en train d'encaisser (isProcessing), on ignore le timer/clic
    if (showCorrection || status !== 'playing' || isProcessing) return;
    
    clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true);

    const currentQ = questions[currentIndex];
    const isCorrect = ans === currentQ.correct;

    if (isCorrect) {
      const nextM = parseFloat((multiplier + SETTINGS[difficulty].step).toFixed(2));
      setMultiplier(nextM);
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(SETTINGS[difficulty].time);
        } else { 
          cashout(nextM); 
        }
      }, 1500);
    } else {
      if (gameId) supabase.from('quiz_games').update({ is_active: false }).eq('id', gameId);
      setTimeout(() => setStatus('lost'), 2000);
    }
  };

  // --- MISE À JOUR : CASHOUT ---
  const cashout = async (finalM: number) => {
    if (!gameId || isProcessing) return;
    setIsProcessing(true); // Bloque handleAnswer pour "sauver" l'argent (priorité sur le timer)
    try {
      const { data, error } = await supabase.rpc('claim_quiz_win', { 
        p_game_id: gameId, 
        p_final_multiplier: finalM 
      });
      if (error) throw error;
      setStatus('ended');
    } catch (e) {
      console.error("Détail erreur:", e);
      alert("Erreur lors de l'encaissement. Vérifiez votre connexion.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black uppercase flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => status === 'playing' ? null : router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft/>
        </button>
        <h1 className="text-2xl text-emerald-500 italic">QUIZ ELITE</h1>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md space-y-4">
        {status === 'idle' || status === 'loading' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                  {c.icon} <span className="text-[7px] font-bold">{c.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              {(['facile', 'intermédiaire', 'difficile'] as const).map(m => (
                <button key={m} onClick={() => setDifficulty(m)} className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === m ? 'bg-white text-black' : 'text-slate-500'}`}>
                  {m}
                </button>
              ))}
            </div>
            <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/10 flex justify-between items-center">
                <span className="text-emerald-500 text-xs">MISE (HTG)</span>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-right outline-none w-24 text-2xl font-black"/>
              </div>
              <button onClick={start} disabled={status === 'loading'} className="w-full py-6 bg-emerald-500 text-black rounded-3xl text-xl shadow-lg active:scale-95 transition-all flex justify-center">
                {status === 'loading' ? <Loader2 className="animate-spin"/> : "JOUER (5 QUESTIONS)"}
              </button>
            </div>
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-5 animate-in zoom-in duration-300">
            <div className="flex justify-between gap-3 text-center">
              <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[8px] text-slate-500 mb-1">COTE</p>
                <p className="text-emerald-500 text-xl font-black">{multiplier.toFixed(2)}x</p>
              </div>
              <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[8px] text-slate-500 mb-1">POTENTIEL</p>
                <p className="text-amber-500 text-xl font-black">{(bet * multiplier).toFixed(0)}</p>
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-100 ease-linear ${timeLeft < 2 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>
            <div className="bg-white text-black p-8 rounded-[2rem] text-center min-h-[160px] flex flex-col items-center justify-center shadow-2xl">
              <span className="text-[9px] text-slate-400 mb-3 font-bold tracking-widest">QUESTION {currentIndex + 1} / 5</span>
              <p className="text-lg leading-tight font-black">{questions[currentIndex]?.question}</p>
            </div>
            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/10 text-white";
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.02] shadow-xl";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-60";
                  else style = "opacity-20";
                }
                return (
                  <button key={i} onClick={() => handleAnswer(a)} disabled={showCorrection} className={`p-5 border rounded-2xl text-left transition-all font-bold ${style}`}>
                    {a}
                  </button>
                );
              })}
            </div>
            {!showCorrection && multiplier > 1 && (
              <button onClick={() => cashout(multiplier)} className="w-full py-4 bg-amber-500 text-black rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-all">
                SÉCURISER {(bet * multiplier).toFixed(0)} HTG
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${status === 'lost' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                {status === 'lost' ? <XCircle size={60} className="text-rose-500"/> : <Trophy size={60} className="text-emerald-500"/>}
            </div>
            <h2 className={`text-6xl font-black ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>{status === 'lost' ? "PERDU" : "GAGNÉ"}</h2>
            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                <p className="text-slate-500 text-[10px] mb-2 font-bold tracking-widest">RÉSULTAT</p>
                <p className="text-5xl font-black text-white">{(status === 'lost' ? 0 : bet * multiplier).toFixed(0)} <span className="text-lg text-emerald-500">HTG</span></p>
            </div>
            <button onClick={() => setStatus('idle')} className="w-full py-6 bg-white text-black rounded-3xl font-black text-xl shadow-xl">REJOUER</button>
          </div>
        )}
      </div>
    </div>
  );
}
