/**
 * FC CAREER — Validateurs de données
 * Fonctions pures testables sans navigateur.
 */

import type { Player, PlayerAttributes } from "../domain/player";
import type { GameSaveV1 } from "../persistence/saveSchema";

/** Vérifie qu'un attribut est dans la plage valide [1, 99] */
export function isValidAttribute(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && value >= 1 && value <= 99;
}

/** Vérifie que tous les attributs d'un joueur sont valides */
export function validateAttributes(attrs: PlayerAttributes): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (!isValidAttribute(value)) {
      errors.push(`Attribut invalide : ${key} = ${value}`);
    }
  }
  return errors;
}

/** Vérifie qu'un joueur a les champs obligatoires */
export function validatePlayer(player: unknown): string[] {
  const errors: string[] = [];
  if (!player || typeof player !== "object") return ["player est null ou non-objet"];
  const p = player as Partial<Player>;
  if (!p.id) errors.push("id manquant");
  if (!p.firstName) errors.push("firstName manquant");
  if (!p.lastName) errors.push("lastName manquant");
  if (!p.position) errors.push("position manquante");
  if (!p.attributes) errors.push("attributes manquant");
  if (typeof p.overall !== "number") errors.push("overall invalide");
  if (typeof p.potential !== "number") errors.push("potential invalide");
  if (!p.contract) errors.push("contract manquant");
  return errors;
}

/** Vérifie qu'une note de match est valide */
export function isValidRating(rating: unknown): rating is number {
  return typeof rating === "number" && rating >= 1.0 && rating <= 10.0;
}

/** Vérifie qu'un score est valide */
export function isValidScore(home: unknown, away: unknown): boolean {
  return (
    typeof home === "number" && home >= 0 && Number.isInteger(home) &&
    typeof away === "number" && away >= 0 && Number.isInteger(away)
  );
}

/** Clamp d'une valeur dans un intervalle */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Vérifie une sauvegarde entière */
export function validateSave(save: unknown): string[] {
  const errors: string[] = [];
  if (!save || typeof save !== "object") return ["sauvegarde null ou non-objet"];
  const s = save as Partial<GameSaveV1>;
  if (s.version !== 1) errors.push(`version invalide : ${s.version}`);
  if (!s.meta?.careerId) errors.push("meta.careerId manquant");
  if (!s.player) errors.push("player manquant");
  else errors.push(...validatePlayer(s.player).map(e => `player.${e}`));
  if (!s.career?.id) errors.push("career.id manquant");
  if (!s.wallet) errors.push("wallet manquant");
  if (!s.world) errors.push("world manquant");
  return errors;
}
