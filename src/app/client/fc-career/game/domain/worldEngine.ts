/**
 * FC CAREER — Moteur du monde vivant
 * Avance le monde d'une semaine ou d'une saison complète.
 * Aucune boucle permanente — appelé uniquement lors d'actions calendaires.
 * Déterministe : même état + même seed → même résultat.
 */

import type { WorldLiveState, WorldMatchResult, WorldTransferRecord, CoachChangeRecord } from "./worldState";
import { applyResultToStanding } from "./worldState";
import { simulateMatchday } from "./worldMatchEngine";
import type { WorldCoach } from "./worldCoach";
import {
  evaluateFiringDecision,
  recruitReplacementCoach,
  updateCoachSatisfaction,
  evaluateResignation,
} from "./worldCoach";
import { evaluateClubSeason } from "./clubAI";
import { simulateWorldTransfers } from "./worldTransfers";
import { generateYouthPlayer, progressWorldPlayers } from "./playerProgression";
import { inventPlayer } from "../data/cp/cpWorld";
import { playerValue } from "./playerValue";
import { weekDays } from "./calendar";
import { runAwards } from "./worldAwards";
import { advanceWorldSeason, buildInitialStandings, generateLeagueSchedule } from "./worldGenerator";
import { computePromotionRelegation } from "./worldSimulator";
import { createRng, seedFromString } from "../utils/random";
import type { WorldPlayer } from "../data/worldPlayers";
import { generateId } from "../utils/ids";
import { fullName } from "../utils/names";

// ─── Type de retour ───────────────────────────────────────────────────────────

export interface WeekAdvanceResult {
  world: WorldLiveState;
  /** Résultats des matchs simulés cette semaine */
  weekResults: WorldMatchResult[];
  /** Événements notables (licenciements, transferts, etc.) */
  newsItems: string[];
}

// ─── Avancer d'une semaine ────────────────────────────────────────────────────

/**
 * Simule une semaine de jeu :
 * - Simule les matchs du calendrier de la journée courante dans chaque ligue
 * - Applique les résultats aux classements
 * - Décide des licenciements/resignations de coachs
 * - Lance quelques micro-transfers (si mercato ouvert)
 */
