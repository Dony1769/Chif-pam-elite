/**
 * FC CAREER — SharedUI : nombre animé (count-up ease-out).
 * Utilisé par PlayerCard, StatsPanel, PostMatchScreen…
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { animateValue, numericEasings, prefersReducedMotion } from "../../utils/animations";

interface AnimatedStatProps {
  /** Valeur cible affichée. */
  value: number;
  /** Valeur de départ (défaut : 0). */
  from?: number;
  /** Durée de l'animation en ms (défaut : 600). */
  durationMs?: number;
  /** Décimales affichées (défaut : 0). */
  decimals?: number;
  /** Préfixe / suffixe (ex : "€", "%"). */
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Déclenche un rejeu quand cette valeur change. */
  trigger?: unknown;
}

export default function AnimatedStat({
  value,
  from = 0,
  durationMs = 600,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  trigger,
}: AnimatedStatProps) {
  const [display, setDisplay] = useState(from);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    cancelRef.current?.();
    cancelRef.current = animateValue(
      from,
      value,
      durationMs,
      numericEasings.easeOutCubic,
      (v) => setDisplay(v),
    );
    return () => cancelRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, trigger]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
