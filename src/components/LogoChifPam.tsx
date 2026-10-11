// components/LogoChifPam.tsx
"use client";

import React from 'react';

export const LogoChifPam = ({ className = "" }: { className?: string }) => (
  <div className={`relative flex flex-col items-start ${className}`}>
    <div className="flex items-center gap-3">
      <svg 
        viewBox="0 0 100 100" 
        className="w-12 h-12 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
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
      <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white leading-none">
        CHIF<span className="text-emerald-500">PAM</span>
      </h1>
    </div>
  </div>
);