export function advanceWorldWeek(world: WorldLiveState): WeekAdvanceResult {
  const weekSeed = `${world.seed}-week-${world.season}-${world.currentWeek}`;
  const rng = createRng(seedFromString(weekSeed));

  let current = { ...world };
  const weekResults: WorldMatchResult[] = [];
  const newsItems: string[] = [];

  // ── 1. Simuler les matchs de la journée dans chaque ligue ──────────────────
  for (const league of current.leagues) {
   // Monde CP : toutes les journées prévues cette semaine (0, 1 ou 2) ; sinon une par semaine
   const first = current.schedules[league.id];
   if (!first) continue;
   const days: number[] = [];
   if (first.weekOf) {
     for (let md = first.currentMatchday; md <= first.totalMatchdays && first.weekOf[md - 1] <= current.currentWeek; md++) days.push(md);
   } else if (first.currentMatchday <= first.totalMatchdays) days.push(first.currentMatchday);
   for (const matchday of days) {
    const schedule = current.schedules[league.id];

    const output = simulateMatchday({
      leagueId:   league.id,
      matchday,
      season:     current.season,
      fixtures:   schedule.fixtures,
      getClubSnapshot: (clubId: string) => ({
        clubId,
        players:    current.players.filter(p => p.clubId === clubId),
        coach:      current.coaches.find(
          c => c.clubId === clubId && c.teamLevel === "first_team" && c.status === "active"
        ) ?? null,
        reputation: current.clubReputations[clubId] ?? 50,
      }),
    });

    // Appliquer les résultats aux classements
    for (const result of output.results) {
      current.standings = applyResultToStanding(current.standings, result);
      weekResults.push(result);
    }

    // Marquer les fixtures comme jouées
    const updatedFixtures = schedule.fixtures.map(f => {
      const r = output.results.find(res => res.fixtureId === f.id);
      if (r) {
        return {
          ...f,
          result: {
            scoreHome: r.scoreHome,
            scoreAway: r.scoreAway,
          },
        };
      }
      return f;
    });

    current = {
      ...current,
      schedules: {
        ...current.schedules,
        [league.id]: {
          ...schedule,
          fixtures:        updatedFixtures,
          currentMatchday: matchday + 1,
        },
      },
    };

    // Stats joueurs (index par joueur pour rester rapide avec ~5 000 joueurs)
    const updatedPlayerStats = [...current.playerStats];
    const statIndex = new Map<string, number>();
    updatedPlayerStats.forEach((s, i) => { if (s.season === current.season) statIndex.set(`${s.playerId}|${s.leagueId}`, i); });
    for (const u of output.playerStatUpdates) {
      const key = `${u.playerId}|${u.leagueId}`;
      const idx = statIndex.get(key);
      if (idx !== undefined) {
        updatedPlayerStats[idx] = {
          ...updatedPlayerStats[idx],
          goals:       updatedPlayerStats[idx].goals + u.goals,
          assists:     updatedPlayerStats[idx].assists + u.assists,
          appearances: updatedPlayerStats[idx].appearances + 1,
        };
      } else {
        statIndex.set(key, updatedPlayerStats.length);
        updatedPlayerStats.push({
          playerId:    u.playerId,
          clubId:      u.clubId,
          leagueId:    u.leagueId,
          season:      current.season,
          goals:       u.goals,
          assists:     u.assists,
          appearances: 1,
          yellowCards: 0,
          redCards:    0,
          avgRating:   6.5,
        });
      }
    }
    current = { ...current, playerStats: updatedPlayerStats };
  }
   }

  // ── 2. Stocker les résultats récents (20 max) ─────────────────────────────
  current = {
    ...current,
    matchResults:  [...current.matchResults, ...weekResults],
    recentResults: [...weekResults, ...current.recentResults].slice(0, 20),
    currentWeek:   current.currentWeek + 1,
  };

  // Monde CP : cérémonies de la semaine écoulée (joueur du mois, Ballon d'Or…)
  const ceremony = runAwards(current, current.currentWeek - 1);
  current = ceremony.world;
  newsItems.push(...ceremony.news);

  // Monde CP : anniversaires de la semaine (l'âge ne dépend plus de la fin de saison)
  if (current.dataset === "cp" && current.startYear) {
    const days = new Set(weekDays(current.startYear + current.season - 1, current.currentWeek - 1));
    current = { ...current, players: current.players.map(p => (p.birthDay && p.clubId !== "retired" && days.has(p.birthDay) ? { ...p, age: p.age + 1 } : p)) };
  }

  // ── 3. Évaluation des coachs (chaque 4 semaines) ──────────────────────────
  if (current.currentWeek % 4 === 0) {
    const coachChanges: CoachChangeRecord[] = [];
    const updatedCoaches = [...current.coaches];

    for (const league of current.leagues) {
      const standing = current.standings[league.id] ?? [];
      const totalClubs = standing.length;

      for (let i = 0; i < updatedCoaches.length; i++) {
        const coach = updatedCoaches[i];
        if (coach.status !== "active" || coach.teamLevel !== "first_team") continue;

        const clubStandingRow = standing.find(r => r.clubId === coach.clubId);
        if (!clubStandingRow) continue;

        const leaguePos = standing.indexOf(clubStandingRow) + 1;
        const director  = current.clubDirectors[coach.clubId ?? ""];
        if (!director) continue;

        const perf = {
          leaguePosition: leaguePos,
          totalClubs,
          expectedPosition: Math.ceil(totalClubs * 0.5), // simplification : milieu de tableau
          lastFiveResults: [] as ("W" | "D" | "L")[],
          goalsFor: 0,
          goalsAgainst: 0,
          season: current.season,
          week: current.currentWeek,
        };

        // Satisfaction
        updatedCoaches[i] = updateCoachSatisfaction(coach, perf);

        // Résignation ?
        const resign = evaluateResignation(updatedCoaches[i], perf);
        if (resign.resign) {
          updatedCoaches[i] = { ...updatedCoaches[i], status: "resigned" };
          coachChanges.push({
            id:          generateId("cc"),
            season:      current.season,
            week:        current.currentWeek,
            clubId:      coach.clubId!,
            outCoachId:  coach.id,
            outCoachName:`${fullName(coach)}`,
            inCoachId:   "",
            inCoachName: "Poste vacant",
            reason:      "resigned",
          });
          newsItems.push(`${fullName(coach)} démissionne.`);
          continue;
        }

        // Licenciement par la direction ?
        const club = current.clubs.find(c => c.id === coach.clubId);
        if (club) {
          const firing = evaluateFiringDecision(updatedCoaches[i], perf, director.patience);
          if (firing.fire) {
            updatedCoaches[i] = { ...updatedCoaches[i], status: "fired" };
            // Recruter un remplaçant
            const available = updatedCoaches.filter(
              c => c.status === "unemployed" || c.status === "fired"
            );
            const replacement = recruitReplacementCoach(
              club.reputation,
              club.countryId,
              "first_team",
              available,
              current.season,
              rng,
            );
            if (replacement) {
              const replIdx = updatedCoaches.findIndex(c => c.id === replacement.id);
              if (replIdx >= 0) {
                updatedCoaches[replIdx] = {
                  ...updatedCoaches[replIdx],
                  clubId:       coach.clubId,
                  status:       "active",
                  hiredSeason:  current.season,
                  hiredWeek:    current.currentWeek,
                };
              }
              coachChanges.push({
                id:          generateId("cc"),
                season:      current.season,
                week:        current.currentWeek,
                clubId:      coach.clubId!,
                outCoachId:  coach.id,
                outCoachName:`${fullName(coach)}`,
                inCoachId:   replacement.id,
                inCoachName: `${fullName(replacement)}`,
                reason:      "fired",
              });
              newsItems.push(`${fullName(coach)} limogé, ${fullName(replacement)} nommé.`);
            }
          }
        }
      }
    }

    current = {
      ...current,
      coaches:      updatedCoaches,
      coachChanges: [...current.coachChanges, ...coachChanges],
    };
  }

  return { world: current, weekResults, newsItems };
}

