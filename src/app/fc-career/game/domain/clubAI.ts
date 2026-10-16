/**
 * FC CAREER — IA des clubs et directions
 * Recrutement, ventes, budget, objectifs, philosophies, décisions autonomes.
 * Pure fonction — aucune dépendance React ni globalstate.
 */

import type { Club } from "./club";
import type { WorldPlayer } from "../data/worldPlayers";
import type { WorldCoach } from "./worldCoach";
import { createRng, seedFromString } from "../utils/random";

// ─── Types enrichis pour la direction ────────────────────────────────────────

export interface ClubDirectorAI {
  clubId: string;
  /** Patience envers le coach 0-100 (influence les licenciements) */
  patience: number;
  /** Ambition 0-100 (objectifs plus ou moins élevés) */
  ambition: number;
  /** Investissement sur les jeunes 0-100 */
  youthInvestment: number;
  /** Budget transfert restant en cours de saison */
  remainingTransferBudget: number;
  /** Budget salaires hebdo restant */
  remainingWagesBudget: number;
  /** Objectif sportif saison */
  seasonTarget: ClubSeasonTarget;
}

export type ClubSeasonTarget =
  | "win_title"
  | "top_3"
  | "top_half"
  | "survive_relegation"
  | "gain_promotion"
  | "mid_table"
  | "develop_youth";

// ─── Déduction de l'objectif selon réputation et niveau ──────────────────────

export function deriveSeasonTarget(club: Club, leagueSize: number): ClubSeasonTarget {
  const rep = club.reputation;
  const tier = club.tier;

  if (tier === 2) {
    if (rep >= 55) return "gain_promotion";
    if (rep >= 40) return "top_half";
    return "survive_relegation";
  }

  // Division 1
  if (rep >= 85) return "win_title";
  if (rep >= 75) return "top_3";
  if (rep >= 65) return "top_half";
  if (rep >= 50) return "mid_table";
  return "survive_relegation";
}

// ─── Initialisation de la direction ──────────────────────────────────────────

export function createClubDirectorAI(
  club: Club,
  leagueSize: number,
  seed: string,
): ClubDirectorAI {
  const rng = createRng(seedFromString(seed));

  return {
    clubId: club.id,
    patience: rng.int(30, 85),
    ambition: Math.round(club.reputation * 0.7 + rng.int(-10, 20)),
    youthInvestment: rng.int(20, 90),
    remainingTransferBudget: club.transferBudget,
    remainingWagesBudget: club.wagesBudget,
    seasonTarget: deriveSeasonTarget(club, leagueSize),
  };
}

// ─── IA de recrutement ────────────────────────────────────────────────────────

export interface RecruitmentNeed {
  position: string;
  priority: "critical" | "important" | "nice_to_have";
  maxBudget: number;
  minOvr: number;
}

/**
 * Analyse l'effectif d'un club et détermine ses besoins de recrutement.
 */
export function analyzeRecruitmentNeeds(
  club: Club,
  squad: WorldPlayer[],
  director: ClubDirectorAI,
): RecruitmentNeed[] {
  const needs: RecruitmentNeed[] = [];

  // Compter les joueurs par poste
  const byCounts: Record<string, number> = {};
  for (const p of squad) {
    byCounts[p.position] = (byCounts[p.position] ?? 0) + 1;
  }

  // Besoins minimaux par poste
  const minRequired: Record<string, number> = {
    GK: 2, CB: 3, LB: 1, RB: 1, DM: 1, CM: 2, AM: 1, LW: 1, RW: 1, ST: 2,
  };

  const targetOvr = Math.round(club.reputation * 0.75 + 30); // OVR cible selon réputation
  const budgetPerPlayer = Math.round(director.remainingTransferBudget * 0.3);

  for (const [pos, min] of Object.entries(minRequired)) {
    const current = byCounts[pos] ?? 0;
    if (current < min) {
      needs.push({
        position: pos,
        priority: current === 0 ? "critical" : current < min - 1 ? "important" : "nice_to_have",
        maxBudget: budgetPerPlayer,
        minOvr: targetOvr - 8,
      });
    }
  }

  // Besoins qualitatifs : si la moyenne OVR est faible
  const avgOvr = squad.length > 0
    ? squad.reduce((s, p) => s + p.overall, 0) / squad.length
    : 50;

  if (avgOvr < targetOvr - 5 && director.remainingTransferBudget > 200_000) {
    needs.push({
      position: "CM", // milieu en général
      priority: "nice_to_have",
      maxBudget: Math.round(director.remainingTransferBudget * 0.2),
      minOvr: targetOvr,
    });
  }

  return needs;
}

// ─── IA : Décision d'achat ────────────────────────────────────────────────────

