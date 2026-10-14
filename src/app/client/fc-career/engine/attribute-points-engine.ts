/**
 * FC CAREER — Attribute Points Engine (Phase B)
 *
 * Règles d'attribution de PA :
 * - Match joué  : +1 PA (note ≥ 6), +2 PA (note ≥ 7.5), +3 PA (note ≥ 9)
 * - Entraînement : +1 PA par session intense/complète
 * - Objectifs de saison atteints : +2 PA par objectif
 *
 * Investissement :
 * - 1 PA → +1 dans un attribut (max = potential/1.05, arrondi)
 * - 2 PA → +1 dans un attribut de catégorie hors-poste
 * - Recalcule overall après chaque dépense
 */

import type { Player } from "../types/player";
import { computeOverall } from "./attribute-calculator";
import { getPosition } from "../constants/positions";

export type AttributeInvestResult =
  | { ok: true; player: Player }
  | { ok: false; reason: "no-pa" | "max-reached" | "unknown-attr" };

/** Points de PA gagnés après un match selon la note. */
export function paFromMatch(rating: number): number {
  if (rating >= 9)   return 3;
  if (rating >= 7.5) return 2;
  if (rating >= 6)   return 1;
  return 0;
}

/** Points de PA gagnés après une session d'entraînement. */
export function paFromTraining(intensity: "light" | "normal" | "intense"): number {
  if (intensity === "intense") return 1;
  if (intensity === "normal")  return 1;
  return 0;
}

/** Ajoute des PA au joueur (match, entraînement, objectif…). */
export function awardPA(player: Player, amount: number): Player {
  if (amount <= 0) return player;
  return {
    ...player,
    attributePoints:      (player.attributePoints      ?? 0) + amount,
    attributePointsTotal: (player.attributePointsTotal ?? 0) + amount,
  };
}

/**
 * Investit 1 PA dans un attribut donné.
 * Coût = 1 PA (2 PA si l'attribut est hors-profil du poste).
 * Le gain est de +1, plafonné à (potential * 1.05) arrondi à l'entier.
 */
export function investPA(
  player: Player,
  attributeKey: string,
  cost: 1 | 2 = 1,
): AttributeInvestResult {
  const current = player.attributes[attributeKey];
  if (current === undefined) return { ok: false, reason: "unknown-attr" };

  const pa = player.attributePoints ?? 0;
  if (pa < cost) return { ok: false, reason: "no-pa" };

  const cap = Math.round(player.potential * 1.05);
  if (current >= cap) return { ok: false, reason: "max-reached" };

  const newAttributes = { ...player.attributes, [attributeKey]: current + 1 };

  const updated: Player = {
    ...player,
    attributes:           newAttributes,
    attributePoints:      pa - cost,
    attributePointsSpent: (player.attributePointsSpent ?? 0) + cost,
  };

  // Recalcule l'overall
  const family = getPosition(updated.position).family;
  const newOverall = computeOverall(newAttributes, family);
  return { ok: true, player: { ...updated, overall: newOverall } };
}

/** Retourne les PA disponibles avec un fallback sûr (migrer les anciennes sauvegardes). */
export function getPA(player: Player): number {
  return player.attributePoints ?? 0;
}