// ─── Fin de saison ────────────────────────────────────────────────────────────

export interface SeasonEndResult {
  world: WorldLiveState;
  promotionRelegation: { leagueId: string; promoted: string[]; relegated: string[] }[];
  newsItems: string[];
}

/**
 * Clôt la saison :
 * - Calcule les promotions/relégations
 * - Fait vieillir les joueurs
 * - Simule les transferts de fin de saison
 * - Passe à la saison suivante
 */
export function endWorldSeason(world: WorldLiveState): SeasonEndResult {
  const endSeed = `${world.seed}-end-s${world.season}`;
  const rng = createRng(seedFromString(endSeed));

  let current = { ...world };
  const newsItems: string[] = [];

  // ── 1. Promotions / Relégations ───────────────────────────────────────────
  const promotionResults: { leagueId: string; promoted: string[]; relegated: string[] }[] = [];

  for (const league of current.leagues) {
    const standing = current.standings[league.id] ?? [];
    if (standing.length < 4) continue;

    // Top 2 promus (si ligue D2), bottom 3 relégués (si ligue D1)
    const swap = (league as { swap?: number }).swap ?? 3;
    const result = computePromotionRelegation(league.id, standing, standing.length, rng, swap);
    promotionResults.push({
      leagueId: league.id,
      promoted:  result.promoted,
      relegated: result.relegated,
    });

    if (result.promoted.length > 0) {
      const names = result.promoted
        .map(clubId => current.clubs.find(c => c.id === clubId)?.shortName ?? clubId)
        .join(", ");
      newsItems.push(`Promus de ${league.name} : ${names}`);
    }
    if (result.relegated.length > 0) {
      const names = result.relegated
        .map(clubId => current.clubs.find(c => c.id === clubId)?.shortName ?? clubId)
        .join(", ");
      newsItems.push(`Relégués de ${league.name} : ${names}`);
    }
  }

  // ── 2. Vieillissement, progression, retraites, jeunes ─────────────────────
  // Une seule passe : l'ancienne combinaison ageWorldPlayers + progressWorldPlayers
  // vieillissait et faisait progresser chaque joueur DEUX fois par saison, et les
  // retraités marqués par ageWorldPlayers restaient dans leur club (effectifs qui
  // gonflaient, niveau du monde +2 points par saison).
  const { updated: progressedPlayers, events: progressionEvents } = progressWorldPlayers(
    current.players, current.season, endSeed, current.dataset === "cp");
  for (const ev of progressionEvents.filter(e => e.type === "retirement").slice(0, 3)) {
    newsItems.push(ev.description);
  }
  for (const ev of progressionEvents.filter(e => e.type === "breakout").slice(0, 3)) {
    newsItems.push(ev.description);
  }

  // ── 3. Transferts de fin de saison ────────────────────────────────────────
  const { updated: transferredPlayers, events: transferEvents } = simulateWorldTransfers(
    progressedPlayers, current.clubs, current.season, rng
  );

  // Convertir les events en WorldTransferRecord
  const newTransfers: WorldTransferRecord[] = transferEvents.map(ev => ({
    id:          generateId("tr"),
    season:      ev.season,
    week:        current.currentWeek,
    type:        ev.type === "loan" ? "loan"
               : ev.type === "retirement" ? "retirement"
               : ev.type === "youth_breakout" ? "youth_breakout"
               : "transfer",
    playerId:    ev.playerId,
    playerName:  `${ev.playerFirstName} ${ev.playerLastName}`,
    fromClubId:  ev.fromClubId,
    toClubId:    ev.toClubId,
    fee:         0,
    salary:      0,
    description: ev.description,
  }));

  for (const ev of transferEvents.slice(0, 5)) {
    newsItems.push(ev.description);
  }

  // ── 4. Évaluation des clubs — changements de direction envers les coachs ──
  for (const league of current.leagues) {
    const standing = current.standings[league.id] ?? [];
    const totalClubs = standing.length;

    for (const row of standing) {
      const coach = current.coaches.find(
        c => c.clubId === row.clubId && c.teamLevel === "first_team" && c.status === "active"
      );
      const director = current.clubDirectors[row.clubId];
      const club = current.clubs.find(c => c.id === row.clubId);
      if (!coach || !director || !club) continue;

      const position = standing.indexOf(row) + 1;
      const evaluation = evaluateClubSeason(club, director, position, totalClubs, coach);

      if (evaluation.actions.includes("renew_coach")) {
        newsItems.push(`${club.shortName} renouvelle le contrat de ${fullName(coach)}.`);
      }
    }
  }

  // ── 5. Avancer la saison (régénère calendriers, standings) ───────────────
  current = {
    ...current,
    // Valeurs marchandes recalculées après progression et vieillissement
    players:         topUpSquads(transferredPlayers, current.clubs, current.season, rng)
      .map(p => (p.clubId === "retired" ? p : { ...p, marketValue: playerValue(current.dataset, p.overall, p.age, p.potential) })),
    transferHistory: [...current.transferHistory, ...newTransfers],
  };

  const newWorld = advanceWorldSeason(current, promotionResults, endSeed);

  return {
    world: newWorld,
    promotionRelegation: promotionResults,
    newsItems,
  };
}

