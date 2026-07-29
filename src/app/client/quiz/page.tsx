"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, 
  Laptop, Film, Award, BookOpen, MapPin, Construction,
  Coins, Target, Sparkles, Volume2, VolumeX, 
  History, Zap, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGameEconomySettings } from '@/lib/game-economy';
import { NeonGameShell } from '@/components/game/NeonGameShell';
import MonetagAdScript from '@/components/ads/MonetagAdScript';

// --- TYPES & INTERFACES ---
type DifficultyType = 'facile' | 'intermédiaire' | 'difficile';

interface QuestionItem {
  question: string;
  correct: string;
  answers: string[];
}

interface OpenTDBQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
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

const MONETAG_AD_URL = "https://omg10.com/4/11431323";
const MIN_REQUIRED_AD_TIME_MS = 6000; // 6 secondes obligatoires sur l'annonce

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
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'second_chance_offer' | 'second_chance_pending' | 'maintenance'
  >('loading');
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
  
  // --- ÉTATS SECONDE CHANCE & PUB ---
  const [hasUsedSecondChance, setHasUsedSecondChance] = useState<boolean>(false);
  const [adErrorMessage, setAdErrorMessage] = useState<string | null>(null);
  const [isVerifyingAd, setIsVerifyingAd] = useState<boolean>(false);

  // --- REFS POUR INTÉGRITÉ ET PERFORMANCE (ANTI-FRAUDE) ---
  const initialMiseRef = useRef<number>(0); // Garde en mémoire la toute première mise
  const lockedBetRef = useRef<number>(0);   // Mise courante en jeu
  const isProcessingRef = useRef<boolean>(false);
  const isVerifyingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Horodatage sécurisé anti-triche
  const adTimestampRef = useRef<{ date: number; perf: number } | null>(null);

  const gameStateRef = useRef({ 
    multiplier: 0.5, 
    gameId: null as string | null,
    status: status
  });

  useEffect(() => {
    gameStateRef.current = { multiplier, gameId, status };
  }, [multiplier, gameId, status]);

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
    } catch {
      // Audio non supporté
    }
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
      const { data: prof } = await supabase.from('profiles').select('id, jetons_cp').eq('id', user.id).single();
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

  const translateText = async (text: string): Promise<string> => {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`);
      if (!res.ok) return text;
      const data = await res.json();
      return data[0]?.[0]?.[0] || text;
    } catch { 
      return text; 
    }
  };

  const fetchQuestions = async (cat: number): Promise<QuestionItem[]> => {
    const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${cat}&type=multiple&encode=url3986`);
    const raw = await res.json();

    if (!raw.results || raw.results.length === 0) {
      throw new Error("Impossible de charger les questions. Réessayez.");
    }

    return Promise.all(
      raw.results.map(async (q: OpenTDBQuestion) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a: string) => decodeURIComponent(a));
        
        const [qF, cF, ...iF] = await Promise.all([
          translateText(dQ), 
          translateText(dC), 
          ...dI.map((a: string) => translateText(a))
        ]);
        
        return { 
          question: qF, 
          correct: cF, 
          answers: [cF, ...iF].sort(() => Math.random() - 0.5) 
        };
      })
    );
  };

  // --- DÉMARRAGE PARTIE NORMALE ---
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
    setAdErrorMessage(null);

    try {
      const finalFee = challengeId ? Number(challengeFee) : Math.floor(betCP);
      initialMiseRef.current = finalFee;
      lockedBetRef.current = finalFee;

      const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id,
        p_mise_cp: finalFee,
        p_gain_cp: 0,
        p_jeu_nom: challengeId ? `Challenge Quiz: ${challengeId}` : 'Quiz Elite Solo'
      });

      if (payError) throw new Error(payError.message);
      if (!result?.success) throw new Error(result?.message || "Erreur lors du débit.");

      if (challengeId) {
        await supabase.from('challenge_attempts').upsert({
          challenge_id: challengeId,
          user_id: profile.id,
        }, { onConflict: 'challenge_id,user_id' });
      }

      const processed = await fetchQuestions(category);

      const { data: game, error: insertError } = await supabase.from('quiz_games').insert([{
        user_id: profile.id,
        mise_cp: finalFee,
        difficulty,
        questions_data: processed,
        is_active: true
      }]).select().single();
      
      if (insertError) throw insertError;

      const difficultySettings = getDifficultySettings(difficulty);

      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(0.5);
      setSessionScore(0);
      setTimeLeft(difficultySettings.time);
      setExplanation('');
      setStatus('playing');

    } catch (e: unknown) {
      const err = e as Error;
      alert(err.message || "Erreur lors du lancement");
      setStatus('idle');
    } finally {
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

    if (!currentGameId || !profile?.id) {
      isProcessingRef.current = false;
      return;
    }

    const gainCP = challengeId ? 0 : (calculatedGain !== undefined ? calculatedGain : Math.floor(secureBet * currentMult));

    try {
      if (challengeId) {
        await supabase.rpc('increment_challenge_score', {
          p_user_id: profile.id,
          p_challenge_id: challengeId,
          p_score: sessionScore 
        });
      } else if (gainCP > 0) {
        await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: 0,
          p_gain_cp: gainCP,
          p_jeu_nom: 'Quiz Victory / Encaissement'
        });
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
      console.error("Erreur lors de la finalisation :", e);
    } finally {
      isProcessingRef.current = false;
      setShowCorrection(false);
      void init(); 
    }
  }, [challengeId, difficulty, category, sessionScore, profile?.id, init]);

  // --- DÉCLENCHEMENT ANNONCE SECONDE CHANCE ---
  const triggerSecondChanceAd = () => {
    setAdErrorMessage(null);

    // Capture double horodatage pour prévenir la fraude d'horloge JS
    adTimestampRef.current = {
      date: Date.now(),
      perf: performance.now()
    };

    window.open(MONETAG_AD_URL, '_blank', 'noopener,noreferrer');
    setStatus('second_chance_pending');
  };

  // --- VÉRIFICATION PUB SECONDE CHANCE & RE-COMMENCEMENT DIRECT NIVEAU 1 ---
  const verifySecondChanceAd = useCallback(async () => {
    if (isVerifyingRef.current || !profile?.id || !adTimestampRef.current) return;
    
    isVerifyingRef.current = true;
    setIsVerifyingAd(true);

    const nowWindow = Date.now();
    const nowPerf = performance.now();

    const elapsedWindow = nowWindow - adTimestampRef.current.date;
    const elapsedPerf = nowPerf - adTimestampRef.current.perf;

    // Réinitialisation du ref
    adTimestampRef.current = null;

    // Détection de falsification (si la dérive entre les deux chronos dépasse 1s)
    if (Math.abs(elapsedWindow - elapsedPerf) > 1000) {
      setIsVerifyingAd(false);
      isVerifyingRef.current = false;
      setAdErrorMessage("Détection de tentative de triche sur l'horloge système.");
      setStatus('second_chance_offer');
      return;
    }

    const elapsedTime = Math.min(elapsedWindow, elapsedPerf);

    if (elapsedTime >= MIN_REQUIRED_AD_TIME_MS) {
      // 50% de la mise principale originale
      const feePenalty = Math.floor(initialMiseRef.current * 0.5);

      try {
        // 1. Déduction effective des 50% de pénalité via Supabase
        const { data: result, error: payError } = await supabase.rpc('jouer_partie_cp', {
          p_user_id: profile.id,
          p_mise_cp: feePenalty,
          p_gain_cp: 0,
          p_jeu_nom: 'Quiz Seconde Chance (Pénalité 50%)'
        });

        if (payError || !result?.success) {
          throw new Error(result?.message || "Solde insuffisant pour la pénalité de 50%.");
        }

        // 2. Mise à jour de la nouvelle mise retenue (ex: 5 CP)
        lockedBetRef.current = feePenalty;

        // 3. Rechargement immédiat des nouvelles questions
        const newQuestions = await fetchQuestions(category);

        // 4. RÉINITIALISATION IMMÉDIATE DU JEU AU NIVEAU 1 (VOIE DIRECTE SANS PASSAGE PAR MENU)
        setHasUsedSecondChance(true);
        setQuestions(newQuestions);
        setCurrentIndex(0);           // Niveau 1 / Question 1
        setSessionScore(0);            // Score remis à zéro
        setMultiplier(0.5);            // Multiplicateur initial
        setSelectedAnswer(null);
        setShowCorrection(false);
        setExplanation(`🔄 Seconde chance activée ! Pénalité de ${feePenalty} CP appliquée. Redémarrage au Niveau 1 !`);
        setTimeLeft(getDifficultySettings(difficulty).time);
        
        // Basculement DIRECT en jeu
        setStatus('playing');
        void init();

      } catch (err: unknown) {
        const error = err as Error;
        setAdErrorMessage(error.message || "Erreur lors du traitement de la seconde chance.");
        setStatus('second_chance_offer');
      } finally {
        setIsVerifyingAd(false);
        isVerifyingRef.current = false;
      }
    } else {
      setIsVerifyingAd(false);
      isVerifyingRef.current = false;
      const remainingSec = Math.ceil((MIN_REQUIRED_AD_TIME_MS - elapsedTime) / 1000);
      setAdErrorMessage(`Temps insuffisant sur la pub (${Math.round(elapsedTime / 1000)}s / 6s). Il manquait ${remainingSec}s.`);
      setStatus('second_chance_offer');
    }
  }, [profile?.id, category, difficulty, init]);

  // Écouteur de retour de l'utilisateur sur la page active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && gameStateRef.current.status === 'second_chance_pending') {
        void verifySecondChanceAd();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verifySecondChanceAd]);

  const handleAnswer = (ans: string | null) => {
    if (showCorrection || status !== 'playing' || isProcessingRef.current) return;
    triggerHaptic();
    
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true);

    const difficultySettings = getDifficultySettings(difficulty);

    if (ans === questions[currentIndex]?.correct) {
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
      setExplanation(`❌ Mauvaise réponse. Solution : ${questions[currentIndex]?.correct}`);

      setTimeout(() => {
        // Propose la Seconde Chance si pas en mode Challenge ET non encore utilisée
        if (!challengeId && !hasUsedSecondChance) {
          setStatus('second_chance_offer');
        } else {
          const currentGain = Math.floor(lockedBetRef.current * multiplier);
          void finalizeGame(multiplier >= 1.0, currentGain);
        }
      }, 1400);
    }
  };

  // CHRONOMÈTRE DE QUESTION
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

  return (
    <NeonGameShell accent="amber" className="h-[100dvh] w-full max-w-md mx-auto p-3 font-black uppercase flex flex-col justify-between select-none overflow-hidden bg-slate-950 relative">
      
      <MonetagAdScript zoneId="11431323" />

      {/* EN-TÊTE FIXE */}
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
            <span className="text-xs text-amber-200 tracking-wider">
              {profile?.jetons_cp?.toLocaleString() || 0} <span className="text-[9px] text-amber-400">CP</span>
            </span>
          </div>

          <button 
            onClick={() => setMuted(v => !v)} 
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 active:scale-90"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* ZONE CENTRALE */}
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
          
          /* MODE JEU (AFFICHE NIVEAU 1 À 5) */
          <div className="flex flex-col justify-between h-full max-h-[500px] gap-2">
            
            <div className="flex-none space-y-1">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] text-slate-400">GAIN ESTIMÉ / MULTIPLICATEUR</span>
                  <div className="text-lg text-emerald-400 font-black italic leading-none flex items-center gap-2">
                    <span>x{multiplier.toFixed(2)}</span>
                    <span className="text-xs text-amber-300">({Math.floor(lockedBetRef.current * multiplier)} CP)</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] text-slate-400">NIVEAU / PROGRESSION</span>
                  <div className="text-xs text-amber-300 font-black leading-none">NIVEAU {currentIndex + 1} / 5</div>
                </div>
              </div>

              {/* BARRE TIMER */}
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

            {/* CHOIX DE RÉPONSES */}
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

        ) : status === 'second_chance_offer' || status === 'second_chance_pending' ? (

          /* OFFRE DE SECONDE CHANCE EN CAS D'ÉCHEC SUR UN NIVEAU */
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center my-auto p-2">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center animate-bounce">
              <RefreshCw size={28} />
            </div>

            <div>
              <h2 className="text-xl font-black italic text-amber-400">SECONDE CHANCE !</h2>
              <p className="text-[10px] text-slate-300 mt-1">
                Passez au moins <span className="text-amber-400 font-bold">6 secondes</span> sur l'annonce. La partie recommencera **directement au Niveau 1** avec une mise réduite de 50%.
              </p>
            </div>

            <div className="bg-slate-900/90 w-full p-3 rounded-xl border border-amber-400/30 text-left space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Pénalité (50%) :</span>
                <span className="text-rose-400 font-bold">-{Math.floor(initialMiseRef.current * 0.5)} CP</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Nouvelle mise pour le Niveau 1 :</span>
                <span className="text-amber-300 font-bold">{Math.floor(initialMiseRef.current * 0.5)} CP</span>
              </div>
            </div>

            {adErrorMessage && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg text-rose-300 text-[9px] text-left">
                <AlertCircle size={14} className="shrink-0" />
                <span>{adErrorMessage}</span>
              </div>
            )}

            {status === 'second_chance_pending' ? (
              <div className="w-full py-3.5 bg-amber-500/20 border border-amber-400 text-amber-300 rounded-xl font-black text-xs italic flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>VÉRIFICATION DU TEMPS SUR L'ANNONCE (6s MIN)...</span>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <button 
                  onClick={triggerSecondChanceAd}
                  disabled={isVerifyingAd || (profile?.jetons_cp || 0) < Math.floor(initialMiseRef.current * 0.5)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-emerald-400 text-black rounded-xl font-black text-xs italic shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ExternalLink size={16} />
                  <span>VOIR L'ANNONCE & RETENTER AU NIVEAU 1</span>
                </button>

                <button 
                  onClick={() => {
                    const currentGain = Math.floor(lockedBetRef.current * multiplier);
                    void finalizeGame(multiplier >= 1.0, currentGain);
                  }}
                  className="w-full py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl font-black text-[10px] italic hover:bg-white/10 transition-all"
                >
                  ABANDONNER ET QUITTER ({Math.floor(lockedBetRef.current * multiplier)} CP)
                </button>
              </div>
            )}
          </div>

        ) : (

          /* ÉCRAN DE RÉSULTAT */
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center my-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${status === 'lost' && !challengeId ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {status === 'lost' && !challengeId ? <XCircle size={36}/> : <Trophy size={36}/>}
            </div>

            <div>
              <h2 className={`text-2xl font-black italic ${status === 'lost' && !challengeId ? 'text-rose-500' : 'text-emerald-400'}`}>
                {challengeId ? "MISSION TERMINÉE" : (status === 'lost' ? "PERDU" : "VICTOIRE")}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {challengeId ? "POINTS AJOUTÉS AU SCORE" : "GAINS OBTENUS"}
              </p>
            </div>

            <div className="bg-slate-900/90 w-full p-4 rounded-xl border border-white/10">
              <span className="text-3xl font-black text-white italic">
                {challengeId ? sessionScore : Math.floor(lockedBetRef.current * multiplier)}
              </span>
              <span className="text-xs text-amber-400 ml-1">{challengeId ? 'PTS' : 'CP'}</span>
            </div>

            <button 
              onClick={() => challengeId ? router.push('/client/rank?challengeId=' + challengeId) : setStatus('idle')} 
              className="w-full py-3 bg-emerald-500 text-black rounded-xl font-black text-sm italic shadow-md active:scale-95 transition-all"
            >
              {challengeId ? 'RETOURNER AU CLASSEMENT' : 'REJOUER UNE PARTIE'}
            </button>
          </div>

        )}

      </div>

      {/* HISTORIQUE */}
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
    <Suspense fallback={
      <div className="h-[100dvh] bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    }>
      <QuizGameContent />
    </Suspense>
  );
}
