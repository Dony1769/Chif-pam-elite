"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Zap, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SETTINGS = {
  facile: { time: 10, step: 0.15, label: "FACILE" },
  intermédiaire: { time: 7, step: 0.25, label: "MOYEN" },
  difficile: { time: 4, step: 0.50, label: "DIFFICILE" }
};

const CATEGORIES = [
  { id: 9, name: "Général", icon: <Brain size={18}/> },
  { id: 23, name: "Histoire", icon: <Globe size={18}/> },
  { id: 18, name: "Tech", icon: <Laptop size={18}/> },
  { id: 12, name: "Musique", icon: <Music size={18}/> },
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
  const timerRef = useRef<any>(null);

  // Système de traduction ultra-rapide (Proxy libre)
  const translate = async (text: string) => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0][0][0];
    } catch { return text; } // Backup si erreur
  };

  const start = async () => {
    if (bet < 10 || status === 'loading') return;
    setStatus('loading');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // 1. Paiement
      const { data: paid } = await supabase.rpc('process_bet', { amount: bet });
      if (!paid) { alert("Solde insuffisant"); setStatus('idle'); return; }

      // 2. Récupération & Traduction en bloc (pour éviter le lag en plein jeu)
      const res = await fetch(`https://opentdb.com/api.php?amount=10&category=${category}&type=multiple`);
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

      // 3. Création du jeu en DB
      const { data: game } = await supabase.from('quiz_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(1.0);
      setTimeLeft(SETTINGS[difficulty].time);
      setStatus('playing');
    } catch (e) {
      alert("Erreur serveur. Réessayez.");
      setStatus('idle');
    }
  };

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 0.1), 100);
    } else if (timeLeft <= 0 && status === 'playing') {
      setStatus('lost');
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, status]);

  const handleAnswer = (ans: string) => {
    if (ans === questions[currentIndex].correct) {
      const newM = parseFloat((multiplier + SETTINGS[difficulty].step).toFixed(2));
      setMultiplier(newM);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(c => c + 1);
        setTimeLeft(SETTINGS[difficulty].time);
      } else { cashout(newM); }
    } else { setStatus('lost'); }
  };

  const cashout = async (m: number) => {
    setStatus('ended');
    await supabase.rpc('claim_quiz_win', { game_id: gameId, final_multiplier: m });
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ChevronLeft/></button>
        <h1 className="text-2xl text-emerald-500 tracking-tighter">QUIZ ELITE</h1>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md space-y-6">
        {status === 'idle' || status === 'loading' ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Categories */}
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                  {c.icon} <span className="text-[8px]">{c.name}</span>
                </button>
              ))}
            </div>

            {/* Mode */}
            <div className="flex gap-2">
              {(['facile', 'intermédiaire', 'difficile'] as const).map(m => (
                <button key={m} onClick={() => setDifficulty(m)} className={`flex-1 py-4 rounded-xl text-[10px] border transition-all ${difficulty === m ? 'bg-white text-black' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                  {m}
                </button>
              ))}
            </div>

            <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/10 flex justify-between">
                <span className="text-emerald-500">MISE</span>
                <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-right outline-none w-20"/>
              </div>
              <button onClick={start} disabled={status === 'loading'} className="w-full py-6 bg-emerald-500 text-black rounded-3xl text-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex justify-center">
                {status === 'loading' ? <Loader2 className="animate-spin"/> : "JOUER"}
              </button>
            </div>
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-between bg-white/5 p-5 rounded-2xl border border-white/10">
              <div className="text-emerald-500 text-2xl">{multiplier.toFixed(2)}X</div>
              <div className="text-amber-500 text-2xl">{(bet * multiplier).toFixed(0)} HTG</div>
            </div>

            {/* Timer Progress */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 transition-all duration-100" style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>

            {/* Question */}
            <div className="bg-white text-black p-8 rounded-[2rem] text-center min-h-[180px] flex items-center justify-center shadow-2xl">
              <p className="text-xl leading-tight uppercase font-black">{questions[currentIndex]?.question}</p>
            </div>

            {/* Answers */}
            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => (
                <button key={i} onClick={() => handleAnswer(a)} className="p-5 bg-white/5 border border-white/10 rounded-2xl text-left hover:bg-emerald-500 hover:text-black transition-all">
                  {a}
                </button>
              ))}
            </div>

            <button onClick={() => cashout(multiplier)} className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black">ENCAISSER</button>
          </div>
        ) : (
          <div className="text-center py-10 space-y-6 animate-in zoom-in">
            {status === 'lost' ? <XCircle size={80} className="text-rose-500 mx-auto"/> : <Trophy size={80} className="text-emerald-500 mx-auto"/>}
            <h2 className="text-4xl font-black">{status === 'lost' ? "PERDU" : "GAGNÉ !"}</h2>
            <p className="text-2xl text-slate-400">{status === 'lost' ? "0" : (bet * multiplier).toFixed(0)} HTG</p>
            <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white/10 rounded-2xl">RETOUR</button>
          </div>
        )}
      </div>
    </div>
  );
}

