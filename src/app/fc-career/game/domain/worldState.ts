/**
 * FC CAREER — État du monde vivant
 * Centralise toutes les données dynamiques : clubs, joueurs, coachs, ligues,
 * classements, résultats, transferts, entraîneurs.
 * Ce module est le cœur du système monde — pure domaine, sans React.
 */

import type { Club, League, Country, StandingRow } from "./club";
import type { WorldPlayer } from "../data/worldPlayers";
import type { WorldCoach } from "./worldCoach";
import type { ClubDirectorAI } from "./clubAI";
import type { Fixture } from "./season";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Résultat de match monde simulé (stocké, jamais regeneré) */
export interface WorldMatchResult {
  fixtureId: string;
  leagueId: string;
  season: number;
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  scoreHome: number;
  scoreAway: number;
  /** Top buteurs du match */
  scorers?: { playerId: string; clubId: string }[];
}

/** Statistiques individuelles d'un joueur monde sur la saison */
export interface WorldPlayerSeasonStats {
  playerId: string;
  clubId: string;
  leagueId: string;
  season: number;
  goals: number;
  assists: number;
  appearances: number;
  yellowCards: number;
  redCards: number;
  avgRating: number;
}

/** Calendrier d'une ligue pour une saison */
export interface LeagueSchedule {
  leagueId: string;
  season: number;
  fixtures: Fixture[];
  currentMatchday: number;
  totalMatchdays: number;
  /** Monde CP : semaine (1-52) de chaque journée ; absente = une journée par semaine */
  weekOf?: number[];
}

/** Transfert monde enregistré */
export interface WorldTransferRecord {
  id: string;
  season: number;
  week: number;
  type: "transfer" | "loan" | "free" | "retirement" | "youth_breakout";
  playerId: string;
  playerName: string;
  fromClubId: string;
  toClubId?: string;
  fee: number; // 0 pour les prêts/libres
  salary: number;
  description: string;
}

/** Changement de coach */
export interface CoachChangeRecord {
  id: string;
  season: number;
  week: number;
  clubId: string;
  outCoachId: string;
  outCoachName: string;
  inCoachId: string;
  inCoachName: string;
  reason: string; // "fired" | "resigned" | "retired" | "contracted_ended"
}

/** État complet du monde vivant */
export interface WorldLiveState {
  /** Graine globale de la carrière — reproductibilité */
  seed: string;

  /** Saison courante */
  season: number;

  // ── Structures statiques (identités) ──────────────────────────────────────
  countries: Country[];
  leagues: League[];
  clubs: Club[];

  // ── Données dynamiques des clubs ──────────────────────────────────────────
  /** Réputation actuelle (évolue saison par saison) */
  clubReputations: Record<string, number>; // clubId → réputation
  /** Budgets restants pour la saison */
  clubDirectors: Record<string, ClubDirectorAI>; // clubId → directeur IA

  // ── Joueurs ───────────────────────────────────────────────────────────────
  players: WorldPlayer[];
  /** Stats joueurs par saison */
  playerStats: WorldPlayerSeasonStats[];

  // ── Coachs ────────────────────────────────────────────────────────────────
  coaches: WorldCoach[]; // tous les coaches (actifs + disponibles)

  // ── Ligues et classements ─────────────────────────────────────────────────
  /** Classement courant par ligue : leagueId → rows */
  standings: Record<string, StandingRow[]>;
  /** Calendriers par ligue : leagueId → LeagueSchedule */
  schedules: Record<string, LeagueSchedule>;

  // ── Résultats ─────────────────────────────────────────────────────────────
  /** Résultats de match stockés (ne sont jamais recalculés) */
  matchResults: WorldMatchResult[];
  /** 20 derniers résultats — pour l'affichage rapide */
  recentResults: WorldMatchResult[];

  // ── Historique ────────────────────────────────────────────────────────────
  transferHistory: WorldTransferRecord[];
  coachChanges: CoachChangeRecord[];

  // ── Promotions/relégations en fin de saison ───────────────────────────────
  promotionRelegationHistory: {
    season: number;
    leagueId: string;
    promoted: string[]; // clubIds
    relegated: string[]; // clubIds
  }[];

  /** Semaine courante dans la saison (1-38) */
  currentWeek: number;

  /** Marqueur de "monde initialisé" */
  initialized: boolean;

