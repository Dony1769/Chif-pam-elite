"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, History as HistoryIcon, AlertTriangle, Coins, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ExoClickBanner from '@/components/ads/ExoClickBanner';
import { resolveGameEconomy } from '@/lib/game-economy';
import { NeonGameShell, ProgressBar } from '@/components/game/NeonGameShell';

// CONFIGURATION DU JEU
const ROWS = 16;
const PIN_RADIUS = 3;
const BALL_RADIUS = 6;
const PYRAMID_TOP = 60;
const MULTIPLIERS_16 = [1000, 15, 5, 2.5, 1.5, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1.5, 2.5, 5, 15, 1000];

const COLORS = {
  pins: '#475569',
  ball: '#10b981',
  multipliers: (index: number) => {
    const dist = Math.abs(index - ROWS / 2);
    if (dist > 6) return '#ef4444';
    if (dist > 3) return '#f97316';
    return '#f59e0b';
  },
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
  finalPos: number;
  isProcessed: boolean;
  trail: Array<{ x: number; y: number; life: number }>;
  drift: number;
  bounceSeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

interface VictoryFlash {
  x: number;
  y: number;
  life: number;
  intensity: number;
}

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([8, 15, 8]);
  }
};

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [bet, setBet] = useState(100);
  const [jetonsCP, setJetonsCP] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);

  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const victoryRef = useRef<VictoryFlash | null>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const requestRef = useRef<number | null>(null);
  const popSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    checkMaintenance();
    fetchData();

    popSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    winSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');

    const animate = () => {
      timeRef.current += 1 / 60;
      updateParticles();
      updateBalls();
      draw();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [userId]);

  const checkMaintenance = async () => {
    const { data } = await supabase.from('game_settings').select('is_active, maintenance_msg').eq('game_id', 'plinko').single();
    if (data && !data.is_active) {
      setIsMaintenance(true);
      setMaintenanceMsg(data.maintenance_msg);
    }
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase.from('profiles').select('jetons_cp').eq('id', user.id).single();
      if (data) setJetonsCP(data.jetons_cp);
    }
  };

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = 0.05;
    clone.play().catch(() => {});
  };

  const spawnParticles = (x: number, y: number, color: string, count = 8, spread = 1.4) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = (0.6 + Math.random() * 2.4) * spread;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        life: 1,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  };

  const updateParticles = () => {
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.018;
    });
  };

  const generatePlinkoPath = () => {
    // 🎯 PHYSIQUE RÉELLE : Décision aléatoire INDÉPENDANTE à chaque rangée
    // Cela crée une distribution binomiale naturelle (courbe de Gauss)
    let path = [] as number[];
    let finalPos = 0;

    // Générer aléatoirement chaque direction (gauche=0, droite=1)
    // Chaque rangée a ~50% de chance d'aller à droite
    for (let i = 0; i < ROWS; i += 1) {
      const goRight = Math.random() < 0.5 ? 1 : 0;
      path.push(goRight);
      finalPos += goRight;
    }

    // Calculer le payout basé sur la position finale réelle
    const economy = resolveGameEconomy({
      gameId: 'plinko',
      bet: Math.floor(bet),
      finalPos,
      difficulty: 'intermédiaire',
      bonusMultiplier: 1,
      jackpotMultiplier: 1,
      specialEventMultiplier: 1,
    });

    return { path, finalPos };
  };

  const dropBall = async () => {
    if (!userId || bet > jetonsCP || bet < 10 || isMaintenance || dropping) return;
    triggerHaptic();

    setDropping(true);

    try {
      const currentBet = Math.floor(bet);
      const { data: result, error } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: userId,
        p_mise_cp: currentBet,
        p_gain_cp: 0,
        p_jeu_nom: 'Plinko Bet',
      });

      if (error || !result.success) {
        alert('Solde insuffisant.');
        setDropping(false);
        return;
      }

      setJetonsCP((prev) => prev - currentBet);

      const { path, finalPos } = generatePlinkoPath();
      const economy = resolveGameEconomy({
        gameId: 'plinko',
        bet: currentBet,
        finalPos,
        multiplier: MULTIPLIERS_16[finalPos],
        difficulty: 'intermédiaire',
        bonusMultiplier: 1,
        jackpotMultiplier: 1,
        specialEventMultiplier: 1,
      });
      const multiplier = economy.multiplier;
      const payout = economy.payout;

      const cvs = canvasRef.current;
      if (cvs) {
        const newBall: Ball = {
          id: Math.random().toString(36).slice(2, 11),
          x: cvs.width / 2,
          y: PYRAMID_TOP - 20,
          path,
          currentRow: 0,
          progress: 0,
          payout,
          multiplier,
          finalPos,
          isProcessed: false,
          trail: [],
          drift: (Math.random() - 0.5) * 2.2,
          bounceSeed: Math.random() * Math.PI * 2,
        };
        ballsRef.current.push(newBall);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDropping(false), 300);
    }
  };

  const updateBalls = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rowSpacing = (cvs.height - 120) / ROWS;

    for (let i = ballsRef.current.length - 1; i >= 0; i -= 1) {
      const ball = ballsRef.current[i];
      ball.progress += 0.045 + Math.min(0.015, ball.currentRow * 0.0012);

      if (ball.progress >= 1) {
        ball.currentRow += 1;
        ball.progress = 0;

        if (popSound.current && ball.currentRow < ROWS) {
          playSound(popSound.current);
        }

        if (ball.currentRow >= ROWS) {
          if (!ball.isProcessed) {
            ball.isProcessed = true;
            setHistory((prev) => [ball.multiplier, ...prev].slice(0, 8));

            if (ball.payout > 0 && userId) {
              setJetonsCP((prev) => prev + ball.payout);

              if (ball.multiplier >= 2 && winSound.current) {
                winSound.current.currentTime = 0;
                winSound.current.play().catch(() => {});
              }

              supabase.rpc('jouer_partie_cp', {
                p_user_id: userId,
                p_mise_cp: 0,
                p_gain_cp: ball.payout,
                p_jeu_nom: `Plinko Win x${ball.multiplier}`,
              }).then(() => {});
            }
          }
          ballsRef.current.splice(i, 1);
        }
      } else {
        const pathSum = ball.path.slice(0, ball.currentRow).reduce((a, b) => a + b, 0);
        const nextDir = ball.path[ball.currentRow];
        const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
        const targetPinX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
        const startPinY = PYRAMID_TOP + ball.currentRow * rowSpacing;
        const targetPinY = PYRAMID_TOP + (ball.currentRow + 1) * rowSpacing;
        const eased = 0.5 - 0.5 * Math.cos(ball.progress * Math.PI);
        const arcHeight = Math.sin(ball.progress * Math.PI) * (rowSpacing * 0.2 + Math.sin(ball.currentRow * 0.5 + ball.bounceSeed) * 3.5);
        const reboundX = Math.sin((ball.currentRow + ball.progress) * 1.45 + ball.bounceSeed) * 2.4 + ball.drift;

        ball.x = startPinX + (targetPinX - startPinX) * eased + reboundX;
        ball.y = startPinY + (targetPinY - startPinY) * eased - arcHeight;

        ball.trail.push({ x: ball.x, y: ball.y, life: 1 });
        if (ball.trail.length > 16) ball.trail.shift();

        if (ball.progress > 0.4 && ball.progress < 0.5) {
          spawnParticles(ball.x, ball.y, 'rgba(16,185,129,0.9)', 2, 1.1);
        }
      }
    }

    if (ballsRef.current.length > 0) {
      const activeBall = ballsRef.current[ballsRef.current.length - 1];
      const focusX = (activeBall.x - cvs.width / 2) * 0.06;
      const focusY = (activeBall.y - (PYRAMID_TOP + rowSpacing * 6)) * 0.04;
      cameraRef.current.x += (focusX - cameraRef.current.x) * 0.08;
      cameraRef.current.y += (focusY - cameraRef.current.y) * 0.08;
      cameraRef.current.zoom = 1 + Math.min(0.04, ballsRef.current.length * 0.003);
    } else {
      cameraRef.current.x += (0 - cameraRef.current.x) * 0.08;
      cameraRef.current.y += (0 - cameraRef.current.y) * 0.08;
      cameraRef.current.zoom = 1;
    }
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;
    const offsetX = cameraRef.current.x;
    const offsetY = cameraRef.current.y;

    const gradient = ctx.createLinearGradient(0, 0, 0, cvs.height);
    gradient.addColorStop(0, '#050816');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.save();
    ctx.translate(offsetX * 0.3, offsetY * 0.15);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(cvs.width / 2 + 30, PYRAMID_TOP + 140, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = COLORS.pins;
    for (let r = 0; r <= ROWS; r += 1) {
      for (let i = 0; i <= r; i += 1) {
        const x = cvs.width / 2 + offsetX + (i - r / 2) * rowSpacing;
        const y = PYRAMID_TOP + offsetY + r * rowSpacing;
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    particlesRef.current.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x + offsetX * 0.2, p.y + offsetY * 0.15, p.size * (0.4 + p.life * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const bucketY = PYRAMID_TOP + ROWS * rowSpacing + 25 + offsetY * 0.05;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + offsetX + (i - ROWS / 2) * rowSpacing;
      const w = rowSpacing - 4;
      const pulse = 0.7 + 0.3 * Math.sin(timeRef.current * 2.4 + i * 0.5);
      const glow = 4 + pulse * 5;
      ctx.save();
      ctx.shadowBlur = glow;
      ctx.shadowColor = COLORS.multipliers(i);
      ctx.fillStyle = COLORS.multipliers(i);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, bucketY, w, 25 + pulse * 3, 6); else ctx.rect(x - w / 2, bucketY, w, 25 + pulse * 3);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(m < 1 ? m.toString() : m.toFixed(0) + 'x', x, bucketY + 16);
    });

    ballsRef.current.forEach((b) => {
      if (b.trail.length > 1) {
        ctx.beginPath();
        b.trail.forEach((point, index) => {
          const alpha = (index + 1) / b.trail.length;
          ctx.strokeStyle = `rgba(16,185,129,${0.18 * alpha})`;
          ctx.lineWidth = 1.3 + alpha * 1.3;
          if (index === 0) {
            ctx.moveTo(point.x + offsetX * 0.1, point.y + offsetY * 0.05);
          } else {
            ctx.lineTo(point.x + offsetX * 0.1, point.y + offsetY * 0.05);
          }
        });
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(b.x + offsetX * 0.1, b.y + offsetY * 0.05, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#34d399';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (victoryRef.current) {
      victoryRef.current.life -= 0.024;
      const radius = 24 + (1 - victoryRef.current.life) * 42;
      ctx.strokeStyle = `rgba(250,204,21,${Math.max(0, victoryRef.current.life)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(victoryRef.current.x + offsetX * 0.1, victoryRef.current.y + offsetY * 0.05, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (victoryRef.current.life <= 0) victoryRef.current = null;
    }
  };

  return (
    <NeonGameShell accent="emerald" className="min-h-screen flex flex-col font-black uppercase italic overflow-x-hidden">
      {isMaintenance && (
        <div className="absolute inset-0 z-[100] backdrop-blur-md bg-black/80 flex items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-[2.5rem] border-2 border-amber-500/50 bg-[#151c2c] p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <AlertTriangle size={40} className="mx-auto mb-6 text-amber-500" />
            <h2 className="mb-2 text-2xl text-amber-500">MAINTENANCE</h2>
            <p className="mb-8 text-sm lowercase text-slate-400">{maintenanceMsg || 'Indisponible.'}</p>
            <button onClick={() => router.push('/client/list')} className="w-full rounded-2xl border border-white/10 bg-white/5 py-4">RETOUR</button>
          </div>
        </div>
      )}

      <div className="z-20 flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-4 shadow-xl backdrop-blur-xl">
        <button onClick={() => router.push('/client/list')} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-200 active:scale-90"><ChevronLeft /></button>
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
          <Coins size={16} className="text-emerald-300" />
          <span className="text-xl tracking-tighter text-emerald-200">{Math.floor(jetonsCP).toLocaleString()} <span className="text-[10px] text-slate-400">CP</span></span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="z-20 space-y-6 border-r border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl lg:w-80">
          <div className="space-y-2">
            <span className="text-[10px] tracking-widest text-slate-400">MONTANT MISE (CP)</span>
            <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#0a0f1a] shadow-inner">
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Number(e.target.value))}
                className="w-full bg-transparent p-4 text-lg font-bold text-emerald-500 outline-none"
              />
              <button onClick={() => setBet((b) => Math.max(10, Math.floor(b / 2)))} className="border-l border-white/5 px-4 text-xs font-bold text-slate-400 transition-colors hover:bg-white/5">/2</button>
              <button onClick={() => setBet((b) => b * 2)} className="border-l border-white/5 px-4 text-xs font-bold text-slate-400 transition-colors hover:bg-white/5">x2</button>
            </div>
          </div>

          <button
            onClick={dropBall}
            disabled={isMaintenance || bet > jetonsCP || dropping}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-6 text-xl font-black shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all active:scale-95 ${
              isMaintenance || bet > jetonsCP
                ? 'cursor-not-allowed bg-slate-700 text-slate-500'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black'
            }`}
          >
            {dropping ? <Loader2 className="animate-spin" /> : bet > jetonsCP ? 'SOLDE BAS' : 'LÂCHER'}
          </button>

          <ProgressBar value={Math.min(100, (history.length / 8) * 100)} max={100} label="Chaîne de chute" accent="emerald" />

          <div className="border-t border-white/5 pt-6">
            <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500">
              <HistoryIcon size={14} /> Historique
            </div>
            <div className="grid grid-cols-4 gap-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-lg border py-2 text-center text-[10px] font-bold transition-all animate-in zoom-in ${
                    h >= 10
                      ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                      : h >= 2
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                        : 'border-white/10 bg-slate-800 text-slate-400'
                  }`}
                >
                  {h}x
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-[#0a0f1a] p-4">
          <div className="flex w-full flex-1 items-center justify-center">
            <canvas ref={canvasRef} width={700} height={600} className="pointer-events-none h-auto w-full max-w-[600px] drop-shadow-[0_0_50px_rgba(16,185,129,0.1)]" />
          </div>

          <div className="mt-4 w-full max-w-lg border-t border-white/5 pt-4">
            <ExoClickBanner />
          </div>
        </div>
      </div>
    </NeonGameShell>
  );
}
