"use client";

/**
 * FC CAREER — Phase F : AnimatedNumber
 * Anime la transition d'une valeur numérique (easing linéaire, 600ms).
 */

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Durée en ms (défaut : 600) */
  duration?: number;
  /** Formateur optionnel (ex: formatMoneyCompact) */
  format?: (n: number) => string;
  /** Classe CSS à appliquer au span */
  className?: string;
  style?: React.CSSProperties;
  /** Nombre de décimales (défaut : 0) */
  decimals?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedNumber({
  value,
  duration = 600,
  format,
  className,
  style,
  decimals = 0,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    // Annuler l'animation précédente
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplayed(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayed(to);
        prevRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const text = format
    ? format(displayed)
    : displayed.toFixed(decimals);

  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}
