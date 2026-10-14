/**
 * FC CAREER — Domaine : Carrière
 * État global de la carrière du joueur.
 */

export type CareerPhase =
  | "academy"        // Académie jeunes
  | "reserve"        // Équipe réserve
  | "professional"   // Professionnel (équipe première)
  | "elite"          // Élite (titulaire établi)
  | "legend"         // Légende (sommet de carrière)
  | "retired";       // Retraite

export interface CareerObjective {
  id: string;
  description: string;
  type: "seasonal" | "career";
  targetValue: number;
  currentValue: number;
  completed: boolean;
  season: number;
}

export interface CareerEvent {
  id: string;
  season: number;
  matchday: number;
  type: string;
  title: string;
  description: string;
  timestamp: number;
}

export interface AcademyState {
  stage: "youth" | "u18" | "u21" | "reserve";
  evaluationScore: number; // 0-100 : score d'évaluation coach
  promotionThreshold: number;
  weeksInStage: number;
}

export interface Career {
  id: string;
  phase: CareerPhase;
  season: number;
  matchday: number;
  /** Semaine de la saison 1-38 */
  week: number;

  academy: AcademyState | null;

  objectives: CareerObjective[];
  events: CareerEvent[];

  /** IDs des matchs déjà validés (idempotence) */
  completedMatchIds: Set<string>;

  /** Résumés de saisons passées */
  seasonSummaries: SeasonSummary[];
}

export interface SeasonSummary {
  season: number;
  clubId: string;
  phase: CareerPhase;
  appearances: number;
  goals: number;
  assists: number;
  avgRating: number;
  trophies: string[];
  highlights: string[];
}
