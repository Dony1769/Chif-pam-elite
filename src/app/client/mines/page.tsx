"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Gem, Bomb, Wallet, Trophy, 
  Settings2, ShieldCheck, RefreshCcw, Volume2 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- CONFIGURATION DES NIVEAUX ---
const LEVELS = {
  FACILE: { grid: 5, mines: 3, empty: 5, label: "Amateur", color: "text-emerald-500" },
  INTERMEDIAIRE: { grid: 6, mines: 8, empty: 8, label: "Stratège", color: "text-blue-500" },
  DIFFICILE: { grid: 4, mines: 6, empty: 2, label: "Élite", color: "text-rose-500" },
};

export default function MinesPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [level, setLevel] = useState<keyof typeof LEVELS>("FACILE");
  const [grid, setGrid] = useState<(string | null)[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minesPositions, setMinesPositions] = useState<number[]>([]);
  const [emptyPositions, setEmptyPositions] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- AUDIO ENGINE ---
  const playSound = (type: 'click' | 'win' | 'lost' | 'empty') => {
    const sounds = {
      click: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
      win: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3",
      lost: "https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3",
      empty: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"
    };
    new Audio(sounds[type]).play().catch(() => {});
  };

  useEffect(() => { fetchBalance(); }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("balance").eq("id", user.id).single();
      setBalance(data?.balance || 0);
    }
  };

  const startGame = async () => {
    if (betAmount > balance || betAmount <= 0) return alert("Solde insuffisant");
    
    setLoading(true);
    const config = LEVELS[level];
    const totalCells = config.grid * config.grid;
    
    // Génération aléatoire des mines et cases vides
    const positions = Array.from({ length: totalCells }, (_, i) => i);
    const shuffled = positions.sort(() => Math.random() - 0.5);
    const mines = shuffled.slice(0, config.mines);
    const empty = shuffled.slice(config.mines, config.mines + config.empty);

    setMinesPositions(mines);
    setEmptyPositions(empty);
    setRevealed([]);
    setMultiplier(1.0);
    setIsPlaying(true);
    setGameOver(false);
    setLoading(false);
    playSound('click');

    // Débit du solde via ta table SQL existante (Trigger gérera le reste)
    await supabase.from("mines_games").insert([{
      user_id: (await supabase.auth.getUser()).data.user?.id,
      bet_amount: betAmount,
      mines_count: config.mines,
      mine_positions: mines,
      is_active: true
    }]);
  };

  const handleCellClick = (index: number) => {
    if (!isPlaying || revealed.includes(index) || gameOver) return;

    if (minesPositions.includes(index)) {
      setGameOver(true);
      setIsPlaying(false);
      playSound('lost');
      // Perte automatique gérée par le trigger SQL
    } else if (emptyPositions.includes(index)) {
      setRevealed([...revealed, index]);
      playSound('empty'); // Son neutre, pas d'augmentation de multiplicateur
    } else {
      const newMultiplier = multiplier + (level === "DIFFICILE" ? 0.8 : 0.3);
      setMultiplier(Number(newMultiplier.toFixed(2)));
      setRevealed([...revealed, index]);
      playSound('win');
    }
  };

  const cashOut = async () => {
    if (!isPlaying || gameOver) return;
    setIsPlaying(false);
    setGameOver(true);
    playSound('win');

    const winAmount = betAmount * multiplier;
    // Mise à jour via Supabase (le trigger handle_game_transaction fera le crédit)
    await supabase.from("mines_games")
      .update({ is_won: true, multiplier: multiplier, is_active: false })
      .eq("is_active", true);
    
    fetchBalance();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 pb-24 font-sans italic uppercase">
      {/* HEADER NAVIGATION */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 rounded-2xl border border-white/5 active:scale-90 transition-all">
          <ArrowLeft size={20} className="text-emerald-500" />
        </button>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
            <Wallet size={16} className="text-emerald-500" />
            <span className="text-sm font-black tracking-tighter">{balance.toLocaleString()} HTG</span>
          </div>
        </div>
      </div>

      {/* STATS DU JEU */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
          <span className="text-[10px] text-slate-500 mb-1">Multiplicateur</span>
          <span className="text-2xl text-emerald-500 font-black">{multiplier}x</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
          <span className="text-[10px] text-slate-500 mb-1">Gain Potentiel</span>
          <span className="text-2xl text-white font-black">{(betAmount * multiplier).toFixed(0)}</span>
        </div>
      </div>

      {/* GRILLE DYNAMIQUE */}
      <div className="flex justify-center mb-8">
        <div 
          className="grid gap-2 p-3 bg-slate-900/30 rounded-[2.5rem] border border-white/5 backdrop-blur-xl"
          style={{ gridTemplateColumns: `repeat(${LEVELS[level].grid}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: LEVELS[level].grid * LEVELS[level].grid }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              className={`
                w-12 h-12 md:w-16 md:h-16 rounded-2xl transition-all duration-300 flex items-center justify-center
                ${revealed.includes(i) ? "bg-slate-800" : "bg-slate-800/40 hover:bg-slate-700 active:scale-90"}
                ${gameOver && minesPositions.includes(i) ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" : ""}
                border border-white/5
              `}
            >
              {revealed.includes(i) && (
                emptyPositions.includes(i) ? null : <Gem className="text-emerald-500 animate-in zoom-in" size={20} />
              )}
              {gameOver && minesPositions.includes(i) && <Bomb size={20} className="text-slate-950 animate-bounce" />}
            </button>
          ))}
        </div>
      </div>

      {/* CONTRÔLES PREMIUM */}
      <div className="space-y-6">
        {/* Sélecteur de Niveau */}
        {!isPlaying && (
          <div className="flex gap-2 p-1 bg-slate-900 rounded-2xl border border-white/5">
            {Object.keys(LEVELS).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl as any)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${level === lvl ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-500"}`}
              >
                {LEVELS[lvl as keyof typeof LEVELS].label}
              </button>
            ))}
          </div>
        )}

        {/* Input Mise */}
        <div className="relative">
          <input 
            type="number" 
            value={betAmount} 
            onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={isPlaying}
            className="w-full bg-slate-900 border border-white/10 rounded-3xl p-5 text-center font-black text-xl outline-none focus:border-emerald-500 transition-all"
            placeholder="Mise HTG"
          />
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500"><Settings2 size={18} /></div>
        </div>

        {/* Bouton Action */}
        {!isPlaying ? (
          <button 
            onClick={startGame}
            disabled={loading}
            className="w-full bg-emerald-500 text-slate-950 py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading ? <RefreshCcw className="animate-spin" /> : <>C'est parti <ShieldCheck /></>}
          </button>
        ) : (
          <button 
            onClick={cashOut}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 py-6 rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all flex flex-col items-center leading-none"
          >
            <span className="text-[10px] opacity-70 mb-1">Récupérer les gains</span>
            <div className="flex items-center gap-2">
              <span>{(betAmount * multiplier).toFixed(0)} HTG</span>
              <Trophy size={20} />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
