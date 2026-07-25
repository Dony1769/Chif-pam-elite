"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, 
  XCircle, 
  Trophy, 
  Play, 
  Volume2, 
  VolumeX, 
  Hammer, 
  Coins, 
  Sparkles,
  Zap,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExoClickBanner from "@/components/ads/ExoClickBanner";
import { AnimatedCounter, NeonGameShell } from '@/components/game/NeonGameShell';

// --- TYPES ---
interface Coords {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

interface FogParticle {
  x: number;
  y: number;
  vy: number;
  alpha: number;
  size: number;
}

const CONFIG = {
  facile: { rows: 5, cols: 2, step: 0.3, label: 'Facile' },
  intermediaire: { rows: 7, cols: 2, step: 0.5, label: 'Moyen' },
  difficile: { rows: 9, cols: 3, step: 0.8, label: 'Hard' }
};

const SOUNDS = {
  theme: "https://assets.mixkit.co/active_storage/sfx/2324/2324-preview.mp3",
  jump: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  break: "https://assets.mixkit.co/active_storage/sfx/1126/1126-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  doll: "https://www.myinstants.com/media/sounds/squid-game-red-light-green-light-sound.mp3"
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([15, 20, 15]);
  }
};

export default function GlassEliteFinal() {
  const [status, setStatus] = useState<'intro' | 'walking_in' | 'idle' | 'playing' | 'won' | 'lost' | 'loading' | 'maintenance'>('intro');
  const [maintenanceMsg, setMaintenanceMsg] = useState('SERVICE MOMENTANÉMENT INDISPONIBLE');
  
  const [difficulty, setDifficulty] = useState<keyof typeof CONFIG>('intermediaire');
  const [bet, setBet] = useState(10);
  const [jetonsCP, setJetonsCP] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, jumpT: 1, walkY: 0, walkCycle: 0 });
  const requestRef = useRef<number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const shardsRef = useRef<GlassShard[]>([]);
  const fogRef = useRef<FogParticle[]>([]);
  const shakeRef = useRef({ intensity: 0, timer: 0 });

  // 🔒 REFS DE SÉCURITÉ
  const lockedBetRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(lockedBetRef.current * currentMult);

  // --- INITIALISATION ---
  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase.from('profiles').select('jetons_cp').eq('id', user.id).single();
      if (data) setJetonsCP(data.jetons_cp);
    }

    const { data } = await supabase
      .from('game_settings')
      .select('is_active, maintenance_msg')
      .eq('game_id', 'glass')
      .single();

    if (data && !data.is_active) {
      setMaintenanceMsg(data.maintenance_msg);
      setStatus('maintenance');
      return true;
    }
    return false;
  };

  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      audioRefs.current[key] = new Audio(url);
    });

    init().then((isMaintained) => {
      if (!isMaintained) {
        const introTimer = setTimeout(() => setStatus('walking_in'), 2000);
        return () => clearTimeout(introTimer);
      }
    });
  }, []);

  // --- GESTION DU TIMER DE JEU ---
  useEffect(() => {
    if (status === 'playing') {
      setCountdown(10);
      const timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => window.clearInterval(timer);
    }

    if (['won', 'lost', 'idle', 'maintenance'].includes(status)) {
      setCountdown(10);
    }
  }, [status, history]);

  const handleTimeOut = async () => {
    if (status !== 'playing' || isProcessingRef.current) return;
    isProcessingRef.current = true;
    playSound('break');
    setStatus('lost');
    if (gameId) {
      await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
    }
    isProcessingRef.current = false;
  };

  // --- AUDIO CONTROL ---
  useEffect(() => {
    const theme = audioRefs.current.theme;
    if (status === 'playing' && !muted && theme) {
      theme.loop = true;
      theme.currentTime = 0;
      theme.volume = 0.2;
      theme.play().catch(() => {});
    } else if (theme) {
      theme.pause();
      theme.currentTime = 0;
    }
  }, [status, muted]);

  const playSound = (key: keyof typeof SOUNDS) => {
    if (muted) return;
    const s = audioRefs.current[key]?.cloneNode() as HTMLAudioElement;
    if (s) {
      s.volume = 0.4;
      s.play().catch(() => {});
    }
  };

  // --- COORDONNÉES DE DESSIN ---
  const getCoords = useCallback((row: number, col: number): Coords => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0, w: 0, h: 0 };
    const maxCols = CONFIG[difficulty].cols;
    const maxRows = CONFIG[difficulty].rows;
    
    const TILE_W = Math.min(cvs.width / (maxCols + 1.2), 75);
    const TILE_H = 38;
    const TILE_GAP = 14;
    const centerX = cvs.width / 2;
    const totalHeight = (maxRows + 1) * (TILE_H + TILE_GAP);
    const startY = (cvs.height / 2) + (totalHeight / 2) - 30;

    return {
      x: centerX + (col - (maxCols - 1) / 2) * (TILE_W + TILE_GAP),
      y: startY - row * (TILE_H + TILE_GAP),
      w: TILE_W,
      h: TILE_H
    };
  }, [difficulty]);

  const syncAvatar = useCallback(() => {
    const coords = getCoords(history.length, history[history.length - 1] ?? 0.5);
    avatarPos.current = {
      ...avatarPos.current,
      x: coords.x,
      y: coords.y,
      targetX: coords.x,
      targetY: coords.y,
      jumpT: 1
    };
  }, [history, getCoords]);

  // --- LOGIQUE ET RAF ---
  const updateLogic = () => {
    const p = avatarPos.current;
    const cvs = canvasRef.current;
    
    if (status === 'walking_in' && cvs) {
      const startPos = getCoords(0, 0.5);
      if (p.walkY === 0) p.walkY = cvs.height + 40;
      if (p.walkY > startPos.y) {
        p.walkY -= 3.5;
        p.walkCycle += 0.25;
        p.x = startPos.x;
        p.y = p.walkY;
      } else {
        setStatus('idle');
        p.walkCycle = 0;
        p.y = startPos.y;
      }
    }

    if (status === 'playing' && p.jumpT < 1) {
      p.jumpT += 0.06;
      if (p.jumpT > 1) p.jumpT = 1;
      p.x += (p.targetX - p.x) * 0.25;
      p.y += (p.targetY - p.y) * 0.25;
    }
  };

  const spawnGlassShards = (x: number, y: number) => {
    for (let i = 0; i < 22; i++) {
      shardsRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5,
        life: 1,
        size: 3 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: i % 2 === 0 ? '#fb7185' : '#38bdf8',
      });
    }
    shakeRef.current.intensity = 12;
    shakeRef.current.timer = 10;
  };

  const draw = () => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const shakeX = (Math.random() - 0.5) * shakeRef.current.intensity;
    const shakeY = (Math.random() - 0.5) * shakeRef.current.intensity;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Fond Dégradé
    const bg = ctx.createRadialGradient(cvs.width / 2, cvs.height / 2, 40, cvs.width / 2, cvs.height / 2, 450);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.6, '#090d16');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Dalles en verre
    if (!['intro', 'maintenance'].includes(status)) {
      const activeRows = CONFIG[difficulty].rows;
      const activeCols = CONFIG[difficulty].cols;

      for (let r = 0; r <= activeRows; r++) {
        for (let c = 0; c < activeCols; c++) {
          const { x, y, w, h } = getCoords(r, c);
          const isPassed = history.length > r - 1 && history[r - 1] === c && r > 0;
          const isTargetRow = history.length === r - 1 && status === 'playing' && r > 0;

          const fillGradient = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
          if (isPassed) {
            fillGradient.addColorStop(0, '#10b981');
            fillGradient.addColorStop(1, '#059669');
          } else if (isTargetRow) {
            fillGradient.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
            fillGradient.addColorStop(1, 'rgba(217, 70, 239, 0.2)');
          } else {
            fillGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
            fillGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
          }

          ctx.fillStyle = fillGradient;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
          else ctx.rect(x - w / 2, y - h / 2, w, h);
          ctx.fill();

          ctx.strokeStyle = isTargetRow ? '#f43f5e' : 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = isTargetRow ? 1.8 : 1;
          ctx.stroke();
        }
      }
    }

    // Particules de verre brisé
    shardsRef.current.forEach((s) => {
      if (s.life <= 0) return;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size / 2);
      ctx.restore();
    });

    // Avatar Joueur
    if (['walking_in', 'playing', 'idle'].includes(status)) {
      const { x, y, jumpT, walkCycle } = avatarPos.current;
      let drawY = y;
      
      if (status === 'playing') {
        drawY = y - Math.sin(jumpT * Math.PI) * 40;
      } else if (status === 'walking_in') {
        drawY = y + Math.abs(Math.sin(walkCycle)) * 4;
      }

      ctx.save();
      ctx.translate(x, drawY);

      // Ombre portée du saut
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, y - drawY + 10, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corps
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-10, -16, 20, 20, 5); else ctx.rect(-10, -16, 20, 20);
      ctx.fill();

      // Tête
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, -22, 7, 0, Math.PI * 2);
      ctx.fill();

      // Masque / Numéro 456
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('456', 0, -8);

      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
        if (status === 'playing') syncAvatar();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = () => {
      draw();
      updateLogic();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, history, difficulty, syncAvatar]);

  // --- ACTIONS DE JEU ---
  const handleJump = async (colIndex: number) => {
    if (status !== 'playing' || avatarPos.current.jumpT < 1 || isProcessingRef.current) return;
    isProcessingRef.current = true;
    triggerHaptic();

    playSound('jump');
    const nextRow = history.length;
    const target = getCoords(nextRow + 1, colIndex);
    
    avatarPos.current.targetX = target.x;
    avatarPos.current.targetY = target.y;
    avatarPos.current.jumpT = 0;
    
    const isCorrect = colIndex === path[nextRow];
    
    setTimeout(async () => {
      if (isCorrect) {
        const newHistory = [...history, colIndex];
        setHistory(newHistory);
        
        await supabase.rpc('update_glass_progress', { p_game_id: gameId, p_new_path: newHistory });
        
        if (newHistory.length === CONFIG[difficulty].rows) {
          await cashout(1 + (newHistory.length * CONFIG[difficulty].step), true);
        } else {
          isProcessingRef.current = false;
        }
      } else {
        playSound('break');
        spawnGlassShards(target.x, target.y);
        setStatus('lost');
        await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
        isProcessingRef.current = false;
      }
    }, 400);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (status !== 'playing' || isProcessingRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    for (let c = 0; c < CONFIG[difficulty].cols; c++) {
      const coords = getCoords(history.length + 1, c);
      if (clickX >= coords.x - (coords.w * 0.6) && clickX <= coords.x + (coords.w * 0.6)) {
        handleJump(c);
        break;
      }
    }
  };

  const startGame = async () => {
    if (isProcessingRef.current || !userId) return;
    triggerHaptic();
    
    const isMaintained = await init();
    if (isMaintained) return;
    
    if (bet < 10 || bet > jetonsCP) return;

    isProcessingRef.current = true;
    playSound('doll');
    setStatus('loading');
    
    const sequence = Array.from({ length: CONFIG[difficulty].rows }, () => Math.floor(Math.random() * CONFIG[difficulty].cols));
    
    try {
      const finalBet = Math.floor(bet);
      lockedBetRef.current = finalBet;

      const { data: ok, error: rpcErr } = await supabase.rpc('jouer_partie_cp', {
        p_user_id: userId,
        p_mise_cp: finalBet,
        p_gain_cp: 0,
        p_jeu_nom: 'Glass Start'
      });

      if (rpcErr || !ok.success) {
        setStatus('idle');
        isProcessingRef.current = false;
        return;
      }

      setJetonsCP(prev => prev - finalBet);

      const { data, error } = await supabase.rpc('start_glass_game', {
        p_bet: finalBet, 
        p_rows: CONFIG[difficulty].rows, 
        p_cols: CONFIG[difficulty].cols, 
        p_diff: difficulty, 
        p_path: sequence
      });
      
      if (error) throw error;
      
      setGameId(data);
      setPath(sequence);
      setHistory([]);
      setStatus('playing');
      syncAvatar();
      
      isProcessingRef.current = false;
    } catch {
      setStatus('idle');
      isProcessingRef.current = false;
    }
  };

  const cashout = async (mult: number, auto: boolean = false) => {
    if (!auto && isProcessingRef.current) return;
    isProcessingRef.current = true;

    playSound('win');
    setStatus('loading');
    
    const secureBet = lockedBetRef.current;
    const finalMult = parseFloat(mult.toFixed(2));
    const winAmount = Math.floor(secureBet * finalMult);

    try {
      if (winAmount > 0) {
        await supabase.rpc('jouer_partie_cp', {
          p_user_id: userId,
          p_mise_cp: 0,
          p_gain_cp: winAmount,
          p_jeu_nom: `Glass Win x${finalMult}`
        });
        setJetonsCP(prev => prev + winAmount);
      }

      await supabase.rpc('claim_glass_win', { p_game_id: gameId, p_multiplier: finalMult });
      spawnGlassShards(canvasRef.current ? canvasRef.current.width / 2 : 200, 120);
      setStatus('won');
    } catch {
      setStatus('playing');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const adjustBet = (multiplier: number) => {
    setBet(prev => Math.min(jetonsCP, Math.max(10, Math.floor(prev * multiplier))));
  };

  return (
    <NeonGameShell accent="rose" className="flex h-dvh flex-col font-black italic uppercase overflow-hidden select-none">
      
      {/* MAINTENANCE OVERLAY */}
      <AnimatePresence>
        {status === 'maintenance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] bg-[#020617] flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center border-2 border-rose-500 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <Hammer className="text-rose-500" size={40} />
            </motion.div>
            <h1 className="text-4xl tracking-tighter mb-2">MODE <span className="text-rose-500">MAINTENANCE</span></h1>
            <p className="text-sm text-white/40 font-bold max-w-xs">{maintenanceMsg}</p>
            <button onClick={() => window.history.back()} className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 transition-all active:scale-95">
              <ChevronLeft size={20}/> RETOUR
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTRO SCREEN */}
      <AnimatePresence>
        {status === 'intro' && (
          <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
            <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl text-rose-500 mb-4 tracking-tighter flex items-center gap-2">
              <Sparkles size={36} /> ELITE #456
            </motion.h1>
            <div className="w-48 h-1 bg-white/10 overflow-hidden rounded-full">
              <motion.div initial={{ x: -200 }} animate={{ x: 200 }} transition={{ repeat: Infinity, duration: 1 }} className="w-full h-full bg-rose-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER DE NAVIGATION & SOLDE */}
      <div className="z-50 flex h-16 flex-none items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-xl">
        <button onClick={() => window.history.back()} className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-2.5 text-rose-200 active:scale-95 transition-transform">
          <ChevronLeft size={20}/>
        </button>
        <span className="text-lg tracking-tight uppercase font-extrabold flex items-center gap-2">
          GLASS <span className="text-rose-500">BRIDGE</span>
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(!muted)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/60">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3.5 py-1.5 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <Coins size={15} className="text-rose-400" />
            <span className="text-sm font-black text-rose-200">{Math.floor(jetonsCP).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* CANVAS CENTRAL */}
      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)]">
        <canvas ref={canvasRef} className="w-full h-full touch-none cursor-pointer" onClick={handleCanvasClick} />

        {/* TIMER DE JEU */}
        {status === 'playing' && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-rose-400/30 bg-black/60 px-4 py-2 text-[10px] tracking-[0.25em] text-rose-200 backdrop-blur-md flex items-center gap-2 shadow-lg">
            TEMPS RESTANT <span className="text-lg font-black text-rose-400">{countdown}s</span>
          </div>
        )}

        {/* PUB BANNER */}
        <div className="absolute bottom-20 w-full flex justify-center pointer-events-none opacity-40">
          <div className="scale-75 origin-bottom">
            <ExoClickBanner />
          </div>
        </div>

        {/* PANNEAU DE MISE & DE CONFIGURATION */}
        {status === 'idle' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm space-y-5 rounded-[2rem] border border-rose-400/30 bg-slate-950/80 p-6 shadow-[0_0_50px_rgba(244,63,94,0.2)]">
              
              <div className="space-y-2">
                <p className="text-[10px] text-white/40 tracking-widest text-center">DIFFICULTÉ DU PONT</p>
                <div className="flex bg-black/50 p-1.5 rounded-2xl gap-1 border border-white/5">
                  {(Object.keys(CONFIG) as Array<keyof typeof CONFIG>).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2.5 text-[10px] rounded-xl transition-all ${difficulty === d ? 'bg-rose-500 text-black font-black shadow-lg shadow-rose-500/25' : 'text-white/40 hover:text-white'}`}>
                      {CONFIG[d].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-[10px] text-white/40 tracking-widest">VOTRE MISE (CP)</p>
                <input 
                  type="number" 
                  value={bet} 
                  onChange={e => setBet(Math.max(0, Number(e.target.value)))} 
                  className="w-full bg-transparent text-5xl text-center outline-none text-rose-500 font-black tracking-tight" 
                />
                
                {/* Boutons de raccourcis de mise */}
                <div className="flex gap-2 justify-center pt-2">
                  <button onClick={() => adjustBet(0.5)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 active:scale-95">1/2</button>
                  <button onClick={() => adjustBet(2)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 active:scale-95">x2</button>
                  <button onClick={() => setBet(100)} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 active:scale-95">+100</button>
                  <button onClick={() => setBet(jetonsCP)} className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-300 active:scale-95">MAX</button>
                </div>
              </div>

              <button onClick={startGame} disabled={isProcessingRef.current || bet < 10 || bet > jetonsCP} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 py-4 text-lg font-black text-black shadow-lg shadow-rose-500/30 transition-transform active:scale-95 disabled:opacity-30">
                <Play fill="black" size={18} /> LANCER LA PARTIE
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* BOUTONS TACTILES DIRECTIONNELS & BOUTON CASHOUT */}
      {status === 'playing' && (
        <div className="z-50 flex flex-col gap-2 border-t border-white/10 bg-slate-950/90 p-4 backdrop-blur-xl">
          
          {/* Boutons de choix de colonne */}
          <div className="flex gap-2 w-full">
            {Array.from({ length: CONFIG[difficulty].cols }).map((_, colIdx) => (
              <button
                key={colIdx}
                onClick={() => handleJump(colIdx)}
                disabled={avatarPos.current.jumpT < 1 || isProcessingRef.current}
                className="flex-1 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 active:bg-rose-500/30 transition-all disabled:opacity-20"
              >
                <ArrowUp size={14} /> TUILE {colIdx + 1}
              </button>
            ))}
          </div>

          <div className="flex h-16 gap-3 items-center">
            <div className="flex flex-1 flex-col justify-center rounded-2xl border border-white/10 bg-black/40 px-5 h-full">
              <span className="text-[9px] tracking-widest text-white/40">GAIN POTENTIEL</span>
              <span className="text-xl text-rose-400 font-black">
                <AnimatedCounter value={currentWin} /> <span className="text-xs text-white/40">CP</span>
              </span>
            </div>
            <button 
              onClick={() => cashout(currentMult)} 
              disabled={history.length === 0 || isProcessingRef.current} 
              className="flex-[1.5] h-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-lg font-black text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
            >
              <Zap size={18} fill="black" /> ENCAISSER
            </button>
          </div>
        </div>
      )}

      {/* MODAL VICTOIRE / DÉFAITE */}
      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="space-y-6 text-center w-full max-w-sm">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto border-4 shadow-2xl ${status === 'won' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/20' : 'border-rose-500 text-rose-500 bg-rose-500/10 shadow-rose-500/20'}`}>
                {status === 'won' ? <Trophy size={48} /> : <XCircle size={48} />}
              </div>
              <div>
                <h2 className="text-5xl italic tracking-tighter font-black">{status === 'won' ? 'VICTOIRE !' : 'ÉLIMINÉ'}</h2>
                <p className="text-2xl mt-2 font-bold text-white/70">{status === 'won' ? `+${currentWin} CP` : 'MISE PERDUE'}</p>
              </div>
              <button onClick={() => setStatus('idle')} className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg active:scale-95 transition-transform shadow-xl">
                REJOUER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeonGameShell>
  );
}
