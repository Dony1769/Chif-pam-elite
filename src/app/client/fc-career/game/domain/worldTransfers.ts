/**
 * FC CAREER — Transferts et vieillissement du monde
 * En fin de saison : les clubs font évoluer leurs joueurs, recrutent, vendent, prêtent.
 * Ce module est pur domaine — aucune dépendance React.
 */

import type { Club } from "./club";
import type { WorldPlayer } from "../data/worldPlayers";
import { createRng, seedFromString } from "../utils/random";
import { fullName as displayName } from "../utils/names";

/* ── Résultat de simulation de transferts monde ─────────────────── */

export interface WorldTransferEvent {
  type: "transfer" | "loan" | "retirement" | "promotion" | "youth_breakout";
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
  fromClubId: string;
  toClubId?: string;
  season: number;
  description: string;
}

/* ── Vieillissement des joueurs monde ───────────────────────────── */

/**
 * Fait vieillir les joueurs monde d'un an.
 * - Progression pour les jeunes (< 24 ans)
 * - Déclin pour les vieux (> 30 ans)
 * - Retraite possible pour les > 35 ans
 */
export function ageWorldPlayers(
  players: WorldPlayer[],
  season: number,
  rng: ReturnType<typeof createRng>,
): { updated: WorldPlayer[]; events: WorldTransferEvent[] } {
  const events: WorldTransferEvent[] = [];
  const updated = players.map(p => {
    const newAge = p.age + 1;
    let newOvr = p.overall;

    if (newAge <= 21) {
      // Jeunes : forte progression
      const growth = rng.int(2, 5);
      newOvr = Math.min(p.potential, newOvr + growth);
    } else if (newAge <= 24) {
      // Développement
      const growth = rng.int(0, 3);
      newOvr = Math.min(p.potential, newOvr + growth);
    } else if (newAge <= 28) {
      // Pic de forme : légères variations
      const delta = rng.int(-1, 1);
      newOvr = Math.max(50, Math.min(p.potential, newOvr + delta));
    } else if (newAge <= 31) {
      // Début de déclin
      const decline = rng.int(0, 2);
      newOvr = Math.max(50, newOvr - decline);
    } else if (newAge <= 35) {
      // Déclin notable
      const decline = rng.int(1, 3);
      newOvr = Math.max(45, newOvr - decline);
    } else {
      // Grand âge : fort déclin
      const decline = rng.int(2, 5);
      newOvr = Math.max(40, newOvr - decline);

      // Chance de retraite
      const retireChance = (newAge - 35) * 0.15;
      if (rng.chance(retireChance)) {
        const fullName = `${displayName(p)}`;
        events.push({
          type: "retirement",
          playerId: p.id,
          playerFirstName: p.firstName,
          playerLastName: p.lastName,
          fromClubId: p.clubId,
          season,
          description: `${fullName} prend sa retraite à ${newAge} ans.`,
        });
        // Marquer comme retraité (OVR minimal)
        return { ...p, age: newAge, overall: 40, retired: true };
      }
    }

    return { ...p, age: newAge, overall: newOvr };
  });

  return { updated, events };
}

/* ── Simulation des transferts de fin de saison ────────────────── */

/**
 * Simule les transferts entre clubs en fin de saison.
 * - Les clubs forts rachètent des joueurs de clubs faibles
 * - Les joueurs en fin de contrat signent ailleurs
 * - Les jeunes talents sont promus ou prêtés
 */
