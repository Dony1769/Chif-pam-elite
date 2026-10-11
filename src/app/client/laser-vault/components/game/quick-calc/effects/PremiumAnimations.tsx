'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface AnimationVariantsProps {
  children: React.ReactNode;
  type: 'zoom' | 'flash' | 'shake' | 'ripple' | 'pulse' | 'bounce';
  trigger?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const variants: Record<string, any> = {
  zoom: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
  flash: {
    initial: {},
    animate: {
      opacity: [0.3, 1, 0.3],
      boxShadow: [
        '0 0 0px rgba(34,211,238,0.0)',
        '0 0 40px rgba(34,211,238,0.8)',
        '0 0 0px rgba(34,211,238,0.0)',
      ],
    },
  },
  shake: {
    initial: {},
    animate: { x: [0, -4, 4, -4, 0] },
  },
  ripple: {
    initial: {},
    animate: {
      boxShadow: [
        '0 0 0px rgba(34,211,238,0.4)',
        '0 0 20px rgba(34,211,238,0.2)',
        '0 0 40px rgba(34,211,238,0.0)',
      ],
    },
  },
  pulse: {
    initial: {},
    animate: {
      scale: [1, 1.05, 1],
    },
  },
  bounce: {
    initial: {},
    animate: {
      y: [0, -8, 0],
    },
  },
};

function AnimationVariantsComponent({ children, type, trigger }: AnimationVariantsProps) {
  const variant = variants[type];

  return (
    <motion.div
      initial={variant.initial || {}}
      animate={trigger ? variant.animate : {}}
      exit={variant.exit || {}}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

export const AnimationVariants = memo(AnimationVariantsComponent);

interface CyberPunkEffectProps {
  children: React.ReactNode;
  active?: boolean;
}

function CyberPunkEffectComponent({ children, active = false }: CyberPunkEffectProps) {
  return (
    <motion.div
      animate={active ? { textShadow: ['0 0 10px rgba(34,211,238,0.5)', '0 0 20px rgba(34,211,238,0.8)'] } : {}}
      transition={{ duration: 0.4, repeat: Infinity }}
      className={active ? 'font-black tracking-wider' : ''}
    >
      {children}
    </motion.div>
  );
}

export const CyberPunkEffect = memo(CyberPunkEffectComponent);
