/**
 * FC CAREER 27 — Récompenses du monde CP (tous les joueurs, pas seulement le vôtre).
 *
 * Calendrier des cérémonies (semaines de l'année sportive) :
 * - Joueur du mois de chaque ligue : fin de chaque mois de compétition.
 * - Fin des championnats (semaine 47, dernière journée) : meilleur buteur, meilleur passeur,
 *   joueur de la saison et équipe type de chaque ligue, Soulier d'Or.
 * - Ballon d'Or CP, Trophée Yachine, Trophée Kopa (fin octobre, semaine 17) :
 *   saison précédente, classement des 30 nommés.
 * - Golden Boy (mi-décembre, semaine 24) : meilleur joueur de 20 ans ou moins.
 */

import type { WorldPlayer } from "../data/worldPlayers";
import type { WorldLiveState, WorldPlayerSeasonStats } from "./worldState";

export type AwardId =
  | "ballon_dor" | "yachine" | "kopa" | "golden_boy" | "golden_shoe"
  | "league_top_scorer" | "league_top_assist" | "league_pots" | "tots" | "potm" | "league_title";

export interface RankEntry { playerId: string; clubId: string; points: number }

export interface WorldAward {
  id: AwardId;
  /** Saison récompensée */
  season: number;
  /** Saison et semaine de la cérémonie */
  atSeason: number;
  atWeek: number;
  label: string;
  playerId?: string;
  clubId?: string;
  leagueId?: string;
  value?: number;
  ranking?: RankEntry[];
  /** Entraîneur du club au moment du titre */
  coachId?: string;
}

export const AWARD_LABEL: Record<AwardId, string> = {
  ballon_dor: "Ballon d'Or CP", yachine: "Trophée Yachine", kopa: "Trophée Kopa", golden_boy: "Golden Boy",
  golden_shoe: "Soulier d'Or", league_top_scorer: "Meilleur buteur", league_top_assist: "Meilleur passeur",
  league_pots: "Joueur de la saison", tots: "Équipe type de la saison", potm: "Joueur du mois", league_title: "Champion",
};

export const firstCoach = (w: WorldLiveState, clubId: string) =>
  w.coaches.find(c => c.clubId === clubId && c.teamLevel === "first_team" && c.status === "active")?.id;

export const BALLON_DOR_WEEK = 17;
export const GOLDEN_BOY_WEEK = 24;
export const SEASON_AWARDS_WEEK = 47;
/** Fin de chaque mois de compétition (août → mai). */
export const POTM_WEEKS = [9, 14, 18, 22, 27, 31, 35, 40, 44, 47];
const MONTH_OF_WEEK: Record<number, string> = { 9: "août", 14: "septembre", 18: "octobre", 22: "novembre", 27: "décembre", 31: "janvier", 35: "février", 40: "mars", 44: "avril", 47: "mai" };

const MAX_AWARDS = 600;

interface Line { p: WorldPlayer; st: WorldPlayerSeasonStats | null; leagueId: string; tier: number; pos: number; n: number; cup: number; titles: number }

