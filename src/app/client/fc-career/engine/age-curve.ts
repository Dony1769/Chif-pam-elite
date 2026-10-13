/**
 * FC CAREER — Étape 4.5 : Courbe d'Âge
 * Gère le multiplicateur de progression et le déclin physique.
 */

import type { AttributeMap } from "../types/player";
import { ATTRIBUTES_BY_GROUP } from "../constants/attributes";

/**
 * Multiplicateur de gains d'entraînement selon l'âge.
 * @param hasLongevity Si le joueur a le trait "Longévité" (décale de +2 ans).
 */
export function ageGainMultiplier(age: number, hasLongevity = false): number {
  const effectiveAge = hasLongevity ? age - 2 : age;
  if (effectiveAge <= 17) return 1.5;
  if (effectiveAge <= 21) return 1.3;
  if (effectiveAge <= 24) return 1.0;
  if (effectiveAge <= 28) return 0.7;
  if (effectiveAge <= 31) return 0.3;
  if (effectiveAge <= 34) return 0.1;
  return 0.05;
}

export interface AgingDecline {
  /** Nombre de points perdus dans chaque attribut physique. */
  physicalDecline: number;
  /** Nombre de points perdus dans chaque attribut technique (35+). */
  technicalDecline: number;
  /** Le mental reste stable même en déclin. */
  mentalStable: boolean;
}

/**
 * Calcule le déclin saisonnier à appliquer en fin de saison.
 * @param hasLongevity Si le joueur a le trait "Longévité" (décale de +2 ans).
 */
export function seasonalDecline(age: number, hasLongevity = false): AgingDecline {
  const effectiveAge = hasLongevity ? age - 2 : age;

  if (effectiveAge <= 28) {
    return { physicalDecline: 0, technicalDecline: 0, mentalStable: true };
  }
  if (effectiveAge <= 31) {
    return { physicalDecline: 1, technicalDecline: 0, mentalStable: true };
  }
  if (effectiveAge <= 34) {
    return { physicalDecline: 2, technicalDecline: 0, mentalStable: true };
  }
  // 35+
  return { physicalDecline: 3, technicalDecline: 1, mentalStable: true };
}

/**
 * Applique le déclin de fin de saison aux attributs.
 * Le mental reste stable. Le physique et la technique (35+) diminuent.
 */
export function applySeasonalDecline(
  attributes: AttributeMap,
  decline: AgingDecline,
): AttributeMap {
  const out = { ...attributes };

  if (decline.physicalDecline > 0) {
    for (const attr of ATTRIBUTES_BY_GROUP.physical) {
      out[attr.id] = Math.max(1, (out[attr.id] ?? 0) - decline.physicalDecline);
    }
  }

  if (decline.technicalDecline > 0) {
    for (const attr of ATTRIBUTES_BY_GROUP.technical) {
      out[attr.id] = Math.max(1, (out[attr.id] ?? 0) - decline.technicalDecline);
    }
  }

  return out;
}
