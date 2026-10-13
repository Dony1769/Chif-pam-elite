/**
 * FC CAREER — Joueur
 * Attributs, morphologie, contrat, historique de carrière.
 */

import type { PositionId, PlayingStyleId } from "../constants/positions";
import type { UnlockedPlayStyle } from "../engine/playstyles";
import type { PlayerTrait } from "../engine/traits";

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

export type FootChoice = "left" | "right" | "both";

export type AcademyLevel = "local" | "regional" | "national" | "elite";

/** Parcours académie → pro (Étape 3). */
export type CareerStage = "u17" | "u19" | "reserve" | "pro";

export interface AcademyStatus {
  stage: CareerStage;
  /** Nombre de matchs joués à ce niveau cette saison. */
  matchesAtLevel: number;
  /** Note moyenne au niveau actuel. */
  averageRatingAtLevel: number;
  /** Appels en équipe première (reserve seulement, max 3/saison). */
  firstTeamCallUps: number;
  /** Saisons passées au niveau actuel. */
  seasonsAtLevel: number;
  /** Le coach a proposé une promotion. */
  promotionPending: boolean;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO
  age: number;
  nationality: string; // code ISO 3166-1 alpha-2 ("FR")
  foot: FootChoice;
  position: PositionId;
  secondaryPositions: PositionId[];
  style: PlayingStyleId;
  morphology: Morphology;
  heightCm: number;
  weightKg: number;

  attributes: AttributeMap;
  overall: number;
  potential: number; // potentiel max atteignable (potentiel dynamique)

  // Étoiles (Étape 4.2)
  skillMovesStars: number; // 1-5 gestes techniques
  weakFootStars: number;  // 1-5 pied faible

  // PlayStyles (Étape 4.3)
  playStyles: UnlockedPlayStyle[];

  // Traits de personnalité (Étape 4.4)
  traits: PlayerTrait[];

  contract: Contract;
  marketValue: number; // €

  // État courant
  fatigue: number; // 0-100 (100 = épuisé)
  morale: number; // 0-100
  form: number; // 0-100 (forme du moment)
  condition: "fit" | "minor-injury" | "injured" | "suspended";
  injuryWeeksLeft: number;
  trainingSessionsThisWeek: number;

  // Académie (Étape 3)
  academyLevel: AcademyLevel;
  academy: AcademyStatus;

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
