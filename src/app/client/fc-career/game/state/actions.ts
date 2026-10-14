/**
 * FC CAREER — Actions du jeu
 * Toutes les mutations d'état passent par ces actions.
 */

import type { Player, PlayerAttributes } from "../domain/player";
import type { Career } from "../domain/career";
import type { Wallet } from "../domain/economy";
import type { MatchResult } from "../domain/match";
import type { GameSaveV1 } from "../persistence/saveSchema";
import type { NextSeasonSetup, SeasonSummary } from "../domain/seasonEnd";

export type GameAction =
  // Initialisation
  | { type: "LOAD_SAVE"; save: GameSaveV1 }
  | { type: "NEW_GAME"; save: GameSaveV1 }
  | { type: "SAVE_GAME" }
  | { type: "DELETE_SAVE" }

  // Joueur
  | { type: "UPDATE_PLAYER"; player: Partial<Player> }
  | { type: "INVEST_ATTRIBUTE"; attribute: keyof PlayerAttributes; amount: number }
  | { type: "UPDATE_CONDITION"; condition: Partial<Player["condition"]> }

  // Match
  | { type: "APPLY_MATCH_RESULT"; result: MatchResult }

  // Progression
  | { type: "ADVANCE_WEEK" }
  | { type: "ADVANCE_SEASON" }
  | { type: "END_SEASON"; setup: NextSeasonSetup; summary: SeasonSummary; paBonus: number }

  // Économie
  | { type: "CREDIT_WALLET"; amount: number; reason: string }
  | { type: "DEBIT_WALLET"; amount: number; reason: string }

  // Erreur
  | { type: "SET_ERROR"; message: string }
  | { type: "CLEAR_ERROR" };
