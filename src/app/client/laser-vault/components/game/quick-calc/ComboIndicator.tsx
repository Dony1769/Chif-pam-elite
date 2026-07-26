import React, { memo } from 'react';

interface ComboIndicatorProps {
  combo: number;
}

function ComboIndicatorComponent({ combo }: ComboIndicatorProps) {
  return (
    <div className="rounded-lg lg:rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-2 lg:px-3 py-1 lg:py-2 text-center text-emerald-200">
      <p className="text-[8px] lg:text-[10px] uppercase tracking-[0.2em] lg:tracking-[0.3em] text-emerald-400">Combo</p>
      <p className="text-base lg:text-xl font-black">{combo}x</p>
    </div>
  );
}

export const ComboIndicator = memo(ComboIndicatorComponent);
