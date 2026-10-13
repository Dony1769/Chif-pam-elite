/**
 * FC CAREER — Moteur Académie → Pro
 * Gère la progression U17 → U19 → Réserve → Équipe Première.
 * Règles de promotion, appels en première, et sortie d'académie.
 */

import type { Player, CareerStage, AcademyStatus, AcademyLevel } from "../types/player";

/** Seuils de promotion (overall minimum requis). */
const PROMOTION_THRESHOLDS: Record<CareerStage, { minOverall: number; minAvgRating: number; minMatches: number }> = {
  u17: { minOverall: 55, minAvgRating: 6.5, minMatches: 15 },
  u19: { minOverall: 62, minAvgRating: 6.5, minMatches: 20 },
  reserve: { minOverall: 68, minAvgRating: 6.5, minMatches: 25 },
  pro: { minOverall: 0, minAvgRating: 0, minMatches: 0 }, // déjà pro
};

/** Nombre de matchs par saison à chaque niveau. */
export const MATCHES_PER_SEASON: Record<CareerStage, number> = {
  u17: 22,
  u19: 28,
  reserve: 32,
  pro: 38,
};

/** Âge typique par niveau. */
export const AGE_RANGE: Record<CareerStage, [number, number]> = {
  u17: [14, 16],
  u19: [16, 18],
  reserve: [17, 21],
  pro: [17, 40],
};

/** Stage suivant dans le parcours académie. */
const NEXT_STAGE: Partial<Record<CareerStage, CareerStage>> = {
  u17: "u19",
  u19: "reserve",
  reserve: "pro",
};

/** Labels pour l'UI. */
export const STAGE_LABELS: Record<CareerStage, string> = {
  u17: "Académie U17",
  u19: "Académie U19",
  reserve: "Équipe réserve",
  pro: "Équipe première",
};

/** Crée un statut académie initial. */
export function createAcademyStatus(stage: CareerStage): AcademyStatus {
  return {
    stage,
    matchesAtLevel: 0,
    averageRatingAtLevel: 0,
    firstTeamCallUps: 0,
    seasonsAtLevel: 0,
    promotionPending: false,
  };
}

/** Détermine le stage initial en fonction de l'âge. */
export function initialStageForAge(age: number): CareerStage {
  if (age <= 16) return "u17";
  if (age <= 18) return "u19";
  if (age <= 20) return "reserve";
  return "pro";
}

/**
 * Vérifie si le joueur remplit les critères de promotion.
 * Appelé en fin de saison ou mi-saison exceptionnelle.
 */
export function checkPromotion(player: Player): {
  eligible: boolean;
  nextStage: CareerStage | null;
  reason: string;
} {
  const { academy } = player;
  const { stage } = academy;

  if (stage === "pro") {
    return { eligible: false, nextStage: null, reason: "Déjà en équipe première." };
  }

  const threshold = PROMOTION_THRESHOLDS[stage];
  const next = NEXT_STAGE[stage]!;

  if (player.overall < threshold.minOverall) {
    return { eligible: false, nextStage: null, reason: `Overall insuffisant (${player.overall}/${threshold.minOverall}).` };
  }

  if (academy.averageRatingAtLevel < threshold.minAvgRating) {
    return { eligible: false, nextStage: null, reason: `Note moyenne insuffisante (${academy.averageRatingAtLevel.toFixed(1)}/${threshold.minAvgRating}).` };
  }

  if (academy.matchesAtLevel < threshold.minMatches) {
    return { eligible: false, nextStage: null, reason: `Pas assez de matchs (${academy.matchesAtLevel}/${threshold.minMatches}).` };
  }

  return { eligible: true, nextStage: next, reason: `Promotion vers ${STAGE_LABELS[next]} !` };
}

/**
 * Applique la promotion : monte le joueur au niveau suivant.
 */
export function applyPromotion(player: Player): Player {
  const { academy } = player;
  const next = NEXT_STAGE[academy.stage];
  if (!next) return player;

  return {
    ...player,
    academy: {
      ...createAcademyStatus(next),
      seasonsAtLevel: 0,
    },
    contract: {
      ...player.contract,
      isProfessional: next === "pro",
      salaryPerWeek: next === "pro"
        ? Math.max(player.contract.salaryPerWeek, computeProSalary(player.overall))
        : computeAcademySalary(next),
    },
  };
}

/** Salaire en académie. */
function computeAcademySalary(stage: CareerStage): number {
  switch (stage) {
    case "u17": return 50;   // bourse 50€/semaine
    case "u19": return 100;  // bourse 100€/semaine
    case "reserve": return 400; // contrat stagiaire ~1600€/mois
    default: return 500;
  }
}

/** Salaire pro de base basé sur l'overall. */
function computeProSalary(overall: number): number {
  if (overall >= 80) return 15_000;
  if (overall >= 75) return 8_000;
  if (overall >= 70) return 4_000;
  if (overall >= 65) return 2_000;
  return 800;
}

/**
 * Scénarios de sortie d'académie (Étape 3.4).
 * Appelé quand un joueur de réserve finit sa saison.
 */
export type ExitScenario = "A" | "B" | "C" | "D";

export function determineExitScenario(player: Player): {
  scenario: ExitScenario;
  description: string;
} {
  const { overall, academy } = player;
  const avg = academy.averageRatingAtLevel;

  if (overall >= 70 && avg > 7.5) {
    return {
      scenario: "A",
      description: "Exceptionnel ! Contrat pro en équipe première. Des grands clubs vous contactent.",
    };
  }

  if (overall >= 65 && avg >= 6.5) {
    return {
      scenario: "B",
      description: "Bon niveau. Contrat pro disponible (remplaçant en D1 ou titulaire en D2).",
    };
  }

  if (overall >= 58) {
    return {
      scenario: "C",
      description: "Le club vous libère. Des clubs de D2/D3 s'intéressent à vous.",
    };
  }

  return {
    scenario: "D",
    description: "Pas encore prêt. Le club vous garde une saison de plus en réserve.",
  };
}

/**
 * Vérifie si un joueur de réserve peut être appelé en première.
 * Max 3 appels/saison, nécessite 3+ blessés au même poste.
 */
export function canCallUpToFirstTeam(player: Player): boolean {
  if (player.academy.stage !== "reserve") return false;
  if (player.academy.firstTeamCallUps >= 3) return false;
  return true;
}

/**
 * Met à jour les stats académie après un match.
 */
export function updateAcademyAfterMatch(player: Player, matchRating: number): Player {
  const { academy } = player;
  const newMatches = academy.matchesAtLevel + 1;
  const newAvg = (academy.averageRatingAtLevel * academy.matchesAtLevel + matchRating) / newMatches;

  return {
    ...player,
    academy: {
      ...academy,
      matchesAtLevel: newMatches,
      averageRatingAtLevel: Math.round(newAvg * 100) / 100,
    },
  };
}

/**
 * Fin de saison académie : incrémente le compteur et vérifie la promotion.
 */
export function endOfAcademySeason(player: Player): Player {
  return {
    ...player,
    academy: {
      ...player.academy,
      seasonsAtLevel: player.academy.seasonsAtLevel + 1,
    },
  };
}
