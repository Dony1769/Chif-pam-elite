import React from 'react';

interface ScreenShakeProps {
  active: boolean;
  children: React.ReactNode;
}

export function ScreenShake({ active, children }: ScreenShakeProps) {
  return <div className={active ? 'animate-pulse' : ''}>{children}</div>;
}
