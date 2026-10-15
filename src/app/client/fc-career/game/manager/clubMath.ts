/**
 * FC CAREER 27 — Mode Manager : formules du club (Lot M3).
 * Aucune dépendance au moteur : utilisables partout sans import circulaire.
 */

import type { ClubInfra, StaffRole } from "./types";

export const MAX_CAPACITY = 60_000;
export const EXPANSION_SEATS = 2_500;
export const MAX_FACILITY_LEVEL = 5;

/** Capacité initiale selon la réputation (club de 80 de réputation ≈ 11 000 places). */
export function initialCapacity(reputation: number): number {
  return Math.round((1_500 + reputation * 120) / 100) * 100;
}

/**
 * Prix de référence du billet : celui qui reproduit la recette calibrée du
 * Lot M1 (≈ 1,25 × masse salariale par match à domicile à guichets pleins).
 */
export function referencePrice(wagesBudget: number, capacity: number): number {
  return Math.max(5, Math.round((wagesBudget * 1.25) / capacity));
}

export interface AttendanceInput {
  capacity: number;
  price: number;
  refPrice: number;
  reputation: number;
  /** Position au classement et nombre de clubs */
  position: number;
  leagueSize: number;
  /** Dernier match gagné */
  lastWon: boolean | null;
}

/**
 * Affluence : la demande dépend de la réputation et des résultats ;
 * un billet plus cher fait baisser la demande (élasticité 1,1).
 * Le prix optimal est donc au-dessus du prix de référence quand le stade
 * est trop petit pour la demande, en dessous quand il sonne creux.
 */
export function attendance(i: AttendanceInput): { spectators: number; fill: number; revenue: number } {
  const topHalf = i.position <= Math.ceil(i.leagueSize / 2);
  const demandShare = 0.55 + i.reputation / 160 + (topHalf ? 0.06 : -0.04) + (i.lastWon ? 0.04 : 0);
  const priceEffect = Math.pow(i.refPrice / Math.max(1, i.price), 1.1);
  const fill = Math.max(0.12, Math.min(1, demandShare * priceEffect));
  const spectators = Math.round(i.capacity * fill);
  return { spectators, fill, revenue: spectators * i.price };
}

/** Coût et durée d'un agrandissement du stade. */
export function expansionCost(wagesBudget: number): { cost: number; weeks: number } {
  return { cost: Math.round((EXPANSION_SEATS * wagesBudget * 0.0032) / 10_000) * 10_000, weeks: 8 };
}

/** Coût et durée pour passer une installation au niveau suivant. */
export function facilityUpgradeCost(wagesBudget: number, currentLevel: number): { cost: number; weeks: number } {
  const next = currentLevel + 1;
  return { cost: Math.round((wagesBudget * 3.5 * Math.pow(next, 1.5)) / 10_000) * 10_000, weeks: 4 + next };
}

/** Entretien hebdomadaire des installations (≈ 8 % de la masse salariale au niveau de départ). */
export function facilitiesUpkeep(infra: ClubInfra, wagesBudget: number): number {
  const levels = infra.facilities.training + infra.facilities.academy + infra.facilities.medical;
  const seats = infra.stadium.capacity / 10_000;
  return Math.round(wagesBudget * (0.009 * levels + 0.006 * seats));
}

export function staffWage(wagesBudget: number, quality: number): number {
  return Math.round((wagesBudget * 0.012 * Math.pow(quality, 1.4)) / 50) * 50;
}

export function staffBill(infra: ClubInfra): number {
  return infra.staff.reduce((a, m) => a + m.wage, 0);
}

export function staffQuality(infra: ClubInfra | undefined, role: StaffRole): number {
  return infra?.staff.find(m => m.role === role)?.quality ?? 0;
}

// ─── Effets sportifs ─────────────────────────────────────────────────────────

/** Récupération de fatigue supplémentaire par semaine (préparateur physique + centre médical). */
export function extraRecovery(infra: ClubInfra | undefined): number {
  if (!infra) return 0;
  return staffQuality(infra, "fitness") * 2 + infra.facilities.medical;
}

/** Probabilité hebdomadaire qu'une blessure guérisse une semaine plus tôt (kiné + médical). */
export function fasterHealChance(infra: ClubInfra | undefined): number {
  if (!infra) return 0;
  return Math.min(0.6, staffQuality(infra, "physio") * 0.07 + infra.facilities.medical * 0.05);
}

/**
 * Chance hebdomadaire de +1 OVR pour un joueur sous son potentiel,
 * selon le centre d'entraînement, l'entraîneur adjoint et l'âge.
 */
export function trainingGainChance(infra: ClubInfra | undefined, age: number, played: boolean): number {
  if (!infra) return 0;
  const base = 0.012 + infra.facilities.training * 0.009 + staffQuality(infra, "coach") * 0.006;
  const ageF = age <= 21 ? 1.6 : age <= 24 ? 1.15 : age <= 28 ? 0.55 : 0.15;
  return base * ageF * (played ? 1.25 : 1);
}

/** Bonus de potentiel des jeunes issus du centre (académie + formateur). */
export function youthPotentialBonus(infra: ClubInfra | undefined, fallbackAcademyLevel: number): number {
  const academy = infra?.facilities.academy ?? fallbackAcademyLevel;
  return academy * 4 + staffQuality(infra, "youth") * 2 - 4;
}

/** Nombre de jeunes par génération. */
export function youthIntakeSize(infra: ClubInfra | undefined, fallbackAcademyLevel: number): number {
  return 1 + (infra?.facilities.academy ?? fallbackAcademyLevel);
}

/** Réduction du coût d'une mission de scouting (chef scout). */
export function scoutCostFactor(infra: ClubInfra | undefined): number {
  return 1 - staffQuality(infra, "scout") * 0.1;
}

export const FACILITY_LABEL: Record<"training" | "academy" | "medical", string> = {
  training: "Centre d'entraînement",
  academy: "Centre de formation",
  medical: "Centre médical",
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  coach: "Entraîneur adjoint",
  fitness: "Préparateur physique",
  physio: "Kinésithérapeute",
  youth: "Formateur des jeunes",
  scout: "Chef scout",
};
