/**
 * FC CAREER — Triggers d'animation (compte à rebours, valeurs animées, séquences).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animateValue, numericEasings, stagger } from "../utils/animations";

export interface AnimationTriggers {
  /** Valeur interpolée de `from` vers `to` (pour AnimatedStat). */
  animatedNumber: (from: number, to: number, durationMs?: number) => number;
  /** Déclenche une animation : repasse par `false` puis `true` après un tick. */
  fire: () => boolean;
  /** Prochaine valeur de délai en cascade pour une liste (stagger design). */
  nextStaggerDelay: (index: number) => number;
  /** Progression 0→1 sur `durationMs`, relançable via `restart`. */
  progress: (durationMs: number) => { value: number; restart: () => void };
}

export function useAnimation(): AnimationTriggers {
  const [value, setValue] = useState(0);
  const [fired, setFired] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const targetRef = useRef({ from: 0, to: 0 });

  // Animation ciblée (ex: nombre qui monte quand la stat change).
  const animatedNumber = useCallback((from: number, to: number, durationMs = 600) => {
    targetRef.current = { from, to };
    if (cancelRef.current) cancelRef.current();
    cancelRef.current = animateValue(from, to, durationMs, numericEasings.easeOut, setValue);
    return value;
  }, [value]);

  const fire = useCallback(() => {
    setFired(false);
    // Repasse à true au frame suivant => relance les transitions CSS/motion.
    requestAnimationFrame(() => setFired(true));
    return fired;
  }, [fired]);

  const nextStaggerDelay = useCallback((index: number) => stagger(index), []);

  // Progression 0→1 (SessionAnimation, barres de chargement).
  const [progressPct, setProgressPct] = useState(0);
  const progressRunRef = useRef(0);
  const lastDurationRef = useRef(900);

  const startProgress = useCallback((durationMs: number) => {
    lastDurationRef.current = durationMs;
    if (progressRunRef.current) cancelAnimationFrame(progressRunRef.current);
    const begin = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - begin) / Math.max(1, durationMs));
      setProgressPct(numericEasings.easeOutCubic(t));
      if (t < 1) progressRunRef.current = requestAnimationFrame(step);
      else progressRunRef.current = 0;
    };
    progressRunRef.current = requestAnimationFrame(step);
  }, []);

  const restartProgress = useCallback(() => startProgress(lastDurationRef.current), [startProgress]);

  useEffect(() => () => cancelRef.current?.(), []);
  useEffect(
    () => () => {
      if (progressRunRef.current) cancelAnimationFrame(progressRunRef.current);
    },
    [],
  );

  return {
    animatedNumber: (from, to, durationMs) => animatedNumber(from, to, durationMs),
    fire,
    nextStaggerDelay,
    progress: (durationMs: number) => {
      startProgress(durationMs);
      return { value: progressPct, restart: restartProgress };
    },
  };
}
