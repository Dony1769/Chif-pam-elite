"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Skull, Zap, DoorOpen, ArrowRight, Loader2 } from 'lucide-react';

// Réutilisation de l'EliteAvatar avec animation de marche
const EliteAvatar = ({ status, isWalking }: { status: string, isWalking: boolean }) => (
  <motion.div 
    className="relative w-12 h-20"
    animate={isWalking ? { y: [0, -5, 0], rotate: [0, -2, 2, 0] } : {}}
    transition={{ repeat: Infinity, duration: 0.5 }}
  >
    <div className="absolute top-5 left-3 w-6 h-10 bg-emerald-600 rounded-lg border border-emerald-400/50 z-10" />
    <div className="absolute top-0 left-4 w-5 h-5 bg-orange-200 rounded-full border border-black/20" />
    <motion.div animate={isWalking ? { rotate: [20, -20] } : {}} className="absolute top-6 left-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
    <motion.div animate={isWalking ? { rotate: [-20, 20] } : {}} className="absolute top-6 right-1 w-1.5 h-6 bg-emerald-700 rounded-full origin-top" />
  </motion.div>
);

export default function HellElevator() {
  const [gameState, setGameState] = useState<'idle' | 'intro' | 'playing' | 'falling' | 'won'>('idle');
  const [floor, setFloor] = useState(1);
  const [question, setQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bet, setBet] = useState(50);
  const [gameId, setGameId] = useState<string | null>(null);

  const fetchQuestion = async (currentFloor: number) => {
    setLoading(true);
    const res = await fetch('/api/elevator/question', {
      method: 'POST',
      body: JSON.stringify({ floor: currentFloor }),
    });
    const data = await res.json();
    setQuestion(data);
    setLoading(false);
  };

  const startSequence = async () => {
    // 1. Débit SQL
    const { data, error } = await supabase.rpc('start_elevator_game', { p_bet: bet });
    if (error) return alert("Solde insuffisant");
    
    setGameId(data);
    setGameState('intro'); // Lance l'animation de marche
    
    // 2. Transition après la marche
    setTimeout(() => {
      fetchQuestion(1);
      setGameState('playing');
    }, 3000);
  };

  const handleAnswer = async (idx: number) => {
    if (idx === question.c) {
      const nextFloor = floor + 1;
      setFloor(nextFloor);
      fetchQuestion(nextFloor);
    } else {
      setGameState('falling');
      await supabase.rpc('process_game_result', { 
        p_game_id: gameId, 
        p_table_name: 'elevator_games', 
        p_payout: 0, 
        p_win: false 
      });
    }
  };

  const cashout = async () => {
    const payout = Math.floor(bet * (1 + floor * 0.5));
    await supabase.rpc('process_game_result', { 
      p_game_id: gameId, 
      p_table_name: 'elevator_games', 
      p_payout: payout, 
      p_win: true 
    });
    setGameState('won');
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* --- PHASE IDLE : MISE --- */}
      {gameState === 'idle' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8 p-6">
          <h1 className="text-5xl font-black italic text-emerald-500 tracking-tighter">HELL<br/>ELEVATOR</h1>
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl">
            <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bg-transparent text-5xl font-black text-center w-full outline-none text-emerald-500" />
            <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Mise HTG</p>
            <button onClick={startSequence} className="w-full mt-8 py-4 bg-emerald-600 rounded-2xl font-black text-black text-xl hover:bg-emerald-400 transition-all">ENTRER</button>
          </div>
        </motion.div>
      )}

      {/* --- PHASE INTRO : MARCHE & PORTE --- */}
      {gameState === 'intro' && (
        <div className="relative w-full max-w-sm h-96 flex flex-col items-center">
          <motion.div initial={{ x: -200 }} animate={{ x: 0 }} transition={{ duration: 2.5 }} className="absolute bottom-10">
            <EliteAvatar status="playing" isWalking={true} />
          </motion.div>
          <div className="absolute bottom-10 right-0 w-32 h-64 border-4 border-emerald-500/30 rounded-t-full bg-zinc-900 flex items-center justify-center">
             <motion.div initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ delay: 2, duration: 1 }} className="w-full h-full bg-emerald-900 origin-right" />
             <DoorOpen className="text-emerald-500 absolute" size={40} />
          </div>
          <p className="mt-20 font-mono text-emerald-500 animate-pulse">CHARGEMENT DE L'ASCENSEUR...</p>
        </div>
      )}

      {/* --- PHASE PLAYING : QUESTIONS IA --- */}
      {gameState === 'playing' && (
        <div className="w-full max-w-sm h-full flex flex-col p-6 pt-12">
          <div className="flex justify-between items-center mb-8 bg-zinc-900 p-4 rounded-2xl border border-white/5">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Étage</p>
              <h2 className="text-3xl font-black text-emerald-500">{floor}F</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Multiplicateur</p>
              <h2 className="text-3xl font-black text-white">x{(1 + floor * 0.5).toFixed(1)}</h2>
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={floor}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 p-6 rounded-[2rem] border border-white/5 shadow-2xl"
                >
                  <p className="text-lg font-bold text-center mb-8 leading-relaxed">"{question?.q}"</p>
                  <div className="space-y-3">
                    {question?.a.map((ans: string, i: number) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAnswer(i)}
                        className="w-full py-4 bg-white/5 rounded-xl border border-white/5 hover:bg-emerald-600 hover:text-black transition-all font-bold"
                      >
                        {ans}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <button onClick={cashout} className="mt-6 py-4 bg-emerald-600/10 border border-emerald-500/50 text-emerald-500 rounded-2xl font-black text-lg">
            S'ARRÊTER ICI
          </button>
        </div>
      )}

      {/* --- PHASE FALLING : CHUTE --- */}
      <AnimatePresence>
        {gameState === 'falling' && (
          <motion.div initial={{ y: -1000 }} animate={{ y: 0 }} className="fixed inset-0 bg-red-600 z-50 flex flex-col items-center justify-center p-10 text-center">
            <motion.div animate={{ rotate: 720 }} transition={{ duration: 1 }}>
                <Skull size={120} />
            </motion.div>
            <h2 className="text-6xl font-black italic mt-6">BOUM !</h2>
            <p className="text-xl uppercase font-bold opacity-80">L'ascenseur s'est écrasé.</p>
            <button onClick={() => window.location.reload()} className="mt-12 px-8 py-4 bg-black rounded-2xl font-black">RÉESSAYER</button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
