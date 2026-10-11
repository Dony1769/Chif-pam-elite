/**
 * FC CAREER — Calcul des attributs & système de potentiel
 */

import { ATTRIBUTES_BY_GROUP } from "../constants/attributes";
import type { PositionFamily, PlayingStyleId } from "../constants/positions";
import { getStyle } from "../constants/positions";
import type { AttributeMap } from "../types/player";
import { proximityFactor } from "../constants/scaling";

/** Pondération des familles pour l'overall selon le poste. */
const FAMILY_WEIGHTS: Record<PositionFamily, Partial<Record<string, number>>> = {
  gk: { goalkeeping: 0.55, mental: 0.2, physical: 0.15, technical: 0.1 },
  def: { defensive: 0.4, physical: 0.25, mental: 0.2, technical: 0.15 },
  mid: { technical: 0.3, mental: 0.3, physical: 0.2, offensive: 0.1, defensive: 0.1 },
  att: { offensive: 0.3, technical: 0.3, physical: 0.2, mental: 0.2 },
};

function groupAverage(attributes: AttributeMap, group: string): number {
  const defs = ATTRIBUTES_BY_GROUP[group as keyof typeof ATTRIBUTES_BY_GROUP];
  if (!defs || defs.length === 0) return 0;
  const sum = defs.reduce((acc, d) => acc + (attributes[d.id] ?? 0), 0);
  return sum / defs.length;
}

/** Overall pondéré par le poste (arrondi à l'entier). */
export function computeOverall(attributes: AttributeMap, family: PositionFamily): number {
  const weights = FAMILY_WEIGHTS[family];
  let total = 0;
  let weightSum = 0;
  for (const [group, w] of Object.entries(weights)) {
    total += groupAverage(attributes, group) * (w ?? 0);
    weightSum += w ?? 0;
  }
  return Math.round(weightSum > 0 ? total / weightSum : 0);
}

/** Potentiel dynamique initial (avant 23 ans surtout). */
export function computePotential(
  overall: number,
  age: number,
  style: PlayingStyleId,
  rng: () => number,
): number {
  const styleBonus = Object.values(getStyle(style).modifiers).reduce((a, b) => a + (b ?? 0), 0);
  let headroom: number;
  if (age <= 18) headroom = 20 + rng() * 18; // 20-38
  else if (age <= 21) headroom = 12 + rng() * 14;
  else if (age <= 24) headroom = 6 + rng() * 9;
  else if (age <= 28) headroom = 2 + rng() * 5;
  else headroom = rng() * 2;

  const pot = overall + headroom + styleBonus * 0.4;
  return Math.min(99, Math.max(overall, Math.round(pot)));
}

/** Plafond actuel d'un attribut = valeur + marge résiduelle de potentiel. */
export function attributeCap(attributeValue: number, overall: number, potential: number): number {
  const remaining = Math.max(0, potential - overall);
  return Math.min(99, attributeValue + Math.ceil(remaining * 0.6));
}

/**
 * Tente une amélioration d'attribut à l'entraînement.
 * Retourne la nouvelle valeur (identique si échec).
 */
export function tryImproveAttribute(
  attributes: AttributeMap,
  id: string,
  overall: number,
  potential: number,
  gainMultiplier: number,
  rng: () => number,
): { value: number; improved: boolean } {
  const current = attributes[id] ?? 50;
  const cap = attributeCap(current, overall, potential);
  const p = proximityFactor(current, cap) * gainMultiplier;
  if (rng() < p && current < cap) {
    return { value: current + 1, improved: true };
  }
  return { value: current, improved: false };
}

/** Applique un patch d'attributs en préservant l'immuabilité de l'AttributeMap. */
export function withAttributes(
  attributes: AttributeMap,
  patch: Record<string, number>,
): AttributeMap {
  const out: AttributeMap = { ...attributes };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = value;
  }
  return out;
}
