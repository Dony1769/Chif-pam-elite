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
import type { MatchSheet, SheetGoal } from "./matchSheet";

// ─── Types internes ───────────────────────────────────────────────────────────

export interface ClubSnapshot {
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
  const players = snapshot.players.filter(p => !p.injury || p.injury.weeksRemaining <= 0);
  if (players.length === 0) {
    return snapshot.reputation * 0.75; // fallback sans effectif
  }
  // Onze type : 1 gardien + les 10 meilleurs joueurs de champ
  const gk = players.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall)[0];
  const field = players.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 10);
  const xi = gk ? [gk, ...field] : field;
  const avgOvr = xi.reduce((t, p) => t + p.overall, 0) / Math.max(1, xi.length);
  // Coach : jusqu'à +3 ; domicile : +2
  const coachBonus = snapshot.coach ? ((snapshot.coach.skills.attack + snapshot.coach.skills.defense) / 200) * 3 : 0;
  return Math.min(99, Math.max(1, avgOvr + coachBonus + (isHome ? 2 : 0)));
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
  // Buts attendus : ~1,35 à niveau égal, ×2 tous les 10 points d'écart
  const lambda = Math.max(0.2, Math.min(4.5, 1.35 * Math.exp((strengthAttack - strengthDefense) * 0.07)));
  // Poisson (méthode de Knuth)
  let k = 0;
  let p = 1;
  const L = Math.exp(-lambda);
  do {
    k++;
    p *= rng.float(0, 1);
  } while (p > L && k < 15);
  return k - 1;
}

// ─── Génération des buteurs ───────────────────────────────────────────────────

const SCORE_W: Record<string, number> = { ST: 5, CF: 5, LW: 3, RW: 3, AM: 2.5, CM: 1.2, DM: 0.5, LB: 0.4, RB: 0.4, CB: 0.35, GK: 0 };
const ASSIST_W: Record<string, number> = { AM: 3, LW: 3, RW: 3, CM: 2, ST: 1.5, CF: 1.5, LB: 1.2, RB: 1.2, DM: 0.8, CB: 0.3, GK: 0.05 };

/** Les 16 joueurs les mieux notés et disponibles : ceux qui jouent réellement. */
function matchSquad(players: WorldPlayer[]): WorldPlayer[] {
  return players.filter(p => !p.injury || p.injury.weeksRemaining <= 0).sort((a, b) => b.overall - a.overall).slice(0, 16);
}

/** Onze de départ : le meilleur gardien et les dix meilleurs joueurs de champ disponibles. */
function startingXI(players: WorldPlayer[]): WorldPlayer[] {
  const fit = players.filter(p => !p.injury || p.injury.weeksRemaining <= 0).sort((a, b) => b.overall - a.overall);
  const gk = fit.find(p => p.position === "GK");
  return [...(gk ? [gk] : []), ...fit.filter(p => p.position !== "GK").slice(0, 10)];
}

function weightedPick(pool: WorldPlayer[], w: (p: WorldPlayer) => number, rng: ReturnType<typeof createRng>): WorldPlayer | null {
  const total = pool.reduce((t, p) => t + w(p), 0);
  if (total <= 0) return null;
  let r = rng.float(0, total);
  for (const p of pool) { r -= w(p); if (r <= 0) return p; }
  return pool[pool.length - 1];
}

