"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, History as HistoryIcon, AlertTriangle, Coins, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
// Import de la bannière Publicitaire
import ExoClickBanner from "@/components/ads/ExoClickBanner";

// CONFIGURATION DU JEU
const ROWS = 16;
const PIN_RADIUS = 3;
const BALL_RADIUS = 6;
const PYRAMID_TOP = 60;
const MULTIPLIERS_16 = [1000, 10, 5, 2, 1, 0.5, 0.2, 0.2, 0.1, 0.1, 0.2, 0.5, 1, 2, 5, 10, 1000];

const COLORS = {
  pins: '#475569',
  ball: '#10b981', 
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
  isProcessed: boolean; // 🔒 SÉCURITÉ ANTI-DOUBLE PAIEMENT
}

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // États
  const [bet, setBet] = useState(100); 
  const [jetonsCP, setJetonsCP] = useState(0); 
  const [history, setHistory] = useState<number[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false); // Anti-spam click

  // Refs
  const ballsRef = useRef<Ball[]>([]);
  const requestRef = useRef<number | null>(null);
  const popSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  // --- INITIALISATION ---
  useEffect(() => {
    checkMaintenance();
    fetchData();
    
    // Audio
    popSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3');
    winSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');

    // Boucle d'animation
    const animate = () => {
      draw();
      updateBalls();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
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

  // --- MOTEUR PHYSIQUE ---

  const generatePlinkoPath = () => {
    let path = [];
    let finalPos = 0;
    // Biais maison léger pour éviter trop de x1000 (Provably Fair basique)
    const houseEdgeBias = 0.52; 

    for (let i = 0; i < ROWS; i++) {
        const goRight = Math.random() > houseEdgeBias;
        path.push(goRight ? 1 : 0);
        if (goRight) finalPos++;
    }
    return { path, finalPos };
  };

  const dropBall = async () => {
    if (!userId || bet > jetonsCP || bet < 10 || isMaintenance || dropping) return;
    
    setDropping(true); // Verrouillage temporaire du bouton

    try {
        const currentBet = Math.floor(bet); // Snapshot de la mise

        // 1. Transaction RPC : DÉBIT
        const { data: result, error } = await supabase.rpc('jouer_partie_cp', {
            p_user_id: userId,
            p_mise_cp: currentBet,
            p_gain_cp: 0,
            p_jeu_nom: 'Plinko Bet'
        });

        if (error || !result.success) {
            alert("Solde insuffisant.");
            setDropping(false);
            return;
        }

        setJetonsCP(prev => prev - currentBet);

        // 2. Calcul du résultat (Pré-déterminé pour sécurité)
        const { path, finalPos } = generatePlinkoPath();
        const multiplier = MULTIPLIERS_16[finalPos];
        const payout = Math.floor(currentBet * multiplier);

        // 3. Création de la bille
        const cvs = canvasRef.current;
        if (cvs) {
            const newBall: Ball = {
                id: Math.random().toString(36).substr(2, 9),
                x: cvs.width / 2,
                y: PYRAMID_TOP - 20,
                path: path,
                currentRow: 0,
                progress: 0,
                payout: payout,
                multiplier: multiplier,
                isProcessed: false // 🔒 Initialisé à Faux
            };
            ballsRef.current.push(newBall);
        }

    } catch (e) {
        console.error(e);
    } finally {
        // Délai pour éviter le spam click trop violent
        setTimeout(() => setDropping(false), 300);
    }
  };

  const updateBalls = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rowSpacing = (cvs.height - 120) / ROWS;

    // On parcourt à l'envers pour pouvoir supprimer sans casser les index
    for (let i = ballsRef.current.length - 1; i >= 0; i--) {
      const ball = ballsRef.current[i];
      
      ball.progress += 0.05; // Vitesse
      
      if (ball.progress >= 1) {
        ball.currentRow++;
        ball.progress = 0;
        
        // Son de rebond
        if (popSound.current && ball.currentRow < ROWS) {
             const s = popSound.current.cloneNode() as HTMLAudioElement;
             s.volume = 0.05;
             s.play().catch(() => {});
        }

        // --- FIN DE PARCOURS ---
        if (ball.currentRow >= ROWS) {
          
          // 🔒 SÉCURITÉ CRITIQUE : VÉRIFIER SI DÉJÀ PAYÉE
          if (!ball.isProcessed) {
              ball.isProcessed = true; // Marquer comme payée immédiatement
              
              setHistory(prev => [ball.multiplier, ...prev].slice(0, 8));
              
              // Paiement
              if (ball.payout > 0 && userId) {
                setJetonsCP(prev => prev + ball.payout);
                
                if (ball.multiplier >= 2 && winSound.current) {
                    winSound.current.currentTime = 0;
                    winSound.current.play().catch(() => {});
                }

                // Envoi DB
                supabase.rpc('jouer_partie_cp', {
                    p_user_id: userId,
                    p_mise_cp: 0,
                    p_gain_cp: ball.payout,
                    p_jeu_nom: `Plinko Win x${ball.multiplier}`
                }).then(() => {});
              }
          }

          // Suppression visuelle
          ballsRef.current.splice(i, 1);
        }
      } else {
          // Mise à jour position visuelle uniquement si pas fini
          const pathSum = ball.path.slice(0, ball.currentRow).reduce((a, b) => a + b, 0);
          const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
          const nextDir = ball.path[ball.currentRow];
          const targetPinX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
          const startPinY = PYRAMID_TOP + ball.currentRow * rowSpacing;
          const targetPinY = PYRAMID_TOP + (ball.currentRow + 1) * rowSpacing;
          const t = ball.progress;
          
          ball.x = startPinX + (targetPinX - startPinX) * t;
          ball.y = startPinY + (targetPinY - startPinY) * t - Math.sin(t * Math.PI) * (rowSpacing * 0.25);
      }
    }
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    
    // Nettoyage
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const rowSpacing = (cvs.height - 120) / ROWS;

    // Pins
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

    // Multiplicateurs
    const bucketY = PYRAMID_TOP + ROWS * rowSpacing + 25;
    MULTIPLIERS_16.forEach((m, i) => {
      const x = cvs.width / 2 + (i - ROWS / 2) * rowSpacing;
      const w = rowSpacing - 4;
      ctx.fillStyle = COLORS.multipliers(i);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w/2, bucketY, w, 25, 4); else ctx.rect(x - w/2, bucketY, w, 25);
      ctx.fill();
      
      ctx.fillStyle = "#000"; 
      ctx.font = "bold 10px Arial"; 
      ctx.textAlign = "center";
      ctx.fillText(m < 1 ? m.toString() : m.toFixed(0) + 'x', x, bucketY + 16);
    });

    // Balles
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
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col font-black uppercase italic overflow-x-hidden relative">
      
      {/* MAINTENANCE */}
      {isMaintenance && (
        <div className="absolute inset-0 z-[100] backdrop-blur-md bg-black/80 flex items-center justify-center p-6 text-center">
            <div className="max-w-md p-8 bg-[#151c2c] border-2 border-amber-500/50 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                <AlertTriangle size={40} className="text-amber-500 mx-auto mb-6" />
                <h2 className="text-2xl mb-2 text-amber-500">MAINTENANCE</h2>
                <p className="text-sm text-slate-400 mb-8 lowercase">{maintenanceMsg || "Indisponible."}</p>
                <button onClick={() => router.push('/client/list')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl">RETOUR</button>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-4 flex justify-between items-center bg-[#151c2c] border-b border-white/5 shadow-xl z-20">
        <button onClick={() => router.push('/client/list')} className="p-2 bg-white/5 rounded-xl border border-white/10 active:scale-90"><ChevronLeft /></button>
        <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full border border-white/5">
            <Coins size={16} className="text-emerald-500" />
            <span className="text-xl text-emerald-500 tracking-tighter">{Math.floor(jetonsCP).toLocaleString()} <span className="text-[10px] text-slate-500">CP</span></span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        
        {/* CONTROLS */}
        <div className="lg:w-80 bg-[#151c2c] p-6 space-y-6 border-r border-white/5 z-20 shadow-2xl">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 tracking-widest">MONTANT MISE (CP)</span>
            <div className="flex bg-[#0a0f1a] rounded-xl border border-white/10 overflow-hidden shadow-inner">
              <input 
                type="number" 
                value={bet} 
                onChange={(e) => setBet(Number(e.target.value))} 
                className="bg-transparent w-full p-4 outline-none text-emerald-500 font-bold text-lg" 
              />
              <button onClick={() => setBet(b => Math.max(10, Math.floor(b/2)))} className="px-4 border-l border-white/5 hover:bg-white/5 text-xs text-slate-400 font-bold transition-colors">/2</button>
              <button onClick={() => setBet(b => b*2)} className="px-4 border-l border-white/5 hover:bg-white/5 text-xs text-slate-400 font-bold transition-colors">x2</button>
            </div>
          </div>

          <button 
            onClick={dropBall}
            disabled={isMaintenance || bet > jetonsCP || dropping}
            className={`w-full py-6 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95 transition-all text-xl font-black flex items-center justify-center gap-2 ${
                isMaintenance || bet > jetonsCP 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            {dropping ? <Loader2 className="animate-spin" /> : (bet > jetonsCP ? 'SOLDE BAS' : 'LÂCHER')}
          </button>

          <div className="pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-[10px] uppercase tracking-widest">
              <HistoryIcon size={14} /> Historique
            </div>
            <div className="grid grid-cols-4 gap-2">
              {history.map((h, i) => (
                <div key={i} className={`py-2 rounded-lg text-center text-[10px] font-bold border transition-all animate-in zoom-in ${
                    h >= 10 ? 'bg-amber-500/20 border-amber-500 text-amber-500' :
                    h >= 2 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 
                    'bg-slate-800 border-white/10 text-slate-400'
                }`}>
                  {h}x
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div className="flex-1 relative flex flex-col items-center bg-[#0a0f1a] p-4 overflow-hidden">
            <div className="flex-1 flex items-center justify-center w-full">
                <canvas ref={canvasRef} width={700} height={600} className="w-full max-w-[600px] h-auto pointer-events-none drop-shadow-[0_0_50px_rgba(16,185,129,0.1)]" />
            </div>
            
            {/* PUBLICITÉ */}
            <div className="w-full max-w-lg mt-4 border-t border-white/5 pt-4">
               <ExoClickBanner />
            </div>
        </div>

      </div>
    </div>
  );
}
