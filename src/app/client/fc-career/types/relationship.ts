/**
 * FC CAREER — Relations : Coach, Fans, Vestiaire & Capitanat
 * (Merged from coach.ts + fans.ts)
 */

import type { PositionId, PositionFamily } from "../constants/positions";

/* ================================================================== */
/* Étape 7 : Coach, concurrence & objectifs                            */
/* ================================================================== */

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

/* ================================================================== */
/* Étape 16 : Fans, Vestiaire & Capitanat                              */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* 16.1 — Fans                                                         */
/* ------------------------------------------------------------------ */

export type FanAction = "throw-jersey" | "go-to-fans" | "ignore-fans" | "applaud-away-fans";

export interface FanActionResult {
  action: FanAction;
  label: string;
  popDelta: number;
  imageDelta: number;
  description: string;
}

export interface FanState {
  /** Fan popularity 0-100. */
  popularity: number;
  /** Jersey count remaining for toss actions. */
  jerseysAvailable: number;
  /** Whether fans sing the player's name (pop > 80). */
  fansSingName: boolean;
  /** Whether a tifo exists (pop > 80). */
  tifoActive: boolean;
  /** Whether the player is an idol (pop > 90). */
  isIdol: boolean;
  /** Whether fans whistle (pop < 30). */
  fansWhistle: boolean;
  /** Whether fans demand departure (pop < 10). */
  fansDemandDeparture: boolean;
}

/* ------------------------------------------------------------------ */
/* 16.2 — Vestiaire                                                    */
/* ------------------------------------------------------------------ */

export type LockerRoomRole = "leader" | "follower" | "hothead" | "youngster";

export interface LockerRoomMember {
  id: string;
  name: string;
  role: LockerRoomRole;
  morale: number; // 0-100
}

export type LockerRoomMood = "united" | "neutral" | "divided";

export interface LockerRoomConflict {
  id: string;
  player1: string;
  player2: string;
  description: string;
  resolved: boolean;
  day: number;
}

export type ConflictChoice = "mediate" | "side-player1" | "side-player2" | "ignore";

export interface LockerRoomState {
  members: LockerRoomMember[];
  mood: LockerRoomMood;
  cohesion: number; // 0-100
  conflicts: LockerRoomConflict[];
  perfBonus: number; // +3% united, -5% divided, 0 neutral
}

/* ------------------------------------------------------------------ */
/* 16.3 — Capitanat                                                    */
/* ------------------------------------------------------------------ */

export type SpeechType = "motivating" | "calm" | "aggressive";

export interface SpeechResult {
  type: SpeechType;
  label: string;
  perfBonus: number;
  cardRiskBonus: number; // % increase in card risk
  requiresWin: boolean; // if true, perfBonus becomes negative on loss
}

export interface CaptainState {
  isCaptain: boolean;
  /** Seasons as captain. */
  seasonsAsCaptain: number;
  /** Last speech given. */
  lastSpeech: SpeechType | null;
  /** Toss won/lost count. */
  tossWins: number;
  tossTotal: number;
}

/* ------------------------------------------------------------------ */
/* Combined State                                                      */
/* ------------------------------------------------------------------ */

export interface FansVestiaireState {
  fan: FanState;
  lockerRoom: LockerRoomState;
  captain: CaptainState;
}
