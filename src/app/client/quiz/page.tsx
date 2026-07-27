"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, 
  Laptop, Film, Award, BookOpen, MapPin, Construction, Wallet, 
  Coins, Sparkles, Volume2, VolumeX, History
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getGameEconomySettings, resolveGameEconomy } from '@/lib/game-economy';
import { NeonGameShell } from '@/components/game/NeonGameShell';

// --- TYPAGE ---
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

const SETTINGS: Record<DifficultyType, { time: number; step: number; points: number }> = {
  facile: { time: 13, step: 0.15, points: 10 },
  intermédiaire: { time: 9, step: 0.20, points: 25 },
  difficile: { time: 6, step: 0.50, points: 50 }
};

const getDifficultySettings = (difficulty: DifficultyType) => {
  const profile = getGameEconomySettings('quiz', difficulty).profile;
  return {
    time: profile.time ?? SETTINGS[difficulty].time,
    step: profile.multiplierStep ?? SETTINGS[difficulty].step,
    points: profile.points ?? SETTINGS[difficulty].points
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

  // --- ÉTATS ---
  const [profile, setProfile] = useState<any>(null);
  const [betCP, setBetCP] = useState<number>(100);
  const [difficulty, setDifficulty] = useState<DifficultyType>('intermédiaire');
  const [category, setCategory] = useState<number>(9);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost' | 'maintenance'>('loading');
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>("Maintenance...");
  
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1.0); // Démarrage base 1.0x
  const [gameId, setGameId] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [, setCombo] = useState<number>(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [finalPayout, setFinalPayout] = useState<number>(0);

  // --- SÉCURITÉ & REFS ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const multiplierRef = useRef<number>(1.0);

  // Synchronisation de la ref pour l'accès instantané dans les callbacks asynchrones
  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

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
        setMaintenanceMsg(data.maintenance_msg);
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
      setProfile(prof);
    }
    checkMaintenance();
  }, []);

  useEffect(() => {
    init();
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
      setGameId(game.id);
      setQuestions(processed);
      setCurrentIndex(0);
      setMultiplier(1.0);
      setSessionScore(0);
      setCombo(1);
      setTimeLeft(difficultySettings.time);
      setExplanation('');
      setStatus('playing');
      
      isProcessingRef.current = false;

    } catch (e: any) {
      alert(e.message);
      setStatus('idle');
      isProcessingRef.current = false;
    }
  };

  const handleAnswer = (ans: string | null) => {
    if (showCorrection || status !== 'playing' || isProcessingRef.current) return;
    triggerHaptic();
    
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true);

    // Cas 1 : Temps écoulé (ans === null)
    if (ans === null) {
      playQuizSound('wrong');
      
      // Si le joueur a déjà au moins une bonne réponse (multiplicateur > 1.0) -> Auto Cashout
      if (multiplierRef.current > 1.0 && !challengeId) {
        setExplanation(`⏱️ Temps écoulé ! Encaissement automatique des gains accumulés.`);
        setTimeout(() => {
          finalizeGame(true); // Gagnant partiel
        }, 1200);
      } else {
        setExplanation(`⏱️ Temps écoulé ! Aucune réponse enregistrée.`);
        setTimeout(() => {
          finalizeGame(false); // Perte totale
        }, 1200);
      }
      return;
    }

    // Cas 2 : Bonne réponse
    if (ans === questions[currentIndex].correct) {
      playQuizSound('correct');
      const difficultySettings = getDifficultySettings(difficulty);
      const pointsToAdd = difficultySettings.points;
      setSessionScore(prev => prev + pointsToAdd);

      const nextM = parseFloat((multiplier + difficultySettings.step).toFixed(2));
      setMultiplier(nextM);
      setCombo(prev => prev + 1);
      setExplanation(`✅ Bonne réponse (+${pointsToAdd} pts).`);
      
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(p => p + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(getDifficultySettings(difficulty).time);
        } else { 
          finalizeGame(true); // Victoire totale
        }
      }, 1000);
    } 
    // Cas 3 : Mauvaise réponse
    else {
      playQuizSound('wrong');
      setCombo(1);
      setExplanation(`❌ Mauvaise réponse. La solution : ${questions[currentIndex].correct}`);
      
      // Si le joueur a accumulé un multiplicateur, on fait un encaissement partiel des étapes réussies
      if (multiplierRef.current > 1.0 && !challengeId) {
        setTimeout(() => {
          finalizeGame(true);
        }, 1200);
      } else {
        setTimeout(() => {
          finalizeGame(false);
        }, 1200);
      }
    }
  };

  const finalizeGame = async (isWin: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    if (!gameId) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const secureBet = lockedBetRef.current;
    
    // Calcul unifié selon l'économie définie côté administration
    const economy = resolveGameEconomy({
      gameId: 'quiz',
      bet: secureBet,
      difficulty,
      multiplier: multiplierRef.current,
      currentStep: currentIndex,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });
    
    const gainCP = challengeId ? 0 : (isWin ? economy.payout : 0);
    setFinalPayout(gainCP);

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
            p_jeu_nom: 'Quiz Victory/Cashout'
          });
        }
      }

      await supabase.from('quiz_games').update({ 
        is_active: false, 
        gain_cp: gainCP,
        is_won: isWin
      }).eq('id', gameId);

      setHistory(prev => [{ 
        label: `${difficulty} • ${CATEGORIES.find(c => c.id === category)?.name || 'Général'}`, 
        score: sessionScore, 
        difficulty 
      }, ...prev].slice(0, 3));
      
      setStatus(isWin ? 'ended' : 'lost');
    } catch (e: any) {
      console.error("Erreur lors de la finalisation :", e);
    } finally {
      isProcessingRef.current = false;
      setShowCorrection(false);
      init(); 
    }
  };

  // BOUCLE DU CHRONO
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

  const difficultyBadge = difficulty === 'facile' ? 'ÉCLAIR' : difficulty === 'intermédiaire' ? 'PRÉCIS' : 'MAESTRO';

  return (
    <NeonGameShell accent="amber" className="h-[100dvh] w-full max-w-md mx-auto p-2.5 font-black uppercase flex flex-col justify-between select-none overflow-hidden">
      
      {/* HEADER FIXE */}
      <div className="flex-none flex items-center justify-between mb-1">
        <button 
          onClick={() => router.push(challengeId ? '/client/rank?challengeId=' + challengeId : '/client/home')} 
          className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-1.5 text-amber-200 active:scale-90 transition-transform"
        >
          <ChevronLeft size={18}/>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-0.5 shadow-lg">
            <Coins size={12} className="text-amber-300" />
            <span className="text-[11px] italic text-amber-200">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
          </div>

          <button 
            onClick={() => setMuted(v => !v)} 
            className="rounded-full border border-white/10 bg-white/5 p-1.5 text-slate-300 active:scale-90"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* CONTENEUR PRINCIPAL SANS SCROLL */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
        
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center my-auto py-6 bg-white/5 rounded-[2rem] border border-white/5">
            <Construction size={40} className="text-amber-500 animate-pulse" />
            <h2 className="text-lg text-amber-500 mt-2 italic">MAINTENANCE</h2>
            <p className="text-zinc-500 text-[9px] mt-1 px-4 text-center">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          <div className="space-y-2 my-auto">
            
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-amber-500" size={40}/>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-black/30 px-2.5 py-1.5">
                  <div className="flex items-center gap-1 text-amber-300 text-[9px]">
                    <Sparkles size={12} />
                    <span>Mode Quiz Elite</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-amber-200/80">
                    <Brain size={12} /> {difficultyBadge}
                  </div>
                </div>

                {/* Grille des Catégories */}
                <div className="grid grid-cols-4 gap-1">
                  {CATEGORIES.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => setCategory(c.id)} 
                      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 transition-all ${category === c.id ? 'border-amber-400 bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)]' : 'border-white/10 bg-white/5 text-slate-400'}`}
                    >
                      {c.icon} 
                      <span className="text-[7.5px] font-black italic truncate max-w-full">{c.name}</span>
                    </button>
                  ))}
                </div>

                {/* Choix de Difficulté */}
                <div className="flex gap-1">
                  {(Object.keys(SETTINGS) as DifficultyType[]).map((d) => (
                    <button 
                      key={d} 
                      onClick={() => setDifficulty(d)} 
                      className={`flex-1 rounded-xl border py-1.5 text-[8.5px] font-bold transition-all ${difficulty === d ? 'border-amber-400 bg-white text-black' : 'border-white/10 bg-white/5 text-slate-400'}`}
                    >
                      {d.toUpperCase()} <br/> 
                      <span className="text-[6.5px] opacity-70">+{SETTINGS[d].points} PTS</span>
                    </button>
                  ))}
                </div>

                {/* Saisie de la Mise */}
                <div className="rounded-xl border border-white/10 bg-slate-950/80 p-2.5 shadow-md">
                  <span className={`text-[8.5px] italic font-bold block mb-0.5 ${challengeId ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {challengeId ? "FRAIS DE MISSION (FIXE)" : "MISE DE LA SESSION (CP)"}
                  </span>
                  <input 
                    type="number" 
                    value={betCP} 
                    disabled={!!challengeId}
                    onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
                    className={`bg-transparent outline-none w-full text-2xl font-black italic tracking-tighter ${challengeId ? 'text-amber-500' : 'text-white'}`}
                  />
                </div>

                {/* Bouton de Lancement */}
                <button 
                  onClick={start} 
                  disabled={isProcessingRef.current} 
                  className={`w-full rounded-xl py-3 text-base font-black italic shadow-lg active:scale-95 transition-all ${challengeId ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-gradient-to-r from-amber-400 to-emerald-500 text-white'}`}
                >
                  {isProcessingRef.current ? <Loader2 className="animate-spin mx-auto" size={20}/> : challengeId ? 'LANCER LA SÉQUENCE' : 'INITIALISER LE QUIZ'}
                </button>
              </>
            )}
          </div>
        ) : status === 'playing' ? (
          
          /* ÉCRAN DE JEU */
          <div className="flex-1 flex flex-col justify-between gap-1.5 py-0.5 min-h-0">
            
            {/* Barre de Statut & Multiplicateur */}
            <div className="flex-none space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[8px] text-slate-400">MULTIPLIER</span>
                  <p className="text-lg text-emerald-400 font-black italic leading-none">
                    {challengeId ? `+${sessionScore} PTS` : `x${multiplier.toFixed(2)}`}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[8px] text-slate-400">QUESTION</span>
                  <p className="text-xs text-amber-300 font-black leading-none">{currentIndex + 1} / 5</p>
                </div>

                {!challengeId && multiplier > 1.0 && (
                  <button 
                    onClick={() => finalizeGame(true)} 
                    className="bg-emerald-500 text-black px-2.5 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-md active:scale-95"
                  >
                    <Wallet size={10}/> ENCAISSER
                  </button>
                )}
              </div>

              {/* Chrono */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${timeLeft < 2 ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} 
                  style={{ width: `${(timeLeft / getDifficultySettings(difficulty).time) * 100}%` }}
                />
              </div>
            </div>

            {/* Carte de la Question */}
            <div className="flex-1 min-h-[90px] max-h-[140px] bg-white text-black p-3 rounded-xl flex flex-col justify-center items-center shadow-lg relative text-center">
              <span className="absolute top-1.5 right-2 text-[7.5px] text-slate-400 font-bold italic">
                {timeLeft.toFixed(1)}s
              </span>
              <p className="text-xs sm:text-sm font-black italic uppercase leading-snug">
                {questions[currentIndex]?.question}
              </p>
            </div>

            {/* Réponses */}
            <div className="flex-none grid grid-cols-1 gap-1.5">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/10 text-white active:bg-white/10";
                
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black scale-[1.01] shadow-md";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-80";
                  else style = "opacity-20 bg-white/5 border-transparent";
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(a)} 
                    disabled={showCorrection || isProcessingRef.current} 
                    className={`p-2.5 border rounded-xl text-left transition-all font-black text-[11px] italic flex items-center justify-between ${style}`}
                  >
                    <span className="truncate pr-2">{a}</span>
                    <span className="text-[8px] opacity-40 flex-none">0{i+1}</span>
                  </button>
                );
              })}
            </div>

            {/* Explication */}
            {explanation && (
              <motion.div initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} className="flex-none rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-1.5 text-center text-[8.5px] uppercase text-emerald-200 truncate">
                {explanation}
              </motion.div>
            )}

          </div>
        ) : (
          /* ÉCRAN DE FIN DE PARTIE */
          <div className="text-center my-auto py-4 space-y-3">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center border-2 ${status === 'lost' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
              {status === 'lost' ? <XCircle size={36} className="text-rose-500"/> : <Trophy size={36} className="text-emerald-500"/>}
            </div>

            <h2 className={`text-2xl font-black italic ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>
              {challengeId ? "MISSION COMPLÈTE" : (status === 'lost' ? "ÉCHEC" : "PARTIE TERMINÉE")}
            </h2>
            
            <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 backdrop-blur-xl">
              <p className="text-[8px] text-zinc-400 mb-0.5 font-bold italic tracking-widest">
                {challengeId ? "POINTS OBTENUS" : "JETONS RÉCUPÉRÉS"}
              </p>
              <p className="text-3xl font-black text-white italic tracking-tighter">
                {challengeId ? sessionScore : finalPayout} 
                <span className="text-sm text-emerald-500 ml-1 font-black">{challengeId ? 'PTS' : 'CP'}</span>
              </p>
            </div>

            <button 
              onClick={() => challengeId ? router.push('/client/rank?challengeId=' + challengeId) : setStatus('idle')} 
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-base italic shadow-lg active:scale-95 transition-all"
            >
              {challengeId ? 'VOIR MON RANG' : 'NOUVELLE SESSION'}
            </button>
          </div>
        )}

      </div>

      {/* HISTORIQUE FIXE EN BAS */}
      {(status === 'idle' && history.length > 0) && (
        <div className="flex-none mt-1 rounded-xl border border-white/10 bg-black/30 p-2">
          <div className="mb-1 flex items-center justify-between text-[8px] uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1"><History size={10} /> Historique</span>
          </div>
          <div className="space-y-0.5">
            {history.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] text-slate-300">
                <span className="truncate">{item.label}</span>
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
