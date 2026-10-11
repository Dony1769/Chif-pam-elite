/**

* FC CAREER — Point d'entrée du moteur.
* 
* Moteur legacy :
* ./engine/legacy-career
* 
* Nouveau moteur :
* ./engine/player-generator
* ./engine/match-engine
* ./engine/season-manager
* ./engine/progression
* ./engine/attribute-calculator
* ./engine/economic-engine
* ./engine/transfer-system
* 
* Ce fichier ne contient aucune logique métier.
* Il centralise uniquement les exports publics du moteur.
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
