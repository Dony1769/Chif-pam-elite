/**
 * FC CAREER — Moteur de match monde (simulation rapide)
 * Partagé pour les matchs du joueur ET la simulation du monde.
 * Sans boucle permanente : appelé uniquement lors d'une avancée de calendrier.
 * Les résultats dépendent des attributs réels — aucun score prédéfini.
 */

import { createRng, seedFromString } from "../utils/random";
import type { WorldPlayer } from "../data/worldPlayers";
import type { WorldCoach } from "./worldCoach";
import type { WorldMatchResult, WorldPlayerSeasonStats } from "./worldState";
import type { Fixture } from "./season";

// ─── Types internes ───────────────────────────────────────────────────────────

interface ClubSnapshot {
  clubId: string;
  players: WorldPlayer[];
  coach: WorldCoach | null;
  reputation: number;
}

// ─── Force effective d'un club ────────────────────────────────────────────────

/**
 * Calcule la force effective d'un club (0-100) à partir de son effectif, coach et réputation.
 */
function computeClubStrength(snapshot: ClubSnapshot, isHome: boolean): number {
  const players = snapshot.players;
  if (players.length === 0) {
    return snapshot.reputation * 0.5; // fallback sans effectif
  }

  // Sélectionner les 11 meilleurs (sans GK si aucun disponible)
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const starting11 = sorted.slice(0, Math.min(11, sorted.length));
  const avgOvr = starting11.reduce((s, p) => s + p.overall, 0) / starting11.length;

  // Bonus coach
  let coachBonus = 0;
  if (snapshot.coach) {
    coachBonus = (snapshot.coach.skills.attack + snapshot.coach.skills.defense) / 200 * 10;
  }

  // Avantage domicile
  const homeAdv = isHome ? 4 : 0;

  // Pondération réputation (15%) + OVR (75%) + coach (10%)
  const strength = avgOvr * 0.75 + snapshot.reputation * 0.15 + coachBonus + homeAdv;
  return Math.min(99, Math.max(1, strength));
}

// ─── Génération du score depuis les forces ────────────────────────────────────

/**
 * Génère un score réaliste à partir de deux forces (0-99) et d'un RNG.
 * Inspiré du modèle de Poisson football.
 */
function generateScore(
  strengthAttack: number,
  strengthDefense: number,
  rng: ReturnType<typeof createRng>,
): number {
  // Lambda Poisson : buts attendus basé sur l'attaque vs la défense adverse
  const attackRatio = strengthAttack / (strengthAttack + strengthDefense);
  const lambda = 0.6 + attackRatio * 2.4; // entre 0.6 et 3.0

  // Simulation Poisson simplifiée via méthode de Knuth
  let k = 0;
  let p = 1;
  const L = Math.exp(-lambda);
  do {
    k++;
    p *= rng.float(0, 1);
  } while (p > L && k < 15); // cap à 14 buts (réalisme)
  return k - 1;
}

// ─── Génération des buteurs ───────────────────────────────────────────────────

function pickScorers(
  players: WorldPlayer[],
  goals: number,
  rng: ReturnType<typeof createRng>,
  clubId: string,
): { playerId: string; clubId: string }[] {
  if (goals === 0 || players.length === 0) return [];

  // Probabilité de marquer pondérée par position et OVR
  const attacking = players.filter(p =>
    ["ST", "LW", "RW", "AM", "CF"].includes(p.position)
  );
  const pool = attacking.length > 0 ? attacking : players;

  const scorers: { playerId: string; clubId: string }[] = [];
  for (let i = 0; i < goals; i++) {
    // Sélection pondérée par OVR
    const totalWeight = pool.reduce((s, p) => s + p.overall, 0);
    let r = rng.float(0, totalWeight);
    let scorer = pool[0];
    for (const p of pool) {
      r -= p.overall;
      if (r <= 0) { scorer = p; break; }
    }
    scorers.push({ playerId: scorer.id, clubId });
  }
  return scorers;
}

// ─── Mise à jour des stats joueurs ───────────────────────────────────────────

function updatePlayerStats(
  existing: WorldPlayerSeasonStats[],
  playerId: string,
  clubId: string,
  leagueId: string,
  season: number,
  goals: number,
  assists: number,
): WorldPlayerSeasonStats[] {
  const idx = existing.findIndex(
    s => s.playerId === playerId && s.season === season && s.leagueId === leagueId
  );

  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = {
      ...updated[idx],
      goals:       updated[idx].goals + goals,
      assists:     updated[idx].assists + assists,
      appearances: updated[idx].appearances + 1,
    };
    return updated;
  }

  return [...existing, {
    playerId, clubId, leagueId, season,
    goals, assists, appearances: 1,
    yellowCards: 0, redCards: 0, avgRating: 6.5,
  }];
}

