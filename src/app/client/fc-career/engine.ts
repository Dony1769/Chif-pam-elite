/**
 * FC CAREER — Barre d'index du moteur (ré-exports)
 * Permet `import { createInitialPlayer } from "../engine"` dans les pages.
 */

export {
  createRng,
  generatePlayer,
  clamp,
  groupSummary,
} from "./player-generator";
export type { GenerationInput } from "./player-generator";

export {
  computeOverall,
  computePotential,
  attributeCap,
  tryImproveAttribute,
  withAttributes,
} from "./attribute-calculator";

export { predictRating, simulateMatch, selectionChance } from "./match-engine";

export {
  TRAINING_SESSIONS,
  runTrainingSession,
  applyRest,
  endOfWeek,
  recommendedSessions,
} from "./progression";
export type { TrainingType, TrainingSessionDef, SessionResult } from "./progression";

export {
  generateRoundRobin,
  createSeason,
  advanceSeason,
  nextUserFixture,
  computeStandings,
} from "./season-manager";

export * from "./transfer-system";
export * from "./economic-engine";

/* ------------------------------------------------------------------ */
/* Fabrique de joueur pour l'onboarding (create-player)               */
/* ------------------------------------------------------------------ */

import type { Player, Morphology } from "./types/player";
import type { PositionId, PlayingStyleId } from "./constants/positions";
import { getClub } from "./constants/clubs";
import { generatePlayer } from "./engine/player-generator";
import { suggestSalary } from "./engine/transfer-system";
import type { AcademyLevel } from "./types";

export interface CreateInitialPlayerInput {
  firstName: string;
  lastName: string;
  age: number;
  position: PositionId;
  secondaryPositions?: PositionId[];
  style: PlayingStyleId;
  morphology: Morphology;
  heightCm: number;
  weightKg: number;
  foot?: "left" | "right" | "both";
  nationality?: string;
  academy?: AcademyLevel;
  clubId: string;
  seed?: number;
}

/**
 * Crée le joueur initial à partir du formulaire de création.
 * L'académie influence le niveau de départ (+ bonus d'attributs).
 */
export function createInitialPlayer(input: CreateInitialPlayerInput): Player {
  const academyBonus =
    input.academy === "prestige" ? 5 : input.academy === "national" ? 3 : input.academy === "regional" ? 1 : 0;

  const player = generatePlayer(
    {
      firstName: input.firstName.trim() || "Alex",
      lastName: input.lastName.trim() || "Morgan",
      age: Math.max(16, Math.min(35, input.age)),
      position: input.position,
      secondaryPositions: input.secondaryPositions ?? [],
      style: input.style,
      morphology: input.morphology,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      nationality: input.nationality ?? "FR",
    },
    input.seed ?? Date.now(),
  );

  // Bonus académie appliqué uniformément (plafonné à 99).
  if (academyBonus > 0) {
    for (const key of Object.keys(player.attributes)) {
      player.attributes[key] = Math.min(99, player.attributes[key] + academyBonus);
    }
    player.overall = Math.min(99, player.overall + academyBonus);
    player.potential = Math.min(99, player.potential + academyBonus);
  }

  // Pied préféré choisi par l'utilisateur.
  if (input.foot) player.foot = input.foot;

  // Salaire de départ cohérent avec le club et l'overall.
  const club = getClub(input.clubId);
  if (club) {
    player.contract.clubId = club.id;
    player.contract.salaryPerWeek = suggestSalary(club.division, player.overall);
  }

  return player;
}
