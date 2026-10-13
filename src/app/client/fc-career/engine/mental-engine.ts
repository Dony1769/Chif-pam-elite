/**
 * FC CAREER — Engine Santé mentale & Sanctions
 * (Split from wellness-engine.ts)
 */

import type {
  MentalState,
  PressureSource,
  PressureRelief,
  SanctionState,
  OffFieldOffense,
} from "../types/mental";
import { OFF_FIELD_SANCTIONS } from "../types/mental";

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
