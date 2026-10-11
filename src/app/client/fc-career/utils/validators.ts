/**
 * FC CAREER — Validateurs de données (onboarding & sauvegardes)
 */

import type { Player } from "../types/player";
import type { GameSave } from "../types/game";
import { ATTRIBUTE_IDS } from "../constants/attributes";
import { POSITIONS } from "../constants/positions";
import { PLAYING_STYLES } from "../constants/positions";

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>; // champ -> message FR
}

export function validateIdentity(input: {
  firstName: string;
  lastName: string;
  age: number;
  heightCm: number;
  weightKg: number;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!input.firstName.trim()) errors.firstName = "Prénom requis.";
  if (input.firstName.trim().length > 24) errors.firstName = "24 caractères max.";
  if (!input.lastName.trim()) errors.lastName = "Nom requis.";
  if (input.age < 16 || input.age > 35) errors.age = "L'âge doit être entre 16 et 35 ans.";
  if (input.heightCm < 155 || input.heightCm > 205) errors.heightCm = "Taille entre 155 et 205 cm.";
  if (input.weightKg < 48 || input.weightKg > 105) errors.weightKg = "Poids entre 48 et 105 kg.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePin(pin: string): ValidationResult {
  const errors: Record<string, string> = {};
  if (!/^\d{4}$/.test(pin)) errors.pin = "Le code doit contenir exactement 4 chiffres.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateGenerationInput(input: {
  position: string;
  style: string;
  morphology: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!POSITIONS.some((p) => p.id === input.position)) errors.position = "Poste invalide.";
  if (!PLAYING_STYLES.some((s) => s.id === input.style)) errors.style = "Style invalide.";
  if (!["fin", "normal", "costaud", "grand", "petit"].includes(input.morphology)) {
    errors.morphology = "Morphologie invalide.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Intégrité d'un objet Player chargé depuis localStorage. */
export function isPlayerValid(player: unknown): player is Player {
  const p = player as Player;
  if (!p || typeof p !== "object") return false;
  if (typeof p.overall !== "number" || p.overall < 1 || p.overall > 99) return false;
  if (typeof p.potential !== "number" || p.potential < p.overall - 5) return false;
  if (!p.attributes || typeof p.attributes !== "object") return false;
  const missing = ATTRIBUTE_IDS.filter((id) => typeof p.attributes[id] !== "number");
  return missing.length === 0;
}

export function isGameSaveValid(save: unknown): save is GameSave {
  const s = save as GameSave;
  return Boolean(
    s &&
      typeof s.version === "number" &&
      typeof s.clubId === "string" &&
      typeof s.phase === "string" &&
      typeof s.createdAt === "string",
  );
}