// ─── Simulation rapide de plusieurs semaines ──────────────────────────────────

/**
 * Simule N semaines en une seule passe (ex: simuler une semaine adverse pendant que
 * le joueur joue son propre match).
 */
export function advanceWorldWeeks(world: WorldLiveState, weeks: number): WeekAdvanceResult {
  let current = world;
  let allResults: WorldMatchResult[] = [];
  let allNews: string[] = [];

  for (let i = 0; i < weeks; i++) {
    const result = advanceWorldWeek(current);
    current    = result.world;
    allResults = [...allResults, ...result.weekResults];
    allNews    = [...allNews, ...result.newsItems];
  }

  return { world: current, weekResults: allResults, newsItems: allNews };
}

// ─── Effectif minimum ────────────────────────────────────────────────────────

const MIN_SQUAD = 16;
const TOPUP_POSITIONS: WorldPlayer["position"][] = ["GK", "CB", "CM", "ST", "LB", "RB", "DM", "AM", "LW", "RW"];

/**
 * À l'intersaison, un club que les transferts ont vidé sous 16 joueurs
 * complète avec des jeunes de son centre (priorité aux postes manquants).
 */
export function topUpSquads(
  players: WorldPlayer[],
  clubs: { id: string; leagueId: string; countryId: string }[],
  season: number,
  rng: ReturnType<typeof createRng>,
): WorldPlayer[] {
  const out = [...players];
  for (const club of clubs) {
    const squad = out.filter(p => p.clubId === club.id);
    let missing = MIN_SQUAD - squad.length;
    let k = 0;
    while (missing-- > 0) {
      const counts = (pos: string) => out.filter(p => p.clubId === club.id && p.position === pos).length;
      const pos = TOPUP_POSITIONS.find(p => counts(p) === 0) ?? (counts("GK") < 2 ? "GK" : TOPUP_POSITIONS[(k++ % (TOPUP_POSITIONS.length - 1)) + 1]);
      if (players.some(p => p.face)) {
        // Monde CP : jeune du centre inventé à la nationalité du pays
        out.push(inventPlayer({
          id: `yt-${club.id}-s${season}-${missing}-${k}`, clubId: club.id, leagueId: club.leagueId, countryId: club.countryId,
          pos, ovr: rng.int(50, 60), age: rng.int(17, 19), pot: rng.int(65, 82), seed: `topup-${club.id}-${season}-${missing}-${k}`,
        }));
        continue;
      }
      const y = generateYouthPlayer(pos, club.id, season, rng);
      out.push({ ...y, leagueId: club.leagueId, countryId: club.countryId });
    }
  }
  return out;
}
