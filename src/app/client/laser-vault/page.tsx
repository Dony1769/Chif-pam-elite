"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation'; // Ajout de useSearchParams
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, Info, X, TriangleAlert, ServerOff, Trophy } from 'lucide-react';
import { useChallenge } from '@/hooks/useChallenge'; // Import du Hook

// ... (Garder ton système audio et EliteAvatar tel quel)

export default function LaserVault() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId'); // On récupère l'ID du défi
  const { startChallengeEntry, submitChallengeScore } = useChallenge();

  // Tes états existants
  const [profile, setProfile] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ active: boolean; msg: string } | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [status, setStatus] = useState<'idle' | 'playing' | 'lost' | 'won'>('idle');
  const [showTutorial, setShowTutorial] = useState(false);
  const [bet, setBet] = useState(50);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [baseSpeed, setBaseSpeed] = useState(4);
  const [errorPenalty, setErrorPenalty] = useState(1.0);
  const lastTickRef = useRef<number>(0);

  // Charger le profil pour le user_id
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(prof);
      }
      // Ton check maintenance existant
      checkAccess();
    };
    init();
  }, []);

  const checkAccess = async () => { /* Ton code existant */ };

  // --- LOGIQUE DE DÉPART MODIFIÉE ---
  const startGame = async () => {
    setLoading(true);
    try {
      if (challengeId) {
        // MODE DÉFI : On récupère les infos du défi (frais)
        const { data: chall } = await supabase.from('challenges').select('entry_fee').eq('id', challengeId).single();
        if (!chall) throw new Error("Défi introuvable");

        // Calcul du frais VIP si nécessaire
        let finalFee = chall.entry_fee;
        if (profile?.vip_status === 'monthly') finalFee *= 0.75;
        else if (profile?.vip_status === 'weekly') finalFee *= 0.90;

        const { error } = await startChallengeEntry(challengeId, profile.id, finalFee);
        if (error) throw new Error(error);

        setBet(0); // Dans un défi, la mise est remplacée par le frais d'entrée
      } else {
        // MODE NORMAL : Ta mise RPC existante
        const { data: id, error } = await supabase.rpc('start_laser_vault', { p_bet: bet });
        if (error) throw new Error(error.message);
        setGameId(id);
      }
      
      // Reset jeu
      setMultiplier(1.0);
      setLaserY(0);
      setQuestionsSolved(0);
      setBaseSpeed(1);
      setErrorPenalty(1.0);
      setInput("");
      generateProblem(1.0);
      setStatus('playing');
      lastTickRef.current = performance.now();
      playSound('beep');
    } catch (e: any) { 
      alert(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- LOGIQUE DE SORTIE MODIFIÉE ---
  const cashout = async () => {
    if (questionsSolved < 1) return;
    
    if (challengeId) {
      // MODE DÉFI : On enregistre seulement le score (pas de gain immédiat)
      await submitChallengeScore(challengeId, profile.id, questionsSolved);
      setStatus('won');
    } else {
      // MODE NORMAL : Ton cashout RPC existant
      const finalPayout = Math.floor(bet * multiplier);
      await supabase.rpc('process_game_result', { 
        p_game_id: gameId, 
        p_table_name: 'vault_games', 
        p_payout: finalPayout, 
        p_win: true 
      });
      setStatus('won');
    }
    playSound('win');
  };

  // ... (Garder le reste de tes fonctions handleKey, etc.)

  return (
    <div className="h-screen bg-[#050508] text-white font-black italic uppercase overflow-hidden select-none flex flex-col">
      {/* Ton Header */}
      <div className="p-4 flex justify-between items-center bg-black/40 border-b border-emerald-500/10 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10"><ChevronLeft size={20}/></button>
        <div className="text-center">
          <h1 className="text-lg text-emerald-500 tracking-tighter">
            {challengeId ? "DÉFI COMMUNAUTAIRE" : "LASER VAULT"}
          </h1>
        </div>
        <button onClick={() => setShowTutorial(true)} className="p-2 text-emerald-500"><Info size={20}/></button>
      </div>

      <div className="flex-1 flex flex-col p-4 items-center justify-between overflow-hidden">
        {status === 'idle' ? (
          <div className="mt-10 w-full max-w-xs space-y-6 animate-in zoom-in">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center shadow-2xl relative">
                {challengeId ? (
                   <Trophy className="text-amber-500 mx-auto mb-4 mt-2" size={40} />
                ) : (
                   <Lock className="text-emerald-500 mx-auto mb-4 mt-2" size={40} />
                )}
                
                {/* Input masqué si c'est un défi (car le prix est fixe) */}
                {!challengeId ? (
                  <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-4xl font-black text-center w-full outline-none mb-6 text-white" />
                ) : (
                  <div className="mb-6">
                    <p className="text-xs text-slate-500">SCORE À BATTRE</p>
                    <p className="text-4xl text-white">TOP RANK</p>
                  </div>
                )}

                <button onClick={startGame} className={`w-full py-5 rounded-2xl text-xl font-bold active:scale-95 transition-all shadow-xl ${challengeId ? 'bg-amber-600 text-black' : 'bg-emerald-600 text-black'}`}>
                    {loading ? <Loader2 className="animate-spin mx-auto"/> : (challengeId ? "LANCER LE DÉFI" : "HACKER")}
                </button>
            </div>
          </div>
        ) : (
          /* Ton interface de jeu reste IDENTIQUE */
          // ... (Le code de ton interface de jeu)
        )}
      </div>

      {/* Ton écran de fin modifié pour les défis */}
      <AnimatePresence>
        {(status === 'lost' || status === 'won') && (
            <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-6xl font-black italic tracking-tighter">
                  {status === 'lost' ? 'ÉCHEC !' : (challengeId ? 'DÉFI COMPLÉTÉ' : 'VAULT OPENED')}
                </h2>
                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 w-full mt-8 mb-8">
                    {challengeId ? (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">VOTRE MEILLEUR SCORE</p>
                        <p className="text-5xl text-white font-black">{questionsSolved}</p>
                      </div>
                    ) : (
                      <p className="text-5xl text-white font-black">{status === 'lost' ? '0' : (bet * multiplier).toFixed(0)} <span className="text-xl text-emerald-500">HTG</span></p>
                    )}
                </div>
                <button onClick={() => challengeId ? router.push('/client/challenges') : setStatus('idle')} className="w-full py-6 bg-white text-black rounded-3xl font-black text-xl hover:bg-emerald-500 transition-colors">
                  {challengeId ? "VOIR LE CLASSEMENT" : "RETOUR AU TERMINAL"}
                </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
