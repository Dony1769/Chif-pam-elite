import React from 'react';

export interface SceneBaseProps {
  title: string;
  accent: string;
  children: React.ReactNode;
  entering?: boolean;
  exiting?: boolean;
}

export function SceneBase({ title, accent, children, entering = true, exiting = false }: SceneBaseProps) {
  return (
    <div className={`rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition-all duration-300 ${entering && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{title}</p>
        <div className={`h-2.5 w-2.5 rounded-full bg-${accent}-400/80`} />
      </div>
      {children}
    </div>
  );
}
