/**
 * FC CAREER 27 — Calcul de la semaine hors du fil principal : l'interface
 * reste fluide pendant que le monde entier joue sa journée. Même moteur,
 * même résultat qu'en direct (déterministe).
 */

import { playerStep } from "../../game/player2/reducer";
import type { PlayerAction } from "../../game/player2/reducer";
import type { PlayerCareerState } from "../../game/player2/types";

self.onmessage = (e: MessageEvent<{ id: number; state: PlayerCareerState; action: PlayerAction }>) => {
  const { id, state, action } = e.data;
  try {
    const step = playerStep(state, action);
    (self as unknown as Worker).postMessage({ id, ok: true, step });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) });
  }
};