export interface TransferDecision {
  accept: boolean;
  reason: string;
  counterOffer?: number; // montant contre-offre si refus
}

/**
 * Un club décide d'accepter ou non un transfert entrant.
 */
export function evaluateIncomingTransfer(
  buyingClub: Club,
  playerOvr: number,
  proposedFee: number,
  proposedSalary: number,
  director: ClubDirectorAI,
  hasPositionNeed: boolean,
): TransferDecision {
  const canAffordFee    = proposedFee <= director.remainingTransferBudget;
  const canAffordSalary = proposedSalary <= director.remainingWagesBudget;
  const meetsOvrTarget  = playerOvr >= (buyingClub.reputation * 0.7 + 25);

  if (!canAffordFee) {
    const counter = Math.round(director.remainingTransferBudget * 0.8);
    return { accept: false, reason: "Budget insuffisant.", counterOffer: counter };
  }
  if (!canAffordSalary) {
    return { accept: false, reason: "Trop élevé pour la masse salariale." };
  }
  if (!meetsOvrTarget && !hasPositionNeed) {
    return { accept: false, reason: "Le joueur ne correspond pas au profil recherché." };
  }

  return { accept: true, reason: "Offre acceptée." };
}

/**
 * Un club décide d'accepter ou non une offre de vente pour l'un de ses joueurs.
 */
export function evaluateOutgoingTransfer(
  sellingClub: Club,
  player: WorldPlayer,
  offeredFee: number,
  director: ClubDirectorAI,
  isKeyPlayer: boolean,
): TransferDecision {
  // Estimation de la valeur minimale
  const minAcceptable = player.marketValue * 0.7;

  if (offeredFee < minAcceptable) {
    return {
      accept: false,
      reason: "Offre trop basse.",
      counterOffer: Math.round(player.marketValue * 0.9),
    };
  }

  // Joueur clé : moins enclins à vendre
  if (isKeyPlayer && director.ambition >= 60 && offeredFee < player.marketValue * 1.3) {
    return {
      accept: false,
      reason: "Joueur indispensable — prix insuffisant.",
      counterOffer: Math.round(player.marketValue * 1.4),
    };
  }

  // Budget serré : vente acceptable
  if (director.remainingTransferBudget < sellingClub.transferBudget * 0.2) {
    return { accept: true, reason: "Vente acceptée — besoin de trésorerie." };
  }

  return { accept: true, reason: "Offre acceptable." };
}

// ─── IA joueur : Décision d'accepter un transfert ────────────────────────────

export interface PlayerTransferDecision {
  accept: boolean;
  reason: string;
}

/**
 * Un joueur monde décide d'accepter ou non un transfert.
 * Facteurs : salaire, prestige, temps de jeu, ambitions.
 */
export function playerDecideTransfer(
  player: WorldPlayer,
  currentClubReputation: number,
  offerClubReputation: number,
  proposedSalary: number,
  currentSalary: number,
  proposedRole: "starter" | "rotation" | "squad",
  rng: ReturnType<typeof createRng>,
): PlayerTransferDecision {
  let score = 0;

  // Salaire
  const salaryRatio = proposedSalary / Math.max(currentSalary, 1);
  if (salaryRatio >= 1.3)      score += 30;
  else if (salaryRatio >= 1.1) score += 15;
  else if (salaryRatio < 0.9)  score -= 25;

  // Prestige club
  const repDiff = offerClubReputation - currentClubReputation;
  if (repDiff > 15)       score += 25;
  else if (repDiff > 5)   score += 10;
  else if (repDiff < -15) score -= 20;
  else if (repDiff < -5)  score -= 8;

  // Rôle proposé
  if (proposedRole === "starter")  score += 20;
  if (proposedRole === "rotation") score += 5;
  if (proposedRole === "squad")    score -= 10;

  // Personnalité
  if (player.personality === "prodigy" && offerClubReputation > 75) score += 15;
  if (player.personality === "veteran") score -= 10; // préfère la stabilité
  if (player.personality === "journeyman") score += 5; // mobilité

  // Bruit aléatoire
  score += rng.int(-10, 10);

  return {
    accept: score >= 40,
    reason: score >= 40 ? "Transfert accepté." : "Le joueur refuse — conditions non satisfaisantes.",
  };
}

// ─── IA joueur : Décision de renouveler le contrat ───────────────────────────

