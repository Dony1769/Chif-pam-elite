/**
 * FC CAREER — Générateur du monde initial
 * Crée un monde complet déterministe depuis une seed :
 * clubs, joueurs, coachs, directeurs, calendriers, classements.
 * Ce module est le point de départ de toute nouvelle carrière.
 */

import { COUNTRIES, LEAGUES, CLUBS } from "../data/world";
import { getAllWorldPlayers } from "../data/worldPlayers";
import { generateWorldCoach } from "./worldCoach";
import { createClubDirectorAI } from "./clubAI";
import { createRng, seedFromString } from "../utils/random";
import type { WorldLiveState, LeagueSchedule } from "./worldState";
import type { WorldCoach } from "./worldCoach";
import { createEmptyWorldLiveState, applyResultToStanding } from "./worldState";
import type { Fixture } from "./season";
import type { StandingRow } from "./club";

// ─── Générateur de calendrier (round-robin) ───────────────────────────────────

/**
 * Génère un calendrier round-robin double (aller-retour) pour une ligue.
 * Algorithme de Berger : toutes les équipes se rencontrent 2 fois.
 */
export function generateLeagueSchedule(
  leagueId: string,
  clubIds: string[],
  season: number,
  seed: string,
): LeagueSchedule {
  const n = clubIds.length;
  const clubs = [...clubIds];

  // Si nombre impair : ajoute un "bye" fictif
  if (n % 2 !== 0) clubs.push("__bye__");
  const m = clubs.length;

  const rng = createRng(seedFromString(`${seed}-schedule-${leagueId}-${season}`));

  // Mélange aléatoire reproductible
  const shuffled = rng.shuffle([...clubs]);

  const fixtures: Fixture[] = [];
  let fixtureIdx = 0;
  const rounds = (m - 1) * 2; // aller-retour
  const matchesPerRound = m / 2;

  // Génère les rondes aller
  const home: string[] = shuffled.slice(0, m / 2);
  const away: string[] = shuffled.slice(m / 2).reverse();

  for (let round = 0; round < (m - 1); round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const h = home[i];
      const a = away[i];
      if (h === "__bye__" || a === "__bye__") continue;

      fixtures.push({
        id: `${leagueId}-s${season}-md${round + 1}-${fixtureIdx++}`,
        season,
        matchday: round + 1,
        homeClubId: round % 2 === 0 ? h : a,
        awayClubId: round % 2 === 0 ? a : h,
        competitionId: leagueId,
        result: null,
      });
    }

    // Rotation : le premier reste, les autres tournent
    const last = away.pop()!;
    away.unshift(home[home.length - 1]);
    home[home.length - 1] = home[home.length - 2];
    home[home.length - 2] = last;
  }

  // Génère les rondes retour (miroir des allers avec équipes inversées)
  const allerFixtures = [...fixtures];
  for (const f of allerFixtures) {
    const retourMatchday = f.matchday + (m - 1);
    fixtures.push({
      id: `${leagueId}-s${season}-md${retourMatchday}-${fixtureIdx++}`,
      season,
      matchday: retourMatchday,
      homeClubId: f.awayClubId, // inverser domicile/extérieur
      awayClubId: f.homeClubId,
      competitionId: leagueId,
      result: null,
    });
  }

  return {
    leagueId,
    season,
    fixtures,
    currentMatchday: 1,
    totalMatchdays: rounds,
  };
}

// ─── Initialisation des classements ──────────────────────────────────────────

export function buildInitialStandings(clubIds: string[]): StandingRow[] {
  return clubIds.map(id => ({
    clubId: id,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, points: 0,
  }));
}

// ─── Génération des coachs de tout le monde ───────────────────────────────────

function generateAllCoaches(seed: string, season: number): WorldCoach[] {
  const coaches: WorldCoach[] = [];

  for (const club of CLUBS) {
    // Coach équipe première
    coaches.push(generateWorldCoach(
      club.id,
      club.countryId,
      "first_team",
      club.reputation,
      season,
      `${seed}-coach-first-${club.id}`,
    ));

    // Coach réserve (clubs avec académyLevel >= 2)
    if (club.academyLevel >= 2) {
      coaches.push(generateWorldCoach(
        club.id,
        club.countryId,
        "reserve",
        Math.max(20, club.reputation - 20),
        season,
        `${seed}-coach-reserve-${club.id}`,
      ));
    }

    // Coach académie (clubs avec académyLevel >= 3)
    if (club.academyLevel >= 3) {
      coaches.push(generateWorldCoach(
        club.id,
        club.countryId,
        "academy",
        Math.max(20, club.reputation - 35),
        season,
        `${seed}-coach-academy-${club.id}`,
      ));
    }
  }

  return coaches;
}

// ─── Génération des directeurs de club ───────────────────────────────────────

