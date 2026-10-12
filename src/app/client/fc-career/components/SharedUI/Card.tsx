/**
 * FC CAREER — SharedUI : carte avec hover + entrée animée (motion design).
 */

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Délai d'apparition en cascade (ms). */
  delayMs?: number;
  /** Rend la carte cliquable (scale au tap). */
  interactive?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = "", delayMs = 0, interactive, onClick }: CardProps) {
  const base =
    "rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-sm shadow-lg shadow-black/20";

  if (!interactive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: delayMs / 1000 }}
        className={`${base} p-4 ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: delayMs / 1000 }}
      className={`${base} block w-full p-4 text-left transition-colors hover:border-emerald-500/30 ${className}`}
    >
      {children}
    </motion.button>
  );
}