  /** Monde fictif d'origine ou monde CP (vrais pays, ligues, clubs) */
  dataset?: "fictional" | "cp";
  /** Monde CP : année civile du début de la saison 1 (2026 → saison 2026-27) */
  startYear?: number;
  /** Monde CP : palmarès individuel et collectif (Ballon d'Or, Golden Boy, buteurs…) */
  awards?: import("./worldAwards").WorldAward[];
  /** Monde CP : buts + passes au dernier « joueur du mois » */
  awardSnap?: Record<string, number>;
  /** Monde CP : coupes nationales, coupes d'Europe CP et tournois des sélections de la saison */
  competitions?: import("./competitions").Competition[];
  /** Monde CP : palmarès des compétitions à élimination */
  trophies?: import("./competitions").TrophyRecord[];
  /** Matchs de coupe déjà joués en direct par l'utilisateur (clé = identifiant du match) */
  forcedTies?: Record<string, import("./competitions").ForcedTie>;
  /** Monde CP : clubs qualifiés pour les coupes d'Europe de la saison suivante */
  continentalNext?: { forSeason: number; ucl: string[]; uel: string[] };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createEmptyWorldLiveState(seed: string): WorldLiveState {
  return {
    seed,
    season: 1,
    countries: [],
    leagues: [],
    clubs: [],
    clubReputations: {},
    clubDirectors: {},
    players: [],
    playerStats: [],
    coaches: [],
    standings: {},
    schedules: {},
    matchResults: [],
    recentResults: [],
    transferHistory: [],
    coachChanges: [],
    promotionRelegationHistory: [],
    currentWeek: 1,
    initialized: false,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getClubPlayers(world: WorldLiveState, clubId: string): WorldPlayer[] {
  return world.players.filter(p => p.clubId === clubId);
}

export function getLeagueStanding(world: WorldLiveState, leagueId: string): StandingRow[] {
  return world.standings[leagueId] ?? [];
}

export function getClubCoach(world: WorldLiveState, clubId: string): WorldCoach | undefined {
  return world.coaches.find(c => c.clubId === clubId && c.teamLevel === "first_team" && c.status === "active");
}

export function getClubReputation(world: WorldLiveState, clubId: string): number {
  return world.clubReputations[clubId] ?? world.clubs.find(c => c.id === clubId)?.reputation ?? 50;
}

export function getTopScorers(world: WorldLiveState, leagueId: string, season: number, limit = 10): WorldPlayerSeasonStats[] {
  return world.playerStats
    .filter(s => s.leagueId === leagueId && s.season === season)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit);
}

export function getRecentTransfers(world: WorldLiveState, limit = 20): WorldTransferRecord[] {
  return [...world.transferHistory]
    .sort((a, b) => b.season - a.season || b.week - a.week)
    .slice(0, limit);
}

export function getLeagueFixtures(world: WorldLiveState, leagueId: string): Fixture[] {
  return world.schedules[leagueId]?.fixtures ?? [];
}

export function getMatchday(world: WorldLiveState, leagueId: string): number {
  return world.schedules[leagueId]?.currentMatchday ?? 1;
}

/** Met à jour le classement après un résultat */
export function applyResultToStanding(
  standings: Record<string, StandingRow[]>,
  result: WorldMatchResult,
): Record<string, StandingRow[]> {
  const leagueId = result.leagueId;
  const rows = [...(standings[leagueId] ?? [])];

  const ensureRow = (clubId: string) => {
    if (!rows.find(r => r.clubId === clubId)) {
      rows.push({ clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    }
  };

  ensureRow(result.homeClubId);
  ensureRow(result.awayClubId);

  const updated = rows.map(r => {
    if (r.clubId !== result.homeClubId && r.clubId !== result.awayClubId) return r;
    const isHome = r.clubId === result.homeClubId;
    const myScore  = isHome ? result.scoreHome : result.scoreAway;
    const oppScore = isHome ? result.scoreAway : result.scoreHome;
    const won   = myScore > oppScore;
    const drawn = myScore === oppScore;
    return {
      ...r,
      played: r.played + 1,
      won:          r.won   + (won   ? 1 : 0),
      drawn:        r.drawn + (drawn ? 1 : 0),
      lost:         r.lost  + (!won && !drawn ? 1 : 0),
      goalsFor:     r.goalsFor + myScore,
      goalsAgainst: r.goalsAgainst + oppScore,
      points: r.points + (won ? 3 : drawn ? 1 : 0),
    };
  });

  updated.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });

  return { ...standings, [leagueId]: updated };
}
