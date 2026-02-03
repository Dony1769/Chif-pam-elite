"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin, Construction, Wallet, Coins, Target } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const entryFee = searchParams.get('fee');

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
  const [isChallengeMode, setIsChallengeMode] = useState(false);
  const [hasPaidChallenge, setHasPaidChallenge] = useState(false);
  
  const timerRef = useRef<any>(null);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    // Vérifier si on est en mode défi
    if (challengeId) {
      setIsChallengeMode(true);
      const { data: attempt } = await supabase
        .from('challenge_attempts')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .single();
      
      if (attempt) setHasPaidChallenge(true);
    }

    checkMaintenance();
  }, [challengeId, router]);

  useEffect(() => { init(); }, [init]);

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
      let currentMise = Math.floor(betCP);

      // GESTION DU PAIEMENT
      if (isChallengeMode) {
        currentMise = Number(entryFee) || 0;
        if (!hasPaidChallenge) {
          // Débit initial pour le challenge
          const { data: res, error: err } = await supabase.rpc('jouer_partie_cp', {
              p_user_id: profile.id,
              p_mise_cp: currentMise,
              p_gain_cp: 0,
              p_jeu_nom: 'Ticket Challenge Quiz'
          });
          if (err || !res.success) throw new Error(err?.message || res.message);
          
          // Créer l'entrée dans challenge_attempts
          await supabase.from('challenge_attempts').insert([{
            challenge_id: challengeId,
            user_id: profile.id,
            score_gained: 0
          }]);
          setHasPaidChallenge(true);
        }
      } else {
        // Mode normal
        const { data: res, error: err } = await supabase.rpc('jouer_partie_cp', {
            p_user_id: profile.id,
            p_mise_cp: currentMise,
            p_gain_cp: 0,
            p_jeu_nom: 'Quiz Session'
        });
        if (err || !res.success) throw new Error(err?.message || res.message);
      }

      // FETCH QUESTIONS
      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a:string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a:string) => translate(a))]);
        return { question: qF, correct: cF, answers: [cF, ...iF].sort(() => Math.random() - 0.5) };
      }));

      const { data: game, error: insertError } = await supabase.from('quiz_games').insert([{
        user_id: profile.id,
        mise_cp: isChallengeMode ? 0 : currentMise,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();
      
      if (insertError) throw insertError;

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(isChallengeMode ? 1 : 0.5); // Score commence à 1 en challenge
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
      const step = isChallengeMode ? 100 : SETTINGS[difficulty].step; 
      setMultiplier(p => p + step); // En challenge on incrémente le score par 100
      
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(p => p + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(SETTINGS[difficulty].time);
        } else { finalizeGame(true); }
      }, 1000);
    } else {
      finalizeGame(false);
    }
  };

  const finalizeGame = async (isWin: boolean) => {
    if (!gameId) return;
    setIsProcessing(true);
    
    try {
        if (isChallengeMode) {
          // Mise à jour du score cumulé dans le challenge
          const finalScore = isWin ? Math.floor(multiplier) : Math.floor(multiplier * 0.5);
          await supabase.rpc('increment_challenge_score', {
            p_challenge_id: challengeId,
            p_user_id: profile.id,
            p_score: finalScore
          });
        } else {
          // Gains normaux
          const gainFinal = isWin ? Math.floor(betCP * multiplier) : 0;
          await supabase.rpc('jouer_partie_cp', {
              p_user_id: profile.id,
              p_mise_cp: 0,
              p_gain_cp: gainFinal,
              p_jeu_nom: 'Quiz Elite Result'
          });
        }

        await supabase.from('quiz_games').update({ 
            is_active: false, 
            is_won: isWin
        }).eq('id', gameId);

        setStatus(isWin ? 'ended' : 'lost');
    } catch (e: any) {
        console.error(e);
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
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.push(isChallengeMode ? '/client/arena' : '/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft/>
        </button>
        <div className="flex flex-col items-end">
            <span className="text-[7px] text-slate-500 tracking-widest">DISPONIBLE</span>
            <div className="flex items-center gap-2 text-emerald-500">
                <Coins size={14} />
                <span className="text-sm italic">{profile?.jetons_cp?.toLocaleString()} CP</span>
            </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {status === 'idle' ? (
          <div className="space-y-6">
            {isChallengeMode && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center gap-4">
                <div className="p-3 bg-emerald-500 text-black rounded-xl animate-pulse"><Target size={20}/></div>
                <div>
                  <p className="text-[10px] text-emerald-500">MODE MISSION ACTIF</p>
                  <p className="text-sm italic">SCOREZ POUR GRIMPER LE CLASSEMENT</p>
                </div>
              </div>
            )}

            {!isChallengeMode && (
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                    {c.icon} <span className="text-[7px] italic">{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-[#0a0a0f] p-8 rounded-[2.5rem] border border-white/5 relative">
                <p className="text-emerald-500 text-[10px] italic mb-2">{isChallengeMode ? "FRAIS DE PARTICIPATION" : "MISE DE LA SESSION"}</p>
                <p className="text-5xl font-black italic tracking-tighter">
                  {isChallengeMode ? entryFee : betCP} <span className="text-xl">CP</span>
                </p>
                {isChallengeMode && hasPaidChallenge && (
                  <div className="mt-4 py-2 px-4 bg-white/5 rounded-xl border border-white/10 text-[9px] text-emerald-500 text-center">
                    TICKET DÉJÀ VALIDÉ - ACCÈS LIBRE
                  </div>
                )}
            </div>
            
            <button onClick={start} disabled={isProcessing} className="w-full py-7 rounded-[2.5rem] text-xl bg-emerald-600 text-white font-black italic shadow-xl active:scale-95 transition-all">
              {isChallengeMode ? (hasPaidChallenge ? "LANCER LA MISSION" : "PAYER & PARTICIPER") : "INITIALISER LE QUIZ"}
            </button>
          </div>
        ) : status === 'playing' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-[10px] text-slate-500 italic">{isChallengeMode ? 'SCORE_MISSION' : 'MULTIPLICATEUR'}</p>
                    <p className="text-3xl text-emerald-500 font-black italic">{isChallengeMode ? Math.floor(multiplier) : `x${multiplier.toFixed(2)}`}</p>
                </div>
                {!isChallengeMode && multiplier > 1.2 && (
                    <button onClick={() => finalizeGame(true)} className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black">
                        ENCAISSER {Math.floor(betCP * multiplier)} CP
                    </button>
                )}
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-100 ${timeLeft < 2 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}/>
            </div>

            <div className="bg-white text-black p-10 rounded-[3rem] text-center min-h-[220px] flex flex-col items-center justify-center relative shadow-2xl">
              <span className="absolute top-4 text-[8px] text-slate-400 font-bold">SÉQUENCE {currentIndex + 1} / 5</span>
              <p className="text-lg font-black italic leading-tight uppercase">{questions[currentIndex]?.question}</p>
            </div>

            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                let style = "bg-white/5 border-white/10 text-white";
                if (showCorrection) {
                  if (a === questions[currentIndex].correct) style = "bg-emerald-500 text-black border-emerald-400 scale-[1.02]";
                  else if (a === selectedAnswer) style = "bg-rose-500 text-white border-rose-500 opacity-50";
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
            <h2 className={`text-6xl font-black italic ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>
              {status === 'lost' ? "FAILED" : "FINISH"}
            </h2>
            <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-white/10">
                <p className="text-[10px] text-zinc-500 mb-3 tracking-widest">{isChallengeMode ? "POINTS TRANSMIS" : "JETONS RÉCUPÉRÉS"}</p>
                <p className="text-6xl font-black text-white italic">
                    {isChallengeMode ? Math.floor(multiplier) : (status === 'lost' ? 0 : Math.floor(betCP * multiplier))} 
                    <span className="text-lg text-emerald-500 ml-2">CP</span>
                </p>
            </div>
            <button onClick={() => setStatus('idle')} className="w-full py-7 bg-emerald-600 text-white rounded-[2.5rem] font-black text-xl italic shadow-2xl transition-all">
              {isChallengeMode ? "RETOUR À L'ARENA" : "NOUVELLE SESSION"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizElite() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center text-emerald-500 animate-pulse font-black italic">SYNCHRONISATION...</div>}>
      <QuizGameContent />
    </Suspense>
  );
}
