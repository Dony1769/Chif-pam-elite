/**
 * FC CAREER 27 — Carrière Joueur : niveau de difficulté et intensité d'entraînement.
 */

export type Difficulty = "amateur" | "pro" | "legend";
export const DIFFICULTY: Record<Difficulty, { label: string; desc: string; xp: number; trustUp: number; trustDown: number; scout: number }> = {
  amateur: { label: "Amateur", desc: "Progression rapide, coach patient, recruteurs indulgents.", xp: 1.25, trustUp: 1.2, trustDown: 0.7, scout: 0.85 },
  pro: { label: "Pro", desc: "L'équilibre prévu : il faut mériter sa place.", xp: 1, trustUp: 1, trustDown: 1, scout: 1 },
  legend: { label: "Légende", desc: "Progression lente, coach exigeant, recruteurs intraitables.", xp: 0.75, trustUp: 0.8, trustDown: 1.35, scout: 1.2 },
};
export const diffOf = (d?: Difficulty) => DIFFICULTY[d ?? "pro"];

export type Intensity = "light" | "normal" | "intense";
export const INTENSITY: Record<Intensity, { label: string; desc: string; xp: number; fatigue: number; injury: number }> = {
  light: { label: "Légère", desc: "Moins de progrès, mais frais pour le match.", xp: 0.7, fatigue: -12, injury: 0 },
  normal: { label: "Normale", desc: "Le programme du club.", xp: 1, fatigue: 0, injury: 0.004 },
  intense: { label: "Intense", desc: "+40 % de progrès, mais fatigue et risque de blessure.", xp: 1.4, fatigue: 10, injury: 0.025 },
};
