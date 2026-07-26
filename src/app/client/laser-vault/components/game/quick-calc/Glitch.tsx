import React from 'react';

interface GlitchProps {
  active: boolean;
  children: React.ReactNode;
}

export function Glitch({ active, children }: GlitchProps) {
  return <div className={active ? 'animate-pulse' : ''}>{children}</div>;
}
