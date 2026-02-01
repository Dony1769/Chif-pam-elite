"use client";
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin, Construction, Wallet, Zap, Coins } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  { id: 12, name: "Musique", icon: <Music size={18}/> },
  { id: 18, name: "Tech", icon: <Laptop size={18}/> },
  { id: 10, name: "Livres", icon: <BookOpen size={18}/> },
  { id: 22, name: "Géo", icon: <MapPin size={18}/> },
];

function QuizGameContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [betCP, setBetCP] = useState(100); // Mise par défaut en CP
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [category, setCategory] = useState(9);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Maintenance...");
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
    }
    checkMaintenance();
  };

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'quiz').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg);
        setStatus('maintenance');
      } else { setStatus('idle'); }
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
      // 1. Appel RPC pour retirer les jetons CP
      const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: betCP,
          p_gain_cp: 0,
          p_jeu_nom: 'Quiz'
      });

      if (payError || !result.success) throw new Error(result?.message || "Erreur de paiement CP");

      // 2. Récupération des questions (API Externe)
      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a:string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a:string) => translate(a))]);
        return { question: qF, correct: cF, answers: [cF, ...iF].sort(() => Math.random() - 0.5) };
      }));

      // 3. Enregistrement en base de données
      const { data: game } = await supabase.from('quiz_games').insert([{
        user_id: profile.id,
        mise_cp: betCP,
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
    } catch (e: any) {
      alert(e.message);
      setStatus('idle');
    } finally { setIsProcessing(false); }
  };

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
    const gainFinal = isWin ? Math.floor(betCP * multiplier) : 0;
    
    try {
        // Enregistrement du gain final en CP
        await supabase.rpc('jouer_partie_cp', {
            p_user_id: profile.id,
            p_mise_cp: 0,
            p_gain_cp: gainFinal,
            p_jeu_nom: 'Quiz Win'
        });

        await supabase.from('quiz_games').update({ 
            is_active: false, 
            gain_cp: gainFinal,
            is_won: isWin,
            win_amount: 0 // On met 0 en HTG car on joue en CP
        }).eq('id', gameId);

        setStatus(isWin ? 'ended' : 'lost');
    } catch (e) {
        console.error("Fin de jeu erreur:", e);
    } finally {
        setIsProcessing(false);
        setShowCorrection(false);
        init(); // Rafraîchir le profil (solde CP)
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

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase flex flex-col items-center select-none">
      {/* HEADER AVEC JETONS CP VISIBLES */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90">
          <ChevronLeft/>
        </button>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-emerald-500 text-sm italic">{profile?.jetons_cp || 0} CP</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {status === 'maintenance' ? (
           <div className="flex flex-col items-center py-20 bg-white/5 rounded-[3rem] border border-white/5">
                <Construction size={60} className="text-amber-500 animate-pulse" />
                <h2 className="text-2xl text-amber-500 mt-4 italic">MAINTENANCE</h2>
                <p className="text-slate-500 text-[10px] mt-2 px-10 text-center">{maintenanceMsg}</p>
           </div>
        ) : status === 'idle' || status === 'loading' ? (
          <div className="space-y-6">
            {status === 'loading' ? (
               <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-emerald-500" size={50}/></div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setCategory(c.id)} className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                      {c.icon} <span className="text-[7px] font-black italic">{c.name}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center">
                        <span className="text-emerald-500 text-[10px] italic font-bold">MISE EN JETONS CP</span>
                        <div className="flex gap-2">
                            {[100, 500, 1000].map(val => (
                                <button key={val} onClick={() => setBetCP(val)} className={`px-3 py-1 rounded-lg text-[10px] ${betCP === val ? 'bg-emerald-500 text-black' : 'bg-white/10'}`}>{val}</button>
                            ))}
                        </div>
                    </div>
                    <input type="number" value={betCP} onChange={e => setBetCP(Number(e.target.value))} className="bg-transparent text-center outline-none w-full text-4xl font-black text-white italic"/>
                </div>
                
                <button onClick={start} disabled={isProcessing} className="w-full py-7 rounded-[2.5rem] text-xl bg-emerald-600 text-white font-black italic shadow-xl active:scale-95">
                  LANCER LA SESSION CP
                </button>
              </>
            )}
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-end px-2">
                <div>
                    <p className="text-[10px] text-slate-500 italic">MULTIPLICATEUR</p>
                    <p className="text-3xl text-emerald-500 font-black italic">x{multiplier.toFixed(2)}</p>
                </div>
                {multiplier > 1.3 && (
                    <button onClick={() => finalizeGame(true)} className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black flex items-center gap-2 animate-bounce">
                        <Wallet size={14}/> CASHOUT {Math.floor(betCP * multiplier)} CP
                    </button>
                )}
            </div>

            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-100 ${timeLeft < 2 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>

            <div className="bg-white text-black p-10 rounded-[3.5rem] text-center min-h-[200px] flex flex-col items-center justify-center shadow-2xl relative">
              <span className="absolute top-4 text-[9px] text-slate-400 font-black uppercase italic">QUESTION {currentIndex + 1} / 5</span>
              <p className="text-xl font-black italic tracking-tighter uppercase">{questions[currentIndex]?.question}</p>
            </div>

            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/5 text-white";
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.03] z-10 shadow-lg";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-60";
                  else style = "opacity-20";
                }
                return (
                  <button key={i} onClick={() => handleAnswer(a)} disabled={showCorrection} className={`p-6 border rounded-[1.8rem] text-left transition-all font-black text-xs italic ${style}`}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center border-2 ${status === 'lost' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                {status === 'lost' ? <XCircle size={70} className="text-rose-500"/> : <Trophy size={70} className="text-emerald-500"/>}
            </div>

            <h2 className={`text-6xl font-black italic ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>{status === 'lost' ? "PERDU" : "GAGNÉ"}</h2>
            
            <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/10 backdrop-blur-xl">
                <p className="text-[11px] text-slate-500 mb-4 font-black italic">RÉSULTAT DE SESSION</p>
                <p className="text-6xl font-black text-white italic">
                    {status === 'lost' ? 0 : Math.floor(betCP * multiplier)} 
                    <span className="text-lg text-emerald-500 ml-3">CP</span>
                </p>
            </div>

            <button onClick={() => setStatus('idle')} className="w-full py-7 bg-white text-black rounded-[2.5rem] font-black text-2xl italic shadow-2xl">
              REJOUER
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

