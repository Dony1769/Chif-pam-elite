"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFIG = {
  facile: { rows: 5, cols: 2, step: 0.3 },
  intermediaire: { rows: 7, cols: 2, step: 0.5 },
  difficile: { rows: 9, cols: 3, step: 0.8 }
};

// --- CONSTANTES DE RENDU ---
const TILE_W = 80;
const TILE_H = 50;
const TILE_GAP = 15;

export default function GlassEliteCanvas() {
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost' | 'loading'>('idle');
  const [difficulty, setDifficulty] = useState<keyof typeof CONFIG>('intermediaire');
  const [bet, setBet] = useState(10);
  const [gameId, setGameId] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  
  // Refs pour le moteur Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, jumpT: 1 });
  const requestRef = useRef<number | null>(null);

  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(bet * currentMult);

  // --- INITIALISATION & ANIMATION ---
  useEffect(() => {
    const animate = () => {
      draw();
      updateAvatar();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [status, history, difficulty]);

  useEffect(() => {
    checkActiveGame();
  }, []);

  const checkActiveGame = async () => {
    const { data } = await supabase.rpc('get_active_glass_game');
    if (data?.[0]) {
      const g = data[0];
      setGameId(g.id);
      setBet(g.bet_amount);
      setDifficulty(g.difficulty);
      setPath(g.path_sequence);
      setHistory(g.current_path || []);
      setStatus('playing');
      syncAvatarToHistory(g.current_path || []);
    }
  };

  const syncAvatarToHistory = (h: number[]) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const target = getCoords(h.length, h[h.length - 1] ?? 0.5);
    avatarPos.current = { ...avatarPos.current, x: target.x, y: target.y, targetX: target.x, targetY: target.y, jumpT: 1 };
  };

  const getCoords = (row: number, col: number) => {
    const cvs = canvasRef.current!;
    const centerX = cvs.width / 2;
    const startY = cvs.height - 100;
    const x = centerX + (col - (CONFIG[difficulty].cols - 1) / 2) * (TILE_W + TILE_GAP);
    const y = startY - row * (TILE_H + TILE_GAP);
    return { x, y };
  };

  // --- LOGIQUE DE SAUT ---
  const handleJump = async (colIndex: number) => {
    if (avatarPos.current.jumpT < 1 || status !== 'playing') return;

    const nextRow = history.length;
    const target = getCoords(nextRow + 1, colIndex);
    
    // Déclencher l'animation
    avatarPos.current.targetX = target.x;
    avatarPos.current.targetY = target.y;
    avatarPos.current.jumpT = 0;

    const isCorrect = colIndex === path[nextRow];

    setTimeout(async () => {
      if (isCorrect) {
        const newHistory = [...history, colIndex];
        setHistory(newHistory);
        await supabase.rpc('update_glass_progress', { p_game_id: gameId, p_new_path: newHistory });
        if (newHistory.length === CONFIG[difficulty].rows) cashout(currentMult + CONFIG[difficulty].step);
      } else {
        setStatus('lost');
        await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
      }
    }, 400);
  };

  const updateAvatar = () => {
    const p = avatarPos.current;
    if (p.jumpT < 1) {
      p.jumpT += 0.04; // Vitesse du saut
      if (p.jumpT > 1) p.jumpT = 1;
      
      // Interpolation linéaire pour X/Y
      p.x = p.x + (p.targetX - p.x) * 0.15;
      p.y = p.y + (p.targetY - p.y) * 0.15;
    }
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // 1. Dessiner le Pont
    for (let r = 0; r <= CONFIG[difficulty].rows; r++) {
      for (let c = 0; c < CONFIG[difficulty].cols; c++) {
        const { x, y } = getCoords(r, c);
        const isPassed = history.length > r - 1 && history[r - 1] === c && r > 0;
        const isCurrent = history.length === r - 1 && status === 'playing' && r > 0;

        // Ombre portée du verre
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x - TILE_W/2 + 5, y - TILE_H/2 + 5, TILE_W, TILE_H);

        // Plaque de verre
        const grad = ctx.createLinearGradient(x, y - TILE_H/2, x, y + TILE_H/2);
        grad.addColorStop(0, isPassed ? '#10b981' : isCurrent ? '#334155' : '#1e293b');
        grad.addColorStop(1, isPassed ? '#059669' : isCurrent ? '#0f172a' : '#020617');
        
        ctx.fillStyle = grad;
        ctx.strokeStyle = isCurrent ? '#6366f1' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = isCurrent ? 3 : 1;
        
        ctx.beginPath();
        ctx.roundRect(x - TILE_W/2, y - TILE_H/2, TILE_W, TILE_H, 8);
        ctx.fill();
        ctx.stroke();

        // Reflet brillant sur le verre
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(x - TILE_W/2 + 10, y - TILE_H/2 + 5);
        ctx.lineTo(x + TILE_W/2 - 10, y - TILE_H/2 + 5);
        ctx.stroke();
      }
    }

    // 2. Dessiner l'Avatar (Le Joueur)
    if (status === 'playing' || status === 'lost') {
      const { x, y, jumpT } = avatarPos.current;
      // Hauteur du saut (Parabole)
      const jumpY = Math.sin(jumpT * Math.PI) * 40;
      const drawY = y - jumpY;

      ctx.save();
      ctx.translate(x, drawY);

      // Ombre du personnage au sol
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, jumpY + 20, 15 * (1 - jumpT*0.5), 5, 0, 0, Math.PI*2);
      ctx.fill();

      // Corps (Survêtement)
      ctx.fillStyle = '#0d9488'; // Teal #456
      ctx.beginPath();
      ctx.roundRect(-10, -25, 20, 25, 5); // Torse
      ctx.fill();

      // Tête
      ctx.fillStyle = '#ffedd5'; // Peau
      ctx.beginPath();
      ctx.arc(0, -35, 8, 0, Math.PI*2);
      ctx.fill();

      // Mains et Pieds (Animation de saut)
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      const limbMove = Math.sin(jumpT * Math.PI) * 10;
      
      // Jambes
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(-8 - limbMove/2, 10 - limbMove); // Gauche
      ctx.moveTo(5, 0); ctx.lineTo(8 + limbMove/2, 10 - limbMove);   // Droite
      ctx.stroke();

      // Bras
      ctx.beginPath();
      ctx.moveTo(-10, -20); ctx.lineTo(-15 - limbMove, -10 - limbMove); 
      ctx.moveTo(10, -20); ctx.lineTo(15 + limbMove, -10 - limbMove);
      ctx.stroke();

      // Numéro 456
      ctx.fillStyle = 'white';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('456', 0, -15);

      ctx.restore();
    }
  };

  const startGame = async () => {
    setStatus('loading');
    const sequence = Array.from({ length: CONFIG[difficulty].rows }, () => Math.floor(Math.random() * CONFIG[difficulty].cols));
    try {
      const { data, error } = await supabase.rpc('start_glass_game', {
        p_bet: bet, p_rows: CONFIG[difficulty].rows, p_cols: CONFIG[difficulty].cols,
        p_diff: difficulty, p_path: sequence
      });
      if (error) throw error;
      setGameId(data);
      setPath(sequence);
      setHistory([]);
      setStatus('playing');
      const start = getCoords(0, 0.5);
      avatarPos.current = { x: start.x, y: start.y, targetX: start.x, targetY: start.y, jumpT: 1 };
    } catch (e: any) {
      alert(e.message);
      setStatus('idle');
    }
  };

  const cashout = async (mult: number) => {
    setStatus('loading');
    try {
      await supabase.rpc('claim_glass_win', { p_game_id: gameId, p_multiplier: mult });
      setStatus('won');
    } catch (e) {
      setStatus('playing');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-bold overflow-hidden italic uppercase">
      
      {/* HEADER */}
      <div className="h-[10%] flex items-center justify-between px-6 bg-[#0f172a]/80 border-b border-white/5 backdrop-blur-md z-50">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft /></button>
        <div className="text-center">
            <span className="text-xl tracking-tighter italic font-black">GLASS <span className="text-rose-500">ELITE</span></span>
            <p className="text-[7px] text-rose-500/50 tracking-[.4em]">Security Verified</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-500 text-xs">
          {currentWin} HTG
        </div>
      </div>

      {/* CANVAS ZONE */}
      <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_100%)]">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={700} 
          className="w-full h-full object-contain"
          onClick={(e) => {
             if (status !== 'playing') return;
             const rect = canvasRef.current!.getBoundingClientRect();
             const x = e.clientX - rect.left;
             const colWidth = canvasRef.current!.width / CONFIG[difficulty].cols;
             handleJump(Math.floor(x / colWidth));
          }}
        />

        {/* OVERLAY INITIAL */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
             <div className="w-full max-w-xs bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
                <div className="flex gap-2">
                  {['facile', 'intermediaire', 'difficile'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d as any)} className={`flex-1 py-2 text-[8px] rounded-lg border transition-all ${difficulty === d ? 'bg-rose-500 border-rose-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-white/40 text-center uppercase">Montant de la mise</p>
                  <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="w-full bg-transparent text-4xl text-center outline-none font-black text-rose-500" />
                </div>
                <button onClick={startGame} className="w-full py-4 bg-rose-500 hover:bg-rose-400 rounded-2xl shadow-xl active:scale-95 transition-all text-black font-black">COMMENCER</button>
             </div>
          </div>
        )}
      </div>

      {/* CONTROLES BAS */}
      {status === 'playing' && (
        <div className="h-[15%] bg-[#0f172a] border-t border-white/10 p-4 flex gap-4 z-50">
            <div className="flex-1 bg-black/20 rounded-2xl flex flex-col justify-center px-6 border border-white/5">
                <span className="text-[10px] text-white/30 tracking-widest">MULTIPLIER</span>
                <span className="text-2xl text-emerald-500 font-black">{currentMult.toFixed(1)}x</span>
            </div>
            <button 
                onClick={() => cashout(currentMult)} 
                disabled={history.length === 0}
                className="flex-[1.5] bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-20 transition-all text-xl"
            >
                ENCAISSER
            </button>
        </div>
      )}

      {/* FIN DE JEU */}
      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                <div className="space-y-6">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto border-4 ${status === 'won' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-rose-500 bg-rose-500/10 text-rose-500'}`}>
                        {status === 'won' ? <Trophy size={48} /> : <XCircle size={48} />}
                    </div>
                    <h2 className="text-5xl font-black italic">{status === 'won' ? 'VICTOIRE' : 'ELIMINÉ'}</h2>
                    <p className="text-2xl font-light">{status === 'won' ? `+${currentWin} HTG` : 'PARTIE TERMINÉE'}</p>
                    <button onClick={() => setStatus('idle')} className="px-12 py-4 bg-white text-black rounded-full font-black text-lg hover:scale-105 transition-transform">REJOUER</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
