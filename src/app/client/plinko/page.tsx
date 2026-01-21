"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, History as HistoryIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ROWS = 16;
const MULTIPLIERS_16 = [1000, 10, 5, 2, 1, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1, 2, 5, 10, 1000];

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  const ballsRef = useRef<any[]>([]);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    fetchBalance();
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
    if (bet > balance || loading || isMaintenance) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('play_plinko', {
        p_bet_amount: Number(bet),
        p_rows: ROWS,
        p_risk: 'high'
      });

      if (error) throw error;

      // Retrait immédiat de la mise du solde visuel
      setBalance(prev => prev - bet);

      const cvs = canvasRef.current;
      if (!cvs) return;

      ballsRef.current.push({
        id: Math.random().toString(),
        x: cvs.width / 2,
        y: 40, 
        path: data.path,
        currentRow: 0,
        progress: 0,
        value: data.payout,
        multiplier: data.multiplier
      });

    } catch (e: any) {
      console.error("Erreur Jeu:", e);
      alert("Erreur lors de la mise : " + (e.message || "Problème serveur"));
      fetchBalance(); // Sync solde en cas d'échec
    } finally {
      setLoading(false);
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
        if (ball.currentRow >= ROWS) {
          setHistory(prev => [ball.multiplier, ...prev].slice(0, 8));
          if (ball.value > 0) setBalance(prev => prev + ball.value);
          ballsRef.current.splice(index, 1);
        }
      }
      // Logique simplifiée du chemin pour l'animation
      const pathSum = ball.path.slice(0, ball.currentRow).reduce((a:any, b:any) => a + b, 0);
      const nextDir = ball.path[ball.currentRow] || 0;
      const startX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
      const targetX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
      ball.x = startX + (targetX - startX) * ball.progress;
      ball.y = 60 + ball.currentRow * rowSpacing + ball.progress * rowSpacing;
    });
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;

    // Dessin des clous
    ctx.fillStyle = '#475569';
    for (let r = 0; r <= ROWS; r++) {
      for (let i = 0; i <= r; i++) {
        ctx.beginPath();
        ctx.arc(cvs.width / 2 + (i - r / 2) * rowSpacing, 60 + r * rowSpacing, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Dessin des multiplicateurs
    const bucketY = 60 + ROWS * rowSpacing + 25;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + (i - ROWS / 2) * rowSpacing;
      ctx.fillStyle = Math.abs(i - 8) > 4 ? '#ef4444' : '#f59e0b';
      ctx.fillRect(x - (rowSpacing-4)/2, bucketY, rowSpacing-4, 25);
      ctx.fillStyle = "#000";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(m.toString(), x, bucketY + 16);
    });

    // Dessin des billes
    ballsRef.current.forEach(b => {
      ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0055'; ctx.fill();
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col font-black italic uppercase">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-[#151c2c] border-b border-white/5">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl"><ChevronLeft /></button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500">SOLDE</span>
            <span className="text-xl text-emerald-500">{Math.floor(balance).toLocaleString()} HTG</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-80 bg-[#151c2c] p-6 space-y-6 border-r border-white/5">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400">MISE</span>
            <input type="number" value={bet} onChange={(e) => setBet(Number(e.target.value))} className="w-full bg-[#0a0f1a] p-4 rounded-xl border border-white/10 text-emerald-500 outline-none" />
          </div>

          <button 
            onClick={dropBall}
            disabled={loading || balance < bet}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-2 ${loading ? 'bg-slate-700' : 'bg-emerald-500 text-black'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : 'MISER'}
          </button>

          <div className="grid grid-cols-4 gap-2 pt-4">
            {history.map((h, i) => (
                <div key={i} className="py-2 bg-white/5 border border-white/10 rounded text-center text-[10px]">{h}x</div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-4">
            <canvas ref={canvasRef} width={700} height={600} className="w-full max-w-[700px] h-auto" />
        </div>
      </div>
    </div>
  );
}

