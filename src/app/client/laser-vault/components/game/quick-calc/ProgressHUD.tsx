import React, { memo } from 'react';

interface ProgressHUDProps {
  progress: number;
  label: string;
}

function ProgressHUDComponent({ progress, label }: ProgressHUDProps) {
  return (
    <div className="rounded-lg lg:rounded-[1.3rem] border border-white/10 bg-slate-950/70 p-2 lg:p-4">
      <div className="mb-1 lg:mb-2 flex items-center justify-between text-[8px] lg:text-[10px] uppercase tracking-[0.2em] lg:tracking-[0.3em] text-slate-400">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    </div>
  );
}

export const ProgressHUD = memo(ProgressHUDComponent);
