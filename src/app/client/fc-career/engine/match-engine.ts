/**
 * FC CAREER — Moteur de simulation de match
 * Simulation minute par minute (rôles, événements, notation).
 */

import type { Player, MatchRating } from "../types/player";
import type { SimulatedMatch, MatchEvent, TeamStats, SimulationOptions } from "../types/match";
import type { Club } from "../types/club";
import { getPosition } from "../constants/positions";
import { ROLE_WEIGHTS } from "../constants/positions";
import { fatiguePenalty } from "../constants/scaling";
import { createRng } from "./player-generator";

function teamStrength(club: Club): number {
  return club.reputation * 0.7 + club.prestige * 0.3;
}

function emptyStats(possession: number): TeamStats {
  return {
    possession,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    passAccuracy: 78,
    duelsWon: Math.round(possession / 2 + 25),
  };
}

/** Estimation de note du joueur sur la base de ses attributs pondérés par rôle. */
export function predictRating(player: Player): number {
  const family = getPosition(player.position).family;
  const weights = ROLE_WEIGHTS[family];
  let total = 0;
  let wsum = 0;
  for (const [attrId, w] of Object.entries(weights)) {
    total += (player.attributes[attrId] ?? 50) * (w ?? 0);
    wsum += w ?? 0;
  }
  const raw = wsum > 0 ? total / wsum : player.overall;
  const formAdj = ((player.form - 50) / 50) * 0.6;
  const fatigueAdj = -(1 - fatiguePenalty(player.fatigue)) * 2.5;
  return Math.max(4, Math.min(10, raw / 12 + formAdj + fatigueAdj));
}

function rollPoisson(rng: () => number, lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 12);
  return k - 1;
}

/**
 * Simule un match complet.
 * `userClub` doit être l'un des deux clubs ; le joueur utilisateur y évolue.
 */
export function simulateMatch(
  home: Club,
  away: Club,
  user: Player,
  options: SimulationOptions = {},
): SimulatedMatch {
  const seed = options.seed ?? Date.now();
  const rng = createRng(seed);

  const homeIsUser = home.id === user.contract.clubId;
  const userClub = homeIsUser ? home : away;

  const sHome = teamStrength(home) + 4; // avantage domicile
  const sAway = teamStrength(away);
  const diff = sHome - sAway;

  const lambdaHome = Math.max(0.2, 1.35 + diff / 45);
  const lambdaAway = Math.max(0.15, 1.1 - diff / 45);

  const homeScore = rollPoisson(rng, lambdaHome);
  const awayScore = rollPoisson(rng, lambdaAway);

  const events: MatchEvent[] = [];
  const scorerPool = ["M. Junior", "T. Nkunda", "A. Rivera", "K. Diallo"];

  const addGoals = (n: number, clubId: string) => {
    for (let i = 0; i < n; i++) {
      const isUser = clubId === userClub.id;
      const scorer = isUser && rng() < 0.35 ? `${user.firstName} ${user.lastName}` : scorerPool[Math.floor(rng() * scorerPool.length)];
      events.push({
        id: `e-${clubId}-${i}-${seed}`,
        minute: 1 + Math.floor(rng() * 90),
        type: "goal",
        scorer,
        clubId,
      });
    }
  };
  addGoals(homeScore, home.id);
  addGoals(awayScore, away.id);
  events.sort((a, b) => a.minute - b.minute);

  const userGoals = events.filter(
    (e) => e.type === "goal" && e.scorer === `${user.firstName} ${user.lastName}`,
  ).length;

  const played = user.condition === "fit" && rng() < selectionChance(user);
  const minutes = played ? (rng() < 0.75 ? 90 : 30 + Math.floor(rng() * 55)) : 0;

  const baseRating = predictRating(user);
  const perfBonus = userGoals * 1.1 + (played ? (rng() * 1.2 - 0.5) : 0);
  const teamBonus =
    (homeIsUser ? homeScore > awayScore ? 0.5 : homeScore === awayScore ? 0.15 : -0.4 : awayScore > homeScore ? 0.5 : awayScore === homeScore ? 0.15 : -0.4);

  const rating = Math.max(4, Math.min(10, +(baseRating + perfBonus + teamBonus).toFixed(1)));

  const userRating: MatchRating = {
    rating: played ? rating : 0,
    goals: played ? userGoals : 0,
    assists: played ? rollPoisson(rng, 0.3) : 0,
    keyPasses: played ? rollPoisson(rng, 0.8) : 0,
    tackles: played ? rollPoisson(rng, 1.2) : 0,
    passesAccuracy: Math.round(68 + rng() * 24),
    shotsOnTarget: played ? rollPoisson(rng, 0.9 + userGoals) : 0,
    duelsWon: Math.round(38 + rng() * 30),
  };

  const homePoss = Math.round(50 + diff / 3 + (rng() * 8 - 4));
  const homeStats: TeamStats = { ...emptyStats(homePoss), shots: homeScore * 2 + 4 + Math.floor(rng() * 6), shotsOnTarget: homeScore + Math.floor(rng() * 3) };
  const awayStats: TeamStats = { ...emptyStats(100 - homePoss), shots: awayScore * 2 + 4 + Math.floor(rng() * 6), shotsOnTarget: awayScore + Math.floor(rng() * 3) };

  return {
    id: `m-${seed.toString(36)}`,
    dayNumber: 0,
    competitionId: "ligue1",
    homeClubId: home.id,
    awayClubId: away.id,
    homeScore,
    awayScore,
    events,
    homeStats,
    awayStats,
    userRating,
    userPlayed: played,
    userMinutes: minutes,
    manOfTheMatch: rating >= 7.5 ? `${user.firstName} ${user.lastName}` : scorerPool[0],
  };
}

/** Probabilité d'être sélectionné selon overall vs niveau du club. */
export function selectionChance(player: Player): number {
  const clubLevel = 55; // simplifié : à brancher sur club.reputation
  const gap = player.overall - clubLevel;
  return Math.max(0.05, Math.min(0.95, 0.5 + gap / 40));
}
