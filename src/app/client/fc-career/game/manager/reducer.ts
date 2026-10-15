/**
 * FC CAREER 27 — Mode Manager : reducer pur (state, action) → state.
 */

import type { ManagerState, Tactic } from "./types";
import type { LiveMatch } from "./matchSim";
import {
  autoLineup, createManagerGame, markRead, playWeek, setCaptain, setTactic, swapPlayers,
} from "./engine";

export type ManagerAction =
  | { type: "NEW_GAME"; seed: string; clubId: string; managerName: string; now?: number }
  | { type: "LOAD"; state: ManagerState }
  | { type: "SET_TACTIC"; tactic: Tactic }
  | { type: "AUTO_LINEUP" }
  | { type: "SWAP_PLAYERS"; a: string; b: string }
  | { type: "SET_CAPTAIN"; playerId: string }
  | { type: "PLAY_WEEK"; live?: LiveMatch | null }
  | { type: "MARK_READ"; id: string }
  | { type: "MARK_ALL_READ" };

export function managerReducer(state: ManagerState | null, action: ManagerAction): ManagerState | null {
  switch (action.type) {
    case "NEW_GAME":
      return createManagerGame({ seed: action.seed, clubId: action.clubId, managerName: action.managerName, now: action.now });
    case "LOAD":
      return action.state;
  }
  if (!state) return state;
  switch (action.type) {
    case "SET_TACTIC":    return setTactic(state, action.tactic);
    case "AUTO_LINEUP":   return autoLineup(state);
    case "SWAP_PLAYERS":  return swapPlayers(state, action.a, action.b);
    case "SET_CAPTAIN":   return setCaptain(state, action.playerId);
    case "PLAY_WEEK":     return playWeek(state, action.live);
    case "MARK_READ":     return markRead(state, action.id);
    case "MARK_ALL_READ": return { ...state, inbox: state.inbox.map(m => ({ ...m, read: true })) };
  }
}
