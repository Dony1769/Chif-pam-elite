/**
 * FC CAREER — Actions joueur (entraînement, repos, contrat).
 * Enveloppe le moteur (progression, attribute-calculator) dans des callbacks
 * prêts pour l'UI, en mode immuable.
 */

"use client";

import { useCallback, useMemo } from "react";
import type { Player, Contract } from "../types/player";
import {
  TRAINING_SESSIONS,
  runTrainingSession,
  applyRest,
  endOfWeek,
  recommendedSessions,
  type SessionResult,
  type TrainingType,
} from "../engine/progression";
import { computeOverall } from "../engine/attribute-calculator";
import { getPosition } from "../constants/positions";

export interface PlayerMethods {
  /** Lance une séance ; retourne le joueur mis à jour + résultat détaillé. */
  train: (player: Player, focus: TrainingType, seed?: number) => { player: Player; result: SessionResult };
  /** Journée de repos (fatigue -25). */
  rest: (player: Player) => Player;
  /** Clôture de semaine (compteurs + récupération naturelle). */
  finishWeek: (player: Player) => Player;
  /** Séances recommandées selon le style du joueur. */
  recommendations: (player: Player) => TrainingType[];
  /** Recalcule l'overall courant (après patch manuel d'attributs). */
  recalculateOverall: (player: Player) => number;
  /** Applique un nouveau contrat (transfert ou prolongation). */
  signContract: (player: Player, contract: Contract) => Player;
  /** Toutes les séances disponibles (pour un SessionSelector). */
  sessions: typeof TRAINING_SESSIONS;
}

export function usePlayer(): PlayerMethods {
  const train = useCallback(
    (player: Player, focus: TrainingType, seed?: number) => {
      const session = TRAINING_SESSIONS.find((s) => s.id === focus) ?? TRAINING_SESSIONS[0];
      return runTrainingSession(player, session, seed);
    },
    [],
  );

  const rest = useCallback((player: Player) => applyRest(player), []);
  const finishWeek = useCallback((player: Player) => endOfWeek(player), []);
  const recommendations = useCallback(
    (player: Player) => recommendedSessions(player.style),
    [],
  );
  const recalculateOverall = useCallback(
    (player: Player) => computeOverall(player.attributes, getPosition(player.position).family),
    [],
  );
  const signContract = useCallback(
    (player: Player, contract: Contract): Player => ({
      ...player,
      contract,
      morale: Math.min(100, player.morale + 10),
    }),
    [],
  );

  return useMemo(
    () => ({
      train,
      rest,
      finishWeek,
      recommendations,
      recalculateOverall,
      signContract,
      sessions: TRAINING_SESSIONS,
    }),
    [train, rest, finishWeek, recommendations, recalculateOverall, signContract],
  );
}
