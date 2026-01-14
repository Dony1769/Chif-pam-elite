"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle2, XCircle, Trophy, Play, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFIG = {
  facile: { rows: 5, cols: 2, step: 0.3 },
  intermediaire: { rows: 7, cols: 2, step: 0.5 },
  difficile: { rows: 9, cols: 3, step: 0.8 }
};

// --- SON (CDN LINKS) ---
const SOUNDS = {
  theme: "https://assets.mixkit.co/active_storage/sfx/2324/2324-preview.mp3", // Ambiance tendue
  jump: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  break: "https://assets.mixkit.co/active_storage/sfx/1126/1126-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  doll: "https://www.myinstants.com/media/sounds/squid-game-red-light-green-light-sound.mp3" // Le fameux son
};

export default function GlassEliteCanvas() {
  const [status, setStatus] = useState<'intro' | 'idle' | 'playing' | 'won' | 'lost' | 'loading'>('intro');
  const [difficulty, setDifficulty] = useState<keyof typeof CONFIG>('intermediaire');
  const [bet, setBet] = useState(10);
  const [gameId, setGameId] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, jumpT: 1 });
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(bet * currentMult);

  // --- AUDIO ENGINE ---
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      audioRefs.current[key] = new Audio(url);
    });
    // Intro timer
    const timer = setTimeout(() => setStatus('idle'), 3500);
    return () => clearTimeout(timer);
  }, []);

  const playSound = (key: keyof typeof SOUNDS) => {
    if (muted || !audioRefs.current[key]) return;
    const s = audioRefs.current[key].cloneNode() as HTMLAudioElement;
    s.volume = 0.4;
    s.play().catch(() => {});
  };

  // --- RENDU DYNAMIQUE ---
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
        if (history.length > 0) syncAvatarToHistory(history);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let req: number;
    const animate = () => {
      draw();
      updateAvatar();
      req = requestAnimationFrame(animate);
    };
    req = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(req);
    };
  }, [status, history, difficulty]);

  const syncAvatarToHistory = (h: number[]) => {
    const target = getCoords(h.length, h[h.length - 1] ?? 0.5);
    avatarPos.current = { ...avatarPos.current, x: target.x, y: target.y, targetX: target.x, targetY: target.y, jumpT: 1 };
  };

  const getCoords = (row: number, col: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const TILE_W = Math.min(cvs.width / (CONFIG[difficulty].cols + 1), 80);
    const TILE_H = 45;
    const TILE_GAP = 12;
    
    const centerX = cvs.width / 2;
    // Centrage vertical dynamique
    const totalHeight = (CONFIG[difficulty].rows + 1) * (TILE_H + TILE_GAP);
    const startY = (cvs.height / 2) + (totalHeight / 2) - 50;

    const x = centerX + (col - (CONFIG[difficulty].cols - 1) / 2) * (TILE_W + TILE_GAP);
    const y = startY - row * (TILE_H + TILE_GAP);
    return { x, y, w: TILE_W, h: TILE_H };
  };

  const handleJump = async (colIndex: number) => {
    if (avatarPos.current.jumpT < 1 || status !== 'playing') return;
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
            playSound('win');
            cashout(currentMult + CONFIG[difficulty].step);
        }
      } else {
        playSound('break');
        setStatus('lost');
        await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
      }
    }, 450);
  };

  const updateAvatar = () => {
    const p = avatarPos.current;
    if (p.jumpT < 1) {
      p.jumpT += 0.05;
      if (p.jumpT > 1) p.jumpT = 1;
      p.x += (p.targetX - p.x) * 0.2;
      p.y += (p.targetY - p.y) * 0.2;
    }
  };

  const draw = () => {
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!cvs || !ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    for (let r = 0; r <= CONFIG[difficulty].rows; r++) {
      for (let c = 0; c < CONFIG[difficulty].cols; c++) {
        const { x, y, w, h } = getCoords(r, c);
        const isPassed = history.length > r - 1 && history[r - 1] === c && r > 0;
        const isCurrent = history.length === r - 1 && status === 'playing' && r > 0;

        // Verre
        ctx.fillStyle = isPassed ? '#10b981' : isCurrent ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
        ctx.shadowBlur = isCurrent ? 15 : 0;
        ctx.shadowColor = '#6366f1';
        
        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isCurrent) {
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
      }
    }

    // Avatar
    if (status === 'playing' || status === 'lost') {
      const { x, y, jumpT } = avatarPos.current;
      const jumpY = Math.sin(jumpT * Math.PI) * 45;
      
      ctx.save();
      ctx.translate(x, y - jumpY);
      
      // Personnage simplifié Elite
      ctx.fillStyle = '#0d9488'; // Teal Squid
      ctx.beginPath(); ctx.roundRect(-8, -20, 16, 20, 4); ctx.fill(); // Corps
      ctx.fillStyle = '#ffedd5'; 
      ctx.beginPath(); ctx.arc(0, -28, 7, 0, Math.PI*2); ctx.fill(); // Tête
      
      ctx.restore();
    }
  };

  const startGame = async () => {
    playSound('doll');
    setStatus('loading');
    const sequence = Array.from({ length: CONFIG[difficulty].rows }, () => Math.floor(Math.random() * CONFIG[difficulty].cols));
    try {
      const { data, error } = await supabase.rpc('start_glass_game', {
        p_bet: bet, p_rows: CONFIG[difficulty].rows, p_cols: CONFIG[difficulty].cols, p_diff: difficulty, p_path: sequence
      });
      if (error) throw error;
      setGameId(data);
      setPath(sequence);
      setHistory([]);
      setStatus('playing');
      const start = getCoords(0, 0.5);
      avatarPos.current = { x: start.x, y: start.y, targetX: start.x, targetY: start.y, jumpT: 1 };
    } catch (e: any) {
      setStatus('idle');
    }
  };

  const cashout = async (mult: number) => {
    playSound('win');
    setStatus('loading');
    try {
      await supabase.rpc('claim_glass_win', { p_game_id: gameId, p_multiplier: mult });
      setStatus('won');
    } catch (e) {
      setStatus('playing');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-black italic uppercase overflow-hidden">
      
      {/* INTRO CINEMATIQUE */}
      <AnimatePresence>
        {status === 'intro' && (
          <motion.div 
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl md:text-6xl tracking-[0.3em] text-rose-500 font-black"
            >
              ELITE <span className="text-white">#456</span>
            </motion.div>
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: 200 }} 
              className="h-1 bg-rose-500" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER COMPACT */}
      <div className="h-16 flex items-center justify-between px-6 bg-[#0f172a] border-b border-white/5 z-50">
        <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-xl"><ChevronLeft size={20}/></button>
        <div className="text-center">
            <span className="text-xl italic">GLASS <span className="text-rose-500">BRIDGE</span></span>
        </div>
        <button onClick={() => setMuted(!muted)} className="p-2 bg-white/5 rounded-xl">
          {muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
        </button>
      </div>

      {/* ZONE DE JEU - FLEX GROW POUR PRENDRE TOUTE LA PLACE DISPONIBLE */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" onClick={(e) => {
            if (status !== 'playing') return;
            const rect = canvasRef.current!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const colWidth = canvasRef.current!.width / CONFIG[difficulty].cols;
            handleJump(Math.floor(x / colWidth));
        }} />

        {/* OVERLAY INITIAL */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
                <div className="flex bg-black/40 p-1 rounded-2xl gap-1">
                  {['facile', 'intermediaire', 'difficile'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d as any)} className={`flex-1 py-3 text-[9px] rounded-xl transition-all ${difficulty === d ? 'bg-rose-500 text-black' : 'text-white/40'}`}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-white/30 tracking-widest mb-2">VOTRE MISE</p>
                  <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="w-full bg-transparent text-5xl text-center outline-none font-black text-rose-500" />
                </div>
                <button onClick={startGame} className="w-full py-5 bg-rose-500 hover:bg-rose-400 rounded-2xl shadow-xl active:scale-95 transition-all text-black font-black text-xl flex items-center justify-center gap-3">
                  <Play fill="black" size={20} /> JOUER
                </button>
             </motion.div>
          </div>
        )}
      </div>

      {/* FOOTER FIXE - TOUJOURS VISIBLE */}
      {status === 'playing' && (
        <div className="h-24 bg-[#0f172a] border-t border-white/10 p-4 flex gap-4 z-50">
            <div className="flex-1 bg-black/20 rounded-2xl flex flex-col justify-center px-6 border border-white/5">
                <span className="text-[10px] text-white/30 tracking-widest">GAIN POTENTIEL</span>
                <span className="text-2xl text-emerald-500 font-black">{currentWin} <span className="text-xs">HTG</span></span>
            </div>
            <button 
                onClick={() => cashout(currentMult)} 
                disabled={history.length === 0}
                className="flex-[1.5] bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-lg active:scale-95 disabled:opacity-20 transition-all text-xl"
            >
                ENCAISSER
            </button>
        </div>
      )}

      {/* MODAL FIN */}
      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="space-y-6 text-center">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto border-4 ${status === 'won' ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'}`}>
                        {status === 'won' ? <Trophy size={56} /> : <XCircle size={56} />}
                    </div>
                    <h2 className="text-6xl font-black italic">{status === 'won' ? 'WINNER' : 'ELIMINÉ'}</h2>
                    <p className="text-2xl font-light text-white/60">{status === 'won' ? `+${currentWin} HTG` : 'PARTIE PERDUE'}</p>
                    <button onClick={() => setStatus('idle')} className="px-16 py-5 bg-white text-black rounded-full font-black text-xl hover:scale-105 transition-transform">REJOUER</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
