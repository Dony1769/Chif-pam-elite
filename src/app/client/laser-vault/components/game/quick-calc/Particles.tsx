import React, { memo } from 'react';

interface ParticlesProps {
  count?: number;
}

function ParticlesComponent({ count = 8 }: ParticlesProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="absolute h-2 w-2 rounded-full bg-cyan-400/70 animate-pulse"
          style={{
            left: `${10 + index * 10}%`,
            top: `${10 + (index % 4) * 18}%`,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export const Particles = memo(ParticlesComponent);