function pickScorers(
  players: WorldPlayer[],
  goals: number,
  rng: ReturnType<typeof createRng>,
  clubId: string,
): { playerId: string; clubId: string }[] {
  if (goals === 0 || players.length === 0) return [];
  // Les attaquants et les meilleurs marquent davantage
  const pool = matchSquad(players);
  const scorers: { playerId: string; clubId: string }[] = [];
  for (let i = 0; i < goals; i++) {
    const p = weightedPick(pool, q => (SCORE_W[q.position] ?? 1) * Math.pow(q.overall / 70, 4), rng) ?? pool[0];
    scorers.push({ playerId: p.id, clubId });
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
  /** Feuille de match (sans semaine ni jour, complétés par l'appelant) */
  sheet: Omit<MatchSheet, "weekIdx" | "day">;
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

  // Stats : une ligne par joueur et par match (titulaires + buteurs/passeurs entrés en jeu)
  const tally = new Map<string, { playerId: string; clubId: string; leagueId: string; goals: number; assists: number }>();
  const add = (playerId: string, clubId: string, g: number, a: number) => {
    const t = tally.get(playerId) ?? { playerId, clubId, leagueId, goals: 0, assists: 0 };
    t.goals += g; t.assists += a;
    tally.set(playerId, t);
  };
  for (const snap of [home, away]) for (const p of startingXI(snap.players)) add(p.id, snap.clubId, 0, 0);
  for (const s of homeScorers) add(s.playerId, home.clubId, 1, 0);
  for (const s of awayScorers) add(s.playerId, away.clubId, 1, 0);
  // Passes décisives : 3 buts sur 4, données plutôt par les créateurs
  const goals: SheetGoal[] = [];
  const assists = (scorers: { playerId: string }[], snap: typeof home, side: "home" | "away") => {
    const pool = matchSquad(snap.players);
    for (const sc of scorers) {
      const g: SheetGoal = { minute: 0, side, playerId: sc.playerId };
      goals.push(g);
      if (!rng.chance(0.75)) continue;
      const a = weightedPick(pool.filter(p => p.id !== sc.playerId), q => (ASSIST_W[q.position] ?? 1) * Math.pow(q.overall / 70, 3), rng);
      if (a) { add(a.id, snap.clubId, 0, 1); g.assistId = a.id; }
    }
  };
  assists(homeScorers, home, "home");
  assists(awayScorers, away, "away");
  const statUpdates: WorldMatchOutput["updatedPlayerStats"] = [...tally.values()];

  // Feuille de match : minutes et statistiques tirées à part (n'influencent pas le score)
  const srng = createRng(seedFromString(`${seed}-sheet`));
  for (const g of goals) g.minute = srng.int(2, 90);
  goals.sort((a, b) => a.minute - b.minute);
  const poss = Math.round(Math.max(30, Math.min(70, 50 + (homeStr - awayStr) * 1.3 + srng.float(-4, 4))));
  const side = (snap: ClubSnapshot, g: number, str: number, opp: number) => {
    const xi = startingXI(snap.players).map(p => p.id);
    const subs = matchSquad(snap.players).filter(p => !xi.includes(p.id)).slice(0, 3).map(p => p.id);
    const shots = Math.max(g + 1, Math.round(8 + (str - opp) * 0.35 + srng.float(-3, 5)));
    return { xi, subs, shots, onTarget: Math.min(shots, g + srng.int(1, 4)) };
  };
  const sheet: WorldMatchOutput["sheet"] = {
    id: fixture.id, compId: leagueId, homeClubId: fixture.homeClubId, awayClubId: fixture.awayClubId, hs: homeGoals, as: awayGoals,
    home: { ...side(home, homeGoals, homeStr, awayStr), possession: poss }, away: { ...side(away, awayGoals, awayStr, homeStr), possession: 100 - poss },
    goals,
  };

  return { result, updatedPlayerStats: statUpdates, sheet };
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
  sheets:             WorldMatchOutput["sheet"][];
  results:            WorldMatchResult[];
  playerStatUpdates:  WorldMatchOutput["updatedPlayerStats"];
}

export function simulateMatchday(input: MatchdayInput): MatchdayOutput {
  const { leagueId, matchday, season, fixtures, getClubSnapshot } = input;

  const dayFixtures = fixtures.filter(
    f => f.matchday === matchday && !f.result
  );

  const results:           WorldMatchResult[]                    = [];
  const sheets:            WorldMatchOutput["sheet"][]           = [];
  const playerStatUpdates: WorldMatchOutput["updatedPlayerStats"] = [];

  for (const fixture of dayFixtures) {
    const home = getClubSnapshot(fixture.homeClubId);
    const away = getClubSnapshot(fixture.awayClubId);

    const { result, updatedPlayerStats, sheet } = simulateWorldMatch({
      fixture, home, away, season,
    });

    results.push(result);
    sheets.push(sheet);
    playerStatUpdates.push(...updatedPlayerStats);
  }

  return { results, playerStatUpdates, sheets };
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
