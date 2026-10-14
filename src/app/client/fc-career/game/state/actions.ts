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
import type { AcademyMatchContext, AcademyPostMatchEval } from "../domain/academySchedule";
import type { PromotionRelegationResult } from "../domain/worldSimulator";
import type { WorldTransferEvent } from "../domain/worldTransfers";
import type { LockerRoomEvent } from "../domain/lockerRoom";

export type GameAction =
  // Initialisation
  | { type: "LOAD_SAVE"; save: GameSaveV1 }
  | { type: "NEW_GAME"; save: GameSaveV1 }
  | { type: "SAVE_GAME" }
  | { type: "DELETE_SAVE" }

  // Joueur
  | { type: "UPDATE_PLAYER"; player: Partial<Player> }
  | { type: "INVEST_ATTRIBUTE"; attribute: keyof PlayerAttributes; amount: number }
  | { type: "BATCH_INVEST_ATTRIBUTES"; investments: Array<{ attribute: keyof PlayerAttributes; amount: number }> }
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

  // Santé & blessures
  | { type: "APPLY_INJURY"; injury: import("../domain/player").PlayerInjury }
  | { type: "HEAL_INJURY" }

  // Médias & Réputation
  | { type: "UPDATE_MEDIA"; mediaRepDelta: number; conference: import("../persistence/saveSchema").PressConference }

  // Fans
  | { type: "UPDATE_FANS"; fanRatingDelta: number; followersDelta: number; event?: import("../persistence/saveSchema").FanEvent }

  // Sponsors
  | { type: "SIGN_SPONSOR"; contract: import("../persistence/saveSchema").SponsorContract }

  // Journal
  | { type: "ADD_JOURNAL_ENTRY"; entry: import("../persistence/saveSchema").JournalEntry }

  // Défis de carrière
  | { type: "ACTIVATE_CHALLENGE"; challengeId: string }
  | { type: "SYNC_CHALLENGES" }

  // Académie
  | { type: "INIT_ACADEMY_SCHEDULE" }
  | { type: "SET_ACADEMY_MATCH_CONTEXT"; context: AcademyMatchContext }
  | { type: "APPLY_ACADEMY_MATCH_EVAL"; fixtureId: string; eval: AcademyPostMatchEval }
  | { type: "UPDATE_YOUTH_LEAGUE_STANDING"; scoreAcademy: number; scoreOpp: number; opponentId: string }

  // Relégation / Promotion
  | { type: "APPLY_PROMOTION_RELEGATION"; results: PromotionRelegationResult[] }
  | { type: "UPDATE_CLUB_REPUTATION_END_SEASON" }

  // Transferts monde
  | { type: "AGE_WORLD_PLAYERS" }
  | { type: "SIMULATE_WORLD_TRANSFERS_SEASON" }
  | { type: "ADD_WORLD_TRANSFER_EVENTS"; events: WorldTransferEvent[] }

  // Rivaux évolutifs
  | { type: "INIT_RIVALS" }
  | { type: "SEASON_END_RIVALS" }

  // Vestiaire
  | { type: "UPDATE_LOCKER_ROOM"; cohesionDelta?: number; leadershipDelta?: number; event?: LockerRoomEvent }

  // Vie personnelle
  | { type: "PERSONAL_EVENT_RESPONSE"; eventId: string; accepted: boolean }
  | { type: "TRIGGER_PERSONAL_EVENT"; event: import("../domain/personalLife").PersonalLifeEvent }

  // Erreur
  | { type: "SET_ERROR"; message: string }
  | { type: "CLEAR_ERROR" };
