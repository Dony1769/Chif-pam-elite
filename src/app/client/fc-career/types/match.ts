/**
 * FC CAREER — Simulation de match & statistiques
 * Étape 8 : rituels, choix, VAR, célébrations, notation.
 */

import type { MatchRating } from "./player";

// Re-export de MatchDay (défini dans types/game.ts) pour compatibilité
export type { MatchDay } from "./game";

/* ------------------------------------------------------------------ */
/* Événements                                                          */
/* ------------------------------------------------------------------ */

export type MatchEvent =
  | { id: string; minute: number; type: "goal"; scorer: string; clubId: string; assist?: string }
  | { id: string; minute: number; type: "chance"; clubId: string; description: string }
  | { id: string; minute: number; type: "card"; clubId: string; player: string; color: "yellow" | "red" }
  | { id: string; minute: number; type: "sub"; clubId: string; out: string; in: string }
  | { id: string; minute: number; type: "var"; clubId: string; outcome: string; varResult: "validated" | "cancelled" }
  | { id: string; minute: number; type: "whistle"; half: "kickoff" | "halftime" | "secondhalf" | "fulltime" };

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export interface TeamStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  offsides: number;
  passAccuracy: number;
  duelsWon: number;
}

/* ------------------------------------------------------------------ */
/* 8.1 — Rituels d'avant-match                                        */
/* ------------------------------------------------------------------ */

export type RitualId = "music" | "meditate" | "call-family" | "last-out" | "pray";

export interface RitualDef {
  id: RitualId;
  emoji: string;
  label: string;
  bonus: { attr: string; value: number };
  /** Nombre de matchs consécutifs pour bonus permanent */
  streakForPermanent: number;
}

export const RITUALS: RitualDef[] = [
  { id: "music", emoji: "🎵", label: "Écouter de la musique", bonus: { attr: "concentration", value: 3 }, streakForPermanent: 10 },
  { id: "meditate", emoji: "🧘", label: "Méditer", bonus: { attr: "composure", value: 3 }, streakForPermanent: 10 },
  { id: "call-family", emoji: "📱", label: "Appeler la famille", bonus: { attr: "morale", value: 5 }, streakForPermanent: 10 },
  { id: "last-out", emoji: "🏃", label: "Être le dernier à sortir", bonus: { attr: "superstition", value: 0 }, streakForPermanent: 10 },
  { id: "pray", emoji: "🙏", label: "Prier", bonus: { attr: "composure", value: 3 }, streakForPermanent: 10 },
];

export interface RitualState {
  selectedRituals: RitualId[];    // 1-2 rituels choisis
  streaks: Record<RitualId, number>; // nombre de matchs consécutifs
  permanentBonuses: RitualId[];    // rituels devenus permanents
  broken: boolean;                 // rituel brisé → malus
  brokenMatchesLeft: number;       // matchs restants de malus
}

/* ------------------------------------------------------------------ */
/* 8.2 — Moments de choix pendant le match                            */
/* ------------------------------------------------------------------ */

export type MatchChoiceId =
  | "corner-front-post" | "corner-back-post"
  | "dribble" | "pass-safe"
  | "long-shot" | "advance"
  | "contest-ref" | "accept-ref"
  | "press-high" | "stay-back";

export interface MatchChoice {
  id: MatchChoiceId;
  label: string;
  emoji: string;
  /** Base success % (modified by attributes/playstyles) */
  baseSuccessPct: number;
  /** On success */
  successOutcome: string;
  successRatingBonus: number;
  /** On failure */
  failureOutcome: string;
  failureRatingMalus: number;
  /** Can lead to goal? */
  canGoal: boolean;
  /** Risk of card? */
  cardRisk: number; // 0-1
}

export interface MatchChoiceMoment {
  minute: number;
  prompt: string;
  options: [MatchChoice, MatchChoice];
}

/* ------------------------------------------------------------------ */
/* 8.3 — Célébrations                                                  */
/* ------------------------------------------------------------------ */

export type CelebrationId = "knee-slide" | "finger-sky" | "shush" | "dance" | "hug" | "mask" | "baby";

export interface CelebrationDef {
  id: CelebrationId;
  emoji: string;
  label: string;
  /** Risque de carton (0-1) */
  cardRisk: number;
  /** Nombre requis pour devenir "signature" */
  signatureThreshold: number;
  unlockCondition?: string;
}

export const CELEBRATIONS: CelebrationDef[] = [
  { id: "knee-slide", emoji: "🏃", label: "Glissade sur les genoux", cardRisk: 0, signatureThreshold: 10 },
  { id: "finger-sky", emoji: "☝️", label: "Doigt vers le ciel", cardRisk: 0, signatureThreshold: 10 },
  { id: "shush", emoji: "🤫", label: "Chut aux supporters", cardRisk: 0.15, signatureThreshold: 10 },
  { id: "dance", emoji: "🕺", label: "Danse signature", cardRisk: 0, signatureThreshold: 10 },
  { id: "hug", emoji: "🫂", label: "Câlin coéquipiers", cardRisk: 0, signatureThreshold: 10 },
  { id: "mask", emoji: "🎭", label: "Masque / Accessoire", cardRisk: 0.05, signatureThreshold: 10 },
  { id: "baby", emoji: "👶", label: "Bercer le bébé", cardRisk: 0, signatureThreshold: 10, unlockCondition: "child-born" },
];

export interface CelebrationState {
  counts: Record<CelebrationId, number>;
  signature: CelebrationId | null;
  unlocked: CelebrationId[];
}

/* ------------------------------------------------------------------ */
/* Match simulé complet                                                */
/* ------------------------------------------------------------------ */

export interface SimulatedMatch {
  id: string;
  dayNumber: number;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homeStats: TeamStats;
  awayStats: TeamStats;
  userRating: MatchRating;
  userPlayed: boolean;
  userMinutes: number;
  manOfTheMatch?: string;
  /** Choix faits par le joueur pendant le match */
  choicesMade?: { choiceId: MatchChoiceId; success: boolean; minute: number }[];
  /** Célébration choisie (si but marqué) */
  celebration?: CelebrationId;
}

export interface LineupSlot {
  playerId: string;
  name: string;
  positionId: string;
  role: string;
  ratingPrediction: number;
}

export interface Lineup {
  formationId: string;
  starters: LineupSlot[];
  bench: LineupSlot[];
  captainId: string;
}

export interface SimulationOptions {
  seed?: number;
  fast?: boolean;
  intensityHome?: number;
  intensityAway?: number;
}
