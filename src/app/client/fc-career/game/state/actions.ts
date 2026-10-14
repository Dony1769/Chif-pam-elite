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
import type { SimulatedMatchResult } from "../domain/worldSimulator";
import type { CoachProfile, CoachConversation } from "../domain/coach";
import type { AgentProfile, ContractOffer } from "../domain/agent";

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

  // Progression du temps
  | { type: "ADVANCE_WEEK" }
  | { type: "ADVANCE_SEASON" }
  | { type: "END_SEASON"; setup: NextSeasonSetup; summary: SeasonSummary; paBonus: number }
  /**
   * Choix d'intensité d'entraînement pour la semaine.
   * N'avance PAS le temps — enregistre juste le choix dans weekState.
   */
  | { type: "SET_TRAINING_CHOICE"; intensity: "light" | "normal" | "intense" }
  /**
   * Terminer la semaine depuis le Dashboard.
   * Applique l'entraînement, crédite le salaire, incrémente week/matchday.
   * Réinitialise weekState pour la semaine suivante.
   */
  | { type: "COMMIT_WEEK" }
  /** Marqué depuis le Dashboard après que le match de la semaine a été joué */
  | { type: "MARK_MATCH_PLAYED" }

  // Monde vivant
  | { type: "SIMULATE_WORLD_MATCHDAY"; matchday: number; results: SimulatedMatchResult[]; leagueId: string }

  // Économie
  | { type: "CREDIT_WALLET"; amount: number; reason: string }
  | { type: "DEBIT_WALLET"; amount: number; reason: string }

  // Coach
  | { type: "UPDATE_COACH"; coach: Partial<CoachProfile> }
  | { type: "ADD_COACH_CONVERSATION"; conversation: CoachConversation }
  | { type: "APPLY_MATCH_TRUST_DELTA"; matchRating: number; minutesPlayed: number }

  // Agent & Contrats
  | { type: "HIRE_AGENT"; agent: AgentProfile }
  | { type: "FIRE_AGENT" }
  | { type: "ADD_CONTRACT_OFFER"; offer: ContractOffer }
  | { type: "RESPOND_CONTRACT_OFFER"; offerId: string; accepted: boolean }
  | { type: "REQUEST_OFFERS" }

  // Erreur
  | { type: "SET_ERROR"; message: string }
  | { type: "CLEAR_ERROR" };
