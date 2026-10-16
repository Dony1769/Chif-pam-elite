/**
 * FC CAREER — Moteur de match (simulation)
 * Simulation probabiliste basée sur les attributs du joueur.
 * Aucune dépendance React — testable isolément.
 */

import type { Player, Position, PositionFamily } from "./player";
import { positionFamily } from "./player";
import type { MatchResult, MatchEvent, MatchStats } from "./match";
import { createRng, seedFromString } from "../utils/random";
import { generateId } from "../utils/ids";
import { clamp } from "../utils/validation";

/* ── Profil de performance selon le poste ─────────────────────── */

interface PositionProfile {
  goalWeight:       number;  // prob de but par chance créée
  assistWeight:     number;
  savesBase:        number;  // pour GK
  tackleWeight:     number;
  interWeight:      number;
  chanceCreate:     number;  // nombre de chances moyen par mi-temps
}

const POSITION_PROFILES: Record<PositionFamily, PositionProfile> = {
  goalkeeper: { goalWeight: 0.02, assistWeight: 0.02, savesBase: 3,   tackleWeight: 0.1, interWeight: 0.1, chanceCreate: 0.3 },
  defender:   { goalWeight: 0.06, assistWeight: 0.08, savesBase: 0,   tackleWeight: 0.7, interWeight: 0.6, chanceCreate: 0.5 },
  midfielder: { goalWeight: 0.12, assistWeight: 0.25, savesBase: 0,   tackleWeight: 0.3, interWeight: 0.4, chanceCreate: 1.2 },
  attacker:   { goalWeight: 0.30, assistWeight: 0.18, savesBase: 0,   tackleWeight: 0.1, interWeight: 0.1, chanceCreate: 1.8 },
};

/* ── Force effective du joueur (0–1) ─────────────────────────── */

function playerStrength(player: Player): number {
  const base = player.overall / 99;
  const formBonus   = (player.condition.form - 50) / 200;      // ±0.25
  const fatigueHit  = -(player.condition.fatigue / 200);        // jusqu'à -0.5
  const moraleBonus = (player.condition.morale - 50) / 400;    // ±0.125
  return clamp(base + formBonus + fatigueHit + moraleBonus, 0.1, 1.0);
}

/* ── Génération des événements d'une mi-temps ─────────────────── */

function simulateHalf(
  player: Player,
  family: PositionFamily,
  profile: PositionProfile,
  strength: number,
  rng: ReturnType<typeof createRng>,
  halfLabel: "1ère" | "2ème",
  isHome: boolean,
): { events: MatchEvent[]; stats: Partial<MatchStats> } {
  const events: MatchEvent[] = [];
  const stats: Partial<MatchStats> = {
    goals: 0, assists: 0, saves: 0, shotsOnTarget: 0,
    shotsOffTarget: 0, tackles: 0, interceptions: 0,
    foulsCommitted: 0, yellowCards: 0, redCards: 0,
    keyPasses: 0, dribbles: 0,
  };

  const minuteBase = halfLabel === "1ère" ? 1 : 46;

  // Nombre de chances créées (variable selon poste)
  const chances = rng.int(
    Math.max(0, Math.floor(profile.chanceCreate * strength * 0.7)),
    Math.max(1, Math.ceil(profile.chanceCreate * strength * 1.4)),
  );

  for (let i = 0; i < chances; i++) {
    const minute = rng.int(minuteBase, minuteBase + 44);

    if (family === "goalkeeper") {
      // GK : arrêts
      const nSaves = rng.int(0, Math.ceil(profile.savesBase * strength));
      stats.saves! += nSaves;
      if (nSaves > 0) {
        events.push({
          id: generateId("ev"),
          minute,
          type: "save",
          isPlayer: true,
          description: `${halfLabel} mi-temps — ${nSaves > 1 ? nSaves + " arrêts" : "bel arrêt"} !`,
        });
      }
    } else {
      // Tir : sur cible ou hors cadre
      const onTarget = rng.chance(strength * 0.55);
      if (onTarget) {
        stats.shotsOnTarget!++;
        // But ?
        if (rng.chance(profile.goalWeight * strength)) {
          stats.goals!++;
          events.push({
            id: generateId("ev"),
            minute,
            type: "goal",
            isPlayer: true,
            description: `${halfLabel} mi-temps (${minute}') — ⚽ But !`,
          });
        } else {
          events.push({
            id: generateId("ev"),
            minute,
            type: "shot_on_target",
            isPlayer: true,
            description: `${halfLabel} mi-temps (${minute}') — Tir cadré`,
          });
        }
      } else {
        stats.shotsOffTarget!++;
      }
    }
  }

  // Passes décisives
  if (rng.chance(profile.assistWeight * strength)) {
    stats.assists!++;
    events.push({
      id: generateId("ev"),
      minute: rng.int(minuteBase, minuteBase + 44),
      type: "assist",
      isPlayer: true,
      description: `${halfLabel} mi-temps — Passe décisive !`,
    });
  }

  // Tacles / interceptions (défenseurs / milieux)
  if (family === "defender" || family === "midfielder") {
    stats.tackles!      += rng.int(0, Math.round(profile.tackleWeight * strength * 5));
    stats.interceptions!+= rng.int(0, Math.round(profile.interWeight  * strength * 4));
  }

  // Passes clés
  if (rng.chance(0.4 * strength)) stats.keyPasses!++;
  // Dribbles
  if (rng.chance(0.3 * strength)) stats.dribbles!++;

  // Faute / carton jaune (rare)
  if (rng.chance(0.07)) {
    stats.foulsCommitted!++;
    if (rng.chance(0.25)) {
      stats.yellowCards!++;
      events.push({
        id: generateId("ev"),
        minute: rng.int(minuteBase, minuteBase + 44),
        type: "yellow_card",
        isPlayer: true,
        description: `${halfLabel} mi-temps — Carton jaune`,
      });
    }
  }

  return { events, stats };
}

