/**
 * FC CAREER — Engine Médias & Conférences de presse
 * (Split from wellness-engine.ts)
 */

import type {
  PressConference,
  PressQuestion,
  PressQuestionChoice,
} from "../types/media";
import { PRESS_QUESTIONS } from "../types/media";

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
