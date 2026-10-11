/**
 * FC CAREER — Season manager : calendrier, compétitions, avancements
 */

import type { SeasonState, MatchDay } from "../types/game";
import type { Club, CompetitionId, LeagueStandingRow } from "../types/club";
import { getCompetitionsForDivision } from "../constants/competitions";

const DAY_MS = 7 * 24 * 3600 * 1000; // une journée de jeu = 1 semaine

/** Génère un calendrier aller-retour (méthode du cercle) pour n clubs. */
export function generateRoundRobin(clubs: Club[], startISO: string): MatchDay[] {
  const ids = clubs.map((c) => c.id);
  if (ids.length % 2 !== 0) ids.push("BYE");
  const rounds = ids.length - 1;
  const half = ids.length / 2;
  const fixtures: MatchDay[] = [];
  let rotation = [...ids];
  const startDate = new Date(startISO).getTime();

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home === "BYE" || away === "BYE") continue;
      const dayNumber = r + 1;
      fixtures.push({
        id: `md-${dayNumber}-${home}-${away}`,
        dayNumber,
        competitionId: "ligue1",
        homeClubId: home,
        awayClubId: away,
        date: new Date(startDate + dayNumber * DAY_MS).toISOString(),
        played: false,
      });
    }
    // rotation fixe le premier élément
    rotation = [rotation[0], rotation.pop() as string, ...rotation.slice(1)];
  }

  // Retour : on inverser domicile/extérieur et renumérote
  const back: MatchDay[] = fixtures.map((f, idx) => ({
    ...f,
    id: `md-${rounds + idx + 1}-ret`,
    dayNumber: fixtures.length ? Math.ceil((idx + 1) / half) + rounds : rounds + 1,
    homeClubId: f.awayClubId,
    awayClubId: f.homeClubId,
    date: new Date(startDate + (rounds + Math.floor(idx / half) + 1) * DAY_MS).toISOString(),
  }));

  return [...fixtures, ...back];
}

/** Crée la saison complète (championnat + coupe à intégrer plus tard). */
export function createSeason(clubs: Club[], seasonYear: number, userClub: Club): SeasonState {
  const startISO = new Date(Date.UTC(seasonYear - 1, 7, 15)).toISOString(); // mi-août
  const fixtures = generateRoundRobin(clubs, startISO).map((f) => ({
    ...f,
    competitionId: (userClub.division === "Ligue 2" ? "ligue2" : "ligue1") as CompetitionId,
  }));

  return {
    seasonYear,
    currentDay: 1,
    competitionIds: getCompetitionsForDivision(userClub.division),
    fixtures,
    isOver: false,
  };
}

/** Applique le résultat d'une journée jouée et avance la saison. */
export function advanceSeason(
  season: SeasonState,
  results: { dayId: string; homeScore: number; awayScore: number }[],
): SeasonState {
  const byId = new Map(results.map((r) => [r.dayId, r]));
  const fixtures = season.fixtures.map((f) => {
    const r = byId.get(f.id);
    if (!r) return f;
    return { ...f, played: true, homeScore: r.homeScore, awayScore: r.awayScore };
  });

  const maxDay = Math.max(...fixtures.map((f) => f.dayNumber), 0);
  const nextDay = Math.min(season.currentDay + 1, maxDay + 1);

  return {
    ...season,
    fixtures,
    currentDay: nextDay,
    isOver: fixtures.every((f) => f.played),
  };
}

/** Prochaine journée impliquant le club utilisateur. */
export function nextUserFixture(season: SeasonState, userClubId: string): MatchDay | undefined {
  return season.fixtures.find((f) => !f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId));
}

/** Calcule un classement à partir des matchs joués. */
export function computeStandings(season: SeasonState, clubs: Club[]): LeagueStandingRow[] {
  const table = new Map<string, LeagueStandingRow>();
  for (const c of clubs) {
    table.set(c.id, {
      clubId: c.id, position: 0, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0, form: [],
    });
  }

  for (const f of season.fixtures) {
    if (!f.played || f.homeScore === undefined || f.awayScore === undefined) continue;
    const h = table.get(f.homeClubId);
    const a = table.get(f.awayClubId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.goalsFor += f.homeScore; h.goalsAgainst += f.awayScore;
    a.goalsFor += f.awayScore; a.goalsAgainst += f.homeScore;
    if (f.homeScore > f.awayScore) {
      h.won++; h.points += 3; h.form.push("W"); a.lost++; a.form.push("L");
    } else if (f.homeScore < f.awayScore) {
      a.won++; a.points += 3; a.form.push("W"); h.lost++; h.form.push("L");
    } else {
      h.drawn++; a.drawn++; h.points++; a.points++; h.form.push("D"); a.form.push("D");
    }
  }

  const rows = [...table.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor,
  );
  rows.forEach((r, i) => {
    r.position = i + 1;
    r.form = r.form.slice(-5);
  });
  return rows;
}
