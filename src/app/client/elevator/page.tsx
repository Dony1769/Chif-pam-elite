"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, Trophy, ChevronLeft } from 'lucide-react';

// Banques de questions traduits/générés (Simulation IA)
const QUESTION_BANK = [
  { q: "Lequel est un héros de l'indépendance d'Haïti ?", a: ["Dessalines", "Napoléon", "Bolivar", "Lincoln"], c: 0 },
  { q: "En quelle année Haïti a-t-il proclamé son indépendance ?", a: ["1791", "1804", "1825", "1844"], c: 1 },
  { q: "Quelle est la monnaie officielle d'Haïti ?", a: ["Dollar", "Peso", "Gourde", "Euro"], c: 2 },
  { q: "Quel gaz les plantes absorbent-elles ?", a: ["Oxygène", "Azote", "CO2", "Hélium"], c: 2 },
];

export default function ElevatorElite() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [bet, setBet] = useState(50);
  const [floor, setFloor] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(QUESTION_BANK[0]);
  const [isFalling, setIsFalling] = useState(false);
  const [gameId, setGameId] = useState(null);

  const multiplier = 1 + (floor * 0.25); // L'admin gagne sur la probabilité (1/4)
  const potentialWin = Math.floor(bet * multiplier);

  const startNewGame = async () => {
    // Appel SQL pour vérifier le solde et créer le jeu
    const { data, error } = await supabase.rpc('start_elevator_game', { p_bet: bet });
    if (error) return alert("Solde insuffisant !");
    setGameId(data);
    setFloor(1);
    nextQuestion();
    setGameState('playing');
  };

  const nextQuestion = () => {
    const random = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
    setCurrentQuestion(random);
  };

  const handleAnswer = (index: number) => {
    if (index === currentQuestion.c) {
      // GAGNÉ : On monte
      setFloor(prev => prev + 1);
      nextQuestion();
    } else {
      // PERDU : L'ascenseur chute
      setIsFalling(true);
      setTimeout(() => {
        setGameState('result');
        setIsFalling(false);
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-between p-4 overflow-hidden">
      
      {/* Header Premium */}
      <div className="w-full flex justify-between items-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl backdrop-blur-md">
        <ChevronLeft className="text-emerald-500" onClick={() => window.history.back()} />
        <div className="text-center">
            <h1 className="text-xl font-black italic tracking-tighter">ASCENSEUR <span className="text-emerald-500">INFERNAL</span></h1>
        </div>
        <Shield size={20} className="text-emerald-500/50" />
      </div>

      {/* Zone Centrale : L'Ascenseur */}
      <div className="flex-1 w-full flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {gameState === 'playing' && (
            <motion.div 
              key="elevator"
              initial={{ y: 500, opacity: 0 }}
              animate={{ y: isFalling ? 800 : 0, opacity: 1, rotate: isFalling ? [0, -2, 2, 0] : 0 }}
              exit={{ y: -500, opacity: 0 }}
              className="w-full max-w-sm aspect-[9/16] bg-[#0a0a0a] border-x-4 border-emerald-500/20 relative flex flex-col p-6 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
            >
              {/* Indicateur d'étage Digital */}
              <div className="self-center bg-black px-6 py-2 border border-emerald-500/50 rounded-md mb-8">
                <span className="text-emerald-500 font-mono text-3xl animate-pulse">FL-{floor}</span>
              </div>

              {/* L'Avatar Articulé */}
              <div className="flex justify-center mb-10">
                <EliteAvatar status={isFalling ? 'lost' : 'playing'} isJumping={isFalling} />
              </div>

              {/* Question Card */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                    <p className="text-sm font-medium text-gray-300 italic">Question de survie :</p>
                    <h2 className="text-lg font-bold">{currentQuestion.q}</h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.a.map((opt, i) => (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      key={i}
                      onClick={() => handleAnswer(i)}
                      className="w-full py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all"
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu de départ */}
        {gameState === 'menu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-8">
             <div className="p-8 bg-emerald-500/10 rounded-[3rem] border border-emerald-500/20 shadow-2xl">
                <TrendingUp size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black mb-2">PRÊT À MONTER ?</h3>
                <p className="text-gray-500 text-xs uppercase tracking-[0.2em] mb-6">Mise minimum: 10 HTG</p>
                <input 
                  type="number" 
                  value={bet} 
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="bg-black/50 border border-emerald-500/30 w-full text-center py-4 rounded-2xl text-2xl font-black outline-none mb-4 text-emerald-500"
                />
                <button 
                  onClick={startNewGame}
                  className="w-full py-5 bg-emerald-500 text-black font-black rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  DÉMARRER
                </button>
             </div>
          </motion.div>
        )}
      </div>

      {/* Footer Infos Gain */}
      {gameState === 'playing' && (
        <div className="w-full grid grid-cols-2 gap-4 p-4 mb-4">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Multiplicateur</p>
                <p className="text-xl font-black text-emerald-500">x{multiplier.toFixed(2)}</p>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Gain Potentiel</p>
                <p className="text-xl font-black text-white">{potentialWin} HTG</p>
            </div>
        </div>
      )}
    </div>
  );
}

