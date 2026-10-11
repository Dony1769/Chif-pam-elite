/**
 * FC CAREER — Joueur
 * Attributs, morphologie, contrat, historique de carrière.
 */

import type { PositionId, PlayingStyleId } from "../constants/positions";

/** Les 51 attributs sont groupés en 6 familles (voir constants/attributes.ts). */
export type AttributeGroup =
  | "technical"
  | "physical"
  | "mental"
  | "goalkeeping"
  | "defensive"
  | "offensive";

/** Map attribut -> valeur (0-100). Clé = id d'attribut (ex: "dribble", "vision"). */
export type AttributeMap = Record<string, number>;

export type Morphology = "fin" | "normal" | "costaud" | "grand" | "petit";

export interface Contract {
  clubId: string;
  salaryPerWeek: number; // € brut / semaine
  bonusPerMatch: number; // € par match joué
  bonusPerGoal: number; // € par but
  signingBonus: number;
  yearsRemaining: number;
  isProfessional: boolean;
  releaseClause: number; // clause libératoire, 0 si aucune
}

export interface SeasonStatLine {
  seasonYear: number;
  clubId: string;
  competitionId: string;
  matches: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
  overallAtSeasonEnd: number;
}

/** Snapshot d'évolution (pour GrowthChart). */
export interface ProgressionPoint {
  dayNumber: number;
  overall: number;
  potential: number;
  fatigue: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO
  age: number;
  nationality: string; // code ISO 3166-1 alpha-2 ("FR")
  foot: "left" | "right" | "both";
  position: PositionId;
  secondaryPositions: PositionId[];
  style: PlayingStyleId;
  morphology: Morphology;
  heightCm: number;
  weightKg: number;

  attributes: AttributeMap;
  overall: number;
  potential: number; // potentiel max atteignable (potentiel dynamique)

  contract: Contract;
  marketValue: number; // €

  // État courant
  fatigue: number; // 0-100 (100 = épuisé)
  morale: number; // 0-100
  form: number; // 0-100 (forme du moment)
  condition: "fit" | "minor-injury" | "injured" | "suspended";
  injuryWeeksLeft: number;
  trainingSessionsThisWeek: number;

  // Historique
  seasonStats: SeasonStatLine[];
  careerTotals: Omit<SeasonStatLine, "seasonYear" | "clubId" | "competitionId">;
  progressionHistory: ProgressionPoint[];
  achievements: string[]; // ids d'achievements (AchievementsSection)
}

/** Résultat d'une notation de match (0-10). */
export interface MatchRating {
  rating: number;
  goals: number;
  assists: number;
  keyPasses: number;
  tackles: number;
  passesAccuracy: number; // %
  shotsOnTarget: number;
  duelsWon: number; // %
}
