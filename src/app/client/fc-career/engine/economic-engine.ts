/**
 * FC CAREER — Moteur économique : salaires, sponsors, primes, budget
 */

import type { Player } from "../types/player";
import type { Wallet, WeeklyEconomySummary, SponsorDeal } from "../types/economy";
import type { SimulatedMatch } from "../types/match";
import { getCompetition } from "../constants/competitions";
import type { CompetitionId } from "../types/club";

export const TAX_RATE = 0.3; // cotisations + IR simplifié

export function emptyWallet(): Wallet {
  return {
    balance: 0,
    totalEarned: 0,
    spending: { lifestyle: 0, agents: 0, upgrades: 0 },
    weeklyHistory: [],
  };
}

/** Primes de match issues du contrat + de la compétition. */
export function computeMatchBonuses(player: Player, match: SimulatedMatch): { matchBonus: number; goalBonus: number } {
  const comp = getCompetition(match.competitionId as CompetitionId);
  if (!match.userPlayed) return { matchBonus: 0, goalBonus: 0 };

  const userIsHome = match.homeClubId === player.contract.clubId;
  const scored = userIsHome ? match.homeScore > match.awayScore : match.awayScore > match.homeScore;
  const drew = match.homeScore === match.awayScore;

  const resultBonus = scored ? comp.bonuses.win : drew ? comp.bonuses.draw : 0;
  const matchBonus = player.contract.bonusPerMatch + resultBonus;
  const goalBonus = match.userRating.goals * (player.contract.bonusPerGoal + comp.bonuses.goal);
  return { matchBonus, goalBonus };
}

/** Revenus d'un sponsor perso selon visibilité (minutes jouées récentes). */
export function sponsorPayout(deal: SponsorDeal, recentMinutesPerWeek: number): number {
  if (deal.type !== "personal") return 0;
  const visibility = Math.min(100, (recentMinutesPerWeek / 90) * 100);
  return visibility >= deal.visibilityRequirement ? deal.weeklyPayout : 0;
}

/** Clôture d'une semaine : salaire + primes + sponsors - impôts - train de vie. */
export function processWeeklyPayroll(
  wallet: Wallet,
  player: Player,
  weekNumber: number,
  bonuses: { matchBonus: number; goalBonus: number },
  sponsors: SponsorDeal[],
  recentMinutesPerWeek: number,
  lifestyleCost: number,
): { wallet: Wallet; summary: WeeklyEconomySummary } {
  const salary = player.contract.salaryPerWeek;
  const sponsorIncome = sponsors.reduce((acc, s) => acc + sponsorPayout(s, recentMinutesPerWeek), 0);
  const gross = salary + bonuses.matchBonus + bonuses.goalBonus + sponsorIncome;
  const taxes = Math.round(gross * TAX_RATE);
  const agentFee = Math.round(salary * 0.05); // commission agent 5%
  const net = gross - taxes - agentFee - lifestyleCost;

  const summary: WeeklyEconomySummary = {
    weekNumber,
    salaryEarned: salary,
    matchBonuses: bonuses.matchBonus,
    goalBonuses: bonuses.goalBonus,
    sponsorIncome,
    taxes,
    netEarned: net,
  };

  const next: Wallet = {
    balance: wallet.balance + net,
    totalEarned: wallet.totalEarned + gross,
    spending: {
      lifestyle: wallet.spending.lifestyle + lifestyleCost,
      agents: wallet.spending.agents + agentFee,
      upgrades: wallet.spending.upgrades,
    },
    weeklyHistory: [...wallet.weeklyHistory, summary],
  };

  return { wallet: next, summary };
}

/** Signe un bonus à la signature encaissé immédiatement. */
export function applySigningBonus(wallet: Wallet, amount: number): Wallet {
  const net = Math.round(amount * (1 - TAX_RATE));
  return { ...wallet, balance: wallet.balance + net, totalEarned: wallet.totalEarned + amount };
}

/** Dépense (matériel, récupération, lifestyle). Retourne le wallet si solvable. */
export function spend(wallet: Wallet, amount: number, category: keyof Wallet["spending"]): Wallet | null {
  if (wallet.balance < amount) return null;
  return {
    ...wallet,
    balance: wallet.balance - amount,
    spending: { ...wallet.spending, [category]: wallet.spending[category] + amount },
  };
}

/** Valeur estimée du joueur pour l'affichage Économie (mise à jour après match). */
export function refreshMarketValue(player: Player, lastMatch: SimulatedMatch): Player {
  const momentum = lastMatch.userRating.rating >= 7.5 ? 1.08 : lastMatch.userRating.rating <= 5.5 ? 0.96 : 1;
  return { ...player, marketValue: Math.round(player.marketValue * momentum) };
}
