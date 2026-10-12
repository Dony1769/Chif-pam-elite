/**
 * FC CAREER — Hook d'état global du jeu (GameContext + persistance).
 *
 * Fournit state + dispatch avec hydratation automatique depuis le
 * localStorage et sauvegarde différée à chaque changement (versionnée via utils/storage).
 */

"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  gameReducer,
  initialGameState,
  type GameState,
  type GameAction,
} from "../context/GameContext";
import { loadGame, saveGame } from "../utils/storage";

export interface UseGameStateResult {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  /** Force une écriture de la sauvegarde courante dans le localStorage. */
  persist: () => void;
  /** Recharge la sauvegarde depuis le localStorage (après reset/migration). */
  reload: () => void;
}

export function useGameState(): UseGameStateResult {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const hydratedRef = useRef(false);

  // Hydratation : lecture de la sauvegarde au premier montage (client uniquement).
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const save = loadGame();
    dispatch({
      type: "HYDRATE",
      payload: {
        ...initialGameState,
        hydrated: true,
        locked: false, // le garde de session (FcCareerGuard) gère déjà le PIN
        meta: save?.meta ?? null,
        player: save?.player ?? null,
        wallet: save?.wallet ?? null,
      },
    });
  }, []);

  // Auto-sauvegarde débouncée quand des données existent.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!state.hydrated || !state.meta) return;
    const t = window.setTimeout(() => {
      const s = stateRef.current;
      if (s.meta) saveGame({ meta: s.meta, player: s.player, wallet: s.wallet });
    }, 400);
    return () => window.clearTimeout(t);
  }, [state]);

  const persist = useCallback(() => {
    const s = stateRef.current;
    if (s.meta) saveGame({ meta: s.meta, player: s.player, wallet: s.wallet });
  }, []);

  const reload = useCallback(() => {
    const save = loadGame();
    dispatch({
      type: "HYDRATE",
      payload: {
        ...initialGameState,
        hydrated: true,
        locked: false,
        meta: save?.meta ?? null,
        player: save?.player ?? null,
        wallet: save?.wallet ?? null,
      },
    });
  }, []);

  return useMemo(
    () => ({ state, dispatch, persist, reload }),
    [state, persist, reload],
  );
}
