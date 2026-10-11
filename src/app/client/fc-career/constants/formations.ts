/**
 * FC CAREER — Systèmes de jeu (formations)
 */

import type { PositionId } from "./positions";

export interface FormationSlot {
  positionId: PositionId;
  /** Coordonnées tactiques sur un terrain vertical (0-100, x gauche→droite, y bas→haut). */
  x: number;
  y: number;
}

export interface FormationDef {
  id: string; // "4-3-3"
  label: string;
  slots: FormationSlot[];
  styleBias: "offensive" | "balanced" | "defensive";
  description: string;
}

const slot = (positionId: PositionId, x: number, y: number): FormationSlot => ({ positionId, x, y });

export const FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    label: "4-3-3 Attackant",
    styleBias: "offensive",
    description: "Ailiers larges, pressing haut.",
    slots: [
      slot("GK", 50, 6),
      slot("RB", 84, 26), slot("RCB", 62, 20), slot("LCB", 38, 20), slot("LB", 16, 26),
      slot("CM", 64, 44), slot("CDM", 50, 36), slot("CM", 36, 44),
      slot("RW", 82, 68), slot("ST", 50, 76), slot("LW", 18, 68),
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2 Classique",
    styleBias: "balanced",
    description: "Deux blocs compacts, jeu direct.",
    slots: [
      slot("GK", 50, 6),
      slot("RB", 84, 26), slot("RCB", 62, 20), slot("LCB", 38, 20), slot("LB", 16, 26),
      slot("RW", 84, 48), slot("CM", 62, 46), slot("CM", 38, 46), slot("LW", 16, 48),
      slot("ST", 58, 74), slot("ST", 42, 74),
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2 Pistes",
    styleBias: "balanced",
    description: "Sentinelles et pistons, supériorité axiale.",
    slots: [
      slot("GK", 50, 6),
      slot("RCB", 66, 20), slot("LCB", 34, 20), slot("RCB", 50, 14),
      slot("RB", 88, 44), slot("CM", 64, 46), slot("CDM", 50, 38), slot("CM", 36, 46), slot("LB", 12, 44),
      slot("CF", 58, 72), slot("ST", 42, 74),
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1 Contrôlé",
    styleBias: "balanced",
    description: "Double pivot, n°10 libre.",
    slots: [
      slot("GK", 50, 6),
      slot("RB", 84, 26), slot("RCB", 62, 20), slot("LCB", 38, 20), slot("LB", 16, 26),
      slot("CDM", 60, 36), slot("CDM", 40, 36),
      slot("RW", 82, 58), slot("CAM", 50, 60), slot("LW", 18, 58),
      slot("ST", 50, 78),
    ],
  },
  {
    id: "5-3-2",
    label: "5-3-2 Bloc bas",
    styleBias: "defensive",
    description: "Cinq défenseurs, contres tranchants.",
    slots: [
      slot("GK", 50, 6),
      slot("RB", 86, 24), slot("RCB", 66, 18), slot("LCB", 34, 18), slot("LB", 14, 24), slot("RCB", 50, 12),
      slot("CM", 66, 42), slot("CDM", 50, 36), slot("CM", 34, 42),
      slot("CF", 58, 68), slot("ST", 42, 70),
    ],
  },
];

export function getFormation(id: string): FormationDef {
  const f = FORMATIONS.find((x) => x.id === id);
  if (!f) throw new Error(`Formation inconnue: ${id}`);
  return f;
}

export const FORMATION_IDS: string[] = FORMATIONS.map((f) => f.id);
