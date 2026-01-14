"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Settings2, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CONFIGURATION VISUELLE
const ROWS = 16; // Mode expert par défaut
const PIN_RADIUS = 3;
const BALL_RADIUS = 5;
const COLORS = {
  pins: '#ffffff',
  ball: '#ff0055', // Rose fluo style Stake
  text: '#ffffff',
  multipliers: {
    low: '#f59e0b',    // Jaune/Orange (Centre)
    medium: '#f97316', // Orange
    high: '#ef4444',   // Rouge (Extrémités)
  }
};

// MULTIPLICATEURS (Doivent matcher le SQL pour l'affichage)
const MULTIPLIERS_16 = [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];

interface Ball {
  id: string;
  x: number;
  y: number;
  path: number[]; // 0 = gauche, 1 = droite
  currentRow: number;
  progress: number; // 0 à 1 entre deux rangées
  value: number; // Gain potentiel
}

export default function PlinkoElite() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const ballsRef = useRef<Ball[]>([]); // Ref pour l'animation sans re-render
  const requestRef = useRef<number>();
  
  // Audio
  const popSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  // Initialisation
  useEffect(() => {
    fetchBalance();
    popSound.current = new Audio('/sounds/pop.mp3'); // Ajoutez des sons dans public/sounds/
    winSound.current = new Audio('/sounds/win.mp3');
    
    // Animation Loop
    const animate = () => {
      draw();
      updateBalls();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      if (data) setBalance(data.balance);
    }
  };

  // ----------------------------------------------------------------
  // LOGIQUE DU JEU (Moteur Physique Simplifié)
  // ----------------------------------------------------------------
  const dropBall = async () => {
    if (bet > balance || loading) return;
    
    // On ne met pas loading à true globalement pour permettre le spam-click (multiball)
    // On débite visuellement tout de suite
    setBalance(prev => prev - bet);

    try {
      // Appel RPC Supabase
      const { data, error } = await supabase.rpc('play_plinko', {
        p_bet_amount: bet,
        p_rows: ROWS,
        p_risk: 'high'
      });

      if (error) throw error;

      // Créer la balle avec le chemin prédéfini par le serveur
      const startX = canvasRef.current!.width / 2;
      const startY = 50;
      
      const newBall: Ball = {
        id: Math.random().toString(),
        x: startX,
        y: startY,
        path: data.path, // Tableau de 0 et 1
        currentRow: 0,
        progress: 0,
        value: data.payout
      };

      ballsRef.current.push(newBall);

    } catch (e) {
      console.error(e);
      setBalance(prev => prev + bet); // Rembourser si erreur
      alert("Erreur réseau");
    }
  };

  const updateBalls = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // Dimensions dynamiques
    const pyramidHeight = cvs.height - 100;
    const rowSpacing = pyramidHeight / ROWS;

    ballsRef.current.forEach((ball, index) => {
      ball.progress += 0.04; // Vitesse de chute

      if (ball.progress >= 1) {
        // La balle a atteint la rangée suivante
        ball.currentRow++;
        ball.progress = 0;
        
        // Petit son de collision
        if (popSound.current) {
            const clone = popSound.current.cloneNode() as HTMLAudioElement;
            clone.volume = 0.2;
            clone.play().catch(() => {});
        }

        // Si la balle a fini son chemin
        if (ball.currentRow >= ROWS) {
          // GESTION FIN DE PARTIE
          ballsRef.current.splice(index, 1);
          
          // Mise à jour finale du solde (pour être synchro avec le serveur)
          if (ball.value > 0) {
             setBalance(prev => prev + ball.value);
             // Son de gain si gros gain
             if (ball.value > bet * 2 && winSound.current) winSound.current.play().catch(()=>{});
          }
          return;
        }
      }

      // Interpolation de position (Physique visuelle)
      // Calculer X cible basé sur le chemin (0 = gauche, 1 = droite)
      const currentDir = ball.path[ball.currentRow]; // 0 ou 1
      const xOffset = (currentDir === 0 ? -1 : 1) * (rowSpacing / 2);
      
      // Position de base de la rangée
      // La pyramide s'élargit vers le bas
      const startX = cvs.width / 2 + (ball.currentRow - ROWS/2) * rowSpacing; // Approx simplification
      // Ce calcul est complexe pour une pyramide parfaite, simplifions :
      
      // Approche par coordonnées relatives aux pins
      // Pin(Row, Index) -> Pin(Row+1, Index) OU Pin(Row+1, Index+1)
      const pathSum = ball.path.slice(0, ball.currentRow).reduce((a, b) => a + b, 0);
      const startPinX = cvs.width / 2 + (pathSum - ball.currentRow / 2) * rowSpacing;
      
      const nextDir = ball.path[ball.currentRow];
      const targetPinX = cvs.width / 2 + ((pathSum + nextDir) - (ball.currentRow + 1) / 2) * rowSpacing;
      
      const startPinY = 50 + ball.currentRow * rowSpacing;
      const targetPinY = 50 + (ball.currentRow + 1) * rowSpacing;

      // Interpolation quadratique pour faire un petit saut
      const t = ball.progress;
      ball.x = startPinX + (targetPinX - startPinX) * t;
      // Parabole inversée pour le rebond : Y linéaire + courbe
      ball.y = startPinY + (targetPinY - startPinY) * t - Math.sin(t * Math.PI) * (rowSpacing * 0.2);
    });
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const pyramidTop = 50;
    const pyramidHeight = cvs.height - 100;
    const rowSpacing = pyramidHeight / ROWS;

    // 1. Dessiner les Pins (Pyramide)
    ctx.fillStyle = COLORS.pins;
    for (let row = 0; row <= ROWS; row++) {
      const pinsInRow = row + 1;
      const y = pyramidTop + row * rowSpacing;
      for (let i = 0; i < pinsInRow; i++) {
        // Centrer la rangée
        const x = cvs.width / 2 + (i - row / 2) * rowSpacing;
        
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
      }
    }
    ctx.shadowBlur = 0;

    // 2. Dessiner les Buckets (Multiplicateurs) en bas
    const bucketY = pyramidTop + ROWS * rowSpacing + 20;
    MULTIPLIERS_16.forEach((mult, i) => {
      const x = cvs.width / 2 + (i - ROWS / 2) * rowSpacing;
      const w = rowSpacing - 4;
      
      // Couleur basée sur le risque (Centre = low, Extérieurs = high)
      const distFromCenter = Math.abs(i - ROWS/2);
      let color = COLORS.multipliers.low;
      if (distFromCenter > 3) color = COLORS.multipliers.medium;
      if (distFromCenter > 6) color = COLORS.multipliers.high;

      ctx.fillStyle = color;
      
      // Forme du bucket (arrondi)
      ctx.beginPath();
      ctx.roundRect(x - w/2, bucketY, w, 30, 4);
      ctx.fill();

      // Texte
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(mult + 'x', x, bucketY + 18);
    });

    // 3. Dessiner les balles
    ballsRef.current.forEach(ball => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ball;
      ctx.fill();
      // Effet de traînée ou brillance
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.ball;
    });
    ctx.shadowBlur = 0;
  };

  return (
    <div className="min-h-screen bg-[#0f1728] text-white flex flex-col font-sans select-none overflow-hidden">
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-[#1a2332] border-b border-white/5">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition"><ChevronLeft /></button>
            <div className="flex items-center gap-2 bg-[#0f1728] px-4 py-2 rounded-full border border-emerald-500/30">
                <span className="text-emerald-500 font-bold">{balance.toFixed(0)} HTG</span>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-full"><Settings2 size={20}/></button>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row">
            {/* Sidebar de contrôle (Gauche sur Desktop, Bas sur Mobile) */}
            <div className="lg:w-80 bg-[#1a2332] p-6 flex flex-col gap-6 border-r border-white/5 z-10 shadow-xl">
                <div>
                    <label className="text-xs text-slate-400 font-bold mb-2 block tracking-wider">MONTANT DU PARI</label>
                    <div className="flex bg-[#0f1728] rounded-md border border-white/10 overflow-hidden focus-within:border-emerald-500 transition-colors">
                        <input 
                            type="number" 
                            value={bet} 
                            onChange={(e) => setBet(Math.max(0, Number(e.target.value)))}
                            className="bg-transparent w-full p-3 outline-none font-bold"
                        />
                        <button onClick={() => setBet(b => b/2)} className="px-3 text-xs font-bold text-slate-500 hover:bg-white/5">½</button>
                        <button onClick={() => setBet(b => b*2)} className="px-3 text-xs font-bold text-slate-500 hover:bg-white/5">2x</button>
                    </div>
                </div>

                <div>
                    <label className="text-xs text-slate-400 font-bold mb-2 block tracking-wider">DIFFICULTÉ</label>
                    <select className="w-full bg-[#0f1728] p-3 rounded-md border border-white/10 outline-none font-bold text-sm">
                        <option>16 Rows (High Risk)</option>
                        {/* Pour l'instant on hardcode 16 rows dans le UI pour matcher le canvas */}
                    </select>
                </div>

                <div className="mt-auto">
                    <button 
                        onClick={dropBall}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0f1728] font-black rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all text-lg"
                    >
                        MISER
                    </button>
                </div>
            </div>

            {/* Zone de Jeu (Canvas) */}
            <div className="flex-1 relative flex items-center justify-center bg-[#0f1728] overflow-hidden">
                {/* Score History Flottant */}
                <div className="absolute top-4 right-4 flex gap-2 flex-col-reverse">
                    {/* On pourrait mapper l'historique ici */}
                </div>

                <canvas 
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="max-w-full max-h-full object-contain"
                />
            </div>
        </div>
    </div>
  );
}

