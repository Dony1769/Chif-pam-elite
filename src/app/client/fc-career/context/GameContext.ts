/**
 * FC CAREER — Contexte global (state + dispatch)
 */

"use client";

import { createContext, useContext } from "react";
import type { GameSave, GamePhase, SeasonState } from "../types/game";
import type { Player } from "../types/player";
import type { Wallet } from "../types/economy";
import type { SimulatedMatch } from "../types/match";

export interface GameState {
  hydrated: boolean;
  locked: boolean; // PIN non saisi
  meta: GameSave | null;
  player: Player | null;
  wallet: Wallet | null;
  /** Saison en cours (calendrier, résultats) — persistée dans meta.season. */
  season: SeasonState | null;
  lastMatch: SimulatedMatch | null;
}

export type GameAction =
  | { type: "HYDRATE"; payload: GameState }
  | { type: "UNLOCK" }
  | { type: "LOCK" }
  | { type: "SET_PLAYER"; payload: Player }
  | { type: "SET_WALLET"; payload: Wallet }
  | { type: "SET_SEASON"; payload: SeasonState }
  | { type: "SET_PHASE"; payload: GamePhase }
  | { type: "SET_LAST_MATCH"; payload: SimulatedMatch }
  | { type: "RESET" };

export const initialGameState: GameState = {
  hydrated: false,
  locked: true,
  meta: null,
  player: null,
  wallet: null,
  season: null,
  lastMatch: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    case "UNLOCK":
      return { ...state, locked: false };
    case "LOCK":
      return { ...state, locked: true };
    case "SET_PLAYER":
      return { ...state, player: action.payload };
    case "SET_WALLET":
      return { ...state, wallet: action.payload };
    case "SET_SEASON":
      // La saison est persistée dans meta.season (sauvegarde versionnée).
      return state.meta
        ? { ...state, season: action.payload, meta: { ...state.meta, season: action.payload } }
        : { ...state, season: action.payload };
    case "SET_PHASE":
      return state.meta ? { ...state, meta: { ...state.meta, phase: action.payload } } : state;
    case "SET_LAST_MATCH":
      return { ...state, lastMatch: action.payload };
    case "RESET":
      return { ...initialGameState, hydrated: true, locked: false };
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext doit être utilisé dans <GameProvider>");
  return ctx;
}
