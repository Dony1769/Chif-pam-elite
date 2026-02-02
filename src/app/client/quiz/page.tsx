"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin, Construction, Wallet, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const [betCP, setBetCP] = useState(100);
  const [difficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [category, setCategory] = useState(9);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState("Maintenance...");
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [multiplier, setMultiplier] = useState(0.5);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<any>(null);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);
    }
    checkMaintenance();
  }, []);

  useEffect(() => {
    init();
  }, [init]);

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
    if (isProcessing || !profile) return;
    setIsProcessing(true);
    setStatus('loading');

    try {
      const roundedMise = Math.floor(betCP);

      // 1. Débit des CP via RPC
      const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: roundedMise,
          p_gain_cp: 0,
          p_jeu_nom: 'Quiz Elite'
      });

      if (payError) throw new Error(payError.message);
      if (!result.success) throw new Error(result.message);

      // 2. Récupération des questions
      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a:string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a:string) => translate(a))]);
        return { question: qF, correct: cF, answers: [cF, ...iF].sort(() => Math.random() - 0.5) };
      }));

      // 3. Enregistrement en base (SANS bet_amount)
      const { data: game, error: insertError } = await supabase.from('quiz_games').insert([{
        user_id: profile.id,
        mise_cp: roundedMise,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();
      
      if (insertError) throw insertError;

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(0.5);
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
    if (!gameId) return;
    setIsProcessing(true);
    const gainFinal = isWin ? Math.floor(betCP * multiplier) : 0;
    
    try {
        // Crédit des gains CP via RPC
        const { data: result, error: rpcError } = await supabase.rpc('jouer_partie_cp', {
            p_user_id: profile.id,
            p_mise_cp: 0,
            p_gain_cp: gainFinal,
            p_jeu_nom: isWin ? 'Quiz Victory' : 'Quiz Defeat'
        });

        if (rpcError) throw new Error(rpcError.message);

        // Update de la table quiz_games
        await supabase.from('quiz_games').update({ 
            is_active: false, 
            gain_cp: gainFinal,
            is_won: isWin
        }).eq('id', gameId);

        setStatus(isWin ? 'ended' : 'lost');
    } catch (e: any) {
        console.error("Erreur finalisation:", e.message);
    } finally {
        setIsProcessing(false);
        setShowCorrection(false);
        init(); 
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
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90">
          <ChevronLeft/>
        </button>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 shadow-lg">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-emerald-500 text-sm italic">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
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

                <div className="bg-[#0a0a0f] p-8 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={80}/></div>
                    <div className="flex justify-between items-center relative">
                        <span className="text-emerald-500 text-[10px] italic font-bold">VALEUR DE LA SESSION (CP)</span>
                    </div>
                    <input 
                      type="number" 
                      value={betCP} 
                      onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
                      className="bg-transparent text-left outline-none w-full text-5xl font-black text-white italic tracking-tighter"
                    />
                </div>
                
                <button onClick={start} disabled={isProcessing} className="w-full py-7 rounded-[2.5rem] text-xl bg-emerald-600 text-white font-black italic shadow-[0_20px_40px_rgba(5,150,105,0.3)] active:scale-95 transition-all">
                  INITIALISER LE QUIZ
                </button>
              </>
            )}
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
                <div>
                    <p className="text-[10px] text-slate-500 italic">SCORE_MULT</p>
                    <p className="text-3xl text-emerald-500 font-black italic">x{multiplier.toFixed(2)}</p>
                </div>
                {multiplier > 1.2 && (
                    <button onClick={() => finalizeGame(true)} className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black flex items-center gap-2 shadow-xl border border-white/20">
                        <Wallet size={14}/> ENCAISSER {Math.floor(betCP * multiplier)} CP
                    </button>
                )}
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-100 ${timeLeft < 2 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>

            <div className="bg-white text-black p-10 rounded-[3rem] text-center min-h-[220px] flex flex-col items-center justify-center shadow-2xl relative">
              <span className="absolute top-4 text-[8px] text-slate-400 font-bold italic">SÉQUENCE {currentIndex + 1} / 5</span>
              <p className="text-lg font-black italic tracking-tight uppercase leading-tight">{questions[currentIndex]?.question}</p>
            </div>

            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/5 text-white";
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.02] shadow-lg";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-50";
                  else style = "opacity-20";
                }
                return (
                  <button key={i} onClick={() => handleAnswer(a)} disabled={showCorrection} className={`p-5 border rounded-2xl text-left transition-all font-black text-[11px] italic ${style}`}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-8">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center border-2 ${status === 'lost' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                {status === 'lost' ? <XCircle size={60} className="text-rose-500"/> : <Trophy size={60} className="text-emerald-500"/>}
            </div>

            <h2 className={`text-5xl font-black italic ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>{status === 'lost' ? "FAILED" : "SUCCESS"}</h2>
            
            <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/10 backdrop-blur-xl relative">
                <p className="text-[10px] text-zinc-500 mb-3 font-bold italic tracking-widest">JETONS RÉCUPÉRÉS</p>
                <p className="text-6xl font-black text-white italic tracking-tighter">
                    {status === 'lost' ? 0 : Math.floor(betCP * multiplier)} 
                    <span className="text-lg text-emerald-500 ml-2">CP</span>
                </p>
            </div>

            <button onClick={() => setStatus('idle')} className="w-full py-7 bg-emerald-600 text-white rounded-[2.5rem] font-black text-2xl italic shadow-2xl active:scale-95 transition-all">
              NOUVELLE SESSION
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
