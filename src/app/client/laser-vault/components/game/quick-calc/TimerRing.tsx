import React, { memo, useMemo } from 'react';

interface TimerRingProps {
  progress: number;
  timeRemaining: number;
  maxTime?: number;
}

function TimerRingComponent({ progress, timeRemaining, maxTime = 10 }: TimerRingProps) {
  const radius = 38;
  const circumference = useMemo(() => 2 * Math.PI * radius, []);
  const offset = useMemo(() => circumference - (progress / 100) * circumference, [circumference, progress]);

  return (
    <div className="flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 100 100" className="-rotate-90 lg:w-96 lg:h-96">
        <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
        <circle cx="50" cy="50" r={radius} stroke="url(#timerGradient)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-lg lg:text-2xl font-black text-white">{timeRemaining.toFixed(1)}s</p>
        <p className="text-[8px] lg:text-[10px] uppercase tracking-[0.2em] lg:tracking-[0.3em] text-slate-400">Temps</p>
      </div>
    </div>
  );
}

export const TimerRing = memo(TimerRingComponent);
