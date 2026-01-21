"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, History as HistoryIcon, Trophy, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ROWS = 16;
const PIN_RADIUS = 3;
const BALL_RADIUS = 6;
const PYRAMID_TOP = 60;
const MULTIPLIERS_16 = [1000, 10, 5, 2, 1, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1, 2, 5, 10, 1000];

const COLORS = {
  pins: '#475569',
  ball: '#ff0055',
  multipliers: (index: number) => {
    const dist = Math.abs(index - ROWS / 2);
    if (dist > 6) return '#ef4444';
    if (dist > 3) return '#f97316';
    return '#f59e0b';
  }
};

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);

  const ballsRef = useRef<any[]>([]);
  const requestRef = useRef<number | null>(null);
  const popSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchBalance();
    popSound.current = new Audio('/sounds/pop.mp3');
    const animate = () => { draw(); updateBalls(); requestRef.current = requestAnimationFrame(animate); };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  const dropBall = async () => {
    if (bet > balance || isMaintenance) return;

    // Mise à jour visuelle immédiate du solde pour permettre le spam-clic
    setBalance(prev => prev - bet);

    try {
      const { data, error } = await supabase.rpc('play_plinko', {
        p_bet_amount: Number(bet),
        p_rows: ROWS,
        p_risk: 'high'
      });

      if (error) throw error;

      const cvs = canvasRef.current;
      if (!cvs) return;

      const newBall = {
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
      console.error("Erreur mise:", e);
      // En cas d'erreur réelle, on remet le solde à jour depuis la DB
      fetchBalance();
    }
  };

  const updateBalls = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rowSpacing = (cvs.height - 120) / ROWS;

    for (let i = ballsRef.current.length - 1; i >= 0; i--) {
      const ball = ballsRef.current[i];
      ball.progress += 0.05;

      if (ball.progress >= 1) {
        ball.currentRow++;
        ball.progress = 0;
        
        if (ball.currentRow >= ROWS) {
          setHistory(prev => [ball.multiplier, ...prev].slice(0, 8));
          setBalance(prev => prev + ball.value);
          ballsRef.current.splice(i, 1);
          continue;
        }
      }

      const pathSum = ball.path.slice(0, ball.currentRow).reduce((a:any, b:any) => a + b, 0);
      const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
      const nextDir = ball.path[ball.currentRow];
      const targetPinX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
      const startPinY = PYRAMID_TOP + ball.currentRow * rowSpacing;
      const targetPinY = PYRAMID_TOP + (ball.currentRow + 1) * rowSpacing;
      
      ball.x = startPinX + (targetPinX - startPinX) * ball.progress;
      ball.y = startPinY + (targetPinY - startPinY) * ball.progress - Math.sin(ball.progress * Math.PI) * (rowSpacing * 0.25);
    }
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;

    // Dessin des clous
    ctx.fillStyle = COLORS.pins;
    for (let r = 0; r <= ROWS; r++) {
      for (let i = 0; i <= r; i++) {
        const x = cvs.width / 2 + (i - r / 2) * rowSpacing;
        const y = PYRAMID_TOP + r * rowSpacing;
        ctx.beginPath(); ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Dessin des multiplicateurs
    const bucketY = PYRAMID_TOP + ROWS * rowSpacing + 25;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + (i - ROWS / 2) * rowSpacing;
      ctx.fillStyle = COLORS.multipliers(i);
      if (ctx.roundRect) ctx.roundRect(x - (rowSpacing-4)/2, bucketY, rowSpacing-4, 25, 4);
      ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
      ctx.fillText(m.toString(), x, bucketY + 16);
    });

    // Dessin des billes
    ballsRef.current.forEach(b => {
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ball; ctx.fill();
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col font-black uppercase italic overflow-hidden">
      <div className="p-4 flex justify-between items-center bg-[#151c2c] border-b border-white/5">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
            <span className="text-xl text-emerald-500">{Math.floor(balance).toLocaleString()} HTG</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="lg:w-80 bg-[#151c2c] p-6 space-y-6 border-r border-white/5 shadow-2xl">
          <div className="space-y-2">
            <input type="number" value={bet} onChange={(e) => setBet(Number(e.target.value))} className="bg-[#0a0f1a] w-full p-4 rounded-xl border border-white/10 outline-none text-emerald-500 font-bold" />
          </div>

          <button 
            onClick={dropBall}
            className="w-full py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xl font-black shadow-lg active:scale-95 transition-all"
          >
            MISER
          </button>

          <div className="grid grid-cols-4 gap-2">
              {history.map((h, i) => (
                <div key={i} className="py-2 rounded-lg text-center text-[10px] bg-white/5 border border-white/10">{h}x</div>
              ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
            <canvas ref={canvasRef} width={700} height={600} className="w-full max-w-[700px] h-auto pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