/* ── Score du match (équipe + adversaire) ─────────────────────── */

function simulateTeamScore(
  strength: number,
  isHome: boolean,
  rng: ReturnType<typeof createRng>,
): { playerGoals: number; opponentGoals: number } {
  const homeAdv = isHome ? 0.08 : 0;
  const baseAttack = 0.35 + strength * 0.4 + homeAdv;
  const baseDefense = 0.35 + strength * 0.3 + homeAdv;
  const playerGoals   = rng.int(0, Math.round(baseAttack * 4));
  const opponentGoals = rng.int(0, Math.round((1.2 - baseDefense) * 3));
  return { playerGoals, opponentGoals };
}

/* ── Note du joueur (1.0 – 10.0) ─────────────────────────────── */

function computePlayerRating(stats: MatchStats, family: PositionFamily): number {
  let base = 6.0;

  if (family === "goalkeeper") {
    base += stats.saves * 0.3;
    base += stats.yellowCards * -0.5;
    base += stats.redCards * -2;
  } else if (family === "attacker") {
    base += stats.goals * 0.8;
    base += stats.assists * 0.5;
    base += stats.shotsOnTarget * 0.1;
    base += stats.yellowCards * -0.5;
    base += stats.redCards * -2;
  } else if (family === "midfielder") {
    base += stats.goals * 0.7;
    base += stats.assists * 0.6;
    base += stats.keyPasses * 0.2;
    base += stats.interceptions * 0.15;
    base += stats.yellowCards * -0.4;
    base += stats.redCards * -2;
  } else {
    // defender
    base += stats.tackles * 0.2;
    base += stats.interceptions * 0.2;
    base += stats.goals * 0.5;
    base += stats.yellowCards * -0.5;
    base += stats.redCards * -2;
  }

  return clamp(parseFloat(base.toFixed(1)), 1.0, 10.0);
}

/* ── PA gagnés selon la note ──────────────────────────────────── */

function computePaEarned(rating: number): number {
  if (rating >= 9.0) return 4;
  if (rating >= 7.5) return 3;
  if (rating >= 6.5) return 2;
  if (rating >= 5.0) return 1;
  return 0;
}

/* ── Point d'entrée public ────────────────────────────────────── */

export interface SimulateMatchInput {
  matchId: string;
  season: number;
  matchday: number;
  player: Player;
  playerClubId: string;
  opponentClubId: string;
  isHome: boolean;
  competitionId: string;
}

export function simulateMatch(input: SimulateMatchInput): MatchResult {
  const {
    matchId, season, matchday, player,
    playerClubId, opponentClubId, isHome, competitionId,
  } = input;

  const seed = `${matchId}-${player.id}-${season}-${matchday}`;
  const rng  = createRng(seedFromString(seed));

  const family  = positionFamily(player.position);
  const profile = POSITION_PROFILES[family];
  const strength = playerStrength(player);

  // Simulate both halves
  const h1 = simulateHalf(player, family, profile, strength, rng, "1ère", isHome);
  const h2 = simulateHalf(player, family, profile, strength, rng, "2ème", isHome);

  const allEvents = [...h1.events, ...h2.events].sort((a, b) => a.minute - b.minute);

  // Merge stats
  const redCards = (h1.stats.redCards ?? 0) + (h2.stats.redCards ?? 0);
  const mergedStats: MatchStats = {
    goals:          (h1.stats.goals ?? 0)          + (h2.stats.goals ?? 0),
    assists:        (h1.stats.assists ?? 0)         + (h2.stats.assists ?? 0),
    saves:          (h1.stats.saves ?? 0)           + (h2.stats.saves ?? 0),
    shotsOnTarget:  (h1.stats.shotsOnTarget ?? 0)   + (h2.stats.shotsOnTarget ?? 0),
    shotsOffTarget: (h1.stats.shotsOffTarget ?? 0)  + (h2.stats.shotsOffTarget ?? 0),
    tackles:        (h1.stats.tackles ?? 0)         + (h2.stats.tackles ?? 0),
    interceptions:  (h1.stats.interceptions ?? 0)   + (h2.stats.interceptions ?? 0),
    foulsCommitted: (h1.stats.foulsCommitted ?? 0)  + (h2.stats.foulsCommitted ?? 0),
    yellowCards:    (h1.stats.yellowCards ?? 0)     + (h2.stats.yellowCards ?? 0),
    redCards,
    keyPasses:      (h1.stats.keyPasses ?? 0)       + (h2.stats.keyPasses ?? 0),
    dribbles:       (h1.stats.dribbles ?? 0)        + (h2.stats.dribbles ?? 0),
    minutesPlayed:  redCards > 0 ? rng.int(20, 65) : 90,
  };

  const { playerGoals, opponentGoals } = simulateTeamScore(strength, isHome, rng);

  // Score du match (les buts du joueur comptent pour l'équipe)
  const teamGoals  = Math.max(playerGoals, mergedStats.goals);
  const scoreHome  = isHome ? teamGoals      : opponentGoals;
  const scoreAway  = isHome ? opponentGoals  : teamGoals;

  const rating   = computePlayerRating(mergedStats, family);
  const paEarned = computePaEarned(rating);

  return {
    matchId,
    season,
    matchday,
    playerClubId,
    opponentClubId,
    isHome,
    competitionId,
    scoreHome,
    scoreAway,
    playerRating:  rating,
    playerStats:   mergedStats,
    events:        allEvents,
    paEarned,
    objectivesCompleted: [],
    lockKey: seed,
    completedAt: Date.now(),
  };
}
