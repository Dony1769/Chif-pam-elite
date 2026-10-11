import React, { memo } from 'react';

interface MultiplierOrbProps {
  multiplier: number;
}

function MultiplierOrbComponent({ multiplier }: MultiplierOrbProps) {
  return (
    <div className="flex h-12 w-12 lg:h-16 lg:w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-sm lg:text-xl font-black text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
      x{multiplier.toFixed(1)}
    </div>
  );
}

export const MultiplierOrb = memo(MultiplierOrbComponent);