/** Lignes de saison (stats agrégées par joueur et par ligue principale). */
function seasonLines(w: WorldLiveState, season: number): Line[] {
  const byPlayer = new Map<string, WorldPlayerSeasonStats>();
  const leagueIds = new Set(w.leagues.map(l => l.id));
  const cupContrib = new Map<string, number>();
  for (const st of w.playerStats) {
    if (st.season !== season) continue;
    if (!leagueIds.has(st.leagueId)) { cupContrib.set(st.playerId, (cupContrib.get(st.playerId) ?? 0) + st.goals * 1.1 + st.assists * 0.85); continue; }
    const cur = byPlayer.get(st.playerId);
    if (!cur) byPlayer.set(st.playerId, { ...st });
    else byPlayer.set(st.playerId, {
      ...cur, goals: cur.goals + st.goals, assists: cur.assists + st.assists,
      appearances: cur.appearances + st.appearances,
      avgRating: (cur.avgRating * cur.appearances + st.avgRating * st.appearances) / Math.max(1, cur.appearances + st.appearances),
      leagueId: st.appearances > cur.appearances ? st.leagueId : cur.leagueId, clubId: st.appearances > cur.appearances ? st.clubId : cur.clubId,
    });
  }
  const leagueTier = new Map(w.leagues.map(l => [l.id, l.tier as number]));
  const rankIn = (leagueId: string, clubId: string) => {
    const rows = w.standings[leagueId] ?? [];
    const sorted = [...rows].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    const i = sorted.findIndex(r => r.clubId === clubId);
    return { pos: i < 0 ? rows.length : i + 1, n: rows.length || 20 };
  };
  // Titres de la saison (coupes d'Europe, coupe nationale, tournoi des sélections)
  const TITLE_BONUS: Record<string, number> = { ucl: 10, uel: 5, euro: 8, wc: 10 };
  const titleBy = new Map<string, number>();
  for (const t of w.trophies ?? []) {
    if (t.season !== season) continue;
    titleBy.set(t.winner, (titleBy.get(t.winner) ?? 0) + (TITLE_BONUS[t.compId] ?? 3));
  }
  const out: Line[] = [];
  for (const p of w.players) {
    if (p.clubId === "retired" || p.clubId === "free") continue;
    const st = byPlayer.get(p.id) ?? null;
    const leagueId = st?.leagueId ?? p.leagueId;
    const { pos, n } = rankIn(leagueId, st?.clubId ?? p.clubId);
    out.push({ p, st, leagueId, tier: leagueTier.get(leagueId) ?? 2, pos, n, cup: cupContrib.get(p.id) ?? 0, titles: (titleBy.get(p.clubId) ?? 0) + (titleBy.get(p.nationality) ?? 0) });
  }
  return out;
}

/** Score d'une saison : niveau, buts, passes, note, réussite du club, division. */
function score(l: Line, matchdays: number): number {
  const st = l.st;
  const apps = st?.appearances ?? 0;
  const presence = matchdays ? Math.min(1, apps / (matchdays * 0.6)) : 0;
  const attack = ["ST", "LW", "RW", "AM"].includes(l.p.position);
  const goalsW = attack ? 1.1 : 1.6;
  const contrib = (st?.goals ?? 0) * goalsW + (st?.assists ?? 0) * 0.85;
  const rating = ((st?.avgRating ?? 6.5) - 6.5) * 12;
  const team = l.pos === 1 ? 9 : l.pos <= 4 ? 5 : l.pos <= l.n / 2 ? 2 : 0;
  const division = l.tier === 1 ? 0 : -18;
  return Math.round((l.p.overall * 1.25 + contrib + l.cup * 0.8 + l.titles + rating + team + division) * (0.35 + 0.65 * presence) * 10) / 10;
}

const leagueMatchdays = (w: WorldLiveState, leagueId: string) => w.schedules[leagueId]?.totalMatchdays ?? 38;

function push(w: WorldLiveState, a: WorldAward[]): WorldLiveState {
  // Titres de champion : palmarès permanent des clubs (les récompenses sont bornées)
  const titles = a.filter(x => x.id === "league_title" && x.clubId && x.leagueId).map(x => ({ leagueId: x.leagueId!, season: x.season, clubId: x.clubId!, coachId: x.coachId }));
  return { ...w, awards: [...(w.awards ?? []), ...a].slice(-MAX_AWARDS), leagueTitles: titles.length ? [...(w.leagueTitles ?? []), ...titles] : w.leagueTitles };
}
const nameOf = (p: WorldPlayer) => (p.firstName ? `${p.firstName} ${p.lastName}` : p.lastName);
const clubName = (w: WorldLiveState, id: string) => w.clubs.find(c => c.id === id)?.name ?? id;

