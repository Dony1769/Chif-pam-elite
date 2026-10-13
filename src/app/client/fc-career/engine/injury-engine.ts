/**
 * FC CAREER — Engine Blessures
 * (Split from wellness-engine.ts)
 */

import type {
  InjuryType,
  ActiveInjury,
} from "../types/injury";
import { INJURIES } from "../types/injury";
import type { MentalState } from "../types/mental";

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
