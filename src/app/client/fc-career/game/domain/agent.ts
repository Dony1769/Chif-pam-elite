/**
 * FC CAREER — Domaine : Agent & Contrats
 * Gestion de l'agent du joueur, des offres de contrat, et des transferts.
 */

import type { PlayerContract } from "./player";
import type { Transfer } from "./economy";
import type { CareerPhase } from "./career";
import type { AcademyState } from "./career";

// ── Agent ────────────────────────────────────────────────────────────────────

export type AgentTier = "none" | "local" | "regional" | "elite";

export interface AgentProfile {
  id: string;
  name: string;
  tier: AgentTier;
  /** Pourcentage prélevé sur les transferts (0–15) */
  commissionPct: number;
  /** Bonus de négociation salaire (0–20%) */
  salaryBoostPct: number;
  /** Description du style / réseau */
  specialty: string;
  /** Saison depuis laquelle l'agent est actif */
  hiredSeason: number;
}

// ── Offres de contrat ─────────────────────────────────────────────────────────

export type ContractOfferStatus =
  | "pending"    // en attente de réponse
  | "accepted"
  | "rejected"
  | "expired";   // semaine dépassée

/**
 * Type d'offre — discriminant pour la transition de carrière.
 * - academy_recruitment : recrutement dans une académie (reste en phase academy)
 * - academy_promotion   : promotion interne U18/U21/réserve (reste en phase academy)
 * - professional        : premier contrat professionnel (passage à la phase professional)
 * - transfer            : transfert entre deux clubs professionnels (même phase, nouveau club)
 */
export type ContractOfferType =
  | "academy_recruitment"
  | "academy_promotion"
  | "professional"
  | "transfer";

export interface ContractOffer {
  id: string;
  clubId: string;
  clubName: string;
  season: number;
  week: number;
  /** Type d'offre — discriminant pour la transition de carrière */
  offerType: ContractOfferType;
  /** Phase cible après acceptation */
  targetPhase: CareerPhase;
  /** Étape académie cible (si offerType est academy_*) */
  targetAcademyStage?: AcademyState["stage"];
  /** Contrat proposé */
  terms: PlayerContract;
  /** Indemnité de transfert demandée (0 = joueur libre) */
  transferFee: number;
  isLoan: boolean;
  loanEndSeason?: number;
  status: ContractOfferStatus;
  /** Message du club (flavor text) */
  message: string;
  /** Expire dans combien de semaines */
  expiresInWeeks: number;
}

// ── État agent & contrats ────────────────────────────────────────────────────

export interface AgentState {
  agent: AgentProfile | null;
  /** Offres actives + historique (toutes) */
  offers: ContractOffer[];
  /** Historique des transferts déjà effectués */
  transfers: Transfer[];
  /** Demandes envoyées (ne pas en envoyer deux de suite) */
  lastRequestWeek: number | null;
}

// ── Factories ────────────────────────────────────────────────────────────────

export function createInitialAgentState(): AgentState {
  return {
    agent: null,
    offers: [],
    transfers: [],
    lastRequestWeek: null,
  };
}

const AGENTS: Omit<AgentProfile, "id" | "hiredSeason">[] = [
  {
    name: "Marco Silva",
    tier: "local",
    commissionPct: 5,
    salaryBoostPct: 5,
    specialty: "Spécialiste des jeunes talents locaux",
  },
  {
    name: "Isabelle Fontaine",
    tier: "regional",
    commissionPct: 8,
    salaryBoostPct: 10,
    specialty: "Réseau Europe du Sud — La Liga & Ligue 1",
  },
  {
    name: "David Okafor",
    tier: "elite",
    commissionPct: 12,
    salaryBoostPct: 20,
    specialty: "Grands clubs européens & négociations internationales",
  },
];

export function getAvailableAgents(season: number): AgentProfile[] {
  return AGENTS.map((a, i) => ({
    ...a,
    id: `agent-${i + 1}`,
    hiredSeason: season,
  }));
}

