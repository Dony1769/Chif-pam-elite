/**
 * FC CAREER — Contexte motion design global (prefers-reduced-motion, vitesse).
 * Expose MotionContextValue (types/ui.ts) + helpers de transition standardisés.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import type { MotionContextValue } from "../types/ui";
import { UI_TRANSITIONS } from "../types/ui";
import { DURATIONS, EASINGS, stagger } from "../utils/animations";

export interface MotionApi extends MotionContextValue {
  /** Respecte `enabled` : renvoie 0 si l'utilisateur réduit les animations. */
  delay: (index: number, perItemMs?: number) => number;
  /** Durée adaptée (0 si reduced motion). */
  duration: (base: keyof typeof DURATIONS) => number;
  /** Easing CSS standard du design system. */
  easing: (name: keyof typeof EASINGS) => string;
  /** Transitions prêtes à l'emploi (page, modal, pop de stat…). */
  transitions: typeof UI_TRANSITIONS;
  /** Désactive globalement le motion design (settings). */
  setMotionEnabled: (v: boolean) => void;
  /** Vitesse globale : 0.5 = x2 rapide, 2 = slow-mo. */
  setSpeedMultiplier: (v: number) => void;
}

const DEFAULT_MOTION: MotionContextValue = {
  enabled: true,
  speedMultiplier: 1,
  staggerDelayMs: 40,
};

export function useMotion(): MotionApi {
  const [motion, setMotion] = useState<MotionContextValue>(DEFAULT_MOTION);

  // Détection prefers-reduced-motion (mise à jour live si l'utilisateur change son OS).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion((m) => ({ ...m, enabled: !mq.matches }));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return useMemo<MotionApi>(
    () => ({
      ...motion,
      delay: (index: number, perItemMs = motion.staggerDelayMs) =>
        motion.enabled ? stagger(index, perItemMs) / motion.speedMultiplier : 0,
      duration: (base) => (motion.enabled ? DURATIONS[base] / motion.speedMultiplier : 0),
      easing: (name) => EASINGS[name],
      transitions: UI_TRANSITIONS,
      setMotionEnabled: (v) => setMotion((m) => ({ ...m, enabled: v })),
      setSpeedMultiplier: (v) =>
        setMotion((m) => ({ ...m, speedMultiplier: Math.min(2, Math.max(0.5, v)) })),
    }),
    [motion],
  );
}
