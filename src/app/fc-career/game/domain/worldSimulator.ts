/**
 * FC CAREER — Simulateur du monde
 * Moteur hybride : résultats générés depuis OVR/forme/fatigue/avantage domicile + aléatoire.
 * Un seul moteur pour tous les matchs — classements et stats cohérents.
 * Support relégation/promotion dynamique.
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
  /** Buteurs (IDs des joueurs monde) */
  scorers?: { clubId: string; playerId: string; minute: number }[];
  /** Passes décisives */
  assists?: { clubId: string; playerId: string; scorerPlayerId: string }[];
}

/* ── Résultats de relégation/promotion ─────────────────────────── */

export interface PromotionRelegationResult {
  leagueId: string;
  promoted: string[];   // clubIds promus
  relegated: string[];  // clubIds relégués
}

/* ── Force d'un club (0–1) — moteur hybride ─────────────────────── */

export interface ClubFormState {
  recentResults: ("W" | "D" | "L")[]; // 5 derniers
  fatigue: number;     // 0-100 (100 = épuisé)
  cohesion: number;    // 0-100
  tacticsRating: number; // 0-100
}

function clubStrength(
  club: Club,
  form?: ClubFormState,
): number {
  // Base depuis la réputation (0-100) → force (0.2–0.9)
  let strength = 0.2 + (club.reputation / 100) * 0.7;

  if (form) {
    // Forme récente (5 derniers matchs)
    const formScore = form.recentResults.reduce((acc, r) => {
      if (r === "W") return acc + 1;
      if (r === "D") return acc + 0.4;
      return acc;
    }, 0) / Math.max(form.recentResults.length, 1);
    const formFactor = 0.7 + formScore * 0.6; // 0.7–1.3
    strength *= formFactor;

    // Fatigue
    const fatigueFactor = 1 - (form.fatigue / 100) * 0.2; // max -20%
    strength *= fatigueFactor;

    // Cohésion tactique
    const cohesionFactor = 0.85 + (form.cohesion / 100) * 0.3;
    strength *= cohesionFactor;

    // Tactique
    const tacticsFactor = 0.9 + (form.tacticsRating / 100) * 0.2;
    strength *= tacticsFactor;
  }

  return Math.max(0.1, Math.min(1.0, strength));
}

/* ── Simulation d'un match (moteur central) ─────────────────────── */

function simulateClubMatch(
  home: Club,
  away: Club,
  rng: ReturnType<typeof createRng>,
  homeForm?: ClubFormState,
  awayForm?: ClubFormState,
): { scoreHome: number; scoreAway: number } {
  const homeStr  = clubStrength(home, homeForm) * 1.12; // avantage domicile
  const awayStr  = clubStrength(away, awayForm);
  const total    = homeStr + awayStr;
  const homeBias = homeStr / total;

  // Distribution buts : Poisson approximé
  const avgGoals = 1.8 + (homeStr + awayStr) * 0.8;
  const maxGoals = Math.min(9, Math.round(avgGoals * 2));
  let totalGoals = 0;
  for (let i = 0; i < maxGoals; i++) {
    if (rng.chance(avgGoals / maxGoals)) totalGoals++;
  }

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
  formStates?: Map<string, ClubFormState>,
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

    const homeForm = formStates?.get(fixture.homeClubId);
    const awayForm = formStates?.get(fixture.awayClubId);
    const score = simulateClubMatch(home, away, rng, homeForm, awayForm);
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

/* ── Mise à jour du classement (même moteur, même résultats) ──────── */

export function updateStanding(
  standing: StandingRow[],
  results: SimulatedMatchResult[],
  playerClubId: string,
): StandingRow[] {
  const map = new Map(standing.map(r => [r.clubId, { ...r }]));

  // S'assurer que chaque club a bien une entrée
  for (const r of results) {
    if (!map.has(r.homeClubId)) map.set(r.homeClubId, emptyRow(r.homeClubId));
    if (!map.has(r.awayClubId)) map.set(r.awayClubId, emptyRow(r.awayClubId));

    // Les matchs du joueur sont gérés par APPLY_MATCH_RESULT
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

/* ── Relégation / Promotion dynamique ───────────────────────────── */

/**
 * Calcule les relégations et promotions à la fin de saison.
 * - Les 3 derniers sont relégués (si league assez grande)
 * - Le champion + 2e sont promus automatiquement
 * - Le 3e à 6e jouent des barrages (simulés simplement)
 */
export function computePromotionRelegation(
  leagueId: string,
  finalStanding: StandingRow[],
  clubCount: number,
  rng: ReturnType<typeof createRng>,
  /** Clubs échangés entre D1 et D2 (3 par défaut, 2 en Allemagne et en France) */
  swap = 3,
): PromotionRelegationResult {
  const n = finalStanding.length;
  if (n < 6) return { leagueId, promoted: [], relegated: [] };

  // Relégation : les `swap` derniers
  const relegated = finalStanding.slice(n - swap).map(r => r.clubId);

  // Promotion directe : champion et vice-champion
  const promoted: string[] = [finalStanding[0].clubId, finalStanding[1].clubId];
  if (swap <= 2) return { leagueId, promoted: promoted.slice(0, swap), relegated };

  // Barrages : 3e et 4e (le 3e est légèrement favorisé)
  const playoff3 = finalStanding[2];
  const playoff4 = finalStanding[3];
  const str3 = playoff3.points + (playoff3.goalsFor - playoff3.goalsAgainst);
  const str4 = playoff4.points + (playoff4.goalsFor - playoff4.goalsAgainst);
  const total = Math.max(str3 + str4, 1);
  const winner = rng.chance(str3 / total) ? playoff3.clubId : playoff4.clubId;
  promoted.push(winner);

  return { leagueId, promoted, relegated };
}

/* ── Vieillissement des clubs / évolution OVR ────────────────────── */

/**
 * Met à jour la réputation d'un club en fin de saison selon ses performances.
 * Un grand club peut décliner, un petit peut progresser.
 */
export function updateClubReputation(
  club: Club,
  standing: StandingRow[],
  season: number,
  rng: ReturnType<typeof createRng>,
): Club {
  const row = standing.find(r => r.clubId === club.id);
  if (!row) return club;

  const position = standing.findIndex(r => r.clubId === club.id) + 1;
  const total = standing.length;
  const relativePct = 1 - (position - 1) / Math.max(total - 1, 1); // 0=dernier, 1=premier

  // Tendance longue (réversion à la moyenne)
  const meanRep = 50;
  const reversion = (meanRep - club.reputation) * 0.05;

  // Performance
  const performanceDelta = (relativePct - 0.5) * 6; // -3 à +3

  // Aléatoire
  const noise = rng.float(-1.5, 1.5);

  const newRep = Math.max(10, Math.min(100,
    club.reputation + reversion + performanceDelta + noise
  ));

  return { ...club, reputation: Math.round(newRep) };
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
