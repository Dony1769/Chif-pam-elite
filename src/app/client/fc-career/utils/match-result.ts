/**
 * FC CAREER — Logique partagee d'application du resultat de match.
 *
 * Utilisee par le dashboard (simulation rapide) et la page match (les deux modes).
 * Garantit que stats, fatigue, forme, wallet, saison et verrouillage
 * sont toujours traites de la meme facon.
 */

import type { CareerRuntimeState } from "../types/career";
import type { SimulatedMatch } from "../types/match";
import type { Player, SeasonStatLine } from "../types/player";
import { advanceSeason } from "../engine/season-manager";
import { endOfWeek } from "../engine/progression";
import { emptyWallet, processWeeklyPayroll, computeMatchBonuses } from "../engine/economic-engine";
import { awardPA, paFromMatch } from "../engine/attribute-points-engine";
import type { MatchDay } from "../types/game";

function emptyStatLine(seasonYear: number, clubId: string, competitionId: string): SeasonStatLine {
  return { seasonYear, clubId, competitionId, matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, averageRating: 0, overallAtSeasonEnd: 0 };
}

/* ---- Verrouillage (un seul match par jour) ---- */

const MATCH_LOCK_KEY = "fc-career:match-lock";

export function isMatchLocked(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(MATCH_LOCK_KEY) === new Date().toDateString(); } catch { return false; }
}

export function lockMatchForToday(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(MATCH_LOCK_KEY, new Date().toDateString()); } catch {}
}

/* ---- Match state persistence (reprise apres crash) ---- */

const MATCH_STATE_KEY = "fc-career:match-state";

export interface MatchInProgress {
  fixtureId: string;
  startedAt: number;
  result?: SimulatedMatch;
}

export function saveMatchState(ms: MatchInProgress): void {
  try { localStorage.setItem(MATCH_STATE_KEY, JSON.stringify(ms)); } catch {}
}

export function loadMatchState(): MatchInProgress | null {
  try { const r = localStorage.getItem(MATCH_STATE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

export function clearMatchState(): void {
  try { localStorage.removeItem(MATCH_STATE_KEY); } catch {}
}

/* ---- Application du resultat ---- */

export interface ApplyMatchResultInput {
  career: CareerRuntimeState;
  player: Player;
  clubId: string;
  fixture: MatchDay;
  sim: SimulatedMatch;
}

/**
 * Calcule le nouvel etat de carriere apres un match (simuler ou jouer).
 * Ne mute rien — renvoie le nouvel etat pret a etre persiste.
 */
export function buildPostMatchState(input: ApplyMatchResultInput): CareerRuntimeState {
  const { career, player, fixture, sim } = input;
  const season = career.meta.season!;

  const line = { ...(player.seasonStats[0] ?? emptyStatLine(season.seasonYear, player.contract.clubId, fixture.competitionId)) };
  line.matches += 1;
  if (sim.userPlayed) line.starts += 1;
  line.minutes += sim.userMinutes;
  line.goals += sim.userRating.goals;
  line.assists += sim.userRating.assists;
  line.averageRating = (line.averageRating * (line.matches - 1) + sim.userRating.rating) / line.matches;

  const lastThree = [...player.lastThreeMatchRatings, sim.userRating.rating].slice(-3);

  const pa = paFromMatch(sim.userRating.rating);
  const playerWithPA = awardPA(player, pa);

  const updatedPlayer: Player = {
    ...playerWithPA,
    seasonStats: [line, ...player.seasonStats.slice(1)],
    fatigue: Math.min(100, player.fatigue + 22),
    form: Math.max(0, Math.min(100, player.form + (sim.userRating.rating >= 7 ? 4 : sim.userRating.rating <= 5 ? -3 : 0))),
    lastThreeMatchRatings: lastThree,
  };

  const advanced = advanceSeason(season, [{ dayId: fixture.id, homeScore: sim.homeScore, awayScore: sim.awayScore }]);
  const wallet = career.wallet ?? emptyWallet();
  const bonuses = computeMatchBonuses(updatedPlayer, sim);
  const payroll = processWeeklyPayroll(wallet, updatedPlayer, advanced.currentDay, bonuses, [], updatedPlayer.seasonStats[0]?.minutes ?? 0, 200);

  return {
    ...career,
    player: endOfWeek(updatedPlayer),
    wallet: payroll.wallet,
    meta: { ...career.meta, season: advanced },
    lastMatch: sim,
  };
}