function generateAllDirectors(seed: string): Record<string, import("./clubAI").ClubDirectorAI> {
  const directors: Record<string, import("./clubAI").ClubDirectorAI> = {};
  const leagueSizes: Record<string, number> = {};

  for (const league of LEAGUES) {
    leagueSizes[league.id] = league.clubCount;
  }

  for (const club of CLUBS) {
    const leagueSize = leagueSizes[club.leagueId] ?? 8;
    directors[club.id] = createClubDirectorAI(
      club,
      leagueSize,
      `${seed}-director-${club.id}`,
    );
  }

  return directors;
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

/**
 * Génère le monde complet au démarrage d'une carrière.
 * Reproductible : le même seed produit toujours le même monde.
 */
export function generateWorld(careerId: string): WorldLiveState {
  const seed = `fc-world-${careerId}`;
  const world = createEmptyWorldLiveState(seed);

  world.countries = COUNTRIES;
  world.leagues = LEAGUES;
  world.clubs = CLUBS;
  world.season = 1;
  world.currentWeek = 1;

  // Réputations initiales
  for (const club of CLUBS) {
    world.clubReputations[club.id] = club.reputation;
  }

  // Générer les directeurs
  world.clubDirectors = generateAllDirectors(seed);

  // Générer les joueurs monde
  world.players = getAllWorldPlayers();

  // Générer les coachs
  world.coaches = generateAllCoaches(seed, 1);

  // Générer les calendriers pour toutes les ligues
  for (const league of LEAGUES) {
    const clubIds = CLUBS.filter(c => c.leagueId === league.id).map(c => c.id);
    world.schedules[league.id] = generateLeagueSchedule(league.id, clubIds, 1, seed);
    world.standings[league.id] = buildInitialStandings(clubIds);
  }

  world.initialized = true;

  return world;
}

// ─── Transition de saison ─────────────────────────────────────────────────────

/**
 * Prépare le monde pour la saison suivante :
 * - Renouvelle les calendriers
 * - Remet les standings à zéro
 * - Applique les promotions/relégations
 * - Fait vieillir les clubs et coachs
 */
export function advanceWorldSeason(
  world: WorldLiveState,
  promotionResults: { leagueId: string; promoted: string[]; relegated: string[] }[],
  seed: string,
): WorldLiveState {
  const nextSeason = world.season + 1;
  const newWorld = { ...world, season: nextSeason, currentWeek: 1 };

  // Appliquer promotions/relégations : swap des clubs entre divisions
  const newClubs = applyPromotionRelegation(world.clubs, world.leagues, promotionResults);
  newWorld.clubs = newClubs;

  // Régénérer les calendriers
  const newSchedules: Record<string, LeagueSchedule> = {};
  const newStandings: Record<string, StandingRow[]> = {};

  for (const league of world.leagues) {
    const clubIds = newClubs.filter(c => c.leagueId === league.id).map(c => c.id);
    newSchedules[league.id] = generateLeagueSchedule(league.id, clubIds, nextSeason, seed);
    newStandings[league.id] = buildInitialStandings(clubIds);
  }

  newWorld.schedules = newSchedules;
  newWorld.standings = newStandings;

  // Enregistrer les résultats de promotion/relégation dans l'historique
  newWorld.promotionRelegationHistory = [
    ...world.promotionRelegationHistory,
    ...promotionResults.map(r => ({ season: world.season, ...r })),
  ];

  return newWorld;
}

// ─── Application des promotions/relégations ───────────────────────────────────

function applyPromotionRelegation(
  clubs: typeof CLUBS,
  leagues: typeof LEAGUES,
  results: { leagueId: string; promoted: string[]; relegated: string[] }[],
): typeof CLUBS {
  const updatedClubs = clubs.map(c => ({ ...c }));

  for (const result of results) {
    const sourceLeague = leagues.find(l => l.id === result.leagueId);
    if (!sourceLeague) continue;

    const targetTier = sourceLeague.tier === 1 ? 2 : 1; // ou inverse
    const targetLeague = leagues.find(
      l => l.countryId === sourceLeague.countryId && l.tier === targetTier
    );
    if (!targetLeague) continue;

    // Relegués : descendent dans la ligue inférieure
    for (const clubId of result.relegated) {
      const club = updatedClubs.find(c => c.id === clubId);
      if (club && sourceLeague.tier === 1) {
        club.leagueId = targetLeague.id;
        club.tier = 2 as typeof club.tier;
      }
    }

    // Promus : montent dans la ligue supérieure
    for (const clubId of result.promoted) {
      const club = updatedClubs.find(c => c.id === clubId);
      if (club && sourceLeague.tier === 2) {
        const d1League = leagues.find(l => l.countryId === sourceLeague.countryId && l.tier === 1);
        if (d1League) {
          club.leagueId = d1League.id;
          club.tier = 1 as typeof club.tier;
        }
      }
    }
  }

  return updatedClubs;
}
