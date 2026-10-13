/**
 * FC CAREER — Blessures
 * (Split from wellness.ts — Étape 11.3)
 */

export type InjuryType =
  | "contusion"
  | "elongation"
  | "sprain"
  | "tear"
  | "fracture"
  | "acl"
  | "chronic";

export interface InjuryDef {
  type: InjuryType;
  label: string;
  emoji: string;
  /** Durée en jours [min, max] */
  durationDays: [number, number];
  /** Fréquence pondérée (en %) */
  frequency: number;
  /** Considérée grave si durée > 30 jours */
  severe: boolean;
}

export const INJURIES: InjuryDef[] = [
  { type: "contusion", label: "Contusion", emoji: "🟡", durationDays: [1, 3], frequency: 35, severe: false },
  { type: "elongation", label: "Élongation", emoji: "🟠", durationDays: [7, 14], frequency: 25, severe: false },
  { type: "sprain", label: "Entorse", emoji: "🔴", durationDays: [14, 28], frequency: 15, severe: false },
  { type: "tear", label: "Déchirure musculaire", emoji: "🔴", durationDays: [28, 56], frequency: 10, severe: true },
  { type: "fracture", label: "Fracture", emoji: "⛔", durationDays: [60, 120], frequency: 8, severe: true },
  { type: "acl", label: "Ligaments croisés", emoji: "💀", durationDays: [180, 270], frequency: 5, severe: true },
  { type: "chronic", label: "Blessure chronique", emoji: "♻️", durationDays: [7, 21], frequency: 2, severe: false },
];

export interface ActiveInjury {
  type: InjuryType;
  daysLeft: number;
  totalDays: number;
  occurredOnDay: number;
}
