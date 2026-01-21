"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, History as HistoryIcon, Trophy, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CONFIGURATION DU JEU
const ROWS = 16;
const PIN_RADIUS = 3;
const BALL_RADIUS = 6;
const PYRAMID_TOP = 60;
// Tes multiplicateurs mis à jour
const MULTIPLIERS_16 = [1000, 10, 5, 2, 1, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1, 2, 5, 10, 1000];

const COLORS = {
  pins: '#475569',
  ball: '#ff0055',
  multipliers: (index: number) => {
    const dist = Math.abs(index - ROWS / 2);
    if (dist > 6) return '#ef4444'; // Rouge
    if (dist > 3) return '#f97316'; // Orange
    return '#f59e0b';               // Jaune
  }
};

interface Ball {
  id: string;
  x: number;
  y: number;
  path: number[];
  currentRow: number;
  progress: number;
  payout: number;
  multiplier: number;
}

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  const ballsRef = useRef<Ball[]>([]);
  const requestRef = useRef<number | null>(null);
  const popSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkMaintenance();
    fetchBalance();
    popSound.current = new Audio('/sounds/pop.mp3');
    winSound.current = new Audio('/sounds/win.mp3');

    const animate = () => {
      draw();
      updateBalls();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  const checkMaintenance = async () => {
    const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'plinko').single();
    if (data && !data.is_active) {
      setIsMaintenance(true);
      setMaintenanceMsg(data.maintenance_msg);
    }
  };

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  // --- LOGIQUE DE GÉNÉRATION DE CHEMIN (HOUSE EDGE INTÉGRÉ) ---
  const generatePlinkoPath = () => {
    let path = [];
    let finalPos = 0;
    const houseEdgeBias = 0.53; // 53% de chance d'aller vers le centre

    for (let i = 0; i < ROWS; i++) {
        // Détermine si on va à droite (1) ou gauche (0)
        // On ajuste la probabilité pour favoriser le retour vers le milieu
        const goRight = Math.random() > houseEdgeBias;
        path.push(goRight ? 1 : 0);
        if (goRight) finalPos++;
    }
    return { path, finalPos };
  };

  const dropBall = async () => {
    if (bet > balance || isMaintenance) return;

    // 1. Déduction immédiate du solde
    const currentBet = bet;
    setBalance(prev => prev - currentBet);

    // 2. Calcul du résultat en local (instantané)
    const { path, finalPos } = generatePlinkoPath();
    const multiplier = MULTIPLIERS_16[finalPos];
    const payout = currentBet * multiplier;

    // 3. Ajouter la bille à l'animation
    const cvs = canvasRef.current;
    if (!cvs) return;

    const newBall: Ball = {
      id: Math.random().toString(),
      x: cvs.width / 2,
      y: PYRAMID_TOP - 20,
      path: path,
      currentRow: 0,
      progress: 0,
      payout: payout,
      multiplier: multiplier
    };

    ballsRef.current.push(newBall);

    // 4. Enregistrement en arrière-plan dans Supabase (sans bloquer le jeu)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // On met à jour le profil et l'historique
        await supabase.from('profiles').update({ balance: balance - currentBet + payout }).eq('id', user.id);
        await supabase.from('plinko_games').insert({
            user_id: user.id,
            bet_amount: currentBet,
            multiplier: multiplier,
            payout: payout,
            status: 'completed'
        });
    }
  };

  const updateBalls = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rowSpacing = (cvs.height - 120) / ROWS;

    ballsRef.current.forEach((ball, index) => {
      ball.progress += 0.05;
      if (ball.progress >= 1) {
        ball.currentRow++;
        ball.progress = 0;
        
        if (popSound.current) {
          const s = popSound.current.cloneNode() as HTMLAudioElement;
          s.volume = 0.1;
          s.play().catch(() => {});
        }

        if (ball.currentRow >= ROWS) {
          ballsRef.current.splice(index, 1);
          setHistory(prev => [ball.multiplier, ...prev].slice(0, 8));
          // Le solde visuel est mis à jour à l'impact
          if (ball.payout > 0) {
            setBalance(prev => prev + ball.payout);
            if (ball.multiplier >= 2 && winSound.current) winSound.current.play().catch(() => {});
          }
          return;
        }
      }
      const pathSum = ball.path.slice(0, ball.currentRow).reduce((a, b) => a + b, 0);
      const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
      const nextDir = ball.path[ball.currentRow];
      const targetPinX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
      const startPinY = PYRAMID_TOP + ball.currentRow * rowSpacing;
      const targetPinY = PYRAMID_TOP + (ball.currentRow + 1) * rowSpacing;
      const t = ball.progress;
      ball.x = startPinX + (targetPinX - startPinX) * t;
      ball.y = startPinY + (targetPinY - startPinY) * t - Math.sin(t * Math.PI) * (rowSpacing * 0.25);
    });
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;

    ctx.fillStyle = COLORS.pins;
    for (let r = 0; r <= ROWS; r++) {
      for (let i = 0; i <= r; i++) {
        const x = cvs.width / 2 + (i - r / 2) * rowSpacing;
        const y = PYRAMID_TOP + r * rowSpacing;
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const bucketY = PYRAMID_TOP + ROWS * rowSpacing + 25;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + (i - ROWS / 2) * rowSpacing;
      const w = rowSpacing - 4;
      ctx.fillStyle = COLORS.multipliers(i);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w/2, bucketY, w, 25, 4); else ctx.rect(x - w/2, bucketY, w, 25);
      ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
      ctx.fillText(m < 1 ? m.toString() : m.toFixed(0), x, bucketY + 16);
    });

    ballsRef.current.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ball;
      ctx.shadowBlur = 15;
      ctx.shadowColor = COLORS.ball;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col font-black uppercase italic overflow-hidden relative">
      {isMaintenance && (
        <div className="absolute inset-0 z-[100] backdrop-blur-md bg-black/80 flex items-center justify-center p-6 text-center">
            <div className="max-w-md p-8 bg-[#151c2c] border-2 border-amber-500/50 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                <AlertTriangle size={40} className="text-amber-500 mx-auto mb-6" />
                <h2 className="text-2xl mb-2 text-amber-500">MAINTENANCE</h2>
                <p className="text-sm text-slate-400 mb-8 lowercase">{maintenanceMsg || "Indisponible."}</p>
                <button onClick={() => router.push('/')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl">RETOUR</button>
            </div>
        </div>
      )}

      <div className="p-4 flex justify-between items-center bg-[#151c2c] border-b border-white/5">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500">SOLDE</span>
            <span className="text-xl text-emerald-500">{Math.floor(balance).toLocaleString()} <span className="text-xs">HTG</span></span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="lg:w-80 bg-[#151c2c] p-6 space-y-6 border-r border-white/5 z-20">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400">MONTANT MISE</span>
            <div className="flex bg-[#0a0f1a] rounded-xl border border-white/10 overflow-hidden">
              <input type="number" value={bet} onChange={(e) => setBet(Number(e.target.value))} className="bg-transparent w-full p-4 outline-none text-emerald-500 font-bold" />
              <button onClick={() => setBet(b => Math.max(10, Math.floor(b/2)))} className="px-4 border-l border-white/5 hover:bg-white/5 text-xs">/2</button>
              <button onClick={() => setBet(b => b*2)} className="px-4 border-l border-white/5 hover:bg-white/5 text-xs">x2</button>
            </div>
          </div>

          <button 
            onClick={dropBall}
            disabled={isMaintenance || bet > balance}
            className={`w-full py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-xl font-black ${isMaintenance ? 'bg-slate-700 text-slate-500' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'}`}
          >
            {isMaintenance ? 'PAUSE' : 'MISER'}
          </button>

          <div className="pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-[10px] uppercase">
              <HistoryIcon size={14} /> Historique
            </div>
            <div className="grid grid-cols-4 gap-2">
              {history.map((h, i) => (
                <div key={i} className={`py-2 rounded-lg text-center text-[10px] font-bold border ${h >= 2 ? 'border-emerald-500/50 text-emerald-500' : 'border-white/10 text-slate-400'}`}>
                  {h}x
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-[#0a0f1a] p-4">
            <canvas ref={canvasRef} width={700} height={600} className="w-full max-w-[700px] h-auto pointer-events-none drop-shadow-2xl" />
        </div>
      </div>
    </div>
  );
}

