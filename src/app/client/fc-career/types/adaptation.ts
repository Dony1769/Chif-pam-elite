/**
 * FC CAREER — Étape 15 : Monde Vivant & Adaptation Culturelle
 */

import type { Country } from "./club";

/* ------------------------------------------------------------------ */
/* 15.1 — Monde Vivant                                                 */
/* ------------------------------------------------------------------ */

/** A simulated AI player in the world. */
export interface WorldPlayer {
  id: string;
  name: string;
  clubId: string;
  country: Country;
  position: string;
  age: number;
  overall: number;
  goals: number;
  assists: number;
  marketValue: number;
  injured: boolean;
  injuryWeeks: number;
}

/** A news item in the feed. */
export interface NewsItem {
  id: string;
  day: number;
  emoji: string;
  headline: string;
  category: "transfer" | "injury" | "result" | "relegation" | "coach" | "youth" | "record";
}

/** Coach change event. */
export interface CoachChange {
  clubId: string;
  oldCoach: string;
  newCoach: string;
  day: number;
}

/** Club season result (promotion/relegation). */
export interface ClubMovement {
  clubId: string;
  clubName: string;
  type: "promoted" | "relegated";
  fromDivision: string;
  toDivision: string;
}

/* ------------------------------------------------------------------ */
/* 15.2 — Adaptation Culturelle                                        */
/* ------------------------------------------------------------------ */

export type AdaptationPhase = "shock" | "adapting" | "integrated";

export interface CulturalAdaptation {
  /** Country the player moved to. */
  country: Country;
  /** Day the transfer happened. */
  startDay: number;
  /** Current phase. */
  phase: AdaptationPhase;
  /** Language barrier remaining (0-100). 0 = fluent. */
  languageBarrier: number;
  /** Number of language lessons taken. */
  lessonsCompleted: number;
  /** Is there a compatriot in the squad? → 2x faster adaptation. */
  hasCompatriot: boolean;
  /** Countries the player has lived in. */
  countriesLived: Country[];
}

export interface CulturalPenalties {
  communicationPenalty: number; // % reduction
  tacticalPenalty: number;
  moraleDelta: number;
  pressureDelta: number;
  fatigueDelta: number;
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface WorldState {
  /** AI players in the world. */
  players: WorldPlayer[];
  /** News feed. */
  news: NewsItem[];
  /** Coach changes this season. */
  coachChanges: CoachChange[];
  /** Promotion/relegation. */
  movements: ClubMovement[];
  /** Cultural adaptation (null if playing in home country). */
  adaptation: CulturalAdaptation | null;
  /** Last day the world was simulated. */
  lastSimDay: number;
}