// ── Génération d'offres ─────────────────────────────────────────────────────

export interface OfferParams {
  clubId: string;
  clubName: string;
  playerOverall: number;
  playerReputation: number;
  season: number;
  week: number;
  currentSalary: number;
  agentBoostPct: number;
  /** Type d'offre — à fournir explicitement pour garantir la bonne transition de carrière */
  offerType: ContractOfferType;
  /** Phase cible après acceptation */
  targetPhase: CareerPhase;
  /** Étape académie cible si offerType est academy_* */
  targetAcademyStage?: AcademyState["stage"];
}

const OFFER_MESSAGES = [
  "Le club est très intéressé par votre profil. Nous espérons vous voir dans nos rangs.",
  "Notre entraîneur a personnellement demandé à vous recruter pour la prochaine saison.",
  "Nous construisons un projet ambitieux et vous en êtes un pilier central.",
  "Après avoir suivi vos performances, nous sommes convaincus que vous correspondez à nos ambitions.",
  "C'est une opportunité unique de faire partie d'un club en pleine ascension.",
];

function seededRandInt(seed: string, min: number, max: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return min + (h % (max - min + 1));
}

export function generateContractOffer(params: OfferParams): ContractOffer {
  const {
    clubId, clubName, playerOverall, playerReputation,
    season, week, currentSalary, agentBoostPct,
    offerType, targetPhase, targetAcademyStage,
  } = params;

  const seed = `${clubId}-${season}-${week}-${playerOverall}`;
  const msgIdx = seededRandInt(seed + "msg", 0, OFFER_MESSAGES.length - 1);

  // Calcul du salaire proposé
  const baseSalaryMultiplier = 1.0 + (playerOverall - 50) / 100;
  const agentBonus = 1 + agentBoostPct / 100;
  const proposedSalary = Math.round(
    Math.max(currentSalary * 1.05, 1000 * baseSalaryMultiplier * agentBonus)
  );

  // Durée du contrat : 1-4 ans selon réputation
  const duration = seededRandInt(seed + "dur",
    playerReputation >= 70 ? 2 : 1,
    playerReputation >= 70 ? 4 : 3
  );

  // Bonus
  const bonusGoal   = Math.round(proposedSalary * seededRandInt(seed + "bg", 5, 15) / 100);
  const bonusAssist = Math.round(proposedSalary * seededRandInt(seed + "ba", 3, 8) / 100);

  // Frais de transfert
  const transferFee = playerReputation >= 50
    ? seededRandInt(seed + "fee", 50_000, 500_000) * Math.round(playerOverall / 10)
    : 0;

  const roleMap: ContractOffer["terms"]["role"][] = ["squad", "starter", "key", "captain"];
  const roleIdx = Math.min(
    3,
    Math.floor(playerReputation / 30),
  );

  return {
    id: `offer-${clubId}-${season}-${week}`,
    clubId,
    clubName,
    season,
    week,
    offerType,
    targetPhase,
    ...(targetAcademyStage !== undefined ? { targetAcademyStage } : {}),
    terms: {
      clubId,
      salary: proposedSalary,
      bonusGoal,
      bonusAssist,
      startSeason: season,
      endSeason: season + duration,
      role: roleMap[roleIdx] ?? "squad",
    },
    transferFee,
    isLoan: false,
    status: "pending",
    message: OFFER_MESSAGES[msgIdx],
    expiresInWeeks: 3,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function agentTierLabel(tier: AgentTier): string {
  const labels: Record<AgentTier, string> = {
    none: "Aucun",
    local: "Local",
    regional: "Régional",
    elite: "Élite",
  };
  return labels[tier];
}

export function formatFee(amount: number): string {
  if (amount === 0) return "Libre";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M€`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k€`;
  return `${amount}€`;
}

export function formatSalary(weeklyAmount: number): string {
  return `${weeklyAmount.toLocaleString("fr-FR")}€/sem`;
}
