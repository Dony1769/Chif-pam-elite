/**
 * FC CAREER — Étape 17 : Engine Motion Design & Immersion
 */

import type {
  ImmersionState,
  ImmersionEvent,
  ImmersionEventType,
  TransitionConfig,
  TransitionType,
  MicroInteraction,
  MicroInteractionType,
} from "../types/ui";

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function createImmersionState(): ImmersionState {
  return {
    events: [],
    confettiActive: false,
    screenEffect: "none",
    lastNotification: null,
  };
}

/* ------------------------------------------------------------------ */
/* Immersion Events                                                    */
/* ------------------------------------------------------------------ */

let eventCounter = 0;

const EVENT_CONFIG: Record<ImmersionEventType, { title: string; emoji: string; effect: ImmersionState["screenEffect"] }> = {
  "finale-victory": { title: "Victoire en finale !", emoji: "🏆", effect: "gold-confetti" },
  "severe-injury": { title: "Blessure grave", emoji: "🤕", effect: "red-flash" },
  "benched": { title: "Sur le banc", emoji: "🪑", effect: "none" },
  "relegation": { title: "Relégation", emoji: "📉", effect: "grey-rain" },
  "big-transfer": { title: "Transfert majeur", emoji: "✈️", effect: "camera-flash" },
  "new-record": { title: "Nouveau record !", emoji: "⭐", effect: "gold-confetti" },
  "debut": { title: "Premier match pro", emoji: "🌟", effect: "camera-flash" },
  "first-goal": { title: "Premier but !", emoji: "⚽", effect: "gold-confetti" },
};

export function triggerEvent(
  state: ImmersionState,
  type: ImmersionEventType,
  description: string,
  day: number,
): ImmersionState {
  const config = EVENT_CONFIG[type];
  eventCounter++;
  const event: ImmersionEvent = {
    id: `imm-${day}-${eventCounter}`,
    type,
    title: config.title,
    description,
    emoji: config.emoji,
    day,
    seen: false,
  };

  return {
    ...state,
    events: [...state.events, event].slice(-30),
    confettiActive: config.effect === "gold-confetti",
    screenEffect: config.effect,
    lastNotification: `${config.emoji} ${config.title}`,
  };
}

export function markEventSeen(state: ImmersionState, eventId: string): ImmersionState {
  return {
    ...state,
    events: state.events.map(e => e.id === eventId ? { ...e, seen: true } : e),
  };
}

export function clearEffect(state: ImmersionState): ImmersionState {
  return { ...state, confettiActive: false, screenEffect: "none" };
}

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

const TRANSITIONS: Record<TransitionType, TransitionConfig> = {
  "dashboard-to-match": { type: "dashboard-to-match", duration: 500, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", description: "Stade apparaît + flip score" },
  "dashboard-to-training": { type: "dashboard-to-training", duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)", description: "Slide-in + barre de progression" },
  "dashboard-to-phone": { type: "dashboard-to-phone", duration: 250, easing: "cubic-bezier(0.22, 1, 0.36, 1)", description: "Slide-up comme un vrai téléphone" },
  "match-end-to-stats": { type: "match-end-to-stats", duration: 3000, easing: "ease-out", description: "Stabilité 3s puis cascade stagger" },
  "transfer-confirmed": { type: "transfer-confirmed", duration: 800, easing: "ease-in-out", description: "Fondu noir → couleurs du nouveau club" },
};

export function getTransition(type: TransitionType): TransitionConfig {
  return TRANSITIONS[type];
}

export function getAllTransitions(): TransitionConfig[] {
  return Object.values(TRANSITIONS);
}

/* ------------------------------------------------------------------ */
/* Micro-Interactions                                                  */
/* ------------------------------------------------------------------ */

const MICRO_INTERACTIONS: Record<MicroInteractionType, MicroInteraction> = {
  "button-click": { type: "button-click", animation: "ripple + scale 0.95→1.0", duration: 100 },
  "stat-increase": { type: "stat-increase", animation: "number animate + flash green", duration: 400 },
  "fatigue-change": { type: "fatigue-change", animation: "bar smooth + color gradient", duration: 600 },
  "notification": { type: "notification", animation: "toast slide-in + subtle shake", duration: 200 },
  "new-record": { type: "new-record", animation: "gold burst + mini confetti", duration: 500 },
  "phone-message": { type: "phone-message", animation: "vibration + notification badge", duration: 150 },
};

export function getMicroInteraction(type: MicroInteractionType): MicroInteraction {
  return MICRO_INTERACTIONS[type];
}

/* ------------------------------------------------------------------ */
/* Confetti generator (positions for rendering)                        */
/* ------------------------------------------------------------------ */

export interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

const CONFETTI_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE"];

export function generateConfetti(count: number = 50): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
  }));
}
