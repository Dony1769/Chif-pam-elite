import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { Character } from './Character';
import { ComboIndicator } from './ComboIndicator';
import { Confetti } from './Confetti';
import { GameResult } from './GameResult';
import { MultiplierOrb } from './MultiplierOrb';
import { NumericKeyboard } from './NumericKeyboard';
import { Particles } from './Particles';
import { ProgressHUD } from './ProgressHUD';
import { SceneRenderer } from './SceneRenderer';
import { ScoreHUD } from './ScoreHUD';
import { ScreenShake } from './ScreenShake';
import { TimerRing } from './TimerRing';

interface GameProps {
  profileName?: string;
  onSubmitAnswer?: (value: string) => void;
  onFinish?: () => void;
  step?: number;
  question?: { display: string; answer: number } | null;
  score?: number;
  multiplier?: number;
  combo?: number;
  progress?: number;
  timeRemaining?: number;
  status?: 'idle' | 'playing' | 'won' | 'lost' | 'error';
  betCP?: number;
}

function GameComponent({
  profileName,
  onSubmitAnswer,
  onFinish,
  step = 0,
  question,
  score = 0,
  multiplier = 1,
  combo = 0,
  progress = 0,
  timeRemaining = 10,
  status = 'idle',
  betCP = 100,
}: GameProps) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 180);
    return () => window.clearTimeout(t);
  }, [shake]);

  const handleInput = useCallback((value: string) => {
    if (value === '↵') {
      onFinish?.();
      return;
    }
    if (value === '⌫') {
      onSubmitAnswer?.('DEL');
      return;
    }
    onSubmitAnswer?.(value);
    if (value === '0') {
      setShake(true);
    }
  }, [onFinish, onSubmitAnswer]);

  const sceneStep = useMemo(() => Math.max(0, Math.min(step, 7)), [step]);
  const potentialGain = useMemo(() => Math.floor(betCP * multiplier), [betCP, multiplier]);
  const timerProgress = useMemo(() => Math.max(0, Math.min(100, (timeRemaining / 10) * 100)), [timeRemaining]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950/70 flex flex-col">
      <Particles count={10} />
      {status === 'won' ? <Confetti /> : null}
      
      {/* Responsive Grid: Mobile stack → Desktop 2-col */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_0.85fr] gap-2 lg:gap-4 p-2 lg:p-4 min-h-0">
        
        {/* LEFT: Scene + Score (Primary on mobile) */}
        <div className="flex flex-col gap-2 lg:gap-4 min-h-0">
          <ScoreHUD score={score} multiplier={multiplier} combo={combo} profileName={profileName} />
          <ProgressHUD progress={progress} label="Progression" />
          <ScreenShake active={shake}>
            <div className="relative flex-1 rounded-xl lg:rounded-[2rem] border border-cyan-400/20 bg-slate-900/80 p-2 lg:p-4 min-h-0">
              <SceneRenderer step={sceneStep} question={question} />
            </div>
          </ScreenShake>
        </div>
        
        {/* RIGHT: Timer + Stats + Keyboard (Secondary on mobile) */}
        <div className="flex flex-col gap-2 lg:gap-4 min-h-0">
          {/* Timer + Multiplier + Combo in compact row */}
          <div className="flex gap-2 items-center justify-between lg:justify-start lg:flex-col">
            <div className="flex-1 lg:w-full">
              <TimerRing progress={timerProgress} timeRemaining={timeRemaining} maxTime={10} />
            </div>
            <div className="flex gap-2 lg:flex-row">
              <MultiplierOrb multiplier={multiplier} />
              <ComboIndicator combo={combo} />
            </div>
          </div>
          
          {/* Character + Potential Gain */}
          <div className="rounded-lg lg:rounded-[1.6rem] border border-white/10 bg-slate-900/80 p-3 lg:p-4 text-center">
            <Character status={status} />
            <p className="mt-1 lg:mt-2 text-[8px] lg:text-[10px] uppercase tracking-[0.3em] lg:tracking-[0.35em] text-slate-400">Gain potentiel</p>
            <p className="mt-1 text-lg lg:text-xl font-black text-cyan-300">{potentialGain} CP</p>
          </div>
          
          {/* Keyboard - Full width on mobile, constrained on desktop */}
          <div className="flex-1 lg:flex-none">
            <NumericKeyboard onInput={handleInput} />
          </div>
        </div>
      </div>
      
      {status === 'lost' ? <GameResult won={false} score={score} onClose={() => onFinish?.()} /> : null}
      {status === 'won' ? <GameResult won score={score} onClose={() => onFinish?.()} /> : null}
    </div>
  );
}

export const Game = memo(GameComponent);
