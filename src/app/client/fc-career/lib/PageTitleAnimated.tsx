"use client";

/**
 * FC CAREER — Phase F : PageTitleAnimated
 * Version animée du composant PageTitle avec entrée en fondu + slide.
 * Drop-in replacement : mêmes props que PageTitle.
 */

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease: [number, number, number, number] = [0.4, 0, 0.2, 1];

interface PageTitleAnimatedProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function PageTitleAnimated({ eyebrow, title, subtitle, action }: PageTitleAnimatedProps) {
  return (
    <motion.div
      className="page-title"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <div>
        <motion.div
          className="eyebrow"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease, delay: 0.05 }}
        >
          <span />{eyebrow}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease, delay: 0.1 }}
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease, delay: 0.18 }}
        >
          {subtitle}
        </motion.p>
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease, delay: 0.22 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
