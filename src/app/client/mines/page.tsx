"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Gem, Bomb, Coins, Loader2, ChevronLeft, Zap, TrendingUp, ShieldAlert, Lock, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
// Import Publicité
import ExoClickBanner from "@/components/ads/ExoClickBanner";

export default function MinesElite() {
  const router = useRouter();
  
  // --- ÉTATS ---
  const [bet, setBet] = useState(100); // Mise en CP (Input UI)
  const [jetonsCP, setJetonsCP] = useState(0); 
  const [difficulty, setDifficulty] = useState<'facile' | 'intermédiaire' | 'difficile'>('intermédiaire');
  const [mines, setMines] = useState(8);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [userId, setUserId] = useState<string | null>(null);

  // --- MAINTENANCE ---
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [checkingSystem, setCheckingSystem] = useState(true);

  // 🔒 SÉCURITÉ & REFS CRITIQUES
  const lockedBetRef = useRef<number>(0); // Stocke la mise inviolable au lancement
  const isProcessingRef = useRef<boolean>(false); // Mutex pour empêcher les doubles appels

  // TIMER
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      // Temps écoulé = Défaite forcée (Bombe simulée)
      handleGameOver(true); 
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  // INITIALISATION
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from('profiles').select('jetons_cp').eq('id', user.id).single();
        if (data) setJetonsCP(data.jetons_cp);
      } else {
        router.push('/connexion');
      }

      const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'mines').maybeSingle();
      if (data && data.is_active === false) {
        setIsMaintenance(true);
        setMaintenanceMsg(data.maintenance_msg || "Maintenance en cours...");
      }
      setCheckingSystem(false);
    };
    init();
  }, []);

  useEffect(() => {
    const counts = { facile: 5, intermédiaire: 8, difficile: 11 };
    setMines(counts[difficulty]);
  }, [difficulty]);

  // --- CALCUL DU MULTIPLICATEUR ---
  // Base 0.5 + Incrément selon difficulté
  const getMultiplier = (revealedCount = revealed.length) => {
    const steps = { facile: 0.20, intermédiaire: 0.35, difficile: 0.50 };
    return parseFloat((0.5 + (revealedCount * steps[difficulty])).toFixed(2));
  };

  const start = async () => {
    if (isProcessingRef.current || isMaintenance || !userId) return;
    if (bet < 10 || bet > jetonsCP || loading) return;
    
    setLoading(true);
    isProcessingRef.current = true; // Verrouillage temporaire pendant l'init

    try {
      const finalBet = Math.floor(bet);
      
      // 🔒 VERROUILLAGE DÉFINITIF DE LA MISE
      lockedBetRef.current = finalBet;

      // 1. Transaction RPC : DÉBIT MISE CP
      const { data: ok, error } = await supabase.rpc('jouer_partie_cp', { 
          p_user_id: userId,
          p_mise_cp: finalBet,
          p_gain_cp: 0,
          p_jeu_nom: 'Mines Bet'
      });

      if (error || !ok.success) {
        alert("Solde insuffisant !");
        setLoading(false);
        isProcessingRef.current = false;
        return;
      }

      setJetonsCP(prev => prev - finalBet); 

      // 2. Génération Mines (Côté client pour la démo, idéalement côté serveur)
      const pos = Array.from({ length: 25 }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, mines);
      
      // 3. Création partie DB
      const { data: game, error: gameErr } = await supabase.from('mines_games').insert([{
        user_id: userId,
        bet_amount: finalBet,
        mines_count: mines,
        mine_positions: pos,
        difficulty_level: difficulty,
        is_active: true
      }]).select().single();

      if (gameErr) throw gameErr;

      setGameId(game.id);
      setMinePositions(pos);
      setRevealed([]);
      setTimeLeft(20);
      setStatus('playing');
      
      // Déverrouillage pour le jeu
      isProcessingRef.current = false;

    } catch (err) {
      alert("Erreur technique.");
      isProcessingRef.current = false;
    } finally { setLoading(false); }
  };

  const clickTile = (i: number) => {
    if (status !== 'playing' || revealed.includes(i) || isProcessingRef.current) return;
    
    // BOOM (Mine touchée)
    if (minePositions.includes(i)) {
      handleGameOver(true); // true = forced loss
      return;
    }
    
    // SAFE
    setRevealed(prev => [...prev, i]);
  };

  // --- FIN DE PARTIE SÉCURISÉE ---
  const handleGameOver = async (isBombHit: boolean) => {
    // 🛡️ ANTI DOUBLE-APPEL
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (!gameId) return;
    
    // Calcul basé sur l'état actuel
    const currentMult = getMultiplier();
    
    // 🔒 UTILISATION DE LA MISE SÉCURISÉE (Pas l'input)
    const secureBet = lockedBetRef.current;
    
    let winAmount = 0;

    if (!isBombHit) {
        // ENCAISSEMENT MANUEL (Succès Normal)
        winAmount = Math.floor(secureBet * currentMult);
    } else {
        // ÉCHEC (Bombe ou Temps)
        if (currentMult <= 1.0) {
            // ZONE SÉCURITÉ : On sauve les meubles (Encaissement auto)
            winAmount = Math.floor(secureBet * currentMult);
        } else {
            // ZONE DANGER : Perte totale
            winAmount = 0;
        }
    }

    setStatus('ended');

    try {
        // Transaction Gain (si > 0)
        if (winAmount > 0) {
            await supabase.rpc('jouer_partie_cp', {
                p_user_id: userId,
                p_mise_cp: 0,
                p_gain_cp: winAmount,
                p_jeu_nom: isBombHit ? 'Mines Safety Cashout' : 'Mines Win'
            });
            setJetonsCP(prev => prev + winAmount);
        }

        // Fermeture session DB
        await supabase.from('mines_games').update({ 
            is_active: false,
            payout: winAmount,
            status: winAmount > 0 ? 'won' : 'lost'
        }).eq('id', gameId);

    } catch (error) {
        console.error("Erreur clôture:", error);
    } finally {
        // On laisse le statut 'ended' mais on déverrouille pour permettre "Rejouer"
        isProcessingRef.current = false;
    }
  };

  const cashout = async () => {
    // Min 1 case pour encaisser
    if (status !== 'playing' || revealed.length < 1 || loading) return; 
    
    setLoading(true);
    try {
        await handleGameOver(false); // false = cashout volontaire
    } catch (err: any) {
        alert("Erreur d'encaissement.");
    } finally { setLoading(false); }
  };

  if (checkingSystem) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="text-emerald-500 animate-spin" size={40} />
      </div>
    );
  }

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-[#050508] text-white p-6 flex flex-col items-center justify-center text-center font-black italic uppercase relative overflow-hidden">
        <div className="absolute inset-0 bg-amber-500/5 animate-pulse"></div>
        <div className="relative z-10 bg-[#0a0a0f] border border-amber-500/20 p-10 rounded-[3rem] shadow-2xl shadow-amber-500/10 max-w-md w-full">
          <ShieldAlert size={40} className="mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl text-amber-500 mb-2 tracking-tighter">MAINTENANCE</h1>
          <p className="text-xs text-slate-400 mb-6 italic">"{maintenanceMsg}"</p>
          <button onClick={() => router.push('/client/list')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] tracking-widest">RETOUR</button>
        </div>
      </div>
    );
  }

  const currentMult = getMultiplier();

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 font-black italic uppercase flex flex-col items-center select-none pb-20">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/list')} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-emerald-500 font-black tracking-tighter">{Math.floor(jetonsCP).toLocaleString()} CP</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-5">
        
        {/* Choix Difficulté */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          {(['facile', 'intermédiaire', 'difficile'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              disabled={status === 'playing'}
              className={`flex-1 py-3 rounded-xl text-[10px] transition-all ${difficulty === level ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Stats et Timer */}
        {status === 'playing' && (
          <div className="grid grid-cols-3 gap-3 animate-in fade-in zoom-in duration-300">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-[8px] text-slate-500 mb-1 flex items-center justify-center gap-1"><TrendingUp size={10}/> COTE</p>
              <p className={`text-lg font-bold ${currentMult <= 1.0 ? 'text-emerald-500' : 'text-amber-500'}`}>{currentMult.toFixed(2)}X</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
              <p className="text-[8px] text-slate-500 mb-1 flex items-center justify-center gap-1"><Zap size={10}/> GAIN</p>
              {/* Affichage basé sur la mise sécurisée */}
              <p className="text-lg text-white font-bold">{Math.floor(lockedBetRef.current * currentMult)}</p>
            </div>
            <div className={`p-4 rounded-2xl border text-center transition-all ${timeLeft <= 5 ? 'bg-rose-500/20 border-rose-500 animate-pulse' : 'bg-white/5 border-white/5'}`}>
              <p className="text-[8px] text-slate-500 mb-1 flex items-center justify-center gap-1"><Clock size={10}/> TEMPS</p>
              <p className={`text-lg font-bold ${timeLeft <= 5 ? 'text-rose-500' : 'text-white'}`}>{timeLeft}S</p>
            </div>
          </div>
        )}

        {/* Panneau de Jeu */}
        <div className="bg-[#0a0a0f] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl relative z-10">
          <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/10">
            <Coins className="text-emerald-500" size={20} />
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={status === 'playing'}
              className="bg-transparent flex-1 outline-none text-2xl text-emerald-500 font-bold placeholder-emerald-900 disabled:opacity-50"
            />
          </div>

          <button 
            onClick={status === 'playing' ? cashout : start}
            disabled={loading || (status === 'playing' && revealed.length < 1) || (status !== 'playing' && bet > jetonsCP)}
            className={`w-full py-6 rounded-3xl text-2xl font-black transition-all flex flex-col items-center justify-center shadow-lg active:scale-95 ${
              status === 'playing' 
              ? (revealed.length < 1 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-500 text-black shadow-amber-500/20') 
              : 'bg-emerald-500 text-black shadow-emerald-500/20'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : status === 'playing' ? (
              <>
                <span>ENCAISSER</span>
                {/* Indicateur Zone Danger */}
                {currentMult > 1.0 && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-1"><ShieldAlert size={10}/> ZONE DANGER</span>}
                {currentMult <= 1.0 && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white flex items-center gap-1 mt-1"><Lock size={10}/> SÉCURISÉ</span>}
              </>
            ) : (bet > jetonsCP ? "SOLDE INSUFFISANT" : "JOUER")}
          </button>
        </div>

        {/* Grille de jeu */}
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, i) => (
            <button
              key={i}
              onClick={() => clickTile(i)}
              disabled={status !== 'playing' || isProcessingRef.current}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all border-2 relative overflow-hidden ${
                revealed.includes(i) 
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : status === 'ended' && minePositions.includes(i)
                ? 'bg-rose-600 border-rose-400 scale-105 shadow-lg shadow-rose-500/50 z-20'
                : 'bg-white/5 border-white/5 active:bg-white/10'
              }`}
            >
              {revealed.includes(i) && <Gem className="text-emerald-400 w-8 h-8 animate-in zoom-in duration-300" />}
              {status === 'ended' && minePositions.includes(i) && <Bomb className="text-white w-8 h-8 animate-in bounce-in duration-500" />}
            </button>
          ))}
        </div>

        {/* --- ZONE PUBLICITÉ --- */}
        <div className="w-full mt-6 bg-black/20 rounded-2xl overflow-hidden border border-white/5 min-h-[100px] flex items-center justify-center relative">
            <p className="absolute top-2 right-4 text-[8px] text-slate-600 tracking-widest z-0">SPONSOR</p>
            <ExoClickBanner />
        </div>

        {status === 'ended' && (
          <button 
            onClick={() => { setStatus('idle'); setRevealed([]); setTimeLeft(20); }}
            className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold tracking-widest transition-all"
          >
            REJOUER
          </button>
        )}
      </div>
    </div>
  );
}

