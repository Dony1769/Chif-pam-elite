import React, { memo } from 'react';

function ConfettiComponent() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className="absolute top-0 h-2.5 w-2.5 rounded-sm bg-cyan-400/80 animate-pulse"
          style={{
            left: `${5 + index * 5}%`,
            animation: `fall 1.2s ease-out ${index * 0.06}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export const Confetti = memo(ConfettiComponent);
