"use client";

/**
 * FC CAREER — Provider d'état global
 * Frontière client : tout ce qui touche React et localStorage est ici.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { gameReducer, initialState, type GameState } from "./gameReducer";
import type { GameAction } from "./actions";
import { loadSave, writeSave, deleteSave } from "../persistence/saveRepository";

// ── Contexte ────────────────────────────────────────────────────────────────

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  save: () => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Chargement initial
  useEffect(() => {
    const result = loadSave();
    if (result.ok) {
      dispatch({ type: "LOAD_SAVE", save: result.save });
    } else {
      // Pas de sauvegarde = état vide, prêt pour nouvelle carrière
      dispatch({ type: "DELETE_SAVE" });
    }
  }, []);

  // Sauvegarde automatique quand l'état est dirty
  useEffect(() => {
    if (state.isDirty && state.save) {
      writeSave(state.save);
      dispatch({ type: "SAVE_GAME" });
    }
  }, [state.isDirty, state.save]);

  const save = useCallback(() => {
    if (state.save) {
      writeSave(state.save);
      dispatch({ type: "SAVE_GAME" });
    }
  }, [state.save]);

  const reset = useCallback(() => {
    deleteSave();
    dispatch({ type: "DELETE_SAVE" });
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, save, reset }}>
      {children}
    </GameContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé dans un <GameProvider>");
  return ctx;
}