// ─── Point d'entrée : simuler un fixture ─────────────────────────────────────

export interface WorldMatchInput {
  fixture: Fixture;
  home: ClubSnapshot;
  away: ClubSnapshot;
  season: number;
}

export interface WorldMatchOutput {
  result: WorldMatchResult;
  updatedPlayerStats: {
    playerId: string;
    clubId: string;
    leagueId: string;
    goals: number;
    assists: number;
  }[];
}

export function simulateWorldMatch(input: WorldMatchInput): WorldMatchOutput {
  const { fixture, home, away, season } = input;
  const leagueId = fixture.competitionId;

  // Seed déterministe unique par match
  const seed = `wm-${fixture.id}-s${season}`;
  const rng = createRng(seedFromString(seed));

  const homeStr = computeClubStrength(home, true);
  const awayStr = computeClubStrength(away, false);

  // Buts : attaque home vs défense away (et inversement)
  const homeGoals = generateScore(homeStr, awayStr, rng);
  const awayGoals = generateScore(awayStr, homeStr, rng);

  // Buteurs
  const homeScorers = pickScorers(home.players, homeGoals, rng, home.clubId);
  const awayScorers = pickScorers(away.players, awayGoals, rng, away.clubId);
  const allScorers = [...homeScorers, ...awayScorers];

  const result: WorldMatchResult = {
    fixtureId:    fixture.id,
    leagueId,
    season,
    matchday:     fixture.matchday,
    homeClubId:   fixture.homeClubId,
    awayClubId:   fixture.awayClubId,
    scoreHome:    homeGoals,
    scoreAway:    awayGoals,
    scorers:      allScorers,
  };

  // Stats des buteurs (1 but each, possibilité d'assist au prochain)
  const statUpdates: WorldMatchOutput["updatedPlayerStats"] = [];
  for (const s of homeScorers) {
    statUpdates.push({ playerId: s.playerId, clubId: home.clubId, leagueId, goals: 1, assists: 0 });
  }
  for (const s of awayScorers) {
    statUpdates.push({ playerId: s.playerId, clubId: away.clubId, leagueId, goals: 1, assists: 0 });
  }
  // Passes décisives (1 par but, si assez de joueurs)
  for (let i = 0; i < homeGoals && home.players.length > 1; i++) {
    const helpers = home.players.filter(p => !homeScorers.some(s => s.playerId === p.id));
    if (helpers.length > 0) {
      const assister = rng.pick(helpers);
      statUpdates.push({ playerId: assister.id, clubId: home.clubId, leagueId, goals: 0, assists: 1 });
    }
  }
  for (let i = 0; i < awayGoals && away.players.length > 1; i++) {
    const helpers = away.players.filter(p => !awayScorers.some(s => s.playerId === p.id));
    if (helpers.length > 0) {
      const assister = rng.pick(helpers);
      statUpdates.push({ playerId: assister.id, clubId: away.clubId, leagueId, goals: 0, assists: 1 });
    }
  }

  return { result, updatedPlayerStats: statUpdates };
}

// ─── Simulation d'une journée complète d'une ligue ───────────────────────────

export interface MatchdayInput {
  leagueId:  string;
  matchday:  number;
  season:    number;
  fixtures:  Fixture[];
  getClubSnapshot: (clubId: string) => ClubSnapshot;
}

export interface MatchdayOutput {
  results:            WorldMatchResult[];
  playerStatUpdates:  WorldMatchOutput["updatedPlayerStats"];
}

export function simulateMatchday(input: MatchdayInput): MatchdayOutput {
  const { leagueId, matchday, season, fixtures, getClubSnapshot } = input;

  const dayFixtures = fixtures.filter(
    f => f.matchday === matchday && !f.result
  );

  const results:           WorldMatchResult[]                    = [];
  const playerStatUpdates: WorldMatchOutput["updatedPlayerStats"] = [];

  for (const fixture of dayFixtures) {
    const home = getClubSnapshot(fixture.homeClubId);
    const away = getClubSnapshot(fixture.awayClubId);

    const { result, updatedPlayerStats } = simulateWorldMatch({
      fixture, home, away, season,
    });

    results.push(result);
    playerStatUpdates.push(...updatedPlayerStats);
  }

  return { results, playerStatUpdates };
}

// ─── Application des stats accumulées ────────────────────────────────────────

export function applyStatUpdates(
  existing: WorldPlayerSeasonStats[],
  updates: WorldMatchOutput["updatedPlayerStats"],
): WorldPlayerSeasonStats[] {
  let stats = [...existing];
  for (const u of updates) {
    stats = updatePlayerStats(stats, u.playerId, u.clubId, u.leagueId, 0, u.goals, u.assists);
  }
  return stats;
}
