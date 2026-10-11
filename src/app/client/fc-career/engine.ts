/**
 * FC CAREER — Barre d'index du moteur.
 *
 * Le moteur historique (51 attributs FR, progression hebdomadaire) vit dans
 * `./engine/legacy-career`. Le nouveau moteur (génération de joueur, matchs,
 * saison, progression, économie, transferts) vit dans `./engine/*`.
 *
 * Ce fichier ne contient AUCUNE logique : il ré-exporte uniquement, afin
 * d'éviter les imports circulaires et les erreurs "Module not found" chez
 * Vercel/Turbopack.
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
