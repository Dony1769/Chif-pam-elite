/**
 * FC CAREER — Brands constants
 *
 * Les définitions de marques vivent dans types/lifestyle.ts (avec les BrandDef, SHOE_BRANDS, LIFESTYLE_BRANDS).
 * Ce fichier exporte les raccourcis utiles + les missions sponsor.
 */

export { ALL_BRANDS, SHOE_BRANDS, LIFESTYLE_BRANDS } from "../types/lifestyle";
export type { BrandDef, BrandId, BrandCategory, BrandRequirement, EndorsementLevel, Endorsement } from "../types/lifestyle";

/* ------------------------------------------------------------------ */
/* Missions Sponsor                                                     */
/* ------------------------------------------------------------------ */

import type { BrandId } from "../types/lifestyle";

export type MissionConditionType =
  | "goals"         // marquer N buts en N matchs
  | "rating"        // noter ≥ X sur N matchs consécutifs
  | "assists"       // N passes décisives en N matchs
  | "match-played"  // jouer N matchs
  | "motm"          // N fois homme du match
  | "no-card";      // N matchs sans carton

export interface SponsorMission {
  id: string;
  brandId: BrandId;
  label: string;
  description: string;
  condition: {
    type: MissionConditionType;
    target: number;  // valeur cible
    window: number;  // fenêtre en matchs (0 = saison entière)
  };
  reward: {
    bonus: number;      // €€ en bonus direct
    paBonus: number;    // PA bonus
    levelUp: boolean;   // passe à l'échelon supérieur du contrat
  };
  emoji: string;
}

export const SPONSOR_MISSIONS: SponsorMission[] = [
  {
    id: "velox-speed-demon",
    brandId: "velox",
    label: "Speed Demon",
    description: "Inscrivez 5 buts lors de vos 10 prochains matchs.",
    condition: { type: "goals", target: 5, window: 10 },
    reward: { bonus: 50_000, paBonus: 2, levelUp: false },
    emoji: "⚡",
  },
  {
    id: "velox-consistency",
    brandId: "velox",
    label: "Consistance VELOX",
    description: "Obtenez une note ≥ 7.5 lors de 5 matchs consécutifs.",
    condition: { type: "rating", target: 7.5, window: 5 },
    reward: { bonus: 80_000, paBonus: 3, levelUp: true },
    emoji: "🏃",
  },
  {
    id: "phantom-vision",
    brandId: "phantom",
    label: "Vision Fantôme",
    description: "Délivrez 4 passes décisives en 8 matchs.",
    condition: { type: "assists", target: 4, window: 8 },
    reward: { bonus: 60_000, paBonus: 2, levelUp: false },
    emoji: "👻",
  },
  {
    id: "phantom-maestro",
    brandId: "phantom",
    label: "Maestro",
    description: "Soyez élu homme du match 3 fois en 6 matchs.",
    condition: { type: "motm", target: 3, window: 6 },
    reward: { bonus: 120_000, paBonus: 4, levelUp: true },
    emoji: "🎩",
  },
  {
    id: "ironwall-soldier",
    brandId: "ironwall",
    label: "Soldat IRONWALL",
    description: "Disputez 20 matchs sans carton rouge cette saison.",
    condition: { type: "no-card", target: 20, window: 0 },
    reward: { bonus: 40_000, paBonus: 1, levelUp: false },
    emoji: "🛡️",
  },
  {
    id: "strike-force-sniper",
    brandId: "strike-force",
    label: "Sniper",
    description: "Inscrivez 10 buts lors de cette saison.",
    condition: { type: "goals", target: 10, window: 0 },
    reward: { bonus: 75_000, paBonus: 3, levelUp: false },
    emoji: "🎯",
  },
  {
    id: "strike-force-legend",
    brandId: "strike-force",
    label: "Légende Strike Force",
    description: "Inscrivez 20 buts lors de cette saison.",
    condition: { type: "goals", target: 20, window: 0 },
    reward: { bonus: 200_000, paBonus: 5, levelUp: true },
    emoji: "🔥",
  },
  {
    id: "classic-starter",
    brandId: "classic",
    label: "Classique Débutant",
    description: "Jouez 15 matchs consécutifs.",
    condition: { type: "match-played", target: 15, window: 0 },
    reward: { bonus: 15_000, paBonus: 1, levelUp: false },
    emoji: "👟",
  },
  {
    id: "kronos-ambassador",
    brandId: "kronos",
    label: "Ambassadeur KRONOS",
    description: "Obtenez une note ≥ 7 sur 8 matchs consécutifs.",
    condition: { type: "rating", target: 7, window: 8 },
    reward: { bonus: 100_000, paBonus: 3, levelUp: true },
    emoji: "⌚",
  },
  {
    id: "boost-energy-performer",
    brandId: "boost-energy",
    label: "Performer BOOST",
    description: "Soyez homme du match 2 fois lors de vos 5 prochains matchs.",
    condition: { type: "motm", target: 2, window: 5 },
    reward: { bonus: 30_000, paBonus: 1, levelUp: false },
    emoji: "⚡",
  },
  {
    id: "nexus-gaming-star",
    brandId: "nexus-gaming",
    label: "Gaming Star",
    description: "Jouez 10 matchs sans carton.",
    condition: { type: "no-card", target: 10, window: 0 },
    reward: { bonus: 25_000, paBonus: 1, levelUp: false },
    emoji: "🎮",
  },
  {
    id: "eleganza-icon",
    brandId: "eleganza",
    label: "Icône ELEGANZA",
    description: "Maintenez une note moyenne ≥ 7.2 sur 10 matchs.",
    condition: { type: "rating", target: 7.2, window: 10 },
    reward: { bonus: 90_000, paBonus: 2, levelUp: true },
    emoji: "👑",
  },
  {
    id: "thunder-motors-champion",
    brandId: "thunder-motors",
    label: "Champion THUNDER",
    description: "Inscrivez 3 buts et 3 passes décisives lors de la saison.",
    condition: { type: "goals", target: 3, window: 0 },
    reward: { bonus: 45_000, paBonus: 2, levelUp: false },
    emoji: "🏎️",
  },
];

/** Renvoie les missions disponibles pour une marque donnée. */
export function getMissionsForBrand(brandId: BrandId): SponsorMission[] {
  return SPONSOR_MISSIONS.filter(m => m.brandId === brandId);
}
