"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Settings2, Trophy, History as HistoryIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CONFIGURATION DU JEU
const ROWS = 16;
const PIN_RADIUS = 3;
const BALL_RADIUS = 6;
const PYRAMID_TOP = 60;
const MULTIPLIERS_16 = [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];

const COLORS = {
  pins: '#475569',
  ball: '#ff0055',
  multipliers: (index: number) => {
    const dist = Math.abs(index - ROWS / 2);
    if (dist > 6) return '#ef4444'; // High Risk
    if (dist > 3) return '#f97316'; // Mid Risk
    return '#f59e0b';               // Low Risk
  }
};

interface Ball {
  id: string;
  x: number;
  y: number;
  path: number[];
  currentRow: number;
  progress: number;
  value: number;
  multiplier: number;
}

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  const ballsRef = useRef<Ball[]>([]);
  const requestRef = useRef<number>();
  
  // Audio Refs avec sécurité
  const popSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchBalance();
    
    // Initialisation Audio
    popSound.current = new Audio('/sounds/pop.mp3');
    winSound.current = new Audio('/sounds/win.mp3');

    const animate = () => {
      draw();
      updateBalls();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  // --- LOGIQUE DE MISE (VOTRE MISE À JOUR) ---
  const dropBall = async () => {
    if (bet > balance || loading) return;
    
    // Débit visuel immédiat pour la réactivité
    setBalance(prev => prev - bet);

    try {
      const { data, error } = await supabase.rpc('play_plinko', {
        p_bet_amount: bet,
        p_rows: ROWS,
        p_risk: 'high'
      });

      if (error) throw error;

      const cvs = canvasRef.current;
      if (!cvs) return;

      // Création de la bille avec le chemin dicté par le serveur
      const newBall: Ball = {
        id: Math.random().toString(),
        x: cvs.width / 2,
        y: PYRAMID_TOP - 20, 
        path: data.path,
        currentRow: 0,
        progress: 0,
        value: data.payout,
        multiplier: data.multiplier
      };

      ballsRef.current.push(newBall);

    } catch (e) {
      console.error("Erreur de mise:", e);
      fetchBalance(); // Resynchroniser en cas d'échec
    }
  };

  const updateBalls = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const rowSpacing = (cvs.height - 120) / ROWS;

    ballsRef.current.forEach((ball, index) => {
      ball.progress += 0.05; // Vitesse de chute

      if (ball.progress >= 1) {
        ball.currentRow++;
        ball.progress = 0;
        
        // Effet sonore de collision
        if (popSound.current) {
          const s = popSound.current.cloneNode() as HTMLAudioElement;
          s.volume = 0.1;
          s.play().catch(() => {});
        }

        if (ball.currentRow >= ROWS) {
          // FIN DE TRAJET
          ballsRef.current.splice(index, 1);
          setHistory(prev => [ball.multiplier, ...prev].slice(0, 8));
          if (ball.value > 0) {
            setBalance(prev => prev + ball.value);
            if (ball.multiplier >= 2 && winSound.current) {
              winSound.current.play().catch(() => {});
            }
          }
          return;
        }
      }

      // Calcul de trajectoire physique
      const pathSum = ball.path.slice(0, ball.currentRow).reduce((a, b) => a + b, 0);
      const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
      
      const nextDir = ball.path[ball.currentRow];
      const targetPinX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
      
      const startPinY = PYRAMID_TOP + ball.currentRow * rowSpacing;
      const targetPinY = PYRAMID_TOP + (ball.currentRow + 1) * rowSpacing;

      const t = ball.progress;
      ball.x = startPinX + (targetPinX - startPinX) * t;
      // Arc de cercle pour simuler le rebond sur le clou
      ball.y = startPinY + (targetPinY - startPinY) * t - Math.sin(t * Math.PI) * (rowSpacing * 0.25);
    });
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!ctx(cvs)) return;
    const ctx_ = ctx(cvs)!;

    ctx_.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;

    // 1. Dessiner les clous
    ctx_.fillStyle = COLORS.pins;
    for (let r = 0; r <= ROWS; r++) {
      for (let i = 0; i <= r; i++) {
        const x = cvs.width / 2 + (i - r / 2) * rowSpacing;
        const y = PYRAMID_TOP + r * rowSpacing;
        ctx_.beginPath();
        ctx_.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
        ctx_.fill();
      }
    }

    // 2. Dessiner les multiplicateurs
    const bucketY = PYRAMID_TOP + ROWS * rowSpacing + 25;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + (i - ROWS / 2) * rowSpacing;
      const w = rowSpacing - 4;
      ctx_.fillStyle = COLORS.multipliers(i);
      ctx_.beginPath();
      ctx_.roundRect(x - w/2, bucketY, w, 25, 4);
      ctx_.fill();
      ctx_.fillStyle = "#000";
      ctx_.font = "bold 10px Arial";
      ctx_.textAlign = "center";
      ctx_.fillText(m < 1 ? m.toString() : m.toFixed(0), x, bucketY + 16);
    });

    // 3. Dessiner les billes
    ballsRef.current.forEach(b => {
      ctx_.beginPath();
      ctx_.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx_.fillStyle = COLORS.ball;
      ctx_.shadowBlur = 15;
      ctx_.shadowColor = COLORS.ball;
      ctx_.fill();
      ctx_.shadowBlur = 0;
    });
  };

  const ctx = (c: HTMLCanvasElement | null) => c?.getContext('2d');

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col font-black uppercase italic overflow-hidden">
      {/* Header Pro */}
      <div className="p-4 flex justify-between items-center bg-[#151c2c] border-b border-white/5">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-all"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 tracking-widest">SOLDE ACTUEL</span>
            <span className="text-xl text-emerald-500">{balance.toLocaleString()} <span className="text-xs">HTG</span></span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Panneau de contrôle */}
        <div className="lg:w-80 bg-[#151c2c] p-6 space-y-6 border-r border-white/5 shadow-2xl">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>MONTANT MISE</span>
              <span>MIN: 10 HTG</span>
            </div>
            <div className="flex bg-[#0a0f1a] rounded-xl border border-white/10 overflow-hidden">
              <input 
                type="number" 
                value={bet} 
                onChange={(e) => setBet(Number(e.target.value))}
                className="bg-transparent w-full p-4 outline-none text-emerald-500 font-bold"
              />
              <button onClick={() => setBet(b => Math.max(10, b/2))} className="px-4 border-l border-white/5 hover:bg-white/5 text-xs">/2</button>
              <button onClick={() => setBet(b => b*2)} className="px-4 border-l border-white/5 hover:bg-white/5 text-xs">x2</button>
            </div>
          </div>

          <button 
            onClick={dropBall}
            disabled={loading}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all text-xl font-black"
          >
            LANCER LA BILLE
          </button>

          {/* Historique visuel */}
          <div className="pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4 text-slate-500">
              <HistoryIcon size={14} />
              <span className="text-[10px] tracking-widest">HISTORIQUE RÉCENT</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {history.map((h, i) => (
                <div key={i} className={`py-2 rounded-lg text-center text-[10px] font-bold border ${h >= 2 ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {h}x
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone Canvas */}
        <div className="flex-1 relative flex items-center justify-center bg-[#0a0f1a] p-4">
            <canvas 
                ref={canvasRef}
                width={700}
                height={600}
                className="w-full max-w-[700px] h-auto pointer-events-none drop-shadow-2xl"
            />
            {/* Overlay Déco */}
            <div className="absolute bottom-10 left-10 flex items-center gap-2 opacity-20">
                <Trophy size={40} />
                <div className="flex flex-col">
                    <span className="text-2xl font-black italic">PLINKO</span>
                    <span className="text-[10px] tracking-widest">ELITE SYSTEM V1.0</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