export function simulateWorldTransfers(
  players: WorldPlayer[],
  clubs: Club[],
  season: number,
  rng: ReturnType<typeof createRng>,
): { updated: WorldPlayer[]; events: WorldTransferEvent[] } {
  const events: WorldTransferEvent[] = [];
  const updated = [...players];

  const clubMap = new Map(clubs.map(c => [c.id, c]));

  // Sélectionner ~8% des joueurs pour des mouvements
  const movableCount = Math.floor(players.length * 0.08);
  const shuffled = [...players].sort(() => rng.float(-1, 1));
  const movable = shuffled.slice(0, movableCount).filter(p => !(p as WorldPlayer & { retired?: boolean }).retired);

  for (const player of movable) {
    const fromClub = clubMap.get(player.clubId);
    if (!fromClub) continue;

    // Trouver un club de destination approprié
    const eligibleClubs = clubs.filter(c =>
      c.id !== player.clubId &&
      Math.abs(c.reputation - fromClub.reputation) <= 25 // clubs de niveau similaire ±25
    );
    if (eligibleClubs.length === 0) continue;

    const toClub = rng.pick(eligibleClubs);
    const isLoan = player.age <= 21 && rng.chance(0.4); // prêts pour les jeunes
    const isPromotion = player.overall >= 75 && toClub.reputation > fromClub.reputation + 10;
    const type = isLoan ? "loan" as const : isPromotion ? "promotion" as const : "transfer" as const;

    const idx = updated.findIndex(p => p.id === player.id);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], clubId: toClub.id };
    }

    const pFullName = `${displayName(player)}`;
    events.push({
      type,
      playerId: player.id,
      playerFirstName: player.firstName,
      playerLastName: player.lastName,
      fromClubId: player.clubId,
      toClubId: toClub.id,
      season,
      description: isLoan
        ? `${pFullName} est prêté à ${toClub.name}.`
        : isPromotion
        ? `${pFullName} (${player.overall} OVR) rejoint ${toClub.name}.`
        : `${pFullName} transfère à ${toClub.name}.`,
    });
  }

  // Youth breakouts : quelques joueurs <21 avec bon potentiel émergent
  const youngTalents = players.filter(p => p.age <= 20 && p.overall >= 68 && p.overall < 75);
  const breakoutCount = Math.min(3, Math.floor(youngTalents.length * 0.15));
  const breakouts = youngTalents.sort(() => rng.float(-1, 1)).slice(0, breakoutCount);
  for (const talent of breakouts) {
    const tFullName = `${displayName(talent)}`;
    events.push({
      type: "youth_breakout",
      playerId: talent.id,
      playerFirstName: talent.firstName,
      playerLastName: talent.lastName,
      fromClubId: talent.clubId,
      season,
      description: `${tFullName} (${talent.age} ans) s'impose comme joueur de premier plan.`,
    });
  }

  return { updated, events };
}

/* ── Génère des offres de transfert pour le joueur humain ────────── */

export interface PlayerTransferOffer {
  clubId: string;
  clubName: string;
  proposedSalary: number;
  transferFee: number;
  isLoan: boolean;
  loanDuration?: number; // saisons
  interestLevel: "low" | "medium" | "high";
  message: string;
}

/**
 * Génère 0-3 offres de clubs intéressés par le joueur.
 * Plus le joueur est bon, plus les clubs sont intéressés.
 */
export function generateTransferOffers(
  playerOvr: number,
  playerAge: number,
  currentClubReputation: number,
  clubs: Club[],
  season: number,
  rng: ReturnType<typeof createRng>,
): PlayerTransferOffer[] {
  const offers: PlayerTransferOffer[] = [];

  // Probabilité de recevoir des offres selon le niveau
  const baseChance = playerOvr >= 80 ? 0.85 : playerOvr >= 70 ? 0.55 : playerOvr >= 60 ? 0.25 : 0.08;
  if (!rng.chance(baseChance)) return [];

  // Nombre d'offres
  const count = rng.int(1, Math.min(3, Math.floor(playerOvr / 25)));

  // Clubs intéressés : ceux dont la réputation est dans une fourchette
  const minRep = Math.max(10, currentClubReputation - 20);
  const maxRep = Math.min(100, currentClubReputation + 30);
  const eligible = clubs.filter(c => c.reputation >= minRep && c.reputation <= maxRep);
  if (eligible.length === 0) return [];

  const messages = [
    "Nous suivons ton développement depuis un moment. Rejoins-nous.",
    "Tu as le profil qu'on recherche. On a un projet pour toi.",
    "Le coach veut te rencontrer. L'occasion est là.",
    "Nous croyons en ton potentiel. Viens évoluer ici.",
    "Notre club a besoin de quelqu'un comme toi.",
  ];

  for (let i = 0; i < count && eligible.length > 0; i++) {
    const clubIdx = rng.int(0, eligible.length - 1);
    const club = eligible.splice(clubIdx, 1)[0];

    const baseSalary = 500 + (playerOvr - 50) * 80 + (club.reputation / 100) * 3000;
    const proposedSalary = Math.round(baseSalary * rng.float(0.9, 1.15) / 50) * 50;
    const isLoan = playerAge <= 21 && rng.chance(0.35);
    const interestLevel = club.reputation > currentClubReputation + 15 ? "high"
      : club.reputation > currentClubReputation ? "medium" : "low";

    offers.push({
      clubId: club.id,
      clubName: club.name,
      proposedSalary,
      transferFee: isLoan ? 0 : Math.round(playerOvr * 500 * rng.float(0.8, 1.3) / 1000) * 1000,
      isLoan,
      loanDuration: isLoan ? 1 : undefined,
      interestLevel,
      message: rng.pick(messages),
    });
  }

  return offers;
}
