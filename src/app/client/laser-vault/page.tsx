"use client";
import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Unlock, Lock, ChevronLeft, Loader2, ServerOff, Coins, Zap, Trophy, Minus, Plus } from 'lucide-react';

/* ============================
   AUDIO
============================ */
const playSound = (type: 'beep' | 'error' | 'win') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'beep') {
      osc.frequency.setValueAtTime(900, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    }
    if (type === 'error') {
      osc.frequency.setValueAtTime(100, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    }
    if (type === 'win') {
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
    }
  } catch {}
};

/* ============================
   AVATAR
============================ */
const EliteAvatar = ({ status }: { status: string }) => (
  <motion.div
    className="relative w-10 h-16"
    animate={status === 'lost' ? { rotate: 90, opacity: 0 } : {}}
  >
    <div className="absolute top-4 left-2 w-6 h-9 bg-emerald-600 rounded-lg border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
    <div className="absolute top-0 left-3 w-4 h-4 bg-orange-200 rounded-full border border-black/20" />
  </motion.div>
);

function LaserVaultGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const challengeFee = searchParams.get('fee');

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<'idle'|'playing'|'lost'|'won'|'maintenance'>('idle');

  const [betCP, setBetCP] = useState(10);
  const [laserY, setLaserY] = useState(0);
  const [problem, setProblem] = useState({ q: "", a: 0 });
  const [input, setInput] = useState("");
  const [multiplier, setMultiplier] = useState(0.5);
  const [questionsSolved, setQuestionsSolved] = useState(0);

  /* ============================
     INTENSITÉ HARDCORE
  ============================ */

  const baseSpeed = 3.5; // 🔥 vitesse accélérée
  const gameRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);

  /* ============================
     INIT USER
  ============================ */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    };
    init();
  }, []);

  /* ============================
     PROBLÈMES
  ============================ */
  const generateProblem = (m: number) => {
    const difficulty = Math.floor(m * 3);
    const a = Math.floor(Math.random() * (10 + difficulty)) + 2;
    const b = Math.floor(Math.random() * (10 + difficulty)) + 2;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const res = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setProblem({ q: `${a} ${op} ${b}`, a: res });
  };

  /* ============================
     START GAME
  ============================ */
  const startGame = () => {
    if (!profile || betCP > profile.jetons_cp) return;
    setMultiplier(0.5);
    setLaserY(0);
    setQuestionsSolved(0);
    setInput("");
    generateProblem(0.5);
    setStatus('playing');
    lastTimeRef.current = performance.now();
    requestAnimationFrame(gameLoop);
  };

  /* ============================
     GAME LOOP (NO PAUSE)
  ============================ */
  const gameLoop = (time: number) => {
    if (status !== 'playing') return;

    const delta = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    setLaserY(prev => {
      const speedFactor = multiplier < 1 ? 0.5 : 1 + (multiplier - 1) * 0.4;
      const newY = prev + (baseSpeed * speedFactor * delta * 30);

      if (newY >= 88) {
        finalizeGame(true);
        return 88;
      }
      return newY;
    });

    requestAnimationFrame(gameLoop);
  };

  /* ============================
     ANTI ALT TAB / ANTI CALCULATRICE
  ============================ */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === 'playing') {
        finalizeGame(true); // mort instantanée
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [status]);

  /* ============================
     INPUT
  ============================ */
  const handleKey = (num: string) => {
    if (status !== 'playing') return;
    playSound('beep');

    const val = input + num;
    setInput(val);

    if (parseInt(val) === problem.a) {
      setQuestionsSolved(q => q + 1);
      setMultiplier(m => parseFloat((m + 0.07).toFixed(2)));
      setLaserY(0);
      setInput("");
      generateProblem(multiplier + 0.07);
    } else if (val.length >= problem.a.toString().length + 1) {
      // ⚡ pénalité brutale +15%
      setLaserY(prev => Math.min(prev + 15, 88));
      setInput("");
      playSound('error');
    }
  };

  /* ============================
     FIN PARTIE
  ============================ */
  const finalizeGame = async (laserDeath: boolean) => {
    if (status !== 'playing') return;

    let gain = 0;
    if (!laserDeath) {
      gain = Math.floor(betCP * multiplier);
    } else {
      if (multiplier < 1) {
        gain = Math.floor(betCP * multiplier);
      } else {
        gain = 0;
      }
    }

    if (gain > 0) {
      await supabase.rpc('jouer_partie_cp', {
        p_user_id: profile.id,
        p_mise_cp: 0,
        p_gain_cp: gain,
        p_jeu_nom: 'Vault Hardcore Win'
      });
    }

    setStatus(gain > 0 ? 'won' : 'lost');
    gain > 0 ? playSound('win') : playSound('error');
  };

  if (!profile) {
    return <div className="h-screen flex items-center justify-center bg-[#020617]">
      <Loader2 className="animate-spin text-emerald-500" size={40}/>
    </div>;
  }

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col">

      {status === 'idle' && (
        <div className="flex-1 flex items-center justify-center">
          <button onClick={startGame} className="bg-emerald-600 px-10 py-6 rounded-3xl text-2xl font-black">
            START HARDCORE
          </button>
        </div>
      )}

      {status === 'playing' && (
        <>
          <div className="flex-1 relative overflow-hidden">
            <motion.div
              style={{ top: `${laserY}%` }}
              className="absolute left-0 right-0 h-1 bg-rose-600 shadow-[0_0_30px_#f43f5e]"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-6xl font-black">{problem.q}</p>
              <p className="text-4xl text-emerald-500">{input || "?"}</p>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <EliteAvatar status={status}/>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4">
            {[1,2,3,4,5,6,7,8,9,"-",0].map(n=>(
              <button key={n} onClick={()=>handleKey(n.toString())}
                className="h-14 bg-white/5 rounded-2xl text-2xl font-black">
                {n}
              </button>
            ))}
            <button onClick={()=>setInput("")}
              className="bg-rose-600 rounded-2xl text-white">CLR</button>

            <button
              onClick={()=>finalizeGame(false)}
              disabled={multiplier < 1}
              className="col-span-3 bg-emerald-600 py-6 rounded-3xl text-xl font-black">
              CASH OUT {Math.floor(betCP * multiplier)} CP
            </button>
          </div>
        </>
      )}

      {(status === 'lost' || status === 'won') && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center text-center">
          <h1 className="text-5xl font-black mb-6">
            {status === 'won' ? "WIN" : "DETECTED"}
          </h1>
          <button onClick={()=>router.push('/client/home')}
            className="bg-emerald-600 px-8 py-4 rounded-2xl">
            RETURN
          </button>
        </div>
      )}
    </div>
  );
}

export default function LaserVaultPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-emerald-500" size={50}/></div>}>
      <LaserVaultGame />
    </Suspense>
  );
                              }
