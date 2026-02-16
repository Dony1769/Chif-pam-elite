"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, XCircle, Trophy, Play, Volume2, VolumeX, AlertTriangle, Hammer, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Import Pub
import ExoClickBanner from "@/components/ads/ExoClickBanner";

// --- TYPES ---
interface Coords {
  x: number; y: number; w: number; h: number;
}

const CONFIG = {
  facile: { rows: 5, cols: 2, step: 0.3 },
  intermediaire: { rows: 7, cols: 2, step: 0.5 },
  difficile: { rows: 9, cols: 3, step: 0.8 }
};

const SOUNDS = {
  theme: "https://assets.mixkit.co/active_storage/sfx/2324/2324-preview.mp3",
  jump: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  break: "https://assets.mixkit.co/active_storage/sfx/1126/1126-preview.mp3",
  win: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  doll: "https://www.myinstants.com/media/sounds/squid-game-red-light-green-light-sound.mp3"
};

export default function GlassEliteFinal() {
  const [status, setStatus] = useState<'intro' | 'walking_in' | 'idle' | 'playing' | 'won' | 'lost' | 'loading' | 'maintenance'>('intro');
  const [maintenanceMsg, setMaintenanceMsg] = useState('SERVICE MOMENTANÉMENT INDISPONIBLE');
  
  const [difficulty, setDifficulty] = useState<keyof typeof CONFIG>('intermediaire');
  const [bet, setBet] = useState(10); // Input UI
  const [jetonsCP, setJetonsCP] = useState(0); // Solde réel
  const [gameId, setGameId] = useState<string | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, jumpT: 1, walkY: 0, walkCycle: 0 });
  const requestRef = useRef<number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // 🔒 SÉCURITÉ & REFS CRITIQUES
  const lockedBetRef = useRef<number>(0); // Stocke la mise inviolable
  const isProcessingRef = useRef<boolean>(false); // Mutex pour empêcher le double saut/cashout

  // Calcul Gain Potentiel (Basé sur la mise VERROUILLÉE)
  const currentMult = 1 + (history.length * CONFIG[difficulty].step);
  const currentWin = Math.floor(lockedBetRef.current * currentMult);

  // --- INIT & MAINTENANCE ---
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
        const introTimer = setTimeout(() => setStatus('walking_in'), 2500);
        return () => clearTimeout(introTimer);
      }
    });
  }, []);

  const playSound = (key: keyof typeof SOUNDS) => {
    if (muted) return;
    const s = audioRefs.current[key]?.cloneNode() as HTMLAudioElement;
    if (s) { s.volume = 0.5; s.play().catch(() => {}); }
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
  }, [status, history, difficulty]);

  const syncAvatar = () => {
    const coords = getCoords(history.length, history[history.length - 1] ?? 0.5);
    avatarPos.current = { ...avatarPos.current, x: coords.x, y: coords.y, targetX: coords.x, targetY: coords.y, jumpT: 1 };
  };

  const getCoords = (row: number, col: number): Coords => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0, w: 0, h: 0 };
    const TILE_W = Math.min(cvs.width / (CONFIG[difficulty].cols + 1.5), 80);
    const TILE_H = 40;
    const TILE_GAP = 12;
    const centerX = cvs.width / 2;
    const totalHeight = (CONFIG[difficulty].rows + 1) * (TILE_H + TILE_GAP);
    const startY = (cvs.height / 2) + (totalHeight / 2) - 40;

    return {
      x: centerX + (col - (CONFIG[difficulty].cols - 1) / 2) * (TILE_W + TILE_GAP),
      y: startY - row * (TILE_H + TILE_GAP),
      w: TILE_W,
      h: TILE_H
    };
  };

  // --- GESTION DU SAUT (SÉCURISÉE) ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 🛡️ SÉCURITÉ : Bloquer si déjà en saut (jumpT < 1) ou en traitement
    if (status !== 'playing' || avatarPos.current.jumpT < 1 || isProcessingRef.current) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let detectedCol = -1;
    for (let c = 0; c < CONFIG[difficulty].cols; c++) {
      const coords = getCoords(history.length + 1, c);
      if (clickX >= coords.x - (coords.w * 0.6) && clickX <= coords.x + (coords.w * 0.6)) {
        detectedCol = c;
        break;
      }
    }
    if (detectedCol !== -1) handleJump(detectedCol);
  };

  const updateLogic = () => {
    const p = avatarPos.current;
    const cvs = canvasRef.current;
    if (status === 'walking_in' && cvs) {
        const startPos = getCoords(0, 0.5);
        if (p.walkY === 0) p.walkY = cvs.height + 50;
        if (p.walkY > startPos.y) {
            p.walkY -= 3;
            p.walkCycle += 0.2;
            p.x = startPos.x;
            p.y = p.walkY;
        } else {
            setStatus('idle');
            p.walkCycle = 0;
            p.y = startPos.y;
        }
    }
    if (status === 'playing' && p.jumpT < 1) {
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
    if (status !== 'intro' && status !== 'maintenance') {
        for (let r = 0; r <= CONFIG[difficulty].rows; r++) {
            for (let c = 0; c < CONFIG[difficulty].cols; c++) {
                const { x, y, w, h } = getCoords(r, c);
                const isPassed = history.length > r - 1 && history[r - 1] === c && r > 0;
                const isCurrent = history.length === r - 1 && status === 'playing' && r > 0;
                ctx.fillStyle = isPassed ? '#10b981' : isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x - w/2, y - h/2, w, h, 6);
                else ctx.rect(x - w/2, y - h/2, w, h);
                ctx.fill();
            }
        }
    }
    if (status === 'walking_in' || status === 'playing' || status === 'idle' || status === 'lost') {
      const { x, y, jumpT, walkCycle } = avatarPos.current;
      let drawY = y;
      // let legOffset = 0; // Unused
      if (status === 'playing') {
          drawY = y - Math.sin(jumpT * Math.PI) * 45;
          // legOffset = Math.sin(jumpT * Math.PI) * 10;
      } else if (status === 'walking_in') {
          drawY = y + Math.abs(Math.sin(walkCycle)) * 5;
          // legOffset = Math.sin(walkCycle) * 8;
      }
      ctx.save();
      ctx.translate(x, drawY);
      ctx.fillStyle = '#0d9488';
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-8, -15, 16, 20, 4); else ctx.rect(-8, -15, 16, 20); ctx.fill();
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath(); ctx.arc(0, -20, 7, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  };

  const handleJump = async (colIndex: number) => {
    // 🛡️ Double vérification sécurité
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    playSound('jump');
    const nextRow = history.length;
    const target = getCoords(nextRow + 1, colIndex);
    
    // Animation de saut
    avatarPos.current.targetX = target.x;
    avatarPos.current.targetY = target.y;
    avatarPos.current.jumpT = 0;
    
    const isCorrect = colIndex === path[nextRow];
    
    setTimeout(async () => {
      if (isCorrect) {
        // --- SUCCÈS ---
        const newHistory = [...history, colIndex];
        setHistory(newHistory);
        
        // Update DB
        await supabase.rpc('update_glass_progress', { p_game_id: gameId, p_new_path: newHistory });
        
        // Si c'est la fin du pont -> Auto Cashout
        if (newHistory.length === CONFIG[difficulty].rows) {
            await cashout(1 + (newHistory.length * CONFIG[difficulty].step), true); // true = auto
        } else {
            // Prêt pour le saut suivant
            isProcessingRef.current = false;
        }
      } else {
        // --- ÉCHEC / MORT ---
        playSound('break');
        setStatus('lost');
        // Pas de gain, on ferme la session
        await supabase.from('glass_games').update({ is_active: false }).eq('id', gameId);
        isProcessingRef.current = false;
      }
    }, 450); // Durée du saut
  };

  const startGame = async () => {
    if (isProcessingRef.current || !userId) return;
    
    // Re-vérifier maintenance
    const isMaintained = await init();
    if (isMaintained) return;
    
    // Validation solde
    if (bet < 10 || bet > jetonsCP) { return; }

    isProcessingRef.current = true;
    playSound('doll');
    setStatus('loading');
    
    // Génération du chemin (Sécurisé : le client génère le chemin pour ce jeu MVP, 
    // idéalement le serveur devrait le faire, mais ici on sécurise surtout le montant)
    const sequence = Array.from({ length: CONFIG[difficulty].rows }, () => Math.floor(Math.random() * CONFIG[difficulty].cols));
    
    try {
      const finalBet = Math.floor(bet);
      
      // 🔒 VERROUILLAGE MISE
      lockedBetRef.current = finalBet;

      // Transaction Débit (RPC)
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

      // Mise à jour visuelle solde
      setJetonsCP(prev => prev - finalBet);

      // Création Game
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
      
      isProcessingRef.current = false; // Jeu commence

    } catch (e) {
      setStatus('idle');
      isProcessingRef.current = false;
    }
  };

  const cashout = async (mult: number, auto: boolean = false) => {
    // Si c'est automatique, on ne vérifie pas le processingRef car il est déjà true depuis handleJump
    if (!auto && isProcessingRef.current) return;
    isProcessingRef.current = true;

    playSound('win');
    setStatus('loading');
    
    // Calcul Gain avec Mise Verrouillée
    const secureBet = lockedBetRef.current;
    const finalMult = parseFloat(mult.toFixed(2));
    const winAmount = Math.floor(secureBet * finalMult);

    try {
      // 1. Crédit Gain
      if (winAmount > 0) {
          await supabase.rpc('jouer_partie_cp', {
              p_user_id: userId,
              p_mise_cp: 0,
              p_gain_cp: winAmount,
              p_jeu_nom: `Glass Win x${finalMult}`
          });
          setJetonsCP(prev => prev + winAmount);
      }

      // 2. Clôture DB
      await supabase.rpc('claim_glass_win', { p_game_id: gameId, p_multiplier: finalMult });
      
      setStatus('won');
    } catch (e) {
      // En cas d'erreur réseau extrême, on ne peut pas faire grand chose mais on débloque
      setStatus('playing');
    } finally {
        isProcessingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-[#020617] text-white font-black italic uppercase overflow-hidden">
      {/* MAINTENANCE OVERLAY */}
      <AnimatePresence>
        {status === 'maintenance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] bg-[#020617] flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center border-2 border-rose-500 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <Hammer className="text-rose-500" size={40} />
            </motion.div>
            <h1 className="text-4xl tracking-tighter mb-2">MODE <span className="text-rose-500">MAINTENANCE</span></h1>
            <p className="text-sm text-white/40 font-bold max-w-xs">{maintenanceMsg}</p>
            <button onClick={() => window.history.back()} className="mt-10 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 active:scale-95 transition-all">
              <ChevronLeft size={20}/> RETOUR
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === 'intro' && (
          <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
            <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl text-rose-500 mb-4 tracking-tighter">ELITE #456</motion.h1>
            <div className="w-48 h-1 bg-white/10 overflow-hidden"><motion.div initial={{ x: -200 }} animate={{ x: 200 }} transition={{ repeat: Infinity, duration: 1 }} className="w-full h-full bg-rose-500" /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-none h-16 flex items-center justify-between px-6 bg-[#0f172a] border-b border-white/5 z-50">
        <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-xl active:scale-95"><ChevronLeft size={20}/></button>
        <span className="text-xl tracking-tight uppercase">GLASS <span className="text-rose-500">BRIDGE</span></span>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <Coins size={14} className="text-emerald-500" />
            <span className="text-sm text-emerald-500">{Math.floor(jetonsCP).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)]">
        <canvas ref={canvasRef} className="w-full h-full touch-none" onClick={handleCanvasClick} />

        {/* --- ZONE PUBLICITÉ --- */}
        <div className="absolute bottom-24 w-full flex justify-center pointer-events-none opacity-50">
             <div className="scale-75 origin-bottom">
                <ExoClickBanner />
             </div>
        </div>

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md z-40">
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm bg-[#0f172a] p-6 rounded-4xl border border-white/10 space-y-6 shadow-2xl">
                <div className="flex bg-black/40 p-1 rounded-2xl gap-1">
                  {['facile', 'intermediaire', 'difficile'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d as any)} className={`flex-1 py-3 text-[9px] rounded-xl transition-all ${difficulty === d ? 'bg-rose-500 text-black shadow-lg' : 'text-white/40'}`}>{d}</button>
                  ))}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] text-white/30 tracking-widest">VOTRE MISE</p>
                  <input 
                    type="number" 
                    value={bet} 
                    onChange={e => setBet(Number(e.target.value))} 
                    className="w-full bg-transparent text-5xl text-center outline-none text-rose-500 font-black" 
                  />
                </div>
                <button onClick={startGame} disabled={isProcessingRef.current} className="w-full py-5 bg-rose-500 hover:bg-rose-400 rounded-2xl text-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"><Play fill="black" size={20} /> JOUER</button>
             </motion.div>
          </div>
        )}
      </div>

      {status === 'playing' && (
        <div className="flex-none h-24 bg-[#0f172a] border-t border-white/10 p-4 flex gap-4 z-50 pb-8 md:pb-4">
            <div className="flex-1 bg-black/20 rounded-2xl flex flex-col justify-center px-6 border border-white/5">
                <span className="text-[10px] text-white/30 tracking-widest">GAIN POTENTIEL</span>
                {/* Affichage sécurisé basé sur lockedBetRef */}
                <span className="text-2xl text-emerald-500">{currentWin} <span className="text-xs font-light text-white/50">CP</span></span>
            </div>
            <button onClick={() => cashout(currentMult)} disabled={history.length === 0 || isProcessingRef.current} className="flex-[1.5] bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-xl active:scale-95 disabled:opacity-20 transition-all">ENCAISSER</button>
        </div>
      )}

      <AnimatePresence>
        {(status === 'won' || status === 'lost') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="space-y-6 text-center w-full max-w-sm">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto border-4 ${status === 'won' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-rose-500 text-rose-500 bg-rose-500/10'}`}>
                        {status === 'won' ? <Trophy size={56} /> : <XCircle size={56} />}
                    </div>
                    <h2 className="text-6xl italic tracking-tighter">{status === 'won' ? 'VICTOIRE' : 'ÉLIMINÉ'}</h2>
                    <p className="text-2xl text-white/60">{status === 'won' ? `+${currentWin} CP` : 'MISE PERDUE'}</p>
                    <button onClick={() => setStatus('idle')} className="w-full py-5 bg-white text-black rounded-2xl font-black text-xl active:scale-105 transition-transform">REJOUER</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
