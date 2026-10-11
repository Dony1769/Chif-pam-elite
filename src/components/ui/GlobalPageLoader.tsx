"use client";

import { useEffect, useState } from 'react';

export default function GlobalPageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[200] transition-opacity duration-300 ${visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-sm" />
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="relative flex flex-col items-center gap-4">
          <div className="absolute h-30 w-30 rounded-full bg-emerald-500/20 blur-3xl" />
          <svg
            viewBox="0 0 100 100"
            className="relative h-20 w-20 animate-[spin_2.2s_linear_infinite]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61"
              stroke="#10B981"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M55 45L76 24M76 24H58M76 24V42"
              stroke="#10B981"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Chargement</p>
        </div>
      </div>
    </div>
  );
}
