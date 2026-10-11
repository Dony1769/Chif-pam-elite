/**
 * FC CAREER — Animations : timing functions & delays pour le motion design
 */

export type EasingName = "easeOut" | "easeInOut" | "spring" | "pop" | "linear";

export const EASINGS: Record<EasingName, string> = {
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  pop: "cubic-bezier(0.22, 1.2, 0.36, 1)",
  linear: "linear",
};

export const DURATIONS = {
  micro: 120,
  fast: 220,
  base: 320,
  slow: 520,
  dramatic: 900,
  matchMinute: 60, // ms simulées par minute de match en live
} as const;

/** Délai en cascade pour une liste (index i sur n éléments). */
export function stagger(i: number, perItemMs = 40, maxMs = 480): number {
  return Math.min(i * perItemMs, maxMs);
}

/** Compte à rebours animé : appelle onTick à chaque frame jusqu'à durationMs. */
export function animateValue(
  from: number,
  to: number,
  durationMs: number,
  easing: (t: number) => number,
  onTick: (v: number) => void,
  onDone?: () => void,
): () => void {
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    onTick(from + (to - from) * easing(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf); // fonction d'annulation
}

// Easings numériques (pour animateValue / canvas)
export const numericEasings = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  linear: (t: number) => t,
};

/** Respecte prefers-reduced-motion côté JS. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Promise de délai utilitaire (scénarios de match en live). */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
