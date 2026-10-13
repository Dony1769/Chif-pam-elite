/**
 * FC CAREER — Étape 17 : Motion Design & Immersion
 */

/* ------------------------------------------------------------------ */
/* 17.1 — Événements immersifs                                         */
/* ------------------------------------------------------------------ */

export type ImmersionEventType =
  | "finale-victory"
  | "severe-injury"
  | "benched"
  | "relegation"
  | "big-transfer"
  | "new-record"
  | "debut"
  | "first-goal";

export interface ImmersionEvent {
  id: string;
  type: ImmersionEventType;
  title: string;
  description: string;
  emoji: string;
  day: number;
  seen: boolean;
}

/* ------------------------------------------------------------------ */
/* 17.2 — Transitions                                                  */
/* ------------------------------------------------------------------ */

export type TransitionType =
  | "dashboard-to-match"
  | "dashboard-to-training"
  | "dashboard-to-phone"
  | "match-end-to-stats"
  | "transfer-confirmed";

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // ms
  easing: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* 17.3 — Micro-Interactions                                           */
/* ------------------------------------------------------------------ */

export type MicroInteractionType =
  | "button-click"
  | "stat-increase"
  | "fatigue-change"
  | "notification"
  | "new-record"
  | "phone-message";

export interface MicroInteraction {
  type: MicroInteractionType;
  animation: string;
  duration: number; // ms
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface ImmersionState {
  events: ImmersionEvent[];
  confettiActive: boolean;
  screenEffect: "none" | "red-flash" | "gold-confetti" | "grey-rain" | "camera-flash";
  lastNotification: string | null;
}
