"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, 
  Laptop, Film, Award, BookOpen, MapPin, Construction,
  Coins, Target, Sparkles, Volume2, VolumeX, 
  History, Zap, ExternalLink, RefreshCw
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGameEconomySettings } from '@/lib/game-economy';
import { NeonGameShell } from '@/components/game/NeonGameShell';

// --- TYPES & INTERFACES ---
type DifficultyType = 'facile' | 'intermédiaire' | 'difficile';

interface QuestionItem {
  question: string;
  correct: string;
  answers: string[];
}

interface HistoryItem {
  label: string;
  score: number;
  difficulty: string;
}

interface ProfileLike {
  id: string;
  jetons_cp?: number;
}

const SETTINGS: Record<DifficultyType, { time: number; step: number; points: number }> = {
  facile: { time: 13, step: 0.15, points: 10 },
  intermédiaire: { time: 9, step: 0.20, points: 25 },
  difficile: { time: 6, step: 0.50, points: 50 }
};

const getDifficultySettings = (difficulty: DifficultyType) => {
  const profile = getGameEconomySettings('quiz', difficulty)?.profile;
  return {
    time: profile?.time ?? SETTINGS[difficulty].time,
    step: profile?.multiplierStep ?? SETTINGS[difficulty].step,
    points: profile?.points ?? SETTINGS[difficulty].points
  };
};

const CATEGORIES = [
  { id: 9, name: "Général", icon: <Brain size={14}/> },
  { id: 23, name: "Histoire", icon: <Globe size={14}/> },
  { id: 11, name: "Film", icon: <Film size={14}/> },
  { id: 21, name: "Sports", icon: <Award size={14}/> },
  { id: 12, name: "Musique", icon: <Music size={14}/> },
  { id: 18, name: "Tech", icon: <Laptop size={14}/> },
  { id: 10, name: "Livres", icon: <BookOpen size={14}/> },
  { id: 22, name: "Géo", icon: <MapPin size={14}/> },
];

const MONETAG_AD_URL = "https://omg10.com/4/11431323";
const MIN_AD_TIME_MS = 6000; // 6 secondes requises sur la publicité

function QuizGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- ÉTATS DU JEU ---
  const [profile, setProfile] = useState<ProfileLike | null>(null);
  const [betCP, setBetCP] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<DifficultyType>('intermédiaire');
  const [category, setCategory] = useState<number>(9);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>("Maintenance en cours...");
  
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(0.5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [explanation, setExplanation] = useState<string>('');

  // --- ÉTATS SECONDE CHANCE ---
  const [hasUsedSecondChance, setHasUsedSecondChance] = useState<boolean>(false);
  const [isAdPending, setIsAdPending] = useState<boolean>(false);
  const [adErrorMsg, setAdErrorMsg] = useState<string | null>(null);
  const [secondChanceLoading, setSecondChanceLoading] = useState<boolean>(false);

  // --- REFS POUR ACCÈS EN TEMPS RÉEL ET SÉCURITÉ ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef({ multiplier: 0.5, gameId: null as string | null });
  const adClickTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId };
  }, [multiplier, gameId]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
  };

  const playQuizSound = (type: 'correct' | 'wrong' | 'tick') => {
    if (muted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'correct') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      } else if (type === 'wrong') {
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(620, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const checkMaintenance = async () => {
    try {
      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'quiz').single();
      if (data && !data.is_active) {
        setMaintenanceMsg(data.maintenance_msg || "Maintenance en cours...");
        setStatus('maintenance');
      } else { 
        setStatus('idle'); 
      }
    } catch { 
      setStatus('idle'); 
    }
  };

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof as ProfileLike | null);
    }
    await checkMaintenance();
  }, []);

  useEffect(() => {
    void init();
    if (challengeId && challengeFee) {
      setBetCP(Number(challengeFee));
    }
  }, [init, challengeId, challengeFee]);

  const translate = async (text: string) => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      return data[0][0][0];
    } catch { 
      return text; 
    }
  };

  const start = async () => {
    if (isProcessingRef.current || !profile) return;
    triggerHaptic();
    
    if (betCP < 10 && !challengeId) { 
      alert("Mise minimum : 10 CP"); 
      return; 
    }
    
    isProcessingRef.current = true;
    setStatus('loading');
    setHasUsedSecondChance(false);
    setAdErrorMsg(null);

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      lockedBetRef.current = finalFee;

      const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id,
        p_mise_cp: finalFee,
        p_gain_cp: 0,
        p_jeu_nom: challengeId ? `Challenge Quiz: ${challengeId}` : 'Quiz Elite Solo'
      });

      if (payError) throw new Error(payError.message);
      if (!result.success) throw new Error(result.message);

      if (challengeId) {
        await supabase.from('challenge_attempts').upsert({
          challenge_id: challengeId,
          user_id: profile.id,
        }, { onConflict: 'challenge_id,user_id' });
      }

      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a: string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a: string) => translate(a))]);
        return { question: qF, correct: cF, answers: [cF, ...iF].sort(() => Math.random() - 0.5) };
      }));

      const { data: game, error: insertError } = await supabase.from('quiz_games').insert([{
        user_id: profile.id,
        mise_cp: finalFee,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();
      
      if (insertError) throw insertError;

      const difficultySettings = getDifficultySettings(difficulty);
      const initialMult = 0.5;

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(initialMult);
      setSessionScore(0);
      setTimeLeft(difficultySettings.time);
      setExplanation('');
      setStatus('playing');
      
      isProcessingRef.current = false;

    } catch (e: any) {
      alert(e.message || "Erreur lors du lancement");
      setStatus('idle');
      isProcessingRef.current = false;
    }
  };

  const finalizeGame = useCallback(async (isWin: boolean, calculatedGain?: number) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    if (timerRef.current) clearInterval(timerRef.current);

    const currentGameId = gameStateRef.current.gameId;
    const currentMult = gameStateRef.current.multiplier;
    const secureBet = lockedBetRef.current;

    if (!currentGameId || !profile?.id) return;

    const gainCP = challengeId ? 0 : (calculatedGain !== undefined ? calculatedGain : (isWin ? Math.floor(secureBet * currentMult) : 0));

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
          p_user_id: profile.id,
          p_challenge_id: challengeId,
          p_score: sessionScore 
        });
      } else {
        if (gainCP > 0) {
          await supabase.rpc('jouer_partie_cp', {
            p_user_id: profile.id,
            p_mise_cp: 0,
            p_gain_cp: gainCP,
            p_jeu_nom: 'Quiz Victory'
          });
        }
      }

      await supabase.from('quiz_games').update({ 
        is_active: false, 
        gain_cp: gainCP,
        is_won: isWin
      }).eq('id', currentGameId);

      setHistory(prev => [{ 
        label: `${difficulty} • ${CATEGORIES.find(c => c.id === category)?.name || 'Général'}`, 
        score: sessionScore, 
        difficulty 
      }, ...prev].slice(0, 3));
      
      setStatus(isWin || gainCP > 0 ? 'ended' : 'lost');
    } catch (e) {
      console.error(e);
    } finally {
      isProcessingRef.current = false;
      setShowCorrection(false);
      void init(); 
    }
  }, [challengeId, difficulty, category, sessionScore, profile?.id, init]);

  // --- GESTION DE LA SECONDE CHANCE VIA PUBLICITÉ ---
  const applySecondChance = async () => {
    if (!profile || secondChanceLoading) return;

    const secondChanceFee = Math.floor(lockedBetRef.current * 0.5);

    if ((profile.jetons_cp || 0) < secondChanceFee) {
      setAdErrorMsg(`Solde insuffisant. Il vous faut ${secondChanceFee} CP pour la seconde chance.`);
      setIsAdPending(false);
      return;
    }

    setSecondChanceLoading(true);
    setAdErrorMsg(null);

    try {
      // Préparation et déduction des 50% de la mise
      const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id,
        p_mise_cp: secondChanceFee,
        p_gain_cp: 0,
        p_jeu_nom: 'Quiz Seconde Chance (50%)'
      });

      if (payError) throw new Error(payError.message);
      if (!result.success) throw new Error(result.message);

      // On accorde la seconde chance
      setHasUsedSecondChance(true);
      setIsAdPending(false);
      setSelectedAnswer(null);
      setShowCorrection(false);
      setExplanation('🔄 Seconde Chance activée ! Reprise de la partie...');

      // Réinitialisation du temps pour la question courante
      const difficultySettings = getDifficultySettings(difficulty);
      setTimeLeft(difficultySettings.time);
      setStatus('playing');

      await init(); // Mettre à jour le solde utilisateur
    } catch (e: any) {
      setAdErrorMsg(e.message || "Erreur lors du traitement de la seconde chance.");
    } finally {
      setSecondChanceLoading(false);
    }
  };

  const handleOpenAdForSecondChance = () => {
    const fee = Math.floor(lockedBetRef.current * 0.5);
    if ((profile?.jetons_cp || 0) < fee) {
      setAdErrorMsg(`Solde insuffisant (${fee} CP requis).`);
      return;
    }

    adClickTimestampRef.current = Date.now();
    setIsAdPending(true);
    setAdErrorMsg(null);

    // Ouverture de la pub dans un nouvel onglet
    window.open(MONETAG_AD_URL, '_blank');
  };

  // Écouteur pour vérifier si l'utilisateur est resté au moins 6s sur le lien pub
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAdPending && adClickTimestampRef.current) {
        const timeSpent = Date.now() - adClickTimestampRef.current;
        if (timeSpent >= MIN_AD_TIME_MS) {
          void applySecondChance();
        } else {
          const remainingSec = Math.ceil((MIN_AD_TIME_MS - timeSpent) / 1000);
          setAdErrorMsg(`Temps insuffisant ! Vous devez passer au moins 6s sur la page (${remainingSec}s manquantes).`);
          setIsAdPending(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdPending, profile]);

  const handleAnswer = (ans: string | null) => {
    if (showCorrection || status !== 'playing' || isProcessingRef.current) return;
    triggerHaptic();
    
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true);

    const difficultySettings = getDifficultySettings(difficulty);

    if (ans === questions[currentIndex].correct) {
      playQuizSound('correct');
      const pointsToAdd = difficultySettings.points;
      setSessionScore(prev => prev + pointsToAdd);

      const nextM = parseFloat((multiplier + difficultySettings.step).toFixed(2));
      setMultiplier(nextM);
      
      setExplanation(`✅ Bonne réponse (+${pointsToAdd} pts) | Multiplicateur: x${nextM.toFixed(2)}`);
      
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(p => p + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(difficultySettings.time);
        } else { 
          const finalGain = Math.floor(lockedBetRef.current * nextM);
          void finalizeGame(true, finalGain); 
        }
      }, 1100);
    } else {
      playQuizSound('wrong');
      setExplanation(`❌ Mauvaise réponse. La solution était : ${questions[currentIndex].correct}`);
      
      setTimeout(() => {
        const currentGain = Math.floor(lockedBetRef.current * multiplier);
        
        // Si le multiplicateur est >= 1.0x ou qu'on est en Mode Challenge ou qu'on a déjà utilisé la 2e chance, on termine.
        if (multiplier >= 1.0 || challengeId || hasUsedSecondChance) {
          void finalizeGame(multiplier >= 1.0, currentGain);
        } else {
          // Éligible à la seconde chance : écran de défaite temporaire pour rejouer via pub
          setStatus('lost');
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1400);
    }
  };

  // --- CHRONOMÈTRE / TEMPS ÉCOULÉ ---
  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && !showCorrection) {
      timerRef.current = setInterval(() => {
        setTimeLeft(p => Math.max(0, parseFloat((p - 0.1).toFixed(1))));
      }, 100);
    } else if (timeLeft <= 0 && status === 'playing' && !showCorrection) {
      handleAnswer(null); 
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, status, showCorrection]);

  const secondChanceCost = Math.floor(lockedBetRef.current * 0.5);
  const isEligibleForSecondChance = !challengeId && multiplier < 1.0 && !hasUsedSecondChance;

  return (
    <NeonGameShell accent="amber" className="h-[100dvh] w-full max-w-md mx-auto p-3 font-black uppercase flex flex-col justify-between select-none overflow-hidden bg-slate-950">
      
      {/* 1. EN-TÊTE FIXE */}
      <div className="flex-none flex items-center justify-between h-12">
        <button 
          onClick={() => router.push(challengeId ? '/client/rank?challengeId=' + challengeId : '/client/home')} 
          className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-amber-200 active:scale-90 transition-transform"
        >
          <ChevronLeft size={18}/>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 backdrop-blur-md">
            <Coins size={14} className="text-amber-400 animate-pulse" />
            <span className="text-xs text-amber-200 tracking-wider">{profile?.jetons_cp?.toLocaleString() || 0} <span className="text-[9px] text-amber-400">CP</span></span>
          </div>

          <button 
            onClick={() => setMuted(v => !v)} 
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 active:scale-90"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* 2. ZONE CENTRALE */}
      <div className="flex-1 my-auto flex flex-col justify-center min-h-0 overflow-hidden py-1">
        
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center py-6 bg-white/5 rounded-2xl border border-white/10">
            <Construction size={40} className="text-amber-500 animate-bounce" />
            <h2 className="text-lg text-amber-500 mt-2">MAINTENANCE</h2>
            <p className="text-zinc-400 text-[10px] px-4 text-center mt-1">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          
          <div className="flex flex-col justify-between h-full max-h-[520px] gap-2">
            
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center my-auto">
                <Loader2 className="animate-spin text-amber-400" size={40}/>
                <span className="text-xs text-amber-300/80 mt-2 italic">CHARGEMENT...</span>
              </div>
            ) : (
              <>
                <div className="flex-none flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[10px]">
                    <Sparkles size={12} />
                    <span>QUIZ ELITE</span>
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-bold">
                    {difficulty.toUpperCase()}
                  </div>
                </div>

                {challengeId && (
                  <div className="flex-none bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-xl flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-emerald-200" />
                      <span className="text-xs italic">MODE CHALLENGE</span>
                    </div>
                    <span className="text-[9px] text-emerald-100 font-normal">CLASSEMENT</span>
                  </div>
                )}

                {/* CATÉGORIES */}
                <div className="flex-none">
                  <span className="text-[9px] text-slate-400 mb-1 block">1. CATÉGORIE</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CATEGORIES.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setCategory(c.id)} 
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 px-1 transition-all ${category === c.id ? 'border-amber-400 bg-amber-500 text-black shadow-lg scale-[1.02]' : 'border-white/10 bg-white/5 text-slate-400'}`}
                      >
                        {c.icon} 
                        <span className="text-[8px] truncate max-w-full">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DIFFICULTÉ */}
                <div className="flex-none">
                  <span className="text-[9px] text-slate-400 mb-1 block">2. DIFFICULTÉ</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(SETTINGS) as DifficultyType[]).map((d) => (
                      <button 
                        key={d} 
                        onClick={() => setDifficulty(d)} 
                        className={`rounded-xl border py-2 text-center transition-all ${difficulty === d ? 'border-amber-400 bg-white text-black' : 'border-white/10 bg-white/5 text-slate-400'}`}
                      >
                        <div className="text-[9px]">{d}</div>
                        <div className="text-[7px] opacity-70">+{SETTINGS[d].points} PTS</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MISE */}
                <div className="flex-none rounded-xl border border-white/10 bg-black/40 p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-slate-400">3. MISE</span>
                    <span className="text-[9px] text-amber-400">MIN 10 CP</span>
                  </div>
                  <input 
                    type="number" 
                    value={betCP} 
                    disabled={!!challengeId}
                    onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
                    className="bg-transparent outline-none w-full text-2xl font-black italic tracking-tight text-white"
                  />
                </div>

                <button 
                  onClick={start} 
                  disabled={isProcessingRef.current} 
                  className="flex-none w-full rounded-xl py-3.5 text-base font-black italic shadow-lg active:scale-95 transition-all bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 text-black flex items-center justify-center gap-2"
                >
                  <Zap size={18} fill="currentColor" />
                  <span>{challengeId ? 'LANCER LE DÉFI' : 'COMMENCER'}</span>
                </button>
              </>
            )}
          </div>

        ) : status === 'playing' ? (
          
          /* MODE JEU EN TEMPS RÉEL */
          <div className="flex flex-col justify-between h-full max-h-[500px] gap-2">
            
            <div className="flex-none space-y-1">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] text-slate-400">GAIN ESTIMÉ / MULTIPLICATEUR</span>
                  <div className="text-lg text-emerald-400 font-black italic leading-none flex items-center gap-2">
                    <span>x{multiplier.toFixed(2)}</span>
                    <span className="text-xs text-amber-300">({Math.floor(betCP * multiplier)} CP)</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] text-slate-400">PROGRESSION</span>
                  <div className="text-xs text-amber-300 font-black leading-none">{currentIndex + 1} / 5</div>
                </div>
              </div>

              {/* TIMER */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-100 ${timeLeft < 2.5 ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} 
                  style={{ width: `${(timeLeft / getDifficultySettings(difficulty).time) * 100}%` }}
                />
              </div>
            </div>

            {/* QUESTION */}
            <div className="flex-1 min-h-0 bg-white text-black p-3.5 rounded-2xl flex flex-col justify-center items-center shadow-lg relative text-center my-1">
              <span className="absolute top-2 right-2 text-[9px] text-slate-400 font-bold">
                {timeLeft.toFixed(1)}s
              </span>
              <p className="text-xs sm:text-sm font-black italic leading-snug">
                {questions[currentIndex]?.question}
              </p>
            </div>

            {/* OPTIONS DE RÉPONSES */}
            <div className="flex-none grid grid-cols-1 gap-1.5">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/10 text-white active:bg-white/10";
                
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.01]";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-90";
                  else style = "opacity-20 bg-white/5 border-transparent";
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(a)} 
                    disabled={showCorrection || isProcessingRef.current} 
                    className={`p-3 border rounded-xl text-left transition-all font-black text-xs italic flex items-center justify-between ${style}`}
                  >
                    <span className="truncate pr-2">{a}</span>
                    <span className="text-[8px] opacity-40">0{i+1}</span>
                  </button>
                );
              })}
            </div>

            {explanation && (
              <div className="flex-none rounded-lg bg-amber-500/10 border border-amber-500/20 p-1.5 text-center text-[9px] text-amber-200 truncate">
                {explanation}
              </div>
            )}

          </div>

        ) : (

          /* ÉCRAN DE RÉSULTAT / SECONDE CHANCE */
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center my-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${status === 'lost' && !challengeId ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {status === 'lost' && !challengeId ? <XCircle size={36}/> : <Trophy size={36}/>}
            </div>

            <div>
              <h2 className={`text-2xl font-black italic ${status === 'lost' && !challengeId ? 'text-rose-500' : 'text-emerald-400'}`}>
                {challengeId ? "MISSION TERMINÉE" : (status === 'lost' ? "ÉCHEC" : "VICTOIRE")}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {challengeId ? "POINTS AJOUTÉS AU SCORE" : "GAINS OBTENUS"}
              </p>
            </div>

            <div className="bg-slate-900/90 w-full p-3.5 rounded-xl border border-white/10">
              <span className="text-3xl font-black text-white italic">
                {challengeId ? sessionScore : Math.floor(lockedBetRef.current * multiplier)}
              </span>
              <span className="text-xs text-amber-400 ml-1">{challengeId ? 'PTS' : 'CP'}</span>
            </div>

            {/* BLOC SECONDE CHANCE PAYANTE VIA SPONSOR/PUB */}
            {status === 'lost' && isEligibleForSecondChance && (
              <div className="w-full bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between text-left">
                  <div>
                    <span className="text-xs text-amber-300 font-black block">SECONDE CHANCE</span>
                    <span className="text-[9px] text-slate-300 font-normal">
                      Coût : <strong className="text-amber-400">{secondChanceCost} CP</strong> (50% de la mise)
                    </span>
                  </div>
                  <Sparkles size={18} className="text-amber-400 animate-spin" />
                </div>

                <p className="text-[8px] text-slate-400 text-left leading-snug">
                  Visitez notre partenaire pendant au moins 6s pour débloquer votre seconde chance.
                </p>

                {adErrorMsg && (
                  <p className="text-[9px] text-rose-400 font-bold text-center bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                    {adErrorMsg}
                  </p>
                )}

                <button
                  onClick={handleOpenAdForSecondChance}
                  disabled={isAdPending || secondChanceLoading}
                  className="w-full py-2.5 bg-amber-400 text-black rounded-lg font-black text-xs italic shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {secondChanceLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : isAdPending ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      <span>EN ATTENTE DES 6 SECONDES...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} />
                      <span>S'ÉQUIPER DE LA SECONDE CHANCE</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                if (challengeId) {
                  router.push('/client/rank?challengeId=' + challengeId);
                } else {
                  if (status === 'lost' && isEligibleForSecondChance) {
                    void finalizeGame(false, 0);
                  } else {
                    setStatus('idle');
                  }
                }
              }} 
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-sm italic shadow-md active:scale-95 transition-all"
            >
              {challengeId ? 'RETOURNER AU CLASSEMENT' : (status === 'lost' ? 'ABANDONNER & QUITTER' : 'REJOUER UNE PARTIE')}
            </button>
          </div>

        )}

      </div>

      {/* 3. HISTORIQUE EN BAS */}
      {status === 'idle' && history.length > 0 && (
        <div className="flex-none h-14 border-t border-white/5 pt-1.5">
          <div className="flex items-center gap-1 text-[8px] text-slate-400 mb-1">
            <History size={10} /> RECENT
          </div>
          <div className="flex gap-1.5 overflow-hidden">
            {history.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex-1 flex justify-between items-center bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[8px]">
                <span className="truncate text-slate-300">{item.label}</span>
                <span className="text-emerald-400 font-bold">{item.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </NeonGameShell>
  );
}

export default function QuizElite() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>}>
      <QuizGameContent />
    </Suspense>
  );
}
