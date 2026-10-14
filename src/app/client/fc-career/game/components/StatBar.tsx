"use client";

import { motion } from "framer-motion";

interface StatBarProps {
  label: string;
  value: number;      // 0–99
  max?: number;       // défaut 99
  showValue?: boolean;
}

type Fill = "default" | "warning" | "danger";

function fillVariant(value: number, max: number): Fill {
  const pct = value / max;
  if (pct < 0.35) return "danger";
  if (pct < 0.55) return "warning";
  return "default";
}

export function StatBar({ label, value, max = 99, showValue = true }: StatBarProps) {
  const pct    = Math.min(100, Math.max(0, (value / max) * 100));
  const fill   = fillVariant(value, max);

  return (
    <div className="fc-stat-bar">
      <span className="fc-stat-bar__label">{label}</span>
      <div className="fc-stat-bar__track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <motion.div
          className={`fc-stat-bar__fill${fill !== "default" ? ` fc-stat-bar__fill--${fill}` : ""}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        />
      </div>
      {showValue && <span className="fc-stat-bar__value">{value}</span>}
    </div>
  );
}
