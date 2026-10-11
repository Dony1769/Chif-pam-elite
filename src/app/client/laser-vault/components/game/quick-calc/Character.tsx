import React, { memo } from 'react';

interface CharacterProps {
  status: 'idle' | 'playing' | 'won' | 'lost' | 'error';
}

function CharacterComponent({ status }: CharacterProps) {
  const colors = status === 'won' ? 'from-emerald-400 to-cyan-400' : status === 'lost' ? 'from-rose-500 to-orange-500' : 'from-cyan-400 to-violet-400';

  return (
    <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${colors} text-4xl shadow-[0_0_28px_rgba(34,211,238,0.25)]`}>
      {status === 'won' ? '⚡' : status === 'lost' ? '☠️' : '🤖'}
    </div>
  );
}

export const Character = memo(CharacterComponent);
