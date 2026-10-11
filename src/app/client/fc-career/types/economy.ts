/**
 * FC CAREER — Économie
 * Salaires, primes, sponsors, budget.
 */

export interface SponsorDeal {
  id: string;
  name: string; // ex: "Orange", "Uber Eats"
  type: "kit" | "stadium" | "training" | "personal";
  weeklyPayout: number; // € / semaine pour le joueur si personal
  visibilityRequirement: number; // minutes de jeu / image requis (0-100)
  yearsLeft: number;
}

export interface WeeklyEconomySummary {
  weekNumber: number;
  salaryEarned: number;
  matchBonuses: number;
  goalBonuses: number;
  sponsorIncome: number;
  taxes: number; // ~30% en France
  netEarned: number;
}

export interface Wallet {
  balance: number; // € disponibles
  totalEarned: number;
  spending: {
    lifestyle: number; // train de vie (villa, voiture...)
    agents: number; // commission agent (% du salaire)
    upgrades: number; // matériel perso, récupération
  };
  weeklyHistory: WeeklyEconomySummary[];
}

export interface SalaryOffer {
  clubId: string;
  clubName: string;
  salaryPerWeek: number;
  bonusPerMatch: number;
  bonusPerGoal: number;
  signingBonus: number;
  years: number;
  releaseClause: number;
  sportProject: number; // 0-100 (temps de jeu estimé, niveau équipe)
  expiresOnDay: number; // journée de fin de validité de l'offre
}

export interface TransferProposal {
  id: string;
  fromClubId: string;
  toClubId: string;
  fee: number; // indemnité de transfert €
  wageDemand: number;
  status: "pending" | "accepted" | "rejected" | "expired";
  proposedOnDay: number;
}