/** Cérémonies de la semaine qui vient d'être jouée. Monde CP uniquement. */
export function runAwards(w0: WorldLiveState, week: number): { world: WorldLiveState; news: string[] } {
  if (w0.dataset !== "cp") return { world: w0, news: [] };
  let w = w0;
  const news: string[] = [];
  const season = w.season;
  const at = { atSeason: season, atWeek: week };

  // ── Joueur du mois ──
  if (POTM_WEEKS.includes(week)) {
    const snap = w.awardSnap ?? {};
    const nextSnap: Record<string, number> = {};
    const out: WorldAward[] = [];
    for (const st of w.playerStats) if (st.season === season) nextSnap[st.playerId] = (nextSnap[st.playerId] ?? 0) + st.goals + st.assists * 0.7;
    for (const league of w.leagues) {
      const cands = w.players.filter(p => p.leagueId === league.id && p.clubId !== "retired");
      let best: WorldPlayer | null = null, bestV = -1;
      for (const p of cands) {
        const v = (nextSnap[p.id] ?? 0) - (snap[p.id] ?? 0);
        const val = v * 10 + p.overall / 10;
        if (v > 0 && val > bestV) { best = p; bestV = val; }
      }
      if (best) out.push({ id: "potm", season, ...at, leagueId: league.id, playerId: best.id, clubId: best.clubId, label: `Joueur du mois (${MONTH_OF_WEEK[week]}) · ${league.name}` });
    }
    w = { ...push(w, out), awardSnap: nextSnap };
  }

  // ── Fin des championnats ──
  if (week === SEASON_AWARDS_WEEK) {
    const lines = seasonLines(w, season);
    const out: WorldAward[] = [];
    for (const league of w.leagues) {
      const md = leagueMatchdays(w, league.id);
      const L = lines.filter(l => l.leagueId === league.id && l.st);
      if (!L.length) continue;
      const scorer = [...L].sort((a, b) => b.st!.goals - a.st!.goals || b.p.overall - a.p.overall)[0];
      const passer = [...L].sort((a, b) => b.st!.assists - a.st!.assists || b.p.overall - a.p.overall)[0];
      const pots = [...L].sort((a, b) => score(b, md) - score(a, md))[0];
      out.push({ id: "league_top_scorer", season, ...at, leagueId: league.id, playerId: scorer.p.id, clubId: scorer.p.clubId, value: scorer.st!.goals, label: `Meilleur buteur de ${league.name} (${scorer.st!.goals} buts)` });
      out.push({ id: "league_top_assist", season, ...at, leagueId: league.id, playerId: passer.p.id, clubId: passer.p.clubId, value: passer.st!.assists, label: `Meilleur passeur de ${league.name} (${passer.st!.assists} passes)` });
      out.push({ id: "league_pots", season, ...at, leagueId: league.id, playerId: pots.p.id, clubId: pots.p.clubId, label: `Joueur de la saison de ${league.name}` });
      // Équipe type : 4-3-3
      // Chaque poste a des remplaçants si aucun joueur du poste n'a joué (ex. pas d'ailier gauche titulaire)
      const taken = new Set<string>();
      const pick = (positions: string[][], k: number) => {
        const got: typeof L = [];
        for (const group of positions) {
          if (got.length >= k) break;
          const c = L.filter(l => group.includes(l.p.position) && !taken.has(l.p.id)).sort((a, b) => score(b, md) - score(a, md)).slice(0, k - got.length);
          for (const l of c) { taken.add(l.p.id); got.push(l); }
        }
        return got;
      };
      const xi = [
        ...pick([["GK"]], 1), ...pick([["CB"], ["DM"]], 2), ...pick([["LB"], ["CB", "RB"]], 1), ...pick([["RB"], ["CB", "LB"]], 1),
        ...pick([["DM", "CM", "AM"]], 3), ...pick([["LW"], ["AM", "RW"], ["ST"]], 1), ...pick([["RW"], ["AM", "LW"], ["ST"]], 1), ...pick([["ST"], ["LW", "RW", "AM"]], 1),
      ];
      for (const l of xi) { out.push({ id: "tots", season, ...at, leagueId: league.id, playerId: l.p.id, clubId: l.p.clubId, label: `Équipe type de la saison · ${league.name}` }); }
      const champion = [...(w.standings[league.id] ?? [])].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))[0];
      if (champion) out.push({ id: "league_title", season, ...at, leagueId: league.id, clubId: champion.clubId, coachId: firstCoach(w, champion.clubId), label: `${clubName(w, champion.clubId)} champion de ${league.name}` });
      if (league.tier === 1) news.push(`${nameOf(scorer.p)} termine meilleur buteur de ${league.name} avec ${scorer.st!.goals} buts.`);
    }
    // Soulier d'Or : buts × 2 en première division, × 1,5 en deuxième
    const shoe = [...lines].filter(l => l.st).sort((a, b) => b.st!.goals * (b.tier === 1 ? 2 : 1.5) - a.st!.goals * (a.tier === 1 ? 2 : 1.5))[0];
    if (shoe) {
      const pts = shoe.st!.goals * (shoe.tier === 1 ? 2 : 1.5);
      out.push({ id: "golden_shoe", season, ...at, playerId: shoe.p.id, clubId: shoe.p.clubId, value: pts, label: `Soulier d'Or (${shoe.st!.goals} buts, ${pts} points)` });
      news.push(`Soulier d'Or : ${nameOf(shoe.p)} (${shoe.st!.goals} buts).`);
    }
    w = push(w, out);
  }

  // ── Ballon d'Or CP, Yachine, Kopa : saison précédente ──
  if (week === BALLON_DOR_WEEK && season > 1) {
    const prev = season - 1;
    const lines = seasonLines(w, prev).filter(l => l.st && l.st.appearances >= 10);
    if (lines.length) {
      const md = (l: Line) => leagueMatchdays(w, l.leagueId);
      const ranked = [...lines].sort((a, b) => score(b, md(b)) - score(a, md(a)));
      const top30 = ranked.slice(0, 30).map(l => ({ playerId: l.p.id, clubId: l.p.clubId, points: Math.round(score(l, md(l)) * 10) }));
      const winner = ranked[0];
      const gk = [...lines].filter(l => l.p.position === "GK").sort((a, b) => (b.p.overall * 2 + (b.pos === 1 ? 6 : 0) - b.tier * 10) - (a.p.overall * 2 + (a.pos === 1 ? 6 : 0) - a.tier * 10))[0];
      const young = ranked.filter(l => l.p.age <= 21)[0];
      const out: WorldAward[] = [{ id: "ballon_dor", season: prev, ...at, playerId: winner.p.id, clubId: winner.p.clubId, ranking: top30, label: `Ballon d'Or CP ${prev}` }];
      if (gk) out.push({ id: "yachine", season: prev, ...at, playerId: gk.p.id, clubId: gk.p.clubId, label: `Trophée Yachine ${prev} (meilleur gardien)` });
      if (young) out.push({ id: "kopa", season: prev, ...at, playerId: young.p.id, clubId: young.p.clubId, label: `Trophée Kopa ${prev} (meilleur jeune)` });
      w = push(w, out);
      news.push(`Ballon d'Or CP : ${nameOf(winner.p)} (${clubName(w, winner.p.clubId)}).`);
    }
  }

  // ── Golden Boy : 20 ans ou moins, saison en cours et précédente ──
  if (week === GOLDEN_BOY_WEEK) {
    const cur = seasonLines(w, season);
    const prev = new Map(seasonLines(w, season - 1).map(l => [l.p.id, l]));
    const cands = cur.filter(l => l.p.age <= 20 && ((l.st?.appearances ?? 0) + (prev.get(l.p.id)?.st?.appearances ?? 0)) >= 8);
    const val = (l: Line) => score(l, 17) + (prev.get(l.p.id) ? score(prev.get(l.p.id)!, leagueMatchdays(w, l.leagueId)) * 0.5 : 0) + (l.p.potential - l.p.overall) * 0.3;
    const ranked = [...cands].sort((a, b) => val(b) - val(a));
    if (ranked.length) {
      const winner = ranked[0];
      w = push(w, [{
        id: "golden_boy", season, ...at, playerId: winner.p.id, clubId: winner.p.clubId, label: `Golden Boy ${season}`,
        ranking: ranked.slice(0, 20).map(l => ({ playerId: l.p.id, clubId: l.p.clubId, points: Math.round(val(l) * 10) })),
      }]);
      news.push(`Golden Boy : ${nameOf(winner.p)} (${winner.p.age} ans, ${clubName(w, winner.p.clubId)}).`);
    }
  }
  return { world: w, news };
}
