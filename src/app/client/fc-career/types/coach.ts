/**
 * FC CAREER — Étape 7 : Coach, concurrence & objectifs
 */

import type { PositionId, PositionFamily } from "../constants/positions";

/* ------------------------------------------------------------------ */
/* 7.1 — Relation Coach                                                */
/* ------------------------------------------------------------------ */

export type CoachMood = "happy" | "neutral" | "annoyed" | "angry";

export interface CoachRelationship {
  trust: number; // 0-100
  mood: CoachMood;
  lastConversationDay: number;
  conversationCooldownDays: number; // min days between conversations
}

export type CoachConversationType =
  | "demand-playtime"
  | "suggest-position"
  | "ask-why-benched"
  | "coach-counts-on-you"
  | "coach-scolds";

export interface ConversationChoice {
  id: string;
  label: string;
  trustDelta: number;
  moraleDelta: number;
  /** Minimum trust required for this to not backfire */
  trustThreshold?: number;
}

export interface CoachConversation {
  type: CoachConversationType;
  title: string;
  message: string;
  choices: ConversationChoice[];
  /** Coach-initiated = true, player-initiated = false */
  coachInitiated: boolean;
  /** Minimum trust to trigger (player-initiated) */
  minTrust?: number;
}

/* ------------------------------------------------------------------ */
/* 7.2 — Hiérarchie & Concurrence                                     */
/* ------------------------------------------------------------------ */

export type SquadStatus = "TITULAIRE" | "REMPLAÇANT" | "TRIBUNE";

export interface SimulatedPlayer {
  id: string;
  name: string;
  position: PositionId;
  rating: number; // 50-95
  form: number; // 0-100
  fatigue: number; // 0-100
  lastThreeRatings: number[]; // match ratings 0-10
  age: number;
}

export interface SquadState {
  players: SimulatedPlayer[];
  userStatus: SquadStatus;
  /** Selection score breakdown for transparency */
  userSelectionScore?: number;
  competitorScores?: { playerId: string; score: number }[];
}

/* ------------------------------------------------------------------ */
/* 7.3 — Objectifs de Saison                                           */
/* ------------------------------------------------------------------ */

export type ObjectiveType =
  | "goals"
  | "assists"
  | "avg-rating"
  | "matches-played"
  | "clean-sheets"
  | "saves-pct"
  | "max-cards";

export interface SeasonObjective {
  id: string;
  type: ObjectiveType;
  label: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface ObjectivesState {
  objectives: SeasonObjective[];
  evaluated: boolean;
  success: boolean | null;
}

/* ------------------------------------------------------------------ */
/* 7.4 — Prêts                                                        */
/* ------------------------------------------------------------------ */

export type LoanType = "dry" | "option-to-buy" | "obligation-to-buy";

export interface LoanOffer {
  id: string;
  fromClubId: string;
  toClubId: string;
  type: LoanType;
  durationMonths: 6 | 12;
  buyPrice?: number; // for option/obligation
  /** Obligation condition (e.g., 20 matches played) */
  obligationCondition?: { matchesPlayed: number };
  salaryCoverage: number; // 0-100%
}

export interface ActiveLoan {
  offer: LoanOffer;
  startDay: number;
  endDay: number;
  parentClubId: string;
  matchesPlayed: number;
  avgRating: number;
  /** Resolved at end of loan */
  bought: boolean | null;
}
