'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface GameResultProps {
  won: boolean;
  score: number;
  onClose: () => void;
}

function GameResultComponent({ won, score, onClose }: GameResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 text-center text-white shadow-[0_0_40px_rgba(34,211,238,0.18)]"
      >
        <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, repeat: Infinity }} className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
          Résultat
        </motion.p>
        <motion.h2
          animate={won ? { color: ['rgb(52, 211, 153)', 'rgb(34, 211, 238)', 'rgb(52, 211, 153)'] } : { color: ['rgb(244, 63, 94)', 'rgb(239, 68, 68)', 'rgb(244, 63, 94)'] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="mt-3 text-3xl font-black"
        >
          {won ? 'Victoire' : 'Défaite'}
        </motion.h2>
        <motion.p animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="mt-4 text-5xl font-black">
          {score}
        </motion.p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-6 w-full rounded-[1.2rem] bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 font-black text-white"
        >
          Continuer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export const GameResult = memo(GameResultComponent);
