/**
 * FC CAREER — Transferts, contrats, offres de clubs
 */

import type { Player } from "../types/player";
import type { Club } from "../types/club";
import type { SalaryOffer, TransferProposal } from "../types/economy";
import { marketValueMultiplier } from "../constants/scaling";
import { getClub } from "../constants/clubs";

/** Fourchette de salaire hebdo réaliste selon division + overall. */
export function suggestSalary(division: Club["division"], overall: number): number {
  const base =
    division === "Ligue 1" ? 8_000 : division === "Ligue 2" ? 3_500 : division === "National" ? 1_200 : 300;
  const factor = Math.pow(Math.max(0.4, (overall - 40) / 45), 2);
  return Math.round(base * factor);
}

/** Un club est-il intéressé par le joueur ? (niveau compatible + besoin au poste). */
export function isClubInterested(club: Club, player: Player): boolean {
  if (player.contract.clubId === club.id) return false;
  const levelGap = club.reputation - player.overall;
  return levelGap < 18 && club.budget > suggestSalary(club.division, player.overall) * 52 * 1.5;
}

/** Génère des offres entrantes en fin de mercato ou quand la forme est excellente. */
export function generateOffers(player: Player, allClubs: Club[], dayNumber: number): SalaryOffer[] {
  const candidates = allClubs.filter((c) => isClubInterested(c, player));
  // Tri par prestige décroissant, on garde les 3 meilleures destinations.
  candidates.sort((a, b) => b.reputation - a.reputation);

  return candidates.slice(0, 3).map((club) => {
    const wage = suggestSalary(club.division, player.overall);
    return {
      clubId: club.id,
      clubName: club.name,
      salaryPerWeek: wage,
      bonusPerMatch: Math.round(wage * 0.3),
      bonusPerGoal: Math.round(wage * 0.5),
      signingBonus: Math.round(wage * 6),
      years: player.age <= 23 ? 4 : player.age <= 29 ? 3 : 2,
      releaseClause: Math.round(player.marketValue * 1.8),
      sportProject: Math.round(70 - (club.reputation - player.overall) * 1.2),
      expiresOnDay: dayNumber + 4,
    };
  });
}

/** Négocie une clause / un bonus : retourne l'offre améliorée si le projet est bon. */
export function counterOffer(offer: SalaryOffer): SalaryOffer {
  return {
    ...offer,
    salaryPerWeek: Math.round(offer.salaryPerWeek * 1.1),
    bonusPerMatch: Math.round(offer.bonusPerMatch * 1.15),
    releaseClause: Math.round(offer.releaseClause * 0.9),
  };
}

/** Accepte une offre : applique le nouveau contrat + indemnité au club. */
export function acceptOffer(player: Player, offer: SalaryOffer): Player {
  return {
    ...player,
    contract: {
      clubId: offer.clubId,
      salaryPerWeek: offer.salaryPerWeek,
      bonusPerMatch: offer.bonusPerMatch,
      bonusPerGoal: offer.bonusPerGoal,
      signingBonus: offer.signingBonus,
      yearsRemaining: offer.years,
      isProfessional: offer.clubId !== "",
      releaseClause: offer.releaseClause,
    },
    morale: Math.min(100, player.morale + 15),
  };
}

/** Propositions reçues par le club formateur pour le joueur. */
export function generateProposals(player: Player, interestedClubIds: string[], dayNumber: number): TransferProposal[] {
  return interestedClubIds
    .map((id) => getClub(id))
    .filter((c): c is Club => Boolean(c))
    .map((club, i) => ({
      id: `tp-${dayNumber}-${club.id}`,
      fromClubId: club.id,
      toClubId: player.contract.clubId,
      fee: Math.round(marketValueMultiplier(player.overall, player.age, player.potential) * (0.9 + i * 0.1)),
      wageDemand: suggestSalary(club.division, player.overall),
      status: "pending",
      proposedOnDay: dayNumber,
    }));
}

/** Fenêtres de mercato (journées) : été J0-J8, hiver J16-J19. */
export function isTransferWindowOpen(dayNumber: number): boolean {
  return dayNumber <= 8 || (dayNumber >= 16 && dayNumber <= 19);
}

/** Demande de hausse de salaire après une saison forte. */
export function requestRaise(player: Player, currentWage: number): { accepted: boolean; newWage: number } {
  const performance = player.seasonStats[player.seasonStats.length - 1];
  const strong = Boolean(performance && performance.averageRating >= 7 && performance.matches >= 15);
  const ask = Math.round(currentWage * (strong ? 1.6 : 1.2));
  return { accepted: strong, newWage: strong ? ask : currentWage };
}
