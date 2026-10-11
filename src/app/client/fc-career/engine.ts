/**
 * FC CAREER — Barre d'index du moteur.
 *
 * Le moteur historique (51 attributs FR, progression hebdomadaire)
 * vit dans ./engine/legacy-career.
 *
 * Le nouveau moteur vit dans ./engine/* :
 * - player-generator
 * - match-engine
 * - season-manager
 * - progression
 * - attribute-calculator
 * - economic-engine
 * - transfer-system
 *
 * IMPORTANT :
 * Ce fichier ne contient aucune logique métier.
 * Il centralise uniquement les exports publics du moteur.
 *
 * Cette séparation évite les déclarations dupliquées, les exports
 * placés à l'intérieur de fonctions et les erreurs Turbopack.
 */

export * from "./engine/legacy-career";

export {
  generatePlayer,
  createRng,
  groupSummary,
  clamp,
  type GenerationInput,
} from "./engine/player-generator";

export {
  simulateMatch,
  predictRating,
  selectionChance,
} from "./engine/match-engine";

export {
  createSeason,
  advanceSeason,
  nextUserFixture,
  computeStandings,
  generateRoundRobin,
} from "./engine/season-manager";

export {
  runTrainingSession,
  applyRest,
  endOfWeek,
  recommendedSessions,
  TRAINING_SESSIONS,
  type TrainingType,
  type SessionResult,
} from "./engine/progression";

export {
  computeOverall,
  computePotential,
  attributeCap,
  tryImproveAttribute,
  withAttributes,
} from "./engine/attribute-calculator";

export {
  emptyWallet,
  processWeeklyPayroll,
  computeMatchBonuses,
  refreshMarketValue,
  applySigningBonus,
  spend,
  sponsorPayout,
  TAX_RATE,
} from "./engine/economic-engine";

export {
  generateOffers,
  acceptOffer,
  counterOffer,
  isClubInterested,
  suggestSalary,
  isTransferWindowOpen,
  requestRaise,
} from "./engine/transfer-system";
