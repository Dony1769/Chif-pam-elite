/**
 * FC CAREER 27 — Économie : valeur marchande selon le monde (fictif ou CP réel).
 */
import { cpValue } from "../data/cp/cpWorld";

export type Dataset = "fictional" | "cp" | undefined;

/** Valeur marchande (€) d'un joueur. */
export function playerValue(dataset: Dataset, overall: number, age: number, potential: number): number {
  if (dataset === "cp") return cpValue(overall, age, potential);
  const base = Math.pow(Math.max(0, overall - 50), 2.3) * 1200;
  const ageF = age <= 22 ? 1.6 : age <= 27 ? 1.2 : age <= 31 ? 0.9 : 0.5;
  const potF = potential - overall >= 8 ? 1.3 : 1;
  return Math.max(20_000, Math.round((base * ageF * potF) / 10_000) * 10_000);
}
