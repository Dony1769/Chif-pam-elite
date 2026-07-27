"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, 
  Laptop, Film, Award, BookOpen, MapPin, Construction, Wallet, 
  Coins, Target, Sparkles, Volume2, VolumeX, MessageCircleQuestion, 
  History, BarChart3 
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getGameEconomySettings, resolveGameEconomy } from '@/lib/game-economy';
import { NeonGameShell } from '@/components/game/NeonGameShell';

// --- TYPAGE ---
type DifficultyType = 'facile' | 'intermédiaire' | 'difficile';

interface QuestionItem {
  question: string;
  correct: string;
  answers: string[];
}

interface GameHistoryItem {
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
  { id: 9, name: "Général", icon: <Brain size={16}/> },
  { id: 23, name: "Histoire", icon: <Globe size={16}/> },
  { id: 11, name: "Film", icon: <Film size={16}/> },
  { id: 21, name: "Sports", icon: <Award size={16}/> },
  { id: 12, name: "Musique", icon: <Music size={16}/> },
  { id: 18, name: "Tech", icon: <Laptop size={16}/> },
  { id: 10, name: "Livres", icon: <BookOpen size={16}/> },
  { id: 22, name: "Géo", icon: <MapPin size={16}/> },
];

function QuizGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  // --- RETOUR HAPTIQUE ET SONORE ---
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 20, 10]);
    }
  };

  const playQuizSound = (type: 'correct' | 'wrong' | 'tick') => {
    if (muted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  const [multiplier, setMultiplier] = useState<number>(0.5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [, setCombo] = useState<number>(1);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  
  // --- REFS CRITIQUES ---
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const translate = async (text: string): Promise<string> => {
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
      alert("Mise minimum 10 CP"); 
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
      const processed: QuestionItem[] = await Promise.all(raw.results.map(async (q: any) => {
        const dQ = decodeURIComponent(q.question);
        const dC = decodeURIComponent(q.correct_answer);
        const dI = q.incorrect_answers.map((a: string) => decodeURIComponent(a));
        const [qF, cF, ...iF] = await Promise.all([translate(dQ), translate(dC), ...dI.map((a: string) => translate(a))]);
        return { 
          question: qF, 
          correct: cF, 
          answers: [cF, ...iF].sort(() => Math.random() - 0.5) 
        };
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
      setMultiplier(0.5);
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

    if (ans === questions[currentIndex].correct) {
      playQuizSound('correct');
      const difficultySettings = getDifficultySettings(difficulty);
      const pointsToAdd = difficultySettings.points;
      setSessionScore(prev => prev + pointsToAdd);

      const nextM = parseFloat((multiplier + difficultySettings.step).toFixed(2));
      setMultiplier(nextM);
      setCombo(prev => prev + 1);
      setExplanation(`✅ Bonne réponse (+${pointsToAdd} pts)`);
      
      setTimeout(() => {
        if (currentIndex < 4) {
          setCurrentIndex(p => p + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(getDifficultySettings(difficulty).time);
        } else { 
          finalizeGame(true); 
        }
      }, 1300);
    } else {
      playQuizSound('wrong');
      setCombo(1);
      setExplanation(`❌ Correction : ${questions[currentIndex].correct}`);
      setTimeout(() => {
        finalizeGame(false);
      }, 1500);
    }
  };

  const finalizeGame = async (isWin: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    if (!gameId) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const secureBet = lockedBetRef.current;
    const economy = resolveGameEconomy({
      gameId: 'quiz',
      bet: secureBet,
      difficulty,
      multiplier,
      currentStep: currentIndex,
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1
    });
    
    const gainCP = challengeId ? 0 : (isWin ? economy.payout : 0);

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
      }).eq('id', gameId);

      setHistory(prev => [{ 
        label: `${difficulty} • ${CATEGORIES.find(c => c.id === category)?.name || 'Général'}`, 
        score: sessionScore, 
        difficulty 
      }, ...prev].slice(0, 5));
      
      setStatus(isWin ? 'ended' : 'lost');
    } catch (e: any) {
      console.error(e);
    } finally {
      isProcessingRef.current = false;
      setShowCorrection(false);
      init(); 
    }
  };

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
  const totalCategoryTime = getDifficultySettings(difficulty).time;
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / totalCategoryTime) * 100));

  return (
    <NeonGameShell accent="amber" className="h-[100dvh] w-full p-3 font-black uppercase flex flex-col justify-between overflow-hidden select-none">
      
      {/* HEADER COMPACT AVEC SOLDE */}
      <div className="flex w-full items-center justify-between gap-2 shrink-0 h-12">
        <button 
          onClick={() => router.push(challengeId ? '/client/rank?challengeId=' + challengeId : '/client/home')} 
          className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-amber-200 active:scale-90 transition-transform"
        >
          <ChevronLeft size={20}/>
        </button>

        <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5">
          <Coins size={14} className="text-amber-300" />
          <span className="text-xs italic text-amber-200">{profile?.jetons_cp?.toLocaleString() || 0} CP</span>
        </div>

        <button 
          onClick={() => setMuted(v => !v)} 
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 active:scale-90 transition-transform"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* CONTENU PRINCIPAL SANS SCROLL */}
      <div className="flex-1 flex flex-col justify-center my-auto overflow-hidden">
        {status === 'maintenance' ? (
          <div className="flex flex-col items-center justify-center py-8 bg-white/5 rounded-3xl border border-white/5">
            <Construction size={48} className="text-amber-500 animate-pulse" />
            <h2 className="text-xl text-amber-500 mt-3 italic">MAINTENANCE</h2>
            <p className="text-zinc-500 text-[10px] mt-2 px-6 text-center">{maintenanceMsg}</p>
          </div>
        ) : status === 'idle' || status === 'loading' ? (
          /* CONFIGURATION DE LA PARTIE (ÉCRAN ACCUEIL DU JEU) */
          <div className="flex flex-col justify-between h-full py-1 space-y-3 overflow-y-auto no-scrollbar">
            
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-2xl border border-amber-400/20 bg-black/40 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Sparkles size={14} />
                <span className="text-[9px] tracking-wider">Premium Insights</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-amber-200/80">
                <Brain size={12} /> {difficultyBadge}
              </div>
            </motion.div>

            {status === 'loading' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-amber-400" size={48}/>
                <span className="text-xs text-amber-300/80 mt-3 italic">Chargement...</span>
              </div>
            ) : (
              <>
                {challengeId && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2">
                      <Target size={20} className="text-black" />
                      <div>
                        <p className="text-xs font-black italic">MISSION CIBLÉE</p>
                        <p className="text-[8px] opacity-90">CUMULEZ DES POINTS AU CLASSEMENT</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* CATEGORIES GRILLE COMPACTE 4x2 */}
                <div className="grid grid-cols-4 gap-1.5">
                  {CATEGORIES.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => setCategory(c.id)} 
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 ${
                        category === c.id 
                          ? 'border-amber-400 bg-amber-500 text-black font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]' 
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {c.icon} 
                      <span className="text-[8px] mt-1 truncate w-full text-center">{c.name}</span>
                    </button>
                  ))}
                </div>

                {/* DIFFICULTÉ */}
                <div className="flex gap-1.5">
                  {(Object.keys(SETTINGS) as DifficultyType[]).map((d) => (
                    <button 
                      key={d} 
                      onClick={() => setDifficulty(d)} 
                      className={`flex-1 rounded-xl border py-2.5 text-[9px] font-bold transition-all active:scale-95 ${
                        difficulty === d 
                          ? 'border-amber-400 bg-white text-black shadow-md' 
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      {d.toUpperCase()}
                      <span className="block text-[7px] opacity-60">+{SETTINGS[d].points} PTS</span>
                    </button>
                  ))}
                </div>

                {/* SAISIE DE LA MISE */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 flex items-center justify-between">
                  <div>
                    <span className={`text-[9px] italic block ${challengeId ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {challengeId ? "FRAIS DE MISSION" : "VOTRE MISE CP"}
                    </span>
                    <input 
                      type="number" 
                      value={betCP} 
                      disabled={!!challengeId}
                      onChange={e => setBetCP(Math.max(10, Number(e.target.value)))} 
                      className={`bg-transparent text-left outline-none w-32 text-2xl font-black italic ${challengeId ? 'text-amber-400' : 'text-white'}`}
                    />
                  </div>
                  <Brain size={32} className="text-white/10" />
                </div>

                {/* HISTORIQUE COMPACT */}
                {history.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                    <div className="flex items-center gap-1 text-[8px] text-slate-400 mb-1">
                      <History size={10} /> RECENTS
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {history.map((item, idx) => (
                        <div key={idx} className="shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[8px] text-slate-300">
                          {item.label} : <span className="text-emerald-400">{item.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BOUTON LANCER */}
                <button 
                  onClick={start} 
                  disabled={isProcessingRef.current} 
                  className={`w-full rounded-2xl py-4 text-lg font-black italic shadow-lg transition-all active:scale-95 ${
                    challengeId 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                      : 'bg-gradient-to-r from-amber-400 to-emerald-500 text-white'
                  }`}
                >
                  {isProcessingRef.current ? <Loader2 className="animate-spin mx-auto" size={20}/> : challengeId ? 'LANCER LA SÉQUENCE' : 'COMMENCER LE QUIZ'}
                </button>
              </>
            )}
          </div>
        ) : status === 'playing' ? (
          /* DÉROULEMENT DU JEU : GARANTIE 100% SANS SCROLL */
          <div className="flex flex-col justify-between h-full py-1">
            
            {/* EN-TÊTE DE JEU (SCORE + CASH OUT + PROGRESSION) */}
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[8px] text-slate-400 italic">SCORE / MULTIPLICATEUR</p>
                  <p className="text-xl text-emerald-400 font-black italic">
                    {challengeId ? `+${sessionScore} PTS` : `x${multiplier.toFixed(2)}`}
                  </p>
                </div>

                {!challengeId && multiplier > 1.2 && (
                  <button 
                    onClick={() => finalizeGame(true)} 
                    className="bg-emerald-500 text-black px-3 py-1.5 rounded-full text-[9px] font-black flex items-center gap-1 shadow-md active:scale-95 transition-transform"
                  >
                    <Wallet size={12}/> ENCAISSER {Math.floor(lockedBetRef.current * multiplier)} CP
                  </button>
                )}

                <div className="flex items-center gap-1 text-[9px] text-slate-300 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                  <BarChart3 size={12} className="text-amber-400" />
                  <span>{currentIndex + 1} / 5</span>
                </div>
              </div>

              {/* TIMER INTEGRÉ VISIBLE */}
              <div className="w-full bg-black/40 rounded-full border border-white/10 p-0.5 relative overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-100 ${
                    timeLeft < 2.5 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-amber-400'
                  }`} 
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>
            </div>

            {/* BLOC QUESTION & EXPLICATION */}
            <div className="my-auto flex flex-col justify-center">
              <div className="bg-slate-900/90 border border-amber-400/30 rounded-2xl p-4 text-center shadow-xl relative min-h-[120px] flex items-center justify-center">
                <span className="absolute top-2 left-3 text-[7px] text-amber-400/80 font-bold tracking-widest">
                  SECONDES RESTANTES : {timeLeft.toFixed(1)}S
                </span>
                <p className="text-sm md:text-base font-black italic leading-snug text-white">
                  {questions[currentIndex]?.question}
                </p>
              </div>

              {explanation && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-center text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl py-1 px-2">
                  {explanation}
                </motion.div>
              )}
            </div>

            {/* GRILLE DE RÉPONSES (2x2 POUR COMPACITÉ MAXIMUM SUR MOBILE) */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                let style = "bg-white/5 border-white/10 text-white active:bg-white/10";
                
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black font-black scale-[1.02] shadow-md";
                  else if (isSelected) style = "bg-rose-500 border-rose-500 text-white opacity-80";
                  else style = "opacity-25 border-transparent";
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(a)} 
                    disabled={showCorrection || isProcessingRef.current} 
                    className={`p-3 border rounded-xl text-left transition-all text-[10px] font-black italic min-h-[52px] flex items-center justify-center text-center leading-tight ${style}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>

          </div>
        ) : (
          /* ÉCRAN DE FIN DE PARTIE (RÉSULTATS) */
          <div className="text-center py-4 space-y-4 my-auto">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              status === 'lost' && !challengeId ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              {status === 'lost' && !challengeId ? <XCircle size={40} className="text-rose-500"/> : <Trophy size={40} className="text-emerald-500"/>}
            </div>

            <h2 className={`text-2xl font-black italic ${status === 'lost' && !challengeId ? 'text-rose-500' : 'text-emerald-500'}`}>
              {challengeId ? "MISSION COMPLÈTE" : (status === 'lost' ? "ÉCHEC DE LA SESSION" : "VICTOIRE !")}
            </h2>
            
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-[8px] text-zinc-400 mb-1 font-bold italic tracking-widest">
                {challengeId ? "POINTS AJOUTÉS AU CLASSEMENT" : "GAIN TOTAL OBTENU"}
              </p>
              <p className="text-4xl font-black text-white italic tracking-tighter">
                {challengeId ? sessionScore : (status === 'lost' ? 0 : Math.floor(lockedBetRef.current * multiplier))} 
                <span className="text-sm text-emerald-400 ml-1.5 font-black">{challengeId ? 'PTS' : 'CP'}</span>
              </p>
            </div>

            <button 
              onClick={() => challengeId ? router.push('/client/rank?challengeId=' + challengeId) : setStatus('idle')} 
              className="w-full py-3.5 bg-emerald-500 text-black rounded-2xl font-black text-base italic shadow-lg active:scale-95 transition-all"
            >
              {challengeId ? 'VOIR MON RANG' : 'REJOUER UNE PARTIE'}
            </button>
          </div>
        )}
      </div>

    </NeonGameShell>
  );
}

export default function QuizElite() {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    }>
      <QuizGameContent />
    </Suspense>
  );
}
