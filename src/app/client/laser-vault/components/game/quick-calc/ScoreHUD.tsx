import React, { memo } from 'react';

interface ScoreHUDProps {
  score: number;
  multiplier: number;
  combo: number;
  profileName?: string;
}

function ScoreHUDComponent({ score, multiplier, combo, profileName }: ScoreHUDProps) {
  return (
    <div className="rounded-lg lg:rounded-[1.3rem] border border-cyan-400/20 bg-slate-950/80 p-2 lg:p-4 text-white shadow-[0_0_24px_rgba(34,211,238,0.16)]">
      <div className="flex items-center justify-between text-[8px] lg:text-[10px] uppercase tracking-[0.2em] lg:tracking-[0.3em] text-slate-400">
        <span>{profileName || 'Joueur'}</span>
        <span>Score</span>
      </div>
      <div className="mt-2 lg:mt-3 flex items-end justify-between">
        <div>
          <p className="text-xl lg:text-3xl font-black">{score}</p>
          <p className="text-[8px] lg:text-[10px] uppercase text-slate-500">Points</p>
        </div>
        <div className="text-right">
          <p className="text-lg lg:text-2xl font-black text-cyan-300">x{multiplier.toFixed(1)}</p>
          <p className="text-[8px] lg:text-[10px] uppercase text-slate-500">Combo {combo}</p>
        </div>
      </div>
    </div>
  );
}

export const ScoreHUD = memo(ScoreHUDComponent);

