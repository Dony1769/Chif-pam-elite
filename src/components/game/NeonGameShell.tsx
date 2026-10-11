"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface NeonGameShellProps {
  children: React.ReactNode;
  accent?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';
  className?: string;
}

const accentMap = {
  emerald: {
    glow: 'from-emerald-400/35 via-cyan-400/10 to-transparent',
    ring: 'border-emerald-400/25',
    text: 'text-emerald-300',
    shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.18)]',
  },
  rose: {
    glow: 'from-rose-500/35 via-fuchsia-400/10 to-transparent',
    ring: 'border-rose-400/25',
    text: 'text-rose-300',
    shadow: 'shadow-[0_0_40px_rgba(244,63,94,0.18)]',
  },
  amber: {
    glow: 'from-amber-400/35 via-orange-400/10 to-transparent',
    ring: 'border-amber-400/25',
    text: 'text-amber-300',
    shadow: 'shadow-[0_0_40px_rgba(245,158,11,0.18)]',
  },
  cyan: {
    glow: 'from-cyan-400/35 via-sky-400/10 to-transparent',
    ring: 'border-cyan-400/25',
    text: 'text-cyan-300',
    shadow: 'shadow-[0_0_40px_rgba(34,211,238,0.18)]',
  },
  violet: {
    glow: 'from-violet-400/35 via-fuchsia-400/10 to-transparent',
    ring: 'border-violet-400/25',
    text: 'text-violet-300',
    shadow: 'shadow-[0_0_40px_rgba(167,139,250,0.18)]',
  },
};

export function NeonGameShell({ children, accent = 'emerald', className = '' }: NeonGameShellProps) {
  const tone = accentMap[accent];

  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#020617] text-white ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_40%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
      <motion.div
        initial={{ opacity: 0.2, scale: 0.95 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className={`absolute left-[-8%] top-[-10%] h-64 w-64 rounded-full bg-linear-to-br ${tone.glow} blur-3xl`}
      />
      <motion.div
        initial={{ opacity: 0.15 }}
        animate={{ opacity: 0.45 }}
        transition={{ duration: 1.6 }}
        className={`absolute bottom-[-5%] right-[-8%] h-72 w-72 rounded-full bg-linear-to-br ${tone.glow} blur-3xl`}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  );
}

interface AnimatedCounterProps {
  value: number | string;
  className?: string;
  prefix?: string;
  suffix?: string;
  accent?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';
}

export function AnimatedCounter({ value, className = '', prefix = '', suffix = '', accent = 'emerald' }: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState(typeof value === 'number' ? value : 0);
  useEffect(() => {
    const target = typeof value === 'number' ? value : Number(value) || 0;
    const start = displayed;
    const diff = target - start;
    const duration = 350;
    const startTime = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * eased));
      if (progress < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [value]);

  const tone = accentMap[accent];
  return <span className={`${tone.text} ${className}`}>{prefix}{displayed}{suffix}</span>;
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  accent?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';
  className?: string;
}

export function ProgressBar({ value, max, label, accent = 'emerald', className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const tone = accentMap[accent];
  return (
    <div className={`w-full ${className}`}>
      {label ? <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400"><span>{label}</span><span className={tone.text}>{Math.round(pct)}%</span></div> : null}
      <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={`h-full rounded-full bg-linear-to-r ${tone.glow.replace('from-', 'from-').replace('/35', '/80').replace('via-', 'via-').replace('/10', '/40')}`}
        />
      </div>
    </div>
  );
}
