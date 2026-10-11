'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface GlowEffectProps {
  children: React.ReactNode;
  color?: 'cyan' | 'emerald' | 'rose' | 'amber';
  intensity?: 'light' | 'medium' | 'heavy';
}

function GlowEffectComponent({ children, color = 'cyan', intensity = 'medium' }: GlowEffectProps) {
  const colorMap = {
    cyan: 'rgba(34,211,238,0.3)',
    emerald: 'rgba(52,211,153,0.3)',
    rose: 'rgba(244,63,94,0.3)',
    amber: 'rgba(217,119,6,0.3)',
  };

  const intensityMap = {
    light: 'blur(12px)',
    medium: 'blur(20px)',
    heavy: 'blur(32px)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: intensityMap[intensity] }}
      animate={{ opacity: 1 }}
      className="relative"
      style={{
        boxShadow: `0 0 48px ${colorMap[color]}, 0 0 96px ${colorMap[color]}`,
      }}
    >
      {children}
    </motion.div>
  );
}

export const GlowEffect = memo(GlowEffectComponent);

interface BloomEffectProps {
  children: React.ReactNode;
}

function BloomEffectComponent({ children }: BloomEffectProps) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 0 20px rgba(34,211,238,0.2)',
          '0 0 40px rgba(34,211,238,0.4)',
          '0 0 20px rgba(34,211,238,0.2)',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}

export const BloomEffect = memo(BloomEffectComponent);

interface GlassEffectProps {
  children: React.ReactNode;
}

function GlassEffectComponent({ children }: GlassEffectProps) {
  return (
    <motion.div
      className="relative rounded-[2rem] border border-white/20 bg-white/5 backdrop-blur-xl"
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
    >
      {children}
    </motion.div>
  );
}

export const GlassEffect = memo(GlassEffectComponent);

interface SciFiGridProps {
  children: React.ReactNode;
}

function SciFiGridComponent({ children }: SciFiGridProps) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-[1.6rem]"
      style={{
        backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(34,211,238,0.05) 25%, rgba(34,211,238,0.05) 26%, transparent 27%, transparent 74%, rgba(34,211,238,0.05) 75%, rgba(34,211,238,0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34,211,238,0.05) 25%, rgba(34,211,238,0.05) 26%, transparent 27%, transparent 74%, rgba(34,211,238,0.05) 75%, rgba(34,211,238,0.05) 76%, transparent 77%, transparent)',
        backgroundSize: '50px 50px',
      }}
    >
      {children}
    </motion.div>
  );
}

export const SciFiGrid = memo(SciFiGridComponent);
