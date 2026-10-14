/**
 * FC CAREER — Simulateur du monde
 * Simule les matchs des autres clubs et met à jour le classement.
 * Aucune dépendance React — pur domaine.
 */

import type { Club, Standing, StandingRow } from "./club";
import type { Fixture, SeasonSchedule } from "./season";
import { createRng, seedFromString } from "../utils/random";

/* ── Résultat d'un match simulé ─────────────────────────────────── */

export interface SimulatedMatchResult {
  fixtureId: string;
  homeClubId: string;
  awayClubId: string;
  scoreHome: number;
  scoreAway: number;
}

/* ── Force relative d'un club (0–1) ─────────────────────────────── */

function clubStrength(club: Club): number {
  // Normalise la réputation (0-100) en force (0.2–1.0)
  return 0.2 + (club.reputation / 100) * 0.8;
}

/* ── Simulation d'un match entre deux clubs ──────────────────────── */

function simulateClubMatch(
  home: Club,
  away: Club,
  rng: ReturnType<typeof createRng>,
): { scoreHome: number; scoreAway: number } {
  const homeStr  = clubStrength(home) * 1.1; // léger avantage domicile
  const awayStr  = clubStrength(away);
  const total    = homeStr + awayStr;
  const homeBias = homeStr / total;

  // Nombre de buts : entre 0 et 5, pondéré par force combinée
  const avgGoals = 2.5 * (homeStr + awayStr) / 2;
  const totalGoals = Math.round(rng.float(0, avgGoals * 1.8));

  let scoreHome = 0;
  let scoreAway = 0;
  for (let i = 0; i < totalGoals; i++) {
    if (rng.chance(homeBias)) scoreHome++;
    else scoreAway++;
  }
  return { scoreHome, scoreAway };
}

/* ── Simule tous les matchs d'une journée ───────────────────────── */

export function simulateMatchday(
  matchday: number,
  schedule: SeasonSchedule,
  clubs: Club[],
  seasonSeed: string,
): SimulatedMatchResult[] {
  const clubMap = new Map(clubs.map(c => [c.id, c]));
  const rng = createRng(seedFromString(`${seasonSeed}-md${matchday}`));
  const results: SimulatedMatchResult[] = [];

  const fixtures = schedule.fixtures.filter(
    (f) => f.matchday === matchday && f.result === null,
  );

  for (const fixture of fixtures) {
    const home = clubMap.get(fixture.homeClubId);
    const away = clubMap.get(fixture.awayClubId);
    if (!home || !away) continue;

    const score = simulateClubMatch(home, away, rng);
    results.push({
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      ...score,
    });
  }

  return results;
}

/* ── Applique les résultats aux fixtures ─────────────────────────── */

export function applyResultsToSchedule(
  schedule: SeasonSchedule,
  results: SimulatedMatchResult[],
): SeasonSchedule {
  const resultMap = new Map(results.map(r => [r.fixtureId, r]));
  return {
    ...schedule,
    fixtures: schedule.fixtures.map((f) => {
      const r = resultMap.get(f.id);
      if (!r) return f;
      return { ...f, result: { scoreHome: r.scoreHome, scoreAway: r.scoreAway } };
    }),
  };
}

/* ── Mise à jour du classement ───────────────────────────────────── */

export function updateStanding(
  standing: StandingRow[],
  results: SimulatedMatchResult[],
  playerClubId: string,
): StandingRow[] {
  const map = new Map(standing.map(r => [r.clubId, { ...r }]));

  // S'assurer que chaque club a bien une entrée
  for (const r of results) {
    if (!map.has(r.homeClubId)) {
      map.set(r.homeClubId, emptyRow(r.homeClubId));
    }
    if (!map.has(r.awayClubId)) {
      map.set(r.awayClubId, emptyRow(r.awayClubId));
    }

    // Ignorer les matchs impliquant le joueur (gérés par APPLY_MATCH_RESULT)
    if (r.homeClubId === playerClubId || r.awayClubId === playerClubId) continue;

    const home = map.get(r.homeClubId)!;
    const away = map.get(r.awayClubId)!;

    home.played++;
    away.played++;
    home.goalsFor     += r.scoreHome;
    home.goalsAgainst += r.scoreAway;
    away.goalsFor     += r.scoreAway;
    away.goalsAgainst += r.scoreHome;

    if (r.scoreHome > r.scoreAway) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (r.scoreHome < r.scoreAway) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    }

    map.set(r.homeClubId, home);
    map.set(r.awayClubId, away);
  }

  return Array.from(map.values()).sort(sortStanding);
}

function emptyRow(clubId: string): StandingRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function sortStanding(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdB !== gdA) return gdB - gdA;
  return b.goalsFor - a.goalsFor;
}

/* ── Initialisation du classement ────────────────────────────────── */

export function buildInitialStanding(clubIds: string[]): StandingRow[] {
  return clubIds.map(emptyRow);
}

/* ── Météo de forme (5 derniers résultats) ───────────────────────── */

export type FormResult = "W" | "D" | "L";

export function getClubForm(
  clubId: string,
  schedule: SeasonSchedule,
  limit = 5,
): FormResult[] {
  const played = schedule.fixtures
    .filter((f) => f.result !== null && (f.homeClubId === clubId || f.awayClubId === clubId))
    .slice(-limit);

  return played.map((f) => {
    const isHome = f.homeClubId === clubId;
    const gs = f.result!.scoreHome;
    const ga = f.result!.scoreAway;
    const myScore  = isHome ? gs : ga;
    const oppScore = isHome ? ga : gs;
    if (myScore > oppScore) return "W";
    if (myScore < oppScore) return "L";
    return "D";
  });
}
