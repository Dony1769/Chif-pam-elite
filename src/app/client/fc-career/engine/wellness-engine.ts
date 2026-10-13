/**
 * FC CAREER — Étape 11 : Engine Médias, Blessures, Mental & Sanctions
 */

import type {
  MentalState,
  PressureSource,
  PressureRelief,
  InjuryType,
  ActiveInjury,
  SanctionState,
  PressConference,
  PressQuestion,
  PressQuestionChoice,
  OffFieldOffense,
} from "../types/wellness";
import { INJURIES, PRESS_QUESTIONS, OFF_FIELD_SANCTIONS } from "../types/wellness";

/* ------------------------------------------------------------------ */
/* Mental state                                                        */
/* ------------------------------------------------------------------ */

export function createMentalState(): MentalState {
  return {
    pressure: 20,
    contactFear: 0,
    matchesSinceReturn: 0,
    burnout: false,
    burnoutDaysLeft: 0,
    psychSessionsThisWeek: 0,
  };
}

const PRESSURE_SOURCES: Record<PressureSource, number> = {
  "match-streak": 8,
  "media-criticism": 10,
  "final-near": 12,
  "transfer-saga": 10,
  "objectives-fail": 15,
  "coach-conflict": 12,
};

const PRESSURE_RELIEFS: Record<PressureRelief, number> = {
  rest: 10,
  victory: 8,
  "agent-support": 5,
  psychologist: 15,
};

export function addPressure(state: MentalState, source: PressureSource): MentalState {
  return { ...state, pressure: Math.min(100, state.pressure + PRESSURE_SOURCES[source]) };
}

export function relievePressure(state: MentalState, relief: PressureRelief): MentalState {
  return { ...state, pressure: Math.max(0, state.pressure - PRESSURE_RELIEFS[relief]) };
}

/** Returns performance penalty from pressure (0 to -15). */
export function pressurePerformancePenalty(pressure: number): number {
  if (pressure > 95) return -15;
  if (pressure > 85) return -10;
  if (pressure > 70) return -5;
  return 0;
}

/** Check burnout thresholds. Returns updated state + event description if triggered. */
export function checkBurnout(state: MentalState): { state: MentalState; event: string | null } {
  if (state.burnout) {
    if (state.burnoutDaysLeft <= 0) {
      return { state: { ...state, burnout: false, burnoutDaysLeft: 0, pressure: 50 }, event: "burnout-recovered" };
    }
    return { state: { ...state, burnoutDaysLeft: state.burnoutDaysLeft - 1 }, event: null };
  }
  if (state.pressure > 95) {
    return { state: { ...state, burnout: true, burnoutDaysLeft: 30 }, event: "burnout-total" };
  }
  return { state, event: null };
}

export function psychologistSession(state: MentalState): MentalState {
  return {
    ...state,
    pressure: Math.max(0, state.pressure - 15),
    contactFear: Math.max(0, state.contactFear - 10),
    psychSessionsThisWeek: state.psychSessionsThisWeek + 1,
  };
}

/* ------------------------------------------------------------------ */
/* Injuries                                                            */
/* ------------------------------------------------------------------ */

/** Calculate injury risk % for a match. */
export function injuryRisk(fatigue: number, form: number, injuryProneTrait: boolean): number {
  let risk = 3;
  if (fatigue > 90) risk *= 3;
  else if (fatigue > 70) risk *= 2;
  if (form < 30) risk += 2;
  if (injuryProneTrait) risk += 5;
  return risk;
}

/** Roll for injury. Returns null if no injury, or an ActiveInjury. */
export function rollInjury(
  fatigue: number,
  form: number,
  injuryProneTrait: boolean,
  dayNumber: number,
): ActiveInjury | null {
  const risk = injuryRisk(fatigue, form, injuryProneTrait);
  if (Math.random() * 100 > risk) return null;

  // Pick injury type by weighted frequency
  const roll = Math.random() * 100;
  let cumul = 0;
  for (const def of INJURIES) {
    cumul += def.frequency;
    if (roll <= cumul) {
      const [min, max] = def.durationDays;
      const totalDays = min + Math.floor(Math.random() * (max - min + 1));
      return { type: def.type, daysLeft: totalDays, totalDays, occurredOnDay: dayNumber };
    }
  }
  // fallback
  return { type: "contusion", daysLeft: 2, totalDays: 2, occurredOnDay: dayNumber };
}

/** Tick injury (reduce days). Returns null when healed. */
export function tickInjury(injury: ActiveInjury): ActiveInjury | null {
  const left = injury.daysLeft - 1;
  if (left <= 0) return null;
  return { ...injury, daysLeft: left };
}

/** Is this injury severe (> 30 days)? */
export function isSevereInjury(injury: ActiveInjury): boolean {
  return injury.totalDays > 30;
}

