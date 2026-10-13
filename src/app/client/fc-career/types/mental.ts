/**
 * FC CAREER — Santé mentale & Sanctions
 * (Split from wellness.ts — Étape 11.2 & 11.5)
 */

/* ------------------------------------------------------------------ */
/* 11.2 — Santé mentale                                                */
/* ------------------------------------------------------------------ */

export interface MentalState {
  /** Pression (0-100) */
  pressure: number;
  /** Peur du contact après blessure (0-100, 0 = aucune) */
  contactFear: number;
  /** Matchs joués sans re-blessure (reset contactFear) */
  matchesSinceReturn: number;
  /** Burnout actif */
  burnout: boolean;
  burnoutDaysLeft: number;
  /** Sessions psychologue cette semaine */
  psychSessionsThisWeek: number;
}

export type PressureSource =
  | "match-streak"    // enchaînement de matchs
  | "media-criticism" // critiques médias
  | "final-near"      // finale proche
  | "transfer-saga"   // saga de transfert
  | "objectives-fail" // objectifs non atteints
  | "coach-conflict"; // conflit coach

export type PressureRelief =
  | "rest"            // repos
  | "victory"         // victoire
  | "agent-support"   // soutien agent/famille
  | "psychologist";   // psychologue

/* ------------------------------------------------------------------ */
/* 11.5 — Sanctions                                                    */
/* ------------------------------------------------------------------ */

export interface SanctionState {
  /** Cartons jaunes cette saison */
  yellowsThisSeason: number;
  /** Cartons jaunes sur les 10 derniers matchs */
  yellowsLast10: number;
  /** Cartons rouges cette saison */
  redsThisSeason: number;
  /** Matchs de suspension restants */
  suspensionMatchesLeft: number;
  /** Amendes cumulées cette saison */
  totalFines: number;
}

export type OffFieldOffense = "late-training" | "coach-conflict" | "public-scandal";

export interface OffFieldSanction {
  offense: OffFieldOffense;
  label: string;
  fineMultiplier: number; // multiplicateur du salaire journalier
  suspensionMatches: number;
  pressureDelta: number;
}

export const OFF_FIELD_SANCTIONS: OffFieldSanction[] = [
  { offense: "late-training", label: "Retard à l'entraînement", fineMultiplier: 1, suspensionMatches: 0, pressureDelta: 5 },
  { offense: "coach-conflict", label: "Conflit avec le coach", fineMultiplier: 0, suspensionMatches: 2, pressureDelta: 15 },
  { offense: "public-scandal", label: "Scandale public", fineMultiplier: 7, suspensionMatches: 3, pressureDelta: 20 },
];
