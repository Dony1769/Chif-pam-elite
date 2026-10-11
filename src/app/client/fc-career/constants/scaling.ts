/**
 * FC CAREER — Courbes de progression & multiplicateurs
 */

/** Multiplicateur de gain par tranche d'âge (pic ~24-28 ans). */
export const AGE_GAIN_CURVE: Record<number, number> = {
  15: 1.6, 16: 1.55, 17: 1.5, 18: 1.4, 19: 1.3, 20: 1.2,
  21: 1.12, 22: 1.05, 23: 1.0, 24: 0.95, 25: 0.9, 26: 0.85,
  27: 0.8, 28: 0.72, 29: 0.6, 30: 0.5, 31: 0.4, 32: 0.3,
  33: 0.2, 34: 0.12, 35: 0.06, 36: 0.02,
};

export function ageGainMultiplier(age: number): number {
  if (age <= 15) return AGE_GAIN_CURVE[15];
  if (age >= 36) return AGE_GAIN_CURVE[36];
  return AGE_GAIN_CURVE[Math.round(age)] ?? 0.5;
}

/** Décroissance du gain quand l'attribut approche sa valeur actuelle de potentiel. */
export function proximityFactor(current: number, cap: number): number {
  const gap = Math.max(0, cap - current);
  if (gap <= 0) return 0;
  // Proche du plafond => gains très rares (loi exponentielle douce).
  return Math.min(1, gap / 20) * Math.pow(gap / 100, 0.35);
}

/** Perte physique après 30 ans (courbe de déclin). */
export function declineFactor(age: number): number {
  if (age < 30) return 0;
  return Math.pow((age - 29) / 10, 1.6); // 0 → ~1 vers 39 ans
}

/** Effet de la fatigue sur les gains d'entraînement et la note de match. */
export function fatiguePenalty(fatigue: number): number {
  const f = Math.min(100, Math.max(0, fatigue)) / 100;
  return 1 - 0.45 * f * f; // quadratique : peu pénalisant à bas niveau
}

/** Multiplicateur de valeur marchande (€) selon overall + âge + potentiel. */
export function marketValueMultiplier(overall: number, age: number, potential: number): number {
  const base = Math.pow(Math.max(0, overall - 40) / 60, 3.2) * 45_000_000;
  const youthBonus = age <= 23 ? 1 + (23 - age) * 0.12 : 1;
  const upside = potential > overall ? 1 + (potential - overall) * 0.02 : 1;
  const oldAgePenalty = age >= 31 ? Math.max(0.25, 1 - (age - 30) * 0.14) : 1;
  return Math.round(base * youthBonus * upside * oldAgePenalty);
}

/** Coût de récupération (repos, kiné) en € selon division. */
export const RECOVERY_COSTS: Record<string, number> = {
  "Ligue 1": 1200,
  "Ligue 2": 450,
  National: 120,
  Amateur: 0,
};