export function playerDecideContractRenewal(
  player: WorldPlayer,
  proposedSalary: number,
  currentSalary: number,
  clubReputation: number,
  rng: ReturnType<typeof createRng>,
): { accept: boolean; reason: string } {
  let score = 50;

  const ratio = proposedSalary / Math.max(currentSalary, 1);
  if (ratio >= 1.2)      score += 20;
  else if (ratio >= 1.0) score += 5;
  else                   score -= 20;

  // Les joueurs vieillissants acceptent plus facilement
  if (player.age >= 33) score += 15;
  if (player.personality === "veteran") score += 10;
  if (player.personality === "prodigy" && clubReputation < 70) score -= 15;

  score += rng.int(-10, 10);

  return {
    accept: score >= 50,
    reason: score >= 50 ? "Renouvellement accepté." : "Refus — le joueur cherche mieux.",
  };
}

// ─── IA : Objectifs et évaluation en fin de saison ───────────────────────────

export interface SeasonEvaluation {
  targetMet: boolean;
  score: number; // 0-100
  summary: string;
  actions: ("fire_coach" | "invest_transfers" | "sell_players" | "promote_youth" | "renew_coach")[];
}

export function evaluateClubSeason(
  club: Club,
  director: ClubDirectorAI,
  leaguePosition: number,
  totalClubs: number,
  coach: WorldCoach,
): SeasonEvaluation {
  const target = director.seasonTarget;
  let targetMet = false;
  let score = 50;

  switch (target) {
    case "win_title":
      targetMet = leaguePosition === 1;
      score = targetMet ? 100 : Math.max(10, 80 - leaguePosition * 10);
      break;
    case "top_3":
      targetMet = leaguePosition <= 3;
      score = targetMet ? 85 : Math.max(10, 70 - (leaguePosition - 3) * 8);
      break;
    case "top_half":
      targetMet = leaguePosition <= Math.ceil(totalClubs / 2);
      score = targetMet ? 75 : Math.max(10, 60 - (leaguePosition - totalClubs / 2) * 5);
      break;
    case "gain_promotion":
      targetMet = leaguePosition <= 3; // top 3 = promotion
      score = targetMet ? 100 : Math.max(5, 50 - (leaguePosition - 3) * 8);
      break;
    case "survive_relegation":
      targetMet = leaguePosition <= totalClubs - 3;
      score = targetMet ? 70 : 20;
      break;
    case "mid_table":
      targetMet = leaguePosition >= Math.floor(totalClubs * 0.3) && leaguePosition <= Math.ceil(totalClubs * 0.7);
      score = targetMet ? 70 : 45;
      break;
    case "develop_youth":
      targetMet = true; // always possible
      score = 65 + Math.round(coach.skills.youthDevelopment * 0.2);
      break;
  }

  const actions: SeasonEvaluation["actions"] = [];

  if (!targetMet && score < 40) {
    actions.push("fire_coach");
  } else if (targetMet && score >= 80) {
    actions.push("renew_coach");
  }

  if (director.remainingTransferBudget > club.transferBudget * 0.4) {
    actions.push("invest_transfers");
  }

  if (director.youthInvestment >= 60) {
    actions.push("promote_youth");
  }

  const summaries: Record<string, string> = {
    win_title: targetMet ? "Championnat remporté !" : "L'objectif titre n'a pas été atteint.",
    top_3: targetMet ? "Top 3 atteint." : "L'équipe a manqué le podium.",
    gain_promotion: targetMet ? "Promotion obtenue !" : "Promotion manquée.",
    survive_relegation: targetMet ? "Maintien assuré." : "Relégation.",
    top_half: targetMet ? "Milieu de tableau atteint." : "Saison décevante.",
    mid_table: targetMet ? "Milieu de tableau — objectif atteint." : "En dessous des attentes.",
    develop_youth: "Saison de développement.",
  };

  return {
    targetMet,
    score,
    summary: summaries[target] ?? "Saison terminée.",
    actions,
  };
}

// ─── IA Agent monde : proposition de transferts ───────────────────────────────

/**
 * Génère une demande de transfert initiale d'un agent pour son joueur.
 * Retourne le prix de départ des négociations.
 */
export function agentInitialDemand(
  player: WorldPlayer,
  interestedClubReputation: number,
  currentClubReputation: number,
  rng: ReturnType<typeof createRng>,
): { fee: number; salary: number; role: "starter" | "rotation" } {
  // Les agents surévaluent toujours
  const feeMultiplier = 1.15 + rng.float(0, 0.35);
  const fee = Math.round(player.marketValue * feeMultiplier / 1000) * 1000;

  // Salaire : hausse selon niveau du club acheteur
  const salaryBase = 500 + player.overall * 60;
  const clubBonus = interestedClubReputation > currentClubReputation ? 1.2 : 1.0;
  const salary = Math.round(salaryBase * clubBonus * rng.float(1.0, 1.2) / 50) * 50;

  const role: "starter" | "rotation" = player.overall >= 73 ? "starter" : "rotation";

  return { fee, salary, role };
}
