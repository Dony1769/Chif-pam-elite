"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Timer, Brain, Music, Globe, Laptop, Zap, Trophy, Loader2, ChevronLeft, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Configuration du jeu
const SETTINGS = {
  facile: { time: 10, step: 0.15, label: "FACILE (10s)" },
  intermédiaire: { time: 7, step: 0.25, label: "MOYEN (7s)" },
  difficile: { time: 4, step: 0.50, label: "HARDCORE (4s)" }
};

const CATEGORIES = [
  { id: 19, name: "Maths", icon: <Zap size={18}/> },
  { id: 17, name: "Nature", icon: <Globe size={18}/> },
  { id: 18, name: "Tech", icon: <Laptop size={18}/> },
  { id: 23, name: "Histoire", icon: <Brain size={18}/> },
  { id: 12, name: "Musique", icon: <Music size={18}/> },
];

export default function QuizSpeedrun() {
  const router = useRouter();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [category, setCategory] = useState(23); // Histoire par défaut
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost'>('idle');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameId, setGameId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Gestion du Compte à rebours
  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 0.1), 100);
    } else if (status === 'playing' && timeLeft <= 0) {
      handleGameOver();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, status]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`https://opentdb.com/api.php?amount=15&category=${category}&type=multiple`);
      const data = await res.json();
      
      const decodeHTML = (html: string) => {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
      };

      return data.results.map((q: any) => ({
        question: decodeHTML(q.question),
        correct: decodeHTML(q.correct_answer),
        answers: [...q.incorrect_answers, q.correct_answer]
          .map(decodeHTML)
          .sort(() => Math.random() - 0.5)
      }));
    } catch (e) {
      return null;
    }
  };

  const startGame = async () => {
    if (bet < 10) return alert("Mise minimum 10 HTG");
    setStatus('loading');

    try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return router.push('/connexion');
        
        // On utilise la fonction générique process_bet (déjà existante pour Mines)
        const { data: validBet, error: betError } = await supabase.rpc('process_bet', { 
          amount: bet 
        });

        if (!validBet || betError) {
          setStatus('idle');
          return alert("Solde insuffisant.");
        }

        const loadedQuestions = await fetchQuestions();
        if (!loadedQuestions || loadedQuestions.length === 0) {
            alert("Erreur chargement questions. Vérifiez votre connexion.");
            setStatus('idle'); 
            return;
        }

        const { data: game, error: gameError } = await supabase.from('quiz_games').insert([{
          user_id: user.user.id,
          bet_amount: bet,
          difficulty: difficulty,
          questions_data: loadedQuestions,
          multiplier: 1.0,
          is_active: true
        }]).select().single();

        if (gameError) throw gameError;

        setGameId(game.id);
        setQuestions(loadedQuestions);
        setCurrentQIndex(0);
        setMultiplier(1.0);
        setTimeLeft(SETTINGS[difficulty].time);
        setStatus('playing');
    } catch (err) {
        setStatus('idle');
        alert("Erreur technique au lancement.");
    }
  };

  const handleAnswer = (answer: string) => {
    const currentQ = questions[currentQIndex];
    
    if (answer === currentQ.correct) {
      const nextMult = parseFloat((multiplier + SETTINGS[difficulty].step).toFixed(2));
      setMultiplier(nextMult);
      
      if (currentQIndex + 1 < questions.length) {
        setCurrentQIndex(prev => prev + 1);
        setTimeLeft(SETTINGS[difficulty].time);
      } else {
        cashout(nextMult);
      }
    } else {
      handleGameOver();
    }
  };

  const handleGameOver = async () => {
    setStatus('lost');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (gameId) {
        await supabase.from('quiz_games').update({ is_active: false, is_won: false }).eq('id', gameId);
    }
  };

  const cashout = async (finalMult = multiplier) => {
    setStatus('ended'); // On passe en ended AVANT l'appel pour bloquer l'interface
    if (timerRef.current) clearTimeout(timerRef.current);
    
    try {
        const { error } = await supabase.rpc('claim_quiz_win', { 
          game_id: gameId, 
          final_multiplier: finalMult 
        });
        if (error) throw error;
    } catch(e) {
        alert("Erreur lors de l'enregistrement du gain.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-bold flex flex-col items-center select-none">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-full"><ChevronLeft /></button>
        <h1 className="text-xl text-emerald-500 italic uppercase">Brain Storm</h1>
        <div className="w-10" />
      </div>

      <div className="w-full max-w-md space-y-6">
        
        {/* CORRECTION ICI : On autorise l'affichage si IDLE ou LOADING */}
        {(status === 'idle' || status === 'loading') && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            <div>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Sujet</p>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                    <button 
                    key={cat.id} 
                    onClick={() => setCategory(cat.id)}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 min-w-[80px] transition-all ${category === cat.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/5 text-slate-400'}`}
                    >
                    {cat.icon}
                    <span className="text-[10px] uppercase">{cat.name}</span>
                    </button>
                ))}
                </div>
            </div>

            <div>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Mode</p>
                <div className="flex gap-2">
                {(['facile', 'intermédiaire', 'difficile'] as const).map(d => (
                    <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-4 rounded-xl text-[10px] uppercase transition-all border ${difficulty === d ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                    >
                    {SETTINGS[d].label}
                    <br/>
                    <span className="text-[9px] opacity-70">+{SETTINGS[d].step}x / question</span>
                    </button>
                ))}
                </div>
            </div>

            <div className="bg-[#0a0a0f] p-6 rounded-[2rem] border border-white/10 space-y-4 shadow-2xl">
                <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="text-slate-400 text-sm">MISE (HTG)</span>
                    <input 
                        type="number" 
                        value={bet} 
                        onChange={(e) => setBet(Number(e.target.value))}
                        className="bg-transparent text-right text-2xl text-emerald-500 w-32 outline-none"
                    />
                </div>
                <button 
                    onClick={startGame}
                    disabled={status === 'loading'}
                    className="w-full py-5 bg-emerald-500 text-black rounded-2xl text-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                    {status === 'loading' ? <Loader2 className="animate-spin mx-auto"/> : "COMMENCER"}
                </button>
            </div>
          </div>
        )}

        {status === 'playing' && (
          <div className="animate-in zoom-in duration-300 space-y-6">
            <div className="flex justify-between items-end bg-white/5 p-4 rounded-2xl border border-white/5">
                <div>
                    <p className="text-[10px] text-slate-500 mb-1">GAIN ACTUEL</p>
                    <p className="text-2xl text-amber-500 font-black">{(bet * multiplier).toFixed(0)} HTG</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 mb-1">MULTIPLICATEUR</p>
                    <p className="text-2xl text-emerald-500 font-black">{multiplier.toFixed(2)}X</p>
                </div>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-rose-500 transition-all duration-100 ease-linear"
                    style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}
                />
            </div>

            <div className="bg-white text-black p-6 rounded-3xl shadow-xl min-h-[160px] flex items-center justify-center text-center">
                <h2 className="text-lg leading-tight font-black">{questions[currentQIndex]?.question}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {questions[currentQIndex]?.answers.map((ans: string, i: number) => (
                    <button
                        key={i}
                        onClick={() => handleAnswer(ans)}
                        className="p-4 bg-white/10 border border-white/10 rounded-xl text-left hover:bg-white/20 active:scale-95 transition-all flex justify-between items-center group"
                    >
                        <span className="text-sm font-medium">{ans}</span>
                        <ChevronLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" size={16}/>
                    </button>
                ))}
            </div>

            <button 
                onClick={() => cashout(multiplier)}
                className="w-full py-4 bg-amber-500 text-black rounded-xl text-sm tracking-[0.2em] font-black shadow-lg shadow-amber-500/20 mt-4"
            >
                ARRÊTER & ENCAISSER
            </button>
          </div>
        )}

        {status === 'lost' && (
          <div className="text-center space-y-6 animate-in zoom-in">
            <div className="inline-flex p-6 bg-rose-500/10 rounded-full border border-rose-500/20 mb-4">
                <XCircle className="text-rose-500 w-16 h-16" />
            </div>
            <h2 className="text-3xl text-rose-500 font-black italic">PERDU !</h2>
            <p className="text-slate-400 text-sm">Temps écoulé ou mauvaise réponse.</p>
            <button 
                onClick={() => setStatus('idle')}
                className="w-full py-4 bg-white/10 rounded-xl mt-8"
            >
                RÉESSAYER
            </button>
          </div>
        )}

        {status === 'ended' && (
           <div className="text-center space-y-6 animate-in zoom-in">
            <div className="inline-flex p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
                <Trophy className="text-emerald-500 w-16 h-16" />
            </div>
            <h2 className="text-3xl text-emerald-500 font-black italic">GAGNÉ !</h2>
            <p className="text-2xl text-white font-black">{(bet * multiplier).toFixed(0)} HTG</p>
            <p className="text-emerald-400 text-sm">{multiplier.toFixed(2)}X Multiplicateur</p>
            <button 
                onClick={() => setStatus('idle')}
                className="w-full py-4 bg-white/10 rounded-xl mt-8"
            >
                NOUVELLE PARTIE
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