/** Apply post-injury psychology after returning from a severe injury. */
export function applyPostInjuryReturn(state: MentalState): MentalState {
  return { ...state, contactFear: 100, matchesSinceReturn: 0 };
}

/** Tick post-injury fear after a match without re-injury. */
export function tickPostInjuryMatch(state: MentalState): MentalState {
  const matches = state.matchesSinceReturn + 1;
  const fear = Math.max(0, state.contactFear - 5);
  const cleared = matches >= 8 || fear <= 0;
  return { ...state, contactFear: cleared ? 0 : fear, matchesSinceReturn: matches };
}

/** Contact fear performance penalties. */
export function contactFearPenalties(fear: number): { tacklePenalty: number; aggressionPenalty: number; accelerationPenalty: number } {
  if (fear <= 0) return { tacklePenalty: 0, aggressionPenalty: 0, accelerationPenalty: 0 };
  const ratio = fear / 100;
  return {
    tacklePenalty: Math.round(-30 * ratio),
    aggressionPenalty: Math.round(-20 * ratio),
    accelerationPenalty: Math.round(-10 * ratio),
  };
}

/* ------------------------------------------------------------------ */
/* Sanctions                                                           */
/* ------------------------------------------------------------------ */

export function createSanctionState(): SanctionState {
  return { yellowsThisSeason: 0, yellowsLast10: 0, redsThisSeason: 0, suspensionMatchesLeft: 0, totalFines: 0 };
}

/** Apply a yellow card. Returns updated state. */
export function applyYellow(state: SanctionState): SanctionState {
  const yellows = state.yellowsThisSeason + 1;
  const last10 = state.yellowsLast10 + 1;
  let suspension = state.suspensionMatchesLeft;

  if (last10 >= 3) suspension += 1; // 3 in 10 matches
  if (yellows === 5) suspension += 1;
  if (yellows === 10) suspension += 2;

  return { ...state, yellowsThisSeason: yellows, yellowsLast10: Math.min(last10, 10), suspensionMatchesLeft: suspension };
}

/** Apply a red card. */
export function applyRed(state: SanctionState): SanctionState {
  const reds = state.redsThisSeason + 1;
  let suspension = state.suspensionMatchesLeft + 1 + Math.floor(Math.random() * 3); // 1-3
  if (reds >= 3) suspension += 3; // audition: 3-5 extra
  return { ...state, redsThisSeason: reds, suspensionMatchesLeft: suspension };
}

/** Apply off-field sanction. Returns updated state + fine amount. */
export function applyOffFieldSanction(
  state: SanctionState,
  offense: OffFieldOffense,
  dailySalary: number,
): { state: SanctionState; fine: number; pressureDelta: number } {
  const def = OFF_FIELD_SANCTIONS.find(s => s.offense === offense)!;
  const fine = def.fineMultiplier * dailySalary;
  return {
    state: {
      ...state,
      suspensionMatchesLeft: state.suspensionMatchesLeft + def.suspensionMatches,
      totalFines: state.totalFines + fine,
    },
    fine,
    pressureDelta: def.pressureDelta,
  };
}

/** Tick suspension (after a match day passes while suspended). */
export function tickSuspension(state: SanctionState): SanctionState {
  if (state.suspensionMatchesLeft <= 0) return state;
  return { ...state, suspensionMatchesLeft: state.suspensionMatchesLeft - 1 };
}

/** Slide window: after a match, if >10 matches tracked, reset last10 counter. */
export function slideYellowWindow(state: SanctionState): SanctionState {
  // Simple: reset the rolling counter periodically
  if (state.yellowsLast10 >= 10) return { ...state, yellowsLast10: 0 };
  return state;
}

/* ------------------------------------------------------------------ */
/* Press conferences                                                   */
/* ------------------------------------------------------------------ */

/** Generate a press conference with 2-3 random questions. */
export function generatePressConference(dayNumber: number): PressConference {
  const count = 2 + Math.floor(Math.random() * 2); // 2-3
  const shuffled = [...PRESS_QUESTIONS].sort(() => Math.random() - 0.5);
  const questions: PressQuestion[] = shuffled.slice(0, count);
  return { id: `press-${dayNumber}`, dayNumber, questions, answers: [] };
}

/** Apply a press conference answer. Returns deltas. */
export function applyPressAnswer(choice: PressQuestionChoice): {
  imageDelta: number;
  coachTrustDelta: number;
  moraleDelta: number;
  pressureDelta: number;
} {
  return {
    imageDelta: choice.imageDelta,
    coachTrustDelta: choice.coachTrustDelta,
    moraleDelta: choice.moraleDelta,
    pressureDelta: choice.pressureDelta,
  };
}
