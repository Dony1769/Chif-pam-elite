"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Brain, Trophy, Loader2, ChevronLeft, XCircle, Globe, Music, Laptop, Film, Award, BookOpen, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CONFIGURATION DU JEU
const SETTINGS = {
  facile: { time: 10, step: 0.20 },       // Gain x0.20 par question
  intermédiaire: { time: 7, step: 0.50 }, // Gain x0.50 par question
  difficile: { time: 4, step: 1.00 }      // Gain x1.00 par question
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
  
  // États du jeu
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [category, setCategory] = useState(9); // ID par défaut (Général)
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'ended' | 'lost'>('idle');
  
  // Données de la partie
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameId, setGameId] = useState<string | null>(null);
  
  // États d'interface
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<any>(null);

  // Fonction de traduction optimisée (Timeout 2s pour éviter le blocage)
  const translate = async (text: string) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`, { signal: controller.signal });
      clearTimeout(id);
      const data = await res.json();
      return data[0][0][0];
    } catch { 
      return text; // Retourne l'anglais si Google échoue
    }
  };

  // --- DÉMARRAGE DU JEU ---
  const start = async () => {
    if (bet < 10 || isProcessing) return;
    setIsProcessing(true);
    setStatus('loading');

    try {
      // 1. Vérif session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // 2. Récupération de 5 questions (Mode optimisé url3986 pour éviter les bugs de caractères)
      const res = await fetch(`https://opentdb.com/api.php?amount=5&category=${category}&type=multiple&encode=url3986`);
      const raw = await res.json();
      
      if (!raw.results || raw.results.length === 0) throw new Error("API Question Error");

      // 3. Traduction en parallèle (Tout traduire d'un coup pour la vitesse)
      const processed = await Promise.all(raw.results.map(async (q: any) => {
        // Décodage de l'URL encoding de l'API
        const decodedQ = decodeURIComponent(q.question);
        const decodedCorrect = decodeURIComponent(q.correct_answer);
        const decodedIncorrect = q.incorrect_answers.map((a:string) => decodeURIComponent(a));

        // Lancement des traductions simultanées
        const [qFr, cFr, ...iFr] = await Promise.all([
            translate(decodedQ),
            translate(decodedCorrect),
            ...decodedIncorrect.map((a:string) => translate(a))
        ]);

        return {
          question: qFr,
          correct: cFr,
          answers: [cFr, ...iFr].sort(() => Math.random() - 0.5) // Mélange des réponses
        };
      }));

      // 4. Débit de l'argent (SEULEMENT MAINTENANT, car les questions sont prêtes)
      const { data: paid, error: betError } = await supabase.rpc('process_bet', { amount: bet });
      if (betError || !paid) { 
        alert("Solde insuffisant."); 
        setStatus('idle');
        return; 
      }

      // 5. Création de la partie en base
      const { data: game, error: insErr } = await supabase.from('quiz_games').insert([{
        user_id: user.id,
        bet_amount: bet,
        difficulty,
        questions_data: processed,
        status: 'playing'
      }]).select().single();

      if (insErr) throw insErr;

      // 6. Lancement
      setGameId(game.id);
      setQuestions(processed);
      setMultiplier(1.0);
      setCurrentIndex(0);
      setTimeLeft(SETTINGS[difficulty].time);
      setStatus('playing');

    } catch (e) {
      console.error(e);
      alert("Erreur de connexion au serveur de questions. Réessayez.");
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- GESTION DU TIMER ---
  useEffect(() => {
    if (status === 'playing' && timeLeft > 0 && !showCorrection) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))));
      }, 100);
    } else if (timeLeft <= 0 && status === 'playing' && !showCorrection) {
      handleAnswer(null); // Temps écoulé = mauvaise réponse
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, status, showCorrection]);

  // --- GESTION DE LA RÉPONSE ---
  const handleAnswer = (ans: string | null) => {
    if (showCorrection || status !== 'playing') return;
    
    clearInterval(timerRef.current);
    setSelectedAnswer(ans);
    setShowCorrection(true); // Bloque l'interface et montre les couleurs

    const currentQ = questions[currentIndex];
    const isCorrect = ans === currentQ.correct;

    if (isCorrect) {
      // GAGNÉ : On augmente le multiplicateur
      const nextM = parseFloat((multiplier + SETTINGS[difficulty].step).toFixed(2));
      setMultiplier(nextM);
      
      // Attendre 1.5s puis passer à la suite ou encaisser
      setTimeout(() => {
        if (currentIndex < 4) { // Si moins de 5 questions (0 à 4)
          setCurrentIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setShowCorrection(false);
          setTimeLeft(SETTINGS[difficulty].time);
        } else {
          cashout(nextM); // Fin du jeu (victoire totale)
        }
      }, 1500);

    } else {
      // PERDU : On montre la correction 2 secondes, puis écran de défaite
      setTimeout(() => {
        setStatus('lost');
      }, 2000);
    }
  };

  // --- ENCAISSEMENT ---
  const cashout = async (finalM: number) => {
    if (!gameId || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase.rpc('claim_quiz_win', { 
        p_game_id: gameId, 
        p_final_multiplier: finalM 
      });
      
      if (error) throw error;
      setStatus('ended');
    } catch (e) {
      alert("Erreur lors de l'encaissement. Contactez le support.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RENDU ---
  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black uppercase flex flex-col items-center select-none font-sans">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => status === 'playing' ? null : router.push('/client/home')} className={`p-3 bg-white/5 rounded-2xl border border-white/10 ${status === 'playing' ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <ChevronLeft/>
        </button>
        <h1 className="text-2xl text-emerald-500 tracking-tighter italic">QUIZ ELITE</h1>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-md space-y-4">
        
        {/* ÉCRAN D'ACCUEIL / CHARGEMENT */}
        {status === 'idle' || status === 'loading' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
            {/* Choix Catégorie */}
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${category === c.id ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                  {c.icon} <span className="text-[7px] font-bold">{c.name}</span>
                </button>
              ))}
            </div>

            {/* Choix Difficulté */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              {(['facile', 'intermédiaire', 'difficile'] as const).map(m => (
                <button key={m} onClick={() => setDifficulty(m)} className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === m ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                  {m}
                </button>
              ))}
            </div>

            {/* Zone de Mise */}
            <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/10 flex justify-between items-center">
                <span className="text-emerald-500 text-xs tracking-widest">MISE (HTG)</span>
                <input type="number" value={bet} onChange={e => setBet(Math.max(0, Number(e.target.value)))} className="bg-transparent text-right outline-none w-24 text-2xl font-black text-white placeholder-slate-600"/>
              </div>
              <button 
                onClick={start} 
                disabled={status === 'loading'} 
                className="w-full py-6 bg-emerald-500 text-black rounded-3xl text-xl shadow-[0_5px_0px_rgba(6,95,70,1)] active:shadow-none active:translate-y-[5px] transition-all flex justify-center items-center"
              >
                {status === 'loading' ? <Loader2 className="animate-spin"/> : "JOUER (5 QUESTIONS)"}
              </button>
            </div>
          </div>
        ) : status === 'playing' ? (
          
          /* ÉCRAN DE JEU */
          <div className="space-y-5 animate-in zoom-in duration-300">
            {/* Infos Gain */}
            <div className="flex justify-between gap-3 text-center">
              <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <p className="text-[8px] text-slate-500 mb-1 tracking-widest">COTE</p>
                <p className="text-emerald-500 text-xl font-black">{multiplier.toFixed(2)}x</p>
              </div>
              <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <p className="text-[8px] text-slate-500 mb-1 tracking-widest">GAIN POTENTIEL</p>
                <p className="text-amber-500 text-xl font-black">{(bet * multiplier).toFixed(0)}</p>
              </div>
            </div>

            {/* Barre de temps */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-100 ease-linear ${timeLeft < 2 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${(timeLeft / SETTINGS[difficulty].time) * 100}%` }}
              />
            </div>

            {/* Carte Question */}
            <div className="bg-white text-black p-8 rounded-[2rem] text-center min-h-[160px] flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <span className="text-[9px] text-slate-400 mb-3 font-bold tracking-[0.2em]">QUESTION {currentIndex + 1} / 5</span>
              <p className="text-lg leading-snug font-black">{questions[currentIndex]?.question}</p>
            </div>

            {/* Grille Réponses */}
            <div className="grid gap-3">
              {questions[currentIndex]?.answers.map((a: string, i: number) => {
                const isCorrect = a === questions[currentIndex].correct;
                const isSelected = a === selectedAnswer;
                
                // Logique de couleur
                let style = "bg-white/5 border-white/10 text-white hover:bg-white/10";
                if (showCorrection) {
                  if (isCorrect) style = "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-[1.02]"; // Toujours montrer la bonne réponse
                  else if (isSelected && !isCorrect) style = "bg-rose-500 border-rose-500 text-white opacity-50"; // Griser la mauvaise
                  else style = "opacity-30"; // Griser les autres
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(a)} 
                    disabled={showCorrection} 
                    className={`p-5 border rounded-2xl text-left transition-all duration-200 font-bold text-sm ${style}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>

            {/* Bouton Cashout (si on a déjà gagné au moins une fois) */}
            {!showCorrection && multiplier > 1 && (
              <button onClick={() => cashout(multiplier)} className="w-full py-4 bg-amber-500 text-black rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-all mt-2">
                SÉCURISER {(bet * multiplier).toFixed(0)} HTG
              </button>
            )}
          </div>

        ) : (
          
          /* ÉCRAN DE FIN (GAGNÉ ou PERDU) */
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-500">
            <div className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center border-4 ${status === 'lost' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                {status === 'lost' ? <XCircle size={60} className="text-rose-500"/> : <Trophy size={60} className="text-emerald-500"/>}
            </div>
            
            <div className="space-y-2">
              <h2 className={`text-6xl font-black italic tracking-tighter ${status === 'lost' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {status === 'lost' ? "ÉCHEC" : "VICTOIRE"}
              </h2>
              <p className="text-slate-400 text-sm">
                {status === 'lost' ? "Dommage, retente ta chance !" : "Félicitations, c'est dans la poche !"}
              </p>
            </div>

            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] mb-2 tracking-widest font-bold">MONTANT GAGNÉ</p>
                <p className="text-5xl font-black text-white">
                  {(status === 'lost' ? 0 : bet * multiplier).toFixed(0)} 
                  <span className="text-lg text-emerald-500 ml-2">HTG</span>
                </p>
            </div>

            <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white text-black rounded-3xl font-black text-xl shadow-xl hover:scale-[1.02] transition-transform">
              REJOUER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
